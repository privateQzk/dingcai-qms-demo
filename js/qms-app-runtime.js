/* 鼎材 QMS APP 运行时。模块清单由 gen_qms_app.py 写在本文件之前的 QMS_APP_MODULES。 */
(function () {
  const MODS = window.QMS_APP_MODULES || [];
  const byId = {};
  MODS.forEach(m => { byId[m.id] = m; });

  function rowsOf(pageId, tab) {
    const mock = window.WMS_MOCK_ROWS || {};
    const bag = mock[pageId];
    if (!bag) return [];
    if (tab && Array.isArray(bag[tab])) return bag[tab];
    if (Array.isArray(bag.main)) return bag.main;
    if (Array.isArray(bag)) return bag;
    const hit = Object.keys(bag).map(k => bag[k]).find(v => Array.isArray(v));
    return hit || [];
  }
  function pageOf(pageId) {
    const pages = (window.WMS_PAGE_CONFIGS && window.WMS_PAGE_CONFIGS.pages) || {};
    return pages[pageId] || null;
  }
  function viewOf(pageId, tab) {
    const page = pageOf(pageId);
    if (!page) return null;
    const views = page.tabViews || [];
    if (tab && views.length) return views.find(v => v.name === tab) || views[0];
    if (views.length) return views[0];
    return page;
  }
  function colNames(pageId, tab) {
    const view = viewOf(pageId, tab);
    const cols = (view && (view.columns || view.cols)) || [];
    return cols.map(c => c.title || c.field || c.name).filter(n => n && n !== '操作' && n !== '序号');
  }
  function rowOps(pageId, tab) {
    const view = viewOf(pageId, tab);
    const ops = (view && view.rowOps) || [];
    const skip = { '编辑': 1, '复制': 1, '删除': 1, '详情': 1, '批量删除': 1 };
    return ops.map(o => (o && o.name) || o).filter(n => n && !skip[n]);
  }

  const home = [];
  const menuMap = {};
  MODS.forEach(m => {
    if (m.kind === 'login' || m.kind === 'home' || m.kind === 'msg' || m.kind === 'mine') return;
    // 首页按业务小节卡片分组（如「报检及取样」「检验结果查询」），与 APP 架构 section 一致
    const groupTitle = m.section || m.homeGroup || m.group || '其他';
    let g = home.find(x => x.group === groupTitle);
    if (!g) { g = { group: groupTitle, items: [] }; home.push(g); }
    g.items.push(Object.assign({ ready: true, qms: true }, m));
    if (!menuMap[m.group]) menuMap[m.group] = {};
    if (!menuMap[m.group][m.section]) menuMap[m.group][m.section] = [];
    menuMap[m.group][m.section].push(m);
  });
  const menu = [{
    index: 'base',
    title: '底座',
    children: [
      { index: 'app-home', title: '首页' },
      { index: 'app-login', title: '登陆' },
      { index: 'app-msg', title: '消息', children: [
        { index: 'app-msg-my', title: '我的消息' },
        { index: 'app-msg-audit', title: '我的审核' },
        { index: 'app-msg-init', title: '我的发起' }
      ]},
      { index: 'app-mine', title: '我的' }
    ]
  }];
  Object.keys(menuMap).forEach(g => {
    const children = Object.keys(menuMap[g]).map(sec => ({
      index: 'sec-' + g + '-' + sec,
      title: sec,
      children: menuMap[g][sec].map(m => ({ index: m.id, title: m.name }))
    }));
    menu.push({ index: 'g-' + g, title: g, children });
  });
  const openeds = menu.map(m => m.index);

  function install(ctx) {
    const qms = Vue.reactive({
      item: null,
      kw: '',
      row: null,
      mode: 'list',
      samples: [],
      picked: [],
      seq: 1,
      qty: '',
      team: '',
      scheme: '',
      remark: '',
      due: '',
      loc: '',
      dest: '',
      account: '管理员',
      password: '',
      patches: {}
    });
    function toast(msg) { ctx.toast(msg); }
    function currentItem() { return qms.item; }
    function patched(row) {
      if (!row) return row;
      const p = qms.patches[row.id];
      return p ? Object.assign({}, row, p) : row;
    }
    function listRows() {
      const it = qms.item;
      if (!it) return [];
      let list = rowsOf(it.pageId, it.tab).map(patched);
      if (it.kind === 'insp') {
        const live = list.filter(r => r['单据状态'] === '待执行' || r['单据状态'] === '执行中');
        if (live.length) list = live;
      }
      const kw = String(qms.kw || '').trim();
      if (!kw) return list;
      return list.filter(r => Object.keys(r).some(k => k[0] !== '_' && String(r[k] == null ? '' : r[k]).indexOf(kw) >= 0));
    }
    function cols() {
      const it = qms.item;
      if (!it) return [];
      return colNames(it.pageId, it.tab);
    }
    function text(row, key) {
      const v = row && row[key];
      if (v == null) return '';
      const s = String(v).trim();
      return s === '—' ? '' : s;
    }
    function join(row, a, b) {
      return [text(row, a), text(row, b)].filter(Boolean).join(' ');
    }
    function titleOf(row) {
      const keys = cols();
      const prefer = ['报检单号', '计划单号', '入库单号', '出库单号', '样品编号', '仪器编号', '单号', '编码', '名称'];
      for (const k of prefer) if (text(row, k)) return text(row, k);
      for (const k of keys) if (/单号$|编号$|编码$/.test(k) && text(row, k)) return text(row, k);
      for (const k of keys) if (text(row, k)) return text(row, k);
      return row.id || '—';
    }
    function statusOf(row) {
      const keys = cols();
      const hit = keys.find(k => /状态$/.test(k) && text(row, k));
      return hit ? { k: hit, v: text(row, hit) } : null;
    }
    function cardPairs(row) {
      if (qms.item && (qms.item.kind === 'insp' || qms.item.kind === 'result')) {
        const pairs = [
          ['到货通知单号', text(row, '到货通知单号')],
          ['物料信息', join(row, '物料编码', '物料名称')],
          ['供应商信息', text(row, '供应商名称') ? join(row, '供应商编码', '供应商名称') : ''],
          ['客户信息', !text(row, '供应商名称') && text(row, '客户名称') ? join(row, '客户编码', '客户名称') : ''],
          ['报检批号', text(row, '报检批号') || text(row, '厂内批号')],
          ['报检件数', text(row, '报检件数')],
          ['报检数量', text(row, '报检数量')],
          ['基本单位', text(row, '基本单位')],
          ['检验班组', text(row, '检验班组')],
          ['报检人', text(row, '报检人')],
          ['采样点', text(row, '采样点')],
          ['备注', text(row, '报检备注') || text(row, '备注')],
          ['报检时间', text(row, '报检时间')]
        ];
        if (qms.item.kind === 'result') {
          pairs.unshift(['复核结论', text(row, '复核结论')]);
          pairs.push(['检验完成件数', text(row, '检验完成件数')]);
        }
        return pairs.filter(p => p[1]);
      }
      const st = statusOf(row);
      return cols().filter(k => k !== (st && st.k) && text(row, k)).slice(0, 8).map(k => [k, text(row, k)]);
    }
    function stats(row) {
      if (!qms.item || qms.item.kind !== 'insp') return [];
      return ['应取样件数', '已取样件数', '待取样件数'].map(k => ({ k, v: text(row, k) || '0' }));
    }
    function detailPairs(row) {
      return cols().map(k => [k, row[k] == null || row[k] === '' ? '—' : String(row[k])]);
    }
    function schemes() {
      const tab = (qms.item && qms.item.tab) || 'tab-pi';
      const list = rowsOf('insp-scheme', tab);
      const names = [];
      list.forEach(r => {
        if (r['启用状态'] && r['启用状态'] !== '启用') return;
        const n = r['检验方案名称'];
        if (n && names.indexOf(n) < 0) names.push(n);
      });
      return names;
    }
    function teams(row) {
      const names = [];
      const add = v => { if (v && names.indexOf(v) < 0) names.push(v); };
      add(text(row, '检验班组'));
      rowsOf('insp-team').forEach(r => { if (!r['启用状态'] || r['启用状态'] === '启用') add(r['班组名称']); });
      ['来料检一组', '过程检一组', '钢瓶检一组'].forEach(add);
      return names;
    }
    function ymd() {
      const d = new Date();
      return String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    }
    function nextCode() {
      const n = qms.seq++;
      return 'YP' + ymd() + String(n).padStart(3, '0');
    }
    function open(it) {
      if (!it) return;
      qms.item = it;
      qms.kw = '';
      qms.row = null;
      qms.mode = 'list';
      qms.samples = [];
      qms.picked = [];
      ctx.menuActive.value = it.id;
      if (it.kind === 'home') { ctx.view.value = 'home'; return; }
      if (it.kind === 'mine') { ctx.view.value = 'mine'; return; }
      if (it.kind === 'login') { ctx.view.value = 'qms-login'; return; }
      if (it.kind === 'msg') {
        ctx.view.value = 'msg';
        if (ctx.msgSubTab) ctx.msgSubTab.value = it.msgTab || 'myMsg';
        return;
      }
      ctx.flowId.value = it.pageId || '';
      ctx.view.value = 'qms';
    }
    function back() {
      if (qms.mode === 'samp' || qms.mode === 'detail') {
        qms.mode = 'list';
        qms.row = null;
        if (qms.item) ctx.flowId.value = qms.item.pageId || '';
        return;
      }
      ctx.view.value = 'home';
      ctx.menuActive.value = 'app-home';
    }
    function openRow(row) {
      qms.row = patched(row);
      const it = qms.item;
      if (it && it.kind === 'insp') {
        const wait = parseInt(qms.row['待取样件数'], 10);
        if (!wait) { toast('待取样件数为 0'); return; }
        qms.mode = 'samp';
        qms.qty = String(wait);
        qms.team = text(qms.row, '检验班组');
        qms.scheme = '';
        qms.remark = '';
        qms.due = text(qms.row, '预计完成时间');
        qms.samples = [];
        qms.picked = [];
        qms.seq = 1;
        ctx.flowId.value = 'wait-samp';
        return;
      }
      qms.mode = 'detail';
    }
    function makeSample(code) {
      return {
        样品编号: code,
        样品来源: '报检取样',
        检验班组: qms.team,
        取样备注: qms.remark,
        检验方案: qms.scheme,
        方案项目: '',
        临时项目: ''
      };
    }
    function genSamples() {
      const n = parseInt(qms.qty, 10);
      const wait = parseInt((qms.row && qms.row['待取样件数']) || '0', 10);
      if (!n || n < 1) { toast('取样件数须为正整数'); return; }
      if (wait && n > wait) { toast('取样件数不能超过待取样件数'); return; }
      qms.seq = 1;
      const rows = [];
      for (let i = 0; i < n; i++) rows.push(makeSample(nextCode()));
      qms.samples = rows;
      qms.picked = [];
    }
    function refreshCodes() {
      if (!qms.samples.length) { toast('请先生成样品'); return; }
      qms.seq = 1;
      qms.samples.forEach(s => { s.样品编号 = nextCode(); });
    }
    function togglePick(code) {
      const i = qms.picked.indexOf(code);
      if (i >= 0) qms.picked.splice(i, 1);
      else qms.picked.push(code);
    }
    function printLabel() {
      if (!qms.picked.length) { toast('请先勾选需要打印的样品'); return; }
      toast('已发送打印任务');
    }
    function submitSamp() {
      const row = qms.row;
      if (!row) return;
      const wait = parseInt(row['待取样件数'] || '0', 10);
      let n = parseInt(qms.qty, 10);
      if (!n || n < 1) { toast('取样件数须为正整数'); return; }
      if (wait && n > wait) { toast('取样件数不能超过待取样件数'); return; }
      if (qms.samples.length > n) { toast('样品信息行数不能超过取样件数'); return; }
      if (qms.samples.length < n) {
        const rows = qms.samples.slice();
        while (rows.length < n) rows.push(makeSample(nextCode()));
        qms.samples = rows;
      }
      const done = parseInt(row['已取样件数'] || '0', 10) || 0;
      const left = Math.max(0, (wait || n) - n);
      qms.patches[row.id] = {
        已取样件数: String(done + n),
        待取样件数: String(left),
        单据状态: '执行中'
      };
      toast('已提交取样 ' + n + ' 件');
      qms.mode = 'list';
      qms.row = null;
      if (qms.item) ctx.flowId.value = qms.item.pageId || '';
    }
    function doAction(name) {
      if (name === '扫库位码') {
        if (!String(qms.loc || '').trim()) { toast('请先填写库位码'); return; }
        toast('已录入库位码 ' + qms.loc);
        return;
      }
      if (name === '填写去向') {
        if (!String(qms.dest || '').trim()) { toast('请先填写去向'); return; }
        toast('已填写去向 ' + qms.dest);
        return;
      }
      if (name === '报废' || name === '留样') {
        toast('已按「' + name + '」处置（演示，不回写 PC）');
        return;
      }
      toast(name + '（演示，不回写 PC）');
    }
    function login() {
      if (!String(qms.account || '').trim() || !String(qms.password || '').trim()) {
        toast('请输入账号和密码');
        return;
      }
      toast('登录成功');
      ctx.view.value = 'home';
      ctx.menuActive.value = 'app-home';
    }
    function ops() {
      const it = qms.item;
      if (!it || it.kind === 'query' || it.kind === 'result') return it && it.action ? [it.action] : [];
      const extra = it.action ? String(it.action).split('、').filter(Boolean) : [];
      return extra.concat(rowOps(it.pageId, it.tab));
    }
    return {
      state: qms,
      open, back, openRow, listRows, cols, cardPairs, stats, detailPairs, titleOf, statusOf,
      schemes, teams, genSamples, refreshCodes, togglePick, printLabel, submitSamp,
      doAction, login, ops, text, join
    };
  }

  window.QMS_APP = { modules: MODS, byId, home, menu, openeds, install, rowsOf, colNames };
  if (window.APP_CFG) {
    window.APP_CFG.homeModules = home;
    window.APP_CFG.menu = menu;
  }
})();
