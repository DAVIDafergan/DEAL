import crypto from 'node:crypto';

/**
 * PersonalRadarStore — מאגר in-memory של "רדארים אישיים" שמשתמשים הגדירו.
 * In-memory store of user-defined personal deal radars.
 */
const radars = new Map();

/**
 * @param {{destination: string, budget: number, dateFrom: string, dateTo: string, contact?: string}} params
 */
export function createPersonalRadar(params) {
  const id = crypto.randomUUID();
  const radar = {
    id,
    createdAt: new Date().toISOString(),
    destination: params.destination,
    budget: params.budget,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    contact: params.contact || null,
  };
  radars.set(id, radar);
  return radar;
}

export function listPersonalRadars() {
  return Array.from(radars.values());
}

export function getPersonalRadarById(id) {
  return radars.get(id) || null;
}

/** לשימוש בטסטים בלבד */
export function _clearPersonalRadarStore() {
  radars.clear();
}
