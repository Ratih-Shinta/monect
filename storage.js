const STORAGE_KEY = "monect_state_v1";

//  simpen state ke localStorage.
//  cma simpan bagian yang perlu persisten (bukan ui state).
window.saveState = function () {
  const { profile, transactions, goals, recurring } = window.appState;

  try {
    const payload = JSON.stringify({ profile, transactions, goals, recurring });
    localStorage.setItem(STORAGE_KEY, payload);
    console.log("[Monect] State saved to localStorage ✓");
  } catch (err) {
    console.error("[Monect] Gagal menyimpan state:", err);
  }
};


// load state dari localStorage dan merge ke window.appState.
// kalau ga ada data tersimpan, appState tetap pke data dummy dari app.js.
window.loadState = function () {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      console.log("[Monect] Tidak ada data tersimpan — menggunakan data dummy.");
      return;
    }

    const saved = JSON.parse(raw);

    // merge cma field yang ada di saved data
    if (saved.profile)      window.appState.profile      = saved.profile;
    if (saved.transactions) window.appState.transactions = saved.transactions;
    if (saved.goals)        window.appState.goals        = saved.goals;
    if (saved.recurring)    window.appState.recurring    = saved.recurring;

    console.log("[Monect] State loaded from localStorage ✓");
    console.log(`[Monect] ${saved.transactions?.length ?? 0} transaksi ditemukan.`);
  } catch (err) {
    console.error("[Monect] Gagal membaca state, reset ke dummy:", err);
    // jangan crash — biarin app.js punya data dummy yang jalan
  }
};

/**
 * hapus semua data tersimpan (untuk fitur "reset akun").
 */
window.clearState = function () {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[Monect] State cleared ✓");
  } catch (err) {
    console.error("[Monect] Gagal menghapus state:", err);
  }
};

/**
 * cek ada data tersimpan di localStorage ga
 * @returns {boolean}
 */
window.hasSavedState = function () {
  return localStorage.getItem(STORAGE_KEY) !== null;
};

console.log("[Monect] storage.js loaded ✓");