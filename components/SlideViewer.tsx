"use client";

// Generic slide viewer: prev/next + dot-indicators + tangentbord + ESC för
// att lämna full-screen. Sliderna är ReactNode så varje deck kan vara helt
// custom-stylat. Visuell stil följer brand via var(--brand-primary) etc.

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

export interface Slide {
  id: string;
  // Renderas på full slide-yta. Brukar wrappa i sin egen styled container.
  content: React.ReactNode;
}

export default function SlideViewer({
  slides,
  brandPrimary = "#1e40af",
  brandAccent = "#f59e0b",
  logoSrc,
  logoAlt = "Logotyp",
}: {
  slides: Slide[];
  brandPrimary?: string;
  brandAccent?: string;
  // Logotyp top-left på alla slides. Wrappas i vit pill så den syns även
  // mot mörka slides-bakgrunder.
  logoSrc?: string;
  logoAlt?: string;
}) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const last = slides.length - 1;
  const next = () => setIndex((i) => Math.min(i + 1, last));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, last]);

  if (slides.length === 0) return null;

  const current = slides[index];

  return (
    <div
      ref={containerRef}
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-black"
          : "flex h-full flex-col bg-black"
      }
      style={
        {
          "--slide-primary": brandPrimary,
          "--slide-accent": brandAccent,
        } as React.CSSProperties
      }
    >
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2 text-white">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60"
          >
            Slide {index + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            aria-label="Föregående"
            className="flex h-8 w-8 items-center justify-center rounded text-white/80 transition hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index === last}
            aria-label="Nästa"
            className="flex h-8 w-8 items-center justify-center rounded text-white/80 transition hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            aria-label={fullscreen ? "Avsluta fullskärm" : "Fullskärm"}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded text-white/80 transition hover:bg-white/10"
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        <div key={current.id} className="h-full w-full animate-fadeIn">
          {current.content}
        </div>

        {/* Logotyp top-left, ovanför slide content */}
        {logoSrc && (
          <div
            className="pointer-events-none absolute left-6 top-6 z-10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt={logoAlt}
              className="block"
              style={{
                height: 44,
                width: "auto",
                background: "rgba(255,255,255,0.96)",
                padding: "6px 10px",
                borderRadius: 4,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            />
          </div>
        )}

        {/* Side-click zones for prev/next */}
        <button
          type="button"
          onClick={prev}
          aria-label="Föregående slide"
          className="group absolute inset-y-0 left-0 hidden w-24 cursor-w-resize items-center justify-start pl-3 md:flex"
        >
          <ChevronLeft
            size={26}
            className="rounded-full bg-white/0 p-1 text-white/0 transition group-hover:bg-white/20 group-hover:text-white/90"
          />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Nästa slide"
          className="group absolute inset-y-0 right-0 hidden w-24 cursor-e-resize items-center justify-end pr-3 md:flex"
        >
          <ChevronRight
            size={26}
            className="rounded-full bg-white/0 p-1 text-white/0 transition group-hover:bg-white/20 group-hover:text-white/90"
          />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-white/10 py-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Hoppa till slide ${i + 1}`}
            className="h-1.5 rounded-full transition"
            style={{
              width: i === index ? 24 : 8,
              background: i === index ? brandAccent : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
