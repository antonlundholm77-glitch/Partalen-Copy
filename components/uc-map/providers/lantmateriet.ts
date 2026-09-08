/**
 * Lantmäteriet Map Providers
 *
 * Swedish national mapping agency (Lantmäteriet) WMS layers.
 * Requires free API key from: https://opendata.lantmateriet.se/#register
 *
 * Available layers:
 * - Topographic map (topowebb)
 * - Aerial photography (ortofoto)
 * - Contour lines (höjdkurvor) - overlay
 * - Hillshade/terrain model (höjdmodell) - overlay
 */

export interface WMSLayerProvider {
  id: string;
  name: string;
  description: string;
  type: 'wms' | 'wms-overlay';
  url: string;
  params: {
    FORMAT: string;
    LAYER?: string;
    SERVICE: string;
    VERSION: string;
    REQUEST: string;
    STYLES: string;
    SRS?: string;
    TRANSPARENT?: string;
    [key: string]: string | undefined;
  };
  projection: string;
  maxZoom?: number;
  opacity?: number;
  attribution?: string;
  thumbnail?: string;
  requiresApiKey?: boolean;
}

/**
 * Lantmäteriet Topowebb - Topographic map
 * Swedish national topographic map with roads, terrain, and labels
 */
export const LANTMATERIET_TOPOWEBB: WMSLayerProvider = {
  id: 'lantmateriet-topo',
  name: 'Lantmäteriet Topografisk',
  description: 'Swedish topographic map',
  type: 'wms',
  url: 'https://minkarta.lantmateriet.se/map/topowebbcache/',
  params: {
    FORMAT: 'image/png',
    LAYER: 'topowebb',
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    STYLES: 'default',
    SRS: 'EPSG:3857',
  },
  projection: 'EPSG:3857',
  maxZoom: 18,
  attribution: '© Lantmäteriet',
  thumbnail: '🗺️',
  requiresApiKey: true,
};

/**
 * Lantmäteriet Ortofoto - Aerial photography
 * High-resolution aerial/satellite imagery of Sweden
 */
export const LANTMATERIET_ORTOFOTO: WMSLayerProvider = {
  id: 'lantmateriet-ortofoto',
  name: 'Lantmäteriet Ortofoto',
  description: 'Aerial photography',
  type: 'wms',
  url: 'https://minkarta.lantmateriet.se/map/ortofoto/',
  params: {
    FORMAT: 'image/png',
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    STYLES: '',
    SRS: 'EPSG:3857',
  },
  projection: 'EPSG:3857',
  maxZoom: 18,
  attribution: '© Lantmäteriet',
  thumbnail: '📸',
  requiresApiKey: true,
};

/**
 * Lantmäteriet Höjdkurvor - Contour lines overlay
 * Displays elevation contour lines (toned down version)
 */
export const LANTMATERIET_CONTOURS: WMSLayerProvider = {
  id: 'lantmateriet-contours',
  name: 'Höjdkurvor',
  description: 'Contour lines overlay',
  type: 'wms-overlay',
  url: 'https://minkarta.lantmateriet.se/map/topowebbcache/',
  params: {
    FORMAT: 'image/png',
    LAYER: 'topowebbkartan_nedtonad',
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    STYLES: '',
    SRS: 'EPSG:3857',
    TRANSPARENT: 'TRUE',
  },
  projection: 'EPSG:3857',
  maxZoom: 18,
  opacity: 0.6,
  attribution: '© Lantmäteriet',
  requiresApiKey: true,
};

/**
 * Lantmäteriet Höjdmodell - Hillshade/terrain model overlay
 * Terrain shading showing elevation relief
 */
export const LANTMATERIET_HILLSHADE: WMSLayerProvider = {
  id: 'lantmateriet-hillshade',
  name: 'Höjdmodell',
  description: 'Terrain shading overlay',
  type: 'wms-overlay',
  url: 'https://minkarta.lantmateriet.se/map/hojdmodell',
  params: {
    FORMAT: 'image/png',
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    STYLES: '',
    SRS: 'EPSG:3857',
    TRANSPARENT: 'TRUE',
  },
  projection: 'EPSG:3857',
  maxZoom: 15,
  opacity: 0.4,
  attribution: '© Lantmäteriet',
  requiresApiKey: true,
};

/**
 * All Lantmäteriet base layers
 */
export const LANTMATERIET_BASE_LAYERS: WMSLayerProvider[] = [
  LANTMATERIET_TOPOWEBB,
  LANTMATERIET_ORTOFOTO,
];

/**
 * All Lantmäteriet overlay layers
 */
export const LANTMATERIET_OVERLAY_LAYERS: WMSLayerProvider[] = [
  LANTMATERIET_CONTOURS,
  LANTMATERIET_HILLSHADE,
];

/**
 * All Lantmäteriet layers (base + overlays)
 */
export const LANTMATERIET_LAYERS: WMSLayerProvider[] = [
  ...LANTMATERIET_BASE_LAYERS,
  ...LANTMATERIET_OVERLAY_LAYERS,
];

/**
 * Inject API key into WMS layer URL
 * @param provider WMS layer provider
 * @param apiKey Lantmäteriet API key
 * @returns Provider with API key injected
 */
export function injectApiKey(
  provider: WMSLayerProvider,
  apiKey: string
): WMSLayerProvider {
  return {
    ...provider,
    params: {
      ...provider.params,
      api_key: apiKey,
    },
  };
}

/**
 * Get Lantmäteriet layer by ID
 */
export function getLantmaterietLayer(id: string): WMSLayerProvider | undefined {
  return LANTMATERIET_LAYERS.find((layer) => layer.id === id);
}
