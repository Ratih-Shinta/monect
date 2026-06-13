window.appState = {

  // user profile 
  profile: {
    name: "Shinta",
    monthlyBudget: 2500000,
    currency: "IDR",
  },

  // TRANSACTION 
  // type: "income" | "expense"
  transactions: [
    { id: "txn_001", date: "2025-06-01", amount: 1500000, type: "income",  category: "Scholarship",    note: "Monthly scholarship disbursed",     isRecurring: false },
    { id: "txn_002", date: "2025-06-02", amount: 45000,   type: "expense", category: "Coffee",         note: "Coffee + pastry at Kopi Kenangan",  isRecurring: false },
    { id: "txn_003", date: "2025-06-03", amount: 20000,   type: "expense", category: "Transport",      note: "Ride to campus",                    isRecurring: false },
    { id: "txn_004", date: "2025-06-04", amount: 89000,   type: "expense", category: "Food",           note: "Weekly groceries",                  isRecurring: false },
    { id: "txn_005", date: "2025-06-05", amount: 200000,  type: "expense", category: "Education",      note: "Textbooks + printed materials",     isRecurring: false },
    { id: "txn_006", date: "2025-06-06", amount: 19000,   type: "expense", category: "Subscriptions",  note: "Spotify this month",                isRecurring: true  },
    { id: "txn_007", date: "2025-06-07", amount: 500000,  type: "income",  category: "Freelance",      note: "Logo design client",                isRecurring: false },
    { id: "txn_008", date: "2025-06-08", amount: 35000,   type: "expense", category: "Transport",      note: "Fuel for motorbike",                isRecurring: false },
    { id: "txn_009", date: "2025-06-09", amount: 54000,   type: "expense", category: "Food",           note: "Lunch + dinner",                    isRecurring: false },
    { id: "txn_010", date: "2025-06-10", amount: 149000,  type: "expense", category: "Subscriptions",  note: "Netflix this month",                isRecurring: true  },
  ],

  // FINANCIAL GOALS 
  goals: [
    { id: "goal_001", name: "New Laptop",    emoji: "💻", targetAmount: 8000000, currentAmount: 2350000, deadline: "2025-12-31" },
    { id: "goal_002", name: "Jogja Trip",    emoji: "🏝️", targetAmount: 1500000, currentAmount: 900000,  deadline: "2025-08-01" },
    { id: "goal_003", name: "Emergency Fund",emoji: "🛡️", targetAmount: 5000000, currentAmount: 4750000, deadline: "2025-07-01" },
  ],

  // RECURRING TRACKER 
  recurring: [
    { id: "rec_001", name: "Spotify",       amount: 19000,  category: "Subscriptions", dayOfMonth: 6,  limit: 20000,  isActive: true },
    { id: "rec_002", name: "Netflix",       amount: 149000, category: "Subscriptions", dayOfMonth: 10, limit: 150000, isActive: true },
    { id: "rec_003", name: "Rent",          amount: 900000, category: "Housing",       dayOfMonth: 1,  limit: null,   isActive: true },
    { id: "rec_004", name: "Internet Plan", amount: 75000,  category: "Utilities",     dayOfMonth: 15, limit: 80000,  isActive: true },
  ],

  // ui state 
  // always resets to defaults on load
  ui: {
    activeTab:      "dashboard",
    activeMonth:    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })(),
    filterCategory: "all",
    isModalOpen:    false,
  },
};


// HELPERS

window.getTotalIncome = function (yearMonth) {
  return window.appState.transactions
    .filter(t => t.type === "income" && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + t.amount, 0);
};

window.getTotalExpense = function (yearMonth) {
  return window.appState.transactions
    .filter(t => t.type === "expense" && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + t.amount, 0);
};

window.getNetBalance = function () {
  return window.appState.transactions.reduce((sum, t) => {
    return t.type === "income" ? sum + t.amount : sum - t.amount;
  }, 0);
};

window.getRemainingBudget = function (yearMonth) {
  return window.appState.profile.monthlyBudget - window.getTotalExpense(yearMonth);
};

window.getExpenseByCategory = function (yearMonth) {
  return window.appState.transactions
    .filter(t => t.type === "expense" && t.date.startsWith(yearMonth))
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
};

window.getGoalProgress = function (goalId) {
  const goal = window.appState.goals.find(g => g.id === goalId);
  if (!goal) return 0;
  return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
};

window.formatRupiah = function (amount) {
  return "Rp " + Math.abs(amount).toLocaleString("id-ID");
};

window.generateId = function (prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
};

console.log("[Monect] app.js loaded — window.appState ready ✓");
console.log("[Monect] Active month:", window.appState.ui.activeMonth);
console.log("[Monect] Net balance:", window.formatRupiah(window.getNetBalance()));