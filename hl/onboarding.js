
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "style" && typeof v === "object") Object.assign(e.style, v); else if (k === "class") e.className = v; else e.setAttribute(k, v); });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (typeof c === "string") e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
    return e;
  }
  function buildModal() {
    const overlay = el("div", { id: "onboarding-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
    const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(720px,96vw)", padding: "16px" } });
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
      el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "Onboarding — thiết lập nhanh"),
      el("button", { id: "onboarding-close", class: "btn btn-outline-secondary" }, "Đóng")
    ]);
    const content = el("div", {});
    box.append(header, content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("onboarding-close").onclick = () => overlay.style.display = "none";

    const contentDiv = document.querySelector("#onboarding-overlay .card").lastChild;
    const grid = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } });
    const stuid = el("input", { id: "hl_ob_id", placeholder: "Ví dụ: 11A16-34" });
    const schoolDays = el("input", { id: "hl_ob_school", placeholder: "Ngày học (vd: Mon-Fri)" });
    const tgtSleep = el("input", { id: "hl_ob_tgs", type: "time", placeholder: "Mục tiêu ngủ (vd 22:30)" });
    const tgtWake = el("input", { id: "hl_ob_tgw", type: "time", placeholder: "Mục tiêu dậy (vd 06:00)" });
    const btnSave = el("button", { id: "hl_ob_save", class: "btn btn-primary", style: { marginTop: "8px" } }, "Lưu & áp dụng");
    const expImp = el("div", { style: { fontSize: "12px", color: "#6b7280", marginTop: "6px" } }, "Gợi ý: dùng Export/Import JSON để sao lưu & chuyển máy.");
    grid.append(el("div", {}, [el("label", {}, ["Mã HS"]), stuid]), el("div", {}, [el("label", {}, ["Ngày học"]), schoolDays]), el("div", {}, [el("label", {}, ["Mục tiêu ngủ"]), tgtSleep]), el("div", {}, [el("label", {}, ["Mục tiêu dậy"]), tgtWake]), btnSave, expImp);
    content.append(grid);

    btnSave.onclick = () => {
      const s = HL.getState();
      s.profile = s.profile || {}; s.profile.id = stuid.value || s.profile.id || "";
      s.settings = s.settings || {}; if (tgtSleep.value) s.settings.target_sleep = tgtSleep.value; if (tgtWake.value) s.settings.target_wake = tgtWake.value;
      s.settings.school_days = schoolDays.value || s.settings.school_days || "";
      HL.setState(s);
      const cut = Date.now() - 90 * 24 * 60 * 60 * 1000;
      function keep(iso) { const d = new Date(iso + "T00:00:00"); return d.getTime() >= cut; }
      const s2 = HL.getState();
      s2.logs = (s2.logs || []).filter(x => keep(x.date)); s2.kss = (s2.kss || []).filter(x => keep(x.date)); s2.grades = (s2.grades || []).filter(x => keep(x.date));
      HL.setState(s2);
      alert("Đã lưu & áp dụng. Đã dọn dữ liệu về 90 ngày gần nhất.");
    };

    return { open() { overlay.style.display = "block"; if (typeof render === 'function') render(); } };
  }
  function ensureBtn() { const panel = document.getElementById("hl-controls"); if (!panel) return; if (document.getElementById("hl-btn-onboarding")) return; const btn = document.createElement("button"); btn.id = "hl-btn-onboarding"; btn.textContent = "Onboarding"; HL.addToolButton(btn); const modal = buildModal(); btn.onclick = () => modal.open(); }
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
