// miniprogram/utils/member.js

/**
 * 判断用户是否为有效会员
 * @param {object} userInfo - app.globalData.userInfo
 * @returns {boolean}
 */
function isMember(userInfo) {
  if (!userInfo) return false;
  if (!userInfo.is_member) return false;
  if (!userInfo.member_expire_at) return false;
  // member_expire_at 存为 ISO 字符串 或 Date 对象
  const expire = new Date(userInfo.member_expire_at);
  return expire > new Date();
}

module.exports = { isMember };
