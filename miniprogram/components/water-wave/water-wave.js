Component({
  properties: {
    amount:  { type: Number, value: 0 },
    goal:    { type: Number, value: 2000 },
    percent: { type: Number, value: 0 }
  },

  observers: {
    'amount, goal': function(amount, goal) {
      const left = goal - amount;
      this.setData({ left });
    }
  },

  data: {
    left: 2000
  }
});
