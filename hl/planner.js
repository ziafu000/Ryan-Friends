
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "style" && typeof v === "object") Object.assign(e.style, v); else if (k === "class") e.className = v; else e.setAttribute(k, v); });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (typeof c === "string") e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
    return e;
  }
  function buildModal() {
    const overlay = el("div", { id: "planner-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
    const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(720px,96vw)", padding: "16px" } });
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
      el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "Planner 15’/đêm + Weekend Anchor"),
      el("button", { id: "planner-close", class: "btn btn-outline-secondary" }, "Đóng")
    ]);
    const contentDiv = el("div", {});
    box.append(header, contentDiv);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("planner-close").onclick = () => overlay.style.display = "none";

    const content = document.querySelector("#planner-overlay .card").lastChild;
    const grid = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } });
    function pad(n) { return String(n).padStart(2, "0"); }
    function hmToMin(hm) { if (!hm) return null; const [h, m] = hm.split(":").map(Number); return h * 60 + m; }
    function minToHM(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ":" + pad(min % 60); }

    // Build a plan of times over `days`.
    // Heuristic: if target hour looks like a wake time (04:00-13:00), keep wake fixed to the user's target.
    // Otherwise treat as bedtime plan: move current time earlier/later toward target by `step` each day.
    function buildPlan(currentHM, targetHM, days = 7, step = -15) {
      const plan = [];
      let cur = hmToMin(currentHM), tgt = hmToMin(targetHM);
      if (cur == null || tgt == null) return [];

      const tgtHour = Number(targetHM.split(":")[0]);
      // If this looks like a wake target, preserve it every day (user wants wake unchanged)
      if (tgtHour >= 4 && tgtHour <= 13) {
      for (let i = 0; i < days; i++) plan.push(minToHM(tgt));
      return plan;
      }

      // Otherwise adjust toward target. For negative step we move earlier (reduce minutes),
      // but never overshoot the target in that direction.
      for (let i = 0; i < days; i++) {
      if (step < 0) {
        // minutes to move earlier to reach target along same-day backward direction
        const delta = (cur - tgt + 1440) % 1440;
        const move = Math.min(-step, delta);
        cur = (cur - move + 1440) % 1440;
      } else if (step > 0) {
        const delta = (tgt - cur + 1440) % 1440;
        const move = Math.min(step, delta);
        cur = (cur + move) % 1440;
      }
      plan.push(minToHM(cur));
      }
      return plan;
    }
    function downloadICS(events, filename = "planner.ics") {
      const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HarmonyLoop//Planner//VN"];
      const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\\.\\d{3}Z$/, "Z");
      events.forEach((ev, i) => { lines.push("BEGIN:VEVENT"); lines.push("UID:HL-" + now + "-" + i + "@harmony.loop"); if (ev.DTSTART) lines.push("DTSTART:" + ev.DTSTART); lines.push("DTSTAMP:" + now); if (ev.SUMMARY) lines.push("SUMMARY:" + ev.SUMMARY); if (ev.RRULE) lines.push("RRULE:" + ev.RRULE); lines.push("END:VEVENT"); });
      lines.push("END:VCALENDAR");
      const blob = new Blob([lines.join("\\r\\n")], { type: "text/calendar" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    }

    const left = el("div", { class: "card", style: { padding: "12px" } });
    left.append(el("div", { style: { fontWeight: "700", marginBottom: "6px" } }, "Planner 7 ngày (-15’/đêm)"));
    const s = HL.getState();
    const curSleep = el("input", { type: "time", id: "hl_pl_cur_sleep" }); curSleep.value = s.logs?.slice(-1)?.[0]?.bed || "";
    const curWake = el("input", { type: "time", id: "hl_pl_cur_wake" }); curWake.value = s.logs?.slice(-1)?.[0]?.wake || "";
    const tgtSleep = el("input", { type: "time", id: "hl_pl_tgt_sleep" }); tgtSleep.value = s.settings?.target_sleep || "";
    const tgtWake = el("input", { type: "time", id: "hl_pl_tgt_wake" }); tgtWake.value = s.settings?.target_wake || "";
    const btnPlan = el("button", { id: "hl_pl_make", class: "btn btn-primary", style: { marginTop: "8px" } }, "Sinh lộ trình");
    const list = el("ol", { id: "hl_pl_list", style: { marginTop: "8px", paddingLeft: "18px" } });
    const btnICS = el("button", { id: "hl_pl_ics", class: "btn btn-outline-secondary", style: { marginTop: "8px" } }, ".ics báo thức mẫu");
    left.append(el("div", {}, [el("label", {}, ["Ngủ hiện tại"]), curSleep]), el("div", {}, [el("label", {}, ["Dậy hiện tại"]), curWake]), el("div", {}, [el("label", {}, ["Mục tiêu ngủ"]), tgtSleep]), el("div", {}, [el("label", {}, ["Mục tiêu dậy"]), tgtWake]), btnPlan, list, btnICS);

    const right = el("div", { class: "card", style: { padding: "12px" } });
    right.append(el("div", { style: { fontWeight: "700", marginBottom: "6px" } }, "Weekend Anchor"));
    const info = el("div", { id: "hl_wa_info", style: { fontSize: "13px", color: "#6b7280" } }, "Cảnh báo lệch >60’ ngày Free; gợi ý bù ≤30’.");
    const warn = el("div", { id: "hl_wa_warn", style: { marginTop: "6px", fontWeight: "700" } }, "—");
    right.append(info, warn);

    grid.append(left, right);
    content.append(grid);

    btnPlan.onclick = () => {
      const curS = curSleep.value, curW = curWake.value, tgtS = tgtSleep.value, tgtW = tgtWake.value;
      if (!curS && !curW) { alert("Nhập ít nhất giờ ngủ hoặc dậy hiện tại."); return; }
      if (!tgtS && !tgtW) { alert("Nhập mục tiêu ngủ/dậy."); return; }
      const pS = curS && tgtS ? buildPlan(curS, tgtS, 7, -15) : [];
      const pW = curW && tgtW ? buildPlan(curW, tgtW, 7, -15) : [];
      list.innerHTML = ""; for (let i = 0; i < 7; i++) { const li = el("li", {}, `${i + 1}) Ngủ: ${pS[i] || "—"} • Dậy: ${pW[i] || "—"}`); list.appendChild(li); }
      const st = HL.getState(); st.settings = st.settings || {}; if (tgtS) st.settings.target_sleep = tgtS; if (tgtW) st.settings.target_wake = tgtW; HL.setState(st);
    };

    btnICS.onclick = () => {
      const st = HL.getState(); const set = st.settings || {};
      const today = new Date(); const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      function toDTSTART(hm) { if (!hm) return null; const [H, M] = hm.split(":").map(Number); const d = new Date(base.getTime()); d.setHours(H, M, 0, 0); return d.toISOString().replace(/[-:]/g, "").replace(/\\.\\d{3}Z$/, "Z"); }
      const evs = []; if (set.target_sleep) evs.push({ SUMMARY: "HL — Bedtime", DTSTART: toDTSTART(set.target_sleep), RRULE: "FREQ=DAILY" }); if (set.target_wake) evs.push({ SUMMARY: "HL — Wake", DTSTART: toDTSTART(set.target_wake), RRULE: "FREQ=DAILY" });
      if (!evs.length) { alert("Chưa có mục tiêu ngủ/dậy."); return; } downloadICS(evs, "hl_planner_reminders.ics");
    };

    (function renderWeekend() {
      const s = HL.getState(); const logs = (s.logs || []).slice().reverse();
      const set = s.settings || {}; const tgtW = (set.target_wake || "").split(":"); const tgt = (tgtW.length === 2) ? (Number(tgtW[0]) * 60 + Number(tgtW[1])) : null;
      const latestFree = logs.find(x => (x.kind || "work") === "free" && x.wake);
      if (!latestFree) { warn.textContent = "Chưa có log ngày Free để so sánh."; return; }
      if (tgt == null) { warn.textContent = "Chưa đặt mục tiêu dậy (target_wake)."; return; }
      const w = (x => { const [H, M] = x.split(":").map(Number); return H * 60 + M; })(latestFree.wake);
      const diff = Math.min(Math.abs(w - tgt), 1440 - Math.abs(w - tgt));
      warn.textContent = diff > 60 ? "⚠️ Cuối tuần lệch >60’ — tăng sáng buổi sáng + vận động nhẹ; bù ngủ ≤30’." : "Ổn: lệch ≤60’.";
    })();

    return { open() { overlay.style.display = "block"; if (typeof render === 'function') render(); } };
  }
  function ensureBtn() { const panel = document.getElementById("hl-controls"); if (!panel) return; if (document.getElementById("hl-btn-planner")) return; const btn = document.createElement("button"); btn.id = "hl-btn-planner"; btn.textContent = "Planner"; HL.addToolButton(btn); const modal = buildModal(); btn.onclick = () => modal.open(); }
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
