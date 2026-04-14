App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({ env: 'cloud1-5gi2unut161474f9', traceUser: true });
    this.checkOnboarding();
  },

  globalData: {
    userInfo: null,
    isMember: false,
    dailySummary: null,
    todayRecords: [],
    openid: ''
  },

  checkOnboarding() {
    const db = wx.cloud.database();
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result.openid;
      this.globalData.openid = openid;

      db.collection('users').doc(openid).get().then(res => {
        this.globalData.userInfo = res.data;
        // 预计算会员状态，方便各页面快速判断
        const { isMember } = require('./utils/member');
        this.globalData.isMember = isMember(res.data);
      }).catch(err => {
        // 文档不存在（errCode -1）或其他错误 → 引导注册
        if (err.errCode === -1 || (err.message && err.message.includes('not exist'))) {
          wx.navigateTo({ url: '/pages/onboarding/onboarding' });
        } else {
          console.error('查询用户信息失败', err);
        }
      });
    }).catch(err => {
      console.error('login 云函数调用失败', err);
    });
  }
});
