/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2025-2026. All rights reserved.
 */
import HttpRequest from '@adc/vigour-ui/lib/utils/http';

/**
 * KPI折线图数据查询
 * @param {Object} params - { pool, kpi_name, domain, duration, kpi_period, protect_times, end_time, cid, ne } (系统KPI走ne, 自定义KPI走cid)
 * @returns {Promise<Object>} - { lineData, startTime, endTime, kpiPeriod, displayMutation }
 */
function kpiLineGet(params) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_kpi_line_get',
    method: 'post',
    data: params,
  });
}

/**
 * KPI指标名称查询
 * @param {Boolean} isPreset 是否为预置指标
 * @returns {Promise<Object>} 返回结果
 */
function kpiIndicatorGet(isPreset) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_kpi_indicator_get',
    method: 'post',
    data: {is_preset: isPreset},
  });
}

/**
 * 大屏编辑配置查询
 * @param {Object} params - { uid }
 * @returns {Promise<Object>} - { result: {uid, edit_name, config} }
 */
function screenEditConfigGet(params) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_screen_edit_config_get',
    method: 'post',
    data: params,
  });
}

/**
 * 大屏编辑配置更新
 * @param {Object} params - { uid, config }
 * @returns {Promise<Object>}
 */
function screenEditConfigUpdate(params) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_screen_edit_config_update',
    method: 'post',
    data: params,
  });
}

/**
 * KPI网元类型及异常网元查询
 * @param {Object} params - { kpiInfo: [{kpiId, kpiType, kpiName, domainName, cid, thresholdValue, thresholdCompare}] }
 * @returns {Promise<Object>} - { results: [{ne_type, ne_count, abnormal_ne_count}], ab_ne_list: [{ne_name, kpi_name, ...}] }
 */
function kpiNeTypeGet(params) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_kpi_ne_type_get',
    method: 'post',
    data: params,
  });
}

/**
 * KPI卡片数值查询
 * @param {Object} params - { cards: [{key, kpiName, kpiType, domain, pool, cid, objectType}] }
 * @returns {Promise<Object>} - { cards: [{key, value, trend}] }
 */
function kpiCardValueGet(params) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_kpi_card_get',
    method: 'post',
    data: params,
  });
}

/**
 * 风险检查项目是否存在的检查
 * @returns {Promise<Object>} - { result: Boolean } result 为 true 表示模块存在
 */
function riskProjectExistCheck() {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_risk_project_exist_check',
    method: 'post',
    data: {},
  });
}

export {
  kpiLineGet,
  kpiNeTypeGet,
  kpiIndicatorGet,
  kpiCardValueGet,
  screenEditConfigGet,
  screenEditConfigUpdate,
  riskProjectExistCheck,
};
