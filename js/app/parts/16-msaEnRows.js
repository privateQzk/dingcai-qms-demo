    const msaEnRows = computed(()=>{
      const n = msaCounts(msaEnPlan.value).n;
      return Array.from({ length: n }, (_, i)=> ({ k: i, label: '测量'+(i + 1) })).concat([{ k: 'avg', label: 'Average' }, { k: 'sd', label: 'Stdev' }]);
    });
    function msaEnCalc(it, k){
      const arr = msaEn.data[it['检验项编码']] || [];
      const v = k==='avg' ? msaAvg(arr) : msaStdev(arr);
      return v==null ? '—' : v.toFixed(msaPrec(it['单位']) + (k==='sd' ? 1 : 0));
    }
    function onMsaEntryOp(name, e){
      const why = msaEntryDisabled(name, e);
      if(why){ ElMessage.warning(why); return; }
      const p = msaEnPlan.value;
      const n = msaCounts(p).n;
      msaEn.mode = name==='数据录入' ? 'entry' : name==='查看详情' ? 'view' : 'edit';
      msaEn.d = e['日期']; msaEn.o = e['操作员']; msaEn.s = e['样本'] || 1;
      msaEn.data = Object.fromEntries((p._items||[]).map(it=>{
        const old = ((e.data||{})[it['检验项编码']]) || [];
        return [it['检验项编码'], Array.from({ length: n }, (_, i)=> old[i]==null ? '' : String(old[i]))];
      }));
      msaEn.visible = true;
    }
    function msaImport(){
      msaEnItems.value.forEach(it=>{
        const nom = Number((it['标称']||[])[msaEn.s - 1]) || 1;
        msaEn.data[it['检验项编码']] = msaEn.data[it['检验项编码']].map(()=> msaFmt(nom * (1 + (Math.random() - 0.5) * 0.006), it['单位']));
      });
      ElMessage.success('已导入原始记录（演示：按标称浓度模拟生成）');
    }
    function saveMsaEntry(submit){
      const p = msaEnPlan.value;
      if(!p.id){ msaEn.visible = false; return; }
      if(p['计划状态']==='已关闭'){ ElMessage.warning('计划已关闭，不可录入数据'); return; }
      const items = p._items || [];
      const bad = items.filter(it=> msaEn.data[it['检验项编码']].some(v=> String(v).trim()!=='' && isNaN(Number(v))));
      if(bad.length){ ElMessage.warning('测量值须为数字：'+bad.map(msaItemHead).join('、')); return; }
      if(submit && items.some(it=> msaEn.data[it['检验项编码']].some(v=> String(v).trim()===''))){ ElMessage.warning('请填写完整的原始记录'); return; }
      const list = p._entries || (p._entries = []);
      let e = list.find(x=> x['日期']===msaEn.d && x['操作员']===msaEn.o && (x['样本']||1)===msaEn.s);
      if(!e){ e = { 日期: msaEn.d, 操作员: msaEn.o, 样本: msaEn.s }; list.push(e); }
      e.data = Object.fromEntries(items.map(it=> [it['检验项编码'], msaEn.data[it['检验项编码']].map(v=> msaFmt(v, it['单位']))]));
      if(submit) Object.assign(e, { 录入状态: '提交', 提交时间: nowStamp(), 提交人: CI_OPERATOR });
      else Object.assign(e, { 录入状态: '保存', 提交时间: '', 提交人: '' });
      const before = p['计划状态'];
      msaSync(p);
      msaEn.visible = false;
      bumpStore();
      ElMessage.success((submit ? '已提交' : '已保存') + (before!==p['计划状态'] ? '，计划状态改为「'+p['计划状态']+'」' : ''));
    }

    function msaGrr(p){
      const c = msaCounts(p);
      const done = msaEntries(p).filter(e=> e['录入状态']==='提交');
      const f = (v, it, extra)=> v==null || !isFinite(v) ? '—' : v.toFixed(msaPrec(it['单位']) + (extra||0));
      const out = [];
      for(let s = 1; s <= c.s; s++){
        (p._items||[]).forEach(it=>{
          const code = it['检验项编码'];
          const cells = done.filter(e=> (e['样本']||1)===s).map(e=> msaNums((e.data||{})[code])).filter(a=> a.length);
          const all = [].concat(...cells);
          const nom = Number((it['标称']||[])[s - 1]);
          const sp = (p._spec||{})[code] || {};
          const up = String(sp['Upper Spec']||'').trim()==='' ? NaN : Number(sp['Upper Spec']);
          const tol = up - (Number(sp.MDL) || 0);
          const mean = all.length ? all.reduce((a, b)=> a + b, 0) / all.length : null;
          const vars = cells.map(a=> msaStdev(a)).filter(v=> v!=null).map(v=> v * v);
          const ev = vars.length ? Math.sqrt(vars.reduce((a, b)=> a + b, 0) / vars.length) : null;
          const cm = cells.map(a=> a.reduce((x, y)=> x + y, 0) / a.length);
          const sdCm = msaStdev(cm);
          const r = cells.length ? all.length / cells.length : 0;
          const av = sdCm==null || ev==null ? null : Math.sqrt(Math.max(0, sdCm * sdCm - ev * ev / r));
          const grr = av==null ? null : Math.sqrt(ev * ev + av * av);
          const pct = grr!=null && tol > 0 ? 6 * grr / tol * 100 : null;
          out.push({ 样本: '样本'+s, 检验项: msaItemHead(it), 标称浓度: (it['标称']||[])[s - 1] || '',
            已提交组数: cells.length + ' / ' + (c.d * c.o), 总平均: f(mean, it), 偏倚: mean==null || isNaN(nom) ? '—' : f(mean - nom, it),
            '重复性EV': f(ev, it, 1), '再现性AV': f(av, it, 1), GRR: f(grr, it, 1), '公差(Upper Spec−MDL)': isFinite(tol) && tol > 0 ? f(tol, it) : '—',
            '%GRR': pct==null ? '—' : pct.toFixed(2) + '%', 结论: pct==null ? '—' : pct <= 10 ? '可接受' : pct <= 30 ? '有条件接受' : '不可接受' });
        });
      }
      return out;
    }
    function msaReportParts(row){
      const p = msaRows().find(r=> r.id===row.id) || row;
      const v = msaView(p);
      const c = msaCounts(p);
      const info = ['计划单号','计划状态','内容描述','仪器编号','仪器名称','仪器类型','存放位置','测量日期','测量人员','样本个数','平行测量次数','计划时间','逾期状态','标准物质条码号','标准物质名称','标准物质批号','供应商名称','备注']
        .map(k=> ({ k, v: v[k]==null || v[k]==='' ? '—' : v[k] }));
      info.push({ k: 'Spec', v: (p._items||[]).map(it=>{ const sp = (p._spec||{})[it['检验项编码']] || {}; return msaItemHead(it)+'：Upper Spec '+(sp['Upper Spec']||'—')+'，MDL '+(sp.MDL||'—'); }).join('；') || '—' });
      const grr = msaGrr(p);
      const heads = (p._items||[]).map(msaItemHead);
      const raw = [];
      msaEntries(p).forEach(e=>{
        const base = { 测量日期: '测量日期'+e['日期'], 操作员: '操作员'+e['操作员'], 样本: '样本'+(e['样本']||1), 录入状态: e['录入状态'], 提交人: e['提交人']||'', 提交时间: e['提交时间']||'' };
        for(let i = 0; i < c.n; i++) raw.push(Object.assign({}, base, { 记录: '测量'+(i + 1) }, Object.fromEntries((p._items||[]).map(it=> [msaItemHead(it), ((e.data||{})[it['检验项编码']]||[])[i] || '']))));
        [['Average', msaAvg], ['Stdev', msaStdev]].forEach(([lb, fn])=>{
          raw.push(Object.assign({}, base, { 记录: lb }, Object.fromEntries((p._items||[]).map(it=>{
            const x = fn(((e.data||{})[it['检验项编码']])||[]);
            return [msaItemHead(it), x==null ? '' : x.toFixed(msaPrec(it['单位']) + (lb==='Stdev' ? 1 : 0))];
          }))));
        });
      });
      return [
        { title: 'GR&R 报告 · 计划单号 '+p['计划单号'], desc: info },
        { title: 'GR&R 分析结果（仅统计已提交数据）', cols: Object.keys(grr[0] || { 样本: '', 检验项: '' }), rows: grr },
        { title: '原始记录', cols: ['测量日期','操作员','样本','记录'].concat(heads, ['录入状态','提交人','提交时间']), rows: raw }
      ];
    }
    const msaPv = reactive({ visible: false, title: '', html: '', name: '' });
    function openMsaPreview(row){
      const html = qcHtmlDoc('GR&R报告_'+row['计划单号'], msaReportParts(row));
      Object.assign(msaPv, { visible: true, title: '预览 · GR&R报告 '+row['计划单号'], html, name: 'GR&R报告_'+row['计划单号']+'.doc' });
    }
    function downloadMsaReports(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const name = rows.length===1 ? 'GR&R报告_'+rows[0]['计划单号']+'.doc' : 'GR&R报告_'+rows.length+'个计划.doc';
      qcDownload(name, qcHtmlDoc(name.replace(/\.doc$/, ''), [].concat(...rows.map(msaReportParts))));
      ElMessage.success('已下载 '+name);
    }

    const STB_PAGE = 'np-0313-02';
    function stbRows(){
      const bag = (MOCK[STB_PAGE] = MOCK[STB_PAGE] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function stbPlanOf(id){ return stbRows().find(r=> r.id===id); }
    function stbView(r){
      const inst = djInstruments().find(x=> x.id===r._instId);
      const v = Object.assign({}, r, inst ? bxInstSnap(inst) : {});
      MSA_STD_KEYS.forEach(k=>{ v[k] = (r._stds||[]).map(s=> s[k]).filter(Boolean).join('、') || r[k] || ''; });
      const day = String(r['计划时间']||'').slice(0, 10);
      const plan = djParseTime(day ? day+' 00:00' : '');
      const ref = r['计划状态']==='已完成' ? djParseTime(r['完成时间']) : (r['计划状态']==='已关闭' ? djParseTime(r['关闭时间']) : new Date());
      const refDay = ref ? (ref.getFullYear()+'-'+String(ref.getMonth()+1).padStart(2,'0')+'-'+String(ref.getDate()).padStart(2,'0')) : '';
      const late = !!(day && refDay && refDay > day);
      const diff = plan && ref ? Math.floor((ref.getTime() - plan.getTime()) / 60000) : 0;
      v['逾期时长'] = late && diff > 0 ? djFmtSpan(diff) : '/';
      v['逾期状态'] = late ? '逾期' : '正常';
      return v;
    }
    function stbQueryRows(){
      let l = applyContainsExactQuery(stbRows().map(stbView), query, ['计划单号','仪器编号','仪器名称','标准物质条码号'], ['计划状态','逾期状态']);
      ['计划时间','创建时间'].forEach(k=>{ l = applyDateRangeQuery(l, query, k); });
      return sortByCreateTimeDesc(l);
    }
    function stbRefreshStatus(p){
      if(!p || p['计划状态']==='已关闭') return;
      const ms = p._measures || [];
      if(p['计划状态']==='已完成' && ms.length && ms.every(m=> m['录入状态']==='提交')) return;
      if(ms.some(m=> m['录入状态']!=='待录入')){
        if(p['计划状态']==='已完成') delete p['完成时间'];
        p['计划状态'] = '执行中';
      } else if(p['计划状态']!=='已完成') p['计划状态'] = '待执行';
    }
    const stbFormVisible = ref(false);
    const stbFormMode = ref('add');
    const stbTab = ref('inst');
    const stbForm = reactive({ 内容描述:'', 计划时间:'', 备注:'', 样本个数:'1' });
    const stbInsts = ref([]);
    const stbInstSel = ref([]);
    const stbStds = ref([]);
    const stbStdSel = ref([]);
    const stbItems = ref([]);
    const stbItemSel = ref([]);
    const stbEditId = ref('');
    function openStbForm(mode, row){
      const src = row ? stbPlanOf(row.id) : null;
      if(mode==='edit' && (!src || src['计划状态']!=='待执行')){ ElMessage.warning('仅待执行的计划可编辑'); return; }
      stbFormMode.value = mode;
      stbTab.value = 'inst';
      stbEditId.value = mode==='edit' ? src.id : '';
      Object.assign(stbForm, { 内容描述: src ? (src['内容描述']||'') : '', 计划时间: mode==='edit' ? src['计划时间'] : '', 备注: src ? (src['备注']||'') : '', 样本个数: '1' });
      const inst = src ? djInstruments().find(x=> x.id===src._instId) : null;
      stbInsts.value = inst ? [Object.assign({ _instId: inst.id }, bxInstSnap(inst))] : [];
      stbStds.value = src ? (src._stds||[]).map(s=> ({ ...s })) : [];
      stbItems.value = src ? (src._items||[]).map(it=> ({ ...it, 标称: (it['标称']||[]).slice() })) : [];
      stbInstSel.value = []; stbStdSel.value = []; stbItemSel.value = [];
      stbFormVisible.value = true;
    }
    function stbAddStds(rows){
      const add = rows.map(x=> ({ _id: x.id, 标准物质条码号: x['条码号'], 标准物质名称: x['标准物质名称'], 标准物质批号: x['批号'], 供应商名称: x['供应商名称'] }));
      const next = stbStds.value.concat(add);
      const sig = s=> (MSA_STD_COMP[s['标准物质名称']]||[]).map(c=> c[0]).sort().join(',');
      if(next.some(s=> sig(s)!==sig(next[0]))){
        ElMessage.warning('所选标准物质对应的检验项不一致，不可添加：'+next.map(s=> s['标准物质条码号']+'（'+(sig(s)||'未绑定成分')+'）').join('、'));
        return false;
      }
      if(next.length > 1){ ElMessage.warning('标准物质数量须等于样本个数（1），当前最多还可添加 '+Math.max(0, 1 - stbStds.value.length)+' 条'); return false; }
      const first = !stbStds.value.length;
      stbStds.value = next;
      if(first && !stbItems.value.length) stbItems.value = (MSA_STD_COMP[next[0]['标准物质名称']]||[]).map(c=> Object.assign(msaItemOf(c[0]), { 标称: [] }));
      stbFillNominal();
      return true;
    }
    function stbFillNominal(){
      stbItems.value.forEach(it=>{
        const arr = it['标称'] = (it['标称']||[]).slice(0, stbStds.value.length);
        stbStds.value.forEach((s, i)=>{
          if(String(arr[i]==null ? '' : arr[i]).trim()!=='') return;
          const hit = (MSA_STD_COMP[s['标准物质名称']]||[]).find(c=> c[0]===it['检验项编码']);
          arr[i] = hit ? hit[1] : '';
        });
      });
    }
    function stbAddItems(rows){
      rows.forEach(r=> stbItems.value.push(Object.assign(msaItemOf(r['检验项编码']), { 标称: [] })));
      stbFillNominal();
    }
    function stbRemoveItems(codes){
      const set = new Set(codes);
      stbItems.value = stbItems.value.filter(it=> !set.has(it['检验项编码']));
      stbItemSel.value = stbItemSel.value.filter(c=> !set.has(c));
    }
    function onStbAction(name){
      if(name==='添加仪器'){ openIoPick('inst', 'stbInsts', '', true); return; }
      if(name==='删除仪器'){
        const set = new Set(stbInstSel.value);
        if(!set.size){ ElMessage.warning('请先勾选仪器'); return; }
        stbInsts.value = stbInsts.value.filter(l=> !set.has(l));
        stbInstSel.value = [];
        return;
      }
      if(name==='添加标准物质'){
        if(stbStds.value.length >= 1){ ElMessage.warning('标准物质数量须等于样本个数（1），请先删除后再添加'); return; }
        openIoPick('msaStd', 'stbStds', '', true);
        return;
      }
      if(name==='删除标准物质'){
        const set = new Set(stbStdSel.value);
        if(!set.size){ ElMessage.warning('请先勾选标准物质'); return; }
        const keep = stbStds.value.map((s, i)=> [s, i]).filter(([s])=> !set.has(s));
        stbItems.value.forEach(it=>{ it['标称'] = keep.map(([, i])=> (it['标称']||[])[i]); });
        stbStds.value = keep.map(([s])=> s);
        stbStdSel.value = [];
        return;
      }
      if(name==='添加检验项'){ openIoPick('msaItem', 'stbItems', '', true); return; }
      if(name==='删除检验项'){
        if(!stbItemSel.value.length){ ElMessage.warning('请先勾选检验项'); return; }
        stbRemoveItems(stbItemSel.value);
      }
    }
    function saveStbForm(){
      if(!stbInsts.value.length){ stbTab.value = 'inst'; ElMessage.warning('请添加仪器'); return; }
      if(!String(stbForm['计划时间']||'').trim()){ ElMessage.warning('请选择计划时间'); return; }
      if(stbStds.value.length!==1){ stbTab.value = 'std'; ElMessage.warning('标准物质数量须等于样本个数（1）'); return; }
      if(!stbItems.value.length){ stbTab.value = 'std'; ElMessage.warning('请添加检验项'); return; }
      const blank = stbItems.value.filter(it=> String((it['标称']||[])[0]==null ? '' : (it['标称']||[])[0]).trim()==='');
      if(blank.length){ stbTab.value = 'std'; ElMessage.warning('请填写标称浓度：'+blank.map(msaItemHead).join('、')); return; }
      const bad = stbItems.value.filter(it=> isNaN(Number(String((it['标称']||[])[0]).trim())));
      if(bad.length){ stbTab.value = 'std'; ElMessage.warning('标称浓度须为数字：'+bad.map(msaItemHead).join('、')); return; }
      const base = {
        内容描述: String(stbForm['内容描述']||'').trim(), 计划时间: String(stbForm['计划时间']).slice(0, 10), 备注: String(stbForm['备注']||'').trim(), 样本个数: '1',
        _stds: stbStds.value.map(s=> ({ ...s })),
        _items: stbItems.value.map(it=> ({ 检验项编码: it['检验项编码'], 检验项名称: it['检验项名称'], 单位: it['单位'], 标称: [String((it['标称']||[])[0]).trim()] }))
      };
      MSA_STD_KEYS.forEach(k=>{ base[k] = base._stds.map(s=> s[k]).filter(Boolean).join('、'); });
      const list = stbRows();
      if(stbFormMode.value==='edit'){
        const cur = list.find(r=> r.id===stbEditId.value);
        if(!cur || cur['计划状态']!=='待执行'){ ElMessage.warning('仅待执行的计划可编辑'); return; }
        Object.assign(cur, base);
        stbFormVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功');
        return;
      }
      const off = stbInsts.value.filter(l=> (djInstruments().find(x=> x.id===l._instId)||{})['使用状态']!=='在用');
      if(off.length){ stbTab.value = 'inst'; ElMessage.warning('仪器 '+off.map(l=> l['仪器编号']).join('、')+' 不是「在用」状态，不可制定计划'); return; }
      const at = nowStamp();
      let seq = list.reduce((m, r)=> Math.max(m, parseInt(String(r['计划单号']||'').replace(/\D/g, ''), 10) || 0), 0);
      const nos = [];
      stbInsts.value.forEach((l, i)=>{
        const inst = djInstruments().find(x=> x.id===l._instId) || l;
        const no = String(++seq).padStart(6, '0');
        nos.push(no);
        list.unshift(Object.assign({ id: 'stb-'+Date.now()+'-'+i, 计划状态: '待执行', 计划单号: no, _instId: l._instId },
          bxInstSnap(inst), JSON.parse(JSON.stringify(base)), { _measures: [{ id: 'sm-'+Date.now()+'-'+i, 测量序号: '1', 录入状态: '待录入', 提交时间: '', 提交人: '', data: {} }], 创建人: CI_OPERATOR, 创建时间: at }));
      });
      stbFormVisible.value = false;
      bumpStore();
      ElMessage.success('已生成 '+nos.length+' 条计划：'+nos.join('、'));
    }
    function deleteStbRows(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = rows.filter(r=> r['计划状态']!=='待执行');
      if(bad.length){ ElMessage.warning('仅待执行的计划可删除：'+bad.map(r=> r['计划单号']+'（'+r['计划状态']+'）').join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+rows.length+' 条计划？', '批量删除', { type: 'warning' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        const list = stbRows();
        for(let i = list.length - 1; i >= 0; i--) if(ids.has(list[i].id)) list.splice(i, 1);
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }
    function closeStbRows(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = rows.filter(r=> !['待执行','执行中'].includes(r['计划状态']));
      if(bad.length){ ElMessage.warning('仅待执行、执行中的计划可关闭：'+bad.map(r=> r['计划单号']+'（'+r['计划状态']+'）').join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认关闭所选的 '+rows.length+' 条计划？', '关闭', { type: 'warning' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        const at = nowStamp();
        stbRows().forEach(r=>{ if(ids.has(r.id)) Object.assign(r, { 计划状态: '已关闭', 关闭时间: at, 关闭人: CI_OPERATOR }); });
        bumpStore();
        ElMessage.success('已关闭');
      }).catch(()=>{});
    }
    const stbDtVisible = ref(false);
    const stbDtId = ref('');
    const stbMeasureSel = ref([]);
    const stbDtPlan = computed(()=> { storeTick.value; return stbView(stbPlanOf(stbDtId.value) || {}); });
    const stbMeasures = computed(()=> { storeTick.value; return ((stbPlanOf(stbDtId.value)||{})._measures) || []; });
    const stbDtStd = computed(()=> { storeTick.value; return (((stbPlanOf(stbDtId.value)||{})._stds)||[])[0] || {}; });
    const stbFinishTip = computed(()=>{
      storeTick.value;
      const p = stbPlanOf(stbDtId.value);
      if(!p) return '请先打开计划';
      if(p['计划状态']==='已关闭') return '计划已关闭';
      if(p['计划状态']==='已完成') return '计划已完成';
      const ms = p._measures || [];
      if(!ms.length || ms.some(m=> m['录入状态']!=='提交')) return '全部测量提交后才能结束任务';
      return '';
    });
    function openStbDetail(row){
      stbDtId.value = row.id;
      stbMeasureSel.value = [];
      stbDtVisible.value = true;
    }
    function stbAddMeasure(){
      const p = stbPlanOf(stbDtId.value);
      if(!p) return;
      const ms = p._measures = p._measures || [];
      ms.push({ id: 'sm-'+Date.now(), 测量序号: String(ms.length + 1), 录入状态: '待录入', 提交时间: '', 提交人: '', data: {} });
      stbRefreshStatus(p);
      bumpStore();
    }
    function stbDelMeasures(){
      const p = stbPlanOf(stbDtId.value);
      if(!p) return;
      const set = new Set(stbMeasureSel.value);
      if(!set.size){ ElMessage.warning('请先勾选测量行'); return; }
      const keep = (p._measures||[]).filter(m=> !set.has(m));
      if(!keep.length){ ElMessage.warning('至少保留一行测量'); return; }
      keep.forEach((m, i)=> m['测量序号'] = String(i + 1));
      p._measures = keep;
      stbMeasureSel.value = [];
      stbRefreshStatus(p);
      bumpStore();
    }
    function stbFinish(){
      const p = stbPlanOf(stbDtId.value);
      if(!p || stbFinishTip.value){ ElMessage.warning(stbFinishTip.value || '当前不可结束任务'); return; }
      p['计划状态'] = '已完成';
      p['完成时间'] = nowStamp();
      bumpStore();
      ElMessage.success('计划已完成');
    }
    function stbEntryDisabled(op, row){
      const p = stbPlanOf(stbDtId.value) || {};
      const closed = p['计划状态']==='已关闭';
      if(op==='数据录入') return row['录入状态']==='提交' ? '已提交，可在「更多」中修改数据' : (closed ? '计划已关闭' : '');
      if(op==='查看详情') return row['录入状态']==='提交' ? '' : '仅已提交的测量可查看';
      if(op==='修改数据') return closed ? '计划已关闭' : (row['录入状态']==='提交' ? '' : '仅已提交的测量可修改');
      return '';
    }
    const stbEn = reactive({ visible: false, mode: 'entry', id: '', tab: 'raw', data: {} });
    const stbEnStd = computed(()=> stbDtStd.value);
    const stbEnItems = computed(()=> { storeTick.value; return ((stbPlanOf(stbDtId.value)||{})._items) || []; });
    function onStbEntryOp(name, row){
      const why = stbEntryDisabled(name, row);
      if(why){ ElMessage.warning(why); return; }
      const mode = name==='查看详情' ? 'view' : name==='修改数据' ? 'edit' : 'entry';
      const data = {};
      stbEnItems.value.forEach(it=>{ data[it['检验项编码']] = ((row.data||{})[it['检验项编码']]) || ''; });
      Object.assign(stbEn, { visible: true, mode, id: row.id, tab: 'raw', data });
    }
    function stbImport(){
      stbEnItems.value.forEach(it=>{ stbEn.data[it['检验项编码']] = msaFmt((it['标称']||[])[0], it['单位']); });
      stbEn.tab = 'raw';
      ElMessage.success('已按标称浓度导入响应因子');
    }
    function saveStbEntry(submit){
      const p = stbPlanOf(stbDtId.value);
      const row = ((p||{})._measures||[]).find(m=> m.id===stbEn.id);
      if(!p || !row){ ElMessage.warning('测量行不存在'); return; }
      if(submit){
        const miss = stbEnItems.value.filter(it=> String(stbEn.data[it['检验项编码']]==null ? '' : stbEn.data[it['检验项编码']]).trim()==='');
        if(miss.length){ ElMessage.warning('请填写完整的原始记录：'+miss.map(msaItemHead).join('、')); return; }
        const bad = stbEnItems.value.filter(it=> isNaN(Number(String(stbEn.data[it['检验项编码']]).trim())));
        if(bad.length){ ElMessage.warning('响应因子须为数字：'+bad.map(msaItemHead).join('、')); return; }
      }
      row.data = { ...stbEn.data };
      row['录入状态'] = submit ? '提交' : '保存';
      if(submit){ row['提交时间'] = nowStamp(); row['提交人'] = CI_OPERATOR; }
      else { row['提交时间'] = ''; row['提交人'] = ''; }
      stbRefreshStatus(p);
      stbEn.visible = false;
      bumpStore();
      ElMessage.success(submit ? '已提交' : '已保存');
    }
    const stbPv = reactive({ visible: false, title: '', html: '', name: '' });
    function stbReportParts(row){
      const p = stbPlanOf(row.id) || row;
      const v = stbView(p);
      const info = ['计划单号','计划状态','内容描述','仪器编号','仪器名称','仪器类型','存放位置','样本个数','计划时间','逾期状态','标准物质条码号','标准物质名称','标准物质批号','供应商名称','备注']
        .map(k=> ({ k, v: v[k]==null || v[k]==='' ? '—' : v[k] }));
      const heads = (p._items||[]).map(msaItemHead);
      const raw = (p._measures||[]).map(m=> Object.assign({ 测量: '测量'+m['测量序号'], 录入状态: m['录入状态'], 提交人: m['提交人']||'', 提交时间: m['提交时间']||'' },
        Object.fromEntries((p._items||[]).map(it=> [msaItemHead(it), (m.data||{})[it['检验项编码']] || '']))));
      return [
        { title: '稳定性报告 · 计划单号 '+p['计划单号'], desc: info },
        { title: '响应因子', cols: ['测量'].concat(heads, ['录入状态','提交人','提交时间']), rows: raw }
      ];
    }
    function openStbPreview(row){
      const html = qcHtmlDoc('稳定性报告_'+row['计划单号'], stbReportParts(row));
      Object.assign(stbPv, { visible: true, title: '预览 · 稳定性报告 '+row['计划单号'], html, name: '稳定性报告_'+row['计划单号']+'.doc' });
    }
    function downloadStbReports(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const name = rows.length===1 ? '稳定性报告_'+rows[0]['计划单号']+'.doc' : '稳定性报告_'+rows.length+'个计划.doc';
      qcDownload(name, qcHtmlDoc(name.replace(/\.doc$/, ''), [].concat(...rows.map(stbReportParts))));
      ElMessage.success('已下载 '+name);
    }

    const BIAS_PAGE = 'np-0313-03';
    /* ===== OLED 偏倚分析（对齐 #msa-bias） ===== */
    const BIAS_OLED_D2 = 3.07751, BIAS_OLED_D2STAR = 3.17905, BIAS_OLED_TV = 1.8595, BIAS_OLED_N = 10;
    const biasDataVisible = ref(false);
    const biasReportVisible = ref(false);
    const biasRow = ref(null);
    const biasDraft = ref([]);
    function biasCompute(values, std) {
      std = parseFloat(std);
      const filled = (values || []).filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)));
      const n = filled.length;
      if (n === 0) return { n: 0 };
      let sum = 0, mx = -Infinity, mn = Infinity;
      filled.forEach(v => { const num = Number(v); sum += num; if (num > mx) mx = num; if (num < mn) mn = num; });
      const mean = sum / n;
      const sigmaR = (mx - mn) / BIAS_OLED_D2STAR;
      const bias = mean - std;
      const sigmaB = sigmaR / Math.sqrt(n);
      const t = sigmaB === 0 ? 0 : bias / sigmaB;
      const half = BIAS_OLED_D2 * sigmaB * BIAS_OLED_TV / BIAS_OLED_D2STAR;
      const ciL = bias - half, ciU = bias + half;
      const accept = (ciU > 0 && 0 > ciL);
      return { n, mean, sigmaR, bias, sigmaB, t, ciL, ciU, accept, full: n === BIAS_OLED_N };
    }
