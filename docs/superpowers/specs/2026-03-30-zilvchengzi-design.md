# 自律橙子 — 饮食健康助手小程序设计文档

**日期：** 2026-03-30
**版本：** v1.0
**项目名称：** 自律橙子（微信小程序）

---

## 一、项目概述

「自律橙子」是一款微信小程序形态的饮食健康助手，类似「自律茄子」App。核心价值是帮助用户轻松记录一日三餐、追踪卡路里与营养素摄入，并通过 AI 提供个性化饮食建议。

### 目标用户
覆盖多类人群，通过注册时的个人信息配置适配不同需求：
- 健身/减脂人群
- 普通健康生活爱好者
- 有特殊饮食需求的人群（如糖尿病、高血压等）

### MVP 功能范围
- ✅ 餐食记录（食物搜索 + 拍照 AI 识别）
- ✅ 卡路里 & 三大营养素实时统计
- ✅ 基础图表分析（本周卡路里折线图、营养素饼图）
- ✅ 个人目标设置（BMR 自动计算每日热量目标）
- ✅ 打卡连续天数 & 成就徽章

### 后续版本（暂不实现）
- 条形码扫描
- 对话式 AI 营养师
- 好友社交 & 排行榜

---

## 二、技术选型

| 层级 | 技术 |
|------|------|
| 客户端 | 原生微信小程序（WXML / WXSS / JS） |
| 后端 & 数据库 | 微信云开发（CloudBase） |
| 食物数据库 | 第三方 API（薄荷健康 / FatSecret） |
| AI 图像识别 | Claude Vision API（claude-3-5-sonnet） |
| 图表库 | wx-charts 或 ECharts for 小程序 |

**选型理由：** 原生小程序性能最优、微信能力集成稳定；云开发免服务器运维，适合 MVP 快速上线；Claude Vision 直接处理食物图片并返回结构化营养数据，体验智能且与后续 AI 功能天然融合。

---

## 三、整体架构

```
┌─────────────────────────────────────────┐
│          微信小程序客户端                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 首页  │ │ 记录  │ │ 分析  │ │ 我的  │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────┬───────────────────────┘
                  │ 微信云开发 SDK
┌─────────────────▼───────────────────────┐
│              云开发 CloudBase             │
│  ┌─────────────┐   ┌──────────────────┐ │
│  │   云数据库   │   │     云函数        │ │
│  │  - users    │   │ - foodSearch     │ │
│  │  - meal_    │   │ - photoRecognize │ │
│  │    records  │   │ - calorieCalc    │ │
│  │  - daily_   │   │ - dailySummary   │ │
│  │    summary  │   └──────────────────┘ │
│  │  -achievements│                      │
│  └─────────────┘                        │
└─────────────────┬───────────────────────┘
                  │
     ┌────────────┴────────────┐
     │                         │
┌────▼──────┐          ┌───────▼──────┐
│ 食物数据库  │          │ Claude Vision │
│ 第三方 API │          │  AI 图像识别   │
└────────────┘          └──────────────┘
```

---

## 四、页面结构

```
自律橙子
├── 🏠 首页（Today）
│   ├── 今日卡路里环形进度条（已摄入 / 目标）
│   ├── 三餐 + 加餐记录入口（早/午/晚/加餐）
│   ├── 营养素进度条（蛋白质 / 碳水 / 脂肪）
│   └── 今日饮食快照卡片列表
│
├── 📝 记录（Record）
│   ├── 搜索食物（调用第三方 API）
│   ├── 拍照 AI 识别（调用 Claude Vision）
│   └── 自定义食物手动录入
│
├── 📊 分析（Analysis）
│   ├── 本周卡路里折线图
│   ├── 营养素分布饼图
│   └── 达标天数统计
│
└── 👤 我的（Profile）
    ├── 个人信息（身高 / 体重 / 目标 / 活动量）
    ├── 每日卡路里目标（自动计算 BMR）
    ├── 打卡记录 & 成就徽章
    └── 设置
```

**核心操作流程：**
```
首页 → 点击餐次卡片 → 选择记录方式（搜索 / 拍照）
  搜索路径：输入关键词 → 选择食物 → 输入份量 → 确认添加
  拍照路径：调用相机 → 上传图片 → Claude 识别 → 编辑确认 → 添加
→ 返回首页（卡路里实时更新）
```

**页面总数（MVP）：** 4 个 Tab 主页 + 6 个子页面 = 约 10 个页面

---

## 五、数据模型

### `users` — 用户信息
```json
{
  "_id": "openid_xxx",
  "nickname": "橙子用户",
  "avatar": "url",
  "gender": 1,
  "birthday": "1995-01-01",
  "height": 170,
  "weight": 65,
  "target_weight": 60,
  "goal": "lose_weight",
  "activity_level": "moderate",
  "daily_calorie_target": 1800,
  "created_at": "timestamp"
}
```

**goal 枚举值：** `lose_weight` / `gain_muscle` / `maintain`
**activity_level 枚举值：** `sedentary` / `light` / `moderate` / `active`

### `meal_records` — 餐食记录
```json
{
  "_id": "auto",
  "user_id": "openid_xxx",
  "date": "2026-03-30",
  "meal_type": "breakfast",
  "food_id": "food_api_id",
  "food_name": "白米饭",
  "amount": 150,
  "calories": 174,
  "protein": 3.2,
  "carbs": 38.1,
  "fat": 0.3,
  "source": "search",
  "created_at": "timestamp"
}
```

**meal_type 枚举值：** `breakfast` / `lunch` / `dinner` / `snack`
**source 枚举值：** `search` / `photo` / `manual`

### `daily_summary` — 每日汇总
```json
{
  "_id": "auto",
  "user_id": "openid_xxx",
  "date": "2026-03-30",
  "total_calories": 1650,
  "total_protein": 72,
  "total_carbs": 210,
  "total_fat": 45,
  "goal_reached": true,
  "streak_day": 7
}
```

### `achievements` — 成就徽章
```json
{
  "_id": "auto",
  "user_id": "openid_xxx",
  "type": "streak_7",
  "unlocked_at": "timestamp"
}
```

**成就类型：** `streak_3` / `streak_7` / `streak_30` / `goal_reached_10` / `first_record` 等

---

## 六、核心功能实现

### 6.1 卡路里目标计算（Mifflin-St Jeor 公式）

```
男性 BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 + 5
女性 BMR = 10×体重(kg) + 6.25×身高(cm) - 5×年龄 - 161

活动系数：
  久坐(sedentary)      × 1.2
  轻度活动(light)       × 1.375
  中度活动(moderate)    × 1.55
  高度活动(active)      × 1.725

TDEE = BMR × 活动系数

每日热量目标：
  减脂(lose_weight)    = TDEE × 0.85
  增肌(gain_muscle)    = TDEE × 1.10
  维持(maintain)       = TDEE × 1.00
```

### 6.2 食物搜索云函数（foodSearch）

```
输入：关键词（字符串）
流程：
  1. 调用第三方食物 API（薄荷/FatSecret）
  2. 返回食物列表（名称、单位、每100g热量、蛋白质、碳水、脂肪）
  3. 前端展示列表，用户选择食物并输入份量（克）
  4. 本地计算实际营养数据 = 营养数据 × (份量 / 100)
  5. 写入 meal_records，更新 daily_summary
输出：food[] 列表
```

### 6.3 拍照 AI 识别云函数（photoRecognize）

```
输入：图片临时 URL
提示词（示例）：
  "请分析这张食物图片，识别其中所有食物，
   以 JSON 格式返回，包含：food_name（食物名称）、
   estimated_amount（估算克重）、calories（卡路里）、
   protein（蛋白质g）、carbs（碳水g）、fat（脂肪g）"

流程：
  1. 微信相机拍照，压缩至 1MB 以内
  2. 上传至云存储，获取临时 URL
  3. 云函数调用 Claude Vision API（claude-3-5-sonnet）
  4. 解析返回的结构化 JSON
  5. 展示识别结果页，用户可编辑每项份量
  6. 用户确认后批量写入 meal_records
输出：识别食物列表（可编辑）
```

---

## 七、错误处理策略

| 场景 | 处理方式 |
|------|---------|
| 食物 API 请求失败 | 提示"搜索暂时不可用"，支持手动录入 |
| Claude Vision 识别失败 | 提示"未能识别，请换角度拍摄或手动搜索" |
| Claude Vision 超时（>5s） | 超时后降级提示，引导手动搜索 |
| 图片无食物内容 | Claude 返回空结果，提示重新拍摄 |
| 图片过大 | 上传前自动压缩至 1MB 以内 |
| 网络断开 | 本地缓存当日数据，恢复网络后同步 |
| 用户未完善个人信息 | 首次登录强制引导填写基础信息 |
| 份量输入异常 | 前端校验，限制输入范围 0.1g ~ 9999g |
| 云函数通用超时 | 设置 3s 超时，失败后提示重试 |

---

## 八、UI 设计风格

- **主题色：** 橙色系（#FF7A00 主色，#FFF3E0 背景）
- **风格：** 简洁卡片式，圆角大、留白足，轻松不压迫
- **首页核心元素：** 大环形卡路里进度条居中，视觉焦点突出
- **字体：** 系统字体，数字部分使用等宽字体增强可读性

---

## 九、项目目录结构（预期）

```
miniprogram/
├── pages/
│   ├── index/          # 首页
│   ├── record/         # 记录页
│   ├── food-search/    # 食物搜索
│   ├── photo-result/   # 拍照识别结果
│   ├── analysis/       # 分析页
│   ├── profile/        # 我的
│   ├── onboarding/     # 首次登录引导
│   └── food-detail/    # 食物详情/编辑
├── components/
│   ├── calorie-ring/   # 环形进度条
│   ├── nutrient-bar/   # 营养素进度条
│   └── meal-card/      # 餐次卡片
├── cloudfunctions/
│   ├── foodSearch/
│   ├── photoRecognize/
│   ├── calorieCalc/
│   └── dailySummary/
└── utils/
    ├── bmr.js          # BMR 计算
    ├── nutrition.js    # 营养数据计算
    └── date.js         # 日期工具
```

---

## 十、后续版本规划

| 版本 | 新增功能 |
|------|---------|
| v1.1 | 条形码扫描包装食品 |
| v1.2 | Claude 对话式 AI 营养师 |
| v1.3 | 好友打卡、社区分享 |
| v2.0 | 运动记录、净卡路里计算 |
