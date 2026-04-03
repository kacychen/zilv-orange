# 分析页修复与本周/本月切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复分析页 JS/WXML/WXSS 三文件不一致导致的图表不显示和 UI 错乱，同时实现本周折线图 / 本月柱状图切换。

**Architecture:** 仅修改 analysis 页面的 3 个文件（js / wxml / wxss），不新增文件。JS 统一数据字段名，WXML 对齐 canvas ID 和所有绑定字段，WXSS 补全所有缺失 CSS 类。canvas 绘制时机通过 `setData` 回调保证 DOM 已更新。

**Tech Stack:** 微信小程序原生（WXML / WXSS / JS）、wx.cloud.database()、Canvas 2D API

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `miniprogram/pages/analysis/analysis.js` | 重写 | 数据加载、switchPeriod、三个 draw 函数、字段名全部对齐 |
| `miniprogram/pages/analysis/analysis.wxml` | 重写 | canvas ID 对齐、绑定字段对齐、空态、tab 切换 |
| `miniprogram/pages/analysis/analysis.wxss` | 重写 | 补全所有缺失 CSS 类，保留已有有效样式 |

---

### Task 1: 重写 analysis.wxml

**Files:**
- Modify: `miniprogram/pages/analysis/analysis.wxml`

**背景：** 当前 WXML 有以下错误：
- canvas ID 用的是 `calorieChart` / `nutrientPie`，JS 查询的是 `lineChart` / `pieChart`
- 绑定了 `{{proteinPercent}}`、`{{goalDays}}`、`{{goalRate}}`、`{{period}}` 等 JS 从未 setData 的字段
- `switchPeriod` 事件 JS 中不存在

- [ ] **Step 1: 完整替换 analysis.wxml**

将文件内容替换为以下完整代码：

```xml
<view class="container">

  <!-- Tab 切换 -->
  <view class="period-tabs">
    <text class="tab {{period === 'week' ? 'active' : ''}}"
          bindtap="switchPeriod" data-period="week">本周</text>
    <text class="tab {{period === 'month' ? 'active' : ''}}"
          bindtap="switchPeriod" data-period="month">本月</text>
  </view>

  <!-- 卡路里趋势 -->
  <view class="card">
    <text class="section-title">卡路里摄入趋势</text>
    <view class="chart-container">
      <block wx:if="{{hasCalData}}">
        <canvas wx:if="{{period === 'week'}}"
                type="2d" id="lineChart" class="chart-canvas"></canvas>
        <canvas wx:elif="{{period === 'month'}}"
                type="2d" id="barChart" class="chart-canvas"></canvas>
      </block>
      <view wx:else class="empty-chart">
        <text class="empty-text">暂无记录</text>
      </view>
    </view>
    <view class="chart-legend">
      <view class="legend-item">
        <view class="legend-dot" style="background:#FF7A00;"></view>
        <text class="legend-text">实际摄入</text>
      </view>
      <view class="legend-item">
        <view class="legend-dot dashed"></view>
        <text class="legend-text">目标值</text>
      </view>
    </view>
  </view>

  <!-- 今日营养素分布 -->
  <view class="card">
    <text class="section-title">今日营养素分布</text>
    <view class="pie-container">
      <canvas wx:if="{{hasTodayNutrient}}"
              type="2d" id="pieChart" class="pie-canvas"></canvas>
      <view wx:else class="empty-pie">
        <text class="empty-text">今日暂无记录</text>
      </view>
      <view class="pie-legend">
        <view class="legend-row">
          <view class="legend-dot round" style="background:#FF7A00;"></view>
          <text class="legend-label">蛋白质</text>
          <text class="legend-value text-number">{{proteinPercent}}%</text>
        </view>
        <view class="legend-row">
          <view class="legend-dot round" style="background:#4CAF50;"></view>
          <text class="legend-label">碳水</text>
          <text class="legend-value text-number">{{carbsPercent}}%</text>
        </view>
        <view class="legend-row">
          <view class="legend-dot round" style="background:#2196F3;"></view>
          <text class="legend-label">脂肪</text>
          <text class="legend-value text-number">{{fatPercent}}%</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 达标统计 -->
  <view class="card stats-card">
    <text class="section-title">达标统计</text>
    <view class="stats-grid">
      <view class="stat-item">
        <text class="stat-value text-number text-primary">{{totalDays}}</text>
        <text class="stat-label">记录天数</text>
      </view>
      <view class="stat-item">
        <text class="stat-value text-number" style="color:#4CAF50;">{{goalDays}}</text>
        <text class="stat-label">达标天数</text>
      </view>
      <view class="stat-item">
        <text class="stat-value text-number" style="color:#2196F3;">{{goalRate}}%</text>
        <text class="stat-label">达标率</text>
      </view>
      <view class="stat-item">
        <text class="stat-value text-number" style="color:#FF9800;">{{avgCalories}}</text>
        <text class="stat-label">日均摄入</text>
      </view>
    </view>
  </view>

</view>
```

- [ ] **Step 2: 验证 WXML 关键点**

在开发者工具中确认：
- Tab 区域显示「本周」「本月」两个按钮
- 卡路里图表区有 canvas（或空态文字「暂无记录」）
- 营养素区有 canvas（或空态文字「今日暂无记录」）
- 达标统计区有 4 个格子（即使数值全为 0 也能渲染）

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/analysis/analysis.wxml
git commit -m "fix: 重写 analysis.wxml，修正 canvas ID 和绑定字段"
```

---

### Task 2: 重写 analysis.wxss

**Files:**
- Modify: `miniprogram/pages/analysis/analysis.wxss`

**背景：** 当前 WXSS 缺少 `.chart-canvas`、`.pie-canvas`、`.stats-grid`、`.stat-value`、`.stat-label`、`.period-tabs`、`.tab`、`.card`、`.section-title`、`.legend-row`、`.legend-label`、`.legend-value`、`.empty-pie` 等类，导致布局错乱。

- [ ] **Step 1: 完整替换 analysis.wxss**

将文件内容替换为以下完整代码：

```css
/* ====== 页面容器 ====== */
.container {
  padding: 24rpx;
  background: #FFF3E0;
  min-height: 100vh;
}

/* ====== Tab 切换 ====== */
.period-tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 6rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #999;
  border-radius: 12rpx;
  transition: all 0.2s;
}

.tab.active {
  background: #FF7A00;
  color: #fff;
  font-weight: 600;
}

/* ====== 卡片 ====== */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
}

/* ====== 折线图 / 柱状图 canvas ====== */
.chart-container {
  width: 100%;
  height: 300rpx;
}

.chart-canvas {
  width: 100%;
  height: 300rpx;
  display: block;
}

/* ====== 图例 ====== */
.chart-legend {
  display: flex;
  gap: 30rpx;
  margin-top: 16rpx;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-dot {
  width: 24rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #E0E0E0;
}

.legend-dot.dashed {
  background: #FFCCAA;
}

.legend-dot.round {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-text {
  font-size: 24rpx;
  color: #999;
}

/* ====== 饼图 ====== */
.pie-container {
  display: flex;
  align-items: center;
  gap: 30rpx;
}

.pie-canvas {
  width: 240rpx;
  height: 240rpx;
  flex-shrink: 0;
}

.empty-pie {
  width: 240rpx;
  height: 240rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #F5F5F5;
  border-radius: 50%;
}

.pie-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.legend-label {
  flex: 1;
  font-size: 26rpx;
  color: #666;
}

.legend-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

/* ====== 空态 ====== */
.empty-chart {
  width: 100%;
  height: 300rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 26rpx;
  color: #BDBDBD;
}

/* ====== 达标统计 ====== */
.stats-grid {
  display: flex;
  flex-wrap: wrap;
}

.stat-item {
  width: 50%;
  text-align: center;
  padding: 20rpx 0;
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

/* ====== 工具类 ====== */
.text-primary {
  color: #FF7A00;
}

.text-number {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: 验证样式**

在开发者工具中确认：
- Tab 有白底卡片，选中的橙色高亮
- 图表 canvas 区域高度正常（300rpx）
- 达标统计显示 2×2 网格布局
- 饼图和图例左右排列

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/analysis/analysis.wxss
git commit -m "fix: 重写 analysis.wxss，补全所有缺失 CSS 类"
```

---

### Task 3: 重写 analysis.js

**Files:**
- Modify: `miniprogram/pages/analysis/analysis.js`

**背景：** 当前 JS 存在以下问题：
- canvas ID 查询的是 `#lineChart` / `#pieChart`（已在 Task 1 修正 WXML，此任务保持一致）
- 缺少 `period`、`hasCalData`、`hasTodayNutrient`、`proteinPercent`、`carbsPercent`、`fatPercent`、`goalDays`、`goalRate`、`totalDays` 等 data 字段
- 缺少 `switchPeriod` 方法
- 缺少 `drawBarChart` 方法（本月柱状图）
- setData 之后直接调用 draw，存在 canvas 未就绪的时序问题

修复方案：所有 draw 调用放入 `setData` 的回调中，确保 DOM 已更新。

- [ ] **Step 1: 完整替换 analysis.js**

将文件内容替换为以下完整代码：

```javascript
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
    db.collection('daily_summary')
      .where({ date: _.in(days) })
      .get()
      .then(res => {
        const summaryMap = {};
        res.data.forEach(s => { summaryMap[s.date] = s; });

        const weekDays = days.map(d => getShortDate(d));
        const weekCalories = days.map(d =>
          summaryMap[d] ? (summaryMap[d].total_calories || 0) : 0
        );
        const goalDays = days.filter(
          d => summaryMap[d] && summaryMap[d].goal_reached
        ).length;
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
          ctx.font = '20px sans-serif';
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
        ctx.font = '20px sans-serif';
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
          ctx.font = '18px sans-serif';
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
        ctx.font = '18px sans-serif';
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
```

- [ ] **Step 2: 验证核心功能**

在开发者工具模拟器中手动验证：

1. **打开分析页** → 默认显示「本周」Tab 激活，卡路里趋势区：
   - 有记录：折线图正常显示，有橙色折线和数据点
   - 无记录：显示「暂无记录」文字
2. **营养素饼图**：
   - 今日有饮食记录：显示甜甜圈饼图 + 右侧百分比
   - 今日无记录：显示「今日暂无记录」文字，百分比全为 0%
3. **达标统计**：4 个数字格子正常显示（不全为空白）
4. **点击「本月」Tab** → Tab 切换为橙色高亮，卡路里区切换为柱状图（30根柱子），再点「本周」回到折线图
5. **Console 无报错**

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/analysis/analysis.js
git commit -m "fix: 重写 analysis.js，修正字段对齐、添加 switchPeriod 和 drawBarChart"
```

---

## 自检清单

完成所有 Task 后确认：

- [ ] 分析页打开无 JS 报错
- [ ] 折线图 canvas ID `lineChart` 与 JS 查询一致
- [ ] 柱状图 canvas ID `barChart` 与 JS 查询一致
- [ ] 饼图 canvas ID `pieChart` 与 JS 查询一致
- [ ] WXML 中所有 `{{}}` 绑定字段在 JS `data` 中都有初始值
- [ ] `switchPeriod` 函数存在且切换正常
- [ ] 有数据时图表正常绘制，无数据时显示空态文字
- [ ] 达标统计 4 个格子正常布局
