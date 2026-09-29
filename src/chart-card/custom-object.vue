<template>
  <div>
    <section class="toggle-button-container">
      <div
        class="toggle-slider"
        :class="{'slide-right': activeTab === 'object'}"
      />
      <button
        :class="{active: activeTab === 'network'}"
        @click="handleModeChange('network')"
      >
        {{ t('dashboard.ne') }}
      </button>
      <button
        :class="{active: activeTab === 'object'}"
        @click="handleModeChange('object')"
      >
        {{ t('dashboard.object_mutation_analysis') }}
      </button>
    </section>
    <transition
      name="fade"
      mode="out-in"
    >
      <div
        v-if="activeTab === 'object'"
        key="object"
        class="object-chart-container"
        :class="{'list-mode': isListStyle}"
      >
        <div class="object-toolbar">
          <div class="toolbar-item">
            <label class="toolbar-label">{{ t('dashboard.select_ne') }}</label>
            <el-select
              v-model="selectedNe"
              multiple
              collapse-tags
              collapse-tags-tooltip
              :placeholder="t('dashboard.select_ne_placeholder')"
              class="toolbar-select"
              popper-class="object-select-dropdown"
              @change="handleNeChange"
            >
              <el-option
                v-for="ne in neOptions"
                :key="ne.key"
                :label="ne.label"
                :value="ne.key"
              />
            </el-select>
          </div>
          <div class="toolbar-item">
            <label class="toolbar-label">{{ t('dashboard.compare_time_range') }}</label>
            <el-date-picker
              v-model="timeRange"
              type="datetimerange"
              range-separator="~"
              :start-placeholder="t('dashboard.start_time')"
              :end-placeholder="t('dashboard.end_time')"
              :disabled-date="disabledDate"
              :clearable="false"
              class="toolbar-date-picker"
              @calendar-change="handleCalendarChange"
              @change="handleTimeRangeChange"
            />
          </div>
          <div class="toolbar-item">
            <label class="toolbar-label">{{ t('dashboard.mutation_ratio_header') }}</label>
            <div class="toolbar-input-number-wrapper">
              <el-input
                v-model="ratioInput"
                class="toolbar-input-number"
                :class="{'is-error': ratioError}"
                @input="handleRatioInput"
                @blur="handleRatioBlur"
              />
              <transition name="el-zoom-in-top">
                <div
                  v-if="ratioError"
                  class="toolbar-error"
                >
                  {{ ratioErrorMsg }}
                </div>
              </transition>
            </div>
          </div>
          <el-button
            class="toolbar-analyze-btn"
            @click="handleAnalyze"
          >
            {{ t('dashboard.analyze_immediately') }}
          </el-button>
          <div class="toolbar-icon-btns">
            <el-tooltip
              effect="dark"
              placement="bottom"
              :content="!isListStyle ? t('dashboard.view_list') : t('dashboard.view_line_chart')"
            >
              <el-button
                class="toolbar-icon-btn"
                @click="handleListStyle"
              >
                <img
                  v-if="!isListStyle"
                  src="@/assets/imgs/list.svg"
                  alt=""
                  style="width:16px;height:16px;"
                >
                <el-icon v-else>
                  <LineChartL />
                </el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip
              effect="dark"
              placement="bottom"
              :content="t('dashboard.export')"
            >
              <el-button
                class="toolbar-icon-btn"
                @click="handleExport"
              >
                <el-icon><ExportL style="fill:#fff" /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
        <custom-legend
          v-show="!isListStyle"
          ref="legendRef"
          :object-list="objectList"
          :selected-ne="selectedNe"
          @select-object="handleSelectObject"
        />
        <common-table
          v-show="isListStyle"
          ref="tableRef"
          service-id="/adc-service/web/rest/v1/services/EdgeCoreNetMaintenanceService/dashboard/dashboard_kpi_mutation_getList"
          empty-text="--"
          row-key="task_id"
          :default-params="createPayload()"
          :global-props="globalProps"
          :first-column="['none']"
          :row-can-select="(row) => !row.is_share"
          :columns="columns"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import {ref, computed, watch, nextTick} from 'vue';
import {useI18n} from 'vue-i18n';
import {LineChartL, ExportL} from '@hw-csnetcareedge/icons/lib';
import CustomLegend from 'components/chart-card/custom-legend.vue';
import CommonTable from 'components/common-table/common-table.vue';
import {getKpiMutionData} from '@/api';
import {exportFile2} from '@/api/export-file';

const {t} = useI18n();
const props = defineProps({
  legendData: {
    type: Object,
    required: true,
  },
  cid: {
    type: String,
    required: true,
  },
  kpiPeriod: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(['select-object', 'click-event', 'object-mode-change']);
const tableRef = ref(null);
const activeTab = ref('network');
const objectList = ref([]);
const ratioInput = ref('10');
const ratioError = ref(false);
const ratioErrorMsg = ref('');

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const selectedNe = ref([]);
let firstSelectNe = [];
let prevSelectedNe = [];
const timeRange = ref([new Date(Date.now() - THREE_DAYS_MS), new Date()]);
const isListStyle = ref(false);
const legendRef = ref(null);
const pickStart = ref(null);

// 校验突变比例输入
function validateRatio(val) {
  const errorValueTips = t('dashboard.please_enter_number_between');
  if (val === '' || val === null || val === undefined) {
    ratioError.value = true;
    ratioErrorMsg.value = t('dashboard.mutation_ratio_required');
    return false;
  }

  const num = Number(val);
  if (isNaN(num)) {
    ratioError.value = true;
    ratioErrorMsg.value = errorValueTips;
    return false;
  }

  if (num < 0 || num > 1000) {
    ratioError.value = true;
    ratioErrorMsg.value = errorValueTips;
    return false;
  }

  // 检查小数位数
  const decimalPart = String(val).split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    ratioError.value = true;
    ratioErrorMsg.value = errorValueTips;
    return false;
  }

  ratioError.value = false;
  ratioErrorMsg.value = '';
  return true;
}

function handleRatioInput(val) {
  validateRatio(String(val).trim());
}

function handleRatioBlur() {
  const val = ratioInput.value.trim();
  validateRatio(val);
  if (!ratioError.value) {
    // 格式化为最多两位小数
    const num = Number(val);
    ratioInput.value = String(num);
  }
}

const neOptions = computed(() => props.legendData.neList || []);

function disabledDate(date) {
  const time = date.getTime();
  const now = Date.now();
  const minDate = new Date(now - SEVEN_DAYS_MS);
  minDate.setHours(0, 0, 0, 0);
  if (time < minDate.getTime() || time > now) {
    return true;
  }

  if (pickStart.value) {
    const start = pickStart.value.getTime();
    if (time < start - THREE_DAYS_MS || time > start + THREE_DAYS_MS) {
      return true;
    }
  }

  return false;
}

function handleCalendarChange(val) {
  pickStart.value = val[0] || null;
}

function handleTimeRangeChange(val) {
  pickStart.value = null;
  if (!val || !val[0] || !val[1]) {
    return;
  }
  const span = val[1].getTime() - val[0].getTime();
  if (span > THREE_DAYS_MS) {
    const now = Date.now();
    const newEnd = new Date(Math.min(val[0].getTime() + THREE_DAYS_MS, now));
    timeRange.value = [val[0], newEnd];
  }
}

watch(neOptions, (options, oldOptions) => {
  if (!oldOptions || oldOptions.length === 0) {
    // 首次初始化：全量选中
    selectedNe.value = options.map(item => item.key);
    firstSelectNe = [...selectedNe.value];
  } else {
    // 后续变化：仅同步新增选项，保留用户已取消的选择
    const oldKeys = new Set(oldOptions.map(item => item.key));
    const newKeys = options.filter(item => !oldKeys.has(item.key)).map(item => item.key);
    if (newKeys.length > 0) {
      selectedNe.value = [...selectedNe.value, ...newKeys];
    }

    // 移除已不存在的选项
    const currentKeys = new Set(options.map(item => item.key));
    selectedNe.value = selectedNe.value.filter(key => currentKeys.has(key));
  }

  prevSelectedNe = [...selectedNe.value];
}, {immediate: true});
// 表格默认配置
const globalProps = {
  resizable: false,
  minWidth: 100,
};
const formatDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const createPayload = () => {
  return {
    rate: ratioError.value ? '' : Number(ratioInput.value),
    cid: props.cid,
    neName: selectedNe.value,
    startTime: formatDate(timeRange.value[0]),
    endTime: formatDate(timeRange.value[1]),
    kpiPeriod: props.kpiPeriod,
    start: 0,
    limit: 10,
  };
};

// 表格列定义
const columns = [
  {prop: 'ne_name', label: t('dashboard.NeName'), width: 300},
  {prop: 'kpi_item', label: t('dashboard.object_name')},
  {prop: 'changeRate', label: t('dashboard.mutation_ratio'), width: 180},
];

function handleNeChange(val) {
  if (val.length === 0) {
    // 回退为上一次的有效值，保证至少选中1个
    nextTick(() => {
      selectedNe.value = [...prevSelectedNe];
    });
  } else {
    prevSelectedNe = [...val];
  }
}

function handleSelectObject(data) {
  const payload = createPayload();
  payload.neNameList = selectedNe.value;
  payload.itemList = data.selectedObjectList;
  delete payload.neName;
  data.payload = payload;
  emit('select-object', data);
}

async function handleAnalyze() {
  if (!validateRatio(ratioInput.value)) {
    return;
  }

  const result = await getKpiMutionData(createPayload());
  if (result?.itemList) {
    objectList.value = result.itemList.map(each => ({key: each, label: each}));
  }

  tableRef.value?.reload();
  legendRef.value?.emitSelected();
}

function handleListStyle() {
  isListStyle.value = !isListStyle.value;
  emit('click-event', {name: 'setStyle', value: isListStyle.value ? 'list-style' : 'chart-style'});
}

function handleExport() {
  exportFile2(['EdgeCoreNetMaintenanceService/dashboard/dashboard_mutation_data_export'], createPayload());
  emit('click-event', {name: 'export'});
}

function handleModeChange(mode) {
  activeTab.value = mode;
  if (mode === 'network') {
    isListStyle.value = false;
    legendRef.value?.clearAll();
  }

  emit('click-event', {name: 'switchMode', value: mode});
}

defineExpose({
  reset() {
    selectedNe.value = [...firstSelectNe];
    ratioInput.value = '10';
    objectList.value = [];
    tableRef.value?.reset();
    legendRef.value?.clearAll();
  },
  setTimeRange(startTime, endTime) {
    timeRange.value = [startTime, endTime];
  }
});
</script>

<style scoped lang="less">

.toggle-button-container {
  --gradient-container-border-radius: 4px;
  --gradient-container-backdrop-filter: unset;
  --gradient-container-bg-img: linear-gradient(135deg, #072361 0%, #13404e 53%, #0b4382 100%);
  --gradient-container-border-bg-img: linear-gradient(135deg, #7c9ce4 0%, #2497a4 100%);

  display: flex;
  position: absolute;
  top: 16px;
  right: 70px;
  width: 225px;
  height: 32px;
  border: 1px solid #3559a0;
  z-index: 2;
  border-radius: var(--gradient-container-border-radius);

  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    width: calc(100% / 3);
    height: 100%;
    border-radius: var(--gradient-container-border-radius);
    backdrop-filter: var(--gradient-container-backdrop-filter);
    background-image: linear-gradient(180deg, #346cc4 0%, #16457c 100%);
    z-index: 0;
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: var(--gradient-container-border-width);
      border-radius: var(--gradient-container-border-radius);
      background-image: var(--gradient-container-border-bg-img);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
    }

    &.slide-right {
      left: calc(100% / 3);
      width: calc(200% / 3);
    }
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    color: #a0b1c7;
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
    transition: color 0.3s ease;

    &:first-child {
      flex: 0 0 calc(100% / 3);
    }

    &:last-child {
      flex: 0 0 calc(200% / 3);
    }

    &.active {
      color: #fff;
    }
  }
}

.object-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  top: 68px;
  left: 0;
  width: 100%;
  height: calc(100% - 68px - 40px);
  border-radius: 8px;
  z-index: 1;
  pointer-events: none;
}

.object-chart-container.list-mode {
  height: calc(100% - 68px);
}

.object-toolbar {
  left: 0;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 20px;
  width: 100%;
  pointer-events: all;
  max-height: 32px;
}

.toolbar-item {
  display: flex;
  align-items: center;
  gap: 12px;

  :deep(.toolbar-error) {
    white-space: initial;
    width: 310px;
  }
}

.toolbar-label {
  color: #F5F5F5;
  font-size: 14px;
  white-space: nowrap;
}

.toolbar-input-number-wrapper {
  position: relative;
}

.toolbar-error {
  position: absolute;
  top: 100%;
  left: 0;
  color: #f56c6c;
  font-size: 12px;
  line-height: 1;
  padding-top: 4px;
  white-space: nowrap;
}

:deep(.toolbar-select) {
  --el-border-color: #56698D;
  --el-text-color-regular: #fff;
  width: 200px;

  .el-select__wrapper {
    background-color: transparent;
  }

  .el-tag.el-tag--info {
    --el-tag-bg-color: rgba(255, 255, 255, 0.2);

    .el-tag__close {
      --el-icon-size: 13px;
      display: flex;
      justify-content: center;
      transition: background-color 0.2s ease;
      border-radius: 4px;
      padding: 1px;

      &:hover {
        background-color: rgba(255, 255, 255, 0.3);
      }
    }
  }

  .el-select__selection {
    flex-wrap: initial;
  }
}

:deep(.toolbar-date-picker) {
  --el-border-color: #56698D;
  --el-date-editor-width: 350px;
  --el-font-size-base: 13px;
  --el-text-color-regular: #fff;
  --el-text-color-primary: #fff;
  background-color: transparent;
}

:deep(.toolbar-input-number) {
  --el-border-color: #56698D;
  width: 80px;

  &.is-error {
    :deep(.el-input__wrapper) {
      box-shadow: 0 0 0 1px #f56c6c inset;
    }
  }

  .el-input__wrapper {
    background-color: transparent;

    input {
      color: #fff;
    }
  }
}

.toolbar-analyze-btn {
  height: 32px;
  width: 96px;
  padding: 8px 0;
  margin-right: auto;
  margin-left: -12px;
  background-color: transparent;
  border-color: #56698D;
  color: #fff;
}

.toolbar-icon-btns {
  display: flex;
  gap: 8px;
  margin-left: 20px;
  background-color: transparent;
  border-color: #56698D;
}

.toolbar-icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  background-color: transparent;
  border-color: #56698D;

  :deep(svg rect + g) {
    fill: #fff;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
