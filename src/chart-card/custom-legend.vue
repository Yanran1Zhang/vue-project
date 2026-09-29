<template>
  <div class="custom-legend">
    <el-checkbox
      :model-value="isAllSelected"
      :indeterminate="isIndeterminate"
      class="legend-item all-item"
      label="ALL"
      @change="handleAllChange"
    >
      ALL Object
    </el-checkbox>
    <div class="legend-list">
      <el-checkbox
        v-for="item in localObjectList"
        :key="item.key"
        :model-value="item.checked"
        class="legend-item"
        :class="{inactive: !item.checked}"
        :disabled="!item.checked && isMaxReached"
        :label="item.key"
        :title="item.label"
        @change="(val) => handleObjectChange(item.key, val)"
      >
        {{ truncateLabel(item.label) }}
      </el-checkbox>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch} from 'vue';
import {ElMessage} from 'element-plus';

const props = defineProps({
  objectList: {
    type: Array,
    required: true,
  },
  selectedNe: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['select-object']);

const localObjectList = ref(props.objectList ? [...props.objectList] : []);

const MAX_CURVES = 160;
const HEAD_LENGTH = 3;
const TAIL_LENGTH = 13;
const ELLIPSIS = '...';

function truncateLabel(str) {
  // 1. 类型判空防御，保证始终返回字符串
  if (typeof str !== 'string' || !str) {
    return '';
  }

  // 2. 使用 Array.from 正确处理 Unicode / Emoji 字符
  const chars = Array.from(str);

  // 3. 计算阈值：只有当缩略后的长度比原字符串短时才进行截断
  const minLengthToTruncate = HEAD_LENGTH + TAIL_LENGTH + ELLIPSIS.length;
  if (chars.length <= minLengthToTruncate) {
    return str;
  }

  // 4. 安全截断并拼接
  return (
    chars.slice(0, HEAD_LENGTH).join('') +
    ELLIPSIS +
    chars.slice(-TAIL_LENGTH).join('')
  );
}

const checkedCount = computed(() => localObjectList.value.filter((i) => i.checked).length);

const selectedNeCount = computed(() => props.selectedNe.length || 1);

const currentCurveCount = computed(() => checkedCount.value * selectedNeCount.value);

const isMaxReached = computed(() => currentCurveCount.value >= MAX_CURVES);

const isAllSelected = computed(() => {
  return localObjectList.value.length > 0 && localObjectList.value.every((i) => i.checked);
});

const isIndeterminate = computed(() => {
  return checkedCount.value > 0 && checkedCount.value < localObjectList.value.length;
});

watch(
  () => props.objectList,
  (newVal) => {
    // 收集旧列表中仍被选中的 key
    const prevCheckedKeys = new Set(
      localObjectList.value.filter((i) => i.checked).map((i) => i.key)
    );
    // 对新列表中同 key 的项恢复选中状态
    localObjectList.value = newVal.map((item) => ({
      ...item,
      checked: prevCheckedKeys.has(item.key) ? true : item.checked,
    }));
  },
  {deep: true}
);

watch(
  () => props.selectedNe,
  () => {
    // 当selectedNe增加导致超出限制时，从后往前取消勾选
    while (currentCurveCount.value > MAX_CURVES && checkedCount.value > 0) {
      const lastChecked = [...localObjectList.value].reverse().find((i) => i.checked);
      if (lastChecked) {
        lastChecked.checked = false;
      } else {
        break;
      }
    }

    emitSelected();
  }
);

function getSelectedObjectList() {
  return localObjectList.value.filter((item) => item.checked).map((item) => item.key);
}

function emitSelected() {
  emit('select-object', {
    selected: getCurrentChecked(),
    selectedObjectList: getSelectedObjectList(),
  });
}

function handleAllChange(checked) {
  if (checked) {
    // 全选：计算能选多少
    const maxAllowed = Math.floor(MAX_CURVES / selectedNeCount.value);
    let selected = 0;
    localObjectList.value.forEach((item) => {
      if (selected < maxAllowed) {
        item.checked = true;
        selected++;
      } else {
        item.checked = false;
      }
    });
    if (localObjectList.value.length > maxAllowed) {
      ElMessage.error(t('dashboard.chart_display_max_num', [MAX_CURVES]));
    }
  } else {
    localObjectList.value.forEach((item) => {
      item.checked = false;
    });
  }

  emit('select-object', {
    name: 'ALL',
    value: checked,
    selected: getCurrentChecked(),
    selectedObjectList: getSelectedObjectList(),
  });
}

function handleObjectChange(key, checked) {
  if (checked && (checkedCount.value + 1) * selectedNeCount.value > MAX_CURVES) {
    ElMessage.error(t('dashboard.chart_display_max_num', [MAX_CURVES]));
    return;
  }

  const item = localObjectList.value.find((i) => i.key === key);
  if (item) {
    item.checked = checked;
  }

  emit('select-object', {
    name: key,
    value: checked,
    selected: getCurrentChecked(),
    selectedObjectList: getSelectedObjectList(),
  });
}

function clearAll() {
  localObjectList.value.forEach((item) => {
    item.checked = false;
  });
}

defineExpose({clearAll, emitSelected});

function getCurrentChecked() {
  const res = {
    ALL: localObjectList.value,
  };
  localObjectList.value.forEach((item) => {
    res[item.key] = item.checked;
  });
  return res;
}
</script>

<style scoped lang="less">
.custom-legend {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 8px;
  right: 20px;
  top: 48px;
  width: 268px;
  height: 414px;
  padding: 10px;
  padding-right: 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  pointer-events: all;
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 25px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  /* 彻底隐藏轨道 */
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0) !important; /* 强制完全透明 */
    border: none !important;                /* 移除边框 */
    box-shadow: none !important;            /* 关键：移除可能存在的内部阴影 */
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.35);
    }
  }
}

.legend-item {
  font-size: 14px;
  color: #ffffff;
  margin-right: 0;
  :deep(.el-checkbox__inner) {
    --el-checkbox-bg-color: transparent;
  }

  :deep(.el-checkbox__label) {
    line-height: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #ffffff;
  }

  &.inactive {
    :deep(.el-checkbox__label) {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}

.all-item {
  font-weight: 700;
}
</style>
