# 大屏配置化数据流说明（screenConfig 服务端驱动渲染）

> 大屏由服务端下发的 `screenConfig` 配置驱动渲染，页面结构与组件参数由配置页在线维护并持久化到服务端，运行时下发即生效，布局与内容调整无需改动前端代码。

## 一、整体架构

```
                    ┌─────────────────────────────────┐
                    │       配置维护端 cne-expert-mgr    │
                    │  ┌───────────────────────────┐  │
                    │  │ 配置页编辑器                 │  │
                    │  │ 拖拽布局/深浅主题/阈值/时间参数 │  │
                    │  └────────────┬──────────────┘  │
                    └───────────────┼─────────────────┘
                                    │ 保存持久化
                                    ▼
                    ┌─────────────────────────────────┐
                    │  服务端存储                       │
                    │  screen_config / threshold /     │
                    │  edit_config                     │
                    └────────────────┬────────────────┘
                                     │ config 下发
                                     ▼
                    ┌─────────────────────────────────┐
                    │  渲染端 cne-expert-dashboard      │
                    │                                  │
                    │  api/screen-config.js             │
                    │   getScreenConfig() ──────────┐   │
                    │                              │   │
                    │  dashboard-home.vue           │   │
                    │   init/透传                   │   │
                    │   removeDeferredDataSources() │   │
                    │   (剔除延迟数据源)             │   │
                    │              │               │   │
                    │              ▼               │   │
                    │  edge-dashboard 渲染引擎       │   │
                    │   深拷贝+字段兜底              │   │
                    │   ┌──────────┴──────────┐    │   │
                    │   ▼                     ▼    │   │
                    │  dataSourceStore      component-map  │
                    │  注册+轮询            defineAsyncComponent│
                    │   │                  │异步注册      │   │
                    │   │                  ▼            │   │
                    │   │      ┌────────────────────┐   │   │
                    │   │      │ RiskOverview       │   │   │
                    │   │      │ EventCard          │   │   │
                    │   │      │ TopoView           │   │   │
                    │   │      │ AlarmGrid          │   │   │
                    │   │      │ KpiMainCard        │   │   │
                    │   │      │  (手动管理延迟数据源) │   │   │
                    │   │      └────────────────────┘   │   │
                    │   │            ▲ 响应式绑定         │   │
                    │   └────────────┘ results          │   │
                    │   ▲ KPI手动load(参数就绪后)          │   │
                    │   └── getNeTypeData/getCardValues  │   │
                    └─────────────────────────────────┘
```

## 二、数据流时序

```
┌────────┐  ①配置维护  ┌──────────┐  ②拉配置  ┌───────────────────┐
│ 配置页   │──────────▶│  服务端    │◀─────────│ dashboard-home.vue │
│ (mgr)  │  保存持久化  │   (Java)  │  POST    └─────────┬─────────┘
└────────┘           └────┬─────┘            getScreenConfig()
                          │                     │
                          │  返回{config:       │ config为空/接口失败?
                          │   {dataSources,     ├──是──▶ screenConfig={} 空配置降级
                          │    page}}           │        （引擎isEmpty→跳过初始化，不白屏）
                          ▼                     │ 否
              ┌──────────────────┐              ▼
              │ screenConfig      │◀─ removeDeferredDataSources()
              │ (服务端下发)        │    剔除 getNeTypeData/getCardValues
              └──────────────────┘
                          │ 透传 :screen-config
                          ▼
              ┌────────────────────────────┐
              │ edge-dashboard 渲染引擎       │
              │  watch: 深拷贝 + page={}    │
              │  + components=[] 兜底       │
              └──────┬──────────────┬──────┘
                     │ ③a 注册数据源   │ ③b 遍历 components
                     ▼               ▼
              ┌──────────────┐  ┌───────────────────┐
              │ dataSource    │  │ component-map     │
              │ Store         │  │ defineAsyncComponent│
              │ interval>0轮询 │  └─────────┬─────────┘
              └──────┬───────┘            │ 异步注册
                     │ load() 请求后端      ▼
                     ▼               ┌─────────────────────┐
              ┌────────────┐        │ 组件实例化+渲染         │
              │ 后端接口      │        │ option.sourceName    │
              └─────┬──────┘        │ 响应式绑定数据源结果     │
                    │ results        └─────────────────────┘
                    ▼
              ┌─────────────────────────────┐
              │ KPI特殊路径(分支③c):          │
              │ kpi-main-card 参数就绪后      │
              │ 手动load getNeTypeData/      │
              │ getCardValues(空参请求避免)   │
              └─────────────────────────────┘

  ④配置变更热更新(跨标签):
  ┌────────┐  保存   ┌──────────┐  onConfigUpdate  ┌─────────────────────┐
  │ 配置页   │──────▶│  服务端    │──────通知────────▶│ reloadScreenConfig() │
  └────────┘        └──────────┘                   │ cloneDeep清空组件    │
                                                   │ →nextTick恢复→重挂载  │
                                                   │ →重新load KPI阈值配置  │
                                                   └─────────────────────┘
```

## 三、关键分支点

| # | 分支 | 处理 | 对应代码 |
|---|---|---|---|
| 1 | **config 为空/接口失败** | 空对象降级，引擎 `isEmpty` 跳过初始化，不白屏 | `dashboard-home.vue:73-76` |
| 2 | **延迟数据源剔除** | `getNeTypeData`/`getCardValues` 从配置删除，防空参请求 | `dashboard-home.vue:46-64` |
| 3 | **KPI 组件手动加载** | 参数就绪后 `kpi-main-card` 自己 `load`，不走引擎轮询 | `kpi-main-card.vue` `paramsInjected` |
| 4 | **配置变更热更新** | 跨标签通知 → `cloneDeep` 清空重挂载 → 重新 load | `dashboard-home.vue:100-117` |

```
正常主链:  配置页→存库→getScreenConfig→剔除延迟源→透传引擎→注册数据源+渲染组件→数据响应式绑定

分支①空配置:  接口失败/空响应 → screenConfig={} → 引擎isEmpty跳过初始化 → 不白屏
分支②延迟源:  getNeTypeData/getCardValues 从配置删除 → 避免引擎用空参数发无效请求
分支③KPI手动: 参数就绪后 kpi-main-card 自行load → 引擎轮询只覆盖非KPI数据源
分支④热更新:  配置页保存 → 跨标签onConfigUpdate → reloadScreenConfig清空重挂载 → 重拉KPI阈值
```

## 四、简化版（一图讲完）

```
 配置页(mgr)                   服务端                   渲染端(dashboard)
     │                            │                            │
     │  ①保存配置(布局/主题/阈值)      │                            │
     ├───────────────────────────▶│                            │
     │                            │  ②getScreenConfig 下发      │
     │                            ├───────────────────────────▶│
     │                            │                            │ ③剔除延迟数据源
     │                            │                            ├─ getNeTypeData
     │                            │                            ├─ getCardValues
     │                            │                            │ ④透传渲染引擎
     │                            │                            ├─ 注册数据源轮询
     │                            │                            ├─ 异步渲染组件
     │                            │                            └─ 响应式绑定数据
     │                            │                            │
     │                            │◀── ⑤数据源load(带参数) ─────┤
     │                            │                            │
     │  ⑥配置变更                 │  ⑦onConfigUpdate 热更新     │
     ├───────────────────────────▶│───────────────────────────▶│ 重挂载+重拉数据
     │                            │                            │
```

## 五、screenConfig 核心字段速查

| 字段 | 类型 | 作用 |
|---|---|---|
| `dataSources` | `Object` | 数据源注册表，每项含 `url`/`params`/`interval`，`interval>0` 自动轮询 |
| `page.screenSize` | `Object` | 缩放策略 `zoom`/`fullScreenZoom`（`none`/`cover`/`fit-width` 等） |
| `page.components` | `Array` | 渲染组件清单，每项含 `name`/`key`/`pages`/`style`/`option` |
| `component.option` | `Object` | 数据绑定，字段值为 `{sourceName}` 指向数据源 key，响应式 |
| `page.editAreas` | `Array` | 编辑态区域（mgr 配置端用，渲染端忽略） |
