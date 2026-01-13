
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
    // Weekend Anchor Slider
    right.append(el("div", { style: { marginTop: "10px", fontWeight: "800" } }, "Chọn giờ dậy cuối tuần (≤ 2h)"));
    const waSlider = el("input", { id: "hl_wa_slider", type: "range", min: "0", max: "0", step: "15", style: { width: "100%" } });
    const waVal = el("div", { id: "hl_wa_slider_val", style: { fontSize: "13px", color: "#6b7280", marginTop: "6px" } }, "—");
    right.append(waSlider, waVal);

    grid.append(left, right);
    content.append(grid);
    // =====================
    // Planner 2.0 (Tasks + Mode + Soft streak)
    // =====================
    const TASKS = [
      { id: "sleep_rhythm", label: "Ngủ & thức", desc: "Giữ khung ngủ/dậy hợp lí (đặc biệt đừng lệch quá mạnh)." },
      { id: "evening_screen", label: "Màn hình buổi tối", desc: "Giảm màn hình 60’ trước ngủ / đổi sang hoạt động nhẹ." },
      { id: "morning_light", label: "Ánh sáng buổi sáng", desc: "Ra sáng 2–5’ sau khi dậy để kéo nhịp sinh học." },
      { id: "study_plan", label: "Học thông minh", desc: "Chốt 1 block học ngắn + ưu tiên môn chính." },
      { id: "movement", label: "Vận động/giãn cơ", desc: "5–10’ giãn cơ/đi bộ giúp ngủ sâu hơn." },
      { id: "weekend_anchor", label: "Weekend Anchor", desc: "Giữ giờ dậy cuối tuần lệch ≤2h so với ngày học." }
    ];

    const MODE_DEFAULTS = {
      normal: ["sleep_rhythm", "evening_screen", "morning_light", "study_plan"],
      exam: ["sleep_rhythm", "evening_screen", "morning_light", "study_plan"],
      recovery: ["sleep_rhythm", "evening_screen", "morning_light", "movement"]
    };

    function todayISO() { return new Date().toISOString().slice(0, 10); }
    function upsertPlanner(date, mode, tasks, source = "user") {
      const s = HL.getState();
      s.planner_log = s.planner_log || [];
      const idx = s.planner_log.findIndex(x => x.date === date);
      const rec = { date, mode, tasks: Array.from(new Set(tasks)), completedAt: new Date().toISOString(), source };
      if (idx >= 0) s.planner_log[idx] = Object.assign({}, s.planner_log[idx], rec);
      else s.planner_log.push(rec);
      HL.setState(s);

      if (HL.garden && typeof HL.garden.onPlannerSaved === "function") {
        HL.garden.onPlannerSaved(HL.getState(), date);
      }
    }

    function softStreakCount(s, dateISO) {
      // đếm số ngày có planner trong 7 ngày gần nhất
      const end = new Date(dateISO);
      const set = new Set();
      (s.planner_log || []).forEach(x => { if (x && x.date && x.completedAt) set.add(x.date); });
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(end); d.setDate(end.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        if (set.has(iso)) count++;
      }
      return count;
    }

    // UI block
    const plCard = el("div", { class: "card", style: { marginTop: "10px", padding: "12px" } });
    const plHead = el("div", { style: { fontWeight: "900", marginBottom: "8px" } }, "Planner 2.0 — Nhiệm vụ tối");
    const plRow = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } });

    const plDate = el("input", { id: "hl_pl_date", type: "date", class: "form-control" });
    plDate.value = todayISO();

    const plMode = el("select", { id: "hl_pl_mode", class: "form-control" }, [
      el("option", { value: "normal" }, "Normal"),
      el("option", { value: "exam" }, "Exam"),
      el("option", { value: "recovery" }, "Recovery")
    ]);

    plRow.append(
      el("div", {}, [el("div", { style: { fontSize: "12px", fontWeight: "700", marginBottom: "4px" } }, "Ngày"), plDate]),
      el("div", {}, [el("div", { style: { fontSize: "12px", fontWeight: "700", marginBottom: "4px" } }, "Chế độ"), plMode])
    );

    const plTasksWrap = el("div", { id: "hl_pl_tasks", style: { marginTop: "8px" } });
    const plMeta = el("div", { id: "hl_pl_meta", style: { marginTop: "8px", fontSize: "13px", color: "#6b7280" } }, "—");
    const plSave = el("button", { class: "btn btn-primary", style: { marginTop: "8px" }, id: "hl_pl_save" }, "Lưu Planner tối");

    plCard.append(plHead, plRow, plTasksWrap, plSave, plMeta);
    content.append(plCard);

    function renderPlannerUI() {
      const s = HL.getState();
      const d = plDate.value || todayISO();
      const mode = plMode.value || "normal";

      // ưu tiên gợi ý từ JITAI nếu đúng ngày
      let preset = MODE_DEFAULTS[mode] || [];
      if (s.planner_reco && s.planner_reco.date === d && Array.isArray(s.planner_reco.tasks)) {
        preset = s.planner_reco.tasks;
        if (s.planner_reco.mode) plMode.value = s.planner_reco.mode;
      }

      const exist = (s.planner_log || []).find(x => x.date === d);
      const checked = new Set(exist ? (exist.tasks || []) : preset);

      plTasksWrap.innerHTML = "";
      TASKS.forEach(t => {
        const id = "hl_task_" + t.id;
        const cb = el("input", { type: "checkbox", id, style: { marginRight: "8px" } });
        cb.checked = checked.has(t.id);

        const line = el("div", { style: { display: "flex", alignItems: "flex-start", gap: "8px", padding: "6px 0" } }, [
          cb,
          el("div", {}, [
            el("div", { style: { fontWeight: "800" } }, t.label),
            el("div", { style: { fontSize: "13px", color: "#6b7280" } }, t.desc)
          ])
        ]);
        plTasksWrap.appendChild(line);
      });

      const c = softStreakCount(s, d);
      plMeta.textContent = `Planner 7 ngày: ${c}/7 (streak mềm — không toxic).`;
    }

    plDate.onchange = renderPlannerUI;
    plMode.onchange = renderPlannerUI;

    plSave.onclick = () => {
      const d = plDate.value || todayISO();
      const mode = plMode.value || "normal";
      const tasks = [];
      TASKS.forEach(t => {
        const cb = document.getElementById("hl_task_" + t.id);
        if (cb && cb.checked) tasks.push(t.id);
      });
      upsertPlanner(d, mode, tasks, "user");
      renderPlannerUI();
      alert("Đã lưu Planner tối.");
    };

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

    function renderWeekend() {
      const s = HL.getState();
      const logs = (s.logs || []).slice().reverse();
      const set = s.settings || {};

      const tgtW = (set.target_wake || "").split(":");
      const tgt = (tgtW.length === 2) ? (Number(tgtW[0]) * 60 + Number(tgtW[1])) : null;

      if (tgt == null) {
        warn.textContent = "Chưa đặt mục tiêu dậy (target_wake).";
        waSlider.disabled = true;
        waVal.textContent = "—";
        return;
      }

      // slider range = target ± 120’
      waSlider.disabled = false;
      waSlider.min = String(tgt - 120);
      waSlider.max = String(tgt + 120);

      // default slider value = settings.weekend_wake hoặc target
      const wk = set.weekend_wake ? hmToMin(set.weekend_wake) : tgt;
      waSlider.value = String(wk);

      const latestFree = logs.find(x => (x.kind || "work") === "free" && x.wake);
      if (!latestFree) {
        warn.textContent = "Chưa có log ngày Free để so sánh.";
      } else {
        const w = hmToMin(latestFree.wake);
        const diff = minDiff(w, tgt);
        warn.textContent = diff > 60
          ? "⚠️ Cuối tuần lệch >60’ — tăng sáng buổi sáng + vận động nhẹ; bù ngủ ≤30’."
          : "Ổn: lệch ≤60’.";
      }

      const diffSel = minDiff(Number(waSlider.value), tgt);
      waVal.textContent = `Giờ dậy cuối tuần đang chọn: ${minToHM(Number(waSlider.value))} (lệch ${diffSel}’)`;
    }

    waSlider.oninput = () => {
      const s = HL.getState();
      s.settings = s.settings || {};
      s.settings.weekend_wake = minToHM(Number(waSlider.value));
      HL.setState(s);
      renderWeekend();
    };

    function render() {
      renderWeekend();
      renderPlannerUI();
    }

    return { open() { overlay.style.display = "block"; if (typeof render === 'function') render(); } };
  }
  function ensureBtn() { const panel = document.getElementById("hl-controls"); if (!panel) return; if (document.getElementById("hl-btn-planner")) return; const btn = document.createElement("button"); btn.id = "hl-btn-planner"; btn.textContent = "Planner"; HL.addToolButton(btn); const modal = buildModal(); btn.onclick = () => modal.open(); }
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
