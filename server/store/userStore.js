import { getPool } from '../../core/db/index.js';

export async function findUserByEmail(email) {
  const [rows] = await getPool().query('SELECT * FROM users WHERE email=?', [email]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await getPool().query(
    'SELECT id, name, email, auth_provider, created_at FROM users WHERE id=?', [id]
  );
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, authProvider = 'local' }) {
  const [result] = await getPool().query(
    'INSERT INTO users (name, email, password_hash, auth_provider, created_at) VALUES (?, ?, ?, ?, NOW())',
    [name, email, passwordHash || null, authProvider]
  );
  return findUserById(result.insertId);
}

export async function getAllUsers() {
  const [rows] = await getPool().query(
    'SELECT id, name, email, auth_provider, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}
