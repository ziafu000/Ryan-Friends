
// hl/state.js — single-key state + compact toolbar (no extra files)
(function () {
  const KEY = "hl_v1_state";
  const defState = () => ({
    profile: { id: "", created: new Date().toISOString() },
    settings: { phaseA_start: null, psqi_pre: null, psqi_post: null, target_sleep: null, target_wake: null, school_days: "" },
    logs: [],      // [{date, kind:'work'|'free', bed:'HH:MM', wake:'HH:MM', note?}]
    grades: [],    // [{date, subject, type:'15p'|'1tiet', score, phase:'A'|'B'}]
    kss: [],       // [{date, score:1..9}]
    streaks: { days: 0, lastDate: null },
    nudges: []
  });

  function getState() { try { return JSON.parse(localStorage.getItem(KEY)) || defState(); } catch (e) { return defState(); } }
  function setState(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

  function exportJSON() {
    const s = getState();
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), key: KEY, state: s }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "hl_state_export.json"; a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const obj = JSON.parse(fr.result);
        const state = obj?.state || obj;
        if (!state || typeof state !== "object") { alert("File không đúng định dạng HL."); return; }
        setState(state);
        alert("Đã import dữ liệu HL.");
      } catch (e) { alert("Không đọc được file JSON."); }
    };
    fr.readAsText(file);
  }
  function resetState() {
    if (!confirm("Xoá toàn bộ dữ liệu Harmony Loop trên trình duyệt này?")) return;
    localStorage.removeItem(KEY);
    alert("Đã reset dữ liệu HL.");
  }

  // Expose namespace early
  window.HL = Object.assign(window.HL || {}, {
    KEY, getState, setState, exportJSON, importJSON, resetState,
    _pendingTools: [],
    addToolButton: function (btn) {
      btn.classList.add("btn", "btn-outline-secondary");
      const menu = document.getElementById("hl-tools-menu");
      if (menu) menu.appendChild(btn);
      else this._pendingTools.push(btn);
    },
    getToolsMenu: function () { return document.getElementById("hl-tools-menu"); }
  });

  // === Controls (Export / Import / Reset + Tools) — styled by index.css ===
  (function () {
    function el(tag, attrs = {}, children = []) {
      const e = document.createElement(tag);
      Object.entries(attrs || {}).forEach(([k, v]) => {
        if (k === "class") e.className = v;
        else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
        else e.setAttribute(k, v);
      });
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (typeof c === "string") e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c);
      });
      return e;
    }

    function buildControls() {
      let panel = document.getElementById("hl-controls");
      if (!panel) { panel = el("div", { id: "hl-controls", class: "Tools" }); document.body.appendChild(panel); }
      panel.innerHTML = "";

      const exportBtn = el("button", { id: "hl-btn-export", class: "btn btn-primary" }, "Export");
      const importBtn = el("button", { id: "hl-btn-import", class: "btn btn-outline-secondary" }, "Import");
      const resetBtn = el("button", { id: "hl-btn-reset", class: "btn btn-outline-secondary" }, "Reset");

      const fileInput = el("input", { type: "file", accept: "application/json", style: { display: "none" } });
      document.body.appendChild(fileInput);

      const toolsWrap = el("span", { id: "hl-tools-wrap" });
      const toolsBtn = el("button", { id: "hl-btn-tools", class: "btn btn-outline-secondary" }, "Tools ▾");
      const toolsMenu = el("div", { id: "hl-tools-menu" });
      toolsWrap.append(toolsBtn, toolsMenu);

      panel.append(exportBtn, importBtn, resetBtn, toolsWrap);

      exportBtn.onclick = exportJSON;
      importBtn.onclick = () => { fileInput.value = ""; fileInput.click(); };
      fileInput.onchange = () => { const f = fileInput.files && fileInput.files[0]; if (f) importJSON(f); };
      resetBtn.onclick = resetState;

      // Toggle Tools menu
      let open = false;
      const setOpen = (v) => { open = v; toolsMenu.classList.toggle("show", open); toolsBtn.textContent = open ? "Tools ▲" : "Tools ▾"; };
      toolsBtn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!open); });
      document.addEventListener("click", () => { if (open) setOpen(false); }, { capture: true });

      // Flush queued tool buttons
      if (Array.isArray(HL._pendingTools) && HL._pendingTools.length) {
        HL._pendingTools.forEach(btn => toolsMenu.appendChild(btn));
        HL._pendingTools.length = 0;
      }
    }

    if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", buildControls);
    else buildControls();
  })();
})();
