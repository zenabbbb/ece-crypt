import React, { useState } from 'react';
import { Settings, AlertCircle } from 'lucide-react';

const CurveConfigPanel = ({
  curveParams,
  setCurveParams,
  showCurveConfig,
  setShowCurveConfig,
  customCurve,
  loadStandardCurve,
  validateAndLoadCurve,
  generateRandomCurve,
  curveError,
  curveHistory,
  onReuseCurve
}) => {
  const [curveFileError, setCurveFileError] = useState('');
  const [showPoints, setShowPoints] = useState(false);
  const [curvePoints, setCurvePoints] = useState([]);
  const [pointsError, setPointsError] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);


  const formatBig = (v, digits = 18) => {
    if (v === undefined || v === null) return '';
    const s = String(v);
    return s.length > digits ? `${s.slice(0, digits)}…` : s;
  };


  const handleCurveFileSelected = (file) => {
    if (!file) return;
    setCurveFileError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = JSON.parse(text);

        const required = ['a', 'b', 'p', 'Gx', 'Gy', 'n'];
        for (const key of required) {
          if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
            throw new Error('Curve file must contain fields: a, b, p, Gx, Gy, n.');
          }
        }

        setCurveParams({
          ...curveParams,
          a: String(parsed.a),
          b: String(parsed.b),
          p: String(parsed.p),
          Gx: String(parsed.Gx),
          Gy: String(parsed.Gy),
          n: String(parsed.n),
        });
        setCurveFileError('');
      } catch (err) {
        console.error(err);
        setCurveFileError('Invalid curve file. Expected JSON with a, b, p, Gx, Gy, n.');
      }
    };
    reader.onerror = () => {
      setCurveFileError('Failed to read curve file.');
    };
    reader.readAsText(file);
  };



  const handleExportCurve = () => {
    try {
      const { a, b, p, Gx, Gy, n } = curveParams || {};

      if (!a || !b || !p || !Gx || !Gy || !n) {
        setCurveFileError('Fill in the curve fields before exporting.');
        return;
      }

      const payload = { a, b, p, Gx, Gy, n };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'curve-params.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setCurveFileError('');
    } catch (err) {
      console.error(err);
      setCurveFileError('Could not export curve parameters.');
    }
  };
  const handleGeneratePoints = () => {
    setPointsError('');
    setCurvePoints([]);

    const parseIntSafe = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        throw new Error('Curve parameters must be integers.');
      }
      return n;
    };

    try {
      const a = parseIntSafe(curveParams.a);
      const b = parseIntSafe(curveParams.b);
      const p = parseIntSafe(curveParams.p);

      if (p <= 0) {
        throw new Error('p must be a positive integer.');
      }
      if (p > 500) {
        throw new Error('p is too large to list all points. Use a small test prime (≤ 500) to view points.');
      }

      const mod = (n, m) => {
        return ((n % m) + m) % m;
      };

      setPointsLoading(true);
      const pts = [];
      for (let x = 0; x < p; x++) {
        const x2 = mod(x * x, p);
        const x3 = mod(x2 * x, p);
        let rhs = mod(x3 + a * x + b, p);
        for (let y = 0; y < p; y++) {
          const lhs = mod(y * y, p);
          if (lhs === rhs) {
            pts.push({ x, y });
          }
        }
      }
      setCurvePoints(pts);
    } catch (err) {
      setPointsError(err.message || 'Failed to generate curve points.');
    } finally {
      setPointsLoading(false);
    }
  };

  return (
    <section className="section-card step-card mb-6">
      <div className="section-card-inner">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="step-chip">
              <span>1. Define Elliptic Curve</span>
            </div>
            <h2 className="step-title">Set Curve Parameters</h2>
            <p className="step-subtitle">
              Choose a standard curve or customize a, b and p. Changing parameters resets keys.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCurveConfig(!showCurveConfig)}
              className="btn-chip"
            >
              {showCurveConfig ? 'Hide details' : 'Show details'}
            </button>
            <button
              onClick={() => setShowPoints(!showPoints)}
              className="btn-chip"
            >
              {showPoints ? 'Hide points' : 'Curve points'}
            </button>
          </div>
        </div>

        {showCurveConfig && (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => loadStandardCurve('secp256k1')}
                className="btn-chip"
              >
                Load secp256k1
              </button>
              <button
                onClick={() => loadStandardCurve('secp256r1')}
                className="btn-chip"
              >
                Load secp256r1
              </button>
              <button
                onClick={generateRandomCurve}
                className="btn-chip"
              >
                Random test curve
              </button>
              <label className="btn-chip cursor-pointer">
                Import curve
                <input
                  type="file"
                  accept=".json,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) {
                      handleCurveFileSelected(f);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-chip"
                onClick={handleExportCurve}
              >
                Export curve
              </button>
            </div>

            {curveFileError && (
              <p className="text-xs text-red-400 mb-2">
                {curveFileError}
              </p>
            )}

            <div className="split-layout mb-4">
              <div className="field-card" style={{ boxShadow: 'none', marginTop: '0.65rem' }}>
                <div className="field-card-header">
                  <span className="field-label">Curve Equation</span>
                </div>
                <p className="field-description">
                  y² = x³ + a·x + b (mod p). All keys &amp; points live on this curve.
                </p>
                <p className="text-xs">
                  Current: y² = x³ + {curveParams.a}x + {curveParams.b} (mod {formatBig(curveParams.p)})
                </p>
              </div>

              <div className="field-card" style={{ boxShadow: 'none', marginTop: '0.65rem' }}>
                <div className="field-card-header">
                  <span className="field-label">Generator &amp; Order</span>
                </div>
                <p className="field-description">
                  G = (Gx, Gy) is the base point. n is the order of the subgroup generated by G.
                </p>
                <p className="text-xs">
                  Gx: {formatBig(curveParams.Gx)}
                  <br />
                  Gy: {formatBig(curveParams.Gy)}
                </p>
              </div>
            </div>

            <div className="split-layout mb-4">
              <div className="field-card" style={{ boxShadow: 'none', marginTop: '0.65rem' }}>
                <label className="field-label">a (coefficient)</label>
                <input
                  type="text"
                  value={curveParams.a}
                  onChange={(e) =>
                    setCurveParams({ ...curveParams, a: e.target.value })
                  }
                />
              </div>

              <div className="field-card" style={{ boxShadow: 'none', marginTop: '0.65rem' }}>
                <label className="field-label">b (coefficient)</label>
                <input
                  type="text"
                  value={curveParams.b}
                  onChange={(e) =>
                    setCurveParams({ ...curveParams, b: e.target.value })
                  }
                />
              </div>

              <div className="field-card" style={{ boxShadow: 'none', marginTop: '0.65rem' }}>
                <label className="field-label">p (prime modulus)</label>
                <input
                  type="text"
                  value={curveParams.p}
                  onChange={(e) =>
                    setCurveParams({ ...curveParams, p: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="split-layout mb-4">
              <div className="field-card" style={{ boxShadow: 'none', marginTop: '0.65rem' }}>
                <label className="field-label">Generator Gx</label>
                <input
                  type="text"
                  value={curveParams.Gx}
                  onChange={(e) =>
                    setCurveParams({ ...curveParams, Gx: e.target.value })
                  }
                />
              </div>

              <div className="field-card" style={{ boxShadow: 'none', marginTop: '0.65rem' }}>
                <label className="field-label">Generator Gy</label>
                <input
                  type="text"
                  value={curveParams.Gy}
                  onChange={(e) =>
                    setCurveParams({ ...curveParams, Gy: e.target.value })
                  }
                />
              </div>

              <div className="field-card" style={{ boxShadow: 'none', marginTop: '0.65rem' }}>
                <label className="field-label">Order n</label>
                <input
                  type="text"
                  value={curveParams.n}
                  onChange={(e) =>
                    setCurveParams({ ...curveParams, n: e.target.value })
                  }
                />
              </div>
            </div>


            




            <button
              onClick={validateAndLoadCurve}
              className="btn-primary"
            >
              Apply Curve Parameters
            </button>

            {curveError && (
              <div className="error-box">
                <AlertCircle className="w-4 h-4" />
                <p>{curveError}</p>
              </div>
            )}
          </>
        )}

        {showPoints && (
          <div className="field-card" style={{ marginTop: showCurveConfig ? '1rem' : '0.5rem' }}>
            <div className="field-card-header">
              <span className="field-label">Curve points modulo p</span>
              <span className="text-xs text-purple-400">
                For small primes only (p ≤ 500)
              </span>
            </div>
            <p className="field-description">
              Computes all (x, y) such that y² ≡ x³ + a·x + b (mod p). This is for visualization and can be slow for large p.
            </p>
            <button
              onClick={handleGeneratePoints}
              className="btn-primary"
              style={{ maxWidth: '260px', marginTop: '0.3rem' }}
            >
              {pointsLoading ? 'Generating points…' : 'Generate curve points'}
            </button>

            {pointsError && (
              <div className="error-box">
                <AlertCircle className="w-4 h-4" />
                <p>{pointsError}</p>
              </div>
            )}

            {curvePoints.length > 0 && !pointsError && (
              <div
                style={{
                  marginTop: '0.9rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  background: '#0f172a',
                  borderRadius: '0.95rem',
                  padding: '0.9rem 1rem',
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: '0.86rem',
                  color: '#e5e7eb'
                }}
              >
                <div
                  style={{
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: '#93c5fd'
                  }}
                >
                  Found {curvePoints.length} points (excluding point at infinity)
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.2rem 0.9rem',
                  }}
                >
                  {curvePoints.map((pt, idx) => (
                    <span key={idx} style={{ minWidth: '90px' }}>
                      ({pt.x}, {pt.y})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showCurveConfig && curveHistory && curveHistory.length > 0 && (
          <div className="history-section" style={{ marginTop: '1.5rem' }}>
            <div className="field-card">
              <div className="field-card-header">
                <span className="field-label">Recently used curves</span>
              </div>
              <p className="field-description">
                Last few curves you validated or generated. Newest one is highlighted.
              </p>
              <ul className="history-list">
                {curveHistory.slice(0, 5).map((item, idx) => (
                  <li
                    key={item.id || idx}
                    className={
                      'history-item' + (idx === 0 ? ' history-item--latest' : '')
                    }
                  >
                    <div className="history-item-header">
                      <div className="history-badge">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="history-title">
                          {item.label || `Curve #${curveHistory.length - idx}`}
                        </div>
                        <div className="history-meta">
                          {item.source === 'standard' && 'Standard curve'}
                          {item.source === 'random' && 'Random demo curve'}
                          {item.source === 'custom' && 'Custom curve'}
                          {item.source && ' · '}
                          {item.timestamp && new Date(item.timestamp).toLocaleString()}
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
                      <div style={{ marginTop: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn-chip"
                          style={{ paddingInline: '0.9rem', fontSize: '0.86rem' }}
                          onClick={() => onReuseCurve && onReuseCurve(item.params)}
                        >
                          Reuse this curve
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {customCurve && !curveError && (
          <div className="info-note">
            ✓ Curve validated successfully. Key generation &amp; ECIES will use these parameters.
          </div>
        )}
      </div>
    </section>
  );
};

export default CurveConfigPanel;
