/**
 * 获取单个字符的字节长度（ASCII 字符算 1 字节，其余算 2 字节）
 * @param {string} char - 单个字符
 * @returns {number} 字节长度（1 或 2）
 */
function getCharByteLength(char) {
  const charCode = char.charCodeAt(0);
  return charCode <= 0x7f ? 1 : 2;
}

/**
 * 计算字符串的总字节长度
 * @param {string} str - 目标字符串
 * @returns {number} 总字节长度
 */
function getStrByteLength(str) {
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    length += getCharByteLength(char);
  }

  return length;
}

/**
 * 根据指定的字节长度截断字符串，并附加尾部文本。
 * @param {string} str 要截断的字符串。
 * @param {number} length 指定的字节长度。
 * @param {number} line 指定行数
 * @param {string} tail 被截断时附加的尾部文本，默认为 '...'。
 * @returns {string} 截断后的字符串。
 */
function truncateStrByByteLength(str, length, line = 1, tail = '...') {
  let currentLength = 0;
  let result = '';

  let isOverSize = false;
  let warpLine = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const charLength = getCharByteLength(char);

    if (line > 1 && (currentLength + charLength) > (length / line * (warpLine + 1))) {
      result += '\n';
      warpLine++;
    }

    // 如果添加当前字符会超过指定的长度，停止循环
    if (currentLength + charLength > length) {
      isOverSize = true;
      break;
    }

    result += char;
    currentLength += charLength;
  }

  if (isOverSize) {
    const tailLength = getStrByteLength(tail);
    while (currentLength + tailLength > length && result.length > 0) {
      const lastChar = result.slice(-1);
      const lastCharBytes = getCharByteLength(lastChar);
      result = result.slice(0, -1);
      currentLength -= lastCharBytes;
    }

    result += tail;
  }

  return result;
}

export {
  truncateStrByByteLength,
};
