const { getToday, formatDate, getRecentDays } = require('../../utils/date');

// 饮品图标映射
const TYPE_ICON = {
  water:  '💧',
  coffee: '☕',
  tea:    '🍵',
  juice:  '🧃',
  other:  '🥤'
};

// 快捷记录预设
const QUICK_LIST = [
  { type: 'water',  type_name: '白水', icon: '💧', amount: 250 },
  { type: 'water',  type_name: '大杯', icon: '🍶', amount: 350 },
  { type: 'coffee', type_name: '咖啡', icon: '☕', amount: 200 },
  { type: 'tea',    type_name: '茶',   icon: '🍵', amount: 300 }
];

// #6 — 默认饮水目标常量，避免魔法数字
const DEFAULT_WATER_GOAL = 2000;

// #7 — 一天毫秒数常量，避免魔法数字
const ONE_DAY_MS = 86400000;

Page({
  data: {
    totalAmount: 0,
    waterGoal: DEFAULT_WATER_GOAL,
    percent: 0,
    cupCount: 0,
    streakDays: 0,
    yesterdayAmount: 0,
    customAmount: '',
    showGoalModal: false,
    weightInput: '',
    goalInput: '',
    quickList: QUICK_LIST,
    records: [],
    slideIndex: -1
  },

  onLoad() {
    try {
      const { windowWidth } = wx.getSystemInfoSync();
      this._rpxRatio = windowWidth > 0 ? 750 / windowWidth : 1;
    } catch (e) {
      this._rpxRatio = 1; // fallback：滑动功能降级但不崩溃
    }
  },

  onShow() {
    this.loadData();
  },

  // ── 数据加载 ──────────────────────────────────────

  async loadData() {
    const db = wx.cloud.database();
    const today = getToday();

    try {
      // 1. 加载用户配置（获取目标 + 判断是否首次使用）
      // #8 — 与 _saveGoal 统一，不带 orderBy，直接 limit(1)
      const myConfig = await db.collection('user_config').limit(1).get();
      const config = myConfig.data[0];

      if (!config) {
        // 首次使用：显示目标设置弹窗
        this.setData({ showGoalModal: true });
        return;
      }

      // #6 — 使用常量替代魔法数字 2000
      const waterGoal = config.water_goal || DEFAULT_WATER_GOAL;
      this.setData({ waterGoal });

      // 2 & 3. 并行加载今日记录 + 近 30 天数据
      const recentDays = getRecentDays(30);
      const [todayRes, recentRes] = await Promise.all([
        db.collection('water_records')
          .where({ date: today })
          .orderBy('recorded_at', 'desc')
          .get(),
        db.collection('water_records')
          .where({ date: db.command.in(recentDays) })
          .get()
      ]);

      const records = todayRes.data.map(r => this._formatRecord(r));
      const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
      const percent = Math.min(Math.round(totalAmount / waterGoal * 100), 100);
      const cupCount = records.length;

      const dayMap = {};
      recentRes.data.forEach(r => {
        if (!dayMap[r.date]) dayMap[r.date] = 0;
        dayMap[r.date] += r.amount;
      });

      // #7 — 缓存 Date.now()，避免循环中重复调用
      const now = Date.now();
      const yesterday = formatDate(new Date(now - ONE_DAY_MS));
      const yesterdayAmount = dayMap[yesterday] || 0;

      // 连续达标天（从今天往前数）
      let streakDays = 0;
      for (let i = 0; i < 30; i++) {
        const d = formatDate(new Date(now - i * ONE_DAY_MS));
        if ((dayMap[d] || 0) >= waterGoal) {
          streakDays++;
        } else {
          break;
        }
      }

      this.setData({ records, totalAmount, percent, cupCount, yesterdayAmount, streakDays });

    } catch (err) {
      console.error('loadData error', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'error' });
    }
  },

  // 格式化数据库记录：补充 icon、timeStr、_slideX
  _formatRecord(r) {
    const d = r.recorded_at ? new Date(r.recorded_at) : new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return {
      ...r,
      icon: TYPE_ICON[r.type] || '🥤',
      timeStr: `${h}:${m}`,
      _slideX: 0
    };
  },

  // ── 输入处理 ──────────────────────────────────────

  onCustomInput(e) {
    this.setData({ customAmount: e.detail.value });
  },

  onWeightInput(e) {
    const weight = parseFloat(e.detail.value);
    const goalInput = weight > 0 ? String(Math.round(weight * 35)) : '';
    this.setData({ weightInput: e.detail.value, goalInput });
  },

  onGoalInput(e) {
    this.setData({ goalInput: e.detail.value });
  },

  onMaskTap() {
    // 弹窗背景点击不关闭（强制设置目标）
  },

  // ── 记录饮水 ──────────────────────────────────────

  async onQuickAdd(e) {
    const item = e.currentTarget.dataset.item;
    await this._addRecord(item.amount, item.type, item.type_name);
  },

  async onCustomAdd() {
    const amount = parseInt(this.data.customAmount);
    if (!amount || amount <= 0 || amount > 5000) {
      wx.showToast({ title: '请输入有效水量（1-5000ml）', icon: 'none' });
      return;
    }
    await this._addRecord(amount, 'water', '白水');
    this.setData({ customAmount: '' });
  },

  // #3 — 添加 _adding 重入保护，防止双击重复记录
  async _addRecord(amount, type, type_name) {
    if (this._adding) return;
    this._adding = true;

    const db = wx.cloud.database();
    const today = getToday();
    const now = new Date();

    wx.showLoading({ title: '记录中...' });
    try {
      const res = await db.collection('water_records').add({
        data: {
          date: today,
          amount,
          type,
          type_name,
          recorded_at: now
        }
      });

      wx.hideLoading();
      wx.showToast({ title: `+${amount}ml 💧`, icon: 'none' });

      // 本地即时追加到头部
      const newRecord = this._formatRecord({
        _id: res._id,
        date: today,
        amount,
        type,
        type_name,
        recorded_at: now
      });

      const records = [newRecord, ...this.data.records];
      const totalAmount = this.data.totalAmount + amount;
      const percent = Math.min(Math.round(totalAmount / this.data.waterGoal * 100), 100);
      const cupCount = this.data.cupCount + 1;

      this.setData({ records, totalAmount, percent, cupCount });
    } catch (err) {
      wx.hideLoading();
      console.error('_addRecord error', err);
      wx.showToast({ title: '记录失败，请重试', icon: 'error' });
    } finally {
      // #3 — 无论成功或失败，释放重入锁
      this._adding = false;
    }
  },

  // ── 左滑删除 ──────────────────────────────────────

  onTouchStart(e) {
    this._touchStartX = e.touches[0].clientX;
    this._touchStartY = e.touches[0].clientY;
    // #4 — parseInt 保证 _touchIndex 为数字类型，避免严格比较失败
    this._touchIndex = parseInt(e.currentTarget.dataset.index, 10);
    this._isSwiping = false;
  },

  onTouchMove(e) {
    const dx = e.touches[0].clientX - this._touchStartX;
    const dy = e.touches[0].clientY - this._touchStartY;

    if (!this._isSwiping && Math.abs(dy) > Math.abs(dx)) return;
    this._isSwiping = true;

    // #4 — _touchIndex 已在 onTouchStart 中 parseInt，此处直接使用
    const index = this._touchIndex;
    const currentX = this.data.records[index]._slideX || 0;
    let newX = currentX + dx * (this._rpxRatio || 1);
    newX = Math.max(-160, Math.min(0, newX));

    // #2 — 使用键路径 setData，避免全量数组更新导致帧率下降
    this.setData({
      [`records[${index}]._slideX`]: newX,
      slideIndex: newX < -10 ? index : -1
    });
    this._touchStartX = e.touches[0].clientX;
  },

  onTouchEnd() {
    if (!this._isSwiping) return;
    // #4 — _touchIndex 已在 onTouchStart 中 parseInt，此处直接使用
    const index = this._touchIndex;
    const currentX = this.data.records[index]._slideX || 0;
    const snapX = currentX < -80 ? -160 : 0;
    const records = this.data.records.map((r, i) => ({
      ...r,
      _slideX: i === index ? snapX : (r._slideX || 0)
    }));
    this.setData({ records, slideIndex: snapX < 0 ? index : -1 });
  },

  _resetSlide() {
    const records = this.data.records.map(r => ({ ...r, _slideX: 0 }));
    this.setData({ records, slideIndex: -1 });
  },

  // #1 — 将 wx.showModal 包装为 Promise，避免 async 回调反模式
  async onDeleteRecord(e) {
    // #4 — parseInt 保证 index 为数字类型
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const record = this.data.records[index];
    if (!record || !record._id) return;

    const modalRes = await new Promise(resolve =>
      wx.showModal({
        title: '确认删除',
        content: `删除「${record.type_name} ${record.amount}ml」？`,
        confirmColor: '#FF4444',
        success: resolve
      })
    );

    if (!modalRes.confirm) {
      this._resetSlide();
      return;
    }

    wx.showLoading({ title: '删除中...' });
    try {
      const db = wx.cloud.database();
      await db.collection('water_records').doc(record._id).remove();
      wx.hideLoading();

      const records = this.data.records
        .filter((_, i) => i !== index)
        .map(r => ({ ...r, _slideX: 0 }));
      const totalAmount = Math.max(this.data.totalAmount - record.amount, 0);
      const percent = Math.min(Math.round(totalAmount / this.data.waterGoal * 100), 100);
      const cupCount = Math.max(this.data.cupCount - 1, 0);
      this.setData({ records, totalAmount, percent, cupCount, slideIndex: -1 });
    } catch (err) {
      wx.hideLoading();
      this._resetSlide();
      wx.showToast({ title: '删除失败，请重试', icon: 'error' });
    }
  },

  // ── 首次使用目标设置 ──────────────────────────────

  async onGoalConfirm() {
    // #6 — 使用常量替代魔法数字 2000
    const goal = parseInt(this.data.goalInput) || DEFAULT_WATER_GOAL;
    if (goal < 500 || goal > 8000) {
      wx.showToast({ title: '目标应在 500-8000ml 之间', icon: 'none' });
      return;
    }
    await this._saveGoal(goal);
  },

  async onGoalCancel() {
    // #6 — 使用常量替代魔法数字 2000
    await this._saveGoal(DEFAULT_WATER_GOAL);
  },

  async _saveGoal(goal) {
    const db = wx.cloud.database();
    wx.showLoading({ title: '保存中...' });
    try {
      // 查询是否已存在配置（upsert 逻辑）
      // #8 — 与 loadData 统一，都使用 .limit(1) 不带 orderBy
      const existing = await db.collection('user_config').limit(1).get();
      if (existing.data.length > 0) {
        await db.collection('user_config').doc(existing.data[0]._id).update({
          data: { water_goal: goal }
        });
      } else {
        await db.collection('user_config').add({
          data: { water_goal: goal, weight: parseFloat(this.data.weightInput) || 0 }
        });
      }
      wx.hideLoading();
      this.setData({ showGoalModal: false, waterGoal: goal });
      this.loadData();
    } catch (err) {
      wx.hideLoading();
      console.error('_saveGoal error', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    }
  }
});
