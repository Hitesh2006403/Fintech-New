import React, { useState, useMemo, useRef, useEffect } from 'react';
import { formatINR } from '../../services/financialEngine.js';

/**
 * Converts a series of coordinates into a smooth Catmull-Rom cubic bezier SVG spline path.
 */
function createSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return d;
}

export function CashFlowChart({
  forecastData = [],
  safetyBuffer = 25000,
  startingBalance = 0,
  height = 280,
  showControls = true,
  timeRange = 30,
  onRangeChange = null
}) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);

  // Memoize scales, coordinates and SVG paths
  const metrics = useMemo(() => {
    if (!Array.isArray(forecastData) || forecastData.length === 0) return null;

    const balances = forecastData.map(d => {
      const v = Number(d?.closingBalance !== undefined ? d.closingBalance : (d?.balance !== undefined ? d.balance : 0));
      return isNaN(v) ? 0 : v;
    });

    const numSafetyBuffer = Number(safetyBuffer || 0);
    const numStartingBalance = Number(startingBalance || 0);

    const minBal = Math.min(0, ...balances, numSafetyBuffer);
    const maxBal = Math.max(numStartingBalance * 1.2, ...balances, numSafetyBuffer * 1.35, 50000);

    const range = (maxBal - minBal) > 0 ? (maxBal - minBal) : 1;
    const paddingY = 32;
    const chartHeight = Math.max(80, height - paddingY * 2);
    const chartWidth = 760;
    const paddingX = 40;
    const usableWidth = chartWidth - paddingX * 2;

    const getX = (index) => paddingX + (index / (forecastData.length - 1 || 1)) * usableWidth;
    const getY = (val) => {
      const num = Number(val !== undefined && val !== null ? val : 0);
      const safeVal = isNaN(num) ? 0 : num;
      return paddingY + chartHeight - ((safeVal - minBal) / range) * chartHeight;
    };

    const yZero = getY(0);
    const yBuffer = getY(numSafetyBuffer);

    const pointCoords = forecastData.map((d, i) => {
      const val = d?.closingBalance !== undefined ? d.closingBalance : d?.balance;
      return { x: getX(i), y: getY(val) };
    });

    const splineLinePath = createSplinePath(pointCoords);
    const lastX = getX(forecastData.length - 1);
    const firstX = getX(0);
    const bottomY = getY(minBal);
    const splineAreaPath = `${splineLinePath} L ${lastX.toFixed(2)},${bottomY.toFixed(2)} L ${firstX.toFixed(2)},${bottomY.toFixed(2)} Z`;

    return {
      minBal,
      maxBal,
      paddingY,
      chartHeight,
      chartWidth,
      paddingX,
      usableWidth,
      getX,
      getY,
      yZero,
      yBuffer,
      pointCoords,
      splineLinePath,
      splineAreaPath,
      numSafetyBuffer
    };
  }, [forecastData, safetyBuffer, startingBalance, height]);

  // Compute SVG total length for self-drawing animation
  useEffect(() => {
    if (pathRef.current) {
      try {
        const len = pathRef.current.getTotalLength();
        setPathLength(len || 2000);
      } catch (e) {
        setPathLength(2000);
      }
    }
  }, [metrics?.splineLinePath]);

  if (!Array.isArray(forecastData) || forecastData.length === 0 || !metrics) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748B',
        background: 'rgba(255, 255, 255, 0.65)',
        borderRadius: 16,
        border: '1px solid rgba(226, 232, 240, 0.8)',
        backdropFilter: 'blur(12px)',
        fontWeight: 500,
        fontSize: 13
      }}>
        No forecast data points available to plot.
      </div>
    );
  }

  const {
    minBal,
    paddingY,
    chartHeight,
    chartWidth,
    paddingX,
    usableWidth,
    getX,
    getY,
    yZero,
    yBuffer,
    splineLinePath,
    splineAreaPath,
    numSafetyBuffer
  } = metrics;

  // Active hover point details
  const activeIdx = hoverIndex !== null && forecastData[hoverIndex]
    ? hoverIndex
    : Math.floor(forecastData.length / 2);
  const activePoint = forecastData[activeIdx] || forecastData[0];
  const activeVal = activePoint ? (activePoint.closingBalance !== undefined ? activePoint.closingBalance : activePoint.balance) : 0;
  const activeX = getX(activeIdx);
  const activeY = getY(activeVal);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      
      {/* Top Chart Header / Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: '#10B981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.45)' }}></span>
            <span>Projected Balance</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#D97706' }}>
            <span style={{ width: 14, height: 2, borderTop: '2px dashed #D97706' }}></span>
            <span>Safety Buffer ({formatINR(numSafetyBuffer)})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#059669' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)' }}></span>
            <span>Inflow</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#E11D48' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)' }}></span>
            <span>Outflow</span>
          </div>
        </div>

        {showControls && onRangeChange && (
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            padding: 3,
            borderRadius: 10,
            gap: 4,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
          }}>
            {[7, 14, 30, 60].map(r => {
              const isActive = timeRange === r;
              return (
                <button
                  key={r}
                  type="button"
                  style={{
                    border: 'none',
                    background: isActive ? '#059669' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#475569',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: 11.5,
                    padding: '4px 10px',
                    borderRadius: 7,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 2px 6px rgba(5, 150, 105, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => onRangeChange(r)}
                >
                  {r}D
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SVG Chart Graphic - Fluid Responsive Scaling */}
      <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Soft vertical emerald gradient fill (rgba(16, 185, 129, 0.22) to 0.02) */}
            <linearGradient id="emeraldSplineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
              <stop offset="65%" stopColor="#10B981" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id="deficitAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.03" />
            </linearGradient>

            <style>{`
              @keyframes drawSpline {
                from { stroke-dashoffset: ${pathLength || 2000}; }
                to { stroke-dashoffset: 0; }
              }
              .self-drawing-spline {
                stroke-dasharray: ${pathLength || 2000};
                animation: drawSpline 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              @media (prefers-reduced-motion: reduce) {
                .self-drawing-spline {
                  animation: none !important;
                  stroke-dashoffset: 0 !important;
                }
              }
            `}</style>
          </defs>

          {/* Horizontal Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(203, 213, 225, 0.7)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={paddingX} y1={paddingY + chartHeight * 0.5} x2={chartWidth - paddingX} y2={paddingY + chartHeight * 0.5} stroke="rgba(203, 213, 225, 0.7)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={paddingX} y1={paddingY + chartHeight} x2={chartWidth - paddingX} y2={paddingY + chartHeight} stroke="rgba(148, 163, 184, 0.8)" strokeWidth="1.2" />

          {/* Zero Balance Line (if within range) */}
          {minBal < 0 && (
            <g>
              <line
                x1={paddingX}
                y1={yZero}
                x2={chartWidth - paddingX}
                y2={yZero}
                stroke="#E11D48"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x={chartWidth - paddingX - 4} y={yZero + 4} fill="#BE123C" fontSize="10" fontWeight="700" textAnchor="end">
                ₹0 Deficit
              </text>
            </g>
          )}

          {/* Safety Buffer Reference Line */}
          <g>
            <line
              x1={paddingX}
              y1={yBuffer}
              x2={chartWidth - paddingX}
              y2={yBuffer}
              stroke="#D97706"
              strokeWidth="1.75"
              strokeDasharray="5 4"
            />
            <text x={chartWidth - paddingX - 4} y={yBuffer - 5} fill="#B45309" fontSize="10.5" fontWeight="700" textAnchor="end">
              Buffer ({formatINR(numSafetyBuffer)})
            </text>
          </g>

          {/* Shaded Area Under Spline Curve */}
          <path d={splineAreaPath} fill="url(#emeraldSplineGrad)" />

          {/* Self-Drawing Emerald Spline Curve (2.5px stroke, #10B981) */}
          <path
            ref={pathRef}
            className="self-drawing-spline"
            d={splineLinePath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.4))' }}
          />

          {/* Day Points Along Curve */}
          {forecastData.map((d, i) => {
            const val = d?.closingBalance !== undefined ? d.closingBalance : d?.balance;
            const cx = getX(i);
            const cy = getY(val);
            const isHovered = activeIdx === i;

            return (
              <circle
                key={`pt-${i}`}
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : 2}
                fill={isHovered ? '#059669' : '#10B981'}
                stroke="#FFFFFF"
                strokeWidth={isHovered ? 2.5 : 1}
              />
            );
          })}

          {/* Event Markers on Curve (Incomes and Expenses) */}
          {forecastData.map((d, i) => {
            const hasIncome = Array.isArray(d.incomes) && d.incomes.length > 0;
            const hasExpense = Array.isArray(d.expenses) && d.expenses.length > 0;
            const val = d?.closingBalance !== undefined ? d.closingBalance : d?.balance;
            const cx = getX(i);
            const cy = getY(val);

            if (!hasIncome && !hasExpense) return null;

            return (
              <g key={`marker-${i}`}>
                {hasIncome && (
                  <circle cx={cx} cy={cy} r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                )}
                {hasExpense && !hasIncome && (
                  <circle cx={cx} cy={cy} r="4.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                )}
              </g>
            );
          })}

          {/* Interactive Crosshair Tooltip Guidelines */}
          {hoverIndex !== null && (
            <g>
              {/* Vertical guideline */}
              <line
                x1={activeX}
                y1={paddingY}
                x2={activeX}
                y2={paddingY + chartHeight}
                stroke="rgba(16, 185, 129, 0.45)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Horizontal guideline */}
              <line
                x1={paddingX}
                y1={activeY}
                x2={chartWidth - paddingX}
                y2={activeY}
                stroke="rgba(16, 185, 129, 0.25)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Center point ring */}
              <circle cx={activeX} cy={activeY} r="7.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
            </g>
          )}

          {/* Transparent interactive hover trigger zones */}
          {forecastData.map((d, i) => {
            const stepWidth = (usableWidth || (chartWidth - paddingX * 2)) / (forecastData.length || 1);
            return (
              <rect
                key={`trigger-${i}`}
                x={getX(i) - stepWidth / 2}
                y={0}
                width={stepWidth}
                height={height}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}

          {/* Date Axis Labels */}
          <g fill="#475569" fontSize="10.5" fontWeight="600">
            <text x={paddingX} y={height - 6} textAnchor="start">
              {forecastData[0]?.date?.slice(5) || 'Start'} (Today)
            </text>
            <text x={chartWidth * 0.5} y={height - 6} textAnchor="middle">
              {forecastData[Math.floor(forecastData.length * 0.5)]?.date?.slice(5)}
            </text>
            <text x={chartWidth - paddingX} y={height - 6} textAnchor="end">
              {forecastData[forecastData.length - 1]?.date?.slice(5)}
            </text>
          </g>
        </svg>
      </div>

      {/* Dynamic Popover Card with Frosted Glass & High Contrast */}
      {activePoint && (
        <div
          style={{
            marginTop: 12,
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderTop: '2px solid #10B981',
            borderRadius: 14,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
            fontSize: 12.5,
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div>
            <span style={{ color: '#475569', fontWeight: 500 }}>Selected Date: </span>
            <strong style={{ color: '#0F172A', fontWeight: 700 }}>{activePoint.date}</strong>
            {activePoint.isNegative && (
              <span style={{ marginLeft: 8, color: '#E11D48', fontWeight: 700 }}>• Cash Deficit</span>
            )}
            {activePoint.isBelowBuffer && !activePoint.isNegative && (
              <span style={{ marginLeft: 8, color: '#D97706', fontWeight: 600 }}>• Below Safety Buffer</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {activePoint.incomes?.length > 0 && (
              <span style={{ color: '#059669', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                Inflow: +{formatINR(activePoint.incomes.reduce((s, i) => s + (i.effectiveAmount || i.amount || 0), 0))}
              </span>
            )}
            {activePoint.expenses?.length > 0 && (
              <span style={{ color: '#E11D48', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                Outflow: -{formatINR(activePoint.expenses.reduce((s, e) => s + Number(e.amount || 0), 0))}
              </span>
            )}
            <div>
              <span style={{ color: '#475569', fontWeight: 500 }}>Projected Balance: </span>
              <strong style={{
                color: activePoint.isNegative ? '#E11D48' : '#0F172A',
                fontSize: 14,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap'
              }}>
                {formatINR(activeVal)}
              </strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export default CashFlowChart;
