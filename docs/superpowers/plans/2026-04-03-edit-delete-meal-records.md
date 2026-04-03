# 编辑/删除饮食记录 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页 meal-card 中支持食物条目左滑删除和点击跳转编辑，让用户可以修正或撤销已添加的饮食记录。

**Architecture:** meal-card 组件使用 `movable-area` + `movable-view` 实现左滑删除按钮；点击食物条目跳转新建的 `food-edit` 页面进行编辑；删除通过组件事件通知 index.js 立即更新本地 data，编辑通过 `onShow` 重新加载数据。

**Tech Stack:** 微信小程序原生（WXML/WXSS/JS）、微信云开发数据库（wx.cloud.database）、movable-area 组件

---

## 文件改动一览

| 文件 | 操作 |
|------|------|
| `miniprogram/components/meal-card/meal-card.wxml` | 修改：food-item 改为 movable-area/movable-view 结构 |
| `miniprogram/components/meal-card/meal-card.js` | 修改：添加滑动状态、删除确认、triggerEvent |
| `miniprogram/components/meal-card/meal-card.wxss` | 修改：添加滑块和删除按钮样式 |
| `miniprogram/pages/index/index.js` | 修改：监听 foodDeleted 事件，本地更新 data |
| `miniprogram/pages/index/index.wxml` | 修改：meal-card 绑定 bind:foodDeleted 和 bind:editFood |
| `miniprogram/pages/food-edit/food-edit.js` | 新建：加载记录、克重联动重算、保存 |
| `miniprogram/pages/food-edit/food-edit.wxml` | 新建：编辑表单 UI |
| `miniprogram/pages/food-edit/food-edit.wxss` | 新建：表单样式 |
| `miniprogram/pages/food-edit/food-edit.json` | 新建：页面配置 |
| `miniprogram/app.json` | 修改：新增 food-edit 路由 |

---

## Task 1：改造 meal-card 组件支持左滑删除和点击编辑

**Files:**
- Modify: `miniprogram/components/meal-card/meal-card.wxml`
- Modify: `miniprogram/components/meal-card/meal-card.js`
- Modify: `miniprogram/components/meal-card/meal-card.wxss`

- [ ] **Step 1: 替换 meal-card.wxml**

将 `miniprogram/components/meal-card/meal-card.wxml` 完整替换为：

```xml
<view class="meal-card">
  <view class="meal-header" bindtap="onTap">
    <view class="meal-icon-wrap" style="background: {{iconBg}};">
      <text class="meal-icon">{{icon}}</text>
    </view>
    <view class="meal-info">
      <text class="meal-name">{{mealName}}</text>
      <text class="meal-cal text-number">{{calories}} kcal</text>
    </view>
    <view class="meal-add">
      <text class="add-btn">+</text>
    </view>
  </view>

  <view class="meal-foods" wx:if="{{foods.length > 0}}">
    <view class="food-item-wrap" wx:for="{{foods}}" wx:key="_id">
      <movable-area class="slide-area">
        <movable-view
          class="slide-view"
          direction="horizontal"
          x="{{item._slideX || 0}}"
          damping="50"
          bindchange="onSlideChange"
          data-index="{{index}}"
          bindtouchstart="onTouchStart"
        >
          <view class="food-item-inner" bindtap="onEditFood" data-index="{{index}}">
            <text class="food-name">{{item.food_name}}</text>
            <text class="food-cal text-number">{{item.calories}} kcal</text>
          </view>
        </movable-view>
        <view class="delete-btn" bindtap="onDeleteFood" data-index="{{index}}">
          <text class="delete-text">删除</text>
        </view>
      </movable-area>
    </view>
  </view>

  <view class="meal-empty" wx:else>
    <text class="empty-text">点击添加食物</text>
  </view>
</view>
```

- [ ] **Step 2: 替换 meal-card.js**

将 `miniprogram/components/meal-card/meal-card.js` 完整替换为：

```javascript
const db = wx.cloud.database();

Component({
  properties: {
    mealType: { type: String, value: 'breakfast' },
    mealName: { type: String, value: '早餐' },
    icon: { type: String, value: '🌅' },
    iconBg: { type: String, value: '#FFF3E0' },
    calories: { type: Number, value: 0 },
    foods: { type: Array, value: [] }
  },

  data: {
    slideIndex: -1
  },

  methods: {
    onTap() {
      // 若有滑开的条目，先复位
      if (this.data.slideIndex >= 0) {
        this._resetSlide();
        return;
      }
      this.triggerEvent('add', { mealType: this.data.mealType });
    },

    onTouchStart() {
      // 记录触摸开始，用于区分滑动和点击
    },

    onSlideChange(e) {
      const index = e.currentTarget.dataset.index;
      const x = e.detail.x;
      const foods = this.data.foods;

      // 先复位其他滑开的条目
      if (this.data.slideIndex >= 0 && this.data.slideIndex !== index) {
        this._resetSlide();
      }

      if (x <= -80) {
        // 吸附到 -160（完全露出删除按钮）
        const newFoods = foods.map((f, i) => ({
          ...f,
          _slideX: i === index ? -160 : 0
        }));
        this.setData({ foods: newFoods, slideIndex: index });
      } else if (x >= -20) {
        // 复位
        const newFoods = foods.map((f, i) => ({
          ...f,
          _slideX: i === index ? 0 : f._slideX || 0
        }));
        this.setData({ foods: newFoods, slideIndex: -1 });
      }
    },

    _resetSlide() {
      const newFoods = this.data.foods.map(f => ({ ...f, _slideX: 0 }));
      this.setData({ foods: newFoods, slideIndex: -1 });
    },

    onEditFood(e) {
      // 若当前有滑开条目，先复位，不跳转
      if (this.data.slideIndex >= 0) {
        this._resetSlide();
        return;
      }
      const index = e.currentTarget.dataset.index;
      const food = this.data.foods[index];
      if (!food || !food._id) return;
      this.triggerEvent('editFood', { id: food._id });
    },

    onDeleteFood(e) {
      const index = e.currentTarget.dataset.index;
      const food = this.data.foods[index];
      if (!food || !food._id) return;

      wx.showModal({
        title: '确认删除',
        content: `确认删除「${food.food_name}」？`,
        confirmColor: '#FF4444',
        success: (res) => {
          if (!res.confirm) {
            this._resetSlide();
            return;
          }
          wx.showLoading({ title: '删除中...' });
          db.collection('meal_records').doc(food._id).remove().then(() => {
            wx.hideLoading();
            // 本地移除
            const newFoods = this.data.foods.filter((_, i) => i !== index)
              .map(f => ({ ...f, _slideX: 0 }));
            this.setData({ foods: newFoods, slideIndex: -1 });
            // 通知父页面更新汇总
            this.triggerEvent('foodDeleted', {
              _id: food._id,
              mealType: this.data.mealType,
              calories: food.calories || 0,
              protein: food.protein || 0,
              carbs: food.carbs || 0,
              fat: food.fat || 0
            });
          }).catch(() => {
            wx.hideLoading();
            this._resetSlide();
            wx.showToast({ title: '删除失败，请重试', icon: 'error' });
          });
        }
      });
    }
  }
});
```

- [ ] **Step 3: 更新 meal-card.wxss**

在 `miniprogram/components/meal-card/meal-card.wxss` 末尾追加以下样式（保留原有样式不动）：

```css
/* 左滑删除 */
.food-item-wrap {
  overflow: hidden;
  position: relative;
}

.slide-area {
  width: calc(100% + 160rpx);
  height: 72rpx;
  position: relative;
}

.slide-view {
  width: calc(100% - 160rpx);
  height: 72rpx;
  background: #fff;
  display: flex;
  align-items: center;
  z-index: 1;
}

.food-item-inner {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.delete-btn {
  position: absolute;
  right: 0;
  top: 0;
  width: 160rpx;
  height: 72rpx;
  background: #FF4444;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-text {
  color: #fff;
  font-size: 28rpx;
}
```

- [ ] **Step 4: 手动验证滑动效果**

在微信开发者工具编译后：
1. 进入首页，找到有食物的餐次卡片
2. 左滑食物条目 → 应出现红色"删除"按钮
3. 点击删除 → 弹出确认弹窗
4. 确认删除 → 条目消失，首页卡路里立即更新（Task 2 完成后验证）
5. 点击另一条目滑动 → 前一条目自动复位

- [ ] **Step 5: Commit**

```bash
git add miniprogram/components/meal-card/
git commit -m "feat: meal-card 支持左滑删除和点击编辑触发事件"
```

---

## Task 2：index.js 和 index.wxml 监听事件并即时刷新

**Files:**
- Modify: `miniprogram/pages/index/index.js`
- Modify: `miniprogram/pages/index/index.wxml`

- [ ] **Step 1: 在 index.js 中新增 onFoodDeleted 和 onEditFood 方法**

在 `miniprogram/pages/index/index.js` 的 `onAddMeal` 方法后面追加以下两个方法：

```javascript
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
      remaining: this.data.calorieTarget - Math.max(0, newTotalCalories)
    });
  },

  onEditFood(e) {
    const { id } = e.detail;
    wx.navigateTo({
      url: `/pages/food-edit/food-edit?id=${id}`
    });
  },
```

- [ ] **Step 2: 在 index.wxml 的每个 meal-card 上绑定新事件**

在 `miniprogram/pages/index/index.wxml` 中，将四个 `<meal-card>` 标签各自加上 `bind:foodDeleted="onFoodDeleted"` 和 `bind:editFood="onEditFood"`。

将原来的四个 meal-card 替换为：

```xml
  <meal-card
    mealType="breakfast"
    mealName="早餐"
    icon="🌅"
    iconBg="#FFF3E0"
    calories="{{breakfastCal}}"
    foods="{{breakfastFoods}}"
    bind:add="onAddMeal"
    bind:foodDeleted="onFoodDeleted"
    bind:editFood="onEditFood"
  ></meal-card>
  <meal-card
    mealType="lunch"
    mealName="午餐"
    icon="☀️"
    iconBg="#E8F5E9"
    calories="{{lunchCal}}"
    foods="{{lunchFoods}}"
    bind:add="onAddMeal"
    bind:foodDeleted="onFoodDeleted"
    bind:editFood="onEditFood"
  ></meal-card>
  <meal-card
    mealType="dinner"
    mealName="晚餐"
    icon="🌙"
    iconBg="#E3F2FD"
    calories="{{dinnerCal}}"
    foods="{{dinnerFoods}}"
    bind:add="onAddMeal"
    bind:foodDeleted="onFoodDeleted"
    bind:editFood="onEditFood"
  ></meal-card>
  <meal-card
    mealType="snack"
    mealName="加餐"
    icon="🍪"
    iconBg="#F3E5F5"
    calories="{{snackCal}}"
    foods="{{snackFoods}}"
    bind:add="onAddMeal"
    bind:foodDeleted="onFoodDeleted"
    bind:editFood="onEditFood"
  ></meal-card>
```

- [ ] **Step 3: 手动验证删除后首页立即更新**

在微信开发者工具：
1. 确保首页有食物记录
2. 左滑某食物 → 确认删除
3. 观察：该条目消失，餐次卡路里、顶部环形图总卡路里、剩余卡路里**立即**更新，无需下拉刷新

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/index/index.js miniprogram/pages/index/index.wxml
git commit -m "feat: index 监听 foodDeleted/editFood 事件，删除后立即刷新汇总"
```

---

## Task 3：新建 food-edit 编辑页

**Files:**
- Create: `miniprogram/pages/food-edit/food-edit.json`
- Create: `miniprogram/pages/food-edit/food-edit.wxml`
- Create: `miniprogram/pages/food-edit/food-edit.wxss`
- Create: `miniprogram/pages/food-edit/food-edit.js`
- Modify: `miniprogram/app.json`

- [ ] **Step 1: 创建 food-edit.json**

新建文件 `miniprogram/pages/food-edit/food-edit.json`，内容：

```json
{
  "navigationBarTitleText": "编辑食物",
  "navigationBarBackgroundColor": "#FF7A00",
  "navigationBarTextStyle": "white",
  "backgroundColor": "#FFF3E0"
}
```

- [ ] **Step 2: 创建 food-edit.wxml**

新建文件 `miniprogram/pages/food-edit/food-edit.wxml`，内容：

```xml
<view class="container">
  <view class="form-card">
    <view class="form-item">
      <text class="label">食物名称</text>
      <input
        class="input"
        value="{{foodName}}"
        placeholder="请输入食物名称"
        bindinput="onInputFoodName"
      />
    </view>
    <view class="form-item">
      <text class="label">克重 (g)</text>
      <input
        class="input"
        type="digit"
        value="{{amount}}"
        placeholder="请输入克重"
        bindinput="onInputAmount"
        bindblur="onAmountBlur"
      />
    </view>
    <view class="divider"></view>
    <view class="form-item">
      <text class="label">卡路里 (kcal)</text>
      <input
        class="input"
        type="digit"
        value="{{calories}}"
        placeholder="请输入卡路里"
        bindinput="onInputCalories"
      />
    </view>
    <view class="form-item">
      <text class="label">蛋白质 (g)</text>
      <input
        class="input"
        type="digit"
        value="{{protein}}"
        placeholder="请输入蛋白质"
        bindinput="onInputProtein"
      />
    </view>
    <view class="form-item">
      <text class="label">碳水化合物 (g)</text>
      <input
        class="input"
        type="digit"
        value="{{carbs}}"
        placeholder="请输入碳水化合物"
        bindinput="onInputCarbs"
      />
    </view>
    <view class="form-item">
      <text class="label">脂肪 (g)</text>
      <input
        class="input"
        type="digit"
        value="{{fat}}"
        placeholder="请输入脂肪"
        bindinput="onInputFat"
      />
    </view>
  </view>

  <view class="btn-wrap">
    <button class="save-btn" bindtap="onSave" loading="{{saving}}">保存</button>
  </view>
</view>
```

- [ ] **Step 3: 创建 food-edit.wxss**

新建文件 `miniprogram/pages/food-edit/food-edit.wxss`，内容：

```css
.container {
  padding: 24rpx;
  background: #FFF3E0;
  min-height: 100vh;
}

.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 0 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}

.form-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.form-item:last-child {
  border-bottom: none;
}

.label {
  width: 220rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  text-align: right;
}

.divider {
  height: 12rpx;
  background: #FFF3E0;
  margin: 0 -24rpx;
}

.btn-wrap {
  margin-top: 48rpx;
  padding: 0 24rpx;
}

.save-btn {
  background: #FF7A00;
  color: #fff;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: 600;
  height: 96rpx;
  line-height: 96rpx;
  border: none;
}
```

- [ ] **Step 4: 创建 food-edit.js**

新建文件 `miniprogram/pages/food-edit/food-edit.js`，内容：

```javascript
const db = wx.cloud.database();

Page({
  data: {
    id: '',
    foodName: '',
    amount: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    _originalAmount: 0,
    _originalCalories: 0,
    _originalProtein: 0,
    _originalCarbs: 0,
    _originalFat: 0,
    saving: false
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      wx.navigateBack();
      return;
    }
    this.setData({ id });
    this.loadRecord(id);
  },

  loadRecord(id) {
    wx.showLoading({ title: '加载中...' });
    db.collection('meal_records').doc(id).get().then(res => {
      wx.hideLoading();
      const r = res.data;
      const amount = String(r.amount || '');
      const calories = String(r.calories || '');
      const protein = String(r.protein || '');
      const carbs = String(r.carbs || '');
      const fat = String(r.fat || '');
      this.setData({
        foodName: r.food_name || '',
        amount,
        calories,
        protein,
        carbs,
        fat,
        _originalAmount: parseFloat(amount) || 0,
        _originalCalories: parseFloat(calories) || 0,
        _originalProtein: parseFloat(protein) || 0,
        _originalCarbs: parseFloat(carbs) || 0,
        _originalFat: parseFloat(fat) || 0
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'error' });
      wx.navigateBack();
    });
  },

  onInputFoodName(e) {
    this.setData({ foodName: e.detail.value });
  },

  onInputAmount(e) {
    this.setData({ amount: e.detail.value });
  },

  onAmountBlur() {
    const newAmount = parseFloat(this.data.amount);
    const oldAmount = this.data._originalAmount;
    if (!newAmount || newAmount <= 0 || newAmount === oldAmount) return;

    wx.showModal({
      title: '重算营养数据',
      content: '是否按克重比例自动重算营养数据？',
      confirmText: '重算',
      cancelText: '手动改',
      success: (res) => {
        if (!res.confirm) return;
        const ratio = newAmount / oldAmount;
        this.setData({
          calories: String(Math.round(this.data._originalCalories * ratio)),
          protein: String((this.data._originalProtein * ratio).toFixed(1)),
          carbs: String((this.data._originalCarbs * ratio).toFixed(1)),
          fat: String((this.data._originalFat * ratio).toFixed(1))
        });
      }
    });
  },

  onInputCalories(e) {
    this.setData({ calories: e.detail.value });
  },

  onInputProtein(e) {
    this.setData({ protein: e.detail.value });
  },

  onInputCarbs(e) {
    this.setData({ carbs: e.detail.value });
  },

  onInputFat(e) {
    this.setData({ fat: e.detail.value });
  },

  onSave() {
    const { id, foodName, amount, calories, protein, carbs, fat } = this.data;

    if (!foodName.trim()) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' });
      return;
    }
    const amountNum = parseFloat(amount);
    const caloriesNum = parseFloat(calories);
    const proteinNum = parseFloat(protein);
    const carbsNum = parseFloat(carbs);
    const fatNum = parseFloat(fat);

    if (!amountNum || amountNum <= 0) {
      wx.showToast({ title: '克重必须大于 0', icon: 'none' });
      return;
    }
    if (isNaN(caloriesNum) || caloriesNum < 0) {
      wx.showToast({ title: '请输入有效的卡路里', icon: 'none' });
      return;
    }
    if (isNaN(proteinNum) || proteinNum < 0 ||
        isNaN(carbsNum) || carbsNum < 0 ||
        isNaN(fatNum) || fatNum < 0) {
      wx.showToast({ title: '营养数据不能为负数', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    db.collection('meal_records').doc(id).update({
      data: {
        food_name: foodName.trim(),
        amount: amountNum,
        calories: Math.round(caloriesNum),
        protein: parseFloat(proteinNum.toFixed(1)),
        carbs: parseFloat(carbsNum.toFixed(1)),
        fat: parseFloat(fatNum.toFixed(1))
      }
    }).then(() => {
      this.setData({ saving: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    }).catch(() => {
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    });
  }
});
```

- [ ] **Step 5: 在 app.json 中注册 food-edit 页面**

在 `miniprogram/app.json` 的 `pages` 数组末尾添加 `"pages/food-edit/food-edit"`：

```json
{
  "pages": [
    "pages/index/index",
    "pages/record/record",
    "pages/analysis/analysis",
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
      { "pagePath": "pages/index/index", "text": "首页" },
      { "pagePath": "pages/analysis/analysis", "text": "分析" },
      { "pagePath": "pages/profile/profile", "text": "我的" }
    ]
  },
  "cloud": true,
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
```

- [ ] **Step 6: 手动验证编辑流程**

在微信开发者工具：
1. 首页点击某食物条目（非左滑区域）→ 应跳转到「编辑食物」页面
2. 页面应显示该食物的当前数据（名称、克重、卡路里等）
3. 修改克重 → 失焦后弹出"是否按比例重算"弹窗
4. 选择重算 → 卡路里等数值自动更新
5. 点击保存 → 提示"保存成功"→ 自动返回首页
6. 首页 `onShow` 触发 → 数据刷新为最新值

- [ ] **Step 7: Commit**

```bash
git add miniprogram/pages/food-edit/ miniprogram/app.json
git commit -m "feat: 新建 food-edit 编辑页，支持修改食物名称/克重/营养数据"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 左滑删除（movable-area）→ Task 1
- ✅ 点击跳转编辑页 → Task 1 (onEditFood) + Task 3 (food-edit 页)
- ✅ 编辑可改所有字段 → Task 3 food-edit.js
- ✅ 克重联动重算 → Task 3 onAmountBlur
- ✅ 删除后立即刷新首页 → Task 2 onFoodDeleted
- ✅ 编辑后 onShow 刷新 → 现有 index.js onShow 已有 loadTodayRecords，无需改动
- ✅ 同时滑开多条目自动复位 → Task 1 onSlideChange
- ✅ 删除失败 toast → Task 1 catch
- ✅ 编辑保存失败 toast → Task 3 catch
- ✅ 克重 <= 0 校验 → Task 3 onSave
- ✅ app.json 注册新页面 → Task 3 Step 5

**Placeholder scan:** 无 TBD/TODO

**Type consistency:** `foodDeleted` 事件在 meal-card.js triggerEvent 和 index.js onFoodDeleted 参数一致；`editFood` 事件在 meal-card.js triggerEvent 和 index.js onEditFood 一致；food-edit.js 使用 `id` query param，meal-card.js triggerEvent 携带 `id` 字段，index.js `onEditFood` 使用 `e.detail.id` — 全部一致。
