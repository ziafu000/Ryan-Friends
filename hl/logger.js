
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "style" && typeof v === "object") Object.assign(e.style, v); else if (k === "class") e.className = v; else e.setAttribute(k, v); });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (typeof c === "string") e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
    return e;
  }
  function buildModal() {
    const overlay = el("div", { id: "logger-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
    const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(720px,96vw)", padding: "16px" } });
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
      el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "Logger — Bedtime/Wake 60s"),
      el("button", { id: "logger-close", class: "btn btn-outline-secondary" }, "Đóng")
    ]);
    const contentDiv = el("div", {});
    box.append(header, contentDiv);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("logger-close").onclick = () => overlay.style.display = "none";

    const content = contentDiv;
    const row1 = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" } });
    const inDate = el("input", { type: "date", id: "hl_log_date" }); inDate.value = new Date().toISOString().slice(0, 10);
    const selKind = el("select", { id: "hl_log_kind" }, [el("option", { value: "work" }, "Work"), el("option", { value: "free" }, "Free")]);
    const inBed = el("input", { type: "time", id: "hl_log_bed" });
    const inWake = el("input", { type: "time", id: "hl_log_wake" });
    row1.append(el("div", {}, [el("label", {}, ["Ngày"]), inDate]), el("div", {}, [el("label", {}, ["Loại ngày"]), selKind]), el("div", {}, [el("label", {}, ["Ngủ"]), inBed]), el("div", {}, [el("label", {}, ["Dậy"]), inWake]));
    const row2 = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "8px" } });
    const note = el("input", { id: "hl_log_note", placeholder: "Ghi chú" });
    const kss = el("input", { id: "hl_log_kss", type: "number", min: "1", max: "9", placeholder: "KSS 1–9", style: { width: "100px" } });
    const quick = el("div", {}, [
      el("button", { id: "hl_now_bed", class: "btn btn-outline-secondary", style: { marginRight: "6px" } }, "Bed = Now"),
      el("button", { id: "hl_now_wake", class: "btn btn-outline-secondary" }, "Wake = Now")
    ]);
    row2.append(el("div", {}, [el("label", {}, ["Ghi chú"]), note]), el("div", {}, [el("label", {}, ["KSS"]), kss]), el("div", {}, [el("label", {}, ["Nút nhanh"]), quick]));
    const actions = el("div", { style: { display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "12px" } });
    const btnSave = el("button", { id: "hl_save_log", class: "btn btn-primary" }, "Lưu (≤60s)");
    actions.append(btnSave);
    const msg = el("div", { id: "hl_log_msg", style: { fontSize: "12px", color: "#6b7280", marginTop: "6px" } });
    content.append(row1, row2, actions, msg);

    function nowHM() { const d = new Date(); const h = String(d.getHours()).padStart(2, "0"); const m = String(d.getMinutes()).padStart(2, "0"); return h + ":" + m; }
    document.getElementById("hl_now_bed").onclick = () => inBed.value = nowHM();
    document.getElementById("hl_now_wake").onclick = () => inWake.value = nowHM();

    function parseISO(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
    function isoAddDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
    function hasBoth(rec) { return rec && rec.bed && rec.wake; }
    function recomputeStreaks(state) {
      const logs = (state.logs || []).filter(x => hasBoth(x)).map(x => x.date).sort();
      if (logs.length === 0) { state.streaks = { days: 0, lastDate: null }; return; }
      let last = logs[logs.length - 1]; let days = 1;
      for (let i = logs.length - 2; i >= 0; i--) { if (logs[i] === isoAddDays(last, -1)) { days++; last = logs[i]; } else break; }
      state.streaks = { days, lastDate: logs[logs.length - 1] };
    }

    document.getElementById("hl_save_log").onclick = () => {
      const s = HL.getState();
      const rec = { date: inDate.value || new Date().toISOString().slice(0, 10), kind: selKind.value, bed: inBed.value || null, wake: inWake.value || null, note: note.value || "" };
      if (!rec.bed && !rec.wake) { msg.textContent = "Cần nhập ít nhất giờ ngủ hoặc giờ dậy."; return; }
      const ix = (s.logs || []).findIndex(x => x.date === rec.date);
      if (ix >= 0) s.logs[ix] = { ...s.logs[ix], ...rec }; else { s.logs = s.logs || []; s.logs.push(rec); }
      const k = Number(kss.value);
      if (k >= 1 && k <= 9) { const kix = (s.kss || []).findIndex(x => x.date === rec.date); if (kix >= 0) s.kss[kix] = { date: rec.date, score: k }; else { s.kss = s.kss || []; s.kss.push({ date: rec.date, score: k }); } }
      recomputeStreaks(s); HL.setState(s);
      msg.textContent = "Đã lưu log. Streak: " + (s.streaks?.days || 0) + " ngày.";
    };

    return { open() { overlay.style.display = "block"; if (typeof render === 'function') render(); } };
  }
  function ensureBtn() { const panel = document.getElementById("hl-controls"); if (!panel) return; if (document.getElementById("hl-btn-logger")) return; const btn = document.createElement("button"); btn.id = "hl-btn-logger"; btn.textContent = "Logger"; HL.addToolButton(btn); const modal = buildModal(); btn.onclick = () => modal.open(); }
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
