import { useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { geoMercator } from 'd3-geo';
import worldTopology from 'world-atlas/countries-110m.json';

// Same projection params as IsraelMap.jsx (center/scale), just not zoomable/pannable — a fixed
// projection is what makes click -> lat/lng inversion below well-defined.
const WIDTH = 400;
const HEIGHT = 260;
const CENTER = [35.0, 31.5];
const SCALE = 2400;
const projection = geoMercator().center(CENTER).scale(SCALE).translate([WIDTH / 2, HEIGHT / 2]);

const geoStyle = {
  default: { fill: '#1b2238', stroke: '#2c3656', strokeWidth: 0.6, outline: 'none' },
  hover: { fill: '#1b2238', stroke: '#2c3656', strokeWidth: 0.6, outline: 'none' },
  pressed: { fill: '#1b2238', stroke: '#2c3656', strokeWidth: 0.6, outline: 'none' },
};

/** PropertyLocationMap — 7.4 location step: "נעיצה על מפה". Optional (lat/lng are nullable) —
 * a click sets the pin, the wizard already collects region/city/address as the required text
 * fallback, so a traveler-facing exact point isn't load-bearing anywhere yet. */
export function PropertyLocationMap({ latitude, longitude, onPick }) {
  const wrapRef = useRef(null);

  function handleClick(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    const [lng, lat] = projection.invert([x, y]);
    onPick(lat, lng);
  }

  return (
    <div className="wlm">
      <div ref={wrapRef} onClick={handleClick} role="button" tabIndex={0} aria-label="בחירת מיקום על המפה">
        <ComposableMap projection="geoMercator" projectionConfig={{ center: CENTER, scale: SCALE }} width={WIDTH} height={HEIGHT} className="wlm__map">
          <Geographies geography={worldTopology}>
            {({ geographies }) => geographies.map((geo) => <Geography key={geo.rsmKey} geography={geo} style={geoStyle} />)}
          </Geographies>
          {latitude != null && longitude != null && (
            <Marker coordinates={[longitude, latitude]}>
              <circle r={6} fill="#2563EB" stroke="#fff" strokeWidth={2} />
            </Marker>
          )}
        </ComposableMap>
      </div>
      <p className="wlm__hint">לחצו על המפה כדי לסמן את מיקום הנכס (אופציונלי)</p>
    </div>
  );
}
