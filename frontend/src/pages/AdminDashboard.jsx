import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  RefreshCw,
  Edit,
  Eye,
  Filter,
} from 'lucide-react';

const DEPARTMENTS = ['All', 'Roads', 'Water Supply', 'Waste Management', 'Electricity', 'General'];
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDept, setSelectedDept] = useState(
    user?.role === 'official' && user?.department !== 'None' ? user.department : 'All'
  );
  const [selectedStatus, setSelectedStatus] = useState('All');

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [modalStatus, setModalStatus] = useState('In Progress');
  const [modalComment, setModalComment] = useState('');
  const [reassignDept, setReassignDept] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const statsRes = await api.get('/admin/stats');
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      const params = {};
      if (selectedDept !== 'All') params.department = selectedDept;
      if (selectedStatus !== 'All') params.status = selectedStatus;

      const issuesRes = await api.get('/issues', { params });
      if (issuesRes.data.success) {
        setIssues(issuesRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDept, selectedStatus]);

  const handleOpenModal = (issue) => {
    setSelectedIssue(issue);
    setModalStatus(issue.status);
    setModalComment('');
    setReassignDept(issue.assignedDepartment);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;

    setSaving(true);
    try {
      await api.patch(`/admin/issues/${selectedIssue._id}/status`, {
        status: modalStatus,
        comment: modalComment,
      });

      if (user?.role === 'admin' && reassignDept && reassignDept !== selectedIssue.assignedDepartment) {
        await api.patch(`/admin/issues/${selectedIssue._id}/assign`, {
          department: reassignDept,
        });
      }

      setSelectedIssue(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update issue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={26} color="#2563eb" />
            Municipal Department Workflow Portal
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Logged in as <strong>{user?.name}</strong> ({user?.role === 'admin' ? 'Super Administrator' : `${user?.department} Officer`})
          </p>
        </div>

        <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm" title="Refresh">
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      {stats && (
        <div className="grid-4" style={{ marginBottom: '28px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Building size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Lodged</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.summary.total}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Pending Review</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.summary.pending}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>In Progress</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.summary.inProgress}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Resolution Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.summary.resolutionRate}%</div>
            </div>
          </div>
        </div>
      )}

      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 700 }}>
          <Filter size={16} color="#2563eb" />
          Filter Work Orders:
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  Department: {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
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

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 16px' }}>Issue & Category</th>
              <th style={{ padding: '12px 16px' }}>Location / Landmark</th>
              <th style={{ padding: '12px 16px' }}>Department</th>
              <th style={{ padding: '12px 16px' }}>Priority</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading department work orders...
                </td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No complaints match the selected filter.
                </td>
              </tr>
            ) : (
              issues.map((iss) => (
                <tr key={iss._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                      {iss.title}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="badge-category">{iss.category}</span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {new Date(iss.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', color: '#475569', maxWidth: '200px' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {iss.location?.address}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {iss.assignedDepartment}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: iss.priority === 'Emergency' ? '#fee2e2' : iss.priority === 'High' ? '#ffedd5' : '#f1f5f9',
                        color: iss.priority === 'Emergency' ? '#991b1b' : iss.priority === 'High' ? '#9a3412' : '#475569',
                      }}
                    >
                      {iss.priority}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={iss.status} />
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <Link to={`/issues/${iss._id}`} className="btn btn-secondary btn-sm" title="View Details">
                        <Eye size={14} />
                      </Link>
                      <button
                        onClick={() => handleOpenModal(iss)}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit size={14} /> Update
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedIssue && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
              Update Issue #{selectedIssue._id.substring(selectedIssue._id.length - 6).toUpperCase()}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              {selectedIssue.title}
            </p>

            <form onSubmit={handleSaveModal}>
              <div className="form-group">
                <label className="form-label">Workflow Status</label>
                <select
                  className="form-select"
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                >
                  <option value="Pending">Pending (Awaiting Ground Assessment)</option>
                  <option value="In Progress">In Progress (Crew Dispatched / Work Scheduled)</option>
                  <option value="Resolved">Resolved (Work Done & Inspected)</option>
                  <option value="Rejected">Rejected (Out of Municipal Scope / Duplicate)</option>
                </select>
              </div>

              {user?.role === 'admin' && (
                <div className="form-group">
                  <label className="form-label">Reassign Department (Admin Only)</label>
                  <select
                    className="form-select"
                    value={reassignDept}
                    onChange={(e) => setReassignDept(e.target.value)}
                  >
                    {DEPARTMENTS.filter((d) => d !== 'All').map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Action Log / Official Comment *</label>
                <textarea
                  required
                  className="form-textarea"
                  placeholder="e.g. Water engineering team repaired the joint leak. Road cleaned."
                  value={modalComment}
                  onChange={(e) => setModalComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving...' : 'Commit Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
