import {cloneDeep, isNil, merge, isEqual} from 'lodash';
import {useDataSource} from '@hw-csnetcareedge/dashboard';
import {configUpsert, deleteComponent} from '@/api';

// echarts图例选项
const defaultLegend = ['7天前', '7days ago', '当前', 'Currently'];

export default class ChartCardHelper {
  constructor(
    componentsOptions,
    componentsOrigin,
    componentsNew,
    editAreaOption,
    indicatorItemMap,
    customIndicatorMap,
    editType
  ) {
    this.store = useDataSource(); // 数据源
    this.componentsOptions = cloneDeep(componentsOptions); // 组件的配置项
    this.componentsOrigin = componentsOrigin; // 原始组件表单内容
    this.componentsNew = componentsNew; // 编辑后组件表单内容
    this.editAreaOption = editAreaOption; // 编辑区域配置
    this.indicatorItemMap = indicatorItemMap;
    this.customIndicatorMap = customIndicatorMap;
    this.editType = editType;
    this.deleteQueue = []; // 删除队列
    this.upsertQueue = []; // 更新队列
    this.pageNo = this.store.getParams('_global', 'pageNo'); // 当前页码'
    this.domain = this.store.getParams('_global', 'domain'); // 当前页码'
    this.kpiSourceName = `chartCard_${this.domain}`; // 数据源名称
    this.kpiSource = this.store.dataSources[this.kpiSourceName] ? cloneDeep(this.store.dataSources[this.kpiSourceName]) : this.#generateDataSource();
    this.customKpiSourceName = `chartCard_${this.domain}_custom`; // 自定义指标数据源名称
    this.customKpiSource = this.store.dataSources[this.customKpiSourceName]
      ? cloneDeep(this.store.dataSources[this.customKpiSourceName])
      : this.#generateCustomDataSource();
    delete this.kpiSource.id;
    delete this.kpiSource.load;
    delete this.kpiSource._pageSet;
    delete this.kpiSource.results;
    delete this.kpiSource.change_time;
    delete this.customKpiSource.id;
    delete this.customKpiSource.load;
    delete this.customKpiSource._pageSet;
    delete this.customKpiSource.results;
    delete this.customKpiSource.change_time;
  }

  process() {
    const componentSize = this.componentsOrigin.length;

    for (let i = 0; i < componentSize; i++) {
      const component = this.componentsOrigin[i];
      const componentOption = this.componentsOptions[i];
      const newComponent = this.componentsNew.find((item) => item.uuid === component.uuid);
      if (isNil(newComponent)) {
        this.#deleteComponent(component, componentOption);
        continue;
      }

      let isComponentUpdate = false;
      const kpiChangeFlag =
        component.indicatorType !== newComponent.indicatorType ||
        component.indicatorName !== newComponent.indicatorName ||
        component.pool !== newComponent.pool ||
        !isEqual(component.ne, newComponent.ne) ||
        component.displayTitle !== newComponent.displayTitle?.trim();
      const sizeChangeFlag =
        component.col !== newComponent.col || component.x !== newComponent.x || component.y !== newComponent.y;

      if (kpiChangeFlag || sizeChangeFlag) {
        // 更新下载服务
        const downloadSourceName = componentOption.option.download.value[0].sourceName;
        this.upsertQueue.push({
          uuid: this.store.dataSources[downloadSourceName]?.uuid,
          configValue: this.#generateComponentDownload(newComponent),
          configName: `download_chartCard_${this.domain}-${newComponent.indicatorType}-${newComponent.indicatorName}-${newComponent.chartId}`,
          configType: 'dataSource',
        });
      }

      if (sizeChangeFlag) {
        this.#resizeComponent(newComponent, componentOption);
        isComponentUpdate = true;
      }

      if (kpiChangeFlag) {
        this.#handleKpiChange(newComponent, component);

        // 更新kpi处理逻辑
        this.#resetComponentKpi(newComponent, componentOption);
        isComponentUpdate = true;
      }

      if (isComponentUpdate) {
        const {uuid} = componentOption;
        delete componentOption.uuid;
        this.upsertQueue.push({uuid, configValue: componentOption, configType: 'component'});
      }
    }

    this.#handleNewComponent();

    if (this.upsertQueue.length > 0 || this.deleteQueue.length > 0) {
      this.upsertQueue.push({
        uuid: this.kpiSource.uuid,
        configValue: this.kpiSource,
        configName: this.kpiSourceName,
        configType: 'dataSource',
      });
      this.upsertQueue.push({
        uuid: this.customKpiSource.uuid,
        configValue: this.customKpiSource,
        configName: this.customKpiSourceName,
        configType: 'dataSource',
      });
    }

    delete this.kpiSource.uuid;
    delete this.customKpiSource.uuid;
  }

  async save() {
    if (this.upsertQueue.length <= 0 && this.deleteQueue.length <= 0) {
      return;
    }

    let templateType = '';
    if (this.editAreaOption.key === 'kpi_only') {
      // 如果是kpi only的编辑区才添加模板
      templateType = this.store.getParams('_global', 'domain_template_map')[this.domain];
    }

    await Promise.allSettled(this.deleteQueue.map(async(uuid) => deleteComponent(uuid)));
    await Promise.allSettled(
      this.upsertQueue.map(async(item) => configUpsert(item.uuid, item.configType, item.configName, item.configValue, templateType))
    );
    sessionStorage.setItem('isConfigChange', 'true');
  }

  #handleKpiChange(newComponent, component) {
    // 获取当前组件在对应数据源中的索引
    const {source, index} = (() => {
      const keyKpiIndex = this.kpiSource.params.kpis.findIndex((item) => item.chart_id === component.chartId);
      if (keyKpiIndex > -1) {
        return {source: this.kpiSource.params.kpis, index: keyKpiIndex};
      }

      const customKpiIndex = this.customKpiSource.params.kpis.findIndex((item) => item.chart_id === component.chartId);
      if (customKpiIndex > -1) {
        return {source: this.customKpiSource.params.kpis, index: customKpiIndex};
      }

      return {source: null, index: -1};
    })();

    // 如果未找到组件数据，直接返回
    if (!source) {
      return;
    }

    const kpiData = {
      domain: this.domain,
      kpi_name: newComponent.indicatorName,
      chart_id: component.chartId,
      ...(newComponent.indicatorType === 'keyKpi'
        ? {pool: newComponent.pool, ne: newComponent.ne}
        : {cid: newComponent.indicatorName}),
    };

    // 指标类型切换
    if (newComponent.indicatorType !== component.indicatorType) {
      // 删除当前数据源中的组件
      source.splice(index, 1);

      // 添加到新的数据源
      const targetSource =
        newComponent.indicatorType === 'keyKpi' ? this.kpiSource.params.kpis : this.customKpiSource.params.kpis;

      targetSource.push(kpiData);
    } else {
      // 更新现有数据
      Object.assign(source[index], kpiData);
    }
  }

  #handleNewComponent() {
    // 新增的组件
    this.componentsNew
      .filter((component) => isNil(component.uuid))
      .forEach((component) => {
        const componentOption = this.#generateComponentOption();
        this.#resizeComponent(component, componentOption);
        this.#resetComponentKpi(component, componentOption);
        const downloadSourceName = componentOption.option.download.value[0].sourceName;
        this.upsertQueue.push({
          configValue: this.#generateComponentDownload(component),
          configName: downloadSourceName,
          configType: 'dataSource',
        });
        this.upsertQueue.push({uuid: component.chartId, configValue: componentOption, configType: 'component'});
        if (component.indicatorType === 'keyKpi') {
          this.kpiSource.params.kpis.push({
            domain: this.domain,
            pool: component.pool,
            kpi_name: component.indicatorName,
            ne: component.ne,
            chart_id: component.chartId,
          });
        } else {
          this.customKpiSource.params.kpis.push({
            domain: this.domain,
            kpi_name: component.indicatorName,
            cid: component.indicatorName,
            chart_id: component.chartId,
          });
        }
      });
  }

  #deleteComponent(component, componentOption) {
    // 删除组件
    this.deleteQueue.push(component.uuid);
    // 删除导出服务
    const downLoadSourceName = componentOption?.option?.download?.value?.[0]?.sourceName;

    if (downLoadSourceName && this.store.dataSources?.[downLoadSourceName]?.uuid) {
      this.deleteQueue.push(this.store.dataSources[downLoadSourceName].uuid);
    }

    // 数据源中移除这项kpi
    if (component.indicatorType === 'keyKpi') {
      const index = this.kpiSource.params.kpis.findIndex((item) => item.chart_id === component.chartId);
      if (index > -1) {
        this.kpiSource.params.kpis.splice(index, 1);
      }
    } else {
      const index = this.customKpiSource.params.kpis.findIndex((item) => item.chart_id === component.chartId);
      if (index > -1) {
        this.customKpiSource.params.kpis.splice(index, 1);
      }
    }
  }

  #resizeComponent(component, componentOption) {
    const areaLeft = Number.parseFloat(this.editAreaOption.style.left); // 区域左边距
    const areaTop = Number.parseFloat(this.editAreaOption.style.top); // 区域上边距
    const areaWidth = Number.parseFloat(this.editAreaOption.style.width); // 区域宽度
    const areaHeight = Number.parseFloat(this.editAreaOption.style.height); // 区域高度
    const {col, row} = this.editAreaOption; // 区域行列数
    const componentMargin = this.editAreaOption.components.margin || 0;

    const colWidth = (areaWidth - ((col - 1) * componentMargin)) / col; // 列宽
    const rowHeight = (areaHeight - ((row - 1) * componentMargin)) / row; // 行高

    const componentLeft = areaLeft + (component.x * (colWidth + componentMargin)); // 组件左边距
    const componentTop = areaTop + (component.y * (rowHeight + componentMargin)); // 组件上边距
    const componentWidth = (component.col * colWidth) + ((component.col - 1) * componentMargin); // 组件宽度
    const componentHeight = (component.row * rowHeight) + ((component.row - 1) * componentMargin); // 组件高度

    componentOption.style.left = `${componentLeft}px`;
    componentOption.style.top = `${componentTop}px`;
    componentOption.style.width = `${componentWidth}px`;
    componentOption.style.height = `${componentHeight}px`;

    const editAreaOption = {col: component.col, row: component.row, order: component.order, x: component.x, y: component.y};
    merge(componentOption.editArea, editAreaOption);

    const clickEventDurationPerSize = 6 * 60 * 60 * 1000;
    // 移除旧组件以数据周期为5固定计算的数据点数配置
    delete componentOption.autoSeriesConfig;
    merge(componentOption, {
      option: {
        clickEvent: {value: {name: 'clickNetworkType', value: {duration: component.col * clickEventDurationPerSize}}},
        chartOptionParams: {
          value: {
            col: component.col,
          },
        },
      },
    });
  }

  #resetComponentKpi(component, componentOption) {
    const {domain} = this; // 域
    const {indicatorType} = component; // 指标类型
    const isKeyKpi = indicatorType === 'keyKpi';
    const {indicatorName} = component; // 指标名称值
    const {pool} = component; // 指标池
    const {ne} = component; // 网元
    const {chartId} = component; // ID
    const {displayTitle} = component; // 展示名称
    const {isShowLegend} = component; // 是否展示图例

    const indicatorItem = isKeyKpi ? this.indicatorItemMap[indicatorName] : this.customIndicatorMap[indicatorName];
    const networkType = indicatorItem.networkType || '';
    const {unit} = indicatorItem;

    const updateOption = {
      option: {
        title: {value: [indicatorItem.label, `(${unit})`]},
        formatterTooltipKey: {value: 'kpiLine'},
        download: {
          // 下载服务
          value: [
            {
              method: 'exportFile',
              sourceName: `download_chartCard_${domain}-${indicatorType}-${indicatorName}-${chartId}`,
            },
          ],
        },
        extInfo: {
          value: {
            indicatorType,
            indicatorName,
            pool,
            networkType,
            domain,
            displayTitle: displayTitle?.trim(),
            ne,
            chartId,
          },
        },
        clickEvent: {
          value: {
            name: 'clickNetworkType',
            value: {
              indicatorType: {type: 'props', value: 'extInfo.indicatorType'},
              indicatorName: {type: 'props', value: 'extInfo.indicatorName'},
              pool: {type: 'props', value: 'extInfo.pool'},
            },
          },
        },
        isShowLegend: {value: true},
      },
    };
    // 图例
    updateOption.option.chartOptionParams = {
      value: {
        defaultLegend,
        col: component.col,
        style: componentOption.style,
        unit,
      },
    };

    // 从关键指标改为自定义指标时，merge会导致标题保留资源池
    componentOption.option.title.value = [];
    if (this.editType === 'pool' && isKeyKpi) {
      updateOption.option.title.value.push(`-${pool}`);
    } else if (this.editType === 'ne' && isKeyKpi) {
      // merge方法会让数组合并，所以先把旧值清空
      componentOption.option.extInfo.value.ne = [];
      componentOption.option.chartOptionParams = {value: {}};
    } else {
      // do nothing
    }

    // 设置放大图表配置
    componentOption.option.enlargeCardOption = {value: {}};
    if (this.editType === 'pool') {
      updateOption.option.enlargeCardOption = {
        value: {
          modal: false,
          closeOnClickModal: false,
          isAdaptHeight: false,
          globalCloseControl: true,
          maxSeriesEndLabel: 39,
          enlargeCardStyle: {
            height: '576px',
            width: '1260px',
          },
          dialogStyle: {
            position: 'absolute',
            left: '12px',
            top: '238px',
          },
        },
      };
    }

    // 替换更新后配置项
    merge(componentOption, updateOption);
  }

  #generateComponentDownload(component) {
    const {domain} = this; // 域
    const {indicatorType} = component; // 指标类型
    const {indicatorName} = component; // 指标名称值
    const duration = component.col * 6 * 60 * 60 * 1000; // 卡片导出：列宽 * 6小时

    let exportName = '';
    if (indicatorType === 'customKpi') {
      exportName = 'dashboard_custom_network_kpi_export';
    } else {
      const keyKpiExportMap = {
        pool: 'dashboard_network_kpi_export',
        ne: 'dashboard_network_convergent_kpi_export',
      };
      exportName = keyKpiExportMap[this.editType];
    }

    return {
      params: {
        templates: [`EdgeCoreNetMaintenanceService/dashboard/${exportName}`],
        parameters: {
          domain,
          kpi_type: indicatorType,
          kpi_name: indicatorName,
          [this.editType]: component[this.editType],
          duration,
          cid: component.indicatorType === 'keyKpi' ? null : indicatorName,
        },
      },
    };
  }

  #generateComponentOption() {
    return {
      option: {
        title: {value: ''},
        formatterTooltipKey: {value: 'kpiLine'},
        extInfo: {value: {}},
      },
      name: 'ChartCard',
      pages: [this.pageNo],
      style: {background: '#1B2839'},
      editArea: {
        uuid: this.editAreaOption.uuid,
      },
    };
  }

  #generateDataSource() {
    const urlMap = {
      pool: 'EdgeCoreNetMaintenanceService/dashboard/dashboard_network_kpi_line_get',
      ne: 'EdgeCoreNetMaintenanceService/dashboard/dashboard_network_kpi_line_get_by_ne',
    };
    return {
      url: `/adc-service/web/rest/v1/services/${urlMap[this.editType]}`,
      interval: 60000,
      params: {
        kpis: [],
      },
    };
  }

  #generateCustomDataSource() {
    return {
      url: '/adc-service/web/rest/v1/services/EdgeCoreNetMaintenanceService/dashboard/dashboard_custom_network_kpi_line_get',
      interval: 60000,
      params: {
        kpis: [],
      },
    };
  }
}
