// arcade/game_dreamdrift.js — Boss Waves Edition
// - Follow pointer + acceleration
// - Token (tròn): score/booster/heal; Obstacle (vuông)
// - Hearts, Booster x2, Waves E/M/H
// - BOSS: xuất hiện theo thời gian, bị trừ HP khi Main lướt xuyên qua nhiều lần; hạ Boss + nhiều điểm.

export class Game {
  constructor(canvas, cfg, { skipFx = false, onEnd, startingHearts = 2, streakBonus = 1 } = {}) {
    this.C = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) console.warn("Canvas 2D context not available");

    this.cfg = cfg || {};
    this.skipFx = !!skipFx;
    this.onEnd = onEnd || (() => { });
    this.startingHearts = Math.max(1, Number(startingHearts || 2));
    this.streakBonus = Number(streakBonus || 1);

    // sprite nhân vật (tùy chọn)
    this.skin = null;
    this.skinReady = false;
    const skinUrl = (this.cfg && this.cfg.main_skin) || null;
    if (skinUrl) {
      const img = new Image();
      img.onload = () => {
        this.skin = img;
        this.skinReady = true;
      };
      img.onerror = () => console.warn("Main skin load failed:", skinUrl);
      img.src = skinUrl;
    }

    // sprite boss (tùy chọn)
    this.bossSkin = null;
    this.bossSkinReady = false;
    const bossSkin = (this.cfg.boss && this.cfg.boss.skin) || null;
    if (bossSkin) {
      const img2 = new Image();
      img2.onload = () => {
        this.bossSkin = img2;
        this.bossSkinReady = true;
      };
      img2.onerror = () => console.warn("Boss skin load failed:", bossSkin);
      img2.src = bossSkin;
    }

    this.reset();
  }

  reset() {
    this.playing = false;
    this.t0 = 0;
    this.elapsed = 0;

    this.score = 0;
    this.combo = 0;
    this.comboMax = 0;

    // Evolution (biến hình theo score)
    this.evoLevel = 0; // level hiện tại
    this.evoThresholds = [20, 60, 120, 200]; // các mốc score
    this.evoDmgBonus = [0, 1, 2, 3, 5]; // bonus damage theo level (index = level)

    this.totalBossDamage = 0;
    this.bossHitCount = 0;

    this.evoFx = {
      active: false,
      t: 0, // ms đã chạy của hiệu ứng
    };

    // Dash / Charge
    this.isCharging = false;
    this.chargeTime = 0; // ms
    this.chargeMax = 800; // giữ 0.8s là full charge

    this.dashing = false;
    this.dashTime = 0;
    this.dashDuration = 180; // ms
    this.dashPower = 20; // tốc độ dịch chuyển mỗi frame khi dash
    this.dashCount = 0; // đếm số lần dash (cho end stats)

    // Entities
    this.tokens = [];
    this.blocks = [];
    this.floaters = [];
    this.flash = 0;
    this.hitCooldown = 0;

    // Hearts
    const maxHeartsCfg = this.cfg.max_hearts != null ? Number(this.cfg.max_hearts) : 3;
    this.maxHearts = Math.max(maxHeartsCfg, this.startingHearts);
    this.hearts = this.startingHearts;

    // Booster
    this.boostUntil = 0;

    // Base speed
    this.baseSpeed = Number(this.cfg.speed || 2.0);

    // Spawn acc
    this.accToken = 0;
    this.accBlock = 0;

    // Pointer-follow + acceleration
    const w = this._w();
    const h = this._h();
    const rCfg = this.cfg.glider_radius != null ? Number(this.cfg.glider_radius) : 18;
    const sc = this._scale();
    this.glider = { x: w * 0.2, y: h * 0.5, r: rCfg * sc, vx: 0, vy: 0 };
    this.target = { x: this.glider.x, y: this.glider.y };

    // Boss system
    const bcfg = this.cfg.boss || {};
    this.bossPlan = Array.isArray(bcfg.spawn_seconds)
      ? bcfg.spawn_seconds.slice().sort((a, b) => a - b)
      : [];
    this.bossIndex = 0;
    this.boss = null; // {x,y,r,hp,hpMax,vx,vy,alive}
    this.bossDmgAcc = 0;
    this.bossEmitAcc = 0;

    // lưu multiplier khung cuối để show ở result
    this.lastMultNow = this.streakBonus || 1;
  }

  _w() {
    return this.C.clientWidth || this.C.width;
  }
  _h() {
    return this.C.clientHeight || this.C.height;
  }

  // scale kích thước theo chiều cao canvas (fullscreen thì to lên)
  _scale() {
    const baseH = 480; // chiều cao "chuẩn"
    const h = this._h() || baseH;
    // clamp cho an toàn, tránh quá to/quá nhỏ
    return Math.max(0.8, Math.min(1.6, h / baseH));
  }

  setTargetFromEvent(e) {
    let cx, cy;
    if (e && e.touches && e.touches[0]) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    const rect = this.C.getBoundingClientRect();
    this.setTarget(cx - rect.left, cy - rect.top);
  }

  setTarget(x, y) {
    const w = this._w();
    const h = this._h();
    this.target.x = Math.max(0, Math.min(w, x));
    this.target.y = Math.max(0, Math.min(h, y));
  }

  // Waves (E/M/H) + khi có Boss, giảm spawn thường
  _wave() {
    const s = this.elapsed / 1000;
    if (s < 20) return { lv: "E", speed: 1.0, rateMul: 1.0 };
    if (s < 50) return { lv: "M", speed: 1.25, rateMul: 1.25 };
    return { lv: "H", speed: 1.6, rateMul: 1.6 };
  }

  _checkEvolution() {
    // duyệt từ level cao xuống để tìm level phù hợp với score hiện tại
    for (let i = this.evoThresholds.length - 1; i >= 0; i--) {
      if (this.score >= this.evoThresholds[i]) {
        const newLevel = i + 1;
        if (newLevel !== this.evoLevel) {
          this.evoLevel = newLevel;

          // hiệu ứng báo EVOLVE
          this._float(this.glider.x, this.glider.y - 40, "EVOLVE!", "#60a5fa");
          this.flash = 0.7;

          // kích hoạt hiệu ứng biến hình
          this.evoFx.active = true;
          this.evoFx.t = 0;
        }
        break;
      }
    }
  }

  _spawnToken() {
    const h = this._h();
    const w = this._w();
    const sr = Array.isArray(this.cfg.star_radius) ? this.cfg.star_radius : [8, 10];
    const rMin = sr[0] != null ? Number(sr[0]) : 8;
    const rMax = sr[1] != null ? Number(sr[1]) : 10;
    const sc = this._scale();

    const rBase = rMin + Math.random() * (rMax - rMin);
    const r = rBase * sc; // radius scale theo màn

    const y = 60 + Math.random() * (h - 120);
    const pHeal = Number(this.cfg.heal_chance != null ? this.cfg.heal_chance : 0.08);
    const pBoost = Number(this.cfg.booster_chance != null ? this.cfg.booster_chance : 0.18);
    const roll = Math.random();
    let kind = "score";
    if (roll < pHeal) kind = "heal";
    else if (roll < pHeal + pBoost) kind = "booster";
    const v = this.baseSpeed * (0.95 + Math.random() * 0.35);
    this.tokens.push({ x: w + 20, y, r, v, kind });
  }

  _spawnBlock() {
    const h = this._h();
    const w = this._w();
    const ls = Array.isArray(this.cfg.light_size) ? this.cfg.light_size : [26, 26];
    const sc = this._scale();

    const lwBase = ls[0] != null ? Number(ls[0]) : 26;
    const lhBase = ls[1] != null ? Number(ls[1]) : 26;
    const lw = lwBase * sc;
    const lh = lhBase * sc;

    const y = 70 + Math.random() * (h - 140);
    const v = this.baseSpeed * (1.0 + Math.random() * 0.6);
    this.blocks.push({ x: w + lw, y, w: lw, h: lh, v });
  }

  _spawnBoss() {
    const w = this._w();
    const h = this._h();
    const bcfg = this.cfg.boss || {};
    const i = this.bossIndex; // boss thứ i

    const hpBase = Number(bcfg.hp_base != null ? bcfg.hp_base : 20);
    const hpGrow = Number(bcfg.hp_growth != null ? bcfg.hp_growth : 10);
    const sc = this._scale();

    const rBase = Number(bcfg.radius != null ? bcfg.radius : 44);
    const r = rBase * sc;
    const speed = Number(bcfg.speed != null ? bcfg.speed : 1.1);

    this.boss = {
      x: w * 0.72,
      y: h * 0.5,
      r,
      hp: hpBase + i * hpGrow,
      hpMax: hpBase + i * hpGrow,
      vx: -speed,
      vy: 0,
      alive: true,
    };
    this.bossDmgAcc = 0;
    this.bossEmitAcc = 0;
    this._float(this.boss.x, this.boss.y - this.boss.r - 10, "BOSS!", "#f472b6");
  }

  _moveBoss(dt) {
    if (!this.boss || !this.boss.alive) return;
    const w = this._w();
    const h = this._h();
    const b = this.boss;
    b.x += b.vx * dt * 0.06; // tốc độ phụ thuộc dt
    // va biên → bật lại
    if (b.x < w * 0.28) {
      b.x = w * 0.28;
      b.vx = Math.abs(b.vx);
    }
    if (b.x > w * 0.9) {
      b.x = w * 0.9;
      b.vx = -Math.abs(b.vx);
    }
    // lượn nhẹ theo sin theo trục y
    b.y = h * 0.5 + Math.sin(this.elapsed / 600) * (h * 0.22);
  }

  _bossEmit(dt, speedMul) {
    if (!this.boss || !this.boss.alive) return;
    this.bossEmitAcc += dt;
    if (this.bossEmitAcc >= 700) {
      this.bossEmitAcc -= 700;
      const b = this.boss;
      const sz = 20 + Math.random() * 12;
      const v = this.baseSpeed * (1.4 + Math.random() * 0.6);
      this.blocks.push({
        x: b.x - b.r - 10,
        y: b.y + (Math.random() * b.r - b.r / 2),
        w: sz,
        h: sz,
        v,
      });
    }
  }

  _playerHitsBoss() {
    if (!this.boss || !this.boss.alive) return false;
    const bx = this.boss.x;
    const by = this.boss.y;
    const br = this.boss.r;
    const dx = this.glider.x - bx;
    const dy = this.glider.y - by;
    return dx * dx + dy * dy <= (this.glider.r + br) * (this.glider.r + br);
  }

  start() {
    this.duration = Math.max(1000, Number(this.cfg.duration_ms || 65000));
    this.reset();
    this.playing = true;
    this.t0 = 0;
    this.elapsed = 0;
    this.lastMultNow = this.streakBonus || 1;
    requestAnimationFrame(this._step.bind(this));
  }

  _step(ts) {
    if (!this.t0) this.t0 = ts;
    let dt = ts - this.t0;
    if (dt > 32) dt = 32;
    this.t0 = ts;
    if (!this.playing) return;

    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.end();
      return;
    }

    const wave = this._wave() || { lv: "E", speed: 1, rateMul: 1 };
    const speedMul = Number(wave.speed || 1);
    let rateMul = Number(wave.rateMul || 1);

    // Follow + acceleration
    const ACC = 0.22;
    const DAMP = 0.82;
    const dx = this.target.x - this.glider.x;
    const dy = this.target.y - this.glider.y;

    // Charge
    if (this.isCharging) {
      this.chargeTime += dt;
    }

    if (this.dashing) {
      // Dash: lao thẳng về target
      this.dashTime += dt;
      const angle = Math.atan2(dy, dx);
      const speed = this.dashPower;
      this.glider.x += Math.cos(angle) * speed;
      this.glider.y += Math.sin(angle) * speed;

      if (this.dashTime >= this.dashDuration) {
        this.dashing = false;
      }
    } else {
      // Di chuyển bình thường
      this.glider.vx = this.glider.vx * DAMP + dx * ACC;
      this.glider.vy = this.glider.vy * DAMP + dy * ACC;
      this.glider.x += this.glider.vx;
      this.glider.y += this.glider.vy;
    }

    // Bounds
    const w = this._w();
    const h = this._h();
    this.glider.x = Math.max(this.glider.r, Math.min(w - this.glider.r, this.glider.x));
    this.glider.y = Math.max(this.glider.r, Math.min(h - this.glider.r, this.glider.y));

    // Spawn Boss theo lịch
    if (!this.boss || !this.boss.alive) {
      if (this.bossIndex < this.bossPlan.length && this.elapsed / 1000 >= this.bossPlan[this.bossIndex]) {
        this._spawnBoss();
        this.bossIndex++;
      }
    }

    // Khi có Boss đang sống → giảm spawn thường
    if (this.boss && this.boss.alive) rateMul *= 0.6;

    // Spawn thường
    const baseTokenRate = (this.cfg.star_rate_ms != null ? this.cfg.star_rate_ms : 900) / rateMul;
    const baseBlockRate = (this.cfg.light_rate_ms != null ? this.cfg.light_rate_ms : 1300) / rateMul;
    this.accToken += dt;
    this.accBlock += dt;
    while (this.accToken >= baseTokenRate) {
      this._spawnToken();
      this.accToken -= baseTokenRate;
    }
    while (this.accBlock >= baseBlockRate) {
      this._spawnBlock();
      this.accBlock -= baseBlockRate;
    }

    // Move thường
    this.tokens.forEach((t) => (t.x -= t.v * speedMul));
    this.blocks.forEach((b) => (b.x -= b.v * speedMul));

    // Booster & multiplier
    const now = this.elapsed;
    const boosting = now < this.boostUntil;
    const multStreak = this.streakBonus;
    const multNow = (boosting ? 2 : 1) * multStreak;
    this.lastMultNow = multNow;

    // TOKENS collisions
    this.tokens = this.tokens.filter((t) => {
      if (t.x < -20) return false;
      const dx2 = this.glider.x - t.x;
      const dy2 = this.glider.y - t.y;
      if (dx2 * dx2 + dy2 * dy2 <= (this.glider.r + t.r) * (this.glider.r + t.r)) {
        if (t.kind === "heal") {
          if (this.hearts < this.maxHearts) this.hearts++;
          this._float(t.x, t.y, "+1 ❤️", "#22c55e");
        } else if (t.kind === "booster") {
          const dur = Number(
            this.cfg.booster_duration_ms != null ? this.cfg.booster_duration_ms : 6000
          );
          this.boostUntil = now + dur;
          this._float(t.x, t.y, "x2 ⚡", "#c084fc");
        } else {
          const gain = boosting ? 2 : 1;
          this.score += gain;
          this._checkEvolution();
          this.combo += 1;
          this.comboMax = Math.max(this.comboMax, this.combo);
          if (navigator.vibrate && !this.skipFx) navigator.vibrate(10);
          this._float(t.x, t.y, gain === 2 ? "+2" : "+1", "#ffd166");
        }
        return false;
      }
      return true;
    });

    // BLOCKS collisions
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.blocks = this.blocks.filter((b) => {
      if (b.x < -30) return false;
      const cx = Math.max(b.x, Math.min(this.glider.x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(this.glider.y, b.y + b.h));
      const dx3 = this.glider.x - cx;
      const dy3 = this.glider.y - cy;
      if (dx3 * dx3 + dy3 * dy3 <= this.glider.r * this.glider.r) {
        if (this.hitCooldown <= 0) {
          this.hearts = Math.max(0, this.hearts - 1);
          this.combo = 0;
          this.flash = 0.7;
          this.hitCooldown = 500;
          if (navigator.vibrate && !this.skipFx) navigator.vibrate([30, 60, 30]);
          if (this.hearts <= 0) {
            this.end();
            return false;
          }
        }
        return false;
      }
      return true;
    });

    // BOSS logic
    if (this.boss && this.boss.alive) {
      this._moveBoss(dt);
      this._bossEmit(dt, speedMul);

      // Damage khi lướt xuyên Boss
      this.bossDmgAcc += dt;
      const dmgTick = Number((this.cfg.boss && this.cfg.boss.damage_tick_ms) || 180);
      if (this._playerHitsBoss() && this.bossDmgAcc >= dmgTick) {
        this.bossDmgAcc = 0;
        const base = boosting ? 2 : 1;
        const evoBonus = this.evoDmgBonus[this.evoLevel] || 0;
        const dmg = base + evoBonus;
        this.boss.hp = Math.max(0, this.boss.hp - dmg);
        this.totalBossDamage += dmg;
        this.bossHitCount += 1;
        this._float(this.boss.x, this.boss.y - this.boss.r - 6, "-" + dmg, "#fca5a5");
        if (navigator.vibrate && !this.skipFx) navigator.vibrate(8);

        if (this.boss.hp <= 0) {
          this.boss.alive = false;
          const bonus = Number((this.cfg.boss && this.cfg.boss.score_bonus) || 18);
          this.score += bonus;
          this._checkEvolution();
          this._float(this.boss.x, this.boss.y, `+${bonus} BOSS`, "#f472b6");
          this.flash = 0.8;
        }
      }

      // DASH vào Boss → damage lớn
      if (this.dashing && this._playerHitsBoss()) {
        this.dashing = false;
        const dashBase = 5;
        const evoBonus = this.evoDmgBonus[this.evoLevel] || 0;
        const dmgDash = dashBase + evoBonus * 2;

        this.boss.hp = Math.max(0, this.boss.hp - dmgDash);
        this.totalBossDamage += dmgDash;
        this.bossHitCount += 1;

        this._float(this.boss.x, this.boss.y, `DASH -${dmgDash}`, "#f97316");
        this.flash = 0.9;
        if (navigator.vibrate && !this.skipFx) navigator.vibrate([15, 40, 15]);

        if (this.boss.hp <= 0) {
          this.boss.alive = false;
          const bonus = Number((this.cfg.boss && this.cfg.boss.score_bonus) || 18);
          this.score += bonus;
          this._checkEvolution();
          this._float(this.boss.x, this.boss.y, `+${bonus} BOSS`, "#f472b6");
          this.flash = 0.8;
        }
      }
    }

    // DRAW
    const { ctx } = this;
    const W = w;
    const H = h;

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0e1320";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(((ts / 10 + i * 120) % (W + 120)) - 120, 100 + i * 60, 80, 8);
    }
    ctx.globalAlpha = 1.0;

    // Tokens
    this.tokens.forEach((t) => {
      ctx.fillStyle =
        t.kind === "heal"
          ? "#22c55e"
          : t.kind === "booster"
            ? "#c084fc"
            : "#ffd166";
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Blocks
    ctx.fillStyle = "#ff6b6b";
    this.blocks.forEach((b) => {
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#111827";
      ctx.font = "14px sans-serif";
      ctx.fillText("⚠", b.x + b.w * 0.25, b.y + b.h * 0.75);
      ctx.fillStyle = "#ff6b6b";
    });

    // Boss
    if (this.boss && this.boss.alive) {
      const b = this.boss;
      if (this.bossSkinReady && this.bossSkin) {
        const s = b.r * 2;
        ctx.drawImage(this.bossSkin, b.x - b.r, b.y - b.r, s, s);
      } else {
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#9f1239";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      // HP bar
      const bw = 180;
      const bh = 10;
      const bx = (W - bw) / 2;
      const by = 10;
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(bx, by, bw, bh);
      const hpw = Math.max(0, Math.round((bw * b.hp) / b.hpMax));
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(bx, by, hpw, bh);
      ctx.strokeStyle = "#111827";
      ctx.strokeRect(bx, by, bw, bh);
    }

    // Hiệu ứng biến hình (aura nở ra)
    if (this.evoFx.active) {
      this.evoFx.t += dt;
      const dur = 500; // 0.5s
      const p = Math.min(1, this.evoFx.t / dur);
      if (p >= 1) {
        this.evoFx.active = false;
      } else {
        const maxR = this.glider.r * 2.4;
        const rAura = this.glider.r + (maxR - this.glider.r) * p;
        const alpha = 1 - p;

        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.glider.x, this.glider.y, rAura, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Main (sprite nếu có, scale theo evolution)
    const evoColors = ["#ffd166", "#a5b4fc", "#fb7185", "#f97316", "#4ade80"];

    if (this.skinReady && this.skin) {
      const evoScale = 1 + this.evoLevel * 0.15;
      const chargeScale = this.isCharging
        ? 1 + Math.min(0.2, (this.chargeTime / this.chargeMax) * 0.4)
        : 1;
      const scale = evoScale * chargeScale;
      const s = this.glider.r * 2 * scale;

      const auraColor = evoColors[this.evoLevel] || evoColors[0];

      // glow dưới sprite
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = auraColor;
      ctx.beginPath();
      ctx.arc(
        this.glider.x,
        this.glider.y,
        this.glider.r * (1.4 + this.evoLevel * 0.1),
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      ctx.drawImage(
        this.skin,
        this.glider.x - s / 2,
        this.glider.y - s / 2,
        s,
        s
      );
    } else {
      // fallback: hình tròn đổi màu theo evolution
      const scale = 1 + this.evoLevel * 0.15;
      const r = this.glider.r * scale;
      const bodyColor = evoColors[this.evoLevel] || evoColors[0];

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(this.glider.x, this.glider.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floaters
    this.floaters = this.floaters.filter((f) => {
      f.t += dt;
      f.y -= 0.03 * dt;
      return f.t < f.life;
    });
    this.floaters.forEach((f) => {
      const a = 1 - f.t / f.life;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = f.color || "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1.0;
    });

    // HUD
    const fs = Math.max(22, Math.round(W * 0.05));
    ctx.fillStyle = "#ffffff";
    ctx.font = `${fs}px "Times New Roman", serif`;
    ctx.fillText(
      `Score: ${Math.round(this.score * multStreak)}`,
      12,
      18 + fs * 0.1
    );
    ctx.fillText(
      `Combo: ${this.combo}`,
      12,
      18 + fs * 0.1 + fs * 1.15
    );
    const tLeft = Math.max(0, Math.ceil((this.duration - this.elapsed) / 1000));
    ctx.fillText(
      `Time: ${tLeft}s`,
      12,
      18 + fs * 0.1 + fs * 2.3
    );

    // Wave & Multiplier
    ctx.font = `bold ${Math.max(14, fs * 0.5)}px sans-serif`;
    ctx.fillStyle = boosting ? "#c084fc" : "#94a3b8";
    ctx.fillText(
      `Wave: ${wave.lv} • Mult:${multNow.toFixed(
        2
      )}x (BOOST:${boosting ? "2x" : "1x"} • STREAK:${this.streakBonus.toFixed(
        2
      )}x)`,
      12,
      18 + fs * 0.1 + fs * 3.2
    );

    // Hearts (scale theo màn)
    const sc = this._scale();
    const hx = W - 10 * sc;
    const hy = 16 * sc;
    const gap = 24 * sc;
    const rr = 8 * sc;

    for (let i = 0; i < this.maxHearts; i++) {
      const x = hx - i * gap;
      const y = hy;
      ctx.globalAlpha = i < this.hearts ? 1 : 0.25;
      this._heart(ctx, x, y, rr, i < this.hearts ? "#ef4444" : "#6b7280");
      ctx.globalAlpha = 1.0;
    }

    // Flash
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.4;
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1.0;
      this.flash *= 0.92;
    }

    requestAnimationFrame(this._step.bind(this));
  }

  end() {
    this.playing = false;
    this.onEnd &&
      this.onEnd({
        score: Math.round(this.score * this.streakBonus),
        comboMax: this.comboMax,
        duration_ms: Math.min(this.elapsed, this.duration),
        bossDamage: this.totalBossDamage || 0,
        bossHits: this.bossHitCount || 0,
        dashCount: this.dashCount || 0,
        evoLevel: this.evoLevel || 0,
        multNow: this.lastMultNow || this.streakBonus || 1,
      });
  }

  _float(x, y, text, color) {
    this.floaters.push({ x, y, text, color, t: 0, life: 800 });
  }

  _heart(ctx, x, y, r, color = "#ef4444") {
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

  startCharge() {
    if (!this.playing) return;
    if (this.dashing) return;
    this.isCharging = true;
    this.chargeTime = 0;
  }

  releaseDash() {
    if (!this.isCharging || !this.playing) return;
    this.isCharging = false;

    const pct = Math.min(1, this.chargeTime / this.chargeMax);
    if (pct < 0.2) return; // charge quá ít thì không dash

    this.dashing = true;
    this.dashTime = 0;
    this.dashPower = 18 + pct * 32; // charge càng lâu dash càng mạnh
    this.dashCount += 1;
  }
}
