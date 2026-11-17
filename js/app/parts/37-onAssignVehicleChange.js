    function onAssignVehicleChange(plate){
      const v = assignVehicles.value.find(x=> x['车牌号']===plate) || {};
      const trailer = (v['车挂号'] && v['车挂号']!=='—') ? v['车挂号'] : ((v['挂车号'] && v['挂车号']!=='—') ? v['挂车号'] : '');
      assignForm.车挂号 = trailer;
      assignForm.司机姓名 = (v['司机姓名'] && v['司机姓名']!=='—') ? v['司机姓名'] : '';
      assignForm.司机电话 = (v['联系电话'] && v['联系电话']!=='—') ? v['联系电话'] : '';
      assignForm.驾驶证号 = (v['驾驶证号'] && v['驾驶证号']!=='—') ? v['驾驶证号'] : '';
      assignForm.从业资格证号 = (v['从业资格证号'] && v['从业资格证号']!=='—') ? v['从业资格证号'] : '';
      assignForm.押运员姓名 = (v['押运员姓名'] && v['押运员姓名']!=='—') ? v['押运员姓名'] : '';
      assignForm.押运员资格证号 = (v['押运员资格证号'] && v['押运员资格证号']!=='—') ? v['押运员资格证号'] : '';
    }
    function onAssignOk(){
      if(!assignForm.承运商名称){ ElMessage.warning('运单未绑定承运商，请先在发货单合并下发时选择承运商'); return; }
      if(!assignForm.车牌号){ ElMessage.warning('请选择主车车牌号'); return; }
      if(!String(assignForm.司机姓名||'').trim() || !String(assignForm.司机电话||'').trim()){
        ElMessage.warning('所选主车档案未关联主驾驶员姓名或电话，请先在【车辆及司机列表】中完善档案'); return;
      }
      if(isDangerWaybill(assignRow.value) && (!String(assignForm.押运员姓名||'').trim() || !String(assignForm.押运员资格证号||'').trim())){
        ElMessage.warning('本运单包含危险品物料，所选车辆档案未关联押运员资质，请先在【车辆及司机列表】中完善档案'); return;
      }
      const row = assignRow.value;
      const patch = {
        承运商名称: assignForm.承运商名称,
        车牌号: assignForm.车牌号,
        车挂号: assignForm.车挂号 || '—',
        司机姓名: assignForm.司机姓名,
        司机电话: assignForm.司机电话,
        驾驶证号: assignForm.驾驶证号 || '—',
        从业资格证号: assignForm.从业资格证号 || '—',
        押运员姓名: assignForm.押运员姓名 || '—',
        押运员资格证号: assignForm.押运员资格证号 || '—',
        状态: '待运输'
      };
      const src = patchWaybill(row, patch);
      assignVisible.value = false;
      const fleetPatch = {
        承运商名称: assignForm.承运商名称,
        司机车牌号: assignForm.车牌号,
        车挂号: assignForm.车挂号 || '—',
        司机姓名: assignForm.司机姓名,
        司机电话: assignForm.司机电话
      };
      const wayNo = (src||row)['运单号'];
      patchPickupsByWaybill(wayNo, fleetPatch);
      patchSignsByWaybill(wayNo, fleetPatch);
      createNoticesForWaybillAfterAssign(wayNo);
      if(STORE && wayNo) STORE.setDocStatus(wayNo, '待运输', { source:'PC', action:'assign' });
      bumpStore();
      ElMessage.success('派车成功，运单已更新为待运输状态；已生成仓储通知单');
    }
    function patchNoticeCarrierFields(noticeRow, carrier){
      if(!noticeRow || !carrier) return;
      Object.keys(carrier).forEach(k=>{
        const v = carrier[k];
        if(v && v!=='—') noticeRow[k] = v;
        else if(!noticeRow[k] || noticeRow[k]==='—') noticeRow[k] = v || '—';
      });
    }
    function fillNoticeLineDefaults(notice, ship, partyName){
      if(!notice || !Array.isArray(notice._lines)) return;
      const forRet = String(notice['单号']||'').startsWith('CGTT')
        || String(notice['单号']||'').startsWith('XSTH')
        || String(notice['单号']||'').startsWith('WWTH')
        || String(notice['单号']||'').startsWith('WWTT')
        || String(notice['单号']||'').startsWith('STTL');
      const planDate = notice['计划执行日期'] || todayYmdLocal();
      const shipLines = (ship && ship._lines) || [];
      notice._lines = notice._lines.map((ln, i)=>{
        const shipLine = shipLines[i] || shipLines.find(s=> (s['行号']||s._rowNo)===ln['行号']) || {};
        const built = buildNoticeLineFromShip(Object.assign({}, shipLine, {
          物料信息: ln['物料信息'] || shipLine['物料信息'],
          发货数量: ln['计划数量'] || shipLine['发货数量'],
          行号: ln['行号'] || shipLine['行号'] || shipLine._rowNo,
          批号: (ln['批号'] && ln['批号']!=='—') ? ln['批号'] : shipLine['批号'],
          单位: ln['库存单位'] || shipLine['单位'],
          行备注: ln['备注'] || shipLine['行备注']
        }), { supplier: partyName, planDate, forRet, idx: i, noticeNo: notice['单号']||notice['通知单号']||'' });
        return Object.assign({}, ln, built, {
          id: ln.id || built.id,
          已完成数量: ln['已完成数量'] || built['已完成数量'],
          未完成数量: ln['未完成数量'] || built['未完成数量']
        });
      });
    }
    function createNoticesForWaybillAfterAssign(wayNo){
      if(!wayNo || wayNo==='—') return;
      const ships = shipsOfWaybill(wayNo);
      ships.forEach(s=>{
        const noticeNo = s['关联仓储通知单'];
        const whBiz = resolveWhBizType(s);
        if(!noticeNo || noticeNo==='—' || !whBiz || whBiz==='无' || whBiz==='—') return;
        const meta = whBizNoticeMeta(whBiz);
        if(!meta) return;
        const store = MOCK[meta.pageId] = MOCK[meta.pageId] || {};
        store[meta.tab] = store[meta.tab] || [];
        const existing = store[meta.tab].find(r=> String(r[meta.noKey]||'')===noticeNo);
        if(existing){
          const carrier = waybillCarrierFields(wayNo);
          patchNoticeCarrierFields(existing, carrier);
          const partyName = String(s['订单号']||'').split(/\s*\/\s*/)[1]?.trim() || existing['供应商名称'] || existing['客户名称'] || '';
          fillNoticeLineDefaults(existing, s, partyName);
          if(meta.pageId==='wh-po-in') syncQcLedgerFromPoInNotice(existing[meta.noKey], existing._lines);
        } else {
          createWarehouseNoticeFromShip(s, wayNo, noticeNo, whBiz);
        }
      });
    }
    function pickupList(){
      const pk = (MOCK['lg-pickup'] = MOCK['lg-pickup'] || { main: [] });
      pk.main = pk.main || [];
      return pk.main;
    }
    function nextThNo(){
      const list = pickupList();
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const n = list.filter(r => String(r['提货单号']||'').startsWith('TH'+ymd)).length + 1;
      return 'TH' + ymd + String(n).padStart(2,'0');
    }
    function patchPickupsByWaybill(wayNo, patch){
      if(!wayNo || wayNo==='—') return;
      pickupList().forEach(p=>{
        if(p['关联运单号']===wayNo) Object.assign(p, patch);
      });
    }
    function buildPickupFromShip(ship, wayNo, extra){
      const thNo = nextThNo();
      const d = extra || {};
      const srcLines = (ship._lines && ship._lines.length) ? ship._lines : [{
        物料信息: ship['物料信息']||'',
        发货数量: ship['发货数量']||'',
        '体积(长*宽*高)': '—',
        单位: '',
        行备注: '—'
      }];
      pickupList().unshift({
        id: 'th-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
        提货单号: thNo,
        状态: '待执行',
        关联运单号: wayNo,
        关联发货单号: ship['发货单号'] || '—',
        关联派车单号: ship['来源派车单号'] || ship['来源派车申请单'] || '—',
        物料信息: ship['物料信息'] || '',
        总数量: ship['发货数量'] || '',
        申请部门: ship['申请部门'] || '',
        申请人: ship['申请人'] || '',
        用车类型: ship['用车类型'] || '',
        车型要求: ship['车型要求'] || '',
        是否带托盘: ship['是否带托盘'] || '',
        特殊要求: ship['特殊要求'] || '—',
        装货点: ship['装货点'] || '',
        装货联系人: ship['装货联系人'] || '',
        装货联系电话: ship['装货联系电话'] || '',
        卸货点: ship['卸货点'] || '',
        卸货联系人: ship['卸货联系人'] || '',
        卸货联系电话: ship['卸货联系电话'] || '',
        计划装货时间: ship['计划装货时间'] || '—',
        要求送达时间: ship['要求送达时间'] || '—',
        承运商名称: d.承运商名称 || '—',
        司机车牌号: d.车牌号 || d.司机车牌号 || '—',
        车挂号: d.车挂号 || '—',
        司机姓名: d.司机姓名 || '—',
        司机电话: d.司机电话 || '—',
        司机确认状态: '未确认',
        实际提货时间: '—',
        打卡备注: '—',
        创建时间: d.创建时间 || '',
        _photos: [],
        _lines: srcLines.map(r=>({
          物料信息: r['物料信息']||'',
          应提数量: r['发货数量']||r['应提数量']||'',
          实提数量: '—',
          '体积(长*宽*高)': r['体积(长*宽*高)']||'—',
          单位: r['单位']||'',
          行备注: r['行备注']||'—'
        })),
        _procs: []
      });
      return thNo;
    }
    function signList(){
      const sg = (MOCK['lg-sign'] = MOCK['lg-sign'] || { main: [] });
      sg.main = sg.main || [];
      return sg.main;
    }
    function nextRcNo(){
      const list = signList();
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const n = list.filter(r => String(r['签收单号']||'').startsWith('RC'+ymd)).length + 1;
      return 'RC' + ymd + String(n).padStart(2,'0');
    }
    function patchSignsByWaybill(wayNo, patch, onlyPending){
      if(!wayNo || wayNo==='—') return;
      signList().forEach(s=>{
        if(s['关联运单号']!==wayNo) return;
        if(onlyPending && s['状态']!=='待执行') return;
        Object.assign(s, patch);
      });
    }
    function ensureSignFromWaybill(way){
      const wayNo = way && way['运单号'];
      const st = way && way['状态'];
      if(!wayNo || !['运输中','已到达','已签收','已完成'].includes(st)) return '';
      const hit = signList().find(s => s['关联运单号']===wayNo);
      if(hit) return hit['签收单号'] || '';
      const pk = pickupList().find(p => p['关联运单号']===wayNo) || {};
      const d = new Date();
      const pad = n => String(n).padStart(2,'0');
      const now = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const rcNo = nextRcNo();
      const srcLines = (pk._lines && pk._lines.length) ? pk._lines : (way._lines || []);
      const settle = way && way['结算状态'];
      signList().unshift({
        id: 'rc-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
        签收单号: rcNo,
        状态: (st==='已签收' || st==='已完成' || settle==='待结算' || settle==='已结算') ? '已完成' : '待执行',
        关联运单号: wayNo,
        关联提货单号: pk['提货单号'] || '—',
        关联发货单号: pk['关联发货单号'] || String(way['关联发货单']||'').split(/[、,，]/)[0] || '—',
        关联派车单号: pk['关联派车单号'] || '—',
        物料信息: pk['物料信息'] || way['物料信息'] || '',
        总数量: pk['总数量'] || way['总数量'] || '',
        申请部门: pk['申请部门'] || way['申请部门'] || '',
        申请人: pk['申请人'] || way['申请人'] || '',
        用车类型: pk['用车类型'] || way['用车类型'] || '',
        车型要求: pk['车型要求'] || way['车型要求'] || '',
        是否带托盘: pk['是否带托盘'] || way['是否带托盘'] || '',
        特殊要求: pk['特殊要求'] || way['特殊要求'] || '—',
        装货点: pk['装货点'] || '',
        装货联系人: pk['装货联系人'] || '',
        装货联系电话: pk['装货联系电话'] || '',
        卸货点: pk['卸货点'] || '',
        卸货联系人: pk['卸货联系人'] || '',
        卸货联系电话: pk['卸货联系电话'] || '',
        计划装货时间: pk['计划装货时间'] || way['计划装货时间'] || '—',
        要求送达时间: pk['要求送达时间'] || way['要求送达时间'] || '—',
        承运商名称: way['承运商名称'] || pk['承运商名称'] || '—',
        司机车牌号: way['车牌号'] || pk['司机车牌号'] || '—',
        车挂号: way['车挂号'] || pk['车挂号'] || '—',
        司机姓名: way['司机姓名'] || pk['司机姓名'] || '—',
        司机电话: way['司机电话'] || pk['司机电话'] || '—',
        实际到达时间: st==='运输中' || st==='已到达' || st==='已签收' || st==='已完成' ? now : '—',
        签收人: '—',
        签收人电话: '—',
        签收时间: '—',
        收货确认状态: '未确认',
        打卡备注: '—',
        电子签名: '—',
        创建时间: now,
        _photos: [],
        _signature: '',
        _lines: srcLines.map(r=>({
          物料信息: r['物料信息']||'',
          应收数量: r['应提数量']||r['实提数量']||r['发货数量']||r['应收数量']||'',
          已签收数量: '—',
          未签收数量: r['应提数量']||r['发货数量']||r['应收数量']||'—',
          '体积(长*宽*高)': r['体积(长*宽*高)']||'—',
          单位: r['单位']||'',
          行备注: r['行备注']||'—'
        })),
        _procs: []
      });
      ((way._lines)||[]).forEach(line=>{
        if(!line['关联签收单'] || line['关联签收单']==='—') line['关联签收单'] = rcNo;
      });
      return rcNo;
    }
    function removeFormLine(i){
      if(formLineRows.value.length<=1 && pageId.value!=='lg-dispatch'){ ElMessage.warning('至少保留一行物料明细'); return; }
      formLineRows.value = formLineRows.value.filter((_,idx)=> idx!==i);
      refreshPoInFormLineNos();
    }
    function refreshPoInFormLineNos(){
      if(pageId.value==='wh-po-in' || pageId.value==='wh-po-ret' || isOsFinishedNoticePage() || pageId.value==='wh-prod-in'){
        formLineRows.value = finalizeNoticeFormLines(formLineRows.value);
      }
    }
    function clonePoInFormLineForNewLot(idx){
      const src = (formLineRows.value||[])[idx];
      if(!src || !String(src['物料信息']||'').trim()){ ElMessage.warning('请先填写物料信息'); return; }
      const copy = Object.assign({}, src);
      copy.批号 = '';
      delete copy.id;
      const lines = formLineRows.value.slice();
      lines.splice(idx + 1, 0, copy);
      formLineRows.value = finalizeNoticeFormLines(lines);
      ElMessage.success('已复制一行，请填写新批号');
    }
    function dispatchLinesOf(row){
      if(row && Array.isArray(row._lines) && row._lines.length) return row._lines.map(r=>({...r}));
      return ((MOCK['lg-dispatch']||{}).detailLines || []).map(r=>({...r}));
    }
    function maskIdCard(v){
      const s = String(v||'').trim();
      if(!s || s==='—') return '—';
      if(s.length < 15) return s;
      return s.slice(0, 6) + '********' + s.slice(-4);
    }
    function detailDisplayValue(name, v){
      if(String(name||'').includes('身份证')) return maskIdCard(v);
      if(pageId.value==='lg-dispatch' && name==='配送类型'){
        const biz = resolveWhBizType(detailRow.value || {});
        if(biz !== '销售发货') return '—';
      }
      return (v===undefined || v===null || v==='') ? '—' : v;
    }
    function overlayWaybillFromShips(row){
      if(!row) return row;
      const ships = shipsOfWaybill(row);
      if(!ships.length) return row;
      const next = Object.assign({}, row);
      const pick = (field)=> ships.map(s=> s[field]).find(v=> v && v!=='—') || '';
      if(!next['装货联系人']) next['装货联系人'] = pick('装货联系人');
      if(!next['装货联系电话']) next['装货联系电话'] = pick('装货联系电话');
      if(!next['卸货联系人']) next['卸货联系人'] = pick('卸货联系人');
      if(!next['卸货联系电话']) next['卸货联系电话'] = pick('卸货联系电话');
      return next;
    }
    function waybillShipNos(way){
      if(!way) return [];
      const fromHead = String(way['关联发货单']||'').split(/[、,，]/).map(s=>s.trim()).filter(s=> s && s!=='—');
      const fromLines = [...new Set((way._lines||[]).map(l=> String(l['关联发货单号']||'').trim()).filter(s=> s && s!=='—'))];
      // 头字段优先（明细行可能与头不一致）；头为空时再用明细
      return [...new Set(fromHead.length ? fromHead : fromLines)];
    }
    function findWaybillByNo(no){
      const code = codeOf(no);
      if(!code || code==='—') return null;
      return ((MOCK['lg-waybill']||{}).main||[]).find(w=> String(w['运单号']||'')===code) || null;
    }
    /** 按运单解析可选发货单：优先 lg-ship 实档，无档时按运单声明单号合成选单行，避免选单空窗 */
    function shipsOfWaybill(wayOrNo){
      const way = (wayOrNo && typeof wayOrNo==='object') ? wayOrNo : findWaybillByNo(wayOrNo);
      if(!way) return [];
      const wayNo = String(way['运单号']||'');
      const ships = (MOCK['lg-ship']||{}).main||[];
      const nos = new Set(waybillShipNos(way));
      let hit = ships.filter(s=>{
        const sn = String(s['发货单号']||'');
        if(nos.has(sn)) return true;
        const linked = String(s['关联运单']||'');
        if(!linked || linked==='—') return false;
        return linked===wayNo || linked.split(/[、,，]/).map(x=>x.trim()).includes(wayNo);
      });
      if(hit.length){
        const seen = new Set();
        return hit.filter(s=>{
          const k = String(s['发货单号']||'');
          if(!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }
      return [...nos].map(sn=>({
        id: 'syn-ship-'+sn,
        发货单号: sn,
        装货点: way['装货点'] || '—',
        卸货点: way['卸货点'] || '—',
        物料信息: way['物料信息'] || '—',
        关联运单: wayNo,
        仓库业务类型: way['仓库业务类型'] || '—',
        状态: '已调度',
        申请人: way['申请人'] || '—',
        _synthetic: true
      }));
    }
    function normPoInDetailLine(r, i){
      const info = r['物料信息'] || '';
      const code = codeOf(info) || r['物料编码'] || '';
      const mr = matListRow(code);
      let mode = String(r['管理方式']||'').trim();
      if(!mode || mode==='—') mode = (mr && mr['管理方式']) || '条码管理';
      return Object.assign({}, r, {
        _i: i+1,
        行号: noticeDetailLineNo(r, i+1),
        物料信息: info || matInfoText(r),
        库存单位: r['库存单位'] || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
        管理方式: mode,
        行状态: r['行状态'] || '待执行',
        计划件数: r['计划件数'] != null && r['计划件数'] !== '' ? r['计划件数'] : (r['计划件数'] || ''),
        计划数量: r['计划数量'] != null && r['计划数量'] !== '' ? r['计划数量'] : '',
        已完成数量: r['已完成数量'] != null && r['已完成数量'] !== '' ? r['已完成数量'] : '0',
        未完成数量: r['未完成数量'] != null && r['未完成数量'] !== '' ? r['未完成数量'] : (r['计划数量'] || ''),
        批号: (r['批号'] != null && r['批号'] !== '') ? r['批号'] : '—',
        生产日期: (r['生产日期'] != null && r['生产日期'] !== '') ? r['生产日期'] : '—',
        有效期: (r['有效期'] != null && r['有效期'] !== '') ? r['有效期'] : '—',
        生产厂家: (r['生产厂家'] != null && r['生产厂家'] !== '') ? r['生产厂家'] : '—',
      });
    }
    function tankArchIsEmpty(row){
      if(!row) return false;
      const lines = Array.isArray(row._lines) ? row._lines : [];
      if(lines.length) return false;
      const info = String(row['物料信息']||'').trim();
      const qty = Number(row['当前数量']);
      return (!info || info==='—') && !(qty > 0);
    }
    function canEditTankArch(row){
      return !!(row && row['使用状态']==='在用' && tankArchIsEmpty(row));
    }
    function onTankArchDetailEdit(){
      const row = detailRow.value;
      if(!canEditTankArch(row)){
        ElMessage.warning('当前储罐状态不允许编辑');
        return;
      }
      detailVisible.value = false;
      onRowOp({ name: '编辑' }, row);
    }
    function tankDetailLinesFromRow(row){
      if(!row) return [];
      if(Array.isArray(row._lines) && row._lines.length) return row._lines;
      const info = String(row['物料信息']||'').trim();
      if(!info || info==='—') return [];
      const parts = info.split('/').map(s=> String(s).trim());
      return [{
        物料编码: parts[0] || '—',
        物料名称: parts[1] || '—',
        物料规格: parts[2] || '—',
        物料种类: parts[3] || '—',
        库存单位: row['库存单位'] || '—',
        当前数量: row['当前数量'] != null && row['当前数量'] !== '' ? row['当前数量'] : '0',
        批号: row['物料批号'] || row['批号'] || '—',
        生产厂家: row['生产厂家'] || '—',
        供应商名称: row['供应商名称'] || row['供应商信息'] || '—',
        生产日期: row['生产日期'] || '—',
        有效期: row['有效期'] || '—',
        失效日期: row['失效日期'] || '—'
      }];
    }
    function isDetailLineRowActionVisible(a, row){
      if(a!=='批量建档') return true;
      if(!row || row['行状态']==='已关闭') return false;
      const mode = String(row['管理方式']||'').trim();
      if(mode && mode!=='—' && !mode.includes('条码')) return false;
      return true;
    }
    function fillPoInCarrierFromWaybill(way){
      if(!way) return;
      const plate = (way['车牌号'] && way['车牌号']!=='—') ? String(way['车牌号']) : '';
      const veh = ((MOCK.vehicle||{}).main||[]).find(v=> v['车牌号']===plate);
      formModel['承运商'] = (way['承运商名称'] && way['承运商名称']!=='—') ? String(way['承运商名称']) : '';
      formModel['车牌号'] = plate;
      formModel['车挂号'] = (way['车挂号'] && way['车挂号']!=='—') ? String(way['车挂号']) : (plate ? '—' : '');
      formModel['司机姓名'] = (way['司机姓名'] && way['司机姓名']!=='—') ? String(way['司机姓名']) : '';
      formModel['司机电话'] = (way['司机电话'] && way['司机电话']!=='—') ? String(way['司机电话']) : '';
      formModel['司机身份证号'] = (veh && veh['司机身份证号'] && veh['司机身份证号']!=='—') ? String(veh['司机身份证号']) : '';
      const ships = shipsOfWaybill(way);
      if(ships.length===1){
        const only = ships[0];
        const exclude = (formMode.value==='edit') ? { id: formModel._editId, 单号: formModel['单号'] } : null;
        if(shipLinkedNotice(only['发货单号'], exclude)){
          formModel['关联发货单'] = '';
          ElMessage.warning(`发货单 ${only['发货单号']} 已关联其他通知单，未自动带入；请先删除原通知单或改选其他发货单`);
          if(isOsPoPage()) restoreOsNoticeLinesFromWwpo();
          if(isCsWhPage()) formLineRows.value = [];
        } else {
          formModel['关联发货单'] = only['发货单号'];
          if(isOsPoPage()) applyShipMatsToOsNoticeForm(only);
          if(isCsWhPage()) applyShipMatsToCsRecvForm(only);
          if(pageId.value==='wh-so-ship') applyShipMatsToSoShipForm(only);
        }
      } else if(formModel['关联发货单'] && !ships.some(s=> String(s['发货单号'])===String(formModel['关联发货单']))){
        formModel['关联发货单'] = '';
        if(isOsPoPage()) restoreOsNoticeLinesFromWwpo();
        if(isCsWhPage()) formLineRows.value = [];
        if(pageId.value==='wh-so-ship') formLineRows.value = [];
        if(pageId.value==='wh-so-ret') formLineRows.value = [];
      }
    }
