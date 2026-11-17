    const cmp = reactive({
      visible:false, more:false, page:1, pageSize:20, selected:[], rows:[], itemCols:[],
      fixed:['样品状态','检验结论','偏差结论','样品编号','样品来源','物料编码','物料名称','物料规格','物料种类','报检批号','检验方案','检验完成时间','检验人'],
      query:{ 样品状态:'', 检验结论:'', 样品编号:'', 报检批号:'' }
    });
    const cmpFiltered = computed(()=> cmp.rows.filter(r=>{
      const q = cmp.query;
      if(q.样品状态 && r['样品状态']!==q.样品状态) return false;
      if(q.检验结论 && r['检验结论']!==q.检验结论) return false;
      if(String(q.样品编号||'').trim() && !String(r['样品编号']||'').includes(String(q.样品编号).trim())) return false;
      if(String(q.报检批号||'').trim() && !String(r['报检批号']||'').includes(String(q.报检批号).trim())) return false;
      return true;
    }));
    const cmpPageRows = computed(()=>{
      const i = (cmp.page - 1) * cmp.pageSize;
      return cmpFiltered.value.slice(i, i + cmp.pageSize);
    });
    const cmpPageSelected = computed(()=>{
      const ids = new Set(cmpPageRows.value.map(r=> r.id));
      return cmp.selected.filter(r=> ids.has(r.id)).length;
    });
    function cmpIndex(i){ return (cmp.page - 1) * cmp.pageSize + i + 1; }
    function onCmpSelect(rows){ cmp.selected = rows || []; }
    function cmpReset(){
      Object.assign(cmp.query, { 样品状态:'', 检验结论:'', 样品编号:'', 报检批号:'' });
      cmp.page = 1;
    }
    function cmpItemText(row, it){
      if(!it || row['样品状态']!=='已完成') return '';
      const v = it['检验项类型']==='定性' ? it['检验结果'] : (it['检验报出值'] || it['检验结果值']);
      return v && v!=='—' ? v : '';
    }
    function openLedgerCompare(){
      const tab = activeTab.value || 'tab-pi';
      const src = ((MOCK.ledger||{})[tab]) || [];
      const names = [];
      cmp.rows = src.map(r=>{
        const demo = buildLedgerInspDemo(r);
        const items = (demo.qual||[]).concat(demo.quant||[]);
        const o = { id: r.id || r['样品编号'] };
        cmp.fixed.forEach(k=>{
          if(k==='偏差结论'){ o[k] = ledgerDevTag(r); return; }
          const v = r[k];
          o[k] = (v==null || v==='—') ? '' : v;
        });
        items.forEach(it=>{
          const n = String(it['检验项名称']||'').trim();
          if(!n || n==='—') return;
          if(!names.includes(n)) names.push(n);
          o[n] = cmpItemText(r, it);
          if(r['样品状态']==='已完成' && (it['偏差结论']==='OOS' || it['检验结论']==='不合格')) o['_bad_'+n] = true;
        });
        return o;
      });
      cmp.itemCols = names;
      cmp.selected = [];
      cmp.page = 1;
      cmp.more = false;
      cmpReset();
      cmp.visible = true;
    }
    function cmpExport(){
      const cols = cmp.fixed.concat(cmp.itemCols);
      const lines = [cols.join(',')].concat(cmpFiltered.value.map(r=> cols.map(c=> '"'+String(r[c]==null?'':r[c]).replace(/"/g,'""')+'"').join(',')));
      const blob = new Blob(['\ufeff'+lines.join('\n')], { type:'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '数据比对.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      ElMessage.success('已导出 ' + cmpFiltered.value.length + ' 条');
    }
    function qcCompare(){
      if(pageId.value==='ledger'){ openLedgerCompare(); return; }
      const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      const isRecheck = pageId.value==='recheck';
      if(!picked.length){ ElMessage.warning(isRecheck ? '请先勾选报检单' : '请先勾选样品'); return; }
      const nos = isRecheck ? picked.flatMap(r=> qcOrderSamples(r['报检单号'], qcCurTab()).map(x=> x['样品编号'])) : picked.map(r=> r['样品编号']);
      const list = [...new Set(nos.filter(Boolean))];
      if(list.length < 2){ ElMessage.warning(isRecheck ? '所选报检单不足 2 个样品，无法比对' : '请至少勾选 2 个样品进行比对'); return; }
      const res = Object.fromEntries(list.map(no=> [no, qcSampleResult(no)]));
      const items = [...new Set(list.flatMap(no=> res[no].map(x=> x['检验项'])))];
      const rows = items.map(n=>{
        const o = { 检验项: n };
        list.forEach(no=>{
          const x = res[no].find(y=> y['检验项']===n);
          o[no] = !x ? '—' : (x['检验结论']!=='—' && x['实测值']!=='—' ? x['实测值'] + '（' + x['检验结论'] + '）' : (x['实测值']!=='—' ? x['实测值'] : x['检验结论']));
        });
        return o;
      });
      qcShowView({ title:'数据比对', width: Math.min(1200, 360 + list.length * 160) + 'px', cols: ['检验项', ...list], rows });
    }
    function qcSpcSamples(){
      const tab = qcCurTab();
      let lg = (FLOW_TABS.some(t=> t.name===tab) ? flowBag(FLOW_LEDGER, tab) : []).slice();
      const mat = qcCodeOf(query['物料信息']), sup = qcCodeOf(query['供应商信息']), plan = qcCodeOf(query['检验方案']), item = qcCodeOf(query['检验项']);
      if(mat) lg = lg.filter(r=> r['物料编码']===mat || String(r['物料名称']||'').includes(mat));
      if(sup) lg = lg.filter(r=> r['供应商编码']===sup || String(r['供应商名称']||'').includes(sup));
      if(!qcEmpty(query['采样点'])) lg = lg.filter(r=> String(r['采样点']||'').includes(String(query['采样点'])));
      if(plan) lg = lg.filter(r=> String(r['检验方案']||'').includes(plan));
      const dr = query['日期范围'];
      if(Array.isArray(dr) && dr[0]) lg = lg.filter(r=>{ const d = String(r['取样时间']||'').slice(0, 10); return d >= qcYmd(dr[0]) && d <= qcYmd(dr[1]); });
      return lg.flatMap(r=> qcSampleResult(r['样品编号']).filter(x=> !item || x['检验项'].includes(item)).map(x=> ({
        样品编号: r['样品编号'], 报检批号: r['报检批号'] || '—', 物料编码: r['物料编码'] || '—', 物料名称: r['物料名称'] || '—',
        采样点: r['采样点'] || '—', 取样时间: r['取样时间'] || '—', 检验项: x['检验项'], 实测值: x['实测值'], 检验结论: x['检验结论']
      })));
    }
    function qcOpenSpcSamples(){
      const rows = qcSpcSamples();
      qcShowView({ title:'I图样本数据', width:'1100px', desc: qcQueryDesc(), rows,
        cols: ['样品编号','报检批号','物料编码','物料名称','采样点','取样时间','检验项','实测值','检验结论'] });
    }
    const clDevVisible = ref(false);
    const clDevRule = ref(null);
    const clDevForm = reactive({ UCL运算符:'≤', UCL偏差上限:'', LCL运算符:'≤', LCL偏差上限:'' });
    const clDevOpts = computed(()=> (window.WMS_DICT && window.WMS_DICT.enabledNames('CL_DEV_TH', MOCK.dict)) || []);
    function openClDev(){
      const r = clDevRule.value || {};
      Object.assign(clDevForm, {
        UCL运算符: r.uclOp || '≤',
        UCL偏差上限: r.ucl || '',
        LCL运算符: r.lclOp || '≤',
        LCL偏差上限: r.lcl || ''
      });
      clDevVisible.value = true;
    }
    function confirmClDev(){
      if(!clDevForm.UCL偏差上限 || !clDevForm.LCL偏差上限){ ElMessage.warning('请选择 UCL偏差上限和 LCL偏差上限'); return; }
      clDevRule.value = {
        uclOp: clDevForm.UCL运算符 || '≤',
        ucl: clDevForm.UCL偏差上限,
        lclOp: clDevForm.LCL运算符 || '≤',
        lcl: clDevForm.LCL偏差上限
      };
      clDevVisible.value = false;
      ElMessage.success('已设置偏差阈值');
    }
    const CL_FLOW_KEYS = ['样本总数','D.L','MAX','MIN','Average','σ','UCL相对偏差','LCL相对偏差','UCL(计算)','LCL(计算)','MR-UCL(计算)','MR-LCL(计算)','Xbar(R)-UCL(计算)','Xbar(R)-LCL(计算)','Xbar(S)-UCL(计算)','Xbar(S)-LCL(计算)','R-UCL(计算)','R-LCL(计算)','S-UCL(计算)','S-LCL(计算)','UCL(固定)','LCL(固定)','MR-UCL(固定)','MR-LCL(固定)','Xbar(R)-UCL(固定)','Xbar(R)-LCL(固定)','Xbar(S)-UCL(固定)','Xbar(S)-LCL(固定)','R-UCL(固定)','R-LCL(固定)','S-UCL(固定)','S-LCL(固定)'];
    function clRecordBag(){
      const bag = MOCK['cl-record'] = MOCK['cl-record'] || {};
      if(!Array.isArray(bag['tab-rec'])) bag['tab-rec'] = [];
      if(!Array.isArray(bag['tab-flow'])) bag['tab-flow'] = [];
      return bag;
    }
    function clNextRecordNo(){
      const nums = clRecordBag()['tab-rec'].map(r=> parseInt(String(r['记录编号']||'').replace(/\D/g,''), 10)).filter(n=> !isNaN(n));
      return String((nums.length ? Math.max.apply(null, nums) : 0) + 1).padStart(6, '0');
    }
    function saveClCalcRecord(){
      const rows = tableData.value || [];
      if(!rows.length){ ElMessage.warning('暂无计算结果'); return; }
      const tab = activeTab.value || 'tab-pi';
      const label = ((page.value?.tabs||[]).find(t=> t.name===tab)||{}).label || '采购来料';
      const bag = clRecordBag();
      const no = clNextRecordNo();
      const uniq = (k)=> [...new Set(rows.map(r=> r[k]).filter(v=> v && v!=='—'))];
      const metrics = Array.isArray(query['计算指标']) && query['计算指标'].length ? query['计算指标'].join('、') : 'UCL、LCL';
      const dr = query['日期范围'];
      const range = Array.isArray(dr) && dr[0] ? (qcYmd(dr[0])+'~'+qcYmd(dr[1]||dr[0])) : '—';
      const show = v=> (v==null || v==='') ? '' : String(v);
      bag['tab-rec'].unshift({
        id: 'clr-'+Date.now(),
        记录编号: no,
        业务类型: label,
        日期范围: range,
        物料信息: show(query['物料信息']),
        采样点: show(query['采样点']),
        供应商信息: label==='采购来料' ? show(query['供应商信息']) : '',
        客户信息: label==='生产物料' ? show(query['客户信息']) : '',
        最少样本数: show(query['最少样本数']) || '25',
        检验方案: uniq('检验方案').join('、'),
        检验项: uniq('检验项').join('、'),
        计算指标: metrics,
        来源: '手动',
        方案编码: '',
        创建时间: nowStamp(),
        创建人: '管理员'
      });
      rows.forEach((r, i)=>{
        const line = {
          id: 'clf-'+Date.now()+'-'+i,
          检验方案: r['检验方案'] || '',
          检验项: r['检验项'] || '',
          单位: r['单位'] || '',
          记录编号: no
        };
        CL_FLOW_KEYS.forEach(k=>{ line[k] = r[k]==null || r[k]==='' ? '' : String(r[k]); });
        bag['tab-flow'].unshift(line);
      });
      bumpStore();
      ElMessage.success('已保存，已在控限计算记录生成一条记录');
    }
    function clRecordLink(){
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r['记录编号']).filter(Boolean))];
      const to = activeTab.value==='tab-flow' ? 'tab-rec' : 'tab-flow';
      const name = to==='tab-flow' ? '检验项明细' : '检验项计算流水';
      activeTab.value = to;
      selectedIds.value = [];
      pageNum.value = 1;
      nextTick(()=>{
        resetQueryModel();
        query['记录编号'] = nos.join('、');
        ElMessage.success('已跳转'+name+'，按 '+nos.length+' 个记录编号过滤');
      });
    }
    function clRecordBatchDelete(){
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选 '+rows.length+' 条计算记录？对应检验项明细将一并删除。','批量删除',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        const nos = new Set(rows.map(r=> r['记录编号']));
        const bag = clRecordBag();
        bag['tab-rec'] = bag['tab-rec'].filter(r=> !ids.has(r.id));
        bag['tab-flow'] = bag['tab-flow'].filter(r=> !nos.has(r['记录编号']));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除，对应流水已同步删除');
      }).catch(()=>{});
    }
    const clSampleVisible = ref(false);
    const clSampleExpanded = ref(false);
    const clSampleCols = ref([]);
    const clSampleQuery = reactive({ 样品编号:'', 报检单号:'', 检验结论:'', 采样点信息:'' });
    const clSampleAll = ref([]);
    const clSampleRows = computed(()=> clSampleAll.value.filter(r=>{
      const a = clSampleQuery.样品编号, b = clSampleQuery.报检单号, c = clSampleQuery.检验结论, d = clSampleQuery.采样点信息;
      if(a && !String(r['样品编号']||'').includes(a)) return false;
      if(b && !String(r['报检单号']||'').includes(b)) return false;
      if(c && !String(r['检验结论']||'').includes(c)) return false;
      if(d && !String(r['采样点信息']||'').includes(d)) return false;
      return true;
    }));
    function clSampleDynCols(row){
      const items = String(row['检验项']||'').split(/[、,，]/).map(s=> s.trim()).filter(Boolean);
      const flows = ((MOCK['cl-record']||{})['tab-flow']||[]).filter(r=> r['记录编号'] && r['记录编号']===row['记录编号']);
      const unitOf = (name)=>{
        const hit = flows.find(r=> r['检验项']===name);
        if(hit && hit['单位']) return hit['单位'];
        if(row['单位']) return row['单位'];
        return /^(Fe|Na|Mg)$/.test(name) ? 'ppm' : '';
      };
      let cols = items.map(n=> unitOf(n) ? (n+'/'+unitOf(n)) : n);
      const set = new Set(cols);
      if(set.has('Fe/ppm') && set.has('Mg/ppm') && set.has('Na/ppm')) cols = ['Fe/ppm','Mg/ppm','Na/ppm'];
      return cols.length ? cols : ['Fe/ppm','Mg/ppm','Na/ppm'];
    }
    function openClSample(row){
      const cols = clSampleDynCols(row);
      clSampleCols.value = cols;
      const base = {
        供应商信息: '001/万物智汇',
        客户信息: '001/万物智汇',
        采样点信息: '001/原料桶',
        报检批号: '001',
        检验完成时间: '2026-04-17 16:12:27',
        报检单号: '000001',
        报检时间: '2026-04-28 09:28:01',
        样品编号: '000001'
      };
      const fill = (bad)=>{
        const line = Object.assign({}, base, { 检验结论: bad ? '不合格' : '合格' });
        cols.forEach(c=> line[c] = '0.001');
        if(bad) line._bad = bad;
        return line;
      };
      const mg = cols.find(c=> c.indexOf('Mg')===0) || cols[1] || cols[0];
      const na = cols.find(c=> c.indexOf('Na')===0) || cols[cols.length-1];
      clSampleAll.value = [fill(mg), fill(na)];
      clSampleQuery.样品编号 = '';
      clSampleQuery.报检单号 = '';
      clSampleQuery.检验结论 = '';
      clSampleQuery.采样点信息 = '';
      clSampleExpanded.value = false;
      clSampleVisible.value = true;
    }
    const QC_SPC_COLS = ['物料信息','检验项','样本总数','图类型','USL','LSL','UCL','LCL','CL','Average','σ','Cp','CPK','CPK等级','OOC','OOS'];
    const QC_SPC_TAB = { 采购来料:'tab-pi', 生产过程:'tab-pp', 生产物料:'tab-pm' };
    function qcSpcAnalysis(tab, item){
      const all = ((MOCK['spc-report-issue']||{})[tab]) || [];
      const hit = item ? all.filter(r=> String(r['检验项']||'').includes(item)) : [];
      return hit.length ? hit : all;
    }
    function qcOpenSpcPreview(){
      const tab = qcCurTab();
      const label = ((page.value?.tabs||[]).find(t=> t.name===tab)||{}).label || '';
      const rows = (tableData.value||[]).length ? tableData.value : qcSpcAnalysis(tab, qcCodeOf(query['检验项']));
      qcShowView({ title:'SPC报告预览', width:'1100px', desc: [{ k:'来源类型', v: label }, ...qcQueryDesc()], cols: QC_SPC_COLS, rows,
        btns: [{ name:'保存SPC报告', type:'primary', fn: ()=>{ qcView.visible = false; openForm('保存SPC报告'); } }] });
    }
    function qcOpenSpcRules(){
      qcShowView({ title:'判异/过滤规则', width:'900px', cols: ['规则名称','规则依据','现行名称','现行规则'], rows: ((MOCK['spc-rule']||{}).main) || [] });
    }
    function qcHtmlDoc(title, parts){
      const body = parts.map(p=>{
        const desc = (p.desc||[]).length ? '<table class="d">' + p.desc.map(d=> '<tr><th>' + qcEsc(d.k) + '</th><td>' + qcEsc(d.v) + '</td></tr>').join('') + '</table>' : '';
        const tbl = (p.cols||[]).length ? '<table class="g"><tr>' + p.cols.map(c=> '<th>' + qcEsc(c) + '</th>').join('') + '</tr>'
          + (p.rows||[]).map(r=> '<tr>' + p.cols.map(c=> '<td>' + qcEsc(r[c]) + '</td>').join('') + '</tr>').join('') + '</table>' : '';
        return '<section><h2>' + qcEsc(p.title||'') + '</h2>' + desc + tbl + '</section>';
      }).join('');
      return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + qcEsc(title) + '</title><style>'
        + 'body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;font-size:12px;color:#1f2937;padding:16px}h2{font-size:15px;margin:16px 0 8px}'
        + 'section{page-break-after:always}section:last-child{page-break-after:auto}table{border-collapse:collapse;width:100%;margin-bottom:10px}'
        + 'th,td{border:1px solid #cbd5e1;padding:4px 8px;text-align:left}table.d th{width:140px;background:#f1f5f9}table.g th{background:#f1f5f9}'
        + '</style></head><body>' + body + '</body></html>';
    }
    function qcDownload(name, html){
      const blob = new Blob(['\ufeff' + html], { type: /\.doc$/.test(name) ? 'application/msword' : 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
    function qcPrintPdf(html){
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      document.body.appendChild(f);
      const d = f.contentWindow.document;
      d.open(); d.write(html); d.close();
      setTimeout(()=>{ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){} setTimeout(()=> f.remove(), 2000); }, 300);
    }
    function qcQrPart(row){
      return { title: (row['报告模板名称'] || '质量报告') + ' · ' + (row['文件流水'] || row['开具单号'] || ''), desc: qcRowDesc(row),
        cols: ['检验项','实测值','检验结论'], rows: qcSampleResult(row['样品编号']) };
    }
    function qcQrPreview(row){
      const p = qcQrPart(row);
      qcShowView({ title:'报告预览 · ' + (row['文件流水'] || row['开具单号'] || ''), width:'960px', desc: p.desc, cols: p.cols, rows: p.rows,
        btns: [
          { name:'下载源文件', fn: ()=> qcQrDownload([row], '下载源文件') },
          { name:'下载PDF', type:'primary', fn: ()=> qcQrDownload([row], '下载PDF') }
        ] });
    }
    function qcQrDownload(rows, kind){
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const name = rows.length===1 ? (rows[0]['文件流水'] || rows[0]['开具单号'] || '质量报告') : ('质量报告-' + nowStamp().slice(0, 10).replace(/-/g, '') + '-' + rows.length + '份');
      const html = qcHtmlDoc(name, rows.map(qcQrPart));
      if(kind==='下载PDF'){ qcPrintPdf(html); ElMessage.success('已生成 ' + rows.length + ' 份报告，请在打印窗口选择「另存为 PDF」'); return; }
      qcDownload(name + '.doc', html);
      ElMessage.success('已下载 ' + rows.length + ' 份报告源文件');
    }
    function qcSpcLedgerPart(row){
      return { title: row['报告名称'] || 'SPC报告', desc: qcRowDesc(row), cols: QC_SPC_COLS,
        rows: qcSpcAnalysis(QC_SPC_TAB[row['来源类型']] || 'tab-pi', qcCodeOf(row['检验项'])) };
    }
    function qcSpcLedgerPreview(row){
      const p = qcSpcLedgerPart(row);
      qcShowView({ title:'预览 · ' + p.title, width:'1100px', desc: p.desc, cols: p.cols, rows: p.rows,
        btns: [{ name:'下载', type:'primary', fn: ()=> qcSpcLedgerDownload([row]) }] });
    }
    function qcSpcLedgerDownload(rows){
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const name = rows.length===1 ? rows[0]['报告名称'] : ('SPC报告-' + nowStamp().slice(0, 10).replace(/-/g, '') + '-' + rows.length + '份');
      qcDownload(name + '.html', qcHtmlDoc(name, rows.map(qcSpcLedgerPart)));
      ElMessage.success('已下载 ' + rows.length + ' 份 SPC 报告');
    }
    function qcOpenSpcFromOverview(row, page){
      const target = page==='spc-single' ? 'spc-single' : 'spc-multi';
      const label = target==='spc-single' ? '计量SPC(单图)' : '计量SPC(多图)';
      loadPage(target);
      nextTick(()=>{
        activeTab.value = 'tab-pp';
        nextTick(()=>{
          query['采样点'] = row['采样点'] || '';
          query['检验项'] = row['检验项'] || '';
          ElMessage.success('已打开'+label+'：' + [row['采样点'], row['检验项']].filter(Boolean).join(' / '));
        });
      });
    }
    function qcSaveQrIssue(){
      if(!qcCheckRequired(activeFormFields.value || [])) return;
      const lines = formLineRows.value || [];
      if(lines.length){
        formModel['物料批号'] = lines.map(r=> r['物料批号']).filter(Boolean).join('、') || '—';
        formModel['样品编号'] = lines.map(r=> r['样品编号']).filter(Boolean).join('、') || '—';
        formModel['样品来源'] = lines.map(r=> r['样品来源']).filter(Boolean).join('、') || '—';
        formModel._samples = lines.map(r=>({...r}));
      }
      const list = (MOCK['qr-issue'] = MOCK['qr-issue'] || {})['tab-issue'] || [];
      const before = list[0];
      genericSaveForm(true);
      const row = ((MOCK['qr-issue']||{})['tab-issue']||[])[0];
      if(formVisible.value || !row || row===before) return;
      const rec = (MOCK['qr-issue']['tab-record'] = MOCK['qr-issue']['tab-record'] || []);
      const cols = flowCols('qr-issue', 'tab-record');
      const nos = splitDun(row['样品编号']).filter(flowHas);
      const per = /样/.test(String(row['开具方式']||'')) && nos.length > 1 ? nos : [nos.join('、') || '—'];
      const made = per.map(no=>{
        const r = { id: 'qrr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) };
        cols.forEach(k=>{ r[k] = flowHas(row[k]) ? row[k] : '—'; });
        r['样品编号'] = no;
        r['文件流水'] = qcNextNo(rec, '文件流水', 'FL-');
        r['创建人'] = '管理员';
        r['创建时间'] = nowStamp();
        rec.unshift(r);
        return r['文件流水'];
      });
      bumpStore();
      ElMessage.success('开具成功，已生成报告流水 ' + made.join('、'));
    }
    function onFormDraft(){
      if(formMode.value==='samp' && pageId.value===FLOW_WAIT){
        const row = flowBag(FLOW_WAIT, activeTab.value).find(r=> r.id===formModel._editId);
        if(row){
          row._sampDraft = JSON.parse(JSON.stringify({ form: { ...formModel }, samples: waitSampSampleRows.value || [], items: waitSampItemRows.value || [] }));
          bumpStore();
        }
        formVisible.value = false;
        ElMessage.success('已暂存取样信息，再次点击「取样」时自动带出');
        return;
      }
      if(['entry','quick-entry'].includes(formMode.value) && (pageId.value===FLOW_ENTRY || isEntryByCat(pageId.value) || (pageId.value==='ledger' && formModel._fromLedgerModify)) && (flowSplitRow(formModel['样品编号']) || (pageId.value==='ledger' && flowLedgerRow(formModel['样品编号'])))){
        flowSaveEntry(true);
        return;
      }
      onFormOk();
    }
    function qcFormOk(){
      const pid = pageId.value, m = formMode.value;
      if(pid==='qr-issue' && ['add','copy'].includes(m) && qcCurTab()==='tab-issue'){ qcSaveQrIssue(); return true; }
      if(/^(新建|新增|编辑)(数据源|标签类型|表单类型|类型)$/.test(m) && page.value?.layout==='tree-list'){ qcSaveTreeNode(); return true; }
      if(m==='数据源设置'){ qcSaveDsSetting(); return true; }
      if(pid==='recheck' && m==='recheck'){ qcSaveRecheck(); return true; }
      if(QC_SRC_TYPE[pid] && m==='dispose'){ qcSaveDispose(); return true; }
      if(QC_SRC_TYPE[pid] && m==='mrb-audit'){ qcSaveMrbAudit(); return true; }
      if(pid==='mrb-review' && m==='mrb-review-rec'){ qcSaveMrbRec(); return true; }
      if(pid==='mrb-review' && ['add','copy'].includes(m)){ qcSaveMrbAdd(); return true; }
      if(pid==='capa-internal' && ['add','copy','edit'].includes(m)){ qcSaveCapa(); return true; }
      if(pid==='capa-handle' && m==='capa-process'){ qcSaveCapaProcess(); return true; }
          if(pid==='add-sample' && ['add','copy'].includes(m)){ qcSaveAddSample(); return true; }
      if(pid==='spc-report-issue' && m==='保存SPC报告'){ qcSaveSpcReport(); return true; }
      if(m==='文件详情' || m==='detail'){ formVisible.value = false; return true; }
      return false;
    }
    function onFormOk(){
      if(qcFormOk()) return;
      if(pageId.value===BIAS_PAGE && ['add','edit','copy'].includes(formMode.value)){
        if(!formModel['仪器名称']){ ElMessage.warning('请选择仪器名称'); return; }
        if(!formModel['基准件名称']){ ElMessage.warning('请填写基准件名称'); return; }
        if(!formModel['基准值'] || isNaN(Number(formModel['基准值']))){ ElMessage.warning('请填写正确的基准值'); return; }
        if(!formModel['测量人']){ ElMessage.warning('请选择测量人'); return; }
        if(!formModel['测试日期']){ ElMessage.warning('请选择测试日期'); return; }
        const bag = MOCK[BIAS_PAGE] = MOCK[BIAS_PAGE] || {};
        const list = bag.main = bag.main || [];
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        const led = ((MOCK['instrument-ledger']||{}).main||[]).find(r=> r['仪器名称']===formModel['仪器名称']) || {};
        if(isAdd){
          const maxNo = list.reduce((m, r)=> Math.max(m, parseInt(String(r['计划编号']||'').replace(/\D/g,'').slice(-3), 10)||0), 0);
          const d = new Date();
          const payload = {
            id: 'bias-' + Date.now(),
            '状态': '待执行',
            '计划编号': 'BIAS-' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '-' + String(maxNo+1).padStart(3,'0'),
            '仪器名称': formModel['仪器名称'],
            '仪器编号': led['仪器编号'] || '—',
            '规格型号': led['规格型号'] || formModel['参数规格'] || '—',
            '基准件名称': formModel['基准件名称'],
            '测量参数': formModel['测量参数'] || '—',
            '参数规格': formModel['参数规格'] || '—',
            '测量人': formModel['测量人'],
            '测量次数': BIAS_OLED_N,
            '测试日期': formModel['测试日期'],
            '判定': '—',
            '基准值': String(formModel['基准值']),
            'values': Array.from({ length: BIAS_OLED_N }, ()=> null)
          };
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑计划'); return; }
          cur['仪器名称'] = formModel['仪器名称'];
          cur['仪器编号'] = led['仪器编号'] || cur['仪器编号'];
          cur['规格型号'] = led['规格型号'] || cur['规格型号'];
          cur['基准件名称'] = formModel['基准件名称'];
          cur['测量参数'] = formModel['测量参数'] || '—';
          cur['参数规格'] = formModel['参数规格'] || '—';
          cur['测量人'] = formModel['测量人'];
          cur['测试日期'] = formModel['测试日期'];
          cur['基准值'] = String(formModel['基准值']);
        }
        formVisible.value = false;
        bumpStore();
        ElMessage.success(isAdd ? '偏倚计划已新增' : '偏倚计划已保存');
        return;
      }

      if(pageId.value===SPLIT_PAGE && formMode.value==='add'){ confirmSampleSplit(); return; }
      if(pageId.value===OQC_PAGE && ['add','edit'].includes(formMode.value)){ saveOqcForm(); return; }
      if(pageId.value===CASS_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveCassForm(); return; }
      if(formMode.value==='samp' && pageId.value===FLOW_WAIT){
        const rid = formModel._editId;
        flowTakeSample();
        const r = !formVisible.value && flowBag(FLOW_WAIT, activeTab.value).find(x=> x.id===rid);
        if(r && r._sampDraft){ delete r._sampDraft; bumpStore(); }
        return;
      }
      if(['entry','quick-entry'].includes(formMode.value) && (pageId.value===FLOW_ENTRY || isEntryByCat(pageId.value) || (pageId.value==='ledger' && formModel._fromLedgerModify)) && (flowSplitRow(formModel['样品编号']) || (pageId.value==='ledger' && flowLedgerRow(formModel['样品编号'])))){ flowSaveEntry(); return; }
      if((formMode.value==='add' || formMode.value==='edit') && (isLabListPage() || isLabArchPage())){ labSaveForm(); return; }
      if(pageId.value===SLPOS_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveSlposForm(); return; }
      if(pageId.value===DISPATCH_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveDispatchForm(); return; }
      if(pageId.value===COST_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveCostForm(); return; }
      if(pageId.value==='insp-team' && ['add','edit','copy'].includes(formMode.value)){ saveInspTeamForm(); return; }
      if(pageId.value===MAINT_TEAM_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveMaintTeamForm(); return; }
      if(pageId.value===MAINT_PERSON_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveMaintPersonForm(); return; }
      if(pageId.value===FAULT_TYPE_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveFaultTypeForm(); return; }
      if(pageId.value===BX_EXP_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveExpForm(); return; }
      if(pageId.value===WX_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveWxForm(); return; }
      if(TPL_PAGES[pageId.value] && formMode.value==='detail'){ formVisible.value = false; return; }
      if(TPL_PAGES[pageId.value] && ['add','edit','copy'].includes(formMode.value)){ saveTplForm(); return; }
      if(pageId.value===ABILITY_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveAbilityForm(); return; }
      if(pageId.value===PERSON_PAGE && ['add','edit','copy'].includes(formMode.value)){ savePersonForm(); return; }
      if(pageId.value===TRAIN_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveTrainForm(); return; }
      if(pageId.value===COL_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveColForm(); return; }
      if(pageId.value===DRIFT_PAGE && ['add','edit','copy'].includes(formMode.value)){ saveDriftForm(); return; }
      if(pageId.value===SPI_PAGE && ['add','edit'].includes(formMode.value)){ saveSpiForm(); return; }
      if(pageId.value==='spectrum-file' && formMode.value==='add'){ saveSpectrumFileForm(); return; }
      if(pageId.value===CI_PAGE && ['add','edit'].includes(formMode.value)){ saveCiForm(); return; }
      if(isAuditPage() && ['add','edit'].includes(formMode.value)){ saveEaForm(); return; }
      if(pageId.value===IA_RECT && ['add','edit'].includes(formMode.value)){ saveIarForm(); return; }
      if(pageId.value===CHG_PAGE && ['add','edit'].includes(formMode.value)){ saveChgForm(); return; }
      if(csPage() && ['add','edit'].includes(formMode.value)){ csPage().save(); return; }
      if(formMode.value==='capa-close' && pageId.value==='capa-internal'){
        const note = String(formModel['关闭说明']||'').trim();
        if(!note){ ElMessage.warning('请填写关闭说明'); return; }
        ElementPlus.ElMessageBox.confirm('请再次确认该单据是否执行关闭，关闭后将不可再继续执行','关闭确认',{
          confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const set = new Set(selectedIds.value);
          const list = ((MOCK['capa-internal']||{}).main)||[];
          const now = new Date();
          const stamp = now.toISOString().slice(0,19).replace('T',' ');
          list.forEach(r=>{
            if(!set.has(r.id)) return;
            r['整改状态']='已关闭';
            r['关闭说明']=note;
            r['关闭时间']=stamp;
            r['关闭人']='管理员';
          });
          const closed = new Set(list.filter(r=> set.has(r.id)).map(r=> r['整改单号']));
          const wait = flowBag('capa-handle', 'tab-wait');
          for(let i = wait.length - 1; i >= 0; i--){ if(closed.has(wait[i]['整改单号'])) wait.splice(i, 1); }
          selectedIds.value=[];
          bumpStore();
          formVisible.value=false;
          ElMessage.success('已关闭整改单，对应整改处理待办已撤销');
        }).catch(()=>{});
        return;
      }
      if(pageId.value==='insp-project' && (activeTab.value==='tab-category' || (tabView.value||{}).name==='tab-category')){
        const code = String(formModel['检验类编码']||'').trim();
        const name = String(formModel['检验类名称']||'').trim();
        if(!code){ ElMessage.warning('请输入检验类编码'); return; }
        if(!name){ ElMessage.warning('请输入检验类名称'); return; }
        if(!formModel['检验类属性']){ ElMessage.warning('请选择检验类属性'); return; }
        const bag = (MOCK['insp-project'] = MOCK['insp-project'] || {});
        const list = (bag['tab-category'] = bag['tab-category'] || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['检验类编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('检验类编码已存在，请重新输入'); return;
        }
        if(list.some(r=> r['检验类名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('检验类名称已存在，请重新输入'); return;
        }
        const payload = {
          检验类编码: code,
          检验类名称: name,
          检验类属性: formModel['检验类属性'],
          适用仪器类型: joinDun(formModel['适用仪器类型']) || '',
          备注: formModel['备注']||'',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'ic-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'检验类复制新增成功':'检验类已新增') : '检验类已保存');
        return;
      }
      if(pageId.value==='insp-method' && (activeTab.value==='tab-method' || (tabView.value||{}).name==='tab-method')){
        const code = String(formModel['检验方法编码']||'').trim();
        const name = String(formModel['检验方法名称']||'').trim();
        if(!code){ ElMessage.warning('请输入检验方法编码'); return; }
        if(!name){ ElMessage.warning('请输入检验方法名称'); return; }
        if(!formModel['是否使用公用参数']){ ElMessage.warning('请选择是否使用公用参数'); return; }
        if(formModel['是否使用公用参数']==='是' && !formModel['公用测试次数']){ ElMessage.warning('请选择公用参数测试次数'); return; }
        if(formModel['公用测试次数']==='同样本次数' && formModel['是否使用样本参数']!=='是'){
          ElMessage.error('当公用参数的测试次数选择为「同样本次数」时，是否使用样本参数只能为「是」'); return;
        }
        if(!formModel['是否使用样本参数']){ ElMessage.warning('请选择是否使用样本参数'); return; }
        if(formModel['是否使用样本参数']==='是'){
          const t = formModel['样本测试次数'];
          if(t===undefined || t===null || t==='' || !(Number(t)>0)){ ElMessage.warning('请输入样本参数测试次数'); return; }
        }
        const bag = (MOCK['insp-method'] = MOCK['insp-method'] || {});
        const list = (bag['tab-method'] = bag['tab-method'] || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['检验方法编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('检验方法编码已存在，请重新输入'); return;
        }
        if(list.some(r=> r['检验方法名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('检验方法名称已存在，请重新输入'); return;
        }
        const pubRows = formModel['是否使用公用参数']==='是' ? (inspMethodPublicParams.value||[]).map(cloneInspMethodParamRow) : [];
        const sampRows = formModel['是否使用样本参数']==='是' ? (inspMethodSampleParams.value||[]).map(cloneInspMethodParamRow) : [];
        const matRows = (inspMethodMatRows.value||[]).map(r=> normalizeInspMethodMat(r));
        const matCatRows = (inspMethodMatCatRows.value||[]).map(r=>{
          const n = normalizeInspMethodMatCat(r);
          const { _id, ...rest } = n;
          return rest;
        }).filter(r=> r['物料编码'] || r['检验类编码']);
        const payload = {
          检验方法编码: code,
          检验方法名称: name,
          版本号: String(formModel['版本号']||'').trim(),
          方法阶段: formModel['方法阶段']||'',
          作业说明: formModel['作业说明']||'',
          作业附件: formModel['作业附件']||'',
          是否使用公用参数: formModel['是否使用公用参数'],
          公用测试次数: formModel['是否使用公用参数']==='是' ? (formModel['公用测试次数']||'') : '',
          是否使用样本参数: formModel['是否使用样本参数'],
          样本测试次数: formModel['是否使用样本参数']==='是' ? formModel['样本测试次数'] : '',
          公用参数: pubRows.map(r=> r.参数名称).filter(Boolean).join('、') || '',
          样本参数: sampRows.map(r=> r.参数名称).filter(Boolean).join('、') || '',
          材料: matRows.map(r=> r['材料名称']||r['材料编码']).filter(Boolean).join('、'),
          备注: formModel['备注']||'',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          _publicParams: pubRows,
          _sampleParams: sampRows,
          _mats: matRows,
          _matCats: matCatRows
        };
        if(isAdd){
          payload.id = 'im-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          payload.保存时间 = payload.创建时间;
          payload._versions = [];
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          const versions = Array.isArray(cur._versions) ? cur._versions.map(v=>({...v})) : [];
          if(inspMethodVerKey(cur)!==inspMethodVerKey(payload)){
            const prev = JSON.parse(JSON.stringify(cur));
            delete prev._versions;
            prev.保存时间 = prev.保存时间 || prev.创建时间 || nowStamp();
            versions.unshift(prev);
          }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'], 保存时间: nowStamp(), _versions: versions });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'检验方法复制新增成功':'检验方法已新增') : '检验方法已保存');
        return;
      }
      if(pageId.value==='qr-config'){
        const type = String(formModel['报告类型']||'').trim();
        const name = String(formModel['报告模板名称']||'').trim();
        const file = String(formModel['模板文件名称']||'').trim();
        const issue = String(formModel['开具方式']||'').trim();
        const valMode = String(formModel['取值方式']||'').trim();
        if(!type){ ElMessage.warning('请选择报告类型'); return; }
        if(!name){ ElMessage.warning('请输入报告模板名称'); return; }
        if(!file){ ElMessage.warning('请选择模板文件名称'); return; }
        if(!issue){ ElMessage.warning('请选择开具方式'); return; }
        if(!valMode){ ElMessage.warning('请选择取值方式'); return; }
        const bag = (MOCK['qr-config'] = MOCK['qr-config'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['报告模板名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('报告模板名称已存在，请重新输入'); return;
        }
        const payload = {
          报告类型: type,
          报告模板名称: name,
          模板文件名称: file,
          开具方式: issue,
          取值方式: valMode,
          批次取值逻辑: valMode,
          适用物料: (schemeMatRows.value||[]).map(r=>r.物料编码||r.物料名称).filter(Boolean).join(',') || '—',
          适用客户: (schemeCustRows.value||[]).map(r=>r.客户名称||r.客户编码).filter(Boolean).join(',') || '—',
          备注: formModel['备注']||'',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          _mats: (schemeMatRows.value||[]).map(r=>({...r})),
          _custs: (schemeCustRows.value||[]).map(r=>({...r})),
          _fields: (qrFieldRows.value||[]).map(r=>({...r}))
        };
        if(isAdd){
          payload.id = 'qrc-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'报告配置复制新增成功':'报告配置已新增') : '报告配置已保存');
        return;
      }
      if(pageId.value==='insp-scheme'){
        if(formMode.value==='detail'){ formVisible.value = false; return; }
        const code = String(formModel['检验方案编码']||'').trim();
        const name = String(formModel['检验方案名称']||'').trim();
        if(!code){ ElMessage.warning('请输入检验方案编码'); return; }
        if(!name){ ElMessage.warning('请输入检验方案名称'); return; }
        const bag = (MOCK['insp-scheme'] = MOCK['insp-scheme'] || {});
        const tab = activeTab.value || (tabView.value||{}).name || 'tab-std';
        const list = (bag[tab] = bag[tab] || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['检验方案编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('检验方案编码已存在，请重新输入'); return;
        }
        if(list.some(r=> r['检验方案名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('检验方案名称已存在，请重新输入'); return;
        }
        const qual = (schemeQualRows.value||[]).map(r=>({...r}));
        const quant = (schemeQuantRows.value||[]).map(r=>({...r}));
        const itemNames = qual.concat(quant).map(r=>r.检验项名称).filter(Boolean);
        const payload = {
          检验方案编码: code,
          检验方案名称: name,
          备注: formModel['备注']||'',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          检验项信息: itemNames.join('、') || '—',
          适用采样点: (schemePointRows.value||[]).map(r=>r.采样点名称||r.采样点编码).filter(Boolean).join('、') || '—',
          适用物料: (schemeMatRows.value||[]).map(r=>r.物料名称||r.物料编码).filter(Boolean).join('、') || '—',
          适用客户: (schemeCustRows.value||[]).map(r=>r.客户名称||r.客户编码).filter(Boolean).join('、') || '—',
          适用供应商: (schemeSuppRows.value||[]).map(r=>r.供应商名称||r.供应商编码).filter(Boolean).join('、') || '—',
          适用介质: (schemeMediaRows.value||[]).map(r=>r.充装介质).filter(Boolean).join('、') || '—',
          _qualItems: qual,
          _quantItems: quant,
          _points: (schemePointRows.value||[]).map(r=>({...r})),
          _mats: (schemeMatRows.value||[]).map(r=>({...r})),
          _custs: (schemeCustRows.value||[]).map(r=>({...r})),
          _supps: (schemeSuppRows.value||[]).map(r=>({...r})),
          _media: (schemeMediaRows.value||[]).map(r=>({...r}))
        };
        if(isAdd){
          payload.id = 'is-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'检验方案复制新增成功':'检验方案已新增') : '检验方案已保存');
        return;
      }
      if(pageId.value==='samp-scheme'){
        const code = String(formModel['抽样方案编码']||'').trim();
        const name = String(formModel['抽样方案名称']||'').trim();
        if(!code){ ElMessage.warning('请输入抽样方案编码'); return; }
        if(!name){ ElMessage.warning('请输入抽样方案名称'); return; }
        if(!formModel['抽样类型']){ ElMessage.warning('请选择抽样类型'); return; }
        if(!(sampInspectTypes.value||[]).length){ ElMessage.warning('请选择适用报检单'); return; }
        if(!validateSampRules()) return;
        const bag = (MOCK['samp-scheme'] = MOCK['samp-scheme'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['抽样方案编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('抽样方案编码已存在，请重新输入'); return;
        }
        if(list.some(r=> r['抽样方案名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('抽样方案名称已存在，请重新输入'); return;
        }
        const payload = {
          抽样方案编码: code,
          抽样方案名称: name,
          抽样类型: formModel['抽样类型']||'',
          适用报检单: (sampInspectTypes.value||[]).join('、'),
          取样方法: formModel['取样方法'] || '按批次抽样',
          备注: formModel['备注']||'',
          作业说明: formModel['作业说明']||'',
          作业附件: formModel['作业附件']||'',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          规则条件数: String((sampRuleRows.value||[]).length),
          适用物料: (sampMatRows.value||[]).map(r=>r.物料名称||r.物料编码).filter(Boolean).join('、') || '—',
          _inspectTypes: (sampInspectTypes.value||[]).slice(),
          _rules: (sampRuleRows.value||[]).map(r=>({...r})),
          _mats: (sampMatRows.value||[]).map(r=>({...r}))
        };
        if(isAdd){
          payload.id = 'ss-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'抽样方案复制新增成功':'抽样方案已新增') : '抽样方案已保存');
        return;
      }
      if(pageId.value==='auto-samp'){
        const code = String(formModel['登样方案编码']||'').trim();
        const name = String(formModel['登样方案名称']||'').trim();
        if(!code){ ElMessage.warning('请输入登样方案编码'); return; }
        if(!name){ ElMessage.warning('请输入登样方案名称'); return; }
        if(!(Number(formModel['执行周期'])>0)){ ElMessage.warning('请输入执行周期'); return; }
        if(!formModel['计划开始时间']){ ElMessage.warning('请选择计划开始时间'); return; }
        if(!formModel['循环方式']){ ElMessage.warning('请选择循环方式'); return; }
        if(!formModel['执行条件']){ ElMessage.warning('请选择执行条件'); return; }
        if(!formModel['执行周期单位']){ ElMessage.warning('请选择执行周期单位'); return; }
        if(!validateAutoSampDetails()) return;
        const bag = (MOCK['auto-samp'] = MOCK['auto-samp'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['登样方案编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('登样方案编码已存在，请重新输入'); return;
        }
        if(list.some(r=> r['登样方案名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('登样方案名称已存在，请重新输入'); return;
        }
        const details = (autoSampDetailRows.value||[]).map(r=>({...r}));
        const payload = {
          登样方案编码: code,
          登样方案名称: name,
          内容描述: formModel['内容描述']||'',
          执行周期: (formModel['执行周期']||'') + (formModel['执行周期单位']||'时'),
          执行周期单位: formModel['执行周期单位']||'时',
          计划开始时间: formModel['计划开始时间']||'',
          循环方式: formModel['循环方式']||'',
          执行条件: formModel['执行条件']||'',
          适用报检单: formModel['适用报检单']||'生产过程检',
          备注: formModel['备注']||'',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          登样信息摘要: details.map(r=>[r.物料信息||r.物料,r.采样点,r.检验方案].filter(Boolean).join('/')).filter(Boolean).join('；') || '—',
          _details: details,
          _executeCycle: formModel['执行周期'],
          _executeCycleUnit: formModel['执行周期单位']||'时'
        };
        if(isAdd){
          payload.id = 'as-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'登样方案复制新增成功':'登样方案已新增') : '登样方案已保存');
        return;
      }
      if(pageId.value==='spc-rule'){
        const cur = ((MOCK['spc-rule']||{}).main||[]).find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑规则'); return; }
        const rn = String(formModel['规则名称']||cur['规则名称']||'');
        const basisTpl = String(formModel['规则依据']||cur['规则依据']||'');
        const n = formModel['[n]'];
        const m = formModel['[m]'];
        const needN = rn !== '1界外';
        const needM = ['1界外','[m]/[n]A','[m]/[n]C'].includes(rn);
        if(needN && !(Number(n)>0)){ ElMessage.warning('请输入 [n]'); return; }
        if(needM && !(Number(m)>0)){ ElMessage.warning('请输入 [m]'); return; }
        if(['[m]/[n]A','[m]/[n]C'].includes(rn) && Number(n)<Number(m)){ ElMessage.warning('n不能小于m'); return; }
        cur.n = needN ? Number(n) : '';
        cur.m = needM ? Number(m) : '';
        let nowName = rn;
        let nowBasis = basisTpl;
        if(needN){ nowName = nowName.replace(/\[n\]/g, String(cur.n)); nowBasis = nowBasis.replace(/\[n\]/g, String(cur.n)); }
        if(needM){ nowName = nowName.replace(/\[m\]/g, String(cur.m)); nowBasis = nowBasis.replace(/\[m\]/g, String(cur.m)); }
        cur['现行名称'] = nowName;
        cur['现行规则'] = nowBasis;
        cur['规则依据'] = basisTpl;
        formVisible.value=false;
        bumpStore();
        ElMessage.success('规则已保存');
        return;
      }
      if(pageId.value==='spc-scheme-insp'){
        const codeKey = 'SPC查询方案编码';
        const nameKey = 'SPC查询方案名称';
        const code = String(formModel[codeKey]||'').trim();
        const name = String(formModel[nameKey]||'').trim();
        if(!code){ ElMessage.warning('请输入方案编码'); return; }
        if(!name){ ElMessage.warning('请输入方案名称'); return; }
        const bag = (MOCK[pageId.value] = MOCK[pageId.value] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r[codeKey]===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('方案编码已存在'); return; }
        if(list.some(r=> r[nameKey]===name && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('方案名称已存在'); return; }
        const lines = (formLineRows.value||[]).map(r=>{ const o={...r}; delete o._i; return o; });
        const payload = {
          [codeKey]: code,
          [nameKey]: name,
          备注: formModel['备注']||'',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          _lines: lines
        };
        if(isAdd){
          payload.id = 'spc-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? 'SPC查询方案已新增' : 'SPC查询方案已保存');
        return;
      }
      if(pageId.value==='warehouse'){
        const tab = activeTab.value || (tabView.value||{}).name || 'tab1';
        const isLoc = tab==='tab2';
        const codeKey = isLoc ? '库位编码' : '仓库编码';
        const nameKey = isLoc ? '库位名称' : '仓库名称';
        const code = String(formModel[codeKey]||'').trim();
        const name = String(formModel[nameKey]||'').trim();
        if(!code){ ElMessage.warning('请填写'+codeKey); return; }
        if(!name){ ElMessage.warning('请填写'+nameKey); return; }
        const ownerWh = splitDun(formModel['所属仓库']);
        if(isLoc && !ownerWh.length){ ElMessage.warning('请选择所属仓库'); return; }
        if(!isLoc){
          const minStr = String(formModel['最小库存']??'').trim();
          const maxStr = String(formModel['最大库存']??'').trim();
          if(minStr && !(Number(minStr)>=0)){ ElMessage.warning('最小库存须为数字'); return; }
          if(maxStr && !(Number(maxStr)>=0)){ ElMessage.warning('最大库存须为数字'); return; }
          if(minStr && maxStr && Number(maxStr) < Number(minStr)){ ElMessage.warning('最大库存不能小于最小库存'); return; }
        }
        const bag = (MOCK.warehouse = MOCK.warehouse || {});
        const list = (bag[tab] = bag[tab] || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r[codeKey]===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning(codeKey+'已存在，请重新输入'); return; }
        if(list.some(r=> r[nameKey]===name && (isAdd || r.id!==formModel._editId))){ ElMessage.warning(nameKey+'已存在，请重新输入'); return; }
        let payload;
        if(isLoc){
          payload = {
            库位编码: code,
            库位名称: name,
            所属仓库: ownerWh.join('、'),
            库位位置: formModel['库位位置']||'',
            库位用途: formModel['库位用途']||'',
            备注: formModel['备注']||'—',
            启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
          };
        } else {
          payload = {
            仓库编码: code,
            仓库名称: name,
            仓库位置: formModel['仓库位置']||'',
            仓库用途: formModel['仓库用途']||'',
            最小库存: String(formModel['最小库存']??'').trim(),
            最大库存: String(formModel['最大库存']??'').trim(),
            备注: formModel['备注']||'—',
            启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
          };
        }
        if(isAdd){
          payload.id = (isLoc?'loc-':'wh-') + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
      formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (isLoc?'库位已新增':'仓库已新增') : '已保存');
        return;
      }
      if(pageId.value==='stock-warn'){
        const tab = activeTab.value || (tabView.value||{}).name || 'tab1';
        const isMat = tab==='tab2';
        const codeKey = isMat ? '物料编码' : '仓库编码';
        const code = String(formModel[codeKey]||'').trim();
        if(!code){ ElMessage.warning('请先选择'+(isMat?'物料':'仓库')); return; }
        const maxStr = String(formModel['最大库存']||'').trim();
        const minStr = String(formModel['最小库存']||'').trim();
        if(!maxStr || !(Number(maxStr)>0)){ ElMessage.warning('最大库存须为正数'); return; }
        if(!minStr || !(Number(minStr)>0)){ ElMessage.warning('最小库存须为正数'); return; }
        if(Number(maxStr) < Number(minStr)){ ElMessage.warning('最大库存须大于等于最小库存'); return; }
        if(isMat){
          const age = String(formModel['库龄预警期']||'').trim();
          if(age && (!/^\d+$/.test(age) || Number(age)<=0)){ ElMessage.warning('库龄预警期须为正整数'); return; }
        }
        const bag = (MOCK['stock-warn'] = MOCK['stock-warn'] || {});
        const list = (bag[tab] = bag[tab] || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r[codeKey]===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning(codeKey+'在预警列表中已存在'); return;
        }
        let payload;
        if(isMat){
          payload = {
            物料编码: code,
            物料名称: formModel['物料名称']||'',
            物料规格: formModel['物料规格']||'',
            物料种类: formModel['物料种类']||'',
            基本单位: formModel['基本单位']||'',
            最大库存: String(Number(maxStr)),
            最小库存: String(Number(minStr)),
            库龄预警期: String(formModel['库龄预警期']||'').trim() || '',
            库龄预警期单位: formModel['库龄预警期单位'] || '天',
            备注: formModel['备注']||'—',
            启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
          };
        } else {
          payload = {
            仓库编码: code,
            仓库名称: formModel['仓库名称']||'',
            仓库位置: formModel['仓库位置']||'',
            仓库用途: formModel['仓库用途']||'',
            最大库存: String(Number(maxStr)),
            最小库存: String(Number(minStr)),
            备注: formModel['备注']||'—',
            启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
          };
        }
        if(isAdd){
          payload.id = 'sw-' + Date.now();
          payload.创建人 = '张三';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑预警'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '预警已新增' : '预警已保存');
        return;
      }
      if(pageId.value==='insp-proc'){
        const code = String(formModel['工序编码']||'').trim();
        const name = String(formModel['工序名称']||'').trim();
        const formName = String(formModel['表单名称']||'').trim();
        if(!code){ ElMessage.warning('请填写工序编码'); return; }
        if(!name){ ElMessage.warning('请填写工序名称'); return; }
        if(!formName){ ElMessage.warning('请选择表单名称'); return; }
        const list = ((MOCK['insp-proc'] = MOCK['insp-proc'] || {}).main = (MOCK['insp-proc'].main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['工序编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('工序编码已存在，请重新输入'); return; }
        if(list.some(r=> r['工序名称']===name && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('工序名称已存在，请重新输入'); return; }
        const payload = {
          工序编码: code,
          工序名称: name,
          表单名称: formName,
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'ip-' + Date.now();
          payload.创建人 = '张三';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑工序'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'检查工序复制新增成功':'检查工序已新增') : '检查工序已保存');
        return;
      }
      if(pageId.value==='insp-craft'){
        const code = String(formModel['工艺编码']||'').trim();
        const name = String(formModel['工艺名称']||'').trim();
        const biz = joinDun(formModel['适用业务单据']);
        if(!code){ ElMessage.warning('请填写工艺编码'); return; }
        if(!name){ ElMessage.warning('请填写工艺名称'); return; }
        if(!biz){ ElMessage.warning('请选择适用业务单据'); return; }
        const list = ((MOCK['insp-craft'] = MOCK['insp-craft'] || {}).main = (MOCK['insp-craft'].main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['工艺编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('工艺编码已存在，请重新输入'); return; }
        if(list.some(r=> r['工艺名称']===name && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('工艺名称已存在，请重新输入'); return; }
        const payload = {
          工艺编码: code,
          工艺名称: name,
          适用业务单据: biz,
          适用包材类型: joinDun(formModel['适用包材类型']) || '—',
          适用包装规格: joinDun(formModel['适用包装规格']) || '—',
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'ic-' + Date.now();
          payload.创建人 = '张三';
          payload.创建时间 = nowStamp();
          payload._craft = { nodes: [], edges: [] };
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑工艺'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'], _craft: cur._craft });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'检查工艺复制新增成功':'检查工艺已新增') : '检查工艺已保存');
        return;
      }
      if(pageId.value==='lg-kpi-scheme'){
        const code = String(formModel['方案编码']||'').trim();
        const name = String(formModel['方案名称']||'').trim();
        const desc = String(formModel['内容描述']||'').trim();
        const unit = String(formModel['周期单位']||'').trim();
        const cycle = String(formModel['周期']||'').trim();
        const planAt = String(formModel['计划时间']||'').trim();
        const warn = String(formModel['预警周期']||'').trim();
        const warnUnit = String(formModel['预警周期单位']||'').trim();
        const scope = String(formModel['供应商范围']||'').trim();
        if(!code){ ElMessage.warning('请输入方案编码'); return; }
        if(!name){ ElMessage.warning('请输入方案名称'); return; }
        if(!desc){ ElMessage.warning('请输入方案内容描述'); return; }
        if(!unit || !cycle || !(Number(cycle)>0)){ ElMessage.warning('请选择周期单位并输入正整数周期'); return; }
        if(!planAt){ ElMessage.warning('请选择计划开始时间'); return; }
        if(!warn || !warnUnit || !(Number(warn)>0)){ ElMessage.warning('请填写预警周期数值与单位'); return; }
        if(!scope){ ElMessage.warning('请至少选择一个参与考评的承运商/供应商'); return; }
        const list = ((MOCK['lg-kpi-scheme'] = MOCK['lg-kpi-scheme'] || {}).main = (MOCK['lg-kpi-scheme'].main || []));
        if(list.some(r=> r['方案编码']===code && r.id!==formModel._editId)){ ElMessage.warning('该方案编码已存在，请输入唯一编码'); return; }
        if(list.some(r=> r['方案名称']===name && r.id!==formModel._editId)){ ElMessage.warning('该方案名称已存在，请修改'); return; }
        const payload = {
          方案编码: code,
          方案名称: name,
          内容描述: desc,
          供应商范围: scope,
          周期单位: unit,
          周期: String(parseInt(cycle,10)),
          计划时间: planAt,
          预警周期单位: warnUnit,
          预警周期: String(parseInt(warn,10)),
          循环方式: formModel['循环方式']||'多次',
          启用状态: formModel['启用状态']||'启用',
          备注: formModel['备注']||'—',
          创建人: '张三'
        };
        if(formMode.value==='add'){
          const d = new Date();
          const pad = n => String(n).padStart(2,'0');
          payload.id = 'ks-' + Date.now();
          payload.创建时间 = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
          payload._grades = defaultKpiGrades();
          payload._projects = defaultKpiProjects();
          list.unshift(payload);
          formVisible.value=false;
          bumpStore();
          ElMessage.success('评价方案创建成功');
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(cur) Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'], _grades: cur._grades, _projects: cur._projects });
          formVisible.value=false;
          bumpStore();
          ElMessage.success('评价方案保存成功');
        }
        return;
      }
      if(pageId.value==='customer'){
        const code = String(formModel['客户编码']||'').trim();
        const name = String(formModel['客户名称']||'').trim();
        const shortName = String(formModel['客户简称']||'').trim();
        if(!code){ ElMessage.warning('请填写客户编码'); return; }
        if(!name){ ElMessage.warning('请填写客户名称'); return; }
        const email = String(formModel['客户邮箱']||'').trim();
        if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ ElMessage.warning('客户邮箱格式不正确'); return; }
        const list = ((MOCK.customer = MOCK.customer || {}).main = (MOCK.customer.main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['客户编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('客户编码已存在，请重新输入'); return; }
        const payload = {
          客户编码: code,
          客户名称: name,
          客户简称: shortName,
          客户类型: formModel['客户类型']||'',
          客户地址: String(formModel['客户地址']||'').trim(),
          客户联系人: String(formModel['客户联系人']||'').trim(),
          客户电话: String(formModel['客户电话']||'').trim(),
          客户邮箱: email,
          所属业务员: String(formModel['所属业务员']||'').trim() || '管理员',
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'c-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑客户'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: '管理员', 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy' ? '客户复制新增成功' : '客户已新增') : '客户已保存');
        return;
      }
      if(pageId.value==='supplier'){
        const code = String(formModel['供应商编码']||'').trim();
        const name = String(formModel['供应商名称']||'').trim();
        if(!code){ ElMessage.warning('请填写供应商编码'); return; }
        if(!name){ ElMessage.warning('请填写供应商名称'); return; }
        const email = String(formModel['供应商邮箱']||'').trim();
        if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ ElMessage.warning('供应商邮箱格式不正确'); return; }
        const list = ((MOCK.supplier = MOCK.supplier || {}).main = (MOCK.supplier.main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['供应商编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('供应商编码已存在，请重新输入'); return; }
        const payload = {
          供应商编码: code,
          供应商名称: name,
          供应商简称: String(formModel['供应商简称']||'').trim(),
          供应商类型: formModel['供应商类型']||'',
          供应商地址: String(formModel['供应商地址']||'').trim(),
          供应商联系人: String(formModel['供应商联系人']||'').trim(),
          供应商电话: String(formModel['供应商电话']||'').trim(),
          供应商邮箱: email,
          所属采购员: String(formModel['所属采购员']||'').trim() || '管理员',
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 's-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑供应商'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: '管理员', 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy' ? '供应商复制新增成功' : '供应商已新增') : '供应商已保存');
        return;
      }
      if(pageId.value==='po'){
        if(!formModel['采购类型']){ ElMessage.warning('请选择采购类型'); return; }
        if(!formModel['供应商编码']){ ElMessage.warning('请选择供应商'); return; }
        if(!formModel['采购部门']){ ElMessage.warning('请选择采购部门'); return; }
        if(!formModel['采购员']){ ElMessage.warning('请选择采购员'); return; }
        if(!formModel['订单日期']){ ElMessage.warning('请选择订单日期'); return; }
        if(!formModel['预计到货日期']){ ElMessage.warning('请选择预计到货日期'); return; }
        if(formModel['预计到货日期'] < formModel['订单日期']){ ElMessage.warning('预计到货日期不能早于订单日期'); return; }
        if(!formLineRows.value.length){ ElMessage.warning('请添加至少一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须为正数'); return; }
        if(formLineRows.value.some(r=>{
          const pcs = String(r['计划件数'] ?? '').trim();
          if(!pcs || pcs==='—') return false;
          return !(Number.isInteger(Number(pcs)) && Number(pcs)>0);
        })){ ElMessage.warning('计划件数须为正整数或不填'); return; }
        const list = ((MOCK.po = MOCK.po || {}).main = (MOCK.po.main || []));
        const lines = formLineRows.value.map((r,i)=>{
          const plan = Number(r['计划数量'])||0;
          const old = (formMode.value==='edit' && formModel._editId) ? ((list.find(x=> x.id===formModel._editId)||{})._lines||[])[i] : null;
          const inQty = old ? (Number(old['已入库数量'] ?? old['已入库'])||0) : 0;
          let lineSt = '待执行';
          if(inQty>0 && inQty<plan) lineSt = '执行中';
          if(inQty>=plan && plan>0) lineSt = '已完成';
          if(old && old['行状态']==='已关闭') lineSt = '已关闭';
          const pcsRaw = String(r['计划件数'] ?? '').trim();
          return {
            行号: r['行号'] || erpLineNo(i+1),
            物料编码: codeOf(r['物料信息']),
            物料信息: r['物料信息']||matInfoText(r['物料信息']),
            采购单位: r['采购单位']||matUnit(r['物料信息'],'po'),
            计划件数: (!pcsRaw || pcsRaw==='—') ? '' : pcsRaw,
            计划数量: String(plan),
            已入库数量: String(inQty),
            未入库数量: String(Math.max(0, plan - inQty)),
            行状态: lineSt,
            备注: r['备注']||'—'
          };
        });
        const payload = {
          采购订单号: formModel['采购订单号']||'',
          订单状态: '待执行',
          采购类型: formModel['采购类型']||'',
          供应商编码: formModel['供应商编码']||'',
          供应商名称: formModel['供应商名称']||'',
          合同号: formModel['合同号']||'',
          采购部门: formModel['采购部门']||'',
          采购员: formModel['采购员']||'',
          订单日期: formModel['订单日期']||'',
          预计到货日期: formModel['预计到货日期']||'',
          备注: formModel['备注']||'—',
          _lines: lines
        };
        syncPoStatusFromLines(payload);
        if(formMode.value==='add'){
          payload.id = 'po-' + Date.now();
          payload.采购订单号 = nextBizNo('CGDD','po','采购订单号');
          payload.订单状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑采购订单'); return; }
          if(!canEditPo(cur)){
            ElMessage.warning('仅「待执行」状态的采购订单可编辑'); return;
          }
          Object.assign(cur, payload, { id: cur.id, 采购订单号: cur['采购订单号'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(formMode.value==='add' ? '采购订单已新增' : '采购订单已保存');
        return;
      }
      if(pageId.value==='so'){
        if(!formModel['销售类型']){ ElMessage.warning('请选择销售类型'); return; }
        if(!formModel['客户编码']){ ElMessage.warning('请选择客户'); return; }
        if(!formModel['销售部门']){ ElMessage.warning('请选择销售部门'); return; }
        if(!formModel['销售员']){ ElMessage.warning('请选择销售员'); return; }
        if(!formModel['订单日期']){ ElMessage.warning('请选择订单日期'); return; }
        if(!formModel['要求发货日期']){ ElMessage.warning('请选择要求发货日期'); return; }
        if(formModel['要求发货日期'] < formModel['订单日期']){ ElMessage.warning('要求发货日期不能早于订单日期'); return; }
        if(!formLineRows.value.length){ ElMessage.warning('请添加至少一行销售明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须为正数'); return; }
        if(formLineRows.value.some(r=>{
          const pcs = String(r['计划件数'] ?? '').trim();
          if(!pcs || pcs==='—') return false;
          return !(Number.isInteger(Number(pcs)) && Number(pcs)>0);
        })){ ElMessage.warning('计划件数须为正整数或不填'); return; }
        const soMatCodes = formLineRows.value.map(r=> codeOf(r['物料信息'])).filter(Boolean);
        const soDup = soMatCodes.find((c,i)=> soMatCodes.indexOf(c)!==i);
        if(soDup){ ElMessage.warning('物料 '+soDup+' 已存在，请勿重复添加'); return; }
        const list = ((MOCK.so = MOCK.so || {}).main = (MOCK.so.main || []));
        const lines = formLineRows.value.map((r,i)=>{
          const plan = Number(r['计划数量'])||0;
          const old = (formMode.value==='edit' && formModel._editId) ? ((list.find(x=> x.id===formModel._editId)||{})._lines||[])[i] : null;
          const outQty = old ? (Number(old['已出库数量'])||0) : 0;
          let lineSt = '待执行';
          if(outQty>0 && outQty<plan) lineSt = '执行中';
          if(outQty>=plan && plan>0) lineSt = '已完成';
          if(old && old['行状态']==='已关闭') lineSt = '已关闭';
          const pcsRaw = String(r['计划件数'] ?? '').trim();
          return {
            行号: r['行号'] || erpLineNo(i+1),
            物料编码: codeOf(r['物料信息']),
            物料信息: r['物料信息']||matInfoText(r['物料信息']),
            销售单位: r['销售单位']||matUnit(r['物料信息'],'so'),
            计划件数: (!pcsRaw || pcsRaw==='—') ? '' : pcsRaw,
            计划数量: String(plan),
            已出库数量: String(outQty),
            未出库数量: String(Math.max(0, plan - outQty)),
            行状态: lineSt,
            备注: r['备注']||'—'
          };
        });
        const payload = {
          销售订单号: formModel['销售订单号']||'',
          订单状态: '待执行',
          销售类型: formModel['销售类型']||'',
          客户编码: formModel['客户编码']||'',
          客户名称: formModel['客户名称']||'',
          合同号: formModel['合同号']||'',
          销售部门: formModel['销售部门']||'',
          销售员: formModel['销售员']||'',
          订单日期: formModel['订单日期']||'',
          要求发货日期: formModel['要求发货日期']||'',
          备注: formModel['备注']||'—',
          _lines: lines
        };
        syncSoStatusFromLines(payload);
        if(formMode.value==='add'){
          payload.id = 'so-' + Date.now();
          payload.销售订单号 = nextBizNo('XSDD','so','销售订单号');
          payload.订单状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑销售订单'); return; }
          if(!canEditSo(cur)){
            ElMessage.warning('仅「待执行」状态的销售订单可编辑'); return;
          }
          Object.assign(cur, payload, { id: cur.id, 销售订单号: cur['销售订单号'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(formMode.value==='add' ? '销售订单已新增' : '销售订单已保存');
        return;
      }
      if(pageId.value==='unit'){
        const code = String(formModel['单位编码']||'').trim();
        const name = String(formModel['单位名称']||'').trim();
        if(!code){ ElMessage.warning('请填写单位编码'); return; }
        if(!name){ ElMessage.warning('请填写单位名称'); return; }
        if(!formModel['舍入规则']){ ElMessage.warning('请选择舍入规则'); return; }
        if(!formModel['精度规则']){ ElMessage.warning('请选择精度规则'); return; }
        const precNum = formModel['精度值'];
        if(precNum==='' || precNum==null || Number.isNaN(Number(precNum)) || Number(precNum)<0){
          ElMessage.warning('精度值须为非负整数'); return;
        }
        const list = ((MOCK.unit = MOCK.unit || {}).main = (MOCK.unit.main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['单位编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('单位编码已存在，请重新输入'); return; }
        const payload = {
          单位编码: code,
          单位名称: name,
          舍入规则: formModel['舍入规则']||'四舍五入',
          精度规则: formModel['精度规则']||'固定小数位',
          精度值: String(parseInt(precNum,10)),
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'u-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑单位'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: '管理员', 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy' ? '单位复制新增成功' : '单位已新增') : '单位已保存');
        return;
      }
      if(pageId.value==='dict'){
        if(!isDictLeafType(dictTypeId.value)){ ElMessage.warning('请先选择字典类型'); return; }
        const code = String(formModel['编码']||'').trim();
        const name = String(formModel['名称']||'').trim();
        if(!code){ ElMessage.warning('请填写编码'); return; }
        if(!name){ ElMessage.warning('请填写名称'); return; }
        const list = ((MOCK.dict = MOCK.dict || {}).main = (MOCK.dict.main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        const sameType = list.filter(r=> r.typeId===dictTypeId.value);
        if(sameType.some(r=> r['编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('同类型下编码不可重复'); return; }
        if(sameType.some(r=> r['名称']===name && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('同类型下名称不可重复'); return; }
        const payload = {
          typeId: dictTypeId.value,
          编码: code,
          名称: name,
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'di-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑字典项'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy' ? '字典项已复制新增' : '字典项已新增') : '字典项已保存');
        return;
      }
      if(pageId.value==='freight'){
        const from = String(formModel['发货地']||'').trim();
        const to = String(formModel['收货地']||'').trim();
        const unit = String(formModel['计费单位']||'').trim();
        const price = Number(formModel['运费单价']);
        if(!from){ ElMessage.warning('请填写发货地'); return; }
        if(!to){ ElMessage.warning('请填写收货地'); return; }
        if(from===to){ ElMessage.warning('发货地与收货地不能相同'); return; }
        if(!unit){ ElMessage.warning('请选择计费单位'); return; }
        if(formModel['运费单价']===undefined || formModel['运费单价']==='' || formModel['运费单价']===null){
          ElMessage.warning('请填写运费单价'); return;
        }
        if(!(price>0)){ ElMessage.warning('运费单价必须大于零'); return; }
        const list = ((MOCK.freight = MOCK.freight || {}).main = (MOCK.freight.main || []));
        const payload = {
          发货地: from,
          收货地: to,
          产品名称: formModel['产品信息']||formModel['产品名称']||'',
          计费单位: unit,
          运费单价: price.toFixed(2),
          车型: formModel['车型']||'',
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(formMode.value==='add'){
          payload.id = 'yf-' + Date.now();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(cur) Object.assign(cur, payload, { id: cur.id });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(formMode.value==='add' ? '运费参照已新增' : '运费参照已保存');
        return;
      }
      if(pageId.value==='vehicle'){
        const code = String(formModel['车辆编码']||'').trim();
        const plate = String(formModel['车牌号']||'').trim();
        const scope = String(formModel['经营范围']||'').trim();
        if(!code){ ElMessage.warning('请填写车辆编码'); return; }
        const list = ((MOCK.vehicle = MOCK.vehicle || {}).main = (MOCK.vehicle.main || []));
        const dup = list.some(r=> r['车辆编码']===code && r.id!==formModel._editId);
        if(dup){ ElMessage.warning('车辆编码已存在，请重新输入'); return; }
        if(!plate){ ElMessage.warning('请填写车牌号'); return; }
        if(!/^[\u4e00-\u9fa5][A-Za-z][A-Za-z0-9挂]{4,6}$/.test(plate)){
          ElMessage.warning('请填写正确的车牌号'); return;
        }
        if(!scope){ ElMessage.warning('请选择经营范围（普货/危货）'); return; }
        const phone = String(formModel['联系电话']||'').trim();
        if(phone && phone!=='—' && !/^1\d{10}$/.test(phone)){
          ElMessage.warning('请填写正确的 11 位手机号码'); return;
        }
        const escortPhone = String(formModel['押运员电话']||'').trim();
        if(escortPhone && escortPhone!=='—' && !/^1\d{10}$/.test(escortPhone)){
          ElMessage.warning('请填写正确的 11 位手机号码'); return;
        }
        const idOk = v => !v || v==='—' || /^\d{17}[\dXx]$/.test(v);
        const driverId = String(formModel['司机身份证号']||'').trim();
        const escortId = String(formModel['押运员身份证号']||'').trim();
        if(!idOk(driverId) || !idOk(escortId)){
          ElMessage.warning('请输入合法的 18 位身份证号码'); return;
        }
        const dash = v => (v && String(v).trim()) ? String(v).trim() : '—';
        const payload = {
          车辆编码: code,
          车牌号: plate,
          经营范围: scope,
          行驶证有效期: dash(formModel['行驶证有效期']),
          运输证有效期: dash(formModel['运输证有效期']),
          车辆附件: dash(formModel['车辆附件']),
          准牵引总质量: formModel['准牵引总质量']||'',
          车挂号: dash(formModel['车挂号']),
          挂车号: dash(formModel['车挂号']),
          挂车行驶证有效期: dash(formModel['挂车行驶证有效期']),
          挂车运输证有效期: dash(formModel['挂车运输证有效期']),
          挂车附件: dash(formModel['挂车附件']),
          核定载质量: formModel['核定载质量']||'',
          环保排放阶段: formModel['环保排放阶段']||'',
          司机姓名: formModel['司机姓名']||'',
          联系电话: phone || '—',
          司机身份证号: dash(driverId),
          驾驶证号: formModel['驾驶证号']||'',
          驾驶证有效期: dash(formModel['驾驶证有效期']),
          驾驶证附件: dash(formModel['驾驶证附件']),
          从业资格证号: formModel['从业资格证号']||'',
          从业资格证有效期: dash(formModel['从业资格证有效期']),
          从业资格证附件: dash(formModel['从业资格证附件']),
          押运员姓名: dash(formModel['押运员姓名']),
          押运员电话: dash(escortPhone),
          押运员身份证号: dash(escortId),
          押运员资格证号: dash(formModel['押运员资格证号']),
          押运资格证有效期: dash(formModel['押运资格证有效期']),
          押运资格证附件: dash(formModel['押运资格证附件']),
          备注: dash(formModel['备注']),
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(formMode.value==='add'){
          payload.id = 'vh-' + Date.now();
          payload.所属承运商 = '—';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['车辆编码']===code);
          if(cur) Object.assign(cur, payload, { id: cur.id, 所属承运商: cur['所属承运商']||'—' });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(formMode.value==='add' ? '车辆及司机档案已新增' : '车辆及司机档案已保存');
        return;
      }
      if(pageId.value==='carrier'){
        const code = String(formModel['承运商编码']||'').trim();
        const name = String(formModel['承运商名称']||'').trim();
        if(!code){ ElMessage.warning('请填写承运商编码'); return; }
        const list = ((MOCK.carrier = MOCK.carrier || {}).main = (MOCK.carrier.main || []));
        const dup = list.some(r=> r['承运商编码']===code && r.id!==formModel._editId);
        if(dup){ ElMessage.warning('承运商编码已存在，请重新输入'); return; }
        if(!name){ ElMessage.warning('请填写承运商名称'); return; }
        const credit = String(formModel['统一社会信用代码']||'').trim();
        if(credit && credit!=='—' && !/^[0-9A-Za-z]{18}$/.test(credit)){
          ElMessage.warning('请填写正确的统一社会信用代码'); return;
        }
        const email = String(formModel['承运商邮箱']||'').trim();
        if(email && email!=='—' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
          ElMessage.warning('请填写正确的邮箱地址'); return;
        }
        const payload = {
          承运商编码: code,
          承运商名称: name,
          承运商简称: formModel['承运商简称']||'',
          承运商地址: formModel['承运商地址']||'',
          统一社会信用代码: credit || '—',
          信用代码有效期: formModel['信用代码有效期']||'—',
          道路运输经营许可证号: formModel['道路运输经营许可证号']||'',
          许可证有效期: formModel['许可证有效期']||'—',
          保单号: formModel['保单号']||'—',
          保单有效期: formModel['保单有效期']||'—',
          承运商邮箱: email || '—',
          承运商联系人: formModel['承运商联系人']||'',
          承运商电话: formModel['承运商电话']||'',
          所属调度员: formModel['所属调度员']||'',
          签约日期: formModel['签约日期']||'',
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(formMode.value==='add'){
          payload.id = 'cys-' + Date.now();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['承运商编码']===code);
          if(cur) Object.assign(cur, payload, { id: cur.id });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(formMode.value==='add' ? '承运商已新增' : '承运商已保存');
        return;
      }
      if(pageId.value==='mat-list'){
        const code = String(formModel['物料编码']||'').trim();
        const name = String(formModel['物料名称']||'').trim();
        if(!code){ ElMessage.warning('请填写物料编码'); return; }
        if(!name){ ElMessage.warning('请填写物料名称'); return; }
        if(!String(formModel['物料规格']||'').trim()){ ElMessage.warning('请填写物料规格'); return; }
        if(!formModel['物料种类']){ ElMessage.warning('请选择物料种类'); return; }
        if(!formModel['基本单位']){ ElMessage.warning('请选择基本单位'); return; }
        if(!formModel['库存单位']){ ElMessage.warning('请选择库存单位'); return; }
        const exp = String(formModel['有效期']||'').trim();
        if(exp && (!/^\d+$/.test(exp) || Number(exp)<=0)){ ElMessage.warning('有效期须为正整数'); return; }
        const warn = String(formModel['有效期预警']||'').trim();
        if(warn && (!/^\d+$/.test(warn) || Number(warn)<=0)){ ElMessage.warning('有效期预警须为正整数'); return; }
        const list = ((MOCK['mat-list'] = MOCK['mat-list'] || {}).main = (MOCK['mat-list'].main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['物料编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('物料编码已存在，请重新输入'); return;
        }
        const payload = {
          物料编码: code,
          物料名称: name,
          物料规格: formModel['物料规格']||'',
          物料种类: formModel['物料种类']||'',
          有效期: exp || '',
          有效期单位: formModel['有效期单位'] || '天',
          有效期预警: warn || '',
          有效期预警单位: formModel['有效期预警单位'] || '天',
          基本单位: formModel['基本单位']||'',
          库存单位: formModel['库存单位']||'',
          生产单位: formModel['生产单位']||'',
          采购单位: formModel['采购单位']||'',
          销售单位: formModel['销售单位']||'',
          备注: formModel['备注'] || '—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          const d = new Date();
          const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
          payload.id = 'mat-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = stamp;
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑物料'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: '管理员', 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy' ? '物料复制新增成功' : '物料新增成功') : '物料保存成功');
        return;
      }
      if(pageId.value==='mat-uom'){
        const code = String(formModel['物料编码']||'').trim();
        if(!code){ ElMessage.warning('请选择物料'); return; }
        if(!formModel['基本单位']){ ElMessage.warning('请选择基本单位'); return; }
        if(!formModel['换算单位']){ ElMessage.warning('请选择换算单位'); return; }
        if(formModel['基本单位']===formModel['换算单位']){ ElMessage.warning('基本单位与换算单位不能相同'); return; }
        const parsed = parseMatUomRatioFromForm();
        if(!parsed.ok){ ElMessage.warning(parsed.msg); return; }
        const ratio = parsed.ratio;
        const list = ((MOCK['mat-uom'] = MOCK['mat-uom'] || {}).main = (MOCK['mat-uom'].main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['物料编码']===code && r['基本单位']===formModel['基本单位'] && r['换算单位']===formModel['换算单位'] && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('该换算关系已存在，请勿重复添加'); return;
        }
        const mat = matListRow(code);
        const payload = {
          物料编码: code,
          物料名称: (mat && mat['物料名称']) || formModel['物料名称'] || '',
          物料规格: (mat && mat['物料规格']) || formModel['物料规格'] || '',
          物料种类: (mat && mat['物料种类']) || formModel['物料种类'] || '',
          基本单位: formModel['基本单位'],
          换算单位: formModel['换算单位'],
          换算比例: String(ratio),
          备注: formModel['备注'] || '—'
        };
        if(isAdd){
          const d = new Date();
          const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
          payload.id = 'uom-' + Date.now();
          payload.创建人 = '张三';
          payload.创建时间 = stamp;
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑换算关系'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy' ? '换算关系已新增' : '换算关系已新增') : '换算关系已保存');
        return;
      }

      if(pageId.value==='opc-point'){
        const name = String(formModel['点位名称']||'').trim();
        if(!name){ ElMessage.warning('请输入点位名称'); return; }
        const bag = (MOCK['opc-point'] = MOCK['opc-point'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['点位名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('点位名称已存在，请重新输入'); return;
        }
        const payload = {
          点位名称: name,
          采集平台: String(formModel['采集平台']||'').trim(),
          备注: formModel['备注'] || '',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          同步状态: isAdd ? '未同步' : (formModel['同步状态'] || '未同步')
        };
        if(isAdd){
          payload.id = 'opc-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑点位'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'], 同步状态: '未同步' });
        }
        formVisible.value=false; bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'点位复制新增成功':'点位已新增') : '点位已保存');
        return;
      }
      if(pageId.value==='gather-item'){
        const code = String(formModel['采集项编码']||'').trim();
        const name = String(formModel['采集项名称']||'').trim();
        const unit = String(formModel['采集项单位']||'').trim();
        const method = String(formModel['采集方式']||'').trim() || '自动';
        const freqN = String(formModel['采集频率']||'').trim();
        const freqU = ({ 分:'分钟', 时:'小时' }[String(formModel['采集频率单位']||'秒').trim()] || String(formModel['采集频率单位']||'秒').trim() || '秒');
        if(!code){ ElMessage.warning('请输入采集项编码'); return; }
        if(!name){ ElMessage.warning('请输入采集项名称'); return; }
        if(!unit){ ElMessage.warning('请选择采集项单位'); return; }
        if(!freqN || !(Number(freqN)>0) || !Number.isInteger(Number(freqN))){ ElMessage.warning('采集频率须为正整数'); return; }
        const bag = (MOCK['gather-item'] = MOCK['gather-item'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['采集项编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('采集项编码已存在'); return;
        }
        if(list.some(r=> r['采集项名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('采集项名称已存在'); return;
        }
        const payload = {
          采集项编码: code,
          采集项名称: name,
          采集项单位: unit,
          采集项单位编码: formModel['采集项单位编码'] || '',
          采集方式: method,
          采集频率: freqN + '/' + freqU,
          采集频率数值: Number(freqN),
          采集频率单位: freqU,
          点位名称: formModel['点位名称'] || '',
          采集平台: formModel['采集平台'] || '',
          备注: formModel['备注'] || '',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'gi-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑采集项'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false; bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'采集项复制新增成功':'采集项已新增') : '采集项已保存');
        return;
      }
      if(pageId.value==='gather-scheme'){
        const code = String(formModel['采集方案编码']||'').trim();
        const name = String(formModel['采集方案名称']||'').trim();
        if(!code){ ElMessage.warning('请输入采集方案编码'); return; }
        if(!name){ ElMessage.warning('请输入采集方案名称'); return; }
        const lines = (formLineRows.value||[]).map(r=>{
          const o={...r}; delete o._i;
          GS_LIMIT_KEYS.forEach(k=>{ o[k] = normalizeSchemeLimit(r[k], k); });
          return o;
        });
        const seenItem = new Set();
        const bad = [];
        lines.forEach((r,i)=>{
          const no = i+1;
          const itemCode = String(r['采集项编码']||'').trim();
          if(itemCode){
            if(seenItem.has(itemCode)) bad.push('第'+no+'行采集项编码「'+itemCode+'」重复');
            else seenItem.add(itemCode);
          }
          const nums = {};
          ['USL','UCL','LCL','LSL'].forEach(k=>{
            const s = gatherLimitPlain(r[k]);
            if(s===''){ nums[k]=null; return; }
            const n = Number(s);
            if(!Number.isFinite(n)) bad.push('第'+no+'行 '+k+'「'+s+'」不是数字');
            else nums[k]=n;
          });
          const order = ['USL','UCL','LCL','LSL'];
          for(let a=0;a<order.length;a++){
            for(let b=a+1;b<order.length;b++){
              const hi = nums[order[a]], lo = nums[order[b]];
              if(hi==null || lo==null) continue;
              if(!(hi>=lo)) bad.push('第'+no+'行 '+order[a]+'('+hi+') < '+order[b]+'('+lo+')，须满足 USL≥UCL≥LCL≥LSL');
            }
          }
        });
        if(bad.length){
          ElMessage.warning(bad.slice(0,4).join('；') + (bad.length>4 ? '；等'+bad.length+'处不合格' : ''));
          return;
        }
        const bag = (MOCK['gather-scheme'] = MOCK['gather-scheme'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['采集方案编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('采集方案编码已存在'); return;
        }
        if(list.some(r=> r['采集方案名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('采集方案名称已存在'); return;
        }
        const payload = {
          采集方案编码: code,
          采集方案名称: name,
          备注: formModel['备注'] || '',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          _lines: lines,
          指标集: lines
        };
        if(isAdd){
          payload.id = 'gs-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑采集方案'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false; bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'采集方案复制新增成功':'采集方案已新增') : '采集方案已保存');
        return;
      }
      if(pageId.value==='item-uom'){
        const u1 = String(formModel['检验项单位1']||'').trim();
        const u2 = String(formModel['检验项单位2']||'').trim();
        const c1 = String(formModel['检验项单位1编码']||'').trim();
        const c2 = String(formModel['检验项单位2编码']||'').trim();
        if(!u1){ ElMessage.warning('请选择检验项单位1'); return; }
        if(!u2){ ElMessage.warning('请选择检验项单位2'); return; }
        if((c1 && c2 && c1===c2) || (!c1 && !c2 && u1===u2)){
          ElMessage.warning('检验项单位1与检验项单位2不可一致'); return;
        }
        const leftStr = String(formModel['换算比例左'] ?? '').trim();
        const rightStr = String(formModel['换算比例右'] ?? '').trim();
        if(leftStr==='' || rightStr===''){ ElMessage.warning('请填写换算比例'); return; }
        const left = Number(leftStr), right = Number(rightStr);
        if(!(left>0) || !(right>0)){ ElMessage.warning('换算比例必须为大于 0 的数字'); return; }
        const ratioDisp = (Math.abs(left-Math.round(left))<1e-9?String(Math.round(left)):String(left)) + ':' + (Math.abs(right-Math.round(right))<1e-9?String(Math.round(right)):String(right));
        const bag = (MOCK['item-uom'] = MOCK['item-uom'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        const payload = {
          检验项单位1编码: c1 || u1,
          检验项单位1: u1,
          检验项单位2编码: c2 || u2,
          检验项单位2: u2,
          换算比例: ratioDisp,
          备注: formModel['备注'] || ''
        };
        if(isAdd){
          payload.id = 'iuom-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'检验项单位换算复制成功':'检验项单位换算已新增') : '检验项单位换算已保存');
        return;
      }
      if(pageId.value==='mat-medium'){
        const medium = String(formModel['充装介质']||'').trim();
        if(!medium){ ElMessage.warning('请选择充装介质'); return; }
        const list = ((MOCK['mat-medium'] = MOCK['mat-medium'] || {}).main = (MOCK['mat-medium'].main || []));
        if(formMode.value==='add'){
          const mats = formModel._mats || [];
          if(!mats.length){ ElMessage.warning('请选择物料信息'); return; }
          const d = new Date();
          const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
          let added = 0, skipped = 0;
          mats.forEach((m, idx)=>{
            const code = codeOf(m.编码 || m['物料编码'] || m['物料信息']);
            if(!code) return;
            if(list.some(r=> codeOf(r['物料编码']||r['物料信息'])===code && r['充装介质']===medium)){
              skipped++;
              return;
            }
            list.unshift({
              id: 'mm-' + Date.now() + '-' + idx,
              物料编码: code,
              物料信息: m.物料信息 || matInfoText(m),
              充装介质: medium,
              备注: formModel['备注'] || '—',
              创建人: '张三',
              创建时间: stamp
            });
            added++;
          });
          formVisible.value=false;
          bumpStore();
          if(!added && skipped){ ElMessage.warning('所选物料与该充装介质的对照关系均已存在'); return; }
          if(skipped){ ElMessage.success(`已过滤 ${skipped} 条已存在的重复对照记录，成功新增 ${added} 条对照记录`); return; }
          ElMessage.success(`成功新增 ${added} 条对照记录`);
          return;
        }
        const code = codeOf(formModel['物料编码'] || formModel['物料信息']);
        if(!code){ ElMessage.warning('请选择物料信息'); return; }
        if(list.some(r=> codeOf(r['物料编码']||r['物料信息'])===code && r['充装介质']===medium && r.id!==formModel._editId)){
          ElMessage.warning('该物料与充装介质的对照关系已存在，请勿重复添加'); return;
        }
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑对照记录'); return; }
        Object.assign(cur, {
          充装介质: medium,
          备注: formModel['备注'] || '—',
          物料编码: code,
          物料信息: formModel['物料信息'] || cur['物料信息']
        }, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        formVisible.value=false;
        bumpStore();
        ElMessage.success('对照记录已保存');
        return;
      }
      if(pageId.value==='serial-arch'){
        const bc = String(formModel['条码号']||'').trim();
        if(!bc){ ElMessage.warning('请填写条码号'); return; }
        if(!/^TM\d{12}$/.test(bc)){ ElMessage.warning('条码号格式须为 TM+年月日+4位流水'); return; }
        if(tmBarcodeTaken(bc, formModel._editId)){ ElMessage.warning('条码号已存在，请保持全局唯一'); return; }
        const matInfo = String(formModel['物料信息']||'').trim();
        const hasMat = !!(matInfo && matInfo !== '—');
        if(hasMat){
          if(!String(formModel['物料批号']||'').trim()){ ElMessage.warning('请填写物料批号'); return; }
          if(!String(formModel['建档数量']||'').trim()){ ElMessage.warning('请填写建档数量'); return; }
          if(!String(formModel['当前数量']||'').trim()){ formModel['当前数量'] = formModel['建档数量']; }
          if(!String(formModel['当前数量']||'').trim()){ ElMessage.warning('请填写当前数量'); return; }
          if(!String(formModel['供应商信息']||'').trim()){ ElMessage.warning('请选择供应商信息'); return; }
          if(!String(formModel['生产厂家']||'').trim()){ ElMessage.warning('请选择生产厂家'); return; }
          if(!String(formModel['生产日期']||'').trim()){ ElMessage.warning('请选择生产日期'); return; }
        }
        const archiveStr = String(formModel['建档数量']||'').trim();
        let qtyStr = String(formModel['当前数量']||'').trim();
        if(!qtyStr && archiveStr) qtyStr = archiveStr;
        if(archiveStr!=='' && !(Number(archiveStr)>0)){ ElMessage.warning('建档数量必须为正数'); return; }
        if(qtyStr!=='' && !(Number(qtyStr)>0) && hasMat){ ElMessage.warning('当前数量必须为正数'); return; }
        if(qtyStr!=='' && !(Number(qtyStr)>=0)){ ElMessage.warning('当前数量须为非负数字'); return; }
        const expN = String(formModel['有效期']||'').trim();
        const expU = String(formModel['有效期单位']||'天').trim() || '天';
        if(expN && (!(Number(expN)>0) || !/^\d+$/.test(expN))){ ElMessage.warning('有效期须为正整数'); return; }
        const expire = calcExpireDate(formModel['生产日期'], expN, expU) || formModel['失效日期'] || '—';
        let useSt = formMode.value==='add' ? '在用' : (formModel['使用状态'] || '在用');
        let invSt = formMode.value==='add' ? '初始化' : (formModel['库存状态'] || '初始化');
        const list = ((MOCK['serial-arch'] = MOCK['serial-arch'] || {}).main = (MOCK['serial-arch'].main || []));
        const payload = {
          条码号: bc,
          包装规格: formModel['包装规格'] || '—',
          物料信息: formModel['物料信息'] || '—',
          库存单位: formModel['库存单位'] || '—',
          物料批号: formModel['物料批号'] || '—',
          客户批号: formModel['客户批号'] || '—',
          建档数量: archiveStr==='' ? '—' : archiveStr,
          当前数量: qtyStr==='' ? '—' : String(Number(qtyStr)),
          供应商信息: formModel['供应商信息'] || '—',
          生产厂家: formModel['生产厂家'] || '—',
          生产日期: formModel['生产日期'] || '—',
          有效期: expN ? `${expN} ${expU}` : '—',
          失效日期: expire || '—',
          使用状态: useSt,
          库存状态: invSt
        };
        if(formMode.value==='add'){
          const stamp = nowStamp();
          list.unshift(Object.assign({}, payload, {
            id: 'sa-' + Date.now(),
            检验状态: '待检验',
            存储位置: '—',
            来源单号: '—',
            来源条码号: '—',
            绑定状态: '未绑定',
            当前绑定外包材: '—',
            当前步骤: '—',
            当前单据号: '—',
            所属阶段: '—',
            最新操作人: '张三',
            最新操作时间: stamp,
            创建时间: stamp
          }));
          formVisible.value=false;
          bumpStore();
          ElMessage.success('流水码已新增');
          return;
        }
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑流水码'); return; }
        if(cur['使用状态']!=='在用' || cur['库存状态']!=='初始化'){
          ElMessage.warning('仅使用状态=在用且库存状态=初始化时可编辑'); return;
        }
        Object.assign(cur, payload, {
          id: cur.id,
          检验状态: cur['检验状态'] || '待检验',
          存储位置: cur['存储位置'],
          来源单号: cur['来源单号'],
          来源条码号: cur['来源条码号'],
          绑定状态: cur['绑定状态'],
          当前绑定外包材: cur['当前绑定外包材'],
          当前步骤: cur['当前步骤'],
          当前单据号: cur['当前单据号'],
          所属阶段: cur['所属阶段'],
          最新操作人: '张三',
          最新操作时间: nowStamp(),
          创建时间: cur['创建时间']
        });
        formVisible.value=false;
        bumpStore();
        ElMessage.success('流水码已保存');
        return;
      }
      if(pageId.value==='tank-arch'){
        const tankNo = String(formModel['储罐编号']||'').trim();
        const tankType = String(formModel['储罐类型']||'').trim();
        const vol = String(formModel['容积']||'').trim();
        if(!tankNo){ ElMessage.warning('请填写储罐编号'); return; }
        if(!tankType){ ElMessage.warning('请选择储罐类型'); return; }
        if(!vol){ ElMessage.warning('请选择容积'); return; }
        let bc = String(formModel['条码号']||'').trim();
        if(!bc) bc = nextTmNo();
        if(tmBarcodeTaken(bc, formModel._editId)){ ElMessage.warning('条码号已存在，请保持全局唯一'); return; }
        const list = ((MOCK['tank-arch'] = MOCK['tank-arch'] || {}).main = (MOCK['tank-arch'].main || []));
        if(list.some(r=> r['储罐编号']===tankNo && r.id!==formModel._editId)){
          ElMessage.warning('储罐编号已存在，请保持唯一'); return;
        }
        const payload = {
          条码号: bc,
          储罐编号: tankNo,
          储罐类型: tankType,
          充装介质: formModel['充装介质'] || '—',
          容积: vol,
          备注: formModel['备注'] || '—'
        };
        if(formMode.value==='add'){
          list.unshift(Object.assign({}, payload, {
            id: 'tk-' + Date.now(),
            使用状态: '在用',
            库存状态: '库内',
            库存位置: '—',
            物料信息: '—',
            物料批号: '—',
            建档数量: '0',
            当前数量: '0',
            库存单位: '—',
            供应商信息: '—',
            生产厂家: '—',
            生产日期: '—',
            有效期: '—',
            失效日期: '—',
            当前步骤: '—',
            当前单据号: '—',
            所属阶段: '—',
            最新操作人: '—',
            最新操作时间: '—',
            创建时间: nowStamp()
          }));
          formVisible.value=false;
          bumpStore();
          ElMessage.success('储罐档案已新增');
          return;
        }
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑储罐档案'); return; }
        if(!canEditTankArch(cur)){
          ElMessage.warning('仅使用状态=在用且行物料无值（空罐）时可编辑'); return;
        }
        Object.assign(cur, payload, {
          id: cur.id,
          使用状态: cur['使用状态'],
          库存状态: cur['库存状态'],
          库存位置: cur['库存位置'],
          物料信息: cur['物料信息'],
          物料批号: cur['物料批号'],
          建档数量: cur['建档数量'],
          当前数量: cur['当前数量'],
          库存单位: cur['库存单位'],
          供应商信息: cur['供应商信息'],
          生产厂家: cur['生产厂家'],
          生产日期: cur['生产日期'],
          有效期: cur['有效期'],
          失效日期: cur['失效日期'],
          当前步骤: cur['当前步骤'],
          当前单据号: cur['当前单据号'],
          所属阶段: cur['所属阶段'],
          最新操作人: cur['最新操作人'],
          最新操作时间: cur['最新操作时间'],
          创建时间: cur['创建时间']
        });
        formVisible.value=false;
        bumpStore();
        ElMessage.success('储罐档案已保存');
        return;
      }
      if(false /*lg-order removed*/){
        if(!formModel['发货单位']){ ElMessage.warning('请选择发货单位'); return; }
        if(!formModel['收货单位']){ ElMessage.warning('请选择收货单位'); return; }
        if(!formModel['装货地点']){ ElMessage.warning('请填写或选择装货地点'); return; }
        if(!formModel['卸货地点']){ ElMessage.warning('请填写或选择卸货地点'); return; }
        if(!formModel['承运公司']){ ElMessage.warning('请填写或选择承运公司'); return; }
        if(!formModel['提货车辆']){ ElMessage.warning('请填写提货车辆车牌号'); return; }
        if(!formModel['司机']){ ElMessage.warning('请填写司机姓名'); return; }
        if(!formModel['司机联系电话']){ ElMessage.warning('请填写司机联系电话'); return; }
        if(!formLineRows.value.length){ ElMessage.warning('请至少添加一条物料明细'); return; }
        const badMat = formLineRows.value.some(r=> !r['物料信息']);
        if(badMat){ ElMessage.warning('明细行请选择物料信息'); return; }
        const badQty = formLineRows.value.some(r=> !(Number(r['数量'])>0));
        if(badQty){ ElMessage.warning('物料数量必须大于 0'); return; }
        formVisible.value=false;
        ElMessage.success(formMode.value==='add'?'单据已创建':'单据已更新');
        return;
      }
      if(pageId.value==='lg-waybill'){
        if(!formModel['关联发货单']){ ElMessage.warning('请选择关联发货单'); return; }
        if(!formModel['配送方式']){ ElMessage.warning('请选择配送方式'); return; }
        formVisible.value=false;
        ElMessage.success(formMode.value==='add'?'运单创建成功':'运单已更新');
        return;
      }
      if(pageId.value==='lg-dispatch'){
        if(!formModel['申请部门']){ ElMessage.warning('请选择申请部门'); return; }
        if(!formModel['申请人']){ ElMessage.warning('请填写申请人'); return; }
        if(!formModel['用车类型']){ ElMessage.warning('请选择用车类型'); return; }
        if(formModel['用车类型']==='其他' && !String(formModel['用车类型其他']||'').trim()){ ElMessage.warning('请填写其他用车类型说明'); return; }
        const vehicleType = formModel['用车类型']==='其他' ? String(formModel['用车类型其他']).trim() : formModel['用车类型'];
        const whBiz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
        if(!whBiz){ ElMessage.warning('请选择关联仓储业务'); return; }
        const whBizOpts = whBizTypesForVehicle(formModel['用车类型']==='其他' ? '其他' : formModel['用车类型']);
        if(!whBizOpts.includes(whBiz)){ ElMessage.warning('关联仓储业务与用车类型不匹配，请重新选择'); return; }
        if(!formModel['车型要求']){ ElMessage.warning('请选择车型要求'); return; }
        if(!formModel['是否带托盘']){ ElMessage.warning('请选择是否带托盘'); return; }
        if(!formModel['装货地点']){ ElMessage.warning('请填写装货地点与卸货地点'); return; }
        if(!formModel['卸货地点']){ ElMessage.warning('请填写装货地点与卸货地点'); return; }
        if(!formModel['计划装车时间']){ ElMessage.warning('请选择计划装车时间'); return; }
        if(formModel['要求送达时间'] && formModel['计划装车时间'] && formModel['要求送达时间'] < formModel['计划装车时间']){
          ElMessage.warning('要求送达时间不得早于计划装车时间'); return;
        }
        if(!formLineRows.value.length){ ElMessage.warning('请至少添加一行派车物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请完善物料明细中的物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['需求数量'])>0))){ ElMessage.warning('请输入正确的物料需求数量'); return; }
        if(whBiz==='销售发货' && !formModel['配送类型']){ ElMessage.warning('请选择配送类型'); return; }
        if(dispatchNeedsOrderNo()){
          const needType = dispatchOrderTypeForBiz(whBiz);
          if(!formModel['订单类型'] || formModel['订单类型']==='无'){ ElMessage.warning('请选择订单类型'); return; }
          if(needType && formModel['订单类型']!==needType){ ElMessage.warning('订单类型须为'+needType); return; }
          if(!formModel['订单号']){ ElMessage.warning('请选择订单号'); return; }
        }
        if(whBiz==='销售发货' && formModel['配送类型']==='直发业务（贸易）' && !formModel['采购订单']){ ElMessage.warning('直发业务（贸易）请选择采购订单'); return; }
        const list = ((MOCK['lg-dispatch'] = MOCK['lg-dispatch'] || {}).main = (MOCK['lg-dispatch'].main || []));
        const matInfo = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；');
        const qtySum = formLineRows.value.reduce((s,r)=> s + (Number(r['需求数量'])||0), 0);
        const unit = formLineRows.value[0]?.['单位'] || '';
        const orderType = formModel['订单类型']||'';
        const payload = {
          编号: formModel['编号'] && formModel['编号']!=='系统自动生成' ? formModel['编号'] : '',
          日期: formModel['日期']||'',
          申请部门: formModel['申请部门']||'',
          申请人: formModel['申请人']||'',
          用车类型: vehicleType,
          关联仓储业务: whBiz,
          配送类型: whBiz==='销售发货' ? (formModel['配送类型']||'正常业务') : '—',
          订单类型: orderType,
          订单号: (orderType && orderType!=='无') ? (formModel['订单号']||'') : '',
          关联销售备货单: (whBiz==='销售发货' || whBiz==='销售预出货') ? (formModel['关联销售备货单']||'') : '',
          关联销售预出货单: whBiz==='销售发货' ? (formModel['关联销售预出货单']||'') : '',
          前置关联单据: whBiz==='销售退货' ? (formModel['前置关联单据']||'') : '',
          采购订单: (whBiz==='销售发货' && formModel['配送类型']==='直发业务（贸易）') ? (formModel['采购订单']||'') : '',
          合同号: formModel['合同号']||lookupContractNo(orderType, formModel['订单号']),
          车型要求: formModel['车型要求']||'',
          是否带托盘: formModel['是否带托盘']||'否',
          特殊要求: formModel['特殊要求']||'—',
          装货地点: formModel['装货地点']||'',
          装货联系人: formModel['装货联系人']||'',
          装货联系电话: formModel['装货联系电话']||'',
          卸货地点: formModel['卸货地点']||'',
          卸货联系人: formModel['卸货联系人']||'',
          卸货联系电话: formModel['卸货联系电话']||'',
          计划装车时间: formModel['计划装车时间']||'',
          要求送达时间: formModel['要求送达时间']||'',
          物料信息: matInfo,
          总数量: qtySum + (unit ? (' ' + unit) : ''),
          备注: formModel['备注']||'',
          _lines: formLineRows.value.map(r=>({
            行号: r['行号'] || r._orderLineNo || '',
            _orderLineNo: r._orderLineNo || r['行号'] || '',
            物料信息: r['物料信息']||'',
            需求数量: r['需求数量']||'',
            计划件数: r['计划件数'] != null && r['计划件数'] !== '' ? r['计划件数'] : '',
            已拆数量: r['已拆数量']||'0',
            已拆未签收数量: r['已拆未签收数量']||'0',
            已签收数量: r['已签收数量']||'0',
            未拆数量: r['未拆数量'] || r['需求数量'] || '0',
            '体积(长*宽*高)': r['体积(长*宽*高)']||'',
            单位: r['单位']||'',
            行备注: r['行备注']||''
          }))
        };
        if(formMode.value==='add'){
          const d = new Date();
          const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          const seq = list.filter(r=> String(r['编号']||'').startsWith('PCSQ'+ymd)).length + 1;
          payload.id = String(list.length+1);
          payload.编号 = 'PCSQ' + ymd + String(seq).padStart(4,'0');
          payload.关联发货单 = '—';
          payload.关联运单 = '—';
          payload.审核状态 = '待审核';
          payload.状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r['编号']===formModel['编号']);
          if(cur){
            Object.assign(cur, payload, { 编号: cur['编号'], 审核状态: cur['审核状态'], 状态: cur['状态'], 关联发货单: cur['关联发货单'], 关联运单: cur['关联运单'] });
            delete cur['仓库业务类型'];
          }
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success('派车申请单保存成功');
        return;
      }
      if(pageId.value==='lg-ship'){
        if(formMode.value==='add'){ ElMessage.warning('发货单不支持手工新增，请从派车申请单拆分生成'); return; }
        if(!formLineRows.value.length){ ElMessage.warning('请至少添加一行发货物料明细'); return; }
        if(formLineRows.value.some(r=> !String(r['批号']||'').trim())){ ElMessage.warning('请输入物料批号'); return; }
        if(formLineRows.value.some(r=> !(Number(r['发货数量'])>0))){ ElMessage.warning('发货数量必须大于 0'); return; }
        const list = ((MOCK['lg-ship'] = MOCK['lg-ship'] || {}).main = (MOCK['lg-ship'].main || []));
        const cur = list.find(r=> r['发货单号']===formModel['发货单号'] || r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑发货单'); return; }
        if(cur['状态']!=='待调度'){ ElMessage.warning('仅待调度状态的发货单可编辑修改'); return; }
        const src = findDispatchByNo(cur['来源派车单号']);
        const oldByMat = new Map();
        (cur._lines || []).forEach(l=>{
          const key = codeOf(l['物料信息']) || l['物料信息'];
          oldByMat.set(key, (oldByMat.get(key) || 0) + shipLineQty(l));
        });
        const newByMat = new Map();
        for(const r of formLineRows.value){
          const key = codeOf(r['物料信息']) || r['物料信息'];
          newByMat.set(key, (newByMat.get(key) || 0) + (Number(r['发货数量'])||0));
        }
        for(const [key, newQty] of newByMat.entries()){
          const dLine = (src && (src._lines||[]).find(l=> (codeOf(l['物料信息'])||l['物料信息'])===key)) || null;
          const demand = dLine ? Number(dLine['需求数量'])||0 : 0;
          const splitNow = dLine ? Number(dLine['已拆数量'])||0 : 0;
          const oldQty = oldByMat.get(key) || 0;
          const max = demand - (splitNow - oldQty);
          if(newQty > max){
            ElMessage.warning('物料【'+(dLine && dLine['物料信息'] || key)+'】修改后发货总量超过派车申请单剩余可用量 (最大可填 '+max+')');
            return;
          }
        }
        const matInfo = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；');
        const qtySum = formLineRows.value.reduce((s,r)=> s + (Number(r['发货数量'])||0), 0);
        const unit = formLineRows.value[0]?.['单位'] || '';
        Object.assign(cur, {
          物料信息: matInfo,
          发货数量: String(qtySum) + (unit ? (' ' + unit) : ''),
          _lines: formLineRows.value.map(r=>{
            const qty = Number(r['发货数量'])||0;
            const signed = shipLineSigned(r);
            return {
              行号: r['行号'] || r._rowNo || '',
              物料信息: r['物料信息']||'',
              发货数量: String(r['发货数量']||''),
              已签收数量: r['已签收数量']||'—',
              未签收数量: String(Math.max(0, qty - signed)),
              '体积(长*宽*高)': r['体积(长*宽*高)']||'',
              单位: r['单位']||'',
              批号: String(r['批号']||'').trim(),
              行备注: r['行备注']||''
            };
          })
        });
        refreshDispatchProgress(src);
        formVisible.value=false;
        bumpStore();
        ElMessage.success('发货单修改成功，已同步回算更新派车申请单拆分数量');
        return;
      }
      if(pageId.value==='wwpo'){
        if(!formModel['委外类型']){ ElMessage.warning('请选择委外类型'); return; }
        if(!formModel['供应商编码']){ ElMessage.warning('请选择加工厂/供应商'); return; }
        if(!formModel['采购部门']){ ElMessage.warning('请选择采购部门'); return; }
        if(!formModel['采购员']){ ElMessage.warning('请选择采购员'); return; }
        if(!formModel['订单日期']){ ElMessage.warning('请选择订单日期'); return; }
        if(!formModel['预计交货日期']){ ElMessage.warning('请选择预计交货日期'); return; }
        if(formModel['预计交货日期'] < formModel['订单日期']){ ElMessage.warning('预计交货日期不能早于订单日期'); return; }
        if(!formLineRows.value.length){ ElMessage.warning('请添加至少一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须大于0'); return; }
        if(formLineRows.value.some(r=>{
          const pcs = String(r['计划件数'] ?? '').trim();
          if(!pcs || pcs==='—') return false;
          return !(Number.isInteger(Number(pcs)) && Number(pcs)>0);
        })){ ElMessage.warning('计划件数须为正整数或不填'); return; }
        const list = ((MOCK.wwpo = MOCK.wwpo || {}).main = (MOCK.wwpo.main || []));
        const lines = formLineRows.value.map((r,i)=>{
          const plan = Number(r['计划数量'])||0;
          const old = (formMode.value==='edit' && formModel._editId) ? ((list.find(x=> x.id===formModel._editId)||{})._lines||[])[i] : null;
          const doneQty = old ? (Number(old['已出/入库数量'] ?? old['已出/收数量'])||0) : 0;
          let lineSt = '待执行';
          if(old && old['行状态']==='已关闭') lineSt = '已关闭';
          else if(doneQty>0 && doneQty<plan) lineSt = '执行中';
          else if(doneQty>=plan && plan>0) lineSt = '已完成';
          const pcsRaw = String(r['计划件数'] ?? '').trim();
          return {
            行号: r['行号'] || erpLineNo(i+1),
            物料编码: codeOf(r['物料信息']),
            物料信息: r['物料信息']||matInfoText(r['物料信息']),
            采购单位: r['采购单位']||matUnit(r['物料信息'],'po'),
            计划件数: (!pcsRaw || pcsRaw==='—') ? '' : pcsRaw,
            计划数量: String(plan),
            '已出/入库数量': String(doneQty),
            '未出/入库数量': String(Math.max(0, plan - doneQty)),
            行状态: lineSt,
            备注: r['备注']||'—'
          };
        });
        const payload = {
          委外订单号: formModel['委外订单号']||'',
          订单状态: '待执行',
          委外类型: formModel['委外类型']||'',
          供应商编码: formModel['供应商编码']||'',
          供应商名称: formModel['供应商名称']||'',
          合同号: formModel['合同号']||'',
          采购部门: formModel['采购部门']||'',
          采购员: formModel['采购员']||'',
          订单日期: formModel['订单日期']||'',
          预计交货日期: formModel['预计交货日期']||'',
          备注: formModel['备注']||'—',
          _lines: lines
        };
        syncWwpoStatusFromLines(payload);
        if(formMode.value==='add'){
          payload.id = 'wwpo-' + Date.now();
          payload.委外订单号 = nextBizNo('WWDD','wwpo','委外订单号');
          payload.订单状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑委外加工订单'); return; }
          if(!canEditWwpo(cur)){
            ElMessage.warning('仅「待执行」状态的委外加工订单可编辑'); return;
          }
          Object.assign(cur, payload, { id: cur.id, 委外订单号: cur['委外订单号'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success('委外加工订单保存成功');
        return;
      }
      if(pageId.value===LAB_INSP_SCHEME){ saveLabInspSchemeForm(); return; }
      if(isDjSchemePage()){ saveDjSchemeForm(); return; }
      if(isDjPlanPage()){ saveDjPlanForm(); return; }
      if(pageId.value===WJ_ORDER){ saveWjOrderForm(); return; }
      if(pageId.value===LAB_INSP_PLAN){ saveLabInspPlanForm(); return; }
      if(isLabCountPage()){ saveLabCountScanForm(); return; }
      if(isLabRgIoPage()){ saveLabRgIoForm(); return; }
      if(pageId.value===LAB_PREP){ saveLabPrepForm(); return; }
      if(pageId.value===LAB_CALIB){ saveLabCalibForm(); return; }
      if(pageId.value==='wh-insp-scheme'){
        const code = String(formModel['巡检方案编码']||'').trim();
        const name = String(formModel['巡检方案名称']||'').trim();
        if(!name){ ElMessage.warning('请输入巡检方案名称'); return; }
        const locs = formLineRows.value || [];
        if(!locs.length){ ElMessage.warning('请至少添加一个关联仓库'); return; }
        const cycleN = String(formModel['执行周期']||'').trim();
        const cycleU = formModel['执行周期单位'] || '小时';
        const warnN = String(formModel['提前提醒']||'').trim();
        const warnU = formModel['提前提醒单位'] || '分钟';
        if(!cycleN || !(Number(cycleN)>0)){ ElMessage.warning('请输入正确的周期与提醒数值'); return; }
        if(!formModel['计划开始时间']){ ElMessage.warning('请选择计划开始时间'); return; }
        if(!warnN || !(Number(warnN)>0)){ ElMessage.warning('请输入正确的周期与提醒数值'); return; }
        const list = ((MOCK['wh-insp-scheme'] = MOCK['wh-insp-scheme'] || {}).main = (MOCK['wh-insp-scheme'].main || []));
        const autoCode = code || ('XJFA-' + new Date().toISOString().slice(0,7).replace('-','') + '-' + String(list.length+1).padStart(3,'0'));
        if(list.some(r=> r['巡检方案编码']===autoCode && r.id!==formModel._editId)){ ElMessage.warning('巡检方案编码已存在，请重新输入'); return; }
        if(list.some(r=> r['巡检方案名称']===name && r.id!==formModel._editId)){ ElMessage.warning('巡检方案名称已存在，请修改'); return; }
        const oldRow = (formMode.value==='edit' && formModel._editId) ? list.find(r=> r.id===formModel._editId) : null;
        const oldLocs = oldRow ? (oldRow._locs||[]) : [];
        const payload = {
          巡检方案编码: autoCode,
          巡检方案名称: name,
          内容描述: formModel['内容描述']||'',
          执行周期: cycleN + cycleU,
          计划开始时间: formModel['计划开始时间']||'',
          提前提醒: warnN + warnU,
          循环方式: formModel['循环方式']||'多次',
          执行条件: formModel['执行条件']||'按定时间固定推移',
          表单名称: formModel['表单名称']||'',
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
          _locs: locs.map(l=>{
            const no = l['仓库编号'] || '';
            const old = oldLocs.find(o=> o['仓库编号']===no) || {};
            return {
              仓库编号: no,
              仓库名称: l['仓库名称']||'',
              仓库类型: l['仓库类型']||inspWhTypeOf(l['仓库名称']),
              负责人: l['负责人']||'—',
              备注: l['备注']||'—',
              最新一次计划开始时间: old['最新一次计划开始时间'] || '—',
              最新一次计划完成时间: old['最新一次计划完成时间'] || '—',
              下次计划开始时间: old['下次计划开始时间'] || '—',
              下次计划创建时间: old['下次计划创建时间'] || '—'
            };
          })
        };
        if(formMode.value==='add'){
          const d = new Date();
          const pad = n => String(n).padStart(2,'0');
          payload.id = 'ins-' + Date.now();
          payload.创建人 = '张三';
          payload.创建时间 = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(cur) Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(formMode.value==='add' ? '巡检方案创建成功' : '巡检方案修改成功');
        return;
      }
      if(pageId.value==='wh-insp-plan'){
        if(formMode.value==='add' || formMode.value==='copy'){
          if(!formModel['巡检方案名称']){ ElMessage.warning('请选择巡检方案'); return; }
          if(!formModel['目标仓库']){ ElMessage.warning('请选择目标仓库'); return; }
        }
        if(!formModel['计划时间']){ ElMessage.warning('请选择计划时间'); return; }
        if(formMode.value!=='edit'){
          const pt = new Date(String(formModel['计划时间']).replace(/-/g,'/'));
          if(!Number.isNaN(pt.getTime()) && pt.getTime() < Date.now()-60000){
            ElMessage.warning('计划时间不能早于当前时间'); return;
          }
        }
        const list = ((MOCK['wh-insp-plan'] = MOCK['wh-insp-plan'] || {}).tab1 = (MOCK['wh-insp-plan'].tab1 || []));
        const payload = {
          计划状态: '待执行',
          巡检方案名称: formModel['巡检方案名称']||'',
          巡检方案描述: formModel['巡检方案描述']||formModel['内容描述']||'',
          仓库编号: formModel['仓库编号']||'',
          仓库名称: formModel['仓库名称'] || formModel['目标仓库'] || '',
          仓库类型: formModel['仓库类型']||'',
          负责人: formModel['负责人']||'—',
          计划时间: formModel['计划时间']||'',
          逾期时长: '—',
          逾期状态: '正常',
          是否影响后续: formModel['是否影响后续']||'临时计划，不更新',
          备注: formModel['备注']||'—'
        };
        if(formMode.value==='add' || formMode.value==='copy'){
          const d = new Date();
          const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          payload.id = 'inp-' + Date.now();
          payload.计划单号 = 'XJJH-' + ymd + '-' + String(list.length+1).padStart(3,'0');
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['计划单号']===formModel['计划单号']);
          if(cur) Object.assign(cur, {
            计划时间: payload.计划时间,
            是否影响后续: payload.是否影响后续,
            备注: payload.备注
          });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(formMode.value==='add' || formMode.value==='copy' ? '巡检计划创建成功' : '巡检计划修改成功');
        return;
      }
      if(pageId.value==='wh-so-ship'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!String(formModel['关联销售订单']||'').trim()){ ElMessage.warning('请选择关联销售订单'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须大于 0'); return; }
        const seen = new Set();
        for(const r of formLineRows.value){
          const key = codeOf(r['物料信息']) + '|' + String(r['批号']||'').trim();
          if(seen.has(key)){ ElMessage.warning('同一物料+批号不可重复添加'); return; }
          seen.add(key);
        }
        const stock = String(formModel['关联销售备货单']||'').trim();
        const so = String(formModel['关联销售订单']||'').trim();
        if(stock && stock!=='—' && so){
          const mapped = stockSoMap(codeOf(stock));
          if(codeOf(mapped) && codeOf(so) && codeOf(mapped)!==codeOf(so)){
            ElMessage.warning('销售订单须与备货单上游订单一致');
            return;
          }
        }
        const lots = ((MOCK['serial-arch']||{}).main||[]);
        const over = formLineRows.value.find(r=>{
          const lot = String(r['批号']||'').trim();
          if(!lot || lot==='—') return false;
          const hit = lots.find(s=> s['物料批号']===lot && s['库存状态']==='仓库' && s['使用状态']==='在用');
          return hit && Number(r['计划数量']) > Number(hit['当前数量']);
        });
        if(over){ ElMessage.warning('计划数量不能超过批号库内可用量'); return; }
        const list = ((MOCK['wh-so-ship'] = MOCK['wh-so-ship'] || {}).tab1 = (MOCK['wh-so-ship'].tab1 || []));
        const dash = v => (v && String(v).trim() && String(v).trim()!=='—') ? String(v).trim() : '—';
        const matSummary = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const payload = {
          单据类型: formModel['单据类型']||'标准发货',
          计划执行日期: formModel['计划执行日期']||'',
          关联销售订单: formModel['关联销售订单']||'',
          客户名称: formModel['客户名称']||'',
          关联销售预出货单: dash(formModel['关联销售预出货单']),
          关联销售备货单: dash(formModel['关联销售备货单']),
          ERP单据号: dash(formModel['ERP单据号']),
          备注: dash(formModel['备注']),
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(formModel['司机电话']),
          司机身份证号: dash(formModel['司机身份证号']),
          物料信息: matSummary,
          _lines: formLineRows.value.map((r,i)=> ({
            ...r,
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            批号: String(r['批号']||'').trim() || '—',
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.000',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(3)
          }))
        };
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          payload.id = 'xsfh-' + Date.now();
          payload.单号 = nextBizNo('XSFH','wh-so-ship','单号');
          payload.单据状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑销售发货通知单'); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '销售发货通知单创建成功' : '销售发货通知单修改成功');
        return;
      }
      if(pageId.value==='wh-so-ret'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!String(formModel['关联销售订单']||'').trim()){ ElMessage.warning('请选择关联销售订单'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须大于 0'); return; }
        const seen = new Set();
        for(const r of formLineRows.value){
          const key = codeOf(r['物料信息']) + '|' + String(r['批号']||'').trim();
          if(seen.has(key)){ ElMessage.warning('同一物料+批号不可重复添加'); return; }
          seen.add(key);
        }
        const list = ((MOCK['wh-so-ret'] = MOCK['wh-so-ret'] || {}).tab1 = (MOCK['wh-so-ret'].tab1 || []));
        const dash = v => (v && String(v).trim() && String(v).trim()!=='—') ? String(v).trim() : '—';
        const matSummary = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const payload = {
          单据类型: formModel['单据类型']||'标准退货',
          计划执行日期: formModel['计划执行日期']||'',
          关联销售订单: formModel['关联销售订单']||'',
          客户名称: formModel['客户名称']||'',
          关联销售出库单: dash(formModel['关联销售出库单']),
          退货原因: dash(formModel['退货原因']),
          ERP单据号: dash(formModel['ERP单据号']),
          备注: dash(formModel['备注']),
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(formModel['司机电话']),
          司机身份证号: dash(formModel['司机身份证号']),
          物料信息: matSummary,
          _lines: formLineRows.value.map((r,i)=> ({
            ...r,
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            批号: String(r['批号']||'').trim() || '—',
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.000',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(3)
          }))
        };
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          payload.id = 'xsth-' + Date.now();
          payload.单号 = nextBizNo('XSTH','wh-so-ret','单号');
          payload.单据状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑销售退货通知单'); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '销售退货通知单创建成功' : '销售退货通知单修改成功');
        return;
      }
      if(pageId.value==='wh-so-preout'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!String(formModel['关联销售订单']||'').trim()){ ElMessage.warning('请选择关联销售订单'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须大于 0'); return; }
        const seen = new Set();
        for(const r of formLineRows.value){
          const key = codeOf(r['物料信息']) + '|' + String(r['批号']||'').trim();
          if(seen.has(key)){ ElMessage.warning('同一物料+批号不可重复添加'); return; }
          seen.add(key);
        }
        const lots = ((MOCK['serial-arch']||{}).main||[]);
        const over = formLineRows.value.find(r=>{
          const lot = String(r['批号']||'').trim();
          if(!lot || lot==='—') return false;
          const hit = lots.find(s=> s['物料批号']===lot && s['库存状态']==='仓库' && s['使用状态']==='在用');
          return hit && Number(r['计划数量']) > Number(hit['当前数量']);
        });
        if(over){ ElMessage.warning('计划数量不能超过批号库内可用量'); return; }
        const list = ((MOCK['wh-so-preout'] = MOCK['wh-so-preout'] || {}).tab1 = (MOCK['wh-so-preout'].tab1 || []));
        const dash = v => (v && String(v).trim() && String(v).trim()!=='—') ? String(v).trim() : '—';
        const matSummary = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const payload = {
          单据类型: formModel['单据类型']||'标准预出货',
          计划执行日期: formModel['计划执行日期']||'',
          关联销售订单: formModel['关联销售订单']||'',
          客户名称: formModel['客户名称']||'',
          关联备货通知单: dash(formModel['关联备货通知单']),
          ERP单据号: dash(formModel['ERP单据号']),
          备注: dash(formModel['备注']),
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(formModel['司机电话']),
          司机身份证号: dash(formModel['司机身份证号']),
          物料信息: matSummary,
          _lines: formLineRows.value.map((r,i)=> ({
            ...r,
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            批号: String(r['批号']||'').trim() || '—',
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.000',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(3)
          }))
        };
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          payload.id = 'ysyc-' + Date.now();
          payload.单号 = nextBizNo('XSYC','wh-so-preout','单号');
          payload.单据状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑销售预出货通知单'); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '销售预出货通知单创建成功' : '销售预出货通知单修改成功');
        return;
      }
      if(pageId.value==='wh-so-prep'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['计划日期']){ ElMessage.warning('请选择计划日期'); return; }
        if(!formModel['物料信息']){ ElMessage.warning('请选择物料信息'); return; }
        if(!(Number(formModel['备货数量'])>0)){ ElMessage.warning('备货数量必须大于 0'); return; }
        const list = ((MOCK['wh-so-prep'] = MOCK['wh-so-prep'] || {}).main = (MOCK['wh-so-prep'].main || []));
        const qty = Number(formModel['备货数量']).toFixed(3);
        const payload = {
          单据类型: formModel['单据类型']||'正常备货',
          计划日期: formModel['计划日期']||'',
          关联销售订单: formModel['关联销售订单']||'',
          客户名称: formModel['客户名称']||'',
          物料信息: formModel['物料信息']||'',
          备货数量: qty,
          单位: formModel['单位']||'吨',
          订单要求: formModel['订单要求']||'—',
          备注: formModel['备注']||'—'
        };
        if(formMode.value==='add' || formMode.value==='copy'){
          const d = new Date();
          const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
          payload.id = 'bh-' + Date.now();
          payload.备货通知单号 = nextBizNo('BHT','wh-so-prep','备货通知单号');
          payload.备货状态 = '待执行';
          payload.已备数量 = '0.000';
          payload.制单人 = '张三';
          payload.制单时间 = stamp;
          payload._pickLines = [];
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['备货通知单号']===formModel['备货通知单号']);
          if(!cur){ ElMessage.warning('未找到待编辑备货通知单'); return; }
          if(cur['备货状态']!=='待执行'){ ElMessage.warning('仅待执行状态可编辑'); return; }
          Object.assign(cur, payload, {
            备货通知单号: cur['备货通知单号'],
            备货状态: cur['备货状态'],
            已备数量: cur['已备数量']||'0.000',
            制单人: cur['制单人']||'张三',
            制单时间: cur['制单时间'],
            _pickLines: cur._pickLines||[]
          });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(formMode.value==='add'?'备货通知单新增成功':'备货通知单保存成功');
        return;
      }
      if(pageId.value==='lg-carrier-evt'){
        if(!String(formModel['承运商编码']||'').trim()){ ElMessage.warning('请选择承运商'); return; }
        if(!formModel['事件大类']){ ElMessage.warning('请选择事件大类'); return; }
        if(!formModel['事件小类']){ ElMessage.warning('请选择事件小类'); return; }
        if(!formModel['事件等级']){ ElMessage.warning('请选择事件等级'); return; }
        if(!formModel['发生日期']){ ElMessage.warning('请选择发生日期'); return; }
        if(!String(formModel['事件描述']||'').trim()){ ElMessage.warning('请填写事件描述'); return; }
        if(!formModel['初步责任判定']){ ElMessage.warning('请选择初步责任判定'); return; }
        const lossRaw = String(formModel['损失预估(元)']||'').trim();
        if(lossRaw && lossRaw!=='—' && !(Number(lossRaw)>=0)){
          ElMessage.warning('损失预估必须为有效正数金额'); return;
        }
        const list = ((MOCK['lg-carrier-evt'] = MOCK['lg-carrier-evt'] || {}).main = (MOCK['lg-carrier-evt'].main || []));
        const dash = v => (v && String(v).trim()) ? String(v).trim() : '—';
        const loss = (!lossRaw || lossRaw==='—') ? '—' : Number(lossRaw).toFixed(2);
        const result = dash(formModel['处理结果']);
        const stamp = nowStamp();
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        let handleStatus = isAdd ? '待处理' : (formModel['处理状态'] || '待处理');
        if(!isAdd && result!=='—' && handleStatus==='待处理') handleStatus = '处理中';
        const payload = {
          承运商编码: String(formModel['承运商编码']||'').trim(),
          承运商名称: formModel['承运商名称']||'',
          事件大类: formModel['事件大类']||'',
          事件小类: formModel['事件小类']||'',
          事件等级: formModel['事件等级']||'',
          初步责任判定: formModel['初步责任判定']||'',
          关联运单: dash(formModel['关联运单']),
          预计延迟时间: dash(formModel['预计延迟时间']),
          '损失预估(元)': loss,
          事件描述: String(formModel['事件描述']||'').trim(),
          发生日期: formModel['发生日期']||'',
          处理状态: handleStatus,
          处理结果: result,
          备注: dash(formModel['备注'])
        };
        if(isAdd){
          const d = new Date();
          const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          payload.id = 'cev-' + Date.now();
          payload.事件编号 = 'EV' + ymd + String(list.length + 1).padStart(4,'0');
          payload.处理人 = '—';
          payload.处理时间 = '—';
          payload.创建人 = '张三';
          payload.创建时间 = stamp;
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['事件编号']===formModel['事件编号']);
          if(!cur){ ElMessage.warning('未找到待编辑承运商事件'); return; }
          if(cur['处理状态']==='已关闭'){ ElMessage.warning('已关闭事件不可编辑'); return; }
          const resultChanged = result!=='—' && result!==(cur['处理结果']||'—');
          Object.assign(cur, payload, {
            id: cur.id,
            事件编号: cur['事件编号'],
            创建人: cur['创建人'],
            创建时间: cur['创建时间'],
            处理人: resultChanged ? '张三' : (cur['处理人']||'—'),
            处理时间: resultChanged ? stamp : (cur['处理时间']||'—')
          });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '承运商事件已新增' : '承运商事件已保存');
        return;
      }
      if(pageId.value==='wh-po-in'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['关联采购订单']){ ElMessage.warning('请选择关联采购订单'); return; }
        if(!formModel['供应商名称']){ ElMessage.warning('请选择供应商名称'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请完善物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('请填写计划数量'); return; }
        if(!assertPoInLineMatLotUnique(formLineRows.value)) return;
        const phone = String(formModel['司机电话']||'').trim();
        if(phone && phone!=='—' && !/^1\d{10}$/.test(phone)){
          ElMessage.warning('请输入正确的 11 位司机手机号'); return;
        }
        const idno = String(formModel['司机身份证号']||'').trim();
        if(idno && idno!=='—' && !/^\d{17}[\dXx]$/.test(idno)){
          ElMessage.warning('请输入合法的 18 位司机身份证号码'); return;
        }
        const dash = v => (v && String(v).trim()) ? String(v).trim() : '—';
        const list = ((MOCK['wh-po-in'] = MOCK['wh-po-in'] || {}).tab1 = (MOCK['wh-po-in'].tab1 || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(!assertShipNoticeUnique(formModel['关联发货单'], {
          exclude: isAdd ? null : { id: formModel._editId, 单号: formModel['单号'] }
        })) return;
        const matInfo = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const noticeCtx = { 关联发货单: formModel['关联发货单'], 关联采购订单: formModel['关联采购订单'] };
        const savedLines = assignNoticeSplitLineNos(alignNoticeDetailLinesFromShip(noticeCtx, formLineRows.value), noticeCtx)
          .map((r,i)=>({ ...r, _i: i+1 }));
        const payload = {
          单据状态: isAdd ? '待执行' : (formModel['单据状态'] || '待执行'),
          单据类型: formModel['单据类型']||'',
          计划执行日期: formModel['计划执行日期']||'',
          物料信息: matInfo,
          备注: dash(formModel['备注']),
          关联采购订单: formModel['关联采购订单']||'',
          供应商名称: formModel['供应商名称']||'',
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          包装规格: dash(formModel['包装规格']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(phone),
          司机身份证号: dash(idno),
          _lines: savedLines
        };
        let savedNo = '';
        if(isAdd){
          const d = new Date();
          const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          const sameDay = list.filter(r=> String(r['单号']||'').startsWith('CGST'+ymd));
          payload.id = 'cgst-' + Date.now();
          payload.单号 = 'CGST' + ymd + String(sameDay.length + 1).padStart(4,'0');
          savedNo = payload.单号;
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑收料通知单'); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          savedNo = cur['单号'];
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        syncQcLedgerFromPoInNotice(savedNo, payload._lines);
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '采购收料通知单已新增' : '采购收料通知单已保存');
        return;
      }
      if(pageId.value==='wh-po-ret'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['关联采购订单']){ ElMessage.warning('请选择关联采购订单'); return; }
        if(!formModel['供应商名称']){ ElMessage.warning('请选择供应商名称'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请完善物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须为大于 0 的正数'); return; }
        if(formLineRows.value.some(r=> isPoRetTankMat(r))){ ElMessage.warning('储罐类液体物料不支持采购退料，请移除后重试'); return; }
        if(!assertPoRetLineMatLotUnique(formLineRows.value)) return;
        const phone = String(formModel['司机电话']||'').trim();
        if(phone && phone!=='—' && !/^1\d{10}$/.test(phone)){
          ElMessage.warning('请输入有效的 11 位司机手机号码'); return;
        }
        const idno = String(formModel['司机身份证号']||'').trim();
        if(idno && idno!=='—' && !/^\d{17}[\dXx]$/.test(idno)){
          ElMessage.warning('请输入有效的 18 位司机身份证号码'); return;
        }
        const dash = v => (v && String(v).trim()) ? String(v).trim() : '—';
        const list = ((MOCK['wh-po-ret'] = MOCK['wh-po-ret'] || {}).tab1 = (MOCK['wh-po-ret'].tab1 || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(!assertShipNoticeUnique(formModel['关联发货单'], {
          exclude: isAdd ? null : { id: formModel._editId, 单号: formModel['单号'] }
        })) return;
        const matInfo = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const noticeCtx = { 关联发货单: formModel['关联发货单'], 关联采购订单: formModel['关联采购订单'] };
        const savedLines = assignNoticeSplitLineNos(alignNoticeDetailLinesFromShip(noticeCtx, formLineRows.value), noticeCtx)
          .map((r,i)=> {
            const ln = normalizePoRetFormLine(r, i+1);
            return {
              ...ln,
              行状态: ln['行状态'] || '待执行',
              批号: ln['批号'] || '—',
              已完成数量: ln['已完成数量'] != null && ln['已完成数量'] !== '' ? ln['已完成数量'] : '0.00',
              未完成数量: ln['未完成数量'] != null && ln['未完成数量'] !== '' ? ln['未完成数量'] : Number(ln['计划数量']||0).toFixed(2),
            };
          });
        const payload = {
          单据状态: isAdd ? '待执行' : (formModel['单据状态'] || '待执行'),
          单据类型: formModel['单据类型']||'',
          计划执行日期: formModel['计划执行日期']||'',
          物料信息: matInfo,
          备注: dash(formModel['备注']),
          关联采购订单: formModel['关联采购订单']||'',
          供应商名称: formModel['供应商名称']||'',
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(phone),
          司机身份证号: dash(idno),
          _lines: savedLines
        };
        if(isAdd){
          const d = new Date();
          const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          const sameDay = list.filter(r=> String(r['单号']||'').startsWith('CGTT'+ymd));
          payload.id = 'cgtt-' + Date.now();
          payload.单号 = 'CGTT' + ymd + String(sameDay.length + 1).padStart(4,'0');
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑采购退料通知单'); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '采购退料通知单创建成功' : '采购退料通知单修改成功');
        return;
      }
      if(isOsPoPage() && (activeTab.value==='tab1' || (tabView.value||{}).name==='tab1')){
        const meta = osNoticeMeta();
        if(!meta){ ElMessage.warning('未知委外页面'); return; }
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['关联委外加工单']){ ElMessage.warning('请选择关联委外加工单'); return; }
        if(!formModel['供应商名称']){ ElMessage.warning('请选择供应商名称'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请完善物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须为大于 0 的正数'); return; }
        if(pageId.value==='wh-os-recv' && !assertPoInLineMatLotUnique(formLineRows.value)) return;
        if(pageId.value==='wh-os-ret-goods' && !assertPoRetLineMatLotUnique(formLineRows.value)) return;
        const phone = String(formModel['司机电话']||'').trim();
        if(phone && phone!=='—' && !/^1\d{10}$/.test(phone)){
          ElMessage.warning('请输入有效的 11 位司机手机号码'); return;
        }
        const idno = String(formModel['司机身份证号']||'').trim();
        if(idno && idno!=='—' && !/^\d{17}[\dXx]$/.test(idno)){
          ElMessage.warning('请输入有效的 18 位司机身份证号码'); return;
        }
        const dash = v => (v && String(v).trim()) ? String(v).trim() : '—';
        const list = ((MOCK[pageId.value] = MOCK[pageId.value] || {}).tab1 = (MOCK[pageId.value].tab1 || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(!assertShipNoticeUnique(formModel['关联发货单'], {
          exclude: isAdd ? null : { id: formModel._editId, 单号: formModel['单号'] }
        })) return;
        const matInfo = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const payload = {
          单据状态: isAdd ? '待执行' : (formModel['单据状态'] || '待执行'),
          单据类型: formModel['单据类型']||'',
          计划执行日期: formModel['计划执行日期']||'',
          物料信息: matInfo,
          备注: dash(formModel['备注']),
          关联委外加工单: formModel['关联委外加工单']||'',
          供应商名称: formModel['供应商名称']||'',
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(phone),
          司机身份证号: dash(idno),
          _lines: (isOsFinishedNoticePage()
            ? finalizeNoticeFormLines(formLineRows.value)
            : formLineRows.value.map((r,i)=> ({
            ...r,
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.00',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(2),
          })))
        };
        if(isAdd){
          const d = new Date();
          const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          const sameDay = list.filter(r=> String(r['单号']||'').startsWith(meta.prefix+ymd));
          payload.id = meta.prefix.toLowerCase() + '-' + Date.now();
          payload.单号 = meta.prefix + ymd + String(sameDay.length + 1).padStart(4,'0');
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑' + meta.label); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (meta.label + '创建成功') : (meta.label + '修改成功'));
        return;
      }
      if(pageId.value==='wh-prod-ret'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!String(formModel['生产领料出库单']||'').trim()){ ElMessage.warning('请选择生产领料出库单'); return; }
        if(!String(formModel['来源线边仓']||'').trim()){ ElMessage.warning('请选择来源线边仓'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须填写大于 0 的正数'); return; }
      }
      if(pageId.value==='wh-prod-in'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['业务类型']){ ElMessage.warning('请选择业务类型'); return; }
        if(!String(formModel['关联生产订单']||'').trim()){ ElMessage.warning('请选择关联生产订单'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须填写大于 0 的正数'); return; }
        if(!assertPoRetLineMatLotUnique(formLineRows.value)) return;
      }
      if(isCsWhPage()){
        const meta = csNoticeMeta();
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!String(formModel['关联销售订单']||'').trim()){ ElMessage.warning('请选择关联销售订单'); return; }
        const phone = String(formModel['司机电话']||'').trim();
        if(phone && phone!=='—' && !/^1\d{10}$/.test(phone)){ ElMessage.warning('请输入有效的 11 位司机手机号码'); return; }
        const idc = String(formModel['司机身份证号']||'').trim();
        if(idc && idc!=='—' && !/^\d{17}[\dXx]$/.test(idc)){ ElMessage.warning('请输入有效的 18 位司机身份证号码'); return; }
        if(formModel['关联运单'] && formModel['关联发货单']){
          const ships = shipsOfWaybill(formModel['关联运单']);
          if(ships.length && !ships.some(s=> String(s['发货单号'])===String(formModel['关联发货单']))){
            ElMessage.warning('关联发货单必须属于所选运单'); return;
          }
        }
        if(!(formLineRows.value||[]).length){ ElMessage.warning((meta && meta.emptyTip) || '请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请完善物料明细中的物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('请输入正确的计划数量'); return; }
        const badPcs = formLineRows.value.find(r=>{
          const mode = String(r['管理方式']||'');
          if(/计数|罐区/.test(mode)) return false;
          return !(Number(r['计划件数'])>0);
        });
        if(badPcs){ ElMessage.warning('条码管理物料请输入有效的计划件数'); return; }
        const pid = pageId.value;
        const list = ((MOCK[pid] = MOCK[pid] || {}).tab1 = (MOCK[pid].tab1 || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        const dash = v => (v && String(v).trim()) ? String(v).trim() : '—';
        const soCode = codeOf(formModel['关联销售订单']) || dash(formModel['关联销售订单']);
        const matInfo = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const payload = {
          单据状态: isAdd ? '待执行' : (formModel['单据状态'] || '待执行'),
          单据类型: formModel['单据类型'] || (meta && meta.docType) || '',
          计划执行日期: formModel['计划执行日期']||'',
          物料信息: matInfo,
          备注: dash(formModel['备注']),
          关联销售订单: soCode,
          客户名称: dash(formModel['客户名称']),
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(formModel['司机电话']),
          司机身份证号: dash(formModel['司机身份证号']),
          _lines: formLineRows.value.map((r,i)=> ({
            ...r,
            id: r.id || (`${Date.now()}-l${i+1}`),
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            计划件数: /计数|罐区/.test(String(r['管理方式']||'')) ? '—' : (r['计划件数']||''),
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.000',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(3),
            检验状态: r['检验状态'] || '待检验',
          }))
        };
        const prefix = (meta && meta.prefix) || 'STST';
        if(isAdd){
          const d = new Date();
          const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          const sameDay = list.filter(r=> String(r['单号']||'').startsWith(prefix+ymd));
          payload.id = pid + '-' + Date.now();
          payload.单号 = prefix + ymd + String(sameDay.length + 1).padStart(4,'0');
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑'+(meta && meta.label || '通知单')); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success('保存成功');
        return;
      }
      if(isProdWhPage() && (pageId.value==='wh-prod-issue' || pageId.value==='wh-prod-ret' || pageId.value==='wh-prod-in' || pageId.value==='wh-direct-xfer')){
        if(pageId.value==='wh-direct-xfer'){
          if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
          if(!String(formModel['调出仓库']||'').trim()){ ElMessage.warning('请选择调出仓库'); return; }
          if(!String(formModel['调入仓库']||'').trim()){ ElMessage.warning('请选择调入仓库'); return; }
          if(String(formModel['调出仓库']).trim()===String(formModel['调入仓库']).trim()){
            ElMessage.warning('调出仓库与调入仓库不能相同'); return;
          }
          if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
          if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
          if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须填写大于 0 的正数'); return; }
        }
        if(pageId.value==='wh-prod-issue'){
          if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
          if(!formModel['领料类型']){ ElMessage.warning('请选择领料类型'); return; }
          if(!String(formModel['领至线边仓']||'').trim()){
            ElMessage.warning('请选择领至线边仓'); return;
          }
          if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
          if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
          if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须填写大于 0 的正数'); return; }
          if(formModel['领料类型']==='备品备件领料' && formLineRows.value.some(r=> !/计数/.test(prodIssueLineManageMode(r)))){
            ElMessage.warning('备品备件领料仅可选择计数管理物料'); return;
          }
        }
        const meta = prodAppMeta();
        const pid = pageId.value;
        const list = ((MOCK[pid] = MOCK[pid] || {}).tab1 = (MOCK[pid].tab1 || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        const dash = v => (v && String(v).trim()) ? String(v).trim() : '—';
        const matInfo = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const payload = {
          单据状态: isAdd ? '待执行' : (formModel['单据状态'] || '待执行'),
          单据类型: formModel['单据类型'] || meta.docType,
          计划执行日期: formModel['计划执行日期']||'',
          物料信息: matInfo,
          备注: dash(formModel['备注']),
          _lines: (pageId.value==='wh-prod-in'
            ? finalizeNoticeFormLines(formLineRows.value)
            : formLineRows.value).map((r,i)=> ({
            ...r,
            id: r.id || (`${Date.now()}-l${i+1}`),
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.00',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(2),
          }))
        };
        if(pid==='wh-prod-issue'){
          payload['关联生产订单'] = dash(formModel['关联生产订单'] || formModel['生产订单号']);
          payload['领料类型'] = formModel['领料类型'] || '生产领料';
          payload['领至线边仓'] = formModel['领至线边仓']||'';
        }
        if(pid==='wh-prod-ret'){
          payload['生产领料出库单'] = formModel['生产领料出库单']||'';
          payload['来源线边仓'] = formModel['来源线边仓']||'';
        }
        if(pid==='wh-prod-in'){
          payload['业务类型'] = formModel['业务类型']||'自产完工';
          payload['关联生产订单'] = dash(formModel['关联生产订单']);
          payload['关联销售订单'] = dash(formModel['关联销售订单']);
          payload['客户名称'] = dash(formModel['客户名称']);
        }
        if(pid==='wh-direct-xfer'){
          payload['调出仓库'] = formModel['调出仓库']||'';
          payload['调入仓库'] = formModel['调入仓库']||'';
        }
        if(isAdd){
          const d = new Date();
          const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
          const sameDay = list.filter(r=> String(r['单号']||'').startsWith(meta.prefix+ymd));
          payload.id = meta.idPrefix + Date.now();
          payload.单号 = meta.prefix + ymd + String(sameDay.length + 1).padStart(4,'0');
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑'+meta.label); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (meta.label+'创建成功') : (meta.label+'修改成功'));
        return;
      }
      if(pageId.value==='wh-load'){
        if(!formModel['关联仓库业务']){ ElMessage.warning('请选择关联仓库业务'); return; }
        if(!formModel['关联单号']){ ElMessage.warning('请选择关联业务单据'); return; }
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['计划执行日期']){ ElMessage.warning('请选择计划执行日期'); return; }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少保留一行物料明细'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须填写大于 0 的正数'); return; }
        const phone = String(formModel['司机电话']||'').trim();
        if(phone && !/^1\d{10}$/.test(phone)){ ElMessage.warning('请输入正确的 11 位手机号码'); return; }
        const idCard = String(formModel['司机身份证号']||'').trim();
        if(idCard && !/^\d{17}[\dXx]$/.test(idCard)){ ElMessage.warning('请输入正确的 18 位身份证号码'); return; }
        const list = ((MOCK['wh-load'] = MOCK['wh-load'] || {}).tab1 = (MOCK['wh-load'].tab1 || []));
        const dash = v => (v && String(v).trim() && String(v).trim()!=='—') ? String(v).trim() : '—';
        const matSummary = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const payload = {
          单据类型: formModel['单据类型']||'标准装卸',
          关联仓库业务: formModel['关联仓库业务']||'',
          关联单号: dash(formModel['关联单号']),
          客供信息: dash(formModel['客供信息']),
          计划执行日期: formModel['计划执行日期']||'',
          备注: dash(formModel['备注']),
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          承运商: dash(formModel['承运商']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(formModel['司机电话']),
          司机身份证号: dash(formModel['司机身份证号']),
          物料信息: matSummary,
          _lines: formLineRows.value.map((r,i)=> ({
            ...r,
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.000',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(3)
          }))
        };
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          payload.id = 'zxtt-' + Date.now();
          payload.单号 = nextBizNo('ZXTT','wh-load','单号');
          payload.单据状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑装卸货通知单'); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '装卸货通知单已创建' : '装卸货通知单已保存');
        return;
      }
      if(pageId.value==='wh-other-in'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['入库方向']){ ElMessage.warning('请选择入库方向'); return; }
        if(formModel['入库方向']==='线边仓' && !String(formModel['领至线边仓']||'').trim()){
          ElMessage.warning('请选择领至线边仓'); return;
        }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须大于 0'); return; }
        if(formLineRows.value.some(r=> {
          const mode = String(r['管理方式']||'');
          return mode && mode!=='—' && !mode.includes('条码');
        })){ ElMessage.warning('其他入库仅允许条码管理物料'); return; }
        const list = ((MOCK['wh-other-in'] = MOCK['wh-other-in'] || {}).tab1 = (MOCK['wh-other-in'].tab1 || []));
        const dash = v => (v && String(v).trim() && String(v).trim()!=='—') ? String(v).trim() : '—';
        const matSummary = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const prodRel = (formModel['生产相关']==='是' || formModel['生产相关']===true) ? '是' : '否';
        const payload = {
          单据类型: formModel['单据类型']||'盘盈入库',
          入库方向: formModel['入库方向']||'厂外',
          计划执行日期: formModel['计划执行日期']||'',
          领至线边仓: formModel['入库方向']==='线边仓' ? dash(formModel['领至线边仓']) : '—',
          受益人: dash(formModel['受益人']),
          受益部门: dash(formModel['受益部门']),
          受益项目: dash(formModel['受益项目']),
          生产相关: prodRel,
          备注: dash(formModel['备注']),
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          承运商: dash(formModel['承运商']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(formModel['司机电话']),
          司机身份证号: dash(formModel['司机身份证号']),
          物料信息: matSummary,
          _lines: formLineRows.value.map((r,i)=> ({
            ...r,
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            管理方式: r['管理方式'] || '条码管理',
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.000',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(3)
          }))
        };
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          payload.id = 'qtst-' + Date.now();
          payload.单号 = nextBizNo('QTST','wh-other-in','单号');
          payload.单据状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑其他入库通知单'); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '其他入库通知单创建成功' : '其他入库通知单修改成功');
        return;
      }
      if(pageId.value==='wh-other-out'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['出库方向']){ ElMessage.warning('请选择出库方向'); return; }
        if(formModel['出库方向']==='线边仓' && !String(formModel['领至线边仓']||'').trim()){
          ElMessage.warning('请选择领至线边仓'); return;
        }
        if(!(formLineRows.value||[]).length){ ElMessage.warning('请至少添加一行物料明细'); return; }
        if(formLineRows.value.some(r=> !r['物料信息'])){ ElMessage.warning('请选择物料信息'); return; }
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('计划数量必须大于 0'); return; }
        if(formLineRows.value.some(r=> {
          const mode = String(r['管理方式']||'');
          return mode && mode!=='—' && !mode.includes('条码');
        })){ ElMessage.warning('其他出库仅允许条码管理物料'); return; }
        const list = ((MOCK['wh-other-out'] = MOCK['wh-other-out'] || {}).tab1 = (MOCK['wh-other-out'].tab1 || []));
        const dash = v => (v && String(v).trim() && String(v).trim()!=='—') ? String(v).trim() : '—';
        const matSummary = formLineRows.value.map(r=> r['物料信息']).filter(Boolean).join('；') || '—';
        const prodRel = (formModel['生产相关']==='是' || formModel['生产相关']===true) ? '是' : '否';
        const payload = {
          单据类型: formModel['单据类型']||'盘亏出库',
          出库方向: formModel['出库方向']||'厂外',
          计划执行日期: formModel['计划执行日期']||'',
          领至线边仓: formModel['出库方向']==='线边仓' ? dash(formModel['领至线边仓']) : '—',
          受益人: dash(formModel['受益人']),
          受益部门: dash(formModel['受益部门']),
          受益项目: dash(formModel['受益项目']),
          生产相关: prodRel,
          备注: dash(formModel['备注']),
          关联运单: dash(formModel['关联运单']),
          关联发货单: dash(formModel['关联发货单']),
          承运商: dash(formModel['承运商']),
          车牌号: dash(formModel['车牌号']),
          车挂号: dash(formModel['车挂号']),
          司机姓名: dash(formModel['司机姓名']),
          司机电话: dash(formModel['司机电话']),
          司机身份证号: dash(formModel['司机身份证号']),
          物料信息: matSummary,
          _lines: formLineRows.value.map((r,i)=> ({
            ...r,
            _i: i+1,
            行状态: r['行状态'] || '待执行',
            管理方式: r['管理方式'] || '条码管理',
            已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0.000',
            未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : Number(r['计划数量']||0).toFixed(3)
          }))
        };
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          payload.id = 'qtck-' + Date.now();
          payload.单号 = nextBizNo('QTCK','wh-other-out','单号');
          payload.单据状态 = '待执行';
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId || r['单号']===formModel['单号']);
          if(!cur){ ElMessage.warning('未找到待编辑其他出库通知单'); return; }
          if(cur['单据状态']!=='待执行'){ ElMessage.warning('仅「待执行」状态可编辑'); return; }
          Object.assign(cur, payload, { id: cur.id, 单号: cur['单号'], 单据状态: cur['单据状态'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '其他出库通知单创建成功' : '其他出库通知单修改成功');
        return;
      }
      if((formLineRows.value||[]).length && (activeFormLineFields.value||[]).some(f=> f.name==='计划数量' && f.required)){
        if(formLineRows.value.some(r=> !(Number(r['计划数量'])>0))){ ElMessage.warning('请填写计划数量'); return; }
      }
      if(pageId.value==='bc-serial-split'){
        const bc = String(formModel['条码号']||'').trim();
        if(!bc){ ElMessage.warning('请先选择需要拆分的原流水码'); return; }
        const cnt = parseInt(formModel['拆出条码个数'], 10);
        const scalar = Number(formModel['拆出条码标量']);
        if(!cnt || cnt < 1){ ElMessage.warning('拆出条码个数必须填写正整数'); return; }
        if(!(scalar > 0)){ ElMessage.warning('拆出条码标量必须填写正数'); return; }
        if(!formBarcodeRows.value.length){ ElMessage.warning('请先点击生成条码生成拆分条码数据'); return; }
        const remain = Number(formModel['拆分后剩余数量']);
        if(!Number.isFinite(remain) || remain < 0){ ElMessage.warning('拆分总数量不可超过原条码可拆分剩余数量，请调整子条码建档数量'); return; }
        const list = ((MOCK['bc-serial-split'] = MOCK['bc-serial-split'] || {}).main = (MOCK['bc-serial-split'].main || []));
        const archList = ((MOCK['serial-arch'] = MOCK['serial-arch'] || {}).main = (MOCK['serial-arch'].main || []));
        const parentSnap = archList.find(r=> r['条码号']===bc) || formLineRows.value[0] || {};
        const parentUse = String(parentSnap['使用状态'] || '在用');
        const parentStock = String(parentSnap['库存状态'] || '初始化');
        const parentQc = String(parentSnap['检验状态'] || '待检验');
        const parentLoc = String(parentSnap['库存位置'] || parentSnap['存储位置'] || '—');
        const matParts = String(formLineRows.value[0]?.['物料信息']|| parentSnap['物料信息'] ||'').split(' / ');
        const splitNo = nextBizNo('CF', 'bc-serial-split', '拆分单号');
        const stamp = nowStamp();
        const lines = formBarcodeRows.value.map(r=>({
          拆分后条码号: r['条码号'],
          建档数量: r['建档数量'],
          物料批号: formLineRows.value[0]?.['物料批号'] || parentSnap['物料批号'] || '—'
        }));
        const splitSum = lines.reduce((s,l)=> s + (Number(l['建档数量'])||0), 0);
        const parentRow = archList.find(r=> r['条码号']===bc);
        if(parentRow){
          parentRow['当前数量'] = String(remain);
          parentRow['剩余数量'] = String(remain);
          if(remain === 0) parentRow['使用状态'] = '报废';
          parentRow['最新操作人'] = '演示用户';
          parentRow['最新操作时间'] = stamp;
        }
        formBarcodeRows.value.forEach(r=>{
          const qty = String(r['建档数量']||'0');
          archList.unshift({
            id: 'sa-split-' + Date.now() + '-' + r['条码号'],
            使用状态: parentUse === '报废' ? '在用' : parentUse,
            库存状态: parentStock,
            检验状态: parentQc,
            库存位置: parentLoc,
            存储位置: parentLoc,
            条码号: r['条码号'],
            包装规格: parentSnap['包装规格'] || formLineRows.value[0]?.['包装规格'] || '—',
            来源单号: splitNo,
            来源条码号: bc,
            物料信息: parentSnap['物料信息'] || formLineRows.value[0]?.['物料信息'] || '—',
            物料批号: parentSnap['物料批号'] || formLineRows.value[0]?.['物料批号'] || '—',
            客户批号: parentSnap['客户批号'] || '—',
            建档数量: qty,
            当前数量: qty,
            剩余数量: qty,
            库存单位: parentSnap['库存单位'] || formLineRows.value[0]?.['库存单位'] || 'KG',
            供应商信息: parentSnap['供应商信息'] || parentSnap['供应商名称'] || formLineRows.value[0]?.['供应商名称'] || '—',
            供应商名称: parentSnap['供应商名称'] || formLineRows.value[0]?.['供应商名称'] || '—',
            生产厂家: parentSnap['生产厂家'] || '—',
            生产日期: parentSnap['生产日期'] || formLineRows.value[0]?.['生产日期'] || '—',
            有效期: parentSnap['有效期'] || '—',
            失效日期: parentSnap['失效日期'] || '—',
            最新操作人: '演示用户',
            最新操作时间: stamp
          });
        });
        list.unshift({
          id: 'cfs-' + Date.now(),
          拆分单号: splitNo,
          主条码号: bc,
          物料编码: matParts[0] || '—',
          物料名称: matParts[1] || '—',
          物料规格: matParts[2] || '—',
          包装规格: formLineRows.value[0]?.['包装规格'] || '—',
          供应商名称: formLineRows.value[0]?.['供应商名称'] || '—',
          物料批号: formLineRows.value[0]?.['物料批号'] || '—',
          生产日期: formLineRows.value[0]?.['生产日期'] || '—',
          库存单位: formLineRows.value[0]?.['库存单位'] || '—',
          本次拆出数量: String(splitSum),
          本次拆分条码个数: String(lines.length),
          拆出后剩余数量: String(remain),
          操作时间: stamp,
          操作人: '演示用户',
          lines
        });
        formVisible.value=false;
        bumpStore();
        ElMessage.success(remain === 0 ? '流水码拆分保存成功；原条码剩余数量已清零，条码自动报废' : '流水码拆分保存成功');
        return;
      }
      if(pageId.value==='bc-serial-merge'){
        const mainBc = String(formModel['条码号（主条码）']||'').trim();
        if(!mainBc){ ElMessage.warning('请先选择合并目标主流水码'); return; }
        if(!formBarcodeRows.value.length){ ElMessage.warning('请至少添加一条需要合并的流水码'); return; }
        const mergedQty = Number(formModel['合并后剩余数量']);
        if(!Number.isFinite(mergedQty) || mergedQty <= 0){ ElMessage.warning('合并计算结果异常，合并后余量必须大于0'); return; }
        const list = ((MOCK['bc-serial-merge'] = MOCK['bc-serial-merge'] || {}).main = (MOCK['bc-serial-merge'].main || []));
        const matParts = String(formLineRows.value[0]?.['物料信息']||'').split(' / ');
        const lines = formBarcodeRows.value.map(r=>({
          被合并条码号: r['条码号'],
          剩余数量: r['剩余数量'],
          库存单位: r['库存单位']
        }));
        list.unshift({
          id: 'cfm-' + Date.now(),
          合并单号: nextBizNo('HB', 'bc-serial-merge', '合并单号'),
          合并后条码号: mainBc,
          物料编码: matParts[0] || '—',
          物料名称: matParts[1] || '—',
          物料规格: matParts[2] || '—',
          包装规格: formLineRows.value[0]?.['包装规格'] || '—',
          供应商名称: formLineRows.value[0]?.['供应商名称'] || '—',
          物料批号: formLineRows.value[0]?.['物料批号'] || '—',
          生产日期: formLineRows.value[0]?.['生产日期'] || '—',
          库存单位: formLineRows.value[0]?.['库存单位'] || '—',
          合并后剩余数量: String(mergedQty),
          操作时间: nowStamp(),
          操作人: '演示用户',
          lines
        });
        formVisible.value=false;
        bumpStore();
        ElMessage.success('流水码合并保存成功；已将所有被合并条码自动报废');
        return;
      }
      if(pageId.value==='bc-scrap-proc'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formModel['产线名称']){ ElMessage.warning('请选择产线名称'); return; }
        if(!formModel['车间名称']){ ElMessage.warning('请选择车间名称'); return; }
        if(!formModel['报废工艺']){ ElMessage.warning('请选择报废工艺'); return; }
        if(!formLineRows.value.length){ ElMessage.warning('请至少新增一行流水明细'); return; }
        if(formLineRows.value.some(r=> !String(r['条码号']||'').trim())){ ElMessage.warning('请填写流水明细中的条码号'); return; }
        const bag = (MOCK['bc-scrap-proc'] = MOCK['bc-scrap-proc'] || {});
        const list = (bag.tab1 = bag.tab1 || []);
        const lines = formLineRows.value.map(r=>({
          条码号: r['条码号'],
          钢瓶编号: r['钢瓶编号']||'—',
          当前工序: r['当前工序']||'—'
        }));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          list.unshift({
            id: 'bfs-' + Date.now(),
            工单号: nextBizNo('BF', 'bc-scrap-proc', '工单号'),
            单据状态: '待执行',
            单据类型: formModel['单据类型'],
            产线名称: formModel['产线名称'],
            车间名称: formModel['车间名称'],
            报废工艺: formModel['报废工艺'],
            计划件数: String(formModel['计划件数']||lines.length),
            计划开工日期: formModel['计划开工日期']||'',
            计划完工日期: formModel['计划完工日期']||'',
            备注: formModel['备注']||'—',
            创建人: '演示用户',
            创建时间: nowStamp(),
            lines
          });
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑单据'); return; }
          Object.assign(cur, {
            单据类型: formModel['单据类型'],
            产线名称: formModel['产线名称'],
            车间名称: formModel['车间名称'],
            报废工艺: formModel['报废工艺'],
            计划件数: String(formModel['计划件数']||lines.length),
            计划开工日期: formModel['计划开工日期']||'',
            计划完工日期: formModel['计划完工日期']||'',
            备注: formModel['备注']||'—',
            lines
          });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '报废处理单已新增' : '报废处理单已保存');
        return;
      }
      if(pageId.value==='bc-freeze'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formLineRows.value.length){ ElMessage.warning('请至少新增一行流水明细'); return; }
        if(formLineRows.value.some(r=> !String(r['条码号']||'').trim())){ ElMessage.warning('请填写流水明细中的条码号'); return; }
        const bag = (MOCK['bc-freeze'] = MOCK['bc-freeze'] || {});
        const list = (bag.tab1 = bag.tab1 || []);
        const lines = formLineRows.value.map(r=>({
          条码号: r['条码号'],
          钢瓶类型: r['钢瓶类型']||'—',
          空满状态: r['空满状态']||'—',
          库存状态: r['库存状态']||'—'
        }));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          list.unshift({
            id: 'bfr-' + Date.now(),
            冻结单号: nextBizNo('DJ', 'bc-freeze', '冻结单号'),
            单据状态: '待执行',
            单据类型: formModel['单据类型'],
            创建方式: formModel['创建方式']||'手动',
            计划件数: String(formModel['计划件数']||lines.length),
            已完成件数: '0',
            制单时间: nowStamp(),
            制单人: '演示用户',
            备注: formModel['备注']||'—',
            lines
          });
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑单据'); return; }
          Object.assign(cur, {
            单据类型: formModel['单据类型'],
            计划件数: String(formModel['计划件数']||lines.length),
            备注: formModel['备注']||'—',
            lines
          });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '异常冻结单已新增' : '异常冻结单已保存');
        return;
      }
      if(pageId.value==='bc-unfreeze'){
        if(!formModel['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
        if(!formLineRows.value.length){ ElMessage.warning('请至少新增一行流水明细'); return; }
        if(formLineRows.value.some(r=> !String(r['条码号']||'').trim())){ ElMessage.warning('请选择流水明细中的冻结中条码'); return; }
        const bag = (MOCK['bc-unfreeze'] = MOCK['bc-unfreeze'] || {});
        const list = (bag.tab1 = bag.tab1 || []);
        const lines = formLineRows.value.map(r=>({
          条码号: r['条码号'],
          钢瓶类型: r['钢瓶类型']||'—',
          空满状态: r['空满状态']||'—',
          库存状态: r['库存状态']||'—'
        }));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(isAdd){
          list.unshift({
            id: 'bun-' + Date.now(),
            解除单号: nextBizNo('JC', 'bc-unfreeze', '解除单号'),
            单据状态: '待执行',
            单据类型: formModel['单据类型'],
            计划件数: String(formModel['计划件数']||lines.length),
            已完成件数: '0',
            制单时间: nowStamp(),
            制单人: '演示用户',
            备注: formModel['备注']||'—',
            lines
          });
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑单据'); return; }
          Object.assign(cur, {
            单据类型: formModel['单据类型'],
            计划件数: String(formModel['计划件数']||lines.length),
            备注: formModel['备注']||'—',
            lines
          });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '冻结解除单已新增' : '冻结解除单已保存');
        return;
      }
      if(pageId.value==='pkg-craft'){
        const code = String(formModel['工艺编码']||'').trim();
        const name = String(formModel['工艺名称']||'').trim();
        const biz = joinDun(formModel['适用业务单据']);
        if(!code){ ElMessage.warning('请填写工艺编码'); return; }
        if(!name){ ElMessage.warning('请填写工艺名称'); return; }
        if(!biz){ ElMessage.warning('请选择适用业务单据'); return; }
        const list = ((MOCK['pkg-craft'] = MOCK['pkg-craft'] || {}).main = (MOCK['pkg-craft'].main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['工艺编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('工艺编码已存在，请重新输入'); return; }
        if(list.some(r=> r['工艺名称']===name && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('工艺名称已存在，请重新输入'); return; }
        const payload = {
          工艺编码: code,
          工艺名称: name,
          适用业务单据: biz,
          适用单据类型: joinDun(formModel['适用单据类型']) || '—',
          适用物料: (()=>{
            const labels = (formLineRows.value||[]).map(r=>{
              const info = String(r['物料信息']||'').trim();
              if(!info || info==='—') return '';
              const parts = info.split(' / ');
              return (parts[0] && parts[1]) ? (parts[0] + ' / ' + parts[1]) : info;
            }).filter(Boolean);
            return labels.length ? labels.join('、') : '—';
          })(),
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'pc-' + Date.now();
          payload.创建人 = '张三';
          payload.创建时间 = nowStamp();
          payload._craft = { nodes: [], edges: [] };
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑包材工艺'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'], _craft: cur._craft });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'包材工艺复制新增成功':'包材工艺已新增') : '包材工艺已保存');
        return;
      }
      if(pageId.value==='samp-point'){
        const code = String(formModel['采样点编码']||'').trim();
        const name = String(formModel['采样点名称']||'').trim();
        if(!code){ ElMessage.warning('请填写采样点编码'); return; }
        if(!name){ ElMessage.warning('请填写采样点名称'); return; }
        const types = joinDun(formModel['适用报检单']);
        if(!types){ ElMessage.warning('请选择适用报检单'); return; }
        const list = ((MOCK['samp-point'] = MOCK['samp-point'] || {}).main = (MOCK['samp-point'].main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['采样点编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('采样点编码已存在，请重新输入'); return;
        }
        const payload = {
          采样点编码: code,
          采样点名称: name,
          适用报检单: types,
          所属产线: formModel['所属产线']||'',
          所属车间: formModel['所属车间']||'',
          备注: formModel['备注']||'—',
          启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
        };
        if(isAdd){
          payload.id = 'sp-' + Date.now();
          payload.创建人 = '管理员';
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑采样点'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人']||'管理员', 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'采样点复制新增成功':'采样点已新增') : '采样点已保存');
        return;
      }
      if(pageId.value==='insp-person'){
        const code = String(formModel['人员编码']||'').trim();
        const name = String(formModel['人员姓名']||'').trim();
        if(!code){ ElMessage.warning('请选择人员编码'); return; }
        if(!name){ ElMessage.warning('请选择人员编码以带入姓名'); return; }
        if(!formModel['员工状态']){ ElMessage.warning('请选择员工状态'); return; }
        const list = ((MOCK['insp-person'] = MOCK['insp-person'] || {}).main = (MOCK['insp-person'].main || []));
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['人员编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('该人员编码已存在，请重新选择'); return;
        }
        const payload = {
          人员编码: code,
          人员姓名: name,
          所属角色: formModel['所属角色']||'',
          所属岗位: formModel['所属岗位']||'',
          所属部门: formModel['所属部门']||'',
          所属检验班组: joinDun(formModel['所属检验班组']) || '',
          负责检验类: joinDun(formModel['负责检验类']) || '',
          员工状态: formModel['员工状态']||'在职',
          入职日期: formModel['入职日期']||'',
          学历: formModel['学历']||'',
          联系电话: formModel['联系电话']||'',
          电子邮箱: formModel['电子邮箱']||'',
          附件: formModel['附件']||'',
          备注: formModel['备注']||'',
          创建人: '管理员'
        };
        if(isAdd){
          payload.id = 'ip-' + Date.now();
          payload.创建时间 = nowStamp();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑人员'); return; }
          Object.assign(cur, payload, { id: cur.id, 创建时间: cur['创建时间'] });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'检验人员复制新增成功':'检验人员已新增') : '检验人员已保存');
        return;
      }
      if(pageId.value==='form-data-source'){
        if(formMode.value==='新增数据源' || formMode.value==='编辑数据源'){
          if(!String(formModel['菜单']||'').trim()){ ElMessage.warning('请选择菜单'); return; }
          const res = String(formModel['资源']||'').trim();
          if(!res){ ElMessage.warning('请选择资源'); return; }
          const p = page.value;
          if(p && Array.isArray(p.treeNodes) && formMode.value==='新增数据源' && !p.treeNodes.includes(res)){
            p.treeNodes = p.treeNodes.concat([res]);
            treeListId.value = res;
          }
          formVisible.value=false;
          ElMessage.success('表单数据源已保存（演示）');
          return;
        }
        const fname = String(formModel['字段名']||'').trim();
        if(!fname){ ElMessage.warning('请输入字段名'); return; }
        const bag = (MOCK['form-data-source'] = MOCK['form-data-source'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        const resName = String(formModel['关联表单数据源']||treeListId.value||'').trim();
        const payload = {
          资源名称: resName,
          字段名: fname,
          字段注释: formModel['字段注释']||'',
          字段描述: formModel['字段别名']||formModel['字段描述']||'',
          字段别名: formModel['字段别名']||'',
          是否主键: formSwitch['是否主键'] ? '是' : '否',
          是否可修改: formSwitch['是否可修改']===false ? '否' : '是',
          备注: formModel['备注']||'',
        };
        if(isAdd){
          payload.id = 'fds-' + Date.now();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑字段'); return; }
          Object.assign(cur, payload, { id: cur.id });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? '字段已新增' : '字段已保存');
        return;
      }
      if(pageId.value==='form-setting'){
        if(formMode.value==='新增表单类型' || formMode.value==='编辑表单类型'){
          const typ = String(formModel['表单类型']||'').trim();
          if(!typ){ ElMessage.warning('请输入表单类型'); return; }
          const p = page.value;
          if(p && Array.isArray(p.treeNodes) && formMode.value==='新增表单类型' && !p.treeNodes.includes(typ)){
            p.treeNodes = p.treeNodes.concat([typ]);
            treeListId.value = typ;
          }
          formVisible.value=false;
          ElMessage.success('表单类型已保存（演示）');
          return;
        }
        const code = String(formModel['表单编码']||'').trim();
        const name = String(formModel['表单名称']||'').trim();
        const ver = String(formModel['版本号']||'').trim();
        if(!ver){ ElMessage.warning('请输入版本号'); return; }
        if(!code){ ElMessage.warning('请输入表单编码'); return; }
        if(!name){ ElMessage.warning('请输入表单名称'); return; }
        const bag = (MOCK['form-setting'] = MOCK['form-setting'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        if(list.some(r=> r['表单编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('表单编码已存在'); return; }
        const payload = {
          版本号: ver,
          表单编码: code,
          表单名称: name,
          表单类型: String(formModel['表单类型']||treeListId.value||'').trim(),
          备注: formModel['备注']||'',
        };
        if(isAdd){
          payload.id = 'fs-' + Date.now();
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑表单'); return; }
          Object.assign(cur, payload, { id: cur.id });
        }
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'表单已复制新增':'表单已新增') : '表单已保存');
        return;
      }
      if(pageId.value==='insp-order'){
        if(!qcCheckRequired(activeFormFields.value)) return;
        const tab = (tabView.value||{}).name || activeTab.value;
        const cols = ((tabView.value||{}).columns||[]).map(c=> c.field).filter(k=> k && k!=='操作');
        const bag = (MOCK['insp-order'] = MOCK['insp-order'] || {});
        const list = (bag[tab] = bag[tab] || []);
        const isAdd = formMode.value==='add' || formMode.value==='copy';
        const payload = {};
        cols.forEach(k=>{ const v = formModel[k]; if(v!=null && v!=='') payload[k] = Array.isArray(v) ? joinDun(v) : v; });
        if(isAdd){
          const need = String(flowInt(payload['应取样件数']) || 1);
          Object.assign(payload, {
            _flow: true,
            id: 'io-' + Date.now(),
            单据状态: '待执行',
            复核结论: '—',
            报检单号: nextInspOrderNo(),
            报检时间: nowStamp(),
            报检人: '管理员',
            应取样件数: need, 已取样件数: '0', 待取样件数: need, 检验完成件数: '0'
          });
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑报检单'); return; }
          Object.assign(cur, payload, { id: cur.id, 报检单号: cur['报检单号'] });
          if(['待执行','执行中'].includes(cur['单据状态']) && !cur._sampEnd){
            cur['待取样件数'] = String(Math.max(0, flowInt(cur['应取样件数']) - flowInt(cur['已取样件数'])));
          }
        }
        flowSyncAll();
        formVisible.value=false;
        bumpStore();
        ElMessage.success(isAdd ? (formMode.value==='copy'?'报检单复制新增成功，已生成待取样任务':'报检单已新增，已生成待取样任务') : '报检单已保存');
        return;
      }
      if(pageId.value==='np-0501-01' && ['add','copy','edit'].includes(formMode.value)){
        const fields = (activeFormFields.value||[]).filter(f=> f && f.name);
        if(!qcCheckRequired(fields)) return;
        const code = String(formModel['过程监测编码']||'').trim();
        const name = String(formModel['过程监测名称']||'').trim();
        const scheme = String(formModel['采集方案']||'').trim();
        if(!code){ ElMessage.warning('请输入过程监测编码'); return; }
        if(!name){ ElMessage.warning('请输入过程监测名称'); return; }
        if(!scheme){ ElMessage.warning('请选择采集方案'); return; }
        const bag = (MOCK['np-0501-01'] = MOCK['np-0501-01'] || {});
        const list = (bag.main = bag.main || []);
        const isAdd = formMode.value!=='edit';
        if(list.some(r=> r['过程监测编码']===code && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('过程监测编码「'+code+'」已存在，不可重复'); return;
        }
        if(list.some(r=> r['过程监测名称']===name && (isAdd || r.id!==formModel._editId))){
          ElMessage.warning('过程监测名称「'+name+'」已存在，不可重复'); return;
        }
        const payload = {
          过程监测编码: code,
          过程监测名称: name,
          过程监测位置: String(formModel['过程监测位置']||'').trim(),
          采集方案: scheme,
          采集方案编码: formModel['采集方案编码'] || '',
          备注: formModel['备注'] || ''
        };
        if(isAdd){
          Object.assign(payload, { id: 'em-'+Date.now(), 采集状态:'关闭', 采集开始时间:'', 采集结束时间:'', 创建人:'管理员', 创建时间: nowStamp() });
          list.unshift(payload);
        } else {
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          if(cur['采集状态']==='开启'){ ElMessage.warning('开启状态不可编辑'); return; }
          Object.assign(cur, payload);
        }
        formVisible.value=false; bumpStore();
        ElMessage.success(isAdd ? '新增成功' : '保存成功');
        return;
      }
      if(pageId.value==='np-0502-01' && ['add','copy','edit'].includes(formMode.value)){
        const monName = String(formModel['过程监测名称']||'').trim();
        const modeName = String(formModel['创建方式']||'').trim() || '手动';
        if(!monName){ ElMessage.warning('请选择过程监测名称'); return; }
        if(!modeName){ ElMessage.warning('请选择创建方式'); return; }
        const hit = envMonSchemeOf(monName);
        const code = formModel['过程监测编码'] || (hit && hit.mon && hit.mon['过程监测编码']) || '';
        const filled = (formLineRows.value||[]).filter(l=> String(l['结果值']??'').trim()!=='');
        if(!filled.length){ ElMessage.warning('请至少填写一条结果值'); return; }
        const bad = filled.find(l=> !/^\d+(\.\d+)?$/.test(String(l['结果值']).trim()) || !(Number(l['结果值'])>0));
        if(bad){ ElMessage.warning('结果值请输入正数'); return; }
        filled.forEach(envMonJudgeLine);
        const bag = (MOCK['np-0502-01'] = MOCK['np-0502-01'] || {});
        const list = (bag.main = bag.main || []);
        const isEdit = formMode.value==='edit';
        const stamp = nowStamp();
        const makeRow = (line, keep)=>{
          const row = {
            监测结论: line['监测结论'] || '合格',
            偏差结论: line['偏差结论'] || '/',
            过程监测编码: code,
            过程监测名称: monName,
            采集项编码: line['采集项编码']||'',
            采集项名称: line['采集项名称']||'',
            采集项单位: line['采集项单位']||'',
            结果值: String(line['结果值']).trim(),
            USL: line.USL||'',
            LSL: line.LSL||'',
            UCL: line.UCL||'',
            LCL: line.LCL||'',
            采集频率: line['采集频率']||'',
            采集位置: line['采集位置']||'',
            创建方式: modeName
          };
          if(keep) return row;
          return Object.assign(row, {
            id: 'emr-'+Date.now()+'-'+Math.random().toString(36).slice(2,5),
            采集时间: stamp,
            创建时间: stamp,
            创建人: modeName==='自动' ? '/' : '管理员'
          });
        };
        if(isEdit){
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          const first = filled[0];
          Object.assign(cur, makeRow(first, true));
          filled.slice(1).forEach(line=> list.unshift(makeRow(line, false)));
        } else {
          filled.slice().reverse().forEach(line=> list.unshift(makeRow(line, false)));
        }
        formVisible.value=false; bumpStore();
        const n = filled.length;
        ElMessage.success(isEdit ? (n>1 ? '已保存，并新增 '+(n-1)+' 条' : '保存成功') : ('已生成 '+n+' 条监测参数'));
        return;
      }
      if(pageId.value==='np-0601-01' && ['add','copy','edit'].includes(formMode.value)){
        const event = String(formModel['事件类型']||'').trim();
        const outLot = String(formModel['产出批号']||'').trim();
        const outCode = String(formModel['产出物料编码']||'').trim();
        if(!event){ ElMessage.warning('请输入事件类型'); return; }
        if(!outCode){ ElMessage.warning('请选择产出物料'); return; }
        if(!outLot){ ElMessage.warning('请输入产出批号'); return; }
        const filled = (formLineRows.value||[]).filter(l=> String(l['来源物料编码']||'').trim() || String(l['来源批号']||'').trim());
        if(!filled.length){ ElMessage.warning('请至少填写一行来源物料'); return; }
        if(filled.some(l=> !String(l['来源物料编码']||'').trim() || !String(l['来源批号']||'').trim())){
          ElMessage.warning('来源物料和来源批号都要填写'); return;
        }
        const bag = (MOCK['np-0601-01'] = MOCK['np-0601-01'] || {});
        const list = (bag.main = bag.main || []);
        const isEdit = formMode.value==='edit';
        const makeRow = (line)=>{
          return {
            id: 'bre-'+Date.now()+'-'+Math.floor(Math.random()*1000),
            事件类型: event,
            来源批号: String(line['来源批号']||'').trim(),
            来源物料编码: line['来源物料编码']||'',
            来源物料名称: line['来源物料名称']||'',
            来源物料规格: line['来源物料规格']||'',
            来源物料种类: line['来源物料种类']||'',
            产出批号: outLot,
            产出物料编码: outCode,
            产出物料名称: formModel['产出物料名称']||'',
            产出物料规格: formModel['产出物料规格']||'',
            产出物料种类: formModel['产出物料种类']||'',
            来源单据名称: formModel['来源单据名称']||'',
            来源单号: formModel['来源单号']||'',
            备注: formModel['备注']||'',
            创建方式: '手动',
            创建人: '管理员',
            创建时间: nowStamp()
          };
        };
        if(isEdit){
          const cur = list.find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
          const first = makeRow(filled[0]);
          delete first.id; delete first.创建时间; delete first.创建人; delete first.创建方式;
          Object.assign(cur, first);
          filled.slice(1).forEach(line=> list.unshift(makeRow(line)));
        } else {
          filled.slice().reverse().forEach(line=> list.unshift(makeRow(line)));
        }
        formVisible.value=false; bumpStore();
        const n = filled.length;
        ElMessage.success(isEdit ? (n>1 ? '已保存，并新增 '+(n-1)+' 条' : '保存成功') : ('已生成 '+n+' 条批次关联'));
        return;
      }
      if(['add','copy','edit'].includes(formMode.value)){
        if(pageId.value===COST_FLOW){ saveCostFlowForm(); return; }
        if(pageId.value===HM_IMP_PAGE){ hmSaveForm(); return; }
        if(pageId.value===HM_VOID_PAGE){ hmSaveVoid(); return; }
        if(pageId.value===HM_CHG_PAGE){ hmSaveChg(); return; }
        if(pageId.value===HM_ARCH_PAGE){ hmSaveArch(); return; }
        if(pageId.value===HM_LIB_PAGE){ hmSaveLib(); return; }
        if(pageId.value==='np-0201-01'){
          const fields = (activeFormFields.value||[]).filter(f=> f && f.name);
          if(!qcCheckRequired(fields)) return;
          if(qcEmpty(formModel['往来单位类型']) || qcEmpty(formModel['往来单位名称'])){
            ElMessage.warning('请先选择报检单，往来单位将随报检单带入');
            return;
          }
          ElementPlus.ElMessageBox.confirm('确认提交该未检放行单？','二次确认',{
            type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
          }).then(()=> genericSaveForm()).catch(()=>{});
          return;
        }
        genericSaveForm(); return;
      }
      formVisible.value=false;
      ElMessage.success('已保存');
    }
