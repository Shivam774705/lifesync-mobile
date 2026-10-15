/**
 * LifeSync — Main Application Coordinator & Orchestrator
 * View navigation, unified dashboard rendering, keyboard shortcuts, and reactive settings.
 */

class AppCoordinator {
  constructor() {
    this.currentView = 'dashboard';
    this.init();
  }

  init() {
    this.applyPersistedTheme();
    this.bindNavigation();
    this.bindHeaderActions();
    this.bindSettingsTab();
    this.bindKeyboardShortcuts();
    this.startLiveClock();

    // Initialize submodules
    window.tasks.init();
    window.expenses.init();
    window.lifecoach.init();

    // Render initial unified dashboard
    this.refreshDashboard();

    // Sync currency dropdown with stored setting
    const s = window.storage.getSettings();
    const currSelect = document.getElementById('currency-select');
    if (currSelect) currSelect.value = s.currency || 'INR';
  }

  // --- THEME MANAGEMENT ---
  applyPersistedTheme() {
    const s = window.storage.getSettings();
    const theme = s.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);

    const s = window.storage.getSettings();
    s.theme = next;
    window.storage.saveSettings(s);

    window.ui.playSound('click');
    window.ui.showToast(`Switched to ${next} theme`, 'info');

    // Re-render charts with new theme colors
    if (this.currentView === 'analytics') {
      window.charts.renderAllCharts();
    }
  }

  // --- VIEW NAVIGATION ---
  bindNavigation() {
    const navButtons = document.querySelectorAll('.nav-link, .bnav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetView = e.currentTarget.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    // Mobile Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('app-sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Quick Add Buttons in Sidebar
    document.getElementById('btn-quick-add-task')?.addEventListener('click', () => this.openNewTaskModal());
    document.getElementById('btn-quick-add-expense')?.addEventListener('click', () => this.openNewExpenseModal());
    document.getElementById('btn-add-task-modal')?.addEventListener('click', () => this.openNewTaskModal());
    document.getElementById('btn-add-expense-modal')?.addEventListener('click', () => this.openNewExpenseModal());

    // Mobile Install / APK Modal
    document.getElementById('btn-install-apk-prompt')?.addEventListener('click', () => this.openInstallModal());

    // PWA Install Prompt
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    document.getElementById('btn-trigger-browser-install')?.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          window.ui.showToast('LifeSync installed to home screen!', 'success');
        }
        deferredPrompt = null;
        this.closeModals();
      } else {
        alert('To install directly onto your Android phone: Open this link in Chrome, tap the 3 dots (⋮) in the top-right corner, and tap "Install app" or "Add to Home screen"!');
      }
    });
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update Sidebar Nav Links
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    // Update Panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`view-${viewName}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // Update Page Header Title
    const titles = {
      dashboard: 'Dashboard',
      tasks: 'Task Tracker Hub',
      expenses: 'Expense & Budget Monitor',
      habits: 'Habits & Quit Smoking',
      parttime: 'Part-Time Job & Daily Earnings',
      lifecoach: 'Life Mastery, English & Time Audit',
      analytics: 'Analytics & Insights',
      settings: 'Settings & Data Backup'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[viewName] || 'Dashboard';

    // Sync mobile bottom nav buttons
    document.querySelectorAll('.bnav-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === viewName);
    });

    // Close mobile sidebar if open
    document.getElementById('app-sidebar')?.classList.remove('open');

    // Trigger specific view updates
    if (viewName === 'dashboard') {
      this.refreshDashboard();
    } else if (viewName === 'tasks') {
      window.tasks.renderTasks();
    } else if (viewName === 'expenses') {
      window.expenses.renderExpenses();
    } else if (viewName === 'habits' || viewName === 'parttime' || viewName === 'lifecoach') {
      window.lifecoach?.renderAll();
    } else if (viewName === 'analytics') {
      this.refreshAnalytics();
    } else if (viewName === 'settings') {
      this.refreshSettingsInputs();
    }
  }

  // --- UNIFIED DASHBOARD REFRESH ---
  refreshDashboard() {
    const tasks = window.storage.getTasks();
    const expenses = window.storage.getExpenses();
    const settings = window.storage.getSettings();
    const monthlyBudget = Number(settings.monthlyBudget) || 30000;

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // 1. Task Metrics
    const todayTasks = tasks.filter(t => t.dueDate === todayStr);
    const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;
    const allPending = tasks.filter(t => t.status !== 'completed').length;
    const urgentTasks = tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed');

    const kpiTasksVal = document.getElementById('kpi-today-tasks');
    const kpiTasksSub = document.getElementById('kpi-today-tasks-sub');
    const kpiTasksBar = document.getElementById('kpi-tasks-bar');
    if (kpiTasksVal) kpiTasksVal.textContent = `${todayCompleted} / ${todayTasks.length}`;
    if (kpiTasksSub) kpiTasksSub.textContent = `${todayCompleted} completed (${todayTasks.length - todayCompleted} remaining)`;
    if (kpiTasksBar) {
      const pct = todayTasks.length > 0 ? (todayCompleted / todayTasks.length) * 100 : 0;
      kpiTasksBar.style.width = `${pct}%`;
    }

    // 2. Financial Metrics for current month
    const thisMonthExp = expenses.filter(e => {
      const d = new Date(e.date || e.createdAt);
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    });

    const spentMonth = thisMonthExp
      .filter(e => e.type === 'expense')
      .reduce((s, item) => s + Number(item.amount), 0);

    const incomeMonth = thisMonthExp
      .filter(e => e.type === 'income')
      .reduce((s, item) => s + Number(item.amount), 0);

    const netSavings = incomeMonth - spentMonth;
    const remainingBudget = monthlyBudget - spentMonth;

    // Update KPI Card 2: Expenses
    const kpiMonthExp = document.getElementById('kpi-month-expenses');
    const kpiBudgetRem = document.getElementById('kpi-budget-remaining');
    const kpiExpBar = document.getElementById('kpi-expenses-bar');
    if (kpiMonthExp) kpiMonthExp.textContent = window.storage.formatMoney(spentMonth);
    if (kpiBudgetRem) kpiBudgetRem.textContent = `Remaining: ${window.storage.formatMoney(remainingBudget)}`;
    if (kpiExpBar) {
      const bPct = Math.min(100, (spentMonth / monthlyBudget) * 100);
      kpiExpBar.style.width = `${bPct}%`;
    }

    // Update KPI Card 3: Income & Savings
    const kpiMonthInc = document.getElementById('kpi-month-income');
    const kpiNetSav = document.getElementById('kpi-net-savings');
    const kpiSavBar = document.getElementById('kpi-savings-bar');
    if (kpiMonthInc) kpiMonthInc.textContent = window.storage.formatMoney(incomeMonth);
    if (kpiNetSav) kpiNetSav.textContent = `Net Savings: ${window.storage.formatMoney(netSavings)}`;
    if (kpiSavBar) {
      const sPct = incomeMonth > 0 ? Math.max(0, Math.min(100, (netSavings / incomeMonth) * 100)) : 0;
      kpiSavBar.style.width = `${sPct}%`;
    }

    // Hero headline updates
    const heroPending = document.getElementById('hero-pending-count');
    const heroBudget = document.getElementById('hero-budget-status');
    if (heroPending) heroPending.textContent = `${todayTasks.length - todayCompleted} tasks`;
    if (heroBudget) heroBudget.textContent = window.storage.formatMoney(remainingBudget);

    // 3. Render Dashboard Priority Task List
    this.renderDashboardTasks(urgentTasks, todayTasks);

    // 4. Render Dashboard Spending Breakdown & Recent Ledger
    this.renderDashboardFinance(thisMonthExp, spentMonth, monthlyBudget);

    // Update Sidebar & Badges
    window.tasks.updateTaskCounters();
    window.expenses.renderBudgetHealth();
    window.lifecoach?.updateBadges();
  }

  renderDashboardTasks(urgentTasks, todayTasks) {
    const container = document.getElementById('dash-task-container');
    const countBadge = document.getElementById('dash-urgent-count');
    if (!container) return;

    // Combined unique list of Urgent or Due Today
    const displayList = [...urgentTasks];
    todayTasks.forEach(t => {
      if (!displayList.some(item => item.id === t.id)) {
        displayList.push(t);
      }
    });

    if (countBadge) countBadge.textContent = `${displayList.filter(t => t.status !== 'completed').length} pending`;

    if (displayList.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 28px 10px; color: var(--text-muted);">
          <span style="font-size: 24px;">🎉</span>
          <p style="font-weight: 600; color: var(--text-main); margin-top: 6px;">All clear for today!</p>
          <p style="font-size: 12px;">No urgent or pending tasks scheduled.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = displayList.slice(0, 5).map(task => {
      const isDone = task.status === 'completed';
      return `
        <div class="task-item-card ${isDone ? 'completed' : ''}" style="padding: 10px 14px;">
          <div class="custom-checkbox ${isDone ? 'checked' : ''}" onclick="window.tasks.toggleTaskComplete('${task.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div class="task-content-col">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span class="task-title" style="font-size: 13px;">${window.tasks.escapeHtml(task.title)}</span>
              <span class="priority-badge priority-${task.priority}" style="font-size: 10px; padding: 2px 6px;">${task.priority}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-subtle); margin-top: 3px;">
              ${task.category} • ${task.dueDate ? 'Due ' + task.dueDate : 'No date'}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Quick Add Task Form in Dashboard
    const quickForm = document.getElementById('form-dash-quick-task');
    if (quickForm && !quickForm.hasQuickListener) {
      quickForm.hasQuickListener = true;
      quickForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('dash-quick-task-title');
        const title = input.value.trim();
        if (title) {
          window.storage.addTask({
            title,
            priority: 'high',
            category: 'Personal',
            dueDate: new Date().toISOString().split('T')[0]
          });
          input.value = '';
          window.ui.playSound('click');
          window.ui.showToast('Task added for today', 'success');
          this.refreshDashboard();
        }
      });
    }
  }

  renderDashboardFinance(monthTransactions, totalSpent, monthlyBudget) {
    // Top Categories Mini Progress
    const catContainer = document.getElementById('dash-category-spend');
    if (catContainer) {
      const catTotals = {};
      monthTransactions.filter(t => t.type === 'expense').forEach(e => {
        catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
      });

      const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);

      if (sortedCats.length === 0) {
        catContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 12px; padding: 8px 0;">No expenses logged this month yet.</div>`;
      } else {
        catContainer.innerHTML = sortedCats.map(([cat, amt]) => {
          const pct = Math.round((amt / (totalSpent || 1)) * 100);
          return `
            <div class="cat-progress-item">
              <div class="cat-progress-meta">
                <span>${cat}</span>
                <span>${window.storage.formatMoney(amt)} (${pct}%)</span>
              </div>
              <div class="progress-bar-container" style="height: 5px;">
                <div class="progress-bar-fill progress-rose" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Recent 4 Transactions
    const transContainer = document.getElementById('dash-trans-container');
    if (transContainer) {
      const recent = [...monthTransactions].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 4);

      if (recent.length === 0) {
        transContainer.innerHTML = `<div style="color: var(--text-subtle); font-size: 12px; padding: 10px 0;">No recent transactions.</div>`;
      } else {
        transContainer.innerHTML = recent.map(r => {
          const isInc = r.type === 'income';
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
              <div style="display: flex; flex-direction: column;">
                <strong style="font-size: 13px; color: var(--text-main);">${window.tasks.escapeHtml(r.title)}</strong>
                <span style="font-size: 11px; color: var(--text-subtle);">${r.category} • ${r.paymentMethod || 'UPI'}</span>
              </div>
              <div class="table-amount ${isInc ? 'text-emerald' : 'text-rose'}" style="font-size: 13px;">
                ${isInc ? '+' : '-'}${window.storage.formatMoney(r.amount)}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // --- ANALYTICS VIEW REFRESH ---
  refreshAnalytics() {
    const rangePills = document.querySelectorAll('#analytics-range-pills .filter-pill');
    let currentRange = 'this-month';

    rangePills.forEach(pill => {
      if (pill.classList.contains('active')) {
        currentRange = pill.getAttribute('data-range');
      }
      pill.onclick = (e) => {
        rangePills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const selectedRange = e.currentTarget.getAttribute('data-range');
        this.updateAnalyticsStats(selectedRange);
        window.charts.renderAllCharts(selectedRange);
      };
    });

    this.updateAnalyticsStats(currentRange);
    window.charts.renderAllCharts(currentRange);
  }

  updateAnalyticsStats(timeRange) {
    const expenses = window.storage.getExpenses();
    const tasks = window.storage.getTasks();
    const filtered = window.charts.filterByRange(expenses, timeRange);

    const expenseItems = filtered.filter(e => e.type === 'expense');
    const incomeItems = filtered.filter(e => e.type === 'income');

    const totalExp = expenseItems.reduce((s, item) => s + Number(item.amount), 0);
    const totalInc = incomeItems.reduce((s, item) => s + Number(item.amount), 0);

    // Top Category
    const catMap = {};
    expenseItems.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const topCatEl = document.getElementById('stat-top-cat');
    const topCatSub = document.getElementById('stat-top-cat-amount');
    if (sortedCats.length > 0) {
      topCatEl.textContent = sortedCats[0][0];
      const p = totalExp > 0 ? Math.round((sortedCats[0][1] / totalExp) * 100) : 0;
      topCatSub.textContent = `${window.storage.formatMoney(sortedCats[0][1])} (${p}% of spend)`;
    } else {
      topCatEl.textContent = 'None';
      topCatSub.textContent = '₹0 (0%)';
    }

    // Daily Average (approx across 15 active days or range)
    const dailyAvg = Math.round(totalExp / 15);
    const dailyAvgEl = document.getElementById('stat-daily-avg');
    if (dailyAvgEl) dailyAvgEl.textContent = window.storage.formatMoney(dailyAvg);

    // Savings Rate: (Income - Expenses) / Income * 100%
    const savings = totalInc - totalExp;
    const savingsRate = totalInc > 0 ? Math.round((savings / totalInc) * 100) : 0;
    const savRateEl = document.getElementById('stat-savings-rate');
    const savRateSub = document.getElementById('stat-savings-rate-sub');
    if (savRateEl) {
      savRateEl.textContent = `${savingsRate}%`;
      savRateEl.className = savingsRate >= 20 ? 'stat-card-val text-emerald' : 'stat-card-val text-amber';
    }
    if (savRateSub) savRateSub.textContent = `Net: ${window.storage.formatMoney(savings)}`;

    // Task Velocity: Completed / Total tasks
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskVelocity = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
    const taskVelEl = document.getElementById('stat-task-velocity');
    const taskVelSub = document.getElementById('stat-task-velocity-sub');
    if (taskVelEl) taskVelEl.textContent = `${taskVelocity}%`;
    if (taskVelSub) taskVelSub.textContent = `${completedTasks} of ${tasks.length} tasks completed`;
  }

  // --- SETTINGS TAB & CONTROLS ---
  bindSettingsTab() {
    // Currency Switcher in Header & Settings
    const headerCurr = document.getElementById('currency-select');
    const settingsCurr = document.getElementById('settings-currency-select');
    const budgetCurrTag = document.getElementById('settings-budget-curr-tag');

    const handleCurrencyChange = (newVal) => {
      const s = window.storage.getSettings();
      s.currency = newVal;
      window.storage.saveSettings(s);
      if (headerCurr) headerCurr.value = newVal;
      if (settingsCurr) settingsCurr.value = newVal;
      if (budgetCurrTag) budgetCurrTag.textContent = window.storage.getCurrencySymbol();

      window.ui.playSound('click');
      window.ui.showToast(`Currency updated to ${newVal}`, 'success');
      this.refreshDashboard();
      window.expenses.renderExpenses();
    };

    if (headerCurr) headerCurr.addEventListener('change', (e) => handleCurrencyChange(e.target.value));
    if (settingsCurr) settingsCurr.addEventListener('change', (e) => handleCurrencyChange(e.target.value));

    // Sound effects toggle in header & settings
    const btnSound = document.getElementById('btn-sound-toggle');
    const soundCheck = document.getElementById('settings-sound-check');

    const toggleSoundState = () => {
      const s = window.storage.getSettings();
      s.soundEnabled = !s.soundEnabled;
      window.storage.saveSettings(s);
      if (soundCheck) soundCheck.checked = s.soundEnabled;
      window.ui.showToast(`Sound feedback ${s.soundEnabled ? 'enabled' : 'muted'}`, 'info');
      if (s.soundEnabled) window.ui.playSound('click');
    };

    if (btnSound) btnSound.addEventListener('click', toggleSoundState);
    if (soundCheck) soundCheck.addEventListener('change', toggleSoundState);

    // Theme toggle button
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => this.toggleTheme());

    // Monthly Budget input
    const budgetInput = document.getElementById('settings-monthly-budget');
    if (budgetInput) {
      budgetInput.addEventListener('change', (e) => {
        const val = Number(e.target.value);
        if (val > 0) {
          const s = window.storage.getSettings();
          s.monthlyBudget = val;
          window.storage.saveSettings(s);
          window.ui.showToast('Monthly budget limit updated', 'success');
          this.refreshDashboard();
          window.expenses.renderBudgetHealth();
        }
      });
    }

    // Export JSON Backup
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      window.storage.exportJSON();
      window.ui.showToast('Backup JSON exported', 'success');
    });

    // Import JSON Backup
    const fileImport = document.getElementById('file-import-json');
    if (fileImport) {
      fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          window.storage.importJSON(file,
            () => {
              window.ui.showToast('Backup restored successfully!', 'success');
              window.ui.playSound('complete');
              this.refreshDashboard();
              window.tasks.renderTasks();
              window.expenses.renderExpenses();
            },
            (errMsg) => window.ui.showToast(errMsg, 'error')
          );
        }
      });
    }

    // Export CSVs
    document.getElementById('btn-export-expenses-csv')?.addEventListener('click', () => window.storage.exportExpensesCSV());
    document.getElementById('btn-export-tasks-csv')?.addEventListener('click', () => window.storage.exportTasksCSV());

    // Load Demo Data
    document.getElementById('btn-load-sample-data')?.addEventListener('click', () => {
      if (confirm('Load demo tasks and expenses into your workspace?')) {
        window.storage.loadSampleData();
        window.ui.playSound('money');
        window.ui.showToast('Sample demo data loaded!', 'success');
        this.refreshDashboard();
        window.tasks.renderTasks();
        window.expenses.renderExpenses();
      }
    });

    // Reset All Data
    document.getElementById('btn-reset-all-data')?.addEventListener('click', () => {
      if (confirm('⚠️ WARNING: This will permanently delete all your tasks and expenses stored in this browser. Continue?')) {
        window.storage.resetAllData();
        window.ui.showToast('Workspace reset to empty', 'info');
        this.refreshDashboard();
        window.tasks.renderTasks();
        window.expenses.renderExpenses();
      }
    });
  }

  refreshSettingsInputs() {
    const s = window.storage.getSettings();
    const currSelect = document.getElementById('settings-currency-select');
    const budgetInput = document.getElementById('settings-monthly-budget');
    const soundCheck = document.getElementById('settings-sound-check');
    const budgetCurrTag = document.getElementById('settings-budget-curr-tag');

    if (currSelect) currSelect.value = s.currency || 'INR';
    if (budgetInput) budgetInput.value = s.monthlyBudget || 30000;
    if (soundCheck) soundCheck.checked = s.soundEnabled !== false;
    if (budgetCurrTag) budgetCurrTag.textContent = window.storage.getCurrencySymbol();
  }

  // --- KEYBOARD SHORTCUTS & MODAL HELPERS ---
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          this.closeModals();
        }
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        this.openNewTaskModal();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        this.openNewExpenseModal();
      } else if (e.key === 'Escape') {
        this.closeModals();
      }
    });

    // Close on backdrop click
    document.getElementById('modal-task-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-task-backdrop') this.closeModals();
    });
    document.getElementById('modal-expense-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-expense-backdrop') this.closeModals();
    });
  }

  openNewTaskModal() {
    window.tasks.openCreateModal('todo');
  }

  openNewTaskModalWithStatus(status) {
    window.tasks.openCreateModal(status);
  }

  openNewExpenseModal() {
    window.expenses.openCreateModal('expense');
  }

  openInstallModal() {
    document.getElementById('modal-install-backdrop')?.classList.add('active');
  }

  closeModals() {
    document.getElementById('modal-task-backdrop')?.classList.remove('active');
    document.getElementById('modal-expense-backdrop')?.classList.remove('active');
    document.getElementById('modal-install-backdrop')?.classList.remove('active');
  }

  // --- LIVE CLOCK ---
  startLiveClock() {
    const update = () => {
      const el = document.getElementById('live-datetime');
      if (el) {
        const now = new Date();
        const dateOptions = { weekday: 'long', month: 'short', day: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        el.textContent = `${now.toLocaleDateString('en-US', dateOptions)} • ${now.toLocaleTimeString('en-US', timeOptions)}`;
      }
    };
    update();
    setInterval(update, 30000);
  }

  bindHeaderActions() {}
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppCoordinator();
});
