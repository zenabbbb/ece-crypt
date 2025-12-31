import React, { useEffect, useMemo, useState } from 'react';

function buildPath(pts, xScale, yScale) {
  if (!pts.length) return '';
  return pts
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${xScale(pt.x)} ${yScale(pt.y)}`)
    .join(' ');
}

function getNiceTicks(min, max, targetCount = 8) {
  const span = max - min;
  if (!isFinite(span) || span <= 0) {
    return [];
  }
  const roughStep = span / targetCount;
  const pow10 = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep))));
  const normalized = roughStep / pow10;
  let step;
  if (normalized < 1.5) step = 1 * pow10;
  else if (normalized < 3) step = 2 * pow10;
  else if (normalized < 7) step = 5 * pow10;
  else step = 10 * pow10;

  const first = Math.ceil(min / step) * step;
  const last = Math.floor(max / step) * step;
  const ticks = [];
  for (let v = first; v <= last + step * 0.5; v += step) {
    const fixed = parseFloat(v.toFixed(8));
    ticks.push(fixed);
  }
  return ticks;
}

// Pretty formatting for tick labels
function formatTick(v) {
  if (Math.abs(v) < 1e-4) return '0';
  if (Math.abs(v) < 10)
    return v
      .toFixed(2)
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1');
  if (Math.abs(v) < 100) return v.toFixed(1).replace(/\.0$/, '');
  return v.toFixed(0);
}

const GraphVisualizationTab = ({ curveParams }) => {
  // editable a, b, p
  const [aInput, setAInput] = useState(
    curveParams?.a !== undefined ? String(curveParams.a) : '0'
  );
  const [bInput, setBInput] = useState(
    curveParams?.b !== undefined ? String(curveParams.b) : '0'
  );
  const [pInput, setPInput] = useState(
    curveParams?.p !== undefined ? String(curveParams.p) : '17'
  );

  // keep in sync if parent changes curveParams
  useEffect(() => {
    if (curveParams?.a !== undefined) setAInput(String(curveParams.a));
    if (curveParams?.b !== undefined) setBInput(String(curveParams.b));
    if (curveParams?.p !== undefined) setPInput(String(curveParams.p));
  }, [curveParams?.a, curveParams?.b, curveParams?.p]);

  // defaults for ranges
  const [xMinInput, setXMinInput] = useState('-10');
  const [xMaxInput, setXMaxInput] = useState('10');
  const [yMinInput, setYMinInput] = useState('-10');
  const [yMaxInput, setYMaxInput] = useState('10');
  const [nPointsInput, setNPointsInput] = useState('50');

  const xMin = (() => {
    const v = parseFloat(xMinInput);
    return Number.isFinite(v) ? v : -10;
  })();
  const xMax = (() => {
    const v = parseFloat(xMaxInput);
    return Number.isFinite(v) ? v : 10;
  })();
  const yMin = (() => {
    const v = parseFloat(yMinInput);
    return Number.isFinite(v) ? v : -10;
  })();
  const yMax = (() => {
    const v = parseFloat(yMaxInput);
    return Number.isFinite(v) ? v : 10;
  })();
  const maxFinitePoints = (() => {
    const n = parseInt(nPointsInput, 10);
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(n, 2000);
  })();

  const {
    segmentsPos,
    segmentsNeg,
    xDomain,
    yDomain,
    error,
    xTicks,
    yTicks,
    gapRegions,
    ffPoints,
    ffError,
    ffXDomain,
    ffYDomain,
    ffXTicks,
    ffYTicks,
  } = useMemo(() => {
    const parsedA = parseFloat(aInput || '0');
    const parsedB = parseFloat(bInput || '0');

    // --- real-valued curve ---
    let segmentsPos = [];
    let segmentsNeg = [];
    let xDomain = [0, 1];
    let yDomain = [-1, 1];
    let error = '';
    let xTicks = [];
    let yTicks = [];
    let gapRegions = [];

    if (!Number.isFinite(parsedA) || !Number.isFinite(parsedB)) {
      error =
        'Curve parameters are too large or not numeric to visualize. Try a custom curve with smaller a and b values.';
    } else if (Math.abs(parsedA) > 1e6 || Math.abs(parsedB) > 1e6) {
      error =
        'Curve parameters are extremely large. For visualization, please use a smaller toy curve (for example with p ≤ 500).';
    } else {
      // user controls sampling x-range
      const minX = Math.min(xMin, xMax);
      const maxX = Math.max(xMin, xMax);
      const steps = 1000;
      const dx = (maxX - minX) / steps || 1;

      const segPosAcc = [];
      const segNegAcc = [];
      const gaps = [];
      let currentPos = [];
      let currentNeg = [];
      let inGap = false;
      let gapStart = null;
      const allY = [];

      const EPS = 1e-10;

      for (let i = 0; i <= steps; i++) {
        const x = minX + dx * i;
        let rhs = x * x * x + parsedA * x + parsedB;

        if (!Number.isFinite(rhs)) continue;

        // Avoid tiny negative noise at y ≈ 0
        if (rhs < 0 && rhs > -EPS) {
          rhs = 0;
        }

        if (rhs >= 0) {
          // We have real solutions here
          if (inGap && gapStart !== null) {
            // We're exiting a gap
            gaps.push({ start: gapStart, end: x });
            inGap = false;
            gapStart = null;
          }

          const y = Math.sqrt(rhs);
          if (Number.isFinite(y)) {
            currentPos.push({ x, y });
            currentNeg.push({ x, y: -y });
            allY.push(y, -y);
          }
        } else {
          // No real solutions (inside a gap)
          if (!inGap) {
            // Entering a new gap
            gapStart = x;
            inGap = true;
          }

          // Save current segments before breaking them
          if (currentPos.length > 1) segPosAcc.push(currentPos);
          if (currentNeg.length > 1) segNegAcc.push(currentNeg);
          currentPos = [];
          currentNeg = [];
        }
      }

      const minXFinal = Math.min(xMin, xMax);
      const maxXFinal = Math.max(xMin, xMax);
      const minYFinal = Math.min(yMin, yMax);
      const maxYFinal = Math.max(yMin, yMax);

      if (inGap && gapStart !== null) {
        gaps.push({ start: gapStart, end: maxXFinal });
      }

      // Save final segments
      if (currentPos.length > 1) segPosAcc.push(currentPos);
      if (currentNeg.length > 1) segNegAcc.push(currentNeg);

      if (!allY.length) {
        error =
          'No real points for y² = x³ + ax + b in this x-range. Try widening the range or choosing different curve parameters.';
        xDomain = [minXFinal, maxXFinal];
        yDomain = [minYFinal, maxYFinal];
        xTicks = getNiceTicks(minXFinal, maxXFinal);
        yTicks = getNiceTicks(minYFinal, maxYFinal);
        gapRegions = gaps;
      } else {
        // Use xMin/xMax and yMin/yMax directly as the visible window
        xDomain = [minXFinal, maxXFinal];
        yDomain = [minYFinal, maxYFinal];

        xTicks = getNiceTicks(minXFinal, maxXFinal);
        yTicks = getNiceTicks(minYFinal, maxYFinal);
        gapRegions = gaps;
        segmentsPos = segPosAcc;
        segmentsNeg = segNegAcc;
      }
    }

    // --- finite-field points (mod p) ---
    let ffPoints = [];
    let ffError = '';
    let ffXDomain = [0, 1];
    let ffYDomain = [0, 1];
    let ffXTicks = [];
    let ffYTicks = [];

    try {
      const parseIntSafe = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
          throw new Error(
            'Finite-field plot requires integer a, b and p values.'
          );
        }
        return n;
      };

      const aInt = parseIntSafe(aInput || '0');
      const bInt = parseIntSafe(bInput || '0');
      const pInt = parseIntSafe(pInput || '0');

      if (pInt <= 1) {
        throw new Error('p must be greater than 1 to compute finite-field points.');
      }
      if (pInt > 500) {
        throw new Error(
          'p is too large to visualize all finite-field points here (max 500). Use a smaller toy prime.'
        );
      }

      const mod = (n, m) => ((n % m) + m) % m;
      const allPts = [];
      for (let x = 0; x < pInt; x++) {
        const x2 = mod(x * x, pInt);
        const x3 = mod(x2 * x, pInt);
        const rhs = mod(x3 + aInt * x + bInt, pInt);
        for (let y = 0; y < pInt; y++) {
          const lhs = mod(y * y, pInt);
          if (lhs === rhs) {
            allPts.push({ x, y });
          }
        }
      }

      ffPoints = allPts.slice(0, maxFinitePoints);

      ffXDomain = [-0.5, pInt - 0.5];
      ffYDomain = [-0.5, pInt - 0.5];
      ffXTicks = getNiceTicks(ffXDomain[0], ffXDomain[1]);
      ffYTicks = getNiceTicks(ffYDomain[0], ffYDomain[1]);
    } catch (e) {
      console.error(e);
      ffError = 'p is too large to visualize all finite-field points here (max 500). Use a smaller toy prime, and a simple graph.';
    }

    return {
      segmentsPos,
      segmentsNeg,
      xDomain,
      yDomain,
      error,
      xTicks,
      yTicks,
      gapRegions,
      ffPoints,
      ffError,
      ffXDomain,
      ffYDomain,
      ffXTicks,
      ffYTicks,
    };
  }, [aInput, bInput, pInput, xMin, xMax, yMin, yMax, maxFinitePoints]);

  // viewBox is square; scale comes from domains
  const width = 520;
  const height = 520;
  const padding = 50;

  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;

  const xScale = (x) =>
    padding + ((x - x0) / (x1 - x0 || 1)) * (width - 2 * padding);
  const yScale = (y) =>
    height - padding - ((y - y0) / (y1 - y0 || 1)) * (height - 2 * padding);

  const xAxisY =
    0 >= y0 && 0 <= y1 ? yScale(0) : yScale(Math.max(Math.min(0, y1), y0));
  const yAxisX =
    0 >= x0 && 0 <= x1 ? xScale(0) : xScale(Math.max(Math.min(0, x1), x0));

  // finite-field scales
  const [fx0, fx1] = ffXDomain;
  const [fy0, fy1] = ffYDomain;
  const ffXScale = (x) =>
    padding + ((x - fx0) / (fx1 - fx0 || 1)) * (width - 2 * padding);
  const ffYScale = (y) =>
    height - padding - ((y - fy0) / (fy1 - fy0 || 1)) * (height - 2 * padding);

  const ffXAxisY =
    0 >= fy0 && 0 <= fy1 ? ffYScale(0) : ffYScale(Math.max(Math.min(0, fy1), fy0));
  const ffYAxisX =
    0 >= fx0 && 0 <= fx1 ? ffXScale(0) : ffXScale(Math.max(Math.min(0, fx1), fx0));

  const aText = aInput || '0';
  const bText = bInput || '0';
  const equationPreview = `y² = x³ + (${aText})x + (${bText})`;

  return (
    <section className="section-card">
      <h2 className="section-title">Graph Visualization</h2>
      <p className="field-description" style={{ marginBottom: '0.82rem' }}>
        This is a real-valued plot of the current curve of the form{' '}
        <code>y² = x³ + ax + b</code> on the left, and a finite-field view of
        the first N points mod <code>p</code> on the right. Both views ignore
        group-law operations and are meant for visualization and intuition only.
        {gapRegions && gapRegions.length > 0 && (
          <span
            style={{
              display: 'block',
              marginTop: '0.5rem',
              fontStyle: 'italic',
              color: '#dc2626',
            }}
          >
             Shaded red regions in the real-valued view indicate where x³ + ax
            + b &lt; 0 (no real solutions exist).
          </span>
        )}
      </p>

      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 280px', maxWidth: '360px' }}>
          {/* Equation only (no name) */}
          <div className="field-label">Current curve</div>
          <div
            className="field-description"
            style={{
              marginTop: '0.25rem',
              fontFamily: 'monospace',
              fontWeight: 500,
            }}
          >
            {equationPreview}
          </div>

          {/* a, b, p controls */}
          <div
            style={{
              display: 'flex',
              gap: '0.82rem',
              marginTop: '0.82rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 80px' }}>
              <label className="field-label" htmlFor="curveA">
                a
              </label>
              <input
                id="curveA"
                type="number"
                className="input"
                value={aInput}
                onChange={(e) => setAInput(e.target.value)}
              />
            </div>
            <div style={{ flex: '1 1 80px' }}>
              <label className="field-label" htmlFor="curveB">
                b
              </label>
              <input
                id="curveB"
                type="number"
                className="input"
                value={bInput}
                onChange={(e) => setBInput(e.target.value)}
              />
            </div>
            <div style={{ flex: '1 1 80px' }}>
              <label className="field-label" htmlFor="curveP">
                p (mod)
              </label>
              <input
                id="curveP"
                type="number"
                className="input"
                value={pInput}
                onChange={(e) => setPInput(e.target.value)}
              />
            </div>
          </div>

          {/* x-min / x-max controls */}
          <div
            style={{
              display: 'flex',
              gap: '0.82rem',
              marginTop: '0.82rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 120px' }}>
              <label className="field-label" htmlFor="xMin">
                x-min (zoom)
              </label>
              <input
                id="xMin"
                type="number"
                className="input"
                value={xMinInput}
                onChange={(e) => setXMinInput(e.target.value)}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label className="field-label" htmlFor="xMax">
                x-max (zoom)
              </label>
              <input
                id="xMax"
                type="number"
                className="input"
                value={xMaxInput}
                onChange={(e) => setXMaxInput(e.target.value)}
              />
            </div>
          </div>

          {/* y-min / y-max controls */}
          <div
            style={{
              display: 'flex',
              gap: '0.82rem',
              marginTop: '0.82rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 120px' }}>
              <label className="field-label" htmlFor="yMin">
                y-min (zoom)
              </label>
              <input
                id="yMin"
                type="number"
                className="input"
                value={yMinInput}
                onChange={(e) => setYMinInput(e.target.value)}
              />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label className="field-label" htmlFor="yMax">
                y-max (zoom)
              </label>
              <input
                id="yMax"
                type="number"
                className="input"
                value={yMaxInput}
                onChange={(e) => setYMaxInput(e.target.value)}
              />
            </div>
          </div>

          {/* N points */}
          <div
            style={{
              display: 'flex',
              gap: '0.82rem',
              marginTop: '0.82rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 120px' }}>
              <label className="field-label" htmlFor="nPoints">
                Finite-field points (N)
              </label>
              <input
                id="nPoints"
                type="number"
                className="input"
                value={nPointsInput}
                onChange={(e) => setNPointsInput(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p
              className="field-description"
              style={{ marginTop: '0.82rem', color: '#b91c1c' }}
            >
              {error}
            </p>
          )}

          {ffError && (
            <p
              className="field-description"
              style={{ marginTop: '0.82rem', color: '#b91c1c' }}
            >
              {ffError}
            </p>
          )}

          {gapRegions && gapRegions.length > 0 && (
            <p
              style={{
                marginTop: '0.5rem',
                fontSize: '0.82rem',
                color: '#666',
              }}
            >
              Gaps detected:{' '}
              {gapRegions
                .map(
                  (g) =>
                    `[${g.start.toFixed(2)}, ${g.end.toFixed(2)}]`
                )
                .join(', ')}
            </p>
          )}
        </div>

        <div
          style={{
            flex: '2 1 480px',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Real-valued curve view */}
          <div
            style={{
              flex: '1 1 320px',
              borderRadius: '0.82rem',
              border: '1px solid #e5e7eb',
              padding: '0.82rem',
              background: '#fafafa',
            }}
          >
            <div className="field-label" style={{ marginBottom: '0.25rem' }}>
              Real-valued curve
            </div>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: '320px' }}
            >
              {/* Shaded gap regions - draw first */}
              {gapRegions &&
                gapRegions.map((gap, idx) => {
                  const rectX = xScale(gap.start);
                  const rectWidth = xScale(gap.end) - xScale(gap.start);
                  return (
                    <rect
                      key={`gap-${idx}`}
                      x={rectX}
                      y={padding}
                      width={rectWidth}
                      height={height - 2 * padding}
                      fill="#ef4444"
                      fillOpacity="0.15"
                      stroke="#dc2626"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                  );
                })}

              {/* Grid lines */}
              {xTicks.map((tx) => (
                <line
                  key={`vx-${tx}`}
                  x1={xScale(tx)}
                  y1={padding}
                  x2={xScale(tx)}
                  y2={height - padding}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}
              {yTicks.map((ty) => (
                <line
                  key={`hz-${ty}`}
                  x1={padding}
                  y1={yScale(ty)}
                  x2={width - padding}
                  y2={yScale(ty)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}

              {/* X-axis tick labels */}
              {xTicks.map((tx) => (
                <text
                  key={`xt-${tx}`}
                  x={xScale(tx)}
                  y={height - padding + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#000000"
                >
                  {formatTick(tx)}
                </text>
              ))}

              {/* Y-axis tick labels */}
              {yTicks.map((ty) => (
                <text
                  key={`yt-${ty}`}
                  x={padding - 8}
                  y={yScale(ty) + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#000000"
                >
                  {formatTick(ty)}
                </text>
              ))}

              {/* Axes */}
              <line
                x1={padding}
                y1={xAxisY}
                x2={width - padding}
                y2={xAxisY}
                stroke="#000000"
                strokeWidth="1.5"
              />
              <line
                x1={yAxisX}
                y1={padding}
                x2={yAxisX}
                y2={height - padding}
                stroke="#000000"
                strokeWidth="1.5"
              />

              {/* Curve paths */}
              {segmentsPos.map((seg, idx) => (
                <path
                  key={`pos-${idx}`}
                  d={buildPath(seg, xScale, yScale)}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2"
                />
              ))}
              {segmentsNeg.map((seg, idx) => (
                <path
                  key={`neg-${idx}`}
                  d={buildPath(seg, xScale, yScale)}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>

          {/* Finite-field points view */}
          <div
            style={{
              flex: '1 1 320px',
              borderRadius: '0.82rem',
              border: '1px solid #e5e7eb',
              padding: '0.82rem',
              background: '#fafafa',
            }}
          >
            <div className="field-label" style={{ marginBottom: '0.25rem' }}>
              Finite-field points (mod p)
            </div>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: '320px' }}
            >
              {/* Grid lines */}
              {ffXTicks.map((tx) => (
                <line
                  key={`ff-vx-${tx}`}
                  x1={ffXScale(tx)}
                  y1={padding}
                  x2={ffXScale(tx)}
                  y2={height - padding}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}
              {ffYTicks.map((ty) => (
                <line
                  key={`ff-hz-${ty}`}
                  x1={padding}
                  y1={ffYScale(ty)}
                  x2={width - padding}
                  y2={ffYScale(ty)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}

              {/* X-axis tick labels */}
              {ffXTicks.map((tx) => (
                <text
                  key={`ff-xt-${tx}`}
                  x={ffXScale(tx)}
                  y={height - padding + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#000000"
                >
                  {formatTick(tx)}
                </text>
              ))}

              {/* Y-axis tick labels */}
              {ffYTicks.map((ty) => (
                <text
                  key={`ff-yt-${ty}`}
                  x={padding - 8}
                  y={ffYScale(ty) + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#000000"
                >
                  {formatTick(ty)}
                </text>
              ))}

              {/* Axes */}
              <line
                x1={padding}
                y1={ffXAxisY}
                x2={width - padding}
                y2={ffXAxisY}
                stroke="#000000"
                strokeWidth="1.5"
              />
              <line
                x1={ffYAxisX}
                y1={padding}
                x2={ffYAxisX}
                y2={height - padding}
                stroke="#000000"
                strokeWidth="1.5"
              />

              {/* Finite-field points */}
              {ffPoints.map((pt, idx) => (
                <circle
                  key={`pt-${idx}`}
                  cx={ffXScale(pt.x)}
                  cy={ffYScale(pt.y)}
                  r={3}
                  fill="#4f46e5"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GraphVisualizationTab;
