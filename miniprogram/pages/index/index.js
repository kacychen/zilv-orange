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
    snackCal: 0,
    // 新增：运动消耗
    totalBurned: 0,
    todaySteps: 0
  },

  onLoad() {},

  onShow() {
    this.setGreeting();
    this.setDateStr();
    this.loadUserInfo();
    this.loadTodayRecords();
    this.loadExerciseData();
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

    db.collection('meal_records').where({ date: today }).get().then(res => {
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
        totalFat: summary.total_fat,
        remaining: this.data.calorieTarget - summary.total_calories + this.data.totalBurned
      });
    }).catch(err => {
      console.error('加载记录失败', err);
      wx.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
    });
  },

  loadExerciseData() {
    const db = wx.cloud.database();
    const today = getToday();

    db.collection('exercise_records').where({ date: today }).get().then(res => {
      const totalBurned = res.data.reduce((sum, r) => sum + (r.calories || 0), 0);
      this.setData({
        totalBurned,
        remaining: this.data.calorieTarget - this.data.totalCalories + totalBurned
      });
    }).catch(err => {
      console.error('加载运动记录失败', err);
    });
  },

  loadTodaySteps() {
    wx.getWeRunData({
      success: (res) => {
        const stepInfoList = res.stepInfoList || [];
        const today = getToday();
        const todayEntry = stepInfoList.find(s => {
          const d = new Date(s.timestamp * 1000);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}` === today;
        });
        this.setData({ todaySteps: todayEntry ? todayEntry.step : 0 });
      },
      fail: () => {
        // 用户未授权或不支持，步数显示 0，不影响功能
        this.setData({ todaySteps: 0 });
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
      remaining: this.data.calorieTarget - Math.max(0, newTotalCalories) + this.data.totalBurned
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
