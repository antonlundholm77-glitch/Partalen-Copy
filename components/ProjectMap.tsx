"use client";

import "ol/ol.css";
import "@/components/uc-map/styles.css";
import { useState } from "react";
import { fromLonLat } from "ol/proj";
import {
  MapContainer,
  TileLayer,
  LayerSwitcher,
  BASE_LAYERS,
  DEFAULT_BASE_LAYER,
  getLayerProvider,
} from "@/components/uc-map";
import MapSearch from "@/components/MapSearch";

// Kartvy: OpenLayers-motorn (vendored från Playze/RoadCloud) med
// baskarteväxlare (lagerhantering) och adress-/platssökning. Inga designverktyg.
export default function ProjectMap({
  center = [20.225, 67.855], // [lon, lat] — Kiruna som standard
  zoom = 12,
}: {
  center?: [number, number];
  zoom?: number;
}) {
  const [layerId, setLayerId] = useState(DEFAULT_BASE_LAYER.id);
  const provider = getLayerProvider(layerId) ?? DEFAULT_BASE_LAYER;
  const c = fromLonLat(center) as [number, number];

  return (
    <div className="relative h-full w-full">
      <MapContainer projection="EPSG:3857" center={c} zoom={zoom}>
        <TileLayer
          key={provider.id}
          source={provider.type === "osm" ? "osm" : undefined}
          url={provider.type === "osm" ? undefined : provider.url}
        />
        <MapSearch />
      </MapContainer>
      <LayerSwitcher
        layers={BASE_LAYERS}
        activeLayerId={layerId}
        onLayerChange={setLayerId}
        position="top-right"
      />
    </div>
  );
}
