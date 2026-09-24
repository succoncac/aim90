import React from 'react';

interface ToastProps {
  message: string | null;
  isError?: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, isError }) => {
  if (!message) return null;

  return (
    <div
      id="toast"
      className={`toast ${isError ? 'err' : ''}`}
      style={{ display: 'block' }}
    >
      {message}
    </div>
  );
};
