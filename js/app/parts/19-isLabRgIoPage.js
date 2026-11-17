    function isLabRgIoPage(){ return !!LAB_IO_PAGES[pageId.value]; }
    function labRgIoDir(){ return (LAB_IO_PAGES[pageId.value]||{}).dir || '入库'; }
    function labRgIoMat(){ return (LAB_IO_PAGES[pageId.value]||{}).mat || '试剂'; }
    const LAB_IO_FORM_FIELDS = {
      '试剂入库检查表':['外包装是否完好','标签是否清晰','有效期是否合格','存储条件','检查结论'],
      '试剂出库检查表':['领用人','领用用途','剩余有效期是否满足','检查结论'],
      '试液入库检查表':['标签信息是否完整','浓度标识','配制 / 标定记录是否齐全','检查结论'],
      '试液出库检查表':['领用人','领用用途','是否在有效期内','检查结论'],
      '标准物质入库验收表':['证书是否齐全','包装是否完好','存储温度（℃）','验收结论'],
      '留样入库检查表':['样品外观','封口是否完好','留样位置','检查结论'],
      '留样销毁记录表':['销毁方式','监销人','销毁时间','销毁结论'],
      '耗材入库验收表':['包装是否完好','规格是否一致','数量是否一致','验收结论'],
      '标准物质开封记录表':['开封日期','包装是否完好','外观是否正常','开封后失效日期','检查结论'],
    };
    const labJobVisible = ref(false);
    const labJobRow = ref(null);
    const labJobCols = ref([]);
    const labJobForm = computed(()=>{
      storeTick.value;
      const row = labJobRow.value;
      if(!row) return null;
      const doc = labRgIoMat() + labRgIoDir();
      const tpl = (((MOCK['lab-io-form']||{}).main)||[]).find(t=> t['启用状态']==='启用' && t['适用业务单据']===doc
        && splitDun(t['适用单据类型']).includes(row['单据类型']));
      if(!tpl) return null;
      const formName = tpl['表单名称'];
      const fields = LAB_IO_FORM_FIELDS[formName] || ['检查内容','检查结论'];
      const job = row._job || {};
      const blocks = (job.procs && job.procs.length)
        ? job.procs.filter(p=> (p.records||[]).length).map(p=>({ proc:p.name, records:p.records }))
        : ((job.records||[]).length ? [{ proc:'', records:job.records }] : []);
      return { formName, fields, blocks };
    });
    function openLabIoJob(row){
      labJobRow.value = row;
      labJobCols.value = (tabView.value.columns||[]).filter(c=> c.field && c.field!=='_actions');
      labJobVisible.value = true;
    }
    function labRgIoNoKey(){ return labRgIoDir() + '单号'; }
    function labRgIoQtyKey(){ return labRgIoDir() + '数量'; }
    function labRgIoOrderRows(){
      const pid = pageId.value;
      return ((MOCK[pid] = MOCK[pid] || { 'tab-1': [], 'tab-2': [] })['tab-1'] = (MOCK[pid]['tab-1'] || []));
    }
    function labRgIoFlowRows(){
      const pid = pageId.value;
      return ((MOCK[pid] = MOCK[pid] || { 'tab-1': [], 'tab-2': [] })['tab-2'] = (MOCK[pid]['tab-2'] || []));
    }
    function nextLabRgIoNo(){
      const key = labRgIoNoKey();
      let max = 0;
      labRgIoOrderRows().forEach(r=>{
        const n = parseInt(String(r[key]||'').replace(/\D/g,''), 10);
        if(Number.isFinite(n)) max = Math.max(max, n);
      });
      return String(max+1).padStart(6,'0');
    }
    function sumLabRgIoDoneQty(orderNo){
      const noKey = labRgIoNoKey(), qtyKey = labRgIoQtyKey();
      return labRgIoFlowRows().filter(r=> r[noKey]===orderNo && r['流水状态']==='已完成')
        .reduce((s,r)=> s + (parseFloat(r[qtyKey])||0), 0);
    }
    function enrichLabRgIoOrder(r){
      const next = Object.assign({}, r);
      next['已完成数量'] = String(sumLabRgIoDoneQty(next[labRgIoNoKey()]));
      return next;
    }
    function linkLabRgIoQuery(){
      const noKey = labRgIoNoKey();
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r[noKey]).filter(Boolean))];
      const toTab = activeTab.value==='tab-1' ? 'tab-2' : 'tab-1';
      labStockDrillPending = { [noKey]: nos.join('、') };
      activeTab.value = toTab;
      onTabChange();
    }
    function closeLabRgIoOrders(){
      const noKey = labRgIoNoKey(), dir = labRgIoDir();
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !['待执行','执行中'].includes(r['单据状态']))){
        ElMessage.warning('请勾选待执行或执行中的'+dir+'单后再关闭'); return;
      }
      ElementPlus.ElMessageBox.confirm('确认关闭所选'+dir+'单？关联执行中的'+dir+'流水将同步关闭。','关闭确认',{
        confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
      }).then(()=>{
        const nos = new Set(rows.map(r=> r[noKey]));
        labRgIoOrderRows().forEach(r=>{ if(nos.has(r[noKey])) r['单据状态']='已关闭'; });
        labRgIoFlowRows().forEach(r=>{
          if(nos.has(r[noKey]) && r['流水状态']==='执行中') r['流水状态']='已关闭';
        });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('所选'+dir+'单已关闭，关联执行中流水已同步关闭');
      }).catch(()=>{});
    }
    function deleteLabRgIoOrders(){
      const noKey = labRgIoNoKey(), dir = labRgIoDir(), pid = pageId.value;
      const ids = new Set(selectedIds.value||[]);
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      const rows = labRgIoOrderRows().filter(r=> ids.has(r.id));
      if(rows.some(r=> r['单据状态']!=='待执行')){
        ElMessage.warning('仅待执行状态的'+dir+'单可删除'); return;
      }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条'+dir+'单？','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        const nos = new Set(rows.map(r=> r[noKey]));
        MOCK[pid]['tab-1'] = labRgIoOrderRows().filter(r=> !ids.has(r.id));
        MOCK[pid]['tab-2'] = labRgIoFlowRows().filter(r=> !nos.has(r[noKey]));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条'+dir+'单');
      }).catch(()=>{});
    }
    function saveLabRgIoForm(){
      const noKey = labRgIoNoKey(), dir = labRgIoDir();
      if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
      const no = String(formModel[noKey]||'').trim() || nextLabRgIoNo();
      const list = labRgIoOrderRows();
      if(list.some(r=> r[noKey]===no && r.id!==formModel._editId)){
        ElMessage.warning(noKey+'已存在，请刷新后重试'); return;
      }
      const payload = {
        单据状态: '待执行',
        [noKey]: no,
        单据类型: formModel['单据类型']||'',
        备注: formModel['备注']||'—',
        已完成数量: '0'
      };
      if(formMode.value==='add' || formMode.value==='copy'){
        payload.id = (LAB_IO_PAGES[pageId.value]||{}).prefix + '-' + Date.now();
        payload['制单人'] = '张三';
        payload['制单时间'] = nowStamp();
        list.unshift(payload);
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑'+dir+'单'); return; }
        if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅待执行状态的'+dir+'单可编辑'); return; }
        Object.assign(cur, payload, {
          id: cur.id, 制单人: cur['制单人'], 制单时间: cur['制单时间'], 单据状态: cur['单据状态']
        });
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(formMode.value==='edit' ? (dir+'单已保存') : '单据提交成功，状态为待执行');
    }
    function nextQrIssueNo(){
      const bag = (window.WMS_MOCK_ROWS || MOCK)['qr-issue'] || {};
      const list = Array.isArray(bag['tab-issue']) ? bag['tab-issue'] : [];
      let max = 0;
      list.forEach(r=>{
        const m = String(r['开具单号']||'').match(/BG(\d+)/i);
        if(m) max = Math.max(max, parseInt(m[1], 10)||0);
      });
      const cur = String(formModel['开具单号']||'').match(/BG(\d+)/i);
      if(cur) max = Math.max(max, parseInt(cur[1], 10)||0);
      return 'BG' + String(max+1).padStart(9,'0');
    }
    function onFormFieldRefresh(f){
      if(csPage() && csPage().onRefresh(f)) return;
      if(pageId.value==='qr-issue' && f && f.name==='开具单号'){
        formModel['开具单号'] = nextQrIssueNo();
        ElMessage.success('已刷新开具单号');
        return;
      }
      if(pageId.value===WJ_ORDER && f && f.name==='外校单号'){
        formModel['外校单号'] = nextWjNo();
        ElMessage.success('已刷新外校单号');
        return;
      }
      if(pageId.value===WX_PAGE && f && f.name==='维修单号'){
        formModel['维修单号'] = nextWxNo();
        ElMessage.success('已刷新维修单号');
        return;
      }
      if(pageId.value===CHG_PAGE && f && f.name==='变更编号'){
        formModel['变更编号'] = nextChgNo();
        ElMessage.success('已刷新变更编号');
        return;
      }
      if(pageId.value===HM_ARCH_PAGE && f && f.name==='标准编号'){
        if(formMode.value==='edit'){ ElMessage.warning('编辑时不可刷新标准编号'); return; }
        formModel['标准编号'] = hmNextArchNo();
        ElMessage.success('已刷新标准编号');
        return;
      }
      if((pageId.value===HM_IMP_PAGE || pageId.value===HM_VOID_PAGE || pageId.value===HM_CHG_PAGE) && f && f.name==='申请单号'){
        if(formMode.value==='edit'){ ElMessage.warning('编辑时不可刷新申请单号'); return; }
        formModel['申请单号'] = pageId.value===HM_VOID_PAGE ? hmNextVoidNo() : pageId.value===HM_CHG_PAGE ? hmNextChgNo() : hmNextApplyNo();
        ElMessage.success('已刷新申请单号');
        return;
      }
      if(pageId.value===HM_IMP_PAGE && f && f.name==='文件编号'){
        formModel['文件编号'] = hmNextFileNo();
        ElMessage.success('已刷新文件编号');
        return;
      }
      if(pageId.value===CI_PAGE && f && f.name==='提案编号'){
        formModel['提案编号'] = nextCiNo();
        ElMessage.success('已刷新提案编号');
        return;
      }
      if(pageId.value==='np-0201-01' && f && f.name==='放行单号'){
        if(formMode.value==='edit'){ ElMessage.warning('编辑时不可刷新放行单号'); return; }
        formModel['放行单号'] = qcNextNo(qcAllRows('np-0201-01'), '放行单号', 'WJ');
        ElMessage.success('已刷新放行单号');
        return;
      }
      if(isAuditPage() && f && f.name===auditNoKey()){
        if(formMode.value==='edit'){ ElMessage.warning('编辑时不可刷新'+auditNoKey()); return; }
        formModel[auditNoKey()] = nextEaNo();
        ElMessage.success('已刷新'+auditNoKey());
        return;
      }
      if(pageId.value==='np-0211-04' && f && f.name==='内审整改单号'){
        if(formMode.value==='edit'){ ElMessage.warning('编辑时不可刷新内审整改单号'); return; }
        formModel['内审整改单号'] = nextIarNo();
        ElMessage.success('已刷新内审整改单号');
        return;
      }
      if(pageId.value===LAB_PREP && f && f.name==='配液单号'){
        formModel['配液单号'] = nextLabPrepNo();
        ElMessage.success('已刷新配液单号');
        return;
      }
      if(pageId.value===LAB_CALIB && f && f.name==='标定单号'){
        formModel['标定单号'] = nextLabCalibNo();
        ElMessage.success('已刷新标定单号');
        return;
      }
      if(!isLabRgIoPage() || !f || f.name!==labRgIoNoKey()) return;
      formModel[labRgIoNoKey()] = nextLabRgIoNo();
      ElMessage.success('已刷新'+labRgIoNoKey());
    }

    /** 实验室 · 试液管理 · 配液（配液流水＝配液计划中已完成的单据） */
    const LAB_PREP = 'np-0402-01';
    function labPrepRows(){
      return ((MOCK[LAB_PREP] = MOCK[LAB_PREP] || { 'tab-1': [], 'tab-2': [] })['tab-1'] = (MOCK[LAB_PREP]['tab-1'] || []));
    }
    function nextLabPrepNo(){
      let max = 0;
      labPrepRows().forEach(r=>{
        const n = parseInt(String(r['配液单号']||'').replace(/\D/g,''), 10);
        if(Number.isFinite(n)) max = Math.max(max, n);
      });
      return String(max+1).padStart(6,'0');
    }
    function labPrepSolution(code){ return (((MOCK['solution']||{}).main)||[]).find(r=> r['试液编码']===code) || null; }
    function labPrepTemplate(name){ return (((MOCK['prep-template']||{}).main)||[]).find(r=> r['配液模板名称']===name) || null; }
    function labPrepFilter(){
      const tab1 = activeTab.value==='tab-1';
      const has = (v, q)=> !String(q||'').trim() || String(v||'').includes(String(q).trim());
      const nos = splitDun(query['配液单号']);
      const list = labPrepRows().filter(r=>{
        if(!tab1 && r['单据状态']!=='已完成') return false;
        if(nos.length>1 ? !nos.includes(r['配液单号']) : !has(r['配液单号'], query['配液单号'])) return false;
        if(!has(r['试液信息'], query['试液信息']) || !has(r['批号'], query['批号'])) return false;
        if(tab1){
          if(query['单据状态'] && r['单据状态']!==query['单据状态']) return false;
          return has(r['制单人'], query['制单人']) && has(r['配液模板'], query['配液模板']);
        }
        return has(r['条码号'], query['条码号']) && has(r['提交人'], query['提交人']);
      });
      const key = tab1 ? '制单时间' : '提交时间';
      return list.slice().sort((a,b)=> String(b[key]||'').localeCompare(String(a[key]||'')));
    }
    function fillLabPrepSolution(r){
      formModel['试液信息'] = ioPickText('solution', r);
      formModel['计量单位'] = r['计量单位'] || '';
      formModel['有效期'] = r['有效期'] ? (r['有效期'] + ' ' + (r['有效期单位']||'')).trim() : '';
      formModel['配液模板'] = r['配液模板'] || '';
      if(!formModel['配液模板']) ElMessage.warning('该试液未维护配液模板，请先到试液列表维护');
    }
    function saveLabPrepForm(){
      const solText = String(formModel['试液信息']||'').trim();
      if(!solText){ ElMessage.warning('请选择试液信息'); return; }
      if(!formModel['配液模板']){ ElMessage.warning('该试液未维护配液模板，不可保存'); return; }
      const qty = String(formModel['计划数量']??'').trim();
      if(qty && !(/^\d+(\.\d+)?$/.test(qty) && parseFloat(qty) > 0)){ ElMessage.warning('计划数量须为大于 0 的数字'); return; }
      const lot = String(formModel['批号']||'').trim();
      if(!lot){ ElMessage.warning('请填写批号'); return; }
      const list = labPrepRows();
      const no = String(formModel['配液单号']||'').trim() || nextLabPrepNo();
      if(list.some(r=> r['配液单号']===no && r.id!==formModel._editId)){ ElMessage.warning('配液单号已存在，请刷新后重试'); return; }
      const code = solText.split(' / ')[0].trim();
      const sol = labPrepSolution(code);
      const payload = {
        配液单号: no, 试液信息: solText, 试液编码: code, 计划数量: qty,
        计量单位: formModel['计量单位']||'', 计划配液日期: formModel['计划配液日期']||'', 批号: lot,
        有效期: formModel['有效期']||'', 配液模板: formModel['配液模板']||'', 备注: String(formModel['备注']||'').trim()
      };
      if(sol){ payload._lifeN = String(sol['有效期']||''); payload._lifeU = sol['有效期单位']||''; }
      if(formMode.value==='edit'){
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑配液单'); return; }
        if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅待执行状态的配液单可编辑'); return; }
        Object.assign(cur, payload);
      } else {
        list.unshift({ id: 'prep-' + Date.now(), 单据状态: '待执行', ...payload, 制单时间: nowStamp(), 制单人: '张三' });
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(formMode.value==='edit' ? '配液单已保存' : '单据提交成功，状态为待执行');
    }
    /** 配液 / 标定共用：计划 Tab 与流水 Tab 按单号互跳、关闭、删除 */
    function labPlanPicked(){ return tableData.value.filter(r=> selectedIds.value.includes(r.id)); }
    function linkLabPlanQuery(noKey){
      const rows = labPlanPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      labStockDrillPending = { [noKey]: [...new Set(rows.map(r=> r[noKey]))].join('、') };
      activeTab.value = activeTab.value==='tab-1' ? 'tab-2' : 'tab-1';
      onTabChange();
    }
    function closeLabPlanOrders(kind){
      const rows = labPlanPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !['待执行','执行中'].includes(r['单据状态']))){ ElMessage.warning('请勾选待执行或执行中的'+kind+'后再关闭'); return; }
      ElementPlus.ElMessageBox.confirm('确认关闭所选'+kind+'？关闭后不可继续执行。','关闭确认',{
        confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
      }).then(()=>{
        rows.forEach(r=>{ r['单据状态'] = '已关闭'; });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('所选'+kind+'已关闭');
      }).catch(()=>{});
    }
    function deleteLabPlanOrders(pid, kind){
      const rows = labPlanPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !['待执行','执行中'].includes(r['单据状态']))){ ElMessage.warning('仅待执行或执行中的'+kind+'可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+rows.length+' 条'+kind+'？','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        MOCK[pid]['tab-1'] = (MOCK[pid]['tab-1']||[]).filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条'+kind);
      }).catch(()=>{});
    }
    const labPrepExecVisible = ref(false);
    const labPrepExecReadonly = ref(false);
    const labPrepExecRow = ref(null);
    const labPrepExec = reactive({ env:{}, dev:{}, lines:[], 实际配液数量:'', 提交备注:'' });
    const labPrepLineSel = ref([]);
    const labPrepReagentPick = ref('');
    const labPrepTpl = computed(()=> labPrepTemplate(labPrepExecRow.value?.['配液模板']));
    const labPrepEnvFields = computed(()=> labPrepTpl.value && labPrepTpl.value['是否记录环境']==='是' ? (labPrepTpl.value._envFields||[]) : []);
    const labPrepDevFields = computed(()=> labPrepTpl.value && labPrepTpl.value['是否记录设备']==='是' ? (labPrepTpl.value._devFields||[]) : []);
    const labPrepMethod = computed(()=>{
      const r = labPrepExecRow.value;
      if(!r) return '';
      const code = r['试液编码'] || String(r['试液信息']||'').split(' / ')[0];
      return (labPrepSolution(code)||{})['配液方法依据'] || '';
    });
    const labPrepHeadCols = computed(()=> ((tabView.value||{}).columns||[]).filter(c=> c.field!=='_actions'));
    const labPrepReagentOptions = computed(()=>{
      void storeTick.value;
      const added = new Set(labPrepExec.lines.map(l=> l['条码号']));
      return (((MOCK['reagent-arch']||{}).main)||[]).filter(r=> !added.has(r['条码号']));
    });
    function labPrepEnumOpts(f){ return String(f['枚举内容']||'').split(',').map(s=> s.trim()).filter(Boolean); }
    function openLabPrepExec(row, readonly){
      if(!readonly && !['待执行','执行中'].includes(row['单据状态'])){ ElMessage.warning('仅待执行或执行中的配液单可执行'); return; }
      const ex = JSON.parse(JSON.stringify(row._exec || {}));
      labPrepExecRow.value = row;
      labPrepExecReadonly.value = !!readonly;
      labPrepExec.env = ex.env || {};
      labPrepExec.dev = ex.dev || {};
      labPrepExec.lines = ex.lines || [];
      labPrepExec['实际配液数量'] = ex['实际配液数量'] || row['实际配液数量'] || '';
      labPrepExec['提交备注'] = ex['提交备注'] || row['提交备注'] || '';
      labPrepLineSel.value = [];
      labPrepReagentPick.value = '';
      labPrepExecVisible.value = true;
    }
    function addLabPrepLine(){
      const bc = labPrepReagentPick.value;
      if(!bc){ ElMessage.warning('请先选择试剂条码'); return; }
      if(labPrepExec.lines.some(l=> l['条码号']===bc)){ ElMessage.warning('该条码已添加'); return; }
      const r = (((MOCK['reagent-arch']||{}).main)||[]).find(x=> x['条码号']===bc);
      if(!r) return;
      labPrepExec.lines.push({
        条码号: bc, 试剂编码: r['试剂编码']||'', 试剂名称: r['试剂名称']||'', 试剂规格: r['试剂规格']||'',
        试剂种类: r['试剂种类']||'', 批号: r['批号']||'', 计量单位: r['计量单位']||'', 使用数量: '', 备注: ''
      });
      labPrepReagentPick.value = '';
    }
    function removeLabPrepLines(){
      const sel = new Set(labPrepLineSel.value || []);
      if(!sel.size){ ElMessage.warning('请先勾选要删除的配制记录'); return; }
      labPrepExec.lines = labPrepExec.lines.filter(l=> !sel.has(l));
      labPrepLineSel.value = [];
    }
    function labPrepSnapshot(){
      return JSON.parse(JSON.stringify({
        env: labPrepExec.env, dev: labPrepExec.dev, lines: labPrepExec.lines,
        实际配液数量: labPrepExec['实际配液数量'], 提交备注: labPrepExec['提交备注']
      }));
    }
    function saveLabPrepExec(){
      const row = labPrepExecRow.value;
      if(!row) return;
      row._exec = labPrepSnapshot();
      row['单据状态'] = '执行中';
      labPrepExecVisible.value = false;
      bumpStore();
      ElMessage.success('已保存，单据状态为执行中');
    }
    function nextLabPrepBarcode(day){
      const prefix = 'SY' + day.replace(/-/g,'');
      let max = 0;
      (((MOCK['solution-arch']||{}).main)||[]).concat(labPrepRows()).forEach(r=>{
        const c = String(r['条码号']||'');
        if(c.startsWith(prefix)) max = Math.max(max, parseInt(c.slice(prefix.length), 10) || 0);
      });
      return prefix + String(max+1).padStart(3,'0');
    }
    function submitLabPrepExec(){
      const row = labPrepExecRow.value;
      if(!row) return;
      const req = [...labPrepEnvFields.value.map(f=> [f, labPrepExec.env]), ...labPrepDevFields.value.map(f=> [f, labPrepExec.dev])];
      const miss = req.find(([f, bag])=> f['是否必填']==='必填' && !String(bag[f['字段名称']]??'').trim());
      if(miss){ ElMessage.warning('请填写' + miss[0]['字段名称']); return; }
      if(!labPrepExec.lines.length){ ElMessage.warning('请至少添加一条配制记录'); return; }
      const bad = labPrepExec.lines.find(l=> !(parseFloat(l['使用数量']) > 0));
      if(bad){ ElMessage.warning('条码 ' + bad['条码号'] + ' 的使用数量须大于 0'); return; }
      const act = String(labPrepExec['实际配液数量']??'').trim();
      if(!(parseFloat(act) > 0)){ ElMessage.warning('请填写实际配液数量，且须大于 0'); return; }
      ElementPlus.ElMessageBox.confirm('确认提交？提交后单据状态变为已完成，并生成试液档案条码。','提交确认',{
        confirmButtonText:'确定', cancelButtonText:'取消', type:'info'
      }).then(()=>{
        const stamp = nowStamp(), day = stamp.slice(0,10);
        const bc = nextLabPrepBarcode(day);
        Object.assign(row, {
          _exec: labPrepSnapshot(), 单据状态: '已完成', 条码号: bc, 实际配液数量: act,
          生产日期: day, 失效日期: labAddLife(day, row._lifeN, row._lifeU),
          提交备注: String(labPrepExec['提交备注']||'').trim(), 提交时间: stamp, 提交人: '张三'
        });
        const sol = labPrepSolution(row['试液编码']) || {};
        const arch = ((MOCK['solution-arch'] = MOCK['solution-arch'] || { main: [] }).main = (MOCK['solution-arch'].main || []));
        arch.unshift({
          id: 'sya-' + Date.now(), 条码号: bc, 试液编码: row['试液编码']||'', 试液名称: sol['试液名称']||'',
          试液规格: sol['试液规格']||'', 试液种类: sol['试液种类']||'', 供应商名称: '', 计量单位: row['计量单位']||'',
          建档数量: act, 批号: row['批号']||'', 生产日期: day, 有效期: row['有效期']||'', _lifeN: row._lifeN||'', _lifeU: row._lifeU||'',
          失效日期: row['失效日期'], 存储库位: '', 存储仓库: '', 库存位置: '', 备注: row['提交备注'], 条码来源: '配液', 创建人: '张三', 创建时间: stamp
        });
        labPrepExecVisible.value = false;
        bumpStore();
        ElMessage.success('提交成功，已生成试液档案条码 ' + bc);
      }).catch(()=>{});
    }
