
(function(){
  function el(tag, attrs={}, children=[]){
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k==="style" && typeof v==="object"){ Object.assign(e.style, v); }
      else if(k==="class") e.className = v;
      else e.setAttribute(k,v);
    });
    (Array.isArray(children)? children : [children]).forEach(c=>{
      if(typeof c==="string") e.appendChild(document.createTextNode(c));
      else if(c) e.appendChild(c);
    });
    return e;
  }
  function todayISO(d=new Date()){ d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
  function nowHM(){ const d=new Date(); const h=String(d.getHours()).padStart(2,"0"); const m=String(d.getMinutes()).padStart(2,"0"); return h+":"+m; }
  function findLogByDate(logs, iso){ return logs.find(x=>x.date===iso); }
  function hasBoth(rec){ return rec && rec.bed && rec.wake; }
  function parseISO(iso){ const [y,m,d]=iso.split("-").map(Number); return new Date(y, m-1, d); }
  function isoAddDays(iso, n){ const d = parseISO(iso); d.setDate(d.getDate()+n); return todayISO(d); }
  function recomputeStreaks(state){
    const logs = (state.logs||[]).filter(x=> hasBoth(x)).map(x=>x.date).sort();
    if(logs.length===0){ state.streaks={days:0,lastDate:null}; return; }
    let last = logs[logs.length-1];
    let days = 1;
    for(let i=logs.length-2;i>=0;i--){
      if(logs[i] === isoAddDays(last,-1)){ days++; last = logs[i]; }
      else break;
    }
    state.streaks = { days, lastDate: logs[logs.length-1] };
  }

  function buildModal(){
    const overlay = el("div",{id:"hl-logger-overlay",style:{
      position:"fixed",inset:"0",background:"rgba(0,0,0,.5)",display:"none",zIndex:"10000"
    }});
    const box = el("div",{style:{
      position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
      width:"min(560px,92vw)",background:"#0b1220",border:"1px solid #1f2937",borderRadius:"16px",
      color:"#e5e7eb",padding:"16px",boxShadow:"0 10px 30px rgba(0,0,0,.45)"
    }});

    const title = el("div",{style:{fontWeight:"700",fontSize:"16px",marginBottom:"8px"}}, "Bedtime / Wake — 60s");
    const row1 = el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px"}});
    const inDate = el("input",{type:"date",id:"hl_log_date",value:todayISO()});
    const selKind = el("select",{id:"hl_log_kind"},[
      el("option",{value:"work"},"Ngày học (Work)"),
      el("option",{value:"free"},"Cuối tuần (Free)"),
    ]);
    const inBed = el("input",{type:"time",id:"hl_log_bed",placeholder:"23:00"});
    const inWake= el("input",{type:"time",id:"hl_log_wake",placeholder:"06:30"});
    row1.append(
      el("div",{},[el("label",{},["Ngày"]), inDate]),
      el("div",{},[el("label",{},["Loại ngày"]), selKind]),
      el("div",{},[el("label",{},["Giờ ngủ"]), inBed]),
      el("div",{},[el("label",{},["Giờ dậy"]), inWake]),
    );

    const row2 = el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginTop:"8px"}});
    const note = el("input",{id:"hl_log_note",placeholder:"Ghi chú (tuỳ chọn)"});
    const kss = el("input",{id:"hl_log_kss",type:"number",min:"1",max:"9",placeholder:"KSS sáng 1..9"});
    const quick = el("div",{},
      el("div",{},[
        el("button",{id:"hl_now_bed",style:{padding:"8px 10px",borderRadius:"10px",border:"1px solid #334155",background:"#0a1020",color:"#e5e7eb",cursor:"pointer",marginRight:"6px"}}, "Bed = Now"),
        el("button",{id:"hl_now_wake",style:{padding:"8px 10px",borderRadius:"10px",border:"1px solid #334155",background:"#0a1020",color:"#e5e7eb",cursor:"pointer"}}, "Wake = Now")
      ])
    );
    row2.append(
      el("div",{},[el("label",{},["Ghi chú"]), note]),
      el("div",{},[el("label",{},["KSS sáng (1–9)"]), kss]),
      el("div",{},[el("label",{},["Nút nhanh"]), quick]),
    );

    const actions = el("div",{style:{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"12px"}});
    const btnSave = el("button",{id:"hl_save_log",style:{padding:"10px 14px",borderRadius:"12px",border:"none",background:"#22d3ee",color:"#001016",fontWeight:"700",cursor:"pointer"}}, "Lưu (≤60s)");
    const btnClose= el("button",{style:{padding:"10px 14px",borderRadius:"12px",border:"1px solid #334155",background:"#0b1220",color:"#e5e7eb",cursor:"pointer"}}, "Đóng");
    actions.append(btnSave, btnClose);

    const msg = el("div",{id:"hl_log_msg",style:{fontSize:"12px",color:"#94a3b8",marginTop:"6px"}});

    box.append(title, row1, row2, actions, msg);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById("hl_now_bed").onclick = ()=> inBed.value = nowHM();
    document.getElementById("hl_now_wake").onclick= ()=> inWake.value = nowHM();
    btnClose.onclick = ()=> overlay.style.display="none";

    btnSave.onclick = ()=>{
      const s = HL.getState();
      const rec = {
        date: inDate.value || todayISO(),
        kind: selKind.value,
        bed: inBed.value || null,
        wake: inWake.value || null,
        note: note.value||""
      };
      if(!rec.bed && !rec.wake){
        msg.textContent = "Cần nhập ít nhất giờ ngủ hoặc giờ dậy."; return;
      }
      const ix = (s.logs||[]).findIndex(x=>x.date===rec.date);
      if(ix>=0) s.logs[ix]= {...s.logs[ix], ...rec};
      else { s.logs = s.logs||[]; s.logs.push(rec); }
      const k = Number(kss.value);
      if(k>=1 && k<=9){
        const kix = (s.kss||[]).findIndex(x=>x.date===rec.date);
        if(kix>=0) s.kss[kix] = {date:rec.date, score:k}; else { s.kss = s.kss||[]; s.kss.push({date:rec.date, score:k}); }
      }
      // recompute streaks
      recomputeStreaks(s);
      HL.setState(s);
      msg.textContent = "Đã lưu log. Streak: "+(s.streaks?.days||0)+" ngày.";
    };

    return { open(){ overlay.style.display="block"; } };
  }

  function ensureButtons(){
    const panel = document.getElementById("hl-controls");
    if(!panel) return;
    if(document.getElementById("hl-btn-logger")) return;
    const btn = document.createElement("button");
    btn.id = "hl-btn-logger";
    btn.textContent = "Logger";
    Object.assign(btn.style, {
      padding:"6px 10px", borderRadius:"10px", border:"1px solid #334155",
      background:"#0b1220", color:"#e5e7eb", cursor:"pointer", marginLeft:"6px"
    });
    // second child div is the button row
    const rows = panel.querySelectorAll("div");
    const container = rows.length>1 ? rows[1] : panel;
    container.appendChild(btn);
    const modal = buildModal();
    btn.onclick = ()=> modal.open();
  }

  window.addEventListener("DOMContentLoaded", ()=> setTimeout(ensureButtons, 150));
})();
