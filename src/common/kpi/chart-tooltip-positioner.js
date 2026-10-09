// tooltip与鼠标间隔
const GAP = 10;

/**
 * 计算 ECharts tooltip 位置，基于视口空间自动调整上下左右
 * 逻辑与 NFV 项目 chart-tooltip-positioner.js 完全一致
 * ECharts 5/6 tooltip position 回调签名: (point, params, dom, rect, sizes)
 *   point: [x, y] 鼠标位置（图表容器坐标）
 *   dom: tooltip DOM 元素
 * @param {number[]} point - 鼠标位置 [x, y]（图表容器坐标）
 * @param {*} _params - ECharts 内部参数（不使用）
 * @param {HTMLElement} dom - tooltip DOM 元素
 * @returns {number[]} - [x, y] 位置（图表容器坐标）
 */
export const calcTooltipPosition = (point, _params, dom) => {
  const container = dom.parentElement;
  const containerRect = container
    ? container.getBoundingClientRect()
    : {left: 0, top: 0, width: 800, height: 500};

  // 容器自身的缩放比：视觉尺寸 / 布局尺寸
  const scaleX = container && container.offsetWidth > 0 ? containerRect.width / container.offsetWidth : 1;
  const scaleY = container && container.offsetHeight > 0 ? containerRect.height / container.offsetHeight : 1;

  // 将容器坐标的 point 转为视口坐标
  const mouseViewX = point[0] * scaleX + containerRect.left;
  const mouseViewY = point[1] * scaleY + containerRect.top;

  // 实际可视区域（不含滚动条）
  const viewW = document.documentElement.clientWidth;
  const viewH = document.documentElement.clientHeight;

  // tooltip 实际视觉尺寸（视口坐标）
  const tooltipRect = dom.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width ?? 200;
  const tooltipHeight = tooltipRect.height ?? 200;

  // 在视口坐标系中计算 tooltip 位置（默认右上方）
  let x = mouseViewX + GAP;
  let y = mouseViewY - tooltipHeight - GAP;

  // 右侧空间不足，往左偏移
  if (x + tooltipWidth > viewW) {
    x = mouseViewX - tooltipWidth - GAP;
  }
  // 左侧空间不足，贴左边界
  if (x < 0) {
    x = GAP;
  }
  // 上方空间不足，往下显示
  if (y < 0) {
    y = mouseViewY + GAP;
  }
  // 下方空间不足，贴上边界
  if (y + tooltipHeight > viewH) {
    y = viewH - tooltipHeight - GAP;
  }

  // 极端情况：tooltip超过视口尺寸，确保不超出
  x = Math.max(0, Math.min(x, viewW - tooltipWidth));
  y = Math.max(0, Math.min(y, viewH - tooltipHeight));

  // 视口坐标转回容器坐标
  return [(x - containerRect.left) / scaleX, (y - containerRect.top) / scaleY];
};
