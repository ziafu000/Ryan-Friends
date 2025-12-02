// hl/garden.js — Habit Garden logic (hybrid: HTML sẵn trong garden.html)
(function () {
    function ensureGarden(state) {
        if (!state.garden) {
            state.garden = {
                unlocked: false,
                rewardedDates: [],
                plots: [
                    { id: 1, name: "Sleep Rhythm Tree", level: 1, exp: 0 },
                    { id: 2, name: "Morning Energy Sprout", level: 1, exp: 0 },
                    { id: 3, name: "Weekend Anchor Flower", level: 1, exp: 0 }
                ]
            };
        } else {
            if (!Array.isArray(state.garden.plots)) {
                state.garden.plots = [
                    { id: 1, name: "Sleep Rhythm Tree", level: 1, exp: 0 },
                    { id: 2, name: "Morning Energy Sprout", level: 1, exp: 0 },
                    { id: 3, name: "Weekend Anchor Flower", level: 1, exp: 0 }
                ];
            }
            if (!Array.isArray(state.garden.rewardedDates)) {
                state.garden.rewardedDates = [];
            }
            if (typeof state.garden.unlocked !== "boolean") {
                state.garden.unlocked = false;
            }
        }
        return state.garden;
    }

    function getLogByDate(state, date) {
        return (state.logs || []).find(x => x.date === date);
    }

    // streak = core (logger) + bonus từ localStorage 'hl_streak'
    function getStreakDaysWithBonus(state) {
        const base = (state.streaks && state.streaks.days) || 0;
        let bonus = 0;
        try {
            const raw = localStorage.getItem("hl_streak");
            if (raw != null) {
                const n = parseInt(raw, 10);
                if (!Number.isNaN(n)) bonus = n;
            }
        } catch (e) { }
        return base + bonus;
    }

    // Gọi từ logger.js sau khi lưu log & cập nhật streaks
    function onLogSaved(state, date) {
        const garden = ensureGarden(state);

        const rec = getLogByDate(state, date);
        if (!rec || !rec.bed || !rec.wake) return; // chỉ tưới khi có cả giờ ngủ & dậy

        // Chỉ tưới khi tổng streak (core + bonus) đủ ngưỡng mở
        const isUnlocked = getStreakDaysWithBonus(state) >= 9;
        if (!isUnlocked) return;

        // Mỗi ngày chỉ thưởng 1 lần
        if (!garden.rewardedDates.includes(date)) {
            garden.rewardedDates.push(date);

            const maxExpPerLevel = 7; // 7 lần tưới = lên 1 level
            garden.plots.forEach(p => {
                p.exp = (p.exp || 0) + 1;
                if (!p.level) p.level = 1;
                if (p.exp >= maxExpPerLevel) {
                    p.level += 1;
                    p.exp = 0;
                }
            });
        }
    }

    // Lấy dữ liệu hiển thị cho garden.html
    function getSummary() {
        const s = HL.getState();
        const garden = ensureGarden(s);
        const days = getStreakDaysWithBonus(s);
        const unlocked = days >= 9;

        // Optional: sync lại vào state cho thống nhất, nhưng UI chỉ dùng biến unlocked này
        garden.unlocked = unlocked;

        return {
            unlocked,
            streakDays: days,
            plots: garden.plots,
            rewardedCount: garden.rewardedDates.length
        };
    }

    // Helper: set class level cho plant, giữ lại class cũ khác
    function setPlantLevelClass(el, level) {
        if (!el) return;
        const lvl = level || 1;
        const baseClasses = el.className
            .split(/\s+/)
            .filter(c => c && !/^hl-garden-level-/.test(c));
        baseClasses.push("hl-garden-level-" + lvl);
        el.className = baseClasses.join(" ");
    }

    // Đồng bộ UI từ state vào HTML skeleton trong garden.html
    function renderToRoot() {
        const root = document.getElementById("hl-garden-root");
        if (!root) return;

        const summary = getSummary();

        const lockedEl = document.getElementById("hl-garden-locked");
        const mainEl = document.getElementById("hl-garden-main");

        // Nếu chưa unlock → hiện view locked
        if (!summary.unlocked) {
            if (lockedEl) {
                lockedEl.classList.remove("d-none");
                const sLocked = document.getElementById("hl-garden-streak-locked");
                if (sLocked) sLocked.textContent = String(summary.streakDays || 0);
            }
            if (mainEl) mainEl.classList.add("d-none");
            return;
        }

        // Đã unlock → hiện view main
        if (lockedEl) lockedEl.classList.add("d-none");
        if (mainEl) mainEl.classList.remove("d-none");

        // Streak & số ngày tưới
        const sStreak = document.getElementById("hl-garden-streak");
        const sReward = document.getElementById("hl-garden-rewarded");
        if (sStreak) sStreak.textContent = String(summary.streakDays || 0);
        if (sReward) sReward.textContent = String(summary.rewardedCount || 0);

        // 3 plots
        summary.plots.forEach((p, idx) => {
            const i = idx + 1; // id 1..3
            const nameEl = document.getElementById("hl-garden-name-" + i);
            const progEl = document.getElementById("hl-garden-progress-" + i);
            const plantEl = document.getElementById("hl-garden-plant-" + i);

            if (nameEl) nameEl.textContent = p.name || ("Plant #" + i);
            if (progEl) {
                const lvl = p.level || 1;
                const exp = p.exp || 0;
                progEl.textContent =
                    "Level " + lvl + " • " + exp + "/7 lần tưới tới level tiếp theo";
            }
            setPlantLevelClass(plantEl, p.level);
        });
    }

    window.HL = window.HL || {};
    HL.garden = {
        onLogSaved,
        getSummary,
        renderToRoot
    };

    // Tự render khi vào garden.html, nhưng đợi HL sẵn sàng
    window.addEventListener("DOMContentLoaded", () => {
        function tryRender() {
            const root = document.getElementById("hl-garden-root");
            if (!root) return; // không phải garden.html

            if (!window.HL || typeof HL.getState !== "function") {
                setTimeout(tryRender, 100);
                return;
            }

            try {
                renderToRoot();
            } catch (err) {
                console.error("Habit Garden render error:", err);
            }
        }

        tryRender();
    });
})();
