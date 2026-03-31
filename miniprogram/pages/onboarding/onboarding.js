const { calcDailyTarget } = require('../../utils/bmr');

Page({
  data: {
    step: 1,
    submitting: false,
    estimatedCalorie: 0,
    form: {
      nickname: '',
      gender: 1,
      birthday: '',
      height: '',
      weight: '',
      target_weight: '',
      goal: 'lose_weight',
      activity_level: 'moderate'
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const obj = {};
    obj[`form.${field}`] = e.detail.value;
    this.setData(obj);
  },

  onBirthday(e) {
    this.setData({ 'form.birthday': e.detail.value });
  },

  setGender(e) {
    this.setData({ 'form.gender': parseInt(e.currentTarget.dataset.value) });
  },

  setGoal(e) {
    this.setData({ 'form.goal': e.currentTarget.dataset.value });
    this.updateCaloriePreview();
  },

  setActivity(e) {
    this.setData({ 'form.activity_level': e.currentTarget.dataset.value });
    this.updateCaloriePreview();
  },

  updateCaloriePreview() {
    const { form } = this.data;
    if (form.height && form.weight && form.birthday) {
      try {
        const target = calcDailyTarget({
          weight: parseFloat(form.weight),
          height: parseFloat(form.height),
          birthday: form.birthday,
          gender: form.gender,
          activity_level: form.activity_level,
          goal: form.goal
        });
        this.setData({ estimatedCalorie: target });
      } catch (e) {
        // ignore
      }
    }
  },

  nextStep() {
    const { step, form } = this.data;

    if (step === 1) {
      if (!form.nickname.trim()) {
        wx.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      if (!form.birthday) {
        wx.showToast({ title: '请选择出生年月', icon: 'none' });
        return;
      }
      this.setData({ step: 2 });
    } else if (step === 2) {
      if (!form.height || parseFloat(form.height) < 100 || parseFloat(form.height) > 250) {
        wx.showToast({ title: '请输入正确的身高（100~250cm）', icon: 'none' });
        return;
      }
      if (!form.weight || parseFloat(form.weight) < 20 || parseFloat(form.weight) > 300) {
        wx.showToast({ title: '请输入正确的体重（20~300kg）', icon: 'none' });
        return;
      }
      this.updateCaloriePreview();
      this.setData({ step: 3 });
    }
  },

  prevStep() {
    if (this.data.step > 1) this.setData({ step: this.data.step - 1 });
  },

  submit() {
    if (this.data.submitting) return;

    const { form } = this.data;
    let dailyCalorieTarget;
    try {
      dailyCalorieTarget = calcDailyTarget({
        weight: parseFloat(form.weight),
        height: parseFloat(form.height),
        birthday: form.birthday,
        gender: form.gender,
        activity_level: form.activity_level,
        goal: form.goal
      });
    } catch (e) {
      wx.showToast({ title: '参数计算失败，请检查输入', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    const app = getApp();
    const openid = app.globalData.openid;
    if (!openid) {
      wx.showToast({ title: '用户信息获取失败，请重启', icon: 'none' });
      this.setData({ submitting: false });
      return;
    }
    const db = wx.cloud.database();

    const userData = {
      _id: openid,
      nickname: form.nickname.trim(),
      gender: form.gender,
      birthday: form.birthday,
      height: parseFloat(form.height),
      weight: parseFloat(form.weight),
      target_weight: parseFloat(form.target_weight) || parseFloat(form.weight),
      goal: form.goal,
      activity_level: form.activity_level,
      daily_calorie_target: dailyCalorieTarget,
      created_at: db.serverDate()
    };

    db.collection('users').add({ data: userData }).then(() => {
      app.globalData.userInfo = userData;
      wx.showToast({ title: '设置成功！', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1500);
    }).catch(err => {
      console.error('保存用户信息失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      this.setData({ submitting: false });
    });
  }
});
