/**
 * 营养数据计算工具
 */

/**
 * 根据份量计算实际营养数据
 * @param {Object} food - 食物基础数据（每100g）
 * @param {number} amount - 实际份量(g)
 * @returns {Object} 实际营养数据
 */
function calcNutrition(food, amount) {
  const ratio = amount / 100;
  return {
    calories: Math.round(food.calories * ratio),
    protein: parseFloat((food.protein * ratio).toFixed(1)),
    carbs: parseFloat((food.carbs * ratio).toFixed(1)),
    fat: parseFloat((food.fat * ratio).toFixed(1))
  };
}

/**
 * 汇总一组餐食记录的营养数据
 * @param {Array} records - 餐食记录数组
 * @returns {Object} 汇总数据
 */
function sumNutrition(records) {
  const result = {
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0
  };
  records.forEach(r => {
    result.total_calories += r.calories || 0;
    result.total_protein += r.protein || 0;
    result.total_carbs += r.carbs || 0;
    result.total_fat += r.fat || 0;
  });
  result.total_protein = parseFloat(result.total_protein.toFixed(1));
  result.total_carbs = parseFloat(result.total_carbs.toFixed(1));
  result.total_fat = parseFloat(result.total_fat.toFixed(1));
  return result;
}

/**
 * 根据热量目标计算推荐营养素分配
 * 蛋白质 30%, 碳水 45%, 脂肪 25%
 */
function recommendedNutrients(calorieTarget) {
  return {
    protein: Math.round((calorieTarget * 0.30) / 4),
    carbs: Math.round((calorieTarget * 0.45) / 4),
    fat: Math.round((calorieTarget * 0.25) / 9)
  };
}

module.exports = {
  calcNutrition,
  sumNutrition,
  recommendedNutrients
};
