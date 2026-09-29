<template>
  <el-tooltip
    :disabled="tooltipShow"
    effect="light"
    placement="top"
  >
    <template #default>
      <span
        class="overflow-tooltip-content"
        @mouseenter="visibilityChange($event)"
      >
        <slot name="default" />
      </span>
    </template>
    <template #content>
      <slot name="default" />
    </template>
  </el-tooltip>
</template>

<script setup>
import {ref} from 'vue';

const tooltipShow = ref(false);

// 鼠标悬浮可见
function visibilityChange(event) {
  const ev = event.target;
  const evWeight = ev.scrollWidth;
  const contentWeight = ev.clientWidth;
  tooltipShow.value = evWeight <= contentWeight;
}
</script>

<style scoped>
.overflow-tooltip-content {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
