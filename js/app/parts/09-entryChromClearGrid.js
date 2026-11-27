    function entryChromClearGrid(){
      entryChromDraft.value = entryChromBlankDraft();
      ElMessage.info('已清空全部参数值');
    }
    function setEntryChromChecked(name, v){
      entryChromChecked.value = Object.assign({}, entryChromChecked.value, { [name]: !!v });
    }
    const entryChromAllChecked = computed(()=>{
      const names = entryChromParamNames.value;
      return names.length > 0 && names.every(n=> entryChromChecked.value[n] !== false);
    });
    const entryChromIndeterminate = computed(()=>{
      const names = entryChromParamNames.value;
      const on = names.filter(n=> entryChromChecked.value[n] !== false).length;
      return on > 0 && on < names.length;
    });
    function toggleEntryChromAll(v){
      const next = {};
      entryChromParamNames.value.forEach(n=> { next[n] = !!v; });
      entryChromChecked.value = next;
    }
    function confirmEntryChromPick(){
      const sel = entryChromSelected.value;
      if(!sel){ ElMessage.warning('请先选择台账记录'); return; }
      const draft = entryChromDraft.value || {};
      const hasVal = entryChromParamNames.value.some(n=> (draft[n] || []).some(v=> String(v || '').trim() !== ''));
      if(!hasVal){ ElMessage.warning('请先「自动读取实测值」，或点表头各「第N次」下的「填充」按次下发后再提交'); return; }
      const nameToParam = {};
      (entrySampParams.value || []).forEach(p=>{ nameToParam[p.名称] = p; nameToParam[p.代号] = p; });
      let filled = 0;
      (entryCatRows.value || []).forEach(row=>{
        entryChromParamNames.value.forEach(name=>{
          if(entryChromChecked.value[name] === false) return;
          const p = nameToParam[name];
          const code = p ? p.代号 : name;
          (draft[name] || []).forEach((v, i)=>{
            if(String(v || '').trim()){ entrySetCell(row, code, i, v); filled++; }
          });
        });
      });
      entryChromVisible.value = false;
      const label = sel.kind + ' 台账 · 批号 ' + String(sel.row['批号'] || '—');
      ElMessage.success(filled ? ('已从 ' + label + ' 回填 ' + filled + ' 个测定值') : ('已提交（' + label + '），无可回填参数'));
    }
    function cancelEntryChromPick(){
      entryChromVisible.value = false;
      ElMessage.info('已取消图谱识别取数，未回填任何内容');
    }
    function entryResultText(row){ const v = String((row && row['实测值'])||'').trim(); return v || '/'; }
    function entryCatSubmitted(cat){ return (entryDone.value||[]).includes(cat); }
    function entryFocusItem(row){
      const el = document.getElementById('entry-item-'+row._i);
      if(el && el.scrollIntoView) el.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }
    function entryMethodRow(){
      const name = formModel['检验方法'];
      return (((MOCK['insp-method']||{})['tab-method'])||[]).find(r=> r['检验方法名称']===name) || null;
    }
    const entryVerSnap = ref(null);
    function entryMethodVersionRows(){
      const m = entryMethodRow();
      if(!m) return [];
      const cur = JSON.parse(JSON.stringify(m));
      delete cur._versions;
      const hist = (Array.isArray(m._versions) ? m._versions : []).map(v=> JSON.parse(JSON.stringify(v)));
      const seen = new Set();
      return [cur, ...hist].filter(v=>{
        const no = String(v['版本号']||'').trim();
        if(!no || seen.has(no)) return false;
        seen.add(no);
        return true;
      });
    }
    const entryMethodVerOptions = computed(()=> entryMethodVersionRows().map(v=> v['版本号']));
    function entryApplyVersion(no, keepEntry){
      const ver = entryMethodVersionRows().find(v=> v['版本号']===no) || null;
      entryVerSnap.value = ver;
      formModel['版本号'] = ver ? (ver['版本号']||'') : '';
      if(keepEntry) return;
      formModel['作业说明'] = ver ? (ver['作业说明']||'') : '';
      entryMats.value = ver ? entryCloneMats(ver._mats) : [];
      formModel['公共测试次数'] = ver ? (ver['公用测试次数']||'') : '';
      const n = ver ? Number(ver['样本测试次数']) : 0;
      formModel['样本测试次数'] = n>0 ? n : undefined;
      entryDescOpen.value = false;
    }
    function entryOnVersion(no){
      const known = entryMethodVersionRows().some(v=> v['版本号']===no);
      if(known){ entryApplyVersion(no, false); entryPubCells.value = {}; return; }
      formModel['版本号'] = no || '';
    }
    const entryMethodDetail = computed(()=>{
      const m = entryVerSnap.value;
      if(!m) return null;
      return {
        版本号: m['版本号']||'',
        方法阶段: m['方法阶段']||'',
        作业说明: m['作业说明']||'',
        作业附件: m['作业附件']||'',
        公用参数: m['公用参数']||''
      };
    });
    watch(()=> formModel['检验方法'], ()=>{
      if(!['entry','quick-entry'].includes(formMode.value) || entryCatApplying) return;
      entryMethodTab.value = '项目';
      entryMatSelected.value = [];
      entryMatScan.value = '';
      entryDescOpen.value = false;
      entryPubCells.value = {};
      entryQuickExpandAll.value = true;
      const vers = entryMethodVersionRows();
      entryApplyVersion(vers[0] ? vers[0]['版本号'] : '', false);
    });
    const entryQuickExpandAll = ref(true);
    const entryQuickFilledCount = computed(()=> (entryCatRows.value||[]).filter(r=> String(r['实测值']||'').trim() || r['结论']).length);
    function entryMethodParamList(m, kind){
      if(!m) return [];
      const stored = kind==='pub'
        ? (Array.isArray(m._publicParams) && m._publicParams.length ? m._publicParams : (Array.isArray(m._pubParams) ? m._pubParams : []))
        : (Array.isArray(m._sampleParams) && m._sampleParams.length ? m._sampleParams : (Array.isArray(m._sampParams) ? m._sampParams : []));
      if(stored.length){
        return stored.map(p=>({ 代号: p['参数代号'] || p['参数名称'], 名称: p['参数名称'] || '', 公式: (p['计算公式'] && String(p['计算公式']).trim()) ? p['计算公式'] : '—' }));
      }
      const names = String(m[kind==='pub' ? '公用参数' : '样本参数']||'').split(/[,，、]/).map(s=> s.trim()).filter(s=> s && s!=='—');
      const params = (((MOCK['insp-method']||{})['tab-param'])||[]);
      return names.map(n=>{
        const p = params.find(x=> x['参数名称']===n) || {};
        return { 代号: p['参数代号'] || n, 名称: n, 公式: '—' };
      });
    }
    const entryPubParams = computed(()=> entryMethodParamList(entryVerSnap.value, 'pub'));
    const entrySampParams = computed(()=> entryMethodParamList(entryVerSnap.value, 'samp'));
    const entrySampCols = computed(()=>{
      const n = parseInt(formModel['样本测试次数'], 10);
      return n > 0 && n <= 20 ? n : 0;
    });
    const entryPubCols = computed(()=>{
      if(!entryPubParams.value.length) return 0;
      const t = String(formModel['公共测试次数']||'').trim();
      if(t==='同样本次数' || t==='同测试次数') return entrySampCols.value || 0;
      if(t==='1次' || t==='1') return 1;
      return 0;
    });
    const entryPubCells = ref({});
    function entryPubCell(code, i){
      const arr = entryPubCells.value && entryPubCells.value[code];
      return arr && arr[i] != null ? arr[i] : '';
    }
    function entrySetPubCell(code, i, v){
      const bag = entryPubCells.value || (entryPubCells.value = {});
      if(!Array.isArray(bag[code])) bag[code] = [];
      while(bag[code].length <= i) bag[code].push('');
      bag[code][i] = v;
      entryPubCells.value = { ...bag };
    }
    function entryCell(row, code, i){
      const arr = row && row._cells && row._cells[code];
      return arr && arr[i] != null ? arr[i] : '';
    }
    function entrySetCell(row, code, i, v){
      if(!row._cells) row._cells = {};
      if(!Array.isArray(row._cells[code])) row._cells[code] = [];
      while(row._cells[code].length <= i) row._cells[code].push('');
      row._cells[code][i] = v;
    }
    function entryLimitText(row){
      if(!row || (row['检验项类型']||'')==='定性') return '';
      const name = formModel['检验方案'];
      let hit = null;
      const bag = MOCK['insp-scheme'] || {};
      Object.keys(bag).some(tab=>{
        const sch = (bag[tab]||[]).find(r=> r['检验方案名称']===name);
        if(!sch || !Array.isArray(sch._quantItems)) return false;
        hit = sch._quantItems.find(x=> x['检验项名称']===row['检验项']) || null;
        return !!hit;
      });
      const parts = [];
      ['USL','LSL','UCL','CL','UWL','LWL','LCL'].forEach(k=>{
        const cell = hit && hit[k];
        if(cell==null || cell==='') return;
        const val = typeof cell === 'object' ? String((cell.op||'') + (cell.val||'')) : String(cell);
        if(val.replace(/[≤≥<>=]/g, '').trim()) parts.push(k + ':' + val);
      });
      if(!parts.length){
        const dl = inspItemOf(row['检验项'])['检出限D.L'];
        if(dl) parts.push('D.L:' + dl);
      }
      return parts.join(';');
    }
    /** 数据录入弹窗：检验项取样品方案项目 + 临时项目（按类型只取该检验类的检验项），按所属检验类分组，带出已录入的结果 */
    function flowFillEntry(row, s){
      s = s || flowSplitRow((row||{})['样品编号']);
      if(!s && row && pageId.value==='ledger'){
        // 台账修改数据：无拆分行时用台账行作为样品源，仍可二次编辑
        s = {
          样品编号: row['样品编号'],
          方案项目: row['方案项目'],
          临时项目: row['临时项目'],
          样品来源: row['样品来源'],
          物料名称: row['物料名称'],
          物料规格: row['物料规格'],
          采样点: row['采样点'],
          报检批号: row['报检批号'],
          取样时间: row['取样时间'],
          报检单号: row['报检单号'],
          检验方案: row['检验方案'],
          _entry: row._entry || null,
          _virtual: true
        };
      }
      if(!s) return;
      const saved = ((s._entry||{}).items) || ((row && row._entry && row._entry.items) || {});
      // 台账行方案/临时项目优先，避免拆分行字段为空导致检验项为空
      const fromLedger = row && flowSampleItems(row);
      const items = row && row._items ? splitDun(row._items) : (fromLedger.length ? fromLedger : flowSampleItems(s));
      formLineRows.value = items.map((name, idx)=>{
        const meta = inspItemOf(name);
        const prev = saved[name] || {};
        return Object.assign(
          { 实测值:'', 结论:'', 偏差结论:'', 指标:'', 特殊公式:'', 备注:'', _cells:{} },
          prev,
          { _i: idx+1, 检验项: name, 检验项类型: prev['检验项类型'] || meta['检验项类型'] || '定量', 所属检验类: meta['所属检验类'] || prev['所属检验类'] || '未分类', 检验项单位: meta['检验项单位'] || prev['检验项单位'] || '', _cells: prev.样本值 && typeof prev.样本值==='object' ? JSON.parse(JSON.stringify(prev.样本值)) : {} }
        );
      });
      const firstCat = (formLineRows.value[0] && formLineRows.value[0]['所属检验类']) || '';
      entryCat.value = firstCat;
      entryStamp.value = nowStamp();
      entryDone.value = (((s._entry||{}).done) || []).slice();
      const e = s._entry || {};
      const savedCats = e.byCat && typeof e.byCat==='object' ? JSON.parse(JSON.stringify(e.byCat)) : {};
      if(firstCat && !savedCats[firstCat] && e.method){
        savedCats[firstCat] = { method: e.method, pubTimes: e.pubTimes||'', sampTimes: e.sampTimes||'', desc: e.desc||'', mats: Array.isArray(e.mats) ? e.mats : [] };
      }
      entryCatState.value = savedCats;
      entryApplyCatState(firstCat);
      ['样品来源','物料名称','物料规格','采样点','报检批号','取样时间','报检单号','检验方案'].forEach(k=>{
        if(!flowHas(formModel[k]) && flowHas(s[k])) formModel[k] = s[k];
      });
    }
    function flowSaveEntry(stay){
      const isLedgerModify = pageId.value==='ledger' && !!formModel._fromLedgerModify;
      let s = flowSplitRow(formModel['样品编号']);
      if(!s && isLedgerModify) s = flowLedgerRow(formModel['样品编号']);
      const lines = formLineRows.value || [];
      const filled = r=> String(r['实测值']||'').trim() || r['结论'];
      if(!s){ ElMessage.warning('未找到样品'); return; }
      const cat = entryCat.value;
      const catRows = lines.filter(r=> (r['所属检验类']||'未分类')===cat);
      if(stay){
        if(!lines.some(filled)){ ElMessage.warning('请至少录入一个检验项的检验结果或检验结论'); return; }
      }else if(!catRows.some(filled)){
        ElMessage.warning('请至少录入一个检验项的检验结果或检验结论'); return;
      }
      const e = (s._entry = s._entry || {});
      e.items = e.items || {};
      e.done = e.done || [];
      entryStoreCat(cat);
      e.byCat = JSON.parse(JSON.stringify(entryCatState.value || {}));
      const cur = e.byCat[cat] || {};
      e.method = cur.method || '';
      e.pubTimes = cur.pubTimes || '';
      e.sampTimes = cur.sampTimes || '';
      e.desc = cur.desc || '';
      e.mats = entryCloneMats(cur.mats);
      lines.forEach(r=>{
        e.items[r['检验项']] = { 实测值: r['实测值']||'', 结论: r['结论']||'', 偏差结论: r['偏差结论']||'', 指标: r['指标']||'', 特殊公式: r['特殊公式']||'', 备注: r['备注']||'', 检验项类型: r['检验项类型']||'', 所属检验类: r['所属检验类']||'', 检验项单位: r['检验项单位']||'', 样本值: r._cells || {} };
      });
      if(!stay && cat && !e.done.includes(cat)){ e.done.push(cat); ylUseMark(s, cat, nowStamp()); }
      entryDone.value = e.done.slice();
      flowStartSample(s);
      if(isLedgerModify){
        const lg = flowLedgerRow(formModel['样品编号']);
        if(lg && lg !== s) lg._entry = JSON.parse(JSON.stringify(e));
        appendLedgerChangeLog(formModel['样品编号']);
      }
      flowSyncAll();
      bumpStore();
      entryStamp.value = nowStamp();
      if(stay){
        ElMessage.success(isLedgerModify
          ? ('已保存修改，并写入变更记录 · '+s['样品编号'])
          : ('检验数据已保存，样品 '+s['样品编号']+' 检验中'));
        return;
      }
      const allDone = entryCats.value.length && entryCats.value.every(c=> e.done.includes(c));
      if(!allDone){
        const next = entryCats.value.find(c=> !e.done.includes(c));
        if(next){ entryCat.value = next; entryApplyCatState(next); }
        ElMessage.success(isLedgerModify ? ('已提交「'+cat+'」，并写入变更记录') : ('已提交「'+cat+'」'));
        return;
      }
      formVisible.value = false;
      ElMessage.success(isLedgerModify
        ? ('修改数据已提交，并写入变更记录 · '+s['样品编号'])
        : ('检验数据已提交，样品 '+s['样品编号']+' 检验中'));
    }
    /** 数据录入-按样品 · 结束录入：样品检验完成 */
    function flowEndEntry(rows){
      if(!(rows||[]).length){ ElMessage.warning('请先勾选数据'); return; }
      const list = rows.map(r=> flowSplitRow(r['样品编号'])).filter(Boolean);
      const empty = list.filter(s=> !flowHasData(s, flowSampleItems(s)));
      if(empty.length){ ElMessage.warning('样品 '+empty.map(s=> s['样品编号']).join('、')+' 未录入检验数据，不能结束录入'); return; }
      ElementPlus.ElMessageBox.confirm('确认结束录入所选 '+list.length+' 个样品？结束后样品（含子样）检验完成，不再出现在任务分派和数据录入中。', '结束录入', { type: 'warning' }).then(()=>{
        const stamp = nowStamp();
        list.forEach(s=> flowFinishSample(s, stamp));
        flowSyncAll();
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已结束录入 '+list.length+' 个样品');
      }).catch(()=>{});
    }
    /** 数据录入-按类型 · 直接提交：提交该检验类；样品全部检验类都提交后检验完成 */
    function flowSubmitCat(row){
      const s = flowSplitRow(row['样品编号']);
      if(!s) return;
      const cat = row['检验类名称'];
      if(!flowHasData(s, splitDun(row._items))){ ElMessage.warning('「'+cat+'」未录入检验数据，不能提交'); return; }
      ElementPlus.ElMessageBox.confirm('确认提交样品 '+s['样品编号']+' 的「'+cat+'」检验数据？提交后该检验类不再出现在按类型录入列表。', '直接提交', { type: 'warning' }).then(()=>{
        const e = (s._entry = s._entry || {});
        e.done = e.done || [];
        if(!e.done.includes(cat)){ e.done.push(cat); ylUseMark(s, cat, nowStamp()); }
        flowStartSample(s);
        const all = ((flowAsgOf(s)||{}).lines || []).every(l=> e.done.includes(l['检验类']));
        if(all) flowFinishSample(s, nowStamp());
        flowSyncAll();
        bumpStore();
        ElMessage.success(all ? '已提交，样品 '+s['样品编号']+' 全部检验类已提交，检验完成' : '已提交「'+cat+'」检验数据');
      }).catch(()=>{});
    }
    function taskLog(o, ln, type, from, to, extra){
      const x = extra || {};
      taskTab('tab-2').unshift({
        id: 'tl-'+Date.now()+'-'+Math.random().toString(36).slice(2, 7), 操作类型: type,
        样品编号: o['样品编号'], 报检单号: o['报检单号'], 物料名称: o['物料名称'], 报检批号: o['报检批号'],
        检验类: ln ? ln['检验类'] : '—', 原班组: from || '—', 新班组: to || '—', 命中方案: (ln && ln['命中方案']) || '—',
        说明: x.说明 || '—', 操作人: x.操作人 || '管理员', 操作时间: x.stamp || nowStamp()
      });
    }
    function taskSrcRows(rows){
      const src = taskTab('tab-1');
      return (rows||[]).map(r=> src.find(x=> x.id===r.id) || r);
    }
    function taskAutoAssign(rows){
      if(!(rows||[]).length){ ElMessage.warning('请先勾选样品'); return; }
      rows = taskPickAssignable(rows);
      if(!rows.length) return;
      const stamp = nowStamp();
      let ok = 0, multi = 0, noTeam = 0;
      taskSrcRows(rows).forEach(o=>{
        let touched = false;
        (o._lines||[]).forEach(ln=>{
          taskRefreshLine(o, ln);
          if(ln['行状态']!=='待分配') return;
          const items = taskSplitItemNames(ln);
          if(items.length && items.every(nm=> taskLineItemStatus(o, ln['检验类'], nm)==='已完成')) return;
          const cands = splitDun(ln['候选班组']);
          if(!cands.length){ noTeam++; return; }
          if(cands.length > 1){ multi++; return; }
          Object.assign(ln, { 分配班组: cands[0], 分配方式: '自动', 行状态: '已分配', 分配人: '系统', 分配时间: stamp });
          taskLog(o, ln, '自动分配', '', cands[0], { 操作人: '系统', stamp, 说明: '命中派单方案 '+ln['命中方案'] });
          ok++; touched = true;
        });
        taskRecalc(o);
        if(touched){ Object.assign(o, { 最近分配人: '系统', 最近分配时间: stamp }); taskWriteBack(o); }
      });
      selectedIds.value = [];
      bumpStore();
      const tail = [multi ? multi+' 个检验类有多个候选班组' : '', noTeam ? noTeam+' 个检验类的派单班组均已禁用' : ''].filter(Boolean).join('，');
      if(ok) ElMessage.success('已自动分配 '+ok+' 个检验类' + (tail ? '；'+tail+'，需手动分配' : ''));
      else ElMessage.warning(tail ? '没有可自动分配的检验类：'+tail+'，请手动分配' : '所选样品没有待分配的检验类');
    }
    function taskAsgList(v){
      return splitDun(v).filter(s=> s && s!=='—');
    }
    function taskAsgJoin(v){ return taskAsgList(v).join('、'); }
    function taskAsgKey(v){ return taskAsgList(v).slice().sort().join('、'); }
    const taskAsgInstRow = ref(null);
    function applyTaskInstPick(rows){
      const row = taskAsgInstRow.value;
      ioPickVisible.value = false;
      if(!row) return;
      const names = [];
      (rows||[]).forEach(r=>{
        const n = String(r['仪器名称']||'').trim();
        if(n && !names.includes(n)) names.push(n);
      });
      row['适用仪器'] = names;
      taskAsgInstChange(row);
    }
    function openTaskInstPick(row){
      if(!row || row._itemLocked) return;
      taskAsgInstRow.value = row;
      openIoPick('inst', 'taskInsts', '仪器名称', false);
    }
    function clearTaskInst(row){
      if(!row || row._itemLocked) return;
      row['适用仪器'] = [];
      taskAsgInstChange(row);
    }
    const taskAsgVisible = ref(false);
    const taskAsgTitle = ref('');
    const taskAsgRows = ref([]);
    const taskAsgOrders = ref([]);
    const taskAsgForm = reactive({ 批量检验类:[], 批量班组:'', 调整原因:'' });
    const taskAsgCatOpts = computed(()=> [...new Set(taskAsgRows.value.map(r=> r['检验类']))]);
    const taskAsgBatchTeams = computed(()=>{
      const cats = taskAsgForm.批量检验类;
      return [...new Set(taskAsgRows.value.filter(r=> cats.includes(r['检验类'])).flatMap(r=> r._opts))];
    });
    const taskAsgHasAdjust = computed(()=> taskAsgRows.value.some(r=> !r._itemLocked && taskAsgList(r['原班组']).length && taskAsgKey(r['分配班组'])!==taskAsgKey(r['原班组'])));
    const taskAsgHeadCols = computed(()=>{
      const tv = ((((CFG.pages||{})[TASK_PAGE])||{}).tabViews||[]).find(t=> t.name==='tab-1') || {};
      return (tv.columns||[]).filter(c=> c.field && c.field!=='_actions' && c.field!=='操作');
    });
    const taskAsgHeadRows = computed(()=> taskAsgOrders.value.map(o=>{
      const row = {};
      taskAsgHeadCols.value.forEach(c=>{
        const v = o[c.field];
        row[c.field] = (v==null || v==='') ? '—' : v;
      });
      return row;
    }));
    function taskAsgTeamChange(row){
      const v = taskAsgList(row['分配班组']);
      taskAsgRows.value.filter(r=> r._oid===row._oid && r._idx===row._idx && r!==row).forEach(r=>{ r['分配班组'] = v[0] || ''; });
    }
    function taskAsgInstChange(row){
      const v = taskAsgList(row['适用仪器']);
      taskAsgRows.value.filter(r=> r._oid===row._oid && r._idx===row._idx && r!==row).forEach(r=>{ r['适用仪器'] = v.slice(); });
    }
    function openTaskAssign(rows, title){
      if(!(rows||[]).length){ ElMessage.warning('请先勾选样品'); return; }
      rows = taskPickAssignable(rows);
      if(!rows.length) return;
      const orders = taskSrcRows(rows);
      const list = [];
      orders.forEach(o=>{
        (o._lines||[]).forEach((ln, idx)=>{
          taskRefreshLine(o, ln);
          if(ln['行状态']==='无需分配') return;
          const { cands } = taskLineCands(o, ln);
          const own = splitDun(ln['候选班组']);
          const opts = [...new Set([...own, ...cands, ...teamNames()])];
          if(ln['分配班组'] && !opts.includes(ln['分配班组'])) opts.unshift(ln['分配班组']);
          const instOpts = taskLineInstOpts(o, ln);
          const insts = taskAsgList(ln['适用仪器']);
          insts.forEach(n=>{ if(!instOpts.includes(n)) instOpts.unshift(n); });
          const teams = taskAsgList(ln['分配班组']);
          const items = taskSplitItemNames(ln);
          (items.length ? items : ['—']).forEach(itemName=>{
            const st = itemName==='—' ? '未完成' : taskLineItemStatus(o, ln['检验类'], itemName);
            list.push({
              _oid: o.id, _idx: idx, _opts: opts, _cands: own, _instOpts: instOpts, _itemLocked: st==='已完成',
              样品编号: o['样品编号'], 物料名称: o['物料名称'], 检验类: ln['检验类'], 仪器类型: ln['仪器类型'],
              检验项: itemName, 检验状态: st, 命中方案: ln['命中方案'], 候选班组: ln['候选班组'],
              原班组: teams.join('、'), 分配班组: teams[0] || '',
              原仪器: insts.join('、'), 适用仪器: insts.slice()
            });
          });
        });
      });
      if(!list.length){ ElMessage.warning('所选样品的检验类均无需分配班组'); return; }
      taskAsgOrders.value = orders;
      taskAsgRows.value = list;
      Object.assign(taskAsgForm, { 批量检验类:[], 批量班组:'', 调整原因:'' });
      taskAsgTitle.value = title || '分配班组';
      taskAsgVisible.value = true;
    }
