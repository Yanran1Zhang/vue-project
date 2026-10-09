<template>
  <div class="diagnosis-report">
    <template v-if="diagnosisSteps.length">
      <div class="report-wrapper">
        <div class="procedure">
          <template
            v-for="(step, index) in diagnosisSteps"
            :key="index"
          >
            <div
              class="step-item"
              @click="selectedStep = index"
            >
              <span
                class="step"
                :class="{active: index === selectedStep}"
              >
                {{ index + 1 }}
              </span>
              <span
                class="label"
                :title="t(step.detail)"
                :class="{active: index === selectedStep}"
              >
                {{ t(step.detail) }}
              </span>
            </div>
            <div
              v-if="index < diagnosisSteps.length - 1"
              class="divider"
            />
          </template>
        </div>
        <div class="separate-line" />
        <div
          v-if="selectedStepData"
          class="content"
        >
          <el-row>
            <el-col :span="24">
              <div class="title">
                {{ t(selectedStepData.detail) }}
              </div>
            </el-col>
          </el-row>
          <template v-if="hasStepData">
            <template
              v-for="(item, idx) in selectedStepData.content"
              :key="idx"
            >
              <el-row
                v-for="(value, it) in item"
                :key="it"
                class="common-row"
              >
                <el-col :span="24">
                  <div class="label" :title="t(it)">
                    {{ t(it) }}
                  </div>
                  <div class="info">
                    {{ value }}
                  </div>
                </el-col>
              </el-row>
            </template>
          </template>
          <NoData
            v-else
            img-height="105px"
          />
        </div>
      </div>
    </template>
    <NoData
      v-if="!diagnosisSteps.length || !selectedStepData"
      img-height="105px"
    />
  </div>
</template>

<script setup>
import * as api from '@/api/api';
import NoData from '@/components/no-data.vue';
import {t} from '@adc/vigour-ui/lib/utils/i18n';
import {ref, computed, onMounted, watch, defineProps} from 'vue';

const props = defineProps({
  alarmSerialNo: {
    type: String,
    required: true,
  },
});

const diagnosisSteps = ref([]);
const selectedStep = ref(0);
const selectedStepData = computed(() => diagnosisSteps.value[selectedStep.value]);

// 当前步骤是否包含可展示内容：步骤缺失或内容为空时视为无数据
const hasStepData = computed(() => {
  const step = selectedStepData.value;
  return Boolean(step) && Array.isArray(step.content) && step.content.length > 0;
});

const getAlarmDiagnosisReport = async() => {
  const params = {
    alarm_serial_no: props.alarmSerialNo,
  };
  const alarmReport = await api.getNetworkAlarmDiagnosisReport(params);

  // analyse_detail可能不存在、为空或非JSON数组字符串，统一降级为空数组避免页面异常
  let steps = [];
  const analyseDetail = alarmReport?.result?.analyse_detail;
  if (analyseDetail) {
    try {
      const parsed = JSON.parse(analyseDetail);
      if (Array.isArray(parsed)) {
        steps = parsed;
      }
    } catch (error) {
      // 先正常解析，如果报错，再替换tab空格键，重新解析
      const replacedDetails = analyseDetail.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
      const replacedDetailsList = JSON.parse(replacedDetails);
      steps = Array.isArray(replacedDetailsList) ? replacedDetailsList : [];
    }
  }

  diagnosisSteps.value = steps;
  selectedStep.value = 0;
};

watch(props.alarmSerialNo, () => {
  getAlarmDiagnosisReport();
});

onMounted(() => {
  getAlarmDiagnosisReport();
});
</script>
<style scoped lang="less">
@import 'alarm-grid.less';
</style>
