Page({
  data: {
    totalAmount: 1200,
    waterGoal: 2000,
    percent: 60,
    cupCount: 5,
    streakDays: 3,
    yesterdayAmount: 1800,
    customAmount: '',
    showGoalModal: false,
    weightInput: '',
    goalInput: '',
    quickList: [
      { type: 'water',  type_name: '白水', icon: '💧', amount: 250 },
      { type: 'water',  type_name: '大杯', icon: '🍶', amount: 350 },
      { type: 'coffee', type_name: '咖啡', icon: '☕', amount: 200 },
      { type: 'tea',    type_name: '茶',   icon: '🍵', amount: 300 }
    ],
    records: [
      { _id: '1', type: 'coffee', type_name: '咖啡', icon: '☕', amount: 200, timeStr: '10:30', _slideX: 0 },
      { _id: '2', type: 'water',  type_name: '白水', icon: '💧', amount: 250, timeStr: '09:15', _slideX: 0 },
      { _id: '3', type: 'water',  type_name: '白水', icon: '💧', amount: 150, timeStr: '08:00', _slideX: 0 }
    ],
    slideIndex: -1
  },

  onShow() {
    // TODO: 后续在此调用 loadData() 刷新当日饮水数据
  }
});
