window.appState = {

  // USER PROFILE 
  profile: {
    name: "Shinta",
    monthlyBudget: 2500000,   // budget bulanan dalam rupiah
    currency: "IDR",
  },

  // TRANSAKSI
  // type: "income" | "expense"
  // isRecurring: transaksi yang berasal dari recurring tracker
  transactions: [
    {
      id: "txn_001",
      date: "2025-06-01",
      amount: 1500000,
      type: "income",
      category: "Beasiswa",
      note: "Beasiswa bulanan cair",
      isRecurring: false,
    },
    {
      id: "txn_002",
      date: "2025-06-02",
      amount: 45000,
      type: "expense",
      category: "Kopi",
      note: "Kopi + pastry di Kopi Kenangan",
      isRecurring: false,
    },
    {
      id: "txn_003",
      date: "2025-06-03",
      amount: 20000,
      type: "expense",
      category: "Transportasi",
      note: "Ojek ke kampus",
      isRecurring: false,
    },
    {
      id: "txn_004",
      date: "2025-06-04",
      amount: 89000,
      type: "expense",
      category: "Makan",
      note: "Groceries mingguan",
      isRecurring: false,
    },
    {
      id: "txn_005",
      date: "2025-06-05",
      amount: 200000,
      type: "expense",
      category: "Kuliah",
      note: "Beli buku referensi + print materi",
      isRecurring: false,
    },
    {
      id: "txn_006",
      date: "2025-06-06",
      amount: 19000,
      type: "expense",
      category: "Langganan",
      note: "Spotify bulan ini",
      isRecurring: true,
    },
    {
      id: "txn_007",
      date: "2025-06-07",
      amount: 500000,
      type: "income",
      category: "Freelance",
      note: "Desain logo client",
      isRecurring: false,
    },
    {
      id: "txn_008",
      date: "2025-06-08",
      amount: 35000,
      type: "expense",
      category: "Transportasi",
      note: "Bensin motor",
      isRecurring: false,
    },
    {
      id: "txn_009",
      date: "2025-06-09",
      amount: 54000,
      type: "expense",
      category: "Makan",
      note: "Makan siang + malam",
      isRecurring: false,
    },
    {
      id: "txn_010",
      date: "2025-06-10",
      amount: 149000,
      type: "expense",
      category: "Langganan",
      note: "Netflix bulan ini",
      isRecurring: true,
    },
  ],

  // FINANCIAL GOALS
  // currentAmount: sudah dikumpulkan sejauh ini
  // targetAmount: target akhir
  goals: [
    {
      id: "goal_001",
      name: "Laptop Baru",
      emoji: "💻",
      targetAmount: 8000000,
      currentAmount: 2350000,
      deadline: "2025-12-31",
    },
    {
      id: "goal_002",
      name: "Liburan Jogja",
      emoji: "🏝️",
      targetAmount: 1500000,
      currentAmount: 900000,
      deadline: "2025-08-01",
    },
    {
      id: "goal_003",
      name: "Dana Darurat",
      emoji: "🛡️",
      targetAmount: 5000000,
      currentAmount: 4750000,
      deadline: "2025-07-01",
    },
  ],

  // RECURRING TRACKER
  // dayOfMonth: tanggal auto-deduct setiap bulan
  // limit: batas maksimum pengeluaran kategori ini per bulan (optional)
  // isActive: apakah masih aktif
  recurring: [
    {
      id: "rec_001",
      name: "Spotify",
      amount: 19000,
      category: "Langganan",
      dayOfMonth: 6,
      limit: 20000,
      isActive: true,
    },
    {
      id: "rec_002",
      name: "Netflix",
      amount: 149000,
      category: "Langganan",
      dayOfMonth: 10,
      limit: 150000,
      isActive: true,
    },
    {
      id: "rec_003",
      name: "Kost",
      amount: 900000,
      category: "Tempat Tinggal",
      dayOfMonth: 1,
      limit: null,
      isActive: true,
    },
    {
      id: "rec_004",
      name: "Paket Internet",
      amount: 75000,
      category: "Utilitas",
      dayOfMonth: 15,
      limit: 80000,
      isActive: true,
    },
  ],

  // UI STATE 
  // ga disimpan ke localStorage — selalu reset ke default saat app load
  ui: {
    activeTab: "dashboard",       // "dashboard" | "analytics" | "goals" | "recurring" | "report"
    activeMonth: (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })(),                         // format: "YYYY-MM" → misal "2025-06"
    filterCategory: "all",        // filter kategori di halaman analytics
    isModalOpen: false,           // state modal tambah transaksi
  },

};

// HELPERS FUNCTION 

/**
 * hitung total pemasukan bulan tertentu
 * @param {string} yearMonth - format "YYYY-MM"
 */
window.getTotalIncome = function (yearMonth) {
  return window.appState.transactions
    .filter((t) => t.type === "income" && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * hitung total pengeluaran bulan tertentu
 * @param {string} yearMonth - format "YYYY-MM"
 */
window.getTotalExpense = function (yearMonth) {
  return window.appState.transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + t.amount, 0);
};

/**
 * hitung saldo bersih (semua waktu)
 */
window.getNetBalance = function () {
  return window.appState.transactions.reduce((sum, t) => {
    return t.type === "income" ? sum + t.amount : sum - t.amount;
  }, 0);
};

/**
 * hitung sisa budget bulan ini
 * @param {string} yearMonth - format "YYYY-MM"
 */
window.getRemainingBudget = function (yearMonth) {
  const budget = window.appState.profile.monthlyBudget;
  const expense = window.getTotalExpense(yearMonth);
  return budget - expense;
};

/**
 * grouping transaksi berdasarkan kategori (untuk analytics)
 * @param {string} yearMonth - format "YYYY-MM"
 * @returns {Object} - { kopi: 45000, transportasi: 55000, ... }
 */
window.getExpenseByCategory = function (yearMonth) {
  return window.appState.transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(yearMonth))
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
};

/**
 * hitung persentase pencapaian goal (0–100)
 * @param {string} goalId
 */
window.getGoalProgress = function (goalId) {
  const goal = window.appState.goals.find((g) => g.id === goalId);
  if (!goal) return 0;
  return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
};

/**
 * format angka ke format rupiah
 * @param {number} amount
 * @returns {string} - "Rp 1.500.000"
 */
window.formatRupiah = function (amount) {
  return "Rp " + amount.toLocaleString("id-ID");
};

/**
 * generate ID uniq untuk transaksi/goal/recurring baru
 * @param {string} prefix - "txn" | "goal" | "rec"
 */
window.generateId = function (prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
};

console.log("[Monect] app.js loaded — window.appState ready ✓");
console.log("[Monect] Active month:", window.appState.ui.activeMonth);
console.log("[Monect] Net balance:", window.formatRupiah(window.getNetBalance()));