/* 数据字典左侧面板 · 路线A 第1轮样板（dict 页面）
 * 树节点用默认插槽传入：DictTypeTreeNodes 是根组件的局部注册组件，
 * 只有插槽内容（父作用域编译）才能解析它。
 */
(function () {
  'use strict';
  var QmsDictPanel = {
    name: 'QmsDictPanel',
    props: {
      title: { type: String, default: '' },
      keyword: { type: String, default: '' },
      compact: { type: Boolean, default: false },
      hasNodes: { type: Boolean, default: true },
      emptyText: { type: String, default: '暂无匹配的字典类型' },
      emptyTextCompact: { type: String, default: '暂无可用分类' }
    },
    emits: ['update:keyword', 'query', 'add-type', 'add-cat'],
    methods: {
      onInput: function (v) { this.$emit('update:keyword', v); },
      onQuery: function () { this.$emit('query'); },
      onAddType: function () { this.$emit('add-type'); },
      onAddCat: function () { this.$emit('add-cat'); }
    },
    template: [
      '<aside class="dict-type-panel">',
      '  <div class="dict-type-panel__hd">',
      '    <div class="chrom-cat-search" v-if="compact">',
      '      <el-input :model-value="keyword" clearable placeholder="输入关键字" @update:model-value="onInput" @keyup.enter="onQuery"></el-input>',
      '      <el-button type="primary" @click="onQuery">查询</el-button>',
      '      <el-button type="primary" @click="onAddCat">新增</el-button>',
      '    </div>',
      '    <template v-else>',
      '      <div class="dict-type-panel__title">',
      '        <span>{{ title || \'主数据分类\' }}</span>',
      '        <el-button type="primary" size="small" @click="onAddType">新增字典类型</el-button>',
      '      </div>',
      '      <el-input :model-value="keyword" clearable placeholder="请输入关键字" size="small" @update:model-value="onInput"></el-input>',
      '    </template>',
      '  </div>',
      '  <div class="dict-type-panel__body">',
      '    <div v-if="!hasNodes" class="dict-empty-tip">{{ compact ? emptyTextCompact : emptyText }}</div>',
      '    <template v-else><slot></slot></template>',
      '  </div>',
      '</aside>'
    ].join('\n')
  };

  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsDictPanel = QmsDictPanel;
})();

