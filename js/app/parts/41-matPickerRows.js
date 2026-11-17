    function matPickerRows(){
      return wrapPickerModuleRows('mat-list', ((MOCK['mat-list']||{}).main||[]).filter(matPickerFilter), '物料编码', '物料名称');
    }
    function warehouseLocPickerRows(){
      return wrapPickerModuleRows('warehouse', ((MOCK.warehouse||{}).tab2||[]).filter(b=> b['启用状态']==='启用'), '库位编码', '库位名称', 'tab2');
    }
    function inspWhTypeOf(name){
      const typeMap = { '原料仓':'危化品库', '成品仓':'危化品库', '包材仓':'常温库', '线边仓':'常温库', '待检仓':'常温库' };
      return typeMap[name] || '常温库';
    }
    function warehouseMainPickerRows(){
      return wrapPickerModuleRows('warehouse', ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']==='启用'), '仓库编码', '仓库名称', 'tab1').map(r=>({
        ...r,
        编码: r['仓库编码'] || r.编码,
        名称: r['仓库名称'] || r.名称,
        仓库编号: r['仓库编码'] || r.编码,
        仓库类型: inspWhTypeOf(r['仓库名称'] || r.名称),
        负责人: r['创建人'] || '张三'
      }));
    }
    function normInspSchemeLocRow(x, i){
      return {
        _i: (i || 0) + 1,
        仓库编号: x['仓库编号'] || x.编码 || '',
        仓库名称: x['仓库名称'] || '',
        仓库类型: x['仓库类型'] || inspWhTypeOf(x['仓库名称']),
        负责人: x['负责人'] || x['责任人'] || '—',
        备注: (x['备注'] && x['备注']!=='—') ? x['备注'] : '—',
        最新一次计划开始时间: x['最新一次计划开始时间'],
        最新一次计划完成时间: x['最新一次计划完成时间'],
        下次计划开始时间: x['下次计划开始时间'],
        下次计划创建时间: x['下次计划创建时间']
      };
    }
    function addrPickerRows(){
      const addrs = [];
      ((MOCK.customer||{}).main||[]).filter(c=> c['启用状态']==='启用').forEach(c=>{
        (c._addrs||[]).forEach(a=>{
          addrs.push({
            地址编码: a['客户地址编码'],
            地址描述: a['客户地址描述']||'',
            联系人: a['联系人']||'',
            联系电话: a['联系电话']||'',
            所属单位: c['客户名称']||'',
            单位类型: '客户',
            编码: a['客户地址编码'],
            名称: a['客户地址描述']||''
          });
        });
      });
      ((MOCK.supplier||{}).main||[]).filter(s=> s['启用状态']==='启用').forEach(s=>{
        (s._addrs||[]).forEach(a=>{
          addrs.push({
            地址编码: a['供应商地址编码'],
            地址描述: a['供应商地址描述']||'',
            联系人: a['联系人']||a['现场联系人']||'',
            联系电话: a['联系电话']||'',
            所属单位: s['供应商名称']||'',
            单位类型: '供应商',
            编码: a['供应商地址编码'],
            名称: a['供应商地址描述']||''
          });
        });
      });
      ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']==='启用').forEach(w=>{
        addrs.push({
          地址编码: w['仓库编码'],
          地址描述: w['仓库位置'] || w['仓库名称'] || '',
          联系人: w['仓库负责人'] || '仓库值班',
          联系电话: w['联系电话'] || '',
          所属单位: w['仓库名称'] || '',
          单位类型: '仓库',
          编码: w['仓库编码'],
          名称: w['仓库位置'] || w['仓库名称'] || ''
        });
      });
      return addrs;
    }
    function serialArchPickerRows(filterFn){
      return wrapPickerModuleRows('serial-arch', ((MOCK['serial-arch']||{}).main||[]).filter(filterFn || (()=> true)), '条码号', '物料批号');
    }
    function isPrepStepEmpty(v){
      const s = String(v==null?'':v).trim();
      return !s || s==='—' || s==='无值';
    }
    function isPrepDocEmpty(v){
      const s = String(v==null?'':v).trim();
      return !s || s==='—';
    }
    function mapArchToPrepPickLine(r, id){
      const qty = Number(r.当前数量)!=null && !isNaN(Number(r.当前数量)) ? Number(r.当前数量) : 0;
      return {
        id: id || ('pick-' + Date.now() + '-' + (r.编码 || r.条码号 || '')),
        存储位置: r.存储位置 || '—',
        条码号: r.编码 || r.条码号 || '',
        包装规格: r.包装规格 || '—',
        来源单号: r.来源单号 || '—',
        来源条码号: r.来源条码号 || '—',
        物料信息: r.物料信息 || (detailRow.value||{})['物料信息'] || '',
        物料批号: r.物料批号 || r.名称 || '—',
        客户批号: r.客户批号 || '—',
        当前数量: qty > 0 ? qty.toFixed(3) : '1.000',
        库存单位: r.库存单位 || (detailRow.value||{})['单位'] || '—',
        供应商信息: r.供应商信息 || '—',
        生产厂家: r.生产厂家 || '—',
        生产日期: r.生产日期 || '—',
        有效期: r.有效期 || '—',
        失效日期: r.失效日期 || '—',
        绑定状态: r.绑定状态 || '未绑定',
        当前绑定外包材: r.当前绑定外包材 || '—'
      };
    }
    function lockPrepSerialArch(barcode, prepNo){
      const arch = ((MOCK['serial-arch']||{}).main||[]).find(r=> r['条码号']===barcode);
      if(!arch) return;
      arch['当前步骤'] = '备货';
      arch['当前单据号'] = prepNo || '—';
    }
    function releasePrepSerialArch(barcodes, prepNo){
      const set = new Set((barcodes||[]).map(String));
      ((MOCK['serial-arch']||{}).main||[]).forEach(r=>{
        if(!set.has(String(r['条码号']||''))) return;
        if(prepNo && String(r['当前单据号']||'')!==String(prepNo)) return;
        r['当前步骤'] = '—';
        r['当前单据号'] = '—';
      });
    }
    function resetPickerPrepQ(){
      pickerPrepQ.barcode = '';
      pickerPrepQ.lot = '';
      pickerPrepQ.loc = '';
      pickerPrepFilterTick.value++;
    }
    const pickerDialogTitle = computed(()=>{
      if(pickerTitle.value==='拣货流水码') return '选择流水码档案';
      if(pageId.value==='wh-so-ret' && pickerTitle.value==='批号') return '选择流水码档案（原出库厂外）';
      return '选择 · ' + (pickerTitle.value||'选单');
    });
    const pickerPrepSelQty = computed(()=>{
      return (pickerSelected.value||[]).reduce((s,r)=> s + (Number(r.当前数量)||0), 0).toFixed(3);
    });
    const pickerPrepNeedQty = computed(()=>{
      const plan = Number((detailRow.value||{})['备货数量']||0);
      const done = Number((detailRow.value||{})['已备数量']||0);
      return Math.max(0, plan - done).toFixed(3);
    });
    const pickerMode = computed(()=>{
      const t = pickerTitle.value || '';
      if(t==='发货地' || t==='收货地' || t==='装货地点' || t==='卸货地点') return 'addr';
      if(t==='订单号') return 'order';
      return 'default';
    });
    const pickerMultiSelect = computed(()=>{
      if(pickerTitle.value==='采集项列表' || pickerTitle.value==='添加采集项') return true;
      const t = pickerTitle.value || '';
      return t==='关联库位/仓库' || t==='选择仓库' || t==='拣货流水码' || t==='关联来源单据' || t==='盘点仓库' || t==='包材档案' || isWhMatMultiPick(t);
    });
    const pickerColumns = computed(()=>{
      if(pickerTitle.value==='拣货流水码'){
        return [
          { field: '编码', title: '条码号' },
          { field: '物料信息', title: '物料信息' },
          { field: '名称', title: '批号' },
          { field: '包装规格', title: '包装规格' },
          { field: '当前数量', title: '数量' },
          { field: '存储位置', title: '库位' },
          { field: '检验状态', title: '质检状态' },
        ];
      }
      if(pickerMode.value==='addr') return ADDR_PICKER_COLS;
      if(pickerTitle.value==='运输服务物料信息') return SETTLE_MAT_PICKER_COLS;
      if(pickerTitle.value==='所属调度员' || pickerTitle.value==='关联用户') return USER_PICKER_COLS;
      const rows = pickerRows.value;
      const first = rows[0];
      if(first?._pickerPageId) return pageTabColumns(first._pickerPageId, first._pickerTab || 'main');
      return inferPickerColumns(rows);
    });
    const pickerDialogWidth = computed(()=>{
      const n = pickerColumns.value.length + (pickerMultiSelect.value ? 1 : 0);
      if(n <= 4) return 'min(720px, 96vw)';
      if(n <= 6) return 'min(960px, 96vw)';
      if(n <= 9) return 'min(1100px, 96vw)';
      return 'min(1200px, 96vw)';
    });
    const pickerRows = computed(()=>{
      pickerPrepFilterTick.value;
      const t = pickerTitle.value || '';
      let all = [];
      if(t==='订单号'){
        const typ = splitPickerMode.value ? (splitForm.订单类型 || '') : (formModel['订单类型'] || '');
        const biz = dispatchBizForOrderPicker();
        const okOrder = st => dispatchOrderStatusOk(st, biz);
        if(typ==='采购订单'){
          all = wrapPickerModuleRows('po', ((MOCK.po||{}).main||[]).filter(r=> okOrder(r['订单状态'])), '采购订单号', '供应商名称');
        } else if(typ==='销售订单'){
          all = wrapPickerModuleRows('so', ((MOCK.so||{}).main||[]).filter(r=> okOrder(r['订单状态'])), '销售订单号', '客户名称');
        } else if(typ==='委外加工单' || typ==='委外加工订单'){
          all = wrapPickerModuleRows('wwpo', ((MOCK.wwpo||{}).main||[]).filter(r=> okOrder(r['订单状态'])), '委外订单号', '供应商名称');
        }
      } else if(t==='前置关联单据' && (pageId.value==='lg-dispatch' || splitPickerMode.value)){
        const kind = dispatchPreDocKind(splitPickerMode.value ? splitBizOf() : '');
        if(kind==='so-ship-pre'){
          all = wrapPickerModuleRows('wh-so-preout', (MOCK['wh-so-preout']||{}).tab1||(MOCK['wh-so-preout']||{}).main||[], '单号', '客户名称').map(r=>({
            ...r,
            名称: (r.名称 || r['客户名称'] || '') + ' / 销售预出货通知单',
            规格: '销售预出货通知单'
          }));
        } else if(kind==='so-ret-pre'){
          const so = codeOf(splitPickerMode.value ? splitForm.订单号 : formModel['订单号']);
          all = wrapSoOutboundPickerRows(completedSoOutboundRows(so));
        }
      } else if(t==='采购订单' && (pageId.value==='lg-dispatch' || splitPickerMode.value)){
        all = wrapPickerModuleRows('po', tradeDirectPos(), '采购订单号', '供应商名称');
        if(!all.length){
          all = wrapPickerModuleRows('po', ((MOCK.po||{}).main||[]).slice(0,1), '采购订单号', '供应商名称');
        }
      } else if(t==='关联销售订单'){
        all = wrapPickerModuleRows('so', (MOCK.so||{}).main||[], '销售订单号', '客户名称');
      } else if(t==='销售订单'){
        all = wrapPickerModuleRows('so', (MOCK.so||{}).main||[], '销售订单号', '客户名称');
      } else if(t==='关联销售备货单' || t==='关联备货通知单'){
        const rows = ((MOCK['wh-so-prep']||{}).main||[]);
        const dispatchBiz = pageId.value==='lg-dispatch' ? (formModel['关联仓储业务']||formModel['仓库业务类型']||'') : '';
        let filtered;
        if(pageId.value==='wh-so-ship'){
          filtered = rows.filter(r=> ['执行中','已完成'].includes(r['备货状态']));
        } else if(pageId.value==='lg-dispatch' && dispatchBiz==='销售预出货'){
          filtered = rows.filter(r=> ['待执行','执行中','已完成','已关闭'].includes(r['备货状态']));
        } else if(pageId.value==='lg-dispatch'){
          filtered = rows.filter(r=> ['执行中','已完成'].includes(r['备货状态']));
        } else {
          filtered = rows.filter(r=> r['备货状态']!=='已完成');
        }
        const so = codeOf(pageId.value==='lg-dispatch' ? formModel['订单号'] : formModel['关联销售订单']);
        if(so) filtered = filtered.filter(r=> codeOf(r['关联销售订单'] || stockSoMap(r['备货通知单号']))===so);
        all = wrapPickerModuleRows('wh-so-prep', filtered.length ? filtered : rows, '备货通知单号', '客户名称');
      } else if(t==='关联销售预出货单'){
        let outs = ((MOCK['wh-so-preout']||{}).tab2||[]).filter(r=> r['单据状态']==='已完成');
        const so = codeOf(pageId.value==='lg-dispatch' ? formModel['订单号'] : formModel['关联销售订单']);
        if(so) outs = outs.filter(r=> codeOf(r['关联销售订单'])===so);
        all = wrapPickerModuleRows('wh-so-preout', outs, '出库单号', '客户名称', 'tab2');
      } else if(t==='选择车辆与司机'){
        all = wrapPickerModuleRows('vehicle', ((MOCK.vehicle||{}).main||[]).filter(v=> v['启用状态']==='启用'), '车牌号', '司机姓名').map(r=>({
          ...r,
          编码: r['车牌号'] || r.编码,
          名称: r['司机姓名'] || r.名称,
          规格: (r['车挂号'] || r['挂车号'] || '—') + ' / ' + (r['联系电话'] || '')
        }));
      } else if(t==='关联库位/仓库'){
        all = warehouseLocPickerRows();
      } else if(t==='选择仓库'){
        all = warehouseMainPickerRows();
      } else if(t==='巡检方案名称'){
        all = wrapPickerModuleRows('wh-insp-scheme', ((MOCK['wh-insp-scheme']||{}).main||[]).filter(r=> r['启用状态']==='启用'), '巡检方案编码', '巡检方案名称');
      } else if(t==='发货地' || t==='收货地' || t==='装货地点' || t==='卸货地点'){
        all = addrPickerRows();
      } else if(t==='产品信息' || t==='产品名称' || (t.includes('物料') && pageId.value==='freight')){
        all = matPickerRows();
      } else if(t==='所属调度员' || t==='关联用户'){
        all = userPickerRows();
      } else if(t==='供应商'){
        all = wrapPickerModuleRows('carrier', ((MOCK.carrier||{}).main||[]).filter(c=> c['启用状态']==='启用'), '承运商编码', '承运商名称');
      } else if(t==='运输服务物料信息'){
        all = SETTLE_SERVICE_MATS.map(m=>({ ...m, _pickerCustom: true }));
      } else if(t==='供应商编码' || (pageId.value==='wwpo' && t.includes('供应商'))){
        let vendors = osVendors();
        if(!vendors.length) vendors = ((MOCK.supplier||{}).main||[]).filter(s=> s['启用状态']==='启用').slice(0,2);
        all = wrapPickerModuleRows('supplier', vendors, '供应商编码', '供应商名称');
      } else if(t==='点位名称' || t==='点位列表'){
        all = wrapPickerModuleRows('opc-point', ((MOCK['opc-point']||{}).main||[]).filter(r=> (r['启用状态']||'启用')!=='禁用'), '点位名称', '采集平台');
      } else if(t==='采集项列表' || t==='添加采集项'){
        const taken = new Set((formLineRows.value||[]).map(r=> r['采集项编码']).filter(Boolean));
        let rows = ((MOCK['gather-item']||{}).main||[]).filter(r=> (r['启用状态']||'启用')!=='禁用');
        rows = rows.filter(r=> !taken.has(r['采集项编码']));
        all = wrapPickerModuleRows('gather-item', rows, '采集项编码', '采集项名称');
      } else if(t.includes('生产订单')){
        all = wrapPickerModuleRows('prod-order', ((MOCK['prod-order']||{}).main||[]).filter(r=> ['待执行','执行中'].includes(r['订单状态'])), '生产订单号', '生产部门');
      } else if(t.includes('采购订单') || t.includes('委外加工单')){
        if(t.includes('委外') || isOsPoPage()){
          all = wrapPickerModuleRows('wwpo', ((MOCK.wwpo||{}).main||[]).filter(r=> r['订单状态']!=='已关闭'), '委外订单号', '供应商名称');
        } else {
          // 采购入库：可选待执行/执行中；采购退料：可选执行中/已完成/已关闭
          const poStatusOk = pageId.value==='wh-po-ret'
            ? (st)=> ['执行中','已完成','已关闭'].includes(st)
            : (pageId.value==='wh-po-in'
              ? (st)=> ['待执行','执行中'].includes(st)
              : (st)=> st!=='已关闭');
          all = wrapPickerModuleRows('po', ((MOCK.po||{}).main||[]).filter(r=> poStatusOk(r['订单状态'])), '采购订单号', '供应商名称');
        }
      } else if(t.includes('客户')){
        all = wrapPickerModuleRows('customer', ((MOCK.customer||{}).main||[]).filter(c=> c['启用状态']==='启用'), '客户编码', '客户名称');
      } else if(t.includes('供应商')){
        all = wrapPickerModuleRows('supplier', ((MOCK.supplier||{}).main||[]).filter(s=> s['启用状态']==='启用'), '供应商编码', '供应商名称');
      } else if(t.includes('派车申请单')){
        all = wrapPickerModuleRows('lg-dispatch', (MOCK['lg-dispatch']||{}).main||[], '编号', '物料信息');
      } else if(t.includes('发货单') || t==='关联发货单'){
        let ships = (MOCK['lg-ship']||{}).main||[];
        const shipByWay = isWhNoticePage() || isCsWhPage() || pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret' || pageId.value==='wh-other-in' || pageId.value==='wh-other-out' || isLoadPage();
        if(shipByWay && formModel['关联运单'] && formModel['关联运单']!=='—'){
          ships = shipsOfWaybill(formModel['关联运单']);
        }
        if(isWhNoticePage() || isCsWhPage()){
          const exclude = (formMode.value==='edit') ? { id: formModel._editId, 单号: formModel['单号'] } : null;
          ships = ships.filter(s=> !shipLinkedNotice(s['发货单号'] || s.编码, exclude));
        }
        all = wrapPickerModuleRows('lg-ship', ships, '发货单号', '装货点');
      } else if(t==='关联运单' || t==='关联运单号' || (t.includes('运单') && !t.includes('发货'))){
        let ways = ((MOCK['lg-waybill']||{}).main||[]);
        if(isWhNoticePage()){
          ways = waybillsLinkedToOrder(formModel[whNoticeRefField()]);
        } else if(isCsWhPage()){
          const so = codeOf(formModel['关联销售订单']);
          const meta = csNoticeMeta();
          const wantBiz = (meta && meta.biz) || '';
          const open = ways.filter(w=> w['状态']!=='已关闭');
          const byBiz = wantBiz ? open.filter(w=> String(w['仓库业务类型']||'')===wantBiz) : [];
          ways = byBiz.length ? byBiz : open;
          if(so){
            const linked = waybillsLinkedToOrder(so);
            if(linked.length) ways = linked;
          }
        } else if(pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret'){
          ways = ways.filter(w=> w['状态']!=='已关闭');
          const so = codeOf(formModel['关联销售订单']);
          if(so){
            const linked = waybillsLinkedToOrder(so);
            if(linked.length) ways = linked;
          }
        } else if(pageId.value==='wh-other-in' || pageId.value==='wh-other-out'){
          const open = ways.filter(w=> w['状态']!=='已关闭');
          const want = pageId.value==='wh-other-in' ? '其他入库' : '其他出库';
          const byBiz = open.filter(w=> String(w['仓库业务类型']||'')===want);
          ways = byBiz.length ? byBiz : open;
        } else if(isLoadPage()){
          ways = ways.filter(w=> w['状态']!=='已关闭');
          const ref = codeOf(formModel['关联单号']);
          if(ref){
            const linked = waybillsLinkedToOrder(ref);
            if(linked.length) ways = linked;
          }
          const wantBiz = loadWhBizWaybillType(formModel['关联仓库业务']);
          if(wantBiz){
            const byBiz = ways.filter(w=> String(w['仓库业务类型']||'')===wantBiz);
            if(byBiz.length) ways = byBiz;
          }
        }
        all = wrapPickerModuleRows('lg-waybill', ways, '运单号', '承运商名称');
      } else if(t==='发货单位' || t==='收货单位'){
        all = [
          { 编码:'U001', 名称:'思特瑞原料仓', 单位类型:'发货单位', 备注:'—' },
          { 编码:'U002', 名称:'思特瑞成品仓', 单位类型:'发货单位', 备注:'—' },
          { 编码:'U003', 名称:'苏州客户A', 单位类型:'收货单位', 备注:'—' },
          { 编码:'U004', 名称:'无锡客户B', 单位类型:'收货单位', 备注:'—' },
          { 编码:'U005', 名称:'XX化工', 单位类型:'发货单位', 备注:'—' },
          { 编码:'U006', 名称:'YY材料', 单位类型:'收货单位', 备注:'—' },
        ];
      } else if(t.includes('承运公司') || t.includes('承运商')){
        all = wrapPickerModuleRows('carrier', ((MOCK.carrier||{}).main||[]).filter(c=> c['启用状态']==='启用'), '承运商编码', '承运商名称');
      } else if(t.includes('关联单号') && isLoadPage()){
        const meta = loadWhBizMeta(formModel['关联仓库业务']);
        if(meta){
          const list = ((MOCK[meta.pageId]||{})[meta.tab]||[])
            .filter(r=> ['待执行','执行中','已完成'].includes(String(r[meta.statusKey||'单据状态']||'')));
          all = list.map(r=>{
            const code = r[meta.noKey] || '';
            const name = (meta.partyKey && r[meta.partyKey]) ? r[meta.partyKey] : (r['物料信息'] || code);
            return { ...r, 编码: code, 名称: name, _pickerPageId: meta.pageId, _pickerTab: meta.tab, _pickerCodeField: meta.noKey, _loadBizMeta: meta };
          });
        }
      } else if(t.includes('关联单号')){
        all = [
          { 编码:'PO20260801', 名称:'采购入库关联单', 检验类型:'来料检验', 备注:'—' },
          { 编码:'WO20260802', 名称:'库内抽检关联单', 检验类型:'库内检验', 备注:'—' },
          { 编码:'CGRK20260803', 名称:'成品入库关联单', 检验类型:'成品检验', 备注:'—' },
        ];
      } else if(t==='拣货流水码'){
        const matCode = codeOf((detailRow.value||{})['物料信息']);
        const used = new Set((detailLineRows.value||[]).map(r=> r['条码号']));
        // 跨备货单占用：其他备货明细已绑条码
        const occupied = new Set();
        (((MOCK['wh-so-prep']||{}).main)||[]).forEach(doc=>{
          if(detailRow.value && (doc.id===detailRow.value.id || doc['备货通知单号']===detailRow.value['备货通知单号'])) return;
          (doc._pickLines||[]).forEach(ln=>{ if(ln['条码号']) occupied.add(ln['条码号']); });
        });
        all = serialArchPickerRows(r=>{
          if(r['库存状态']!=='仓库' || r['使用状态']!=='在用') return false;
          if(String(r['检验状态']||'')!=='合格') return false;
          if(!isPrepStepEmpty(r['当前步骤']) || !isPrepDocEmpty(r['当前单据号'])) return false;
          if(matCode && codeOf(r['物料信息'])!==matCode) return false;
          if(used.has(r['条码号']) || occupied.has(r['条码号'])) return false;
          return true;
        });
        const qb = String(pickerPrepQ.barcode||'').trim();
        const ql = String(pickerPrepQ.lot||'').trim();
        const qo = String(pickerPrepQ.loc||'').trim();
        if(qb) all = all.filter(r=> String(r.编码||r.条码号||'').includes(qb));
        if(ql) all = all.filter(r=> String(r.名称||r.物料批号||'').includes(ql));
        if(qo) all = all.filter(r=> String(r.存储位置||'').includes(qo));
      } else if(t==='批号' || t.includes('流水码档案') || t==='包材档案'){
        const matCode = pickerLineRow.value ? codeOf(pickerLineRow.value['物料信息']) : '';
        if(pageId.value==='wh-so-ret' && t==='批号'){
          const outNo = String(formModel['关联销售出库单']||'').trim();
          if(outNo && outNo!=='—'){
            const candidates = soRetSerialArchRows(outNo, matCode);
            const allowedBc = new Set(candidates.map(r=> String(r['条码号']||'').trim()).filter(Boolean));
            all = serialArchPickerRows(r=> allowedBc.has(String(r['条码号']||'').trim()));
            if(!all.length){
              all = candidates.map(r=>{
                const wrapped = wrapPickerModuleRows('serial-arch', [r], '条码号', '物料批号')[0];
                return {
                  ...wrapped,
                  名称: (r['物料批号'] || wrapped.名称 || '') + (r['库存状态'] ? (' / ' + r['库存状态']) : ''),
                  规格: r['物料信息'] || wrapped.规格 || ''
                };
              });
            }
          } else {
            all = serialArchPickerRows(r=>{
              if(r['使用状态']==='报废') return false;
              if(matCode && codeOf(r['物料信息'])!==matCode) return false;
              return ['厂外','初始化','仓库'].includes(String(r['库存状态']||''));
            });
          }
        } else {
        const outerAnchor = (pageId.value==='outer-serial' && t==='包材档案') ? outerBindAnchor() : null;
        const boundCodes = new Set((detailLineRows.value||[]).map(r=> String(r['包材编号']||r['条码号']||'').trim()).filter(Boolean));
        all = serialArchPickerRows(r=>{
          if(r['使用状态']==='报废') return false;
          if(pageId.value==='outer-serial' && t==='包材档案'){
            if(r['使用状态']!=='在用') return false;
            if(String(r['绑定状态']||'未绑定')!=='未绑定') return false;
            const bc = String(r['条码号']||'').trim();
            if(bc && boundCodes.has(bc)) return false;
            if(outerAnchor && outerAnchor.mat && codeOf(r['物料信息'])!==outerAnchor.mat) return false;
            return true;
          }
          if(pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship') return r['库存状态']==='仓库' && r['使用状态']==='在用';
          if(pageId.value==='wh-prod-issue' || pageId.value==='wh-prod-ret' || pageId.value==='wh-prod-in'){
            if(pageId.value==='wh-prod-in'){
              if(r['使用状态']!=='待初始化') return false;
            } else {
              if(r['使用状态']!=='在用') return false;
              if(String(r['检验状态']||'')!=='合格') return false;
            }
            if(pageId.value==='wh-prod-ret'){
              const outNo = String(formModel['生产领料出库单']||'').trim();
              if(outNo){
                const flowLots = new Set(
                  ((MOCK['wh-prod-issue']||{}).tab3||[])
                    .filter(x=> x['出库单号']===outNo)
                    .map(x=> String(x['物料批号']||'').trim())
                    .filter(Boolean)
                );
                if(flowLots.size && !flowLots.has(String(r['物料批号']||'').trim())) return false;
              }
            }
            return true;
          }
          return true;
        });
        if(matCode && pageId.value!=='wh-so-preout' && pageId.value!=='wh-so-ship' && !(pageId.value==='outer-serial' && t==='包材档案')) all = all.filter(r=> codeOf(r['物料信息'])===matCode);
        }
      } else if(t==='领至线边仓' || t==='来源线边仓'){
        const rows = ((MOCK['line-side']||{}).main||[]).filter(r=> r['启用状态']==='启用');
        all = wrapPickerModuleRows('line-side', rows, '线边仓编码', '线边仓名称', 'main').map(r=>{
          const code = r.编码 || r['线边仓编码'] || '';
          const name = r['线边仓名称'] || r.名称 || '';
          return { ...r, 编码: code, 名称: (code && name) ? (code + ' - ' + name) : (name || code) };
        });
      } else if(t==='生产领料出库单'){
        all = wrapPickerModuleRows('wh-prod-issue', (MOCK['wh-prod-issue']||{}).tab2||[], '出库单号', '物料信息', 'tab2');
      } else if(t==='预警仓库'){
        all = wrapPickerModuleRows('warehouse', ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']==='启用'), '仓库编码', '仓库名称', 'tab1');
      } else if(t==='预警物料'){
        all = matPickerRows();
      } else if(t.includes('物料') && ['wh-po-in','wh-po-ret','wh-os-recv','wh-os-ret-goods'].includes(pageId.value) && String(formModel[whNoticeRefField()]||'').trim() && formModel[whNoticeRefField()]!=='—'){
        const pool = poMatPool.value || [];
        all = pool.filter(m=>{
          if(pageId.value==='wh-po-ret' && isPoRetTankMat(m)) return false;
          return true;
        }).map(m=>{
          const full = matListRow(m.编码 || m['物料编码']);
          if(full) return wrapPickerModuleRows('mat-list', [full], '物料编码', '物料名称')[0];
          return { ...m, 编码: m.编码||'', 名称: m.名称||'', _pickerPageId:'mat-list', _pickerTab:'main', _pickerCodeField:'物料编码' };
        });
      } else if(t==='关联销售出库单'){
        const so = codeOf(formModel['关联销售订单']);
        all = wrapSoOutboundPickerRows(completedSoOutboundRows(so)).map(r=>({ ...r, 规格: r.规格 || '销售出库单' }));
      } else if(t==='关联来源单据'){
        all = restWhSourceDocRows();
      } else if(t==='往来单位' || t==='委托方' || t==='委托方名称'){
        const cust = wrapPickerModuleRows('customer', ((MOCK.customer||{}).main||[]).filter(c=> c['启用状态']==='启用'), '客户编码', '客户名称');
        const supp = wrapPickerModuleRows('supplier', ((MOCK.supplier||{}).main||[]).filter(s=> s['启用状态']==='启用'), '供应商编码', '供应商名称');
        all = cust.concat(supp);
      } else if(t==='盘点仓库'){
        all = wrapPickerModuleRows('warehouse', ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']==='启用'), '仓库编码', '仓库名称', 'tab1');
      } else if(t==='调出仓库' || t==='调入仓库' || t==='移入仓库编码' || t==='移出仓库编码'){
        all = wrapPickerModuleRows('warehouse', ((MOCK.warehouse||{}).tab1||[]).filter(w=> w['启用状态']==='启用'), '仓库编码', '仓库名称', 'tab1');
      } else if(t==='移入库位编码' || t==='移出库位编码'){
        all = warehouseLocPickerRows();
      } else if((t==='条码号' || t==='条码号（主条码）') && isBcSerialPage()){
        const mainOnly = pageId.value==='bc-serial-merge' && t==='条码号（主条码）';
        all = serialArchPickerRows(r=>{
          if(r['使用状态']!=='在用') return false;
          if(String(r['库存状态']||'')==='报废') return false;
          const qty = Number(r['当前数量'] || r['剩余数量'] || 0);
          return qty > 0;
        });
        if(!mainOnly && pageId.value==='bc-serial-merge'){
          const mainBc = formLineRows.value[0]?.['条码号'];
          const used = new Set((formBarcodeRows.value||[]).map(x=> x['条码号']));
          all = all.filter(r=>{
            const bc = r.编码 || r['条码号'];
            if(bc===mainBc || used.has(bc)) return false;
            return serialMergeCompatible(formLineRows.value[0], r);
          });
        }
      } else if(t==='添加条码' && pageId.value==='bc-serial-merge'){
        const mainBc = formLineRows.value[0]?.['条码号'];
        const used = new Set((formBarcodeRows.value||[]).map(x=> x['条码号']));
        all = serialArchPickerRows(r=>{
          if(r['使用状态']!=='在用') return false;
          const qty = Number(r['当前数量'] || r['剩余数量'] || 0);
          if(!(qty > 0)) return false;
          const bc = r['条码号'];
          if(bc===mainBc || used.has(bc)) return false;
          return serialMergeCompatible(formLineRows.value[0], r);
        });
      } else if(t==='条码号' && pageId.value==='bc-unfreeze' && pickerLineRow.value){
        all = freezeListPickerRows();
      } else if(t.includes('物料')){
        all = matPickerRows();
      } else {
        all = [];
        console.warn('未配置选单数据源：' + t);
      }
      const kw = pickerKw.value.trim();
      return kw ? all.filter(r=> pickerRowSearchText(r).includes(kw)) : all;
    });

