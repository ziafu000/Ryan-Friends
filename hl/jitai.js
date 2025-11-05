
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "style" && typeof v === "object") Object.assign(e.style, v); else if (k === "class") e.className = v; else e.setAttribute(k, v); });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (typeof c === "string") e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
    return e;
  }
  function buildModal() {
    const overlay = el("div", { id: "jitai-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
    const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(720px,96vw)", padding: "16px" } });
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
      el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "JITAI — Đề xuất theo trạng thái"),
      el("button", { id: "jitai-close", class: "btn btn-outline-secondary" }, "Đóng")
    ]);
    const content = el("div", {});
    box.append(header, content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("jitai-close").onclick = () => overlay.style.display = "none";

    const contentArea = document.querySelector("#jitai-overlay .card").lastChild;
    const banner = el("div", { id: "hl_jitai_banner", class: "card", style: { padding: "12px", fontWeight: "700", marginBottom: "8px" } }, "—");
    const evidence = el("div", { id: "hl_jitai_evi", style: { fontSize: "13px", color: "#6b7280" } }, "—");
    const history = el("div", { id: "hl_jitai_hist", style: { marginTop: "8px", fontSize: "12px", color: "#6b7280", maxHeight: "180px", overflow: "auto", borderTop: "1px dashed rgba(0,0,0,0.12)", paddingTop: "6px" } }, "—");
    content.append(banner, evidence, history);

    function hmToMin(hm) { if (!hm) return null; const [h, m] = hm.split(":").map(Number); return h * 60 + m; }
    function minDiff(a, b) { const d = Math.abs(a - b); return Math.min(d, 1440 - d); }
    const EVIDENCE = { A: "Kéo 15’ mỗi đêm giúp cơ thể thích nghi dần, hạn chế 'jetlag xã hội'.", B: "Ánh sáng buổi sáng + vận động nhẹ 5–10’ giúp đồng hồ sinh học đồng bộ lại.", C: "Cuối tuần lệch >60’ làm tăng SJL; bù ≤30’ để tránh phá nhịp tuần sau." };

    function evaluate() {
      const s = HL.getState(); s.nudges = s.nudges || [];
      const today = new Date().toISOString().slice(0, 10);
      const win = (window.SJL && SJL.computeWindow) ? SJL.computeWindow(today, s.logs || []) : { hasData: false };
      const set = s.settings || {}; const tgtW = hmToMin(set.target_wake);
      let type = null, msg = "";
      if (win.hasData && win.SJL >= 60) { type = "A"; msg = "SJL_7d ≥ 60’: dùng Planner kéo 15’/đêm."; }
      else {
        const lastWork = (s.logs || []).slice().reverse().find(x => (x.kind || "work") === "work" && x.wake);
        if (lastWork && tgtW != null) { const dev = minDiff(hmToMin(lastWork.wake), tgtW); if (dev > 30) { type = "B"; msg = "Wake (Work) lệch >30’ so với mục tiêu — Ánh sáng + vận động sáng."; } }
        const lastFree = (s.logs || []).slice().reverse().find(x => (x.kind || "free") === "free" && x.wake);
        if (!type && lastFree && tgtW != null) { const devF = minDiff(hmToMin(lastFree.wake), tgtW); if (devF > 60) { type = "C"; msg = "Cuối tuần lệch >60’ — giữ anchor và bù ≤30’."; } }
      }
      if (!type) { banner.textContent = "Ổn định — tiếp tục duy trì lịch hiện tại."; evidence.textContent = ""; return; }
      banner.textContent = `Gợi ý ${type}: ${msg}`; evidence.textContent = EVIDENCE[type];
      s.nudges.unshift({ date: today, type, msg, sjl: (win.SJL | 0) || null }); s.nudges = s.nudges.slice(0, 50); HL.setState(s);
      history.innerHTML = s.nudges.map(n => `• ${n.date} — ${n.type} — ${n.msg} ${n.sjl != null ? `(SJL=${n.sjl}’)` : ``}`).join("<br>") || "—";
    }
    function render() { evaluate(); }

    return { open() { overlay.style.display = "block"; if (typeof render === 'function') render(); } };
  }
  function ensureBtn() { const panel = document.getElementById("hl-controls"); if (!panel) return; if (document.getElementById("hl-btn-jitai")) return; const btn = document.createElement("button"); btn.id = "hl-btn-jitai"; btn.textContent = "JITAI"; HL.addToolButton(btn); const modal = buildModal(); btn.onclick = () => modal.open(); }
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
