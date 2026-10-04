import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import IssueCard from '../components/IssueCard';
import MapView from '../components/MapView';
import { Search, Map, List, PlusCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['All', 'Roads', 'Water Supply', 'Waste Management', 'Electricity', 'Other'];
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved'];

const Home = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/issues', { params });
      if (res.data.success) {
        setIssues(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIssues();
  };

  const handleUpvote = async (issueId) => {
    if (!user) {
      alert('Please sign in as a citizen to upvote civic issues.');
      return;
    }
    try {
      const res = await api.post(`/issues/${issueId}/upvote`);
      if (res.data.success) {
        setIssues((prev) =>
          prev.map((iss) => {
            if (iss._id === issueId) {
              const hasUpvoted = iss.upvotes?.includes(user._id);
              const newUpvotes = hasUpvoted
                ? iss.upvotes.filter((id) => id !== user._id)
                : [...(iss.upvotes || []), user._id];
              return { ...iss, upvotes: newUpvotes };
            }
            return iss;
          })
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upvote');
    }
  };

  const pendingCount = issues.filter((i) => i.status === 'Pending').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  return (
    <div className="main-content">
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: 'white',
          padding: '36px 30px',
          borderRadius: '16px',
          marginBottom: '28px',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
        }}
      >
        <div style={{ maxWidth: '720px' }}>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-block',
              marginBottom: '12px',
              letterSpacing: '0.02em',
            }}
          >
            Transparent Municipal Accountability & GIS Portal
          </span>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '12px' }}>
            Report Civic Issues, Track Department Resolutions
          </h1>
          <p style={{ fontSize: '0.975rem', opacity: 0.9, lineHeight: 1.6, marginBottom: '22px' }}>
            Empowering citizens to report damaged roads, water leakages, garbage overflow, and dark streetlights.
            Pinpoint exact GIS coordinates and track real-time resolution logs.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to="/report"
              className="btn btn-primary"
              style={{
                backgroundColor: '#ffffff',
                color: '#1e3a8a',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                fontWeight: 700,
              }}
            >
              <PlusCircle size={17} />
              Report an Issue Now
            </Link>
            <a
              href="#city-map"
              className="btn"
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <Map size={17} />
              Explore GIS Map
            </a>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <List size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Complaints</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{issues.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Pending Triage</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{pendingCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>In Progress Work</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{inProgressCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Resolved & Closed</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{resolvedCount}</div>
          </div>
        </div>
      </div>

      <section id="city-map" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              Live City GIS Issue Map
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Click any colored pin to inspect location, current status, and department triage.
            </p>
          </div>
        </div>

        <MapView issues={issues} height="420px" />
      </section>

      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by title, description or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <select
              className="form-select"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  Category: {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="form-select"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  Status: {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Recent Civic Reports ({issues.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <p>Loading reports and coordinates...</p>
          </div>
        ) : issues.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#64748b',
            }}
          >
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>No civic issues found</p>
            <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
              No issues match your current search or category filter.
            </p>
            <Link to="/report" className="btn btn-primary">
              Report the First Issue
            </Link>
          </div>
        ) : (
          <div className="grid-3">
            {issues.map((issue) => (
              <IssueCard
                key={issue._id}
                issue={issue}
                onUpvote={handleUpvote}
                currentUserId={user?._id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
