const { getToday } = require('../../utils/date');
const { sumNutrition, recommendedNutrients } = require('../../utils/nutrition');

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
    snackCal: 0
  },

  onLoad() {
    this.setGreeting();
    this.setDateStr();
  },

  onShow() {
    this.loadUserInfo();
    this.loadTodayRecords();
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

    db.collection('meal_records').where({ date: today }).get().then(res => {
      const records = res.data;
      const app = getApp();
      app.globalData.todayRecords = records;

      // 按餐次分组
      const groups = { breakfast: [], lunch: [], dinner: [], snack: [] };
      records.forEach(r => {
        if (groups[r.meal_type]) {
          groups[r.meal_type].push(r);
        }
      });

      // 计算各餐次卡路里
      const calcMealCal = (foods) => foods.reduce((sum, f) => sum + (f.calories || 0), 0);

      // 汇总
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
        totalFat: summary.total_fat,
        remaining: this.data.calorieTarget - summary.total_calories
      });
    }).catch(err => {
      console.error('加载记录失败', err);
    });
  },

  onAddMeal(e) {
    const { mealType } = e.detail;
    wx.navigateTo({
      url: `/pages/record/record?mealType=${mealType}`
    });
  }
});
