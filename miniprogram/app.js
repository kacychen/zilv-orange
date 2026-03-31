const { localDB, LOCAL_OPENID } = require('./utils/localDB');

App({
  onLaunch() {
    // 本地调试模式：不需要云开发
    this.globalData.openid = LOCAL_OPENID;
    this.checkOnboarding();
  },

  globalData: {
    userInfo: null,
    dailySummary: null,
    todayRecords: [],
    openid: LOCAL_OPENID
  },

  checkOnboarding() {
    localDB.query('users', { _id: LOCAL_OPENID }).then(res => {
      if (res.data.length === 0) {
        // 新用户，跳转引导页
        wx.navigateTo({ url: '/pages/onboarding/onboarding' });
      } else {
        this.globalData.userInfo = res.data[0];
      }
    });
  }
});
