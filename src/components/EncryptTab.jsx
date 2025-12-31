import React from 'react';
import { Copy, Check, Lock } from 'lucide-react';

const EncryptTab = ({
  loading,
  recipientPubX,
  setRecipientPubX,
  recipientPubY,
  setRecipientPubY,
  message,
  setMessage,
  encryptedEnvelope,
  copyToClipboard,
  copied,
  handleEncrypt,
  recipientUsername,
  setRecipientUsername,
  handleLoadRecipientKey,
  handleEncryptFile,
  fileDownloadUrl,
  fileDownloadName
}) => {
  return (
    <section className="section-card step-card mb-6">
      <div className="section-card-inner">
        <div className="field-card" style={{ boxShadow: 'none', marginTop: 0 }}>
          <div className="step-chip">
            <span>3. Encrypt Message</span>
          </div>
          <h2 className="step-title">Create encrypted envelope</h2>
          <p className="step-subtitle">
            Use the recipient&apos;s public key to encrypt your plaintext into a compact encrypted string.
          </p>
        </div>

        {/* Username lookup + public key */}
        <div className="split-layout" style={{ marginTop: '1.2rem' }}>
          {/* Username lookup block */}
          <div className="field-card">
            <div className="field-card-header">
              <span className="field-label">Recipient username (lookup)</span>
            </div>
            <p className="field-description">
              If the recipient has saved their public key with a username, enter it here and load their key automatically.
            </p>
            <input
              type="text"
              value={recipientUsername}
              onChange={(e) => setRecipientUsername(e.target.value)}
              placeholder="e.g. alice"
            />
            <button
              type="button"
              onClick={handleLoadRecipientKey}
              disabled={loading}
              className="btn-secondary"
              style={{ marginTop: '0.82rem' }}
            >
              Load public key from username
            </button>
          </div>

          {/* Public key X + Y in one card */}
          <div className="field-card">
            <div className="field-card-header">
              <span className="field-label">Recipient&apos;s Public Key</span>
            </div>
            <p className="field-description">
              Paste their X and Y coordinates. Together (X, Y) is their public key.
            </p>

            <div className="dual-input-row">
              <div className="dual-input-col">
                <div className="sub-field-label">Public Key X</div>
                <input
                  type="text"
                  value={recipientPubX}
                  onChange={(e) => setRecipientPubX(e.target.value)}
                  placeholder="e.g. 5506626302..."
                />
              </div>

              <div className="dual-input-col">
                <div className="sub-field-label">Public Key Y</div>
                <input
                  type="text"
                  value={recipientPubY}
                  onChange={(e) => setRecipientPubY(e.target.value)}
                  placeholder="e.g. 3267051002..."
                />
              </div>
            </div>
          </div>
        </div>


{/* Message entry */}
        <div style={{ marginTop: '1.25rem' }}>
          <div className="field-card">
            <div className="field-card-header">
              <span className="field-label">Plaintext message</span>
            </div>
            <p className="field-description">
              Type the message you want to encrypt. It will be encrypted using ECIES with an AES-256-GCM payload.
            </p>
            <textarea
              rows="4"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a secret message…"
            />
            <div className="field-meta">
              <Lock className="w-4 h-4" />
              <span>{message.length} characters</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleEncrypt}
          disabled={loading}
          className="btn-primary"
          style={{ marginTop: '1rem' }}
        >
          {loading ? 'Encrypting…' : 'Encrypt Message'}
        </button>

        {encryptedEnvelope && (
          <div className="field-card" style={{ marginTop: '1.25rem' }}>
            <div className="field-card-header">
              <div className="field-label">
                <Lock className="w-4 h-4" />
                <span>Encrypted Envelope</span>
              </div>
            </div>
            <p className="field-description">
              This is your ciphertext, including ephemeral public key and AES-GCM data, Base64 encoded.
            </p>
            <div className="field-card-body">
              <textarea
                rows="4"
                value={encryptedEnvelope}
                readOnly
                className="pr-12"
              />
              <button
                onClick={() => copyToClipboard(encryptedEnvelope, 'envelope')}
                className="copy-btn"
              >
                {copied === 'envelope' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Optional: encrypt a file instead of (or in addition to) a text message */}
        <div className="field-card" style={{ marginTop: '1.5rem' }}>
          <div className="field-card-header">
            <div className="field-label">
              <Lock className="w-4 h-4" />
              <span>Encrypt a File</span>
            </div>
          </div>
          <p className="field-description">
            Choose any file (Word, PDF, image, etc.). It will be encrypted using the same ECIES + AES-256-GCM
            scheme. The output is a small JSON file that your recipient can later decrypt with their private key.
          </p>
          <div className="field-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.82rem' }}>
            <input
              type="file"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) {
                  handleEncryptFile(f);
                }
              }}
            />
            {fileDownloadUrl && fileDownloadName && (
              <a
                href={fileDownloadUrl}
                download={fileDownloadName}
                className="btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                Download encrypted file ({fileDownloadName})
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EncryptTab;
