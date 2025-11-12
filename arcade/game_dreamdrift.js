// arcade/game_dreamdrift.js — Follow Pointer Edition
// Quả cầu đi theo chuột/ngón tay (x & y). Không cần giữ phím nữa.

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
    this.timeLeft = this.cfg.duration_ms|0;
    this.G = { starRate:this.cfg.star_rate_ms, lightRate:this.cfg.light_rate_ms, speed:this.cfg.speed };
    const w = this._w(), h = this._h();
    this.glider = { x:w*0.2, y:h*0.5, r:this.cfg.glider_radius };
    this.target = { x:w*0.2, y:h*0.5 }; // sẽ cập nhật theo chuột/drag
  }

  // Kích thước vẽ theo "CSS pixel" (outer script đã setTransform theo DPR)
  _w(){ return this.C.clientWidth  || this.C.width; }
  _h(){ return this.C.clientHeight || this.C.height; }

  // Cho phép bên ngoài truyền vào clientX/clientY
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

  _spawnStar(ts){
    const h = this._h(), w = this._w();
    const r = this.cfg.star_radius[0] + Math.random()*(this.cfg.star_radius[1]-this.cfg.star_radius[0]);
    this.stars.push({ x:w+20, y:60+Math.random()*(h-120), r, v:this.G.speed*(.9+Math.random()*0.3) });
  }
  _spawnLight(ts){
    const h = this._h(), w = this._w();
    const [lw,lh] = this.cfg.light_size;
    this.lights.push({ x:w+lw, y:70+Math.random()*(h-140), w:lw, h:lh, v:this.G.speed*(1.0+Math.random()*0.4) });
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

    // follow: lerp tới target để mượt
    const k = 0.15; // hệ số bám
    this.glider.x += (this.target.x - this.glider.x) * k;
    this.glider.y += (this.target.y - this.glider.y) * k;

    // spawns
    if(ts % this.G.starRate  < 16) this._spawnStar(ts);
    if(ts % this.G.lightRate < 16) this._spawnLight(ts);

    // move obstacles
    this.stars.forEach(s=> s.x -= s.v);
    this.lights.forEach(l=> l.x -= l.v);

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
    const ctx = this.ctx, C = this.C, w=this._w(), h=this._h();
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

    // HUD
    ctx.fillStyle = '#ffffff'; ctx.font = '16px "Times New Roman", serif';
    ctx.fillText(`Score: ${this.score}`, 12, 22);
    ctx.fillText(`Combo: ${this.combo}`, 12, 42);
    ctx.fillText(`Time: ${Math.ceil(this.timeLeft/1000)}s`, 12, 62);

    requestAnimationFrame(this._step.bind(this));
  }

  end(){
    this.playing = false;
    this.onEnd && this.onEnd({ score:this.score, comboMax:this.comboMax, duration_ms:this.cfg.duration_ms - Math.max(0, this.timeLeft) });
  }
}
