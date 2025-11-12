// arcade/game_dreamdrift.js — Canvas 2D loop (fixed input)
export class Game{
  constructor(canvas, cfg, { skipFx=false, onEnd }={}){
    this.C = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.skipFx = skipFx;
    this.onEnd = onEnd || (()=>{});
    this.reset();
    this._bind();
  }

  reset(){
    this.t0 = 0; this.playing = false;
    this.score = 0; this.combo = 0; this.comboMax = 0;
    this.stars = []; this.lights = [];
    this.timeLeft = this.cfg.duration_ms|0;
    this.G = { gravity:this.cfg.gravity, lift:this.cfg.lift, starRate:this.cfg.star_rate_ms, lightRate:this.cfg.light_rate_ms, speed:this.cfg.speed };
    this.glider = { x:80, y:this.C.height/2, vy:0, r:this.cfg.glider_radius };
    this.hold = false;
  }

  _bind(){
    const down = (e)=>{ if(e && e.preventDefault) e.preventDefault(); this.hold = true; };
    const up   = (e)=>{ if(e && e.preventDefault) e.preventDefault(); this.hold = false; };
    const opts = { passive:false };

    // Pointer Events
    this.C.addEventListener('pointerdown', down, opts);
    window.addEventListener('pointerup',   up,   opts);
    window.addEventListener('pointercancel', up, opts);

    // Mouse fallback
    this.C.addEventListener('mousedown', down);
    window.addEventListener('mouseup',   up);

    // Touch fallback
    this.C.addEventListener('touchstart', down, opts);
    window.addEventListener('touchend',   up,   opts);
    window.addEventListener('touchcancel', up,  opts);

    // Keyboard
    this._kd = (e)=>{ 
      if(['Space','KeyW','ArrowUp'].includes(e.code)){ 
        e.preventDefault(); this.hold = true; 
      }
    };
    this._ku = (e)=>{ 
      if(['Space','KeyW','ArrowUp'].includes(e.code)){ 
        e.preventDefault(); this.hold = false; 
      }
    };
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup',   this._ku);
  }

  _spawnStar(ts){
    const r = this.cfg.star_radius[0] + Math.random()*(this.cfg.star_radius[1]-this.cfg.star_radius[0]);
    this.stars.push({ x:this.C.width+20, y:60+Math.random()*(this.C.height-120), r, v:this.G.speed*(.9+Math.random()*0.3) });
  }
  _spawnLight(ts){
    const [w,h] = this.cfg.light_size;
    this.lights.push({ x:this.C.width+w, y:70+Math.random()*(this.C.height-140), w, h, v:this.G.speed*(1.0+Math.random()*0.4) });
  }

  start(){
    this.reset(); this.playing = true; this.t0 = 0;
    requestAnimationFrame(this._step.bind(this));
  }

  _step(ts){
    if(!this.t0) this.t0 = ts;
    let dt = ts - this.t0; if(dt>32) dt = 32; this.t0 = ts;
    if(!this.playing) return;

    // time
    this.timeLeft -= dt;
    if(this.timeLeft <= 0){ this.end(); return; }

    // physics (không scale dt để cảm giác mượt hơn ở 60fps)
    this.glider.vy += this.G.gravity;
    if(this.hold) this.glider.vy -= this.G.lift;
    this.glider.y += this.glider.vy;

    // clamp
    this.glider.y = Math.max(this.glider.r, Math.min(this.C.height - this.glider.r, this.glider.y));

    // spawns
    if(ts % this.G.starRate  < 16) this._spawnStar(ts);
    if(ts % this.G.lightRate < 16) this._spawnLight(ts);

    // move
    this.stars.forEach(s=> s.x -= s.v);
    this.lights.forEach(l=> l.x -= l.v);

    // collisions (stars add score/combo, lights reset combo and -1 score)
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
    const ctx = this.ctx, C = this.C;
    ctx.fillStyle = '#0e1320'; ctx.fillRect(0,0,C.width,C.height);

    // parallax
    ctx.globalAlpha = 0.15; ctx.fillStyle = '#ffffff';
    for(let i=0;i<6;i++){ ctx.fillRect(((ts/10)+(i*120))% (C.width+120) - 120, 100 + i*60, 80, 8); }
    ctx.globalAlpha = 1.0;

    // stars & lights & glider
    ctx.fillStyle = '#ffeaa7'; this.stars.forEach(s=>{ ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle = '#87a5ff'; this.lights.forEach(l=> ctx.fillRect(l.x,l.y,l.w,l.h));
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(this.glider.x, this.glider.y, this.glider.r, 0, Math.PI*2); ctx.fill();

    // HUD (font VN-compatible)
    ctx.fillStyle = '#ffffff'; ctx.font = '16px "Times New Roman", serif';
    ctx.fillText(`Score: ${this.score}`, 12, 22);
    ctx.fillText(`Combo: ${this.combo}`, 12, 42);
    ctx.fillText(`Time: ${Math.ceil(this.timeLeft/1000)}s`, 12, 62);

    requestAnimationFrame(this._step.bind(this));
  }

  end(){
    this.playing = false; this.hold = false;
    this.onEnd && this.onEnd({ score:this.score, comboMax:this.comboMax, duration_ms:this.cfg.duration_ms - Math.max(0, this.timeLeft) });
  }
}
