const { getRecentDays, getShortDate } = require('../../utils/date');
const { localDB, command } = require('../../utils/localDB');

Page({
  data: {
    weekDays: [],          // 最近7天日期标签 ['3/24', '3/25', ...]
    weekCalories: [],      // 每天卡路里 [1200, 1600, ...]
    calorieTarget: 1800,
    avgCalories: 0,
    reachDays: 0,          // 达标天数
    totalDays: 7,
    // 今日营养素分布
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    // Canvas 相关
    chartWidth: 680,
    chartHeight: 300,
    pieItems: []
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const app = getApp();
    const target = app.globalData.userInfo
      ? app.globalData.userInfo.daily_calorie_target || 1800
      : 1800;
    this.setData({ calorieTarget: target });

    const days = getRecentDays(7);

    localDB.query('daily_summary', { date: command.in(days) })
      .then(res => {
        const summaryMap = {};
        res.data.forEach(s => {
          summaryMap[s.date] = s;
        });

        const weekDays = days.map(d => getShortDate(d));
        const weekCalories = days.map(d => (summaryMap[d] ? summaryMap[d].total_calories : 0));
        const reachDays = days.filter(d => summaryMap[d] && summaryMap[d].goal_reached).length;
        const totalCal = weekCalories.reduce((a, b) => a + b, 0);
        const nonZeroDays = weekCalories.filter(c => c > 0).length;
        const avgCalories = nonZeroDays > 0 ? Math.round(totalCal / nonZeroDays) : 0;

        this.setData({
          weekDays,
          weekCalories,
          reachDays,
          avgCalories
        });

        this.drawLineChart(weekCalories, target);

        // 加载今日营养素
        this.loadTodayNutrients();
      })
      .catch(() => {
        const weekDays = getRecentDays(7).map(d => getShortDate(d));
        this.setData({ weekDays, weekCalories: new Array(7).fill(0) });
      });
  },

  loadTodayNutrients() {
    const today = getRecentDays(1)[0];

    localDB.query('meal_records', { date: today })
      .then(res => {
        const records = res.data;
        const totalProtein = parseFloat(records.reduce((s, r) => s + (r.protein || 0), 0).toFixed(1));
        const totalCarbs = parseFloat(records.reduce((s, r) => s + (r.carbs || 0), 0).toFixed(1));
        const totalFat = parseFloat(records.reduce((s, r) => s + (r.fat || 0), 0).toFixed(1));

        this.setData({ totalProtein, totalCarbs, totalFat });

        const total = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
        const pieItems = total > 0 ? [
          { name: '蛋白质', value: totalProtein * 4, color: '#FF7A00', percent: Math.round(totalProtein * 4 / total * 100) },
          { name: '碳水', value: totalCarbs * 4, color: '#4CAF50', percent: Math.round(totalCarbs * 4 / total * 100) },
          { name: '脂肪', value: totalFat * 9, color: '#2196F3', percent: Math.round(totalFat * 9 / total * 100) }
        ] : [];

        this.setData({ pieItems });
        if (pieItems.length > 0) {
          this.drawPieChart(pieItems);
        }
      });
  },

  drawLineChart(calories, target) {
    const query = this.createSelectorQuery();
    query.select('#lineChart')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res || !res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const W = res[0].width;
        const H = res[0].height;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const padLeft = 50;
        const padRight = 20;
        const padTop = 20;
        const padBottom = 40;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;

        ctx.clearRect(0, 0, W, H);

        // 找最大值
        const maxVal = Math.max(...calories, target) * 1.2 || 2200;

        // 背景网格
        ctx.strokeStyle = '#F0F0F0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = padTop + chartH - (chartH * i / 4);
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(padLeft + chartW, y);
          ctx.stroke();

          // Y 轴标签
          ctx.fillStyle = '#BDBDBD';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(Math.round(maxVal * i / 4), padLeft - 6, y + 5);
        }

        // 目标线
        const targetY = padTop + chartH - (target / maxVal) * chartH;
        ctx.strokeStyle = '#FFCCAA';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, targetY);
        ctx.lineTo(padLeft + chartW, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 折线
        const points = calories.map((c, i) => ({
          x: padLeft + (i / (calories.length - 1)) * chartW,
          y: padTop + chartH - (c / maxVal) * chartH
        }));

        // 填充面积
        ctx.beginPath();
        ctx.moveTo(points[0].x, padTop + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padTop + chartH);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
        gradient.addColorStop(0, 'rgba(255,122,0,0.25)');
        gradient.addColorStop(1, 'rgba(255,122,0,0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 折线本体
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

        // X 轴标签
        const weekDays = this.data.weekDays;
        ctx.fillStyle = '#BDBDBD';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        points.forEach((p, i) => {
          ctx.fillText(weekDays[i] || '', p.x, H - 8);
        });
      });
  },

  drawPieChart(pieItems) {
    const query = this.createSelectorQuery();
    query.select('#pieChart')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res || !res[0]) return;
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
        const radius = Math.min(W, H) / 2 - 20;
        const innerRadius = radius * 0.55;

        let startAngle = -Math.PI / 2;
        const total = pieItems.reduce((s, item) => s + item.value, 0);

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

        // 内圆挖空
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });
  }
});
