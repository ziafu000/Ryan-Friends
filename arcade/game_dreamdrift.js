// arcade/game_dreamdrift.js — Follow Pointer + Dynamic Speed Up
// - Quả cầu đi theo chuột/ngón tay (hover/drag)
// - Vật thể di chuyển nhanh hơn và tăng tốc theo thời gian chơi
// - Font HUD (Score/Combo/Time) phóng to

export class Game{
  constructor(canvas, cfg, { skipFx=false, onEnd }={}){
    this.C = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.skipFx = skipFx;
    this.onEnd = onEnd || (()=>{});
    this.reset();
  }

  reset(){
    this.t0 = 0; this.playing = false;
    this.score = 0; this.combo = 0; this.comboMax = 0;
    this.stars = []; this.lights = [];
    this.timeLeft = (this.cfg.duration_ms|0) || 65000;

    // tốc độ nền từ config
    this.baseSpeed = Number(this.cfg.speed || 2.0);

    // tăng tốc: bắt đầu đã nhanh hơn một chút, và còn tăng dần tới cuối game
    this.BASE_BOOST = 1.35;   // chỉnh lên 1.5 nếu muốn nhanh nữa ngay từ đầu
    this.GROWTH     = 0.8;    // biên độ tăng dần theo tiến độ ván (0.8 → cuối ván nhanh ~+80%)

    // spawn timer tích lũy thay vì modulo ts (linh hoạt theo difficulty)
    this.accStar  = 0;
    this.accLight = 0;

    const w = this._w(), h = this._h();
    this.glider = { x:w*0.2, y:h*0.5, r:Number(this.cfg.glider_radius||18) };
    this.target = { x:this.glider.x, y:this.glider.y };
  }

  _w(){ return this.C.clientWidth  || this.C.width; }
  _h(){ return this.C.clientHeight || this.C.height; }

  setTargetFromEvent(e){
    let cx, cy;
    if (e.touches && e.touches[0]) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    const rect = this.C.getBoundingClientRect();
    this.setTarget(cx - rect.left, cy - rect.top);
  }
  setTarget(x,y){
    const w=this._w(), h=this._h();
    this.target.x = Math.max(0, Math.min(w, x));
    this.target.y = Math.max(0, Math.min(h, y));
  }

  _spawnStar(){
    const h = this._h(), w = this._w();
    const rMin = (this.cfg.star_radius?.[0] ?? 8), rMax = (this.cfg.star_radius?.[1] ?? 10);
    const r = rMin + Math.random()*(rMax-rMin);
    // v cơ bản; difficulty sẽ nhân thêm lúc move
    const v = this.baseSpeed * (0.95 + Math.random()*0.35);
    this.stars.push({ x:w+20, y:60+Math.random()*(h-120), r, v });
  }
  _spawnLight(){
    const h = this._h(), w = this._w();
    const lw = this.cfg.light_size?.[0] ?? 24, lh = this.cfg.light_size?.[1] ?? 24;
    const v = this.baseSpeed * (1.0 + Math.random()*0.5);
    this.lights.push({ x:w+lw, y:70+Math.random()*(h-140), w:lw, h:lh, v });
  }

  start(){
    this.reset(); this.playing = true; this.t0 = 0;
    requestAnimationFrame(this._step.bind(this));
  }

  _difficulty(){
    // tiến độ ván: từ 0 → 1
    const played = Math.max(0, (this.cfg.duration_ms|0) - this.timeLeft);
    const progress = Math.min(1, played / Math.max(1, (this.cfg.duration_ms|0)));
    // difficulty = base boost * (1 + progress * growth) (có thể clamp)
    const d = this.BASE_BOOST * (1 + progress * this.GROWTH);
    return Math.min(d, 2.25); // trần tránh “quá nhanh” (có thể tăng)
  }

  _step(ts){
    if(!this.t0) this.t0 = ts;
    let dt = ts - this.t0; if(dt>32) dt = 32; this.t0 = ts;
    if(!this.playing) return;

    // time
    this.timeLeft -= dt;
    if(this.timeLeft <= 0){ this.end(); return; }

    // follow: bám mượt hơn một chút
    const k = 0.20; // tăng từ 0.15 → 0.20 để responsive hơn
    this.glider.x += (this.target.x - this.glider.x) * k;
    this.glider.y += (this.target.y - this.glider.y) * k;

    // difficulty hiện tại
    const D = this._difficulty();

    // spawn (tăng tần suất theo D)
    const starRate  = (this.cfg.star_rate_ms  ?? 900) / D;
    const lightRate = (this.cfg.light_rate_ms ?? 1300) / D;
    this.accStar  += dt;
    this.accLight += dt;
    while (this.accStar >= starRate)  { this._spawnStar();  this.accStar  -= starRate; }
    while (this.accLight >= lightRate){ this._spawnLight(); this.accLight -= lightRate; }

    // move vật thể: nhân thêm D
    this.stars .forEach(s => s.x -= s.v * D);
    this.lights.forEach(l => l.x -= l.v * D);

    // collisions
    this.stars = this.stars.filter(s=>{
      if(s.x < -20) return false;
      const dx = this.glider.x - s.x, dy = this.glider.y - s.y;
      if(dx*dx + dy*dy <= (this.glider.r + s.r)*(this.glider.r + s.r)){
        this.score += 1; this.combo += 1; this.comboMax = Math.max(this.comboMax, this.combo);
        if(navigator.vibrate && !this.skipFx) navigator.vibrate(12);
        return false;
      }
      return true;
    });
    this.lights = this.lights.filter(l=>{
      if(l.x < -30) return false;
      const cx = Math.max(l.x, Math.min(this.glider.x, l.x + l.w));
      const cy = Math.max(l.y, Math.min(this.glider.y, l.y + l.h));
      const dx = this.glider.x - cx, dy = this.glider.y - cy;
      if(dx*dx + dy*dy <= this.glider.r*this.glider.r){
        this.score = Math.max(0, this.score - 1); this.combo = 0;
        return false;
      }
      return true;
    });

    // draw
    const ctx = this.ctx, w=this._w(), h=this._h();
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#0e1320'; ctx.fillRect(0,0,w,h);

    // parallax
    ctx.globalAlpha = 0.15; ctx.fillStyle = '#ffffff';
    for(let i=0;i<6;i++){ ctx.fillRect(((ts/10)+(i*120))% (w+120) - 120, 100 + i*60, 80, 8); }
    ctx.globalAlpha = 1.0;

    // stars & lights & glider
    ctx.fillStyle = '#ffeaa7'; this.stars.forEach(s=>{ ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#87a5ff'; this.lights.forEach(l=> ctx.fillRect(l.x,l.y,l.w,l.h));
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(this.glider.x, this.glider.y, this.glider.r, 0, Math.PI*2); ctx.fill();

    // ===== HUD — phóng to chữ =====
    const fs = Math.max(26, Math.round(w * 0.085)); // ~8.5% chiều rộng (VD w=360 → ~31px)
    ctx.fillStyle = '#ffffff'; ctx.font = `${fs}px "Times New Roman", serif`;
    ctx.fillText(`Score: ${this.score}`, 12, 18 + fs*0.1);
    ctx.fillText(`Combo: ${this.combo}`, 12, 18 + fs*0.1 + fs*1.15);
    ctx.fillText(`Time: ${Math.ceil(this.timeLeft/1000)}s`, 12, 18 + fs*0.1 + fs*2.30);

    requestAnimationFrame(this._step.bind(this));
  }

  end(){
    this.playing = false;
    this.onEnd && this.onEnd({
      score:this.score,
      comboMax:this.comboMax,
      duration_ms: (this.cfg.duration_ms|0) - Math.max(0, this.timeLeft)
    });
  }
}
