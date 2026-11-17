    function specTagStyle(t){
      const m = {
        primary: { background: '#e8f0fa', color: '#004098' },
        warning: { background: '#fff7e6', color: '#d46b08' },
        success: { background: '#f6ffed', color: '#389e0d' },
        info: { background: '#f2f3f5', color: '#4e5969' },
        danger: { background: '#fff1f0', color: '#f5222d' },
      };
      return m[t] || m.info;
    }

    function spectrumImpIndexText(win){
      if(!win) return '—';
      const ucl = String(win.UCL==null?'':win.UCL).trim();
      const lcl = String(win.LCL==null?'':win.LCL).trim();
      if(!ucl && !lcl) return '—';
      return (ucl?('UCL<' + ucl):'') + (ucl && lcl?'，':'') + (lcl?('LCL>' + lcl):'');
    }

    // 识别核心（纯计算，不依赖表单）：按源文件积分结果 + 规则方案算出峰表；供「识别 + 计算」与列表「详情」懒生成峰表共用
    function spectrumRuleWindowsOf(ruleName){
      const rule = spectrumRuleByName(ruleName);
      return (rule && driftRuleWindows(rule)) || [];
    }
    function spectrumWindows(ruleName){
      // 未选择规则方案 / 规则未维护典型保留时间明细时不参与自动匹配（不再用演示窗口兜底）
      const nm = arguments.length ? ruleName : formModel['漂移规则'];
      return spectrumRuleWindowsOf(nm);
    }
    function spectrumDemoNewLimits(ruleName){
      const nm = arguments.length ? ruleName : formModel['漂移规则'];
      const rule = spectrumRuleByName(nm);
      const ucl = driftNum(rule && rule._newUCL);
      const lcl = driftNum(rule && rule._newLCL);
      return { ucl: ucl==null?0.12:ucl, lcl: lcl==null?0.10:lcl };
    }
    // 源文件解析出的积分结果（固定挂在文件台账行 `_peaks` 上）：序号 / 保留时间 / 相对峰面积%
    function spectrumSourcePeaks(fileId){
      const f = spectrumFileById(arguments.length ? fileId : formModel._srcFileId);
      const rows = (f && Array.isArray(f._peaks)) ? f._peaks : [];
      return rows.map(p=> ({
        谱图峰号: String(p.序号 == null ? '' : p.序号),
        谱图保留时间: Number(p.保留时间),
        谱图峰面积: Number(p.相对峰面积 == null ? p.峰面积 : p.相对峰面积)
      })).filter(p=> Number.isFinite(p.谱图保留时间) && Number.isFinite(p.谱图峰面积));
    }
    function spectrumComputeRows(peaks, ruleName, manualMap){
      const mainPeak = peaks.reduce((a,b)=> b.谱图峰面积 > a.谱图峰面积 ? b : a, peaks[0]);
      const mainPeakNo = String(mainPeak.谱图峰号 || '');
      const wins = spectrumWindows(ruleName);
      const baseRows = peaks.map(p=> ({
        谱图峰号: String(p.谱图峰号 || ''),
        谱图保留时间: Number(p.谱图保留时间),
        谱图峰面积: Number(p.谱图峰面积),
        检验项名称: String(p.检验项名称 || '').trim(),
        是否主峰: p === mainPeak ? '是' : '否',
        参考峰: '',
        相对保留时间: '—',
        对应典型保留时间: '',
        对应定性结构: '',
        典型保留时间: String(p.典型保留时间 || '').trim(),
        有效取值范围: '',
        是否锁定: '否',
        是否新杂: '否',
        杂质指标: '—',
        杂质偏差结论: '—',
        匹配异常说明: '/',
        _rrt: null
      }));
      // 未匹配到规则方案：仅回填识别结果，不对匹配类字段做任何推断
      if(!wins.length){
        const rows = baseRows.map(r=> Object.assign(r, {
          参考峰: (manualMap && manualMap[r.谱图峰号]) || mainPeakNo,
          相对保留时间: '—',
          对应典型保留时间: '—',
          对应定性结构: '—',
          典型保留时间: '',
          有效取值范围: '—',
          是否锁定: '否',
          是否新杂: '—',
          杂质指标: '—',
          杂质偏差结论: '—',
          匹配异常说明: '未匹配到规则方案',
          _rrt: null,
          _autoRef: mainPeakNo,
          _refManual: !!(manualMap && manualMap[r.谱图峰号])
        }));
        return { rows, noRule: true, mainPeakNo };
      }
      const mainWin = wins.find(w=> w.是否主峰) || wins[wins.length - 1];
      const mainTR = driftNum(mainWin && mainWin.典型保留时间);
      const newLim = spectrumDemoNewLimits(ruleName);
      // 参考峰自动推导：主峰为种子 → 未定住的峰取「最近已定住峰」作尺子 → 算完即加入种子集合，逐轮扩散
      const rows = spectrumAutoAssignRefs(baseRows, wins, newLim, mainTR, mainPeakNo, manualMap || {});
      applySpectrumOrderAnomaly(rows);
      fillSpectrumItemNames(rows);
      return { rows, noRule: false, mainPeakNo };
    }
    // 主峰行无检验项名称时补「主峰1 / 主峰2…」（按谱图保留时间升序）
    function fillSpectrumItemNames(rows){
      let n = 0;
      (rows || []).slice().sort((a, b)=> (Number(a.谱图保留时间) || 0) - (Number(b.谱图保留时间) || 0)).forEach(r=>{
        if(String(r.是否主峰 || '') !== '是') return;
        if(String(r.检验项名称 || '').trim()) return;
        n += 1;
        r.检验项名称 = '主峰' + n;
      });
      (rows || []).forEach(r=>{
        if(String(r.检验项名称 || '').trim()) return;
        const struct = String(r.对应定性结构 || '').trim();
        if(struct && struct !== '—') r.检验项名称 = struct;
      });
    }
    function runSpectrumCalc(){
      spectrumNoRule.value = false;
      const peaks = spectrumSourcePeaks();
      if(!peaks.length){
        ElMessage.warning('请先选择源文件（图谱文件台账）：未读取到该文件的积分结果（峰号 / 保留时间 / 相对峰面积）');
        return;
      }
      // 手动指定的参考峰（上一轮指定过、且参考峰号仍存在于本次识别结果内）：作为锚点保留，重算不覆盖
      const manualMap = {};
      (spectrumPeaks.value || []).forEach(r=>{
        if(!r || !r._refManual) return;
        const no = String(r.谱图峰号 || '').trim();
        const ref = String(r.参考峰 || '').trim();
        if(no && ref && peaks.find(x=> String(x.谱图峰号 || '') === ref)) manualMap[no] = ref;
      });
      const res = spectrumComputeRows(peaks, formModel['漂移规则'], manualMap);
      spectrumRefPeak.value = res.mainPeakNo;
      spectrumPeaks.value = res.rows;
      spectrumCalcDone.value = true;
      spectrumNoRule.value = res.noRule;
      if(res.noRule){
        ElMessage.warning('已识别 ' + peaks.length + ' 个峰；未匹配到规则方案（需选择物料与色谱柱型号，或维护对应漂移规则）');
        return;
      }
      const outCount = res.rows.filter(r=> r.匹配异常说明==='超出有效范围').length;
      const settledCount = res.rows.filter(r=> spectrumRowSettled(r)).length;
      ElMessage.success('已识别 ' + res.rows.length + ' 个峰并完成相对保留时间计算（参考峰自动推导，' + settledCount + ' 个峰已定住，' + outCount + ' 个峰超出有效取值范围）');
    }

    // 重新计算（锁定版）：以页面当前数据为基准，只重算未锁定的峰；
    // 锁定峰保留已确认结果、按锁定前性质继续约束其他峰（当尺子 / 占用就近列），收尾再清参考峰与做顺序检查
    function recalcSpectrum(){
      const cur = (spectrumPeaks.value || []).map(r=> Object.assign({}, r));
      if(!cur.length){ ElMessage.warning('请先点击「识别 + 计算」生成识别结果'); return; }
      const wins = spectrumWindows();
      if(!wins.length){
        ElMessage.warning('未匹配到对应的数据台账（当前规则方案内没有可用的典型保留时间配置），无法重新计算');
        return;
      }
      const noOf = r=> String((r && r.谱图峰号) || '').trim();
      const isLocked = r=> String(r.是否锁定 || '') === '是';
      const isNew = r=> String(r.是否新杂 || '') === '是';
      const nameOf = r=> String((r && (r.检验项名称 || r.对应定性结构)) || '').trim();
      const trOf = r=> String(r.对应典型保留时间 || '').trim();
      const numOr = (v, d)=> Number.isFinite(Number(v)) ? Number(v) : d;

      // ① 锁定峰占用的「就近列」不可重复（已经是新增列的锁定峰不占列）
      const usedTR = new Set();
      const dup = [];
      cur.filter(r=> isLocked(r) && !isNew(r)).forEach(r=>{
        const tr = trOf(r);
        if(!tr || tr === '—') return;
        if(usedTR.has(tr)) dup.push(tr); else usedTR.add(tr);
      });
      if(dup.length){
        ElMessage.error('锁定峰的对应典型保留时间不可重复（' + Array.from(new Set(dup)).join('、') + '），请先调整后再重新计算');
        return;
      }

      // ② 主峰只在未锁定的峰里找：先取组分名带「主峰」的，没有再取浓度（峰面积）最大的
      const unlocked = cur.filter(r=> !isLocked(r));
      if(!unlocked.length){
        ElMessage.warning('浓度为空或主峰不存在（所有峰都已锁定，选不出主峰），重新计算已停止');
        return;
      }
      const namedMain = unlocked.filter(r=> nameOf(r).indexOf('主峰') >= 0);
      const pool = namedMain.length ? namedMain : unlocked;
      const mainRow = pool.reduce((a, b)=> numOr(b.谱图峰面积, 0) > numOr(a.谱图峰面积, 0) ? b : a, pool[0]);
      const mainPeakNo = noOf(mainRow);
      // 主峰的基准值：优先按它的组分名在台账里对到的那一列；对不上再用台账主峰列
      const mainWinNamed = nameOf(mainRow)
        ? wins.find(w=> String(w.定性结构 || '').trim() === nameOf(mainRow))
        : null;
      const mainWin = mainWinNamed || wins.find(w=> w.是否主峰) || wins[wins.length - 1];
      const mainTR = driftNum(mainWin && mainWin.典型保留时间);
      const newLim = spectrumDemoNewLimits();

      // ③ 未锁峰的保留例外：已有组分名且本来就是新增列 → 结果留着、不再换算
      //    但若它名字能对上台账、或它被选为本次主峰 → 按台账重新钉一次（走正常计算）
      const winByName = name => name ? wins.find(w=> String(w.定性结构 || '').trim() === name) : null;
      const preserved = new Map();
      cur.filter(r=> !isLocked(r) && nameOf(r) && isNew(r)).forEach(r=>{
        const no = noOf(r);
        const canRepin = !!winByName(nameOf(r)) || no === mainPeakNo;
        if(!canRepin) preserved.set(no, r);
      });

      // ④ 参与计算的行：未锁定且非保留（清空重算） + 全部锁定行（沿用页面值）
      const blank = r=> ({
        谱图峰号: noOf(r),
        谱图保留时间: numOr(r.谱图保留时间, 0),
        谱图峰面积: numOr(r.谱图峰面积, 0),
        检验项名称: String(r.检验项名称 || '').trim(),
        是否主峰: noOf(r) === mainPeakNo ? '是' : '否',
        参考峰: '',
        相对保留时间: '—',
        对应典型保留时间: '',
        对应定性结构: '',
        典型保留时间: String(r.是否新杂 || '') === '是' ? String(r.典型保留时间 || '').trim() : '',
        有效取值范围: '',
        是否锁定: '否',
        是否新杂: '否',
        杂质指标: '—',
        杂质偏差结论: '—',
        匹配异常说明: '/',
        _rrt: null,
        _qualified: false
      });
      const calcRows = [];
      const lockedNos = new Set();
      cur.forEach(r=>{
        const no = noOf(r);
        if(isLocked(r)){
          const b = Object.assign({}, r, { _locked: true, 是否主峰: '否', _rrt: driftNum(r.相对保留时间) });
          if(isNew(r)){
            b._lockKind = 'new';       // 已是新增列：不占就近列、不能当尺子
          } else if(nameOf(r)){
            b.是否新杂 = '是';          // 有组分名但不是新增列 → 改记成新增列，不能当尺子，就近列仍占用
            b._lockKind = 'named';
          } else {
            b._lockKind = 'plain';     // 无组分名、非新增列 → 可当尺子，就近列占用
          }
          calcRows.push(b);
          lockedNos.add(no);
          return;
        }
        if(preserved.has(no)) return;
        calcRows.push(blank(r));
      });

      // ⑤ 按方向式规则重推参考峰与匹配（锁定行冻结）
      const manualMap = {};
      cur.forEach(r=>{
        if(!isLocked(r) && r._refManual && String(r.参考峰 || '').trim()){
          manualMap[noOf(r)] = String(r.参考峰).trim();
        }
      });
      const rows = spectrumAutoAssignRefs(calcRows, wins, newLim, mainTR, mainPeakNo, manualMap, lockedNos);

      // ⑥ 合并保留行（原样回填，保持原行序）
      const byNo = new Map(rows.map(r=> [noOf(r), r]));
      const merged = cur.map(r=> preserved.has(noOf(r)) ? Object.assign({}, r) : (byNo.get(noOf(r)) || r));

      // ⑦ 收尾：锁定峰清空「参考峰」（参考关系仍在，只是不再显示最后拿哪一峰做除法）；
      //    仍有就近时间的锁定峰做一次顺序检查——小于前面某个非新增列的时间时，改判新增列并收 4 位小数
      const finalRows = merged.map(r=> Object.assign({}, r));
      finalRows.forEach(r=>{ if(isLocked(r)) r.参考峰 = ''; });
      let lastTR = null;
      finalRows.forEach(r=>{
        const tr = driftNum(trOf(r));
        if(tr == null) return;
        if(isLocked(r) && lastTR != null && tr < lastTR){
          r.是否新杂 = '是';
          r.对应典型保留时间 = Number(tr).toFixed(4);
        }
        if(String(r.是否新杂 || '') !== '是') lastTR = tr;
      });
      applySpectrumOrderAnomaly(finalRows);
      fillSpectrumItemNames(finalRows);
      spectrumPeaks.value = finalRows;
      spectrumCalcDone.value = true;
      spectrumNoRule.value = false;
      const outCount = finalRows.filter(r=> r.匹配异常说明 === '超出有效范围').length;
      ElMessage.success('已按页面当前数据重新计算（仅重算未锁定峰，锁定峰 ' + lockedNos.size + ' 个保留原结果），' +
        (finalRows.length - outCount) + ' 个峰参与匹配，' + outCount + ' 个峰超出有效取值范围');
    }
    function resetSpectrumCalc(){ spectrumPeaks.value = []; spectrumCalcDone.value = false; spectrumNoRule.value = false; spectrumNoteVisible.value = true; spectrumRefPeak.value = ''; }

// ===== 图谱识别 · 源文件（MOCK['spectrum-file'] 图谱文件台账）=====
    // 图谱文件一次上传一条记录；被图谱识别任务引用后置「已使用」，不可被再次选择
    const specFilePickVisible = ref(false);
    const specFilePickId = ref('');
    const specFileKw = ref('');
    const specFileStatus = ref('未使用');
    const specFilePreviewVisible = ref(false);
    const specFilePreviewRow = ref(null);
    const qrSpecPreviewVisible = ref(false);
    const qrSpecPreviewSampleNo = ref('');
    const qrSpecPreviewFiles = ref([]);

    function spectrumFileRows(){
      return (((MOCK['spectrum-file'] || {}).main) || []).slice();
    }
    function specPeaksOf(row){
      const list = (row && Array.isArray(row._peaks)) ? row._peaks : [];
      return list.map(p=> ({
        峰号: String(p.序号 == null ? '' : p.序号),
        保留时间: Number(p.保留时间),
        相对峰面积: Number(p.相对峰面积 == null ? p.峰面积 : p.相对峰面积)
      })).filter(p=> Number.isFinite(p.保留时间));
    }
    function specPolylineOf(row, height){
      const list = specPeaksOf(row);
      if(!list.length) return '';
      const h = height || 190;
      const maxRt = Math.max(...list.map(p=> p.保留时间)) || 1;
      const maxA = Math.max(...list.map(p=> p.相对峰面积)) || 1;
      const X = rt => 40 + (rt / maxRt) * 660;
      const Y = a => h - Math.max(3, Math.sqrt(Math.max(a, 0) / maxA) * (h - 45));
      const pts = ['40,'+h];
      list.forEach((p, i)=>{
        const x = X(p.保留时间), y = Y(p.相对峰面积);
        const nextX = (i < list.length - 1) ? X(list[i + 1].保留时间) : 700;
        const half = Math.max(2.5, (nextX - x) * 0.18);
        pts.push((x - half).toFixed(1) + ',' + h);
        pts.push(x.toFixed(1) + ',' + y.toFixed(1));
        pts.push((x + half).toFixed(1) + ',' + h);
      });
      pts.push('700,'+h);
      return pts.join(' ');
    }
    function qrIssueSampleSpectra(row){
      const no = String((row && row['样品编号']) || '').trim();
      const lot = String((row && row['物料批号']) || '').trim();
      const files = spectrumFileRows();
      let list = files.filter(f=> {
        const sn = String(f['样本编号'] || f['样品编号'] || '').trim();
        return no && sn && sn === no;
      });
      if(!list.length && lot){
        list = files.filter(f=> String(f['批号'] || '').trim() === lot);
      }
      if(!list.length && files.length){
        list = files.slice(0, Math.min(3, files.length)).map((f, i)=> Object.assign({}, f, {
          id: String(f.id || 'sf') + '-qr-' + (no || 'x') + '-' + i,
          样本编号: no || f['样本编号'] || '',
          批号: lot || f['批号'] || '',
          _demoBound: true
        }));
      }
      return list;
    }
    function openQrIssueSpecPreview(row){
      const no = String((row && row['样品编号']) || '').trim();
      if(!no){ ElMessage.warning('请先选择样品编号'); return; }
      qrSpecPreviewSampleNo.value = no;
      qrSpecPreviewFiles.value = qrIssueSampleSpectra(row);
      qrSpecPreviewVisible.value = true;
    }
    const SPECTRUM_LEDGER_UPLOAD_DEMOS = [
      { name:'TL-A026 25I27-15-熔料 M 客户方法.pdf', mat:'OLED-HOST-BL-01', lot:'25I27-15', col:'P-7101B', inst:'EQ-HPLC-01', path:'/data/LIMS/图谱/HPLC3/TL-A026 25I27-15-熔料 M 客户方法.pdf' },
      { name:'TL-A026 25I27-16-熔料 M 客户方法.pdf', mat:'OLED-HOST-BL-01', lot:'25I27-16', col:'P-7101B', inst:'EQ-HPLC-01', path:'/data/LIMS/图谱/HPLC3/TL-A026 25I27-16-熔料 M 客户方法.pdf' },
      { name:'HPLC-2.pdf', mat:'OLED-HOST-RD-01', lot:'20250412', col:'BEH-C18-130A', inst:'EQ-HPLC-01', path:'/data/LIMS/图谱/品质/HPLC/HPLC-2.pdf' },
      { name:'HPLC-3.pdf', mat:'OLED-DOP-BL-01', lot:'20250416', col:'Amide-1.7', inst:'EQ-HPLC-01', path:'/data/LIMS/图谱/品质/HPLC/HPLC-3.pdf' },
      { name:'HPLC-4.pdf', mat:'OLED-DOP-RD-01', lot:'20250418', col:'Gow-mac592', inst:'EQ-HPLC-01', path:'/data/LIMS/图谱/品质/HPLC/HPLC-4.pdf' }
    ];
    function pickSpectrumLedgerUpload(){
      const used = new Set((((MOCK['spectrum-file']||{}).main)||[]).map(r=> String(r['文件名']||'')));
      const hit = SPECTRUM_LEDGER_UPLOAD_DEMOS.find(d=> !used.has(d.name)) || SPECTRUM_LEDGER_UPLOAD_DEMOS[0];
      if(!hit){ ElMessage.warning('暂无可选演示文件'); return; }
      const src = spectrumFileRows().find(r=> r['文件名']===hit.name) || {};
      formModel['上传文件'] = hit.name;
      formModel['文件名'] = hit.name;
      formModel['文件路径'] = hit.path || src['文件路径'] || ('/data/LIMS/图谱/' + hit.name);
      formModel['物料编码'] = hit.mat;
      formModel['批号'] = hit.lot;
      formModel['仪器编号'] = hit.inst;
      formModel['色谱柱型号'] = hit.col;
      formModel['上传时间'] = nowStamp().slice(0, 16);
      formModel._peaks = Array.isArray(src._peaks) ? JSON.parse(JSON.stringify(src._peaks)) : [];
      formModel['图谱使用状态'] = '未使用';
      ElMessage.success('Demo：已选择文件「'+hit.name+'」并自动带出字段');
    }
    function saveSpectrumFileForm(){
      const fields = activeFormFields.value || [];
      if(!qcCheckRequired(fields)) return;
      if(!String(formModel['文件名']||'').trim()){ ElMessage.warning('请先上传文件'); return; }
      const bag = (MOCK['spectrum-file'] = MOCK['spectrum-file'] || {});
      const list = (bag.main = bag.main || []);
      const name = String(formModel['文件名']||'').trim();
      if(list.some(r=> String(r['文件名']||'')===name)){ ElMessage.warning('文件名「'+name+'」已存在'); return; }
      const row = {
        id: 'sf-' + Date.now().toString(36),
        图谱使用状态: '未使用',
        物料编码: formModel['物料编码'] || '',
        批号: formModel['批号'] || '',
        仪器编号: formModel['仪器编号'] || '',
        色谱柱型号: formModel['色谱柱型号'] || '',
        上传时间: formModel['上传时间'] || nowStamp().slice(0, 16),
        文件名: name,
        文件路径: formModel['文件路径'] || '',
        样本编号: formModel['样本编号'] || '',
        _peaks: Array.isArray(formModel._peaks) ? JSON.parse(JSON.stringify(formModel._peaks)) : []
      };
      list.unshift(row);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('已新增图谱文件，可在谱图识别中选择');
    }
    function spectrumFileById(fileId){
      const id = String(fileId || '').trim();
      if(!id) return null;
      return (((MOCK['spectrum-file'] || {}).main) || []).find(r=> String(r.id || '') === id) || null;
    }
    function spectrumFileStatusOf(row){
      return String((row && row['图谱使用状态']) || '未使用') === '已使用' ? '已使用' : '未使用';
    }
    const spectrumFilePickRows = computed(()=>{
      storeTick.value;
      const kw = String(specFileKw.value || '').trim().toLowerCase();
      const st = String(specFileStatus.value || '').trim();
      return spectrumFileRows()
        .filter(r=> !st || spectrumFileStatusOf(r) === st)
        .sort((a, b)=> (spectrumFileStatusOf(a) === '未使用' ? 0 : 1) - (spectrumFileStatusOf(b) === '未使用' ? 0 : 1))
        .filter(r=>{
          if(!kw) return true;
          const text = [r['文件名'], r['物料编码'], r['批号'], r['仪器编号'], r['色谱柱型号'], r['文件路径']]
            .map(v=> String(v || '')).join(' ');
          return text.toLowerCase().includes(kw);
        });
    });
    function openSpectrumFilePick(){
      if(formMode.value==='detail') return;
      if(!String(formModel['检验类型'] || '').trim()){
        ElMessage.warning('请先选择检验类型，再选择源文件');
        return;
      }
      specFileKw.value = '';
      specFileStatus.value = '未使用';
      specFilePickId.value = String(formModel._srcFileId || '');
      specFilePickVisible.value = true;
    }
    function onSpectrumFileRowPick(row){
      if(!row) return;
      if(spectrumFileStatusOf(row) === '已使用'){ ElMessage.warning('该图谱文件已被使用，不可重复选择'); return; }
      specFilePickId.value = String(row.id || '');
    }
    // 预览弹窗：按文件固定的 _peaks 生成谱图与峰表（同一文件每次一致）
    const specPreviewPeaks = computed(()=> specPeaksOf(specFilePreviewRow.value));
    const specPreviewPolyline = computed(()=> specPolylineOf(specFilePreviewRow.value, 220));
    function previewSpectrumFile(row){
      if(!row) return;
      specFilePreviewRow.value = row;
      specFilePreviewVisible.value = true;
    }
    function confirmSpectrumFilePick(){
      const row = spectrumFileRows().find(r=> String(r.id || '') === String(specFilePickId.value || ''));
      if(!row){ ElMessage.warning('请选择一条源文件'); return; }
      if(spectrumFileStatusOf(row) === '已使用'){ ElMessage.warning('该图谱文件已被使用，不可重复选择'); return; }
      applySpectrumSourceFile(row);
      specFilePickVisible.value = false;
    }
    // 选中源文件 → 文件名称 / 批号 / 仪器编号+仪器名称 / 色谱柱型号 / 物料四要素
