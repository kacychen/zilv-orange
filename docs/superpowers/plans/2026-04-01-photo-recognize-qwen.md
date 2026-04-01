# 拍照识别食物（通义千问 VL）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `photoRecognize` 云函数从 Claude Vision API 改造为调用阿里云通义千问 VL API，实现拍照识别食物营养成分。

**Architecture:** 只改动一个文件 `miniprogram/cloudfunctions/photoRecognize/index.js`，删除 Claude API 相关代码，替换为通义千问 VL API 调用。图片下载改为不依赖 `wx-server-sdk`，用云函数原生 `cloud` 全局对象。API Key 从云函数环境变量 `QWEN_API_KEY` 读取。前端 `record.js` 和 `photo-result.js` 无需改动。

**Tech Stack:** 微信云开发云函数（Node.js 16）、阿里云通义千问 VL API（`qwen-vl-plus`）、Node.js 内置 `https` 模块

---

## 文件改动一览

| 文件 | 操作 |
|------|------|
| `miniprogram/cloudfunctions/photoRecognize/index.js` | 修改：替换为通义千问 VL 实现 |
| `miniprogram/cloudfunctions/photoRecognize/package.json` | 修改：更新描述，无需额外依赖 |

---

## Task 1：改造 photoRecognize 云函数

**Files:**
- Modify: `miniprogram/cloudfunctions/photoRecognize/index.js`
- Modify: `miniprogram/cloudfunctions/photoRecognize/package.json`

- [ ] **Step 1: 将 index.js 完整替换为通义千问 VL 版本**

将 `miniprogram/cloudfunctions/photoRecognize/index.js` 内容完整替换为：

```js
// 云函数：photoRecognize
// 接收食物图片的云存储 fileID，调用通义千问 VL API 识别食物并返回营养数据

const https = require('https');

const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const QWEN_MODEL = 'qwen-vl-plus';
const API_TIMEOUT_MS = 15000;

/**
 * 将云存储 fileID 下载为 base64
 * 使用云函数全局 cloud 对象，无需 wx-server-sdk
 */
async function downloadAsBase64(fileID) {
  const res = await cloud.downloadFile({ fileID });
  return res.fileContent.toString('base64');
}

/**
 * 调用通义千问 VL API
 */
function callQwen(base64Image) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: QWEN_MODEL,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              {
                image: `data:image/jpeg;base64,${base64Image}`
              },
              {
                text: `请分析这张食物图片，识别其中所有食物，以 JSON 数组格式返回，每项包含：
- food_name（食物名称，中文）
- estimated_amount（估算克重，数字）
- calories（卡路里，整数）
- protein（蛋白质克数，一位小数）
- carbs（碳水化合物克数，一位小数）
- fat（脂肪克数，一位小数）

只返回 JSON 数组，不要有其他文字。示例格式：
[{"food_name":"白米饭","estimated_amount":200,"calories":232,"protein":5.2,"carbs":51.8,"fat":0.6}]

如果图片中没有食物，返回空数组 []。`
              }
            ]
          }
        ]
      }
    });

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      path: '/api/v1/services/aigc/multimodal-generation/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: API_TIMEOUT_MS
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.output &&
            parsed.output.choices &&
            parsed.output.choices[0] &&
            parsed.output.choices[0].message &&
            parsed.output.choices[0].message.content &&
            parsed.output.choices[0].message.content[0] &&
            parsed.output.choices[0].message.content[0].text;

          if (!text) {
            reject(new Error('通义千问返回内容为空'));
            return;
          }

          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            reject(new Error('识别结果解析失败'));
            return;
          }

          const foods = JSON.parse(jsonMatch[0]);
          resolve(foods);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API 请求超时'));
    });

    req.write(body);
    req.end();
  });
}

exports.main = async (event) => {
  const { fileID } = event;

  if (!fileID) {
    return { success: false, error: '缺少 fileID 参数', foods: [] };
  }

  if (!QWEN_API_KEY) {
    return { success: false, error: '未配置 QWEN_API_KEY', foods: [] };
  }

  try {
    const base64Image = await downloadAsBase64(fileID);
    const foods = await callQwen(base64Image);
    return { success: true, foods };
  } catch (err) {
    console.error('photoRecognize 失败:', err.message);
    return {
      success: false,
      error: err.message || '识别失败',
      foods: []
    };
  }
};
```

- [ ] **Step 2: 更新 package.json 描述**

将 `miniprogram/cloudfunctions/photoRecognize/package.json` 替换为：

```json
{
  "name": "photoRecognize",
  "version": "1.0.0",
  "description": "拍照 AI 识别云函数，调用通义千问 VL API",
  "main": "index.js"
}
```

- [ ] **Step 3: commit**

```bash
git add miniprogram/cloudfunctions/photoRecognize/index.js miniprogram/cloudfunctions/photoRecognize/package.json
git commit -m "feat: photoRecognize 云函数改造为通义千问 VL API"
```

---

## Task 2：部署云函数并配置 API Key（手动操作）

> 此 Task 需要人工在微信开发者工具和云开发控制台操作。

- [ ] **Step 1: 在微信开发者工具上传云函数**

在微信开发者工具左侧文件树：
右键 `cloudfunctions/photoRecognize` → 「上传并部署：云端安装依赖」
等待提示「上传成功」。

- [ ] **Step 2: 在云开发控制台配置环境变量**

1. 打开微信云开发控制台（开发者工具顶部「云开发」按钮）
2. 左侧「云函数」→ 点击 `photoRecognize`
3. 找到「环境变量」或「配置」tab
4. 新增环境变量：
   - Key: `QWEN_API_KEY`
   - Value: 你的通义千问 API Key（从 [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com) 获取）
5. 保存

- [ ] **Step 3: 在云开发控制台测试云函数**

在 `photoRecognize` 函数详情页找「测试」功能，输入测试参数：
```json
{ "fileID": "test" }
```
预期返回：
```json
{ "success": false, "error": "图片下载失败", "foods": [] }
```
（因为 fileID 是假的，但说明函数已正常运行、API Key 已读取）

- [ ] **Step 4: 编译小程序端到端测试**

1. 微信开发者工具点「编译」
2. 进入记录页 → 点「拍照识别」
3. 拍一张有食物的照片
4. 等待 AI 识别（约 3-8 秒）
5. 预期：跳转到识别结果页，显示识别出的食物列表
6. 点「确认添加」，回到首页验证卡路里已更新

---

## 申请通义千问 API Key（如果还没有）

1. 打开 [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com)
2. 用阿里云账号登录
3. 左侧「API-KEY 管理」→「创建新的 API-KEY」
4. 复制保存（只显示一次）
5. 新用户有免费 token 额度，`qwen-vl-plus` 约 ¥0.008/张图片
