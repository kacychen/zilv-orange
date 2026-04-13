// miniprogram/pages/exercise-search/exercise-search.js
const { getToday } = require('../../utils/date');
const EXERCISES = require('../../utils/exercises');

const DURATION_PRESETS = [15, 30, 45, 60];

function calcCal(met, weight, durationMin) {
  return Math.round(met * weight * (durationMin / 60));
}

function buildGroups(exercises, keyword, weight) {
  const filtered = keyword
    ? exercises.filter(e => e.name.includes(keyword))
    : exercises;

  const typeOrder = ['aerobic', 'strength', 'ball', 'other'];
  const typeMap = {};
  filtered.forEach(e => {
    if (!typeMap[e.type]) {
      typeMap[e.type] = { type: e.type, type_name: e.type_name, exercises: [] };
    }
    typeMap[e.type].exercises.push({
      ...e,
      previewCal: calcCal(e.met, weight, 30)
    });
  });

  const knownGroups = typeOrder.filter(t => typeMap[t]).map(t => typeMap[t]);
  const unknownGroups = Object.keys(typeMap)
    .filter(t => !typeOrder.includes(t))
    .map(t => typeMap[t]);
  return [...knownGroups, ...unknownGroups];
}

Page({
  data: {
    keyword: '',
    groups: [],
    showSheet: false,
    selectedExercise: null,
    duration: 30,
    useCustom: false,
    customDuration: '',
    previewCal: 0,
    durationPresets: DURATION_PRESETS
  },

  onLoad() {
    const app = getApp();
    const weight = (app.globalData.userInfo && app.globalData.userInfo.weight) || 60;
    this._weight = weight;
    this._db = wx.cloud.database();
    this.setData({ groups: buildGroups(EXERCISES, '', weight) });
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      keyword,
      groups: buildGroups(EXERCISES, keyword, this._weight)
    });
  },

  onAddTap(e) {
    const exercise = e.currentTarget.dataset.exercise;
    const duration = 30;
    const previewCal = calcCal(exercise.met, this._weight, duration);
    this.setData({
      selectedExercise: exercise,
      duration,
      useCustom: false,
      customDuration: '',
      previewCal,
      showSheet: true
    });
  },

  onSheetClose() {
    this.setData({ showSheet: false });
  },

  onDurationTap(e) {
    if (!this.data.selectedExercise) return;
    const duration = e.currentTarget.dataset.val;
    const previewCal = calcCal(
      this.data.selectedExercise.met,
      this._weight,
      duration
    );
    this.setData({ duration, useCustom: false, customDuration: '', previewCal });
  },

  onCustomToggle() {
    this.setData({ useCustom: true });
  },

  onCustomInput(e) {
    if (!this.data.selectedExercise) return;
    const val = e.detail.value;
    const min = parseFloat(val) || 0;
    const previewCal = min > 0
      ? calcCal(this.data.selectedExercise.met, this._weight, min)
      : 0;
    this.setData({ customDuration: val, previewCal });
  },

  noop() {},

  onConfirm() {
    const { selectedExercise, useCustom, duration, customDuration } = this.data;
    if (!selectedExercise) return;
    const finalMin = useCustom ? parseFloat(customDuration) : duration;

    if (!finalMin || finalMin < 1 || finalMin > 300) {
      wx.showToast({ title: '时长范围 1 ~ 300 分钟', icon: 'none' });
      return;
    }

    const calories = calcCal(selectedExercise.met, this._weight, finalMin);
    const db = this._db;
    const record = {
      date: getToday(),
      exercise_name: selectedExercise.name,
      exercise_type: selectedExercise.type,
      duration: finalMin,
      met: selectedExercise.met,
      calories,
      weight: this._weight,
      created_at: db.serverDate()
    };

    wx.showLoading({ title: '保存中...' });
    db.collection('exercise_records').add({ data: record }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已记录', icon: 'success' });
      this.setData({ showSheet: false });
      setTimeout(() => {
        if (getCurrentPages().length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }
      }, 1000);
    }).catch((err) => {
      wx.hideLoading();
      console.error('保存运动记录失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});
