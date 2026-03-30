// 云函数：dailySummary
// 汇总指定日期的饮食记录，更新 daily_summary 集合，并检查成就解锁

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const ACHIEVEMENT_TYPES = ['first_record', 'streak_3', 'streak_7', 'streak_30', 'goal_reached_10'];

/**
 * 计算连续打卡天数
 */
async function calcStreak(db, userId) {
  const summaries = await db.collection('daily_summary')
    .where({ user_id: userId })
    .orderBy('date', 'desc')
    .limit(60)
    .get();

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < summaries.data.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const y = expected.getFullYear();
    const m = String(expected.getMonth() + 1).padStart(2, '0');
    const d = String(expected.getDate()).padStart(2, '0');
    const expectedStr = `${y}-${m}-${d}`;

    const s = summaries.data.find(item => item.date === expectedStr);
    if (s && s.goal_reached) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

/**
 * 检查并解锁成就
 */
async function checkAchievements(db, userId, streak, totalGoalDays, isFirstRecord) {
  const existingRes = await db.collection('achievements')
    .where({ user_id: userId })
    .get();
  const existing = new Set(existingRes.data.map(a => a.type));

  const toUnlock = [];

  if (isFirstRecord && !existing.has('first_record')) {
    toUnlock.push('first_record');
  }
  if (streak >= 3 && !existing.has('streak_3')) {
    toUnlock.push('streak_3');
  }
  if (streak >= 7 && !existing.has('streak_7')) {
    toUnlock.push('streak_7');
  }
  if (streak >= 30 && !existing.has('streak_30')) {
    toUnlock.push('streak_30');
  }
  if (totalGoalDays >= 10 && !existing.has('goal_reached_10')) {
    toUnlock.push('goal_reached_10');
  }

  for (const type of toUnlock) {
    await db.collection('achievements').add({
      data: {
        user_id: userId,
        type,
        unlocked_at: db.serverDate()
      }
    }).catch(() => {});
  }

  return toUnlock;
}

exports.main = async (event) => {
  const { date } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  if (!date) {
    return { success: false, error: '缺少 date 参数' };
  }

  try {
    // 获取用户信息
    const userRes = await db.collection('users').where({ _id: OPENID }).get();
    if (userRes.data.length === 0) {
      return { success: false, error: '用户不存在' };
    }
    const user = userRes.data[0];
    const calorieTarget = user.daily_calorie_target || 1800;

    // 查询当日餐食记录
    const recordsRes = await db.collection('meal_records')
      .where({ user_id: OPENID, date })
      .get();
    const records = recordsRes.data;

    if (records.length === 0) {
      return { success: false, error: '当日无记录' };
    }

    // 汇总营养数据
    let total_calories = 0, total_protein = 0, total_carbs = 0, total_fat = 0;
    records.forEach(r => {
      total_calories += r.calories || 0;
      total_protein += r.protein || 0;
      total_carbs += r.carbs || 0;
      total_fat += r.fat || 0;
    });
    total_protein = parseFloat(total_protein.toFixed(1));
    total_carbs = parseFloat(total_carbs.toFixed(1));
    total_fat = parseFloat(total_fat.toFixed(1));

    // 判断是否达标（在目标的 80%~120% 范围内）
    const goal_reached = total_calories >= calorieTarget * 0.8 && total_calories <= calorieTarget * 1.2;

    // 计算连续打卡天数（需先保存今天的记录）
    const streak = await calcStreak(db, OPENID);

    // 查询历史达标天数
    const goalDaysRes = await db.collection('daily_summary')
      .where({ user_id: OPENID, goal_reached: true })
      .count();
    const totalGoalDays = goalDaysRes.total + (goal_reached ? 1 : 0);

    // 是否是第一次记录
    const allRecordsRes = await db.collection('meal_records')
      .where({ user_id: OPENID })
      .count();
    const isFirstRecord = allRecordsRes.total <= records.length;

    // 更新或创建 daily_summary
    const summaryRes = await db.collection('daily_summary')
      .where({ user_id: OPENID, date })
      .get();

    const summaryData = {
      user_id: OPENID,
      date,
      total_calories,
      total_protein,
      total_carbs,
      total_fat,
      goal_reached,
      streak_day: streak,
      updated_at: db.serverDate()
    };

    if (summaryRes.data.length > 0) {
      await db.collection('daily_summary')
        .doc(summaryRes.data[0]._id)
        .update({ data: summaryData });
    } else {
      await db.collection('daily_summary').add({
        data: { ...summaryData, created_at: db.serverDate() }
      });
    }

    // 检查成就
    const newAchievements = await checkAchievements(db, OPENID, streak, totalGoalDays, isFirstRecord);

    return {
      success: true,
      summary: { ...summaryData, streak_day: streak },
      new_achievements: newAchievements
    };
  } catch (err) {
    console.error('dailySummary 失败:', err);
    return { success: false, error: err.message };
  }
};
