"use client";

import { useEffect, useRef, useState } from "react";
import { fromLonLat } from "ol/proj";
import { useMap } from "@/components/uc-map";

// Adress-/platssökning för kartan. Måste ligga inuti <MapContainer> (använder
// useMap). Geokodar via OpenStreetMap Nominatim (gratis, ingen nyckel) — endast
// platsfrågor, inget dokumentinnehåll lämnar miljön. Byts lätt till Lantmäteriet.
type Hit = { lat: string; lon: string; display_name: string };

export default function MapSearch() {
  const map = useMap();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      setHits([]);
      setOpen(false);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=se&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "sv" } });
        const data = (await res.json()) as Hit[];
        setHits(data);
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function go(h: Hit) {
    if (map) {
      map.getView().animate({
        center: fromLonLat([parseFloat(h.lon), parseFloat(h.lat)]),
        zoom: 16,
        duration: 600,
      });
    }
    setQ(h.display_name.split(",")[0]);
    setOpen(false);
  }

  return (
    <div style={{ position: "absolute", top: 10, left: 10, zIndex: 9999, width: 300 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "white",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 7,
          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
          padding: "6px 10px",
        }}
      >
        <span style={{ fontSize: 13, color: "#9a9684" }}>⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          placeholder="Sök adress eller plats…"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 13,
            background: "transparent",
            color: "#2b2a24",
          }}
        />
        {loading && <span style={{ fontSize: 11, color: "#9a9684" }}>…</span>}
        {q && !loading && (
          <button
            onClick={() => {
              setQ("");
              setHits([]);
              setOpen(false);
            }}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9a9684", fontSize: 13 }}
            title="Rensa"
          >
            ✕
          </button>
        )}
      </div>

      {open && hits.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: "4px 0 0",
            padding: 4,
            background: "white",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 7,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {hits.map((h, i) => (
            <li key={i}>
              <button
                onClick={() => go(h)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 12.5,
                  lineHeight: 1.35,
                  color: "#2b2a24",
                  padding: "6px 8px",
                  borderRadius: 5,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f0e6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {h.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
