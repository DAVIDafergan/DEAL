import { Sparkles, Waves, Flame, Mountain, Trees, Utensils, ParkingCircle, Wind, UtensilsCrossed, Wifi, Baby, Dog, Accessibility, Check } from 'lucide-react';
import { AMENITIES, AMENITY_ICON_NAMES } from '../../data/propertyOptions.js';

const ICONS = { Sparkles, Waves, Flame, Mountain, Trees, Utensils, ParkingCircle, Wind, UtensilsCrossed, Wifi, Baby, Dog, Accessibility, Check };

export function PropertyAmenitiesBar({ property }) {
  const active = AMENITIES.filter((a) => property[a.value]);
  if (active.length === 0) return null;

  return (
    <div className="amenities-bar">
      {active.map((a) => {
        const Icon = ICONS[AMENITY_ICON_NAMES[a.value]] || Check;
        return (
          <div key={a.value} className="amenities-bar__item">
            <Icon size={18} strokeWidth={1.6} />
            <span>{a.label}</span>
          </div>
        );
      })}
    </div>
  );
}
