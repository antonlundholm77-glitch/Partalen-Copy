/**
 * TileLayer - Tile layer component for raster map tiles
 *
 * Usage:
 * <TileLayer source="osm" />
 * <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
 */

'use client';

import { useEffect, useState } from 'react';
import TileLayerSource from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { useMap } from '../hooks/useMap';

export interface TileLayerProps {
  /** Predefined source (currently only 'osm') */
  source?: 'osm';
  /** Custom tile URL template */
  url?: string;
  /** Layer opacity (0-1) */
  opacity?: number;
  /** Layer visibility */
  visible?: boolean;
  /** Layer z-index */
  zIndex?: number;
}

export function TileLayer({
  source = 'osm',
  url,
  opacity = 1,
  visible = true,
  zIndex = 0,
}: TileLayerProps) {
  const map = useMap();
  const [layer, setLayer] = useState<TileLayerSource<OSM | XYZ> | null>(null);

  // Create layer
  useEffect(() => {
    if (!map) return;

    // Create source based on props
    let tileSource: OSM | XYZ;
    if (url) {
      tileSource = new XYZ({
        url,
        crossOrigin: 'anonymous', // Enable CORS for tile loading
      });
    } else if (source === 'osm') {
      tileSource = new OSM();
    } else {
      tileSource = new OSM(); // Default fallback
    }

    // Create tile layer
    const tileLayer = new TileLayerSource({
      source: tileSource,
      opacity,
      visible,
      zIndex,
    });

    map.addLayer(tileLayer);
    setLayer(tileLayer);

    // Cleanup
    return () => {
      map.removeLayer(tileLayer);
    };
  }, [map, url, source]);

  // Update layer properties when they change
  useEffect(() => {
    if (!layer) return;
    layer.setOpacity(opacity);
  }, [layer, opacity]);

  useEffect(() => {
    if (!layer) return;
    layer.setVisible(visible);
  }, [layer, visible]);

  useEffect(() => {
    if (!layer) return;
    layer.setZIndex(zIndex);
  }, [layer, zIndex]);

  return null; // This component doesn't render anything
}
