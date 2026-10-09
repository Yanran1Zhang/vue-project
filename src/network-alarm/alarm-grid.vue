<!--
  - Copyright (c) Huawei Technologies Co., Ltd. 2026-2026. All rights reserved.
  -->

<template>
  <el-container class="alarm-container">
    <div
      ref="containerRef"
      class="alarm-card"
    >
      <div class="header">
        <div class="title">
          <CardTitle :text="t('network_alarm')" />
        </div>
        <div
          v-if="mdafSwitchOn"
          class="statistics"
        >
          <div>
            <span class="legend completed" /><span class="text">{{ t('diagnosis_completed') }}</span>
            <span class="quantity">{{ statistics?.completed }}</span>
          </div>
          <div>
            <span class="legend running" /><span class="text">{{ t('diagnosis_in_progress') }}</span>
            <span class="quantity">{{ statistics?.in_progress }}</span>
          </div>
          <div>
            <span class="legend pending" /><span class="text">{{ t('pending_diagnosis') }}</span>
            <span class="quantity">{{ statistics?.pending }}</span>
          </div>
          <div>
            <span class="legend manual" /><span class="text">{{ t('manual_takeover') }}</span>
            <span class="quantity">{{ statistics?.manual_takeover }}</span>
          </div>
        </div>
      </div>
      <div class="card-main">
        <filter-table
          ref="tableRef"
          :data="tableData"
          :column-list="columnList"
          :load-data-method="loadDataMethod"
          :view-alarm-details="viewAlarmDetails"
          :view-diagnosis-report="viewAlarmDiagnosisReport"
          :handle-trigger-diagnosis="handleTriggerDiagnosis"
          :max-table-height="maxTableHeight"
          :mdaf-switch-on="mdafSwitchOn"
        />
      </div>
    </div>
    <el-dialog
      v-model="detailsDialogVisible"
      :title="t('network_alarm_details')"
      width="900"
      :before-close="handleClose"
      destroy-on-close
    >
      <AlarmDetails
        ref="alarmsDetails"
        :alarm-serial-no="alarmSerialNo"
        @open-report="handleOpenReport"
      />
    </el-dialog>
    <el-dialog
      v-model="reportDialogVisible"
      width="1000"
      :before-close="handleClose"
      destroy-on-close
    >
      <template #title>
        <span class="report-subtitle">
          <span class="report-title">{{ t('diagnostic_report') }}</span>
          ({{ t('alarm_name') }}: {{ alarmName }})
        </span>
      </template>
      <AlarmDiagnosisReport
        ref="alarmDiagnosisReport"
        :alarm-serial-no="alarmSerialNo"
      />
    </el-dialog>
  </el-container>
</template>
<script setup>
import AlarmDetails from 'components/network-alarm/alarm-details.vue';
import AlarmDiagnosisReport from 'components/network-alarm/alarm-diagnosis-report.vue';
import FilterTable from 'components/filter-table/filter-table.vue';
import {onMounted, onUnmounted, ref, watch} from 'vue';
import CONSTANTS from '@/constants/alarm-constants';
import {useDataSource} from '@hw-csnetcareedge/dashboard';
import {t} from '@adc/vigour-ui/lib/utils/i18n';
import CardTitle from '../card-title';
import {getDiagnosisConfigureMap, manualTriggerDiagnosis} from '@/api/api';
import {useEventStore} from '@/store/event-store';
import {Nf} from '@adc/vigour-ui/lib/utils/adapter';

const eventStore = useEventStore();
const props = defineProps({
  data: {
    type: Object,
    default: () => {
    },
  },
});
const store = useDataSource();
const detailsDialogVisible = ref(false);
const reportDialogVisible = ref(false);
const alarmName = ref('');
const alarmSerialNo = ref('');
const containerRef = ref();
const maxTableHeight = ref(242);

// 更新表格高度
function updateTableHeight() {
  if (containerRef.value) {
    // 130代表其余元素的高度
    maxTableHeight.value = containerRef.value.clientHeight - 130;
  }
}

const tableRef = ref();
const tableData = ref([]);
const filterParams = ref({start: 0, limit: 5});
const statistics = ref({});
const columnList = ref(CONSTANTS.COLUMNS);
const mdafSwitchOn = ref(false);

// 查询自动诊断的配置信息
const getConfigureMap = async() => {
  const result = await getDiagnosisConfigureMap('common');
  mdafSwitchOn.value = result.mdaf_switch.threshold_value === 'true';
};

// 查看数据变化
const watchData = () =>
  watch(
    () => props.data,
    (newValue) => {
      if (!newValue) {
        return;
      }

      getConfigureMap();
      statistics.value = newValue.statistics;
      tableData.value = newValue.results;
      tableRef.value.loadFinished(newValue);
    },
    {deep: true, immediate: true}
  );

let resizeObserver = null;

// onMounted
onMounted(() => {
  watchData();
  updateTableHeight();
  resizeObserver = new ResizeObserver(updateTableHeight);
  resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

// 查询网络告警列表数据
async function loadDataMethod(requestParams) {
  Object.assign(filterParams.value, requestParams);
  store.setParams('alarmGridGetData', null, filterParams.value);
  store.dataSources['alarmGridGetData'].load();
  tableRef.value.setLoading(false);
}

// 查看网络告警详情
function viewAlarmDetails(row) {
  detailsDialogVisible.value = true;
  alarmSerialNo.value = row.alarm_serial_no;
}

// 查看诊断报告
function viewAlarmDiagnosisReport(row) {
  reportDialogVisible.value = true;
  alarmName.value = row.alarm_name;
  alarmSerialNo.value = row.alarm_serial_no;
}

// 打开诊断报告弹窗，关闭告警详情弹窗
function handleOpenReport(alarmIdFromDetails) {
  detailsDialogVisible.value = false;
  alarmName.value = alarmIdFromDetails || alarmName.value;
  setTimeout(() => {
    reportDialogVisible.value = true;
  }, 100);
}

// 手动触发诊断
async function handleTriggerDiagnosis(row) {
  tableRef.value.setLoading(true);
  await manualTriggerDiagnosis({alarm_serial_no: row.alarm_serial_no});
  Nf.notification({
    type: 'success',
    message: t('trigger_diagnosis_success'),
    duration: 5000,
    customClass: 'nf-notification',
  });
  await loadDataMethod({});
}

// 监听事件的点击，筛选告警列表
watch(
  () => eventStore.eventId,
  (newValue) => {
    loadDataMethod({event_id: newValue});
  },
  {deep: true}
);
</script>
<style scoped lang="less">
:global(:root.dark body) {
  --alarm-table-background-color: rgba(243, 243, 243, 0.1);
  --alarm-diagnosis-status-completed-color: rgba(0, 196, 93, 1);
  --alarm-diagnosis-status-running-color: rgba(231, 195, 37, 1);
  --alarm-diagnosis-status-pending-color: rgba(116, 184, 255, 1);
  --alarm-diagnosis-status-manual-color: rgba(98, 98, 98, 1);
  --alarm-statistics-text-color: rgba(201, 201, 201, 1);
  --alarm-statistics-total-text-color: rgba(255, 255, 255, 1);
  --alarm-text-color: rgba(245, 245, 245, 1);
  --alarm-diagnosis-report-text-color: rgba(245, 245, 245, 1);
  --alarm-diagnosis-report-step-active-color: rgba(92, 162, 233, 1);
  --alarm-level-critical-color: rgba(221, 51, 54, 1);
}

:global(:root.light body) {
  --alarm-table-background-color: rgba(255, 255, 255, 1);
  --alarm-diagnosis-status-completed-color: rgba(0, 155, 73, 1);
  --alarm-diagnosis-status-running-color: rgba(231, 195, 37, 1);
  --alarm-diagnosis-status-pending-color: rgba(0, 141, 219, 1);
  --alarm-diagnosis-status-manual-color: rgba(166, 166, 166, 1);
  --alarm-statistics-text-color: rgba(98, 98, 98, 1);
  --alarm-statistics-total-text-color: rgba(30, 30, 30, 1);
  --alarm-text-color: rgba(98, 98, 98, 1);
  --alarm-diagnosis-report-text-color: rgba(30, 30, 30, 1);
  --alarm-diagnosis-report-step-active-color: rgba(0, 103, 209, 1);
  --alarm-level-critical-color: rgba(221, 51, 54, 1);
}

@import 'alarm-grid.less';
</style>
