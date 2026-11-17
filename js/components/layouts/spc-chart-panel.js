/* SPC 控制图面板 · 路线A（spc-chart 布局，4 个页面共用） */
(function () {
  'use strict';
  var QmsSpcChartPanel = {
    name: 'QmsSpcChartPanel',
    props: {
      tabs: { type: Array, default: function () { return []; } },
      activeTab: { type: [String, Number], default: '' },
      tips: { type: String, default: '' },
      cards: { type: Array, default: function () { return []; } }
    },
    emits: ['update:activeTab'],
    template: [
      '<section class="spc-chart-panel">',
      '  <div class="page-tabs" v-if="tabs.length" style="margin:0 0 4px;padding:0">',
      '    <el-tabs :model-value="activeTab" @update:model-value="$emit(\'update:activeTab\', $event)">',
      '      <el-tab-pane v-for="t in tabs" :key="t" :name="t" :label="t"></el-tab-pane>',
      '    </el-tabs>',
      '  </div>',
      '  <p class="spc-chart-panel__tips" v-if="tips">{{ tips }}</p>',
      '  <div class="spc-chart-grid" :style="cards.length===1 ? \'grid-template-columns:1fr\' : \'\'">',
      '    <div class="spc-chart-card" v-for="c in cards" :key="c">',
      '      <div class="spc-chart-card__title">{{ c }}</div>',
      '      <div class="spc-chart-card__body">控制图占位 · {{ c }}（演示）</div>',
      '    </div>',
      '  </div>',
      '</section>'
    ].join('\n')
  };
  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsSpcChartPanel = QmsSpcChartPanel;
})();

