<template>
  <!-- 溢出文本 tooltip：手动定位，避免 el-tooltip virtual-triggering 状态机卡死 -->
  <Teleport to="body">
    <div
      v-show="tooltipVisible"
      class="overflow-tooltip"
      :class="isDark ? 'is-dark' : 'is-light'"
      :style="tooltipStyle"
    >
      {{ tooltipContent }}
    </div>
  </Teleport>
  <div class="event-card">
    <!-- 顶部：标题 + 统计 -->
    <div class="event-top">
      <div class="event-top-left">
        <CardTitle :text="t('dash_procode.emergency')" />
      </div>
      <div class="event-top-right">
        <div class="event-num">
          <span class="num-label">{{ t('dash_procode.event_total') }}</span>
          <span class="num-value num-total">{{ stats.total }}</span>
        </div>
        <div class="event-num">
          <span class="status-bar status-bar--processing" />
          <span class="num-label">{{ t('dash_procode.processing') }}</span>
          <span class="num-value num-processing">{{ stats.processing }}</span>
        </div>
        <div class="event-num">
          <span class="status-bar status-bar--closed" />
          <span class="num-label">{{ t('dash_procode.closed') }}</span>
          <span class="num-value num-closed">{{ stats.closed }}</span>
        </div>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="event-separator" />

    <!-- 无数据 -->
    <NoData
      v-if="event_list.length === 0"
      fill
      img-height="105px"
    />

    <!-- 分隔标题 -->
    <div
      v-if="event_list.length"
      class="event-middle"
    >
      {{ t('dash_procode.events_in_progress') }}
      <span v-if="props.data?.monthRange && !isNaN(props.data?.monthRange)">
        ({{ props.data?.monthRange }}{{ t('dash_procode.months') }})
      </span>
    </div>

    <!-- 事件列表 -->
    <div
      v-if="event_list.length"
      class="event-list"
    >
      <!-- 左侧大卡片：取第一条 -->
      <div
        class="event-detail-card event-detail-card--full"
        :class="{ 'event-detail-card--selected': selectedIdx === 0 }"
        @click="onCardClick(event_list[0], 0)"
        @dblclick="onCardDblClick(event_list[0])"
      >
        <div class="detail-header">
          <div class="detail-header-left">
            <span class="detail-idx">1</span>
            <span
              class="detail-title"
              @mouseenter="onTextEnter"
              @mouseleave="onTextLeave"
            >
              {{ event_list[0].event_title }}
            </span>
          </div>
          <span
            class="detail-link"
            @click.stop="onCardDblClick(event_list[0])"
          >{{ t('dash_procode.view_detail') }}</span>
        </div>
        <div class="detail-fields">
          <div class="detail-fields-row">
            <div
              v-for="field in fullCardFields.slice(0, 2)"
              v-show="event_list[0][field.key]"
              :key="field.key"
              class="detail-field"
            >
              <span
                class="field-label"
                :class="{ 'field-label--en': isEN }"
              >
                {{ field.label }}
              </span>
              <span
                class="field-value"
                @mouseenter="onTextEnter($event, event_list[0][field.key])"
                @mouseleave="onTextLeave"
              >
                {{ formatFieldValue(event_list[0][field.key]) }}
              </span>
            </div>
          </div>
          <div
            v-for="field in fullCardFields.slice(2)"
            v-show="event_list[0][field.key]"
            :key="field.key"
            class="detail-field"
          >
            <span
              class="field-label"
              :class="{ 'field-label--en': isEN }"
            >
              {{ field.label }}
            </span>
            <span
              class="field-value"
              @mouseenter="onTextEnter($event, event_list[0][field.key])"
              @mouseleave="onTextLeave"
            >
              {{ formatFieldValue(event_list[0][field.key]) }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="event_list.length > 1"
        class="event-divider"
      />

      <!-- 右侧卡片列表（可滚动）：取剩余条目 -->
      <div
        v-if="event_list.length > 1"
        ref="briefListRef"
        class="event-brief-list"
        @wheel="onUserScroll"
        @mousedown="onUserScroll"
        @mouseup="onScrollEnd"
        @mouseleave="onScrollEnd"
      >
        <div
          v-for="(item, idx) in event_list.slice(1)"
          :key="item.occur_time + item.event_title + idx"
          class="event-detail-card event-detail-card--brief"
          :class="{ 'event-detail-card--selected': selectedIdx === idx + 1 }"
          @click="onCardClick(item, idx + 1)"
          @dblclick="onCardDblClick(item)"
        >
          <div class="detail-header">
            <div class="detail-header-left detail-header-left--brief">
              <span class="detail-idx">{{ idx + 2 }}</span>
              <span
                class="detail-title"
                @mouseenter="onTextEnter"
                @mouseleave="onTextLeave"
              >
                {{ item.event_title }}
              </span>
            </div>
            <span
              class="detail-link"
              @click.stop="onCardDblClick(item)"
            >{{ t('dash_procode.view_detail') }}</span>
          </div>
          <div class="detail-brief-row">
            <div
              v-for="field in briefCardFields"
              :key="field.key"
              class="detail-field"
            >
              <span
                class="field-label"
                :class="{ 'field-label--en': isEN }"
              >
                {{ field.label }}
              </span>
              <span
                class="field-value"
                @mouseenter="onTextEnter"
                @mouseleave="onTextLeave"
              >
                {{ item[field.key] }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <EventDialog
    v-model="dialogVisible"
    :event-data="currentEventData"
  />
</template>

<script setup>
import {ref, computed, watch, toRefs, onMounted, onBeforeUnmount} from 'vue';
import EventDialog from './event-dialog.vue';
import CardTitle from '@/components/card-title.vue';
import NoData from '@/components/no-data.vue';
import {useEventStore} from '@/store/event-store';
import {t} from '@adc/vigour-ui/lib/utils/i18n';

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

const eventStore = useEventStore();
const event_list = computed(() => props.data?.event_list ?? []);
const isDark = ref(false);
const isEN = window.locale === 'en_US';
const tooltipVisible = ref(false);
const tooltipContent = ref('');
const tooltipStyle = ref({});

const fullCardFields = [
  {label: t('dash_procode.error_ne'), key: 'error_ne_name'},
  {label: t('dash_procode.occur_time'), key: 'occur_time'},
  {label: t('dash_procode.event_phenomenon'), key: 'event_phenomenon'},
  {label: t('dash_procode.impact_assessment'), key: 'impact_assessment'},
];

const briefCardFields = [
  {label: t('dash_procode.occur_time'), key: 'occur_time'},
  {label: t('dash_procode.error_ne'), key: 'error_ne_name'},
];

function formatFieldValue(val) {
  if (!val) {
    return '';
  }

  return val.trim().replace(/NaN%/g, '--')
    .replace(/[;；]\s*$/, '');
}

const stats = computed(() => ({
  total: props.data?.event_total ?? 0,
  processing: props.data?.event_processing ?? 0,
  closed: props.data?.event_closed ?? 0,
}));

// ====== 卡片点击/双击（延时区分） ======
const dialogVisible = ref(false);
const currentEventData = ref({});
const selectedIdx = ref(-1); // 左卡=0，右卡=1,2,3...；-1=未选中
let clickTimer = null;
let observer = null;
let hideTimer = null;

function onCardClick(item, cardIdx) {
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
    return;
  }

  const capturedIdx = cardIdx;
  clickTimer = setTimeout(() => {
    clickTimer = null;
    if (selectedIdx.value === capturedIdx) {
      // 再次单击同一卡片 → 取消选中
      selectedIdx.value = -1;
      eventStore.neName = '';
      eventStore.eventId = '';
      eventStore.neOrigin = '';
      // 右侧卡片取消选中 → 恢复滚动
      if (capturedIdx >= 1) {
        startAutoScroll();
      }
    } else {
      // 单击新卡片 → 选中
      selectedIdx.value = capturedIdx;
      eventStore.neName = item.error_ne_name || '';
      eventStore.eventId = item.event_id || '';
      eventStore.neOrigin = 'event';
      // 右侧卡片选中 → 停止滚动（同弹窗打开效果）
      if (capturedIdx >= 1) {
        stopAutoScroll();
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
      }
    }
  }, 250);
}

function onCardDblClick(item) {
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }

  currentEventData.value = item;
  dialogVisible.value = true;
}

// 弹窗打开时冻结滚动，关闭时恢复（除非右侧卡片选中中）
watch(dialogVisible, (val) => {
  if (val) {
    stopAutoScroll();
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  } else {
    // 弹窗关闭时，如果右侧卡片仍选中，不恢复滚动
    if (selectedIdx.value >= 1) {
      return;
    }

    startAutoScroll();
  }
});

function onTextEnter(e, rawValue) {
  const el = e.currentTarget;
  if (el.scrollWidth > el.clientWidth) {
    // 溢出元素：取消待执行的隐藏，显示新 tooltip
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    const rect = el.getBoundingClientRect();
    tooltipContent.value = typeof rawValue === 'string' ? formatFieldValue(rawValue) : el.innerText;
    tooltipStyle.value = {
      position: 'fixed',
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.bottom + 8}px`,
      transform: 'translateX(-50%)',
    };
    tooltipVisible.value = true;
  }
  // 不溢出：不取消 hideTimer，让上一个 tooltip 正常延时隐藏
}

function onTextLeave() {
  hideTimer = setTimeout(() => {
    tooltipVisible.value = false;
    hideTimer = null;
  }, 100);
}

// ====== 右侧列表自动滚动 ======
const briefListRef = ref(null);
let autoScrollTimer = null;
let resumeTimer = null;
const SCROLL_INTERVAL = 3000;
const RESUME_DELAY = 3000;

// 获取所有 brief 卡片的真实顶部偏移（相对容器 scrollTop）
function getCardOffsets() {
  const el = briefListRef.value;
  if (!el) {
    return [];
  }

  const cards = el.querySelectorAll('.event-detail-card--brief');
  return Array.from(cards).map((card) => {
    const rect = card.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return Math.floor(rect.top - elRect.top + el.scrollTop);
  });
}

function snapToNearestCard() {
  const el = briefListRef.value;
  if (!el || el.scrollHeight <= el.clientHeight) {
    return;
  }

  const offsets = getCardOffsets();
  if (offsets.length === 0) {
    return;
  }

  // 最后一个可作首页的卡片索引（保证可见区内卡片完整）
  const visibleCount = 2;
  const maxStartIdx = Math.max(0, offsets.length - visibleCount);
  const maxScroll = offsets[maxStartIdx];

  // 找到离当前 scrollTop 最近的卡片偏移，但不超 maxScroll
  let target = offsets[0];
  let minDiff = Math.abs(el.scrollTop - target);

  for (let i = 1; i <= maxStartIdx; i++) {
    const diff = Math.abs(el.scrollTop - offsets[i]);
    if (diff < minDiff) {
      minDiff = diff;
      target = offsets[i];
    }
  }

  target = Math.min(target, maxScroll);
  el.scrollTo({top: target, behavior: 'smooth'});
}

function startAutoScroll() {
  stopAutoScroll();

  // 1-2 张卡片不需要滚动
  const briefCount = event_list.value.length - 1;
  if (briefCount <= 2) {
    return;
  }

  const visibleCount = 2;

  function tick() {
    const el = briefListRef.value;

    // 布局尚未就绪，500ms 后重试
    if (!el || el.scrollHeight <= el.clientHeight) {
      autoScrollTimer = setTimeout(tick, 500);
      return;
    }

    const offsets = getCardOffsets();
    if (offsets.length <= visibleCount) {
      autoScrollTimer = setTimeout(tick, 500);
      return;
    }

    // 最后一个可作首页的卡片索引
    const maxStartIdx = offsets.length - visibleCount;
    const maxScroll = offsets[maxStartIdx];

    // 当前显示的第 0 张卡片的索引
    let currentIdx = 0;
    let minDiff = Math.abs(el.scrollTop - offsets[0]);
    for (let i = 1; i <= maxStartIdx; i++) {
      const diff = Math.abs(el.scrollTop - offsets[i]);
      if (diff < minDiff) {
        minDiff = diff;
        currentIdx = i;
      }
    }

    const nextIdx = currentIdx + visibleCount;

    if (nextIdx > maxStartIdx) {
      // 下一页不能完整展示 2 张新卡
      if (currentIdx >= maxStartIdx) {
        // 已在最后，回到顶部
        el.scrollTo({top: 0, behavior: 'smooth'});
      } else {
        // 滚到最后可完整展示的位置（最后 2 张卡完整可见）
        el.scrollTo({top: maxScroll, behavior: 'smooth'});
      }
    } else {
      el.scrollTo({top: offsets[nextIdx], behavior: 'smooth'});
    }

    autoScrollTimer = setTimeout(tick, SCROLL_INTERVAL);
  }

  autoScrollTimer = setTimeout(tick, SCROLL_INTERVAL);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    clearTimeout(autoScrollTimer);
    autoScrollTimer = null;
  }
}

function onUserScroll() {
  stopAutoScroll();
  if (resumeTimer) {
    clearTimeout(resumeTimer);
  }
}

function onScrollEnd() {
  if (autoScrollTimer || dialogVisible.value || selectedIdx.value >= 1) {
    return;
  }

  if (resumeTimer) {
    clearTimeout(resumeTimer);
  }

  resumeTimer = setTimeout(() => {
    if (dialogVisible.value) {
      return;
    }

    snapToNearestCard();
    setTimeout(startAutoScroll, 400);
  }, RESUME_DELAY);
}

onMounted(() => {
  try {
    const html = window.parent.document.documentElement;
    isDark.value = html.classList.contains('dark');

    observer = new MutationObserver(() => {
      isDark.value = html.classList.contains('dark');
    });
    observer.observe(html, {attributes: true, attributeFilter: ['class']});
  } catch {
    // 跨域 iframe 无法访问 window.parent.document，忽略
  }

  startAutoScroll();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  stopAutoScroll();
  if (resumeTimer) {
    clearTimeout(resumeTimer);
  }

  if (clickTimer) {
    clearTimeout(clickTimer);
  }

  if (hideTimer) {
    clearTimeout(hideTimer);
  }
});

</script>

<style lang="less" scoped>
@import 'event-card.less';
</style>
