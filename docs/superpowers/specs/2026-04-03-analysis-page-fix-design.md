# 分析页修复与本周/本月切换 Design Spec

**Date:** 2026-04-03
**Feature:** 修复分析页 JS/WXML/WXSS 不一致导致的无数据/UI错乱，并实现本周折线图 / 本月柱状图切换

---

## 问题根因

当前分析页存在三类严重不一致：

1. **Canvas ID 不匹配**：JS 向 `#lineChart` / `#pieChart` 绘图，WXML 定义的是 `#calorieChart` / `#nutrientPie`，图表永远画不出来
2. **数据绑定字段对不上**：WXML 用 `{{proteinPercent}}`、`{{goalDays}}`、`{{goalRate}}`、`{{period}}` 等，JS 从未 setData 这些字段
3. **函数缺失**：WXML 调用 `switchPeriod` 切换视图，JS 没有这个方法
4. **CSS 类名缺失**：WXML 用了 `.chart-canvas`、`.stats-grid`、`.stat-value`、`.stat-label` 等，WXSS 未定义

---

## 方案：全部对齐重写

JS / WXML / WXSS 统一重写，彻底修复所有不一致，同时实现本周折线图 + 本月柱状图切换。仅修改 analysis 页面的 4 个文件，不新增文件。

---

## 数据状态

`data` 字段统一如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| `period` | `'week'` \| `'month'` | 当前视图 |
| `weekDays` | `string[]` | X轴标签，如 `['3/28', '3/29', ...]` |
| `weekCalories` | `number[]` | 每天卡路里 |
| `calorieTarget` | `number` | 目标卡路里（来自 userInfo） |
| `avgCalories` | `number` | 日均摄入 |
| `totalDays` | `number` | 有记录天数（calories > 0） |
| `goalDays` | `number` | 达标天数 |
| `goalRate` | `number` | 达标率 % |
| `totalProtein` | `number` | 今日蛋白质 g |
| `totalCarbs` | `number` | 今日碳水 g |
| `totalFat` | `number` | 今日脂肪 g |
| `proteinPercent` | `number` | 蛋白质热量占比 % |
| `carbsPercent` | `number` | 碳水热量占比 % |
| `fatPercent` | `number` | 脂肪热量占比 % |
| `hasTodayNutrient` | `boolean` | 今日是否有营养数据（控制饼图空态） |

---

## UI 结构

```
┌─────────────────────────────────────┐
│  [本周]  [本月]   ← switchPeriod    │
├─────────────────────────────────────┤
│  卡路里趋势                          │
│  canvas id="lineChart"（period=week）│
│  canvas id="barChart"（period=month）│
│  图例：实际摄入 / 目标值             │
│  空态：「暂无记录」                  │
├─────────────────────────────────────┤
│  今日营养素分布                      │
│  canvas id="pieChart"               │
│  右侧：蛋白质 {{proteinPercent}}%   │
│         碳水   {{carbsPercent}}%    │
│         脂肪   {{fatPercent}}%      │
│  空态：「今日暂无记录」              │
├─────────────────────────────────────┤
│  达标统计                            │
│  {{totalDays}} 记录天数              │
│  {{goalDays}}  达标天数              │
│  {{goalRate}}% 达标率               │
│  {{avgCalories}} 日均摄入            │
└─────────────────────────────────────┘
```

- lineChart / barChart 用 `wx:if` / `wx:elif` 切换，不同时存在于 DOM
- WXSS 补全所有缺失类

---

## 图表绘制逻辑

### 本周折线图（drawLineChart）

- canvas ID：`#lineChart`
- 数据来源：近7天 `daily_summary`
- 逻辑：保留现有实现，仅修正 canvas ID
- 全为0时不调用 draw，显示空态文字

### 本月柱状图（drawBarChart）

- canvas ID：`#barChart`
- 数据来源：近30天 `daily_summary`
- 每天一根柱子
  - 达标（`goal_reached === true`）：橙色 `#FF7A00`
  - 未达标：灰色 `#E0E0E0`
- X轴每5天显示一个标签（避免拥挤）
- 虚线表示目标值
- 全为0时显示空态文字

### 饼图（drawPieChart）

- canvas ID：`#pieChart`
- 数据来源：今日 `meal_records`
- 逻辑：保留现有实现，仅修正 canvas ID
- `hasTodayNutrient === false` 时显示空态文字，不调用 draw

---

## 数据流

### switchPeriod 流程

```
点击切换 Tab
  → setData({ period })
  → loadData()
    → 查 daily_summary（7天或30天）
    → setData({ weekDays, weekCalories, avgCalories, totalDays, goalDays, goalRate })
    → 有数据：drawLineChart 或 drawBarChart
    → 无数据：setData 空态，不调用 draw
    → loadTodayNutrients()（与 period 无关，始终显示今日数据）
      → 查 meal_records（今日）
      → setData({ totalProtein, totalCarbs, totalFat, proteinPercent, carbsPercent, fatPercent, hasTodayNutrient })
      → hasTodayNutrient：drawPieChart
```

---

## 文件改动一览

| 文件 | 操作 |
|------|------|
| `miniprogram/pages/analysis/analysis.js` | 重写：对齐字段名、添加 switchPeriod、drawBarChart、修正 canvas ID |
| `miniprogram/pages/analysis/analysis.wxml` | 重写：对齐 canvas ID 和所有绑定字段 |
| `miniprogram/pages/analysis/analysis.wxss` | 重写：补全所有缺失 CSS 类 |
| `miniprogram/pages/analysis/analysis.json` | 不修改 |

---

## 边界处理

| 场景 | 处理 |
|------|------|
| 本周/本月全无数据 | 图表区显示「暂无记录」 |
| 今日无营养记录 | 饼图区显示「今日暂无记录」，不绘制 |
| DB 查询失败 | 静默处理，显示空态，不崩溃 |
| 达标率分母为0 | goalRate = 0 |
