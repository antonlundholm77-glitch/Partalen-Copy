/**
 * VectorLayer - Vector layer component for displaying geometries
 *
 * Displays vector features (points, lines, polygons) on the map.
 *
 * Usage:
 * <VectorLayer source={vectorSource} style={styleFunction} />
 *
 * Or with features directly:
 * <VectorLayer features={features} />
 */

'use client';

import { useEffect, useState } from 'react';
import VectorLayerSource from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { useMap } from '../hooks/useMap';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { StyleLike } from 'ol/style/Style';
import { Style, Stroke, Fill, Circle } from 'ol/style';

export interface VectorLayerProps {
  /** Vector source containing features */
  source?: VectorSource<Feature<Geometry>>;

  /** Features to display (alternative to source) */
  features?: Feature<Geometry>[];

  /** Style function or static style */
  style?: StyleLike;

  /** Layer visibility */
  visible?: boolean;

  /** Layer z-index */
  zIndex?: number;

  /** Min resolution (zoom level) */
  minResolution?: number;

  /** Max resolution (zoom level) */
  maxResolution?: number;
}

/**
 * Default style for vector features
 */
const defaultStyle = new Style({
  fill: new Fill({
    color: 'rgba(37, 99, 235, 0.2)', // blue-600 with 20% opacity
  }),
  stroke: new Stroke({
    color: '#2563eb', // blue-600
    width: 2,
  }),
  image: new Circle({
    radius: 6,
    fill: new Fill({
      color: '#2563eb', // blue-600
    }),
    stroke: new Stroke({
      color: '#ffffff',
      width: 2,
    }),
  }),
});

export function VectorLayer({
  source,
  features,
  style = defaultStyle,
  visible = true,
  zIndex = 10,
  minResolution,
  maxResolution,
}: VectorLayerProps) {
  const map = useMap();
  const [layer, setLayer] = useState<VectorLayerSource<VectorSource<Feature<Geometry>>> | null>(
    null
  );
  const [internalSource] = useState<VectorSource<Feature<Geometry>>>(
    () => source || new VectorSource({ features: features || [] })
  );

  // Create layer
  useEffect(() => {
    if (!map) return;

    const vectorLayer = new VectorLayerSource({
      source: internalSource,
      style,
      visible,
      zIndex,
      minResolution,
      maxResolution,
    });

    map.addLayer(vectorLayer);
    setLayer(vectorLayer);

    // Cleanup
    return () => {
      map.removeLayer(vectorLayer);
    };
  }, [map, internalSource, style]);

  // Update features when features prop changes
  useEffect(() => {
    if (!features || source) return; // Only update if using features prop, not source
    internalSource.clear();
    internalSource.addFeatures(features);
  }, [features, source, internalSource]);

  // Update layer properties when they change
  useEffect(() => {
    if (!layer) return;
    layer.setVisible(visible);
  }, [layer, visible]);

  useEffect(() => {
    if (!layer) return;
    layer.setZIndex(zIndex);
  }, [layer, zIndex]);

  useEffect(() => {
    if (!layer) return;
    layer.setMinResolution(minResolution || 0);
  }, [layer, minResolution]);

  useEffect(() => {
    if (!layer) return;
    layer.setMaxResolution(maxResolution || Infinity);
  }, [layer, maxResolution]);

  return null; // This component doesn't render anything
}
