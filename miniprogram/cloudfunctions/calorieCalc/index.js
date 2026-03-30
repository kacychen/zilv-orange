// 云函数：calorieCalc
// 根据用户信息计算每日热量目标（Mifflin-St Jeor 公式）

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725
};

const GOAL_MULTIPLIER = {
  lose_weight: 0.85,
  gain_muscle: 1.10,
  maintain: 1.00
};

function getAge(birthday) {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

exports.main = async (event) => {
  const { weight, height, birthday, gender, activity_level, goal } = event;

  if (!weight || !height || !birthday) {
    return { success: false, error: '缺少必要参数' };
  }

  const age = getAge(birthday);
  const base = 10 * weight + 6.25 * height - 5 * age;
  const bmr = gender === 1 ? base + 5 : base - 161;
  const actMul = ACTIVITY_MULTIPLIER[activity_level] || 1.2;
  const goalMul = GOAL_MULTIPLIER[goal] || 1.0;
  const dailyTarget = Math.round(bmr * actMul * goalMul);

  // 同时更新数据库中的用户目标
  const db = cloud.database();
  const { OPENID } = cloud.getWXContext();

  await db.collection('users').where({ _id: OPENID }).update({
    data: { daily_calorie_target: dailyTarget }
  }).catch(() => {});

  return {
    success: true,
    bmr: Math.round(bmr),
    tdee: Math.round(bmr * actMul),
    daily_calorie_target: dailyTarget
  };
};
