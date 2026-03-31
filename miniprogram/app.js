App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({ traceUser: true });
    this.checkOnboarding();
  },

  globalData: {
    userInfo: null,
    dailySummary: null,
    todayRecords: [],
    openid: ''
  },

  checkOnboarding() {
    const db = wx.cloud.database();
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result.openid;
      this.globalData.openid = openid;

      db.collection('users').where({ _id: openid }).get().then(res => {
        if (res.data.length === 0) {
          wx.navigateTo({ url: '/pages/onboarding/onboarding' });
        } else {
          this.globalData.userInfo = res.data[0];
        }
      });
    }).catch(err => {
      console.error('login 云函数调用失败', err);
    });
  }
});
