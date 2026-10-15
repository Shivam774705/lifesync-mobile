/**
 * LifeSync — Data Persistence & Storage Layer
 * 100% Client-side LocalStorage management, demo data seed, JSON/CSV exports.
 */

const STORAGE_KEYS = {
  TASKS: 'lifesync_tasks_v1',
  EXPENSES: 'lifesync_expenses_v1',
  SETTINGS: 'lifesync_settings_v1'
};

const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
};

const EXPENSE_CATEGORIES = [
  { id: 'Food', label: '🍔 Food & Dining', color: '#f59e0b', icon: 'food' },
  { id: 'Groceries', label: '🛒 Groceries & Supermarket', color: '#10b981', icon: 'cart' },
  { id: 'Housing', label: '🏠 Rent & Housing', color: '#6366f1', icon: 'home' },
  { id: 'Utilities', label: '💡 Electricity, WiFi & Bills', color: '#0ea5e9', icon: 'zap' },
  { id: 'Transport', label: '🚗 Transport & Fuel', color: '#8b5cf6', icon: 'car' },
  { id: 'Shopping', label: '🛍️ Shopping & Gadgets', color: '#ec4899', icon: 'bag' },
  { id: 'Entertainment', label: '🎬 Entertainment & OTT', color: '#f43f5e', icon: 'film' },
  { id: 'Health', label: '💊 Health & Fitness', color: '#14b8a6', icon: 'heart' },
  { id: 'Education', label: '📚 Study & Courses', color: '#3b82f6', icon: 'book' },
  { id: 'Parttime_Expense', label: '🛵 Part-Time Job Expense (Fuel/Tools)', color: '#d97706', icon: 'tool' },
  { id: 'Habit_Smoking', label: '🚬 Smoking / Vices (Money Waste Alert)', color: '#ef4444', icon: 'flame', isWaste: true },
  { id: 'Unnecessary', label: '💸 Unnecessary & Impulse Waste', color: '#dc2626', icon: 'alert', isWaste: true },
  { id: 'Investments', label: '📈 Investments & SIP', color: '#84cc16', icon: 'trending' },
  { id: 'Other', label: '📦 Miscellaneous', color: '#94a3b8', icon: 'box' }
];

const INCOME_CATEGORIES = [
  { id: 'Salary', label: '💼 Primary Job Salary', color: '#10b981' },
  { id: 'Parttime_Income', label: '⚡ Part-Time Daily Earning', color: '#059669' },
  { id: 'Freelance', label: '💻 Freelance & Gigs', color: '#0ea5e9' },
  { id: 'Investments', label: '📈 Dividends & Returns', color: '#8b5cf6' },
  { id: 'Gift', label: '🎁 Gift & Bonus', color: '#f59e0b' },
  { id: 'Other_Income', label: '💵 Other Inflow', color: '#64748b' }
];

const DEFAULT_SETTINGS = {
  currency: 'INR',
  monthlyBudget: 40000,
  soundEnabled: true,
  theme: 'dark'
};

class StorageManager {
  constructor() {
    this.ensureInitialized();
  }

  ensureInitialized() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      this.saveTasks([]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
      this.saveExpenses([]);
    }
  }

  // --- SETTINGS ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed reading settings', e);
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(newSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
  }

  getCurrencySymbol() {
    const s = this.getSettings();
    return CURRENCIES[s.currency] ? CURRENCIES[s.currency].symbol : '₹';
  }

  formatMoney(amount) {
    const sym = this.getCurrencySymbol();
    const num = Number(amount) || 0;
    return `${sym}${num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
  }

  // --- TASKS ---
  getTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get tasks', e);
      return [];
    }
  }

  saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  addTask(taskData) {
    const tasks = this.getTasks();
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      status: 'todo', // 'todo' | 'in-progress' | 'completed'
      subtasks: [],
      ...taskData
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  updateTask(taskId, updates) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveTasks(tasks);
      return tasks[index];
    }
    return null;
  }

  deleteTask(taskId) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== taskId);
    this.saveTasks(tasks);
    return true;
  }

  // --- EXPENSES & INCOMES ---
  getExpenses() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get expenses', e);
      return [];
    }
  }

  saveExpenses(expenses) {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }

  addExpense(expenseData) {
    const expenses = this.getExpenses();
    const newRecord = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      type: 'expense', // 'expense' | 'income'
      amount: parseFloat(expenseData.amount) || 0,
      ...expenseData
    };
    expenses.unshift(newRecord);
    this.saveExpenses(expenses);
    return newRecord;
  }

  updateExpense(id, updates) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveExpenses(expenses);
      return expenses[index];
    }
    return null;
  }

  deleteExpense(id) {
    let expenses = this.getExpenses();
    expenses = expenses.filter(e => e.id !== id);
    this.saveExpenses(expenses);
    return true;
  }

  // --- SAMPLE DATA GENERATION ---
  loadSampleData() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    const sampleTasks = [
      {
        id: 'task_sample_1',
        title: 'Review primary job sprint goals & daily deliverables',
        desc: 'Review Jira backlog, resolve pull requests, and organize standup notes.',
        priority: 'urgent',
        category: 'Work',
        status: 'in-progress',
        dueDate: todayStr,
        dueTime: '10:00',
        subtasks: [
          { id: 's1', title: 'Review sprint deliverables', completed: true },
          { id: 's2', title: 'Prepare architecture RFC', completed: false }
        ],
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'task_sample_2',
        title: 'Study 45 mins: Advanced Data Structures & System Design',
        desc: 'Read Chapter 3 on distributed caching and solve 1 LeetCode problem.',
        priority: 'high',
        category: 'Study',
        status: 'todo',
        dueDate: todayStr,
        dueTime: '19:30',
        subtasks: [
          { id: 's3', title: 'Take handwritten notes', completed: false },
          { id: 's4', title: 'Solve 1 Hard problem on graphs', completed: false }
        ],
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: 'task_sample_3',
        title: 'Part-Time Gig: 2-hour evening delivery / freelance task',
        desc: 'Complete evening ride deliveries and log fuel expense vs gross earnings.',
        priority: 'high',
        category: 'Part-Time',
        status: 'todo',
        dueDate: todayStr,
        dueTime: '21:00',
        subtasks: [
          { id: 's5', title: 'Vehicle battery/fuel check', completed: true },
          { id: 's6', title: 'Log gross daily earning in LifeSync', completed: false }
        ],
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: 'task_sample_4',
        title: 'English Fluency & Pronunciation: 20 min speaking drill',
        desc: 'Record 2-minute spontaneous talk on "My Career Vision" and listen back.',
        priority: 'medium',
        category: 'English',
        status: 'todo',
        dueDate: todayStr,
        dueTime: '22:15',
        subtasks: [
          { id: 's7', title: 'Shadowing technique drill for 10 mins', completed: false },
          { id: 's8', title: 'Learn 3 high-impact workplace phrases', completed: false }
        ],
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
      },
      {
        id: 'task_sample_5',
        title: 'Zero Smoking & Habit Victory Streak Day 1',
        desc: 'Stay clean, drink water whenever urge strikes, save ₹150 daily.',
        priority: 'urgent',
        category: 'Habits',
        status: 'completed',
        dueDate: todayStr,
        dueTime: '23:00',
        subtasks: [],
        createdAt: new Date(Date.now() - 3600000 * 10).toISOString()
      }
    ];

    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

    const sampleExpenses = [
      {
        id: 'exp_sample_1',
        type: 'income',
        amount: 65000,
        category: 'Salary',
        title: 'Primary Job Monthly Salary',
        paymentMethod: 'Net Banking',
        date: `${currentYear}-${currentMonth}-01T10:00`,
        notes: 'Monthly regular payroll credit',
        createdAt: new Date(Date.now() - 3600000 * 240).toISOString()
      },
      {
        id: 'exp_sample_2',
        type: 'income',
        amount: 850,
        category: 'Parttime_Income',
        title: 'Part-Time Evening Shift Earning',
        paymentMethod: 'UPI',
        date: `${yesterdayStr}T22:30`,
        notes: '3 hours evening delivery shift',
        createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
      },
      {
        id: 'exp_sample_3',
        type: 'income',
        amount: 920,
        category: 'Parttime_Income',
        title: 'Part-Time Shift Earning (Today)',
        paymentMethod: 'UPI',
        date: `${todayStr}T14:00`,
        notes: 'Afternoon part-time shift completed',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'exp_sample_4',
        type: 'expense',
        amount: 180,
        category: 'Parttime_Expense',
        title: 'Fuel for Part-Time Shift',
        paymentMethod: 'UPI',
        date: `${todayStr}T11:00`,
        notes: 'Petrol refuel before starting gig shift',
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
      },
      {
        id: 'exp_sample_5',
        type: 'expense',
        amount: 150,
        category: 'Habit_Smoking',
        title: 'Cigarettes / Vices (Impulse Waste)',
        paymentMethod: 'Cash',
        date: `${yesterdayStr}T17:30`,
        notes: 'Money wasted on cigarettes - Need to eliminate this!',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'exp_sample_6',
        type: 'expense',
        amount: 420,
        category: 'Unnecessary',
        title: 'Late Night Junk Food & Soda',
        paymentMethod: 'UPI',
        date: `${yesterdayStr}T23:15`,
        notes: 'Unplanned impulse order',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: 'exp_sample_7',
        type: 'expense',
        amount: 12000,
        category: 'Housing',
        title: 'Apartment Monthly Rent & Maintenance',
        paymentMethod: 'UPI',
        date: `${currentYear}-${currentMonth}-03T11:30`,
        notes: 'Transferred via UPI to landlord',
        createdAt: new Date(Date.now() - 3600000 * 200).toISOString()
      },
      {
        id: 'exp_sample_8',
        type: 'expense',
        amount: 2500,
        category: 'Groceries',
        title: 'Healthy Grocery & Oats Restock',
        paymentMethod: 'UPI',
        date: `${currentYear}-${currentMonth}-07T18:45`,
        notes: 'Clean diet pantry essentials',
        createdAt: new Date(Date.now() - 3600000 * 120).toISOString()
      },
      {
        id: 'exp_sample_9',
        type: 'expense',
        amount: 499,
        category: 'Education',
        title: 'English Communication & Speaking Course Subscription',
        paymentMethod: 'Credit Card',
        date: `${currentYear}-${currentMonth}-05T12:00`,
        notes: 'Skill investment to improve earnings',
        createdAt: new Date(Date.now() - 3600000 * 150).toISOString()
      }
    ];

    this.saveTasks(sampleTasks);
    this.saveExpenses(sampleExpenses);
  }

  // --- HABITS (Smoking & Discipline) ---
  getHabits() {
    try {
      const data = localStorage.getItem('lifesync_habits_v1');
      if (data) return JSON.parse(data);
      // Default initial habits (Clean starting slate for user)
      const initialHabits = [
        {
          id: 'habit_smoking',
          name: 'Smoke-Free Victory (Quit Cigarettes)',
          category: 'health',
          costPerDay: 150,
          targetDays: 30,
          streakDays: 0,
          lastLoggedDate: '',
          history: {}
        },
        {
          id: 'habit_english',
          name: 'English Speaking & Vocabulary Practice (25 mins)',
          category: 'skill',
          targetDays: 30,
          streakDays: 0,
          lastLoggedDate: '',
          history: {}
        },
        {
          id: 'habit_study',
          name: 'Dedicated Study & Upskilling Focus (1 hour)',
          category: 'study',
          targetDays: 30,
          streakDays: 0,
          lastLoggedDate: '',
          history: {}
        },
        {
          id: 'habit_nowaste',
          name: 'Zero Unnecessary Spend Day',
          category: 'finance',
          targetDays: 30,
          streakDays: 0,
          lastLoggedDate: '',
          history: {}
        }
      ];
      localStorage.setItem('lifesync_habits_v1', JSON.stringify(initialHabits));
      return initialHabits;
    } catch(e) {
      return [];
    }
  }

  saveHabits(habits) {
    localStorage.setItem('lifesync_habits_v1', JSON.stringify(habits));
  }

  toggleHabitToday(habitId) {
    const habits = this.getHabits();
    const todayStr = new Date().toISOString().split('T')[0];
    const h = habits.find(item => item.id === habitId);
    if (!h) return null;

    if (!h.history) h.history = {};

    if (h.history[todayStr]) {
      // uncheck
      delete h.history[todayStr];
      h.streakDays = Math.max(0, (h.streakDays || 1) - 1);
    } else {
      // check
      h.history[todayStr] = true;
      h.streakDays = (h.streakDays || 0) + 1;
      h.lastLoggedDate = todayStr;
    }

    this.saveHabits(habits);
    return h;
  }

  // --- DATA EXPORT & IMPORT ---
  exportJSON() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      tasks: this.getTasks(),
      expenses: this.getExpenses()
    };
    const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `LifeSync_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importJSON(jsonFile, onSuccess, onError) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          this.saveTasks(parsed.tasks);
        }
        if (parsed.expenses && Array.isArray(parsed.expenses)) {
          this.saveExpenses(parsed.expenses);
        }
        if (parsed.settings) {
          this.saveSettings(parsed.settings);
        }
        onSuccess();
      } catch (err) {
        onError('Invalid LifeSync JSON backup format.');
      }
    };
    reader.onerror = () => onError('Failed reading the selected file.');
    reader.readAsText(jsonFile);
  }

  exportExpensesCSV() {
    const expenses = this.getExpenses();
    if (expenses.length === 0) {
      alert('No expense records to export.');
      return;
    }
    const headers = ['ID', 'Type', 'Amount', 'Category', 'Description', 'PaymentMethod', 'DateTime', 'Notes'];
    const rows = expenses.map(e => [
      e.id,
      e.type,
      e.amount,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.paymentMethod || '').replace(/"/g, '""')}"`,
      e.date,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `LifeSync_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  exportTasksCSV() {
    const tasks = this.getTasks();
    if (tasks.length === 0) {
      alert('No tasks to export.');
      return;
    }
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Category', 'DueDate', 'DueTime', 'SubtasksTotal', 'SubtasksDone', 'Description'];
    const rows = tasks.map(t => {
      const subTotal = (t.subtasks || []).length;
      const subDone = (t.subtasks || []).filter(s => s.completed).length;
      return [
        t.id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.dueDate || '',
        t.dueTime || '',
        subTotal,
        subDone,
        `"${(t.desc || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `LifeSync_Tasks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
  }
}

window.storage = new StorageManager();
