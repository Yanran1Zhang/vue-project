<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('dash_procode.network_risk_details')"
    width="1320"
    :before-close="handleClose"
    destroy-on-close
    class="risk-detail"
  >
    <filter-table
      ref="tableRef"
      :data="tableData"
      :column-list="CONSTANTS.COLUMNS"
      :load-data-method="loadDataMethod"
      :max-table-height="maxTableHeight"
      :single-select="true"
      :show-operations="false"
      :page-sizes="[10, 15, 20]"
      :size="10"
      pagination-layout="total, sizes, prev, pager, next"
    >
      <template #cell="{ column, row, value }">
        <template v-if="column.name === 'riskLevel'">
          <span
            :class="[value ? value.toLowerCase() : '', 'risk-level']"
          >
            {{ row.riskLevelLabel }}
          </span>
        </template>
        <template v-else>
          {{ value }}
        </template>
      </template>
    </filter-table>
  </el-dialog>
</template>

<script setup>
import {computed, nextTick, ref, watch} from 'vue';
import {useI18n} from 'vue-i18n';
import {getRiskCheckNeDetails} from '@/api/risk';
import FilterTable from '../filter-table/filter-table.vue';
import CONSTANTS from '@/constants/risk-constants';
const {t} = useI18n();

const props = defineProps({
  /** 弹窗是否可见 */
  visible: { type: Boolean, required: true },
  /** 当前激活的筛选项 */
  activeFilter: { type: Object, required: true },
  /** 概览状态 open/closed */
  overviewStatus: { type: String, default: 'open' },
});

const emit = defineEmits(['update:visible', 'close']);

// ── 表格状态 ──────────────────────────────────
const tableRef = ref();
const tableData = ref([]);
const maxTableHeight = ref(600);

// ── 筛选参数 ──────────────────────────────────
const columnFilterParams = ref({});

// ── 弹窗双向绑定 ──────────────────────────────
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

/** 关闭弹窗回调 */
const handleClose = (done) => {
  emit('close');
  done();
};

// ── 请求参数构建 ──────────────────────────────
const buildBaseParams = () => {
  const params = {
    risk_status: '',
    risk_type: '',
    ne_type_exact: '',
  };

  if (props.activeFilter.kind === 'status') {
    params.risk_status = props.activeFilter.value;
  }
  if (props.activeFilter.kind === 'riskType') {
    params.risk_status = props.overviewStatus === 'closed' ? '1' : '0';
    params.risk_type = props.activeFilter.value;
  }
  if (props.activeFilter.kind === 'neType') {
    params.risk_status = props.overviewStatus === 'closed' ? '1' : '0';
    params.ne_type_exact = props.activeFilter.value;
  }

  return params;
};

// ── 数据加载 ──────────────────────────────────

/** 加载风险检查详情数据 */
const loadDetails = async (start, limit) => {
  try {
    const base = buildBaseParams();
    const filters = columnFilterParams.value;

    const response = await getRiskCheckNeDetails({
      start,
      limit,
      risk_status: base.risk_status,
      risk_type: filters.riskType || base.risk_type,
      ne_type: filters.neType,
      ne_type_exact: base.ne_type_exact,
      risk_level: filters.riskLevel,
      ne_id: filters.neId,
      risk_name: filters.riskName,
      ne_name: filters.neName,
    });

    tableData.value = response.results || [];

    return { total: response.total };
  } catch {
    tableData.value = [];
    return { total: 0 };
  }
};

/** filter-table 的 loadDataMethod 回调 */
const loadDataMethod = async (params, loadFinished) => {
  // 累积筛选参数
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'start' && key !== 'limit') {
      if (Array.isArray(value)) {
        columnFilterParams.value[key] = value.length > 0 ? value[0] : '';
      } else {
        columnFilterParams.value[key] = value;
      }
    }
  });

  const start = params.start ?? 0;
  const limit = params.limit ?? 10;

  const result = await loadDetails(start, limit);
  loadFinished(result);
};

// ── 侦听器 ────────────────────────────────────

/** 弹窗打开时加载数据 */
watch(() => props.visible, (isOpen) => {
  if (isOpen) {
    tableData.value = [];
    columnFilterParams.value = {};
    nextTick(() => {
      tableRef.value?.reload({});
    });
  }
});
</script>

<style lang="less" scoped>
:global(.el-overlay-dialog .risk-detail .risk-level) {
  display: inline-block;
  height: 20px;
  line-height: 20px;
  padding: 0 8px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 12px;
  color: var(--risk-overview-level-low-color);
  background: var(--risk-overview-level-low-bgc);
}

:global(.el-overlay-dialog .risk-detail .risk-level.high) {
  color: var(--risk-overview-level-high-color);
  background: var(--risk-overview-level-high-bgc);
}

:global(.el-overlay-dialog .risk-detail .risk-level.medium) {
  color: var(--risk-overview-level-medium-color);
  background: var(--risk-overview-level-medium-bgc);
}

:global(.el-overlay-dialog .risk-detail .risk-level.low) {
  color: var(--risk-overview-level-low-color);
  background: var(--risk-overview-level-low-bgc);
}

:global(.el-overlay-dialog .risk-detail) {
  padding-bottom: 54px;
}

:global(.el-overlay-dialog .risk-detail .el-dialog__body) {
  padding-bottom: 12px;
}
</style>
