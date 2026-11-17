    const hmCmp = reactive({ visible:false, rows:[], mode:'view', fail:false, onOk:null });
    const hmCmpPassCount = computed(()=> (hmCmp.rows||[]).filter(r=> r.ok && !r.skip).length);
    const hmCmpFailCount = computed(()=> (hmCmp.rows||[]).filter(r=> !r.ok).length);
    const hmCmpSkipCount = computed(()=> (hmCmp.rows||[]).filter(r=> r.skip).length);
    function hmCmpRowClass({ row }){
      if(row && row.skip) return 'hm-cmp-skip';
      return row && row.ok ? 'hm-cmp-ok' : 'hm-cmp-bad';
    }
    function hmCmpValStyle(row){
      if(row && row.skip) return { color:'#8C8C8C' };
      return { color: row && row.ok ? '#389E0D' : '#CF1322', fontWeight:600 };
    }
    function openHmCompare(rows, mode, onOk){
      hmCmp.rows = rows || [];
      hmCmp.mode = mode || 'view';
      hmCmp.fail = (hmCmp.rows||[]).some(r=> !r.ok);
      hmCmp.onOk = onOk || null;
      hmCmp.visible = true;
    }
    function confirmHmCompare(){
      const fn = hmCmp.onOk;
      hmCmp.visible = false;
      hmCmp.onOk = null;
      if(fn) fn();
    }
    function hmArchTakeLimit(raw, label){
      const s = String(raw==null ? '' : raw).trim();
      if(!s){ ElMessage.warning(label+'请填写限制值'); return null; }
      const lim = hmArchLimit(s);
      if(!lim || lim.kind==='bad'){ ElMessage.warning(label+'的限制值仅支持数值或 ND'); return null; }
      return lim.raw;
    }
    function hmSaveArch(){
      if(!qcCheckRequired(activeFormFields.value)) return;
      const plant = [];
      for(const r of hmArchPlant.value){
        if(!String(r['限制值']||'').trim()) continue;
        const lim = hmArchTakeLimit(r['限制值'], '厂内标准');
        if(lim==null) return;
        plant.push({ id: r.id, 限制值: lim });
      }
      const cust = [];
      for(const r of hmArchCust.value){
        const has = String(r['客户信息']||'').trim() || String(r['限制值']||'').trim();
        if(!has) continue;
        if(!String(r['客户信息']||'').trim()){ ElMessage.warning('客户标准请选择客户信息'); return; }
        const lim = hmArchTakeLimit(r['限制值'], '客户标准「'+r['客户名称']+'」');
        if(lim==null) return;
        cust.push({ id: r.id, 客户编码: r['客户编码']||'', 客户名称: r['客户名称']||'', 客户信息: r['客户信息']||'', 限制值: lim });
      }
      const law = [];
      for(const r of hmArchLaw.value){
        const has = String(r['法规名称']||'').trim() || String(r['限制值']||'').trim();
        if(!has) continue;
        const name = String(r['法规名称']||'').trim();
        if(!name){ ElMessage.warning('法规标准请填写法规名称'); return; }
        const lim = hmArchTakeLimit(r['限制值'], '法规标准「'+name+'」');
        if(lim==null) return;
        law.push({ id: r.id, 法规名称: name, 限制值: lim });
      }
      const list = hmArchRows();
      const isAdd = formMode.value!=='edit';
      const matCat = String(formModel['物料类'] || treeListId.value || '').trim();
      if(!matCat){ ElMessage.warning('请先选择左侧物料类'); return; }
      const payload = {
        物料类: matCat,
        标准编号: formModel['标准编号'],
        标准名称: String(formModel['标准名称']||'').trim(),
        英文名称: String(formModel['英文名称']||'').trim(),
        'CAS No': String(formModel['CAS No']||'').trim(),
        单位: formModel['单位'] || '',
        单位编码: formModel['单位编码'] || '',
        附件: formModel['附件'] || '',
        备注: formModel['备注'] || '',
        _plant: plant,
        _cust: cust,
        _law: law
      };
      if(isAdd){
        list.unshift(Object.assign({ id:'hmarch-'+Date.now(), 创建人: CI_OPERATOR, 创建时间: nowStamp() }, payload));
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑档案'); return; }
        Object.assign(cur, payload);
        delete cur.MDL;
      }
      formVisible.value=false;
      bumpStore();
      ElMessage.success(isAdd ? '档案已新增' : '档案已保存');
    }
    function deleteHmArch(){
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+rows.length+' 条档案？', '批量删除', { type:'warning', confirmButtonText:'确认删除', cancelButtonText:'取消' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        const bag = MOCK[HM_ARCH_PAGE] || {};
        bag.main = (bag.main||[]).filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }
    const HM_FILE_TYPE_ALIAS = { '厂内标准':'厂内文件', '客户标准':'客户文件', '法规要求':'法规文件' };
    function hmFileTypeName(v){
      const s = String(v==null ? '' : v).trim();
      return HM_FILE_TYPE_ALIAS[s] || s;
    }
    function hmStatusOf(r){
      if(!r) return '';
      if(r['导入状态']) return r['导入状态'];
      if(r['变更状态']) return r['变更状态'];
      if(r['作废状态']) return r['作废状态'];
      if(r._confirmed || r['审核状态']==='审核通过') return 'done';
      return 'open';
    }
    function hmDone(r){
      const st = hmStatusOf(r);
      return st==='已导入' || st==='已变更' || st==='已作废' || st==='done';
    }
    function hmOpenRow(r){ return !!r && !hmDone(r); }
    const hmHist = reactive({ visible:false, tab:'hist', header:[], rows:[] });
    function hmImpTip(){ return '仅导入状态为「未导入」的导入单可'; }
    function hmNormStatus(list, key, doneVal, openVal){
      (list||[]).forEach(r=>{
        if(!r || r[key]) return;
        r[key] = (r._confirmed || r['审核状态']==='审核通过') ? doneVal : openVal;
      });
      return list||[];
    }
    function hmImpRows(){
      const bag = (MOCK[HM_IMP_PAGE] = MOCK[HM_IMP_PAGE] || {});
      return hmNormStatus(bag.main || (bag.main = []), '导入状态', '已导入', '未导入');
    }
    function hmLibBag(){
      const bag = (MOCK[HM_LIB_PAGE] = MOCK[HM_LIB_PAGE] || {});
      if(!Array.isArray(bag.main)){
        bag.main = [].concat(bag['tab-1']||[], bag['tab-2']||[], bag['tab-3']||[]);
        delete bag['tab-1']; delete bag['tab-2']; delete bag['tab-3'];
      }
      bag.main.forEach(r=>{
        const t = hmFileTypeName(r['文件类型']);
        if(t) r['文件类型'] = t;
      });
      return bag;
    }
    function hmLibRows(){
      return hmLibBag().main;
    }
    function hmNextLibNo(){
      let max = 0;
      hmLibRows().forEach(r=>{
        const n = parseInt(String(r['文件编号']||'').replace(/\D/g,''), 10);
        if(n>max) max = n;
      });
      return 'HM-FILE-' + String(max+1).padStart(6,'0');
    }
    function refreshHmLibExpire(){
      if(pageId.value!==HM_LIB_PAGE) return;
      if(formModel['使用期限类型']!=='固定期限'){ formModel['失效日期'] = ''; return; }
      formModel['失效日期'] = labAddLife(formModel['生效日期'], formModel['使用周期'], formModel['使用周期单位'] || '天') || '';
    }
    function hmWarnDays(r){
      const raw = String(r['提前预警']==null ? '' : r['提前预警']).trim();
      if(!raw || raw==='—') return 0;
      const m = raw.match(/(\d+)\s*(天|月|年)?/);
      const n = m ? parseInt(m[1], 10) : parseInt(raw, 10);
      if(!(n > 0)) return 0;
      const unit = (m && m[2]) || r['提前预警单位'] || '天';
      return n * ({ '天':1, '月':30, '年':365 }[unit] || 1);
    }
    function hmLibStatus(r){
      if(!r) return '正常';
      if(r._voided || r['使用状态']==='已作废') return '已作废';
      if(r['使用期限类型']==='永久使用') return '正常';
      const exp = String(r['失效日期']||'').trim();
      if(!exp || exp==='—') return '正常';
      const day = 86400000;
      const t = new Date(); t.setHours(0,0,0,0);
      const left = Math.round((new Date(exp + 'T00:00:00') - t) / day);
      const warn = hmWarnDays(r);
      if(left < 0) return '过期';
      if(warn > 0 && left <= warn) return '临期';
      return '正常';
    }
    function hmExpireView(r){
      const st = hmLibStatus(r);
      const warn = String(r['提前预警']||'').trim();
      const unit = r['提前预警单位'] || '';
      let 提前预警 = warn;
      if(warn && warn!=='—' && !/(天|月|年)/.test(warn) && unit) 提前预警 = warn + ' ' + unit;
      return Object.assign({}, r, { 使用状态: st, 提前预警: 提前预警 || '—' });
    }
    const HM_EXP_PAGE = 'np-0215-03';
    function hmExpRows(){
      return hmLibRows().map(hmExpireView).filter(r=> r['使用状态']==='临期' || r['使用状态']==='过期');
    }
    function hmNextApplyNo(){ return qcNextNo(hmImpRows(), '申请单号', ''); }
    function hmNextFileNo(){ return qcNextNo(hmImpRows(), '文件编号', 'HM-IMP-'); }
    function hmNextAuditNo(){ return qcNextNo(hmImpRows(), '审核单号', 'AP'); }
    function refreshHmExpire(){
      if(pageId.value!==HM_IMP_PAGE) return;
      if(formModel['使用期限类型']!=='固定期限'){ formModel['失效日期'] = ''; return; }
      formModel['失效日期'] = labAddLife(formModel['生效日期'], formModel['使用周期'], formModel['使用周期单位'] || '天') || '';
    }
    function refreshHmChgExpire(){
      if(pageId.value!==HM_CHG_PAGE) return;
      if(formModel['变更后使用期限类型']!=='固定期限'){ formModel['变更后失效日期'] = ''; return; }
      formModel['变更后失效日期'] = labAddLife(formModel['变更后生效日期'], formModel['变更后使用周期'], formModel['变更后使用周期单位'] || '天') || '';
    }
    function hmWriteLib(row){
      if(!row || !hmDone(row)) return;
      const list = hmLibRows();
      if(list.some(x=> x['来源申请单号']===row['申请单号'] || x['文件编号']===row['文件编号'])) return;
      const applyDate = String(row['创建时间']||nowStamp()).slice(0,10);
      const archNodes = (CFG.pages[HM_ARCH_PAGE] && CFG.pages[HM_ARCH_PAGE].treeNodes) || [];
      const matCat = String(row['物料类'] || '').trim() || archNodes[0] || '';
      if(!matCat){ ElMessage.warning('导入单缺少物料类，无法写入文件库'); return; }
      const rec = {
        id: 'hmlib-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
        物料类: matCat,
        文件编号: row['文件编号'] || '',
        文件名称: row['文件名称'] || '',
        文件: row['文件'] || '',
        内容描述: row['内容描述'] || '',
        文件类型: hmFileTypeName(row['文件类型']) || '',
        客户编码: row['客户编码'] || '',
        客户名称: row['客户名称'] || '—',
        法规名称: row['法规名称'] || '—',
        使用期限类型: row['使用期限类型'] || '',
        生效日期: row['生效日期'] || '—',
        使用周期: row['使用周期'] || '—',
        提前预警: row['提前预警'] || '—',
        提前预警单位: row['提前预警单位'] || '天',
        失效日期: row['失效日期'] || '—',
        备注: row['备注'] || '',
        来源申请单号: row['申请单号'] || '',
        创建人: row['创建人'] || CI_OPERATOR,
        创建时间: nowStamp(),
        _history: [{ 操作类型:'导入', 申请人: row['创建人']||CI_OPERATOR, 申请日期: applyDate, 申请单号: row['申请单号']||'', _srcPage: HM_IMP_PAGE }]
      };
      rec['使用状态'] = hmLibStatus(rec);
      list.unshift(rec);
    }
    function hmSyncLibFromImp(){
      hmLibBag();
      hmImpRows().filter(hmDone).forEach(hmWriteLib);
      hmLibRows().forEach(r=>{ r['使用状态'] = hmLibStatus(r); });
      hmSyncVoid();
      hmSyncChg();
    }
    const HM_BIN_PAGE = 'np-0215-04';
    const hmFilePick = reactive({ visible:false, no:'', name:'', current:null });
    function hmVoidRows(){
      const bag = (MOCK[HM_VOID_PAGE] = MOCK[HM_VOID_PAGE] || {});
      return hmNormStatus(bag.main || (bag.main = []), '作废状态', '已作废', '未作废');
    }
    function hmBinRows(){
      const bag = (MOCK[HM_BIN_PAGE] = MOCK[HM_BIN_PAGE] || {});
      return bag.main || (bag.main = []);
    }
    function hmNextVoidNo(){ return qcNextNo(hmVoidRows(), '申请单号', ''); }
    function hmNextVoidAudit(){ return qcNextNo(hmVoidRows(), '审核单号', 'BF'); }
    function hmVoidTip(){ return '仅作废状态为「未作废」的作废单可'; }
    function hmChgRows(){
      const bag = (MOCK[HM_CHG_PAGE] = MOCK[HM_CHG_PAGE] || {});
      return hmNormStatus(bag.main || (bag.main = []), '变更状态', '已变更', '未变更');
    }
    function hmNextChgNo(){ return qcNextNo(hmChgRows(), '申请单号', ''); }
    function hmNextChgAudit(){ return qcNextNo(hmChgRows(), '审核单号', 'BG'); }
    function hmChgTip(){ return '仅变更状态为「未变更」的变更单可'; }
    function hmDash(v){ const s = String(v==null?'':v).trim(); return s || '—'; }
    function hmSplitNu(text, unit){
      const s = String(text==null?'':text).trim();
      if(!s || s==='—') return { n:'', u: unit || '天' };
      const m = s.match(/^(\d+)\s*(?:个)?(天|月|年)?$/);
      if(!m) return { n:s, u: unit || '天' };
      return { n:m[1], u:m[2] || unit || '天' };
    }
    function hmCycleText(n, u){
      const s = String(n==null?'':n).trim();
      if(!s) return '—';
      return s+' '+(u||'天');
    }
    function fillHmChgFromLib(r){
      const cyc = hmSplitNu(r['使用周期'], r['使用周期单位']);
      const warnRaw = (r['提前预警'] && String(r['提前预警']).indexOf(' ')<0 && r['提前预警']!=='—')
        ? (String(r['提前预警'])+' '+(r['提前预警单位']||'天')) : r['提前预警'];
      const warn = hmSplitNu(warnRaw, r['提前预警单位']);
      const blank = v => (!v || v==='—') ? '' : v;
      const fixed = r['使用期限类型']!=='永久使用';
      Object.assign(formModel, {
        原文件: (r['文件编号']||'')+(r['文件名称'] ? ' / '+r['文件名称'] : ''),
        文件编号: r['文件编号'] || '',
        文件类型: r['文件类型'] || '',
        _libId: r.id,
        _fileType: r['文件类型'] || '',
        变更前文件名称: r['文件名称'] || '',
        变更前客户名称: blank(r['客户名称']),
        变更前内容描述: blank(r['内容描述']),
        变更前文件: r['文件'] || '',
        变更前使用期限类型: r['使用期限类型'] || '固定期限',
        变更前生效日期: fixed ? blank(r['生效日期']) : '',
        变更前使用周期: fixed ? cyc.n : '',
        变更前使用周期单位: cyc.u,
        变更前提前预警: fixed ? warn.n : '',
        变更前提前预警单位: warn.u,
        变更前失效日期: fixed ? blank(r['失效日期']) : '',
        变更后文件名称: r['文件名称'] || '',
        变更后客户名称: blank(r['客户名称']),
        变更后内容描述: blank(r['内容描述']),
        变更后文件: r['文件'] || '',
        变更后使用期限类型: r['使用期限类型'] || '固定期限',
        变更后生效日期: fixed ? blank(r['生效日期']) : '',
        变更后使用周期: fixed ? cyc.n : '',
        变更后使用周期单位: cyc.u,
        变更后提前预警: fixed ? warn.n : '',
        变更后提前预警单位: warn.u,
        变更后失效日期: fixed ? blank(r['失效日期']) : ''
      });
      refreshHmChgExpire();
    }
    function hmSidePayload(prefix, fixed){
      const cycleN = String(formModel[prefix+'使用周期']||'').trim();
      const cycleU = formModel[prefix+'使用周期单位'] || '天';
      const warnN = String(formModel[prefix+'提前预警']||'').trim();
      const warnU = formModel[prefix+'提前预警单位'] || '天';
      return {
        [prefix+'文件名称']: formModel[prefix+'文件名称'] || '',
        [prefix+'客户名称']: hmDash(formModel[prefix+'客户名称']),
        [prefix+'内容描述']: hmDash(formModel[prefix+'内容描述']),
        [prefix+'文件']: formModel[prefix+'文件'] || '',
        [prefix+'使用期限类型']: formModel[prefix+'使用期限类型'] || '',
        [prefix+'生效日期']: fixed ? hmDash(formModel[prefix+'生效日期']) : '—',
        [prefix+'使用周期']: fixed ? hmCycleText(cycleN, cycleU) : '—',
        [prefix+'使用周期值']: fixed ? cycleN : '',
        [prefix+'使用周期单位']: cycleU,
        [prefix+'提前预警']: fixed ? hmCycleText(warnN, warnU) : '—',
        [prefix+'提前预警值']: fixed ? warnN : '',
        [prefix+'提前预警单位']: warnU,
        [prefix+'失效日期']: fixed ? hmDash(formModel[prefix+'失效日期']) : '—'
      };
    }
    function hmApplyChg(row){
      if(!row || !hmDone(row) || !row['文件编号']) return;
      const lib = hmLibRows().find(x=> x['文件编号']===row['文件编号']);
      if(!lib) return;
      lib._history = Array.isArray(lib._history) ? lib._history : [];
      if(lib._history.some(h=> h['操作类型']==='变更' && h['申请单号']===row['申请单号'])) return;
      const fixed = row['变更后使用期限类型']==='固定期限';
      lib['文件名称'] = row['变更后文件名称'] || lib['文件名称'];
      lib['客户名称'] = hmDash(row['变更后客户名称']);
      lib['内容描述'] = row['变更后内容描述'] && row['变更后内容描述']!=='—' ? row['变更后内容描述'] : (lib['内容描述']||'');
      lib['文件'] = row['变更后文件'] || lib['文件'];
      lib['使用期限类型'] = row['变更后使用期限类型'] || lib['使用期限类型'];
      lib['生效日期'] = fixed ? hmDash(row['变更后生效日期']) : '—';
      lib['使用周期'] = fixed ? hmDash(row['变更后使用周期']) : '—';
      lib['提前预警'] = fixed ? hmDash(row['变更后提前预警']) : '—';
      lib['提前预警单位'] = row['变更后提前预警单位'] || '天';
      lib['失效日期'] = fixed ? hmDash(row['变更后失效日期']) : '—';
      lib._history.unshift({ 操作类型:'变更', 申请人: row['创建人']||CI_OPERATOR, 申请日期: String(row['创建时间']||nowStamp()).slice(0,10), 申请单号: row['申请单号'], _srcPage: HM_CHG_PAGE });
      lib['使用状态'] = hmLibStatus(lib);
    }
    function hmSyncChg(){
      hmChgRows().filter(hmDone).forEach(hmApplyChg);
    }
    function openHmChgAp(rows){
      const list = (rows||[]).filter(Boolean);
      if(!list.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = list.filter(r=> !hmOpenRow(r));
      if(bad.length){ ElMessage.warning(hmChgTip()+'确认变更：'+bad.map(r=> r['申请单号']).join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认对所选 '+list.length+' 条变更单执行确认变更？确认后将更新文件库。', '确认变更', { type:'warning' }).then(()=>{
        list.forEach(r=>{
          const src = hmChgRows().find(x=> x.id===r.id) || r;
          src['变更状态'] = '已变更';
          src._confirmed = true;
          src['审核状态'] = '审核通过';
          hmApplyChg(src);
        });
        bumpStore();
        ElMessage.success('已确认变更，文件库已更新');
      }).catch(()=>{});
    }
    function deleteHmChg(){
      const picked = bxPicked();
      if(!picked.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = picked.filter(r=> !hmOpenRow(r));
      if(bad.length){ ElMessage.warning(hmChgTip()+'删除：'+bad.map(r=> r['申请单号']).join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+picked.length+' 条变更单？删除后不可恢复。', '批量删除', { type:'warning' }).then(()=>{
        const ids = new Set(picked.map(r=> r.id));
        const bag = MOCK[HM_CHG_PAGE];
        bag.main = (bag.main||[]).filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }
    function hmSaveChg(){
      refreshHmChgExpire();
      const fields = (activeFormFields.value||[]).filter(f=> f && f.name);
      if(!qcCheckRequired(fields)) return;
      if(!String(formModel['文件编号']||'').trim()){ ElMessage.warning('请选择原文件'); return; }
      const afterFixed = formModel['变更后使用期限类型']==='固定期限';
      const cycleN = String(formModel['变更后使用周期']||'').trim();
      const warnN = String(formModel['变更后提前预警']||'').trim();
      if(afterFixed){
        if(!formModel['变更后生效日期']){ ElMessage.warning('请选择变更后生效日期'); return; }
        if(!/^\d+$/.test(cycleN) || !(parseInt(cycleN,10)>0)){ ElMessage.warning('请填写正整数使用周期'); return; }
        if(!/^\d+$/.test(warnN) || !(parseInt(warnN,10)>0)){ ElMessage.warning('请填写正整数提前预警'); return; }
        if(!formModel['变更后失效日期']){ ElMessage.warning('失效日期计算失败，请检查生效日期与使用周期'); return; }
      }
      if(!String(formModel['变更后文件']||'').trim()){ ElMessage.warning('请上传变更后文件'); return; }
      const list = hmChgRows();
      const isAdd = formMode.value!=='edit';
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(!isAdd && !cur){ ElMessage.warning('未找到待编辑数据'); return; }
      if(!isAdd && !hmOpenRow(cur)){ ElMessage.warning(hmChgTip()+'编辑'); return; }
      const applyNo = String(formModel['申请单号']||'').trim();
      const fileNo = String(formModel['文件编号']||'').trim();
      if(!applyNo){ ElMessage.warning('请刷新生成申请单号'); return; }
      if(list.some(r=> r!==cur && r['申请单号']===applyNo)){ ElMessage.warning('申请单号已存在，请刷新后重试'); return; }
      const beforeFixed = formModel['变更前使用期限类型']==='固定期限';
      const payload = Object.assign({
        申请单号: applyNo,
        文件编号: fileNo,
        原文件: formModel['原文件'] || fileNo,
        文件类型: formModel['文件类型'] || formModel._fileType || (cur && cur['文件类型']) || '',
        变更类型: formModel['变更类型'] || '',
        变更内容说明: formModel['变更内容说明'] || ''
      }, hmSidePayload('变更前', beforeFixed), hmSidePayload('变更后', afterFixed));
      const stamp = nowStamp();
      if(isAdd){
        list.unshift(Object.assign({ id:'hmchg-'+Date.now().toString(36), 变更状态:'未变更', 审核状态:'/', 审核单号:'—', 创建人: CI_OPERATOR, 创建时间: stamp }, payload));
      } else {
        Object.assign(cur, payload);
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '新增成功' : '保存成功');
    }
    const hmVoidPickRows = computed(()=>{
      storeTick.value;
      const held = new Set(hmVoidRows().filter(r=> r.id!==formModel._editId && hmOpenRow(r)).map(r=> r['文件编号']));
      const no = String(hmFilePick.no||'').trim();
      const name = String(hmFilePick.name||'').trim();
      return hmLibRows().map(hmExpireView).filter(r=>{
        if(r['使用状态']==='已作废' || held.has(r['文件编号'])) return false;
        if(no && !String(r['文件编号']||'').includes(no)) return false;
        if(name && !String(r['文件名称']||'').includes(name)) return false;
        return true;
      });
    });
