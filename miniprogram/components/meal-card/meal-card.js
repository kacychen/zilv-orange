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

    onTouchStart(e) {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
      this._touchIndex = e.currentTarget.dataset.index;
      this._isSwiping = false;
    },

    onTouchMove(e) {
      const dx = e.touches[0].clientX - this._touchStartX;
      const dy = e.touches[0].clientY - this._touchStartY;

      // 竖向滚动优先，不拦截
      if (!this._isSwiping && Math.abs(dy) > Math.abs(dx)) {
        return;
      }
      this._isSwiping = true;

      const index = this._touchIndex;
      const currentX = this.data.foods[index]._slideX || 0;
      let newX = currentX + dx * 2; // px 转 rpx 近似
      newX = Math.max(-160, Math.min(0, newX));

      // 关闭其他已打开的条目
      const foods = this.data.foods.map((f, i) => ({
        ...f,
        _slideX: i === index ? newX : 0
      }));
      this.setData({ foods, slideIndex: newX < -10 ? index : -1 });
      this._touchStartX = e.touches[0].clientX;
    },

    onTouchEnd() {
      if (!this._isSwiping) return;
      const index = this._touchIndex;
      const currentX = this.data.foods[index]._slideX || 0;

      // 超过一半吸附展开，否则复位
      const snapX = currentX < -80 ? -160 : 0;
      const foods = this.data.foods.map((f, i) => ({
        ...f,
        _slideX: i === index ? snapX : (f._slideX || 0)
      }));
      this.setData({ foods, slideIndex: snapX < 0 ? index : -1 });
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
          const db = wx.cloud.database();
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
