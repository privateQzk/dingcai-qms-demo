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
    data: function () { return { chart: null, win: null, selKeys: {}, boxSel: false, marquee: null }; },
    watch: {
      'data.gantt': { deep: true, handler: function () { this.$nextTick(this.renderChart); } },
      // range 每次重算都是新数组——只有「日/周切换、翻页、回到今天」真正改变区间值时才重置视野；
      // 拖动/排程/数据刷新引起的重算保持用户当前窗口，不再弹回锚点
      'data.range': { handler: function (v, ov) { if (v && ov && (v[0] !== ov[0] || v[1] !== ov[1])) this.win = v.slice(); this.$nextTick(this.renderChart); } },

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
        // 像素↔时间/行 全部按 grid 常量 + 当前 win 窗口手算
        var dom = this.$refs.gantt;
        var drag = null;
        var plot = function () { var h = dom.clientHeight; return { l: 190, r: dom.clientWidth - 30, t: 10, b: h - 26 }; };
        var win = function () { return self.win || self.data.range || [0, 0]; };
        // ECharts 自带 dataZoom 鼠标交互在本页环境下会崩（inside 平移/缩放与滑条均失效且抛内部异常），
        // 改为自管窗口 win + xAxis.min/max（setOption 路径正常），缩放/平移/滑条全部手工实现
        self._onWheel = function (ev) {
          if (!self.chart || !dom.contains(ev.target)) return;
          var r0 = dom.getBoundingClientRect(), px0 = ev.clientX - r0.left, g0 = plot();
          if (px0 < g0.l || px0 > g0.r) return;
          ev.preventDefault();
          var w = win(), anchor = w[0] + (px0 - g0.l) / Math.max(1, g0.r - g0.l) * (w[1] - w[0]);
          var k = ev.deltaY < 0 ? 0.8 : 1.25;
          self.applyWin(anchor - (anchor - w[0]) * k, anchor + (w[1] - anchor) * k);
        };
        dom.addEventListener('wheel', self._onWheel, { passive: false });
        var xToT = function (px) { var g = plot(), w = win(); return w[0] + (px - g.l) / Math.max(1, g.r - g.l) * (w[1] - w[0]); };
        var yToRow = function (py) { var g = plot(), n = Math.max(1, (self.data.ganttInsts || []).length); return (py - g.t) / ((g.b - g.t) / n); };
        var toVal = function (cx, cy) {
          var r = dom.getBoundingClientRect();
          return [xToT(cx - r.left), yToRow(cy - r.top)];
        };
        // 任务块的像素矩形（命中/框选相交共用）
        var rectOf = function (v) {
          var insts = self.data.ganttInsts || [];
          var g = plot(), n = Math.max(1, insts.length), bandH = (g.b - g.t) / n, w = win();
          var tx = function (t) { return g.l + (t - w[0]) / (w[1] - w[0]) * (g.r - g.l); };
          var inner = bandH * 0.8, lh = inner / (v[4] || 1);
          var cy = g.t + (v[0] + 0.5) * bandH - inner / 2 + (v[3] || 0) * lh + lh / 2;
          var x1 = tx(v[1]), x2 = tx(v[2]);
          return { x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: cy - lh / 2, y2: cy + lh / 2 };
        };
        var hitIdx = function (px, py) {
          var items = self.data.gantt || [], insts = self.data.ganttInsts || [];
          if (!insts.length) return -1;
          for (var i = items.length - 1; i >= 0; i--) {
            var rc = rectOf(items[i].value);
            if (px >= rc.x1 - 2 && px <= rc.x2 + 2 && py >= rc.y1 - 2 && py <= rc.y2 + 2) return i;
          }
          return -1;
        };
        var finish = function (commit) {
          if (!drag) return;
          var insts = self.data.ganttInsts || [];
          if (drag.marquee) {
            // 框选：位移<4px 当空白单击（非 Shift 则清空选择）；否则按矩形相交选中任务块
            if (drag.marquee.moved) {
              var it2 = self.data.gantt || [], add = drag.marquee.add, picked = {};
              it2.forEach(function (it) {
                if (!it.t || !it.t._key) return;
                var rc = rectOf(it.value), r = drag.marquee;
                var l = Math.min(r.x0, r.x1), rt = Math.max(r.x0, r.x1), tp = Math.min(r.y0, r.y1), bt = Math.max(r.y0, r.y1);
                if (rc.x1 <= rt && rc.x2 >= l && rc.y1 <= bt && rc.y2 >= tp) picked[it.t._key] = 1;
              });
              self.selKeys = add ? Object.assign({}, self.selKeys, picked) : picked;
              self.renderChart();
            } else if (!drag.marquee.add) { self.selKeys = {}; self.renderChart(); }
            self.marquee = null;
            self._suppressClick = true;
            drag = null;
            return;
          }
          if (drag.group) {
            if (commit && drag.moved && drag.curDelta) {
              self._suppressClick = true;
              var entries = drag.group.map(function (m) { return { t: m.t, instName: insts[m.row], s: m.curS, e: m.curE }; });
              if (self.sb && self.sb.dropMulti) self.sb.dropMulti(entries);
              else if (self.sb && self.sb.drop) entries.forEach(function (en) { self.sb.drop(en.t, en.instName, en.s, en.e); });
            }
            if (drag.moved) self.renderChart();
            drag = null;
            return;
          }
          if (!drag.pan && commit && drag.moved && self.sb && self.sb.drop) {
            self._suppressClick = true;
            self.sb.drop(drag.t, insts[drag.curRow], drag.curS, drag.curE);
          }
          if (!drag.pan && drag.moved) self.renderChart();
          drag = null;
        };
        self._dragMove = function (ev) {
          if (!drag) return;
          if (ev.buttons === 0) { finish(false); return; }
          if (drag.marquee) {
            var rcq = dom.getBoundingClientRect();
            drag.marquee.x1 = ev.clientX - rcq.left;
            drag.marquee.y1 = ev.clientY - rcq.top;
            if (Math.abs(drag.marquee.x1 - drag.marquee.x0) + Math.abs(drag.marquee.y1 - drag.marquee.y0) > 4) drag.marquee.moved = true;
            var m = drag.marquee;
            self.marquee = { x: Math.min(m.x0, m.x1), y: Math.min(m.y0, m.y1), w: Math.abs(m.x1 - m.x0), h: Math.abs(m.y1 - m.y0) };
            return;
          }
          if (drag.group) {
            var ptg = toVal(ev.clientX, ev.clientY);
            if (!isFinite(ptg[0])) return;
            var delta = Math.round((ptg[0] - drag.grab) / 900000) * 900000;
            if (delta === drag.curDelta) return;
            drag.curDelta = delta; drag.moved = true;
            var items2 = drag.base.map(function (it) { return Object.assign({}, it, { value: it.value.slice() }); });
            drag.group.forEach(function (mm) {
              mm.curS = mm.s0 + delta; mm.curE = mm.s0 + delta + mm.dur;
              items2[mm.gi].value = [mm.row, mm.curS, mm.curE, mm.lane, mm.lanes];
            });
            self.chart.setOption({ series: [{ data: items2 }] });
            return;
          }
          if (drag.pan) {
            // 用抓取时窗口 win0 做映射（当前窗口随平移在动，复算会残差），保证抓取点始终贴手
            var rc = dom.getBoundingClientRect(), gp = plot();
            var pxt = drag.win0[0] + (ev.clientX - rc.left - gp.l) / Math.max(1, gp.r - gp.l) * (drag.win0[1] - drag.win0[0]);
            if (!isFinite(pxt)) return;
            self.applyWin(drag.win0[0] - (pxt - drag.grab), drag.win0[1] - (pxt - drag.grab));
            return;
          }
          var insts = self.data.ganttInsts || [];
          var pt = toVal(ev.clientX, ev.clientY);
          if (!isFinite(pt[0]) || !isFinite(pt[1])) return;
          var ns = Math.round((drag.s0 + (pt[0] - drag.grab)) / 900000) * 900000;
          var nr = Math.round(pt[1]);
          if (nr < 0) nr = 0; if (nr > insts.length - 1) nr = insts.length - 1;
          if (insts[nr] && drag.cands.indexOf(insts[nr]) < 0) nr = drag.curRow;
          if (ns !== drag.curS || nr !== drag.curRow) {
            drag.curS = ns; drag.curE = ns + drag.dur; drag.curRow = nr; drag.moved = true;
            var items = drag.base.map(function (it) { return Object.assign({}, it, { value: it.value.slice() }); });
            items[drag.gi].value = [nr, ns, ns + drag.dur, 0, 1];
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
          if (idx < 0) {
            var g0 = plot();
            if (px >= g0.l && px <= g0.r && py >= g0.t && py <= g0.b) {
              // Shift+拖拽 或「框选」开关开启：拉框多选；否则空白拖拽平移
              if (ev.shiftKey || self.boxSel) {
                drag = { marquee: { x0: px, y0: py, x1: px, y1: py, moved: false, add: ev.shiftKey } };
              } else {
                var p0 = toVal(ev.clientX, ev.clientY);
                if (isFinite(p0[0])) drag = { pan: true, grab: p0[0], win0: win().slice() };
              }
              if (drag) { ev.preventDefault(); ev.stopPropagation(); }
            }
            return;
          }
          var item = (self.data.gantt || [])[idx], t = item && item.t;
          if (!t || !self.sb || !self.sb.drop) return;
          // 不可调整的块：吞掉按下事件，不让 ECharts inside 平移接管（其内部换算在这条 category 轴上会抛 clampData）；点击仍走 chart click 开详情
          if (!self.canMove(t)) { ev.stopPropagation(); return; }
          // 命中已选中的块：整组水平平移（各块行/仪器不变，只同步时间位移）
          var key = t._key;
          if (key && self.selKeys[key] && Object.keys(self.selKeys).length > 1) {
            var ptG = toVal(ev.clientX, ev.clientY);
            if (!isFinite(ptG[0])) return;
            var items0 = self.data.gantt || [], group = [];
            items0.forEach(function (it, gi2) {
              var it2 = it.t;
              if (!it2 || !self.selKeys[it2._key] || !self.canMove(it2)) return;
              group.push({ t: it2, gi: gi2 + (self._shadeItems || []).length, row: it.value[0], lane: it.value[3], lanes: it.value[4], s0: it.value[1], dur: it.value[2] - it.value[1], curS: it.value[1], curE: it.value[2] });
            });
            if (group.length) {
              drag = {
                group: group, moved: false, grab: ptG[0], curDelta: 0,
                base: (self._shadeItems || []).concat(items0).map(function (it) { return Object.assign({}, it, { value: it.value.slice() }); })
              };
              ev.preventDefault();
            }
            return;
          }
          // 按下未选中的块：清空框选集合（Shift 点按保留集合用于累加语义在框选侧处理）
          if (Object.keys(self.selKeys).length) { self.selKeys = {}; self.renderChart(); }
          var pt = toVal(ev.clientX, ev.clientY);
          if (!isFinite(pt[0]) || !isFinite(pt[1])) return;
          drag = {
            t: t, idx: idx, gi: idx + (self._shadeItems || []).length, moved: false, curRow: item.value[0], grab: pt[0],
            dur: item.value[2] - item.value[1], s0: item.value[1],
            curS: item.value[1], curE: item.value[2],
            cands: (t._sameType || []),
            // 系列数据 = 底纹项 + 任务块，ghost 快照须保持同一结构
            base: (self._shadeItems || []).concat(self.data.gantt || []).map(function (it) { return Object.assign({}, it, { value: it.value.slice() }); })
          };
          ev.preventDefault();
        };
        window.addEventListener('mousedown', self._dragDown, true);
        this.renderChart();
      },
      // 缩放/平移/滑条统一入口：窗口裁剪到 fullRange 并保证最小跨度，再落到 xAxis.min/max
      applyWin: function (ns, ne) {
        var full = this.data.fullRange || this.data.range || [0, 0];
        var span = ne - ns, fspan = Math.max(full[1] - full[0], 1), minSpan = 30 * 60000;
        if (span < minSpan) { var c = (ns + ne) / 2; ns = c - minSpan / 2; ne = c + minSpan / 2; }
        if (ne - ns >= fspan) { ns = full[0]; ne = full[1]; }
        else {
          if (ns < full[0]) { ne += full[0] - ns; ns = full[0]; }
          if (ne > full[1]) { ns -= ne - full[1]; ne = full[1]; }
          if (ns < full[0]) ns = full[0];
        }
        this.win = [ns, ne];
        if (this.chart) this.chart.setOption({ xAxis: { min: ns, max: ne } });
      },
      sliderWinStyle: function () {
        var f = this.data.fullRange || this.data.range || [0, 1], w = this.win || f;
        var span = Math.max(f[1] - f[0], 1);
        var l = Math.min(100, Math.max(0, (w[0] - f[0]) / span * 100));
        var r = Math.min(100, Math.max(0, (f[1] - w[1]) / span * 100));
        return { left: l + '%', right: r + '%' };
      },
      sliderDown: function (ev, part) {
        var tr = this.$refs.sliderTrack.getBoundingClientRect();
        var f = this.data.fullRange || this.data.range || [0, 1], w0 = (this.win || f).slice(), self = this;
        var mv = function (e) {
          var dx = (e.clientX - ev.clientX) / Math.max(1, tr.width) * (f[1] - f[0]);
          var ns = w0[0], ne = w0[1];
          ns += dx; ne += dx;
          self.applyWin(ns, ne);
        };
        var up = function () { window.removeEventListener('mousemove', mv, true); window.removeEventListener('mouseup', up, true); };
        window.addEventListener('mousemove', mv, true); window.addEventListener('mouseup', up, true);
        ev.preventDefault(); ev.stopPropagation();
      },
      // 首次进入：窗口=当前日视图（00:00~24:00，96 个 15 分钟格），不随块群拉伸
      initWin: function () {
        var r = this.data.range || [0, 0];
        return r.slice();
      },
      // 点轨道空白：窗口中心跳到该位置
      sliderTrackDown: function (ev) {
        var tr = ev.currentTarget.getBoundingClientRect();
        var f = this.data.fullRange || this.data.range || [0, 1], w = this.win || f, span = w[1] - w[0];
        var c = f[0] + (ev.clientX - tr.left) / Math.max(1, tr.width) * (f[1] - f[0]);
        this.applyWin(c - span / 2, c + span / 2);
      },
      statusColor: function (st) { return STATUS_COLORS[st] || '#94A3B8'; },
      renderChart: function () {
        if (!this.chart) { this.initChart(); return; }
        var self = this;
        var insts = this.data.ganttInsts || [];
        var items = this.data.gantt || [];
        var shades = this.data.shades || [];
        var now = this.data.nowMs || 0;
        // 非工作底纹/当前线合并进同一条 custom 系列的数据项（shade/nowline 标志），放在任务块前先渲染垫底：
        // markArea/markLine 与第二条 custom 系列在本图 dataZoom 交互重算时都会崩（clampData / coordSys 丢失），单系列自绘最稳
        var shadeItems = shades.map(function (r) { return { value: [0, r[0], r[1]], shade: 1 }; });
        if (now) shadeItems.push({ value: [1, now, now], nowline: 1 });
        self._shadeItems = shadeItems;
        if (!this.win) this.win = this.initWin();
        var win = this.win;
        // 刻度文字自绘：time 轴原生 label 会抽稀且 interval:0 不生效；每 15 分钟一格（跨度过大时自适应加粗到 30/60 分钟）
        var tickSpan = win[1] - win[0];
        var tickStep = tickSpan <= 30 * 3600000 ? 900000 : (tickSpan <= 78 * 3600000 ? 1800000 : 3600000);
        var tickItems = [];
        for (var tt = Math.ceil(win[0] / tickStep) * tickStep; tt <= win[1]; tt += tickStep) {
          tickItems.push({ value: [2, tt, tt], tick: 1 });
        }
        var dataArr = shadeItems.concat(tickItems, items);
        var full = this.data.fullRange || win;
        var option = {
          animation: false,
          grid: { left: 190, right: 30, top: 10, bottom: 72 },
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
            type: 'time', min: win[0], max: win[1], interval: 900000,
            axisLabel: { show: false },
            splitLine: { show: true, lineStyle: { color: '#D5DEE9' } }
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
          series: [{
            type: 'custom', clip: false,
            renderItem: function (params, api) {
              var d = dataArr[params.dataIndex] || {};
              if (d.tick) {
                var tx = api.coord([api.value(1), 0])[0];
                var nT = insts.length || 1, bHT = api.size([0, 1])[1];
                var yBtm = api.coord([api.value(1), nT - 1])[1] + bHT / 2;
                var dd = new Date(api.value(1)); var pp = function (n) { return String(n).padStart(2, '0'); };
                var txt = (dd.getHours() === 0 && dd.getMinutes() === 0)
                  ? (dd.getMonth() + 1) + '-' + pp(dd.getDate())
                  : pp(dd.getHours()) + ':' + pp(dd.getMinutes());
                return { type: 'group', silent: true,
                  x: tx + 3, y: yBtm + 44, rotation: -Math.PI / 2,
                  children: [{ type: 'text', silent: true,
                    style: { x: 0, y: 0, text: txt, fill: '#64748B', fontSize: 10, align: 'left', verticalAlign: 'middle' } }] };
              }
              if (d.shade || d.nowline) {
                var n0 = insts.length || 1, bH0 = api.size([0, 1])[1];
                var yT = api.coord([api.value(1), 0])[1] - bH0 / 2;
                var yB = api.coord([api.value(1), n0 - 1])[1] + bH0 / 2;
                var x0 = api.coord([api.value(1), 0])[0];
                if (d.nowline) {
                  return { type: 'group', children: [
                    { type: 'line', shape: { x1: x0, y1: yT, x2: x0, y2: yB }, style: { stroke: '#EF4444', lineDash: [4, 4], lineWidth: 1.5 }, silent: true },
                    { type: 'text', style: { x: x0 + 3, y: yT + 2, text: '当前', fill: '#EF4444', fontSize: 10 }, silent: true }
                  ] };
                }
                var x1 = api.coord([api.value(2), 0])[0];
                return { type: 'rect', shape: { x: x0, y: yT, width: Math.max(x1 - x0, 1), height: yB - yT }, style: { fill: 'rgba(148,163,184,0.14)' }, silent: true };
              }
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
              var t = d.t || {};
              var alert = t['超期'] && t['超期'] !== '—';
              var fill = self.statusColor(t['排程状态']);
              var draggable = self.canMove(t);
              var picked = !!(t._key && self.selKeys[t._key]);
              var pfx = 'blk-' + params.dataIndex;
              var kids = [{
                type: 'rect',
                shape: { x: s[0], y: y, width: w, height: h, r: 3 },
                style: picked
                  ? { fill: fill, stroke: '#1D4ED8', lineWidth: 2, shadowBlur: 6, shadowColor: 'rgba(37,99,235,0.55)' }
                  : { fill: fill, stroke: alert ? '#DC2626' : 'transparent', lineWidth: alert ? 2 : 0 },
                name: pfx, x: 0, y: 0,
                cursor: draggable ? 'grab' : 'pointer'
              }];
              if (picked && w > 16) {
                kids.push({ type: 'rect', name: pfx + '-s', x: 0, y: 0, shape: { x: s[0] + 1.5, y: y + 1.5, width: w - 3, height: h - 3, r: 2 }, style: { stroke: 'rgba(255,255,255,0.85)', lineWidth: 1, fill: 'none' }, silent: true });
              }
              if (t['优先级'] === '高') {
                kids.push({ type: 'rect', name: pfx + '-a', x: 0, y: 0, shape: { x: s[0], y: y, width: 4, height: h, r: [3, 0, 0, 3] }, style: { fill: '#F97316' }, silent: true });
              }
              if (t['锁定'] === '是' && w > 20) {
                var lx = s[0] + w - 13, ly = y + h / 2;
                kids.push({ type: 'circle', name: pfx + '-b', x: 0, y: 0, shape: { cx: lx + 4.5, cy: ly - 4, r: 2.5 }, style: { stroke: '#fff', fill: 'none', lineWidth: 1.6 }, silent: true });
                kids.push({ type: 'rect', name: pfx + '-c', x: 0, y: 0, shape: { x: lx, y: ly - 2, width: 9, height: 6, r: 1 }, style: { fill: '#fff' }, silent: true });
              }
              // 任务信息始终展示：块宽放得下→块内白字，放不下→块右侧深色字
              if (w > 34) {
                kids.push({
                  type: 'text', silent: true, name: pfx + '-d', x: 0, y: 0,
                  style: {
                    x: s[0] + 7, y: y + h / 2, text: t['样品编号'] + '·' + t['检验类'],
                    fill: '#fff', fontSize: 11, align: 'left', verticalAlign: 'middle',
                    width: w - 10, overflow: 'truncate'
                  }
                });
              } else {
                kids.push({
                  type: 'text', silent: true, name: pfx + '-d', x: 0, y: 0,
                  style: {
                    x: s[0] + w + 4, y: y + h / 2, text: t['样品编号'] + '·' + t['检验类'],
                    fill: '#475569', fontSize: 10, align: 'left', verticalAlign: 'middle'
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
            data: dataArr
          }]
        };
        this.chart.setOption(option, true);
        try { this.chart.getZr().setCursorStyle(this.boxSel ? 'crosshair' : 'default'); } catch (e) { /* zrender 兜底 */ }
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
      /** 框选集合：_key→1 的对象，选中块高亮并可整组平移/批量操作 */
      selCount: function () { return Object.keys(this.selKeys).length; },
      selMovableCount: function () {
        var self = this, n = 0;
        (this.data.gantt || []).forEach(function (it) { if (it.t && self.selKeys[it.t._key] && self.canMove(it.t)) n++; });
        return n;
      },
      clearSel: function () { this.selKeys = {}; this.renderChart(); },
      toggleBoxSel: function () { this.boxSel = !this.boxSel; this.renderChart(); },
      /** 浮动条批量操作：把选中 _key 交给 app 侧复用任务表的批量逻辑 */
      selBatch: function (act) {
        var keys = Object.keys(this.selKeys);
        if (!keys.length || !this.sb) return;
        this.sb.sel = keys;
        if (act === 'lock' && this.sb.batchLock) this.sb.batchLock();
        else if (act === 'unlock' && this.sb.batchUnlock) this.sb.batchUnlock();
        else if (act === 'cancel' && this.sb.batchCancel) this.sb.batchCancel();
      },
      /** 可否调整（拖动/调整弹窗共用判定，逻辑在 app 侧 sb.canMove） */
      canMove: function (t) {
        if (this.sb && this.sb.canMove) return !!this.sb.canMove(t);
        return !!(t && t['排程状态'] === '已排程' && t['锁定'] !== '是');
      },
      opBtns: function (row) {
        if (row['排程状态'] === '待排程') return [{ name: '排程', cmd: 'sched', type: 'primary' }];
        if (row['排程状态'] === '已排程') {
          if (row['锁定'] === '是') return [{ name: '解锁', cmd: 'unlock', type: 'warning' }];
          return [{ name: '调整', cmd: 'adjust', type: 'primary' }, { name: '取消', cmd: 'cancel', type: 'danger' }, { name: '锁定', cmd: 'lock', type: 'warning' }];
        }
        // 检验中/已完成：未来时段仍可调整（提前检验/提前完成需手动更新甘特）
        if (this.canMove(row)) return [{ name: '调整', cmd: 'adjust', type: 'primary' }];
        if (row['锁定'] === '是') return [{ name: '解锁', cmd: 'unlock', type: 'warning' }];
        return [];
      }
    },
    template: [
      '<section class="sched-board">',
      '  <div class="sb-tabs">',
      '    <button v-for="t in [[\'board\',\'排程看板\'],[\'tasks\',\'排程任务\'],[\'log\',\'排程流水\']]" :key="t[0]"',
      '      class="sb-tab" :class="{ \'sb-tab--on\': sb.tab === t[0] }" @click="sb.setTab(t[0])">{{ t[1] }}</button>',
      '  </div>',
      // ===== 排程看板 =====
      '  <div v-show="sb.tab === \'board\'" class="sb-board">',
      '    <div class="sb-board__bar">',
      '      <span class="sb-view">日视图</span>',
      '      <el-button size="small" @click="sb.nav(-1)">‹</el-button>',
      '      <el-button size="small" @click="sb.today()">今天</el-button>',
      '      <el-button size="small" @click="sb.nav(1)">›</el-button>',
      '      <span class="sb-range">{{ data.rangeText }}</span>',
      '      <el-button size="small" :type="boxSel ? \'primary\' : \'default\'" @click="toggleBoxSel()">框选</el-button>',
      '      <span class="sb-legend">',
      '        <i class="sb-legend__i" style="background:#3B82F6"></i>已排程',
      '        <i class="sb-legend__i" style="background:#F59E0B"></i>检验中',
      '        <i class="sb-legend__i" style="background:#22C55E"></i>已完成',
      '        <i class="sb-legend__i sb-legend__i--line"></i>逾期',
      '        <i class="sb-legend__i" style="background:#F97316;width:4px"></i>高优先级',
      '      </span>',
      '      <span class="sb-now">演示基准：{{ data.now }}</span>',
      '    </div>',
      '    <div class="sb-gantt__wrap">',
      '      <div ref="gantt" class="sb-gantt"></div>',
      '      <div v-show="marquee" class="sb-marquee" :style="marquee ? { left: marquee.x + \'px\', top: marquee.y + \'px\', width: marquee.w + \'px\', height: marquee.h + \'px\' } : {}"></div>',
      '      <div v-show="selCount()" class="sb-selbar">',
      '        <span>已选 {{ selCount() }} 个任务（可移动 {{ selMovableCount() }}）</span>',
      '        <el-button size="small" type="warning" @click="selBatch(\'lock\')">锁定</el-button>',
      '        <el-button size="small" @click="selBatch(\'unlock\')">解锁</el-button>',
      '        <el-button size="small" type="danger" @click="selBatch(\'cancel\')">取消排程</el-button>',
      '        <el-button size="small" link @click="clearSel()">清除选择</el-button>',
      '      </div>',
      '    </div>',
      '    <div ref="sliderTrack" class="sb-slider" @mousedown="sliderTrackDown">',
      '      <div class="sb-slider__win" :style="sliderWinStyle()" @mousedown.stop="sliderDown($event, \'m\')"></div>',
      '    </div>',
      '    <div class="sb-board__tip">点击任务块查看详情；拖动任务块左右改时间、上下换仪器（仅同类型仪器行可落）；锁定、已过去的已完成/检验中及当前检验中的任务不可拖；Shift+空白拖拽或开启「框选」后拖拽可拉框多选，选中后拖动任一块整组平移，浮动条可批量锁定/解锁/取消；空白处拖拽平移、滚轮缩放、下方滑条拖动查看（窗口大小固定不可缩放）；灰色底纹为非工作时段</div>',
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
