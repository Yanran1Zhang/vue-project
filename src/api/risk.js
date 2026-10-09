import HttpRequest from '@adc/vigour-ui/lib/utils/http';

/**
 * 查询风险检查网元详情
 * @param {Object} params 请求参数
 * @param {number} params.start 分页起始偏移量
 * @param {number} params.limit 每页条数
 * @param {string} params.risk_status 风险状态：0-未解决，1-已解决
 * @param {string} params.risk_type 风险类型
 * @param {string} params.ne_type 网元类型（模糊匹配，用于输入筛选）
 * @param {string} params.ne_type_exact 网元类型（精确匹配，用于概览点击）
 * @param {string} params.risk_level 风险等级
 * @param {string} params.ne_id 网元ID
 * @param {string} params.risk_name 风险名称
 * @param {string} params.ne_name 网元名称
 * @returns {Promise<Object>} 风险检查网元详情列表
 */
function getRiskCheckNeDetails(params) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_risk_check_ne_details',
    method: 'post',
    data: params,
  });
}

export {getRiskCheckNeDetails};
