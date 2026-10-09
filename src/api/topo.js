import HttpRequest from '@adc/vigour-ui/lib/utils/http';

/**
 * 查询网元告警列表
 * @param {Object} params - 查询参数
 * @param {string} params.ne_name - 网元名称
 * @param {boolean} params.is_active_alarm - 是否查询活跃告警
 * @param {string} [params.alarm_query] - 告警搜索关键词
 * @param {number} params.start - 分页起始偏移
 * @param {number} params.limit - 每页条数
 * @returns {Promise<{results: Array<Object>, total: number}>} 告警列表及总数
 */
function getNeAlarmList(params) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_ne_alarm_get_list',
    method: 'post',
    data: params,
  });
}

/**
 * 查询网元操作日志列表
 * @param {Object} params - 查询参数
 * @param {string} params.ne_name - 网元名称
 * @param {string} [params.operate_level] - 操作级别（字典值）
 * @param {string} [params.operate_query] - 操作搜索关键词
 * @param {number} params.start - 分页起始偏移
 * @param {number} params.limit - 每页条数
 * @returns {Promise<{results: Array<Object>, total: number}>} 操作日志列表及总数
 */
function getNeLogList(params) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_ne_log_get_list',
    method: 'post',
    data: params,
  });
}

/**
 * 查询字典表，将代码值翻译为可读文字
 * @param {string} dictTypeName - 字典类型名称，多个用逗号分隔，如 'alarm_level,cleared_type,network_operation_level'
 * @returns {Promise<{results: Array<{dict_type_name: string, dict_value: string, dict_label: string}>}>} 字典条目列表
 */
function getDictList(dictTypeName) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeResourceService/topology/topology_sub_network_dict_get_list',
    method: 'post',
    data: {
      dict_type_name: dictTypeName,
    },
  });
}

/**
 * 查询 KPI 选项列表
 * @param {string} neName - 网元名称
 * @returns {Object} KPI 选项
 */
function getKpiOptionList(neName) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_kpi_option_get_list_by_ne',
    method: 'post',
    data: {
      ne_name: neName,
    },
  });
}

/**
 * 查询 KPI 曲线数据
 * @param {string} neName - 网元名称
 * @param {string} kpiName - KPI 指标名（对应 kpi_option 的 kpi_name 或 tree_node_id）
 * @param {string} [cid] - 自定义 KPI 的 ID
 * @returns {Promise<{kpi: Array<{name: string, label: string, datas: Array<{xAxis: string, value: number|string}>}>}>} KPI 时序数据
 */
function getKpiLineData(neName, kpiName, cid) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetMaintenanceService/dashboard/dashboard_kpi_detail_line_get',
    method: 'post',
    data: {
      ne_name: neName,
      kpi_name: kpiName,
      cid,
    },
  });
}

export {
  getNeAlarmList,
  getNeLogList,
  getDictList,
  getKpiOptionList,
  getKpiLineData,
};
