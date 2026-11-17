    function resetSchemeRelDrawerQ(){
      Object.keys(schemeRelDrawerQ).forEach(k=> schemeRelDrawerQ[k] = (k==='启用状态' ? '启用' : ''));
      schemeRelDrawerTick.value++;
    }
    function openSchemeRelDrawer(kind){
      if(formMode.value==='detail') return;
      schemeRelDrawerKind.value = kind;
      clearMethodMatRowCache();
      clearSchemeRelDrawerSelect();
      if(kind==='method-mat' || kind==='entry-mat') methodMatSrc.value = 'reagent';
      resetSchemeRelDrawerQ();
      schemeRelDrawerVisible.value = true;
      nextTick(()=>{ try{ schemeRelDrawerTableRef.value?.clearSelection?.(); }catch(_e){} });
    }
    const schemeRelDrawerTitle = computed(()=>{
      const m={point:'采样点列表',mat:'物料列表',cust:'客户列表',supp:'供应商列表','samp-mat':'物料列表','drift-mat':'物料列表','method-mat':'选择材料','entry-mat':'选择材料','drift-point':'采样点列表','drift-col':'色谱柱型号','qr-field':'报告特殊字段'};
      return m[schemeRelDrawerKind.value]||'选择';
    });
    const schemeRelDrawerRows = computed(()=>{
      void schemeRelDrawerTick.value;
      void storeTick.value;
      const kind=schemeRelDrawerKind.value;
      const q = schemeRelDrawerQ;
      const mock = window.WMS_MOCK_ROWS || MOCK;
      let list = [];
      if(kind==='point' || kind==='drift-point'){
        const bag=mock['samp-point']||{};
        list = Array.isArray(bag.main)?bag.main.slice():[];
        const c=String(q['采样点编码']||'').trim();
        const n=String(q['采样点名称']||'').trim();
        const st=String(q['启用状态']||'').trim();
        if(c) list=list.filter(r=> String(r['采样点编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['采样点名称']||'').includes(n));
        if(st) list=list.filter(r=> (r['启用状态']||'')===st);
        const takenSrc = kind==='drift-point' ? driftPointRows.value : schemePointRows.value;
        const taken=new Set((takenSrc||[]).map(r=>r['采样点编码']));
        return list.filter(r=> !taken.has(r['采样点编码']));
      }
      if(kind==='method-mat' || kind==='entry-mat'){
        const meta = methodMatSrcMeta();
        const bag = mock[meta.page] || {};
        list = Array.isArray(bag.main) ? bag.main.slice() : [];
        list = list.filter(r=> r['启用状态']!=='禁用');
        const c=String(q['材料编码']||'').trim();
        const n=String(q['材料名称']||'').trim();
        const st=String(q['启用状态']||'').trim();
        if(c) list=list.filter(r=> String(r[meta.code]||'').includes(c));
        if(n) list=list.filter(r=> String(r[meta.name]||'').includes(n));
        if(st) list=list.filter(r=> (r['启用状态']||'')===st);
        const takenSrc = kind==='entry-mat' ? entryMats.value : inspMethodMatRows.value;
        const taken=new Set((takenSrc||[]).map(r=> r['材料编码']));
        // 缓存行对象，避免每次 computed 新建引用导致勾选无法保持
        return list.filter(r=> !taken.has(r[meta.code])).map(r=>{
          const code = r[meta.code] || '';
          const cacheKey = meta.key + ':' + code;
          let row = methodMatRowCache[cacheKey];
          if(!row){
            row = methodMatRowCache[cacheKey] = {
              ...r,
              材料编码: code,
              材料名称: r[meta.name]||'',
              材料规格: r[meta.spec]||'',
              材料种类: r[meta.kind]||'',
              单位: r[meta.unit]||'',
              材料来源: meta.label
            };
          } else {
            row['材料名称'] = r[meta.name]||'';
            row['材料规格'] = r[meta.spec]||'';
            row['材料种类'] = r[meta.kind]||'';
            row['单位'] = r[meta.unit]||'';
            row['材料来源'] = meta.label;
            row['启用状态'] = r['启用状态']||row['启用状态']||'启用';
          }
          return row;
        });
      }
      if(kind==='mat' || kind==='samp-mat' || kind==='drift-mat'){
        const bag=mock['mat-list']||{};
        list = Array.isArray(bag.main)?bag.main.slice():[];
        const c=String(q['物料编码']||'').trim();
        const n=String(q['物料名称']||'').trim();
        const sp=String(q['物料规格']||'').trim();
        const k=String(q['物料种类']||'').trim();
        const st=String(q['启用状态']||'').trim();
        if(c) list=list.filter(r=> String(r['物料编码']||r['编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['物料名称']||r['名称']||'').includes(n));
        if(sp) list=list.filter(r=> String(r['物料规格']||'').includes(sp));
        if(k) list=list.filter(r=> String(r['物料种类']||'').includes(k));
        if(st) list=list.filter(r=> (r['启用状态']||'')===st);
        const target = kind==='samp-mat' ? sampMatRows : (kind==='drift-mat' ? driftMatRows : schemeMatRows);
        const taken=new Set((target.value||[]).map(r=> r['物料编码']||r['材料编码']));
        return list.filter(r=> !taken.has(r['物料编码']||r['编码']));
      }
      if(kind==='cust'){
        const bag=mock['customer']||{};
        list = Array.isArray(bag.main)?bag.main.slice():[];
        const c=String(q['客户编码']||'').trim();
        const n=String(q['客户名称']||'').trim();
        const tp=String(q['客户类型']||'').trim();
        const st=String(q['启用状态']||'').trim();
        if(c) list=list.filter(r=> String(r['客户编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['客户名称']||'').includes(n));
        if(tp) list=list.filter(r=> String(r['客户类型']||'').includes(tp));
        if(st) list=list.filter(r=> (r['启用状态']||'')===st);
        const taken=new Set((schemeCustRows.value||[]).map(r=>r['客户编码']));
        return list.filter(r=> !taken.has(r['客户编码']));
      }
      if(kind==='supp'){
        const bag=mock['supplier']||{};
        list = Array.isArray(bag.main)?bag.main.slice():[];
        const c=String(q['供应商编码']||'').trim();
        const n=String(q['供应商名称']||'').trim();
        const tp=String(q['供应商类型']||'').trim();
        const st=String(q['启用状态']||'').trim();
        if(c) list=list.filter(r=> String(r['供应商编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['供应商名称']||'').includes(n));
        if(tp) list=list.filter(r=> String(r['供应商类型']||'').includes(tp));
        if(st) list=list.filter(r=> (r['启用状态']||'')===st);
        const taken=new Set((schemeSuppRows.value||[]).map(r=>r['供应商编码']));
        return list.filter(r=> !taken.has(r['供应商编码']));
      }
      if(kind==='qr-field'){
        const bag=mock['qr-special']||{};
        list = Array.isArray(bag.main)?bag.main.slice():[];
        const n=String(q['字段名称']||'').trim();
        const tp=String(q['字段类型']||'').trim();
        if(n) list=list.filter(r=> String(r['字段名称']||'').includes(n));
        if(tp) list=list.filter(r=> String(r['字段类型']||'')===tp);
        const taken=new Set((qrFieldRows.value||[]).map(r=>r['字段名称']));
        return list.filter(r=> !taken.has(r['字段名称']));
      }
      if(kind==='drift-col'){
        const types = (MOCK['np-0208-01']||{}).types || [];
        const mainRows = (MOCK['np-0208-01']||{}).main || [];
        // 型号字典 → 抽屉行（色谱柱厂家取该型号下首条台账的厂家）
        list = types.map(t=>{
          const name = String(t['名称']||t['色谱柱型号']||'').trim();
          const hit = mainRows.find(r=> r['色谱柱型号']===name);
          return { id:t.id, 色谱柱型号:name, 色谱柱厂家: hit ? (hit['色谱柱厂家']||'') : '' };
        });
        const n=String(q['色谱柱型号']||q['名称']||'').trim();
        if(n) list=list.filter(r=> String(r['色谱柱型号']||'').includes(n));
        const taken=new Set((driftColRows.value||[]).map(r=>r['色谱柱型号']));
        return list.filter(r=> !taken.has(r['色谱柱型号']));
      }
      return [];
    });
    const schemeRelDrawerColumns = computed(()=>{
      const kind=schemeRelDrawerKind.value;
      if(kind==='drift-col') return [{field:'色谱柱型号',title:'色谱柱型号',width:220},{field:'色谱柱厂家',title:'色谱柱厂家',width:140}];
      if(kind==='point' || kind==='drift-point') return [
        {field:'采样点编码',title:'采样点编码',width:130},{field:'采样点名称',title:'采样点名称',width:150},
        {field:'所属产线',title:'所属产线',width:130},{field:'所属车间',title:'所属车间',width:130},
        {field:'适用报检单',title:'适用报检单',width:140},{field:'备注',title:'备注',width:120},
        {field:'启用状态',title:'启用状态',width:90},{field:'创建人',title:'创建人',width:90},{field:'创建时间',title:'创建时间',width:160}
      ];
      if(kind==='method-mat' || kind==='entry-mat') return [
        {field:'材料编码',title:'材料编码',width:140},{field:'材料名称',title:'材料名称',width:180},
        {field:'材料规格',title:'材料规格',width:140},{field:'材料种类',title:'材料种类',width:120},
        {field:'单位',title:'单位',width:90},{field:'材料来源',title:'材料来源',width:100},
        {field:'启用状态',title:'启用状态',width:90}
      ];
      if(kind==='mat'||kind==='samp-mat'||kind==='drift-mat') return [
        {field:'物料编码',title:'物料编码',width:130},{field:'物料名称',title:'物料名称',width:150},
        {field:'物料规格',title:'物料规格',width:120},{field:'物料种类',title:'物料种类',width:110},
        {field:'有效期',title:'有效期',width:90},{field:'有效期单位',title:'有效期单位',width:100},
        {field:'基本单位',title:'基本单位',width:90},{field:'库存单位',title:'库存单位',width:90},
        {field:'生产单位',title:'生产单位',width:90},{field:'采购单位',title:'采购单位',width:90},
        {field:'销售单位',title:'销售单位',width:90},{field:'启用状态',title:'启用状态',width:90}
      ];
      if(kind==='cust') return [
        {field:'客户编码',title:'客户编码',width:130},{field:'客户名称',title:'客户名称',width:180},
        {field:'客户简称',title:'客户简称',width:110},{field:'客户类型',title:'客户类型',width:100},
        {field:'客户地址',title:'客户地址',width:160},{field:'客户联系人',title:'客户联系人',width:110},
        {field:'客户电话',title:'客户电话',width:120},{field:'客户邮箱',title:'客户邮箱',width:150},
        {field:'所属业务员',title:'所属业务员',width:100},{field:'备注',title:'备注',width:120},
        {field:'启用状态',title:'启用状态',width:90},{field:'创建人',title:'创建人',width:90},{field:'创建时间',title:'创建时间',width:160}
      ];
      if(kind==='supp') return [
        {field:'供应商编码',title:'供应商编码',width:130},{field:'供应商名称',title:'供应商名称',width:180},
        {field:'供应商简称',title:'供应商简称',width:110},{field:'供应商类型',title:'供应商类型',width:110},
        {field:'供应商地址',title:'供应商地址',width:160},{field:'供应商联系人',title:'供应商联系人',width:110},
        {field:'供应商电话',title:'供应商电话',width:120},{field:'供应商邮箱',title:'供应商邮箱',width:150},
        {field:'所属采购员',title:'所属采购员',width:100},{field:'备注',title:'备注',width:120},
        {field:'启用状态',title:'启用状态',width:90},{field:'创建人',title:'创建人',width:90},{field:'创建时间',title:'创建时间',width:160}
      ];
      if(kind==='qr-field') return [
        {field:'字段名称',title:'字段名称',width:160},{field:'字段类型',title:'字段类型',width:100},
        {field:'字段格式',title:'字段格式',width:160},{field:'备注',title:'备注',width:160}
      ];
      return [];
    });
    function confirmSchemeRelDrawer(){
      const sel=schemeRelDrawerSelected.value||[];
      if(!sel.length){ ElMessage.warning('请先勾选'); return; }
      const kind=schemeRelDrawerKind.value;
      if(kind==='drift-point'){
        const exist=new Set(driftPointRows.value.map(r=>r.采样点编码));
        sel.forEach(r=>{
          if(!r.采样点编码||exist.has(r.采样点编码)) return;
          exist.add(r.采样点编码);
          driftPointRows.value.push({
            采样点编码:r.采样点编码, 采样点名称:r.采样点名称||'', 所属产线:r.所属产线||'', 所属车间:r.所属车间||'',
            备注:r.备注||'', 启用状态:r.启用状态||'启用'
          });
        });
      } else if(kind==='method-mat' || kind==='entry-mat'){
        const target = kind==='entry-mat' ? entryMats : inspMethodMatRows;
        const exist=new Set(target.value.map(r=> r['材料编码']));
        sel.forEach(r=>{
          const c = r['材料编码'] || '';
          if(!c || exist.has(c)) return;
          exist.add(c);
          target.value.push(normalizeInspMethodMat({
            材料编码:c, 材料名称:r['材料名称']||'', 材料规格:r['材料规格']||'', 材料种类:r['材料种类']||'',
            单位:r['单位']||'', 材料来源:r['材料来源']||'', 用量:'', 启用状态:r['启用状态']||'启用'
          }));
        });
      } else if(kind==='drift-mat'){
        const exist=new Set(driftMatRows.value.map(r=>r.物料编码));
        sel.forEach(r=>{
          const c=r.物料编码||r.编码; if(!c||exist.has(c)) return; exist.add(c);
          driftMatRows.value.push({
            物料编码:c, 物料名称:r.物料名称||r.名称||'', 物料规格:r.物料规格||'', 物料种类:r.物料种类||'',
            基本单位:r.基本单位||'', 启用状态:r.启用状态||'启用'
          });
        });
      } else if(kind==='drift-col'){
        const exist=new Set(driftColRows.value.map(r=>r.色谱柱型号));
        sel.forEach(r=>{
          const m=r.色谱柱型号; if(!m||exist.has(m)) return; exist.add(m);
          driftColRows.value.push({ 色谱柱型号:m });
        });
      } else if(kind==='point'){
        const exist=new Set(schemePointRows.value.map(r=>r.采样点编码));
        sel.forEach(r=>{
          if(!r.采样点编码||exist.has(r.采样点编码)) return;
          exist.add(r.采样点编码);
          schemePointRows.value.push({
            采样点编码:r.采样点编码, 采样点名称:r.采样点名称||'', 所属产线:r.所属产线||'', 所属车间:r.所属车间||'',
            适用报检单:r.适用报检单||'', 备注:r.备注||'', 启用状态:r.启用状态||'启用', 创建人:r.创建人||'', 创建时间:r.创建时间||''
          });
        });
      } else if(kind==='mat'){
        const exist=new Set(schemeMatRows.value.map(r=>r.物料编码));
        sel.forEach(r=>{
          const c=r.物料编码||r.编码; if(!c||exist.has(c)) return; exist.add(c);
          schemeMatRows.value.push({
            物料编码:c, 物料名称:r.物料名称||r.名称||'', 物料规格:r.物料规格||'', 物料种类:r.物料种类||'',
            有效期:r.有效期||'', 有效期单位:r.有效期单位||'', 基本单位:r.基本单位||'', 库存单位:r.库存单位||'',
            生产单位:r.生产单位||'', 采购单位:r.采购单位||'', 销售单位:r.销售单位||'', 启用状态:r.启用状态||'启用'
          });
        });
      } else if(kind==='samp-mat'){
        const exist=new Set(sampMatRows.value.map(r=>r.物料编码));
        sel.forEach(r=>{
          const c=r.物料编码||r.编码; if(!c||exist.has(c)) return; exist.add(c);
          sampMatRows.value.push({
            物料编码:c, 物料名称:r.物料名称||r.名称||'', 物料规格:r.物料规格||'', 物料种类:r.物料种类||'',
            有效期:r.有效期||'', 有效期单位:r.有效期单位||'', 基本单位:r.基本单位||'', 库存单位:r.库存单位||'',
            生产单位:r.生产单位||'', 采购单位:r.采购单位||'', 销售单位:r.销售单位||'', 启用状态:r.启用状态||'启用'
          });
        });
      } else if(kind==='cust'){
        const exist=new Set(schemeCustRows.value.map(r=>r.客户编码));
        sel.forEach(r=>{
          if(!r.客户编码||exist.has(r.客户编码)) return; exist.add(r.客户编码);
          schemeCustRows.value.push({
            客户编码:r.客户编码, 客户名称:r.客户名称||'', 客户简称:r.客户简称||'', 客户类型:r.客户类型||'',
            客户地址:r.客户地址||'', 客户联系人:r.客户联系人||'', 客户电话:r.客户电话||'', 客户邮箱:r.客户邮箱||'',
            所属业务员:r.所属业务员||'', 备注:r.备注||'', 启用状态:r.启用状态||'启用', 创建人:r.创建人||'', 创建时间:r.创建时间||''
          });
        });
      } else if(kind==='supp'){
        const exist=new Set(schemeSuppRows.value.map(r=>r.供应商编码));
        sel.forEach(r=>{
          if(!r.供应商编码||exist.has(r.供应商编码)) return; exist.add(r.供应商编码);
          schemeSuppRows.value.push({
            供应商编码:r.供应商编码, 供应商名称:r.供应商名称||'', 供应商简称:r.供应商简称||'', 供应商类型:r.供应商类型||'',
            供应商地址:r.供应商地址||'', 供应商联系人:r.供应商联系人||'', 供应商电话:r.供应商电话||'', 供应商邮箱:r.供应商邮箱||'',
            所属采购员:r.所属采购员||'', 备注:r.备注||'', 启用状态:r.启用状态||'启用', 创建人:r.创建人||'', 创建时间:r.创建时间||''
          });
        });
      } else if(kind==='qr-field'){
        const exist=new Set((qrFieldRows.value||[]).map(r=>r.字段名称));
        sel.forEach(r=>{
          const n=r.字段名称; if(!n||exist.has(n)) return; exist.add(n);
          qrFieldRows.value.push({
            字段名称:n, 字段类型:r.字段类型||'', 字段格式:r.字段格式||'', 备注:r.备注||''
          });
        });
      }
      schemeRelDrawerVisible.value=false;
      ElMessage.success('已添加 '+sel.length+' 条');
    }
    function addSchemeMedium(){ if(formMode.value==='detail') return; schemeMediaRows.value.push({充装介质:''}); }
    function addSampRuleRow(){
      const isFirst = !(sampRuleRows.value||[]).length;
      sampRuleRows.value.push({
        报检件数范围左: isFirst ? 0 : undefined,
        报检件数范围右: '',
        取样比例: '',
        舍入规则: ''
      });
      normalizeSampRuleFixed();
    }
    function removeSampRuleRows(){
      const set = new Set(sampRuleSelected.value||[]);
      if(!set.size){ ElMessage.warning('请先勾选要删除的条件'); return; }
      sampRuleRows.value = sampRuleRows.value.filter(r=> !set.has(r));
      sampRuleSelected.value = [];
      normalizeSampRuleFixed();
    }
    function removeSampRuleRow(row){
      sampRuleRows.value = (sampRuleRows.value||[]).filter(r=> r !== row);
      sampRuleSelected.value = (sampRuleSelected.value||[]).filter(r=> r !== row);
      normalizeSampRuleFixed();
    }
    function removeSampMatRows(){
      const set = new Set(sampMatSelected.value||[]);
      if(!set.size){ ElMessage.warning('请先勾选要删除的物料'); return; }
      sampMatRows.value = sampMatRows.value.filter(r=> !set.has(r));
      sampMatSelected.value = [];
    }
    function openSampFormula(row){
      sampFormulaRow.value = row;
      sampFormulaValue.value = String(row?.['取样比例']||'');
      sampFormulaVisible.value = true;
    }
    function insertSampFormulaFn(){
      const text = 'POWER()';
      const cur = String(sampFormulaValue.value||'');
      sampFormulaValue.value = cur + text;
    }
    function confirmSampFormula(){
      const val = String(sampFormulaValue.value||'').trim();
      if(!val){ ElMessage.warning('请输入公式'); return; }
      let depth = 0;
      for(const ch of val){
        if(ch==='(') depth++;
        else if(ch===')'){ depth--; if(depth<0){ ElMessage.error('公式括号不匹配'); return; } }
      }
      if(depth!==0){ ElMessage.error('公式括号不匹配'); return; }
      if(sampFormulaRow.value) sampFormulaRow.value['取样比例'] = val;
      sampFormulaVisible.value = false;
    }
    function validateSampRules(){
      if(formModel['抽样类型'] !== '抽检') return true;
      const rows = sampRuleRows.value || [];
      if(!rows.length){ ElMessage.error('取样规则设置未设置'); return false; }
      for(let i=0;i<rows.length;i++){
        const r = rows[i];
        const left = r['报检件数范围左'];
        const right = r['报检件数范围右'];
        const prop = String(r['取样比例']||'').trim();
        const round = r['舍入规则'];
        if(i===0){ /* left fixed 0 */ }
        else if(left==null || left==='' || Number(left)<1){ ElMessage.error('第'+(i+1)+'行：请输入报检件数范围(左)'); return false; }
        if(i !== rows.length-1){
          if(right==null || right==='' || Number(right)<1){ ElMessage.error('第'+(i+1)+'行：请输入报检件数范围(右)'); return false; }
          if(left!=null && left!=='' && Number(right)<=Number(left)){ ElMessage.error('第'+(i+1)+'行：报检件数范围(右)>报检件数范围(左)'); return false; }
        }
        if(!prop){ ElMessage.error('第'+(i+1)+'行：请输入取样比例'); return false; }
        if(/^-?\d+(\.\d+)?$/.test(prop) && Number(prop)<=0){ ElMessage.error('第'+(i+1)+'行：取样比例必须大于0'); return false; }
        if(!round){ ElMessage.error('第'+(i+1)+'行：请选择舍入规则'); return false; }
      }
      return true;
    }
    const autoSampPickVisible = ref(false);
    const autoSampPickKind = ref('mat');
    const autoSampPickRow = ref(null);
    const autoSampPickCurrent = ref(null);
    const autoSampPickSelected = ref([]);
    const autoSampPickTick = ref(0);
    const autoSampPickQ = reactive({
      物料编码:'', 物料名称:'',
      产线编码:'', 产线名称:'',
      采样点编码:'', 采样点名称:'',
      班组编码:'', 班组名称:'',
      检验方案编码:'', 检验方案名称:'',
      检验项编码:'', 检验项名称:''
    });
    const autoSampPickMulti = computed(()=> ['scheme-items','temp-items'].includes(autoSampPickKind.value));
    const autoSampPickTitle = computed(()=>{
      const m={mat:'物料列表',line:'产线列表',point:'采样点列表',team:'检验班组列表',scheme:'检验方案列表','scheme-items':'方案项目列表','temp-items':'临时项目列表'};
      return m[autoSampPickKind.value]||'选择';
    });
    function resetAutoSampPickQ(){
      Object.keys(autoSampPickQ).forEach(k=> autoSampPickQ[k]='');
      autoSampPickTick.value++;
    }
    function openAutoSampPick(kind, row){
      autoSampPickKind.value = kind;
      autoSampPickRow.value = row;
      autoSampPickCurrent.value = null;
      autoSampPickSelected.value = [];
      resetAutoSampPickQ();
      autoSampPickVisible.value = true;
    }
    const ioPickVisible = ref(false);
    const ioPickKind = ref('mat');
    const ioPickCurrent = ref(null);
    const ioPickTick = ref(0);
    const ioPickQ = reactive({ code:'', name:'' });
    const ioPickWh = ref('');
    const RETAIN_WH_OPTS = computed(()=>{
      void storeTick.value;
      return ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']!=='禁用').map(w=> w['仓库名称']);
    });
    const LAB_ARCH_LOC_PAGES = ['reagent-arch', 'solution-arch', 'ref-material-arch', 'retain-sample-arch', 'consumable-arch'];
    const labArchLocOpts = computed(()=>{
      void storeTick.value;
      return (((MOCK.warehouse||{}).tab2)||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r['库位名称']).filter(Boolean);
    });
    function labArchWhOfLoc(name){
      const loc = String(name||'').trim();
      if(!loc) return '';
      const row = (((MOCK.warehouse||{}).tab2)||[]).find(r=> r['库位名称']===loc && r['启用状态']!=='禁用');
      return row ? retainWhFromLocRow(row) : '';
    }
    function onLabArchLocChange(name){
      labArchForm['存储仓库'] = labArchWhOfLoc(name);
    }
    function retainLocText(wh, loc){ return [wh, loc].filter(Boolean).join(' / '); }
    function retainWhFromLocRow(r){
      const opts = RETAIN_WH_OPTS.value || [];
      const parts = String((r && r['所属仓库']) || '').split(/[、,，]/).map(s=> s.trim()).filter(Boolean);
      return parts.find(p=> opts.includes(p)) || parts[0] || '';
    }
    function openRetainLocPick(wh, bind){
      if(!wh){ ElMessage.warning('请先选择留样仓库'); return; }
      ioPickWh.value = wh;
      openIoPick('retainLoc', bind, '留样库位');
    }
    const IO_PICK_META = {
      customer: { title:'选择客户', src:'customer', codeField:'客户编码', nameField:'客户名称',
        cols:[['客户编码',140],['客户名称',220],['客户简称',140],['客户类型',120]] },
      supplier: { title:'选择供应商', src:'supplier', codeField:'供应商编码', nameField:'供应商名称',
        cols:[['供应商编码',140],['供应商名称',220],['供应商简称',140],['供应商类型',120]] },
      mat: { title:'选择物料', src:'mat-list', codeField:'物料编码', nameField:'物料名称',
        cols:[['物料编码',140],['物料名称',180],['物料规格',120],['物料种类',120],['基本单位',90]] },
      point: { title:'选择采样点', src:'samp-point', codeField:'采样点编码', nameField:'采样点名称',
        cols:[['采样点编码',130],['采样点名称',180],['所属产线',140],['所属车间',130],['适用报检单',160]] },
      line: { title:'选择产线', src:'prod-line', codeField:'产线编码', nameField:'产线名称',
        cols:[['产线编码',140],['产线名称',200],['所属车间',180],['备注',200]] },
      sampleCustomer: { title:'选择来样单位 · 客户', src:'customer', codeField:'客户编码', nameField:'客户名称',
        cols:[['客户编码',140],['客户名称',220],['客户简称',120],['客户类型',110],['客户联系人',110],['客户电话',130]] },
      sampleSupplier: { title:'选择来样单位 · 供应商', src:'supplier', codeField:'供应商编码', nameField:'供应商名称',
        cols:[['供应商编码',140],['供应商名称',220],['供应商简称',120],['供应商类型',110],['供应商联系人',110],['供应商电话',130]] },
      retainLoc: { title:'选择留样库位', src:'warehouse', tab:'tab2', codeField:'库位编码', nameField:'库位名称',
        cols:[['库位编码',130],['库位名称',150],['所属仓库',150],['库位位置',140],['库位用途',160]] },
      inspCat: { title:'选择检验类', src:'insp-project', tab:'tab-category', codeField:'检验类编码', nameField:'检验类名称', byName:true,
        cols:[['检验类编码',140],['检验类名称',160],['检验类属性',110],['适用仪器类型',140]] },
      inspTeam: { title:'选择班组', src:'insp-team', codeField:'班组编码', nameField:'班组名称', byName:true,
        cols:[['班组编码',160],['班组名称',180],['备注',280]] },
      person: { title:'选择人员', src:'np-0407-02', codeField:'工号', nameField:'姓名',
        cols:[['工号',110],['姓名',100],['部门',150],['岗位',120],['角色',160],['在职状态',90]] },
      solution: { title:'选择试液', src:'solution', codeField:'试液编码', nameField:'试液名称',
        cols:[['试液编码',140],['试液名称',200],['试液规格',140],['试液种类',120],['计量单位',90],['配液模板',240]] },
      seSrcUq: { title:'选择来源单号 · 采购来料不合格（已处理）', src:'unqual-pi', tab:'tab-done', codeField:'处置单号', nameField:'物料名称',
        cols:[['处置单号',160],['供应商名称',170],['物料名称',170],['报检批号',120],['问题大类',90],['问题小类',100],['处置时间',160]] },
      seSrcDv: { title:'选择来源单号 · 采购来料偏差（已处理）', src:'dev-pi', tab:'tab-done', codeField:'处置单号', nameField:'物料名称',
        cols:[['处置单号',160],['供应商名称',170],['物料名称',170],['报检批号',120],['问题大类',90],['问题小类',100],['处置时间',160]] },
      srEvent: { title:'选择来源单号 · 供应商事件', src:'np-0213-01', tab:'main', codeField:'事件单号', nameField:'供应商名称',
        cols:[['事件单号',110],['事件类型',130],['供应商名称',170],['事件日期',110],['问题大类',90],['问题小类',100],['物料信息',220],['批号',120]] },
      calibArch: { title:'选择试液档案', src:'solution-arch', codeField:'条码号', nameField:'试液名称',
        cols:[['条码号',140],['试液编码',120],['试液名称',180],['试液规格',120],['批号',120],['建档数量',90],['计量单位',80],['生产日期',110],['失效日期',110]] },
      inst: { title:'选择仪器', src:'instrument', codeField:'仪器编号', nameField:'仪器名称',
        cols:[['仪器编号',130],['仪器名称',170],['仪器条码',130],['仪器类型',90],['规格型号',150],['存放位置',150],['责任部门',110],['责任人',90],['使用状态',90]] },
      part: { title:'选择备件', src:'mat-list', codeField:'物料编码', nameField:'物料名称',
        cols:[['物料编码',150],['物料名称',170],['物料规格',180],['物料种类',110],['基本单位',90]] },
      msaStd: { title:'选择标准物质', src:'ref-material-arch', codeField:'条码号', nameField:'标准物质名称',
        cols:[['条码号',140],['标准物质编码',120],['标准物质名称',170],['批号',120],['供应商名称',200],['开封状态',90],['失效日期',110]] },
      msaItem: { title:'选择检验项', src:'insp-project', tab:'tab-item', codeField:'检验项编码', nameField:'检验项名称',
        cols:[['检验项编码',130],['检验项名称',170],['检验项类型',90],['所属检验类',120],['检验项单位',90],['检出限D.L',90]] },
      spcItem: { title:'选择检验项（定量）', src:'insp-project', tab:'tab-item', codeField:'检验项编码', nameField:'检验项名称',
        cols:[['检验项编码',130],['检验项名称',170],['检验项类型',90],['所属检验类',120],['检验项单位',90]] },
      hmItem: { title:'选择检验项目', src:'insp-project', tab:'tab-item', codeField:'检验项编码', nameField:'检验项名称',
        cols:[['检验项编码',140],['检验项名称',180],['检验项类型',100],['所属检验类',140],['检验项单位',100]] },
      oeItem: { title:'选择检验项目', src:'insp-project', tab:'tab-item', codeField:'检验项编码', nameField:'检验项名称',
        cols:[['检验项编码',140],['检验项名称',180],['检验项类型',100],['所属检验类',140],['检验项单位',100]] },
      oeSample: { title:'选择样品', codeField:'样品编号', nameField:'物料名称',
        cols:[['样品编号',140],['样品状态',90],['报检类型',120],['报检单号',150],['物料编码',140],['物料名称',180],['物料规格',120],['报检批号',130]] },
      qrIssueOrder: { title:'选择来源单号 · 已完成报检单', codeField:'报检单号', nameField:'物料名称',
        cols:[['报检单号',160],['单据状态',90],['物料编码',130],['物料名称',160],['物料规格',110],['报检批号',120],['客户名称',140],['供应商名称',140]] },
      qrIssueSample: { title:'选择样品 · 样品检验台账', codeField:'样品编号', nameField:'物料名称',
        cols:[['样品编号',140],['样品状态',90],['样品来源',100],['报检单号',150],['物料编码',130],['物料名称',160],['物料规格',110],['报检批号',120]] },
      hmStd: { title:'选择厂内标准', src:'np-0215-01', tab:'tab-1', codeField:'标准编号', nameField:'标准名称',
        cols:[['标准编号',140],['标准名称',220],['版本',80],['物质项数',100],['启用状态',90]] },
      hmArchStd: { title:'选择标准', src:'np-0215-01', tab:'main', codeField:'标准编号', nameField:'标准名称',
        cols:[['标准编号',110],['标准名称',200],['英文名称',160],['CAS No',120],['单位',80],['物料类',120]] },
      gatherItem: { title:'选择采集项目', src:'gather-item', codeField:'采集项编码', nameField:'采集项名称',
        cols:[['采集项编码',130],['采集项名称',140],['采集项单位',100],['采集方式',90],['采集频率',100],['点位名称',160],['采集平台',140],['备注',120],['启用状态',90],['创建人',90],['创建时间',160]] },
      gatherScheme: { title:'选择采集方案', src:'gather-scheme', codeField:'采集方案编码', nameField:'采集方案名称', byName:true,
        cols:[['采集方案编码',150],['采集方案名称',180],['备注',160],['启用状态',90],['创建人',90],['创建时间',160]] },
      inspScheme: { title:'选择检验方案', src:'insp-scheme', codeField:'检验方案编码', nameField:'检验方案名称',
        cols:[['检验方案编码',150],['检验方案名称',200],['检验类型',110],['适用采样点',160],['适用物料',180],['检验项信息',220],['启用状态',90]] },
      chromDriftRule: { title:'选择漂移规则', src:'np-0208-02', codeField:'规则编码', nameField:'规则名称',
        cols:[['规则编码',140],['规则名称',220],['规则分类',90],['适用检验类型',200],['启用状态',90]] }
    };
