import HttpRequest from '@adc/vigour-ui/lib/utils/http';

// 获取大屏配置
function getScreenConfig() {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_screen_config_get',
    method: 'post',
  });
}

export {getScreenConfig};
