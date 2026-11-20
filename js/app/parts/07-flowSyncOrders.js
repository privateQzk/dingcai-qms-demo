    function flowSyncOrders(){
      FLOW_TABS.forEach(({ name })=> flowBag(FLOW_ORDER, name).forEach(o=>{
        const ss = sampSplitList().filter(s=> s['报检单号']===o['报检单号']);
        if(!o._flow && !ss.length) return;
        const got = flowInt(o['已取样件数']);
        o['待取样件数'] = String(o._sampEnd ? 0 : Math.max(0, flowInt(o['应取样件数']) - got));
        o['检验完成件数'] = String(ss.filter(s=> s['样品来源']!=='样品拆分' && s['样品状态']==='已完成').length);
        if(['已关闭','待复核','待审批','已通过','已驳回'].indexOf(o['单据状态'])>=0) return;
        const allDone = ss.every(s=> s['样品状态']==='已完成');
        o['单据状态'] = flowInt(o['待取样件数'])===0 && allDone ? '已完成' : (got > 0 ? '执行中' : '待执行');
      }));
    }
    /** 待取样任务 = 待执行 / 执行中且待取样件数 > 0 的报检单 */
    function flowSyncWaitSamp(){
      FLOW_TABS.forEach(({ name })=>{
        const bag = flowBag(FLOW_WAIT, name);
        const old = new Map(bag.map(r=> [r['报检单号'], r]));
        const cols = flowCols(FLOW_WAIT, name);
        const list = flowBag(FLOW_ORDER, name)
          .filter(o=> ['待执行','执行中'].includes(o['单据状态']) && flowInt(o['待取样件数']) > 0)
          .map(o=>{
            const r = old.get(o['报检单号']) || { id: 'ws-'+o['报检单号'] };
            cols.forEach(k=>{ r[k] = flowHas(o[k]) ? o[k] : '—'; });
            return r;
          });
        bag.splice(0, bag.length, ...list);
      });
    }
    /** 样品的分配结果：母样取任务分派，子样沿用母样 */
    function flowAsgOf(s){
      const m = taskIsKid(s) ? flowSplitRow(s['母样编号']) : s;
      return (m && m._asg) || null;
    }
    function flowCalcOverdue(eta){
      if(!flowHas(eta)) return '正常';
      const t = Date.parse(String(eta).replace(/-/g, '/'));
      if(isNaN(t)) return '正常';
      return Date.now() > t ? '逾期' : '正常';
    }
    /** 样品检验类的实际检验仪器：检验排程计划仪器 > 任务分派适用仪器 */
    function entryInstOf(smp, cat){
      const p = (schedPlans()||[]).find(x=> x._key === (smp+'|'+cat));
      return p && flowHas(p['检验仪器']) ? p['检验仪器'] : '';
    }
    /** 数据录入 = 待检验 / 检验中且完全分配的母样；子样不单独录入，状态随母样；按类型每个检验类一行，已提交的检验类不再显示 */
    function flowSyncEntry(){
      const bySample = {}, byCat = {};
      FLOW_TABS.forEach(({ name })=>{ bySample[name] = []; byCat[name] = []; });
      sampSplitList().forEach(s=>{
        if(taskIsKid(s) || !['待检验','检验中'].includes(s['样品状态'])) return;
        const asg = flowAsgOf(s);
        const tab = flowTabOf(s['报检类型']);
        if(!asg || asg['分配状态']!=='完全分配' || !tab) return;
        const srcs = flowSampleSrcs(s);
        const sampleRow = Object.assign(flowPick(flowCols(FLOW_ENTRY, tab), srcs), { id: 'es-'+s['样品编号'] });
        sampleRow['逾期状态'] = flowCalcOverdue(sampleRow['预计完成时间']);
        bySample[tab].push(sampleRow);
        const done = ((s._entry||{}).done) || [];
        const tfRow = timeFbTab('tab-1').find(o=> o['样品编号']===s['样品编号']);
        asg.lines.forEach(ln=>{
          if(done.includes(ln['检验类'])) return;
          const row = flowPick(flowCols(FLOW_ENTRY_CAT, tab), srcs, { 检验类名称: ln['检验类'], 检验班组: ln['分配班组'] || '—', 分析仪器: ln['分析仪器'] || '—', 检验仪器: entryInstOf(s['样品编号'], ln['检验类']) || ln['分析仪器'] || '—' });
          const tfl = tfRow && (tfRow._lines||[]).find(l=> l['检验类']===ln['检验类']);
          const lineEta = tfl ? timeFbNormEta(tfl['预计完成时间']) : '';
          row['预计完成时间'] = lineEta || '—';
          row['逾期状态'] = flowCalcOverdue(lineEta);
          byCat[tab].push(Object.assign(row, { id: 'ec-'+s['样品编号']+'-'+ln['检验类'], _items: ln['检验项'], _fb: lineEta ? '已填写' : '未填写' }));
        });
      });
      FLOW_TABS.forEach(({ name })=>{
        const a = flowBag(FLOW_ENTRY, name); a.splice(0, a.length, ...bySample[name]);
        const b = flowBag(FLOW_ENTRY_CAT, name); b.splice(0, b.length, ...byCat[name]);
      });
      const merged = [];
      FLOW_TABS.forEach(({ name, label })=>{
        byCat[name].forEach(r=>{
          const fb = r._fb || '未填写';
          const eta = fb==='已填写' ? r['预计完成时间'] : '—';
          merged.push(Object.assign({}, r, {
            id: String(r.id||'').replace(/^ec-/, 'mt-'),
            报检单类型: label,
            反馈状态: fb,
            预计完成时间: eta,
            逾期状态: flowCalcOverdue(eta)
          }));
        });
      });
      const mine = flowBag(FLOW_MY_TASK, 'main');
      mine.splice(0, mine.length, ...merged);
    }
    const fbTimeVisible = ref(false);
    const fbTimeRow = ref(null);
    const fbTimeForm = reactive({ 预计完成时间: '' });
    const fbBatchVisible = ref(false);
    const fbBatchFill = ref('');
    const fbBatchRows = ref([]);
    function applyFbEta(row, eta, opts){
      opts = opts || {};
      writeEtaDownstreams(row['样品编号'], row['报检单号'], eta);
      const s = flowSplitRow(row['样品编号']);
      if(s) s['反馈状态'] = '已填写';
      const tf = timeFbTab('tab-1').find(o=> o['样品编号']===row['样品编号']);
      if(tf){
        if(!opts.keepLines){
          (tf._lines||[]).forEach(l=>{ if(l['行状态']!=='无需分配') l['预计完成时间'] = eta; });
        }
        if(!opts.synced) tf['时间同步状态'] = '未同步';
        timeFbRecalc(tf);
        if(opts.synced){
          tf['时间同步状态'] = '已同步';
          if(opts.stamp){ tf['最近同步人'] = opts.操作人 || '管理员'; tf['最近同步时间'] = opts.stamp; }
        }
      }
    }
    /** 数据录入-我的：反馈时间只写本行（样品×检验类），样品级预计完成时间取各行最晚 */
    function applyFbLineEta(row, eta){
      const tf = timeFbTab('tab-1').find(o=> o['样品编号']===row['样品编号']);
      const cat = row['检验类名称'];
      const ln = tf && (tf._lines||[]).find(l=> l['检验类']===cat && l['行状态']!=='无需分配');
      if(ln){
        ln['预计完成时间'] = eta;
        tf['时间同步状态'] = '未同步';
        timeFbRecalc(tf);
        applyFbEta(row, tf['预计完成时间'], { keepLines: true });
      } else {
        applyFbEta(row, eta, { keepLines: true });
      }
    }
    function openFbTime(row){
      fbTimeRow.value = row;
      const cur = row && flowHas(row['预计完成时间']) ? row['预计完成时间'] : '';
      fbTimeForm.预计完成时间 = cur && cur!=='—' ? cur : '';
      fbTimeVisible.value = true;
    }
    function confirmFbTime(){
      const eta = String(fbTimeForm.预计完成时间||'').trim();
      if(!eta){ ElMessage.warning('请选择预计完成时间'); return; }
      const row = fbTimeRow.value;
      if(!row){ fbTimeVisible.value = false; return; }
      applyFbLineEta(row, eta);
      fbTimeVisible.value = false;
      flowSyncEntry();
      bumpStore();
      ElMessage.success('已反馈预计完成时间');
    }
    function openFbBatch(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选要反馈的数据'); return; }
      fbBatchFill.value = '';
      fbBatchRows.value = rows.map(r=>{
        const cur = flowHas(r['预计完成时间']) ? r['预计完成时间'] : '';
        return {
          id: r.id,
          报检单号: r['报检单号'] || '—',
          报检单类型: r['报检单类型'] || '—',
          样品编号: r['样品编号'] || '—',
          检验类名称: r['检验类名称'] || '—',
          物料编码: r['物料编码'] || '—',
          物料名称: r['物料名称'] || '—',
          物料规格: r['物料规格'] || '—',
          物料种类: r['物料种类'] || '—',
          预计完成时间: (cur && cur!=='—') ? cur : ''
        };
      });
      fbBatchVisible.value = true;
    }
    function applyFbBatchFill(){
      const eta = String(fbBatchFill.value||'').trim();
      if(!eta){ ElMessage.warning('请先选择预计完成时间'); return; }
      fbBatchRows.value.forEach(r=>{ r.预计完成时间 = eta; });
      ElMessage.success('已批量填充 '+fbBatchRows.value.length+' 行');
    }
    function confirmFbBatch(){
      const rows = fbBatchRows.value || [];
      if(!rows.length){ ElMessage.warning('没有可反馈的数据'); return; }
      if(rows.some(r=> !String(r.预计完成时间||'').trim())){
        ElMessage.warning('请为所有行填写预计完成时间');
        return;
      }
      rows.forEach(r=> applyFbLineEta(r, String(r.预计完成时间).trim()));
      fbBatchVisible.value = false;
      selectedIds.value = [];
      flowSyncEntry();
      bumpStore();
      ElMessage.success('已批量反馈 '+rows.length+' 条预计完成时间');
    }
    /** 子样的样品状态始终与母样一致：样品拆分、样品位置 */
    function flowSyncKidStatus(){
      const byNo = new Map(sampSplitList().map(r=> [r['样品编号'], r]));
      sampSplitList().forEach(k=>{
        const m = taskIsKid(k) ? byNo.get(k['母样编号']) : null;
        if(m) k['样品状态'] = m['样品状态'];
      });
      const sloc = [...slocTab('tab-1'), ...slocTab('tab-2')];
      const slocByNo = new Map(sloc.map(r=> [r['样品编号'], r]));
      sloc.forEach(r=>{
        if(!flowHas(r['母样编号']) || !('样品状态' in r)) return;
        const m = slocByNo.get(r['母样编号']) || byNo.get(r['母样编号']);
        if(m && flowHas(m['样品状态'])) r['样品状态'] = m['样品状态'];
      });
    }
    function flowSyncLedgerOverdue(){
      FLOW_TABS.forEach(({ name })=>{
        flowBag(FLOW_LEDGER, name).forEach(r=>{
          r['逾期状态'] = flowCalcOverdue(r['预计完成时间']);
        });
      });
    }
    function flowSyncAll(){
      if(typeof oeBackfill==='function') oeBackfill();
      flowLedgerDropKids();
      flowSyncInspectStatus();
      flowSyncKidStatus();
      flowSyncOrders();
      flowSyncWaitSamp();
      taskSyncAll();
      flowSyncLedgerOverdue();
      flowSyncEntry();
    }
    watch(()=> pageId.value, v=>{ if(FLOW_PAGES.includes(v)){ flowSyncAll(); storeTick.value += 1; } }, { immediate:true });
    /** 待取样任务 · 取样确定：生成母样，写入样品拆分和样品检验台账，回写报检单件数 */
    function flowTakeSample(){
      const tab = activeTab.value, no = formModel._sampOrderNo;
      const od = flowBag(FLOW_ORDER, tab).find(r=> r['报检单号']===no);
      const src = od || flowBag(FLOW_WAIT, tab).find(r=> r['报检单号']===no);
      if(!src){ ElMessage.warning('未找到报检单 '+no); return; }
      const left = flowInt(src['待取样件数']);
      const raw = String(formModel['取样件数']||'').trim();
      const cnt = parseInt(raw, 10);
      if(!/^\d+$/.test(raw) || cnt <= 0){ ElMessage.warning('取样件数须为正整数'); return; }
      if(cnt > left){ ElMessage.warning('取样件数不能超过待取样件数 '+left); return; }
      const rows = waitSampSampleRows.value || [];
      if(rows.length > cnt){ ElMessage.warning('样品信息有 '+rows.length+' 行，超过取样件数 '+cnt+'，请删除多余样品'); return; }
      while(rows.length < cnt) addWaitSampSample();
      const stamp = nowStamp(), label = flowLabelOf(tab);
      const noMat = !flowCols(FLOW_ORDER, tab).includes('物料编码');
      const created = rows.map(r=> ({
        id: 'sp-'+r['样品编号'], 样品状态: '待检验', 样品类型: '母样', 拆分状态: '未拆分', 样品编号: r['样品编号'], 母样编号: '—',
        样品来源: r['样品来源'] || '报检取样', 报检类型: label, 报检单号: no,
        物料编码: noMat ? '—' : (src['物料编码'] || '—'),
        物料名称: (noMat ? src['样品名称'] : src['物料名称']) || '—',
        物料规格: (noMat ? src['样品规格'] : src['物料规格']) || '—',
        报检批号: src['报检批号'] || src['厂内批号'] || '—', 采样点: src['采样点'] || '—', 货物位置: src['货物位置'] || '—',
        检验班组: '—', 检验方案: r['检验方案'] || formModel['检验方案'] || '—', 方案项目: r['方案项目'] || '—', 临时项目: r['临时项目'] || '—',
        已拆分数量: '0', 取样备注: r['取样备注'] || '', 取样时间: stamp, 取样人: '管理员', 拆分备注: '—', 拆分时间: '—', 拆分人: '—'
      }));
      sampSplitList().unshift(...created);
      const lg = flowBag(FLOW_LEDGER, tab);
      created.slice().reverse().forEach(sp=> lg.unshift(flowLedgerNew(tab, sp, src)));
      if(od){
        od['已取样件数'] = String(flowInt(od['已取样件数']) + cnt);
        od._flow = true;
        if(tab==='tab-rd' && formModel['预计完成时间']) od['预计完成时间'] = formModel['预计完成时间'];
      }
      flowSyncAll();
      created.forEach(sp=>{ const o = taskTab('tab-1').find(x=> x['样品编号']===sp['样品编号']); if(o) taskWriteBack(o); });
      flowSyncEntry();
      formVisible.value = false;
      bumpStore();
      ElMessage.success('取样完成，已生成 '+cnt+' 个样品（'+created.map(s=> s['样品编号']).join('、')+'），已进入样品拆分和任务分派');
    }
    /** 待取样任务 · 结束取样：待取样件数清零，报检单移出待取样任务 */
    function flowEndSampling(rows){
      if(!(rows||[]).length){ ElMessage.warning('请先勾选数据'); return; }
      ElementPlus.ElMessageBox.confirm('确认结束取样所选 '+rows.length+' 个报检单？结束后待取样件数清零，报检单不再出现在待取样任务中。', '结束取样', { type: 'warning' }).then(()=>{
        rows.forEach(r=>{
          const f = flowOrderOf(r['报检单号']);
          if(f) Object.assign(f.row, { _sampEnd: true, _flow: true, 待取样件数: '0' });
        });
        flowSyncAll();
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已结束取样 '+rows.length+' 个报检单');
      }).catch(()=>{});
    }
    /** 待取样任务 · 取样人员：行内弹窗抽屉选人，反写上游报检单随行同步 */
    const wsPick = reactive({ visible:false, row:null, person:'' });
    function wsPickOpen(row){
      wsPick.row = row;
      const v = row['取样人员'];
      wsPick.person = (v && v!=='—') ? v : '';
      wsPick.visible = true;
    }
    function wsPickConfirm(){
      if(!String(wsPick.person||'').trim()){ ElMessage.warning('请选择取样人员'); return; }
      const f = wsPick.row && flowOrderOf(wsPick.row['报检单号']);
      if(f) f.row['取样人员'] = wsPick.person;
      if(wsPick.row) wsPick.row['取样人员'] = wsPick.person;
      wsPick.visible = false;
      bumpStore();
      ElMessage.success('已设置取样人员');
    }
    /** 子样不进入样品检验台账，台账只记录母样 */
    function flowLedgerDropKids(){
      const kids = new Set(sampSplitList().filter(taskIsKid).map(r=> r['样品编号']));
      FLOW_TABS.forEach(({ name })=>{
        const bag = flowBag(FLOW_LEDGER, name);
        for(let i = bag.length - 1; i >= 0; i--){
          if(bag[i]['样品来源']==='样品拆分' || kids.has(bag[i]['样品编号'])) bag.splice(i, 1);
        }
      });
    }
    function flowHasInspectProgress(s){
      const e = (s && s._entry) || {};
      if((e.done||[]).length) return true;
      if((e.doneItems||[]).length) return true;
      return Object.values(e.items||{}).some(x=> x && (String(x.结论||'').trim() || String(x.实测值||'').trim()));
    }
    /** 已有检验录入或已提交检验类/项时，样品状态应为检验中（非已完成） */
    function flowSyncInspectStatus(){
      sampSplitList().forEach(s=>{
        if(taskIsKid(s) || s['样品状态']==='已完成') return;
        if(flowHasInspectProgress(s) && s['样品状态']!=='检验中') flowStartSample(s);
      });
    }
    /** 母样开始检验 / 检验完成时，其子样同步；台账只更新母样 */
    function flowStartSample(s){
      [s, ...sampSplitChildren(s['样品编号'])].forEach(x=>{
        if(x['样品状态']==='待检验') x['样品状态'] = '检验中';
      });
      const lg = flowLedgerRow(s['样品编号']);
      if(lg && lg['样品状态']==='待检验') lg['样品状态'] = '检验中';
    }
    function flowFinishSample(s, stamp){
      const bad = Object.values(((s._entry||{}).items)||{}).some(x=> x.结论==='不合格');
      [s, ...sampSplitChildren(s['样品编号'])].forEach(x=>{ x['样品状态'] = '已完成'; });
      const lg = flowLedgerRow(s['样品编号']);
      if(lg) Object.assign(lg, { 样品状态: '已完成', 检验结论: bad ? '不合格' : '合格', 检验完成时间: stamp, 检验人: '管理员' });
    }
    function flowHasData(s, items){
      const it = ((s._entry||{}).items) || {};
      return items.some(n=> it[n] && (String(it[n].实测值||'').trim() || it[n].结论));
    }
    function inspItemOf(name){
      return ((((MOCK['insp-project']||{})['tab-item'])||[]).find(r=> r['检验项名称']===name)) || {};
    }
    const entryCat = ref('');
    const entryStamp = ref('');
    const entryDone = ref([]);
    const entryCats = computed(()=>{
      const seen = [];
      (formLineRows.value||[]).forEach(r=>{
        const c = r['所属检验类'] || '未分类';
        if(!seen.includes(c)) seen.push(c);
      });
      return seen;
    });
    const entryCatRows = computed(()=> (formLineRows.value||[]).filter(r=> (r['所属检验类']||'未分类')===entryCat.value));
    const entryCatState = ref({});
    let entryCatApplying = false;
    function entryCatMethodNames(cat){
      const enabled = (((MOCK['insp-method']||{})['tab-method'])||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r['检验方法名称']).filter(Boolean);
      const hit = ((((MOCK['insp-project']||{})['tab-category'])||[]).find(r=> r['检验类名称']===cat)) || null;
      if(!hit) return enabled.slice();
      const names = [];
      (hit._methods||[]).forEach(m=>{ const n = m['检验方法名称']; if(n && enabled.includes(n) && !names.includes(n)) names.push(n); });
      splitDun(hit['适用检验方法']).forEach(n=>{ if(enabled.includes(n) && !names.includes(n)) names.push(n); });
      return names.length ? names : enabled.slice();
    }
    const entryMethods = computed(()=> entryCatMethodNames(entryCat.value));
    function entryStoreCat(cat){
      if(!cat) return;
      const bag = entryCatState.value || (entryCatState.value = {});
      bag[cat] = {
        method: formModel['检验方法'] || '',
        version: formModel['版本号'] || '',
        pubTimes: formModel['公共测试次数'] || '',
        sampTimes: formModel['样本测试次数'] || '',
        desc: formModel['作业说明'] || '',
        mats: entryCloneMats(entryMats.value),
        note: formModel['内容说明'] || '',
        files: (entryExtraFiles.value||[]).map(f=>({ name: f.name })),
        instruments: (entryInstruments.value||[]).slice(),
        spectra: (entrySpectra.value||[]).map(f=>({ id: f.id, name: f.name })),
        pubValues: JSON.parse(JSON.stringify(entryPubCells.value || {}))
      };
    }
    function entryApplyCatState(cat){
      entryCatApplying = true;
      const st = (entryCatState.value && entryCatState.value[cat]) || null;
      const allow = entryCatMethodNames(cat);
      const method = st && st.method && allow.includes(st.method) ? st.method : '';
      formModel['检验方法'] = method;
      if(method){
        const vers = entryMethodVersionRows();
        const no = st && st.version && vers.some(v=> v['版本号']===st.version) ? st.version : ((vers[0] && vers[0]['版本号']) || '');
        entryApplyVersion(no, true);
        formModel['公共测试次数'] = st.pubTimes || '';
        formModel['样本测试次数'] = st.sampTimes ? Number(st.sampTimes) : undefined;
        formModel['作业说明'] = st.desc || (entryVerSnap.value && entryVerSnap.value['作业说明']) || '';
        entryMats.value = entryCloneMats(Array.isArray(st.mats) ? st.mats : (entryVerSnap.value && entryVerSnap.value._mats));
      } else entryApplyVersion('', false);
      entryPubCells.value = (st && st.pubValues && typeof st.pubValues==='object') ? JSON.parse(JSON.stringify(st.pubValues)) : {};
      formModel['内容说明'] = (st && st.note) || '';
      entryExtraFiles.value = ((st && st.files) || []).map(f=>({ name: f.name || '' })).filter(f=> f.name);
      entryInstruments.value = ((st && st.instruments) || []).slice();
      entrySpectra.value = ((st && st.spectra) || []).map(f=>({ id: f.id, name: f.name || '' })).filter(f=> f.name);
      entryMethodTab.value = '项目';
      entryMatSelected.value = [];
      entryMatScan.value = '';
      entryDescOpen.value = false;
      nextTick(()=>{ entryCatApplying = false; });
    }
    function entryPickCat(cat){
      if(!cat || cat===entryCat.value) return;
      entryStoreCat(entryCat.value);
      entryCat.value = cat;
      entryApplyCatState(cat);
    }
    const entryMethodTab = ref('项目');
    const entryDescOpen = ref(false);
    const entryMats = ref([]);
    const entryExtraFiles = ref([]);
    const entryInstruments = ref([]);
    const entrySpectra = ref([]);
    const entryMatSelected = ref([]);
    const entryMatScan = ref('');
    const entryMatScanRef = ref(null);
    function entryCloneMats(list){
      return (Array.isArray(list) ? list : []).map(normalizeInspMethodMat);
    }
    function removeEntryMats(){
      const drop = new Set((entryMatSelected.value||[]).map(r=> r['材料编码']||r['物料编码']));
      entryMats.value = entryMats.value.filter(r=> !drop.has(r['材料编码']||r['物料编码']));
      entryMatSelected.value = [];
    }
    function entryFindMatByScan(code){
      const raw = String(code||'').trim();
      if(!raw) return null;
      const mock = window.WMS_MOCK_ROWS || MOCK;
      const archPages = [
        { page:'reagent-arch', code:'试剂编码', name:'试剂名称', spec:'试剂规格', kind:'试剂种类', unit:'计量单位', label:'试剂' },
        { page:'solution-arch', code:'试液编码', name:'试液名称', spec:'试液规格', kind:'试液种类', unit:'计量单位', label:'试液' },
        { page:'ref-material-arch', code:'标准物质编码', name:'标准物质名称', spec:'标准物质规格', kind:'标准物质种类', unit:'计量单位', label:'标准物质' },
        { page:'consumable-arch', code:'耗材编码', name:'耗材名称', spec:'耗材规格', kind:'耗材种类', unit:'计量单位', label:'耗材' }
      ];
      for(const meta of archPages){
        const list = ((((mock[meta.page]||{}).main)||[]));
        const hit = list.find(r=> String(r['条码号']||'').trim()===raw || String(r[meta.code]||'').trim()===raw);
        if(hit){
          return normalizeInspMethodMat({
            材料编码: hit[meta.code]||'', 材料名称: hit[meta.name]||'', 材料规格: hit[meta.spec]||'',
            材料种类: hit[meta.kind]||'', 单位: hit[meta.unit]||'', 材料来源: meta.label,
            供应商名称: hit['供应商名称']||'', 批号: hit['批号']||'', 用量:''
          });
        }
      }
      for(const meta of METHOD_MAT_SRCS){
        const list = ((((mock[meta.page]||{}).main)||[])).filter(r=> r['启用状态']!=='禁用');
        const hit = list.find(r=> String(r[meta.code]||'').trim()===raw);
        if(hit){
          return normalizeInspMethodMat({
            材料编码: hit[meta.code]||'', 材料名称: hit[meta.name]||'', 材料规格: hit[meta.spec]||'',
            材料种类: hit[meta.kind]||'', 单位: hit[meta.unit]||'', 材料来源: meta.label, 用量:''
          });
        }
      }
      return null;
    }
    function onEntryMatScan(){
      const code = String(entryMatScan.value||'').trim();
      if(!code){ ElMessage.warning('请扫码或输入材料条码 / 编码'); return; }
      const mat = entryFindMatByScan(code);
      if(!mat || !mat['材料编码']){ ElMessage.warning('未找到对应材料'); return; }
      if((entryMats.value||[]).some(r=> r['材料编码']===mat['材料编码'])){
        ElMessage.warning('该材料已添加');
        entryMatScan.value = '';
        return;
      }
      entryMats.value = (entryMats.value||[]).concat([mat]);
      entryMatScan.value = '';
      ElMessage.success('已添加材料 '+mat['材料编码']);
      nextTick(()=>{ try{ entryMatScanRef.value?.focus?.(); }catch(_e){} });
    }
    function onEntryExtraFile(file){
      const name = (file && (file.name || (file.raw && file.raw.name))) || '';
      if(!name || entryExtraFiles.value.some(f=> f.name===name)) return;
      entryExtraFiles.value.push({ name });
    }
    function removeEntryExtraFile(name){
      entryExtraFiles.value = entryExtraFiles.value.filter(f=> f.name!==name);
    }
