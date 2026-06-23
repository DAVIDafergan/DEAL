import { getDestinationImage } from '../../images/destinationImageService.js';

const CITY_NAMES = {
  BCN: 'Barcelona', LCA: 'Larnaca', ATH: 'Athens', CDG: 'Paris', FCO: 'Rome',
  AMS: 'Amsterdam', IST: 'Istanbul', DXB: 'Dubai', BKK: 'Bangkok', JFK: 'New York',
  LAX: 'Los Angeles', LHR: 'London', MXP: 'Milan', VIE: 'Vienna', BUD: 'Budapest',
  PRG: 'Prague', WAW: 'Warsaw', SVO: 'Moscow', NRT: 'Tokyo', SIN: 'Singapore',
  SYD: 'Sydney', CPH: 'Copenhagen', OSL: 'Oslo', ARN: 'Stockholm', HEL: 'Helsinki',
  LIS: 'Lisbon', MAD: 'Madrid', VLC: 'Valencia', PMI: 'Palma', RHO: 'Rhodes',
  HER: 'Heraklion', SKG: 'Thessaloniki', OTP: 'Bucharest', SOF: 'Sofia',
  DBV: 'Dubrovnik', SPU: 'Split', ZAG: 'Zagreb', TLV: 'Tel Aviv',
};

export async function fetchDestinationMediaForAgent(iataCode) {
  const code = iataCode.toUpperCase();
  const cityName = CITY_NAMES[code] || code;
  try {
    const img = await getDestinationImage(code, cityName, {
      pexelsApiKey: process.env.PEXELS_API_KEY,
      unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY,
    });
    if (!img) return { photo_url: null, video_url: null };
    return {
      photo_url: img.imageUrl || img.image_url || null,
      video_url: img.videoUrl || img.video_url || null,
      thumb_url: img.thumbUrl || img.thumb_url || null,
      attribution: img.attributionName || img.attribution_name || null,
    };
  } catch {
    return { photo_url: null, video_url: null };
  }
}
