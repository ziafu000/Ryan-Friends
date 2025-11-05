
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === "style" && typeof v === "object") Object.assign(e.style, v); else if (k === "class") e.className = v; else e.setAttribute(k, v); });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (typeof c === "string") e.appendChild(document.createTextNode(c)); else if (c) e.appendChild(c); });
    return e;
  }
  function buildModal() {
    const overlay = el("div", { id: "settings-overlay", style: { position: "fixed", inset: "0", background: "rgba(0,0,0,.5)", display: "none", zIndex: "10000" } });
    const box = el("div", { class: "card hl-modal-card", style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(520px,92vw)", padding: "16px" } });
    const header = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, [
      el("div", { style: { fontWeight: "800", fontSize: "18px" } }, "Settings / Onboarding"),
      el("button", { id: "settings-close", class: "btn btn-outline-secondary" }, "Đóng")
    ]);
    const contentDiv = el("div", {});
    box.append(header, contentDiv);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById("settings-close").onclick = () => overlay.style.display = "none";

    const content = contentDiv;
    const grid = el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } });
    const stuid = el("input", { id: "hl_set_id", placeholder: "Mã HS (VD: 11A1-03)" });
    const phaseA = el("input", { id: "hl_set_phaseA", type: "date" });
    const psqiPre = el("input", { id: "hl_set_psqi_pre", type: "number", min: "0", max: "21", placeholder: "PSQI Pre (0–21)" });
    const psqiPost = el("input", { id: "hl_set_psqi_post", type: "number", min: "0", max: "21", placeholder: "PSQI Post (0–21)" });
    const btnSave = el("button", { id: "hl_save_settings", class: "btn btn-primary" }, "Lưu");

    grid.append(
      el("div", {}, [el("label", {}, ["Mã HS"]), stuid]),
      el("div", {}, [el("label", {}, ["Ngày bắt đầu Pha A"]), phaseA]),
      el("div", {}, [el("label", {}, ["PSQI Pre (0–21)"]), psqiPre]),
      el("div", {}, [el("label", {}, ["PSQI Post (0–21)"]), psqiPost])
    );
    const msg = el("div", { id: "hl_set_msg", style: { fontSize: "12px", color: "#6b7280", marginTop: "6px" } });
    content.append(grid, el("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: "12px" } }, [btnSave]), msg);

    const s = HL.getState();
    stuid.value = s.profile?.id || ""; phaseA.value = s.settings?.phaseA_start || "";
    psqiPre.value = (s.settings?.psqi_pre ?? ""); psqiPost.value = (s.settings?.psqi_post ?? "");

    btnSave.onclick = () => {
      const s = HL.getState();
      s.profile = s.profile || {}; s.profile.id = stuid.value.trim();
      s.settings = s.settings || {};
      s.settings.phaseA_start = phaseA.value || null;
      s.settings.psqi_pre = psqiPre.value ? Number(psqiPre.value) : null;
      s.settings.psqi_post = psqiPost.value ? Number(psqiPost.value) : null;
      HL.setState(s);
      msg.textContent = "Đã lưu.";
    };

    return { open() { overlay.style.display = "block"; if (typeof render === 'function') render(); } };
  }
  function ensureBtn() { const panel = document.getElementById("hl-controls"); if (!panel) return; if (document.getElementById("hl-btn-settings")) return; const btn = document.createElement("button"); btn.id = "hl-btn-settings"; btn.textContent = "Settings"; HL.addToolButton(btn); const modal = buildModal(); btn.onclick = () => modal.open(); }
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBtn, 200));
})();
