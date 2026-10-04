import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import MapPicker from '../components/MapPicker';
import { PlusCircle, Image, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

const CATEGORIES = ['Roads', 'Water Supply', 'Waste Management', 'Electricity', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'];

const ReportIssue = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Roads',
    priority: 'Medium',
    description: '',
    address: '',
    latitude: 12.9716,
    longitude: 77.5946,
    imageUrl: '',
  });

  const [imageFile, setImageFile] = useState(null);
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
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
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Image size={16} color="#2563eb" />
              Photo Evidence (Image URL or File Upload)
            </label>
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
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Option B: Upload File from Device</span>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={handleFileChange}
                />
              </div>
            </div>
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
