/**
 * Projection type definitions
 */

export type Projection = 'EPSG:3006' | 'EPSG:3857' | 'EPSG:4326' | string;

export interface CoordinateTransformOptions {
  fromProjection: Projection;
  toProjection: Projection;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}
