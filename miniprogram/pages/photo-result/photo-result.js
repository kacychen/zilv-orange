const { getToday } = require('../../utils/date');
const { localDB, serverDate } = require('../../utils/localDB');

Page({
  data: {
    foods: [],
    mealType: 'breakfast',
    totalCalories: 0
  },

  onLoad() {
    const app = getApp();
    const foods = app.globalData.photoResult || [];
    const mealType = app.globalData.currentMealType || 'breakfast';
    const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);

    this.setData({ foods, mealType, totalCalories });
  },

  onAmountChange(e) {
    const index = e.currentTarget.dataset.index;
    const newAmount = parseFloat(e.detail.value) || 0;
    const foods = this.data.foods;

    // 基于原始比例重新计算
    const food = foods[index];
    const originalAmount = food.estimated_amount || 100;
    const ratio = newAmount / originalAmount;

    foods[index] = {
      ...food,
      estimated_amount: newAmount,
      calories: Math.round((food._originalCal || food.calories) * ratio),
      protein: parseFloat(((food._originalProtein || food.protein) * ratio).toFixed(1)),
      carbs: parseFloat(((food._originalCarbs || food.carbs) * ratio).toFixed(1)),
      fat: parseFloat(((food._originalFat || food.fat) * ratio).toFixed(1))
    };

    // 存储原始值
    if (!food._originalCal) {
      foods[index]._originalCal = food.calories;
      foods[index]._originalProtein = food.protein;
      foods[index]._originalCarbs = food.carbs;
      foods[index]._originalFat = food.fat;
    }

    const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
    this.setData({ foods, totalCalories });
  },

  removeFood(e) {
    const index = e.currentTarget.dataset.index;
    const foods = this.data.foods;
    foods.splice(index, 1);
    const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
    this.setData({ foods, totalCalories });
  },

  confirmAll() {
    if (this.data.foods.length === 0) return;

    const today = getToday();
    const promises = this.data.foods.map(food => {
      return localDB.add('meal_records', {
        date: today,
        meal_type: this.data.mealType,
        food_name: food.food_name,
        amount: food.estimated_amount || 100,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: 'photo',
        created_at: serverDate()
      });
    });

    wx.showLoading({ title: '保存中...' });
    Promise.all(promises).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ delta: 3 });
      }, 1000);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '部分保存失败', icon: 'none' });
    });
  }
});
