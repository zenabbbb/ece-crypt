import React from 'react';
import { Copy, Check, Lock } from 'lucide-react';

const KeysTab = ({
  loading,
  handleGenerateKeys,
  privateKey,
  setPrivateKey,
  publicKeyX,
  publicKeyY,
  copyToClipboard,
  copied
}) => {
  return (
    <section className="section-card step-card mb-6">
      <div className="section-card-inner">
        <div className="field-card" style={{ boxShadow: 'none', marginTop: 0 }}>
          <div className="step-chip">
            <span>2. Generate Keys</span>
          </div>
          <h2 className="step-title">Create public &amp; private key pair</h2>
          <p className="step-subtitle">
            Keys are generated on the selected curve. Private key stays with you, public key is shareable.
          </p>
        </div>

        <div style={{ marginTop: '1.1rem' }}>
          <button
            onClick={handleGenerateKeys}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Generating…' : 'Generate Keys'}
          </button>
        </div>

        {/* Private Key */}
        <div className="field-card">
          <div className="field-card-header">
            <div className="field-label">
              <Lock className="w-4 h-4" />
              <span>Private Key</span>
            </div>
            <span className="field-badge badge-secret">SECRET</span>
          </div>
          <p className="field-description">
            Keep this value safe. Anyone with this key can decrypt your messages.
          </p>
          <div className="relative">
            <input
              type="text"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Generate keys first"
              className="pr-12"
            />
            {privateKey && (
              <button
                onClick={() => copyToClipboard(privateKey, 'privateKey')}
                className="copy-btn"
              >
                {copied === 'privateKey' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Public Key */}
        <div className="field-card">
          <div className="field-card-header">
            <div className="field-label">
              <Lock className="w-4 h-4" />
              <span>Public Key</span>
            </div>
            <span className="field-badge badge-shareable">SHAREABLE</span>
          </div>
          <p className="field-description">
            Share this point (X, Y) with others so they can encrypt messages to you.
          </p>

          <div className="relative" style={{ marginBottom: '0.6rem' }}>
            <input
              type="text"
              value={publicKeyX}
              readOnly
              placeholder="Generate keys first"
              className="pr-12"
            />
            {publicKeyX && (
              <button
                onClick={() => copyToClipboard(publicKeyX, 'pubX')}
                className="copy-btn"
              >
                {copied === 'pubX' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={publicKeyY}
              readOnly
              placeholder="Generate keys first"
              className="pr-12"
            />
            {publicKeyY && (
              <button
                onClick={() => copyToClipboard(publicKeyY, 'pubY')}
                className="copy-btn"
              >
                {copied === 'pubY' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default KeysTab;
