    function findSoOutNotice(outRow){
      if(!outRow) return {};
      const noticeNo = outRow['关联通知单号'] || '';
      const outNo = String(outRow['出库单号'] || outRow.编码 || '');
      const pid = outNo.startsWith('CKYC') ? 'wh-so-preout' : 'wh-so-ship';
      return (((MOCK[pid]||{}).tab1)||[]).find(r=> r['单号']===noticeNo) || {};
    }
    function applyOutToSoRetForm(outRow){
      if(pageId.value!=='wh-so-ret' || !outRow) return false;
      const notice = findSoOutNotice(outRow);
      const hasOut = !!codeOf(formModel['关联销售出库单'] || outRow['出库单号']);
      const srcLines = Array.isArray(notice._lines) && notice._lines.length
        ? notice._lines
        : [{ 物料信息: outRow['物料信息'], 批号: '—', 库存单位: outRow['库存单位']||'KG', 管理方式:'条码管理', 计划件数: outRow['已完成件数']||'1', 计划数量: outRow['已完成数量']||'1.000', 备注:'' }];
      formLineRows.value = srcLines.map((r,i)=>({
        _i: i+1,
        行状态: '待执行',
        物料信息: r['物料信息'] || outRow['物料信息'],
        批号: hasOut && String(r['管理方式']||'').includes('条码') ? '' : ((r['批号'] && r['批号']!=='—') ? r['批号'] : '—'),
        库存单位: r['库存单位'] || outRow['库存单位'] || 'KG',
        管理方式: r['管理方式'] || '条码管理',
        计划件数: String(r['计划件数'] || r['已完成件数'] || outRow['已完成件数'] || '1'),
        计划数量: String(r['已完成数量'] || r['计划数量'] || outRow['已完成数量'] || '1.000'),
        已完成数量: '0.000',
        未完成数量: String(r['已完成数量'] || r['计划数量'] || outRow['已完成数量'] || '1.000'),
        备注: r['备注'] || ''
      }));
      return true;
    }
    function clearPoInWaybillChain(){
      formModel['关联运单'] = '';
      formModel['关联发货单'] = '';
      formModel['承运商'] = '';
      formModel['车牌号'] = '';
      formModel['车挂号'] = '';
      formModel['司机姓名'] = '';
      formModel['司机电话'] = '';
      formModel['司机身份证号'] = '';
    }
    function todayYmdLocal(){
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    function poMatsOf(poNo){
      const code = codeOf(poNo);
      if(!code) return [];
      const mapped = (PO_MAT_MAP[code]||[]).map(m=>({...m}));
      if(mapped.length) return mapped;
      const po = poOrderOf(code);
      if(po && Array.isArray(po._lines) && po._lines.length){
        return po._lines.map(ln=>({
          编码: ln['物料编码'] || codeOf(ln['物料信息']),
          名称: ln['物料名称'] || '',
          规格: ln['物料规格'] || '',
          种类: ln['物料种类'] || '',
          供应商: po['供应商名称'] || '',
          计划数量: String(ln['未入库数量'] != null && ln['未入库数量'] !== '' ? ln['未入库数量'] : (ln['计划数量'] || '')),
          计划件数: ln['计划件数'] || '',
          采购单位: ln['采购单位'] || '',
          行号: ln['行号'] || '',
          备注: (ln['备注'] && ln['备注']!=='—') ? ln['备注'] : ''
        })).filter(m=> m.编码);
      }
      return [];
    }
    /** 储罐类液体物料（硫酸/液碱等）入库后不支持采购退料 */
    function isPoRetTankMat(src){
      const code = codeOf((src && (src.编码 || src['物料编码'] || src.code || src['物料信息'])) || src || '');
      if(['RM-H2SO4','RM-NaOH','RM-HCl'].includes(code)) return true;
      const mr = matListRow(code) || (src && typeof src==='object' ? src : null) || {};
      const kind = String(mr['物料种类'] || mr.种类 || mr.kind || '');
      if(kind.includes('液体')) return true;
      const blob = [mr['物料名称']||mr.名称||'', mr['备注']||'', mr['物料规格']||''].join('');
      return /浓硫酸|液碱|盐酸|槽车|储罐/.test(blob) && kind.includes('危化');
    }
    function normalizePoRetFormLine(r, i){
      const mode = String((r && r['管理方式']) || '').trim();
      const isCount = mode.includes('计数');
      const lot = String((r && r['批号']) || '').trim();
      const ln = lineNoOf(r, i);
      return Object.assign({}, r, {
        _i: (i != null ? i : (r && r._i)) || 1,
        行号: r['行号'] || ln,
        _orderLineNo: r._orderLineNo || ln,
        批号: (!lot || lot==='—') ? '' : lot,
        计划件数: isCount ? '—' : (r['计划件数'] != null && r['计划件数'] !== '' ? r['计划件数'] : ''),
        生产日期: undefined,
        有效期: undefined,
        生产厂家: undefined,
      });
    }
    function buildPoInFormLines(mats, supplier){
      const ymd = todayYmdLocal();
      const ymdCompact = ymd.replace(/-/g,'');
      const vendor = supplier || formModel['供应商名称'] || '';
      const forRet = pageId.value==='wh-po-ret';
      return (mats||[]).map((m,i)=>{
        const code = m.编码 || codeOf(m['物料信息']);
        const mr = matListRow(code);
        const mode = (mr && mr['管理方式']) || '条码管理';
        const isCount = String(mode).includes('计数');
        const planQtyNum = Number(m.计划数量);
        const planQty = Number.isFinite(planQtyNum) && planQtyNum>0 ? String(planQtyNum) : String(m.计划数量 || '100');
        let planPcs = String(m.计划件数 || '').trim();
        if(forRet && isCount){
          planPcs = '—';
        } else if(!planPcs || !(Number(planPcs)>0)){
          const q = Number(planQty);
          planPcs = String(Number.isFinite(q) && q>0 ? Math.max(1, Math.round(q >= 1000 ? q/1000 : q)) : 1);
        }
        const ln = lineNoOf(m, i+1);
        const row = {
          _i: i+1,
          行号: ln,
          _orderLineNo: ln,
          物料信息: matInfoText(m),
          库存单位: m.采购单位 || matUnit(m,'po'),
          管理方式: mode,
          计划件数: planPcs,
          计划数量: planQty,
          批号: forRet ? '' : (ymdCompact + String(i+1).padStart(3,'0')),
          备注: m.备注 || ''
        };
        if(!forRet){
          row.生产日期 = ymd;
          row.有效期 = String((mr && (mr['有效期']||mr['保质期'])) || '12');
          row.生产厂家 = vendor || m.供应商 || '';
        }
        return row;
      });
    }
    function applyPoToPoInForm(poNo, pickerRow){
      const code = codeOf(poNo || (pickerRow && pickerRow.编码) || '');
      const po = poOrderOf(code) || {};
      const supplier = po['供应商名称'] || (pickerRow && pickerRow.名称) || formModel['供应商名称'] || '';
      formModel['关联采购订单'] = (po['采购订单号'] || code) + (supplier ? (' / ' + supplier) : '');
      formModel['供应商名称'] = supplier;
      if(po['预计到货日期']) formModel['计划执行日期'] = po['预计到货日期'];
      let mats = poMatsOf(code);
      if(pageId.value==='wh-po-ret'){
        const all = mats.map(m=>({...m}));
        mats = all.filter(m=> !isPoRetTankMat(m));
        poMatPool.value = mats;
        formLineRows.value = ensureLineNos(buildPoInFormLines(mats, supplier).map((r,i)=> normalizePoRetFormLine(r, i+1)));
        if(all.length && !mats.length){
          ElMessage.warning('该采购订单仅含储罐类液体物料，不支持采购退料');
        } else if(all.length > mats.length){
          ElMessage.info('已自动排除储罐类液体物料（入库后不支持退料）');
        }
      } else {
        poMatPool.value = mats.map(m=>({...m}));
        formLineRows.value = ensureLineNos(buildPoInFormLines(mats, supplier));
      }
      clearPoInWaybillChain();
    }
    function prodOrderOf(moNo){
      const c = codeOf(moNo);
      return ((MOCK['prod-order']||{}).main||[]).find(r=> r['生产订单号']===c || codeOf(r['生产订单号'])===c) || null;
    }
    function prodMatsOf(moNo){
      const code = codeOf(moNo);
      if(!code) return [];
      const mo = prodOrderOf(code);
      if(mo && Array.isArray(mo._lines) && mo._lines.length){
        return mo._lines.map(ln=>({
          编码: ln['物料编码'] || codeOf(ln['物料信息']),
          名称: ln['物料名称'] || '',
          规格: ln['物料规格'] || '',
          种类: ln['物料种类'] || '',
          计划数量: String(ln['未完工数量'] != null && ln['未完工数量'] !== '' ? ln['未完工数量'] : (ln['计划数量'] || '')),
          计划件数: ln['计划件数'] || '',
          库存单位: ln['库存单位'] || '',
          行号: ln['行号'] || '',
          备注: (ln['备注'] && ln['备注']!=='—') ? ln['备注'] : ''
        })).filter(m=> m.编码);
      }
      return [];
    }
    function buildProdInFormLines(mats){
      return (mats||[]).map((m,i)=>{
        const code = m.编码 || codeOf(m['物料信息']);
        const mr = matListRow(code);
        const mode = (mr && mr['管理方式']) || '条码管理';
        const isCount = String(mode).includes('计数');
        const planQtyNum = Number(m.计划数量);
        const planQty = Number.isFinite(planQtyNum) && planQtyNum>0 ? String(planQtyNum) : String(m.计划数量 || '100');
        let planPcs = String(m.计划件数 || '').trim();
        if(isCount){
          planPcs = '—';
        } else if(!planPcs || !(Number(planPcs)>0)){
          const q = Number(planQty);
          planPcs = String(Number.isFinite(q) && q>0 ? Math.max(1, Math.round(q >= 1000 ? q/1000 : q)) : 1);
        }
        const ln = lineNoOf(m, i+1);
        const ymd = todayYmdLocal();
        return {
          _i: i+1,
          行号: ln,
          _orderLineNo: ln,
          物料信息: matInfoText(m),
          库存单位: m.库存单位 || (mr && mr['库存单位']) || matUnit(m),
          管理方式: mode,
          计划件数: planPcs,
          计划数量: planQty,
          批号: '',
          生产日期: ymd,
          有效期: String((mr && (mr['有效期']||mr['保质期'])) || '12'),
          生产厂家: '',
          备注: m.备注 || ''
        };
      });
    }
    function applyProdOrderToProdInForm(moNo, pickerRow){
      const code = codeOf(moNo || (pickerRow && pickerRow.编码) || '');
      const mo = prodOrderOf(code) || {};
      const dept = mo['生产部门'] || (pickerRow && pickerRow.名称) || '';
      formModel['关联生产订单'] = (mo['生产订单号'] || code) + (dept ? (' / ' + dept) : '');
      if(mo['计划完工日期']) formModel['计划执行日期'] = mo['计划完工日期'];
      const mats = prodMatsOf(code);
      formLineRows.value = finalizeNoticeFormLines(buildProdInFormLines(mats));
    }
    function ensurePoMatPoolFromRef(){
      const noticePages = ['wh-po-in','wh-po-ret','wh-os-issue','wh-os-recv','wh-os-ret-mat','wh-os-ret-goods'];
      if(!noticePages.includes(pageId.value)) return;
      if((poMatPool.value||[]).length) return;
      const refField = whNoticeRefField();
      const ref = String(formModel[refField]||'').trim();
      if(!ref || ref==='—') return;
      const refCode = codeOf(ref);
      if(!refCode) return;
      if(isOsPoPage()){
        if(!isOsRawMatNoticePage()){
          const ww = ((MOCK.wwpo||{}).main||[]).find(r=> r['委外订单号']===refCode);
          poMatPool.value = wwpoLinesOf(ww || {}).map(m=>({...m, 编码: matCodeOfLine(m)}));
        }
      } else {
        let pool = poMatsOf(refCode);
        if(pageId.value==='wh-po-ret') pool = pool.filter(m=> !isPoRetTankMat(m));
        poMatPool.value = pool;
      }
    }
    function waybillOrderCode(w){
      const fields = [w['采购订单'], w['关联订单号'], w['订单号'], w['ERP采购订单号'], w['委外加工单'], w['关联委外加工单']];
      for(const v of fields){
        const c = codeOf(v);
        if(c && c !== '—') return c;
        if(String(v||'').trim() && String(v||'').trim() !== '—') return String(v).trim();
      }
      return '';
    }
    function waybillsLinkedToOrder(refNo){
      const code = codeOf(refNo);
      const all = ((MOCK['lg-waybill']||{}).main||[]).filter(w=> w['状态']!=='已关闭');
      if(!code) return [];
      const wantType = whNoticeBizType();
      let list = all.filter(w=>{
        const ord = waybillOrderCode(w);
        if(ord) return ord === code;
        const blob = [w['采购订单'], w['关联订单号'], w['订单号'], w['ERP采购订单号'], w['委外加工单'], w['关联委外加工单'], w['合同号']].map(v=>String(v||'')).join(' ');
        return blob.includes(code);
      });
      if(wantType){
        const byBiz = list.filter(w=> String(w['仓库业务类型']||'')===wantType);
        list = byBiz.length ? byBiz : list;
      }
      return list;
    }
    function waybillsLinkedToPo(poNo){ return waybillsLinkedToOrder(poNo); }
    function isFormPickerDisabled(f){
      if(!f) return false;
      if(pageId.value===HM_VOID_PAGE && f.name==='文件编号' && formMode.value==='edit') return true;
      if(pageId.value===HM_CHG_PAGE && f.name==='原文件' && formMode.value==='edit') return true;
      if(pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret'){
        if(f.name==='关联运单') return !(formModel['关联销售订单'] && formModel['关联销售订单']!=='—');
        if(f.name==='关联发货单') return !(formModel['关联运单'] && formModel['关联运单']!=='—');
        return false;
      }
      if(isCsWhPage()){
        if(f.name==='关联发货单') return !(formModel['关联运单'] && formModel['关联运单']!=='—');
        return false;
      }
      if(pageId.value==='wh-other-in' || pageId.value==='wh-other-out'){
        if(f.name==='关联发货单') return !(formModel['关联运单'] && formModel['关联运单']!=='—');
        return false;
      }
      if(isLoadPage()){
        if(f.name==='关联单号') return !(formModel['关联仓库业务'] && formModel['关联仓库业务']!=='—');
        if(f.name==='关联发货单') return !(formModel['关联运单'] && formModel['关联运单']!=='—');
        return false;
      }
      if(!isWhNoticePage()) return false;
      if(f.name==='关联运单') return !(formModel[whNoticeRefField()] && formModel[whNoticeRefField()]!=='—');
      if(f.name==='关联发货单') return !(formModel['关联运单'] && formModel['关联运单']!=='—');
      return false;
    }
    function formPickerPlaceholder(f){
      if(pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret'){
        if(f.name==='关联运单' && isFormPickerDisabled(f)) return '请先选择关联销售订单';
        if(f.name==='关联发货单' && isFormPickerDisabled(f)) return '请先选择关联运单';
      }
      if(isCsWhPage()){
        if(f.name==='关联发货单' && isFormPickerDisabled(f)) return '请先选择关联运单';
      }
      if(pageId.value==='wh-other-in' || pageId.value==='wh-other-out'){
        if(f.name==='关联发货单' && isFormPickerDisabled(f)) return '请先选择关联运单';
      }
      if(isLoadPage()){
        if(f.name==='关联单号' && isFormPickerDisabled(f)) return '请先选择关联仓库业务';
        if(f.name==='关联发货单' && isFormPickerDisabled(f)) return '请先选择关联运单';
      }
      if(isWhNoticePage()){
        if(f.name==='关联运单' && isFormPickerDisabled(f)) return isLoadPage() ? '请先选择关联单号' : (isOsPoPage() ? '请先选择关联委外加工单' : '请先选择关联采购订单');
        if(f.name==='关联发货单' && isFormPickerDisabled(f)) return '请先选择关联运单';
      }
      if(pageId.value==='lg-dispatch' && f && f.name==='前置关联单据') return '请选择销售出库单（选填）';
      return '请点击选择';
    }
    function applyStocktakeMatFilter(codes){
      const list = (codes||[]).filter(Boolean);
      formModel._stockMatCodes = list;
      const mode = formModel['盘点方式'] || '';
      const inv = ((MOCK['wh-stocktake']||{}).stockInvLines || []);
      const bc = ((MOCK['wh-stocktake']||{}).stockBarcodeLines || []);
      formLineRows.value = inv.filter(r=> stocktakeInvRowVisible(r, list, mode)).map((r,i)=>({_i:i+1, ...r}));
      formBarcodeRows.value = bc.filter(r=> stocktakeBarcodeRowVisible(r, list, mode)).map(r=>({...r}));
    }
    function stocktakeMatManageMode(code){
      const m = matListRow(code);
      return String((m && m['管理方式']) || '');
    }
    function stocktakeMatAllowed(code, mode){
      const mm = stocktakeMatManageMode(code);
      if(String(mode||'').includes('条码')) return /条码/.test(mm);
      return /条码|计数/.test(mm);
    }
    function stocktakeInvRowVisible(row, codes, mode){
      const code = codeOf(row['物料编码']||row['物料信息']||row);
      if(!stocktakeMatAllowed(code, mode)) return false;
      return !codes.length || codes.includes(code);
    }
    function stocktakeBarcodeRowVisible(row, codes, mode){
      const code = codeOf(row['物料编码']||row['物料信息']||row);
      if(!stocktakeInvRowVisible(row, codes, mode)) return false;
      if(!/条码/.test(stocktakeMatManageMode(code))) return false;
      const bc = String(row['条码号']||'').trim();
      return bc && bc!=='—';
    }
    function pruneStocktakeMatsByMode(){
      const mode = formModel['盘点方式'] || '';
      const codes = formModel._stockMatCodes || [];
      if(!codes.length){
        applyStocktakeMatFilter([]);
        return;
      }
      const kept = codes.filter(c=> stocktakeMatAllowed(c, mode));
      if(kept.length!==codes.length){
        formModel['物料信息'] = kept.map(c=>{
          const info = matInfoText(c);
          const parts = String(info).split(' / ');
          return (parts[0] && parts[1]) ? (parts[0]+' / '+parts[1]) : (info || c);
        }).join('、');
        ElMessage.info('已按盘点方式剔除不符合的物料');
      }
      applyStocktakeMatFilter(kept);
    }
    function prodIssueLineManageMode(r){
      let mode = String((r && r['管理方式']) || '').trim();
      if(mode && mode!=='—') return mode;
      const code = codeOf((r && (r['物料信息']||r['物料编码'])) || '');
      const mr = matListRow(code);
      return String((mr && mr['管理方式']) || '');
    }
    function pruneProdIssueMatsByPickType(){
      if(pageId.value!=='wh-prod-issue') return;
      if(formModel['领料类型']!=='备品备件领料') return;
      const before = (formLineRows.value||[]).length;
      formLineRows.value = (formLineRows.value||[]).filter(r=> /计数/.test(prodIssueLineManageMode(r)));
      if((formLineRows.value||[]).length!==before){
        ElMessage.info('备品备件领料仅可选计数管理物料，已剔除不符合明细');
      }
    }
    function onFormPickerClear(f){
      if(!f || !f.name) return;
      formModel[f.name] = '';
      if(pageId.value===SPLIT_PAGE && f.name==='样品编号'){
        ['报检单号','物料编码','物料名称','物料规格','报检批号'].forEach(k=>{ formModel[k] = ''; });
        formModel._splitParent = null;
        formModel._splitParents = [];
        formLineRows.value = [];
      }
      if(pageId.value==='np-0601-01' && f.name==='产出物料') ['产出物料编码','产出物料名称','产出物料规格','产出物料种类'].forEach(k=> { formModel[k] = ''; });
      if(pageId.value===WX_PAGE && f.name==='仪器编号'){ formModel._instId = ''; WX_INST_KEYS.forEach(k=> { formModel[k] = ''; }); }
      if(pageId.value===LAB_PREP && f.name==='试液信息') ['计量单位','有效期','配液模板'].forEach(k=> { formModel[k] = ''; });
      if(pageId.value===LAB_CALIB && f.name==='条码号') ['试液信息','批号','数量','计量单位','生产日期','有效期','标定模板'].forEach(k=> { formModel[k] = ''; });
      if(pageId.value==='item-uom'){
        if(f.name==='检验项单位1') formModel['检验项单位1编码'] = '';
        if(f.name==='检验项单位2') formModel['检验项单位2编码'] = '';
      }
      if(pageId.value==='bc-serial-split' && f.name==='条码号'){
        formLineRows.value = [];
        formBarcodeRows.value = [];
        formBarcodeSelected.value = [];
        formModel['拆分后剩余数量'] = '';
        formModel['拆出条码个数'] = '';
        formModel['拆出条码标量'] = '';
        delete formModel._splitRemainBase;
      }
      if(pageId.value==='bc-serial-merge' && f.name==='条码号（主条码）'){
        formLineRows.value = [];
        formBarcodeRows.value = [];
        formBarcodeSelected.value = [];
        formModel['合并后剩余数量'] = '';
        delete formModel._mergeMainBase;
      }
      if(pageId.value==='lg-dispatch' && (f.name==='订单号' || f.name==='采购订单')){
        if(f.name==='订单号'){
          formModel['关联销售备货单'] = '';
          formModel['关联销售预出货单'] = '';
        }
        formLineRows.value = [];
      }
      if(pageId.value==='wh-stocktake' && f.name==='物料信息'){
        applyStocktakeMatFilter([]);
      }
      if(pageId.value==='wh-prod-in' && f.name==='关联生产订单'){
        formLineRows.value = [];
      }
      if(isWhNoticePage()){
        if(f.name==='关联采购订单' || f.name==='关联委外加工单'){
          poMatPool.value = [];
          formLineRows.value = [];
          clearPoInWaybillChain();
        } else if(f.name==='关联运单'){
          formModel['关联发货单'] = '';
          formModel['车牌号'] = '';
          formModel['车挂号'] = '';
          formModel['司机姓名'] = '';
          formModel['司机电话'] = '';
          formModel['司机身份证号'] = '';
          if(isOsPoPage()) restoreOsNoticeLinesFromWwpo();
        } else if(f.name==='关联发货单'){
          formModel['关联发货单'] = '';
          if(isOsPoPage()) restoreOsNoticeLinesFromWwpo();
        }
      }
      if(isCsWhPage()){
        if(f.name==='关联销售订单'){
          formModel['客户名称'] = '';
          formLineRows.value.forEach(r=>{ if(r) r['生产厂家'] = ''; });
        } else if(f.name==='关联运单'){
          formModel['关联发货单'] = '';
          formModel['车牌号'] = '';
          formModel['车挂号'] = '';
          formModel['司机姓名'] = '';
          formModel['司机电话'] = '';
          formModel['司机身份证号'] = '';
          formLineRows.value = [];
        } else if(f.name==='关联发货单'){
          formModel['关联发货单'] = '';
          formLineRows.value = [];
        }
      }
      if(pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret'){
        if(f.name==='关联销售订单'){
          formModel['客户名称'] = '';
          formModel['关联运单'] = '';
          formModel['关联发货单'] = '';
          if(pageId.value==='wh-so-ship') formModel['关联销售预出货单'] = '';
          if(pageId.value==='wh-so-ret') formModel['关联销售出库单'] = '';
          ['车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
          formLineRows.value = [];
        } else if(f.name==='关联运单'){
          formModel['关联发货单'] = '';
          ['承运商','车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
        } else if(f.name==='关联销售预出货单' && pageId.value==='wh-so-ship'){
          formModel['关联销售预出货单'] = '';
          formLineRows.value = [];
        } else if(f.name==='关联销售出库单' && pageId.value==='wh-so-ret'){
          formModel['关联销售出库单'] = '';
          formLineRows.value = [];
        }
      }
      if(pageId.value==='wh-other-in' || pageId.value==='wh-other-out'){
        if(f.name==='关联运单'){
          formModel['关联发货单'] = '';
          ['承运商','车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
        } else if(f.name==='关联发货单'){
          formModel['关联发货单'] = '';
        }
      }
      if(isLoadPage()){
        if(f.name==='关联仓库业务'){
          formModel['关联单号'] = '';
          formModel['客供信息'] = '';
          formLineRows.value = [];
          clearPoInWaybillChain();
          formModel['承运商'] = '';
        } else if(f.name==='关联单号'){
          formModel['关联单号'] = '';
          formModel['客供信息'] = '';
          formLineRows.value = [];
          clearPoInWaybillChain();
          formModel['承运商'] = '';
        } else if(f.name==='关联运单'){
          formModel['关联发货单'] = '';
          ['承运商','车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
        } else if(f.name==='关联发货单'){
          formModel['关联发货单'] = '';
        }
      }
    }
