import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Huỷ',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="overlay"
      style={{
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        className="modal-card confirm-modal-card"
        style={{
          width: 'min(440px, 92vw)',
          padding: '24px',
          animation: 'liquidPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              fontSize: '18px',
              background: variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              border: variant === 'danger' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
              color: variant === 'danger' ? '#f87171' : '#818cf8',
              flexShrink: 0,
            }}
          >
            {variant === 'danger' ? '⚠️' : 'ℹ️'}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.3px',
            }}
          >
            {title}
          </h3>
        </div>

        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: '13.5px',
            lineHeight: 1.6,
            color: 'var(--fg2)',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={variant === 'danger' ? 'btn-danger-confirm' : 'btn-primary'}
            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
