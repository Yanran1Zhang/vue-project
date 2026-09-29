<template>
  <div
    v-loading="!overviewData"
    class="risk-overview"
  >
    <!-- 概览卡片 -->
    <div
      v-if="!overviewData"
      class="risk-card"
      aria-labelledby="risk-card-title"
    />
    <div
      v-else
      class="risk-card"
      aria-labelledby="risk-card-title"
    >
      <header class="risk-card__header">
        <CardTitle :text="t('dash_procode.cyber_risk')" />
        <button
          class="view-all"
          type="button"
          @click="openNewPage()"
        >
          {{ t('dash_procode.view_all') }}
        </button>
      </header>

      <!-- 风险总数 -->
      <div class="risk-total">
        <button
          class="risk-total__number"
          type="button"
          :aria-label="t('dash_procode.view_all')"
          @click="openDetail({ kind: 'all' })"
        >
          <span class="risk-total__value">{{ overviewData.total || 0 }}</span>
          <span class="risk-total__unit">{{ t('dash_procode.a') }}</span>
        </button>
        <div>
          <span>{{ t('dash_procode.risk_total') }}</span>
          <span v-if="overviewData.riskTimeMonths && !isNaN(overviewData.riskTimeMonths)">
            ({{ overviewData.riskTimeMonths }}{{ t('dash_procode.months') }})
          </span>
        </div>
        <div class="risk-total__status">
          <button
            type="button"
            class="status-link status-link--open"
            @click="overviewStatus = 'open'"
          >
            {{ t('dash_procode.unclosed') }}{{ overviewData.open || 0 }}
          </button>
          <button
            type="button"
            class="status-link status-link--closed"
            @click="overviewStatus = 'closed'"
          >
            {{ t('dash_procode.closed') }}{{ overviewData.closed || 0 }}
          </button>
        </div>
      </div>

      <!-- 按风险类型 -->
      <div class="risk-section">
        <div class="risk-section__title">
          <h3>{{ t('dash_procode.by_risk_type') }} ({{ overviewStatus === 'open' ? t('dash_procode.unclosed') : t('dash_procode.closed') }})</h3>
        </div>
        <TransitionGroup
          v-if="activeRiskTypes.length"
          name="list"
          tag="div"
          class="type-list"
        >
          <button
            v-for="(item) in activeRiskTypes"
            :key="item.name"
            class="type-row"
            type="button"
            @click="openDetail({ kind: 'riskType', value: item.name })"
          >
            <span class="type-row__meta">
              <strong>{{ item.name }}</strong>
              <span class="type-row__nums">
                <span class="type-row__count">{{ item.count }}</span>
                <span class="type-row__divider" />
                <span class="type-row__total">{{ item.total }}</span>
              </span>
            </span>
            <span class="type-row__track">
              <span
                class="type-row__fill"
                :style="{ width: barWidth(item) }"
              />
            </span>
          </button>
        </TransitionGroup>
        <NoData v-else />
      </div>

      <!-- 按网元类型 -->
      <div class="risk-section risk-section--ne">
        <div class="risk-section__title">
          <h3>{{ t('dash_procode.by_ne_type') }} ({{ overviewStatus === 'open' ? t('dash_procode.unclosed') : t('dash_procode.closed') }})</h3>
        </div>
        <TransitionGroup
          v-if="activeNeTypes.length"
          name="list"
          tag="div"
          class="ne-list"
        >
          <button
            v-for="item in activeNeTypes"
            :key="item.name"
            class="ne-row"
            type="button"
            @click="openDetail({ kind: 'neType', value: item.name })"
          >
            <span>{{ item.name }}</span>
            <strong>{{ item.count }}</strong>
          </button>
        </TransitionGroup>
        <NoData
          v-else
        />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <RiskDetailGrid
      v-model:visible="detailOpen"
      :active-filter="activeFilter"
      :overview-status="overviewStatus"
    />
  </div>
</template>

<script setup>
import {computed, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import CardTitle from '../card-title.vue';
import RiskDetailGrid from './risk-detail-grid.vue';
import NoData from '@/components/no-data.vue';

const {t} = useI18n();
const {tenantId} = window.top;

const props = defineProps({
  /**
   * 框架统一传入的概览数据，结构如下：
   * @property {number}  total            - 风险总数
   * @property {number}  open             - 未关闭数
   * @property {number}  closed           - 已关闭数
   * @property {number}  riskTimeMonths   - 风险时长（月）
   * @property {Array<{name: string, count: number}>} riskTypes-unclosed - 未关闭风险类型列表
   * @property {Array<{name: string, count: number}>} riskTypes-closed   - 已关闭风险类型列表
   * @property {Array<{name: string, count: number}>} neTypes-unclosed   - 未关闭网元类型列表
   * @property {Array<{name: string, count: number}>} neTypes-closed     - 已关闭网元类型列表
   */
  data: {type: Object, default: null},
});

// ── 概览数据 ──────────────────────────────────
const overviewData = computed(() => props.data);
const overviewStatus = ref('open');

// ── 详情弹窗 ──────────────────────────────────
const detailOpen = ref(false);
const activeFilter = ref({kind: 'all'});

// ── 计算属性 ──────────────────────────────────

/** 风险类型汇总（未关闭 + 关闭） */
const riskTypeTotalMap = computed(() => {
  if (!overviewData.value) {
    return {};
  }

  const map = {};
  const unclosedItems = overviewData.value['riskTypes-unclosed'] || [];
  const closed = overviewData.value['riskTypes-closed'] || [];
  unclosedItems.forEach((item) => {
    map[item.name] = (map[item.name] || 0) + item.count;
  });
  closed.forEach((item) => {
    map[item.name] = (map[item.name] || 0) + item.count;
  });
  return map;
});

/** 当前状态下的风险类型列表 */
const activeRiskTypes = computed(() => {
  if (!overviewData.value) {
    return [];
  }

  const key = overviewStatus.value === 'open' ? 'riskTypes-unclosed' : 'riskTypes-closed';
  const items = overviewData.value[key] || [];
  return items.map((item) => ({
    name: item.name,
    count: item.count,
    total: riskTypeTotalMap.value[item.name] || item.count,
  }));
});

/** 当前状态下的网元类型列表 */
const activeNeTypes = computed(() => {
  if (!overviewData.value) {
    return [];
  }

  const key = overviewStatus.value === 'open' ? 'neTypes-unclosed' : 'neTypes-closed';
  const items = overviewData.value[key] || [];
  return items.map((item) => ({
    name: item.name,
    count: item.count,
  }));
});

/** 条形图宽度百分比 */
const barWidth = (item) => {
  return `${(item.count / item.total) * 100}%`;
};

// ── 方法 ──────────────────────────────────────

/** 打开详情弹窗 */
const openDetail = (filter) => {
  activeFilter.value = filter;
  detailOpen.value = true;
};

/** 跳转风险检查页面 */
const openNewPage = () => {
  const url = `/adc-static/static/procodeComp/${tenantId}/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check/latest/dist/index.html#/riskCheckResult`;
  window.top.NfLayout.openTab(url, {
    target: '_tab',
    title: t('dash_procode.cyber_risk'),
  });
};
</script>

<style lang="less" scoped>
@import 'risk-overview-theme.css';

.risk-overview {
  width: 100%;
  height: 100%;
}

.risk-overview button {
  color: inherit;
}

.risk-overview button:focus-visible {
  outline: 2px solid var(--risk-overview-accent-color);
  outline-offset: 2px;
}

/* 卡片 */
.risk-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background: var(--risk-overview-card-bgc);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);

  border-radius: 8px;
  overflow: hidden;
}

.risk-card__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.risk-overview .view-all {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 5px 0;
  border: 0;
  background: none;
  color: var(--risk-overview-view-all-color);
  font-size: 14px;
  cursor: pointer;
}

.risk-overview .view-all:hover {
  color: #7bcaff;
}

/* 总数区域 */
.risk-total {
  flex-shrink: 0;
  padding: 16px 0 16px;
  text-align: center;
}

.risk-total__number {
  display: inline-flex;
  align-items: flex-start;
  gap: 2px;
  padding: 0 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.risk-total__value {
  font-size: 32px;
  font-weight: 500;
  line-height: 1;
  color: var(--risk-overview-number-color);
}

.risk-total__number:hover .risk-total__value {
  color: var(--risk-overview-accent-color);
}

.risk-total__unit {
  font-family: 'Microsoft YaHei';
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: 0;
  color: var(--risk-overview-label-color);
  align-self: flex-end;
}

.risk-total > div {
  margin: 4px 0 4px;
  font-family: 'Microsoft YaHei';
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  letter-spacing: 0;
  color: var(--risk-overview-label-color);
}

.risk-total > p span {
  color: inherit;
}

.risk-total__status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.status-link {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-family: 'Microsoft YaHei';
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: 0;
  text-align: center;
}

.status-link strong {
  margin-left: 3px;
  font-size: 14px;
}

.risk-overview .status-link--open {
  color: var(--risk-overview-status-open-color);
}

.risk-overview .status-link--closed {
  color: var(--risk-overview-status-closed-color);
}

.status-link:hover {
  filter: brightness(1.25);
}

/* 分组区域 */
.risk-section {
  flex-shrink: 0;
}

.risk-section--ne {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 16px;
  overflow: hidden;
}

.risk-section--ne .risk-section__title {
  flex-shrink: 0;
}

.risk-section__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.risk-section__title h3 {
  margin: 0;
  font-family: 'Microsoft YaHei';
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: 0;
  color: var(--risk-overview-label-color);
}

.risk-section__suffix {
  font-family: 'Microsoft YaHei';
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: 0;
  color: var(--risk-overview-label-color);
}

/* 风险类型列表 */
.type-list {
  display: grid;
  gap: 8px;
  position: relative;
  transition: height 0.3s ease-in-out;
}

/* 网元类型列表 */
.ne-list {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-auto-rows: 43px;
  gap: 8px;
  position: relative;
  overflow-y: auto;
}

/* 列表项过渡动画 */
.list-enter-active,
.list-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
}

.list-leave-active {
  position: absolute;
  width: 100%;
}

.list-move {
  transition: transform 0.3s ease-in-out;
}

.type-row {
  display: block;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--risk-overview-row-border-color);
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.type-row:hover {
  border-color: var(--risk-overview-row-hover-border-color);
  background: var(--risk-overview-row-hover-bgc);
}

.type-row__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.type-row__meta strong {
  color: var(--risk-overview-type-name-color);

  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  letter-spacing: 0;
  text-align: left;
}

.type-row__nums {
  display: inline-flex;
  align-items: center;
  width: max-content;
}

.type-row__count {
  color: var(--risk-overview-number-color);

  font-family: 'Microsoft YaHei';
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
  letter-spacing: 0;
  text-align: left;
}

.type-row__divider {
  width: 1px;
  height: 10px;
  margin: 0 4px;
  background: rgba(233, 233, 233, 1);
}

.type-row__total {
  color: rgba(147, 147, 147, 1);

  font-family: 'Microsoft YaHei';
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
  letter-spacing: 0;
  text-align: left;
}

.type-row__track {
  display: block;
  width: 100%;
  height: 8px;
  overflow: hidden;
  background: var(--risk-overview-track-bgc);
  border-radius: 8px;
}

.type-row__fill {
  display: block;
  height: 100%;
  background: var(--risk-overview-bar-blue);
  box-shadow: 0 0 12px rgba(57, 168, 255, 0.45);
}

.risk-overview .ne-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 43px;
  padding: 0 8px;
  border: 1px solid var(--risk-overview-row-border-color);
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  color: var(--risk-overview-type-name-color);
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.risk-overview .ne-row:hover {
  border-color: var(--risk-overview-row-hover-border-color);
  background: var(--risk-overview-row-hover-bgc);
}

.risk-overview .ne-row strong {
  color: var(--risk-overview-number-color);
}
</style>
