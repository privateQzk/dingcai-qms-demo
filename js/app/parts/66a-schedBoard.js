    /* 检验排程（np-0201-18 · sched-board 布局）
     * 排程单元=任务分派 np-0201-13 中「行状态=已分配」的检验类行；排程状态独立存 MOCK[np-0201-18].main
     * （_lines 会被 taskSyncAll 重建，不能把排程字段放上去）。甘特行=在用仪器。
     * 约束来源：班组适用班次(15) × 检验日历(16) 判时间窗；计划工时=成本方案(14)标准系数。 */
    // SCHED_PAGE dideklarasikan di parts/06 (dipakai sebelum bagian ini saat watcher immediate)
    function schedBag(name){ const b = (MOCK[SCHED_PAGE] = MOCK[SCHED_PAGE] || {}); return (b[name] = b[name] || []); }
    function schedPlans(){ const arr = schedBag('main'); arr.forEach(p=>{ if(p && !p['排程单号']) p['排程单号'] = schedNextNo(); }); return arr; }
    /** 排程单号：SCH-三位顺序号，按计划表现有最大号递增 */
    function schedNextNo(){
      const ns = schedBag('main').map(p=> parseInt(String(p['排程单号']||'').replace(/\D/g,''),10) || 0);
      return 'SCH-' + String(Math.max(0, ...ns) + 1).padStart(3,'0');
    }
    function schedLogs(){ return schedBag('log'); }
    function schedParse(s){
      const m = String(s==null?'':s).match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if(!m) return null;
      return new Date(+m[1], +m[2]-1, +m[3], +(m[4]||0), +(m[5]||0), +(m[6]||0));
    }
    function schedPad(n){ return String(n).padStart(2,'0'); }
    function schedFmt(d){ return d.getFullYear()+'-'+schedPad(d.getMonth()+1)+'-'+schedPad(d.getDate())+' '+schedPad(d.getHours())+':'+schedPad(d.getMinutes()); }
    function schedFmtD(d){ return d.getFullYear()+'-'+schedPad(d.getMonth()+1)+'-'+schedPad(d.getDate()); }
    /** 演示基准时刻：最新取样时间（mock 数据在 2026-10），保证甘特与演示数据同一时轴 */
    function schedNow(){
      let max = '';
      taskTab('tab-1').forEach(o=>{ const t = String(o['取样时间']||''); if(t > max) max = t; });
      return max || nowStamp();
    }
    function schedAnchorDate(){ const d = schedParse(schedNow()) || new Date(); return schedFmtD(d); }
    /* ---- 班次：班组指定 > 通用 > 默认 09:00-18:00 ---- */
    function schedShiftOf(team){
      const rows = ((MOCK[SHIFT_PAGE]||{}).main||[]).filter(r=> r['启用状态']!=='禁用');
      const byCode = (a,b)=> String(a['班次编码']||'').localeCompare(String(b['班次编码']||''));
      const spec = rows.filter(r=>{ const v=String(r['适用班组']||'').trim(); return v && v!=='通用' && splitDun(v).includes(team); }).sort(byCode);
      const gen  = rows.filter(r=>{ const v=String(r['适用班组']||'').trim(); return !v || v==='通用'; }).sort(byCode);
      const s = spec[0] || gen[0];
      const st = String(s ? s['开始时间'] : '') || '09:00', et = String(s ? s['结束时间'] : '') || '18:00';
      return s ? { code:s['班次编码'], name:s['班次名称'], start:st, end:et, cross:et<=st }
               : { code:'', name:'—', start:'09:00', end:'18:00', cross:false };
    }
    /* ---- 日历：班组指定 > 通用 > 默认周一至五；须落在生效~结束区间内 ---- */
    function schedCalOf(team, ds){
      const rows = ((MOCK[CAL_PAGE]||{}).main||[]).filter(r=> r['启用状态']!=='禁用'
        && (!r['生效日期'] || String(r['生效日期'])<=ds) && (!r['结束日期'] || String(r['结束日期'])>=ds));
      const byCode = (a,b)=> String(a['日历编码']||'').localeCompare(String(b['日历编码']||''));
      const spec = rows.filter(r=>{ const v=String(r['适用班组']||'').trim(); return v && v!=='通用' && splitDun(v).includes(team); }).sort(byCode);
      const gen  = rows.filter(r=>{ const v=String(r['适用班组']||'').trim(); return !v || v==='通用'; }).sort(byCode);
      return spec[0] || gen[0] || null;
    }
    function schedIsWorkday(team, d){
      const ds = schedFmtD(d);
      const cal = schedCalOf(team, ds);
      const sp = cal && Array.isArray(cal._dates) ? cal._dates.find(x=> x['日期']===ds) : null;
      if(sp) return sp['类型']==='加班日';
      if(cal){
        const wd = ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
        return splitDun(cal['每周工作日']).includes(wd);
      }
      const w = d.getDay(); return w>=1 && w<=5;
    }
    /* ---- 工时：检验成本方案「标准系数」按 检验类+物料 匹配；指定物料 > 全部物料；系数0/未命中→2.0h ---- */
    function schedHoursOf(matCode, cat){
      const rows = ((MOCK['np-0103-14']||{}).main||[]).filter(r=> r['启用状态']!=='禁用' && splitDun(r['检验类']).includes(cat));
      const code = String(matCode||'').trim();
      const spec = code ? rows.filter(r=> r['匹配范围']==='指定物料' && splitDun(r['物料编码']).includes(code)) : [];
      const gen  = rows.filter(r=> r['匹配范围']==='全部物料' || !splitDun(r['物料编码']).length);
      const hit = spec[0] || gen[0];
      if(!hit) return 2.0;
      const v = parseFloat(String(hit['标准系数']).replace(/[^\d.]/g,''));
      return v>0 ? Math.round(v*10)/10 : 2.0;
    }
    /* ---- 仪器池：行「仪器类型」→ 在用仪器；液相色谱专指 HPLC；通用→全部在用 ---- */
    function schedInstPool(instType){
      const all = ((MOCK.instrument||{}).main||[]).filter(r=> r['使用状态']==='在用');
      const t = String(instType||'').trim();
      if(!t || t==='通用' || t==='—') return all;
      if(t==='液相色谱'){
        const p = all.filter(r=> /液相|HPLC/i.test(String(r['仪器名称'])));
        return p.length ? p : all.filter(r=> r['仪器类型']==='色谱');
      }
      const p = all.filter(r=> r['仪器类型']===t);
      return p.length ? p : all;
    }
    /* ---- 仪器匹配序：① 行内已分配仪器(适用仪器) → ② 命中派单方案的使用仪器 → ③ 仪器类型池 → ④ 全部在用 ---- */
    function schedLiveInstByName(){ const m = {}; ((MOCK.instrument||{}).main||[]).forEach(r=>{ if(r['使用状态']==='在用' && r['仪器名称']) m[r['仪器名称']] = r; }); return m; }
    function schedLineInstCands(o, ln){
      const byName = schedLiveInstByName();
      const uniq = arr=> [...new Set(arr.filter(Boolean))];
      const tier1 = uniq(splitDun(ln['适用仪器']).map(n=> byName[n]).filter(Boolean));
      if(tier1.length) return { list: tier1, src: '已分配' };
      const rule = matchDispatchRule(o['物料编码'], ln['检验类']);
      let rn = [];
      if(rule && Array.isArray(rule._insts) && rule._insts.length) rn = rule._insts.map(x=> x['仪器名称']);
      else if(rule && splitDun(rule['使用仪器']).length) rn = splitDun(rule['使用仪器']);
      else if(rule && splitDun(rule['适用仪器']).length) rn = splitDun(rule['适用仪器']);
      const tier2 = uniq(rn.map(n=> byName[n]).filter(Boolean));
      if(tier2.length) return { list: tier2, src: '方案' };
      return { list: schedInstPool(ln['仪器类型']), src: '类型' };
    }
    /** dt 起该班组下一个班次时段内的时刻：已在窗口内→dt，否则→最近的工作日班次开始 */
    function schedNextWorkStart(dt, team){
      const sh = schedShiftOf(team);
      const [shH, shM] = sh.start.split(':').map(Number);
      const [eh, eM] = sh.end.split(':').map(Number);
      for(let i=0; i<31; i++){
        const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()+i);
        if(!schedIsWorkday(team, day)) continue;
        const ws = new Date(day); ws.setHours(shH, shM, 0, 0);
        const we = new Date(day); we.setHours(eh, eM, 0, 0);
        if(sh.cross || we<=ws) we.setDate(we.getDate()+1);
        if(dt>=ws && dt<we) return new Date(dt);
        if(dt<ws) return ws;
      }
      return new Date(dt.getTime()+31*86400000);
    }
    function schedPlanDesc(p){
      if(!p) return '—';
      return p['检验仪器']+' '+String(p['计划开始']||'').slice(5,16)+'~'+String(p['计划结束']||'').slice(11,16);
    }
    function schedLog(t, type, oldDesc, newDesc, note, who, stamp){
      schedLogs().unshift({
        id: 'sl-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),
        操作类型: type, 样品编号: t['样品编号'], 报检单号: t['报检单号']||'—', 物料名称: t['物料名称']||'—',
        检验类: t['检验类'], 检验班组: t['检验班组']||'—', 原排程: oldDesc||'—', 新排程: newDesc||'—',
        说明: note||'—', 操作人: who||'管理员', 操作时间: stamp||nowStamp()
      });
    }
    /* ---- 排程任务推导：_lines 已分配行 + 持久化 plan + 录入进度状态 ---- */
    function schedTasks(){
      const out = [];
      taskTab('tab-1').forEach(o=>{
        const ord = (flowOrderOf(o['报检单号'])||{}).row || {};
        (o._lines||[]).forEach((ln, idx)=>{
          if(ln['行状态']!=='已分配') return;
          const key = o['样品编号']+'|'+ln['检验类'];
          const plan = schedPlans().find(p=> p._key===key) || null;
          const cand = schedLineInstCands(o, ln);
          const t = {
            _key: key, _idx: idx,
            样品编号: o['样品编号'], 报检类型: o['报检类型']||'—', 报检单号: o['报检单号']||'—',
            物料编码: o['物料编码']||'—', 物料名称: o['物料名称']||'—', 物料规格: o['物料规格']||'—',
            检验类: ln['检验类']||'—', 检验项: ln['检验项']||'—', 仪器类型: ln['仪器类型']||'—',
            检验班组: ln['分配班组']||'—', _team: splitDun(ln['分配班组'])[0]||'',
            适用仪器: ln['适用仪器'] && ln['适用仪器']!=='—' ? ln['适用仪器'] : '—',
            _cands: cand.list, _instSrc: cand.src,
            _sameType: schedInstPool(ln['仪器类型']).map(r=> r['仪器名称']),
            取样时间: o['取样时间']||'—',
            优先级: ord['优先级']||'—', 需求完成时间: ord['需求完成时间']||'—',
            _hours: schedHoursOf(o['物料编码'], ln['检验类'])
          };
          if(plan) Object.assign(t, {
            排程单号: plan['排程单号'],
            检验仪器: plan['检验仪器'], 仪器编码: plan['仪器编码'], 计划开始: plan['计划开始'], 计划结束: plan['计划结束'],
            计划工时: plan['计划工时'], 排程方式: plan['排程方式'], 排程人: plan['排程人'], 排程时间: plan['排程时间'],
            班次: plan['班次']||'—', 检验日历: plan['检验日历']||'—', 锁定: plan['锁定']||'否'
          });
          else Object.assign(t, {
            检验仪器:'—', 仪器编码:'', 计划开始:'—', 计划结束:'—', 计划工时:'',
            排程方式:'—', 排程人:'—', 排程时间:'—', 班次:'—', 检验日历:'—', 锁定:'否'
          });
          out.push(t);
        });
      });
      // 状态：录入进度 > 排程结果
      const now = schedNow();
      out.forEach(t=>{
        const s = flowSplitRow(t['样品编号']);
        const e = (s && s._entry) || {};
        const items = String(t['检验项']||'').split(/[、;；]/).map(x=>x.trim()).filter(Boolean);
        if((e.done||[]).includes(t['检验类'])) t.排程状态 = '已完成';
        else if(items.some(n=>{ const it=(e.items||{})[n]; return it && (String(it['结论']||'').trim() || String(it['实测值']||'').trim()); })
             || (e.doneItems||[]).some(n=> items.includes(n))) t.排程状态 = '检验中';
        else if(t.计划开始 && t.计划开始!=='—') t.排程状态 = '已排程';
        else t.排程状态 = '待排程';
      });
      // 冲突：同仪器时段重叠
      const byInst = {};
      out.filter(t=> t.仪器编码 && t.计划开始!=='—').forEach(t=>{ (byInst[t.仪器编码] = byInst[t.仪器编码]||[]).push(t); });
      Object.values(byInst).forEach(list=>{
        list.forEach(a=>{
          const as = schedParse(a.计划开始), ae = schedParse(a.计划结束);
          a._conflict = list.some(b=> b!==a && schedParse(b.计划开始)<ae && schedParse(b.计划结束)>as);
        });
      });
      out.forEach(t=>{
        t.冲突 = t._conflict ? '冲突' : '—';
        const end = t.计划结束, dead = t.需求完成时间;
        const hasEnd = end && end!=='—', hasDead = dead && dead!=='—';
        if(t.排程状态==='已完成' || (!hasEnd && !hasDead)) t.超期 = '—';
        else t.超期 = (hasEnd && end < now) || (hasDead && (dead < now || (hasEnd && end > dead))) ? '逾期' : '—';
      });
      return out;
    }
    /** 我的任务行未进入任务分派时，按行信息合成排程任务（排程域=我的任务全集，不存在未分配） */
    function schedSynthTask(row){
      const pool = schedInstPool('');
      return {
        _key: String(row['样品编号']||'')+'|'+String(row['检验类名称']||''), _idx: 0, _synth: true,
        样品编号: row['样品编号']||'—', 报检类型: row['报检单类型']||'—', 报检单号: row['报检单号']||'—',
        物料编码: row['物料编码']||'—', 物料名称: row['物料名称']||'—', 物料规格: row['物料规格']||'—',
        检验类: row['检验类名称']||'—', 检验项: row['检验项名称']||'—', 仪器类型: '—',
        检验班组: '—', _team: '', 适用仪器: '—',
        _cands: pool, _instSrc: '类型', _sameType: pool.map(r=> r['仪器名称']),
        取样时间: row['取样时间']||'—', 优先级: row['优先级']||'—',
        需求完成时间: row['预计完成时间']||'—',
        _hours: schedHoursOf(row['物料编码'], row['检验类名称']),
        检验仪器:'—', 仪器编码:'', 计划开始:'—', 计划结束:'—', 计划工时:'',
        排程方式:'—', 排程人:'—', 排程时间:'—', 班次:'—', 检验日历:'—', 锁定:'否',
        排程状态:'待排程', 超期:'—', 冲突:'—'
      };
    }
    function schedSynthMergePlan(t, plan){
      Object.assign(t, {
        排程单号: plan['排程单号'], 检验仪器: plan['检验仪器'], 仪器编码: plan['仪器编码'],
        计划开始: plan['计划开始'], 计划结束: plan['计划结束'], 计划工时: plan['计划工时'],
        排程方式: plan['排程方式'], 排程人: plan['排程人'], 排程时间: plan['排程时间'],
        班次: plan['班次']||'—', 检验日历: plan['检验日历']||'—', 锁定: plan['锁定']||'否',
        排程状态: '已排程'
      });
      return t;
    }
    const SCHED_STATUS_ORDER = { '待排程':0, '已排程':1, '检验中':2, '已完成':3 };
    const SCHED_PRIO = { '高':0, '中':1, '低':2 };
    function schedSortKey(a, b){
      const sd = (SCHED_STATUS_ORDER[a['排程状态']]??9) - (SCHED_STATUS_ORDER[b['排程状态']]??9);
      if(sd) return sd;
      const pd = (SCHED_PRIO[a['优先级']]??9) - (SCHED_PRIO[b['优先级']]??9);
      if(pd) return pd;
      const dd = String(a['需求完成时间']||'~').localeCompare(String(b['需求完成时间']||'~'));
      if(dd) return dd;
      return String(a['取样时间']||'').localeCompare(String(b['取样时间']||''));
    }
    /** 自动排程单任务槽位：候选仪器（已分配>方案>类型池）内逐台找「对齐班次窗口且不重叠」的最早开始 */
    function schedAutoSlot(t){
      const hours = +t._hours || 2;
      const now = schedParse(schedNow());
      const cands = (t._cands && t._cands.length) ? t._cands : schedInstPool(t.仪器类型);
      let best = null;
      cands.forEach(inst=>{
        const iv = schedPlans().filter(p=> p['仪器编码']===inst['仪器编号'] && p._key!==t._key)
          .map(p=> ({ s: schedParse(p['计划开始']), e: schedParse(p['计划结束']) })).sort((a,b)=> a.s-b.s);
        let cur = new Date(now);
        for(let g=0; g<80; g++){
          const st = schedNextWorkStart(cur, t._team || t.检验班组);
          const en = new Date(st.getTime()+hours*3600000);
          const hit = iv.find(x=> x.s<en && x.e>st);
          if(!hit){ if(!best || st<best.st) best = { inst, st, en }; break; }
          cur = new Date(hit.e.getTime()+60000);
        }
      });
      return best;
    }
    /* ---- sb 状态 + data 派生 ---- */
    const schedSplitVisible = ref(false);
    const sb = reactive({
      tab: 'board', view: 'day', anchor: schedAnchorDate(), qMore: false,
      splitQ: { 样品编号:'', 检验类:'', 排程状态:'', 仪器:'', 报检单号:'' },
      splitQA: { 样品编号:'', 检验类:'', 排程状态:'', 仪器:'', 报检单号:'' },
      q: { 样品编号:'', 检验仪器:'', 排程状态:'', 检验类:'', 检验班组:'', 优先级:'', 报检单号:'', 需求范围:null, 计划范围:null },
      logQ: { 样品编号:'', 操作类型:'', 检验仪器:'', 报检单号:'', 操作人:'', 时间范围:null },
      sel: [],
      dlg: { visible:false, mode:'sched', title:'', head:{}, instOpts:[], task:null,
             form:{ 仪器:'', 开始:'', 工时:2, 结束:'' } },
      detail: { visible:false, task:null },
      setTab(t){ this.tab = t; },
      nav(dir){ const d = schedParse(this.anchor+' 00:00'); d.setDate(d.getDate() + dir); this.anchor = schedFmtD(d); },
      today(){ this.anchor = schedAnchorDate(); },
      qQuery(){}, qReset(){ Object.assign(this.q,{ 样品编号:'', 检验仪器:'', 排程状态:'', 检验类:'', 检验班组:'', 优先级:'', 报检单号:'', 需求范围:null, 计划范围:null }); },
      splitQuery(){ this.splitQA = Object.assign({}, this.splitQ); },
      splitReset(){ Object.assign(this.splitQ, { 样品编号:'', 检验类:'', 排程状态:'', 仪器:'', 报检单号:'' }); this.splitQuery(); },
      logQuery(){}, logReset(){ Object.assign(this.logQ,{ 样品编号:'', 操作类型:'', 检验仪器:'', 报检单号:'', 操作人:'', 时间范围:null }); },
      selChange(rows){ this.sel = (rows||[]).map(r=> r._key); },
      op(cmd, row){
        if(cmd==='sched') schedOpenDlg(row, 'sched');
        else if(cmd==='adjust') schedOpenDlg(row, 'adjust');
        else if(cmd==='cancel') schedCancelRow(row);
        else if(cmd==='lock') schedToggleLock(row, true);
        else if(cmd==='unlock') schedToggleLock(row, false);
      },
      /* 排程弹窗·我的任务：行均为任务分配后数据；映射缺失时按行信息合成任务（操作仍可用）。
         「调整」：有计划→调整弹窗；待排程（取消后）→排程弹窗（等同重新排程） */
      myOp(cmd, row){
        const t = row._task || schedSynthTask(row);
        if(cmd==='adjust'){
          const hasPlan = t['计划开始'] && t['计划开始']!=='—';
          schedOpenDlg(t, hasPlan ? 'adjust' : 'sched');
          return;
        }
        this.op(cmd, t);
      },
      /* 排程弹窗·我的任务：批量确认排程 = 对所选「已排程且未锁定」任务执行锁定（状态→锁定） */
      splitConfirm(rows){
        const tasks = (rows||[]).map(r=> r._task).filter(t=> t && t.排程状态==='已排程' && t['锁定']!=='是');
        if(!tasks.length){ ElMessage.warning('所选数据中没有可确认的排程（需已排程且未锁定）'); return; }
        const stamp = nowStamp();
        tasks.forEach(t=>{
          const p = schedPlans().find(x=> x._key===t._key); if(!p) return;
          p['锁定'] = '是';
          schedFbConfirm(t);
          schedLog(t, '锁定排程', schedPlanDesc(p), schedPlanDesc(p), '批量确认排程', '管理员', stamp);
        });
        flowSyncEntry();
        bumpStore();
        ElMessage.success('已确认并锁定 '+tasks.length+' 个排程');
      },
      /* 排程弹窗·我的任务：批量解锁 = 对所选「锁定」任务解除锁定（状态→已排程） */
      splitUnlock(rows){
        const plans = schedPlans();
        const tasks = (rows||[]).map(r=> r._task).filter(t=>{
          if(!t) return false;
          const p = plans.find(x=> x._key===t._key);
          return p && p['锁定']==='是';
        });
        if(!tasks.length){ ElMessage.warning('所选数据中没有已锁定的排程可解锁'); return; }
        const stamp = nowStamp();
        tasks.forEach(t=>{
          const p = plans.find(x=> x._key===t._key);
          p['锁定'] = '否';
          schedLog(t, '解锁排程', schedPlanDesc(p), schedPlanDesc(p), '批量解锁排程', '管理员', stamp);
        });
        flowSyncEntry();
        bumpStore();
        ElMessage.success('已解锁 '+tasks.length+' 个排程');
      },
      auto(){ schedAutoRun(false); },
      batchCancel(){ schedCancelBatch(); },
      batchLock(){ schedLockBatch(true); },
      batchUnlock(){ schedLockBatch(false); },
      pick(t){ this.detail.task = t; this.detail.visible = true; },
      canMove(t){ return !schedMoveBlockReason(t); },
      moveBlockReason(t){ return schedMoveBlockReason(t); },
      drop(t, instName, s, e){ schedDropPlan(t, instName, s, e); },
      dropMulti(entries){ schedDropMulti(entries); },
      dlgCalcEnd(){
        const f = this.dlg.form; const st = schedParse(f.开始);
        f.结束 = (st && +f.工时>0) ? schedFmt(new Date(st.getTime()+ (+f.工时)*3600000)) : '';
      },
      saveSched(){ schedSaveDlg(); },
      exportTasks(){ schedExport('tasks'); },
      exportLogs(){ schedExport('logs'); }
    });
    const schedData = computed(()=>{
      void storeTick.value;
      const all = schedTasks();
      // 我的任务中未进入任务分派、但已有排程计划的行：合成任务纳入甘特/任务域
      const _myRows = ((MOCK[FLOW_MY_TASK]||{}).main)||[];
      const _haveKey = new Set(all.map(x=>x._key));
      _myRows.forEach(r=>{
        const key = String(r['样品编号']||'')+'|'+String(r['检验类名称']||'');
        if(_haveKey.has(key)) return;
        const plan = schedPlans().find(p=> p._key===key);
        if(plan) all.push(schedSynthMergePlan(schedSynthTask(r), plan));
      });
      const now = schedNow();
      // 卡片
      const cards = [
        { label:'待排程', value: all.filter(t=>t.排程状态==='待排程').length, tone:'gray' },
        { label:'已排程', value: all.filter(t=>t.排程状态==='已排程').length, tone:'blue' },
        { label:'检验中', value: all.filter(t=>t.排程状态==='检验中').length, tone:'orange' },
        { label:'已完成', value: all.filter(t=>t.排程状态==='已完成').length, tone:'green' },
        { label:'逾期', value: all.filter(t=>t.超期==='逾期').length, tone:'red' }
      ];
      // 任务过滤
      const q = sb.q;
      const inRange = (v, r)=> !r || !r[0] || !r[1] || (String(v||'').slice(0,10) >= r[0] && String(v||'').slice(0,10) <= r[1]);
      const tasks = all.filter(t=>
        (!q.样品编号 || String(t.样品编号).includes(q.样品编号.trim())) &&
        (!q.检验仪器 || t.检验仪器===q.检验仪器) &&
        (!q.排程状态 || t.排程状态===q.排程状态) &&
        (!q.检验类 || t.检验类===q.检验类) &&
        (!q.检验班组 || t.检验班组===q.检验班组) &&
        (!q.优先级 || t.优先级===q.优先级) &&
        (!q.报检单号 || String(t.报检单号).includes(q.报检单号.trim())) &&
        inRange(t.需求完成时间, q.需求范围) &&
        inRange(t.计划开始, q.计划范围)
      ).sort(schedSortKey);
      // 流水过滤
      const lq = sb.logQ;
      const logs = schedLogs().filter(r=>
        (!lq.样品编号 || String(r['样品编号']).includes(lq.样品编号.trim())) &&
        (!lq.操作类型 || r['操作类型']===lq.操作类型) &&
        (!lq.检验仪器 || String(r['新排程']+r['原排程']).includes(lq.检验仪器)) &&
        (!lq.报检单号 || String(r['报检单号']).includes(lq.报检单号.trim())) &&
        (!lq.操作人 || String(r['操作人']).includes(lq.操作人.trim())) &&
        inRange(r['操作时间'], lq.时间范围)
      );
      // 甘特：行=在用仪器
      const insts = ((MOCK.instrument||{}).main||[]).filter(r=> r['使用状态']==='在用')
        .slice().sort((a,b)=> String(a['仪器类型']).localeCompare(String(b['仪器类型'])) || String(a['仪器编号']).localeCompare(String(b['仪器编号'])));
      const instMeta = {}; insts.forEach(i=> instMeta[i['仪器名称']] = { code: i['仪器编号'], type: i['仪器类型'] });
      const instIdx = {}; insts.forEach((i,k)=> instIdx[i['仪器编号']] = k);
      const sched = all.filter(t=> t.仪器编码 && t.计划开始 && t.计划开始!=='—' && instIdx[t.仪器编码]!=null);
      // 泳道：同仪器重叠任务上下错行
      const instLanes = {};
      sched.slice().sort((a,b)=> String(a.计划开始).localeCompare(String(b.计划开始))).forEach(t=>{
        const ic = t.仪器编码, list = (instLanes[ic] = instLanes[ic] || []);
        const ts = schedParse(t.计划开始), te = schedParse(t.计划结束);
        let li = 0; while(li < list.length && list[li] > ts) li++;
        list[li] = te; t._lane = li;
      });
      const gantt = sched.map(t=> ({
        value: [ instIdx[t.仪器编码], schedParse(t.计划开始).getTime(), schedParse(t.计划结束).getTime(), t._lane||0, (instLanes[t.仪器编码]||[]).length ],
        t
      }));
      // 时间范围
      const anchorD = schedParse(sb.anchor+' 00:00') || new Date();
      let rStart, rEnd, rangeText;
      rStart = anchorD.getTime(); rEnd = rStart + 86400000;
      rangeText = sb.anchor+' 周'+'日一二三四五六'[anchorD.getDay()];
      // 轴域：全部已排任务时间跨度 ∪ 可视窗口，两端各留半天余量（时间轴连续可拖）
      let dMin = Infinity, dMax = -Infinity;
      sched.forEach(t=>{
        const s = schedParse(t.计划开始).getTime(), e = schedParse(t.计划结束).getTime();
        if(s<dMin) dMin = s; if(e>dMax) dMax = e;
      });
      if(!isFinite(dMin)){ dMin = rStart; dMax = rEnd; }
      // 轴域对齐整日边界（底纹分段对齐 00:00/09:00/18:00）
      dMin = schedParse(schedFmtD(new Date(Math.min(dMin, rStart))) + ' 00:00').getTime();
      dMax = schedParse(schedFmtD(new Date(Math.max(dMax, rEnd))) + ' 00:00').getTime() + 86400000;
      // 非工作时段底纹：通用日历 + 常白班 09:00-18:00，覆盖整个轴域
      const shades = [];
      for(let d=new Date(dMin); d.getTime()<dMax; d=new Date(d.getTime()+86400000)){
        const ds = schedFmtD(d);
        if(!schedIsWorkday('', d)){ shades.push([d.getTime(), d.getTime()+86400000]); continue; }
        shades.push([d.getTime(), new Date(ds+' 09:00').getTime()]);
        shades.push([new Date(ds+' 18:00').getTime(), d.getTime()+86400000]);
      }
      const instOpts = insts.map(r=> r['仪器名称']);
      const teamOpts = teamNames();
      const catOpts = inspCatNames();
      // 排程弹窗·查询栏：作用于甘特块与我的任务列表（勾选样品打开时由 parts/56 预填样品编号）
      const fq = sb.splitQA || {};
      const ganttF = gantt.filter(g=>{
        const t = g.t;
        return (!fq.样品编号 || String(t['样品编号']).includes(String(fq.样品编号).trim()))
          && (!fq.检验类 || t['检验类']===fq.检验类)
          && (!fq.仪器 || t['检验仪器']===fq.仪器)
          && (!fq.报检单号 || String(t['报检单号']).includes(String(fq.报检单号).trim()))
          && (!fq.排程状态 || (fq.排程状态==='锁定' ? t['锁定']==='是' : fq.排程状态==='已排程' ? t['锁定']!=='是' : false));
      });
      // 排程弹窗·我的任务：数据录入-我的行 × 排程任务（样品编号|检验类 关联）
      const myTasks = (((MOCK[FLOW_MY_TASK]||{}).main)||[]).map(r=>{
        const key = String(r['样品编号']||'')+'|'+String(r['检验类名称']||'');
        let t = all.find(x=> x._key===key) || null;
        if(!t){
          const plan = schedPlans().find(p=> p._key===key);
          t = plan ? schedSynthMergePlan(schedSynthTask(r), plan) : schedSynthTask(r);
        }
        const hasPlan = !!(t && t['计划开始'] && t['计划开始']!=='—');
        return Object.assign({}, r, { _task: t,
          排程状态: !hasPlan ? '待排程' : (t['锁定']==='是' ? '锁定' : '已排程'),
          计划开始: hasPlan ? t.计划开始 : '—', 计划结束: hasPlan ? t.计划结束 : '—' });
      }).filter(r=>
        (!fq.样品编号 || String(r['样品编号']||'').includes(String(fq.样品编号).trim()))
        && (!fq.检验类 || r['检验类名称']===fq.检验类)
        && (!fq.排程状态 || r['排程状态']===fq.排程状态)
        && (!fq.仪器 || String(r['分析仪器']||'').includes(fq.仪器))
        && (!fq.报检单号 || String(r['报检单号']||'').includes(String(fq.报检单号).trim()))
      );
      // split 模式：仪器泳道=当前行数据的仪器并集（检验类/样品等过滤后剩余的仪器）；
      // 全部条件 → 行数据所有仪器并集。独立排程页不受此过滤影响
      let ganttInstsL = insts.map(r=>r['仪器名称']), instMetaL = instMeta, ganttFL = ganttF;
      if(schedSplitVisible.value){
        const used = new Set();
        myTasks.forEach(r=>{
          const c = (r._task && r._task['仪器编码']) || String(r['分析仪器']||'').split('/')[0].trim();
          if(c && instIdx[c]!=null) used.add(c);
        });
        ganttF.forEach(g=> used.add(g.t['仪器编码']));
        const laneInsts = insts.filter(i=> used.has(i['仪器编号']));
        const laneIdx = {}; laneInsts.forEach((i,k)=> laneIdx[i['仪器编号']]=k);
        ganttFL = ganttF.map(g=> ({ value: [ laneIdx[g.t['仪器编码']], g.value[1], g.value[2], g.value[3], g.value[4] ], t: g.t }));
        ganttInstsL = laneInsts.map(r=>r['仪器名称']);
        instMetaL = {}; laneInsts.forEach(i=> instMetaL[i['仪器名称']] = { code: i['仪器编号'], type: i['仪器类型'] });
      }
      return { cards, tasks, logs, gantt: ganttFL, ganttInsts: ganttInstsL, instMeta: instMetaL, shades,
               range:[rStart,rEnd], fullRange:[dMin,dMax], rangeText, now, nowMs:(schedParse(now)||{}).getTime?schedParse(now).getTime():0,
               instOpts, teamOpts, catOpts, myTasks };
    });
    /* ---- 操作 ---- */
    /** 人工取消排程的任务 _key 集合（墓碑）：取消后不再被系统自动补排 */
    function schedCancelledKeys(){ return schedBag('cancelled').map(r=> r._key); }
    function schedMarkCancelled(key){
      const bag = schedBag('cancelled');
      if(!bag.some(r=> r._key===key)) bag.push({ _key: key });
    }
    function schedUnmarkCancelled(key){
      const bag = schedBag('cancelled');
      const i = bag.findIndex(r=> r._key===key);
      if(i>=0) bag.splice(i,1);
    }
    /** 系统自动排：打开「排程」弹窗时，为我的任务中「待排程且未人工取消」的任务自动排位 */
    function schedAutoFillMy(){
      const cancelled = new Set(schedCancelledKeys());
      const myRows = ((MOCK[FLOW_MY_TASK]||{}).main)||[];
      const myKeys = new Set(myRows.map(r=> String(r['样品编号']||'')+'|'+String(r['检验类名称']||'')));
      const stamp = nowStamp();
      const mkPlan = t=>{
        const slot = schedAutoSlot(t);
        if(!slot) return false;
        const team = t._team || t.检验班组;
        const plan = {
          id: 'sp-'+Date.now()+'-'+Math.random().toString(36).slice(2,6), _key: t._key,
          排程单号: schedNextNo(),
          检验仪器: slot.inst['仪器名称'], 仪器编码: slot.inst['仪器编号'],
          计划开始: schedFmt(slot.st), 计划结束: schedFmt(slot.en),
          计划工时: (+t._hours || 2).toFixed(1), 排程方式:'自动', 排程人:'系统', 排程时间: stamp,
          班次: schedShiftOf(team).name,
          检验日历: (schedCalOf(team, schedFmtD(slot.st))||{})['日历名称'] || '—'
        };
        schedPlans().push(plan);
        schedLog(t, '自动排程', '—', schedPlanDesc(plan), '系统自动排程：'+plan['仪器编码'], '系统', stamp);
        return true;
      };
      let n = 0;
      const tasks = schedTasks();
      tasks.filter(t=> myKeys.has(t._key) && t.排程状态==='待排程' && !cancelled.has(t._key)).forEach(t=>{ if(mkPlan(t)) n++; });
      // 未进入任务分派的行同样自动排位（排程域=我的任务全集）
      const haveKey = new Set(tasks.map(x=>x._key));
      myRows.forEach(r=>{
        const key = String(r['样品编号']||'')+'|'+String(r['检验类名称']||'');
        if(haveKey.has(key) || cancelled.has(key)) return;
        if(schedPlans().some(p=> p._key===key)) return;
        if(mkPlan(schedSynthTask(r))) n++;
      });
      if(n){ flowSyncEntry(); bumpStore(); }
    }
    function schedAutoRun(){
      let pool = schedTasks().filter(t=> t.排程状态==='待排程');
      if(sb.sel.length){
        const ids = new Set(sb.sel);
        const picked = pool.filter(t=> ids.has(t._key));
        if(picked.length) pool = picked;
      }
      if(!pool.length){ ElMessage.warning(sb.sel.length ? '所选任务均不可排程' : '没有待排程的任务'); return; }
      pool.sort(schedSortKey);
      const stamp = nowStamp();
      let n=0, late=0, noInst=0;
      pool.forEach(t=>{
        const slot = schedAutoSlot(t);
        if(!slot){ noInst++; return; }
        const team = t._team || t.检验班组;
        const plan = {
          id: 'sp-'+Date.now()+'-'+Math.random().toString(36).slice(2,6), _key: t._key,
          排程单号: schedNextNo(),
          检验仪器: slot.inst['仪器名称'], 仪器编码: slot.inst['仪器编号'],
          计划开始: schedFmt(slot.st), 计划结束: schedFmt(slot.en),
          计划工时: (+t._hours).toFixed(1), 排程方式:'自动', 排程人:'系统', 排程时间: stamp,
          班次: schedShiftOf(team).name,
          检验日历: (schedCalOf(team, schedFmtD(slot.st))||{})['日历名称'] || '—'
        };
        schedPlans().push(plan);
        schedLog(t, '自动排程', '—', schedPlanDesc(plan),
          '自动排程：命中'+(t._instSrc==='已分配'?'已分配':'')+'仪器 '+plan['仪器编码'], '系统', stamp);
        if(t.需求完成时间!=='—' && plan['计划结束'] > t.需求完成时间) late++;
        n++;
      });
      flowSyncEntry();
        bumpStore();
      ElMessage.success('已排程 '+n+' 个任务' + (late? '，'+late+' 个预计超出需求完成时间':'') + (noInst? '，'+noInst+' 个无可用仪器':''));
    }
    function schedOpenDlg(t, mode){
      const plan = schedPlans().find(p=> p._key===t._key);
      if(mode==='adjust' && plan){ const why = schedMoveBlockReason(t); if(why){ ElMessage.warning(why); return; } }
      const pool = (t._cands && t._cands.length) ? t._cands : schedInstPool(t.仪器类型);
      sb.dlg.mode = mode || 'sched';
      sb.dlg.task = t;
      sb.dlg.instOpts = pool.map(r=> r['仪器名称']);
      sb.dlg.head = {
        样品编号: t['样品编号'], 报检单号: t['报检单号'], 检验类: t['检验类'], 检验项: t['检验项'],
        检验班组: t['检验班组'], 适用仪器: t['适用仪器'], 优先级: t['优先级'],
        需求完成时间: t['需求完成时间'], 取样时间: t['取样时间']
      };
      const defInst = plan ? plan['检验仪器'] : (pool[0] ? pool[0]['仪器名称'] : '');
      sb.dlg.form = { 仪器: defInst, 开始: plan ? plan['计划开始'] : '', 工时: plan ? +plan['计划工时'] : +t._hours, 结束:'' };
      sb.dlg.title = (mode==='adjust' ? '调整' : '排程') + ' · ' + t['样品编号'] + '-' + t['检验类'];
      sb.dlg.visible = true;
      sb.dlgCalcEnd();
    }
    function schedInShiftWindow(st, team){
      const sh = schedShiftOf(team);
      const [shH, shM] = sh.start.split(':').map(Number);
      const [eh, eM] = sh.end.split(':').map(Number);
      const day = new Date(st.getFullYear(), st.getMonth(), st.getDate());
      const ws = new Date(day); ws.setHours(shH, shM, 0, 0);
      const we = new Date(day); we.setHours(eh, eM, 0, 0);
      if(sh.cross || we<=ws) we.setDate(we.getDate()+1);
      return st>=ws && st<we;
    }
    function schedWritePlan(t, f, mode){
      const inst = ((MOCK.instrument||{}).main||[]).find(r=> r['仪器名称']===f.仪器);
      const code = inst ? inst['仪器编号'] : '';
      const st = schedParse(f.开始), en = new Date(st.getTime()+ (+f.工时)*3600000);
      const exist = schedPlans().find(p=> p._key===t._key);
      const oldDesc = schedPlanDesc(exist);
      const plan = exist || { id:'sp-'+Date.now()+'-'+Math.random().toString(36).slice(2,6), _key:t._key };
      const team = t._team || t.检验班组;
      Object.assign(plan, {
        排程单号: plan['排程单号'] || schedNextNo(),
        检验仪器: f.仪器, 仪器编码: code, 计划开始: schedFmt(st), 计划结束: schedFmt(en),
        计划工时: (+f.工时).toFixed(1), 排程方式: '手动', 排程人: '管理员', 排程时间: nowStamp(),
        班次: schedShiftOf(team).name,
        检验日历: (schedCalOf(team, schedFmtD(st))||{})['日历名称'] || '—'
      });
      if(!exist) schedPlans().push(plan);
      schedUnmarkCancelled(t._key);
      schedLog(t, mode==='adjust' ? '调整排程' : '手动排程', oldDesc, schedPlanDesc(plan),
        mode==='adjust' ? '—' : '手动排程', '管理员', plan['排程时间']);
      flowSyncEntry();
        bumpStore();
      sb.dlg.visible = false;
      ElMessage.success(mode==='adjust' ? '已调整排程' : '排程成功');
    }
    function schedSaveDlg(){
      const f = sb.dlg.form, t = sb.dlg.task;
      if(!f.仪器){ ElMessage.warning('请选择检验仪器'); return; }
      const st = schedParse(f.开始);
      if(!st){ ElMessage.warning('请选择计划开始时间'); return; }
      const h = +f.工时;
      if(!h || h<0.1 || h>24){ ElMessage.warning('请输入计划工时'); return; }
      // （调整弹窗不再收集调整原因，流水说明记「—」）
      const team = t._team || t.检验班组;
      if(!schedIsWorkday(team, st) || !schedInShiftWindow(st, team)){
        ElMessage.warning('计划开始须为工作日且在班次时段内'); return;
      }
      const inst = ((MOCK.instrument||{}).main||[]).find(r=> r['仪器名称']===f.仪器);
      const code = inst ? inst['仪器编号'] : '';
      const en = new Date(st.getTime()+ h*3600000);
      const clash = schedPlans().find(p=> p['仪器编码']===code && p._key!==t._key
        && schedParse(p['计划开始'])<en && schedParse(p['计划结束'])>st);
      if(clash){
        const ct = schedTasks().find(x=> x._key===clash._key);
        const label = ct ? ct['样品编号']+'-'+ct['检验类'] : clash._key;
        ElementPlus.ElMessageBox.confirm('与任务 '+label+' 时段冲突，确认仍要排程？', '时段冲突', { type:'warning' })
          .then(()=> schedWritePlan(t, f, sb.dlg.mode)).catch(()=>{});
        return;
      }
      const dead = t.需求完成时间;
      if(dead && dead!=='—' && schedFmt(en) > dead){
        ElementPlus.ElMessageBox.confirm('计划结束将超出需求完成时间（'+dead+'），确认保存？', '超期提醒', { type:'warning' })
          .then(()=> schedWritePlan(t, f, sb.dlg.mode)).catch(()=>{});
        return;
      }
      schedWritePlan(t, f, sb.dlg.mode);
    }
    function schedCancelRow(t){
      const lp = schedPlans().find(x=> x._key===t._key);
      if(lp && lp['锁定']==='是'){ ElMessage.warning('该排程已锁定，请先解锁'); return; }
      ElementPlus.ElMessageBox.confirm('取消排程将清空计划起止与仪器，确认取消？', '取消排程', {
        type: 'warning', confirmButtonText: '确定', cancelButtonText: '关闭'
      }).then(()=>{
        const bag = schedPlans();
        const i = bag.findIndex(p=> p._key===t._key);
        const old = i>=0 ? bag[i] : null;
        if(i>=0) bag.splice(i,1);
        schedMarkCancelled(t._key);
        schedLog(t, '取消排程', schedPlanDesc(old), '—', '—', '管理员', nowStamp());
        flowSyncEntry();
        bumpStore();
        ElMessage.success('已取消排程');
      }).catch(()=>{});
    }
    function schedCancelBatch(){
      const ids = new Set(sb.sel);
      const rows = schedTasks().filter(t=> ids.has(t._key) && t.排程状态==='已排程' && t['锁定']!=='是');
      if(!rows.length){ ElMessage.warning('所选任务中没有可取消的排程（锁定任务需先解锁）'); return; }
      ElementPlus.ElMessageBox.confirm('将取消 '+rows.length+' 个任务的排程，确认取消？', '取消排程', {
        type: 'warning', confirmButtonText: '确定', cancelButtonText: '关闭'
      }).then(()=>{
        const bag = schedPlans(), stamp = nowStamp();
        rows.forEach(t=>{
          const i = bag.findIndex(p=> p._key===t._key);
          const old = i>=0 ? bag[i] : null;
          if(i>=0) bag.splice(i,1);
          schedMarkCancelled(t._key);
          schedLog(t, '取消排程', schedPlanDesc(old), '—', '—', '管理员', stamp);
        });
        sb.sel = [];
        flowSyncEntry();
        bumpStore();
        ElMessage.success('已取消 '+rows.length+' 个任务的排程');
      }).catch(()=>{});
    }
    /** 任务不可调整的原因：''=可调整。锁定、当前时间之前的已完成/检验中、当前进行中的检验中不可动；未来时段的检验中/已完成仍可调整（提前检验/提前完成需手动更新甘特） */
    function schedMoveBlockReason(t){
      if(!t) return '任务不存在';
      if(t['排程状态']==='待排程') return '该任务尚未排程';
      if(t['锁定']==='是') return '该排程已锁定，请先解锁';
      const now = schedParse(schedNow());
      const s = schedParse(t['计划开始']), e = schedParse(t['计划结束']);
      if(t['排程状态']==='检验中' && s && s<=now) return '该任务已在检验中，不可调整';
      if(t['排程状态']==='已完成' && e && e<=now) return '该任务已完成，不可调整';
      return '';
    }
    /** 甘特拖动落位：instName=目标仪器名，s/e=毫秒时间戳；时长不变平移，可换候选仪器；重叠仅提示不拦截 */
    function schedDropPlan(t, instName, sMs, eMs){
      const inst = ((MOCK.instrument||{}).main||[]).find(r=> r['仪器名称']===instName);
      const exist = schedPlans().find(p=> p._key===t._key);
      if(!inst || !exist) return;
      const blockWhy = schedMoveBlockReason(t);
      if(blockWhy){ ElMessage.warning(blockWhy); return; }
      const st = new Date(sMs), en = new Date(eMs);
      const oldDesc = schedPlanDesc(exist);
      const team = t._team || t.检验班组;
      Object.assign(exist, {
        检验仪器: instName, 仪器编码: inst['仪器编号'],
        计划开始: schedFmt(st), 计划结束: schedFmt(en),
        排程方式: '手动', 排程人: '管理员', 排程时间: nowStamp(),
        班次: schedShiftOf(team).name,
        检验日历: (schedCalOf(team, schedFmtD(st))||{})['日历名称'] || '—'
      });
      const clash = schedPlans().find(p=> p['仪器编码']===inst['仪器编号'] && p._key!==t._key
        && schedParse(p['计划开始'])<en && schedParse(p['计划结束'])>st);
      const ct = clash && schedTasks().find(x=> x._key===clash._key);
      schedLog(t, '调整排程', oldDesc, schedPlanDesc(exist), '甘特拖动', '管理员', exist['排程时间']);
      flowSyncEntry();
        bumpStore();
      if(clash) ElMessage.warning('已调整；与 '+(ct ? ct['样品编号']+'-'+ct['检验类'] : '其他任务')+' 时段重叠，已标冲突');
      else ElMessage.success('已调整排程');
    }
    /** 甘特框选组拖落位：entries=[{t,instName,s,e}]，同 schedDropPlan 但批量写、一次提示；说明记「甘特批量拖动」 */
    function schedDropMulti(entries){
      const insts = ((MOCK.instrument||{}).main||[]);
      const stamp = nowStamp();
      let moved = 0, skipped = 0;
      const clashSet = new Set();
      (entries||[]).forEach(en=>{
        const inst = insts.find(r=> r['仪器名称']===en.instName);
        const exist = schedPlans().find(p=> p._key===en.t._key);
        if(!inst || !exist){ skipped++; return; }
        if(schedMoveBlockReason(en.t)){ skipped++; return; }
        const st = new Date(en.s), e2 = new Date(en.e);
        const oldDesc = schedPlanDesc(exist);
        const team = en.t._team || en.t.检验班组;
        Object.assign(exist, {
          检验仪器: en.instName, 仪器编码: inst['仪器编号'],
          计划开始: schedFmt(st), 计划结束: schedFmt(e2),
          排程方式: '手动', 排程人: '管理员', 排程时间: stamp,
          班次: schedShiftOf(team).name,
          检验日历: (schedCalOf(team, schedFmtD(st))||{})['日历名称'] || '—'
        });
        schedPlans().forEach(p=>{
          if(p['仪器编码']===inst['仪器编号'] && p._key!==en.t._key
            && schedParse(p['计划开始'])<e2 && schedParse(p['计划结束'])>st) clashSet.add(p._key);
        });
        schedLog(en.t, '调整排程', oldDesc, schedPlanDesc(exist), '甘特批量拖动', '管理员', stamp);
        moved++;
      });
      if(!moved){ if(skipped) ElMessage.warning('所选任务均不可调整'); return; }
      flowSyncEntry();
        bumpStore();
      if(clashSet.size) ElMessage.warning('已批量调整 '+moved+' 个排程；其中 '+clashSet.size+' 个与其他任务时段重叠，已标冲突');
      else ElMessage.success('已批量调整 '+moved+' 个排程');
    }
    /** 确认排程回写袋：_key=样品编号|检验类 → 预计完成时间；flowSyncEntry 合并主列表时消费 */
    function schedFbBag(){ const b = (MOCK['my-task-schedfb'] = MOCK['my-task-schedfb'] || {}); return (b.main = b.main || []); }
    /** 确认排程回写：计划结束 → 数据录入-我的「预计完成时间」，反馈状态置「已填写」（按 样品编号|检验类 匹配行） */
    function schedFbConfirm(t){
      const eta = String(t && t['计划结束'] || '').trim();
      if(!eta || eta==='—') return;
      const bag = schedFbBag();
      const ex = bag.find(o=> o._key===t._key);
      if(ex) ex['预计完成时间'] = eta;
      else bag.push({ _key: t._key, 样品编号: t['样品编号'], 检验类名称: t['检验类'], 预计完成时间: eta, 反馈状态: '已填写' });
      const myRow = (((MOCK[FLOW_MY_TASK]||{}).main)||[]).find(r=> String(r['样品编号']||'')+'|'+String(r['检验类名称']||'')===t._key);
      if(myRow) applyFbLineEta(myRow, eta);
    }
    /** 锁定/解锁排程：锁定后禁止拖动、调整、取消 */
    function schedToggleLock(t, lock){
      const p = schedPlans().find(x=> x._key===t._key);
      if(!p){ ElMessage.warning('该任务暂无排程'); return; }
      p['锁定'] = lock ? '是' : '否';
      if(lock) schedFbConfirm(t);
      schedLog(t, lock ? '锁定排程' : '解锁排程', schedPlanDesc(p), schedPlanDesc(p),
        lock ? '锁定：禁止拖动/调整/取消' : '解锁：恢复可调整', '管理员', nowStamp());
      flowSyncEntry();
        bumpStore();
      ElMessage.success(lock ? '已锁定，拖动与修改已禁用' : '已解锁');
    }
    function schedLockBatch(lock){
      const ids = new Set(sb.sel);
      const rows = schedTasks().filter(t=> ids.has(t._key) && t.排程状态==='已排程' && t['锁定']!==(lock?'是':'否'));
      if(!rows.length){ ElMessage.warning('所选任务中没有可'+(lock?'锁定':'解锁')+'的排程'); return; }
      const stamp = nowStamp();
      rows.forEach(t=>{
        const p = schedPlans().find(x=> x._key===t._key); if(!p) return;
        p['锁定'] = lock ? '是' : '否';
        if(lock) schedFbConfirm(t);
        schedLog(t, lock?'锁定排程':'解锁排程', schedPlanDesc(p), schedPlanDesc(p), '批量'+(lock?'锁定':'解锁'), '管理员', stamp);
      });
      sb.sel = [];
      flowSyncEntry();
        bumpStore();
      ElMessage.success('已'+(lock?'锁定':'解锁')+' '+rows.length+' 个任务');
    }
    function schedExport(kind){
      const esc = v=> String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      let cols, rows, name;
      if(kind==='logs'){
        cols = [['操作类型','操作类型'],['样品编号','样品编号'],['报检单号','报检单号'],['物料名称','物料名称'],['检验类','检验类'],['检验班组','检验班组'],['原排程','原排程'],['新排程','新排程'],['说明','说明'],['操作人','操作人'],['操作时间','操作时间']];
        rows = schedData.value.logs; name = '检验排程流水';
      } else {
        cols = [['样品编号','样品编号'],['排程状态','排程状态'],['优先级','优先级'],['需求完成时间','需求完成时间'],['报检类型','报检类型'],['报检单号','报检单号'],['物料编码','物料编码'],['物料名称','物料名称'],['检验类','检验类'],['检验项','检验项'],['检验班组','检验班组'],['检验仪器','检验仪器'],['计划开始','计划开始'],['计划结束','计划结束'],['计划工时','计划工时(h)'],['超期','预警'],['班次','班次'],['检验日历','检验日历'],['取样时间','取样时间'],['排程方式','排程方式'],['排程人','排程人'],['排程时间','排程时间'],['冲突','冲突']];
        rows = schedData.value.tasks; name = '检验排程任务';
      }
      if(!rows.length){ ElMessage.warning('没有可导出的数据'); return; }
      const head = '<tr>'+cols.map(c=> '<th>'+esc(c[1])+'</th>').join('')+'</tr>';
      const body = rows.map(r=> '<tr>'+cols.map(c=> '<td>'+esc(r[c[0]])+'</td>').join('')+'</tr>').join('');
      const html = '<html><head><meta charset="utf-8"></head><body><table border="1">'+head+body+'</table></body></html>';
      const blob = new Blob([html], { type:'application/vnd.ms-excel' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name+'-'+nowStamp().slice(0,10)+'.xls'; a.click();
      URL.revokeObjectURL(a.href);
    }
