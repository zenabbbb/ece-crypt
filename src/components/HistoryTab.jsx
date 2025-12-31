import React from 'react';
import { Clock, Lock, Settings } from 'lucide-react';

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString();
  } catch {
    return '';
  }
};

const HistorySection = ({ title, emptyText, items, renderItem }) => {
  return (
    <div className="history-section">
      <div className="field-card">
        <div className="field-card-header">
          <span className="field-label">{title}</span>
        </div>
        {(!items || items.length === 0) ? (
          <p className="field-description">{emptyText}</p>
        ) : (
          <ul className="history-list">
            {items.map((item, idx) => (
              <li
                key={item.id || idx}
                className={
                  'history-item' + (idx === 0 ? ' history-item--latest' : '')
                }
              >
                {renderItem(item, idx)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const HistoryTab = ({ history }) => {
  const curves = (history && history.curves) || [];
  const encryptions = (history && history.encryptions) || [];

  const recentCurves = curves.slice(0, 5);
  const recentEncryptions = encryptions.slice(0, 5);

  return (
    <section className="section-card step-card">
      <div className="section-card-inner">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="step-chip">
              <Clock className="w-4 h-4" style={{ marginRight: '0.35rem' }} />
              <span>History &amp; activity</span>
            </div>
            <h2 className="step-title" style={{ marginTop: '0.86rem' }}>
              Review your last curves &amp; encryptions
            </h2>
            <p className="step-subtitle">
              Quickly peek at the latest curves you used and the last messages you encrypted.
              All history is stored locally in your browser.
            </p>
          </div>
        </div>

        <div className="split-layout" style={{ marginTop: '0.5rem' }}>
          <HistorySection
            title="Curve history"
            emptyText="You haven&apos;t validated or generated any curves yet."
            items={recentCurves}
            renderItem={(item, idx) => (
              <>
                <div className="history-item-header">
                  <div className="history-badge">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="history-title">
                      {item.label || `Curve #${curves.length - idx}`}
                    </div>
                    <div className="history-meta">
                      {item.source === 'standard' && 'Standard curve'}
                      {item.source === 'random' && 'Random demo curve'}
                      {item.source === 'custom' && 'Custom curve'}
                      {item.source && ' · '}
                      {formatDateTime(item.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="history-body">
                  <code className="history-code">
                    a = {item.params?.a}, b = {item.params?.b}, p = {item.params?.p}
                  </code>
                  <code className="history-code">
                    G = ({item.params?.Gx}, {item.params?.Gy}), n = {item.params?.n}
                  </code>
                </div>
              </>
            )}
          />

          <HistorySection
            title="Encryption history"
            emptyText="No encrypted messages yet — encrypt something to see it here."
            items={recentEncryptions}
            renderItem={(item, idx) => (
              <>
                <div className="history-item-header">
                  <div className="history-badge history-badge--lock">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="history-title">
                      {item.recipientUsername
                        ? `To @${item.recipientUsername}`
                        : 'Encrypted message'}
                    </div>
                    <div className="history-meta">
                      {formatDateTime(item.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="history-body">
                  {item.message && (
                    <p className="history-text">
                      <span className="history-pill">Plaintext</span>
                      <span className="history-text-main">
                        {item.message.length > 140
                          ? item.message.slice(0, 140) + '…'
                          : item.message}
                      </span>
                    </p>
                  )}
                  {item.envelope && (
                    <p className="history-text">
                      <span className="history-pill history-pill--secondary">
                        Envelope
                      </span>
                      <span className="history-text-main history-text-main--monospace">
                        {item.envelope.length > 120
                          ? item.envelope.slice(0, 120) + '…'
                          : item.envelope}
                      </span>
                    </p>
                  )}
                </div>
              </>
            )}
          />
        </div>
      </div>
    </section>
  );
};

export default HistoryTab;
