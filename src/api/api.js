import HttpRequest from '@adc/vigour-ui/lib/utils/http';

// 查询MDAF开关和自动诊断的告警级别
function getDiagnosisConfigureMap(category) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_mgr/cne_mgr_threshold_get_map',
    method: 'post',
    data: {
      category,
    },
  });
}

// 查询网络告警详情
function getNetworkAlarmDetails(parameters) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_alarm/cne_alarm_get_details',
    method: 'post',
    data: parameters,
  });
}

// 查询网络告警诊断报告
function getNetworkAlarmDiagnosisReport(parameters) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_alarm/cne_alarm_get_diagnosis_report',
    method: 'post',
    data: parameters,
  });
}

// 手动触发诊断
function manualTriggerDiagnosis(parameters) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_alarm/cne_alarm_manual_create_task',
    method: 'post',
    data: parameters,
  });
}

// 查询事件综合分析
function getComprehensiveAnalysis(parameters) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_event/cne_event_comprehensive_analysis',
    method: 'post',
    data: parameters,
  });
}

// 查询事件故障路径分析
function getFaultPathAnalysis(parameters) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_event/cne_event_fault_path_analysis',
    method: 'post',
    data: parameters,
  });
}

// 查询事件恢复脚本参考
function getRecoveryScriptReference(parameters) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_event/cne_event_recovery_script_reference',
    method: 'post',
    data: parameters,
  });
}

// 查询事件弹窗按钮是否展示
function getShowJumpButton(parameters) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_event/cne_event_by_source_show_jump_button',
    method: 'post',
    data: parameters,
  });
}

export {
  getDiagnosisConfigureMap,
  getNetworkAlarmDetails,
  getNetworkAlarmDiagnosisReport,
  manualTriggerDiagnosis,
  getComprehensiveAnalysis,
  getFaultPathAnalysis,
  getRecoveryScriptReference,
  getShowJumpButton,
};
