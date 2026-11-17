    const SLOC_SCRAP_REASONS = ['检后销毁','样品失效','样品污染','其他'];
    const slocDispVisible = ref(false);
    const slocDispMode = ref('disp');
    const slocDispRows = ref([]);
    const slocDispSelected = ref([]);
    const slocDispForm = reactive({
      库位编码:'', 处置方式:'', 供应商名称:'', 供应商编码:'', 建档数量:'1', 留样日期:'', 有效期:'', 有效期单位:'月',
      是否玻璃片:'否', 存储库位:'', 存储仓库:'', 生成条码数量:'1', 报废原因:'', 处置备注:''
    });
    const slocDispTitle = computed(()=> slocDispMode.value==='in' ? '入位' : slocDispMode.value==='take' ? '领用' : '样品处置');
    const slocLocOpts = computed(()=>{
      void storeTick.value;
      return slocStoreLocs();
    });
    const slocDispCols = computed(()=>{
      const views = (page.value && page.value.tabViews) || [];
      const view = views.find(v=> v.name==='tab-1') || {};
      return (view.columns || []).filter(c=> c.field && c.field!=='_actions');
    });
    function fillSlocDispLife(){
      const hits = slocDispRows.value.map(slocRetainHit).filter(Boolean);
      const first = hits[0];
      if(!first) return;
      slocDispForm.有效期 = String(first['留样期']||'');
      slocDispForm.有效期单位 = first['留样期单位'] || '月';
    }
    function onSlocDispWay(way){
      if(way==='留样'){
        if(!slocDispForm.是否玻璃片) slocDispForm.是否玻璃片 = '否';
        fillSlocDispLife();
      }
    }
    function onSlocDispLoc(name){
      slocDispForm.存储仓库 = labArchWhOfLoc(name) || '';
    }
    function openSlocDispSupplier(){
      openIoPick('supplier', 'slocDispSupplier', '供应商名称');
    }
    function openSlocLoc(mode, rows){
      if(!(rows||[]).length){
        ElMessage.warning(mode==='in' ? '请先勾选要入库的样品' : mode==='take' ? '请先勾选要领用的样品' : '请先勾选要处置的样品');
        return;
      }
      slocDispMode.value = mode;
      slocDispSelected.value = [];
      const use = slocTab('tab-1');
      slocDispRows.value = rows.map(r=> use.find(x=> x.id===r.id) || r);
      const ways = [...new Set(slocDispRows.value.map(r=> ({ '转留样':'留样', '检后销毁':'报废' })[r['样品处置方式']] || ''))];
      Object.assign(slocDispForm, {
        库位编码:'',
        处置方式: ways.length===1 ? ways[0] : '',
        供应商名称:'', 供应商编码:'', 建档数量:'1', 留样日期:'', 有效期:'', 有效期单位:'月',
        是否玻璃片:'否', 存储库位:'', 存储仓库:'', 生成条码数量:'1',
        报废原因: ways[0]==='报废' && ways.length===1 ? '检后销毁' : '', 处置备注:''
      });
      if(slocDispForm.处置方式==='留样') fillSlocDispLife();
      slocDispVisible.value = true;
    }
    function confirmSlocLoc(){
      const inbound = slocDispMode.value==='in';
      const hit = (inbound ? slocLocOpts.value : SLOC_DESTS.value).find(x=> x.code===slocDispForm.库位编码);
      if(!hit){ ElMessage.warning(inbound ? '请选择库位' : '请选择领用去向'); return; }
      const rows = slocDispRows.value.slice();
      slocMove(rows, inbound ? '样品入库' : '领用检验', hit, true, {});
      slocDispVisible.value = false;
      selectedIds.value = [];
      ElMessage.success(inbound ? (rows.length+' 个样品已入库到 '+hit.name) : (rows.length+' 个样品已领用到 '+hit.name));
    }
    const RETAIN_ARCH_PAGE = 'retain-sample-arch';
    function slocRetainHit(r){
      const src = ((MOCK['retain-sample']||{}).main||[]).filter(x=> x['启用状态']!=='禁用');
      const name = r['物料名称'] || '';
      return src.find(x=> x['留样编码']===r['物料编码']) || src.find(x=> name && x['留样名称']===name+'留样') || null;
    }
    function slocRetainArchive(r, f, stamp){
      if(!MOCK[RETAIN_ARCH_PAGE]) MOCK[RETAIN_ARCH_PAGE] = { main: [] };
      const list = MOCK[RETAIN_ARCH_PAGE].main || (MOCK[RETAIN_ARCH_PAGE].main = []);
      const hit = slocRetainHit(r);
      if(!hit){ ElMessage.warning('样品「'+(r['样品编号']||'')+'」未匹配到启用的留样主数据，跳过建档'); return ''; }
      const lifeN = String(f.有效期||'').trim(), lifeU = lifeN ? (f.有效期单位||'月') : '';
      const date = String(f.留样日期||'').trim() || stamp.slice(0,10);
      const cnt = Math.max(1, parseInt(f.生成条码数量, 10) || 1);
      const wh = f.存储仓库 || '', loc = f.存储库位 || '';
      // 与待取样任务样品编号同一套 YP 流水；优先沿用本样品编号，占用则按日自增
      const used = new Set(list.map(x=> String(x['条码号']||'')));
      const sampNo = String(r['样品编号']||'').trim();
      const codes = [];
      if(sampNo && !used.has(sampNo)){ codes.push(sampNo); used.add(sampNo); }
      if(codes.length < cnt){
        nextSampleNos(cnt - codes.length, [...used]).forEach(c=>{ if(!used.has(c)){ codes.push(c); used.add(c); } });
      }
      codes.forEach((code, i)=>{
        list.unshift({
          id: 'lya-'+Date.now()+'-'+(i+1), 条码号: code,
          留样编码: hit['留样编码'], 留样名称: hit['留样名称'], 留样规格: hit['留样规格'], 留样种类: hit['留样种类'],
          供应商名称: f.供应商名称 || '—', 计量单位: hit['计量单位'], 建档数量: String(f.建档数量||'').trim() || '1', 批号: r['报检批号'] || '—',
          留样日期: date, 是否玻璃片: f.是否玻璃片 || '否',
          有效期: lifeN ? lifeN+' '+lifeU : '', _lifeN: lifeN, _lifeU: lifeU, 失效日期: labAddLife(date, lifeN, lifeU),
          存储库位: loc, 存储仓库: wh, 样品位置: retainLocText(wh, loc),
          备注: '样品 '+sampNo+' 处置转留样', 条码来源: '样品处置', 创建人: '管理员', 创建时间: stamp
        });
      });
      return codes.join('、');
    }
    function onSlocDispSelect(rows){ slocDispSelected.value = rows || []; }
    function confirmSlocDisp(){
      const f = slocDispForm;
      if(!f.处置方式){ ElMessage.warning('请选择处置方式'); return; }
      if(f.处置方式==='报废' && !f.报废原因){ ElMessage.warning('请选择报废原因'); return; }
      const rows = slocDispRows.value.slice();
      ElementPlus.ElMessageBox.confirm('确认处置所选 '+rows.length+' 个样品？处置后不可撤销。', '样品处置', { type:'warning' }).then(()=>{
        const stamp = nowStamp();
        const loc = f.处置方式==='留样' ? { code:'—', name:'留样' } : { code:'—', name:'已报废' };
        const note = String(f.处置备注||'').trim() || '—';
        slocMove(rows, '样品处置', loc, '', { 备注: note });
        const use = slocTab('tab-1'), done = slocTab('tab-2');
        const archTips = [];
        rows.forEach(r=>{
          const i = use.findIndex(x=> x.id===r.id);
          if(i >= 0) use.splice(i, 1);
          let retainCodes = '—', retainWh = '—', retainLoc = '—';
          if(f.处置方式==='留样'){
            retainCodes = slocRetainArchive(r, f, stamp) || '—';
            retainWh = f.存储仓库 || '—';
            retainLoc = f.存储库位 || '—';
            if(retainCodes!=='—') archTips.push(r['样品编号']+'→'+retainCodes);
          }
          done.unshift({
            id: 'sd-'+Date.now()+'-'+r['样品编号'], 处置方式: f.处置方式, 样品编号: r['样品编号'], 母样编号: r['母样编号'], 样品来源: r['样品来源'],
            报检类型: r['报检类型'], 报检单号: r['报检单号'], 物料编码: r['物料编码'], 物料名称: r['物料名称'], 物料规格: r['物料规格'],
            报检批号: r['报检批号'], 检验结论: r['检验结论'], 处置前位置: r['当前位置'] || '—',
            留样仓库: retainWh, 留样库位: retainLoc, 留样条码号: retainCodes,
            是否玻璃片: f.处置方式==='留样' ? (f.是否玻璃片 || '否') : '—',
            报废原因: f.处置方式==='报废' ? f.报废原因 : '—',
            处置备注: note, 处置时间: stamp, 处置人: '管理员', 最近变更时间: stamp, 最近变更人: '管理员'
          });
        });
        slocDispVisible.value = false;
        selectedIds.value = [];
        bumpStore();
        ElMessage.success(f.处置方式==='留样' && archTips.length
          ? ('已处置 '+rows.length+' 个样品，已建留样档案：'+archTips.join('；'))
          : ('已处置 '+rows.length+' 个样品'));
      }).catch(()=>{});
    }
    const slocLogVisible = ref(false);
    const slocLogNo = ref('');
    const slocLogRows = computed(()=>{
      void storeTick.value;
      return slocTab('tab-3').filter(r=> r['样品编号']===slocLogNo.value).slice().sort((a, b)=> String(b['操作时间']).localeCompare(String(a['操作时间'])));
    });
    function openSlocLog(row){ slocLogNo.value = row['样品编号']; slocLogVisible.value = true; }
    const TASK_PAGE = 'np-0201-13';
    const TIME_FB_PAGE = 'np-0201-05';
    const DISPATCH_PAGE = 'np-0103-12';
    function taskTab(name){
      const bag = (MOCK[TASK_PAGE] = MOCK[TASK_PAGE] || {});
      return (bag[name] = bag[name] || []);
    }
    function timeFbTab(name){
      const bag = (MOCK[TIME_FB_PAGE] = MOCK[TIME_FB_PAGE] || {});
      return (bag[name] = bag[name] || []);
    }
    function inspTeamRows(withDisabled){
      return ((MOCK['insp-team']||{}).main||[]).filter(t=> withDisabled || t['启用状态']!=='禁用');
    }
    function inspCatNames(){
      return ((MOCK['insp-project']||{})['tab-category']||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r['检验类名称']).filter(Boolean);
    }
    function teamNames(){ return inspTeamRows().map(t=> t['班组名称']); }
    function dispatchRules(){ return ((MOCK[DISPATCH_PAGE]||{}).main||[]).filter(r=> r['启用状态']!=='禁用'); }
    function ruleMats(r){ return r['物料编码'] && r['物料编码']!=='—' ? splitDun(r['物料编码']) : []; }
    function matchDispatchRule(matCode, cat){
      const rs = dispatchRules().filter(r=> splitDun(r['适用检验类']).includes(cat));
      const code = matCode && matCode!=='—' ? matCode : '';
      return (code && rs.find(r=> ruleMats(r).includes(code))) || rs.find(r=> !ruleMats(r).length) || null;
    }
    function taskLineCands(order, ln){
      const rule = matchDispatchRule(order['物料编码'], ln['检验类']);
      const ok = new Set(teamNames());
      return { rule, cands: rule ? splitDun(rule['派单班组']).filter(t=> ok.has(t)) : [] };
    }
    function taskInstNames(){
      return ((MOCK.instrument||{}).main||[]).filter(r=> r['使用状态']==='在用').map(r=> r['仪器名称']).filter(Boolean);
    }
    function taskLineInstOpts(order, ln){
      const { rule } = taskLineCands(order, ln);
      let list = [];
      if(rule && Array.isArray(rule._insts) && rule._insts.length) list = rule._insts.map(r=> r['仪器名称']).filter(Boolean);
      else if(rule && flowHas(rule['使用仪器'])) list = splitDun(rule['使用仪器']);
      else if(rule && flowHas(rule['适用仪器'])) list = splitDun(rule['适用仪器']);
      if(!list.length) list = taskInstNames();
      return [...new Set(list)];
    }
    function taskRefreshLine(order, ln){
      if(ln['行状态']==='已分配') return;
      const { rule, cands } = taskLineCands(order, ln);
      ln['命中方案'] = rule ? rule['方案编码'] : '—';
      ln['候选班组'] = cands.join('、') || '—';
      ln['行状态'] = rule ? '待分配' : '无需分配';
    }
    function taskRecalc(o){
      const lines = o._lines || [];
      const need = lines.filter(l=> l['行状态']!=='无需分配');
      const done = need.filter(l=> l['行状态']==='已分配');
      o['分配状态'] = !need.length || done.length===need.length ? '完全分配' : (done.length ? '部分分配' : '未分配');
      o['检验类'] = lines.map(l=> l['检验类']).join('、');
      o['分配进度'] = done.length+'/'+need.length;
      o['分配明细'] = lines.map(l=> l['检验类']+'→'+(l['行状态']==='已分配' ? l['分配班组'] : l['行状态'])).join('；');
      o['检验班组'] = [...new Set(done.map(l=> l['分配班组']))].join('、') || '—';
      const ways = [...new Set(done.map(l=> l['分配方式']))];
      o['分配方式'] = ways.length ? (ways.length > 1 ? '自动+手动' : ways[0]) : '—';
    }
    const TASK_SRC = 'np-0201-11';
    function taskSplitSample(order){ return sampSplitList().find(r=> r['样品编号']===order['样品编号']) || null; }
    function taskSplitItemNames(ln){
      return String(ln['检验项']||'').split(/[、;；]/).map(x=> x.trim()).filter(x=> x && x!=='—');
    }
    function taskLineItemStatus(order, inspClass, itemName){
      const s = taskSplitSample(order);
      const e = (s && s._entry) || {};
      if((e.done||[]).includes(inspClass)) return '已完成';
      if((e.doneItems||[]).includes(itemName)) return '已完成';
      const it = (e.items||{})[itemName];
      if(it && (String(it.结论||'').trim() || String(it.实测值||'').trim())) return '已完成';
      return '未完成';
    }
    const TASK_SAMPLE_KEYS = ['样品状态','报检类型','报检单号','物料编码','物料名称','物料规格','报检批号','采样点',
      '检验方案','方案项目','临时项目','取样时间','取样人','拆分时间','拆分人','拆分备注'];
    const TASK_LINE_KEEP = ['分配班组','分配方式','行状态','分配人','分配时间','命中方案','候选班组','适用仪器'];
    function taskSrcList(){ return ((MOCK[TASK_SRC]||{}).main) || []; }
    function taskSrcRow(o){ return taskSrcList().find(r=> r['样品编号']===o['样品编号']) || null; }
    function taskSampleLines(s){
      const proj = MOCK['insp-project'] || {};
      const inst = new Map((proj['tab-category']||[]).map(c=> [c['检验类名称'], c['适用仪器类型']]));
      const cat = new Map((proj['tab-item']||[]).filter(i=> i['启用状态']!=='禁用').map(i=> [i['检验项名称'], i['所属检验类']]));
      const groups = [];
      String((s['方案项目']||'')+';'+(s['临时项目']||'')).split(/[;；]/).map(x=> x.trim()).filter(x=> x && x!=='—').forEach(name=>{
        const c = cat.get(name);
        if(!c) return;
        let g = groups.find(x=> x.检验类===c);
        if(!g){ g = { 检验类: c, 仪器类型: inst.get(c) || '—', items: [] }; groups.push(g); }
        if(!g.items.includes(name)) g.items.push(name);
      });
      return groups.map(g=> ({ 检验类: g.检验类, 仪器类型: g.仪器类型, 检验项: g.items.join('、'), 命中方案: '—', 候选班组: '—',
        分配班组: '', 分配方式: '', 行状态: '待分配', 分配人: '—', 分配时间: '—' }));
    }
    function taskWriteBack(o){
      const s = taskSrcRow(o);
      if(s) s['检验班组'] = o['检验班组'];
      const lg = flowLedgerRow(o['样品编号']);
      if(lg) lg['检验班组'] = o['检验班组'];
    }
    function writeEtaDownstreams(sampleNo, orderNo, eta){
      const etaVal = flowHas(eta) ? eta : '—';
      const overdue = flowCalcOverdue(etaVal);
      const s = flowSplitRow(sampleNo);
      if(s) s['预计完成时间'] = etaVal;
      const lg = flowLedgerRow(sampleNo);
      if(lg){
        lg['预计完成时间'] = etaVal;
        lg['逾期状态'] = overdue;
      }
      const ord = orderNo ? flowOrderOf(orderNo) : null;
      if(ord && ord.row) ord.row['预计完成时间'] = etaVal;
      const task = taskTab('tab-1').find(o=> o['样品编号']===sampleNo);
      if(task) task['预计完成时间'] = etaVal;
    }
    /** 新进入任务分派的样品先按派单方案自动分配一次 */
    function taskAutoNew(o){
      const stamp = nowStamp();
      let n = 0;
      (o._lines||[]).forEach(ln=>{
        if(ln['行状态']!=='待分配') return;
        const cands = splitDun(ln['候选班组']);
        if(cands.length!==1) return;
        Object.assign(ln, { 分配班组: cands[0], 分配方式: '自动', 行状态: '已分配', 分配人: '系统', 分配时间: stamp });
        taskLog(o, ln, '自动分配', '', cands[0], { 操作人: '系统', stamp, 说明: '命中派单方案 '+ln['命中方案'] });
        n++;
      });
      if(n) Object.assign(o, { 最近分配人: '系统', 最近分配时间: stamp });
      return n;
    }
    function taskIsKid(s){ return s['样品来源']==='样品拆分' || flowHas(s['母样编号']); }
    /** 以样品拆分的母样为数据源，一个母样一行；子样不参与分配，沿用母样的分配结果；已完成的母样移出 */
    function taskSyncAll(){
      const bag = taskTab('tab-1');
      const src = taskSrcList();
      const old = new Map(bag.filter(o=> o['样品编号']).map(o=> [o['样品编号'], o]));
      const list = [];
      src.forEach(s=>{
        if(!s['样品编号'] || s['样品状态']==='已完成' || taskIsKid(s)) return;
        const prev = old.get(s['样品编号']);
        const o = prev || { id: 'ta-'+s['样品编号'], 样品编号: s['样品编号'], 最近分配人: '—', 最近分配时间: '—', 预计完成时间: '—' };
        TASK_SAMPLE_KEYS.forEach(k=>{ o[k] = s[k] || '—'; });
        delete o['样品类型']; delete o['母样编号'];
        o._grpTime = s['取样时间'] || '';
        const kept = new Map((o._lines||[]).map(l=> [l['检验类'], l]));
        o._lines = taskSampleLines(s).map(l=>{
          const k = kept.get(l['检验类']);
          if(k) TASK_LINE_KEEP.forEach(f=>{ l[f] = k[f]; });
          return l;
        });
        o._lines.forEach(l=> taskRefreshLine(o, l));
        const auto = prev ? 0 : taskAutoNew(o);
        taskRecalc(o);
        if(auto) taskWriteBack(o);
        s._asg = { 分配状态: o['分配状态'], lines: o._lines.map(l=> ({ 检验类: l['检验类'], 检验项: l['检验项'], 分配班组: l['行状态']==='已分配' ? l['分配班组'] : '', 分析仪器: l['适用仪器'] || taskLineInstOpts(o, l)[0] || '—' })) };
        list.push(o);
      });
      bag.splice(0, bag.length, ...list);
      timeFbSyncAll();
    }
    function taskPickAssignable(rows){ return (rows||[]).slice(); }
    function timeFbNormEta(v){
      v = String(v==null ? '' : v).trim();
      return (!v || v==='—') ? '' : v;
    }
    function timeFbHasEta(v){ return !!timeFbNormEta(v); }
    function timeFbMaxEta(vals){
      const xs = (vals||[]).map(timeFbNormEta).filter(Boolean).sort();
      return xs.length ? xs[xs.length-1] : '';
    }
    function timeFbRecalc(o){
      const lines = (o._lines || []).filter(l=> l['行状态']!=='无需分配');
      const done = lines.filter(l=> timeFbHasEta(l['预计完成时间']));
      o['反馈状态'] = !lines.length || done.length===lines.length ? '完全反馈' : (done.length ? '部分反馈' : '未反馈');
      o['检验类'] = (o._lines||[]).map(l=> l['检验类']).filter(Boolean).join('、') || o['检验类'] || '—';
      o['反馈进度'] = done.length+'/'+lines.length;
      o['反馈明细'] = lines.length
        ? lines.map(l=> l['检验类']+'→'+(timeFbHasEta(l['预计完成时间']) ? timeFbNormEta(l['预计完成时间']) : '未反馈')).join('；')
        : '—';
      const teams = [...new Set((o._lines||[]).filter(l=> l['行状态']==='已分配' && l['分配班组']).map(l=> l['分配班组']))];
      o['检验班组'] = teams.join('、') || '—';
      const eta = timeFbMaxEta(done.map(l=> l['预计完成时间']));
      o['预计完成时间'] = eta || '—';
      if(!o['时间同步状态']) o['时间同步状态'] = '未同步';
      if(!o['最近同步人']) o['最近同步人'] = '—';
      if(!o['最近同步时间']) o['最近同步时间'] = '—';
    }
    function timeFbSyncAll(){
      const bag = timeFbTab('tab-1');
      const tasks = taskTab('tab-1');
      const old = new Map(bag.filter(o=> o['样品编号']).map(o=> [o['样品编号'], o]));
      const list = [];
      tasks.forEach(t=>{
        const prev = old.get(t['样品编号']);
        const o = prev || {
          id: 'tf-'+t['样品编号'], 样品编号: t['样品编号'],
          最近同步人: '—', 最近同步时间: '—', 时间同步状态: '未同步', 预计完成时间: '—'
        };
        TASK_SAMPLE_KEYS.forEach(k=>{ o[k] = t[k] || '—'; });
        o['检验类'] = t['检验类'] || '—';
        o['检验班组'] = t['检验班组'] || '—';
        o._grpTime = t._grpTime || t['取样时间'] || '';
        const kept = new Map((o._lines||[]).map(l=> [l['检验类'], l]));
        o._lines = (t._lines||[]).map(ln=>{
          const base = Object.assign({}, ln);
          const k = kept.get(ln['检验类']);
          if(k && timeFbHasEta(k['预计完成时间'])) base['预计完成时间'] = timeFbNormEta(k['预计完成时间']);
          else if(k && Object.prototype.hasOwnProperty.call(k, '预计完成时间')) base['预计完成时间'] = k['预计完成时间'] || '—';
          else if(!Object.prototype.hasOwnProperty.call(base, '预计完成时间')) base['预计完成时间'] = '—';
          return base;
        });
        // 若样品级已有预计完成时间且需反馈行仍全空，用样品级时间预填（与「我的」反馈共用）
        const need = o._lines.filter(l=> l['行状态']!=='无需分配');
        const sampleEta = timeFbNormEta(t['预计完成时间']) || timeFbNormEta((taskSrcRow(t)||{})['预计完成时间']) || timeFbNormEta((flowSplitRow(t['样品编号'])||{})['预计完成时间']);
        if(sampleEta && need.length && need.every(l=> !timeFbHasEta(l['预计完成时间']))){
          need.forEach(l=>{ l['预计完成时间'] = sampleEta; });
        }
        timeFbRecalc(o);
        list.push(o);
      });
      bag.splice(0, bag.length, ...list);
    }
    function timeFbLog(o, ln, type, from, to, extra){
      const e = extra || {};
      timeFbTab('tab-2').unshift({
        id: 'tfl-'+Date.now()+'-'+Math.random().toString(36).slice(2, 6),
        操作类型: type,
        样品编号: o['样品编号'],
        报检单号: o['报检单号'] || '—',
        物料名称: o['物料名称'] || '—',
        报检批号: o['报检批号'] || '—',
        检验类: (ln && ln['检验类']) || '—',
        原预计完成时间: from || '—',
        新预计完成时间: to || '—',
        说明: e.说明 || '—',
        操作人: e.操作人 || '管理员',
        操作时间: e.stamp || nowStamp()
      });
    }
    /* ===== 检验流程数据流转：报检单 → 待取样任务 → 取样生成样品（样品拆分 / 样品检验台账）→ 任务分派 → 数据录入 ===== */
    const FLOW_ORDER = 'insp-order', FLOW_WAIT = 'wait-samp', FLOW_LEDGER = 'ledger';
    const FLOW_ENTRY = 'entry-sample', FLOW_ENTRY_CAT = 'entry-category', FLOW_MY_TASK = 'my-task';
    const FLOW_PAGES = [FLOW_ORDER, FLOW_WAIT, SPLIT_PAGE, FLOW_LEDGER, TASK_PAGE, TIME_FB_PAGE, FLOW_ENTRY, FLOW_ENTRY_CAT, FLOW_MY_TASK, SLOC_PAGE];
    function isEntryByCat(pid){ return pid===FLOW_ENTRY_CAT || pid===FLOW_MY_TASK; }
    const FLOW_TABS = (((CFG.pages||{})[FLOW_ORDER]||{}).tabViews||[]).map(t=> ({ name: t.name, label: t.label }));
    function flowTabOf(label){ const t = FLOW_TABS.find(x=> x.label===label); return t ? t.name : ''; }
    function flowLabelOf(tab){ const t = FLOW_TABS.find(x=> x.name===tab); return t ? t.label : ''; }
    function flowBag(pid, tab){ const b = (MOCK[pid] = MOCK[pid] || {}); return (b[tab] = b[tab] || []); }
    function flowCols(pid, tab){
      const tv = ((((CFG.pages||{})[pid])||{}).tabViews||[]).find(t=> t.name===tab) || {};
      return (tv.columns||[]).map(c=> c.field).filter(f=> f && f!=='操作' && f!=='_actions');
    }
    function flowInt(v){ const n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
    function flowHas(v){ return v!=null && v!=='' && v!=='—'; }
    /** 按字段名从多个来源依次取值（「—」视为空），取不到显示「—」 */
    function flowPick(fields, srcs, fixed){
      const o = {};
      fields.forEach(k=>{
        if(fixed && Object.prototype.hasOwnProperty.call(fixed, k)){ o[k] = fixed[k]; return; }
        const s = srcs.find(x=> x && flowHas(x[k]));
        o[k] = s ? s[k] : '—';
      });
      return o;
    }
    function flowOrderOf(no){
      for(const t of FLOW_TABS){
        const r = flowBag(FLOW_ORDER, t.name).find(x=> x['报检单号']===no);
        if(r) return { tab: t.name, row: r };
      }
      return null;
    }
    function flowSplitRow(no){ return sampSplitList().find(r=> r['样品编号']===no) || null; }
    function flowLedgerRow(no){
      for(const t of FLOW_TABS){
        const r = flowBag(FLOW_LEDGER, t.name).find(x=> x['样品编号']===no);
        if(r) return r;
      }
      return null;
    }
    function flowSampleItems(s){
      return String((s['方案项目']||'')+';'+(s['临时项目']||'')).split(/[;；]/).map(x=> x.trim()).filter(x=> x && x!=='—');
    }
    /** 样品的字段来源：样品拆分行 → 母样 → 样品检验台账 → 报检单 */
    function flowSampleSrcs(s){
      const kid = s['样品来源']==='样品拆分';
      const mother = kid ? flowSplitRow(s['母样编号']) : null;
      const lg = flowLedgerRow(s['样品编号']) || (kid ? flowLedgerRow(s['母样编号']) : null);
      const od = (flowOrderOf(s['报检单号'])||{}).row || null;
      const matName = [s, mother, lg, od].map(x=> x && flowHas(x['物料名称']) ? x['物料名称'] : '').find(Boolean);
      const matSpec = [s, mother, lg, od].map(x=> x && flowHas(x['物料规格']) ? x['物料规格'] : '').find(Boolean);
      const sampleName = [s, mother, lg, od].map(x=> x && flowHas(x['样品名称']) ? x['样品名称'] : '').find(Boolean);
      const sampleSpec = [s, mother, lg, od].map(x=> x && flowHas(x['样品规格']) ? x['样品规格'] : '').find(Boolean);
      const needDone = [s, mother, lg, od].map(x=> x && flowHas(x['需求完成时间']) ? x['需求完成时间'] : '').find(Boolean);
      return [s, mother, lg, od, { 样品名称: matName || sampleName, 样品规格: matSpec || sampleSpec, 物料名称: matName || sampleName, 物料规格: matSpec || sampleSpec, 需求完成时间: needDone || '' }];
    }
    function flowLedgerNew(tab, sp, src){
      return Object.assign(flowPick(flowCols(FLOW_LEDGER, tab), [sp, src], {
        样品状态: '待检验', 检验结论: '—', 偏差结论: '—', 异常描述: '—', 检验完成时间: '—', 检验人: '—', 关闭时间: '—', 关闭人: '—', 关闭说明: '—'
      }), { id: 'lg-'+sp['样品编号'] });
    }
    /** 报检单：件数与单据状态按样品回算；已关闭不变 */
