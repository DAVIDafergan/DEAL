import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import worldTopology from 'world-atlas/countries-110m.json';
import { getAirportCoordinates } from '../../data/airportCoordinates.js';
import { DealMarker } from './DealMarker.jsx';
import { DealTooltip } from './DealTooltip.jsx';
import { RadarSweepOverlay } from './RadarSweepOverlay.jsx';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 440;

const geographyStyle = {
  default: {
    fill: '#141a2b',
    stroke: '#232c45',
    strokeWidth: 0.6,
    outline: 'none',
  },
  hover: {
    fill: '#1b2238',
    stroke: '#2c3656',
    strokeWidth: 0.6,
    outline: 'none',
  },
  pressed: {
    fill: '#1b2238',
    stroke: '#2c3656',
    strokeWidth: 0.6,
    outline: 'none',
  },
};

/**
 * WorldHeatmap — מפת עולם אינטראקטיבית עם נקודות זוהרות לכל דיל פעיל.
 * כשאין עדיין דילים (המערכת צוברת היסטוריה), מוצגת אנימציית סריקת רדאר במקום מסך ריק.
 */
export function WorldHeatmap({ deals = [], isLoading = false }) {
  const [hovered, setHovered] = useState(null); // { deal, x, y }
  const warnedCodesRef = useRef(new Set());

  // ממפה כל דיל לקואורדינטות שדה התעופה היעד; דילים בקוד IATA לא מוכר פשוט לא מצויירים
  const markers = useMemo(() => {
    return deals
      .map((deal) => {
        const coords = getAirportCoordinates(deal.destination);
        if (!coords) {
          if (!warnedCodesRef.current.has(deal.destination)) {
            warnedCodesRef.current.add(deal.destination);
            console.warn(`[WorldHeatmap] No coordinates for airport "${deal.destination}" — marker skipped.`);
          }
          return null;
        }
        return { deal, coordinates: [coords.lon, coords.lat] };
      })
      .filter(Boolean);
  }, [deals]);

  const handleHover = useCallback((deal, event) => {
    setHovered({ deal, x: event.clientX, y: event.clientY });
  }, []);

  const handleLeave = useCallback(() => setHovered(null), []);

  return (
    <div className="world-heatmap">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 160 }}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="world-heatmap__svg"
      >
        <Geographies geography={worldTopology}>
          {({ geographies }) =>
            geographies.map((geo) => <Geography key={geo.rsmKey} geography={geo} style={geographyStyle} />)
          }
        </Geographies>

        {markers.map(({ deal, coordinates }) => (
          <DealMarker
            key={deal.id}
            deal={deal}
            coordinates={coordinates}
            onHover={handleHover}
            onLeave={handleLeave}
            onSelect={handleHover}
          />
        ))}
      </ComposableMap>

      {!isLoading && deals.length === 0 && <RadarSweepOverlay />}

      <AnimatePresence>
        {hovered && <DealTooltip deal={hovered.deal} x={hovered.x} y={hovered.y} onClose={handleLeave} />}
      </AnimatePresence>
    </div>
  );
}
