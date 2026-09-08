/**
 * LayerSwitcher - Modern layer control for switching base maps
 *
 * Features:
 * - Visual layer previews with thumbnails
 * - Smooth transitions between layers
 * - Compact collapsed state
 * - Accessible keyboard navigation
 *
 * Usage:
 * <LayerSwitcher
 *   layers={BASE_LAYERS}
 *   activeLayerId="osm"
 *   onLayerChange={(layerId) => console.log('Changed to:', layerId)}
 *   position="top-right"
 * />
 */

'use client';

import React, { useState } from 'react';
import type { LayerProvider } from '../providers';

export interface LayerSwitcherProps {
  /** Available layers to switch between */
  layers: LayerProvider[];
  /** Currently active layer ID */
  activeLayerId: string;
  /** Callback when layer is changed */
  onLayerChange: (layerId: string) => void;
  /** Position on map */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether to show layer descriptions */
  showDescriptions?: boolean;
}

export function LayerSwitcher({
  layers,
  activeLayerId,
  onLayerChange,
  position = 'top-right',
  showDescriptions = true,
}: LayerSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeLayer = layers.find(l => l.id === activeLayerId);

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: '10px', left: '10px' },
    'top-right': { top: '10px', right: '10px' },
    'bottom-left': { bottom: '40px', left: '10px' },
    'bottom-right': { bottom: '40px', right: '10px' },
  };

  const handleLayerClick = (layerId: string) => {
    onLayerChange(layerId);
    setIsExpanded(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 9999,
        ...positionStyles[position],
      }}
    >
      {/* Expanded Layer Panel */}
      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '8px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            padding: '12px',
            minWidth: '280px',
            maxWidth: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '12px',
              color: '#333',
            }}
          >
            Select Base Layer
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}
          >
            {layers.map(layer => (
              <button
                key={layer.id}
                onClick={() => handleLayerClick(layer.id)}
                style={{
                  padding: '12px',
                  border: layer.id === activeLayerId ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: layer.id === activeLayerId ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (layer.id !== activeLayerId) {
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (layer.id !== activeLayerId) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    marginBottom: '6px',
                  }}
                >
                  {layer.thumbnail}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '2px',
                  }}
                >
                  {layer.name}
                </div>
                {showDescriptions && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      lineHeight: '1.3',
                    }}
                  >
                    {layer.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '44px',
          height: '44px',
          backgroundColor: 'white',
          border: '2px solid rgba(0,0,0,0.1)',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          transition: 'all 0.2s',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f9fafb';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        }}
        title="Switch base layer"
      >
        <div style={{ fontSize: '20px' }}>
          {activeLayer?.thumbnail || '🗺️'}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#6b7280',
            marginTop: '2px',
          }}
        >
          Layers
        </div>
      </button>

      {/* Click outside to close */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
}
