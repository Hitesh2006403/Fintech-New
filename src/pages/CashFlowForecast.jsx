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
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>Scenario:</span>
          <div className="filter-chips-row" style={{ display: 'flex', background: 'rgba(11, 18, 32, 0.8)', padding: 4, borderRadius: 10, border: '1px solid var(--border-glass)', gap: 4, maxWidth: '100%' }}>
            {[
              { id: 'conservative', label: 'Conservative', note: 'No future income counted' },
              { id: 'expected', label: 'Expected', note: 'Confirmed contracts only' },
              { id: 'optimistic', label: 'Optimistic', note: 'Includes speculative proposals' }
            ].map(sc => (
              <button
                key={sc.id}
                type="button"
                style={{
                  border: scenario === sc.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  background: scenario === sc.id ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(167, 139, 250, 0.25) 100%)' : 'transparent',
                  color: scenario === sc.id ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: scenario === sc.id ? 700 : 500,
                  fontSize: 12.5,
                  padding: '7px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: scenario === sc.id ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none'
                }}
                onClick={() => setScenario(sc.id)}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Horizon Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: '100%' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>Horizon:</span>
          <div className="filter-chips-row" style={{ display: 'flex', background: 'rgba(11, 18, 32, 0.8)', padding: 4, borderRadius: 10, border: '1px solid var(--border-glass)', gap: 4, maxWidth: '100%' }}>
            {[7, 14, 30, 60, 90].map(d => (
              <button
                key={d}
                type="button"
                style={{
                  border: timeRange === d ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  background: timeRange === d ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(167, 139, 250, 0.25) 100%)' : 'transparent',
                  color: timeRange === d ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: timeRange === d ? 700 : 500,
                  fontSize: 12.5,
                  padding: '7px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: timeRange === d ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none'
                }}
                onClick={() => setTimeRange(d)}
              >
                {d} Days
              </button>
            ))}
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
            <span className="badge badge-danger">
              <AlertTriangle size={12} />
              <span>Projected Shortfall on {forecastResult.firstNegativeDate}</span>
            </span>
          ) : forecastResult.firstLowBufferDate ? (
            <span className="badge badge-warning">
              <span>Below Safety Buffer on {forecastResult.firstLowBufferDate}</span>
            </span>
          ) : (
            <span className="badge badge-success">
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
                <th>Inflow Events</th>
                <th>Outflow Events</th>
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
                      background: day.isNegative ? 'rgba(239, 68, 68, 0.12)' : day.isBelowBuffer ? 'rgba(245, 158, 11, 0.08)' : idx % 2 === 0 ? 'rgba(15, 23, 42, 0.35)' : 'rgba(23, 37, 84, 0.15)'
                    }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {day.date} {idx === 0 && <span style={{ color: 'var(--accent-primary)', fontSize: 11, fontWeight: 700 }}>(Today)</span>}
                    </td>

                    <td>
                      {totalIn > 0 ? (
                        <div>
                          <strong style={{ color: '#10B981', fontSize: 13, textShadow: '0 0 8px rgba(16, 185, 129, 0.3)' }}>+{formatINR(totalIn)}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {day.incomes.map(i => i.title).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    <td>
                      {totalOut > 0 ? (
                        <div>
                          <strong style={{ color: '#EF4444', fontSize: 13, textShadow: '0 0 8px rgba(239, 68, 68, 0.3)' }}>-{formatINR(totalOut)}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {day.expenses.map(e => e.title).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    <td className="num-val" style={{ color: day.isNegative ? '#EF4444' : 'var(--text-primary)', fontSize: 14, fontWeight: 700, textShadow: day.isNegative ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none' }}>
                      {formatINR(day.closingBalance)}
                    </td>

                    <td>
                      {day.isNegative ? (
                        <span className="badge badge-danger">Deficit (Shortfall)</span>
                      ) : day.isBelowBuffer ? (
                        <span className="badge badge-warning">Below Buffer</span>
                      ) : (
                        <span className="badge badge-success">Safe</span>
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
