<template>
  <div class="alarm-details">
    <div class="content">
      <div class="normal-size">
        <div class="mt8">
          {{ t('ne_name') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.ne_name }}
        </div>
      </div>
      <div class="normal-size">
        <div class="mt8">
          {{ t('ne_type') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.ne_type }}
        </div>
      </div>
      <div class="normal-size">
        <div class="mt8">
          {{ t('ne_protocol_type') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.nf_type || '--' }}
        </div>
      </div>
      <div class="normal-size">
        <div class="mt8">
          {{ t('ems_name') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.ems_name || '--' }}
        </div>
      </div>
      <div class="normal-size">
        <div class="mt8">
          {{ t('ems_sn') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.ems_serial_no || '--' }}
        </div>
      </div>
    </div>
    <div class="content content-alarm">
      <div class="normal-size">
        <div class="mt8">
          {{ t('alarm_id') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.alarm_id }}
        </div>
      </div>
      <div class="normal-size">
        <div class="mt8">
          {{ t('alarm_name') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.alarm_name }}
        </div>
      </div>
      <div class="normal-size">
        <div class="mt8">
          {{ t('alarm_raised_time') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.alarm_raised_time }}
        </div>
      </div>
      <div class="normal-size">
        <div class="mt8">
          {{ t('alarm_level') }}
        </div>
        <div class="break-word">
          <span :class="[translateStyle(CONSTANTS.ALARM_LEVEL, alarmDetails.alarm_level), 'alarm-level']">
            {{ translateLabel(CONSTANTS.ALARM_LEVEL, alarmDetails.alarm_level) }}
          </span>
        </div>
      </div>
      <div class="normal-size">
        <div class="mt8">
          {{ t('alarm_type') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.alarm_type_text || '--' }}
        </div>
      </div>
      <div
        v-if="mdafSwitchOn"
        class="normal-size"
      >
        <div class="mt8">
          {{ t('diagnosis_status') }}
        </div>
        <div class="break-word">
          <span
            :class="[translateStyle(CONSTANTS.DIAGNOSIS_STATUS, alarmDetails.diagnosis_status), 'diagnosis-status']"
          />
          <span class="diagnosis-status-text">{{ alarmDetails?.diagnosis_status_display || '--' }}</span>
          <img
            v-if="
              mdafSwitchOn &&
              translateStyle(CONSTANTS.DIAGNOSIS_STATUS, alarmDetails.diagnosis_status) === 'completed' &&
              hasDiagnosisSteps
            "
            :title="$t('diagnostic_report')"
            :src="getImgSrc('diagnostic_report')"
            @click="viewAlarmDiagnosisReport()"
          >
        </div>
      </div>
      <div
        class="normal-size"
        style="width: 100%"
      >
        <div class="mt8">
          {{ t('additional_information') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.additional_info || '--' }}
        </div>
      </div>
      <div
        class="normal-size"
        style="width: 100%"
      >
        <div class="mt8">
          {{ t('location_information') }}
        </div>
        <div class="break-word">
          {{ alarmDetails.location_info || '--' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as api from '@/api/api';
import {t} from '@adc/vigour-ui/lib/utils/i18n';
import {ref, watch, defineProps, defineEmits, computed} from 'vue';
import CONSTANTS from '@/constants/alarm-constants';
import {useThemeStore} from '@/store/theme-store';

const themeStore = useThemeStore();
const currentTheme = computed(() => themeStore.themeData);
const emit = defineEmits(['open-report']);
const props = defineProps({
  alarmSerialNo: {
    type: String,
    required: true,
  },
});

const darkImgSrc = {
  diagnostic_report: require('@/assets/imgs/dark-result.png'),
};
const lightImgSrc = {
  diagnostic_report: require('@/assets/imgs/result.png'),
};
const getImgSrc = (it) => (currentTheme.value === 'dark' ? darkImgSrc : lightImgSrc)[it];

// 转换告警级别、诊断状态的标签
const translateLabel = (dataMap, currentValue) => {
  const list = dataMap.map((it) => it.value);
  return list.includes(Number(currentValue))
    ? t(dataMap.find((item) => item.value === Number(currentValue))?.label)
    : '';
};

// 获取告警级别、诊断状态的样式
const translateStyle = (dataMap, currentValue) => {
  const list = dataMap.map((it) => it.value);
  return list.includes(Number(currentValue)) ? dataMap.find((item) => item.value === Number(currentValue))?.name : '';
};

const alarmDetails = ref({});
const hasDiagnosisSteps = ref(false);

const getNetworkAlarmDetails = async() => {
  const params = {
    alarm_serial_no: props.alarmSerialNo,
  };
  const details = await api.getNetworkAlarmDetails(params);
  alarmDetails.value = details.result;
};

// 查询是否开启MDAF开关
const mdafSwitchOn = ref(false);
const getDiagnosisConfigureInfo = async() => {
  const result = await api.getDiagnosisConfigureMap('common');
  mdafSwitchOn.value = result.mdaf_switch.threshold_value === 'true';
};

// 获取诊断报告数据，判断是否有诊断步骤
const getAlarmDiagnosisReport = async() => {
  const params = {
    alarm_serial_no: props.alarmSerialNo,
  };
  const alarmReport = await api.getNetworkAlarmDiagnosisReport(params);
  const analyseDetail = alarmReport?.result?.analyse_detail;
  hasDiagnosisSteps.value = analyseDetail !== null && analyseDetail !== '' && analyseDetail !== '{}';
};

// 查看诊断报告
function viewAlarmDiagnosisReport() {
  emit('open-report', alarmDetails.value?.alarm_name);
}

watch(
  () => props.alarmSerialNo,
  () => {
    getDiagnosisConfigureInfo();
    getNetworkAlarmDetails();
    getAlarmDiagnosisReport();
  },
  {deep: true, immediate: true}
);
</script>
<style scoped lang="less">
@import 'alarm-grid.less';
</style>
