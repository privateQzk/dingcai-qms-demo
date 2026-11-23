    const SPLIT_PAGE = 'np-0201-11';
    const SPLIT_TEAMS = ['HPLC班组','ICP班组','来料检一组','过程检一组','钢瓶检一组'];
    const sampSplitVisible = ref(false);
    const sampSplitForm = reactive({ 份数: 2, 检验班组: '', 拆分备注: '' });
    const sampSplitRows = ref([]);
    const sampSplitSelected = ref([]);
    const sampSplitRecordVisible = ref(false);
    const sampSplitRecordParent = ref(null);
    function sampSplitList(){ return ((MOCK[SPLIT_PAGE]||{}).main)||[]; }
    function splitPageRowVisible(r){
      return r['样品来源']==='样品拆分' && !!r._onSplitPage;
    }
    function sampSplitSrc(r){ return sampSplitList().find(x=> x.id===r.id || x['样品编号']===r['样品编号']) || r; }
    function sampSplitBlockReason(r){
      if(r['样品来源']!=='报检取样') return '子样品不可再次拆分';
      if(!['待检验','检验中'].includes(r['样品状态'])) return '已完成的样品不可拆分';
      return '';
    }
    function ledgerRowToSplitParent(lg, tab){
      const no = lg['样品编号'];
      const ex = flowSplitRow(no);
      if(ex) return ex;
      const label = flowLabelOf(tab);
      return {
        id: 'sp-'+no, 样品状态: lg['样品状态'] || '待检验', 样品类型: '母样', 拆分状态: '未拆分', 样品编号: no, 母样编号: '—',
        样品来源: lg['样品来源'] || '报检取样', 报检类型: label, 报检单号: lg['报检单号'] || '—',
        物料编码: lg['物料编码'] || '—', 物料名称: lg['物料名称'] || '—', 物料规格: lg['物料规格'] || '—',
        报检批号: lg['报检批号'] || '—', 采样点: lg['采样点'] || '—', 检验班组: lg['检验班组'] || '—',
        检验方案: lg['检验方案'] || '—', 方案项目: lg['方案项目'] || '—', 临时项目: lg['临时项目'] || '—',
        已拆分数量: '0', 取样备注: lg['取样备注'] || '', 取样时间: lg['取样时间'] || '—', 取样人: lg['取样人'] || '—',
        拆分备注: '—', 拆分时间: '—', 拆分人: '—'
      };
    }
    function ensureSampSplitParent(p){
      const list = sampSplitList();
      let idx = list.findIndex(r=> r['样品编号']===p['样品编号']);
      if(idx < 0){ list.unshift(Object.assign({}, p)); return list[0]; }
      Object.assign(list[idx], p);
      delete list[idx]._onSplitPage;
      return list[idx];
    }
    function sampSplitChildren(no){ return sampSplitList().filter(r=> r['母样编号']===no); }
    function sampSplitNextSeq(p){
      const no = p['样品编号'];
      const used = sampSplitChildren(no).map(r=> parseInt(String(r['样品编号']).slice(no.length+1), 10) || 0);
      return Math.max(p._splitMax||0, 0, ...used) + 1;
    }
    const sampSplitParents = ref([]);
    function renumberSampSplitRows(){
      const useForm = pageId.value===SPLIT_PAGE && formVisible.value;
      const lines = useForm ? (formLineRows.value||[]) : (sampSplitRows.value||[]);
      const parents = useForm ? splitFormParents() : sampSplitParents.value;
      parents.forEach(p=>{
        let seq = sampSplitNextSeq(p);
        lines.filter(l=> l._src===p || l['母样编号']===p['样品编号']).forEach(l=>{
          const no = p['样品编号']+'-'+(seq++);
          l.样品编号 = no;
          l.子样品编号 = no;
        });
      });
    }
    function splitSampleRows(){
      const tab = flowTabOf(formModel['报检类型']);
      if(!tab) return [];
      return flowBag(FLOW_LEDGER, tab).filter(r=>{
        if(!['待检验','检验中'].includes(r['样品状态'])) return false;
        if(r['样品来源']==='样品拆分') return false;
        return true;
      });
    }
    function applySplitParents(parents){
      const prev = formModel['样品编号'];
      const join = key=> parents.map(p=>{
        const v = p[key];
        return (v && v!=='—') ? v : '—';
      }).join(',');
      formModel['样品编号'] = parents.map(p=> p['样品编号']).filter(Boolean).join(',');
      ['报检单号','物料编码','物料名称','物料规格','报检批号'].forEach(k=>{ formModel[k] = join(k); });
      formModel._splitParents = parents;
      formModel._splitParent = parents[0] || null;
      if(prev && prev!==formModel['样品编号']) formLineRows.value = [];
    }
    function applySplitSamplePick(rows){
      const tab = flowTabOf(formModel['报检类型']);
      const parents = (rows||[]).map(r=> ledgerRowToSplitParent(r, tab));
      const bad = parents.find(r=> sampSplitBlockReason(r));
      if(bad){ ElMessage.warning('样品 '+bad['样品编号']+' 不可拆分：'+sampSplitBlockReason(bad)); return; }
      applySplitParents(parents);
      ioPickVisible.value = false;
    }
    function splitFormParents(){
      if(formModel._splitParents && formModel._splitParents.length) return formModel._splitParents;
      return formModel._splitParent ? [formModel._splitParent] : [];
    }
    function openSampleSplit(rows, emptyTip){
      if(!(rows||[]).length){ ElMessage.warning(emptyTip || '请先选择要拆分的样品'); return; }
      const bad = rows.find(r=> sampSplitBlockReason(r));
      if(bad){ ElMessage.warning('样品 '+bad['样品编号']+' 不可拆分：'+sampSplitBlockReason(bad)); return; }
      sampSplitForm.份数 = 1; sampSplitForm.检验班组 = ''; sampSplitForm.拆分备注 = '';
      sampSplitParents.value = rows.map(r=> sampSplitSrc(r));
      sampSplitRows.value = [];
      sampSplitSelected.value = [];
      sampSplitVisible.value = true;
    }
    const sampSplitPickVisible = ref(false);
    const reqPickFor = ref('');
    const reqPickSingle = computed(()=> reqPickFor.value==='dev' || reqPickFor.value==='plate');
    const sampSplitPickTableRef = ref(null);
    const sampSplitPickTab = ref('tab-pi');
    const sampSplitPickQ = reactive({ 样品编号:'', 报检单号:'' });
    const sampSplitPickSelected = ref([]);
    watch(sampSplitPickTab, ()=>{ sampSplitPickSelected.value = []; });
    watch(sampSplitPickVisible, v=>{ if(!v) reqPickFor.value = ''; });
    const SPLIT_PICK_HIDE = ['检验结论','偏差结论','异常描述','检验完成时间','检验人','关闭时间','关闭人','关闭说明','操作','_actions'];
    const sampSplitPickRows = computed(()=>{
      void storeTick.value;
      const no = String(sampSplitPickQ.样品编号||'').trim(), ord = String(sampSplitPickQ.报检单号||'').trim();
      const take = (r)=>{
        if(!['待检验','检验中'].includes(r['样品状态'])) return false;
        if(reqPickFor.value && r['样品来源']==='样品拆分') return false;
        if(no && !String(r['样品编号']).includes(no)) return false;
        if(ord && !String(r['报检单号']).includes(ord)) return false;
        return true;
      };
      const rows = [];
      FLOW_TABS.forEach(t=>{
        flowBag(FLOW_LEDGER, t.name).forEach(r=>{
          if(!take(r)) return;
          rows.push(Object.assign({}, r, { _ledgerTab: t.name, 报检类型: r['报检类型'] || t.label }));
        });
      });
      return rows;
    });
    const sampSplitPickCols = computed(()=>{
      const tab = (FLOW_TABS[0] && FLOW_TABS[0].name) || 'tab-pi';
      const tv = (((CFG.pages||{})[FLOW_LEDGER]||{}).tabViews||[]).find(t=> t.name===tab);
      const cols = ((tv && tv.columns) || []).filter(c=> c.field && !SPLIT_PICK_HIDE.includes(c.field)).slice(0, 10);
      if(!cols.some(c=> c.field==='报检类型')){
        const i = cols.findIndex(c=> c.field==='样品编号');
        cols.splice(i>=0 ? i+1 : 0, 0, { field:'报检类型', title:'报检类型', width:120 });
      }
      return cols;
    });
    const sampSplitPickShowTabs = computed(()=> false);
    function openSampSplitLedgerPick(){
      const parents = formModel._splitParents || [];
      const label = parents[0] && parents[0]['报检类型'];
      sampSplitPickTab.value = flowTabOf(label) || (FLOW_TABS[0] && FLOW_TABS[0].name) || 'tab-pi';
      Object.assign(sampSplitPickQ, { 样品编号:'', 报检单号:'' });
      sampSplitPickSelected.value = [];
      sampSplitPickVisible.value = true;
      const nos = new Set((parents||[]).map(p=> p['样品编号']).filter(Boolean));
      if(!nos.size) return;
      nextTick(()=> setTimeout(()=>{
        const t = sampSplitPickTableRef.value;
        if(t) sampSplitPickRows.value.forEach(r=>{ if(nos.has(r['样品编号'])) t.toggleRowSelection(r, true); });
      }, 0));
    }
    function openReqSamplePick(kind){
      reqPickFor.value = kind;
      const rows = kind==='dev' ? (devReqRows.value||[]) : (plateReqRows.value||[]);
      Object.assign(sampSplitPickQ, { 样品编号:'', 报检单号:'' });
      sampSplitPickSelected.value = [];
      sampSplitPickVisible.value = true;
      const nos = new Set(rows.map(p=> p['样品编号']).filter(Boolean));
      if(!nos.size) return;
      nextTick(()=> setTimeout(()=>{
        const t = sampSplitPickTableRef.value;
        if(!t) return;
        if(kind==='dev' || kind==='plate'){
          const hit = sampSplitPickRows.value.find(r=> nos.has(r['样品编号']));
          if(hit){ t.setCurrentRow(hit); sampSplitPickSelected.value = [hit]; }
          return;
        }
        sampSplitPickRows.value.forEach(r=>{ if(nos.has(r['样品编号'])) t.toggleRowSelection(r, true); });
      }, 0));
    }
    function confirmSampSplitLedgerPick(){
      let rows = sampSplitPickSelected.value || [];
      if(reqPickSingle.value) rows = rows.slice(0, 1);
      if(!rows.length){ ElMessage.warning(reqPickSingle.value ? '请选择一条数据' : '请至少选择一条数据'); return; }
      const tab = sampSplitPickTab.value;
      const kind = reqPickFor.value;
      if(kind==='dev' || kind==='plate'){
        reqPickFor.value = '';
        sampSplitPickVisible.value = false;
        if(kind==='dev') applyDevPick(rows, tab);
        else applyPlatePick(rows, tab);
        return;
      }
      const parents = rows.map(r=> ledgerRowToSplitParent(r, r._ledgerTab || tab));
      const bad = parents.find(r=> sampSplitBlockReason(r));
      if(bad){ ElMessage.warning('样品 '+bad['样品编号']+' 不可拆分：'+sampSplitBlockReason(bad)); return; }
      sampSplitPickVisible.value = false;
      if(pageId.value===SPLIT_PAGE && formVisible.value){ applySplitParents(parents); return; }
      openSampleSplit(parents.map(r=> sampSplitSrc(r)));
    }
    function genSampSplitRows(){
      if(pageId.value===SPLIT_PAGE && formVisible.value){
        const parents = splitFormParents();
        if(!parents.length || !formModel['样品编号']){ ElMessage.warning('请先选择样品编号'); return; }
        const n = Number(formModel['拆分份数']);
        if(!Number.isInteger(n) || n<1){ ElMessage.warning('拆分份数需为≥1的正整数'); return; }
        const note = formModel['拆分备注'] || '';
        const rows = [];
        parents.forEach(p=>{
          for(let k=0; k<n; k++){
            rows.push({
              _src: p, 子样品编号: '', 样品编号: '', 母样编号: p['样品编号'],
              物料名称: p['物料名称'] || '—', 报检批号: p['报检批号'] || '—',
              检验方案: p['检验方案'] || '—', 检验班组: p['检验班组'] || '', 拆分备注: note
            });
          }
        });
        formLineRows.value = rows;
        formLineSelected.value = [];
        renumberSampSplitRows();
        return;
      }
      const n = Number(sampSplitForm.份数);
      if(!Number.isInteger(n) || n<1){ ElMessage.warning('拆分份数需为≥1的正整数'); return; }
      const rows = [];
      sampSplitParents.value.forEach(p=>{
        for(let k=0; k<n; k++) rows.push({ _src: p, 样品编号: '', 检验班组: sampSplitForm.检验班组 || p['检验班组'], 拆分备注: sampSplitForm.拆分备注 });
      });
      sampSplitRows.value = rows;
      sampSplitSelected.value = [];
      renumberSampSplitRows();
    }
    function removeSampSplitRow(i){
      sampSplitRows.value.splice(i, 1);
      renumberSampSplitRows();
    }
    function confirmSampleSplit(){
      const useForm = pageId.value===SPLIT_PAGE && formVisible.value;
      const lines = useForm ? (formLineRows.value||[]) : sampSplitRows.value;
      if(useForm && !formModel['样品编号']){ ElMessage.warning('请先选择样品编号'); return; }
      if(!lines.length){ ElMessage.warning('请先点「拆分」生成子样品'); return; }
      const list = sampSplitList();
      const stamp = nowStamp();
      const created = [];
      const parentNos = [...new Set(lines.map(l=> (l._src && l._src['样品编号']) || '').filter(Boolean))];
      const parents = parentNos.map(no=>{
        const src = lines.find(l=> l._src && l._src['样品编号']===no);
        return ensureSampSplitParent(sampSplitSrc(src && src._src ? src._src : { 样品编号: no }));
      });
      parents.forEach(p=>{
        const no = p['样品编号'];
        const kids = lines.filter(l=> l._src && l._src['样品编号']===no).map(l=>{
          const kid = { ...p,
            id: 'sp-'+Date.now()+'-'+l.样品编号,
            样品编号: l.样品编号, 母样编号: no, 样品来源: '样品拆分', 样品状态: p['样品状态']==='检验中' ? '检验中' : '待检验', 样品类型: '子样',
            拆分状态: '—', 已拆分数量: '—', 检验班组: l.检验班组 || p['检验班组'],
            拆分备注: l.拆分备注 || '—', 拆分时间: stamp, 拆分人: '管理员' };
          delete kid._splitMax;
          delete kid._entry;
          delete kid._asg;
          kid._onSplitPage = true;
          return kid;
        });
        const n = kids.length, start = sampSplitNextSeq(p);
        let idx = list.findIndex(r=> r.id===p.id);
        list.forEach((r, i)=>{ if(r['母样编号']===no) idx = Math.max(idx, i); });
        list.splice(idx+1, 0, ...kids);
        p['拆分状态'] = '已拆分';
        p['已拆分数量'] = String((parseInt(p['已拆分数量'], 10) || 0) + n);
        p._splitMax = start + n - 1;
        created.push(...kids);
      });
      flowSyncAll();
      if(useForm) formVisible.value = false;
      else sampSplitVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      ElMessage.success('已拆分 '+parents.length+' 个样品，生成 '+created.length+' 个子样品');
    }
    function sampSplitDeletable(r){ return r['样品来源']==='样品拆分' && r['样品状态']==='待检验'; }
    const canDeleteEnvMon = computed(()=>{
      if(pageId.value!=='np-0501-01' || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['采集状态']==='关闭');
    });
    const canDeleteSampSplit = computed(()=>{
      if(pageId.value!==SPLIT_PAGE) return true;
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      return rows.length > 0 && rows.every(sampSplitDeletable);
    });
    function deleteSampSplitChildren(rows){
      if(!rows.length || !rows.every(sampSplitDeletable)){ ElMessage.warning('仅样品来源为「样品拆分」且样品状态为「待检验」的样品可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+rows.length+' 个子样品？删除后不可恢复，已删除的子样品编号不再复用。', '批量删除', { type: 'warning' }).then(()=>{
        const list = sampSplitList();
        const ids = new Set(rows.map(r=> r.id));
        const parents = new Set(rows.map(r=> r['母样编号']));
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        parents.forEach(no=>{
          const p = list.find(r=> r['样品编号']===no);
          if(!p) return;
          const left = sampSplitChildren(no).length;
          p['已拆分数量'] = String(left);
          p['拆分状态'] = left ? '已拆分' : '未拆分';
        });
        flowSyncAll();
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 个子样品');
      }).catch(()=>{});
    }
    const sampSplitRecordRows = computed(()=>{
      void storeTick.value;
      const p = sampSplitRecordParent.value;
      return p ? sampSplitChildren(p['样品编号']) : [];
    });
    function openSampSplitRecord(row){
      sampSplitRecordParent.value = sampSplitSrc(row);
      sampSplitRecordVisible.value = true;
    }
    const SLOC_PAGE = 'np-0201-12';
    const SLPOS_PAGE = 'np-0103-13';
    function slposTab(name){
      const bag = (MOCK[SLPOS_PAGE] = MOCK[SLPOS_PAGE] || {});
      return (bag[name] = bag[name] || []);
    }
    function slposLocs(type, withDisabled){
      return slposTab('tab-1').filter(r=> r['库位类型']===type && (withDisabled || r['启用状态']!=='禁用'))
        .map(r=> ({ code: r['库位编码'], name: r['库位名称'] }));
    }
    const SLOC_DESTS = computed(()=>{
      void storeTick.value;
      return slposTab('tab-2').filter(r=> r['启用状态']!=='禁用').map(r=> ({ code: r['去向编码'], name: r['去向名称'] }));
    });
    /** 样品所在位置按当前位置判断：位置为去向 → 领用中；有当前位置 → 在库（货架 / 样品筐）；否则未入库 */
    function slocWhere(r){
      if(slposTab('tab-2').some(d=> d['去向编码']===r['位置编码'] || d['去向名称']===r['当前位置'])) return '领用中';
      return flowHas(r['当前位置']) ? '在库' : '未入库';
    }
    function slocStoreLocs(withDisabled){
      return slposTab('tab-1').filter(r=> withDisabled || r['启用状态']!=='禁用').map(r=> ({ code: r['库位编码'], name: r['库位名称'] }));
    }
    function slocTab(name){
      const bag = (MOCK[SLOC_PAGE] = MOCK[SLOC_PAGE] || {});
      return (bag[name] = bag[name] || []);
    }
    function slposInUse(row, kind){
      const use = slocTab('tab-1'), log = slocTab('tab-3');
      if(kind==='dest'){
        return use.some(r=> r['位置编码']===row['去向编码']) || log.some(r=> r['变更类型']==='领用检验' && r['新位置']===row['去向名称']);
      }
      return use.some(r=> r['位置编码']===row['库位编码']) || log.some(r=> r['新位置']===row['库位名称'] || r['原位置']===row['库位名称']);
    }
    function syncSlposCounts(){
      const use = slocTab('tab-1');
      slposTab('tab-1').forEach(r=>{
        r['在位样品数'] = String(use.filter(x=> x['位置编码']===r['库位编码'] && slocWhere(x)==='在库').length);
      });
    }
    watch(()=> pageId.value, v=>{ if(v===SLPOS_PAGE){ syncSlposCounts(); storeTick.value += 1; } }, { immediate:true });
    function confirmPrintLabel(){
      printVisible.value = false;
      const bag = (MOCK['print-task'] = MOCK['print-task'] || {});
      const list = (bag.main = bag.main || []);
      const src = printFrom.value;
      const day = nowStamp().slice(0, 10).replace(/-/g, '');
      const seq = list.filter(r=> String(r['任务ID']||'').startsWith('PT-' + day + '-')).length + 1;
      list.unshift({
        id: 'pt-' + Date.now().toString(36),
        任务ID: 'PT-' + day + '-' + String(seq).padStart(3, '0'),
        模板名称: src ? (src['模板名称'] || printTpl.value) : printTpl.value,
        模板类型: src ? (src['模板类型'] || '—') : (page.value?.title || '—'),
        触发方式: '手动',
        系统位置: src ? (src['系统位置'] || '—') : (page.value?.title || '—'),
        打印状态: '已完成',
        打印机: printPrinter.value,
        创建人: '管理员',
        创建时间: nowStamp(),
        检验状态: '待检验'
      });
      printFrom.value = null;
      bumpStore();
      ElMessage.success('已发送打印任务');
    }
    function saveSlposForm(){
      const isLoc = activeTab.value==='tab-1';
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const txt = k=> String(formModel[k]||'').trim();
      const enable = formSwitch['启用状态']===false ? '禁用' : '启用';
      const list = slposTab(isLoc ? 'tab-1' : 'tab-2');
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      let payload;
      if(isLoc){
        const code = txt('库位编码');
        if(!code){ ElMessage.warning('请输入库位编码'); return; }
        if(!txt('库位名称')){ ElMessage.warning('请输入库位名称'); return; }
        if(!txt('库位类型')){ ElMessage.warning('请选择库位类型'); return; }
        if(others.some(r=> r['库位编码']===code)){ ElMessage.warning('库位编码已存在'); return; }
        if(others.some(r=> r['库位名称']===txt('库位名称'))){ ElMessage.warning('库位名称已存在'); return; }
        payload = { 库位编码: code, 库位名称: txt('库位名称'), 库位类型: txt('库位类型'), 存放区域: txt('存放区域') || '—', 备注: txt('备注') || '—', 启用状态: enable };
      } else {
        const code = txt('去向编码').toUpperCase();
        if(!code){ ElMessage.warning('请输入去向编码'); return; }
        if(!/^[A-Z0-9-]+$/.test(code)){ ElMessage.warning('去向编码仅限大写字母、数字和「-」'); return; }
        if(!txt('去向名称')){ ElMessage.warning('请输入去向名称'); return; }
        if(others.some(r=> r['去向编码']===code)){ ElMessage.warning('去向编码已存在'); return; }
        if(others.some(r=> r['去向名称']===txt('去向名称'))){ ElMessage.warning('去向名称已存在'); return; }
        payload = { 去向编码: code, 去向名称: txt('去向名称'), 备注: txt('备注') || '—', 启用状态: enable };
      }
      let saved;
      if(isAdd){
        saved = Object.assign({ id: (isLoc ? 'slp-' : 'sld-') + Date.now() }, payload, { 创建人:'管理员', 创建时间: nowStamp() });
        if(isLoc) saved.在位样品数 = '0';
        list.unshift(saved);
      } else {
        saved = list.find(r=> r.id===formModel._editId);
        if(!saved){ ElMessage.warning('未找到待编辑数据'); return; }
        Object.assign(saved, payload);
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? (isLoc ? '已新增库位 '+saved['库位编码'] : '已新增去向 '+saved['去向编码']) : '保存成功');
    }
    function deleteSlposRows(rows){
      if(!rows.length){ ElMessage.warning('请先勾选要删除的数据'); return; }
      const isLoc = activeTab.value==='tab-1';
      const used = rows.find(r=> slposInUse(r, isLoc ? 'loc' : 'dest'));
      if(used){
        ElMessage.warning(isLoc ? '库位 '+used['库位编码']+' 已被使用，不可删除，可禁用' : '去向 '+used['去向编码']+' 已被使用，不可删除，可禁用');
        return;
      }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+rows.length+' 条'+(isLoc ? '样品库位' : '样品去向')+'？删除后不可恢复。', '批量删除', { type:'warning' }).then(()=>{
        const list = slposTab(isLoc ? 'tab-1' : 'tab-2');
        const ids = new Set(rows.map(r=> r.id));
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 条数据');
      }).catch(()=>{});
    }
    function slocMove(rows, type, loc, status, extra){
      const log = slocTab('tab-3');
      const stamp = nowStamp();
      const user = '管理员';
      rows.forEach(r=>{
        log.unshift({
          id: 'sf-'+Date.now()+'-'+r['样品编号'], 变更类型: type, 样品编号: r['样品编号'], 母样编号: r['母样编号'],
          物料名称: r['物料名称'], 报检批号: r['报检批号'], 原位置: r['当前位置'] || '—', 新位置: loc.name,
          变更备注: (extra && extra.备注) || '—', 操作人: user, 操作时间: stamp
        });
        if(!status) return;
        Object.assign(r, { 当前位置: loc.name, 位置编码: loc.code, 最近变更时间: stamp, 最近变更人: user });
      });
      bumpStore();
    }
