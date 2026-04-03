const db = wx.cloud.database();

Component({
  properties: {
    mealType: { type: String, value: 'breakfast' },
    mealName: { type: String, value: '早餐' },
    icon: { type: String, value: '🌅' },
    iconBg: { type: String, value: '#FFF3E0' },
    calories: { type: Number, value: 0 },
    foods: { type: Array, value: [] }
  },

  data: {
    slideIndex: -1
  },

  methods: {
    onTap() {
      // 若有滑开的条目，先复位
      if (this.data.slideIndex >= 0) {
        this._resetSlide();
        return;
      }
      this.triggerEvent('add', { mealType: this.data.mealType });
    },

    onTouchStart() {
      // 记录触摸开始，用于区分滑动和点击
    },

    onSlideChange(e) {
      const index = e.currentTarget.dataset.index;
      const x = e.detail.x;
      const foods = this.data.foods;

      // 先复位其他滑开的条目
      if (this.data.slideIndex >= 0 && this.data.slideIndex !== index) {
        this._resetSlide();
      }

      if (x <= -80) {
        // 吸附到 -160（完全露出删除按钮）
        const newFoods = foods.map((f, i) => ({
          ...f,
          _slideX: i === index ? -160 : 0
        }));
        this.setData({ foods: newFoods, slideIndex: index });
      } else if (x >= -20) {
        // 复位
        const newFoods = foods.map((f, i) => ({
          ...f,
          _slideX: i === index ? 0 : f._slideX || 0
        }));
        this.setData({ foods: newFoods, slideIndex: -1 });
      }
    },

    _resetSlide() {
      const newFoods = this.data.foods.map(f => ({ ...f, _slideX: 0 }));
      this.setData({ foods: newFoods, slideIndex: -1 });
    },

    onEditFood(e) {
      // 若当前有滑开条目，先复位，不跳转
      if (this.data.slideIndex >= 0) {
        this._resetSlide();
        return;
      }
      const index = e.currentTarget.dataset.index;
      const food = this.data.foods[index];
      if (!food || !food._id) return;
      this.triggerEvent('editFood', { id: food._id });
    },

    onDeleteFood(e) {
      const index = e.currentTarget.dataset.index;
      const food = this.data.foods[index];
      if (!food || !food._id) return;

      wx.showModal({
        title: '确认删除',
        content: `确认删除「${food.food_name}」？`,
        confirmColor: '#FF4444',
        success: (res) => {
          if (!res.confirm) {
            this._resetSlide();
            return;
          }
          wx.showLoading({ title: '删除中...' });
          db.collection('meal_records').doc(food._id).remove().then(() => {
            wx.hideLoading();
            // 本地移除
            const newFoods = this.data.foods.filter((_, i) => i !== index)
              .map(f => ({ ...f, _slideX: 0 }));
            this.setData({ foods: newFoods, slideIndex: -1 });
            // 通知父页面更新汇总
            this.triggerEvent('foodDeleted', {
              _id: food._id,
              mealType: this.data.mealType,
              calories: food.calories || 0,
              protein: food.protein || 0,
              carbs: food.carbs || 0,
              fat: food.fat || 0
            });
          }).catch(() => {
            wx.hideLoading();
            this._resetSlide();
            wx.showToast({ title: '删除失败，请重试', icon: 'error' });
          });
        }
      });
    }
  }
});
