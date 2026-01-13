// hl/garden.js — Habit Garden 2.0 (6 luống + weather + tưới theo nhiệm vụ)
(function () {
    function ensureGarden(state) {
        state.garden = state.garden && typeof state.garden === "object" ? state.garden : {};
        const g = state.garden;

        // migrate old rewardedDates -> awarded map
        g.awarded = g.awarded && typeof g.awarded === "object" ? g.awarded : {};
        if (Array.isArray(g.rewardedDates) && g.rewardedDates.length) {
            g.rewardedDates.forEach(d => {
                if (!g.awarded[d]) g.awarded[d] = { "1": true, "2": true, "3": true }; // old = 3 plots
            });
            delete g.rewardedDates;
        }

        const basePlots = [
            { id: 1, key: "sleep_rhythm", name: "Ngủ & thức", level: 1, exp: 0 },
            { id: 2, key: "morning_light", name: "Ánh sáng buổi sáng", level: 1, exp: 0 },
            { id: 3, key: "evening_screen", name: "Màn hình buổi tối", level: 1, exp: 0 },
            { id: 4, key: "study_plan", name: "Học thông minh", level: 1, exp: 0 },
            { id: 5, key: "movement", name: "Vận động/giãn cơ", level: 1, exp: 0 },
            { id: 6, key: "weekend_anchor", name: "Weekend Anchor", level: 1, exp: 0 }
        ];

        if (!Array.isArray(g.plots) || g.plots.length < 6) {
            const old = Array.isArray(g.plots) ? g.plots : [];
            g.plots = basePlots.map(bp => {
                const found = old.find(x => x && Number(x.id) === bp.id);
                return found ? Object.assign({}, bp, { level: found.level || 1, exp: found.exp || 0 }) : bp;
            });
        } else {
            // normalize
            g.plots = g.plots.map((p, i) => {
                const bp = basePlots[i] || p;
                return Object.assign({}, bp, {
                    id: Number(p.id || bp.id),
                    key: p.key || bp.key,
                    name: p.name || bp.name,
                    level: p.level || 1,
                    exp: p.exp || 0
                });
            });
        }

        if (typeof g.unlocked !== "boolean") g.unlocked = false;
        return g;
    }

    function getLogByDate(state, date) {
        return (state.logs || []).find(x => x && x.date === date);
    }
    function getPlannerByDate(state, date) {
        return (state.planner_log || []).find(x => x && x.date === date);
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

    function computeWeather(state) {
        try {
            if (!(window.SJL && typeof SJL.computeWindow === "function")) return "—";
            const today = new Date().toISOString().slice(0, 10);
            const win = SJL.computeWindow(today, state.logs || []);
            if (!win || !win.hasData) return "—";
            const sjl = win.SJL;
            if (sjl >= 120) return "⛈️ Bão lệch nhịp";
            if (sjl >= 60) return "☁️ Âm u";
            return "☀️ Nắng ổn định";
        } catch (e) {
            return "—";
        }
    }

    function awardPlot(garden, date, plotId) {
        garden.awarded[date] = garden.awarded[date] || {};
        const pid = String(plotId);

        // đã thưởng plot này trong ngày rồi thì thôi
        if (garden.awarded[date][pid]) return;

        const plot = (garden.plots || []).find(p => String(p.id) === pid);
        if (!plot) return;

        const maxExpPerLevel = 7;
        plot.exp = (plot.exp || 0) + 1;
        plot.level = plot.level || 1;

        if (plot.exp >= maxExpPerLevel) {
            plot.level += 1;
            plot.exp = 0;
        }

        garden.awarded[date][pid] = true;
    }

    function awardForDate(state, date) {
        const garden = ensureGarden(state);

        const days = getStreakDaysWithBonus(state);
        garden.unlocked = days >= 9;
        if (!garden.unlocked) return;

        const log = getLogByDate(state, date);
        const plan = getPlannerByDate(state, date);
        const tasks = new Set((plan && Array.isArray(plan.tasks)) ? plan.tasks : []);

        const hasLog = !!(log && log.bed && log.wake);
        const isFree = !!(log && (log.kind || "work") === "free");

        // Plot 1: Ngủ & thức (log hoặc tick task)
        if (hasLog || tasks.has("sleep_rhythm")) awardPlot(garden, date, 1);

        // Plot 2-5: theo tick planner
        if (tasks.has("morning_light")) awardPlot(garden, date, 2);
        if (tasks.has("evening_screen")) awardPlot(garden, date, 3);
        if (tasks.has("study_plan")) awardPlot(garden, date, 4);
        if (tasks.has("movement")) awardPlot(garden, date, 5);

        // Plot 6: Weekend Anchor
        let okAnchor = false;
        if (tasks.has("weekend_anchor")) okAnchor = true;
        else if (isFree && hasLog && state.settings && state.settings.target_wake) {
            const tgt = hmToMin(state.settings.target_wake);
            const w = hmToMin(log.wake);
            if (tgt != null && w != null && minDiff(w, tgt) <= 120) okAnchor = true;
        }
        if (okAnchor) awardPlot(garden, date, 6);
    }

    // Hook: logger/planner gọi vào để tưới
    function onLogSaved(state, date) {
        try { awardForDate(state, date); } catch (e) { }
    }
    function onPlannerSaved(state, date) {
        try { awardForDate(state, date); } catch (e) { }
    }

    function getSummary() {
        const s = HL.getState();
        const garden = ensureGarden(s);
        const days = getStreakDaysWithBonus(s);
        garden.unlocked = days >= 9;

        return {
            unlocked: garden.unlocked,
            streakDays: days,
            plots: garden.plots,
            rewardedCount: Object.keys(garden.awarded || {}).length,
            weather: computeWeather(s)
        };
    }

    function setPlantLevelClass(el, level) {
        if (!el) return;
        const lvl = level || 1;
        const baseClasses = el.className.split(/\s+/).filter(c => c && !/^hl-garden-level-/.test(c));
        baseClasses.push("hl-garden-level-" + lvl);
        el.className = baseClasses.join(" ");
    }

    function renderToRoot() {
        const root = document.getElementById("hl-garden-root");
        if (!root) return;

        const summary = getSummary();

        const lockedEl = document.getElementById("hl-garden-locked");
        const mainEl = document.getElementById("hl-garden-main");

        if (!summary.unlocked) {
            if (lockedEl) {
                lockedEl.classList.remove("d-none");
                const sLocked = document.getElementById("hl-garden-streak-locked");
                if (sLocked) sLocked.textContent = String(summary.streakDays || 0);
            }
            if (mainEl) mainEl.classList.add("d-none");
            return;
        }

        if (lockedEl) lockedEl.classList.add("d-none");
        if (mainEl) mainEl.classList.remove("d-none");

        const sStreak = document.getElementById("hl-garden-streak");
        const sReward = document.getElementById("hl-garden-rewarded");
        const sWeather = document.getElementById("hl-garden-weather");

        if (sStreak) sStreak.textContent = String(summary.streakDays || 0);
        if (sReward) sReward.textContent = String(summary.rewardedCount || 0);
        if (sWeather) sWeather.textContent = summary.weather || "—";

        // 6 plots
        (summary.plots || []).forEach((p) => {
            const i = p.id;
            const nameEl = document.getElementById("hl-garden-name-" + i);
            const progEl = document.getElementById("hl-garden-progress-" + i);
            const plantEl = document.getElementById("hl-garden-plant-" + i);

            if (nameEl) nameEl.textContent = p.name || ("Plant #" + i);
            if (progEl) {
                const lvl = p.level || 1;
                const exp = p.exp || 0;
                progEl.textContent = "Level " + lvl + " • " + exp + "/7 lần tưới tới level tiếp theo";
            }
            setPlantLevelClass(plantEl, p.level);
        });
    }

    window.HL = window.HL || {};
    HL.garden = { onLogSaved, onPlannerSaved, getSummary, renderToRoot };

    window.addEventListener("DOMContentLoaded", () => {
        function tryRender() {
            const root = document.getElementById("hl-garden-root");
            if (!root) return;

            if (!window.HL || typeof HL.getState !== "function") {
                setTimeout(tryRender, 100);
                return;
            }
            try { renderToRoot(); } catch (err) { console.error("Habit Garden render error:", err); }
        }
        tryRender();
    });
})();
