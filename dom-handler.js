// COLOR PER CATEGORY 
const CATEGORY_COLORS = {
  "Makan":          "#f97316",
  "Kopi":           "#a78bfa",
  "Transportasi":   "#38bdf8",
  "Kuliah":         "#34d399",
  "Langganan":      "#a3e635",
  "Tempat Tinggal": "#fb7185",
  "Utilitas":       "#fbbf24",
  "Hiburan":        "#c084fc",
  "Kesehatan":      "#2dd4bf",
  "Beasiswa":       "#a3e635",
  "Freelance":      "#a3e635",
  "Lainnya":        "#71717a",
};

// INIT 
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bindNavigation();
  bindModal();
  bindGoals();
  bindRecurring();
  bindReport();
  console.log("[Monect] dom-handler.js Fase 3 ready ✓");
});


// RENDER ROUTER 
function renderAll() {
  renderUsername();
  renderDashboard();
  renderAnalytics();
  renderGoals();
  renderRecurring();
  renderReport();
  setActiveTab(window.appState.ui.activeTab);
}


// USERNAME 
function renderUsername() {
  const { name } = window.appState.profile;
  const initial  = name.charAt(0).toUpperCase();
  const el       = (id) => document.getElementById(id);

  if (el("header-username"))  el("header-username").textContent  = name;
  if (el("sidebar-username")) el("sidebar-username").textContent = name;
  if (el("user-avatar"))      el("user-avatar").textContent      = initial;
}


// DASHBOARD
function renderDashboard() {
  const month = window.appState.ui.activeMonth;
  renderBalanceCard();
  renderIncomeCard(month);
  renderExpenseCard(month);
  renderBudgetCard(month);
  renderRecentTransactions();
  renderCashflowChart(month);
}

function renderBalanceCard() {
  const balance = window.getNetBalance();
  const el      = document.getElementById("display-balance");
  const subEl   = document.getElementById("display-balance-sub");
  if (el) el.textContent = window.formatRupiah(balance);
  if (subEl) {
    subEl.textContent  = balance >= 0 ? "saldo bersih semua transaksi" : "kamu sedang minus nih 👀";
    subEl.style.color  = balance >= 0 ? "var(--text-muted)" : "var(--expense)";
  }
}

function renderIncomeCard(month) {
  const el = document.getElementById("display-income");
  if (el) el.textContent = window.formatRupiah(window.getTotalIncome(month));
}

function renderExpenseCard(month) {
  const el = document.getElementById("display-expense");
  if (el) el.textContent = window.formatRupiah(window.getTotalExpense(month));
}

function renderBudgetCard(month) {
  const budget    = window.appState.profile.monthlyBudget;
  const expense   = window.getTotalExpense(month);
  const remaining = window.getRemainingBudget(month);
  const usedPct   = budget > 0 ? Math.min(100, Math.round((expense / budget) * 100)) : 0;

  const remainEl = document.getElementById("display-remaining");
  const barEl    = document.getElementById("budget-bar-fill");
  const pctEl    = document.getElementById("display-budget-pct");

  if (remainEl) {
    remainEl.textContent = window.formatRupiah(Math.abs(remaining));
    remainEl.style.color = remaining < 0 ? "var(--expense)"
      : remaining < budget * 0.2 ? "var(--warning)" : "var(--text-primary)";
  }
  if (barEl) {
    barEl.style.width = usedPct + "%";
    barEl.classList.remove("warning", "danger");
    if (usedPct >= 90)      barEl.classList.add("danger");
    else if (usedPct >= 70) barEl.classList.add("warning");
  }
  if (pctEl) {
    pctEl.textContent = remaining >= 0 ? `${usedPct}% budget terpakai` : "budget bulan ini habis!";
  }
}

function renderRecentTransactions() {
  const listEl = document.getElementById("recent-txn-list");
  if (!listEl) return;

  const recent = [...window.appState.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  listEl.innerHTML = "";
  if (recent.length === 0) {
    listEl.innerHTML = `<li class="empty-state">Belum ada transaksi.</li>`;
    return;
  }
  recent.forEach(txn => listEl.appendChild(buildTxnItem(txn)));
}


// CASHFLOW CHART 
function renderCashflowChart(month) {
  const canvas = document.getElementById("cashflow-chart");
  if (!canvas) return;

  const ctx    = canvas.getContext("2d");
  const W      = canvas.offsetWidth  || 400;
  const H      = 160;
  canvas.width  = W;
  canvas.height = H;

  // ambil data 6 bulan terakhir
  const months = getLast6Months(month);
  const incomes  = months.map(m => window.getTotalIncome(m));
  const expenses = months.map(m => window.getTotalExpense(m));
  const labels   = months.map(m => {
    const [y, mo] = m.split("-");
    const names = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    return names[parseInt(mo) - 1];
  });

  const maxVal = Math.max(...incomes, ...expenses, 1);
  const pad    = { top: 20, right: 16, bottom: 36, left: 16 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;
  const barW   = Math.floor(chartW / months.length);
  const groupW = barW * 0.78;

  ctx.clearRect(0, 0, W, H);

  // grid lines
  ctx.strokeStyle = "rgba(63,63,70,0.5)";
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad.top + (chartH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  // bars
  months.forEach((_, i) => {
    const x = pad.left + i * barW + (barW - groupW) / 2;

    // income bar
    const incH = maxVal > 0 ? (incomes[i] / maxVal) * chartH : 0;
    const incY = pad.top + chartH - incH;
    ctx.fillStyle = "rgba(163, 230, 53, 0.85)";
    ctx.beginPath();
    ctx.roundRect(x, incY, groupW / 2 - 2, incH, [4, 4, 0, 0]);
    ctx.fill();

    // expense bar
    const expH = maxVal > 0 ? (expenses[i] / maxVal) * chartH : 0;
    const expY = pad.top + chartH - expH;
    ctx.fillStyle = "rgba(248, 113, 113, 0.85)";
    ctx.beginPath();
    ctx.roundRect(x + groupW / 2 + 2, expY, groupW / 2 - 2, expH, [4, 4, 0, 0]);
    ctx.fill();

    // label bulan
    ctx.fillStyle   = "rgba(113,113,122,1)";
    ctx.font        = "11px Inter, sans-serif";
    ctx.textAlign   = "center";
    ctx.fillText(labels[i], x + groupW / 2, H - 10);
  });

  // legend
  const legY = 12;
  ctx.fillStyle = "rgba(163,230,53,0.85)";
  ctx.fillRect(pad.left, legY - 7, 10, 8);
  ctx.fillStyle = "rgba(113,113,122,1)";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Pemasukan", pad.left + 14, legY);

  ctx.fillStyle = "rgba(248,113,113,0.85)";
  ctx.fillRect(pad.left + 90, legY - 7, 10, 8);
  ctx.fillStyle = "rgba(113,113,122,1)";
  ctx.fillText("Pengeluaran", pad.left + 104, legY);
}

function getLast6Months(currentMonth) {
  const [y, m] = currentMonth.split("-").map(Number);
  const result = [];
  for (let i = 5; i >= 0; i--) {
    let mo = m - i;
    let yr = y;
    if (mo <= 0) { mo += 12; yr -= 1; }
    result.push(`${yr}-${String(mo).padStart(2, "0")}`);
  }
  return result;
}


// ANALYTICS
function renderAnalytics() {
  const month = window.appState.ui.activeMonth;
  renderAllTransactions();
  renderCategoryList(month);
  renderCategoryChart(month);
  renderFilterChips();
}

function renderAllTransactions() {
  const listEl  = document.getElementById("all-txn-list");
  const countEl = document.getElementById("txn-count");
  if (!listEl) return;

  const filter = window.appState.ui.filterCategory;
  let txns = [...window.appState.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filter !== "all") txns = txns.filter(t => t.category === filter);

  if (countEl) countEl.textContent = `${txns.length} transaksi`;

  listEl.innerHTML = "";
  if (txns.length === 0) {
    listEl.innerHTML = `<li class="empty-state">Tidak ada transaksi di kategori ini.</li>`;
    return;
  }
  txns.forEach(txn => {
    const item = buildTxnItem(txn);
    // add button hapus
    const delBtn = document.createElement("button");
    delBtn.className   = "txn-delete-btn";
    delBtn.textContent = "×";
    delBtn.title       = "Hapus transaksi";
    delBtn.addEventListener("click", () => deleteTransaction(txn.id));
    item.querySelector(".txn-item__right").appendChild(delBtn);
    listEl.appendChild(item);
  });
}

function renderCategoryList(month) {
  const listEl = document.getElementById("category-list");
  if (!listEl) return;

  const byCategory = window.getExpenseByCategory(month);
  const totalExp   = window.getTotalExpense(month);
  const sorted     = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const tmpl = document.getElementById("tmpl-category-item");
  listEl.innerHTML = "";

  if (sorted.length === 0) {
    listEl.innerHTML = `<li class="empty-state">Tidak ada pengeluaran bulan ini.</li>`;
    return;
  }

  sorted.forEach(([cat, amount]) => {
    const clone  = tmpl.content.cloneNode(true);
    const li     = clone.querySelector(".category-item");
    const pct    = totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0;
    const color  = CATEGORY_COLORS[cat] || "#71717a";

    li.querySelector(".cat-name").textContent   = cat;
    li.querySelector(".cat-amount").textContent = window.formatRupiah(amount);

    const bar = li.querySelector(".category-bar-fill");
    bar.style.width           = pct + "%";
    bar.style.backgroundColor = color;

    listEl.appendChild(clone);
  });
}

function renderCategoryChart(month) {
  const canvas = document.getElementById("category-chart");
  if (!canvas) return;

  const byCategory = window.getExpenseByCategory(month);
  const entries    = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const total      = entries.reduce((s, [, v]) => s + v, 0);

  const size = 220;
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  if (total === 0) {
    ctx.fillStyle   = "rgba(63,63,70,0.4)";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(113,113,122,1)";
    ctx.font      = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Belum ada data", size / 2, size / 2 + 4);
    return;
  }

  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.55;   // donut hole
  let startAngle = -Math.PI / 2;

  entries.forEach(([cat, amount]) => {
    const slice = (amount / total) * Math.PI * 2;
    const color = CATEGORY_COLORS[cat] || "#71717a";

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    startAngle += slice;
  });

  // donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg-card").trim() || "#111113";
  ctx.fill();

  // teks total di tengah
  ctx.fillStyle   = "rgba(250,250,250,0.9)";
  ctx.font        = "bold 13px Space Grotesk, sans-serif";
  ctx.textAlign   = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(window.formatRupiah(total), cx, cy - 8);
  ctx.fillStyle = "rgba(113,113,122,1)";
  ctx.font      = "10px Inter, sans-serif";
  ctx.fillText("total pengeluaran", cx, cy + 10);
}

function renderFilterChips() {
  const container = document.getElementById("analytics-filter");
  if (!container) return;

  const categories = [...new Set(
    window.appState.transactions.map(t => t.category)
  )].sort();

  // delete chip lama (selain "Semua")
  container.querySelectorAll(".filter-chip:not([data-filter='all'])").forEach(c => c.remove());

  categories.forEach(cat => {
    const btn       = document.createElement("button");
    btn.className   = "filter-chip";
    btn.dataset.filter = cat;
    btn.textContent = cat;
    btn.addEventListener("click", () => applyFilter(cat));
    container.appendChild(btn);
  });

  // bind "Semua"
  const allChip = container.querySelector("[data-filter='all']");
  allChip?.addEventListener("click", () => applyFilter("all"));

  updateFilterChipUI();
}

function applyFilter(cat) {
  window.appState.ui.filterCategory = cat;
  updateFilterChipUI();
  renderAllTransactions();
}

function updateFilterChipUI() {
  const active = window.appState.ui.filterCategory;
  document.querySelectorAll(".filter-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.filter === active);
  });
}


// GOALS
function renderGoals() {
  const grid = document.getElementById("goals-grid");
  if (!grid) return;

  const tmpl = document.getElementById("tmpl-goal-card");
  grid.innerHTML = "";

  if (window.appState.goals.length === 0) {
    grid.innerHTML = `<div class="empty-state-full">Belum ada goal. Yuk bikin satu! 🎯</div>`;
    return;
  }

  window.appState.goals.forEach(goal => {
    const clone = tmpl.content.cloneNode(true);
    const card  = clone.querySelector(".goal-card");
    const pct   = window.getGoalProgress(goal.id);

    card.querySelector(".goal-emoji").textContent    = goal.emoji;
    card.querySelector(".goal-name").textContent     = goal.name;
    card.querySelector(".goal-deadline").textContent = "Target: " + formatDateLong(goal.deadline);
    card.querySelector(".goal-pct-badge").textContent = pct + "%";
    card.querySelector(".goal-progress-fill").style.width = pct + "%";
    card.querySelector(".goal-current").textContent  = window.formatRupiah(goal.currentAmount);
    card.querySelector(".goal-target").textContent   = window.formatRupiah(goal.targetAmount);

    // color badge
    const badge = card.querySelector(".goal-pct-badge");
    badge.classList.remove("warning");
    if (pct >= 100) {
      badge.textContent = "✓ Tercapai!";
      badge.style.background = "var(--accent-dim)";
      badge.style.color      = "var(--accent)";
      card.querySelector(".goal-progress-fill").style.backgroundColor = "var(--accent)";
    } else if (pct < 30) {
      badge.style.background = "var(--warning-dim)";
      badge.style.color      = "var(--warning)";
      card.querySelector(".goal-progress-fill").style.backgroundColor = "var(--warning)";
    }

    // button top up
    card.querySelector(".goal-topup-btn")
      .addEventListener("click", () => openTopupModal(goal.id));

    card.dataset.goalId = goal.id;
    grid.appendChild(clone);
  });
}

function bindGoals() {
  document.getElementById("btn-add-goal")
    ?.addEventListener("click", () => openAddGoalModal());
}

function openTopupModal(goalId) {
  const goal   = window.appState.goals.find(g => g.id === goalId);
  if (!goal) return;
  const remain = goal.targetAmount - goal.currentAmount;
  const amount = prompt(`Top up "${goal.name}"\nSisa target: ${window.formatRupiah(remain)}\n\nMasukkan jumlah (Rp):`);
  if (!amount) return;
  const num = parseFloat(amount.replace(/\D/g, ""));
  if (!num || num <= 0) { alert("Jumlah tidak valid."); return; }

  goal.currentAmount = Math.min(goal.targetAmount, goal.currentAmount + num);
  window.saveState();
  renderGoals();
}

function openAddGoalModal() {
  const name   = prompt("Nama goal kamu:");
  if (!name?.trim()) return;
  const target = parseFloat(prompt("Target jumlah (Rp):"));
  if (!target || target <= 0) { alert("Target tidak valid."); return; }
  const deadline = prompt("Deadline (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);

  const emojis = ["🎯","💻","🏝️","🚗","👟","📱","🛡️","🎓","🏠","✈️"];
  const emoji  = emojis[Math.floor(Math.random() * emojis.length)];

  window.appState.goals.push({
    id: window.generateId("goal"),
    name: name.trim(),
    emoji,
    targetAmount:   target,
    currentAmount:  0,
    deadline: deadline || new Date().toISOString().split("T")[0],
  });
  window.saveState();
  renderGoals();
}


// RECURRING
function renderRecurring() {
  const grid = document.getElementById("recurring-grid");
  if (!grid) return;

  const tmpl = document.getElementById("tmpl-recurring-card");
  grid.innerHTML = "";

  if (window.appState.recurring.length === 0) {
    grid.innerHTML = `<div class="empty-state-full">Belum ada pengeluaran rutin.</div>`;
    return;
  }

  const currentMonth = window.appState.ui.activeMonth;

  window.appState.recurring.forEach(rec => {
    const clone = tmpl.content.cloneNode(true);
    const card  = clone.querySelector(".recurring-card");

    card.querySelector(".recurring-name").textContent     = rec.name;
    card.querySelector(".recurring-amount").textContent   = window.formatRupiah(rec.amount);
    card.querySelector(".recurring-day").textContent      = `Tgl ${rec.dayOfMonth} tiap bulan`;
    card.querySelector(".recurring-category").textContent = rec.category;

    // status dot
    const dot = card.querySelector(".recurring-status-dot");
    if (!rec.isActive) dot.classList.add("inactive");

    // limit bar (klo ada limit)
    if (rec.limit) {
      const track = card.querySelector(".recurring-limit-bar-track");
      const fill  = card.querySelector(".recurring-limit-bar-fill");
      track.classList.remove("hidden");
      const pct = Math.min(100, Math.round((rec.amount / rec.limit) * 100));
      fill.style.width           = pct + "%";
      fill.style.backgroundColor = pct >= 90
        ? "var(--expense)"
        : pct >= 70
          ? "var(--warning)"
          : "var(--accent)";
    }

    // toggle on / off
    card.addEventListener("click", () => toggleRecurring(rec.id));
    card.style.cursor = "pointer";
    card.title = rec.isActive ? "Klik bwat nonaktifkan" : "Klik bwat aktifkan";

    card.dataset.recId = rec.id;
    grid.appendChild(clone);
  });

  // summary total recurring aktif
  renderRecurringSummary();
}

function renderRecurringSummary() {
  const totalActive = window.appState.recurring
    .filter(r => r.isActive)
    .reduce((s, r) => s + r.amount, 0);

  // show di page-eyebrow jika ada
  const eyebrow = document.querySelector("#tab-recurring .page-eyebrow");
  if (eyebrow) {
    eyebrow.textContent = `Total aktif: ${window.formatRupiah(totalActive)}/bulan`;
  }
}

function toggleRecurring(recId) {
  const rec = window.appState.recurring.find(r => r.id === recId);
  if (!rec) return;
  rec.isActive = !rec.isActive;
  window.saveState();
  renderRecurring();
}

function bindRecurring() {
  document.getElementById("btn-add-recurring")
    ?.addEventListener("click", openAddRecurringModal);
}

function openAddRecurringModal() {
  const name = prompt("Nama pengeluaran rutin:");
  if (!name?.trim()) return;
  const amount = parseFloat(prompt("Jumlah per bulan (Rp):"));
  if (!amount || amount <= 0) { alert("Jumlah tidak valid."); return; }
  const day    = parseInt(prompt("Tanggal debit setiap bulan (1-28):", "1"));
  const cat    = prompt("Kategori:", "Langganan");

  window.appState.recurring.push({
    id:         window.generateId("rec"),
    name:       name.trim(),
    amount,
    category:   cat || "Langganan",
    dayOfMonth: isNaN(day) ? 1 : Math.min(28, Math.max(1, day)),
    limit:      null,
    isActive:   true,
  });
  window.saveState();
  renderRecurring();
}


// REPORT 
function renderReport() {
  const month    = window.appState.ui.activeMonth;
  const income   = window.getTotalIncome(month);
  const expense  = window.getTotalExpense(month);
  const balance  = income - expense;
  const budget   = window.appState.profile.monthlyBudget;
  const byCategory = window.getExpenseByCategory(month);

  // summary card
  const summaryEl = document.getElementById("report-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <p class="card-label">Ringkasan — ${formatMonthLabel(month)}</p>
      <div class="report-stat-row">
        <span class="report-stat-label">Pemasukan</span>
        <span class="report-stat-value income">${window.formatRupiah(income)}</span>
      </div>
      <div class="report-stat-row">
        <span class="report-stat-label">Pengeluaran</span>
        <span class="report-stat-value expense">${window.formatRupiah(expense)}</span>
      </div>
      <div class="report-stat-row report-stat-row--divider">
        <span class="report-stat-label">Selisih Bersih</span>
        <span class="report-stat-value ${balance >= 0 ? "income" : "expense"}">${window.formatRupiah(balance)}</span>
      </div>
      <div class="report-stat-row">
        <span class="report-stat-label">Budget Bulanan</span>
        <span class="report-stat-value">${window.formatRupiah(budget)}</span>
      </div>
      <div class="report-stat-row">
        <span class="report-stat-label">Sisa Budget</span>
        <span class="report-stat-value ${window.getRemainingBudget(month) >= 0 ? "income" : "expense"}">
          ${window.formatRupiah(window.getRemainingBudget(month))}
        </span>
      </div>
    `;
  }

  // detail card (per kategori)
  const detailEl = document.getElementById("report-detail");
  if (detailEl) {
    const rows = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `
        <div class="report-stat-row">
          <span class="report-stat-label">
            <span class="cat-dot" style="background:${CATEGORY_COLORS[cat] || "#71717a"}"></span>
            ${cat}
          </span>
          <span class="report-stat-value">${window.formatRupiah(amt)}</span>
        </div>
      `).join("");

    detailEl.innerHTML = `
      <p class="card-label">Pengeluaran per Kategori</p>
      ${rows || `<p class="empty-state">Tidak ada pengeluaran bulan ini.</p>`}
    `;
  }
}

function bindReport() {
  document.getElementById("btn-export")
    ?.addEventListener("click", exportCSV);
}

function exportCSV() {
  const month = window.appState.ui.activeMonth;
  const txns  = window.appState.transactions
    .filter(t => t.date.startsWith(month))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const header = "Tanggal,Tipe,Kategori,Jumlah,Catatan\n";
  const rows   = txns.map(t =>
    `${t.date},${t.type},${t.category},${t.amount},"${t.note || ""}"`
  ).join("\n");

  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `monect-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


// NAVIGATE 
function bindNavigation() {
  document.querySelectorAll(".nav-item[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  document.querySelectorAll("[data-tab-link]").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tabLink));
  });
}

function setActiveTab(tabName) {
  window.appState.ui.activeTab = tabName;

  document.querySelectorAll(".nav-item[data-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== `tab-${tabName}`);
  });

  // re-render tab yang baru dibuka agar selalu fresh
  if (tabName === "analytics") renderAnalytics();
  if (tabName === "goals")     renderGoals();
  if (tabName === "recurring") renderRecurring();
  if (tabName === "report")    renderReport();
}


// MODAL — add transaksi
function bindModal() {
  const overlay   = document.getElementById("modal-overlay");
  const typeToggle = document.getElementById("type-toggle");

  document.getElementById("btn-open-modal")?.addEventListener("click", openModal);
  document.getElementById("btn-close-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-save-txn")?.addEventListener("click", saveTransaction);

  overlay?.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay?.classList.contains("hidden")) closeModal();
  });

  typeToggle?.querySelectorAll(".type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      typeToggle.querySelectorAll(".type-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function openModal() {
  const overlay = document.getElementById("modal-overlay");
  const dateEl  = document.getElementById("txn-date");
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split("T")[0];
  overlay?.classList.remove("hidden");
  window.appState.ui.isModalOpen = true;
  document.getElementById("txn-amount")?.focus();
}

function closeModal() {
  document.getElementById("modal-overlay")?.classList.add("hidden");
  window.appState.ui.isModalOpen = false;
  resetModalForm();
}

function resetModalForm() {
  ["txn-amount", "txn-note", "txn-date"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.querySelectorAll(".type-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(".type-btn[data-type='expense']")?.classList.add("active");
}

function saveTransaction() {
  const amount   = parseFloat(document.getElementById("txn-amount").value);
  const category = document.getElementById("txn-category").value;
  const date     = document.getElementById("txn-date").value;
  const note     = document.getElementById("txn-note").value.trim();
  const type     = document.querySelector(".type-btn.active")?.dataset.type || "expense";

  if (!amount || amount <= 0) { flashInput("txn-amount"); return; }
  if (!date)                  { flashInput("txn-date");   return; }

  window.appState.transactions.push({
    id: window.generateId("txn"),
    date, amount, type, category,
    note: note || "",
    isRecurring: false,
  });
  window.saveState();
  renderDashboard();
  renderAnalytics();
  renderReport();
  closeModal();
}

function deleteTransaction(txnId) {
  if (!confirm("Hapus transaksi ini?")) return;
  window.appState.transactions = window.appState.transactions.filter(t => t.id !== txnId);
  window.saveState();
  renderDashboard();
  renderAnalytics();
  renderReport();
}


// TEMPLATE BUILDER
function buildTxnItem(txn) {
  const tmpl  = document.getElementById("tmpl-txn-item");
  const clone = tmpl.content.cloneNode(true);
  const li    = clone.querySelector(".txn-item");

  li.querySelector(".txn-category-dot").style.backgroundColor =
    CATEGORY_COLORS[txn.category] || "#71717a";
  li.querySelector(".txn-category-name").textContent = txn.category;
  li.querySelector(".txn-note").textContent          = txn.note || "—";

  const amtEl = li.querySelector(".txn-amount");
  amtEl.textContent = (txn.type === "income" ? "+" : "−") + window.formatRupiah(txn.amount);
  amtEl.classList.add(txn.type);

  li.querySelector(".txn-date").textContent = formatDate(txn.date);
  li.dataset.txnId = txn.id;
  return li;
}


// UTILITIES
function formatDate(dateStr) {
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function formatDateLong(dateStr) {
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function formatMonthLabel(yearMonth) {
  const months = ["Januari","Februari","Maret","April","Mei","Juni",
                  "Juli","Agustus","September","Oktober","November","Desember"];
  const [y, m] = yearMonth.split("-");
  return `${months[parseInt(m) - 1]} ${y}`;
}

function flashInput(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.style.borderColor = "var(--expense)";
  el.focus();
  setTimeout(() => { el.style.borderColor = ""; }, 1800);
}


// TOAST SYSTEM
/**
 * show toast notification
 * @param {string} msg  - pesan yang ditampilkan
 * @param {'success'|'error'|'warning'} type
 * @param {number} duration - ms sebelum menghilang (default 3000)
 */
function showToast(msg, type = "success", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = { success: "✓", error: "✕", warning: "⚠" };

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || "●"}</span>
    <span class="toast-msg">${msg}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--exit");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}

// expose globally so other modules can call it
window.showToast = showToast;


// MONTH NAVIGATOR
function bindMonthNav() {
  document.getElementById("btn-prev-month")
    ?.addEventListener("click", () => changeMonth(-1));
  document.getElementById("btn-next-month")
    ?.addEventListener("click", () => changeMonth(+1));
  updateMonthNavLabel();
}

function changeMonth(delta) {
  const [y, m] = window.appState.ui.activeMonth.split("-").map(Number);
  let newM = m + delta;
  let newY = y;
  if (newM > 12) { newM = 1;  newY++; }
  if (newM < 1)  { newM = 12; newY--; }
  window.appState.ui.activeMonth = `${newY}-${String(newM).padStart(2, "0")}`;
  updateMonthNavLabel();
  animateCards();
  renderDashboard();
  // juga update report & analytics jika sedang aktif
  if (window.appState.ui.activeTab === "analytics") renderAnalytics();
  if (window.appState.ui.activeTab === "report")    renderReport();
}

function updateMonthNavLabel() {
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const monthsFull = ["Januari","Februari","Maret","April","Mei","Juni",
                      "Juli","Agustus","September","Oktober","November","Desember"];
  const [y, m] = window.appState.ui.activeMonth.split("-").map(Number);

  const labelEl   = document.getElementById("month-nav-label");
  const eyebrowEl = document.getElementById("dashboard-eyebrow");

  if (labelEl)   labelEl.textContent   = `${months[m-1]} ${y}`;
  if (eyebrowEl) eyebrowEl.textContent = `${monthsFull[m-1]} ${y}`;
}


// CARD ANIMATIONS
function animateCards() {
  // flash opacity pada value cards saat bulan berganti
  const ids = ["display-balance", "display-income", "display-expense", "display-remaining"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("count-animate", "updating");
    setTimeout(() => el.classList.remove("updating"), 200);
  });
}

function animateProgressBars() {
  // reset width ke 0 dulu agar transisi CSS terlihat
  document.querySelectorAll(".goal-progress-fill, .budget-bar-fill, .category-bar-fill").forEach(el => {
    const target = el.style.width;
    el.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.width = target; });
    });
  });
}


// BUDGET CARD SMART WARNING
function updateBudgetCardState() {
  const card    = document.getElementById("card-budget");
  if (!card) return;
  const month   = window.appState.ui.activeMonth;
  const budget  = window.appState.profile.monthlyBudget;
  const expense = window.getTotalExpense(month);
  const pct     = budget > 0 ? (expense / budget) * 100 : 0;

  card.classList.remove("budget-warning", "budget-danger");
  if (pct >= 90) {
    card.classList.add("budget-danger");
  } else if (pct >= 70) {
    card.classList.add("budget-warning");
  }
}


// GOAL COMPLETE STATE
function applyGoalCompleteStates() {
  document.querySelectorAll(".goal-card[data-goal-id]").forEach(card => {
    const id  = card.dataset.goalId;
    const pct = window.getGoalProgress(id);
    card.classList.toggle("goal-card--complete", pct >= 100);
  });
}


// RECURRING INACTIVE STYLE
function applyRecurringInactiveStates() {
  document.querySelectorAll(".recurring-card[data-rec-id]").forEach(card => {
    const id  = card.dataset.recId;
    const rec = window.appState.recurring.find(r => r.id === id);
    card.classList.toggle("inactive-card", rec && !rec.isActive);
  });
}


// KEYBOARD SHORTCUTS
function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // jgn aktif saat user sedang ngetik di input/select/textarea
    if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
    // jgn aktif saat modal terbuka
    if (window.appState.ui.isModalOpen) return;

    const shortcuts = {
      "n": () => openModal(),                        // N = New transaksi
      "1": () => setActiveTab("dashboard"),
      "2": () => setActiveTab("analytics"),
      "3": () => setActiveTab("goals"),
      "4": () => setActiveTab("recurring"),
      "5": () => setActiveTab("report"),
      "ArrowLeft":  () => changeMonth(-1),           // ← = bulan sebelumnya
      "ArrowRight": () => changeMonth(+1),           // → = bulan berikutnya
    };

    if (shortcuts[e.key]) {
      e.preventDefault();
      shortcuts[e.key]();
    }
  });
}


/* PATCH: override renderDashboard,
   renderGoals, renderRecurring buat
   menyertakan enhancements */

// Simpan referensi fungsi lama
const _renderDashboardBase = renderDashboard;
const _renderGoalsBase     = renderGoals;
const _renderRecurringBase = renderRecurring;

// override dengan versi yang sudah diperkaya
renderDashboard = function() {
  _renderDashboardBase();
  updateBudgetCardState();
  updateMonthNavLabel();
  setTimeout(animateProgressBars, 50);
};

renderGoals = function() {
  _renderGoalsBase();
  setTimeout(() => {
    applyGoalCompleteStates();
    animateProgressBars();
  }, 50);
};

renderRecurring = function() {
  _renderRecurringBase();
  setTimeout(applyRecurringInactiveStates, 50);
};

// override saveTransaction bwat menambah toast
const _saveTransactionBase = saveTransaction;
saveTransaction = function() {
  const amountVal = document.getElementById("txn-amount")?.value;
  const type      = document.querySelector(".type-btn.active")?.dataset.type || "expense";
  _saveTransactionBase();
  // kalau modal tertutup (artinya save berhasil), tampilkan toast
  setTimeout(() => {
    if (!window.appState.ui.isModalOpen) {
      const label = type === "income" ? "Pemasukan" : "Pengeluaran";
      showToast(`${label} berhasil dicatat! 🎉`, "success");
    }
  }, 80);
};

// override deleteTransaction bwat menambah toast
const _deleteTransactionBase = deleteTransaction;
deleteTransaction = function(txnId) {
  const before = window.appState.transactions.length;
  _deleteTransactionBase(txnId);
  const after = window.appState.transactions.length;
  if (after < before) showToast("Transaksi dihapus.", "warning");
};

// override toggleRecurring bwat menambah toast
const _toggleRecurringBase = toggleRecurring;
toggleRecurring = function(recId) {
  _toggleRecurringBase(recId);
  const rec = window.appState.recurring.find(r => r.id === recId);
  if (rec) {
    showToast(
      rec.isActive ? `${rec.name} diaktifkan ✓` : `${rec.name} dinonaktifkan`,
      rec.isActive ? "success" : "warning"
    );
  }
};

// override openTopupModal bwat menambah toast
const _openTopupModalBase = openTopupModal;
openTopupModal = function(goalId) {
  const before = window.appState.goals.find(g => g.id === goalId)?.currentAmount || 0;
  _openTopupModalBase(goalId);
  const after  = window.appState.goals.find(g => g.id === goalId)?.currentAmount || 0;
  if (after > before) {
    const pct = window.getGoalProgress(goalId);
    const msg = pct >= 100
      ? "🎉 Goal tercapai! Luar biasa!"
      : `Top up berhasil! Progress: ${pct}%`;
    showToast(msg, pct >= 100 ? "success" : "success");
  }
};


// INIT PATCH 
document.addEventListener("DOMContentLoaded", () => {
  bindMonthNav();
  bindKeyboardShortcuts();
  updateBudgetCardState();
  setTimeout(animateProgressBars, 100);

  // hint keyboard shortcut pertama kali
  setTimeout(() => {
    if (!localStorage.getItem("monect_hint_shown")) {
      showToast("Tip: Tekan N bwat tambah transaksi cepat ⚡", "success", 4500);
      localStorage.setItem("monect_hint_shown", "1");
    }
  }, 1200);
});