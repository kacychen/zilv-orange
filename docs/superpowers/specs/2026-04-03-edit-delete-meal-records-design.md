# 编辑/删除饮食记录 Design Spec

**Date:** 2026-04-03
**Feature:** 支持用户对已记录的食物条目进行左滑删除和点击编辑操作

---

## 目标

用户添加食物后，若克重估算有误或需要撤销，目前无法修改或删除。本功能补全这一核心交互，提升记录准确性和使用体验。

---

## 用户交互设计

### 左滑删除

- 首页每个 meal-card 中的食物条目支持左滑
- 左滑后右侧滑出红色"删除"按钮（宽 160rpx）
- 点击删除按钮弹出 `wx.showModal` 确认弹窗："确认删除「{food_name}」？"
- 确认后：
  1. 调用 `db.collection('meal_records').doc(_id).remove()`
  2. 触发组件事件 `foodDeleted`，携带 `{ _id, mealType, calories, protein, carbs, fat }`
  3. index.js 收到事件后从本地 data 中移除该条目并重新计算汇总，**立即刷新首页，不重新请求 DB**
- 取消则关闭弹窗，滑块复位

### 点击食物条目跳转编辑

- 点击食物条目正文区域（非滑块区域）跳转编辑页
- `wx.navigateTo({ url: '/pages/food-edit/food-edit?id={_id}' })`

### 编辑页（food-edit）

- 导航栏标题：「编辑食物」
- 表单字段（全部可编辑）：
  - 食物名称（文本）
  - 克重 g（数字）
  - 卡路里 kcal（数字）
  - 蛋白质 g（数字，一位小数）
  - 碳水化合物 g（数字，一位小数）
  - 脂肪 g（数字，一位小数）
- **克重联动逻辑**：用户修改克重后弹出 `wx.showModal`："是否按比例重算营养数据？"
  - 确认：按 `newAmount / oldAmount` 比例重算卡路里/蛋白质/碳水/脂肪，填入输入框
  - 取消：保留原营养数据，用户自行修改
- 底部固定"保存"按钮
- 保存校验：所有字段非空，克重/卡路里/营养数据均为合法正数
- 保存成功：调用 `db.collection('meal_records').doc(_id).update()`，然后 `wx.navigateBack()`
- 返回后 index.js `onShow` 触发 `loadTodayRecords()` 刷新

---

## 架构设计

### 文件改动一览

| 文件 | 操作 |
|------|------|
| `miniprogram/components/meal-card/meal-card.wxml` | 修改：food-item 包裹 movable-area/movable-view，添加删除按钮 |
| `miniprogram/components/meal-card/meal-card.js` | 修改：添加滑动状态管理、删除确认、triggerEvent |
| `miniprogram/components/meal-card/meal-card.wxss` | 修改：添加滑块、删除按钮样式 |
| `miniprogram/pages/index/index.js` | 修改：监听 foodDeleted 事件，本地更新 data |
| `miniprogram/pages/index/index.wxml` | 修改：meal-card 绑定 bind:foodDeleted |
| `miniprogram/pages/food-edit/food-edit.js` | 新建：加载记录、表单逻辑、保存 |
| `miniprogram/pages/food-edit/food-edit.wxml` | 新建：编辑表单 UI |
| `miniprogram/pages/food-edit/food-edit.wxss` | 新建：表单样式 |
| `miniprogram/pages/food-edit/food-edit.json` | 新建：页面配置 |
| `miniprogram/app.json` | 修改：新增 food-edit 路由 |

---

## 数据流

### 删除流程

```
用户左滑 → 点击删除按钮
  → wx.showModal 确认
  → db.doc(_id).remove()
  → triggerEvent('foodDeleted', { _id, mealType, calories, protein, carbs, fat })
  → index.js onFoodDeleted(e)
    → 从 {mealType}Foods 数组中过滤掉该 _id
    → 重新计算 {mealType}Cal、totalCalories、totalProtein、totalCarbs、totalFat、remaining
    → setData() 立即更新首页
```

### 编辑流程

```
用户点击食物条目
  → wx.navigateTo('/pages/food-edit/food-edit?id=xxx')
  → food-edit.onLoad: db.doc(id).get() 加载当前数据填入表单
  → 用户编辑字段（可选触发克重联动重算）
  → 点击保存
    → 校验字段
    → db.doc(id).update({ data: updatedFields })
    → wx.navigateBack()
  → index.js onShow → loadTodayRecords() 刷新
```

---

## meal-card 组件滑动实现

使用微信原生 `movable-area` + `movable-view` 实现左滑效果：

```
每个 food-item 结构：
┌─────────────────────────────────────────┐
│ movable-area（宽度 = 屏幕宽 + 160rpx） │
│  ┌──────────────────────────┬─────────┐ │
│  │ movable-view（食物信息） │  删除   │ │
│  │  食物名称    kcal        │  按钮   │ │
│  └──────────────────────────┴─────────┘ │
└─────────────────────────────────────────┘
```

- `movable-view` 横向可拖动，范围 `-160rpx ~ 0`
- 左滑超过 80rpx 自动吸附到 `-160rpx`（露出删除按钮）
- 点击其他条目时，已滑开的条目自动复位
- meal-card.js 维护 `slideIndex: -1` 记录当前滑开的条目 index

---

## 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 删除后该餐次无食物 | meal-card 显示"点击添加食物"空态 |
| 删除时网络失败 | `wx.showToast({ title: '删除失败，请重试', icon: 'error' })` |
| 编辑时网络失败 | `wx.showToast({ title: '保存失败，请重试', icon: 'error' })` |
| 编辑页加载失败 | `wx.showToast` 提示后 `wx.navigateBack()` |
| 克重输入为 0 或负数 | 保存时校验拦截，提示"克重必须大于 0" |
| 同时左滑多个条目 | 新条目滑开时，前一个自动复位 |

---

## 不在本次范围内

- 批量删除
- 跨日期编辑历史记录
- 修改餐次类型（breakfast/lunch 等）
