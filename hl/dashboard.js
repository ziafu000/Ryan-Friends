// hl/dashboard.js — Dashboard (SJL/PSQI/Grades) with CSS classes
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
    function avg(a) { return (a && a.length) ? a.reduce((x, y) => x + y, 0) / a.length : null; }

    // UPDATED: drawBarChart now shows exactly 2 columns:
    // A = điểm 15 phút, B = điểm 1 tiết
    function drawBarChart(canvas, data) {
        const ctx = canvas.getContext("2d");
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);

        // axes
        ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(40, H - 30); ctx.lineTo(W - 10, H - 30); ctx.stroke();

        const maxVal = 10;
        const bw = 80, gap = 60;
        const startX = 80;
        const colors = { A: "#ff6a00", B: "#ffd166" };

        ctx.font = "12px Quicksand, system-ui, Segoe UI, Roboto, Arial"; ctx.fillStyle = "#6b7280";
        ctx.fillText("0", 20, H - 30); ctx.fillText(String(maxVal), 12, 14);

        // compute heights (handle null -> 0 but mark with "—")
        const valA = data.A != null ? data.A : null;
        const valB = data.B != null ? data.B : null;
        const hA = valA != null ? (valA / maxVal) * (H - 50) : 0;
        const hB = valB != null ? (valB / maxVal) * (H - 50) : 0;

        // A bar
        let x = startX;
        ctx.fillStyle = colors.A;
        if (valA != null) ctx.fillRect(x, (H - 30) - hA, bw, hA);
        else {
            // draw empty placeholder outline
            ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.strokeRect(x, 20, bw, H - 50);
            ctx.strokeStyle = "rgba(0,0,0,0.12)";
        }
        ctx.fillStyle = "#111827"; ctx.textAlign = "center";
        ctx.fillText("A (15p)", x + bw / 2, H - 10);
        ctx.fillText(valA != null ? Math.round(valA * 10) / 10 : "—", x + bw / 2, (H - 30) - hA - 6);

        // B bar
        x += bw + gap;
        ctx.fillStyle = colors.B;
        if (valB != null) ctx.fillRect(x, (H - 30) - hB, bw, hB);
        else {
            ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.strokeRect(x, 20, bw, H - 50);
            ctx.strokeStyle = "rgba(0,0,0,0.12)";
        }
        ctx.fillStyle = "#111827";
        ctx.fillText("B (1 tiết)", x + bw / 2, H - 10);
        ctx.fillText(valB != null ? Math.round(valB * 10) / 10 : "—", x + bw / 2, (H - 30) - hB - 6);

        // legend (optional)
        ctx.textAlign = "left";
        ctx.fillStyle = colors.A; ctx.fillRect(W - 200, 12, 10, 10);
        ctx.fillStyle = "#111827"; ctx.fillText("A = 15 phút", W - 184, 21);
        ctx.fillStyle = colors.B; ctx.fillRect(W - 200, 28, 10, 10);
        ctx.fillStyle = "#111827"; ctx.fillText("B = 1 tiết", W - 184, 37);
    }

    function buildModal() {
        const overlay = el("div", { id: "hl-dash-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
        const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(860px,96vw)", padding: "16px" } });
        const header = el("div", { class: "row", style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
            el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "Dashboard — SJL / PSQI / Điểm"),
            el("div", {}, [
                el("button", { id: "hl-dash-heatmap", class: "btn btn-outline-secondary", style: { marginRight: "6px" } }, "Open Heatmap"),
                el("button", { id: "hl-dash-close", class: "btn btn-outline-secondary" }, "Đóng")
            ])
        ]);
        const grid = el("div", { class: "row", style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" } });
        const cardSJL = el("div", { class: "card", style: { padding: "12px" } }, [
            el("div", { style: { fontWeight: "700" } }, "SJL_7d (phút)"),
            el("div", { id: "hl-card-sjl", style: { fontSize: "28px", fontWeight: "800", marginTop: "4px" } }, "—")
        ]);
        const cardMS = el("div", { class: "card", style: { padding: "12px" } }, [
            el("div", { style: { fontWeight: "700" } }, "MSW / MSF / MSFsc"),
            el("div", { id: "hl-card-ms", style: { fontSize: "16px", fontWeight: "700", marginTop: "4px" } }, "—")
        ]);
        const cardPSQI = el("div", { class: "card", style: { padding: "12px" } }, [
            el("div", { style: { fontWeight: "700" } }, "PSQI (Pre → Post)"),
            el("div", { id: "hl-card-psqi", style: { fontSize: "20px", fontWeight: "800", marginTop: "4px" } }, "—")
        ]);
        grid.append(cardSJL, cardMS, cardPSQI);

        const scoreWrap = el("div", { class: "card", style: { padding: "12px" } });
        const scoreTitle = el("div", { style: { fontWeight: "700", marginBottom: "6px" } }, "Điểm A vs B");
        const canvas = el("canvas", { id: "hl-dash-canvas", width: "760", height: "260", style: { width: "100%", height: "260px", background: "#fff", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: "8px" } });
        scoreWrap.append(scoreTitle, canvas);

        box.append(header, grid, scoreWrap);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById("hl-dash-close").onclick = () => overlay.style.display = "none";
        document.getElementById("hl-dash-heatmap").onclick = () => { const b = document.getElementById("hl-btn-heatmap"); if (b) b.click(); };

        function render() {
            const s = HL.getState();
            const logs = s.logs || [];

            // find the most recent date present in logs (robust to different field names/formats)
            function extractISOFromValue(v) {
            if (!v && v !== 0) return null;
            if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
            if (typeof v === "number" && v > 1e8) { // possibly a timestamp (ms)
                const d = new Date(v);
                if (!isNaN(d)) return d.toISOString().slice(0, 10);
            }
            if (typeof v === "string") {
                // prefer explicit YYYY-MM-DD
                const m = v.match(/(\d{4}-\d{2}-\d{2})/);
                if (m) return m[1];
                const t = Date.parse(v);
                if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
            }
            return null;
            }

            let latestISO = null;
            for (const log of logs) {
            if (log && typeof log === "object") {
                // common date-like keys
                const keys = ["date", "day", "iso", "d", "start", "startDate", "timestamp", "ts"];
                for (const k of keys) {
                if (k in log) {
                    const iso = extractISOFromValue(log[k]);
                    if (iso && (!latestISO || iso > latestISO)) latestISO = iso;
                }
                }
                // also scan all values as fallback
                for (const v of Object.values(log)) {
                const iso = extractISOFromValue(v);
                if (iso && (!latestISO || iso > latestISO)) latestISO = iso;
                }
            } else {
                const iso = extractISOFromValue(log);
                if (iso && (!latestISO || iso > latestISO)) latestISO = iso;
            }
            }

            const refISO = latestISO || new Date().toISOString().slice(0, 10);
            const win = (window.SJL && SJL.computeWindow) ? SJL.computeWindow(refISO, logs) : { hasData: false };

            const sjlEl = document.getElementById("hl-card-sjl");
            if (win.hasData) { sjlEl.textContent = Math.round(win.SJL) + "’"; sjlEl.style.color = win.color || "#111827"; }
            else { sjlEl.textContent = "— (thiếu Work/Free 7d)"; sjlEl.style.color = "#6b7280"; }

            const msEl = document.getElementById("hl-card-ms");
            msEl.textContent = win.hasData ? (`MSW ${SJL.minToHM(win.MSW)} • MSF ${SJL.minToHM(win.MSF)} • MSFsc ${SJL.minToHM(win.MSFsc)}`) : "—";

            const p = s.settings || {}; const pre = p.psqi_pre != null ? p.psqi_pre : "—"; const post = p.psqi_post != null ? p.psqi_post : "—";
            document.getElementById("hl-card-psqi").textContent = pre + " → " + post;

            const g = s.grades || [];
            // UPDATED: A = điểm 15 phút, B = điểm 1 tiết (tất cả các loại không phải "15p")
            const avg15 = avg(g.filter(x => x.type === "15p").map(x => x.score));
            const avg1t = avg(g.filter(x => x.type !== "15p").map(x => x.score));
            drawBarChart(canvas, { A: avg15, B: avg1t });
        }
        return { open() { overlay.style.display = "block"; render(); } };
    }

    function ensureButtons() {
        const panel = document.getElementById("hl-controls"); if (!panel) return;
        if (document.getElementById("hl-btn-dashboard")) return;
        const btn = document.createElement("button");
        btn.id = "hl-btn-dashboard"; btn.textContent = "Dashboard";
        HL.addToolButton(btn);
        const modal = buildModal();
        btn.onclick = () => modal.open();
    }

    window.addEventListener("DOMContentLoaded", () => setTimeout(ensureButtons, 200));
})();
