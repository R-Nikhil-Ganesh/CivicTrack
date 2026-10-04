import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Link } from 'react-router-dom';

const getPinColor = (status) => {
  switch (status) {
    case 'Pending':
      return '#ef4444';
    case 'In Progress':
      return '#f59e0b';
    case 'Resolved':
      return '#10b981';
    case 'Rejected':
      return '#64748b';
    default:
      return '#2563eb';
  }
};

const createMarkerIcon = (status) => {
  const color = getPinColor(status);
  return L.divIcon({
    className: 'custom-status-pin',
    html: `<div style="
      background-color: ${color};
      width: 26px;
      height: 26px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 7px;
        height: 7px;
        background: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
};

const MapView = ({ issues = [], height = '450px' }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const defaultCenter = [12.9716, 77.5946];
    const map = L.map(mapContainerRef.current).setView(defaultCenter, 12);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    if (issues.length === 0) return;

    const bounds = [];

    issues.forEach((issue) => {
      if (issue.location && issue.location.latitude && issue.location.longitude) {
        const lat = issue.location.latitude;
        const lng = issue.location.longitude;
        bounds.push([lat, lng]);

        const marker = L.marker([lat, lng], {
          icon: createMarkerIcon(issue.status),
        });

        const popupContent = `
          <div style="min-width: 190px; font-family: sans-serif; padding: 2px;">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; color: #0f172a;">
              ${issue.title}
            </div>
            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 6px;">
              📍 ${issue.location.address}
            </div>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 8px;">
              <span style="
                background: #f1f5f9; 
                padding: 2px 6px; 
                border-radius: 4px; 
                font-size: 0.7rem; 
                font-weight: 600;
              ">
                ${issue.category}
              </span>
              <span style="
                color: ${getPinColor(issue.status)}; 
                font-size: 0.7rem; 
                font-weight: 700;
              ">
                ● ${issue.status}
              </span>
            </div>
            <a href="/issues/${issue._id}" style="
              display: inline-block;
              background: #2563eb;
              color: white;
              padding: 4px 10px;
              border-radius: 6px;
              font-size: 0.75rem;
              text-decoration: none;
              font-weight: 600;
            ">
              View Details & Track →
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(marker);
      }
    });

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [issues]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={mapContainerRef}
        style={{
          height: height,
          width: '100%',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(4px)',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '0.75rem',
          display: 'flex',
          gap: '12px',
          zIndex: 400,
          border: '1px solid #e2e8f0',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          Pending
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          In Progress
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          Resolved
        </span>
      </div>
    </div>
  );
};

export default MapView;
