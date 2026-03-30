const { getToday } = require('../../utils/date');
const { calcNutrition } = require('../../utils/nutrition');

Page({
  data: {
    mealType: 'breakfast',
    keyword: '',
    results: [],
    searched: false,
    loading: false,
    showAmountModal: false,
    selectedFood: null,
    inputAmount: '100',
    previewCal: 0,
    previewProtein: 0,
    previewCarbs: 0,
    previewFat: 0
  },

  onLoad(options) {
    this.setData({ mealType: options.mealType || 'breakfast' });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  doSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;

    this.setData({ loading: true, searched: true });

    wx.cloud.callFunction({
      name: 'foodSearch',
      data: { keyword }
    }).then(res => {
      this.setData({
        results: res.result.foods || [],
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '搜索暂时不可用', icon: 'none' });
    });
  },

  selectFood(e) {
    const index = e.currentTarget.dataset.index;
    const food = this.data.results[index];
    const amount = 100;
    const nutrition = calcNutrition(food, amount);

    this.setData({
      selectedFood: food,
      showAmountModal: true,
      inputAmount: '100',
      previewCal: nutrition.calories,
      previewProtein: nutrition.protein,
      previewCarbs: nutrition.carbs,
      previewFat: nutrition.fat
    });
  },

  onAmountInput(e) {
    const amount = parseFloat(e.detail.value) || 0;
    if (this.data.selectedFood && amount > 0) {
      const nutrition = calcNutrition(this.data.selectedFood, amount);
      this.setData({
        inputAmount: e.detail.value,
        previewCal: nutrition.calories,
        previewProtein: nutrition.protein,
        previewCarbs: nutrition.carbs,
        previewFat: nutrition.fat
      });
    } else {
      this.setData({ inputAmount: e.detail.value });
    }
  },

  closeModal() {
    this.setData({ showAmountModal: false });
  },

  confirmAdd() {
    const amount = parseFloat(this.data.inputAmount);
    if (!amount || amount < 0.1 || amount > 9999) {
      wx.showToast({ title: '份量范围 0.1g ~ 9999g', icon: 'none' });
      return;
    }

    const food = this.data.selectedFood;
    const nutrition = calcNutrition(food, amount);
    const db = wx.cloud.database();

    const record = {
      date: getToday(),
      meal_type: this.data.mealType,
      food_id: food.food_id || '',
      food_name: food.food_name,
      amount: amount,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      source: 'search',
      created_at: db.serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    db.collection('meal_records').add({
      data: record
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      this.setData({ showAmountModal: false });
      setTimeout(() => wx.navigateBack({ delta: 2 }), 1000);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
