    function instView(r, st){
      const v = { ...r };
      v['仪器状态'] = st.get(r.id) || '';
      ['内校','外校'].forEach(w=>{
        const u = w==='内校' ? '小时' : '天';
        v[w+'周期'] = njQty(r, w+'周期', u);
        v[w+'预警周期'] = njQty(r, w+'预警周期', u);
      });
      return v;
    }
    function instQueryRows(){
      const st = instStatusMap();
      let list = djInstruments();
      if(instTypeId.value) list = list.filter(r=> r['仪器类型']===instTypeId.value);
      else if(instTypeKwApplied.value){
        const names = new Set(instTypeList.value.map(t=> t['仪器类型']));
        list = list.filter(r=> names.has(r['仪器类型']));
      }
      let l = applyContainsExactQuery(list.map(r=> instView(r, st)), query, ['仪器编号','仪器名称','仪器条码','规格型号','存放位置','责任部门','责任人'], ['使用状态']);
      const qs = query['仪器状态'];
      if(qs) l = l.filter(r=> String(r['仪器状态']||'').split(',').includes(qs));
      return sortByCreateTimeDesc(l);
    }
    function instColumns(){
      const types = instTypeId.value ? [instTypeOf(instTypeId.value)].filter(Boolean) : instTypes();
      const base = new Set(INST_BASE_REQ), other = new Set(), cfg = new Set();
      types.forEach(t=>{
        (t['基础字段']||[]).forEach(f=> base.add(f));
        (t['其他信息']||[]).forEach(w=> other.add(w));
        (t['配置字段']||[]).forEach(id=> cfg.add(id));
      });
      const cols = INST_LIST_COLS.filter(f=> base.has(f)).map(f=>
        f==='仪器状态' || f==='使用状态' ? { title:f, field:f, slot:'tag' } : f==='仪器图片' ? { title:f, field:f, slot:'link' } : { title:f, field:f });
      INST_PLAN_FIELDS.forEach(f=> cols.push({ title:f, field:f }));
      ['内校','外校'].filter(w=> other.has(w)).forEach(w=> INST_OTHER_COLS[w].forEach(([field, title])=> cols.push({ title, field })));
      instCfgFields().filter(f=> cfg.has(f.id)).forEach(f=> cols.push({ title: f['字段名称'], field: f.id }));
      ['创建人','创建时间'].filter(f=> base.has(f)).forEach(f=> cols.push({ title:f, field:f }));
      cols.push({ title:'操作', field:'_actions', width:150 });
      return cols;
    }
    function instImageUrl(row){
      const label = String(row['仪器编号']||'').replace(/[<&>]/g, '');
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#f8fafc"/>'
        + '<rect x="110" y="70" width="260" height="150" rx="12" fill="#e0f2fe" stroke="#0284c7" stroke-width="6"/><rect x="140" y="98" width="130" height="70" rx="6" fill="#0ea5e9"/>'
        + '<circle cx="320" cy="115" r="16" fill="#0284c7"/><circle cx="320" cy="160" r="10" fill="#38bdf8"/><rect x="150" y="220" width="180" height="16" rx="4" fill="#64748b"/>'
        + '<text x="240" y="285" font-size="26" text-anchor="middle" fill="#334155" font-family="sans-serif">'+label+'</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    }
    function previewInstImage(row){
      if(!row || !row['仪器图片']){ ElMessage.info('暂无仪器图片'); return; }
      colImgUrl.value = instImageUrl(row);
    }

    const instFormVisible = ref(false);
    const instFormMode = ref('add');
    const instFormTitle = computed(()=> ({ add:'新增', edit:'编辑', copy:'复制', detail:'详情' }[instFormMode.value]||'新增'));
    const instFormType = computed(()=>{ storeTick.value; return instTypeOf(formModel['仪器类型']); });
    const instFormBase = computed(()=>{
      const t = instFormType.value;
      const base = !t ? INST_FORM_BASE : INST_FORM_BASE.filter(f=> (t['基础字段']||[]).includes(f) || INST_BASE_REQ.includes(f));
      const i = base.indexOf('仪器类型');
      const list = base.slice();
      list.splice(i >= 0 ? i + 1 : base.length, 0, ...INST_PLAN_FIELDS);
      return list;
    });
    const instFormCfg = computed(()=>{
      const ids = new Set((instFormType.value||{})['配置字段']||[]);
      return instCfgFields().filter(f=> ids.has(f.id));
    });
    const instFormOther = computed(()=> ((instFormType.value||{})['其他信息'])||[]);
    /** 日/周/月/年计划时长：按仪器类型带入，可修改 */
    function fillInstPlan(){
      const t = instFormType.value;
      INST_PLAN_FIELDS.forEach(k=>{ formModel[k] = t && t[k]!=null ? Number(t[k]).toFixed(1) : ''; });
    }
    function instFormDefaults(){
      if(!formModel['使用状态']) formModel['使用状态'] = '在用';
      ['内校','外校'].forEach(w=>{
        const u = w==='内校' ? '小时' : '天';
        if(!formModel['是否'+w]) formModel['是否'+w] = '是';
        if(!formModel['上次'+w+'结果']) formModel['上次'+w+'结果'] = '合格';
        if(!formModel[w+'周期单位']) formModel[w+'周期单位'] = u;
        if(!formModel[w+'预警周期单位']) formModel[w+'预警周期单位'] = u;
      });
    }
    function openInstForm(mode, row){
      Object.keys(formModel).forEach(k=> delete formModel[k]);
      instFormMode.value = mode;
      const raw = row ? (djInstruments().find(r=> r.id===row.id) || row) : null;
      if(raw){
        Object.assign(formModel, JSON.parse(JSON.stringify(raw)));
        formModel['责任部门'] = splitDun(raw['责任部门']);
        ['内校','外校'].forEach(w=> [w+'周期', w+'预警周期'].forEach(k=>{
          const v = String(raw[k]||'').trim();
          if(v && !/^\d+$/.test(v)){ const q = parseQtyUnit(v, ''); formModel[k] = q.n; if(q.u) formModel[k+'单位'] = q.u; }
        }));
        ['上次内校日期','下次内校日期'].forEach(k=>{ if(/^\d{4}-\d{2}-\d{2}$/.test(raw[k]||'')) formModel[k] = raw[k] + ' 00:00'; });
        instCfgFields().forEach(f=>{ if(f['字段属性']==='字典表') formModel[f.id] = splitDun(raw[f.id]); });
        formModel._instBarcodeSyncedFrom = raw['仪器编号'];
        if(mode==='copy'){ delete formModel.id; delete formModel._pending; formModel['仪器编号'] = ''; formModel['仪器条码'] = ''; formModel._instBarcodeSyncedFrom = ''; }
      } else {
        formModel['仪器类型'] = instTypeId.value || '';
        formModel['责任部门'] = [];
      }
      INST_PLAN_FIELDS.forEach(k=>{ if(formModel[k]==null || formModel[k]===''){ const t = instFormType.value; formModel[k] = t && t[k]!=null ? Number(t[k]).toFixed(1) : ''; } });
      if(mode!=='detail') instFormDefaults();
      instFormVisible.value = true;
    }
    function onInstCodeInput(){
      const code = String(formModel['仪器编号']||'');
      const bc = String(formModel['仪器条码']||'');
      if(!bc || bc===formModel._instBarcodeSyncedFrom) formModel['仪器条码'] = code;
      formModel._instBarcodeSyncedFrom = code;
    }
    function calcInstNext(w){
      const base = djParseTime(formModel['上次'+w+'日期']);
      const n = String(formModel[w+'周期']||'').trim();
      if(!base || !/^[1-9]\d*$/.test(n)){ formModel['下次'+w+'日期'] = ''; return; }
      const d = djFmtTime(djShift(base, n + (formModel[w+'周期单位']||''), '天'));
      formModel['下次'+w+'日期'] = w==='内校' ? d : d.slice(0, 10);
    }
    function onInstCycleInput(w, key){
      formModel[key] = String(formModel[key]||'').replace(/\D/g, '').replace(/^0+/, '');
      if(key===w+'周期') calcInstNext(w);
    }
    function pickInstSupplier(){
      if(instFormMode.value==='detail') return;
      openIoPick('supplier', 'respSupplier', '上次外校单位');
    }
    function saveInstForm(){
      const txt = k=>{ const v = formModel[k]; return Array.isArray(v) ? v.filter(Boolean).join('、') : String(v==null ? '' : v).trim(); };
      const t = instFormType.value;
      if(!t){ ElMessage.warning('请选择仪器类型'); return; }
      for(const k of ['仪器编号','仪器名称','使用状态']){ if(!txt(k)){ ElMessage.warning('请填写'+k); return; } }
      for(const k of INST_PLAN_FIELDS){
        const v = txt(k);
        if(!v || !(Number(v) > 0)){ ElMessage.warning('请填写'+k+'（正数，保留一位小数）'); return; }
        formModel[k] = Number(v).toFixed(1);
      }
      const isEdit = instFormMode.value==='edit';
      const code = txt('仪器编号'), bc = txt('仪器条码') || code;
      const others = djInstruments().filter(r=> !isEdit || r.id!==formModel.id);
      if(others.some(r=> r['仪器编号']===code)){ ElMessage.warning('仪器编号「'+code+'」已存在，仪器编号需唯一'); return; }
      if(others.some(r=> (r['仪器条码']||r['仪器编号'])===bc)){ ElMessage.warning('仪器条码「'+bc+'」已存在，仪器条码需唯一'); return; }
      const other = t['其他信息']||[];
      for(const w of other){
        if(formModel['是否'+w]!=='是') continue;
        if(!txt('上次'+w+'日期')){ ElMessage.warning('请选择'+(w==='内校' ? '本次内校时间' : '本次外校日期')); return; }
        if(!txt('上次'+w+'结果')){ ElMessage.warning('请选择本次'+w+'结果'); return; }
        if(!/^[1-9]\d*$/.test(txt(w+'周期'))){ ElMessage.warning('请输入'+w+'周期（正整数）'); return; }
        calcInstNext(w);
      }
      const payload = {};
      instFormBase.value.forEach(f=>{ payload[f] = txt(f); });
      payload['仪器条码'] = bc;
      ['内校','外校'].forEach(w=>{
        const keys = ['上次'+w+'日期','上次'+w+'结果', w+'周期', w+'周期单位', w+'预警周期', w+'预警周期单位', '下次'+w+'日期'].concat(w==='外校' ? ['上次外校单位','上次外校单位编码'] : []);
        if(other.includes(w)){
          payload['是否'+w] = formModel['是否'+w]==='是' ? '是' : '否';
          keys.forEach(k=>{ payload[k] = payload['是否'+w]==='是' ? txt(k) : ''; });
        } else if(!isEdit){
          payload['是否'+w] = '否';
          keys.forEach(k=>{ payload[k] = ''; });
        }
      });
      instFormCfg.value.forEach(f=>{ payload[f.id] = txt(f.id); });
      let cur;
      if(isEdit){
        cur = djInstruments().find(r=> r.id===formModel.id);
        if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
        Object.assign(cur, payload);
      } else {
        cur = Object.assign({ id:'eq-'+Date.now(), 仪器状态:'正常' }, payload, { 创建人:'管理员', 创建时间: nowStamp() });
        instBag().main = instBag().main || [];
        instBag().main.unshift(cur);
      }
      instFormVisible.value = false;
      bumpStore();
      ElMessage.success(isEdit ? '保存成功' : '已新增仪器 '+code);
    }

    function instRefsOf(r){
      const needle = '"_instId":"'+r.id+'"';
      return [DJ_SCHEME, DJ_PLAN, BY_SCHEME, BY_PLAN, HC_SCHEME, HC_PLAN, NJ_SCHEME, NJ_PLAN, WJ_ORDER, WX_PAGE, BX_PAGE, WO_PAGE, YS_PAGE, TY_PAGE, QY_PAGE, BF_PAGE, DB_PAGE, YL_PAGE, MSA_PAGE]
        .filter(p=> JSON.stringify(MOCK[p]||{}).includes(needle))
        .map(p=> (CFG.pages[p]||{}).title || p);
    }
    function deleteInstRows(picked){
      if(!picked.length){ ElMessage.warning('请先勾选要删除的仪器'); return; }
      const used = picked.map(r=> ({ r, refs: instRefsOf(r) })).filter(x=> x.refs.length);
      if(used.length){
        ElMessage.warning({ message: '仪器 '+used.map(x=> x.r['仪器编号']+'（已被'+x.refs.join('、')+'引用）').join('；')+' 不可删除', duration: 5000 });
        return;
      }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+picked.length+' 台仪器？', '批量删除', { type:'warning' }).then(()=>{
        const ids = new Set(picked.map(r=> r.id));
        const list = djInstruments();
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 台仪器');
      }).catch(()=>{});
    }
    function jumpInstPage(pid, tab, nos, key){
      const p = CFG.pages[pid];
      const k = key || '仪器编号';
      if(!p){ ElMessage.warning('未找到对应模块'); return; }
      onSelectMenu(pid);
      if(p.stub){ ElMessage.info('已跳转至「'+p.title+'」，该模块原型待完善'); return; }
      setTimeout(()=>{
        if(tab) activeTab.value = tab;
        setTimeout(()=>{
          resetQueryModel();
          query[k] = nos.join('、');
          ElMessage.success('已跳转至「'+p.title+'」并按'+k+'过滤');
        }, 80);
      }, 0);
    }
    const instLinkVisible = ref(false);
    const instLinkNos = ref([]);
    const instLinkRows = computed(()=>{
      if(!instLinkVisible.value) return [];
      const nos = new Set(instLinkNos.value);
      const cnt = {};
      ylRows().forEach(r=>{ const p = (r._src||{}).page; if(p && nos.has(r['仪器编号'])) cnt[p] = (cnt[p]||0) + 1; });
      const insts = new Map(djInstruments().map(r=> [r.id, r['仪器编号']]));
      ((MOCK[HC_PLAN]||{})['tab-1']||[]).forEach(p=>{ if(p['计划状态']==='已完成' && nos.has(insts.get(p._instId))) cnt[HC_PLAN] = (cnt[HC_PLAN]||0) + 1; });
      [[BX_PAGE, bxRows()], [CL_PAGE, clRecords()], [WO_PAGE, woRows()], [YS_PAGE, ysRecords()], [TY_PAGE, tyRows(TY_PAGE)], [QY_PAGE, tyRows(QY_PAGE)], [BF_PAGE, tyRows(BF_PAGE)]].forEach(([pid, list])=>{
        cnt[pid] = list.filter(r=> nos.has(insts.get(r._instId))).length;
      });
      return INST_LINK_MODS.filter(([pid])=> CFG.pages[pid]).map(([pid, tab])=>{
        const p = CFG.pages[pid];
        const tl = tab ? ((p.tabs||[]).find(x=> x.name===tab)||{}).label : '';
        return { pid, tab, 仪器流水: p.title + (tl ? ' / '+tl : ''), 关联记录数: cnt[pid] || 0 };
      });
    });
    function openInstLink(picked){
      if(!picked.length){ ElMessage.warning('请先勾选仪器'); return; }
      instLinkNos.value = picked.map(r=> r['仪器编号']);
      instLinkVisible.value = true;
    }
    function goInstLink(row){
      instLinkVisible.value = false;
      jumpInstPage(row.pid, row.tab, instLinkNos.value);
    }
    const instIoTip = computed(()=>{
      if(pageId.value!==INST_PAGE) return '';
      const fields = instColumns().filter(c=> c.field!=='_actions' && !['仪器状态','创建人','创建时间'].includes(c.field)).map(c=> c.title);
      return (instTypeId.value ? '按仪器类型「'+instTypeId.value+'」' : '按所有仪器类型') + '的字段生成：' + fields.join('、');
    });
    function onInstToolbar(btn){
      const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(btn.name==='新增'){ openInstForm('add'); return true; }
      if(btn.name==='查看履历'){
        if(picked.length!==1){ ElMessage.warning('请勾选一台仪器查看履历'); return true; }
        jumpInstPage(YL_PAGE, '', [picked[0]['仪器编号']]);
        return true;
      }
      if(btn.name==='打印标签'){ openPrintLabel(picked); return true; }
      if(btn.name==='关联查询'){ openInstLink(picked); return true; }
      if(btn.name==='导入'){
        if(!instTypeId.value){ ElMessage.warning('请先选择左侧仪器类型，导入模板按该类型的字段生成'); return true; }
        importVisible.value = true;
        return true;
      }
      if(btn.name==='导出'){ exportVisible.value = true; return true; }
      if(btn.name==='批量删除'){ deleteInstRows(picked); return true; }
      return false;
    }
    const COST_PAGE = 'np-0103-14', COST_FLOW = 'np-0409-01', COST_STAT = 'np-0409-02';
    function costNum(v){ const n = parseFloat(v); return isNaN(n) ? 0 : n; }
    function costHourRaw(row){
      if(!row) return '';
      const v = (row['标准系数']!=null && row['标准系数']!=='') ? row['标准系数']
        : (row['工时']!=null && row['工时']!=='') ? row['工时']
        : row['标准工时'];
      return String(v==null ? '' : v).trim();
    }
    function costHourHours(row){
      const raw = costHourRaw(row);
      if(!raw || raw==='—') return 0;
      const m = raw.match(/^(-?\d+(?:\.\d+)?)/);
      if(!m) return 0;
      const n = parseFloat(m[1]);
      return isNaN(n) ? 0 : n;
    }
    function costHourText(n){ return (Math.round(n * 100) / 100).toFixed(2); }
    function costHourParts(row){
      const raw = costHourRaw(row);
      if(!raw || raw==='—') return { n: '' };
      const m = raw.match(/^(-?\d+(?:\.\d+)?)/);
      return { n: m ? m[1] : String(raw).replace(/\s*(分|时)$/, '') };
    }
    function costHourFormat(num){
      return costNum(num).toFixed(2);
    }
    function costFlowRows(){
      const bag = (MOCK[COST_FLOW] = MOCK[COST_FLOW] || {});
      const prev = bag.main || [];
      const edited = {};
      prev.forEach(r=>{ if(r && r._coeffEdited) edited[r.id] = r['标准系数']; });
      if(!bag._fromLedger){
        const list = costBuildFlows();
        list.forEach(r=>{
          if(edited[r.id]!=null){ r['标准系数'] = edited[r.id]; r._coeffEdited = true; }
        });
        bag.main = list;
        bag._fromLedger = true;
      }
      (bag.main||[]).forEach(r=>{
        if(!r) return;
        if(r['标准系数']!=null && r['标准系数']!=='' && r['标准系数']!=='—') r['标准系数'] = costHourFormat(r['标准系数']);
      });
      return bag.main || [];
    }
    function costBuildFlows(){
      const rules = costRules().filter(r=> r['启用状态']==='启用');
      const match = (cat, code)=>{
        for(const rule of rules){
          if(!splitDun(rule['检验类']).includes(cat)) continue;
          const mats = splitDun(rule['物料编码']).filter(c=> c && c!=='—');
          if(code && mats.includes(code)) return rule;
        }
        return null;
      };
      const typeOf = {
        'tab-pi':'采购来料检','tab-pp':'生产过程检','tab-pm':'生产物料检','tab-sst':'生产SST检',
        'tab-rd':'研发检','tab-ext':'外来小样检','tab-wr':'库内复检','tab-gen':'通用检','tab-oe':'内部委托'
      };
      const dash = v=> (v==null || String(v).trim()==='' || v==='—') ? '—' : v;
      const out = [];
      Object.keys(typeOf).forEach(tab=>{
        ((MOCK.ledger||{})[tab]||[]).forEach(s=>{
          if(!s || s['样品状态']!=='已完成') return;
          const items = ledgerInspItems(s);
          const cats = [];
          items.forEach(it=>{
            const c = it['所属检验类'];
            if(c && c!=='—' && !cats.includes(c)) cats.push(c);
          });
          if(!cats.length) return;
          const matCode = (s['物料编码'] && s['物料编码']!=='—') ? s['物料编码'] : '';
          cats.forEach(cat=>{
            const rule = match(cat, matCode);
            out.push({
              id: 'cs-'+(s['样品编号']||s.id)+'-'+cat,
              报检单号: dash(s['报检单号']),
              研发项目号: dash(s['研发项目号']),
              样品编号: dash(s['样品编号']),
              报检类型: typeOf[tab],
              报检批号: dash(s['报检批号']),
              样品来源: dash(s['样品来源']),
              检验结论: dash(s['检验结论']),
              送检人: dash(s['报检人']),
              部门: dash(s['报检部门']),
              报检时间: dash(s['报检时间']),
              物料编码: dash(s['物料编码']),
              物料名称: dash(s['物料名称'] || s['样品名称']),
              物料规格: dash(s['物料规格']),
              物料种类: dash(s['物料种类']),
              供应商名称: dash(s['供应商名称']),
              客户名称: dash(s['客户名称']),
              车间名称: dash(s['车间名称']),
              产线名称: dash(s['产线名称']),
              来样单位: dash(s['来样单位']),
              检验类: cat,
              检验方案: dash(s['检验方案']),
              检验班组: dash(s['检验班组']),
              检验人: dash(s['检验人']),
              匹配结果: rule ? '已匹配' : '未配置',
              成本方案编码: rule ? (rule['方案编码']||'—') : '—',
              取样时间: dash(s['取样时间']),
              检验完成时间: dash(s['检验完成时间']),
              标准系数: rule ? costHourFormat(rule['标准系数']) : '—'
            });
          });
        });
      });
      return out;
    }
    const costFlowBatch = reactive({ visible:false, mode:'batch', fill:'', rows:[] });
    function costFlowEditRowsOf(list){
      return (list||[]).map(r=>{
        const hour = costHourParts(r);
        return {
          id: r.id,
          报检单号: r['报检单号']||'—',
          样品编号: r['样品编号']||'—',
          检验类: r['检验类']||'—',
          物料编码: r['物料编码']||'—',
          物料名称: r['物料名称']||'—',
          标准系数: hour.n
        };
      });
    }
    function openCostFlowEdit(row){
      if(!row){ ElMessage.warning('未找到待编辑数据'); return; }
      costFlowBatch.mode = 'edit';
      costFlowBatch.fill = '';
      costFlowBatch.rows = costFlowEditRowsOf([row]);
      costFlowBatch.visible = true;
    }
    function openCostFlowBatch(){
      const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!picked.length){ ElMessage.warning('请先勾选要编辑的流水'); return; }
      costFlowBatch.mode = 'batch';
      costFlowBatch.fill = '';
      costFlowBatch.rows = costFlowEditRowsOf(picked);
      costFlowBatch.visible = true;
    }
    function applyCostFlowBatchFill(){
      const n = String(costFlowBatch.fill||'').trim();
      if(n==='' || isNaN(parseFloat(n)) || parseFloat(n)<0){ ElMessage.warning('请输入≥0 的标准系数'); return; }
      costFlowBatch.rows.forEach(r=>{ r.标准系数 = costNum(n).toFixed(2); });
      ElMessage.success('已批量填充 '+costFlowBatch.rows.length+' 行');
    }
    function confirmCostFlowBatch(){
      const rows = costFlowBatch.rows || [];
      if(!rows.length){ ElMessage.warning('没有可编辑的数据'); return; }
      for(const r of rows){
        const n = String(r.标准系数||'').trim();
        if(n==='' || isNaN(parseFloat(n)) || parseFloat(n)<0){ ElMessage.warning('请为所有行填写≥0 的标准系数'); return; }
      }
      const list = costFlowRows();
      rows.forEach(r=>{
        const src = list.find(x=> x.id===r.id);
        if(!src) return;
        src['标准系数'] = costHourFormat(r.标准系数);
        src._coeffEdited = true;
        delete src['标准系数单位'];
        delete src['工时'];
        delete src['工时单位'];
        delete src['标准工时'];
        delete src['标准工时单位'];
      });
      costFlowBatch.visible = false;
      selectedIds.value = [];
      bumpStore();
      ElMessage.success(costFlowBatch.mode==='edit' ? '保存成功' : ('已批量更新 '+rows.length+' 条标准系数'));
    }
    function saveCostFlowForm(){
      const n = String(formModel['标准系数']==null?'':formModel['标准系数']).trim();
      if(n==='' || isNaN(parseFloat(n)) || parseFloat(n)<0){ ElMessage.warning('请输入≥0 的标准系数'); return; }
      const list = costFlowRows();
      const cur = list.find(r=> r.id===formModel._editId);
      if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
      cur['标准系数'] = costHourFormat(n);
      cur._coeffEdited = true;
      delete cur['标准系数单位'];
      delete cur['工时'];
      delete cur['工时单位'];
      delete cur['标准工时'];
      delete cur['标准工时单位'];
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
