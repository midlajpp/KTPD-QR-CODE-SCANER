import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Confirm action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div
          style={{
            padding: '0.625rem',
            borderRadius: '50%',
            backgroundColor: danger ? 'var(--danger-light)' : 'var(--warning-light)',
            color: danger ? 'var(--danger-text)' : 'var(--warning-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;

