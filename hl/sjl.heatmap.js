
// SJL Heatmap modal — uses window.SJL.series()
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
  function buildModal(){
    const overlay = el("div",{id:"hl-heatmap-overlay",style:{
      position:"fixed",inset:"0",background:"rgba(0,0,0,.5)",display:"none",zIndex:"10000"
    }});
    const box = el("div",{style:{
      position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
      width:"min(720px,96vw)",background:"#0b1220",border:"1px solid #1f2937",borderRadius:"16px",
      color:"#e5e7eb",padding:"16px",boxShadow:"0 10px 30px rgba(0,0,0,.45)"
    }});

    const head = el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}},
      [ el("div",{style:{fontWeight:"700"}}, "SJL Heatmap — 28 ngày (SJL_7d/phút)"),
        el("button",{id:"hl-heatmap-close",style:{padding:"6px 10px",borderRadius:"10px",border:"1px solid #334155",background:"#0b1220",color:"#e5e7eb",cursor:"pointer"}}, "Đóng")
      ]
    );

    const legend = el("div",{style:{display:"flex",gap:"10px",fontSize:"12px",marginBottom:"8px",alignItems:"center"}},[
      el("span",{style:{background:"#16a34a",width:"14px",height:"14px",display:"inline-block",borderRadius:"3px"}}),
      el("span",{},"≤30’"),
      el("span",{style:{background:"#22d3ee",width:"14px",height:"14px",display:"inline-block",borderRadius:"3px"}}),
      el("span",{},"31–60’"),
      el("span",{style:{background:"#f59e0b",width:"14px",height:"14px",display:"inline-block",borderRadius:"3px"}}),
      el("span",{},"61–120’"),
      el("span",{style:{background:"#ef4444",width:"14px",height:"14px",display:"inline-block",borderRadius:"3px"}}),
      el("span",{},">120’"),
      el("span",{style:{background:"#1f2937",width:"14px",height:"14px",display:"inline-block",borderRadius:"3px"}}),
      el("span",{},"no data")
    ]);

    const grid = el("div",{id:"hl-heatmap-grid",style:{
      display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:"6px"
    }});

    const info = el("div",{id:"hl-heatmap-info",style:{fontSize:"12px",color:"#94a3b8",marginTop:"8px"}});

    box.append(head, legend, grid, info);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById("hl-heatmap-close").onclick = ()=> overlay.style.display="none";

    function render(){
      const items = (window.SJL && SJL.series && SJL.series(28)) || [];
      // Arrange by weekday columns: columns=Mon..Sun (assume ISO week Monday=0)
      grid.innerHTML = "";
      // create labels
      const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      for(const w of weekdays){
        grid.appendChild(el("div",{style:{textAlign:"center",fontSize:"11px",color:"#94a3b8"}}, w));
      }
      // Build 4 weeks (rows) * 7 days + header row already used; we will just render 28 cells after header
      // Simpler approach: render cells in chronological order; show tooltip-like value.
      items.forEach(obj=>{
        const color = obj.hasData ? (obj.color || "#1f2937") : "#1f2937";
        const sjlMin = obj.hasData ? (obj.SJL|0) : null;
        const cell = el("div",{style:{
          width:"100%", aspectRatio:"1 / 1", background: color, borderRadius:"6px",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#0b1220", fontWeight:"700"
        }}, sjlMin==null ? "" : String(Math.round(sjlMin)));
        cell.title = obj.date + (sjlMin==null? " — no data" : (" — SJL_7d: "+sjlMin+"'"));
        grid.appendChild(cell);
      });

      const last = items[items.length-1]||{};
      const txt = last.hasData
        ? (`Hôm nay (${last.date}): MSW=${SJL.minToHM(last.MSW)}, MSF=${SJL.minToHM(last.MSF)}, SJL=${Math.round(last.SJL)}’`)
        : (`Hôm nay (${last.date||"—"}): thiếu dữ liệu (cần ≥1 ngày Work & ≥1 ngày Free trong 7 ngày).`);
      info.textContent = txt;
    }

    return { open(){ overlay.style.display="block"; render(); } };
  }

  function ensureButtons(){
    const panel = document.getElementById("hl-controls");
    if(!panel) return;
    if(document.getElementById("hl-btn-heatmap")) return;
    const btn = document.createElement("button");
    btn.id = "hl-btn-heatmap";
    btn.textContent = "Heatmap";
    Object.assign(btn.style, {
      padding:"6px 10px", borderRadius:"10px", border:"1px solid #334155",
      background:"#0b1220", color:"#e5e7eb", cursor:"pointer", marginLeft:"6px"
    });
    const rows = panel.querySelectorAll("div");
    const container = rows.length>1 ? rows[1] : panel;
    container.appendChild(btn);

    const modal = buildModal();
    btn.onclick = ()=> modal.open();
  }

  window.addEventListener("DOMContentLoaded", ()=> setTimeout(ensureButtons, 170));
})();
