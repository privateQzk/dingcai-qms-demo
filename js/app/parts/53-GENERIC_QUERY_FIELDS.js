    const GENERIC_QUERY_FIELDS = {"mat-uom":["物料种类","换算单位"],"workshop":["车间编码","车间名称","启用状态"],"prod-line":["产线编码","产线名称","所属车间","启用状态"],"insp-person":["人员姓名","所属检验班组","负责检验类","员工状态"],"samp-point":["采样点编码","采样点名称","启用状态"],"insp-method":["检验方法编码","检验方法名称","启用状态","参数编码","参数名称","参数属性","参数代号"],"insp-project":["检验项编码","检验项名称","检验项类型","所属检验类","启用状态"],"insp-scheme":["检验方案编码","检验方案名称","启用状态"],"samp-scheme":["抽样方案编码","抽样方案名称","抽样类型","启用状态"],"auto-samp":["登样方案编码","登样方案名称","启用状态","循环方式","执行条件"],"item-uom":["检验项单位1编码","检验项单位1","检验项单位2"],"np-0103-13":["库位编码","库位名称","库位类型","启用状态","去向编码","去向名称"],"spc-rule":["规则名称","规则依据"],"rule-auth-insp":["判异规则授权编码","判异规则授权名称","启用状态"],"spc-scheme-insp":["SPC查询方案编码","SPC查询方案名称","启用状态"],"reagent":["试剂编码","试剂名称","试剂种类","启用状态","试剂规格","品牌"],"solution":["试液编码","试液名称","试液种类","启用状态","试液规格"],"ref-material":["标准物质编码","标准物质名称","标准物质种类","启用状态","标准物质规格"],"retain-sample":["留样编码","留样名称","留样种类","启用状态","留样规格"],"consumable":["耗材编码","耗材名称","耗材种类","启用状态","耗材规格"],"reagent-arch":["条码号","试剂编码","试剂名称","批号","试剂种类","供应商名称","生产日期","库存位置"],"solution-arch":["条码号","试液编码","试液名称","批号","试液种类","供应商名称","生产日期","库存位置"],"ref-material-arch":["条码号","标准物质编码","标准物质名称","批号","标准物质种类","供应商名称","生产日期","开封状态","库存位置"],"consumable-arch":["条码号","耗材编码","耗材名称","批号","耗材种类","供应商名称","生产日期","库存位置"],"retain-sample-arch":["条码号","留样编码","留样名称","批号","留样种类","供应商名称","留样日期","是否玻璃片"],"lab-io-form":["模板编码","模板名称","适用业务单据","启用状态","表单名称"],"opc-point":["同步状态","点位名称","采集平台","备注","启用状态"],"gather-item":["采集项编码","采集项名称","采集方式","启用状态"],"gather-scheme":["采集方案编码","采集方案名称","启用状态"],"np-0501-01":["采集状态","过程监测编码","过程监测名称"],"np-0502-01":["监测结论","过程监测名称","采集项名称","偏差结论","创建方式"],"np-0601-01":["事件类型","来源批号","产出批号","来源物料名称","创建方式"],"tag-data-source":["字段名","字段描述"],"tag-config":["启用状态"],"print-task":["任务ID","模板名称","打印状态"],"form-data-source":["字段名","字段描述"],"form-setting":["表单编码","表单名称"],"np-0201-01":["单据状态","放行单号","报检单类型","报检单号","物料编码","物料名称"],"np-0201-02":["单据状态","委托单号","报检单类型","报检单号","样品编号","委托组织"],"insp-order":["单据状态","复核结论","报检单号","报检部门","报检时间"],"add-sample":["报检单类型","报检单号","物料编码","物料名称"],"wait-samp":["报检单号","采样点","报检批号"],"np-0201-11":["样品编号","报检单号","报检类型","样品状态","母样编号","样品来源","物料信息","报检批号","取样时间"],"np-0201-12":["样品编号","母样编号","报检单号","报检类型","样品状态","当前位置","物料信息","报检批号","取样时间","处置方式","处置时间","变更类型","新位置","操作人","操作时间"],"ledger":["样品状态","检验结论","样品编号","报检单号","取样时间"],"entry-sample":["样品编号","报检单号","采样点","检验方案"],"entry-category":["样品编号","报检单号","采样点","仪器信息"],"my-task":["报检单类型","样品编号","报检单号","采样点","委托单号","仪器信息"],"recheck":["报检单号","物料编码","采样点","研发项目号","来样单位"],"spectrogram":["文件编号","文件名称","样本流水号","样本编号"],"spec-recog":["文件编号","文件名称","类型","上传人"],"unqual-pi":["处置单号","检验结论","MRB状态","处置方式"],"unqual-pp":["处置单号","检验结论","MRB状态","处置方式"],"unqual-pm":["处置单号","检验结论","MRB状态","处置方式"],"mrb-review":["MRB单号","来源处置类型","物料编码","来源处置单号","处置方式"],"dev-pi":["偏差结论","处置单号","物料编码"],"dev-pp":["偏差结论","处置单号","物料编码"],"dev-pm":["偏差结论","处置单号","物料编码"],"np-0212-02":["客诉单号"],"np-0212-03":["退货单号"],"capa-internal":["整改单号","整改状态","事件类型","物料编码","来源单号","计划整改完成日期","创建时间"],"capa-handle":["整改单号","事件类型","来源单号","物料编码","物料名称","物料种类","客户编码","客户名称","批号","问题大类","问题小类","计划整改完成日期","创建时间"],"spc-report-ledger":["报告名称","供应商信息","客户信息"],"qr-datasource":["字段名","字段描述"],"qr-special":["字段名称","字段类型"],"qr-template":["文件类型"],"qr-config":["报告模板名称","模板文件名称","启用状态","创建时间"],"qr-issue":["开具单号","来源单号","客户名称","物料名称","创建时间"],"cl-change":["变更单号","检验方案名称","计算指标","创建人","创建时间"],"cl-record":["记录编号","业务类型","检验方案","检验项","创建人","物料信息","采样点","供应商信息","客户信息","来源","方案编码","创建时间","单位"]};
    const GENERIC_QUERY_ALIAS = { '仪器信息': ['检验仪器', '分析仪器', '仪器名称', '仪器编码'] };
    function genericQueryKey(list, name){
      const cands = [name, name+'名称', name.replace(/(编码|名称)$/, '信息'), name.replace(/信息$/, '名称'), name.replace(/信息$/, '编码'), ...((GENERIC_QUERY_ALIAS[name])||[])];
      return cands.find(k=> list.some(r=> r && Object.prototype.hasOwnProperty.call(r, k))) || '';
    }
    function applyGenericQuery(list){
      if((pageId.value==='insp-order' || pageId.value==='ledger') && hiddenOrderNos.value.size){
        list = list.filter(r=> !hiddenOrderNos.value.has(String(r['报检单号']||'')));
      }
      const names = GENERIC_QUERY_FIELDS[pageId.value];
      if(!names || !list.length) return list;
      (tabView.value.queryFields||[]).forEach(f=>{
        if(!names.includes(f.name)) return;
        const v = query[f.name];
        if(qcEmpty(v)) return;
        const key = genericQueryKey(list, f.name);
        if(!key) return;
        const day = x=> String(x==null ? '' : x).slice(0, 10);
        if(/range/.test(f.type||'')){
          if(!Array.isArray(v) || v.length!==2) return;
          list = list.filter(r=> day(r[key])>=day(v[0]) && day(r[key])<=day(v[1]));
          return;
        }
        if(f.type==='date'){ list = list.filter(r=> day(r[key])===day(v)); return; }
        const want = Array.isArray(v) ? v.map(String) : (f.type==='picker' ? String(v).split(' / ').slice(0, 2) : splitDun(v));
        const exact = f.type==='select';
        list = list.filter(r=>{
          const cell = String(r[key]==null ? '' : r[key]);
          return want.some(x=> exact ? (cell===x || splitDun(cell).includes(x)) : cell.includes(x));
        });
      });
      return list;
    }
    const canMergeShip = computed(()=>{
      if(pageId.value!=='lg-ship' || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['状态']==='待调度');
    });
    const canCloseShip = computed(()=>{
      if(pageId.value!=='lg-ship' || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['状态']==='待调度');
    });
    const canCloseDispatch = computed(()=>{
      if(pageId.value!=='lg-dispatch' || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['状态']==='待执行' || r['状态']==='执行中');
    });
    const canCloseWaybill = computed(()=>{
      if(pageId.value!=='lg-waybill' || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['状态']==='待派车' || r['状态']==='待运输');
    });
    const canCloseInspPlan = computed(()=>{
      if((pageId.value!=='wh-insp-plan' && pageId.value!==LAB_INSP_PLAN && !isDjPlanPage()) || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['计划状态']==='待执行' || r['计划状态']==='执行中');
    });
    const canCloseLabCountScan = computed(()=>{
      if(!isLabCountPage() || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['状态']==='待执行' || r['状态']==='执行中');
    });
    const canCloseLabRgIo = computed(()=>{
      if(!isLabRgIoPage() || activeTab.value!=='tab-1' || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['单据状态']==='待执行' || r['单据状态']==='执行中');
    });
    const canSettleWaybill = computed(()=>{
      if(pageId.value!=='lg-waybill' || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['结算状态']==='待结算');
    });
    const totalSettleQty = computed(()=>{
      const n = settleRows.value.reduce((s,r)=> s + parseSettleQty(r['总数量']), 0);
      const u = String(settleRows.value[0]?.['总数量']||'').replace(/[\d.\s]/g,'');
      return n.toFixed(2) + (u ? ' ' + u : '');
    });
    const totalSettleFee = computed(()=> settleRows.value.reduce((s,r)=> s + Number(r._price||0) + Number(r._extra||0), 0));
    const canDeleteKpiPlan = computed(()=>{
      if(pageId.value!=='lg-kpi-plan' || !selectedIds.value.length) return false;
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      return rows.length>0 && rows.every(r=> r['复核状态']==='置空');
    });
    const kpiVendorRows = computed(()=> (detailRow.value && Array.isArray(detailRow.value._vendors)) ? detailRow.value._vendors : []);
    const kpiVendorCols = computed(()=>{
      const skip = new Set(['供应商名称','总得分','评定结果','考评说明','备注','_scores']);
      const keys = [];
      kpiVendorRows.value.forEach(r=>{
        Object.keys(r||{}).forEach(k=>{
          if(!skip.has(k) && !k.startsWith('_') && !keys.includes(k)) keys.push(k);
        });
      });
      return keys;
    });
    const kpiScoreTotal = computed(()=>{
      let s = 0;
      (kpiScoreProjects.value||[]).forEach(p=>{
        (p._indicators||[]).forEach(i=>{ s += Number(i['得分']||0); });
      });
      return s;
    });
    const kpiScoreGrade = computed(()=> kpiGradeOf(kpiScoreTotal.value, kpiCfgRow.value || detailRow.value));
    const kpiFlowStamp = computed(()=>{
      const st = kpiFlowRow.value?.['审核状态'] || '';
      if(st==='审核通过') return '已通过';
      if(st==='审核驳回') return '已驳回';
      if(st==='审核中') return '审核中';
      return st || '—';
    });
    const kpiFlowStampClass = computed(()=>{
      const s = kpiFlowStamp.value;
      if(s==='已通过') return 'is-ok';
      if(s==='已驳回') return 'is-no';
      return 'is-ing';
    });
    const assignCarriers = computed(()=> ((MOCK.carrier||{}).main||[]).filter(c=> c['启用状态']==='启用').map(c=> c['承运商名称']));
    const assignVehicles = computed(()=>{
      const carrier = assignForm.承运商名称;
      if(!carrier) return [];
      return ((MOCK.vehicle||{}).main||[]).filter(v=> v['启用状态']==='启用' && v['所属承运商']===carrier);
    });
    const assignTrailers = computed(()=>{
      const carrier = assignForm.承运商名称;
      if(!carrier) return [];
      const names = [];
      ((MOCK.vehicle||{}).main||[]).forEach(v=>{
        if(v['启用状态']!=='启用' || v['所属承运商']!==carrier) return;
        ['车挂号','挂车号'].forEach(k=>{
          const t = String(v[k]||'').trim();
          if(t && t!=='—' && !names.includes(t)) names.push(t);
        });
      });
      return names;
    });

    const pagedData = computed(()=>{
      const s=(pageNum.value-1)*pageSize.value;
      return tableData.value.slice(s,s+pageSize.value);
    });

    const vxeColumns = computed(()=>{
      if(pageId.value===MATRIX_PAGE){ storeTick.value; return matrixColumns(); }
      if(pageId.value===QUALITY_PAGE){ storeTick.value; return qualityColumns(); }
      const sampleRows = tableData.value || [];
      const cols = [
        { type:'checkbox', width:48, fixed:'left' },
        { type:'seq', title:'序号', width:72, minWidth:72, fixed:'left' },
      ];
      // 全站列表：数据列只设 minWidth（不锁死 width/maxWidth），表格铺满容器，列少不挤左侧、列多可横滚
      const pushCol = (col)=>{
        if(!col.fixed && col.type!=='checkbox' && col.type!=='seq' && col.field!=='_actions' && !(col.slots&&col.slots.default==='row_actions')){
          const minW = col.minWidth || col.width || 100;
          const next = { field:col.field, title:col.title, minWidth:minW };
          if(col.slots) next.slots = col.slots;
          if(col.tip) next.tip = col.tip;
          if(col.noTooltip) next.noTooltip = true;
          cols.push(next);
          return;
        }
        cols.push(col);
      };
      let srcCols = pageId.value===INST_PAGE ? instColumns() : (tabView.value.columns||[]);
      if(page.value?.layout==='spc-chart'){
        const chartMap = (tabView.value||{}).chartColumns || {};
        const chartKey = activeChartTab.value || (page.value.chartTabs||[])[0] || '';
        const allow = chartMap[chartKey];
        if(Array.isArray(allow) && allow.length){
          const allowSet = new Set(allow);
          srcCols = srcCols.filter(c=>{
            const key = c.field||c.title||c.name;
            if(c.field==='_actions' || c.slot==='row_actions' || c.title==='操作') return allowSet.has('操作') || allowSet.has(key);
            return allowSet.has(key);
          });
        }
      }
      for(const c of srcCols){
        if(Array.isArray(c.children)){
          cols.push({ title:c.title, children:c.children.map(ch=> Object.assign({}, ch, {
            minWidth: Math.max(ch.minWidth||0, fitColWidth(ch.field, ch.title, sampleRows)),
          })) });
        } else if(c.field==='_actions' || c.slot==='row_actions' || c.title==='操作'){
          const allOps = tabView.value.rowOps || [];
          const opsW = (ops)=> ops.reduce((w, op)=>{
            let t = 0;
            for(const ch of String(op.name||'')) t += ch.charCodeAt(0) > 255 ? 14 : 8;
            return w + t + 24;
          }, 0) - (ops.length ? 16 : 0);
          let need = 0;
          const rowsForOps = sampleRows.length ? sampleRows.slice(0, 200) : [null];
          for(const r of rowsForOps){
            const w = opsW(r ? visibleRowOps(r) : allOps);
            if(w > need) need = w;
          }
          const actW = Math.max(c.width||150, Math.ceil(need + 40));
          cols.push({
            field: '_actions',
            title: c.title||'操作',
            width: actW,
            minWidth: actW,
            fixed: 'right',
            slots: { default: 'row_actions' },
          });
        } else if(c.slot==='spi_abn'){
          pushCol({ field:c.field, title:c.title, width:110, minWidth:110, slots:{ default:'spi_abn' } });
        } else if(c.slot==='arrow_detail' || c.field==='分配明细' || c.field==='反馈明细'){
          const fitW = Math.max(c.width||0, fitColWidth(c.field, c.title, sampleRows));
          pushCol({ field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:Math.max(fitW, colMaxWidth(c.title||c.field)), noTooltip:true, slots:{ default:'arrow_detail' } });
        } else if(pageId.value==='ledger' && (c.field==='偏差结论' || c.field==='异常描述')){
          const abn = c.field==='异常描述';
          const w = abn ? 180 : 100;
          pushCol({ field:c.field, title:c.title, width:w, minWidth:w, noTooltip:true, slots:{ default: abn ? 'ledger_abn' : 'ledger_dev' } });
        } else if(c.slot==='tag' || isStatusTagField(c.field || c.title || c.name)){
          const fitW = Math.max(c.width||0, fitColWidth(c.field, c.title, sampleRows)) + (c.tip ? 28 : 0);
          pushCol({ field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:Math.max(fitW, colMaxWidth(c.title||c.field)), fixed:c.fixed||null, tip:c.tip||'', slots:{ default:'tag' } });
        } else if(c.slot==='uom_ratio'){
          const fitW = fitColWidth(c.field, c.title, sampleRows.map(r => Object.assign({}, r, { [c.field]: formatMatUomRatioDisplay(r[c.field]) })));
          pushCol({ field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:colMaxWidth(c.title||c.field), slots:{ default:'uom_ratio' } });
        } else if(c.slot==='link'){
          const fitW = fitColWidth(c.field, c.title, sampleRows);
          pushCol({ field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:colMaxWidth(c.title||c.field), slots:{ default:'link' } });
        } else if(c.slot==='chrom_model'){
          // 色谱柱型号：单元格两行（型号 + 该型号台账统计），按配置宽度锁定，避免挤压相邻列
          const w = Number(c.width) || 150;
          pushCol({ field:c.field, title:c.title, width:w, minWidth:w, maxWidth:Math.max(w, colMaxWidth(c.title||c.field)), fixed:c.fixed||null, slots:{ default:'chrom_model' } });
        } else if(c.slot==='files'){
          const fitW = Math.max(c.width||0, fitColWidth(c.field, c.title, sampleRows));
          pushCol({ field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:Math.max(fitW, colMaxWidth(c.title||c.field)), slots:{ default:'files' } });
        } else if(c.slot==='prod_pick_lots'){
          const labeled = sampleRows.map(r => Object.assign({}, r, { [c.field]: formatProdPickLotsText(r) }));
          const fitW = Math.min(colMaxWidth(c.title||c.field), Math.max(c.width||220, fitColWidth(c.field, c.title, labeled)));
          pushCol({ field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:colMaxWidth(c.title||c.field), slots:{ default:'prod_pick_lots' } });
        } else if(c.slot==='idmask' || c.field==='司机身份证号' || c.field==='押运员身份证号'){
          const fitW = Math.min(colMaxWidth(c.title||c.field), Math.max(170, fitColWidth(c.field, c.title, sampleRows)));
          pushCol({ field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:colMaxWidth(c.title||c.field), slots:{ default:'idmask' } });
        } else if(c.slot==='addr_info'){
          const fitW = fitColWidth(c.field, c.title, sampleRows);
          pushCol({ field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:colMaxWidth(c.title||c.field), slots:{ default:'addr_info' } });
        } else {
          const fitW = Math.max(c.minWidth||0, fitColWidth(c.field, c.title, sampleRows));
          const col = { field:c.field, title:c.title, width:fitW, minWidth:fitW, maxWidth:Math.max(fitW, colMaxWidth(c.title||c.field)) };
          if(c.fixed==='left' || c.fixed==='right') col.fixed = c.fixed;
          pushCol(col);
          if(isChromLedgerPage() && c.field==='批号'){
            // 每个典型保留时间一列；表头两行：上行＝典型保留时间，下行＝对应定性结构
            const rtColW = chromLedgerDim.value === CHROM_LEDGER_DIM_PAIRS ? 210 : 132;
            (chromLedgerRtList()||[]).forEach(rt=>{
              cols.push({ field:'_rt_'+rt, title: rt, width:rtColW, minWidth:rtColW - 12, slots:{ header:'rt_head', default:'rt_cell' } });
            });
          }
        }
      }
      return cols;
    });

    function resetQueryModel(){
      Object.keys(query).forEach(k=> delete query[k]);
      (tabView.value.queryFields||[]).forEach(f=>{ query[f.name] = f.multiple ? [] : ''; });
    }

    function loadPage(id){
      pageId.value = id;
      activeMenu.value = id;
      msaFrameSrc.value = MSA_FRAME[id] || '';
      const p = CFG.pages[id];
      if(p?.tabs?.length){
        activeTab.value = p.tabs[0].name;
      } else if(p?.tabViews?.length){
        activeTab.value = p.tabViews[0].name;
      } else {
        activeTab.value = 'main';
      }
      queryExpanded.value=false;
      selectedIds.value=[];
      pageNum.value=1;
      dictTypeId.value='';
      dictTypeKw.value='';
      entryCategoryId.value='';
      spcProcessKw.value='';
      const tree = p?.processTree || [];
      spcProcessId.value = tree[0] || '';
      activeChartTab.value = (p?.chartTabs && p.chartTabs[0]) || '';
      if(id==='np-0503-01') envStatInit();
      if(id==='np-0602-01') batchTraceInit();
      treeListKw.value='';
      iarYearId.value = '';
      iarYearKw.value = '';
      const srcTree = p?.treeSourcePage;
      const tnodes = (srcTree && CFG.pages[srcTree] && Array.isArray(CFG.pages[srcTree].treeNodes)
        ? CFG.pages[srcTree].treeNodes
        : (p?.treeNodes || []));
      treeListId.value = tnodes[0] || '';
      resetColState();
      const envPending = envMonRelPending;
      envMonRelPending = null;
      nextTick(()=>{
        resetQueryModel();
        if(envPending && envPending.page===pageId.value && envPending.field){
          query[envPending.field] = envPending.value;
        }
      });
    }

    let cockpitMenuLive = false;
    function openQualityCockpit(){
      const url = pageId.value==='np-0702-02' ? './insp-cockpit.html?v=25' : './quality-cockpit.html?v=20';
      const win = window.open(url, 'qms-quality-cockpit');
      if(!win){
        ElMessage.warning('浏览器拦截了新窗口，请允许弹出后再打开');
        return false;
      }
      try{ win.focus(); }catch(e){}
      return true;
    }
    function onSelectMenu(index){
      if(index==='np-0702-01'){
        if(cockpitMenuLive) openQualityCockpit();
        if(pageId.value!==index) loadPage(index);
        return;
      }
      if(CFG.pages[index]){
        if([HM_LIB_PAGE, HM_IMP_PAGE, HM_EXP_PAGE, HM_VOID_PAGE, HM_BIN_PAGE, HM_CHG_PAGE].includes(index)) hmSyncLibFromImp();
        loadPage(index);
        if(index==='sigma-method') loadSigmaConfig();
      }
    }
    function onTabChange(){
      selectedIds.value=[]; pageNum.value=1; queryExpanded.value=false; entryCategoryId.value='';
      // GC/LC 台账：分类按页签独立（由规则派生），切页签清空已选分类与左栏关键字
      if(isChromLedgerPage()){ dictTypeId.value=''; dictTypeKw.value=''; }
      resetColState();
      const pending = labStockDrillPending;
      labStockDrillPending = null;
      nextTick(()=>{
        resetQueryModel();
        const labPlan = pageId.value===LAB_PREP || pageId.value===LAB_CALIB;
        if(pending && (pageId.value===LAB_STOCK_BOARD || isLabRgIoPage() || labPlan)){
          Object.assign(query, pending);
          if(isLabRgIoPage() || labPlan){
            const noKey = labPlan ? Object.keys(pending)[0] : labRgIoNoKey();
            ElMessage.success('已关联查询 '+splitDun(pending[noKey]).length+' 个'+noKey);
          } else {
            ElMessage.success('已跳转明细并按所选条件筛选');
          }
        }
      });
    }
    function onQuery(){
      pageNum.value=1;
      ElMessage.success('已按条件筛选，共 ' + (tableData.value||[]).length + ' 条');
    }
    function onResetQuery(){ resetQueryModel(); queryExpanded.value=false; pageNum.value=1; }
    function openForm(mode){
      if(pageId.value==='spc-rule' && (mode||'add')!=='edit'){
        ElMessage.warning('系统预置规则，仅支持编辑');
        return;
      }
      formMode.value = mode || 'add';
      if(pageId.value===HM_IMP_PAGE) hmEditBOnly.value = false;
      clearFormFieldTips();
      formSwitch['启用状态']=true;
      Object.keys(formModel).forEach(k=> delete formModel[k]);
      if((mode||'add')==='add' && pageId.value==='insp-order'){
        formModel['应取样件数'] = '1';
        if(activeTab.value==='tab-pi') formModel['原料类型'] = '其他';
      }
      if((mode||'add')==='add' && pageId.value===SHIFT_PAGE){
        formModel['段数'] = '1';
        formModel['段1类型'] = '工作';
      }
      if((mode||'add')==='add' && pageId.value==='np-0417-03'){ formModel['异常单号'] = nextAbnNo(); }
      poMatPool.value = [];
      const lines = (activeFormLineFields.value||[]).length;
      formLineSelected.value = [];
      if(pageId.value==='np-0502-01'){
        formLineRows.value = [];
        if((mode||'add')==='add') formModel['创建方式'] = '手动';
      }
      if(TPL_PAGES[pageId.value]) resetTplForm();
      const osPo = ['wh-os-issue','wh-os-recv','wh-os-ret-mat','wh-os-ret-goods'].includes(pageId.value);
      // 选单带入类：选订单后再带入物料行；生产领料等可先空行再新增；储罐档案新增不带物料行
      if(pageId.value==='tank-arch') formLineRows.value = [];
      else if(isWhNoticePage() || osPo || isCsWhPage()) formLineRows.value = [];
      else if(pageId.value==='wh-prod-issue' || pageId.value==='wh-prod-ret' || pageId.value==='wh-prod-in' || pageId.value==='wh-direct-xfer' || pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          const meta = prodAppMeta();
          if(meta) formModel['单据类型'] = meta.docType;
          if(pageId.value==='wh-prod-in') formModel['业务类型'] = '自产完工';
        }
      }
      else if(false /*lg-order removed*/) formLineRows.value = [];
      else if(pageId.value==='lg-waybill') formLineRows.value = [];
      else if(pageId.value==='lg-ship') formLineRows.value = [emptyShipLine(1)];
      else if(pageId.value==='lg-dispatch'){
        formLineRows.value = [];
      }
      else if(pageId.value===TRAIN_PAGE) formLineRows.value = [];
      else if(isDjSchemePage()){
        formLineRows.value = [];
        Object.assign(formModel, { 循环方式:'多次', 执行条件:'按定时时间固定推移', 执行周期单位:'天', 标准作业时长单位:'小时', 提前提醒单位:'小时', 指定维保班组: [] });
      }
      else       if(pageId.value===WJ_ORDER){
        formModel['外校单号'] = nextWjNo();
      }
      else if(pageId.value===HM_IMP_PAGE && (mode||'add')==='add'){
        const archNodes = (CFG.pages[HM_ARCH_PAGE] && CFG.pages[HM_ARCH_PAGE].treeNodes) || [];
        Object.assign(formModel, {
          申请单号: hmNextApplyNo(),
          文件编号: hmNextFileNo(),
          物料类: archNodes[0] || '',
          文件类型: '厂内文件',
          使用期限类型: '固定期限',
          使用周期单位: '天',
          提前预警单位: '天',
        });
        hmImpResetEntry();
      }
      else if(pageId.value===HM_VOID_PAGE && (mode||'add')==='add'){
        Object.assign(formModel, { 申请单号: hmNextVoidNo(), 文件编号:'', 文件名称:'', 文件类型:'', 客户名称:'', 法规名称:'', 文件:'', 作废原因:'' });
      }
      else if(pageId.value===HM_ARCH_PAGE){
        hmArchLoadLines(null);
        if((mode||'add')==='add'){
          if(!treeListId.value){ ElMessage.warning('请先选择左侧物料类'); return; }
          Object.assign(formModel, { 物料类: treeListId.value, 标准编号: hmNextArchNo(), 英文名称:'', 'CAS No':'', 单位:'', 单位编码:'', 附件:'', 备注:'' });
        }
      }
      else if(pageId.value===HM_LIB_PAGE && (mode||'add')==='add'){
        ElMessage.warning('请从「文件导入」新增文件');
        return;
      }
      else if(pageId.value===HM_CHG_PAGE && (mode||'add')==='add'){
        Object.assign(formModel, {
          申请单号: hmNextChgNo(),
          变更后使用期限类型: '固定期限',
          变更前使用期限类型: '固定期限',
          变更前使用周期单位: '天',
          变更后使用周期单位: '天',
          变更前提前预警单位: '天',
          变更后提前预警单位: '天'
        });
      }
      else if(pageId.value===WX_PAGE && (mode||'add')==='add'){
        formModel['维修单号'] = nextWxNo();
        formModel._instId = '';
      }
      else if(isDjPlanPage()){
        formLineRows.value = [];
        Object.assign(formModel, { 计划开始时间: djFmtTime(new Date()), 标准作业时长单位:'小时', 指定维保班组: [], [LAB_INSP_AFFECT]: '临时计划，不更新（默认）' });
      }
      else if(pageId.value===PERSON_PAGE){
        formLineRows.value = [];
        if((mode||'add')==='add') formModel['在职状态'] = '在职';
      }
      else if(pageId.value==='mat-list'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          Object.assign(formModel, {
            有效期单位: '天',
            有效期预警单位: '天',
            基本单位: 'KG',
            库存单位: 'KG',
            生产单位: 'KG',
            采购单位: 'KG',
            销售单位: 'KG'
          });
          formSwitch['启用状态'] = true;
        }
      }
      else if(pageId.value==='insp-method'){
        formLineRows.value = [];
        resetInspMethodParamLists();
        if((mode||'add')==='add'){
          formSwitch['启用状态'] = true;
          if(activeTab.value==='tab-param'){
            formModel['参数属性'] = '普通输入';
          } else {
            Object.assign(formModel, {
              是否使用公用参数: '是',
              公用测试次数: '',
              是否使用样本参数: '是',
              样本测试次数: undefined
            });
          }
        }
      }
      else if(pageId.value==='insp-project' && (activeTab.value==='tab-category' || (tabView.value||{}).name==='tab-category')){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          formSwitch['启用状态'] = true;
          formModel['适用仪器类型'] = [];
          formModel['检验类属性'] = '通用';
        }
      }
      else if(pageId.value==='insp-scheme'){
        formLineRows.value = [];
        resetSchemeFormLists();
        if((mode||'add')==='add'){
          formSwitch['启用状态'] = true;
        }
      }
      else if(pageId.value==='qr-config'){
        formLineRows.value = [];
        resetQrConfigFormLists();
        if((mode||'add')==='add'){
          formSwitch['启用状态'] = true;
          Object.assign(formModel, {
            报告类型: treeListId.value || ((page.value&&page.value.treeNodes)||[])[0] || '检验报告',
            开具方式: '一批一份',
            取值方式: '批次平均值'
          });
        }
      }
      else if(pageId.value==='qr-issue'){
        formLineRows.value = [];
        formLineSelected.value = [];
        if((mode||'add')==='add' || (mode||'add')==='copy'){
          Object.assign(formModel, {
            来源单据名称: '报检单',
            开具单号: nextQrIssueNo(),
            报告类型: '',
            开具方式: '',
            批次取值逻辑: ''
          });
        }
      }
      else if(pageId.value==='samp-scheme'){
        formLineRows.value = [];
        resetSampFormLists();
        if((mode||'add')==='add'){
          formSwitch['启用状态'] = true;
          formModel['抽样类型'] = '抽检';
        }
      }
      else if(pageId.value==='auto-samp'){
        formLineRows.value = [];
        autoSampDetailRows.value = [];
        autoSampDetailSelected.value = [];
        if((mode||'add')==='add'){
          formSwitch['启用状态'] = true;
          Object.assign(formModel, {
            执行周期单位: '时',
            循环方式: '多次',
            执行条件: '按定时时间固定推移',
            适用报检单: '生产过程检'
          });
        }
      }
      else if(pageId.value==='spc-scheme-insp'){
        formLineRows.value = [];
        if((mode||'add')==='add') formSwitch['启用状态'] = true;
      }
      else if(pageId.value==='capa-internal'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          Object.assign(formModel, {
            整改单号: 'CA-' + Date.now().toString().slice(-8),
            事件类型: '采购来料不合格',
            发生日期: new Date().toISOString().slice(0,10),
          });
        }
      }
      else if(pageId.value==='mat-medium'){
        formLineRows.value = [];
        formModel._mats = [];
      }
      else if(pageId.value==='serial-arch'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          Object.assign(formModel, {
            条码号: nextTmNo(),
            有效期单位: '天',
            库存单位: '',
            失效日期: ''
          });
        }
      }
      else if(pageId.value==='tank-arch'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          Object.assign(formModel, {
            条码号: nextTmNo()
          });
          formSwitch['启用状态'] = true;
        }
      }
      else if(pageId.value==='wwpo'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          const d = new Date();
          const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          Object.assign(formModel, {
            委外订单号: '',
            订单状态: '待执行',
            采购部门: '采购部',
            采购员: '张三',
            订单日期: ymd,
            预计交货日期: ymd
          });
        }
      }
      else if(pageId.value==='wh-insp-scheme' && (mode||'add')==='add'){
        formLineRows.value = [];
        Object.assign(formModel, {
          循环方式: '多次',
          执行条件: '按定时间固定推移',
          执行周期单位: '小时',
          提前提醒单位: '分钟'
        });
        formSwitch['启用状态'] = true;
      }
      else if(pageId.value===LAB_INSP_SCHEME && ((mode||'add')==='add' || (mode||'')==='copy')){
        Object.assign(formModel, {
          循环方式: formModel['循环方式'] || '多次',
          执行条件: formModel['执行条件'] || '按定时时间固定推移（默认）',
          执行周期单位: formModel['执行周期单位'] || '天',
          标准作业时长单位: formModel['标准作业时长单位'] || '小时',
          提前提醒单位: formModel['提前提醒单位'] || '小时'
        });
        if((mode||'add')==='add') formSwitch['启用状态'] = true;
        else if(formSwitch['启用状态']==null) formSwitch['启用状态'] = true;
      }
      else if(pageId.value===LAB_INSP_PLAN && ((mode||'add')==='add' || (mode||'')==='copy')){
        if(!formModel['计划开始时间']) formModel['计划开始时间'] = djFmtTime(new Date());
        if(!formModel['标准作业时长单位']) formModel['标准作业时长单位'] = '小时';
        if(!formModel[LAB_INSP_AFFECT]) formModel[LAB_INSP_AFFECT] = LAB_INSP_AFFECT_DEFAULT;
      }
      else if(isLabCountPage() && ((mode||'add')==='add' || (mode||'')==='copy')){
        formModel['盘点单号'] = pageId.value===LAB_COUNT_QTY ? nextLabCountQtyNo() : nextLabCountScanNo();
        if(pageId.value===LAB_COUNT_QTY){
          if(!formModel['盘点类型']) formModel['盘点类型'] = '耗材';
        } else if(!Array.isArray(formModel['盘点类型'])){
          formModel['盘点类型'] = [];
        }
        if(!Array.isArray(formModel['盘点仓库'])) formModel['盘点仓库'] = [];
        formSwitch['启用状态'] = true;
        formLineRows.value = [];
      }
      else if(isLabRgIoPage() && ((mode||'add')==='add' || (mode||'')==='copy')){
        formModel[labRgIoNoKey()] = nextLabRgIoNo();
      }
      else if(pageId.value===LAB_PREP && ((mode||'add')==='add' || (mode||'')==='copy')){
        formModel['配液单号'] = nextLabPrepNo();
      }
      else if(pageId.value===LAB_CALIB && ((mode||'add')==='add' || (mode||'')==='copy')){
        formModel['标定单号'] = nextLabCalibNo();
      }
      else if(pageId.value==='np-0201-01' && (mode||'add')==='add'){
        formModel['放行单号'] = qcNextNo(qcAllRows('np-0201-01'), '放行单号', 'WJ');
      }
      else if(pageId.value==='wh-insp-plan' && (mode||'add')==='add'){
        formLineRows.value = [];
        formModel['是否影响后续'] = '临时计划，不更新';
      }
      else if(pageId.value===CAL_PAGE){
        formLineRows.value = [];
      }
      else if(pageId.value==='customer'){
        formLineRows.value = [];
        formSwitch['启用状态'] = true;
        if((mode||'add')==='add'){
          formModel['所属业务员'] = '管理员';
        }
      }
      else if(pageId.value==='supplier'){
        formLineRows.value = [];
        formSwitch['启用状态'] = true;
        if((mode||'add')==='add'){
          formModel['所属采购员'] = '管理员';
        }
      }
      else if(pageId.value==='unit'){
        formLineRows.value = [];
        if((mode||'add')==='add' || (mode||'')==='copy'){
          Object.assign(formModel, { 舍入规则:'四舍五入', 精度规则:'固定小数位', 精度值: 3 });
          formSwitch['启用状态'] = true;
        } else if(formModel['精度值'] != null && formModel['精度值'] !== ''){
          formModel['精度值'] = Number(formModel['精度值']);
        }
      }
      else if(pageId.value==='dict'){
        formLineRows.value = [];
        formSwitch['启用状态'] = true;
      }
      else if(pageId.value==='warehouse' || pageId.value==='stock-warn' || pageId.value==='insp-proc' || pageId.value==='insp-craft' || pageId.value==='pkg-craft'){
        formLineRows.value = [];
        formSwitch['启用状态'] = true;
        if(pageId.value==='insp-craft' && (mode||'add')==='add'){
          formModel['适用业务单据'] = [];
          formModel['适用包材类型'] = [];
          formModel['适用包装规格'] = [];
        }
        if(pageId.value==='pkg-craft' && (mode||'add')==='add'){
          formModel['适用业务单据'] = [];
          formModel['适用单据类型'] = [];
          formLineRows.value = [];
        }
        if(pageId.value==='stock-warn' && (mode||'add')==='add' && ((activeTab.value==='tab2')||((tabView.value||{}).name==='tab2'))){
          formModel['库龄预警期单位'] = '天';
        }
      }
      else if(pageId.value==='po'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          const d = new Date();
          const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          Object.assign(formModel, {
            采购订单号: '',
            订单状态: '待执行',
            采购类型: '标准采购',
            采购部门: '采购一部',
            采购员: '王强',
            订单日期: ymd,
            预计到货日期: ymd
          });
        }
      }
      else if(pageId.value==='so'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          const d = new Date();
          const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          Object.assign(formModel, {
            销售订单号: '',
            订单状态: '待执行',
            销售类型: '正常销售',
            销售部门: '销售一部',
            销售员: '王强',
            订单日期: ymd,
            要求发货日期: ymd
          });
        }
      }
      else if(pageId.value==='bc-serial-split' || pageId.value==='bc-serial-merge'){
        formLineRows.value = [];
        formBarcodeRows.value = [];
        formBarcodeSelected.value = [];
      }
      else if(pageId.value==='bc-scrap-proc' || pageId.value==='bc-freeze' || pageId.value==='bc-unfreeze'){
        formLineRows.value = [];
        if((mode||'add')==='add'){
          if(pageId.value==='bc-freeze'){
            formModel['创建方式'] = '手动';
            formModel['单据类型'] = formModel['单据类型'] || '异常冻结单';
          }
          if(pageId.value==='bc-unfreeze'){
            formModel['单据类型'] = formModel['单据类型'] || '冻结解除单';
          }
        }
      }
      else if(pageId.value==='wh-stocktake'){
        if(formMode.value==='add' && !formModel['盘点方式']) formModel['盘点方式'] = '条码盘点';
        applyStocktakeMatFilter(formModel._stockMatCodes || []);
      }
      else if(pageId.value==='np-0502-01') formLineRows.value = [];
      else if(pageId.value==='np-0601-01') formLineRows.value = [batchRelEmptyLine()];
      else if(pageId.value==='np-0201-02' || pageId.value===DISPATCH_PAGE || pageId.value===COST_PAGE || pageId.value===CASS_PAGE || pageId.value===SPLIT_PAGE){
        formLineRows.value = [];
        if(pageId.value===DISPATCH_PAGE){ formCatRows.value = []; formCatSelected.value = []; formInstRows.value = []; formInstSelected.value = []; formModel['使用仪器'] = ''; }
        if(pageId.value===COST_PAGE){ formCatRows.value = []; formCatSelected.value = []; formLineSelected.value = []; }
        if(pageId.value===CASS_PAGE) formLineSelected.value = [];
      }
      else formLineRows.value = lines ? [{_i:1},{_i:2}] : [];
      if(pageId.value!=='wh-stocktake') formBarcodeRows.value = [];
      if(pageId.value==='qc-ledger' && formMode.value==='add'){
        const d = new Date();
        const pad = n => String(n).padStart(2,'0');
        const ymd = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
        const now = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        Object.assign(formModel, {
          检验单号: `QC${ymd}01`,
          检验类型: '来料检验',
          抽样数量: '0',
          报检时间: now,
          报检人: '张三',
          检验判定: '待判定'
        });
      }
      if(pageId.value==='vehicle' && formMode.value==='add'){
        formModel['经营范围'] = '普货';
      }
      if(pageId.value==='freight' && formMode.value==='add'){
        formModel['计费单位'] = '吨';
      }
      if(pageId.value==='wh-so-preout' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        formModel['单据类型'] = dictFirst('单据类型','tab1') || '标准预出货';
        formModel['计划执行日期'] = formModel['计划执行日期'] || ymd;
        formModel['单号'] = formModel['单号'] || '系统自动生成';
        formModel['关联备货通知单'] = formModel['关联备货通知单'] || '';
        formModel['关联销售订单'] = formModel['关联销售订单'] || '';
        formModel['客户名称'] = formModel['客户名称'] || '';
        formModel['关联运单'] = '';
        formModel['关联发货单'] = '';
        ['车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
      }
      if(pageId.value==='wh-so-ship' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        formModel['单据类型'] = dictFirst('单据类型','tab1') || '标准发货';
        formModel['计划执行日期'] = formModel['计划执行日期'] || ymd;
        formModel['单号'] = formModel['单号'] || '系统自动生成';
        formModel['关联销售订单'] = formModel['关联销售订单'] || '';
        formModel['客户名称'] = formModel['客户名称'] || '';
        formModel['关联销售预出货单'] = formModel['关联销售预出货单'] || '';
        formModel['关联销售备货单'] = formModel['关联销售备货单'] || '';
        formModel['关联运单'] = '';
        formModel['关联发货单'] = '';
        ['车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
      }
      if(pageId.value==='wh-so-ret' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        formModel['单据类型'] = dictFirst('单据类型','tab1') || '标准退货';
        formModel['计划执行日期'] = formModel['计划执行日期'] || ymd;
        formModel['单号'] = formModel['单号'] || '系统自动生成';
        formModel['关联销售订单'] = formModel['关联销售订单'] || '';
        formModel['客户名称'] = formModel['客户名称'] || '';
        formModel['关联销售出库单'] = formModel['关联销售出库单'] || '';
        formModel['退货原因'] = formModel['退货原因'] || '';
        formModel['关联运单'] = '';
        formModel['关联发货单'] = '';
        ['车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
      }
      if(pageId.value==='wh-other-in' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        formModel['单据类型'] = dictFirst('单据类型','tab1') || '盘盈入库';
        formModel['入库方向'] = formModel['入库方向'] || '厂外';
        formModel['计划执行日期'] = formModel['计划执行日期'] || ymd;
        formModel['单号'] = formModel['单号'] || '系统自动生成';
        formModel['受益人'] = formModel['受益人'] || '演示用户';
        formModel['受益部门'] = formModel['受益部门'] || '仓储部';
        formModel['受益项目'] = formModel['受益项目'] || '';
        formModel['生产相关'] = formModel['生产相关'] || '否';
        formModel['领至线边仓'] = '';
        formModel['关联运单'] = '';
        formModel['关联发货单'] = '';
        ['承运商','车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
        formLineRows.value = [];
      }
      if(pageId.value==='wh-other-out' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        formModel['单据类型'] = dictFirst('单据类型','tab1') || '盘亏出库';
        formModel['出库方向'] = formModel['出库方向'] || '厂外';
        formModel['计划执行日期'] = formModel['计划执行日期'] || ymd;
        formModel['单号'] = formModel['单号'] || '系统自动生成';
        formModel['受益人'] = formModel['受益人'] || '演示用户';
        formModel['受益部门'] = formModel['受益部门'] || '仓储部';
        formModel['受益项目'] = formModel['受益项目'] || '';
        formModel['生产相关'] = formModel['生产相关'] || '否';
        formModel['领至线边仓'] = '';
        formModel['关联运单'] = '';
        formModel['关联发货单'] = '';
        ['承运商','车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
        formLineRows.value = [];
      }
      if(pageId.value==='wh-load' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        formModel['单据类型'] = dictFirst('单据类型','tab1') || '标准装卸';
        formModel['计划执行日期'] = formModel['计划执行日期'] || ymd;
        formModel['单号'] = formModel['单号'] || '系统自动生成';
        formModel['关联仓库业务'] = formModel['关联仓库业务'] || '';
        formModel['关联单号'] = '';
        formModel['客供信息'] = '';
        formModel['关联运单'] = '';
        formModel['关联发货单'] = '';
        ['承运商','车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{ formModel[k] = ''; });
        formLineRows.value = [];
      }
      if(pageId.value==='wh-so-prep' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        Object.assign(formModel, {
          备货通知单号: '系统自动生成',
          单据类型: dictFirst('单据类型','tab1') || '正常备货',
          计划日期: ymd,
          备货数量: '',
          单位: '',
          订单要求: '',
          备注: ''
        });
      }
      if(pageId.value==='lg-kpi-scheme' && formMode.value==='add'){
        Object.assign(formModel, {
          周期单位: '月',
          周期: '1',
          预警周期: '3',
          预警周期单位: '天',
          循环方式: '多次',
          启用状态: '启用',
          供应商范围: '所有承运商'
        });
      }
      if(pageId.value==='lg-dispatch' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        Object.assign(formModel, {
          编号: '系统自动生成',
          日期: ymd,
          申请部门: '仓储部',
          申请人: '张三',
          用车类型: '发货',
          是否带托盘: '否',
          配送类型: ''
        });
      }
      if(pageId.value==='lg-carrier-evt' && formMode.value==='add'){
        Object.assign(formModel, {
          处理状态: '待处理',
          初步责任判定: '承运商'
        });
      }
      if(pageId.value==='wh-po-in' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        Object.assign(formModel, {
          单号: '系统自动生成',
          单据状态: '待执行',
          单据类型: dictFirst('单据类型','tab1') || '标准采购入库',
          计划执行日期: ymd
        });
      }
      if(pageId.value==='wh-po-ret' && formMode.value==='add'){
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        Object.assign(formModel, {
          单号: '系统自动生成',
          单据状态: '待执行',
          单据类型: dictFirst('单据类型','tab1') || '标准采购退料',
          计划执行日期: ymd
        });
      }
      if(isOsPoPage() && formMode.value==='add'){
        const meta = osNoticeMeta();
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const defaultType = {
          'wh-os-issue': '标准委外发料',
          'wh-os-ret-mat': '标准委外退料',
          'wh-os-recv': '标准委外收货',
          'wh-os-ret-goods': '标准委外退货',
        };
        Object.assign(formModel, {
          单号: '系统自动生成',
          单据状态: '待执行',
          单据类型: dictFirst('单据类型','tab1') || defaultType[pageId.value] || (meta && meta.label) || '标准委外',
          计划执行日期: ymd
        });
      }
      if(isCsWhPage() && formMode.value==='add'){
        const meta = csNoticeMeta();
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        Object.assign(formModel, {
          单号: '系统自动生成',
          单据状态: '待执行',
          单据类型: dictFirst('单据类型','tab1') || (meta && meta.docType) || '受托收料通知单',
          计划执行日期: ymd
        });
      }
      if(formMode.value==='add' && window.WMS_DICT && !csPage() && pageId.value!==WX_PAGE){
        const names = new Set();
        (activeFormFields.value||[]).forEach(f=>{ if(f && f.name) names.add(f.name); });
        (page.value.formFields||[]).forEach(f=>{ if(f && f.name) names.add(f.name); });
        (page.value.formSections||[]).forEach(s=>{ (s.fields||[]).forEach(f=>{ if(f && f.name) names.add(f.name); }); });
        names.forEach(name=>{
          if(formModel[name]) return;
          if(pageId.value==='retain-sample' && name==='留样种类') return;
          if(pageId.value==='insp-order' && ['物料编码','物料名称','物料规格','物料种类'].includes(name)) return;
          if(pageId.value===SPLIT_PAGE && (name==='报检类型' || name==='检验班组')) return;
          // 谱图识别：字段值全部由「源文件 / 物料编码 / 色谱柱型号」联动带出，不做字典首项预填
          if(pageId.value===SPI_PAGE) return;
          if(pageId.value===COL_PAGE && ['色谱柱型号','责任部门','责任人'].includes(name)) return;
          const first = dictFirst(name, 'tab1');
          if(first) formModel[name] = first;
        });
      }
      if(pageId.value==='insp-person' && (formMode.value==='add' || formMode.value==='copy')){
        if(!formModel['员工状态']) formModel['员工状态'] = '在职';
        if(!Array.isArray(formModel['所属检验班组'])) formModel['所属检验班组'] = [];
        if(!Array.isArray(formModel['负责检验类'])) formModel['负责检验类'] = [];
      }
      // 多选下拉初始为数组，避免 el-select multiple 绑定异常
      (activeFormFields.value||[]).forEach(f=>{
        if(f && f.multiple && (formModel[f.name]==null || formModel[f.name]==='')) formModel[f.name] = [];
        if(f && formMode.value==='add' && f.default!=null && f.default!=='' && (formModel[f.name]==null || formModel[f.name]==='')) formModel[f.name] = f.default;
      });
      if(formMode.value==='add' && pageId.value===OQC_PAGE) formModel['单据号'] = oqcNextNo();
      if(formMode.value==='add' && pageId.value===CASS_PAGE) formModel['信息流水号'] = cassNextNo();
      formVisible.value=true;
      applyGatherFormDefaults();
    }
