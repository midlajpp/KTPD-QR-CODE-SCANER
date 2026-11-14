import React from 'react';

export const StatusBadge = ({ status }) => {
  const isActive = status === 'Active';
  return (
    <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: isActive ? 'var(--success)' : 'var(--danger)'
        }}
      />
      {status}
    </span>
  );
};

export const BloodBadge = ({ bloodGroup }) => {
  return <span className="badge badge-blood">{bloodGroup || 'N/A'}</span>;
};

