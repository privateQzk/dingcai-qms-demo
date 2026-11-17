/* 关键字 + 列表 左侧面板 · 路线A（entry-category / spc-overview） */
(function () {
  'use strict';
  var QmsSimpleListPanel = {
    name: 'QmsSimpleListPanel',
    props: {
      title: { type: String, default: '' },
      placeholder: { type: String, default: '请输入关键字' },
      keyword: { type: String, default: '' },
      items: { type: Array, default: function () { return []; } },
      activeId: { type: [String, Number], default: '' },
      showAll: { type: Boolean, default: false },
      allLabel: { type: String, default: '全部' },
      emptyText: { type: String, default: '' }
    },
    emits: ['update:keyword', 'select'],
    template: [
      '<aside class="dict-type-panel">',
      '  <div class="dict-type-panel__hd">',
      '    <div class="dict-type-panel__title"><span>{{ title }}</span></div>',
      '    <el-input :model-value="keyword" clearable :placeholder="placeholder" size="small" @update:model-value="$emit(\'update:keyword\', $event)"></el-input>',
      '  </div>',
      '  <div class="dict-type-panel__body">',
      '    <div v-if="showAll" class="dict-type-node" :class="{ active: !activeId }" style="padding:8px 12px;cursor:pointer" @click="$emit(\'select\', \'\')">{{ allLabel }}</div>',
      '    <div v-for="c in items" :key="c" class="dict-type-node" :class="{ active: activeId===c }" style="padding:8px 12px;cursor:pointer" @click="$emit(\'select\', c)">{{ c }}</div>',
      '    <div v-if="emptyText && !items.length" class="dict-empty-tip">{{ emptyText }}</div>',
      '  </div>',
      '</aside>'
    ].join('\n')
  };
  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsSimpleListPanel = QmsSimpleListPanel;
})();

