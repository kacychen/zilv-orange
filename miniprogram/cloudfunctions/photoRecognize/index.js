// 云函数：photoRecognize
// 接收食物图片的云存储 fileID，调用 Claude Vision API 识别食物并返回营养数据

const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// Claude API 配置（从云环境变量读取）
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const API_TIMEOUT_MS = 15000;

/**
 * 将云存储 fileID 下载为 base64
 */
async function downloadAsBase64(fileID) {
  const res = await cloud.downloadFile({ fileID });
  const buffer = res.fileContent;
  return buffer.toString('base64');
}

/**
 * 调用 Claude Vision API
 */
function callClaude(base64Image) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image
              }
            },
            {
              type: 'text',
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
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
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
          const text = parsed.content && parsed.content[0] && parsed.content[0].text;
          if (!text) {
            reject(new Error('Claude 返回内容为空'));
            return;
          }
          // 解析 JSON 数组
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            reject(new Error('无法解析 Claude 返回的 JSON'));
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
      reject(new Error('Claude API 请求超时'));
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

  if (!CLAUDE_API_KEY) {
    return { success: false, error: '未配置 Claude API Key', foods: [] };
  }

  try {
    // 下载图片为 base64
    const base64Image = await downloadAsBase64(fileID);

    // 调用 Claude Vision
    const foods = await callClaude(base64Image);

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
