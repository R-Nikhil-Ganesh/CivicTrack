import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { List, PlusCircle, ArrowRight, MapPin, Calendar, Clock, AlertCircle, Trash2 } from 'lucide-react';

const MyReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyReports = async () => {
      try {
        setLoading(true);
        const res = await api.get('/issues/my-reports');
        if (res.data.success) {
          setReports(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch user reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyReports();
  }, []);

  const handleDeleteReport = async (issueId) => {
    if (!window.confirm('Are you sure you want to permanently delete this reported issue?')) {
      return;
    }

    try {
      const res = await api.delete(`/issues/${issueId}`);
      if (res.data.success) {
        setReports((prev) => prev.filter((r) => r._id !== issueId));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete issue');
    }
  };

  const pending = reports.filter((r) => r.status === 'Pending').length;
  const inProgress = reports.filter((r) => r.status === 'In Progress').length;
  const resolved = reports.filter((r) => r.status === 'Resolved').length;

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>My Reported Issues</h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Track the live progress of civic grievances you have submitted
          </p>
        </div>

        <Link to="/report" className="btn btn-primary">
          <PlusCircle size={16} /> Report Another Issue
        </Link>
      </div>

      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Pending Review</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{pending}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Under Work / Dispatched</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{inProgress}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <List size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Resolved & Fixed</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{resolved}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <p>Loading your grievances...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <List size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>No reports filed yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
            Notice damaged infrastructure in your neighborhood? Lodge your first report.
          </p>
          <Link to="/report" className="btn btn-primary">
            <PlusCircle size={16} /> File Civic Grievance
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reports.map((issue) => (
            <div
              key={issue._id}
              className="card"
              style={{
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <img
                  src={getImageUrl(issue.imageUrl)}
                  alt={issue.title}
                  style={{ width: '80px', height: '70px', borderRadius: '8px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60';
                  }}
                />
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge-category">{issue.category}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Dept: {issue.assignedDepartment}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    <Link to={`/issues/${issue._id}`} style={{ color: 'inherit' }}>
                      {issue.title}
                    </Link>
                  </h3>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="#2563eb" /> {issue.location?.address}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge status={issue.status} />
                <Link to={`/issues/${issue._id}`} className="btn btn-outline btn-sm">
                  View Timeline <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDeleteReport(issue._id)}
                  className="btn btn-sm"
                  style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    padding: '6px 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Delete this reported issue"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReports;
