/**
 * LifeSync — Expense Monitoring & Personal Finance Engine
 * Budget calculations, category breakdowns, ledger table, and cash flow tracking.
 */

class ExpenseManager {
  constructor() {
    this.typeFilter = 'all'; // 'all' | 'expense' | 'income'
    this.categoryFilter = 'all';
    this.paymentFilter = 'all';
    this.searchQuery = '';
  }

  init() {
    this.populateCategoryDropdowns();
    this.bindEvents();
    this.renderExpenses();
  }

  populateCategoryDropdowns() {
    // Populate filter dropdown
    const filterSelect = document.getElementById('expense-category-filter');
    if (filterSelect) {
      filterSelect.innerHTML = `<option value="all">All Categories</option>`;
      EXPENSE_CATEGORIES.forEach(c => {
        filterSelect.innerHTML += `<option value="${c.id}">${c.label}</option>`;
      });
      INCOME_CATEGORIES.forEach(c => {
        filterSelect.innerHTML += `<option value="${c.id}">${c.label}</option>`;
      });
    }

    // Populate modal category dropdown
    this.updateModalCategories('expense');
  }

  updateModalCategories(type) {
    const modalSelect = document.getElementById('exp-input-category');
    if (!modalSelect) return;

    modalSelect.innerHTML = '';
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    categories.forEach(c => {
      modalSelect.innerHTML += `<option value="${c.id}">${c.label}</option>`;
    });
  }

  bindEvents() {
    // Type Filter Pills (All / Expense / Income)
    const typePills = document.querySelectorAll('#expenses-type-pills .filter-pill');
    typePills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        typePills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.typeFilter = e.currentTarget.getAttribute('data-exp-type');
        this.renderExpenses();
      });
    });

    // Category Filter
    const catSelect = document.getElementById('expense-category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.categoryFilter = e.target.value;
        this.renderExpenses();
      });
    }

    // Payment Method Filter
    const paySelect = document.getElementById('expense-payment-filter');
    if (paySelect) {
      paySelect.addEventListener('change', (e) => {
        this.paymentFilter = e.target.value;
        this.renderExpenses();
      });
    }

    // Search query
    const searchInput = document.getElementById('expense-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderExpenses();
      });
    }

    // Transaction Type Tabs in Modal (Expense vs Income)
    const tabExpense = document.getElementById('tab-type-expense');
    const tabIncome = document.getElementById('tab-type-income');
    const typeInput = document.getElementById('exp-input-type');

    if (tabExpense && tabIncome) {
      tabExpense.addEventListener('click', () => {
        tabExpense.classList.add('active');
        tabIncome.classList.remove('active');
        typeInput.value = 'expense';
        this.updateModalCategories('expense');
      });
      tabIncome.addEventListener('click', () => {
        tabIncome.classList.add('active');
        tabExpense.classList.remove('active');
        typeInput.value = 'income';
        this.updateModalCategories('income');
      });
    }

    // Modal Form Submission
    const expForm = document.getElementById('form-expense');
    if (expForm) {
      expForm.addEventListener('submit', (e) => this.handleExpenseFormSubmit(e));
    }

    // Edit Budget Limit Button
    const btnEditBudget = document.getElementById('btn-edit-budget-limit');
    if (btnEditBudget) {
      btnEditBudget.addEventListener('click', () => {
        const curBudget = window.storage.getSettings().monthlyBudget || 30000;
        const sym = window.storage.getCurrencySymbol();
        const entered = prompt(`Set your target monthly spending budget (${sym}):`, curBudget);
        if (entered !== null && !isNaN(entered) && Number(entered) > 0) {
          const s = window.storage.getSettings();
          s.monthlyBudget = Number(entered);
          window.storage.saveSettings(s);
          window.ui.showToast(`Monthly budget set to ${window.storage.formatMoney(s.monthlyBudget)}`, 'success');
          this.renderBudgetHealth();
          window.app.refreshDashboard();
        }
      });
    }

    // Add Income / Expense top buttons
    const btnAddInc = document.getElementById('btn-add-income-top');
    if (btnAddInc) {
      btnAddInc.addEventListener('click', () => this.openCreateModal('income'));
    }
    const btnAddExp = document.getElementById('btn-add-expense-top');
    if (btnAddExp) {
      btnAddExp.addEventListener('click', () => this.openCreateModal('expense'));
    }
  }

  // --- FILTERING & DATA CALCULATIONS ---
  getFilteredExpenses() {
    let list = window.storage.getExpenses();

    if (this.typeFilter !== 'all') {
      list = list.filter(item => item.type === this.typeFilter);
    }

    if (this.categoryFilter !== 'all') {
      list = list.filter(item => item.category === this.categoryFilter);
    }

    if (this.paymentFilter !== 'all') {
      list = list.filter(item => item.paymentMethod === this.paymentFilter);
    }

    if (this.searchQuery) {
      list = list.filter(item =>
        (item.title && item.title.toLowerCase().includes(this.searchQuery)) ||
        (item.notes && item.notes.toLowerCase().includes(this.searchQuery)) ||
        (item.category && item.category.toLowerCase().includes(this.searchQuery))
      );
    }

    // Sort: Newest date first
    list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    return list;
  }

  // --- RENDER DISPATCHER ---
  renderExpenses() {
    this.renderBudgetHealth();
    this.renderLedgerTable();
  }

  // --- BUDGET HEALTH BANNER & GAUGES ---
  renderBudgetHealth() {
    const settings = window.storage.getSettings();
    const monthlyBudget = Number(settings.monthlyBudget) || 30000;
    const expenses = window.storage.getExpenses();

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // Total spent this month
    const thisMonthExpenses = expenses.filter(e => {
      if (e.type !== 'expense') return false;
      const d = new Date(e.date || e.createdAt);
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    });

    const totalSpentMonth = thisMonthExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = monthlyBudget - totalSpentMonth;
    const pct = Math.min(100, Math.round((totalSpentMonth / monthlyBudget) * 100));

    // Calculate Projected Spend
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const dailyRunRate = totalSpentMonth / (dayOfMonth || 1);
    const projectedSpend = Math.round(dailyRunRate * daysInMonth);

    // Update Banner elements
    const headingEl = document.getElementById('budget-heading-status');
    const mainBar = document.getElementById('main-budget-bar');
    const bannerTotal = document.getElementById('banner-budget-total');
    const bannerSpent = document.getElementById('banner-budget-spent');
    const bannerRemain = document.getElementById('banner-budget-remain');
    const bannerProjected = document.getElementById('banner-projected-spend');

    if (bannerTotal) bannerTotal.textContent = window.storage.formatMoney(monthlyBudget);
    if (bannerSpent) bannerSpent.textContent = window.storage.formatMoney(totalSpentMonth);
    if (bannerRemain) {
      bannerRemain.textContent = window.storage.formatMoney(Math.abs(remaining));
      bannerRemain.className = remaining < 0 ? 'stat-val text-rose' : 'stat-val text-emerald';
    }
    if (bannerProjected) {
      bannerProjected.textContent = window.storage.formatMoney(projectedSpend);
      bannerProjected.className = projectedSpend > monthlyBudget ? 'stat-val text-rose' : 'stat-val text-emerald';
    }

    if (headingEl) {
      if (remaining < 0) {
        headingEl.innerHTML = `⚠️ <span class="text-rose">Over budget by ${window.storage.formatMoney(Math.abs(remaining))}!</span> (${pct}%)`;
      } else {
        const leftPct = 100 - pct;
        headingEl.innerHTML = `You have <span class="text-emerald">${leftPct}%</span> of your budget remaining`;
      }
    }

    if (mainBar) {
      mainBar.style.width = `${pct}%`;
      if (pct > 85) {
        mainBar.style.background = 'var(--gradient-rose)';
        mainBar.style.boxShadow = '0 0 12px var(--rose-glow)';
      } else if (pct > 60) {
        mainBar.style.background = 'linear-gradient(135deg, #f59e0b, #e11d48)';
        mainBar.style.boxShadow = '0 0 12px var(--amber-glow)';
      } else {
        mainBar.style.background = 'var(--gradient-emerald)';
        mainBar.style.boxShadow = '0 0 12px var(--emerald-glow)';
      }
    }

    // Sidebar Mini Widget updates
    const sidePct = document.getElementById('side-budget-pct');
    const sideBar = document.getElementById('side-budget-bar');
    const sideSpent = document.getElementById('side-budget-spent');
    const sideTotal = document.getElementById('side-budget-total');
    const sideBadge = document.getElementById('badge-month-spend');

    if (sidePct) sidePct.textContent = `${pct}%`;
    if (sideBar) {
      sideBar.style.width = `${pct}%`;
      sideBar.style.background = pct > 85 ? 'var(--rose)' : 'var(--primary)';
    }
    if (sideSpent) sideSpent.textContent = window.storage.formatMoney(totalSpentMonth);
    if (sideTotal) sideTotal.textContent = `/ ${window.storage.formatMoney(monthlyBudget)}`;
    if (sideBadge) sideBadge.textContent = window.storage.formatMoney(totalSpentMonth);
  }

  // --- LEDGER TABLE RENDERING ---
  renderLedgerTable() {
    const list = this.getFilteredExpenses();
    const tbody = document.getElementById('expenses-tbody');
    const countEl = document.getElementById('ledger-count');
    const sumEl = document.getElementById('ledger-filtered-sum');

    if (countEl) countEl.textContent = `${list.length} records`;

    // Calculate sum of currently filtered
    const netSum = list.reduce((acc, cur) => {
      return cur.type === 'income' ? acc + Number(cur.amount) : acc - Number(cur.amount);
    }, 0);

    if (sumEl) {
      const sign = netSum >= 0 ? '+' : '-';
      sumEl.textContent = `${sign}${window.storage.formatMoney(Math.abs(netSum))}`;
      sumEl.className = netSum >= 0 ? 'text-emerald' : 'text-rose';
    }

    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 40px 20px; color: var(--text-muted);">
            <p style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">No transactions recorded</p>
            <p style="font-size: 13px; margin-bottom: 12px;">Add an expense or income to populate your ledger.</p>
            <button class="btn btn-emerald btn-sm" onclick="window.app.openNewExpenseModal()">+ Add Record</button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const isIncome = item.type === 'income';
      const catConfig = isIncome
        ? INCOME_CATEGORIES.find(c => c.id === item.category)
        : EXPENSE_CATEGORIES.find(c => c.id === item.category);

      const catLabel = catConfig ? catConfig.label : (item.category || 'General');

      // Date formatting
      let formattedDate = 'Recent';
      try {
        const d = new Date(item.date || item.createdAt);
        formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {}

      return `
        <tr>
          <td style="color: var(--text-muted); font-size: 13px;">${formattedDate}</td>
          <td>
            <span class="category-tag" style="font-weight: 600;">
              ${this.escapeHtml(catLabel)}
            </span>
          </td>
          <td>
            <strong style="color: var(--text-main);">${this.escapeHtml(item.title)}</strong>
            ${item.notes ? `<div style="font-size: 12px; color: var(--text-subtle); margin-top: 2px;">${this.escapeHtml(item.notes)}</div>` : ''}
          </td>
          <td>
            <span class="pay-badge">${this.escapeHtml(item.paymentMethod || 'UPI')}</span>
          </td>
          <td class="text-right table-amount ${isIncome ? 'text-emerald' : 'text-rose'}">
            ${isIncome ? '+' : '-'}${window.storage.formatMoney(item.amount)}
          </td>
          <td class="text-center">
            <div style="display: flex; gap: 6px; justify-content: center;">
              <button class="btn btn-icon btn-sm" onclick="window.expenses.openEditExpenseModal('${item.id}')" title="Edit Record">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button class="btn btn-icon btn-sm" onclick="window.expenses.confirmDeleteExpense('${item.id}')" title="Delete Record">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- MODAL FORM LOGIC ---
  openCreateModal(defaultType = 'expense') {
    document.getElementById('modal-expense-title').textContent = defaultType === 'income' ? 'Log Income' : 'Log Expense';
    document.getElementById('exp-edit-id').value = '';
    document.getElementById('form-expense').reset();

    const sym = window.storage.getCurrencySymbol();
    document.getElementById('exp-modal-curr-symbol').textContent = sym;

    // Set Default DateTime to current local minute
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    document.getElementById('exp-input-date').value = localISOTime;

    // Activate correct type tab
    const tabExpense = document.getElementById('tab-type-expense');
    const tabIncome = document.getElementById('tab-type-income');
    const typeInput = document.getElementById('exp-input-type');

    if (defaultType === 'income') {
      tabIncome.classList.add('active');
      tabExpense.classList.remove('active');
      typeInput.value = 'income';
      this.updateModalCategories('income');
    } else {
      tabExpense.classList.add('active');
      tabIncome.classList.remove('active');
      typeInput.value = 'expense';
      this.updateModalCategories('expense');
    }

    const backdrop = document.getElementById('modal-expense-backdrop');
    backdrop.classList.add('active');
    document.getElementById('exp-input-amount').focus();
  }

  openEditExpenseModal(id) {
    const expenses = window.storage.getExpenses();
    const item = expenses.find(e => e.id === id);
    if (!item) return;

    document.getElementById('modal-expense-title').textContent = 'Edit Record';
    document.getElementById('exp-edit-id').value = item.id;
    document.getElementById('exp-input-amount').value = item.amount;
    document.getElementById('exp-input-title').value = item.title;
    document.getElementById('exp-input-payment').value = item.paymentMethod || 'UPI';
    document.getElementById('exp-input-notes').value = item.notes || '';
    document.getElementById('exp-input-date').value = item.date ? item.date.slice(0, 16) : '';

    const tabExpense = document.getElementById('tab-type-expense');
    const tabIncome = document.getElementById('tab-type-income');
    const typeInput = document.getElementById('exp-input-type');

    if (item.type === 'income') {
      tabIncome.classList.add('active');
      tabExpense.classList.remove('active');
      typeInput.value = 'income';
      this.updateModalCategories('income');
    } else {
      tabExpense.classList.add('active');
      tabIncome.classList.remove('active');
      typeInput.value = 'expense';
      this.updateModalCategories('expense');
    }

    document.getElementById('exp-input-category').value = item.category;

    const backdrop = document.getElementById('modal-expense-backdrop');
    backdrop.classList.add('active');
  }

  handleExpenseFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('exp-edit-id').value;
    const type = document.getElementById('exp-input-type').value;
    const amount = parseFloat(document.getElementById('exp-input-amount').value);
    const category = document.getElementById('exp-input-category').value;
    const title = document.getElementById('exp-input-title').value.trim();
    const paymentMethod = document.getElementById('exp-input-payment').value;
    const date = document.getElementById('exp-input-date').value;
    const notes = document.getElementById('exp-input-notes').value.trim();

    if (!amount || amount <= 0 || !title) return;

    const payload = { type, amount, category, title, paymentMethod, date, notes };

    if (editId) {
      window.storage.updateExpense(editId, payload);
      window.ui.showToast('Transaction record updated', 'success');
    } else {
      window.storage.addExpense(payload);
      window.ui.showToast(`${type === 'income' ? 'Income' : 'Expense'} of ${window.storage.formatMoney(amount)} recorded`, 'success');
      window.ui.playSound('money');
    }

    window.app.closeModals();
    this.renderExpenses();
    window.app.refreshDashboard();
  }

  confirmDeleteExpense(id) {
    if (confirm('Delete this transaction record?')) {
      window.storage.deleteExpense(id);
      window.ui.playSound('click');
      window.ui.showToast('Transaction deleted', 'info');
      this.renderExpenses();
      window.app.refreshDashboard();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.expenses = new ExpenseManager();
