# 水分摄取记录功能设计文档

## 目标

在现有卡路里 MVP 基础上，新增「饮水」独立 Tab，支持按饮品类型记录每日水分摄取，首次使用时引导用户设置每日目标。

## 架构概述

- 新增底部 Tab 入口（💧 饮水），路径 `pages/water/water`
- 波浪动画 + 圆环进度的视觉风格（参考自律茄子）
- 数据存云数据库（与卡路里模块一致），支持按天查询
- MVP 阶段不做提醒推送、不做周月图表，聚焦核心记录功能

## 技术栈

- 微信小程序原生组件（WXML/WXSS/JS）
- 微信云数据库（wx.cloud.database）
- CSS 动画（波浪 @keyframes）
- SVG 圆环进度

---

## 页面结构

### 文件布局

```
miniprogram/pages/water/
├── water.wxml
├── water.wxss
├── water.js
└── water.json

miniprogram/components/water-wave/
├── water-wave.wxml
├── water-wave.wxss
├── water-wave.js
└── water-wave.json
```

### water 页面层级

```
water.wxml
├── <water-wave> 组件（顶部 Header + 波浪 + 圆环）
├── 统计小卡行（今日杯数 / 连续达标天 / 昨日量）
├── 快捷记录区（4 个预设饮品按钮）
├── 自定义输入行（输入框 + 记录按钮）
└── 今日时间线（可左滑删除）
```

### water-wave 组件

- 接收 `percent` 属性（Number，0-100），控制蓝色背景高度
- 接收 `amount` 属性（Number），显示当日总 ml 大字
- 接收 `goal` 属性（Number），显示目标和还差量
- 内含两层 CSS 波浪动画（错位运动）
- 内含 SVG 圆环进度，动画从 0 填充到 `percent` 值

---

## 数据模型

### 云数据库集合：`water_records`

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 自动生成 |
| `_openid` | string | 用户标识（云数据库自动填充） |
| `date` | string | 格式 `"YYYY-MM-DD"`，按天查询用 |
| `amount` | number | 本次记录 ml 数 |
| `type` | string | `"water"` / `"coffee"` / `"tea"` / `"juice"` / `"other"` |
| `type_name` | string | 显示名，如 `"咖啡"` |
| `recorded_at` | Date | 精确记录时间，时间线排序用 |

### 云数据库集合：`user_config`

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 自动生成 |
| `_openid` | string | 用户标识 |
| `water_goal` | number | 每日目标 ml，默认 2000 |
| `weight` | number | 体重 kg（目标推算用，可选） |

### 数据读写规则

- **加载页面**：查询当天 `water_records`（`date == today`），本地汇总总量；查询 `user_config` 获取目标值
- **快捷记录 / 自定义记录**：`water_records.add()`，本地即时追加到时间线并更新总量
- **删除记录**：`water_records.doc(id).remove()`，本地同步扣减总量
- **设置目标**：`user_config` upsert（有则更新，无则创建）

### 「连续达标天」计算

页面加载时查询近 30 天 `water_records`，按 `date` 分组汇总，从今天往前数连续达标（总量 ≥ `water_goal`）的天数，纯前端计算。

---

## 交互设计

### 首次使用引导

```
进入 water 页面
  └→ 查询 user_config
      ├→ 无记录 → 弹出目标设置弹窗
      │     ├ 输入体重（kg）
      │     ├ 自动推算：体重 × 35 = 推荐 ml
      │     ├ 用户可手动修改目标值
      │     └ 确认 → upsert user_config → 继续加载页面
      └→ 有记录 → 直接显示页面
```

### 快捷按钮配置（硬编码）

```js
[
  { type: 'water',  type_name: '白水', icon: '💧', amount: 250 },
  { type: 'water',  type_name: '大杯', icon: '🍶', amount: 350 },
  { type: 'coffee', type_name: '咖啡', icon: '☕', amount: 200 },
  { type: 'tea',    type_name: '茶',   icon: '🍵', amount: 300 },
]
```

### 自定义记录

输入框输入 ml 数 → 点击「+ 记录」→ 饮品类型默认为 `water`（白水）→ 写入数据库。

### 时间线左滑删除

复用与 `meal-card` 相同的 touch 事件逻辑：
- `onTouchStart` / `onTouchMove` / `onTouchEnd`
- CSS `translateX` 控制滑动偏移
- `snapX`：偏移 > 80rpx 则吸附展开（显示删除按钮），否则复位
- 点击删除按钮 → `wx.showModal` 确认 → 删除数据库记录 → 本地移除并更新总量

---

## Tab 栏配置变更

`app.json` 中 `tabBar.list` 新增一项：

```json
{
  "pagePath": "pages/water/water",
  "text": "饮水",
  "iconPath": "images/tab-water.png",
  "selectedIconPath": "images/tab-water-active.png"
}
```

需新增两张 Tab 图标（未选中 / 选中状态），尺寸 81×81px，与现有图标风格一致。

---

## 范围说明（MVP 不含）

- ❌ 定时喝水提醒（微信订阅消息）
- ❌ 周 / 月趋势图表
- ❌ 快捷按钮自定义配置
- ❌ 根据运动量动态调整目标

以上功能在后续迭代中添加，当前数据模型已预留扩展空间。
