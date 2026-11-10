/**
 * UNCERTAIN INCOME PLANNER — CSV EXPORT SERVICE
 */

export function exportTransactionsCSV(incomes = [], expenses = []) {
  const rows = [
    ['Type', 'Title', 'Category / Source', 'Amount (INR)', 'Scheduled / Due Date', 'Status', 'Essential', 'Notes']
  ];

  incomes.forEach(inc => {
    rows.push([
      'Income',
      `"${inc.title.replace(/"/g, '""')}"`,
      `"${(inc.source || 'Income').replace(/"/g, '""')}"`,
      inc.amount,
      inc.expectedDate || '',
      inc.status,
      'N/A',
      `"${(inc.notes || '').replace(/"/g, '""')}"`
    ]);
  });

  expenses.forEach(exp => {
    rows.push([
      'Expense',
      `"${exp.title.replace(/"/g, '""')}"`,
      `"${(exp.category || 'Expense').replace(/"/g, '""')}"`,
      exp.amount,
      exp.dueDate || '',
      exp.status,
      exp.isEssential ? 'Yes' : 'No',
      `"${(exp.notes || '').replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `uncertain_income_planner_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportForecastCSV(forecastData = []) {
  const rows = [
    ['Date', 'Projected Closing Balance (INR)', 'Income Events', 'Expense Events', 'Safety Status']
  ];

  forecastData.forEach(day => {
    const incomeStr = day.incomes ? day.incomes.map(i => `${i.title} (+₹${i.amount})`).join('; ') : '';
    const expenseStr = day.expenses ? day.expenses.map(e => `${e.title} (-₹${e.amount})`).join('; ') : '';
    rows.push([
      day.date,
      day.closingBalance,
      `"${incomeStr.replace(/"/g, '""')}"`,
      `"${expenseStr.replace(/"/g, '""')}"`,
      day.status
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cashflow_forecast_summary_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
