import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem'
        }}
      >
        <AlertCircle size={32} />
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        404 - Page Not Found
      </h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: 420, marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={16} />
        <span>Back to Dashboard</span>
      </Link>
    </div>
  );
};

export default NotFoundPage;

