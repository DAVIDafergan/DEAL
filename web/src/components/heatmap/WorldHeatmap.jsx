import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import worldTopology from 'world-atlas/countries-110m.json';
import { getAirportCoordinates } from '../../data/airportCoordinates.js';
import { DealMarker } from './DealMarker.jsx';
import { DealTooltip } from './DealTooltip.jsx';
import { RadarSweepOverlay } from './RadarSweepOverlay.jsx';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 440;
const DEFAULT_CENTER = [25, 25]; // נקודת איזון בין אירופה/מזרח-תיכון/אסיה, יחסית למסלולי TLV שלנו
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const MARKER_CLICK_ZOOM = 4; // רמת זום כש"ממרכזים" על דיל שנלחץ

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
 * תומכת בזום (mouse wheel + pinch על נייד, דרך ZoomableGroup/d3-zoom), כפתורי +/- מהירים,
 * ולחיצה על דיל ש"ממרכזת" את יעדו בעדשה. כשאין עדיין דילים, מוצגת אנימציית סריקת רדאר.
 */
export function WorldHeatmap({ deals = [], isLoading = false }) {
  const [hovered, setHovered] = useState(null); // { deal, x, y }
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
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

  // לחיצה על דיל: פותחת טולטיפ וגם ממרכזת+מזרימה zoom-in חלק על היעד שלו
  const handleSelect = useCallback(
    (deal, event) => {
      handleHover(deal, event);
      const coords = getAirportCoordinates(deal.destination);
      if (coords) {
        setCenter([coords.lon, coords.lat]);
        setZoom(MARKER_CLICK_ZOOM);
      }
    },
    [handleHover]
  );

  // סנכרון המצב שלנו אחרי זום/גרירה חופשיים של המשתמש (wheel/pinch/drag) — כדי שכפתורי +/-
  // ידעו מאיזו רמה להמשיך, בלי לקטוע את האינטראקציה החופשית של d3-zoom עצמה
  const handleMoveEnd = useCallback(({ coordinates, zoom: nextZoom }) => {
    setCenter(coordinates);
    setZoom(nextZoom);
  }, []);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.5)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.5)), []);

  return (
    <div className="world-heatmap">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 160 }}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="world-heatmap__svg"
      >
        <ZoomableGroup center={center} zoom={zoom} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} onMoveEnd={handleMoveEnd}>
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
              onSelect={handleSelect}
            />
          ))}
        </ZoomableGroup>
      </ComposableMap>

      <div className="world-heatmap__zoom-controls">
        <button type="button" className="world-heatmap__zoom-button" onClick={handleZoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="world-heatmap__zoom-button" onClick={handleZoomOut} aria-label="Zoom out">
          −
        </button>
      </div>

      {!isLoading && deals.length === 0 && <RadarSweepOverlay />}

      <AnimatePresence>
        {hovered && <DealTooltip deal={hovered.deal} x={hovered.x} y={hovered.y} onClose={handleLeave} />}
      </AnimatePresence>
    </div>
  );
}
