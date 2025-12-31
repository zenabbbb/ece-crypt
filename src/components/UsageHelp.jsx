import React from 'react';

const UsageHelp = () => {
  return (
    <section className="section-card step-card mb-6">
      <div className="section-card-inner">
        <div className="step-chip">
          <span>Guide</span>
        </div>
        <h2 className="step-title">How to Use This Tool</h2>
        <p className="step-subtitle">
          High-level walkthrough of the full ECIES flow using your custom elliptic curve.
        </p>

        <div className="split-layout" style={{ marginTop: '1.2rem' }}>
          <div className="field-card" style={{ boxShadow: 'none' }}>
            <h3 className="field-label">Step 1 – Choose Curve</h3>
            <p className="field-description">
              Pick a standard curve (secp256k1 / P-256) or enter custom parameters (a, b, p, Gx, Gy, n).
            </p>
            <p className="text-xs">
              The curve must be valid: G lies on y² = x³ + ax + b (mod p), and p should be prime.
            </p>
          </div>

          <div className="field-card" style={{ boxShadow: 'none' }}>
            <h3 className="field-label">Step 2 – Generate Keys</h3>
            <p className="field-description">
              Click &quot;Generate Keys&quot; to get a private scalar and its corresponding public point.
            </p>
            <p className="text-xs">
              Share only the public point (X, Y). Keep the private scalar secret.
            </p>
          </div>
        </div>

        <div className="split-layout" style={{ marginTop: '1.2rem' }}>
          <div className="field-card" style={{ boxShadow: 'none' }}>
            <h3 className="field-label">Step 3 – Encrypt</h3>
            <p className="field-description">
              Type your plaintext and use the recipient&apos;s public key. The app produces a JSON envelope.
            </p>
            <p className="text-xs">
              The envelope contains: ephemeral public key, IV, and AES-GCM ciphertext derived from the shared secret.
            </p>
          </div>

          <div className="field-card" style={{ boxShadow: 'none' }}>
            <h3 className="field-label">Step 4 – Decrypt</h3>
            <p className="field-description">
              Recipient pastes their private key and the JSON envelope to recover the original message.
            </p>
            <p className="text-xs">
              If curve parameters or keys don&apos;t match, decryption will fail with an error.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default UsageHelp;
