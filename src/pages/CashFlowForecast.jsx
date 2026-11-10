import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR, generateCashFlowForecast } from '../services/financialEngine.js';
import { CashFlowChart } from '../components/charts/CashFlowChart.jsx';
import { exportForecastCSV } from '../services/exportService.js';
import {
  LineChart,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export function CashFlowForecast() {
  const { balanceDetails, incomes, expenses, preferences, setActiveRoute } = useApp();

  const [timeRange, setTimeRange] = useState(30); // 7, 14, 30, 60, 90
  const [scenario, setScenario] = useState('expected'); // 'conservative' | 'expected' | 'optimistic'

  const forecastResult = generateCashFlowForecast({
    availableCash: balanceDetails.availableCash,
    incomes,
    expenses,
    safetyBuffer: preferences.safetyBuffer,
    days: timeRange,
    scenario
  });

  const handleExportCSV = () => {
    exportForecastCSV(forecastResult.forecast);
  };

  return (
    <div className="page-container">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Cash-Flow Forecast</h1>
          <p className="page-subtitle">
            Projected day-by-day liquidity balance across different income certainty scenarios.
          </p>
        </div>

        <div className="page-actions-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportCSV}
          >
            <Download size={15} />
            <span>Export Forecast (CSV)</span>
          </button>
        </div>
      </div>

      {/* Scenario & Horizon Controls Strip */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        {/* Scenario Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: '100%' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neu-text-primary, #172033)', flexShrink: 0 }}>Scenario:</span>
          <div className="filter-chips-row" style={{
            display: 'flex',
            background: 'var(--neu-bg-primary, #E9EEF3)',
            padding: 4,
            borderRadius: 12,
            border: '1px solid var(--neu-border, #DCE4EB)',
            boxShadow: 'var(--neu-shadow-inset-sm, inset 2px 2px 5px rgba(163, 177, 198, 0.25), inset -2px -2px 5px rgba(255, 255, 255, 0.85))',
            gap: 4,
            maxWidth: '100%'
          }}>
            {[
              { id: 'conservative', label: 'Conservative', note: 'No future income counted' },
              { id: 'expected', label: 'Expected', note: 'Confirmed contracts only' },
              { id: 'optimistic', label: 'Optimistic', note: 'Includes speculative proposals' }
            ].map(sc => {
              const isActive = scenario === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  style={{
                    border: isActive ? '1px solid var(--neu-brand-primary, #059669)' : '1px solid transparent',
                    background: isActive ? 'var(--neu-brand-gradient, linear-gradient(135deg, #059669 0%, #047857 100%))' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--neu-text-secondary, #64748B)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 12.5,
                    padding: '7px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isActive ? '2px 2px 6px rgba(5, 150, 105, 0.35), -1px -1px 4px rgba(255, 255, 255, 0.7)' : 'none'
                  }}
                  onClick={() => setScenario(sc.id)}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Horizon Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: '100%' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neu-text-primary, #172033)', flexShrink: 0 }}>Horizon:</span>
          <div className="filter-chips-row" style={{
            display: 'flex',
            background: 'var(--neu-bg-primary, #E9EEF3)',
            padding: 4,
            borderRadius: 12,
            border: '1px solid var(--neu-border, #DCE4EB)',
            boxShadow: 'var(--neu-shadow-inset-sm, inset 2px 2px 5px rgba(163, 177, 198, 0.25), inset -2px -2px 5px rgba(255, 255, 255, 0.85))',
            gap: 4,
            maxWidth: '100%'
          }}>
            {[7, 14, 30, 60, 90].map(d => {
              const isActive = timeRange === d;
              return (
                <button
                  key={d}
                  type="button"
                  style={{
                    border: isActive ? '1px solid var(--neu-brand-primary, #059669)' : '1px solid transparent',
                    background: isActive ? 'var(--neu-brand-gradient, linear-gradient(135deg, #059669 0%, #047857 100%))' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--neu-text-secondary, #64748B)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 12.5,
                    padding: '7px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isActive ? '2px 2px 6px rgba(5, 150, 105, 0.35), -1px -1px 4px rgba(255, 255, 255, 0.7)' : 'none'
                  }}
                  onClick={() => setTimeRange(d)}
                >
                  {d} Days
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header-flex">
          <div>
            <h3 className="card-title-h3">{timeRange}-Day Daily Trajectory ({scenario.toUpperCase()} SCENARIO)</h3>
            <p className="card-subtitle-p">
              Estimates based on current cash of {formatINR(balanceDetails.availableCash)} and {scenario === 'conservative' ? 'known unpaid bills with zero expected income' : scenario === 'expected' ? 'confirmed signed invoices' : 'all confirmed and uncertain revenue'}.
            </p>
          </div>
          
          {forecastResult.firstNegativeDate ? (
            <span className="status-badge overdue">
              <AlertTriangle size={12} />
              <span>Projected Shortfall on {forecastResult.firstNegativeDate}</span>
            </span>
          ) : forecastResult.firstLowBufferDate ? (
            <span className="status-badge upcoming">
              <span>Below Safety Buffer on {forecastResult.firstLowBufferDate}</span>
            </span>
          ) : (
            <span className="status-badge received">
              <CheckCircle2 size={12} />
              <span>Healthy Liquidity Runway</span>
            </span>
          )}
        </div>

        <CashFlowChart
          forecastData={forecastResult.forecast}
          safetyBuffer={preferences.safetyBuffer}
          startingBalance={balanceDetails.availableCash}
          height={320}
          showControls={false}
        />
      </div>

      {/* Detailed Day-by-Day Forecast Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 className="card-title-h3">Day-by-Day Financial Breakdown</h3>
            <p className="card-subtitle-p">Chronological cash position and scheduled transactions.</p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Showing {forecastResult.forecast.length} days</span>
        </div>

        <div className="table-responsive" style={{ maxHeight: 420 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Opening Balance</th>
                <th>Daily Inflow</th>
                <th>Daily Outflow</th>
                <th>Projected Closing Balance</th>
                <th>Buffer Status</th>
              </tr>
            </thead>
            <tbody>
              {forecastResult.forecast.map((day, idx) => {
                const totalIn = day.incomes?.reduce((s, i) => s + (i.effectiveAmount || i.amount), 0) || 0;
                const totalOut = day.expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;

                return (
                  <tr
                    key={day.date}
                    style={{
                      background: day.isNegative ? 'var(--neu-danger-bg, rgba(239, 68, 68, 0.12))' : day.isBelowBuffer ? 'var(--neu-warning-bg, rgba(245, 158, 11, 0.08))' : idx % 2 === 0 ? 'rgba(255, 255, 255, 0.35)' : 'transparent'
                    }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--neu-text-primary, #172033)', whiteSpace: 'nowrap' }}>
                      {day.date} {idx === 0 && <span style={{ color: 'var(--neu-brand-primary, #059669)', fontSize: 11, fontWeight: 700 }}>(Today)</span>}
                    </td>

                    <td className="num-val" style={{ color: 'var(--neu-text-secondary, #64748B)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(day.openingBalance)}
                    </td>

                    <td>
                      {totalIn > 0 ? (
                        <div>
                          <strong style={{ color: 'var(--neu-success-dark, #047857)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>+{formatINR(totalIn)}</strong>
                          <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>
                            {day.incomes.map(i => i.title).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--neu-text-muted, #94A3B8)' }}>—</span>
                      )}
                    </td>

                    <td>
                      {totalOut > 0 ? (
                        <div>
                          <strong style={{ color: 'var(--neu-danger-dark, #B91C1C)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>-{formatINR(totalOut)}</strong>
                          <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>
                            {day.expenses.map(e => e.title).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--neu-text-muted, #94A3B8)' }}>—</span>
                      )}
                    </td>

                    <td className="num-val" style={{ color: day.isNegative ? 'var(--neu-danger-dark, #B91C1C)' : 'var(--neu-text-primary, #172033)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(day.closingBalance)}
                    </td>

                    <td>
                      {day.isNegative ? (
                        <span className="status-badge overdue">Deficit (Shortfall)</span>
                      ) : day.isBelowBuffer ? (
                        <span className="status-badge upcoming">Below Buffer</span>
                      ) : (
                        <span className="status-badge received">Safe</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
