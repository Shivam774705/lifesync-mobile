/**
 * LifeSync — Interactive Analytics & Charts Engine
 * Chart.js wrapper with dark/light theme awareness and fallback rendering.
 */

class ChartEngine {
  constructor() {
    this.donutChart = null;
    this.dailySpendChart = null;
    this.cashflowChart = null;
    this.taskCatChart = null;
  }

  getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      textColor: isLight ? '#475569' : '#94a3b8',
      gridColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)',
      tooltipBg: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 22, 35, 0.95)',
      tooltipTitle: isLight ? '#0f172a' : '#f8fafc',
      tooltipBody: isLight ? '#334155' : '#cbd5e1'
    };
  }

  renderAllCharts(timeRange = 'this-month') {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet');
      return;
    }

    this.renderCategoryDoughnut(timeRange);
    this.renderDailySpending(timeRange);
    this.renderCashflowComparison(timeRange);
    this.renderTaskDistribution();
  }

  // --- CHART 1: Category Doughnut ---
  renderCategoryDoughnut(timeRange) {
    const canvas = document.getElementById('chart-category-doughnut');
    if (!canvas) return;

    if (this.donutChart) {
      this.donutChart.destroy();
    }

    const expenses = window.storage.getExpenses().filter(e => e.type === 'expense');
    const filtered = this.filterByRange(expenses, timeRange);

    const categoryTotals = {};
    filtered.forEach(e => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.amount);
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (labels.length === 0) {
      labels.push('No Expenses');
      data.push(1);
    }

    const colors = [
      '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9',
      '#8b5cf6', '#ec4899', '#14b8a6', '#3b82f6', '#84cc16'
    ];

    const ctx = canvas.getContext('2d');
    const tc = this.getThemeColors();

    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#0f1623'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: tc.textColor,
              font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
              padding: 12,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: tc.tooltipBg,
            titleColor: tc.tooltipTitle,
            bodyColor: tc.tooltipBody,
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                return ` ${window.storage.formatMoney(val)}`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // --- CHART 2: Daily Spending Timeline (Last 14 Days) ---
  renderDailySpending(timeRange) {
    const canvas = document.getElementById('chart-daily-spending');
    if (!canvas) return;

    if (this.dailySpendChart) {
      this.dailySpendChart.destroy();
    }

    const expenses = window.storage.getExpenses().filter(e => e.type === 'expense');

    // Generate last 14 days labels
    const days = [];
    const dateLabels = [];
    const totals = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      days.push(dateKey);
      dateLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      // Sum expenses on this day
      const dayTotal = expenses
        .filter(e => (e.date || '').startsWith(dateKey))
        .reduce((sum, item) => sum + Number(item.amount), 0);
      totals.push(dayTotal);
    }

    const tc = this.getThemeColors();
    const ctx = canvas.getContext('2d');

    // Create subtle gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(244, 63, 94, 0.45)');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

    this.dailySpendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dateLabels,
        datasets: [{
          label: 'Daily Spend',
          data: totals,
          borderColor: '#f43f5e',
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#f43f5e',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tc.tooltipBg,
            titleColor: tc.tooltipTitle,
            bodyColor: tc.tooltipBody,
            callbacks: {
              label: (context) => ` Spent: ${window.storage.formatMoney(context.raw || 0)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tc.textColor, font: { size: 11 } }
          },
          y: {
            grid: { color: tc.gridColor },
            ticks: {
              color: tc.textColor,
              font: { size: 11 },
              callback: (val) => `${window.storage.getCurrencySymbol()}${val}`
            }
          }
        }
      }
    });
  }

  // --- CHART 3: Cashflow (Income vs Expense) ---
  renderCashflowComparison(timeRange) {
    const canvas = document.getElementById('chart-cashflow-comparison');
    if (!canvas) return;

    if (this.cashflowChart) {
      this.cashflowChart.destroy();
    }

    const expenses = window.storage.getExpenses();
    const filtered = this.filterByRange(expenses, timeRange);

    const totalIncome = filtered
      .filter(e => e.type === 'income')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalExpense = filtered
      .filter(e => e.type === 'expense')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const tc = this.getThemeColors();
    const ctx = canvas.getContext('2d');

    this.cashflowChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Income (Inflow)', 'Expenses (Outflow)'],
        datasets: [{
          label: 'Total',
          data: [totalIncome, totalExpense],
          backgroundColor: ['#10b981', '#f43f5e'],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tc.tooltipBg,
            titleColor: tc.tooltipTitle,
            bodyColor: tc.tooltipBody,
            callbacks: {
              label: (context) => ` Amount: ${window.storage.formatMoney(context.raw || 0)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tc.textColor, font: { weight: 600 } }
          },
          y: {
            grid: { color: tc.gridColor },
            ticks: {
              color: tc.textColor,
              callback: (val) => `${window.storage.getCurrencySymbol()}${val}`
            }
          }
        }
      }
    });
  }

  // --- CHART 4: Tasks Distribution by Category ---
  renderTaskDistribution() {
    const canvas = document.getElementById('chart-tasks-distribution');
    if (!canvas) return;

    if (this.taskCatChart) {
      this.taskCatChart.destroy();
    }

    const tasks = window.storage.getTasks();
    const catMap = {};
    tasks.forEach(t => {
      const cat = t.category || 'General';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const labels = Object.keys(catMap);
    const data = Object.values(catMap);

    const tc = this.getThemeColors();
    const ctx = canvas.getContext('2d');

    this.taskCatChart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(99, 102, 241, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(14, 165, 233, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(244, 63, 94, 0.7)'
          ],
          borderWidth: 1,
          borderColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#0f1623'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: tc.textColor, usePointStyle: true, font: { size: 11 } }
          }
        },
        scales: {
          r: {
            ticks: { display: false },
            grid: { color: tc.gridColor }
          }
        }
      }
    });
  }

  filterByRange(items, range) {
    const now = new Date();
    if (range === 'this-month') {
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      return items.filter(i => {
        const d = new Date(i.date || i.createdAt);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      });
    } else if (range === 'last-30') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return items.filter(i => new Date(i.date || i.createdAt) >= cutoff);
    }
    return items;
  }
}

window.charts = new ChartEngine();
