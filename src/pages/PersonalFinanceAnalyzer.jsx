import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatINR, toISODate, diffInDays } from '../services/financialEngine.js';
import { analyzerService } from '../services/analyzerService.js';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  FileText,
  UploadCloud,
  CheckCircle2,
  MessageSquare,
  Send,
  RefreshCw,
  Calendar,
  ArrowRight,
  PieChart,
  Activity,
  Layers,
  Wallet,
  Clock,
  HelpCircle,
  FileSpreadsheet,
  Zap,
  Info,
  ChevronRight,
  Plus,
  Receipt,
  RotateCcw,
  Lock
} from 'lucide-react';

export function PersonalFinanceAnalyzer() {
  const {
    user,
    incomes = [],
    expenses = [],
    balanceDetails = {},
    preferences = {},
    refreshData,
    isSyncing,
    setActiveRoute,
    setQuickAddModalOpen
  } = useApp();

  // Navigation Tabs: overview | spending | health | insights | statements | chat
  const [activeTab, setActiveTab] = useState('overview');

  // Date Filter Horizon: 'all' | '30' | '90' | '365'
  const [timeHorizon, setTimeHorizon] = useState('30');

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Authoritative Backend Intelligence State (Session Scoped)
  const [backendData, setBackendData] = useState(null);
  const [isBackendSyncing, setIsBackendSyncing] = useState(false);

  // AI Financial Intelligence State (Phase 4 Orchestration)
  const [aiExecutionMode, setAiExecutionMode] = useState('single'); // 'single' | 'multi'
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Trigger AI Financial Intelligence Analysis
  const handleRunAiAnalysis = async (mode = aiExecutionMode) => {
    setIsAiAnalyzing(true);
    setAiError(null);
    try {
      const result = await analyzerService.runAiAnalysis({
        mode,
        horizon: timeHorizon
      });
      setAiAnalysisResult(result);
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI analysis');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Fetch Authoritative Backend Analyzer Data (Tenant-Isolated)
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      if (!user?.id) return;
      setIsBackendSyncing(true);
      try {
        const data = await analyzerService.getAnalyzerData({ horizon: timeHorizon });
        if (isMounted && data) {
          setBackendData(data);
        }
      } catch (err) {
        // Fallback to local computation
        console.warn('[PersonalFinanceAnalyzer] Backend sync fallback to local calculation:', err.message);
      } finally {
        if (isMounted) setIsBackendSyncing(false);
      }
    }

    loadBackendData();
    return () => { isMounted = false; };
  }, [user?.id, timeHorizon, incomes, expenses, preferences]);

  // Statement Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedRows, setExtractedRows] = useState([]);
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const fileInputRef = useRef(null);

  // Chat State ("Ask Your Finances")
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! I am your FinSight Personal Finance AI. I analyze your live income streams, upcoming liabilities, and transaction statements. Ask me anything about your cash flow, spending patterns, or savings opportunities.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatBottomRef = useRef(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAiThinking, activeTab]);

  // Current Date string (IST)
  const todayStr = useMemo(() => {
    const now = new Date();
    return toISODate(now) || now.toISOString().split('T')[0];
  }, []);

  // Filter incomes and expenses based on selected horizon
  const { filteredIncomes, filteredExpenses } = useMemo(() => {
    if (timeHorizon === 'all') {
      return { filteredIncomes: incomes, filteredExpenses: expenses };
    }

    const days = parseInt(timeHorizon, 10) || 30;
    const now = new Date();
    const pastBoundary = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const pastBoundaryStr = toISODate(pastBoundary);

    const fIncomes = incomes.filter(inc => {
      const d = inc.actualDate || inc.expectedDate;
      return d && d >= pastBoundaryStr;
    });

    const fExpenses = expenses.filter(exp => {
      const d = exp.paidDate || exp.dueDate;
      return d && d >= pastBoundaryStr;
    });

    return { filteredIncomes: fIncomes, filteredExpenses: fExpenses };
  }, [incomes, expenses, timeHorizon]);

  // Core Financial Arithmetic (Deterministic & Verified, Synced with Backend Engine)
  const analytics = useMemo(() => {
    // 1. Local Fallback Computations
    const localReceivedIncome = filteredIncomes
      .filter(i => i.status === 'received' || i.actualDate)
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const localPipelineIncome = filteredIncomes.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0
    );

    const localPaidExpenses = filteredExpenses
      .filter(e => e.status === 'paid' || e.paidDate)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const localCommittedExpenses = filteredExpenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    const localEssentialExpenses = filteredExpenses
      .filter(e => e.isEssential || e.category === 'EMI or loan' || e.category === 'Rent / Housing' || e.category === 'Utilities')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 2. Authoritative Values (Backend verified, falling back to local calculations)
    const totalReceivedIncome = backendData?.overview?.clearedIncome ?? localReceivedIncome;
    const totalPipelineIncome = backendData?.overview?.totalGrossIncome ?? localPipelineIncome;
    const confirmedIncome = backendData?.overview?.confirmedIncome ?? 0;
    const uncertainIncome = backendData?.overview?.uncertainIncome ?? Math.max(0, totalPipelineIncome - totalReceivedIncome);
    const certaintyRatio = backendData?.overview?.certaintyRatio ?? (totalPipelineIncome > 0 ? Math.round((totalReceivedIncome / totalPipelineIncome) * 100) : 0);

    const totalPaidExpenses = backendData?.overview?.paidExpenses ?? localPaidExpenses;
    const totalCommittedExpenses = backendData?.overview?.totalCommittedExpenses ?? localCommittedExpenses;
    const overdueExpenses = backendData?.overview?.overdueExpenses ?? 0;
    const overdueCount = backendData?.overview?.overdueCount ?? 0;

    const netSavings = backendData?.overview?.netSavings ?? (totalReceivedIncome - totalPaidExpenses);
    const savingsRate = backendData?.overview?.savingsRate ?? (totalReceivedIncome > 0
      ? Math.max(0, Math.min(100, Math.round((netSavings / totalReceivedIncome) * 100)))
      : 0);

    const essentialExpenses = backendData?.spending?.essentialObligations ?? localEssentialExpenses;
    const discretionaryExpenses = backendData?.spending?.discretionarySpending ?? Math.max(0, totalCommittedExpenses - essentialExpenses);
    const essentialPercentage = backendData?.spending?.essentialRatio ?? (totalCommittedExpenses > 0
      ? Math.round((essentialExpenses / totalCommittedExpenses) * 100)
      : 0);

    const recurringCommitments = backendData?.spending?.recurringCommitments ?? 0;
    const emiCommitments = backendData?.spending?.emiCommitments ?? 0;

    // Category distribution
    const backendCategories = backendData?.spending?.expensesByCategory;
    let categoryList = [];
    if (Array.isArray(backendCategories) && backendCategories.length > 0) {
      categoryList = backendCategories.map(c => ({
        name: c.category,
        amount: c.total,
        percentage: c.percentage
      }));
    } else {
      const categoryMap = {};
      filteredExpenses.forEach(e => {
        const cat = e.category || 'General';
        const amt = Number(e.amount) || 0;
        categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      });

      categoryList = Object.entries(categoryMap)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalCommittedExpenses > 0
            ? Math.round((amount / totalCommittedExpenses) * 100)
            : 0
        }))
        .sort((a, b) => b.amount - a.amount);
    }

    const highestCategory = categoryList[0] || { name: 'None', amount: 0, percentage: 0 };

    // Average Monthly Expenses & Runway
    const daysCount = timeHorizon === 'all' ? 90 : (parseInt(timeHorizon, 10) || 30);
    const monthsFactor = Math.max(0.5, daysCount / 30);
    const avgMonthlyExpenses = Math.round(totalCommittedExpenses / monthsFactor);
    const dailyAverageExpenses = Math.round(totalCommittedExpenses / daysCount);
    const monthlySurplus = Math.round((totalReceivedIncome / monthsFactor) - avgMonthlyExpenses);

    const availableCash = backendData?.overview?.availableCash ?? Number(balanceDetails.availableCash ?? preferences.startingBalance ?? 45000);
    const safetyBuffer = backendData?.overview?.safetyBuffer ?? Number(preferences.safetyBuffer ?? 25000);
    const monthlyBurnRate = Math.max(1000, avgMonthlyExpenses);
    const runwayMonths = backendData?.overview?.runwayMonths ? String(backendData.overview.runwayMonths) : (availableCash / monthlyBurnRate).toFixed(1);

    const emergencyTarget = safetyBuffer > 0 ? safetyBuffer : monthlyBurnRate * 3;
    const emergencyProgress = Math.min(100, Math.round((availableCash / emergencyTarget) * 100));

    // Health Score
    let healthScore = backendData?.overview?.healthScore;
    if (healthScore === undefined || healthScore === null) {
      healthScore = 50;
      if (savingsRate >= 20) healthScore += 20;
      else if (savingsRate >= 10) healthScore += 10;
      else if (savingsRate < 0) healthScore -= 15;

      if (parseFloat(runwayMonths) >= 3.0) healthScore += 20;
      else if (parseFloat(runwayMonths) >= 1.5) healthScore += 10;
      else if (parseFloat(runwayMonths) < 1.0) healthScore -= 15;

      if (essentialPercentage <= 60 && totalCommittedExpenses > 0) healthScore += 10;
      else if (essentialPercentage > 85) healthScore -= 10;

      healthScore = Math.max(10, Math.min(100, healthScore));
    }

    let healthLabel = 'Stable';
    let healthColor = '#10B981';
    if (healthScore >= 80) {
      healthLabel = 'Excellent';
      healthColor = '#10B981';
    } else if (healthScore >= 60) {
      healthLabel = 'Good';
      healthColor = '#059669';
    } else if (healthScore >= 40) {
      healthLabel = 'Moderate';
      healthColor = '#F59E0B';
    } else {
      healthLabel = 'Vulnerable';
      healthColor = '#EF4444';
    }

    // Expense-to-income ratio (realized)
    const expenseToIncomeRatio = backendData?.overview?.expenseToIncomeRatio ??
      (totalReceivedIncome > 0 ? Math.round((totalPaidExpenses / totalReceivedIncome) * 100) : (totalPaidExpenses > 0 ? 100 : 0));

    // Phase 3 Advanced Subsystem Data
    const unusualExpenses = backendData?.spending?.unusualExpenses || [];
    const recurringExpenses = backendData?.spending?.recurringExpenses || [];
    const budgetUtilization = backendData?.spending?.budgetUtilization || [];
    const monthOverMonth = backendData?.trends?.monthOverMonth || [];
    const recommendations = backendData?.recommendations || [];

    return {
      totalReceivedIncome,
      totalPipelineIncome,
      confirmedIncome,
      uncertainIncome,
      certaintyRatio,
      totalPaidExpenses,
      totalCommittedExpenses,
      overdueExpenses,
      overdueCount,
      netSavings,
      savingsRate,
      expenseToIncomeRatio,
      essentialExpenses,
      discretionaryExpenses,
      essentialPercentage,
      recurringCommitments,
      emiCommitments,
      categoryList,
      highestCategory,
      avgMonthlyExpenses,
      dailyAverageExpenses,
      monthlySurplus,
      availableCash,
      safetyBuffer,
      runwayMonths,
      emergencyProgress,
      healthScore,
      healthLabel,
      healthColor,
      unusualExpenses,
      recurringExpenses,
      budgetUtilization,
      monthOverMonth,
      recommendations,
      isBackendVerified: Boolean(backendData)
    };
  }, [filteredIncomes, filteredExpenses, timeHorizon, balanceDetails, preferences, backendData]);

  // AI Insights Generation (Synchronized with Phase 3 Deterministic Engine)
  const aiInsights = useMemo(() => {
    // If backend engine provided verified recommendations, map them directly
    if (analytics.recommendations && analytics.recommendations.length > 0) {
      return analytics.recommendations.map(r => ({
        id: r.id,
        type: r.type === 'critical' || r.type === 'warning' ? 'warning' : (r.type === 'positive' ? 'positive' : 'opportunity'),
        title: r.title,
        desc: r.description,
        actionLabel: r.actionLabel || 'Take Action',
        actionRoute: r.type === 'critical' ? 'prioritization' : 'safe-to-spend'
      }));
    }

    const list = [];

    // Overspending warning
    if (analytics.monthlySurplus < 0) {
      list.push({
        id: 'ins_deficit',
        type: 'warning',
        title: 'Projected Monthly Deficit Detected',
        desc: `Your outflows exceed received cash by ${formatINR(Math.abs(analytics.monthlySurplus))}. Consider deferring non-essential discretionary bills until upcoming invoices clear.`,
        actionLabel: 'Prioritize Bills',
        actionRoute: 'prioritization'
      });
    }

    // High essential commitment
    if (analytics.essentialPercentage > 70 && analytics.totalCommittedExpenses > 0) {
      list.push({
        id: 'ins_essential',
        type: 'warning',
        title: 'High Fixed Cost Burden',
        desc: `Fixed liabilities (rent, EMIs, utilities) consume ${analytics.essentialPercentage}% of your total commitments. Build a buffer of at least 3 months to protect against gig invoice delays.`,
        actionLabel: 'Adjust Safety Buffer',
        actionRoute: 'settings'
      });
    }

    // Positive savings performance
    if (analytics.savingsRate >= 20) {
      list.push({
        id: 'ins_savings',
        type: 'positive',
        title: 'Strong Savings Velocity',
        desc: `You are currently saving ${analytics.savingsRate}% of cleared income. Allocating a portion of this surplus into your Lean-Week reserve will expand your cash runway.`,
        actionLabel: 'View Lean Savings',
        actionRoute: 'savings'
      });
    }

    // Top category concentration
    if (analytics.highestCategory.percentage >= 40 && analytics.totalCommittedExpenses > 0) {
      list.push({
        id: 'ins_category',
        type: 'opportunity',
        title: `Heavy Concentration in ${analytics.highestCategory.name}`,
        desc: `${analytics.highestCategory.name} accounts for ${analytics.highestCategory.percentage}% of all expenses (${formatINR(analytics.highestCategory.amount)}). Auditing recurring items here can free up immediate cash.`,
        actionLabel: 'Review Expenses',
        actionRoute: 'expenses'
      });
    }

    // Runway warning
    if (parseFloat(analytics.runwayMonths) < 1.5 && analytics.availableCash > 0) {
      list.push({
        id: 'ins_runway',
        type: 'warning',
        title: 'Tight Cash Runway (< 45 Days)',
        desc: `At current burn rates, your available liquid cash will cover approximately ${analytics.runwayMonths} months without new receivables arriving.`,
        actionLabel: 'Simulate Payment Delay',
        actionRoute: 'simulator'
      });
    }

    // Fallback general guidance
    if (list.length === 0) {
      list.push({
        id: 'ins_healthy',
        type: 'positive',
        title: 'Balanced Cash Position',
        desc: 'Your income and expense dynamics are operating within safe bounds. All planned obligations are covered with healthy safety buffer retention.',
        actionLabel: 'Check Safe-to-Spend',
        actionRoute: 'safe-to-spend'
      });
    }

    return list;
  }, [analytics]);

  // Handle Bank Statement File Upload & Extraction Preview
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.pdf'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      setUploadFeedback({
        type: 'error',
        message: 'Unsupported format. Please upload a valid bank or credit card statement in CSV or PDF format.'
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadFeedback({
        type: 'error',
        message: 'File size exceeds 15MB limit. Please upload a smaller statement.'
      });
      return;
    }

    setSelectedFile(file);
    setUploadFeedback(null);
    setIsUploading(true);

    const isPdf = fileName.endsWith('.pdf');
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        let content = reader.result;
        let fileType = isPdf ? 'pdf' : 'csv';

        if (isPdf && typeof content === 'string' && content.includes(',')) {
          content = content.split(',')[1];
        }

        const res = await analyzerService.parseStatement({
          filename: file.name,
          content,
          fileType
        });

        setExtractedRows(res.rows || []);
        setIsUploading(false);
        setUploadFeedback({
          type: 'success',
          message: `Parsed ${res.summary.totalTransactions} transactions from "${file.name}". ${res.summary.duplicateCount} duplicate(s) flagged for your review.`
        });
      } catch (err) {
        setIsUploading(false);
        setUploadFeedback({
          type: 'error',
          message: err.message || 'Failed to parse statement. Please ensure it is a valid bank statement file.'
        });
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      setUploadFeedback({
        type: 'error',
        message: 'Failed to read file from disk.'
      });
    };

    if (isPdf) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Toggle approval for statement row import
  const toggleRowApproval = (rowId) => {
    setExtractedRows(prev => prev.map(r => r.id === rowId ? { ...r, approved: !r.approved } : r));
  };

  // Select all or deselect all rows
  const toggleAllApproval = (selectAll) => {
    setExtractedRows(prev => prev.map(r => ({ ...r, approved: selectAll })));
  };

  // Update row details (category, title, type) inline
  const updateRowDetail = (rowId, field, value) => {
    setExtractedRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
  };

  // Handle Confirmed Statement Import
  const handleConfirmImport = async () => {
    const approvedRows = extractedRows.filter(r => r.approved);
    if (approvedRows.length === 0) {
      setUploadFeedback({
        type: 'error',
        message: 'Please approve at least one transaction to import into your FinSight ledger.'
      });
      return;
    }

    setIsUploading(true);
    try {
      const res = await analyzerService.importStatementTransactions(approvedRows);
      setIsUploading(false);
      setUploadFeedback({
        type: 'success',
        message: `Successfully imported ${res.totalImported} transaction(s) (${res.importedIncomes} income, ${res.importedExpenses} expenses) into your FinSight ledger!`
      });
      setExtractedRows([]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Immediately refresh central application state
      if (typeof refreshData === 'function') {
        refreshData();
      }
    } catch (err) {
      setIsUploading(false);
      setUploadFeedback({
        type: 'error',
        message: err.message || 'Failed to import transactions. Please try again.'
      });
    }
  };

  // Handle AI Chat Submission ("Ask Your Finances")
  const handleSendQuery = async (customPrompt = null) => {
    const query = (customPrompt || inputQuery).trim();
    if (!query || isAiThinking) return;

    const userMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setIsAiThinking(true);

    try {
      const response = await analyzerService.sendChatMessage({
        message: query,
        history: chatMessages.slice(-6),
        horizon: timeHorizon
      });

      const aiMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verifiedEvidence: response.verifiedEvidence
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.warn('[PersonalFinanceAnalyzer] Chat fallback:', err.message);
      // Fallback deterministic response
      const fallbackText = `Analyzing your ledger: You have ${formatINR(analytics.totalReceivedIncome)} in cleared inflows against ${formatINR(analytics.totalCommittedExpenses)} in outflows, with ${analytics.runwayMonths} months liquid runway. Please try again or rephrase your question.`;
      setChatMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="page-container">
      {/* 1. Header Row */}
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(5, 150, 105, 0.12)', border: '1px solid rgba(5, 150, 105, 0.28)', padding: '3px 10px', borderRadius: 20 }}>
              <Brain size={14} color="#059669" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Financial Intelligence Engine
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(15, 23, 42, 0.06)', border: '1px solid var(--neu-border, #DCE4EB)', padding: '3px 10px', borderRadius: 20 }}>
              <Lock size={12} color="#059669" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--neu-text-secondary, #64748B)' }}>
                Session Isolated & End-to-End Private
              </span>
            </div>
          </div>
          <h1 className="page-title">Personal Finance Analyzer</h1>
          <p className="page-subtitle">
            Synthesize your irregular earnings, detect hidden spending patterns, stress-test cash runways, and import bank statements with AI intelligence.
          </p>
        </div>

        {/* Global Controls: Horizon Filter & Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--neu-bg-primary, #E9EEF3)', padding: 4, borderRadius: 10, border: '1px solid var(--neu-border, #DCE4EB)', boxShadow: 'var(--neu-shadow-inset-sm)' }}>
            <Calendar size={14} color="var(--neu-text-secondary, #64748B)" style={{ marginLeft: 6 }} />
            {[
              { id: '30', label: '30 Days' },
              { id: '90', label: '90 Days' },
              { id: '365', label: '1 Year' },
              { id: 'all', label: 'All Time' }
            ].map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => setTimeHorizon(h.id)}
                style={{
                  border: 'none',
                  background: timeHorizon === h.id ? 'var(--neu-brand-primary, #059669)' : 'transparent',
                  color: timeHorizon === h.id ? '#FFFFFF' : 'var(--neu-text-secondary, #64748B)',
                  fontWeight: timeHorizon === h.id ? 700 : 500,
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {h.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              setLoading(true);
              await refreshData();
              setTimeout(() => setLoading(false), 400);
            }}
            disabled={isSyncing || loading}
            title="Refresh financial analytics"
          >
            <RefreshCw size={14} style={{ animation: (isSyncing || loading) ? 'spin 1s linear infinite' : 'none' }} />
            <span>{(isSyncing || loading) ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs Bar */}
      <div style={{
        display: 'flex',
        gap: 6,
        background: 'var(--neu-bg-primary, #E9EEF3)',
        padding: 6,
        borderRadius: 14,
        border: '1px solid var(--neu-border, #DCE4EB)',
        boxShadow: 'var(--neu-shadow-inset-sm)',
        marginBottom: 24,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: LayoutGridIcon },
          { id: 'spending', label: 'Spending Intelligence', icon: PieChart },
          { id: 'health', label: 'Financial Health', icon: ShieldCheck },
          { id: 'insights', label: 'AI Insights', icon: Sparkles },
          { id: 'statements', label: 'Statement Analyzer', icon: FileSpreadsheet },
          { id: 'chat', label: 'Ask Your Finances', icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--neu-text-secondary, #64748B)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                padding: '9px 16px',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 2px 8px rgba(5, 150, 105, 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB A: FINANCIAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Key Metric KPI Cards (4 columns) */}
          <div className="kpi-cards-grid-4">
            {/* Card 1: Total Cleared Income */}
            <div className="card kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Cleared Income</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-amount-val" style={{ color: '#059669' }}>
                {formatINR(analytics.totalReceivedIncome)}
              </div>
              <div className="kpi-sub-text">
                Pipeline: {formatINR(analytics.totalPipelineIncome)}
              </div>
            </div>

            {/* Card 2: Total Committed Expenses */}
            <div className="card kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Total Outflows</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }}>
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="kpi-amount-val" style={{ color: '#EF4444' }}>
                {formatINR(analytics.totalCommittedExpenses)}
              </div>
              <div className="kpi-sub-text">
                Paid: {formatINR(analytics.totalPaidExpenses)}
              </div>
            </div>

            {/* Card 3: Net Savings */}
            <div className="card kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Net Savings</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#0284C7' }}>
                  <Wallet size={18} />
                </div>
              </div>
              <div className="kpi-amount-val" style={{ color: analytics.netSavings >= 0 ? 'var(--neu-text-primary, #172033)' : '#EF4444' }}>
                {formatINR(analytics.netSavings)}
              </div>
              <div className="kpi-sub-text">
                Savings Rate: <strong>{analytics.savingsRate}%</strong>
              </div>
            </div>

            {/* Card 4: Financial Health Score */}
            <div className="card kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Health Score</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: analytics.healthColor }}>
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="kpi-amount-val" style={{ color: analytics.healthColor }}>
                {analytics.healthScore}/100
              </div>
              <div className="kpi-sub-text" style={{ fontWeight: 700, color: analytics.healthColor }}>
                Rating: {analytics.healthLabel}
              </div>
            </div>
          </div>

          {/* Secondary Metric Strip: Burn Rate, Runway, Highest Spend */}
          <div className="split-2col-grid">
            <div className="card">
              <h3 className="card-title-h3" style={{ marginBottom: 14 }}>Monthly Cash Flow Benchmark</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div style={{ padding: '14px', borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 4 }}>Avg Monthly Expenses</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--neu-text-primary, #172033)' }}>{formatINR(analytics.avgMonthlyExpenses)}</div>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', marginTop: 2 }}>Daily: {formatINR(analytics.dailyAverageExpenses)}/day</div>
                </div>

                <div style={{ padding: '14px', borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 4 }}>Monthly Surplus / Deficit</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: analytics.monthlySurplus >= 0 ? '#059669' : '#EF4444' }}>
                    {analytics.monthlySurplus >= 0 ? '+' : ''}{formatINR(analytics.monthlySurplus)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', marginTop: 2 }}>{analytics.monthlySurplus >= 0 ? 'Cash positive' : 'Deficit burn'}</div>
                </div>

                <div style={{ padding: '14px', borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 4 }}>Liquid Runway</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0284C7' }}>{analytics.runwayMonths} Months</div>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', marginTop: 2 }}>Cash: {formatINR(analytics.availableCash)}</div>
                </div>
              </div>
            </div>

            {/* Quick Highest Spending Callout */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 className="card-title-h3">Top Outflow Category</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    {analytics.highestCategory.percentage}% of Spend
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--neu-text-primary, #172033)', marginBottom: 4 }}>
                  {analytics.highestCategory.name}
                </div>
                <div style={{ fontSize: 14, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 16 }}>
                  Total committed: <strong>{formatINR(analytics.highestCategory.amount)}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => setActiveTab('spending')}
                >
                  <PieChart size={14} />
                  <span>View All Categories</span>
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => setActiveTab('insights')}
                >
                  <Sparkles size={14} />
                  <span>AI Insights</span>
                </button>
              </div>
            </div>
          </div>

          {/* Phase 3 Cash Flow Balance Matrix: Actual vs Forecast */}
          <div className="card">
            <div className="card-header-flex" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="card-title-h3">Cash Flow Balance Matrix</h3>
                <p className="card-subtitle-p">Deterministic side-by-side comparison of realized vs. projected cash flow.</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '3px 8px', borderRadius: 6 }}>
                Expense-to-Income: {analytics.expenseToIncomeRatio}%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {/* Actual Realized */}
              <div style={{ padding: '16px', borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Actual Realized</span>
                  <span style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>Cleared Ledger</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neu-text-secondary, #64748B)' }}>Realized Inflows:</span>
                    <strong style={{ color: '#059669' }}>{formatINR(analytics.totalReceivedIncome)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neu-text-secondary, #64748B)' }}>Realized Outflows:</span>
                    <strong style={{ color: '#EF4444' }}>{formatINR(analytics.totalPaidExpenses)}</strong>
                  </div>
                  <div style={{ height: 1, background: 'var(--neu-border, #DCE4EB)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span style={{ color: 'var(--neu-text-primary, #172033)' }}>Net Realized Savings:</span>
                    <span style={{ color: analytics.netSavings >= 0 ? '#059669' : '#EF4444' }}>{formatINR(analytics.netSavings)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>
                    <span>Savings Rate:</span>
                    <strong>{analytics.savingsRate}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>
                    <span>Expense-to-Income:</span>
                    <strong>{analytics.expenseToIncomeRatio}%</strong>
                  </div>
                </div>
              </div>

              {/* Forecast Projected */}
              <div style={{ padding: '16px', borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: 0.5 }}>Forecast Projections</span>
                  <span style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>Pipeline + Unpaid</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neu-text-secondary, #64748B)' }}>Gross Projected Inflow:</span>
                    <strong style={{ color: '#0284C7' }}>{formatINR(analytics.totalPipelineIncome)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--neu-text-secondary, #64748B)' }}>Total Committed Outflows:</span>
                    <strong style={{ color: '#EF4444' }}>{formatINR(analytics.totalCommittedExpenses)}</strong>
                  </div>
                  <div style={{ height: 1, background: 'var(--neu-border, #DCE4EB)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span style={{ color: 'var(--neu-text-primary, #172033)' }}>Projected Net:</span>
                    <span style={{ color: (analytics.totalPipelineIncome - analytics.totalCommittedExpenses) >= 0 ? '#059669' : '#EF4444' }}>
                      {formatINR(analytics.totalPipelineIncome - analytics.totalCommittedExpenses)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>
                    <span>Certainty Ratio:</span>
                    <strong>{analytics.certaintyRatio}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>
                    <span>Uncertain Receivables:</span>
                    <strong style={{ color: '#D97706' }}>{formatINR(analytics.uncertainIncome)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: SPENDING INTELLIGENCE */}
      {activeTab === 'spending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Split 2-col: Category Bars + Essential vs Discretionary */}
          <div className="split-2col-grid">
            {/* Category Breakdown List */}
            <div className="card">
              <div className="card-header-flex" style={{ marginBottom: 16 }}>
                <div>
                  <h3 className="card-title-h3">Category Spending Distribution</h3>
                  <p className="card-subtitle-p">Detailed allocation of expenses for the selected horizon.</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)' }}>
                  {analytics.categoryList.length} Categories
                </span>
              </div>

              {analytics.categoryList.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--neu-text-secondary, #64748B)' }}>
                  <Receipt size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No expense records found for this period.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {analytics.categoryList.map(cat => (
                    <div key={cat.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ fontWeight: 600, color: 'var(--neu-text-primary, #172033)' }}>{cat.name}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>
                          {formatINR(cat.amount)} ({cat.percentage}%)
                        </span>
                      </div>
                      <div style={{ height: 8, width: '100%', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 4, overflow: 'hidden', boxShadow: 'var(--neu-shadow-inset-sm)' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, cat.percentage)}%`,
                          background: 'linear-gradient(90deg, #059669 0%, #10B981 100%)',
                          borderRadius: 4
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Essential vs Discretionary Split */}
            <div className="card">
              <h3 className="card-title-h3" style={{ marginBottom: 8 }}>Essential vs. Discretionary Split</h3>
              <p className="card-subtitle-p" style={{ marginBottom: 20 }}>
                Essential commitments (rent, EMIs, utilities) cannot be delayed without penalty.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Visual Ratio Bar */}
                <div style={{ height: 16, width: '100%', borderRadius: 8, overflow: 'hidden', display: 'flex', boxShadow: 'var(--neu-shadow-inset-sm)' }}>
                  <div
                    style={{ width: `${analytics.essentialPercentage}%`, background: '#EF4444' }}
                    title={`Essential: ${analytics.essentialPercentage}%`}
                  />
                  <div
                    style={{ width: `${100 - analytics.essentialPercentage}%`, background: '#059669' }}
                    title={`Discretionary: ${100 - analytics.essentialPercentage}%`}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>Fixed / Essential</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#EF4444' }}>{formatINR(analytics.essentialExpenses)}</div>
                    <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>{analytics.essentialPercentage}% of budget</div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.25)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 4 }}>Discretionary</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{formatINR(analytics.discretionaryExpenses)}</div>
                    <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)', marginTop: 2 }}>{100 - analytics.essentialPercentage}% of budget</div>
                  </div>
                </div>

                <div style={{ padding: '12px 16px', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 10, border: '1px solid var(--neu-border, #DCE4EB)', fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', lineHeight: 1.5 }}>
                  <Info size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2, color: '#059669' }} />
                  <strong>Treasury Rule:</strong> For unpredictable income earners, keeping fixed essential commitments below 60% provides the resilience needed during dry project cycles.
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Income Certainty Pipeline + Fixed Liabilities & EMIs */}
          <div className="split-2col-grid">
            {/* Income Certainty Breakdown */}
            <div className="card">
              <div className="card-header-flex" style={{ marginBottom: 12 }}>
                <div>
                  <h3 className="card-title-h3">Income Certainty & Pipeline</h3>
                  <p className="card-subtitle-p">Confirmed vs. uncertain irregular receivables.</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                  {analytics.certaintyRatio}% Cleared/Confirmed
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ height: 12, width: '100%', borderRadius: 6, overflow: 'hidden', display: 'flex', boxShadow: 'var(--neu-shadow-inset-sm)' }}>
                  <div
                    style={{ width: `${analytics.certaintyRatio}%`, background: '#059669' }}
                    title={`Cleared & Confirmed: ${analytics.certaintyRatio}%`}
                  />
                  <div
                    style={{ width: `${100 - analytics.certaintyRatio}%`, background: '#F59E0B' }}
                    title={`Uncertain Pipeline: ${100 - analytics.certaintyRatio}%`}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Cleared Cash</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>{formatINR(analytics.totalReceivedIncome)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                    <div style={{ fontSize: 11, color: '#0284C7', fontWeight: 600 }}>Scheduled</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0284C7' }}>{formatINR(analytics.confirmedIncome)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>Uncertain</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#D97706' }}>{formatINR(analytics.uncertainIncome)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Recurring Commitments & EMIs */}
            <div className="card">
              <div className="card-header-flex" style={{ marginBottom: 12 }}>
                <div>
                  <h3 className="card-title-h3">Recurring Bills & Debt EMIs</h3>
                  <p className="card-subtitle-p">Fixed recurring overhead and loan commitments.</p>
                </div>
                {analytics.overdueCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    {analytics.overdueCount} Overdue ({formatINR(analytics.overdueExpenses)})
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '14px', borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 4 }}>Recurring Monthly</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--neu-text-primary, #172033)' }}>{formatINR(analytics.recurringCommitments)}</div>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', marginTop: 2 }}>Subscriptions & Utilities</div>
                </div>

                <div style={{ padding: '14px', borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 4 }}>Loan & EMI Debts</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#6366F1' }}>{formatINR(analytics.emiCommitments)}</div>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', marginTop: 2 }}>Non-negotiable obligations</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Category Budget Utilization */}
          {analytics.budgetUtilization && analytics.budgetUtilization.length > 0 && (
            <div className="card">
              <div className="card-header-flex" style={{ marginBottom: 14 }}>
                <div>
                  <h3 className="card-title-h3">Category Budget Utilization</h3>
                  <p className="card-subtitle-p">Deterministic budget tracking against benchmark targets.</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--neu-text-secondary, #64748B)' }}>
                  {analytics.budgetUtilization.length} Tracked Budgets
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {analytics.budgetUtilization.map(item => (
                  <div key={item.category} style={{ padding: '14px', borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--neu-text-primary, #172033)' }}>{item.category}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: item.isOverBudget ? 'rgba(239, 68, 68, 0.12)' : (item.status === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(5, 150, 105, 0.12)'),
                        color: item.isOverBudget ? '#EF4444' : (item.status === 'warning' ? '#D97706' : '#059669')
                      }}>
                        {item.utilizationPercent}%
                      </span>
                    </div>

                    <div style={{ height: 6, width: '100%', background: '#CBD5E1', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, item.utilizationPercent)}%`,
                        background: item.isOverBudget ? '#EF4444' : (item.status === 'warning' ? '#F59E0B' : '#059669'),
                        borderRadius: 3
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>
                      <span>Spent: <strong>{formatINR(item.spent)}</strong></span>
                      <span>Budget: {formatINR(item.budget)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Unusual Expense Spikes (Anomalies) */}
          {analytics.unusualExpenses && analytics.unusualExpenses.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #F59E0B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={18} color="#D97706" />
                <h3 className="card-title-h3" style={{ margin: 0 }}>Unusual Expense Spikes (Statistical Outliers)</h3>
              </div>
              <p className="card-subtitle-p" style={{ marginBottom: 14 }}>
                The following transactions exceed 2σ from your baseline or represent massive spikes relative to category averages:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analytics.unusualExpenses.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--neu-text-primary, #172033)' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>{item.reason}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#D97706' }}>{formatINR(item.amount)}</div>
                      <div style={{ fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)' }}>{item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB C: FINANCIAL HEALTH */}
      {activeTab === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="split-2col-grid">
            {/* Health Score Deep Dive */}
            <div className="card">
              <h3 className="card-title-h3" style={{ marginBottom: 8 }}>Cash Flow Health Score</h3>
              <p className="card-subtitle-p" style={{ marginBottom: 20 }}>
                Synthesized index factoring savings rate, runway length, and debt obligations.
              </p>

              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  background: 'var(--neu-bg-primary, #E9EEF3)',
                  boxShadow: 'var(--neu-shadow-raised)',
                  border: `3px solid ${analytics.healthColor}`
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: analytics.healthColor }}>
                    {analytics.healthScore}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--neu-text-muted, #94A3B8)', textTransform: 'uppercase' }}>
                    Score
                  </div>
                </div>

                <div style={{ fontSize: 18, fontWeight: 800, color: analytics.healthColor, marginBottom: 4 }}>
                  {analytics.healthLabel} Position
                </div>
                <p style={{ fontSize: 13, color: 'var(--neu-text-secondary, #64748B)', maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
                  {analytics.healthScore >= 75
                    ? 'Your finances exhibit strong resilience with ample liquidity and a healthy savings margin.'
                    : analytics.healthScore >= 50
                    ? 'Your cash flow is steady, but expanding emergency reserves will protect against delayed client payments.'
                    : 'Your liquidity is tight. Focus on clearing pending invoices and curbing discretionary outflows.'}
                </p>
              </div>
            </div>

            {/* Emergency Reserve Progress */}
            <div className="card">
              <h3 className="card-title-h3" style={{ marginBottom: 8 }}>Emergency Buffer Readiness</h3>
              <p className="card-subtitle-p" style={{ marginBottom: 20 }}>
                Safe threshold preserved from daily spending calculations.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--neu-text-primary, #172033)' }}>Current Reserve Target</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>{analytics.emergencyProgress}% Funded</span>
                  </div>
                  <div style={{ height: 10, width: '100%', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 5, overflow: 'hidden', boxShadow: 'var(--neu-shadow-inset-sm)' }}>
                    <div style={{
                      height: '100%',
                      width: `${analytics.emergencyProgress}%`,
                      background: 'linear-gradient(90deg, #059669 0%, #10B981 100%)',
                      borderRadius: 5
                    }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '12px', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 10, border: '1px solid var(--neu-border, #DCE4EB)' }}>
                    <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>Protected Buffer</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--neu-text-primary, #172033)' }}>{formatINR(analytics.safetyBuffer)}</div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 10, border: '1px solid var(--neu-border, #DCE4EB)' }}>
                    <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>Available Cash</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0284C7' }}>{formatINR(analytics.availableCash)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveRoute('safe-to-spend')}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <ShieldCheck size={15} />
                  <span>Configure in Safe-to-Spend</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Month-over-Month Historical Analysis */}
          {analytics.monthOverMonth && analytics.monthOverMonth.length > 0 && (
            <div className="card">
              <div className="card-header-flex" style={{ marginBottom: 14 }}>
                <div>
                  <h3 className="card-title-h3">Month-over-Month Historical Performance</h3>
                  <p className="card-subtitle-p">Chronological cash flow velocity and spending trajectories across months.</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                  {analytics.monthOverMonth.length} Months Tracked
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--neu-border, #DCE4EB)', textAlign: 'left', color: 'var(--neu-text-secondary, #64748B)' }}>
                      <th style={{ padding: '8px 12px' }}>Month</th>
                      <th style={{ padding: '8px 12px' }}>Inflows</th>
                      <th style={{ padding: '8px 12px' }}>Outflows</th>
                      <th style={{ padding: '8px 12px' }}>Net Savings</th>
                      <th style={{ padding: '8px 12px' }}>Savings Rate</th>
                      <th style={{ padding: '8px 12px' }}>MoM Spend Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.monthOverMonth.map(m => (
                      <tr key={m.month} style={{ borderBottom: '1px solid var(--neu-border, #DCE4EB)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>{m.month}</td>
                        <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 600 }}>{formatINR(m.inflow)}</td>
                        <td style={{ padding: '10px 12px', color: '#EF4444', fontWeight: 600 }}>{formatINR(m.outflow)}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: m.netSavings >= 0 ? '#059669' : '#EF4444' }}>
                          {formatINR(m.netSavings)}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{m.savingsRate}%</td>
                        <td style={{ padding: '10px 12px' }}>
                          {m.spendTrend === 'baseline' ? (
                            <span style={{ fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)' }}>Baseline Month</span>
                          ) : (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: m.momSpendChangePercent > 0 ? '#EF4444' : '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              {m.momSpendChangePercent > 0 ? `+${m.momSpendChangePercent}%` : `${m.momSpendChangePercent}%`}
                              {m.momSpendChangePercent > 0 ? '▲' : '▼'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB D: AI FINANCIAL INSIGHTS */}
      {activeTab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* AI Orchestration Header & Execution Controls */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(2, 132, 199, 0.05) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={22} color="#059669" />
                <div>
                  <h3 className="card-title-h3" style={{ margin: 0 }}>AI Financial Intelligence Engine</h3>
                  <p className="card-subtitle-p" style={{ margin: 0 }}>
                    Multi-agent synthesis adapted from Vatsa10/Financial-Analyzer with zero-hallucination guardrails.
                  </p>
                </div>
              </div>

              {/* Strategy Selector & Trigger Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', padding: 3, borderRadius: 8, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <button
                    type="button"
                    onClick={() => setAiExecutionMode('single')}
                    style={{
                      border: 'none',
                      background: aiExecutionMode === 'single' ? '#059669' : 'transparent',
                      color: aiExecutionMode === 'single' ? '#FFFFFF' : 'var(--neu-text-secondary, #64748B)',
                      fontWeight: aiExecutionMode === 'single' ? 700 : 500,
                      fontSize: 12,
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    Single-Agent (Fast)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiExecutionMode('multi')}
                    style={{
                      border: 'none',
                      background: aiExecutionMode === 'multi' ? '#059669' : 'transparent',
                      color: aiExecutionMode === 'multi' ? '#FFFFFF' : 'var(--neu-text-secondary, #64748B)',
                      fontWeight: aiExecutionMode === 'multi' ? 700 : 500,
                      fontSize: 12,
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    Multi-Agent (Deep)
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleRunAiAnalysis(aiExecutionMode)}
                  disabled={isAiAnalyzing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                >
                  <Sparkles size={14} style={{ animation: isAiAnalyzing ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{isAiAnalyzing ? 'Orchestrating Agents...' : (aiAnalysisResult ? 'Re-run Analysis' : 'Run AI Analysis')}</span>
                </button>
              </div>
            </div>

            {aiError && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#DC2626', fontSize: 13 }}>
                {aiError}
              </div>
            )}
          </div>

          {/* If AI Analysis Result is available, render the full multi-agent dossier */}
          {aiAnalysisResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Executive Financial Analyst Summary */}
              <div className="card" style={{ borderLeft: '4px solid #059669' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={18} color="#059669" />
                    <h3 className="card-title-h3" style={{ margin: 0 }}>Financial Analyst Executive Summary</h3>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(5, 150, 105, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    {aiAnalysisResult.periodAnalyzed}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--neu-text-primary, #172033)', lineHeight: 1.6, margin: 0 }}>
                  {aiAnalysisResult.overviewSummary}
                </p>
              </div>

              {/* Risk Assessment Specialist Section */}
              {aiAnalysisResult.riskAssessment && aiAnalysisResult.riskAssessment.length > 0 && (
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <ShieldCheck size={18} color="#0284C7" />
                    <h3 className="card-title-h3" style={{ margin: 0 }}>Risk Assessor Evaluation</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {aiAnalysisResult.riskAssessment.map((risk, idx) => {
                      const isHigh = risk.level === 'high';
                      const isMed = risk.level === 'medium';
                      const color = isHigh ? '#EF4444' : (isMed ? '#F59E0B' : '#059669');
                      const bg = isHigh ? 'rgba(239, 68, 68, 0.08)' : (isMed ? 'rgba(245, 158, 11, 0.08)' : 'rgba(5, 150, 105, 0.08)');
                      const border = isHigh ? 'rgba(239, 68, 68, 0.25)' : (isMed ? 'rgba(245, 158, 11, 0.25)' : 'rgba(5, 150, 105, 0.25)');

                      return (
                        <div key={idx} style={{ padding: 14, borderRadius: 12, background: bg, border: `1px solid ${border}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--neu-text-primary, #172033)' }}>{risk.risk}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color, background: '#FFFFFF', padding: '2px 6px', borderRadius: 4 }}>
                              {risk.level}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 8, lineHeight: 1.45 }}>
                            <strong>Impact:</strong> {risk.impact}
                          </div>
                          <div style={{ fontSize: 12, color, fontWeight: 600 }}>
                            <strong>Mitigation:</strong> {risk.mitigation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strategic Action Recommendations */}
              {aiAnalysisResult.strategicRecommendations && aiAnalysisResult.strategicRecommendations.length > 0 && (
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Zap size={18} color="#059669" />
                    <h3 className="card-title-h3" style={{ margin: 0 }}>Strategic Action Recommendations</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {aiAnalysisResult.strategicRecommendations.map((rec, idx) => (
                      <div key={idx} style={{ padding: 14, borderRadius: 12, background: 'var(--neu-bg-primary, #E9EEF3)', border: '1px solid var(--neu-border, #DCE4EB)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--neu-text-primary, #172033)', marginBottom: 4 }}>
                          {rec.title}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--neu-text-secondary, #64748B)', marginBottom: 8, lineHeight: 1.5 }}>
                          {rec.action}
                        </div>
                        {rec.evidence && (
                          <div style={{ fontSize: 11, color: '#047857', background: 'rgba(5, 150, 105, 0.08)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
                            <strong>Verified Evidence:</strong> {rec.evidence}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Disclaimer Footer */}
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--neu-text-muted, #94A3B8)', padding: '4px 0' }}>
                <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                {aiAnalysisResult.complianceDisclaimer}
              </div>
            </div>
          )}

          {/* If AI Analysis Result is not yet generated, display instant observations */}
          {!aiAnalysisResult && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {aiInsights.map(insight => {
                const isWarn = insight.type === 'warning';
                const isOpp = insight.type === 'opportunity';
                const borderCol = isWarn ? 'rgba(239, 68, 68, 0.3)' : isOpp ? 'rgba(245, 158, 11, 0.3)' : 'rgba(5, 150, 105, 0.3)';
                const iconBg = isWarn ? 'rgba(239, 68, 68, 0.12)' : isOpp ? 'rgba(245, 158, 11, 0.12)' : 'rgba(5, 150, 105, 0.12)';
                const iconCol = isWarn ? '#EF4444' : isOpp ? '#D97706' : '#059669';

                return (
                  <div key={insight.id} className="card" style={{ border: `1px solid ${borderCol}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, color: iconCol, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isWarn ? <AlertTriangle size={18} /> : isOpp ? <Zap size={18} /> : <CheckCircle2 size={18} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>
                          {insight.title}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: iconCol, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
                          {insight.type}
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--neu-text-secondary, #64748B)', lineHeight: 1.55, margin: '0 0 16px 0' }}>
                      {insight.desc}
                    </p>

                    {insight.actionRoute && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px', width: '100%', justifyContent: 'center' }}
                        onClick={() => setActiveRoute(insight.actionRoute)}
                      >
                        <span>{insight.actionLabel}</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB E: STATEMENT ANALYZER */}
      {activeTab === 'statements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Uploader Card */}
          <div className="card">
            <h3 className="card-title-h3" style={{ marginBottom: 6 }}>Bank & Card Statement Ingestion</h3>
            <p className="card-subtitle-p" style={{ marginBottom: 18 }}>
              Upload your official bank statement in CSV or text PDF format to automatically extract, categorize, and deduplicate records.
            </p>

            <div
              style={{
                border: '2px dashed var(--neu-border, #DCE4EB)',
                borderRadius: 14,
                padding: '36px 20px',
                textAlign: 'center',
                background: 'var(--neu-bg-primary, #E9EEF3)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .pdf"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <UploadCloud size={40} color="#059669" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neu-text-primary, #172033)', marginBottom: 4 }}>
                {selectedFile ? selectedFile.name : 'Click to Upload or Drag & Drop'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--neu-text-secondary, #64748B)' }}>
                Supported Formats: Standard CSV or Text-based PDF (Max 15MB)
              </div>
            </div>

            {/* Feedback Alert */}
            {uploadFeedback && (
              <div style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: uploadFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                border: `1px solid ${uploadFeedback.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(5, 150, 105, 0.3)'}`,
                color: uploadFeedback.type === 'error' ? '#EF4444' : '#059669'
              }}>
                {uploadFeedback.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                <span>{uploadFeedback.message}</span>
              </div>
            )}

            {isUploading && (
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--neu-text-secondary, #64748B)' }}>
                <RefreshCw size={16} className="spin" color="#059669" />
                <span>Processing bank statement with duplicate detection...</span>
              </div>
            )}
          </div>

          {/* Extracted Rows Preview Table */}
          {extractedRows.length > 0 && (
            <div className="card">
              <div className="card-header-flex" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className="card-title-h3">Extracted Transactions Preview</h3>
                  <p className="card-subtitle-p">Review extracted items, resolve duplicates, and confirm ledger import.</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => toggleAllApproval(true)}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => toggleAllApproval(false)}
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isUploading || extractedRows.filter(r => r.approved).length === 0}
                    onClick={handleConfirmImport}
                  >
                    <CheckCircle2 size={15} />
                    <span>Import Approved ({extractedRows.filter(r => r.approved).length})</span>
                  </button>
                </div>
              </div>

              {/* Summary Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: '8px 12px', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 8, border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>Total Parsed</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>{extractedRows.length} rows</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 8, border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>Inflows Total</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>
                    +{formatINR(extractedRows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))}
                  </div>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 8, border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>Outflows Total</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#EF4444' }}>
                    -{formatINR(extractedRows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))}
                  </div>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--neu-bg-primary, #E9EEF3)', borderRadius: 8, border: '1px solid var(--neu-border, #DCE4EB)' }}>
                  <div style={{ fontSize: 11, color: 'var(--neu-text-secondary, #64748B)' }}>Flagged Duplicates</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: extractedRows.some(r => r.isDuplicate) ? '#D97706' : '#059669' }}>
                    {extractedRows.filter(r => r.isDuplicate).length} flagged
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>Import</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedRows.map(row => (
                      <tr key={row.id} style={{ opacity: row.approved ? 1 : 0.55 }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={row.approved}
                            onChange={() => toggleRowApproval(row.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{row.date}</td>
                        <td style={{ fontWeight: 600, color: 'var(--neu-text-primary, #172033)' }}>
                          <div>{row.description}</div>
                          {row.duplicateReason && (
                            <div style={{ fontSize: 10.5, color: '#D97706', marginTop: 2 }}>{row.duplicateReason}</div>
                          )}
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--neu-text-secondary, #64748B)' }}>{row.category}</td>
                        <td>
                          <span className={`status-badge ${row.type === 'income' ? 'received' : 'overdue'}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="num-val" style={{ fontWeight: 700, color: row.type === 'income' ? '#059669' : '#EF4444' }}>
                          {row.type === 'income' ? '+' : '-'}{formatINR(row.amount)}
                        </td>
                        <td>
                          {row.isDuplicate ? (
                            <span style={{ fontSize: 11, color: '#D97706', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={12} />
                              Potential Duplicate
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#059669', background: 'rgba(5, 150, 105, 0.12)', padding: '2px 8px', borderRadius: 4 }}>
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB F: ASK YOUR FINANCES (AI CHAT) */}
      {activeTab === 'chat' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '620px', padding: 0, overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--neu-border, #DCE4EB)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--neu-bg-primary, #E9EEF3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                <Brain size={18} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--neu-text-primary, #172033)' }}>Ask Your Finances</div>
                <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Connected to live ledger records</div>
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: 11.5, padding: '4px 10px' }}
              onClick={() => setChatMessages([chatMessages[0]])}
              title="Clear conversation"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>

          {/* Quick Prompt Pills */}
          <div style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.4)', borderBottom: '1px solid var(--neu-border, #DCE4EB)', display: 'flex', gap: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {[
              'Where did I spend the most?',
              'How much did I save?',
              'Why is my Safe-to-Spend amount low?',
              'How much do I spend on food?',
              'What are my upcoming financial commitments?',
              'How will delayed income affect my cash flow?',
              'How can I reduce my monthly expenses?',
              'Which category increased the most?'
            ].map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendQuery(prompt)}
                style={{
                  border: '1px solid var(--neu-border, #DCE4EB)',
                  background: 'var(--neu-bg-primary, #E9EEF3)',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11.5,
                  color: 'var(--neu-text-secondary, #64748B)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: 14,
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  background: msg.sender === 'user'
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : 'var(--neu-bg-primary, #E9EEF3)',
                  color: msg.sender === 'user' ? '#FFFFFF' : 'var(--neu-text-primary, #172033)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--neu-border, #DCE4EB)',
                  boxShadow: msg.sender === 'user'
                    ? '0 3px 10px rgba(5, 150, 105, 0.3)'
                    : 'var(--neu-shadow-raised-sm)'
                }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                  {msg.verifiedEvidence && (
                    <div style={{
                      marginTop: 8,
                      padding: '4px 8px',
                      background: 'rgba(5, 150, 105, 0.08)',
                      border: '1px solid rgba(5, 150, 105, 0.2)',
                      borderRadius: 6,
                      fontSize: 10.5,
                      color: '#047857',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <CheckCircle2 size={12} color="#059669" />
                      <span>Verified against active ledger metrics</span>
                    </div>
                  )}

                  <div style={{
                    fontSize: 10,
                    marginTop: 4,
                    textAlign: 'right',
                    color: msg.sender === 'user' ? 'rgba(255, 255, 255, 0.7)' : 'var(--neu-text-muted, #94A3B8)'
                  }}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 16px',
                  borderRadius: 14,
                  background: 'var(--neu-bg-primary, #E9EEF3)',
                  border: '1px solid var(--neu-border, #DCE4EB)',
                  color: 'var(--neu-text-secondary, #64748B)',
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Sparkles size={14} color="#059669" style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Synthesizing verified financial metrics...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }}
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--neu-border, #DCE4EB)',
              background: 'var(--neu-bg-primary, #E9EEF3)',
              display: 'flex',
              gap: 10
            }}
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask about your cash flow, categories, or runway..."
              className="form-input-control"
              style={{ flex: 1, padding: '10px 16px' }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!inputQuery.trim() || isAiThinking}
              style={{ padding: '0 20px' }}
            >
              <Send size={16} />
              <span>Ask</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Fallback Icon helper
function LayoutGridIcon(props) {
  return (
    <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}
