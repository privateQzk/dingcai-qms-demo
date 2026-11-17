    function methodVerCount(row){
      return 1 + (Array.isArray(row && row._versions) ? row._versions.length : 0);
    }
    function inspMethodVerKey(row){
      const r = row || {};
      return JSON.stringify({
        版本号: r['版本号']||'', 方法阶段: r['方法阶段']||'', 作业说明: r['作业说明']||'', 作业附件: r['作业附件']||'', 公用参数: r['公用参数']||'', 样本参数: r['样本参数']||'',
        材料: r['材料']||'', 备注: r['备注']||'', 启用状态: r['启用状态']||'',
        是否使用公用参数: r['是否使用公用参数']||'', 公用测试次数: r['公用测试次数']||'',
        是否使用样本参数: r['是否使用样本参数']||'', 样本测试次数: r['样本测试次数']||'',
        _publicParams: r._publicParams||[], _sampleParams: r._sampleParams||[], _mats: r._mats||[], _matCats: r._matCats||[]
      });
    }
    function openMethodVer(row){
      const cur = JSON.parse(JSON.stringify(row||{}));
      delete cur._versions;
      cur._mark = '当前';
      const hist = (Array.isArray(row && row._versions) ? row._versions : []).map(v=>({ ...JSON.parse(JSON.stringify(v)), _mark: '' }));
      methodVerRows.value = [cur, ...hist];
      methodVerTitle.value = '版本树 · ' + ((row&&row['检验方法名称']) || (row&&row['检验方法编码']) || '');
      methodVerVisible.value = true;
    }
    function openMethodVerDetail(ver){
      onRowOp({ name: '版本查看' }, ver);
    }
    function onInspMethodFile(file){
      const name = (file && (file.name || (file.raw && file.raw.name))) || '';
      if(!name) return;
      formModel['作业附件'] = name;
      ElMessage.success('已选择文件「' + name + '」');
    }
    function cloneInspMethodParamRow(r){
      return {
        id: r.id || r.参数编码,
        参数编码: r['参数编码'] || '',
        参数名称: r['参数名称'] || '',
        参数代号: r['参数代号'] || '',
        参数属性: r['参数属性'] || '',
        函数: r['函数'] || '',
        计算公式: r['计算公式'] || ''
      };
    }
    function onInspMethodPublicToggle(v){
      if(v!=='是'){
        formModel['公用测试次数'] = '';
        inspMethodPublicParams.value = [];
        inspMethodPublicSelected.value = [];
      }
    }
    function onInspMethodPublicTimesChange(v){
      if(v==='同样本次数'){
        formModel['是否使用样本参数'] = '是';
      }
    }
    function removeInspMethodParams(which){
      if(which==='public'){
        const ids = new Set((inspMethodPublicSelected.value||[]).map(r=> r.参数编码));
        if(!ids.size){ ElMessage.warning('请先勾选要删除的参数'); return; }
        inspMethodPublicParams.value = inspMethodPublicParams.value.filter(r=> !ids.has(r.参数编码));
        inspMethodPublicSelected.value = [];
      } else {
        const ids = new Set((inspMethodSampleSelected.value||[]).map(r=> r.参数编码));
        if(!ids.size){ ElMessage.warning('请先勾选要删除的参数'); return; }
        inspMethodSampleParams.value = inspMethodSampleParams.value.filter(r=> !ids.has(r.参数编码));
        inspMethodSampleSelected.value = [];
      }
    }
    function resetInspParamDrawerQ(){
      inspParamDrawerQ['参数编码']='';
      inspParamDrawerQ['参数名称']='';
      inspParamDrawerQ['参数属性']='';
      inspParamDrawerQ['启用状态']='';
      inspParamDrawerTick.value++;
    }
    function openInspParamDrawer(target){
      inspParamDrawerTarget.value = target || 'public';
      inspParamDrawerSelected.value = [];
      resetInspParamDrawerQ();
      inspParamDrawerVisible.value = true;
    }
    const inspParamDrawerRows = computed(()=>{
      void inspParamDrawerTick.value;
      const bag = (window.WMS_MOCK_ROWS || MOCK)['insp-method'] || {};
      let rows = Array.isArray(bag['tab-param']) ? bag['tab-param'].slice() : [];
      const q = inspParamDrawerQ;
      const c = String(q['参数编码']||'').trim();
      const n = String(q['参数名称']||'').trim();
      const a = String(q['参数属性']||'').trim();
      const e = String(q['启用状态']||'').trim();
      if(c) rows = rows.filter(r=> String(r['参数编码']||'').includes(c));
      if(n) rows = rows.filter(r=> String(r['参数名称']||'').includes(n));
      if(a) rows = rows.filter(r=> String(r['参数属性']||'')===a);
      if(e) rows = rows.filter(r=> String(r['启用状态']||'')===e);
      return rows;
    });
    function confirmInspParamDrawer(){
      const selected = inspParamDrawerSelected.value || [];
      if(!selected.length){ ElMessage.warning('请先勾选检验参数'); return; }
      const targetList = inspParamDrawerTarget.value==='sample' ? inspMethodSampleParams : inspMethodPublicParams;
      const otherList = inspParamDrawerTarget.value==='sample' ? inspMethodPublicParams : inspMethodSampleParams;
      const existCodes = new Set([
        ...(targetList.value||[]).map(r=> r.参数编码),
        ...(otherList.value||[]).map(r=> r.参数编码)
      ]);
      const dups = [];
      const add = [];
      selected.forEach(r=>{
        const code = r['参数编码'];
        if(!code) return;
        if(existCodes.has(code)){ dups.push(r['参数名称']||code); return; }
        existCodes.add(code);
        add.push(cloneInspMethodParamRow(r));
      });
      if(dups.length){
        ElMessage.warning('存在重复参数：' + dups.join('、') + '，请勿重复添加');
        return;
      }
      targetList.value = (targetList.value||[]).concat(add);
      inspParamDrawerVisible.value = false;
      ElMessage.success('已添加 ' + add.length + ' 个参数');
    }
    const poMatPool = ref([]); // 当前采购订单可选物料
    const formLineSelected = ref([]);
    const splitVisible = ref(false);
    const splitRow = ref({});
    const splitLines = ref([]);
    const splitLineSelected = ref([]);
    const splitForm = reactive({ 订单类型:'', 订单号:'', 关联销售备货单:'', 关联销售预出货单:'', 前置关联单据:'', 采购订单:'', 合同号:'', 装货点:'', 装货联系人:'', 装货联系电话:'', 卸货点:'', 卸货联系人:'', 卸货联系电话:'', 计划装货时间:'', 要求送达时间:'', 备注:'' });
    const splitPickerMode = ref(false);
    const dispatchAuditVisible = ref(false);
    const dispatchAuditRow = ref({});
    const dispatchAuditForm = reactive({ 审核结果:'审核通过', 审核意见:'' });
    const assignVisible = ref(false);
    const assignRow = ref({});
    const assignForm = reactive({ 承运商名称:'', 车牌号:'', 车挂号:'', 司机姓名:'', 司机电话:'', 驾驶证号:'', 从业资格证号:'', 押运员姓名:'', 押运员资格证号:'' });
    const secondaryAssignVisible = ref(false);
    const secondaryAssignRow = ref({});
    const secondaryAssignForm = reactive({ 送货车牌号:'', 送货车挂号:'', 送货司机:'', 送货司机电话:'', 送货备注:'' });
    const settleVisible = ref(false);
    const settleRows = ref([]);
    const settleForm = reactive({ 采购合同号:'', 供应商:'', 供应商编码:'', 运输服务物料信息:'9819.00002 / *运输服务*国内物流', 采购单位:'Pcs', 交期:'' });
    const SETTLE_SERVICE_MATS = [
      { 编码:'9819.00002', 名称:'*运输服务*国内物流', 规格:'运输服务', 种类:'Pcs', 采购单位:'Pcs' },
      { 编码:'9819.00003', 名称:'*运输服务*专线配送', 规格:'运输服务', 种类:'项', 采购单位:'项' },
      { 编码:'9819.00004', 名称:'*运输服务*专车运输', 规格:'运输服务', 种类:'次', 采购单位:'次' }
    ];
    const kpiCfgVisible = ref(false);
    const kpiCfgRow = ref(null);
    const kpiGrades = ref([]);
    const kpiGradeSel = ref([]);
    const kpiProjects = ref([]);
    const kpiProjSel = ref([]);
    const kpiScoreVisible = ref(false);
    const kpiScoreReadonly = ref(false);
    const kpiScoreVendor = ref({});
    const kpiScoreProjects = ref([]);
    const kpiScoreExplain = ref('');
    const kpiScoreRemark = ref('');
    const kpiVendorSel = ref([]);
    const kpiFlowVisible = ref(false);
    const kpiFlowRow = ref({});
    const kpiFlowNodes = ref([]);
    const detailVisible = ref(false);
    const detailRow = ref({});
    const dictTypeKw = ref('');
    const dictTypeId = ref('');
    const dictTypes = ref([...(MOCK.dict?.types || [])]);
    const dictTypeFormVisible = ref(false);
    const dictTypeFormMode = ref('add');
    const dictTypeForm = reactive({ id:'', 编码:'', 名称:'', 上级字典:'', 备注:'', 系统开发:false, 分组节点:false });
    const dictTypeCollapsed = ref({});

    const batchVisible = ref(false);
    const batchForm = reactive({});
    const batchCtx = reactive({ from: '', noticeNo: '', lineId: '' });
    const batchLines = ref([]);
    const batchSelected = ref([]);
    const craftVisible = ref(false);
    const craftProcVisible = ref(false);
    const craftProcForm = ref(null);
    const craftProcNodeId = ref(null);
    const craftRow = ref(null);
    const craftKw = ref('');
    const craftZoom = ref(1);
    const craftLocked = ref(false);
    const craftNodes = ref([]);
    const craftEdges = ref([]);
    const craftDragProc = ref('');
    const designVisible = ref(false);
    const designCanvas = ref([]);
    const designFormName = ref('');
    const designFormTitle = ref('过程检查记录');
    const designActive = ref(-1);
    const designDragType = ref('');
    const designDirty = ref(false);
    const formPreviewVisible = ref(false);
    const importVisible = ref(false);
    const opcRel = reactive({ visible:false, point:'', rows:[] });
    const exportVisible = ref(false);
    const printVisible = ref(false);
    /* 所有「打印标签」统一走 openPrintLabel：标题「打印标签」+ 标签模板 + 打印机 + 条码预览 */
    const printCodes = ref([]);
    const printTpl = ref('标准条码模板');
    const printPrinter = ref('HP1001');
    const printFrom = ref(null);
    const PRINT_LABEL_KEYS = ['条码号','流水码','子条码','样品编号','储罐编码','色谱柱条码','仪器条码','编码','编号','任务ID'];
    function labelCodeOf(row){
      if(!row) return '';
      const keys = Object.keys(row).filter(k=> k!=='id' && !k.startsWith('_') && row[k] && typeof row[k]!=='object');
      const k = PRINT_LABEL_KEYS.find(k=> row[k]) || keys.find(k=> /(条码|流水码|编号|单号|编码|批号)$/.test(k)) || keys[0];
      return k ? String(row[k]) : '';
    }
    function openPrintLabel(rows, emptyTip){
      const list = (rows||[]).map(labelCodeOf).filter(Boolean);
      if(!list.length){ ElMessage.warning(emptyTip || '请先勾选需要打印的数据'); return; }
      printCodes.value = list;
      printTpl.value = '标准条码模板';
      printPrinter.value = 'HP1001';
      printFrom.value = null;
      printVisible.value = true;
    }
    const consignPrintVisible = ref(false);
    const consignPrint = reactive({ 编号:'', 发货日期:'', 合同编号:'', 送货单位:'四川思特瑞锂业科技有限公司', 收货单位:'', 收货地址:'', 联系人:'', 联系电话:'', 司机姓名:'', 司机电话:'', 车牌号:'', 备注:'', lines:[] });
    const pickerVisible = ref(false);
    const pickerTitle = ref('');
    const pickerKw = ref('');
    const pickerPrepQ = reactive({ barcode: '', lot: '', loc: '' });
    const pickerPrepFilterTick = ref(0);
    const pickerCurrent = ref(null);
    const pickerSelected = ref([]);
    const pickerLineRow = ref(null);
    const pickerBind = ref('form');
    const mergeVisible = ref(false);
    const mergeForm = reactive({ 承运商名称: '', 计划装货时间: '', 运输类型: '', 运费单价: '' });
    const soPrepPushVisible = ref(false);
    const soPrepPushForm = reactive({});
    const mergeShipRows = ref([]);
    const VEHICLE_OPTS = ['发货','提货','设备发运','厂内/园区倒短运输','物资转运','其他'];
    const WH_BIZ_BY_VEHICLE = {
      '发货': ['销售发货','销售预出货','采购退料','委外发料','受托退料','其他出库'],
      '提货': ['采购入库','销售退货','委外收货','受托收料','委外退料','其他入库'],
      '厂内/园区倒短运输': ['直接调拨','库内转移'],
      '设备发运': ['无','其他出库','其他入库'],
      '物资转运': ['无','其他出库','其他入库'],
      '其他': ['无','其他出库','其他入库']
    };
    const WH_BIZ_DEFAULT = {
      '发货': '销售发货',
      '提货': '采购入库',
      '厂内/园区倒短运输': '直接调拨',
      '设备发运': '无',
      '物资转运': '无',
      '其他': '无'
    };
    const jobVisible = ref(false);
    const jobTitle = ref('作业详情');
    const jobHead = ref({});
    const jobProcs = ref([]);
    const jobLogiMode = ref('');
    const jobStockMode = ref(false);
    const detailPhotos = ref([]);
    const detailSignature = ref('');
    const jobInvTip = ref('');
    const jobInvCols = ref([]);
    const jobBarcodeCols = ref([]);
    const jobInvRows = ref([]);
    const jobBarcodeRows = ref([]);
    const formBarcodeRows = ref([]);
    const formBarcodeSelected = ref([]);
    const jobProcIdx = ref(0);
    const prodPickLotVisible = ref(false);
    const prodPickLotTitle = ref('领出批号详情');
    const prodPickLotHead = ref({});
    const prodPickLotRows = ref([]);
    const detailLineRows = ref([]);
    const detailLineSelected = ref([]);
    const detailEnrouteRows = ref([]);
    const qcInspectVisible = ref(false);
    const qcInspectRow = ref(null);
    const qcInspectForm = reactive({ 检验结果:'', 检验员:'', 检验日期:'', 检验备注:'' });


    const defaultOpeneds = computed(() => []);
    /** el-menu 会自动展开 default-active 的上级分组；首次打开时全部收起 */
    const menuRef = ref(null);
    function collapseAllMenus(){
      const m = menuRef.value;
      if(!m || typeof m.close !== 'function') return;
      const walk = list => (list || []).forEach(n => {
        if(!n.children) return;
        walk(n.children);
        m.close(n.index);
      });
      walk(menu);
    }
    onMounted(()=> nextTick(()=>{ if(startId === firstId) collapseAllMenus(); }));

    /* 基础数据 · 实验室资料：列表页通用保存 / 删除，档案页建档（生成条码） */
    const LAB_LIST_PAGES = new Set(['reagent','solution','ref-material','retain-sample','consumable','lab-io-form']);
    function isLabListPage(){ return LAB_LIST_PAGES.has(pageId.value); }
    const LAB_IO_FORM = 'lab-io-form';
    const LAB_IO_DOC_TYPES = {
      '试剂入库':{ pid:'np-0401-01', types:['采购入库','其他入库','盘盈入库'] },
      '试剂出库':{ pid:'np-0401-02', types:['采购出库','其他出库','盘盈出库'] },
      '试液入库':{ pid:'np-0402-03', types:['采购入库','配液入库','其他入库'] },
      '试液出库':{ pid:'np-0402-04', types:['领用出库','其他出库'] },
      '标准物质入库':{ pid:'np-0403-02', types:['采购入库','其他入库'] },
      '标准物质出库':{ pid:'np-0403-03', types:['领用出库','其他出库'] },
      '留样入库':{ pid:'np-0404-01', types:['常规留样','其他入库'] },
      '留样出库':{ pid:'np-0404-02', types:['复检出库','其他出库'] },
      '耗材入库':{ pid:'np-0405-01', types:['采购入库','其他入库'] },
      '耗材出库':{ pid:'np-0405-02', types:['领用出库','其他出库'] },
      '标准物质开封':{ pid:'np-0403-01', types:['常规开封','其他开封'] }
    };
    function labIoDocTypes(doc){
      const hit = LAB_IO_DOC_TYPES[doc];
      if(!hit) return [];
      const f = (((CFG.pages||{})[hit.pid]||{}).formFields||[]).find(x=> x.name==='单据类型');
      return (f && f.options && f.options.length) ? f.options : hit.types;
    }
    function isLabArchPage(){ return !!(page.value && page.value.labArchive); }
    function labAddLife(dateStr, n, unit){
      const num = parseInt(String(n??'').trim(), 10);
      if(!dateStr || !(num > 0)) return '';
      const d = new Date(String(dateStr).slice(0,10) + 'T00:00:00');
      if(isNaN(d.getTime())) return '';
      if(unit === '天') d.setDate(d.getDate() + num);
      else {
        const day = d.getDate();
        d.setDate(1);
        d.setMonth(d.getMonth() + (unit === '年' ? num * 12 : num));
        d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
      }
      d.setDate(d.getDate() - 1);
      const p = x => String(x).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    }
    function labRefArchPages(srcPid){
      return Object.keys(CFG.pages || {}).filter(k=> ((CFG.pages[k]||{}).labArchive||{}).srcPage === srcPid);
    }
    function labDeleteSelected(){
      const pid = pageId.value;
      const bag = MOCK[pid] = MOCK[pid] || {};
      const list = bag.main || [];
      const set = new Set(selectedIds.value);
      if(isLabListPage()){
        const codeField = labCodeField(page.value.formFields);
        const refPids = labRefArchPages(pid);
        const used = list.filter(r=> set.has(r.id) && refPids.some(ap=>
          ((MOCK[ap]||{}).main||[]).some(a=> a[codeField] === r[codeField])));
        if(used.length){
          ElMessage.warning(`${used.map(r=> r[codeField]).join('、')} 已被档案引用，不可删除`);
          return;
        }
      }
      bag.main = list.filter(r=> !set.has(r.id));
      selectedIds.value = [];
      bumpStore();
      ElMessage.success('已删除');
    }
    function labCodeField(fields){
      const list = fields || [];
      return ((list.find(f=> /编码$/.test(f.name||'')) || list[0]) || {}).name;
    }
    function labSaveForm(){
      const pid = pageId.value;
      const fields = page.value.formFields || [];
      for(const f of fields){
        if(!f.required || f.type === 'switch' || f.type === 'readonly') continue;
        if(!String(formModel[f.name] ?? '').trim()){ ElMessage.warning(`请填写${f.name}`); return; }
      }
      const bag = MOCK[pid] = MOCK[pid] || {};
      const list = bag.main = bag.main || [];
      const isEdit = formMode.value === 'edit';
      if(isLabArchPage()){
        const row = list.find(r=> r.id === formModel._editId);
        if(!row){ formVisible.value = false; return; }
        const dateKey = (page.value.labArchive||{}).kind==='留样' ? '留样日期' : '生产日期';
        ['建档数量','批号', dateKey, '备注'].forEach(k=> { row[k] = formModel[k] ?? ''; });
        row['存储库位'] = formModel['存储库位'] || '';
        row['存储仓库'] = formModel['存储仓库'] || '';
        if(dateKey==='留样日期'){
          row['是否玻璃片'] = formModel['是否玻璃片'] || '否';
          row['样品位置'] = retainLocText(row['存储仓库'], row['存储库位']);
        } else {
          row['库存位置'] = retainLocText(row['存储仓库'], row['存储库位']);
        }
        row['失效日期'] = labAddLife(row[dateKey], row._lifeN, row._lifeU);
        if(row['开封状态']==='已开封') row['开封后失效日期'] = bzHalfExpire(row['失效日期'], row['开封日期']);
      } else {
        const codeField = labCodeField(fields);
        const code = String(formModel[codeField]).trim();
        if(list.some(r=> r[codeField] === code && (!isEdit || r.id !== formModel._editId))){
          ElMessage.warning(`${codeField}「${code}」已存在，不可重复`); return;
        }
        if(pid==='retain-sample'){
          for(const name of ['玻璃片留样期','玻璃片预警']){
            const v = String(formModel[name]||'').trim();
            if(v && !/^[1-9]\d*$/.test(v)){ ElMessage.warning(name + '须为正整数'); return; }
          }
        }
        if(pid===LAB_IO_FORM){
          const tplName = String(formModel['模板名称'] ?? '').trim();
          if(list.some(r=> String(r['模板名称']||'').trim() === tplName && (!isEdit || r.id !== formModel._editId))){
            ElMessage.warning(`模板名称「${tplName}」已存在，不可重复`); return;
          }
        }
        const payload = {};
        fields.forEach(f=>{
          if(f.type === 'switch'){ payload[f.name] = formSwitch[f.name] === false ? '禁用' : '启用'; return; }
          if(f.multiple){ payload[f.name] = (Array.isArray(formModel[f.name]) ? formModel[f.name] : splitDun(formModel[f.name])).join('、'); return; }
          payload[f.name] = typeof formModel[f.name] === 'string' ? formModel[f.name].trim() : (formModel[f.name] ?? '');
          if(f.type === 'number-unit'){
            const uk = f.unitName || (f.name + '单位');
            payload[uk] = payload[f.name] ? (formModel[uk] || f.defaultUnit || '') : '';
          }
        });
        payload[codeField] = code;
        if(pid==='solution' && payload['是否标定']==='否'){ payload['标定模板'] = ''; payload['标定方法依据'] = ''; }
        if(pid==='consumable' && payload['管理方式']!=='条码管理'){
          payload['有效期预警'] = '';
          payload['有效期预警单位'] = '';
        }
        if(pid===LAB_IO_FORM){
          // 适用业务单据 + 任一适用单据类型 不可与其他模板重叠（含禁用模板）
          const types = splitDun(payload['适用单据类型']).filter(Boolean);
          if(!types.length){ ElMessage.warning('请选择适用单据类型'); return; }
          const clash = list.find(r=> r['适用业务单据']===payload['适用业务单据']
            && (!isEdit || r.id !== formModel._editId)
            && splitDun(r['适用单据类型']).some(t=> types.includes(t)));
          if(clash){
            const dup = splitDun(clash['适用单据类型']).filter(t=> types.includes(t)).join('、');
            ElMessage.warning(`「${payload['适用业务单据']} / ${dup}」已存在于模板 ${clash['模板编码']}，适用业务单据+适用单据类型不可重复`); return;
          }
        }
        if(isEdit){
          const row = list.find(r=> r.id === formModel._editId);
          if(row) Object.assign(row, payload);
        } else {
          list.unshift({ id: `${pid}-${Date.now()}`, ...payload, '创建人':'管理员', '创建时间': nowStamp() });
        }
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isEdit ? '保存成功' : '新增成功');
    }

    const labArchVisible = ref(false);
    const labArchForm = reactive({});
    const labArchLines = ref([]);
