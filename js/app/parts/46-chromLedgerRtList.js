    function chromLedgerRtList(){
      const pid = pageId.value;
      const want = chromLedgerKindOf(pid);
      if(!want) return CHROM_LEDGER_RT_LIST.slice();
      storeTick.value;                                  // 规则增删改后随 storeTick 重算列
      const tab = String(activeTab.value || '').trim();
      const set = new Set();
      driftRowsOf().forEach(r=>{
        if(String(r['规则分类'] || '').trim().toUpperCase() !== want) return;
        if(String(r['启用状态'] || '启用') !== '启用') return;
        const tabInfo = chromLedgerTabsOfRule(r);
        if(tab && tabInfo.tabs.length && !tabInfo.tabs.includes(tab)) return;
        (Array.isArray(r._impurities) ? r._impurities : []).forEach(x=>{
          const tr = driftNum(x && x['典型保留时间']);
          if(tr != null) set.add(tr.toFixed(3));
        });
      });
      const arr = Array.from(set).sort((a, b)=> Number(a) - Number(b));
      return arr.length ? arr : CHROM_LEDGER_RT_LIST.slice();
    }
    // 表头用：典型保留时间 → 定性结构（取「启用 + 规则分类匹配」规则的 _impurities，先到先得）
    function chromLedgerRtStructureMap(){
      const want = chromLedgerKindOf(pageId.value);
      if(!want) return {};
      storeTick.value;
      const map = {};
      driftRowsOf().forEach(r=>{
        if(String(r['启用状态'] || '启用') !== '启用') return;
        if(String(r['规则分类'] || '').trim().toUpperCase() !== want) return;
        (Array.isArray(r._impurities) ? r._impurities : []).forEach(x=>{
          const tr = driftNum(x && x['典型保留时间']);
          if(tr == null) return;
          const key = tr.toFixed(3);
          const st = String((x && x['定性结构']) || '').trim();
          if(!(key in map) || (!map[key] && st)) map[key] = st;
        });
      });
      return map;
    }
    // 关联查询：勾选行 → 跳转谱图识别（单列表），按批号过滤
    function chromLedgerRelQuery(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r['批号']).filter(Boolean))];
      loadPage(SPI_PAGE);
      setTimeout(()=>{
        resetQueryModel();
        query['批号'] = nos.join('、');
        pageNum.value = 1;
        ElMessage.success('已跳转谱图识别，按所选 '+nos.length+' 个批号过滤');
      }, 0);
    }
    function onChromLedgerToolbar(btn){
      if(btn.name==='关联查询'){ chromLedgerRelQuery(); return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      return false;
    }
    // 行操作：编辑（批号只读）/ 删除
    const chromLedgerEditVisible = ref(false);
    const chromLedgerEditForm = reactive({ 批号:'', 杂质个数:0, 新杂个数:0, 是否存在新杂:'否', 杂质偏差结论:'正常' });
    let chromLedgerEditId = '';
    function openChromLedgerEdit(row){
      chromLedgerEditId = row.id;
      Object.assign(chromLedgerEditForm, {
        批号: row['批号'], 杂质个数: row['杂质个数'], 新杂个数: row['新杂个数'],
        是否存在新杂: row['是否存在新杂'], 杂质偏差结论: row['杂质偏差结论']
      });
      chromLedgerEditVisible.value = true;
    }
    function saveChromLedgerEdit(){
      const bag = MOCK[pageId.value] = MOCK[pageId.value] || {};
      const tab = (tabView.value||{}).name || 'main';
      const cur = (bag[tab]||[]).find(r=> r.id===chromLedgerEditId);
      if(cur){
        cur['杂质个数'] = Number(chromLedgerEditForm.杂质个数)||0;
        cur['新杂个数'] = Number(chromLedgerEditForm.新杂个数)||0;
        cur['是否存在新杂'] = chromLedgerEditForm.是否存在新杂;
        cur['杂质偏差结论'] = chromLedgerEditForm.杂质偏差结论;
        bumpStore();
      }
      chromLedgerEditVisible.value = false;
      ElMessage.success('台账数据已保存');
    }
    // 左侧分类 · 新增分类（规则编号 + 物料 + 色谱柱型号）
    const chromCatAddVisible = ref(false);
    const chromCatAddForm = reactive({ 规则编码:'', 规则名称:'', 物料编码:'', 物料名称:'', 物料规格:'', 色谱柱型号:'' });
    const chromCatMatOptions = computed(()=>{
      const code = String(chromCatAddForm.规则编码 || '').trim();
      if(!code) return [];
      const rule = driftRowsOf().find(r=> String(r['规则编码'] || '') === code);
      if(!rule) return [];
      const matList = ((MOCK['mat-list'] || {}).main) || [];
      const out = [];
      (Array.isArray(rule._mats) ? rule._mats : []).forEach(m=>{
        const c = String((m || {})['物料编码'] || '').trim();
        if(!c || out.some(x=> x.code === c)) return;
        const master = matList.find(r=> String(r['物料编码'] || '') === c) || {};
        out.push({
          code: c,
          name: String(m['物料名称'] || master['物料名称'] || '').trim(),
          spec: String(master['物料规格'] || '').trim(),
        });
      });
      return out;
    });
    const chromCatColOptions = computed(()=> driftColTypeOptions());
    function openChromCatAdd(){
      if(!isChromLedgerPage()) return;
      Object.assign(chromCatAddForm, { 规则编码:'', 规则名称:'', 物料编码:'', 物料名称:'', 物料规格:'', 色谱柱型号:'' });
      chromCatAddVisible.value = true;
    }
    function clearChromCatRule(){
      Object.assign(chromCatAddForm, { 规则编码:'', 规则名称:'', 物料编码:'', 物料名称:'', 物料规格:'', 色谱柱型号:'' });
    }
    function openChromCatDriftPick(){
      openIoPick('chromDriftRule', 'chromCat', '漂移规则编号');
    }
    function applyChromCatDriftPick(row){
      if(!row) return;
      const code = String(row['规则编码'] || '').trim();
      chromCatAddForm.规则编码 = code;
      chromCatAddForm.规则名称 = String(row['规则名称'] || '').trim();
      chromCatAddForm.物料编码 = '';
      chromCatAddForm.物料名称 = '';
      chromCatAddForm.物料规格 = '';
      chromCatAddForm.色谱柱型号 = '';
    }
    function onChromCatMatChange(code){
      const hit = chromCatMatOptions.value.find(m=> m.code === code);
      chromCatAddForm.物料名称 = hit ? (hit.name || '') : '';
      chromCatAddForm.物料规格 = hit ? (hit.spec || '') : '';
    }
    function saveChromCatAdd(){
      const ruleCode = String(chromCatAddForm.规则编码 || '').trim();
      const mat = String(chromCatAddForm.物料编码 || '').trim();
      const model = String(chromCatAddForm.色谱柱型号 || '').trim();
      if(!ruleCode){ ElMessage.warning('请选择漂移规则编号'); return; }
      if(!mat){ ElMessage.warning('请选择物料编码'); return; }
      const tab = String(activeTab.value || '').trim();
      const pid = pageId.value;
      const exists = chromLedgerDerivedTypes(pid, tab).some(t=>
        String(t.ruleCode || '') === ruleCode
        && String(t.物料编码 || '') === mat
        && String(t.色谱柱型号 || '') === model
      ) || chromLedgerManualCats(pid, tab).some(t=>
        String(t.ruleCode || '') === ruleCode
        && String(t.物料编码 || '') === mat
        && String(t.色谱柱型号 || '') === model
      );
      if(exists){ ElMessage.warning('「规则 + 物料 + 色谱柱型号」组合已存在'); return; }
      // 同页签下同物料/型号分类节点已存在时不再重复挂树（规则不同也共用同一节点）
      const sameNode = chromLedgerDerivedTypes(pid, tab).some(t=>
        String(t.物料编码 || '') === mat && String(t.色谱柱型号 || '') === model
      );
      if(sameNode){ ElMessage.warning('左侧已存在分类「' + (model ? (mat + '/' + model) : mat) + '」'); return; }
      const bag = (MOCK[pid] = MOCK[pid] || {});
      const list = (bag.manualCats = Array.isArray(bag.manualCats) ? bag.manualCats : []);
      list.push({
        id: 'rtcat::' + mat + '::' + model,
        tab,
        物料编码: mat,
        物料名称: chromCatAddForm.物料名称 || '',
        物料规格: chromCatAddForm.物料规格 || '',
        色谱柱型号: model,
        名称: model ? (mat + '/' + model) : mat,
        ruleCode,
        ruleName: chromCatAddForm.规则名称 || '',
      });
      bumpStore();
      chromCatAddVisible.value = false;
      ElMessage.success('已新增分类「' + (model ? (mat + '/' + model) : mat) + '」');
    }
    function onChromLedgerRowOp(op, row){
      if(op.name==='编辑'){ openChromLedgerEdit(row); return true; }
      if(op.name==='删除'){
        ElementPlus.ElMessageBox.confirm('确认删除台账数据 '+row['批号']+'？','删除确认',{
          confirmButtonText:'确认删除', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const bag = MOCK[pageId.value] = MOCK[pageId.value] || {};
          const tab = (tabView.value||{}).name || 'main';
          bag[tab] = (bag[tab]||[]).filter(r=> r.id!==row.id);
          selectedIds.value = selectedIds.value.filter(id=> id!==row.id);
          bumpStore();
          ElMessage.success('台账数据已删除');
        }).catch(()=>{});
        return true;
      }
      return false;
    }

    /** 持续改进：提案主单；关闭 / 删除 / 编辑联动子级「改进处理」中同提案编号的数据 */
    const CI_PAGE = 'np-0209-01', CI_SUB_PAGE = 'np-0209-02';
    const CI_OPERATOR = '张三';
    const CI_DEPTS = ['产品部','生产部','质量管理部','研发中心','设备部','仓储物流部','安环部'];
    const CI_USERS = [
      { 工号:'U1001', 姓名:'张三', 部门:['产品部'] },
      { 工号:'U1002', 姓名:'李四', 部门:['生产部'] },
      { 工号:'U1003', 姓名:'王五', 部门:['质量管理部'] },
      { 工号:'U1004', 姓名:'赵敏', 部门:['研发中心','产品部'] },
      { 工号:'U1005', 姓名:'陈晨', 部门:['生产部'] },
      { 工号:'U1006', 姓名:'刘洋', 部门:['设备部'] },
      { 工号:'U1007', 姓名:'周倩', 部门:['质量管理部'] },
      { 工号:'U1008', 姓名:'孙浩', 部门:['仓储物流部'] },
      { 工号:'U1009', 姓名:'郑宇航', 部门:['安环部','生产部'] },
    ];
    const CI_MULTI = ['小组成员','责任部门'];
    const CI_REQUIRED = ['提案编号','提案人','提案部门','提案日期','持续改进项目','现有状况描述','改进后状况和改进目标','小组组长','小组成员','责任部门'];
    const CI_FIELDS = [...CI_REQUIRED, '备注'];
    function ciRows(){ return ((MOCK[CI_PAGE] = MOCK[CI_PAGE] || { main: [] }).main = (MOCK[CI_PAGE].main || [])); }
    function ciSubEach(fn){
      const bag = MOCK[CI_SUB_PAGE];
      if(!bag || typeof bag!=='object') return;
      Object.keys(bag).forEach(k=>{ if(Array.isArray(bag[k])) fn(bag, k); });
    }
    function ciSubPrune(pred){ ciSubEach((bag, k)=>{ bag[k] = bag[k].filter(r=> !pred(r)); }); }
    function nextCiNo(){
      const max = ciRows().reduce((m, r)=> Math.max(m, parseInt(String(r['提案编号']||'').replace(/\D/g,''), 10) || 0), 0);
      return String(max + 1).padStart(6, '0');
    }
    function ciDeptsOf(name){ const u = CI_USERS.find(x=> x.姓名===name); return u ? u.部门 : CI_DEPTS; }
    function ciFormOptions(f){
      if(['提案人','小组组长','小组成员'].includes(f.name)) return CI_USERS.map(u=> ({ value:u.姓名, label:u.工号+' / '+u.姓名 }));
      if(f.name==='提案部门') return ciDeptsOf(formModel['提案人']).map(d=> ({ value:d, label:d }));
      if(f.name==='责任部门') return CI_DEPTS.map(d=> ({ value:d, label:d }));
      return null;
    }
    function onCiProposerChange(){
      const ds = ciDeptsOf(formModel['提案人']);
      formModel['提案部门'] = ds.length===1 ? ds[0] : (ds.includes(formModel['提案部门']) ? formModel['提案部门'] : '');
    }
    function openCiForm(mode, row){
      if(mode==='edit' && (row||{})['改进状态']!=='待发起'){ ElMessage.warning('仅待发起状态可编辑'); return; }
      openForm(mode);
      if(mode==='edit'){
        CI_FIELDS.forEach(k=>{ formModel[k] = CI_MULTI.includes(k) ? splitDun(row[k]) : (row[k]==='—' ? '' : (row[k]||'')); });
        formModel._editId = row.id;
        return;
      }
      Object.assign(formModel, { 提案编号: nextCiNo(), 提案人: CI_OPERATOR, 提案日期: nowStamp().slice(0,10), 小组成员: [], 责任部门: [] });
      onCiProposerChange();
    }
    function saveCiForm(){
      const miss = CI_REQUIRED.find(k=> CI_MULTI.includes(k) ? !(formModel[k]||[]).length : !String(formModel[k]||'').trim());
      if(miss){ ElMessage.warning((CI_MULTI.includes(miss) || ['提案人','提案部门','提案日期','小组组长'].includes(miss) ? '请选择' : '请输入') + miss); return; }
      const list = ciRows();
      const no = String(formModel['提案编号']).trim();
      if(list.some(r=> r['提案编号']===no && r.id!==formModel._editId)){ ElMessage.warning('提案编号已存在，请刷新后重新生成'); return; }
      const payload = {};
      CI_FIELDS.forEach(k=>{ payload[k] = CI_MULTI.includes(k) ? formModel[k].join('、') : String(formModel[k]||'').trim(); });
      if(formMode.value==='add'){
        list.unshift({ id:'ci-'+Date.now(), 改进状态:'待发起', ...payload, 创建时间: nowStamp(), 创建人: CI_OPERATOR });
        ElMessage.success('持续改进已新增');
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑的数据'); return; }
        if(cur['改进状态']!=='待发起'){ ElMessage.warning('仅待发起状态可编辑'); return; }
        Object.assign(cur, payload);
        ciSubEach((bag, k)=> bag[k].forEach(r=>{
          if(r['提案编号']!==cur['提案编号']) return;
          CI_FIELDS.forEach(f=>{ if(f!=='责任部门' && f in r) r[f] = cur[f]; });
        }));
        ciSyncStatus(cur);
        ElMessage.success('已保存，改进处理内的数据已同步修改');
      }
      formVisible.value = false;
      bumpStore();
    }
    const canCloseCi = computed(()=>{
      if(pageId.value!==CI_PAGE || !selectedIds.value.length) return false;
      const ids = new Set(selectedIds.value);
      const rows = ciRows().filter(r=> ids.has(r.id));
      return rows.length>0 && rows.every(r=> r['改进状态']==='待发起');
    });
    const canDeleteCi = computed(()=>{
      if(pageId.value!==CI_PAGE || !selectedIds.value.length) return false;
      const ids = new Set(selectedIds.value);
      const rows = ciRows().filter(r=> ids.has(r.id));
      return rows.length>0 && rows.every(r=> r['改进状态']==='待发起' || r['改进状态']==='已关闭');
    });
    function confirmCiLaunch(row){
      const cur = ciRows().find(r=> r.id===(row||{}).id);
      if(!cur){ ElMessage.warning('未找到要确认发起的数据'); return; }
      if(cur['改进状态']!=='待发起'){ ElMessage.warning('仅待发起状态可确认发起'); return; }
      const no = cur['提案编号'] || '';
      ElementPlus.ElMessageBox.confirm('确认对提案「'+no+'」发起？发起后改进状态变为执行中。', '确认发起', { type:'warning' }).then(()=>{
        cur['改进状态'] = '执行中';
        ciSyncStatus(cur);
        bumpStore();
        ElMessage.success('提案「'+no+'」已确认发起，改进状态为执行中');
      }).catch(()=>{});
    }
    function closeCiRows(){
      const ids = new Set(selectedIds.value);
      const rows = ciRows().filter(r=> ids.has(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(!canCloseCi.value){ ElMessage.warning('仅改进状态为「待发起」的数据可关闭'); return; }
      ElementPlus.ElMessageBox.confirm('确认关闭所选的 '+rows.length+' 条持续改进？关闭后改进处理内未完成的数据将全部自动删除。', '关闭', { type:'warning' }).then(()=>{
        const nos = new Set(rows.map(r=> r['提案编号']));
        rows.forEach(r=>{ r['改进状态'] = '已关闭'; });
        ciSubPrune(r=> nos.has(r['提案编号']) && r['处理状态']!=='已完成');
        selectedIds.value = []; bumpStore();
        ElMessage.success('已关闭 '+rows.length+' 条持续改进');
      }).catch(()=>{});
    }
    function deleteCiRows(){
      const ids = new Set(selectedIds.value);
      if(!ids.size){ ElMessage.warning('请先勾选要删除的数据'); return; }
      if(!canDeleteCi.value){ ElMessage.warning('仅改进状态为「待发起」或「已关闭」的数据可批量删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条持续改进？改进处理内对应的数据将一并删除。', '批量删除', { type:'warning' }).then(()=>{
        const list = ciRows();
        const nos = new Set(list.filter(r=> ids.has(r.id)).map(r=> r['提案编号']));
        MOCK[CI_PAGE].main = list.filter(r=> !ids.has(r.id));
        ciSubPrune(r=> nos.has(r['提案编号']));
        selectedIds.value = []; bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条数据');
      }).catch(()=>{});
    }
    function ciRelQuery(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = rows.map(r=> r['提案编号']);
      const set = new Set(nos);
      const toDone = !cipPendingRows().some(r=> set.has(r['提案编号'])) && cipDoneList().some(r=> set.has(r['提案编号']));
      loadPage(CI_SUB_PAGE);
      setTimeout(()=>{
        if(toDone) activeTab.value = 'tab-2';
        query['提案编号'] = nos.join('、');
        pageNum.value = 1;
        ElMessage.success('已跳转改进处理'+(toDone ? '「已完成」' : '')+'，按所选 '+nos.length+' 个提案编号过滤');
      }, 0);
    }
    function ciQueryRows(list, containsKeys, exactKeys, dateKeys){
      const nos = splitDun(query['提案编号']);
      if(nos.length>1){
        const set = new Set(nos);
        list = list.filter(r=> set.has(r['提案编号']));
        containsKeys = containsKeys.filter(k=> k!=='提案编号');
      }
      list = applyContainsExactQuery(list, query, containsKeys, exactKeys);
      dateKeys.forEach(k=>{ list = applyDateRangeQuery(list, query, k); });
      return list;
    }
    /** 内审计划：关闭仅执行中；删除同步去掉内审实施同单号数据；编辑同步修改内审实施 */
    const IA_PAGE = 'np-0211-01', IA_EXEC = 'np-0211-03', IA_RECT = 'np-0211-04';
    const IA_FIELDS = ['内审单号','内审年度','审核日期','审核目的','审核准则','审核范围','审核组成员','审核附件','备注'];
    const IA_REQUIRED = ['内审单号','内审年度','审核目的'];
    const IA_MULTI = ['审核组成员'];
    const IA_SYNC = ['内审年度','审核日期','审核目的','审核准则','审核范围','审核组成员','备注','审核附件'];
    function iaRows(){ return ((MOCK[IA_PAGE] = MOCK[IA_PAGE] || { main: [] }).main = (MOCK[IA_PAGE].main || [])); }
    function iaEach(pid, fn){
      const bag = MOCK[pid];
      if(!bag || typeof bag!=='object') return;
      Object.keys(bag).forEach(k=>{ if(Array.isArray(bag[k])) bag[k].forEach(fn); });
    }
    function iaBagRows(pid){
      const out = [];
      iaEach(pid, r=> out.push(r));
      return out;
    }
    function iaPrune(pid, pred){
      const bag = MOCK[pid];
      if(!bag || typeof bag!=='object') return;
      Object.keys(bag).forEach(k=>{ if(Array.isArray(bag[k])) bag[k] = bag[k].filter(r=> !pred(r)); });
    }
    function nextIaNo(){
      const max = iaRows().reduce((m, r)=> Math.max(m, parseInt(String(r['内审单号']||'').replace(/\D/g,''), 10) || 0), 0);
      return String(max + 1).padStart(6, '0');
    }
    function iaFormOptions(f){
      if(f.name==='审核组成员') return CI_USERS.map(u=> ({ value:u.姓名, label:u.工号+' / '+u.姓名 }));
      return null;
    }
    function iaQueryRows(list){
      const nos = splitDun(query['内审单号']);
      if(nos.length>1){
        const set = new Set(nos);
        list = list.filter(r=> set.has(r['内审单号']));
      }
      list = applyContainsExactQuery(list, nos.length>1 ? Object.assign({}, query, { 内审单号:'' }) : query, ['内审单号','审核目的','审核组成员','创建人'], ['内审状态','内审年度']);
      ['审核日期','创建时间'].forEach(k=>{ list = applyDateRangeQuery(list, query, k); });
      return list;
    }
    function openIaForm(mode, row){
      openForm(mode==='copy' ? 'add' : mode);
      if(mode==='edit'){
        IA_FIELDS.forEach(k=>{ formModel[k] = IA_MULTI.includes(k) ? splitDun(row[k]) : (row[k]==='—' ? '' : (row[k]||'')); });
        formModel._editId = row.id;
        return;
      }
      const year = new Date().getFullYear()+'年';
      if(mode==='copy' && row){
        IA_FIELDS.forEach(k=>{ formModel[k] = IA_MULTI.includes(k) ? splitDun(row[k]) : (row[k]==='—' ? '' : (row[k]||'')); });
        formModel['内审单号'] = nextIaNo();
        delete formModel._editId;
        return;
      }
      Object.assign(formModel, { 内审单号: nextIaNo(), 内审年度: year, 审核日期:'', 审核目的:'', 审核准则:'', 审核范围:'', 审核组成员:[], 审核附件:'', 备注:'' });
    }
    function saveIaForm(){
      const miss = IA_REQUIRED.find(k=> IA_MULTI.includes(k) ? !(formModel[k]||[]).length : !String(formModel[k]||'').trim());
      if(miss){ ElMessage.warning((miss==='审核目的' ? '请输入' : '请选择')+miss); return; }
      const list = iaRows();
      const no = String(formModel['内审单号']).trim();
      if(!/^\d{6}$/.test(no)){ ElMessage.warning('内审单号须为 6 位数字流水'); return; }
      if(list.some(r=> r['内审单号']===no && r.id!==formModel._editId)){ ElMessage.warning('内审单号已存在，请刷新后重新生成'); return; }
      const payload = {};
      IA_FIELDS.forEach(k=>{ payload[k] = IA_MULTI.includes(k) ? (formModel[k]||[]).filter(Boolean).join('、') : String(formModel[k]||'').trim(); });
      if(formMode.value==='add'){
        list.unshift({ id:'ia-'+Date.now(), 内审状态:'执行中', ...payload, 创建时间: nowStamp(), 创建人: CI_OPERATOR });
        ElMessage.success('内审计划已新增');
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑的数据'); return; }
        Object.assign(cur, payload);
        iaEach(IA_EXEC, r=>{
          if(r['内审单号']!==cur['内审单号']) return;
          IA_SYNC.forEach(f=>{ r[f] = cur[f]; });
        });
        ElMessage.success('已保存，内审实施内同单号数据已同步修改');
      }
      formVisible.value = false;
      bumpStore();
    }
    const canCloseIa = computed(()=>{
      if(pageId.value!==IA_PAGE || !selectedIds.value.length) return false;
      const ids = new Set(selectedIds.value);
      return iaRows().filter(r=> ids.has(r.id)).every(r=> r['内审状态']==='执行中');
    });
    function closeIaRows(){
      const ids = new Set(selectedIds.value);
      const rows = iaRows().filter(r=> ids.has(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(!canCloseIa.value){ ElMessage.warning('仅内审状态为「执行中」的数据可关闭'); return; }
      ElementPlus.ElMessageBox.confirm('确认关闭所选的 '+rows.length+' 条内审计划？关闭后状态将更改为已关闭。', '关闭', { type:'warning' }).then(()=>{
        rows.forEach(r=>{ r['内审状态'] = '已关闭'; });
        selectedIds.value = []; bumpStore();
        ElMessage.success('已关闭 '+rows.length+' 条内审计划');
      }).catch(()=>{});
    }
    function deleteIaRows(){
      const ids = new Set(selectedIds.value);
      if(!ids.size){ ElMessage.warning('请先勾选要删除的数据'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条内审计划？内审实施内同单号数据将一并删除。', '批量删除', { type:'warning' }).then(()=>{
        const list = iaRows();
        const nos = new Set(list.filter(r=> ids.has(r.id)).map(r=> r['内审单号']));
        MOCK[IA_PAGE].main = list.filter(r=> !ids.has(r.id));
        iaPrune(IA_EXEC, r=> nos.has(r['内审单号']));
        selectedIds.value = []; bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条数据');
      }).catch(()=>{});
    }
