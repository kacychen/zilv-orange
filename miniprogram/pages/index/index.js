const { getToday } = require('../../utils/date');
const { sumNutrition, recommendedNutrients } = require('../../utils/nutrition');

function timestampToDateStr(ts) {
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

Page({
  data: {
    greeting: '',
    nickname: '橙子用户',
    dateStr: '',
    calorieTarget: 1800,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    remaining: 1800,
    proteinTarget: 135,
    carbsTarget: 203,
    fatTarget: 50,
    breakfastFoods: [],
    lunchFoods: [],
    dinnerFoods: [],
    snackFoods: [],
    breakfastCal: 0,
    lunchCal: 0,
    dinnerCal: 0,
    snackCal: 0,
    // 运动消耗
    totalBurned: 0,
    stepsBurned: 0,
    todaySteps: 0,
    // 'unauthorized': 未授权  'denied': 已拒绝需去设置  'granted': 已授权  'disabled': 微信运动未开启
    stepsStatus: 'unauthorized'
  },

  onLoad() {},

  onShow() {
    this.setGreeting();
    this.setDateStr();
    this.loadUserInfo();
    Promise.all([this.loadTodayRecords(), this.loadExerciseData()]).then(() => {
      this.recalcRemaining();
    });
    this.loadTodaySteps();
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '晚上好';
    if (hour < 6) greeting = '凌晨好';
    else if (hour < 12) greeting = '早上好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    this.setData({ greeting });
  },

  setDateStr() {
    const d = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
    this.setData({ dateStr });
  },

  loadUserInfo() {
    const app = getApp();
    if (app.globalData.userInfo) {
      const user = app.globalData.userInfo;
      const target = user.daily_calorie_target || 1800;
      const nutrients = recommendedNutrients(target);
      this.setData({
        nickname: user.nickname || '橙子用户',
        calorieTarget: target,
        proteinTarget: nutrients.protein,
        carbsTarget: nutrients.carbs,
        fatTarget: nutrients.fat
      });
    }
  },

  loadTodayRecords() {
    const db = wx.cloud.database();
    const today = getToday();

    return db.collection('meal_records').where({ date: today }).get().then(res => {
      const records = res.data;
      const app = getApp();
      app.globalData.todayRecords = records;

      const groups = { breakfast: [], lunch: [], dinner: [], snack: [] };
      records.forEach(r => {
        if (groups[r.meal_type]) groups[r.meal_type].push(r);
      });

      const calcMealCal = (foods) => foods.reduce((sum, f) => sum + (f.calories || 0), 0);
      const summary = sumNutrition(records);

      this.setData({
        breakfastFoods: groups.breakfast,
        lunchFoods: groups.lunch,
        dinnerFoods: groups.dinner,
        snackFoods: groups.snack,
        breakfastCal: calcMealCal(groups.breakfast),
        lunchCal: calcMealCal(groups.lunch),
        dinnerCal: calcMealCal(groups.dinner),
        snackCal: calcMealCal(groups.snack),
        totalCalories: summary.total_calories,
        totalProtein: summary.total_protein,
        totalCarbs: summary.total_carbs,
        totalFat: summary.total_fat
      });
    }).catch(err => {
      console.error('加载记录失败', err);
      wx.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
    });
  },

  loadExerciseData() {
    const db = wx.cloud.database();
    const today = getToday();

    return db.collection('exercise_records').where({ date: today }).get().then(res => {
      const totalBurned = (res.data || []).reduce((sum, r) => sum + (r.calories || 0), 0);
      this.setData({ totalBurned });
    }).catch(err => {
      // -502005: 集合不存在（首次使用），静默处理
      if (err.errCode === -502005) {
        this.setData({ totalBurned: 0 });
        return;
      }
      console.error('加载运动记录失败', err);
      wx.showToast({ title: '运动记录加载失败', icon: 'none' });
    });
  },

  recalcRemaining() {
    const { calorieTarget, totalCalories, totalBurned, stepsBurned } = this.data;
    this.setData({
      remaining: calorieTarget - totalCalories + totalBurned + stepsBurned
    });
  },

  loadTodaySteps() {
    wx.getSetting({
      success: (res) => {
        const auth = res.authSetting['scope.werun'];
        if (auth === undefined || auth === false) {
          // undefined = 从未询问过；false = 用户曾拒绝
          this.setData({ stepsStatus: auth === false ? 'denied' : 'unauthorized' });
          return;
        }
        // 已授权，拉取步数
        wx.getWeRunData({
          success: (res) => {
            const cloudID = res.cloudID;
            if (!cloudID) {
              // 理论上不会走到这里，保底处理
              this.setData({ stepsStatus: 'granted', todaySteps: 0, stepsBurned: 0 });
              return;
            }
            wx.cloud.callFunction({
              name: 'getWeRunData',
              data: { weRunData: wx.cloud.CloudID(String(cloudID)) }
            }).then(r => {
              const result = r.result;
              if (!result.success) {
                console.error('[steps] 云函数解密失败', result);
                this.setData({ stepsStatus: 'granted', todaySteps: 0, stepsBurned: 0 });
                return;
              }
              const stepInfoList = result.stepInfoList || [];
              const today = getToday();
              const todayEntry = stepInfoList.find(s => timestampToDateStr(s.timestamp) === today);
              const steps = todayEntry ? todayEntry.step : 0;
              const app = getApp();
              const weight = (app.globalData.userInfo && app.globalData.userInfo.weight) || 60;
              const stepsBurned = Math.round(steps * weight * 0.0005);
              this.setData({ todaySteps: steps, stepsBurned, stepsStatus: 'granted' });
              this.recalcRemaining();
            }).catch(err => {
              console.error('[steps] 调用云函数失败', err);
              this.setData({ stepsStatus: 'granted', todaySteps: 0, stepsBurned: 0 });
            });
          },
          fail: () => {
            // 授权有但拿不到数据，通常是用户没开微信运动
            this.setData({ stepsStatus: 'disabled' });
          }
        });
      },
      fail: () => {
        this.setData({ stepsStatus: 'unauthorized' });
      }
    });
  },

  // 点击「授权步数」按钮
  onAuthSteps() {
    wx.authorize({
      scope: 'scope.werun',
      success: () => {
        this.loadTodaySteps();
      },
      fail: () => {
        // 用户点了拒绝，引导去设置
        this.setData({ stepsStatus: 'denied' });
      }
    });
  },

  // 点击「去设置开启」按钮（已拒绝情况）
  onOpenStepsSetting() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.werun']) {
          this.loadTodaySteps();
        }
      }
    });
  },

  onAddMeal(e) {
    const { mealType } = e.detail;
    wx.navigateTo({ url: `/pages/record/record?mealType=${mealType}` });
  },

  onFoodDeleted(e) {
    const { _id, mealType, calories, protein, carbs, fat } = e.detail;
    const foodsKey = `${mealType}Foods`;
    const calKey = `${mealType}Cal`;

    const newFoods = (this.data[foodsKey] || []).filter(f => f._id !== _id);
    const newCal = newFoods.reduce((sum, f) => sum + (f.calories || 0), 0);

    const newTotalCalories = this.data.totalCalories - (calories || 0);
    const newTotalProtein = parseFloat((this.data.totalProtein - (protein || 0)).toFixed(1));
    const newTotalCarbs = parseFloat((this.data.totalCarbs - (carbs || 0)).toFixed(1));
    const newTotalFat = parseFloat((this.data.totalFat - (fat || 0)).toFixed(1));

    this.setData({
      [foodsKey]: newFoods,
      [calKey]: newCal,
      totalCalories: Math.max(0, newTotalCalories),
      totalProtein: Math.max(0, newTotalProtein),
      totalCarbs: Math.max(0, newTotalCarbs),
      totalFat: Math.max(0, newTotalFat),
      remaining: this.data.calorieTarget - Math.max(0, newTotalCalories) + this.data.totalBurned + this.data.stepsBurned
    });
  },

  onEditFood(e) {
    const { id } = e.detail;
    wx.navigateTo({ url: `/pages/food-edit/food-edit?id=${id}` });
  },

  onAddExercise() {
    wx.navigateTo({ url: '/pages/exercise-search/exercise-search' });
  }
});
