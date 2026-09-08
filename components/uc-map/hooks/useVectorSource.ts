/**
 * useVectorSource - Hook to create and manage a vector source
 *
 * Provides a reactive way to manage features in a vector source.
 *
 * Usage:
 * const { source, features, addFeature, removeFeature, clearFeatures } = useVectorSource();
 *
 * return <VectorLayer source={source} />;
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import VectorSource from 'ol/source/Vector';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';

export interface UseVectorSourceResult {
  /** The OpenLayers vector source */
  source: VectorSource<Feature<Geometry>>;

  /** Array of features currently in the source */
  features: Feature<Geometry>[];

  /** Add a feature to the source */
  addFeature: (feature: Feature<Geometry>) => void;

  /** Add multiple features to the source */
  addFeatures: (features: Feature<Geometry>[]) => void;

  /** Remove a feature from the source */
  removeFeature: (feature: Feature<Geometry>) => void;

  /** Clear all features from the source */
  clearFeatures: () => void;

  /** Get feature by ID */
  getFeatureById: (id: string | number) => Feature<Geometry> | null;
}

export function useVectorSource(
  initialFeatures: Feature<Geometry>[] = []
): UseVectorSourceResult {
  // Create vector source with initial features
  const source = useMemo(() => {
    return new VectorSource({
      features: initialFeatures,
    });
  }, []); // Only create once

  // Track features for reactivity
  const [features, setFeatures] = useState<Feature<Geometry>[]>(initialFeatures);

  // Add a feature
  const addFeature = useCallback(
    (feature: Feature<Geometry>) => {
      source.addFeature(feature);
      setFeatures(source.getFeatures());
    },
    [source]
  );

  // Add multiple features
  const addFeatures = useCallback(
    (newFeatures: Feature<Geometry>[]) => {
      source.addFeatures(newFeatures);
      setFeatures(source.getFeatures());
    },
    [source]
  );

  // Remove a feature
  const removeFeature = useCallback(
    (feature: Feature<Geometry>) => {
      source.removeFeature(feature);
      setFeatures(source.getFeatures());
    },
    [source]
  );

  // Clear all features
  const clearFeatures = useCallback(() => {
    source.clear();
    setFeatures([]);
  }, [source]);

  // Get feature by ID
  const getFeatureById = useCallback(
    (id: string | number) => {
      return source.getFeatureById(id);
    },
    [source]
  );

  return {
    source,
    features,
    addFeature,
    addFeatures,
    removeFeature,
    clearFeatures,
    getFeatureById,
  };
}
