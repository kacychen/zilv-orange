/**
 * 日期工具
 */

/**
 * 获取今天日期字符串 YYYY-MM-DD
 */
function getToday() {
  const d = new Date();
  return formatDate(d);
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 获取最近 N 天的日期列表
 */
function getRecentDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }
  return days;
}

/**
 * 获取星期几（中文）
 */
function getWeekDay(dateStr) {
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = new Date(dateStr);
  return weekDays[d.getDay()];
}

/**
 * 获取短日期 MM/DD
 */
function getShortDate(dateStr) {
  const parts = dateStr.split('-');
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

module.exports = {
  getToday,
  formatDate,
  getRecentDays,
  getWeekDay,
  getShortDate
};
