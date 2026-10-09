import HttpRequest from '@adc/vigour-ui/lib/utils/http';

/**
 * 获取单个阈值数据
 * @param {String} name 阈值名称
 * @returns {Promise}
 */
function getThreshold(name) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_mgr/cne_mgr_threshold_get',
    method: 'post',
    data: {
      name,
    },
  });
}

/**
 * 根据分类获取阈值Map
 * @param {String} category 分类（如 '5G'、'4G'）
 * @returns {Promise}
 */
function getThresholdMap(category) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_mgr/cne_mgr_threshold_get_map',
    method: 'post',
    data: {
      category,
    },
  });
}

/**
 * 批量创建阈值
 * @param {Array} dataList 阈值数据列表
 * @returns {Promise}
 */
function batchCreateThreshold(dataList) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_mgr/cne_mgr_threshold_batch_create',
    method: 'post',
    data: {
      _values: dataList,
    },
  });
}

/**
 * 删除阈值
 * @param {Object} data 删除参数（含 name、category）
 * @returns {Promise}
 */
function deleteThreshold(data) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_mgr/cne_mgr_threshold_delete',
    method: 'post',
    data,
  });
}

export {getThreshold, getThresholdMap, batchCreateThreshold, deleteThreshold};
