/**
 * 对字符串参数进行校验, 是字符串并且不是空字符串
 * @param {string} str 字符串参数值
 * @returns {boolean} true:是字符串并且不是空字符串
 */
export function notEmpty(str) {
  return typeof str === 'string' && str.length > 0;
}

/**
 * 对字符串参数进行校验, 不是字符串 或者 是空字符串
 * @param {string} str 字符串参数值
 * @returns {boolean} true:不是字符串 或者 是空字符串
 */
export function empty(str) {
  return typeof str !== 'string' || str.length === 0;
}

/**
 * 对字符串参数进行校验, 是字符串并且不是空字符串并且不全是空白字符
 * @param {string} str 字符串参数值
 * @returns {boolean} true:是字符串并且不是空字符串并且不全是空白字符
 */
export function notBlank(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * 对字符串参数进行校验, 不是字符串或者（是空字符串或全是空白字符）
 * @param {string} str 字符串参数值
 * @returns {boolean} 校验未通过则返回 true, 不是字符串或者（是空字符串或全是空白字符）
 */
export function blank(str) {
  return typeof str !== 'string' || str.trim().length === 0;
}

/**
 * 将字符串转为URL对象, 直接使用URL进行转换
 * @param {string} url 字符串
 * @returns {URL|null} URL对象, 返回null时说明不是 URL
 */
export function toURL(url) {
  if (blank(url)) return null;
  try {
    return new URL(url);
  } catch (e) {
    return null;
  }
}
