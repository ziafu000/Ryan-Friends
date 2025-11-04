
// HL single-key state (localStorage only)
(function(){
  const KEY = "hl_v1_state";
  const defState = ()=> ({
    profile: { id:"", created: new Date().toISOString() },
    settings: { phaseA_start: null, psqi_pre: null, psqi_post: null },
    logs: [],      // [{date, kind:'work'|'free', bed:'HH:MM', wake:'HH:MM', note?}]
    grades: [],    // [{date, subject, type:'15p'|'1tiet', score, phase:'A'|'B'}]
    kss: [],       // [{date, score:1..9}]
    streaks: { days: 0, lastDate: null }
  });

  function getState(){ try{ return JSON.parse(localStorage.getItem(KEY)) || defState(); }catch(e){ return defState(); } }
  function setState(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  function exportJSON(){
    const s = getState();
    const blob = new Blob([JSON.stringify({exported_at:new Date().toISOString(), key:KEY, state:s}, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "hl_state_export.json"; a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(file){
    const fr = new FileReader();
    fr.onload = ()=>{
      try{
        const obj = JSON.parse(fr.result);
        const state = obj?.state || obj;
        if(!state || typeof state!=="object"){ alert("File không đúng định dạng HL."); return; }
        setState(state);
        alert("Đã import dữ liệu HL.");
      }catch(e){ alert("Không đọc được file JSON."); }
    };
    fr.readAsText(file);
  }
  function resetState(){
    if(!confirm("Xoá toàn bộ dữ liệu Harmony Loop trên trình duyệt này?")) return;
    localStorage.removeItem(KEY);
    alert("Đã reset dữ liệu HL.");
  }

  function mountControls(){
    if(document.getElementById("hl-controls")) return;
    const box = document.createElement("div");
    box.id = "hl-controls";
    Object.assign(box.style, {
      position:"fixed", right:"14px", bottom:"14px", zIndex:"9999", padding:"10px",
      background:"rgba(10,16,32,.9)", border:"1px solid #1f2937", borderRadius:"12px",
      color:"#e5e7eb", fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif",
      boxShadow:"0 6px 24px rgba(0,0,0,.35)"
    });
    box.innerHTML = `
      <div style="font-size:12px;margin-bottom:6px">Harmony Loop — Data Lab</div>
      <div style="display:flex;gap:6px">
        <button id="hl-btn-export" style="padding:6px 10px;border-radius:10px;border:1px solid #334155;background:#22d3ee;color:#001016;font-weight:700;cursor:pointer">Export</button>
        <label style="padding:6px 10px;border-radius:10px;border:1px dashed #334155;background:transparent;color:#e5e7eb;cursor:pointer">
          Import<input id="hl-input" type="file" accept="application/json" style="display:none">
        </label>
        <button id="hl-btn-reset" style="padding:6px 10px;border-radius:10px;border:1px solid #334155;background:#0b1220;color:#e5e7eb;cursor:pointer">Reset</button>
      </div>
      <div style="font-size:11px;margin-top:6px;color:#94a3b8">localStorage only · offline</div>
    `;
    document.body.appendChild(box);
    document.getElementById("hl-btn-export").onclick = exportJSON;
    document.getElementById("hl-input").onchange = (e)=> e.target.files[0] && importJSON(e.target.files[0]);
    document.getElementById("hl-btn-reset").onclick = resetState;
  }

  window.HL = { getState, setState, exportJSON, importJSON, resetState, mountControls };
  window.addEventListener("DOMContentLoaded", ()=>{
    setState(getState()); // ensure default state exists
    if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js"); }
    mountControls();
  });
})();
