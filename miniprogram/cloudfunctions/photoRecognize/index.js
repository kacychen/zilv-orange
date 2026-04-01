// 云函数：photoRecognize
// 接收食物图片的云存储 fileID，调用通义千问 VL API 识别食物并返回营养数据

const https = require('https');

const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const QWEN_MODEL = 'qwen-vl-plus';
const API_TIMEOUT_MS = 15000;

/**
 * 根据 fileID 扩展名推断 MIME 类型
 */
function getMimeType(fileID) {
  const ext = (fileID.split('.').pop() || '').toLowerCase();
  const map = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                heic: 'image/heic', webp: 'image/webp' };
  return map[ext] || 'image/jpeg';
}

/**
 * 将云存储 fileID 下载为 base64
 * 使用云函数全局 cloud 对象，无需 wx-server-sdk
 */
async function downloadAsBase64(fileID) {
  const res = await cloud.downloadFile({ fileID });
  if (!res.fileContent) throw new Error('文件下载失败或文件不存在');
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (res.fileContent.length > MAX_SIZE) {
    throw new Error('图片过大，请上传 5MB 以内的图片');
  }
  return res.fileContent.toString('base64');
}

/**
 * 调用通义千问 VL API
 */
function callQwen(base64Image, fileID) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: QWEN_MODEL,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              {
                image: `data:${getMimeType(fileID)};base64,${base64Image}`
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
      res.setEncoding('utf8');
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`API 错误 ${res.statusCode}: ${data}`));
            return;
          }
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
          if (!Array.isArray(foods)) {
            reject(new Error('识别结果格式异常'));
            return;
          }
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
  const wxContext = cloud.getWXContext();
  if (!wxContext.OPENID) {
    return { success: false, error: '非法调用', foods: [] };
  }

  const { fileID } = event;

  if (typeof fileID !== 'string' || !fileID.trim()) {
    return { success: false, error: '缺少 fileID 参数', foods: [] };
  }

  if (!QWEN_API_KEY) {
    return { success: false, error: '未配置 QWEN_API_KEY', foods: [] };
  }

  try {
    const base64Image = await downloadAsBase64(fileID);
    const foods = await callQwen(base64Image, fileID);
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
