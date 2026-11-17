    const CAPA_LAUNCHABLE = '待发起';
    function capaInternalPicked(){ return (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id)); }
    function capaAllLaunchable(rows){ return !!(rows||[]).length && rows.every(r=> r['整改状态']===CAPA_LAUNCHABLE); }
    const canCapaClose = computed(()=> pageId.value==='capa-internal' && capaAllLaunchable(capaInternalPicked()));
    const canCapaBatchDelete = computed(()=> pageId.value==='capa-internal' && capaAllLaunchable(capaInternalPicked()));
    const MRB_WB_KEY = 'dingcai-qms-mrb-writeback';
    /** 只改行上已有的字段：源码 Mock 行多出字段会被判为结构变化，刷新后整页缓存被丢弃 */
    function qcSetKnown(row, obj){ Object.keys(obj).forEach(k=>{ if(k.startsWith('_') || k in row) row[k] = obj[k]; }); }
    function qcAllRows(pid){ return Object.values(MOCK[pid]||{}).filter(Array.isArray).flat(); }
    /** 取已有单号中数字最大的一个 +1，保持原前缀和位数 */
    function qcNextNo(rows, key, fallbackPrefix){
      let prefix = '', max = -1, width = 0;
      (rows||[]).forEach(r=>{
        const m = /^(.*?)(\d+)$/.exec(String(r[key]||''));
        if(!m) return;
        const n = parseInt(m[2], 10);
        if(n > max){ max = n; prefix = m[1]; width = m[2].length; }
      });
      if(max < 0){
        const d = new Date();
        return (fallbackPrefix||'') + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '001';
      }
      return prefix + String(max + 1).padStart(width, '0');
    }
    function qcEmpty(v){ return Array.isArray(v) ? !v.length : !String(v==null ? '' : v).trim() || v==='—'; }
    function qcCheckRequired(fields){
      for(const f of (fields||[])){
        if(!f || f.type==='readonly' || f.type==='switch') continue;
        if(!isFormFieldRequired(f)) continue;
        if(qcEmpty(formModel[f.name])){
          ElMessage.warning((['select','picker','date','daterange','datetime','upload','radio','number-unit'].includes(f.type) ? '请选择' : '请填写') + f.name);
          return false;
        }
      }
      return true;
    }
    function qcFormVals(fields){
      const o = {};
      (fields||[]).forEach(f=>{
        if(!f || !f.name) return;
        if(f.type==='switch'){
          const on = formSwitch[f.name]!==false;
          o[f.name] = f.name==='启用状态' ? (on ? '启用' : '禁用') : (on ? '是' : '否');
          return;
        }
        const v = formModel[f.name];
        if(v===undefined || v===null) return;
        o[f.name] = Array.isArray(v) ? (f.type==='daterange' ? v.join(' ~ ') : joinDun(v)) : (String(v).trim() || '—');
      });
      return o;
    }
    function qcMoveRow(pid, from, to, row, patch){
      const src = flowBag(pid, from);
      const i = src.indexOf(row);
      if(i >= 0) src.splice(i, 1);
      const next = Object.assign(flowPick(flowCols(pid, to), [patch, row]), { id: row.id + '-' + Date.now().toString(36) });
      flowBag(pid, to).unshift(next);
      return next;
    }
    function qcCurTab(){ return (tabView.value||{}).name || activeTab.value; }
    /** 待复核报检单 = 已完成且未复核的报检单 */
    function qcSyncRecheck(){
      FLOW_TABS.forEach(({ name })=>{
        const bag = flowBag('recheck', name);
        const cols = flowCols('recheck', name);
        const have = new Set(bag.map(r=> r['报检单号']));
        flowBag(FLOW_ORDER, name).forEach(o=>{
          if(o['单据状态']!=='已完成' || flowHas(o['复核结论']) || have.has(o['报检单号'])) return;
          const r = { id: 'rc-'+o['报检单号'], 单据状态: '待复核', 复核结论: '—' };
          cols.forEach(k=>{ r[k] = flowHas(o[k]) ? o[k] : '—'; });
          bag.unshift(r);
        });
        for(let i = bag.length - 1; i >= 0; i--){
          const f = flowOrderOf(bag[i]['报检单号']);
          if(f && (flowHas(f.row['复核结论']) || f.row['单据状态']==='已关闭')) bag.splice(i, 1);
        }
      });
    }
    watch(()=> pageId.value, v=>{ if(v==='recheck'){ flowSyncAll(); qcSyncRecheck(); storeTick.value += 1; } });
    function qcOrderSamples(no, tab){
      const lg = flowBag(FLOW_LEDGER, tab).filter(r=> r['报检单号']===no);
      return lg.map(r=>{
        const s = flowSplitRow(r['样品编号']) || {};
        const pick = k=> flowHas(s[k]) ? s[k] : (flowHas(r[k]) ? r[k] : '—');
        return { 样品状态: r['样品状态'], 检验结论: r['检验结论'] || '—', 偏差结论: r['偏差结论'] || '—', 样品编号: r['样品编号'],
          样品来源: pick('样品来源'), 检验方案: pick('检验方案'), 方案项目: pick('方案项目'), 临时项目: pick('临时项目'),
          取样备注: pick('取样备注'), 取样时间: pick('取样时间'), 取样人: pick('取样人') };
      });
    }
    function qcOpenRecheck(rows){
      const tab = qcCurTab();
      openForm('recheck');
      const samples = rows.flatMap(r=> qcOrderSamples(r['报检单号'], tab));
      if(samples.length) recheckSampleRows.value = samples;
      formModel['复核结论'] = samples.some(s=> s['检验结论']==='不合格') ? '不合格' : (samples.some(s=> flowHas(s['偏差结论'])) ? '异常' : '合格');
      formModel['复核说明'] = '';
      formModel._recheckIds = rows.map(r=> r.id);
      formModel._editId = rows[0] && rows[0].id;
    }
    function qcCreateDispose(pid, r, o, rv, tab){
      const lg = flowBag(FLOW_LEDGER, tab).filter(x=> x['报检单号']===r['报检单号']);
      const bad = lg.filter(x=> x['检验结论']==='不合格').length;
      const desc = [...new Set(lg.map(x=> x['异常描述']).filter(flowHas))].join('；');
      const pre = (pid.startsWith('unqual') ? 'UQ-' : 'DV-') + pid.split('-')[1].toUpperCase() + '-';
      const row = flowPick(flowCols(pid, 'tab-wait'), [r, o], {
        处置单号: qcNextNo(qcAllRows(pid), '处置单号', pre), 检验结论: '不合格', 偏差结论: '偏差', MRB状态: '未评审',
        异常描述: desc || rv.复核说明, 取样件数: (o||r)['已取样件数'] || '—',
        合格样品件数: String(lg.length - bad), 不合格样品件数: String(bad),
        复核说明: rv.复核说明, 复核时间: rv.复核时间, 复核人: rv.复核人
      });
      row.id = pid + '-w-' + Date.now().toString(36);
      flowBag(pid, 'tab-wait').unshift(row);
      return row['处置单号'];
    }
    function qcSaveRecheck(){
      const res = formModel['复核结论'];
      if(!res){ ElMessage.warning('请选择复核结论'); return; }
      const tab = qcCurTab();
      const ids = formModel._recheckIds || [formModel._editId];
      const bag = flowBag('recheck', tab);
      const rows = bag.filter(r=> ids.includes(r.id));
      if(!rows.length){ ElMessage.warning('未找到待复核报检单'); return; }
      const rv = { 复核结论: res, 复核时间: nowStamp(), 复核人: '管理员', 复核说明: String(formModel['复核说明']||'').trim() || '—' };
      const made = [];
      rows.forEach(r=>{
        qcSetKnown(r, rv);
        const f = flowOrderOf(r['报检单号']);
        if(f) qcSetKnown(f.row, rv);
        const pid = res==='不合格' ? QC_UQ[tab] : (res==='异常' ? QC_DV[tab] : '');
        if(pid) made.push(QC_SRC_TYPE[pid] + ' ' + qcCreateDispose(pid, r, f && f.row, rv, tab));
        bag.splice(bag.indexOf(r), 1);
      });
      selectedIds.value = [];
      formVisible.value = false;
      bumpStore();
      ElMessage.success('已复核 ' + rows.length + ' 张报检单，复核结论「' + res + '」已回写报检单' + (made.length ? '；已生成处置单：' + made.join('、') : ''));
    }
    function qcSaveDispose(){
      const pid = pageId.value;
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      const src = flowBag(pid, 'tab-wait').find(r=> r.id===formModel._editId);
      if(!src){ ElMessage.warning('未找到待处理的处置单'); return; }
      if(src['MRB状态']==='评审中'){ ElMessage.warning('处置单 '+src['处置单号']+' 正在 MRB 评审中，请在 MRB 评审完成后处置'); return; }
      const vals = qcFormVals(fields);
      qcMoveRow(pid, 'tab-wait', 'tab-done', src, Object.assign({}, vals, { 处置时间: nowStamp(), 处置人: '管理员' }));
      formVisible.value = false;
      bumpStore();
      ElMessage.success('处置单 ' + src['处置单号'] + ' 已处置，已转入「已处理」');
    }
    function qcCreateMrb(src, srcType, vals){
      const row = flowPick(flowCols('mrb-review', 'tab-doing'), [vals, src], {
        MRB单号: vals['MRB单号'] && vals['MRB单号']!=='—' ? vals['MRB单号'] : qcNextNo(qcAllRows('mrb-review'), 'MRB单号', 'MRB-'),
        来源处置类型: srcType, 来源处置单号: src['处置单号'], 创建备注: vals['备注'] && vals['备注']!=='—' ? vals['备注'] : '',
        创建时间: nowStamp(), 创建人: '管理员'
      });
      row.id = 'mrb-' + Date.now().toString(36);
      flowBag('mrb-review', 'tab-doing').unshift(row);
      qcSetKnown(src, { MRB状态: '评审中' });
      return row;
    }
    function qcSaveMrbAudit(){
      const pid = pageId.value;
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      const src = flowBag(pid, 'tab-wait').find(r=> r.id===formModel._editId);
      if(!src){ ElMessage.warning('未找到待处理的处置单'); return; }
      if(src['MRB状态']!=='未评审'){ ElMessage.warning('处置单 '+src['处置单号']+' 已发起 MRB 评审，不可重复发起'); return; }
      const row = qcCreateMrb(src, QC_SRC_TYPE[pid], qcFormVals(fields));
      formVisible.value = false;
      bumpStore();
      ElMessage.success('已生成 MRB 评审单 ' + row['MRB单号'] + '，处置单 ' + src['处置单号'] + ' 进入评审中');
    }
    function qcMrbSrcPid(type){ return Object.keys(QC_SRC_TYPE).find(k=> QC_SRC_TYPE[k]===type && k.startsWith('unqual')); }
    function qcSaveMrbAdd(){
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      const type = formModel['来源处置类型'];
      const spid = qcMrbSrcPid(type);
      const src = spid && flowBag(spid, 'tab-wait').find(r=> r['处置单号']===formModel['来源处置单号']);
      if(!src){ ElMessage.warning('来源处置单号须为「'+type+'」待处理的处置单'); return; }
      if(src['MRB状态']!=='未评审'){ ElMessage.warning('处置单 '+src['处置单号']+' 已发起 MRB 评审，不可重复发起'); return; }
      const row = qcCreateMrb(src, type, qcFormVals(fields));
      formVisible.value = false;
      bumpStore();
      ElMessage.success('MRB 评审单 ' + row['MRB单号'] + ' 已新增，处置单 ' + src['处置单号'] + ' 进入评审中');
    }
    function qcWriteback(){
      try { return Object.assign({ 采购来料不合格:true, 生产过程不合格:true, 生产物料不合格:true, 研发不合格处置:true }, JSON.parse(localStorage.getItem(MRB_WB_KEY) || '{}')); }
      catch(e){ return { 采购来料不合格:true, 生产过程不合格:true, 生产物料不合格:true, 研发不合格处置:true }; }
    }
    function openMrbWriteback(){
      Object.assign(mrbWriteback, qcWriteback());
      mrbWritebackVisible.value = true;
    }
    function saveMrbWriteback(){
      try { localStorage.setItem(MRB_WB_KEY, JSON.stringify(Object.assign({}, mrbWriteback))); } catch(e){ /* ignore */ }
      mrbWritebackVisible.value = false;
      const on = Object.keys(mrbWriteback).filter(k=> mrbWriteback[k]);
      ElMessage.success(on.length ? 'MRB 评审完成后将自动回写：' + on.join('、') : '已关闭回写，MRB 评审完成后需在处置单手动处置');
    }
    const MRB_SRC_PAGES = [
      { type:'采购来料不合格', page:'unqual-pi' },
      { type:'生产过程不合格', page:'unqual-pp' },
      { type:'生产物料不合格', page:'unqual-pm' },
      { type:'研发不合格处置', page:'unqual-rd' }
    ];
    const mrbLinkVisible = ref(false);
    const mrbLinkPick = ref([]);
    const mrbLinkNos = computed(()=> [...new Set(mrbLinkPick.value.map(p=> p.no))]);
    const mrbLinkRows = computed(()=>{
      void storeTick.value;
      const pick = mrbLinkPick.value;
      return MRB_SRC_PAGES.map(s=>{
        const nos = [...new Set(pick.filter(p=> p.type===s.type).map(p=> p.no))];
        const bag = MOCK[s.page] || {};
        const n = ['tab-wait','tab-done'].reduce((m, t)=> m + ((bag[t]||[]).filter(r=> nos.includes(r['处置单号'])).length), 0);
        return { 关联单据: s.type, page: s.page, nos, 关联记录数: n };
      }).filter(r=> r.nos.length);
    });
    function openMrbLink(){
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const pick = rows.map(r=> ({ type: r['来源处置类型'], no: r['来源处置单号'] })).filter(p=> p.no && p.no!=='—');
      if(!pick.length){ ElMessage.warning('所选数据没有来源处置单'); return; }
      mrbLinkPick.value = pick;
      mrbLinkVisible.value = true;
    }
    function goMrbLink(row){
      mrbLinkVisible.value = false;
      const nos = (row.nos||[]).slice();
      onSelectMenu(row.page);
      setTimeout(()=>{
        const bag = MOCK[row.page] || {};
        if(!(bag['tab-wait']||[]).some(r=> nos.includes(r['处置单号']))) activeTab.value = 'tab-done';
        resetQueryModel();
        query['处置单号'] = nos.join('、');
        pageNum.value = 1;
        ElMessage.success('已按处置单号 '+nos.join('、')+' 跳转至「'+row['关联单据']+'」');
      }, 80);
    }
    const DISPOSE_LINK_PAGES = ['unqual-pi','unqual-pp','unqual-pm','unqual-rd','dev-pi','dev-pp','dev-pm','dev-rd'];
    const disposeLinkVisible = ref(false);
    const disposeLinkNos = ref([]);
    function disposeLinkCount(page, tabs, field, nos){
      const bag = MOCK[page] || {};
      return (tabs||[]).reduce((n, t)=> n + ((bag[t]||[]).filter(r=> nos.includes(r[field])).length), 0);
    }
    const disposeLinkRows = computed(()=>{
      void storeTick.value;
      const nos = disposeLinkNos.value || [];
      if(!nos.length) return [];
      return [
        { 关联单据:'MRB评审', page:'mrb-review', field:'来源处置单号', tabs:['tab-doing','tab-done'], nos, 关联记录数: disposeLinkCount('mrb-review', ['tab-doing','tab-done'], '来源处置单号', nos) },
        { 关联单据:'整改处理', page:'capa-handle', field:'来源单号', tabs:['tab-wait','tab-done'], nos, 关联记录数: disposeLinkCount('capa-handle', ['tab-wait','tab-done'], '来源单号', nos) }
      ];
    });
    function openDisposeLink(){
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r['处置单号']).filter(n=> n && n!=='—'))];
      if(!nos.length){ ElMessage.warning('所选数据没有处置单号'); return; }
      disposeLinkNos.value = nos;
      disposeLinkVisible.value = true;
    }
    function goDisposeLink(row){
      disposeLinkVisible.value = false;
      const nos = (row.nos||[]).slice();
      onSelectMenu(row.page);
      setTimeout(()=>{
        if(row.tabs){
          const bag = MOCK[row.page] || {};
          const hit = row.tabs.find(t=> (bag[t]||[]).some(r=> nos.includes(r[row.field])));
          if(hit) activeTab.value = hit;
        }
        resetQueryModel();
        query[row.field] = nos.join('、');
        pageNum.value = 1;
        ElMessage.success('已按'+row.field+' '+nos.join('、')+' 跳转至「'+row['关联单据']+'」');
      }, 80);
    }
    function mrbBatchAudit(){
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选要发起审核的数据'); return; }
      ElementPlus.ElMessageBox.confirm('确认对所选 '+rows.length+' 条 MRB 评审单发起审核？', '批量发起审核', { type:'warning' }).then(()=>{
        ElMessage.success('已对 '+rows.length+' 条 MRB 评审单发起审核');
      }).catch(()=>{});
    }
    function mrbLaunchAudit(row){
      if(!row){ ElMessage.warning('未找到要发起审批的数据'); return; }
      const no = row['MRB单号'] || '';
      ElementPlus.ElMessageBox.confirm('确认对 MRB 评审单「'+no+'」发起审批？', '发起审批', { type:'warning' }).then(()=>{
        ElMessage.success('已对 MRB 评审单「'+no+'」发起审批');
      }).catch(()=>{});
    }
    function capaConfirmLaunch(row){
      if(!row){ ElMessage.warning('未找到要确认发起的数据'); return; }
      if(row['整改状态']!==CAPA_LAUNCHABLE){ ElMessage.warning('仅待发起状态可确认发起'); return; }
      const no = row['整改单号'] || '';
      ElementPlus.ElMessageBox.confirm('确认对整改单「'+no+'」发起？', '确认发起', { type:'warning' }).then(()=>{
        const list = flowBag('capa-internal', 'main');
        const cur = list.find(r=> r.id===row.id) || row;
        qcSetKnown(cur, { 整改状态: '执行中' });
        let h = flowBag('capa-handle', 'tab-wait').find(x=> x['整改单号']===cur['整改单号']);
        if(!h){
          h = flowPick(flowCols('capa-handle', 'tab-wait'), [cur], { 超时状态: qcCapaOverdue(cur['计划整改完成日期']) });
          h.id = 'capa-w-' + Date.now().toString(36);
          flowBag('capa-handle', 'tab-wait').unshift(h);
        }
        bumpStore();
        ElMessage.success('整改单「'+no+'」已确认发起，状态为执行中，已生成整改处理待办');
      }).catch(()=>{});
    }
    const CAPA_LINK_SRC = {
      '采购来料不合格': { page:'unqual-pi', field:'处置单号', tabs:['tab-wait','tab-done'] },
      '生产过程不合格': { page:'unqual-pp', field:'处置单号', tabs:['tab-wait','tab-done'] },
      '生产物料不合格': { page:'unqual-pm', field:'处置单号', tabs:['tab-wait','tab-done'] },
      '研发不合格处置': { page:'unqual-rd', field:'处置单号', tabs:['tab-wait','tab-done'] },
      '采购来料偏差': { page:'dev-pi', field:'处置单号', tabs:['tab-wait','tab-done'] },
      '生产过程偏差': { page:'dev-pp', field:'处置单号', tabs:['tab-wait','tab-done'] },
      '生产物料偏差': { page:'dev-pm', field:'处置单号', tabs:['tab-wait','tab-done'] },
      '研发偏差': { page:'dev-rd', field:'处置单号', tabs:['tab-wait','tab-done'] },
      '客户投诉': { page:'np-0212-02', field:'客诉单号', tabs:['tab-1','tab-2'] }
    };
    const capaLinkVisible = ref(false);
    const capaLinkPick = ref([]);
    const capaLinkNos = computed(()=> [...new Set(capaLinkPick.value.map(p=> p.no))]);
    function capaCount(page, tabs, field, nos){
      const bags = tabs ? tabs.map(t=> ((MOCK[page]||{})[t])||[]) : [((MOCK[page]||{}).main)||[]];
      return bags.reduce((n, list)=> n + list.filter(r=> nos.includes(r[field])).length, 0);
    }
    const capaLinkRows = computed(()=>{
      void storeTick.value;
      const pick = capaLinkPick.value;
      const rows = [];
      const nos = [...new Set(pick.map(p=> p.no).filter(n=> n && n!=='—'))];
      if(nos.length) rows.push({ 关联单据:'内部整改', page:'capa-internal', field:'整改单号', tabs:null, nos, 关联记录数: capaCount('capa-internal', null, '整改单号', nos) });
      const types = [...new Set(pick.map(p=> p.type).filter(t=> CAPA_LINK_SRC[t]))];
      types.forEach(t=>{
        const src = CAPA_LINK_SRC[t];
        const srcNos = [...new Set(pick.filter(p=> p.type===t).map(p=> p.src).filter(n=> n && n!=='—'))];
        if(!srcNos.length) return;
        rows.push({ 关联单据:t, page:src.page, field:src.field, tabs:src.tabs, nos:srcNos, 关联记录数: capaCount(src.page, src.tabs, src.field, srcNos) });
      });
      return rows;
    });
    function openCapaLink(){
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      capaLinkPick.value = rows.map(r=> ({ no:r['整改单号'], type:r['事件类型'], src:r['来源单号'] }));
      capaLinkVisible.value = true;
    }
    function goCapaLink(row){
      capaLinkVisible.value = false;
      const nos = (row.nos||[]).slice();
      onSelectMenu(row.page);
      setTimeout(()=>{
        if(row.tabs){
          const bag = MOCK[row.page] || {};
          const hit = row.tabs.find(t=> (bag[t]||[]).some(r=> nos.includes(r[row.field])));
          if(hit) activeTab.value = hit;
        }
        resetQueryModel();
        query[row.field] = nos.join('、');
        pageNum.value = 1;
        ElMessage.success('已按'+row.field+' '+nos.join('、')+' 跳转至「'+row['关联单据']+'」');
      }, 80);
    }
    const hcExecVisible = ref(false);
    const hcExec = reactive({ order:{}, dir:'入库', noKey:'入库单号', qtyKey:'入库数量', locKey:'入库库位编码', lines:[], selected:[], procs:[], locOpts:[] });
    const hcExecFile = ref(null);
    const hcPickVisible = ref(false);
    const hcPickQ = reactive({ code:'', name:'' });
    const hcPickKw = reactive({ code:'', name:'' });
    const hcPickSelected = ref([]);
    const hcJobVisible = ref(false);
    const hcJob = reactive({ name:'', fields:[], model:{}, targets:[] });
    const hcExecSum = computed(()=> (hcExec.lines||[]).reduce((s,r)=> s + (parseFloat(r[hcExec.qtyKey])||0), 0));
    const hcPickRows = computed(()=>{
      void storeTick.value;
      const code = String(hcPickKw.code||'').trim();
      const name = String(hcPickKw.name||'').trim();
      return (((MOCK.consumable||{}).main)||[]).filter(r=> r['启用状态']!=='禁用')
        .filter(r=> !code || String(r['耗材编码']||'').includes(code))
        .filter(r=> !name || String(r['耗材名称']||'').includes(name));
    });
    function hcCountStock(code, locCode){
      if(!code || !locCode) return 0;
      let n = 0;
      (((MOCK['np-0405-01']||{})['tab-2'])||[]).forEach(r=>{
        if(r['流水状态']==='已完成' && r['耗材编码']===code && r['入库库位编码']===locCode) n += parseFloat(r['入库数量'])||0;
      });
      (((MOCK['np-0405-02']||{})['tab-2'])||[]).forEach(r=>{
        if(r['流水状态']==='已完成' && r['耗材编码']===code && r['出库库位编码']===locCode) n -= parseFloat(r['出库数量'])||0;
      });
      return Math.round(n*1000)/1000;
    }
    function hcExecStock(row){
      const loc = row[hcExec.locKey];
      if(!row['耗材编码'] || !loc) return '0';
      return String(hcCountStock(row['耗材编码'], loc));
    }
    function hcWhCode(locCode){
      const loc = (((MOCK.warehouse||{}).tab2)||[]).find(r=> r['库位编码']===locCode);
      if(!loc) return '';
      const name = String(loc['所属仓库']||'').split(/[、,，]/)[0].trim();
      const wh = (((MOCK.warehouse||{}).tab1)||[]).find(r=> r['仓库名称']===name);
      return wh ? (wh['仓库编码']||'') : '';
    }
    function hcExecLoadProcs(order){
      const doc = '耗材'+hcExec.dir;
      const type = order['单据类型'];
      const forms = (((MOCK['lab-io-form']||{}).main)||[]);
      const hit = forms.find(f=> f['启用状态']==='启用' && f['适用业务单据']===doc && splitDun(f['适用单据类型']).includes(type));
      return ((hit && hit._procs) || []).map(p=> typeof p==='string' ? { name:p, fields:[] } : { name: p.name || p['工序名称'] || '', fields: p.fields || p['字段'] || [] }).filter(p=> p.name);
    }
    function hcExecLoadLines(order){
      const procs = hcExec.procs;
      const first = procs[0] ? procs[0].name : '/';
      if(Array.isArray(order._execLines)){
        return JSON.parse(JSON.stringify(order._execLines)).map(line=>{
          line['当前工序'] = line['当前工序'] || first;
          line._green = procs.length>0 && line['当前工序']==='/';
          line._jobs = line._jobs || {};
          return line;
        });
      }
      const no = order[hcExec.noKey];
      const flows = (((MOCK[pageId.value]||{})['tab-2'])||[]).filter(r=> r[hcExec.noKey]===no && r['流水状态']!=='已关闭');
      return flows.map(r=> ({
        id: r.id,
        耗材编码: r['耗材编码']||'',
        耗材名称: r['耗材名称']||'',
        耗材规格: r['耗材规格']||'',
        耗材种类: r['耗材种类']||'',
        计量单位: r['计量单位']||'',
        条码号: r['条码号']||'',
        批号: r['批号']||'',
        [hcExec.qtyKey]: r[hcExec.qtyKey]||'',
        [hcExec.locKey]: r[hcExec.locKey]||'',
        当前工序: first,
        _jobs: {},
        _green: false
      }));
    }
    function openHcExec(row){
      const dir = pageId.value==='np-0405-02' ? '出库' : '入库';
      const list = ((MOCK[pageId.value]||{})['tab-1'])||[];
      const order = list.find(r=> r.id===row.id) || row;
      hcExec.dir = dir;
      hcExec.noKey = dir+'单号';
      hcExec.qtyKey = dir+'数量';
      hcExec.locKey = dir+'库位编码';
      hcExec.order = order;
      hcExec.procs = hcExecLoadProcs(order);
      hcExec.locOpts = (((MOCK.warehouse||{}).tab2)||[]).filter(r=> r['启用状态']!=='禁用').map(r=> ({ value:r['库位编码'], label: r['库位编码']+' '+(r['库位名称']||'') }));
      hcExec.lines = hcExecLoadLines(order);
      hcExec.selected = [];
      hcExecVisible.value = true;
    }
