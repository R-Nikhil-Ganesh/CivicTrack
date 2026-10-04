import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

const customPinIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<div style="
    background-color: #ef4444;
    width: 28px;
    height: 28px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      transform: rotate(45deg);
    "></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const MapPicker = ({ lat, lng, onChange }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const defaultLat = lat || 12.9716;
  const defaultLng = lng || 77.5946;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([defaultLat, defaultLng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    map.on('click', (e) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      marker.setLatLng([newLat, newLng]);
      onChange(Number(newLat.toFixed(6)), Number(newLng.toFixed(6)));
    });

    marker.on('dragend', (e) => {
      const position = marker.getLatLng();
      onChange(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
    });

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (lat && lng && markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng]);
    }
  }, [lat, lng]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = Number(position.coords.latitude.toFixed(6));
        const userLng = Number(position.coords.longitude.toFixed(6));
        onChange(userLat, userLng);
      },
      (error) => {
        alert('Could not retrieve GPS location: ' + error.message);
      }
    );
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Click anywhere on map or drag pin to set exact coordinates
        </span>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Navigation size={14} color="#2563eb" />
          Detect Current Location
        </button>
      </div>

      <div
        ref={mapContainerRef}
        style={{
          height: '280px',
          width: '100%',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          zIndex: 1,
        }}
      />

      <div
        style={{
          marginTop: '6px',
          display: 'flex',
          gap: '12px',
          fontSize: '0.8rem',
          color: '#475569',
        }}
      >
        <span>
          <strong>Lat:</strong> {lat ? lat.toFixed(5) : 'Not picked'}
        </span>
        <span>
          <strong>Lng:</strong> {lng ? lng.toFixed(5) : 'Not picked'}
        </span>
      </div>
    </div>
  );
};

export default MapPicker;
