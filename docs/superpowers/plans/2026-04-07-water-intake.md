# Water Intake Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「饮水」独立 Tab，支持按饮品类型快捷记录每日水分，波浪动画 + SVG 圆环进度，首次使用引导设置目标，数据存云数据库。

**Architecture:** 底部新增 water Tab，页面由 `water-wave` 子组件（波浪动画 + SVG 圆环）+ 主页面（统计、快捷记录、时间线）组成。数据分两张云数据库集合：`water_records`（每条记录）和 `user_config`（用户目标配置，upsert）。时间线左滑删除复用 meal-card 相同的 touch + translateX 方案。

**Tech Stack:** 微信小程序原生 WXML/WXSS/JS，wx.cloud.database，CSS @keyframes 波浪动画，SVG 圆环进度

---

## 文件结构

**新建文件：**
- `miniprogram/pages/water/water.wxml` — 页面结构
- `miniprogram/pages/water/water.wxss` — 页面样式
- `miniprogram/pages/water/water.js` — 页面逻辑
- `miniprogram/pages/water/water.json` — 页面配置（注册 water-wave 组件）
- `miniprogram/components/water-wave/water-wave.wxml` — 波浪动画 + SVG 圆环
- `miniprogram/components/water-wave/water-wave.wxss` — 波浪动画样式
- `miniprogram/components/water-wave/water-wave.js` — 组件逻辑
- `miniprogram/components/water-wave/water-wave.json` — 组件声明

**修改文件：**
- `miniprogram/app.json` — 注册 water 页面，添加 Tab 入口

---

## Task 1：注册 water 页面 + Tab 入口

**Files:**
- Modify: `miniprogram/app.json`
- Create: `miniprogram/pages/water/water.wxml`
- Create: `miniprogram/pages/water/water.wxss`
- Create: `miniprogram/pages/water/water.js`
- Create: `miniprogram/pages/water/water.json`

- [ ] **Step 1: 在 app.json 的 pages 数组中注册 water 页面，并在 tabBar.list 中添加饮水入口**

`miniprogram/app.json` — 将 `"pages/water/water"` 加入 pages 数组（放在 analysis 后面），tabBar.list 在分析和我的之间插入饮水：

```json
{
  "pages": [
    "pages/index/index",
    "pages/record/record",
    "pages/analysis/analysis",
    "pages/water/water",
    "pages/profile/profile",
    "pages/food-search/food-search",
    "pages/photo-result/photo-result",
    "pages/onboarding/onboarding",
    "pages/food-detail/food-detail",
    "pages/food-edit/food-edit"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#FF7A00",
    "navigationBarTitleText": "自律橙子",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#FFF3E0"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#FF7A00",
    "backgroundColor": "#ffffff",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页"
      },
      {
        "pagePath": "pages/analysis/analysis",
        "text": "分析"
      },
      {
        "pagePath": "pages/water/water",
        "text": "饮水"
      },
      {
        "pagePath": "pages/profile/profile",
        "text": "我的"
      }
    ]
  },
  "cloud": true,
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
```

- [ ] **Step 2: 创建 water 页面空文件**

`miniprogram/pages/water/water.json`:
```json
{
  "usingComponents": {
    "water-wave": "/components/water-wave/water-wave"
  },
  "navigationBarTitleText": "饮水记录",
  "navigationBarBackgroundColor": "#1565c0",
  "navigationBarTextStyle": "white"
}
```

`miniprogram/pages/water/water.wxml`:
```xml
<view class="container">
  <text>饮水页面</text>
</view>
```

`miniprogram/pages/water/water.wxss`:
```css
.container {
  padding: 20rpx;
}
```

`miniprogram/pages/water/water.js`:
```javascript
Page({
  data: {},
  onShow() {}
});
```

- [ ] **Step 3: 在微信开发者工具中编译，验证底部出现「饮水」Tab，点击可跳转到空白页面，无报错**

- [ ] **Step 4: 提交**

```bash
git add miniprogram/app.json miniprogram/pages/water/
git commit -m "feat: register water page and tab entry"
```

---

## Task 2：water-wave 组件（波浪动画 + SVG 圆环）

**Files:**
- Create: `miniprogram/components/water-wave/water-wave.json`
- Create: `miniprogram/components/water-wave/water-wave.wxml`
- Create: `miniprogram/components/water-wave/water-wave.wxss`
- Create: `miniprogram/components/water-wave/water-wave.js`

- [ ] **Step 1: 创建组件声明文件**

`miniprogram/components/water-wave/water-wave.json`:
```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: 编写 water-wave.wxml**

```xml
<view class="wave-container" style="background: linear-gradient(180deg, #1976d2 {{100 - percent}}%, #42a5f5 100%);">
  <!-- 顶部文字信息 -->
  <view class="header-info">
    <text class="amount-label">今日饮水</text>
    <view class="amount-row">
      <text class="amount-num">{{amount}}</text>
      <text class="amount-unit"> ml</text>
    </view>
    <text class="goal-text">目标 {{goal}}ml · 还差 {{left > 0 ? left : 0}}ml</text>
  </view>

  <!-- 双层波浪 -->
  <view class="wave-wrap">
    <view class="wave wave1"></view>
    <view class="wave wave2"></view>
  </view>

  <!-- SVG 圆环进度（叠在波浪上） -->
  <view class="ring-area">
    <view class="ring-wrap">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle class="ring-bg" cx="45" cy="45" r="38" fill="none" stroke="#c8e6ff" stroke-width="7"/>
        <circle
          class="ring-fill"
          cx="45" cy="45" r="38"
          fill="none"
          stroke="#ffffff"
          stroke-width="7"
          stroke-linecap="round"
          style="stroke-dasharray: 238.76; stroke-dashoffset: {{238.76 - 238.76 * percent / 100}}; transform: rotate(-90deg); transform-origin: 45px 45px;"
        />
      </svg>
      <view class="ring-label">
        <text class="ring-pct">{{percent}}%</text>
        <text class="ring-sub">完成</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 3: 编写 water-wave.wxss**

```css
.wave-container {
  position: relative;
  padding: 40rpx 24rpx 0;
  min-height: 360rpx;
  overflow: hidden;
}

.header-info {
  text-align: center;
  padding-bottom: 20rpx;
}

.amount-label {
  display: block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.8);
  margin-bottom: 8rpx;
}

.amount-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
}

.amount-num {
  font-size: 80rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.amount-unit {
  font-size: 28rpx;
  color: rgba(255,255,255,0.85);
  margin-left: 4rpx;
}

.goal-text {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
  margin-top: 10rpx;
}

/* 双层波浪 */
.wave-wrap {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80rpx;
  overflow: hidden;
}

.wave {
  position: absolute;
  bottom: 0;
  width: 200%;
  height: 80rpx;
  background: #f0f4f8;
  border-radius: 50% 50% 0 0 / 40rpx 40rpx 0 0;
}

.wave1 {
  animation: wave-move1 3s ease-in-out infinite;
}

.wave2 {
  background: rgba(240, 244, 248, 0.5);
  border-radius: 45% 55% 0 0 / 30rpx 30rpx 0 0;
  animation: wave-move2 4s ease-in-out infinite;
}

@keyframes wave-move1 {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-25%); }
}

@keyframes wave-move2 {
  0%, 100% { transform: translateX(-15%); }
  50% { transform: translateX(10%); }
}

/* SVG 圆环区域 */
.ring-area {
  display: flex;
  justify-content: center;
  margin-top: -16rpx;
  padding-bottom: 24rpx;
  position: relative;
  z-index: 2;
  background: #f0f4f8;
}

.ring-wrap {
  position: relative;
  width: 90px;
  height: 90px;
}

.ring-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.ring-pct {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #1565c0;
}

.ring-sub {
  display: block;
  font-size: 10px;
  color: #999;
}
```

- [ ] **Step 4: 编写 water-wave.js**

```javascript
Component({
  properties: {
    amount: { type: Number, value: 0 },
    goal:   { type: Number, value: 2000 },
    percent: { type: Number, value: 0 }
  },

  observers: {
    'amount, goal': function(amount, goal) {
      const left = goal - amount;
      this.setData({ left });
    }
  },

  data: {
    left: 2000
  }
});
```

- [ ] **Step 5: 在 water.wxml 中引入组件，传入测试数据，编译验证波浪动画和圆环正常显示**

将 `miniprogram/pages/water/water.wxml` 改为：
```xml
<view class="container">
  <water-wave amount="{{totalAmount}}" goal="{{waterGoal}}" percent="{{percent}}"></water-wave>
</view>
```

将 `miniprogram/pages/water/water.js` 改为：
```javascript
Page({
  data: {
    totalAmount: 1200,
    waterGoal: 2000,
    percent: 60
  },
  onShow() {}
});
```

编译后应看到：蓝色渐变背景、两层波浪动画、白色圆环显示 60%、大字 1200ml。

- [ ] **Step 6: 提交**

```bash
git add miniprogram/components/water-wave/ miniprogram/pages/water/
git commit -m "feat: add water-wave component with wave animation and SVG ring"
```

---

## Task 3：water 页面完整 WXML + WXSS 静态结构

**Files:**
- Modify: `miniprogram/pages/water/water.wxml`
- Modify: `miniprogram/pages/water/water.wxss`

- [ ] **Step 1: 编写完整 water.wxml**

```xml
<view class="page-wrap">
  <!-- 顶部波浪组件 -->
  <water-wave
    amount="{{totalAmount}}"
    goal="{{waterGoal}}"
    percent="{{percent}}"
  ></water-wave>

  <!-- 统计小卡 -->
  <view class="stats-row">
    <view class="stat-card">
      <text class="stat-val">{{cupCount}}</text>
      <text class="stat-label">今日杯数</text>
    </view>
    <view class="stat-card">
      <text class="stat-val">{{streakDays}}</text>
      <text class="stat-label">连续达标天</text>
    </view>
    <view class="stat-card">
      <text class="stat-val">{{yesterdayAmount}}</text>
      <text class="stat-label">昨日 ml</text>
    </view>
  </view>

  <!-- 快捷记录 -->
  <view class="section-title">快捷记录</view>
  <view class="quick-row">
    <view
      class="quick-btn"
      wx:for="{{quickList}}"
      wx:key="type_name"
      data-item="{{item}}"
      bindtap="onQuickAdd"
    >
      <text class="quick-icon">{{item.icon}}</text>
      <text class="quick-ml">{{item.amount}}ml</text>
      <text class="quick-name">{{item.type_name}}</text>
    </view>
  </view>

  <!-- 自定义输入 -->
  <view class="custom-row">
    <input
      class="custom-input"
      type="number"
      placeholder="自定义 ml"
      value="{{customAmount}}"
      bindinput="onCustomInput"
    />
    <view class="custom-add-btn" bindtap="onCustomAdd">
      <text class="custom-add-text">+ 记录</text>
    </view>
  </view>

  <!-- 今日时间线 -->
  <view class="section-title">今日记录</view>
  <view class="timeline" wx:if="{{records.length > 0}}">
    <view
      class="tl-item-wrap"
      wx:for="{{records}}"
      wx:key="_id"
      data-index="{{index}}"
      bindtouchstart="onTouchStart"
      bindtouchmove="onTouchMove"
      bindtouchend="onTouchEnd"
    >
      <view class="tl-slide-inner" style="transform: translateX({{item._slideX || 0}}rpx);">
        <view class="tl-item">
          <view class="tl-dot">
            <text class="tl-dot-icon">{{item.icon}}</text>
          </view>
          <view class="tl-info">
            <text class="tl-name">{{item.type_name}}</text>
            <text class="tl-time">{{item.timeStr}}</text>
          </view>
          <text class="tl-amount">{{item.amount}}ml</text>
        </view>
        <view class="tl-delete-btn" bindtap="onDeleteRecord" data-index="{{index}}">
          <text class="tl-delete-text">删除</text>
        </view>
      </view>
    </view>
  </view>
  <view class="timeline-empty" wx:else>
    <text class="empty-text">今天还没有记录，喝点水吧 💧</text>
  </view>
</view>

<!-- 首次使用目标设置弹窗 -->
<view class="modal-mask" wx:if="{{showGoalModal}}" bindtap="onMaskTap">
  <view class="modal-box" catchtap="">
    <text class="modal-title">设置每日饮水目标</text>
    <text class="modal-desc">输入体重，我们帮你推算推荐量</text>
    <view class="modal-row">
      <text class="modal-label">体重（kg）</text>
      <input
        class="modal-input"
        type="number"
        placeholder="如：65"
        value="{{weightInput}}"
        bindinput="onWeightInput"
      />
    </view>
    <view class="modal-row">
      <text class="modal-label">每日目标（ml）</text>
      <input
        class="modal-input"
        type="number"
        placeholder="推荐值将自动填入"
        value="{{goalInput}}"
        bindinput="onGoalInput"
      />
    </view>
    <view class="modal-btns">
      <view class="modal-btn modal-btn-cancel" bindtap="onGoalCancel">
        <text>使用默认 2000ml</text>
      </view>
      <view class="modal-btn modal-btn-confirm" bindtap="onGoalConfirm">
        <text>确认</text>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 2: 编写完整 water.wxss**

```css
page {
  background: #f0f4f8;
}

.page-wrap {
  min-height: 100vh;
  background: #f0f4f8;
}

/* 统计小卡 */
.stats-row {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 24rpx 0;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 12rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.stat-val {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1565c0;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

/* 区块标题 */
.section-title {
  font-size: 26rpx;
  color: #999;
  padding: 28rpx 24rpx 12rpx;
  letter-spacing: 1rpx;
}

/* 快捷按钮 */
.quick-row {
  display: flex;
  gap: 16rpx;
  padding: 0 24rpx;
}

.quick-btn {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 8rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.quick-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.quick-ml {
  font-size: 26rpx;
  font-weight: 600;
  color: #1565c0;
  display: block;
}

.quick-name {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

/* 自定义输入 */
.custom-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx 0;
}

.custom-input {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.custom-add-btn {
  background: linear-gradient(135deg, #3b9ded, #1565c0);
  border-radius: 16rpx;
  padding: 20rpx 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(59,157,237,0.4);
}

.custom-add-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

/* 时间线 */
.timeline {
  padding: 0 24rpx;
  margin-top: 8rpx;
}

.tl-item-wrap {
  overflow: hidden;
  margin-bottom: 12rpx;
}

.tl-slide-inner {
  display: flex;
  flex-direction: row;
  width: calc(100% + 160rpx);
  will-change: transform;
}

.tl-item {
  flex-shrink: 0;
  width: calc(100% - 160rpx);
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.tl-dot {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #EFF6FF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tl-dot-icon {
  font-size: 36rpx;
}

.tl-info {
  flex: 1;
}

.tl-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.tl-time {
  display: block;
  font-size: 22rpx;
  color: #aaa;
  margin-top: 4rpx;
}

.tl-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #1565c0;
}

.tl-delete-btn {
  flex-shrink: 0;
  width: 160rpx;
  background: #FF4444;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 20rpx 20rpx 0;
  align-self: stretch;
}

.tl-delete-text {
  color: #fff;
  font-size: 28rpx;
}

/* 空状态 */
.timeline-empty {
  padding: 60rpx 24rpx;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #bbb;
}

/* 目标设置弹窗 */
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-box {
  background: #fff;
  border-radius: 32rpx;
  padding: 48rpx 40rpx;
  width: 600rpx;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.15);
}

.modal-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 12rpx;
}

.modal-desc {
  display: block;
  font-size: 26rpx;
  color: #999;
  text-align: center;
  margin-bottom: 40rpx;
}

.modal-row {
  margin-bottom: 28rpx;
}

.modal-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.modal-input {
  width: 100%;
  background: #f5f7fa;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.modal-btns {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.modal-btn {
  flex: 1;
  border-radius: 20rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 28rpx;
}

.modal-btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.modal-btn-confirm {
  background: linear-gradient(135deg, #3b9ded, #1565c0);
  color: #fff;
  font-weight: 600;
}
```

- [ ] **Step 3: 在 water.js data 中补充静态测试数据，编译验证页面完整结构**

将 `water.js` 的 data 改为：
```javascript
data: {
  totalAmount: 1200,
  waterGoal: 2000,
  percent: 60,
  cupCount: 5,
  streakDays: 3,
  yesterdayAmount: 1800,
  customAmount: '',
  showGoalModal: false,
  weightInput: '',
  goalInput: '',
  quickList: [
    { type: 'water',  type_name: '白水', icon: '💧', amount: 250 },
    { type: 'water',  type_name: '大杯', icon: '🍶', amount: 350 },
    { type: 'coffee', type_name: '咖啡', icon: '☕', amount: 200 },
    { type: 'tea',    type_name: '茶',   icon: '🍵', amount: 300 }
  ],
  records: [
    { _id: '1', type: 'coffee', type_name: '咖啡', icon: '☕', amount: 200, timeStr: '10:30', _slideX: 0 },
    { _id: '2', type: 'water',  type_name: '白水', icon: '💧', amount: 250, timeStr: '09:15', _slideX: 0 },
    { _id: '3', type: 'water',  type_name: '白水', icon: '💧', amount: 150, timeStr: '08:00', _slideX: 0 }
  ],
  slideIndex: -1
},
```

编译后应看到：完整页面结构，统计卡、快捷按钮、输入行、时间线均正常显示。

- [ ] **Step 4: 提交**

```bash
git add miniprogram/pages/water/water.wxml miniprogram/pages/water/water.wxss miniprogram/pages/water/water.js
git commit -m "feat: add water page static structure and styles"
```

---

## Task 4：water.js 数据加载（真实云数据库）

**Files:**
- Modify: `miniprogram/pages/water/water.js`

下面是完整的 `water.js`，包含 Task 3 的静态 data 初始值 + 真实数据加载逻辑：

- [ ] **Step 1: 编写完整 water.js（数据加载部分）**

```javascript
const { getToday, formatDate, getRecentDays } = require('../../utils/date');

// 饮品图标映射
const TYPE_ICON = {
  water:  '💧',
  coffee: '☕',
  tea:    '🍵',
  juice:  '🧃',
  other:  '🥤'
};

// 快捷记录预设
const QUICK_LIST = [
  { type: 'water',  type_name: '白水', icon: '💧', amount: 250 },
  { type: 'water',  type_name: '大杯', icon: '🍶', amount: 350 },
  { type: 'coffee', type_name: '咖啡', icon: '☕', amount: 200 },
  { type: 'tea',    type_name: '茶',   icon: '🍵', amount: 300 }
];

Page({
  data: {
    totalAmount: 0,
    waterGoal: 2000,
    percent: 0,
    cupCount: 0,
    streakDays: 0,
    yesterdayAmount: 0,
    customAmount: '',
    showGoalModal: false,
    weightInput: '',
    goalInput: '',
    quickList: QUICK_LIST,
    records: [],
    slideIndex: -1
  },

  onShow() {
    this.loadData();
  },

  // ── 数据加载 ──────────────────────────────────────

  async loadData() {
    const db = wx.cloud.database();
    const today = getToday();

    try {
      // 1. 加载用户配置（获取目标 + 判断是否首次使用）
      const configRes = await db.collection('user_config')
        .where({ _openid: '{openid}' })
        .get();

      // 微信云数据库会自动匹配当前用户的 _openid，where 条件不需要手动传 openid
      // 实际写法：直接不带 where 或使用 db.collection('user_config').get()
      // 但为了过滤只取自己的配置，用 orderBy + limit 1 更稳妥：
      const myConfig = await db.collection('user_config').orderBy('_id', 'asc').limit(1).get();
      const config = myConfig.data[0];

      if (!config) {
        // 首次使用：显示目标设置弹窗
        this.setData({ showGoalModal: true });
        return;
      }

      const waterGoal = config.water_goal || 2000;
      this.setData({ waterGoal });

      // 2. 加载今日记录
      const todayRes = await db.collection('water_records')
        .where({ date: today })
        .orderBy('recorded_at', 'desc')
        .get();

      const records = todayRes.data.map(r => this._formatRecord(r));
      const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
      const percent = Math.min(Math.round(totalAmount / waterGoal * 100), 100);
      const cupCount = records.length;

      // 3. 加载近 30 天数据（计算昨日量 + 连续达标天）
      const recentDays = getRecentDays(30);
      const recentRes = await db.collection('water_records')
        .where({ date: wx.cloud.database().command.in(recentDays) })
        .get();

      const dayMap = {};
      recentRes.data.forEach(r => {
        if (!dayMap[r.date]) dayMap[r.date] = 0;
        dayMap[r.date] += r.amount;
      });

      const yesterday = formatDate(new Date(Date.now() - 86400000));
      const yesterdayAmount = dayMap[yesterday] || 0;

      // 连续达标天（从今天往前数）
      let streakDays = 0;
      for (let i = 0; i < 30; i++) {
        const d = formatDate(new Date(Date.now() - i * 86400000));
        if ((dayMap[d] || 0) >= waterGoal) {
          streakDays++;
        } else {
          break;
        }
      }

      this.setData({ records, totalAmount, percent, cupCount, yesterdayAmount, streakDays });

    } catch (err) {
      console.error('loadData error', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'error' });
    }
  },

  // 格式化数据库记录：补充 icon、timeStr、_slideX
  _formatRecord(r) {
    const d = r.recorded_at ? new Date(r.recorded_at) : new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return {
      ...r,
      icon: TYPE_ICON[r.type] || '🥤',
      timeStr: `${h}:${m}`,
      _slideX: 0
    };
  },

  // ── 输入处理 ──────────────────────────────────────

  onCustomInput(e) {
    this.setData({ customAmount: e.detail.value });
  },

  onWeightInput(e) {
    const weight = parseFloat(e.detail.value);
    const goalInput = weight > 0 ? String(Math.round(weight * 35)) : '';
    this.setData({ weightInput: e.detail.value, goalInput });
  },

  onGoalInput(e) {
    this.setData({ goalInput: e.detail.value });
  },

  onMaskTap() {
    // 弹窗背景点击不关闭（强制设置目标）
  },

  // ── 记录饮水 ──────────────────────────────────────

  async onQuickAdd(e) {
    const item = e.currentTarget.dataset.item;
    await this._addRecord(item.amount, item.type, item.type_name);
  },

  async onCustomAdd() {
    const amount = parseInt(this.data.customAmount);
    if (!amount || amount <= 0 || amount > 5000) {
      wx.showToast({ title: '请输入有效水量（1-5000ml）', icon: 'none' });
      return;
    }
    await this._addRecord(amount, 'water', '白水');
    this.setData({ customAmount: '' });
  },

  async _addRecord(amount, type, type_name) {
    const db = wx.cloud.database();
    const today = getToday();
    const now = new Date();

    wx.showLoading({ title: '记录中...' });
    try {
      const res = await db.collection('water_records').add({
        data: {
          date: today,
          amount,
          type,
          type_name,
          recorded_at: now
        }
      });

      wx.hideLoading();
      wx.showToast({ title: `+${amount}ml 💧`, icon: 'none' });

      // 本地即时追加到头部
      const newRecord = this._formatRecord({
        _id: res._id,
        date: today,
        amount,
        type,
        type_name,
        recorded_at: now
      });

      const records = [newRecord, ...this.data.records];
      const totalAmount = this.data.totalAmount + amount;
      const percent = Math.min(Math.round(totalAmount / this.data.waterGoal * 100), 100);
      const cupCount = this.data.cupCount + 1;

      this.setData({ records, totalAmount, percent, cupCount });
    } catch (err) {
      wx.hideLoading();
      console.error('_addRecord error', err);
      wx.showToast({ title: '记录失败，请重试', icon: 'error' });
    }
  },

  // ── 左滑删除 ──────────────────────────────────────

  onTouchStart(e) {
    this._touchStartX = e.touches[0].clientX;
    this._touchStartY = e.touches[0].clientY;
    this._touchIndex = e.currentTarget.dataset.index;
    this._isSwiping = false;
  },

  onTouchMove(e) {
    const dx = e.touches[0].clientX - this._touchStartX;
    const dy = e.touches[0].clientY - this._touchStartY;

    if (!this._isSwiping && Math.abs(dy) > Math.abs(dx)) return;
    this._isSwiping = true;

    const index = this._touchIndex;
    const currentX = this.data.records[index]._slideX || 0;
    let newX = currentX + dx * 2;
    newX = Math.max(-160, Math.min(0, newX));

    const records = this.data.records.map((r, i) => ({
      ...r,
      _slideX: i === index ? newX : 0
    }));
    this.setData({ records, slideIndex: newX < -10 ? index : -1 });
    this._touchStartX = e.touches[0].clientX;
  },

  onTouchEnd() {
    if (!this._isSwiping) return;
    const index = this._touchIndex;
    const currentX = this.data.records[index]._slideX || 0;
    const snapX = currentX < -80 ? -160 : 0;
    const records = this.data.records.map((r, i) => ({
      ...r,
      _slideX: i === index ? snapX : (r._slideX || 0)
    }));
    this.setData({ records, slideIndex: snapX < 0 ? index : -1 });
  },

  _resetSlide() {
    const records = this.data.records.map(r => ({ ...r, _slideX: 0 }));
    this.setData({ records, slideIndex: -1 });
  },

  async onDeleteRecord(e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.records[index];
    if (!record || !record._id) return;

    wx.showModal({
      title: '确认删除',
      content: `删除「${record.type_name} ${record.amount}ml」？`,
      confirmColor: '#FF4444',
      success: async (res) => {
        if (!res.confirm) {
          this._resetSlide();
          return;
        }
        wx.showLoading({ title: '删除中...' });
        try {
          const db = wx.cloud.database();
          await db.collection('water_records').doc(record._id).remove();
          wx.hideLoading();

          const records = this.data.records
            .filter((_, i) => i !== index)
            .map(r => ({ ...r, _slideX: 0 }));
          const totalAmount = this.data.totalAmount - record.amount;
          const percent = Math.min(Math.round(Math.max(totalAmount, 0) / this.data.waterGoal * 100), 100);
          const cupCount = Math.max(this.data.cupCount - 1, 0);
          this.setData({ records, totalAmount, percent, cupCount, slideIndex: -1 });
        } catch (err) {
          wx.hideLoading();
          this._resetSlide();
          wx.showToast({ title: '删除失败，请重试', icon: 'error' });
        }
      }
    });
  },

  // ── 首次使用目标设置 ──────────────────────────────

  async onGoalConfirm() {
    const goal = parseInt(this.data.goalInput) || 2000;
    if (goal < 500 || goal > 8000) {
      wx.showToast({ title: '目标应在 500-8000ml 之间', icon: 'none' });
      return;
    }
    await this._saveGoal(goal);
  },

  async onGoalCancel() {
    await this._saveGoal(2000);
  },

  async _saveGoal(goal) {
    const db = wx.cloud.database();
    wx.showLoading({ title: '保存中...' });
    try {
      // 查询是否已存在配置（upsert 逻辑）
      const existing = await db.collection('user_config').limit(1).get();
      if (existing.data.length > 0) {
        await db.collection('user_config').doc(existing.data[0]._id).update({
          data: { water_goal: goal }
        });
      } else {
        await db.collection('user_config').add({
          data: { water_goal: goal, weight: parseFloat(this.data.weightInput) || 0 }
        });
      }
      wx.hideLoading();
      this.setData({ showGoalModal: false, waterGoal: goal });
      this.loadData();
    } catch (err) {
      wx.hideLoading();
      console.error('_saveGoal error', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    }
  }
});
```

- [ ] **Step 2: 在微信云控制台创建 `water_records` 集合**

打开微信开发者工具 → 云开发控制台 → 数据库 → 新建集合，名称填 `water_records`，权限选「仅创建者可读写」。

- [ ] **Step 3: 验证页面功能**

  1. 编译运行，首次进入 water tab → 应弹出目标设置弹窗
  2. 输入体重（如 65），目标输入框自动填入 2275，点击确认
  3. 弹窗关闭，页面显示 0ml，时间线为空
  4. 点击「白水 250ml」快捷按钮 → toast 显示 `+250ml 💧`，时间线顶部出现一条记录，总量更新为 250ml
  5. 左滑时间线记录 → 显示红色删除按钮，点击删除 → 弹确认框，确认后记录消失，总量回到 0

- [ ] **Step 4: 提交**

```bash
git add miniprogram/pages/water/water.js
git commit -m "feat: implement water page data loading, record and delete logic"
```

---

## Task 5：完善 water-wave 组件背景动态高度

**Files:**
- Modify: `miniprogram/components/water-wave/water-wave.wxss`

当前波浪区域背景颜色随 `percent` 动态变化（通过 inline style），但页面背景色也需要配合调整，确保整体视觉和谐。

- [ ] **Step 1: 调整 water-wave.wxml，将背景高度动态传入**

当前 wxml 中 `wave-container` 的 style 已使用 `{{percent}}`，确认显示效果：
- percent = 0：浅蓝色 header
- percent = 60：中蓝色，波浪在中间
- percent = 100：深蓝色，满水状态

如果视觉上蓝色渐变高度感觉不够明显，将 `water-wave.wxml` 中 `wave-container` 的 style 调整为：

```xml
<view class="wave-container" style="background: linear-gradient(180deg, #1565c0 0%, #1976d2 {{100 - percent}}%, #42a5f5 100%);">
```

- [ ] **Step 2: 编译验证，用测试数据 percent=0、percent=60、percent=100 分别查看渐变效果**

在 `water.js` 的 `onShow` 中临时 setData 不同 percent，观察颜色变化符合预期后恢复真实加载逻辑。

- [ ] **Step 3: 提交**

```bash
git add miniprogram/components/water-wave/
git commit -m "feat: refine water-wave gradient based on percent"
```

---

## 自检

**Spec coverage:**
- ✅ 独立 Tab（app.json tabBar 新增饮水入口）
- ✅ 波浪动画 + 圆环进度（water-wave 组件）
- ✅ 统计小卡（今日杯数、连续达标天、昨日量）
- ✅ 快捷记录（4 个预设按钮）
- ✅ 自定义输入记录
- ✅ 饮品分类（type / type_name 字段，图标映射）
- ✅ 时间线左滑删除
- ✅ 首次使用目标设置引导（体重推算 + 手动修改）
- ✅ 数据存云数据库 water_records / user_config
- ✅ 连续达标天计算（前端近 30 天数据）
- ✅ MVP 不含提醒推送、周月图表（明确排除）

**Placeholder scan:** 无 TBD/TODO，所有步骤均有完整代码。

**Type consistency:**
- `records` 数组元素：`{ _id, date, amount, type, type_name, icon, timeStr, _slideX }` — Task 3、4、5 均一致
- `waterGoal`（Number）在 data、loadData、_addRecord、_saveGoal 中一致
- `_formatRecord` 输出的字段名与 WXML 绑定的字段名一致
