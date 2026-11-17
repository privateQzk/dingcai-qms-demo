    function costRules(){
      const list = (MOCK[COST_PAGE] = MOCK[COST_PAGE] || { main: [] }).main || (MOCK[COST_PAGE].main = []);
      list.forEach(r=>{
        if(!r) return;
        if(r['标准系数']!=null && r['标准系数']!=='' && r['标准系数']!=='—'){
          r['标准系数'] = costHourFormat(r['标准系数']);
        }
        delete r['标准系数单位'];
      });
      return list;
    }
    function openCostForm(){
      openForm('add');
      delete formModel['标准系数单位'];
      formLineRows.value = [];
      formLineSelected.value = [];
      formCatRows.value = [];
      formCatSelected.value = [];
    }
    function saveCostForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const cats = (formCatRows.value||[]).map(r=> String(r['检验类名称']||'').trim()).filter((n,i,a)=> n && a.indexOf(n)===i);
      const mats = (formLineRows.value||[]).map(r=> ({
        code: String(r['物料编码']||'').trim(),
        name: String(r['物料名称']||'').trim(),
        spec: String(r['物料规格']||'').trim(),
        kind: String(r['物料种类']||'').trim()
      })).filter((m, i, a)=> m.code && a.findIndex(x=> x.code===m.code)===i);
      const codes = mats.map(m=> m.code);
      if(!codes.length){ ElMessage.warning('请选择物料信息'); return; }
      if(!cats.length){ ElMessage.warning('请选择检验类'); return; }
      if(!txt('标准系数')){ ElMessage.warning('请输入标准系数'); return; }
      const list = costRules();
      const enable = formSwitch['启用状态']===false ? '禁用' : '启用';
      for(const x of list){
        if(!isAdd && x.id===formModel._editId) continue;
        const cat = cats.find(c=> splitDun(x['检验类']).includes(c));
        if(!cat) continue;
        const xm = ruleMats(x);
        const mat = codes.find(c=> xm.includes(c));
        if(mat){ ElMessage.warning('检验类「'+cat+'」+ 物料「'+mat+'」已在方案 '+x['方案编码']+' 中配置，请修改后再保存'); return; }
      }
      const payload = {
        检验类: cats.join('、'),
        _cats: (formCatRows.value||[]).map(dispatchCatLine),
        匹配范围: '指定物料',
        物料信息: mats.map(m=> [m.code, m.name, m.spec].filter(Boolean).join(' / ')).join('、'),
        物料编码: codes.join('、'),
        物料名称: mats.map(m=> m.name).join('、'),
        _mats: mats.map(m=> ({ 物料编码: m.code, 物料名称: m.name, 物料规格: m.spec, 物料种类: m.kind }))
      };
      Object.assign(payload, {
        '标准系数': costHourFormat(formModel['标准系数']),
        备注: txt('备注') || '—', 启用状态: enable
      });
      delete payload['标准系数单位'];
      let saved;
      if(isAdd){
        const max = list.reduce((m, x)=> Math.max(m, parseInt(String(x['方案编码']||'').replace(/\D/g, ''), 10) || 0), 0);
        saved = Object.assign({ id: 'cb-'+Date.now(), 方案编码: 'CB'+String(max + 1).padStart(3, '0') }, payload, { 创建人:'管理员', 创建时间: nowStamp() });
        list.unshift(saved);
      } else {
        saved = list.find(x=> x.id===formModel._editId);
        if(!saved){ ElMessage.warning('未找到待编辑数据'); return; }
        Object.assign(saved, payload);
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '已新增成本方案 '+saved['方案编码'] : '保存成功');
    }
    function deleteCostRules(){
      const ids = new Set(selectedIds.value);
      if(!ids.size){ ElMessage.warning('请先勾选要删除的成本方案'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条成本方案？已生成的成本分摊不受影响，之后完成检验的样品按剩余方案匹配。', '批量删除', { type:'warning' }).then(()=>{
        const list = costRules();
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条成本方案');
      }).catch(()=>{});
    }
    /** 多维度统计表：分摊汇总由分摊明细按「统计月份 + 部门 + 送检人」实时汇总 */
    function costStatDetails(){ return costFlowRows().length ? costFlowRows() : (((MOCK[COST_STAT]||{})['tab-2']) || []); }
    function costStatFilterByMonth(ds, q){
      const rg = q['统计月份'];
      if(!rg) return ds;
      if(Array.isArray(rg) && rg.length>=2){
        const a = rg[0] ? String(rg[0]).slice(0, 10) : '';
        const b = rg[1] ? String(rg[1]).slice(0, 10) : '';
        if(!a && !b) return ds;
        return ds.filter(r=>{
          const d = String(r['检验完成时间']||'').slice(0, 10);
          if(a && d < a) return false;
          if(b && d > b) return false;
          return true;
        });
      }
      if(typeof rg==='string') return ds.filter(r=> String(r['检验完成时间']||'').slice(0, 7)===rg);
      return ds;
    }
    function costStatSummary(q){
      let ds = applyContainsExactQuery(costStatDetails(), q, [], ['送检人','部门']);
      ds = costStatFilterByMonth(ds, q);
      const total = ds.reduce((s, r)=> s + costHourHours(r), 0);
      const groups = new Map();
      ds.forEach(r=>{
        const mon = String(r['检验完成时间']||'').slice(0, 7);
        const key = [mon, r['部门'], r['送检人']].join('|');
        if(!groups.has(key)) groups.set(key, { id: 'cst-'+key, 统计月份: mon, 部门: r['部门'], 送检人: r['送检人'],
          orders: new Set(), samples: new Set(), times: 0, hours: 0, miss: 0 });
        const g = groups.get(key);
        g.orders.add(r['报检单号']); g.samples.add(r['样品编号']);
        g.times += 1; g.hours += costHourHours(r);
        if(r['匹配结果']==='未配置') g.miss += 1;
      });
      return [...groups.values()].map(g=> ({
        id: g.id, 统计月份: g.统计月份, 部门: g.部门, 送检人: g.送检人,
        报检单数: String(g.orders.size), 样品数: String(g.samples.size), 检验类次: String(g.times),
        '标准系数': costHourText(g.hours), 系数占比: (total ? g.hours / total * 100 : 0).toFixed(1)+'%', 未配置数: String(g.miss)
      })).sort((a, b)=> b['统计月份'].localeCompare(a['统计月份']) || costHourHours(b) - costHourHours(a));
    }
    function costStatOptions(name){
      if(name==='统计月份') return [...new Set(costStatDetails().map(r=> String(r['检验完成时间']||'').slice(0, 7)).filter(Boolean))].sort().reverse();
      return [...new Set(costStatDetails().map(r=> r[name]).filter(flowHas))];
    }
    function openCostStatDetail(row){
      const mon = row['统计月份'];
      const last = new Date(+mon.slice(0, 4), +mon.slice(5, 7), 0).getDate();
      activeTab.value = 'tab-2';
      selectedIds.value = []; pageNum.value = 1;
      nextTick(()=>{
        resetQueryModel();
        Object.assign(query, {
          统计月份: [mon+'-01', mon+'-'+String(last).padStart(2, '0')],
          送检人: row['送检人'], 部门: row['部门']
        });
        queryExpanded.value = true;
      });
    }
    function costStatMultiHit(val, selected){
      if(selected==null || selected==='') return true;
      const list = (Array.isArray(selected) ? selected : [selected]).filter(v=> v!=='' && v!=null);
      if(!list.length) return true;
      return list.includes(val);
    }
    function costStatDetailRows(q){
      let ds = costStatDetails().map(r=> ({ ...r, 统计月份: String(r['检验完成时间']||'').slice(0, 7) }));
      ds = costStatFilterByMonth(ds, q);
      ds = applyContainsExactQuery(ds, q, ['报检单号','样品编号'], ['送检人','匹配结果']);
      ds = ds.filter(r=> costStatMultiHit(r['部门'], q['部门']) && costStatMultiHit(r['检验类'], q['检验类']));
      return ds.sort((a, b)=> String(b['检验完成时间']||'').localeCompare(String(a['检验完成时间']||'')));
    }
    const COST_DIMS = ['统计月份','报检类型','部门','送检人','物料种类','物料名称','检验类','检验班组','检验人','车间名称','产线名称','供应商名称','客户名称','研发项目号','来样单位','检验结论'];
    const COST_MEASURES = ['报检单数','样品数','检验类次','标准系数','系数占比','单均系数'];
    const COST_PIVOT_ORDER = ['标准系数','检验类次','报检单数','样品数'];
    const COST_DEFAULT_ROWS = ['统计月份','部门','送检人'];
    const COST_DEFAULT_MEASURES = ['报检单数','样品数','检验类次','标准系数','系数占比'];
    const costPivot = reactive({
      date:['2026-08-01','2026-09-30'], types:[], depts:[], people:[], cats:[], teams:[], kinds:[],
      conclusion:'', project:'', matCode:'', more:false,
      rows:COST_DEFAULT_ROWS.slice(), col:'', dimAdd:'', dragFrom:-1, dragOver:-1,
      measures:COST_DEFAULT_MEASURES.slice(),
      queried:false, table:[], columns:[], hit:0, hours:'0.00', miss:0
    });
    const costFlowDlg = reactive({ visible:false, title:'', rows:[] });
    function costDimVal(r, dim){
      if(dim==='统计月份') return String(r['检验完成时间']||'').slice(0,7) || '—';
      const v = r[dim];
      return (v==null || String(v).trim()==='' || v==='—') ? '—' : String(v);
    }
    function costFlowAll(){ return costFlowRows(); }
    function costFlowOpts(name){
      return [...new Set(costFlowAll().map(r=> costDimVal(r, name)).filter(v=> v && v!=='—'))].sort();
    }
    function costFiltered(){
      let ds = costFlowAll().slice();
      const rg = costPivot.date;
      if(Array.isArray(rg) && (rg[0] || rg[1])){
        const a = rg[0] ? String(rg[0]).slice(0,10) : '';
        const b = rg[1] ? String(rg[1]).slice(0,10) : '';
        ds = ds.filter(r=>{
          const d = String(r['检验完成时间']||'').slice(0,10);
          if(a && d < a) return false;
          if(b && d > b) return false;
          return true;
        });
      }
      const hit = (field, selected)=>{
        const list = (Array.isArray(selected) ? selected : [selected]).filter(v=> v!=='' && v!=null);
        if(!list.length) return;
        ds = ds.filter(r=> list.includes(r[field]));
      };
      hit('报检类型', costPivot.types);
      hit('部门', costPivot.depts);
      hit('送检人', costPivot.people);
      hit('检验类', costPivot.cats);
      hit('检验班组', costPivot.teams);
      hit('物料种类', costPivot.kinds);
      if(costPivot.conclusion) ds = ds.filter(r=> r['检验结论']===costPivot.conclusion);
      const pj = String(costPivot.project||'').trim();
      if(pj) ds = ds.filter(r=> String(r['研发项目号']||'').includes(pj));
      const mc = String(costPivot.matCode||'').trim();
      if(mc) ds = ds.filter(r=> String(r['物料编码']||'').includes(mc));
      return ds;
    }
    function costAgg(rows){
      const orders = new Set(), samples = new Set();
      let hours = 0, miss = 0;
      rows.forEach(r=>{
        if(r['报检单号']) orders.add(r['报检单号']);
        if(r['样品编号']) samples.add(r['样品编号']);
        hours += costHourHours(r);
        if(r['匹配结果']==='未配置') miss += 1;
      });
      return { orders: orders.size, samples: samples.size, times: rows.length, hours, miss };
    }
    function costFmtMeasure(key, g, total){
      if(key==='报检单数') return String(g.orders);
      if(key==='样品数') return String(g.samples);
      if(key==='检验类次') return String(g.times);
      if(key==='标准系数') return g.hours.toFixed(2);
      if(key==='系数占比') return (total.hours ? g.hours / total.hours * 100 : 0).toFixed(1) + '%';
      if(key==='单均系数') return g.orders ? (g.hours / g.orders).toFixed(2) : '—';
      return '';
    }
    function costDragStart(i, e){
      if(e.target && e.target.closest && e.target.closest('.cost-stat__x')){ e.preventDefault(); return; }
      costPivot.dragFrom = i;
      if(e.dataTransfer){
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(i)); } catch (err) {}
      }
    }
    function costDragOver(i){ if(costPivot.dragFrom>=0) costPivot.dragOver = i; }
    function costDragDrop(i){
      const from = costPivot.dragFrom;
      costPivot.dragFrom = -1;
      costPivot.dragOver = -1;
      if(from<0 || from===i) return;
      const arr = costPivot.rows.slice();
      const [item] = arr.splice(from, 1);
      arr.splice(i, 0, item);
      costPivot.rows = arr;
      if(costPivot.rows.includes(costPivot.col)) costPivot.col = '';
    }
    function costDragEnd(){ costPivot.dragFrom = -1; costPivot.dragOver = -1; }
    function costRemoveDim(i){
      if(costPivot.rows.length<=1){ ElMessage.warning('请至少保留一个行维度'); return; }
      const name = costPivot.rows[i];
      costPivot.rows = costPivot.rows.filter((_, idx)=> idx!==i);
      if(costPivot.col===name) costPivot.col = '';
    }
    function costAddDim(name){
      costPivot.dimAdd = '';
      if(!name || costPivot.rows.includes(name)) return;
      costPivot.rows = costPivot.rows.concat(name);
      if(costPivot.col===name) costPivot.col = '';
    }
    function costRestoreAnalysis(){
      costPivot.rows = COST_DEFAULT_ROWS.slice();
      costPivot.col = '';
      costPivot.measures = COST_DEFAULT_MEASURES.slice();
    }
    function costPivotReset(){
      costPivot.date = ['2026-08-01','2026-09-30'];
      costPivot.types = []; costPivot.depts = []; costPivot.people = [];
      costPivot.cats = []; costPivot.teams = []; costPivot.kinds = [];
      costPivot.conclusion = ''; costPivot.project = ''; costPivot.matCode = '';
      costRestoreAnalysis();
      costPivotQuery();
    }
    function costPivotRowClass({ row }){ return row && row._total ? 'cost-stat__total' : ''; }
    function costPivotQuery(){
      if(!costPivot.rows.length){ ElMessage.warning('请至少选择一个行维度'); return; }
      if(!costPivot.measures.length){ ElMessage.warning('请至少选择一个指标'); return; }
      const ds = costFiltered();
      const total = costAgg(ds);
      let colKey = costPivot.col && !costPivot.rows.includes(costPivot.col) ? costPivot.col : '';
      let colVals = [];
      if(colKey){
        colVals = [...new Set(ds.map(r=> costDimVal(r, colKey)))].sort();
        if(colVals.length > 12){
          ElMessage.warning('列维度取值超过 12 个，请缩小筛选或改为行维度');
          colKey = ''; colVals = [];
        }
      }
      const primary = colKey ? (COST_PIVOT_ORDER.find(k=> costPivot.measures.includes(k)) || '') : '';
      if(colKey && !primary){
        ElMessage.warning('当前指标不能横向展开，已按不透视出表');
        colKey = ''; colVals = [];
      }
      const groups = new Map();
      ds.forEach(r=>{
        const key = costPivot.rows.map(d=> costDimVal(r, d)).join('\u0001');
        if(!groups.has(key)) groups.set(key, { dims: costPivot.rows.map(d=> costDimVal(r, d)), rows: [] });
        groups.get(key).rows.push(r);
      });
      const rowMeasures = costPivot.measures.filter(m=> !(colKey && m===primary));
      const columns = costPivot.rows.map(d=> ({ prop:d, label:d, width:120, fixed:'left' }));
      rowMeasures.forEach(m=> columns.push({ prop:'m_'+m, label:m, width:120, link:true }));
      colVals.forEach((v, idx)=> columns.push({ prop:'p_'+idx, label:v+' '+primary, width:140, link:true, colVal:v }));
      if(colKey) columns.push({ prop:'p_sum', label:primary+'合计', width:120, link:true });
      const sortOf = g=> colKey ? (primary==='检验类次' ? g.times : primary==='报检单数' ? g.orders : primary==='样品数' ? g.samples : g.hours) : (costPivot.measures.includes('标准系数') ? g.hours : g.times);
      let table = [...groups.values()].map(g=>{
        const agg = costAgg(g.rows);
        const row = { _src: g.rows, _sort: sortOf(agg) };
        costPivot.rows.forEach((d, i)=> { row[d] = g.dims[i]; });
        rowMeasures.forEach(m=> { row['m_'+m] = costFmtMeasure(m, agg, total); });
        if(colKey){
          colVals.forEach((v, idx)=>{
            row['p_'+idx] = costFmtMeasure(primary, costAgg(g.rows.filter(r=> costDimVal(r, colKey)===v)), total);
          });
          row.p_sum = costFmtMeasure(primary, agg, total);
        }
        return row;
      }).sort((a, b)=> b._sort - a._sort);
      const sum = { _total:true, _src: ds };
      costPivot.rows.forEach((d, i)=> { sum[d] = i===0 ? '合计' : '—'; });
      rowMeasures.forEach(m=> { sum['m_'+m] = costFmtMeasure(m, total, total); });
      if(colKey){
        colVals.forEach((v, idx)=>{
          sum['p_'+idx] = costFmtMeasure(primary, costAgg(ds.filter(r=> costDimVal(r, colKey)===v)), total);
        });
        sum.p_sum = costFmtMeasure(primary, total, total);
      }
      if(table.length) table.push(sum);
      costPivot.columns = columns;
      costPivot.table = table;
      costPivot.queried = true;
      costPivot.hit = ds.length;
      costPivot.hours = total.hours.toFixed(2);
      costPivot.miss = total.miss;
    }
    watch(()=> pageId.value, v=>{ if(v===COST_STAT && !costPivot.queried) costPivotQuery(); }, { immediate:true });
    function costOpenFlow(row, col){
      let rows = row._src || [];
      if(col && col.colVal!=null) rows = rows.filter(r=> costDimVal(r, costPivot.col)===col.colVal);
      costFlowDlg.rows = rows;
      const title = row._total ? '合计' : costPivot.rows.map(d=> row[d]).join(' / ');
      costFlowDlg.title = col && col.colVal!=null ? (title+' · '+col.colVal) : title;
      costFlowDlg.visible = true;
    }
    function costPivotExport(){
      if(!costPivot.queried){ ElMessage.warning('请先查询'); return; }
      if(!costPivot.table.length){ ElMessage.warning('没有可导出的数据'); return; }
      const cols = costPivot.columns;
      const esc = v=> String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const head = '<tr>'+cols.map(c=> '<th>'+esc(c.label)+'</th>').join('')+'</tr>';
      const body = costPivot.table.map(r=> '<tr>'+cols.map(c=> '<td>'+esc(r[c.prop])+'</td>').join('')+'</tr>').join('');
      const html = '<html><head><meta charset="utf-8"></head><body><table border="1">'+head+body+'</table></body></html>';
      const blob = new Blob([html], { type:'application/vnd.ms-excel' });
      const a = document.createElement('a');
      const rg = costPivot.date || [];
      const a1 = rg[0] ? String(rg[0]).slice(0,10).replace(/-/g,'') : '全部';
      const b1 = rg[1] ? String(rg[1]).slice(0,10).replace(/-/g,'') : '全部';
      a.href = URL.createObjectURL(blob);
      a.download = '检验成本多维度统计_'+a1+'_'+b1+'.xls';
      document.body.appendChild(a); a.click(); a.remove();
      ElMessage.success('已导出当前统计结果');
    }
    const INSP_RPT = 'np-0417-01';
    const INSP_MEASURES = ['报检单数','样品数','检验项次','合格项次','不合格项次','合格率'];
    const INSP_PIVOT_ORDER = ['检验项次','合格项次','不合格项次','样品数','报检单数'];
    const INSP_DEFAULT_ROWS = ['物料名称','检验项名称'];
    const INSP_DEFAULT_MEASURES = ['检验项次','合格项次','不合格项次','合格率'];
    const inspRpt = reactive({
      date:null, types:[], kinds:[],
      mats:[], matLabel:'', items:[], results:[], points:[], pointLabel:'', suppliers:[], supplierLabel:'', customers:[], customerLabel:'',
      rows:INSP_DEFAULT_ROWS.slice(), col:'', dimAdd:'', dragFrom:-1, dragOver:-1,
      measures:INSP_DEFAULT_MEASURES.slice(),
      queried:false, table:[], columns:[], hit:0, rate:'—', samples:0, orders:0
    });
    const inspDetailDlg = reactive({ visible:false, title:'', rows:[] });
    function inspDims(){
      return ['报检类型','统计月份','物料名称','物料种类','采样点','检验项名称','检验项类型','检验结论','检验班组','检验人','供应商名称','原料类型','客户名称','车间名称','产线名称'];
    }
    function inspDimChoices(){ return inspDims().filter(d=> !inspRpt.rows.includes(d)); }
    function inspColChoices(){ return inspDims().filter(d=> d!=='检验结论' && !inspRpt.rows.includes(d)); }
    function openInspPick(field){ openIoPick(IO_PICK_FIELD[field], 'inspRpt', field, true); }
    function inspRptPickKeys(field){
      if(field==='物料信息') return inspRpt.mats;
      if(field==='采样点') return inspRpt.points;
      if(field==='供应商信息') return inspRpt.suppliers;
      return inspRpt.customers;
    }
    function inspApplyMulti(field, rows){
      const list = rows || [];
      if(field==='物料信息'){
        inspRpt.mats = list.map(r=> r['物料编码']).filter(Boolean);
        inspRpt.matLabel = list.map(r=> ioPickText('mat', r)).filter(Boolean).join('、');
      } else if(field==='采样点'){
        inspRpt.points = list.map(r=> r['采样点名称']).filter(Boolean);
        inspRpt.pointLabel = inspRpt.points.join('、');
      } else if(field==='供应商信息'){
        inspRpt.suppliers = list.map(r=> r['供应商编码']).filter(Boolean);
        inspRpt.supplierLabel = list.map(r=> ioPickText('supplier', r)).filter(Boolean).join('、');
      } else {
        inspRpt.customers = list.map(r=> r['客户编码']).filter(Boolean);
        inspRpt.customerLabel = list.map(r=> ioPickText('customer', r)).filter(Boolean).join('、');
      }
    }
    function inspClearPick(field){
      if(field==='物料信息'){ inspRpt.mats = []; inspRpt.matLabel = ''; }
      else if(field==='采样点'){ inspRpt.points = []; inspRpt.pointLabel = ''; }
      else if(field==='供应商信息'){ inspRpt.suppliers = []; inspRpt.supplierLabel = ''; }
      else { inspRpt.customers = []; inspRpt.customerLabel = ''; }
    }
    function inspItemOptions(){
      const list = (((MOCK['insp-project']||{})['tab-item'])||[]).filter(r=> r['启用状态']!=='停用' && r['检验项名称']);
      return [...new Set(list.map(r=> r['检验项名称']))].sort();
    }
    const INSP_TYPE_SKIP = ['外来小样检','库内复检','通用检','内部委托'];
    function inspTypeOptions(){
      return FLOW_TABS.map(t=> t.label).filter(t=> t && !INSP_TYPE_SKIP.includes(t));
    }
    function inspKindOptions(){
      const dict = (window.WMS_DICT && window.WMS_DICT.enabledNames('MAT_KIND', MOCK.dict)) || [];
      const seen = new Set(dict);
      const extra = [];
      Object.values(MOCK.ledger||{}).forEach(list=>{
        (list||[]).forEach(r=>{
          const k = String(r['物料种类']||'').trim();
          if(k && k!=='—' && !seen.has(k)){ seen.add(k); extra.push(k); }
        });
      });
      extra.sort();
      return dict.concat(extra);
    }
    function inspResultText(r){
      if(r['检验项类型']==='定性') return String(r['检验结果']||'').trim();
      const out = String(r['检验报出值']||'').trim();
      return (out && out!=='—') ? out : String(r['检验结果值']||'').trim();
    }
    function inspPickCode(text){
      const s = String(text||'').trim();
      if(!s) return '';
      return s.split('/')[0].trim();
    }
    function inspRptSource(){
      const allow = new Set(inspTypeOptions());
      const tabs = (FLOW_TABS.length ? FLOW_TABS : [{ name:'tab-pi', label:'采购来料检' }]).filter(t=> allow.has(t.label));
      return tabs.flatMap(t=> ((MOCK.ledger||{})[t.name]||[]).filter(s=> s['样品状态']==='已完成').flatMap(s=>{
        const demo = buildLedgerInspDemo(s);
        const matName = (!s['物料编码'] || s['物料编码']==='—') ? (s['样品名称'] || s['物料名称'] || '—') : (s['物料名称'] || '—');
        const type = (s['报检类型'] && s['报检类型']!=='—') ? s['报检类型'] : t.label;
        const qual = (demo.qual||[]).map(it=> Object.assign({ 检验项类型:'定性' }, it));
        const quant = (demo.quant||[]).map(it=> Object.assign({ 检验项类型:'定量' }, it));
        return qual.concat(quant).map(it=> Object.assign({}, s, {
          报检类型: type,
          物料名称: matName,
          检验项编码: it['检验项编码'] || '',
          检验项名称: it['检验项名称'] || '—',
          检验项类型: it['检验项类型'],
          检验结果: it['检验项类型']==='定性' ? (it['检验结果'] || '') : '',
          检验报出值: it['检验报出值'] || '',
          检验结果值: it['检验结果值'] || '',
          检验结论: (it['检验结论'] && it['检验结论']!=='—') ? it['检验结论'] : '—'
        }));
      }));
    }
