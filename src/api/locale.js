import HttpRequest from '@adc/vigour-ui/lib/utils/http';

/**
 * 获取中台国际化
 * @param {String} project 工程名
 * @param {String} module 模块名
 * @param {String} property 国际化字段
 * @param {String} language 语言
 * @returns {Object} 响应结果
 */
function getI18nBundle(project, module, property, language) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeSysMgrService/cs_ncd_system_config/sc_i18n_get',
    method: 'post',
    data: {
      project,
      module,
      property,
      language,
      contains_bundle: module !== 'cne_alarm',
    },
  });
}

export {getI18nBundle};
