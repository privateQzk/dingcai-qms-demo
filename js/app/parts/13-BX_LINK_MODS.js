    const BX_LINK_MODS = [['np-0308-02','报修处理','tab-2'],['np-0308-03','维修工单',''],['np-0308-05','仪器验收','tab-2']];
    function bxRows(){
      const bag = (MOCK[BX_PAGE] = MOCK[BX_PAGE] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function bxInstSnap(inst){
      const v = {};
      BX_INST_KEYS.forEach(k=>{ v[k] = k==='责任部门' ? [].concat(inst[k]||[]).join('/') : (inst[k] || ''); });
      return v;
    }
    function bxView(r){
      const inst = djInstruments().find(x=> x.id===r._instId);
      return inst ? Object.assign({ ...r }, bxInstSnap(inst)) : { ...r };
    }
    function bxQueryRows(){
      let l = applyContainsExactQuery(bxRows().map(bxView), query, ['报修单号','仪器编号','仪器名称','仪器类型','故障类型','报修人'], ['单据状态','紧急程度','处理方式']);
      ['报修时间','故障时间'].forEach(k=>{ l = applyDateRangeQuery(l, query, k); });
      return l.sort((a,b)=> String(b['报修时间']||'').localeCompare(String(a['报修时间']||'')));
    }
    function bxPicked(){ return tableData.value.filter(r=> selectedIds.value.includes(r.id)); }

    const bxFormVisible = ref(false);
    const bxFormMode = ref('add');
    const bxFormLines = ref([]);
    const bxFormSel = ref([]);
    const bxForm = reactive({});
    const bxEditId = ref('');
    const bxFormKind = ref('bx');
    const bxFaultLocked = computed(()=> bxFormKind.value==='wo' && bxFormMode.value==='edit' && !!(woRows().find(w=> w.id===bxEditId.value)||{})._bxId);
    const bxFormTitle = computed(()=> ({ add:'新增', edit:'编辑', copy:'复制' })[bxFormMode.value] || '新增');
    const bxLineTypes = computed(()=> new Set(bxFormLines.value.map(l=> l['仪器类型']).filter(Boolean)));
    const bxFaultTypes = computed(()=>{
      storeTick.value;
      const types = bxLineTypes.value;
      return (((MOCK[FAULT_TYPE_PAGE]||{}).main)||[]).filter(r=> r['启用状态']==='启用')
        .filter(r=> !types.size || splitDun(r['适用仪器类型']).some(t=> t==='通用' || types.has(t)))
        .map(r=> r['故障类型名称']);
    });
    function openBxForm(mode, row){
      const src = row ? bxRows().find(r=> r.id===row.id) : null;
      if(mode==='edit' && (!src || src['单据状态']!=='待处理')){ ElMessage.warning('仅待处理的报修单可编辑'); return; }
      bxFormKind.value = 'bx';
      bxFormMode.value = mode;
      bxFormSel.value = [];
      bxEditId.value = mode==='edit' ? src.id : '';
      Object.keys(bxForm).forEach(k=> delete bxForm[k]);
      BX_FAULT_KEYS.forEach(k=>{ bxForm[k] = src ? (src[k] || '') : ''; });
      if(!bxForm['紧急程度']) bxForm['紧急程度'] = '一般';
      if(!src) bxForm['故障时间'] = djFmtTime(new Date());
      const inst = src ? djInstruments().find(x=> x.id===src._instId) : null;
      bxFormLines.value = inst ? [Object.assign({ _instId: inst.id }, bxInstSnap(inst))] : [];
      bxFormVisible.value = true;
    }
    function onBxLineAction(name){
      if(name==='添加仪器'){ openIoPick('inst', 'bxInsts', '', true); return; }
      if(name==='批量删除'){
        const set = new Set(bxFormSel.value||[]);
        if(!set.size){ ElMessage.warning('请先勾选仪器'); return; }
        bxFormLines.value = bxFormLines.value.filter(l=> !set.has(l));
        bxFormSel.value = [];
      }
    }
    function addBxLines(rows){
      const first = !bxFormLines.value.length;
      bxFormLines.value = bxFormLines.value.concat(rows.map(x=> Object.assign({ _instId: x.id }, bxInstSnap(x))));
      if(first && !String(bxForm['报修地点']||'').trim()) bxForm['报修地点'] = (bxFormLines.value[0]||{})['存放位置'] || '';
    }
    function saveBxForm(){
      const txt = k=> String(bxForm[k]==null ? '' : bxForm[k]).trim();
      const lines = bxFormLines.value;
      if(!lines.length){ ElMessage.warning('请添加仪器'); return; }
      if(!txt('故障类型')){ ElMessage.warning('请选择故障类型'); return; }
      if(!txt('故障描述')){ ElMessage.warning('请输入故障描述'); return; }
      if(!txt('故障时间')){ ElMessage.warning('请选择故障时间'); return; }
      const base = Object.fromEntries(BX_FAULT_KEYS.map(k=> [k, txt(k)]));
      const list = bxRows();
      if(bxFormMode.value==='edit'){
        const cur = list.find(r=> r.id===bxEditId.value);
        if(!cur || cur['单据状态']!=='待处理'){ ElMessage.warning('仅待处理的报修单可编辑'); return; }
        Object.assign(cur, base);
        const head = (cur._flow||[]).find(f=> f['阶段']==='故障报修');
        if(head) head['故障描述'] = base['故障描述'];
        bxFormVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功');
        return;
      }
      const at = nowStamp();
      let seq = list.reduce((m, r)=> Math.max(m, parseInt(String(r['报修单号']||'').replace(/\D/g, ''), 10) || 0), 0);
      const blank = Object.fromEntries(BX_DETAIL.slice(2).flatMap(([, ks])=> ks).concat(['维保班组','关闭说明','关闭人','关闭时间']).map(k=> [k, '']));
      lines.forEach((l, i)=>{
        const no = 'YQBX' + String(++seq).padStart(8, '0');
        const inst = djInstruments().find(x=> x.id===l._instId) || l;
        list.unshift(Object.assign({ id: 'bx-'+Date.now()+'-'+i, 单据状态: '待处理', 报修单号: no, _instId: l._instId }, bxInstSnap(inst), base, blank,
          { 报修时间: at, 报修人: CI_OPERATOR, _flow: [{ 阶段: '故障报修', 时间: at, 操作人: CI_OPERATOR, 故障描述: base['故障描述'], 报修单号: no }] }));
      });
      bxFormVisible.value = false;
      bumpStore();
      ElMessage.success('已生成 '+lines.length+' 张报修单，单据状态为待处理');
    }

    const bxExpVisible = ref(false);
    const bxExpPick = ref(null);
    const bxExpFor = ref('bx');
    function bxExpFilter(){
      if(bxExpFor.value==='wo') return { types: new Set([woFixRow.value['仪器类型']].filter(Boolean)), ft: String(woFixRow.value['故障类型']||'') };
      return { types: bxLineTypes.value, ft: String(bxForm['故障类型']||'') };
    }
    const bxExpRows = computed(()=>{
      if(!bxExpVisible.value) return [];
      const { types, ft } = bxExpFilter();
      return expRows().filter(r=> (r['启用状态']||'启用')==='启用')
        .filter(r=> (!types.size || splitComma(r['适用仪器类型']).some(t=> t==='通用' || types.has(t))) && (!ft || splitComma(r['适用故障类型']).includes(ft)));
    });
    const bxExpTip = computed(()=>{
      const { types, ft } = bxExpFilter();
      const by = '按仪器类型「'+[...types].join('、')+'」'+(ft ? '+ 故障类型「'+ft+'」' : '')+'过滤；';
      return by + (bxExpFor.value==='wo' ? '确定后将经验的维修过程说明、仪器故障分析带入，可修改' : '确定后将经验的故障描述带入「故障描述」');
    });
    function openBxExp(){
      if(!bxFormLines.value.length){ ElMessage.warning('请先添加仪器'); return; }
      bxExpFor.value = 'bx';
      bxExpPick.value = null;
      bxExpVisible.value = true;
    }
    function confirmBxExp(){
      const r = bxExpPick.value;
      if(!r){ ElMessage.warning('请选择一条数据'); return; }
      if(bxExpFor.value==='wo'){
        woFix['维修过程说明'] = r['维修过程说明'] || '';
        woFix['仪器故障分析'] = r['仪器故障分析'] || '';
        woFix._expId = r.id;
      } else {
        bxForm['故障描述'] = r['故障描述'];
        if(!bxForm['故障类型']) bxForm['故障类型'] = splitComma(r['适用故障类型']).find(t=> bxFaultTypes.value.includes(t)) || '';
      }
      bxExpVisible.value = false;
    }

    function closeBxRows(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !BX_OPEN.includes(r['单据状态']))){ ElMessage.warning('仅待处理、维修中、验收中的报修单可关闭'); return; }
      ElementPlus.ElMessageBox.prompt('请输入关闭说明', '关闭', {
        confirmButtonText:'确定', cancelButtonText:'取消', inputType:'textarea', inputPlaceholder:'必填',
        inputValidator: v=> !!String(v||'').trim() || '请输入关闭说明'
      }).then(({ value })=>{
        const ids = new Set(rows.map(r=> r.id)), at = nowStamp(), note = String(value).trim();
        let down = 0;
        bxRows().forEach(r=>{
          if(!ids.has(r.id)) return;
          Object.assign(r, { 单据状态: '已关闭', 关闭说明: note, 关闭人: CI_OPERATOR, 关闭时间: at });
          (r._flow = r._flow || []).push({ 阶段: '已关闭', 时间: at, 操作人: CI_OPERATOR, 关闭说明: note, 报修单号: r['报修单号'] });
        });
        woRows().forEach(w=>{
          if(!ids.has(w._bxId) || !WO_CLOSABLE.includes(w['单据状态'])) return;
          w['单据状态'] = '已关闭';
          delete w._draft;
          down++;
        });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已关闭 '+ids.size+' 张报修单' + (down ? '；下游未完成的维修单已同步改为已关闭' : ''));
      }).catch(()=>{});
    }
    function deleteBxRows(){
      const ids = new Set(selectedIds.value||[]);
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      if(bxRows().some(r=> ids.has(r.id) && r['单据状态']!=='待处理')){ ElMessage.warning('仅待处理的报修单可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 张报修单？删除后不可恢复。','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        MOCK[BX_PAGE].main = bxRows().filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 张报修单');
      }).catch(()=>{});
    }

    const bxLinkVisible = ref(false);
    const bxLinkNos = ref([]);
    const bxLinkRows = computed(()=>{
      if(!bxLinkVisible.value) return [];
      if(WO_LINK_PAGES.includes(pageId.value)) return woLinkRows();
      const nos = new Set(bxLinkNos.value);
      const flows = bxRows().filter(r=> nos.has(r['报修单号'])).flatMap(r=> r._flow||[]);
      const mods = pageId.value===CL_PAGE ? [[BX_PAGE,'故障报修','']].concat(BX_LINK_MODS.slice(1)) : BX_LINK_MODS;
      const cnt = { [WO_PAGE]: woRows(), [YS_PAGE]: ysRecords() };
      return mods.filter(([pid])=> CFG.pages[pid]).map(([pid, stage, tab])=> cnt[pid]
        ? { pid, tab: tab || 'tab-1', 关联单据: CFG.pages[pid].title, 关联记录数: cnt[pid].filter(w=> nos.has(w['报修单号'])).length }
        : { pid, tab, 关联单据: CFG.pages[pid].title, 关联记录数: flows.filter(f=> f['阶段']===stage).length });
    });
    function openBxLink(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const key = WO_LINK_PAGES.includes(pageId.value) ? '维修单号' : '报修单号';
      bxLinkNos.value = [...new Set(rows.map(r=> r[key]))];
      bxLinkVisible.value = true;
    }
    function goBxLink(row){
      bxLinkVisible.value = false;
      jumpInstPage(row.pid, row.tab, row.nos || bxLinkNos.value, row.key || '报修单号');
    }

    const bxDetailVisible = ref(false);
    const bxDetailRow = ref({});
    const bxDetailTab = ref('info');
    const bxDetailSecs = ref(BX_DETAIL);
    const bxDetailFlow = ref({});
    function openBxDetail(row, rec){
      const r = bxRows().find(x=> x.id===(rec ? rec._bxId : row.id)) || row;
      bxDetailRow.value = rec ? { ...rec } : bxView(r);
      bxDetailSecs.value = rec ? BX_DETAIL.slice(0, 3) : BX_DETAIL_FULL;
      bxDetailFlow.value = r;
      bxDetailTab.value = 'info';
      bxDetailVisible.value = true;
    }
    const bxFlowNodes = computed(()=>{
      const r = bxDetailFlow.value || {};
      const list = (r._flow||[]).slice().sort((a,b)=> String(a['时间']||'').localeCompare(String(b['时间']||'')));
      if(r['单据状态']==='结单') list.push({ 阶段: '结单' });
      return list.map(f=> ({ ...f, _keys: f['时间'] ? ['时间','阶段','操作人'].concat(BX_FLOW_INFO[f['阶段']]||[]) : [] }));
    });
    function openBxFlowNo(k, v){
      const pid = k==='报修单号' ? BX_PAGE : 'np-0308-03';
      window.open(location.pathname + location.search + '#page=' + pid, '_blank');
      ElMessage.success('已在新窗口打开「'+((CFG.pages[pid]||{}).title||pid)+'」：'+v);
    }
    /** 故障处理（复杂版）：待处理 Tab 取「待处理」的报修单；提交后反写报修单并生成处理记录（tab-2，快照不再变动） */
    const CL_PAGE = 'np-0308-02';
    const WO_PAGE = 'np-0308-03';
    const CL_WAYS = ['厂内维修','委外维修','不维修，报废','驳回'];
    const CL_REPAIR = ['厂内维修','委外维修'];
    const CL_FAULT_KEYS = ['故障类型','故障描述','故障图片','故障时间','期望完成时间','紧急程度','报修地点','报修时间','报修人'];
    const CL_PROC_KEYS = ['处理方式','故障类型（维修单）','紧急程度（维修单）','维保班组（维修单）','维保班组','预计维修完成时间','处理时间','处理人','处理备注'];
    function clRecords(){
      const bag = (MOCK[CL_PAGE] = MOCK[CL_PAGE] || {});
      return bag['tab-2'] || (bag['tab-2'] = []);
    }
    function clPendingRows(){ return bxRows().filter(r=> r['单据状态']==='待处理'); }
    const clPendingCount = computed(()=>{ storeTick.value; return clPendingRows().length; });
    function clQueryRows(){
      if(activeTab.value==='tab-2'){
        let l = applyContainsExactQuery(clRecords().slice(), query, ['报修单号','仪器编号','仪器名称','仪器类型','故障类型','处理人'], ['处理方式','紧急程度']);
        l = applyDateRangeQuery(l, query, '处理时间');
        return l.sort((a,b)=> String(b['处理时间']||'').localeCompare(String(a['处理时间']||'')));
      }
      let l = applyContainsExactQuery(clPendingRows().map(bxView), query, ['报修单号','仪器编号','仪器名称','仪器类型','故障类型','报修人'], ['紧急程度']);
      l = applyDateRangeQuery(l, query, '报修时间');
      return l.sort((a,b)=> String(b['报修时间']||'').localeCompare(String(a['报修时间']||'')));
    }

    const clDlgVisible = ref(false);
    const clDlgBatch = ref(false);
    const clDlgRows = ref([]);
    const clForm = reactive({});
    const clNeedRepair = computed(()=> CL_REPAIR.includes(clForm['处理方式']));
    const clFaultTypes = computed(()=>{
      storeTick.value;
      const types = new Set(clDlgRows.value.map(r=> r['仪器类型']).filter(Boolean));
      return (((MOCK[FAULT_TYPE_PAGE]||{}).main)||[]).filter(r=> r['启用状态']==='启用')
        .filter(r=> !types.size || splitDun(r['适用仪器类型']).some(t=> t==='通用' || types.has(t)))
        .map(r=> r['故障类型名称']);
    });
    function openClDlg(rows, batch){
      const ids = new Set((rows||[]).map(r=> r.id));
      const src = bxRows().filter(r=> ids.has(r.id));
      if(!src.length){ ElMessage.warning('请先勾选数据'); return; }
      if(src.some(r=> r['单据状态']!=='待处理')){ ElMessage.warning('仅待处理的报修单可处理'); return; }
      const one = src[0], d = (!batch && one._clDraft) || {};
      const pick = (k, def)=> d[k]!=null ? d[k] : def;
      clDlgBatch.value = !!batch;
      clDlgRows.value = src.map(bxView);
      Object.keys(clForm).forEach(k=> delete clForm[k]);
      Object.assign(clForm, {
        处理方式: pick('处理方式', '厂内维修'),
        故障类型: pick('故障类型', one['故障类型'] || ''),
        紧急程度: pick('紧急程度', one['紧急程度'] || '一般'),
        维保班组: splitDun(pick('维保班组', '')),
        预计维修完成时间: pick('预计维修完成时间', batch ? '' : (one['期望完成时间'] || '')),
        备注: pick('备注', '')
      });
      clDlgVisible.value = true;
    }
    function saveClDraft(){
      const cur = bxRows().find(r=> r.id===(clDlgRows.value[0]||{}).id);
      if(!cur || cur['单据状态']!=='待处理'){ ElMessage.warning('仅待处理的报修单可处理'); return; }
      cur._clDraft = { ...clForm, 维保班组: splitDun(clForm['维保班组']).join('、') };
      clDlgVisible.value = false;
      bumpStore();
      ElMessage.success('已保存，报修单仍为待处理');
    }
    function clWxNoGen(){
      let max = 0;
      const scan = v=> String(v||'').replace(/YQWX(\d{8})/g, (m, n)=>{ max = Math.max(max, Number(n)); return m; });
      bxRows().forEach(r=>{ scan(r['处理备注']); (r._flow||[]).forEach(f=> scan(f['维修单号'])); });
      clRecords().forEach(r=> scan(r['维修单号']));
      woRows().forEach(r=> scan(r['维修单号']));
      return ()=> 'YQWX' + String(++max).padStart(8, '0');
    }
    function submitClDlg(){
      const way = clForm['处理方式'], batch = clDlgBatch.value;
      if(!way){ ElMessage.warning('请选择处理方式'); return; }
      const repair = CL_REPAIR.includes(way);
      const teams = splitDun(clForm['维保班组']).join('、');
      if(repair && !batch && !String(clForm['故障类型']||'').trim()){ ElMessage.warning('请选择故障类型'); return; }
      if(repair && !teams){ ElMessage.warning('请选择维保班组'); return; }
      const ids = new Set(clDlgRows.value.map(r=> r.id));
      const src = bxRows().filter(r=> ids.has(r.id));
      if(!src.length || src.some(r=> r['单据状态']!=='待处理')){ ElMessage.warning('仅待处理的报修单可处理'); return; }
      const at = nowStamp(), note = String(clForm['备注']||'').trim(), nextNo = clWxNoGen(), wxNos = [];
      src.forEach(r=>{
        const p = repair ? {
          处理方式: way,
          '故障类型（维修单）': batch ? r['故障类型'] : clForm['故障类型'],
          '紧急程度（维修单）': batch ? r['紧急程度'] : (clForm['紧急程度'] || r['紧急程度']),
          '维保班组（维修单）': teams, 维保班组: teams,
          预计维修完成时间: clForm['预计维修完成时间'] || ''
        } : { 处理方式: way, '故障类型（维修单）': '/', '紧急程度（维修单）': '/', '维保班组（维修单）': '/', 维保班组: '/', 预计维修完成时间: '/' };
        Object.assign(p, { 处理时间: at, 处理人: CI_OPERATOR, 处理备注: note });
        const wx = repair ? nextNo() : '';
        const view = bxView(r);
        clRecords().unshift(Object.assign({ id: 'cl-'+Date.now()+'-'+r.id, _bxId: r.id, _instId: r._instId, 单据状态: r['单据状态'], 报修单号: r['报修单号'] },
          Object.fromEntries(BX_INST_KEYS.map(k=> [k, view[k] || ''])), Object.fromEntries(CL_FAULT_KEYS.map(k=> [k, r[k] || ''])),
          Object.fromEntries(CL_PROC_KEYS.map(k=> [k, p[k] || ''])), { 维修单号: wx }));
        Object.assign(r, p, { 单据状态: repair ? '维修中' : '结单' });
        delete r._clDraft;
        (r._flow = r._flow || []).push({ 阶段: '报修处理', 时间: at, 操作人: CI_OPERATOR, 维修方式: way, 处理说明: note, 报修单号: r['报修单号'] });
        if(wx){
          wxNos.push(wx);
          woRows().unshift(woFromBx(r, wx));
        }
      });
      clDlgVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      ElMessage.success('已处理 '+src.length+' 张报修单，'+(repair ? '已生成维修单 '+wxNos.join('、')+'（待维修），报修单状态改为维修中' : '报修单状态改为结单'));
    }
    /** 维修工单（复杂版）：tab-1 维修单（报修创建 / 手动新增，维修 / 验收字段反写最新一次）；tab-2 维修记录（每次提交维修生成，快照不再变动） */
    const WO_OPEN = ['待维修','维修中','退修'];
    const WO_CLOSABLE = ['待维修','维修中','退修','待验收'];
    const WO_FIX_KEYS = ['维修结果','维修过程说明','仪器故障分析','维修图片','维修说明','维修完成时间','维修人'];
    const WO_ACC_KEYS = ['验收结果','验收说明','验收图片','验收时间','验收操作人'];
    const WO_PROC_KEYS = ['处理方式','维保班组','预计维修完成时间','处理备注','创建方式','创建人','创建时间'];
    const WO_REC_KEYS = ['维修单号','报修单号'].concat(BX_INST_KEYS, CL_FAULT_KEYS, WO_PROC_KEYS);
    const WO_DETAIL = [
      BX_DETAIL[0],
      ['故障内容', ['单据状态','报修单号','故障类型','故障描述','故障图片','故障时间','期望完成时间','紧急程度','报修地点','报修时间','报修人']],
      ['处理内容', ['维修单号','创建方式','处理方式','故障类型（维修单）','紧急程度（维修单）','维保班组（维修单）','预计维修完成时间','处理时间','处理人','处理备注']],
      BX_DETAIL[3], PART_SEC, BX_DETAIL[4]
    ];
    const WO_FIX_SECS = [
      BX_DETAIL[0],
      ['故障内容', ['单据状态','维修单号','报修单号','故障类型','故障描述','故障图片','故障时间','期望完成时间','紧急程度','报修地点','报修时间','报修人']],
      ['处理内容', ['处理方式','维保班组','预计维修完成时间','处理时间','处理人','处理备注']]
    ];
    function woBag(){ return MOCK[WO_PAGE] = MOCK[WO_PAGE] || {}; }
    function woRows(){ const b = woBag(); return b['tab-1'] || (b['tab-1'] = []); }
    function woRecords(){ const b = woBag(); return b['tab-2'] || (b['tab-2'] = []); }
    function woBx(w){ return w && w._bxId ? bxRows().find(r=> r.id===w._bxId) || null : null; }
    function woFromBx(b, no){
      const v = bxView(b);
      return Object.assign({ id: 'wo-'+Date.now()+'-'+b.id, 单据状态: '待维修', 维修单号: no, 报修单号: b['报修单号'], _bxId: b.id, _instId: b._instId },
        Object.fromEntries(BX_INST_KEYS.map(k=> [k, v[k] || ''])), Object.fromEntries(CL_FAULT_KEYS.map(k=> [k, b[k] || ''])),
        { 故障类型: b['故障类型（维修单）'], 紧急程度: b['紧急程度（维修单）'], 处理方式: b['处理方式'], 维保班组: b['维保班组（维修单）'],
          预计维修完成时间: b['预计维修完成时间'] || '', 处理备注: b['处理备注'] || '', 创建方式: '报修创建', 创建人: b['处理人'], 创建时间: b['处理时间'] },
        Object.fromEntries(WO_FIX_KEYS.concat(WO_ACC_KEYS).map(k=> [k, ''])));
    }
    function woFlowPush(w, node){
      const host = woBx(w) || w;
      (host._flow = host._flow || []).push(Object.assign({ 时间: nowStamp(), 操作人: CI_OPERATOR, 维修单号: w['维修单号'] }, node));
    }
    /** 维修单删除 / 关闭后，上游报修单回到「待处理」，处理 / 维修 / 验收字段清空，可重新处理 */
    function woResetBx(w, stage){
      const b = woBx(w);
      if(b){
        BX_DETAIL.slice(2).flatMap(([, ks])=> ks).concat(['维保班组']).forEach(k=>{ b[k] = ''; });
        b._parts = [];
        b['单据状态'] = '待处理';
      }
      woFlowPush(w, { 阶段: stage });
    }
    function woQueryRows(){
      if(activeTab.value==='tab-2'){
        let l = applyContainsExactQuery(woRecords().slice(), query, ['维修单号','报修单号','仪器编号','仪器名称','仪器类型','故障类型','维修人'], ['维修结果','创建方式']);
        l = applyDateRangeQuery(l, query, '维修完成时间');
        return l.sort((a,b)=> String(b['维修完成时间']||'').localeCompare(String(a['维修完成时间']||'')));
      }
      let l = applyContainsExactQuery(woRows().map(bxView), query, ['维修单号','报修单号','仪器编号','仪器名称','仪器类型','故障类型','维保班组'], ['单据状态','紧急程度','创建方式','处理方式']);
      l = applyDateRangeQuery(l, query, '创建时间');
      return l.sort((a,b)=> String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')));
    }

    function openWoForm(mode, row){
      const src = row ? woRows().find(w=> w.id===row.id) : null;
      if(mode==='edit' && (!src || !WO_OPEN.includes(src['单据状态']))){ ElMessage.warning('仅待维修、维修中、退修的维修单可编辑'); return; }
      bxFormKind.value = 'wo';
      bxFormMode.value = mode;
      bxFormSel.value = [];
      bxEditId.value = src ? src.id : '';
      Object.keys(bxForm).forEach(k=> delete bxForm[k]);
      BX_FAULT_KEYS.concat(['处理方式','预计维修完成时间','处理备注']).forEach(k=>{ bxForm[k] = src ? (src[k] || '') : ''; });
      bxForm['维保班组'] = src ? splitDun(src['维保班组']) : [];
      if(!bxForm['紧急程度']) bxForm['紧急程度'] = '一般';
      if(!bxForm['处理方式']) bxForm['处理方式'] = '厂内维修';
      if(!src) bxForm['故障时间'] = djFmtTime(new Date());
      const inst = src ? djInstruments().find(x=> x.id===src._instId) : null;
      bxFormLines.value = inst ? [Object.assign({ _instId: inst.id }, bxInstSnap(inst))] : [];
      bxFormVisible.value = true;
    }
    function saveWoForm(){
      const txt = k=> String(bxForm[k]==null ? '' : bxForm[k]).trim();
      const lines = bxFormLines.value;
      const teams = splitDun(bxForm['维保班组']).join('、');
      if(!lines.length){ ElMessage.warning('请添加仪器'); return; }
      if(!txt('故障类型')){ ElMessage.warning('请选择故障类型'); return; }
      if(!txt('故障描述')){ ElMessage.warning('请输入故障描述'); return; }
      if(!txt('故障时间')){ ElMessage.warning('请选择故障时间'); return; }
      if(!CL_REPAIR.includes(txt('处理方式'))){ ElMessage.warning('请选择处理方式'); return; }
      if(!teams){ ElMessage.warning('请选择维保班组'); return; }
      const proc = { 处理方式: txt('处理方式'), 维保班组: teams, 预计维修完成时间: txt('预计维修完成时间'), 处理备注: txt('处理备注') };
      if(bxFormMode.value==='edit'){
        const cur = woRows().find(w=> w.id===bxEditId.value);
        if(!cur || !WO_OPEN.includes(cur['单据状态'])){ ElMessage.warning('仅待维修、维修中、退修的维修单可编辑'); return; }
        const fault = cur._bxId ? { 故障类型: txt('故障类型'), 紧急程度: txt('紧急程度') } : Object.fromEntries(BX_FAULT_KEYS.filter(k=> k!=='期望完成时间').map(k=> [k, txt(k)]));
        Object.assign(cur, fault, proc);
        const hadDraft = !!cur._draft;
        delete cur._draft;
        if(cur['单据状态']==='维修中') cur['单据状态'] = '待维修';
        const b = woBx(cur);
        if(b) Object.assign(b, { 处理方式: proc['处理方式'], '故障类型（维修单）': fault['故障类型'], '紧急程度（维修单）': fault['紧急程度'],
          '维保班组（维修单）': teams, 维保班组: teams, 预计维修完成时间: proc['预计维修完成时间'], 处理备注: proc['处理备注'] });
        const head = (cur._flow||[]).find(f=> f['阶段']==='手动新增');
        if(head) head['故障描述'] = cur['故障描述'];
        bxFormVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功' + (hadDraft ? '；已清空保存的维修数据，需重新填写' : ''));
        return;
      }
      const at = nowStamp(), nextNo = clWxNoGen(), nos = [];
      const fault = Object.fromEntries(CL_FAULT_KEYS.map(k=> [k, ['报修时间','报修人','期望完成时间'].includes(k) ? '' : txt(k)]));
      lines.forEach((l, i)=>{
        const no = nextNo();
        const inst = djInstruments().find(x=> x.id===l._instId) || l;
        nos.push(no);
        woRows().unshift(Object.assign({ id: 'wo-'+Date.now()+'-'+i, 单据状态: '待维修', 维修单号: no, 报修单号: '', _bxId: '', _instId: l._instId },
          bxInstSnap(inst), fault, proc, { 创建方式: '手动新增', 创建人: CI_OPERATOR, 创建时间: at },
          Object.fromEntries(WO_FIX_KEYS.concat(WO_ACC_KEYS).map(k=> [k, ''])),
          { _flow: [{ 阶段: '手动新增', 时间: at, 操作人: CI_OPERATOR, 故障描述: fault['故障描述'], 维修单号: no }] }));
      });
      bxFormVisible.value = false;
      bumpStore();
      ElMessage.success('已生成 '+nos.length+' 张维修单 '+nos.join('、')+'，单据状态为待维修');
    }

