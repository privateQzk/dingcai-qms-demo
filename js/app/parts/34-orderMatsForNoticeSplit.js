    function orderMatsForNoticeSplit(noticeRow){
      const poCode = codeOf((noticeRow && noticeRow['关联采购订单']) || '');
      if(poCode) return poMatsOf(poCode);
      const moCode = codeOf((noticeRow && noticeRow['关联生产订单']) || '');
      if(moCode) return prodMatsOf(moCode);
      const wwCode = codeOf((noticeRow && noticeRow['关联委外加工单']) || '');
      if(wwCode){
        const ww = ((MOCK.wwpo||{}).main||[]).find(r=> r['委外订单号']===wwCode);
        return wwpoLinesOf(ww || {});
      }
      return [];
    }
    function noticeCtxFromForm(row){
      const m = row || formModel;
      return {
        关联发货单: m['关联发货单'],
        关联采购订单: m['关联采购订单'],
        关联生产订单: m['关联生产订单'],
        关联委外加工单: m['关联委外加工单'],
      };
    }
    function isOsFinishedNoticePage(){
      return pageId.value==='wh-os-recv' || pageId.value==='wh-os-ret-goods';
    }
    function finalizeNoticeFormLines(lines, ctx){
      const c = ctx || noticeCtxFromForm();
      const src = Array.isArray(lines) ? lines : [];
      if(pageId.value==='wh-po-in' || pageId.value==='wh-po-ret' || isOsFinishedNoticePage() || pageId.value==='wh-prod-in'){
        return assignNoticeSplitLineNos(alignNoticeDetailLinesFromShip(c, src), c).map((r,i)=> ({ ...r, _i: i+1 }));
      }
      return src.map((r,i)=> ({ ...r, _i: i+1 }));
    }
    function assignNoticeSplitLineNos(lines, noticeRow){
      const list = (lines||[]).map(ln=> ({ ...ln }));
      const orderMats = orderMatsForNoticeSplit(noticeRow);
      const orderBaseOf = (ln, idx)=>{
        const code = codeOf(ln['物料信息']);
        const hit = orderMats.find(m=> (m.编码||codeOf(m['物料信息']||m))===code);
        if(hit) return orderLineNoBase(hit, idx) || orderLineNoBase({ 行号: hit['行号'] }, idx);
        return orderLineNoBase(ln, idx) || erpLineNo(idx);
      };
      const byBase = new Map();
      list.forEach((ln, i)=>{
        const raw = String(ln['行号']||'').trim();
        let base = '';
        if(raw && /^\d+-\d+$/.test(raw)) base = raw.split('-')[0];
        else if(orderMats.length) base = orderBaseOf(ln, i+1);
        else if(raw) base = orderLineNoBase({ 行号: raw }, i+1);
        else base = orderLineNoBase(ln, i+1) || erpLineNo(i+1);
        if(!byBase.has(base)) byBase.set(base, []);
        byBase.get(base).push({ ln, i, raw });
      });
      byBase.forEach((group, base)=>{
        if(group.length <= 1){
          const { ln, raw } = group[0];
          if(!raw || raw==='—'){
            ln['行号'] = base;
            ln._orderLineNo = ln._orderLineNo || base;
          }
          return;
        }
        group.forEach(({ ln, raw }, idx)=>{
          const want = base + '-' + (idx+1);
          if(!raw || raw===base || /^\d+$/.test(raw)){
            ln['行号'] = want;
            ln._orderLineNo = ln._orderLineNo || base;
          }
        });
      });
      return list;
    }
    function usesErpLineNoCol(){
      return ['po','so','wwpo','lg-dispatch','lg-ship','lg-pickup','lg-sign'].includes(pageId.value)
        || isWhNoticePage()
        || isProdWhPage()
        || ['wh-so-ship','wh-so-ret','wh-so-preout','wh-direct-xfer'].includes(pageId.value);
    }
    /** 退货/退料类关联仓储业务：选来源订单允许已完成/已关闭 */
    function isReturnOrRetWhBiz(biz){
      const b = String(biz||'').trim();
      return ['采购退料','销售退货','委外退货','委外退料','受托退料'].includes(b);
    }
    function dispatchOrderStatusOk(st, biz){
      const s = String(st||'').trim();
      if(isReturnOrRetWhBiz(biz)) return ['执行中','已完成','已关闭'].includes(s);
      return ['待执行','执行中'].includes(s);
    }
    function dispatchBizForOrderPicker(){
      if(splitPickerMode.value) return splitBizOf() || '';
      return formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
    }
    function waybillCarrierFields(wayNo){
      const way = findWaybillSrc(wayNo);
      if(!way) return {};
      const plate = way['车牌号'] && way['车牌号']!=='—' ? String(way['车牌号']) : '—';
      const veh = plate && plate!=='—' ? ((MOCK.vehicle||{}).main||[]).find(v=> v['车牌号']===plate) : null;
      return {
        车牌号: plate,
        车挂号: (way['车挂号'] && way['车挂号']!=='—') ? String(way['车挂号']) : '—',
        司机姓名: (way['司机姓名'] && way['司机姓名']!=='—') ? String(way['司机姓名']) : '—',
        司机电话: (way['司机电话'] && way['司机电话']!=='—') ? String(way['司机电话']) : '—',
        司机身份证号: (veh && veh['司机身份证号'] && veh['司机身份证号']!=='—') ? String(veh['司机身份证号']) : '—'
      };
    }
    function canEditSo(row){
      return (row?.['订单状态'] || '')==='待执行';
    }
    function normPoFormLine(r,i){
      const idx = i != null ? i : 0;
      return {
        _i: idx+1,
        行号: lineNoOf(r, idx+1),
        物料编码: r['物料编码']||codeOf(r['物料信息']),
        物料信息: r['物料信息']||matInfoText(r['物料编码']||r['物料信息']),
        采购单位: r['采购单位']||matUnit(r['物料编码']||r['物料信息'],'po'),
        计划件数: String(r['计划件数'] ?? ''),
        计划数量: String(r['计划数量']||''),
        备注: r['备注']||''
      };
    }
    function normPoDetailLine(r,i){
      const idx = i != null ? i : 0;
      const plan = Number(r['计划数量'])||0;
      const inQty = Number(r['已入库数量'] ?? r['已入库'])||0;
      const pcs = String(r['计划件数'] ?? '').trim();
      return {
        _i: idx+1,
        行号: lineNoOf(r, idx+1),
        物料编码: r['物料编码']||codeOf(r['物料信息']),
        物料信息: r['物料信息']||matInfoText(r['物料编码']||r['物料信息']),
        采购单位: r['采购单位']||matUnit(r['物料编码']||r['物料信息'],'po'),
        计划件数: pcs || '—',
        计划数量: String(r['计划数量']||''),
        已入库数量: String(inQty),
        未入库数量: String(Math.max(0, plan - inQty)),
        行状态: r['行状态']||'待执行',
        备注: r['备注']||'—'
      };
    }
    function normSoFormLine(r,i){
      const idx = i != null ? i : 0;
      return {
        _i: idx+1,
        行号: lineNoOf(r, idx+1),
        物料编码: r['物料编码']||codeOf(r['物料信息']),
        物料信息: r['物料信息']||matInfoText(r['物料编码']||r['物料信息']),
        销售单位: r['销售单位']||matUnit(r['物料编码']||r['物料信息'],'so'),
        计划件数: String(r['计划件数'] ?? ''),
        计划数量: String(r['计划数量']||''),
        备注: r['备注']||''
      };
    }
    function normSoDetailLine(r,i){
      const idx = i != null ? i : 0;
      const plan = Number(r['计划数量'])||0;
      const outQty = Number(r['已出库数量'])||0;
      const pcs = String(r['计划件数'] ?? '').trim();
      return {
        _i: idx+1,
        行号: lineNoOf(r, idx+1),
        物料编码: r['物料编码']||codeOf(r['物料信息']),
        物料信息: r['物料信息']||matInfoText(r['物料编码']||r['物料信息']),
        销售单位: r['销售单位']||matUnit(r['物料编码']||r['物料信息'],'so'),
        计划件数: pcs || '—',
        计划数量: String(r['计划数量']||''),
        已出库数量: String(outQty),
        未出库数量: String(Math.max(0, plan - outQty)),
        行状态: r['行状态']||'待执行',
        备注: r['备注']||'—'
      };
    }
    function syncPoStatusFromLines(order){
      const lines = order._lines||[];
      if(!lines.length){ order['订单状态']='待执行'; return; }
      const sts = lines.map(l=> l['行状态']||'待执行');
      if(sts.every(s=> s==='已完成')) order['订单状态']='已完成';
      else if(sts.every(s=> s==='已关闭' || s==='已完成')) order['订单状态']='已关闭';
      else if(sts.some(s=> s==='执行中' || s==='已完成' || s==='已关闭')) order['订单状态']='执行中';
      else order['订单状态']='待执行';
    }
    /** 按订单行号汇总采购收料通知已完成数量，回写 PO「已入库数量」 */
    function syncPoReceivedQtyFromNotices(poCode){
      const c = codeOf(poCode);
      if(!c) return;
      const po = poOrderOf(c);
      if(!po || !Array.isArray(po._lines)) return;
      const qtyByLine = new Map();
      ((MOCK['wh-po-in']||{}).tab1||[]).forEach(notice=>{
        if(codeOf(notice['关联采购订单']) !== c) return;
        (notice._lines||[]).forEach(ln=>{
          const base = orderLineNoBase(ln);
          if(!base) return;
          const done = Number(String(ln['已完成数量']||'').replace(/[^\d.]/g,''))||0;
          qtyByLine.set(base, (qtyByLine.get(base)||0) + done);
        });
      });
      po._lines.forEach(ln=>{
        const base = orderLineNoBase(ln);
        const plan = Number(ln['计划数量'])||0;
        const inQty = qtyByLine.get(base)||0;
        ln['已入库数量'] = String(inQty);
        ln['未入库数量'] = String(Math.max(0, plan - inQty));
        if(plan > 0 && inQty >= plan) ln['行状态'] = '已完成';
        else if(inQty > 0) ln['行状态'] = '执行中';
        else if(!ln['行状态'] || ln['行状态']==='已完成') ln['行状态'] = '待执行';
      });
      syncPoStatusFromLines(po);
    }
    function syncAllPoReceivedQty(){
      ((MOCK.po||{}).main||[]).forEach(o=> syncPoReceivedQtyFromNotices(o['采购订单号']));
    }
    /** 采购收料通知单：物料编码 + 批号在单内唯一 */
    function assertPoInLineMatLotUnique(lines){
      const seen = new Set();
      for(const r of (lines||[])){
        const lot = String(r['批号']||'').trim();
        if(!lot || lot==='—'){ ElMessage.warning('请填写批号'); return false; }
        const key = codeOf(r['物料信息']) + '|' + lot;
        if(seen.has(key)){ ElMessage.warning('同一物料+批号不可重复添加'); return false; }
        seen.add(key);
      }
      return true;
    }
    function assertPoRetLineMatLotUnique(lines){
      const seen = new Set();
      for(const r of (lines||[])){
        let lot = String(r['批号']||'').trim();
        if(lot==='—') lot = '';
        const key = codeOf(r['物料信息']) + '|' + lot;
        if(seen.has(key)){ ElMessage.warning('同一物料+批号不可重复添加'); return false; }
        seen.add(key);
      }
      return true;
    }
    function nextQcInspectNo(){
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const prefix = 'QC' + ymd;
      const list = ((MOCK['qc-ledger']||{}).main||[]);
      let max = 0;
      list.forEach(r=>{
        const s = String(r['检验单号']||'');
        if(s.startsWith(prefix)){
          const n = parseInt(s.slice(prefix.length), 10);
          if(Number.isFinite(n) && n>max) max = n;
        }
      });
      return prefix + String(max + 1).padStart(2,'0');
    }
    /** 采购收料通知单保存后：每行物料自动生成一条来料检验台账（物料与批号一一对应） */
    function syncQcLedgerFromPoInNotice(noticeNo, lines){
      const no = String(noticeNo||'').trim();
      if(!no || !(lines||[]).length) return;
      const bag = (MOCK['qc-ledger'] = MOCK['qc-ledger'] || {});
      const list = (bag.main = bag.main || []);
      const kept = list.filter(r=> !(r._autoFromPoIn && String(r['关联单号']||'')===no));
      const d = new Date();
      const pad = n => String(n).padStart(2,'0');
      const now = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const newRows = (lines||[]).map((r, i)=>{
        const lot = String(r['批号']||'').trim();
        const mat = String(r['物料信息']||'').trim() || '—';
        return {
          id: 'qc-poin-' + no + '-' + (i+1) + '-' + Date.now(),
          检验单号: nextQcInspectNo(),
          关联单号: no,
          检验类型: '来料检验',
          物料信息: mat,
          批次号: lot,
          物料批次号: lot,
          抽样数量: '0',
          报检时间: now,
          报检人: '张三',
          检验日期: '',
          质检员: '',
          检验判定: '待判定',
          备注: '—',
          _autoFromPoIn: true,
          _poInLineId: r.id || ('L' + (i+1))
        };
      });
      bag.main = newRows.concat(kept);
    }
    function syncSoStatusFromLines(order){
      const lines = order._lines||[];
      if(!lines.length){ order['订单状态']='待执行'; return; }
      const sts = lines.map(l=> l['行状态']||'待执行');
      if(sts.every(s=> s==='已完成')) order['订单状态']='已完成';
      else if(sts.every(s=> s==='已关闭' || s==='已完成')) order['订单状态']='已关闭';
      else if(sts.some(s=> s==='执行中' || s==='已完成' || s==='已关闭')) order['订单状态']='执行中';
      else order['订单状态']='待执行';
    }
    function applyDateRangeQuery(rows, q, field){
      const rg = q[field];
      if(!rg || !Array.isArray(rg) || rg.length<2) return rows||[];
      const a = rg[0] ? String(rg[0]).slice(0,10) : '';
      const b = rg[1] ? String(rg[1]).slice(0,10) : '';
      if(!a && !b) return rows||[];
      return (rows||[]).filter(r=>{
        const d = String(r[field]||'').slice(0,10);
        if(a && d < a) return false;
        if(b && d > b) return false;
        return true;
      });
    }
    function sortByOrderDateDesc(rows){
      return (rows||[]).slice().sort((a,b)=> String(b['订单日期']||'').localeCompare(String(a['订单日期']||'')));
    }
    function soLinesAsForm(soCode){
      const hit = soOrderOf(soCode);
      if(hit && hit._lines && hit._lines.length) return ensureLineNos(hit._lines).map((r,i)=> normSoFormLine(r,i));
      const fallback = matInfoText('FG-Li2CO3-BG');
      return [{ _i:1, 行号:'10', 物料信息: fallback, 销售单位:'KG', 计划数量:'100', 备注:'' }];
    }
    function poLinesAsForm(poCode){
      const hit = poOrderOf(poCode);
      if(hit && hit._lines && hit._lines.length) return ensureLineNos(hit._lines).map((r,i)=> normPoFormLine(r,i));
      const fallback = matInfoText('RM-Li2CO3-BG');
      return [{ _i:1, 行号:'10', 物料信息: fallback, 采购单位:'KG', 计划数量:'100', 备注:'' }];
    }
    function stockSoMap(code){
      const hit = ((MOCK['wh-so-prep']||{}).main||[]).find(r=> r['备货通知单号']===code);
      if(hit && hit['关联销售订单']){
        const so = soOrderOf(hit['关联销售订单']);
        if(so) return so['销售订单号'] + ' / ' + (so['客户名称']||'');
      }
      const map = {
        BHT202608190001: 'XSDD202608190001 / 宁德时代新能源',
        BHT202608180002: 'XSDD202608180002 / 比亚迪锂电'
      };
      return map[code] || 'XSDD202608120001 / 宁德时代新能源';
    }
    function openConsignPrint(){
      if(selectedIds.value.length!==1){ ElMessage.warning('请勾选 1 条单据后再打印随车发货单'); return; }
      const row = tableData.value.find(r=> selectedIds.value.includes(r.id));
      if(!row){ ElMessage.warning('未找到勾选单据'); return; }
      let ship = null, notice = null;
      if(pageId.value==='lg-ship'){
        ship = row;
        notice = ((MOCK['wh-so-ship']||{}).tab1||[]).find(r=> String(r['关联发货单']||'').includes(row['发货单号']||''));
      } else if(pageId.value==='wh-so-ship' || pageId.value==='wh-so-preout'){
        notice = row;
        const dn = String(row['关联发货单']||'');
        ship = ((MOCK['lg-ship']||{}).main||[]).find(r=> dn && dn.includes(r['发货单号'])) || null;
      } else {
        ElMessage.warning('当前页不支持随车发货单打印'); return;
      }
      const way = ship ? ((MOCK['lg-waybill']||{}).main||[]).find(r=> String(r['关联发货单']||'').includes(ship['发货单号']||'')) : null;
      let linesSrc = (ship && ship._lines && ship._lines.length) ? ship._lines : [{物料信息: (ship||notice||{})['物料信息'], 发货数量:(ship||notice||{})['发货数量']||(notice||{})['物料信息']||'', 单位:'', 批号:''}];
      if(pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship'){
        if(notice && Array.isArray(notice._lines) && notice._lines.length) linesSrc = notice._lines;
      }
      consignPrint.编号 = (ship && ship['发货单号']) || (notice && notice['单号']) || '—';
      consignPrint.发货日期 = (ship && String(ship['计划装货时间']||'').slice(0,10)) || (notice && notice['计划执行日期']) || '';
      consignPrint.合同编号 = (ship && ship['合同号']) || (notice && lookupContractNo('销售订单', notice['关联销售订单']||notice['销售订单'])) || '—';
      consignPrint.收货单位 = (ship && (ship['卸货点']||'')) || '—';
      consignPrint.收货地址 = (ship && (ship['卸货点']||'')) || '—';
      consignPrint.联系人 = (ship && ship['卸货联系人']) || '—';
      consignPrint.联系电话 = (ship && ship['卸货联系电话']) || '—';
      consignPrint.司机姓名 = (way && way['司机姓名'] && way['司机姓名']!=='—') ? way['司机姓名'] : '—';
      consignPrint.司机电话 = (way && way['司机电话']) || '—';
      consignPrint.车牌号 = (way && way['车牌号']) || '—';
      consignPrint.备注 = (ship && ship['备注']) || (notice && notice['备注']) || '—';
      consignPrint.lines = linesSrc.map(ln=>({
        物品: ln['物料信息']||'',
        数量: ln['发货数量']||ln['计划数量']||'',
        单位: ln['单位']||ln['库存单位']||'',
        批号: ln['批号']||ln['物料批号']||'—'
      }));
      consignPrintVisible.value = true;
    }
    function rowOpDisabledReason(op, row){
      if(pageId.value===BIAS_PAGE){
        const st = row?.['状态'] || '';
        if(op.name==='数据录入' || op.name==='报告') return st === '已关闭' ? '已关闭不可操作' : '';
        if(op.name==='编辑') return st !== '待执行' ? '仅待执行可编辑' : '';
        if(op.name==='关闭') return !(st === '待执行' || st === '执行中') ? '当前状态不可关闭' : '';
        if(op.name==='删除') return !(st === '待执行' || st === '已完成') ? '当前状态不可删除' : '';
      }

      if(pageId.value===SPLIT_PAGE){
        if(op.name==='拆分') return sampSplitBlockReason(row||{});
        if(op.name==='拆分记录' && !sampSplitChildren((row||{})['样品编号']).length) return '该样品暂无拆分记录';
      }
      if(pageId.value===TASK_PAGE && op.name==='分配') return taskAssignBlock(row);
      if(pageId.value===TIME_FB_PAGE && op.name==='同步' && (row||{})['时间同步状态']==='已同步') return '已同步不可再次同步';
      if(pageId.value===DEV_PAGE) return devOpBlock(op.name, row);
      if(pageId.value===PLATE_PAGE) return plateOpBlock(op.name, row);
      if((isDjPlanPage() || isDjMyPage()) && (op.name==='作业执行' || op.name==='编辑') && !DJ_OPEN.includes((row||{})['计划状态'])) return '仅待执行、执行中的计划可操作';
      if(pageId.value===WJ_ORDER && (op.name==='执行' || op.name==='编辑') && !DJ_OPEN.includes((row||{})['单据状态'])) return '仅待执行、执行中的外校单可操作';
      if(pageId.value===BX_PAGE && op.name==='编辑' && (row||{})['单据状态']!=='待处理') return '仅待处理的报修单可编辑';
      if(isTyPage() && ['发起审批','编辑'].includes(op.name) && !TY_OPEN.includes((row||{})['审核状态'])) return tyOpenTip()+op.name;
      if(pageId.value===MSA_PAGE && op.name==='编辑' && (row||{})['计划状态']!=='待执行') return '仅待执行的计划可编辑';
      if(pageId.value===STB_PAGE && op.name==='编辑' && (row||{})['计划状态']!=='待执行') return '仅待执行的计划可编辑';
      if(pageId.value===BIAS_PAGE && (op.name==='编辑' || op.name==='删除') && (row||{})['状态']!=='待执行') return '仅待执行的计划可'+op.name;
      if(pageId.value==='capa-internal'){
        if(['确认发起','编辑'].includes(op.name) && (row||{})['整改状态']!==CAPA_LAUNCHABLE) return '仅待发起状态可'+op.name;
      }
      if(pageId.value===SR_PAGE){
        if(op.name==='编辑' && (row||{})['单据状态']!=='待处理') return '仅待处理的整改单可编辑';
      }
      if(pageId.value===HM_IMP_PAGE){
        if(['编辑','确认导入'].includes(op.name) && !hmOpenRow(row)) return hmImpTip()+op.name;
      }
      if(pageId.value===HM_VOID_PAGE){
        if(['编辑','确认作废'].includes(op.name) && !hmOpenRow(row)) return hmVoidTip()+op.name;
      }
      if(pageId.value===HM_CHG_PAGE){
        if(['编辑','确认变更'].includes(op.name) && !hmOpenRow(row)) return hmChgTip()+op.name;
      }
      if((pageId.value===WO_PAGE || pageId.value===MY_WX_PAGE) && ['维修','编辑'].includes(op.name) && !WO_OPEN.includes((row||{})['单据状态'])) return '仅待维修、维修中、退修的维修单可'+op.name;
      if(pageId.value==='np-0501-01' && op.name==='编辑' && (row||{})['采集状态']==='开启') return '开启状态不可编辑';
      if(pageId.value==='np-0201-02' && op.name==='编辑' && (row||{})['单据状态']!=='未完成') return '仅未完成的内部委托单可编辑';
      if(pageId.value==='insp-order' && activeTab.value==='tab-oe' && op.name==='编辑' && (row||{})['单据状态']!=='待执行') return '仅待执行的内部委托报检单可编辑';
      if((pageId.value==='np-0405-01' || pageId.value==='np-0405-02') && op.name==='执行' && !['待执行','执行中'].includes((row||{})['单据状态'])) return '仅待执行、执行中的单据可执行';
      if(pageId.value===CI_PAGE && ['确认发起','编辑'].includes(op.name) && (row||{})['改进状态']!=='待发起') return '仅待发起状态可'+op.name;
      if(pageId.value===WX_PAGE){
        const st = String((row||{})['维修状态']||'').trim();
        if((op.name==='确认发起' || op.name==='编辑') && st!=='待发起') return '仅待发起状态可'+op.name;
        if(op.name==='维修处理' && st!=='维修中') return '仅维修中状态可维修处理';
      }
      return '';
    }
    function visibleRowOps(row){
      let ops = tabView.value?.rowOps || [];
      if(pageId.value===BF_PAGE && (row||{})['审核状态']==='审核中') ops = ops.concat([{ name: '审核' }]);
      if(pageId.value==='np-0501-01'){
        const on = (row||{})['采集状态']==='开启';
        return ops.filter(op=>{
          if(op.name==='开启') return !on;
          if(op.name==='关闭') return on;
          return true;
        });
      }
      if(pageId.value==='lg-dispatch'){
        const audit = row?.['审核状态'] || '';
        const st = row?.['状态'] || '';
        return ops.filter(op=>{
          if(op.name==='发起审核') return (audit==='待审核' || audit==='审核中') && st==='待执行';
          if(op.name==='拆分') return audit==='已通过' && (st==='待执行' || st==='执行中');
          if(op.name==='编辑') return (audit==='待审核' || audit==='已驳回') && st==='待执行';
          return true;
        });
      }
      if(pageId.value==='lg-ship'){
        const st = row?.['状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待调度';
          return true;
        });
      }
      if(pageId.value==='wh-so-prep'){
        const st = row?.['备货状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(isWaybillPage()){
        const st = row?.['状态'] || '';
        const trans = row?.['运输类型'] || '';
        return ops.filter(op=>{
          if(op.name==='派车') return st==='待派车' || st==='待运输';
          if(op.name==='取消派车') return st==='待运输';
          if(op.name==='二次派车（专线）' || op.name==='二次派车' || op.name==='专线派车'){
            return trans==='专线' && ['待运输','运输中','已完成'].includes(st);
          }
          return true;
        });
      }
      if(pageId.value==='lg-kpi-scheme'){
        return ops.filter(op=>{
          if(op.name==='删除') return !kpiSchemeInUse(row['方案名称']);
          return true;
        });
      }
      if(pageId.value==='lg-kpi-plan'){
        const chk = row?.['复核状态'] || '';
        const aud = row?.['审核状态'] || '';
        return ops.filter(op=>{
          if(op.name==='复核') return chk==='待复核';
          if(op.name==='发起审核') return aud==='待审核';
          if(op.name==='查看审核记录') return ['审核中','审核通过','审核驳回'].includes(aud);
          return true;
        });
      }
      if(pageId.value==='lg-carrier-evt'){
        return ops.filter(op=>{
          if(op.name==='编辑') return row?.['处理状态']!=='已关闭';
          return true;
        });
      }
      if(pageId.value==='wwpo'){
        const st = row?.['订单状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(pageId.value==='wh-insp-scheme' || pageId.value===LAB_INSP_SCHEME){
        const on = row?.['启用状态']==='启用';
        return ops.filter(op=>{
          if(op.name==='编辑' || op.name==='删除') return !on;
          return true;
        });
      }
      if(pageId.value==='wh-insp-plan'){
        const st = row?.['计划状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(pageId.value===LAB_PREP || pageId.value===LAB_CALIB){
        const st = row?.['单据状态'] || '';
        return ops.filter(op=>{
          if(op.name==='执行') return st==='待执行' || st==='执行中';
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(pageId.value===LAB_INSP_PLAN){
        const st = row?.['计划状态'] || '';
        const can = st==='待执行' || st==='执行中';
        return ops.filter(op=>{
          if(op.name==='作业执行' || op.name==='编辑' || op.name==='删除') return can;
          return true;
        });
      }
      if(isLabCountPage()){
        return ops.filter(op=>{
          if(op.name==='编辑') return row?.['状态']==='待执行';
          return true;
        });
      }
      if(pageId.value===OQC_PAGE){
        return ops.filter(op=>{
          if(op.name==='编辑' || op.name==='上传附件') return row?.['单据状态']!=='已关闭';
          return true;
        });
      }
      if(isLabRgIoPage()){
        return ops.filter(op=>{
          if(op.name==='编辑') return row?.['单据状态']==='待执行';
          return true;
        });
      }
      if(pageId.value==='wh-so-preout'){
        const st = row?.['单据状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(pageId.value==='wh-so-ship'){
        const st = row?.['单据状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(pageId.value==='wh-so-ret'){
        const st = row?.['单据状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(isWhNoticePage() || isProdWhPage()){
        const st = row?.['单据状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(pageId.value==='po'){
        const st = row?.['订单状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(pageId.value==='so'){
        const st = row?.['订单状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return st==='待执行';
          return true;
        });
      }
      if(pageId.value==='serial-arch'){
        return ops.filter(op=>{
          if(op.name==='编辑') return row?.['使用状态']==='在用' && row?.['库存状态']==='初始化';
          return true;
        });
      }
      if(pageId.value==='tank-arch'){
        return ops.filter(op=>{
          if(op.name==='编辑') return canEditTankArch(row);
          return true;
        });
      }
      if(pageId.value==='insp-craft'){
        return ops.filter(op=>{
          if(op.name==='工艺配置') return row?.['启用状态']==='启用';
          return true;
        });
      }
      if(isLoadPage()){
        const tab = activeTab.value || (tabView.value||{}).name || 'tab1';
        const st = row?.['单据状态'] || row?.['流水状态'] || '';
        return ops.filter(op=>{
          if(op.name==='编辑') return tab==='tab1' && st==='待执行';
          if(op.name==='详情') return tab!=='tab3';
          return true;
        });
      }
      if(pageId.value==='bc-scrap-proc' || pageId.value==='bc-freeze' || pageId.value==='bc-unfreeze'){
        const tab = activeTab.value || (tabView.value||{}).name || 'tab1';
        if(tab!=='tab1') return ops;
        const st = row?.['单据状态'] || '';
        return ops.filter(op=> op.name!=='编辑' || st==='待执行');
      }
      return ops;
    }
    /** 列表/详情共用：状态类字段统一用彩色标签（对齐线上：已完成/合格绿、检验中粉、不合格红） */
