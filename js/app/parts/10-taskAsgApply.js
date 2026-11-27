    function taskAsgApply(){
      const cats = taskAsgForm.批量检验类, team = taskAsgForm.批量班组;
      if(!cats.length || !team){ ElMessage.warning('请选择检验类和班组'); return; }
      let n = 0, skip = 0;
      taskAsgRows.value.filter(r=> cats.includes(r['检验类'])).forEach(r=>{
        if(r._itemLocked){ skip++; return; }
        if(r._opts.includes(team)){ r['分配班组'] = team; n++; } else skip++;
      });
      ElMessage.success('已将 '+n+' 行「'+cats.join('、')+'」设为 '+team + (skip ? '；'+skip+' 行不可选该班组，已跳过' : ''));
    }
    function confirmTaskAssign(){
      const f = taskAsgForm;
      const changes = taskAsgRows.value.filter(r=> !r._itemLocked && taskAsgKey(r['分配班组'])!==taskAsgKey(r['原班组']));
      const instChanged = taskAsgRows.value.some(r=> !r._itemLocked && taskAsgKey(r['适用仪器'])!==taskAsgKey(r['原仪器']));
      if(!changes.length && !instChanged){ ElMessage.warning('未修改任何分配'); return; }
      if(taskAsgHasAdjust.value && !String(f.调整原因||'').trim()){ ElMessage.warning('调整已分配的班组时，请填写调整原因'); return; }
      const stamp = nowStamp();
      const touched = new Set();
      changes.forEach(r=>{
        const o = taskAsgOrders.value.find(x=> x.id===r._oid);
        const ln = o && (o._lines||[])[r._idx];
        if(!ln) return;
        const to = taskAsgJoin(r['分配班组']);
        if(to) Object.assign(ln, { 分配班组: to, 分配方式: '手动', 行状态: '已分配', 分配人: '管理员', 分配时间: stamp });
        else { Object.assign(ln, { 分配班组: '', 分配方式: '', 行状态: '待分配', 分配人: '—', 分配时间: '—' }); taskRefreshLine(o, ln); }
        taskLog(o, ln, r['原班组'] ? '调整分配' : '手动分配', r['原班组'], to, { stamp, 说明: r['原班组'] ? String(f.调整原因).trim() : '—' });
        touched.add(o);
      });
      const instOrders = new Set();
      const instSeen = new Set();
      taskAsgRows.value.forEach(r=>{
        if(r._itemLocked || taskAsgKey(r['适用仪器'])===taskAsgKey(r['原仪器'])) return;
        const key = r._oid+'|'+r._idx;
        if(instSeen.has(key)) return;
        instSeen.add(key);
        const o = taskAsgOrders.value.find(x=> x.id===r._oid);
        const ln = o && (o._lines||[])[r._idx];
        if(!ln) return;
        ln['适用仪器'] = taskAsgJoin(r['适用仪器']);
        instOrders.add(o);
      });
      taskAsgOrders.value.forEach(o=>{
        if(changes.length) taskRecalc(o);
        if(touched.has(o)) Object.assign(o, { 最近分配人: '管理员', 最近分配时间: stamp });
        if(touched.has(o) || instOrders.has(o)) taskWriteBack(o);
      });
      taskAsgVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      if(changes.length) ElMessage.success('已保存 '+changes.length+' 个检验类的分配');
      else ElMessage.success('已保存检验仪器');
    }
    const taskLogVisible = ref(false);
    const taskLogNo = ref('');
    function taskDetailTeam(ln){
      if(ln['行状态']==='已分配') return ln['分配班组'] || '—';
      if(ln['行状态']==='无需分配') return '无需分配';
      return '未分配';
    }
    const taskDetailRows = computed(()=>{
      void storeTick.value;
      const no = taskLogNo.value;
      if(!no) return [];
      const o = taskTab('tab-1').find(r=> r['样品编号']===no);
      if(!o) return [];
      return (o._lines||[]).map(ln=> ({
        检验类: ln['检验类'] || '—',
        仪器类型: ln['仪器类型'] || '—',
        检验项: ln['检验项'] || '—',
        适用仪器: ln['适用仪器'] && ln['适用仪器']!=='—' ? ln['适用仪器'] : '—',
        分配班组: taskDetailTeam(ln),
        分配方式: ln['行状态']==='已分配' ? (ln['分配方式'] || '—') : '—',
        分配人: ln['行状态']==='已分配' ? (ln['分配人'] || '—') : '—',
        分配时间: ln['行状态']==='已分配' ? (ln['分配时间'] || '—') : '—',
      }));
    });
    function openTaskDetail(row){ taskLogNo.value = row['样品编号']; taskLogVisible.value = true; }
    function taskAssignBlock(row){
      const lines = (row||{})._lines || [];
      return lines.length && lines.every(l=> l['行状态']==='无需分配') ? '无需分配：该样品的检验类均未设置班组' : '';
    }
    const timeFbVisible = ref(false);
    const timeFbTitle = ref('');
    const timeFbRows = ref([]);
    const timeFbOrders = ref([]);
    const timeFbForm = reactive({ 批量时间:'', 调整原因:'', 预计完成时间:'' });
    const timeFbHeadCols = computed(()=>{
      const tv = ((((CFG.pages||{})[TIME_FB_PAGE])||{}).tabViews||[]).find(t=> t.name==='tab-1') || {};
      return (tv.columns||[]).filter(c=> c.field && c.field!=='_actions' && c.field!=='操作');
    });
    const timeFbHeadRows = computed(()=> timeFbOrders.value.map(o=>{
      const row = {};
      timeFbHeadCols.value.forEach(c=>{ row[c.field] = o[c.field]==null || o[c.field]==='' ? '—' : o[c.field]; });
      return row;
    }));
    function timeFbRefreshFooterEta(){
      timeFbForm.预计完成时间 = timeFbMaxEta(timeFbRows.value.map(r=> r.预计完成时间));
    }
    function timeFbEtaChange(row){
      const v = timeFbNormEta(row.预计完成时间);
      timeFbRows.value.filter(r=> r._oid===row._oid && r._idx===row._idx).forEach(r=>{ r.预计完成时间 = v; });
      timeFbRefreshFooterEta();
    }
    function openTimeFbSync(rows, title){
      if(!(rows||[]).length){ ElMessage.warning('请先勾选样品'); return; }
      const nos = new Set(rows.map(r=> r['样品编号']));
      const orders = timeFbTab('tab-1').filter(o=> nos.has(o['样品编号']));
      if(!orders.length){ ElMessage.warning('请先勾选样品'); return; }
      const list = [];
      orders.forEach(o=>{
        (o._lines||[]).forEach((ln, idx)=>{
          if(ln['行状态']==='无需分配') return;
          const teams = ln['行状态']==='已分配' ? (ln['分配班组'] || '—') : '—';
          const items = taskSplitItemNames(ln);
          const eta = timeFbNormEta(ln['预计完成时间']);
          (items.length ? items : ['—']).forEach(itemName=>{
            const st = itemName==='—' ? '未完成' : taskLineItemStatus(o, ln['检验类'], itemName);
            list.push({
              _oid: o.id, _idx: idx, _itemLocked: st==='已完成',
              样品编号: o['样品编号'], 检验类: ln['检验类'], 仪器类型: ln['仪器类型'],
              检验项: itemName, 检验状态: st, 当前班组: teams || '—',
              预计完成时间: eta, _origEta: eta
            });
          });
        });
      });
      if(!list.length){ ElMessage.warning('所选样品暂无需反馈的检验类'); return; }
      timeFbOrders.value = orders;
      timeFbRows.value = list;
      Object.assign(timeFbForm, { 批量时间:'', 调整原因:'', 预计完成时间: timeFbMaxEta(list.map(r=> r.预计完成时间)) });
      timeFbTitle.value = title || '同步';
      timeFbVisible.value = true;
    }
    function timeFbApply(){
      const eta = timeFbNormEta(timeFbForm.批量时间);
      if(!eta){ ElMessage.warning('请选择预计完成时间'); return; }
      timeFbRows.value.forEach(r=>{ r.预计完成时间 = eta; });
      timeFbRefreshFooterEta();
      ElMessage.success('已应用到 '+timeFbRows.value.length+' 行明细');
    }
    function confirmTimeFbSync(){
      const footerEta = timeFbNormEta(timeFbForm.预计完成时间);
      if(!footerEta){ ElMessage.warning('请填写预计完成时间'); return; }
      const filled = timeFbRows.value.filter(r=> timeFbHasEta(r.预计完成时间));
      if(!filled.length){ ElMessage.warning('请至少填写一条预计完成时间'); return; }
      const stamp = nowStamp();
      const reason = String(timeFbForm.调整原因||'').trim();
      const touched = new Set();
      let n = 0;
      const seen = new Set();
      timeFbRows.value.forEach(r=>{
        const key = r._oid+'|'+r._idx;
        if(seen.has(key)) return;
        seen.add(key);
        const o = timeFbOrders.value.find(x=> x.id===r._oid);
        const ln = o && (o._lines||[])[r._idx];
        if(!o || !ln) return;
        const neu = timeFbNormEta(r.预计完成时间);
        const old = timeFbNormEta(r._origEta) || timeFbNormEta(ln['预计完成时间']);
        ln['预计完成时间'] = neu || '—';
        if(neu !== old){
          const wasSynced = o['时间同步状态']==='已同步' && old;
          timeFbLog(o, ln, wasSynced ? '调整同步' : '同步', old || '—', neu || '—', {
            stamp, 说明: reason || '—'
          });
          n++;
        } else if(neu){
          n++;
        }
        touched.add(o);
      });
      timeFbOrders.value.forEach(o=>{
        if(!touched.has(o)) return;
        timeFbRecalc(o);
        if(footerEta){
          const cur = timeFbNormEta(o['预计完成时间']);
          if(!cur || footerEta > cur) o['预计完成时间'] = footerEta;
        }
        const etaVal = timeFbNormEta(o['预计完成时间']) || footerEta;
        if(etaVal){
          applyFbEta(o, etaVal, { keepLines: true, synced: true, stamp, 操作人: '管理员' });
          const task = taskTab('tab-1').find(t=> t['样品编号']===o['样品编号']);
          if(task){ task['预计完成时间'] = etaVal; taskWriteBack(task); }
        } else {
          o['时间同步状态'] = '已同步';
          o['最近同步人'] = '管理员';
          o['最近同步时间'] = stamp;
        }
      });
      timeFbVisible.value = false;
      selectedIds.value = [];
      flowSyncEntry();
      bumpStore();
      ElMessage.success('已同步 '+n+' 个检验类的预计完成时间');
    }
    const timeFbDetailVisible = ref(false);
    const timeFbDetailNo = ref('');
    const timeFbDetailRows = computed(()=>{
      void storeTick.value;
      const no = timeFbDetailNo.value;
      if(!no) return [];
      const o = timeFbTab('tab-1').find(r=> r['样品编号']===no);
      if(!o) return [];
      return (o._lines||[]).filter(ln=> ln['行状态']!=='无需分配').map(ln=> ({
        检验类: ln['检验类'] || '—',
        仪器类型: ln['仪器类型'] || '—',
        检验项: ln['检验项'] || '—',
        当前班组: ln['行状态']==='已分配' ? (ln['分配班组'] || '—') : '—',
        预计完成时间: timeFbHasEta(ln['预计完成时间']) ? timeFbNormEta(ln['预计完成时间']) : '—',
        同步状态: o['时间同步状态'] || '未同步'
      }));
    });
    function openTimeFbDetail(row){ timeFbDetailNo.value = row['样品编号']; timeFbDetailVisible.value = true; }
    const DEV_PAGE = 'np-0201-14';
    const DEV_OPEN = ['待发起', '已发起'];
    const DEV_SAMPLE_KEYS = ['样品编号','报检类型','报检单号','物料编码','物料名称','报检批号'];
    function devTab(name){ const bag = (MOCK[DEV_PAGE] = MOCK[DEV_PAGE] || {}); return (bag[name] = bag[name] || []); }
    function mapDevItemRow(i){
      return {
        检验项编码: i['检验项编码'] || '—',
        检验项名称: i['检验项名称'] || '—',
        检验项类型: i['检验项类型'] || '—',
        所属检验类: i['所属检验类'] || '—',
        检验项单位: i['检验项单位'] || '—'
      };
    }
    function devAllDeviceMasterItems(){
      const bag = MOCK['insp-project'] || {};
      const devCats = new Set((bag['tab-category']||[]).filter(c=> c['检验类属性']==='器件测试').map(c=> c['检验类名称']));
      const seen = new Set();
      const rows = [];
      (bag['tab-item']||[]).forEach(i=>{
        const n = i['检验项名称'];
        if(!devCats.has(i['所属检验类']) || !n || seen.has(n)) return;
        seen.add(n);
        rows.push(mapDevItemRow(i));
      });
      if(rows.length) return rows;
      // 主数据缺失时的演示兜底
      return [
        { 检验项编码:'IT-EQE', 检验项名称:'器件外量子效率EQE', 检验项类型:'定量', 所属检验类:'器件测试类', 检验项单位:'%' },
        { 检验项编码:'IT-CE', 检验项名称:'器件电流效率CE', 检验项类型:'定量', 所属检验类:'器件测试类', 检验项单位:'cd/A' },
        { 检验项编码:'IT-LT95', 检验项名称:'器件寿命LT95', 检验项类型:'定量', 所属检验类:'器件测试类', 检验项单位:'h' }
      ];
    }
    function devDeviceItemRows(no, src){
      const s = src || sampSplitList().find(r=> r['样品编号']===no);
      if(!s) return [];
      const names = [s['方案项目'], s['临时项目']].join(';').split(/[;；、,，]/).map(x=> x.trim()).filter(x=> x && x!=='—');
      const nameSet = new Set(names);
      const bag = MOCK['insp-project'] || {};
      const devCats = new Set((bag['tab-category']||[]).filter(c=> c['检验类属性']==='器件测试').map(c=> c['检验类名称']));
      const seen = new Set();
      const rows = [];
      (bag['tab-item']||[]).forEach(i=>{
        const n = i['检验项名称'];
        if(!devCats.has(i['所属检验类']) || !nameSet.has(n) || seen.has(n)) return;
        seen.add(n);
        rows.push(mapDevItemRow(i));
      });
      // 演示：样品未挂器件测试项时，带出器件测试类主数据
      return rows.length ? rows : devAllDeviceMasterItems();
    }
    function devDeviceItems(no, src){ return devDeviceItemRows(no, src).map(i=> i['检验项名称']); }
    const devReqMode = ref('add');
    const devReqEditId = ref('');
    const devReqReadonly = computed(()=> devReqMode.value==='detail');
    function devExceptId(){ return devReqMode.value==='edit' ? devReqEditId.value : ''; }
    function devOpenReq(no){ const skip = devExceptId(); return devTab('tab-1').find(r=> r['样品编号']===no && r.id!==skip && DEV_OPEN.includes(r['需求状态'])) || null; }
    function devLog(r, type, from, to, note, who, stamp){
      devTab('tab-2').unshift({
        id: 'dtl-'+Date.now()+'-'+Math.random().toString(36).slice(2, 7), 操作类型: type, 需求单号: r['需求单号'], 样品编号: r['样品编号'],
        物料名称: r['物料名称'], 原状态: from, 新状态: to, 说明: note || '—', 操作人: who || '管理员', 操作时间: stamp || nowStamp()
      });
    }
    function devSampleView(s){
      const itemRows = devDeviceItemRows(s['样品编号'], s);
      const items = itemRows.map(i=> i['检验项名称']);
      const open = devOpenReq(s['样品编号']);
      return Object.assign({}, s, { _items: items, _itemRows: itemRows, _open: open ? open['需求单号'] : '' });
    }
    const DEV_HEAD_KEYS = ['样品编号','报检单号','报检类型','物料编码','物料名称','物料规格','报检批号'];
    function joinReqHead(rows){
      const join = key=> rows.map(p=>{
        const v = p[key];
        return (v && v!=='—') ? v : '—';
      }).join(',');
      const head = { 样品编号: rows.map(p=> p['样品编号']).filter(Boolean).join(',') };
      DEV_HEAD_KEYS.slice(1).forEach(k=>{ head[k] = join(k); });
      return head;
    }
    const devReqVisible = ref(false);
    const devReqRows = ref([]);
    const DEV_HEAD_BLANK = { 样品编号:'', 报检单号:'', 报检类型:'', 物料编码:'', 物料名称:'', 物料规格:'', 报检批号:'' };
    const devReqForm = reactive({ ...DEV_HEAD_BLANK, 需求完成时间:'', 测试要求:'' });
    function syncDevHead(){
      const head = devReqRows.value.length ? joinReqHead(devReqRows.value) : { ...DEV_HEAD_BLANK };
      Object.assign(devReqForm, head);
    }
    const devReqTitle = computed(()=> ({ edit:'编辑', copy:'复制', detail:'详情' }[devReqMode.value] || '新增'));
    const devReqItemRows = computed(()=> (devReqRows.value[0] && devReqRows.value[0]._itemRows) || []);
    function reqSampleBase(row){
      const no = row['样品编号'];
      let hit = null;
      const bag = MOCK.ledger || {};
      Object.keys(bag).forEach(tab=>{ (bag[tab]||[]).forEach(r=>{ if(r['样品编号']===no) hit = r; }); });
      const split = (typeof sampSplitList==='function' ? sampSplitList() : []).find(r=> r['样品编号']===no);
      const src = hit || split || {};
      return {
        样品编号: no,
        报检类型: row['报检类型'] || src['报检类型'] || '—',
        报检单号: row['报检单号'] || src['报检单号'] || '—',
        物料编码: row['物料编码'] || src['物料编码'] || '—',
        物料名称: row['物料名称'] || src['物料名称'] || '—',
        物料规格: src['物料规格'] || row['物料规格'] || '—',
        报检批号: row['报检批号'] || src['报检批号'] || src['批号'] || '—',
        方案项目: src['方案项目'] || row['方案项目'] || '',
        临时项目: src['临时项目'] || row['临时项目'] || ''
      };
    }
    function blankDash(v){ return !v || v==='—' ? '' : v; }
    function openDevReq(mode, row){
      const m = (mode==='edit' || mode==='copy' || mode==='detail') ? mode : 'add';
      devReqMode.value = m;
      devReqEditId.value = m==='edit' && row ? row.id : '';
      if(m==='add' || !row || Array.isArray(row)){
        devReqRows.value = [];
        Object.assign(devReqForm, { ...DEV_HEAD_BLANK, 需求完成时间:'', 测试要求:'' });
      } else {
        const src = devSrcRow(row);
        devReqRows.value = [devSampleView(reqSampleBase(src))];
        syncDevHead();
        devReqForm.需求完成时间 = blankDash(src['需求完成时间']);
        devReqForm.测试要求 = blankDash(src['测试要求']);
      }
      devReqVisible.value = true;
    }
    function clearDevSamples(){ devReqRows.value = []; syncDevHead(); }
    function removeDevReqRow(row){ devReqRows.value = devReqRows.value.filter(r=> r['样品编号']!==row['样品编号']); syncDevHead(); }
    function applyDevPick(rows, tab){
      devReqRows.value = rows.map(r=>{
        const label = r['报检类型'] || flowLabelOf(r._ledgerTab || tab);
        return devSampleView(Object.assign({}, r, { 报检类型: label }));
      });
      syncDevHead();
    }
    function openDevPick(){ openReqSamplePick('dev'); }
    function devNextNo(stamp){
      const ymd = stamp.slice(2, 10).replace(/-/g, '');
      const bags = devTab('tab-1').concat(devTab('tab-2'));
      const max = bags.reduce((m, r)=>{ const x = String(r['需求单号']||'').match(new RegExp('^QJ'+ymd+'(\\d{3})$')); return x ? Math.max(m, +x[1]) : m; }, 0);
      return 'QJ' + ymd + String(max + 1).padStart(3, '0');
    }
    function settleReqTabs(openBag, doneBag, oldMap){
      const before = openBag.concat(doneBag);
      const hadOld = before.some(r=> (r && (oldMap[r['需求状态']] || r['操作类型'])));
      const all = [];
      const seen = new Set();
      before.forEach(r=>{
        if(!r || r['操作类型'] || !r['需求单号'] || seen.has(r.id)) return;
        seen.add(r.id);
        if(oldMap[r['需求状态']]) r['需求状态'] = oldMap[r['需求状态']];
        all.push(r);
      });
      if(hadOld && !all.some(r=> r['需求状态']==='待发起')){
        const hit = all.find(r=> r['需求状态']==='已发起');
        if(hit) hit['需求状态'] = '待发起';
      }
      const open = all.filter(r=> r['需求状态']==='待发起' || r['需求状态']==='已发起' || r['需求状态']==='已关闭');
      const done = all.filter(r=> r['需求状态']==='已完成');
      const same = (a, b)=> a.length===b.length && a.every((r, i)=> r===b[i]);
      if(!same(openBag, open)) openBag.splice(0, openBag.length, ...open);
      if(!same(doneBag, done)) doneBag.splice(0, doneBag.length, ...done);
    }
    function devSettleTabs(){ settleReqTabs(devTab('tab-1'), devTab('tab-2'), { '待测试':'已发起', '测试中':'已发起', '已取消':'已关闭' }); }
    function devMoveDone(r, status){
      r['需求状态'] = status;
      if(status==='已关闭'){
        const done = devTab('tab-2');
        const di = done.findIndex(x=> x.id===r.id);
        if(di>=0) done.splice(di, 1);
        const open = devTab('tab-1');
        if(!open.some(x=> x.id===r.id)) open.unshift(r);
        return;
      }
      const open = devTab('tab-1');
      const i = open.findIndex(x=> x.id===r.id);
      if(i>=0) open.splice(i, 1);
      const done = devTab('tab-2');
      if(!done.some(x=> x.id===r.id)) done.unshift(r);
    }
    function createDevReqs(rows){
      const stamp = nowStamp(), list = devTab('tab-1');
      const need = String(devReqForm.测试要求||'').trim();
      const editing = devReqMode.value==='edit' ? list.find(r=> r.id===devReqEditId.value) : null;
      let created = 0;
      rows.forEach((s, i)=>{
        const open = devOpenReq(s['样品编号']);
        const warns = [];
        if(!s._items.length) warns.push('样品不含器件测试类检测项目');
        if(open) warns.push('重复发起：已有未完成需求 '+open['需求单号']);
        const fields = {
          器件测试项目: s._items.join('、') || '—', 发起提醒: warns.length ? warns.join('；')+'；已确认继续新增' : '—',
          测试要求: need || '—', 需求完成时间: devReqForm.需求完成时间 || '—'
        };
        DEV_SAMPLE_KEYS.forEach(k=> { fields[k] = s[k] || '—'; });
        if(editing && i===0){ Object.assign(editing, fields); return; }
        const r = { id: 'dt-'+Date.now()+'-'+Math.random().toString(36).slice(2, 7), 需求状态: '待发起', 需求单号: devNextNo(stamp) };
        Object.assign(r, fields, {
          发起人: '管理员', 发起时间: stamp, DDB单号: '—', 接收时间: '—', 测试结论: '—', 完成时间: '—', 测试报告: '—', 取消原因: '—'
        });
        list.unshift(r);
        created++;
      });
      devReqVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      if(editing && !created) ElMessage.success('已保存');
      else if(editing) ElMessage.success('已保存，并新增 '+created+' 条器件测试需求');
      else if(devReqMode.value==='copy') ElMessage.success('已复制 '+created+' 条器件测试需求');
      else ElMessage.success('已新增 '+created+' 条器件测试需求');
    }
    function confirmDevReq(){
      if(devReqMode.value==='detail'){ devReqVisible.value = false; return; }
      const rows = devReqRows.value;
      if(!rows.length){ ElMessage.warning('请先选择样品编号'); return; }
      const noDev = rows.filter(r=> !r._items.length);
      const dup = rows.filter(r=> devOpenReq(r['样品编号']));
      if(!noDev.length && !dup.length){ createDevReqs(rows); return; }
      const esc = v=> String(v).replace(/[&<>]/g, c=> ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
      const parts = [];
      const ask = devReqMode.value==='edit' ? '保存' : devReqMode.value==='copy' ? '复制' : '新增';
      if(noDev.length) parts.push('<p style="margin:0 0 6px"><b>以下样品不含器件测试类检测项目：</b></p><p style="margin:0 0 10px">'+noDev.map(r=> esc(r['样品编号'])).join('、')+'</p>');
      if(dup.length) parts.push('<p style="margin:0 0 6px"><b>以下样品已有未完成的器件测试需求：</b></p><p style="margin:0 0 10px">'+dup.map(r=> esc(r['样品编号'])+'（'+esc(devOpenReq(r['样品编号'])['需求单号'])+'）').join('、')+'</p>');
      parts.push('<p style="margin:0">是否仍要'+ask+'？</p>');
      ElementPlus.ElMessageBox.confirm(parts.join(''), '二次确认', { type:'warning', dangerouslyUseHTMLString: true, confirmButtonText:'继续'+ask, cancelButtonText:'返回修改' })
        .then(()=> createDevReqs(rows)).catch(()=>{});
    }
    const devLaunchVisible = ref(false);
    const devLaunchNeed = ref('');
    const devLaunchRows = ref([]);
    function launchDevReqs(){
      devSettleTabs();
      const rows = devTab('tab-1').filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选待发起的需求'); return; }
      if(rows.some(r=> r['需求状态']!=='待发起')){ ElMessage.warning('仅待发起的需求可发起'); return; }
      const raw = String((rows[0]||{})['测试要求']||'').trim();
      devLaunchNeed.value = (!raw || raw==='—') ? '' : raw;
      devLaunchRows.value = rows;
      devLaunchVisible.value = true;
    }
