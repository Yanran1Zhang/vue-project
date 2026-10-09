/**
 * 对数值进行千分位格式化（仅≥1000的数值生效）
 * 30000 → "30,000"  12345.67 → "12,345.67"  999 → "999"
 * @param {string|number|null|undefined} value - 需要格式化的数值
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return String(value ?? '');
  }
  const str = String(value);
  const num = Number(value);
  if (isNaN(num)) {
    return str;
  }
  if (Math.abs(num) < 1000) {
    return str;
  }
  const parts = str.split('.');
  const intPart = parts[0];
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let result = sign + formatted;
  if (parts.length > 1) {
    result += `.${parts[1]}`;
  }
  return result;
}
