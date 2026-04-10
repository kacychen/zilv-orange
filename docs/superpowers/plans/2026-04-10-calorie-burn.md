# 卡路里消耗记录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增运动消耗记录功能——用户从内置运动库选择运动、输入时长自动计算消耗大卡写入云数据库，首页展示今日运动消耗大卡、微信步数进度条，并将消耗大卡纳入剩余热量公式。

**Architecture:** 新建本地运动库 `utils/exercises.js` 和 `pages/exercise-search` 页面（参照 food-search 模式），改造首页 index 新增运动消耗卡片、步数进度条、更新热量环底部统计和剩余公式。云端写入新集合 `exercise_records`，无需云函数。

**Tech Stack:** 微信小程序原生（WXML/WXSS/JS）、wx.cloud.database()、wx.getWeRunData()

---

## 文件清单

### 新建
- `miniprogram/utils/exercises.js` — 14 种运动静态数据（含 MET 值）
- `miniprogram/pages/exercise-search/exercise-search.js` — 运动搜索页逻辑
- `miniprogram/pages/exercise-search/exercise-search.wxml` — 运动搜索页模板
- `miniprogram/pages/exercise-search/exercise-search.wxss` — 运动搜索页样式
- `miniprogram/pages/exercise-search/exercise-search.json` — 页面配置

### 修改
- `miniprogram/app.json` — pages 数组新增路由 + scope.werun 权限
- `miniprogram/pages/index/index.js` — 新增 totalBurned/todaySteps/loadExerciseData/loadTodaySteps，更新 remaining 公式
- `miniprogram/pages/index/index.wxml` — 热量环底部新增「已消耗」stat，新增运动消耗卡片
- `miniprogram/pages/index/index.wxss` — 运动消耗卡片 + 步数进度条样式

---

## Task 1: 运动数据库 + 路由注册

**Files:**
- Create: `miniprogram/utils/exercises.js`
- Modify: `miniprogram/app.json`

- [ ] **Step 1: 新建 utils/exercises.js**

```js
// miniprogram/utils/exercises.js
module.exports = [
  { type: 'aerobic',  type_name: '有氧运动', name: '跑步',   met: 8.0 },
  { type: 'aerobic',  type_name: '有氧运动', name: '快走',   met: 4.5 },
  { type: 'aerobic',  type_name: '有氧运动', name: '骑行',   met: 6.0 },
  { type: 'aerobic',  type_name: '有氧运动', name: '游泳',   met: 7.0 },
  { type: 'aerobic',  type_name: '有氧运动', name: '跳绳',   met: 10.0 },
  { type: 'strength', type_name: '力量训练', name: '哑铃',   met: 5.0 },
  { type: 'strength', type_name: '力量训练', name: '深蹲',   met: 5.5 },
  { type: 'strength', type_name: '力量训练', name: '俯卧撑', met: 5.0 },
  { type: 'ball',     type_name: '球类运动', name: '篮球',   met: 7.0 },
  { type: 'ball',     type_name: '球类运动', name: '乒乓球', met: 4.5 },
  { type: 'ball',     type_name: '球类运动', name: '羽毛球', met: 5.5 },
  { type: 'other',    type_name: '其他',     name: '瑜伽',   met: 3.0 },
  { type: 'other',    type_name: '其他',     name: '舞蹈',   met: 4.5 },
  { type: 'other',    type_name: '其他',     name: '爬山',   met: 6.5 },
];
```

- [ ] **Step 2: 在 app.json 的 pages 数组末尾添加路由，并新增 permission 字段**

完整替换 `miniprogram/app.json` 为：

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
    "pages/food-edit/food-edit",
    "pages/exercise-search/exercise-search"
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
      { "pagePath": "pages/index/index",    "text": "首页" },
      { "pagePath": "pages/analysis/analysis", "text": "分析" },
      { "pagePath": "pages/water/water",    "text": "饮水" },
      { "pagePath": "pages/profile/profile","text": "我的" }
    ]
  },
  "permission": {
    "scope.werun": {
      "desc": "获取您的微信运动步数，帮助展示今日步数进度"
    }
  },
  "cloud": true,
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
```

- [ ] **Step 3: 验证文件**

在终端执行：
```bash
node -e "const ex = require('./miniprogram/utils/exercises.js'); console.log('count:', ex.length, 'first:', ex[0].name);"
```
预期输出：`count: 14 first: 跑步`

- [ ] **Step 4: Commit**

```bash
git add miniprogram/utils/exercises.js miniprogram/app.json
git commit -m "feat: add exercises library and register exercise-search route"
```

---

## Task 2: exercise-search 页面静态结构（WXML + WXSS + JSON）

**Files:**
- Create: `miniprogram/pages/exercise-search/exercise-search.wxml`
- Create: `miniprogram/pages/exercise-search/exercise-search.wxss`
- Create: `miniprogram/pages/exercise-search/exercise-search.json`

- [ ] **Step 1: 新建 exercise-search.json**

```json
{
  "navigationBarTitleText": "添加运动",
  "navigationBarBackgroundColor": "#FF7A00",
  "navigationBarTextStyle": "white",
  "backgroundColor": "#FFF3E0"
}
```

- [ ] **Step 2: 新建 exercise-search.wxml**

```xml
<view class="container">
  <!-- 搜索框 -->
  <view class="search-bar">
    <view class="search-input-wrap">
      <text class="search-icon">🔍</text>
      <input
        class="search-input"
        placeholder="搜索运动名称"
        bindinput="onSearchInput"
        value="{{keyword}}"
        focus="true"
      />
    </view>
  </view>

  <!-- 分类运动列表 -->
  <block wx:for="{{groups}}" wx:key="type">
    <view class="category-title">{{item.type_name}}</view>
    <view class="exercise-list">
      <view
        class="exercise-item"
        wx:for="{{item.exercises}}"
        wx:for-item="ex"
        wx:key="name"
      >
        <view class="ex-info">
          <text class="ex-name">{{ex.name}}</text>
          <text class="ex-meta">{{ex.previewCal}} 大卡 / 30分钟</text>
        </view>
        <view class="add-btn" bindtap="onAddTap" data-exercise="{{ex}}">＋</view>
      </view>
    </view>
  </block>

  <!-- 无搜索结果 -->
  <view class="empty-state" wx:if="{{keyword && groups.length === 0}}">
    <text class="empty-icon">🏃</text>
    <text class="empty-text">未找到相关运动</text>
  </view>
</view>

<!-- 遮罩 -->
<view class="sheet-mask" wx:if="{{showSheet}}" bindtap="onSheetClose"></view>

<!-- 时长选择底部弹层 -->
<view class="bottom-sheet {{showSheet ? 'bottom-sheet-show' : ''}}">
  <view class="sheet-header">
    <text class="sheet-title">{{selectedExercise.name}}</text>
    <view class="sheet-close" bindtap="onSheetClose">✕</view>
  </view>

  <!-- 时长快捷选项 -->
  <view class="duration-grid">
    <view
      class="duration-item {{duration === item && !useCustom ? 'duration-active' : ''}}"
      wx:for="{{durationPresets}}"
      wx:key="*this"
      data-val="{{item}}"
      bindtap="onDurationTap"
    >{{item}} 分钟</view>
  </view>

  <!-- 自定义时长 -->
  <view class="custom-row" bindtap="onCustomToggle">
    <view class="custom-radio {{useCustom ? 'custom-radio-active' : ''}}"></view>
    <text class="custom-label">自定义</text>
    <input
      class="custom-input"
      type="number"
      placeholder="输入分钟数"
      placeholder-style="color:#ccc;"
      value="{{customDuration}}"
      bindinput="onCustomInput"
      disabled="{{!useCustom}}"
    />
    <text class="custom-unit">分钟</text>
  </view>

  <!-- 预估消耗 -->
  <view class="cal-preview">
    <text class="cal-preview-label">预估消耗</text>
    <text class="cal-preview-value">{{previewCal}} 大卡</text>
  </view>

  <!-- 保存按钮 -->
  <view class="confirm-btn" bindtap="onConfirm">
    <text class="confirm-text">保存</text>
  </view>
</view>
```

- [ ] **Step 3: 新建 exercise-search.wxss**

```css
/* ── 页面容器 ── */
.container {
  padding: 24rpx;
  background: #FFF3E0;
  min-height: 100vh;
  padding-bottom: 120rpx;
}

/* ── 搜索框 ── */
.search-bar {
  margin-bottom: 24rpx;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.search-icon { margin-right: 12rpx; font-size: 30rpx; }
.search-input { flex: 1; font-size: 28rpx; }

/* ── 分类标题 ── */
.category-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #999;
  margin: 24rpx 0 12rpx 4rpx;
  text-transform: uppercase;
}

/* ── 运动列表 ── */
.exercise-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.exercise-item {
  display: flex;
  align-items: center;
  padding: 24rpx 24rpx;
  border-bottom: 1rpx solid #F5F5F5;
}
.exercise-item:last-child { border-bottom: none; }

.ex-info { flex: 1; }
.ex-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
}
.ex-meta {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

/* ── ＋ 按钮 ── */
.add-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #FF7A00;
  color: #fff;
  font-size: 36rpx;
  line-height: 54rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(255,122,0,0.3);
  flex-shrink: 0;
}

/* ── 空态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 30rpx; color: #666; }

/* ── 底部弹层遮罩 ── */
.sheet-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 100;
}

/* ── 底部弹层 ── */
.bottom-sheet {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 30rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  z-index: 101;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}
.bottom-sheet-show { transform: translateY(0); }

.sheet-header {
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
}
.sheet-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}
.sheet-close {
  font-size: 28rpx;
  color: #999;
  padding: 8rpx;
}

/* ── 时长快捷格子 ── */
.duration-grid {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.duration-item {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 16rpx;
  background: #F5F5F5;
  font-size: 26rpx;
  color: #555;
}
.duration-item.duration-active {
  background: #FF7A00;
  color: #fff;
  font-weight: 600;
}

/* ── 自定义时长 ── */
.custom-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}
.custom-radio {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  flex-shrink: 0;
}
.custom-radio-active {
  background: #FF7A00;
  border-color: #FF7A00;
}
.custom-label { font-size: 28rpx; color: #555; }
.custom-input {
  flex: 1;
  background: #F5F5F5;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
  font-size: 28rpx;
}
.custom-unit { font-size: 26rpx; color: #999; }

/* ── 预估消耗 ── */
.cal-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFF3E0;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 30rpx;
}
.cal-preview-label { font-size: 26rpx; color: #666; }
.cal-preview-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #FF7A00;
}

/* ── 保存按钮 ── */
.confirm-btn {
  background: linear-gradient(135deg, #FF7A00, #FF9A40);
  border-radius: 48rpx;
  padding: 28rpx 0;
  text-align: center;
}
.confirm-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
```

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/exercise-search/
git commit -m "feat: add exercise-search page static structure (wxml/wxss/json)"
```

---

## Task 3: exercise-search.js 逻辑实现

**Files:**
- Create: `miniprogram/pages/exercise-search/exercise-search.js`

- [ ] **Step 1: 新建 exercise-search.js**

```js
// miniprogram/pages/exercise-search/exercise-search.js
const { getToday } = require('../../utils/date');
const EXERCISES = require('../../utils/exercises');

const DURATION_PRESETS = [15, 30, 45, 60];

function calcCal(met, weight, durationMin) {
  return Math.round(met * weight * (durationMin / 60));
}

function buildGroups(exercises, keyword, weight) {
  const filtered = keyword
    ? exercises.filter(e => e.name.includes(keyword))
    : exercises;

  const typeOrder = ['aerobic', 'strength', 'ball', 'other'];
  const typeMap = {};
  filtered.forEach(e => {
    if (!typeMap[e.type]) {
      typeMap[e.type] = { type: e.type, type_name: e.type_name, exercises: [] };
    }
    typeMap[e.type].exercises.push({
      ...e,
      previewCal: calcCal(e.met, weight, 30)
    });
  });

  return typeOrder.filter(t => typeMap[t]).map(t => typeMap[t]);
}

Page({
  data: {
    keyword: '',
    groups: [],
    showSheet: false,
    selectedExercise: null,
    duration: 30,
    useCustom: false,
    customDuration: '',
    previewCal: 0,
    durationPresets: DURATION_PRESETS
  },

  onLoad() {
    const app = getApp();
    const weight = (app.globalData.userInfo && app.globalData.userInfo.weight) || 60;
    this._weight = weight;
    this.setData({ groups: buildGroups(EXERCISES, '', weight) });
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      keyword,
      groups: buildGroups(EXERCISES, keyword, this._weight)
    });
  },

  onAddTap(e) {
    const exercise = e.currentTarget.dataset.exercise;
    const duration = 30;
    const previewCal = calcCal(exercise.met, this._weight, duration);
    this.setData({
      selectedExercise: exercise,
      duration,
      useCustom: false,
      customDuration: '',
      previewCal,
      showSheet: true
    });
  },

  onSheetClose() {
    this.setData({ showSheet: false });
  },

  onDurationTap(e) {
    const duration = e.currentTarget.dataset.val;
    const previewCal = calcCal(
      this.data.selectedExercise.met,
      this._weight,
      duration
    );
    this.setData({ duration, useCustom: false, customDuration: '', previewCal });
  },

  onCustomToggle() {
    this.setData({ useCustom: true });
  },

  onCustomInput(e) {
    const val = e.detail.value;
    const min = parseFloat(val) || 0;
    const previewCal = min > 0
      ? calcCal(this.data.selectedExercise.met, this._weight, min)
      : 0;
    this.setData({ customDuration: val, previewCal });
  },

  onConfirm() {
    const { selectedExercise, useCustom, duration, customDuration } = this.data;
    const finalMin = useCustom ? parseFloat(customDuration) : duration;

    if (!finalMin || finalMin < 1 || finalMin > 300) {
      wx.showToast({ title: '时长范围 1 ~ 300 分钟', icon: 'none' });
      return;
    }

    const calories = calcCal(selectedExercise.met, this._weight, finalMin);
    const db = wx.cloud.database();
    const record = {
      date: getToday(),
      exercise_name: selectedExercise.name,
      exercise_type: selectedExercise.type,
      duration: finalMin,
      met: selectedExercise.met,
      calories,
      weight: this._weight,
      created_at: db.serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    db.collection('exercise_records').add({ data: record }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已记录', icon: 'success' });
      this.setData({ showSheet: false });
      setTimeout(() => wx.navigateBack(), 1000);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
```

- [ ] **Step 2: 在微信开发者工具中编译，导航到 exercise-search 页验证以下行为**

手动验证（无自动化测试框架）：
1. 页面加载时显示 4 个分类，每分类下各运动项目名称和「x 大卡 / 30分钟」预览正确
2. 搜索「跑」过滤后只显示「跑步」
3. 点击运动行 ＋ 按钮，弹出底部弹层，显示运动名称
4. 选择 15 分钟，预估消耗大卡更新（跑步 8.0 MET × 60kg × 0.25h ≈ 120 大卡）
5. 选择自定义 → 输入 45 → 预览更新（8.0 × 60 × 0.75 ≈ 360）
6. 点保存 → showToast「已记录」→ 返回上级页面
7. 进入云数据库 exercise_records 集合，确认记录字段完整

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/exercise-search/exercise-search.js
git commit -m "feat: implement exercise-search page logic with MET calorie calc"
```

---

## Task 4: 首页 index.js 新增运动数据加载

**Files:**
- Modify: `miniprogram/pages/index/index.js`

- [ ] **Step 1: 更新 index.js**

将 `miniprogram/pages/index/index.js` 替换为以下内容：

```js
const { getToday } = require('../../utils/date');
const { sumNutrition, recommendedNutrients } = require('../../utils/nutrition');

Page({
  data: {
    greeting: '',
    nickname: '橙子用户',
    dateStr: '',
    calorieTarget: 1800,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    remaining: 1800,
    proteinTarget: 135,
    carbsTarget: 203,
    fatTarget: 50,
    breakfastFoods: [],
    lunchFoods: [],
    dinnerFoods: [],
    snackFoods: [],
    breakfastCal: 0,
    lunchCal: 0,
    dinnerCal: 0,
    snackCal: 0,
    // 新增：运动消耗
    totalBurned: 0,
    todaySteps: 0
  },

  onLoad() {},

  onShow() {
    this.setGreeting();
    this.setDateStr();
    this.loadUserInfo();
    this.loadTodayRecords();
    this.loadExerciseData();
    this.loadTodaySteps();
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '晚上好';
    if (hour < 6) greeting = '凌晨好';
    else if (hour < 12) greeting = '早上好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    this.setData({ greeting });
  },

  setDateStr() {
    const d = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
    this.setData({ dateStr });
  },

  loadUserInfo() {
    const app = getApp();
    if (app.globalData.userInfo) {
      const user = app.globalData.userInfo;
      const target = user.daily_calorie_target || 1800;
      const nutrients = recommendedNutrients(target);
      this.setData({
        nickname: user.nickname || '橙子用户',
        calorieTarget: target,
        proteinTarget: nutrients.protein,
        carbsTarget: nutrients.carbs,
        fatTarget: nutrients.fat
      });
    }
  },

  loadTodayRecords() {
    const db = wx.cloud.database();
    const today = getToday();

    db.collection('meal_records').where({ date: today }).get().then(res => {
      const records = res.data;
      const app = getApp();
      app.globalData.todayRecords = records;

      const groups = { breakfast: [], lunch: [], dinner: [], snack: [] };
      records.forEach(r => {
        if (groups[r.meal_type]) groups[r.meal_type].push(r);
      });

      const calcMealCal = (foods) => foods.reduce((sum, f) => sum + (f.calories || 0), 0);
      const summary = sumNutrition(records);

      this.setData({
        breakfastFoods: groups.breakfast,
        lunchFoods: groups.lunch,
        dinnerFoods: groups.dinner,
        snackFoods: groups.snack,
        breakfastCal: calcMealCal(groups.breakfast),
        lunchCal: calcMealCal(groups.lunch),
        dinnerCal: calcMealCal(groups.dinner),
        snackCal: calcMealCal(groups.snack),
        totalCalories: summary.total_calories,
        totalProtein: summary.total_protein,
        totalCarbs: summary.total_carbs,
        totalFat: summary.total_fat,
        remaining: this.data.calorieTarget - summary.total_calories + this.data.totalBurned
      });
    }).catch(err => {
      console.error('加载记录失败', err);
      wx.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
    });
  },

  loadExerciseData() {
    const db = wx.cloud.database();
    const today = getToday();

    db.collection('exercise_records').where({ date: today }).get().then(res => {
      const totalBurned = res.data.reduce((sum, r) => sum + (r.calories || 0), 0);
      this.setData({
        totalBurned,
        remaining: this.data.calorieTarget - this.data.totalCalories + totalBurned
      });
    }).catch(err => {
      console.error('加载运动记录失败', err);
    });
  },

  loadTodaySteps() {
    wx.getWeRunData({
      success: (res) => {
        const stepInfoList = res.stepInfoList || [];
        const today = getToday();
        const todayEntry = stepInfoList.find(s => {
          const d = new Date(s.timestamp * 1000);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}` === today;
        });
        this.setData({ todaySteps: todayEntry ? todayEntry.step : 0 });
      },
      fail: () => {
        // 用户未授权或不支持，步数显示 0，不影响功能
        this.setData({ todaySteps: 0 });
      }
    });
  },

  onAddMeal(e) {
    const { mealType } = e.detail;
    wx.navigateTo({ url: `/pages/record/record?mealType=${mealType}` });
  },

  onFoodDeleted(e) {
    const { _id, mealType, calories, protein, carbs, fat } = e.detail;
    const foodsKey = `${mealType}Foods`;
    const calKey = `${mealType}Cal`;

    const newFoods = (this.data[foodsKey] || []).filter(f => f._id !== _id);
    const newCal = newFoods.reduce((sum, f) => sum + (f.calories || 0), 0);

    const newTotalCalories = this.data.totalCalories - (calories || 0);
    const newTotalProtein = parseFloat((this.data.totalProtein - (protein || 0)).toFixed(1));
    const newTotalCarbs = parseFloat((this.data.totalCarbs - (carbs || 0)).toFixed(1));
    const newTotalFat = parseFloat((this.data.totalFat - (fat || 0)).toFixed(1));

    this.setData({
      [foodsKey]: newFoods,
      [calKey]: newCal,
      totalCalories: Math.max(0, newTotalCalories),
      totalProtein: Math.max(0, newTotalProtein),
      totalCarbs: Math.max(0, newTotalCarbs),
      totalFat: Math.max(0, newTotalFat),
      remaining: this.data.calorieTarget - Math.max(0, newTotalCalories) + this.data.totalBurned
    });
  },

  onEditFood(e) {
    const { id } = e.detail;
    wx.navigateTo({ url: `/pages/food-edit/food-edit?id=${id}` });
  },

  onAddExercise() {
    wx.navigateTo({ url: '/pages/exercise-search/exercise-search' });
  }
});
```

- [ ] **Step 2: 在微信开发者工具中编译，验证首页正常加载**

确认以下无报错：
1. 首页 onShow 不崩溃
2. Console 无 `loadExerciseData` 相关错误（云数据库集合不存在时会报错——需提前在云控制台新建 `exercise_records` 集合，或第一次添加运动后自动创建）
3. `remaining` 公式：打开控制台在 `loadTodayRecords` 回调中添加 `console.log('remaining', remaining)` 验证计算正确

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/index/index.js
git commit -m "feat: update index.js to load exercise burned calories and today steps"
```

---

## Task 5: 首页 WXML + WXSS 新增运动消耗卡片

**Files:**
- Modify: `miniprogram/pages/index/index.wxml`
- Modify: `miniprogram/pages/index/index.wxss`

- [ ] **Step 1: 替换 index.wxml**

```xml
<view class="container">
  <!-- 日期 & 问候 -->
  <view class="header">
    <text class="greeting">{{greeting}}，{{nickname}} 🍊</text>
    <text class="date-text">{{dateStr}}</text>
  </view>

  <!-- 卡路里环形进度 -->
  <view class="card ring-card">
    <calorie-ring current="{{totalCalories}}" target="{{calorieTarget}}"></calorie-ring>
    <view class="ring-footer">
      <view class="ring-stat">
        <text class="stat-label">已摄入</text>
        <text class="stat-value text-number">{{totalCalories}}</text>
      </view>
      <view class="ring-stat">
        <text class="stat-label">目标</text>
        <text class="stat-value text-number">{{calorieTarget}}</text>
      </view>
      <view class="ring-stat">
        <text class="stat-label">已消耗🔥</text>
        <text class="stat-value text-number text-burned">{{totalBurned}}</text>
      </view>
      <view class="ring-stat">
        <text class="stat-label">剩余</text>
        <text class="stat-value text-number {{remaining < 0 ? 'over' : ''}}">{{remaining}}</text>
      </view>
    </view>
  </view>

  <!-- 营养素进度 -->
  <view class="card">
    <text class="section-title">营养素摄入</text>
    <nutrient-bar name="蛋白质" current="{{totalProtein}}" target="{{proteinTarget}}" color="#FF7A00"></nutrient-bar>
    <nutrient-bar name="碳水化合物" current="{{totalCarbs}}" target="{{carbsTarget}}" color="#4CAF50"></nutrient-bar>
    <nutrient-bar name="脂肪" current="{{totalFat}}" target="{{fatTarget}}" color="#2196F3"></nutrient-bar>
  </view>

  <!-- 三餐记录 -->
  <view class="section-title">今日饮食</view>
  <meal-card
    mealType="breakfast" mealName="早餐" icon="🌅" iconBg="#FFF3E0"
    calories="{{breakfastCal}}" foods="{{breakfastFoods}}"
    bind:add="onAddMeal" bind:foodDeleted="onFoodDeleted" bind:editFood="onEditFood"
  ></meal-card>
  <meal-card
    mealType="lunch" mealName="午餐" icon="☀️" iconBg="#E8F5E9"
    calories="{{lunchCal}}" foods="{{lunchFoods}}"
    bind:add="onAddMeal" bind:foodDeleted="onFoodDeleted" bind:editFood="onEditFood"
  ></meal-card>
  <meal-card
    mealType="dinner" mealName="晚餐" icon="🌙" iconBg="#E3F2FD"
    calories="{{dinnerCal}}" foods="{{dinnerFoods}}"
    bind:add="onAddMeal" bind:foodDeleted="onFoodDeleted" bind:editFood="onEditFood"
  ></meal-card>
  <meal-card
    mealType="snack" mealName="加餐" icon="🍪" iconBg="#F3E5F5"
    calories="{{snackCal}}" foods="{{snackFoods}}"
    bind:add="onAddMeal" bind:foodDeleted="onFoodDeleted" bind:editFood="onEditFood"
  ></meal-card>

  <!-- 运动消耗卡片 -->
  <view class="section-title">运动消耗</view>
  <view class="card exercise-summary-card">
    <!-- 消耗大卡行 -->
    <view class="exercise-row">
      <view class="exercise-icon-bg">🏋️</view>
      <view class="exercise-info">
        <text class="exercise-name">已消耗</text>
        <text class="exercise-cal">{{totalBurned}} 大卡</text>
      </view>
      <view class="exercise-add-btn" bindtap="onAddExercise">＋</view>
    </view>

    <view class="exercise-divider"></view>

    <!-- 步数行 -->
    <view class="steps-row">
      <view class="steps-icon-bg">🚶</view>
      <view class="steps-info">
        <view class="steps-name-row">
          <text class="steps-name">今日步数</text>
          <text class="steps-count">{{todaySteps}} / 6000</text>
        </view>
        <view class="steps-bar-bg">
          <view class="steps-bar-fill" style="width: {{todaySteps >= 6000 ? 100 : todaySteps / 60}}%"></view>
        </view>
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 2: 替换 index.wxss**

```css
.header {
  margin-bottom: 30rpx;
}

.greeting {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  display: block;
}

.date-text {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.ring-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ring-footer {
  display: flex;
  justify-content: space-around;
  width: 100%;
  margin-top: 30rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F5F5F5;
}

.ring-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
}

.stat-value {
  font-size: 34rpx;
  color: #333;
  font-weight: 700;
  margin-top: 4rpx;
}

.stat-value.over {
  color: #F44336;
}

.text-burned {
  color: #FF7A00;
}

/* ── 运动消耗卡片 ── */
.exercise-summary-card {
  padding: 24rpx;
}

.exercise-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.exercise-icon-bg {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #FFF3E0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  flex-shrink: 0;
}

.exercise-info {
  flex: 1;
}

.exercise-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.exercise-cal {
  font-size: 24rpx;
  color: #FF7A00;
  margin-top: 4rpx;
  display: block;
}

.exercise-add-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #FF7A00;
  color: #fff;
  font-size: 36rpx;
  line-height: 54rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(255,122,0,0.3);
  flex-shrink: 0;
}

.exercise-divider {
  height: 1rpx;
  background: #F5F5F5;
  margin: 20rpx 0;
}

/* ── 步数行 ── */
.steps-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.steps-icon-bg {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #E8F5E9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  flex-shrink: 0;
}

.steps-info {
  flex: 1;
}

.steps-name-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.steps-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.steps-count {
  font-size: 24rpx;
  color: #999;
}

.steps-bar-bg {
  height: 12rpx;
  background: #F0F0F0;
  border-radius: 6rpx;
  overflow: hidden;
}

.steps-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #81C784);
  border-radius: 6rpx;
  transition: width 0.4s ease;
}
```

- [ ] **Step 3: 在微信开发者工具中验证首页完整展示**

确认以下显示正确：
1. 热量环底部出现 4 列统计：已摄入 / 目标 / 已消耗🔥（橙色）/ 剩余
2. 在「加餐」meal-card 下方出现「运动消耗」section-title
3. 运动消耗卡片内：🏋️ 已消耗 xx 大卡 + ＋ 按钮
4. 步数行：🚶 今日步数 xxxx / 6000 + 绿色进度条
5. 点击 ＋ 按钮跳转到 exercise-search 页
6. 在 exercise-search 保存运动后返回首页，`totalBurned` 数值更新，`remaining` 公式正确

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/index/index.wxml miniprogram/pages/index/index.wxss
git commit -m "feat: add exercise card and steps bar to index page"
```

---

## 云数据库说明

在微信云开发控制台手动创建集合（如果尚未存在）：

1. 登录微信云开发控制台 → 数据库
2. 新建集合，名称：`exercise_records`
3. 权限设置：**仅创建者可读写**（默认）

第一次通过 `exercise_records.add()` 写入时如集合不存在也会自动创建，但提前创建可避免首次加载报"集合不存在"的 console 错误。
