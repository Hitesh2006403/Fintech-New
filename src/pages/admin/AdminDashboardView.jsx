import { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import {
  Users,
  UserCheck,
  AlertTriangle,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Eye,
  Edit2,
  Ban,
  MessageSquare,
  ArrowRightLeft
} from 'lucide-react';

export function AdminDashboardView({ onViewAllUsers, onViewAllIssues, onViewAllLogs }) {
  const {
    stats,
    usersList,
    toggleUserStatus
  } = useAdmin();

  const [growthTimeframe, setGrowthTimeframe] = useState('7days');
  const [expenseTimeframe, setExpenseTimeframe] = useState('thisMonth');
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Safe users list
  const safeUsersList = Array.isArray(usersList) ? usersList : [];

  // Fallback defaults if stats still loading
  const totalUsers = stats?.totalUsers || safeUsersList.length || 1248;
  const activeUsers = stats?.activeUsers || 1102;
  const reportedIssues = stats?.reportedIssues || 18;
  const totalTransactions = stats?.totalTransactions || 8532;

  // Recent users (take first 5)
  const recentUsers = safeUsersList.slice(0, 5);

  // Growth Chart Data
  const growthSeries = useMemo(() => {
    return stats?.userGrowth?.[growthTimeframe] || [
      { date: 'Oct 12', count: 280 },
      { date: 'Oct 13', count: 520 },
      { date: 'Oct 14', count: 680 },
      { date: 'Oct 15', count: 750 },
      { date: 'Oct 16', count: 890 },
      { date: 'Oct 17', count: 1040 },
      { date: 'Oct 18', count: 1248 }
    ];
  }, [stats?.userGrowth, growthTimeframe]);

  // Bar Chart Data
  const barSeries = useMemo(() => {
    return stats?.incomeVsExpense?.[expenseTimeframe] || [
      { date: 'Oct 12', income: 24000, expenses: 14000 },
      { date: 'Oct 13', income: 38000, expenses: 21000 },
      { date: 'Oct 14', income: 32000, expenses: 18000 },
      { date: 'Oct 15', income: 29000, expenses: 19000 },
      { date: 'Oct 16', income: 22000, expenses: 15000 },
      { date: 'Oct 17', income: 34000, expenses: 23000 },
      { date: 'Oct 18', income: 45000, expenses: 28000 }
    ];
  }, [stats?.incomeVsExpense, expenseTimeframe]);

  // Recent Activity items
  const recentActivity = stats?.recentActivity || [
    { id: 'act_1', type: 'user_register', title: 'New user registered', meta: 'rohan@gmail.com', time: '2 mins ago', color: '#10B981' },
    { id: 'act_2', type: 'issue_reported', title: 'Issue reported', meta: 'Login not working', time: '12 mins ago', color: '#EF4444' },
    { id: 'act_3', type: 'user_blocked', title: 'User blocked', meta: 'sneha123@abc.com', time: '25 mins ago', color: '#F59E0B' },
    { id: 'act_4', type: 'transaction', title: 'Transaction completed', meta: '₹2,450 - Food & Dining', time: '1 hour ago', color: '#818CF8' },
    { id: 'act_5', type: 'feedback', title: 'New feedback', meta: 'Great app!', time: '2 hours ago', color: '#A5B4FC' }
  ];

  // SVG Coordinates calculation for Spline Line Chart (Memoized)
  const { points, pathD, areaD, svgWidth, svgHeight, paddingX, paddingY, maxVal } = useMemo(() => {
    const svgWidth = 420;
    const svgHeight = 180;
    const paddingX = 40;
    const paddingY = 25;
    const safeSeries = Array.isArray(growthSeries) && growthSeries.length > 0 ? growthSeries : [
      { date: 'Oct 12', count: 280 },
      { date: 'Oct 13', count: 520 },
      { date: 'Oct 14', count: 680 },
      { date: 'Oct 15', count: 750 },
      { date: 'Oct 16', count: 890 },
      { date: 'Oct 17', count: 1040 },
      { date: 'Oct 18', count: 1248 }
    ];
    const maxVal = Math.max(...safeSeries.map(p => Number(p?.count) || 0), 1200);

    const points = safeSeries.map((item, idx) => {
      const denom = safeSeries.length > 1 ? safeSeries.length - 1 : 1;
      const x = paddingX + (idx / denom) * (svgWidth - paddingX * 2);
      const val = Number(item?.count) || 0;
      const y = svgHeight - paddingY - (val / (maxVal || 1)) * (svgHeight - paddingY * 2);
      return { x, y, ...item };
    });

    const pathD = points.reduce((acc, p, i, a) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = a[i - 1];
      const cpX = (prev.x + p.x) / 2;
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
    }, '');

    const lastX = points.length > 0 ? points[points.length - 1].x : paddingX;
    const firstX = points.length > 0 ? points[0].x : paddingX;
    const areaD = pathD ? `${pathD} L ${lastX} ${svgHeight - paddingY} L ${firstX} ${svgHeight - paddingY} Z` : '';

    return { points, pathD, areaD, svgWidth, svgHeight, paddingX, paddingY, maxVal };
  }, [growthSeries]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Header Banner Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#F8FAFC',
            margin: '0 0 4px 0',
            letterSpacing: -0.4
          }}>
            Admin Dashboard
          </h1>
          <p style={{
            fontSize: 13.5,
            color: '#94A3B8',
            margin: 0
          }}>
            Monitor and manage your FinTech platform efficiently.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Date Picker Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: 'rgba(14, 21, 34, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            fontSize: 13,
            color: '#F8FAFC',
            fontWeight: 600
          }}>
            <Calendar size={15} color="#818CF8" />
            <span>Oct 18, 2025</span>
          </div>

          {/* System Online Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 14px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
            borderRadius: 10,
            fontSize: 13,
            color: '#34D399',
            fontWeight: 700
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 10px #10B981'
            }} />
            <span>System Online</span>
          </div>
        </div>
      </div>

      {/* 2. Four Stat Cards Row */}
      <div className="admin-stat-cards-grid">
        {/* Card 1: Total Users */}
        <div style={{
          background: 'rgba(14, 21, 34, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderTop: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: 16,
          padding: '20px 22px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(79, 70, 229, 0.12) 100%)',
              border: '1px solid rgba(129, 140, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818CF8'
            }}>
              <Users size={22} />
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Total Users</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', letterSpacing: -0.5 }}>
                {totalUsers.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontSize: 12, fontWeight: 700 }}>
              <ArrowUpRight size={14} />
              <span>↑ 12%</span>
            </div>

            {/* Indigo Sparkline SVG */}
            <svg width="90" height="26" viewBox="0 0 90 26" fill="none">
              <path
                d="M2 18 C 18 20, 28 8, 45 14 C 60 18, 72 4, 88 6"
                stroke="#818CF8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Active Users */}
        <div style={{
          background: 'rgba(14, 21, 34, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderTop: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 16,
          padding: '20px 22px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399'
            }}>
              <UserCheck size={22} />
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Active Users</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', letterSpacing: -0.5 }}>
                {activeUsers.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontSize: 12, fontWeight: 700 }}>
              <ArrowUpRight size={14} />
              <span>↑ 10%</span>
            </div>

            <svg width="90" height="26" viewBox="0 0 90 26" fill="none">
              <path
                d="M2 20 C 22 18, 35 12, 50 16 C 65 20, 75 4, 88 5"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Reported Issues */}
        <div style={{
          background: 'rgba(14, 21, 34, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderTop: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 16,
          padding: '20px 22px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F87171'
            }}>
              <AlertTriangle size={22} />
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Reported Issues</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', letterSpacing: -0.5 }}>
                {reportedIssues}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444', fontSize: 12, fontWeight: 700 }}>
              <ArrowDownRight size={14} />
              <span>↓ 40%</span>
            </div>

            <svg width="90" height="26" viewBox="0 0 90 26" fill="none">
              <path
                d="M2 14 C 18 16, 28 22, 45 10 C 60 4, 72 16, 88 12"
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Total Transactions */}
        <div style={{
          background: 'rgba(14, 21, 34, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderTop: '1px solid rgba(129, 140, 248, 0.4)',
          borderRadius: 16,
          padding: '20px 22px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(67, 56, 202, 0.12) 100%)',
              border: '1px solid rgba(129, 140, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A5B4FC'
            }}>
              <IndianRupee size={22} />
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>Total Transactions</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', letterSpacing: -0.5 }}>
                {totalTransactions.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A5B4FC', fontSize: 12, fontWeight: 700 }}>
              <ArrowUpRight size={14} />
              <span>↑ 16%</span>
            </div>

            <svg width="90" height="26" viewBox="0 0 90 26" fill="none">
              <path
                d="M2 16 C 18 10, 32 20, 50 8 C 65 2, 75 14, 88 7"
                stroke="#A5B4FC"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Middle Grid: User Growth Chart, Expense vs Income Chart, and Recent Activity */}
      <div className="admin-dashboard-middle-grid">
        {/* Left Column: User Growth Chart (5 cols) */}
        <div className="admin-col-growth" style={{
          background: 'rgba(14, 21, 34, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: 16,
          padding: '20px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              User Growth
            </h3>
            <select
              value={growthTimeframe}
              onChange={(e) => setGrowthTimeframe(e.target.value)}
              style={{
                background: 'rgba(10, 15, 25, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#F8FAFC',
                fontSize: 12,
                padding: '5px 10px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="1year">This Year</option>
            </select>
          </div>

          {/* Interactive Line Chart SVG */}
          <div style={{ position: 'relative', height: 210, width: '100%' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 300, 600, 900, 1200].map((val) => {
                const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
                return (
                  <g key={val}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.06)"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      fill="#64748B"
                      fontSize="9"
                      textAnchor="end"
                    >
                      {val.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Area Fill */}
              {areaD && <path d={areaD} fill="url(#growthAreaGradient)" />}

              {/* Smooth Spline Curve */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#818CF8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Data Points */}
              {(points || []).map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint?.idx === idx ? 6 : 4}
                    fill={hoveredPoint?.idx === idx ? '#818CF8' : '#090D14'}
                    stroke="#818CF8"
                    strokeWidth="2"
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onMouseEnter={() => setHoveredPoint({ idx, ...p })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  <text
                    x={p.x}
                    y={svgHeight - 6}
                    fill="#64748B"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {p.date}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div style={{
                position: 'absolute',
                left: `${(hoveredPoint.x / (svgWidth || 420)) * 100}%`,
                top: `${(hoveredPoint.y / (svgHeight || 180)) * 100 - 32}%`,
                transform: 'translate(-50%, -100%)',
                background: 'rgba(14, 21, 34, 0.98)',
                border: '1px solid #818CF8',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#F8FAFC',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.65)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 20
              }}>
                {hoveredPoint.date}: {Number(hoveredPoint.count || 0).toLocaleString()} users
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Expense vs Income Chart (4 cols) */}
        <div className="admin-col-income-expense" style={{
          background: 'rgba(14, 21, 34, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: 16,
          padding: '20px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              Expense vs Income
            </h3>
            <select
              value={expenseTimeframe}
              onChange={(e) => setExpenseTimeframe(e.target.value)}
              style={{
                background: 'rgba(10, 15, 25, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#F8FAFC',
                fontSize: 12,
                padding: '5px 10px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#94A3B8' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10B981' }} />
              <span>Income</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#94A3B8' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#818CF8' }} />
              <span>Expenses</span>
            </div>
          </div>

          {/* Grouped Bar Chart */}
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 10, paddingBottom: 20, position: 'relative' }}>
            {(barSeries || []).map((bar, idx) => {
              const maxBarVal = 60000;
              const incVal = Number(bar?.income) || 0;
              const expVal = Number(bar?.expenses) || 0;
              const incHeight = Math.min(100, Math.max(12, (incVal / maxBarVal) * 100));
              const expHeight = Math.min(100, Math.max(8, (expVal / maxBarVal) * 100));

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    position: 'relative'
                  }}
                  onMouseEnter={() => setHoveredBar({ idx, ...bar })}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', height: '100%' }}>
                    {/* Income Bar (Emerald) */}
                    <div style={{
                      flex: 1,
                      height: `${incHeight}%`,
                      background: 'linear-gradient(180deg, #34D399 0%, #059669 100%)',
                      borderRadius: '4px 4px 0 0',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.2)',
                      transition: 'height 0.3s ease'
                    }} />

                    {/* Expense Bar (Sovereign Indigo) */}
                    <div style={{
                      flex: 1,
                      height: `${expHeight}%`,
                      background: 'linear-gradient(180deg, #818CF8 0%, #4F46E5 100%)',
                      borderRadius: '4px 4px 0 0',
                      boxShadow: '0 0 8px rgba(99, 102, 241, 0.2)',
                      transition: 'height 0.3s ease'
                    }} />
                  </div>

                  <span style={{
                    position: 'absolute',
                    bottom: -20,
                    fontSize: 8.5,
                    color: '#64748B',
                    whiteSpace: 'nowrap'
                  }}>
                    {typeof bar?.date === 'string' ? bar.date.replace('Oct ', '') : (bar?.date || '')}
                  </span>
                </div>
              );
            })}

            {/* Hover Tooltip */}
            {hoveredBar && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(14, 21, 34, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11,
                color: '#F8FAFC',
                zIndex: 25,
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{hoveredBar.date || ''}</div>
                <div style={{ color: '#34D399' }}>Income: ₹{Number(hoveredBar.income || 0).toLocaleString()}</div>
                <div style={{ color: '#818CF8' }}>Expenses: ₹{Number(hoveredBar.expenses || 0).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity (3 cols) */}
        <div className="admin-col-activity" style={{
          background: 'rgba(14, 21, 34, 0.78)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: 16,
          padding: '20px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              Recent Activity
            </h3>
            <button
              type="button"
              onClick={onViewAllLogs}
              style={{
                background: 'none',
                border: 'none',
                color: '#818CF8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#818CF8'; }}
            >
              View All →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {recentActivity.map((act) => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `${act.color}22`,
                  border: `1px solid ${act.color}44`,
                  color: act.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {act.type === 'user_register' && <Users size={14} />}
                  {act.type === 'issue_reported' && <AlertTriangle size={14} />}
                  {act.type === 'user_blocked' && <Ban size={14} />}
                  {act.type === 'transaction' && <ArrowRightLeft size={14} />}
                  {act.type === 'feedback' && <MessageSquare size={14} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F8FAFC' }}>
                    {act.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {act.meta}
                  </div>
                </div>

                <div style={{ fontSize: 10.5, color: '#64748B', flexShrink: 0 }}>
                  {act.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Recent Users Table (Full Width) */}
      <div style={{
        background: 'rgba(14, 21, 34, 0.78)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: 16,
        padding: '22px 24px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#F8FAFC', margin: '0 0 4px 0' }}>
              Recent Platform Users
            </h3>
            <p style={{ fontSize: 12.5, color: '#94A3B8', margin: 0 }}>
              Live overview of registered user accounts and authorization status.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAllUsers}
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(129, 140, 248, 0.3)',
              borderRadius: 8,
              color: '#818CF8',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '7px 14px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.22)'; e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'; e.currentTarget.style.color = '#818CF8'; }}
          >
            View All Users →
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>User ID</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Name</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Email</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Joined On</th>
                <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#94A3B8', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: 13.5 }}>
                    No registered user accounts found.
                  </td>
                </tr>
              ) : (
                recentUsers.map((u) => {
                  const isBlocked = u.status === 'Blocked' || u.status === 'blocked';
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.04)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>
                      {u.id}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13.5, color: '#F8FAFC', fontWeight: 600 }}>
                      {u.name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#94A3B8' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isBlocked ? '#F87171' : '#34D399',
                        border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12.5, color: '#94A3B8' }}>
                      {u.joinedOn}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          title="View User Details"
                          onClick={() => setSelectedUserModal(u)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#94A3B8',
                            borderRadius: 6,
                            padding: 6,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          title="Edit User"
                          onClick={() => setSelectedUserModal({ ...u, isEditing: true })}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#94A3B8',
                            borderRadius: 6,
                            padding: 6,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          type="button"
                          title={isBlocked ? 'Unblock User' : 'Block User'}
                          onClick={() => toggleUserStatus(u, isBlocked ? 'Unblocked by admin' : 'Suspicious activity')}
                          style={{
                            background: isBlocked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            border: `1px solid ${isBlocked ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                            color: isBlocked ? '#34D399' : '#F87171',
                            borderRadius: 6,
                            padding: 6,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details / Edit Modal */}
      {selectedUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'rgba(14, 21, 34, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 18,
            padding: 24,
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', margin: '0 0 16px 0' }}>
              {selectedUserModal.isEditing ? 'Edit User Record' : 'User Account Profile'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Identifier:</span>{' '}
                <strong style={{ color: '#F8FAFC' }}>{selectedUserModal.id}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Full Name:</span>{' '}
                <strong style={{ color: '#F8FAFC' }}>{selectedUserModal.name}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Email Address:</span>{' '}
                <strong style={{ color: '#818CF8' }}>{selectedUserModal.email}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Platform Role:</span>{' '}
                <strong style={{ color: '#F8FAFC' }}>{selectedUserModal.role || 'Treasury Planner'}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Account Status:</span>{' '}
                <strong style={{ color: selectedUserModal.status === 'Blocked' ? '#F87171' : '#34D399' }}>
                  {selectedUserModal.status}
                </strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Registration Date:</span>{' '}
                <strong style={{ color: '#F8FAFC' }}>{selectedUserModal.joinedOn}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#F8FAFC',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
