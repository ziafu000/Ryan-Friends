// ===== HL Tools Ordering (drop-in) =====
window.HL_ORDER = ['logger', 'planner', 'examday', 'heatmap', 'settings', 'dashboard']; // Sửa thứ tự tuỳ ý

(function () {
    const HL = window.HL || (window.HL = {});
    const origAdd = HL.addToolButton ? HL.addToolButton.bind(HL) : null;

    function keyOf(btn) {
        // Ưu tiên id: "hl-btn-logger" -> "logger"
        const id = (btn.id || '').toLowerCase();
        if (id.startsWith('hl-btn-')) return id.replace('hl-btn-', '');
        // Fallback theo chữ
        const t = (btn.textContent || btn.innerText || '').toLowerCase();
        if (t.includes('logger')) return 'logger';
        if (t.includes('dashboard') || t.includes('bảng điều khiển')) return 'dashboard';
        if (t.includes('planner') || t.includes('kế hoạch')) return 'planner';
        if (t.includes('arcade')) return 'arcade';
        if (t.includes('settings') || t.includes('cài đặt')) return 'settings';
        if (t.includes('heatmap')) return 'heatmap';
        return t;
    }
    function idx(k) { const i = (window.HL_ORDER || []).indexOf(k); return i === -1 ? 9999 : i; }

    // Chèn đúng vị trí khi thêm nút
    HL.addToolButton = function (btn) {
        btn.classList.add('btn', 'btn-outline-secondary');
        const menu = HL.getToolsMenu ? HL.getToolsMenu() : document.getElementById('hl-tools-menu');
        if (!menu) { (HL._pendingTools = HL._pendingTools || []).push(btn); return; }
        const k = keyOf(btn);
        const before = Array.from(menu.children).find(el => idx(keyOf(el)) > idx(k));
        if (before) menu.insertBefore(btn, before); else menu.appendChild(btn);
    };

    // Reorder lại các nút đã có + flush pending sau khi DOM sẵn sàng
    function reorder() {
        const menu = HL.getToolsMenu ? HL.getToolsMenu() : document.getElementById('hl-tools-menu');
        if (!menu) return;
        const arr = Array.from(menu.children).sort((a, b) => idx(keyOf(a)) - idx(keyOf(b)));
        arr.forEach(el => menu.appendChild(el));
        if (HL._pendingTools?.length) {
            const pend = HL._pendingTools.splice(0);
            pend.forEach(btn => HL.addToolButton(btn));
        }
    }
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', reorder);
    else reorder();
})();

// Gán nhóm màu cho từng nút theo ID (đổi tuỳ ý)
window.HL_STYLE = {
    // Nhóm quan trọng nhất
    'hl-btn-logger': 'hl-critical',   // Logger
    'hl-btn-planner': 'hl-critical',  // Planner
    'hl-btn-examday': 'hl-critical',
    // Nhóm chính
    'hl-btn-dashboard': 'hl-primary',
    'hl-btn-heatmap': 'hl-primary',
    // Nhóm phụ
    'hl-btn-settings': 'hl-secondary',
    // Nhóm tiện ích (ngoài menu Tools)
    'hl-btn-jitai': 'hl-utility',
    'hl-btn-datalab': 'hl-utility',
    'hl-btn-onboarding': 'hl-utility'
};

(function () {
    const map = window.HL_STYLE || {};
    function applyClass(el) {
        if (!el || !el.id) return;
        const cls = map[el.id];
        if (cls) el.classList.add(cls);
    }

    // Bọc addToolButton để gắn class khi nút được thêm vào menu
    const HL = window.HL || (window.HL = {});
    const origAdd = HL.addToolButton ? HL.addToolButton.bind(HL) : null;

    HL.addToolButton = function (btn) {
        // gọi logic gốc để đưa vào menu
        if (origAdd) { origAdd(btn); } else { (HL._pendingTools = HL._pendingTools || []).push(btn); }
        // gắn class nhóm
        applyClass(btn);
    };

    // Áp class cho các nút đã có (Export/Import/Reset/Tools) và mọi nút trong menu
    function sweep() {
        ['hl-btn-export', 'hl-btn-import', 'hl-btn-reset', 'hl-btn-tools'].forEach(id => applyClass(document.getElementById(id)));
        const menu = document.getElementById('hl-tools-menu');
        if (menu) menu.querySelectorAll('.btn').forEach(applyClass);
    }

    // Theo dõi khi có nút mới chèn vào menu (đề phòng module khác add trễ)
    const menu = document.getElementById('hl-tools-menu');
    if (menu && 'MutationObserver' in window) {
        new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => n instanceof HTMLElement && applyClass(n))))
            .observe(menu, { childList: true });
    }

    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', sweep);
    else sweep();
})();