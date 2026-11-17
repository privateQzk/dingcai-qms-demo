    function normalizeWhBizType(v){
      const map = { '采购送货':'采购入库', '调拨发货':'直接调拨', '委外发货':'委外发料', '调拨出库':'直接调拨', '调拨入库':'直接调拨' };
      return map[String(v||'').trim()] || String(v||'').trim();
    }
    function resolveWhBizType(row){
      const v = normalizeWhBizType((row && (row['关联仓储业务'] || row['仓库业务类型'] || row['业务类型'])) || '');
      if(v) return v;
      const src = row && row['来源派车单号'] ? findDispatchByNo(row['来源派车单号']) : null;
      if(src && (src['关联仓储业务'] || src['仓库业务类型'])) return normalizeWhBizType(src['关联仓储业务'] || src['仓库业务类型']);
      if(row && row['用车类型']) return defaultWhBizForVehicle(row['用车类型']);
      return '—';
    }
    function whBizNoticeMeta(whBiz){
      const b = normalizeWhBizType(whBiz);
      const map = {
        '销售发货': { pageId:'wh-so-ship', prefix:'XSFH', noKey:'单号', docType:'标准发货', tab:'tab1' },
        '销售预出货': { pageId:'wh-so-preout', prefix:'XSYC', noKey:'单号', docType:'标准预出货', tab:'tab1' },
        '采购退料': { pageId:'wh-po-ret', prefix:'CGTT', noKey:'单号', docType:'标准采购退料', tab:'tab1' },
        '委外发料': { pageId:'wh-os-issue', prefix:'WWFT', noKey:'单号', docType:'委外发料', tab:'tab1' },
        '受托退料': { pageId:'wh-cs-ret', prefix:'STTL', noKey:'单号', docType:'受托退料通知单', tab:'tab1' },
        '其他出库': { pageId:'wh-other-out', prefix:'QTCK', noKey:'单号', docType:'盘亏出库', tab:'tab1' },
        '采购入库': { pageId:'wh-po-in', prefix:'CGST', noKey:'单号', docType:'标准采购入库', tab:'tab1' },
        '销售退货': { pageId:'wh-so-ret', prefix:'XSTH', noKey:'单号', docType:'标准退货', tab:'tab1' },
        '委外收货': { pageId:'wh-os-recv', prefix:'WWST', noKey:'单号', docType:'委外收货', tab:'tab1' },
        '受托收料': { pageId:'wh-cs-recv', prefix:'STST', noKey:'单号', docType:'受托收料通知单', tab:'tab1' },
        '委外退料': { pageId:'wh-os-ret-mat', prefix:'WWTT', noKey:'单号', docType:'委外退料', tab:'tab1' },
        '委外退货': { pageId:'wh-os-ret-goods', prefix:'WWTH', noKey:'单号', docType:'委外退货', tab:'tab1' },
        '其他入库': { pageId:'wh-other-in', prefix:'QTST', noKey:'单号', docType:'盘盈入库', tab:'tab1' },
        '直接调拨': { pageId:'wh-direct-xfer', prefix:'ZJDBSQ', noKey:'单号', docType:'直接调拨通知单', tab:'tab1' },
        '库内转移': { pageId:'wh-transfer', prefix:'YKT', noKey:'移库单号', docType:'库内转移', tab:'tab1' },
        '无': null
      };
      return map[b] || null;
    }
    function noticeNoByWhBiz(whBiz, ymd, n){
      const meta = whBizNoticeMeta(whBiz);
      if(!meta) return '—';
      return meta.prefix + ymd + String(n).padStart(4,'0');
    }
    function buildNoticeLineFromShip(shipLine, ctx){
      const { supplier, planDate, forRet, idx, noticeNo } = ctx;
      const info = shipLine['物料信息'] || '';
      const code = codeOf(info);
      const mr = matListRow(code);
      const mode = (mr && mr['管理方式']) || '条码管理';
      const isCount = String(mode).includes('计数');
      const qtyNum = Number(String(shipLine['发货数量']||'').replace(/[^\d.]/g,''))||0;
      const planQty = qtyNum > 0 ? String(qtyNum) : String(shipLine['发货数量']||'');
      let planPcs = String(shipLine['计划件数']||'').trim();
      if(forRet && isCount) planPcs = '—';
      else if(!planPcs || !(Number(planPcs)>0)){
        const q = Number(planQty);
        planPcs = String(Number.isFinite(q) && q>0 ? Math.max(1, Math.round(q >= 1000 ? q/1000 : q)) : 1);
      }
      const ymd = planDate || todayYmdLocal();
      const ymdCompact = ymd.replace(/-/g,'');
      let lot = String(shipLine['批号']||'').trim();
      if(!forRet && (!lot || lot==='—')) lot = ymdCompact + String((idx||0)+1).padStart(3,'0');
      const lineNo = shipLine['行号'] || shipLine._rowNo || lineNoOf(shipLine, (idx||0)+1);
      const orderLn = shipLine._orderLineNo || orderLineNoBase(shipLine, (idx||0)+1);
      const row = {
        id: noticeNo ? (noticeNo+'-l'+lineNo) : '',
        行号: lineNo,
        _orderLineNo: orderLn,
        行状态: '待执行',
        物料信息: info,
        库存单位: shipLine['单位'] || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
        管理方式: mode,
        计划件数: planPcs,
        计划数量: planQty,
        已完成数量: '0',
        未完成数量: planQty,
        批号: forRet ? (lot && lot!=='—' ? lot : '') : lot,
        备注: (shipLine['行备注'] && shipLine['行备注']!=='—') ? shipLine['行备注'] : (shipLine['备注'] && shipLine['备注']!=='—' ? shipLine['备注'] : '')
      };
      if(!forRet){
        row.生产日期 = ymd;
        row.有效期 = String((mr && (mr['有效期']||mr['保质期'])) || '12');
        row.生产厂家 = supplier || '';
      }
      return row;
    }
    function createWarehouseNoticeFromShip(ship, wayNo, noticeNo, whBiz){
      const meta = whBizNoticeMeta(whBiz);
      if(!meta || !noticeNo || noticeNo==='—' || !ship) return;
      const store = MOCK[meta.pageId] = MOCK[meta.pageId] || {};
      store[meta.tab] = store[meta.tab] || [];
      const list = store[meta.tab];
      if(list.some(r=> String(r[meta.noKey]||'')===noticeNo)) return;
      const shipNo = ship['发货单号']||'';
      if(shipNo && shipLinkedNotice(shipNo)) return; // 发货单已有通知单，不重复自动建单
      const d = new Date();
      const planDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const ordCode = codeOf(ship['订单号']||'');
      const poCode = codeOf(ship['采购订单']||ship['订单号']||'');
      const partyName = String(ship['订单号']||'').split(/\s*\/\s*/)[1]?.trim() || '—';
      const forRet = meta.pageId==='wh-po-ret' || meta.pageId==='wh-so-ret' || meta.pageId==='wh-cs-ret' || meta.pageId.startsWith('wh-os-ret');
      const lines = (ship._lines||[]).map((r,i)=> buildNoticeLineFromShip(r, {
        supplier: partyName,
        planDate,
        forRet,
        idx: i,
        noticeNo
      }));
      const carrier = waybillCarrierFields(wayNo);
      const base = {
        id: String(list.length+1),
        单据状态: '待执行',
        [meta.noKey]: noticeNo,
        单据类型: meta.docType,
        计划执行日期: planDate,
        物料信息: ship['物料信息']||'',
        备注: ship['备注']||'—',
        关联运单: wayNo,
        关联发货单: ship['发货单号']||'',
        _lines: lines
      };
      if(meta.pageId==='wh-po-in'){
        Object.assign(base, { 关联采购订单: poCode||ordCode||'—', 供应商名称: partyName, 包装规格:'—', ...carrier });
      } else if(meta.pageId==='wh-so-preout'){
        const prepNo = ship['关联销售备货单'] || ship['关联备货通知单'] || '';
        Object.assign(base, {
          关联销售订单: ship['订单号']||'—',
          客户名称: partyName || '—',
          关联备货通知单: (prepNo && prepNo!=='—') ? prepNo : '—',
          ...carrier
        });
      } else if(meta.pageId==='wh-so-ship'){
        Object.assign(base, {
          关联销售订单: ship['订单号']||'—',
          客户名称: partyName || '—',
          关联销售备货单: '—',
          关联销售预出货单: '—',
          ...carrier
        });
      } else if(meta.pageId==='wh-po-ret'){
        Object.assign(base, {
          关联采购订单: poCode||ordCode||'—', 供应商名称: partyName,
          ...carrier
        });
      } else if(meta.pageId.startsWith('wh-os')){
        Object.assign(base, { 关联委外加工单: ordCode||'—', 供应商名称: partyName, ...carrier });
      } else if(meta.pageId==='wh-so-ret'){
        const way = findWaybillSrc(wayNo);
        const plate = way && way['车牌号'] && way['车牌号']!=='—' ? String(way['车牌号']) : '—';
        const veh = plate && plate!=='—' ? ((MOCK.vehicle||{}).main||[]).find(v=> v['车牌号']===plate) : null;
        Object.assign(base, {
          关联销售订单: ship['订单号']||'—',
          客户名称: partyName || '—',
          关联销售出库单: '—',
          退货原因: '—',
          车牌号: plate,
          车挂号: (way && way['车挂号'] && way['车挂号']!=='—') ? String(way['车挂号']) : '—',
          司机姓名: (way && way['司机姓名']) ? String(way['司机姓名']) : '—',
          司机电话: (way && way['司机电话']) ? String(way['司机电话']) : '—',
          司机身份证号: (veh && veh['司机身份证号']) ? String(veh['司机身份证号']) : '—'
        });
      } else if(meta.pageId.startsWith('wh-cs')){
        const way = findWaybillSrc(wayNo);
        const plate = way && way['车牌号'] && way['车牌号']!=='—' ? String(way['车牌号']) : '—';
        const veh = plate && plate!=='—' ? ((MOCK.vehicle||{}).main||[]).find(v=> v['车牌号']===plate) : null;
        Object.assign(base, {
          关联销售订单: ordCode||'—',
          客户名称: partyName,
          车牌号: plate,
          车挂号: (way && way['车挂号'] && way['车挂号']!=='—') ? String(way['车挂号']) : '—',
          司机姓名: (way && way['司机姓名']) ? String(way['司机姓名']) : '—',
          司机电话: (way && way['司机电话']) ? String(way['司机电话']) : '—',
          司机身份证号: (veh && veh['司机身份证号']) ? String(veh['司机身份证号']) : '—'
        });
      } else if(meta.pageId==='wh-other-in'){
        const way = findWaybillSrc(wayNo);
        const plate = way && way['车牌号'] && way['车牌号']!=='—' ? String(way['车牌号']) : '—';
        const veh = plate && plate!=='—' ? ((MOCK.vehicle||{}).main||[]).find(v=> v['车牌号']===plate) : null;
        Object.assign(base, {
          入库方向: '厂外',
          领至线边仓: '—',
          受益人: '演示用户',
          受益部门: '仓储部',
          受益项目: '—',
          生产相关: '否',
          承运商: (way && way['承运商名称']) ? String(way['承运商名称']) : '—',
          车牌号: plate,
          车挂号: (way && way['车挂号'] && way['车挂号']!=='—') ? String(way['车挂号']) : '—',
          司机姓名: (way && way['司机姓名']) ? String(way['司机姓名']) : '—',
          司机电话: (way && way['司机电话']) ? String(way['司机电话']) : '—',
          司机身份证号: (veh && veh['司机身份证号']) ? String(veh['司机身份证号']) : '—'
        });
      } else if(meta.pageId==='wh-other-out'){
        const way = findWaybillSrc(wayNo);
        const plate = way && way['车牌号'] && way['车牌号']!=='—' ? String(way['车牌号']) : '—';
        const veh = plate && plate!=='—' ? ((MOCK.vehicle||{}).main||[]).find(v=> v['车牌号']===plate) : null;
        Object.assign(base, {
          出库方向: '厂外',
          领至线边仓: '—',
          受益人: '演示用户',
          受益部门: '仓储部',
          受益项目: '—',
          生产相关: '否',
          承运商: (way && way['承运商名称']) ? String(way['承运商名称']) : '—',
          车牌号: plate,
          车挂号: (way && way['车挂号'] && way['车挂号']!=='—') ? String(way['车挂号']) : '—',
          司机姓名: (way && way['司机姓名']) ? String(way['司机姓名']) : '—',
          司机电话: (way && way['司机电话']) ? String(way['司机电话']) : '—',
          司机身份证号: (veh && veh['司机身份证号']) ? String(veh['司机身份证号']) : '—'
        });
      } else if(meta.pageId==='wh-direct-xfer'){
        Object.assign(base, {
          调出仓库: ship['装货地点'] || '—',
          调入仓库: ship['卸货地点'] || '—',
          来源派车单号: ship['来源派车单号'] || '—',
          ...carrier
        });
      } else if(meta.pageId==='wh-transfer'){
        Object.assign(base, { 移入仓库编码:'—', 移入库位编码:'—', 已完成件数:'0', 制单时间: planDate+' 08:00:00', 制单人: ship['申请人']||'张三', 包装规格:'—' });
      }
      list.unshift(base);
      if(meta.pageId==='wh-po-in') syncQcLedgerFromPoInNotice(base[meta.noKey], base._lines);
    }
    function overlayShipByWaybill(row){
      if(!row) return row;
      const st = row['状态'] || '';
      if(st==='已关闭' || st==='待调度') return row;
      const wayNo = String(row['关联运单']||'').split(/[、,，]/)[0].trim();
      if(!wayNo || wayNo==='—') return row;
      const wbRaw = ((MOCK['lg-waybill']||{}).main||[]).find(w=> w['运单号']===wayNo);
      if(!wbRaw) return row;
      const wb = STORE ? STORE.overlayPcRow('lg-waybill', wbRaw) : wbRaw;
      const wst = wb['状态'] || wbRaw['状态'] || '';
      const next = Object.assign({}, row);
      if(wst==='运输中' || wst==='发运中') next['状态'] = '运输中';
      else if(wst==='已完成' || wst==='已签收' || wst==='已到达' || wst==='待结算') next['状态'] = '已完成';
      else if(wst==='待派车' || wst==='待运输') next['状态'] = '已调度';
      return next;
    }
    function shipLineQty(r){
      return Number(String((r && r['发货数量']) || '').replace(/[^\d.]/g,'')) || 0;
    }
    function shipLineSigned(r){
      const n = Number(String((r && r['已签收数量']) || '').replace(/[^\d.]/g,''));
      return Number.isFinite(n) ? n : 0;
    }
    function findDispatchByNo(no){
      const code = codeOf(no);
      if(!code) return null;
      return ((MOCK['lg-dispatch']||{}).main||[]).find(r=> r['编号']===code) || null;
    }
    function findWaybillSrc(row){
      const list = ((MOCK['lg-waybill']||{}).main||[]);
      if(!row) return null;
      if(typeof row==='string') return list.find(w=> w['运单号']===row) || null;
      return list.find(w=> (row.id && w.id===row.id) || (row['运单号'] && w['运单号']===row['运单号'])) || null;
    }
    function patchWaybill(row, patch){
      const src = findWaybillSrc(row);
      if(src) Object.assign(src, patch);
      if(row && typeof row==='object' && row!==src) Object.assign(row, patch);
      return src;
    }
    function unlockShipsOfWaybill(way){
      const dns = String((way&&way['关联发货单'])||'').split(/[、,，]/).map(s=>s.trim()).filter(s=>s && s!=='—');
      if(!dns.length) return [];
      const srcNos = new Set();
      ((MOCK['lg-ship']||{}).main||[]).forEach(s=>{
        if(!dns.includes(s['发货单号'])) return;
        s['状态'] = '待调度';
        s['关联运单'] = '—';
        s['关联仓储通知单'] = '—';
        if(s['来源派车单号']) srcNos.add(s['来源派车单号']);
      });
      srcNos.forEach(no=> refreshDispatchProgress(findDispatchByNo(no)));
    }
    function refreshDispatchProgress(src){
      if(!src) return;
      const ships = ((MOCK['lg-ship']||{}).main||[]).filter(s=> s['来源派车单号']===src['编号'] && s['状态']!=='已关闭');
      src['关联发货单'] = ships.length ? ships.map(s=> s['发货单号']).filter(Boolean).join('、') : '—';
      const wayNos = [...new Set(ships.map(s=> s['关联运单']).filter(v=> v && v!=='—'))];
      src['关联运单'] = wayNos.length ? wayNos.join('、') : '—';
      const addByLine = new Map();
      const signedByLine = new Map();
      ships.forEach(s=>{
        (s._lines || []).forEach(l=>{
          const key = orderLineNoBase(l) || codeOf(l['物料信息']) || l['物料信息'];
          addByLine.set(key, (addByLine.get(key) || 0) + shipLineQty(l));
          signedByLine.set(key, (signedByLine.get(key) || 0) + shipLineSigned(l));
        });
      });
      src._lines = (src._lines || []).map(r=>{
        const key = orderLineNoBase(r) || codeOf(r['物料信息']) || r['物料信息'];
        const splitQty = addByLine.get(key) || 0;
        const signed = signedByLine.get(key) || 0;
        const demand = Number(r['需求数量']) || 0;
        return Object.assign({}, r, {
          已拆数量: String(splitQty),
          已签收数量: String(signed),
          已拆未签收数量: String(Math.max(0, splitQty - signed)),
          未拆数量: String(Math.max(0, demand - splitQty))
        });
      });
      const allSplit = (src._lines||[]).every(r=> (Number(r['需求数量'])||0) <= (Number(r['已拆数量'])||0));
      const allSigned = (src._lines||[]).every(r=> (Number(r['已签收数量'])||0) >= (Number(r['需求数量'])||0));
      if(!ships.length){
        if((src._lines||[]).every(r=> (Number(r['已拆数量'])||0)===0)) src['状态'] = '待执行';
      } else if(allSplit && allSigned){
        src['状态'] = '已完成';
      } else {
        src['状态'] = '执行中';
      }
    }
    function releaseShipsFromDispatch(shipRows){
      (shipRows||[]).forEach(ship=>{
        const src = findDispatchByNo(ship['来源派车单号']);
        if(!src) return;
        refreshDispatchProgress(src);
      });
    }
    function normalizeEnroute(r){
      const photos = r['现场照片'] || (Number(r['照片'])>0 ? (r['照片'] + ' 张') : '—');
      return {
        ...r,
        打卡时间: r['打卡时间'] || r['记录时间'] || '—',
        打卡位置: r['打卡位置'] || r['当前位置'] || '—',
        现场照片: photos,
        打卡备注: r['打卡备注'] || r['备注'] || '—'
      };
    }
    function isDangerWaybill(row){
      const text = [row?.['车型要求'], row?.['物料信息'], row?.['特殊要求']].join(' ');
      return /罐车|电解液|危/.test(text);
    }
    function fleetDriverOf(carrier){
      return ((MOCK.driver||{}).main||[]).find(d=> d['所属承运商']===carrier && d['启用状态']==='启用') || {};
    }
    function resetAssignForm(row){
      Object.assign(assignForm, {
        承运商名称: row?.['承运商名称'] && row['承运商名称']!=='—' ? row['承运商名称'] : '',
        车牌号: row?.['车牌号'] && row['车牌号']!=='—' ? row['车牌号'] : '',
        车挂号: row?.['车挂号'] && row['车挂号']!=='—' ? row['车挂号'] : '',
        司机姓名: row?.['司机姓名'] && row['司机姓名']!=='—' ? row['司机姓名'] : '',
        司机电话: row?.['司机电话'] && row['司机电话']!=='—' ? row['司机电话'] : '',
        驾驶证号: row?.['驾驶证号'] && row['驾驶证号']!=='—' ? row['驾驶证号'] : '',
        从业资格证号: row?.['从业资格证号'] && row['从业资格证号']!=='—' ? row['从业资格证号'] : '',
        押运员姓名: row?.['押运员姓名'] && row['押运员姓名']!=='—' ? row['押运员姓名'] : '',
        押运员资格证号: row?.['押运员资格证号'] && row['押运员资格证号']!=='—' ? row['押运员资格证号'] : ''
      });
    }
    function resetSecondaryAssignForm(row){
      Object.assign(secondaryAssignForm, {
        送货车牌号: row?.['送货车牌号（专线）'] && row['送货车牌号（专线）']!=='—' ? row['送货车牌号（专线）'] : '',
        送货车挂号: row?.['送货车挂号（专线）'] && row['送货车挂号（专线）']!=='—' ? row['送货车挂号（专线）'] : '',
        送货司机: row?.['送货司机（专线）'] && row['送货司机（专线）']!=='—' ? row['送货司机（专线）'] : '',
        送货司机电话: row?.['送货司机电话（专线）'] && row['送货司机电话（专线）']!=='—' ? row['送货司机电话（专线）'] : '',
        送货备注: row?.['送货中转备注'] && row['送货中转备注']!=='—' ? row['送货中转备注'] : ''
      });
    }
    function onSecondaryAssignOk(){
      if(!String(secondaryAssignForm.送货车牌号||'').trim()){ ElMessage.warning('请输入送货车牌号（专线）'); return; }
      if(!String(secondaryAssignForm.送货司机||'').trim()){ ElMessage.warning('请输入送货司机（专线）'); return; }
      if(!String(secondaryAssignForm.送货司机电话||'').trim()){ ElMessage.warning('请输入送货司机电话（专线）'); return; }
      if(!/^1\d{10}$/.test(String(secondaryAssignForm.送货司机电话).trim())){ ElMessage.warning('请输入正确的 11 位送货司机手机号'); return; }
      const row = secondaryAssignRow.value || {};
      patchWaybill(row, {
        '送货车牌号（专线）': String(secondaryAssignForm.送货车牌号).trim(),
        '送货车挂号（专线）': String(secondaryAssignForm.送货车挂号||'').trim() || '—',
        '送货司机（专线）': String(secondaryAssignForm.送货司机).trim(),
        '送货司机电话（专线）': String(secondaryAssignForm.送货司机电话).trim(),
        '送货中转备注': String(secondaryAssignForm.送货备注||'').trim() || '—'
      });
      secondaryAssignVisible.value = false;
      bumpStore();
      ElMessage.success('二次派车（专线）信息保存成功，已反写至运单');
    }
    function parseSettleQty(s){
      return Number(String(s||'').replace(/[^\d.]/g,'')) || 0;
    }
    function parseSettlePrice(s){
      const n = Number(String(s||'').replace(/[^\d.]/g,''));
      return n > 0 ? n : 0;
    }
    function nowSettleDt(){
      const d = new Date();
      const pad = n => String(n).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    function settleCustomerName(r){
      if(r['客户名称'] && r['客户名称']!=='—') return r['客户名称'];
      const ord = String(r['订单号']||'');
      const parts = ord.split(/\s*\/\s*/);
      if(parts.length>=2 && parts[1].trim()) return parts[1].trim();
      return '—';
    }
    function settleIoDocNo(r){
      if(r['出/入库单号'] && r['出/入库单号']!=='—') return r['出/入库单号'];
      if(r['关联出库单号'] && r['关联出库单号']!=='—') return r['关联出库单号'];
      const lines = Array.isArray(r._lines) ? r._lines : [];
      const nos = [...new Set(lines.map(l=> l['关联仓储通知单']).filter(x=> x && x!=='—'))];
      return nos.length ? nos.join('、') : '—';
    }
    function openSettleModal(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      settleRows.value = rows.map(r=>({
        ...r,
        客户名称: settleCustomerName(r),
        '出/入库单号': settleIoDocNo(r),
        _price: parseSettlePrice(r['运费单价（元）'] || r['结算总金额（元）']),
        _extra: parseSettlePrice(r['额外附加费（元）']),
        _memo: (r['结算备注'] && r['结算备注']!=='—') ? r['结算备注'] : ''
      }));
      const first = rows[0] || {};
      const carrierName = first['承运商名称'] && first['承运商名称']!=='—' ? first['承运商名称'] : '';
      const hit = ((MOCK.carrier||{}).main||[]).find(c=> c['承运商名称']===carrierName);
      settleForm.采购合同号 = '';
      settleForm.供应商 = hit ? `${hit['承运商编码']} ${hit['承运商名称']}` : carrierName;
      settleForm.供应商编码 = hit ? (hit['承运商编码']||'') : '';
      settleForm.运输服务物料信息 = '9819.00002 / *运输服务*国内物流';
      settleForm.采购单位 = 'Pcs';
      settleForm.交期 = nowSettleDt();
      settleVisible.value = true;
    }
    function onSettleOk(){
      if(!String(settleForm.采购合同号||'').trim()){ ElMessage.warning('请手动输入采购合同号'); return; }
      if(!String(settleForm.供应商||'').trim()){ ElMessage.warning('请点击弹窗选择负责结算的承运商/供应商'); return; }
      if(!String(settleForm.运输服务物料信息||'').trim()){ ElMessage.warning('请点击弹窗选择运输服务物料'); return; }
      if(!String(settleForm.交期||'').trim()){ ElMessage.warning('请选择有效的交期时间'); return; }
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const poNo = 'CGDD' + ymd + String(((MOCK['lg-waybill']||{}).main||[]).filter(r=> r['ERP采购订单号'] && r['ERP采购订单号']!=='—').length + 1).padStart(4,'0');
      const stamp = nowSettleDt();
      settleRows.value.forEach(r=>{
        const src = findWaybillSrc(r);
        if(!src) return;
        const extra = Number(r._extra||0);
        const amount = Number(r._price||0) + extra;
        src['采购合同号'] = String(settleForm.采购合同号).trim();
        src['运输服务物料'] = settleForm.运输服务物料信息;
        src['交期'] = settleForm.交期;
        src['采购数量'] = '1.00';
        src['采购单位'] = settleForm.采购单位 || 'Pcs';
        src['额外附加费（元）'] = extra.toFixed(2);
        src['结算总金额（元）'] = amount.toFixed(2);
        src['运费单价（元）'] = Number(r._price||0).toFixed(2);
        src['结算备注'] = String(r._memo||'').trim() || '—';
        src['ERP采购订单号'] = poNo;
        src['结算人'] = '张三';
        src['结算时间'] = stamp;
        src['状态'] = '已完成';
        src['结算状态'] = '已结算';
        if(STORE && src['运单号']) STORE.setDocStatus(src['运单号'], '已完成', { source:'PC', action:'settle', 结算状态:'已结算', ERP采购订单号: poNo });
      });
      settleVisible.value = false;
      selectedIds.value = [];
      bumpStore();
      ElMessage.success(`运单结算成功，已成功对接 ERP 生成采购订单 [${poNo}]，共结算 ${settleRows.value.length} 笔运单`);
    }
