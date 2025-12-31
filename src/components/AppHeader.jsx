import React from 'react';
import { Lock } from 'lucide-react';

const AppHeader = ({ onOpenGuide }) => {
  const handleGuideClick = () => {
    if (typeof onOpenGuide === 'function') {
      onOpenGuide();
    }
  };

  return (
    <header className="mb-8">
      <div className="section-card" style={{ borderRadius: '999px', padding: '0.9rem 1.5rem' }}>
        <div className="section-card-inner flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'radial-gradient(circle at 30% 0, #f97316, transparent 60%), #4f46e5'
              }}
            >
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: '#000000' }}>
                ECE Crypt
              </h1>
              <p className="text-sm" style={{ color: '#4c1d95' }}>
                Encrypt &amp; decrypt messages using elliptic curve cryptography
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-600 text-xs">
            <button
              type="button"
              className="btn-chip"
              onClick={handleGuideClick}
              style={{ background: 'rgba(129,140,248,0.14)', color: '#312e81', cursor: 'pointer' }}
            >
              Guide
            </button>
            <span
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                background: 'rgba(15,23,42,0.08)',
                border: '1px solid rgba(148,163,184,0.45)'
              }}
            >
              Demo only – not for production secrets
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
