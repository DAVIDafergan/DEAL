// Admin auth disabled temporarily — /admin is open to anyone with the URL
export function requireAdminAuth(_req, _res, next) {
  next();
}
