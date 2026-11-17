    function hcExecSel(rows){ hcExec.selected = rows || []; }
    function hcExecRowClass({ row }){ return row && row._green ? 'hc-exec-done' : ''; }
    function hcExecAdd(){
      hcPickQ.code = ''; hcPickQ.name = ''; hcPickKw.code = ''; hcPickKw.name = '';
      hcPickSelected.value = [];
      hcPickVisible.value = true;
    }
    function hcPickQuery(){ hcPickKw.code = hcPickQ.code; hcPickKw.name = hcPickQ.name; }
    function hcPickReset(){ hcPickQ.code = ''; hcPickQ.name = ''; hcPickKw.code = ''; hcPickKw.name = ''; }
    function hcPickConfirm(){
      const rows = hcPickSelected.value || [];
      if(!rows.length){ ElMessage.warning('请选择耗材'); return; }
      const first = hcExec.procs[0] ? hcExec.procs[0].name : '/';
      rows.forEach((r,i)=>{
        hcExec.lines.push({
          id: 'hcl-'+Date.now()+'-'+i+'-'+Math.random().toString(36).slice(2,6),
          耗材编码: r['耗材编码']||'',
          耗材名称: r['耗材名称']||'',
          耗材规格: r['耗材规格']||'',
          耗材种类: r['耗材种类']||'',
          计量单位: r['计量单位']||'',
          [hcExec.qtyKey]: '',
          [hcExec.locKey]: '',
          当前工序: first,
          _jobs: {},
          _green: false
        });
      });
      hcPickVisible.value = false;
      ElMessage.success('已添加 '+rows.length+' 行耗材');
    }
    function hcExecDel(){
      if(!hcExec.selected.length){ ElMessage.warning('请先勾选要删除的耗材'); return; }
      const ids = new Set(hcExec.selected.map(r=> r.id));
      hcExec.lines = hcExec.lines.filter(r=> !ids.has(r.id));
      hcExec.selected = [];
      ElMessage.success('已删除所选耗材');
    }
    function hcExecImport(){ if(hcExecFile.value) hcExecFile.value.click(); }
    function hcExecOnFile(e){
      const f = e.target.files && e.target.files[0];
      if(e.target) e.target.value = '';
      if(!f) return;
      ElMessage.info('已选择文件「'+f.name+'」，演示环境不解析导入明细');
    }
    function hcExecBindOrder(){
      const list = ((MOCK[pageId.value]||{})['tab-1'])||[];
      const id = hcExec.order && hcExec.order.id;
      const live = list.find(r=> r.id===id);
      if(live) hcExec.order = live;
      return hcExec.order;
    }
    function hcExecSyncFlows(status){
      const order = hcExecBindOrder();
      const no = order[hcExec.noKey];
      const bag = (MOCK[pageId.value] = MOCK[pageId.value] || {});
      const prev = bag['tab-2'] = bag['tab-2'] || [];
      const keep = new Set(hcExec.lines.map(l=> l.id));
      const flows = prev.filter(r=> !(r[hcExec.noKey]===no && r['流水状态']==='执行中' && !keep.has(r._lineId) && !keep.has(r.id)));
      bag['tab-2'] = flows;
      const stamp = nowStamp();
      const extra = {};
      hcExec.lines.forEach(line=>{
        const locCode = line[hcExec.locKey] || '';
        const qty = parseFloat(line[hcExec.qtyKey])||0;
        const key = (line['耗材编码']||'')+'|'+locCode;
        const stock = hcCountStock(line['耗材编码'], locCode) + (extra[key]||0);
        const delta = hcExec.dir==='入库' ? qty : -qty;
        extra[key] = (extra[key]||0) + delta;
        const cum = stock + delta;
        const fid = 'hcex-'+order.id+'-'+line.id;
        let flow = flows.find(r=> r._lineId===line.id || r.id===line.id || r.id===fid);
        const patch = {
          流水状态: status,
          检查结果: (flow && flow['检查结果'] && flow['检查结果']!=='/') ? flow['检查结果'] : '/',
          条码号: line['条码号'] || (flow && flow['条码号']) || '—',
          耗材编码: line['耗材编码']||'',
          耗材名称: line['耗材名称']||'',
          耗材规格: line['耗材规格']||'—',
          耗材种类: line['耗材种类']||'—',
          批号: line['批号'] || (flow && flow['批号']) || '—',
          [hcExec.qtyKey]: String(line[hcExec.qtyKey]||''),
          累计库存: String(Math.round(cum*1000)/1000),
          计量单位: line['计量单位']||'—',
          [hcExec.dir+'仓库编码']: hcWhCode(locCode),
          [hcExec.locKey]: locCode,
          备注: order['备注'] || '—',
          [hcExec.noKey]: no,
          单据类型: order['单据类型']||'',
          操作时间: stamp,
          操作人: '管理员',
          _lineId: line.id,
          _job: JSON.parse(JSON.stringify(line._jobs||{}))
        };
        if(flow) Object.assign(flow, patch);
        else flows.unshift(Object.assign({ id: fid }, patch));
      });
      const done = flows.filter(r=> r[hcExec.noKey]===no && r['流水状态']==='已完成').reduce((s,r)=> s+(parseFloat(r[hcExec.qtyKey])||0), 0);
      order['已完成数量'] = String(Math.round(done*1000)/1000);
      order._execLines = JSON.parse(JSON.stringify(hcExec.lines));
    }
    function hcExecSave(){
      if(!hcExec.lines.length){ ElMessage.warning('请先添加耗材'); return; }
      hcExecBindOrder();
      hcExec.order['单据状态'] = '执行中';
      hcExecSyncFlows('执行中');
      bumpStore();
      ElMessage.success('已保存，单据状态为执行中');
    }
    function hcExecSubmit(){
      hcExecBindOrder();
      if(!hcExec.lines.length){ ElMessage.warning('请先添加耗材'); return; }
      for(const line of hcExec.lines){
        if(!(parseFloat(line[hcExec.qtyKey])>0)){ ElMessage.warning('请填写'+hcExec.qtyKey); return; }
        if(!line[hcExec.locKey]){ ElMessage.warning('请选择'+hcExec.dir+'库位'); return; }
      }
      if(hcExec.procs.length && hcExec.lines.some(l=> l['当前工序']!=='/')){
        ElMessage.warning('工序未全部完成，不可提交'); return;
      }
      hcExec.order['单据状态'] = '已完成';
      hcExecSyncFlows('已完成');
      bumpStore();
      hcExecVisible.value = false;
      ElMessage.success('已提交，单据状态为已完成');
    }
    function openHcJob(name, fields, targets){
      const saved = (targets[0] && targets[0]._jobs && targets[0]._jobs[name]) || {};
      hcJob.name = name;
      hcJob.fields = (fields && fields.length) ? fields.slice() : ['作业说明'];
      hcJob.model = {};
      hcJob.fields.forEach(f=> { hcJob.model[f] = saved[f] || ''; });
      hcJob.targets = targets;
      hcJobVisible.value = true;
    }
    function hcExecLineAct(line){
      if(!hcExec.procs.length){ ElMessage.warning('当前无工序'); return; }
      const name = line['当前工序'];
      if(!name || name==='/'){ ElMessage.warning('该行工序已完成'); return; }
      const proc = hcExec.procs.find(p=> p.name===name);
      openHcJob(name, proc && proc.fields, [line]);
    }
    function hcExecProcAct(proc){
      const name = proc.name;
      const targets = hcExec.lines.filter(l=> l['当前工序']===name);
      if(!targets.length){ ElMessage.warning('数据列表内没有当前工序为「'+name+'」的数据，不可批量作业'); return; }
      openHcJob(name, proc.fields, targets);
    }
    function confirmHcJob(){
      const name = hcJob.name;
      const names = hcExec.procs.map(p=> p.name);
      const idx = names.indexOf(name);
      const next = idx>=0 && idx<names.length-1 ? names[idx+1] : '/';
      (hcJob.targets||[]).forEach(line=>{
        line._jobs = line._jobs || {};
        line._jobs[name] = Object.assign({}, hcJob.model);
        if(line['当前工序']===name){
          line['当前工序'] = next;
          line._green = next==='/' && hcExec.procs.length>0;
        }
      });
      hcJobVisible.value = false;
      ElMessage.success('已保存工序「'+name+'」');
    }
    function qcSaveMrbRec(){
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      const src = flowBag('mrb-review', 'tab-doing').find(r=> r.id===formModel._editId);
      if(!src){ ElMessage.warning('未找到评审中的 MRB 单'); return; }
      const vals = qcFormVals(fields);
      const stamp = nowStamp();
      qcMoveRow('mrb-review', 'tab-doing', 'tab-done', src, Object.assign({}, vals, { 处置时间: stamp, 处置人: '管理员' }));
      const type = src['来源处置类型'];
      const spid = qcMrbSrcPid(type);
      const u = spid && flowBag(spid, 'tab-wait').find(x=> x['处置单号']===src['来源处置单号']);
      let tip = '';
      if(u){
        if(qcWriteback()[type]!==false){
          qcMoveRow(spid, 'tab-wait', 'tab-done', u, {
            处置方式: vals['处置方式'], 问题大类: src['问题大类'], 问题小类: src['问题小类'], 问题描述: src['问题描述'],
            处置说明: vals['处置说明'], 处置报告: vals['处置报告'], 处置时间: stamp, 处置人: '管理员', MRB状态: '已评审'
          });
          tip = '，已回写' + type + '处置单 ' + u['处置单号'] + '（已处理）';
        } else {
          qcSetKnown(u, { MRB状态: '已评审' });
          tip = '，' + type + '处置单 ' + u['处置单号'] + ' 待手动处置';
        }
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success('MRB 单 ' + src['MRB单号'] + ' 评审完成' + tip);
    }
    function qcCapaOverdue(d){ return d && d!=='—' && String(d).slice(0, 10) < nowStamp().slice(0, 10) ? '超期' : '正常'; }
    function qcSaveCapa(){
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      if(formModel['事件类型']!=='其他' && qcEmpty(formModel['来源单号'])){ ElMessage.warning('请选择来源单号'); return; }
      const list = flowBag('capa-internal', 'main');
      const isAdd = formMode.value!=='edit';
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(!isAdd && !cur){ ElMessage.warning('未找到待编辑整改单'); return; }
      const vals = qcFormVals(fields);
      ['物料编码','物料名称','物料规格','物料种类','客户编码','客户名称'].forEach(k=>{ if(!qcEmpty(formModel[k])) vals[k] = formModel[k]; });
      if(isAdd) vals['整改单号'] = qcNextNo(list, '整改单号', 'CA-');
      else delete vals['整改单号'];
      if(isAdd){
        const row = flowPick(flowCols('capa-internal', 'main'), [vals], { 整改状态: '待发起', 创建时间: nowStamp(), 创建人: '管理员' });
        row.id = 'capa-i-' + Date.now().toString(36);
        list.unshift(row);
      } else {
        if(cur['整改状态']!==CAPA_LAUNCHABLE){ ElMessage.warning('仅待发起状态可编辑'); return; }
        qcSetKnown(cur, vals);
        const h = flowBag('capa-handle', 'tab-wait').find(x=> x['整改单号']===cur['整改单号']);
        if(h) qcSetKnown(h, Object.assign({}, vals, { 超时状态: qcCapaOverdue(vals['计划整改完成日期']) }));
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '整改单已新增，状态为待发起' : '整改单已保存');
    }
    function qcSaveCapaProcess(){
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      const src = flowBag('capa-handle', 'tab-wait').find(r=> r.id===formModel._editId);
      if(!src){ ElMessage.warning('未找到待处理的整改单'); return; }
      const vals = qcFormVals(fields);
      const rec = { 原因分析: vals['原因分析'], 整改措施: vals['整改措施'], 整改说明: vals['整改说明'] || '—', 整改报告: vals['附件'] || '—', 整改人: '管理员', 整改完成时间: nowStamp() };
      qcMoveRow('capa-handle', 'tab-wait', 'tab-done', src, rec);
      const ci = flowBag('capa-internal', 'main').find(x=> x['整改单号']===src['整改单号']);
      if(ci && ci['整改状态']==='执行中') qcSetKnown(ci, Object.assign({}, rec, { 整改状态: '已完成' }));
      formVisible.value = false;
      bumpStore();
      ElMessage.success('整改单 ' + src['整改单号'] + ' 已处理' + (ci ? '，内部整改状态更新为已完成' : ''));
    }
    function qcSaveAddSample(){
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      const raw = String(formModel['本次加样件数']||'').trim();
      if(!/^\d+$/.test(raw) || parseInt(raw, 10) <= 0){ ElMessage.warning('本次加样件数须为正整数'); return; }
      const f = flowOrderOf(formModel['报检单号']);
      if(!f || !['待执行','执行中'].includes(f.row['单据状态'])){ ElMessage.warning('报检单须为待执行 / 执行中'); return; }
      const before = flowInt(f.row['应取样件数']);
      const after = before + parseInt(raw, 10);
      f.row['应取样件数'] = String(after);
      f.row._flow = true;
      f.row._sampEnd = false;
      formModel['原应取样件数'] = String(before);
      formModel['现应取样件数'] = String(after);
      flowSyncAll();
      genericSaveForm(true);
      ElMessage.success('加样申请已保存，报检单 ' + f.row['报检单号'] + ' 应取样件数 ' + before + ' → ' + after + '，已进入待取样任务');
    }
    function qcSaveSpcReport(){
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      const list = flowBag('spc-report-ledger', 'main');
      const name = String(formModel['报告名称']||'').trim();
      if(list.some(r=> r['报告名称']===name)){ ElMessage.warning('报告名称「'+name+'」已存在'); return; }
      const v = qcFormVals(fields);
      const q = k=> qcEmpty(query[k]) ? '—' : (Array.isArray(query[k]) ? query[k].join(' ~ ') : query[k]);
      const row = flowPick(flowCols('spc-report-ledger', 'main'), [{
        报告名称: name, 开具方式: '手动开具', 方案编码: '—', 来源类型: String((tabView.value||{}).label||'').replace(/检$/, ''), 日期维度: q('日期维度'), 日期范围: v['日期范围'],
        物料信息: q('物料信息'), 采样点: q('采样点'), 供应商信息: q('供应商信息'), 客户信息: q('客户信息'), 检验方案: q('检验方案'), 检验项: q('检验项'),
        备注: v['备注'], 创建人: '管理员', 创建时间: nowStamp()
      }]);
      row.id = 'rl-' + Date.now().toString(36);
      list.unshift(row);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('SPC 报告「' + name + '」已保存，可在 SPC报告台账查看');
    }
    /** 没有专属保存逻辑的新增 / 复制 / 编辑：按弹窗字段校验必填、编码唯一，写入当前页签数据 */
    function genericSaveForm(silent){
      const pid = pageId.value, tv = tabView.value || {}, tab = qcCurTab() || 'main';
      const fields = (activeFormFields.value||[]).filter(f=> f && f.name);
      if(!silent && !qcCheckRequired(fields)) return;
      const vals = qcFormVals(fields);
      const cols = (tv.columns||[]).map(c=> c.field).filter(k=> k && k!=='操作' && k!=='_actions');
      if(pid==='np-0201-01'){
        const mi = joinMatInfoSlash(formModel);
        if(mi) vals['物料信息'] = mi;
      }
      if(pid==='np-0201-02'){
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请添加委托项目'); return; }
        vals['委托项目'] = formLineRows.value.map(r=> r['检验项名称']).filter(Boolean).join('、');
        const sample = oeAllSamples().find(r=> r['样品编号']===formModel['样品编号']);
        vals['检验方案'] = formModel._schemeName || (sample && sample['检验方案']) || '';
      }
      cols.forEach(k=>{
        if(k in vals) return;
        const v = formModel[k];
        if(!qcEmpty(v)) vals[k] = Array.isArray(v) ? joinDun(v) : v;
      });
      const bag = (MOCK[pid] = MOCK[pid] || {});
      const list = (bag[tab] = bag[tab] || []);
      const isAdd = formMode.value!=='edit';
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(!isAdd && !cur){ ElMessage.warning('未找到待编辑数据'); return; }
      const fieldNames = new Set(fields.map(f=> f.name));
      for(const f of fields){
        if(!/(编码|单号|编号)$/.test(f.name) || ['readonly','picker','select'].includes(f.type) || !cols.includes(f.name)) continue;
        const v = String(vals[f.name]||'').trim();
        if(v && v!=='—' && list.some(r=> r!==cur && String(r[f.name]||'')===v)){ ElMessage.warning(f.name+'「'+v+'」已存在，不可重复'); return; }
      }
      const stamp = nowStamp();
      if(isAdd){
        fields.filter(f=> f.type==='readonly' && /(编码|单号|编号)$/.test(f.name) && qcEmpty(vals[f.name]) && cols.includes(f.name))
          .forEach(f=>{ vals[f.name] = qcNextNo(list, f.name, ''); });
        const own = cols.find(k=> /单号$/.test(k) && !fieldNames.has(k) && list.length && list.every(r=> flowHas(r[k])) && new Set(list.map(r=> r[k])).size===list.length);
        if(own && qcEmpty(vals[own])) vals[own] = qcNextNo(list, own, '');
        const row = { id: pid.replace(/[^a-z0-9]/gi, '').slice(0, 8) + '-' + Date.now().toString(36) };
        cols.forEach(k=>{ row[k] = '—'; });
        Object.assign(row, QC_ADD_DEFAULTS[pid] || {}, vals);
        if(cols.includes('启用状态') && qcEmpty(vals['启用状态'])) row['启用状态'] = '启用';
        ['创建时间','制单时间'].forEach(k=>{ if(cols.includes(k)) row[k] = stamp; });
        ['创建人','制单人'].forEach(k=>{ if(cols.includes(k)) row[k] = '管理员'; });
        if((page.value?.formLineFields||[]).length && (formLineRows.value||[]).length) row._lines = JSON.parse(JSON.stringify(formLineRows.value));
        list.unshift(row);
      } else {
        fields.filter(f=> f.type==='readonly').forEach(f=>{ if(qcEmpty(vals[f.name])) delete vals[f.name]; });
        qcSetKnown(cur, vals);
        if((page.value?.formLineFields||[]).length && (formLineRows.value||[]).length) cur._lines = JSON.parse(JSON.stringify(formLineRows.value));
        if(pid==='ledger') Object.assign(cur, ledgerEditItemTexts());
      }
      if(pid==='np-0201-02'){ oeUpsertFromEntrust(isAdd ? list[0] : cur); flowSyncAll(); }
      formVisible.value = false;
      bumpStore();
      if(!silent) ElMessage.success(isAdd ? (formMode.value==='copy' ? '复制新增成功' : '新增成功') : '保存成功');
    }
    const TREE_NODE_KEY = 'dingcai-qms-tree-nodes';
    const TREE_NODE_DESC_KEY = 'dingcai-qms-tree-node-descs';
    const TREE_NAME_KEYS = ['数据源名称','数据源','标签类型名称','资源','表单类型','物料类名称'];
    let qcTreeEditNode = '';
    function qcTreeSaved(){
      try{ return JSON.parse(localStorage.getItem(TREE_NODE_KEY) || '{}') || {}; }catch(e){ return {}; }
    }
    function qcTreeDescSaved(){
      try{ return JSON.parse(localStorage.getItem(TREE_NODE_DESC_KEY) || '{}') || {}; }catch(e){ return {}; }
    }
    function qcTreePersist(pid){
      const all = qcTreeSaved();
      all[pid] = (CFG.pages[pid] || {}).treeNodes || [];
      try{ localStorage.setItem(TREE_NODE_KEY, JSON.stringify(all)); }catch(e){}
      const descsAll = qcTreeDescSaved();
      descsAll[pid] = (CFG.pages[pid] || {}).treeNodeDescs || {};
      try{ localStorage.setItem(TREE_NODE_DESC_KEY, JSON.stringify(descsAll)); }catch(e){}
    }
    Object.entries(qcTreeSaved()).forEach(([pid, nodes])=>{
      if(CFG.pages[pid] && Array.isArray(nodes)) CFG.pages[pid].treeNodes = nodes.slice();
    });
    Object.entries(qcTreeDescSaved()).forEach(([pid, descs])=>{
      if(CFG.pages[pid] && descs && typeof descs==='object') CFG.pages[pid].treeNodeDescs = Object.assign({}, descs);
    });
    function qcSaveTreeNode(){
      const p = page.value, pid = pageId.value;
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      const key = [...TREE_NAME_KEYS, p?.treeField].find(k=> k && fields.some(f=> f.name===k));
      const name = String(formModel[key] || '').trim();
      if(!name){ ElMessage.warning('请填写' + (key || '名称')); return; }
      if(!p || !Array.isArray(p.treeNodes)){ formVisible.value = false; return; }
      const isEdit = /^编辑/.test(formMode.value);
      const old = isEdit ? qcTreeEditNode : '';
      if(p.treeNodes.includes(name) && name!==old){ ElMessage.warning('「' + name + '」已存在，不可重复'); return; }
      if(isEdit && old && old!==name){
        p.treeNodes = p.treeNodes.map(n=> n===old ? name : n);
        if(p.treeField){
          qcAllRows(pid).forEach(r=>{ if(r[p.treeField]===old) r[p.treeField] = name; });
          bumpStore();
        }
      } else if(!isEdit){
        p.treeNodes = p.treeNodes.concat([name]);
      }
      if(fields.some(f=> f && f.name==='说明')){
        const desc = String(formModel['说明'] || '').trim();
        const descs = Object.assign({}, p.treeNodeDescs || {});
        if(isEdit && old && old!==name) delete descs[old];
        if(desc) descs[name] = desc; else delete descs[name];
        p.treeNodeDescs = descs;
      }
      qcTreePersist(pid);
      treeListId.value = name;
      formVisible.value = false;
      storeTick.value += 1;
      ElMessage.success(isEdit ? '已保存「' + name + '」' : '已新增「' + name + '」');
    }
    function qcInitDsSetting(){
      const p = page.value, pid = pageId.value;
      if(!(p?.settingLineFields||[]).length) return;
      formLineRows.value = qcAllRows(pid).filter(r=> r[p.treeField]===treeListId.value).map(r=> ({
        _srcId: r.id, 数据类型: r['字段注释'] || '', 字段: r['字段名'] || '', 字段描述: r['字段描述'] || ''
      }));
    }
    const QC_API_SRC = [['样品', FLOW_LEDGER, 'tab-pi'], ['钢瓶', FLOW_ORDER, 'tab-pi'], ['物料', 'mat-list', '']];
    function qcParseApi(){
      if(!String(formModel['Api地址']||'').trim()){ ElMessage.warning('请先填写Api地址'); return; }
      const node = String(formModel['数据源'] || treeListId.value || '');
      const hit = QC_API_SRC.find(([kw])=> node.includes(kw)) || QC_API_SRC[0];
      const p = CFG.pages[hit[1]] || {};
      const tv = (p.tabViews||[]).find(t=> !hit[2] || t.name===hit[2]) || {};
      const fields = (tv.columns||p.columns||[]).map(c=> c.field).filter(k=> k && k!=='操作' && k!=='_actions' && !k.startsWith('_'));
      const have = new Set((formLineRows.value||[]).flatMap(l=> [String(l['字段']||'').trim(), String(l['字段描述']||'').trim()]).filter(Boolean));
      const add = fields.filter(k=> !have.has(k)).map(k=> ({ 数据类型: /时间|日期/.test(k) ? 'datetime' : (/(数|量)$/.test(k) ? 'number' : 'varchar'), 字段: k, 字段描述: k }));
      formLineRows.value = (formLineRows.value||[]).filter(l=> String(l['字段']||'').trim()).concat(add);
      ElMessage.success('已解析 ' + fields.length + ' 个字段' + (add.length ? '，新增 ' + add.length + ' 个' : '，无新增字段'));
    }
    function qcSaveDsSetting(){
      const p = page.value, pid = pageId.value, node = String(formModel['数据源'] || treeListId.value || '').trim();
      if(!node){ ElMessage.warning('请先选择左侧数据源'); return; }
      if((p?.settingLineFields||[]).length){
        const lines = (formLineRows.value || []).filter(l=> String(l['字段']||'').trim());
        const seen = new Set();
        for(const l of lines){
          const k = String(l['字段']).trim();
          if(seen.has(k)){ ElMessage.warning('字段「' + k + '」重复'); return; }
          seen.add(k);
        }
        const bag = (MOCK[pid] = MOCK[pid] || {});
        const list = (bag.main = bag.main || []);
        const olds = list.filter(r=> r[p.treeField]===node);
        const kept = lines.map(l=>{
          const o = olds.find(r=> r.id===l._srcId);
          const vals = { 字段名: String(l['字段']).trim(), 字段注释: l['数据类型'] || '', 字段描述: l['字段描述'] || '' };
          if(o){ qcSetKnown(o, vals); return o; }
          return Object.assign({ id: 'tds-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), [p.treeField]: node, 检验状态: '待检验' }, vals);
        });
        bag.main = list.filter(r=> r[p.treeField]!==node).concat(kept);
        bumpStore();
        formVisible.value = false;
        ElMessage.success('数据源「' + node + '」已保存，共 ' + kept.length + ' 个字段');
        return;
      }
      formVisible.value = false;
      ElMessage.success('数据源「' + node + '」设置已保存');
    }
    const qcView = reactive({ visible:false, title:'', width:'900px', desc:[], cols:[], rows:[], btns:[] });
    function qcShowView(o){ Object.assign(qcView, { width:'900px', desc:[], cols:[], rows:[], btns:[] }, o, { visible:true }); }
    const qcEsc = s=> String(s==null ? '' : s).replace(/[&<>"]/g, c=> ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
    const qcYmd = v=>{
      if(!(v instanceof Date)) return String(v||'').slice(0, 10);
      return v.getFullYear() + '-' + String(v.getMonth()+1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
    };
    const qcCodeOf = s=> String(s||'').split(' / ')[0].trim();
    function qcRowDesc(row){
      const cols = ((tabView.value||{}).columns||[]).map(c=> c.field).filter(k=> k && k!=='操作' && k!=='_actions');
      return cols.map(k=> ({ k, v: flowHas(row[k]) ? row[k] : '—' }));
    }
    function qcQueryDesc(){
      return Object.keys(query).filter(k=> !qcEmpty(query[k])).map(k=> ({ k, v: Array.isArray(query[k]) ? query[k].map(qcYmd).join(' ~ ') : query[k] }));
    }
    function qcSampleResult(no){
      const s = flowSplitRow(no), lg = flowLedgerRow(no) || {};
      const ent = ((s||{})._entry||{}).items || {};
      return flowSampleItems(s || lg).map(n=> ({ 检验项: n, 实测值: (ent[n]||{}).实测值 || '—', 检验结论: (ent[n]||{}).结论 || '—' }));
    }
