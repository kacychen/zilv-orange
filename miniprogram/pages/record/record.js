const { getToday } = require('../../utils/date');

const MEAL_NAMES = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
};

Page({
  data: {
    mealType: 'breakfast',
    mealName: '早餐',
    showManual: false,
    manualFood: {
      food_name: '',
      amount: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    }
  },

  onLoad(options) {
    const mealType = options.mealType || 'breakfast';
    this.setData({
      mealType,
      mealName: MEAL_NAMES[mealType] || '早餐'
    });
  },

  goFoodSearch() {
    wx.navigateTo({
      url: `/pages/food-search/food-search?mealType=${this.data.mealType}`
    });
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: 'AI 识别中...' });

        // 上传到云存储
        wx.cloud.uploadFile({
          cloudPath: `food_photos/${Date.now()}.jpg`,
          filePath: tempFilePath,
          success: (uploadRes) => {
            // 调用 AI 识别云函数
            wx.cloud.callFunction({
              name: 'photoRecognize',
              data: { fileID: uploadRes.fileID },
              success: (funcRes) => {
                wx.hideLoading();
                const foods = funcRes.result.foods || [];
                if (foods.length > 0) {
                  // 跳转到识别结果页
                  const app = getApp();
                  app.globalData.photoResult = foods;
                  app.globalData.currentMealType = this.data.mealType;
                  wx.navigateTo({
                    url: '/pages/photo-result/photo-result'
                  });
                } else {
                  wx.showToast({
                    title: '未能识别食物，请换角度拍摄',
                    icon: 'none'
                  });
                }
              },
              fail: () => {
                wx.hideLoading();
                wx.showToast({
                  title: '识别失败，请尝试手动搜索',
                  icon: 'none'
                });
              }
            });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '图片上传失败', icon: 'none' });
          }
        });
      }
    });
  },

  manualInput() {
    this.setData({ showManual: !this.data.showManual });
  },

  onInputName(e) { this.setData({ 'manualFood.food_name': e.detail.value }); },
  onInputAmount(e) { this.setData({ 'manualFood.amount': e.detail.value }); },
  onInputCalories(e) { this.setData({ 'manualFood.calories': e.detail.value }); },
  onInputProtein(e) { this.setData({ 'manualFood.protein': e.detail.value }); },
  onInputCarbs(e) { this.setData({ 'manualFood.carbs': e.detail.value }); },
  onInputFat(e) { this.setData({ 'manualFood.fat': e.detail.value }); },

  submitManual() {
    const f = this.data.manualFood;
    const cal = parseFloat(f.calories);
    if (!f.food_name || !Number.isFinite(cal) || cal <= 0) {
      wx.showToast({ title: '请填写食物名称和卡路里', icon: 'none' });
      return;
    }

    const amount = parseFloat(f.amount) || 0;
    if (amount < 0.1 || amount > 9999) {
      wx.showToast({ title: '份量范围 0.1g ~ 9999g', icon: 'none' });
      return;
    }

    const db = wx.cloud.database();
    const record = {
      date: getToday(),
      meal_type: this.data.mealType,
      food_name: f.food_name,
      amount: amount,
      calories: cal,
      protein: Math.max(0, parseFloat(f.protein) || 0),
      carbs: Math.max(0, parseFloat(f.carbs) || 0),
      fat: Math.max(0, parseFloat(f.fat) || 0),
      source: 'manual',
      created_at: db.serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    db.collection('meal_records').add({ data: record }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
