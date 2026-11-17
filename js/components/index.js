/* 通用组件库 · 路线A 第2批
 * 用法：页面里直接写 <qms-data-table :columns="cols" :data="rows" />
 * 说明：全部为 options API + 字符串模板，依赖全局 Vue / Element Plus，无需构建
 */
(function () {
  'use strict';

  var QmsDataTable = {
    name: 'QmsDataTable',
    props: {
      columns: { type: Array, default: function () { return []; } },
      data: { type: Array, default: function () { return []; } },
      rowKey: { type: String, default: '' },
      height: { type: [String, Number], default: '' },
      maxHeight: { type: [String, Number], default: '' },
      border: { type: Boolean, default: true },
      stripe: { type: Boolean, default: true },
      showIndex: { type: Boolean, default: true },
      showSelection: { type: Boolean, default: false },
      selected: { type: Array, default: function () { return []; } },
      emptyText: { type: String, default: '暂无数据' }
    },
    emits: ['update:selected', 'row-click'],
    computed: {
      selectionCount: function () { return (this.selected || []).length; }
    },
    methods: {
      onSelectionChange: function (rows) { this.$emit('update:selected', rows); },
      onRowClick: function (row) { this.$emit('row-click', row); },
      cellValue: function (row, col) {
        return row && col && col.prop ? row[col.prop] : '';
      }
    },
    template: [
      '<el-table',
      '  :data="data"',
      '  :row-key="rowKey || undefined"',
      '  :height="height || undefined"',
      '  :max-height="maxHeight || undefined"',
      '  :border="border" :stripe="stripe"',
      '  class="demo-data-table demo-data-table--striped"',
      '  empty-text="emptyText"',
      '  @row-click="onRowClick"',
      '  @selection-change="onSelectionChange">',
      '  <el-table-column v-if="showSelection" type="selection" width="48" />',
      '  <el-table-column v-if="showIndex" type="index" label="序号" width="64" />',
      '  <el-table-column',
      '    v-for="(col, i) in columns" :key="col.prop || col.label || i"',
      '    :prop="col.prop" :label="col.label"',
      '    :width="col.width" :min-width="col.minWidth"',
      '    :align="col.align || \'left\'" :fixed="col.fixed"',
      '    :show-overflow-tooltip="col.tooltip !== false">',
      '    <template v-if="col.slot" #default="scope">',
      '      <slot :name="col.slot" v-bind="scope"></slot>',
      '    </template>',
      '    <template v-else-if="col.formatter" #default="scope">{{ col.formatter(scope.row) }}</template>',
      '  </el-table-column>',
      '  <slot name="append"></slot>',
      '</el-table>'
    ].join('\n')
  };

  var QmsFormRenderer = {
    name: 'QmsFormRenderer',
    props: {
      fields: { type: Array, default: function () { return []; } },
      model: { type: Object, default: function () { return {}; } },
      labelWidth: { type: String, default: '118px' },
      readonly: { type: Boolean, default: false },
      columns: { type: Number, default: 2 }
    },
    emits: ['update:model'],
    methods: {
      setVal: function (key, val) {
        this.model[key] = val;
        this.$emit('update:model', this.model);
      },
      disabledOf: function (f) { return this.readonly || !!f.disabled; }
    },
    template: [
      '<el-form :model="model" :label-width="labelWidth" class="demo-form-grid" :style="{ display: \'grid\', gridTemplateColumns: \'repeat(\' + columns + \', 1fr)\', gap: \'0 24px\' }">',
      '  <el-form-item v-for="f in fields" :key="f.prop" :label="f.label" :required="!!f.required">',
      '    <el-select v-if="f.type === \'select\'" :model-value="model[f.prop]" :disabled="disabledOf(f)" clearable',
      '      :placeholder="f.placeholder || \'请选择\'" @update:model-value="setVal(f.prop, $event)" style="width:100%">',
      '      <el-option v-for="o in (f.options || [])" :key="o.value !== undefined ? o.value : o" :label="o.label !== undefined ? o.label : o" :value="o.value !== undefined ? o.value : o" />',
      '    </el-select>',
      '    <el-input v-else-if="f.type === \'textarea\'" type="textarea" :rows="f.rows || 3" :model-value="model[f.prop]"',
      '      :disabled="disabledOf(f)" :placeholder="f.placeholder" @update:model-value="setVal(f.prop, $event)" />',
      '    <el-switch v-else-if="f.type === \'switch\'" :model-value="model[f.prop]" :disabled="disabledOf(f)"',
      '      @update:model-value="setVal(f.prop, $event)" />',
      '    <el-input v-else :model-value="model[f.prop]" :disabled="disabledOf(f)" clearable',
      '      :placeholder="f.placeholder || (\'请输入\' + (f.label || \'\'))" @update:model-value="setVal(f.prop, $event)" />',
      '    <div v-if="f.hint" class="form-field-hint">{{ f.hint }}</div>',
      '  </el-form-item>',
      '</el-form>'
    ].join('\n')
  };

  var QmsFormDialog = {
    name: 'QmsFormDialog',
    props: {
      modelValue: { type: Boolean, default: false },
      title: { type: String, default: '' },
      width: { type: String, default: '720px' },
      appendToBody: { type: Boolean, default: true },
      closeOnClickModal: { type: Boolean, default: false },
      confirmText: { type: String, default: '确定' },
      cancelText: { type: String, default: '取消' },
      showFooter: { type: Boolean, default: true },
      confirmLoading: { type: Boolean, default: false }
    },
    emits: ['update:modelValue', 'confirm', 'cancel'],
    methods: {
      close: function () { this.$emit('update:modelValue', false); },
      onConfirm: function () { this.$emit('confirm'); },
      onCancel: function () { this.$emit('cancel'); this.close(); }
    },
    template: [
      '<el-dialog :model-value="modelValue" :title="title" :width="width"',
      '  :append-to-body="appendToBody" :close-on-click-modal="closeOnClickModal"',
      '  @update:model-value="close" draggable>',
      '  <slot></slot>',
      '  <template v-if="showFooter" #footer>',
      '    <slot name="footer">',
      '      <el-button @click="onCancel">{{ cancelText }}</el-button>',
      '      <el-button type="primary" :loading="confirmLoading" @click="onConfirm">{{ confirmText }}</el-button>',
      '    </slot>',
      '  </template>',
      '</el-dialog>'
    ].join('\n')
  };

  window.QMS_COMPONENTS = {
    QmsDataTable: QmsDataTable,
    QmsFormRenderer: QmsFormRenderer,
    QmsFormDialog: QmsFormDialog
  };
})();

