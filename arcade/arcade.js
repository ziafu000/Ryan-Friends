// arcade.js — Gate / Token / Curfew / Analytics (ES module)

/**
 * Khởi tạo state từ config + localStorage.
 * Dev mode: thêm ?dev=1 vào URL để bỏ gate khi QA.
 */
export async function init(cfgUrl) {
  const res = await fetch(cfgUrl, { cache: "no-cache" });
  const cfg = await res.json();

  // Dev mode (QA): /arcade.html?dev=1
  const q = new URLSearchParams(location.search);
  if (q.get("dev") === "1") {
    cfg.arcade.unlock_streak = 0;
    cfg.arcade.cooldown_minutes = 0;
    cfg.arcade.daily_limit_minutes = 999;
    cfg.arcade.curfew = "23:59";
  }

  const todayKey = dateKey();
  const state = {
    cfg,
    streak: getInt("hl_streak", 0),
    tokens: getInt("hl_tokens", 0),
    last_play_ts: getInt("hl_last_play_ts", 0),
    daily_play_ms: getInt("hl_daily_play_ms", 0),
    daily_date: localStorage.getItem("hl_daily_date") || todayKey
  };

  // Reset giới hạn theo ngày nếu sang ngày mới
  if (state.daily_date !== todayKey) {
    state.daily_play_ms = 0;
    state.daily_date = todayKey;
    persist(state);
  }
  return state;
}

/** Hoàn thành Ritual: +streak, +token (không vượt token_cap) */
export function completeRitual(state) {
  state.streak = (state.streak | 0) + 1;
  const cap = Number(state.cfg.arcade.token_cap) || 0;
  const per = Number(state.cfg.arcade.token_per_ritual) || 0;
  state.tokens = Math.min(cap, (state.tokens | 0) + per);
  persist(state);
  logEvent("ritual_complete", {});
}

/** Dùng 1 token để bắt đầu ván chơi + ghi timestamp cooldown */
export function consumeToken(state) {
  const t = (state.tokens | 0);
  state.tokens = Math.max(0, t - 1);
  state.last_play_ts = Date.now();
  persist(state);
}

/** Kết thúc ván: cộng thời lượng chơi ngày */
export function onGameEnd(state, stats) {
  const dur = Math.max(0, Number(stats?.duration_ms) || 0);
  state.daily_play_ms = Math.max(0, (state.daily_play_ms | 0) + dur);
  persist(state);
  logEvent("game_end", {
    score: stats?.score ?? 0,
    combo_max: stats?.comboMax ?? 0,
    duration_ms: dur
  });
}

/** Kiểm tra các điều kiện khoá */
export function checkGate(state) {
  if ((state.streak | 0) < Number(state.cfg.arcade.unlock_streak) || 0) return "need_50_streak";
  if ((state.tokens | 0) <= 0) return "no_token";
  if (isCurfew(state.cfg.arcade.curfew)) return "curfew";

  const limMs = (Number(state.cfg.arcade.daily_limit_minutes) || 0) * 60 * 1000;
  if (limMs > 0 && (state.daily_play_ms | 0) >= limMs) return "daily_limit";

  const cdMs = (Number(state.cfg.arcade.cooldown_minutes) || 0) * 60 * 1000;
  if (cdMs > 0 && Date.now() - (state.last_play_ts | 0) < cdMs) return "cooldown";

  return null;
}

/** Thông điệp hiển thị cho từng mã khoá */
export function gateMessage(code) {
  switch (code) {
    case "need_50_streak": return "Khoá: cần đạt 50 streak để mở Harmony Arcade.";
    case "no_token":       return "Khoá: hết token. Hãy hoàn thành Ritual để nhận token.";
    case "curfew":         return "Khoá: đã quá giờ ngủ. Hẹn bạn ngày mai!";
    case "daily_limit":    return "Khoá: bạn đã đạt giới hạn chơi 10 phút/ngày.";
    case "cooldown":       return "Tạm khoá: chờ 3 phút trước khi chơi tiếp.";
    default:               return "";
  }
}

/** Ghi log ẩn danh vào localStorage để export */
export function logEvent(event, props = {}) {
  try {
    const rec = { event, props, t: Date.now() };
    const arr = JSON.parse(localStorage.getItem("hl_arcade_logs") || "[]");
    arr.push(rec);
    localStorage.setItem("hl_arcade_logs", JSON.stringify(arr));
  } catch { /* noop */ }
}

/** Xuất log JSON */
export function exportLogs() {
  try {
    const data = localStorage.getItem("hl_arcade_logs") || "[]";
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `harmony_arcade_logs_${dateKey()}.json`
    });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch { /* noop */ }
}

/* ===================== Helpers ===================== */

function getInt(k, d) {
  const v = parseInt(localStorage.getItem(k) ?? `${d}`, 10);
  return Number.isNaN(v) ? d : v;
}

function persist(s) {
  localStorage.setItem("hl_streak", String(s.streak | 0));
  localStorage.setItem("hl_tokens", String(s.tokens | 0));
  localStorage.setItem("hl_last_play_ts", String(s.last_play_ts | 0));
  localStorage.setItem("hl_daily_play_ms", String(s.daily_play_ms | 0));
  localStorage.setItem("hl_daily_date", s.daily_date);
}

function isCurfew(hhmm) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return false;
  const [h, m] = hhmm.split(":").map(n => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const now = new Date();
  const curfew = new Date(now);
  curfew.setHours(h, m, 0, 0);
  return now.getTime() >= curfew.getTime();
}

function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
