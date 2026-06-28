import { Router } from 'express';
import Stripe from 'stripe';
import { requireAgentAuth } from '../middleware/agentAuth.js';
import { findAgentById, updateAgentSubscription } from '../store/agentStore.js';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// Plan prices (Stripe Price IDs configured in env)
const PLAN_PRICES = {
  basic:     process.env.STRIPE_PRICE_BASIC     || null,
  pro:       process.env.STRIPE_PRICE_PRO       || null,
  unlimited: process.env.STRIPE_PRICE_UNLIMITED || null,
};

const PLAN_LIMITS = { basic: 5, pro: 20, unlimited: null };

router.get('/plans', (_req, res) => {
  res.json({
    plans: [
      { id: 'basic',     label: 'Basic',     price: 199, currency: 'ILS', dealsLimit: 5,        stripeConfigured: !!PLAN_PRICES.basic },
      { id: 'pro',       label: 'Pro',       price: 399, currency: 'ILS', dealsLimit: 20,       stripeConfigured: !!PLAN_PRICES.pro },
      { id: 'unlimited', label: 'Unlimited', price: 699, currency: 'ILS', dealsLimit: null,     stripeConfigured: !!PLAN_PRICES.unlimited },
    ],
  });
});

router.post('/checkout', requireAgentAuth, async (req, res) => {
  try {
    const { tier } = req.body;
    if (!PLAN_PRICES[tier]) return res.status(400).json({ error: `Unknown tier or Stripe price not configured for tier: ${tier}` });
    const stripe = getStripe();
    const agent = await findAgentById(req.agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    let customer = agent.stripe_customer_id;
    if (!customer) {
      const cust = await stripe.customers.create({ email: agent.email, name: agent.business_name, metadata: { agentId: String(agent.id) } });
      customer = cust.id;
    }

    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3001';
    const session = await stripe.checkout.sessions.create({
      customer,
      mode: 'subscription',
      line_items: [{ price: PLAN_PRICES[tier], quantity: 1 }],
      success_url: `${origin}/agent/dashboard?subscription=success`,
      cancel_url:  `${origin}/agent/dashboard/settings?subscription=cancelled`,
      metadata: { agentId: String(agent.id), tier },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing] checkout error:', err.message);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

router.post('/portal', requireAgentAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const agent = await findAgentById(req.agentId);
    if (!agent?.stripe_customer_id) return res.status(400).json({ error: 'No Stripe customer' });
    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3001';
    const session = await stripe.billingPortal.sessions.create({
      customer: agent.stripe_customer_id,
      return_url: `${origin}/agent/dashboard/settings`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('[billing] portal error:', err.message);
    res.status(500).json({ error: 'Portal session failed' });
  }
});

// Stripe webhook — update subscription status on events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    const stripe = getStripe();
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      : req.body;
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const agentId = session.metadata?.agentId;
      const tier = session.metadata?.tier;
      if (agentId && tier) {
        const expiresAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        await updateAgentSubscription(Number(agentId), {
          subscription_tier: tier,
          subscription_status: 'active',
          subscription_expires_at: expiresAt,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        });
      }
    } else if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
      const sub = event.data.object;
      const customerId = sub.customer;
      const { getPool } = await import('../../core/db/index.js');
      const [rows] = await getPool().query('SELECT id FROM agents WHERE stripe_customer_id=?', [customerId]);
      if (rows[0]) {
        await updateAgentSubscription(rows[0].id, {
          subscription_status: 'inactive',
          subscription_expires_at: null,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
        });
      }
    } else if (event.type === 'invoice.payment_succeeded') {
      const inv = event.data.object;
      if (inv.subscription) {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(inv.subscription);
        const customerId = sub.customer;
        const expiresAt = new Date(sub.current_period_end * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const { getPool } = await import('../../core/db/index.js');
        const [rows] = await getPool().query('SELECT id FROM agents WHERE stripe_customer_id=?', [customerId]);
        if (rows[0]) {
          await updateAgentSubscription(rows[0].id, {
            subscription_status: 'active',
            subscription_expires_at: expiresAt,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
          });
        }
      }
    }
  } catch (err) {
    console.error('[billing] webhook handler error:', err.message);
  }

  res.json({ received: true });
});

export default router;
