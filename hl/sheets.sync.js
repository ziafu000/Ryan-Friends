// hl/sheets.sync.js — Google Sheets auto-sync (Apps Script Web App)
// Auto-sync CHỈ khi Logger (logs) hoặc Exam-day (grades) thay đổi.
// Yêu cầu: đã có HL.getState/HL.setState + #hl-controls + #hl-tools-wrap.

(function () {
    // ==== LocalStorage keys ====
    const LS_URL = 'hl_sheets_url';
    const LS_TOKEN = 'hl_sheets_token';
    const LS_AUTO = 'hl_sheets_autosync';     // luôn bật
    const LS_FP = 'hl_sync_fp_v2';          // fingerprint logs+grades (v2 để tách với bản cũ)

    // ==== Cấu hình mặc định (điền sẵn URL/token nếu muốn auto-connect) ====
    const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbw8IHjPKLJtxZiwOK6d40GzAt7k5imZ6418WCFjxeScC1C5roUXfbXNX4HZ2XmQwd9c/exec';
    const DEFAULT_TOKEN = 'hl_4b_2025_s416on_hcm';

    // ---- Helpers cấu hình ----
    function ensureAutoOn() {
        if (localStorage.getItem(LS_AUTO) !== '1') localStorage.setItem(LS_AUTO, '1');
    }
    function getCfg() {
        if (DEFAULT_URL && !localStorage.getItem(LS_URL)) localStorage.setItem(LS_URL, DEFAULT_URL);
        if (DEFAULT_TOKEN && !localStorage.getItem(LS_TOKEN)) localStorage.setItem(LS_TOKEN, DEFAULT_TOKEN);
        ensureAutoOn();
        return {
            url: localStorage.getItem(LS_URL) || '',
            token: localStorage.getItem(LS_TOKEN) || '',
            auto: true // luôn ON
        };
    }

    // ---- Chuẩn hoá state & tạo fingerprint ----
    function normalizeState(s) {
        s = s || {};
        s.profile = s.profile || { id: '', created: new Date().toISOString() };
        if (!s.profile.id) s.profile.id = 'USER_' + Math.random().toString(36).slice(2, 8).toUpperCase();
        s.settings = s.settings || { phaseA_start: null, psqi_pre: null, psqi_post: null };
        s.logs = Array.isArray(s.logs) ? s.logs : [];
        s.grades = Array.isArray(s.grades) ? s.grades : [];
        s.kss = Array.isArray(s.kss) ? s.kss : [];

        // chuẩn hoá logs (map field & lowercase kind)
        s.logs = s.logs.map(r => ({
            date: r.date || '',
            kind: (r.kind ? String(r.kind).toLowerCase()
                : (r.day_type ? (String(r.day_type).toLowerCase().startsWith('w') ? 'work' : 'free') : '')),
            bed: r.bed || r.sleep_at || '',
            wake: r.wake || r.wake_at || '',
            note: r.note || ''
        }));
        return s;
    }

    // Tạo biểu diễn chuẩn cho logs & grades rồi sort ổn định → JSON string
    function canonLogs(logs) {
        const arr = logs
            .map(r => ({ d: r.date || '', k: r.kind || '', b: r.bed || '', w: r.wake || '', n: r.note || '' }));
        arr.sort((a, b) =>
            a.d.localeCompare(b.d) ||
            a.k.localeCompare(b.k) ||
            a.b.localeCompare(b.b) ||
            a.w.localeCompare(b.w) ||
            a.n.localeCompare(b.n)
        );
        return JSON.stringify(arr);
    }
    function canonGrades(grades) {
        const arr = grades
            .map(r => ({ d: r.date || '', s: r.subject || '', t: r.type || '', sc: String(r.score ?? ''), p: r.phase || '' }));
        arr.sort((a, b) =>
            a.d.localeCompare(b.d) ||
            a.s.localeCompare(b.s) ||
            a.t.localeCompare(b.t) ||
            a.sc.localeCompare(b.sc) ||
            a.p.localeCompare(b.p)
        );
        return JSON.stringify(arr);
    }
    function makeFingerprint(state) {
        return JSON.stringify({ L: canonLogs(state.logs || []), G: canonGrades(state.grades || []) });
    }
    function setFingerprintFromState(st) {
        const fp = makeFingerprint(normalizeState(st));
        localStorage.setItem(LS_FP, fp);
        return fp;
    }

    // ---- Push lên Apps Script Web App ----
    async function push(reason = 'auto') {
        const { url, token } = getCfg();
        if (!url || !token) return;

        const st = (window.HL && HL.getState) ? HL.getState() :
            JSON.parse(localStorage.getItem('hl_v1_state') || 'null');
        if (!st) return;

        // cập nhật fingerprint baseline theo state hiện tại (để lần sau so sánh)
        setFingerprintFromState(st);

        const payload = { token, state: normalizeState(st), reason, ts: new Date().toISOString() };

        try {
            // dùng no-cors để chắc chắn server nhận dù không trả CORS headers
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
            localStorage.setItem('hl_sheets_lastpush', new Date().toISOString());
        } catch (e) {
            // offline: bỏ qua, lần sau sẽ ghi đè fingerprint nếu có thay đổi mới
        }
    }

    // ---- Auto-sync chỉ khi LOGS/GRADES đổi (debounce) ----
    let debounce = null;
    function scheduleAutoSync(sourceTag) {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            try {
                const st = (window.HL && HL.getState) ? HL.getState() :
                    JSON.parse(localStorage.getItem('hl_v1_state') || 'null');
                if (!st) return;
                const ns = normalizeState(st);
                const fpN = makeFingerprint(ns);
                const fpO = localStorage.getItem(LS_FP) || '';
                if (fpN !== fpO) {
                    localStorage.setItem(LS_FP, fpN);
                    push('change:' + sourceTag);
                }
            } catch (_) { }
        }, 700); // debounce nhẹ để gom các thao tác liên tiếp
    }

    // Hook setState để bắt thay đổi từ Logger/Exam
    function hookSetState() {
        if (!window.HL || !HL.setState) { setTimeout(hookSetState, 300); return; }
        const _set = HL.setState.bind(HL);
        HL.setState = function (s) {
            _set(s);
            // kiểm tra thay đổi logs/grades rồi mới push
            scheduleAutoSync('setState');
        };
    }

    // === Nút chính "Push data to admin" — nằm trên thanh control ngang (ngoài Tools) ===
    function placeMainButton() {
        function doPlace() {
            const panel = document.getElementById('hl-controls');
            if (!panel) return false;
            if (document.getElementById('hl-btn-gs-push')) return true;

            const btn = document.createElement('button');
            btn.id = 'hl-btn-gs-push';
            btn.className = 'btn btn-outline-secondary';
            btn.textContent = 'Push data to admin';
            btn.onclick = () => push('manual');

            const toolsWrap = document.getElementById('hl-tools-wrap');
            if (toolsWrap && toolsWrap.parentElement === panel) {
                panel.insertBefore(btn, toolsWrap);
            } else {
                panel.appendChild(btn);
            }
            return true;
        }
        if (!doPlace()) {
            if (document.readyState === 'loading') {
                window.addEventListener('DOMContentLoaded', doPlace, { once: true });
            }
            const iv = setInterval(() => { if (doPlace()) clearInterval(iv); }, 300);
        }
    }

    // === (Tuỳ chọn) nút “Kết nối Web App” đặt trong Tools ▾ — đang ẩn theo yêu cầu ===
    // function addConnectButtonToTools() { ... }

    // ---- Khởi động ----
    ensureAutoOn();
    hookSetState();
    placeMainButton();
    // Không auto-push khi vào trang; chỉ push nếu logs/grades thay đổi hoặc người dùng bấm nút.
    // Nếu muốn đẩy 1 lần khi vào trang, uncomment dòng dưới:
    // setTimeout(() => push('startup'), 600);
})();
