const CURRENCY_SYMBOLS = {
  USD: '$',
  ILS: '₪',
  EUR: '€',
  GBP: '£',
};

/** מחזיר סימן מטבע קצר (₪/$/€) במקום טקסט מלא ("USD") — קריא יותר במספרים גדולים */
export function getCurrencySymbol(currencyCode) {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode || '';
}
