<!--
  - Copyright (c) Huawei Technologies Co., Ltd. 2026-2026. All rights reserved.
  -->

<template>
  <el-row>
    <el-table
      :key="tableKey"
      v-loading="loading"
      :data="data"
      :tooltip-options="tooltipOptions"
      show-overflow-tooltip
      style="width: 100%"
      tooltip-effect="light"
      :max-height="maxTableHeight"
      class="filter-table"
    >
      <el-table-column
        type="index"
        min-width="50"
        :label="t('number')"
        :index="getRowNumber"
      />
      <el-table-column
        v-for="column in visibleColumnList"
        :key="column.name"
        :prop="column.name"
        :min-width="column.min_width || 'auto'"
        :formatter="column.formatter"
        show-overflow-tooltip
        tooltip-effect="light"
      >
        <template #header>
          <filter-header
            ref="columnHeaderRef"
            :column="column"
            :sort-method="sortData"
            :sort-field="sortField"
            :load-data-method="loadData"
            :single-select="singleSelect"
          />
        </template>
        <template #default="scope">
          <slot
            name="cell"
            :column="column"
            :row="scope.row"
            :value="scope.row[scope.column.property]"
          >
            <template v-if="column.name === 'alarm_id'">
              <span @click="viewAlarmDetails(scope.row)">
                <a>{{ scope.row[scope.column.property] }}</a>
              </span>
            </template>
            <template v-else-if="column.name === 'alarm_level'">
              <span :class="[getFieldClass(CONSTANTS.ALARM_LEVEL, scope.row[scope.column.property]), 'alarm-level']">
                {{ getFieldLabel(CONSTANTS.ALARM_LEVEL, scope.row[scope.column.property]) }}
              </span>
            </template>
            <template v-else-if="column.name === 'diagnosis_status'">
              <span
                :class="[getFieldClass(CONSTANTS.DIAGNOSIS_STATUS, scope.row[scope.column.property]), 'diagnosis-status']"
              />
              <span>{{ scope.row.diagnosis_status_display || '--' }}</span>
            </template>
            <template v-else>
              {{ t(scope.row[scope.column.property] + '') }}
            </template>
          </slot>
        </template>
      </el-table-column>
      <template #empty>
        <NoData img-height="105px" />
      </template>
      <el-table-column
        v-if="showOperations"
        width="105"
        :label="t('operation')"
      >
        <template #default="scope">
          <img
            class="topo-icon"
            :title="$t('interconnection_topo')"
            style="margin-right: 3px"
            :src="getImgSrc('interconnection_topo')"
            @click="linkTopo(scope.row)"
          >
          <img
            v-if="mdafSwitchOn && scope.row.diagnosis_status === 4"
            :title="$t('trigger_diagnosis')"
            style="margin-right: 3px"
            :src="getImgSrc('trigger_diagnosis')"
            @click="handleTriggerDiagnosis(scope.row)"
          >
          <img
            v-if="mdafSwitchOn && getFieldClass(CONSTANTS.DIAGNOSIS_STATUS, scope.row.diagnosis_status) === 'completed'"
            :title="$t('diagnostic_report')"
            style="margin-right: 3px"
            :src="getImgSrc('diagnostic_report')"
            @click="viewDiagnosisReport(scope.row)"
          >
        </template>
      </el-table-column>
    </el-table>
  </el-row>
  <el-row class="custom-pagination">
    <el-pagination
      v-model:current-page="pagination.current"
      v-model:page-size="pagination.size"
      :page-sizes="pageSizes"
      :layout="paginationLayout"
      :total="pagination.total"
      @size-change="handleSizeChange"
    />
  </el-row>
</template>

<script setup>
import {ref, watch, computed} from 'vue';
import FilterHeader from './column-header.vue';
import {t} from '@adc/vigour-ui/lib/utils/i18n';
import CONSTANTS from '@/constants/alarm-constants';
import {ElMessage} from 'element-plus';
import {useThemeStore} from '@/store/theme-store';
import {useEventStore} from '@/store/event-store';
import NoData from '@/components/no-data.vue';

const themeStore = useThemeStore();
const eventStore = useEventStore();
const currentTheme = computed(() => themeStore.themeData);
const darkImgSrc = {
  interconnection_topo: require('@/assets/imgs/dark-topo.png'),
  trigger_diagnosis: require('@/assets/imgs/dark-diagnosis.png'),
  diagnostic_report: require('@/assets/imgs/dark-result.png'),
};
const lightImgSrc = {
  interconnection_topo: require('@/assets/imgs/topo.png'),
  trigger_diagnosis: require('@/assets/imgs/diagnosis.png'),
  diagnostic_report: require('@/assets/imgs/result.png'),
};
const getImgSrc = (it) => (currentTheme.value === 'dark' ? darkImgSrc : lightImgSrc)[it];
const props = defineProps({
  data: Array,
  columnList: Array,
  maxTableHeight: String,
  loadDataMethod: Function,
  viewAlarmDetails: Function,
  viewDiagnosisReport: Function,
  handleTriggerDiagnosis: Function,
  size: {
    type: Number,
    default: 5,
  },
  mdafSwitchOn: {
    type: Boolean,
    default: false,
  },
  /** 是否单选模式，透传给 column-header */
  singleSelect: {
    type: Boolean,
    default: false,
  },
  /** 是否显示操作列（默认 true 保持告警场景兼容） */
  showOperations: {
    type: Boolean,
    default: true,
  },
  /** el-table 的 key，变化时强制重渲染 */
  tableKey: {
    type: [String, Number, Boolean],
    default: undefined,
  },
  /** 分页页大小选项 */
  pageSizes: {
    type: Array,
    default: () => [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  },
  /** 分页布局 */
  paginationLayout: {
    type: String,
    default: 'total, sizes, prev, pager, next, jumper',
  },
});

// 判断诊断状态列是否可见
const visibleColumnList = computed(() =>
  props.columnList.filter(col =>
    !(col.name === 'diagnosis_status' && !props.mdafSwitchOn)
  )
);
const columnHeaderRef = ref();
const tooltipOptions = ref({popperClass: 'over-z-index-popper'});
const pagination = ref({
  current: 1,
  size: props.size,
  total: 0,
});
const sortField = ref('');
const loading = ref(false);

/**
 * 页大小变化事件
 * @param {Number} limit 页大小
 * @returns {void}
 */
function handleSizeChange(limit) {
  pagination.value.size = limit;
  pagination.value.current = 1;
  props.loadDataMethod(
    {
      start: 0,
      limit,
    },
    loadFinished
  );
}

// 监听当前页变化，如果起始坐标大于100w，则弹窗提示
watch(
  () => pagination.value.current,
  (newValue, oldValue) => {
    const START_LIMIT = 1000000;
    const start = (newValue - 1) * pagination.value.size;
    const startOld = (oldValue - 1) * pagination.value.size;

    if (startOld >= START_LIMIT) {
      return;
    }

    if (start >= START_LIMIT) {
      ElMessage({
        message: t('over_page'),
        showClose: true,
        duration: 5000,
      });
      pagination.value.current = oldValue;
      return;
    }

    props.loadDataMethod(
      {
        start: (pagination.value.current - 1) * pagination.value.size,
        limit: pagination.value.size,
      },
      loadFinished
    );
  }
);

/**
 * 加载数据
 * @param {Object} param 请求参数
 * @returns {void}
 */
function loadData(param) {
  loading.value = true;
  pagination.value.current = 1;
  props.loadDataMethod(
    {
      ...param,
      start: 0,
      limit: pagination.value.size,
    },
    loadFinished
  );
}

/**
 * 加载完成回调事件
 * @param {Array} res 数据列表
 * @returns {void}
 */
function loadFinished(res) {
  pagination.value.total = res.total || 0;
  loading.value = false;
}

/**
 * 排序
 * @param {String} sort 排序字段
 * @param {String} dir 升序或降序
 * @returns {void}
 */
function sortData(sort, dir) {
  sortField.value = sort;
  loadData({sort, dir});
}

// 翻译告警级别、诊断状态的标签
const getFieldLabel = (dataMap, currentValue) => {
  const currentValueNum = Number(currentValue);
  const dataList = dataMap.map((it) => it.value);
  return dataList.includes(currentValueNum) ? t(dataMap.find((item) => item.value === currentValueNum)?.label) : '';
};

// 获取告警级别、诊断状态的样式
const getFieldClass = (dataMap, currentValue) => {
  const currentValueNum = Number(currentValue);
  const dataList = dataMap.map((it) => it.value);
  return dataList.includes(currentValueNum) ? dataMap.find((item) => item.value === currentValueNum)?.name : '';
};

/**
 * 设置加载状态
 * @param {Boolean} value true或false
 * @returns {void}
 */
function setLoading(value) {
  loading.value = value;
}

/**
 * 设置列表行编号
 * @param {Number} index 下标，从0开始
 * @returns {Number} 行编号
 */
const getRowNumber = (index) => {
  return (pagination.value.current - 1) * pagination.value.size + index + 1;
};

/**
 * 跳转拓扑图，将网元名称写入store
 * @param {Object} row 当前行数据
 * @returns {void}
 */
function linkTopo(row) {
  eventStore.neName = row.ne_name;
}

defineExpose({
  loadFinished,
  setLoading,
  reload: loadData,
});
</script>
<style lang="less" scoped>
:global(:root.dark) {
  --filter-table-background-color: rgba(25, 25, 25, 1);
  --filter-table-a-color: rgba(0, 115, 232, 1);
  --filter-table-text-color: rgba(245, 245, 245, 1);
  --filter-table-pagination-button-color: rgba(255, 255, 255, 1);
}

:global(:root.light) {
  --filter-table-background-color: white;
  --filter-table-a-color: rgba(0, 103, 209, 1);
  --filter-table-text-color: rgba(30, 30, 30, 1);
  --filter-table-pagination-button-color: rgba(46, 46, 46, 1);
}

@import 'dark-theme.css';
@import 'filter-table.less';
</style>
<style lang="less">
.el-table th:not(:first-child)::after {
  content: '';
  width: 1px;
  height: 16px;
  top: 12px;
  background: #dcdfe6;
  position: absolute;
  right: 0;
  left: 8px;
  background: rgba(166, 166, 166, 1);
}
</style>
