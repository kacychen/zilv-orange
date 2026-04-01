# 拍照识别食物（通义千问 VL）设计文档

## Goal
将 `photoRecognize` 云函数从 Claude Vision API 改造为调用阿里云通义千问 VL API，实现拍照识别食物营养成分功能。前端流程和接口格式保持不变。

## Architecture
用户拍照后上传到微信云存储，前端调用 `photoRecognize` 云函数并传入 fileID。云函数下载图片转为 base64，调用通义千问 `qwen-vl-plus` 模型识别食物，解析返回的 JSON 数组后返回给前端。前端 `photo-result` 页面展示识别结果，用户确认后保存到数据库。

## Tech Stack
- 微信云开发云函数（Node.js 16）
- 阿里云通义千问 VL API（`qwen-vl-plus` 模型）
- Node.js 内置 `https` 模块（无需额外 npm 依赖）
- 微信云存储（存储用户拍摄的食物图片）

---

## 文件改动

| 文件 | 操作 |
|------|------|
| `miniprogram/cloudfunctions/photoRecognize/index.js` | 改造：替换 Claude API 调用为通义千问 VL API |
| `miniprogram/cloudfunctions/photoRecognize/package.json` | 确认：无需额外依赖 |

前端文件（`record.js`、`photo-result.js`）**无需修改**。

---

## 详细设计

### 云函数接口

**输入：**
```js
event = { fileID: 'cloud://xxx.jpg' }
```

**输出（成功）：**
```js
{
  success: true,
  foods: [
    {
      food_name: '白米饭',
      estimated_amount: 200,
      calories: 232,
      protein: 5.2,
      carbs: 51.8,
      fat: 0.6
    }
  ]
}
```

**输出（失败）：**
```js
{ success: false, error: '错误信息', foods: [] }
```

### 通义千问 VL API

- **接口地址：** `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- **模型：** `qwen-vl-plus`
- **认证：** 请求头 `Authorization: Bearer ${QWEN_API_KEY}`
- **API Key 来源：** 云函数环境变量 `QWEN_API_KEY`

**请求体格式：**
```json
{
  "model": "qwen-vl-plus",
  "input": {
    "messages": [{
      "role": "user",
      "content": [
        { "image": "data:image/jpeg;base64,<base64数据>" },
        { "text": "识别提示词" }
      ]
    }]
  }
}
```

**响应解析路径：**
`response.output.choices[0].message.content[0].text`

### 识别提示词
```
请分析这张食物图片，识别其中所有食物，以 JSON 数组格式返回，每项包含：
- food_name（食物名称，中文）
- estimated_amount（估算克重，数字）
- calories（卡路里，整数）
- protein（蛋白质克数，一位小数）
- carbs（碳水化合物克数，一位小数）
- fat（脂肪克数，一位小数）

只返回 JSON 数组，不要有其他文字。示例：
[{"food_name":"白米饭","estimated_amount":200,"calories":232,"protein":5.2,"carbs":51.8,"fat":0.6}]

如果图片中没有食物，返回空数组 []。
```

### 图片下载方式
不使用 `wx-server-sdk`（避免依赖安装问题），改用微信云函数内置的 `cloud` 对象：
```js
// 云函数内可直接使用全局 cloud 对象下载文件
const wxContext = cloud.getWXContext();
const res = await cloud.downloadFile({ fileID });
const base64 = res.fileContent.toString('base64');
```

### 错误处理

| 情况 | 处理方式 |
|------|---------|
| `QWEN_API_KEY` 未配置 | 返回 `{ success: false, error: '未配置 API Key', foods: [] }` |
| 图片下载失败 | 返回 `{ success: false, error: '图片下载失败', foods: [] }` |
| API 调用超时（15s） | 返回 `{ success: false, error: 'API 请求超时', foods: [] }` |
| 返回内容无法解析为 JSON | 返回 `{ success: false, error: '识别结果解析失败', foods: [] }` |
| 识别结果为空数组 | 返回 `{ success: true, foods: [] }`，前端提示「未能识别食物」 |

---

## 部署步骤（申请到 API Key 后）

1. 在微信开发者工具右键 `cloudfunctions/photoRecognize` → 「上传并部署：云端安装依赖」
2. 在微信云开发控制台 → 云函数 → `photoRecognize` → 「环境变量」添加：
   - Key: `QWEN_API_KEY`
   - Value: 你的通义千问 API Key
3. 编译小程序，测试拍照识别流程

## 申请通义千问 API Key

1. 打开 [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com)
2. 用阿里云账号登录
3. 左侧「API-KEY 管理」→「创建新的 API-KEY」
4. 复制保存（只显示一次）
5. 新用户有免费 token 额度，`qwen-vl-plus` 约 ¥0.008/张图片
