    function clearInspItemUnitDrawer(){
      inspItemUnitDrawerCurrent.value = null;
      inspItemUnitDrawerSelectedKey.value = '';
      nextTick(()=>{
        try{ inspItemUnitTableRef.value?.setCurrentRow?.(null); }catch(_e){}
      });
    }
    function openInspItemUnitDrawer(){
      inspItemUnitDrawerCurrent.value = null;
      inspItemUnitDrawerSelectedKey.value = '';
      inspItemUnitDrawerQ['单位编码']='';
      inspItemUnitDrawerQ['单位名称']='';
      inspItemUnitDrawerQ['启用状态']='启用';
      inspItemUnitDrawerTick.value++;
      inspItemUnitDrawerVisible.value = true;
      nextTick(()=>{
        try{ inspItemUnitTableRef.value?.setCurrentRow?.(null); }catch(_e){}
      });
    }
    const inspItemUnitDrawerRows = computed(()=>{
      void inspItemUnitDrawerTick.value;
      void storeTick.value;
      let list = (((MOCK['unit']||{}).main)||[]).slice();
      const c = String(inspItemUnitDrawerQ['单位编码']||'').trim();
      const n = String(inspItemUnitDrawerQ['单位名称']||'').trim();
      const st = String(inspItemUnitDrawerQ['启用状态']||'').trim();
      if(c) list = list.filter(r=> String(r['单位编码']||'').includes(c));
      if(n) list = list.filter(r=> String(r['单位名称']||'').includes(n));
      if(st) list = list.filter(r=> (r['启用状态']||'')===st);
      return list;
    });
    function confirmInspItemUnitDrawer(){
      const row = inspItemUnitDrawerCurrent.value;
      if(!row){ ElMessage.warning('请选择一条单位'); return; }
      const code = String(row['单位编码']||'').trim();
      const name = String(row['单位名称']||'').trim();
      const val = name || code;
      const target = inspItemUnitDrawerTarget.value;
      if(target==='uom1'){
        formModel['检验项单位1'] = val;
        formModel['检验项单位1编码'] = code;
      } else if(target==='uom2'){
        formModel['检验项单位2'] = val;
        formModel['检验项单位2编码'] = code;
      } else if(target==='hm-arch'){
        formModel['单位'] = val;
        formModel['单位编码'] = code;
      } else if(target==='method-mat'){
        const r = methodMatUnitRow.value;
        if(r){
          r['单位'] = val;
          r['单位编码'] = code;
        }
        methodMatUnitRow.value = null;
      } else if(target==='gather-item' || (pageId.value==='gather-item' && !(target && typeof target === 'object'))){
        formModel['采集项单位'] = val;
        formModel['采集项单位编码'] = code;
      } else if(target && typeof target === 'object'){
        if('采集项单位' in target || pageId.value==='gather-scheme'){
          target['采集项单位'] = val;
          target['采集项单位编码'] = code;
        } else {
          target['检验项单位'] = val;
        }
      } else {
        formModel['检验项单位'] = val;
      }
      inspItemUnitDrawerTarget.value = null;
      inspItemUnitDrawerVisible.value = false;
      ElMessage.success('已选择单位');
    }
    const inspItemUnitDrawerTarget = ref(null);
    function openMethodMatUnit(row){
      if(formMode.value==='detail' || !row) return;
      methodMatUnitRow.value = row;
      inspItemUnitDrawerTarget.value = 'method-mat';
      openInspItemUnitDrawer();
    }
    function openSchemeUnitDrawer(row){
      if(formMode.value==='detail') return;
      inspItemUnitDrawerTarget.value = row || null;
      openInspItemUnitDrawer();
    }

    function applyGatherFormDefaults(){
      if(pageId.value==='opc-point'){
        if(formMode.value==='add' || formMode.value==='copy'){
          formModel['同步状态'] = '未同步';
        }
      }
      if(pageId.value==='gather-item'){
        if(!formModel['采集方式']) formModel['采集方式'] = '自动';
        if(!formModel['采集频率单位']) formModel['采集频率单位'] = '秒';
      }
      if(pageId.value==='gather-scheme'){
        if(formMode.value==='add') formLineRows.value = [];
      }
    }
    function openItemUomUnitDrawer(which){
      inspItemUnitDrawerTarget.value = which==='2' || which==='uom2' ? 'uom2' : 'uom1';
      openInspItemUnitDrawer();
    }
    const isSampSchemeForm = computed(()=> pageId.value==='samp-scheme');
    const isAutoSampForm = computed(()=> pageId.value==='auto-samp');
    const isSpcSchemeForm = computed(()=> pageId.value==='spc-scheme-insp');
    const isQmsFlowForm = computed(()=> ['samp','entry','quick-entry','recheck'].includes(formMode.value));
    const isTreeTypeForm = computed(()=> /^(新增|编辑)类型$/.test(formMode.value));
    const isWideBizForm = computed(()=> !isTreeTypeForm.value && (isInspMethodForm.value || isInspSchemeForm.value || isQrConfigForm.value || isInspProjectCategoryForm.value || isSampSchemeForm.value || isAutoSampForm.value || isSpcSchemeForm.value || isQmsFlowForm.value || isDriftRuleForm.value || pageId.value==='np-0215-06' || pageId.value==='np-0215-01'));
    const isFullscreenBizForm = computed(()=> !isTreeTypeForm.value && (isQmsFlowForm.value || isInspSchemeForm.value || isQrConfigForm.value || isSampSchemeForm.value || isAutoSampForm.value || isDriftRuleForm.value || pageId.value==='gather-scheme' || formMode.value==='标签模板设计' || !!(page.value && page.value.formFullscreen) || !!(tabView.value && tabView.value.formFullscreen) || !!(page.value && page.value.formFullscreenOnAdd && ['add','copy'].includes(formMode.value)) || !!(page.value && page.value.formFullscreenOnEdit && formMode.value==='edit')));
    const isFullscreenDetail = computed(()=> !!(page.value && page.value.detailFullscreen));
    const detailHeaderTableFields = computed(()=>{
      if(!(page.value && page.value.detailHeaderAsTable)) return [];
      if(Array.isArray(page.value.detailHeaderFields) && page.value.detailHeaderFields.length){
        return page.value.detailHeaderFields.map(f=> typeof f==='string' ? { name:f, title:f } : { name:f.name||f.field, title:f.title||f.name||f.field });
      }
      const cols = (tabView.value?.columns||[]).filter(c=> c && c.field && c.field!=='_actions');
      if(cols.length) return cols.map(c=> ({ name:c.field, title:c.title||c.field }));
      return (page.value.detailFields||[]).map(f=> ({ name:f.name||f, title:f.name||f }));
    });
    const detailHeaderTableRows = computed(()=> detailRow.value ? [detailRow.value] : []);
    const sigmaConfigModel = reactive({ 'I图-σ计算':'标准法(AIAG)', 'Xbar图-σ计算':'标准法(AIAG)', 'Sbar图-σ计算':'标准法(AIAG)' });
    function loadSigmaConfig(){
      const cfg = ((MOCK['sigma-method']||{}).config) || {};
      const def = (page.value?.sigmaConfig?.defaultOption) || '标准法(AIAG)';
      ['I图-σ计算','Xbar图-σ计算','Sbar图-σ计算'].forEach(k=>{
        sigmaConfigModel[k] = cfg[k] || def;
      });
    }
    function onSigmaConfigConfirm(){
      ElementPlus.ElMessageBox.confirm(
        '变更后系统内[检验数据台账]、[SPC统计]、[控制线变更]相关指标将按新公式计算，确定变更吗？',
        '确定变更',
        { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
      ).then(()=>{
        const bag = (MOCK['sigma-method'] = MOCK['sigma-method'] || {});
        bag.config = {
          'I图-σ计算': sigmaConfigModel['I图-σ计算'],
          'Xbar图-σ计算': sigmaConfigModel['Xbar图-σ计算'],
          'Sbar图-σ计算': sigmaConfigModel['Sbar图-σ计算']
        };
        bumpStore();
        ElMessage.success('变更成功');
      }).catch(()=>{});
    }
    watch(pageId, (id)=>{
      if(id==='sigma-method') loadSigmaConfig();
    });
    const isSchemeCylinder = computed(()=> false);
    const schemeInnerTab = ref('指标集');
    const schemeQualRows = ref([]);
    const schemeQuantRows = ref([]);
    const schemeQualSelected = ref([]);
    const schemeQuantSelected = ref([]);
    const schemePointRows = ref([]);
    const schemeMatRows = ref([]);
    const schemeCustRows = ref([]);
    const schemeSuppRows = ref([]);
    const schemeMediaRows = ref([]);
    const schemeItemDrawerVisible = ref(false);
    const schemeItemDrawerKind = ref('qual'); // qual | quant
    const schemeItemDrawerSelected = ref([]);
    const schemeItemDrawerQ = reactive({ 检验项编码:'', 检验项名称:'' });
    const schemeItemDrawerTick = ref(0);
    const schemeRelDrawerVisible = ref(false);
    const schemeRelDrawerKind = ref('point'); // point|mat|cust|supp|samp-mat|qr-field
    const qrConfigInnerTab = ref('物料');
    const qrFieldRows = ref([]);
    const qrFieldSelected = ref([]);
    const qrTemplateFileOptions = computed(()=>{
      void storeTick.value;
      const bag = (window.WMS_MOCK_ROWS || MOCK)['qr-template'] || {};
      const rows = Array.isArray(bag.main) ? bag.main : [];
      return rows.filter(r=> (r['启用状态']||'启用')!=='禁用').map(r=> r['文件名称']).filter(Boolean);
    });
    function removeQrConfigFields(){
      if(formMode.value==='detail') return;
      const set = new Set((qrFieldSelected.value||[]).map(r=> r['字段名称']));
      qrFieldRows.value = (qrFieldRows.value||[]).filter(r=> !set.has(r['字段名称']));
      qrFieldSelected.value = [];
    }
    function resetQrConfigFormLists(){
      qrConfigInnerTab.value = '物料';
      schemeMatRows.value = [];
      schemeCustRows.value = [];
      schemeMatSelected.value = [];
      schemeCustSelected.value = [];
      qrFieldRows.value = [];
      qrFieldSelected.value = [];
    }
    const schemeRelDrawerSelected = ref([]);
    const schemeRelDrawerTableRef = ref(null);
    const methodMatRowCache = Object.create(null);
    function clearMethodMatRowCache(){ Object.keys(methodMatRowCache).forEach(k=> delete methodMatRowCache[k]); }
    function onSchemeRelDrawerSelect(rows){ schemeRelDrawerSelected.value = rows || []; }
    function clearSchemeRelDrawerSelect(){
      schemeRelDrawerSelected.value = [];
      try{ schemeRelDrawerTableRef.value?.clearSelection?.(); }catch(_e){}
    }
    function schemeRelDrawerRowKey(row){
      if(!row) return '';
      const kind = schemeRelDrawerKind.value;
      if(kind==='method-mat' || kind==='entry-mat') return String(row['材料编码'] || row.id || '');
      if(kind==='point' || kind==='drift-point') return String(row['采样点编码'] || row.id || '');
      if(kind==='mat' || kind==='samp-mat' || kind==='drift-mat') return String(row['物料编码'] || row['编码'] || row.id || '');
      if(kind==='cust') return String(row['客户编码'] || row.id || '');
      if(kind==='supp') return String(row['供应商编码'] || row.id || '');
      if(kind==='drift-col') return String(row['色谱柱型号'] || row.id || '');
      if(kind==='qr-field') return String(row['字段名称'] || row.id || '');
      return String(row.id || row['编码'] || JSON.stringify(row));
    }
    const sampInnerTab = ref('抽样规则');
    const sampInspectTypes = ref([]);
    const sampRuleRows = ref([]);
    const sampRuleSelected = ref([]);
    const sampMatRows = ref([]);
    const sampMatSelected = ref([]);
    const sampFormulaVisible = ref(false);
    const sampFormulaValue = ref('');
    const sampFormulaRow = ref(null);
    const autoSampDetailRows = ref([]);
    const autoSampDetailSelected = ref([]);
    function resetSchemeFormLists(){
      schemeInnerTab.value = '指标集';
      schemeQualRows.value = [];
      schemeQuantRows.value = [];
      schemeQualSelected.value = [];
      schemeQuantSelected.value = [];
      schemePointRows.value = [];
      schemeMatRows.value = [];
      schemeCustRows.value = [];
      schemeSuppRows.value = [];
      schemeMediaRows.value = [];
      schemePointSelected.value = [];
      schemeMatSelected.value = [];
      schemeCustSelected.value = [];
      schemeSuppSelected.value = [];
    }
    function resetSampFormLists(){
      sampInnerTab.value = '抽样规则';
      sampInspectTypes.value = [];
      sampRuleRows.value = [];
      sampRuleSelected.value = [];
      sampMatRows.value = [];
      sampMatSelected.value = [];
      sampFormulaVisible.value = false;
      sampFormulaValue.value = '';
      sampFormulaRow.value = null;
    }
    function onSampTypeChange(){
      sampRuleRows.value = [];
      sampRuleSelected.value = [];
    }
    function isSampRuleFirst(i){ return i === 0; }
    function isSampRuleLast(i){ return i === (sampRuleRows.value||[]).length - 1; }
    function normalizeSampRuleFixed(){
      const rows = sampRuleRows.value || [];
      if(!rows.length) return;
      rows[0]['报检件数范围左'] = 0;
      const last = rows[rows.length - 1];
      if(last) last['报检件数范围右'] = '';
    }
    function removeSchemeRows(kind){
      if(formMode.value==='detail') return;
      if(kind==='qual'){
        const set = new Set((schemeQualSelected.value||[]).map(r=>r.检验项编码));
        schemeQualRows.value = schemeQualRows.value.filter(r=>!set.has(r.检验项编码));
        schemeQualSelected.value = [];
      } else {
        const set = new Set((schemeQuantSelected.value||[]).map(r=>r.检验项编码));
        schemeQuantRows.value = schemeQuantRows.value.filter(r=>!set.has(r.检验项编码));
        schemeQuantSelected.value = [];
      }
    }

    const SCHEME_LIMIT_KEYS = ['USL','LSL','UCL','LCL','UWL','LWL','MR-UCL','MR-LCL','Xbar(R)-UCL','Xbar(R)-LCL','Xbar(S)-UCL','Xbar(S)-LCL','R-UCL','R-LCL','S-UCL','S-LCL'];
    function schemeLimitDefaultOp(key){
      const k = String(key||'');
      if(k.includes('U')) return '≤';
      if(k.includes('L')) return '≥';
      return '≤';
    }
    function schemeLimitOps(key){
      const k = String(key||'');
      if(k.includes('U')) return ['<','≤'];
      if(k.includes('L')) return ['≥','>'];
      return ['<','≤','=','≥','>'];
    }
    function emptySchemeLimit(key){
      return { op: schemeLimitDefaultOp(key), val: '' };
    }
    function normalizeSchemeLimit(v, key){
      if(v && typeof v === 'object' && ('op' in v || 'val' in v)){
        return { op: v.op || schemeLimitDefaultOp(key), val: v.val==null?'':String(v.val) };
      }
      if(v===undefined || v===null || v==='') return emptySchemeLimit(key);
      return { op: schemeLimitDefaultOp(key), val: String(v) };
    }
    function createSchemeItemRow(r, kind){
      const row = {
        检验项编码: r['检验项编码']||'',
        检验项名称: r['检验项名称']||'',
        所属检验类: r['所属检验类']||'',
        检验项单位: r['检验项单位']||'',
        检验结论合格值: r['检验结论合格值']||'',
        _enumItems: Array.isArray(r._enumItems) ? r._enumItems.map(x=>({...x})) : [],
        '检出限D.L': r['检出限D.L']||'',
        计算函数: r['计算函数']||'',
        特殊计算公式: r['特殊计算公式']||''
      };
      SCHEME_LIMIT_KEYS.forEach(k=>{ row[k] = normalizeSchemeLimit(r[k], k); });
      return row;
    }
    function hydrateSchemeItemRow(r){
      return createSchemeItemRow(r||{}, 'quant');
    }
    const GS_LIMIT_KEYS = ['USL','LSL','UCL','LCL','UWL','LWL'];
    function hydrateGatherLine(r, i){
      const src = r || {};
      const o = { _i: (i||0)+1, ...src };
      o['采集项原单位'] = src['采集项原单位'] || src['采集项单位'] || '';
      GS_LIMIT_KEYS.forEach(k=>{ o[k] = normalizeSchemeLimit(src[k], k); });
      return o;
    }
    function gatherLimitPlain(v){
      if(v && typeof v==='object') return String(v.val??'').trim();
      return String(v??'').trim();
    }
    function gatherLimitText(v, key){
      const n = normalizeSchemeLimit(v, key);
      const val = String(n.val||'').trim();
      if(!val) return '';
      return (n.op || schemeLimitDefaultOp(key)) + val;
    }
    function onSchemeFnChange(row){
      if(row && row['特殊计算公式']){
        row['特殊计算公式'] = '';
        ElMessage.info('函数类型已切换，原计算公式已清空，请重新配置');
      }
    }
    const schemePointSelected = ref([]);
    const schemeMatSelected = ref([]);
    const schemeCustSelected = ref([]);
    const schemeSuppSelected = ref([]);
    function removeSchemeRelRows(kind){
      if(formMode.value==='detail') return;
      const map = {
        point: [schemePointRows, schemePointSelected, '采样点编码'],
        mat: [schemeMatRows, schemeMatSelected, '物料编码'],
        cust: [schemeCustRows, schemeCustSelected, '客户编码'],
        supp: [schemeSuppRows, schemeSuppSelected, '供应商编码']
      };
      const cfg = map[kind];
      if(!cfg) return;
      const [listRef, selRef, key] = cfg;
      const set = new Set((selRef.value||[]).map(r=> r[key]));
      listRef.value = (listRef.value||[]).filter(r=> !set.has(r[key]));
      selRef.value = [];
    }
    const schemeQualEnumDrawerVisible = ref(false);
    const schemeQualEnumRow = ref(null);
    const schemeQualEnumDraft = ref([]);
    const schemeQualEnumSelected = ref([]);
    const schemeQualEnumEnableOther = ref(false);
    function renumberSchemeQualEnum(){
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXY'.split('');
      (schemeQualEnumDraft.value||[]).forEach((it,i)=>{ it['编码'] = letters[i] || String(i+1); });
    }
    function openSchemeQualEnumDrawer(row){
      if(formMode.value==='detail') return;
      schemeQualEnumRow.value = row;
      const items = Array.isArray(row._enumItems) ? row._enumItems.map(x=>({...x})) : [];
      schemeQualEnumEnableOther.value = items.some(x=> x['编码']==='Z');
      schemeQualEnumDraft.value = items.filter(x=> x['编码']!=='Z');
      renumberSchemeQualEnum();
      schemeQualEnumSelected.value = [];
      schemeQualEnumDrawerVisible.value = true;
    }
    function addSchemeQualEnumItem(){
      if((schemeQualEnumDraft.value||[]).length >= 25){ ElMessage.warning('普通枚举最多 25 项（A-Y）'); return; }
      schemeQualEnumDraft.value.push({ 编码:'', 结果描述:'' });
      renumberSchemeQualEnum();
    }
    function removeSchemeQualEnumItems(){
      const sel = new Set(schemeQualEnumSelected.value||[]);
      schemeQualEnumDraft.value = (schemeQualEnumDraft.value||[]).filter(r=> !sel.has(r));
      schemeQualEnumSelected.value = [];
      renumberSchemeQualEnum();
    }
    function confirmSchemeQualEnumDrawer(){
      if(formMode.value==='detail') return;
      const row = schemeQualEnumRow.value;
      if(!row) return;
      const items = (schemeQualEnumDraft.value||[]).map(x=>({ 编码:x['编码'], 结果描述:String(x['结果描述']||'').trim() }));
      if(items.some(x=> !x['结果描述'])){ ElMessage.warning('请填写结果描述'); return; }
      if(schemeQualEnumEnableOther.value){
        items.push({ 编码:'Z', 结果描述:'其他' });
      }
      row._enumItems = items;
      row['检验结论枚举值'] = items.map(x=> x['编码']+(x['结果描述']?(':'+x['结果描述']):'')).join('、');
      schemeQualEnumDrawerVisible.value = false;
      ElMessage.success('已保存枚举值');
    }

        function openSchemeItemDrawer(kind){
      if(formMode.value==='detail') return;
      schemeItemDrawerKind.value = kind||'qual';
      schemeItemDrawerSelected.value = [];
      schemeItemDrawerQ['检验项编码']='';
      schemeItemDrawerQ['检验项名称']='';
      schemeItemDrawerTick.value++;
      schemeItemDrawerVisible.value = true;
    }
    const schemeItemDrawerRows = computed(()=>{
      void schemeItemDrawerTick.value;
      const bag = (window.WMS_MOCK_ROWS || MOCK)['insp-project'] || {};
      let rows = Array.isArray(bag['tab-item']) ? bag['tab-item'].slice() : [];
      const want = schemeItemDrawerKind.value==='qual' ? '定性' : '定量';
      rows = rows.filter(r=> String(r['检验项类型']||'')===want || !r['检验项类型']);
      const c=String(schemeItemDrawerQ['检验项编码']||'').trim();
      const n=String(schemeItemDrawerQ['检验项名称']||'').trim();
      if(c) rows = rows.filter(r=> String(r['检验项编码']||'').includes(c));
      if(n) rows = rows.filter(r=> String(r['检验项名称']||'').includes(n));
      return rows;
    });
    function confirmSchemeItemDrawer(){
      const sel = schemeItemDrawerSelected.value||[];
      if(!sel.length){ ElMessage.warning('请先勾选检验项'); return; }
      const target = schemeItemDrawerKind.value==='qual' ? schemeQualRows : schemeQuantRows;
      const exist = new Set((target.value||[]).map(r=>r.检验项编码));
      const add=[];
      sel.forEach(r=>{
        const code=r['检验项编码'];
        if(!code || exist.has(code)) return;
        exist.add(code);
        add.push(createSchemeItemRow(r, schemeItemDrawerKind.value));
      });
      if(!add.length){ ElMessage.warning('所选检验项已存在或无效'); return; }
      target.value = (target.value||[]).concat(add);
      schemeItemDrawerVisible.value = false;
      ElMessage.success('已添加 '+add.length+' 个检验项');
    }
    const schemeRelDrawerTick = ref(0);
    const schemeRelDrawerQ = reactive({
      采样点编码:'', 采样点名称:'',
      物料编码:'', 物料名称:'', 物料规格:'', 物料种类:'',
      材料编码:'', 材料名称:'',
      客户编码:'', 客户名称:'', 客户类型:'',
      供应商编码:'', 供应商名称:'', 供应商类型:'',
      字段名称:'', 字段类型:'',
      色谱柱型号:'',
      启用状态:'启用'
    });
