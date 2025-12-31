import React, { useState } from 'react';
import { Unlock } from 'lucide-react';

const DecryptTab = ({
  loading,
  privateKey,
  setPrivateKey,
  encryptedEnvelope,
  setEncryptedEnvelope,
  decryptedMessage,
  handleDecrypt,
  handleDecryptFile,
  fileDecryptUrl,
  fileDecryptName
}) => {
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <section className="section-card step-card mb-6">
      <div className="section-card-inner">
        <div className="field-card" style={{ boxShadow: 'none', marginTop: 0 }}>
          <div className="step-chip">
            <span>4. Decrypt Message</span>
          </div>
          <h2 className="step-title">Recover original plaintext</h2>
          <p className="step-subtitle">
            Paste your private key and the encrypted envelope to decrypt the message.
          </p>
        </div>

        <div className="split-layout" style={{ marginTop: '1.1rem' }}>
          <div className="field-card">
            <div className="field-card-header">
              <span className="field-label">Your Private Key</span>
            </div>
            <p className="field-description">
              This must correspond to the public key the sender used. Never share it.
            </p>
            <input
              type="text"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Paste your private key here…"
            />
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <span className="field-label">Encrypted Data</span>
            </div>
            <p className="field-description">
              Paste the encrypted string in the format: ephemX|ephemY|iv|ciphertext.
            </p>
            <textarea
              rows={6}
              value={encryptedEnvelope}
              onChange={(e) => setEncryptedEnvelope(e.target.value)}
              placeholder={"ex|ey|iv|ciphertext"}
            />
          </div>
        </div>

        <button
          onClick={handleDecrypt}
          disabled={loading}
          className="btn-primary"
          style={{ marginTop: '1rem' }}
        >
          {loading ? 'Decrypting…' : 'Decrypt Message'}
        </button>

        {decryptedMessage && (
          <div className="field-card" style={{ marginTop: '1.25rem' }}>
            <div className="field-card-header">
              <div className="field-label">
                <Unlock className="w-4 h-4" />
                <span>Decrypted Message</span>
              </div>
            </div>
            <p className="field-description">
              This is the recovered plaintext after ECIES decryption.
            </p>
            <div
              style={{
                background: '#000000',
                color: '#e5e7eb',
                borderRadius: '0.95rem',
                padding: '0.9rem 1rem',
                fontSize: '0.9rem',
                whiteSpace: 'pre-wrap'
              }}
            >
              {decryptedMessage}
            </div>
          </div>
        )}

        {/* File decryption panel */}
        <div className="field-card" style={{ marginTop: '1.5rem' }}>
          <div className="field-card-header">
            <div className="field-label">
              <Unlock className="w-4 h-4" />
              <span>Decrypt a File</span>
            </div>
          </div>
          <p className="field-description">
            Upload an encrypted file (the .enc.json produced by the Encrypt tab) and recover the original file
            using your private key.
          </p>
          <div className="field-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.82rem' }}>
            <input
              type="file"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                setSelectedFile(f || null);
              }}
            />
            <button
              type="button"
              disabled={loading || !selectedFile}
              className="btn-primary"
              style={{ marginTop: '0.82rem', alignSelf: 'flex-start' }}
              onClick={() => {
                if (selectedFile) {
                  handleDecryptFile(selectedFile);
                }
              }}
            >
              {loading ? 'Decrypting file…' : 'Decrypt File'}
            </button>
            {fileDecryptUrl && fileDecryptName && (
              <a
                href={fileDecryptUrl}
                download={fileDecryptName}
                className="btn-secondary"
                style={{ alignSelf: 'flex-start', marginTop: '0.82rem' }}
              >
                Download decrypted file ({fileDecryptName})
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DecryptTab;
