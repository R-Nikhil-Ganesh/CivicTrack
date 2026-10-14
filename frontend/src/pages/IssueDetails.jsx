import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import L from 'leaflet';
import {
  MapPin,
  ThumbsUp,
  Calendar,
  Building,
  User,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

const IssueDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isOfficial } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('In Progress');
  const [statusComment, setStatusComment] = useState('');
  const [updating, setUpdating] = useState(false);

  const miniMapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/issues/${id}`);
      if (res.data.success) {
        setIssue(res.data.data);
        setNewStatus(res.data.data.status);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [id]);

  useEffect(() => {
    if (!issue || !miniMapRef.current || mapInstanceRef.current) return;

    const lat = issue.location?.latitude || 12.9716;
    const lng = issue.location?.longitude || 77.5946;

    const map = L.map(miniMapRef.current).setView([lat, lng], 14);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'custom-pin',
      html: `<div style="
        background-color: #2563eb;
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    L.marker([lat, lng], { icon: pinIcon })
      .addTo(map)
      .bindPopup(`<b>${issue.title}</b><br/>${issue.location?.address}`)
      .openPopup();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [issue]);

  const handleUpvote = async () => {
    if (!user) {
      alert('Please log in to upvote this issue.');
      return;
    }
    try {
      const res = await api.post(`/issues/${id}/upvote`);
      if (res.data.success) {
        fetchIssue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Upvote failed');
    }
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.patch(`/admin/issues/${id}/status`, {
        status: newStatus,
        comment: statusComment,
      });
      if (res.data.success) {
        setShowStatusModal(false);
        setStatusComment('');
        fetchIssue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
        <p>Loading civic issue details & GIS data...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="main-content">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '12px' }} />
          <h3>Error Loading Issue</h3>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>{error || 'Issue not found'}</p>
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={16} /> Back to City Issues
          </Link>
        </div>
      </div>
    );
  }

  const isUpvoted = user && issue.upvotes?.includes(user._id);
  const upvoteCount = issue.upvotes?.length || 0;

  const isOwner = user && issue && (
    (typeof issue.reportedBy === 'string' && issue.reportedBy === user._id) ||
    (typeof issue.reportedBy === 'object' && issue.reportedBy?._id === user._id)
  );
  const canDelete = isOwner || isOfficial;

  const handleDeleteIssue = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this civic issue? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const res = await api.delete(`/issues/${id}`);
      if (res.data.success) {
        alert('Civic issue deleted successfully');
        if (isOfficial) {
          navigate('/admin');
        } else {
          navigate('/my-reports');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete issue');
      setDeleting(false);
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: '980px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <Link to="/" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={15} /> Back to Issues Feed
        </Link>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isOfficial && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldCheck size={16} />
              Update Department Status
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDeleteIssue}
              disabled={deleting}
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                fontWeight: 600,
              }}
              title="Delete this civic issue"
            >
              <Trash2 size={15} />
              {deleting ? 'Deleting...' : 'Delete Issue'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        <div>
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge-category">{issue.category}</span>
                <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                  Dept: {issue.assignedDepartment}
                </span>
                <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Priority: {issue.priority}
                </span>
              </div>
              <StatusBadge status={issue.status} />
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.3, color: '#0f172a' }}>
              {issue.title}
            </h1>

            <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', background: '#f1f5f9', maxHeight: '380px' }}>
              <img
                src={getImageUrl(issue.imageUrl)}
                alt={issue.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60';
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Description</h3>
              <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {issue.description}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                <User size={15} />
                <span>Reported by <strong>{issue.reportedBy?.name || 'Citizen'}</strong></span>
              </div>

              <button
                onClick={handleUpvote}
                className="btn btn-secondary btn-sm"
                style={{
                  color: isUpvoted ? '#2563eb' : '#64748b',
                  background: isUpvoted ? '#eff6ff' : '#f8fafc',
                  border: isUpvoted ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  padding: '6px 14px',
                }}
              >
                <ThumbsUp size={15} />
                <span>{upvoteCount} Community Upvotes</span>
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={19} color="#2563eb" />
              Transparent Resolution Timeline ({issue.statusHistory?.length || 0})
            </h3>

            <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid #e2e8f0', marginLeft: '10px' }}>
              {issue.statusHistory && issue.statusHistory.length > 0 ? (
                issue.statusHistory.map((step, index) => (
                  <div key={index} style={{ marginBottom: '22px', position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-31px',
                        top: '2px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: index === issue.statusHistory.length - 1 ? '#2563eb' : '#cbd5e1',
                        border: '3px solid white',
                        boxShadow: '0 0 0 1px #94a3b8',
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <StatusBadge status={step.status} />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(step.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500, marginTop: '6px' }}>
                      {step.comment || 'Status updated'}
                    </div>

                    {step.updatedBy && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        Logged by: {step.updatedBy.name} ({step.updatedBy.department || step.updatedBy.role})
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No status history available yet.</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={17} color="#2563eb" />
              GIS Coordinates & Location
            </h3>

            <div style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '14px', fontWeight: 500 }}>
              {issue.location?.address}
            </div>

            <div
              ref={miniMapRef}
              style={{
                height: '240px',
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '12px',
              }}
            />

            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>Lat: {issue.location?.latitude}</span>
              <span>Lng: {issue.location?.longitude}</span>
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={17} color="#2563eb" />
              Department Assignment
            </h3>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
              This issue has been routed to the <strong>{issue.assignedDepartment}</strong> department for inspection and remediation.
            </p>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', color: '#475569' }}>
              <div><strong>Ticket Reference:</strong> #{issue._id.substring(issue._id.length - 8).toUpperCase()}</div>
              <div style={{ marginTop: '4px' }}>
                <strong>Lodged on:</strong> {new Date(issue.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '12px' }}>
              Update Issue Status & Add Resolution Proof
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Changes will be permanently recorded in the public transparency timeline.
            </p>

            <form onSubmit={handleUpdateStatusSubmit}>
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select
                  className="form-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress (Triage / Team Dispatched)</option>
                  <option value="Resolved">Resolved (Work Completed)</option>
                  <option value="Rejected">Rejected (Out of Municipal Scope / Duplicate)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Official Department Note / Action Taken</label>
                <textarea
                  required
                  className="form-textarea"
                  placeholder="e.g. Dispatched asphalt repair crew toIndiranagar junction. Pothole filled and sealed."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary"
                >
                  {updating ? 'Saving...' : 'Commit Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueDetails;
