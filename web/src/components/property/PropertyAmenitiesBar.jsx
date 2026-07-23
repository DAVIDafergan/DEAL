import {
  Sparkles, Waves, Flame, Mountain, Trees, Utensils, ParkingCircle, Wind, UtensilsCrossed, Wifi,
  Baby, Dog, Accessibility, Check, Flower2, CircleDot, Gamepad2, Projector, Clapperboard, BookOpen,
  Dices, Armchair, Palmtree, Sprout, DoorOpen, Coffee, CookingPot, Refrigerator, Microwave,
  Thermometer, Tv, WashingMachine, Clock, KeyRound, MapPin, Fence, Bath,
} from 'lucide-react';
import { amenitiesByCategory, AMENITY_ICON_NAMES, amenityLabel, amenityCategoryLabel } from '../../data/propertyOptions.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

const ICONS = {
  Sparkles, Waves, Flame, Mountain, Trees, Utensils, ParkingCircle, Wind, UtensilsCrossed, Wifi,
  Baby, Dog, Accessibility, Check, Flower2, CircleDot, Gamepad2, Projector, Clapperboard, BookOpen,
  Dices, Armchair, Palmtree, Sprout, DoorOpen, Coffee, CookingPot, Refrigerator, Microwave,
  Thermometer, Tv, WashingMachine, Clock, KeyRound, MapPin, Fence, Bath,
};

/** PropertyAmenitiesBar — 11.6: with the catalog now ~65 items, a flat grid became an unreadable
 * wall of icons. Grouped by category (same categories as the wizard/filter) so guests can scan
 * "what matters to me" (pool? accessibility?) instead of reading every single facility. Categories
 * with nothing active on this property are simply skipped. */
export function PropertyAmenitiesBar({ property }) {
  const { lang } = useLanguage();
  const groups = amenitiesByCategory()
    .map((cat) => ({ ...cat, items: cat.items.filter((a) => property[a.value]) }))
    .filter((cat) => cat.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="amenities-bar-groups">
      {groups.map((cat) => (
        <div key={cat.key} className="amenities-bar-group">
          <h3 className="amenities-bar-group__title">{amenityCategoryLabel(cat.key, lang)}</h3>
          <div className="amenities-bar">
            {cat.items.map((a) => {
              const Icon = ICONS[AMENITY_ICON_NAMES[a.value]] || Check;
              return (
                <div key={a.value} className="amenities-bar__item">
                  <Icon size={18} strokeWidth={1.6} />
                  <span>{amenityLabel(a.value, lang)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
