// hl/garden.js — Habit Garden logic
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

    // Gọi từ logger.js sau khi lưu log & cập nhật streaks
    function onLogSaved(state, date) {
        const garden = ensureGarden(state);

        // Unlock khi streak >= 9 ngày
        const days = (state.streaks && state.streaks.days) || 0;
        if (days >= 9) garden.unlocked = true;

        const rec = getLogByDate(state, date);
        if (!rec || !rec.bed || !rec.wake) return;  // chỉ tưới khi có cả giờ ngủ & dậy
        if (!garden.unlocked) return;

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
        const days = (s.streaks && s.streaks.days) || 0;
        return {
            unlocked: garden.unlocked,
            streakDays: days,
            plots: garden.plots,
            rewardedCount: garden.rewardedDates.length
        };
    }

    // Render đơn giản cho #hl-garden-root trong garden.html
    function renderToRoot() {
        const root = document.getElementById("hl-garden-root");
        if (!root) return;
        const summary = getSummary();

        if (!summary.unlocked) {
            root.innerHTML = `
        <div class="hl-garden-locked">
          <p><strong>Khu vườn thói quen Ryan</strong> sẽ mở khi bạn giữ streak ít nhất 9 ngày liên tiếp.</p>
          <p>Hiện tại streak của bạn là <strong>${summary.streakDays}</strong> ngày. Hãy tiếp tục ghi Logger mỗi sáng nhé.</p>
        </div>
      `;
            return;
        }

        root.innerHTML = `
      <div class="hl-garden-header">
        <h3>Khu vườn thói quen Ryan</h3>
        <p>Mỗi ngày bạn ghi đầy đủ giờ ngủ & giờ dậy, Ryan sẽ “tưới” 1 lần cho vườn. Cây lớn lên cùng với nhịp sống đều đặn hơn.</p>
        <div class="hl-garden-submeta">
          <span>Streak hiện tại: <strong>${summary.streakDays}</strong> ngày</span>
          <span>Ngày đã tưới: <strong>${summary.rewardedCount}</strong></span>
        </div>
      </div>
      <div class="hl-garden-grid">
        ${summary.plots.map(p => `
          <div class="hl-garden-card">
            <div class="hl-garden-plant hl-garden-level-${p.level || 1}"></div>
            <div class="hl-garden-meta">
              <div class="hl-garden-name">${p.name}</div>
              <div class="hl-garden-progress">Level ${p.level || 1} • ${p.exp || 0}/7 lần tưới tới level tiếp theo</div>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="hl-garden-footer">
        <small>Mẹo: cố gắng giữ giờ ngủ – dậy gần nhau giữa ngày học & cuối tuần, SJL giảm dần thì vườn sẽ càng “xanh” hơn.</small>
      </div>
    `;
    }

    window.HL = window.HL || {};
    HL.garden = {
        onLogSaved,
        getSummary,
        renderToRoot
    };

    // Tự render khi vào garden.html
    window.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById("hl-garden-root")) {
            setTimeout(renderToRoot, 200);
        }
    });
})();
