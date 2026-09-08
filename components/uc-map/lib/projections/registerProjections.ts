/**
 * Register custom projections with OpenLayers
 * Must be called before using any map components
 */

import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { PROJECTIONS } from './constants';

/**
 * Register all Swedish and common projections
 * This function should be called once at application startup
 */
export function registerProjections(): void {
  // SWEREF 99 TM (Swedish national grid)
  // https://epsg.io/3006
  proj4.defs(
    PROJECTIONS.SWEREF99_TM,
    '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
  );

  // Web Mercator (standard web map projection)
  // https://epsg.io/3857
  proj4.defs(
    PROJECTIONS.WEB_MERCATOR,
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +type=crs'
  );

  // WGS84 (lat/lng degrees)
  // https://epsg.io/4326
  proj4.defs(
    PROJECTIONS.WGS84,
    '+proj=longlat +datum=WGS84 +no_defs +type=crs'
  );

  // Register all projections with OpenLayers
  register(proj4);

  console.log('[shared-uc-map] Projections registered:', Object.values(PROJECTIONS));
}
