    const hmFilePickRows = computed(()=>{
      storeTick.value;
      const no = String(hmFilePick.no||'').trim();
      const name = String(hmFilePick.name||'').trim();
      const archType = pageId.value===HM_ARCH_PAGE ? (HM_ARCH_TYPE[hmArchTab()] || '') : '';
      const held = (pageId.value===HM_CHG_PAGE || pageId.value===HM_ARCH_PAGE)
        ? null
        : new Set(hmVoidRows().filter(r=> r.id!==formModel._editId && hmOpenRow(r)).map(r=> r['文件编号']));
      return hmLibRows().map(hmExpireView).filter(r=>{
        if(archType && r['文件类型']!==archType) return false;
        if(held && (r['使用状态']==='已作废' || held.has(r['文件编号']))) return false;
        if(no && !String(r['文件编号']||'').includes(no)) return false;
        if(name && !String(r['文件名称']||'').includes(name)) return false;
        return true;
      });
    });
    function openHmFilePick(){
      if(formMode.value==='edit' && pageId.value!==HM_ARCH_PAGE){ ElMessage.warning(pageId.value===HM_CHG_PAGE ? '编辑时不可更换原文件' : '编辑时不可更换文件'); return; }
      hmFilePick.no = '';
      hmFilePick.name = '';
      hmFilePick.current = null;
      hmFilePick.visible = true;
    }
    function confirmHmFilePick(){
      const r = hmFilePick.current;
      if(!r){ ElMessage.warning('请选择一条数据'); return; }
      if(pageId.value===HM_ARCH_PAGE){
        formModel['关联文件'] = [r['文件编号'], r['文件名称']].filter(Boolean).join(' / ');
        formModel['文件编号'] = r['文件编号'] || '';
        formModel['文件名称'] = r['文件名称'] || '';
        formModel._libId = r.id;
        if((!formModel['客户名称'] || formModel['客户名称']==='—') && r['客户名称'] && r['客户名称']!=='—'){
          formModel['客户编码'] = r['客户编码'] || '';
          formModel['客户名称'] = r['客户名称'];
          formModel['客户信息'] = [r['客户编码'], r['客户名称']].filter(Boolean).join(' / ');
        }
        if((!formModel['法规名称'] || formModel['法规名称']==='—') && r['法规名称'] && r['法规名称']!=='—'){
          formModel['法规名称'] = r['法规名称'];
        }
        hmFilePick.visible = false;
        return;
      }
      if(pageId.value===HM_CHG_PAGE){
        fillHmChgFromLib(r);
        hmFilePick.visible = false;
        return;
      }
      Object.assign(formModel, {
        文件编号: r['文件编号'],
        文件名称: r['文件名称'] || '',
        文件类型: r['文件类型'] || '',
        客户名称: r['客户名称'] || '—',
        法规名称: r['法规名称'] || '—',
        文件: r['文件'] || '',
        _libId: r.id
      });
      hmFilePick.visible = false;
    }
    function hmApplyVoid(row){
      if(!row || !hmDone(row) || !row['文件编号']) return;
      const lib = hmLibRows().find(x=> x['文件编号']===row['文件编号']);
      if(lib){
        lib._voided = true;
        lib._history = Array.isArray(lib._history) ? lib._history : [];
        if(!lib._history.some(h=> h['操作类型']==='作废' && h['申请单号']===row['申请单号'])){
          lib._history.unshift({ 操作类型:'作废', 申请人: row['创建人']||CI_OPERATOR, 申请日期: String(row['创建时间']||nowStamp()).slice(0,10), 申请单号: row['申请单号'], _srcPage: HM_VOID_PAGE });
        }
        lib['使用状态'] = hmLibStatus(lib);
      }
      const bin = hmBinRows();
      if(bin.some(x=> x['来源申请单号']===row['申请单号'])) return;
      const src = lib || {};
      bin.unshift({
        id: 'hmbin-'+Date.now().toString(36),
        文件编号: row['文件编号'],
        文件名称: row['文件名称'] || src['文件名称'] || '',
        文件: row['文件'] || src['文件'] || '',
        内容描述: src['内容描述'] || '—',
        文件类型: row['文件类型'] || src['文件类型'] || '',
        客户名称: row['客户名称'] || src['客户名称'] || '—',
        法规名称: row['法规名称'] || src['法规名称'] || '—',
        使用期限类型: src['使用期限类型'] || '—',
        生效日期: src['生效日期'] || '—',
        使用周期: src['使用周期'] || '—',
        失效日期: src['失效日期'] || '—',
        作废原因: row['作废原因'] || row['报废原因'] || '',
        作废申请人: row['创建人'] || '',
        作废时间: row['创建时间'] || nowStamp(),
        来源申请单号: row['申请单号'] || ''
      });
    }
    function hmSyncVoid(){
      hmVoidRows().filter(hmDone).forEach(hmApplyVoid);
    }
    function openHmVoidAp(rows){
      const list = (rows||[]).filter(Boolean);
      if(!list.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = list.filter(r=> !hmOpenRow(r));
      if(bad.length){ ElMessage.warning(hmVoidTip()+'确认作废：'+bad.map(r=> r['申请单号']).join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认对所选 '+list.length+' 条作废单执行确认作废？确认后将写入回收站。', '确认作废', { type:'warning' }).then(()=>{
        list.forEach(r=>{
          const src = hmVoidRows().find(x=> x.id===r.id) || r;
          src['作废状态'] = '已作废';
          src._confirmed = true;
          src['审核状态'] = '审核通过';
          hmApplyVoid(src);
        });
        bumpStore();
        ElMessage.success('已确认作废，已写入回收站');
      }).catch(()=>{});
    }
    function deleteHmVoid(){
      const picked = bxPicked();
      if(!picked.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = picked.filter(r=> !hmOpenRow(r));
      if(bad.length){ ElMessage.warning(hmVoidTip()+'删除：'+bad.map(r=> r['申请单号']).join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+picked.length+' 条作废单？删除后不可恢复。', '批量删除', { type:'warning' }).then(()=>{
        const ids = new Set(picked.map(r=> r.id));
        const bag = MOCK[HM_VOID_PAGE];
        bag.main = (bag.main||[]).filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }
    function hmSaveVoid(){
      const fields = (activeFormFields.value||[]).filter(f=> f && f.name);
      if(!qcCheckRequired(fields)) return;
      if(!String(formModel['文件编号']||'').trim()){ ElMessage.warning('请选择资料库文件'); return; }
      const vals = qcFormVals(fields);
      const list = hmVoidRows();
      const isAdd = formMode.value!=='edit';
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(!isAdd && !cur){ ElMessage.warning('未找到待编辑数据'); return; }
      if(!isAdd && !hmOpenRow(cur)){ ElMessage.warning(hmVoidTip()+'编辑'); return; }
      const applyNo = String(formModel['申请单号']||'').trim();
      const fileNo = String(formModel['文件编号']||'').trim();
      if(!applyNo){ ElMessage.warning('请刷新生成申请单号'); return; }
      if(list.some(r=> r!==cur && r['申请单号']===applyNo)){ ElMessage.warning('申请单号已存在，请刷新后重试'); return; }
      if(list.some(r=> r!==cur && r['文件编号']===fileNo && hmOpenRow(r))){ ElMessage.warning('该文件已有在途作废单'); return; }
      const stamp = nowStamp();
      const payload = Object.assign({}, vals, {
        申请单号: applyNo,
        文件编号: fileNo,
        文件名称: formModel['文件名称'] || '',
        文件类型: formModel['文件类型'] || '',
        客户名称: formModel['客户名称'] || '—',
        法规名称: formModel['法规名称'] || '—',
        文件: formModel['文件'] || ''
      });
      if(isAdd){
        list.unshift(Object.assign({ id:'hmvoid-'+Date.now().toString(36), 作废状态:'未作废', 审核状态:'/', 审核单号:'—', 创建人: CI_OPERATOR, 创建时间: stamp }, payload));
      } else {
        Object.assign(cur, payload);
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '新增成功' : '保存成功');
    }
    function hmSaveLib(){
      refreshHmLibExpire();
      const fields = (activeFormFields.value||[]).filter(f=> f && f.name);
      if(!qcCheckRequired(fields)) return;
      const typ = hmFileTypeName(formModel['文件类型']);
      if(!['厂内文件','客户文件','法规文件'].includes(typ)){ ElMessage.warning('请选择文件类型'); return; }
      const fixed = formModel['使用期限类型']==='固定期限';
      const cycleN = String(formModel['使用周期']||'').trim();
      const warnN = String(formModel['提前预警']||'').trim();
      if(fixed){
        if(!formModel['生效日期']){ ElMessage.warning('请选择生效日期'); return; }
        if(!/^\d+$/.test(cycleN) || !(parseInt(cycleN,10)>0)){ ElMessage.warning('请填写正整数使用周期'); return; }
        if(!/^\d+$/.test(warnN) || !(parseInt(warnN,10)>0)){ ElMessage.warning('请填写正整数提前预警'); return; }
        if(!formModel['失效日期']){ ElMessage.warning('失效日期计算失败，请检查生效日期与使用周期'); return; }
      }
      if(typ==='客户文件' && !String(formModel['客户名称']||'').trim()){ ElMessage.warning('请选择客户信息'); return; }
      if(typ==='法规文件' && !String(formModel['法规名称']||'').trim()){ ElMessage.warning('请填写法规名称'); return; }
      const list = hmLibRows();
      const isAdd = formMode.value!=='edit';
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(!isAdd && !cur){ ElMessage.warning('未找到待编辑文件'); return; }
      const no = String(formModel['文件编号']||'').trim();
      if(!no){ ElMessage.warning('请刷新生成文件编号'); return; }
      if(list.some(r=> r!==cur && r['文件编号']===no)){ ElMessage.warning('文件编号已存在'); return; }
      const matCat = String(formModel['物料类'] || treeListId.value || (cur && cur['物料类']) || '').trim();
      if(!matCat){ ElMessage.warning('请先选择左侧物料类'); return; }
      const payload = {
        物料类: matCat,
        文件编号: no,
        文件名称: String(formModel['文件名称']||'').trim(),
        文件: formModel['文件'] || '',
        内容描述: String(formModel['内容描述']||'').trim(),
        文件类型: typ,
        客户编码: typ==='客户文件' ? (formModel['客户编码']||'') : '',
        客户名称: typ==='客户文件' ? (formModel['客户名称']||'—') : '—',
        客户信息: typ==='客户文件' ? (formModel['客户信息']||'') : '—',
        法规名称: typ==='法规文件' ? String(formModel['法规名称']||'').trim() : '—',
        使用期限类型: formModel['使用期限类型'] || '固定期限',
        生效日期: fixed ? (formModel['生效日期']||'') : '—',
        使用周期: fixed ? hmCycleText(cycleN, formModel['使用周期单位']||'天') : '—',
        使用周期单位: formModel['使用周期单位'] || '天',
        提前预警: fixed ? hmCycleText(warnN, formModel['提前预警单位']||'天') : '—',
        提前预警单位: formModel['提前预警单位'] || '天',
        失效日期: fixed ? (formModel['失效日期']||'') : '—',
        备注: formModel['备注'] || ''
      };
      const today = nowStamp().slice(0,10);
      if(isAdd){
        ElMessage.warning('请从「文件导入」新增文件');
        return;
      }
      Object.assign(cur, payload);
      cur['使用状态'] = hmLibStatus(cur);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('文件已保存');
    }
    function openHmHist(row){
      const r = Object.assign({}, row, { 使用状态: hmLibStatus(row) });
      hmHist.tab = 'hist';
      hmHist.header = [r];
      hmHist.rows = (Array.isArray(row._history) ? row._history : []).slice()
        .sort((a,b)=> String(b['申请日期']||'').localeCompare(String(a['申请日期']||'')))
        .map((h,i)=> Object.assign({ id:'hmh-'+i }, h));
      hmHist.visible = true;
    }
    function openHmHistDetail(h){
      const typ = h['操作类型'] || '';
      if(!h._srcPage || !h['申请单号']){ ElMessage.info('该记录在有害物质文件库直接维护'); return; }
      const pid = h._srcPage || (typ==='变更' ? HM_CHG_PAGE : typ==='作废' ? HM_VOID_PAGE : HM_IMP_PAGE);
      const no = h['申请单号'] || '';
      hmHist.visible = false;
      if(!CFG.pages[pid]){ ElMessage.warning('未找到对应模块'); return; }
      onSelectMenu(pid);
      if(CFG.pages[pid].stub || !no){
        ElMessage.info('已跳转至「'+CFG.pages[pid].title+'」'+(CFG.pages[pid].stub ? '，该模块原型待完善' : ''));
        return;
      }
      setTimeout(()=>{
        resetQueryModel();
        query['申请单号'] = no;
        ElMessage.success('已跳转至「'+CFG.pages[pid].title+'」并按申请单号过滤');
      }, 80);
    }
    hmSyncLibFromImp();
    function openHmAp(rows){
      const list = (rows||[]).filter(Boolean);
      if(!list.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = list.filter(r=> !hmOpenRow(r));
      if(bad.length){ ElMessage.warning(hmImpTip()+'确认导入：'+bad.map(r=> r['申请单号']).join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认对所选 '+list.length+' 条导入单执行确认导入？确认后将写入有害物质文件库。', '确认导入', { type:'warning' }).then(()=>{
        list.forEach(r=>{
          const src = hmImpRows().find(x=> x.id===r.id) || r;
          src['导入状态'] = '已导入';
          src._confirmed = true;
          src['审核状态'] = '审核通过';
          hmWriteLib(src);
        });
        bumpStore();
        ElMessage.success('已确认导入，文件已写入文件库');
      }).catch(()=>{});
    }
    function deleteHmImp(){
      const picked = bxPicked();
      if(!picked.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = picked.filter(r=> !hmOpenRow(r));
      if(bad.length){ ElMessage.warning(hmImpTip()+'删除：'+bad.map(r=> r['申请单号']).join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+picked.length+' 条导入单？删除后不可恢复。', '批量删除', { type:'warning' }).then(()=>{
        const ids = new Set(picked.map(r=> r.id));
        const bag = MOCK[HM_IMP_PAGE];
        bag.main = (bag.main||[]).filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }
    function hmSaveForm(){
      refreshHmExpire();
      const fields = (activeFormFields.value||[]).filter(f=> f && f.name);
      if(!qcCheckRequired(fields)) return;
      const fixed = formModel['使用期限类型']==='固定期限';
      const cycleN = String(formModel['使用周期']||'').trim();
      const cycleU = formModel['使用周期单位'] || '天';
      const warnN = String(formModel['提前预警']||'').trim();
      const warnU = formModel['提前预警单位'] || '天';
      if(fixed){
        if(!/^\d+$/.test(cycleN) || !(parseInt(cycleN,10)>0)){ ElMessage.warning('请填写正整数使用周期'); return; }
        if(!/^\d+$/.test(warnN) || !(parseInt(warnN,10)>0)){ ElMessage.warning('请填写正整数提前预警'); return; }
        if(!formModel['失效日期']){ ElMessage.warning('失效日期计算失败，请检查生效日期与使用周期'); return; }
      }
      const vals = qcFormVals(fields);
      vals['使用周期单位'] = cycleU;
      vals['提前预警单位'] = warnU;
      vals['使用周期值'] = fixed ? cycleN : '';
      vals['提前预警'] = fixed ? warnN : '—';
      vals['使用周期'] = fixed ? (cycleN+' '+cycleU) : '—';
      vals['生效日期'] = fixed ? (vals['生效日期']||'') : '—';
      vals['失效日期'] = fixed ? (formModel['失效日期']||'') : '—';
      const typ = hmFileTypeName(formModel['文件类型']);
      vals['文件类型'] = typ;
      if(typ!=='客户文件'){ vals['客户名称']='—'; vals['客户编码']=''; vals['客户信息']='—'; }
      else {
        vals['客户编码'] = formModel['客户编码'] || '';
        vals['客户名称'] = formModel['客户名称'] || '';
        vals['客户信息'] = formModel['客户信息'] || [vals['客户编码'], vals['客户名称']].filter(Boolean).join(' / ');
      }
      if(typ!=='法规文件') vals['法规名称']='—';
      const matCat = String(formModel['物料类']||vals['物料类']||'').trim();
      if(!matCat){ ElMessage.warning('请选择物料类'); return; }
      vals['物料类'] = matCat;
      const list = hmImpRows();
      const isAdd = formMode.value!=='edit';
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(!isAdd && !cur){ ElMessage.warning('未找到待编辑数据'); return; }
      if(!isAdd && !hmOpenRow(cur)){ ElMessage.warning(hmImpTip()+'编辑'); return; }
      const applyNo = String(vals['申请单号']||formModel['申请单号']||'').trim();
      const fileNo = String(vals['文件编号']||formModel['文件编号']||'').trim();
      if(!applyNo || !fileNo){ ElMessage.warning('请刷新生成申请单号与文件编号'); return; }
      if(list.some(r=> r!==cur && r['申请单号']===applyNo)){ ElMessage.warning('申请单号已存在，请刷新后重试'); return; }
      if(list.some(r=> r!==cur && r['文件编号']===fileNo)){ ElMessage.warning('文件编号已存在，请刷新后重试'); return; }
      const stamp = nowStamp();
      const entryLines = (hmImpEntryRows.value||[]).map(r=> ({
        id: r.id,
        标准编号: r['标准编号']||'',
        标准名称: r['标准名称']||'',
        测试值: r['测试值']||'',
        单位: r['单位']||'',
        比对结果: r['比对结果']||'',
        _archId: r._archId || ''
      }));
      if(isAdd){
        list.unshift(Object.assign({
          id: 'hmimp-'+Date.now().toString(36),
          导入状态: '未导入',
          审核状态: '/',
          审核单号: '—',
          创建人: CI_OPERATOR,
          创建时间: stamp,
        }, vals, { 申请单号: applyNo, 文件编号: fileNo, 导入状态: '未导入', _entryLines: entryLines }));
      } else {
        Object.assign(cur, vals, { 申请单号: applyNo, 文件编号: fileNo, _entryLines: entryLines });
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '新增成功' : '保存成功');
    }
    function openHmAuditDetail(row){
      const pool = pageId.value===HM_VOID_PAGE ? hmVoidRows() : pageId.value===HM_CHG_PAGE ? hmChgRows() : hmImpRows();
      const r = pool.find(x=> x.id===row.id) || row;
      if(!r['审核单号'] || r['审核单号']==='—'){ ElMessage.info('尚未发起审批，无审核单号'); return; }
      const logs = (((r._audit||{}).记录)||[]).slice().reverse();
      const lines = logs.length ? logs.map(x=> (x.时间||'')+'　'+(x.节点名称||'')+'　'+(x.操作人||'')+'　'+(x.结果||'')+(x.意见?('　'+x.意见):'')).join('\n') : '暂无审批记录（演示数据）';
      ElementPlus.ElMessageBox.alert(lines, '审核明细 · '+r['审核单号'], { confirmButtonText:'关闭', customClass:'demo-msgbox-pre' });
    }
    function fileListOf(v){ return splitDun(v).filter(x=> x && x!=='—' && x!=='/'); }
    function onFilePreview(name){ ElMessage.info(name ? '「'+name+'」为原型示例附件，无文件内容可预览' : '暂无附件'); }
    function onFileDownload(name){ ElMessage.info(name ? '「'+name+'」为原型示例附件，无文件内容可下载' : '暂无附件'); }

    /** 色谱柱台账：左侧色谱柱型号（types）+ 右侧色谱柱数据（main），对齐 OLED 色谱柱台账（单列表，无 GC/LC 页签） */
    const COL_PAGE = 'np-0208-01';
    const COL_USERS = [
      { 名称:'张三', 所属部门:'质检部' }, { 名称:'李四', 所属部门:'质检部' },
      { 名称:'王五', 所属部门:'研发部' }, { 名称:'赵六', 所属部门:'研发部' },
      { 名称:'钱七', 所属部门:'生产部' }, { 名称:'孙八', 所属部门:'实验室' }
    ];
    const COL_DEPTS = ['质检部','研发部','生产部','实验室'];
    const colModelId = ref('');
    const colModelKw = ref('');
    const colModelKwApplied = ref('');
    const colModelVisible = ref(false);
    const colModelMode = ref('add');
    const colModelOld = ref(null);
    const colModelForm = reactive({ 名称:'', 备注:'' });
    const colImgUrl = ref('');
    function colTypeName(t){ return String((t && (t['名称'] || t['色谱柱型号'])) || '').trim(); }
    function colBag(){
      if(!MOCK[COL_PAGE]) MOCK[COL_PAGE] = {};
      const b = MOCK[COL_PAGE];
      if(!Array.isArray(b.main)) b.main = [];
      if(!Array.isArray(b.types)) b.types = [];
      // 旧版 GC/LC 页签缓存迁移到单列表 main + 型号 types
      ['tab-1','tab-2'].forEach(t=>{
        if(Array.isArray(b[t])) b[t].forEach(r=>{ if(r && !b.main.some(x=> x.id===r.id)) b.main.push(r); });
        if(b[t]) delete b[t];
      });
      ['models-tab-1','models-tab-2'].forEach(k=>{
        if(Array.isArray(b[k])) b[k].forEach(m=>{
          const n = colTypeName(m);
          if(n && !b.types.some(t=> colTypeName(t)===n)) b.types.push({ id: m.id || ('ct-'+n), 编码:n, 名称:n, 上级字典:'', 备注: m['备注'] || '', 系统开发:false, 分组节点:false });
        });
        if(b[k]) delete b[k];
      });
      b.main.forEach(r=>{
        if(r.typeId) return;
        const t = b.types.find(x=> colTypeName(x)===String(r['色谱柱型号']||'').trim());
        if(t) r.typeId = t.id;
      });
      return b;
    }
    function colModelsOf(){ return colBag().types; }
    function colRowsOf(){ return colBag().main; }
    function colAllRows(){ return colBag().main; }
    // 型号维度台账统计（列表「型号」列第二行）：统计口径取全量台账，不受左侧型号筛选/查询条件影响
    const colModelStatMap = computed(()=>{
      storeTick.value;
      const map = new Map();
      colRowsOf().forEach(r=>{
        const model = String(r['色谱柱型号']||'').trim();
        if(!model) return;
        const cur = map.get(model) || { total:0, inUse:0 };
        cur.total += 1;
        if(String(r['使用状态']||'')==='在用') cur.inUse += 1;
        map.set(model, cur);
      });
      return map;
    });
    function colModelMetaText(name){
      const stat = colModelStatMap.value.get(String(name||'').trim());
      if(!stat) return '暂无台账数据';
      return '共 ' + stat.total + ' 根 · 在用 ' + stat.inUse;
    }
    function colUserOptions(dept){
      const d = Array.isArray(dept) ? dept[0] : dept;
      return COL_USERS.filter(u=> !d || u['所属部门']===d).map(u=> u['名称']);
    }
    const colModelList = computed(()=>{
      storeTick.value;
      if(pageId.value!==COL_PAGE) return [];
      const kw = colModelKw.value.trim().toLowerCase();
      return colModelsOf().filter(m=> !kw || colTypeName(m).toLowerCase().includes(kw) || String(m['备注']||'').toLowerCase().includes(kw));
    });
    const colModelTitle = computed(()=> ({ add:'新建', edit:'编辑' }[colModelMode.value]||'新建') + '色谱柱型号');
    function resetColState(){ colModelId.value=''; colModelKw.value=''; colModelKwApplied.value=''; resetInstState(); }
    function onColModelQuery(){ colModelId.value = ''; selectedIds.value = []; pageNum.value = 1; }
    function selectColModel(id){
      colModelId.value = colModelId.value===id ? '' : id;
      selectedIds.value = []; pageNum.value = 1;
    }
    function openColModel(mode, m){
      colModelMode.value = mode==='edit' ? 'edit' : 'add';
      colModelOld.value = mode==='edit' ? m : null;
      colModelForm['名称'] = m && mode==='edit' ? colTypeName(m) : '';
      colModelForm['备注'] = m && mode==='edit' ? String(m['备注']||'') : '';
      colModelVisible.value = true;
    }
    function onColModelOp(cmd, m){
      if(cmd==='删除'){ removeColModel(m); return; }
      openColModel('edit', m);
    }
    function saveColModel(){
      const name = String(colModelForm['名称']||'').trim();
      if(!name){ ElMessage.warning('请输入色谱柱型号'); return; }
      const old = colModelOld.value;
      if(colModelsOf().some(x=> x!==old && colTypeName(x)===name)){ ElMessage.warning('色谱柱型号「'+name+'」已存在，型号不可重复'); return; }
      const remark = String(colModelForm['备注']||'').trim();
      if(old){
        const from = colTypeName(old);
        if(from!==name){
          colRowsOf().forEach(r=>{ if(r['色谱柱型号']===from) r['色谱柱型号'] = name; });
          driftRowsOf().forEach(r=>{ (r._columns||r._cols||[]).forEach(c=>{ if(c && c['色谱柱型号']===from) c['色谱柱型号'] = name; }); });
        }
        Object.assign(old, { 编码:name, 名称:name, 备注:remark });
        delete old['色谱柱型号'];
      } else {
        colModelsOf().push({ id:'ct-'+Date.now(), 编码:name, 名称:name, 上级字典:'', 备注:remark, 系统开发:false, 分组节点:false, 创建人:'管理员', 创建时间: nowStamp() });
      }
      colModelVisible.value = false;
      bumpStore();
      ElMessage.success(old ? '保存成功' : '已新建色谱柱型号');
    }
