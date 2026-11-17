    const RPT_PAGE = 'np-0104-08';
    const SR_DIMS = ['周','月','季度','半年','年'];
    const SR_WEEK = ['周一','周二','周三','周四','周五','周六','周日'];
    const SR_TABS = { 'tab-pi':'采购来料', 'tab-pp':'生产过程', 'tab-pm':'生产物料' };
    const srVisible = ref(false);
    const srMode = ref('add');
    const srEditId = ref('');
    const srForm = reactive({ targetTab:'tab-pi', code:'', name:'', cycle:'多次', dim:'周', slot1:'周二', slot2:'1', clock:'08:00', remark:'', enabled:true, mats:'', points:'', party:'', minN:25, scheme:'', items:[] });
    const srTitle = computed(()=> srMode.value==='add' ? '新增' : (srMode.value==='copy' ? '复制' : '编辑'));
    const srSaveTab = ()=> srMode.value==='copy' ? srForm.targetTab : activeTab.value;
    const srPartyLabel = computed(()=> srSaveTab()==='tab-pi' ? '供应商信息' : (srSaveTab()==='tab-pm' ? '客户信息' : ''));
    const srMonthOpts = computed(()=>{
      const n = srForm.dim==='季度' ? 3 : (srForm.dim==='半年' ? 6 : 12);
      return Array.from({length:n}, (_,i)=> srForm.dim==='年' ? ((i+1)+'月') : ('第'+(i+1)+'月'));
    });
    function srBag(tab){
      const bag = MOCK[RPT_PAGE] = MOCK[RPT_PAGE] || {};
      const k = tab || activeTab.value;
      return bag[k] || (bag[k] = []);
    }
    function srPlanAllRows(){ return Object.keys(SR_TABS).flatMap(t=> srBag(t)); }
    function srQuantSet(){
      const set = {};
      (((MOCK['insp-project']||{})['tab-item'])||[]).forEach(r=>{ if(r['检验项类型']==='定量' && r['启用状态']!=='禁用') set[r['检验项名称']] = 1; });
      return set;
    }
    const srSchemeOpts = computed(()=>{
      const tab = srSaveTab();
      const rows = ((MOCK['insp-scheme']||{})[tab]||[]).filter(r=> r['启用状态']!=='禁用');
      const mats = splitDun(srForm.mats).map(s=> s.split(' / ')[0].trim()).filter(Boolean);
      const points = splitDun(srForm.points);
      const hit = rows.filter(r=>{
        const mm = String(r['适用物料']||'').split(/[,，]/).map(s=>s.trim());
        const pp = splitDun(r['适用采样点']);
        if(mats.length && !mats.some(c=> mm.includes(c))) return false;
        if(points.length && !points.some(p=> pp.includes(p))) return false;
        return true;
      });
      return (hit.length ? hit : rows).map(r=> ({ code:r['检验方案编码'], name:r['检验方案名称'], items:r['检验项信息']||'' }));
    });
    const srItemOpts = computed(()=>{
      const quant = srQuantSet();
      const hit = srSchemeOpts.value.find(o=> o.name===srForm.scheme);
      const names = hit ? String(hit.items).split(/[;；、,，]/).map(s=>s.trim()).filter(n=> quant[n]) : Object.keys(quant);
      return names;
    });
    function srFillItems(){ srForm.items = srItemOpts.value.slice(); }
    function srApplyPick(field, text){
      if(field==='物料信息') srForm.mats = text;
      else if(field==='采样点') srForm.points = text;
      else {
        const parts = String(text||'').split(' / ').map(s=> s.trim()).filter(Boolean);
        srForm.party = parts.length > 1 ? parts.slice(1).join(' / ') : (parts[0] || '');
      }
    }
    function srOnDim(){
      if(srForm.dim==='周'){
        if(!SR_WEEK.includes(srForm.slot1)) srForm.slot1 = '周二';
      } else if(srForm.dim!=='月'){
        const opts = srMonthOpts.value;
        if(!opts.includes(srForm.slot1)) srForm.slot1 = opts[0] || '';
      }
    }
    function srOnTarget(){
      srForm.party = '';
      if(!srSchemeOpts.value.some(o=> o.name===srForm.scheme)){
        srForm.scheme = '';
        srForm.items = [];
      }
    }
    function openSrPick(field){
      openIoPick(IO_PICK_FIELD[field], 'srPlan', field, field==='物料信息' || field==='采样点');
    }
    function blankSr(){
      Object.assign(srForm, { targetTab:activeTab.value, code:'', name:'', cycle:'多次', dim:'周', slot1:'周二', slot2:'1', clock:'08:00', remark:'', enabled:true, mats:'', points:'', party:'', minN:25, scheme:'', items:[] });
    }
    function openSr(mode, row){
      srMode.value = mode;
      srEditId.value = row && mode!=='copy' ? row.id : '';
      blankSr();
      if(row){
        const src = srBag(activeTab.value).find(r=> r.id===row.id) || row;
        Object.assign(srForm, {
          targetTab: activeTab.value,
          code: mode==='copy' ? '' : (src['方案编码']||''),
          name: src['方案名称']||'',
          cycle: src['循环方式']||'多次',
          dim: src['日期维度']||'周',
          slot1: src._slot1 || '周二',
          slot2: src._slot2 || '1',
          clock: src._clock || '08:00',
          remark: src['备注']||'',
          enabled: src['启用状态']!=='禁用',
          mats: src['物料信息']||'',
          points: src['采样点']||'',
          party: src['供应商信息'] || src['客户信息'] || '',
          minN: parseInt(src['最少样本数'],10) || 25,
          scheme: src['检验方案']||'',
          items: splitDun(src['检验项'])
        });
      }
      srVisible.value = true;
    }
    function srPlanText(){
      const c = srForm.clock || '';
      if(srForm.dim==='周') return (srForm.slot1||'') + ' ' + c;
      if(srForm.dim==='月') return (srForm.slot2||'') + '日 ' + c;
      return (srForm.slot1||'') + ' ' + (srForm.slot2||'') + '日 ' + c;
    }
    function srSlotDate(){
      const now = new Date();
      const parts = String(srForm.clock||'00:00').split(':');
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(parts[0],10)||0, parseInt(parts[1],10)||0, 0);
      if(srForm.dim==='周'){
        const map = {周日:0,周一:1,周二:2,周三:3,周四:4,周五:5,周六:6};
        const want = map[srForm.slot1];
        if(want==null) return null;
        d.setDate(now.getDate() + (want - now.getDay() + 7) % 7);
        return d;
      }
      const day = parseInt(srForm.slot2, 10);
      if(!day) return null;
      d.setDate(day);
      if(srForm.dim==='年' || srForm.dim==='季度' || srForm.dim==='半年'){
        const m = parseInt(String(srForm.slot1).replace(/\D/g,''), 10);
        if(m) d.setMonth(m - 1);
      }
      return d;
    }
    function saveSr(){
      const code = String(srForm.code||'').trim();
      const name = String(srForm.name||'').trim();
      if(!code){ ElMessage.warning('请输入方案编码'); return; }
      if(!name){ ElMessage.warning('请输入方案名称'); return; }
      if(!srForm.clock || (srForm.dim==='周' && !srForm.slot1) || (srForm.dim!=='周' && !srForm.slot2) || (srForm.dim!=='周' && srForm.dim!=='月' && !srForm.slot1)){ ElMessage.warning('请选择计划开具时间'); return; }
      if(srForm.enabled && srForm.cycle==='单次'){
        const when = srSlotDate();
        if(when && when.getTime() < Date.now()){ ElMessage.warning('计划开具时间不可早于当前时间'); return; }
      }
      if(!String(srForm.mats||'').trim()){ ElMessage.warning('请选择物料信息'); return; }
      if(!(Number(srForm.minN) >= 1)){ ElMessage.warning('请输入最少样本数'); return; }
      if(!srForm.scheme){ ElMessage.warning('请选择检验方案'); return; }
      if(!(srForm.items||[]).length){ ElMessage.warning('请选择检验项'); return; }
      const others = srPlanAllRows().filter(r=> r.id!==srEditId.value);
      if(others.some(r=> r['方案编码']===code)){ ElMessage.warning('方案编码已存在'); return; }
      if(others.some(r=> r['方案名称']===name)){ ElMessage.warning('方案名称已存在'); return; }
      const tab = srSaveTab();
      const party = tab==='tab-pi' ? '供应商信息' : (tab==='tab-pm' ? '客户信息' : '');
      const scheme = srSchemeOpts.value.find(o=> o.name===srForm.scheme);
      const payload = {
        方案编码: code, 方案名称: name, 执行周期: '每'+srForm.dim, 循环方式: srForm.cycle, 日期维度: srForm.dim,
        计划开具时间: srPlanText().trim(), 物料信息: srForm.mats, 采样点: srForm.points,
        最少样本数: String(srForm.minN), 检验方案: srForm.scheme, 检验项: (srForm.items||[]).join('、'),
        备注: String(srForm.remark||'').trim(), 启用状态: srForm.enabled ? '启用' : '禁用',
        _slot1: srForm.slot1, _slot2: srForm.slot2, _clock: srForm.clock, _schemeId: scheme ? scheme.code : ''
      };
      if(party) payload[party] = srForm.party || '';
      if(srMode.value==='edit'){
        const cur = srBag(activeTab.value).find(r=> r.id===srEditId.value);
        if(!cur){ ElMessage.warning('该方案已不存在'); return; }
        Object.assign(cur, payload);
        ElMessage.success('已保存');
      } else {
        srBag(tab).unshift(Object.assign({ id:'sr-'+Date.now(), 创建人: CI_OPERATOR, 创建时间: nowStamp(), _used:false }, payload));
        ElMessage.success(srMode.value==='copy' ? '已复制到'+SR_TABS[tab] : '已新增');
      }
      srVisible.value = false;
      bumpStore();
    }
    function deleteSr(){
      const rows = srBag().filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> r._used)){ ElMessage.warning('此数据正在使用，不可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确定删除所选 '+rows.length+' 条方案吗？删除后不可恢复。', '提示', { type:'warning', confirmButtonText:'确定', cancelButtonText:'取消' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        MOCK[RPT_PAGE][activeTab.value] = srBag().filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 条数据');
      }).catch(()=>{});
    }
    const srSpcVisible = ref(false);
    const srSpcMenu = ref('rule');
    const srSpcKey = ref(0);
    const srSpcId = ref('');
    const SR_FILTER_ROWS = [{ key:'ooc', label:'N倍OOC删除' }, { key:'oos', label:'N倍OOS删除' }, { key:'plus', label:'N倍+Sigma删除' }, { key:'minus', label:'N倍-Sigma删除' }];
    const SR_ZERO = [
      '不过滤数据（若值不存在/0，不过滤该点，0侧默认0，空值则中断）',
      '不过滤数据（若值不存在/0，不过滤该点，均默认0）',
      '部分过滤数据（若值不存在过滤该点，若值为0不过滤该点，0侧默认0）',
      '全部过滤数据（若值不存在/0，均过滤该点）'
    ];
    const SR_ROUND = ['实测值','报出值'];
    const SR_TAKE = ['同批次采样','同批次平均值','同批次所有值','同批次最大值','同批次最小值','同批次首样'];
    const SR_GROUP_SECS = [{ key:'zero', title:'I图样本值不存在或为0的规则' }, { key:'round', title:'I图样本值修约规则' }, { key:'take', title:'I图样本取值方式' }, { key:'xbar', title:'Xbar/R/S样本取值方式' }];
    const SR_LIMIT_I = ['USL','LSL','UCL(固定)','LCL(固定)','CL','Average','UCL(计算)','LCL(计算)','UWL','LWL'];
    const SR_LIMIT_FULL = ['USL','LSL','UCL(固定)','LCL(固定)','CL','Average','UCL(计算)','LCL(计算)'];
    const SR_LIMIT_SHORT = ['UCL(固定)','LCL(固定)','CL','Average','UCL(计算)','LCL(计算)'];
    const SR_CHART_TYPES = ['I图','MR图','R图','S图','XbarR图','XbarS图'];
    const SR_TIP_NAMES = ['I图','MR图','XbarR图','R图','XbarS图','S图'];
    const SR_TIP_FIELDS = ['Average','CL','LCL','LSL','UCL','USL','异常说明','样本值','横坐标值','UWL','LWL'];
    const SR_DASH = ['实线','虚线','点线'];
    function srBlankFilter(){ return { ooc:null, oos:null, plus:null, minus:null }; }
    function srBlankGroup(){ return { zero: SR_ZERO[0], round:'实测值', take:'同批次所有值', xbar:'固定子组容量', xbarN:2 }; }
    function srLimitFlags(keys, on){ const o = {}; keys.forEach(k=> { o[k] = on.indexOf(k) >= 0; }); return o; }
    function srBlankLimits(){
      return [
        { name:'I图', keys: SR_LIMIT_I.slice(), flags: srLimitFlags(SR_LIMIT_I, ['USL','LSL','UCL(固定)','LCL(固定)','CL']) },
        { name:'MR图', keys: SR_LIMIT_SHORT.slice(), flags: srLimitFlags(SR_LIMIT_SHORT, ['UCL(固定)','LCL(固定)','CL']) },
        { name:'XbarR图', keys: SR_LIMIT_FULL.slice(), flags: srLimitFlags(SR_LIMIT_FULL, ['UCL(固定)','LCL(固定)','CL']) },
        { name:'R图', keys: SR_LIMIT_SHORT.slice(), flags: srLimitFlags(SR_LIMIT_SHORT, ['UCL(固定)','LCL(固定)','CL']) },
        { name:'XbarS图', keys: SR_LIMIT_FULL.slice(), flags: srLimitFlags(SR_LIMIT_FULL, ['UCL(固定)','LCL(固定)','CL']) },
        { name:'S图', keys: SR_LIMIT_SHORT.slice(), flags: srLimitFlags(SR_LIMIT_SHORT, ['UCL(固定)','LCL(固定)','CL']) }
      ];
    }
    function srBlankLines(){
      return [
        { name:'主数据', enabled:true, color:'#1677ff', dash:'实线', width:1 },
        { name:'USL/LSL', enabled:true, color:'#f5222d', dash:'实线', width:1 },
        { name:'UCL/LCL', enabled:true, color:'#fa8c16', dash:'实线', width:1 },
        { name:'UWL/LWL', enabled:true, color:'#fadb14', dash:'实线', width:1 },
        { name:'CL', enabled:true, color:'#8c8c8c', dash:'实线', width:1 },
        { name:'Average', enabled:true, color:'#d9d9d9', dash:'实线', width:1 }
      ];
    }
    function srBlankPoints(){
      return [
        { name:'正常点', color:'#000000', size:2, tip:'第一优先' },
        { name:'不合格点', color:'#f5222d', size:2, tip:'包含 OOS，第一优先' },
        { name:'偏差点', color:'#fa8c16', size:2, tip:'包含 OOC/OOW/OOT，第二优先' }
      ];
    }
    function srBlankTip(name){ const fields = {}; SR_TIP_FIELDS.forEach(k=> { fields[k] = true; }); return { name, all:true, fields }; }
    function srBlankView(){ return { types: SR_CHART_TYPES.slice(), lines: srBlankLines(), points: srBlankPoints(), tips: SR_TIP_NAMES.map(srBlankTip) }; }
    const srSpc = reactive({ mode:'使用规则', minN:'25', lines:[], filter: srBlankFilter(), group: srBlankGroup(), limits: srBlankLimits(), trend:'历史变更趋势值', view: srBlankView() });
    const srRuleNames = computed(()=> (((MOCK['spc-rule']||{}).main)||[]).slice().sort((a,b)=> (a.sorted||0)-(b.sorted||0)).map(r=> r['现行名称']).filter(Boolean));
    function srToggleAll(line){ srRuleNames.value.forEach(k=> { line.rules[k] = line.all; }); }
    function srToggleOne(line){ line.all = srRuleNames.value.every(k=> line.rules[k]); }
    function srAsk(msg, fn){ ElementPlus.ElMessageBox.confirm(msg, '提示', { type:'warning', confirmButtonText:'确定', cancelButtonText:'取消' }).then(fn).catch(()=>{}); }
    function srOnTake(){
      if(srSpc.group.take==='同批次所有值' || srSpc.group.take==='所有值'){ srSpc.group.xbar = '同批次一组'; srSpc.group.xbarN = 2; }
      else { srSpc.group.xbar = '固定子组容量'; const n = Number(srSpc.group.xbarN); if(!(n>=2 && n<=10)) srSpc.group.xbarN = 2; }
    }
    function srFixXbar(){ if(srSpc.group.take!=='同批次所有值' && srSpc.group.take!=='所有值'){ srSpc.group.xbar = '固定子组容量'; const n = Number(srSpc.group.xbarN); if(!(n>=2 && n<=10)) srSpc.group.xbarN = 2; } }
    function srEnsureTips(){
      const have = {};
      (srSpc.view.tips||[]).forEach(t=> { have[t.name] = t; });
      srSpc.view.tips = SR_TIP_NAMES.filter(n=> (srSpc.view.types||[]).indexOf(n)>=0).map(n=> have[n] || srBlankTip(n));
    }
    function srToggleLimit(chart, key){
      const fixed = ['UCL(固定)','LCL(固定)'];
      const calc = ['UCL(计算)','LCL(计算)'];
      if(chart.flags[key] && fixed.indexOf(key)>=0) calc.forEach(k=> { if(k in chart.flags) chart.flags[k] = false; });
      if(chart.flags[key] && calc.indexOf(key)>=0) fixed.forEach(k=> { if(k in chart.flags) chart.flags[k] = false; });
    }
    function srToggleTipAll(row){ SR_TIP_FIELDS.forEach(k=> { row.fields[k] = row.all; }); }
    function srToggleTipOne(row){ row.all = SR_TIP_FIELDS.every(k=> row.fields[k]); }
    function openSrSpc(row){
      const src = srBag().find(r=> r.id===row.id) || row;
      const saved = src._spc || {};
      const savedMap = {};
      (saved.lines||[]).forEach(l=> { savedMap[l.name] = l; });
      srSpcId.value = src.id;
      srSpc.mode = saved.mode || '使用规则';
      srSpc.minN = src['最少样本数'] || '25';
      srSpc.lines = splitDun(src['检验项']).map(name=>{
        const prev = savedMap[name];
        const rules = {};
        srRuleNames.value.forEach(k=> { rules[k] = prev && prev.rules ? prev.rules[k]!==false : true; });
        return { name, all: srRuleNames.value.every(k=> rules[k]), rules };
      });
      Object.assign(srSpc.filter, srBlankFilter(), saved.filter || {});
      Object.assign(srSpc.group, srBlankGroup(), saved.group || {});
      srSpc.group.xbarN = Number(srSpc.group.xbarN) || 2;
      const baseLimits = srBlankLimits();
      const savedLimits = {};
      (saved.limits||[]).forEach(c=> { savedLimits[c.name] = c; });
      srSpc.limits = baseLimits.map(c=>{
        const prev = savedLimits[c.name];
        if(prev && prev.flags) c.keys.forEach(k=> { if(k in prev.flags) c.flags[k] = !!prev.flags[k]; });
        return c;
      });
      srSpc.trend = saved.trend || '历史变更趋势值';
      const view = saved.view || {};
      const lineMap = {};
      (view.lines||[]).forEach(l=> { lineMap[l.name] = l; });
      srSpc.view.types = (view.types && view.types.length) ? view.types.slice() : SR_CHART_TYPES.slice();
      srSpc.view.lines = srBlankLines().map(l=> Object.assign(l, lineMap[l.name] || {}));
      const pointMap = {};
      (view.points||[]).forEach(p=> { pointMap[p.name] = p; });
      srSpc.view.points = srBlankPoints().map(p=> Object.assign(p, pointMap[p.name] || {}));
      srSpc.view.tips = (view.tips||[]).map(t=> ({ name:t.name, all:t.all!==false, fields:Object.assign(srBlankTip(t.name).fields, t.fields||{}) }));
      srEnsureTips();
      srFixXbar();
      srSpcMenu.value = 'rule';
      srSpcKey.value += 1;
      srSpcVisible.value = true;
    }
    function srRestore(){
      srAsk('确定恢复默认吗？将改回使用规则，并勾选全部判异规则。', ()=>{
        srSpc.mode = '使用规则';
        srSpc.lines.forEach(line=>{
          line.all = true;
          srRuleNames.value.forEach(k=> { line.rules[k] = true; });
        });
      });
    }
    function srClearFilter(){ srAsk('确定清空全部设置N吗？', ()=>{ Object.assign(srSpc.filter, srBlankFilter()); }); }
    function srRestoreGroup(key){
      srAsk('确定恢复默认吗？', ()=>{
        const blank = srBlankGroup();
        if(key==='zero') srSpc.group.zero = blank.zero;
        else if(key==='round') srSpc.group.round = blank.round;
        else if(key==='take'){ srSpc.group.take = blank.take; srOnTake(); }
        else { srSpc.group.xbar = (srSpc.group.take==='同批次所有值' || srSpc.group.take==='所有值') ? '同批次一组' : '固定子组容量'; srSpc.group.xbarN = 2; }
      });
    }
    function srRestoreLimit(chart){
      srAsk('确定恢复默认吗？', ()=>{
        if(chart && chart.flags){
          const blank = srBlankLimits().find(c=> c.name===chart.name);
          if(blank) chart.keys.forEach(k=> { chart.flags[k] = !!blank.flags[k]; });
        } else srSpc.trend = '历史变更趋势值';
      });
    }
    function srRestoreView(){ srAsk('确定恢复默认吗？', ()=>{ const view = srBlankView(); srSpc.view.types = view.types; srSpc.view.lines = view.lines; srSpc.view.points = view.points; srSpc.view.tips = view.tips; }); }
    function openChartSpcSettings(){
      const bag = (MOCK._spcChartSettings = MOCK._spcChartSettings || {});
      const item = String(query['检验项']||'').trim() || '高锰酸钾消耗量';
      openSrSpc({ id: '_chart_spc', 检验项: item, 最少样本数: '25', _spc: bag });
    }
    function saveSrSpc(){
      const isChart = srSpcId.value === '_chart_spc';
      const cur = isChart ? null : srBag().find(r=> r.id===srSpcId.value);
      if(!isChart && !cur){ srSpcVisible.value = false; return; }
      for(let i=0;i<SR_FILTER_ROWS.length;i++){
        const raw = srSpc.filter[SR_FILTER_ROWS[i].key];
        if(raw===null || raw===undefined || raw===''){ srSpc.filter[SR_FILTER_ROWS[i].key] = null; continue; }
        const num = Number(raw);
        if(!(num>=0) || !/^\d+(\.\d{1,3})?$/.test(String(raw))){ ElMessage.warning('设置N请输入数字，最多3位小数'); srSpcMenu.value = 'filter'; return; }
        srSpc.filter[SR_FILTER_ROWS[i].key] = num;
      }
      const n = Number(srSpc.group.xbarN);
      if(srSpc.group.xbar==='固定子组容量'){
        if(!(n>=2 && n<=10)){ ElMessage.warning('固定子组容量需为2到10的正整数'); srSpcMenu.value = 'group'; return; }
      } else if(!(n>=1)){ ElMessage.warning('请输入子组容量'); srSpcMenu.value = 'group'; return; }
      const payload = {
        mode: srSpc.mode,
        lines: srSpc.lines.map(l=> ({ name:l.name, rules:Object.assign({}, l.rules) })),
        filter: Object.assign({}, srSpc.filter),
        group: { zero: srSpc.group.zero, round: srSpc.group.round, take: srSpc.group.take, xbar: srSpc.group.xbar, xbarN: n },
        limits: srSpc.limits.map(c=> ({ name:c.name, flags:Object.assign({}, c.flags) })),
        trend: srSpc.trend,
        view: {
          types: srSpc.view.types.slice(),
          lines: srSpc.view.lines.map(l=> Object.assign({}, l)),
          points: srSpc.view.points.map(p=> Object.assign({}, p)),
          tips: srSpc.view.tips.map(t=> ({ name:t.name, all:t.all, fields:Object.assign({}, t.fields) }))
        }
      };
      if(isChart){
        Object.keys(MOCK._spcChartSettings||{}).forEach(k=> delete MOCK._spcChartSettings[k]);
        Object.assign(MOCK._spcChartSettings = MOCK._spcChartSettings || {}, payload);
      } else {
        cur._spc = payload;
      }
      srSpcVisible.value = false;
      bumpStore();
      ElMessage.success('SPC设置已保存');
    }
    const AC_PAGE = 'np-0104-09';
    const AC_METRICS = ['UCL','LCL','MRUCL','MRLCL','Xbar(R)UCL','Xbar(R)LCL','Xbar(S)UCL','Xbar(S)LCL','RUCL','RLCL','SUCL','SLCL'];
    const AC_TABS = { 'tab-pi':'采购来料', 'tab-pp':'生产过程', 'tab-pm':'生产物料' };
    const acVisible = ref(false);
    const acMode = ref('add');
    const acEditId = ref('');
    const acForm = reactive({ targetTab:'tab-pi', code:'', name:'', cycle:'多次', days:null, unit:'天', start:'', remark:'', enabled:true, mats:'', points:'', party:'', minN:25, schemes:[], metrics:AC_METRICS.slice() });
    const acTitle = computed(()=> acMode.value==='add' ? '新增' : (acMode.value==='copy' ? '复制' : '编辑'));
    const acSaveTab = ()=> acMode.value==='copy' ? acForm.targetTab : activeTab.value;
    const acPartyLabel = computed(()=> acSaveTab()==='tab-pi' ? '供应商信息' : (acSaveTab()==='tab-pm' ? '客户信息' : ''));
    function acBag(tab){
      const bag = MOCK[AC_PAGE] = MOCK[AC_PAGE] || {};
      const k = tab || activeTab.value;
      return bag[k] || (bag[k] = []);
    }
    function acAllRows(){ return Object.keys(AC_TABS).flatMap(t=> acBag(t)); }
    const acSchemeOpts = computed(()=>{
      const tab = acSaveTab();
      const rows = ((MOCK['insp-scheme']||{})[tab]||[]).filter(r=> r['启用状态']!=='禁用');
      const mats = splitDun(acForm.mats).map(s=> s.split(' / ')[0].trim()).filter(Boolean);
      const points = splitDun(acForm.points);
      const hit = rows.filter(r=>{
        const mm = String(r['适用物料']||'').split(/[,，]/).map(s=>s.trim());
        const pp = splitDun(r['适用采样点']);
        if(mats.length && !mats.some(c=> mm.includes(c))) return false;
        if(points.length && !points.some(p=> pp.includes(p))) return false;
        return true;
      });
      return (hit.length ? hit : rows).map(r=> ({ code:r['检验方案编码'], name:r['检验方案名称'] }));
    });
    function acSyncSchemes(){
      const names = new Set(acSchemeOpts.value.map(o=> o.name));
      acForm.schemes = (acForm.schemes||[]).filter(n=> names.has(n));
    }
    watch(()=> acForm.mats+'|'+acForm.points, ()=> { if(acVisible.value) acSyncSchemes(); });
    function acApplyPick(field, text){
      if(field==='物料信息') acForm.mats = text;
      else if(field==='采样点') acForm.points = text;
      else {
        const parts = String(text||'').split(' / ').map(s=> s.trim()).filter(Boolean);
        acForm.party = parts.length > 1 ? parts.slice(1).join(' / ') : (parts[0] || '');
      }
    }
    function openAcPick(field){
      openIoPick(IO_PICK_FIELD[field], 'acPlan', field, field==='物料信息' || field==='采样点');
    }
    function blankAc(){
      Object.assign(acForm, { targetTab:activeTab.value, code:'', name:'', cycle:'多次', days:null, unit:'天', start:'', remark:'', enabled:true, mats:'', points:'', party:'', minN:25, schemes:[], metrics:AC_METRICS.slice() });
    }
    function openAc(mode, row){
      acMode.value = mode;
      acEditId.value = row && mode!=='copy' ? row.id : '';
      blankAc();
      if(row){
        const src = acBag(activeTab.value).find(r=> r.id===row.id) || row;
        const days = parseInt(String(src['执行周期']||''), 10);
        Object.assign(acForm, {
          targetTab: activeTab.value,
          code: mode==='copy' ? '' : (src['方案编码']||''),
          name: src['方案名称']||'',
          cycle: src['循环方式']||'多次',
          days: days || null,
          unit: '天',
          start: src['计划开始时间']||'',
          remark: src['备注']||'',
          enabled: src['启用状态']!=='禁用',
          mats: src['物料信息']||'',
          points: src['采样点']||'',
          party: src['供应商信息'] || src['客户信息'] || '',
          minN: parseInt(src['最少样本数'],10) || 25,
          schemes: splitDun(src['检验方案']),
          metrics: splitDun(src['计算指标']).filter(n=> AC_METRICS.includes(n))
        });
        if(!acForm.metrics.length) acForm.metrics = AC_METRICS.slice();
      }
      acVisible.value = true;
    }
    function acOnTarget(){
      acForm.party = '';
      acSyncSchemes();
    }
