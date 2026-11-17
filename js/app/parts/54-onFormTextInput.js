    function onFormTextInput(f){
      if(!f) return;
      if(pageId.value==='serial-arch' && f.name==='建档数量') syncSerialCurrentQty(formModel);
      if(pageId.value==='wh-prod-in' && f.name==='关联销售订单') onFormSelectChange(f);
      if(pageId.value===COL_PAGE && f.name==='色谱柱编号'){
        const code = String(formModel['色谱柱编号']||'');
        const bc = String(formModel['色谱柱条码']||'');
        if(!bc || bc === formModel._colBcFrom){
          formModel['色谱柱条码'] = code;
          formModel._colBcFrom = code;
        }
      }
    }
    const ledgerInspHeadFields = computed(()=>{
      const cols = (tabView.value && tabView.value.columns) || [];
      return cols.map(c=> (c && (c.name || c.field || c.title)) || c).filter(n=> n && n !== '操作');
    });
    const ledgerInspVisible = ref(false);
    const ledgerInspTab = ref('分析数据');
    const ledgerInspRow = ref(null);
    const ledgerInspQual = ref([]);
    const ledgerInspQuant = ref([]);
    const ledgerInspRaw = ref([]);
    const ledgerInspQualSel = ref([]);
    const ledgerInspQuantSel = ref([]);
    function ledgerInspAbnText(row){
      const v = (row && (row['异常报送'] || row['异常描述'])) || '';
      return (v && v !== '—') ? String(v) : '';
    }
    function openLedgerInspDetail(row){
      const r = STORE ? STORE.overlayPcRow('ledger', { ...row }) : { ...row };
      if(!r._entry){ const fs = flowSplitRow(r['样品编号']); if(fs && fs._entry) r._entry = fs._entry; }
      if(!r['异常报送'] && r['异常描述']) r['异常报送'] = r['异常描述'];
      const demo = buildLedgerInspDemo(r);
      ledgerInspRow.value = r;
      ledgerInspQual.value = demo.qual;
      ledgerInspQuant.value = demo.quant;
      ledgerInspRaw.value = demo.raw;
      ledgerInspQualSel.value = [];
      ledgerInspQuantSel.value = [];
      ledgerInspTab.value = '分析数据';
      ledgerInspVisible.value = true;
    }
    const ledgerChangeVisible = ref(false);
    const ledgerChangeSrc = ref(null);
    const ledgerChangeRows = ref([]);
    const ledgerChangePage = ref(1);
    const ledgerChangePageSize = ref(20);
    const ledgerChangePaged = computed(()=>{
      const list = ledgerChangeRows.value || [];
      const start = (ledgerChangePage.value - 1) * ledgerChangePageSize.value;
      return list.slice(start, start + ledgerChangePageSize.value);
    });
    function ensureLedgerChangeLogs(row){
      if(!row) return [];
      if(!Array.isArray(row._changeLogs)) row._changeLogs = [];
      if(!row._changeLogs.length){
        const s = flowSplitRow(row['样品编号']);
        const stamp = (row['检验完成时间'] && row['检验完成时间']!=='—')
          ? row['检验完成时间']
          : ((row['取样时间'] && row['取样时间']!=='—') ? row['取样时间'] : nowStamp());
        if(s && s._entry){
          row._changeLogs.push({
            id: 'cl-seed-' + (row.id || row['样品编号']),
            变更人: '管理员',
            变更时间: stamp,
            _entry: JSON.parse(JSON.stringify(s._entry)),
            _snap: JSON.parse(JSON.stringify(row))
          });
        } else if(['检验中','已完成'].includes(row['样品状态'])){
          row._changeLogs.push({
            id: 'cl-seed-' + (row.id || row['样品编号']),
            变更人: '管理员',
            变更时间: stamp,
            _entry: null,
            _snap: JSON.parse(JSON.stringify(row))
          });
        }
      }
      return row._changeLogs;
    }
    function appendLedgerChangeLog(sampleNo){
      const lg = flowLedgerRow(sampleNo);
      const s = flowSplitRow(sampleNo);
      if(!lg) return;
      if(!Array.isArray(lg._changeLogs)) lg._changeLogs = [];
      lg._changeLogs.unshift({
        id: 'cl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        变更人: '管理员',
        变更时间: nowStamp(),
        _entry: s && s._entry ? JSON.parse(JSON.stringify(s._entry)) : null,
        _snap: JSON.parse(JSON.stringify(lg))
      });
    }
    function openLedgerChangeLog(row){
      const src = flowLedgerRow(row['样品编号']) || row;
      ledgerChangeSrc.value = src;
      ledgerChangeRows.value = ensureLedgerChangeLogs(src).slice();
      ledgerChangePage.value = 1;
      ledgerChangeVisible.value = true;
    }
    function openLedgerChangeDetail(log){
      const base = (log && log._snap) ? { ...log._snap } : { ...(ledgerChangeSrc.value || {}) };
      if(log && log['变更时间']) base['检验完成时间'] = log['变更时间'];
      if(log && log['变更人']) base['检验人'] = log['变更人'];
      if(['待检验'].includes(base['样品状态'])) base['样品状态'] = '检验中';
      openLedgerInspDetail(base);
    }
    function openLedgerModifyData(row){
      const src = JSON.parse(JSON.stringify(row || {}));
      openForm('entry');
      nextTick(()=>{
        formModel._fromLedgerModify = true;
        formModel._editId = src.id;
        ['样品编号','样品来源','物料名称','物料规格','充装介质','采样点','报检批号','取样时间','报检单号','检验方案'].forEach(k=>{
          if(src[k]!=null && src[k]!=='—') formModel[k] = src[k];
        });
        const split = flowSplitRow(src['样品编号']);
        const entrySrc = split ? Object.assign({}, split) : {
          样品编号: src['样品编号'],
          方案项目: src['方案项目'],
          临时项目: src['临时项目'],
          样品来源: src['样品来源'],
          物料名称: src['物料名称'],
          物料规格: src['物料规格'],
          采样点: src['采样点'],
          报检批号: src['报检批号'],
          取样时间: src['取样时间'],
          报检单号: src['报检单号'],
          检验方案: src['检验方案'],
          _entry: src._entry || null
        };
        if(!entrySrc._entry && src._entry) entrySrc._entry = src._entry;
        // 保证方案/临时项目取台账
        if(!flowHas(entrySrc['方案项目'])) entrySrc['方案项目'] = src['方案项目'] || '';
        if(!flowHas(entrySrc['临时项目'])) entrySrc['临时项目'] = src['临时项目'] || '';
        flowFillEntry(src, entrySrc);
        if(!(formLineRows.value||[]).length){
          const names = flowSampleItems(src);
          formLineRows.value = names.map((name, idx)=>{
            const meta = inspItemOf(name);
            return {
              _i: idx+1, 检验项:name, 实测值:'', 结论:'', 偏差结论:'', 指标:'', 特殊公式:'', 备注:'',
              检验项类型: meta['检验项类型'] || '定量', 所属检验类: meta['所属检验类'] || '未分类',
              检验项单位: meta['检验项单位'] || '', _cells:{}
            };
          });
          entryCat.value = (formLineRows.value[0] && formLineRows.value[0]['所属检验类']) || '';
          entryDone.value = [];
          entryCatState.value = {};
          entryStamp.value = nowStamp();
        }
      });
    }
    function openDetail(row){
      detailRow.value = STORE ? STORE.overlayPcRow(pageId.value, { ...row }) : { ...row };
      if(pageId.value==='lg-dispatch'){
        detailRow.value['关联仓储业务'] = resolveWhBizType(row);
        const pre = normalizeDispatchSoShipPreDocs(row);
        detailRow.value['关联销售备货单'] = pre.关联销售备货单 || '—';
        detailRow.value['关联销售预出货单'] = pre.关联销售预出货单 || '—';
        if(!detailRow.value['前置关联单据']) detailRow.value['前置关联单据'] = '—';
      }
      if(pageId.value==='lg-ship'){
        detailRow.value['来源派车申请单'] = row['来源派车单号'] || row['来源派车申请单'] || '—';
        detailRow.value['仓库业务类型'] = resolveWhBizType(row);
        detailRow.value = overlayShipByWaybill(detailRow.value);
      }
      if(isWaybillPage()){
        detailRow.value['仓库业务类型'] = resolveWhBizType(row);
        detailRow.value = overlayWaybillFromShips(detailRow.value);
      }
      if(pageId.value==='wh-insp-plan'){
        detailRow.value['巡检人员'] = row['巡检人员'] || row['巡检人'] || '—';
      }
      const mockLines = ((pageId.value==='lg-dispatch' || pageId.value==='lg-ship' || isWaybillPage() || pageId.value==='lg-pickup' || pageId.value==='lg-sign' || pageId.value==='wwpo' || pageId.value==='po' || pageId.value==='so' || isWhNoticePage() || isProdWhPage() || pageId.value==='wh-other-in' || pageId.value==='wh-other-out' || pageId.value==='wh-load' || pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret' || isLabCountPage()) && row?._lines?.length) ? row._lines
        : ((pageId.value==='bc-serial-split' || pageId.value==='bc-serial-merge') && row?.lines?.length) ? row.lines
        : (pageId.value==='wh-so-prep' && Array.isArray(row?._pickLines)) ? row._pickLines
        : (pageId.value==='wh-insp-scheme' && row?._locs?.length) ? row._locs
        : (pageId.value==='wh-insp-plan' && row?._items?.length) ? row._items
        : (MOCK[pageId.value]||{}).detailLines;
      detailLineSelected.value = [];
      if(pageId.value==='wwpo' && mockLines && mockLines.length){
        detailLineRows.value = mockLines.map((r,i)=>normWwpoDetailLine(r,i));
      } else if(pageId.value==='po' && mockLines && mockLines.length){
        detailLineRows.value = mockLines.map((r,i)=>normPoDetailLine(r,i));
      } else if(pageId.value==='so' && mockLines && mockLines.length){
        detailLineRows.value = mockLines.map((r,i)=>normSoDetailLine(r,i));
      } else if(isWhNoticePage() || isProdWhPage() || pageId.value==='wh-other-in' || pageId.value==='wh-other-out' || pageId.value==='wh-load'){
        let lines = (Array.isArray(mockLines) && mockLines.length) ? mockLines
          : (Array.isArray(row?._lines) ? row._lines : []);
        if(isWhNoticePage()){
          lines = assignNoticeSplitLineNos(alignNoticeDetailLinesFromShip(detailRow.value, lines), detailRow.value);
          if(detailRow.value && lines.length){
            detailRow.value._lines = lines.map(r=>({ ...r }));
            const tabKey = (page.value?.tabs||[])[0]?.name || 'tab1';
            const list = ((MOCK[pageId.value]||{})[tabKey]||[]);
            const hit = list.find(r=> r.id===detailRow.value.id || r['单号']===detailRow.value['单号']);
            if(hit) hit._lines = lines.map(r=>({ ...r }));
          }
        } else if(pageId.value==='wh-prod-in'){
          lines = finalizeNoticeFormLines(lines, noticeCtxFromForm(detailRow.value));
        }
        detailLineRows.value = lines.map((r,i)=>normPoInDetailLine(r,i));
      } else if(pageId.value==='lg-dispatch'){
        detailLineRows.value = ensureLineNos(mockLines||[]).map((r,i)=>({
          ...r,
          行号: lineNoOf(r, i+1)
        }));
      } else if(pageId.value==='lg-ship'){
        detailLineRows.value = shipLinesOf(row);
      } else if(pageId.value==='wh-so-prep'){
        detailLineRows.value = (mockLines||[]).map(r=>({...r}));
      } else if(pageId.value==='tank-arch'){
        const lines = Array.isArray(row?._lines) && row._lines.length ? row._lines : tankDetailLinesFromRow(row);
        detailLineRows.value = lines.map(r=>({...r}));
      } else if(isDjSchemePage()){
        detailLineRows.value = djDetailLines(row||{});
      } else if(pageId.value===HM_ARCH_PAGE){
        detailLineRows.value = (Array.isArray(row && row._lines) ? row._lines : []).map(r=>({...r}));
      } else if(pageId.value==='gather-scheme'){
        const lines = Array.isArray(row && row._lines) ? row._lines : [];
        detailLineRows.value = lines.map(r=>{
          const o = { ...r };
          GS_LIMIT_KEYS.forEach(k=>{ o[k] = gatherLimitText(r[k], k); });
          return o;
        });
      } else if(pageId.value==='np-0201-02'){
        const lines = (Array.isArray(row && row._lines) && row._lines.length) ? row._lines : oeLinesFromText((row && row['委托项目']) || '');
        detailLineRows.value = lines.map(r=>({ ...r }));
      } else if(pageId.value==='spectrogram'){
        const fileNo = (row && row['文件编号']) || '';
        const flows = (((MOCK.spectrogram||{})['tab-flow'])||[]);
        detailLineRows.value = flows.filter(r => !fileNo || r['文件编号']===fileNo).map(r=>({ ...r }));
      } else if(pageId.value===CASS_PAGE){
        detailLineRows.value = (Array.isArray(row && row._lines) ? row._lines : []).map(r=>({ ...r }));
      } else if(mockLines && mockLines.length){
        detailLineRows.value = mockLines.map(r=>({...r}));
      } else if((page.value?.detailLineFields||[]).length){
        detailLineRows.value = [{},{}].map((_,i)=>{
          const o={};
          (page.value.detailLineFields||[]).forEach(f=>{
            o[f.name] = f.name.includes('物料') ? matInfoText(((MOCK['mat-list']||{}).main||[])[i] || 'RM-Li2CO3-BG') : (f.name.includes('数量')?'10':(f.name.includes('状态')?'待执行':'—'));
          });
          return o;
        });
      } else {
        detailLineRows.value = [];
      }
      // 在途信息：优先 APP 同源上报，其次 Mock
      if((page.value?.detailEnrouteFields||[]).length){
        const st = detailRow.value?.['状态'] || row?.['状态'] || '';
        const fromStore = STORE ? STORE.getEnrouteForPc(pageId.value, detailRow.value) : null;
        const idle = ['待派车','待运输','待发运','已关闭','已取消'].includes(st);
        if(fromStore && fromStore.length){
          detailEnrouteRows.value = fromStore.map(normalizeEnroute);
        } else if(idle){
          detailEnrouteRows.value = [];
        } else {
          const enroute = (MOCK[isWaybillPage() ? 'lg-waybill' : pageId.value]||{}).enrouteLines || [];
          detailEnrouteRows.value = enroute.map(normalizeEnroute);
        }
      } else {
        detailEnrouteRows.value = [];
      }
      detailPhotos.value = ((pageId.value==='lg-pickup' || pageId.value==='lg-sign') && Array.isArray(row?._photos)) ? row._photos.slice() : [];
      detailSignature.value = pageId.value==='lg-sign' ? (row?._signature || row?.['电子签名'] || '') : '';
      if(detailSignature.value==='—') detailSignature.value = '';
      detailVisible.value=true;
    }
    function deleteConfirmTip(btn){
      const b = btn || {};
      if(pageId.value==='wwpo') return '确认删除所选委外加工订单？仅「待执行」状态且未生成下游委外发料/收料单据的订单可删除。删除后不可恢复。';
      if(pageId.value===CASS_PAGE) return `确认删除所选的 ${selectedIds.value.length} 条卡塞信息？删除后不可恢复。`;
      if(pageId.value==='mat-medium') return `确认删除所选的 ${selectedIds.value.length} 条物料介质对照记录？删除后不可恢复。`;
      if(pageId.value==='serial-arch') return `确认删除所选的 ${selectedIds.value.length} 条流水码档案？仅库存状态为「初始化」的记录可删，删除后不可恢复。`;
      if(pageId.value==='tank-arch') return `确认删除所选的 ${selectedIds.value.length} 条储罐档案？仅空罐（无物料明细）可删；被业务引用的数据不可删除。`;
      if(pageId.value==='warehouse') return `确认删除所选的 ${selectedIds.value.length} 条${(activeTab.value==='tab2'||(tabView.value||{}).name==='tab2')?'库位':'仓库'}数据？被业务引用的数据不可删除。`;
      if(pageId.value==='stock-warn') return `确认删除所选的 ${selectedIds.value.length} 条预警配置？被业务引用的数据不可删除。`;
      if(pageId.value==='insp-proc') return `确认删除所选的 ${selectedIds.value.length} 条检查工序？已被工艺引用的不可删除。`;
      if(pageId.value==='insp-craft') return `确认删除所选的 ${selectedIds.value.length} 条检查工艺？被业务引用的数据不可删除。`;
      if(pageId.value==='wh-insp-scheme' || pageId.value===LAB_INSP_SCHEME) return '确认删除所选巡检方案？删除后不可恢复。';
      if(pageId.value==='wh-insp-plan') return '确认删除所选巡检计划？删除后不可恢复。';
      if(pageId.value==='carrier') return '确认删除所选承运商？删除后不可恢复。若数据被其他业务引用，则无法删除。';
      if(pageId.value==='vehicle') return '确认删除所选车辆及司机档案？删除后不可恢复。若数据被运单引用，则无法删除。';
      if(pageId.value==='freight') return '确认删除所选运费参照？删除后不可恢复。若数据被运单引用，则无法删除。';
      if(pageId.value==='lg-kpi-scheme') return `确认删除所选的 ${selectedIds.value.length} 个考核方案吗？`;
      if(pageId.value==='lg-kpi-plan') return '确认删除所选的初始考核计划吗？';
      if(pageId.value==='lg-carrier-evt') return '确认删除所选承运商事件？删除后不可恢复。';
      if(pageId.value==='lg-dispatch') return `确认删除所选的 ${selectedIds.value.length} 项派车申请单吗？`;
      if(pageId.value==='lg-ship' && (b.name||'').includes('关闭')) return `确认关闭所选的 ${selectedIds.value.length} 项发货单吗？关闭后将释放并回算来源派车申请单的已拆数量。`;
      if(pageId.value==='lg-ship') return `确认删除所选的 ${selectedIds.value.length} 项发货单吗？删除后将释放并回算来源派车申请单的已拆数量。`;
      if(pageId.value==='wh-so-prep') return '确认删除所选待执行备货通知单？删除后不可恢复。';
      const pam = prodAppMeta();
      if(pam) return '确认删除所选'+pam.label+'？删除后不可恢复。';
      if(pageId.value==='po') return '确认删除所选采购订单？仅「待执行」状态且未生成下游收料单据的订单可删除。删除后不可恢复。';
      if(pageId.value==='so') return '确认删除所选销售订单？仅「待执行」状态且未生成下游单据的订单可删除。删除后不可恢复。';
      return b.name && b.name.includes('关闭') ? '确认关闭所选单据？' : '确认删除所选数据？被业务引用的数据不可删除。';
    }
    const SG_PAGE = 'np-0104-07';
    const SG_ZERO = [
      '不过滤数据（若值不存在/0，不过滤该点，0则默认0，空值取中值）',
      '不过滤数据（若值不存在/0，不过滤该点，均默认0）',
      '部分过滤数据（若值不存在过滤数据，若值为0不过滤该点，0则默认为0）',
      '全部过滤数据（若值不存在/0，均过滤该点）'
    ];
    const SG_ROUND = ['报出值', '实测值'];
    const SG_TAKE = ['所有值', '同批次最差值', '同批次最优值', '同批次平均值', '同批次首样', '同批次尾样'];
    const SG_TYPE = { 'tab-pi': '采购来料', 'tab-pp': '生产过程', 'tab-pm': '生产物料', 'tab-sst': '生产SST', 'tab-rd': '研发', 'tab-ext': '外来小样', 'tab-wr': '库内复检', 'tab-gen': '通用检', 'tab-oe': '内部委托' };
    const sgVisible = ref(false);
    const sgMode = ref('add');
    const sgTab = ref('rule');
    const sgLineSel = ref([]);
    const sgPickVisible = ref(false);
    const sgPickCode = ref('');
    const sgPickName = ref('');
    const sgPickQuery = ref('');
    const sgPickSel = ref([]);
    const sgEditId = ref('');
    const sgForm = reactive({ code:'', name:'', remark:'', enabled:true, zero:SG_ZERO[1], round:'报出值', take:'所有值', xbar:'同批次一组', batchN:null, fixedN:null, schemes:[], creator:'', createdAt:'' });
    const sgTitle = computed(()=> sgMode.value==='add' ? '新增' : (sgMode.value==='detail' ? '详情' : '编辑'));
    const sgSchemeText = computed(()=> (sgForm.schemes||[]).map(r=> r['检验方案名称']).filter(Boolean).join('、') || '—');
    function sgList(){
      const bag = MOCK[SG_PAGE] = MOCK[SG_PAGE] || { main: [] };
      return bag.main || (bag.main = []);
    }
    function sgSchemeCatalog(){
      const bag = MOCK['insp-scheme'] || {};
      const out = [];
      Object.keys(SG_TYPE).forEach(tab=>{
        (bag[tab] || []).forEach(r=>{
          out.push({
            _schemeId: tab + ':' + r.id,
            检验类型: SG_TYPE[tab],
            检验方案编码: r['检验方案编码'] || '',
            检验方案名称: r['检验方案名称'] || '',
            适用采样点: r['适用采样点'] || '',
            适用物料: r['适用物料'] || '',
            适用客户: r['适用客户'] || '',
            适用供应商: r['适用供应商'] || '',
            检验项信息: r['检验项信息'] || '',
            启用状态: r['启用状态'] || '',
            创建人: r['创建人'] || '',
            创建时间: r['创建时间'] || ''
          });
        });
      });
      return out;
    }
    const sgPickRows = computed(()=>{
      sgPickQuery.value;
      const taken = new Set((sgForm.schemes||[]).map(r=> r._schemeId));
      const code = String(sgPickCode.value||'').trim();
      const name = String(sgPickName.value||'').trim();
      return sgSchemeCatalog().filter(r=> !taken.has(r._schemeId) && (!code || String(r['检验方案编码']).includes(code)) && (!name || String(r['检验方案名称']).includes(name)));
    });
    function blankSg(){
      Object.assign(sgForm, { code:'', name:'', remark:'', enabled:true, zero:SG_ZERO[1], round:'报出值', take:'所有值', xbar:'同批次一组', batchN:null, fixedN:null, schemes:[], creator:'', createdAt:'' });
    }
    function openSg(mode, row){
      sgMode.value = mode;
      sgTab.value = 'rule';
      sgLineSel.value = [];
      sgEditId.value = row && row.id || '';
      blankSg();
      if(row){
        const src = sgList().find(r=> r.id===row.id) || row;
        Object.assign(sgForm, {
          code: src['规则编码'] || '',
          name: src['规则名称'] || '',
          remark: src['备注'] || '',
          enabled: src['启用状态'] !== '禁用',
          zero: src._zero || SG_ZERO[1],
          round: src._round || '报出值',
          take: src._take || '所有值',
          xbar: src._xbar || '同批次一组',
          batchN: src._xbar==='同批次一组' ? src._xbarN : null,
          fixedN: src._xbar==='固定子组容量' ? src._xbarN : null,
          schemes: (src._schemes||[]).map(r=> Object.assign({}, r)),
          creator: src['创建人'] || '',
          createdAt: src['创建时间'] || ''
        });
      }
      sgVisible.value = true;
    }
    function openSgPick(){
      sgPickCode.value = '';
      sgPickName.value = '';
      sgPickQuery.value = '';
      sgPickSel.value = [];
      sgPickVisible.value = true;
    }
    function confirmSgPick(){
      if(!sgPickSel.value.length){ ElMessage.warning('请选择一条数据'); return; }
      sgForm.schemes = sgForm.schemes.concat(sgPickSel.value.map(r=> Object.assign({}, r)));
      sgPickVisible.value = false;
    }
    function removeSgSchemes(){
      const ids = new Set(sgLineSel.value.map(r=> r._schemeId));
      sgForm.schemes = sgForm.schemes.filter(r=> !ids.has(r._schemeId));
      sgLineSel.value = [];
    }
    function saveSg(){
      const code = String(sgForm.code||'').trim();
      const name = String(sgForm.name||'').trim();
      if(!code){ ElMessage.warning('请输入规则编码'); return; }
      if(!name){ ElMessage.warning('请输入规则名称'); return; }
      const others = sgList().filter(r=> r.id!==sgEditId.value);
      if(others.some(r=> r['规则编码']===code)){ ElMessage.warning('规则编码已存在'); return; }
      if(others.some(r=> r['规则名称']===name)){ ElMessage.warning('规则名称已存在'); return; }
      const n = sgForm.xbar==='固定子组容量' ? sgForm.fixedN : sgForm.batchN;
      if(n==null || n==='' || Number(n)<0 || Number(n)>25){ ElMessage.warning('请输入 0～25 的整数'); sgTab.value='rule'; return; }
      const taken = new Set();
      others.forEach(r=> (r._schemes||[]).forEach(s=> taken.add(s._schemeId)));
      const clash = (sgForm.schemes||[]).find(s=> taken.has(s._schemeId));
      if(clash){ ElMessage.warning('同一检验方案只能归属一条规则'); sgTab.value='scheme'; return; }
      const payload = {
        规则编码: code,
        规则名称: name,
        适用检验方案: (sgForm.schemes||[]).map(r=> r['检验方案名称']).filter(Boolean).join('、'),
        备注: String(sgForm.remark||'').trim(),
        启用状态: sgForm.enabled ? '启用' : '禁用',
        _zero: sgForm.zero,
        _round: sgForm.round,
        _take: sgForm.take,
        _xbar: sgForm.xbar,
        _xbarN: Number(n),
        _schemes: sgForm.schemes.map(r=> Object.assign({}, r))
      };
      if(sgMode.value==='add'){
        sgList().unshift(Object.assign({ id:'sg-'+Date.now(), 创建人: CI_OPERATOR, 创建时间: nowStamp(), _used:false }, payload));
        ElMessage.success('已新增');
      } else {
        const cur = sgList().find(r=> r.id===sgEditId.value);
        if(!cur){ ElMessage.warning('该规则已不存在'); return; }
        Object.assign(cur, payload);
        ElMessage.success('已保存');
      }
      sgVisible.value = false;
      bumpStore();
    }
    function deleteSg(){
      const rows = sgList().filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> r._used)){ ElMessage.warning('此数据正在使用，不可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确定删除所选 '+rows.length+' 条规则吗？删除后不可恢复。', '提示', { type:'warning', confirmButtonText:'确定', cancelButtonText:'取消' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        MOCK[SG_PAGE].main = sgList().filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 条数据');
      }).catch(()=>{});
    }
