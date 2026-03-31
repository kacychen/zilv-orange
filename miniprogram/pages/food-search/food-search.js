const { getToday } = require('../../utils/date');
const { calcNutrition } = require('../../utils/nutrition');
const { localDB, serverDate } = require('../../utils/localDB');

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

    // 本地食物数据库搜索（原云函数 foodSearch 的内置数据）
    const FOOD_DB = [
      { food_id: '001', food_name: '白米饭', unit: '克', calories: 116, protein: 2.6, carbs: 25.9, fat: 0.3 },
      { food_id: '002', food_name: '全麦面包', unit: '克', calories: 246, protein: 9.0, carbs: 44.0, fat: 3.4 },
      { food_id: '003', food_name: '鸡胸肉', unit: '克', calories: 133, protein: 24.6, carbs: 0, fat: 3.2 },
      { food_id: '004', food_name: '鸡蛋', unit: '克', calories: 144, protein: 13.3, carbs: 2.8, fat: 8.8 },
      { food_id: '005', food_name: '牛奶', unit: '毫升', calories: 54, protein: 3.0, carbs: 5.0, fat: 3.2 },
      { food_id: '006', food_name: '西兰花', unit: '克', calories: 33, protein: 3.7, carbs: 3.0, fat: 0.4 },
      { food_id: '007', food_name: '苹果', unit: '克', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
      { food_id: '008', food_name: '香蕉', unit: '克', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
      { food_id: '009', food_name: '三文鱼', unit: '克', calories: 208, protein: 20.4, carbs: 0, fat: 13.4 },
      { food_id: '010', food_name: '豆腐', unit: '克', calories: 76, protein: 8.1, carbs: 1.9, fat: 4.2 },
      { food_id: '011', food_name: '燕麦片', unit: '克', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
      { food_id: '012', food_name: '花生', unit: '克', calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2 },
      { food_id: '013', food_name: '牛肉（瘦）', unit: '克', calories: 143, protein: 21.4, carbs: 0, fat: 6.1 },
      { food_id: '014', food_name: '猪肉（瘦）', unit: '克', calories: 143, protein: 20.3, carbs: 0, fat: 7.1 },
      { food_id: '015', food_name: '番茄', unit: '克', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      { food_id: '016', food_name: '黄瓜', unit: '克', calories: 15, protein: 0.7, carbs: 2.9, fat: 0.1 },
      { food_id: '017', food_name: '胡萝卜', unit: '克', calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
      { food_id: '018', food_name: '菠菜', unit: '克', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
      { food_id: '019', food_name: '橙子', unit: '克', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
      { food_id: '020', food_name: '葡萄', unit: '克', calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2 },
      { food_id: '021', food_name: '面条（煮熟）', unit: '克', calories: 138, protein: 5.0, carbs: 27.0, fat: 1.1 },
      { food_id: '022', food_name: '馒头', unit: '克', calories: 223, protein: 7.0, carbs: 47.0, fat: 1.0 },
      { food_id: '023', food_name: '酸奶（原味）', unit: '毫升', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
      { food_id: '024', food_name: '豆浆', unit: '毫升', calories: 33, protein: 3.0, carbs: 1.8, fat: 1.8 },
      { food_id: '025', food_name: '紫薯', unit: '克', calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1 },
      { food_id: '026', food_name: '南瓜', unit: '克', calories: 26, protein: 1.0, carbs: 6.5, fat: 0.1 },
      { food_id: '027', food_name: '虾', unit: '克', calories: 99, protein: 20.1, carbs: 0, fat: 1.1 },
      { food_id: '028', food_name: '鱼（草鱼）', unit: '克', calories: 113, protein: 16.6, carbs: 0, fat: 5.2 },
      { food_id: '029', food_name: '花椰菜', unit: '克', calories: 25, protein: 1.9, carbs: 5.0, fat: 0.3 },
      { food_id: '030', food_name: '玉米', unit: '克', calories: 86, protein: 3.2, carbs: 19.0, fat: 1.2 }
    ];

    const results = FOOD_DB.filter(f => f.food_name.includes(keyword)).slice(0, 20);
    this.setData({ results, loading: false });
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
      created_at: serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    localDB.add('meal_records', record).then(() => {
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
