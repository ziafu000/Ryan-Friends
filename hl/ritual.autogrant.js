// hl/ritual.autogrant.js — Auto-grant token when Daily Ritual is complete
(function(){
  const CANDIDATE_BASES = [ "./", "/", "../", "../../" ];
  const LS_KEY_BASE = "hl_arcade_base";
  const LS_PREFIX_GRANTED = "hl_ritual_granted_";
  const todayKey = () => new Date().toISOString().slice(0,10);
  const grantedKey = () => LS_PREFIX_GRANTED + todayKey();

  let Arcade = null, arcadeState = null, basePath = localStorage.getItem(LS_KEY_BASE) || null;

  function toast(msg){
    try{
      let t = document.getElementById("hl-toast");
      if(!t){
        t = Object.assign(document.createElement("div"), { id:"hl-toast"});
        t.style.cssText = "position:fixed;bottom:12px;left:50%;transform:translateX(-50%);padding:10px 14px;border-radius:12px;background:#111;color:#fff;z-index:99999;max-width:80vw;box-shadow:0 6px 20px rgba(0,0,0,.25)";
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.style.display = "block";
      setTimeout(()=>{ t.style.display="none"; }, 1800);
    }catch(e){}
  }

  async function detectBase(){
    if(basePath){
      try{
        const ok = await fetch(basePath + "arcade/config.json", {cache:"no-cache"});
        if(ok && ok.ok) return basePath;
      }catch(e){}
    }
    for(const b of CANDIDATE_BASES){
      try{
        const res = await fetch(b + "arcade/config.json", {cache:"no-cache"});
        if(res.ok){ localStorage.setItem(LS_KEY_BASE, b); return b; }
      }catch(e){}
    }
    throw new Error("Không tìm thấy arcade/config.json — đặt thư mục /arcade cùng cấp với trang hiện tại.");
  }

  function hasRitualDoneToday(){
    if(!window.HL || typeof HL.getState !== "function") return false;
    const s = HL.getState(); if(!s) return false;
    const d = todayKey();
    const rec = (s.logs || []).find(x => x.date === d);
    const hasBoth = !!(rec && rec.bed && rec.wake);
    const set = s.settings || {};
    const hasPlan = !!(set.target_sleep || set.target_wake);
    return hasBoth && hasPlan;
  }

  async function ensureArcade(){
    if(Arcade && arcadeState) return true;
    const base = await detectBase();
    basePath = base;
    Arcade = await import(base + "arcade/arcade.js");
    arcadeState = await Arcade.init(base + "arcade/config.json");
    return true;
  }

  async function tick(){
    try{
      await ensureArcade();
      const key = grantedKey();
      if(localStorage.getItem(key) === "1") return;
      if(!hasRitualDoneToday()) return;
      const before = arcadeState.tokens|0;
      Arcade.completeRitual(arcadeState);
      const after = arcadeState.tokens|0;
      if(after > before){
        localStorage.setItem(key, "1");
        toast("✅ Đã cộng 1 token (Daily Ritual).");
      }else{
        toast("ℹ️ Ritual hoàn thành nhưng đang đạt trần token.");
        localStorage.setItem(key, "1");
      }
    }catch(e){/* silent fail */}
  }

  setInterval(tick, 3500);
  document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState === "visible") tick(); });
  window.addEventListener("load", tick);
})();