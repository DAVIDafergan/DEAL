import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import worldTopology from 'world-atlas/countries-110m.json';
import { REGIONS, REGION_COORDINATES } from '../../data/propertyOptions.js';
import { RegionMarker } from './RegionMarker.jsx';
import { RegionTooltip } from './RegionTooltip.jsx';

// Same react-simple-maps + world-atlas topology as WorldHeatmap.jsx — just centered/zoomed on
// Israel instead of the whole world, with region pins instead of per-deal airport pins.
const MAP_WIDTH = 800;
const MAP_HEIGHT = 440;
const ISRAEL_CENTER = [35.0, 31.5];
const DEFAULT_ZOOM = 5.5;
const MIN_ZOOM = 3;
const MAX_ZOOM = 12;

const geographyStyle = {
  default: { fill: '#141a2b', stroke: '#232c45', strokeWidth: 0.6, outline: 'none' },
  hover: { fill: '#1b2238', stroke: '#2c3656', strokeWidth: 0.6, outline: 'none' },
  pressed: { fill: '#1b2238', stroke: '#2c3656', strokeWidth: 0.6, outline: 'none' },
};

/**
 * IsraelMap — regional pin map for property search (replaces WorldHeatmap on the flights
 * homepage). Same component/library/topology, zoomed to Israel; pins are per-region property
 * counts instead of per-deal airport coordinates.
 */
export function IsraelMap({ propertiesByRegion = {}, onSelectRegion }) {
  const [hovered, setHovered] = useState(null); // { region, x, y }
  const [center, setCenter] = useState(ISRAEL_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const markers = useMemo(() => {
    return REGIONS.map((r) => ({
      value: r.value,
      label: r.label,
      count: propertiesByRegion[r.value] || 0,
      coordinates: REGION_COORDINATES[r.value],
    }));
  }, [propertiesByRegion]);

  const totalCount = markers.reduce((sum, m) => sum + m.count, 0);

  const handleHover = useCallback((region, event) => {
    setHovered({ region, x: event.clientX, y: event.clientY });
  }, []);
  const handleLeave = useCallback(() => setHovered(null), []);
  const handleSelect = useCallback((region, event) => handleHover(region, event), [handleHover]);
  const handleMoveEnd = useCallback(({ coordinates, zoom: nextZoom }) => {
    setCenter(coordinates);
    setZoom(nextZoom);
  }, []);
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.4)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.4)), []);

  return (
    <div className="world-heatmap">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: ISRAEL_CENTER, scale: 4800 }}
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

          {markers.map((region) => (
            <RegionMarker
              key={region.value}
              region={region}
              coordinates={region.coordinates}
              count={region.count}
              onHover={handleHover}
              onLeave={handleLeave}
              onSelect={handleSelect}
            />
          ))}
        </ZoomableGroup>
      </ComposableMap>

      <div className="world-heatmap__zoom-controls">
        <button type="button" className="world-heatmap__zoom-button" onClick={handleZoomIn} aria-label="Zoom in">+</button>
        <button type="button" className="world-heatmap__zoom-button" onClick={handleZoomOut} aria-label="Zoom out">−</button>
      </div>

      {totalCount === 0 && (
        <div className="radar-overlay">
          <div className="radar-overlay__rings" aria-hidden="true">
            <span className="radar-overlay__ring" />
            <span className="radar-overlay__ring" />
            <span className="radar-overlay__ring" />
            <span className="radar-overlay__sweep" />
          </div>
          <div className="radar-overlay__caption glass-panel">
            <h2>עדיין אין נכסים באתר</h2>
            <p>בעלי צימרים מתחילים להצטרף — הנכסים הראשונים יופיעו כאן בקרוב.</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {hovered && (
          <RegionTooltip region={hovered.region} x={hovered.x} y={hovered.y} onClose={handleLeave} onView={onSelectRegion} />
        )}
      </AnimatePresence>
    </div>
  );
}
