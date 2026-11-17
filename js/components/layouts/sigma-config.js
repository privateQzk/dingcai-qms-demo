/* σ 计算方法配置 · 路线A（sigma-config 布局，1 个页面） */
(function () {
  'use strict';
  var QmsSigmaConfig = {
    name: 'QmsSigmaConfig',
    props: {
      tips: { type: String, default: '' },
      docTitle: { type: String, default: '' },
      rows: { type: Array, default: function () { return []; } },
      options: { type: Array, default: function () { return []; } },
      defaultOption: { type: String, default: '' },
      model: { type: Object, default: function () { return {}; } }
    },
    emits: ['update:model', 'confirm'],
    methods: {
      onPick: function (row, val) {
        this.model[row] = val;
        this.$emit('update:model', this.model);
      },
      onDoc: function () {
        var t = this.docTitle || '《SPC各类指标计算公式》';
        try { window.ElementPlus.ElMessage.info('Demo：已打开 ' + t); } catch (e) {}
      }
    },
    template: [
      '<section class="sigma-config">',
      '  <div class="sigma-config__tips">',
      '    <p><span class="sigma-config__tips-label">e.g：</span>{{ tips }}</p>',
      '    <p class="sigma-config__tips-doc">',
      '      公式详情可查看文档',
      '      <el-link type="primary" :underline="false" @click="onDoc">{{ docTitle || \'《SPC各类指标计算公式》\' }}</el-link>',
      '    </p>',
      '  </div>',
      '  <div v-for="row in rows" :key="row" class="sigma-config__row">',
      '    <span class="sigma-config__label">{{ row }}：</span>',
      '    <el-radio-group :model-value="model[row]" class="sigma-config__radios" @update:model-value="onPick(row, $event)">',
      '      <el-radio v-for="opt in options" :key="opt" :value="opt">',
      '        {{ opt }}<span v-if="opt===defaultOption" class="sigma-config__default">（默认）</span>',
      '      </el-radio>',
      '    </el-radio-group>',
      '  </div>',
      '  <div class="sigma-config__footer">',
      '    <el-button type="primary" @click="$emit(\'confirm\')">确定变更</el-button>',
      '  </div>',
      '</section>'
    ].join('\n')
  };
  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsSigmaConfig = QmsSigmaConfig;
})();

