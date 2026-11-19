    function saveWjOrderForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      if(!txt('外校单号')){ ElMessage.warning('请刷新生成外校单号'); return; }
      if(!txt('单据类型')){ ElMessage.warning('请选择单据类型'); return; }
      if(!txt('外校单位')){ ElMessage.warning('请选择外校单位'); return; }
      const base = { 单据类型: txt('单据类型'), 外校单位: txt('外校单位'), 外校单位编码: txt('外校单位编码'), 备注: txt('备注') };
      const list = wjOrderRows();
      if(formMode.value==='edit'){
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑的外校单'); return; }
        if(!DJ_OPEN.includes(cur['单据状态'])){ ElMessage.warning('仅待执行、执行中的外校单可编辑'); return; }
        Object.assign(cur, base);
        formVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功');
        return;
      }
      let no = txt('外校单号');
      if(list.some(r=> r['外校单号']===no)) no = nextWjNo();
      list.unshift(Object.assign({ id: 'wjo-'+Date.now(), 单据状态: '待执行', 外校单号: no }, base,
        { 创建时间: nowStamp(), 创建人: CI_OPERATOR, 关闭说明: '', 关闭人: '', 关闭时间: '', 操作时间: '', 操作人: '', _lines: [] }));
      formVisible.value = false;
      bumpStore();
      ElMessage.success('单据提交成功，状态为待执行');
    }
    function wjPicked(){ return tableData.value.filter(r=> selectedIds.value.includes(r.id)); }
    function closeWjOrders(){
      const rows = wjPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !DJ_OPEN.includes(r['单据状态']))){ ElMessage.warning('仅待执行、执行中的外校单可关闭'); return; }
      ElementPlus.ElMessageBox.prompt('请输入关闭说明', '关闭', {
        confirmButtonText:'确定', cancelButtonText:'取消', inputType:'textarea', inputPlaceholder:'必填',
        inputValidator: v=> !!String(v||'').trim() || '请输入关闭说明'
      }).then(({ value })=>{
        const ids = new Set(rows.map(r=> r.id)), at = nowStamp();
        wjOrderRows().forEach(r=>{
          if(ids.has(r.id)) Object.assign(r, { 单据状态: '已关闭', 关闭说明: String(value).trim(), 关闭人: CI_OPERATOR, 关闭时间: at });
        });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已关闭 '+ids.size+' 张外校单');
      }).catch(()=>{});
    }
    function deleteWjOrders(){
      const ids = new Set(selectedIds.value||[]);
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      if(wjOrderRows().some(r=> ids.has(r.id) && !DJ_OPEN.includes(r['单据状态']))){ ElMessage.warning('仅待执行、执行中的外校单可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 张外校单？删除后不可恢复。','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        MOCK[WJ_ORDER]['tab-1'] = wjOrderRows().filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 张外校单');
      }).catch(()=>{});
    }
    function linkWjOrders(){
      const rows = wjPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r['外校单号']).filter(Boolean))];
      activeTab.value = activeTab.value==='tab-1' ? 'tab-2' : 'tab-1';
      selectedIds.value = []; pageNum.value = 1;
      nextTick(()=>{
        resetQueryModel();
        query['外校单号'] = nos.join('、');
        queryExpanded.value = true;
        ElMessage.success('已按 '+nos.length+' 个外校单号关联查询');
      });
    }
    function openWjExec(row){
      const p = wjOrderRows().find(r=> r.id===row.id);
      if(!p) return;
      if(!DJ_OPEN.includes(p['单据状态'])){ ElMessage.warning('仅待执行、执行中的外校单可执行'); return; }
      wjExecRow.value = { ...p };
      wjExecLines.value = (p._lines||[]).map(l=> wjLineView(l));
      wjExecSel.value = [];
      wjExecVisible.value = true;
    }
    function wjEligibleInsts(){
      const added = new Set(wjExecLines.value.map(l=> l._instId));
      return djInstruments().filter(r=> r['使用状态']==='在用' && r['是否外校']==='是' && !added.has(r.id));
    }
    function onWjLineAction(name){
      if(name==='添加仪器'){ openIoPick('inst', 'wjInsts', '', true); return; }
      if(name==='导入数据'){
        const add = wjEligibleInsts();
        if(!add.length){ ElMessage.info('没有可导入的仪器（仅在用且是否外校为「是」的仪器）'); return; }
        wjExecLines.value = wjExecLines.value.concat(add.map(r=> wjLineView(wjNewLine(r))));
        ElMessage.success('Demo：已模拟 Excel 导入 '+add.length+' 台仪器');
        return;
      }
      if(name==='批量删除'){
        const set = new Set(wjExecSel.value||[]);
        if(!set.size){ ElMessage.warning('请先勾选仪器'); return; }
        wjExecLines.value = wjExecLines.value.filter(l=> !set.has(l));
        wjExecSel.value = [];
      }
    }
    function onWjLineChange(l){ l['下次外校日期'] = wjNextDate(l['本次外校日期'], l['外校周期']); }
    function openWjLineSupplier(l){ wjLinePickRow.value = l; openIoPick('supplier', 'wjLineSupplier', '本次外校单位'); }
    function saveWjExec(submit){
      const p = wjOrderRows().find(r=> r.id===wjExecRow.value.id);
      if(!p || !DJ_OPEN.includes(p['单据状态'])){ ElMessage.warning('仅待执行、执行中的外校单可执行'); return; }
      const lines = wjExecLines.value;
      if(submit){
        if(!lines.length){ ElMessage.warning('请添加仪器'); return; }
        for(const l of lines){
          const miss = WJ_REQ.find(k=> !String(l[k]||'').trim());
          if(miss){ ElMessage.warning('仪器 '+l['仪器编号']+' 请填写「'+miss+'」'); return; }
        }
      }
      const keep = ['_instId','上次外校日期','本次外校日期','外校周期','下次外校日期','本次外校单位','本次外校结果','校验费用','外校报告','外校说明'];
      p._lines = lines.map(l=> Object.fromEntries(keep.map(k=> [k, l[k]||''])));
      if(!submit){
        p['单据状态'] = '执行中';
        wjExecVisible.value = false;
        bumpStore();
        ElMessage.success('已保存，单据状态为执行中');
        return;
      }
      Object.assign(p, { 单据状态: '已完成', 操作时间: nowStamp(), 操作人: CI_OPERATOR });
      p._lines.forEach(l=>{
        const inst = djInstruments().find(r=> r.id===l._instId);
        if(!inst) return;
        const q = parseQtyUnit(l['外校周期'], '天');
        Object.assign(inst, {
          上次外校日期: l['本次外校日期'], 外校周期: q.n ? String(q.n) : l['外校周期'], 外校周期单位: q.n ? q.u : (inst['外校周期单位']||''),
          下次外校日期: l['下次外校日期'], 上次外校单位: l['本次外校单位'], 上次外校结果: l['本次外校结果']
        });
      });
      wjExecVisible.value = false;
      bumpStore();
      ElMessage.success('提交成功，已生成外校记录；已反写仪器台账外校信息');
    }
    /** 仪器履历：实时汇总点检 / 保养 / 内校 / 外校的完成记录及审核通过的停用单、启用单、报废单；维修模块暂为静态演示数据 */
    const YL_PAGE = 'np-0301-02';
    function ylRows(){
      const inst = id=> djInstruments().find(r=> r.id===id) || {};
      const mk = (instId, o)=>{
        const i = inst(instId);
        return Object.assign({ _instId: instId, 仪器编号: i['仪器编号'] || '', 仪器名称: i['仪器名称'] || '', 仪器类型: i['仪器类型'] || '' }, o);
      };
      const rows = [];
      [DJ_SCHEME, BY_SCHEME, NJ_SCHEME].forEach(sid=>{
        const k = DJ_KINDS[sid];
        ((MOCK[k.plan]||{})['tab-1']||[]).filter(p=> p['计划状态']==='已完成').forEach(p=>{
          rows.push(mk(p._instId, { id: 'yl-'+p.id, 作业结果: p['检查结果'] || '/', 来源单据类型: '仪器'+k.w, 来源单号: p['计划单号'],
            操作时间: p['操作时间'], 操作人: p['操作人'], _src: { page: k.plan, tab: 'tab-2', key: '计划单号' } }));
        });
      });
      wjOrderRows().filter(o=> o['单据状态']==='已完成').forEach(o=>{
        (o._lines||[]).forEach((l, i)=>{
          rows.push(mk(l._instId, { id: 'yl-'+o.id+'-'+i, 作业结果: l['本次外校结果'] || '/', 来源单据类型: '仪器外校', 来源单号: o['外校单号'],
            操作时间: o['操作时间'], 操作人: o['操作人'], _src: { page: WJ_ORDER, tab: 'tab-2', key: '外校单号' } }));
        });
      });
      Object.entries(TY_KINDS).filter(([, k])=> !k.multi).forEach(([pid, k])=>{
        tyRows(pid).filter(r=> r['审核状态']==='审核通过').forEach(r=>{
          const last = (((r._audit||{})['记录'])||[]).slice(-1)[0] || {};
          rows.push(mk(r._instId, { id: 'yl-'+r.id, 作业结果: k.yl, 来源单据类型: '仪器'+k.w, 来源单号: r[k.w+'单号'],
            操作时间: last['时间'] || r['创建时间'], 操作人: last['操作人'] || r['创建人'], _src: { page: pid, key: k.w+'单号' } }));
        });
      });
      ((MOCK[YL_PAGE]||{}).main||[]).filter(r=> !TY_KINDS[r._srcPage]).forEach(r=> rows.push(mk(r._instId, { ...r, _src: { page: r._srcPage, key: r._srcPage===BX_PAGE ? '报修单号' : '' } })));
      return rows.map(r=> Object.assign(r, { 操作时间: String(r['操作时间']||'').slice(0, 19) }));
    }
    function ylQueryRows(){
      let l = applyContainsExactQuery(ylRows(), query, ['仪器编号','仪器名称','仪器类型','来源单号','操作人'], ['来源单据类型','作业结果']);
      l = applyDateRangeQuery(l, query, '操作时间');
      return l.sort((a,b)=> String(b['操作时间']||'').localeCompare(String(a['操作时间']||'')));
    }
    /** 仪器使用时长流水：开始时间=前一天点检计划的计划开始时间，结束时间=当天样品检测中最后一次使用该仪器的时间；
     *  次日点检计划提交时汇总前一天数据，添加方式=自动；无点检计划的仪器可手动新增，添加方式=手动，仅手动数据可删 */
    function ylUsageBag(){
      const b = MOCK[YL_PAGE] = MOCK[YL_PAGE] || {};
      if(!Array.isArray(b['tab-2'])) b['tab-2'] = [];
      return b['tab-2'];
    }
    /** 仪器使用痕迹：数据录入提交时记录每台仪器当天的最后使用时间（仪器编号|日期 → 时间） */
    function ylMarkBag(){
      const b = MOCK[YL_PAGE] = MOCK[YL_PAGE] || {};
      if(!b.useMarks || typeof b.useMarks!=='object') b.useMarks = {};
      return b.useMarks;
    }
    function ylUseMark(s, cat, stamp){
      const st = ((((s||{})._entry||{}).byCat)||{})[cat];
      const insts = (st && Array.isArray(st.instruments) ? st.instruments : []).filter(Boolean);
      if(!insts.length) return;
      const marks = ylMarkBag(), ts = stamp || nowStamp(), day = ts.slice(0, 10);
      insts.forEach(name=>{
        const i = djInstruments().find(r=> r['仪器名称']===name) || {};
        const key = (i['仪器编号'] || name)+'|'+day;
        if(!marks[key] || marks[key] < ts) marks[key] = ts;
      });
    }
    function ylDateShift(dstr, days){
      const d = new Date(dstr+'T00:00:00');
      if(isNaN(d)) return '';
      d.setDate(d.getDate()+days);
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    }
    function ylHours(start, end){
      const t0 = djParseTime(start), t1 = djParseTime(end);
      return (t0 && t1) ? ((t1 - t0) / 3600000).toFixed(1) : '—';
    }
    /** 点检计划提交：汇总该仪器前一天的使用时长（前一天须有点检计划且当天有使用痕迹，每仪器每天一条） */
    function ylAutoUsage(p){
      if(!p) return;
      const inst = djInstruments().find(r=> r.id===p._instId) || djInstruments().find(r=> r['仪器编号']===p['仪器编号']) || {};
      const code = inst['仪器编号'] || p['仪器编号'] || '';
      const prevDay = ylDateShift(String(p['计划开始时间']||'').slice(0,10), -1);
      if(!code || !prevDay) return;
      const pp = djPlanRows().find(r=> r!==p && (r._instId===p._instId || r['仪器编号']===code) && String(r['计划开始时间']||'').slice(0,10)===prevDay);
      if(!pp) return;
      const marks = ylMarkBag();
      const end = Object.keys(marks).filter(k=> k.startsWith(code+'|'+prevDay)).map(k=> marks[k]).sort().pop();
      if(!end) return;
      if(ylUsageBag().some(r=> r['仪器编号']===code && String(r['开始时间']||'').slice(0,10)===prevDay)) return;
      ylUsageBag().unshift(Object.assign({ id:'ylu-'+Date.now()+'-'+Math.random().toString(36).slice(2,6) },
        bxInstSnap(inst), { 开始时间: pp['计划开始时间']||'', 结束时间: end, 使用时长: ylHours(pp['计划开始时间'], end), 添加方式:'自动' }));
    }
    /** 手动新增使用时长（面向无点检计划的仪器） */
    const ylAdd = reactive({ visible:false, instId:'', start:'', end:'' });
    const ylAddInstOptions = computed(()=> djInstruments().filter(i=> i['使用状态']!=='报废'));
    function ylAddOpen(){
      Object.assign(ylAdd, { instId:'', start:'', end:'' });
      ylAdd.visible = true;
    }
    function ylAddConfirm(){
      const inst = djInstruments().find(i=> i.id===ylAdd.instId);
      if(!inst){ ElMessage.warning('请选择仪器'); return; }
      if(!String(ylAdd.start||'').trim() || !String(ylAdd.end||'').trim()){ ElMessage.warning('请选择开始时间与结束时间'); return; }
      const t0 = djParseTime(ylAdd.start), t1 = djParseTime(ylAdd.end);
      if(t0 && t1 && t1 <= t0){ ElMessage.warning('结束时间须晚于开始时间'); return; }
      ylUsageBag().unshift(Object.assign({ id:'ylu-'+Date.now()+'-'+Math.random().toString(36).slice(2,6) },
        bxInstSnap(inst), { 开始时间: ylAdd.start, 结束时间: ylAdd.end, 使用时长: ylHours(ylAdd.start, ylAdd.end), 添加方式:'手动' }));
      ylAdd.visible = false;
      bumpStore();
      ElMessage.success('已新增使用时长流水');
    }
    function ylUsageDelete(){
      const ids = new Set(selectedIds.value||[]);
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      const rows = ylUsageBag().filter(r=> ids.has(r.id));
      const manual = rows.filter(r=> r['添加方式']==='手动');
      if(!manual.length){ ElMessage.warning('仅支持删除手动添加的数据'); return; }
      const skip = rows.length - manual.length;
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+manual.length+' 条手动添加的数据？'+(skip>0?'自动生成的数据不可删除，已跳过 '+skip+' 条。':''), '批量删除', { type:'warning', confirmButtonText:'删除', cancelButtonText:'取消' }).then(()=>{
        MOCK[YL_PAGE]['tab-2'] = ylUsageBag().filter(r=> !manual.some(m=> m.id===r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+manual.length+' 条');
      }).catch(()=>{});
    }
    function ylUsageQueryRows(){
      let l = applyContainsExactQuery(ylUsageBag().slice(), query, ['仪器编号','仪器名称','仪器条码','存放位置','责任部门','责任人'], ['仪器类型','添加方式']);
      l = applyDateRangeQuery(l, query, '开始时间');
      return l.sort((a,b)=> String(b['结束时间']||'').localeCompare(String(a['结束时间']||'')));
    }
    /** ===== 仪器稼动率表（np-0314-01） ===== */
    const UTIL_PAGE = 'np-0314-01';
    const UT_PLAN_KEY = { '日':'日计划时长', '周':'周计划时长', '月':'月计划时长', '年':'年计划时长' };
    const util = reactive({ gran:'月', range:null, instType:'', code:'', queried:false, rows:[] });
    const utilDetail = reactive({ visible:false, title:'', rows:[] });
    const utilPickerType = computed(()=> util.gran==='月' ? 'monthrange' : (util.gran==='年' ? 'yearrange' : 'daterange'));

    function utWeekKey(dstr){
      const d = new Date(String(dstr||'').slice(0,10).replace(/-/g,'/'));
      if(isNaN(d)) return '';
      const th = new Date(d.getTime() + (3 - (d.getDay()+6)%7) * 86400000);
      const y = th.getFullYear();
      const jan1 = new Date(y,0,1);
      const wk = Math.ceil((((th - jan1)/86400000) + (jan1.getDay()+6)%7 + 1)/7);
      return y+'-W'+String(wk).padStart(2,'0');
    }
    function utilPeriodKey(t, gran){
      const s = String(t||'').slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
      if(gran==='月') return s.slice(0,7);
      if(gran==='年') return s.slice(0,4);
      if(gran==='周') return utWeekKey(s);
      return s;
    }
    function utFmtDate(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
    function utilPeriods(gran, range){
      const usageKeys = [...new Set(ylUsageBag().map(r=> utilPeriodKey(r['开始时间'], gran)).filter(Boolean))].sort();
      let a = range && range[0] ? String(range[0]).slice(0,10) : '';
      let b = range && range[1] ? String(range[1]).slice(0,10) : '';
      const now = new Date();
      if(!a && !b){ // 无范围默认：近30天 / 近12周 / 近12个月 / 近5年
        if(gran==='月'){ const d=new Date(now.getFullYear(), now.getMonth()-11, 1); a = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01'; b = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01'; }
        else if(gran==='年'){ a = String(now.getFullYear()-4); b = String(now.getFullYear()); }
        else { const e = new Date(now.getTime() - (gran==='日'?29:83)*86400000); a = utFmtDate(e); b = utFmtDate(now); }
      }
      if(gran==='日' || gran==='周'){
        const out = [];
        const end = new Date(String(b).replace(/-/g,'/'));
        for(let d = new Date(String(a).replace(/-/g,'/')); d<=end && out.length<400; d.setDate(d.getDate()+1)){
          const k = utilPeriodKey(utFmtDate(d), gran);
          if(k && out[out.length-1]!==k) out.push(k);
        }
        return out;
      }
      // 月 / 年：key 步进
      const start = gran==='月' ? a.slice(0,7) : a.slice(0,4);
      const end = gran==='月' ? b.slice(0,7) : b.slice(0,4);
      if(!start || !end) return usageKeys;
      const out = []; let k = start, guard = 0;
      while(k && k<=end && guard++<600){
        out.push(k);
        const d = new Date((gran==='月' ? k+'-01' : k+'-01-01').replace(/-/g,'/'));
        if(gran==='月'){ d.setMonth(d.getMonth()+1); k = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
        else k = String(d.getFullYear()+1);
      }
      return out;
    }
    function utilPlanOf(inst, gran){
      const f = UT_PLAN_KEY[gran];
      const own = parseFloat(inst[f]);
      if(isFinite(own) && own>0) return own;
      const tp = (((MOCK['instrument']||{}).types)||[]).find(t=> t['仪器类型']===inst['仪器类型']) || {};
      const tv = parseFloat(tp[f]);
      return (isFinite(tv) && tv>0) ? tv : null;
    }
    function utUsageMap(gran){
      const m = new Map();
      ylUsageBag().forEach(r=>{
        const k = utilPeriodKey(r['开始时间'], gran);
        if(!k) return;
        const key = r['仪器编号']+'|'+k;
        m.set(key, (m.get(key)||0) + (parseFloat(r['使用时长'])||0));
      });
      return m;
    }
    function utCompute(){
      const gran = util.gran;
      const periods = utilPeriods(gran, util.range);
      const umap = utUsageMap(gran);
      const kwCode = String(util.code||'').trim();
      const insts = djInstruments().filter(i=> i['使用状态']!=='报废')
        .filter(i=> (!util.instType || i['仪器类型']===util.instType) && (!kwCode || String(i['仪器编号']||'').includes(kwCode)));
      const rows = [];
      insts.forEach(i=>{
        const plan = utilPlanOf(i, gran);
        periods.forEach(p=>{
          const used = +(umap.get(i['仪器编号']+'|'+p)||0).toFixed(1);
          const rate = (plan!=null && plan>0) ? +(used/plan*100).toFixed(1) : '—';
          rows.push({ 仪器编号:i['仪器编号'], 仪器名称:i['仪器名称'], 仪器类型:i['仪器类型']||'—', 责任部门:i['责任部门']||'—',
            统计周期:p, 计划时长: plan==null ? '—' : plan.toFixed(1), 使用时长: used.toFixed(1), 稼动率: rate, _rate: rate });
        });
      });
      rows.sort((x,y)=> y['统计周期']===x['统计周期'] ? ((x._rate==='—'?1e9:x._rate)-(y._rate==='—'?1e9:y._rate)) : String(y['统计周期']).localeCompare(String(x['统计周期'])));
      return rows;
    }
    const utilCards = computed(()=>{
      if(!util.queried) return [];
      const instN = new Set(util.rows.map(r=> r['仪器编号'])).size;
      const rates = util.rows.map(r=> r._rate).filter(v=> typeof v==='number' && isFinite(v));
      const avg = rates.length ? (rates.reduce((a,b)=>a+b,0)/rates.length).toFixed(1)+'%' : '—';
      let top = '—';
      if(rates.length){
        const best = util.rows.filter(r=> typeof r._rate==='number' && isFinite(r._rate)).sort((a,b)=> b._rate-a._rate || String(a['仪器编号']).localeCompare(String(b['仪器编号'])))[0];
        top = best['仪器名称']+' '+best._rate.toFixed(1)+'%';
      }
      const hours = util.rows.reduce((a,r)=> a + (parseFloat(r['使用时长'])||0), 0).toFixed(1);
      return [
        { label:'统计仪器数', value: instN, tone:'blue' },
        { label:'平均稼动率', value: avg, tone:'cyan' },
        { label:'最高稼动率', value: top, tone:'green' },
        { label:'使用时长合计', value: hours, tone:'blue' }
      ];
    });
    function utDefaultRange(){
      const now = new Date();
      if(util.gran==='月'){ const d = new Date(now.getFullYear(), now.getMonth()-11, 1); return [d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')]; }
      if(util.gran==='年'){ return [String(now.getFullYear()-4), String(now.getFullYear())]; }
      const e = new Date(now.getTime() - (util.gran==='日'?29:83)*86400000);
      return [utFmtDate(e), utFmtDate(now)];
    }
    util.range = utDefaultRange();
    function utQuery(){
      if(!Array.isArray(util.range) || !util.range[0] || !util.range[1]){ ElMessage.warning('请选择时间范围'); return; }
      util.rows = utCompute(); util.queried = true;
    }
    function utReset(){
      Object.assign(util, { instType:'', code:'', range:utDefaultRange(), queried:false });
      utQuery();
    }
    function utOpenDetail(row){
      utilDetail.title = '使用明细 - '+row['仪器名称']+'（'+row['统计周期']+'）';
      utilDetail.rows = ylUsageBag().filter(r=> r['仪器编号']===row['仪器编号'] && utilPeriodKey(r['开始时间'], util.gran)===row['统计周期'])
        .sort((a,b)=> String(b['结束时间']||'').localeCompare(String(a['结束时间']||'')));
      utilDetail.visible = true;
    }
    function utExport(){
      if(!util.queried){ ElMessage.warning('请先查询'); return; }
      if(!util.rows.length){ ElMessage.warning('没有可导出的数据'); return; }
      const cols = [['仪器编号','仪器编号'],['仪器名称','仪器名称'],['仪器类型','仪器类型'],['责任部门','责任部门'],['统计周期','统计周期'],['计划时长','计划时长（时）'],['使用时长','使用时长（时）'],['稼动率','稼动率（%）']];
      const esc = v=> String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const head = '<tr>'+cols.map(c=> '<th>'+esc(c[1])+'</th>').join('')+'</tr>';
      const body = util.rows.map(r=> '<tr>'+cols.map(c=> '<td>'+esc(r[c[0]])+'</td>').join('')+'</tr>').join('');
      const html = '<html><head><meta charset="utf-8"></head><body><table border="1">'+head+body+'</table></body></html>';
      const blob = new Blob([html], { type:'application/vnd.ms-excel' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '仪器稼动率_'+util.gran+'粒度.xls';
      document.body.appendChild(a); a.click(); a.remove();
      ElMessage.success('已导出当前统计结果');
    }
    watch(()=> pageId.value, v=>{ if(v===UTIL_PAGE && !util.queried) utQuery(); });
    /** ===== 制程SPC-多图（spc-process）：三类型块独立查询，分组出图 ===== */
    const SPC_P_PAGE = 'spc-process';
    const SPC_P_TYPES = [
      { key:'pi', label:'采购来料', tab:'tab-pi', typeName:'采购来料检', filters:['point','supplier'] },
      { key:'pp', label:'生产过程', tab:'tab-pp', typeName:'生产过程检', filters:['point','customer'] },
      { key:'pm', label:'生产物料', tab:'tab-pm', typeName:'生产物料检', filters:['point','customer'] }
    ];
    const SPC_P_DEFS = {
      pm:{ dates:['2026-06-01','2026-11-30'], scheme:'OLED中间体生产物料检方案',
        mats:['OLED-HTL-001 / HTL空穴传输材料 / OLED电子级'], items:['HPLC纯度','残留溶剂PGMEA'] },
      pp:{ dates:['2026-06-01','2026-11-30'], scheme:'OLED中间体过程检方案',
        mats:['OLED-HOST-G01 / 绿光主体材料 / 高纯≥99.99%','OLED-EML-B01 / 蓝光发光材料 / OLED电子级'], items:['HPLC纯度','残留溶剂PGMEA'] },
      pi:{ dates:['2026-06-01','2026-11-30'], scheme:'OLED中间体来料检方案',
        mats:['OLED-HIL-001 / HIL空穴注入材料 / OLED电子级','OLED-ETL-001 / 电子传输层材料 / OLED电子级'], items:['HPLC纯度','残留溶剂PGMEA'] }
    };
    // init=true 填演示默认值（首行），false 给「添加一行」的新行留空
    function spcPBlank(key, init){
      const d = (init===false) ? {} : (SPC_P_DEFS[key]) || {};
      return { dates:(d.dates||[]).slice(), point:'', supplier:'', customer:'', scheme:d.scheme||'', mats:(d.mats||[]).slice(), items:(d.items||[]).slice(), hl:'' };
    }
    function spcPBlock(key){ return { open:true, rows:[spcPBlank(key)] }; }
    const spcP = reactive({ more:false, queried:false, chartTab:'I图', sampleTab:'pi', anaTab:'pi', sampleDlg:false, groups:[], samples:{ pi:[], pp:[], pm:[] }, types:{ pi:spcPBlock('pi'), pp:spcPBlock('pp'), pm:spcPBlock('pm') } });
    function spcPAddRow(tk){ spcP.types[tk].rows.push(spcPBlank(tk, false)); }
    function spcPCopyRow(tk, ri){
      const rows = spcP.types[tk].rows, src = rows[ri];
      if(!src) return;
      rows.splice(ri+1, 0, { dates:(src.dates||[]).slice(), point:src.point||'', supplier:src.supplier||'', customer:src.customer||'', scheme:src.scheme||'', mats:(src.mats||[]).slice(), items:(src.items||[]).slice(), hl:src.hl||'' });
    }
    function spcPRemoveRow(tk, ri){ const rows = spcP.types[tk].rows; if(rows.length>1) rows.splice(ri, 1); }
    function spcPRowMatCount(tk){ return (spcP.types[tk].rows||[]).reduce((n,r)=> n+(r.mats||[]).length, 0); }
    function spcPQuantMap(){
      const m = {};
      (((MOCK['insp-project']||{})['tab-item'])||[]).forEach(r=>{
        if((r['启用状态']||'启用')==='启用' && r['检验项类型']==='定量' && r['检验项名称']) m[r['检验项名称']] = r['检验项单位'] || '';
      });
      return m;
    }
    function spcPHash(s){ let h=0; const t=String(s||''); for(let i=0;i<t.length;i++) h=(h*31+t.charCodeAt(i))>>>0; return h; }
    function spcPMatName(m){ return (String(m||'').split(' / ')[1] || String(m||'').split(' / ')[0] || '').trim(); }
    function spcPMatCode(m){ return (String(m||'').split(' / ')[0] || '').trim(); }
    function spcPRemoveMat(tk, ri, m){ const row = spcP.types[tk].rows[ri]; if(row) row.mats = row.mats.filter(x=> x!==m); }
    function spcPField(field){
      const seg = String(field||'').split('.');
      const blk = spcP.types[seg[0]];
      return { tp: blk && blk.rows[+seg[1]], key: seg[2] };
    }
    function spcPApplyPick(field, rows){
      const { tp, key } = spcPField(field);
      if(!tp) return;
      if(key==='mats'){
        tp.mats = rows.map(r=> [r['物料编码'], r['物料名称'], r['物料规格']].filter(Boolean).join(' / ')).filter(Boolean);
      } else if(key==='items'){
        tp.items = rows.map(r=> String(r['检验项名称']||'').trim()).filter(Boolean);
      }
    }
    function spcPApplySingle(field, kind, r){
      const { tp, key } = spcPField(field);
      if(!tp) return;
      if(key==='scheme') tp.scheme = r['检验方案名称'] || '';
      else if(key==='point') tp.point = r['采样点名称'] || '';
      else if(key==='supplier') tp.supplier = [r['供应商编码'], r['供应商名称']].filter(Boolean).join(' / ');
      else if(key==='customer') tp.customer = [r['客户编码'], r['客户名称']].filter(Boolean).join(' / ');
    }
    const SPC_P_REQ = [['dates','日期范围'],['mats','物料信息'],['scheme','检验方案'],['items','检验项']];
    function spcPFieldOk(tp, key){
      const v = tp[key];
      if(key==='dates') return !!(v && v[0] && v[1]);
      if(Array.isArray(v)) return v.length>0;
      return !!String(v||'').trim();
    }
    function spcPMatched(tp, def){
      const codes = new Set(tp.mats.map(spcPMatCode));
      const names = new Set(tp.mats.map(spcPMatName));
      let list = (((MOCK[FLOW_LEDGER]||{})[def.tab])||[]).filter(s=>
        codes.has(String(s['物料编码']||'').trim()) || names.has(String(s['物料名称']||'').trim()));
      list = list.filter(s=> String(s['检验完成时间']||'').trim() && String(s['检验完成时间']||'')!=='—');
      const rg = tp.dates || [];
      if(rg[0]) list = list.filter(s=> String(s['检验完成时间']||'').slice(0,10) >= rg[0]);
      if(rg[1]) list = list.filter(s=> String(s['检验完成时间']||'').slice(0,10) <= rg[1]);
      if(tp.point) list = list.filter(s=> String(s['采样点']||'').trim() === tp.point);
      if(tp.supplier){ const n = tp.supplier.split(' / ')[1] || tp.supplier; list = list.filter(s=> String(s['供应商名称']||'').includes(n)); }
      if(tp.customer){ const n = tp.customer.split(' / ')[1] || tp.customer; list = list.filter(s=> String(s['客户名称']||'').includes(n)); }
      return list;
    }
    function spcPCpkGrade(cpk){ return cpk>=1.67 ? 'A+级' : cpk>=1.33 ? 'A级' : cpk>=1.0 ? 'B级' : 'C级'; }
    function spcPUnitRange(unit, h){
      if(unit==='%') return { cl:99.6+(h%30)/100, sg:0.02+(h%15)/100 };
      if(unit==='ppb') return { cl:2+(h%60)/10, sg:0.3+(h%8)/10 };
      if(unit==='ppm') return { cl:15+(h%250)/10, sg:2+(h%40)/10 };
      return { cl:40+(h%200)/10, sg:3+(h%50)/10 };
    }
    function spcPCombo(def, tp, mp, item, matched, qmap){
      const h = spcPHash(def.key+'|'+mp.code+'|'+item);
      const unit = qmap[item] || '';
      const { cl, sg } = spcPUnitRange(unit, h);
      let pts = matched
        .filter(s=> String(s['物料编码']||'').trim() === mp.code)
        .slice()
        .sort((a,b)=> String(a['检验完成时间']||'').localeCompare(String(b['检验完成时间']||'')))
        .map(s=> ({ name:s['样品编号']||'—', v:+spcPVal(s['样品编号']+'|'+item, unit) }));
      if(!pts.length){
        for(let i=1;i<=20;i++){
          const hh = spcPHash(def.key+mp.code+item+'#'+i);
          pts.push({ name:'SP-'+String(i).padStart(2,'0'), v:+(cl + ((hh%1000-500)/500*2.4)*sg).toFixed(2) });
        }
      }
      const usl = +(cl+6*sg).toFixed(2), lsl = +(cl-6*sg).toFixed(2);
      const ucl = +(cl+3*sg).toFixed(2), lcl = +(cl-3*sg).toFixed(2);
      const vs = pts.map(p=> p.v);
      const oosN = vs.filter(v=> v>usl || v<lsl).length;
      const oocN = vs.filter(v=> v>ucl || v<lcl).length;
      const oowN = vs.filter(v=> v>cl+2*sg || v<cl-2*sg).length;
      const lastDate = matched.length ? matched.map(s=> String(s['检验完成时间']||'')).sort().slice(-1)[0].slice(0,10) : '';
      const dl = (((MOCK['insp-project']||{})['tab-item'])||[]).find(r=> r['检验项名称']===item);
      const cp = +((usl-lsl)/(6*sg)).toFixed(2), cpu = +((usl-cl)/(3*sg)).toFixed(2), cpl = +((cl-lsl)/(3*sg)).toFixed(2), cpkV = Math.min(cpu, cpl);
      return {
        key: def.key+'|'+mp.code+'|'+item,
        domId: 'spc-chart-'+def.key+'-'+spcPHash(mp.code+'|'+item).toString(36),
        mat: mp.code, matName: mp.name || mp.code, item, unit, points: pts, hl: String(tp.hl||'').trim(),
        limits:{ usl, lsl, ucl, lcl, cl:+cl.toFixed(2), sigma:+sg.toFixed(3) },
        ana: {
          物料信息: [mp.code, mp.name].filter(Boolean).join(' / ') || '—',
          检验方案: tp.scheme || '—', 样本总数: String(pts.length), 检验项: item, 单位: unit || '—',
          'D.L': (dl && dl['检出限D.L']) || '—',
          MAX: Math.max(...vs).toFixed(2), MIN: Math.min(...vs).toFixed(2),
          USL: usl, LSL: lsl, UCL: ucl, LCL: lcl, CL: cl.toFixed(2),
          UWL: (cl+2*sg).toFixed(2), LWL: (cl-2*sg).toFixed(2),
          Average: cl.toFixed(2), 'σ': sg.toFixed(3), Ca: '0.12',
          Cp: cp, CPU: cpu, CPL: cpl, CPK: cpkV, CPK等级: spcPCpkGrade(cpkV),
          OOC: String(oocN), OOS: String(oosN), OOW: String(oowN), OOT: '0',
          统计日期: lastDate || nowStamp().slice(0,10),
          合格样本数: String(pts.length - oosN), 合格率: (pts.length ? ((pts.length-oosN)/pts.length*100).toFixed(1) : '0')+'%',
          检验项名称: item, 不合格数: String(oosN), 不合格率: (pts.length ? (oosN/pts.length*100).toFixed(1) : '0')+'%'
        }
      };
    }
