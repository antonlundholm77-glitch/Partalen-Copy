/**
 * WMSLayer - Web Map Service layer component
 *
 * Displays WMS layers from providers like Lantmäteriet.
 *
 * Usage:
 * <WMSLayer provider={LANTMATERIET_TOPOWEBB} apiKey="your_key" />
 *
 * Or with custom config:
 * <WMSLayer
 *   url="https://example.com/wms"
 *   params={{ LAYERS: 'layer1', FORMAT: 'image/png' }}
 * />
 */

'use client';

import { useEffect, useState } from 'react';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { useMap } from '../hooks/useMap';
import type { WMSLayerProvider } from '../providers/lantmateriet';
import { injectApiKey } from '../providers/lantmateriet';

export interface WMSLayerProps {
  /** WMS provider configuration (e.g., LANTMATERIET_TOPOWEBB) */
  provider?: WMSLayerProvider;

  /** Custom WMS service URL (if not using provider) */
  url?: string;

  /** Custom WMS parameters (if not using provider) */
  params?: Record<string, string>;

  /** API key for services that require it (e.g., Lantmäteriet) */
  apiKey?: string;

  /** Layer opacity (0-1) */
  opacity?: number;

  /** Layer visibility */
  visible?: boolean;

  /** Layer z-index */
  zIndex?: number;

  /** Projection (defaults to EPSG:3857) */
  projection?: string;
}

export function WMSLayer({
  provider,
  url,
  params,
  apiKey,
  opacity = 1,
  visible = true,
  zIndex = 0,
  projection = 'EPSG:3857',
}: WMSLayerProps) {
  const map = useMap();
  const [layer, setLayer] = useState<TileLayer<TileWMS> | null>(null);

  // Create layer
  useEffect(() => {
    if (!map) return;

    let wmsUrl: string;
    let wmsParams: Record<string, string | undefined>;

    // Use provider config if available
    if (provider) {
      // Inject API key if required and provided
      const configuredProvider =
        apiKey && provider.requiresApiKey
          ? injectApiKey(provider, apiKey)
          : provider;

      wmsUrl = configuredProvider.url;
      wmsParams = { ...configuredProvider.params };

      // Override opacity if specified
      if (provider.opacity !== undefined && opacity === 1) {
        opacity = provider.opacity;
      }
    } else if (url && params) {
      // Use custom config
      wmsUrl = url;
      wmsParams = { ...params };
    } else {
      console.error('[WMSLayer] Either provider or (url + params) must be provided');
      return;
    }

    // Create WMS source
    const wmsSource = new TileWMS({
      url: wmsUrl,
      params: wmsParams,
      projection,
      crossOrigin: 'anonymous', // Enable CORS
    });

    // Create tile layer
    const tileLayer = new TileLayer({
      source: wmsSource,
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
  }, [map, provider, url, params, apiKey, projection]);

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
