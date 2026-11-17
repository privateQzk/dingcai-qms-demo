/* 树-列表布局左侧面板 · 路线A（tree-list 布局，10 个页面共用）
 * 纯 el-* 组件，无局部组件依赖，可直接抽取。
 */
(function () {
  'use strict';
  var QmsTreeListPanel = {
    name: 'QmsTreeListPanel',
    props: {
      title: { type: String, default: '' },
      toolbar: { type: Array, default: function () { return []; } },
      keyword: { type: String, default: '' },
      nodes: { type: Array, default: function () { return []; } },
      activeId: { type: [String, Number], default: '' },
      ops: { type: Array, default: function () { return []; } }
    },
    emits: ['update:keyword', 'toolbar-action', 'select', 'op'],
    methods: {
      onInput: function (v) { this.$emit('update:keyword', v); },
      onToolbar: function () { this.$emit('toolbar-action'); },
      onSelect: function (c) { this.$emit('select', c); },
      onOp: function (cmd, c) { this.$emit('op', cmd, c); }
    },
    template: [
      '<aside class="dict-type-panel">',
      '  <div class="dict-type-panel__hd">',
      '    <div class="dict-type-panel__title">',
      '      <span>{{ title || \'分类\' }}</span>',
      '      <el-button v-if="toolbar.length" type="primary" size="small" @click="onToolbar">{{ toolbar[0].name }}</el-button>',
      '    </div>',
      '    <el-input :model-value="keyword" clearable placeholder="请输入关键字" size="small" @update:model-value="onInput"></el-input>',
      '  </div>',
      '  <div class="dict-type-panel__body">',
      '    <div v-for="c in nodes" :key="c" class="dict-type-node" :class="{ active: activeId===c }" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px" @click="onSelect(c)">',
      '      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ c }}</span>',
      '      <el-dropdown v-if="ops.length" trigger="click" @command="(cmd)=>onOp(cmd, c)" @click.stop>',
      '        <span class="el-dropdown-link" style="color:#64748b;padding:0 4px" @click.stop>⋯</span>',
      '        <template #dropdown>',
      '          <el-dropdown-menu>',
      '            <el-dropdown-item v-for="op in ops" :key="op" :command="op" :style="op===\'删除\'?\'color:#FF4D4F\':\'\'">{{ op }}</el-dropdown-item>',
      '          </el-dropdown-menu>',
      '        </template>',
      '      </el-dropdown>',
      '    </div>',
      '  </div>',
      '</aside>'
    ].join('\n')
  };
  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsTreeListPanel = QmsTreeListPanel;
})();

