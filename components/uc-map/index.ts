/**
 * @playze/shared-uc-map
 * Shared GIS/map components for Urban Cloud applications
 *
 * @module @playze/shared-uc-map
 */

// Version and metadata
export const VERSION = '0.1.0';
export const PACKAGE_NAME = '@playze/shared-uc-map';

// Components (designverktygen DrawTool/ModifyTool medvetet utelämnade)
export { MapContainer, MapContext } from './components/MapContainer';
export { TileLayer } from './components/TileLayer';
export { WMSLayer } from './components/WMSLayer';
export { VectorLayer } from './components/VectorLayer';
export { LayerSwitcher } from './components/LayerSwitcher';
export { OrgAreasMap } from './components/OrgAreasMap';

// Hooks
export { useMap } from './hooks/useMap';
export { useVectorSource } from './hooks/useVectorSource';

// Projections
export { PROJECTIONS } from './lib/projections/constants';
export { registerProjections } from './lib/projections/registerProjections';

// Providers
export {
  BASE_LAYERS,
  DEFAULT_BASE_LAYER,
  OSM_STANDARD,
  ESRI_SATELLITE,
  ESRI_STREET,
  ESRI_TOPO,
  CARTO_LIGHT,
  CARTO_DARK,
  getLayerProvider,
  // Lantmäteriet
  LANTMATERIET_TOPOWEBB,
  LANTMATERIET_ORTOFOTO,
  LANTMATERIET_CONTOURS,
  LANTMATERIET_HILLSHADE,
  LANTMATERIET_BASE_LAYERS,
  LANTMATERIET_OVERLAY_LAYERS,
  LANTMATERIET_LAYERS,
  injectApiKey,
  getLantmaterietLayer,
} from './providers';

// Types
export type { Projection } from './types/projections';
export type { MapContainerProps } from './components/MapContainer';
export type { TileLayerProps } from './components/TileLayer';
export type { WMSLayerProps } from './components/WMSLayer';
export type { VectorLayerProps } from './components/VectorLayer';
export type { LayerSwitcherProps } from './components/LayerSwitcher';
export type { LayerProvider, WMSLayerProvider } from './providers';
export type { UseVectorSourceResult } from './hooks/useVectorSource';
export type { OrgAreasMapProps, AreaWithBoundary } from './components/OrgAreasMap';
