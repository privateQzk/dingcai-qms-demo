/* 报检单顺序图 · 三个报检类型分组纵向排列，组内单据按报检时间倒序纵向堆叠（最新报检在上，序号轨+连接线） */
(function () {
  'use strict';
  var QmsInspSequence = {
    name: 'QmsInspSequence',
    props: {
      groups: { type: Array, default: function () { return []; } }
    },
    methods: {
      tagType: function (st) {
        var m = { '已完成': 'success', '已复核': 'success', '已放行': 'success', '已关闭': 'info', '检验中': 'warning', '待取样': 'warning', '待执行': 'info', '执行中': 'warning', '异常': 'danger', '不合格': 'danger', '已取消': 'info' };
        return m[st] || 'info';
      },
      progress: function (r) {
        var done = Number(r['检验完成件数']) || 0;
        var total = Number(r['报检件数']) || Number(r['应取样件数']) || 0;
        return { done: done, total: total, pct: total ? Math.min(100, Math.round(done / total * 100)) : 0 };
      },
      sampText: function (r) {
        return '取样 ' + (r['已取样件数'] || 0) + '/' + (r['应取样件数'] || 0);
      }
    },
    template: [
      '<section class="insp-seq" :class="{\'insp-seq--many\': groups.length > 4}">',
      '  <div v-for="g in groups" :key="g.key" class="insp-seq__group">',
      '    <div class="insp-seq__hd">',
      '      <span class="insp-seq__title">{{ g.label }}</span>',
      '      <el-tag size="small" effect="plain">共 {{ g.rows.length }} 单</el-tag>',
      '      <span class="insp-seq__hint">按报检时间倒序 · 最新报检在上</span>',
      '    </div>',
      '    <div class="insp-seq__chain">',
      '      <div v-if="!g.rows.length" class="insp-seq__empty">暂无报检单</div>',
      '      <div v-for="(r, i) in g.rows" :key="r.id" class="insp-seq__item">',
      '        <div class="insp-seq__rail">',
      '          <span class="insp-seq__no">{{ i + 1 }}</span>',
      '          <i v-if="i < g.rows.length - 1" class="insp-seq__line"></i>',
      '        </div>',
      '        <div class="insp-seq__card" :title="r[\'报检单号\']">',
      '          <div class="insp-seq__card-top">',
      '            <span class="insp-seq__bill">{{ r[\'报检单号\'] }}</span>',
      '            <el-tag size="small" :type="tagType(r[\'单据状态\'])">{{ r[\'单据状态\'] || \'—\' }}</el-tag>',
      '            <span class="insp-seq__time">{{ r[\'报检时间\'] || \'—\' }}</span>',
      '          </div>',
      '          <div class="insp-seq__meta">',
      '            <span class="insp-seq__cell"><label>物料</label>{{ r[\'物料名称\'] || \'—\' }}<i v-if="r[\'物料规格\']">（{{ r[\'物料规格\'] }}）</i></span>',
      '            <span class="insp-seq__cell"><label>报检批号</label>{{ r[\'报检批号\'] || \'—\' }}</span>',
      '            <span class="insp-seq__cell"><label>{{ g.party }}</label>{{ r[g.party] || \'—\' }}</span>',
      '            <span class="insp-seq__cell"><label>报检人</label>{{ r[\'报检人\'] || \'—\' }} · {{ r[\'报检部门\'] || \'—\' }}</span>',
      '          </div>',
      '          <div class="insp-seq__prog">',
      '            <el-progress :percentage="progress(r).pct" :stroke-width="8" :show-text="false"></el-progress>',
      '            <span>检验 {{ progress(r).done }}/{{ progress(r).total }} 件 · {{ sampText(r) }}</span>',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</section>'
    ].join('\n')
  };
  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsInspSequence = QmsInspSequence;
})();
