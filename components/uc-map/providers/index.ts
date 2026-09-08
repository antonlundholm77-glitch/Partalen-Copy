/**
 * Map Layer Providers
 *
 * Configuration for various map tile providers including:
 * - OpenStreetMap (OSM)
 * - Satellite imagery (Esri, Google, etc.)
 * - Swedish maps (Lantmäteriet)
 */

export interface LayerProvider {
  id: string;
  name: string;
  description: string;
  type: 'osm' | 'xyz' | 'wms' | 'wms-overlay';
  url?: string;
  maxZoom?: number;
  attribution?: string;
  thumbnail?: string;
}

// Re-export Lantmäteriet providers
export type {
  WMSLayerProvider,
} from './lantmateriet';

export {
  LANTMATERIET_TOPOWEBB,
  LANTMATERIET_ORTOFOTO,
  LANTMATERIET_CONTOURS,
  LANTMATERIET_HILLSHADE,
  LANTMATERIET_BASE_LAYERS,
  LANTMATERIET_OVERLAY_LAYERS,
  LANTMATERIET_LAYERS,
  injectApiKey,
  getLantmaterietLayer,
} from './lantmateriet';

/**
 * OpenStreetMap - Standard map layer
 */
export const OSM_STANDARD: LayerProvider = {
  id: 'osm',
  name: 'OpenStreetMap',
  description: 'Community-driven street map',
  type: 'osm',
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors',
  thumbnail: '🗺️',
};

/**
 * Esri World Imagery - High-resolution satellite imagery
 */
export const ESRI_SATELLITE: LayerProvider = {
  id: 'esri-satellite',
  name: 'Satellite',
  description: 'High-resolution satellite imagery',
  type: 'xyz',
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  thumbnail: '🛰️',
};

/**
 * Esri World Street Map - Clean street map
 */
export const ESRI_STREET: LayerProvider = {
  id: 'esri-street',
  name: 'Streets',
  description: 'Esri world street map',
  type: 'xyz',
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  attribution: '© Esri',
  thumbnail: '🏙️',
};

/**
 * Esri World Topo Map - Topographic map
 */
export const ESRI_TOPO: LayerProvider = {
  id: 'esri-topo',
  name: 'Topographic',
  description: 'Detailed topographic map',
  type: 'xyz',
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  attribution: '© Esri',
  thumbnail: '⛰️',
};

/**
 * CartoDB Positron - Light, minimalist map
 */
export const CARTO_LIGHT: LayerProvider = {
  id: 'carto-light',
  name: 'Light',
  description: 'Minimalist light theme',
  type: 'xyz',
  url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  maxZoom: 19,
  attribution: '© CARTO, © OpenStreetMap contributors',
  thumbnail: '☀️',
};

/**
 * CartoDB Dark Matter - Dark theme map
 */
export const CARTO_DARK: LayerProvider = {
  id: 'carto-dark',
  name: 'Dark',
  description: 'Modern dark theme',
  type: 'xyz',
  url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  maxZoom: 19,
  attribution: '© CARTO, © OpenStreetMap contributors',
  thumbnail: '🌙',
};

/**
 * All available base layers
 */
export const BASE_LAYERS: LayerProvider[] = [
  OSM_STANDARD,
  ESRI_SATELLITE,
  ESRI_STREET,
  ESRI_TOPO,
  CARTO_LIGHT,
  CARTO_DARK,
];

/**
 * Default base layer
 */
export const DEFAULT_BASE_LAYER = OSM_STANDARD;

/**
 * Get layer provider by ID
 */
export function getLayerProvider(id: string): LayerProvider | undefined {
  return BASE_LAYERS.find(layer => layer.id === id);
}
