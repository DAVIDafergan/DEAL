export function getGreeting(name) {
  const h = new Date().getHours();
  let prefix;
  if (h >= 6 && h < 12)  prefix = 'בוקר טוב';
  else if (h >= 12 && h < 17) prefix = 'צהריים טובים';
  else if (h >= 17 && h < 21) prefix = 'ערב טוב';
  else                          prefix = 'לילה טוב';
  return name ? `${prefix}, ${name}` : prefix;
}
