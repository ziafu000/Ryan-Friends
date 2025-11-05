
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "style" && typeof v === "object") Object.assign(e.style, v); else if (k === "class") e.className = v; else e.setAttribute(k, v); });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (typeof c === "string") e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
    return e;
  }
  function buildModal() {
    const overlay = el("div", { id: "datalab-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
    const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(720px,96vw)", padding: "16px" } });
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
      el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "Data Lab — ΔSJL / ΔPSQI — Paired t & dz"),
      el("button", { id: "datalab-close", class: "btn btn-outline-secondary" }, "Đóng")
    ]);
    const contentDiv = el("div", {});
    box.append(header, contentDiv);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("datalab-close").onclick = () => overlay.style.display = "none";

    const modalContent = document.querySelector("#datalab-overlay .card").lastChild;
    const wrap = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } });

    const left = el("div", { class: "card", style: { padding: "12px" } });
    left.append(el("div", { style: { fontWeight: "700", marginBottom: "6px" } }, "Dataset (JSON)"));
    const txt = el("textarea", { id: "hl_dl_txt", placeholder: `[{"id":"S01","pre":7,"post":5}]`, style: { width: "100%", height: "220px" } });
    const btnRun = el("button", { id: "hl_dl_run", class: "btn btn-primary", style: { marginTop: "8px" } }, "Chạy phân tích");
    const note = el("div", { style: { fontSize: "12px", color: "#6b7280", marginTop: "6px" } }, "Nếu dữ liệu ít/không chuẩn → đọc Wilcoxon mô tả.");
    left.append(txt, btnRun, note);

    const right = el("div", { class: "card", style: { padding: "12px" } });
    right.append(el("div", { style: { fontWeight: "700", marginBottom: "6px" } }, "Kết quả"));
    const res = el("div", { id: "hl_dl_res", style: { fontSize: "13px" } }, "—");
    const btnExp = el("button", { id: "hl_dl_exp", class: "btn btn-outline-secondary", style: { marginTop: "8px" } }, "Export JSON kết quả");
    right.append(res, btnExp);

    wrap.append(left, right); modalContent.append(wrap);

    function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
    function sd(a) { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); }
    function randInt(n) { return Math.floor(Math.random() * n); }
    function bootstrapCI(diff, B = 1000, alpha = 0.05) { const n = diff.length; const means = []; for (let b = 0; b < B; b++) { const samp = new Array(n); for (let i = 0; i < n; i++) { samp[i] = diff[randInt(n)]; } means.push(mean(samp)); } means.sort((a, b) => a - b); const lo = means[Math.floor(alpha / 2 * B)], hi = means[Math.floor((1 - alpha / 2) * B)]; return { lo, hi }; }
    function approxP_t(t, df) { return 2 * 0.3989422804 * Math.exp(-0.5 * Math.pow(Math.abs(t), 2)); }

    document.getElementById("hl_dl_run").onclick = () => {
      let data = []; try { data = JSON.parse(txt.value || "[]"); } catch (e) { alert("JSON không hợp lệ."); return; }
      const pairs = data.map(d => ({ id: d.id || "", pre: Number(d.pre), post: Number(d.post) })).filter(d => !Number.isNaN(d.pre) && !Number.isNaN(d.post));
      if (!pairs.length) { res.textContent = "Không có cặp pre/post hợp lệ."; return; }
      const diff = pairs.map(d => d.post - d.pre);
      const n = diff.length, m = mean(diff), s = sd(diff), t = m / (s / Math.sqrt(n)), dz = m / s, ci = bootstrapCI(diff, 1000, 0.05), p = approxP_t(t, n - 1);
      const out = { n, mean_diff: m, sd_diff: s, t_stat: t, p_approx: p, cohen_dz: dz, ci95: { lo: ci.lo, hi: ci.hi } };
      res.innerHTML = `n=${n}<br>Δ(mean)=${m.toFixed(3)}<br>sd(diff)=${s.toFixed(3)}<br>t=${t.toFixed(3)}, p≈${p.toExponential(2)}<br>dz=${dz.toFixed(3)}<br>95% CI [${ci.lo.toFixed(3)}, ${ci.hi.toFixed(3)}]`;
      res.dataset.json = JSON.stringify(out, null, 2);
    };
    document.getElementById("hl_dl_exp").onclick = () => {
      const json = document.getElementById("hl_dl_res").dataset.json || "{}";
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "hl_datalab_results.json"; a.click(); URL.revokeObjectURL(url);
    };

    return { open() { overlay.style.display = "block"; if (typeof render === 'function') render(); } };
  }
  function ensureBtn() { const panel = document.getElementById("hl-controls"); if (!panel) return; if (document.getElementById("hl-btn-datalab")) return; const btn = document.createElement("button"); btn.id = "hl-btn-datalab"; btn.textContent = "Data"; HL.addToolButton(btn); const modal = buildModal(); btn.onclick = () => modal.open(); }
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
