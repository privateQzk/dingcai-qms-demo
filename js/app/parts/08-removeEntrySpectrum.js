    function removeEntrySpectrum(id){
      entrySpectra.value = entrySpectra.value.filter(f=> f.id!==id);
    }
    const entryInstrumentOptions = computed(()=> ((((MOCK.instrument||{}).main)||[]).filter(r=> r['使用状态']!=='停用' && r['使用状态']!=='报废').map(r=> ({
      value: r['仪器编号'], label: (r['仪器编号']||'') + ' / ' + (r['仪器名称']||'')
    }))));
    const entrySpecVisible = ref(false);
    const entrySpecQuery = reactive({ date:'当天', batch:'', scope:'最新文件', name:'', sample:'' });
    const entrySpecChecked = ref([]);
    const entrySpecDraft = ref({});
    const entrySpecCols = computed(()=> entrySampCols.value || 1);
    function entrySpecAllFiles(){
      const files = (((MOCK.spectrogram||{})['tab-file'])||[]);
      const flows = (((MOCK.spectrogram||{})['tab-flow'])||[]);
      return files.map(f=>{
        const flow = flows.find(r=> r['文件编号']===f['文件编号']) || {};
        return Object.assign({}, f, { 样本编号: flow['样本编号'] || '' });
      });
    }
    const entrySpecBatches = computed(()=>{
      const set = [];
      entrySpecAllFiles().forEach(f=>{ const b = f['批号']; if(b && !set.includes(b)) set.push(b); });
      const cur = formModel['报检批号'];
      if(cur && cur!=='—' && !set.includes(cur)) set.unshift(cur);
      return set;
    });
    function entrySpecDateOk(t){
      const day = String(t||'').slice(0, 10);
      const mode = entrySpecQuery.date;
      if(mode==='全部' || !mode) return true;
      const today = new Date();
      const pad = n=> String(n).padStart(2,'0');
      const iso = today.getFullYear()+'-'+pad(today.getMonth()+1)+'-'+pad(today.getDate());
      if(mode==='当天') return day===iso;
      const d = new Date(day+'T00:00:00');
      if(isNaN(d.getTime())) return false;
      const diff = today.getTime() - d.getTime();
      return diff>=0 && diff<=7*86400000;
    }
    const entrySpecFiles = computed(()=>{
      const inst = entryInstruments.value || [];
      const name = String(entrySpecQuery.name||'').trim();
      const sample = String(entrySpecQuery.sample||'').trim();
      let list = entrySpecAllFiles().filter(f=>{
        if(inst.length && !inst.includes(f['仪器编号'])) return false;
        if(entrySpecQuery.batch && f['批号']!==entrySpecQuery.batch) return false;
        if(!entrySpecDateOk(f['上传时间'])) return false;
        if(name && !String(f['文件名称']||'').includes(name)) return false;
        if(sample && !String(f['样本编号']||'').includes(sample)) return false;
        return true;
      });
      list = list.slice().sort((a,b)=> String(b['上传时间']||'').localeCompare(String(a['上传时间']||'')));
      if(entrySpecQuery.scope==='最新文件') list = list.slice(0, 1);
      return list;
    });
    function entrySpecBlankDraft(){
      const draft = {};
      const row = (entryCatRows.value||[])[0];
      const n = entrySpecCols.value;
      entrySampParams.value.forEach(p=>{
        draft[p.代号] = [];
        for(let i=0;i<n;i++) draft[p.代号].push(row ? entryCell(row, p.代号, i) : '');
      });
      return draft;
    }
    const entryInheritVisible = ref(false);
    const entryInheritPickVisible = ref(false);
    const entryInheritSampleNo = ref('');
    const entryInheritPickNo = ref('');
    const entryInheritCats = ref([]);
    const entryInheritMode = ref('empty');
    const entryInheritQueryTick = ref(0);
    const entryInheritQ = reactive({ 样品编号:'', 报检单号:'', 物料名称:'' });
    function entryInheritLedgerAll(){
      const out = [];
      FLOW_TABS.forEach(t=>{
        flowBag(FLOW_LEDGER, t.name).forEach(r=>{
          if(r && r['样品编号']) out.push(Object.assign({ _ledgerTab: t.name, 报检类型: r['报检类型'] || t.label }, r));
        });
      });
      return out;
    }
    const entryInheritPickRows = computed(()=>{
      void entryInheritQueryTick.value;
      void storeTick.value;
      const cur = formModel['样品编号'];
      const q = entryInheritQ;
      return entryInheritLedgerAll().filter(r=>{
        if(r['样品状态']!=='已完成') return false;
        if(taskIsKid(r)) return false;
        if(cur && r['样品编号']===cur) return false;
        if(q.样品编号 && !String(r['样品编号']||'').includes(q.样品编号.trim())) return false;
        if(q.报检单号 && !String(r['报检单号']||'').includes(q.报检单号.trim())) return false;
        if(q.物料名称 && !String(r['物料名称']||'').includes(q.物料名称.trim())) return false;
        return true;
      }).sort((a,b)=>{
        const mat = formModel['物料编码'];
        const tabLab = formModel['报检类型'] || flowLabelOf(activeTab.value) || '';
        const score = (r)=> (mat && r['物料编码']===mat ? 2 : 0) + (tabLab && r['报检类型']===tabLab ? 1 : 0);
        return score(b) - score(a) || String(b['检验完成时间']||'').localeCompare(String(a['检验完成时间']||''));
      });
    });
    const entryInheritSrcRow = computed(()=> entryInheritLedgerAll().find(r=> r['样品编号']===entryInheritSampleNo.value) || null);
    const entryInheritSampleLabel = computed(()=>{
      const r = entryInheritSrcRow.value;
      if(!r) return '';
      const no = r['样品编号'] || '';
      const name = r['物料名称'] || '';
      return name ? (no + ' / ' + name) : no;
    });
    function entryInheritApplySample(no){
      entryInheritSampleNo.value = no || '';
      entryInheritCats.value = no
        ? entryInheritCatOpts.value.filter(c=> c.matchable).map(c=> c.name)
        : [];
    }
    function clearEntryInheritSample(){
      entryInheritApplySample('');
    }
    function entryInheritSrcItems(row){
      const s = row || entryInheritSrcRow.value;
      if(!s) return [];
      const e = s._entry || {};
      const items = e.items || {};
      const names = [];
      String((s['方案项目']||'')+';'+(s['临时项目']||'')).split(/[;；]/).map(x=> x.trim()).filter(x=> x && x!=='—').forEach(n=>{ if(!names.includes(n)) names.push(n); });
      Object.keys(items).forEach(n=>{ if(!names.includes(n)) names.push(n); });
      const catMap = new Map((((MOCK['insp-project']||{})['tab-item'])||[]).filter(i=> i['启用状态']!=='禁用').map(i=> [i['检验项名称'], i['所属检验类']]));
      return names.map((n, i)=>{
        const it = items[n] || {};
        let val = it.实测值 || it.检验结果 || '';
        let concl = it.结论 || it.检验结论 || '';
        // Demo：已完成样品若无缓存明细，按项生成可预览的示意值
        if(!val && !Object.keys(items).length){
          val = String((90 + (i % 9) + (i * 0.13)).toFixed(2));
          concl = '合格';
        }
        return {
          检验项: n,
          检验类: catMap.get(n) || '未分类',
          实测值: val || '—',
          结论: concl || '—'
        };
      });
    }
    const entryInheritCatOpts = computed(()=>{
      const curCats = new Set(entryCats.value || []);
      const curFilled = new Set();
      (formLineRows.value||[]).forEach(r=>{
        if(String(r['实测值']||'').trim() || (r['结论'] && r['结论']!=='—')) curFilled.add(r['所属检验类']||'未分类');
      });
      const groups = new Map();
      entryInheritSrcItems().forEach(it=>{
        const g = groups.get(it.检验类) || { name: it.检验类, itemCount: 0, matchable: curCats.has(it.检验类), hasData: curFilled.has(it.检验类) };
        g.itemCount++;
        groups.set(it.检验类, g);
      });
      return [...groups.values()];
    });
    const entryInheritPreviewRows = computed(()=>{
      const picked = new Set(entryInheritCats.value || []);
      const curByName = new Map((formLineRows.value||[]).map(r=> [r['检验项'], r]));
      return entryInheritSrcItems().filter(it=> picked.has(it.检验类)).map(it=>{
        const cur = curByName.get(it.检验项);
        let match = '无对应项';
        if(cur){
          const has = String(cur['实测值']||'').trim() || (cur['结论'] && cur['结论']!=='—');
          if(entryInheritMode.value==='overwrite') match = '将回填';
          else match = has ? '跳过(已有)' : '将回填';
        }
        return Object.assign({}, it, { 匹配: match });
      });
    });
    const entryInheritAllChecked = computed(()=>{
      const ok = entryInheritCatOpts.value.filter(c=> c.matchable);
      return ok.length > 0 && ok.every(c=> entryInheritCats.value.includes(c.name));
    });
    const entryInheritSomeChecked = computed(()=>{
      const ok = entryInheritCatOpts.value.filter(c=> c.matchable);
      const n = ok.filter(c=> entryInheritCats.value.includes(c.name)).length;
      return n > 0 && n < ok.length;
    });
    function entryInheritToggleCat(name, on){
      const set = new Set(entryInheritCats.value);
      if(on) set.add(name); else set.delete(name);
      entryInheritCats.value = [...set];
    }
    function entryInheritToggleAll(on){
      entryInheritCats.value = on ? entryInheritCatOpts.value.filter(c=> c.matchable).map(c=> c.name) : [];
    }
    function openEntryInherit(){
      if(!(formMode.value==='entry' || formMode.value==='quick-entry')) return;
      entryInheritSampleNo.value = '';
      entryInheritPickNo.value = '';
      entryInheritCats.value = [];
      entryInheritMode.value = 'empty';
      Object.assign(entryInheritQ, { 样品编号:'', 报检单号:'', 物料名称:'' });
      entryInheritQueryTick.value++;
      entryInheritPickVisible.value = false;
      entryInheritVisible.value = true;
    }
    function openEntryInheritPick(){
      Object.assign(entryInheritQ, { 样品编号:'', 报检单号:'', 物料名称:'' });
      entryInheritQueryTick.value++;
      entryInheritPickNo.value = entryInheritSampleNo.value || '';
      entryInheritPickVisible.value = true;
    }
    function confirmEntryInheritPick(){
      const no = String(entryInheritPickNo.value||'').trim();
      if(!no){ ElMessage.warning('请选择一条样品'); return; }
      const hit = entryInheritPickRows.value.find(r=> r['样品编号']===no);
      if(!hit){ ElMessage.warning('请选择列表中的样品'); return; }
      entryInheritPickVisible.value = false;
      entryInheritApplySample(no);
    }
    function confirmEntryInherit(){
      if(!entryInheritSrcRow.value){ ElMessage.warning('请先选择样品信息'); return; }
      const rows = entryInheritPreviewRows.value.filter(r=> r.匹配==='将回填');
      if(!entryInheritCats.value.length){ ElMessage.warning('请勾选要继承的检验类'); return; }
      if(!rows.length){ ElMessage.warning(entryInheritMode.value==='empty' ? '所选检验类无可回填的空项' : '没有可回填的检验项'); return; }
      const byName = new Map((formLineRows.value||[]).map(r=> [r['检验项'], r]));
      let n = 0;
      rows.forEach(src=>{
        const cur = byName.get(src.检验项);
        if(!cur) return;
        if(src.实测值 && src.实测值!=='—') cur['实测值'] = src.实测值;
        if(src.结论 && src.结论!=='—'){ cur['结论'] = src.结论; cur['检验结论'] = src.结论; }
        n++;
      });
      entryInheritVisible.value = false;
      ElMessage.success('已继承 '+n+' 个检验项数据到当前样品');
    }
    function openEntrySpecPick(){
      entrySpecQuery.date = '当天';
      entrySpecQuery.batch = '';
      entrySpecQuery.scope = '最新文件';
      entrySpecQuery.name = '';
      entrySpecQuery.sample = '';
      entrySpecChecked.value = (entrySpectra.value||[]).map(f=> f.id);
      entrySpecDraft.value = entrySpecBlankDraft();
      entrySpecVisible.value = true;
    }
    function entrySpecFillValue(code, i){
      const flows = (((MOCK.spectrogram||{})['tab-flow'])||[]);
      const hit = flows.find(r=> (r['参数名称']===code) && String(r['测量次数'])===String(i));
      if(hit && hit['测量值']) return String(hit['测量值']);
      const base = { Inj: 5, ColT: 30, PeakArea: 128450, RT: 6.82 };
      const n = base[code] != null ? base[code] : 1;
      return String(Math.round((n + (i-1)*0.2) * 100) / 100);
    }
    function entrySpecFillCol(i){
      if(!entrySampParams.value.length){ ElMessage.warning('当前检验方法没有样本参数'); return; }
      const draft = Object.assign({}, entrySpecDraft.value);
      entrySampParams.value.forEach(p=>{
        const arr = (draft[p.代号] || []).slice();
        while(arr.length < entrySpecCols.value) arr.push('');
        arr[i-1] = entrySpecFillValue(p.代号, i);
        draft[p.代号] = arr;
      });
      entrySpecDraft.value = draft;
    }
    function entrySpecFillAll(){
      if(!entrySampParams.value.length){ ElMessage.warning('当前检验方法没有样本参数'); return; }
      for(let i=1;i<=entrySpecCols.value;i++) entrySpecFillCol(i);
    }
    function entrySpecAutoFill(){
      entrySpecFillAll();
      if(entrySampParams.value.length) ElMessage.success('已自动识别并填充');
    }
    function confirmEntrySpecPick(){
      const files = entrySpecAllFiles().filter(f=> (entrySpecChecked.value||[]).includes(f.id));
      entrySpectra.value = files.map(f=> ({ id: f.id, name: f['文件名称'] }));
      const draft = entrySpecDraft.value || {};
      (entryCatRows.value||[]).forEach(row=>{
        entrySampParams.value.forEach(p=>{
          (draft[p.代号]||[]).forEach((v, i)=>{ if(String(v||'').trim()) entrySetCell(row, p.代号, i, v); });
        });
      });
      entrySpecVisible.value = false;
      ElMessage.success(files.length ? ('已带出 '+files.length+' 个谱图') : '已确认');
    }
    /* ── 漂移获取 · 图谱识别取数（对齐 OLED：选 GC/LC 台账 → 自动读取 → 参数×次数网格 → 提交回填） */
    const ENTRY_CHROM_STAT_FIELDS = ['杂质个数', '新杂个数', '是否存在新杂', '杂质偏差结论'];
    const ENTRY_CHROM_DEFAULT_PARAMS = ['保留时间', '峰面积', '峰面积%'];
    const entryChromVisible = ref(false);
    const entryChromFilters = reactive({ kind: 'LC', batch: '', material: '', column: '', rule: '' });
    const entryChromKey = ref('');
    const entryChromDraft = ref({});
    const entryChromChecked = ref({});
    const entryChromCols = computed(()=> {
      const n = entrySampCols.value || parseInt(formModel['样本测试次数'], 10);
      return (n > 0 && n <= 20) ? n : 2;
    });
    const entryChromParamNames = computed(()=>{
      const fromMethod = (entrySampParams.value || []).map(p=> p.名称 || p.代号).filter(Boolean);
      const hit = fromMethod.filter(n=> /保留时间|峰面积%?|峰高/.test(n));
      return hit.length ? [...new Set(hit)] : ENTRY_CHROM_DEFAULT_PARAMS.slice();
    });
    function entryChromPageId(kind){ return kind === 'LC' ? 'np-0208-05' : 'np-0208-04'; }
    function entryChromCellText(v){
      if(v === null || v === undefined || v === '') return '—';
      if(Array.isArray(v)) return v.length ? v.length + ' 项' : '—';
      if(typeof v === 'object') return '—';
      return String(v);
    }
    function entryChromPickCell(row, rt){
      const v = (row && row._rt && row._rt[rt]) || {};
      const parts = [chromLedgerPctText(v), chromLedgerAreaText(v), (v.t || '—')];
      if(parts.every(x=> !x || x === '—')) return '—';
      return parts.join(' / ');
    }
    function entryChromBlankDraft(){
      const n = entryChromCols.value;
      const draft = {};
      entryChromParamNames.value.forEach(name=>{ draft[name] = Array(n).fill(''); });
      return draft;
    }
    const entryChromListRaw = computed(()=>{
      void storeTick.value;
      const out = [];
      ['GC', 'LC'].forEach(kind=>{
        if(entryChromFilters.kind !== '全部' && entryChromFilters.kind !== kind) return;
        const bag = MOCK[entryChromPageId(kind)] || {};
        Object.keys(bag).forEach(tab=>{
          (bag[tab] || []).forEach(r=>{
            if(!r || !r._rt) return;
            out.push({ key: kind + '::' + tab + '::' + r.id, kind, tab, row: r });
          });
        });
      });
      return out;
    });
    const entryChromList = computed(()=>{
      let list = entryChromListRaw.value;
      const kwBatch = String(entryChromFilters.batch || '').trim();
      if(kwBatch) list = list.filter(x=> String(x.row['批号'] || '').includes(kwBatch));
      const kwMat = String(entryChromFilters.material || '').trim();
      if(kwMat) list = list.filter(x=> [x.row['物料名称'], x.row['物料编码']].join(' ').includes(kwMat));
      const kwRule = String(entryChromFilters.rule || '').trim();
      if(kwRule) list = list.filter(x=> (String(x.row['规则名称'] || '') + String(x.row['规则编码'] || '')).includes(kwRule));
      const col = String(entryChromFilters.column || '').trim();
      if(col) list = list.filter(x=> String(x.row['色谱柱型号'] || '').trim() === col);
      return list;
    });
    const entryChromSelected = computed(()=> entryChromList.value.find(x=> x.key === entryChromKey.value) || null);
    const entryChromFilterHint = computed(()=>{
      const parts = [];
      if(String(entryChromFilters.kind || '').trim()) parts.push('色谱类型 ' + entryChromFilters.kind);
      if(String(entryChromFilters.batch || '').trim()) parts.push('批号 ' + entryChromFilters.batch.trim());
      if(String(entryChromFilters.material || '').trim()) parts.push('物料 ' + entryChromFilters.material.trim());
      if(String(entryChromFilters.column || '').trim()) parts.push('色谱柱型号 ' + entryChromFilters.column.trim());
      if(String(entryChromFilters.rule || '').trim()) parts.push('规则 ' + entryChromFilters.rule.trim());
      return parts.join(' / ');
    });
    const entryChromColumnOptions = computed(()=>{
      const set = new Set();
      entryChromListRaw.value.forEach(x=>{
        const c = String(x.row['色谱柱型号'] || '').trim();
        if(c) set.add(c);
      });
      return Array.from(set).sort();
    });
    const entryChromRtCols = computed(()=>{
      const set = new Set();
      entryChromList.value.forEach(x=> Object.keys((x.row || {})._rt || {}).forEach(k=> set.add(String(k))));
      return Array.from(set).sort((a, b)=> Number(a) - Number(b));
    });
    const entryChromRtStructMap = computed(()=>{
      void storeTick.value;
      const kinds = entryChromFilters.kind === '全部' ? ['GC', 'LC'] : [entryChromFilters.kind];
      const map = {};
      kinds.forEach(kind=>{
        driftRowsOf().forEach(r=>{
          if(String(r['启用状态'] || '启用') !== '启用') return;
          if(String(r['规则分类'] || '').trim().toUpperCase() !== kind) return;
          (Array.isArray(r._impurities) ? r._impurities : []).forEach(x=>{
            const tr = driftNum(x && x['典型保留时间']);
            if(tr == null) return;
            const key = tr.toFixed(3);
            const st = String((x && x['定性结构']) || '').trim();
            if(!(key in map) || (!map[key] && st)) map[key] = st;
          });
        });
      });
      return map;
    });
    function entryChromMainPeak(row){
      const rt = (row && row._rt) || {};
      let best = null, bestA = -1;
      Object.keys(rt).forEach(k=>{
        const v = rt[k] || {};
        const a = parseFloat(v.a);
        const score = Number.isFinite(a) ? a : -1;
        if(score > bestA){ bestA = score; best = { tr: v.t || k, area: chromLedgerAreaText(v), pct: chromLedgerPctText(v), structure: entryChromRtStructMap.value[k] || '' }; }
      });
      return best;
    }
    function entryChromParamValue(peak, name){
      if(!peak) return '';
      const nm = String(name || '');
      if(nm.indexOf('保留时间') >= 0) return String(peak.tr || '');
      if(nm.indexOf('峰面积%') >= 0) return String(peak.pct || '');
      if(nm.indexOf('峰面积') >= 0) return String(peak.area || '');
      if(nm.indexOf('峰高') >= 0) return String(peak.pct || '');
      return String(peak.pct || '');
    }
    function entryChromDriftValue(baseVal, k){
      const num = Number(baseVal);
      if(!Number.isFinite(num)) return String(baseVal);
      const factor = k <= 1 ? 1 : (1 + (k % 2 === 1 ? 1 : -1) * 0.002 * (k - 1));
      const dec = String(baseVal).indexOf('.') >= 0 ? String(baseVal).split('.')[1].length : 0;
      return (num * factor).toFixed(Math.min(dec, 6));
    }
    function openEntryChromPick(){
      if(!formModel['检验方法']){ ElMessage.warning('请先选择检验方法'); return; }
      const method = String(formModel['检验方法'] || '');
      entryChromFilters.kind = /液相|HPLC|LC/i.test(method) ? 'LC' : (/气相|GC/i.test(method) ? 'GC' : '全部');
      entryChromFilters.batch = String(formModel['报检批号'] || formModel['批号'] || '').trim();
      entryChromFilters.material = String(formModel['物料名称'] || '').trim();
      entryChromFilters.column = '';
      entryChromFilters.rule = '';
      entryChromKey.value = '';
      entryChromDraft.value = entryChromBlankDraft();
      const checked = {};
      entryChromParamNames.value.forEach(n=> { checked[n] = true; });
      entryChromChecked.value = checked;
      if(!entryChromList.value.length) entryChromFilters.batch = '';
      if(!entryChromList.value.length) entryChromFilters.material = '';
      if(!entryChromList.value.length) entryChromFilters.column = '';
      entryChromVisible.value = true;
    }
    function entryChromAutoFill(){
      const sel = entryChromSelected.value;
      if(!sel){ ElMessage.warning('请先选择台账记录'); return; }
      const peak = entryChromMainPeak(sel.row);
      if(!peak){ ElMessage.warning('所选台账记录无谱峰数据，无法识别'); return; }
      const n = entryChromCols.value;
      const draft = {};
      entryChromParamNames.value.forEach(name=>{
        const base = entryChromParamValue(peak, name);
        draft[name] = Array.from({ length: n }, (_, i)=> entryChromDriftValue(base, i + 1));
      });
      entryChromDraft.value = draft;
      ElMessage.success('已按主峰带出 ' + entryChromParamNames.value.length + ' 个参数 × ' + n + ' 次测定值');
    }
    function entryChromFillByTime(timeIdx){
      const sel = entryChromSelected.value;
      if(!sel){ ElMessage.warning('请先选择台账记录'); return; }
      const peak = entryChromMainPeak(sel.row);
      if(!peak){ ElMessage.warning('所选台账记录无谱峰数据，无法识别'); return; }
      const draft = Object.assign({}, entryChromDraft.value);
      entryChromParamNames.value.forEach(name=>{
        const arr = (draft[name] || []).slice();
        while(arr.length < entryChromCols.value) arr.push('');
        arr[timeIdx] = entryChromDriftValue(entryChromParamValue(peak, name), timeIdx + 1);
        draft[name] = arr;
      });
      entryChromDraft.value = draft;
      ElMessage.success('已下发第 ' + (timeIdx + 1) + ' 次测定值');
    }
