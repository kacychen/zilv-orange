App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true
      });
    }

    // 检查用户是否已完成 onboarding
    this.checkOnboarding();
  },

  globalData: {
    userInfo: null,
    dailySummary: null,
    todayRecords: []
  },

  checkOnboarding() {
    const db = wx.cloud.database();
    wx.cloud.callFunction({
      name: 'login'
    }).then(res => {
      const openid = res.result.openid;
      this.globalData.openid = openid;

      db.collection('users').where({
        _id: openid
      }).get().then(res => {
        if (res.data.length === 0) {
          wx.navigateTo({ url: '/pages/onboarding/onboarding' });
        } else {
          this.globalData.userInfo = res.data[0];
        }
      });
    });
  }
});
