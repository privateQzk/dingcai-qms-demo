/* 检验排程 · 排程看板（sched-board 布局）
 * 行=在用仪器、列=时间轴的甘特图（ECharts custom series，组件内部维护实例）
 * props: sb=可交互状态(tab/view/anchor/q/sel/dlg/detail/方法)；data=派生数据(cards/tasks/logs/gantt/ganttInsts/shades/range/rangeText/now)
 * 约定：sb 上的方法由 app 侧注入（setTab/nav/today/auto/op/saveSched/cancelSched/pick/exportTasks/exportLogs 等）
 */
(function () {
  'use strict';
  var STATUS_COLORS = {
    '已排程': '#3B82F6',
    '检验中': '#F59E0B',
    '已完成': '#22C55E'
  };
  var QmsSchedBoard = {
    name: 'QmsSchedBoard',
    props: {
      sb: { type: Object, required: true },
      data: { type: Object, default: function () { return { tasks: [], logs: [], gantt: [], ganttInsts: [], shades: [], range: [0, 0], cards: [] }; } }
    },
    data: function () { return { chart: null }; },
    watch: {
      'data.gantt': { deep: true, handler: function () { this.$nextTick(this.renderChart); } },
      'data.range': { handler: function () { this.$nextTick(this.renderChart); } },
      'sb.view': { handler: function () { this.$nextTick(this.renderChart); } },
      'sb.tab': {
        handler: function (v) {
          if (v === 'board') this.$nextTick(this.renderChart);
        }
      }
    },
    mounted: function () { this.initChart(); },
    beforeUnmount: function () {
      if (this._dragMove) window.removeEventListener('mousemove', this._dragMove, true);
      if (this._dragUp) window.removeEventListener('mouseup', this._dragUp, true);
      if (this._dragDown) window.removeEventListener('mousedown', this._dragDown, true);
      if (this.chart) { this.chart.dispose(); this.chart = null; }
    },
    methods: {
      initChart: function () {
        if (!window.echarts || !this.$refs.gantt) return;
        this.chart = window.echarts.init(this.$refs.gantt);
        var self = this;
        this.chart.on('click', function (params) {
          if (self._suppressClick) { self._suppressClick = false; return; }
          var t = params && params.data && params.data.t;
          if (t && self.sb && self.sb.pick) self.sb.pick(t);
        });
        // 任务块拖动：DOM 捕获 mousedown + 纯几何命中/换算 + window 级 move/up
        // 不调 echarts convertToPixel/convertFromPixel（该图上调会炸）；
        // 像素↔时间/行 全部按 grid 常量 + 当前 dataZoom 窗口手算
        var dom = this.$refs.gantt;
        var drag = null;
        var panOff = function (off) { self.chart.setOption({ dataZoom: [{ moveOnMouseMove: !off }] }); };
        var plot = function () { var h = dom.clientHeight; return { l: 190, r: dom.clientWidth - 30, t: 10, b: h - 46 }; };
        var win = function () {
          try {
            var dz = self.chart.getOption().dataZoom, d = dz && dz[0], full = self.data.fullRange || self.data.range || [0, 0];
            if (d) {
              if (d.startValue != null) return [d.startValue, d.endValue];
              if (d.start != null) return [full[0] + (full[1] - full[0]) * d.start / 100, full[0] + (full[1] - full[0]) * d.end / 100];
            }
          } catch (e) {}
          return self.data.range || [0, 0];
        };
        var xToT = function (px) { var g = plot(), w = win(); return w[0] + (px - g.l) / Math.max(1, g.r - g.l) * (w[1] - w[0]); };
        var yToRow = function (py) { var g = plot(), n = Math.max(1, (self.data.ganttInsts || []).length); return (py - g.t) / ((g.b - g.t) / n); };
        var toVal = function (cx, cy) {
          var r = dom.getBoundingClientRect();
          return [xToT(cx - r.left), yToRow(cy - r.top)];
        };
        var hitIdx = function (px, py) {
          var items = self.data.gantt || [], insts = self.data.ganttInsts || [];
          if (!insts.length) return -1;
          var g = plot(), n = insts.length, bandH = (g.b - g.t) / n, w = win();
          var tx = function (t) { return g.l + (t - w[0]) / (w[1] - w[0]) * (g.r - g.l); };
          for (var i = items.length - 1; i >= 0; i--) {
            var v = items[i].value;
            var x1 = tx(v[1]), x2 = tx(v[2]);
            var inner = bandH * 0.8, lh = inner / (v[4] || 1);
            var cy = g.t + (v[0] + 0.5) * bandH - inner / 2 + (v[3] || 0) * lh + lh / 2;
            if (px >= Math.min(x1, x2) - 2 && px <= Math.max(x1, x2) + 2 && Math.abs(py - cy) <= lh / 2 + 2) return i;
          }
          return -1;
        };
        var finish = function (commit) {
          if (!drag) return;
          var insts = self.data.ganttInsts || [];
          if (commit && drag.moved && self.sb && self.sb.drop) {
            self._suppressClick = true;
            self.sb.drop(drag.t, insts[drag.curRow], drag.curS, drag.curE);
          }
          if (drag.moved) self.renderChart();
          panOff(false);
          drag = null;
        };
        self._dragMove = function (ev) {
          if (!drag) return;
          if (ev.buttons === 0) { finish(false); return; }
          var insts = self.data.ganttInsts || [];
          var pt = toVal(ev.clientX, ev.clientY);
          if (!isFinite(pt[0]) || !isFinite(pt[1])) return;
          var ns = Math.round((drag.s0 + (pt[0] - drag.grab)) / 300000) * 300000;
          var nr = Math.round(pt[1]);
          if (nr < 0) nr = 0; if (nr > insts.length - 1) nr = insts.length - 1;
          if (drag.cands.length && insts[nr] && drag.cands.indexOf(insts[nr]) < 0) nr = drag.curRow;
          if (ns !== drag.curS || nr !== drag.curRow) {
            drag.curS = ns; drag.curE = ns + drag.dur; drag.curRow = nr; drag.moved = true;
            var items = drag.base.map(function (it) { return { value: it.value.slice(), t: it.t }; });
            items[drag.idx].value = [nr, ns, ns + drag.dur, 0, 1];
            self.chart.setOption({ series: [{ data: items }] });
          }
        };
        self._dragUp = function () { finish(true); };
        // 全部 capture 阶段：zrender 在 canvas 上 stopPropagation，bubble 阶段收不到
        window.addEventListener('mousemove', self._dragMove, true);
        window.addEventListener('mouseup', self._dragUp, true);
        // 捕获阶段挂 window：先于 canvas/zrender 的 stopPropagation，必定收到
        self._dragDown = function (ev) {
          if (ev.button !== 0 || !self.chart || !dom.contains(ev.target)) return;
          var r = dom.getBoundingClientRect();
          var px = ev.clientX - r.left, py = ev.clientY - r.top;
          var idx = hitIdx(px, py);
          if (idx < 0) return;
          var item = (self.data.gantt || [])[idx], t = item && item.t;
          if (!t || t['排程状态'] !== '已排程' || t['锁定'] === '是' || !self.sb || !self.sb.drop) return;
          var pt = toVal(ev.clientX, ev.clientY);
          if (!isFinite(pt[0]) || !isFinite(pt[1])) return;
          drag = {
            t: t, idx: idx, moved: false, curRow: item.value[0], grab: pt[0],
            dur: item.value[2] - item.value[1], s0: item.value[1],
            curS: item.value[1], curE: item.value[2],
            cands: (t._cands || []).map(function (c) { return c['仪器名称']; }),
            base: (self.data.gantt || []).map(function (it) { return { value: it.value.slice(), t: it.t }; })
          };
          panOff(true);
          ev.preventDefault();
        };
        window.addEventListener('mousedown', self._dragDown, true);
        this.renderChart();
      },
      statusColor: function (st) { return STATUS_COLORS[st] || '#94A3B8'; },
      renderChart: function () {
        if (!this.chart) { this.initChart(); return; }
        var self = this;
        var insts = this.data.ganttInsts || [];
        var items = this.data.gantt || [];
        var shades = this.data.shades || [];
        var now = this.data.nowMs || 0;
        var range = this.data.range || [0, 0];
        var full = this.data.fullRange || range;
        var option = {
          animation: false,
          grid: { left: 190, right: 30, top: 10, bottom: 46 },
          tooltip: {
            trigger: 'item',
            formatter: function (p) {
              var t = p.data && p.data.t; if (!t) return '';
              var esc = function (v) { return String(v == null ? '—' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
              return '<div style="font-size:12px;line-height:1.7">' +
                '<b>' + esc(t['样品编号']) + ' · ' + esc(t['检验类']) + '</b><br>' +
                '报检单号：' + esc(t['报检单号']) + '　优先级：' + esc(t['优先级']) + '<br>' +
                '检验项：' + esc(t['检验项']) + '<br>' +
                '班组：' + esc(t['检验班组']) + '　仪器：' + esc(t['检验仪器']) + '<br>' +
                '计划：' + esc(t['计划开始']) + ' ~ ' + esc(t['计划结束']) + '（' + esc(t['计划工时']) + 'h）<br>' +
                '需求完成：' + esc(t['需求完成时间']) + '　状态：' + esc(t['排程状态']) +
                (t['超期'] && t['超期'] !== '—' ? '　<span style="color:#f87171">' + esc(t['超期']) + '</span>' : '') +
                (t['冲突'] === '冲突' ? '　<span style="color:#f87171">冲突</span>' : '') + '</div>';
            }
          },
          xAxis: {
            type: 'time', min: full[0], max: full[1], splitNumber: 16,
            minorTick: { show: true, splitNumber: 4 },
            minorSplitLine: { show: true, lineStyle: { color: '#F5F8FC' } },
            axisLabel: { fontSize: 11, hideOverlap: true, formatter: function (v) {
              var d = new Date(v); var p = function (n) { return String(n).padStart(2, '0'); };
              var span = range[1] - range[0];
              try { var dz = self.chart && self.chart.getOption() && self.chart.getOption().dataZoom; if (dz && dz[0] && dz[0].startValue != null) span = dz[0].endValue - dz[0].startValue; } catch (e) {}
              var md = (d.getMonth() + 1) + '-' + p(d.getDate());
              if (span > 72 * 3600000) return md + ' 周' + '日一二三四五六'[d.getDay()];
              if (d.getHours() === 0 && d.getMinutes() === 0) return md + ' 00:00';
              return p(d.getHours()) + ':' + p(d.getMinutes());
            } },
            splitLine: { show: true, lineStyle: { color: '#EEF2F7' } }
          },
          yAxis: {
            type: 'category', data: insts, inverse: true,
            axisLabel: {
              fontSize: 12, width: 170, overflow: 'truncate',
              formatter: function (v) {
                var meta = (self.data.instMeta || {})[v] || {};
                return '{code|' + (meta.code || '') + '} {name|' + v + '}';
              },
              rich: { code: { color: '#94A3B8', fontSize: 10, align: 'right', width: 66 }, name: { color: '#334155', fontSize: 12, width: 98, overflow: 'truncate' } }
            },
            splitLine: { show: true, lineStyle: { color: '#E5EAF0' } },
            axisTick: { show: false }, axisLine: { show: false }
          },
          dataZoom: [
            { type: 'inside', xAxisIndex: 0, filterMode: 'none', startValue: range[0], endValue: range[1],
              moveOnMouseMove: true, moveOnMouseWheel: false, zoomOnMouseWheel: true },
            { type: 'slider', xAxisIndex: 0, height: 16, bottom: 6, filterMode: 'none', showDetail: false,
              startValue: range[0], endValue: range[1], brushSelect: false }
          ],
          series: [{
            type: 'custom',
            renderItem: function (params, api) {
              var cat = api.value(0);
              var s = api.coord([api.value(1), cat]);
              var e = api.coord([api.value(2), cat]);
              var lane = api.value(3) || 0, lanes = api.value(4) || 1;
              var bandH = api.size([0, 1])[1];
              var innerH = bandH * 0.8;
              var laneH = innerH / lanes;
              var h = Math.max(7, Math.min(20, laneH - 4));
              var y = s[1] - innerH / 2 + lane * laneH + (laneH - h) / 2;
              var w = Math.max(e[0] - s[0], 5);
              var t = (items[params.dataIndex] && items[params.dataIndex].t) || {};
              var alert = t['超期'] && t['超期'] !== '—';
              var fill = self.statusColor(t['排程状态']);
              var draggable = t['排程状态'] === '已排程' && t['锁定'] !== '是';
              var pfx = 'blk-' + params.dataIndex;
              var kids = [{
                type: 'rect',
                shape: { x: s[0], y: y, width: w, height: h, r: 3 },
                style: { fill: fill, stroke: alert ? '#DC2626' : 'transparent', lineWidth: alert ? 2 : 0 },
                name: pfx, x: 0, y: 0,
                cursor: draggable ? 'grab' : 'pointer'
              }];
              if (t['优先级'] === '高') {
                kids.push({ type: 'rect', name: pfx + '-a', x: 0, y: 0, shape: { x: s[0], y: y, width: 4, height: h, r: [3, 0, 0, 3] }, style: { fill: '#F97316' }, silent: true });
              }
              if (t['锁定'] === '是' && w > 20) {
                var lx = s[0] + w - 13, ly = y + h / 2;
                kids.push({ type: 'circle', name: pfx + '-b', x: 0, y: 0, shape: { cx: lx + 4.5, cy: ly - 4, r: 2.5 }, style: { stroke: '#fff', fill: 'none', lineWidth: 1.6 }, silent: true });
                kids.push({ type: 'rect', name: pfx + '-c', x: 0, y: 0, shape: { x: lx, y: ly - 2, width: 9, height: 6, r: 1 }, style: { fill: '#fff' }, silent: true });
              }
              if (w > 34) {
                kids.push({
                  type: 'text', silent: true, name: pfx + '-d', x: 0, y: 0,
                  style: {
                    x: s[0] + 7, y: y + h / 2, text: t['样品编号'] + '·' + t['检验类'],
                    fill: '#fff', fontSize: 11, align: 'left', verticalAlign: 'middle',
                    width: w - 10, overflow: 'truncate'
                  }
                });
              }
              if (t['冲突'] === '冲突') {
                kids.push({
                  type: 'text', silent: true, name: pfx + '-e', x: 0, y: 0,
                  style: { x: s[0] + w + 4, y: y + h / 2, text: '冲突', fill: '#DC2626', fontSize: 10, align: 'left', verticalAlign: 'middle' }
                });
              }
              return { type: 'group', children: kids };
            },
            data: items,
            markArea: {
              silent: true,
              itemStyle: { color: 'rgba(148,163,184,0.14)' },
              data: shades.map(function (r) { return [{ xAxis: r[0] }, { xAxis: r[1] }]; })
            },
            markLine: now ? {
              silent: true, symbol: 'none',
              lineStyle: { color: '#EF4444', type: 'dashed', width: 1.5 },
              label: { show: true, position: 'end', formatter: '当前', color: '#EF4444', fontSize: 10 },
              data: [{ xAxis: now }]
            } : undefined
          }]
        };
        this.chart.setOption(option, true);
      },
      tagType: function (v) {
        if (v === '待排程') return 'info';
        if (v === '已排程') return 'primary';
        if (v === '检验中') return 'warning';
        if (v === '已完成') return 'success';
        if (v === '冲突' || v === '超期风险' || v === '逾期' || v === '高') return 'danger';
        if (v === '中') return 'warning';
        if (v === '低') return 'info';
        if (v === '自动') return 'primary';
        if (v === '手动') return 'success';
        return 'info';
      },
      opBtns: function (row) {
        if (row['排程状态'] === '待排程') return [{ name: '排程', cmd: 'sched', type: 'primary' }];
        if (row['排程状态'] === '已排程') {
          if (row['锁定'] === '是') return [{ name: '解锁', cmd: 'unlock', type: 'warning' }];
          return [{ name: '调整', cmd: 'adjust', type: 'primary' }, { name: '取消', cmd: 'cancel', type: 'danger' }, { name: '锁定', cmd: 'lock', type: 'warning' }];
        }
        return [];
      }
    },
    template: [
      '<section class="sched-board">',
      '  <div class="sb-cards">',
      '    <div v-for="c in data.cards" :key="c.label" class="sb-card" :class="\'sb-card--\' + (c.tone || \'blue\')">',
      '      <div class="sb-card__v">{{ c.value }}</div><div class="sb-card__l">{{ c.label }}</div>',
      '    </div>',
      '  </div>',
      '  <div class="sb-tabs">',
      '    <button v-for="t in [[\'board\',\'排程看板\'],[\'tasks\',\'排程任务\'],[\'log\',\'排程流水\']]" :key="t[0]"',
      '      class="sb-tab" :class="{ \'sb-tab--on\': sb.tab === t[0] }" @click="sb.setTab(t[0])">{{ t[1] }}</button>',
      '  </div>',
      // ===== 排程看板 =====
      '  <div v-show="sb.tab === \'board\'" class="sb-board">',
      '    <div class="sb-board__bar">',
      '      <el-radio-group :model-value="sb.view" size="small" @update:model-value="sb.setView($event)">',
      '        <el-radio-button value="day">日视图</el-radio-button>',
      '        <el-radio-button value="week">周视图</el-radio-button>',
      '      </el-radio-group>',
      '      <el-button size="small" @click="sb.nav(-1)">‹</el-button>',
      '      <el-button size="small" @click="sb.today()">今天</el-button>',
      '      <el-button size="small" @click="sb.nav(1)">›</el-button>',
      '      <span class="sb-range">{{ data.rangeText }}</span>',
      '      <span class="sb-legend">',
      '        <i class="sb-legend__i" style="background:#3B82F6"></i>已排程',
      '        <i class="sb-legend__i" style="background:#F59E0B"></i>检验中',
      '        <i class="sb-legend__i" style="background:#22C55E"></i>已完成',
      '        <i class="sb-legend__i sb-legend__i--line"></i>逾期',
      '        <i class="sb-legend__i" style="background:#F97316;width:4px"></i>高优先级',
      '      </span>',
      '      <span class="sb-now">演示基准：{{ data.now }}</span>',
      '    </div>',
      '    <div ref="gantt" class="sb-gantt"></div>',
      '    <div class="sb-board__tip">点击任务块查看详情；拖动「已排程」块左右改时间、上下换仪器（仅候选行可落，带锁图标=已锁定不可拖）；空白处拖拽平移、滚轮缩放；灰色底纹为非工作时段</div>',
      '  </div>',
      // ===== 排程任务 =====
      '  <div v-show="sb.tab === \'tasks\'">',
      '    <div class="sb-query">',
      '      <el-form :inline="true" class="query-form">',
      '        <el-form-item label="样品编号"><el-input v-model="sb.q.样品编号" clearable placeholder="模糊查询" style="width:150px"></el-input></el-form-item>',
      '        <el-form-item label="检验仪器"><el-select v-model="sb.q.检验仪器" clearable filterable placeholder="全部" style="width:170px"><el-option v-for="o in data.instOpts" :key="o" :label="o" :value="o"></el-option></el-select></el-form-item>',
      '        <el-form-item label="排程状态"><el-select v-model="sb.q.排程状态" clearable placeholder="全部" style="width:120px"><el-option v-for="o in [\'待排程\',\'已排程\',\'检验中\',\'已完成\']" :key="o" :label="o" :value="o"></el-option></el-select></el-form-item>',
      '        <el-form-item label="检验类"><el-select v-model="sb.q.检验类" clearable filterable placeholder="全部" style="width:140px"><el-option v-for="o in data.catOpts" :key="o" :label="o" :value="o"></el-option></el-select></el-form-item>',
      '        <el-form-item label="检验班组"><el-select v-model="sb.q.检验班组" clearable filterable placeholder="全部" style="width:150px"><el-option v-for="o in data.teamOpts" :key="o" :label="o" :value="o"></el-option></el-select></el-form-item>',
      '        <el-form-item label="优先级"><el-select v-model="sb.q.优先级" clearable placeholder="全部" style="width:100px"><el-option v-for="o in [\'高\',\'中\',\'低\']" :key="o" :label="o" :value="o"></el-option></el-select></el-form-item>',
      '        <template v-if="sb.qMore">',
      '          <el-form-item label="报检单号"><el-input v-model="sb.q.报检单号" clearable placeholder="模糊查询" style="width:150px"></el-input></el-form-item>',
      '          <el-form-item label="需求完成时间"><el-date-picker v-model="sb.q.需求范围" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始" end-placeholder="结束" style="width:230px"></el-date-picker></el-form-item>',
      '          <el-form-item label="计划日期"><el-date-picker v-model="sb.q.计划范围" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始" end-placeholder="结束" style="width:230px"></el-date-picker></el-form-item>',
      '        </template>',
      '        <el-form-item>',
      '          <el-button type="primary" @click="sb.qQuery()">查询</el-button>',
      '          <el-button @click="sb.qReset()">重置</el-button>',
      '          <el-button link type="primary" @click="sb.qMore = !sb.qMore">{{ sb.qMore ? \'收起\' : \'更多\' }}</el-button>',
      '        </el-form-item>',
      '      </el-form>',
      '    </div>',
      '    <div class="sb-toolbar">',
      '      <span class="sb-toolbar__t">排程任务 · 共 {{ data.tasks.length }} 条（已选 {{ sb.sel.length }}）</span>',
      '      <span class="sb-toolbar__b">',
      '        <el-button type="primary" @click="sb.auto()">自动排程</el-button>',
      '        <el-button type="danger" :disabled="!sb.sel.length" @click="sb.batchCancel()">取消排程</el-button>',
      '        <el-button type="warning" :disabled="!sb.sel.length" @click="sb.batchLock()">锁定</el-button>',
      '        <el-button :disabled="!sb.sel.length" @click="sb.batchUnlock()">解锁</el-button>',
      '        <el-button @click="sb.exportTasks()">导出</el-button>',
      '      </span>',
      '    </div>',
      '    <el-table class="demo-data-table" :data="data.tasks" border stripe max-height="540" empty-text="暂无数据" @selection-change="sb.selChange($event)">',
      '      <el-table-column type="selection" width="44"></el-table-column>',
      '      <el-table-column prop="样品编号" label="样品编号" width="130" fixed="left"></el-table-column>',
      '      <el-table-column label="排程状态" width="92"><template #default="{ row }"><el-tag :type="tagType(row[\'排程状态\'])" size="small">{{ row[\'排程状态\'] }}</el-tag></template></el-table-column>',
      '      <el-table-column label="优先级" width="76"><template #default="{ row }"><el-tag v-if="row[\'优先级\']!==\'—\'" :type="tagType(row[\'优先级\'])" size="small">{{ row[\'优先级\'] }}</el-tag><span v-else class="demo-readonly">—</span></template></el-table-column>',
      '      <el-table-column prop="需求完成时间" label="需求完成时间" width="140"></el-table-column>',
      '      <el-table-column prop="报检类型" label="报检类型" width="96"></el-table-column>',
      '      <el-table-column prop="报检单号" label="报检单号" width="130"></el-table-column>',
      '      <el-table-column prop="物料编码" label="物料编码" width="130"></el-table-column>',
      '      <el-table-column prop="物料名称" label="物料名称" width="150" show-overflow-tooltip></el-table-column>',
      '      <el-table-column prop="检验类" label="检验类" width="110"></el-table-column>',
      '      <el-table-column prop="检验项" label="检验项" width="150" show-overflow-tooltip></el-table-column>',
      '      <el-table-column prop="检验班组" label="检验班组" width="130"></el-table-column>',
      '      <el-table-column prop="适用仪器" label="适用仪器" width="150" show-overflow-tooltip></el-table-column>',
      '      <el-table-column prop="检验仪器" label="检验仪器" width="150" show-overflow-tooltip></el-table-column>',
      '      <el-table-column prop="计划开始" label="计划开始" width="140"></el-table-column>',
      '      <el-table-column prop="计划结束" label="计划结束" width="140"></el-table-column>',
      '      <el-table-column prop="计划工时" label="计划工时(h)" width="96" align="right"></el-table-column>',
      '      <el-table-column label="超期" width="92"><template #default="{ row }"><el-tag v-if="row[\'超期\']!==\'—\'" type="danger" size="small">{{ row[\'超期\'] }}</el-tag><span v-else class="demo-readonly">—</span></template></el-table-column>',
      '      <el-table-column prop="班次" label="班次" width="96"></el-table-column>',
      '      <el-table-column prop="检验日历" label="检验日历" width="150"></el-table-column>',
      '      <el-table-column prop="取样时间" label="取样时间" width="140"></el-table-column>',
      '      <el-table-column prop="排程方式" label="排程方式" width="86"></el-table-column>',
      '      <el-table-column prop="排程人" label="排程人" width="80"></el-table-column>',
      '      <el-table-column prop="排程时间" label="排程时间" width="140"></el-table-column>',
      '      <el-table-column label="冲突" width="72"><template #default="{ row }"><el-tag v-if="row[\'冲突\']===\'冲突\'" type="danger" size="small">冲突</el-tag><span v-else class="demo-readonly">—</span></template></el-table-column>',
      '      <el-table-column label="锁定" width="66"><template #default="{ row }"><el-tag v-if="row[\'锁定\']===\'是\'" type="warning" size="small">锁定</el-tag><span v-else class="demo-readonly">—</span></template></el-table-column>',
      '      <el-table-column label="操作" width="170" fixed="right"><template #default="{ row }"><el-button v-for="b in opBtns(row)" :key="b.cmd" link :type="b.type" @click="sb.op(b.cmd, row)">{{ b.name }}</el-button></template></el-table-column>',
      '    </el-table>',
      '  </div>',
      // ===== 排程流水 =====
      '  <div v-show="sb.tab === \'log\'">',
      '    <div class="sb-query">',
      '      <el-form :inline="true" class="query-form">',
      '        <el-form-item label="样品编号"><el-input v-model="sb.logQ.样品编号" clearable placeholder="模糊查询" style="width:150px"></el-input></el-form-item>',
      '        <el-form-item label="操作类型"><el-select v-model="sb.logQ.操作类型" clearable placeholder="全部" style="width:130px"><el-option v-for="o in [\'自动排程\',\'手动排程\',\'调整排程\',\'取消排程\',\'锁定排程\',\'解锁排程\']" :key="o" :label="o" :value="o"></el-option></el-select></el-form-item>',
      '        <el-form-item label="检验仪器"><el-select v-model="sb.logQ.检验仪器" clearable filterable placeholder="全部" style="width:170px"><el-option v-for="o in data.instOpts" :key="o" :label="o" :value="o"></el-option></el-select></el-form-item>',
      '        <el-form-item label="报检单号"><el-input v-model="sb.logQ.报检单号" clearable placeholder="模糊查询" style="width:140px"></el-input></el-form-item>',
      '        <el-form-item label="操作人"><el-input v-model="sb.logQ.操作人" clearable placeholder="模糊查询" style="width:120px"></el-input></el-form-item>',
      '        <el-form-item label="操作时间"><el-date-picker v-model="sb.logQ.时间范围" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始" end-placeholder="结束" style="width:230px"></el-date-picker></el-form-item>',
      '        <el-form-item><el-button type="primary" @click="sb.logQuery()">查询</el-button><el-button @click="sb.logReset()">重置</el-button></el-form-item>',
      '      </el-form>',
      '    </div>',
      '    <div class="sb-toolbar">',
      '      <span class="sb-toolbar__t">排程流水 · 共 {{ data.logs.length }} 条</span>',
      '      <span class="sb-toolbar__b"><el-button @click="sb.exportLogs()">导出</el-button></span>',
      '    </div>',
      '    <el-table class="demo-data-table" :data="data.logs" border stripe max-height="540" empty-text="暂无流水">',
      '      <el-table-column type="index" label="序号" width="60"></el-table-column>',
      '      <el-table-column label="操作类型" width="96"><template #default="{ row }"><el-tag :type="row[\'操作类型\']===\'自动排程\'?\'primary\':(row[\'操作类型\']===\'取消排程\'?\'danger\':(row[\'操作类型\']===\'锁定排程\'?\'warning\':\'success\'))" size="small">{{ row[\'操作类型\'] }}</el-tag></template></el-table-column>',
      '      <el-table-column prop="样品编号" label="样品编号" width="130"></el-table-column>',
      '      <el-table-column prop="报检单号" label="报检单号" width="130"></el-table-column>',
      '      <el-table-column prop="物料名称" label="物料名称" width="150" show-overflow-tooltip></el-table-column>',
      '      <el-table-column prop="检验类" label="检验类" width="110"></el-table-column>',
      '      <el-table-column prop="检验班组" label="检验班组" width="130"></el-table-column>',
      '      <el-table-column prop="原排程" label="原排程" width="230" show-overflow-tooltip></el-table-column>',
      '      <el-table-column prop="新排程" label="新排程" width="230" show-overflow-tooltip></el-table-column>',
      '      <el-table-column prop="说明" label="说明" min-width="200" show-overflow-tooltip></el-table-column>',
      '      <el-table-column prop="操作人" label="操作人" width="80"></el-table-column>',
      '      <el-table-column prop="操作时间" label="操作时间" width="150"></el-table-column>',
      '    </el-table>',
      '  </div>',
      // ===== 排程 / 调整弹窗 =====
      '  <el-dialog v-model="sb.dlg.visible" :title="sb.dlg.title" width="680px" append-to-body :close-on-click-modal="false">',
      '    <table class="sb-head"><tr><th>样品编号</th><td>{{ sb.dlg.head.样品编号 }}</td><th>报检单号</th><td>{{ sb.dlg.head.报检单号 }}</td><th>检验类</th><td>{{ sb.dlg.head.检验类 }}</td></tr>',
      '    <tr><th>检验项</th><td colspan="3">{{ sb.dlg.head.检验项 }}</td><th>检验班组</th><td>{{ sb.dlg.head.检验班组 }}</td></tr>',
      '    <tr><th>适用仪器</th><td colspan="3">{{ sb.dlg.head.适用仪器 }}</td><th>优先级</th><td>{{ sb.dlg.head.优先级 }}</td></tr>',
      '    <tr><th>需求完成时间</th><td>{{ sb.dlg.head.需求完成时间 }}</td><th>取样时间</th><td>{{ sb.dlg.head.取样时间 }}</td><th></th><td></td></tr></table>',
      '    <el-form label-width="104px" style="margin-top:14px">',
      '      <el-form-item label="检验仪器" required><el-select v-model="sb.dlg.form.仪器" filterable placeholder="请选择" style="width:100%"><el-option v-for="o in sb.dlg.instOpts" :key="o" :label="o" :value="o"></el-option></el-select></el-form-item>',
      '      <el-form-item label="计划开始" required><el-date-picker v-model="sb.dlg.form.开始" type="datetime" value-format="YYYY-MM-DD HH:mm" format="YYYY-MM-DD HH:mm" placeholder="工作日 × 班次时段内" style="width:100%" @change="sb.dlgCalcEnd()"></el-date-picker></el-form-item>',
      '      <el-form-item label="计划工时" required><el-input-number v-model="sb.dlg.form.工时" :min="0.1" :max="24" :step="0.1" :precision="1" style="width:200px" @change="sb.dlgCalcEnd()"></el-input-number><span class="sb-unit">小时（成本方案标准系数）</span></el-form-item>',
      '      <el-form-item label="计划结束"><el-input :model-value="sb.dlg.form.结束" readonly placeholder="计划开始 + 工时自动计算"></el-input></el-form-item>',
      '      <el-form-item v-if="sb.dlg.mode === \'adjust\'" label="调整原因" required><el-input v-model="sb.dlg.form.原因" type="textarea" :rows="2" placeholder="写入调整流水说明"></el-input></el-form-item>',
      '    </el-form>',
      '    <template #footer><el-button @click="sb.dlg.visible = false">取消</el-button><el-button type="primary" @click="sb.saveSched()">确定</el-button></template>',
      '  </el-dialog>',
      // ===== 任务详情弹窗 =====
      '  <el-dialog v-model="sb.detail.visible" title="排程任务详情" width="600px" append-to-body>',
      '    <el-descriptions v-if="sb.detail.task" :column="2" border size="small">',
      '      <el-descriptions-item label="样品编号">{{ sb.detail.task[\'样品编号\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="检验类">{{ sb.detail.task[\'检验类\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="检验项" :span="2">{{ sb.detail.task[\'检验项\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="报检单号">{{ sb.detail.task[\'报检单号\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="报检类型">{{ sb.detail.task[\'报检类型\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="物料">{{ sb.detail.task[\'物料编码\'] }} / {{ sb.detail.task[\'物料名称\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="优先级">{{ sb.detail.task[\'优先级\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="检验班组">{{ sb.detail.task[\'检验班组\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="适用仪器">{{ sb.detail.task[\'适用仪器\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="检验仪器">{{ sb.detail.task[\'检验仪器\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="计划开始">{{ sb.detail.task[\'计划开始\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="计划结束">{{ sb.detail.task[\'计划结束\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="计划工时">{{ sb.detail.task[\'计划工时\'] }}h</el-descriptions-item>',
      '      <el-descriptions-item label="排程方式">{{ sb.detail.task[\'排程方式\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="班次">{{ sb.detail.task[\'班次\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="检验日历">{{ sb.detail.task[\'检验日历\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="需求完成时间">{{ sb.detail.task[\'需求完成时间\'] }}</el-descriptions-item>',
      '      <el-descriptions-item label="排程状态"><el-tag :type="tagType(sb.detail.task[\'排程状态\'])" size="small">{{ sb.detail.task[\'排程状态\'] }}</el-tag></el-descriptions-item>',
      '      <el-descriptions-item label="锁定"><el-tag v-if="sb.detail.task[\'锁定\']===\'是\'" type="warning" size="small">锁定</el-tag><span v-else>未锁定</span></el-descriptions-item>',
      '      <el-descriptions-item v-if="sb.detail.task[\'超期\']!==\'—\'" label="预警"><el-tag type="danger" size="small">{{ sb.detail.task[\'超期\'] }}</el-tag></el-descriptions-item>',
      '    </el-descriptions>',
      '  </el-dialog>',
      '</section>'
    ].join('\n')
  };
  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsSchedBoard = QmsSchedBoard;
})();
