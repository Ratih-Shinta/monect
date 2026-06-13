const CATEGORY_COLORS = {
  "Food":          "#f97316",
  "Coffee":        "#a78bfa",
  "Transport":     "#38bdf8",
  "Education":     "#34d399",
  "Subscriptions": "#a3e635",
  "Housing":       "#fb7185",
  "Utilities":     "#fbbf24",
  "Entertainment": "#c084fc",
  "Health":        "#2dd4bf",
  "Scholarship":   "#a3e635",
  "Freelance":     "#60a5fa",
  "Other":         "#71717a",
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL  = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];


// INIT 
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bindNavigation();
  bindModal();
  bindGoals();
  bindRecurring();
  bindReport();
  bindMonthNav();
  bindKeyboardShortcuts();
  setTimeout(animateProgressBars, 120);

  if (!localStorage.getItem("monect_hint_shown")) {
    setTimeout(() => {
      showToast("Tip: Press N to quickly add a transaction ⚡", "success", 5000);
      localStorage.setItem("monect_hint_shown", "1");
    }, 1400);
  }

  console.log("[Monect] dom-handler.js ready ✓");
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

function renderUsername() {
  const { name } = window.appState.profile;
  const el = (id) => document.getElementById(id);
  if (el("header-username"))  el("header-username").textContent  = name;
  if (el("sidebar-username")) el("sidebar-username").textContent = name;
  if (el("user-avatar"))      el("user-avatar").textContent      = name.charAt(0).toUpperCase();
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
  updateBudgetCardState();
  updateMonthNavLabel();
}

function renderBalanceCard() {
  const balance = window.getNetBalance();
  const el      = document.getElementById("display-balance");
  const subEl   = document.getElementById("display-balance-sub");
  if (el)    el.textContent    = window.formatRupiah(balance);
  if (subEl) {
    subEl.textContent = balance >= 0 ? "net balance from all transactions" : "you're running negative 👀";
    subEl.style.color = balance >= 0 ? "var(--text-muted)" : "var(--expense)";
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
    pctEl.textContent = remaining >= 0 ? `${usedPct}% of budget used` : "Monthly budget exceeded!";
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
    listEl.innerHTML = `<li class="empty-state">No transactions yet — add one!</li>`;
    return;
  }
  recent.forEach(txn => listEl.appendChild(buildTxnItem(txn)));
}


// cashflow chart 
function renderCashflowChart(month) {
  const canvas = document.getElementById("cashflow-chart");
  if (!canvas) return;
  const ctx  = canvas.getContext("2d");
  const W    = canvas.offsetWidth || 400;
  const H    = 160;
  canvas.width  = W;
  canvas.height = H;

  const months   = getLast6Months(month);
  const incomes  = months.map(m => window.getTotalIncome(m));
  const expenses = months.map(m => window.getTotalExpense(m));
  const labels   = months.map(m => MONTHS_SHORT[parseInt(m.split("-")[1]) - 1]);
  const maxVal   = Math.max(...incomes, ...expenses, 1);

  const pad    = { top: 24, right: 16, bottom: 36, left: 16 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;
  const barW   = Math.floor(chartW / months.length);
  const groupW = barW * 0.76;

  ctx.clearRect(0, 0, W, H);

  // rrid lines
  [0, 1, 2, 3].forEach(i => {
    ctx.strokeStyle = "rgba(63,63,70,0.45)";
    ctx.lineWidth   = 1;
    const y = pad.top + (chartH / 3) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  });

  // bar
  months.forEach((_, i) => {
    const x = pad.left + i * barW + (barW - groupW) / 2;
    const hw = groupW / 2 - 2;

    const drawBar = (val, color, offsetX) => {
      const h = maxVal > 0 ? (val / maxVal) * chartH : 0;
      if (h < 1) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + offsetX, pad.top + chartH - h, hw, h, [3, 3, 0, 0]);
      ctx.fill();
    };

    drawBar(incomes[i],  "rgba(163,230,53,0.88)",  0);
    drawBar(expenses[i], "rgba(248,113,113,0.88)", hw + 2);

    // month label
    ctx.fillStyle   = "#52525b";
    ctx.font        = "11px Inter, sans-serif";
    ctx.textAlign   = "center";
    ctx.fillText(labels[i], x + groupW / 2, H - 10);
  });

  // legend
  const drawLegend = (x, color, label) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, 9, 9, 7);
    ctx.fillStyle   = "#71717a";
    ctx.font        = "10px Inter, sans-serif";
    ctx.textAlign   = "left";
    ctx.fillText(label, x + 13, 16);
  };
  drawLegend(pad.left,      "rgba(163,230,53,0.88)",  "Income");
  drawLegend(pad.left + 68, "rgba(248,113,113,0.88)", "Expenses");
}

function getLast6Months(currentMonth) {
  const [y, m] = currentMonth.split("-").map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    let mo = m - (5 - i), yr = y;
    if (mo <= 0) { mo += 12; yr--; }
    return `${yr}-${String(mo).padStart(2, "0")}`;
  });
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

  if (countEl) countEl.textContent = `${txns.length} transaction${txns.length !== 1 ? "s" : ""}`;
  listEl.innerHTML = "";

  if (txns.length === 0) {
    listEl.innerHTML = `<li class="empty-state">No transactions in this category.</li>`;
    return;
  }

  txns.forEach(txn => {
    const item   = buildTxnItem(txn);
    const delBtn = document.createElement("button");
    delBtn.className   = "txn-delete-btn";
    delBtn.textContent = "×";
    delBtn.title       = "Delete transaction";
    delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteTransaction(txn.id); });
    item.querySelector(".txn-item__right").appendChild(delBtn);
    listEl.appendChild(item);
  });
}

function renderCategoryList(month) {
  const listEl = document.getElementById("category-list");
  if (!listEl) return;

  const byCategory = window.getExpenseByCategory(month);
  const total      = window.getTotalExpense(month);
  const sorted     = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const tmpl = document.getElementById("tmpl-category-item");
  listEl.innerHTML = "";

  if (sorted.length === 0) {
    listEl.innerHTML = `<li class="empty-state">No expenses this month.</li>`;
    return;
  }

  sorted.forEach(([cat, amount]) => {
    const clone = tmpl.content.cloneNode(true);
    const li    = clone.querySelector(".category-item");
    const pct   = total > 0 ? Math.round((amount / total) * 100) : 0;
    const color = CATEGORY_COLORS[cat] || "#71717a";

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
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  if (total === 0) {
    ctx.fillStyle = "rgba(39,39,42,0.6)";
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#52525b"; ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("No data yet", size/2, size/2);
    return;
  }

  const cx = size / 2, cy = size / 2, outerR = size/2 - 8, innerR = outerR * 0.55;
  let startAngle = -Math.PI / 2;

  entries.forEach(([cat, amount]) => {
    const slice = (amount / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = CATEGORY_COLORS[cat] || "#71717a";
    ctx.fill();
    startAngle += slice;
  });

  // donut hole
  const bgColor = getComputedStyle(document.documentElement).getPropertyValue("--bg-card").trim() || "#111113";
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI*2);
  ctx.fillStyle = bgColor; ctx.fill();

  // center text
  ctx.fillStyle = "rgba(250,250,250,0.9)";
  ctx.font = "bold 12px Space Grotesk, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(window.formatRupiah(total), cx, cy - 9);
  ctx.fillStyle = "#71717a"; ctx.font = "10px Inter, sans-serif";
  ctx.fillText("total spent", cx, cy + 10);
}

function renderFilterChips() {
  const container = document.getElementById("analytics-filter");
  if (!container) return;

  container.querySelectorAll(".filter-chip:not([data-filter='all'])").forEach(c => c.remove());

  const categories = [...new Set(window.appState.transactions.map(t => t.category))].sort();
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className      = "filter-chip";
    btn.dataset.filter = cat;
    btn.textContent    = cat;
    btn.addEventListener("click", () => applyFilter(cat));
    container.appendChild(btn);
  });

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
    grid.innerHTML = `<div class="empty-state-full">No goals yet — set your first target! 🎯</div>`;
    return;
  }

  window.appState.goals.forEach(goal => {
    const clone = tmpl.content.cloneNode(true);
    const card  = clone.querySelector(".goal-card");
    const pct   = window.getGoalProgress(goal.id);

    card.querySelector(".goal-emoji").textContent    = goal.emoji;
    card.querySelector(".goal-name").textContent     = goal.name;
    card.querySelector(".goal-deadline").textContent = "Target: " + formatDateLong(goal.deadline);
    card.querySelector(".goal-current").textContent  = window.formatRupiah(goal.currentAmount);
    card.querySelector(".goal-target").textContent   = window.formatRupiah(goal.targetAmount);

    const fill  = card.querySelector(".goal-progress-fill");
    const badge = card.querySelector(".goal-pct-badge");
    fill.style.width = pct + "%";

    if (pct >= 100) {
      badge.textContent        = "✓ Complete!";
      badge.style.background   = "var(--accent-dim)";
      badge.style.color        = "var(--accent)";
      fill.style.backgroundColor = "var(--accent)";
      card.classList.add("goal-card--complete");
    } else if (pct < 30) {
      badge.textContent      = pct + "%";
      badge.style.background = "var(--warning-dim)";
      badge.style.color      = "var(--warning)";
      fill.style.backgroundColor = "var(--warning)";
    } else {
      badge.textContent = pct + "%";
    }

    card.querySelector(".goal-topup-btn")
      .addEventListener("click", () => openTopupModal(goal.id));

    card.dataset.goalId = goal.id;
    grid.appendChild(clone);
  });

  setTimeout(animateProgressBars, 50);
}

function bindGoals() {
  document.getElementById("btn-add-goal")
    ?.addEventListener("click", openAddGoalModal);
}

function openTopupModal(goalId) {
  const goal   = window.appState.goals.find(g => g.id === goalId);
  if (!goal) return;
  const remain = goal.targetAmount - goal.currentAmount;
  const input  = prompt(
    `Top up "${goal.name}"\nRemaining: ${window.formatRupiah(remain)}\n\nEnter amount (Rp):`
  );
  if (!input) return;
  const num = parseFloat(input.replace(/\D/g, ""));
  if (!num || num <= 0) { showToast("Invalid amount.", "error"); return; }

  const before = goal.currentAmount;
  goal.currentAmount = Math.min(goal.targetAmount, goal.currentAmount + num);
  window.saveState();
  renderGoals();

  const newPct = window.getGoalProgress(goalId);
  const msg = newPct >= 100
    ? `🎉 Goal complete! "${goal.name}" achieved!`
    : `Top up saved! Progress: ${newPct}%`;
  showToast(msg, "success");
}

function openAddGoalModal() {
  const name = prompt("Goal name:");
  if (!name?.trim()) return;
  const target = parseFloat(prompt("Target amount (Rp):"));
  if (!target || target <= 0) { showToast("Invalid amount.", "error"); return; }
  const deadline = prompt("Deadline (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);

  const emojis = ["🎯","💻","🏝️","🚗","👟","📱","🛡️","🎓","🏠","✈️","🎸","🎮"];
  const emoji  = emojis[Math.floor(Math.random() * emojis.length)];

  window.appState.goals.push({
    id: window.generateId("goal"),
    name: name.trim(), emoji,
    targetAmount: target, currentAmount: 0,
    deadline: deadline || new Date().toISOString().split("T")[0],
  });
  window.saveState();
  renderGoals();
  showToast(`Goal "${name.trim()}" created! 🎯`, "success");
}


// RECURRING 
function renderRecurring() {
  const grid = document.getElementById("recurring-grid");
  if (!grid) return;
  const tmpl = document.getElementById("tmpl-recurring-card");
  grid.innerHTML = "";

  if (window.appState.recurring.length === 0) {
    grid.innerHTML = `<div class="empty-state-full">No recurring expenses yet.</div>`;
    return;
  }

  window.appState.recurring.forEach(rec => {
    const clone = tmpl.content.cloneNode(true);
    const card  = clone.querySelector(".recurring-card");

    card.querySelector(".recurring-name").textContent     = rec.name;
    card.querySelector(".recurring-amount").textContent   = window.formatRupiah(rec.amount);
    card.querySelector(".recurring-day").textContent      = `Day ${rec.dayOfMonth} monthly`;
    card.querySelector(".recurring-category").textContent = rec.category;

    const dot = card.querySelector(".recurring-status-dot");
    if (!rec.isActive) dot.classList.add("inactive");

    if (rec.limit) {
      const track = card.querySelector(".recurring-limit-bar-track");
      const fill  = card.querySelector(".recurring-limit-bar-fill");
      track.classList.remove("hidden");
      const pct = Math.min(100, Math.round((rec.amount / rec.limit) * 100));
      fill.style.width = pct + "%";
      fill.style.backgroundColor =
        pct >= 90 ? "var(--expense)" : pct >= 70 ? "var(--warning)" : "var(--accent)";
    }

    card.classList.toggle("inactive-card", !rec.isActive);
    card.dataset.recId = rec.id;
    card.addEventListener("click", () => toggleRecurring(rec.id));
    card.title = rec.isActive ? "Click to deactivate" : "Click to activate";
    grid.appendChild(clone);
  });

  renderRecurringSummary();
}

function renderRecurringSummary() {
  const total   = window.appState.recurring
    .filter(r => r.isActive)
    .reduce((s, r) => s + r.amount, 0);
  const eyebrow = document.querySelector("#tab-recurring .page-eyebrow");
  if (eyebrow) eyebrow.textContent = `Active total: ${window.formatRupiah(total)}/mo`;
}

function toggleRecurring(recId) {
  const rec = window.appState.recurring.find(r => r.id === recId);
  if (!rec) return;
  rec.isActive = !rec.isActive;
  window.saveState();
  renderRecurring();
  showToast(
    rec.isActive ? `${rec.name} activated ✓` : `${rec.name} deactivated`,
    rec.isActive ? "success" : "warning"
  );
}

function bindRecurring() {
  document.getElementById("btn-add-recurring")
    ?.addEventListener("click", openAddRecurringModal);
}

function openAddRecurringModal() {
  const name = prompt("Recurring expense name:");
  if (!name?.trim()) return;
  const amount = parseFloat(prompt("Amount per month (Rp):"));
  if (!amount || amount <= 0) { showToast("Invalid amount.", "error"); return; }
  const day = parseInt(prompt("Billing day each month (1–28):", "1"));
  const cat = prompt("Category:", "Subscriptions");

  window.appState.recurring.push({
    id: window.generateId("rec"),
    name: name.trim(), amount,
    category: cat || "Subscriptions",
    dayOfMonth: isNaN(day) ? 1 : Math.min(28, Math.max(1, day)),
    limit: null, isActive: true,
  });
  window.saveState();
  renderRecurring();
  showToast(`"${name.trim()}" added to recurring ✓`, "success");
}


// REPORT 
function renderReport() {
  const month    = window.appState.ui.activeMonth;
  const income   = window.getTotalIncome(month);
  const expense  = window.getTotalExpense(month);
  const net      = income - expense;
  const budget   = window.appState.profile.monthlyBudget;
  const txnCount = window.appState.transactions.filter(t => t.date.startsWith(month)).length;
  const byCategory = window.getExpenseByCategory(month);

  const statRow = (label, value, cls = "") => `
    <div class="report-stat-row">
      <span class="report-stat-label">${label}</span>
      <span class="report-stat-value ${cls}">${value}</span>
    </div>`;

  // summary card
  const summaryEl = document.getElementById("report-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <p class="card-label">Summary — ${MONTHS_FULL[parseInt(month.split("-")[1]) - 1]} ${month.split("-")[0]}</p>
      ${statRow("Income",           window.formatRupiah(income),  "income")}
      ${statRow("Expenses",         window.formatRupiah(expense), "expense")}
      <div class="report-divider"></div>
      ${statRow("Net",              window.formatRupiah(net),     net >= 0 ? "income" : "expense")}
      ${statRow("Monthly Budget",   window.formatRupiah(budget))}
      ${statRow("Budget Remaining", window.formatRupiah(window.getRemainingBudget(month)),
                                    window.getRemainingBudget(month) >= 0 ? "income" : "expense")}
      ${statRow("Transactions",     `${txnCount} total`)}
    `;
  }

  // detail card
  const detailEl = document.getElementById("report-detail");
  if (detailEl) {
    const rows = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `
        <div class="report-stat-row">
          <span class="report-stat-label">
            <span class="cat-dot" style="background:${CATEGORY_COLORS[cat]||"#71717a"}"></span>
            ${cat}
          </span>
          <span class="report-stat-value">${window.formatRupiah(amt)}</span>
        </div>
      `).join("");

    detailEl.innerHTML = `
      <p class="card-label">Expenses by Category</p>
      ${rows || `<p class="empty-state">No expenses this month.</p>`}
    `;
  }
}

function bindReport() {
  document.getElementById("btn-export")?.addEventListener("click", exportCSV);
}

function exportCSV() {
  const month = window.appState.ui.activeMonth;
  const txns  = window.appState.transactions
    .filter(t => t.date.startsWith(month))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const header = "Date,Type,Category,Amount,Note\n";
  const rows   = txns.map(t =>
    `${t.date},${t.type},${t.category},${t.amount},"${t.note || ""}"`
  ).join("\n");

  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `monect-${month}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast("Report exported as CSV ✓", "success");
}


// NAVIGATION 
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

  if (tabName === "analytics") renderAnalytics();
  if (tabName === "goals")     renderGoals();
  if (tabName === "recurring") renderRecurring();
  if (tabName === "report")    renderReport();
}


// pop up - add transactions
function bindModal() {
  const overlay    = document.getElementById("modal-overlay");
  const typeToggle = document.getElementById("type-toggle");

  document.getElementById("btn-open-modal")?.addEventListener("click",  openModal);
  document.getElementById("btn-close-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-modal")?.addEventListener("click",closeModal);
  document.getElementById("btn-save-txn")?.addEventListener("click",    saveTransaction);

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
  const dateEl = document.getElementById("txn-date");
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split("T")[0];
  document.getElementById("modal-overlay")?.classList.remove("hidden");
  window.appState.ui.isModalOpen = true;
  setTimeout(() => document.getElementById("txn-amount")?.focus(), 80);
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
  const amount   = parseFloat(document.getElementById("txn-amount")?.value);
  const category = document.getElementById("txn-category")?.value;
  const date     = document.getElementById("txn-date")?.value;
  const note     = document.getElementById("txn-note")?.value.trim();
  const type     = document.querySelector(".type-btn.active")?.dataset.type || "expense";

  if (!amount || amount <= 0) { flashInput("txn-amount"); return; }
  if (!date)                  { flashInput("txn-date");   return; }

  window.appState.transactions.push({
    id: window.generateId("txn"),
    date, amount, type, category,
    note: note || "", isRecurring: false,
  });
  window.saveState();
  renderDashboard();
  renderAnalytics();
  renderReport();
  closeModal();

  const label = type === "income" ? "Income" : "Expense";
  showToast(`${label} saved — ${window.formatRupiah(amount)} ✓`, "success");
}

function deleteTransaction(txnId) {
  if (!confirm("Delete this transaction?")) return;
  window.appState.transactions = window.appState.transactions.filter(t => t.id !== txnId);
  window.saveState();
  renderDashboard();
  renderAnalytics();
  renderReport();
  showToast("Transaction deleted.", "warning");
}


// month nav 
function bindMonthNav() {
  document.getElementById("btn-prev-month")?.addEventListener("click", () => changeMonth(-1));
  document.getElementById("btn-next-month")?.addEventListener("click", () => changeMonth(+1));
  updateMonthNavLabel();
}

function changeMonth(delta) {
  const [y, m] = window.appState.ui.activeMonth.split("-").map(Number);
  let newM = m + delta, newY = y;
  if (newM > 12) { newM = 1;  newY++; }
  if (newM < 1)  { newM = 12; newY--; }
  window.appState.ui.activeMonth = `${newY}-${String(newM).padStart(2, "0")}`;
  animateCards();
  renderDashboard();
  if (window.appState.ui.activeTab === "analytics") renderAnalytics();
  if (window.appState.ui.activeTab === "report")    renderReport();
}

function updateMonthNavLabel() {
  const [y, m] = window.appState.ui.activeMonth.split("-").map(Number);
  const labelEl   = document.getElementById("month-nav-label");
  const eyebrowEl = document.getElementById("dashboard-eyebrow");
  if (labelEl)   labelEl.textContent   = `${MONTHS_SHORT[m-1]} ${y}`;
  if (eyebrowEl) eyebrowEl.textContent = `${MONTHS_FULL[m-1]} ${y}`;
}


// TOAST 
function showToast(msg, type = "success", duration = 3200) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = { success: "✓", error: "✕", warning: "⚠" };
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||"●"}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--exit");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}

window.showToast = showToast;


// SHOTRCUTS 
function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
    if (window.appState.ui.isModalOpen) return;

    const shortcuts = {
      "n": openModal,
      "1": () => setActiveTab("dashboard"),
      "2": () => setActiveTab("analytics"),
      "3": () => setActiveTab("goals"),
      "4": () => setActiveTab("recurring"),
      "5": () => setActiveTab("report"),
      "ArrowLeft":  () => changeMonth(-1),
      "ArrowRight": () => changeMonth(+1),
    };

    if (shortcuts[e.key]) { e.preventDefault(); shortcuts[e.key](); }
  });
}


// anim 
function animateCards() {
  ["display-balance","display-income","display-expense","display-remaining"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("count-animate","updating");
    setTimeout(() => el.classList.remove("updating"), 220);
  });
}

function animateProgressBars() {
  document.querySelectorAll(
    ".goal-progress-fill, .budget-bar-fill, .category-bar-fill, .recurring-limit-bar-fill"
  ).forEach(el => {
    const target = el.style.width;
    el.style.transition = "none";
    el.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = "";
      el.style.width = target;
    }));
  });
}

function updateBudgetCardState() {
  const card  = document.getElementById("card-budget");
  if (!card) return;
  const expense = window.getTotalExpense(window.appState.ui.activeMonth);
  const budget  = window.appState.profile.monthlyBudget;
  const pct     = budget > 0 ? (expense / budget) * 100 : 0;
  card.classList.remove("budget-warning","budget-danger");
  if (pct >= 90)      card.classList.add("budget-danger");
  else if (pct >= 70) card.classList.add("budget-warning");
}


// TEMPLATE 
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


// utilities 
function formatDate(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${MONTHS_SHORT[parseInt(m) - 1]}`;
}

function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${MONTHS_FULL[parseInt(m) - 1]} ${y}`;
}

function flashInput(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.style.borderColor = "var(--expense)";
  el.focus();
  setTimeout(() => { el.style.borderColor = ""; }, 1800);
}