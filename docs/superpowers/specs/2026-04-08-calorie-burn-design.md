# 卡路里消耗记录功能设计文档

**日期:** 2026-04-08
**功能:** 卡路里消耗记录（运动 + 步数）

---

## 一、功能目标

在现有的饮食热量记录基础上，新增运动消耗维度，让用户了解每日「摄入 - 消耗」的净热量平衡。具体包括：

1. **运动记录**：用户从内置运动库中选择运动项目，输入时长，系统自动通过 MET 公式计算消耗大卡，存入云数据库。
2. **步数展示**：通过 `wx.getWeRunData()` 读取微信运动步数，在首页展示当日步数及进度条（目标 6000 步），仅展示不计入大卡消耗。
3. **首页热量环更新**：剩余大卡 = 目标 - 已摄入 + 已消耗（运动补回到剩余预算）。

---

## 二、界面设计

### 2.1 首页（index）改造

在原有「四餐卡片」下方新增「运动消耗」卡片：

```
[ 🏋️ 已消耗    150 大卡    ＋ ]
──────────────────────────────
[ 🚶 步数   4823 / 6000   ████░ ]
```

- 热量环额外展示「已消耗🔥 150」角标
- 剩余热量公式：`remaining = target - intake + burned`

### 2.2 添加运动页（exercise-search）

新建页面 `pages/exercise-search/exercise-search`，参照 `food-search` 交互模式：

- 顶部搜索框（按运动名称过滤）
- 按分类展示内置运动列表：有氧运动 / 力量训练 / 球类运动 / 其他
- 每行右侧「＋」圆形橙色按钮 → 点击弹出时长选择底部弹层

### 2.3 时长选择弹层（bottom sheet）

- 运动名称 + 预估消耗大卡动态预览
- 快捷时长选项：15 / 30 / 45 / 60 分钟
- 自定义时长输入框（分钟）
- 实时显示预估消耗大卡：`MET × weight × duration_hours`
- 「保存」按钮写入云数据库并返回

---

## 三、数据层

### 3.1 云数据库集合：`exercise_records`

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 自动生成 |
| `_openid` | string | 用户标识（云数据库自动注入） |
| `date` | string | `YYYY-MM-DD`，来自 `getToday()` |
| `exercise_name` | string | 运动名称，如「跑步」 |
| `exercise_type` | string | 分类 key，如 `aerobic` |
| `duration` | number | 时长（分钟） |
| `met` | number | 该运动 MET 值 |
| `calories` | number | 消耗大卡（计算结果） |
| `weight` | number | 记录时使用的体重（kg） |
| `created_at` | serverDate | 服务端时间 |

### 3.2 本地运动库：`utils/exercises.js`

无需云端存储，JS 文件导出静态数组：

```js
module.exports = [
  { type: 'aerobic',   type_name: '有氧运动', name: '跑步',   met: 8.0 },
  { type: 'aerobic',   type_name: '有氧运动', name: '快走',   met: 4.5 },
  { type: 'aerobic',   type_name: '有氧运动', name: '骑行',   met: 6.0 },
  { type: 'aerobic',   type_name: '有氧运动', name: '游泳',   met: 7.0 },
  { type: 'aerobic',   type_name: '有氧运动', name: '跳绳',   met: 10.0 },
  { type: 'strength',  type_name: '力量训练', name: '哑铃',   met: 5.0 },
  { type: 'strength',  type_name: '力量训练', name: '深蹲',   met: 5.5 },
  { type: 'strength',  type_name: '力量训练', name: '俯卧撑', met: 5.0 },
  { type: 'ball',      type_name: '球类运动', name: '篮球',   met: 7.0 },
  { type: 'ball',      type_name: '球类运动', name: '乒乓球', met: 4.5 },
  { type: 'ball',      type_name: '球类运动', name: '羽毛球', met: 5.5 },
  { type: 'other',     type_name: '其他',     name: '瑜伽',   met: 3.0 },
  { type: 'other',     type_name: '其他',     name: '舞蹈',   met: 4.5 },
  { type: 'other',     type_name: '其他',     name: '爬山',   met: 6.5 },
];
```

### 3.3 消耗大卡计算公式

```
calories = MET × weight_kg × (duration_min / 60)
```

- `weight_kg`：来自 `app.globalData.userInfo.weight`，默认 60
- 结果四舍五入取整

### 3.4 步数获取

```js
wx.getWeRunData({
  success(res) {
    // res.encryptedData + res.iv 需云端解密，或使用 stepInfoList（明文）
    const stepInfoList = res.stepInfoList || [];
    const today = getToday(); // 'YYYY-MM-DD'
    // timestamp 是当天零点的 Unix 秒，转为 YYYY-MM-DD 后与 getToday() 比较
    const todayEntry = stepInfoList.find(s => {
      const d = new Date(s.timestamp * 1000);
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}` === today;
    });
    const todaySteps = todayEntry ? todayEntry.step : 0;
  }
});
```

> 注：`wx.getWeRunData` 返回的 `stepInfoList` 为近 30 天步数明文数组，每项含 `timestamp`（Unix秒）和 `step`。使用明文数据无需后端解密。需要在 `app.json` 中声明权限 `scope.werun`。

---

## 四、页面与文件清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `miniprogram/utils/exercises.js` | 运动库静态数据 |
| `miniprogram/pages/exercise-search/exercise-search.js` | 运动选择页逻辑 |
| `miniprogram/pages/exercise-search/exercise-search.wxml` | 运动选择页模板 |
| `miniprogram/pages/exercise-search/exercise-search.wxss` | 运动选择页样式 |
| `miniprogram/pages/exercise-search/exercise-search.json` | 页面配置（导航标题） |

### 修改文件

| 文件 | 改动说明 |
|------|----------|
| `miniprogram/app.json` | `pages` 数组新增 `exercise-search` 路由 |
| `miniprogram/pages/index/index.js` | 新增 `loadExerciseData()`、步数读取、`totalBurned`、更新剩余公式 |
| `miniprogram/pages/index/index.wxml` | 热量环新增已消耗角标、新增运动消耗卡片 |
| `miniprogram/pages/index/index.wxss` | 新增运动卡片 + 步数条样式 |

---

## 五、核心逻辑流程

### 首页加载运动数据

```
onShow()
  └─ loadExerciseData()
       └─ db.exercise_records.where({date: today}).get()
            └─ totalBurned = sum(records.calories)
                 └─ setData({ totalBurned })
                      └─ remaining = target - totalCalories + totalBurned
```

### 添加运动流程

```
首页 ＋ 按钮
  └─ navigateTo exercise-search
       └─ 用户选择运动 → 点击 ＋
            └─ 弹出 bottom sheet（时长选择）
                 └─ 用户选择/输入时长 → 点击保存
                      └─ 计算 calories = MET × weight × hours
                           └─ db.exercise_records.add(record)
                                └─ showToast 成功 → navigateBack
                                     └─ 首页 onShow() 刷新数据
```

---

## 六、权限声明

`app.json` 需确保存在：
```json
"permission": {
  "scope.werun": {
    "desc": "获取您的微信运动步数，帮助展示今日步数进度"
  }
}
```

用户首次访问步数时会弹出授权对话框；拒绝时步数显示为 `--`，不影响运动记录功能。

---

## 七、不在本期范围内

- 自定义运动类型（用户新增运动到库）
- 步数转换为消耗大卡
- 运动历史统计（分析页扩展）
- 运动目标设置
