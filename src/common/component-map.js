import {defineAsyncComponent} from 'vue';
const componentMap = {
  TopoView: defineAsyncComponent(() => import('components/topo-view/topo-view.vue')),
  AlarmGrid: defineAsyncComponent(() => import('components/network-alarm/alarm-grid.vue')),
  RiskOverview: defineAsyncComponent(() => import('components/risk-overview/risk-overview.vue')),
  EventCard: defineAsyncComponent(() => import('components/event-card/event-card.vue')),
  KpiMainCard: defineAsyncComponent(() => import('components/kpi/kpi-main-card.vue')),
};

export {componentMap};
