    function inspDimVal(r, dim){
      if(dim==='统计月份') return String(r['检验完成时间']||'').slice(0,7) || '—';
      const v = r[dim];
      return (v==null || String(v).trim()==='' || v==='—') ? '—' : String(v);
    }
    function inspFiltered(){
      let ds = inspRptSource();
      const rg = inspRpt.date;
      if(Array.isArray(rg) && (rg[0] || rg[1])){
        const a = rg[0] ? String(rg[0]).slice(0,10) : '';
        const b = rg[1] ? String(rg[1]).slice(0,10) : '';
        ds = ds.filter(r=>{
          const d = String(r['检验完成时间']||'').slice(0,10);
          if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
          if(a && d < a) return false;
          if(b && d > b) return false;
          return true;
        });
      }
      if(inspRpt.types.length) ds = ds.filter(r=> inspRpt.types.includes(r['报检类型']));
      if(inspRpt.kinds.length) ds = ds.filter(r=> inspRpt.kinds.includes(r['物料种类']));
      if(inspRpt.mats.length) ds = ds.filter(r=> inspRpt.mats.includes(r['物料编码']));
      if(inspRpt.items.length) ds = ds.filter(r=> inspRpt.items.includes(r['检验项名称']));
      if(inspRpt.results.length) ds = ds.filter(r=> inspRpt.results.includes(r['检验结论']));
      if(inspRpt.points.length) ds = ds.filter(r=> inspRpt.points.includes(r['采样点']));
      if(inspRpt.suppliers.length) ds = ds.filter(r=> inspRpt.suppliers.includes(r['供应商编码']));
      if(inspRpt.customers.length) ds = ds.filter(r=> inspRpt.customers.includes(r['客户编码']));
      return ds;
    }
    function inspAgg(rows){
      const orders = new Set(), samples = new Set();
      let pass = 0, fail = 0;
      rows.forEach(r=>{
        if(r['报检单号'] && r['报检单号']!=='—') orders.add(r['报检单号']);
        if(r['样品编号'] && r['样品编号']!=='—') samples.add(r['样品编号']);
        if(r['检验结论']==='合格') pass++;
        else if(r['检验结论']==='不合格') fail++;
      });
      return { orders:orders.size, samples:samples.size, times:rows.length, pass, fail };
    }
    function inspFmtMeasure(key, g){
      if(key==='报检单数') return String(g.orders);
      if(key==='样品数') return String(g.samples);
      if(key==='检验项次') return String(g.times);
      if(key==='合格项次') return String(g.pass);
      if(key==='不合格项次') return String(g.fail);
      if(key==='合格率'){
        const d = g.pass + g.fail;
        return d ? (g.pass / d * 100).toFixed(1) + '%' : '—';
      }
      return '';
    }
    function inspDragStart(i, e){
      if(e.target && e.target.closest && e.target.closest('.cost-stat__x')){ e.preventDefault(); return; }
      inspRpt.dragFrom = i;
      if(e.dataTransfer){ e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (err) {} }
    }
    function inspDragOver(i){ if(inspRpt.dragFrom>=0) inspRpt.dragOver = i; }
    function inspDragDrop(i){
      const from = inspRpt.dragFrom;
      inspRpt.dragFrom = -1; inspRpt.dragOver = -1;
      if(from<0 || from===i) return;
      const arr = inspRpt.rows.slice();
      const [item] = arr.splice(from, 1);
      arr.splice(i, 0, item);
      inspRpt.rows = arr;
      if(inspRpt.rows.includes(inspRpt.col)) inspRpt.col = '';
    }
    function inspDragEnd(){ inspRpt.dragFrom = -1; inspRpt.dragOver = -1; }
    function inspRemoveDim(i){
      if(inspRpt.rows.length<=1){ ElMessage.warning('请至少保留一个行维度'); return; }
      inspRpt.rows = inspRpt.rows.filter((_, idx)=> idx!==i);
    }
    function inspAddDim(name){
      inspRpt.dimAdd = '';
      if(!name || inspRpt.rows.includes(name)) return;
      inspRpt.rows = inspRpt.rows.concat(name);
      if(inspRpt.col===name) inspRpt.col = '';
    }
    function inspRestoreAnalysis(){
      inspRpt.rows = INSP_DEFAULT_ROWS.slice();
      inspRpt.col = '';
      inspRpt.measures = INSP_DEFAULT_MEASURES.slice();
    }
    function inspRptReset(){
      inspRpt.date = null;
      inspRpt.types = []; inspRpt.kinds = [];
      inspRpt.mats = []; inspRpt.matLabel = ''; inspRpt.items = []; inspRpt.results = [];
      inspRpt.points = []; inspRpt.pointLabel = '';
      inspRpt.suppliers = []; inspRpt.supplierLabel = ''; inspRpt.customers = []; inspRpt.customerLabel = '';
      inspRestoreAnalysis();
      inspRptQuery();
    }
    function inspRptRowClass({ row }){ return row && row._total ? 'cost-stat__total' : ''; }
    function inspRptQuery(){
      if(!inspRpt.rows.length){ ElMessage.warning('请至少选择一个行维度'); return; }
      if(!inspRpt.measures.length){ ElMessage.warning('请至少选择一个指标'); return; }
      if(inspRpt.col==='检验结论') inspRpt.col = '';
      const ds = inspFiltered();
      const total = inspAgg(ds);
      let colKey = inspRpt.col && !inspRpt.rows.includes(inspRpt.col) ? inspRpt.col : '';
      let colVals = [];
      if(colKey){
        colVals = [...new Set(ds.map(r=> inspDimVal(r, colKey)))].sort();
        if(colVals.length > 12){
          ElMessage.warning('列维度取值超过 12 个，请缩小筛选或改为行维度');
          colKey = ''; colVals = [];
        }
      }
      const primary = colKey ? (INSP_PIVOT_ORDER.find(k=> inspRpt.measures.includes(k)) || '') : '';
      if(colKey && !primary){
        ElMessage.warning('当前指标不能横向展开，已按不透视出表');
        colKey = ''; colVals = [];
      }
      const groups = new Map();
      ds.forEach(r=>{
        const key = inspRpt.rows.map(d=> inspDimVal(r, d)).join('\u0001');
        if(!groups.has(key)) groups.set(key, { dims: inspRpt.rows.map(d=> inspDimVal(r, d)), rows:[] });
        groups.get(key).rows.push(r);
      });
      const rowMeasures = inspRpt.measures.filter(m=> !(colKey && m===primary));
      const columns = inspRpt.rows.map(d=> ({ prop:d, label:d, width:140, fixed:'left' }));
      rowMeasures.forEach(m=> columns.push({ prop:'m_'+m, label:m, width:110, link: m!=='合格率' }));
      colVals.forEach((v, idx)=> columns.push({ prop:'p_'+idx, label:v+' '+primary, width:140, link:true, colVal:v }));
      if(colKey) columns.push({ prop:'p_sum', label:primary+'合计', width:120, link:true });
      const sortOf = g=> colKey ? (primary==='检验项次' ? g.times : primary==='合格项次' ? g.pass : primary==='不合格项次' ? g.fail : primary==='样品数' ? g.samples : g.orders) : g.times;
      let table = [...groups.values()].map(g=>{
        const agg = inspAgg(g.rows);
        const row = { _src: g.rows, _sort: sortOf(agg) };
        inspRpt.rows.forEach((d, i)=> { row[d] = g.dims[i]; });
        rowMeasures.forEach(m=> { row['m_'+m] = inspFmtMeasure(m, agg); });
        if(colKey){
          colVals.forEach((v, idx)=>{
            row['p_'+idx] = inspFmtMeasure(primary, inspAgg(g.rows.filter(r=> inspDimVal(r, colKey)===v)));
          });
          row.p_sum = inspFmtMeasure(primary, agg);
        }
        return row;
      }).sort((a, b)=> b._sort - a._sort);
      const sum = { _total:true, _src: ds };
      inspRpt.rows.forEach((d, i)=> { sum[d] = i===0 ? '合计' : '—'; });
      rowMeasures.forEach(m=> { sum['m_'+m] = inspFmtMeasure(m, total); });
      if(colKey){
        colVals.forEach((v, idx)=>{
          sum['p_'+idx] = inspFmtMeasure(primary, inspAgg(ds.filter(r=> inspDimVal(r, colKey)===v)));
        });
        sum.p_sum = inspFmtMeasure(primary, total);
      }
      if(table.length) table.push(sum);
      inspRpt.columns = columns;
      inspRpt.table = table;
      inspRpt.queried = true;
      inspRpt.hit = total.times;
      inspRpt.rate = inspFmtMeasure('合格率', total);
      inspRpt.samples = total.samples;
      inspRpt.orders = total.orders;
    }
    watch(()=> pageId.value, v=>{ if(v===INSP_RPT && !inspRpt.queried) inspRptQuery(); }, { immediate:true });
    function inspOpenDetail(row, col){
      let rows = row._src || [];
      if(col && col.colVal!=null) rows = rows.filter(r=> inspDimVal(r, inspRpt.col)===col.colVal);
      inspDetailDlg.rows = rows;
      const title = row._total ? '合计' : inspRpt.rows.map(d=> row[d]).join(' / ');
      inspDetailDlg.title = col && col.colVal!=null ? (title+' · '+col.colVal) : title;
      inspDetailDlg.visible = true;
    }
    function inspRptExport(){
      if(!inspRpt.queried){ ElMessage.warning('请先查询'); return; }
      if(!inspRpt.table.length){ ElMessage.warning('没有可导出的数据'); return; }
      const cols = inspRpt.columns;
      const esc = v=> String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const head = '<tr>'+cols.map(c=> '<th>'+esc(c.label)+'</th>').join('')+'</tr>';
      const body = inspRpt.table.map(r=> '<tr>'+cols.map(c=> '<td>'+esc(r[c.prop])+'</td>').join('')+'</tr>').join('');
      const html = '<html><head><meta charset="utf-8"></head><body><table border="1">'+head+body+'</table></body></html>';
      const blob = new Blob([html], { type:'application/vnd.ms-excel' });
      const a = document.createElement('a');
      const rg = inspRpt.date || [];
      const a1 = rg[0] ? String(rg[0]).slice(0,10) : '全部';
      const b1 = rg[1] ? String(rg[1]).slice(0,10) : '全部';
      a.href = URL.createObjectURL(blob);
      a.download = '检验结果多维报表_'+a1+'_'+b1+'.xls';
      document.body.appendChild(a); a.click(); a.remove();
      ElMessage.success('已导出当前统计结果');
    }
    watch(()=> formModel['派单班组'], v=>{
      if(pageId.value!==DISPATCH_PAGE) return;
      const n = splitDun(v).length;
      formModel['分配方式'] = n ? (n > 1 ? '手动分配（多个候选班组）' : '自动分配') : '';
    }, { deep:true });
    watch(()=> formModel['来样类型'], (nv, ov)=>{
      if(pageId.value!=='insp-order' || nv===ov || !ov) return;
      formModel['来样单位'] = '';
    });
    function nextInspOrderNo(){
      const d = new Date();
      const prefix = 'BJ' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
      let max = 0;
      Object.values(MOCK['insp-order']||{}).forEach(list=> (list||[]).forEach(r=>{
        const v = String(r['报检单号']||'');
        if(v.startsWith(prefix)) max = Math.max(max, parseInt(v.slice(prefix.length), 10) || 0);
      }));
      return prefix + String(max + 1).padStart(3, '0');
    }
    function syncAddSampleCount(){
      if(!formModel['报检单号']){ formModel['现应取样件数'] = ''; return; }
      const base = parseInt(formModel['原应取样件数'], 10) || 0;
      const add = parseInt(formModel['本次加样件数'], 10);
      formModel['现应取样件数'] = String(base + (add > 0 ? add : 0));
    }
    watch(()=> formModel['报检单类型'], (nv, ov)=>{
      // 内部委托：报检单类型由样品带入，不再因切换类型清空样品
      if(!['add-sample','np-0201-01'].includes(pageId.value) || nv===ov || !ov) return;
      formModel['报检单号'] = '';
      ADD_SAMPLE_CARRY.forEach(key=>{ formModel[key] = ''; });
      if(pageId.value==='add-sample'){
        formModel['原应取样件数'] = '';
        formModel['现应取样件数'] = '';
      } else {
        formModel['基本单位'] = '';
        formModel['物料信息'] = '';
        formModel['往来单位类型'] = '';
        formModel['往来单位名称'] = '';
      }
    });
    function urFillPartnerFromOrder(){
      const sup = formModel['供应商名称'] && formModel['供应商名称']!=='—' ? formModel['供应商名称'] : '';
      const cus = formModel['客户名称'] && formModel['客户名称']!=='—' ? formModel['客户名称'] : '';
      const incoming = formModel['报检单类型']==='采购来料检';
      const kind = incoming ? (sup ? '供应商' : (cus ? '客户' : '')) : (cus ? '客户' : (sup ? '供应商' : ''));
      const name = kind==='供应商' ? sup : (kind==='客户' ? cus : '');
      formModel['往来单位类型'] = kind;
      formModel['往来单位名称'] = name;
    }
    function urReleaseHydrateForm(row){
      if(!row) return;
      if(!formModel['物料信息']) formModel['物料信息'] = joinMatInfoSlash(row) || joinMatInfoSlash(formModel);
      if(!formModel['往来单位类型']){
        if(row['往来单位类型']) formModel['往来单位类型'] = row['往来单位类型'];
        else if(row['客户名称'] && row['客户名称']!=='—') formModel['往来单位类型'] = '客户';
        else if(row['供应商名称'] && row['供应商名称']!=='—') formModel['往来单位类型'] = '供应商';
      }
      if(!formModel['往来单位名称']){
        if(row['往来单位名称']) formModel['往来单位名称'] = row['往来单位名称'];
        else if(formModel['往来单位类型']==='客户') formModel['往来单位名称'] = row['客户名称'] && row['客户名称']!=='—' ? row['客户名称'] : '';
        else if(formModel['往来单位类型']==='供应商') formModel['往来单位名称'] = row['供应商名称'] && row['供应商名称']!=='—' ? row['供应商名称'] : '';
      }
      if(!formModel['放行原因'] && row['申请原因']) formModel['放行原因'] = row['申请原因'];
    }
    watch(()=> formModel['本次加样件数'], ()=>{
      if(pageId.value==='add-sample') syncAddSampleCount();
    });
    function autoSampInspSchemeList(){
      const bag = (window.WMS_MOCK_ROWS || MOCK)['insp-scheme'] || {};
      const out = [];
      ['tab-pi','tab-pp','tab-pm','tab-sst','tab-rd','tab-ext','tab-wr','tab-gen','tab-oe','main'].forEach(k=>{
        const arr = bag[k];
        if(Array.isArray(arr)) arr.forEach(r=> out.push(r));
      });
      return out;
    }
    function autoSampInspItemList(){
      const bag = (window.WMS_MOCK_ROWS || MOCK)['insp-project'] || {};
      let rows = Array.isArray(bag['tab-item']) ? bag['tab-item'].slice()
        : Array.isArray(bag.main) ? bag.main.slice() : [];
      if(!rows.length){
        // fallback: flatten any array bags
        Object.keys(bag).forEach(k=>{ if(Array.isArray(bag[k])) rows = rows.concat(bag[k]); });
      }
      return rows;
    }
    const autoSampPickColumns = computed(()=>{
      const k=autoSampPickKind.value;
      if(k==='mat') return [
        {field:'物料编码',title:'物料编码',width:130},{field:'物料名称',title:'物料名称',width:150},
        {field:'物料规格',title:'物料规格',width:120},{field:'物料种类',title:'物料种类',width:110},{field:'启用状态',title:'启用状态',width:90}
      ];
      if(k==='line') return [
        {field:'产线编码',title:'产线编码',width:130},{field:'产线名称',title:'产线名称',width:150},
        {field:'所属车间',title:'所属车间',width:140},{field:'启用状态',title:'启用状态',width:90}
      ];
      if(k==='point') return [
        {field:'采样点编码',title:'采样点编码',width:130},{field:'采样点名称',title:'采样点名称',width:150},
        {field:'所属产线',title:'所属产线',width:130},{field:'适用报检单',title:'适用报检单',width:140},{field:'启用状态',title:'启用状态',width:90}
      ];
      if(k==='team') return [
        {field:'班组编码',title:'班组编码',width:120},{field:'班组名称',title:'班组名称',width:140},
        {field:'备注',title:'备注',width:140},{field:'启用状态',title:'启用状态',width:90}
      ];
      if(k==='scheme') return [
        {field:'检验方案编码',title:'检验方案编码',width:140},{field:'检验方案名称',title:'检验方案名称',width:180},
        {field:'适用采样点',title:'适用采样点',width:140},{field:'适用物料',title:'适用物料',width:140},{field:'启用状态',title:'启用状态',width:90}
      ];
      return [
        {field:'检验项编码',title:'检验项编码',width:130},{field:'检验项名称',title:'检验项名称',width:150},
        {field:'所属检验类',title:'所属检验类',width:120},{field:'启用状态',title:'启用状态',width:90}
      ];
    });
    const autoSampPickRows = computed(()=>{
      void autoSampPickTick.value;
      void storeTick.value;
      const k=autoSampPickKind.value;
      const q=autoSampPickQ;
      const mock=window.WMS_MOCK_ROWS||MOCK;
      let list=[];
      if(k==='mat'){
        list=((mock['mat-list']||{}).main||[]).slice();
        const c=String(q['物料编码']||'').trim(), n=String(q['物料名称']||'').trim();
        if(c) list=list.filter(r=> String(r['物料编码']||r['编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['物料名称']||r['名称']||'').includes(n));
        list=list.filter(r=> (r['启用状态']||'启用')==='启用');
      } else if(k==='line'){
        list=((mock['prod-line']||{}).main||[]).slice();
        const c=String(q['产线编码']||'').trim(), n=String(q['产线名称']||'').trim();
        if(c) list=list.filter(r=> String(r['产线编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['产线名称']||'').includes(n));
        list=list.filter(r=> (r['启用状态']||'启用')==='启用');
      } else if(k==='point'){
        list=((mock['samp-point']||{}).main||[]).slice();
        const c=String(q['采样点编码']||'').trim(), n=String(q['采样点名称']||'').trim();
        if(c) list=list.filter(r=> String(r['采样点编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['采样点名称']||'').includes(n));
        list=list.filter(r=> (r['启用状态']||'启用')==='启用');
        list=list.filter(r=> String(r['适用报检单']||'').includes('生产过程检') || !r['适用报检单']);
      } else if(k==='team'){
        list=((mock['insp-team']||{}).main||[]).slice();
        const c=String(q['班组编码']||'').trim(), n=String(q['班组名称']||'').trim();
        if(c) list=list.filter(r=> String(r['班组编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['班组名称']||'').includes(n));
        list=list.filter(r=> (r['启用状态']||'启用')==='启用');
      } else if(k==='scheme'){
        list=autoSampInspSchemeList().filter(r=> (r['启用状态']||'启用')==='启用');
        const c=String(q['检验方案编码']||'').trim(), n=String(q['检验方案名称']||'').trim();
        if(c) list=list.filter(r=> String(r['检验方案编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['检验方案名称']||'').includes(n));
      } else {
        list=autoSampInspItemList().filter(r=> (r['启用状态']||'启用')==='启用');
        // normalize field names
        list=list.map(r=>({
          ...r,
          检验项编码: r['检验项编码']||r['编码']||'',
          检验项名称: r['检验项名称']||r['名称']||'',
          所属检验类: r['所属检验类']||r['检验类']||''
        }));
        const c=String(q['检验项编码']||'').trim(), n=String(q['检验项名称']||'').trim();
        if(c) list=list.filter(r=> String(r['检验项编码']||'').includes(c));
        if(n) list=list.filter(r=> String(r['检验项名称']||'').includes(n));
        const row=autoSampPickRow.value;
        if(k==='temp-items' && row && row._schemeItemCodes){
          const taken=new Set(String(row._schemeItemCodes||'').split(',').filter(Boolean));
          list=list.filter(r=> !taken.has(r['检验项编码']));
        }
        if(k==='scheme-items' && row && row._tempItemCodes){
          const taken=new Set(String(row._tempItemCodes||'').split(',').filter(Boolean));
          list=list.filter(r=> !taken.has(r['检验项编码']));
        }
      }
      return list;
    });
    function confirmAutoSampPick(){
      const row = autoSampPickRow.value;
      if(!row){ autoSampPickVisible.value=false; return; }
      const k=autoSampPickKind.value;
      if(['scheme-items','temp-items'].includes(k)){
        const sel=autoSampPickSelected.value||[];
        if(!sel.length){ ElMessage.warning('请先勾选'); return; }
        const names=sel.map(r=> r['检验项名称']||'').filter(Boolean).join(',');
        const codes=sel.map(r=> r['检验项编码']||'').filter(Boolean).join(',');
        if(k==='scheme-items'){ row['方案项目']=names; row._schemeItemCodes=codes; }
        else { row['临时项目']=names; row._tempItemCodes=codes; }
        autoSampPickVisible.value=false;
        return;
      }
      const r=autoSampPickCurrent.value;
      if(!r){ ElMessage.warning('请先选择一行'); return; }
      if(k==='mat'){
        const code=r['物料编码']||r['编码']||'';
        const name=r['物料名称']||r['名称']||'';
        const spec=r['物料规格']||'';
        row['物料信息']=[code,name,spec].filter(Boolean).join('/');
        row._materialCode=code; row._materialName=name; row._materialSpec=spec;
      } else if(k==='line'){
        row['产线名称']=r['产线名称']||'';
        row['车间名称']=r['所属车间']||'';
        row._lineCode=r['产线编码']||'';
      } else if(k==='point'){
        row['采样点']=r['采样点名称']||'';
        row._pointCode=r['采样点编码']||'';
      } else if(k==='team'){
        row['检验班组']=r['班组名称']||'';
        row._teamCode=r['班组编码']||'';
      } else if(k==='scheme'){
        row['检验方案']=r['检验方案名称']||'';
        row._schemeCode=r['检验方案编码']||'';
        // 默认带入方案检验项摘要
        const info=String(r['检验项信息']||'');
        if(info && !row['方案项目']){
          row['方案项目']=info.split(/[;；,，]/).map(s=>s.trim()).filter(Boolean).join(',');
        }
      }
      autoSampPickVisible.value=false;
    }
    function addAutoSampDetail(){
      autoSampDetailRows.value.push({
        物料信息:'', 产线名称:'', 车间名称:'', 采样点:'', 报检批号:'', 应取样件数:1, 样品来源:'', 检验班组:'', 取样备注:'', 检验方案:'', 方案项目:'', 临时项目:''
      });
    }
    function copyAutoSampDetail(row){
      const copy={...row, 应取样件数:1};
      delete copy.id; delete copy.$id;
      autoSampDetailRows.value.push(copy);
    }
    function removeAutoSampDetails(){
      const set = new Set(autoSampDetailSelected.value||[]);
      if(!set.size){ ElMessage.warning('请先勾选要删除的行'); return; }
      autoSampDetailRows.value = autoSampDetailRows.value.filter(r=> !set.has(r));
      autoSampDetailSelected.value = [];
    }
    function validateAutoSampDetails(){
      const rows=autoSampDetailRows.value||[];
      for(let i=0;i<rows.length;i++){
        const r=rows[i];
        if(!String(r['物料信息']||'').trim()){ ElMessage.error('第'+(i+1)+'行：请选择物料信息'); return false; }
        if(!String(r['产线名称']||'').trim()){ ElMessage.error('第'+(i+1)+'行：请选择产线'); return false; }
        if(!String(r['车间名称']||'').trim()){ ElMessage.error('第'+(i+1)+'行：请选择车间'); return false; }
        if(!String(r['采样点']||'').trim()){ ElMessage.error('第'+(i+1)+'行：请选择采样点'); return false; }
        if(!String(r['样品来源']||'').trim()){ ElMessage.error('第'+(i+1)+'行：请输入样品来源'); return false; }
        r['应取样件数']=1;
      }
      return true;
    }
    function resetInspMethodParamLists(){
      inspMethodPublicParams.value = [];
      inspMethodSampleParams.value = [];
      inspMethodPublicSelected.value = [];
      inspMethodSampleSelected.value = [];
      inspMethodMatRows.value = [];
      inspMethodMatSelected.value = [];
      inspMethodMatCatRows.value = [];
      inspMethodMatCatSelected.value = [];
      inspMethodInnerTab.value = '项目';
    }
    function removeInspMethodMats(){
      const ids = new Set((inspMethodMatSelected.value||[]).map(r=> r['材料编码']));
      if(!ids.size){ ElMessage.warning('请先勾选要删除的材料'); return; }
      inspMethodMatRows.value = inspMethodMatRows.value.filter(r=> !ids.has(r['材料编码']));
      inspMethodMatSelected.value = [];
    }
    const methodVerVisible = ref(false);
    const methodVerTitle = ref('历史版本');
    const methodVerRows = ref([]);
