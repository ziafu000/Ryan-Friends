// arcade/game_dreamdrift.js — Ryan Reskin + Hearts + Waves + Power-ups
// - Pointer-follow with acceleration (mượt)
// - TOKEN tròn (score/booster/heal), OBSTACLE vuông (điện thoại/⚠)
// - Hiệu ứng pop + điểm bay lên, rung + flash khi đụng
// - Hệ tim (2–3), booster x2, wave khó dần, bonus theo streak

export class Game {
  constructor(canvas, cfg, { skipFx = false, onEnd, startingHearts = 2, streakBonus = 1 } = {}) {
    this.C = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.skipFx = skipFx;
    this.onEnd = onEnd || (() => { });
    this.startingHearts = Math.max(1, Number(startingHearts || 2));
    this.streakBonus = Number(streakBonus || 1);
    this.reset();
  }

  reset() {
    this.playing = false;
    this.t0 = 0;               // raf timestamp
    this.elapsed = 0;          // ms elapsed
    this.score = 0; this.combo = 0; this.comboMax = 0;

    // Entities
    this.tokens = [];          // tròn: score/booster/heal
    this.blocks = [];          // vuông: obstacle
    this.floaters = [];        // text bay lên
    this.flash = 0;            // flash khi đụng
    this.hitCooldown = 0;      // invul sau khi trúng

    // Hearts
    this.maxHearts = Math.max(this.cfg.max_hearts || 3, this.startingHearts);
    this.hearts = this.startingHearts;

    // Booster
    this.boostUntil = 0;

    // Base speed
    this.baseSpeed = Number(this.cfg.speed || 2.0);

    // Spawn acc
    this.accToken = 0;
    this.accBlock = 0;

    // Pointer-follow + acceleration
    const w = this._w(), h = this._h();
    this.glider = { x: w * 0.2, y: h * 0.5, r: Number(this.cfg.glider_radius || 18), vx: 0, vy: 0 };
    this.target = { x: this.glider.x, y: this.glider.y };
  }

  _w() { return this.C.clientWidth || this.C.width; }
  _h() { return this.C.clientHeight || this.C.height; }

  setTargetFromEvent(e) {
    let cx, cy;
    if (e.touches && e.touches[0]) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    const rect = this.C.getBoundingClientRect();
    this.setTarget(cx - rect.left, cy - rect.top);
  }
  setTarget(x, y) {
    const w = this._w(), h = this._h();
    this.target.x = Math.max(0, Math.min(w, x));
    this.target.y = Math.max(0, Math.min(h, y));
  }

  // === Waves: 0–20s easy, 20–50s medium, 50–90s hard
  _wave() {
    const s = this.elapsed / 1000;
    if (s < 20) return { lv: 'E', speed: 1.0, rateMul: 1.0 };
    if (s < 50) return { lv: 'M', speed: 1.25, rateMul: 1.25 };
    return { lv: 'H', speed: 1.6, rateMul: 1.6 };
  }

  _spawnToken() {
    const h = this._h(), w = this._w();
    const rMin = (this.cfg.star_radius?.[0] ?? 8), rMax = (this.cfg.star_radius?.[1] ?? 10);
    const r = rMin + Math.random() * (rMax - rMin);
    const y = 60 + Math.random() * (h - 120);

    // loại token
    const pHeal = Number(this.cfg.heal_chance || 0.08);
    const pBoost = Number(this.cfg.booster_chance || 0.18);
    const roll = Math.random();
    let kind = 'score';
    if (roll < pHeal) kind = 'heal';
    else if (roll < pHeal + pBoost) kind = 'booster';

    // tốc độ đẩy sang trái
    const v = this.baseSpeed * (0.95 + Math.random() * 0.35);
    this.tokens.push({ x: w + 20, y, r, v, kind });
  }

  _spawnBlock() {
    const h = this._h(), w = this._w();
    const lw = this.cfg.light_size?.[0] ?? 26, lh = this.cfg.light_size?.[1] ?? 26;
    const y = 70 + Math.random() * (h - 140);
    const v = this.baseSpeed * (1.0 + Math.random() * 0.6);
    this.blocks.push({ x: w + lw, y, w: lw, h: lh, v });
  }

  start() {
    // duration: ưu tiên cfg.duration_ms, có thể random 45–90s sau này
    this.duration = Math.max(1000, Number(this.cfg.duration_ms || 65000));
    this.reset(); this.playing = true; this.t0 = 0; this.elapsed = 0;
    requestAnimationFrame(this._step.bind(this));
  }

  _step(ts) {
    if (!this.t0) this.t0 = ts;
    let dt = ts - this.t0; if (dt > 32) dt = 32; this.t0 = ts;
    if (!this.playing) return;

    this.elapsed += dt;
    if (this.elapsed >= this.duration) { this.end(); return; }

    const wave = this._wave();                   // wave params
    const speedMul = wave.speed;                 // tăng tốc khi lên wave
    const rateMul = wave.rateMul;

    // follow with acceleration
    const ACC = 0.22;   // tăng/giảm để mượt hơn hay “dính” hơn
    const DAMP = 0.82;  // ma sát
    const dx = (this.target.x - this.glider.x), dy = (this.target.y - this.glider.y);
    this.glider.vx = this.glider.vx * DAMP + dx * ACC;
    this.glider.vy = this.glider.vy * DAMP + dy * ACC;
    this.glider.x += this.glider.vx;
    this.glider.y += this.glider.vy;

    // keep in bounds
    const w = this._w(), h = this._h();
    this.glider.x = Math.max(this.glider.r, Math.min(w - this.glider.r, this.glider.x));
    this.glider.y = Math.max(this.glider.r, Math.min(h - this.glider.r, this.glider.y));

    // spawn rates (theo wave)
    const baseTokenRate = (this.cfg.star_rate_ms ?? 900) / rateMul;
    const baseBlockRate = (this.cfg.light_rate_ms ?? 1300) / rateMul;
    this.accToken += dt; this.accBlock += dt;
    while (this.accToken >= baseTokenRate) { this._spawnToken(); this.accToken -= baseTokenRate; }
    while (this.accBlock >= baseBlockRate) { this._spawnBlock(); this.accBlock -= baseBlockRate; }

    // move entities
    this.tokens.forEach(t => t.x -= t.v * speedMul);
    this.blocks.forEach(b => b.x -= b.v * speedMul);

    // booster state
    const now = this.elapsed; // ms from start
    const boosting = now < this.boostUntil;
    const multStreak = this.streakBonus; // 1.05 nếu streak≥3, ngược lại 1
    const multNow = (boosting ? 2 : 1) * multStreak;

    // collisions: TOKENS
    this.tokens = this.tokens.filter(t => {
      if (t.x < -20) return false;
      const dx = this.glider.x - t.x, dy = this.glider.y - t.y;
      if (dx * dx + dy * dy <= (this.glider.r + t.r) * (this.glider.r + t.r)) {
        if (t.kind === 'heal') {
          if (this.hearts < this.maxHearts) this.hearts++;
          this._float(t.x, t.y, '+1 ❤️', '#22c55e');
        } else if (t.kind === 'booster') {
          const dur = Number(this.cfg.booster_duration_ms || 6000);
          this.boostUntil = now + dur;
          this._float(t.x, t.y, 'x2 ⚡', '#c084fc');
        } else {
          const gain = boosting ? 2 : 1;
          this.score += gain; this.combo += 1; this.comboMax = Math.max(this.comboMax, this.combo);
          if (navigator.vibrate && !this.skipFx) navigator.vibrate(10);
          this._float(t.x, t.y, gain === 2 ? '+2' : '+1', '#ffd166');
        }
        return false;
      }
      return true;
    });

    // collisions: BLOCKS
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.blocks = this.blocks.filter(b => {
      if (b.x < -30) return false;
      const cx = Math.max(b.x, Math.min(this.glider.x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(this.glider.y, b.y + b.h));
      const dx = this.glider.x - cx, dy = this.glider.y - cy;
      if (dx * dx + dy * dy <= this.glider.r * this.glider.r) {
        if (this.hitCooldown <= 0) {
          this.hearts = Math.max(0, this.hearts - 1);
          this.combo = 0;
          this.flash = 0.7;             // flash đỏ
          this.hitCooldown = 500;       // ms invul
          if (navigator.vibrate && !this.skipFx) navigator.vibrate([30, 60, 30]);
          if (this.hearts <= 0) { this.end(); return false; }
        }
        return false; // bỏ block đã đụng
      }
      return true;
    });

    // draw
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    // background
    ctx.fillStyle = '#0e1320'; ctx.fillRect(0, 0, w, h);

    // parallax
    ctx.globalAlpha = 0.15; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) { ctx.fillRect(((ts / 10) + (i * 120)) % (w + 120) - 120, 100 + i * 60, 80, 8); }
    ctx.globalAlpha = 1.0;

    // TOKENS
    this.tokens.forEach(t => {
      if (t.kind === 'heal') { ctx.fillStyle = '#22c55e'; }
      else if (t.kind === 'booster') { ctx.fillStyle = '#c084fc'; }
      else { ctx.fillStyle = '#ffd166'; }
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    });

    // BLOCKS (điện thoại/⚠️)
    ctx.fillStyle = '#ff6b6b';
    this.blocks.forEach(b => {
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // icon cảnh báo đơn giản
      ctx.fillStyle = '#111827';
      ctx.font = '14px sans-serif';
      ctx.fillText('⚠', b.x + b.w * 0.25, b.y + b.h * 0.75);
      ctx.fillStyle = '#ff6b6b';
    });

    // GLIDER (Ryan face tối giản)
    ctx.save();
    ctx.translate(this.glider.x, this.glider.y);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(0, 0, this.glider.r, 0, Math.PI * 2); ctx.fill();
    // mắt + miệng nhỏ
    ctx.fillStyle = '#3f3d56';
    const er = Math.max(2, this.glider.r * 0.14);
    ctx.beginPath(); ctx.arc(-this.glider.r * 0.35, -this.glider.r * 0.15, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(+this.glider.r * 0.35, -this.glider.r * 0.15, er, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3f3d56'; ctx.lineWidth = Math.max(1, this.glider.r * 0.1);
    ctx.beginPath(); ctx.arc(0, this.glider.r * 0.15, this.glider.r * 0.45, 0, Math.PI); ctx.stroke();
    ctx.restore();

    // floaters (điểm bay lên)
    this.floaters = this.floaters.filter(f => {
      f.t += dt;
      f.y -= 0.03 * dt;
      return f.t < f.life;
    });
    this.floaters.forEach(f => {
      const a = 1 - (f.t / f.life);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = f.color || '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1.0;
    });

    // HUD
    const fs = Math.max(22, Math.round(w * 0.05));
    ctx.fillStyle = '#ffffff';
    ctx.font = `${fs}px "Times New Roman", serif`;
    ctx.fillText(`Score: ${Math.round(this.score * multNow)}`, 12, 18 + fs * 0.1);
    ctx.fillText(`Combo: ${this.combo}`, 12, 18 + fs * 0.1 + fs * 1.15);
    const tLeft = Math.max(0, Math.ceil((this.duration - this.elapsed) / 1000));
    ctx.fillText(`Time: ${tLeft}s`, 12, 18 + fs * 0.1 + fs * 2.30);

    // wave/multiplier indicator
    ctx.font = `bold ${Math.max(14, fs * 0.5)}px sans-serif`;
    ctx.fillStyle = boosting ? '#c084fc' : '#94a3b8';
    const boostTxt = boosting ? 'x2 BOOST' : 'x1';
    ctx.fillText(`Wave: ${wave.lv} • ${boostTxt} • StreakBonus:${(this.streakBonus).toFixed(2)}x`, 12, 18 + fs * 0.1 + fs * 3.20);

    // hearts (trên phải)
    const hx = w - 10, hy = 16, gap = 24, rr = 8;
    for (let i = 0; i < this.maxHearts; i++) {
      const x = hx - i * gap, y = hy;
      ctx.globalAlpha = i < this.hearts ? 1 : 0.25;
      this._heart(ctx, x, y, rr, i < this.hearts ? '#ef4444' : '#6b7280');
      ctx.globalAlpha = 1.0;
    }

    // flash khi trúng
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.4;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1.0;
      this.flash *= 0.92;
    }

    requestAnimationFrame(this._step.bind(this));
  }

  end() {
    this.playing = false;
    this.onEnd && this.onEnd({
      score: Math.round(this.score * this.streakBonus), // score đã gồm bonus streak; booster đã áp dụng realtime
      comboMax: this.comboMax,
      duration_ms: Math.min(this.elapsed, this.duration)
    });
  }

  _float(x, y, text, color) {
    this.floaters.push({ x, y, text, color, t: 0, life: 800 });
  }

  _heart(ctx, x, y, r, color = '#ef4444') {
    // vẽ trái tim nhỏ
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, r / 2);
    ctx.bezierCurveTo(r, -r / 1.5, r * 2, r / 3, 0, r * 1.6);
    ctx.bezierCurveTo(-r * 2, r / 3, -r, -r / 1.5, 0, r / 2);
    ctx.fill();
    ctx.restore();
  }
}
