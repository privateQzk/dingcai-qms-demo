    const tyAuditVisible = ref(false);
    const tyAuditRow = ref(null);
    const tyAuditForm = reactive({ 结果: '通过', 意见: '' });
    const tyAuditNode = computed(()=>{
      const audit = (tyAuditRow.value && tyAuditRow.value._audit) || {};
      return (audit.节点 || [])[Number(audit.当前节点) || 0] || null;
    });
    function openTyAudit(row){
      const r = tyRows().find(x=> x.id===row.id);
      if(!r || r['审核状态']!=='审核中'){ ElMessage.warning('仅审核中的'+tyK.value.w+'单可审核'); return; }
      tyAuditRow.value = r;
      tyAuditForm.结果 = '通过';
      tyAuditForm.意见 = '';
      tyAuditVisible.value = true;
    }
    function tyApplyLedger(r){
      const k = tyK.value;
      if(k.multi){
        (r._lines||[]).forEach(l=>{
          const inst = djInstruments().find(x=> x.id===l._instId);
          if(inst && r['新存放位置']) inst['存放位置'] = r['新存放位置'];
        });
        return;
      }
      const inst = djInstruments().find(x=> x.id===r._instId);
      if(inst && k.to) inst['使用状态'] = k.to;
    }
    function submitTyAudit(){
      const r = tyAuditRow.value;
      if(!r || r['审核状态']!=='审核中'){ tyAuditVisible.value = false; return; }
      const at = nowStamp();
      const audit = r._audit || (r._audit = { 节点: [], 当前节点: 0, 记录: [] });
      const nodes = audit.节点 || [];
      const idx = Number(audit.当前节点) || 0;
      const node = nodes[idx] || { 节点名称: '审核' };
      const who = (node['指定人员审核人'] && node['指定人员审核人'][0]) || node['主管审核人'] || CI_OPERATOR;
      const result = tyAuditForm.结果;
      if(result==='驳回' || result==='撤销'){
        r['审核状态'] = result==='驳回' ? '审核驳回' : '审核撤销';
        audit.记录.push({ 节点名称: result==='撤销' ? '发起人撤回' : (node['节点名称']||'审核'), 操作人: result==='撤销' ? CI_OPERATOR : who, 结果: r['审核状态'], 时间: at, 意见: tyAuditForm.意见||'' });
      } else {
        audit.记录.push({ 节点名称: node['节点名称']||'审核', 操作人: who, 结果: '审核通过', 时间: at, 意见: tyAuditForm.意见||'' });
        if(idx + 1 >= nodes.length){
          r['审核状态'] = '审核通过';
          tyApplyLedger(r);
        } else audit.当前节点 = idx + 1;
      }
      tyAuditVisible.value = false;
      bumpStore();
      const st = r['审核状态'];
      ElMessage.success(st==='审核通过' ? '终审通过，已回写仪器台账' : (st==='审核中' ? '已通过当前节点，流转至下一节点' : '审核状态已改为'+st));
    }

    /** 我的维修：维修工单的数据权限视图，只展示维保班组与当前登录维保人员所属班组有交集的维修单（所有状态） */
    const MY_WX_PAGE = 'np-0308-04';
    const WO_LINK_PAGES = [WO_PAGE, MY_WX_PAGE, 'np-0308-05'];
    function myWxQueryRows(){
      const teams = new Set(djMyTeams());
      let l = woRows().filter(w=> splitDun(w['维保班组']).some(t=> teams.has(t))).map(bxView);
      l = applyContainsExactQuery(l, query, ['维修单号','报修单号','仪器编号','仪器名称','仪器类型','故障类型','维保班组'], ['单据状态','紧急程度','创建方式']);
      l = applyDateRangeQuery(l, query, '创建时间');
      return l.sort((a,b)=> String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')));
    }

    /** 仪器验收：待验收 Tab 取「待验收」的维修单；提交后反写维修单、报修单并生成验收记录（tab-2，快照不再变动） */
    const YS_PAGE = 'np-0308-05';
    const YS_SECS = WO_FIX_SECS.concat([BX_DETAIL[3], PART_SEC]);
    function ysRecords(){
      const bag = (MOCK[YS_PAGE] = MOCK[YS_PAGE] || {});
      return bag['tab-2'] || (bag['tab-2'] = []);
    }
    const ysPendingCount = computed(()=>{ storeTick.value; return woRows().filter(w=> w['单据状态']==='待验收').length; });
    function ysQueryRows(){
      if(activeTab.value==='tab-2'){
        let l = applyContainsExactQuery(ysRecords().slice(), query, ['维修单号','报修单号','仪器编号','仪器名称','仪器类型','故障类型','验收操作人'], ['验收结果','创建方式']);
        l = applyDateRangeQuery(l, query, '验收时间');
        return l.sort((a,b)=> String(b['验收时间']||'').localeCompare(String(a['验收时间']||'')));
      }
      let l = applyContainsExactQuery(woRows().filter(w=> w['单据状态']==='待验收').map(bxView), query,
        ['维修单号','报修单号','仪器编号','仪器名称','仪器类型','故障类型','维保班组','维修人'], ['创建方式']);
      l = applyDateRangeQuery(l, query, '维修完成时间');
      return l.sort((a,b)=> String(b['维修完成时间']||'').localeCompare(String(a['维修完成时间']||'')));
    }
    const ysDlgVisible = ref(false);
    const ysDlgBatch = ref(false);
    const ysDlgRows = ref([]);
    const ysForm = reactive({});
    function ysPicked(rows){
      const ids = new Set((rows||[]).map(r=> r.id));
      return woRows().filter(w=> ids.has(w.id));
    }
    function openYsDlg(rows, batch){
      const src = ysPicked(rows);
      if(!src.length){ ElMessage.warning('请先勾选数据'); return; }
      if(src.some(w=> w['单据状态']!=='待验收')){ ElMessage.warning('仅待验收的维修单可验收'); return; }
      const d = (!batch && src[0]._ysDraft) || {};
      ysDlgBatch.value = !!batch;
      ysDlgRows.value = src.map(w=> Object.assign(bxView(w), { 处理时间: w['创建时间'], 处理人: w['创建人'] }));
      Object.keys(ysForm).forEach(k=> delete ysForm[k]);
      Object.assign(ysForm, { 验收结果: d['验收结果'] || '通过', 验收图片: d['验收图片'] || '', 验收说明: d['验收说明'] || '' });
      ysDlgVisible.value = true;
    }
    function saveYsDlg(draft){
      const src = ysPicked(ysDlgRows.value);
      if(!src.length || src.some(w=> w['单据状态']!=='待验收')){ ElMessage.warning('仅待验收的维修单可验收'); return; }
      const form = { 验收结果: ysForm['验收结果'], 验收图片: ysForm['验收图片'] || '', 验收说明: String(ysForm['验收说明']||'').trim() };
      if(draft){
        src[0]._ysDraft = form;
        ysDlgVisible.value = false;
        bumpStore();
        ElMessage.success('已保存，维修单仍为待验收');
        return;
      }
      if(!form['验收结果']){ ElMessage.warning('请选择验收结果'); return; }
      const pass = form['验收结果']==='通过', at = nowStamp();
      src.forEach(w=>{
        const acc = Object.assign({}, form, { 验收时间: at, 验收操作人: CI_OPERATOR });
        const view = bxView(w);
        ysRecords().unshift(Object.assign({ id: 'ys-'+Date.now()+'-'+w.id, _woId: w.id, _bxId: w._bxId, _instId: w._instId, 单据状态: w['单据状态'] },
          Object.fromEntries(WO_REC_KEYS.concat(WO_FIX_KEYS).map(k=> [k, view[k] || ''])), { _parts: (w._parts||[]).map(p=> ({ ...p })) }, acc));
        Object.assign(w, acc, { 单据状态: pass ? '结单' : '退修' });
        delete w._ysDraft;
        const b = woBx(w);
        if(b) Object.assign(b, acc, { 单据状态: pass ? '结单' : '维修中' });
        woFlowPush(w, { 阶段: '仪器验收', 时间: at, 验收结果: form['验收结果'], 验收说明: form['验收说明'] });
      });
      ysDlgVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      ElMessage.success('已验收 '+src.length+' 张维修单，生成验收记录；' + (pass ? '维修单、报修单状态改为结单' : '维修单状态改为退修，报修单状态改为维修中'));
    }

    const MSA_PAGE = 'np-0313-01';
        const MSA_FRAME = {
      'np-0313-01': 'msa/index.html?v=1.0.0-oled-grr',
      'np-0313-02': 'msa/stab.html?v=1.0.3-eq-drawer'
      // 偏倚分析对齐 OLED #msa-bias：走原生 page-panel，不再 iframe
    };
    const msaFrameSrc = ref('');

    const MSA_DESC = '重复性与再现性(GR&R)';
    const MSA_FIXED = { 测量日期: 2, 测量人员: 2, 样本个数: 1, 平行测量次数: 3 };
    const MSA_TIPS = { 测量日期: '用于多日期测量，数字，日期平行', 测量人员: '用于多人测量，指定测量人数', 样本个数: '单人需要测量的样本个数', 平行测量次数: '单人单样品的平行测量次数' };
    const MSA_STD_KEYS = ['标准物质条码号','标准物质名称','标准物质批号','供应商名称'];
    const MSA_STD_COMP = {
      多元素混合标准溶液: [['IT-FE','10'], ['IT-NA','10']],
      NPB纯度标准品: [['IT-PURITY','99.95']],
      HTL工作标准品: [['IT-PURITY','99.90'], ['IT-SOLV','50']],
      光酸产生剂标准品: [['IT-PURITY','99.50'], ['IT-UV','0.512']]
    };
    const MSA_OPS = 'ABCDEFGHIJ';
    function msaRows(){
      const bag = (MOCK[MSA_PAGE] = MOCK[MSA_PAGE] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function msaInspItems(){ return (((MOCK['insp-project']||{})['tab-item'])||[]); }
    function msaItemOf(code){
      const r = msaInspItems().find(x=> x['检验项编码']===code) || {};
      return { 检验项编码: code, 检验项名称: r['检验项名称'] || '', 单位: r['检验项单位'] || '' };
    }
    function msaItemHead(it){ return [it['检验项编码'], it['检验项名称'], it['单位']].filter(Boolean).join('/'); }
    function msaPrec(unit){ return unit==='%' ? 2 : (unit==='ppm' || unit==='ppb') ? 3 : 4; }
    function msaFmt(v, unit){
      const s = String(v==null ? '' : v).trim();
      if(s==='' || isNaN(Number(s))) return s;
      return Number(s).toFixed(msaPrec(unit));
    }
    function msaNums(arr){ return (arr||[]).filter(v=> String(v==null ? '' : v).trim()!=='' && !isNaN(Number(v))).map(Number); }
    function msaAvg(arr){ const a = msaNums(arr); return a.length ? a.reduce((s, x)=> s + x, 0) / a.length : null; }
    function msaStdev(arr){
      const a = msaNums(arr);
      if(a.length < 2) return null;
      const m = a.reduce((s, x)=> s + x, 0) / a.length;
      return Math.sqrt(a.reduce((s, x)=> s + (x - m) * (x - m), 0) / (a.length - 1));
    }
    function msaCounts(p){ return { d: Number(p['测量日期'])||0, o: Number(p['测量人员'])||0, s: Number(p['样本个数'])||0, n: Number(p['平行测量次数'])||0 }; }
    function msaEntries(p){
      const c = msaCounts(p), list = [];
      const saved = p._entries || [];
      for(let d = 1; d <= c.d; d++) for(let oi = 0; oi < c.o; oi++) for(let s = 1; s <= c.s; s++){
        const o = MSA_OPS[oi];
        const e = saved.find(x=> x['日期']===d && x['操作员']===o && (x['样本']||1)===s);
        list.push(e || { 日期: d, 操作员: o, 样本: s, 录入状态: '待录入', 提交时间: '', 提交人: '', data: {} });
      }
      return list;
    }
    function msaSync(p){
      if(p['计划状态']==='已关闭') return;
      const all = msaEntries(p);
      const done = all.filter(e=> e['录入状态']==='提交');
      if(all.length && done.length===all.length){
        p['计划状态'] = '已完成';
        p['完成时间'] = done.map(e=> e['提交时间']).sort().pop() || nowStamp();
      } else {
        p['计划状态'] = all.some(e=> e['录入状态']!=='待录入') ? '执行中' : '待执行';
        delete p['完成时间'];
      }
    }
    function msaView(r){
      const inst = djInstruments().find(x=> x.id===r._instId);
      const v = Object.assign({}, r, inst ? bxInstSnap(inst) : {});
      MSA_STD_KEYS.forEach(k=>{ v[k] = (r._stds||[]).map(s=> s[k]).filter(Boolean).join('、') || r[k] || ''; });
      const plan = djParseTime(r['计划时间']);
      const ref = r['计划状态']==='已完成' ? djParseTime(r['完成时间']) : (r['计划状态']==='已关闭' ? djParseTime(r['关闭时间']) : new Date());
      const diff = plan && ref ? Math.floor((ref.getTime() - plan.getTime()) / 60000) : 0;
      v['逾期时长'] = diff > 0 ? djFmtSpan(diff) : '/';
      v['逾期状态'] = diff > 0 ? '逾期' : '正常';
      return v;
    }
    function msaQueryRows(){
      let l = applyContainsExactQuery(msaRows().map(msaView), query, ['计划单号','仪器编号','仪器名称','标准物质条码号'], ['计划状态','逾期状态']);
      ['计划时间','创建时间'].forEach(k=>{ l = applyDateRangeQuery(l, query, k); });
      return sortByCreateTimeDesc(l);
    }

    const msaFormVisible = ref(false);
    const msaFormMode = ref('add');
    const msaTab = ref('inst');
    const msaForm = reactive({});
    const msaInsts = ref([]);
    const msaInstSel = ref([]);
    const msaStds = ref([]);
    const msaStdSel = ref([]);
    const msaItems = ref([]);
    const msaItemSel = ref([]);
    const msaSpec = reactive({});
    const msaEditId = ref('');
    function msaSpecOf(code){
      if(!msaSpec[code]) msaSpec[code] = { 'Upper Spec': '', MDL: '' };
      return msaSpec[code];
    }
    function openMsaForm(mode, row){
      const src = row ? msaRows().find(r=> r.id===row.id) : null;
      if(mode==='edit' && (!src || src['计划状态']!=='待执行')){ ElMessage.warning('仅待执行的计划可编辑'); return; }
      msaFormMode.value = mode;
      msaTab.value = 'inst';
      msaEditId.value = mode==='edit' ? src.id : '';
      Object.keys(msaForm).forEach(k=> delete msaForm[k]);
      Object.assign(msaForm, { 内容描述: MSA_DESC, 计划时间: mode==='edit' ? src['计划时间'] : '', 备注: src ? (src['备注']||'') : '' }, MSA_FIXED);
      const inst = src ? djInstruments().find(x=> x.id===src._instId) : null;
      msaInsts.value = inst ? [Object.assign({ _instId: inst.id }, bxInstSnap(inst))] : [];
      msaStds.value = src ? (src._stds||[]).map(s=> ({ ...s })) : [];
      msaItems.value = src ? (src._items||[]).map(it=> ({ ...it, 标称: (it['标称']||[]).slice() })) : [];
      Object.keys(msaSpec).forEach(k=> delete msaSpec[k]);
      msaItems.value.forEach(it=>{ Object.assign(msaSpecOf(it['检验项编码']), ((src||{})._spec||{})[it['检验项编码']] || {}); });
      msaInstSel.value = []; msaStdSel.value = []; msaItemSel.value = [];
      msaFormVisible.value = true;
    }
    function msaStdComp(s){ return MSA_STD_COMP[s['标准物质名称']] || []; }
    function msaAddStds(rows){
      const add = rows.map(x=> ({ _id: x.id, 标准物质条码号: x['条码号'], 标准物质名称: x['标准物质名称'], 标准物质批号: x['批号'], 供应商名称: x['供应商名称'] }));
      const next = msaStds.value.concat(add);
      const sig = s=> msaStdComp(s).map(c=> c[0]).sort().join(',');
      if(next.some(s=> sig(s)!==sig(next[0]))){
        ElMessage.warning('所选标准物质对应的检验项不一致，不可添加：'+next.map(s=> s['标准物质条码号']+'（'+(sig(s)||'未绑定成分')+'）').join('、'));
        return false;
      }
      const need = Number(msaForm['样本个数'])||0;
      if(next.length > need){ ElMessage.warning('标准物质数量须等于样本个数（'+need+'），当前最多还可添加 '+Math.max(0, need - msaStds.value.length)+' 条'); return false; }
      const first = !msaStds.value.length;
      msaStds.value = next;
      if(first && !msaItems.value.length){
        msaItems.value = msaStdComp(next[0]).map(c=> Object.assign(msaItemOf(c[0]), { 标称: [] }));
        msaItems.value.forEach(it=> msaSpecOf(it['检验项编码']));
      }
      msaFillNominal();
      return true;
    }
    function msaFillNominal(){
      msaItems.value.forEach(it=>{
        const arr = it['标称'] = (it['标称']||[]).slice(0, msaStds.value.length);
        msaStds.value.forEach((s, i)=>{
          if(String(arr[i]==null ? '' : arr[i]).trim()!=='') return;
          const hit = msaStdComp(s).find(c=> c[0]===it['检验项编码']);
          arr[i] = hit ? hit[1] : '';
        });
      });
    }
    function msaAddItems(rows){
      rows.forEach(r=>{
        const it = Object.assign(msaItemOf(r['检验项编码']), { 标称: [] });
        msaItems.value.push(it);
        msaSpecOf(it['检验项编码']);
      });
      msaFillNominal();
    }
    function onMsaAction(name){
      if(name==='添加仪器'){ openIoPick('inst', 'msaInsts', '', true); return; }
      if(name==='删除仪器'){
        const set = new Set(msaInstSel.value);
        if(!set.size){ ElMessage.warning('请先勾选仪器'); return; }
        msaInsts.value = msaInsts.value.filter(l=> !set.has(l));
        msaInstSel.value = [];
        return;
      }
      if(name==='添加标准物质'){
        const need = Number(msaForm['样本个数'])||0;
        if(msaStds.value.length >= need){ ElMessage.warning('标准物质数量须等于样本个数（'+need+'），请先删除后再添加'); return; }
        openIoPick('msaStd', 'msaStds', '', true);
        return;
      }
      if(name==='删除标准物质'){
        const set = new Set(msaStdSel.value);
        if(!set.size){ ElMessage.warning('请先勾选标准物质'); return; }
        const keep = msaStds.value.map((s, i)=> [s, i]).filter(([s])=> !set.has(s));
        msaItems.value.forEach(it=>{ it['标称'] = keep.map(([, i])=> (it['标称']||[])[i]); });
        msaStds.value = keep.map(([s])=> s);
        msaStdSel.value = [];
        return;
      }
      if(name==='添加检验项'){ openIoPick('msaItem', 'msaItems', '', true); return; }
      if(name==='删除检验项'){
        if(!msaItemSel.value.length){ ElMessage.warning('请先勾选检验项'); return; }
        msaRemoveItems(msaItemSel.value);
        return;
      }
      if(name==='获取最新MDL') msaFetchMdl();
    }
    function msaRemoveItems(codes){
      const set = new Set(codes);
      msaItems.value = msaItems.value.filter(it=> !set.has(it['检验项编码']));
      codes.forEach(c=> delete msaSpec[c]);
      msaItemSel.value = msaItemSel.value.filter(c=> !set.has(c));
    }
    function msaFetchMdl(){
      if(!msaItems.value.length){ ElMessage.warning('请先添加检验项'); return; }
      const ids = new Set(msaInsts.value.map(l=> l._instId));
      const plans = sortByCreateTimeDesc(msaRows().filter(p=> p.id!==msaEditId.value && ids.has(p._instId)));
      const miss = [];
      let n = 0;
      msaItems.value.forEach(it=>{
        const code = it['检验项编码'];
        const p = plans.find(x=> String((((x._spec||{})[code])||{}).MDL||'').trim()!=='');
        const dl = (msaInspItems().find(x=> x['检验项编码']===code)||{})['检出限D.L'];
        const v = p ? p._spec[code].MDL : (dl || '');
        if(String(v).trim()===''){ miss.push(it['检验项名称']||code); return; }
        msaSpecOf(code).MDL = String(v);
        n++;
      });
      if(miss.length) ElMessage.warning('已获取 '+n+' 个检验项的最新MDL；'+miss.join('、')+' 无可用 MDL，请手动输入');
      else ElMessage.success('已获取 '+n+' 个检验项的最新MDL');
    }
    function msaNextNo(list){
      const seq = list.reduce((m, r)=> Math.max(m, parseInt(String(r['计划单号']||'').replace(/\D/g, ''), 10) || 0), 0);
      return seq + 1;
    }
    function saveMsaForm(){
      if(!msaInsts.value.length){ msaTab.value = 'inst'; ElMessage.warning('请添加仪器'); return; }
      if(!String(msaForm['计划时间']||'').trim()){ ElMessage.warning('请选择计划时间'); return; }
      const need = Number(msaForm['样本个数'])||0;
      if(msaStds.value.length!==need){ msaTab.value = 'std'; ElMessage.warning('标准物质数量须等于样本个数（'+need+'）'); return; }
      if(!msaItems.value.length){ msaTab.value = 'std'; ElMessage.warning('请添加检验项'); return; }
      const blank = msaItems.value.filter(it=> msaStds.value.some((s, i)=> String((it['标称']||[])[i]==null ? '' : it['标称'][i]).trim()===''));
      if(blank.length){ msaTab.value = 'std'; ElMessage.warning('请填写标称浓度：'+blank.map(msaItemHead).join('、')); return; }
      const bad = msaItems.value.filter(it=> (it['标称']||[]).concat([msaSpecOf(it['检验项编码'])['Upper Spec'], msaSpecOf(it['检验项编码']).MDL]).some(v=> String(v==null ? '' : v).trim()!=='' && isNaN(Number(v))));
      if(bad.length){ msaTab.value = 'std'; ElMessage.warning('标称浓度、Upper Spec、MDL 须为数字：'+bad.map(msaItemHead).join('、')); return; }
      const base = {
        内容描述: MSA_DESC, 计划时间: msaForm['计划时间'], 备注: String(msaForm['备注']||'').trim(),
        测量日期: String(msaForm['测量日期']), 测量人员: String(msaForm['测量人员']), 样本个数: String(msaForm['样本个数']), 平行测量次数: String(msaForm['平行测量次数']),
        _stds: msaStds.value.map(s=> ({ ...s })),
        _items: msaItems.value.map(it=> ({ 检验项编码: it['检验项编码'], 检验项名称: it['检验项名称'], 单位: it['单位'], 标称: (it['标称']||[]).map(v=> String(v).trim()) })),
        _spec: Object.fromEntries(msaItems.value.map(it=> [it['检验项编码'], { ...msaSpecOf(it['检验项编码']) }]))
      };
      MSA_STD_KEYS.forEach(k=>{ base[k] = base._stds.map(s=> s[k]).filter(Boolean).join('、'); });
      const list = msaRows();
      if(msaFormMode.value==='edit'){
        const cur = list.find(r=> r.id===msaEditId.value);
        if(!cur || cur['计划状态']!=='待执行'){ ElMessage.warning('仅待执行的计划可编辑'); return; }
        Object.assign(cur, base);
        msaFormVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功');
        return;
      }
      const off = msaInsts.value.filter(l=> (djInstruments().find(x=> x.id===l._instId)||{})['使用状态']!=='在用');
      if(off.length){ msaTab.value = 'inst'; ElMessage.warning('仪器 '+off.map(l=> l['仪器编号']).join('、')+' 不是「在用」状态，不可制定计划'); return; }
      const at = nowStamp();
      let seq = msaNextNo(list) - 1;
      const nos = [];
      msaInsts.value.forEach((l, i)=>{
        const inst = djInstruments().find(x=> x.id===l._instId) || l;
        const no = String(++seq).padStart(6, '0');
        nos.push(no);
        list.unshift(Object.assign({ id: 'msa-'+Date.now()+'-'+i, 计划状态: '待执行', 计划单号: no, _instId: l._instId },
          bxInstSnap(inst), JSON.parse(JSON.stringify(base)), { _entries: [], 创建人: CI_OPERATOR, 创建时间: at }));
      });
      msaFormVisible.value = false;
      bumpStore();
      ElMessage.success('已生成 '+nos.length+' 条计划：'+nos.join('、'));
    }
    function deleteMsaRows(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = rows.filter(r=> r['计划状态']!=='待执行');
      if(bad.length){ ElMessage.warning('仅待执行的计划可删除：'+bad.map(r=> r['计划单号']+'（'+r['计划状态']+'）').join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+rows.length+' 条计划？', '批量删除', { type: 'warning' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        const list = msaRows();
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条计划');
      }).catch(()=>{});
    }
    function closeMsaRows(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = rows.filter(r=> !['待执行','执行中'].includes(r['计划状态']));
      if(bad.length){ ElMessage.warning('仅待执行、执行中的计划可关闭：'+bad.map(r=> r['计划单号']+'（'+r['计划状态']+'）').join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认关闭所选的 '+rows.length+' 条计划？关闭后不可继续录入数据。', '关闭确认', { type: 'warning' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        const at = nowStamp();
        msaRows().forEach(r=>{ if(ids.has(r.id)) Object.assign(r, { 计划状态: '已关闭', 关闭时间: at, 关闭人: CI_OPERATOR }); });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已关闭 '+ids.size+' 条计划');
      }).catch(()=>{});
    }

    const msaDtVisible = ref(false);
    const msaDtId = ref('');
    const msaDtKeys = ['计划单号','计划状态','内容描述','仪器编号','仪器名称','计划时间','逾期状态','测量日期','测量人员','样本个数','平行测量次数'];
    const msaDtPlan = computed(()=>{
      void storeTick.value;
      const p = msaRows().find(r=> r.id===msaDtId.value);
      return p ? msaView(p) : {};
    });
    const msaDtGroups = computed(()=>{
      void storeTick.value;
      const p = msaRows().find(r=> r.id===msaDtId.value);
      if(!p) return [];
      const all = msaEntries(p);
      return Array.from({ length: msaCounts(p).d }, (_, i)=> ({ d: i + 1, rows: all.filter(e=> e['日期']===i + 1).map(e=>{
        const s = (p._stds||[])[(e['样本']||1) - 1] || {};
        return Object.assign({}, s, e, { 操作员名: '操作员'+e['操作员'] + (msaCounts(p).s > 1 ? ' · 样本'+e['样本'] : '') });
      }) }));
    });
    function openMsaDetail(row){ msaDtId.value = row.id; msaDtVisible.value = true; }
    function msaEntryDisabled(op, e){
      const closed = msaDtPlan.value['计划状态']==='已关闭';
      if(op==='数据录入') return e['录入状态']==='提交' ? '已提交，可在「更多」中修改数据' : closed ? '计划已关闭' : '';
      if(op==='查看详情') return e['录入状态']!=='提交' ? '仅已提交的数据可查看' : '';
      if(op==='修改数据') return e['录入状态']!=='提交' ? '仅已提交的数据可修改' : closed ? '计划已关闭' : '';
      return '';
    }

    const msaEn = reactive({ visible: false, mode: 'entry', d: 1, o: 'A', s: 1, data: {} });
    const msaEnPlan = computed(()=> msaRows().find(r=> r.id===msaDtId.value) || {});
    const msaEnStd = computed(()=> (msaEnPlan.value._stds||[])[msaEn.s - 1] || {});
    const msaEnItems = computed(()=> msaEnPlan.value._items || []);
