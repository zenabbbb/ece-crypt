import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const ErrorAlert = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="error-box">
      <AlertCircle className="w-4 h-4" />
      <p style={{ flex: 1 }}>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ background: 'transparent', color: '#7f1d1d' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;
