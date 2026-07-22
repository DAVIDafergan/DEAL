const BOT_PATTERN = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|semrush|ahrefs|mj12bot|dotbot|petalbot|yandex|baiduspider|lighthouse|headlesschrome|pingdom|uptimerobot/i;

/** 10.5: skip logging analytics events from crawlers/monitoring bots — otherwise Googlebot
 * indexing every property page would inflate "views" with traffic that never saw the page. */
export function isBotUserAgent(userAgent) {
  return BOT_PATTERN.test(userAgent || '');
}
