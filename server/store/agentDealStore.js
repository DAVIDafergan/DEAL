import { getPool } from '../../core/db/index.js';

export async function createAgentDeal(agentId, fields) {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [result] = await pool.query(
    `INSERT INTO agent_deals
      (agent_id,destination,destination_name,country,video_url,photo_url,departure_date,return_date,
       price,currency,purchase_link,whatsapp_override,is_exclusive,expires_at,description,
       status,click_count,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',0,?,?)`,
    [
      agentId,
      fields.destination,
      fields.destination_name || null,
      fields.country || null,
      fields.video_url || null,
      fields.photo_url || null,
      fields.departure_date,
      fields.return_date || null,
      fields.price,
      fields.currency || 'USD',
      fields.purchase_link || null,
      fields.whatsapp_override || null,
      fields.is_exclusive ? 1 : 0,
      fields.expires_at || null,
      fields.description || null,
      now, now,
    ]
  );
  return result.insertId;
}

export async function getAgentDeal(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM agent_deals WHERE id=?', [id]);
  return rows[0] || null;
}

export async function listAgentDeals(agentId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM agent_deals WHERE agent_id=? ORDER BY created_at DESC',
    [agentId]
  );
  return rows;
}

export async function listPendingDeals() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ad.*, a.business_name, a.slug AS agent_slug
     FROM agent_deals ad JOIN agents a ON a.id=ad.agent_id
     WHERE ad.status='pending' ORDER BY ad.created_at ASC`
  );
  return rows;
}

export async function listApprovedDeals({ limit = 100 } = {}) {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT ad.*, a.business_name, a.slug AS agent_slug, a.whatsapp_number AS agent_whatsapp,
            a.whatsapp_template AS agent_whatsapp_template,
            a.subscription_status, a.subscription_expires_at
     FROM agent_deals ad JOIN agents a ON a.id=ad.agent_id
     WHERE ad.status='approved'
       AND a.status='approved'
       AND (a.subscription_status='active' OR a.subscription_status='trial')
       AND (a.subscription_expires_at IS NULL OR a.subscription_expires_at >= ?)
       AND (ad.expires_at IS NULL OR ad.expires_at >= ?)
     ORDER BY ad.click_count DESC, ad.approved_at DESC
     LIMIT ?`,
    [now, now, limit]
  );
  return rows;
}

export async function listApprovedDealsByAgent(agentId) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM agent_deals WHERE agent_id=? AND status='approved' ORDER BY approved_at DESC",
    [agentId]
  );
  return rows;
}

export async function updateAgentDealStatus(id, status, rejection_reason = null) {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const approved_at = status === 'approved' ? now : null;
  await pool.query(
    'UPDATE agent_deals SET status=?, rejection_reason=?, approved_at=?, updated_at=? WHERE id=?',
    [status, rejection_reason, approved_at, now, id]
  );
}

export async function updateAgentDeal(id, agentId, fields) {
  const pool = getPool();
  const allowed = ['destination','destination_name','country','video_url','photo_url',
    'departure_date','return_date','price','currency','purchase_link','whatsapp_override',
    'is_exclusive','expires_at','description'];
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
  sets.push("status='pending'", 'updated_at=?');
  vals.push(now, id, agentId);
  await pool.query(`UPDATE agent_deals SET ${sets.join(',')} WHERE id=? AND agent_id=?`, vals);
}

export async function deleteAgentDeal(id, agentId) {
  const pool = getPool();
  await pool.query('DELETE FROM agent_deals WHERE id=? AND agent_id=?', [id, agentId]);
}

export async function incrementDealClickCount(id) {
  const pool = getPool();
  await pool.query('UPDATE agent_deals SET click_count=click_count+1 WHERE id=?', [id]);
}

export async function computeValueScore(deal) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT AVG(price) AS avg_price FROM deals
     WHERE destination=? AND type='live_price'
     AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [deal.destination]
  );
  const avg = rows[0]?.avg_price;
  if (!avg || avg <= 0) return null;
  return ((avg - deal.price) / avg) * 100;
}

export async function listTopValueDeals(limit = 5) {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 10);
  // Live engine deals with value_score derived from moving_average
  const [live] = await pool.query(
    `SELECT id, 'live' AS deal_source, origin, destination, NULL AS destination_name,
            departure_date, price, currency,
            booking_url AS purchase_link, NULL AS agent_id, NULL AS business_name, NULL AS agent_slug,
            ((moving_average - price) / moving_average * 100) AS value_score
     FROM deals
     WHERE moving_average IS NOT NULL AND moving_average > price
       AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
     ORDER BY value_score DESC
     LIMIT ?`,
    [limit * 2]
  );
  // Approved agent deals — prefer those with value_score, fallback to all approved
  const [agentDeals] = await pool.query(
    `SELECT ad.id, 'agent' AS deal_source, NULL AS origin, ad.destination, ad.destination_name,
            ad.departure_date, ad.price, ad.currency, ad.purchase_link,
            ad.agent_id, a.business_name, a.slug AS agent_slug,
            ad.value_score
     FROM agent_deals ad JOIN agents a ON a.id=ad.agent_id
     WHERE ad.status='approved' AND a.status='approved'
       AND (a.subscription_status='active' OR a.subscription_status='trial')
       AND (a.subscription_expires_at IS NULL OR a.subscription_expires_at >= ?)
       AND (ad.expires_at IS NULL OR ad.expires_at >= ?)
     ORDER BY ad.value_score DESC, ad.click_count DESC, ad.approved_at DESC
     LIMIT ?`,
    [now, now, limit * 2]
  );
  // Prefer scored deals; fill remaining slots with unscored agent deals
  const scored = [...live, ...agentDeals].filter(d => d.value_score !== null && d.value_score > 0);
  scored.sort((a, b) => b.value_score - a.value_score);
  if (scored.length >= limit) return scored.slice(0, limit);

  const unscored = agentDeals.filter(d => !d.value_score || d.value_score <= 0);
  return [...scored, ...unscored].slice(0, limit);
}
