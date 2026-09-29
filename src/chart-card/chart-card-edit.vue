<template>
  <edge-gradient-container
    ref="editDialog"
    style="backdrop-filter: blur(10px);"
  >
    <div class="edit-container">
      <div
        ref="editTitle"
        class="edit-container-title"
      >
        {{ $t('_dashboard.EditComponent') }}
      </div>

      <div class="edit-toolbar">
        <el-button
          :disabled="firstLoad || validateFail || !addable"
          style="margin-left: auto;"
          type="primary"
          @click="addComponent"
        >
          <span class="icon-add" />
          <span>{{ $t('vigour.editgrid.add') }}</span>
        </el-button>
      </div>

      <!--  表头  -->
      <div class="edit-component-table edit-component-table-header">
        <div class="edit-component-table-item edit-component-table-header-item">
          {{ $t('vigour.datagrid.firstColumn.number') }}
        </div>
        <div class="edit-component-table-item edit-component-table-header-item required">
          {{ $t('dashboard.kpiType') }}
        </div>
        <div class="edit-component-table-item edit-component-table-header-item required">
          {{ $t('dashboard.kpi_name') }}
        </div>
        <div
          v-if="isPoolEdit"
          class="edit-component-table-item edit-component-table-header-item required"
        >
          {{ $t('_dashboard.Pool') }}
        </div>
        <div
          v-if="isNeEdit"
          class="edit-component-table-item edit-component-table-header-item required"
        >
          {{ $t('_dashboard.Ne') }}
        </div>
        <div class="edit-component-table-item edit-component-table-header-item">
          {{ $t('_dashboard.DisplayTitle') }}
        </div>
        <div class="edit-component-table-item edit-component-table-header-item required">
          {{ $t('_dashboard.Width') }}
        </div>
        <div class="edit-component-table-item edit-component-table-header-item">
          {{ $t('commonMessage.operateColumn') }}
        </div>
      </div>

      <!--  表格内容  -->
      <div class="edit-component-table-content">
        <template
          v-for="(component, index) in componentsNew"
          :key="index"
        >
          <el-form
            ref="formRefs"
            :model="component"
            :rules="rules"
            label-position="top"
          >
            <div class="edit-component-table">
              <div class="edit-component-table-item edit-component-table-content-item">
                {{ index + 1 }}
              </div>
              <div class="edit-component-table-item edit-component-table-content-item">
                <el-form-item
                  class="edge-form-item-error-tips-popper"
                  prop="indicatorType"
                >
                  <el-select
                    v-model="component.indicatorType"
                    :disabled="isBanned(index)"
                    :placeholder="$t('commonMessage.pleaseSelect')"
                    class="edge-select"
                    fit-input-width
                    popper-class="edge-select-popper"
                    filterable
                  >
                    <el-option
                      :label="$t('dashboard.presetKpi')"
                      value="keyKpi"
                    />
                    <el-option
                      :label="$t('dashboard.kpi')"
                      value="customKpi"
                    />
                  </el-select>
                </el-form-item>
              </div>
              <div class="edit-component-table-item edit-component-table-content-item">
                <el-form-item
                  class="edge-form-item-error-tips-popper"
                  prop="indicatorName"
                >
                  <el-select
                    v-if="component.indicatorType === 'keyKpi'"
                    v-model="component.indicatorName"
                    :disabled="isBanned(index)"
                    :placeholder="$t('commonMessage.pleaseSelect')"
                    class="edge-select"
                    fit-input-width
                    popper-class="edge-select-popper"
                    filterable
                  >
                    <el-option
                      v-for="item in component?._options?.indicatorName || []"
                      :key="item.label"
                      :label="item.label"
                      :value="item.value"
                    >
                      <span :title="item.label">{{ item.label }}</span>
                    </el-option>
                  </el-select>
                  <el-select
                    v-else
                    v-model="component.indicatorName"
                    :disabled="isBanned(index)"
                    :placeholder="$t('commonMessage.pleaseSelect')"
                    class="edge-select"
                    fit-input-width
                    popper-class="edge-select-popper"
                    filterable
                    :loading="customKpiOptionLoading"
                    :filter-method="(query)=>handleCustomKpiFilter(query,component)"
                  >
                    <el-option
                      v-for="item in component?._options?.customIndicator || [{value:27,label:'asd'}]"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    >
                      <span :title="item.label">{{ item.label }}</span>
                    </el-option>
                  </el-select>
                </el-form-item>
              </div>
              <div
                v-if="isPoolEdit && component.indicatorType === 'keyKpi'"
                class="edit-component-table-item edit-component-table-content-item"
              >
                <el-form-item
                  class="edge-form-item-error-tips-popper"
                  prop="pool"
                >
                  <el-select
                    v-model="component.pool"
                    :disabled="isBanned(index)"
                    :placeholder="$t('commonMessage.pleaseSelect')"
                    class="edge-select"
                    fit-input-width
                    popper-class="edge-select-popper"
                  >
                    <el-option
                      v-for="item in component?._options?.pool || []"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </div>
              <div
                v-if="isNeEdit && component.indicatorType === 'keyKpi'"
                class="edit-component-table-item edit-component-table-content-item"
              >
                <el-form-item
                  class="edge-form-item-error-tips-popper"
                  prop="ne"
                >
                  <el-select
                    v-model="component.ne"
                    :disabled="isBanned(index)"
                    :placeholder="$t('commonMessage.pleaseSelect')"
                    class="edge-select"
                    fit-input-width
                    popper-class="edge-select-popper"
                    filterable
                    :filter-method="(query)=>getNeOptions(component,query)"
                    :loading="neOptionsLoading"
                    multiple
                    :multiple-limit="neMultipleLimit"
                    collapse-tags
                    collapse-tags-tooltip
                    @change="(value)=>changeNeOption(index,value)"
                  >
                    <el-option
                      v-for="item in neOptions"
                      :key="item"
                      :label="item"
                      :value="item"
                    />
                  </el-select>
                </el-form-item>
              </div>
              <!-- 用于规避表单对pool或ne的校验 -->
              <div
                v-if="component.indicatorType === 'customKpi'"
                class="edit-component-table-item edit-component-table-content-item"
              >
                <el-select
                  disabled
                  placeholder
                  class="edge-select"
                />
              </div>
              <div class="edit-component-table-item edit-component-table-content-item">
                <el-form-item
                  class="edge-form-item-error-tips-popper"
                  prop="displayTitle"
                >
                  <el-input
                    v-model="component.displayTitle"
                    :placeholder="$t('commonMessage.pleaseInput')"
                    class="edge-input"
                    :disabled="isBanned(index)"
                  />
                </el-form-item>
              </div>
              <div class="edit-component-table-item edit-component-table-content-item">
                <el-form-item
                  class="edge-form-item-error-tips-popper"
                  prop="col"
                >
                  <el-select
                    v-model="component.col"
                    :disabled="isBanned(index)"
                    :placeholder="$t('commonMessage.pleaseSelect')"
                    class="edge-select"
                    fit-input-width
                    popper-class="edge-select-popper"
                  >
                    <el-option
                      v-for="item in component?._options?.row || []"
                      :key="item.value"
                      :label="item.value"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </div>
              <div class="edit-component-table-item edit-component-table-content-item">
                <img
                  v-if="index !== 0"
                  :disabled="isBanned(index)"
                  :class="{'is-banned': isBanned(index)}"
                  alt
                  class="operation"
                  src="@/assets/imgs/move-up.png"
                  @click="moveUp(index)"
                >
                <img
                  v-if="index !== componentsNew.length - 1"
                  :disabled="isBanned(index)"
                  :class="{'is-banned': isBanned(index)}"
                  alt
                  class="operation"
                  src="@/assets/imgs/move-down.png"
                  @click="moveDown(index)"
                >
                <img
                  :disabled="isBanned(index)"
                  :class="{'is-banned': isBanned(index)}"
                  alt
                  class="operation"
                  src="@/assets/imgs/delete.png"
                  @click="deleteComponent(index)"
                >
              </div>
            </div>
          </el-form>

          <div class="divide-line" />
        </template>
      </div>

      <div class="edit-footer">
        <el-button
          class="cancel-btn"
          @click="closeDialog"
        >
          {{ $t('vigour.personSelect.cancel') }}
        </el-button>
        <el-button
          :disabled="validateFail"
          style="width: 96px;"
          type="primary"
          @click="saveComponents"
        >
          {{ $t('vigour.personSelect.save') }}
        </el-button>
      </div>
    </div>
  </edge-gradient-container>
</template>

<script setup>
import {computed, inject, onMounted, provide, ref, watch} from 'vue';
import {cloneDeep, debounce, isEqual, isEmpty} from 'lodash';
import * as api from '@/api';
import {TwoDBoxPacker} from '@hw-csnetcareedge/dashboard';
import {useDataSource} from '@hw-csnetcareedge/dashboard';
import ChartCardHelper from './chart-card-edit';
import {ElMessageBox} from 'element-plus';
import {getSpecialCharRule, getInputLengthRule, getRequireRule} from '@/utils/formRule';
import {useDraggable} from '@/utils/useDraggable';

const props = defineProps({
  // 编辑类型：pool, ne
  editType: {
    type: String,
    default: 'pool',
  },
  // 是否显示曲线图图例
  isShowLegend: {
    type: Boolean,
    default: true,
  },
  // 线条末尾标签显示最大数量，值小于0则不做限制
  maxSeriesEndLabel: {
    type: Number,
    default: -1,
  },
  // 页面中所有的组件
  components: {type: Array, default: () => []},
  // 编辑区域的配置
  editOptions: {type: Object, default: () => ({})},
});

// 弹窗拖拽
const editDialog = ref();
const editTitle = ref();
useDraggable(editDialog, editTitle, {parentSelector: '.el-dialog'});

const closeDialog = inject('closeDialog');
// 数据源持久化
const store = useDataSource();
const domain = store.getParams('_global', 'domain');

const formRefs = ref([]); // 表单引用
const validateFail = ref(false); // 表单校验存在失败
const validateFailIndex = ref(undefined); // 校验失败的索引
const addable = ref(true); // 是否能新增组件
const isPoolEdit = computed(() => props.editType === 'pool');
const isNeEdit = computed(() => props.editType === 'ne');

const rules = ref({
  indicatorName: [getRequireRule()],
  pool: [getRequireRule()],
  ne: [getRequireRule()],
  displayTitle: [getSpecialCharRule('<>"\\\\'), getInputLengthRule(100)],
  col: [getRequireRule()],
});

const customIndicatorMap = ref({}); // 自定义指标id映射指标内容
const indicatorItemMap = ref({}); // 指标名称值映射指标内容
const indicatorNameMap = ref({}); // 指标名称值映射国际化字段
const componentsSelected = []; // 当前编辑区域选中的组件
const componentsOrigin = []; // 原始组件(用于比对编辑后的组件并进行保存)
const componentsNew = ref([]); // 展示组件(页面上动态编辑)
const componentsOld = ref([]); // 编辑组件(页面上动态编辑，修改前)

// 服务请求回来的kpi选项
const kpiOptions = [];
// 记录指标名和资源池的组合
let combOfIndicatorNameAndPool = [];
// 记录非当前编辑区域的自定义指标的id
const customIndicatorId = [];

const firstLoad = ref(true); // 第一次加载
const isDirectionMove = ref(false); // 是否为方向移动
// 二维装箱器
const twoDBoxPacker = new TwoDBoxPacker(props.editOptions.row ?? 4, props.editOptions.col ?? 2, []);
// 组件最大宽度
const componentMaxCol = props.editOptions?.components?.maxCol ?? 1;

// 多选网元
const neOptions = ref([]);
const neOptionsLoading = ref(false);
const neMultipleLimit = ref(20);

// 自定义指标下拉选择
const customKpiOptionLoading = ref(false);
onMounted(async() => {
  initComponentsOption();
  // 动态更新展示的组件配置
  componentsOld.value = cloneDeep(componentsOrigin);
  componentsNew.value = cloneDeep(componentsOrigin);

  const initFuncList = [setKpiOptions, () => setCustomKpiOption(componentsNew.value)];
  await Promise.allSettled(initFuncList.map((func) => func()));
  watchComponentOptions();

  if (props.editType === 'ne') {
    neMultipleLimit.value = Number((await api.getAppParam('chart_select_ne_max')).result);
  }
});

/**
 * 初始化组件配置
 *  1.提取当前编辑区域的组件配置
 *  2.根据编辑区域的组件配置顺序
 *  3.将原始组件配置保存，用于后续对比保存
 *  @returns {void}
 */
function initComponentsOption() {
  for (let i = 0; i < props?.components?.length || 0; i++) {
    const each = props.components[i];
    if (each?.editArea?.uuid === props.editOptions?.uuid) {
      const eachClone = cloneDeep(each);
      Object.keys(eachClone)
        .filter((key) => key.startsWith('_'))
        .forEach((key) => delete eachClone[key]);
      delete eachClone.id;
      delete eachClone.change_time;
      componentsSelected.push(eachClone);
    }
  }

  componentsSelected.sort((a, b) => a?.editArea?.order - b?.editArea?.order);
  // 将原始组件配置保存，用于后续对比保存
  componentsSelected.forEach((component) => {
    componentsOrigin.push({
      uuid: component?.uuid,
      indicatorType: component?.option?.extInfo?.value?.indicatorType || 'keyKpi',
      indicatorName: component?.option?.extInfo?.value?.indicatorName,
      pool: component?.option?.extInfo?.value?.pool,
      ne: component?.option?.extInfo?.value?.ne,
      col: component?.editArea?.col,
      displayTitle: component?.option?.extInfo?.value?.displayTitle,
      row: 1,
      order: component?.editArea?.order,
      x: component?.editArea?.x,
      y: component?.editArea?.y,
      chartId: component?.option?.extInfo?.value?.chartId,
    });
  });
}

async function setKpiOptions() {
  // 从服务器中获取所有选项
  kpiOptions.push(...(await api.getKpiOptions(domain, true)));

  // 获取所有非当前编辑区域的折线图组件
  const otherComponents = props.components
    .filter((component) => {
      return (
        component.name === 'ChartCard' &&
        component.pages.includes(store.getParams('_global', 'pageNo')) &&
        component?.editArea?.uuid !== props.editOptions?.uuid
      );
    })
    .map((component) => ({
      indicatorType: component.option?.extInfo?.value?.indicatorType,
      indicatorName: component.option?.extInfo?.value?.indicatorName,
      pool: component.option?.extInfo?.value?.pool,
    }));
  // 剔除非当前编辑区域的折线图组件已有的kpi组合
  otherComponents.forEach((component) => {
    const index = kpiOptions.findIndex((item) => item.name === component.indicatorName && item.pool === component.pool);
    if (index !== -1) {
      kpiOptions.splice(index, 1);
    }

    // 记录其他编辑区域的自定义指标
    if (component.indicatorType === 'customKpi') {
      customIndicatorId.push(component.indicatorName);
    }
  });

  kpiOptions.forEach((item) => {
    indicatorItemMap.value[item.name] = item;
    indicatorNameMap.value[item.name] = item.label_full;
    combOfIndicatorNameAndPool.push({indicatorName: item.name, pool: item.pool});
  });
}

/**
 * 重新计算组合
 * @param {Array} components 新组件内容
 * @param {Array} comb 组合
 * @returns {void}
 */
function reCalcCombOptions(components, comb) {
  const combClone = cloneDeep(comb);
  // 移除已存在的组合
  components.forEach((component) => {
    const index = combClone.findIndex(
      (item) => item.indicatorName === component.indicatorName && item.pool === component.pool
    );
    if (index !== -1) {
      combClone.splice(index, 1);
    }
  });
  for (let i = 0; i < components.length; i++) {
    const newComponent = components[i];
    if (newComponent.indicatorType === 'customKpi') {
      continue;
    }

    if (newComponent.indicatorName && newComponent.pool) {
      combClone.push({indicatorName: newComponent.indicatorName, pool: newComponent.pool});
    }

    newComponent._options = newComponent._options || {};
    // 遍历组合获取指标名的可选项
    newComponent._options.indicatorName = Array.from(new Set(combClone.map((item) => item.indicatorName)))
      .map((item) => ({
        label: t(indicatorNameMap.value[item] || ''),
        value: item,
      }))
      .sort((item1, item2) => item1.value.localeCompare(item2.value));
    // 资源池去重排序
    newComponent._options.pool = Array.from(
      new Set(
        combClone
          .filter((item) => item.indicatorName === newComponent.indicatorName)
          .map((item) => ({
            label: item.pool,
            value: item.pool,
          }))
      )
    ).sort((item1, item2) => {
      if (item1.value === 'ALL' && item2.value !== 'ALL') {
        return -1;
      }

      if (item1.value !== 'ALL' && item2.value === 'ALL') {
        return 1;
      }

      return item1.value.localeCompare(item2.value);
    });
    if (newComponent.indicatorName && newComponent.pool) {
      combClone.pop();
    }
  }
}

/**
 * 重新计算尺寸
 * @param {Array} components 新组件内容
 * @returns {void}
 */
function resetSizeOptions(components) {
  const componentSize = components.map((component) => ({row: 1, col: component.col}));
  const newValClone = cloneDeep(componentSize);
  if (twoDBoxPacker.setItems(componentSize)) {
    const placementDetails = twoDBoxPacker.getPlacementDetails();
    components.forEach((component, index) => Object.assign(component, placementDetails[index]));
  }

  addable.value = twoDBoxPacker.canItemFit({
    col: props.editOptions.components.minCol || 1,
    row: props.editOptions.components.minCol || 1,
  });

  components.forEach((component, index) => {
    component._options = component._options || {};
    component._options.row = [];
    const componentCol = component.col;
    for (let i = 1; i <= componentMaxCol; i++) {
      if (componentCol === i) {
        component._options.row.push({value: i});
        continue;
      }

      newValClone[index].col = i;
      if (twoDBoxPacker.setItems(newValClone)) {
        component._options.row.push({value: i});
      }
    }

    newValClone[index].col = componentCol;
  });
}

/**
 * 重新设置组件选项
 * @param {Object} components 组件内容
 * @returns {void}
 */
function resetComponentOptions(components) {
  componentsOld.value = cloneDeep(components);
  componentsNew.value = cloneDeep(components);
  setTimeout(() => {
    validateFail.value = false;
    validateFailIndex.value = undefined;
    formRefs.value.forEach((item, index) =>
      item.validate((success) => {
        if (success) {
          return;
        }

        validateFail.value = true;
        validateFailIndex.value = index;
      })
    );
  });
}

/**
 * 第一次加载处理
 * @param {Array} oldValueClone 旧组件内容
 * @param {Array} newValueClone 新组件内容
 * @returns {void}
 */
function firstLoadProcess(oldValueClone, newValueClone) {
  firstLoad.value = false;
  oldValueClone.forEach((item) => {
    if (item.indicatorType === 'keyKpi') {
      combOfIndicatorNameAndPool.push({indicatorName: item.indicatorName, pool: item.pool});
    }
  });

  // 组合去重
  combOfIndicatorNameAndPool = combOfIndicatorNameAndPool.filter(
    (value, index, self) =>
      index === self.findIndex((temp) => temp.indicatorName === value.indicatorName && temp.pool === value.pool)
  );

  // 重新计算尺寸
  resetSizeOptions(newValueClone);
  // 重新计算组合
  reCalcCombOptions(newValueClone, combOfIndicatorNameAndPool);
  resetComponentOptions(newValueClone);
}

function watchComponentOptions() {
  watch(
    () => componentsNew.value,
    (newVal) => {
      const oldValueClone = cloneDeep(componentsOld.value);
      const newValueClone = cloneDeep(newVal);
      // // 组件值没变化直接退出监听(组件第一次加载除外)
      if (!firstLoad.value && isEqual(oldValueClone, newValueClone)) {
        return;
      }

      // 第一次加载把指标值和资源池的组合放入组件的_options中
      if (firstLoad.value) {
        firstLoadProcess(oldValueClone, newValueClone);
        return;
      }

      // 1.组件上下移动位置，不需要重新计算组合可选项
      if (isDirectionMove.value) {
        isDirectionMove.value = false;
        // 重新计算尺寸
        resetSizeOptions(newValueClone);
        resetComponentOptions(newValueClone);
        return;
      }

      // 2.组件新增，当前折叠面板的名字切换为最新内容，需要重新计算尺寸
      if (oldValueClone.length < newValueClone.length) {
        // 重新计算尺寸
        resetSizeOptions(newValueClone);
        // 重新计算组合
        reCalcCombOptions(newValueClone, combOfIndicatorNameAndPool);
        resetComponentOptions(newValueClone);
        return;
      }

      // 3.组件删除，需要重新计算尺寸和指标名资源池组合
      if (oldValueClone.length > newValueClone.length) {
        // 重新计算尺寸
        resetSizeOptions(newValueClone);
        // 重新计算组合
        reCalcCombOptions(newValueClone, combOfIndicatorNameAndPool);
        resetComponentOptions(newValueClone);
        return;
      }

      // 4.组件修改，需要重新计算尺寸
      // 4.1 查找修改的组件
      const index = oldValueClone.findIndex((item, idx) => !isEqual(item, newValueClone[idx]));
      // 指标类型修改
      if (oldValueClone[index].indicatorType !== newValueClone[index].indicatorType) {
        newValueClone[index].pool = '';
        newValueClone[index].ne = [];
        newValueClone[index].indicatorName = '';
        newValueClone[index].displayTitle = '';
        // 重新计算组合
        reCalcCombOptions(newValueClone, combOfIndicatorNameAndPool);
        resetComponentOptions(newValueClone);
        return;
      }

      // 4.2 组件指标名修改
      if (oldValueClone[index].indicatorName !== newValueClone[index].indicatorName) {
        // 资源池置空
        newValueClone[index].pool = '';
        newValueClone[index].ne = [];
        newValueClone[index].displayTitle = '';
        // 重新计算组合
        reCalcCombOptions(newValueClone, combOfIndicatorNameAndPool);
        resetComponentOptions(newValueClone);
        return;
      }

      // 4.3 组件资源池修改
      if (oldValueClone[index].pool !== newValueClone[index].pool) {
        // 重新计算组合
        reCalcCombOptions(newValueClone, combOfIndicatorNameAndPool);
        resetComponentOptions(newValueClone);
        return;
      }

      // 4.4 组件尺寸修改
      // 重新计算尺寸
      resetSizeOptions(newValueClone);
      resetComponentOptions(newValueClone);
    },
    {deep: true, immediate: true}
  );
}

/**
 * 当前序号的组件是否被禁用
 * @type {ComputedRef<function(*): *>} 当前序号的组件是否被禁用
 */
const isBanned = computed(() => (index) => validateFailIndex.value !== undefined && validateFailIndex.value !== index);

/**
 * 组件向上移动
 * @param{number} index 组件索引
 * @returns {void}
 */
function moveUp(index) {
  if (index <= 0 || (validateFailIndex.value !== undefined && validateFailIndex.value !== index)) {
    return;
  }

  isDirectionMove.value = true;
  const temp = componentsNew.value[index];
  componentsNew.value[index] = componentsNew.value[index - 1];
  componentsNew.value[index - 1] = temp;
}

/**
 * 组件向下移动
 * @param{number} index 组件索引
 * @returns {void}
 */
function moveDown(index) {
  if (
    index >= componentsNew.value.length - 1 ||
    (validateFailIndex.value !== undefined && validateFailIndex.value !== index)
  ) {
    return;
  }

  isDirectionMove.value = true;
  const temp = componentsNew.value[index];
  componentsNew.value[index] = componentsNew.value[index + 1];
  componentsNew.value[index + 1] = temp;
}

/**
 * 删除组件
 * @param {number} index 组件索引
 * @returns {void}
 */
function deleteComponent(index) {
  if (validateFailIndex.value !== undefined && validateFailIndex.value !== index) {
    return;
  }

  componentsNew.value.splice(index, 1);
}

/**
 * 新增组件
 * @returns {void}
 */
async function addComponent() {
  const kpi = await getCustomKpiOption();
  componentsNew.value.push({
    indicatorType: kpi.length > 0 ? 'customKpi' : 'keyKpi',
    indicatorName: '',
    pool: '',
    ne: [],
    displayTitle: '',
    isShowLegend: props.isShowLegend,
    maxSeriesEndLabel: props.maxSeriesEndLabel,
    col: 1,
    row: 1,
    // editType为ne时，允许指标、网元重复，因此添加标识进行区分
    chartId: crypto.randomUUID(),
  });
}

const reloadScreenConfig = inject('reloadScreenConfig');
const acquireEditLock = inject('acquireEditLock');

const forceAcquireLockFail = (lockId) => {
  const lockUser = lockId?.split('___')?.[0] ?? '';
  ElMessageBox.confirm(t('_dashboard.lock.user_got', [lockUser]), t('_dashboard.form.saveFail'), {
    type: 'warning',
    confirmButtonText: t('_dashboard.form.Confirm'),
    showCancelButton: false,
    confirmButtonClass: 'el-button el-button--primary',
  }).finally(() => {
    closeDialog();
    store.setParams('_global', 'editable', false);
    reloadScreenConfig();
  });
};

async function saveComponents() {
  customIndicatorMap.value = await getCustomKpiData(componentsNew.value);

  const editHelper = new ChartCardHelper(
    componentsSelected,
    componentsOrigin,
    componentsNew.value,
    props.editOptions,
    indicatorItemMap.value,
    customIndicatorMap.value,
    props.editType
  );
  editHelper.process();
  const locked = await acquireEditLock(null, true);
  if (!locked.lock) {
    forceAcquireLockFail(locked.lockId);
    return;
  }

  await editHelper.save();
  await acquireEditLock(null, false);
  reloadScreenConfig();
  closeDialog();
}

const MAX_NE_NAME_LENGTH = 100;
const NE_NAME_SPECIAL_CHAR = '*|:"<>?\\\\/';
const neNameSpecialCharRegex = new RegExp(`[${NE_NAME_SPECIAL_CHAR}]`);

async function getNeOptions(component, query) {
  neOptions.value = [];
  if (isEmpty(component.indicatorName) || query.length > MAX_NE_NAME_LENGTH || neNameSpecialCharRegex.test(query)) {
    return;
  }

  neOptionsLoading.value = true;
  const neList = (await api.getNeOptions(component.indicatorName, query)).results;
  if (isEmpty(query) && !isEmpty(neList)) {
    neOptions.value.push('ALL');
  }

  neOptions.value.push(...neList);
  neOptionsLoading.value = false;
}

async function changeNeOption(index, value) {
  const component = componentsNew.value[index];
  if (value.length > 0) {
    if (value[value.length - 1] === 'ALL') {
      component.ne = ['ALL'];
    } else if (value.includes('ALL')) {
      component.ne = value.filter((item) => item !== 'ALL');
    } else {
      // do nothing
    }
  }
}

let customKpiRequestId = 0;

async function getCustomKpiOption(query, component) {
  const requestId = ++customKpiRequestId;
  customKpiOptionLoading.value = true;
  const res = (await api.getCustomKpiOptions(domain, query))._values;
  // 竞态守卫：仅最后一次请求的结果生效
  if (requestId !== customKpiRequestId) {
    return [];
  }

  const optionalKpi = res.filter(
    (item) =>
      !componentsNew.value.find(
        (cpt) =>
          cpt.indicatorType === 'customKpi' &&
          cpt.indicatorName === item.value && // 去除当前编辑重复的自定义指标
          cpt.indicatorName !== component?.indicatorName // 包含当前自身所选指标
      ) && !customIndicatorId.includes(item.value) // 去除其他编辑区域重复的自定义指标
  );

  if (component) {
    component._options.customIndicator = cloneDeep(optionalKpi);
  }

  customKpiOptionLoading.value = false;
  return optionalKpi;
}

const debouncedGetCustomKpiOption = debounce(getCustomKpiOption, 300);

const CUSTOM_KPI_SPECIAL_CHARS_REGEX = /[<>"'\[\]$%`*;=^|]/;

const handleCustomKpiFilter = (query, component) => {
  if (CUSTOM_KPI_SPECIAL_CHARS_REGEX.test(query) || query.length > 255) {
    // 特殊字符或超长输入校验失败，不发起查询，清空下拉选项
    debouncedGetCustomKpiOption.cancel();
    component._options.customIndicator = [];
    return [];
  }

  if (!query) {
    // 空查询 = 下拉框刚打开或用户清空搜索，立即获取，无防抖延迟
    debouncedGetCustomKpiOption.cancel();
    return getCustomKpiOption('', component);
  }

  return debouncedGetCustomKpiOption(query, component);
};

async function setCustomKpiOption(components) {
  const res = await getCustomKpiData(components);
  const kpiOption = Object.values(res);

  components.forEach((item) => {
    if (item.indicatorType === 'keyKpi') {
      return;
    }

    item._options = item._options || {};
    item._options.customIndicator = kpiOption;
  });
}

async function getCustomKpiData(components) {
  const customMap = {};
  const cids = components.filter((item) => item.indicatorType === 'customKpi').map((item) => item.indicatorName);
  const res = (await api.getCustomKpiOptions(domain, null, cids))._values;

  res.forEach((item) => {
    customMap[item.value] = item;
  });
  return customMap;
}
</script>

<style lang="less" scoped>
@import '@/assets/styles/edit-component.less';

.edit-container {
  width: 1450px;
}
.edit-component-table .edit-component-table-item {
  &:nth-child(1) {
    flex: 0.8;
    padding-left: 16px;
  }

  &:nth-child(2) {
    flex: 3;
  }
  &:nth-child(3) {
    flex: 11.5;
  }
  &:nth-child(4) {
    flex: 5.7;
  }
  &:nth-child(5) {
    flex: 6.5;
  }

  &:nth-child(6) {
    flex: 2;
  }

  &:nth-child(7) {
    flex: 2.5;
  }
}
.edge-select {
  :deep(.el-tag) {
    --el-tag-bg-color: #3b5880;
    & .el-tag__close:hover {
      background-color: var(--vigour-button-primary-bg-color);
    }
  }
}
</style>
