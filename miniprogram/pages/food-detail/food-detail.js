const { getToday } = require('../../utils/date');
const { calcNutrition } = require('../../utils/nutrition');
const { localDB, serverDate } = require('../../utils/localDB');

Page({
  data: {
    mealType: 'breakfast',
    // 搜索结果传入的食物（可选）
    food: null,
    form: {
      food_name: '',
      amount: '100',
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    },
    // 搜索食物模式下，自动计算预览
    autoCalc: false
  },

  onLoad(options) {
    const mealType = options.mealType || 'breakfast';
    this.setData({ mealType });

    // 如果是从搜索结果传来的食物数据
    const app = getApp();
    if (app.globalData.pendingFood) {
      const food = app.globalData.pendingFood;
      app.globalData.pendingFood = null;

      // 按默认100g计算
      const nutrition = calcNutrition(food, 100);
      this.setData({
        food,
        autoCalc: true,
        form: {
          food_name: food.food_name,
          amount: '100',
          calories: String(nutrition.calories),
          protein: String(nutrition.protein),
          carbs: String(nutrition.carbs),
          fat: String(nutrition.fat)
        }
      });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const obj = {};
    obj[`form.${field}`] = value;
    this.setData(obj);

    // 搜索模式下，修改份量时自动重新计算营养
    if (field === 'amount' && this.data.autoCalc && this.data.food) {
      const amount = parseFloat(value) || 0;
      if (amount > 0) {
        const nutrition = calcNutrition(this.data.food, amount);
        this.setData({
          'form.calories': String(nutrition.calories),
          'form.protein': String(nutrition.protein),
          'form.carbs': String(nutrition.carbs),
          'form.fat': String(nutrition.fat)
        });
      }
    }
  },

  submit() {
    const f = this.data.form;

    if (!f.food_name.trim()) {
      wx.showToast({ title: '请填写食物名称', icon: 'none' });
      return;
    }

    const amount = parseFloat(f.amount);
    if (!amount || amount < 0.1 || amount > 9999) {
      wx.showToast({ title: '份量范围 0.1g ~ 9999g', icon: 'none' });
      return;
    }

    const calories = parseFloat(f.calories);
    if (isNaN(calories) || calories < 0) {
      wx.showToast({ title: '请填写正确的卡路里', icon: 'none' });
      return;
    }

    const record = {
      date: getToday(),
      meal_type: this.data.mealType,
      food_name: f.food_name.trim(),
      amount,
      calories,
      protein: parseFloat(f.protein) || 0,
      carbs: parseFloat(f.carbs) || 0,
      fat: parseFloat(f.fat) || 0,
      source: this.data.food ? 'search' : 'manual',
      created_at: serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    localDB.add('meal_records', record)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '添加成功', icon: 'success' });
        setTimeout(() => wx.navigateBack({ delta: 3 }), 1000);
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
  }
});
