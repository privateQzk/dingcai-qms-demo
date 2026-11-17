    function biasFmt(x, d) {
      if (x === null || x === undefined) return '—';
      return Number(x).toFixed(d == null ? 4 : d);
    }
    function biasDeviation(i) {
      if (!biasRow.value) return '—';
      const v = biasDraft.value[i];
      if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—';
      return (Number(v) - Number(biasRow.value['基准值'])).toFixed(4);
    }
    const biasStats = computed(() => {
      if (!biasRow.value) return { n: 0 };
      return biasCompute(biasDraft.value, biasRow.value['基准值']);
    });
    const biasReportResult = computed(() => {
      if (!biasRow.value) return { n: 0 };
      return biasCompute(biasRow.value.values, biasRow.value['基准值']);
    });
    function biasChartSvgOf(r, values, std) {
      std = parseFloat(std);
      const W = 680, H = 300, padL = 64, padR = 24, padT = 22, padB = 44;
      const pw = W - padL - padR, ph = H - padT - padB;
      const pts = [];
      (values || []).forEach((v, i) => { if (v != null && v !== '' && !isNaN(Number(v))) pts.push({ x: i + 1, y: Number(v) - std }); });
      const yAll = pts.map(p => p.y).concat([0, r.ciL, r.ciU]);
      let yMin = Math.min.apply(null, yAll), yMax = Math.max.apply(null, yAll);
      let span = (yMax - yMin) || 1;
      const padY = span * 0.18;
      yMin -= padY; yMax += padY; span = yMax - yMin;
      const X = x => padL + (x - 1) / (BIAS_OLED_N - 1) * pw;
      const Y = y => padT + (yMax - y) / span * ph;
      let g = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">';
      for (let t = 0; t <= 5; t++) {
        const yv = yMin + span * t / 5, yy = Y(yv);
        g += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '" stroke="#f0f2f5" stroke-width="1"/>';
        g += '<text x="' + (padL - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="#969799">' + biasFmt(yv, 4) + '</text>';
      }
      g += '<line x1="' + padL + '" y1="' + Y(0) + '" x2="' + (W - padR) + '" y2="' + Y(0) + '" stroke="#969799" stroke-width="1.2" stroke-dasharray="5,4"/>';
      g += '<text x="' + (W - padR) + '" y="' + (Y(0) - 4) + '" text-anchor="end" font-size="11" fill="#646566">0</text>';
      g += '<line x1="' + padL + '" y1="' + Y(r.ciU) + '" x2="' + (W - padR) + '" y2="' + Y(r.ciU) + '" stroke="#d40000" stroke-width="1.2" stroke-dasharray="5,4"/>';
      g += '<text x="' + (W - padR) + '" y="' + (Y(r.ciU) - 4) + '" text-anchor="end" font-size="11" fill="#d40000">上限 ' + biasFmt(r.ciU, 4) + '</text>';
      g += '<line x1="' + padL + '" y1="' + Y(r.ciL) + '" x2="' + (W - padR) + '" y2="' + Y(r.ciL) + '" stroke="#d40000" stroke-width="1.2" stroke-dasharray="5,4"/>';
      g += '<text x="' + (W - padR) + '" y="' + (Y(r.ciL) - 4) + '" text-anchor="end" font-size="11" fill="#d40000">下限 ' + biasFmt(r.ciL, 4) + '</text>';
      g += '<polyline fill="none" stroke="#006be6" stroke-width="1.5" points="' + pts.map(p => X(p.x) + ',' + Y(p.y)).join(' ') + '"/>';
      pts.forEach(p => { g += '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="4" fill="#006be6"/>'; });
      for (let i = 1; i <= BIAS_OLED_N; i++) g += '<text x="' + X(i) + '" y="' + (H - padB + 16) + '" text-anchor="middle" font-size="11" fill="#969799">' + i + '</text>';
      g += '<text x="' + (padL + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" fill="#646566">测量序号</text>';
      g += '</svg>';
      return g;
    }
    const biasChartSvg = computed(() => {
      if (!biasRow.value) return '';
      const r = biasReportResult.value;
      if (r.n === 0) return '';
      return biasChartSvgOf(r, biasRow.value.values, biasRow.value['基准值']);
    });
    function openBiasData(row) {
      biasRow.value = row;
      biasDraft.value = (row.values || []).slice();
      biasDataVisible.value = true;
    }
    function openBiasReport(row) {
      biasRow.value = row;
      biasReportVisible.value = true;
    }
    function onBiasCellBlur(i) {
      const v = String(biasDraft.value[i] == null ? '' : biasDraft.value[i]).trim();
      if (v !== '' && isNaN(Number(v))) ElMessage.warning('请输入数字');
    }
    function saveBiasData() {
      if (!biasRow.value) return;
      const arr = biasDraft.value;
      for (let i = 0; i < BIAS_OLED_N; i++) {
        const v = String(arr[i] == null ? '' : arr[i]).trim();
        if (v === '') { arr[i] = null; }
        else if (isNaN(Number(v))) { ElMessage.warning('第 ' + (i + 1) + ' 次测量为非数字，请修正后保存'); return; }
        else { arr[i] = Number(v); }
      }
      const filled = arr.filter(v => v !== null && v !== undefined).length;
      biasRow.value.values = arr.slice();
      const r = biasCompute(arr, biasRow.value['基准值']);
      if (filled === BIAS_OLED_N) {
        biasRow.value['状态'] = '已完成';
        biasRow.value['判定'] = r.accept ? '可接受' : '不可接受';
        biasDataVisible.value = false;
        bumpStore();
        ElMessage.success('已保存，计划进入已完成');
      } else {
        biasRow.value['状态'] = '执行中';
        biasRow.value['判定'] = '—';
        bumpStore();
        ElMessage.success('已保存草稿（' + filled + '/' + BIAS_OLED_N + '）');
      }
    }
    function closeBiasPlan(row) {
      row['状态'] = '已关闭';
      row['判定'] = '—';
      bumpStore();
      ElMessage.success('计划已关闭');
    }
    function copyBiasPlan(row) {
      const list = MOCK[BIAS_PAGE] = MOCK[BIAS_PAGE] || {};
      list.main = list.main || [];
      const d = new Date();
      const next = Object.assign({}, row, { id: 'bias-' + Date.now() });
      next['计划编号'] = 'BIAS-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-（复制）';
      next['状态'] = '待执行';
      next['判定'] = '—';
      next['values'] = (row.values || []).map(() => null);
      list.main.unshift(next);
      bumpStore();
      ElMessage.success('已复制为新计划（待执行）');
    }
    

    const BIAS_PEOPLE = ['张敏','赵磊','周工','李强'];
    const BIAS_TYPES = ['称量','气压计算','色谱','光谱'];
    const biasPeople = BIAS_PEOPLE;
    const biasTypes = BIAS_TYPES;
    function biasRows(){
      const bag = (MOCK[BIAS_PAGE] = MOCK[BIAS_PAGE] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function biasPlanOf(id){ return biasRows().find(r=> r.id===id); }
    function biasNormInv(p){
      const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
      const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
      const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
      const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
      const plow = 0.02425;
      let q;
      if(p < plow){
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
      }
      if(p > 1 - plow){
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
      }
      q = p - 0.5;
      const r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    }
    function biasTInv2T(alpha, df){
      const z = biasNormInv(1 - alpha / 2);
      const z2 = z * z, z3 = z2 * z, z5 = z3 * z2, z7 = z5 * z2, z9 = z7 * z2;
      return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df * df) + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * Math.pow(df, 3)) + (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * Math.pow(df, 4));
    }
    function biasNums(values){
      return (values||[]).map(v=> String(v==null ? '' : v).trim()).filter(v=> v!=='' && !isNaN(Number(v))).map(Number);
    }
    function biasFmtNum(v){
      const s = String(v==null ? '' : v).trim();
      if(s==='' || isNaN(Number(s))) return s;
      return String(Number(s));
    }
    function biasRange(r){
      const a = r['测量开始时间'] || '', b = r['测量结束时间'] || '';
      if(a && b) return a + ' ~ ' + b;
      return a || b || '';
    }
    // 单一子组（g=1）的 d2、d2*、自由度，按下标 = 数据个数
    const BIAS_D2 = {
      2:[1.12838,1.41421,1], 3:[1.69257,1.91155,1.98], 4:[2.05875,2.23887,2.85], 5:[2.32593,2.48124,3.62],
      6:[2.53441,2.67253,4.47], 7:[2.70436,2.82981,5.27], 8:[2.84720,2.96288,6.03], 9:[2.97003,3.07794,6.77],
      10:[3.07751,3.17805,7.47], 11:[3.17287,3.26853,8.15], 12:[3.25846,3.35016,8.81], 13:[3.33598,3.42416,9.45],
      14:[3.40676,3.49166,10.07], 15:[3.47193,3.55333,10.67], 16:[3.53198,3.60981,11.26], 17:[3.58788,3.66187,11.83],
      18:[3.64006,3.71019,12.38], 19:[3.68896,3.75515,12.92], 20:[3.73500,3.79717,13.45]
    };
    function biasD2(n){
      const k = Math.max(2, Math.min(20, n|0));
      return BIAS_D2[k];
    }
    function biasFix(x, d){
      return Number.isFinite(x) ? x.toFixed(d) : '—';
    }
    function biasTrim(x, max){
      if(!Number.isFinite(x)) return '—';
      let s = x.toFixed(max);
      if(s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }
    function biasStudy(ref, values){
      const raw = (values||[]).map(v=> String(v==null ? '' : v).trim());
      const ready = raw.length > 1 && raw.every(v=> v!=='' && !isNaN(Number(v)));
      if(!ready || isNaN(Number(ref))) return { ready: false, 结论: '' };
      const xs = raw.map(Number);
      const n = xs.length;
      const r0 = Number(ref);
      const meanX = xs.reduce((a, b)=> a + b, 0) / n;
      const bias = meanX - r0;
      const min = Math.min.apply(null, xs);
      const max = Math.max.apply(null, xs);
      const range = max - min;
      const ss = xs.reduce((a, b)=> a + (b - meanX) * (b - meanX), 0);
      const sigma = Math.sqrt(ss / (n - 1));
      const tab = biasD2(n);
      const d2 = tab[0], d2s = tab[1], df = tab[2];
      const sigmaR = range === 0 ? 0 : range / d2s;
      const sigmaB = sigmaR / Math.sqrt(n);
      const t0 = biasTInv2T(0.05, df);
      let t, 结论;
      if(sigmaR === 0){
        t = Math.abs(bias) < 1e-12 ? 0 : Infinity;
        结论 = Math.abs(bias) < 1e-12 ? '可接受' : '不可接受';
      } else {
        t = Math.abs(bias) / sigmaB;
        结论 = t <= t0 + 1e-9 ? '可接受' : '不可接受';
      }
      const half = Number.isFinite(t0) && sigmaB > 0 ? t0 * sigmaB : 0;
      return { ready: true, 结论, xs, n, r0, meanX, bias, min, max, range, sigma, d2, d2s, df, sigmaR, sigmaB, t, t0, lo: bias - half, hi: bias + half };
    }
    function biasAnalyze(ref, values){
      const s = biasStudy(ref, values);
      if(!s.ready) return { ready: false, 结论: '', lines: [] };
      const dfTxt = Math.abs(s.df - Math.round(s.df)) < 1e-6 ? String(Math.round(s.df)) : biasTrim(s.df, 2);
      return { ready: true, 结论: s.结论, t: s.t, t0: s.t0, lines: [
        { k: 'n', v: String(s.n) },
        { k: '平均值', v: biasFix(s.meanX, 8) },
        { k: '平均偏倚', v: biasFix(s.bias, 8) },
        { k: '极差', v: biasTrim(s.range, 6) },
        { k: '标准偏差', v: biasFix(s.sigma, 8) },
        { k: 'σr', v: biasFix(s.sigmaR, 8) },
        { k: 'σb', v: biasFix(s.sigmaB, 8) },
        { k: '自由度', v: dfTxt },
        { k: 'α', v: '0.05' },
        { k: 't0', v: biasFix(s.t0, 8) },
        { k: 't', v: biasFix(s.t, 7) },
        { k: '置信区间下限', v: biasFix(s.lo, 8) },
        { k: '置信区间上限', v: biasFix(s.hi, 8) },
        { k: '结论', v: s.结论 }
      ] };
    }
    function biasHistogram(xs, groups){
      const g = Math.max(1, parseInt(groups, 10) || 5);
      const min = Math.min.apply(null, xs);
      const max = Math.max.apply(null, xs);
      const range = max - min;
      const width = range === 0 ? 0 : range * 1.02 / g;
      const start = range === 0 ? min : min - range * 0.01;
      const counts = Array(g).fill(0);
      xs.forEach(x=>{
        if(width === 0){ counts[0]++; return; }
        let i = Math.floor((x - start) / width);
        if(i < 0) i = 0;
        if(i >= g) i = g - 1;
        counts[i]++;
      });
      const labels = counts.map((_, i)=> i === g - 1 ? biasTrim(max, 6) : biasTrim(start + i * width, 6));
      return { width, counts, labels };
    }
    function biasChartGeom(bins){
      const W = 460, H = 280, left = 48, top = 16, plotH = 190;
      const max = Math.max(1, ...bins.map(b=> b.count));
      const step = (W - left - 16) / Math.max(bins.length, 1);
      const base = top + plotH;
      const bars = bins.map((b, i)=>{
        const h = (b.count / max) * plotH;
        return { x: left + i * step + step * 0.16, y: base - h, w: step * 0.68, h, cx: left + i * step + step / 2, count: b.count, label: b.label };
      });
      const tickN = Math.min(max, 8);
      const ticks = [];
      const seen = new Set();
      for(let i = 0; i <= tickN; i++){
        const val = Math.round(max * i / tickN);
        if(seen.has(val)) continue;
        seen.add(val);
        ticks.push({ val, y: base - (val / max) * plotH });
      }
      return { W, H, left, top, plotH, base, bars, ticks };
    }
    function biasView(r){
      const v = Object.assign({}, r);
      v['样本个数'] = '1';
      v['测量日期范围'] = biasRange(r);
      const n = Number(r['测试次数']) || (r._values||[]).length;
      const vals = (r._values||[]).slice(0, n);
      while(vals.length < n) vals.push('');
      const stat = r['状态']==='已完成' ? biasAnalyze(r['基准值'], vals) : { ready: false, 结论: '' };
      v['分析结果'] = stat.ready ? stat.结论 : '';
      return v;
    }
    function biasQueryRows(){
      // 对齐 OLED #msa-bias 字段：计划编号 / 仪器名称 / 仪器编号 / 状态 / 测量人 / 判定
      let l = applyContainsExactQuery(biasRows(), query, ['计划编号','仪器名称','仪器编号','测量人'], ['状态','判定']);
      l = applyDateRangeQuery(l, query, '测试日期');
      return l;
    }
    function biasNextNo(){
      const seq = biasRows().reduce((m, r)=> Math.max(m, parseInt(String(r['计划单号']||'').replace(/\D/g, ''), 10) || 0), 0) + 1;
      return 'MSA_BIAS' + String(seq).padStart(8, '0');
    }
    const biasFormVisible = ref(false);
    const biasFormMode = ref('add');
    const biasEditId = ref('');
    const biasForm = reactive({});
    const biasInstOptions = computed(()=> djInstruments().filter(r=> r['使用状态']==='在用' || r.id===biasForm._instId));
    function onBiasInst(id){
      const inst = djInstruments().find(x=> x.id===id) || {};
      biasForm['设备编号'] = inst['仪器编号'] || '';
      biasForm['设备名称'] = inst['仪器名称'] || '';
      biasForm['规格型号'] = inst['规格型号'] || '';
    }
    function refreshBiasNo(){ biasForm['计划单号'] = biasNextNo(); }
    function openBiasForm(mode, row){
      const src = row ? biasPlanOf(row.id) : null;
      if(mode==='edit' && (!src || src['状态']!=='待执行')){ ElMessage.warning('仅待执行的计划可编辑'); return; }
      biasFormMode.value = mode;
      biasEditId.value = mode==='edit' ? src.id : '';
      Object.keys(biasForm).forEach(k=> delete biasForm[k]);
      Object.assign(biasForm, {
        计划单号: mode==='edit' ? src['计划单号'] : biasNextNo(),
        内容描述: src ? (src['内容描述']||'') : '',
        _instId: src ? src._instId : '',
        设备编号: src ? src['设备编号'] : '',
        设备名称: src ? src['设备名称'] : '',
        规格型号: src ? src['规格型号'] : '',
        测量人员: src ? src['测量人员'] : '',
        测量类型: src ? src['测量类型'] : '',
        测试次数: src ? String(src['测试次数']||'15') : '15',
        基准值: src && src['基准值']!=='' && src['基准值']!=null ? Number(src['基准值']) : undefined,
        组数: src ? Number(src['组数']||5) : 5,
        基准件名称: src ? (src['基准件名称']||'') : '',
        测量参数: src ? (src['测量参数']||'') : '',
        参数规格: src ? (src['参数规格']||'') : '',
        测量开始时间: src ? (src['测量开始时间']||'') : '',
        测量结束时间: src ? (src['测量结束时间']||'') : '',
        备注: src ? (src['备注']||'') : ''
      });
      biasFormVisible.value = true;
    }
    function saveBiasForm(){
      if(!biasForm._instId){ ElMessage.warning('请选择设备编号'); return; }
      if(!biasForm['测量人员']){ ElMessage.warning('请选择测量人员'); return; }
      if(!biasForm['测量类型']){ ElMessage.warning('请选择测量类型'); return; }
      if(biasForm['基准值']==null || biasForm['基准值']==='' || isNaN(Number(biasForm['基准值']))){ ElMessage.warning('请输入基准值'); return; }
      const groups = Number(biasForm['组数']);
      if(!Number.isInteger(groups) || groups < 1){ ElMessage.warning('组数须为正整数'); return; }
      const inst = djInstruments().find(x=> x.id===biasForm._instId) || {};
      const base = {
        内容描述: String(biasForm['内容描述']||'').trim(),
        _instId: biasForm._instId,
        设备编号: inst['仪器编号'] || biasForm['设备编号'],
        设备名称: inst['仪器名称'] || biasForm['设备名称'],
        规格型号: inst['规格型号'] || biasForm['规格型号'],
        测量人员: biasForm['测量人员'],
        测量类型: biasForm['测量类型'],
        测试次数: String(biasForm['测试次数']||'15'),
        样本个数: '1',
        基准值: String(Number(biasForm['基准值'])),
        组数: String(groups),
        基准件名称: String(biasForm['基准件名称']||'').trim(),
        测量参数: String(biasForm['测量参数']||'').trim(),
        参数规格: String(biasForm['参数规格']||'').trim(),
        测量开始时间: biasForm['测量开始时间'] || '',
        测量结束时间: biasForm['测量结束时间'] || '',
        备注: String(biasForm['备注']||'').trim()
      };
      const list = biasRows();
      if(biasFormMode.value==='edit'){
        const cur = list.find(r=> r.id===biasEditId.value);
        if(!cur || cur['状态']!=='待执行'){ ElMessage.warning('仅待执行的计划可编辑'); return; }
        Object.assign(cur, base);
      } else {
        const no = list.some(r=> r['计划单号']===biasForm['计划单号']) ? biasNextNo() : biasForm['计划单号'];
        const n = Number(base['测试次数']) || 15;
        list.unshift(Object.assign({ id: 'bias-'+Date.now(), 状态: '待执行', 计划单号: no, _values: Array(n).fill('') }, base, { 创建人: CI_OPERATOR, 创建时间: nowStamp() }));
      }
      biasFormVisible.value = false;
      bumpStore();
      ElMessage.success(biasFormMode.value==='edit' ? '保存成功' : '已新增计划 '+ (biasFormMode.value==='edit' ? '' : list[0]['计划单号']));
    }
    function deleteBiasRows(rows){
      const list = rows && rows.length ? rows : bxPicked();
      if(!list.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = list.filter(r=> r['状态']!=='待执行');
      if(bad.length){ ElMessage.warning('仅待执行的计划可删除：'+bad.map(r=> r['计划单号']+'（'+r['状态']+'）').join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+list.length+' 条计划？', '删除', { type: 'warning' }).then(()=>{
        const ids = new Set(list.map(r=> r.id));
        const all = biasRows();
        for(let i = all.length - 1; i >= 0; i--) if(ids.has(all[i].id)) all.splice(i, 1);
        selectedIds.value = selectedIds.value.filter(id=> !ids.has(id));
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }
    const biasDtVisible = ref(false);
    const biasDt = reactive({});
    const biasDtKeys = ['计划单号','状态','分析结果','创建时间','内容描述','设备名称','设备编号','规格型号','测量类型','测量人员','测试次数','样本个数','基准件名称','测量参数','参数规格','测量日期范围','基准值','组数','备注','创建人'];
    function openBiasDetail(row){
      const v = biasView(biasPlanOf(row.id) || row);
      Object.keys(biasDt).forEach(k=> delete biasDt[k]);
      biasDtKeys.forEach(k=> biasDt[k] = v[k] || '');
      biasDtVisible.value = true;
    }
    const biasAn = reactive({ visible: false, mode: 'edit', id: '', ref: '', values: [] });
    const biasAnStats = computed(()=> biasAnalyze(biasAn.ref, biasAn.values));
    function biasCell(v){
      const s = String(v==null ? '' : v).trim();
      if(s==='' || isNaN(Number(s)) || isNaN(Number(biasAn.ref))) return '';
      return (Number(s) - Number(biasAn.ref)).toFixed(3);
    }
    function openBiasEntry(row){
      const p = biasPlanOf(row.id) || row;
      const n = Number(p['测试次数']) || 15;
      const values = (p._values||[]).slice(0, n).map(v=> v==null ? '' : String(v));
      while(values.length < n) values.push('');
      Object.assign(biasAn, { visible: true, mode: p['状态']==='已完成' ? 'view' : 'edit', id: p.id, ref: String(p['基准值']??''), values });
    }
    function biasDownloadTpl(){
      const lines = ['测量次数,测量值'];
      biasAn.values.forEach((_, i)=> lines.push((i + 1) + ','));
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '偏倚测量导入模板.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 800);
      ElMessage.success('已下载导入模板');
    }
    function biasImport(){
      const ref = Number(biasAn.ref);
      if(isNaN(ref)){ ElMessage.warning('请先在计划中填写基准值'); return; }
      biasAn.values.forEach((_, i)=>{ biasAn.values[i] = String(Math.round((ref + ((i % 3) - 1) * 0.01) * 1000) / 1000); });
      ElMessage.success('已按基准值附近导入测量值');
    }
    function saveBiasEntry(submit){
      const p = biasPlanOf(biasAn.id);
      if(!p || p['状态']==='已完成'){ ElMessage.warning('已完成的计划不可再修改测量值'); return; }
      if(submit){
        const miss = biasAn.values.some(v=> String(v==null ? '' : v).trim()==='' || isNaN(Number(v)));
        if(miss){ ElMessage.warning('请填写完整的测量值'); return; }
        const stat = biasAnalyze(p['基准值'], biasAn.values);
        if(!stat.ready){ ElMessage.warning('请填写完整的测量值'); return; }
        p['状态'] = '已完成';
        p['分析结果'] = stat.结论;
      }
      p._values = biasAn.values.map(v=> String(v==null ? '' : v).trim());
      biasAn.visible = false;
      bumpStore();
      ElMessage.success(submit ? '已提交，分析结果：'+p['分析结果'] : '已保存');
    }
    const biasFilesVisible = ref(false);
    const biasFileNo = ref('');
    const biasPv = reactive({ visible: false, html: '', name: '', sheet: null });
    function biasBuildSheet(row){
      const p = biasPlanOf(row.id) || row;
      const n = Number(p['测试次数']) || (p._values||[]).length;
      const vals = (p._values||[]).slice(0, n);
      const study = biasStudy(p['基准值'], vals);
      if(!study.ready) return null;
      const hist = biasHistogram(study.xs, p['组数']);
      const dfTxt = Math.abs(study.df - Math.round(study.df)) < 1e-6 ? String(Math.round(study.df)) : biasTrim(study.df, 2);
      const date = String(p['测量结束时间'] || p['测量开始时间'] || p['创建时间'] || '').slice(0, 10);
      const bins = hist.labels.map((label, i)=> ({ label, count: hist.counts[i] }));
      const rows = study.xs.map((x, i)=> ({
        no: i + 1,
        x: x.toFixed(4),
        bias: (x - study.r0).toFixed(4),
        edge: bins[i] ? bins[i].label : '',
        freq: bins[i] ? String(bins[i].count) : ''
      }));
      const bad = study.结论 === '不可接受';
      return {
        head: [
          { k: 'MSA', v: '偏倚' },
          { k: '基准件名称', v: p['基准件名称'] || '' },
          { k: '测量参数', v: p['测量参数'] || '' },
          { k: '测量人', v: p['测量人员'] || '', line: true },
          { k: '日期', v: date, line: true }
        ],
        ref: biasTrim(study.r0, 6),
        stats: [
          { k: '数据个数', v: String(study.n) },
          { k: '最小值', v: biasTrim(study.min, 6) },
          { k: '最大值', v: biasTrim(study.max, 6) },
          { k: '极差', v: biasTrim(study.range, 6) },
          { k: '平均值', v: biasFix(study.meanX, 8) },
          { k: '标准偏差', v: biasFix(study.sigma, 8) }
        ],
        hist: [
          { k: '组数', v: String(Math.max(1, parseInt(p['组数'], 10) || 5)), cyan: true },
          { k: '分组宽度', v: biasFix(hist.width, 6) }
        ],
        lookup: [
          { k: 'd2*', v: biasFix(study.d2s, 5) },
          { k: 'd2', v: biasFix(study.d2, 5) },
          { k: '自由度', v: dfTxt }
        ],
        calc: [
          { k: 'σr', v: biasFix(study.sigmaR, 8) },
          { k: '偏倚', v: biasFix(study.bias, 8) },
          { k: 'σb', v: biasFix(study.sigmaB, 8) },
          { k: 't', v: biasFix(study.t, 7) },
          { k: 't0', v: biasFix(study.t0, 8) },
          { k: '置信区间下限', v: biasFix(study.lo, 8) },
          { k: '置信区间上限', v: biasFix(study.hi, 8) },
          { k: '可接受性', v: study.结论, bad, ok: !bad }
        ],
        rows,
        chart: biasChartGeom(bins)
      };
    }
