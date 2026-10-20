import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, Calendar, ArrowRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { getImageUrl } from '../services/api';

const IssueCard = ({ issue, onUpvote, currentUserId }) => {
  const isUpvoted = currentUserId && issue.upvotes?.includes(currentUserId);
  const upvoteCount = issue.upvotes?.length || 0;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Emergency':
        return { background: '#fee2e2', color: '#991b1b' };
      case 'High':
        return { background: '#ffedd5', color: '#9a3412' };
      case 'Medium':
        return { background: '#fef3c7', color: '#92400e' };
      default:
        return { background: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden', background: '#f1f5f9' }}>
        <img
          src={getImageUrl(issue.imageUrl)}
          alt={issue.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.target.src = '/demo/road_crater.webp';
          }}
        />
        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
          <span className="badge-category">{issue.category}</span>
          {issue.priority && issue.priority !== 'Medium' && (
            <span
              style={{
                ...getPriorityBadgeClass(issue.priority),
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {issue.priority}
            </span>
          )}
        </div>
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <StatusBadge status={issue.status} />
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            marginBottom: '8px',
            lineHeight: 1.35,
            color: '#0f172a',
          }}
        >
          <Link to={`/issues/${issue._id}`} style={{ color: 'inherit' }}>
            {issue.title}
          </Link>
        </h3>

        <p
          style={{
            fontSize: '0.85rem',
            color: '#64748b',
            marginBottom: '14px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
          }}
        >
          {issue.description}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: '#475569',
            marginBottom: '12px',
          }}
        >
          <MapPin size={15} color="#2563eb" style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {issue.location?.address}
          </span>
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onUpvote && onUpvote(issue._id)}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '4px 8px',
                color: isUpvoted ? '#2563eb' : '#64748b',
                background: isUpvoted ? '#eff6ff' : '#f8fafc',
                border: isUpvoted ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
              }}
              title="Support / Upvote this civic issue"
            >
              <ThumbsUp size={13} />
              <span style={{ fontWeight: 700 }}>{upvoteCount}</span>
            </button>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} />
              {formatDate(issue.createdAt)}
            </span>
          </div>

          <Link
            to={`/issues/${issue._id}`}
            className="btn btn-outline btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            Track <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default IssueCard;
