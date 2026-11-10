import React, { useState, useMemo } from 'react';
import { formatINR } from '../../services/financialEngine.js';

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

  // Memoize scales, coordinates and SVG paths to avoid recalculating on every hover tick
  const metrics = useMemo(() => {
    if (!Array.isArray(forecastData) || forecastData.length === 0) return null;

    const balances = forecastData.map(d => {
      const v = Number(d?.closingBalance !== undefined ? d.closingBalance : (d?.balance !== undefined ? d.balance : 0));
      return isNaN(v) ? 0 : v;
    });

    const numSafetyBuffer = Number(safetyBuffer || 0);
    const numStartingBalance = Number(startingBalance || 0);

    const minBal = Math.min(0, ...balances, numSafetyBuffer);
    const maxBal = Math.max(numStartingBalance * 1.2, ...balances, numSafetyBuffer * 1.4, 50000);

    const range = (maxBal - minBal) > 0 ? (maxBal - minBal) : 1;
    const paddingY = 32;
    const chartHeight = Math.max(80, height - paddingY * 2);
    const chartWidth = 720;
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

    const points = forecastData.map((d, i) => {
      const val = d?.closingBalance !== undefined ? d.closingBalance : d?.balance;
      return `${getX(i)},${getY(val)}`;
    });

    const linePath = points.join(' L ');
    const areaPath = `${linePath} L ${getX(forecastData.length - 1)},${getY(minBal)} L ${getX(0)},${getY(minBal)} Z`;

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
      linePath,
      areaPath,
      numSafetyBuffer
    };
  }, [forecastData, safetyBuffer, startingBalance, height]);

  if (!Array.isArray(forecastData) || forecastData.length === 0 || !metrics) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
    linePath,
    areaPath,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#F8FAFC' }}>
            <span style={{ width: 12, height: 3, borderRadius: 2, background: '#38BDF8', boxShadow: '0 0 8px #38BDF8' }}></span>
            <span>Projected Closing Balance</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#F59E0B' }}>
            <span style={{ width: 12, height: 2, background: '#F59E0B', borderTop: '2px dashed #F59E0B' }}></span>
            <span>Safety Buffer ({formatINR(numSafetyBuffer)})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#10B981' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }}></span>
            <span>Income Event</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#EF4444' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }}></span>
            <span>Expense Event</span>
          </div>
        </div>

        {showControls && onRangeChange && (
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: 3, borderRadius: 8, gap: 3, backdropFilter: 'blur(8px)' }}>
            {[7, 14, 30, 60].map(r => (
              <button
                key={r}
                type="button"
                style={{
                  border: 'none',
                  background: timeRange === r ? 'linear-gradient(135deg, #38BDF8 0%, #6366F1 100%)' : 'transparent',
                  color: timeRange === r ? '#0B1220' : '#94A3B8',
                  fontWeight: timeRange === r ? 700 : 500,
                  fontSize: 11.5,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  boxShadow: timeRange === r ? '0 0 12px rgba(56, 189, 248, 0.35)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => onRangeChange(r)}
              >
                {r}D
              </button>
            ))}
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
            <linearGradient id="balanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="deficitAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />
          <line x1={paddingX} y1={paddingY + chartHeight * 0.5} x2={chartWidth - paddingX} y2={paddingY + chartHeight * 0.5} stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />
          <line x1={paddingX} y1={paddingY + chartHeight} x2={chartWidth - paddingX} y2={paddingY + chartHeight} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />

          {/* Zero Balance Line (if within range) */}
          {minBal < 0 && (
            <g>
              <line
                x1={paddingX}
                y1={yZero}
                x2={chartWidth - paddingX}
                y2={yZero}
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x={chartWidth - paddingX - 4} y={yZero + 4} fill="#EF4444" fontSize="10" fontWeight="600" textAnchor="end">
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
              stroke="#F59E0B"
              strokeWidth="1.75"
              strokeDasharray="5 4"
            />
            <text x={chartWidth - paddingX - 4} y={yBuffer - 5} fill="#F59E0B" fontSize="10.5" fontWeight="700" textAnchor="end">
              Buffer ({formatINR(numSafetyBuffer)})
            </text>
          </g>

          {/* Shaded Area Under Balance Curve */}
          <path d={`M ${areaPath}`} fill="url(#balanceAreaGrad)" />

          {/* Main Balance Line Curve with High-Contrast Blue Stroke */}
          <path
            d={`M ${linePath}`}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.65))' }}
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
                r={isHovered ? 4.5 : 2}
                fill={isHovered ? '#FFFFFF' : '#38BDF8'}
                stroke="#0B1220"
                strokeWidth={isHovered ? 2 : 1}
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
                  <circle cx={cx} cy={cy} r="5.5" fill="#10B981" stroke="#0B1220" strokeWidth="2" />
                )}
                {hasExpense && !hasIncome && (
                  <circle cx={cx} cy={cy} r="4.5" fill="#EF4444" stroke="#0B1220" strokeWidth="2" />
                )}
              </g>
            );
          })}

          {/* Hover / Active Guideline */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={activeX}
                y1={paddingY}
                x2={activeX}
                y2={paddingY + chartHeight}
                stroke="rgba(56, 189, 248, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle cx={activeX} cy={activeY} r="7" fill="#38BDF8" stroke="#0B1220" strokeWidth="2.5" />
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
          <g fill="#94A3B8" fontSize="10.5" fontWeight="500">
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

      {/* Dynamic Popover Card */}
      {activePoint && (
        <div
          style={{
            marginTop: 12,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderTop: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 10,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 25px rgba(0,0,0,0.45), 0 0 20px rgba(56, 189, 248, 0.1)',
            fontSize: 12.5,
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div>
            <span style={{ color: '#94A3B8', fontWeight: 500 }}>Selected Date: </span>
            <strong style={{ color: '#F8FAFC' }}>{activePoint.date}</strong>
            {activePoint.isNegative && (
              <span style={{ marginLeft: 8, color: '#EF4444', fontWeight: 700 }}>• Cash Deficit</span>
            )}
            {activePoint.isBelowBuffer && !activePoint.isNegative && (
              <span style={{ marginLeft: 8, color: '#F59E0B', fontWeight: 600 }}>• Below Safety Buffer</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {activePoint.incomes?.length > 0 && (
              <span style={{ color: '#10B981', fontWeight: 600 }}>
                Inflow: +{formatINR(activePoint.incomes.reduce((s, i) => s + (i.effectiveAmount || i.amount || 0), 0))}
              </span>
            )}
            {activePoint.expenses?.length > 0 && (
              <span style={{ color: '#EF4444', fontWeight: 600 }}>
                Outflow: -{formatINR(activePoint.expenses.reduce((s, e) => s + Number(e.amount || 0), 0))}
              </span>
            )}
            <div>
              <span style={{ color: '#94A3B8' }}>Projected Balance: </span>
              <strong style={{ color: activePoint.isNegative ? '#EF4444' : '#38BDF8', fontSize: 14 }}>
                {formatINR(activeVal)}
              </strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
