    function confirmLaunchDevReqs(){
      const rows = devLaunchRows.value || [];
      if(!rows.length){ devLaunchVisible.value = false; return; }
      const need = String(devLaunchNeed.value||'').trim() || '—';
      rows.forEach(r=>{ r['测试要求'] = need; r['需求状态'] = '已发起'; });
      selectedIds.value = [];
      devLaunchVisible.value = false;
      bumpStore();
      ElMessage.success('已发起 '+rows.length+' 条器件测试需求，已推送 DDB');
    }
    function closeDevReqs(){
      devSettleTabs();
      const rows = devTab('tab-1').filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选要关闭的需求'); return; }
      if(rows.some(r=> r['需求状态']!=='待发起')){ ElMessage.warning('仅待发起的需求可关闭'); return; }
      rows.forEach(r=> { r['需求状态'] = '已关闭'; });
      selectedIds.value = [];
      bumpStore();
      ElMessage.success('已关闭 '+rows.length+' 条需求');
    }
    function deleteDevReqs(){
      devSettleTabs();
      const rows = devTab('tab-1').filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选要删除的需求'); return; }
      if(rows.some(r=> r['需求状态']!=='待发起' && r['需求状态']!=='已关闭')){ ElMessage.warning('仅待发起或已关闭的需求可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+rows.length+' 条器件测试需求？删除后不可恢复。', '批量删除', { type:'warning' }).then(()=>{
        const list = devTab('tab-1');
        const ids = new Set(rows.map(r=> r.id));
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 条需求');
      }).catch(()=>{});
    }
    function devOpBlock(op, row){
      const st = (row||{})['需求状态'];
      if(op==='编辑' && st!=='待发起') return '仅待发起的需求可编辑';
      if(op==='取消需求' && st!=='待测试') return '仅待测试的需求可取消；DDB 已接收的需求需在 DDB 中取消';
      return '';
    }
    const devCancelVisible = ref(false);
    const devCancelRow = ref(null);
    const devCancelReason = ref('');
    function devSrcRow(row){ return devTab('tab-1').concat(devTab('tab-2')).find(r=> r.id===row.id) || row; }
    function openDevCancel(row){ devCancelRow.value = devSrcRow(row); devCancelReason.value = ''; devCancelVisible.value = true; }
    function confirmDevCancel(){
      const reason = String(devCancelReason.value||'').trim();
      if(!reason){ ElMessage.warning('请输入取消原因'); return; }
      const r = devCancelRow.value;
      Object.assign(r, { 需求状态: '已取消', 取消原因: reason });
      devLog(r, '取消需求', '待测试', '已取消', '取消原因：'+reason);
      devCancelVisible.value = false;
      bumpStore();
      ElMessage.success('已取消 '+r['需求单号']);
    }
    const devLogVisible = ref(false);
    const devLogNo = ref('');
    const devLogRows = computed(()=>{
      void storeTick.value;
      return devTab('tab-2').filter(r=> r['需求单号']===devLogNo.value).slice().sort((a, b)=> String(b['操作时间']).localeCompare(String(a['操作时间'])));
    });
    function openDevLog(row){ devLogNo.value = row['需求单号']; devLogVisible.value = true; }
    const PLATE_PAGE = 'np-0201-16';
    const PLATE_SAMPLE_KEYS = ['样品编号','报检类型','报检单号','物料编码','物料名称','报检批号'];
    function plateTab(name){ const bag = (MOCK[PLATE_PAGE] = MOCK[PLATE_PAGE] || {}); return (bag[name] = bag[name] || []); }
    const plateReqMode = ref('add');
    const plateReqEditId = ref('');
    function plateExceptId(){ return plateReqMode.value==='edit' ? plateReqEditId.value : ''; }
    function plateOpenReq(no){ const skip = plateExceptId(); return plateTab('tab-1').find(r=> r['样品编号']===no && r.id!==skip && (r['需求状态']==='待发起' || r['需求状态']==='已发起')) || null; }
    function plateLog(r, type, from, to, note, who, stamp){
      plateTab('tab-2').unshift({
        id: 'zbl-'+Date.now()+'-'+Math.random().toString(36).slice(2, 7), 操作类型: type, 需求单号: r['需求单号'], 样品编号: r['样品编号'],
        物料名称: r['物料名称'], 原状态: from, 新状态: to, 说明: note || '—', 操作人: who || '管理员', 操作时间: stamp || nowStamp()
      });
    }
    function plateWriteCassette(sampleNo, code){
      /* 样品检验台账已去掉「卡塞信息」；制板回写仅维护卡塞信息表 */
      void sampleNo; void code;
    }
    function plateWriteLithoParam(sampleNo, param){
      const no = String(sampleNo || '').trim();
      const val = (param == null || String(param).trim() === '' || String(param).trim() === '—') ? '' : String(param).trim();
      if(!no || !val) return 0;
      let n = 0;
      const touch = (bag)=>{
        if(!bag || typeof bag !== 'object') return;
        Object.keys(bag).forEach(k=>{
          const rows = bag[k];
          if(!Array.isArray(rows)) return;
          rows.forEach(r=>{
            if(!r || typeof r !== 'object' || r['操作类型']) return;
            if(String(r['样品编号'] || '') !== no) return;
            if(r['光刻参数'] === val) return;
            r['光刻参数'] = val;
            n++;
          });
        });
      };
      touch(MOCK['ledger'] = MOCK['ledger'] || {});
      touch(MOCK['entry-sample'] = MOCK['entry-sample'] || {});
      touch(MOCK['my-task'] = MOCK['my-task'] || {});
      return n;
    }
    function plateSyncDoneLitho(row){
      if(!row || row['需求状态'] !== '已完成') return;
      plateWriteLithoParam(row['样品编号'], row['光刻参数'] || row['制板数据'] || row['制版参数']);
      if(row['制板数据'] != null && row['光刻参数'] == null){ row['光刻参数'] = row['制板数据']; delete row['制板数据']; }
      if(row['制版参数'] != null && row['光刻参数'] == null){ row['光刻参数'] = row['制版参数']; delete row['制版参数']; }
    }
    function plateSampleView(s){
      const open = plateOpenReq(s['样品编号']);
      return Object.assign({}, s, { _open: open ? open['需求单号'] : '' });
    }
    const plateReqVisible = ref(false);
    const plateReqRows = ref([]);
    const PLATE_HEAD_BLANK = { 样品编号:'', 报检单号:'', 报检类型:'', 物料编码:'', 物料名称:'', 物料规格:'', 报检批号:'' };
    const plateReqForm = reactive({ ...PLATE_HEAD_BLANK, 需求完成时间:'', 制板要求:'' });
    function syncPlateHead(){
      const head = plateReqRows.value.length ? joinReqHead(plateReqRows.value) : { ...PLATE_HEAD_BLANK };
      Object.assign(plateReqForm, head);
    }
    const plateReqTitle = computed(()=> ({ edit:'编辑', copy:'复制' }[plateReqMode.value] || '新增'));
    function openPlateReq(mode, row){
      plateReqMode.value = mode==='edit' || mode==='copy' ? mode : 'add';
      plateReqEditId.value = plateReqMode.value==='edit' && row ? row.id : '';
      if(plateReqMode.value==='add' || !row){
        plateReqRows.value = [];
        Object.assign(plateReqForm, { ...PLATE_HEAD_BLANK, 需求完成时间:'', 制板要求:'' });
      } else {
        const src = plateSrcRow(row);
        plateReqRows.value = [plateSampleView(reqSampleBase(src))];
        syncPlateHead();
        plateReqForm.需求完成时间 = blankDash(src['需求完成时间']);
        plateReqForm.制板要求 = blankDash(src['制板要求']);
      }
      plateReqVisible.value = true;
    }
    function clearPlateSamples(){ plateReqRows.value = []; syncPlateHead(); }
    function removePlateReqRow(row){ plateReqRows.value = plateReqRows.value.filter(r=> r['样品编号']!==row['样品编号']); syncPlateHead(); }
    function applyPlatePick(rows, tab){
      plateReqRows.value = rows.map(r=>{
        const label = r['报检类型'] || flowLabelOf(r._ledgerTab || tab);
        return plateSampleView(Object.assign({}, r, { 报检类型: label }));
      });
      syncPlateHead();
    }
    function openPlatePick(){ openReqSamplePick('plate'); }
    function plateNextNo(prefix, stamp, width){
      const ymd = stamp.slice(2, 10).replace(/-/g, '');
      const bags = plateTab('tab-1').concat(plateTab('tab-2'));
      const field = prefix==='ZB' ? '需求单号' : 'FES需求单号';
      const max = bags.reduce((m, r)=>{ const x = String(r[field]||'').match(new RegExp('^'+prefix+ymd+'(\\d{'+width+'})$')); return x ? Math.max(m, +x[1]) : m; }, 0);
      return prefix + ymd + String(max + 1).padStart(width, '0');
    }
    function plateSettleTabs(){
      settleReqTabs(plateTab('tab-1'), plateTab('tab-2'), { '待制板':'已发起', '已取消':'已关闭' });
      plateTab('tab-1').concat(plateTab('tab-2')).forEach(r=>{
        if(!r || r['操作类型']) return;
        if(r['制板数据'] != null && (r['光刻参数'] == null || r['光刻参数'] === '')){ r['光刻参数'] = r['制板数据']; }
        if(r['制版参数'] != null && (r['光刻参数'] == null || r['光刻参数'] === '')){ r['光刻参数'] = r['制版参数']; }
        if(r['制板数据'] != null) delete r['制板数据'];
        if(r['制版参数'] != null) delete r['制版参数'];
        plateSyncDoneLitho(r);
      });
    }
    function plateMoveDone(r, status){
      r['需求状态'] = status;
      if(status==='已关闭'){
        const done = plateTab('tab-2');
        const di = done.findIndex(x=> x.id===r.id);
        if(di>=0) done.splice(di, 1);
        const open = plateTab('tab-1');
        if(!open.some(x=> x.id===r.id)) open.unshift(r);
        return;
      }
      const open = plateTab('tab-1');
      const i = open.findIndex(x=> x.id===r.id);
      if(i>=0) open.splice(i, 1);
      const done = plateTab('tab-2');
      if(!done.some(x=> x.id===r.id)) done.unshift(r);
      plateSyncDoneLitho(r);
    }
    function createPlateReqs(rows){
      const stamp = nowStamp(), list = plateTab('tab-1');
      const need = String(plateReqForm.制板要求||'').trim();
      const editing = plateReqMode.value==='edit' ? list.find(r=> r.id===plateReqEditId.value) : null;
      let created = 0;
      rows.forEach((s, i)=>{
        const open = plateOpenReq(s['样品编号']);
        const warns = [];
        if(open) warns.push('重复发起：已有未完成需求 '+open['需求单号']);
        const fields = {
          制板类型: '光刻',
          发起提醒: warns.length ? warns.join('；')+'；已确认继续新增' : '—',
          制板要求: need || '—', 需求完成时间: plateReqForm.需求完成时间 || '—'
        };
        PLATE_SAMPLE_KEYS.forEach(k=> { fields[k] = s[k] || '—'; });
        if(editing && i===0){ Object.assign(editing, fields); return; }
        const r = { id: 'zb-'+Date.now()+'-'+Math.random().toString(36).slice(2, 7), 需求状态: '待发起', 需求单号: plateNextNo('ZB', stamp, 3) };
        Object.assign(r, fields, {
          发起人: '管理员', 发起时间: stamp, FES需求单号: '—', 接收时间: '—',
          卡塞二维码号: '—', 光刻参数: '—', 完成时间: '—', 取消原因: '—'
        });
        list.unshift(r);
        created++;
      });
      plateReqVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      if(editing && !created) ElMessage.success('已保存');
      else if(editing) ElMessage.success('已保存，并新增 '+created+' 条光刻任务需求');
      else if(plateReqMode.value==='copy') ElMessage.success('已复制 '+created+' 条光刻任务需求');
      else ElMessage.success('已新增 '+created+' 条光刻任务需求');
    }
    function confirmPlateReq(){
      const rows = plateReqRows.value;
      if(!rows.length){ ElMessage.warning('请先选择样品编号'); return; }
      const dup = rows.filter(r=> plateOpenReq(r['样品编号']));
      if(!dup.length){ createPlateReqs(rows); return; }
      const esc = v=> String(v).replace(/[&<>]/g, c=> ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
      const ask = plateReqMode.value==='edit' ? '保存' : plateReqMode.value==='copy' ? '复制' : '新增';
      const html = '<p style="margin:0 0 6px"><b>以下样品已有未完成的光刻任务需求：</b></p><p style="margin:0 0 10px">'+dup.map(r=> esc(r['样品编号'])+'（'+esc(plateOpenReq(r['样品编号'])['需求单号'])+'）').join('、')+'</p><p style="margin:0">是否仍要'+ask+'？</p>';
      ElementPlus.ElMessageBox.confirm(html, '二次确认', { type:'warning', dangerouslyUseHTMLString: true, confirmButtonText:'继续'+ask, cancelButtonText:'返回修改' })
        .then(()=> createPlateReqs(rows)).catch(()=>{});
    }
    const plateLaunchVisible = ref(false);
    const plateLaunchNeed = ref('');
    const plateLaunchRows = ref([]);
    function launchPlateReqs(){
      plateSettleTabs();
      const rows = plateTab('tab-1').filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选待发起的需求'); return; }
      if(rows.some(r=> r['需求状态']!=='待发起')){ ElMessage.warning('仅待发起的需求可发起'); return; }
      const raw = String((rows[0]||{})['制板要求']||'').trim();
      plateLaunchNeed.value = (!raw || raw==='—') ? '' : raw;
      plateLaunchRows.value = rows;
      plateLaunchVisible.value = true;
    }
    function confirmLaunchPlateReqs(){
      const rows = plateLaunchRows.value || [];
      if(!rows.length){ plateLaunchVisible.value = false; return; }
      const need = String(plateLaunchNeed.value||'').trim() || '—';
      const stamp = nowStamp();
      rows.forEach(r=>{
        r['制板要求'] = need;
        r['需求状态'] = '已发起';
        if(!r['FES需求单号'] || r['FES需求单号']==='—') r['FES需求单号'] = plateNextNo('FES', stamp, 5);
      });
      selectedIds.value = [];
      plateLaunchVisible.value = false;
      bumpStore();
      ElMessage.success('已发起 '+rows.length+' 条光刻任务需求，已推送 FES，请线下送样');
    }
    function closePlateReqs(){
      plateSettleTabs();
      const rows = plateTab('tab-1').filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选要关闭的需求'); return; }
      if(rows.some(r=> r['需求状态']!=='待发起')){ ElMessage.warning('仅待发起的需求可关闭'); return; }
      rows.forEach(r=> { r['需求状态'] = '已关闭'; });
      selectedIds.value = [];
      bumpStore();
      ElMessage.success('已关闭 '+rows.length+' 条需求');
    }
    function deletePlateReqs(){
      plateSettleTabs();
      const rows = plateTab('tab-1').filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选要删除的需求'); return; }
      if(rows.some(r=> r['需求状态']!=='待发起' && r['需求状态']!=='已关闭')){ ElMessage.warning('仅待发起或已关闭的需求可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+rows.length+' 条光刻任务需求？删除后不可恢复。', '批量删除', { type:'warning' }).then(()=>{
        const list = plateTab('tab-1');
        const ids = new Set(rows.map(r=> r.id));
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 条需求');
      }).catch(()=>{});
    }
    function plateSrcRow(row){ return plateTab('tab-1').concat(plateTab('tab-2')).find(r=> r.id===row.id) || row; }
    function plateOpBlock(op, row){
      if(op==='编辑' && (row||{})['需求状态']!=='待发起') return '仅待发起的需求可编辑';
      if(op==='取消需求' && (row||{})['需求状态']!=='待制板') return '仅待制板的需求可取消；FES 已完成的需求不可取消';
      return '';
    }
    const plateCancelVisible = ref(false);
    const plateCancelRow = ref(null);
    const plateCancelReason = ref('');
    function openPlateCancel(row){ plateCancelRow.value = plateSrcRow(row); plateCancelReason.value = ''; plateCancelVisible.value = true; }
    function confirmPlateCancel(){
      const reason = String(plateCancelReason.value||'').trim();
      if(!reason){ ElMessage.warning('请输入取消原因'); return; }
      const r = plateCancelRow.value;
      Object.assign(r, { 需求状态: '已取消', 取消原因: reason });
      plateLog(r, '取消需求', '待制板', '已取消', '取消原因：'+reason);
      plateCancelVisible.value = false;
      bumpStore();
      ElMessage.success('已取消 '+r['需求单号']+'，已通知 FES 撤回');
    }
    const plateLogVisible = ref(false);
    const plateLogNo = ref('');
    const plateLogRows = computed(()=>{
      void storeTick.value;
      return plateTab('tab-2').filter(r=> r['需求单号']===plateLogNo.value).slice().sort((a, b)=> String(b['操作时间']).localeCompare(String(a['操作时间'])));
    });
    function openPlateLog(row){ plateLogNo.value = row['需求单号']; plateLogVisible.value = true; }
    const CASS_PAGE = 'np-0201-17';
    function cassList(){ const bag = (MOCK[CASS_PAGE] = MOCK[CASS_PAGE] || {}); return (bag.main = bag.main || []); }
    function cassNextNo(){
      const d = new Date();
      const prefix = 'KSXX' + String(d.getFullYear()).slice(2) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
      let max = 0;
      cassList().forEach(r=>{
        const s = String(r['信息流水号']||'');
        if(!s.startsWith(prefix)) return;
        const n = parseInt(s.slice(prefix.length), 10);
        if(n > max) max = n;
      });
      return prefix + String(max + 1).padStart(3, '0');
    }
    function cassEmptyLine(){
      return { 玻璃板序号:'', 批次号:'', 样品编号:'', 物料编码:'', 物料名称:'' };
    }
    function renumberCassLines(){
      (formLineRows.value||[]).forEach((r, i)=>{ r['玻璃板序号'] = String(i + 1); });
    }
    function openCassForm(){
      openForm('add');
      formModel['信息流水号'] = cassNextNo();
      formModel['卡塞编号'] = '';
      formModel['卡塞类型'] = '';
      formLineRows.value = [];
      formLineSelected.value = [];
    }
    function saveCassForm(){
      const no = String(formModel['信息流水号']||'').trim() || cassNextNo();
      const code = String(formModel['卡塞编号']||'').trim();
      const typ = String(formModel['卡塞类型']||'').trim();
      if(!code){ ElMessage.warning('请输入卡塞编号'); return; }
      if(!typ){ ElMessage.warning('请选择卡塞类型'); return; }
      const list = cassList();
      const cur = formMode.value==='edit' ? list.find(r=> r.id===formModel._editId) : null;
      if(list.some(r=> r['信息流水号']===no && r!==cur)){ ElMessage.warning('信息流水号「'+no+'」已存在'); return; }
      renumberCassLines();
      const lines = (formLineRows.value||[]).map(r=>({
        玻璃板序号: String(r['玻璃板序号']||'').trim(),
        批次号: String(r['批次号']||'').trim() || '—',
        样品编号: String(r['样品编号']||'').trim() || '—',
        物料编码: String(r['物料编码']||'').trim() || '—',
        物料名称: String(r['物料名称']||'').trim() || '—'
      })).filter(r=> r['批次号']!=='—' || r['样品编号']!=='—' || r['物料编码']!=='—' || r['物料名称']!=='—');
      lines.forEach((r, i)=>{ r['玻璃板序号'] = String(i + 1); });
      if(cur){
        Object.assign(cur, { 卡塞编号: code, 卡塞类型: typ, 关联玻璃板数: String(lines.length), _lines: lines });
        formVisible.value = false;
        bumpStore();
        ElMessage.success('已保存卡塞 '+no);
        return;
      }
      list.unshift({
        id: 'ks-'+Date.now().toString(36),
        信息流水号: no,
        卡塞编号: code,
        卡塞类型: typ,
        关联玻璃板数: String(lines.length),
        创建人: '管理员',
        创建时间: nowStamp(),
        _lines: lines
      });
      formVisible.value = false;
      bumpStore();
      ElMessage.success('已新增卡塞 '+no);
    }
    function deleteCassRows(){
      const ids = new Set(selectedIds.value);
      if(!ids.size){ ElMessage.warning('请先勾选要删除的卡塞信息'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条卡塞信息？删除后不可恢复。', '批量删除', { type:'warning' }).then(()=>{
        const list = cassList();
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条卡塞信息');
      }).catch(()=>{});
    }
    const OQC_PAGE = 'np-0201-15';
    const UQ_SUM_PAGE = 'unqual-sum';
    const UQ_SUM_SRC = [
      { page:'unqual-pi', type:'采购来料不合格' },
      { page:'unqual-pp', type:'生产过程不合格' },
      { page:'unqual-pm', type:'生产物料不合格' },
      { page:'unqual-rd', type:'研发不合格处置' }
    ];
    const DEV_SUM_PAGE = 'dev-sum';
    const DEV_SUM_SRC = [
      { page:'dev-pi', type:'采购来料偏差' },
      { page:'dev-pp', type:'生产过程偏差' },
      { page:'dev-pm', type:'生产物料偏差' },
      { page:'dev-rd', type:'研发偏差' }
    ];
    function oqcTab(name){ const bag = (MOCK[OQC_PAGE] = MOCK[OQC_PAGE] || {}); return (bag[name] = bag[name] || []); }
    const oqcUploadVisible = ref(false);
    const oqcUploadRows = ref([]);
    const oqcUploadFiles = ref([]);
    const oqcUploadRemark = ref('');
    const oqcUploadResult = ref('合格');
    const coaUploadVisible = ref(false);
    const coaUploadRow = ref(null);
    const coaUploadFiles = ref([]);
    function openCoaUpload(row){
      coaUploadRow.value = row || null;
      coaUploadFiles.value = [];
      coaUploadVisible.value = true;
    }
    function confirmCoaUpload(){
      const files = (coaUploadFiles.value||[]).map(f=> f.name).filter(Boolean);
      if(!files.length){ ElMessage.warning('请上传附件'); return; }
      const row = coaUploadRow.value;
      if(row) row['供应商COA'] = files.join('、');
      coaUploadVisible.value = false;
      bumpStore();
      ElMessage.success('已上传供应商COA');
    }
    function openOqcUpload(rows){
      if(!(rows||[]).length){ ElMessage.warning('请先勾选OQC任务'); return; }
      if(rows.some(r=> r['单据状态']==='已关闭')){ ElMessage.warning('已关闭的任务不能上传附件'); return; }
      oqcUploadRows.value = rows.slice();
      oqcUploadFiles.value = [];
      oqcUploadRemark.value = '';
      oqcUploadResult.value = '合格';
      oqcUploadVisible.value = true;
    }
    function confirmOqcUpload(){
      const files = (oqcUploadFiles.value||[]).map(f=> f.name).filter(Boolean);
      if(!files.length){ ElMessage.warning('请上传附件'); return; }
      const ids = new Set(oqcUploadRows.value.map(r=> r.id));
      const stamp = nowStamp(), remark = String(oqcUploadRemark.value||'').trim() || '—';
      const pending = oqcTab('tab-1'), done = oqcTab('tab-2');
      const moved = pending.filter(r=> ids.has(r.id));
      MOCK[OQC_PAGE]['tab-1'] = pending.filter(r=> !ids.has(r.id));
      moved.forEach(r=> done.unshift(Object.assign({}, r, { 单据状态:'已完成', 检查结果: oqcUploadResult.value, 附件: files.join('、'), 备注: remark, 上传人: '管理员', 完成时间: stamp, 关闭人:'—', 关闭时间:'—' })));
      oqcUploadVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      ElMessage.success('已为 '+moved.length+' 条 OQC 任务上传附件');
    }
    function oqcNextNo(){
      const d = new Date();
      const prefix = 'OQC' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
      let max = 0;
      ['tab-1','tab-2'].forEach(t=>{
        oqcTab(t).forEach(r=>{
          const s = String(r['单据号']||'');
          if(!s.startsWith(prefix)) return;
          const n = parseInt(s.slice(prefix.length), 10);
          if(n > max) max = n;
        });
      });
      return prefix + String(max + 1).padStart(3, '0');
    }
    function saveOqcForm(){
      const fields = (activeFormFields.value||[]).filter(f=> f && f.name);
      if(!qcCheckRequired(fields)) return;
      const list = oqcTab('tab-1');
      const isAdd = formMode.value!=='edit';
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(!isAdd && !cur){ ElMessage.warning('未找到待编辑数据'); return; }
      const no = String(formModel['单据号']||'').trim() || oqcNextNo();
      const all = ['tab-1','tab-2'].flatMap(t=> oqcTab(t));
      if(all.some(r=> r!==cur && r['单据号']===no)){ ElMessage.warning('单据号「'+no+'」已存在'); return; }
      if(!String(formModel['客户编码']||'').trim()){ ElMessage.warning('请选择客户信息'); return; }
      if(!String(formModel['物料编码']||'').trim()){ ElMessage.warning('请选择物料编码'); return; }
      const vals = {
        单据号: no,
        DN单号: String(formModel['DN单号']||'').trim(),
        客户编码: formModel['客户编码']||'',
        客户名称: formModel['客户名称']||'',
        物料编码: formModel['物料编码']||'',
        物料名称: formModel['物料名称']||'',
        物料规格: formModel['物料规格']||'',
        物料种类: formModel['物料种类']||'',
        批号: String(formModel['批号']||'').trim(),
        发货数量: String(formModel['发货数量']||'').trim(),
        销售单位: String(formModel['销售单位']||'').trim(),
        计划发货日期: String(formModel['计划发货日期']||'').trim()
      };
      if(isAdd) list.unshift(Object.assign({ id: 'oqc-'+Date.now().toString(36), 单据状态: '待执行', 创建时间: nowStamp() }, vals));
      else Object.assign(cur, vals);
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '已新增 OQC 任务 '+no : '保存成功');
    }
