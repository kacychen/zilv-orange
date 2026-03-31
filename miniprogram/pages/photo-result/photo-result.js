const { getToday } = require('../../utils/date');

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
    const foods = [...this.data.foods];

    const food = foods[index];
    // Store originals on first edit
    const originalCal = food._originalCal !== undefined ? food._originalCal : food.calories;
    const originalProtein = food._originalProtein !== undefined ? food._originalProtein : food.protein;
    const originalCarbs = food._originalCarbs !== undefined ? food._originalCarbs : food.carbs;
    const originalFat = food._originalFat !== undefined ? food._originalFat : food.fat;
    const originalAmount = food._originalAmount !== undefined ? food._originalAmount : (food.estimated_amount || 100);

    const ratio = newAmount / originalAmount;

    foods[index] = {
      ...food,
      estimated_amount: newAmount,
      calories: Math.round(originalCal * ratio),
      protein: parseFloat((originalProtein * ratio).toFixed(1)),
      carbs: parseFloat((originalCarbs * ratio).toFixed(1)),
      fat: parseFloat((originalFat * ratio).toFixed(1)),
      _originalCal: originalCal,
      _originalProtein: originalProtein,
      _originalCarbs: originalCarbs,
      _originalFat: originalFat,
      _originalAmount: originalAmount
    };

    const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
    this.setData({ foods, totalCalories });
  },

  removeFood(e) {
    const index = e.currentTarget.dataset.index;
    const foods = [...this.data.foods];
    foods.splice(index, 1);
    const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
    this.setData({ foods, totalCalories });
  },

  confirmAll() {
    if (this.data.foods.length === 0) return;

    const db = wx.cloud.database();
    const today = getToday();
    wx.showLoading({ title: '保存中...' });
    const promises = this.data.foods.map(food => {
      return db.collection('meal_records').add({
        data: {
          date: today,
          meal_type: this.data.mealType,
          food_name: food.food_name,
          amount: food.estimated_amount || 100,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          source: 'photo',
          created_at: db.serverDate()
        }
      });
    });

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
