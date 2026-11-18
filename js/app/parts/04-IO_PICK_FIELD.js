    const IO_PICK_FIELD = { 客户信息:'customer', 供应商信息:'supplier', 物料信息:'mat', 物料编码:'mat', 适用物料:'mat', 采样点:'point', 采集方案:'gatherScheme', 通知人:'person' };
    const RETAIN_MAT_FIELDS = ['留样编码','留样名称','留样规格','留样种类'];
    const IO_ORDER_SAMPLE_TABS = ['tab-ext'];
    const ADD_SAMPLE_CARRY = ['物料编码','物料名称','物料规格','物料种类','供应商编码','供应商名称','客户编码','客户名称','产线名称','车间名称','采样点','报检批号'];
    function ioOrderTab(){
      const tabs = ((CFG.pages||{})['insp-order']||{}).tabs || [];
      return (tabs.find(t=> t.label===formModel['报检单类型'])||{}).name || '';
    }
    const ioPickMeta = computed(()=>{
      if(ioPickKind.value==='order'){
        const smp = IO_ORDER_SAMPLE_TABS.includes(ioOrderTab());
        const nameField = smp ? '样品名称' : '物料名称';
        return { title:'选择报检单 · ' + (formModel['报检单类型']||''), codeField:'报检单号', nameField,
          cols:[['报检单号',170],['单据状态',90],['优先级',80],[smp?'样品编号':'物料编码',140],[nameField,180],[smp?'样品规格':'物料规格',120],['报检批号',130],['应取样件数',100],['已取样件数',100]] };
      }
      if(ioPickKind.value==='oeSample'){
        return { ...IO_PICK_META.oeSample, title:'选择样品' };
      }
      if(ioPickKind.value==='qrIssueOrder'){
        return { ...IO_PICK_META.qrIssueOrder };
      }
      if(ioPickKind.value==='qrIssueSample'){
        return { ...IO_PICK_META.qrIssueSample };
      }
      if(ioPickKind.value==='splitSample'){
        return { title:'选择样品 · ' + (formModel['报检类型']||''), codeField:'样品编号', nameField:'物料名称',
          cols:[['样品编号',140],['样品状态',90],['报检单号',150],['物料编码',140],['物料名称',180],['物料规格',120],['报检批号',130],['检验方案',160]] };
      }
      if(ioPickKind.value==='retainLoc'){
        if(ioPickBind.value==='slocDisp' && !ioPickWh.value) return { ...IO_PICK_META.retainLoc, title:'选择留样库位' };
        if(ioPickWh.value) return { ...IO_PICK_META.retainLoc, title:'选择留样库位 · '+ioPickWh.value };
      }
      if(ioPickKind.value==='mrbSrc'){
        const type = formModel['来源处置类型'] || '';
        return { title:'选择来源处置单号 · '+type+'（待处理、未评审）', src: qcMrbSrcPid(type), tab:'tab-wait', codeField:'处置单号', nameField:'物料名称',
          cols:[['处置单号',160],['检验结论',90],['物料编码',140],['物料名称',170],['报检批号',120],['报检单号',150],['异常描述',180]] };
      }
      if(ioPickKind.value==='capaSrc'){
        const type = formModel['事件类型'] || '';
        const [src, tab] = QC_CAPA_SRC[type] || [];
        const cs = src===CT_PAGE || src===CR_PAGE;
        const codeField = src===CT_PAGE ? '客诉单号' : src===CR_PAGE ? '退货单号' : '处置单号';
        return { title:'选择来源单号 · '+type, src, tab, codeField, nameField:'物料名称',
          cols: cs ? [[codeField,160],['客户名称',180],['物料信息',240],['批号',120],['制单时间',160]]
            : [[codeField,160],['物料编码',140],['物料名称',170],['报检批号',120],['问题大类',90],['问题小类',100],['处置时间',160]] };
      }
      if(ioPickKind.value==='oqcTask'){
        return { title:'选择关联单据 · 发货OQC台账', codeField:'单据号', nameField:'DN单号',
          cols:[['单据号',160],['单据状态',90],['DN单号',120],['客户名称',190],['物料名称',160],['批号',110],['计划发货日期',110]] };
      }
      return IO_PICK_META[ioPickKind.value] || IO_PICK_META.mat;
    });
    const ioPickRows = computed(()=>{
      void ioPickTick.value;
      void storeTick.value;
      const meta = ioPickMeta.value;
      const mock = window.WMS_MOCK_ROWS || MOCK;
      let list = ioPickKind.value==='splitSample'
        ? splitSampleRows()
        : ioPickKind.value==='oeSample'
        ? oeSampleRows()
        : ioPickKind.value==='qrIssueOrder'
        ? qrIssueDoneOrders()
        : ioPickKind.value==='qrIssueSample'
        ? qrIssueLedgerSamples()
        : ioPickKind.value==='order'
        ? (((mock['insp-order']||{})[ioOrderTab()])||[]).filter(r=> ['待执行','执行中'].includes(r['单据状态']))
        : ioPickKind.value==='oqcTask'
        ? ['tab-1','tab-2'].reduce((l,t)=> l.concat((((mock[OQC_PAGE]||{})[t])||[])), [])
        : (((mock[meta.src]||{})[meta.tab||'main'])||[]).filter(r=> (r['启用状态']||'启用')==='启用');
      if(ioPickKind.value==='inspScheme'){
        const bag = mock['insp-scheme'] || {};
        const labels = { 'tab-pi':'采购来料检', 'tab-pp':'生产过程检', 'tab-pm':'生产物料检', 'tab-sst':'生产SST检', 'tab-rd':'研发检', 'tab-ext':'外来小样检', 'tab-wr':'库内复检', 'tab-gen':'通用检', 'tab-oe':'内部委托' };
        list = [];
        Object.keys(bag).forEach(tab=>{
          if(!Array.isArray(bag[tab])) return;
          bag[tab].forEach(r=>{
            if((r['启用状态']||'启用')!=='启用') return;
            list.push(Object.assign({}, r, { 检验类型: r['检验类型'] || labels[tab] || '' }));
          });
        });
      }
      if(ioPickKind.value==='retainLoc'){
        if(ioPickBind.value==='slocDisp' && !ioPickWh.value){
          const opts = new Set(RETAIN_WH_OPTS.value || []);
          list = list.filter(r=>{
            const parts = String(r['所属仓库']||'').split(/[、,，]/).map(s=> s.trim()).filter(Boolean);
            return parts.some(p=> opts.has(p));
          });
        } else if(ioPickWh.value){
          list = list.filter(r=> String(r['所属仓库']||'').split(/[、,，]/).map(s=> s.trim()).includes(ioPickWh.value));
        }
      }
      if(ioPickKind.value==='qrIssueSample' && ioPickBind.value==='abnEvent') list = list.filter(r=> r['样品状态']==='已完成');
      if(ioPickKind.value==='mrbSrc') list = list.filter(r=> r['MRB状态']==='未评审');
      if(ioPickKind.value==='person'){
        const added = new Set((formLineRows.value||[]).map(r=> r['工号']));
        list = list.filter(r=> r['在职状态']!=='离职' && !added.has(r['工号']));
      }
      if(ioPickKind.value==='inst'){
        if(ioPickBind.value==='dispatchInsts' || ioPickField.value==='使用仪器') list = list.filter(r=> r['使用状态']==='在用');
        else if(ioPickBind.value==='taskInsts'){
          const allow = new Set(((taskAsgInstRow.value||{})._instOpts)||[]);
          list = list.filter(r=> r['使用状态']==='在用' && allow.has(r['仪器名称']));
        } else {
        const wj = ioPickBind.value==='wjInsts';
        if(ioPickBind.value==='wxInst') list = list.filter(r=> r['使用状态']!=='报废');
        else {
          const lines = wj ? wjExecLines.value : ioPickBind.value==='bxInsts' ? bxFormLines.value : ioPickBind.value==='tyInsts' ? tyFormLines.value : ioPickBind.value==='msaInsts' ? msaInsts.value : ioPickBind.value==='stbInsts' ? stbInsts.value : (formLineRows.value||[]);
          const added = new Set(lines.map(r=> r._instId));
          const need = ioPickBind.value==='tyInsts' ? tyK.value.from : ['在用'];
          list = list.filter(r=> need.includes(r['使用状态']) && !added.has(r.id));
        }
        if(wj) list = list.filter(r=> r['是否外校']==='是');
        if(isDjPlanPage()){
          const s = djSchemeByName(formModel[djKind().w+'方案名称']);
          const bound = new Set(((s||{})._insts||[]).map(l=> l._instId));
          list = list.filter(r=> bound.has(r.id));
        }
        }
      }
      if(ioPickKind.value==='part'){
        const added = new Set(woParts.value.map(l=> l._matId));
        list = list.filter(r=> r['物料种类']==='备品备件' && !added.has(r.id));
      }
      if(ioPickKind.value==='calibArch' && ioPickBind.value==='form') list = labCalibPickableArch(list);
      if(ioPickKind.value==='msaStd'){
        const today = qcYmd(new Date());
        const alive = r=> !(r['失效日期'] && /^\d{4}-/.test(r['失效日期']) && r['失效日期'] < today);
        if(ioPickBind.value==='biasStd') list = list.filter(alive);
        else {
          const bag = ioPickBind.value==='stbStds' ? stbStds.value : msaStds.value;
          const added = new Set(bag.map(s=> s['标准物质条码号']));
          list = list.filter(r=> alive(r) && !added.has(r['条码号']));
        }
      }
      if(ioPickKind.value==='spcItem'){
        list = list.filter(r=> r['检验项类型']==='定量');
      }
      if(ioPickKind.value==='inspScheme' && ioPickBind.value==='spcP'){
        const def = SPC_P_TYPES.find(t=> t.key === String(ioPickField.value||'').split('.')[0]);
        if(def) list = list.filter(r=> r['检验类型'] === def.typeName);
      }
      if(ioPickKind.value==='msaItem'){
        const bag = ioPickBind.value==='stbItems' ? stbItems.value : msaItems.value;
        const added = new Set(bag.map(it=> it['检验项编码']));
        list = list.filter(r=> r['检验项类型']==='定量' && !added.has(r['检验项编码']));
      }
      if(ioPickKind.value==='hmItem'){
        const cur = hmArchItemRow.value;
        const used = new Set((formLineRows.value||[]).filter(l=> l!==cur).map(l=> String(l['中文名称']||'').trim()).filter(Boolean));
        list = list.filter(r=> !used.has(String(r['检验项名称']||'').trim()));
      }
      if(ioPickKind.value==='oeItem'){
        const names = new Set(oeSchemeItemNames());
        const used = new Set((formLineRows.value||[]).map(l=> String(l['检验项名称']||'').trim()).filter(Boolean));
        list = list.filter(r=> names.has(String(r['检验项名称']||'').trim()) && !used.has(String(r['检验项名称']||'').trim()));
      }
      if(ioPickKind.value==='hmStd') list = list.filter(r=> r['启用状态']==='启用' && (r._lines||[]).length);
      if(ioPickKind.value==='hmArchStd'){
        const cat = String(formModel['物料类']||'').trim();
        list = list.filter(r=> !cat || String(r['物料类']||'')===cat);
      }
      if(ioPickKind.value==='gatherItem'){
        const taken = new Set((formLineRows.value||[]).map(r=> r['采集项编码']));
        list = list.filter(r=> !taken.has(r['采集项编码']));
      }
      if(ioPickKind.value==='point'){
        const tab = (tabView.value||{}).label || currentTabLabel.value;
        const hit = list.filter(r=> !r['适用报检单'] || String(r['适用报检单']).includes(tab));
        if(hit.length) list = hit;
      }
      if(ioPickKind.value==='chromDriftRule'){
        const want = chromLedgerKindOf(pageId.value);
        const tab = String(activeTab.value || '').trim();
        list = driftRowsOf().filter(r=>{
          if(String(r['启用状态'] || '启用') !== '启用') return false;
          if(want && String(r['规则分类'] || '').trim().toUpperCase() !== want) return false;
          if(tab){
            const ti = chromLedgerTabsOfRule(r);
            if(ti.tabs.length && !ti.tabs.includes(tab)) return false;
          }
          return true;
        });
      }
      const c = String(ioPickQ.code||'').trim(), n = String(ioPickQ.name||'').trim();
      if(c) list = list.filter(r=> String(r[meta.codeField]||'').includes(c));
      if(n) list = list.filter(r=> String(r[meta.nameField]||'').includes(n));
      return list;
    });
    function resetIoPickQ(){
      ioPickQ.code = ''; ioPickQ.name = '';
      ioPickTick.value++;
    }
    function ioPickRowKey(row){
      const m = ioPickMeta.value || {};
      return String(row.id || row[m.codeField] || row[m.nameField] || '');
    }
    function onIoPickSelection(rows){
      const next = (rows || []).slice();
      const prev = ioPickSelected.value || [];
      if(next.length===prev.length && next.every((r,i)=> r===prev[i])) return;
      ioPickSelected.value = next;
    }
    const ioPickBind = ref('form');
    const ioPickField = ref('');
    const ioPickMulti = ref(false);
    const ioPickSelected = ref([]);
    const ioPickTableRef = ref(null);
    function openIoPick(kind, bind, field, multi){
      ioPickKind.value = kind;
      ioPickMulti.value = !!multi;
      ioPickSelected.value = [];
      ioPickBind.value = bind || 'form';
      ioPickField.value = field || '';
      ioPickCurrent.value = null;
      resetIoPickQ();
      ioPickVisible.value = true;
      if(!multi) return;
      if(bind==='splitSample'){
        const picked = new Set((formModel._splitParents||[]).map(r=> r['样品编号']));
        if(!picked.size) return;
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(t) ioPickRows.value.forEach(r=> { if(picked.has(r['样品编号'])) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      if(bind==='dispatchCats'){
        const picked = new Set((formCatRows.value||[]).map(r=> String(r['检验类名称']||'').trim()).filter(Boolean));
        if(!picked.size) return;
        const m = IO_PICK_META[kind] || {};
        const keyField = m.byName ? m.nameField : m.codeField;
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(t) ioPickRows.value.forEach(r=> { if(picked.has(r[keyField])) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      if(bind==='dispatchMats'){
        const picked = new Set((formLineRows.value||[]).map(r=> String(r['物料编码']||'').trim()).filter(Boolean));
        if(!picked.size) return;
        const m = IO_PICK_META[kind] || {};
        const keyField = m.codeField;
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(t) ioPickRows.value.forEach(r=> { if(picked.has(r[keyField])) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      if(bind==='qrIssueSample'){
        const picked = new Set((formLineRows.value||[]).map(r=> String(r['样品编号']||'').trim()).filter(Boolean));
        if(!picked.size) return;
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(t) ioPickRows.value.forEach(r=> { if(picked.has(String(r['样品编号']||'').trim())) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      if(bind==='hmImpEntry'){
        const picked = new Set((hmImpEntryRows.value||[]).map(r=> String(r['标准编号']||'').trim()).filter(Boolean));
        if(!picked.size) return;
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(t) ioPickRows.value.forEach(r=> { if(picked.has(String(r['标准编号']||''))) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      if(bind==='dispatchInsts' || field==='使用仪器'){
        const picked = field==='使用仪器'
          ? new Set(splitDun(formModel['使用仪器']))
          : new Set((formInstRows.value||[]).map(r=> String(r['仪器编号']||'').trim()).filter(Boolean));
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(!t) return;
          t.clearSelection();
          ioPickRows.value.forEach(r=> { if(picked.has(r['仪器编号']) || picked.has(r['仪器名称'])) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      if(bind==='taskInsts'){
        const picked = new Set(taskAsgList((taskAsgInstRow.value||{})['适用仪器']));
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(!t) return;
          t.clearSelection();
          ioPickRows.value.forEach(r=> { if(picked.has(r['仪器名称'])) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      if(bind==='inspRpt'){
        const picked = new Set(inspRptPickKeys(field));
        if(!picked.size) return;
        const m = IO_PICK_META[kind] || {};
        const keyField = m.byName ? m.nameField : m.codeField;
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(t) ioPickRows.value.forEach(r=> { if(picked.has(r[keyField]) || (kind==='point' && picked.has(r['采样点名称']))) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      if(bind==='spcP'){
        const { tp, key } = spcPField(field);
        const picked = new Set(!tp ? [] : key==='mats' ? tp.mats.map(spcPMatCode) : key==='items' ? tp.items.slice() : []);
        if(!picked.size) return;
        const keyField = kind==='mat' ? '物料编码' : '检验项名称';
        nextTick(()=> setTimeout(()=>{
          const t = ioPickTableRef.value;
          if(t) ioPickRows.value.forEach(r=> { if(picked.has(String(r[keyField]||'').trim())) t.toggleRowSelection(r, true); });
        }, 0));
        return;
      }
      const raw = (bind||'form')==='query' ? query[field] : formModel[field];
      const picked = new Set(splitDun(Array.isArray(raw) ? raw.join('、') : String(raw || '')).map(s=> s.split(' / ')[0].trim()));
      if(!picked.size) return;
      const m = IO_PICK_META[kind] || {};
      const keyField = m.byName ? m.nameField : m.codeField;
      nextTick(()=> setTimeout(()=>{
        const t = ioPickTableRef.value;
        if(t) ioPickRows.value.forEach(r=> { if(picked.has(r[keyField]) || (kind==='point' && picked.has(r['采样点名称']))) t.toggleRowSelection(r, true); });
      }, 0));
    }
    function ioPickText(k, r){
      if(k==='point') return r['采样点名称'] || '';
      if(k==='solution') return [r['试液编码'], r['试液名称'], r['试液规格'], r['试液种类']].filter(Boolean).join(' / ');
      if(k==='calibArch') return r['条码号'] || '';
      const m = IO_PICK_META[k] || {};
      if(m.byName) return r[m.nameField] || '';
      return [r[m.codeField], r[m.nameField], k==='mat' ? r['物料规格'] : ''].filter(Boolean).join(' / ');
    }
    function hmArchLineFromItem(x, limit){
      const unitRaw = String((x && x['检验项单位']) || '').trim();
      const unit = unitRaw==='ppm' || unitRaw==='mg/kg' ? unitRaw : 'ppm';
      return {
        中文名称: (x && x['检验项名称']) || '',
        _itemCode: (x && x['检验项编码']) || '',
        英文名称: (x && x['英文名称']) || '',
        'CAS No': (x && x['CAS No']) || '',
        管控对象: (x && x['管控对象']) || '',
        限制值: limit || '',
        单位: unit,
        MDL: (x && x['检出限D.L']) || ''
      };
    }
    function confirmIoPick(){
      const k = ioPickKind.value;
      if(ioPickMulti.value){
        const table = ioPickTableRef.value;
        const live = table && table.getSelectionRows ? table.getSelectionRows() : null;
        const rows = live ? live.slice() : (ioPickSelected.value || []).slice();
        if(ioPickBind.value==='taskInsts'){ applyTaskInstPick(rows); return; }
        if(ioPickBind.value==='inspRpt'){
          inspApplyMulti(ioPickField.value, rows);
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='qrReport'){
          qrApplyPick(rows);
          ioPickVisible.value = false;
          return;
        }
        if(ioPickField.value==='使用仪器'){
          formInstRows.value = rows.map(dispatchInstLine);
          formModel['使用仪器'] = rows.map(r=> r['仪器名称']).filter(Boolean).join('、');
          ioPickVisible.value = false;
          return;
        }
        if(!rows.length){ ElMessage.warning('请至少选择一条数据'); return; }
        if(ioPickBind.value==='splitSample'){ applySplitSamplePick(rows); return; }
        if(ioPickBind.value==='dispatchCats'){
          const exist = new Set((formCatRows.value||[]).map(r=> r['检验类名称']));
          let added = 0;
          rows.forEach(r=>{
            const name = String(r['检验类名称']||'').trim();
            if(!name || exist.has(name)) return;
            exist.add(name);
            formCatRows.value = formCatRows.value.concat([dispatchCatLine(r)]);
            added++;
          });
          ioPickVisible.value = false;
          ElMessage.success(added ? ('已添加 '+added+' 项') : '所选检验类已在列表中');
          return;
        }
        if(ioPickBind.value==='dispatchMats'){
          const exist = new Set((formLineRows.value||[]).map(r=> r['物料编码']));
          let added = 0;
          rows.forEach(r=>{
            const code = String(r['物料编码']||'').trim();
            if(!code || exist.has(code)) return;
            exist.add(code);
            formLineRows.value = formLineRows.value.concat([{ 物料编码: code, 物料名称: r['物料名称']||'', 物料规格: r['物料规格']||'', 物料种类: r['物料种类']||'' }]);
            added++;
          });
          ioPickVisible.value = false;
          ElMessage.success(added ? ('已添加 '+added+' 项') : '所选物料已在列表中');
          return;
        }
        if(ioPickBind.value==='qrIssueSample'){
          const exist = new Set((formLineRows.value||[]).map(r=> String(r['样品编号']||'').trim()).filter(Boolean));
          let added = 0;
          rows.forEach(r=>{
            const no = String(r['样品编号']||'').trim();
            if(!no || exist.has(no)) return;
            exist.add(no);
            formLineRows.value = (formLineRows.value||[]).concat([{
              物料批号: (r['报检批号'] && r['报检批号']!=='—') ? r['报检批号'] : (r['物料批号']||''),
              样品编号: no,
              样品来源: r['样品来源'] || '报检取样'
            }]);
            added++;
          });
          ioPickVisible.value = false;
          ElMessage.success(added ? ('已添加 '+added+' 条样品') : '所选样品已在明细中');
          return;
        }
        if(ioPickBind.value==='dispatchInsts'){
          const exist = new Set((formInstRows.value||[]).map(r=> r['仪器编号']));
          let added = 0;
          rows.forEach(r=>{
            const code = String(r['仪器编号']||'').trim();
            if(!code || exist.has(code)) return;
            exist.add(code);
            formInstRows.value = formInstRows.value.concat([dispatchInstLine(r)]);
            added++;
          });
          ioPickVisible.value = false;
          ElMessage.success(added ? ('已添加 '+added+' 项') : '所选仪器已在列表中');
          return;
        }
        if(ioPickBind.value==='gatherLines'){
          const exist = new Set((formLineRows.value||[]).map(r=> r['采集项编码']));
          let added = 0;
          rows.forEach(r=>{
            const code = r['采集项编码'] || '';
            if(!code || exist.has(code)) return;
            exist.add(code);
            const freq = r['采集频率'] || ((r['采集频率数值']!=null && r['采集频率单位']) ? (String(r['采集频率数值']) + '/' + r['采集频率单位']) : '');
            formLineRows.value = formLineRows.value.concat([hydrateGatherLine({
              采集项编码: code,
              采集项名称: r['采集项名称'] || '',
              采集频率: freq,
              采集位置: r['点位名称'] || '',
              采集项单位: r['采集项单位'] || '',
              采集项原单位: r['采集项单位'] || '',
              采集项单位编码: r['采集项单位编码'] || ''
            }, formLineRows.value.length)]);
            added++;
          });
          ioPickVisible.value = false;
          ElMessage.success(added ? ('已添加 '+added+' 个采集项') : '所选采集项已在指标集中');
          return;
        }
        if(ioPickBind.value==='hmArchItems'){
          const used = new Set((formLineRows.value||[]).map(l=> String(l['中文名称']||'').trim()).filter(Boolean));
          const add = rows.filter(x=> x['检验项名称'] && !used.has(String(x['检验项名称']).trim()));
          if(!add.length){ ElMessage.warning('所选检验项已在列表中'); return; }
          formLineRows.value = (formLineRows.value||[]).concat(add.map(x=> hmArchLineFromItem(x)));
          ioPickVisible.value = false;
          ElMessage.success('已添加 ' + add.length + ' 项');
          return;
        }
        if(ioPickBind.value==='hmImpEntry'){
          const used = new Set((hmImpEntryRows.value||[]).map(r=> String(r['标准编号']||'').trim()).filter(Boolean));
          const add = rows.filter(r=> r['标准编号'] && !used.has(String(r['标准编号']).trim()));
          if(!add.length){ ElMessage.warning('所选标准已在列表中'); return; }
          const target = hmImpEntryTarget.value;
          let filled = 0;
          add.forEach((r, i)=>{
            const line = { id:'hmie-'+Date.now().toString(36)+i, 标准编号: r['标准编号']||'', 标准名称: r['标准名称']||'', 测试值:'', 单位: r['单位']||'', 比对结果:'', _archId: r.id };
            if(i===0 && target && !String(target['标准编号']||'').trim()){
              Object.assign(target, line, { id: target.id || line.id });
              filled++;
            } else {
              hmImpEntryRows.value.push(line);
              filled++;
            }
          });
          hmImpEntryTarget.value = null;
          ioPickVisible.value = false;
          ElMessage.success('已添加 '+filled+' 项');
          return;
        }
        if(ioPickBind.value==='oeItems'){
          const used = new Set((formLineRows.value||[]).map(l=> String(l['检验项名称']||'').trim()).filter(Boolean));
          const add = rows.filter(x=> x['检验项名称'] && !used.has(String(x['检验项名称']).trim())).map(oeItemLine);
          if(!add.length){ ElMessage.warning('所选检验项已在列表中'); return; }
          formLineRows.value = (formLineRows.value||[]).concat(add);
          ioPickVisible.value = false;
          ElMessage.success('已添加 ' + add.length + ' 项');
          return;
        }
        if(ioPickBind.value==='trainLines'){
          formLineRows.value = (formLineRows.value||[]).concat(rows.map(x=> ({ 工号: x['工号'], 姓名: x['姓名'], 部门: x['部门'], 培训结果:'', 附件:'' })));
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='djInsts'){
          formLineRows.value = (formLineRows.value||[]).concat(rows.map(x=> djInstLine({ _instId: x.id })));
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='wjInsts'){
          wjExecLines.value = wjExecLines.value.concat(rows.map(x=> wjLineView(wjNewLine(x))));
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='bxInsts'){
          addBxLines(rows);
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='tyInsts'){
          tyFormLines.value = tyFormLines.value.concat(rows.map(x=> Object.assign({ _instId: x.id }, bxInstSnap(x))));
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='msaInsts'){
          msaInsts.value = msaInsts.value.concat(rows.map(x=> Object.assign({ _instId: x.id }, bxInstSnap(x))));
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='msaStds'){
          if(msaAddStds(rows)) ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='msaItems'){
          msaAddItems(rows);
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='stbInsts'){
          stbInsts.value = stbInsts.value.concat(rows.map(x=> Object.assign({ _instId: x.id }, bxInstSnap(x))));
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='stbStds'){
          if(stbAddStds(rows)) ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='stbItems'){
          stbAddItems(rows);
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='woParts'){
          addWoParts(rows);
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='chgProd'){
          formModel[ioPickField.value] = rows.map(x=> [x['物料编码'], x['物料名称']].filter(Boolean).join(' / ')).join('，');
          ioPickVisible.value = false;
          return;
        }
        if(ioPickBind.value==='spcP'){
          spcPApplyPick(ioPickField.value, rows);
          ioPickVisible.value = false;
          return;
        }
        const text = rows.map(x=> ioPickText(k, x)).join('、');
        if(ioPickBind.value==='srPlan'){ srApplyPick(ioPickField.value, text); ioPickVisible.value = false; return; }
        if(ioPickBind.value==='acPlan'){ acApplyPick(ioPickField.value, text); ioPickVisible.value = false; return; }
        if(ioPickBind.value==='query') query[ioPickField.value] = text;
        else formModel[ioPickField.value] = text;
        ioPickVisible.value = false;
        return;
      }
      const r = ioPickCurrent.value;
      if(!r){ ElMessage.warning('请选择一条数据'); return; }
      if(ioPickBind.value==='abnEvent'){
        formModel['关联单据'] = r['样品编号'] || '';
        formModel['报检单号'] = r['报检单号'] || '';
        formModel['物料名称'] = r['物料名称'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='waitSampScheme'){
        applyWaitSampScheme(r);
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='chromCat'){
        applyChromCatDriftPick(r);
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='splitSample'){ applySplitSamplePick([r]); return; }
      if(ioPickBind.value==='spiMat'){ applySpiMatPick(r); return; }
      if(ioPickBind.value==='oeSample'){
        const prev = formModel['样品编号'];
        const sampleType = String(r['报检类型']||r['报检单类型']||'').trim();
        formModel['样品编号'] = r['样品编号'] || '';
        formModel['报检单号'] = r['报检单号'] || '';
        formModel['报检单类型'] = sampleType;
        ['物料编码','物料名称','物料规格','报检批号'].forEach(k=>{ formModel[k] = r[k] && r[k]!=='—' ? r[k] : ''; });
        formModel['研发项目号'] = oeRdOf(r['报检单号']) || (r['研发项目号'] && r['研发项目号']!=='—' ? r['研发项目号'] : '');
        formModel._schemeName = r['检验方案'] && r['检验方案']!=='—' ? r['检验方案'] : '';
        if(!formModel['报检类型']) formModel['报检类型'] = '内部委托';
        if(prev && prev!==formModel['样品编号']) formLineRows.value = [];
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='qrIssueOrder'){
        formModel['来源单号'] = r['报检单号'] || '';
        if(!formModel['来源单据名称']) formModel['来源单据名称'] = '报检单';
        if(r['客户名称'] && r['客户名称']!=='—'){
          formModel['客户编码'] = r['客户编码'] || '';
          formModel['客户名称'] = r['客户名称'];
        }
        ['物料编码','物料名称','物料规格','物料种类'].forEach(k=>{ if(r[k] && r[k]!=='—') formModel[k] = r[k]; });
        if(formModel['物料编码'] || formModel['物料名称']){
          formModel['物料信息'] = [formModel['物料编码'], formModel['物料名称'], formModel['物料规格']].filter(Boolean).join(' / ');
        }
        onFormSelectChange({ name:'来源单号' });
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='srPlan'){ srApplyPick(ioPickField.value, ioPickText(k, r)); ioPickVisible.value = false; return; }
      if(ioPickBind.value==='acPlan'){ acApplyPick(ioPickField.value, ioPickText(k, r)); ioPickVisible.value = false; return; }
      if(ioPickBind.value==='biasStd'){
        biasForm['基准件名称'] = r['标准物质名称'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='hmArchCust'){
        const row = hmArchCustRow.value;
        if(row){
          row['客户编码'] = r['客户编码'] || '';
          row['客户名称'] = r['客户名称'] || '';
          row['客户信息'] = [r['客户编码'], r['客户名称']].filter(Boolean).join(' / ');
        }
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='hmArchItem'){
        const row = hmArchItemRow.value;
        const name = String(r['检验项名称'] || '').trim();
        if(row && name && (formLineRows.value||[]).some(l=> l!==row && String(l['中文名称']||'').trim()===name)){
          ElMessage.warning('该检验项已在列表中');
          return;
        }
        if(row) Object.assign(row, hmArchLineFromItem(r, row['限制值'] || ''));
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='hmArchStd'){
        hmApplyFactoryLines(r);
        return;
      }
      if(ioPickBind.value==='wxInst'){
        formModel._instId = r.id;
        WX_INST_KEYS.forEach(k=> { formModel[k] = r[k] || ''; });
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='slocDispSupplier'){
        slocDispForm.供应商名称 = r['供应商名称'] || '';
        slocDispForm.供应商编码 = r['供应商编码'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='labArch'){
        labArchForm['留样库位'] = r['库位名称'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='seSrc'){
        Object.assign(formModel, {
          来源单号: r['处置单号'] || '',
          事件日期: String(r['处置时间'] || '').slice(0, 10),
          事件描述: r['问题描述'] || '',
          供应商编码: r['供应商编码'] || '',
          供应商名称: r['供应商名称'] || '',
          问题大类: r['问题大类'] || '',
          问题小类: r['问题小类'] || '',
          批号: r['报检批号'] || '',
        });
        ['物料编码','物料名称','物料规格','物料种类'].forEach(key=>{ formModel[key] = r[key] || ''; });
        formModel['物料信息'] = [r['物料编码'], r['物料名称'], r['物料规格']].filter(Boolean).join(' / ');
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='mrbSrc'){
        formModel['来源处置单号'] = r['处置单号'] || '';
        if(qcEmpty(formModel['问题描述'])) formModel['问题描述'] = flowHas(r['异常描述']) ? r['异常描述'] : '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='capaSrc'){
        const meta = ioPickMeta.value;
        formModel['来源单号'] = r[meta.codeField] || '';
        const code = r['物料编码'] || String(r['物料信息']||'').split(' / ')[0];
        const mat = code ? ((((MOCK['mat-list']||{}).main)||[]).find(m=> m['物料编码']===code) || {}) : {};
        ['物料编码','物料名称','物料规格','物料种类'].forEach(k=>{ formModel[k] = r[k] || mat[k] || ''; });
        formModel['物料信息'] = [formModel['物料编码'], formModel['物料名称'], formModel['物料规格']].filter(Boolean).join(' / ');
        formModel['批号'] = r['报检批号'] || r['批号'] || '';
        if(r['客户名称'] && r['客户名称']!=='—'){
          formModel['客户编码'] = r['客户编码'] || '';
          formModel['客户名称'] = r['客户名称'];
          formModel['客户信息'] = [r['客户编码'], r['客户名称']].filter(Boolean).join(' / ');
        }
        ['问题大类','问题小类','问题描述'].forEach(k=>{ if(flowHas(r[k])) formModel[k] = r[k]; });
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='srEvent'){
        ['供应商编码','供应商名称','事件日期','问题大类','问题小类','物料信息','物料编码','物料名称','物料规格','物料种类','批号'].forEach(key=>{ formModel[key] = r[key] || ''; });
        formModel['来源单号'] = r['事件单号'] || '';
        formModel['问题描述'] = r['问题描述'] || r['事件描述'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='wjLineSupplier'){
        if(wjLinePickRow.value) wjLinePickRow.value['本次外校单位'] = r['供应商名称'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='respSupplier'){
        formModel[ioPickField.value] = r['供应商名称'] || '';
        formModel[ioPickField.value + '编码'] = r['供应商编码'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='batchOutMat' || ioPickBind.value==='batchSrcMat'){
        const code = r['物料编码'] || '';
        const name = r['物料名称'] || '';
        const spec = r['物料规格'] || '';
        const kind = r['物料种类'] || '';
        const text = [code, name].filter(Boolean).join(' / ');
        if(ioPickBind.value==='batchOutMat'){
          formModel['产出物料'] = text;
          formModel['产出物料编码'] = code;
          formModel['产出物料名称'] = name;
          formModel['产出物料规格'] = spec;
          formModel['产出物料种类'] = kind;
        } else if(batchPickLine){
          batchPickLine['来源物料'] = text;
          batchPickLine['来源物料编码'] = code;
          batchPickLine['来源物料名称'] = name;
          batchPickLine['来源物料规格'] = spec;
          batchPickLine['来源物料种类'] = kind;
        }
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='retainMat'){
        formModel['留样编码'] = r['物料编码'] || '';
        formModel['留样名称'] = r['物料名称'] || '';
        formModel['留样规格'] = r['物料规格'] || '';
        formModel['留样种类'] = r['物料种类'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='methodMatSupp'){
        const row = methodMatSuppRow.value;
        if(row){
          row['供应商编码'] = r['供应商编码'] || '';
          row['供应商名称'] = r['供应商名称'] || '';
        }
        methodMatSuppRow.value = null;
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='methodMatCatMat'){
        const row = methodMatCatMatRow.value;
        if(row){
          row['物料编码'] = r['物料编码'] || r['编码'] || '';
          row['物料名称'] = r['物料名称'] || r['名称'] || '';
          row['物料规格'] = r['物料规格'] || '';
          row['物料种类'] = r['物料种类'] || '';
        }
        methodMatCatMatRow.value = null;
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='cassMat'){
        const row = cassMatRow.value;
        if(row){
          row['物料编码'] = r['物料编码'] || r['编码'] || '';
          row['物料名称'] = r['物料名称'] || r['名称'] || '';
        }
        cassMatRow.value = null;
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='methodMatCatCat'){
        const row = methodMatCatCatRow.value;
        if(row){
          row['检验类编码'] = r['检验类编码'] || '';
          row['检验类名称'] = r['检验类名称'] || '';
          row['检验类属性'] = r['检验类属性'] || '';
        }
        methodMatCatCatRow.value = null;
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='urPartner'){
        const typ = formModel['往来单位类型'];
        if(typ==='客户'){
          formModel['往来单位名称'] = r['客户名称'] || '';
          formModel['客户编码'] = r['客户编码'] || '';
          formModel['客户名称'] = r['客户名称'] || '';
          formModel['供应商编码'] = '—';
          formModel['供应商名称'] = '—';
        } else {
          formModel['往来单位名称'] = r['供应商名称'] || '';
          formModel['供应商编码'] = r['供应商编码'] || '';
          formModel['供应商名称'] = r['供应商名称'] || '';
          formModel['客户编码'] = '—';
          formModel['客户名称'] = '—';
        }
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='ctOqc'){
        formModel['关联单据'] = r['单据号'] || '';
        if(r['客户名称'] && r['客户名称']!=='—'){
          formModel['客户编码'] = r['客户编码'] || '';
          formModel['客户名称'] = r['客户名称'];
          formModel['客户信息'] = [r['客户编码'], r['客户名称']].filter(Boolean).join(' / ');
        }
        ['物料编码','物料名称','物料规格','物料种类'].forEach(key=>{ if(r[key] && r[key]!=='—') formModel[key] = r[key]; });
        formModel['物料信息'] = [formModel['物料编码'], formModel['物料名称'], formModel['物料规格']].filter(Boolean).join(' / ');
        if(r['批号'] && r['批号']!=='—') formModel['批号'] = r['批号'];
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='spcP'){
        spcPApplySingle(ioPickField.value, ioPickKind.value, r);
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='wsPick'){
        wsPick.person = r['姓名'] || '';
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='query'){
        query[ioPickField.value] = ioPickText(k, r);
        ioPickVisible.value = false;
        return;
      }
      if(ioPickBind.value==='inspRpt'){
        inspApplyMulti(ioPickField.value, [r]);
        ioPickVisible.value = false;
        return;
      }
      if(k==='solution'){
        fillLabPrepSolution(r);
      } else if(k==='calibArch'){
        fillLabCalibArch(r);
      } else if(k==='customer'){
        const custText = [r['客户编码'], r['客户名称']].filter(Boolean).join(' / ');
        if(ioPickField.value==='来源组织'){
          formModel['来源组织'] = custText;
          formModel['来源组织编码'] = r['客户编码'] || '';
          formModel['来源组织名称'] = r['客户名称'] || '';
        } else {
          formModel['客户信息'] = custText;
          formModel['客户编码'] = r['客户编码'] || '';
          formModel['客户名称'] = r['客户名称'] || '';
        }
      } else if(k==='supplier'){
        formModel['供应商信息'] = [r['供应商编码'], r['供应商名称']].filter(Boolean).join(' / ');
        formModel['供应商编码'] = r['供应商编码'] || '';
        formModel['供应商名称'] = r['供应商名称'] || '';
      } else if(k==='mat'){
        const code = r['物料编码'] || '';
        formModel['物料信息'] = [code, r['物料名称'], r['物料规格']].filter(Boolean).join(' / ');
        ['物料编码','物料名称','物料规格','物料种类'].forEach(key=>{ formModel[key] = r[key] || ''; });
        const names = (activeFormFields.value||[]).map(f=> f.name);
        if(names.includes('基本单位')) formModel['基本单位'] = r['基本单位'] || '';
        if(names.includes('销售单位')) formModel['销售单位'] = r['销售单位'] || r['基本单位'] || '';
        if(names.includes('抽样方案名称')){
          const tab = (tabView.value||{}).label || currentTabLabel.value;
          const schemes = (((window.WMS_MOCK_ROWS || MOCK)['samp-scheme']||{}).main||[])
            .filter(s=> (s['启用状态']||'启用')==='启用' && (s._mats||[]).some(m=> m['物料编码']===code));
          const s = schemes.find(x=> String(x['适用报检单']||'').includes(tab)) || schemes[0];
          formModel['抽样方案名称'] = s ? (s['抽样方案名称']||'') : '';
          formModel['抽样类型'] = s ? (s['抽样类型']||'') : '';
        }
      } else if(k==='order'){
        formModel['报检单号'] = r['报检单号'] || '';
        const smpKey = { 物料编码:'样品编号', 物料名称:'样品名称', 物料规格:'样品规格' };
        ADD_SAMPLE_CARRY.forEach(key=>{ formModel[key] = r[key] || r[smpKey[key]] || '—'; });
        if(pageId.value==='np-0201-01'){
          formModel['基本单位'] = r['基本单位'] || '';
          ['物料编码','物料名称','物料规格','物料种类'].forEach(k=>{ formModel[k] = r[k] || ''; });
          urFillPartnerFromOrder();
        } else if(pageId.value==='np-0201-02'){
          formModel['样品编号'] = '';
          formModel._schemeName = '';
          formLineRows.value = [];
        } else {
          formModel['原应取样件数'] = r['应取样件数'] || '0';
          syncAddSampleCount();
        }
      } else if(k==='line'){
        formModel['产线名称'] = r['产线名称'] || '';
        formModel['车间名称'] = r['所属车间'] || '';
      } else if(k==='sampleCustomer' || k==='sampleSupplier'){
        formModel['来样单位'] = r[ioPickMeta.value.nameField] || '';
      } else if(k==='gatherScheme'){
        formModel['采集方案'] = r['采集方案名称'] || '';
        formModel['采集方案编码'] = r['采集方案编码'] || '';
      } else {
        formModel['采样点'] = r['采样点名称'] || '';
      }
      ioPickVisible.value = false;
    }
