    const EA_PAGE = 'np-0211-02';
    const AUDIT_PAGE = { 'np-0211-02': '外审' };
    const EA_MULTI = ['负责人'];
    function isAuditPage(){ return !!AUDIT_PAGE[pageId.value]; }
    function auditPrefix(){ return AUDIT_PAGE[pageId.value] || '外审'; }
    function auditNoKey(){ return '审核单号'; }
    function auditExecKey(){ return auditPrefix()+'实施'; }
    function auditWhoKey(){ return auditPrefix()+'实施提交人'; }
    function auditWhenKey(){ return auditPrefix()+'实施提交时间'; }
    function auditFields(){ return [auditNoKey(),'审核方式','审核类型','客户名称','审核日期','审核内容描述','负责人','审核附件','需求资料','备注']; }
    function eaBag(){
      const pid = isAuditPage() ? pageId.value : EA_PAGE;
      return MOCK[pid] = MOCK[pid] || { 'tab-1':[], 'tab-2':[] };
    }
    function eaList(tab){ const b = eaBag(); if(!Array.isArray(b[tab])) b[tab] = []; return b[tab]; }
    function eaAll(){ return eaList('tab-1').concat(eaList('tab-2')); }
    function nextEaNo(){
      const max = eaAll().reduce((m, r)=> Math.max(m, parseInt(String(r[auditNoKey()]||'').replace(/\D/g,''), 10) || 0), 0);
      return String(max + 1).padStart(6, '0');
    }
    function eaFormOptions(f){
      if(f.name==='负责人') return CI_USERS.map(u=> ({ value:u.姓名, label:u.工号+' / '+u.姓名 }));
      return null;
    }
    function eaQuery(list, done){
      const noKey = auditNoKey();
      const nos = splitDun(query[noKey]);
      if(nos.length>1){
        const set = new Set(nos);
        list = list.filter(r=> set.has(r[noKey]));
      }
      const q = nos.length>1 ? Object.assign({}, query, { [noKey]:'' }) : query;
      const contains = [noKey,'客户名称','负责人','审核内容描述','创建人'].concat(done ? [auditWhoKey(),'实施说明'] : []);
      list = applyContainsExactQuery(list, q, contains, ['审核方式','审核类型']);
      ['审核日期','创建时间'].forEach(k=>{ list = applyDateRangeQuery(list, query, k); });
      if(done) list = applyDateRangeQuery(list, query, auditWhenKey());
      return list;
    }
    function openEaForm(mode, row){
      openForm(mode==='copy' ? 'add' : mode);
      const fields = auditFields();
      const fill = (src)=>{
        fields.forEach(k=>{ formModel[k] = EA_MULTI.includes(k) ? splitDun(src[k]) : (src[k]==='—' ? '' : (src[k]||'')); });
      };
      if(mode==='edit'){
        fill(row);
        formModel._editId = row.id;
        return;
      }
      if(mode==='copy' && row){
        fill(row);
        formModel[auditNoKey()] = nextEaNo();
        delete formModel._editId;
        return;
      }
      const blank = { 审核方式:'', 审核类型:'', 客户名称:'', 审核日期:'', 审核内容描述:'', 负责人:[], 需求资料:'', 审核附件:'', 备注:'' };
      blank[auditNoKey()] = nextEaNo();
      Object.assign(formModel, blank);
    }
    function saveEaForm(){
      if(!String(formModel['审核方式']||'').trim()){ ElMessage.warning('请选择审核方式'); return; }
      if(!String(formModel['审核类型']||'').trim()){ ElMessage.warning('请选择审核类型'); return; }
      const noKey = auditNoKey();
      const no = String(formModel[noKey]||'').trim();
      if(!/^\d{6}$/.test(no)){ ElMessage.warning(noKey+'须为 6 位数字流水'); return; }
      if(eaAll().some(r=> r[noKey]===no && r.id!==formModel._editId)){ ElMessage.warning(noKey+'已存在，请刷新后重新生成'); return; }
      const payload = {};
      auditFields().forEach(k=>{ payload[k] = EA_MULTI.includes(k) ? (formModel[k]||[]).filter(Boolean).join('、') : String(formModel[k]||'').trim(); });
      const label = auditPrefix()+'单';
      if(formMode.value==='add'){
        eaList('tab-1').unshift({ id:(auditPrefix()==='内审'?'ia':'ea')+'-'+Date.now(), 审核状态:'执行中', ...payload, 创建时间: nowStamp(), 创建人: CI_OPERATOR });
        ElMessage.success(label+'已新增');
      } else {
        const cur = eaList('tab-1').find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑的数据'); return; }
        Object.assign(cur, payload);
        ElMessage.success('已保存');
      }
      formVisible.value = false;
      bumpStore();
    }
    function deleteEaRows(){
      const ids = new Set(selectedIds.value);
      if(!ids.size){ ElMessage.warning('请先勾选要删除的数据'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条'+auditPrefix()+'单？', '批量删除', { type:'warning' }).then(()=>{
        eaBag()['tab-1'] = eaList('tab-1').filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条数据');
      }).catch(()=>{});
    }
    function openEaExec(row){
      openProcDlg({
        title: auditExecKey(), okText:'确定', keys:[],
        fields:[
          { name:'实施说明', type:'input', placeholder:'输入' },
          { name:'附件', type:'upload', half:true }
        ],
        onSubmit: submitEaExec
      }, row);
    }
    function submitEaExec(row, desc, files){
      const list = eaList('tab-1');
      const i = list.findIndex(r=> r.id===row.id);
      const label = auditPrefix()+'单';
      if(i<0){ ElMessage.warning('该'+label+'已不在待处理，请刷新后重试'); return; }
      const rec = list.splice(i, 1)[0];
      const patch = { 审核状态:'已完成', 实施说明: desc || '', 实施附件: files && files!=='—' ? files : '' };
      patch[auditWhoKey()] = CI_OPERATOR;
      patch[auditWhenKey()] = nowStamp();
      Object.assign(rec, patch);
      eaList('tab-2').unshift(rec);
      ElMessage.success(auditExecKey()+'已提交，'+label+' '+rec[auditNoKey()]+' 状态更新为已完成');
    }
    function onEaToolbar(btn){
      if(btn.name==='新增'){ openEaForm('add'); return true; }
      if(btn.name==='批量删除'){ deleteEaRows(); return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      return false;
    }
    const iaLinkVisible = ref(false);
    const iaLinkNos = ref([]);
    const iaLinkRows = computed(()=>{
      if(!iaLinkVisible.value) return [];
      const set = new Set(iaLinkNos.value);
      const count = pid => pid===IA_EXEC ? iaeLinkCount(set) : pid===IA_RECT ? iarAll().filter(r=> set.has(r['内审单号'])).length : iaBagRows(pid).filter(r=> set.has(r['内审单号'])).length;
      return [
        { 关联单据:'内审实施', page:IA_EXEC, 关联记录数: count(IA_EXEC) },
        { 关联单据:'内审整改', page:IA_RECT, 关联记录数: count(IA_RECT) }
      ];
    });
    function openIaLink(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      iaLinkNos.value = [...new Set(rows.map(r=> r['内审单号']))];
      iaLinkVisible.value = true;
    }
    function goIaLink(row){
      iaLinkVisible.value = false;
      const p = CFG.pages[row.page];
      const nos = iaLinkNos.value.slice();
      onSelectMenu(row.page);
      const tip = '已按内审单号 '+nos.join('、')+' 跳转至「'+(p && p.title || '')+'」';
      if(!p || p.stub){ ElMessage.info(tip+'，该模块原型待完善'); return; }
      const toDone = (row.page===IA_EXEC && !iaePendingRows().some(r=> nos.includes(r['内审单号'])) && iaeDoneList().some(r=> nos.includes(r['内审单号'])))
        || (row.page===IA_RECT && !iarTab('tab-1').some(r=> nos.includes(r['内审单号'])) && iarTab('tab-2').some(r=> nos.includes(r['内审单号'])));
      setTimeout(()=>{
        if(toDone) activeTab.value = 'tab-2';
        if(row.page===IA_RECT){ iarYearId.value = ''; iarYearKw.value = ''; }
        resetQueryModel();
        query['内审单号'] = nos.join('、');
        pageNum.value = 1;
        ElMessage.success(tip + (toDone ? '「已完成」' : ''));
      }, 80);
    }
    function onIaToolbar(btn){
      if(btn.name==='新增'){ openIaForm('add'); return true; }
      if(btn.name==='关联查询'){ openIaLink(); return true; }
      if(btn.name==='关闭'){ closeIaRows(); return true; }
      if(btn.name==='批量删除'){ deleteIaRows(); return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      return false;
    }
    const IAE_VIEW = ['内审单号','内审年度','审核日期','审核目的','审核准则','审核范围','审核组成员','备注','审核附件','创建时间','创建人'];
    function iaeDoneList(){ return ((MOCK[IA_EXEC]||{})['tab-2']) || []; }
    function iaeDoneRows(){
      const bag = MOCK[IA_EXEC] = MOCK[IA_EXEC] || {};
      if(!Array.isArray(bag['tab-2'])) bag['tab-2'] = [];
      return bag['tab-2'];
    }
    function iaePendingRows(){
      return iaRows().filter(p=> p['内审状态']==='执行中').map(p=>{
        const r = { id:'iae-p-'+p.id };
        IAE_VIEW.forEach(k=>{ r[k] = p[k] || ''; });
        return r;
      });
    }
    const iaePendingCount = computed(()=>{ storeTick.value; return iaePendingRows().length; });
    function iaeLinkCount(set){
      return iaePendingRows().filter(r=> set.has(r['内审单号'])).length + iaeDoneList().filter(r=> set.has(r['内审单号'])).length;
    }
    function iaeQuery(list, done){
      const nos = splitDun(query['内审单号']);
      if(nos.length>1){
        const set = new Set(nos);
        list = list.filter(r=> set.has(r['内审单号']));
      }
      const q = nos.length>1 ? Object.assign({}, query, { 内审单号:'' }) : query;
      const contains = ['内审单号','审核目的','审核准则','审核范围','审核组成员','创建人'].concat(done ? ['变更实施提交人','实施说明'] : []);
      list = applyContainsExactQuery(list, q, contains, ['内审年度']);
      ['审核日期','创建时间'].forEach(k=>{ list = applyDateRangeQuery(list, query, k); });
      if(done) list = applyDateRangeQuery(list, query, '变更实施提交时间');
      return list;
    }
    function openIaeExec(row){
      openProcDlg({
        title:'内审实施', okText:'确定', keys:[],
        fields:[
          { name:'实施说明', type:'input', required:true, placeholder:'输入' },
          { name:'附件', type:'upload', half:true }
        ],
        onSubmit: submitIaeExec
      }, row);
    }
    function submitIaeExec(row, desc, files){
      const p = iaRows().find(x=> x['内审单号']===row['内审单号']);
      if(!p || p['内审状态']!=='执行中'){ ElMessage.warning('该内审计划已不在执行中，请刷新后重试'); return; }
      const rec = { id:'iae-'+Date.now() };
      IAE_VIEW.forEach(k=>{ rec[k] = p[k] || ''; });
      Object.assign(rec, { 实施说明: desc, 实施附件: files, 变更实施提交人: CI_OPERATOR, 变更实施提交时间: nowStamp() });
      iaeDoneRows().unshift(rec);
      p['内审状态'] = '已完成';
      ElMessage.success('内审实施已提交，内审计划 '+p['内审单号']+' 状态更新为已完成');
    }
    function iaeRelQuery(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r['内审单号']))];
      loadPage(IA_PAGE);
      setTimeout(()=>{
        query['内审单号'] = nos.join('、');
        pageNum.value = 1;
        ElMessage.success('已跳转内审计划，按所选 '+nos.length+' 个内审单号过滤');
      }, 0);
    }
    function onIaeToolbar(btn){
      if(btn.name==='关联查询'){ iaeRelQuery(); return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      return false;
    }

    const IAR_FIELDS = ['内审整改单号','内审单号','内审年度','体系名称','受审部门','部门负责人','事实陈述','不符合项条款-标准','不符合项条款-体系文件','审核员','审核日期','附件','备注'];
    const IAR_REQUIRED = ['内审整改单号','内审单号','内审年度','体系名称','受审部门','事实陈述'];
    const iarYearId = ref('');
    const iarYearKw = ref('');
    function iarBag(){
      const bag = MOCK[IA_RECT] = MOCK[IA_RECT] || {};
      ['tab-1','tab-2','closed'].forEach(k=>{ if(!Array.isArray(bag[k])) bag[k] = []; });
      if(Array.isArray(bag.main)) delete bag.main;
      return bag;
    }
    function iarTab(name){ return iarBag()[name]; }
    function iarAll(){ const bag = iarBag(); return [...bag['tab-1'], ...bag['tab-2'], ...bag.closed]; }
    function nextIarNo(){
      const max = iarAll().reduce((m, r)=> Math.max(m, parseInt(String(r['内审整改单号']||'').replace(/\D/g,''), 10) || 0), 0);
      return 'ZG' + String(max + 1).padStart(6, '0');
    }
    const iarYearNodes = computed(()=>{
      storeTick.value;
      const years = [...new Set(iarAll().map(r=> r['内审年度']).filter(Boolean))].sort((a, b)=> String(b).localeCompare(String(a)));
      const kw = String(iarYearKw.value || '').trim();
      return kw ? years.filter(y=> String(y).includes(kw)) : years;
    });
    function selectIarYear(year){ iarYearId.value = year; pageNum.value = 1; }
    function clearIarYear(){ iarYearId.value = ''; iarYearKw.value = ''; selectedIds.value = []; pageNum.value = 1; }
    const iarPendingCount = computed(()=>{ storeTick.value; return iarTab('tab-1').length; });
    function iarQuery(list, done){
      if(iarYearId.value) list = list.filter(r=> r['内审年度']===iarYearId.value);
      const nos = splitDun(query['内审单号']);
      if(nos.length>1){
        const set = new Set(nos);
        list = list.filter(r=> set.has(r['内审单号']));
      }
      const q = nos.length>1 ? Object.assign({}, query, { 内审单号:'' }) : query;
      const contains = ['内审整改单号','内审单号','体系名称','受审部门','部门负责人','事实陈述','不符合项条款-标准','不符合项条款-体系文件','审核员','创建人'].concat(done ? ['整改人','原因分析','整改措施','整改说明'] : []);
      list = applyContainsExactQuery(list, q, contains, ['内审年度']);
      ['审核日期','创建时间'].forEach(k=>{ list = applyDateRangeQuery(list, query, k); });
      if(done) list = applyDateRangeQuery(list, query, '整改完成时间');
      return list;
    }
    function iarFormOptions(f){
      if(f.name==='部门负责人' || f.name==='审核员') return CI_USERS.map(u=> ({ value:u.姓名, label:u.工号+' / '+u.姓名 }));
      if(f.name==='内审单号') return iaRows().map(r=> ({ value:r['内审单号'], label:r['内审单号']+' / '+(r['内审年度']||'') }));
      return null;
    }
    function openIarForm(mode, row){
      openForm(mode==='copy' ? 'add' : mode);
      if(mode==='edit'){
        IAR_FIELDS.forEach(k=>{ formModel[k] = row[k]==='—' ? '' : (row[k] || ''); });
        formModel._editId = row.id;
        return;
      }
      const year = new Date().getFullYear()+'年';
      if(mode==='copy' && row){
        IAR_FIELDS.forEach(k=>{ formModel[k] = row[k]==='—' ? '' : (row[k] || ''); });
        formModel['内审整改单号'] = nextIarNo();
        delete formModel._editId;
        return;
      }
      const blank = {};
      IAR_FIELDS.forEach(k=>{ blank[k] = ''; });
      Object.assign(formModel, blank, { 内审整改单号: nextIarNo(), 内审年度: year });
    }
    function saveIarForm(){
      const miss = IAR_REQUIRED.find(k=> !String(formModel[k] || '').trim());
      if(miss){ ElMessage.warning((['内审年度','内审单号','部门负责人','审核员'].includes(miss) ? '请选择' : '请输入') + miss); return; }
      const no = String(formModel['内审整改单号']).trim();
      if(!/^ZG\d{6}$/.test(no)){ ElMessage.warning('内审整改单号须为 ZG 加 6 位数字'); return; }
      if(iarAll().some(r=> r['内审整改单号']===no && r.id!==formModel._editId)){ ElMessage.warning('内审整改单号已存在，请刷新后重新生成'); return; }
      const payload = {};
      IAR_FIELDS.forEach(k=>{ payload[k] = String(formModel[k] || '').trim(); });
      if(formMode.value==='add'){
        iarTab('tab-1').unshift({ id:'iar-'+Date.now(), 整改状态:'待处理', ...payload, 创建时间: nowStamp(), 创建人: CI_OPERATOR });
        ElMessage.success('内审整改已新增');
      } else {
        const cur = iarTab('tab-1').find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('仅待处理数据可编辑'); return; }
        Object.assign(cur, payload);
        ElMessage.success('已保存');
      }
      formVisible.value = false;
      bumpStore();
    }
    const canCloseIar = computed(()=> pageId.value===IA_RECT && (tabView.value||{}).name==='tab-1' && selectedIds.value.length>0);
    function closeIarRows(){
      const ids = new Set(selectedIds.value);
      const rows = iarTab('tab-1').filter(r=> ids.has(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选待处理数据'); return; }
      ElementPlus.ElMessageBox.confirm('确认关闭所选的 '+rows.length+' 条内审整改？关闭后不再出现在待处理与已完成。', '关闭', { type:'warning' }).then(()=>{
        const bag = iarBag();
        bag['tab-1'] = bag['tab-1'].filter(r=> !ids.has(r.id));
        rows.forEach(r=>{ r['整改状态'] = '已关闭'; bag.closed.unshift(r); });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已关闭 '+rows.length+' 条内审整改');
      }).catch(()=>{});
    }
    function deleteIarRows(){
      const ids = new Set(selectedIds.value);
      if(!ids.size){ ElMessage.warning('请先勾选要删除的数据'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条内审整改？', '批量删除', { type:'warning' }).then(()=>{
        const bag = iarBag();
        bag['tab-1'] = bag['tab-1'].filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条数据');
      }).catch(()=>{});
    }
    function openIarProcess(row){
      openProcDlg({
        title:'整改处理', okText:'确定', keys:[],
        fields:[
          { name:'原因分析', type:'input', required:true, placeholder:'输入' },
          { name:'整改措施', type:'input', required:true, placeholder:'输入' },
          { name:'整改说明', type:'input', placeholder:'输入' },
          { name:'附件', type:'upload', half:true }
        ],
        onSubmit: submitIarProcess
      }, row);
    }
    function submitIarProcess(row, desc, files, vals){
      const bag = iarBag();
      const idx = bag['tab-1'].findIndex(r=> r.id===row.id);
      if(idx<0){ ElMessage.warning('该整改单已不在待处理，请刷新后重试'); return; }
      const src = bag['tab-1'][idx];
      bag['tab-1'].splice(idx, 1);
      bag['tab-2'].unshift(Object.assign({}, src, {
        整改状态:'已完成',
        原因分析: (vals && vals['原因分析']) || desc,
        整改措施: (vals && vals['整改措施']) || '',
        整改说明: (vals && vals['整改说明']) || '',
        整改报告: files,
        整改完成时间: nowStamp(),
        整改人: CI_OPERATOR
      }));
      ElMessage.success('整改处理已提交，'+src['内审整改单号']+' 已进入已完成');
    }
    function onIarToolbar(btn){
      if(btn.name==='新增'){ openIarForm('add'); return true; }
      if(btn.name==='关闭'){ closeIarRows(); return true; }
      if(btn.name==='批量删除'){ deleteIarRows(); return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      return false;
    }

    function onCiToolbar(btn){
      if(btn.name==='新增'){ openCiForm('add'); return true; }
      if(btn.name==='关联查询'){ ciRelQuery(); return true; }
      if(btn.name==='关闭'){ closeCiRows(); return true; }
      if(btn.name==='批量删除'){ deleteCiRows(); return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      return false;
    }

    /** 改进处理：待处理由「执行中」的持续改进按责任部门拆分（一个部门一行）；已完成为各部门提交后的子级数据 */
    const CIP_PAGE = CI_SUB_PAGE;
    const CIP_KEYS = ['提案编号','提案人','提案部门','提案日期','计划完成时间','持续改进项目','现有状况描述','改进后状况和改进目标','小组成员','小组组长','备注','创建时间','创建人'];
    const CIP_INFO_KEYS = ['提案编号','责任部门','提案人','提案部门','提案日期','计划完成时间','小组组长','小组成员','持续改进项目','现有状况描述','改进后状况和改进目标'];
    const CIP_INFO_FULL = ['小组成员','持续改进项目','现有状况描述','改进后状况和改进目标'];
    function cipDoneList(){ return ((MOCK[CIP_PAGE]||{})['tab-2']) || []; }
    function cipDoneRows(){
      const bag = MOCK[CIP_PAGE] = MOCK[CIP_PAGE] || {};
      if(!Array.isArray(bag['tab-2'])) bag['tab-2'] = [];
      return bag['tab-2'];
    }
    const cipKey = (no, dept)=> no+'|'+dept;
    function cipDoneSet(){ return new Set(cipDoneList().map(r=> cipKey(r['提案编号'], r['责任部门']))); }
    function cipPendingRows(){
      const done = cipDoneSet();
      const out = [];
      ciRows().filter(p=> p['改进状态']==='执行中').forEach(p=>{
        splitDun(p['责任部门']).forEach(d=>{
          if(done.has(cipKey(p['提案编号'], d))) return;
          const r = { id:'cip-'+p.id+'-'+d, 处理状态:'待处理', 责任部门:d };
          CIP_KEYS.forEach(k=>{ r[k] = p[k]; });
          out.push(r);
        });
      });
      return out;
    }
    /** 所有责任部门均已提交 → 持续改进「已完成」；新增了未完成的责任部门 → 回到「执行中」；已关闭不变 */
    function ciSyncStatus(p){
      if(!p || !['执行中','已完成'].includes(p['改进状态'])) return false;
      const done = cipDoneSet();
      const depts = splitDun(p['责任部门']);
      const next = depts.length && depts.every(d=> done.has(cipKey(p['提案编号'], d))) ? '已完成' : '执行中';
      const changed = p['改进状态']!==next;
      p['改进状态'] = next;
      return changed;
    }
    const cipPendingCount = computed(()=>{ storeTick.value; return cipPendingRows().length; });
    function tabBadgeOf(t){
      if(pageId.value===CL_PAGE && t.name==='tab-1') return !clPendingCount.value ? '' : clPendingCount.value > 99 ? '99+' : String(clPendingCount.value);
      if(pageId.value===YS_PAGE && t.name==='tab-1') return !ysPendingCount.value ? '' : ysPendingCount.value > 99 ? '99+' : String(ysPendingCount.value);
      if(pageId.value===IA_EXEC && t.name==='tab-1'){
        const n = iaePendingCount.value;
        return !n ? '' : n > 99 ? '99+' : String(n);
      }
      if(isAuditPage()){
        storeTick.value;
        const n = eaList(t.name==='tab-2' ? 'tab-2' : 'tab-1').length;
        return !n ? '' : n > 99 ? '99+' : String(n);
      }
      if(pageId.value===IA_RECT && t.name==='tab-1'){
        const n = iarPendingCount.value;
        return !n ? '' : n > 99 ? '99+' : String(n);
      }
      if(pageId.value!==CIP_PAGE || t.name!=='tab-1' || !cipPendingCount.value) return '';
      return cipPendingCount.value > 99 ? '99+' : String(cipPendingCount.value);
    }
    /** 处理弹窗（改进处理 / 变更处理 / 抱怨处理共用）：上方只读信息 + 处理字段；未传 fields 时为「处理说明（必填）+ 处理附件」 */
    const procDlg = reactive({ visible:false, title:'', row:null, keys:[], full:[], fields:[], descLabel:'', fileLabel:'', placeholder:'', onSubmit:null });
    const procForm = reactive({ values:{}, files:[] });
    function openProcDlg(opts, row){
      const fields = opts.fields || [
        { name:opts.descLabel, type:'textarea', required:true, placeholder:opts.placeholder },
        { name:opts.fileLabel, type:'upload' },
      ];
      procForm.values = {};
      procForm.files = [];
      Object.assign(procDlg, opts, { fields, row, visible:true, okText: opts.okText || '提交' });
    }
