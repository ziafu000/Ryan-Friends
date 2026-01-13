(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k === "class") e.className = v;
      else e.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  function hmToMin(hm) {
    if (!hm) return null;
    const [h, m] = hm.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }
  function minDiff(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, 1440 - d);
  }
  function durMin(bed, wake) {
    const b = hmToMin(bed), w = hmToMin(wake);
    if (b == null || w == null) return null;
    return (w - b + 1440) % 1440;
  }
  function daysUntil(iso) {
    if (!iso) return null;
    const a = new Date(); a.setHours(0, 0, 0, 0);
    const b = new Date(iso); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
  }

  function buildModal() {
    const overlay = el("div", {
      id: "jitai-overlay",
      style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" }
    });
    const box = el("div", {
      class: "card hl-modal-card",
      style: {
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        width: "min(720px,96vw)", padding: "16px"
      }
    });

    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
      el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "JITAI — Nudge / Plan / Reset"),
      el("button", { id: "jitai-close", class: "btn btn-outline-secondary" }, "Đóng")
    ]);

    const content = el("div", {});
    box.append(header, content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("jitai-close").onclick = () => overlay.style.display = "none";

    const banner = el("div", { class: "card", style: { padding: "12px", fontWeight: "800", marginBottom: "8px" } }, "—");
    const evidence = el("div", { style: { fontSize: "13px", color: "#6b7280" } }, "—");

    // Actions (đây là phần 3C)
    const btnApply = el("button", { id: "hl_jitai_apply", class: "btn btn-primary btn-sm" }, "Đổ vào Planner");
    const btnOpenPlanner = el("button", { id: "hl_jitai_open_planner", class: "btn btn-outline-secondary btn-sm" }, "Mở Planner");
    const actions = el("div", { style: { display: "flex", gap: "8px", margin: "10px 0" } }, [btnApply, btnOpenPlanner]);

    const history = el("div", {
      style: {
        marginTop: "8px", fontSize: "12px", color: "#6b7280",
        maxHeight: "180px", overflow: "auto", borderTop: "1px dashed rgba(0,0,0,0.12)", paddingTop: "6px"
      }
    }, "—");

    content.append(banner, evidence, actions, history);

    let currentPolicy = null;

    function logExposure(state, policy) {
      state.intervention_log = state.intervention_log || [];
      const key = `${policy.date}_${policy.commandId}`;
      if (!state.intervention_log.some(x => x && x.key === key)) {
        state.intervention_log.unshift({
          key,
          date: policy.date,
          level: policy.level,
          commandId: policy.commandId,
          type: policy.type,
          ctx: policy.ctx || {},
          viewedAt: new Date().toISOString(),
          applied: false
        });
        state.intervention_log = state.intervention_log.slice(0, 200);
      }
    }

    function evaluate() {
      const s = HL.getState();
      s.nudges = s.nudges || [];
      s.intervention_log = s.intervention_log || [];

      const today = new Date().toISOString().slice(0, 10);
      const logs = s.logs || [];
      const set = s.settings || {};

      // SJL window
      const win = (window.SJL && typeof SJL.computeWindow === "function")
        ? SJL.computeWindow(today, logs)
        : { hasData: false };

      // target wake
      const tgt = hmToMin(set.target_wake);

      // red streak: wake lệch liên tiếp
      let redStreak = 0;
      if (tgt != null) {
        const recent = logs.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
        for (const x of recent) {
          if (!x || !x.wake) continue;
          const w = hmToMin(x.wake);
          const kind = (x.kind || "work");
          const thr = (kind === "work") ? 30 : 60;
          if (w != null && minDiff(w, tgt) > thr) redStreak++;
          else break;
          if (redStreak >= 5) break;
        }
      }

      // sleep debt (so với target duration hoặc 8h)
      let targetDur = 480;
      if (set.target_sleep && set.target_wake) {
        const d = durMin(set.target_sleep, set.target_wake);
        if (d != null) targetDur = d;
      }
      let sleepDebt = 0;
      const window7 = logs
        .filter(x => x && x.date && x.bed && x.wake)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 7);
      window7.forEach(x => {
        const d = durMin(x.bed, x.wake);
        if (d != null) sleepDebt += Math.max(0, targetDur - d);
      });

      // near exam (đọc từ settings.exam_event do examday.js set)
      const examDays = (set.exam_event && set.exam_event.date) ? daysUntil(set.exam_event.date) : null;
      const nearExam = (examDays != null && examDays >= 0 && examDays <= 2);

      // Type A/B/C (giữ logic cũ)
      let type = null;
      if (win && win.hasData && win.SJL >= 60) type = "A";
      else {
        const lastWork = logs.slice().reverse().find(x => (x.kind || "work") === "work" && x.wake);
        if (lastWork && tgt != null) {
          const dev = minDiff(hmToMin(lastWork.wake), tgt);
          if (dev > 30) type = "B";
        }
        const lastFree = logs.slice().reverse().find(x => (x.kind || "free") === "free" && x.wake);
        if (!type && lastFree && tgt != null) {
          const devF = minDiff(hmToMin(lastFree.wake), tgt);
          if (devF > 60) type = "C";
        }
      }

      // Nếu không có đủ dữ liệu → ổn định
      if (!type) {
        currentPolicy = null;
        banner.textContent = "Ổn định — tiếp tục duy trì. (Chưa có trigger mạnh)";
        evidence.textContent = "";
        history.innerHTML = (s.intervention_log || []).slice(0, 6).map(x => `• ${x.date} — ${x.level} — ${x.commandId}${x.applied ? " ✅" : ""}`).join("<br>") || "—";
        return;
      }

      // ===== Policy level: NUDGE / PLAN / RESET =====
      let level = "NUDGE";
      if (nearExam) level = "PLAN";
      if (win && win.hasData && win.SJL >= 120) level = "RESET";
      if (sleepDebt >= 240 || redStreak >= 3) level = "RESET";
      else if ((win && win.hasData && win.SJL >= 60) || sleepDebt >= 120 || redStreak >= 2) level = "PLAN";

      // commandId + tasks + mode
      const mode = (level === "RESET") ? "recovery" : (nearExam ? "exam" : "normal");
      const cmd = (level === "RESET")
        ? { commandId: "RESET_24H", title: "RESET 24–48h", tip: "Hạ nhịp: ngủ sớm hơn + sáng kéo nhịp + vận động nhẹ.", tasks: ["sleep_rhythm", "evening_screen", "morning_light", "movement"] }
        : (level === "PLAN")
          ? { commandId: "PLAN_SHIFT15", title: "PLAN", tip: "Kéo dần 15’ + chốt Planner tối để ổn định 7 ngày.", tasks: ["sleep_rhythm", "evening_screen", "morning_light", "study_plan"] }
          : { commandId: "NUDGE_TODAY", title: "NUDGE", tip: "Một việc nhỏ hôm nay: sáng ra ánh sáng + tối giảm màn hình.", tasks: ["morning_light", "evening_screen"] };

      currentPolicy = {
        date: today,
        level, type,
        mode,
        commandId: cmd.commandId,
        tasks: cmd.tasks,
        ctx: {
          SJL: (win && win.hasData) ? (win.SJL | 0) : null,
          sleepDebt,
          redStreak,
          nearExam
        }
      };

      // UI
      banner.textContent = `[${cmd.title}] ${cmd.tip}`;
      const sjlText = (win && win.hasData) ? `SJL_7d ≈ ${Math.round(win.SJL)}’` : "SJL_7d: thiếu data";
      evidence.textContent = `Type ${type} • ${sjlText} • SleepDebt ${sleepDebt}’ • RedStreak ${redStreak}` + (nearExam ? " • Gần thi" : "");

      // log exposure
      logExposure(s, currentPolicy);
      HL.setState(s);

      // history
      const hist = (HL.getState().intervention_log || []).slice(0, 6)
        .map(x => `• ${x.date} — ${x.level} — ${x.commandId}${x.applied ? " ✅" : ""}`)
        .join("<br>");
      history.innerHTML = hist || "—";
    }

    // ====== 3C: NỐI NÚT ======
    btnOpenPlanner.onclick = () => {
      const btn = document.getElementById("hl-btn-planner");
      if (btn) btn.click();
      else alert("Không thấy nút Planner (hl-btn-planner). Kiểm tra đã load hl/planner.js chưa.");
    };

    btnApply.onclick = () => {
      if (!currentPolicy) evaluate();
      if (!currentPolicy) return;

      const s = HL.getState();
      s.planner_reco = {
        date: currentPolicy.date,
        mode: currentPolicy.mode,
        tasks: currentPolicy.tasks,
        from: "jitai",
        commandId: currentPolicy.commandId
      };

      // mark applied
      s.intervention_log = s.intervention_log || [];
      const key = `${currentPolicy.date}_${currentPolicy.commandId}`;
      const it = s.intervention_log.find(x => x && x.key === key);
      if (it) { it.applied = true; it.appliedAt = new Date().toISOString(); }

      HL.setState(s);

      const btn = document.getElementById("hl-btn-planner");
      if (btn) btn.click();
      else alert("Đã đổ task vào state, nhưng không tìm thấy nút Planner để mở.");
    };

    function render() { evaluate(); }

    return {
      open() {
        overlay.style.display = "block";
        if (typeof render === "function") render();
      }
    };
  }

  function ensureBtn() {
    const panel = document.getElementById("hl-controls");
    if (!panel) return;
    if (document.getElementById("hl-btn-jitai")) return;

    const btn = document.createElement("button");
    btn.id = "hl-btn-jitai";
    btn.textContent = "JITAI";
    HL.addToolButton(btn);

    const modal = buildModal();
    btn.onclick = () => modal.open();
  }

  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
