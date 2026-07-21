import { getPool } from '../../core/db/index.js';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

async function uniqueSlug(connection, base) {
  let slug = base;
  let i = 0;
  while (true) {
    const [rows] = await connection.query('SELECT id FROM agents WHERE slug = ?', [slug]);
    if (rows.length === 0) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

export async function createAgent({ business_name, contact_name, email, password_hash, phone, whatsapp_number, account_type }) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const base = slugify(business_name) || slugify(email.split('@')[0]);
    const slug = await uniqueSlug(conn, base || 'agent');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // account_type defaults to 'flight_agent' (existing registration flow, untouched) — zimmer-world
    // signups pass account_type: 'property_owner' explicitly. See core/db/index.js MIGRATIONS comment.
    const resolvedAccountType = account_type === 'property_owner' ? 'property_owner' : 'flight_agent';
    const [result] = await conn.query(
      `INSERT INTO agents (slug,business_name,contact_name,email,password_hash,phone,whatsapp_number,account_type,status,subscription_tier,subscription_status,lead_count,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,'approved','basic','trial',0,?,?)`,
      [slug, business_name, contact_name, email, password_hash, phone || null, whatsapp_number || null, resolvedAccountType, now, now]
    );
    return { id: result.insertId, slug };
  } finally {
    conn.release();
  }
}

export async function findAgentByEmail(email) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM agents WHERE email = ?', [email]);
  return rows[0] || null;
}

export async function findAgentById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM agents WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function findAgentBySlug(slug) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM agents WHERE slug = ?', [slug]);
  return rows[0] || null;
}

export async function listAgentsPending() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id,slug,business_name,contact_name,email,phone,license_number,status,created_at FROM agents WHERE status='pending' ORDER BY created_at ASC"
  );
  return rows;
}

export async function listAgentsAll() {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id,slug,business_name,contact_name,email,phone,status,subscription_tier,subscription_status,lead_count,created_at FROM agents ORDER BY created_at DESC'
  );
  return rows;
}

export async function updateAgentStatus(id, status, rejection_reason = null) {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await pool.query(
    'UPDATE agents SET status=?, rejection_reason=?, updated_at=? WHERE id=?',
    [status, rejection_reason, now, id]
  );
}

export async function updateAgentProfile(id, fields) {
  const pool = getPool();
  const allowed = [
    'business_name','contact_name','email','phone','whatsapp_number','whatsapp_template','license_number',
    'logo_url','description','about','cover_url','response_hours','preferred_currency','has_seen_onboarding',
    'website','facebook_url','instagram_url','tiktok_url','youtube_url',
  ];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (Object.hasOwn(fields, k)) {
      sets.push(`${k}=?`);
      vals.push(fields[k]);
    }
  }
  if (sets.length === 0) return;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  sets.push('updated_at=?');
  vals.push(now, id);
  await pool.query(`UPDATE agents SET ${sets.join(',')} WHERE id=?`, vals);
}

/** Separate from updateAgentProfile — a password change is a sensitive action with its own
 * verify-current-password flow (see PATCH /api/agents/me/password), not something that should
 * ride along with the autosaved profile form. */
export async function updateAgentPassword(id, password_hash) {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await pool.query('UPDATE agents SET password_hash=?, updated_at=? WHERE id=?', [password_hash, now, id]);
}

export async function updateAgentSubscription(id, { subscription_tier, subscription_status, subscription_expires_at, stripe_customer_id, stripe_subscription_id }) {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await pool.query(
    'UPDATE agents SET subscription_tier=?,subscription_status=?,subscription_expires_at=?,stripe_customer_id=?,stripe_subscription_id=?,updated_at=? WHERE id=?',
    [subscription_tier, subscription_status, subscription_expires_at || null, stripe_customer_id || null, stripe_subscription_id || null, now, id]
  );
}

export async function incrementAgentLeadCount(agentId) {
  const pool = getPool();
  await pool.query('UPDATE agents SET lead_count = lead_count + 1 WHERE id=?', [agentId]);
}

export async function deleteAgentById(id) {
  // agent_deals and agent_ratings cascade automatically via FK ON DELETE CASCADE
  await getPool().query('DELETE FROM agents WHERE id = ?', [id]);
}
