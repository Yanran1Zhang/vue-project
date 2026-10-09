<template>
  <div>
    <el-dialog
      v-model="visible"
      :title="props.eventData.event_title || ''"
      class="event-detail-dialog"
      width="1200px"
      :before-close="onClose"
      :close-on-click-modal="true"
      :teleported="false"
    >
      <div
        v-loading="dialogLoading"
        class="event-dialog-body"
      >
        <div class="event-dialog-top">
          <div class="event-dialog-top-left">
            <el-tabs
              v-model="activeTab"
              class="dialog-tabs"
              @tab-click="handleTabClick"
            >
              <el-tab-pane
                v-for="value in visibleTabFields"
                :key="value.key"
                :label="value.label"
                :name="value.key"
              />
            </el-tabs>
          </div>
          <div
            v-show="isShowJumpBtn"
            class="event-dialog-top-right"
          >
            <div
              class="right-button"
              @click="handleJump"
            >
              {{ t('dash_procode.detail_analysis_KPI_alarm_log') }}
            </div>
          </div>
        </div>
        <!-- 综合分析 -->
        <div
          v-if="activeTab === 'analysis'"
          v-loading="loadingMap.analysis"
          class="event-dialog-content"
        >
          <div class="event-dialog-time">
            <div class="event-dialog-row">
              <div class="event-dialog-time-title">
                {{ t('dash_procode.start_time') }}
              </div>
              <div class="event-dialog-time-content">
                {{ detailData.start_time }}
              </div>
            </div>
          </div>
          <div class="detail-field-content">
            <div
              v-for="field in visibleDetailFields"
              :key="field.key"
              class="detail-field"
            >
              <div class="field-label">
                {{ field.label }}
              </div>
              <div class="field-value">
                {{ formatFieldValue(detailData[field.key]) }}
              </div>
            </div>
          </div>
        </div>
        <!-- 故障路径分析 -->
        <div
          v-else-if="activeTab === 'path'"
          v-loading="loadingMap.path"
          class="event-dialog-content"
        >
          <div class="error-path-big-title">
            {{ t('dash_procode.MDAF_solution_results') }}
          </div>
          <div class="error-path">
            <div
              v-for="(errorPath, idx) in errorPathLists"
              :key="idx"
              class="error-path-field"
            >
              <div class="error-path-title">
                <div class="error-path-icon" />
                <div class="error-path-text">
                  {{ t('dash_procode.fault_path') }}{{ idx + 1 }}
                </div>
              </div>
              <div class="error-path-content">
                <template
                  v-for="(value, index) in errorPath"
                  :key="index"
                >
                  <span
                    class="error-path-item"
                    :class="value.type === 'error' ? 'error-path-item-red' : 'error-path-item-normal'"
                  > {{
                    value.name }}</span>
                  <span
                    v-if="index < errorPath.length - 1"
                    class="error-path-arrow"
                  >→</span>
                </template>
              </div>
            </div>
          </div>
        </div>
        <!-- 恢复脚本参考 -->
        <div
          v-else
          v-loading="loadingMap.script"
          class="event-dialog-content"
        >
          <div class="script-prompt">
            <img
              class="script-prompt-icon"
              src="@/assets/imgs/info.png"
            ></img>
            <div class="script-prompt-text">
              {{ t('dash_procode.for_expert_reference_and_verification') }}
            </div>
          </div>
          <div class="script-summary">
            <div class="script-summary-title">
              {{ t('dash_procode.summary_of_recovery_plan') }}
            </div>
            <div class="script-summary-text">
              {{ recoveryScriptData.summary }}
            </div>
          </div>
          <div class="script-import">
            <div class="script-import-title">
              <div class="script-import-text">
                {{ t('dash_procode.recovery_script') }}
                <span
                  v-if="typeMap[recoveryScriptData.recoveryType]"
                  class="script-type-label"
                >({{ typeMap[recoveryScriptData.recoveryType] }})</span>
              </div>
              <CopyIcon
                class="script-import-icon"
                @click="handleCopy($event)"
              />
            </div>
            <div class="script-import-content">
              {{ recoveryScriptData.recoveryScript }}
            </div>
          </div>

          <div class="script-import">
            <div class="script-import-title">
              <div class="script-import-text">
                {{ t('dash_procode.rollback_script') }}
                <span
                  v-if="typeMap[recoveryScriptData.rollbackType]"
                  class="script-type-label"
                >({{ typeMap[recoveryScriptData.rollbackType] }})</span>
              </div>
              <CopyIcon
                class="script-import-icon"
                @click="handleCopy($event)"
              />
            </div>
            <div class="script-import-content">
              {{ recoveryScriptData.rollbackScript }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {ref, computed, watch, onMounted, onBeforeUnmount} from 'vue';
import {ElMessage} from 'element-plus';
import {t} from '@adc/vigour-ui/lib/utils/i18n';
import * as api from '@/api/api';
import {U} from '@adc/vigour-ui/lib/utils/adapter';
import CopyIcon from './copy-icon.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  eventData: {
    type: Object,
    default: () => ({}),
  },
});

const {tenantId} = window.top;
const isShowJumpBtn = ref(false); // 是否展示跳转按钮
const tabVisibility = ref({}); // 各 tab 的显隐状态
const dialogLoading = ref(false); // 弹窗整体 loading，等初始接口全部完成
const loadedTabs = new Set(); // 已加载过数据的 tab，避免重复请求
const detailData = ref({}); // 综合分析
const errorPathLists = ref([]); // 故障路径分析
const recoveryScriptData = ref({ // 恢复脚本参考
  summary: '',
  recoveryScript: '',
  recoveryType: 0,
  rollbackScript: '',
  rollbackType: 0,
});
const loadingMap = ref({
  analysis: false,
  path: false,
  script: false,
});

const emit = defineEmits(['update:modelValue']);
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});
const activeTab = ref('analysis');
const isDark = ref(false);
let observer = null;

const typeMap = {
  0: t('dash_procode.disaster_recovery'),
  1: t('dash_procode.escape_recovery'),
};

const tabFields = [
  {label: t('dash_procode.comprehensive_analysis'), key: 'analysis'},
  {label: t('dash_procode.fault_path_analysis'), key: 'path'},
  {label: t('dash_procode.recovery_script_reference'), key: 'script'},
];

// 根据接口返回的显隐状态过滤 tab，false 隐藏，其余正常展示
const visibleTabFields = computed(() => {
  return tabFields.filter(field => tabVisibility.value[field.key] !== false);
});

const detailFields = [
  {label: t('dash_procode.error_ne'), key: 'error_ne_name'},
  {label: t('dash_procode.event_phenomenon'), key: 'event_phenomenon'},
  {label: t('dash_procode.impact_assessment'), key: 'impact_assessment'},
];

function formatFieldValue(val) {
  if (!val) {
    return '';
  }

  return val.trim().replace(/NaN%/g, '--')
    .replace(/[;；]\s*$/, '');
}

// 仅保留 detailData 中有值的字段，避免 v-show 时序问题
const visibleDetailFields = computed(() => {
  return detailFields.filter(field => detailData.value[field.key]);
});

// 获取请求参数
function getRequestParams() {
  return props.eventData || {};
}

// 加载综合分析数据
async function fetchAnalysis() {
  loadingMap.value.analysis = true;
  try {
    const res = await api.getComprehensiveAnalysis(getRequestParams());
    detailData.value = res?.data ?? res ?? {};
    loadedTabs.add('analysis');
  } catch {
    detailData.value = {};
  } finally {
    loadingMap.value.analysis = false;
  }
}

// 加载故障路径分析数据
async function fetchPath() {
  loadingMap.value.path = true;
  try {
    const res = await api.getFaultPathAnalysis(getRequestParams());
    errorPathLists.value = res?.error_path_list ?? res ?? [];
    loadedTabs.add('path');
  } catch {
    errorPathLists.value = [];
  } finally {
    loadingMap.value.path = false;
  }
}

// 加载恢复脚本参考数据
async function fetchScript() {
  loadingMap.value.script = true;
  try {
    const res = await api.getRecoveryScriptReference(getRequestParams());
    const data = res?.data ?? res ?? {};
    recoveryScriptData.value = {
      summary: data.summary ?? '',
      recoveryScript: data.recoveryScript ?? '',
      rollbackScript: data.rollbackScript ?? '',
      recoveryType: data.recoveryType ?? 0,
      rollbackType: data.rollbackType ?? 0,
    };
    loadedTabs.add('script');
  } catch {
    recoveryScriptData.value = {summary: '', recoveryScript: '', rollbackScript: '', recoveryType: 0, rollbackType: 0};
  } finally {
    loadingMap.value.script = false;
  }
}

// 按 tab key 加载数据
const fetchMap = {
  analysis: fetchAnalysis,
  path: fetchPath,
  script: fetchScript,
};

// dialog 打开时重置状态，并行加载初始数据，全部完成后才展示
watch(() => props.modelValue, (val) => {
  if (val) {
    activeTab.value = 'analysis';
    loadedTabs.clear();
    dialogLoading.value = true;
    Promise.all([
      fetchJumpButtonStatus(),
      fetchAnalysis(),
      fetchScript(),
    ]).finally(() => {
      dialogLoading.value = false;
    });
  }
});

// tab 点击时加载对应数据（已加载的不再重复请求）
const handleTabClick = (tab) => {
  if (loadedTabs.has(tab.paneName)) {
    return;
  }

  const fetchFn = fetchMap[tab.paneName];
  if (fetchFn) {
    fetchFn();
  }
};

// 复制脚本内容
const handleCopy = async(e) => {
  const contentEl = e.target.closest('.script-import').querySelector('.script-import-content');
  const text = contentEl?.innerText?.trim();
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('dash_procode.copy_success'));
  } catch {
    ElMessage.error(t('dash_procode.copy_failed'));
  }
};

// 三个外部跳转链接
const handleJump = () => {
  const eventId = getRequestParams().event_id;
  if (!eventId) {
    return;
  }

  const params = {
    eventId: U.escapeHtml(eventId),
  };
  const url = U.addParamsByObject(
    `/adc-static/static/procodeComp/${tenantId
    }/EdgeExplosiveRiskDetectionService/cs_ncd_core_network/cs_ncd_core_network/latest/dist/index.html#/riskEventDetail`,
    params
  );
  window.top.NfLayout.openTab(url, {
    target: '_tab',
    title: props.eventData.event_title || '',
  });
};

function onClose() {
  visible.value = false;
}

// 加载跳转按钮状态及 tab 显隐
async function fetchJumpButtonStatus() {
  try {
    const res = await api.getShowJumpButton(getRequestParams());
    isShowJumpBtn.value = (res && res.source === 1);
    // res: {source: 1, tabFields: [{analysis: true}, {path: false}, {script: false}]}
    const visibility = {};
    if (res && Array.isArray(res.tabFields)) {
      res.tabFields.forEach(item => {
        Object.entries(item).forEach(([key, val]) => {
          visibility[key] = val;
        });
      });
    }

    tabVisibility.value = visibility;
  } catch {
    isShowJumpBtn.value = false;
    tabVisibility.value = {};
  }
}

onMounted(() => {
  const html = window.parent.document.documentElement;
  isDark.value = html.classList.contains('dark');

  observer = new MutationObserver(() => {
    isDark.value = html.classList.contains('dark');
  });
  observer.observe(html, {attributes: true, attributeFilter: ['class']});
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style lang="less">
.event-detail-dialog {
  background: var(--event-dialog-bg) !important;
}

.event-detail-dialog .el-dialog__body {
  background: var(--event-dialog-bg);
}

.event-detail-dialog .el-dialog__header {
  background: var(--event-dialog-bg);
}

.event-detail-dialog .el-dialog__headerbtn .el-dialog__close {
  color: var(--event-dialog-text-color);
}

.event-detail-dialog .el-dialog__title {
  color: var(--event-dialog-text-color);
  font-size: 18px;
}
</style>
<style lang="less" scoped>
@import 'event-dialog.less';
</style>
