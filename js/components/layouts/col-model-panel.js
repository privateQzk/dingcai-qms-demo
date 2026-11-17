/* 色谱柱型号面板 · 路线A（col-split 布局） */
(function () {
  'use strict';
  var QmsColModelPanel = {
    name: 'QmsColModelPanel',
    props: {
      title: { type: String, default: '' },
      keyword: { type: String, default: '' },
      items: { type: Array, default: function () { return []; } },
      activeId: { type: [String, Number], default: '' }
    },
    emits: ['update:keyword', 'add', 'edit', 'remove', 'select'],
    template: [
      '<aside class="dict-type-panel">',
      '  <div class="dict-type-panel__hd">',
      '    <div class="dict-type-panel__title">',
      '      <span>{{ title || \'色谱柱型号\' }}</span>',
      '      <el-button type="primary" size="small" @click="$emit(\'add\')">新建型号</el-button>',
      '    </div>',
      '    <el-input :model-value="keyword" clearable placeholder="搜索型号" size="small" @update:model-value="$emit(\'update:keyword\', $event)"></el-input>',
      '  </div>',
      '  <div class="dict-type-panel__body">',
      '    <div v-if="!items.length" class="dict-empty-tip">暂无匹配的色谱柱型号</div>',
      '    <div v-for="m in items" :key="m.id" class="dict-type-node" :class="{ \'is-active\': activeId===m.id }" @click="$emit(\'select\', m.id)">',
      '      <span class="dict-type-node__name" :title="m[\'名称\'] + (m[\'备注\'] ? \'（\' + m[\'备注\'] + \'）\' : \'\')">{{ m[\'名称\'] }}</span>',
      '      <span class="dict-type-node__ops" @click.stop>',
      '        <el-button link type="primary" size="small" @click="$emit(\'edit\', m)">编辑</el-button>',
      '        <el-button link type="danger" size="small" @click="$emit(\'remove\', m)">删除</el-button>',
      '      </span>',
      '    </div>',
      '  </div>',
      '</aside>'
    ].join('\n')
  };
  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsColModelPanel = QmsColModelPanel;
})();

