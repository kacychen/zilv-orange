const { getRecentDays, getShortDate } = require('../../utils/date');

Page({
  data: {
    period: 'week',
    weekDays: [],
    weekCalories: [],
    calorieTarget: 1800,
    avgCalories: 0,
    totalDays: 0,
    goalDays: 0,
    goalRate: 0,
    hasCalData: false,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    proteinPercent: 0,
    carbsPercent: 0,
    fatPercent: 0,
    hasTodayNutrient: false
  },

  onShow() {
    this.loadData();
  },

  switchPeriod(e) {
    const period = e.currentTarget.dataset.period;
    if (period === this.data.period) return;
    this.setData({ period }, () => {
      this.loadData();
    });
  },

  loadData() {
    const app = getApp();
    const target = app.globalData.userInfo
      ? (app.globalData.userInfo.daily_calorie_target || 1800)
      : 1800;
    this.setData({ calorieTarget: target });

    const n = this.data.period === 'week' ? 7 : 30;
    const days = getRecentDays(n);

    const db = wx.cloud.database();
    const _ = db.command;
    db.collection('meal_records')
      .where({ date: _.in(days) })
      .get()
      .then(res => {
        // 按日期汇总卡路里
        const calMap = {};
        res.data.forEach(r => {
          if (!calMap[r.date]) calMap[r.date] = 0;
          calMap[r.date] += (r.calories || 0);
        });

        // 构造与原来格式兼容的 summaryMap（供 drawBarChart 使用）
        const summaryMap = {};
        days.forEach(d => {
          if (calMap[d]) {
            summaryMap[d] = {
              total_calories: calMap[d],
              goal_reached: calMap[d] >= target
            };
          }
        });

        const weekDays = days.map(d => getShortDate(d));
        const weekCalories = days.map(d => calMap[d] || 0);
        const goalDays = days.filter(d => (calMap[d] || 0) >= target).length;
        const totalDays = weekCalories.filter(c => c > 0).length;
        const totalCal = weekCalories.reduce((a, b) => a + b, 0);
        const avgCalories = totalDays > 0 ? Math.round(totalCal / totalDays) : 0;
        const goalRate = totalDays > 0 ? Math.round(goalDays / totalDays * 100) : 0;
        const hasCalData = weekCalories.some(c => c > 0);

        const period = this.data.period;
        this.setData(
          { weekDays, weekCalories, goalDays, totalDays, avgCalories, goalRate, hasCalData },
          () => {
            if (!hasCalData) return;
            if (period === 'week') {
              this.drawLineChart(weekCalories, target);
            } else {
              this.drawBarChart(weekCalories, days, summaryMap, target);
            }
          }
        );

        this.loadTodayNutrients();
      })
      .catch(() => {
        const n2 = this.data.period === 'week' ? 7 : 30;
        const weekDays = getRecentDays(n2).map(d => getShortDate(d));
        this.setData({ weekDays, weekCalories: new Array(n2).fill(0), hasCalData: false });
      });
  },

  loadTodayNutrients() {
    const today = getRecentDays(1)[0];
    const db = wx.cloud.database();
    db.collection('meal_records')
      .where({ date: today })
      .get()
      .then(res => {
        const records = res.data;
        const totalProtein = parseFloat(
          records.reduce((s, r) => s + (r.protein || 0), 0).toFixed(1)
        );
        const totalCarbs = parseFloat(
          records.reduce((s, r) => s + (r.carbs || 0), 0).toFixed(1)
        );
        const totalFat = parseFloat(
          records.reduce((s, r) => s + (r.fat || 0), 0).toFixed(1)
        );

        const total = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
        const hasTodayNutrient = total > 0;
        const proteinPercent = hasTodayNutrient
          ? Math.round(totalProtein * 4 / total * 100) : 0;
        const carbsPercent = hasTodayNutrient
          ? Math.round(totalCarbs * 4 / total * 100) : 0;
        const fatPercent = hasTodayNutrient
          ? Math.round(totalFat * 9 / total * 100) : 0;

        const pieItems = hasTodayNutrient ? [
          { name: '蛋白质', value: totalProtein * 4, color: '#FF7A00', percent: proteinPercent },
          { name: '碳水',   value: totalCarbs * 4,   color: '#4CAF50', percent: carbsPercent },
          { name: '脂肪',   value: totalFat * 9,     color: '#2196F3', percent: fatPercent }
        ] : [];

        this.setData(
          { totalProtein, totalCarbs, totalFat,
            proteinPercent, carbsPercent, fatPercent, hasTodayNutrient },
          () => {
            if (hasTodayNutrient) this.drawPieChart(pieItems);
          }
        );
      })
      .catch(() => {
        console.error('加载今日营养素失败');
      });
  },

  drawLineChart(calories, target) {
    const query = this.createSelectorQuery();
    query.select('#lineChart')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const W = res[0].width;
        const H = res[0].height;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const padLeft = 50, padRight = 20, padTop = 20, padBottom = 40;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;

        ctx.clearRect(0, 0, W, H);

        const maxVal = Math.max(...calories, target) * 1.2 || 2200;

        // 背景网格 + Y轴标签
        ctx.strokeStyle = '#F0F0F0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = padTop + chartH - (chartH * i / 4);
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(padLeft + chartW, y);
          ctx.stroke();
          ctx.fillStyle = '#BDBDBD';
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(Math.round(maxVal * i / 4), padLeft - 6, y + 5);
        }

        // 目标线（虚线）
        const targetY = padTop + chartH - (target / maxVal) * chartH;
        ctx.strokeStyle = '#FFCCAA';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, targetY);
        ctx.lineTo(padLeft + chartW, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 折线点坐标
        const len = calories.length;
        const points = calories.map((c, i) => ({
          x: padLeft + (len > 1 ? (i / (len - 1)) * chartW : chartW / 2),
          y: padTop + chartH - (c / maxVal) * chartH
        }));

        // 填充面积
        ctx.beginPath();
        ctx.moveTo(points[0].x, padTop + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[len - 1].x, padTop + chartH);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
        gradient.addColorStop(0, 'rgba(255,122,0,0.25)');
        gradient.addColorStop(1, 'rgba(255,122,0,0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 折线
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = '#FF7A00';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // 数据点
        points.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = calories[i] > 0 ? '#FF7A00' : '#E0E0E0';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        // X轴标签
        const weekDays = this.data.weekDays;
        ctx.fillStyle = '#BDBDBD';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        points.forEach((p, i) => {
          ctx.fillText(weekDays[i] || '', p.x, H - 8);
        });
      });
  },

  drawBarChart(calories, days, summaryMap, target) {
    const query = this.createSelectorQuery();
    query.select('#barChart')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const W = res[0].width;
        const H = res[0].height;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const padLeft = 50, padRight = 10, padTop = 20, padBottom = 40;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;
        const n = calories.length;

        ctx.clearRect(0, 0, W, H);

        const maxVal = Math.max(...calories, target) * 1.2 || 2200;

        // 背景网格 + Y轴标签
        ctx.strokeStyle = '#F0F0F0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = padTop + chartH - (chartH * i / 4);
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(padLeft + chartW, y);
          ctx.stroke();
          ctx.fillStyle = '#BDBDBD';
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(Math.round(maxVal * i / 4), padLeft - 6, y + 5);
        }

        // 目标线（虚线）
        const targetY = padTop + chartH - (target / maxVal) * chartH;
        ctx.strokeStyle = '#FFCCAA';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, targetY);
        ctx.lineTo(padLeft + chartW, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 柱子
        const gap = chartW / n;
        const barW = Math.max(4, gap * 0.6);
        calories.forEach((c, i) => {
          const barH = (c / maxVal) * chartH;
          const x = padLeft + gap * i + (gap - barW) / 2;
          const y = padTop + chartH - barH;
          const reached = summaryMap[days[i]] && summaryMap[days[i]].goal_reached;
          ctx.fillStyle = c > 0 ? (reached ? '#FF7A00' : '#FFCCAA') : '#F5F5F5';
          ctx.beginPath();
          if (ctx.roundRect && barH > 0) {
            ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
          } else {
            ctx.rect(x, y, barW, Math.max(barH, 1));
          }
          ctx.fill();
        });

        // X轴标签：每5天显示一次，最后一天也显示
        const weekDays = this.data.weekDays;
        ctx.fillStyle = '#BDBDBD';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        calories.forEach((_, i) => {
          if (i % 5 === 0 || i === n - 1) {
            const x = padLeft + gap * i + gap / 2;
            ctx.fillText(weekDays[i] || '', x, H - 8);
          }
        });
      });
  },

  drawPieChart(pieItems) {
    const query = this.createSelectorQuery();
    query.select('#pieChart')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const W = res[0].width;
        const H = res[0].height;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, W, H);

        const cx = W / 2;
        const cy = H / 2;
        const radius = Math.min(W, H) / 2 - 10;
        const innerRadius = radius * 0.55;
        const total = pieItems.reduce((s, item) => s + item.value, 0);

        let startAngle = -Math.PI / 2;
        pieItems.forEach(item => {
          const slice = (item.value / total) * Math.PI * 2;
          const endAngle = startAngle + slice;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = item.color;
          ctx.fill();
          startAngle = endAngle;
        });

        // 内圆挖空（甜甜圈效果）
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });
  }
});
