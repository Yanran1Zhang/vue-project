/**
 * KPI折线图数据处理工具
 * 从后端脚本拆分到前端，减少后端JS指令数
 */

// UTC转UTC+8偏移量（毫秒）
const UTC8_OFFSET = 8 * 60 * 60 * 1000;

/**
 * 生成时间轴列表
 * @param {String} startTime 开始时间 (UTC+0时间日期字符串)
 * @param {String} endTime 结束时间
 * @param {Number} intervalMinutes 间隔分钟数
 * @returns {String[]} 时间轴列表（UTC+8）
 */
export function generateTimeList(startTime, endTime, intervalMinutes) {
  if (!intervalMinutes || intervalMinutes <= 0) {
    return [];
  }
  const timeList = [];
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const step = intervalMinutes * 60 * 1000;
  let current = start;
  while (current <= end) {
    timeList.push(formatDateTime(new Date(current + UTC8_OFFSET)));
    current += step;
  }
  return timeList;
}

/**
 * 格式化日期为 yyyy-MM-dd HH:mm:ss
 * @param {Date} date
 * @returns {String}
 */
function formatDateTime(date) {
  const y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${M}-${d} ${h}:${m}:${s}`;
}

/**
 * 将查询结果转换为折线图数据
 * 返回格式：共享xAxis + 纯数值数组，前端可直接用于ECharts
 * @param {Array} pointList 后端返回的原始数据 [{object_type, measure_time, kpi_value}]
 * @param {String[]} timeList 时间轴列表
 * @returns {Object} {xAxis: String[], results: [{label, name, values: Number/null[]}]}
 */
export function generateLine(pointList, timeList) {
  if (!pointList || pointList.length === 0) {
    return {xAxis: timeList, results: []};
  }

  // 按object_type或ne_name分组，保持插入顺序
  const groupMap = {};
  const keyOrder = [];
  // 按网元分组
  let key = 'currently';
  pointList.forEach((point) => {
    key = point.ne_name;
    if (!groupMap[key]) {
      groupMap[key] = [];
      keyOrder.push(key);
    }
    groupMap[key].push(point);
  });

  // 有具体分组键时去掉currently
  if (keyOrder.length > 2) {
    const idx = keyOrder.indexOf('currently');
    if (idx >= 0) {
      keyOrder.splice(idx, 1);
    }
  }

  const results = [];
  keyOrder.forEach((groupKey) => {
    const points = groupMap[groupKey];
    // 按measure_time排序
    points.sort((a, b) => (a.measure_time || '').localeCompare(b.measure_time || ''));

    // 建立measure_time到kpi_value的映射（measure_time转UTC+8后匹配timeList）
    const valueMap = {};
    points.forEach((point) => {
      if (point.measure_time) {
        const utc8Time = formatDateTime(new Date(new Date(point.measure_time).getTime() + UTC8_OFFSET));
        valueMap[utc8Time] = point.kpi_value;
      }
    });

    // 沿timeList对齐，无数据的周期置null，不进行保护周期填充，避免伪造时间点数据
    const values = new Array(timeList.length);
    timeList.forEach((time, t) => {
      values[t] = (time in valueMap) ? valueMap[time] : null;
    });

    results.push({label: groupKey, name: groupKey, values});
  });

  return {xAxis: timeList, results};
}

/**
 * 将后端返回的原始数据转换为前端折线图格式
 * 后端返回: {lineData, startTime, endTime, kpiPeriod, displayMutation}
 * 前端需要: {xAxis, results, end_time, kpi_period, displayMutation}
 * @param {Object} rawData 后端返回的原始数据
 * @returns {Object} 前端折线图数据
 */
export function transformKpiLineData(rawData) {
  const {lineData, startTime, endTime, kpiPeriod, displayMutation, neNameList} = rawData;
  const timeList = generateTimeList(startTime, endTime, kpiPeriod);
  const lineResult = generateLine(lineData, timeList);
  // 后端可能不返回neNameList，此时从lineData中提取不重复的ne_name作为回退
  let resolvedNeNameList = neNameList;
  if (!resolvedNeNameList || resolvedNeNameList.length === 0) {
    const neSet = new Set();
    if (Array.isArray(lineData)) {
      for (let i = 0; i < lineData.length; i++) {
        if (lineData[i].ne_name) {
          neSet.add(lineData[i].ne_name);
        }
      }
    }
    resolvedNeNameList = Array.from(neSet);
  }
  return {
    xAxis: lineResult.xAxis,
    results: lineResult.results,
    neNameList: resolvedNeNameList,
    end_time: endTime,
    kpi_period: kpiPeriod,
    displayMutation,
  };
}
