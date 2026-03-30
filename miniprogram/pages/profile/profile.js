const { calcDailyTarget } = require('../../utils/bmr');

const GOAL_LABELS = {
  lose_weight: '减脂',
  gain_muscle: '增肌',
  maintain: '维持'
};

const ACTIVITY_LABELS = {
  sedentary: '久坐',
  light: '轻度活动',
  moderate: '中度活动',
  active: '高度活动'
};

const ACHIEVEMENT_CONFIG = {
  first_record: { icon: '🌱', name: '初次记录', desc: '完成第一次饮食记录' },
  streak_3: { icon: '🔥', name: '坚持3天', desc: '连续打卡3天' },
  streak_7: { icon: '💪', name: '一周达人', desc: '连续打卡7天' },
  streak_30: { icon: '🏆', name: '月度冠军', desc: '连续打卡30天' },
  goal_reached_10: { icon: '🎯', name: '十次达标', desc: '累计达标10天' }
};

Page({
  data: {
    user: null,
    streak: 0,
    totalRecordDays: 0,
    achievements: [],
    goalLabel: '',
    activityLabel: '',
    editing: false,
    editForm: {}
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const app = getApp();
    const user = app.globalData.userInfo;

    if (!user) return;

    this.setData({
      user,
      goalLabel: GOAL_LABELS[user.goal] || user.goal,
      activityLabel: ACTIVITY_LABELS[user.activity_level] || user.activity_level
    });

    this.loadStreak();
    this.loadAchievements();
  },

  loadStreak() {
    const db = wx.cloud.database();
    db.collection('daily_summary')
      .orderBy('date', 'desc')
      .limit(60)
      .get()
      .then(res => {
        const summaries = res.data;
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < summaries.length; i++) {
          const expected = new Date(today);
          expected.setDate(today.getDate() - i);
          const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;

          const s = summaries.find(item => item.date === expectedStr);
          if (s && s.goal_reached) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }

        this.setData({ streak, totalRecordDays: summaries.length });
      });
  },

  loadAchievements() {
    const db = wx.cloud.database();
    db.collection('achievements').get().then(res => {
      const achievements = res.data.map(a => ({
        ...a,
        ...(ACHIEVEMENT_CONFIG[a.type] || { icon: '🏅', name: a.type, desc: '' })
      }));
      this.setData({ achievements });
    });
  },

  startEdit() {
    const user = this.data.user;
    this.setData({
      editing: true,
      editForm: {
        nickname: user.nickname,
        height: String(user.height),
        weight: String(user.weight),
        target_weight: String(user.target_weight || ''),
        goal: user.goal,
        activity_level: user.activity_level
      }
    });
  },

  cancelEdit() {
    this.setData({ editing: false });
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field;
    const obj = {};
    obj[`editForm.${field}`] = e.detail.value;
    this.setData(obj);
  },

  setEditGoal(e) {
    this.setData({ 'editForm.goal': e.currentTarget.dataset.value });
  },

  setEditActivity(e) {
    this.setData({ 'editForm.activity_level': e.currentTarget.dataset.value });
  },

  saveEdit() {
    const f = this.data.editForm;
    if (!f.nickname || !f.height || !f.weight) {
      wx.showToast({ title: '请完善必填信息', icon: 'none' });
      return;
    }

    const app = getApp();
    const user = app.globalData.userInfo;

    const updatedUser = {
      ...user,
      nickname: f.nickname.trim(),
      height: parseFloat(f.height),
      weight: parseFloat(f.weight),
      target_weight: parseFloat(f.target_weight) || parseFloat(f.weight),
      goal: f.goal,
      activity_level: f.activity_level
    };
    updatedUser.daily_calorie_target = calcDailyTarget(updatedUser);

    const db = wx.cloud.database();
    wx.showLoading({ title: '保存中...' });

    db.collection('users').doc(user._id).update({
      data: {
        nickname: updatedUser.nickname,
        height: updatedUser.height,
        weight: updatedUser.weight,
        target_weight: updatedUser.target_weight,
        goal: updatedUser.goal,
        activity_level: updatedUser.activity_level,
        daily_calorie_target: updatedUser.daily_calorie_target
      }
    }).then(() => {
      app.globalData.userInfo = updatedUser;
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({
        editing: false,
        user: updatedUser,
        goalLabel: GOAL_LABELS[updatedUser.goal],
        activityLabel: ACTIVITY_LABELS[updatedUser.activity_level]
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
