<template>
  <div class="custom-header-container">
    <overflow-tooltip>
      {{ t(column.i18n_name) }}
    </overflow-tooltip>
    <span
      v-show="column.sort"
      class="col-sort"
    >
      <img
        class="sort-img-asc"
        :src="imgSrc.asc.url"
        @click="sortData(column.name, 'ASC', ascStatus)"
      >
      <img
        class="sort-img-desc"
        :src="imgSrc.desc.url"
        @click="sortData(column.name, 'DESC', descStatus)"
      >
    </span>
    <el-popover
      v-model:visible="filterVisible"
      placement="bottom"
      :width="column.filter_type === 'date' ? 420 : 240"
      trigger="click"
    >
      <template #reference>
        <img
          v-show="column.filter_type"
          :src="imgSrc.filter.url"
          class="filter-img"
        >
      </template>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item
          v-show="column.filter_type === 'select'"
          prop="select"
          :label="t('filter_condition')"
        >
          <el-select
            v-model="form.select"
            :multiple="!singleSelect"
            clearable
            :teleported="false"
            :placeholder="t('please_select')"
            @change="onSelectChange"
          >
            <el-option
              v-for="item in selections"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-show="column.filter_type === 'input'"
          prop="input"
          :label="t('filter_condition')"
        >
          <el-input
            v-model="form.input"
            :placeholder="t('please_input')"
          />
        </el-form-item>
        <el-form-item
          v-show="column.filter_type === 'date'"
          prop="date"
          :label="t('filter_condition')"
        >
          <el-date-picker
            v-model="form.date"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            :start-placeholder="t('start_time')"
            :end-placeholder="t('end_time')"
            :teleported="false"
          />
        </el-form-item>
        <el-form-item
          v-show="column.filter_type === 'range'"
          :label="t('filter_condition')"
        >
          <el-col :span="11">
            <el-form-item prop="less_value">
              <el-input
                v-model="form.less_value"
                class="range-selector"
                :placeholder="t('please_input')"
              />
            </el-form-item>
          </el-col>
          <el-col :span="0.99">
            <span>-</span>
          </el-col>
          <el-col :span="11">
            <el-form-item prop="bigger_value">
              <el-input
                v-model="form.bigger_value"
                class="range-selector"
                :placeholder="t('please_input')"
              />
            </el-form-item>
          </el-col>
        </el-form-item>
        <el-form-item class="filter-button">
          <el-button
            class="reset-button"
            type=""
            link
            @click="resetForm(formRef)"
          >
            {{ t('reset') }}
          </el-button>
          <el-button
            type="primary"
            link
            @click="submitForm(formRef)"
          >
            {{ t('filter') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-popover>
  </div>
</template>
<script setup>
import {ref, watch, computed} from 'vue';
import OverflowTooltip from './tooltip.vue';
import {t} from '@adc/vigour-ui/lib/utils/i18n';
import CONSTANTS from '@/constants/alarm-constants';
import {useThemeStore} from '@/store/theme-store';

const themeStore = useThemeStore();
const currentTheme = computed(() => themeStore.themeData);
const props = defineProps({
  column: Object,
  sortField: String,
  sortMethod: Function,
  loadDataMethod: Function,
  /** 是否单选模式：选中即提交并关闭弹出层；默认 false 保持原有多次选择 + 手动提交行为 */
  singleSelect: {type: Boolean, default: false},
});
const ascStatus = ref(false);
const descStatus = ref(false);
const filterVisible = ref(false);
const lightImages = {
  asc: {
    url: require('@/assets/imgs/asc.png'),
    normal: require('@/assets/imgs/asc.png'),
    active: require('@/assets/imgs/asc-active.png'),
  },
  desc: {
    url: require('@/assets/imgs/desc.png'),
    normal: require('@/assets/imgs/desc.png'),
    active: require('@/assets/imgs/desc-active.png'),
  },
  filter: {
    url: require('@/assets/imgs/filter.png'),
    normal: require('@/assets/imgs/filter.png'),
    active: require('@/assets/imgs/filter-active.png'),
  },
};

const darkImages = {
  asc: {
    url: require('@/assets/imgs/dark-asc.png'),
    normal: require('@/assets/imgs/dark-asc.png'),
    active: require('@/assets/imgs/dark-asc-active.png'),
  },
  desc: {
    url: require('@/assets/imgs/dark-desc.png'),
    normal: require('@/assets/imgs/dark-desc.png'),
    active: require('@/assets/imgs/dark-desc-active.png'),
  },
  filter: {
    url: require('@/assets/imgs/dark-filter.png'),
    normal: require('@/assets/imgs/dark-filter.png'),
    active: require('@/assets/imgs/dark-filter-active.png'),
  },
};

const imgSrc = computed(() => currentTheme.value === 'dark' ? darkImages : lightImages);

watch(
  () => filterVisible.value,
  (newVal) => {
    if (newVal) {
      getSelections();
    }
  }
);

const form = ref({select: [], input: '', date: [], less_value: null, bigger_value: null});

const formRef = ref();

const specialCharactersRule = {
  validator: (rule, value, callback) => {
    if (['ne_name', 'ne_type'].includes(props.column.name)) {
      if (/[*|:"'<>?\\/]/.test(value)) {
        callback(new Error(t('avoid_special_characters', ['*|:"\'<>?\\/'])));
      } else {
        callback();
      }
    } else {
      if (/[&<>"':[\]$()+\\/#`*;=^|]/.test(value)) {
        callback(new Error(t('avoid_special_characters', ['&<>"\':[]$()+\\/#`*;=^|'])));
      } else {
        callback();
      }
    }
  },
};

const inputLengthRule = {
  validator: (_rule, value, callback) => {
    if (props.column.input_length > 0 && value.length > props.column.input_length) {
      callback(new Error(t('input_length_limit', [props.column.input_length])));
    } else {
      callback();
    }
  },
};

// 范围检验，校验范围是否合理
const rangeValidator = {
  validator: (rule, _value, callback) => {
    const anotherValidatorId = rule.field === 'less_value' ? 'bigger_value' : 'less_value';

    // 当左端或右端没有值的时候，不需要检验范围是否合理
    if (!form.value.less_value) {
      formRef.value.clearValidate(anotherValidatorId);
      return callback();
    }

    if (!form.value.bigger_value) {
      formRef.value.clearValidate(anotherValidatorId);
      return callback();
    }

    if (Number(form.value.less_value) <= Number(form.value.bigger_value)) {
      formRef.value.clearValidate(anotherValidatorId);
      return callback();
    }

    return callback(new Error(t('range_warn')));
  },
  trigger: ['blur', 'change'],
};

// 整数校验
const validateIntRange = {
  validator: (_rule, value, callback) => {
    const MIN = 0;
    const MAX = 9999999999;
    if (!value) {
      return callback();
    }

    const isInt = /^\d+$/.test(value);
    if (!isInt) {
      return callback(new Error(t('enter_integer_warning', [MIN, MAX])));
    }

    const num = Number(value);
    if (num < MIN || num > MAX) {
      return callback(new Error(t('enter_integer_warning', [MIN, MAX])));
    }

    return callback();
  },
  trigger: ['blur', 'change'],
};

const rules = computed(() => ({
  input: props.column.validate === false ? [inputLengthRule] : [specialCharactersRule, inputLengthRule],
  less_value: [validateIntRange, rangeValidator],
  bigger_value: [validateIntRange, rangeValidator],
}));

const selections = ref([]);

const sortData = (sort, dir, status) => {
  ascStatus.value = false;
  descStatus.value = false;

  if (dir === 'ASC') {
    ascStatus.value = true;
    imgSrc.value.asc.url = imgSrc.value.asc.active;
    imgSrc.value.desc.url = imgSrc.value.desc.normal;
  } else {
    descStatus.value = true;
    imgSrc.value.asc.url = imgSrc.value.asc.normal;
    imgSrc.value.desc.url = imgSrc.value.desc.active;
  }

  if (status) {
    imgSrc.value.asc.url = imgSrc.value.asc.normal;
    imgSrc.value.desc.url = imgSrc.value.desc.normal;
    ascStatus.value = false;
    descStatus.value = false;
    props.sortMethod('', '');
  } else {
    props.sortMethod(sort, dir);
  }
};

const clearSort = (sort) => {
  if (sort !== props.column.name) {
    imgSrc.value.asc.url = imgSrc.value.asc.normal;
    imgSrc.value.desc.url = imgSrc.value.desc.normal;
  }
};

// 获取下拉框的选项
async function getSelections() {
  if (!props.column.filter_type || props.column.filter_type === 'input') {
    return;
  }

  // 优先使用列配置中的 filter_options（支持外部传入）
  if (props.column.filter_options && props.column.filter_options.length > 0) {
    selections.value = props.column.filter_options;
    return;
  }

  let options = [];
  if (props.column.name === 'diagnosis_status') {
    options = CONSTANTS.HEADER_DIAGNOSIS_STATUS;
  }

  if (props.column.name === 'alarm_level') {
    options = CONSTANTS.ALARM_LEVEL;
  }

  selections.value = options;
}

// select 值变更回调：单选模式立即提交；多选模式不做处理（等手动点筛选按钮）
const onSelectChange = (val) => {
  if (!props.singleSelect) {
    return;
  }

  const value = val ?? '';
  props.loadDataMethod({[props.column.name]: value});
  imgSrc.value.filter.url = value ? imgSrc.value.filter.active : imgSrc.value.filter.normal;
  filterVisible.value = false;
};

// 筛选
async function submitForm(formEl) {
  if (!formEl) {
    return;
  }

  await formEl.validate((valid) => {
    if (valid) {
      let filterValue;

      if (Array.isArray(form.value.select) ? form.value.select.length > 0 : (form.value.select != null && form.value.select !== '')) {
        filterValue = form.value.select;
      } else if (form.value.date.length > 0) {
        filterValue = form.value.date;
      } else if (
        form.value.less_value ||
        form.value.bigger_value ||
        form.value.less_value === 0 ||
        form.value.bigger_value === 0
      ) {
        filterValue = [form.value.less_value, form.value.bigger_value];
      } else {
        filterValue = form.value.input;
      }

      props.loadDataMethod({[props.column.name]: filterValue});
      imgSrc.value.filter.url = String(filterValue) ? imgSrc.value.filter.active : imgSrc.value.filter.normal;
      filterVisible.value = false;
    }
  });
}

// 重置
function resetForm(formEl) {
  if (!formEl) {
    return;
  }

  imgSrc.value.filter.url = imgSrc.value.filter.normal;
  formEl.resetFields();
  filterVisible.value = false;
  props.loadDataMethod({[props.column.name]: ''});
}

watch(
  () => props.sortField,
  (newVal) => {
    clearSort(newVal);
  }
);

defineExpose({
  clearSort,
});
</script>
<style lang="less" scoped>
@import 'filter-table.less';
</style>
