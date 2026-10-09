import {defineAsyncComponent} from 'vue';

const componentEditMap = {
  KpiEdit: defineAsyncComponent(() => import('components/kpi/kpi-edit.vue')),
};

export {componentEditMap};
