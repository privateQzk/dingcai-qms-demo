    function qrQtPending(){ return (((MOCK['np-0218-01'] || {})['tab-1']) || []).map(r=> Object.assign({}, r, { 逾期状态: qtOverdueState(r) })); }
    function qrLedgerAll(){
      return FLOW_TABS.flatMap(t=> (((MOCK.ledger || {})[t.name]) || []).map(r=>
        Object.assign({}, r, { 报检类型: (r['报检类型'] && r['报检类型'] !== '—') ? r['报检类型'] : t.label, 逾期状态: flowCalcOverdue(r['预计完成时间']) })));
    }
    function qrXjPlans(){ return labInspEnrichPlanRows(labInspPlanBag('tab-1')); }
    function qrCapaAll(){
      const bag = MOCK['capa-handle'] || {};
      return ((bag['tab-wait'] || []).map(r=> Object.assign({}, r, { 单据状态:'待处理' })))
        .concat((bag['tab-done'] || []).map(r=> Object.assign({}, r, { 单据状态:'已处理' })));
    }
    const qr = reactive({ tab:'oqc-submit', q:{}, queried:false, rows:[] });
    function qrDef(){ return QR_TABS.find(t=> t.key === qr.tab) || QR_TABS[0]; }
    function qrFreshQuery(def){
      const q = {};
      (def.filters || []).forEach(f=>{
        if(f.type === 'select' || f.type === 'picker'){ q[f.key] = []; if(f.type === 'picker') q[f.key + 'Label'] = ''; }
        else if(f.type === 'date'){ q[f.key] = null; }
        else { q[f.key] = ''; }
      });
      return q;
    }
    function qrOptions(f){ return typeof f.options === 'function' ? f.options() : (f.options || []); }
    function qrOpenPick(f){ openIoPick(f.kind, 'qrReport', f.key, true); }
    function qrClearPick(f){ qr.q[f.key] = []; qr.q[f.key + 'Label'] = ''; }
    function qrApplyPick(rows){
      const f = (qrDef().filters || []).find(x=> x.key === ioPickField.value);
      if(!f) return;
      const codeKey = f.kind === 'mat' ? '物料编码' : '客户编码';
      const list = rows || [];
      qr.q[f.key] = list.map(r=> r[codeKey]).filter(Boolean);
      qr.q[f.key + 'Label'] = list.map(r=> ioPickText(f.kind, r)).filter(Boolean).join('、');
    }
    function qrQuery(){ qr.rows = qrDef().filter(qrDef().load(), qr.q); qr.queried = true; }
    function qrReset(){ qr.q = qrFreshQuery(qrDef()); qrQuery(); }
    function qrOnTab(){ qr.q = qrFreshQuery(qrDef()); qr.queried = false; qr.rows = []; qrQuery(); }
    function qrCards(){ return qr.queried ? qrDef().cards(qr.rows) : []; }
    function qrGroups(){
      const def = qrDef();
      if(!qr.queried || !def.groups) return [];
      return def.groups.map(g=>{
        const m = new Map();
        qr.rows.forEach(r=>{
          const k = String(r[g.dim] || '').trim() || '—';
          m.set(k, (m.get(k) || 0) + 1);
        });
        const rows = [...m.entries()].map(([name, count])=> ({ name, count, pct: qrPct(count, qr.rows.length) }))
          .sort((a,b)=> b.count - a.count || String(a.name).localeCompare(String(b.name)));
        return { title:g.title, dim:g.dim, rows };
      });
    }
    function qrExport(){
      if(!qr.queried){ ElMessage.warning('请先查询'); return; }
      const def = qrDef();
      const esc = v=> String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      let tables = '';
      const groups = qrGroups();
      if(groups.length){
        tables = groups.map(g=>{
          const head = '<tr><th>' + esc(g.dim) + '</th><th>单据数</th><th>占比</th></tr>';
          const body = g.rows.map(r=> '<tr><td>' + esc(r.name) + '</td><td>' + r.count + '</td><td>' + r.pct + '</td></tr>').join('');
          return '<tr><th colspan="3">' + esc(g.title) + '</th></tr>' + head + body;
        }).join('<tr><td colspan="3"></td></tr>');
        tables = '<table border="1">' + tables + '</table>';
      } else {
        if(!qr.rows.length){ ElMessage.warning('没有可导出的数据'); return; }
        const head = '<tr>' + def.cols.map(c=> '<th>' + esc(c.label) + '</th>').join('') + '</tr>';
        const body = qr.rows.map(r=> '<tr>' + def.cols.map(c=> '<td>' + esc(r[c.prop]) + '</td>').join('') + '</tr>').join('');
        tables = '<table border="1">' + head + body + '</table>';
      }
      if(groups.length && !qr.rows.length){ ElMessage.warning('没有可导出的数据'); return; }
      const html = '<html><head><meta charset="utf-8"></head><body>' + tables + '</body></html>';
      const blob = new Blob([html], { type:'application/vnd.ms-excel' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '品质综合报表_' + def.title + '.xls';
      document.body.appendChild(a); a.click(); a.remove();
      ElMessage.success('已导出当前统计结果');
    }
    watch(()=> pageId.value, v=>{ if(v === QR_PAGE){ qrOnTab(); } }, { immediate:true });
    const SR_OPEN = ['待处理','待审核','审核驳回'];
    function srRandPwd(){
      const n = String(Math.floor(Math.random()*1e9)).padStart(9,'0');
      return n.slice(0,3)+'-'+n.slice(3,6)+'-'+n.slice(6);
    }
    function srLinkOf(r){ return r['在线填写链接'] || ('/supplier-questionnaire?supplierRectificationNo='+(r['整改单号']||'')+'&companyId=1'); }
    function srDecorate(r){
      const plan = String(r['计划整改完成日期'] || '');
      return {
        超时状态: plan && nowStamp().slice(0, 10) > plan ? '超时' : '正常',
        在线填写链接: srLinkOf(r),
      };
    }
    function srAllRows(){
      const bag = (MOCK[SR_PAGE] = MOCK[SR_PAGE] || {});
      return [...(bag['tab-1']||[]), ...(bag['tab-2']||[])];
    }
    function srFind(id){ return srAllRows().find(r=> r.id===id); }

    const srShare = reactive({ visible:false, id:'', 主题:'', 事件日期:'', 计划整改完成日期:'', 供应商名称:'', 在线填写链接:'', 密码:'', 分享人:'' });
    function openSrShare(row){
      const r = srFind(row.id) || row;
      Object.assign(srShare, {
        visible:true, id:r.id,
        主题: r['主题'] || '供应商在线整改',
        事件日期: r['事件日期'] || '',
        计划整改完成日期: r['计划整改完成日期'] || '',
        供应商名称: r['供应商名称'] || '',
        在线填写链接: srLinkOf(r),
        密码: r['密码'] || srRandPwd(),
        分享人: r['分享人'] || CI_OPERATOR,
      });
    }
    function saveSrShare(){
      const r = srFind(srShare.id);
      if(!r){ ElMessage.warning('单据不存在'); return; }
      Object.assign(r, { 主题: String(srShare['主题']||'').trim() || '供应商在线整改', 密码: String(srShare['密码']||'').trim() || srRandPwd(), 分享人: srShare['分享人'] || CI_OPERATOR, 在线填写链接: srShare['在线填写链接'] });
      bumpStore();
      ElMessage.success('已保存主题与密码');
    }
    function copySrShare(){
      const t = [
        '【供应商在线整改】',
        '主题：'+srShare['主题'],
        '事件日期：'+srShare['事件日期'],
        '计划整改完成日期：'+srShare['计划整改完成日期'],
        '供应商名称：'+srShare['供应商名称'],
        '分享人：'+srShare['分享人'],
        '',
        '在线填写链接：'+location.origin+srShare['在线填写链接'],
        '访问密码：'+srShare['密码'],
      ].join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
        ()=> ElMessage.success('已复制分享内容'),
        ()=>{ try{ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ElMessage.success('已复制分享内容'); }catch(e){ ElMessage.warning('复制失败，请手动复制'); } }
      );
    }

    const srFill = reactive({ visible:false, id:'', 整改说明:'', 整改附件:'', 处理人:'' });
    function openSrFill(row){
      const r = srFind(row.id) || row;
      if(!['待处理','审核驳回'].includes(r['单据状态'])){ ElMessage.warning('仅待处理、审核驳回的整改单可在线填写'); return; }
      Object.assign(srFill, { visible:true, id:r.id, 整改说明:r['整改说明']||'', 整改附件:r['整改附件']||'', 处理人:r['处理人']||'' });
    }
    function submitSrFill(){
      const r = srFind(srFill.id);
      if(!r){ ElMessage.warning('单据不存在'); return; }
      if(!['待处理','审核驳回'].includes(r['单据状态'])){ ElMessage.warning('仅待处理、审核驳回的整改单可在线填写'); return; }
      const desc = String(srFill['整改说明']||'').trim();
      const files = String(srFill['整改附件']||'').trim();
      if(!desc){ ElMessage.warning('请输入整改说明'); return; }
      if(!files){ ElMessage.warning('请上传整改附件'); return; }
      Object.assign(r, {
        单据状态:'待审核',
        整改说明:desc,
        整改附件:files,
        处理人: String(srFill['处理人']||'').trim() || CI_OPERATOR,
        整改提交日期: nowStamp().slice(0,10),
      });
      srFill.visible = false;
      if(srExt.step==='form') srExt.row = Object.assign({}, r, srDecorate(r));
      bumpStore();
      ElMessage.success('提交成功，单据状态已更改为「待审核」');
    }

    const srReview = reactive({ visible:false, ids:[], 复核结果:'通过', 复核说明:'' });
    function openSrReview(rows){
      const list = (rows||[]).filter(Boolean);
      if(!list.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = list.filter(r=> r['单据状态']!=='待审核');
      if(bad.length){ ElMessage.warning('仅待审核的整改单可复核：'+bad.map(r=> r['整改单号']+'（'+r['单据状态']+'）').join('、')); return; }
      Object.assign(srReview, { visible:true, ids:list.map(r=> r.id), 复核结果:'通过', 复核说明:'' });
    }
    function submitSrReview(){
      if(!srReview['复核结果']){ ElMessage.warning('请选择复核结果'); return; }
      const at = nowStamp();
      const bag = MOCK[SR_PAGE];
      const pending = bag['tab-1'] || (bag['tab-1'] = []);
      const done = bag['tab-2'] || (bag['tab-2'] = []);
      let n = 0;
      srReview.ids.forEach(id=>{
        const i = pending.findIndex(r=> r.id===id);
        if(i<0) return;
        const r = pending[i];
        Object.assign(r, { 复核说明: String(srReview['复核说明']||'').trim(), 复核时间: at, 复核人: CI_OPERATOR });
        if(srReview['复核结果']==='通过'){
          r['单据状态'] = '已完成';
          pending.splice(i, 1);
          done.unshift(r);
        } else {
          r['单据状态'] = '审核驳回';
        }
        n++;
      });
      srReview.visible = false;
      selectedIds.value = [];
      bumpStore();
      ElMessage.success('已复核 '+n+' 条，'+(srReview['复核结果']==='通过' ? '状态改为「已完成」' : '状态改为「审核驳回」'));
    }

    const srExt = reactive({ visible:false, step:'login', no:'', pwd:'', row:null, tip:'' });
    function openSrExt(row){
      const r = srFind(row.id) || row;
      if(!SR_OPEN.includes(r['单据状态'])){ ElMessage.warning('抱歉，该单据已关闭，不可打开'); return; }
      Object.assign(srExt, { visible:true, step:'login', no:r['整改单号'], pwd:'', tip:'', row: Object.assign({}, r, { 在线填写链接: srLinkOf(r) }) });
    }
    function srExtLogin(){
      const r = srAllRows().find(x=> x['整改单号']===srExt.no);
      if(!r || !SR_OPEN.includes(r['单据状态'])){ srExt.tip = '抱歉，该单据已关闭，不可打开'; return; }
      if(String(srExt.pwd||'').trim()!==String(r['密码']||'').trim()){ srExt.tip = '密码错误'; return; }
      srExt.tip = '';
      srExt.row = Object.assign({}, r, srDecorate(r));
      srExt.step = 'form';
    }
    function srExtKeys(){
      return ['状态','整改单号','来源单号','供应商名称','事件日期','问题大类','问题小类','问题描述','整改目标','计划整改完成日期','物料信息','批号','整改报告','备注','制单时间','制单人','整改提交日期','整改说明','整改附件','处理人','复核说明','复核时间','复核人'];
    }
    function srExtVal(k){
      const r = srExt.row || {};
      if(k==='状态') return r['单据状态'] || '';
      if(k==='整改报告') return r['附件'] || '';
      return r[k]==null || r[k]==='' ? '—' : r[k];
    }

    /** 有害物质 · 文件导入 / 文件库 */
    const HM_IMP_PAGE = 'np-0215-05';
    const HM_FLOW_PAGE = 'np-0215-08';
    const HM_LIB_PAGE = 'np-0215-02';
    const HM_CHG_PAGE = 'np-0215-06';
    const HM_VOID_PAGE = 'np-0215-07';

    const HM_ARCH_PAGE = 'np-0215-01';
    const hmArchItemRow = ref(null);
    const hmArchCustRow = ref(null);
    const hmArchLineTab = ref('plant');
    const hmArchPlant = ref([]);
    const hmArchCust = ref([]);
    const hmArchLaw = ref([]);
    const hmArchPlantSel = ref([]);
    const hmArchCustSel = ref([]);
    const hmArchLawSel = ref([]);
    const hmImpEntryTab = ref('entry');
    const hmImpEntryRows = ref([]);
    const hmImpEntrySel = ref([]);
    /** 「修改数据B」模式：全屏页仅数据录入「测试值」可改，其余组件禁用；仅已导入行可用 */
    const hmEditBOnly = ref(false);
    const hmImpEntryTarget = ref(null);
    function hmImpResetEntry(){
      hmImpEntryRows.value = [];
      hmImpEntrySel.value = [];
      hmImpEntryTarget.value = null;
      hmImpEntryTab.value = 'entry';
    }
    function hmImpLoadEntry(row){
      hmImpEntryRows.value = (Array.isArray(row && row._entryLines) ? row._entryLines : []).map((r,i)=> {
        const line = Object.assign({ id: r.id || ('hmie-'+i), 标准编号:'', 标准名称:'', 测试值:'', 单位:'', 比对结果:'' }, r);
        if(!line['单位']){ const a = hmImpArchByCode(line['标准编号']); if(a) line['单位'] = a['单位']||''; }
        return line;
      });
      hmImpEntrySel.value = [];
      hmImpEntryTarget.value = null;
      hmImpEntryTab.value = 'entry';
    }
    function hmImpAddEntryRows(){
      const cat = String(formModel['物料类']||'').trim();
      if(!cat){ ElMessage.warning('请先选择物料类'); return; }
      hmImpEntryTarget.value = null;
      openIoPick('hmArchStd', 'hmImpEntry', '标准编号', true);
    }
    function openHmImpStdPick(row){
      if(formMode.value==='detail') return;
      const cat = String(formModel['物料类']||'').trim();
      if(!cat){ ElMessage.warning('请先选择物料类'); return; }
      hmImpEntryTarget.value = row || null;
      openIoPick('hmArchStd', 'hmImpEntry', '标准编号', true);
    }
    function hmImpDelEntryRows(){
      if(!(hmImpEntrySel.value||[]).length){ ElMessage.warning('请先勾选要删除的行'); return; }
      const ids = new Set(hmImpEntrySel.value.map(r=> r.id));
      hmImpEntryRows.value = hmImpEntryRows.value.filter(r=> !ids.has(r.id));
      hmImpEntrySel.value = [];
    }
    function hmImpArchByCode(code){
      const c = String(code||'').trim();
      if(!c) return null;
      return hmArchRows().find(r=> String(r['标准编号']||'')===c) || null;
    }
    function hmImpLimitNum(raw){
      const s = String(raw==null?'':raw).trim();
      if(!s) return null;
      if(/^nd$/i.test(s)) return 0;
      if(/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
      return NaN;
    }
    function hmImpCompareOne(row){
      const arch = hmImpArchByCode(row['标准编号']) || (row._archId ? hmArchRows().find(r=> r.id===row._archId) : null);
      if(!arch) return '未找到标准档案';
      const test = hmImpLimitNum(row['测试值']);
      if(test==null) return '请填写测试值';
      if(Number.isNaN(test)) return '测试值仅支持数值或 ND';
      const fails = [];
      (arch._plant||[]).forEach(p=>{
        const lim = hmImpLimitNum(p['限制值']);
        if(lim==null || Number.isNaN(lim)) return;
        if(test > lim) fails.push('不符合厂内标准');
      });
      (arch._cust||[]).forEach(p=>{
        const lim = hmImpLimitNum(p['限制值']);
        if(lim==null || Number.isNaN(lim)) return;
        if(test > lim){
          const name = String(p['客户名称']||p['客户信息']||'客户').trim() || '客户';
          fails.push('不符合'+name+'标准');
        }
      });
      (arch._law||[]).forEach(p=>{
        const lim = hmImpLimitNum(p['限制值']);
        if(lim==null || Number.isNaN(lim)) return;
        if(test > lim){
          const name = String(p['法规名称']||'法规').trim() || '法规';
          fails.push('不符合'+name+'标准');
        }
      });
      const uniq = [...new Set(fails)];
      return uniq.length ? uniq.join('、') : '合格';
    }
    function hmImpCompareEntry(){
      if(!(hmImpEntryRows.value||[]).length){ ElMessage.warning('请先添加数据录入行'); return; }
      let ok = 0, bad = 0;
      hmImpEntryRows.value.forEach(r=>{
        r['比对结果'] = hmImpCompareOne(r);
        if(r['比对结果']==='合格') ok++; else bad++;
      });
      ElMessage.success('比对完成：合格 '+ok+'，不符合 '+bad);
    }
    function onHmImpMatCatChange(){
      if(!(hmImpEntryRows.value||[]).length) return;
      hmImpEntryRows.value = [];
      hmImpEntrySel.value = [];
      ElMessage.info('已切换物料类，数据录入行已清空');
    }
    function hmArchAddLine(kind){
      const id = 'hml-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
      if(kind==='cust') hmArchCust.value.push({ id, 客户信息:'', 客户编码:'', 客户名称:'', 限制值:'' });
      else if(kind==='law') hmArchLaw.value.push({ id, 法规名称:'', 限制值:'' });
      else hmArchPlant.value.push({ id, 限制值:'' });
    }
    function hmArchDelLines(kind){
      const sel = kind==='cust' ? hmArchCustSel : kind==='law' ? hmArchLawSel : hmArchPlantSel;
      const rows = kind==='cust' ? hmArchCust : kind==='law' ? hmArchLaw : hmArchPlant;
      if(!(sel.value||[]).length){ ElMessage.warning('请先勾选要删除的行'); return; }
      const ids = new Set(sel.value.map(r=> r.id));
      rows.value = rows.value.filter(r=> !ids.has(r.id));
      sel.value = [];
    }
    function hmArchLoadLines(row){
      const copy = arr => (Array.isArray(arr) ? arr : []).map((r,i)=> Object.assign({ id: r.id || ('hml-'+i) }, r));
      hmArchPlant.value = copy(row && row._plant);
      hmArchCust.value = copy(row && row._cust);
      hmArchLaw.value = copy(row && row._law);
      hmArchPlantSel.value = [];
      hmArchCustSel.value = [];
      hmArchLawSel.value = [];
      hmArchLineTab.value = 'plant';
    }
    function formLineActionList(){
      const acts = (activeFormLineActions.value && activeFormLineActions.value.length)
        ? activeFormLineActions.value
        : ((page.value && page.value.formLineActions) || []);
      if(pageId.value===HM_ARCH_PAGE && hmArchTab()!=='tab-2') return acts.filter(a=> ((a && a.name) || a)!=='选择厂内标准');
      return acts;
    }
    function hmApplyFactoryLines(std){
      const lines = JSON.parse(JSON.stringify(std._lines || [])).map(l=>{ l['限制值'] = ''; return l; });
      if(!lines.length){ ElMessage.warning('该厂内标准没有物质限值'); return; }
      const apply = ()=>{
        formLineRows.value = lines;
        ioPickVisible.value = false;
        ElMessage.success('已带入 ' + lines.length + ' 项，限制值已清空');
      };
      const has = (formLineRows.value||[]).some(l=> String(l['中文名称']||l['限制值']||'').trim());
      if(!has){ apply(); return; }
      ElementPlus.ElMessageBox.confirm('将用所选厂内标准覆盖当前物质限值，并清空限制值。', '选择厂内标准', {
        type:'warning', confirmButtonText:'带入', cancelButtonText:'取消'
      }).then(apply).catch(()=>{});
    }
    const HM_ARCH_TYPE = { 'tab-1':'厂内标准', 'tab-2':'客户标准', 'tab-3':'法规要求' };
    const HM_ARCH_PREFIX = { 'tab-1':'HS-IN-', 'tab-2':'HS-CU-', 'tab-3':'HS-LW-' };
    function hmArchTab(){ return (tabView.value && tabView.value.name) || 'tab-1'; }
    function hmNextArchNo(){
      let max = 0;
      hmArchRows().forEach(r=>{
        const n = parseInt(String(r['标准编号']||'').replace(/\D/g,''), 10);
        if(n>max) max = n;
      });
      return String(max+1).padStart(6,'0');
    }
    function hmArchRows(){
      const bag = (MOCK[HM_ARCH_PAGE] = MOCK[HM_ARCH_PAGE] || {});
      if(!Array.isArray(bag.main)) bag.main = [];
      return bag.main;
    }
    function hmArchLimit(v){
      const s = String(v==null ? '' : v).trim();
      if(!s) return null;
      if(/^nd$/i.test(s)) return { raw:'ND', kind:'nd' };
      if(/^\d+(\.\d+)?$/.test(s)) return { raw:s, kind:'num', n:parseFloat(s) };
      return { raw:s, kind:'bad' };
    }
    function hmArchKey(line){
      const cas = String((line && line['CAS No']) || '').trim();
      if(cas && cas!=='—' && cas!=='-') return 'cas:'+cas.toLowerCase();
      const cn = String((line && line['中文名称']) || '').trim();
      return cn ? 'cn:'+cn : '';
    }
    function hmArchStricter(a, b){
      if(a.kind==='nd' && b.kind==='num') return true;
      if(a.kind==='num' && b.kind==='nd') return false;
      if(a.kind==='nd') return false;
      return a.n < b.n;
    }
    function hmArchPass(cu, fac){
      if(fac.kind==='nd') return cu.kind==='nd';
      if(cu.kind==='nd') return true;
      return cu.n <= fac.n;
    }
    function hmArchFactoryMap(){
      const map = {};
      hmArchRows('tab-1').filter(r=> r['启用状态']==='启用').forEach(std=>{
        (std._lines||[]).forEach(line=>{
          const lim = hmArchLimit(line['限制值']);
          const k = hmArchKey(line);
          if(!lim || lim.kind==='bad' || !k) return;
          const prev = map[k];
          if(!prev || hmArchStricter(lim, prev.lim)) map[k] = { lim:lim, line:line, std:std };
        });
      });
      return map;
    }
    function hmArchCompare(lines){
      const fac = hmArchFactoryMap();
      const hasFac = Object.keys(fac).length > 0;
      return (lines||[]).map(line=>{
        const name = String(line['中文名称'] || line['CAS No'] || '未命名').trim();
        const cas = String(line['CAS No'] || '').trim() || '—';
        const lim = hmArchLimit(line['限制值']);
        const cu = (line && line['单位']) || 'ppm';
        const row = { name:name, cas:cas, customer: lim ? (lim.raw+' '+cu) : (String((line && line['限制值']) || '—')), factory:'—', stdNo:'—', note:'', ok:false, skip:false, result:'不符合' };
        if(!lim || lim.kind==='bad') return Object.assign(row, { note:'限制值仅支持数值或 ND' });
        if(!hasFac) return Object.assign(row, { note:'没有启用的厂内标准' });
        const hit = fac[hmArchKey(line)];
        if(!hit) return Object.assign(row, { ok:true, skip:true, result:'厂内未维护', note:'不拦截' });
        const fu = hit.line['单位'] || 'ppm';
        const ok = hmArchPass(lim, hit.lim);
        const notes = [];
        if(cu!==fu) notes.push('单位不同，按数值比较、未换算');
        if(hit.lim.kind==='nd' && lim.kind==='nd') notes.push('厂内、客户均为 ND');
        else if(hit.lim.kind==='nd') notes.push('厂内为 ND，客户为数值');
        else if(lim.kind==='nd') notes.push('客户 ND 严于厂内数值');
        else if(lim.n===hit.lim.n) notes.push('数值相等');
        return Object.assign(row, {
          factory: hit.lim.raw+' '+fu,
          stdNo: hit.std['标准编号'] || '—',
          ok: ok,
          note: notes.join('；'),
          result: ok ? '符合' : '不符合'
        });
      });
    }
