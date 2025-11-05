
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "style" && typeof v === "object") Object.assign(e.style, v); else if (k === "class") e.className = v; else e.setAttribute(k, v); });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (typeof c === "string") e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
    return e;
  }
  function buildModal() {
    const overlay = el("div", { id: "examday-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
    const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(720px,96vw)", padding: "16px" } });
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
      el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "Exam-day Coach + Điểm + KSS"),
      el("button", { id: "examday-close", class: "btn btn-outline-secondary" }, "Đóng")
    ]);
    const content = el("div", {});
    box.append(header, content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("examday-close").onclick = () => overlay.style.display = "none";

    const contentBox = document.querySelector("#examday-overlay .card").lastChild;
    const grid = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } });

    const left = el("div", { class: "card", style: { padding: "12px" } });
    left.append(el("div", { style: { fontWeight: "700", marginBottom: "6px" } }, "Coach"));
    const exDate = el("input", { type: "date", id: "hl_ex_date" });
    const exTime = el("input", { type: "time", id: "hl_ex_time" });
    const btnSuggest = el("button", { id: "hl_ex_suggest", class: "btn btn-primary", style: { marginTop: "8px" } }, "Gợi ý giờ ngủ/dậy");
    const sug = el("div", { id: "hl_ex_sug", style: { fontSize: "13px", color: "#6b7280", marginTop: "6px" } }, "—");
    left.append(el("div", {}, [el("label", {}, ["Ngày thi"]), exDate]), el("div", {}, [el("label", {}, ["Giờ thi"]), exTime]), btnSuggest, sug);

    const right = el("div", { class: "card", style: { padding: "12px" } });
    right.append(el("div", { style: { fontWeight: "700", marginBottom: "6px" } }, "Điểm & KSS"));
    const subject = el("input", { id: "hl_gr_subject", placeholder: "Môn (VD: Math)" });
    const type = el("select", { id: "hl_gr_type" }, [el("option", { value: "15p" }, "15p"), el("option", { value: "1tiet" }, "1 tiết")]);
    const score = el("input", { id: "hl_gr_score", type: "number", min: "0", max: "10", step: "0.1", placeholder: "Điểm 0–10" });
    const phase = el("select", { id: "hl_gr_phase" }, [el("option", { value: "A" }, "A"), el("option", { value: "B" }, "B")]);
    const btnAdd = el("button", { id: "hl_gr_add", class: "btn btn-outline-secondary", style: { marginTop: "8px" } }, "Thêm điểm");
    const kss = el("input", { id: "hl_gr_kss", type: "number", min: "1", max: "9", placeholder: "KSS sáng 1–9 (tuỳ chọn)" });
    const consoleBox = el("div", { id: "hl_gr_list", style: { fontSize: "12px", color: "#6b7280", marginTop: "8px", maxHeight: "180px", overflow: "auto", borderTop: "1px dashed rgba(0,0,0,0.12)", paddingTop: "6px" } }, "—");
    right.append(el("div", {}, [el("label", {}, ["Môn"]), subject]), el("div", {}, [el("label", {}, ["Loại"]), type]), el("div", {}, [el("label", {}, ["Điểm"]), score]), el("div", {}, [el("label", {}, ["Pha"]), phase]), btnAdd, el("div", {}, [el("label", {}, ["KSS sáng (1–9)"]), kss]), consoleBox);

    grid.append(left, right); content.append(grid);

    function pad(n) { return String(n).padStart(2, "0"); }
    function addMinHM(hm, min) { const [h, m] = hm.split(":").map(Number); const x = (h * 60 + m + min + 1440) % 1440; return pad(Math.floor(x / 60)) + ":" + pad(x % 60); }

    btnSuggest.onclick = () => {
      const t = exTime.value; if (!t) { sug.textContent = "Nhập giờ thi."; return; }
      const wake = addMinHM(t, -120), sleep = addMinHM(wake, -480);
      sug.textContent = `Gợi ý: ngủ ${sleep}, dậy ${wake}. Pre-test 60s: hít thở + kiểm vật dụng.`;
      const st = HL.getState(); st.settings = st.settings || {}; st.settings.target_sleep = sleep; st.settings.target_wake = wake; HL.setState(st);
    };

    btnAdd.onclick = () => {
      const s = HL.getState();
      const rec = { date: new Date().toISOString().slice(0, 10), subject: subject.value || "", type: type.value === "15p" ? "15p" : "1tiet", score: Number(score.value), phase: phase.value === "B" ? "B" : "A" };
      if (!(rec.subject && !Number.isNaN(rec.score))) { alert("Điền đủ môn & điểm."); return; }
      s.grades = s.grades || []; s.grades.push(rec);
      const k = Number(kss.value); if (k >= 1 && k <= 9) { s.kss = s.kss || []; s.kss.push({ date: rec.date, score: k }); }
      HL.setState(s);
      renderList();
    };

    function renderList() { const s = HL.getState(); const g = (s.grades || []).slice(-10).reverse(); consoleBox.innerHTML = g.length ? g.map(x => `• ${x.date} — ${x.subject} ${x.type} = ${x.score} (${x.phase})`).join("<br>") : "—"; }
    renderList();

    return { open() { overlay.style.display = "block"; if (typeof render === 'function') render(); } };
  }
  function ensureBtn() { const panel = document.getElementById("hl-controls"); if (!panel) return; if (document.getElementById("hl-btn-examday")) return; const btn = document.createElement("button"); btn.id = "hl-btn-examday"; btn.textContent = "Exam-day"; HL.addToolButton(btn); const modal = buildModal(); btn.onclick = () => modal.open(); }
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
