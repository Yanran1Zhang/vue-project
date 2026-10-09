import HttpRequest from '@adc/vigour-ui/lib/utils/http';

function getWorkorderOverview() {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_workorder_overview',
    method: 'post',
    data: {
      start: 0,
      limit: 9999,
    },
  });
}

function getWorkorderDetails(start, limit, workorder_status, risk_type_code, ne_type_code, risk_level_code, ne_id, risk_name, ne_name, solution) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_workorder_details',
    method: 'post',
    data: {
      start,
      limit,
      workorder_status,
      risk_type_code,
      ne_type_code,
      risk_level_code,
      ne_id,
      risk_name,
      ne_name,
      solution,
    },
  });
}

export {getWorkorderOverview, getWorkorderDetails};
