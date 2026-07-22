// Mirrors web/src/data/propertyOptions.js REGIONS — kept in sync manually (server code can't
// import from web/src, different runtime/bundle boundary). Same list, same order.
export const REGIONS = [
  { value: 'north', label: 'הצפון' },
  { value: 'galilee', label: 'הגליל' },
  { value: 'golan', label: 'הגולן' },
  { value: 'carmel', label: 'הכרמל' },
  { value: 'center', label: 'המרכז' },
  { value: 'jerusalem', label: 'ירושלים' },
  { value: 'south', label: 'הדרום' },
  { value: 'dead_sea', label: 'ים המלח' },
  { value: 'eilat', label: 'אילת' },
];

export function findRegionBySlug(slug) {
  const decoded = decodeURIComponent(slug || '');
  return REGIONS.find((r) => r.label === decoded) || null;
}

export function regionLabel(value) {
  return REGIONS.find((r) => r.value === value)?.label || value;
}
