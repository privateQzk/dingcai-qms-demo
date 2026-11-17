    function deleteDriftRows(idsOpt){
      const ids = new Set(idsOpt || selectedIds.value);
      if(!ids.size){ ElMessage.warning('请先勾选要删除的规则'); return; }
      const list = driftRowsOf();
      const used = list.filter(r=> ids.has(r.id) && r._ref);
      if(used.length){ ElMessage.warning('此数据正在使用，不可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条规则？','批量删除',{type:'warning'}).then(()=>{
        for(let i=list.length-1;i>=0;i--){ if(ids.has(list[i].id)) list.splice(i,1); }
        selectedIds.value=[]; bumpStore(); ElMessage.success('已删除 '+ids.size+' 条规则');
      }).catch(()=>{});
    }
    function onDriftToolbar(btn){
      if(btn.name==='新增'){ openDriftForm('add'); return true; }
      if(btn.name==='批量删除'){ deleteDriftRows(); return true; }
      if(btn.name==='导入' || btn.name==='导入数据'){ importVisible.value=true; return true; }
      if(btn.name==='导出' || btn.name==='导出数据'){ exportVisible.value=true; return true; }
      return false;
    }

    /** 谱图识别（np-0208-03）：对齐 OLED「图谱识别」——单列表；源文件取自图谱文件台账；按 物料编码 + 色谱柱型号（+ 检验类型）匹配漂移规则；识别 + 计算 */
    const SPI_PAGE = 'np-0208-03';
    const SPI_YN = ['是','否'];
    const isSpiForm = computed(()=> pageId.value===SPI_PAGE && ['add','edit'].includes(formMode.value));
    const SPI_FIELD_KEYS = ['检验类型','源文件','文件名称','规则分类','物料编码','物料名称','物料规格','物料种类','色谱柱型号','色谱柱编号','仪器编号','仪器名称','批号','漂移规则','备注'];
    function spiBag(){
      if(!MOCK[SPI_PAGE]) MOCK[SPI_PAGE] = {};
      const b = MOCK[SPI_PAGE];
      if(!Array.isArray(b.main)) b.main = [];
      // 旧版 GC/LC 页签缓存字段口径不同（采样点 / 谱图流水…），直接丢弃
      ['tab-1','tab-2'].forEach(t=>{ if(b[t]) delete b[t]; });
      return b;
    }
    function spiRowsOf(){ return spiBag().main; }

// ===== 谱图识别 识别+计算（移植自 OLED spectrum-calc.js，漂移规则取 np-0208-02）=====
    const spectrumPeaks = ref([]);
    const spectrumCalcDone = ref(false);
    // 本次识别是否「未匹配到规则方案」（用于列表上方常驻提示，避免只靠一句 toast）
    const spectrumNoRule = ref(false);
    const spectrumNoteVisible = ref(true);
    const spectrumCols = [
      { prop: '谱图峰号', label: '谱图峰号', req: true, tag: '识别填充', tagType: 'primary', width: 96, editable: false },
      { prop: '谱图保留时间', label: '谱图保留时间', req: true, tag: '识别填充', tagType: 'primary', width: 130, editable: true },
      { prop: '谱图峰面积', label: '谱图峰面积', req: true, tag: '识别填充', tagType: 'primary', width: 120, editable: true },
      { prop: '检验项名称', label: '检验项名称', req: false, tag: '自动带出', tagType: 'success', width: 120, editable: false },
      { prop: '是否主峰', label: '是否主峰', req: true, tag: '自动判断', tagType: 'warning', width: 96, type: 'select' },
      { prop: '参考峰', label: '参考峰', req: true, tag: '自动判断', tagType: 'info', width: 176, type: 'select-ref' },
      { prop: '相对保留时间', label: '相对保留时间', req: true, tag: '自动计算', tagType: 'primary', width: 130, editable: true },
      { prop: '对应典型保留时间', label: '对应典型保留时间', req: false, tag: '自动匹配', tagType: 'success', width: 168, type: 'select-tr' },
      { prop: '有效取值范围', label: '有效取值范围', req: false, tag: '自动带入', tagType: 'primary', width: 150, editable: false },
      { prop: '对应定性结构', label: '对应定性结构', req: false, tag: '自动匹配', tagType: 'success', width: 130, editable: false },
      { prop: '典型保留时间', label: '典型保留时间', req: false, tag: '新杂可填', tagType: 'warning', width: 130, type: 'tr-new' },
      { prop: '是否锁定', label: '是否锁定', req: false, tag: '默认为否', tagType: 'info', width: 96, type: 'select' },
      { prop: '是否新杂', label: '是否新杂', req: false, tag: '自动匹配', tagType: 'success', width: 96, type: 'select' },
      { prop: '杂质指标', label: '杂质指标', req: false, tag: '自动代入', tagType: 'primary', width: 150, editable: false },
      { prop: '杂质偏差结论', label: '杂质偏差结论', req: false, tag: '自动判断', tagType: 'warning', width: 112, editable: false },
    ];
    // 参考峰：相对保留时间的计算基准（默认主峰；逐行独立选择，改一行只重算该行，不影响其他行）
    const spectrumRefPeak = ref('');
    const spectrumRefOptions = computed(()=> (spectrumPeaks.value || []).map(r=> ({
      value: String(r.谱图峰号 || ''),
      label: String(r.谱图峰号 || '') + (String(r.是否主峰 || '') === '是' ? '（主峰）' : '')
    })).filter(o=> o.value));
    // 主峰峰号：优先「是否主峰＝是」的行中峰面积最大者，其次整表峰面积最大者
    function spectrumMainPeakNoOf(rows){
      const list = (rows || []).filter(r=> String((r && r.谱图峰号) || '').trim());
      if(!list.length) return '';
      const mains = list.filter(r=> String(r.是否主峰 || '') === '是');
      const pool = mains.length ? mains : list;
      const peak = pool.reduce((a, b)=> (Number(b.谱图峰面积) || 0) > (Number(a.谱图峰面积) || 0) ? b : a, pool[0]);
      return String(peak.谱图峰号 || '').trim();
    }
    // 参考峰折算因子（口径 A）：f = 参考峰典型保留时间 ÷ 参考峰谱图保留时间
    // 参考峰的典型保留时间取该行「对应典型保留时间」首值（参考峰必须是已定住的峰），缺失时回退主峰典型保留时间
    function spectrumFactorOf(refNo, allPeaks, mainTR, mainPeakNo){
      const no = String(refNo || '').trim();
      const list = allPeaks || [];
      const refRow = list.find(p=> String(p.谱图峰号 || '') === no)
        || list.find(p=> String(p.谱图峰号 || '') === String(mainPeakNo)) || {};
      const rt = Number(refRow.谱图保留时间);
      let refTR = driftNum(String(refRow.对应典型保留时间 || '').split(',')[0]);
      if(refTR == null) refTR = mainTR;
      if(!Number.isFinite(rt) || !rt || refTR == null) return 1;
      return refTR / rt;
    }
    // 单行计算（纯函数）：按该行自己的「参考峰」算相对保留时间与匹配结果
    function spectrumCalcRow(basis, allPeaks, wins, newLim, mainTR, mainPeakNo){
      const rt = Number(basis.谱图保留时间);
      const area = Number(basis.谱图峰面积);
      const refNo = String(basis.参考峰 || '').trim() || String(mainPeakNo || '');
      const factor = spectrumFactorOf(refNo, allPeaks, mainTR, mainPeakNo);
      const rrt = Number.isFinite(rt) ? Number((rt * factor).toFixed(4)) : null;
      const base = {
        谱图峰号: String(basis.谱图峰号 || ''),
        谱图保留时间: Number.isFinite(rt) ? rt.toFixed(3) : String(basis.谱图保留时间 || ''),
        谱图峰面积: Number.isFinite(area) ? area.toFixed(4) : String(basis.谱图峰面积 || ''),
        检验项名称: String(basis.检验项名称 || '').trim(),
        是否主峰: String(basis.是否主峰 || '') === '是' ? '是' : '否',
        参考峰: refNo,
        相对保留时间: rrt == null ? '—' : rrt.toFixed(4),
        对应典型保留时间: '',
        对应定性结构: '',
        典型保留时间: String(basis.典型保留时间 || '').trim(),
        有效取值范围: '',
        是否锁定: '否',
        是否新杂: '否',
        杂质指标: '—',
        杂质偏差结论: '—',
        匹配异常说明: '/',
        _rrt: rrt,
        _qualified: false
      };
      if(rrt == null) return base;
      // 逐一判断该峰的相对保留时间是否落在某典型保留时间的有效取值范围内
      const hits = (wins || []).filter(w=> rrt >= w.下限 - 1e-9 && rrt <= w.上限 + 1e-9);
      if(!hits.length){
        // 不在任何有效取值范围内 → 不参与自动匹配，无法匹配到结果值（按新杂处理）
        base.匹配异常说明 = '超出有效范围';
        base.是否新杂 = '是';
        base.典型保留时间 = String(basis.典型保留时间 || '').trim();
        base.杂质指标 = 'UCL<' + newLim.ucl + '，LCL>' + newLim.lcl;
        base.杂质偏差结论 = (Number.isFinite(area) && area > newLim.ucl) ? '异常' : '正常';
        return base;
      }
      const w = hits[0];
      base.对应典型保留时间 = hits.map(h=> h.典型保留时间.toFixed(3)).join(',');
      base.对应定性结构 = w.定性结构 || '';
      // 检验项名称：优先沿用手工值，否则取匹配到的定性结构；主峰无结构时由后续统一补「主峰N」
      if(!base.检验项名称 && w.定性结构) base.检验项名称 = String(w.定性结构 || '').trim();
      base.典型保留时间 = '';
      base.有效取值范围 = hits.map(h=> h.下限.toFixed(4) + '~' + h.上限.toFixed(4)).join(' / ');
      base.是否锁定 = (w.是否主峰 || (w.定性结构 && w.定性结构 === basis.定性结构)) ? '是' : '否';
      base.杂质指标 = spectrumImpIndexText(w);
      // 已定性（主峰，或唯一命中带定性结构的典型保留时间）：身份已确定，不需要参考峰作尺子 → 该字段留空
      const qualified = !basis._refManual && (
        String(basis.是否主峰 || '') === '是'
        || (hits.length === 1 && !!String(w.定性结构 || '').trim())
      );
      base._qualified = !!qualified;
      if(qualified) base.参考峰 = '';
      if(hits.length > 1){
        base.匹配异常说明 = '重复匹配（' + base.对应典型保留时间 + '）';
        base.是否锁定 = '否';
        base.杂质偏差结论 = '正常';
        return base;
      }
      base.杂质偏差结论 = '正常';
      return base;
    }
    // 已定住：匹配到典型保留时间（对应典型保留时间有值）且未被判定为新杂
    function spectrumRowSettled(row){
      if(!row) return false;
      const tr = String(row.对应典型保留时间 || '').trim();
      if(!tr || tr === '—') return false;
      return String(row.是否新杂 || '') !== '是';
    }
    // 找参考峰：先按「已定性峰」确定方向（比较保留时间距离），再沿该方向取紧邻的可用峰作尺子
    //   1）方向侧按保留时间由近到远扫：遇到新杂 → 跳过继续；遇到未算完（无典型保留时间）→ 本轮阻塞，等它算完
    //   2）方向侧全被跳过（全新杂/无峰）→ 换反方向；仍无 → 返回空（本轮不处理）
    //   3）没有任何已定性峰时，左右各取最近可用峰比距离，等距取保留时间更小的一侧
    // usableNos：已算完且非新杂、可作尺子的峰号；qualifiedRows：已定性峰行；newImpNos：已判定为新杂的峰号
    function spectrumPickRefRow(row, rows, usableNos, qualifiedRows, newImpNos){
      const curRt = Number(row && row.谱图保留时间);
      if(!Number.isFinite(curRt)) return null;
      const curNo = String((row && row.谱图峰号) || '').trim();
      const cand = (rows || []).filter(r=>{
        if(!r) return false;
        const no = String(r.谱图峰号 || '').trim();
        if(!no || no === curNo) return false;
        return Number.isFinite(Number(r.谱图保留时间));
      });
      const sideScan = rightSide => {
        const list = cand
          .filter(r=> rightSide ? Number(r.谱图保留时间) > curRt : Number(r.谱图保留时间) < curRt)
          .sort((a, b)=> Math.abs(Number(a.谱图保留时间) - curRt) - Math.abs(Number(b.谱图保留时间) - curRt));
        for(const r of list){
          const no = String(r.谱图峰号 || '').trim();
          if(newImpNos && newImpNos.has(no)) continue;            // 新杂 → 跳过，继续朝同方向找
          if(!usableNos || !usableNos.has(no)) return { blocked: true, row: null };  // 未算完 → 等它算完
          return { blocked: false, row: r };
        }
        return { blocked: false, row: null };
      };
      // 1) 方向：离得最近的已定性峰
      const quals = (qualifiedRows || []).filter(r=> String((r && r.谱图峰号) || '').trim() !== curNo
        && Number.isFinite(Number(r && r.谱图保留时间)));
      if(quals.length){
        const q = quals.reduce((a, b)=> Math.abs(Number(b.谱图保留时间) - curRt) < Math.abs(Number(a.谱图保留时间) - curRt) ? b : a, quals[0]);
        const dirRight = Number(q.谱图保留时间) > curRt;
        const main = sideScan(dirRight);
        if(main.row) return main.row;
        if(main.blocked) return null;              // 方向侧有未算完的峰 → 本轮先跳过
        const other = sideScan(!dirRight);
        return other.row || null;
      }
      // 2) 无已定性峰：左右各取最近可用峰比距离，等距取左
      const l = sideScan(false), r2 = sideScan(true);
      if(l.row && r2.row){
        const dl = curRt - Number(l.row.谱图保留时间);
        const dr = Number(r2.row.谱图保留时间) - curRt;
        return dl <= dr ? l.row : r2.row;
      }
      return l.row || r2.row || null;
    }
    // 当前峰与参考峰之间紧挨着的那一个峰（朝参考峰方向的下一个峰）；新版方向式取尺已内联在 pick 中，此函数保留备用
    function spectrumNeighborTowards(row, refRow, rows){
      const curRt = Number(row && row.谱图保留时间);
      const refRt = Number(refRow && refRow.谱图保留时间);
      if(!Number.isFinite(curRt) || !Number.isFinite(refRt)) return null;
      const curNo = String((row && row.谱图峰号) || '').trim();
      const lo = Math.min(curRt, refRt);
      const hi = Math.max(curRt, refRt);
      const between = (rows || []).filter(r=>{
        if(!r || String(r.谱图峰号 || '').trim() === curNo) return false;
        const rt = Number(r.谱图保留时间);
        return Number.isFinite(rt) && rt > lo && rt < hi;
      });
      if(!between.length) return null;
      const sorted = between.slice().sort((a, b)=> Number(a.谱图保留时间) - Number(b.谱图保留时间));
      return refRt > curRt ? sorted[0] : sorted[sorted.length - 1];
    }
    // 自动推导参考峰：主峰为种子 → 每轮为未定住的峰取「最近已定住峰」作尺子 → 算完即加入种子，直到无进展
    // 手动指定的行不参与推导（冻结），数值最后用手动尺子覆盖；_autoRef 始终保留算法值，供「交回自动」恢复
    function spectrumAutoAssignRefs(rows, wins, newLim, mainTR, mainPeakNo, manualMap, lockedNos){
      const noOf = r=> String((r && r.谱图峰号) || '').trim();
      const mainNo = String(mainPeakNo || '').trim();
      const list = (rows || []).map(r=> Object.assign({}, r, { _autoRef: '', _refManual: false }));
      const apply = (row, refNo)=>{
        const calc = spectrumCalcRow(Object.assign({}, row, { 参考峰: refNo }), list, wins, newLim, mainTR, mainPeakNo);
        Object.assign(row, calc, { _autoRef: calc._qualified ? '' : refNo });
        return row;
      };
      // 第 0 轮：锁定峰保留页面原值（不重算、不重匹配），其余以主峰为基准，得到初始三类划分
      list.forEach(r=>{
        if(lockedNos && lockedNos.has(noOf(r))){ r._locked = true; return; }
        apply(r, mainNo);
      });
      const collect = ()=>{
        const usable = new Set();     // 可作尺子：已算完且非新杂
        const newImp = new Set();     // 新杂：跳过，不阻挡
        list.forEach(r=>{
          const no = noOf(r);
          if(!no) return;
          if(spectrumRowSettled(r)) usable.add(no);
          if(String(r.是否新杂 || '') === '是') newImp.add(no);
        });
        const quals = list.filter(r=> r._qualified);
        return { usable, newImp, quals };
      };
      // 逐轮扩散：每轮按「最近已定性峰定方向 → 沿该方向取紧邻可用峰」为未定住的峰找尺子
      const maxRound = Math.max(4, list.length * 4);
      for(let round = 0; round < maxRound; round++){
        let progressed = false;
        const ctx = collect();
        list.forEach(r=>{
          const no = noOf(r);
          if(!no || r._qualified || r._refManual || r._locked) return;
          if(ctx.usable.has(no)) return;      // 已定住的不在阶段 1 改，留到阶段 2 统一重取
          const ref = spectrumPickRefRow(r, list, ctx.usable, ctx.quals, ctx.newImp);
          if(!ref) return;                    // 方向侧有未算完的峰 → 本轮跳过，等下一轮
          const refNo = noOf(ref);
          if(String(r._autoRef || '') === refNo) return;
          apply(r, refNo);
          progressed = true;
        });
        if(!progressed) break;
      }
      // 阶段 2：扩散收敛后，按最终「已定住」集合为每一行重取参考峰（就近规则统一生效）
      // 阶段 1 只决定「哪些峰已定住」，参考峰仍是第 0 轮的主峰基准；这里统一改成就近尺子，
      // 否则参考峰列会全部显示主峰。用阶段 1 结束时的快照计算，保证结果与遍历顺序无关。
      const snap = list.map(r=> Object.assign({}, r));
      const ctx2 = {
        usable: new Set(snap.filter(r=> spectrumRowSettled(r)).map(noOf).filter(Boolean)),
        newImp: new Set(snap.filter(r=> String(r.是否新杂 || '') === '是').map(noOf).filter(Boolean)),
        quals: snap.filter(r=> r._qualified)
      };
      list.forEach((r, i)=>{
        if(r._refManual) return;
        if(r._locked) return;              // 锁定峰整体冻结
        if(r._qualified) return;           // 已定性 → 参考峰留空，不找尺子
        const no = noOf(r);
        if(!no || no === mainNo) return;   // 主峰作全局基准，参考峰保留自身
        const ref = spectrumPickRefRow(snap[i], snap, ctx2.usable, ctx2.quals, ctx2.newImp);
        if(!ref) return;
        const refNo = noOf(ref);
        if(String(r._autoRef || '') === refNo) return;
        const calc = spectrumCalcRow(Object.assign({}, snap[i], { 参考峰: refNo }), snap, wins, newLim, mainTR, mainPeakNo);
        Object.assign(r, calc, { _autoRef: refNo });
      });
      // 手动指定行：按手动参考峰覆盖数值（不影响 _autoRef，也不回溯其他行）
      list.forEach(r=>{
        const manual = manualMap ? manualMap[noOf(r)] : '';
        if(!manual) return;
        const calc = spectrumCalcRow(Object.assign({}, r, { 参考峰: String(manual), _refManual: true }), list, wins, newLim, mainTR, mainPeakNo);
        Object.assign(r, calc, { _refManual: true });
      });
      return list;
    }
    // 「对应典型保留时间」下拉选项：当前规则方案内已配置的典型保留时间（唯一值、升序），label 带定性结构
    function spectrumTROptions(curVal){
      const wins = spectrumWindows() || [];
      const map = new Map();
      wins.forEach(w=>{
        const tr = Number(w.典型保留时间);
        if(!Number.isFinite(tr)) return;
        const key = tr.toFixed(3);
        if(map.has(key)) return;
        const ds = String(w.定性结构 || '').trim();
        const mainTag = (w.是否主峰 && ds.indexOf('主峰') < 0) ? ' · 主峰' : '';
        map.set(key, { value: key, label: key + (ds ? '（' + ds + '）' : '') + mainTag });
      });
      const list = Array.from(map.values()).sort((a, b)=> Number(a.value) - Number(b.value));
      const cur = String(curVal == null ? '' : curVal).trim();
      // 当前值不在规则方案内（如重复匹配的多值、或规则已改）时补一项，避免下拉显示空白
      if(cur && !map.has(cur)) list.unshift({ value: cur, label: cur + '（当前值）' });
      return list;
    }
    // 手动选择「对应典型保留时间」：同步带出该时间对应的有效取值范围 / 定性结构 / 杂质指标
    function setSpectrumTypicalTR(row, val){
      if(!row) return;
      const rows = spectrumPeaks.value || [];
      const idx = rows.findIndex(r=> String(r.谱图峰号 || '') === String(row.谱图峰号 || ''));
      if(idx < 0) return;
      const v = String(val == null ? '' : val).trim();
      const wins = spectrumWindows() || [];
      const next = Object.assign({}, rows[idx]);
      if(!v){
        Object.assign(next, {
          对应典型保留时间: '',
          有效取值范围: '',
          对应定性结构: '',
          典型保留时间: next.典型保留时间 || '',
          是否锁定: '否',
          是否新杂: '是',
          杂质指标: '—',
          匹配异常说明: '未匹配到'
        });
      } else {
        const win = wins.find(w=> Number(w.典型保留时间).toFixed(3) === v);
        const struct = win ? (win.定性结构 || '') : '';
        Object.assign(next, {
          对应典型保留时间: v,
          有效取值范围: win ? (Number(win.下限).toFixed(4) + '~' + Number(win.上限).toFixed(4)) : '',
          对应定性结构: struct,
          检验项名称: String(next.检验项名称 || '').trim() || struct,
          典型保留时间: '',
          是否锁定: win && win.是否主峰 ? '是' : '否',
          是否新杂: '否',
          杂质指标: win ? spectrumImpIndexText(win) : '—',
          匹配异常说明: win ? '/' : '未匹配到'
        });
      }
      spectrumPeaks.value = rows.map((r, i)=> i === idx ? next : r);
      applySpectrumOrderAnomaly(spectrumPeaks.value);
      ElMessage.success('峰 ' + String(row.谱图峰号 || '') + (v ? (' 的对应典型保留时间已设为 ' + v) : ' 的对应典型保留时间已清空'));
    }
    // 顺序异常：跨行判断，任一行的参考峰/匹配结果变动后需整表重扫（仅刷新「顺序异常」标记）
    function applySpectrumOrderAnomaly(rows){
      let lastTr = null;
      (rows || []).forEach(r=>{
        if(!r) return;
        // 先清掉上一次的顺序异常标记，回到本行自身匹配结论
        if(r.匹配异常说明 === '顺序异常') r.匹配异常说明 = '/';
        const tr = r.对应典型保留时间 && r.对应典型保留时间 !== '—'
          ? driftNum(String(r.对应典型保留时间).split(',')[0]) : null;
        if(tr == null) return;
        if(lastTr != null && tr < lastTr && r.匹配异常说明 === '/') r.匹配异常说明 = '顺序异常';
        lastTr = tr;
      });
    }
    // 逐行改参考峰：选具体峰＝手动指定（本行冻结，不参与自动推导）；选「自动判定」＝交回算法
    function setSpectrumRefPeak(row, val){
      if(!row) return;
      const rows = spectrumPeaks.value || [];
      const idx = rows.findIndex(r=> String(r.谱图峰号 || '') === String(row.谱图峰号 || ''));
      if(idx < 0) return;
      const cur = rows[idx];
      const v = String(val || '').trim();
      const wins = spectrumWindows();
      let next;
      let msg;
      if(!v){
        // 交回自动判定：恢复自动推导给出的参考峰（算法值）；已定性的行保持为空，其余按当前整表就近取
        const noOf = r=> String((r && r.谱图峰号) || '').trim();
        let refNo = String(cur._autoRef || '').trim();
        if(!refNo && !cur._qualified){
          const usable = new Set();
          const newImp = new Set();
          rows.forEach(r=>{
            if(spectrumRowSettled(r)) usable.add(noOf(r));
            if(String(r.是否新杂 || '') === '是') newImp.add(noOf(r));
          });
          const quals = rows.filter(r=> r._qualified);
          const ref = spectrumPickRefRow(cur, rows, usable, quals, newImp);
          refNo = ref ? noOf(ref) : '';
        }
        next = Object.assign({}, cur, { 参考峰: refNo, _refManual: false });
        msg = '峰 ' + String(cur.谱图峰号 || '') + ' 已交回自动判定，参考峰＝峰 ' + (refNo || '—');
      } else {
        next = Object.assign({}, cur, { 参考峰: v, _refManual: true });
        const isMain = String(cur.是否主峰 || '') === '是' || String(cur.谱图峰号 || '') === v;
        msg = '峰 ' + String(cur.谱图峰号 || '') + ' 参考峰手动指定为峰 ' + v + (isMain ? '（主峰）' : '');
      }
      spectrumRefPeak.value = String(next.参考峰 || '');
      if(spectrumCalcDone.value && wins.length){
        const all = rows.map((r, i)=> i === idx ? next : Object.assign({}, r));
        const mainPeakNo = spectrumMainPeakNoOf(all);
        const mainWin = wins.find(w=> w.是否主峰) || wins[wins.length - 1];
        const mainTR = driftNum(mainWin && mainWin.典型保留时间);
        const calc = spectrumCalcRow(next, all, wins, spectrumDemoNewLimits(), mainTR, mainPeakNo);
        Object.assign(next, calc, { _autoRef: next._autoRef, _refManual: next._refManual });
      }
      spectrumPeaks.value = rows.map((r, i)=> i === idx ? next : r);
      applySpectrumOrderAnomaly(spectrumPeaks.value);
      if(!spectrumCalcDone.value || !wins.length){
        ElMessage.success(msg + '；点击「识别 + 计算」后按该参考峰计算相对保留时间');
      } else {
        ElMessage.success(msg + '，仅本行相对保留时间与匹配结果已重算');
      }
    }
    const spectrumNoteGroups = [
      { title: '数据备注 · 数据列表', items: [
        { no: '1', name: '数据源', desc: '1、点击【识别+计算】后，自动生成行数据' },
        { no: '2', name: '排序', desc: '1、根据「谱图保留时间」正序（由小 → 大）' },
      ]},
      { title: '数据备注 · 字段识别', items: [
        { no: '1', name: '谱图峰号', desc: '1、根据文件，识别自动填充，不可修改（编号）\n2、取文件积分结果表「序号」列（部分仪器为表格第一列），按顺序展示' },
        { no: '1-1', name: '字段映射', desc: '1、谱图峰号 ← 序号（表格第一列）\n2、谱图保留时间 ← 保留时间 min / 保留时间(分钟)\n3、谱图峰面积 ← 相对峰面积 % / %面积\n4、识别结果固定挂在该源文件下，重复识别结果一致' },
        { no: '2', name: '谱图保留时间', desc: '1、根据文件，识别自动填充，可修改，输入，数字' },
        { no: '3', name: '谱图峰面积', desc: '1、根据文件，识别自动填充，可修改，输入，数字' },
        { no: '3-1', name: '检验项名称', desc: '1、位于「谱图峰面积」右侧\n2、匹配到定性结构时自动带出；主峰无结构时按保留时间升序补「主峰1 / 主峰2…」\n3、只读，不可手工修改' },
        { no: '4', name: '是否主峰', desc: '1、自动判断：识别该数据内最大的「谱图峰面积」默认为「是」，其余默认均为「否」\n2、支持修改，下拉「是/否」，支持多主峰（支持选择多个主峰）' },
        { no: '5', name: '参考峰', desc: '1、先定方向：在「已定性」峰（是否主峰＝是，或唯一匹配到带定性结构的典型保留时间）中取保留时间离本行最近的那个，据此判断本行应朝左还是朝右找尺子\n   1）例：8 号峰已定性为主峰1，7 号峰用它作参考；6 号峰右侧最近的已定性峰仍是 8，故 6 号峰取紧邻的 7 号峰作参考\n   2）若 6 号峰左侧也存在已定性峰（如 3 号峰）且保留时间距离更近，则方向改为朝左，参考峰取紧邻的 5 号峰（不是直接跳到 3 号峰）\n2、再取尺子：沿该方向按保留时间由近到远扫，遇到已判定为新杂的峰跳过继续往外找；遇到还没算完（无典型保留时间）的峰则本轮先跳过、等它算完再来；取到的第一个可用峰即参考峰\n3、扩散收敛后整表按同一规则统一重取（以收敛末快照计算），结果与遍历顺序无关；主峰行保留自身作全局基准；已定性的行参考峰留空并标注「已定性」\n4、手动指定优先：下拉选具体峰＝手动指定该行参考峰（冻结、不参与自动推导、重新计算不覆盖）；选「自动判定」＝交回算法，恢复该行自动推导出的参考峰（已定性的行保持为空）\n5、参考峰的典型保留时间取该行「对应典型保留时间」首值；切换参考峰仅影响该行「相对保留时间」及其下游范围判断，不改变「是否主峰 / 是否锁定」；「顺序异常」为跨行判断，整表重扫' },
        { no: '6', name: '相对保留时间', desc: '1、自动计算，= 各「谱图保留时间」× 参考峰典型保留时间 ÷ 参考峰谱图保留时间\n   1）参考峰：由「参考峰」字段给出（自动推导或手动指定）；参考峰自身的相对保留时间＝其典型保留时间\n2、计算完成后，支持手动修改，数字\n3、计算完成后，逐一比对该值是否落在「对应典型保留时间」的有效取值范围内' },
        { no: '7', name: '对应典型保留时间', desc: '1、范围判断（匹配前置条件）：先判断本峰的相对保留时间是否落在「漂移规则设置」内某一典型保留时间的有效取值范围（= 典型保留时间 − 偏差量 ~ 典型保留时间 + 偏差量）内\n   1）不在任何有效取值范围内：该峰不参与自动匹配，本字段为空，匹配异常说明＝「超出有效范围」，是否新杂默认「是」\n   2）落在有效取值范围内：仅在命中的范围内执行下述自动匹配\n2、是否主峰：\n   1）是（主峰）：自动匹配「漂移规则设置」内主峰典型保留时间；且「是否锁定」默认为「是」\n   2）否（非主峰）：\n      a. 已定性结构：若谱图内已存在定性结构名称，且「漂移规则设置」内也存在此定性结构名称，自动匹配对应的典型保留时间；且「是否锁定」默认为「是」\n      b. 非已定性结构：下拉手动选择，选项为当前规则方案内已配置的典型保留时间（同时显示对应定性结构，主峰项标注「主峰」）；选中后自动带出该时间的有效取值范围、对应定性结构与杂质指标，是否新杂置「否」；清空则该行按「未匹配到」处理（有效范围与定性结构清空、是否新杂置「是」）' },
        { no: '8', name: '有效取值范围', desc: '1、根据匹配到的典型保留时间，按「漂移规则设置 · RRT&TR偏差规则」中命中的时间范围与差值范围计算（典型保留时间 ± 差值）\n2、未匹配到（含超出有效范围）时为空' },
        { no: '9', name: '对应定性结构', desc: '1、谱图内已存在化学式名称\n   1）自动将谱图内的化学式名称进行填充\n2、只读展示，不可手工修改：值由匹配到的典型保留时间自动带出；在「对应典型保留时间」下拉切换后同步刷新' },
        { no: '9-1', name: '典型保留时间', desc: '1、位于「对应定性结构」右侧；与「对应典型保留时间」不同\n2、仅「是否新杂＝是」时可手工输入数字（占位「输入，数字」）\n3、非新杂时不可填（占位「非新杂不可填」），匹配成功后本字段清空' },
        { no: '10', name: '是否锁定', desc: '1、主峰：默认为「是」，不可修改\n2、谱图内存在已定性结构，且台账内也存在此定性结构：默认为「是」，不可修改\n3、锁定后，点击重新计算时该峰整体冻结：对应典型保留时间不重新匹配，参考峰与相对保留时间也保持不变，仅作为其他峰的尺子' },
        { no: '11', name: '是否新杂', desc: '1、自动匹配，可修改\n2、超出有效取值范围而未参与匹配的峰，默认「是」' },
        { no: '12', name: '杂质指标', desc: '1、匹配到典型保留时间：带入该杂质的 UCL/LCL\n2、未匹配到：带入「漂移规则设置」的新杂质项目通用指标' },
        { no: '13', name: '新杂偏差结论', desc: '1、若为新杂，则根据「预警设置」的 UCL/LCL 进行判断，若超出则为「是」，否则为「否」\n2、若非新杂，则不判断，显示「/」' },
      ]},
      { title: '状态备注 · 匹配异常说明', items: [
        { no: '1', name: '异常说明', desc: '1、超出有效范围：相对保留时间不在任何典型保留时间的有效取值范围内，该峰不参与自动匹配，对应典型保留时间/对应定性结构为空，是否新杂默认为「是」\n2、未匹配到：有效取值范围内已无可用候选（如候选均被锁定峰占用），对应典型保留时间为空\n3、重复匹配：两个或两个以上，对应典型保留时间重复，保留时间拼接展示\n4、顺序异常：当前峰的对应典型保留时间，小于上一峰的对应典型保留时间\n5、/：匹配到唯一一个，或手动更改后匹配到唯一一个对应典型保留时间' },
      ]},
      { title: '功能备注', items: [
        { no: '1', name: '识别+计算', desc: '1、上述基本信息必须全部存在值，才可点击，否则不可点击\n2、点击完成后，自动填充下述的色谱识别信息的数据列表内\n3、计算顺序：① 主峰为种子，全表先按主峰基准算一轮，得到「已定住 / 已定性 / 新杂」三类划分；② 逐轮为未定的峰找尺子——先在已定性峰里取保留时间最近者定方向，再沿该方向由近到远取紧邻的可用峰（新杂跳过、未算完的本轮等）；③ 按尺子算相对保留时间并判断落在哪条典型保留时间的有效取值范围内；④ 命中即定住、加入下一轮可用的尺子集合；⑤ 收敛后整表按同一规则统一重取参考峰\n4、超出有效范围的峰不进入自动匹配，最终无匹配结果值' },
        { no: '2', name: '重新计算', desc: '1、校验：锁定峰的对应典型保留时间不可重复（已判为新增列的锁定峰不占用列）；重复时拦截并提示具体值，不执行计算\n2、以页面当前数据为基准，不重新读取源文件；未锁定的峰清空上次结果（是否新杂 / 对应典型保留时间 / 相对保留时间 / 参考峰 / 对应定性结构）后重新推导\n3、例外：未锁定峰中「已有组分名且本来就是新增列」的结果留着、不再换算；但若它的名字能对上台账、或被选为本次主峰，仍按台账那一列重新钉一次\n4、主峰只在未锁定的峰里找：先取组分名带「主峰」的，没有再取浓度（谱图峰面积）最大的；全部峰都锁定时没有主峰，重算停止并提示「浓度为空或主峰不存在」\n5、锁定峰按锁定前性质继续约束其他峰：① 无组分名且非新增列 → 可当尺子、占用就近列；② 有组分名但非新增列 → 改记成新增列、不能当尺子、原就近列仍占用；③ 已是新增列 → 不占用列、不能当尺子，别的峰越过它继续往外找尺子\n6、收尾：锁定峰的参考峰清空（参考关系仍在，只是不再显示最后拿哪一峰做除法）；仍有就近时间的锁定峰做一次顺序检查，若小于前面某个非新增列的时间则改判新增列、时间收 4 位小数，没有就近时间的锁定峰不再改数字\n7、台账按当前所选规则方案重新取；该台账已不存在时提示「未匹配到对应的数据台账」' },
        { no: '3', name: '保存校验', desc: '1、对应典型保留时间有值的组分峰，不可为新杂' },
        { no: '4', name: '保存', desc: '1、按固定值不叠加：生成数据台账，且不增加典型保留时间\n2、按批次新杂滚动叠加：生成数据台账同时，需将本次新杂项目自动添加至典型保留时间内展示\n3、首批次新杂滚动增加，其余批次不叠加：判断该批次是否为数据台账内的首批次数据，若是，将本次新杂项目自动添加至典型保留时间内；若否，则不添加' },
      ]},
    ];
