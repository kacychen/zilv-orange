const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  // 当小程序端用 wx.cloud.CloudID() 包装传入时，
  // wx-server-sdk 会在调用前自动解密，解密结果直接覆盖到 event.weRunData
  // 解密后结构：{ cloudID: '...', json: { stepInfoList: [...] } }
  console.log('[getWeRunData] event.weRunData:', JSON.stringify(event.weRunData));

  try {
    const weRunData = event.weRunData;
    if (!weRunData) {
      return { success: false, errMsg: 'weRunData is empty after decryption' };
    }

    const stepInfoList =
      (weRunData.stepInfoList) ||
      (weRunData.data && weRunData.data.stepInfoList) ||
      (weRunData.json && weRunData.json.stepInfoList) ||
      [];

    return { success: true, stepInfoList };
  } catch (err) {
    return { success: false, errMsg: String(err) };
  }
};
