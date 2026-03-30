Component({
  properties: {
    name: { type: String, value: '' },
    current: { type: Number, value: 0 },
    target: { type: Number, value: 100 },
    color: { type: String, value: '#FF7A00' }
  },

  data: {
    percent: 0
  },

  observers: {
    'current, target': function (current, target) {
      const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
      this.setData({ percent });
    }
  }
});
