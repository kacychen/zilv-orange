Component({
  properties: {
    mealType: { type: String, value: 'breakfast' },
    mealName: { type: String, value: '早餐' },
    icon: { type: String, value: '🌅' },
    iconBg: { type: String, value: '#FFF3E0' },
    calories: { type: Number, value: 0 },
    foods: { type: Array, value: [] }
  },

  methods: {
    onTap() {
      this.triggerEvent('add', { mealType: this.data.mealType });
    }
  }
});
