/**
 * 本地存储模拟数据库
 * 替代微信云开发，使用 wx.storage 在本地存储数据
 * 适合开发调试阶段使用
 */

const DB_KEYS = {
  users: 'db_users',
  meal_records: 'db_meal_records',
  daily_summary: 'db_daily_summary',
  achievements: 'db_achievements'
};

// 生成唯一ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// 读取集合
function readCollection(name) {
  try {
    return wx.getStorageSync(DB_KEYS[name]) || [];
  } catch (e) {
    return [];
  }
}

// 写入集合
function writeCollection(name, data) {
  wx.setStorageSync(DB_KEYS[name], data);
}

/**
 * 模拟数据库操作
 */
const localDB = {
  // 添加记录
  add(collection, data) {
    const records = readCollection(collection);
    const newRecord = { ...data, _id: genId(), _openid: 'local_user' };
    // 处理 serverDate
    Object.keys(newRecord).forEach(k => {
      if (newRecord[k] && typeof newRecord[k] === 'object' && newRecord[k]._type === 'date') {
        newRecord[k] = new Date().toISOString();
      }
    });
    if (typeof newRecord.created_at === 'object') newRecord.created_at = new Date().toISOString();
    if (typeof newRecord.updated_at === 'object') newRecord.updated_at = new Date().toISOString();
    records.push(newRecord);
    writeCollection(collection, records);
    return Promise.resolve({ _id: newRecord._id });
  },

  // 查询（支持简单 where 条件）
  query(collection, where) {
    let records = readCollection(collection);
    if (where) {
      records = records.filter(r => {
        return Object.keys(where).every(k => {
          const condition = where[k];
          if (condition && typeof condition === 'object' && condition._type === 'in') {
            return condition._values.includes(r[k]);
          }
          return r[k] === condition;
        });
      });
    }
    return Promise.resolve({ data: records });
  },

  // 按ID查询单条
  getById(collection, id) {
    const records = readCollection(collection);
    const found = records.find(r => r._id === id);
    return Promise.resolve({ data: found ? [found] : [] });
  },

  // 更新
  update(collection, id, data) {
    const records = readCollection(collection);
    const idx = records.findIndex(r => r._id === id);
    if (idx >= 0) {
      records[idx] = { ...records[idx], ...data };
      if (typeof records[idx].updated_at === 'object') {
        records[idx].updated_at = new Date().toISOString();
      }
      writeCollection(collection, records);
    }
    return Promise.resolve({ updated: idx >= 0 ? 1 : 0 });
  },

  // 按条件更新
  updateWhere(collection, where, data) {
    const records = readCollection(collection);
    let updated = 0;
    records.forEach((r, idx) => {
      const match = Object.keys(where).every(k => r[k] === where[k]);
      if (match) {
        records[idx] = { ...r, ...data };
        updated++;
      }
    });
    writeCollection(collection, records);
    return Promise.resolve({ updated });
  },

  // 计数
  count(collection, where) {
    let records = readCollection(collection);
    if (where) {
      records = records.filter(r =>
        Object.keys(where).every(k => r[k] === where[k])
      );
    }
    return Promise.resolve({ total: records.length });
  },

  // 清除所有本地数据（调试用）
  clearAll() {
    Object.values(DB_KEYS).forEach(key => wx.removeStorageSync(key));
  }
};

// 模拟 serverDate
function serverDate() {
  return new Date().toISOString();
}

// 模拟 command（查询操作符）
const command = {
  in(values) {
    return { _type: 'in', _values: values };
  }
};

module.exports = {
  localDB,
  serverDate,
  command,
  // 模拟本地 openid
  LOCAL_OPENID: 'local_user_001'
};
