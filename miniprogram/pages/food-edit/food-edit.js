const db = wx.cloud.database();

Page({
  data: {
    id: '',
    foodName: '',
    amount: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    _originalAmount: 0,
    _originalCalories: 0,
    _originalProtein: 0,
    _originalCarbs: 0,
    _originalFat: 0,
    saving: false
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      wx.navigateBack();
      return;
    }
    this.setData({ id });
    this.loadRecord(id);
  },

  loadRecord(id) {
    wx.showLoading({ title: '加载中...' });
    db.collection('meal_records').doc(id).get().then(res => {
      wx.hideLoading();
      const r = res.data;
      const amount = r.amount != null ? String(r.amount) : '';
      const calories = r.calories != null ? String(r.calories) : '';
      const protein = r.protein != null ? String(r.protein) : '';
      const carbs = r.carbs != null ? String(r.carbs) : '';
      const fat = r.fat != null ? String(r.fat) : '';
      this.setData({
        foodName: r.food_name || '',
        amount,
        calories,
        protein,
        carbs,
        fat,
        _originalAmount: parseFloat(amount) || 0,
        _originalCalories: parseFloat(calories) || 0,
        _originalProtein: parseFloat(protein) || 0,
        _originalCarbs: parseFloat(carbs) || 0,
        _originalFat: parseFloat(fat) || 0
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'error' });
      wx.navigateBack();
    });
  },

  onInputFoodName(e) {
    this.setData({ foodName: e.detail.value });
  },

  onInputAmount(e) {
    this.setData({ amount: e.detail.value });
  },

  onAmountBlur() {
    const newAmount = parseFloat(this.data.amount);
    const oldAmount = this.data._originalAmount;
    if (!newAmount || newAmount <= 0 || !oldAmount || oldAmount <= 0 || newAmount === oldAmount) return;

    wx.showModal({
      title: '重算营养数据',
      content: '是否按克重比例自动重算营养数据？',
      confirmText: '重算',
      cancelText: '手动改',
      success: (res) => {
        if (!res.confirm) return;
        const ratio = newAmount / oldAmount;
        this.setData({
          calories: String(Math.round(this.data._originalCalories * ratio)),
          protein: String((this.data._originalProtein * ratio).toFixed(1)),
          carbs: String((this.data._originalCarbs * ratio).toFixed(1)),
          fat: String((this.data._originalFat * ratio).toFixed(1))
        });
      }
    });
  },

  onInputCalories(e) {
    this.setData({ calories: e.detail.value });
  },

  onInputProtein(e) {
    this.setData({ protein: e.detail.value });
  },

  onInputCarbs(e) {
    this.setData({ carbs: e.detail.value });
  },

  onInputFat(e) {
    this.setData({ fat: e.detail.value });
  },

  onSave() {
    const { id, foodName, amount, calories, protein, carbs, fat } = this.data;

    if (!foodName.trim()) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' });
      return;
    }
    const amountNum = parseFloat(amount);
    const caloriesNum = parseFloat(calories);
    const proteinNum = parseFloat(protein);
    const carbsNum = parseFloat(carbs);
    const fatNum = parseFloat(fat);

    if (!amountNum || amountNum <= 0) {
      wx.showToast({ title: '克重必须大于 0', icon: 'none' });
      return;
    }
    if (isNaN(caloriesNum) || caloriesNum < 0) {
      wx.showToast({ title: '请输入有效的卡路里', icon: 'none' });
      return;
    }
    if (isNaN(proteinNum) || proteinNum < 0 ||
        isNaN(carbsNum) || carbsNum < 0 ||
        isNaN(fatNum) || fatNum < 0) {
      wx.showToast({ title: '营养数据不能为负数', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    db.collection('meal_records').doc(id).update({
      data: {
        food_name: foodName.trim(),
        amount: amountNum,
        calories: Math.round(caloriesNum),
        protein: parseFloat(proteinNum.toFixed(1)),
        carbs: parseFloat(carbsNum.toFixed(1)),
        fat: parseFloat(fatNum.toFixed(1))
      }
    }).then(() => {
      this.setData({ saving: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    }).catch(() => {
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    });
  }
});
