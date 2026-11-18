    function batchTraceInit(){
      batchTrace.lot = 'KRF-260912';
      batchTrace.dirs = ['正向追溯','反向追溯'];
      batchTrace.tab = '关系总览';
      batchTrace.scale = 1;
      batchTrace.selected = 'KRF-260912';
      batchTrace.collapsed = {};
      batchTrace.query();
    }
    function batchRelEmptyLine(){
      return { _i: Date.now()+Math.random(), '来源物料':'', '来源批号':'', '来源物料编码':'', '来源物料名称':'', '来源物料规格':'', '来源物料种类':'' };
    }
    function batchRelAddLine(){ formLineRows.value.push(batchRelEmptyLine()); }
    function batchRelCopyLine(i){
      const src = formLineRows.value[i] || {};
      formLineRows.value.splice(i+1, 0, Object.assign({}, src, { _i: Date.now()+Math.random() }));
    }
    function batchRelDelLine(i){
      if(formLineRows.value.length<=1){ ElMessage.warning('至少保留一行来源物料'); return; }
      formLineRows.value.splice(i, 1);
    }
    function envStatNames(){
      return ((MOCK['np-0501-01']||{}).main||[]).map(r=> r['过程监测名称']).filter(Boolean);
    }
    function envStatItemOptions(){
      const name = envStat.name;
      const set = [];
      const push = (n)=>{ if(n && !set.includes(n)) set.push(n); };
      envMonLinesFor(name, '').forEach(l=> push(l['采集项名称']));
      ((MOCK['np-0502-01']||{}).main||[]).forEach(r=>{ if(r['过程监测名称']===name) push(r['采集项名称']); });
      return set;
    }
    function envStatOnName(){
      envStat.items = envStatItemOptions().slice();
    }
    function envStatRound3(n){
      return (Math.round((n + Number.EPSILON) * 1000) / 1000).toFixed(3);
    }
    function envStatNumText(n){
      if(n==null || !Number.isFinite(n)) return '/';
      if(Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
      return envStatRound3(n);
    }
    function envStatInRange(t){
      const d = String(t||'').slice(0, 10);
      const range = envStat.date;
      if(!Array.isArray(range) || !range[0] || !range[1]) return false;
      return d >= range[0] && d <= range[1];
    }
    function envStatPoints(name, item){
      const rules = envStat.rules;
      const pts = [];
      const seen = new Set();
      ((MOCK['np-0502-01']||{}).main||[]).forEach(r=>{
        if(r['过程监测名称']!==name || r['采集项名称']!==item) return;
        if(!envStatInRange(r['采集时间'])) return;
        const raw = String(r['结果值']??'').trim();
        if(rules.dropEmpty && !raw) return;
        if(!/^\d+(\.\d+)?$/.test(raw) || Number(raw) <= 0) return;
        const key = r['采集时间'] + '|' + raw;
        if(seen.has(key)) return;
        seen.add(key);
        pts.push({ 采集时间: r['采集时间'], n: Number(raw), 结果值: raw, 单位: r['采集项单位']||'', 采集项名称: item, 来源: '台账' });
      });
      (ENV_STAT_SERIES[item]||[]).forEach(pair=>{
        if(!envStatInRange(pair[0])) return;
        const key = pair[0] + '|' + pair[1];
        if(seen.has(key)) return;
        seen.add(key);
        pts.push({ 采集时间: pair[0], n: Number(pair[1]), 结果值: pair[1], 单位: '', 采集项名称: item, 来源: '演示补齐' });
      });
      pts.sort((a,b)=> String(a['采集时间']).localeCompare(String(b['采集时间'])));
      return pts;
    }
    function envStatLimits(name, item){
      const line = envMonLinesFor(name, '').find(l=> l['采集项名称']===item) || {};
      const ledger = ((MOCK['np-0502-01']||{}).main||[]).find(r=> r['过程监测名称']===name && r['采集项名称']===item) || {};
      const pick = (k)=> envMonParseLimit(line[k] || ledger[k], k);
      return { USL: pick('USL'), LSL: pick('LSL'), UCL: pick('UCL'), LCL: pick('LCL'), unit: line['采集项单位'] || ledger['采集项单位'] || '' };
    }
    function envStatSvg(points, show){
      const nums = points.map(p=> p.n);
      const bounds = nums.slice();
      Object.keys(show).forEach(k=>{ if(show[k]!=null) bounds.push(show[k]); });
      let min = Math.min.apply(null, bounds), max = Math.max.apply(null, bounds);
      if(!Number.isFinite(min) || min===max){ min = (Number.isFinite(min)?min:0) - 1; max = min + 2; }
      const pad = (max - min) * 0.14;
      min -= pad; max += pad;
      const W = 720, H = 236, L = 46, R = 16, T = 28, B = 36;
      const iw = W - L - R, ih = H - T - B;
      const x = (i)=> L + (points.length<=1 ? iw/2 : i * iw / (points.length - 1));
      const y = (v)=> T + (max - v) / (max - min) * ih;
      const colors = { USL:'#ef4444', LSL:'#ef4444', UCL:'#f59e0b', LCL:'#f59e0b', CL:'#16a34a' };
      const rules = Object.keys(show).filter(k=> show[k]!=null).map(k=>{
        const yy = y(show[k]).toFixed(1);
        return '<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="'+colors[k]+'" stroke-dasharray="4 3" stroke-width="1"/>'
          + '<text x="'+(L+2)+'" y="'+(Number(yy)-3)+'" fill="'+colors[k]+'" font-size="10">'+k+' '+envStatNumText(show[k])+'</text>';
      }).join('');
      const d = points.map((p,i)=> (i?'L':'M') + x(i).toFixed(1) + ' ' + y(p.n).toFixed(1)).join(' ');
      const dots = points.map((p,i)=>{
        const over = (show.USL!=null && p.n>show.USL) || (show.LSL!=null && p.n<show.LSL);
        const ooc = !over && ((show.UCL!=null && p.n>show.UCL) || (show.LCL!=null && p.n<show.LCL));
        const fill = over ? '#ef4444' : (ooc ? '#f59e0b' : '#2563eb');
        return '<circle cx="'+x(i).toFixed(1)+'" cy="'+y(p.n).toFixed(1)+'" r="2.4" fill="'+fill+'"/>';
      }).join('');
      const step = Math.max(1, Math.ceil(points.length / 8));
      const labels = points.map((p,i)=>{
        if(i%step && i!==points.length-1) return '';
        const tx = x(i).toFixed(1), ty = (H-8);
        return '<text x="'+tx+'" y="'+ty+'" fill="#64748b" font-size="10" text-anchor="end" transform="rotate(-35 '+tx+' '+(H-18)+')">'+String(p['采集时间']).slice(5,16)+'</text>';
      }).join('');
      const ticks = [0,1,2,3].map(i=>{
        const v = min + (max-min)*i/3;
        return '<text x="4" y="'+(y(v)+3).toFixed(1)+'" fill="#94a3b8" font-size="10">'+envStatNumText(v)+'</text>';
      }).join('');
      return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">' + ticks + rules
        + '<path d="'+d+'" fill="none" stroke="#2563eb" stroke-width="1.4"/>' + dots + labels + '</svg>';
    }
    function envStatBuild(){
      const name = envStat.name;
      const hit = envMonSchemeOf(name);
      const schemeName = (hit && hit.scheme && hit.scheme['采集方案名称']) || '/';
      const charts = [];
      const rows = [];
      const samples = [];
      (envStat.items||[]).forEach(item=>{
        const pts = envStatPoints(name, item);
        const lim = envStatLimits(name, item);
        pts.forEach(p=>{ if(!p['单位']) p['单位'] = lim.unit; });
        const nums = pts.map(p=> p.n);
        const avg = nums.length ? nums.reduce((s,n)=> s+n, 0) / nums.length : null;
        let sd = 0;
        if(nums.length > 1 && avg!=null){
          sd = Math.sqrt(nums.reduce((s,n)=> s + (n-avg)*(n-avg), 0) / (nums.length - 1));
        }
        const rules = envStat.rules;
        const usl = rules.spec ? lim.USL : null;
        const lsl = rules.spec ? lim.LSL : null;
        let ucl = null, lcl = null;
        if(rules.ctrl){
          if(rules.mode==='计算' && avg!=null){
            ucl = { n: avg + 3*sd };
            lcl = { n: avg - 3*sd };
          } else {
            ucl = lim.UCL;
            lcl = lim.LCL;
          }
        }
        const show = {};
        if(usl) show.USL = usl.n;
        if(lsl) show.LSL = lsl.n;
        if(ucl) show.UCL = ucl.n;
        if(lcl) show.LCL = lcl.n;
        if(rules.ctrl && avg!=null) show.CL = avg;
        const cell = (on, v)=> on ? (v==null || !Number.isFinite(v) ? '/' : (v===avg ? envStatRound3(v) : envStatNumText(v))) : '/';
        let ooc = '/', oos = '/';
        if(rules.ctrl && ucl && lcl) ooc = String(nums.filter(n=> n>ucl.n || n<lcl.n).length);
        if(rules.spec && (usl || lsl)) oos = String(nums.filter(n=> (usl && n>usl.n) || (lsl && n<lsl.n)).length);
        pts.forEach(p=>{
          samples.push({
            采集时间: p['采集时间'], 采集项名称: item, 结果值: p['结果值'], 单位: p['单位']||lim.unit,
            监测结论: envMonJudgeSpec(p.n, usl ? envStatNumText(usl.n) : '', lsl ? envStatNumText(lsl.n) : ''),
            偏差结论: envMonJudgeDev(p.n, ucl ? envStatNumText(ucl.n) : '', lcl ? envStatNumText(lcl.n) : ''),
            来源: p['来源']
          });
        });
        const row = {
          采集方案: schemeName,
          样本总数: String(nums.length),
          采集项: item,
          单位: lim.unit || '/',
          图类型: 'I图',
          MAX: nums.length ? envStatNumText(Math.max.apply(null, nums)) : '/',
          MIN: nums.length ? envStatNumText(Math.min.apply(null, nums)) : '/',
          USL: cell(rules.spec, usl && usl.n),
          LSL: cell(rules.spec, lsl && lsl.n),
          UCL: cell(rules.ctrl, ucl && ucl.n),
          LCL: cell(rules.ctrl, lcl && lcl.n),
          CL: rules.ctrl && avg!=null ? envStatRound3(avg) : '/',
          UWL: '/',
          LWL: '/',
          Average: avg==null ? '/' : envStatRound3(avg),
          OOC: ooc,
          OOS: oos
        };
        rows.push(row);
        charts.push({
          item: item,
          title: item + '-' + (lim.unit||'') + 'I图',
          svg: pts.length ? envStatSvg(pts, show) : ''
        });
      });
      return { charts, rows, samples };
    }
    function envStatQuery(){
      if(!Array.isArray(envStat.date) || !envStat.date[0] || !envStat.date[1]){ ElMessage.warning('请选择日期范围'); return; }
      if(!envStat.name){ ElMessage.warning('请选择过程监测名称'); return; }
      if(!envStat.items || !envStat.items.length){ ElMessage.warning('请选择采集项'); return; }
      const built = envStatBuild();
      envStat.charts = built.charts;
      envStat.rows = built.rows;
      envStat.samples = built.samples;
      envStat.queried = true;
    }
    function envStatReset(){
      envStat.date = ['2026-10-01','2026-10-16'];
      envStat.name = '';
      envStat.items = [];
      envStat.charts = [];
      envStat.rows = [];
      envStat.samples = [];
      envStat.queried = false;
    }
    function envStatOpenSet(){
      envStat.draft = Object.assign({}, envStat.rules);
      envStat.setOpen = true;
    }
    function envStatSaveSet(){
      envStat.rules = Object.assign({}, envStat.draft);
      envStat.setOpen = false;
      if(envStat.queried) envStatQuery();
    }
    function envStatOpenSamples(){
      if(!envStat.queried){ ElMessage.warning('请先查询'); return; }
      envStat.sampleOpen = true;
    }
    function envStatExport(){
      if(!envStat.rows.length){ ElMessage.warning('暂无分析数据'); return; }
      const cols = ['采集方案','样本总数','采集项','单位','图类型','MAX','MIN','USL','UCL','LSL','LCL','CL','Average','OOC','OOS'];
      if(envStat.rules.warn) cols.splice(12, 0, 'UWL', 'LWL');
      const esc = (v)=> '"' + String(v==null?'':v).replace(/"/g,'""') + '"';
      const csv = '\ufeff' + cols.join(',') + '\n' + envStat.rows.map(r=> cols.map(c=> esc(r[c])).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
      a.download = '监测参数统计.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 800);
      ElMessage.success('已导出数据');
    }
    function envStatInit(){
      const names = envStatNames();
      envStat.date = ['2026-10-01','2026-10-16'];
      envStat.name = names.includes('OLED反应釜过程监测') ? 'OLED反应釜过程监测' : (names[0] || '');
      envStatOnName();
      if(envStat.name && envStat.items.length) envStatQuery();
      else { envStat.queried = false; envStat.charts = []; envStat.rows = []; envStat.samples = []; }
    }
    function envMonLineFromLedger(row, exceptId){
      const line = {
        _i: 1,
        采集项编码: row['采集项编码']||'',
        采集项名称: row['采集项名称']||'',
        采集频率: row['采集频率']||'',
        上次采集时间: envMonLastTime(row['过程监测名称'], row['采集项名称'], exceptId),
        采集项单位: row['采集项单位']||'',
        采集位置: row['采集位置']||'',
        结果值: row['结果值']||'',
        监测结论: row['监测结论']||'',
        偏差结论: row['偏差结论']||'',
        USL: row.USL||'',
        LSL: row.LSL||'',
        UCL: row.UCL||'',
        LCL: row.LCL||''
      };
      envMonJudgeLine(line);
      return line;
    }
    function applyContainsExactQuery(rows, q, containsKeys, exactKeys){
      return (rows||[]).filter(r=>{
        for(const k of (containsKeys||[])){
          const kw = String(q[k]||'').trim();
          if(kw && !kw.split('、').map(s=> s.trim()).filter(Boolean).some(s=> String(r[k]||'').includes(s))) return false;
        }
        for(const k of (exactKeys||[])){
          if(q[k] && r[k]!==q[k]) return false;
        }
        return true;
      });
    }
    function joinDun(v){
      if(Array.isArray(v)) return v.filter(Boolean).join('、');
      return String(v==null?'':v).trim();
    }
    function splitDun(v){
      if(Array.isArray(v)) return v.slice();
      return String(v==null?'':v).split(/[、,，]/).map(s=>s.trim()).filter(Boolean);
    }
    /** 分配明细 / 反馈明细：按「；」拆成一行一条，再按「→」拆名称与结果 */
    function arrowDetailPairs(text){
      const s = String(text==null ? '' : text).trim();
      if(!s || s==='—') return [];
      return s.split(/[；;]/).map(x=> x.trim()).filter(Boolean).map(part=>{
        const i = part.indexOf('→');
        if(i < 0) return { name: part, value: '' };
        return { name: part.slice(0, i).trim() || '—', value: part.slice(i+1).trim() || '—' };
      }).filter(p=> p.name);
    }
    /** 系统用户演示池：检验人员「人员编码」下拉数据源 */
    function demoSysUsers(){
      return [
        { 人员编码:'U1001', 人员姓名:'张敏', 所属角色:'检验员', 所属岗位:'QC检验员', 所属部门:'质检中心', 联系电话:'13800001001', 电子邮箱:'zhangmin@dingcai.demo' },
        { 人员编码:'U1002', 人员姓名:'李强', 所属角色:'检验员', 所属岗位:'QC检验员', 所属部门:'质检中心', 联系电话:'13800001002', 电子邮箱:'liqiang@dingcai.demo' },
        { 人员编码:'U1003', 人员姓名:'王芳', 所属角色:'班长', 所属岗位:'QC班长', 所属部门:'质检中心', 联系电话:'13800001003', 电子邮箱:'wangfang@dingcai.demo' },
        { 人员编码:'U1004', 人员姓名:'赵磊', 所属角色:'检验员', 所属岗位:'QC检验员', 所属部门:'质检中心', 联系电话:'13800001004', 电子邮箱:'zhaolei@dingcai.demo' },
        { 人员编码:'U2001', 人员姓名:'陈晓', 所属角色:'检验员', 所属岗位:'QC检验员', 所属部门:'质检中心', 联系电话:'13800002001', 电子邮箱:'chenxiao@dingcai.demo' },
        { 人员编码:'U2002', 人员姓名:'刘洋', 所属角色:'检验员', 所属岗位:'QC检验员', 所属部门:'质检中心', 联系电话:'13800002002', 电子邮箱:'liuyang@dingcai.demo' },
        { 人员编码:'U2003', 人员姓名:'周倩', 所属角色:'复核员', 所属岗位:'QA复核', 所属部门:'质量保证部', 联系电话:'13800002003', 电子邮箱:'zhouqian@dingcai.demo' },
        { 人员编码:'U2004', 人员姓名:'孙浩', 所属角色:'检验员', 所属岗位:'QC检验员', 所属部门:'质检中心', 联系电话:'13800002004', 电子邮箱:'sunhao@dingcai.demo' },
      ];
    }
    function formSelectAllState(f){
      const all = formSelectOptions(f).map(o=> o.value);
      const cur = Array.isArray(formModel[f.name]) ? formModel[f.name] : [];
      const n = all.filter(v=> cur.includes(v)).length;
      return !n ? 'none' : (n===all.length ? 'all' : 'some');
    }
    function toggleFormSelectAll(f, checked){
      formModel[f.name] = checked ? formSelectOptions(f).map(o=> o.value) : [];
      onFormSelectChange(f);
    }
    function formSelectOptions(f){
      if(pageId.value===BIAS_PAGE && f.name==='仪器名称'){
        const names = ((MOCK['instrument-ledger']||{}).main||[]).filter(r=> String(r['使用状态']||'')==='在用').map(r=> r['仪器名称']).filter(Boolean);
        const cur = String(formModel['仪器名称']||'').trim();
        if(cur && !names.includes(cur)) names.unshift(cur);
        return names.length ? names : ['数显卡尺','外径千分尺','高度尺','深度尺'];
      }
      if(pageId.value===BIAS_PAGE && f.name==='测量人'){
        return ['王工','李工','赵工','张敏','赵磊'];
      }

      if(pageId.value===CI_PAGE && f){ const o = ciFormOptions(f); if(o) return o; }
      if(isAuditPage() && f){ const o = eaFormOptions(f); if(o) return o; }
      if(pageId.value===QT_PAGE && f.name==='负责人') return CI_USERS.map(u=> ({ value:u.姓名, label:u.工号+' / '+u.姓名 }));
      if(pageId.value==='np-0211-04' && f){ const o = iarFormOptions(f); if(o) return o; }
      if(pageId.value===CHG_PAGE && f){ const o = chgFormOptions(f); if(o) return o; }
      if(pageId.value==='np-0502-01' && f && f.name==='过程监测名称'){
        return ((MOCK['np-0501-01']||{}).main||[]).map(r=> ({ value: r['过程监测名称'], label: r['过程监测名称'] }));
      }
      if(pageId.value==='insp-person' && f && f.name==='人员编码'){
        return demoSysUsers().map(u=>({ value:u.人员编码, label: u.人员编码 + ' / ' + u.人员姓名 }));
      }
      if(pageId.value===PERSON_PAGE && f && f.name==='编码') return personUserOptions();
      if(pageId.value===MAINT_PERSON_PAGE && f && f.name==='人员编码') return maintUserOptions();
      return (formFieldOptions(f)||[]).map(o=>{
        if(o && typeof o==='object' && 'value' in o) return o;
        const s = String(o??'');
        return { value:s, label:s };
      });
    }
    function isWaybillPage(){
      return pageId.value==='lg-waybill' || pageId.value==='lg-waybill-carrier';
    }
    function demoCarrierDispatcher(){ return '王调度'; }
    function demoCarrierName(){
      const d = demoCarrierDispatcher();
      const hit = ((MOCK.carrier||{}).main||[]).find(c=> c['所属调度员']===d && c['启用状态']==='启用');
      return hit ? hit['承运商名称'] : '顺丰物流';
    }
    const UNIT_FIELD_PAGES = ['mat-list','mat-uom','reagent','solution','ref-material','retain-sample','consumable'];
    /** 下拉取其他模块的启用数据，新增主数据后可直接选到 */
    function linkedFieldOptions(f){
      const rows = (pid, tab)=> (((MOCK[pid]||{})[tab||'main'])||[]).filter(r=> r['启用状态']!=='禁用');
      const uniq = a=> [...new Set(a.map(x=> String(x||'').trim()).filter(Boolean))];
      if(UNIT_FIELD_PAGES.includes(pageId.value) && /单位$/.test(f.name) && (f.options||[]).length) return uniq(rows('unit').map(r=> r['单位编码']));
      if(pageId.value===SLOC_PAGE && f.name==='当前位置') return uniq([...rows(SLPOS_PAGE, 'tab-1').map(r=> r['库位名称']), ...(f.options||[])]);
      if(pageId.value==='qr-config' && f.name==='模板文件名称') return uniq(rows('qr-template').map(r=> r['文件名称']));
      if(pageId.value==='qr-issue' && f.name==='客户名称'){
        return uniq(rows('customer').filter(r=> (r['启用状态']||'启用')!=='禁用').map(r=> r['客户名称']).filter(Boolean));
      }
      if(pageId.value==='spectrum-file' && f.name==='物料编码'){
        return uniq(rows('mat-list').map(r=> r['物料编码']).filter(Boolean));
      }
      if(pageId.value==='spectrum-file' && f.name==='仪器编号'){
        return uniq((((MOCK['instrument']||{}).main)||[]).map(r=> r['仪器编号']).filter(Boolean));
      }
      if(pageId.value==='spectrum-file' && f.name==='色谱柱型号'){
        const bag = MOCK['np-0208-01'] || {};
        const fromTypes = (bag.types || []).map(t=> (typeof t==='string' ? t : (t && (t.name||t['色谱柱型号']||t.label))) ).filter(Boolean);
        const fromRows = (((bag.main)||[])).map(r=> r['色谱柱型号']).filter(Boolean);
        return uniq(fromTypes.concat(fromRows));
      }
      if(pageId.value==='qr-issue' && f.name==='报告模板名称'){
        const cust = String(formModel['客户名称']||'').trim();
        const matCode = String(formModel['物料编码']||'').trim();
        const matName = String(formModel['物料名称']||'').trim();
        const matInfo = String(formModel['物料信息']||'').trim();
        let list = rows('qr-config').filter(r=> (r['启用状态']||'启用')!=='禁用');
        if(cust) list = list.filter(r=> String(r['适用客户']||'').includes(cust) || !String(r['适用客户']||'').trim() || r['适用客户']==='—');
        if(matCode || matName || matInfo){
          list = list.filter(r=>{
            const am = String(r['适用物料']||'');
            if(!am.trim() || am==='—') return true;
            return (matCode && am.includes(matCode)) || (matName && am.includes(matName)) || (matInfo && am.includes(matInfo.split(/[/／]/)[0]));
          });
        }
        return uniq(list.map(r=> r['报告模板名称']).filter(Boolean));
      }
      if(f.name==='指定维保班组') return maintTeamNames();
      if(f.name==='所属车间') return uniq(rows('workshop').map(r=> r['车间名称']));
      if(f.name==='所属产线') return uniq(rows('prod-line').map(r=> r['产线名称']));
      return null;
    }
    function formFieldOptions(f){
      if(!f) return [];
      if(isEntryByCat(pageId.value) && f.name==='仪器信息'){
        const cat = entryCategoryId.value;
        const crow = cat ? (((MOCK['insp-project']||{})['tab-category'])||[]).find(r=> r['检验类名称']===cat) : null;
        const types = crow ? splitDun(crow['适用仪器类型']) : [];
        return ((MOCK.instrument||{}).main||[])
          .filter(r=> r['使用状态']==='在用' && (!types.length || types.includes('通用') || types.includes(r['仪器类型'])))
          .map(r=> r['仪器名称']).filter(Boolean);
      }
      if(pageId.value===SPLIT_PAGE && Array.isArray(f.options) && f.options.length) return f.options.slice();
      if(LAB_ARCH_LOC_PAGES.includes(pageId.value) && f.name==='存储库位') return labArchLocOpts.value;
      if(pageId.value==='retain-sample' && f.name==='留样种类'){
        const kinds = (((MOCK['mat-list']||{}).main)||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r['物料种类']);
        return [...new Set(kinds.map(x=> String(x||'').trim()).filter(Boolean))];
      }
      if(pageId.value==='gather-item'){
        if(f.name==='采集项单位'){
          const names = (((MOCK.unit||{}).main)||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r['单位名称']);
          (((MOCK['gather-item']||{}).main)||[]).forEach(r=>{ if(r['采集项单位']) names.push(r['采集项单位']); });
          if(formModel['采集项单位']) names.push(formModel['采集项单位']);
          return [...new Set(names.map(x=> String(x||'').trim()).filter(Boolean))];
        }
        if(f.name==='点位名称'){
          const names = (((MOCK['opc-point']||{}).main)||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r['点位名称']);
          if(formModel['点位名称']) names.unshift(formModel['点位名称']);
          return [...new Set(names.map(x=> String(x||'').trim()).filter(Boolean))];
        }
      }
      if(pageId.value===COL_PAGE){
        if(f.name==='色谱柱型号'){
          const names = colModelsOf().map(m=> colTypeName(m)).filter(Boolean);
          const cur = String(formModel['色谱柱型号']||'').trim();
          if(cur && cur!=='—' && !names.includes(cur)) names.unshift(cur);
          return names;
        }
        if(f.name==='责任部门') return COL_DEPTS;
        if(f.name==='责任人'){
          const list = colUserOptions(formModel['责任部门']);
          const cur = String(formModel['责任人']||'').trim();
          if(cur && cur!=='—' && !list.includes(cur)) list.unshift(cur);
          return list;
        }
      }
      if(pageId.value===DISPATCH_PAGE){
        if(f.name==='适用检验类') return inspCatNames();
        if(f.name==='派单班组') return teamNames();
      }
      if(pageId.value===SHIFT_PAGE && f.name==='适用班组') return teamNames();
      if(pageId.value===CAL_PAGE){
        if(f.name==='类型') return ['休息日','加班日'];
        if(f.name==='每周工作日') return ['周一','周二','周三','周四','周五','周六','周日'];
        if(f.name==='适用班组') return teamNames();
      }
      if(pageId.value===COST_PAGE && f.name==='检验类') return inspCatNames();
      if(pageId.value===MAINT_PERSON_PAGE && f.name==='所属维保班组') return maintTeamNames();
      if(pageId.value===FAULT_TYPE_PAGE && f.name==='适用仪器类型') return inspCatInstrumentTypeOptions.value;
      if(pageId.value===BX_EXP_PAGE && f.name==='适用仪器类型') return inspCatInstrumentTypeOptions.value;
      if(pageId.value===BX_EXP_PAGE && f.name==='适用故障类型') return expFaultOptions();
      if((isDjSchemePage() || isDjPlanPage()) && f.name==='指定维保班组') return maintTeamNames();
      if(isDjPlanPage() && f.name===djKind().w+'方案名称') return djSchemeRows().filter(r=> r['启用状态']!=='禁用').map(r=> r[djKind().w+'方案名称']);
      if(isDjSchemePage() && f.name==='表单名称'){
        const fromMock = (((MOCK['form-setting']||{}).main)||[]).map(r=> r['表单名称']);
        return [...new Set([...djKind().forms, ...fromMock, ...djSchemeRows().map(r=> r['表单名称'])].filter(Boolean))];
      }
      if(pageId.value==='solution' && (f.name==='配液模板' || f.name==='标定模板')){
        const tplPid = f.name==='配液模板' ? 'prep-template' : 'calib-template';
        return (((MOCK[tplPid]||{}).main)||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r[f.name+'名称']).filter(Boolean);
      }
      if((pageId.value===MATRIX_PAGE || pageId.value===QUALITY_PAGE) && f.name==='能力名称') return matrixAbilities().map(r=> r['能力名称']);
      if(pageId.value===LAB_IO_FORM){
        if(f.name==='表单名称') return [...new Set((((MOCK['form-setting']||{}).main)||[]).map(r=> r['表单名称']).filter(Boolean))];
        if(f.name==='适用单据类型') return labIoDocTypes(formModel['适用业务单据']);
      }
      if(pageId.value===LAB_INSP_SCHEME && f.name==='表单名称'){
        const fromMock = [...new Set((((MOCK['form-setting']||{}).main)||[]).map(r=> r['表单名称']).filter(Boolean))];
        return [...new Set([...LAB_INSP_FORMS, ...fromMock, ...labInspSchemeRows().map(r=> r['表单名称']).filter(Boolean)])];
      }
      if(pageId.value===LAB_INSP_PLAN && f.name==='巡检方案名称'){
        const rows = labInspSchemeRows();
        const src = formVisible.value ? rows.filter(r=> r['启用状态']==='启用') : rows;
        return [...new Set(src.map(r=> r['巡检方案名称']).filter(Boolean))];
      }
      if(isLabCountPage()){
        if(f.name==='盘点类型'){
          if(pageId.value===LAB_COUNT_QTY) return (f.options && f.options.length) ? f.options : LAB_COUNT_QTY_TYPES;
          return (f.options && f.options.length) ? f.options : LAB_COUNT_TYPES;
        }
        if(f.name==='盘点仓库') return labCountWhCodes();
      }
      if(pageId.value===COST_FLOW || pageId.value===COST_STAT){
        if(f.name==='检验类') return inspCatNames();
        if(['送检人','部门','统计月份','报检类型','检验班组','检验结论','物料种类'].includes(f.name)) return costStatOptions(f.name);
      }
      if(pageId.value===TASK_PAGE || pageId.value===TIME_FB_PAGE){
        if(f.name==='检验类') return inspCatNames();
        if(f.name==='检验班组' || f.name==='新班组') return inspTeamRows(true).map(t=> t['班组名称']);
      }
      if(pageId.value==='ledger' && f.name==='检验班组') return inspTeamRows(true).map(t=> t['班组名称']);
      if(f.name==='处置方式'){
        if(formModel._disposeWayOptions && formModel._disposeWayOptions.length) return formModel._disposeWayOptions;
        if(page.value?.disposeWayOptions && page.value.disposeWayOptions.length) return page.value.disposeWayOptions;
      }
      if(pageId.value==='pkg-craft' && f.name==='适用单据类型'){
        const waybillVehicleTypes = ['发货','提货','设备发运','厂内/园区倒短运输','物资转运','其他'];
        const map = {
          '报废处理': ['报废处理单'],
          '异常冻结': ['异常冻结单'],
          '解除冻结': ['冻结解除单'],
          '提货单': waybillVehicleTypes,
          '签收单': waybillVehicleTypes
        };
        const bizArr = Array.isArray(formModel['适用业务单据']) ? formModel['适用业务单据'] : splitDun(formModel['适用业务单据']);
        const set = new Set();
        bizArr.forEach(b=>{ (map[b]||[]).forEach(x=> set.add(x)); });
        return Array.from(set);
      }
      if(pageId.value==='wh-insp-plan' && f.name==='目标仓库'){
        return (formModel._schemeLocs||[]).map(l=> l['仓库名称']).filter(Boolean);
      }
      if(pageId.value==='wh-other-in'){
        if(f.name==='单据类型') return (f.options && f.options.length) ? f.options : ['盘盈入库','样品入库','研发入库'];
        if(f.name==='入库方向') return ['厂外','线边仓'];
      }
      if(pageId.value==='wh-other-out'){
        if(f.name==='单据类型') return (f.options && f.options.length) ? f.options : ['盘亏出库','样品出库','研发领用'];
        if(f.name==='出库方向') return ['厂外','线边仓'];
      }
      if(f.name==='所属仓库' && (pageId.value==='warehouse' || !f.options || !f.options.length)){
        return ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']==='启用').map(w=> w['仓库名称']);
      }
      if(pageId.value==='samp-point' && f.name==='所属产线'){
        const names = ((MOCK['prod-line']||{}).main||[])
          .filter(r=> r['启用状态']!=='禁用')
          .map(r=> String(r['产线名称']||'').trim())
          .filter(Boolean);
        if(names.length) return names;
      }
      if(pageId.value==='insp-person'){
        if(f.name==='人员编码') return demoSysUsers().map(u=> u.人员编码);
        if(f.name==='所属检验班组'){
          return ((MOCK['insp-team']||{}).main||[])
            .filter(r=> r['启用状态']!=='禁用')
            .map(r=> String(r['班组名称']||'').trim())
            .filter(Boolean);
        }
        if(f.name==='负责检验类'){
          return ((MOCK['insp-project']||{})['tab-category']||[])
            .filter(r=> r['启用状态']!=='禁用')
            .map(r=> String(r['检验类名称']||'').trim())
            .filter(Boolean);
        }
      }
      if(f.name==='所属检验类'){
        const rows = ((MOCK['insp-project']||{})['tab-category']||[])
          .filter(r=> r['启用状态']!=='禁用')
          .map(r=> String(r['检验类名称']||'').trim())
          .filter(Boolean);
        if(rows.length) return rows;
      }
      if(pageId.value==='lg-waybill' && f.name==='承运商'){
        return ((MOCK.carrier||{}).main||[]).filter(c=> c['启用状态']==='启用').map(c=> c['承运商名称']);
      }
      if(f.name==='事件小类' && (pageId.value==='lg-carrier-evt' || query['事件大类'] || formModel['事件大类'])){
        const map = {
          '货物异常': ['货损','货差','包装异常'],
          '时效异常': ['提货延迟','在途延迟','送达延迟'],
          '单据异常': ['单据错误','回单延迟/丢失'],
          '服务异常': ['沟通服务差']
        };
        const major = formModel['事件大类'] || query['事件大类'] || '';
        if(major && map[major]) return map[major];
        if(f.options && f.options.length) return f.options;
        return Object.values(map).flat();
      }
      if(pageId.value==='lg-dispatch' && (f.name==='关联仓储业务' || f.name==='仓库业务类型')){
        return whBizTypesForVehicle(formModel['用车类型']==='其他' ? '其他' : (formModel['用车类型']||''));
      }
      if(pageId.value==='lg-dispatch' && f.name==='订单类型'){
        const need = dispatchOrderTypeForBiz(formModel['关联仓储业务'] || formModel['仓库业务类型'] || '');
        if(need) return [need];
        return ['无'];
      }
      if((pageId.value===HM_IMP_PAGE || pageId.value===HM_LIB_PAGE) && f.name==='物料类'){
        const nodes = (CFG.pages[HM_ARCH_PAGE] && CFG.pages[HM_ARCH_PAGE].treeNodes) || [];
        return nodes.slice();
      }
      if(/检验类$/.test(String(f.name||'')) && f.name!=='检验类属性'){
        const cats = inspCatNames();
        if(cats.length) return cats;
      }
      const linked = linkedFieldOptions(f);
      if(linked && linked.length) return linked;
      if(window.WMS_DICT && typeof window.WMS_DICT.optionsFor==='function'){
        const dictOpts = window.WMS_DICT.optionsFor(pageId.value, f.name, activeTab.value, MOCK.dict);
        if(dictOpts && dictOpts.length) return dictOpts;
      }
      if(f.options && f.options.length) return f.options;
      if(f.name==='生产厂家'){
        const vendor = String(formModel['供应商名称']||'').trim();
        const opts = [];
        if(vendor) opts.push(vendor);
        ((MOCK.supplier||{}).main||[]).filter(s=> s['启用状态']==='启用').forEach(s=>{
          const n = String(s['供应商名称']||'').trim();
          if(n && !opts.includes(n)) opts.push(n);
        });
        if(opts.length) return opts;
      }
      if(f.name==='领至线边仓' || f.name==='来源线边仓'){
        const rows = ((MOCK['line-side']||{}).main||[]).filter(r=> r['启用状态']==='启用');
        const names = rows.map(r=>{
          const code = String(r['线边仓编码']||'').trim();
          const name = String(r['线边仓名称']||'').trim();
          return (code && name) ? (code + ' - ' + name) : (name || code);
        }).filter(Boolean);
        if(names.length) return names;
      }
      if(f.name==='调出仓库' || f.name==='调入仓库'){
        const names = ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']==='启用').map(w=>{
          const code = String(w['仓库编码']||'').trim();
          const name = String(w['仓库名称']||'').trim();
          return (code && name) ? (code + ' - ' + name) : (name || code);
        }).filter(Boolean);
        if(names.length) return names;
      }
      if(f.name==='移入仓库编码' || f.name==='移出仓库编码' || f.name==='盘点仓库'){
        const names = ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']==='启用').map(w=> w['仓库名称']).filter(Boolean);
        if(names.length) return names;
      }
      if(f.name==='移入库位编码' || f.name==='移出库位编码'){
        const names = warehouseLocPickerRows().map(r=> r['库位编码'] || r.编码).filter(Boolean);
        if(names.length) return names;
      }
      const fromMock = uniqueMockFieldValues(f.name);
      if(fromMock.length) return fromMock;
      if(f.name==='单据类型'){
        const typed = restWhDocTypeOptions();
        if(typed.length) return typed;
      }
      return [];
    }
