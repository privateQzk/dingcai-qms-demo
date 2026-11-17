    function isStatusTagField(name){
      if(!name) return false;
      const n = String(name);
      if(/参考参数|结果值|描述|说明|原因|内容|时间|人员|标准|备注/.test(n)) return false;
      if(n.endsWith('状态') || n.endsWith('结论')) return true;
      return n==='检查结果' || n==='评定结果' || n==='上次内校结果' || n==='上次外校结果'
        || n==='循环方式' || n==='事件等级' || n==='初步责任判定' || n==='行状态' || n==='行驶状态' || n==='结果' || n==='优先级'
        || n==='单据状态' || n==='流水状态';
    }
    function isDetailTagField(name){
      return isStatusTagField(name);
    }
    function isPresentTagValue(v){
      const s = String(v == null ? '' : v).trim();
      return !!(s && s !== '-' && s !== '—' && s !== '/');
    }
    function detailFieldLabel(f){
      const name = f?.name || f || '';
      if(isWaybillPage() && name==='状态') return '运单状态';
      return name;
    }
    function isBizLinkField(name){
      if(!name || name==='发货单号' || name==='运单号' || name==='提货单号' || name==='签收单号' || name==='编号') return false;
      if(pageId.value==='spectrum-file' && name==='文件路径') return true;
      if(name==='备货通知单号' || name==='关联备货通知单' || name==='关联销售备货单' || name==='关联销售预出货单' || name.includes('销售订单')) return true;
      return name.includes('运单') || name.includes('派车') || name.includes('仓储') || name.includes('发货单') || name.includes('提货') || name.includes('签收单') || name==='关联订单号' || name==='关联出库单号' || name==='关联单号' || name==='关联业务单号' || name==='装卸单号' || name==='关联装卸通知单号' || name==='装卸通知单号' || name.includes('出库单') || name.includes('入库单') || name.includes('采购订单') || name.includes('收料通知');
    }
    function onBizLink(field, value, row){
      if(!value || value==='—' || value==='/') return;
      if(pageId.value==='spectrum-file' && field==='文件路径'){ previewSpectrumFile(row || (((MOCK['spectrum-file']||{}).main)||[]).find(r=> r['文件路径']===value)); return; }
      if(pageId.value===SR_PAGE && field==='在线填写链接'){ openSrExt(row); return; }
      if((pageId.value===HM_IMP_PAGE || pageId.value===HM_VOID_PAGE || pageId.value===HM_CHG_PAGE) && field==='审核单号'){ openHmAuditDetail(row); return; }
      if(pageId.value===COL_PAGE && field==='色谱柱图片'){ previewColImage(row); return; }
      if(pageId.value===OQC_PAGE && field==='附件'){ ElMessage.info('预览附件：'+value); return; }
      if(pageId.value===TRAIN_PAGE && field==='附件'){ ElMessage.info('预览附件：'+value); return; }
      if(pageId.value===LAB_STOCK_BOARD && row && /数量|件数/.test(String(field||''))){
        drillLabStockBoard(field, row);
        return;
      }
      if(field==='处置详情' || value==='点击查看'){
        disposeDetailViewRows.value = [
          {样本来源:'报检取样',检验结论:'不合格',偏差结论:'—',是否接收:'接收',新物料信息:'—'},
          {样本来源:'报检取样',检验结论:'不合格',偏差结论:'OOS',是否接收:'返工',新物料信息:'OLED-HIL-002 / 空穴注入层中间体B'}
        ];
        disposeDetailVisible.value = true;
        return;
      }
      if(pageId.value==='wh-so-prep' && field==='备货通知单号'){
        const row = tableData.value.find(r=> r['备货通知单号']===value) || (((MOCK['wh-so-prep']||{}).main)||[]).find(r=> r['备货通知单号']===value);
        if(row){ openDetail(row); return; }
      }
      if((pageId.value==='bc-serial-split' && field==='拆分单号') || (pageId.value==='bc-serial-merge' && field==='合并单号')){
        const row = tableData.value.find(r=> r[field]===value) || (((MOCK[pageId.value]||{}).main)||[]).find(r=> r[field]===value);
        if(row){ openDetail(row); return; }
      }
      let label = '详情';
      if(field.includes('运单') && !field.includes('发货')) label = '运单详情';
      else if(field.includes('派车')) label = '派车申请单详情';
      else if(field.includes('仓储')) label = '仓储通知单详情';
      else if(field.includes('提货')) label = '提货单详情';
      else if(field.includes('签收')) label = '签收单详情';
      else if(field.includes('发货')) label = '发货单详情';
      else if(field==='备货通知单号') label = '备货通知单详情';
      ElMessage.success('跳转' + label + '：' + value);
    }
    function emptyDispatchLine(i){
      return { _i:i, 物料信息:'', 需求数量:'', 单位:'', '体积(长*宽*高)':'', 行备注:'' };
    }
    const DISPATCH_ORDER_BY_BIZ = {
      '销售发货': '销售订单',
      '销售预出货': '销售订单',
      '销售退货': '销售订单',
      '受托收料': '销售订单',
      '受托退料': '销售订单',
      '采购入库': '采购订单',
      '采购退料': '采购订单',
      '委外发料': '委外加工订单',
      '委外退料': '委外加工订单',
      '委外收货': '委外加工订单',
      '委外退货': '委外加工订单'
    };
    function dispatchOrderTypeForBiz(biz){
      return DISPATCH_ORDER_BY_BIZ[String(biz||'').trim()] || '';
    }
    function dispatchNeedsOrderNo(){
      const biz = (formModel && (formModel['关联仓储业务'] || formModel['仓库业务类型'])) || '';
      return !!dispatchOrderTypeForBiz(biz);
    }
    function syncDispatchDeliveryTypeByBiz(){
      const biz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
      if(biz === '销售发货'){
        if(!formModel['配送类型']) formModel['配送类型'] = '正常业务';
      } else {
        formModel['配送类型'] = '';
        formModel['采购订单'] = '';
        if(biz !== '销售预出货') formModel['关联销售备货单'] = '';
        formModel['关联销售预出货单'] = '';
        formModel['前置关联单据'] = '';
      }
    }
    function syncDispatchOrderTypeByBiz(){
      const biz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
      syncDispatchDeliveryTypeByBiz();
      const need = dispatchOrderTypeForBiz(biz);
      const prev = formModel['订单类型'] || '';
      if(need){
        if(prev !== need){
          formModel['订单类型'] = need;
          formModel['订单号'] = '';
          formModel['合同号'] = formModel['配送类型']==='直发业务（贸易）' ? (formModel['合同号']||'') : '';
          formLineRows.value = [];
        }
      } else if(prev && prev !== '无'){
        formModel['订单类型'] = '无';
        formModel['订单号'] = '';
        if(formModel['配送类型']!=='直发业务（贸易）') formModel['合同号'] = '';
      } else if(!prev){
        formModel['订单类型'] = '无';
      }
    }
    function dispatchLinesFromOrder(orderType, orderNo){
      const code = codeOf(orderNo);
      if(!code) return [];
      const toLine = (r, i)=>({
        _i: i+1,
        行号: lineNoOf(r, i+1),
        _orderLineNo: lineNoOf(r, i+1),
        物料信息: r['物料信息'] || matInfoText(r),
        需求数量: String(r['计划数量'] || r['需求数量'] || ''),
        计划件数: r['计划件数'] != null && r['计划件数'] !== '' ? String(r['计划件数']) : '',
        单位: r['单位'] || r['销售单位'] || r['采购单位'] || matUnit(r, orderType==='销售订单' ? 'so' : 'po'),
        '体积(长*宽*高)': r['体积(长*宽*高)'] || '',
        行备注: r['行备注'] || r['备注'] || ''
      });
      if(orderType==='销售订单') return soLinesAsForm(code).map(toLine);
      if(orderType==='采购订单') return poLinesAsForm(code).map(toLine);
      if(orderType==='委外加工单' || orderType==='委外加工订单'){
        const ww = ((MOCK.wwpo||{}).main||[]).find(r=> r['委外订单号']===code);
        return ensureLineNos(wwpoLinesOf(ww || {})).map((r,i)=> toLine(r,i));
      }
      return [];
    }
    function dispatchPreDocKind(bizOverride){
      const biz = bizOverride || formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
      if(biz==='销售退货') return 'so-ret-pre';
      return '';
    }
    function completedSoOutboundRows(soCode){
      let outs = (((MOCK['wh-so-ship']||{}).tab2)||[]).concat(((MOCK['wh-so-preout']||{}).tab2)||[])
        .filter(r=> r['单据状态']==='已完成');
      const so = codeOf(soCode);
      if(so) outs = outs.filter(r=> codeOf(r['关联销售订单'])===so);
      return outs;
    }
    function wrapSoOutboundPickerRows(rows){
      return (rows || []).map(r=>{
        const pid = String(r['出库单号']||'').startsWith('CKYC') ? 'wh-so-preout' : 'wh-so-ship';
        const tab = 'tab2';
        const wrapped = wrapPickerModuleRows(pid, [r], '出库单号', '物料信息', tab)[0];
        return {
          ...wrapped,
          名称: (wrapped.名称 || r['物料信息'] || '') + ' / 销售出库单',
          规格: '销售出库单'
        };
      });
    }
    function normalizeDispatchSoShipPreDocs(row){
      const src = row || {};
      let stock = String(src['关联销售备货单'] || src['关联备货通知单'] || '').trim();
      let preout = String(src['关联销售预出货单'] || '').trim();
      const legacy = String(src['前置关联单据'] || '').trim();
      if(!preout && legacy && /预出货|XSYCH|CKYC/i.test(legacy)) preout = codeOf(legacy);
      if(!stock && legacy && /BHT|备货/i.test(legacy)) stock = codeOf(legacy);
      return { 关联销售备货单: stock, 关联销售预出货单: preout };
    }
    function soNoticeLinesToDispatchLines(lines){
      return (lines || []).map((r, i) => ({
        _i: i + 1,
        行号: lineNoOf(r, i + 1),
        _orderLineNo: lineNoOf(r, i + 1),
        物料信息: r['物料信息'] || matInfoText(r),
        需求数量: String(r['计划数量'] || r['需求数量'] || r['备货数量'] || r['已完成数量'] || '0'),
        单位: r['库存单位'] || r['销售单位'] || r['单位'] || matUnit(r, 'so'),
        '体积(长*宽*高)': r['体积(长*宽*高)'] || '',
        行备注: (r['备注'] && r['备注'] !== '—') ? r['备注'] : (r['行备注'] || ''),
      }));
    }
    function applyPrepToDispatchForm(prep, no){
      if(!prep) return false;
      formModel['关联销售备货单'] = no;
      const lines = [{
        物料信息: prep['物料信息'] || matInfoText(prep),
        计划数量: String(prep['备货数量'] || prep['已备数量'] || prep['计划数量'] || '0'),
        库存单位: prep['单位'] || prep['库存单位'] || 'KG',
        备注: prep['备注'] || '',
      }];
      formLineRows.value = soNoticeLinesToDispatchLines(lines);
      return true;
    }
    function applyPreoutToDispatchForm(outRow){
      if(!outRow) return false;
      const outNo = outRow['出库单号'] || outRow.编码 || '';
      formModel['关联销售预出货单'] = outNo;
      const notice = findPreoutNoticeByOut(outRow);
      if(notice && notice['关联备货通知单'] && notice['关联备货通知单'] !== '—'){
        formModel['关联销售备货单'] = notice['关联备货通知单'];
      }
      let lines = preoutActualLinesOfOut(outNo);
      if(!lines.length && notice && Array.isArray(notice._lines) && notice._lines.length){
        const doneQty = String(outRow['已完成数量'] || '').trim();
        const donePcs = String(outRow['已完成件数'] || '').trim();
        lines = notice._lines.map(r => ({
          物料信息: r['物料信息'] || outRow['物料信息'],
          批号: (r['批号'] && r['批号'] !== '—') ? r['批号'] : '—',
          库存单位: r['库存单位'] || outRow['库存单位'] || 'KG',
          计划件数: donePcs || String(r['计划件数'] || '1'),
          计划数量: doneQty || String(r['已完成数量'] || r['计划数量'] || '0'),
          备注: r['备注'] || '',
        }));
      }
      if(!lines.length && outRow['物料信息']){
        lines = [{
          物料信息: outRow['物料信息'],
          库存单位: outRow['库存单位'] || 'KG',
          计划件数: String(outRow['已完成件数'] || '1'),
          计划数量: String(outRow['已完成数量'] || '0'),
          备注: '',
        }];
      }
      if(!lines.length) return false;
      formLineRows.value = soNoticeLinesToDispatchLines(lines);
      return true;
    }
    function splitBizOf(){
      return (splitRow.value && (splitRow.value['关联仓储业务'] || splitRow.value['仓库业务类型'] || resolveWhBizType(splitRow.value))) || '';
    }
    const splitNeedsOrder = computed(()=> !!dispatchOrderTypeForBiz(splitBizOf()));
    const splitShowPreDoc = computed(()=> splitBizOf()==='销售退货');
    const splitShowSoShipPreDocs = computed(()=> splitBizOf()==='销售发货');
    const splitShowSoPreoutPrepDoc = computed(()=> splitBizOf()==='销售预出货');
    const splitPreDocRequired = computed(()=> false);
    const splitShowPo = computed(()=>{
      const dt = (splitRow.value && splitRow.value['配送类型']) || '';
      return dt==='直发业务（贸易）' || dt==='供应商直送';
    });
    function onSplitOrderTypeChange(){
      splitForm.订单号 = '';
      splitForm.关联销售备货单 = '';
      splitForm.关联销售预出货单 = '';
      splitForm.前置关联单据 = '';
      splitForm.合同号 = '';
    }
    function openSplitPicker(title){
      if(title==='订单号' && (!splitForm.订单类型 || splitForm.订单类型==='无')){
        ElMessage.warning('请先选择订单类型'); return;
      }
      if(title==='前置关联单据' && splitBizOf()!=='销售退货'){
        ElMessage.warning('当前关联仓储业务无需选择前置关联单据'); return;
      }
      if(title==='关联销售预出货单' && splitBizOf()!=='销售发货'){
        ElMessage.warning('仅销售发货业务可选择预出货出库单'); return;
      }
      if(title==='关联销售备货单' && !['销售发货','销售预出货'].includes(splitBizOf())){
        ElMessage.warning('仅销售发货/销售预出货业务可选择备货通知单'); return;
      }
      splitPickerMode.value = true;
      openPicker(title);
    }
    watch(pickerVisible, (v)=>{ if(!v) splitPickerMode.value = false; });
    function dispatchLinesFromPreDoc(kind, code){
      const c = codeOf(code);
      if(!c) return [];
      const toLine = (r, i)=>({
        _i: i+1,
        行号: lineNoOf(r, i+1),
        _orderLineNo: lineNoOf(r, i+1),
        物料信息: r['物料信息'] || matInfoText(r),
        需求数量: String(r['计划数量'] || r['需求数量'] || r['备货数量'] || r['已完成数量'] || r['数量'] || ''),
        单位: r['单位'] || r['库存单位'] || r['销售单位'] || matUnit(r, 'so'),
        '体积(长*宽*高)': r['体积(长*宽*高)'] || '',
        行备注: r['行备注'] || r['备注'] || ''
      });
      if(kind==='so-ship-pre'){
        const preout = ((MOCK['wh-so-preout']||{}).tab1||(MOCK['wh-so-preout']||{}).main||[]).find(r=> codeOf(r['单号'])===c);
        if(preout){
          const lines = Array.isArray(preout._lines) && preout._lines.length ? preout._lines : [preout];
          return lines.map(toLine);
        }
      }
      if(kind==='so-ret-pre'){
        const hit = completedSoOutboundRows().find(r=> codeOf(r['出库单号'])===c);
        if(hit) return [toLine(hit, 0)];
      }
      return [];
    }
    function emptyShipLine(i){
      return { _i:i, 物料信息:'', 发货数量:'', 单位:'', '体积(长*宽*高)':'', 批号:'', 行备注:'' };
    }
    function normWwpoFormLine(r, i){
      const idx = i != null ? i : 0;
      const unit = r['采购单位'] || r['单位'] || matUnit(r,'po');
      const info = matInfoText(r);
      return {
        _i: idx+1,
        行号: lineNoOf(r, idx+1),
        物料信息: info,
        物料编码: codeOf(info) || r['物料编码']||'',
        采购单位: unit,
        计划件数: String(r['计划件数'] ?? ''),
        计划数量: String(r['计划数量']||''),
        备注: (r['备注'] && r['备注']!=='—') ? r['备注'] : ''
      };
    }
    function normWwpoDetailLine(r, i){
      const idx = i != null ? i : 0;
      const plan = Number(r['计划数量'])||0;
      const done = Number(r['已出/入库数量'] ?? r['已出/收数量'])||0;
      const pcs = String(r['计划件数'] ?? '').trim();
      let lineSt = r['行状态'] || '待执行';
      if(!r['行状态']){
        if(done<=0) lineSt='待执行';
        else if(done<plan) lineSt='执行中';
        else if(done>=plan && plan>0) lineSt='已完成';
      }
      return {
        _i: idx+1,
        行号: lineNoOf(r, idx+1),
        物料信息: matInfoText(r),
        物料编码: r['物料编码']||codeOf(r['物料信息']),
        单位: r['单位'] || r['采购单位'] || matUnit(r,'po'),
        计划件数: pcs || '—',
        计划数量: String(r['计划数量']||''),
        '已出/入库数量': String(done),
        '未出/入库数量': String(Math.max(0, plan-done)),
        行状态: lineSt,
        备注: r['备注']||'—'
      };
    }
    function normWwpoLine(r, i){ return normWwpoDetailLine(r, i); }
    function syncWwpoStatusFromLines(order){
      const lines = order._lines||[];
      if(!lines.length){ order['订单状态']='待执行'; return; }
      const sts = lines.map(l=> l['行状态']||'待执行');
      if(sts.every(s=> s==='已完成')) order['订单状态']='已完成';
      else if(sts.every(s=> s==='已关闭' || s==='已完成')) order['订单状态']='已关闭';
      else if(sts.some(s=> s==='执行中' || s==='已完成' || s==='已关闭')) order['订单状态']='执行中';
      else order['订单状态']='待执行';
    }
    function wwpoDownstreamInUse(wwCode){
      const c = codeOf(wwCode);
      if(!c) return false;
      const pages = ['wh-os-issue','wh-os-recv','wh-os-ret-mat','wh-os-ret-goods'];
      return pages.some(pid=>{
        const arr = (MOCK[pid]||{}).tab1;
        return Array.isArray(arr) && arr.some(r=> codeOf(r['关联委外加工单'])===c);
      });
    }
    function canEditWwpo(row){
      return (row?.['订单状态'] || '')==='待执行';
    }
    function wwpoLinesOf(row){
      if(row && Array.isArray(row._lines) && row._lines.length) return ensureLineNos(row._lines).map((r,i)=>normWwpoFormLine(r,i));
      return ((MOCK.wwpo||{}).detailLines || []).map((r,i)=>normWwpoFormLine(r,i));
    }
    function osVendors(){
      return ((MOCK.supplier||{}).main||[]).filter(s=> s['启用状态']==='启用' && String(s['供应商类型']||'').includes('委外'));
    }
    function inspLocRows(){
      const typeMap = { '原料仓':'危化品库', '成品仓':'危化品库', '包材仓':'常温库', '线边仓':'常温库', '待检仓':'常温库' };
      const whs = ((MOCK.warehouse||{}).tab1||[]);
      return ((MOCK.warehouse||{}).tab2||[]).filter(b=> b['启用状态']==='启用').map(b=>{
        const wh = whs.find(w=> w['仓库名称']===b['所属仓库']) || {};
        const typ = typeMap[b['所属仓库']] || '常温库';
        return {
          编码: b['库位编码'],
          名称: b['库位名称'],
          规格: typ + ' / ' + (b['库位位置']||''),
          仓库编号: wh['仓库编码'] || '',
          仓库名称: b['所属仓库'] || '',
          仓库类型: typ,
          '库区/库位': b['库位名称'] || b['库位位置'] || '',
          责任人: wh['创建人'] || '张三',
          备注: (b['备注'] && b['备注']!=='—') ? b['备注'] : '—'
        };
      });
    }
    function parseQtyUnit(text, defUnit){
      const m = String(text||'').trim().match(/^(\d+(?:\.\d+)?)\s*\/?\s*(.*)$/);
      let u = (m && m[2]) ? m[2] : (defUnit||'');
      if(u==='分') u = '分钟';
      if(u==='时') u = '小时';
      return { n: m ? m[1] : '', u: u };
    }
    function inspPlanSchemeOf(name){
      return ((MOCK['wh-insp-scheme']||{}).main||[]).find(r=> r['巡检方案名称']===name) || null;
    }
    function fillInspPlanFromWarehouse(whName){
      const loc = (formModel._schemeLocs||[]).find(l=> l['仓库名称']===whName) || {};
      formModel['仓库编号'] = loc['仓库编号'] || '';
      formModel['仓库名称'] = whName || '';
      formModel['仓库类型'] = loc['仓库类型'] || inspWhTypeOf(whName);
      formModel['负责人'] = loc['负责人'] || '—';
    }
    function fillPlanFromScheme(name){
      const sch = inspPlanSchemeOf(name);
      if(!sch) return;
      formModel['巡检方案名称'] = sch['巡检方案名称'];
      formModel['内容描述'] = sch['内容描述'] || '';
      formModel['巡检方案描述'] = sch['内容描述'] || '';
      formModel._schemeLocs = (sch._locs||[]).slice();
      if(pageId.value==='wh-insp-plan'){
        if(formMode.value==='add' || formMode.value==='copy'){
          formModel['目标仓库'] = '';
          formModel['仓库编号'] = '';
          formModel['仓库名称'] = '';
          formModel['仓库类型'] = '';
          formModel['负责人'] = '';
        }
        return;
      }
      const loc = (sch._locs||[])[0] || {};
      formModel['仓库编号'] = loc['仓库编号'] || '';
      formModel['仓库名称'] = loc['仓库名称'] || '';
      formModel['仓库类型'] = loc['仓库类型'] || '';
      formModel['存放位置/库区'] = loc['仓库名称'] || loc['库区/库位'] || '';
    }
    function shipLinesOf(row){
      const lines = (row && Array.isArray(row._lines) && row._lines.length) ? row._lines : ((MOCK['lg-ship']||{}).detailLines || []);
      return lines.map((r,i)=>{
        const qty = shipLineQty(r);
        const signed = shipLineSigned(r);
        const ln = String(r['行号'] || r._rowNo || '').trim();
        const displayLn = (ln && ln!=='—') ? ln : erpLineNo(i+1);
        return Object.assign({}, r, {
          行号: displayLn,
          _orderLineNo: r._orderLineNo || orderLineNoBase(r, i+1),
          未签收数量: String(Math.max(0, qty - signed))
        });
      });
    }
    function vehicleTypeKey(vt){
      const t = String(vt||'').trim();
      if(WH_BIZ_BY_VEHICLE[t]) return t;
      if(t==='其他' || !VEHICLE_OPTS.includes(t)) return '其他';
      return t;
    }
    function whBizTypesForVehicle(vt){
      return WH_BIZ_BY_VEHICLE[vehicleTypeKey(vt)] || WH_BIZ_BY_VEHICLE['其他'];
    }
    function defaultWhBizForVehicle(vt){
      return WH_BIZ_DEFAULT[vehicleTypeKey(vt)] || '无';
    }
