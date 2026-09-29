<template>
  <div class="chart-card-container">
    <edge-chart-card
      ref="edgeChartCardRef"
      :title="props.title"
      :enlarge-card-option="props.enlargeCardOption"
      :is-show-legend="props.isShowLegend"
      :formatter-tooltip-key="props.formatterTooltipKey"
      :formatter-tooltip-option="formatterTooltipOption"
      :download="props.download"
      :auto-series-config="autoSeriesConfig"
      :ext-info="props.extInfo"
      :click-event="props.clickEvent"
      :series-data="seriesData"
      :max-series-end-label="12"
      :chart-option="chartOption"
      :legend-listener-config-v2="legendListenerConfigV2"
    >
      <template #enlarge-top>
        <custom-object
          ref="customObjectRef"
          v-if="isObjectMode"
          :legend-data="customLegendData"
          :cid="cid"
          :kpi-period="kpiPeriod"
          @select-object="handleLegendAction"
          @click-event="handleClickEvent"
          @object-mode-change="handleObjetModeChange"
        />
      </template>
    </edge-chart-card>
  </div>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import kpiApi from '@/api/kpi';
import {defaultHandlerMap} from '@/utils/handler-map';
import {cloneDeep, isEmpty} from 'lodash';
import CustomObject from './custom-object.vue';
import {getKpiLineMutionGet} from '@/api';

const {t} = useI18n();

const props = defineProps({
  // 标题
  title: {type: String || Array, default: '--'},
  // 图表配置项参数
  chartOptionParams: {type: Object, default: () => ({})},
  // 放大卡片配置项
  enlargeCardOption: {type: Object, default: () => ({})},
  // 是否展示图例
  isShowLegend: {type: Boolean, default: true},
  // tooltip 格式化配置项
  formatterTooltipKey: {type: String, default: ''},
  // 下载配置项
  download: {type: Object, default: () => ({})},
  /**
   * 动态处理series
   * @type {{pointNum: number, durationTime:number}} 动态处理配置对象
   * @example {pointNum: 10} 线段中有200个点,只取最新的10个点
   * @example {durationTime: 6*60*60*1000} 线段中有200个点,只取持续时间为6小时内的点
   * @example {pointNum: 10, durationTime: 6*60*60*1000} 线段中有200个点,只取最新的10个点,且持续时间为6小时内的点
   */
  autoSeriesConfig: {type: Object, default: () => ({})},
  // 组件额外信息
  extInfo: {type: Object, default: () => ({})},
  /**
   * @typedef {Object} eventValue 事件值
   * @property {string || 'props'} type 事件值类型
   * @property {string || Object} value 事件值，当type为props时，value为props的key
   */
  /**
   * 点击事件
   * @type {{name: string, value: eventValue || String }} 点击事件对象内容
   * @example 往名称为clickNetworkType事件中发送一条信息，内容为props中extInfo.networkType的值
   *   {name: 'clickNetworkType', value: {type: 'props', value: 'extInfo.networkType'}} => 'MSCServer'
   * @example 往名称为clickNetworkType事件中发送一条信息，内容为props中extInfo.networkType的值
   *   {name: 'clickNetworkType', value: {networkType:{type: 'props', value: 'extInfo.networkType'}}} => {networkType: 'MSCServer'}}
   * @example 往名称为clickNetworkType事件中发送一条信息，内容为value中的值对象
   *   {name: 'clickNetworkType', value: {value: 'extInfo.networkType'}} => 'extInfo.networkType'
   * @example 往名称为clickNetworkType事件中发送一条信息，内容为value中的值对象
   *   {name: 'clickNetworkType', value: {networkType:{value: 'extInfo.networkType'}}} => {networkType: 'extInfo.networkType'}
   */
  clickEvent: {type: Object || Array, default: () => ({})},
});

const cid = computed(() => props.extInfo.indicatorType === 'customKpi' ? props.extInfo.indicatorName : null);
const kpiPeriod = ref(null);
const autoSeriesConfig = ref({});
const formatterTooltipOption = computed(() => ({
  maxSeriesNameLength: isObjectMode.value ? 100 : null,
}));

const POINT_NUM = 864;
const originSeriesData = ref(null);
const seriesData = computed(() => {
  return defaultHandlerMap.transformKpiLineToChartValues(originSeriesData.value);
});
let seriesDataInterval = null;
let endTime = null;
const chartOption = ref(null);
const legendListenerConfigV2 = ref({});
const isObjectMode = ref(false);
const edgeChartCardRef = ref(null);
const customObjectRef = ref(null);

const customLegendData = computed(() => {
  if (!originSeriesData.value) {
    return {};
  }

  const neMap = {};
  const objectMap = {};
  const neSet = new Set();
  const objectSet = new Set();
  const historySeries = [];

  originSeriesData.value.forEach((item) => {
    const {name} = item;
    const {ne} = item;
    const {object} = item;
    const isHistory = name.endsWith('-B4');

    if (isHistory) {
      historySeries.push(name);
    }

    if (ne) {
      neSet.add(ne);

      if (!neMap[ne]) {
        neMap[ne] = [];
      }

      neMap[ne].push(name);
    }

    if (object) {
      objectSet.add(object);

      if (!objectMap[object]) {
        objectMap[object] = [];
      }

      objectMap[object].push(name);
    }
  });

  const neList = Array.from(neSet).map((ne) => ({
    key: ne,
    label: ne,
    checked: true,
  }));

  const objectList = Array.from(objectSet).map((obj) => ({
    key: obj,
    label: obj,
    checked: true,
  }));

  return {
    neList,
    objectList,
    neMap,
    objectMap,
    historySeries,
    historyChecked: true,
  };
});

async function handleLegendAction(action) {
  const echartsInstance = edgeChartCardRef.value.$refs.enlargeRef.getEchartsInstance();
  if (!echartsInstance) {
    return;
  }

  const ret = await getKpiLineMutionGet(action.payload);
  const newSeriesData = defaultHandlerMap.transformKpiLineToChartValues(ret.results);
  edgeChartCardRef.value.$refs.enlargeRef.setSeriesData(newSeriesData);
}

let tempData = null;

async function handleClickEvent({name, value}) {
  // 设置样式
  if (name === 'setStyle') {
    if (value === 'list-style') {
      edgeChartCardRef.value.$refs.enlargeRef.setChartStyle({display: 'none'});
    } else {
      edgeChartCardRef.value.$refs.enlargeRef.setChartStyle({display: ''});
    }

    return;
  }

  // 切换模式
  if (name === 'switchMode') {
    if (value === 'object') {
      // 进入object模式，关闭定时器刷新
      clearInterval(seriesDataInterval);
      edgeChartCardRef.value.$refs.enlargeRef.setChartStyle({
        'width': 'calc(100% - 280px)',
        'height': 'calc(100% - 150px)',
        'margin-top': '64px',
      });
      tempData = edgeChartCardRef.value.$refs.enlargeRef.popData();
      edgeChartCardRef.value.$refs.enlargeRef.setSeriesData([]);
      const smallChart = edgeChartCardRef.value.$refs.timeLineChartRef.getEchartsInstance();
      // 直接获取图表画布最左侧对应的精确时间
      const startTimeStamp = smallChart.convertFromPixel({ xAxisIndex: 0 }, 0);

      // 1. 获取图表容器的总像素宽度
      const width = smallChart.getWidth();
      // 2. 将最右侧像素点（width）反向转换为时间戳
      const endTimeStamp = smallChart.convertFromPixel({ xAxisIndex: 0 }, width);
      customObjectRef.value.setTimeRange(new Date(startTimeStamp), new Date(endTimeStamp));
    } else {
      // 退出object模式，重新打开定时器刷新
      createSeriesDataInterval();
      edgeChartCardRef.value.$refs.enlargeRef.setChartStyle({
        'display': '',
        'width': '',
        'height': '',
        'margin-top': '',
      });
      edgeChartCardRef.value.$refs.enlargeRef.setData(tempData);
      customObjectRef.value.reset();
    }
  }
}

onMounted(async() => {
  await initSeriesData();
  createSeriesDataInterval();
  setChartOption();
});
onUnmounted(() => {
  clearInterval(seriesDataInterval);
});

async function getSeriesData() {
  return await kpiApi.getKpiSeriesData({
    domain: props.extInfo.domain,
    kpi_name: props.extInfo.indicatorName,
    pool: props.extInfo.pool,
    ne: props.extInfo.ne,
    cid: cid.value,
    end_time: endTime,
    kpi_period: kpiPeriod.value,
  });
}

async function initSeriesData() {
  const res = await getSeriesData();
  if (!res) {
    return;
  }

  const pointNumPerSize = (12 * 60) / res.kpi_period; // 每个尺寸展示12小时内容
  autoSeriesConfig.value.pointNum = props.chartOptionParams.col * pointNumPerSize;

  const endNullData = [];
  const normalData = [];
  res.results.forEach((item) => {
    const originValue = item?.datas?.at(-1)?.value;
    const value = typeof originValue === 'number' ? `${originValue}` : originValue;
    if (isEmpty(value)) {
      endNullData.push(item);
    } else {
      normalData.push(item);
    }
  });

  originSeriesData.value = [...normalData, ...endNullData];
  endTime = res.end_time;
  kpiPeriod.value = res.kpi_period;
  isObjectMode.value = res.displayMutation;
}

function createSeriesDataInterval() {
  const getDataMerge = async() => {
    const res = await getSeriesData();
    if (!res) {
      return;
    }

    // 增量数据
    res.results.forEach((data) => {
      const oldData = originSeriesData.value.find((item) => item.name === data.name);
      if (!oldData) {
        return;
      }

      data.datas.forEach((dataItem) => {
        const oldItem = oldData.datas.find((item) => item.xAxis === dataItem.xAxis);
        if (oldItem) {
          Object.assign(oldItem, dataItem);
        } else {
          oldData.datas.push(dataItem);
          if (oldData.datas.length > POINT_NUM) {
            oldData.datas.splice(0, 1);
          }
        }
      });
    });

    endTime = res.end_time;
  };

  // 服务轮询间隔60秒
  seriesDataInterval = setInterval(getDataMerge, 60000);
}

function setChartOption() {
  chartOption.value = defaultHandlerMap.handleLegend(originSeriesData.value, {
    ...props.chartOptionParams,
    sortMap: {[t('dashboard.7days_ago')]: -1},
    kpiType: props.extInfo.indicatorType || 'keyKpi',
    pool: props.extInfo.pool,
    ne: props.extInfo.ne,
  });
  legendListenerConfigV2.value = defaultHandlerMap.handleLegendListenerConfigV2(originSeriesData.value);
  props.enlargeCardOption.chartOption = cloneDeep(chartOption.value);
  if (!props.enlargeCardOption.chartOption.legend.data.includes(t('dashboard.7days_ago'))) {
    props.enlargeCardOption.chartOption.legend.data.push(t('dashboard.7days_ago'));
  }

  props.enlargeCardOption.chartOption.legend.type = 'plain';
}
</script>
<style lang="less" scoped>
.chart-card-container {
  width: 100%;
  height: 100%;
}
</style>
