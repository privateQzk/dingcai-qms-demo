    function qrIssueLedgerSamples(){
      const out = [];
      const seen = new Set();
      Object.values((window.WMS_MOCK_ROWS||MOCK).ledger||{}).forEach(arr=>{
        if(!Array.isArray(arr)) return;
        arr.forEach(r=>{
          const code = String((r&&r['样品编号'])||'').trim();
          if(!code || code==='—' || seen.has(code)) return;
          seen.add(code);
          out.push(r);
        });
      });
      return out;
    }
    function oeSchemeItemNames(){
      const sample = oeAllSamples().find(r=> r['样品编号']===formModel['样品编号']);
      const schemeName = (sample && sample['检验方案'] && sample['检验方案']!=='—') ? sample['检验方案'] : (formModel._schemeName||'');
      const sch = autoSampInspSchemeList().find(s=> s['检验方案名称']===schemeName && s['启用状态']!=='禁用');
      let names = sch ? String(sch['检验项信息']||'').split(/[;；,，、]/).map(s=> s.trim()).filter(s=> s && s!=='—') : [];
      if(!names.length && sample){
        names = String((sample['方案项目']||'')+';'+(sample['临时项目']||'')).split(/[;；,，、]/).map(s=> s.trim()).filter(s=> s && s!=='—');
      }
      return names;
    }
    function oeItemLine(r){
      return {
        检验项编码: (r && r['检验项编码']) || '',
        检验项名称: (r && r['检验项名称']) || '',
        检验项类型: (r && r['检验项类型']) || '',
        所属检验类: (r && r['所属检验类']) || '',
        检验项单位: (r && r['检验项单位']) || ''
      };
    }
    function oeLinesFromText(text){
      const names = String(text||'').split(/[、,，;；]/).map(s=> s.trim()).filter(s=> s && s!=='—');
      const items = autoSampInspItemList();
      return names.map(name=>{
        const hit = items.find(r=> r['检验项名称']===name);
        return hit ? oeItemLine(hit) : { 检验项编码:'', 检验项名称:name, 检验项类型:'', 所属检验类:'', 检验项单位:'' };
      });
    }
    function oeOrderList(){
      const bag = (MOCK['insp-order'] = MOCK['insp-order'] || {});
      return (bag['tab-oe'] = bag['tab-oe'] || []);
    }
    function oeEntrustList(){
      const bag = (MOCK['np-0201-02'] = MOCK['np-0201-02'] || {});
      return (bag.main = bag.main || []);
    }
    function oeRdOf(sourceNo){
      const hit = flowOrderOf(sourceNo);
      const v = hit && hit.row && hit.row['研发项目号'];
      return flowHas(v) ? v : '';
    }
    function oeOrderFromEntrust(e, prev){
      const sourceNo = (e['来源报检单号'] && e['来源报检单号']!=='—') ? e['来源报检单号'] : (e['报检单号'] || '');
      const row = {
        id: (prev && prev.id) || ('ioe-' + (e['委托单号'] || Date.now().toString(36))),
        单据状态: (prev && prev['单据状态']) || '待执行',
        复核结论: (prev && flowHas(prev['复核结论'])) ? prev['复核结论'] : '—',
        报检单号: (prev && prev['报检单号']) || nextInspOrderNo(),
        委托单号: e['委托单号'] || '—',
        报检单类型: e['报检单类型'] || '—',
        来源报检单号: sourceNo || '—',
        样品编号: e['样品编号'] || '—',
        物料编码: e['物料编码'] || '—',
        物料名称: e['物料名称'] || '—',
        物料规格: e['物料规格'] || '—',
        报检批号: e['报检批号'] || '—',
        委托组织: e['委托组织'] || '—',
        来源组织: (prev && flowHas(prev['来源组织'])) ? prev['来源组织'] : (e['委托组织'] || '—'),
        来源系统: (prev && flowHas(prev['来源系统'])) ? prev['来源系统'] : '—',
        来源单号: (prev && flowHas(prev['来源单号'])) ? prev['来源单号'] : '—',
        物料种类: (prev && flowHas(prev['物料种类'])) ? prev['物料种类'] : '—',
        预计完成时间: (prev && flowHas(prev['预计完成时间'])) ? prev['预计完成时间'] : '—',
        委托项目: e['委托项目'] || '—',
        需求完成时间: e['需求完成时间'] || '—',
        预计送样时间: e['预计送样时间'] || '—',
        优先级: e['优先级'] || '—',
        研发项目号: oeRdOf(sourceNo) || (e['研发项目号'] && e['研发项目号']!=='—' ? e['研发项目号'] : '—'),
        报检备注: (e['备注'] && e['备注']!=='—') ? e['备注'] : (e['报检备注'] || '—'),
        报检类型: '内部委托',
        报检人: e['申请人'] || e['报检人'] || '管理员',
        报检时间: e['申请时间'] || e['报检时间'] || nowStamp(),
        报检部门: '—',
        检验方案: e['检验方案'] || '—',
        应取样件数: (prev && flowHas(prev['应取样件数'])) ? String(prev['应取样件数']) : '1',
        已取样件数: (prev && prev['已取样件数']!=null && prev['已取样件数']!=='') ? String(prev['已取样件数']) : '0',
        待取样件数: (prev && prev['待取样件数']!=null && prev['待取样件数']!=='') ? String(prev['待取样件数']) : '1',
        检验完成件数: (prev && prev['检验完成件数']!=null && prev['检验完成件数']!=='') ? String(prev['检验完成件数']) : '0',
        _flow: true,
        _sampEnd: !!(prev && prev._sampEnd)
      };
      if(Array.isArray(e._lines)) row._lines = JSON.parse(JSON.stringify(e._lines));
      else if(prev && Array.isArray(prev._lines)) row._lines = prev._lines;
      return row;
    }
    function oeUpsertFromEntrust(e){
      if(!e || !flowHas(e['委托单号'])) return null;
      const list = oeOrderList();
      const prev = list.find(r=> r['委托单号']===e['委托单号']);
      const next = oeOrderFromEntrust(e, prev);
      if(prev){
        const keepStatus = prev['单据状态'];
        const keepNo = prev['报检单号'];
        Object.assign(prev, next, { id: prev.id, 报检单号: keepNo, 单据状态: keepStatus, _sampEnd: prev._sampEnd, 应取样件数: prev['应取样件数'] || next['应取样件数'], 已取样件数: (prev['已取样件数']!=null && prev['已取样件数']!=='') ? prev['已取样件数'] : next['已取样件数'] });
        return prev;
      }
      list.unshift(next);
      return next;
    }
    function oeBackfill(){
      oeEntrustList().forEach(e=>{ if(flowHas(e['委托单号'])) oeUpsertFromEntrust(e); });
    }
    watch(()=> pageId.value, v=>{ if(v==='insp-order' || v==='np-0201-02') oeBackfill(); }, { immediate:true });
    /* 报检单 隐藏/显示：隐藏单号存 MOCK['insp-order-hidden'].main，报检单与样品检验台账按报检单号联动过滤 */
    const hiddenOrderDlg = ref(false);
    const hiddenOrderSel = ref([]);
    const hiddenOrderNos = ref(new Set());
    function hiddenOrderBag(){ const bag = MOCK['insp-order-hidden'] = MOCK['insp-order-hidden'] || {}; return (bag.main = bag.main || []); }
    function syncHiddenOrders(){ hiddenOrderNos.value = new Set(hiddenOrderBag().map(no=> String(no))); }
    syncHiddenOrders();
    function hideInspOrders(){
      const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!picked.length){ ElMessage.warning('请先勾选要隐藏的报检单'); return; }
      ElementPlus.ElMessageBox.confirm('确认隐藏所选 '+picked.length+' 条报检单？隐藏后样品检验台账中关联样品将同步隐藏。','隐藏报检单',{ type:'warning', confirmButtonText:'隐藏', cancelButtonText:'取消' }).then(()=>{
        const bag = hiddenOrderBag();
        picked.forEach(r=>{ const no = String(r['报检单号']||''); if(no && !bag.includes(no)) bag.push(no); });
        syncHiddenOrders();
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已隐藏 '+picked.length+' 条报检单');
      }).catch(()=>{});
    }
    const hiddenOrderCols = computed(()=> (tabView.value.columns||[]).filter(c=> c.field && c.field!=='_actions' && c.title!=='操作'));
    const hiddenOrderRows = computed(()=>{
      storeTick.value;
      const nos = hiddenOrderNos.value;
      if(!nos.size) return [];
      return (((MOCK['insp-order']||{})[activeTab.value])||[]).filter(r=> nos.has(String(r['报检单号']||'')));
    });
    function openHiddenOrders(){
      if(!hiddenOrderRows.value.length){ ElMessage.info('暂无已隐藏的报检单'); return; }
      hiddenOrderSel.value = [];
      hiddenOrderDlg.value = true;
    }
    function restoreHiddenOrders(){
      const sel = hiddenOrderSel.value || [];
      if(!sel.length){ ElMessage.warning('请先勾选要恢复显示的报检单'); return; }
      const nos = new Set(sel.map(r=> String(r['报检单号']||'')));
      MOCK['insp-order-hidden'].main = hiddenOrderBag().filter(no=> !nos.has(String(no)));
      syncHiddenOrders();
      hiddenOrderDlg.value = false;
      bumpStore();
      ElMessage.success('已恢复显示 '+sel.length+' 条报检单');
    }
    /* 通用单据 隐藏/显示：隐藏行存 MOCK['row-hidden'].main（page|id），HIDE_PAGES 内页面按行 id 过滤；恢复弹窗按当前页签列出 */
    const HIDE_PAGES = new Set(['mrb-review','np-0210-01','unqual-pi','unqual-pp','unqual-pm','unqual-rd','dev-pi','dev-pp','dev-pm','dev-rd','np-0213-01','np-0213-02']);
    // 级联隐藏：隐藏某页单据时，同步隐藏下游关联单据（供应商事件→供应商整改）
    const HIDE_LINKS = {
      'np-0213-01': { page:'np-0213-02', linked:(src, dst)=> String(dst['来源单号']||'')===String(src['事件单号']||'') },
    };
    function hideLinkedRows(pid, srcRows, restore){
      const link = HIDE_LINKS[pid];
      if(!link) return 0;
      const bag = hiddenRowBag();
      let n = 0;
      Object.values(MOCK[link.page]||{}).forEach(bucket=> (bucket||[]).forEach(r=>{
        if(!srcRows.some(s=> link.linked(s, r))) return;
        const k = hiddenKey(link.page, r.id);
        const at = bag.indexOf(k);
        if(!restore && at<0){ bag.push(k); n++; }
        else if(restore && at>=0){ bag.splice(at,1); n++; }
      }));
      return n;
    }
    const hidRowsDlg = ref(false);
    const hidRowsSel = ref([]);
    const hiddenRowIds = ref(new Set());
    function hiddenRowBag(){ const bag = MOCK['row-hidden'] = MOCK['row-hidden'] || {}; return (bag.main = bag.main || []); }
    function hiddenKey(pid, id){ return pid + '|' + id; }
    function syncHiddenRowIds(){ hiddenRowIds.value = new Set(hiddenRowBag().map(String)); }
    syncHiddenRowIds();
    function hideTableRows(){
      const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!picked.length){ ElMessage.warning('请先勾选要隐藏的单据'); return; }
      ElementPlus.ElMessageBox.confirm('确认隐藏所选 '+picked.length+' 条单据？','隐藏单据',{ type:'warning', confirmButtonText:'隐藏', cancelButtonText:'取消' }).then(()=>{
        const bag = hiddenRowBag(), pid = pageId.value;
        picked.forEach(r=>{ const k = hiddenKey(pid, r.id); if(!bag.includes(k)) bag.push(k); });
        const linkedN = hideLinkedRows(pid, picked, false);
        syncHiddenRowIds();
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已隐藏 '+picked.length+' 条单据' + (linkedN ? '，含下游关联单据 '+linkedN+' 条' : ''));
      }).catch(()=>{});
    }
    const hidRowsCols = computed(()=> (tabView.value.columns||[]).filter(c=> c.field && c.field!=='_actions' && c.title!=='操作'));
    const hidRowsList = computed(()=>{
      storeTick.value;
      const ids = hiddenRowIds.value, pid = pageId.value;
      if(!ids.size || !HIDE_PAGES.has(pid)) return [];
      return (((MOCK[pid]||{})[activeTab.value])||[]).filter(r=> ids.has(hiddenKey(pid, r.id)));
    });
    function openHiddenRowsList(){
      if(!hidRowsList.value.length){ ElMessage.info('当前页签暂无已隐藏的单据'); return; }
      hidRowsSel.value = [];
      hidRowsDlg.value = true;
    }
    function restoreHiddenRows(){
      const sel = hidRowsSel.value || [];
      if(!sel.length){ ElMessage.warning('请先勾选要恢复显示的单据'); return; }
      const pid = pageId.value, keys = new Set(sel.map(r=> hiddenKey(pid, r.id)));
      MOCK['row-hidden'].main = hiddenRowBag().filter(k=> !keys.has(String(k)));
      const linkedN = hideLinkedRows(pid, sel, true);
      syncHiddenRowIds();
      hidRowsDlg.value = false;
      bumpStore();
      ElMessage.success('已恢复显示 '+sel.length+' 条单据' + (linkedN ? '，含下游关联单据 '+linkedN+' 条' : ''));
    }
    function oeSaveOrderTab(){
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      if(!(formLineRows.value||[]).length){ ElMessage.warning('请添加委托项目'); return; }
      const isAdd = formMode.value!=='edit';
      const orders = oeOrderList();
      const cur = isAdd ? null : orders.find(r=> r.id===formModel._editId);
      if(!isAdd && !cur){ ElMessage.warning('未找到待编辑报检单'); return; }
      if(!isAdd && cur['单据状态']!=='待执行'){ ElMessage.warning('仅待执行的内部委托报检单可编辑'); return; }
      const entrusts = oeEntrustList();
      let entrust = cur ? entrusts.find(r=> r['委托单号']===cur['委托单号']) : null;
      const stamp = nowStamp();
      if(!entrust){
        entrust = { id: 'oe-' + Date.now().toString(36), 单据状态: '未完成', 委托单号: qcNextNo(entrusts, '委托单号', 'WT'), 申请人: '管理员', 申请时间: stamp };
        entrusts.unshift(entrust);
      }
      Object.assign(entrust, {
        报检单类型: formModel['报检单类型'] || '—',
        报检单号: formModel['报检单号'] || '—',
        样品编号: formModel['样品编号'] || '—',
        物料编码: formModel['物料编码'] || '—',
        物料名称: formModel['物料名称'] || '—',
        物料规格: formModel['物料规格'] || '—',
        报检批号: formModel['报检批号'] || '—',
        委托组织: formModel['委托组织'] || '—',
        委托项目: formLineRows.value.map(r=> r['检验项名称']).filter(Boolean).join('、'),
        需求完成时间: formModel['需求完成时间'] || '—',
        预计送样时间: formModel['预计送样时间'] || '—',
        优先级: formModel['优先级'] || '—',
        报检类型: formModel['报检类型'] || '内部委托',
        备注: formModel['备注'] || '—',
        研发项目号: formModel['研发项目号'] || '—',
        检验方案: formModel._schemeName || entrust['检验方案'] || '—',
        _lines: JSON.parse(JSON.stringify(formLineRows.value))
      });
      const order = oeUpsertFromEntrust(entrust);
      if(flowHas(formModel['研发项目号'])) order['研发项目号'] = formModel['研发项目号'];
      const need = String(flowInt(formModel['应取样件数']) || flowInt(order['应取样件数']) || 1);
      if(isAdd){
        Object.assign(order, { _flow:true, 应取样件数: need, 已取样件数:'0', 待取样件数: need, 检验完成件数:'0' });
      } else if(['待执行','执行中'].includes(order['单据状态']) && !order._sampEnd){
        order['应取样件数'] = need;
        order['待取样件数'] = String(Math.max(0, flowInt(need) - flowInt(order['已取样件数'])));
      }
      flowSyncAll();
      formVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      ElMessage.success(isAdd ? ('已新增报检单 ' + order['报检单号'] + '，委托单号 ' + entrust['委托单号']) : '保存成功');
    }
    function onDispatchCatAction(name){
      if(name==='添加'){ openIoPick('inspCat', 'dispatchCats', '检验类名称', true); return; }
      const set = new Set(formCatSelected.value||[]);
      if(!set.size){ ElMessage.warning(pageId.value===COST_PAGE ? '请先勾选检验类' : '请先勾选适用检验类'); return; }
      formCatRows.value = formCatRows.value.filter(r=> !set.has(r));
      formCatSelected.value = [];
    }
    function onDispatchInstAction(name){
      if(name==='添加'){ openIoPick('inst', 'dispatchInsts', '仪器名称', true); return; }
      const set = new Set(formInstSelected.value||[]);
      if(!set.size){ ElMessage.warning('请先勾选适用仪器'); return; }
      formInstRows.value = formInstRows.value.filter(r=> !set.has(r));
      formInstSelected.value = [];
    }
    function onFormLineAction(name){
      if(pageId.value==='qr-issue'){
        if(name==='自动获取样品信息'){
          const srcNo = String(formModel['来源单号']||'').trim();
          const bag = (window.WMS_MOCK_ROWS||MOCK)['insp-order']||{};
          let hit = null;
          Object.keys(bag).forEach(k=>{
            (Array.isArray(bag[k])?bag[k]:[]).forEach(r=>{
              if(hit) return;
              if(srcNo && r['报检单号']===srcNo) hit = r;
            });
          });
          const lot = (hit && (hit['报检批号']||hit['物料批号'])) || ('B'+nowStamp().slice(0,10).replace(/-/g,''));
          const samp = (hit && hit['样品编号']) || nextSampleNos(1)[0];
          formLineRows.value = [{ 物料批号: lot, 样品编号: samp, 样品来源: '报检取样' }];
          formLineSelected.value = [];
          ElMessage.success('已自动获取样品信息');
          return;
        }
        if(name==='手动添加样品'){
          openIoPick('qrIssueSample', 'qrIssueSample', '样品编号', true);
          return;
        }
        if(name==='导入'){
          formLineRows.value = (formLineRows.value||[]).concat([
            { 物料批号:'B'+nowStamp().slice(5,10).replace(/-/g,''), 样品编号: nextSampleNos(1)[0], 样品来源:'报检取样' }
          ]);
          ElMessage.success('Demo：已导入 1 条样品');
          return;
        }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选要删除的样品'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          return;
        }
      }
      if(pageId.value===SPLIT_PAGE){
        if(name==='拆分'){ genSampSplitRows(); return; }
        if(name==='打印标签'){ openPrintLabel(formLineSelected.value||[], '请先勾选要打印的子样品'); return; }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选要删除的子样品'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          renumberSampSplitRows();
          return;
        }
      }
      if(pageId.value===CAL_PAGE){
        if(name==='添加'){
          formLineRows.value = (formLineRows.value||[]).concat([{ 日期:'', 类型:'休息日', 说明:'' }]);
          return;
        }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选要删除的特殊日期'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          return;
        }
      }
      if(pageId.value===DISPATCH_PAGE || pageId.value===COST_PAGE){
        if(name==='添加'){ openIoPick('mat', 'dispatchMats', '物料名称', true); return; }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning(pageId.value===COST_PAGE ? '请先勾选物料' : '请先勾选适用物料'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          return;
        }
      }
      if(pageId.value===CASS_PAGE){
        if(name==='添加'){
          formLineRows.value = (formLineRows.value||[]).concat([cassEmptyLine()]);
          renumberCassLines();
          return;
        }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选关联玻璃板'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          renumberCassLines();
          return;
        }
      }
      if(pageId.value==='np-0201-02' || (pageId.value==='insp-order' && activeTab.value==='tab-oe')){
        if(name==='添加'){
          if(!formModel['样品编号']){ ElMessage.warning('请先选择样品编号'); return; }
          if(!oeSchemeItemNames().length){ ElMessage.warning('该样品检验方案下没有可委托的检验项目'); return; }
          openIoPick('oeItem', 'oeItems', '检验项名称', true);
          return;
        }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选委托项目'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          return;
        }
      }
      if(pageId.value===HM_ARCH_PAGE){
        if(name==='添加物质' || name==='新增行' || name==='新增'){
          hmArchItemRow.value = null;
          openIoPick('hmItem', 'hmArchItems', '中文名称', true);
          return;
        }
        if(name==='选择厂内标准'){
          if(!hmArchRows('tab-1').some(r=> r['启用状态']==='启用' && (r._lines||[]).length)){ ElMessage.warning('没有启用的厂内标准'); return; }
          openIoPick('hmStd', 'hmArchStd', '厂内标准');
          return;
        }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选物质'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          return;
        }
      }
      if(isDjPlanPage() && name==='添加仪器'){
        if(!formModel[djKind().w+'方案名称']){ ElMessage.warning('请先选择'+djKind().w+'方案'); return; }
        openIoPick('inst', 'djInsts', '', true);
        return;
      }
      if(isDjSchemePage() || isDjPlanPage()){
        if(name==='添加仪器' || name==='添加设备'){ openIoPick('inst', 'djInsts', '', true); return; }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选仪器'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          return;
        }
      }
      if(pageId.value===TRAIN_PAGE){
        if(formMode.value==='edit'){ ElMessage.warning('编辑时不可添加或删除培训人员'); return; }
        if(name==='添加人员'){ openIoPick('person', 'trainLines', '', true); return; }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选人员'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          return;
        }
      }
      if(pageId.value===PERSON_PAGE){
        if(name==='添加一行'){ formLineRows.value = formLineRows.value.concat([emptyPersonAbility()]); return; }
        if(String(name).includes('删除')){
          const set = new Set(formLineSelected.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选能力'); return; }
          formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
          formLineSelected.value = [];
          return;
        }
      }

      if(pageId.value==='gather-scheme' && (name==='添加采集项' || name==='新增' || name==='新增行')){
        openIoPick('gatherItem', 'gatherLines', '', true);
        return;
      }
      if(pageId.value==='gather-scheme' && String(name).includes('删除')){
        const sel = formLineSelected.value||[];
        if(!sel.length){ ElMessage.warning('请先勾选采集项'); return; }
        const set = new Set(sel);
        formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
        formLineSelected.value = [];
        return;
      }
      if((pageId.value==='spc-scheme-insp') && (name==='添加工序' || name==='新增' || name==='新增行')){
        const empty = pageId.value==='spc-scheme-insp'
          ? { 节点名称:'', 报检单类型:'', 日期范围:'', 物料信息:'', 采样点:'', 检验方案:'', 检验项:'' }
          : { 节点名称:'', 日期范围:'', 采集方案:'', 采集项目:'' };
        formLineRows.value = formLineRows.value.concat([{ ...empty, _i: formLineRows.value.length+1 }]);
        return;
      }
      if((pageId.value==='spc-scheme-insp') && String(name).includes('删除')){
        const sel = formLineSelected.value||[];
        if(!sel.length){ ElMessage.warning('请先勾选工序'); return; }
        const set = new Set(sel);
        formLineRows.value = formLineRows.value.filter(r=> !set.has(r));
        formLineSelected.value = [];
        return;
      }
      if(pageId.value==='wh-insp-scheme' && name==='新增'){
        openPicker('选择仓库');
        return;
      }
      if(name==='添加一项' && pageId.value==='customer'){
        const nums = formLineRows.value.map(r=> parseInt(r['客户地址编码'],10)||0);
        const next = Math.max(0, ...(nums.length?nums:[0]), formModel._addrSeq||0) + 1;
        formModel._addrSeq = next;
        formLineRows.value = formLineRows.value.concat([{
          _i: formLineRows.value.length+1,
          客户地址编码: String(next).padStart(3,'0'),
          客户地址描述: '',
          联系人: '',
          联系电话: ''
        }]);
        return;
      }
      if(name==='添加一项' && pageId.value==='supplier'){
        const nums = formLineRows.value.map(r=> parseInt(r['供应商地址编码'],10)||0);
        const next = Math.max(0, ...(nums.length?nums:[0]), formModel._addrSeq||0) + 1;
        formModel._addrSeq = next;
        formLineRows.value = formLineRows.value.concat([{
          _i: formLineRows.value.length+1,
          供应商地址编码: String(next).padStart(3,'0'),
          供应商地址描述: '',
          联系人: '',
          联系电话: ''
        }]);
        return;
      }
      if(name==='新增' || name==='新增行' || name==='选择物料'){
        if(isBcLineFormPage()){
          formLineRows.value = formLineRows.value.concat([emptyBcLineRow()]);
          ElMessage.success('已新增空白流水明细行');
          return;
        }
        if(false /*lg-order removed*/){
          formLineRows.value = formLineRows.value.concat([{
            _i: formLineRows.value.length+1,
            物料信息: '',
            数量: '',
            单位: formModel['关联派车申请单'] ? '—' : '',
            '体积(长×宽×高)': formModel['关联派车申请单'] ? '—' : '',
            备注: ''
          }]);
          ElMessage.success('已新增空白明细行，请选择物料信息');
          return;
        }
        if(pageId.value==='lg-dispatch'){
          openPicker('物料信息');
          return;
        }
        if(pageId.value==='lg-ship'){
          formLineRows.value = formLineRows.value.concat([emptyShipLine(formLineRows.value.length+1)]);
          openPicker('物料信息');
          return;
        }
        if(isWhNoticePage()){
          if(!formModel[whNoticeRefField()]){ ElMessage.warning(isOsPoPage() ? '请先选择关联委外加工单' : '请先选择关联采购订单'); return; }
          openPicker('物料信息'); return;
        }
        if(isLoadPage()){
          if(!formModel['关联单号']){ ElMessage.warning('请先选择关联单号'); return; }
          openPicker('物料信息'); return;
        }
        if(isOsPoPage()){
          if(!formModel['关联委外加工单']){ ElMessage.warning('请先选择关联委外加工单'); return; }
          openPicker('物料信息'); return;
        }
        if(pageId.value==='wwpo'){
          openPicker('物料'); return;
        }
        if(pageId.value==='po' || pageId.value==='so'){
          openPicker('物料信息'); return;
        }
        if(pageId.value==='pkg-craft'){
          openPicker('物料信息'); return;
        }
        // 仓储通用：打开物料选单，确定后追加明细行
        openPicker('物料信息');
        return;
      }
      if(String(name).includes('删除')){
        const selected = formLineSelected.value || [];
        if(String(name).includes('批量') || selected.length){
          if(!selected.length){ ElMessage.warning('请先勾选要删除的明细行'); return; }
          const set = new Set(selected);
          const next = formLineRows.value.filter(r=> !set.has(r));
          if(!next.length && pageId.value!=='customer' && pageId.value!=='supplier' && pageId.value!=='wwpo' && pageId.value!=='lg-dispatch' && pageId.value!=='wh-insp-scheme' && pageId.value!=='pkg-craft' && !isBcLineFormPage()){ ElMessage.warning('至少保留 1 行明细'); return; }
          formLineRows.value = next;
          formLineSelected.value = [];
          ElMessage.success('已删除勾选明细行');
          return;
        }
        if(!formLineRows.value.length){ ElMessage.warning('暂无明细行'); return; }
        formLineRows.value = formLineRows.value.slice(0,-1);
        ElMessage.success('已删除明细行');
        return;
      }
      if(formMode.value==='数据源设置' && String(name).replace(/\s/g, '')==='API解析'){ qcParseApi(); return; }
      ElMessage.info(name);
    }
