/** פותח את כל הלינקים הזמינים של חבילה בטאבים נפרדים — כל רכיב נשאר הזמנה נפרדת אצל הספק שלו */
export function openAllPackageLinks(pkg) {
  [pkg.flightBookingUrl, pkg.hotelBookingUrl, pkg.carRentalUrl, pkg.esimUrl]
    .filter(Boolean)
    .forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'));
}
