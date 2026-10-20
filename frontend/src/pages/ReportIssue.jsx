import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import MapPicker from '../components/MapPicker';
import exifr from 'exifr';
import { convertDMSToDD, parseXmpCoord } from '../utils/exifUtils';
import {
  PlusCircle,
  Image,
  MapPin,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Navigation,
  Compass,
  Calendar,
  X,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';

const CATEGORIES = ['Roads', 'Water Supply', 'Waste Management', 'Electricity', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'];

const ReportIssue = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || 'Roads';
  const initialPriority = searchParams.get('priority') || 'Medium';
  const initialTitle = searchParams.get('title') || '';

  const [formData, setFormData] = useState({
    title: initialTitle,
    category: CATEGORIES.includes(initialCategory) ? initialCategory : 'Roads',
    priority: PRIORITIES.includes(initialPriority) ? initialPriority : 'Medium',
    description: '',
    address: '',
    latitude: 12.9716,
    longitude: 77.5946,
    imageUrl: '',
  });

  // Sync if search params change dynamically
  useEffect(() => {
    const cat = searchParams.get('category');
    const pri = searchParams.get('priority');
    const tit = searchParams.get('title');

    if (cat || pri || tit) {
      setFormData((prev) => ({
        ...prev,
        category: cat && CATEGORIES.includes(cat) ? cat : prev.category,
        priority: pri && PRIORITIES.includes(pri) ? pri : prev.priority,
        title: tit || prev.title,
      }));
    }
  }, [searchParams]);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [exifStatus, setExifStatus] = useState(null); // 'scanning' | 'found' | 'not_found'
  const [exifData, setExifData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCoordinatesChange = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const [showExifDetails, setShowExifDetails] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      setError('Selected image exceeds the 30MB limit. Please select a photo under 30MB.');
      return;
    }
    setError('');

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setExifStatus('scanning');
    setExifData(null);
    setShowExifDetails(false);

    try {
      // 1. Read the complete file into an ArrayBuffer to bypass browser chunk cutoffs
      const buffer = await file.arrayBuffer();

      // 2. Parse comprehensive EXIF, GPS, TIFF, and XMP metadata with full multi-segment support
      const tags = await exifr.parse(buffer, {
        tiff: true,
        xmp: true,
        gps: true,
        jfif: true,
        multiSegment: true,
        mergeOutput: true,
        chunked: false,
      }).catch(() => null);

      let lat = null;
      let lng = null;

      // Approach A: Direct revived latitude/longitude
      if (typeof tags?.latitude === 'number' && typeof tags?.longitude === 'number') {
        lat = Number(tags.latitude.toFixed(6));
        lng = Number(tags.longitude.toFixed(6));
      }
      // Approach B: Unmerged gps object
      else if (typeof tags?.gps?.latitude === 'number' && typeof tags?.gps?.longitude === 'number') {
        lat = Number(tags.gps.latitude.toFixed(6));
        lng = Number(tags.gps.longitude.toFixed(6));
      }
      // Approach C: Raw GPS tags in DMS (Degrees, Minutes, Seconds)
      else if (tags?.GPSLatitude && tags?.GPSLongitude) {
        lat = convertDMSToDD(tags.GPSLatitude, tags.GPSLatitudeRef || 'N');
        lng = convertDMSToDD(tags.GPSLongitude, tags.GPSLongitudeRef || 'E');
      }
      // Approach D: XMP camera coordinates
      else if (tags?.['exif:GPSLatitude'] && tags?.['exif:GPSLongitude']) {
        lat = parseXmpCoord(tags['exif:GPSLatitude']);
        lng = parseXmpCoord(tags['exif:GPSLongitude']);
      }

      // Approach E: Secondary direct exifr.gps fallback
      if ((lat === null || lng === null) && buffer) {
        try {
          const directGps = await exifr.gps(buffer);
          if (typeof directGps?.latitude === 'number' && typeof directGps?.longitude === 'number') {
            lat = Number(directGps.latitude.toFixed(6));
            lng = Number(directGps.longitude.toFixed(6));
          }
        } catch (fallbackErr) {
          console.warn('Direct GPS fallback attempt:', fallbackErr);
        }
      }

      const cameraModel = [tags?.Make, tags?.Model].filter(Boolean).join(' ') || null;
      const dateTaken = tags?.DateTimeOriginal || tags?.CreateDate || tags?.ModifyDate || null;
      const formattedDate = dateTaken ? new Date(dateTaken).toLocaleString() : null;
      const hasOtherMetadata = Boolean(cameraModel || dateTaken || tags?.ExifImageWidth || tags?.ISO);

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        // Automatically position the Leaflet map pin to the photo location
        handleCoordinatesChange(lat, lng);

        let detectedAddress = '';

        // Reverse geocode with OpenStreetMap Nominatim
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData?.display_name) {
              detectedAddress = geoData.display_name;
              setFormData((prev) => ({
                ...prev,
                address: geoData.display_name,
              }));
            }
          }
        } catch (geoErr) {
          console.warn('Reverse geocoding error:', geoErr);
        }

        setExifStatus('found');
        setExifData({
          lat,
          lng,
          camera: cameraModel,
          date: formattedDate,
          address: detectedAddress,
        });
      } else {
        setExifStatus('not_found');
        setExifData({
          camera: cameraModel,
          date: formattedDate,
          hasOtherMetadata,
          rawKeys: tags ? Object.keys(tags).slice(0, 12) : [],
        });
      }
    } catch (err) {
      console.warn('Error reading EXIF metadata:', err);
      setExifStatus('not_found');
      setExifData({ hasOtherMetadata: false });
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExifStatus(null);
    setExifData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.address.trim()) {
      setError('Please provide a street address or landmark');
      return;
    }

    setLoading(true);

    try {
      let res;
      if (imageFile) {
        const data = new FormData();
        data.append('title', formData.title);
        data.append('category', formData.category);
        data.append('priority', formData.priority);
        data.append('description', formData.description);
        data.append('address', formData.address);
        data.append('latitude', formData.latitude);
        data.append('longitude', formData.longitude);
        data.append('image', imageFile);

        res = await api.post('/issues', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/issues', formData);
      }

      if (res.data.success) {
        setSuccess('Civic issue lodged successfully!');
        setTimeout(() => {
          navigate(`/issues/${res.data.data._id}`);
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to lodge issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: '820px' }}>
      <div className="card" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                background: '#eff6ff',
                color: '#2563eb',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlusCircle size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Report a Civic Issue</h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Your report will be automatically routed to the responsible municipal department.
              </p>
              {searchParams.get('category') && (
                <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.8rem', fontWeight: 600 }}>
                  <Sparkles size={14} />
                  <span>Pre-filled via CivicBot: {formData.category} ({formData.priority} Priority)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={18} />
            <span>{success} Redirecting to tracking page...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Issue Title *</label>
            <input
              type="text"
              name="title"
              required
              className="form-input"
              placeholder="e.g. Major water pipeline leakage near metro station"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Civic Category *</label>
              <select
                name="category"
                className="form-select"
                value={formData.category}
                onChange={handleChange}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Urgency / Priority</label>
              <select
                name="priority"
                className="form-select"
                value={formData.priority}
                onChange={handleChange}
              >
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>
                    {pri}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Description *</label>
            <textarea
              name="description"
              required
              className="form-textarea"
              placeholder="Explain the issue clearly (severity, impact on public, how long it has persisted)..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                <Image size={16} color="#2563eb" />
                Photo Evidence (With Auto-GPS Metadata Detection)
              </label>
              <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                EXIF GPS Powered
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Option A: Paste Image URL</span>
                <input
                  type="url"
                  name="imageUrl"
                  className="form-input"
                  placeholder="https://example.com/pothole.jpg"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  disabled={!!imageFile}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Option B: Upload Photo from Device</span>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Image Preview & EXIF Status Notification */}
            {imageFile && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Issue Preview"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    )}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                        {imageFile.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {imageFile.size >= 1024 * 1024
                          ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB`
                          : `${(imageFile.size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>

                {/* Scanning indicator */}
                {exifStatus === 'scanning' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '0.825rem', marginTop: '8px', background: '#eff6ff', padding: '8px 12px', borderRadius: '6px' }}>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Extracting EXIF GPS coordinates from photo metadata...</span>
                  </div>
                )}

                {/* EXIF GPS Found */}
                {exifStatus === 'found' && exifData && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065f46', fontWeight: 700, fontSize: '0.85rem' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>GPS Coordinates Extracted Successfully from Photo!</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '0.8rem', color: '#047857' }}>
                      <span><strong>Latitude:</strong> {exifData.lat}° N</span>
                      <span><strong>Longitude:</strong> {exifData.lng}° E</span>
                      {exifData.camera && <span><strong>Camera:</strong> {exifData.camera}</span>}
                      {exifData.date && <span><strong>Captured:</strong> {exifData.date}</span>}
                    </div>

                    <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#065f46' }}>
                      🎯 Map pin and street landmark have been automatically updated based on the camera sensor.
                    </p>
                  </div>
                )}

                {/* EXIF GPS Not Found */}
                {exifStatus === 'not_found' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px 14px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Info size={16} color="#d97706" />
                        <span>GPS Coordinates Not Present in Uploaded File</span>
                      </div>

                      {exifData?.hasOtherMetadata && (
                        <button
                          type="button"
                          onClick={() => setShowExifDetails(!showExifDetails)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#b45309',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: 600,
                          }}
                        >
                          {showExifDetails ? 'Hide Guide' : 'Why Gallery shows it?'}
                          {showExifDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}
                    </div>

                    {exifData?.camera && (
                      <div style={{ fontSize: '0.78rem', color: '#78350f', marginTop: '4px' }}>
                        📷 Detected Camera: <strong>{exifData.camera}</strong> {exifData.date ? `• Taken on ${exifData.date}` : ''}
                      </div>
                    )}

                    <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5 }}>
                      {exifData?.hasOtherMetadata
                        ? 'Your phone gallery has system permissions to see location, but mobile operating systems (Android Photo Picker / iOS) strip GPS tags by default when uploading to a browser for privacy.'
                        : 'No GPS tags found. Common if photos are forwarded via WhatsApp/chat or downloaded from the web (which strip EXIF tags).'}
                    </p>

                    {showExifDetails && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fde68a', fontSize: '0.75rem', color: '#78350f' }}>
                        <strong>How to upload with location from your phone:</strong>
                        <ul style={{ margin: '4px 0 8px 18px', padding: 0, lineHeight: 1.6 }}>
                          <li><strong>Android:</strong> In the file picker, tap top-right <strong>⋮</strong> &gt; select <strong>"Browse..."</strong> or <strong>"Files"</strong> (DCIM/Camera) instead of the Photos tab.</li>
                          <li><strong>iPhone:</strong> In the photo picker, tap <strong>"Options"</strong> at the bottom &gt; toggle <strong>"Location / All Photos Data"</strong> ON.</li>
                          <li><strong>Computer:</strong> Ensure the photo was transferred via USB or Cloud Drive (not WhatsApp Web).</li>
                        </ul>
                        <div style={{ color: '#451a03' }}>
                          Alternatively, click directly on the interactive map below or tap <strong>"Detect Current Location"</strong>.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} color="#2563eb" />
              GIS Location & Landmark *
            </label>

            <div className="form-group">
              <input
                type="text"
                name="address"
                required
                className="form-input"
                placeholder="Street name, crossroad, or nearby famous landmark (e.g., 4th Cross, Opposite Town Hall)"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <MapPicker
              lat={formData.latitude}
              lng={formData.longitude}
              onChange={handleCoordinatesChange}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ minWidth: '160px' }}
            >
              {loading ? 'Submitting Report...' : 'Submit Grievance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportIssue;
