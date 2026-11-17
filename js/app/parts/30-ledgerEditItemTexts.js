    function ledgerEditItemTexts(){
      const scheme = (waitSampItemRows.value||[]).filter(isWaitSampSchemeItem).map(r=> r['检验项名称']).filter(Boolean).join(';') || '—';
      const temp = (waitSampItemRows.value||[]).filter(isWaitSampTempItem).map(r=> r['检验项名称']).filter(Boolean).join(';') || '—';
      return { 方案项目: scheme, 临时项目: temp };
    }
    /** 样品编号 / 留样档案条码号共用：YP + yyMMdd + 三位流水，按日自增 */
    function nextSampleNos(count, extra){
      const d = new Date();
      const prefix = 'YP' + String(d.getFullYear()).slice(-2) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
      const re = new RegExp('(?:^|[^A-Z0-9])' + prefix + '(\\d{3})(?!\\d)', 'g');
      let max = 0, m;
      const bags = [
        JSON.stringify(MOCK),
        JSON.stringify(extra || []),
        JSON.stringify((waitSampSampleRows && waitSampSampleRows.value) || []),
        JSON.stringify((labArchLines && labArchKind && labArchKind.value==='留样' ? labArchLines.value : []) || [])
      ];
      const text = bags.join('\n');
      while((m = re.exec(text))) max = Math.max(max, parseInt(m[1], 10));
      if(max + (count || 1) > 999){ ElMessage.warning('当日 YP 流水号已超过 999'); }
      return Array.from({ length: count || 1 }, (_, i)=> prefix + String(max + 1 + i).padStart(3, '0'));
    }
    function addWaitSampSample(){
      waitSampSampleRows.value.push({
        样品编号: nextSampleNos(1, waitSampSampleRows.value)[0],
        样品来源: '报检取样',
        取样备注: formModel['取样备注'] || '',
        检验方案: formModel['检验方案'] || '',
        方案项目: (waitSampItemRows.value||[]).filter(isWaitSampSchemeItem).map(r=>r['检验项名称']).join(';') || '—',
        临时项目: (waitSampItemRows.value||[]).filter(isWaitSampTempItem).map(r=>r['检验项名称']).join(';') || '—'
      });
    }
    function refreshWaitSampCodes(){
      const rows = waitSampSampleRows.value || [];
      const nos = nextSampleNos(rows.length);
      rows.forEach((r, idx)=>{ r['样品编号'] = nos[idx]; });
      ElMessage.success('已刷新 ' + rows.length + ' 个样品编号');
    }
    function removeWaitSampSamples(){
      const set = new Set(waitSampSampleSelected.value||[]);
      waitSampSampleRows.value = (waitSampSampleRows.value||[]).filter(r=> !set.has(r));
      waitSampSampleSelected.value = [];
    }
    function applyWaitSampScheme(r){
      const name = String((r && r['检验方案名称']) || '').trim();
      formModel['检验方案'] = name;
      const keep = (waitSampItemRows.value||[]).filter(isWaitSampTempItem);
      const names = String((r && r['检验项信息']) || '').split(/[;；]/).map(s=> s.trim()).filter(Boolean);
      const projects = ((((window.WMS_MOCK_ROWS || MOCK)['insp-project'])||{})['tab-item']) || [];
      const added = names.map(n=>{
        const p = projects.find(x=> x['检验项名称']===n) || {};
        return {
          项目来源: '方案',
          检验项编码: p['检验项编码'] || '',
          检验项名称: n,
          检验项类型: p['检验项类型'] || '',
          所属检验类: p['所属检验类'] || '',
          检验项单位: p['检验项单位'] || '',
          指标: '—'
        };
      });
      waitSampItemRows.value = added.concat(keep);
      const schemeText = names.join(';') || '—';
      (waitSampSampleRows.value||[]).forEach(s=>{
        s['检验方案'] = name;
        s['方案项目'] = schemeText;
      });
      ElMessage.success('已选择检验方案：' + name);
    }
    function addWaitSampItem(kind){
      const n = (waitSampItemRows.value||[]).length + 1;
      waitSampItemRows.value.push({
        项目来源: kind==='临时' ? '临时' : '方案',
        检验项编码: (kind==='临时'?'TMP':'SCH') + '-' + String(n).padStart(3,'0'),
        检验项名称: kind==='临时' ? ('临时项'+n) : (n===1?'HPLC纯度':'外观色泽'),
        检验项类型: n%2 ? '定量' : '定性',
        所属检验类: n%2 ? 'HPLC类' : '外观类',
        检验项单位: n%2 ? '%' : '—',
        指标: n%2 ? '≥99.90' : '合格'
      });
    }
    function removeWaitSampItems(){
      const set = new Set(waitSampItemSelected.value||[]);
      waitSampItemRows.value = (waitSampItemRows.value||[]).filter(r=> !set.has(r));
      waitSampItemSelected.value = [];
    }
    /** 新增/编辑弹窗物料表空态文案（始终保留表头，说明写在空表体内，对齐销售模块） */
    const formLineEmptyText = computed(()=>{
      if(pageId.value==='gather-scheme') return '暂无采集项，请点击添加采集项';
      if(pageId.value==='np-0502-01') return '请先选择过程监测名称，将自动代入采集项';
      if(pageId.value==='np-0201-11') return '设置拆分份数后点「拆分」生成子样品';
      const id = pageId.value;
      if(id===DISPATCH_PAGE) return '请添加适用物料';
      if(id===COST_PAGE) return '请添加物料信息';
      if(id===CASS_PAGE) return '点击添加关联玻璃板，可不填';
      if(id==='pkg-craft') return '请点击新增选择适用物料（非必填）';
      if(isBcLineFormPage()) return '请点击新增行添加流水明细';
      if(id==='lg-dispatch') return '选择订单或前置关联单据后自动带入物料，或点击新增挑选物料';
      if(id==='wh-load') return '选择关联单号后自动带入物料，或点击新增挑选物料';
      if(id==='wh-insp-scheme') return '请点击新增选择关联仓库';
      if(id==='wh-prod-in') return '选择关联生产订单后自动带入物料，或点击新增挑选物料';
      if(isCsWhPage()) return '选择关联发货单后自动带入物料，或点击新增挑选物料';
      if(isOsPoPage()){
        if(id==='wh-os-issue' || id==='wh-os-ret-mat') return '选择关联委外加工单后点击新增挑选发料原料';
        return '选择关联委外加工单后自动带入物料，或点击新增挑选订单内物料';
      }
      if(id==='wh-po-in' || id==='wh-po-ret') return '选择关联采购订单后自动带入物料，或点击新增挑选订单内物料';
      if(['wh-so-ship','wh-so-ret','wh-so-preout'].includes(id)) return '选择关联发货单后自动带入物料，或点击新增挑选物料';
      return '暂无数据';
    });
    const formLineRows = ref([{ _i:1 }, { _i:2 }]);
    const formCatRows = ref([]);
    const formCatSelected = ref([]);
    const formInstRows = ref([]);
    const formInstSelected = ref([]);
    watch(formLineRows, rows=>{
      if(pageId.value===PERSON_PAGE){
        (rows||[]).forEach(r=>{ const v = personAbilityValue(r); if(r['能力值']!==v) r['能力值'] = v; });
        return;
      }
      if(pageId.value!=='np-0502-01') return;
      (rows||[]).forEach(line=>{
        const s = String(line['结果值']??'');
        let cleaned = s.replace(/[^\d.]/g, '');
        const dot = cleaned.indexOf('.');
        if(dot>=0) cleaned = cleaned.slice(0, dot+1) + cleaned.slice(dot+1).replace(/\./g, '');
        if(cleaned!==s) line['结果值'] = cleaned;
        envMonJudgeLine(line);
      });
    }, { deep: true });
    const formDialogTitle = computed(()=>{
      // 新增/复制弹窗标题不加页面后缀（与源系统一致：仅「新增」「复制」）
      if(pageId.value==='np-0103-13' && ['add','edit','copy'].includes(formMode.value)){
        return (formMode.value==='edit' ? '编辑' : '新增') + (activeTab.value==='tab-1' ? '样品库位' : '样品去向');
      }
      if(pageId.value===COST_PAGE && ['add','edit','copy'].includes(formMode.value)){
        return (formMode.value==='edit' ? '编辑' : '新增') + '成本方案';
      }
      if(pageId.value===CASS_PAGE && ['add','edit','copy'].includes(formMode.value)){
        return '新增卡塞';
      }
      if(pageId.value==='spectrum-file' && formMode.value==='add'){
        return (page.value?.formDialogTitleMap||{})['新增'] || '新增 · 色谱台账';
      }
      if(formMode.value==='add') return '新增';
      if(formMode.value==='copy') return '复制';
      if(formMode.value==='detail' && pageId.value==='insp-scheme') return '详情';
      if(formMode.value==='detail' && pageId.value===DRIFT_PAGE) return '详情';
      if(formMode.value==='detail' && pageId.value===HM_IMP_PAGE) return '详情';
      if(formMode.value==='detail' && pageId.value==='insp-method'){
        if(formModel._fromVersionTree){
          const ver = String(formModel['版本号']||'').trim();
          return ver ? ('版本 ' + ver) : '历史版本';
        }
        return '详情';
      }
      if(TPL_PAGES[pageId.value] && formMode.value==='detail') return '详情';
      if(pageId.value==='spc-rule') return (page.value?.formDialogTitleMap||{}).edit || '编辑';
      {
        const titleMap = (tabView.value && tabView.value.formDialogTitleMap) || (page.value && page.value.formDialogTitleMap) || {};
        if(formMode.value==='edit' && titleMap['编辑']) return titleMap['编辑'];
        if(formMode.value==='edit' && titleMap.edit) return titleMap.edit;
        if(titleMap[formMode.value]) return titleMap[formMode.value];
      }
      if(formMode.value==='samp') return '取样';
      if(formMode.value==='recheck') return '复核';
      if(formMode.value==='entry'){
        if(pageId.value==='ledger' && formModel._fromLedgerModify) return '修改数据';
        return '数据录入';
      }
      if(formMode.value==='quick-entry') return '快速录入';
      if(formMode.value==='dispose') return (page.value?.formDialogTitleMap||{})['处置'] || '处置';
      if(formMode.value==='mrb-audit') return (page.value?.formDialogTitleMap||{})['MRB评审'] || 'MRB评审';
      if(formMode.value==='mrb-review-rec') return (page.value?.formDialogTitleMap||{})['处置'] || '评审记录';
      if(formMode.value==='capa-close') return (page.value?.formDialogTitleMap||{})['关闭'] || '关闭单据';
      if(formMode.value==='capa-process') return (page.value?.formDialogTitleMap||{})['整改处理'] || '整改处理';
      if(formMode.value==='保存SPC报告') return (page.value?.formDialogTitleMap||{})['保存SPC报告'] || '保存';
      if(formMode.value==='新建数据源' || formMode.value==='编辑数据源' || formMode.value==='数据源设置' || formMode.value==='文件详情'){
        return (page.value?.formDialogTitleMap||{})[formMode.value] || formMode.value;
      }
      if(formMode.value==='新增标签类型' || formMode.value==='编辑标签类型'){
        return (page.value?.formDialogTitleMap||{})[formMode.value] || formMode.value;
      }
      if(formMode.value==='新增数据源' || formMode.value==='编辑数据源'){
        return (page.value?.formDialogTitleMap||{})[formMode.value] || formMode.value;
      }
      if(formMode.value==='新增表单类型' || formMode.value==='编辑表单类型'){
        return (page.value?.formDialogTitleMap||{})[formMode.value] || formMode.value;
      }
      if(formMode.value==='新增类型' || formMode.value==='编辑类型'){
        return (page.value?.formDialogTitleMap||{})[formMode.value] || formMode.value;
      }
      if(formMode.value==='标签模板设计'){
        return (page.value?.formDialogTitleMap||{})['标签模板设计'] || '标签模板设计';
      }
      if(pageId.value==='dict') return '编辑字典项';
      if(pageId.value==='wh-so-prep'){
        return '编辑备货通知单' + (formModel['备货通知单号'] ? (' — ' + formModel['备货通知单号']) : '');
      }
      if(false /*lg-order removed*/) return '编辑物流单据';
      if(pageId.value==='lg-waybill') return '编辑运单';
      if(pageId.value==='lg-dispatch'){
        return '编辑派车申请单 — ' + (formModel['编号'] || '');
      }
      if(pageId.value==='lg-ship'){
        return '编辑发货单 — ' + (formModel['发货单号'] || '');
      }
      if(pageId.value==='carrier') return '编辑承运商';
      if(pageId.value==='vehicle') return '编辑车辆及司机';
      if(pageId.value==='freight') return '编辑运费参照';
      if(pageId.value==='lg-kpi-scheme') return '编辑评价方案';
      if(pageId.value==='lg-carrier-evt') return '编辑承运商事件';
      if(pageId.value==='wh-po-in'){
        return '编辑采购收料通知单' + (formModel['单号'] ? (' — ' + formModel['单号']) : '');
      }
      if(pageId.value==='wh-po-ret'){
        return '编辑采购退料通知单' + (formModel['单号'] ? (' — ' + formModel['单号']) : '');
      }
      if(isOsPoPage()){
        const meta = osNoticeMeta();
        const label = meta ? meta.label : '委外通知单';
        return '编辑' + label + (formModel['单号'] ? (' — ' + formModel['单号']) : '');
      }
      if(pageId.value==='wwpo') return '编辑委外加工订单';
      if(pageId.value==='wh-insp-scheme') return '编辑巡检方案';
      if(pageId.value==='wh-insp-plan' || pageId.value===LAB_INSP_PLAN) return '编辑巡检计划' + (formModel['计划单号'] ? (' — ' + formModel['计划单号']) : '');
      if(isLabCountPage()) return '编辑盘点单' + (formModel['盘点单号'] ? (' — ' + formModel['盘点单号']) : '');
      if(pageId.value==='mat-list'){
        return '编辑物料' + (formModel['物料编码'] ? (' — ' + formModel['物料编码']) : '');
      }
      if(pageId.value==='mat-uom'){
        return '编辑换算关系' + (formModel['物料编码'] ? (' — ' + formModel['物料编码']) : '');
      }
      if(pageId.value==='mat-medium'){
        return '编辑物料介质对照';
      }
      if(pageId.value==='serial-arch'){
        return '编辑流水码' + (formModel['条码号'] ? (' — ' + formModel['条码号']) : '');
      }
      if(pageId.value==='tank-arch'){
        return '编辑储罐档案' + (formModel['储罐编号'] ? (' — ' + formModel['储罐编号']) : '');
      }
      if(pageId.value==='customer'){
        return '编辑客户' + (formModel['客户编码'] ? (' — ' + formModel['客户编码']) : '');
      }
      if(pageId.value==='supplier'){
        return '编辑供应商' + (formModel['供应商编码'] ? (' — ' + formModel['供应商编码']) : '');
      }
      if(pageId.value==='po') return '编辑采购订单' + (formModel['采购订单号'] ? (' — ' + formModel['采购订单号']) : '');
      if(pageId.value==='so') return '编辑销售订单' + (formModel['销售订单号'] ? (' — ' + formModel['销售订单号']) : '');
      if(pageId.value==='unit'){
        return '编辑单位' + (formModel['单位编码'] ? (' — ' + formModel['单位编码']) : '');
      }
      if(pageId.value==='warehouse'){
        const isLoc = (activeTab.value==='tab2') || ((tabView.value||{}).name==='tab2');
        const entity = isLoc ? '库位' : '仓库';
        const codeKey = isLoc ? '库位编码' : '仓库编码';
        return '编辑' + entity + (formModel[codeKey] ? (' — ' + formModel[codeKey]) : '');
      }
      if(pageId.value==='stock-warn'){
        const isMat = (activeTab.value==='tab2') || ((tabView.value||{}).name==='tab2');
        const entity = isMat ? '物料预警' : '仓库预警';
        return '编辑' + entity;
      }
      if(pageId.value==='insp-proc'){
        return '编辑检查工序' + (formModel['工序编码'] ? (' — ' + formModel['工序编码']) : '');
      }
      if(pageId.value==='insp-craft'){
        return '编辑工艺' + (formModel['工艺编码'] ? (' — ' + formModel['工艺编码']) : '');
      }
      if(pageId.value==='line-side'){
        return '编辑线边仓' + (formModel['线边仓编码'] ? (' — ' + formModel['线边仓编码']) : '');
      }
      if(pageId.value==='wh-other-in'){
        return '编辑其他入库通知单' + (formModel['单号'] ? (' — ' + formModel['单号']) : '');
      }
      if(pageId.value==='wh-other-out'){
        return '编辑其他出库通知单' + (formModel['单号'] ? (' — ' + formModel['单号']) : '');
      }
      if(pageId.value==='wh-load'){
        return '编辑装卸货通知单' + (formModel['单号'] ? (' — ' + formModel['单号']) : '');
      }
      return '编辑' + (page.value?.title ? (' · ' + page.value.title) : '');
    });
    function demoMenuTreeData(){
      function toNodes(items, trail=[]){
        return (items||[]).map(it=>{
          const path = [...trail, it.title];
          if(it.pageId) return { label: path.join(' / '), value: it.title };
          const children = toNodes(it.children||[], path);
          if(!children.length) return null;
          return { label: it.title, value: 'g:' + (it.index||it.title), disabled: true, children };
        }).filter(Boolean);
      }
      return toNodes(menu);
    }
    function onTagMenuTreeChange(f){
      if(pageId.value!=='tag-config' || !f || f.name!=='菜单') return;
      formModel['菜单名称'] = formModel['菜单'] || '';
    }
    function onTreeToolbar(){
      const raw = page.value?.treeToolbar?.[0];
      if(!raw) return;
      onToolbar(Object.assign({}, raw, { _fromTree: true }));
    }
    const formDialogWidth = computed(()=>{
      if(formMode.value==='数据源设置') return page.value?.settingDialogWidth || '60vw';
      if(pageId.value==='ledger' && formMode.value==='edit') return 'min(1000px, 96vw)';
      if(page.value?.formDialogWidth) return page.value.formDialogWidth;
      const n = (activeFormFields.value||[]).length;
      const hasLines = (activeFormLineFields.value||[]).length>0;
      const hasSecs = (activeFormSections.value||[]).length>0;
      if(hasSecs || hasLines || n>8) return 'min(960px, 96vw)';
      if(n>4) return 'min(720px, 96vw)';
      return 'min(640px, 96vw)';
    });
    const detailDialogTitle = computed(()=>{
      if(pageId.value==='wh-so-prep') return '备货通知单详情 — ' + (detailRow.value?.['备货通知单号'] || '');
      if(pageId.value==='wh-po-in') return '采购收料通知单详情 — ' + (detailRow.value?.['单号'] || '');
      if(pageId.value==='wh-po-ret') return '采购退料通知单详情 — ' + (detailRow.value?.['单号'] || '');
      if(pageId.value==='wh-prod-issue') return '生产领料申请单详情 — ' + (detailRow.value?.['单号'] || '');
      if(pageId.value==='wh-prod-ret') return '生产退料申请单详情 — ' + (detailRow.value?.['单号'] || '');
      if(pageId.value==='wh-prod-in') return '生产入库申请单详情 — ' + (detailRow.value?.['单号'] || '');
      if(pageId.value==='wh-direct-xfer') return '直接调拨申请单详情 — ' + (detailRow.value?.['单号'] || '');
      if(pageId.value==='lg-dispatch') return '派车申请单详情 — ' + (detailRow.value?.['编号'] || '');
      if(pageId.value==='lg-ship') return '发货单详情 — ' + (detailRow.value?.['发货单号'] || '');
      if(pageId.value==='lg-waybill' || pageId.value==='lg-waybill-carrier') return '运单详情 — ' + (detailRow.value?.['运单号'] || '');
      if(pageId.value==='lg-pickup') return '提货单详情 — ' + (detailRow.value?.['提货单号'] || '');
      if(pageId.value==='lg-sign') return '签收单详情 — ' + (detailRow.value?.['签收单号'] || '');
      if(pageId.value==='lg-kpi-plan' || pageId.value==='lg-kpi-record') return '详情 — ' + (detailRow.value?.['计划单号'] || '');
      if(pageId.value==='lg-carrier-evt') return '承运商事件详情 — ' + (detailRow.value?.['事件编号'] || '');
      if(pageId.value==='wwpo') return '委外加工订单详情 — ' + (detailRow.value?.['委外订单号'] || '');
      if(pageId.value==='wh-insp-scheme' || pageId.value===LAB_INSP_SCHEME) return '巡检方案详情 — ' + (detailRow.value?.['巡检方案编码'] || '');
      if(isDjSchemePage()) return djKind().w + '方案详情 — ' + (detailRow.value?.[djKind().w+'方案编码'] || '');
      if(pageId.value==='wh-insp-plan' || pageId.value===LAB_INSP_PLAN) return '巡检作业详情 — ' + (detailRow.value?.['计划单号'] || '');
      if(isLabCountPage()) return '详情' + (detailRow.value?.['盘点单号'] ? (' — ' + detailRow.value['盘点单号']) : '');
      if(isLabRgIoPage()) return '作业详情' + (detailRow.value?.['条码号'] ? (' — ' + detailRow.value['条码号']) : '');
      if(pageId.value==='tank-arch') return '储罐档案详情 — ' + (detailRow.value?.['储罐编号'] || detailRow.value?.['条码号'] || '');
      if(pageId.value===HM_ARCH_PAGE) return '标准详情 — ' + (detailRow.value?.['标准编号'] || '');
      if(pageId.value===HM_LIB_PAGE) return '文件详情 — ' + (detailRow.value?.['文件编号'] || '');
      if(pageId.value==='wh-other-in') return '其他入库通知单详情 — ' + (detailRow.value?.['单号'] || '');
      if(pageId.value==='wh-other-out') return '其他出库通知单详情 — ' + (detailRow.value?.['单号'] || '');
      if(pageId.value==='wh-load' && activeTab.value==='tab2') return '装卸货单详情 — ' + (detailRow.value?.['装卸单号'] || '');
      if(pageId.value==='wh-load') return '装卸货通知单详情 — ' + (detailRow.value?.['单号'] || '');
      return '详情 · ' + (page.value?.title || '');
    });
    function isDateTimeField(f){
      const ctrl = f?.ctrl || '';
      const name = f?.name || '';
      const type = f?.type || '';
      if(type==='date') return false;
      return type==='datetime' || ctrl.includes('时分') || name.includes('计划开始') || name.includes('计划装车') || name.includes('计划装货') || name.includes('计划发货') || name.includes('预计') || name.includes('实际') || name.includes('排单') || name.includes('要求送达') || name.includes('报检时间');
    }
    function colMaxWidth(name){
      const n = String(name||'');
      if(/物料信息|备注|地址|描述|标准|说明|内容/.test(n)) return 360;
      if(/单号|编码|批号|电话|身份证|车牌|运单|发货单/.test(n)) return 220;
      if(/状态|类型|单位|件数|数量|日期|时间/.test(n)) return 160;
      return 200;
    }
    function colMinWidth(name){
      const n = String(name||'');
      const labelW = Math.max(80, Math.min(colMaxWidth(n), n.length * 14 + 28));
      if(/物料|地点/.test(n)) return Math.min(colMaxWidth(n), Math.max(160, labelW));
      if(/体积|异常|标准|位置|备注/.test(n)) return Math.min(colMaxWidth(n), Math.max(120, labelW));
      return labelW;
    }
    /** 新增/编辑弹窗明细表：只设 min-width，避免空表时按表头估宽后列挤在左侧；按控件/内容可读性加宽（含 cell 左右 padding） */
    function formLineColMinWidth(f){
      const name = String((f && f.name) || '');
      if(pageId.value===HM_ARCH_PAGE){
        if(name==='中文名称') return 200;
        if(name==='英文名称') return 260;
        if(name==='CAS No') return 150;
        if(name==='管控对象') return 150;
        if(name==='限制值') return 130;
        if(name==='单位') return 110;
        if(name==='MDL') return 100;
      }
      if(pageId.value==='np-0601-01'){
        if(name==='来源物料') return 420;
        if(name==='来源批号') return 280;
      }
      if(pageId.value===SPLIT_PAGE){
        if(name==='子样品编号' || name==='检验方案' || name==='拆分备注') return 180;
        if(name==='物料名称') return 160;
        return 140;
      }
      if(f && Number(f.width) > 0) return Number(f.width);
      if(/物料信息/.test(name)) return 300;
      if(name==='物料类型' || name==='档案类型') return 88;
      if(name==='物料编码') return 120;
      if(name==='物料名称') return 140;
      if(name==='物料规格') return 120;
      if(name==='物料种类') return 110;
      if(name==='条码号') return 130;
      if(name==='批号') return 110;
      if(name==='应盘数量' || name==='实盘数量' || name==='数量') return 88;
      if(name==='计量单位') return 80;
      if(name==='仓库编码' || name==='库位编码') return 110;
      if(name==='盘点状态') return 80;
      if(name==='盘点异常说明') return 140;
      if(name==='盘点人') return 80;
      if(name==='盘点时间') return 140;
      if(/物料/.test(name)) return 220;
      if(/生产厂家/.test(name)) return 188;
      if(/批号|关联/.test(name)) return 160;
      if(/管理方式/.test(name)) return 124;
      if(/库存单位|^单位$/.test(name)) return 100;
      if(/计划件数|计划数量|已完成|未完成|需求数量|发货数量|数量|件数/.test(name)) return 132;
      if(/生产日期|日期/.test(name)) return 188;
      if(/有效期|行状态/.test(name)) return 104;
      if(/备注/.test(name)) return 168;
      return Math.max(110, colMinWidth(name));
    }
    /** 按表头 + 样本行内容估算列宽，过长字段封顶 */
    function fitColWidth(field, title, rows){
      const name = title || field || '';
      const maxW = colMaxWidth(name);
      const minW = Math.max(72, Math.min(120, String(name).length * 14 + 24));
      const textW = (s)=>{
        const str = String(s??'');
        let w = 0;
        for(const ch of str){
          w += ch.charCodeAt(0) > 255 ? 14 : 8;
        }
        return w + 28;
      };
      let w = Math.max(minW, textW(name));
      const sample = (rows||[]).slice(0, 40);
      for(const r of sample){
        if(!r) continue;
        let val = r[field];
        if(val==null && field) val = r[title];
        if(Array.isArray(val)) val = val.join('、');
        const cw = textW(val);
        if(cw > w) w = cw;
      }
      return Math.min(maxW, Math.max(minW, Math.ceil(w)));
    }
    function isFormFieldVisible(f){
      if(!f) return false;
      if(f.showWhen && f.showWhen.field){
        const cur = formModel[f.showWhen.field];
        const eq = f.showWhen.eq;
        const ne = f.showWhen.ne;
        if(eq != null && String(cur) !== String(eq)) return false;
        if(ne != null && String(cur) === String(ne)) return false;
      }
      if(pageId.value==='spc-rule'){
        const rn = String(formModel['规则名称']||'');
        if(f.name==='[n]') return rn !== '1界外';
        if(f.name==='[m]') return ['1界外','[m]/[n]A','[m]/[n]C'].includes(rn);
        if(f.name==='规则名称') return true;
      }
      if(pageId.value==='lg-dispatch'){
        const whBiz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
        if(f.name==='配送类型') return whBiz==='销售发货';
        if(f.name==='采购订单') return whBiz==='销售发货' && formModel['配送类型']==='直发业务（贸易）';
        if(f.name==='关联销售备货单') return whBiz==='销售发货' || whBiz==='销售预出货';
        if(f.name==='关联销售预出货单') return whBiz==='销售发货';
        if(f.name==='前置关联单据') return whBiz==='销售退货';
        if(f.name==='订单号'){
          const ot = formModel['订单类型'] || '';
          return !!ot && ot!=='无';
        }
      }
      if(pageId.value==='lg-carrier-evt' && f.name==='处理状态'){
        return formMode.value==='edit';
      }
      if((pageId.value==='po' || pageId.value==='so' || pageId.value==='wwpo') && f.name==='订单状态') return false;
      if(pageId.value==='insp-craft' && f.name==='适用包装规格'){
        const types = formModel['适用包材类型'];
        const arr = Array.isArray(types) ? types : String(types||'').split(/[、,，]/).map(s=>s.trim()).filter(Boolean);
        return arr.includes('流水码');
      }
      if(pageId.value==='wh-insp-plan'){
        if(f.name==='目标仓库') return formMode.value==='add' || formMode.value==='copy';
        if(f.name==='仓库名称') return formMode.value==='edit';
      }
      if(pageId.value==='wh-prod-in' && (f.name==='关联销售订单' || f.name==='客户名称')){
        return formModel['业务类型']==='受托加工完工';
      }
      if(pageId.value==='wh-other-in' && f.name==='领至线边仓'){
        return formModel['入库方向']==='线边仓';
      }
      if(pageId.value==='wh-other-out' && f.name==='领至线边仓'){
        return formModel['出库方向']==='线边仓';
      }
      if((pageId.value==='bc-freeze' || pageId.value==='bc-unfreeze') && f.name==='已完成件数' && formMode.value==='add') return false;
      if(pageId.value==='bc-freeze' && f.name==='冻结单号' && formMode.value==='add') return false;
      if(pageId.value==='bc-unfreeze' && f.name==='解除单号' && formMode.value==='add') return false;
      if(pageId.value==='bc-scrap-proc' && f.name==='工单号' && formMode.value==='add') return false;
      return true;
    }
