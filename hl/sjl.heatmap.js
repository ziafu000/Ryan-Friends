
// hl/sjl.heatmap.js — Heatmap 28 ngày (SJL_7d/phút) — styled
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "style" && typeof v === "object") { Object.assign(e.style, v); }
      else if (k === "class") e.className = v;
      else e.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }
  function buildModal() {
    const overlay = el("div", { id: "hl-heatmap-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
    const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(860px,96vw)", padding: "16px" } });

    const head = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
      [el("div", { style: { fontWeight: "700" } }, "SJL Heatmap — 28 ngày (SJL_7d/phút)"),
      el("button", { id: "hl-heatmap-close", class: "btn btn-outline-secondary" }, "Đóng")
      ]
    );

    const legend = el("div", { style: { display: "flex", gap: "10px", fontSize: "12px", marginBottom: "8px", alignItems: "center" } }, [
      el("span", { style: { background: "#16a34a", width: "14px", height: "14px", display: "inline-block", borderRadius: "3px" } }),
      el("span", {}, "≤30’"),
      el("span", { style: { background: "#22d3ee", width: "14px", height: "14px", display: "inline-block", borderRadius: "3px" } }),
      el("span", {}, "31–60’"),
      el("span", { style: { background: "#f59e0b", width: "14px", height: "14px", display: "inline-block", borderRadius: "3px" } }),
      el("span", {}, "61–120’"),
      el("span", { style: { background: "#ef4444", width: "14px", height: "14px", display: "inline-block", borderRadius: "3px" } }),
      el("span", {}, ">120’"),
      el("span", { style: { background: "#1f2937", width: "14px", height: "14px", display: "inline-block", borderRadius: "3px" } }),
      el("span", {}, "no data")
    ]);

    const grid = el("div", { id: "hl-heatmap-grid", style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" } });
    const info = el("div", { id: "hl-heatmap-info", style: { fontSize: "12px", color: "#6b7280", marginTop: "8px" } });

    box.append(head, legend, grid, info);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById("hl-heatmap-close").onclick = () => overlay.style.display = "none";

    function render() {
      // chốt end = hôm nay local để tránh lệch UTC
      const now = new Date();
      const endYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const items = (window.SJL && SJL.series && SJL.series(28, { end: endYMD })) || [];

      grid.innerHTML = "";
      const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (const w of weekdays) grid.appendChild(el("div", { style: { textAlign: "center", fontSize: "11px", color: "#6b7280" } }, w));
      items.forEach(obj => {
        const color = obj.hasData ? (obj.color || "#1f2937") : "#1f2937";
        const sjlMin = obj.hasData ? (obj.SJL | 0) : null;
        const cell = el("div", {
          class: "card",
          style: { width: "100%", aspectRatio: "1 / 1", background: color, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#0b1220", fontWeight: "700" }
        }, sjlMin == null ? "" : String(Math.round(sjlMin)));
        cell.title = obj.date + (sjlMin == null ? " — no data" : (" — SJL_7d: " + sjlMin + "'"));
        grid.appendChild(cell);
      });

      const last = items[items.length - 1] || {};
      const txt = last.hasData
        ? (`Đến ngày (${last.date}): MSW=${SJL.minToHM(last.MSW)}, MSF=${SJL.minToHM(last.MSF)}, SJL=${Math.round(last.SJL)}’`)
        : (`Đến ngày (${last.date || "—"}): thiếu dữ liệu (cần ≥1 ngày Work & ≥1 ngày Free trong 7 ngày).`);
      info.textContent = txt;
    }
    return { open() { overlay.style.display = "block"; render(); } };
  }

  function ensureButtons() {
    const panel = document.getElementById("hl-controls"); if (!panel) return;
    if (document.getElementById("hl-btn-heatmap")) return;
    const btn = document.createElement("button");
    btn.id = "hl-btn-heatmap"; btn.textContent = "Heatmap";
    HL.addToolButton(btn);
    const modal = buildModal();
    btn.onclick = () => modal.open();
  }

  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureButtons, 170));
})();

// === SJL.series (local-date inclusive) + helpers ===
(function () {
  window.SJL = window.SJL || {};

  function todayLocalDate() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate()); // strip time to local midnight
  }
  function ymdLocal(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }
  function addDays(d, k) { const t = new Date(d); t.setDate(t.getDate() + k); return t; }

  function hmToMin(hm) { if (!hm) return null; const [H, M] = hm.split(':').map(Number); return ((H * 60 + M) % 1440 + 1440) % 1440; }
  function durAcrossMidnight(bedMin, wakeMin) { let d = wakeMin - bedMin; if (d <= 0) d += 1440; return d; }
  function midSleepHM(bed, wake) {
    const b = hmToMin(bed), w = hmToMin(wake);
    if (b == null || w == null) return null;
    const mid = (b + Math.floor(durAcrossMidnight(b, w) / 2)) % 1440;
    const H = String(Math.floor(mid / 60)).padStart(2, '0'), M = String(mid % 60).padStart(2, '0');
    return `${H}:${M}`;
  }
  function avgMin(arr) { if (!arr.length) return null; const s = arr.reduce((a, b) => a + b, 0); return s / arr.length; }

  // public helper (used by heatmap footer)
  SJL.minToHM = function (min) {
    if (min == null || isNaN(min)) return "";
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    const H = String(Math.floor(m / 60)).padStart(2, '0');
    const M = String(m % 60).padStart(2, '0');
    return `${H}:${M}`;
  };


  // Compute MSW/MSF/SDW/SDF/MSFsc/SJL on a 7-day window ending at dateStr (YYYY-MM-DD)
  function compute7dFor(dateStr, logsByDate) {
    // window: dateStr -6 ... dateStr
    const [y, m, d] = dateStr.split('-').map(Number);
    const end = new Date(y, m - 1, d);
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(ymdLocal(addDays(end, -i)));

    const msWork = [], msFree = [], durWork = [], durFree = [];

    for (const di of days) {
      const recs = logsByDate.get(di) || [];
      // dùng bản ghi đầu tiên hợp lệ của ngày
      for (const r of recs) {
        const ms = midSleepHM(r.bed, r.wake);
        if (!ms) continue;
        const msMin = hmToMin(ms);
        const b = hmToMin(r.bed), w = hmToMin(r.wake);
        const du = (b != null && w != null) ? durAcrossMidnight(b, w) : null;
        if (r.kind === 'work') {
          msWork.push(msMin);
          if (du != null) durWork.push(du);
        } else if (r.kind === 'free') {
          msFree.push(msMin);
          if (du != null) durFree.push(du);
        }
        break; // 1 log/ngày là đủ
      }
    }

    const MSW = avgMin(msWork), MSF = avgMin(msFree);
    const SDW = avgMin(durWork), SDF = avgMin(durFree);

    let MSFsc = null, SJL = null;
    if (MSW != null && MSF != null) {
      const corr = (SDF != null && SDW != null) ? Math.max(0, SDF - SDW) / 2 : 0;
      MSFsc = MSF - corr;
      // khoảng cách tuần hoàn 24h → rút gọn về [0..720]
      const diff = Math.abs(MSFsc - MSW) % 1440;
      SJL = diff > 720 ? 1440 - diff : diff;
    }

    const hasData = (MSW != null && (MSF != null || MSFsc != null));
    return { MSW, MSF, SDW, SDF, MSFsc, SJL, hasData };
  }

  function colorOf(sjlMin) {
    if (sjlMin == null) return "#1f2937";           // no data
    if (sjlMin <= 30) return "#16a34a";          // ≤30'
    if (sjlMin <= 60) return "#22d3ee";          // 31–60'
    if (sjlMin <= 120) return "#f59e0b";          // 61–120'
    return "#ef4444";                              // >120'
  }

  // === Override/define SJL.series ===
  // days: count (default 28); opts.end: string "YYYY-MM-DD" or Date — inclusive
  SJL.series = function (days = 28, opts = {}) {
    const endD = (() => {
      if (opts && opts.end) {
        if (opts.end instanceof Date) return new Date(opts.end.getFullYear(), opts.end.getMonth(), opts.end.getDate());
        // assume YYYY-MM-DD
        const [y, m, d] = String(opts.end).split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      return todayLocalDate();
    })();

    const startD = addDays(endD, -(days - 1));
    // Build a quick index of logs by date string
    const st = (window.HL && HL.getState) ? HL.getState() : JSON.parse(localStorage.getItem("hl_v1_state") || "null");
    const logs = Array.isArray(st?.logs) ? st.logs : [];
    const normLogs = logs.map(r => ({
      date: r.date || "",
      kind: (r.kind ? String(r.kind).toLowerCase() :
        (r.day_type ? (String(r.day_type).toLowerCase().startsWith('w') ? 'work' : 'free') : "")),
      bed: r.bed || r.sleep_at || "",
      wake: r.wake || r.wake_at || "",
      note: r.note || ""
    })).filter(r => r.date && (r.kind === 'work' || r.kind === 'free') && r.bed && r.wake);

    const byDate = new Map();
    for (const r of normLogs) {
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date).push(r);
    }

    const out = [];
    for (let d = new Date(startD); d <= endD; d = addDays(d, 1)) {
      const ymd = ymdLocal(d);
      const win = compute7dFor(ymd, byDate);
      out.push({
        date: ymd,
        ...win,
        color: colorOf(win.SJL)
      });
    }
    return out;
  };
})();
