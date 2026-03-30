/**
 * BMR 与卡路里目标计算（Mifflin-St Jeor 公式）
 */

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

/**
 * 计算年龄
 */
function getAge(birthday) {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * 计算 BMR
 * @param {number} weight - 体重(kg)
 * @param {number} height - 身高(cm)
 * @param {number} age - 年龄
 * @param {number} gender - 性别 1=男 2=女
 * @returns {number} BMR
 */
function calcBMR(weight, height, age, gender) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 1 ? base + 5 : base - 161;
}

/**
 * 计算 TDEE
 */
function calcTDEE(bmr, activityLevel) {
  const multiplier = ACTIVITY_MULTIPLIER[activityLevel] || 1.2;
  return bmr * multiplier;
}

/**
 * 计算每日热量目标
 */
function calcDailyTarget(userInfo) {
  const age = getAge(userInfo.birthday);
  const bmr = calcBMR(userInfo.weight, userInfo.height, age, userInfo.gender);
  const tdee = calcTDEE(bmr, userInfo.activity_level);
  const goalMul = GOAL_MULTIPLIER[userInfo.goal] || 1.0;
  return Math.round(tdee * goalMul);
}

module.exports = {
  getAge,
  calcBMR,
  calcTDEE,
  calcDailyTarget,
  ACTIVITY_MULTIPLIER,
  GOAL_MULTIPLIER
};
