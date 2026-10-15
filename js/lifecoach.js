/**
 * LifeSync — Life Mastery, Habits & Part-Time Job Subsystem
 * Tracks:
 * - Quit smoking streaks, money saved & health recovery
 * - Money waste & unnecessary impulse spending detection
 * - Part-time job daily earnings vs fuel/operating spends & net take-home
 * - Daily schedule time audits & English speaking drills
 */

class LifeCoachManager {
  constructor() {
    this.smokingCostPerDay = 150; // Daily average for cigarettes
  }

  init() {
    this.bindEvents();
    this.renderAll();
  }

  bindEvents() {
    // Check-in Smoke-free button
    document.getElementById('btn-checkin-smoke-free')?.addEventListener('click', () => {
      this.logSmokeFreeVictory();
    });

    // English drill mark complete button
    document.getElementById('btn-log-english-practice')?.addEventListener('click', () => {
      this.logEnglishPractice();
    });

    // Part-time quick buttons
    document.getElementById('btn-log-parttime-income')?.addEventListener('click', () => {
      this.openPartTimeModal('income');
    });

    document.getElementById('btn-log-parttime-expense')?.addEventListener('click', () => {
      this.openPartTimeModal('expense');
    });

    // Add new custom habit
    document.getElementById('btn-add-habit-modal')?.addEventListener('click', () => {
      const name = prompt('Enter a new positive habit or discipline goal:');
      if (name && name.trim()) {
        const habits = window.storage.getHabits();
        habits.push({
          id: 'habit_' + Date.now(),
          name: name.trim(),
          category: 'custom',
          targetDays: 30,
          streakDays: 0,
          lastLoggedDate: '',
          history: {}
        });
        window.storage.saveHabits(habits);
        window.ui.showToast('New habit added to checklist!', 'success');
        this.renderHabits();
      }
    });

    // Export parttime shift history
    document.getElementById('btn-export-pt-history')?.addEventListener('click', () => {
      this.exportPartTimeHistoryCSV();
    });
  }

  renderAll() {
    this.renderHabits();
    this.renderWasteAnalysis();
    this.renderPartTimeStats();
    this.updateBadges();
  }

  // --- 1. HABITS & QUIT SMOKING ---
  renderHabits() {
    const habits = window.storage.getHabits();
    const container = document.getElementById('habit-cards-container');
    const todayStr = new Date().toISOString().split('T')[0];

    // Find smoking habit
    const smokeHabit = habits.find(h => h.id === 'habit_smoking');
    if (smokeHabit) {
      const streak = smokeHabit.streakDays || 0;
      const savedMoney = streak * this.smokingCostPerDay;
      const timeSavedHours = (streak * 0.5).toFixed(1); // 30 mins saved daily not smoking
      const yearlySavings = this.smokingCostPerDay * 365;

      const headline = document.getElementById('smoke-streak-headline');
      const desc = document.getElementById('smoke-saved-desc');
      const streakVal = document.getElementById('smoke-streak-days');
      const savedVal = document.getElementById('smoke-saved-amount');
      const timeVal = document.getElementById('smoke-time-saved');
      const yearlyVal = document.getElementById('smoke-yearly-projection');

      if (headline) headline.textContent = streak > 0 ? `🔥 Smoke-Free for ${streak} Consecutive Days!` : 'Ready to start Day 1 Smoke-Free!';
      if (desc && savedVal && timeVal) {
        savedVal.textContent = window.storage.formatMoney(savedMoney);
        timeVal.textContent = `${timeSavedHours} hours`;
      }
      if (streakVal) streakVal.textContent = `${streak} Days`;
      if (yearlyVal) yearlyVal.textContent = window.storage.formatMoney(yearlySavings);
    }

    if (!container) return;

    if (habits.length === 0) {
      container.innerHTML = `<div class="empty-state">No habits defined. Tap "+ New Habit" to begin.</div>`;
      return;
    }

    container.innerHTML = habits.map(h => {
      const isDoneToday = h.history && !!h.history[todayStr];
      const streak = h.streakDays || 0;
      const target = h.targetDays || 30;
      const pct = Math.min(100, Math.round((streak / target) * 100));

      return `
        <div class="habit-card ${isDoneToday ? 'done-today' : ''}">
          <div class="habit-check-circle ${isDoneToday ? 'active' : ''}" onclick="window.lifecoach.toggleHabit('${h.id}')" title="Tap to toggle today">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="habit-details">
            <div class="habit-name-row">
              <span class="habit-title">${window.tasks.escapeHtml(h.name)}</span>
              <span class="habit-streak-pill">${streak} Day Streak 🔥</span>
            </div>
            <div class="habit-progress-bar">
              <div class="habit-fill" style="width: ${pct}%;"></div>
            </div>
            <div class="habit-meta-sub">
              <span>Goal: ${target} Days Challenge</span>
              <span>${pct}% completed</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  toggleHabit(habitId) {
    const updated = window.storage.toggleHabitToday(habitId);
    if (updated) {
      const todayStr = new Date().toISOString().split('T')[0];
      const done = updated.history && updated.history[todayStr];
      if (done) {
        window.ui.playSound('complete');
        window.ui.triggerConfetti();
        window.ui.showToast(`Great job! Streak is now ${updated.streakDays} days! 🔥`, 'success');
      } else {
        window.ui.playSound('click');
        window.ui.showToast('Habit check-in undone', 'info');
      }
      this.renderHabits();
      this.updateBadges();
      window.app.refreshDashboard();
    }
  }

  logSmokeFreeVictory() {
    this.toggleHabit('habit_smoking');
  }

  logEnglishPractice() {
    const habits = window.storage.getHabits();
    let eng = habits.find(h => h.id === 'habit_english');
    if (!eng) {
      eng = {
        id: 'habit_english',
        name: 'English Speaking & Vocabulary Practice (25 mins)',
        category: 'skill',
        targetDays: 30,
        streakDays: 0,
        lastLoggedDate: '',
        history: {}
      };
      habits.push(eng);
      window.storage.saveHabits(habits);
    }
    this.toggleHabit('habit_english');
  }

  // --- 2. UNNECESSARY SPENDS & MONEY WASTE ANALYSIS ---
  renderWasteAnalysis() {
    const expenses = window.storage.getExpenses().filter(e => e.type === 'expense');
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    // Spends tagged as Habit_Smoking or Unnecessary
    const wasteItems = expenses.filter(e => {
      const d = new Date(e.date || e.createdAt);
      const isCurMonth = d.getMonth() === curMonth && d.getFullYear() === curYear;
      return isCurMonth && (e.category === 'Habit_Smoking' || e.category === 'Unnecessary');
    });

    const totalWasteMonth = wasteItems.reduce((acc, cur) => acc + Number(cur.amount), 0);

    const wastePill = document.getElementById('waste-count-pill');
    const wasteHeroMonth = document.getElementById('waste-spends-month');
    const wasteContainer = document.getElementById('waste-items-container');

    if (wastePill) wastePill.textContent = `${wasteItems.length} leaks recorded`;
    if (wasteHeroMonth) wasteHeroMonth.textContent = window.storage.formatMoney(totalWasteMonth);

    if (!wasteContainer) return;

    if (wasteItems.length === 0) {
      wasteContainer.innerHTML = `
        <div class="waste-clean-state">
          <span class="clean-icon">🛡️</span>
          <p class="clean-title">Zero Unnecessary Spends This Month!</p>
          <p class="clean-sub">Outstanding self-control. Every Rupee you didn't waste is compounding your freedom.</p>
        </div>
      `;
      return;
    }

    wasteContainer.innerHTML = wasteItems.slice(0, 6).map(item => {
      const isSmoke = item.category === 'Habit_Smoking';
      return `
        <div class="waste-item-row">
          <div class="waste-badge-icon ${isSmoke ? 'icon-smoke' : 'icon-waste'}">
            ${isSmoke ? '🚬' : '💸'}
          </div>
          <div class="waste-body">
            <div class="waste-header-line">
              <span class="waste-title">${window.tasks.escapeHtml(item.title)}</span>
              <span class="waste-amount text-rose">-${window.storage.formatMoney(item.amount)}</span>
            </div>
            <div class="waste-sub-meta">
              <span>${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>${item.paymentMethod || 'UPI'}</span>
              ${item.notes ? `<span>• ${window.tasks.escapeHtml(item.notes)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- 3. PART-TIME JOB & DAILY EARNINGS ---
  renderPartTimeStats() {
    const allRecords = window.storage.getExpenses();
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    // Part time transactions this month
    const ptRecords = allRecords.filter(r => {
      const d = new Date(r.date || r.createdAt);
      const isCurMonth = d.getMonth() === curMonth && d.getFullYear() === curYear;
      return isCurMonth && (r.category === 'Parttime_Income' || r.category === 'Parttime_Expense');
    });

    const grossEarnings = ptRecords
      .filter(r => r.type === 'income' && r.category === 'Parttime_Income')
      .reduce((s, r) => s + Number(r.amount), 0);

    const ptSpends = ptRecords
      .filter(r => r.type === 'expense' && r.category === 'Parttime_Expense')
      .reduce((s, r) => s + Number(r.amount), 0);

    const netTakeHome = grossEarnings - ptSpends;
    const shiftCount = ptRecords.filter(r => r.type === 'income' && r.category === 'Parttime_Income').length;
    const avgPerShift = shiftCount > 0 ? Math.round(netTakeHome / shiftCount) : 0;
    const marginPct = grossEarnings > 0 ? Math.round((netTakeHome / grossEarnings) * 100) : 0;

    // Update KPI UI
    const kpiGross = document.getElementById('pt-kpi-gross');
    const kpiShifts = document.getElementById('pt-kpi-shifts');
    const kpiExpense = document.getElementById('pt-kpi-expense');
    const kpiNet = document.getElementById('pt-kpi-net');
    const kpiMargin = document.getElementById('pt-kpi-margin');
    const kpiAvg = document.getElementById('pt-kpi-avg');

    if (kpiGross) kpiGross.textContent = window.storage.formatMoney(grossEarnings);
    if (kpiShifts) kpiShifts.textContent = `${shiftCount} shifts recorded`;
    if (kpiExpense) kpiExpense.textContent = window.storage.formatMoney(ptSpends);
    if (kpiNet) {
      kpiNet.textContent = window.storage.formatMoney(netTakeHome);
      kpiNet.className = netTakeHome >= 0 ? 'kpi-value text-emerald' : 'kpi-value text-rose';
    }
    if (kpiMargin) kpiMargin.textContent = `${marginPct}% Net Profit Margin`;
    if (kpiAvg) kpiAvg.textContent = `${window.storage.formatMoney(avgPerShift)} / shift`;

    // Render Part Time Shift Table
    this.renderPartTimeTable(ptRecords);
  }

  renderPartTimeTable(records) {
    const tbody = document.getElementById('pt-history-tbody');
    const countPill = document.getElementById('pt-history-count');
    if (!tbody) return;

    if (countPill) countPill.textContent = `${records.length} shifts & spends`;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
            No part-time shifts or expenses logged this month. Tap <strong>"+ Log Part-Time Earning"</strong> above.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map(r => {
      const isInc = r.type === 'income';
      const d = new Date(r.date || r.createdAt);
      const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      return `
        <tr>
          <td><span class="mono-text">${dateFormatted}</span></td>
          <td>
            <span class="trans-type-pill ${isInc ? 'pill-income' : 'pill-expense'}">
              ${isInc ? '⚡ Earning' : '🛵 Fuel/Spend'}
            </span>
          </td>
          <td>
            <strong>${window.tasks.escapeHtml(r.title)}</strong>
            ${r.notes ? `<div style="font-size: 11px; color: var(--text-muted);">${window.tasks.escapeHtml(r.notes)}</div>` : ''}
          </td>
          <td><span class="payment-method-chip">${r.paymentMethod || 'UPI'}</span></td>
          <td class="text-right">
            <strong class="${isInc ? 'text-emerald' : 'text-rose'}">
              ${isInc ? '+' : '-'}${window.storage.formatMoney(r.amount)}
            </strong>
          </td>
          <td class="text-center">
            <button class="btn btn-icon btn-sm" onclick="window.lifecoach.deletePartTimeRecord('${r.id}')" title="Delete record">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  deletePartTimeRecord(id) {
    if (confirm('Delete this part-time transaction?')) {
      window.storage.deleteExpense(id);
      window.ui.showToast('Part-time record deleted', 'info');
      this.renderPartTimeStats();
      this.renderWasteAnalysis();
      window.app.refreshDashboard();
      window.expenses.renderExpenses();
    }
  }

  openPartTimeModal(type) {
    window.app.openNewExpenseModal();
    const typeBtn = document.getElementById(type === 'income' ? 'tab-type-income' : 'tab-type-expense');
    typeBtn?.click();

    const catSelect = document.getElementById('exp-input-category');
    if (catSelect) {
      catSelect.value = type === 'income' ? 'Parttime_Income' : 'Parttime_Expense';
    }

    const titleInput = document.getElementById('exp-input-title');
    if (titleInput) {
      titleInput.value = type === 'income' ? 'Part-Time Shift Earning' : 'Fuel / Shift Expense';
    }
  }

  openQuickWasteModal() {
    window.app.openNewExpenseModal();
    const typeBtn = document.getElementById('tab-type-expense');
    typeBtn?.click();

    const catSelect = document.getElementById('exp-input-category');
    if (catSelect) {
      catSelect.value = 'Habit_Smoking';
    }

    const titleInput = document.getElementById('exp-input-title');
    if (titleInput) {
      titleInput.value = 'Cigarettes / Impulse Spend';
    }
  }

  exportPartTimeHistoryCSV() {
    const allRecords = window.storage.getExpenses();
    const ptRecords = allRecords.filter(r => r.category === 'Parttime_Income' || r.category === 'Parttime_Expense');

    if (ptRecords.length === 0) {
      window.ui.showToast('No part-time logs to export', 'error');
      return;
    }

    let csv = 'Date,Type,Category,Description,PaymentMethod,Amount,Notes\n';
    ptRecords.forEach(r => {
      csv += `"${r.date}","${r.type}","${r.category}","${(r.title||'').replace(/"/g, '""')}","${r.paymentMethod||''}","${r.amount}","${(r.notes||'').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifesync_parttime_shifts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.ui.showToast('Part-time CSV exported!', 'success');
  }

  updateBadges() {
    const habits = window.storage.getHabits();
    const smoke = habits.find(h => h.id === 'habit_smoking');
    const badgeWaste = document.getElementById('badge-waste-saved');
    if (badgeWaste && smoke) {
      badgeWaste.textContent = `Saved ₹${(smoke.streakDays || 0) * this.smokingCostPerDay}`;
    }

    // Part-time net badge
    const allRecords = window.storage.getExpenses();
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const ptRecords = allRecords.filter(r => {
      const d = new Date(r.date || r.createdAt);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });

    const gross = ptRecords
      .filter(r => r.type === 'income' && r.category === 'Parttime_Income')
      .reduce((s, r) => s + Number(r.amount), 0);
    const exp = ptRecords
      .filter(r => r.type === 'expense' && r.category === 'Parttime_Expense')
      .reduce((s, r) => s + Number(r.amount), 0);

    const badgePt = document.getElementById('badge-parttime-net');
    if (badgePt) {
      badgePt.textContent = window.storage.formatMoney(gross - exp);
    }
  }
}

window.lifecoach = new LifeCoachManager();
