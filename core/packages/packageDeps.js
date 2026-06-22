/** בונה את אובייקט התלויות שמנוע החבילות צריך — adapter ספציפי ל-Travelpayouts ומפתחות/תבניות */
export function buildPackageDeps(sourceRegistry, env = process.env) {
  return {
    travelpayoutsAdapter: sourceRegistry.getSource('travelpayouts'),
    apiToken: env.TRAVELPAYOUTS_API_TOKEN,
    marker: env.TRAVELPAYOUTS_MARKER,
    carRentalUrlTemplate: env.TRAVELPAYOUTS_CAR_RENTAL_URL_TEMPLATE,
    esimUrlTemplate: env.TRAVELPAYOUTS_ESIM_URL_TEMPLATE,
  };
}
