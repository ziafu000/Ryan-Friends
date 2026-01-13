// hl/whatif.js — What-if Simulator (shift earlier)
(function () {
    function el(tag, attrs = {}, children = []) {
        const e = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (k === "style" && v && typeof v === "object") Object.assign(e.style, v);
            else if (k === "class") e.className = v;
            else e.setAttribute(k, v);
        });
        (Array.isArray(children) ? children : [children]).forEach(c => {
            if (typeof c === "string") e.appendChild(document.createTextNode(c));
            else if (c) e.appendChild(c);
        });
        return e;
    }

    function pad(n) { return String(n).padStart(2, "0"); }
    function hmToMin(hm) { if (!hm) return null; const [h, m] = hm.split(":").map(Number); return h * 60 + m; }
    function minToHM(min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ":" + pad(min % 60); }
    function shiftHM(hm, deltaMin) {
        const m = hmToMin(hm); if (m == null) return hm;
        return minToHM(m + deltaMin);
    }

    function buildModal() {
        const overlay = el("div", {
            id: "whatif-overlay",
            style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" }
        });
        const box = el("div", {
            class: "card hl-modal-card",
            style: {
                position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                width: "min(640px,96vw)", padding: "16px"
            }
        });

        const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
            el("div", { style: { fontWeight: "900", fontSize: "18px" } }, "What-if Simulator"),
            el("button", { id: "whatif-close", class: "btn btn-outline-secondary" }, "Đóng")
        ]);

        const info = el("div", { style: { fontSize: "13px", color: "#6b7280", marginBottom: "10px" } },
            "Kéo slider để mô phỏng: nếu bạn dịch lịch ngủ/dậy sớm hơn X phút (giữ nguyên độ dài ngủ)."
        );

        const slider = el("input", { type: "range", min: "0", max: "45", step: "15", style: { width: "100%" }, id: "hl_whatif_shift" });
        const label = el("div", { id: "hl_whatif_label", style: { marginTop: "6px", fontWeight: "800" } }, "Shift: 0’");
        const out = el("div", { id: "hl_whatif_out", style: { marginTop: "10px", fontSize: "14px" } }, "—");

        box.append(header, info, slider, label, out);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById("whatif-close").onclick = () => overlay.style.display = "none";

        function compute(shift) {
            const s = HL.getState();
            const logs = s.logs || [];
            const today = new Date().toISOString().slice(0, 10);

            if (!(window.SJL && typeof SJL.computeWindow === "function")) {
                out.textContent = "Thiếu SJL engine.";
                return;
            }

            const cur = SJL.computeWindow(today, logs);
            if (!cur || !cur.hasData) {
                out.textContent = "Chưa đủ 7 ngày có bed+wake để mô phỏng.";
                return;
            }

            const simLogs = (logs || []).map(x => {
                if (!x || !x.bed || !x.wake) return x;
                return Object.assign({}, x, {
                    bed: shiftHM(x.bed, -shift),
                    wake: shiftHM(x.wake, -shift)
                });
            });

            const sim = SJL.computeWindow(today, simLogs);
            const curS = Math.round(cur.SJL);
            const simS = (sim && sim.hasData) ? Math.round(sim.SJL) : null;

            out.innerHTML = simS == null
                ? `Hiện tại: SJL_7d ≈ <b>${curS}’</b><br>Mô phỏng: —`
                : `Hiện tại: SJL_7d ≈ <b>${curS}’</b><br>Mô phỏng (shift ${shift}’): SJL_7d ≈ <b>${simS}’</b><br><small style="color:#6b7280">Mô phỏng “dịch đều lịch” để tạo WOW khi demo.</small>`;
        }

        slider.oninput = () => {
            const v = Number(slider.value);
            label.textContent = `Shift: ${v}’`;
            compute(v);
        };

        return {
            open() {
                overlay.style.display = "block";
                slider.value = "0";
                label.textContent = "Shift: 0’";
                compute(0);
            }
        };
    }

    function ensureBtn() {
        const panel = document.getElementById("hl-controls");
        if (!panel) return;
        if (document.getElementById("hl-btn-whatif")) return;

        const btn = document.createElement("button");
        btn.id = "hl-btn-whatif";
        btn.textContent = "What-if";
        HL.addToolButton(btn);

        const modal = buildModal();
        btn.onclick = () => modal.open();
    }

    window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
