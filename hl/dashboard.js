
(function(){
  function el(tag, attrs={}, children=[]){
    const e = document.createElement(tag);
    Object.entries(attrs||{}).forEach(([k,v])=>{
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
  function avg(a){ return (a && a.length)? a.reduce((x,y)=>x+y,0)/a.length : null; }

  function drawBarChart(canvas, data){
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,H-30); ctx.lineTo(W-10,H-30); ctx.stroke();
    const maxVal = 10, bw = 24, gap = 26, groupGap = 40;
    let x = 50; const colors = {A:"#22d3ee", B:"#16a34a"};
    ctx.font = "12px system-ui, Segoe UI, Roboto, Arial"; ctx.fillStyle = "#94a3b8";
    ctx.fillText("0", 20, H-30); ctx.fillText("10", 12, 14);
    (data.groups||[]).forEach(g=>{
      const hA = (g.A!=null? (g.A/maxVal)*(H-50):0);
      ctx.fillStyle = colors.A; ctx.fillRect(x, (H-30)-hA, bw, hA);
      const hB = (g.B!=null? (g.B/maxVal)*(H-50):0);
      ctx.fillStyle = colors.B; ctx.fillRect(x+bw+gap/2, (H-30)-hB, bw, hB);
      ctx.fillStyle = "#e5e7eb"; ctx.textAlign = "center"; ctx.fillText(g.name, x + bw + gap/2/2, H-10);
      x += bw*2 + gap + groupGap;
    });
    ctx.textAlign = "left";
    ctx.fillStyle = "#22d3ee"; ctx.fillRect(W-150, 12, 10, 10);
    ctx.fillStyle = "#e5e7eb"; ctx.fillText("A (7 ngày)", W-135, 21);
    ctx.fillStyle = "#16a34a"; ctx.fillRect(W-150, 28, 10, 10);
    ctx.fillStyle = "#e5e7eb"; ctx.fillText("B (14 ngày)", W-135, 37);
  }

  function buildModal(){
    const overlay = el("div",{id:"hl-dash-overlay",style:{
      position:"fixed",inset:"0",background:"rgba(0,0,0,.5)",display:"none",zIndex:"10000"
    }});
    const box = el("div",{style:{
      position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
      width:"min(860px,96vw)",background:"#0b1220",border:"1px solid #1f2937",borderRadius:"16px",
      color:"#e5e7eb",padding:"16px",boxShadow:"0 10px 30px rgba(0,0,0,.45)"
    }});
    const header = el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}},[
      el("div",{style:{fontWeight:"800",fontSize:"18px"}}, "Dashboard — SJL / PSQI / Điểm"),
      el("div",{},[
        el("button",{id:"hl-dash-heatmap",style:{padding:"6px 10px",borderRadius:"10px",border:"1px solid #334155",background:"#0b1220",color:"#e5e7eb",cursor:"pointer",marginRight:"8px"}}, "Open Heatmap"),
        el("button",{id:"hl-dash-close",style:{padding:"6px 10px",borderRadius:"10px",border:"1px solid #334155",background:"#0b1220",color:"#e5e7eb",cursor:"pointer"}}, "Đóng")
      ])
    ]);
    const grid = el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"10px"}});
    const cardSJL = el("div",{style:{border:"1px solid #334155",borderRadius:"12px",padding:"12px"}},[
      el("div",{style:{fontWeight:"700"}}, "SJL_7d (phút)"),
      el("div",{id:"hl-card-sjl",style:{fontSize:"28px",fontWeight:"800",marginTop:"4px"}},"—")
    ]);
    const cardMS = el("div",{style:{border:"1px solid #334155",borderRadius:"12px",padding:"12px"}},[
      el("div",{style:{fontWeight:"700"}}, "MSW / MSF / MSFsc"),
      el("div",{id:"hl-card-ms",style:{fontSize:"16px",fontWeight:"700",marginTop:"4px"}},"—")
    ]);
    const cardPSQI = el("div",{style:{border:"1px solid #334155",borderRadius:"12px",padding:"12px"}},[
      el("div",{style:{fontWeight:"700"}}, "PSQI (Pre → Post)"),
      el("div",{id:"hl-card-psqi",style:{fontSize:"20px",fontWeight:"800",marginTop:"4px"}},"—")
    ]);
    grid.append(cardSJL, cardMS, cardPSQI);

    const scoreWrap = el("div",{style:{border:"1px solid #334155",borderRadius:"12px",padding:"12px"}});
    const scoreTitle = el("div",{style:{fontWeight:"700",marginBottom:"6px"}}, "Điểm A vs B");
    const canvas = el("canvas",{id:"hl-dash-canvas",width:"760",height:"260",style:{width:"100%",height:"260px",background:"#0b1220",border:"1px dashed #334155",borderRadius:"8px"}});
    scoreWrap.append(scoreTitle, canvas);

    box.append(header, grid, scoreWrap);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById("hl-dash-close").onclick = ()=> overlay.style.display="none";
    document.getElementById("hl-dash-heatmap").onclick = ()=>{ const b=document.getElementById("hl-btn-heatmap"); if(b) b.click(); };

    function render(){
      const s = HL.getState();
      const todayISO = new Date().toISOString().slice(0,10);
      const win = (window.SJL && SJL.computeWindow) ? SJL.computeWindow(todayISO, s.logs||[]) : {hasData:false};

      const sjlEl = document.getElementById("hl-card-sjl");
      if(win.hasData){ sjlEl.textContent = Math.round(win.SJL) + "’"; sjlEl.style.color = win.color || "#e5e7eb"; }
      else { sjlEl.textContent = "— (thiếu Work/Free 7d)"; sjlEl.style.color = "#94a3b8"; }

      const msEl = document.getElementById("hl-card-ms");
      msEl.textContent = win.hasData ? (`MSW ${SJL.minToHM(win.MSW)} • MSF ${SJL.minToHM(win.MSF)} • MSFsc ${SJL.minToHM(win.MSFsc)}`) : "—";

      const p = s.settings||{}; const pre = p.psqi_pre!=null? p.psqi_pre : "—"; const post= p.psqi_post!=null? p.psqi_post: "—";
      document.getElementById("hl-card-psqi").textContent = pre+" → "+post;

      const g = s.grades || [];
      const g15A = avg(g.filter(x=>x.type==="15p" && x.phase==="A").map(x=>x.score));
      const g15B = avg(g.filter(x=>x.type==="15p" && x.phase==="B").map(x=>x.score));
      const g1tA = avg(g.filter(x=>x.type!=="15p" && x.phase==="A").map(x=>x.score));
      const g1tB = avg(g.filter(x=>x.type!=="15p" && x.phase==="B").map(x=>x.score));
      drawBarChart(canvas, {groups:[{name:"15p", A:g15A, B:g15B}, {name:"1 tiết", A:g1tA, B:g1tB}]});
    }
    return { open(){ overlay.style.display="block"; render(); } };
  }

  function ensureButtons(){
    const panel = document.getElementById("hl-controls"); if(!panel) return;
    if(document.getElementById("hl-btn-dashboard")) return;
    const btn = document.createElement("button");
    btn.id = "hl-btn-dashboard"; btn.textContent = "Dashboard";
    Object.assign(btn.style,{ padding:"6px 10px", borderRadius:"10px", border:"1px solid #334155", background:"#0b1220", color:"#e5e7eb", cursor:"pointer", marginLeft:"6px" });
    const rows = panel.querySelectorAll("div");
    const container = rows.length>1 ? rows[1] : panel;
    container.appendChild(btn);
    const modal = buildModal();
    btn.onclick = ()=> modal.open();
  }

  window.addEventListener("DOMContentLoaded", ()=> setTimeout(ensureButtons, 200));
})();
