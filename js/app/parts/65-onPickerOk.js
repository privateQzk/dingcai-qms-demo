    function onPickerOk(){
      const t = pickerTitle.value || '';
      const orderMatPick = isWhMatMultiPick(t);
      const outerPkgPick = pageId.value==='outer-serial' && t==='包材档案';
      const restMulti = t==='关联来源单据' || t==='盘点仓库' || t==='关联库位/仓库' || t==='选择仓库' || t==='拣货流水码' || t==='采集项列表' || t==='添加采集项' || orderMatPick || outerPkgPick;
      if(restMulti){
        if(!(pickerSelected.value||[]).length && !pickerCurrent.value){
          ElMessage.warning(t==='拣货流水码' ? '请至少选择一条流水码' : (outerPkgPick ? '请至少选择一条包材档案' : (orderMatPick ? '请至少选择一条物料' : (t==='关联来源单据' ? '请至少选择一条来源单据' : '请至少选择一项'))));
          return;
        }
      } else if(!pickerCurrent.value){
        ElMessage.warning('请选择一条数据'); return;
      }
      const row = pickerCurrent.value || ((pickerSelected.value||[])[0]) || {};
      const label = row.编码+' / '+row.名称;
      if(pickerBind.value==='query'){
        let val = row.编码 || row['单号'] || row.名称 || '';
        if(t.includes('客户') || t.includes('委托') || t.includes('往来')) val = row.名称 || row['客户名称'] || row['供应商名称'] || val;
        if(t.includes('发货单')) val = row['发货单号'] || row.编码 || val;
        if(t.includes('运单')) val = row['运单号'] || row.编码 || val;
        if(t.includes('销售订单')) val = row['销售订单号'] || row.编码 || val;
        if(t.includes('出库单')) val = row['出库单号'] || row.编码 || val;
        if(t==='盘点仓库') val = row['仓库名称'] || row.名称 || val;
        query[t] = val;
        ElMessage.success('已选择：'+val);
        pickerVisible.value=false;
        pickerLineRow.value=null;
        return;
      }
      if(t==='所属调度员' || t==='关联用户'){
        const name = row.用户名称 || row.名称 || '';
        if(pickerBind.value==='query') query[t] = name;
        else formModel[t] = name;
        ElMessage.success('已选择：'+name);
        pickerVisible.value=false;
        pickerLineRow.value=null;
        return;
      }
      if(t==='预警仓库'){
        pickerVisible.value=false;
        openForm('add');
        Object.assign(formModel, {
          仓库编码: row['仓库编码'] || row.编码 || '',
          仓库名称: row['仓库名称'] || row.名称 || '',
          仓库位置: row['仓库位置'] || '',
          仓库用途: row['仓库用途'] || '',
          最大库存: '',
          最小库存: '',
          备注: ''
        });
        formSwitch['启用状态'] = true;
        ElMessage.success('已带入仓库：'+(formModel['仓库编码']||'')+' / '+(formModel['仓库名称']||''));
        return;
      }
      if(t==='预警物料'){
        pickerVisible.value=false;
        openForm('add');
        Object.assign(formModel, {
          物料编码: row['物料编码'] || row.编码 || '',
          物料名称: row['物料名称'] || row.名称 || '',
          物料规格: row['物料规格'] || row.规格 || '',
          物料种类: row['物料种类'] || row.种类 || '',
          基本单位: row['基本单位'] || '',
          最大库存: '',
          最小库存: '',
          库龄预警期: '',
          库龄预警期单位: '天',
          备注: ''
        });
        formSwitch['启用状态'] = true;
        ElMessage.success('已带入物料：'+(formModel['物料编码']||'')+' / '+(formModel['物料名称']||''));
        return;
      }
      if(t==='订单号'){
        if(splitPickerMode.value){
          splitForm.订单号 = (row.编码||'') + ' / ' + (row.名称||'');
          splitForm.合同号 = row['合同号'] || row.规格 || lookupContractNo(splitForm.订单类型, row.编码);
          ElMessage.success('已选择订单号（写入本张发货单）：'+splitForm.订单号);
          splitPickerMode.value = false;
          pickerVisible.value=false;
          pickerLineRow.value=null;
          return;
        }
        formModel['订单号'] = (row.编码||'') + ' / ' + (row.名称||'');
        formModel['合同号'] = row['合同号'] || row.规格 || lookupContractNo(formModel['订单类型'], row.编码);
        if(pageId.value==='lg-dispatch'){
          formLineRows.value = dispatchLinesFromOrder(formModel['订单类型'], row.编码);
        }
        ElMessage.success(pageId.value==='lg-dispatch' ? ('已选择订单并带入物料：'+formModel['订单号']) : ('已选择订单号：'+formModel['订单号']));
      } else if(t==='前置关联单据' && (pageId.value==='lg-dispatch' || splitPickerMode.value)){
        if(splitPickerMode.value){
          const kind = dispatchPreDocKind(splitBizOf());
          const docLabel = row.规格 || '销售出库单';
          splitForm.前置关联单据 = (row.编码||'') + ' / ' + docLabel;
          const lots = dispatchLinesFromPreDoc(kind, row.编码);
          if(lots.length && (splitLines.value||[]).length){
            const lot0 = lots[0]['批号'] || lots[0]['行备注'] || '';
            if(lot0) (splitLines.value||[]).forEach(r=>{ if(r && !r['批号']) r['批号'] = String(lot0); });
          }
          ElMessage.success('已选择前置关联单据（写入本张发货单）：'+splitForm.前置关联单据);
          splitPickerMode.value = false;
          pickerVisible.value=false;
          pickerLineRow.value=null;
          return;
        }
        const kind = dispatchPreDocKind();
        const docLabel = row.规格 || '销售出库单';
        formModel['前置关联单据'] = (row.编码||'') + ' / ' + docLabel;
        const lines = dispatchLinesFromPreDoc(kind, row.编码);
        if(lines.length) formLineRows.value = lines;
        ElMessage.success('已选择前置关联单据并带入物料：'+formModel['前置关联单据']);
      } else if(t==='采购订单' && (pageId.value==='lg-dispatch' || splitPickerMode.value)){
        if(splitPickerMode.value){
          splitForm.采购订单 = (row.编码||'') + ' / ' + (row.名称||'');
          const po = ((MOCK.po||{}).main||[]).find(r=> r['采购订单号']===row.编码);
          splitForm.合同号 = (po && po['合同号']) || row.规格 || lookupContractNo('采购订单', row.编码);
          ElMessage.success('已选择直发采购订单（写入本张发货单）：'+splitForm.采购订单);
          splitPickerMode.value = false;
          pickerVisible.value=false;
          pickerLineRow.value=null;
          return;
        }
        formModel['采购订单'] = (row.编码||'') + ' / ' + (row.名称||'');
        const po = ((MOCK.po||{}).main||[]).find(r=> r['采购订单号']===row.编码);
        formModel['合同号'] = (po && po['合同号']) || row.规格 || lookupContractNo('采购订单', row.编码);
        if(po && po['供应商名称']) formModel['供应商名称'] = po['供应商名称'];
        formLineRows.value = poLinesAsForm(row.编码);
        ElMessage.success('已选择直发采购订单：'+formModel['采购订单']);
      } else if(t==='点位名称' || t==='点位列表'){
        formModel['点位名称'] = row['点位名称'] || row.名称 || row.编码 || '';
        formModel['采集平台'] = row['采集平台'] || row.规格 || '';
        ElMessage.success('已选择点位：'+formModel['点位名称']);
      } else if(t==='采集项列表' || t==='添加采集项'){
        const rows = pickerMultiSelect.value ? (pickerSelected.value||[]).slice() : (row ? [row] : []);
        if(!rows.length){ ElMessage.warning('请选择采集项'); pickerVisible.value=false; return; }
        const exist = new Set((formLineRows.value||[]).map(r=> r['采集项编码']));
        let added = 0;
        rows.forEach(r=>{
          const code = r['采集项编码'] || r.编码 || '';
          if(!code || exist.has(code)) return;
          exist.add(code);
          const freq = r['采集频率'] || ((r['采集频率数值']!=null && r['采集频率单位']) ? (String(r['采集频率数值'])+r['采集频率单位']) : '');
          formLineRows.value = formLineRows.value.concat([hydrateGatherLine({
            采集项编码: code,
            采集项名称: r['采集项名称'] || r.名称 || '',
            采集频率: freq,
            采集位置: r['点位名称'] || '',
            采集项单位: r['采集项单位'] || '',
            采集项原单位: r['采集项单位'] || '',
            采集项单位编码: r['采集项单位编码'] || ''
          }, formLineRows.value.length)]);
          added++;
        });
        ElMessage.success(added ? ('已添加 '+added+' 个采集项') : '所选采集项已在指标集中');
      } else if(t==='关联销售订单'){
        formModel['关联销售订单'] = (row.编码||'') + (row.名称 ? (' / ' + row.名称) : '');
        if(pageId.value==='wh-so-prep'){
          formModel['关联销售订单'] = row.编码 || '';
          formModel['客户名称'] = row.名称 || formModel['客户名称'] || '';
          const lines = soLinesAsForm(row.编码);
          if(lines[0]){
            formModel['物料信息'] = lines[0]['物料信息'] || formModel['物料信息'] || '';
            formModel['单位'] = lines[0]['销售单位'] || lines[0]['库存单位'] || formModel['单位'] || '吨';
            if(!formModel['备货数量']) formModel['备货数量'] = lines[0]['计划数量'] || '30.000';
          }
          ElMessage.success('已选择销售订单并带入客户与物料');
        } else if(isCsWhPage()){
          formModel['关联销售订单'] = row.编码 || codeOf(formModel['关联销售订单']) || '';
          formModel['客户名称'] = row.名称 || row['客户名称'] || '';
          if(isCsRecvPage()){
            formLineRows.value.forEach(r=>{ if(r && (!r['生产厂家'] || r['生产厂家']==='—')) r['生产厂家'] = formModel['客户名称']; });
          }
          ElMessage.success('已关联销售订单并带出客户名称');
        } else {
          ElMessage.success('已关联销售订单：'+formModel['关联销售订单']);
        }
      } else if(t==='销售订单'){
        formModel['销售订单'] = (row.编码||'') + ' / ' + (row.名称||'');
        formLineRows.value = soLinesAsForm(row.编码);
        ElMessage.success('已选择销售订单并带入物料明细');
      } else if(t==='关联销售备货单'){
        const no = row.编码 || row['备货通知单号'] || label;
        if(splitPickerMode.value){
          splitForm.关联销售备货单 = no;
          ElMessage.success('已选择备货单（写入本张发货单）：'+no);
          splitPickerMode.value = false;
          pickerVisible.value=false;
          pickerLineRow.value=null;
          return;
        }
        formModel['关联销售备货单'] = no;
        const prep = ((MOCK['wh-so-prep']||{}).main||[]).find(r=> r['备货通知单号']===no) || row;
        if(pageId.value==='lg-dispatch'){
          applyPrepToDispatchForm(prep, no);
          ElMessage.success('已选择备货单并带入物料：'+no);
        } else if(pageId.value==='wh-so-ship'){
          if(prep['关联销售订单']){
            formModel['关联销售订单'] = prep['关联销售订单'];
            formModel['客户名称'] = prep['客户名称'] || formModel['客户名称'] || '';
          } else {
            formModel['关联销售订单'] = stockSoMap(no);
            formModel['客户名称'] = String(formModel['关联销售订单']||'').split(' / ')[1] || formModel['客户名称'] || '';
          }
          const lot = (Array.isArray(prep._pickLines) && prep._pickLines[0] && prep._pickLines[0]['物料批号']) || prep['批号'] || '';
          formLineRows.value = [{
            _i: 1,
            行状态: '待执行',
            物料信息: prep['物料信息'] || matInfoText(prep),
            批号: lot || '—',
            库存单位: prep['单位'] || 'KG',
            管理方式: '条码管理',
            计划件数: '10',
            计划数量: String(prep['备货数量'] || prep['已备数量'] || '10.000'),
            已完成数量: '0.000',
            未完成数量: String(prep['备货数量'] || prep['已备数量'] || '10.000'),
            备注: ''
          }];
          ElMessage.success('已选择备货单并带入销售订单与已备物料：'+no);
        } else {
          formModel['销售订单'] = stockSoMap(no);
          formLineRows.value = soLinesAsForm(codeOf(formModel['销售订单']));
          ElMessage.success('已选择备货单并带入销售订单与物料');
        }
      } else if(t==='关联备货通知单'){
        const no = row.编码 || row['备货通知单号'] || label;
        formModel['关联备货通知单'] = no;
        const prep = ((MOCK['wh-so-prep']||{}).main||[]).find(r=> r['备货通知单号']===no) || row;
        if(prep['关联销售订单']){
          formModel['关联销售订单'] = prep['关联销售订单'];
          formModel['客户名称'] = prep['客户名称'] || formModel['客户名称'] || '';
        }
        if(prep['物料信息'] && !(formLineRows.value||[]).length){
          formLineRows.value = [{
            _i: 1,
            物料信息: prep['物料信息'],
            批号: '',
            库存单位: prep['单位'] || '吨',
            管理方式: '条码管理',
            计划件数: '10',
            计划数量: String(prep['备货数量'] || prep['已备数量'] || '10.000'),
            备注: ''
          }];
        }
        ElMessage.success('已选择备货通知单：'+no);
      } else if(t==='选择仓库'){
        const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
        if(!rows.length){ ElMessage.warning('请至少选择一个仓库'); return; }
        const existing = new Set((formLineRows.value||[]).map(r=> r['仓库编号']).filter(Boolean));
        const added = [];
        rows.forEach(r=>{
          const no = r['仓库编号'] || r['仓库编码'] || r.编码 || '';
          if(!no || existing.has(no)) return;
          existing.add(no);
          added.push({
            仓库编号: no,
            仓库名称: r['仓库名称'] || r.名称 || '',
            仓库类型: r['仓库类型'] || inspWhTypeOf(r['仓库名称'] || r.名称),
            负责人: r['负责人'] || r['创建人'] || '—',
            备注: '—'
          });
        });
        if(!added.length){ ElMessage.warning('所选仓库均已添加，请重新选择'); return; }
        const base = formLineRows.value || [];
        formLineRows.value = base.concat(added).map((x,i)=> normInspSchemeLocRow(x, i));
        ElMessage.success('已添加 '+added.length+' 个关联仓库');
      } else if(t==='关联库位/仓库'){
        const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
        if(!rows.length){ ElMessage.warning('请至少选择一个仓库/库位'); return; }
        formModel._locs = rows.map(r=>{
          const wh = ((MOCK.warehouse||{}).tab1||[]).find(w=> w['仓库名称']===r['所属仓库']) || {};
          const typeMap = { '原料仓':'危化品库', '成品仓':'危化品库', '包材仓':'常温库', '线边仓':'常温库', '待检仓':'常温库' };
          return {
            编码: r['库位编码']||r.编码,
            名称: r['库位名称']||r.名称,
            仓库编号: wh['仓库编码'] || r['仓库编号'] || '',
            仓库名称: r['所属仓库'] || r['仓库名称'] || '',
            仓库类型: typeMap[r['所属仓库']] || r['仓库类型'] || '常温库',
            '库区/库位': r['库位名称'] || r['库位位置'] || r['库区/库位'] || r.名称,
            责任人: wh['创建人'] || r['责任人'] || '张三',
            备注: (r['备注'] && r['备注']!=='—') ? r['备注'] : '—'
          };
        });
        formModel['关联库位/仓库'] = formModel._locs.map(l=> (l.编码||l.仓库编号) + ' / ' + (l.名称||l['库区/库位'])).join('、');
        ElMessage.success('已选择 '+formModel._locs.length+' 个仓库/库位');
      } else if(t==='巡检方案名称'){
        fillPlanFromScheme(row['巡检方案名称'] || row.名称);
        ElMessage.success(pageId.value==='wh-insp-plan' ? ('已选择巡检方案：'+(row['巡检方案名称'] || row.名称)) : ('已选择巡检方案并带出仓库：'+(row['巡检方案名称'] || row.名称)));
      } else if(t==='发货地' || t==='收货地' || t==='装货地点' || t==='卸货地点'){
        const addr = row.地址描述 || row.名称 || row['仓库位置'] || '';
        const code = row.地址编码 || row.编码 || row['仓库编码'] || '';
        const val = code && addr ? (code + ' / ' + addr) : (addr || code);
        if(t==='发货地' || t==='收货地'){
          formModel[t] = val;
        } else {
          formModel[t] = val;
          if(t==='装货地点'){
            formModel['装货联系人'] = row.联系人 || row['仓库负责人'] || '';
            formModel['装货联系电话'] = row.联系电话 || '';
          } else {
            formModel['卸货联系人'] = row.联系人 || row['仓库负责人'] || '';
            formModel['卸货联系电话'] = row.联系电话 || '';
          }
        }
        ElMessage.success('已选择'+t+'：'+val);
      } else if(t==='产品信息' || t==='产品名称' || (t.includes('物料') && pageId.value==='freight')){
        const kind = row.种类 || row.物料种类 || '—';
        formModel['产品信息'] = `${row.编码} / ${row.名称} / ${row.规格||'—'} / ${kind}`;
        ElMessage.success('已选择产品：'+formModel['产品信息']);
      } else if(t==='供应商'){
        settleForm.供应商 = `${row.编码||''} ${row.名称||''}`.trim();
        settleForm.供应商编码 = row.编码 || '';
        ElMessage.success('已选择供应商：'+settleForm.供应商);
      } else if(t==='运输服务物料信息'){
        settleForm.运输服务物料信息 = `${row.编码} / ${row.名称}`;
        settleForm.采购单位 = row.采购单位 || row.种类 || 'Pcs';
        ElMessage.success('已选择运输服务物料：'+settleForm.运输服务物料信息);
      } else if(t==='供应商编码' || (pageId.value==='wwpo' && t.includes('供应商'))){
        if(pageId.value==='po'){
          formModel['供应商编码'] = row.编码 || '';
          formModel['供应商名称'] = row.名称 || '';
          ElMessage.success('已选择供应商：'+(row.编码||'')+' / '+(row.名称||''));
        } else {
          formModel['供应商编码'] = row.编码 || '';
          formModel['供应商名称'] = row.名称 || '';
          ElMessage.success('已选择加工厂：'+(row.编码||'')+' / '+(row.名称||''));
        }
      } else if(t==='客户编码'){
        formModel['客户编码'] = row.编码 || '';
        formModel['客户名称'] = row.名称 || '';
        ElMessage.success('已选择客户：'+(row.编码||'')+' / '+(row.名称||''));
      } else if(t.includes('生产订单')){
        applyProdOrderToProdInForm(row.编码 || codeOf(label), row);
        ElMessage.success('已带入生产订单及物料明细');
      } else if(t.includes('采购订单') || t.includes('委外加工单')){
        if(t.includes('委外加工单') || isOsPoPage()){
          applyWwpoToNoticeForm(row.编码 || codeOf(label), row);
        } else if(isPoNoticePage()){
          applyPoToPoInForm(row.编码 || codeOf(label), row);
        } else {
          formModel['关联采购订单'] = label;
          const poNo = row.编码 || codeOf(label);
          const po = poOrderOf(poNo);
          if(po && po['供应商名称']) formModel['供应商名称'] = po['供应商名称'];
          const mats = poMatsOf(poNo);
          poMatPool.value = mats;
          if(mats[0] && mats[0].供应商) formModel['供应商名称'] = mats[0].供应商;
          formLineRows.value = mats.map((m,i)=>({
            _i: i+1,
            物料信息: matInfoText(m),
            库存单位: matUnit(m,'po'),
            管理方式: ((matListRow(m.编码)||{})['管理方式']) || '条码管理',
            计划件数: String(m.计划件数 || '10'),
            计划数量: String(m.计划数量 || '100'),
            备注: m.备注 || ''
          }));
        }
        if(pageId.value==='qc-ledger'){
          formModel['关联单号'] = row.编码 || label;
          if(row.检验类型) formModel['检验类型'] = row.检验类型;
          const first = (poMatPool.value||[])[0];
          if(first) formModel['物料信息'] = matInfoText(first);
        }
        ElMessage.success(t.includes('委外')||isOsPoPage()?(isOsRawMatNoticePage()?'已关联委外加工单并带入加工厂信息':'已带入委外加工单及物料明细'):'已带入采购订单、供应商与物料明细');
      } else if(t.includes('供应商')){
        formModel['供应商名称'] = row.名称;
        ElMessage.success('已选择供应商：'+row.名称);
      } else if(t.includes('派车申请单')){
        const code = row.编码 || row['编号'] || '';
        formModel['关联派车申请单'] = code;
        Object.assign(formModel, {
          发货单位: row['发货单位']||formModel['发货单位']||'',
          收货单位: row['收货单位']||formModel['收货单位']||'',
          装货地点: row['装货地点']||'',
          装货联系人: row['装货联系人']||'仓库值班',
          装货联系电话: row['装货联系电话']||'',
          卸货地点: row['卸货地点']||'',
          卸货联系人: row['卸货联系人']||'收货员',
          卸货联系电话: row['卸货联系电话']||'',
          车型要求: row['车型要求']||'厢式货车',
          要求送达时间: row['要求送达时间']||'',
          特殊要求: row['特殊要求']||'—'
        });
        const lines = ((MOCK['lg-dispatch']||{}).formLinesFromDispatch || (MOCK['lg-dispatch']||{}).detailLines || []);
        formLineRows.value = lines.map((r,i)=>({_i:i+1, ...r}));
        ElMessage.success('已带入派车申请单关联信息及物料明细');
      } else if(t.includes('承运公司') || t.includes('承运商')){
        if(pageId.value==='lg-carrier-evt' || t==='承运商编码' || t==='承运商'){
          formModel['承运商编码'] = row.编码 || row['承运商编码'] || '';
          formModel['承运商名称'] = row.名称 || row['承运商名称'] || '';
          ElMessage.success('已选择承运商：'+(formModel['承运商编码']||'')+' / '+(formModel['承运商名称']||''));
        } else {
          formModel['承运公司'] = row.名称;
          ElMessage.success('已选择承运公司：'+row.名称);
        }
      } else if(t==='关联运单' || t==='关联运单号'){
        formModel['关联运单'] = codeOf(row.编码 || row['运单号'] || '') || (row.编码 || row['运单号'] || '');
        if(isWhNoticePage() || isCsWhPage() || pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret' || pageId.value==='wh-other-in' || pageId.value==='wh-other-out' || isLoadPage()){
          const way = findWaybillByNo(formModel['关联运单']) || row;
          fillPoInCarrierFromWaybill(way);
          const tip = formModel['关联发货单']
            ? (isOsPoPage()
              ? ('已关联运单并自动带入发货单 '+formModel['关联发货单']+'，物料明细已按发货单覆盖')
              : (isCsWhPage() || pageId.value==='wh-so-ship'
                ? ('已关联运单并自动带入发货单 '+formModel['关联发货单']+' / 承运信息与物料明细')
                : ('已关联运单并自动带入发货单 '+formModel['关联发货单']+' / 承运信息')))
            : ('已关联运单并带出派车承运信息：'+formModel['关联运单']);
          ElMessage.success(tip);
        } else {
          ElMessage.success('已关联运单：'+formModel['关联运单']);
        }
      } else if(t==='选择车辆与司机'){
        formModel['车牌号'] = row['车牌号'] || row.编码 || '';
        formModel['车挂号'] = row['车挂号'] || row['挂车号'] || '—';
        formModel['司机姓名'] = row['司机姓名'] || row.名称 || '';
        formModel['司机电话'] = row['联系电话'] || row['司机电话'] || '';
        formModel['司机身份证号'] = row['司机身份证号'] || '';
        ElMessage.success('已选择车辆与司机：'+formModel['车牌号']+' / '+formModel['司机姓名']);
      } else if(t==='关联销售订单' && (pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret')){
        const soNo = row.编码 || row['销售订单号'] || codeOf(label);
        const so = soOrderOf(soNo) || row;
        formModel['关联销售订单'] = soNo + (so['客户名称'] ? (' / ' + so['客户名称']) : (row.名称 ? (' / ' + row.名称) : ''));
        formModel['客户名称'] = so['客户名称'] || row.名称 || '';
        formModel['关联运单'] = '';
        formModel['关联发货单'] = '';
        if(pageId.value==='wh-so-ship') formModel['关联销售预出货单'] = '';
        if(pageId.value==='wh-so-ret') formModel['关联销售出库单'] = '';
        ['车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
        formLineRows.value = soLinesAsForm(soNo).map((r,i)=>({
          _i: i+1,
          行状态: '待执行',
          物料信息: r['物料信息'] || matInfoText(r),
          批号: '',
          库存单位: r['销售单位'] || r['库存单位'] || matUnit(r,'so'),
          管理方式: ((matListRow(codeOf(r['物料信息']||r))||{})['管理方式']) || '条码管理',
          计划件数: String(r['计划件数'] || '10'),
          计划数量: String(r['计划数量'] || '10.000'),
          已完成数量: '0.000',
          未完成数量: String(r['计划数量'] || '10.000'),
          备注: r['备注'] || ''
        }));
        ElMessage.success('已选择销售订单并带入客户与物料：'+formModel['关联销售订单']);
      } else if(t==='关联销售预出货单' && (pageId.value==='wh-so-ship' || pageId.value==='lg-dispatch' || splitPickerMode.value)){
        const outNo = row.编码 || row['出库单号'] || label;
        if(row['单据状态'] && row['单据状态']!=='已完成'){
          ElMessage.warning('仅可选择「已完成」的销售预出货出库单');
          return;
        }
        if(splitPickerMode.value){
          splitForm.关联销售预出货单 = outNo;
          ElMessage.success('已选择预出货出库单（写入本张发货单）：'+outNo);
          splitPickerMode.value = false;
          pickerVisible.value=false;
          pickerLineRow.value=null;
          return;
        }
        if(pageId.value==='lg-dispatch'){
          const ok = applyPreoutToDispatchForm(row);
          pickerVisible.value = false;
          pickerLineRow.value = null;
          ElMessage.success(ok
            ? ('已关联预出货出库单 '+outNo+'，已按实际出库带入物料')
            : ('已关联预出货出库单：'+outNo+'（未找到出库明细）'));
          return;
        }
        const doApply = ()=>{
          fillSoShipHeaderFromPreout(row);
          const ok = applyPreoutOutToSoShipForm(row);
          pickerVisible.value = false;
          pickerLineRow.value = null;
          ElMessage.success(ok
            ? ('已关联预出货出库单 '+outNo+'，已按实际出库带入物料/批号/数量与运力')
            : ('已关联预出货出库单：'+outNo+'（未找到出库明细）'));
        };
        confirmReplaceSoShipLines(doApply);
        return;
      } else if(t==='发货单位' || t==='收货单位'){
        formModel[t] = row.名称;
        ElMessage.success('已选择'+t+'：'+row.名称);
      } else if(t.includes('发货单') || t==='关联发货单'){
        const code = row.编码 || row['发货单号'] || '';
        if(String(pageId.value||'').startsWith('wh-')){
          const exclude = (formMode.value==='edit') ? { id: formModel._editId, 单号: formModel['单号'] } : null;
          if((isWhNoticePage() || isCsWhPage()) && !assertShipNoticeUnique(code, { exclude })) return;
          formModel['关联发货单'] = code;
          if(isOsPoPage()){
            const overwritten = applyShipMatsToOsNoticeForm(row._synthetic ? findShipByNo(code) || row : (row['发货单号'] ? row : findShipByNo(code) || row));
            ElMessage.success(overwritten
              ? ('已选择发货单 '+code+'，物料明细已按发货单覆盖')
              : ('已选择发货单：'+code));
          } else if(isCsWhPage()){
            const overwritten = applyShipMatsToCsRecvForm(row._synthetic ? findShipByNo(code) || row : (row['发货单号'] ? row : findShipByNo(code) || row));
            ElMessage.success(overwritten
              ? ('已选择发货单 '+code+'，物料明细已自动带入')
              : ('已选择发货单：'+code));
          } else if(pageId.value==='wh-so-ship'){
            const overwritten = applyShipMatsToSoShipForm(row._synthetic ? findShipByNo(code) || row : (row['发货单号'] ? row : findShipByNo(code) || row));
            ElMessage.success(overwritten
              ? ('已选择发货单 '+code+'，物料明细已自动带入')
              : ('已选择发货单：'+code));
          } else {
            ElMessage.success('已选择发货单：'+code);
          }
        } else {
          const cur = (formModel['关联发货单']||'').split('、').map(s=>s.trim()).filter(Boolean);
          if(!cur.includes(code)) cur.push(code);
          formModel['关联发货单'] = cur.join('、');
          const map = (MOCK['lg-waybill']||{}).formShipMap || {};
          const lines = cur.map(c => map[c]).filter(Boolean).map((r,i)=>({_i:i+1, ...r}));
          formLineRows.value = lines;
          const pcs = [...new Set(lines.map(r=>r['派车申请单号']).filter(Boolean))];
          formModel['关联派车申请单号'] = pcs.join('、') || '—';
          const times = lines.map(r=>r['要求送达时间']).filter(Boolean).sort();
          const loadTimes = lines.map(r=>r['计划装车时间']).filter(Boolean).sort();
          formModel['要求送达时间'] = times[0] || '—';
          formModel['计划装车时间'] = loadTimes[0] || '—';
          const fee = lines.reduce((s,r)=> s + (Number(r['运费'])||0), 0);
          formModel['运费'] = fee ? ('¥' + fee.toLocaleString()) : '—';
          const withDriver = lines.find(r=> r['司机车牌号']);
          if(withDriver){
            formModel['司机车牌号'] = withDriver['司机车牌号']||'';
            formModel['司机姓名'] = withDriver['司机姓名']||'';
            formModel['司机电话'] = withDriver['司机电话']||'';
          }
          ElMessage.success('已选择发货单并生成装卸货点明细：'+formModel['关联发货单']);
        }
      } else if(t.includes('物料') && t.includes('新物料')){
        formModel['新物料编码'] = row.编码 || row['物料编码'] || '';
        formModel['新物料名称'] = row.名称 || row['物料名称'] || '';
        formModel['新物料规格'] = row.规格 || row['物料规格'] || '';
        formModel['新物料种类'] = row.种类 || row['物料种类'] || '';
        ElMessage.success('已选择新物料：'+(formModel['新物料编码']||'')+' / '+(formModel['新物料名称']||''));
      } else if(t==='关联销售出库单' && pageId.value==='wh-so-ret'){
        const outNo = row.编码 || row['出库单号'] || label;
        formModel['关联销售出库单'] = outNo;
        const notice = findSoOutNotice(row);
        formModel['关联销售订单'] = row['关联销售订单'] || notice['关联销售订单'] || formModel['关联销售订单'] || '';
        formModel['客户名称'] = row['客户名称'] || notice['客户名称'] || formModel['客户名称'] || '';
        formModel['关联运单'] = notice['关联运单'] || row['关联运单'] || '—';
        formModel['关联发货单'] = notice['关联发货单'] || row['关联发货单'] || '—';
        formModel['车牌号'] = notice['车牌号'] || '—';
        formModel['车挂号'] = notice['车挂号'] || '—';
        formModel['司机姓名'] = notice['司机姓名'] || '—';
        formModel['司机电话'] = notice['司机电话'] || '—';
        formModel['司机身份证号'] = notice['司机身份证号'] || '—';
        applyOutToSoRetForm(row);
        ElMessage.success('已关联销售出库单并带入订单/运力/物料；批号请从原出库流水码档案选择');
      } else if(t==='关联销售出库单'){
        formModel['关联销售出库单'] = row.编码 || row['出库单号'] || label;
        ElMessage.success('已选择销售出库单：'+formModel['关联销售出库单']);
      } else if(t==='关联来源单据'){
        const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
        if(!rows.length){ ElMessage.warning('请至少选择一条来源单据'); return; }
        formModel['关联来源单据'] = rows.map(r=> r.编码 || r['单号'] || '').filter(Boolean).join('、');
        ElMessage.success('已选择来源单据 '+rows.length+' 条');
      } else if(t==='盘点仓库'){
        const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
        if(!rows.length){ ElMessage.warning('请至少选择一个仓库'); return; }
        formModel['盘点仓库'] = rows.map(r=> r['仓库名称'] || r.名称 || r.编码).filter(Boolean).join('、');
        ElMessage.success('已选择盘点仓库：'+formModel['盘点仓库']);
      } else if(t==='往来单位' || t==='委托方' || t==='委托方名称'){
        formModel[t] = row.名称 || row['客户名称'] || row['供应商名称'] || label;
        ElMessage.success('已选择'+t+'：'+formModel[t]);
      } else if(t==='调出仓库' || t==='调入仓库'){
        const code = row['仓库编码'] || row.编码 || '';
        const name = row['仓库名称'] || row.名称 || '';
        formModel[t] = (code && name) ? (code + ' - ' + name) : (name || code);
        const other = t==='调出仓库' ? formModel['调入仓库'] : formModel['调出仓库'];
        if(other && String(other).trim()===String(formModel[t]).trim()){
          formModel[t] = '';
          ElMessage.warning('调出仓库与调入仓库不能相同'); return;
        }
        ElMessage.success('已选择'+t+'：'+formModel[t]);
      } else if(t==='移入仓库编码' || t==='移出仓库编码'){
        formModel[t] = row['仓库编码'] || row.编码 || '';
        ElMessage.success('已选择仓库：'+(formModel[t]||'')+' / '+(row['仓库名称']||row.名称||''));
      } else if(t==='移入库位编码' || t==='移出库位编码'){
        formModel[t] = row['库位编码'] || row.编码 || '';
        ElMessage.success('已选择库位：'+(formModel[t]||'')+' / '+(row['库位名称']||row.名称||''));
      } else if(t.includes('物料')){
        if(pageId.value==='pkg-craft' && (t==='适用物料' || t==='物料信息' || t.includes('物料'))){
          const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
          if(!rows.length){ ElMessage.warning('请至少选择一条物料'); return; }
          const seen = new Set((formLineRows.value||[]).map(r=> codeOf(r['物料编码']||r['物料信息'])));
          let n = 0;
          rows.forEach(m=>{
            const code = m.编码 || codeOf(m['物料编码']||m['物料信息']||m);
            if(!code || seen.has(code)) return;
            seen.add(code);
            formLineRows.value = formLineRows.value.concat([{
              _i: formLineRows.value.length + 1,
              物料编码: code,
              物料信息: matInfoText(m)
            }]);
            n++;
          });
          pickerVisible.value=false;
          ElMessage.success(n ? ('已添加适用物料 '+n+' 条') : '所选物料均已在列表中');
          return;
        }
        if(pageId.value==='serial-arch'){
          const info = matInfoText(row);
          const m = matListRow(row.编码||row['物料编码']||info);
          const unit = (m && (m['库存单位']||m['基本单位'])) || row['库存单位'] || row.单位 || 'KG';
          if(!/条码/.test(String((m&&m['管理方式'])||row['管理方式']||'条码'))){
            ElMessage.warning('所选物料管理方式需为条码管理，请重新选择'); return;
          }
          if(batchVisible.value){
            batchForm['物料信息'] = info;
            batchForm['库存单位'] = unit;
          } else {
            formModel['物料信息'] = info;
            formModel['库存单位'] = unit;
          }
          pickerVisible.value=false;
          ElMessage.success('已选择物料：'+info);
        } else if(pageId.value==='wh-stocktake'){
          const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
          if(!rows.length){ ElMessage.warning('请至少选择一条物料'); return; }
          const seen = new Set();
          const labels = [];
          const codes = [];
          rows.forEach(m=>{
            const code = m.编码 || codeOf(m['物料编码']||m['物料信息']||m);
            if(!code || seen.has(code)) return;
            seen.add(code);
            codes.push(code);
            const info = matInfoText(m);
            const parts = String(info).split(' / ');
            labels.push((parts[0] && parts[1]) ? (parts[0] + ' / ' + parts[1]) : (info || code));
          });
          formModel['物料信息'] = labels.join('、');
          applyStocktakeMatFilter(codes);
          pickerVisible.value=false;
          ElMessage.success('已多选物料 '+codes.length+' 种，已按范围刷新库存/条码详情');
          return;
        } else if(pageId.value==='mat-uom'){
          const m = matListRow(row.编码||row['物料编码']);
          fillMatUomFromMat(m || {
            物料编码: row.编码,
            物料名称: row.名称,
            物料规格: row.规格,
            物料种类: row.种类,
            基本单位: row.单位 || 'KG'
          });
          ElMessage.success('已选择物料并带入名称、规格、种类与基本单位');
        } else if(pageId.value==='mat-medium'){
          const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
          if(!rows.length){ ElMessage.warning('请至少选择一条物料'); return; }
          const cur = formModel._mats || [];
          const seen = new Set(cur.map(m=> codeOf(m.编码||m['物料编码']||m['物料信息'])));
          let n = 0;
          rows.forEach(m=>{
            const code = codeOf(m.编码||m['物料编码']);
            if(!code || seen.has(code)) return;
            seen.add(code);
            cur.push({
              编码: code,
              物料编码: code,
              物料信息: matInfoText(m),
              名称: m.名称 || m['物料名称'] || '',
              规格: m.规格 || m['物料规格'] || '',
              种类: m.种类 || m['物料种类'] || ''
            });
            n++;
          });
          formModel._mats = cur;
          formModel['物料信息'] = cur.length ? (`已选 ${cur.length} 种物料`) : '';
          pickerVisible.value=false;
          ElMessage.success(n ? ('已选择 '+n+' 条物料') : '所选物料均已在列表中');
        } else if(pageId.value==='wh-so-prep'){
          formModel['物料信息'] = matInfoText(row);
          formModel['单位'] = row.单位 || matUnit(row,'so') || '吨';
          ElMessage.success('已选择物料：'+formModel['物料信息']);
        } else if(pageId.value==='po' || pageId.value==='so' || pageId.value==='wwpo'){
          const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
          if(!rows.length){ ElMessage.warning('请至少选择一条物料'); return; }
          const unitField = pageId.value==='po' || pageId.value==='wwpo' ? '采购单位' : '销售单位';
          const unitKind = pageId.value==='po' || pageId.value==='wwpo' ? 'po' : 'so';
          const makeLine = (m, idx, lineNoOverride)=>{
            const lineNo = lineNoOverride || (target ? lineNoOf(target, target._i || formLineRows.value.indexOf(target)+1) : nextErpLineNo(formLineRows.value));
            const line = {
              _i: idx,
              行号: lineNo,
              物料信息: matInfoText(m),
              [unitField]: matUnit(m, unitKind),
              计划数量: '',
              备注: ''
            };
            if(pageId.value==='po' || pageId.value==='so' || pageId.value==='wwpo') line['计划件数'] = '';
            return line;
          };
          const target = pickerLineRow.value;
          if(target){
            Object.assign(target, makeLine(rows[0], target._i || formLineRows.value.indexOf(target)+1));
            if(rows.length>1){
              let tmp = formLineRows.value.slice();
              const extra = rows.slice(1).map((m,i)=>{
                const ln = nextErpLineNo(tmp);
                const line = makeLine(m, tmp.length+1, ln);
                tmp = tmp.concat([line]);
                return line;
              });
              formLineRows.value = formLineRows.value.concat(extra);
            }
          } else {
            let tmp = formLineRows.value.slice();
            formLineRows.value = tmp.concat(rows.map((m,i)=>{
              const ln = nextErpLineNo(tmp);
              const line = makeLine(m, tmp.length+1, ln);
              tmp = tmp.concat([line]);
              return line;
            }));
          }
          pickerVisible.value=false;
          ElMessage.success('已选择 '+rows.length+' 条物料');
        } else if(pageId.value==='qc-ledger'){
          formModel['物料信息'] = matInfoText(row);
          ElMessage.success('已选择物料：'+formModel['物料信息']);
        } else if(false /*lg-order removed*/ || pageId.value==='lg-dispatch' || pageId.value==='lg-ship'){
          const rows = (pageId.value==='lg-dispatch' && (pickerSelected.value||[]).length) ? pickerSelected.value : (row ? [row] : []);
          if(!rows.length){ ElMessage.warning('请至少选择一条物料'); return; }
          const used = new Set((formLineRows.value||[]).map(r=> codeOf(r['物料信息'])));
          let n = 0;
          rows.forEach(m=>{
            const info = matInfoText(m);
            const code = codeOf(info);
            if(pageId.value==='lg-dispatch' && code && used.has(code)) return;
            if(code) used.add(code);
            const unit = m.单位 || matUnit(m, pageId.value==='lg-ship' ? 'so' : 'po');
            const empty = pageId.value==='lg-ship' ? formLineRows.value.find(r=> !r['物料信息']) : null;
            if(empty){
              empty['物料信息'] = info;
              empty['单位'] = unit;
              empty['体积(长*宽*高)'] = empty['体积(长*宽*高)'] || '';
            } else {
              const line = {
                _i: formLineRows.value.length+1,
                行号: pageId.value==='lg-dispatch' ? nextErpLineNo(formLineRows.value) : String(formLineRows.value.length+1),
                物料信息: info,
                单位: unit,
                '体积(长*宽*高)': '',
                行备注: ''
              };
              if(pageId.value==='lg-dispatch') line['需求数量'] = '';
              if(pageId.value==='lg-ship') line['发货数量'] = '';
              formLineRows.value = formLineRows.value.concat([line]);
            }
            n++;
          });
          pickerVisible.value=false;
          ElMessage.success(n ? ('已选择物料 ' + n + ' 条') : '所选物料均已在明细中');
          return;
        } else if(isPoNoticePage()){
          const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
          if(!rows.length){ ElMessage.warning('请至少选择一条物料'); return; }
          const addMats = [];
          let skippedTank = 0;
          if(pageId.value==='wh-po-in' || pageId.value==='wh-po-ret'){
            rows.forEach(m=>{
              const code = m.编码 || codeOf(m['物料信息']||m);
              if(!code) return;
              const pool = (poMatPool.value||[]).find(p=> (p.编码||codeOf(p['物料信息']))===code) || m;
              if(pageId.value==='wh-po-ret' && isPoRetTankMat(pool)){ skippedTank++; return; }
              addMats.push(pool);
            });
            if(!addMats.length){
              ElMessage.warning(skippedTank ? '储罐类液体物料不支持采购退料' : '请选择有效物料');
              return;
            }
          } else {
            const used = new Set((formLineRows.value||[]).map(r=> codeOf(r['物料信息'])));
            rows.forEach(m=>{
              const code = m.编码 || codeOf(m['物料信息']||m);
              if(!code || used.has(code)) return;
              const pool = (poMatPool.value||[]).find(p=> (p.编码||codeOf(p['物料信息']))===code) || m;
              used.add(code);
              addMats.push(pool);
            });
            if(!addMats.length){
              ElMessage.warning('所选物料均已在明细中，或非当前订单物料');
              return;
            }
          }
          const built = buildPoInFormLines(addMats, formModel['供应商名称']);
          const base = formLineRows.value.length;
          const lines = pageId.value==='wh-po-ret'
            ? ensureLineNos(built.map((ln,i)=> normalizePoRetFormLine(ln, base + i + 1)))
            : ensureLineNos(built.map((ln,i)=>({ ...ln, _i: base + i + 1 })));
          const noticeCtx = { 关联发货单: formModel['关联发货单'], 关联采购订单: formModel['关联采购订单'] };
          formLineRows.value = (pageId.value==='wh-po-in' || pageId.value==='wh-po-ret')
            ? finalizeNoticeFormLines(formLineRows.value.concat(lines))
            : formLineRows.value.concat(lines);
          pickerVisible.value=false;
          ElMessage.success('已追加订单内物料 '+addMats.length+' 行' + (skippedTank ? '（已跳过储罐类）' : ''));
          return;
        } else if(isOsFinishedNoticePage()){
          const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
          if(!rows.length){ ElMessage.warning('请至少选择一条物料'); return; }
          const addMats = [];
          rows.forEach(m=>{
            const code = m.编码 || codeOf(m['物料信息']||m);
            if(!code) return;
            const pool = (poMatPool.value||[]).find(p=> (p.编码||codeOf(p['物料信息']))===code) || m;
            addMats.push(pool);
          });
          if(!addMats.length){ ElMessage.warning('请选择有效物料'); return; }
          const built = buildOsNoticeFormLines(addMats, formModel['供应商名称']);
          const base = formLineRows.value.length;
          const lines = built.map((ln,i)=> ({ ...ln, _i: base + i + 1 }));
          formLineRows.value = finalizeNoticeFormLines(formLineRows.value.concat(lines));
          pickerVisible.value=false;
          ElMessage.success('已追加订单内物料 '+addMats.length+' 行');
          return;
        } else {
          const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
          if(!rows.length){ ElMessage.warning('请至少选择一条物料'); return; }
          const today = todayYmdLocal();
          const vendor = formModel['客户名称'] || formModel['供应商名称'] || '';
          const makeLine = (m, idx)=>{
            const info = matInfoText(m);
            const mr = matListRow(codeOf(info) || m.编码 || m['物料编码']);
            const mode = String((mr && mr['管理方式']) || m['管理方式'] || '条码管理');
            const isCount = /计数|罐区/.test(mode);
            const line = {
              _i: idx,
              行状态: '待执行',
              物料信息: info,
              批号: '',
              库存单位: m.单位 || m.库存单位 || matUnit(m) || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
              管理方式: mode,
              计划件数: isCount ? '—' : '',
              计划数量: '',
              备注: ''
            };
            if(isCsWhPage()){
              if(isCsRecvPage()){
                line['批号'] = today.replace(/-/g,'') + String(idx).padStart(3,'0');
                line['生产日期'] = today;
                line['有效期'] = String((mr && mr['有效期']) || '12');
                line['生产厂家'] = vendor;
              }
              line['已完成数量'] = '0.000';
              line['未完成数量'] = '0.000';
            }
            if(pageId.value==='wh-os-recv'){
              line['批号'] = today.replace(/-/g,'') + String(idx).padStart(3,'0');
              line['生产日期'] = today;
              line['有效期'] = String((mr && mr['有效期']) || '12');
              line['生产厂家'] = vendor;
              line['已完成数量'] = '0.00';
              line['未完成数量'] = '0.000';
            }
            if(pageId.value==='wh-os-ret-goods'){
              line['已完成数量'] = '0.00';
              line['未完成数量'] = '0.000';
            }
            return line;
          };
          const target = pickerLineRow.value;
          if(target){
            Object.assign(target, makeLine(rows[0], target._i || formLineRows.value.indexOf(target)+1));
            if(rows.length>1){
              formLineRows.value = formLineRows.value.concat(rows.slice(1).map((m,i)=> makeLine(m, formLineRows.value.length+i+1)));
            }
          } else {
            formLineRows.value = formLineRows.value.concat(rows.map((m,i)=> makeLine(m, formLineRows.value.length+i+1)));
          }
          if(isOsFinishedNoticePage()) formLineRows.value = finalizeNoticeFormLines(formLineRows.value);
          if(pageId.value==='wh-prod-in') formLineRows.value = finalizeNoticeFormLines(formLineRows.value);
          pickerVisible.value=false;
          ElMessage.success('已添加物料 '+rows.length+' 条');
        }
      } else if(t.includes('关联单号') && isLoadPage()){
        const meta = row._loadBizMeta || loadWhBizMeta(formModel['关联仓库业务']);
        applyLoadSrcNotice(row, meta);
        ElMessage.success('已选择关联单号并带入客供、运力与物料明细：'+formModel['关联单号']);
      } else if(t.includes('关联单号')){
        formModel['关联单号'] = row.编码 || label;
        ElMessage.success('已选择关联单号：'+formModel['关联单号']);
      } else if(t==='拣货流水码'){
        const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
        if(!rows.length){ ElMessage.warning('请至少选择一条流水码'); return; }
        const need = Math.max(0, Number((detailRow.value||{})['备货数量']||0) - Number((detailRow.value||{})['已备数量']||0));
        const addQty = rows.reduce((s,r)=> s + (Number(r.当前数量)||0), 0);
        const prepNo = (detailRow.value||{})['备货通知单号'] || '';
        const doAppend = ()=>{
          const added = rows.map((r,i)=> mapArchToPrepPickLine(r, 'pick-' + Date.now() + '-' + i + '-' + (r.编码||'')));
          detailLineRows.value = detailLineRows.value.concat(added);
          added.forEach(ln=> lockPrepSerialArch(ln['条码号'], prepNo));
          syncPrepPickQty();
          pickerVisible.value = false;
          ElMessage.success('已选入 '+added.length+' 条流水码');
        };
        if(need>0 && addQty>=need){
          ElementPlus.ElMessageBox.confirm('已选数量已达到或超过计划备货量，确认继续追加？','超额预警',{
            confirmButtonText:'确认', cancelButtonText:'取消', type:'warning'
          }).then(()=> doAppend()).catch(()=>{});
          return;
        }
        doAppend();
        return;
      } else if(t==='包材档案' && pageId.value==='outer-serial'){
        const rows = (pickerSelected.value||[]).length ? pickerSelected.value : (row ? [row] : []);
        if(!rows.length){ ElMessage.warning('请至少选择一条包材档案'); return; }
        const mats = [...new Set(rows.map(r=> codeOf(r['物料信息']||r.物料信息)).filter(Boolean))];
        const locs = [...new Set(rows.map(r=> serialLocOf(r)).filter(Boolean))];
        if(mats.length>1){ ElMessage.error('外包材仅允许绑定相同物料的流水码，请重新选择'); return; }
        if(locs.length>1){ ElMessage.error('所选包材库存位置不一致，请重新选择'); return; }
        const anchor = outerBindAnchor();
        if(anchor.mat && mats[0] && mats[0]!==anchor.mat){
          ElMessage.error('须与已绑定包材物料编码一致，请重新选择'); return;
        }
        if(anchor.loc && locs[0] && locs[0]!==anchor.loc){
          ElMessage.error('须与已绑定包材库存位置一致，请重新选择'); return;
        }
        const now = new Date();
        const pad = n=> String(n).padStart(2,'0');
        const ts = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+' '+pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
        const added = rows.map(r=>{
          const bc = r['条码号'] || r.编码 || '';
          return {
            包材编号: bc,
            档案类型: '流水码',
            包材类型: r['包装规格'] || '吨袋',
            库存位置: serialLocOf(r) || locs[0] || '—',
            使用状态: r['使用状态'] || '在用',
            物料信息: r['物料信息'] || matInfoText(r),
            物料批号: r['物料批号'] || r.名称 || '—',
            当前数量: String(r['当前数量'] || '1'),
            库存单位: r['库存单位'] || 'KG',
            绑定时间: ts
          };
        });
        detailLineRows.value = (detailLineRows.value||[]).concat(added);
        const mock = (MOCK['outer-serial'] = MOCK['outer-serial'] || {});
        mock.detailLines = (detailLineRows.value||[]).map(r=>({...r}));
        const head = detailRow.value;
        if(head){
          head['绑定状态'] = '已绑定';
          if(mats[0]) head['物料信息'] = added[0]['物料信息'];
          if(locs[0] || added[0]['库存位置']) head['库存位置'] = locs[0] || added[0]['库存位置'];
          const codes = (detailLineRows.value||[]).map(r=> r['包材编号']).filter(Boolean);
          head['当前绑定包材'] = codes.join('、') || '—';
          head['绑定时间'] = ts;
          const archMain = ((MOCK['serial-arch']||{}).main)||[];
          codes.forEach(bc=>{
            const arch = archMain.find(x=> x['条码号']===bc);
            if(arch){
              arch['绑定状态'] = '已绑定';
              arch['当前绑定外包材'] = head['条码号'] || '—';
            }
          });
        }
        pickerVisible.value=false;
        ElMessage.success('已新增绑定明细 '+added.length+' 行');
        return;
      } else if(t==='批号' || t.includes('流水码档案')){
        const lot = row.物料批号 || row.名称 || '';
        const target = pickerLineRow.value;
        if(target){
          target['批号'] = lot;
          if(pageId.value==='wh-so-ret'){
            const bc = row.编码 || row['条码号'] || '';
            if(bc) target['_退货流水码'] = bc;
          }
          if(!target['物料信息'] && (row.物料信息 || row.规格)){
            target['物料信息'] = row.物料信息 || row.规格;
            target['库存单位'] = row.库存单位 || matUnit(row);
            target['管理方式'] = target['管理方式'] || '条码管理';
          }
        } else {
          formLineRows.value = formLineRows.value.concat([{
            _i: formLineRows.value.length+1,
            物料信息: row.物料信息 || '',
            批号: lot,
            库存单位: row.库存单位 || matUnit(row),
            管理方式: '条码管理',
            计划件数: '10',
            计划数量: '100'
          }]);
        }
        ElMessage.success('已选择批号：'+lot);
      } else if(t==='条码号' && pageId.value==='bc-unfreeze' && pickerLineRow.value){
        const target = pickerLineRow.value;
        fillBcUnfreezeLineFromHit(target, row);
        ElMessage.success('已选择冻结中条码：' + (row['条码号'] || row.编码 || ''));
      } else if(t==='条码号' && pageId.value==='bc-serial-split'){
        const bc = row.编码 || row['条码号'] || '';
        const arch = ((MOCK['serial-arch']||{}).main||[]).find(r=> r['条码号']===bc) || row;
        const remain = String(arch['当前数量'] || arch['剩余数量'] || '0');
        formModel['条码号'] = bc;
        formModel._splitRemainBase = remain;
        formLineRows.value = [serialArchParentRow(arch, bc)];
        formBarcodeRows.value = [];
        formBarcodeSelected.value = [];
        syncSerialSplitRemain();
        ElMessage.success('已选择原流水码：'+bc);
      } else if(t==='条码号（主条码）' && pageId.value==='bc-serial-merge'){
        const bc = row.编码 || row['条码号'] || '';
        const arch = ((MOCK['serial-arch']||{}).main||[]).find(r=> r['条码号']===bc) || row;
        const remain = String(arch['当前数量'] || arch['剩余数量'] || '0');
        formModel['条码号（主条码）'] = bc;
        formModel._mergeMainBase = remain;
        formLineRows.value = [serialArchParentRow(arch, bc)];
        formBarcodeRows.value = [];
        formBarcodeSelected.value = [];
        syncSerialMergeRemain();
        ElMessage.success('已选择主流水码：'+bc);
      } else if(t==='添加条码' && pageId.value==='bc-serial-merge'){
        const bc = row.编码 || row['条码号'] || '';
        const arch = ((MOCK['serial-arch']||{}).main||[]).find(r=> r['条码号']===bc) || row;
        if(!serialMergeCompatible(formLineRows.value[0], arch)){
          ElMessage.warning('待合并流水码物料信息、库存状态、物料批号须与主条码一致'); return;
        }
        formBarcodeRows.value = formBarcodeRows.value.concat([{
          _i: formBarcodeRows.value.length + 1,
          条码号: bc,
          库存单位: arch['库存单位'] || '—',
          剩余数量: String(arch['当前数量'] || arch['剩余数量'] || '0')
        }]);
        syncSerialMergeRemain();
        ElMessage.success('已添加待合并流水码：'+bc);
      } else if(t==='领至线边仓' || t==='来源线边仓'){
        const code = row.编码 || row['库位编码'] || '';
        const nameRaw = String(row.名称 || row['库位名称'] || '');
        const label = nameRaw.includes(' / ') ? nameRaw : ((code && nameRaw) ? (code + ' / ' + nameRaw) : (code || nameRaw));
        formModel[t] = label;
        ElMessage.success('已选择'+t+'：'+label);
      } else if(t==='生产领料出库单'){
        const no = row.编码 || row.出库单号 || '';
        formModel['生产领料出库单'] = no;
        const ship = ((MOCK['wh-prod-issue']||{}).tab2||[]).find(r=> r['出库单号']===no) || {};
        const flows = ((MOCK['wh-prod-issue']||{}).tab3||[]).filter(r=> r['出库单号']===no);
        const src = flows.length ? flows : (ship['物料信息'] ? [ship] : []);
        // 带来源线边仓：优先流水/出库单上的领至线边仓，再回查申请单
        let lb = flows.find(f=> f['领至线边仓'])?.['领至线边仓'] || '';
        if(!lb){
          const applyNo = ship['关联领料申请单号'] || '';
          const apply = ((MOCK['wh-prod-issue']||{}).tab1||[]).find(r=> r['单号']===applyNo);
          lb = (apply && apply['领至线边仓']) || 'XBC001 - 1号车间线边仓';
        }
        formModel['来源线边仓'] = lb;
        formLineRows.value = src.map((fl,i)=>{
          const matInfo = fl['物料信息'] || '';
          const mr = matListRow(codeOf(matInfo));
          const mode = String((mr && mr['管理方式']) || fl['管理方式'] || '条码管理');
          const isCount = mode.includes('计数');
          let lot = '';
          if(isCount) lot = (countWhLotOptions({ 物料信息: matInfo })[0]) || '';
          else lot = outboundLotOf(no, matInfo) || (fl['物料批号']||'');
          return {
            _i: i+1,
            物料信息: matInfo,
            批号: lot,
            库存单位: fl['库存单位'] || ship['库存单位'] || matUnit(matInfo),
            管理方式: mode,
            计划件数: isCount ? '—' : (fl['已完成件数'] || ship['已完成件数'] || ''),
            计划数量: fl['已完成数量'] || fl['总数量'] || ship['已完成数量'] || '',
            备注: ''
          };
        });
        ElMessage.success('已选择生产领料出库单并带入物料与来源线边仓：'+no);
      } else {
        formModel[t] = label;
        ElMessage.success('已选择：'+label);
      }
      pickerVisible.value=false;
      pickerLineRow.value=null;
    }
