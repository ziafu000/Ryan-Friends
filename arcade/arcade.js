export async function init(cfgUrl) {
  const res = await fetch(cfgUrl);
  const cfg = await res.json();
  const todayKey = dateKey();
  const state = {
    cfg,
    streak: getInt('hl_streak', 0),
    tokens: getInt('hl_tokens', 0),
    last_play_ts: getInt('hl_last_play_ts', 0),
    daily_play_ms: getInt('hl_daily_play_ms', 0),
    daily_date: localStorage.getItem('hl_daily_date') || todayKey
  };
  if (state.daily_date !== todayKey) { state.daily_play_ms = 0; state.daily_date = todayKey; persist(state); }
  return state;
}
export function completeRitual(state) {
  state.streak += 1;
  state.tokens = Math.min(state.cfg.arcade.token_cap, state.tokens + state.cfg.arcade.token_per_ritual);
  persist(state);
  logEvent('ritual_complete', {});
}
export function consumeToken(state) {
  state.tokens = Math.max(0, state.tokens - 1);
  state.last_play_ts = Date.now();
  persist(state);
}
export function onGameEnd(state, stats) {
  state.daily_play_ms += stats.duration_ms;
  persist(state);
  logEvent('game_end', { score: stats.score, combo_max: stats.comboMax, duration_ms: stats.duration_ms });
}
export function checkGate(state) {
  if (state.streak < state.cfg.arcade.unlock_streak) return 'need_50_streak';
  if (state.tokens <= 0) return 'no_token';
  if (isCurfew(state.cfg.arcade.curfew)) return 'curfew';
  const limMs = state.cfg.arcade.daily_limit_minutes * 60 * 1000;
  if (state.daily_play_ms >= limMs) return 'daily_limit';
  const cdMs = state.cfg.arcade.cooldown_minutes * 60 * 1000;
  if (Date.now() - state.last_play_ts < cdMs) return 'cooldown';
  return null;
}
export function gateMessage(code) {
  switch (code) {
    case 'need_50_streak': return 'Khoá: cần đạt 50 streak để mở Harmony Arcade.';
    case 'no_token': return 'Khoá: hết token. Hãy hoàn thành Ritual để nhận token.';
    case 'curfew': return 'Khoá: đã quá giờ ngủ. Hẹn bạn ngày mai!';
    case 'daily_limit': return 'Khoá: bạn đã đạt giới hạn chơi 10 phút/ngày.';
    case 'cooldown': return 'Tạm khoá: chờ 3 phút trước khi chơi tiếp.';
    default: return '';
  }
}
export function logEvent(event, props = {}) {
  const rec = { event, props, t: Date.now() };
  const arr = JSON.parse(localStorage.getItem('hl_arcade_logs') || '[]');
  arr.push(rec);
  localStorage.setItem('hl_arcade_logs', JSON.stringify(arr));
}
export function exportLogs() {
  const data = localStorage.getItem('hl_arcade_logs') || '[]';
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `harmony_arcade_logs_${dateKey()}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function getInt(k, d) { const v = parseInt(localStorage.getItem(k) || `${d}`, 10); return Number.isNaN(v) ? d : v; }
function persist(s) {
  localStorage.setItem('hl_streak', String(s.streak));
  localStorage.setItem('hl_tokens', String(s.tokens));
  localStorage.setItem('hl_last_play_ts', String(s.last_play_ts));
  localStorage.setItem('hl_daily_play_ms', String(s.daily_play_ms));
  localStorage.setItem('hl_daily_date', s.daily_date);
}
function isCurfew(hhmm) {
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  const now = new Date(); const curfew = new Date(now);
  curfew.setHours(h, m, 0, 0);
  return now.getTime() >= curfew.getTime();
}
function dateKey(d = new Date()) { return d.toISOString().slice(0, 10); }