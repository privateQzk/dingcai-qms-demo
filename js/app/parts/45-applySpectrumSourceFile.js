    function applySpectrumSourceFile(row){
      if(!row) return;
      formModel._srcFileId = String(row.id || '');
      formModel['源文件'] = row['文件名'] || '';
      formModel['文件名称'] = row['文件名'] || '';
      formModel['批号'] = row['批号'] || '';
      formModel['仪器编号'] = row['仪器编号'] || '';
      const inst = (((MOCK['instrument'] || {}).main) || [])
        .find(r=> String(r['仪器编号'] || '') === String(row['仪器编号'] || ''));
      formModel['仪器名称'] = inst ? (inst['仪器名称'] || '') : '';
      formModel['色谱柱型号'] = row['色谱柱型号'] || '';
      const matCode = String(row['物料编码'] || '').trim();
      if(matCode){
        formModel._matFromFile = '1';
        formModel['物料编码'] = matCode;
        fillSpectrumMaterial(matCode);
      } else {
        // 源文件无物料信息：物料编码改由手动选择，其余三项仍按所选编码自动带出
        formModel._matFromFile = '';
        formModel['物料编码'] = '';
        formModel['物料名称'] = '';
        formModel['物料规格'] = '';
        formModel['物料种类'] = '';
      }
      if(!spectrumColumnCodeOptions().includes(String(formModel['色谱柱编号'] || '').trim())) formModel['色谱柱编号'] = '';
      syncSpectrumDriftName();
    }
    function spectrumMatByCode(matCode){
      const code = String(matCode || '').trim();
      if(!code) return null;
      const m = (((MOCK['mat-list'] || {}).main) || []).find(r=> String(r['物料编码'] || '') === code);
      if(m) return m;
      // 漂移规则「适用物料」里维护但物料列表尚未建档的编码：回落规则内的物料名称
      for(const r of driftRowsOf()){
        const hit = (r._mats || []).find(x=> String(x['物料编码'] || '') === code);
        if(hit) return { 物料编码: code, 物料名称: hit['物料名称'] || '', 物料规格: hit['物料规格'] || '', 物料种类: hit['物料种类'] || '' };
      }
      return null;
    }
    function fillSpectrumMaterial(matCode){
      const m = spectrumMatByCode(matCode);
      formModel['物料名称'] = m ? (m['物料名称'] || '') : '';
      formModel['物料规格'] = m ? (m['物料规格'] || '') : '';
      formModel['物料种类'] = m ? (m['物料种类'] || '') : '';
      return m;
    }
    // 色谱柱编号候选：按所选型号过滤色谱柱台账（报废柱不可选）
    function spectrumColumnCodeOptions(){
      const model = String(formModel['色谱柱型号'] || '').trim();
      if(!model) return [];
      return colRowsOf()
        .filter(r=> String(r['色谱柱型号'] || '').trim() === model && String(r['使用状态'] || '') !== '报废')
        .map(r=> String(r['色谱柱编号'] || '').trim())
        .filter(Boolean);
    }
    // 漂移规则匹配：物料编码命中 + 色谱柱型号命中（未选型号时仅按物料匹配）；仅启用规则，创建时间倒序
    // 漂移规则匹配（沿用 driftMatchRules：物料编码 + 色谱柱型号 + 检验类型；仅启用规则，创建时间倒序，多条取最新）
    function spectrumDriftRuleRows(){
      const mat = String(formModel['物料编码'] || '').trim();
      if(!mat) return [];
      return driftMatchRules(mat, formModel['色谱柱型号'], formModel['检验类型']);
    }
    function spectrumDriftNameOptions(){
      const out = [];
      spectrumDriftRuleRows().forEach(r=>{
        const n = String(r['规则名称'] || '').trim();
        if(n && !out.includes(n)) out.push(n);
      });
      if(!out.length){
        // 未匹配到规则时仍允许手动改选其他启用规则
        driftRowsOf().forEach(r=>{
          if(String(r['启用状态'] || '启用') === '禁用') return;
          const n = String(r['规则名称'] || '').trim();
          if(n && !out.includes(n)) out.push(n);
        });
      }
      const cur = String(formModel['漂移规则'] || '').trim();
      if(cur && !out.includes(cur)) out.unshift(cur);
      return out;
    }

    // 规则分类：始终跟随「漂移规则」所指规则方案（drift-rule）的「规则分类」，全场景只读
    function spectrumRuleByName(ruleName){
      const nm = String(ruleName || '').trim();
      if(!nm) return null;
      return driftRowsOf().find(r=> String(r['规则名称'] || '').trim() === nm) || null;
    }
    function spectrumRuleCategoryPlaceholder(){
      const nm = String(formModel['漂移规则'] || '').trim();
      if(!nm) return '未匹配到规则方案';
      return spectrumRuleByName(nm) ? '规则方案未维护规则分类' : '未匹配到规则方案';
    }
    function syncSpectrumRuleCategory(){
      const rule = spectrumRuleByName(formModel['漂移规则']);
      formModel['规则分类'] = rule ? String(rule['规则分类'] || '').trim() : '';
    }
    // 匹配多条时取最新一条（创建时间倒序首位）
    function syncSpectrumDriftName(){
      const hits = spectrumDriftRuleRows();
      formModel['漂移规则'] = hits.length ? String(hits[0]['规则名称'] || '').trim() : '';
      syncSpectrumRuleCategory();
    }
    function onSpectrumInspTypeChange(){
      const hadFile = !!String(formModel._srcFileId || '').trim();
      formModel['源文件'] = '';
      formModel._srcFileId = '';
      formModel['文件名称'] = '';
      formModel['批号'] = '';
      formModel['仪器编号'] = '';
      formModel['仪器名称'] = '';
      formModel['漂移规则'] = '';
      formModel['规则分类'] = '';
      if(String(formModel._matFromFile || '').trim()){
        formModel['物料编码'] = '';
        formModel['物料名称'] = '';
        formModel['物料规格'] = '';
        formModel['物料种类'] = '';
      }
      formModel._matFromFile = '';
      resetSpectrumCalc();
      if(hadFile) ElMessage.info('已切换检验类型，请重新选择源文件');
    }
    function onSpectrumMaterialChange(){
      const code = String(formModel['物料编码'] || '').trim();
      formModel._matFromFile = '';
      if(!code){
        formModel['物料名称'] = '';
        formModel['物料规格'] = '';
        formModel['物料种类'] = '';
        formModel['漂移规则'] = '';
        formModel['规则分类'] = '';
        return;
      }
      fillSpectrumMaterial(code);
      syncSpectrumDriftName();
    }
    function onSpectrumColumnModelChange(){
      const code = String(formModel['色谱柱编号'] || '').trim();
      if(code && !spectrumColumnCodeOptions().includes(code)) formModel['色谱柱编号'] = '';
      syncSpectrumDriftName();
    }

    // ===== 列表行：汇总字段 / 峰表懒生成 / 保存 / 删除 =====
    function spiCleanPeaks(rows){ return (rows || []).map(p=> JSON.parse(JSON.stringify(p))); }
    function spiApplySummary(row, peaks){
      const list = peaks || [];
      const news = list.filter(p=> p.是否新杂==='是');
      const bad = list.filter(p=> p.杂质偏差结论==='异常');
      row['杂质个数'] = list.filter(p=> p.是否主峰!=='是').length;
      row['新杂个数'] = news.length;
      row['是否存在新杂'] = news.length ? '是' : '否';
      row['杂质偏差结论'] = bad.length ? '异常' : '正常';
      row['异常描述'] = bad.map(p=> '峰'+p.谱图峰号+'（保留时间 '+p.谱图保留时间+'）峰面积 '+p.谱图峰面积+'，超出 '+p.杂质指标).join('；') || '—';
    }
    // 兼容下游（GC/LC 台账等）读取的别名字段
    function spiApplyAlias(row){
      row['谱图流水'] = row['谱图编号'] || '';
      row['漂移规则名称'] = row['漂移规则'] || '';
      row['使用状态'] = row['使用状态'] || '启用';
    }
    // 已识别但尚未落峰表的历史/种子行：按源文件积分结果 + 漂移规则重算一次并固化到行上（同一文件每次结果一致）
    function spiEnsurePeaks(rowLike){
      const row = rowLike && (spiRowsOf().find(r=> r.id===rowLike.id) || rowLike);
      if(!row || (Array.isArray(row._peaks) && row._peaks.length)) return row;
      if(String(row['识别状态']||'')==='待识别') return row;
      const peaks = spectrumSourcePeaks(row._srcFileId);
      if(!peaks.length) return row;
      const res = spectrumComputeRows(peaks, row['漂移规则'] === '—' ? '' : row['漂移规则'], {});
      row._peaks = spiCleanPeaks(res.rows);
      spiApplySummary(row, row._peaks);
      return row;
    }
    function spiNextNo(){
      const maxNo = spiRowsOf().reduce((m, r)=> Math.max(m, parseInt(String(r['谱图编号']||'').replace(/\D/g,''), 10)||0), 0);
      return 'SP-' + String(maxNo + 1).padStart(5, '0');
    }
    function openSpiForm(mode, row){
      openForm(mode);
      SPI_FIELD_KEYS.forEach(k=>{ formModel[k] = ''; });
      formModel._srcFileId = ''; formModel._matFromFile = '';
      resetSpectrumCalc();
      if(mode!=='edit' || !row) return;
      const full = spiEnsurePeaks(row) || row;
      SPI_FIELD_KEYS.forEach(k=>{ const v = full[k]; formModel[k] = (v===undefined || v===null || v==='—') ? '' : v; });
      formModel._editId = full.id;
      // 回填源文件引用与物料来源，保证「源文件 / 物料编码」的只读口径与新增时一致
      formModel._srcFileId = full._srcFileId || '';
      formModel._matFromFile = full._matFromFile || '';
      if(!String(formModel['源文件']||'').trim()){
        const sf = spectrumFileById(formModel._srcFileId);
        if(sf) formModel['源文件'] = sf['文件名'] || '';
      }
      // 历史行缺物料规格/种类时按物料编码补齐
      if(String(formModel['物料编码']||'').trim() && !String(formModel['物料规格']||'').trim()) fillSpectrumMaterial(formModel['物料编码']);
      // 规则分类按当前规则方案重算，保证与规则主数据一致（历史脏值不保留）
      syncSpectrumRuleCategory();
      spectrumPeaks.value = spiCleanPeaks(full._peaks);
      spectrumCalcDone.value = spectrumPeaks.value.length > 0;
    }
    function openSpectrumMatPick(){
      if(formMode.value==='detail') return;
      if(String(formModel._matFromFile||'').trim()) return;     // 源文件已带出物料：锁定
      openIoPick('mat', 'spiMat', '物料编码');
    }
    function applySpiMatPick(r){
      formModel['物料编码'] = r['物料编码'] || '';
      onSpectrumMaterialChange();
      ioPickVisible.value = false;
    }
    function saveSpiForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      if(!txt('检验类型')){ ElMessage.warning('请选择检验类型'); return; }
      const srcId = txt('_srcFileId');
      if(!srcId || !spectrumFileById(srcId)){ ElMessage.warning('请选择源文件（图谱文件台账）'); return; }
      if(!txt('物料编码')){ ElMessage.warning('请选择物料编码'); return; }
      if(!txt('色谱柱型号')){ ElMessage.warning('请选择色谱柱型号'); return; }
      if(!txt('色谱柱编号')){ ElMessage.warning('请选择色谱柱编号'); return; }
      const peaks = spectrumPeaks.value || [];
      // 保存校验：对应典型保留时间有值的组分峰，不可为新杂
      const bad = peaks.find(p=> String(p.对应典型保留时间||'').trim() && p.对应典型保留时间!=='—' && p.是否新杂==='是');
      if(bad){ ElMessage.warning('峰'+bad.谱图峰号+' 已有对应典型保留时间，是否新杂不可为「是」'); return; }
      const list = spiRowsOf();
      const isAdd = formMode.value!=='edit';
      const payload = {};
      SPI_FIELD_KEYS.forEach(k=>{ payload[k] = txt(k) || '—'; });
      payload._srcFileId = srcId;
      payload._matFromFile = txt('_matFromFile') ? '1' : '';
      payload._peaks = spiCleanPeaks(peaks);
      spiApplySummary(payload, payload._peaks);
      let added = 0;
      const rule = spectrumRuleByName(txt('漂移规则'));
      if(isAdd){
        const no = spiNextNo();
        const row = Object.assign({ id:'sp-'+Date.now(), 谱图编号: no }, payload, { 识别状态: spectrumCalcDone.value ? '已识别' : '待识别', 创建人:'张三', 创建时间: nowStamp() });
        spiApplyAlias(row);
        // 按「TR规则」把本次新杂叠加到漂移规则典型保留时间（固定值不叠加；按批次叠加；首批次叠加其余批次不叠加）
        const tr = rule && rule['TR规则'];
        const firstBatch = !list.some(r=> r['漂移规则']===txt('漂移规则') && r['批号']!==payload['批号']);
        const news = peaks.filter(p=> p.是否新杂==='是' && String(p.相对保留时间||'').trim() && p.相对保留时间!=='—');
        if(rule && news.length && (tr==='按批次新增自动叠加' || tr==='按批次新建流动叠加' || (tr==='首批次新建流动叠加，其余批次不叠加' && firstBatch))){
          if(!Array.isArray(rule._impurities)) rule._impurities = (rule._known||[]).slice();
          news.forEach(p=>{
            const t = String(p.相对保留时间);
            if(rule._impurities.some(k=> String(k['典型保留时间'])===t)) return;
            const lo = driftNum(t), d = 0.002;
            const range = driftRangeByRrt(lo, rule._rrtRules||[], lo==null?'':(lo-d).toFixed(4), lo==null?'':(lo+d).toFixed(4));
            rule._impurities.push({
              是否主峰:'否', 典型保留时间:t,
              有效范围下限: range.lo==null?'':Number(range.lo.toFixed(4)), 有效范围上限: range.hi==null?'':Number(range.hi.toFixed(4)),
              定性结构:'', 标准结果值:'', UCL: String(rule._newUCL||''), LCL: String(rule._newLCL||'')
            });
            added++;
          });
          rule._known = rule._impurities;
          rule['杂质个数'] = rule._impurities.length;
        }
        list.unshift(row);
        ElMessage.success('图谱识别任务已新增 '+no + (added ? '，'+added+' 个新杂已添加到漂移规则「'+rule['规则名称']+'」' : ''));
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑图谱'); return; }
        Object.assign(cur, payload);
        cur['识别状态'] = spectrumCalcDone.value ? (cur['识别状态']==='待识别' ? '已识别' : cur['识别状态']) : cur['识别状态'];
        spiApplyAlias(cur);
        ElMessage.success('图谱识别任务已保存');
      }
      // 示例图谱文件固定保持「未使用」：保存识别任务不占用文件，同一份图谱可反复选取识别
      formVisible.value = false;
      bumpStore();
    }
    // 重新识别：复用「编辑」的回填与弹窗，再按源文件积分结果重跑识别计算
    function reRecognizeSpi(row){
      const sf = spectrumFileById(row._srcFileId);
      if(!sf){ ElMessage.warning('该记录未关联源文件，无法重新识别'); return; }
      openSpiForm('edit', row);
      nextTick(()=>{ if(pageId.value===SPI_PAGE) runSpectrumCalc(); });
    }
    function deleteSpiRows(rowsArg){
      const list = spiRowsOf();
      const rows = Array.isArray(rowsArg) ? rowsArg : list.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选要删除的数据'); return; }
      const ids = new Set(rows.map(r=> r.id));
      ElementPlus.ElMessageBox.confirm(rows.length===1 ? '确认删除图谱识别任务 '+(rows[0]['谱图编号']||'')+'？删除后不可恢复。' : '确认删除所选的 '+rows.length+' 条图谱识别任务？不影响漂移规则内的典型保留时间。', rows.length===1 ? '删除确认' : '批量删除', { confirmButtonText:'确认删除', cancelButtonText:'取消', type:'warning' }).then(()=>{
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = selectedIds.value.filter(id=> !ids.has(id));
        bumpStore();
        ElMessage.success(rows.length===1 ? '图谱识别任务已删除' : '已删除 '+rows.length+' 条数据');
      }).catch(()=>{});
    }
    function onSpiToolbar(btn){
      if(btn.name==='新增'){ openSpiForm('add'); return true; }
      if(btn.name==='导入' || btn.name==='导入数据'){ importVisible.value = true; return true; }
      if(btn.name==='导出' || btn.name==='导出数据'){ exportVisible.value = true; return true; }
      if(btn.name==='批量删除'){ deleteSpiRows(); return true; }
      return false;
    }

    /** GC / LC 台账（np-0208-04 / np-0208-05）：左侧分类由漂移规则派生（物料 × 色谱柱型号），右侧台账按漂移规则典型保留时间动态生成列 */
    const chromLedgerDim = ref('峰面积%');
    // 维度口径：峰面积% = _rt[TR].a（相对峰面积）；峰面积 = a × 10000（绝对峰面积）；保留时间 = _rt[TR].t；组合项按「峰面积% / 峰面积 / 保留时间」三段展示
    const CHROM_LEDGER_DIM_PAIRS = '峰面积%&峰面积&保留时间';
    const CHROM_LEDGER_DIMS = ['峰面积%','峰面积','保留时间',CHROM_LEDGER_DIM_PAIRS];
    function isChromLedgerPage(){ return !!CHROM_LEDGER_PAGES[pageId.value]; }
    function chromLedgerKindOf(pid){ return CHROM_LEDGER_PAGES[pid] || ''; }
    function chromLedgerPageByRuleCategory(cat){
      const c = String(cat || '').trim().toUpperCase();
      return Object.keys(CHROM_LEDGER_PAGES).find(pid=> CHROM_LEDGER_PAGES[pid]===c) || '';
    }
    function chromLedgerPctText(v){
      // 列表只展示数值本身，不带 % 后缀（单位由维度名称体现）
      const s = (v && v.a != null && v.a !== '') ? String(v.a).trim() : '';
      return s || '—';
    }
    function chromLedgerAreaText(v){
      const pct = parseFloat(v && v.a);
      return Number.isFinite(pct) ? String(+(pct * 10000).toFixed(1)) : '—';
    }
    function chromLedgerCell(row, rt){
      const v = (row._rt && row._rt[rt]) || {};
      const dim = chromLedgerDim.value;
      if(dim==='峰面积') return chromLedgerAreaText(v);
      if(dim==='保留时间') return v.t || '—';
      if(dim===CHROM_LEDGER_DIM_PAIRS) return [chromLedgerPctText(v), chromLedgerAreaText(v), (v.t || '—')].join(' / ');
      return chromLedgerPctText(v);
    }
    // 页签＝报检单类型（本页固定 8 类，不随规则裁剪）
    function chromLedgerTabDefs(){ return ((CFG.pages['np-0208-04'] || {}).tabs) || []; }
    // 台账页签：由「启用 + 规则分类 + 适用检验类型」命中；无命中时回退全部页签（仅供分类同步判断，不影响页签展示）
    function chromLedgerPageTabs(pid){
      const defs = chromLedgerTabDefs();
      const want = chromLedgerKindOf(pid || pageId.value);
      if(!want) return defs;
      const used = new Set();
      driftRowsOf().forEach(r=>{
        if(String(r['启用状态'] || '启用') !== '启用') return;
        if(String(r['规则分类'] || '').trim().toUpperCase() !== want) return;
        driftInspList(r['使用检验类型'] || r['适用检验类型']).forEach(lb=> used.add(lb));
      });
      const hit = defs.filter(t=> used.has(t.label));
      return hit.length ? hit : defs;
    }
    // 规则「适用检验类型」→ 台账页签；为空 / 匹配不到时覆盖全部页签
    function chromLedgerTabsOfRule(rule){
      const defs = chromLedgerTabDefs();
      const used = driftInspList((rule && (rule['使用检验类型'] || rule['适用检验类型'])) || '');
      if(!used.length) return { tabs: defs.map(t=> t.name), fallbackAll: true };
      const hit = defs.filter(t=> used.includes(t.label)).map(t=> t.name);
      return { tabs: hit.length ? hit : defs.map(t=> t.name), fallbackAll: !hit.length };
    }
    // 规则的「适用物料 × 色谱柱型号」展开为台账分类（名称＝物料编码/型号；无型号时退化为物料编码）
    function chromLedgerCatsOfRule(rule){
      const mats = (Array.isArray(rule && rule._mats) ? rule._mats : [])
        .filter(m=> String((m || {})['物料编码'] || '').trim());
      const cols = (rule && (rule._columns || rule._cols)) || [];
      const models = (Array.isArray(cols) ? cols : [])
        .map(c=> String((c && c['色谱柱型号']) || c || '').trim()).filter(Boolean);
      const matList = ((MOCK['mat-list'] || {}).main) || [];
      const out = [];
      mats.forEach(m=>{
        const code = String(m['物料编码'] || '').trim();
        const master = matList.find(r=> String(r['物料编码'] || '') === code) || {};
        (models.length ? models : ['']).forEach(md=>{
          out.push({
            物料编码: code,
            物料名称: String(m['物料名称'] || master['物料名称'] || '').trim(),
            物料规格: String(master['物料规格'] || '').trim(),
            色谱柱型号: md,
            名称: md ? (code + '/' + md) : code,
          });
        });
      });
      return out;
    }
    // 台账左栏分类：启用且规则分类匹配的漂移规则派生 + 本页手工「新增分类」
    function chromLedgerManualCats(pid, tab){
      const bag = MOCK[pid] || {};
      const t = String(tab || '').trim();
      return (Array.isArray(bag.manualCats) ? bag.manualCats : []).filter(c=> !t || String(c.tab || '') === t);
    }
    function chromLedgerDerivedTypes(pid, tab){
      const want = chromLedgerKindOf(pid);
      const t = String(tab || '').trim();
      const out = [];
      driftRowsOf().forEach(r=>{
        if(String(r['启用状态'] || '启用') !== '启用') return;
        if(String(r['规则分类'] || '').trim().toUpperCase() !== want) return;
        // 分类按页签独立：规则「适用检验类型」命中当前页签才展示（未填写时覆盖全部页签）
        if(t){ const ti = chromLedgerTabsOfRule(r); if(ti.tabs.length && !ti.tabs.includes(t)) return; }
        chromLedgerCatsOfRule(r).forEach(c=>{
          const id = 'rtcat::' + c.物料编码 + '::' + c.色谱柱型号;
          if(out.some(x=> x.id === id)) return;
          out.push({
            id, tab: t,
            编码: c.物料编码, 名称: c.名称, 上级字典: '', 备注: '', 系统开发: false, 分组节点: false,
            物料编码: c.物料编码, 物料名称: c.物料名称, 物料规格: c.物料规格, 色谱柱型号: c.色谱柱型号,
            ruleCode: String(r['规则编码'] || ''), ruleName: String(r['规则名称'] || ''),
          });
        });
      });
      chromLedgerManualCats(pid, t).forEach(c=>{
        const code = String(c.物料编码 || '').trim();
        if(!code) return;
        const model = String(c.色谱柱型号 || '').trim();
        const id = String(c.id || ('rtcat::' + code + '::' + model));
        if(out.some(x=> x.id === id || (x.物料编码===code && String(x.色谱柱型号||'')===model))) return;
        out.push({
          id, tab: t,
          编码: code, 名称: c.名称 || (model ? (code + '/' + model) : code),
          上级字典: '', 备注: '', 系统开发: false, 分组节点: false,
          物料编码: code, 物料名称: c.物料名称 || '', 物料规格: c.物料规格 || '', 色谱柱型号: model,
          ruleCode: String(c.ruleCode || ''), ruleName: String(c.ruleName || ''),
          _manual: true,
        });
      });
      return out;
    }
    // 当前页分类（左栏数据源）：台账页取规则派生分类，其余 dict-split 页取 dictTypes
    function curDictTypes(){
      if(isChromLedgerPage()){
        storeTick.value;
        return chromLedgerDerivedTypes(pageId.value, activeTab.value);
      }
      return dictTypes.value;
    }
    // 台账行是否归属某分类：物料（编码优先，退化为名称）+ 色谱柱型号（行无型号字段时不限）
    function chromLedgerRowOfType(r, t){
      const code = String(r['物料编码'] || '').trim();
      const matOk = code ? code === String(t.物料编码 || '') : String(r['物料名称'] || '') === String(t.物料名称 || '');
      const model = String(r['色谱柱型号'] || '').trim();
      return matOk && (!model || !t.色谱柱型号 || model === t.色谱柱型号);
    }
    // 同步分类：新增 / 更新 / 清理（编辑后不再命中的旧分类、规则改分类后的另一页旧分类）
    function syncChromLedgerByRule(rule){
      const res = { pageId:'', added:0, updated:0, removed:0, tabs:0, note:'' };
      if(!rule) return res;
      const pid = chromLedgerPageByRuleCategory(rule['规则分类']);
      const ruleCode = String(rule['规则编码'] || '').trim() || String(rule['规则名称'] || '').trim();
      // 规则改分类（GC↔LC）时，先清掉另一个台账页里属于本规则的分类
      Object.keys(CHROM_LEDGER_PAGES).forEach(other=>{
        if(other === pid) return;
        const bag = MOCK[other];
        if(!bag || !Array.isArray(bag.types)) return;
        const before = bag.types.length;
        bag.types = bag.types.filter(t=> String(t.ruleCode || '') !== ruleCode);
        res.removed += before - bag.types.length;
      });
      if(!pid){
        res.note = '规则分类为「' + (String(rule['规则分类'] || '').trim() || '未设置') + '」，仅 GC / LC 分类会同步到台账';
        return res;
      }
      res.pageId = pid;
      const cats = chromLedgerCatsOfRule(rule);
      if(!cats.length){
        res.note = '规则未配置「适用物料」，无法生成台账分类';
        return res;
      }
      const bag = MOCK[pid] = MOCK[pid] || {};
      const types = bag.types = bag.types || [];
      const tabInfo = chromLedgerTabsOfRule(rule);
      const visible = chromLedgerPageTabs(pid).map(t=> t.name);
      const realTabs = tabInfo.tabs.filter(n=> visible.includes(n));
      if(!realTabs.length){
        res.note = '规则的「适用检验类型」与当前台账页签无交集，未生成分类';
        return res;
      }
      tabInfo.tabs = realTabs;
      res.tabs = realTabs.length;
      const prefix = pid === 'np-0208-04' ? 'gc' : 'lc';
      const want = new Set(cats.map(c=> c.物料编码 + '|' + c.色谱柱型号));
      const stamp = Date.now();
      tabInfo.tabs.forEach(tab=>{
        for(let i = types.length - 1; i >= 0; i--){
          const t = types[i];
          if(String(t.tab || '') !== tab) continue;
          if(String(t.ruleCode || '') !== ruleCode) continue;
          if(!want.has(String(t.物料编码 || '') + '|' + String(t.色谱柱型号 || ''))){ types.splice(i, 1); res.removed++; }
        }
        cats.forEach((c, ci)=>{
          const hit = types.find(t=> String(t.tab || '') === tab
            && String(t.物料编码 || '') === c.物料编码
            && String(t.色谱柱型号 || '') === c.色谱柱型号);
          if(hit){
            Object.assign(hit, {
              编码: c.物料编码, 名称: c.名称,
              物料名称: c.物料名称 || hit.物料名称 || '',
              物料规格: c.物料规格 || hit.物料规格 || '',
              ruleCode, ruleName: String(rule['规则名称'] || ''),
            });
            res.updated++;
          } else {
            types.push({
              id: 'cc-' + prefix + '-' + tab + '-' + ruleCode + '-' + stamp + '-' + ci,
              tab,
              编码: c.物料编码, 名称: c.名称,
              上级字典: '', 备注: '', 系统开发: false, 分组节点: false,
              物料编码: c.物料编码, 物料名称: c.物料名称, 物料规格: c.物料规格, 色谱柱型号: c.色谱柱型号,
              ruleCode, ruleName: String(rule['规则名称'] || ''),
            });
            res.added++;
          }
        });
      });
      return res;
    }
    // 表头：当前台账页 + 当前页签下命中规则的典型保留时间（升序去重）；无明细回退默认 7 列
