
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

  function buildModal(){
    const overlay = el("div",{id:"hl-settings-overlay",style:{
      position:"fixed",inset:"0",background:"rgba(0,0,0,.5)",display:"none",zIndex:"10000"
    }});
    const box = el("div",{style:{
      position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
      width:"min(520px,92vw)",background:"#0b1220",border:"1px solid #1f2937",borderRadius:"16px",
      color:"#e5e7eb",padding:"16px",boxShadow:"0 10px 30px rgba(0,0,0,.45)"
    }});
    const title = el("div",{style:{fontWeight:"700",fontSize:"16px",marginBottom:"8px"}}, "Settings / Onboarding");

    const grid = el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}});
    const stuid = el("input",{id:"hl_set_id",placeholder:"Mã HS (VD: 11A1-03)"});
    const phaseA= el("input",{id:"hl_set_phaseA",type:"date"});
    const psqiPre = el("input",{id:"hl_set_psqi_pre",type:"number",min:"0",max:"21",placeholder:"PSQI Pre (0–21)"});
    const psqiPost= el("input",{id:"hl_set_psqi_post",type:"number",min:"0",max:"21",placeholder:"PSQI Post (0–21)"});

    grid.append(
      el("div",{},[el("label",{},["Mã HS"]), stuid]),
      el("div",{},[el("label",{},["Ngày bắt đầu Pha A (7 ngày)"]), phaseA]),
      el("div",{},[el("label",{},["PSQI Pre (0–21)"]), psqiPre]),
      el("div",{},[el("label",{},["PSQI Post (0–21)"]), psqiPost])
    );

    const actions = el("div",{style:{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"12px"}});
    const btnSave = el("button",{id:"hl_save_settings",style:{padding:"10px 14px",borderRadius:"12px",border:"none",background:"#22d3ee",color:"#001016",fontWeight:"700",cursor:"pointer"}}, "Lưu");
    const btnClose= el("button",{style:{padding:"10px 14px",borderRadius:"12px",border:"1px solid #334155",background:"#0b1220",color:"#e5e7eb",cursor:"pointer"}}, "Đóng");
    actions.append(btnSave, btnClose);

    const msg = el("div",{id:"hl_set_msg",style:{fontSize:"12px",color:"#94a3b8",marginTop:"6px"}});

    // Prefill
    const s = HL.getState();
    stuid.value = s.profile?.id || "";
    phaseA.value = s.settings?.phaseA_start || "";
    psqiPre.value = (s.settings?.psqi_pre ?? "");
    psqiPost.value= (s.settings?.psqi_post ?? "");

    box.append(title, grid, actions, msg);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    btnClose.onclick = ()=> overlay.style.display="none";
    btnSave.onclick = ()=>{
      const s = HL.getState();
      s.profile = s.profile || {};
      s.profile.id = stuid.value.trim();
      s.settings = s.settings || {};
      s.settings.phaseA_start = phaseA.value || null;
      s.settings.psqi_pre = psqiPre.value? Number(psqiPre.value): null;
      s.settings.psqi_post= psqiPost.value? Number(psqiPost.value): null;
      HL.setState(s);
      msg.textContent = "Đã lưu.";
    };

    return { open(){ overlay.style.display="block"; } };
  }

  function ensureButtons(){
    const panel = document.getElementById("hl-controls");
    if(!panel) return;
    if(document.getElementById("hl-btn-settings")) return;
    const btn = document.createElement("button");
    btn.id = "hl-btn-settings";
    btn.textContent = "Settings";
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

  window.addEventListener("DOMContentLoaded", ()=> setTimeout(ensureButtons, 160));
})();
