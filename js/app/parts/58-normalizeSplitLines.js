    function normalizeSplitLines(rows){
      const list = rows || [];
      const countByOrderLine = new Map();
      list.forEach((r, idx)=>{
        const base = orderLineNoBase(r, idx + 1);
        countByOrderLine.set(base, (countByOrderLine.get(base) || 0) + 1);
      });
      const subByOrderLine = new Map();
      return list.map((r, idx)=>{
        const mat = r['物料信息'] || '';
        const orderLineNo = orderLineNoBase(r, idx + 1);
        const matCode = codeOf(mat) || mat || ('mat-' + (idx+1));
        const key = r._matKey || (orderLineNo + '::' + matCode);
        const total = countByOrderLine.get(orderLineNo) || 1;
        const sub = (subByOrderLine.get(orderLineNo) || 0) + 1;
        subByOrderLine.set(orderLineNo, sub);
        const displayNo = total <= 1 ? orderLineNo : (orderLineNo + '-' + sub);
        return {
          ...r,
          行号: displayNo,
          _orderLineNo: orderLineNo,
          _matKey: key,
          _rowNo: displayNo
        };
      });
    }
    function onSplitLineSelection(rows){
      splitLineSelected.value = rows || [];
    }
    function isSplitMatHeadRow(index){
      const rows = splitLines.value || [];
      const row = rows[index];
      if(!row) return false;
      const key = row._matKey || codeOf(row['物料信息']) || row['物料信息'];
      const prev = rows[index-1];
      const prevKey = prev ? (prev._matKey || codeOf(prev['物料信息']) || prev['物料信息']) : '';
      return prevKey !== key;
    }
    function addSplitMaterialLine(){
      const src = splitRow.value || {};
      const pool = dispatchLinesOf(src);
      const inSplit = new Set((splitLines.value||[]).map(r=> r._matKey || codeOf(r['物料信息']) || r['物料信息']));
      const next = pool.find(r=>{
        const key = codeOf(r['物料信息']) || r['物料信息'];
        const remain = Number(r['未拆数量'] ?? ((Number(r['需求数量'])||0) - (Number(r['已拆数量'])||0)));
        return remain > 0 && !inSplit.has(key);
      });
      if(!next){ ElMessage.warning('暂无可新增的未拆物料'); return; }
      const remain = Number(next['未拆数量'] ?? ((Number(next['需求数量'])||0) - (Number(next['已拆数量'])||0)));
      splitLines.value = normalizeSplitLines((splitLines.value||[]).concat([{
        ...next,
        批号: '',
        未拆数量: String(remain),
        本次发货数量: remain>0 ? String(remain) : ''
      }]));
      ElMessage.success('已新增物料拆分行');
    }
    function addSplitBatchLineForMat(row){
      const rows = splitLines.value || [];
      if(!rows.length){ ElMessage.warning('暂无可拆分物料行'); return; }
      const anchor = row || rows[rows.length-1];
      const key = anchor._matKey || codeOf(anchor['物料信息']) || anchor['物料信息'] || 'mat-1';
      const base = rows.find(r=> (r._matKey||codeOf(r['物料信息'])||r['物料信息'])===key) || anchor;
      const next = rows.slice();
      const insertAt = next.reduce((last, r, i)=>{
        const k = r._matKey || codeOf(r['物料信息']) || r['物料信息'];
        return k===key ? i : last;
      }, -1) + 1;
      next.splice(insertAt, 0, {
        ...base,
        批号: '',
        本次发货数量: '',
        _matKey: key
      });
      splitLines.value = normalizeSplitLines(next);
      ElMessage.success('已新增批次拆分行');
    }
    function addSplitBatchLine(){
      addSplitBatchLineForMat((splitLineSelected.value||[])[0] || (splitLines.value||[])[splitLines.value.length-1]);
    }
    function removeSplitBatchLine(index){
      const rows = (splitLines.value||[]).slice();
      const cur = rows[index];
      if(!cur) return;
      const key = cur._matKey || codeOf(cur['物料信息']) || cur['物料信息'];
      const idxs = rows.map((r,i)=> ({r,i})).filter(x=> (x.r._matKey||codeOf(x.r['物料信息'])||x.r['物料信息'])===key).map(x=>x.i);
      if(idxs.length<=1){
        rows[index] = { ...rows[index], 批号:'', 本次发货数量:'' };
      } else {
        rows.splice(index, 1);
      }
      splitLines.value = normalizeSplitLines(rows);
      splitLineSelected.value = [];
      ElMessage.success('已删除批次行');
    }
    function removeSplitSelectedBatchLines(){
      const selected = splitLineSelected.value || [];
      if(!selected.length){ ElMessage.warning('请先勾选要删除的批次行'); return; }
      const rows = (splitLines.value||[]).map(r=>({ ...r }));
      const selSet = new Set(selected);
      const del = new Set();
      const byKey = new Map();
      rows.forEach((r,i)=>{
        const key = r._matKey || codeOf(r['物料信息']) || r['物料信息'];
        if(!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(i);
      });
      byKey.forEach((idxs)=>{
        const keep = idxs.filter(i=> !selSet.has(rows[i]));
        if(keep.length===0){
          const keepIdx = idxs[0];
          rows[keepIdx] = { ...rows[keepIdx], 批号:'', 本次发货数量:'' };
          idxs.slice(1).forEach(i=> del.add(i));
        } else {
          idxs.filter(i=> selSet.has(rows[i])).forEach(i=> del.add(i));
        }
      });
      splitLines.value = normalizeSplitLines(rows.filter((_,i)=> !del.has(i)));
      splitLineSelected.value = [];
      ElMessage.success('已删除勾选批次行');
    }
    function splitSpanMethod({ row, column, rowIndex }){
      const prop = column.property;
      const mergeCols = new Set(['物料信息','需求数量','已拆数量','未拆数量','体积(长*宽*高)','单位']);
      if(!mergeCols.has(prop)) return [1,1];
      const rows = splitLines.value || [];
      const key = row._matKey || codeOf(row['物料信息']) || row['物料信息'];
      const prev = rows[rowIndex-1];
      const prevKey = prev ? (prev._matKey || codeOf(prev['物料信息']) || prev['物料信息']) : '';
      if(prevKey===key) return [0,0];
      let span = 1;
      for(let i=rowIndex+1;i<rows.length;i++){
        const k = rows[i]._matKey || codeOf(rows[i]['物料信息']) || rows[i]['物料信息'];
        if(k!==key) break;
        span += 1;
      }
      return [span,1];
    }
    function onSplitOk(){
      if(!splitForm.装货点){ ElMessage.warning('请选择或填写装货点地址'); return; }
      if(!splitForm.卸货点){ ElMessage.warning('请选择或填写卸货点地址'); return; }
      if(!splitForm.计划装货时间){ ElMessage.warning('请选择计划装货时间'); return; }
      if(splitNeedsOrder.value){
        if(!splitForm.订单类型 || splitForm.订单类型==='无'){ ElMessage.warning('请选择订单类型'); return; }
        if(!splitForm.订单号){ ElMessage.warning('请选择订单号'); return; }
      }
      if(splitShowPo.value && !splitForm.采购订单){ ElMessage.warning('直发业务（贸易）请选择采购订单'); return; }
      const lines = splitLines.value || [];
      if(!lines.length){ ElMessage.warning('拆分数量或信息存在错误，请检查'); return; }
      const byMat = new Map();
      for(const r of lines){
        const qty = Number(r['本次发货数量']);
        if(!(qty>0)){ ElMessage.warning('第 ' + (r._rowNo || '-') + ' 行本次发货数量必须大于 0'); return; }
        const key = r._matKey || codeOf(r['物料信息']) || r['物料信息'];
        const lot = String(r['批号']||'').trim();
        if(!byMat.has(key)){
          byMat.set(key, {
            name: r['物料信息'] || key,
            remain: Number(r['未拆数量']) || 0,
            sum: 0,
            lots: new Set()
          });
        }
        const g = byMat.get(key);
        g.sum += qty;
        if(lot){
          if(g.lots.has(lot)){
            ElMessage.warning('物料【' + g.name + '】存在重复的批号【' + lot + '】，请合并填写数量');
            return;
          }
          g.lots.add(lot);
        }
      }
      for(const g of byMat.values()){
        if(g.sum > g.remain){
          ElMessage.warning('物料【' + g.name + '】本次拆分发货总量 (' + g.sum + ') 超过剩余未拆数量 (' + g.remain + ')');
          return;
        }
      }
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const ship = (MOCK['lg-ship'] = MOCK['lg-ship'] || { main: [] });
      ship.main = ship.main || [];
      const no = 'FHD' + ymd + String(ship.main.length + 1).padStart(4,'0');
      const src = splitRow.value;
      const used = lines.filter(r=> Number(r['本次发货数量'])>0);
      const shipLines = used.map(r=>({
        行号: r['行号'] || r._rowNo || '',
        _orderLineNo: r._orderLineNo || orderLineNoBase(r),
        物料信息: r['物料信息']||'',
        发货数量: String(r['本次发货数量']||''),
        计划件数: r['计划件数'] != null && r['计划件数'] !== '' ? String(r['计划件数']) : '',
        已签收数量: '—',
        '体积(长*宽*高)': r['体积(长*宽*高)']||'',
        单位: r['单位']||'',
        批号: r['批号']||'',
        行备注: r['行备注']||''
      }));
      const qtySum = used.reduce((s,r)=> s + (Number(r['本次发货数量'])||0), 0);
      const unit = used[0]?.['单位'] || '';
      const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      ship.main.unshift({
        id: String(ship.main.length+1),
        发货单号: no,
        状态: '待调度',
        来源派车单号: src['编号']||'',
        申请部门: src['申请部门']||'',
        申请人: src['申请人']||'',
        用车类型: src['用车类型']||'',
        配送类型: src['配送类型']||'正常业务',
        车型要求: src['车型要求']||'',
        是否带托盘: src['是否带托盘']||'',
        特殊要求: src['特殊要求']||'—',
        仓库业务类型: resolveWhBizType(src),
        装货点: splitForm.装货点,
        装货联系人: splitForm.装货联系人||'',
        装货联系电话: splitForm.装货联系电话||'',
        卸货点: splitForm.卸货点,
        卸货联系人: splitForm.卸货联系人||'',
        卸货联系电话: splitForm.卸货联系电话||'',
        计划装货时间: splitForm.计划装货时间,
        要求送达时间: splitForm.要求送达时间 || '—',
        订单号: splitForm.订单号||'',
        合同号: splitForm.合同号||lookupContractNo(splitForm.订单类型, splitForm.订单号),
        采购订单: splitForm.采购订单||'',
        关联销售备货单: splitForm.关联销售备货单||'',
        关联销售预出货单: splitForm.关联销售预出货单||'',
        前置关联单据: splitForm.前置关联单据||'',
        订单类型: splitForm.订单类型||'',
        物料信息: used.map(r=> r['物料信息']).filter(Boolean).join('；'),
        发货数量: String(qtySum) + (unit ? (' ' + unit) : ''),
        已签收数量: '—',
        关联运单: '—',
        关联仓储通知单: '—',
        签收状态: '未签收',
        创建时间: stamp,
        备注: splitForm.备注||'',
        _lines: shipLines
      });
      const linked = (src['关联发货单'] && src['关联发货单']!=='—') ? (src['关联发货单'] + '、' + no) : no;
      src['关联发货单'] = linked;
      src['状态'] = '执行中';
      refreshDispatchProgress(src);
      splitVisible.value = false;
      splitLineSelected.value = [];
      bumpStore();
      ElMessage.success('派车申请单拆分成功，已生成发货单 (' + no + ')');
    }
    function onDispatchAuditOk(){
      const row = dispatchAuditRow.value || {};
      if(!row.id){ ElMessage.warning('未找到待审核单据'); return; }
      const result = dispatchAuditForm.审核结果 || '审核通过';
      row['审核状态'] = result==='审核驳回' ? '已驳回' : '已通过';
      const d = new Date();
      const pad = n => String(n).padStart(2,'0');
      const stamp = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const log = {
        节点: '派车申请单审核',
        结果: row['审核状态'],
        审核人: '物流主管',
        时间: stamp,
        意见: String(dispatchAuditForm.审核意见||'').trim() || '—'
      };
      row._auditLogs = Array.isArray(row._auditLogs) ? [log].concat(row._auditLogs) : [log];
      dispatchAuditVisible.value = false;
      dispatchAuditRow.value = {};
      dispatchAuditForm.审核结果 = '审核通过';
      dispatchAuditForm.审核意见 = '';
      bumpStore();
      ElMessage.success(row['审核状态']==='已通过' ? '审核通过，单据可执行拆分' : '已驳回，可返回编辑修改后再发起审核');
    }
    function isOsPoPage(){
      return ['wh-os-issue','wh-os-recv','wh-os-ret-mat','wh-os-ret-goods'].includes(pageId.value);
    }
    /** 委外发料/退料：关联加工单仅带出加工厂，物料为原料需手工挑选（非加工单成品行） */
    function isOsRawMatNoticePage(){
      return pageId.value==='wh-os-issue' || pageId.value==='wh-os-ret-mat';
    }
    function isBcSerialPage(){
      return pageId.value==='bc-serial-split' || pageId.value==='bc-serial-merge';
    }
    function isBcLineFormPage(){
      return pageId.value==='bc-scrap-proc' || pageId.value==='bc-freeze' || pageId.value==='bc-unfreeze';
    }
    function emptyBcLineRow(){
      const row = { _i: formLineRows.value.length + 1, 条码号: '' };
      if(pageId.value==='bc-scrap-proc') Object.assign(row, { 钢瓶编号: '', 当前工序: '—' });
      if(pageId.value==='bc-freeze' || pageId.value==='bc-unfreeze'){
        Object.assign(row, { 钢瓶类型: '', 空满状态: '', 库存状态: '' });
      }
      return row;
    }
    function fillBcScrapLineFromBarcode(row, bc){
      const code = String(bc || '').trim();
      if(!row || !code) return;
      const flow = ((MOCK['bc-scrap-proc']||{}).tab2||[]).find(r=> r['条码号']===code);
      row['条码号'] = code;
      row['钢瓶编号'] = flow?.['钢瓶编号'] || ('GC' + code.replace(/^TM/, ''));
      row['当前工序'] = flow?.['当前工序'] || '—';
    }
    function fillBcFreezeLineFromBarcode(row, bc){
      const code = String(bc || '').trim();
      if(!row || !code) return;
      const arch = ((MOCK['serial-arch']||{}).main||[]).find(r=> r['条码号']===code);
      row['条码号'] = code;
      row['钢瓶类型'] = arch?.['包材类型'] || '钢瓶';
      row['空满状态'] = arch?.['空满状态'] || '满';
      row['库存状态'] = arch?.['库存状态'] || '仓库';
    }
    function fillBcUnfreezeLineFromHit(row, hit){
      if(!row || !hit) return;
      const bc = hit['条码号'] || '';
      const arch = ((MOCK['serial-arch']||{}).main||[]).find(r=> r['条码号']===bc);
      row['条码号'] = bc;
      row['钢瓶类型'] = arch?.['包材类型'] || '钢瓶';
      row['空满状态'] = arch?.['空满状态'] || '满';
      row['库存状态'] = hit['库存状态'] || arch?.['库存状态'] || '仓库';
    }
    function onBcFormLineBarcodeEnter(row, fieldName){
      if(fieldName!=='条码号' || !row) return;
      const bc = String(row['条码号']||'').trim();
      if(!bc) return;
      if(pageId.value==='bc-scrap-proc') fillBcScrapLineFromBarcode(row, bc);
      else if(pageId.value==='bc-freeze') fillBcFreezeLineFromBarcode(row, bc);
    }
    function freezeListPickerRows(){
      const used = new Set((formLineRows.value||[]).map(r=> r['条码号']).filter(Boolean));
      return ((MOCK['bc-freeze-list']||{}).main||[]).filter(r=> !used.has(r['条码号'])).map(r=> ({
        ...r,
        编码: r['条码号'],
        名称: [r['条码号'], r['物料名称']].filter(Boolean).join(' / '),
        _pickerPageId: 'bc-freeze-list',
        _pickerTab: 'main',
        _pickerCodeField: '条码号'
      }));
    }
    function serialArchParentRow(arch, bc){
      const remain = String(arch['当前数量'] || arch['剩余数量'] || '0');
      return {
        _i: 1,
        库存状态: arch['库存状态'] || '—',
        条码号: bc,
        物料信息: arch['物料信息'] || '—',
        包装规格: arch['包装规格'] || '—',
        供应商名称: arch['供应商信息'] || arch['供应商名称'] || '—',
        库存单位: arch['库存单位'] || '—',
        剩余数量: remain,
        物料批号: arch['物料批号'] || '—',
        生产日期: arch['生产日期'] || '—',
        有效期: arch['有效期'] || '—',
        失效日期: arch['失效日期'] || '—',
        _archStock: arch['库存状态'] || '',
        _archLot: arch['物料批号'] || ''
      };
    }
    function serialMergeCompatible(mainRow, cand){
      const main = mainRow || formLineRows.value[0] || {};
      if(!main['条码号'] || !cand) return false;
      const mCode = codeOf(main['物料信息']);
      const cCode = codeOf(cand['物料信息'] || cand.物料信息);
      if(mCode && cCode && mCode !== cCode) return false;
      if(String(main._archStock || main['库存状态']) !== String(cand['库存状态'] || '')) return false;
      if(String(main._archLot || main['物料批号']) !== String(cand['物料批号'] || cand.名称 || '')) return false;
      return true;
    }
    function syncSerialSplitRemain(){
      if(pageId.value!=='bc-serial-split') return;
      const base = Number(formModel._splitRemainBase ?? formLineRows.value[0]?.['剩余数量'] ?? 0);
      const splitSum = (formBarcodeRows.value||[]).reduce((s,r)=> s + (Number(r['建档数量'])||0), 0);
      const remain = base - splitSum;
      formModel['拆分后剩余数量'] = Number.isFinite(remain) ? String(remain) : '';
    }
    function syncSerialMergeRemain(){
      if(pageId.value!=='bc-serial-merge') return;
      const mainQty = Number(formModel._mergeMainBase ?? formLineRows.value[0]?.['剩余数量'] ?? 0);
      const mergeSum = (formBarcodeRows.value||[]).reduce((s,r)=> s + (Number(r['剩余数量'])||0), 0);
      formModel['合并后剩余数量'] = String(mainQty + mergeSum);
    }
    function genSerialSplitBarcodes(){
      const cnt = parseInt(formModel['拆出条码个数'], 10);
      const scalar = Number(formModel['拆出条码标量']);
      if(!cnt || cnt < 1){ ElMessage.warning('拆出条码个数必须填写正整数'); return; }
      if(!(scalar > 0)){ ElMessage.warning('拆出条码标量必须填写正数'); return; }
      if(!formLineRows.value.length){ ElMessage.warning('请先选择需要拆分的原条码'); return; }
      const unit = formLineRows.value[0]['库存单位'] || 'KG';
      const startNo = nextTmNo();
      const head = startNo.slice(0, -4);
      const startSeq = parseInt(startNo.slice(-4), 10) || 1;
      formBarcodeRows.value = Array.from({length: Math.min(cnt, 50)}, (_, i) => ({
        _i: i + 1,
        条码号: head + String(startSeq + i).padStart(4, '0'),
        库存单位: unit,
        建档数量: String(scalar)
      }));
      formBarcodeSelected.value = [];
      syncSerialSplitRemain();
      ElMessage.success('已生成 '+formBarcodeRows.value.length+' 条子条码');
    }
    function onFormBarcodeAction(name){
      if(pageId.value==='bc-serial-split'){
        if(name==='生成条码'){
          genSerialSplitBarcodes();
          return;
        }
        if(name==='打印标签'){
          openPrintLabel(formBarcodeSelected.value, '请先勾选要打印的子条码');
          return;
        }
      }
      if(pageId.value==='bc-serial-merge'){
        if(name==='添加条码'){
          if(!formLineRows.value.length){ ElMessage.warning('请先选择合并目标主流水码'); return; }
          openPicker('添加条码');
          return;
        }
        if(String(name).includes('删除')){
          const selected = formBarcodeSelected.value || [];
          if(!selected.length){ ElMessage.warning('请先勾选要删除的待合并条码'); return; }
          const set = new Set(selected);
          formBarcodeRows.value = formBarcodeRows.value.filter(r=> !set.has(r));
          formBarcodeSelected.value = [];
          syncSerialMergeRemain();
          ElMessage.success('已删除勾选待合并条码，合并余量已更新');
          return;
        }
      }
      ElMessage.info(name);
    }
    function oeAllSamples(){
      const seen = new Set();
      const out = [];
      const push = r=>{
        if(!r || typeof r!=='object') return;
        const code = String(r['样品编号']||'').trim();
        if(!code || code==='—' || seen.has(code)) return;
        if(r['样品来源']==='样品拆分') return;
        seen.add(code);
        out.push(r);
      };
      (((MOCK['np-0201-11']||{}).main)||[]).forEach(push);
      Object.values(MOCK.ledger||{}).forEach(arr=>{ if(Array.isArray(arr)) arr.forEach(push); });
      Object.values(MOCK['entry-sample']||{}).forEach(arr=>{ if(Array.isArray(arr)) arr.forEach(push); });
      return out;
    }
    function oeSampleRows(){
      return oeAllSamples().filter(r=> String(r['样品状态']||'')!=='已完成');
    }
    function qrIssueDoneOrders(){
      const bag = (window.WMS_MOCK_ROWS||MOCK)['insp-order']||{};
      const out = [];
      Object.keys(bag).forEach(k=>{
        (Array.isArray(bag[k]) ? bag[k] : []).forEach(r=>{
          if(r && r['单据状态']==='已完成' && r['报检单号']) out.push(r);
        });
      });
      return out;
    }
