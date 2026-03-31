# 切换云开发模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将所有页面从本地存储（localDB）切回微信云开发数据库（wx.cloud.database），实现线上数据持久化。

**Architecture:** 直接替换方案——删除 localDB 依赖，恢复 wx.cloud 调用。app.js 恢复云开发初始化与 openid 获取；各页面的增删查改操作改回 wx.cloud.database() API；photoRecognize 拍照功能暂保留占位但不接入云函数。

**Tech Stack:** 微信小程序原生、微信云开发（CloudBase）、wx.cloud.database()

---

## 文件改动一览

| 文件 | 操作 |
|------|------|
| `miniprogram/app.js` | 恢复云开发 init + login 云函数获取 openid |
| `miniprogram/app.json` | `"cloud": true` |
| `miniprogram/pages/onboarding/onboarding.js` | 替换 localDB.add → db.collection().add() |
| `miniprogram/pages/index/index.js` | 替换 localDB.query → db.collection().where().get() |
| `miniprogram/pages/record/record.js` | 替换 localDB.add → db.collection().add() |
| `miniprogram/pages/food-search/food-search.js` | 替换 localDB.add → db.collection().add() |
| `miniprogram/pages/photo-result/photo-result.js` | 替换 localDB.add → db.collection().add() |
| `miniprogram/pages/food-detail/food-detail.js` | 替换 localDB.add → db.collection().add() |
| `miniprogram/pages/analysis/analysis.js` | 替换 localDB.query → db.collection().where().get()，用 _.in() |
| `miniprogram/pages/profile/profile.js` | 替换 localDB.query/update → db.collection() |
| `miniprogram/utils/localDB.js` | 保留不删（本地调试备用） |

---

## Task 1：恢复 app.js 云开发初始化

**Files:**
- Modify: `miniprogram/app.js`

- [ ] **Step 1：将 app.js 改回云开发模式**

将文件内容替换为：

```js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({ traceUser: true });
    this.checkOnboarding();
  },

  globalData: {
    userInfo: null,
    dailySummary: null,
    todayRecords: [],
    openid: ''
  },

  checkOnboarding() {
    const db = wx.cloud.database();
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result.openid;
      this.globalData.openid = openid;

      db.collection('users').where({ _id: openid }).get().then(res => {
        if (res.data.length === 0) {
          wx.navigateTo({ url: '/pages/onboarding/onboarding' });
        } else {
          this.globalData.userInfo = res.data[0];
        }
      });
    }).catch(err => {
      console.error('login 云函数调用失败', err);
    });
  }
});
```

- [ ] **Step 2：恢复 app.json 的 cloud 标志**

将 `miniprogram/app.json` 中：
```json
"cloud": false,
```
改为：
```json
"cloud": true,
```

- [ ] **Step 3：确认云开发控制台已创建 `login` 云函数**

在微信开发者工具云开发控制台 → 云函数 → 确认有名为 `login` 的函数。
如果没有，在 `miniprogram/cloudfunctions/login/` 创建：

```js
// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init();
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  return { openid: OPENID };
};
```

并在开发者工具右键上传部署。

- [ ] **Step 4：commit**

```bash
git add miniprogram/app.js miniprogram/app.json
git commit -m "feat: 恢复云开发初始化和 openid 获取"
```

---

## Task 2：恢复 onboarding 页面

**Files:**
- Modify: `miniprogram/pages/onboarding/onboarding.js`

- [ ] **Step 1：替换 import 和 submit 方法**

将文件头部：
```js
const { calcDailyTarget } = require('../../utils/bmr');
const { localDB, serverDate, LOCAL_OPENID } = require('../../utils/localDB');
```
改为：
```js
const { calcDailyTarget } = require('../../utils/bmr');
```

将 `submit()` 方法中的存储部分：
```js
    this.setData({ submitting: true });

    const app = getApp();
    const openid = LOCAL_OPENID;

    const userData = {
      _id: openid,
      ...
      created_at: serverDate()
    };

    localDB.add('users', userData).then(() => {
```
改为：
```js
    this.setData({ submitting: true });

    const app = getApp();
    const openid = app.globalData.openid;
    const db = wx.cloud.database();

    const userData = {
      _id: openid,
      nickname: form.nickname.trim(),
      gender: form.gender,
      birthday: form.birthday,
      height: parseFloat(form.height),
      weight: parseFloat(form.weight),
      target_weight: parseFloat(form.target_weight) || parseFloat(form.weight),
      goal: form.goal,
      activity_level: form.activity_level,
      daily_calorie_target: dailyCalorieTarget,
      created_at: db.serverDate()
    };

    db.collection('users').add({ data: userData }).then(() => {
```

- [ ] **Step 2：commit**

```bash
git add miniprogram/pages/onboarding/onboarding.js
git commit -m "feat: onboarding 切回云数据库"
```

---

## Task 3：恢复 index 首页

**Files:**
- Modify: `miniprogram/pages/index/index.js`

- [ ] **Step 1：替换 import**

将：
```js
const { localDB, LOCAL_OPENID } = require('../../utils/localDB');
```
删除（仅保留原有的两行 require）：
```js
const { getToday } = require('../../utils/date');
const { sumNutrition, recommendedNutrients } = require('../../utils/nutrition');
```

- [ ] **Step 2：替换 loadTodayRecords()**

将：
```js
  loadTodayRecords() {
    const today = getToday();

    localDB.query('meal_records', { date: today }).then(res => {
```
改为：
```js
  loadTodayRecords() {
    const db = wx.cloud.database();
    const today = getToday();

    db.collection('meal_records').where({ date: today }).get().then(res => {
```

- [ ] **Step 3：commit**

```bash
git add miniprogram/pages/index/index.js
git commit -m "feat: index 首页切回云数据库"
```

---

## Task 4：恢复 record 记录页

**Files:**
- Modify: `miniprogram/pages/record/record.js`

- [ ] **Step 1：替换 import**

将：
```js
const { localDB, serverDate } = require('../../utils/localDB');
```
删除，仅保留：
```js
const { getToday } = require('../../utils/date');
```

- [ ] **Step 2：替换 submitManual() 中的存储**

将：
```js
    const record = {
      ...
      created_at: serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    localDB.add('meal_records', record).then(() => {
```
改为：
```js
    const db = wx.cloud.database();
    const record = {
      date: getToday(),
      meal_type: this.data.mealType,
      food_name: f.food_name,
      amount: amount,
      calories: parseFloat(f.calories) || 0,
      protein: parseFloat(f.protein) || 0,
      carbs: parseFloat(f.carbs) || 0,
      fat: parseFloat(f.fat) || 0,
      source: 'manual',
      created_at: db.serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    db.collection('meal_records').add({ data: record }).then(() => {
```

- [ ] **Step 3：commit**

```bash
git add miniprogram/pages/record/record.js
git commit -m "feat: record 页切回云数据库"
```

---

## Task 5：恢复 food-search 搜索页

**Files:**
- Modify: `miniprogram/pages/food-search/food-search.js`

- [ ] **Step 1：替换 import**

将：
```js
const { localDB, serverDate } = require('../../utils/localDB');
```
删除，仅保留：
```js
const { getToday } = require('../../utils/date');
const { calcNutrition } = require('../../utils/nutrition');
```

- [ ] **Step 2：替换 confirmAdd() 中的存储**

将：
```js
    const record = {
      ...
      created_at: serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    localDB.add('meal_records', record).then(() => {
```
改为：
```js
    const db = wx.cloud.database();
    const record = {
      date: getToday(),
      meal_type: this.data.mealType,
      food_id: food.food_id || '',
      food_name: food.food_name,
      amount: amount,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      source: 'search',
      created_at: db.serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    db.collection('meal_records').add({ data: record }).then(() => {
```

- [ ] **Step 3：commit**

```bash
git add miniprogram/pages/food-search/food-search.js
git commit -m "feat: food-search 页切回云数据库"
```

---

## Task 6：恢复 photo-result 拍照结果页

**Files:**
- Modify: `miniprogram/pages/photo-result/photo-result.js`

- [ ] **Step 1：替换 import**

将：
```js
const { localDB, serverDate } = require('../../utils/localDB');
```
删除，仅保留：
```js
const { getToday } = require('../../utils/date');
```

- [ ] **Step 2：替换 confirmAll() 中的存储**

将：
```js
    const today = getToday();
    const promises = this.data.foods.map(food => {
      return localDB.add('meal_records', {
        date: today,
        meal_type: this.data.mealType,
        food_name: food.food_name,
        amount: food.estimated_amount || 100,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: 'photo',
        created_at: serverDate()
      });
    });
```
改为：
```js
    const db = wx.cloud.database();
    const today = getToday();
    const promises = this.data.foods.map(food => {
      return db.collection('meal_records').add({
        data: {
          date: today,
          meal_type: this.data.mealType,
          food_name: food.food_name,
          amount: food.estimated_amount || 100,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          source: 'photo',
          created_at: db.serverDate()
        }
      });
    });
```

- [ ] **Step 3：commit**

```bash
git add miniprogram/pages/photo-result/photo-result.js
git commit -m "feat: photo-result 页切回云数据库"
```

---

## Task 7：恢复 food-detail 详情页

**Files:**
- Modify: `miniprogram/pages/food-detail/food-detail.js`

- [ ] **Step 1：替换 import**

将：
```js
const { localDB, serverDate } = require('../../utils/localDB');
```
删除，仅保留：
```js
const { getToday } = require('../../utils/date');
const { calcNutrition } = require('../../utils/nutrition');
```

- [ ] **Step 2：替换 submit() 中的存储**

将：
```js
    const record = {
      ...
      created_at: serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    localDB.add('meal_records', record)
```
改为：
```js
    const db = wx.cloud.database();
    const record = {
      date: getToday(),
      meal_type: this.data.mealType,
      food_name: f.food_name.trim(),
      amount,
      calories,
      protein: parseFloat(f.protein) || 0,
      carbs: parseFloat(f.carbs) || 0,
      fat: parseFloat(f.fat) || 0,
      source: this.data.food ? 'search' : 'manual',
      created_at: db.serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    db.collection('meal_records').add({ data: record })
```

- [ ] **Step 3：commit**

```bash
git add miniprogram/pages/food-detail/food-detail.js
git commit -m "feat: food-detail 页切回云数据库"
```

---

## Task 8：恢复 analysis 分析页

**Files:**
- Modify: `miniprogram/pages/analysis/analysis.js`

- [ ] **Step 1：替换 import**

将：
```js
const { localDB, command } = require('../../utils/localDB');
```
删除，仅保留：
```js
const { getRecentDays, getShortDate } = require('../../utils/date');
```

- [ ] **Step 2：替换 loadData() 中的查询**

将：
```js
    localDB.query('daily_summary', { date: command.in(days) })
      .then(res => {
```
改为：
```js
    const db = wx.cloud.database();
    const _ = db.command;
    db.collection('daily_summary')
      .where({ date: _.in(days) })
      .get()
      .then(res => {
```

- [ ] **Step 3：替换 loadTodayNutrients() 中的查询**

将：
```js
    localDB.query('meal_records', { date: today })
      .then(res => {
```
改为：
```js
    const db = wx.cloud.database();
    db.collection('meal_records')
      .where({ date: today })
      .get()
      .then(res => {
```

- [ ] **Step 4：commit**

```bash
git add miniprogram/pages/analysis/analysis.js
git commit -m "feat: analysis 页切回云数据库"
```

---

## Task 9：恢复 profile 我的页面

**Files:**
- Modify: `miniprogram/pages/profile/profile.js`

- [ ] **Step 1：替换 import**

将：
```js
const { localDB, serverDate, LOCAL_OPENID } = require('../../utils/localDB');
```
删除，仅保留：
```js
const { calcDailyTarget } = require('../../utils/bmr');
```

- [ ] **Step 2：替换 loadStreak()**

将：
```js
  loadStreak() {
    localDB.query('daily_summary', {}).then(res => {
      const summaries = res.data.sort((a, b) => b.date.localeCompare(a.date));
```
改为：
```js
  loadStreak() {
    const db = wx.cloud.database();
    db.collection('daily_summary')
      .orderBy('date', 'desc')
      .limit(60)
      .get()
      .then(res => {
        const summaries = res.data;
```

- [ ] **Step 3：替换 loadAchievements()**

将：
```js
  loadAchievements() {
    localDB.query('achievements', {}).then(res => {
```
改为：
```js
  loadAchievements() {
    const db = wx.cloud.database();
    db.collection('achievements').get().then(res => {
```

- [ ] **Step 4：替换 saveEdit() 中的更新**

将：
```js
    localDB.update('users', user._id, {
      nickname: updatedUser.nickname,
      height: updatedUser.height,
      weight: updatedUser.weight,
      target_weight: updatedUser.target_weight,
      goal: updatedUser.goal,
      activity_level: updatedUser.activity_level,
      daily_calorie_target: updatedUser.daily_calorie_target
    }).then(() => {
```
改为：
```js
    const db = wx.cloud.database();
    db.collection('users').doc(user._id).update({
      data: {
        nickname: updatedUser.nickname,
        height: updatedUser.height,
        weight: updatedUser.weight,
        target_weight: updatedUser.target_weight,
        goal: updatedUser.goal,
        activity_level: updatedUser.activity_level,
        daily_calorie_target: updatedUser.daily_calorie_target
      }
    }).then(() => {
```

- [ ] **Step 5：commit**

```bash
git add miniprogram/pages/profile/profile.js
git commit -m "feat: profile 页切回云数据库"
```

---

## Task 10：部署 login 云函数并验证

- [ ] **Step 1：确认 cloudfunctions/login 目录存在**

若不存在，创建 `miniprogram/cloudfunctions/login/index.js`：

```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  return { openid: OPENID };
};
```

和 `miniprogram/cloudfunctions/login/package.json`：
```json
{
  "name": "login",
  "version": "1.0.0",
  "main": "index.js"
}
```

- [ ] **Step 2：在微信开发者工具部署云函数**

右键 `cloudfunctions/login` 目录 → 「上传并部署：云端安装依赖」

- [ ] **Step 3：在微信开发者工具创建数据集合**

云开发控制台 → 数据库 → 依次创建：
- `users`
- `meal_records`
- `daily_summary`
- `achievements`

- [ ] **Step 4：编译运行，验证引导页正常打开**

点击「编译」，模拟器应跳转到 onboarding 引导页（因为 users 集合为空）。

- [ ] **Step 5：完整流程验证**

- 完成引导页填写 → 进入首页 ✅
- 搜索食物并添加 → 首页卡路里更新 ✅
- 切换到分析页 → 图表显示 ✅
- 切换到我的页面 → 个人信息显示 ✅

- [ ] **Step 6：最终 commit**

```bash
git add miniprogram/cloudfunctions/login/
git commit -m "feat: 完成切换云开发模式，所有页面已接入云数据库"
```
