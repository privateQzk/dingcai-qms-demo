    function downloadLabPrepPdf(){ ElMessage.success('已下载 配制记录-' + (labPrepExecRow.value?.['配液单号']||'') + '.pdf'); }

    /** 实验室 · 试液管理 · 标定（标定流水＝标定计划中已完成的单据） */
    const LAB_CALIB = 'np-0402-02';
    function labCalibRows(){
      return ((MOCK[LAB_CALIB] = MOCK[LAB_CALIB] || { 'tab-1': [], 'tab-2': [] })['tab-1'] = (MOCK[LAB_CALIB]['tab-1'] || []));
    }
    function nextLabCalibNo(){
      let max = 0;
      labCalibRows().forEach(r=>{
        const n = parseInt(String(r['标定单号']||'').replace(/\D/g,''), 10);
        if(Number.isFinite(n)) max = Math.max(max, n);
      });
      return String(max+1).padStart(6,'0');
    }
    function labCalibTemplate(name){ return (((MOCK['calib-template']||{}).main)||[]).find(r=> r['标定模板名称']===name) || null; }
    function labCalibFilter(){
      const tab1 = activeTab.value==='tab-1';
      const has = (v, q)=> !String(q||'').trim() || String(v||'').includes(String(q).trim());
      const nos = splitDun(query['标定单号']);
      const list = labCalibRows().filter(r=>{
        if(!tab1 && r['单据状态']!=='已完成') return false;
        if(nos.length>1 ? !nos.includes(r['标定单号']) : !has(r['标定单号'], query['标定单号'])) return false;
        if(!has(r['条码号'], query['条码号']) || !has(r['试液信息'], query['试液信息'])) return false;
        if(tab1){
          if(query['单据状态'] && r['单据状态']!==query['单据状态']) return false;
          return has(r['制单人'], query['制单人']) && has(r['标定模板'], query['标定模板']);
        }
        if(query['最终结论'] && r['最终结论']!==query['最终结论']) return false;
        return has(r['提交人'], query['提交人']);
      });
      const key = tab1 ? '制单时间' : '提交时间';
      return list.slice().sort((a,b)=> String(b[key]||'').localeCompare(String(a[key]||'')));
    }
    function labCalibPickableArch(rows){
      const busy = new Set(labCalibRows().filter(r=> ['待执行','执行中'].includes(r['单据状态']) && r.id!==formModel._editId).map(r=> r['条码号']));
      return rows.filter(r=> !busy.has(r['条码号']) && (labPrepSolution(r['试液编码'])||{})['是否标定']==='是');
    }
    function fillLabCalibArch(r){
      const sol = labPrepSolution(r['试液编码']) || {};
      formModel['条码号'] = r['条码号'] || '';
      formModel['试液信息'] = [r['试液编码'], r['试液名称'], r['试液规格'], r['试液种类']].filter(Boolean).join(' / ');
      ['批号','计量单位','生产日期','有效期'].forEach(k=>{ formModel[k] = r[k] || ''; });
      formModel['数量'] = r['建档数量'] || '';
      formModel['标定模板'] = sol['标定模板'] || '';
      if(!formModel['标定模板']) ElMessage.warning('该试液未维护标定模板，请先到试液列表维护');
    }
    function saveLabCalibForm(){
      const bc = String(formModel['条码号']||'').trim();
      if(!bc){ ElMessage.warning('请选择条码号'); return; }
      if(!formModel['标定模板']){ ElMessage.warning('该试液未维护标定模板，不可保存'); return; }
      const list = labCalibRows();
      if(list.some(r=> r['条码号']===bc && ['待执行','执行中'].includes(r['单据状态']) && r.id!==formModel._editId)){
        ElMessage.warning('该条码已有待执行或执行中的标定单'); return;
      }
      const no = String(formModel['标定单号']||'').trim() || nextLabCalibNo();
      if(list.some(r=> r['标定单号']===no && r.id!==formModel._editId)){ ElMessage.warning('标定单号已存在，请刷新后重试'); return; }
      const payload = { 标定单号: no, 条码号: bc, 试液编码: String(formModel['试液信息']||'').split(' / ')[0].trim(), 备注: String(formModel['备注']||'').trim() };
      ['试液信息','批号','数量','计量单位','计划标定日期','生产日期','有效期','标定模板'].forEach(k=>{ payload[k] = formModel[k] || ''; });
      if(formMode.value==='edit'){
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑标定单'); return; }
        if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅待执行状态的标定单可编辑'); return; }
        Object.assign(cur, payload);
      } else {
        list.unshift({ id: 'calib-' + Date.now(), 单据状态: '待执行', ...payload, 生效日期: '', 制单时间: nowStamp(), 制单人: '张三' });
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(formMode.value==='edit' ? '标定单已保存' : '单据提交成功，状态为待执行');
    }
    const calibExecVisible = ref(false);
    const calibExecReadonly = ref(false);
    const calibExecRow = ref(null);
    const calibTests = ref([]);
    const calibTestSel = ref([]);
    const calibFinal = reactive({ 平均值:'', 相对极差:'', 最终结论:'', done:false });
    const calibTpl = computed(()=> labCalibTemplate(calibExecRow.value?.['标定模板']));
    const calibMethod = computed(()=>{
      const r = calibExecRow.value;
      if(!r) return '';
      const code = r['试液编码'] || String(r['试液信息']||'').split(' / ')[0];
      return (labPrepSolution(code)||{})['标定方法依据'] || '';
    });
    const calibHeadCols = computed(()=> ((tabView.value||{}).columns||[]).filter(c=> c.field!=='_actions'));
    const calibMultiStd = computed(()=> CALIB_HELP.stdText(calibTpl.value?.['多人极差符号'], calibTpl.value?.['多人最终相对极差合格标准']));
    const calibDoneTests = computed(()=> calibTests.value.filter(t=> t['测试状态']==='完成'));
    function emptyCalibTest(){ return { id: 'ct-' + Date.now() + '-' + Math.random().toString(36).slice(2,6), 测试状态:'未完成', 测试结论:'', 平均值:'', 相对极差:'', 测量人员:'', 提交时间:'', data:{} }; }
    function resetCalibFinal(){ Object.assign(calibFinal, { 平均值:'', 相对极差:'', 最终结论:'', done:false }); }
    function openLabCalibExec(row, readonly){
      if(!readonly && !['待执行','执行中'].includes(row['单据状态'])){ ElMessage.warning('仅待执行或执行中的标定单可执行'); return; }
      const tpl = labCalibTemplate(row['标定模板']);
      const tests = JSON.parse(JSON.stringify(row._tests || []));
      while(tests.length < 2) tests.push(emptyCalibTest());
      tests.forEach(t=>{ t.data = CALIB_HELP.ensure(tpl, t.data); });
      calibExecRow.value = row;
      calibExecReadonly.value = !!readonly;
      calibTests.value = tests;
      calibTestSel.value = [];
      resetCalibFinal();
      if(row._final) Object.assign(calibFinal, row._final);
      calibExecVisible.value = true;
    }
    function addCalibTest(){ calibTests.value.push(emptyCalibTest()); resetCalibFinal(); }
    function removeCalibTests(){
      const sel = new Set(calibTestSel.value || []);
      if(!sel.size){ ElMessage.warning('请先勾选要删除的标定测试'); return; }
      if(calibTests.value.length - sel.size < 2){ ElMessage.warning('标定测试至少保留 2 行'); return; }
      calibTests.value = calibTests.value.filter(t=> !sel.has(t));
      calibTestSel.value = [];
      resetCalibFinal();
    }
    const calibEntryVisible = ref(false);
    const calibEntryReadonly = ref(false);
    const calibEntryIdx = ref(0);
    const calibEntryTest = ref(null);
    function openCalibEntry(test, readonly){
      calibEntryIdx.value = calibTests.value.indexOf(test);
      calibEntryReadonly.value = !!readonly;
      calibEntryTest.value = { data: CALIB_HELP.ensure(calibTpl.value, JSON.parse(JSON.stringify(test.data || {}))) };
      calibEntryVisible.value = true;
    }
    function submitCalibEntry(){
      const tpl = calibTpl.value, data = calibEntryTest.value.data;
      for(const g of CALIB_HELP.groups(tpl)){
        const f = g.fields.find(x=> x['是否必填']==='必填' && !String(data[g.key][x['字段名称']]??'').trim());
        if(f){ ElMessage.warning('请填写' + g.label + '：' + f['字段名称']); return; }
      }
      for(const mx of CALIB_HELP.matrices(tpl)){
        for(const p of mx.params){
          if(p['计算公式']) continue;
          const i = data[mx.key][p['参数编码']].findIndex(v=> !Number.isFinite(Number(String(v??'').trim())) || String(v??'').trim()==='');
          if(i >= 0){ ElMessage.warning(mx.label + '「' + p['参数名称'] + '」第' + (i+1) + '次请输入数字'); return; }
        }
      }
      const res = CALIB_HELP.result(tpl, data);
      if(!res['平均值']){ ElMessage.warning('结果值参考参数无法计算，请检查录入数据'); return; }
      const t = calibTests.value[calibEntryIdx.value];
      Object.assign(t, res, { 测试状态:'完成', 测量人员:'张三', 提交时间: nowStamp(), data: JSON.parse(JSON.stringify(data)), _vals: CALIB_HELP.refValues(tpl, data) });
      resetCalibFinal();
      calibEntryVisible.value = false;
      ElMessage.success('测试' + (calibEntryIdx.value+1) + ' 已提交，测试结论：' + res['测试结论']);
    }
    function calcCalibFinal(){
      const tests = calibTests.value;
      if(tests.some(t=> t['测试状态']!=='完成')){ ElMessage.warning('所有标定测试完成后才可计算'); return; }
      const ok = tests.filter(t=> t['测试结论']==='成功');
      if(ok.length < 2){ ElMessage.warning('至少 2 条测试结论为成功时才可计算'); return; }
      const s = CALIB_HELP.stats(ok.flatMap(t=> t._vals || CALIB_HELP.refValues(calibTpl.value, t.data)));
      if(!s){ ElMessage.warning('参考参数数据不完整，无法计算'); return; }
      const tpl = calibTpl.value || {};
      Object.assign(calibFinal, {
        平均值: s.avg, 相对极差: s.rr + '%', done: true,
        最终结论: CALIB_HELP.pass(s.rr, tpl['多人极差符号'], tpl['多人最终相对极差合格标准']) ? '成功' : '失败'
      });
      ElMessage.success('已计算最终结果：' + calibFinal['最终结论']);
    }
    function saveLabCalibExec(){
      const row = calibExecRow.value;
      if(!row) return;
      row._tests = JSON.parse(JSON.stringify(calibTests.value));
      row._final = { ...calibFinal };
      row['单据状态'] = '执行中';
      calibExecVisible.value = false;
      bumpStore();
      ElMessage.success('已保存，单据状态为执行中');
    }
    function submitLabCalibExec(){
      const row = calibExecRow.value;
      if(!row) return;
      if(calibTests.value.some(t=> t['测试状态']!=='完成')){ ElMessage.warning('所有标定测试完成后才可提交'); return; }
      if(!calibFinal.done){ ElMessage.warning('请先计算最终结果'); return; }
      ElementPlus.ElMessageBox.confirm('最终结论：' + calibFinal['最终结论'] + '。确认提交？提交后单据状态变为已完成。','提交确认',{
        confirmButtonText:'确定', cancelButtonText:'取消', type:'info'
      }).then(()=>{
        const stamp = nowStamp();
        Object.assign(row, {
          _tests: JSON.parse(JSON.stringify(calibTests.value)), _final: { ...calibFinal },
          单据状态: '已完成', 最终结论: calibFinal['最终结论'], 最终平均值: calibFinal['平均值'], 最终相对极差: calibFinal['相对极差'],
          生效日期: calibFinal['最终结论']==='成功' ? stamp.slice(0,10) : '', 提交时间: stamp, 提交人: '张三'
        });
        calibExecVisible.value = false;
        bumpStore();
        ElMessage.success('提交成功，最终结论：' + row['最终结论']);
      }).catch(()=>{});
    }
    function downloadLabCalibPdf(){ ElMessage.success('已下载 标定记录-' + (calibExecRow.value?.['标定单号']||'') + '.pdf'); }

    /** 实验室库内 · 仓库盘点-扫码 / 计数 / 库存看板 */
    const LAB_COUNT_SCAN = 'np-0406-01';
    const LAB_COUNT_QTY = 'np-0406-02';
    const LAB_STOCK_BOARD = 'np-0406-03';
    const LAB_COUNT_TYPES = ['试剂','试液','标准物质'];
    const LAB_COUNT_QTY_TYPES = ['耗材'];
    let labStockDrillPending = null;
    let envMonRelPending = null;
    let batchPickLine = null;
    function isLabCountPage(){ return pageId.value===LAB_COUNT_SCAN || pageId.value===LAB_COUNT_QTY; }
    function drillLabStockBoard(field, row){
      if(!row || !field) return;
      const pending = {};
      const matCode = row['物料编码'] || String(row['物料信息']||'').split('/')[0].trim();
      const whCode = row['仓库编码'] || '';
      let toTab = 'tab-3';
      if(String(field).includes('计数')){
        toTab = 'tab-4';
        if(matCode) pending['物料编码'] = matCode;
        if(whCode) pending['仓库编码'] = whCode;
        if(row['物料类型']==='耗材' || toTab==='tab-4') pending['物料类型'] = '耗材';
      } else {
        toTab = 'tab-3';
        if(matCode) pending['物料编码'] = matCode;
        if(whCode) pending['仓库编码'] = whCode;
        if(row['物料类型'] && row['物料类型']!=='耗材') pending['物料类型'] = [row['物料类型']];
        if(String(field).includes('超有效期')) pending['告警状态'] = '超有效期';
      }
      labStockDrillPending = pending;
      if(activeTab.value===toTab){
        Object.keys(query).forEach(k=> delete query[k]);
        Object.assign(query, pending);
        labStockDrillPending = null;
        pageNum.value = 1;
        ElMessage.success('已按所选条件筛选明细');
      } else {
        activeTab.value = toTab;
      }
    }
    function labCountScanRows(){ return ((MOCK[LAB_COUNT_SCAN] = MOCK[LAB_COUNT_SCAN] || { main: [] }).main = (MOCK[LAB_COUNT_SCAN].main || [])); }
    function labCountQtyRows(){ return ((MOCK[LAB_COUNT_QTY] = MOCK[LAB_COUNT_QTY] || { main: [] }).main = (MOCK[LAB_COUNT_QTY].main || [])); }
    function labCountRows(){ return pageId.value===LAB_COUNT_QTY ? labCountQtyRows() : labCountScanRows(); }
    function labCountWhCodes(){
      return (((MOCK.warehouse||{}).tab1)||[]).filter(r=> r['启用状态']==='启用').map(r=> r['仓库编码']).filter(Boolean);
    }
    function nextLabCountScanNo(){
      let max = 0;
      labCountScanRows().forEach(r=>{
        const m = String(r['盘点单号']||'').match(/LAB-PD-S(\d+)/);
        if(m) max = Math.max(max, parseInt(m[1],10)||0);
      });
      return 'LAB-PD-S' + String(max+1).padStart(3,'0');
    }
    function nextLabCountQtyNo(){
      let max = 0;
      labCountQtyRows().forEach(r=>{
        const m = String(r['盘点单号']||'').match(/LAB-PD-C(\d+)/);
        if(m) max = Math.max(max, parseInt(m[1],10)||0);
      });
      return 'LAB-PD-C' + String(max+1).padStart(3,'0');
    }
    function labCountDemoLines(types, whs){
      const pool = [
        {物料类型:'试剂',物料编码:'RG-ACN-HPLC',物料名称:'乙腈',物料规格:'HPLC级 4L',物料种类:'色谱试剂',条码号:'RG20261009001',批号:'ACN2609A',应盘数量:'1',计量单位:'瓶',仓库编码:'WH-LAB-01',库位编码:'LOC-A-01'},
        {物料类型:'试剂',物料编码:'RG-MEOH-HPLC',物料名称:'甲醇',物料规格:'HPLC级 4L',物料种类:'色谱试剂',条码号:'RG20261009002',批号:'MEOH2608B',应盘数量:'1',计量单位:'瓶',仓库编码:'WH-LAB-01',库位编码:'LOC-A-02'},
        {物料类型:'试剂',物料编码:'RG-HNO3-UPS',物料名称:'硝酸',物料规格:'UP-S级 500mL',物料种类:'酸碱试剂',条码号:'RG20261008011',批号:'HNO32609',应盘数量:'1',计量单位:'瓶',仓库编码:'WH-LAB-02',库位编码:'LOC-B-01'},
        {物料类型:'试液',物料编码:'SY-NAOH-01',物料名称:'氢氧化钠标准滴定溶液',物料规格:'0.1mol/L 1L',物料种类:'标准滴定溶液',条码号:'SY20261008021',批号:'NAOH2609',应盘数量:'1',计量单位:'瓶',仓库编码:'WH-LAB-01',库位编码:'LOC-A-05'},
        {物料类型:'试液',物料编码:'SY-HCL-01',物料名称:'盐酸标准滴定溶液',物料规格:'0.1mol/L 1L',物料种类:'标准滴定溶液',条码号:'SY20261008022',批号:'HCL2609',应盘数量:'1',计量单位:'瓶',仓库编码:'WH-LAB-02',库位编码:'LOC-B-02'},
        {物料类型:'标准物质',物料编码:'CRM-NA-100',物料名称:'钠标准溶液',物料规格:'1000μg/mL 50mL',物料种类:'单元素标准',条码号:'CRM20261005001',批号:'NA2605',应盘数量:'1',计量单位:'支',仓库编码:'WH-LAB-03',库位编码:'LOC-C-01'},
        {物料类型:'标准物质',物料编码:'CRM-PH-401',物料名称:'pH 4.01缓冲标准',物料规格:'500mL',物料种类:'pH标准',条码号:'CRM20261005002',批号:'PH2606',应盘数量:'1',计量单位:'瓶',仓库编码:'WH-LAB-03',库位编码:'LOC-C-02'}
      ];
      const tset = new Set(types||[]);
      const wset = new Set(whs||[]);
      return pool.filter(r=> (!tset.size || tset.has(r['物料类型'])) && (!wset.size || wset.has(r['仓库编码']))).map((r,i)=> ({
        ...r, _i:i+1, 盘点状态:'待盘', 实盘数量:'—', 盘点异常说明:'—', 盘点人:'—', 盘点时间:'—'
      }));
    }
    function labCountQtyDemoLines(types, whs){
      const pool = [
        {档案类型:'耗材',物料编码:'HC-GLOVE-NIT',物料名称:'丁腈手套',物料规格:'M码 100只/盒',物料种类:'防护耗材',应盘数量:'12',计量单位:'盒',仓库编码:'WH-LAB-01',库位编码:'LOC-A-01'},
        {档案类型:'耗材',物料编码:'HC-TIP-200',物料名称:'移液枪头',物料规格:'200μL 960支',物料种类:'实验耗材',应盘数量:'8',计量单位:'盒',仓库编码:'WH-LAB-01',库位编码:'LOC-A-02'},
        {档案类型:'耗材',物料编码:'HC-FILTER-0.22',物料名称:'针头过滤器',物料规格:'0.22μm 尼龙',物料种类:'过滤耗材',应盘数量:'6',计量单位:'包',仓库编码:'WH-LAB-02',库位编码:'LOC-B-01'},
        {档案类型:'耗材',物料编码:'HC-VIAL-2ML',物料名称:'样品瓶',物料规格:'2mL 棕色',物料种类:'容器耗材',应盘数量:'10',计量单位:'盒',仓库编码:'WH-LAB-01',库位编码:'LOC-A-05'},
        {档案类型:'耗材',物料编码:'HC-WIPE-ISO',物料名称:'无尘布',物料规格:'9×9寸',物料种类:'洁净耗材',应盘数量:'15',计量单位:'包',仓库编码:'WH-LAB-02',库位编码:'LOC-B-02'},
        {档案类型:'耗材',物料编码:'HC-TUBE-15',物料名称:'离心管',物料规格:'15mL',物料种类:'容器耗材',应盘数量:'9',计量单位:'包',仓库编码:'WH-LAB-03',库位编码:'LOC-C-01'},
        {档案类型:'耗材',物料编码:'HC-MASK-N95',物料名称:'防护口罩',物料规格:'N95',物料种类:'防护耗材',应盘数量:'5',计量单位:'盒',仓库编码:'WH-LAB-03',库位编码:'LOC-C-02'}
      ];
      const tset = new Set(types||[]);
      const wset = new Set(whs||[]);
      const need耗材 = !tset.size || tset.has('耗材');
      return pool.filter(r=> need耗材 && (!wset.size || wset.has(r['仓库编码']))).map((r,i)=> ({
        ...r, _i:i+1, 盘点状态:'待盘', 实盘数量:'—', 盘点异常说明:'—', 盘点人:'—', 盘点时间:'—'
      }));
    }
    function sumLabCountQty(lines){
      return (lines||[]).reduce((s,r)=> s + (parseFloat(r['应盘数量'] ?? r['数量'])||0), 0);
    }
    function refreshLabCountScanLines(){
      if(!isLabCountPage()) return;
      const types = Array.isArray(formModel['盘点类型']) ? formModel['盘点类型'] : splitDun(formModel['盘点类型']);
      const whs = Array.isArray(formModel['盘点仓库']) ? formModel['盘点仓库'] : splitDun(formModel['盘点仓库']);
      if(!types.length || !whs.length){ formLineRows.value = []; return; }
      formLineRows.value = pageId.value===LAB_COUNT_QTY ? labCountQtyDemoLines(types, whs) : labCountDemoLines(types, whs);
    }
    function labCountConflict(types, whs, excludeId){
      const tset = new Set(types||[]);
      const wset = new Set(whs||[]);
      return labCountRows().some(r=>{
        if(excludeId && r.id===excludeId) return false;
        if(!['待执行','执行中'].includes(r['状态'])) return false;
        const rt = splitDun(r['盘点类型']);
        const rw = splitDun(r['盘点仓库']);
        return rt.some(t=> tset.has(t)) && rw.some(w=> wset.has(w));
      });
    }
    function enrichLabCountScanRow(r){
      const next = Object.assign({}, r);
      if(next['状态']==='待执行'){
        const t = new Date(String(next['计划开始时间']||'').replace(/-/g,'/')).getTime();
        if(t && !isNaN(t) && Date.now() >= t) next['状态'] = '执行中';
      }
      if(next['应盘件数']==null || next['应盘件数']===''){
        next['应盘件数'] = Array.isArray(next._lines) ? String(next._lines.length) : '—';
      }
      return next;
    }
    function enrichLabCountQtyRow(r){
      const next = Object.assign({}, r);
      if(next['状态']==='待执行'){
        const t = new Date(String(next['计划开始时间']||'').replace(/-/g,'/')).getTime();
        if(t && !isNaN(t) && Date.now() >= t) next['状态'] = '执行中';
      }
      if(next['应盘数量']==null || next['应盘数量']===''){
        next['应盘数量'] = Array.isArray(next._lines) ? String(sumLabCountQty(next._lines)) : '—';
      }
      return next;
    }
    function saveLabCountScanForm(){
      const types = Array.isArray(formModel['盘点类型']) ? formModel['盘点类型'] : splitDun(formModel['盘点类型']);
      const whs = Array.isArray(formModel['盘点仓库']) ? formModel['盘点仓库'] : splitDun(formModel['盘点仓库']);
      if(!types.length){ ElMessage.warning('请选择盘点类型'); return; }
      if(!whs.length){ ElMessage.warning('请选择盘点仓库'); return; }
      if(!formModel['计划开始时间']){ ElMessage.warning('请选择计划开始时间'); return; }
      if(formMode.value==='add' || formMode.value==='copy'){
        const pt = new Date(String(formModel['计划开始时间']).replace(/-/g,'/'));
        if(!Number.isNaN(pt.getTime()) && pt.getTime() <= Date.now()){
          ElMessage.warning('计划开始时间必须大于当前时间'); return;
        }
      }
      if(labCountConflict(types, whs, formModel._editId)){
        ElMessage.warning('所选盘点类型与仓库已存在待执行或执行中的盘点单，不可重复创建'); return;
      }
      const lines = (formLineRows.value||[]).map(r=> ({...r}));
      const isQty = pageId.value===LAB_COUNT_QTY;
      const list = labCountRows();
      const payload = {
        状态: '待执行',
        盘点类型: joinDun(types),
        盘点仓库: joinDun(whs),
        计划开始时间: formModel['计划开始时间']||'',
        备注: formModel['备注']||'—',
        启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
        盘点结果: '—', 盘点备注: '—', 盘点完成时间: '—', 盘点结束人: '—',
        _lines: lines
      };
      if(isQty){
        payload['应盘数量'] = String(sumLabCountQty(lines));
        payload['实盘数量'] = '—';
      } else {
        payload['应盘件数'] = String(lines.length);
        payload['实盘件数'] = '—';
      }
      if(formMode.value==='add' || formMode.value==='copy'){
        payload.id = (isQty ? 'labpdc-' : 'labpd-') + Date.now();
        payload['盘点单号'] = isQty ? nextLabCountQtyNo() : nextLabCountScanNo();
        if(isQty){
          payload['创建人'] = '张三';
          payload['创建时间'] = nowStamp();
        } else {
          payload['制单人'] = '张三';
          payload['制单时间'] = nowStamp();
        }
        list.unshift(payload);
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑盘点单'); return; }
        if(cur['状态']!=='待执行'){ ElMessage.warning('仅待执行状态的盘点单可编辑'); return; }
        const keep = isQty
          ? { id: cur.id, 盘点单号: cur['盘点单号'], 状态: cur['状态'], 创建人: cur['创建人'], 创建时间: cur['创建时间'] }
          : { id: cur.id, 盘点单号: cur['盘点单号'], 状态: cur['状态'], 制单人: cur['制单人'], 制单时间: cur['制单时间'] };
        Object.assign(cur, payload, keep);
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(formMode.value==='edit' ? '盘点单已保存' : '盘点单已新增');
    }
    function closeLabCountScan(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !['待执行','执行中'].includes(r['状态']))){
        ElMessage.warning('请勾选待执行或执行中的盘点单后再关闭'); return;
      }
      ElementPlus.ElMessageBox.confirm('确认关闭所选盘点单？关闭后将解除库存冻结。','关闭确认',{
        confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
      }).then(()=>{
        const set = new Set(selectedIds.value);
        labCountRows().forEach(r=>{ if(set.has(r.id)) r['状态']='已关闭'; });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('所选盘点单已关闭，库存冻结已解除');
      }).catch(()=>{});
    }
    function deleteLabCountScan(){
      const ids = new Set(selectedIds.value||[]);
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      const list = labCountRows();
      const rows = list.filter(r=> ids.has(r.id));
      if(rows.some(r=> !['待执行','执行中'].includes(r['状态']))){
        ElMessage.warning('仅待执行或执行中的盘点单可删除'); return;
      }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条盘点单？删除后解除库存冻结且不可恢复。','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        const pid = pageId.value;
        MOCK[pid].main = list.filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条盘点单，库存冻结已解除');
      }).catch(()=>{});
    }

    /** 实验室巡检 · 巡检方案 / 巡检计划 */
    const LAB_INSP_SCHEME = 'np-0408-01', LAB_INSP_PLAN = 'np-0408-02';
    const LAB_INSP_FORMS = ['每日巡检','仪器状态巡检','洁净区巡检','试剂柜巡检','安全巡检'];
    const LAB_INSP_AFFECT = '是否更新方案的下次自动推送时间';
    const LAB_INSP_AFFECT_DEFAULT = '临时计划，不更新（默认）';
    function labInspSchemeRows(){ return ((MOCK[LAB_INSP_SCHEME] = MOCK[LAB_INSP_SCHEME] || { main: [] }).main = (MOCK[LAB_INSP_SCHEME].main || [])); }
    function labInspPlanBag(tab){
      const bag = (MOCK[LAB_INSP_PLAN] = MOCK[LAB_INSP_PLAN] || { 'tab-1': [], 'tab-2': [] });
      if(!Array.isArray(bag[tab])) bag[tab] = [];
      return bag[tab];
    }
    function labInspParseDurationHours(src){
      const s = String(src||'');
      let hours = 0;
      const day = /(\d+)\s*天/.exec(s);
      const hour = /(\d+)\s*小时/.exec(s);
      const min = /(\d+)\s*分钟/.exec(s);
      if(day) hours += parseInt(day[1], 10) * 24;
      if(hour) hours += parseInt(hour[1], 10);
      if(min) hours += parseInt(min[1], 10) / 60;
      if(!hours) hours = parseFloat(s) || 0;
      return hours;
    }
    function labInspEndTime(start, duration){
      const t = new Date(String(start||'').replace(/-/g,'/')).getTime();
      if(!t || isNaN(t)) return '';
      const hours = labInspParseDurationHours(duration);
      const end = new Date(t + (hours || 0) * 3600000);
      const p = n => String(n).padStart(2,'0');
      return end.getFullYear()+'-'+p(end.getMonth()+1)+'-'+p(end.getDate())+' '+p(end.getHours())+':'+p(end.getMinutes());
    }
