/**
 * LifeSync — Task Tracker Hub Engine
 * List View, Kanban Board, Subtasks checklist, Due-date intelligence, and Filters.
 */

class TaskManager {
  constructor() {
    this.currentFilter = 'all'; // 'all' | 'today' | 'upcoming' | 'urgent' | 'completed'
    this.categoryFilter = 'all';
    this.searchQuery = '';
    this.viewMode = 'list'; // 'list' | 'kanban'
  }

  init() {
    this.bindEvents();
    this.renderTasks();
  }

  bindEvents() {
    // Filter Pills
    const filterPills = document.querySelectorAll('#tasks-filter-pills .filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        filterPills.forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentFilter = e.currentTarget.getAttribute('data-task-filter');
        this.renderTasks();
      });
    });

    // Category Filter Dropdown
    const catSelect = document.getElementById('tasks-category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.categoryFilter = e.target.value;
        this.renderTasks();
      });
    }

    // Search Input
    const searchInput = document.getElementById('tasks-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTasks();
      });
    }

    // View Mode Toggle (List vs Kanban)
    const modeButtons = document.querySelectorAll('#tasks-view-toggle .mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        modeButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.viewMode = e.currentTarget.getAttribute('data-mode');
        this.renderTasks();
      });
    });

    // Modal Subtask Row Add Button
    const btnAddSubtaskRow = document.getElementById('btn-add-subtask-row');
    if (btnAddSubtaskRow) {
      btnAddSubtaskRow.addEventListener('click', () => this.appendSubtaskInputRow());
    }

    // Modal Form Submission
    const taskForm = document.getElementById('form-task');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => this.handleTaskFormSubmit(e));
    }
  }

  // --- FILTERING LOGIC ---
  getFilteredTasks() {
    let tasks = window.storage.getTasks();
    const todayStr = new Date().toISOString().split('T')[0];

    // Status / View filter
    if (this.currentFilter === 'today') {
      tasks = tasks.filter(t => t.dueDate === todayStr);
    } else if (this.currentFilter === 'upcoming') {
      tasks = tasks.filter(t => t.dueDate && t.dueDate > todayStr && t.status !== 'completed');
    } else if (this.currentFilter === 'urgent') {
      tasks = tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed');
    } else if (this.currentFilter === 'completed') {
      tasks = tasks.filter(t => t.status === 'completed');
    }

    // Category filter
    if (this.categoryFilter !== 'all') {
      tasks = tasks.filter(t => t.category === this.categoryFilter);
    }

    // Search query filter
    if (this.searchQuery) {
      tasks = tasks.filter(t =>
        (t.title && t.title.toLowerCase().includes(this.searchQuery)) ||
        (t.desc && t.desc.toLowerCase().includes(this.searchQuery))
      );
    }

    // Sort: Urgent & Incomplete first, then by Due Date
    tasks.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      const pWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
      const diff = (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0);
      if (diff !== 0) return diff;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return 0;
    });

    return tasks;
  }

  // --- RENDER DISPATCHER ---
  renderTasks() {
    const tasks = this.getFilteredTasks();
    const listView = document.getElementById('tasks-list-view');
    const kanbanView = document.getElementById('tasks-kanban-view');

    if (this.viewMode === 'list') {
      if (listView) listView.classList.remove('hidden');
      if (kanbanView) kanbanView.classList.add('hidden');
      this.renderListView(tasks);
    } else {
      if (listView) listView.classList.add('hidden');
      if (kanbanView) kanbanView.classList.remove('hidden');
      this.renderKanbanView();
    }

    this.updateTaskCounters();
  }

  // --- LIST VIEW RENDERING ---
  renderListView(tasks) {
    const container = document.getElementById('tasks-list-view');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="glass-panel text-center" style="padding: 40px 20px;">
          <p style="font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">No tasks found</p>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Try adjusting your filters or create a new task to get started.</p>
          <button class="btn btn-primary btn-sm" onclick="window.app.openNewTaskModal()">+ Add New Task</button>
        </div>
      `;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    container.innerHTML = tasks.map(task => {
      const isCompleted = task.status === 'completed';
      const subtasks = task.subtasks || [];
      const subCompleted = subtasks.filter(s => s.completed).length;
      const hasSubtasks = subtasks.length > 0;

      // Smart Due Date formatting
      let dueBadge = '';
      if (task.dueDate) {
        let label = task.dueDate;
        let isOverdue = false;
        let isToday = false;

        if (task.dueDate < todayStr && !isCompleted) {
          isOverdue = true;
          label = `Overdue (${task.dueDate})`;
        } else if (task.dueDate === todayStr) {
          isToday = true;
          label = `Today ${task.dueTime ? '• ' + task.dueTime : ''}`;
        }

        const badgeClass = isOverdue ? 'overdue' : (isToday ? 'today' : '');
        dueBadge = `
          <span class="task-date-badge ${badgeClass}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${label}
          </span>
        `;
      }

      // Subtasks preview
      let subtasksHtml = '';
      if (hasSubtasks) {
        subtasksHtml = `
          <div class="task-subtasks-preview">
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700; color: var(--text-subtle); margin-bottom: 4px;">
              <span>CHECKLIST (${subCompleted}/${subtasks.length})</span>
              <span>${Math.round((subCompleted / subtasks.length) * 100)}%</span>
            </div>
            <div class="progress-bar-container" style="height: 4px; margin-bottom: 8px;">
              <div class="progress-bar-fill progress-indigo" style="width: ${(subCompleted / subtasks.length) * 100}%;"></div>
            </div>
            ${subtasks.map((st, sIdx) => `
              <div class="subtask-item ${st.completed ? 'done' : ''}">
                <div class="custom-checkbox ${st.completed ? 'checked' : ''}" style="width: 15px; height: 15px; border-radius: 4px;" onclick="window.tasks.toggleSubtask('${task.id}', ${sIdx})">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span>${this.escapeHtml(st.title)}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="task-item-card ${isCompleted ? 'completed' : ''}" id="task-card-${task.id}">
          <div class="custom-checkbox ${isCompleted ? 'checked' : ''}" onclick="window.tasks.toggleTaskComplete('${task.id}')" title="${isCompleted ? 'Mark as incomplete' : 'Mark as complete'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>

          <div class="task-content-col">
            <div class="task-title-row">
              <span class="task-title">${this.escapeHtml(task.title)}</span>
              <span class="priority-badge priority-${task.priority || 'medium'}">${task.priority || 'medium'}</span>
              <span class="category-tag">${task.category || 'General'}</span>
            </div>

            ${task.desc ? `<div class="task-desc">${this.escapeHtml(task.desc)}</div>` : ''}

            <div class="task-meta-row">
              ${dueBadge}
              ${hasSubtasks ? `<span class="count-pill" style="font-size: 11px;">✓ ${subCompleted}/${subtasks.length} Subtasks</span>` : ''}
            </div>

            ${subtasksHtml}
          </div>

          <div class="task-actions-col">
            <button class="btn btn-icon btn-sm" onclick="window.tasks.openEditTaskModal('${task.id}')" title="Edit Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="btn btn-icon btn-sm" onclick="window.tasks.confirmDeleteTask('${task.id}')" title="Delete Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- KANBAN VIEW RENDERING ---
  renderKanbanView() {
    const allTasks = window.storage.getTasks();
    const columns = {
      'todo': document.getElementById('kanban-cards-todo'),
      'in-progress': document.getElementById('kanban-cards-in-progress'),
      'completed': document.getElementById('kanban-cards-completed')
    };

    const counts = {
      'todo': document.getElementById('kanban-count-todo'),
      'in-progress': document.getElementById('kanban-count-in-progress'),
      'completed': document.getElementById('kanban-count-completed')
    };

    Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

    const grouped = { 'todo': [], 'in-progress': [], 'completed': [] };

    allTasks.forEach(task => {
      const status = task.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });

    Object.keys(grouped).forEach(status => {
      if (counts[status]) counts[status].textContent = grouped[status].length;
      const colEl = columns[status];
      if (!colEl) return;

      if (grouped[status].length === 0) {
        colEl.innerHTML = `<div style="text-align: center; padding: 30px 10px; color: var(--text-subtle); font-size: 13px;">No tasks here</div>`;
        return;
      }

      colEl.innerHTML = grouped[status].map(task => {
        const subtasks = task.subtasks || [];
        const subCompleted = subtasks.filter(s => s.completed).length;

        return `
          <div class="kanban-card" draggable="true" ondragstart="window.tasks.handleDragStart(event, '${task.id}')">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span class="priority-badge priority-${task.priority || 'medium'}">${task.priority}</span>
              <span class="category-tag">${task.category}</span>
            </div>
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">${this.escapeHtml(task.title)}</h4>
            ${task.desc ? `<p style="font-size: 12px; margin-bottom: 8px; line-height: 1.3;">${this.escapeHtml(task.desc)}</p>` : ''}
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; font-size: 11px;">
              <span style="color: var(--text-subtle);">📅 ${task.dueDate || 'No date'}</span>
              ${subtasks.length > 0 ? `<span class="count-pill">✓ ${subCompleted}/${subtasks.length}</span>` : ''}
            </div>

            <!-- Kanban Column Actions -->
            <div style="display: flex; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle); justify-content: flex-end;">
              ${status !== 'todo' ? `<button class="btn btn-glass btn-sm" style="padding: 2px 6px; font-size: 11px;" onclick="window.tasks.moveTaskStatus('${task.id}', 'todo')">&larr; To Do</button>` : ''}
              ${status !== 'in-progress' ? `<button class="btn btn-glass btn-sm" style="padding: 2px 6px; font-size: 11px;" onclick="window.tasks.moveTaskStatus('${task.id}', 'in-progress')">In Prog</button>` : ''}
              ${status !== 'completed' ? `<button class="btn btn-emerald btn-sm" style="padding: 2px 6px; font-size: 11px;" onclick="window.tasks.moveTaskStatus('${task.id}', 'completed')">Done &rarr;</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    });

    // Setup drag and drop zones
    this.setupKanbanDragDrop();
  }

  setupKanbanDragDrop() {
    const cols = document.querySelectorAll('.kanban-column');
    cols.forEach(col => {
      col.ondragover = (e) => e.preventDefault();
      col.ondrop = (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const targetStatus = col.getAttribute('data-status');
        if (taskId && targetStatus) {
          this.moveTaskStatus(taskId, targetStatus);
        }
      };
    });
  }

  handleDragStart(e, taskId) {
    e.dataTransfer.setData('text/plain', taskId);
  }

  moveTaskStatus(taskId, newStatus) {
    window.storage.updateTask(taskId, { status: newStatus });
    window.ui.playSound(newStatus === 'completed' ? 'complete' : 'click');
    if (newStatus === 'completed') {
      window.ui.triggerConfetti();
    }
    this.renderTasks();
    window.app.refreshDashboard();
  }

  // --- TASK ACTIONS ---
  toggleTaskComplete(taskId) {
    const tasks = window.storage.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    window.storage.updateTask(taskId, { status: newStatus });

    if (newStatus === 'completed') {
      window.ui.playSound('complete');
      window.ui.triggerConfetti();
      window.ui.showToast(`Completed "${task.title}"! 🎉`, 'success');
    } else {
      window.ui.playSound('click');
      window.ui.showToast(`Marked "${task.title}" as to-do`, 'info');
    }

    this.renderTasks();
    window.app.refreshDashboard();
  }

  toggleSubtask(taskId, subtaskIndex) {
    const tasks = window.storage.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks || !task.subtasks[subtaskIndex]) return;

    task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
    
    // If all subtasks completed, offer celebratory chime
    const allDone = task.subtasks.every(s => s.completed);
    window.storage.updateTask(taskId, { subtasks: task.subtasks });

    if (allDone) {
      window.ui.playSound('complete');
    } else {
      window.ui.playSound('click');
    }

    this.renderTasks();
  }

  confirmDeleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
      window.storage.deleteTask(taskId);
      window.ui.playSound('click');
      window.ui.showToast('Task deleted', 'info');
      this.renderTasks();
      window.app.refreshDashboard();
    }
  }

  // --- MODAL FORM LOGIC ---
  openCreateModal(initialStatus = 'todo') {
    document.getElementById('modal-task-title').textContent = 'Create New Task';
    document.getElementById('task-edit-id').value = '';
    document.getElementById('form-task').reset();
    document.getElementById('task-input-status').value = initialStatus;
    
    // Set default due date to today
    document.getElementById('task-input-due-date').value = new Date().toISOString().split('T')[0];
    
    // Clear subtasks list in modal
    const subList = document.getElementById('modal-subtask-list');
    subList.innerHTML = '';

    const backdrop = document.getElementById('modal-task-backdrop');
    backdrop.classList.add('active');
    document.getElementById('task-input-title').focus();
  }

  openEditTaskModal(taskId) {
    const tasks = window.storage.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('modal-task-title').textContent = 'Edit Task';
    document.getElementById('task-edit-id').value = task.id;
    document.getElementById('task-input-title').value = task.title || '';
    document.getElementById('task-input-desc').value = task.desc || '';
    document.getElementById('task-input-priority').value = task.priority || 'medium';
    document.getElementById('task-input-category').value = task.category || 'Work';
    document.getElementById('task-input-status').value = task.status || 'todo';
    document.getElementById('task-input-due-date').value = task.dueDate || '';
    document.getElementById('task-input-due-time').value = task.dueTime || '';

    // Populate subtasks
    const subList = document.getElementById('modal-subtask-list');
    subList.innerHTML = '';
    (task.subtasks || []).forEach(st => {
      this.appendSubtaskInputRow(st.title, st.completed);
    });

    const backdrop = document.getElementById('modal-task-backdrop');
    backdrop.classList.add('active');
  }

  appendSubtaskInputRow(title = '', completed = false) {
    const list = document.getElementById('modal-subtask-list');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'subtask-input-row';
    row.innerHTML = `
      <input type="text" class="input-glass" placeholder="Checklist item..." value="${this.escapeHtml(title)}" style="padding: 6px 10px; font-size: 13px;">
      <button type="button" class="btn btn-icon btn-sm" onclick="this.parentElement.remove()" style="width: 28px; height: 28px; color: var(--rose);">&times;</button>
    `;
    list.appendChild(row);
  }

  handleTaskFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('task-edit-id').value;
    const title = document.getElementById('task-input-title').value.trim();
    if (!title) return;

    const desc = document.getElementById('task-input-desc').value.trim();
    const priority = document.getElementById('task-input-priority').value;
    const category = document.getElementById('task-input-category').value;
    const status = document.getElementById('task-input-status').value;
    const dueDate = document.getElementById('task-input-due-date').value;
    const dueTime = document.getElementById('task-input-due-time').value;

    // Collect subtasks from modal
    const subtasks = [];
    const rows = document.querySelectorAll('#modal-subtask-list .subtask-input-row');
    rows.forEach((r, idx) => {
      const val = r.querySelector('input').value.trim();
      if (val) {
        subtasks.push({ id: 'st_' + idx + '_' + Date.now(), title: val, completed: false });
      }
    });

    const payload = { title, desc, priority, category, status, dueDate, dueTime, subtasks };

    if (editId) {
      window.storage.updateTask(editId, payload);
      window.ui.showToast('Task updated successfully', 'success');
    } else {
      window.storage.addTask(payload);
      window.ui.showToast('New task added', 'success');
    }

    window.ui.playSound('click');
    window.app.closeModals();
    this.renderTasks();
    window.app.refreshDashboard();
  }

  updateTaskCounters() {
    const tasks = window.storage.getTasks();
    const pending = tasks.filter(t => t.status !== 'completed').length;
    const badge = document.getElementById('badge-pending-tasks');
    if (badge) badge.textContent = pending;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.tasks = new TaskManager();
