    function removeColModel(m){
      const name = colTypeName(m);
      const n = colRowsOf().filter(r=> r['色谱柱型号']===name).length;
      if(n){ ElMessage.warning('该色谱柱型号下存在 '+n+' 条数据，无法删除'); return; }
      const dr = driftRowsOf().filter(r=> (r._columns||r._cols||[]).some(c=> ((c && c['色谱柱型号']) || c)===name));
      if(dr.length){ ElMessage.warning('该色谱柱型号已被漂移规则「'+dr[0]['规则名称']+'」引用，无法删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除色谱柱型号「'+name+'」？若该型号下存在数据，则无法删除。', '删除确认', { confirmButtonText:'确认删除', cancelButtonText:'取消', type:'warning' }).then(()=>{
        const list = colModelsOf();
        const i = list.indexOf(m);
        if(i>=0) list.splice(i, 1);
        if(colModelId.value===m.id) colModelId.value = '';
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }
    function openColForm(){
      openForm('add');
      formModel['使用状态'] = '在用';
      formModel['责任部门'] = '';
      // 新增时：色谱柱型号自动代入左侧所选型号（可修改）；条码跟随编号
      const cur = colModelsOf().find(t=> t.id===colModelId.value);
      if(cur) formModel['色谱柱型号'] = colTypeName(cur);
    }
    function saveColForm(){
      const txt = k=> { const v = formModel[k]; return Array.isArray(v) ? v.join('、') : String(v==null ? '' : v).trim(); };
      const need = ['色谱柱编号','色谱柱名称','色谱柱条码','色谱柱型号','规格型号','使用状态','存放位置','责任部门','责任人','购置日期','色谱柱厂家','出厂编号','出厂日期'];
      for(const k of need){ if(!txt(k) && !(k==='色谱柱条码')){ ElMessage.warning('请填写'+k); return; } }
      const isAdd = formMode.value!=='edit';
      if(txt('购置日期') && txt('出厂日期') && txt('购置日期') < txt('出厂日期')){ ElMessage.warning('购置日期不得早于出厂日期'); return; }
      const code = txt('色谱柱编号');
      const bc = txt('色谱柱条码') || code;
      const others = colAllRows().filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r['色谱柱编号']===code)){ ElMessage.warning('色谱柱编号已存在，请重新输入'); return; }
      if(others.some(r=> r['色谱柱条码']===bc)){ ElMessage.warning('色谱柱条码已存在，请重新输入'); return; }
      const payload = {};
      (page.value.formFields||[]).forEach(f=>{ payload[f.name] = txt(f.name) || '—'; });
      payload['色谱柱条码'] = bc;
      const type = colModelsOf().find(t=> colTypeName(t)===txt('色谱柱型号'));
      payload.typeId = type ? type.id : '';
      const list = colRowsOf();
      if(isAdd){
        list.unshift(Object.assign({ id:'col-'+Date.now() }, payload, { 创建人:'管理员', 创建时间: nowStamp() }));
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
        Object.assign(cur, payload);
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '已新增色谱柱 '+code : '保存成功');
    }
    function colUsedBy(r){
      if(r._ref) return r._ref;
      const code = r['色谱柱编号'];
      return spiRowsOf().some(x=> x['色谱柱编号']===code) ? '谱图识别' : '';
    }
    function deleteColRows(rowsArg){
      const list = colRowsOf();
      const rows = Array.isArray(rowsArg) ? rowsArg : list.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选要删除的色谱柱'); return; }
      if(rows.some(r=> r['使用状态']==='在用')){ ElMessage.warning('在用状态色谱柱不可删除，请先停用'); return; }
      const used = rows.filter(r=> colUsedBy(r));
      if(used.length){ ElMessage.warning('色谱柱 '+used.map(r=> r['色谱柱编号']+'（已被'+colUsedBy(r)+'引用）').join('、')+' 不可删除'); return; }
      const ids = new Set(rows.map(r=> r.id));
      ElementPlus.ElMessageBox.confirm(rows.length===1 ? '确认删除色谱柱 '+rows[0]['色谱柱编号']+'？删除后不可恢复。' : '确认删除所选的 '+rows.length+' 条色谱柱？', rows.length===1 ? '删除确认' : '批量删除', { confirmButtonText:'确认删除', cancelButtonText:'取消', type:'warning' }).then(()=>{
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = selectedIds.value.filter(id=> !ids.has(id));
        bumpStore();
        ElMessage.success(rows.length===1 ? '色谱柱已删除' : '已删除 '+rows.length+' 条色谱柱');
      }).catch(()=>{});
    }
    function colViewHistory(row){
      const lines = [
        '色谱柱编号：' + row['色谱柱编号'],
        '色谱柱名称：' + row['色谱柱名称'],
        '色谱柱型号：' + (row['色谱柱型号']||'') + ' / ' + (row['规格型号']||''),
        '2026-01-12  使用记录：原料A主成分检验（检验单 JY-0001）',
        '2026-03-05  维护记录：例行清洗再生，柱效恢复正常',
        '2026-06-18  校准记录：保留时间漂移校验通过',
        '2026-08-20  使用记录：成品Z杂质检验（检验单 JY-0034）'
      ];
      ElementPlus.ElMessageBox.alert(lines.join('\n'), '色谱柱履历 - ' + row['色谱柱编号']);
    }
    function colImageUrl(row){
      const gc = /^gow/i.test(String(row['色谱柱型号']||''));
      const c = gc ? '#0ea5e9' : '#22c55e';
      const label = String(row['色谱柱编号']||'').replace(/[<&>]/g, '');
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#f8fafc"/>'
        + (gc ? '<circle cx="240" cy="150" r="90" fill="none" stroke="'+c+'" stroke-width="10"/><circle cx="240" cy="150" r="70" fill="none" stroke="'+c+'" stroke-width="4" stroke-dasharray="6 6"/>'
              : '<rect x="60" y="130" width="360" height="40" rx="8" fill="'+c+'"/><rect x="40" y="122" width="34" height="56" rx="6" fill="#64748b"/><rect x="406" y="122" width="34" height="56" rx="6" fill="#64748b"/>')
        + '<text x="240" y="285" font-size="26" text-anchor="middle" fill="#334155" font-family="sans-serif">'+label+'</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    }
    function previewColImage(row){
      if(!row || !row['色谱柱图片'] || row['色谱柱图片']==='—'){ ElMessage.info('暂无色谱柱图片'); return; }
      colImgUrl.value = colImageUrl(row);
    }
    function onColToolbar(btn){
      const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(btn.name==='新增'){ openColForm(); return true; }
      if(btn.name==='打印标签'){ openPrintLabel(picked); return true; }
      if(btn.name==='导入数据'){ importVisible.value = true; return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      if(btn.name==='批量删除'){ deleteColRows(); return true; }
      return false;
    }

    const tableData = computed(()=>{
      storeTick.value;
      const rows = (MOCK[pageId.value]||{})[tabView.value.name] || [];
      let list = pageId.value==='lg-waybill-carrier' ? (((MOCK['lg-waybill']||{}).main)||[]).slice() : rows;
      // 通用隐藏过滤：HIDE_PAGES 内页面按「页面id|行id」剔除隐藏行（放最前，自定义查询分支也生效）
      if(HIDE_PAGES.has(pageId.value) && hiddenRowIds.value.size){
        const _pid = pageId.value;
        list = list.filter(r=> !hiddenRowIds.value.has(_pid+'|'+r.id));
      }
      if(pageId.value===UQ_SUM_PAGE){
        // 不合格处置汇总：实时合并四个来源页「已处理」Tab 的数据，字段取并集
        list = uqSumRows();
        list = applyDateRangeQuery(list, query, '处置时间');
        list = applyContainsExactQuery(list, query, ['处置单号','物料名称','物料编码','处置人','报检单号'], ['处置类型','MRB状态','处置方式']);
        return list.slice().sort(function(a,b){ return String(b['处置时间']||'').localeCompare(String(a['处置时间']||'')); });
      }
      if(pageId.value===HM_FLOW_PAGE){
        // 厂内检验流水：已确认导入且文件类型=厂内文件的导入单，表头+数据录入行平铺
        list = hmFlowRows();
        list = applyDateRangeQuery(list, query, '创建时间');
        const hmFlowBs = String(query['比对结果']||'').trim();
        if(hmFlowBs==='合格') list = list.filter(r=> String(r['比对结果']||'')==='合格');
        else if(hmFlowBs) list = list.filter(r=> String(r['比对结果']||'').includes('不符合'));
        list = applyContainsExactQuery(list, query, ['申请单号','文件编号','文件名称','标准编号','标准名称','客户名称','法规名称'], ['物料类','文件类型']);
        return list.slice().sort(function(a,b){ return String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')); });
      }
      if(pageId.value===DEV_SUM_PAGE){
        // 偏差处置汇总：实时合并四个来源页「已处理」Tab 的数据，字段取并集
        list = devSumRows();
        list = applyDateRangeQuery(list, query, '处置时间');
        list = applyContainsExactQuery(list, query, ['处置单号','物料名称','物料编码','偏差结论','处置人','报检单号'], ['偏差类型']);
        return list.slice().sort(function(a,b){ return String(b['处置时间']||'').localeCompare(String(a['处置时间']||'')); });
      }
      if(pageId.value===COST_FLOW) list = costFlowRows().slice();
      if(isChromLedgerPage()){
        // 未选分类展示当前页签全部；选中分类按物料（及型号）过滤；批号模糊 + 是否存在新杂 / 杂质偏差结论精确
        const _curType = curDictTypes().find(t=> t.id===dictTypeId.value);
        list = _curType ? rows.filter(r=> chromLedgerRowOfType(r, _curType)) : rows.slice();
        return applyContainsExactQuery(list, query, ['批号'], ['是否存在新杂','杂质偏差结论']);
      }
      if(page.value?.layout==='dict-split'){
        if(!isDictLeafType(dictTypeId.value)) return [];
        list = rows.filter(r=> r.typeId===dictTypeId.value);
      }
      if(page.value?.layout==='entry-category' && entryCategoryId.value){
        list = list.filter(r=> (r['检验类名称']||r['检验类']||'') === entryCategoryId.value);
      }
      if(page.value?.layout==='spc-overview' && spcProcessId.value){
        list = list.filter(r=> (r['工艺']||r['SPC工艺']||'') === spcProcessId.value);
      }
      if((page.value?.layout==='tree-list' || pageId.value===HM_ARCH_PAGE) && treeListId.value){
        const field = (page.value && page.value.treeField) || (pageId.value===HM_ARCH_PAGE ? '物料类' : '分类');
        list = list.filter(r=> (r[field]||'') === treeListId.value);
      }
      if(pageId.value==='np-0104-07'){
        list = applyDateRangeQuery(applyContainsExactQuery(list, query, ['规则编码','规则名称','适用检验方案','备注','创建人'], ['启用状态']), query, '创建时间');
        return sortByCreateTimeDesc(list);
      }
      if(pageId.value==='np-0104-08' || pageId.value==='np-0104-09'){
        const party = activeTab.value==='tab-pm' ? '客户信息' : (activeTab.value==='tab-pi' ? '供应商信息' : '');
        const contains = ['方案编码','方案名称','物料信息','采样点','备注','创建人'].concat(party ? [party] : []);
        list = applyDateRangeQuery(applyContainsExactQuery(list, query, contains, ['启用状态']), query, '创建时间');
        return sortByCreateTimeDesc(list);
      }
      if(pageId.value===COL_PAGE){
        // 默认按创建时间倒序；左侧未选型号时展示全部型号数据（左侧搜索会同步收窄右侧范围）
        list = colRowsOf();
        const selType = colModelId.value ? colModelsOf().find(t=> t.id===colModelId.value) : null;
        const names = new Set(colModelList.value.map(m=> colTypeName(m)));
        const kwOn = !!colModelKw.value.trim();
        list = list.filter(r=> selType ? r['色谱柱型号']===colTypeName(selType) : (!kwOn || names.has(r['色谱柱型号'])));
        return sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['色谱柱编号','色谱柱名称','色谱柱型号','责任部门','责任人'], ['使用状态']));
      }
      if(isDjPlanPage()){
        const rec = tabView.value.name==='tab-2';
        const nk = djKind().w+'方案名称';
        let l = djPlanRows().filter(r=> !rec || r['计划状态']==='已完成').map(djPlanView);
        const nos = splitDun(query['计划单号']);
        const q = Object.assign({}, query, { 计划单号: nos.length>1 ? '' : (query['计划单号']||'') });
        if(rec){
          l = applyDateRangeQuery(applyContainsExactQuery(l, q, ['计划单号',nk,'仪器编号','仪器名称','操作人'], ['检查结果','逾期状态','创建方式']), query, '操作时间');
        } else {
          l = applyContainsExactQuery(l, q, ['计划单号',nk,'仪器编号','仪器名称','表单名称'], ['计划状态','逾期状态','创建方式']);
          l = applyDateRangeQuery(applyDateRangeQuery(l, query, '计划开始时间'), query, '创建时间');
          const tq = String(query['指定维保班组']||'').trim();
          if(tq) l = l.filter(r=> splitDun(r['指定维保班组']).includes(tq));
        }
        if(nos.length>1) l = l.filter(r=> nos.includes(String(r['计划单号']||'')));
        return sortByCreateTimeDesc(l);
      }
      if(pageId.value===WJ_ORDER) return wjQueryRows();
      if(pageId.value===WX_PAGE) return wxQueryRows();
      if(pageId.value===BX_PAGE) return bxQueryRows();
      if(pageId.value===CL_PAGE) return clQueryRows();
      if(pageId.value===WO_PAGE) return woQueryRows();
      if(pageId.value===MY_WX_PAGE) return myWxQueryRows();
      if(pageId.value===YS_PAGE) return ysQueryRows();
      if(isTyPage()) return tyQueryRows();
      if(pageId.value===MSA_PAGE) return msaQueryRows();
      if(pageId.value===STB_PAGE) return stbQueryRows();
      if(pageId.value===BIAS_PAGE) return biasQueryRows();
      if(pageId.value===YL_PAGE) return activeTab.value==='tab-2' ? ylUsageQueryRows() : ylQueryRows();
      if(pageId.value===INST_PAGE) return instQueryRows();
      if(pageId.value===NJ_TODO){
        const l = applyContainsExactQuery(njTodoRows(), query, ['仪器编号','条码号','仪器类型','存放位置'], ['内校状态']);
        return applyDateRangeQuery(l, query, '下次内校日期');
      }
      if(pageId.value===WJ_TODO){
        const l = applyContainsExactQuery(wjTodoRows(), query, ['仪器编号','条码号','仪器类型','存放位置','责任部门','责任人'], ['外校状态']);
        return applyDateRangeQuery(l, query, '下次外校日期');
      }
      if(isDjMyPage()){
        const teams = djMyTeams();
        let l = djPlanRows().filter(r=> splitDun(r['指定维保班组']).some(t=> teams.includes(t))).map(djPlanView);
        l = applyContainsExactQuery(l, query, ['计划单号',djKind().w+'方案名称','仪器编号','仪器名称','表单名称'], ['计划状态','逾期状态','创建方式']);
        return sortByCreateTimeDesc(applyDateRangeQuery(applyDateRangeQuery(l, query, '计划开始时间'), query, '创建时间'));
      }
      if(pageId.value===DRIFT_PAGE){
        list = driftRowsOf();
        let ds = applyContainsExactQuery(list, query, ['规则编码','规则名称'], ['规则分类','启用状态','TR规则']);
        const it = String(query['适用检验类型']||query['使用检验类型']||'').trim();
        if(it) ds = ds.filter(r=> driftInspList(r['适用检验类型']||r['使用检验类型']).includes(it));
        return sortByCreateTimeDesc(ds);
      }
      if(pageId.value===SPI_PAGE){
        // 默认按创建时间倒序；查询：谱图编号 / 物料编码 / 批号 模糊，检验类型 精确
        list = spiRowsOf();
        return sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['谱图编号','物料编码','批号'], ['检验类型']));
      }
      if(pageId.value===CI_PAGE){
        return sortByCreateTimeDesc(ciQueryRows(list, ['提案编号','持续改进项目','提案人','提案部门','小组组长','责任部门'], ['改进状态'], ['提案日期','创建时间']));
      }
      if(isAuditPage()){
        const done = tabView.value.name==='tab-2';
        const src = done ? eaList('tab-2') : eaList('tab-1');
        if(!done) return sortByCreateTimeDesc(eaQuery(src, false));
        return eaQuery(src, true).slice().sort((a,b)=> String(b[auditWhenKey()]||'').localeCompare(String(a[auditWhenKey()]||'')));
      }
      if(pageId.value===IA_EXEC){
        const done = tabView.value.name==='tab-2';
        const src = done ? iaeDoneList() : iaePendingRows();
        if(!done) return sortByCreateTimeDesc(iaeQuery(src, false));
        return iaeQuery(src, true).slice().sort((a,b)=> String(b['变更实施提交时间']||'').localeCompare(String(a['变更实施提交时间']||'')));
      }
      if(pageId.value===IA_RECT){
        const done = tabView.value.name==='tab-2';
        const src = done ? iarTab('tab-2') : iarTab('tab-1');
        if(!done) return sortByCreateTimeDesc(iarQuery(src, false));
        return iarQuery(src, true).slice().sort((a,b)=> String(b['整改完成时间']||'').localeCompare(String(a['整改完成时间']||'')));
      }
      if(pageId.value===CIP_PAGE){
        const done = tabView.value.name==='tab-2';
        const keys = ['提案编号','持续改进项目','责任部门','提案人','提案部门','小组组长'];
        if(!done) return sortByCreateTimeDesc(ciQueryRows(cipPendingRows(), keys, [], ['提案日期','创建时间']));
        return ciQueryRows(cipDoneList(), [...keys, '改进提交人'], [], ['提案日期','创建时间','改进提交时间'])
          .slice().sort((a,b)=> String(b['改进提交时间']||'').localeCompare(String(a['改进提交时间']||'')));
      }
      if(pageId.value===CHG_PAGE){
        const done = tabView.value.name==='tab-2';
        list = applyContainsExactQuery(list, query, ['变更编号','变更项目名称','申请人','申请部门','变更涉及产品', ...(done ? ['变更处理提交人'] : [])], ['变更类型','变更来源','变更等级']);
        ['申请日期','创建时间', ...(done ? ['变更处理提交时间'] : [])].forEach(k=>{ list = applyDateRangeQuery(list, query, k); });
        if(!done) return sortByCreateTimeDesc(list);
        return list.slice().sort((a,b)=> String(b['变更处理提交时间']||'').localeCompare(String(a['变更处理提交时间']||'')));
      }
      if(csPage()) return csPage().rows(list, tabView.value.name==='tab-2');
      const enrichWaybillPoints = (r)=>{
        if(!isWaybillPage()) return r;
        const lines = Array.isArray(r._lines) ? r._lines : [];
        const joinPts = (key, cur)=>{
          if(cur && cur!=='—') return cur;
          const vals = [...new Set(lines.map(l=> String(l[key]||'').trim()).filter(v=> v && v!=='—'))];
          return vals.length ? vals.join('、') : (cur || '—');
        };
        const next = Object.assign({}, r);
        next['装货点'] = joinPts('装货点', r['装货点']);
        next['卸货点'] = joinPts('卸货点', r['卸货点']);
        return next;
      };
      list = list.map(enrichWaybillPoints);
      if(pageId.value==='spc-rule'){
        list = list.slice().sort((a,b)=> Number(a.sorted||0) - Number(b.sorted||0));
      }
      if(pageId.value==='wh-inv-rpt'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab4' || tab==='tab5'){
          list = list.map(r => enrichWhInvDetailRow(r, tab==='tab5' ? 'count' : 'serial'));
          list = applyContainsExactQuery(list, query,
            tab==='tab5' ? ['物料编码','物料名称','批号','仓库编码','库位编码'] : ['包材编号','物料信息','物料批号','条码号'],
            tab==='tab5' ? ['告警状态'] : ['告警状态','使用状态','库存状态','批号类型']
          );
        }
      }
      if(pageId.value==='mat-list'){
        list = applyMatListQuery(list, query);
        list = list.slice().sort((a,b)=> String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')));
      }
      if(pageId.value==='mat-uom'){
        list = sortMatUomRows(applyMatUomQuery(list, query));
      }
      if(pageId.value==='mat-medium'){
        list = applyDateRangeQuery(list, query, '创建时间');
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['物料编码','物料信息'], ['充装介质','创建人']));
      }
      if(pageId.value==='customer'){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['客户编码','客户名称','客户简称','所属业务员'], ['客户类型','启用状态']));
      }
      if(pageId.value==='supplier'){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['供应商编码','供应商名称','供应商简称','所属采购员'], ['供应商类型','启用状态']));
      }
      if(pageId.value==='unit'){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['单位编码','单位名称'], ['舍入规则','启用状态']));
      }
      if(pageId.value==='dict'){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['编码','名称'], ['启用状态']));
      }
      if(pageId.value==='po'){
        list = applyDateRangeQuery(list, query, '订单日期');
        list = sortByOrderDateDesc(applyContainsExactQuery(list, query, ['采购订单号','供应商编码','合同号'], ['订单状态','采购类型','采购部门','采购员']));
      }
      if(pageId.value==='so'){
        list = applyDateRangeQuery(list, query, '订单日期');
        list = sortByOrderDateDesc(applyContainsExactQuery(list, query, ['销售订单号','客户编码','合同号'], ['订单状态','销售类型','销售部门','销售员']));
      }
      if(pageId.value==='wwpo'){
        list = applyDateRangeQuery(list, query, '订单日期');
        list = sortByOrderDateDesc(applyContainsExactQuery(list, query, ['委外订单号','供应商编码','合同号'], ['订单状态','委外类型','采购部门','采购员']));
      }
      if(pageId.value==='serial-arch'){
        list = applyDateRangeQuery(list, query, '创建时间');
        list = applyContainsExactQuery(list, query, ['条码号','物料信息'], ['使用状态','库存状态','包装规格','绑定状态']);
        list = list.filter(r=>{
          const kw = String(query['物料编码']||'').trim();
          if(!kw) return true;
          return String(r['物料信息']||'').includes(kw);
        });
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value==='wh-so-prep'){
        list = applyDateRangeQuery(list, query, '计划日期');
        list = applyContainsExactQuery(list, query, ['备货通知单号','关联销售订单','客户名称','物料信息'], ['备货状态','单据类型']);
        list = list.slice().sort((a,b)=> String(b['制单时间']||'').localeCompare(String(a['制单时间']||'')));
      }
      if(pageId.value==='tank-arch'){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['条码号','储罐编号'], ['储罐类型','使用状态','库存状态']));
      }
      if(pageId.value==='warehouse'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['仓库编码','仓库名称','仓库位置','仓库用途'], ['启用状态']));
        } else {
          list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['库位编码','库位名称','所属仓库','库位位置'], ['启用状态']));
        }
      }
      if(pageId.value==='stock-warn'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['仓库编码','仓库名称'], ['启用状态']));
        } else {
          list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['物料编码','物料名称','物料规格'], ['物料种类','启用状态']));
        }
      }
      if(pageId.value==='insp-proc'){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['工序编码','工序名称'], ['表单名称','启用状态']));
      }
      if(pageId.value==='insp-craft'){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['工艺编码','工艺名称'], ['启用状态']));
        list = list.filter(r=>{
          const bizQ = query['适用业务单据'];
          if(bizQ && !String(r['适用业务单据']||'').includes(bizQ)) return false;
          const pkgQ = query['适用包材类型'];
          if(pkgQ && !String(r['适用包材类型']||'').includes(pkgQ)) return false;
          return true;
        });
      }
      if(pageId.value==='wh-insp-scheme'){
        list = applyDateRangeQuery(list, query, '创建时间');
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['巡检方案编码','巡检方案名称'], ['启用状态','表单名称']));
      }
      if(pageId.value===LAB_INSP_SCHEME){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['巡检方案编码','巡检方案名称'], ['启用状态','表单名称','循环方式']));
      }
      if(isLabCountPage()){
        const isQty = pageId.value===LAB_COUNT_QTY;
        list = list.map(isQty ? enrichLabCountQtyRow : enrichLabCountScanRow);
        list = list.filter(r=>{
          const no = String(query['盘点单号']||'').trim();
          if(no && !String(r['盘点单号']||'').includes(no)) return false;
          const personKey = isQty ? '创建人' : '制单人';
          const person = String(query[personKey]||'').trim();
          if(person && !String(r[personKey]||'').includes(person)) return false;
          if(query['状态'] && r['状态']!==query['状态']) return false;
          const types = Array.isArray(query['盘点类型']) ? query['盘点类型'] : splitDun(query['盘点类型']);
          if(types.length && !types.some(t=> splitDun(r['盘点类型']).includes(t))) return false;
          const whs = Array.isArray(query['盘点仓库']) ? query['盘点仓库'] : splitDun(query['盘点仓库']);
          if(whs.length && !whs.some(w=> splitDun(r['盘点仓库']).includes(w))) return false;
          return true;
        });
        const timeKey = isQty ? '创建时间' : '制单时间';
        list = list.slice().sort((a,b)=> String(b[timeKey]||'').localeCompare(String(a[timeKey]||'')));
      }
      if(pageId.value===LAB_STOCK_BOARD){
        list = list.filter(r=>{
          if(query['库存状态'] && r['库存状态']!==query['库存状态']) return false;
          if(query['告警状态'] && r['告警状态']!==query['告警状态']) return false;
          const types = Array.isArray(query['物料类型']) ? query['物料类型'] : splitDun(query['物料类型']);
          if(types.length && !types.includes(r['物料类型'])) return false;
          const code = String(query['物料编码']||'').trim();
          if(code && !(String(r['物料编码']||'').includes(code) || String(r['物料信息']||'').includes(code))) return false;
          const name = String(query['物料名称']||'').trim();
          if(name && !(String(r['物料名称']||'').includes(name) || String(r['物料信息']||'').includes(name))) return false;
          const bc = String(query['条码号']||'').trim();
          if(bc && !String(r['条码号']||'').includes(bc)) return false;
          const wh = String(query['仓库编码']||'').trim();
          if(wh && !String(r['仓库编码']||'').includes(wh)) return false;
          const whn = String(query['仓库名称']||'').trim();
          if(whn && !String(r['仓库名称']||'').includes(whn)) return false;
          return true;
        });
      }
      if(pageId.value===LAB_PREP) list = labPrepFilter();
      if(pageId.value===LAB_CALIB) list = labCalibFilter();
      if(isLabRgIoPage()){
        const noKey = labRgIoNoKey();
        if(activeTab.value==='tab-1'){
          list = list.map(enrichLabRgIoOrder);
          list = list.filter(r=>{
            const no = String(query[noKey]||'').trim();
            if(no){
              const nos = splitDun(no);
              if(nos.length>1){ if(!nos.includes(r[noKey])) return false; }
              else if(!String(r[noKey]||'').includes(no)) return false;
            }
            if(query['单据类型'] && r['单据类型']!==query['单据类型']) return false;
            if(query['单据状态'] && r['单据状态']!==query['单据状态']) return false;
            const person = String(query['制单人']||'').trim();
            if(person && !String(r['制单人']||'').includes(person)) return false;
            return true;
          });
          list = list.slice().sort((a,b)=> String(b['制单时间']||'').localeCompare(String(a['制单时间']||'')));
        } else {
          list = list.filter(r=>{
            if(query['流水状态'] && r['流水状态']!==query['流水状态']) return false;
            if(query['检查结果'] && r['检查结果']!==query['检查结果']) return false;
            const bc = String(query['条码号']||'').trim();
            if(bc && !String(r['条码号']||'').includes(bc)) return false;
            const no = String(query[noKey]||'').trim();
            if(no){
              const nos = splitDun(no);
              if(nos.length>1){ if(!nos.includes(r[noKey])) return false; }
              else if(!String(r[noKey]||'').includes(no)) return false;
            }
            const codeKey = labRgIoMat() + '编码';
            const code = String(query[codeKey]||'').trim();
            if(code && !String(r[codeKey]||'').includes(code)) return false;
            return true;
          });
          list = list.slice().sort((a,b)=> String(b['操作时间']||'').localeCompare(String(a['操作时间']||'')));
          if(LAB_OPEN_PAGES.has(pageId.value)){
            list = list.map(r=> Object.assign({}, r, bzOpenLife(r)));
            const lq = String(query['效期状态']||'').trim();
            if(lq) list = list.filter(r=> r['效期状态']===lq);
          }
        }
      }
      if(pageId.value===LAB_INSP_PLAN){
        list = labInspEnrichPlanRows(list);
        const nos = splitDun(query['计划单号']);
        const qNoPlan = Object.assign({}, query, { 计划单号: nos.length>1 ? '' : (query['计划单号']||'') });
        if(activeTab.value==='tab-1'){
          list = applyContainsExactQuery(list, qNoPlan, ['计划单号'], ['巡检方案名称','计划状态','逾期状态','创建方式']);
        } else {
          list = applyContainsExactQuery(list, qNoPlan, ['计划单号','操作人'], ['巡检方案名称','检查结果','创建方式']);
        }
        if(nos.length>1) list = list.filter(r=> nos.includes(String(r['计划单号']||'')));
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value==='wh-insp-plan'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['计划单号','巡检方案名称','仓库名称'], ['计划状态']);
        } else {
          list = applyContainsExactQuery(list, query, ['计划单号','巡检方案名称','仓库名称'], ['检查结果']);
        }
      }
      if(pageId.value==='carrier'){
        list = applyContainsExactQuery(list, query, ['承运商编码','承运商名称'], ['所属调度员','启用状态']);
      }
      if(pageId.value==='vehicle'){
        list = applyContainsExactQuery(list, query, ['车辆编码','车牌号','司机姓名'], ['经营范围','启用状态']);
      }
      if(pageId.value==='freight'){
        list = applyContainsExactQuery(list, query, ['发货地','收货地','产品名称'], ['车型','启用状态']);
      }
      if(pageId.value==='lg-carrier-evt'){
        list = applyDateRangeQuery(list, query, '发生日期');
        list = list.filter(r=>{
          const carQ = String(query['承运商']||'').trim();
          if(carQ && !(String(r['承运商编码']||'').includes(carQ) || String(r['承运商名称']||'').includes(carQ))) return false;
          if(query['事件大类'] && r['事件大类']!==query['事件大类']) return false;
          if(query['事件小类'] && r['事件小类']!==query['事件小类']) return false;
          if(query['初步责任判定'] && r['初步责任判定']!==query['初步责任判定']) return false;
          const wayQ = String(query['关联运单']||'').trim();
          if(wayQ && !String(r['关联运单']||'').includes(wayQ)) return false;
          if(query['事件等级'] && r['事件等级']!==query['事件等级']) return false;
          if(query['处理状态'] && r['处理状态']!==query['处理状态']) return false;
          return true;
        });
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value==='wh-po-in'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','供应商名称','关联采购订单','关联运单','关联发货单','车牌号','司机姓名'], ['单据状态','单据类型']);
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, ['入库单号','供应商名称','关联收料通知单号','ERP单据号','关联采购订单','关联运单','关联发货单','车牌号','司机姓名','包装规格'], ['单据状态','单据类型']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','入库单号','通知单号','新位置','关联运单','关联发货单','包装规格'], ['流水状态','检查结果','档案类型','单据类型']);
        }
      }
      if(pageId.value==='wh-po-ret'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','供应商名称','关联采购订单','关联运单','关联发货单','车牌号','司机姓名'], ['单据状态','单据类型']);
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, ['出库单号','供应商名称','关联退料通知单号','ERP单据号','关联采购订单','关联运单','关联发货单','车牌号','司机姓名','包装规格'], ['单据状态','单据类型']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','出库单号','通知单号','新位置','关联运单','关联发货单','包装规格'], ['流水状态','检查结果','档案类型','单据类型']);
        }
      }
      if(isOsPoPage()){
        const tab = activeTab.value || 'tab1';
        const meta = osNoticeMeta();
        const tab2Notice = meta ? meta.tab2Notice : '关联通知单号';
        const tab2No = pageId.value==='wh-os-ret-mat' || pageId.value==='wh-os-recv' ? '入库单号' : '出库单号';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','供应商名称','关联委外加工单','关联运单','关联发货单','车牌号','司机姓名'], ['单据状态','单据类型']);
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, [tab2No,'供应商名称',tab2Notice,'ERP单据号','关联委外加工单','关联运单','关联发货单','包装规格'], ['单据状态','单据类型']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号',tab2No,'通知单号','新位置','关联运单','关联发货单','包装规格'], ['流水状态','检查结果','档案类型','单据类型']);
        }
      }
      if(pageId.value==='wh-cs-recv'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','关联销售订单','客户名称','关联运单','关联发货单','车牌号','司机姓名'], ['单据状态','单据类型']);
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, ['收料单号','关联收料通知单号','ERP单据号','关联销售订单','客户名称','关联运单','关联发货单','车牌号','司机姓名'], ['单据状态','单据类型']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','通知单号','收料单号','客户名称','新位置','车牌号','司机姓名'], ['流水状态','检查结果','档案类型','单据类型']);
        }
      }
      if(pageId.value==='wh-cs-ret'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','关联销售订单','客户名称','关联运单','关联发货单','车牌号','司机姓名'], ['单据状态','单据类型']);
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, ['出库单号','关联退料通知单号','ERP单据号','关联销售订单','客户名称','关联运单','关联发货单','车牌号','司机姓名'], ['单据状态','单据类型']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','通知单号','出库单号','客户名称','原位置','车牌号','司机姓名'], ['流水状态','检查结果','档案类型','单据类型']);
        }
      }
      if(pageId.value==='wh-so-preout'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','关联销售订单','客户名称','关联运单','关联发货单','车牌号','司机姓名','司机电话','司机身份证号'], ['单据状态','单据类型']);
          list = applyDateRangeQuery(list, query, '计划执行日期');
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, ['出库单号','客户名称','关联销售订单','物料信息','操作人','关联通知单号','关联运单','关联发货单'], ['单据状态']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','批号','物料信息','关联销售订单','通知单号','出库单号'], ['流水状态']);
        }
      }
      if(pageId.value==='wh-so-ship'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','关联销售订单','客户名称','关联销售预出货单','关联运单','关联发货单','车牌号','司机姓名','司机电话','司机身份证号'], ['单据状态','单据类型']);
          list = applyDateRangeQuery(list, query, '计划执行日期');
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, ['出库单号','客户名称','关联销售订单','关联销售备货单','物料信息','操作人','关联通知单号','ERP单据号'], ['单据状态']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','批号','物料信息','关联销售订单','关联销售备货单','通知单号','出库单号','关联通知单号'], ['流水状态']);
        }
      }
      if(pageId.value==='wh-so-ret'){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','关联销售订单','客户名称','关联销售出库单','关联运单','关联发货单','车牌号','司机姓名','司机电话','司机身份证号'], ['单据状态','单据类型']);
          list = applyDateRangeQuery(list, query, '计划执行日期');
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, ['入库单号','客户名称','关联销售订单','关联销售出库单','物料信息','操作人','关联通知单号','ERP单据号'], ['单据状态']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','批号','物料信息','关联销售订单','关联销售出库单','关联通知单号','通知单号','入库单号'], ['流水状态']);
        }
      }
      if(isLoadPage()){
        const tab = activeTab.value || 'tab1';
        if(tab==='tab1'){
          list = applyContainsExactQuery(list, query, ['单号','关联单号','客供信息','物料信息','关联运单','关联发货单','车牌号','司机姓名','司机电话','司机身份证号'], ['单据状态','单据类型','关联仓库业务']);
          list = applyDateRangeQuery(list, query, '计划执行日期');
        } else if(tab==='tab2'){
          list = applyContainsExactQuery(list, query, ['装卸单号','关联装卸通知单号','关联业务单号','客供信息','物料信息','关联运单','关联发货单','车牌号','司机姓名','司机电话','司机身份证号','操作人'], ['单据状态','关联仓库业务']);
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','物料批号','物料信息','当前工序','装卸通知单号','装卸单号','关联业务单号','客供信息','关联运单','关联发货单','储罐编号','外包材编号'], ['流水状态','检查结果','档案类型']);
        }
      }
      if(pageId.value==='lg-dispatch'){
        list = list.filter(r=>{
          const noQ = String(query['申请单号']||'').trim();
          if(noQ && !String(r['编号']||'').includes(noQ)) return false;
          const shipQ = String(query['关联发货单号']||'').trim();
          if(shipQ && !String(r['关联发货单']||'').includes(shipQ)) return false;
          const wayQ = String(query['关联运单号']||'').trim();
          if(wayQ && !String(r['关联运单']||'').includes(wayQ)) return false;
          const matQ = String(query['物料信息']||'').trim();
          if(matQ && !String(r['物料信息']||'').includes(matQ)) return false;
          const loadQ = String(query['装货地点']||'').trim();
          if(loadQ && !String(r['装货地点']||'').includes(loadQ)) return false;
          const unloadQ = String(query['卸货地点']||'').trim();
          if(unloadQ && !String(r['卸货地点']||'').includes(unloadQ)) return false;
          if(query['申请部门'] && r['申请部门']!==query['申请部门']) return false;
          if(query['用车类型'] && r['用车类型']!==query['用车类型']) return false;
          const bizQ = query['关联仓储业务'] || query['仓库业务类型'];
          if(bizQ && (r['关联仓储业务']||r['仓库业务类型'])!==bizQ) return false;
          if(query['配送类型'] && r['配送类型']!==query['配送类型']) return false;
          if(query['审核状态'] && r['审核状态']!==query['审核状态']) return false;
          if(query['状态'] && r['状态']!==query['状态']) return false;
          const appQ = String(query['申请人']||'').trim();
          if(appQ && !String(r['申请人']||'').includes(appQ)) return false;
          return true;
        });
        list = list.slice().sort((a,b)=> String(b['编号']||'').localeCompare(String(a['编号']||'')));
      }
      if(pageId.value==='lg-ship'){
        list = list.map(overlayShipByWaybill).filter(r=>{
          const noQ = String(query['发货单号']||'').trim();
          if(noQ && !String(r['发货单号']||'').includes(noQ)) return false;
          const srcQ = String(query['来源派车单号']||'').trim();
          if(srcQ && !String(r['来源派车单号']||'').includes(srcQ)) return false;
          const wayQ = String(query['关联运单']||'').trim();
          if(wayQ && !String(r['关联运单']||'').includes(wayQ)) return false;
          const whQ = String(query['关联仓储通知单号']||'').trim();
          if(whQ && !String(r['关联仓储通知单']||'').includes(whQ)) return false;
          const matQ = String(query['物料信息']||'').trim();
          if(matQ && !String(r['物料信息']||'').includes(matQ)) return false;
          if(query['申请部门'] && r['申请部门']!==query['申请部门']) return false;
          if(query['仓库业务类型'] && resolveWhBizType(r)!==query['仓库业务类型']) return false;
          if(query['状态'] && r['状态']!==query['状态']) return false;
          const appQ = String(query['申请人']||'').trim();
          if(appQ && !String(r['申请人']||'').includes(appQ)) return false;
          return true;
        });
        list = list.slice().sort((a,b)=> String(b['发货单号']||'').localeCompare(String(a['发货单号']||'')));
      }
      if(isWaybillPage()){
        const carrierLock = pageId.value==='lg-waybill-carrier' ? demoCarrierName() : '';
        list = list.filter(r=>{
          if(carrierLock && r['承运商名称']!==carrierLock) return false;
          const noQ = String(query['运单号']||'').trim();
          if(noQ && !String(r['运单号']||'').includes(noQ)) return false;
          const shipQ = String(query['关联发货单']||'').trim();
          if(shipQ && !String(r['关联发货单']||'').includes(shipQ)) return false;
          if(query['承运商'] && r['承运商名称']!==query['承运商']) return false;
          if(query['运单状态'] && r['状态']!==query['运单状态']) return false;
          if(query['结算状态'] && r['结算状态']!==query['结算状态']) return false;
          if(query['运输类型'] && r['运输类型']!==query['运输类型']) return false;
          if(query['关联订单类型'] && r['关联订单类型']!==query['关联订单类型']) return false;
          const ordQ = String(query['关联订单号']||'').trim();
          if(ordQ && !String(r['关联订单号']||'').includes(ordQ)) return false;
          const outQ = String(query['关联出库单号']||'').trim();
          if(outQ && !String(r['关联出库单号']||'').includes(outQ)) return false;
          const matQ = String(query['物料信息']||'').trim();
          if(matQ && !String(r['物料信息']||'').includes(matQ)) return false;
          if(query['申请部门'] && r['申请部门']!==query['申请部门']) return false;
          if(query['仓库业务类型'] && resolveWhBizType(r)!==query['仓库业务类型']) return false;
          const drvQ = String(query['司机']||query['司机姓名/电话']||'').trim();
          if(drvQ && !(String(r['司机姓名']||'').includes(drvQ) || String(r['司机电话']||'').includes(drvQ))) return false;
          const sdQ = String(query['送货司机(专线)']||'').trim();
          if(sdQ && !String(r['送货司机（专线）']||'').includes(sdQ)) return false;
          const spQ = String(query['送货车牌号(专线)']||'').trim();
          if(spQ && !String(r['送货车牌号（专线）']||'').includes(spQ)) return false;
          return true;
        });
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value==='bc-scrap-list'){
        list = applyDateRangeQuery(list, query, '失效日期');
        list = applyContainsExactQuery(list, query, ['条码号','物料编码','物料名称','物料批号','库存位置'], ['报废状态','使用状态','库存状态','绑定状态']);
        list = list.slice().sort((a,b)=> String(a['失效日期']||'').localeCompare(String(b['失效日期']||'')));
      }
      if(pageId.value==='bc-outer-split'){
        list = applyDateRangeQuery(list, query, '操作时间');
        list = applyContainsExactQuery(list, query, ['外包材拆装单号','条码号'], ['单据类型','包材类型']);
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value==='bc-scrap-proc' || pageId.value==='bc-freeze' || pageId.value==='bc-unfreeze'){
        const tab = activeTab.value || (tabView.value||{}).name || 'tab1';
        if(tab==='tab1'){
          list = applyDateRangeQuery(list, query, pageId.value==='bc-scrap-proc' ? '创建时间' : '制单时间');
          const exactKeys = pageId.value==='bc-scrap-proc'
            ? ['单据状态','单据类型','产线名称','车间名称']
            : (pageId.value==='bc-freeze' ? ['单据状态','创建方式'] : ['单据状态']);
          const containsKeys = pageId.value==='bc-scrap-proc'
            ? ['工单号','报废工艺']
            : (pageId.value==='bc-freeze' ? ['冻结单号'] : ['解除单号']);
          list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, containsKeys, exactKeys));
        } else {
          list = applyContainsExactQuery(list, query, ['条码号','钢瓶编号','报废单号','冻结单号','解除单号','当前工序'], ['流水状态','档案来源','空满状态','库存状态','单据类型','产线名称','车间名称','报废工艺','创建方式']);
        }
      }
      if(pageId.value==='bc-serial-split' || pageId.value==='bc-serial-merge'){
        list = applyDateRangeQuery(list, query, '操作时间');
        const contains = pageId.value==='bc-serial-split'
          ? ['拆分单号','主条码号','物料名称','物料编码','物料批号']
          : ['合并单号','合并后条码号','物料名称','被合并条码号','物料编码','物料批号'];
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, contains, []));
      }
      if(pageId.value==='bc-freeze-list'){
        list = applyContainsExactQuery(list, query, ['条码号','物料编码','物料名称','冻结单号','关联业务单号'], ['档案来源','库存状态','单据类型','创建方式']);
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===SPLIT_PAGE){
        list = list.filter(r=> r['样品状态']!=='已完成' && splitPageRowVisible(r));
        list = list.slice().sort((a, b)=> String(b['拆分时间']||'').localeCompare(String(a['拆分时间']||'')) || String(a['样品编号']||'').localeCompare(String(b['样品编号']||'')));
      }
      if(pageId.value===TASK_PAGE){
        if((tabView.value||{}).name==='tab-1'){
          list = applyDateRangeQuery(list, query, '取样时间');
          list = applyContainsExactQuery(list, query, ['样品编号','报检单号','报检批号'], ['分配状态','样品状态','报检类型','分配方式']);
          if(query['检验类']) list = list.filter(r=> (r._lines||[]).some(l=> l['检验类']===query['检验类']));
          if(query['检验班组']) list = list.filter(r=> (r._lines||[]).some(l=> l['分配班组']===query['检验班组']));
          const mq = String(query['物料信息']||'').trim();
          if(mq){ const code = mq.split(' / ')[0]; list = list.filter(r=> r['物料编码']===code); }
          list = list.slice().sort((a, b)=> String(b._grpTime||'').localeCompare(String(a._grpTime||'')) || String(b['样品编号']||'').localeCompare(String(a['样品编号']||'')));
        } else {
          list = applyDateRangeQuery(list, query, '操作时间');
          list = applyContainsExactQuery(list, query, ['样品编号','报检单号','操作人'], ['操作类型','检验类','新班组']);
          list = list.slice().sort((a, b)=> String(b['操作时间']||'').localeCompare(String(a['操作时间']||'')));
        }
      }
      if(pageId.value===TIME_FB_PAGE){
        if((tabView.value||{}).name==='tab-1'){
          list = applyDateRangeQuery(list, query, '取样时间');
          list = applyContainsExactQuery(list, query, ['样品编号','报检单号','报检批号'], ['反馈状态','时间同步状态','样品状态','报检类型']);
          if(query['检验类']) list = list.filter(r=> (r._lines||[]).some(l=> l['检验类']===query['检验类']));
          if(query['检验班组']) list = list.filter(r=> (r._lines||[]).some(l=> l['分配班组']===query['检验班组']));
          const mq = String(query['物料信息']||'').trim();
          if(mq){ const code = mq.split(' / ')[0]; list = list.filter(r=> r['物料编码']===code); }
          list = list.slice().sort((a, b)=> String(b._grpTime||b['取样时间']||'').localeCompare(String(a._grpTime||a['取样时间']||'')) || String(b['样品编号']||'').localeCompare(String(a['样品编号']||'')));
        } else {
          list = applyDateRangeQuery(list, query, '操作时间');
          list = applyContainsExactQuery(list, query, ['样品编号','报检单号','操作人'], ['操作类型','检验类']);
          list = list.slice().sort((a, b)=> String(b['操作时间']||'').localeCompare(String(a['操作时间']||'')));
        }
      }
      if(pageId.value===DEV_PAGE){
        devSettleTabs();
        list = applyDateRangeQuery(list, query, '发起时间');
        list = applyContainsExactQuery(list, query, ['需求单号','样品编号','报检单号','发起人'], ['需求状态','测试结论']);
        const mq = String(query['物料信息']||'').trim();
        if(mq){ const code = mq.split(' / ')[0]; list = list.filter(r=> r['物料编码']===code); }
        list = list.slice().sort((a, b)=> String(b['发起时间']||'').localeCompare(String(a['发起时间']||'')));
      }
      if(pageId.value===PLATE_PAGE){
        plateSettleTabs();
        list = applyDateRangeQuery(list, query, '发起时间');
        list = applyContainsExactQuery(list, query, ['需求单号','样品编号','报检单号','发起人','卡塞二维码号'], ['需求状态']);
        const mq = String(query['物料信息']||'').trim();
        if(mq){ const code = mq.split(' / ')[0]; list = list.filter(r=> r['物料编码']===code); }
        list = list.slice().sort((a, b)=> String(b['发起时间']||'').localeCompare(String(a['发起时间']||'')));
      }
      if(pageId.value===OQC_PAGE){
        const done = (tabView.value||{}).name==='tab-2';
        list = applyDateRangeQuery(list, query, done ? '完成时间' : '计划发货日期');
        if(done) list = applyDateRangeQuery(list, query, '关闭时间');
        list = applyContainsExactQuery(list, query, ['单据号','DN单号','附件'], done ? ['单据状态'] : []);
        const cq = String(query['客户信息']||'').trim();
        if(cq){ const code = cq.split(' / ')[0]; list = list.filter(r=> r['客户编码']===code); }
        const mq = String(query['物料信息']||'').trim();
        if(mq){ const code = mq.split(' / ')[0]; list = list.filter(r=> r['物料编码']===code); }
        const keyOf = r => done ? (r['单据状态']==='已关闭' ? (r['关闭时间']||r['创建时间']) : (r['完成时间']||r['创建时间'])) : r['创建时间'];
        list = list.slice().sort((a, b)=> String(keyOf(b)||'').localeCompare(String(keyOf(a)||'')));
      }
      if(pageId.value===CASS_PAGE){
        list = applyContainsExactQuery(list, query, ['信息流水号','卡塞编号'], ['卡塞类型']);
        list = list.slice().sort((a, b)=> String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')));
      }
      if(pageId.value===COST_PAGE){
        list = applyContainsExactQuery(list, query, ['方案编码'], ['匹配范围','启用状态']);
        if(query['检验类']) list = list.filter(r=> splitDun(r['检验类']).includes(query['检验类']));
        const mq = String(query['物料信息']||'').trim();
        if(mq){ const code = mq.split(' / ')[0]; list = list.filter(r=> ruleMats(r).includes(code)); }
        list = list.slice().sort((a, b)=> String(a['方案编码']||'').localeCompare(String(b['方案编码']||'')));
      }
      if(pageId.value===COST_FLOW){
        list = applyDateRangeQuery(list, query, '检验完成时间');
        list = applyContainsExactQuery(list, query, ['报检单号','样品编号','成本方案编码','研发项目号','物料编码'], ['送检人','部门','检验类','匹配结果','报检类型','检验班组','检验结论','物料种类']);
        list = list.slice().sort((a, b)=> String(b['检验完成时间']||'').localeCompare(String(a['检验完成时间']||'')));
      }
      if(pageId.value===COST_STAT){
        if(tabView.value.name==='tab-1') list = costStatSummary(query);
        else list = costStatDetailRows(query);
      }
      if(pageId.value===DISPATCH_PAGE){
        list = applyContainsExactQuery(list, query, ['方案编码','方案名称'], ['分配方式','启用状态']);
        if(query['适用检验类']) list = list.filter(r=> splitDun(r['适用检验类']).includes(query['适用检验类']));
        if(query['派单班组']) list = list.filter(r=> splitDun(r['派单班组']).includes(query['派单班组']));
        const mq = String(query['适用物料']||'').trim();
        if(mq){ const code = mq.split(' / ')[0]; list = list.filter(r=> ruleMats(r).includes(code)); }
        list = list.slice().sort((a, b)=> String(a['方案编码']||'').localeCompare(String(b['方案编码']||'')));
      }
      if(pageId.value==='insp-project' && tabView.value.name==='tab-category'){
        list = applyContainsExactQuery(list, query, ['检验类编码','检验类名称'], ['检验类属性','启用状态']);
      }
      if(pageId.value==='insp-team'){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['班组编码','班组名称'], ['启用状态']));
      }
      if(pageId.value===SHIFT_PAGE){
        list = applyContainsExactQuery(list, query, ['班次编码','班次名称'], ['启用状态']);
        if(query['适用班组']) list = list.filter(r=> String(r['适用班组']||'')==='通用' || splitDun(r['适用班组']).includes(query['适用班组']));
        list = list.slice().sort((a, b)=> String(a['班次编码']||'').localeCompare(String(b['班次编码']||'')));
      }
      if(pageId.value===CAL_PAGE){
        list = applyContainsExactQuery(list, query, ['日历编码','日历名称'], ['启用状态']);
        if(query['适用班组']) list = list.filter(r=> String(r['适用班组']||'')==='通用' || splitDun(r['适用班组']).includes(query['适用班组']));
        const dr = query['生效日期'];
        if(Array.isArray(dr) && dr[0] && dr[1]) list = list.filter(r=> String(r['生效日期']||'') <= dr[1] && String(r['结束日期']||'') >= dr[0]);
        list = list.slice().sort((a, b)=> String(a['日历编码']||'').localeCompare(String(b['日历编码']||'')));
      }
      if(pageId.value===MAINT_PERSON_PAGE){
        list = applyDateRangeQuery(applyContainsExactQuery(list, query, ['人员编码','人员姓名','所属部门'], ['员工状态']), query, '创建时间');
        const tq = String(query['所属维保班组']||'').trim();
        if(tq) list = list.filter(r=> splitDun(r['所属维保班组']).includes(tq));
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===MAINT_TEAM_PAGE){
        list = sortByCreateTimeDesc(applyDateRangeQuery(applyContainsExactQuery(list, query, ['班组编码','班组名称','创建人'], ['启用状态']), query, '创建时间'));
      }
      if(isDjSchemePage()){
        const w = djKind().w;
        list = applyDateRangeQuery(applyContainsExactQuery(list, query, [w+'方案编码', w+'方案名称','表单名称','创建人'], ['启用状态','循环方式','执行条件']), query, '创建时间');
        const tq = String(query['指定维保班组']||'').trim();
        if(tq) list = list.filter(r=> splitDun(r['指定维保班组']).includes(tq));
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===FAULT_TYPE_PAGE){
        list = applyDateRangeQuery(applyContainsExactQuery(list, query, ['故障类型编码','故障类型名称','创建人'], ['启用状态']), query, '创建时间');
        const iq = String(query['适用仪器类型']||'').trim();
        if(iq) list = list.filter(r=> splitDun(r['适用仪器类型']).includes(iq));
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===BX_EXP_PAGE){
        list = applyDateRangeQuery(applyContainsExactQuery(list, query, ['经验编码','故障描述','创建人'], ['启用状态']), query, '创建时间');
        ['适用仪器类型','适用故障类型'].forEach(k=>{
          const q = String(query[k]||'').trim();
          if(q) list = list.filter(r=> splitComma(r[k]).includes(q));
        });
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===ABILITY_PAGE){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['能力编码','能力名称'], ['启用状态']));
      }
      if(TPL_PAGES[pageId.value]){
        const K = TPL_PAGES[pageId.value].kind;
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, [K+'编码', K+'名称'], ['启用状态']));
      }
      if(pageId.value===PERSON_PAGE){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['工号','姓名','部门'], ['在职状态','启用状态']));
      }
      if(pageId.value===TRAIN_PAGE){
        list = applyDateRangeQuery(list, query, '培训时间');
        list = applyContainsExactQuery(list, query, ['工号','姓名','部门','培训内容'], []);
        const tq = String(query['培训类型']||'').trim();
        if(tq) list = list.filter(r=> splitDun(r['培训类型']).includes(tq));
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===HM_IMP_PAGE){
        list = applyDateRangeQuery(list, query, '创建时间');
        list = applyContainsExactQuery(list, query, ['申请单号','文件编号','文件名称','客户名称','法规名称','创建人'], ['文件类型','使用期限类型','物料类','导入状态']);
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===HM_VOID_PAGE){
        list = applyDateRangeQuery(list, query, '创建时间');
        list = applyContainsExactQuery(list, query, ['申请单号','文件编号','文件名称','客户名称','法规名称','创建人','作废原因'], ['文件类型','作废状态']);
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===HM_CHG_PAGE){
        list = applyDateRangeQuery(list, query, '创建时间');
        const nameQ = String(query['文件名称']||'').trim();
        const custQ = String(query['客户名称']||'').trim();
        list = applyContainsExactQuery(list, query, ['申请单号','文件编号','创建人'], ['变更类型','变更状态']);
        if(nameQ) list = list.filter(r=> [r['变更前文件名称'], r['变更后文件名称'], r['原文件']].some(v=> String(v||'').includes(nameQ)));
        if(custQ) list = list.filter(r=> [r['变更前客户名称'], r['变更后客户名称']].some(v=> String(v||'').includes(custQ)));
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===HM_BIN_PAGE){
        hmSyncVoid();
        list = hmBinRows().slice();
        list = applyDateRangeQuery(list, query, '作废时间');
        list = applyContainsExactQuery(list, query, ['文件编号','文件名称','客户名称','法规名称','作废原因','来源申请单号'], ['文件类型']);
        list = list.slice().sort((a,b)=> String(b['作废时间']||'').localeCompare(String(a['作废时间']||'')));
      }
      if(pageId.value===HM_ARCH_PAGE){
        list = hmArchRows().slice();
        if(treeListId.value) list = list.filter(r=> (r['物料类']||'') === treeListId.value);
        list = applyDateRangeQuery(list, query, '创建时间');
        list = applyContainsExactQuery(list, query, ['标准编号','标准名称','英文名称','CAS No','单位','创建人','物料类'], []);
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===HM_LIB_PAGE){
        list = hmLibRows().map(hmExpireView);
        if(treeListId.value) list = list.filter(r=> (r['物料类']||'') === treeListId.value);
        list = applyDateRangeQuery(list, query, '创建时间');
        list = applyDateRangeQuery(list, query, '失效日期');
        list = applyContainsExactQuery(list, query, ['文件编号','文件名称','客户名称','法规名称','创建人','物料类'], ['使用状态','文件类型','使用期限类型']);
        list = sortByCreateTimeDesc(list);
      }
      if(pageId.value===HM_EXP_PAGE){
        list = hmExpRows().map(r=> Object.assign({}, r, {
          文件类型: r['文件类型'] || '—',
          客户名称: r['客户名称'] || '—',
          法规名称: r['法规名称'] || '—'
        }));
        list = applyDateRangeQuery(list, query, '失效日期');
        list = applyContainsExactQuery(list, query, ['文件编号','文件名称','客户名称','法规名称'], ['使用状态','文件类型','使用期限类型']);
        list = list.slice().sort((a,b)=> String(a['失效日期']||'').localeCompare(String(b['失效日期']||'')) || String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')));
      }
      if(pageId.value===MATRIX_PAGE){
        list = applyContainsExactQuery(matrixRows(), query, ['工号','姓名','部门'], []);
      }
      if(pageId.value===QUALITY_PAGE){
        list = applyContainsExactQuery(qualityRows(), query, ['工号','姓名','部门'], []);
      }
      const expiryKind = EXPIRY_PAGES[pageId.value];
      if(expiryKind==='标准物质'){
        const keep = new Set(applyDateRangeQuery(list.map(r=> ({ r, 失效日期: bzWarnExpire(r) })), query, '失效日期').map(x=> x.r));
        list = list.filter(r=> keep.has(r));
      } else if(expiryKind){
        list = applyDateRangeQuery(list, query, '失效日期');
      }
      if(expiryKind){
        list = sortByCreateTimeDesc(applyContainsExactQuery(list, query, ['条码号', expiryKind+'名称', expiryKind+'编码', expiryKind+'种类', '批号'], ['状态']));
      }
      if(pageId.value==='opc-point' || pageId.value==='gather-item' || pageId.value==='gather-scheme' || pageId.value==='np-0501-01' || pageId.value==='np-0502-01' || pageId.value==='np-0601-01') list = sortByCreateTimeDesc(list);
      if(STORE) list = list.map(r => STORE.overlayPcRow(pageId.value, r));
      if(pageId.value==='np-0201-01'){
        list = list.map(r=> {
          if(r['物料编码'] && r['物料编码']!=='—') return r;
          const code = String(r['物料信息']||'').split('/')[0].trim();
          const m = matListRow(code);
          if(!m) return r;
          return Object.assign({}, r, {
            物料编码: m['物料编码']||'',
            物料名称: m['物料名称']||'',
            物料规格: m['物料规格']||'',
            物料种类: m['物料种类']||''
          });
        });
      }
      return applyGenericQuery(list);
    });
    /** 以下页面的这些查询条件没有专门的筛选逻辑，按通用规则筛选：文本包含、下拉精确、选择器按编码或名称、日期按天 */
