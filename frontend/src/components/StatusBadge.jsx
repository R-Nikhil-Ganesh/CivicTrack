import React from 'react';

const StatusBadge = ({ status }) => {
  const getBadgeClass = (s) => {
    switch (s) {
      case 'Pending':
        return 'badge-pending';
      case 'In Progress':
        return 'badge-in-progress';
      case 'Resolved':
        return 'badge-resolved';
      case 'Rejected':
        return 'badge-rejected';
      default:
        return 'badge-pending';
    }
  };

  const getDotColor = (s) => {
    switch (s) {
      case 'Pending':
        return '#ef4444';
      case 'In Progress':
        return '#f59e0b';
      case 'Resolved':
        return '#10b981';
      case 'Rejected':
        return '#64748b';
      default:
        return '#ef4444';
    }
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: getDotColor(status),
          display: 'inline-block',
        }}
      />
      {status}
    </span>
  );
};

export default StatusBadge;
