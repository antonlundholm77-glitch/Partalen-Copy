/**
 * Supported map projections
 */

export const PROJECTIONS = {
  /**
   * SWEREF 99 TM - Swedish national coordinate system
   * UTM zone 33, ellipsoid GRS80
   * Unit: meters
   */
  SWEREF99_TM: 'EPSG:3006',

  /**
   * Web Mercator - Default for web maps
   * Used by OpenStreetMap, Google Maps, etc.
   * Unit: meters
   */
  WEB_MERCATOR: 'EPSG:3857',

  /**
   * WGS84 - Standard lat/lng coordinates
   * Used for GPS and geographic data
   * Unit: degrees
   */
  WGS84: 'EPSG:4326',
} as const;

export type ProjectionCode = typeof PROJECTIONS[keyof typeof PROJECTIONS];
