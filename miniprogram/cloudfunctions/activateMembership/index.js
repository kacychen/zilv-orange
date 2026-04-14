const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 模拟支付并激活会员（正式版需替换为微信支付回调）
 * event.plan: 'monthly'(30天) | 'yearly'(365天)
 *
 * TODO: 正式版替换为 createOrder + wx.requestPayment 流程:
 *   1. 创建 createOrder 云函数，调用微信统一下单 API 返回 prepay_id
 *   2. 小程序端 wx.requestPayment({ ... }) 调起支付
 *   3. 支付成功回调中调用 activateMembership 写入会员状态
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const plan = event.plan || 'monthly';
  const days = plan === 'yearly' ? 365 : 30;

  const db = cloud.database();
  const userDoc = await db.collection('users').doc(OPENID).get().catch(() => null);

  if (!userDoc) {
    return { success: false, errMsg: 'user not found' };
  }

  const now = new Date();
  // 如果当前已是有效会员，在到期时间基础上延续；否则从现在开始
  let baseDate = now;
  const existing = userDoc.data.member_expire_at;
  if (existing) {
    const existExpire = new Date(existing);
    if (existExpire > now) baseDate = existExpire;
  }

  const expireDate = new Date(baseDate);
  expireDate.setDate(expireDate.getDate() + days);

  await db.collection('users').doc(OPENID).update({
    data: {
      is_member: true,
      member_expire_at: expireDate.toISOString(),
      member_plan: plan
    }
  });

  return {
    success: true,
    member_expire_at: expireDate.toISOString(),
    plan
  };
};
