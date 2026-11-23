    function saveAc(){
      const code = String(acForm.code||'').trim();
      const name = String(acForm.name||'').trim();
      if(!code){ ElMessage.warning('请输入方案编码'); return; }
      if(!name){ ElMessage.warning('请输入方案名称'); return; }
      if(!(Number(acForm.days) >= 1)){ ElMessage.warning('请输入执行周期'); return; }
      if(!acForm.start){ ElMessage.warning('请选择计划开始时间'); return; }
      if(acForm.enabled){
        const when = new Date(String(acForm.start).replace(/-/g,'/'));
        if(!isNaN(when.getTime()) && when.getTime() < Date.now()){ ElMessage.warning('计划开始时间不可早于当前时间'); return; }
      }
      if(!String(acForm.mats||'').trim()){ ElMessage.warning('请选择物料信息'); return; }
      if(!(Number(acForm.minN) >= 1)){ ElMessage.warning('请输入最少样本数'); return; }
      acSyncSchemes();
      if(!(acForm.schemes||[]).length){ ElMessage.warning('请选择检验方案'); return; }
      if(!(acForm.metrics||[]).length){ ElMessage.warning('请选择计算指标'); return; }
      const others = acAllRows().filter(r=> r.id!==acEditId.value);
      if(others.some(r=> r['方案编码']===code)){ ElMessage.warning('方案编码已存在'); return; }
      if(others.some(r=> r['方案名称']===name)){ ElMessage.warning('方案名称已存在'); return; }
      const tab = acSaveTab();
      const party = tab==='tab-pi' ? '供应商信息' : (tab==='tab-pm' ? '客户信息' : '');
      const payload = {
        方案编码: code, 方案名称: name, 执行周期: String(acForm.days)+'天', 计划开始时间: acForm.start, 循环方式: acForm.cycle,
        物料信息: acForm.mats, 采样点: acForm.points, 最少样本数: String(acForm.minN),
        检验方案: (acForm.schemes||[]).join('、'), 计算指标: (acForm.metrics||[]).join('、'),
        备注: String(acForm.remark||'').trim(), 启用状态: acForm.enabled ? '启用' : '禁用', _days: Number(acForm.days)
      };
      if(party) payload[party] = acForm.party || '';
      if(acMode.value==='edit'){
        const cur = acBag(activeTab.value).find(r=> r.id===acEditId.value);
        if(!cur){ ElMessage.warning('该方案已不存在'); return; }
        Object.assign(cur, payload);
        ElMessage.success('已保存');
      } else {
        acBag(tab).unshift(Object.assign({ id:'ac-'+Date.now(), 创建人: CI_OPERATOR, 创建时间: nowStamp(), _used:false }, payload));
        ElMessage.success(acMode.value==='copy' ? '已复制到'+AC_TABS[tab] : '已新增');
      }
      acVisible.value = false;
      bumpStore();
    }
    const acRuleVisible = ref(false);
    const acRuleMenu = ref('filter');
    const acRuleId = ref('');
    const AC_RULE_FILTER = [
      { key:'ooc', label:'[N]倍OOC删除' },
      { key:'oos', label:'[N]倍OOS删除' },
      { key:'plus', label:'[N]倍+σ删除' },
      { key:'minus', label:'[N]倍-σ删除' }
    ];
    const AC_RULE_ZERO = [
      '不过滤数据（若值不存在/0，不过滤该点，0侧默认0，空值则中断）',
      '不过滤数据（若值不存在/0，不过滤该点，均默认0）',
      '部分过滤数据（若值不存在过滤该点，若值为0不过滤该点，0侧默认0）',
      '全部过滤数据（若值不存在/0，均过滤该点）'
    ];
    const AC_RULE_ROUND = ['报出值', '实测值'];
    const AC_RULE_TAKE = ['所有值', '同批次最差值', '同批次最优值', '同批次平均值', '同批次首样', '同批次尾样'];
    const AC_RULE_SECS = [
      { key:'zero', title:'I图样本不存在或为0的规则' },
      { key:'round', title:'I图样本值修约规则' },
      { key:'take', title:'I图样本取值方式' },
      { key:'xbar', title:'Xbar/R/S样本取值方式' }
    ];
    const AC_RULE_FILTER_NOTES = [
      { name:'初始化', desc:'默认为空' },
      { name:'过滤规则', desc:'1、若填写多个，同时生效，多重条件一起过滤数据（过滤最终的样本数据）\n2、保存后后续缓存\n3、若该样本点为空值，不进行过滤' },
      { name:'全部清空', desc:'1、点击后，二次弹窗确认\n2、点击后，将设置N全部清空' },
      { name:'字段说明', desc:'1、OOC：删除超出N倍的UCL、LCL\n2、OOS：删除超出N倍的USL、LSL\n3、+σ：删除＞平均值+N倍σ\n4、-σ：删除＜平均值-N倍σ' },
      { name:'数据源', desc:'过滤原始数据台账（样本规格台账）' }
    ];
    const AC_RULE_TOP_NOTES = [
      { name:'默认显示', desc:'1、根据当前所选择的检验方案重查（检验-样本组默认规则）\n2、若未命中，按此处系统默认展示，可修改、修改后，后续缓存\n3、首次，此处按系统默认展示，可修改、修改后，后续缓存' },
      { name:'图表本取值方式', desc:'当选择所有值时，横坐标：批次-样本编号-检验完成时间' }
    ];
    const AC_RULE_GROUP_NOTES = [
      { no:'P0', name:'样本数据的生成规则及优先级', desc:'P1、过滤规则：先通过主页面的查询条件，查询原始数据\nP2、加工中间样本数据：a.若无中间样本数据，根据样本组设置→I图样本取值方式将原始数据加工成中间样本数据；b.中间样本数据的样本值：根据样本组设置→I图样本值修约规则展示结果值；c.二次过滤中间样本数据：根据样本组设置→I图样本不存在或为0的规则过滤数据及最终结果\nP3、生成最终样本数据：根据样本组设置→I图样本过滤设置内设置的规则进行过滤中间样本数据，从而生成最终样本数据' },
      { no:'1', name:'默认显示与数据回显', desc:'1、设置完成后，后端缓存\n2、若为首次，系统根据默认默认带出' },
      { no:'2', name:'I图样本值不存在或为0的规则', desc:'1、单选，系统默认选中「不过滤数据（若值不存在/0，不过滤该点，0侧默认0，空值则中断）」' },
      { no:'3', name:'I图样本值修约规则', desc:'1、单选，系统默认选中「报出值」，可修改\n2、字段解释\n1）报出值：取样点检验台账内的报出值作为结果值\n2）实测值：取样点检验台账内的检验结果值作为结果值' }
    ];
    function acRuleBlank(){
      return { ooc:null, oos:null, plus:null, minus:null, zero:AC_RULE_ZERO[0], round:'报出值', take:'所有值', batchN:null, fixedN:null };
    }
    const acRule = reactive(acRuleBlank());
    function openAcRule(row){
      const src = acBag().find(r=> r.id===row.id) || row;
      acRuleId.value = src.id;
      Object.assign(acRule, acRuleBlank(), src._sampleRule || {});
      acRuleMenu.value = 'filter';
      acRuleVisible.value = true;
    }
    function acRuleClear(){
      srAsk('确定清空全部设置N吗？', ()=>{ acRule.ooc = acRule.oos = acRule.plus = acRule.minus = null; });
    }
    function acRuleRestore(key){
      srAsk('确定恢复默认吗？', ()=>{
        const blank = acRuleBlank();
        if(key==='zero') acRule.zero = blank.zero;
        else if(key==='round') acRule.round = blank.round;
        else if(key==='take') acRule.take = blank.take;
        else { acRule.batchN = null; acRule.fixedN = null; }
      });
    }
    function saveAcRule(){
      const cur = acBag().find(r=> r.id===acRuleId.value);
      if(!cur){ ElMessage.warning('该方案已不存在'); return; }
      cur._sampleRule = { ooc:acRule.ooc, oos:acRule.oos, plus:acRule.plus, minus:acRule.minus, zero:acRule.zero, round:acRule.round, take:acRule.take, batchN:acRule.batchN, fixedN:acRule.fixedN };
      acRuleVisible.value = false;
      bumpStore();
      ElMessage.success('已保存');
    }
    function deleteAc(){
      const rows = acBag().filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> r._used)){ ElMessage.warning('此数据正在使用，不可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确定删除所选 '+rows.length+' 条方案吗？删除后不可恢复。', '提示', { type:'warning', confirmButtonText:'确定', cancelButtonText:'取消' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        MOCK[AC_PAGE][activeTab.value] = acBag().filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 条数据');
      }).catch(()=>{});
    }
    function onToolbar(btn){
      if(pageId.value===BIAS_PAGE){
        if(btn.name==='新增'){ openForm('add'); return; }
        if(btn.name==='批量删除'){
          const set = new Set(selectedIds.value||[]);
          if(!set.size){ ElMessage.warning('请先勾选计划'); return; }
          ElementPlus.ElMessageBox.confirm('确认删除所选 ' + set.size + ' 条计划？', '批量删除', { type:'warning', confirmButtonText:'删除', cancelButtonText:'取消' }).then(()=>{
            const bag = MOCK[BIAS_PAGE] = MOCK[BIAS_PAGE] || {};
            bag.main = (bag.main||[]).filter(r=> !set.has(r.id));
            selectedIds.value = [];
            bumpStore();
            ElMessage.success('已删除');
          }).catch(()=>{});
          return;
        }
        if(btn.name==='导出'){ ElMessage.success('已导出偏倚分析数据'); return; }
      }

      if(pageId.value===AC_PAGE){
        if(btn.name==='新增'){ openAc('add'); return; }
        if(btn.name==='批量删除'){ deleteAc(); return; }
      }
      if(pageId.value===RPT_PAGE){
        if(btn.name==='新增'){ openSr('add'); return; }
        if(btn.name==='批量删除'){ deleteSr(); return; }
      }
      if(pageId.value===SG_PAGE){
        if(btn.name==='新增'){ openSg('add'); return; }
        if(btn.name==='批量删除'){ deleteSg(); return; }
      }
      if(pageId.value==='np-0601-01' && btn.name==='同步数据源'){
        ElMessage.info('属于预留功能与接口，主要实现自动创建批次关联表');
        return;
      }
      if(btn.name==='新增' && pageId.value==='mrb-review'){ openForm('add'); formModel['MRB单号'] = qcNextNo(qcAllRows('mrb-review'), 'MRB单号', 'MRB-'); return; }
      if(btn.name==='新增' && pageId.value==='capa-internal'){ openForm('add'); formModel['整改单号'] = qcNextNo(flowBag('capa-internal', 'main'), '整改单号', 'CA-'); return; }
      if(pageId.value===DRIFT_PAGE && onDriftToolbar(btn)) return;
      if(pageId.value===SPI_PAGE && onSpiToolbar(btn)) return;
      if(isChromLedgerPage() && onChromLedgerToolbar(btn)) return;
      if(pageId.value===CI_PAGE && onCiToolbar(btn)) return;
      if(isAuditPage() && onEaToolbar(btn)) return;
      if(pageId.value===IA_EXEC && onIaeToolbar(btn)) return;
      if(pageId.value===IA_RECT && onIarToolbar(btn)) return;
      if(pageId.value===CIP_PAGE && onCipToolbar(btn)) return;
      if(pageId.value===CHG_PAGE && onChgToolbar(btn)) return;
      if(pageId.value===SR_PAGE){
        if(btn.name==='复核'){ openSrReview(bxPicked()); return; }
        if(btn.name==='新增' || btn.name==='批量删除' || btn.name==='导出数据'){ if(csPage().onToolbar(btn)) return; }
      }
      if(pageId.value===HM_IMP_PAGE){
        if(btn.name==='新增'){ openForm('add'); return; }
        if(btn.name==='批量删除'){ deleteHmImp(); return; }
        if(btn.name==='导出数据'){ exportVisible.value = true; return; }
      }
      if(pageId.value===HM_VOID_PAGE){
        if(btn.name==='新增'){ openForm('add'); return; }
        if(btn.name==='批量删除'){ deleteHmVoid(); return; }
        if(btn.name==='导出数据'){ exportVisible.value = true; return; }
      }
      if(pageId.value===HM_CHG_PAGE){
        if(btn.name==='新增'){ openForm('add'); return; }
        if(btn.name==='批量删除'){ deleteHmChg(); return; }
        if(btn.name==='导出数据'){ exportVisible.value = true; return; }
      }
      if(pageId.value===HM_ARCH_PAGE){
        if(btn.name==='新增' && btn._fromTree){ openForm('新增类型'); return; }
        if(btn.name==='新增'){ openForm('add'); return; }
        if(btn.name==='批量删除'){ deleteHmArch(); return; }
        if(btn.name==='导出数据'){ exportVisible.value = true; return; }
      }
      if(pageId.value===HM_BIN_PAGE && btn.name==='导出数据'){ exportVisible.value = true; return; }
      if(csPage() && csPage().onToolbar(btn)) return;
      if(pageId.value==='insp-order' && btn.name==='隐藏'){ hideInspOrders(); return; }
      if(pageId.value==='insp-order' && btn.name==='显示'){ openHiddenOrders(); return; }
      if(HIDE_PAGES.has(pageId.value) && btn.name==='隐藏'){ hideTableRows(); return; }
      if(HIDE_PAGES.has(pageId.value) && btn.name==='显示'){ openHiddenRowsList(); return; }
      if(pageId.value===COL_PAGE && onColToolbar(btn)) return;
      if(pageId.value===INST_PAGE && onInstToolbar(btn)) return;
      if(btn.name==='新增' && pageId.value===SPLIT_PAGE){ openForm('add'); return; }
      if(pageId.value===SLOC_PAGE){
        const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
        if(btn.name==='批量处置'){ openSlocLoc('disp', picked); return; }
        if(btn.name==='入位'){ openSlocLoc('in', picked); return; }
        if(btn.name==='领用'){ openSlocLoc('take', picked); return; }
      }
      if(pageId.value===FLOW_MY_TASK && btn.name==='排程'){
        const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
        sb.splitKw = picked.length ? String(picked[0]['样品编号']||'') : '';
        schedSplitVisible.value = true;
        return;
      }
      if(pageId.value===FLOW_MY_TASK && btn.name==='批量反馈时间'){ openFbBatch(); return; }
      if(pageId.value===COST_FLOW){
        if(btn.name==='批量编辑'){ openCostFlowBatch(); return; }
        if(btn.name==='导出' || btn.name==='导出数据'){ exportVisible.value = true; return; }
      }
      if(pageId.value===YL_PAGE && activeTab.value==='tab-2'){
        if(btn.name==='新增'){ ylAddOpen(); return; }
        if(btn.name==='批量删除'){ ylUsageDelete(); return; }
      }
      if(pageId.value===DEV_PAGE && btn.name==='新增'){ openDevReq([]); return; }
      if(pageId.value===DEV_PAGE && btn.name==='发起需求'){ launchDevReqs(); return; }
      if(pageId.value===DEV_PAGE && btn.name==='批量删除'){ deleteDevReqs(); return; }
      if(pageId.value===DEV_PAGE && btn.name==='批量关闭'){ closeDevReqs(); return; }
      if(pageId.value===PLATE_PAGE && btn.name==='新增'){ openPlateReq([]); return; }
      if(pageId.value===PLATE_PAGE && btn.name==='发起需求'){ launchPlateReqs(); return; }
      if(pageId.value===PLATE_PAGE && btn.name==='批量删除'){ deletePlateReqs(); return; }
      if(pageId.value===PLATE_PAGE && btn.name==='批量关闭'){ closePlateReqs(); return; }
      if(pageId.value===CASS_PAGE && btn.name==='新增'){ openCassForm(); return; }
      if(pageId.value===CASS_PAGE && btn.name==='批量删除'){ deleteCassRows(); return; }
      if(pageId.value===MATRIX_PAGE && btn.name==='单项累计权重设置'){ openMatrixWeight(); return; }
      if(pageId.value===OQC_PAGE && btn.name==='上传附件'){ openOqcUpload((tableData.value||[]).filter(r=> selectedIds.value.includes(r.id))); return; }
      if(pageId.value===OQC_PAGE && (btn.name==='删除' || btn.name==='关闭')){ oqcRemove(btn.name==='关闭'); return; }
      if(pageId.value===COST_PAGE && btn.name==='新增'){ openCostForm(); return; }
      if(pageId.value===COST_PAGE && btn.name==='批量删除'){ deleteCostRules(); return; }
      if(pageId.value===LAB_INSP_SCHEME && btn.name==='批量删除'){ deleteLabInspSchemes(); return; }
      if(isDjSchemePage() && btn.name==='批量删除'){ deleteDjSchemes(); return; }
      if(isDjPlanPage() && btn.name==='批量删除'){ deleteDjPlans(); return; }
      if(isDjPlanPage() && btn.name==='关闭'){ closeDjPlans(); return; }
      if(isDjPlanPage() && btn.name==='关联查询'){ linkLabInspQuery(); return; }
      if(isDjMyPage() && btn.name==='关联查询'){ linkDjMyRecords(); return; }
      if(pageId.value===WJ_ORDER && btn.name==='批量删除'){ deleteWjOrders(); return; }
      if(pageId.value===WJ_ORDER && btn.name==='关闭'){ closeWjOrders(); return; }
      if(pageId.value===WJ_ORDER && btn.name==='关联查询'){ linkWjOrders(); return; }
      if(pageId.value===WX_PAGE && btn.name==='批量删除'){ deleteWxRows(); return; }
      if(pageId.value===WX_PAGE && btn.name==='关闭'){ closeWxRows(); return; }
      if(pageId.value===WX_PAGE && btn.name==='新增'){ openForm('add'); return; }
      if(pageId.value===BX_PAGE){
        if(btn.name==='新增'){ openBxForm('add'); return; }
        if(btn.name==='关联查询'){ openBxLink(); return; }
        if(btn.name==='关闭'){ closeBxRows(); return; }
        if(btn.name==='批量删除'){ deleteBxRows(); return; }
      }
      if(pageId.value===CL_PAGE){
        if(btn.name==='批量处理'){ openClDlg(bxPicked(), true); return; }
        if(btn.name==='关联查询'){ openBxLink(); return; }
      }
      if(pageId.value===WO_PAGE){
        if(btn.name==='手动新增'){ openWoForm('add'); return; }
        if(btn.name==='关联查询'){ openBxLink(); return; }
        if(btn.name==='关闭'){ closeWoRows(); return; }
        if(btn.name==='批量删除'){ deleteWoRows(); return; }
        if(btn.name==='批量添加至经验库'){ addRecsToExp(); return; }
      }
      if(pageId.value===MY_WX_PAGE && btn.name==='关联查询'){ openBxLink(); return; }
      if(pageId.value===MSA_PAGE){
        if(btn.name==='新增'){ openMsaForm('add'); return; }
        if(btn.name==='下载报告'){ downloadMsaReports(); return; }
        if(btn.name==='关闭'){ closeMsaRows(); return; }
        if(btn.name==='批量删除'){ deleteMsaRows(); return; }
      }
      if(pageId.value===STB_PAGE){
        if(btn.name==='新增'){ openStbForm('add'); return; }
        if(btn.name==='下载报告'){ downloadStbReports(); return; }
        if(btn.name==='关闭'){ closeStbRows(); return; }
        if(btn.name==='批量删除'){ deleteStbRows(); return; }
        if(btn.name==='导出数据'){ exportVisible.value = true; return; }
      }
      if(pageId.value===BIAS_PAGE){
        if(btn.name==='新增'){ openBiasForm('add'); return; }
        if(btn.name==='批量删除'){ deleteBiasRows(); return; }
        if(btn.name==='导出'){ exportVisible.value = true; return; }
      }
      if(isTyPage()){
        if(btn.name==='新增'){ openTyForm('add'); return; }
        if(btn.name==='批量发起审批'){ openTyAp(bxPicked(), true); return; }
        if(btn.name==='批量删除'){ deleteTyRows(); return; }
      }
      if(pageId.value===YS_PAGE){
        if(btn.name==='批量验收'){ openYsDlg(bxPicked(), true); return; }
        if(btn.name==='关联查询'){ openBxLink(); return; }
      }
      if(pageId.value===LAB_INSP_PLAN && btn.name==='批量删除'){ deleteLabInspPlans(); return; }
      if(pageId.value===LAB_INSP_PLAN && btn.name==='关闭'){ closeLabInspPlans(); return; }
      if(pageId.value===LAB_INSP_PLAN && btn.name==='关联查询'){ linkLabInspQuery(); return; }
      if(isLabCountPage() && btn.name==='批量删除'){ deleteLabCountScan(); return; }
      if(isLabCountPage() && btn.name==='关闭'){ closeLabCountScan(); return; }
      if(pageId.value===LAB_PREP || pageId.value===LAB_CALIB){
        const prep = pageId.value===LAB_PREP;
        if(btn.name==='关联查询'){ linkLabPlanQuery(prep ? '配液单号' : '标定单号'); return; }
        if(btn.name==='关闭'){ closeLabPlanOrders(prep ? '配液单' : '标定单'); return; }
        if(btn.name==='批量删除'){ deleteLabPlanOrders(pageId.value, prep ? '配液单' : '标定单'); return; }
      }
      if(isLabRgIoPage() && btn.name==='关联查询'){ linkLabRgIoQuery(); return; }
      if(isLabRgIoPage() && btn.name==='关闭'){ closeLabRgIoOrders(); return; }
      if(isLabRgIoPage() && btn.name==='批量删除'){ deleteLabRgIoOrders(); return; }
      if(pageId.value===DISPATCH_PAGE && btn.name==='批量删除'){
        const ids = new Set(selectedIds.value);
        if(!ids.size){ ElMessage.warning('请先勾选要删除的方案'); return; }
        ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条派单方案？已分配的任务不受影响，待分配的任务将重新匹配。', '批量删除', { type:'warning' }).then(()=>{
          const list = (MOCK[DISPATCH_PAGE]||{}).main || [];
          for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
          selectedIds.value = [];
          bumpStore();
          ElMessage.success('已删除 '+ids.size+' 条派单方案');
        }).catch(()=>{});
        return;
      }
      if(pageId.value===TASK_PAGE && activeTab.value==='tab-1'){
        const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
        if(btn.name==='自动分配'){ taskAutoAssign(picked); return; }
        if(btn.name==='批量分配'){ openTaskAssign(picked, '批量分配 / 调整'); return; }
      }
      if(pageId.value===TIME_FB_PAGE && activeTab.value==='tab-1'){
        const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
        if(btn.name==='批量同步'){ openTimeFbSync(picked, '批量同步'); return; }
      }
      if(pageId.value===SLPOS_PAGE){
        const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
        if(btn.name==='新增'){
          openForm('add');
          if(activeTab.value==='tab-1') formModel['库位类型'] = '样品货架';
          return;
        }
        if(btn.name==='打印标签'){ openPrintLabel(picked); return; }
        if(btn.name==='批量删除'){ deleteSlposRows(picked); return; }
      }
      if(btn.name==='批量删除' && pageId.value===SPLIT_PAGE){
        deleteSampSplitChildren((tableData.value||[]).filter(r=> selectedIds.value.includes(r.id)));
        return;
      }
      if(btn.name==='新增' && isLabArchPage()){ openLabArch(); return; }
      if(btn._fromTree && pageId.value==='tag-config' && btn.name==='新增'){
        openForm('新增标签类型');
        return;
      }
      if(btn._fromTree && pageId.value==='form-data-source' && btn.name==='新增'){
        openForm('新增数据源');
        return;
      }
      if(btn._fromTree && pageId.value==='form-setting' && btn.name==='新增'){
        openForm('新增表单类型');
        return;
      }
      if(btn._fromTree && btn.name==='新增' && page.value?.treeField){
        openForm('新增类型');
        return;
      }
      if(btn.name==='同步IOT平台' && pageId.value==='opc-point'){
        ElementPlus.ElMessageBox.confirm(
          '请确认是否同步至IOT平台？\nIOT平台数据将执行全部清空和新增。',
          '同步IOT平台',
          { type: 'warning', confirmButtonText: '确认同步', cancelButtonText: '取消', dangerouslyUseHTMLString: false }
        ).then(()=>{
          const bag = (MOCK['opc-point'] = MOCK['opc-point'] || {});
          const list = (bag.main = bag.main || []);
          list.forEach(r=>{ r['同步状态'] = '已同步'; });
          bumpStore();
          ElMessage.success('同步IOT平台成功');
        }).catch(()=>{});
        return;
      }
      if(btn.name==='关联查询' && pageId.value==='np-0501-01'){
        const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
        if(!picked.length){ ElMessage.warning('请先勾选监测方案'); return; }
        const names = [...new Set(picked.map(r=> r['过程监测名称']).filter(Boolean))];
        envMonRelPending = { page:'np-0502-01', field:'过程监测名称', value: names.join('、') };
        loadPage('np-0502-01');
        ElMessage.success('已跳转监测参数台账，按过程监测名称 '+names.join('、')+' 过滤');
        return;
      }
      if(btn.name==='关联查询' && pageId.value==='np-0502-01'){
        const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
        if(!picked.length){ ElMessage.warning('请先勾选监测参数'); return; }
        const codes = [...new Set(picked.map(r=> r['过程监测编码']).filter(Boolean))];
        envMonRelPending = { page:'np-0501-01', field:'过程监测编码', value: codes.join('、') };
        loadPage('np-0501-01');
        ElMessage.success('已跳转监测方案设置，按过程监测编码 '+codes.join('、')+' 过滤');
        return;
      }
      if(btn.name==='关联查看' && pageId.value==='opc-point'){
        const picked = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
        if(picked.length!==1){ ElMessage.warning(picked.length ? '请只勾选一条点位' : '请先勾选一条点位'); return; }
        const name = picked[0]['点位名称'];
        opcRel.point = name;
        opcRel.rows = ((MOCK['gather-item']||{}).main||[]).filter(r=> r['点位名称']===name);
        opcRel.visible = true;
        return;
      }
      if(page.value?.layout==='dict-split' && (btn.name==='新增'||btn.name==='导入') && !isDictLeafType(dictTypeId.value)){
        ElMessage.warning('请先选择字典类型'); return;
      }
      if(btn.name==='新增' || btn.name==='添加仓库' || btn.name==='添加物料'){
        if(pageId.value==='stock-warn' && (btn.name==='添加仓库' || btn.name==='添加物料')){
          openPicker(btn.name==='添加仓库' ? '预警仓库' : '预警物料');
          return;
        }
        if(pageId.value==='form-data-source' && btn.name==='新增'){
          if(!treeListId.value){ ElMessage.warning('请先选择左侧资源'); return; }
          openForm('add');
          formModel['关联表单数据源'] = treeListId.value;
          formSwitch['是否主键'] = false;
          formSwitch['是否可修改'] = true;
          return;
        }
        if(pageId.value==='form-setting' && btn.name==='新增'){
          if(!treeListId.value){ ElMessage.warning('请先选择左侧表单类型'); return; }
          openForm('add');
          formModel['表单类型'] = treeListId.value;
          if(!formModel['版本号']) formModel['版本号'] = 'V1.0';
          return;
        }
        openForm('add'); return;
      }
      if(btn.name==='批量新增'){
        if(!(page.value?.batchAddFields||[]).length){
          ElMessage.warning('本页暂无批量新增配置'); return;
        }
        resetBatchCtx();
        Object.keys(batchForm).forEach(k=>delete batchForm[k]);
        (page.value.batchAddFields||[]).forEach(f=>{
          if(f.name==='条码生成个数') batchForm[f.name] = '3';
          else if(f.type==='number-unit'){
            batchForm[f.name] = '';
            batchForm[f.unitName || (f.name+'单位')] = f.defaultUnit || '天';
          }
          else batchForm[f.name] = '';
        });
        batchLines.value=[]; batchSelected.value=[];
        batchVisible.value=true; return;
      }
      if(btn.name==='打印标签' || btn.name==='打印'){
        if(btn.name==='打印标签' && pageId.value==='tank-arch' && !selectedIds.value.length){
          ElementPlus.ElMessageBox.confirm('未勾选数据，将打印当前列表全部储罐标签，是否继续？','打印确认',{
            confirmButtonText:'继续打印', cancelButtonText:'取消', type:'info'
          }).then(()=>{ openPrintLabel(tableData.value); }).catch(()=>{});
        return;
      }
        if(btn.name==='打印标签' && !selectedIds.value.length){ ElMessage.warning('请先勾选需要打印的数据'); return; }
        openPrintLabel((tableData.value||[]).filter(r=> selectedIds.value.includes(r.id)));
        return;
      }
      if(btn.name==='打印随车发货单'){
        openConsignPrint();
        return;
      }
      if(btn.name==='合并下发运单'){
        if(!canMergeShip.value){ ElMessage.warning('请勾选待调度状态的发货单后再合并下发'); return; }
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        mergeShipRows.value = rows;
        const first = rows[0] || {};
        mergeForm.承运商名称 = '';
        mergeForm.计划装货时间 = '';
        mergeForm.运输类型 = '专车';
        mergeForm.运费单价 = lookupFreightPrice(first['装货点'], first['卸货点']);
        mergeVisible.value = true;
        return;
      }
      if(btn.name==='关闭' && pageId.value==='lg-dispatch'){
        if(!canCloseDispatch.value){ ElMessage.warning('请勾选待执行或执行中的派车申请单后再关闭'); return; }
        const ids = new Set(selectedIds.value);
        ElementPlus.ElMessageBox.confirm(`确认关闭所选的 ${ids.size} 项派车申请单吗？关闭后不可恢复。`, '提示', {
          confirmButtonText:'确认', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          ((MOCK['lg-dispatch']||{}).main||[]).forEach(r=>{ if(ids.has(r.id)) r['状态'] = '已关闭'; });
          selectedIds.value = [];
          bumpStore();
          ElMessage.success('派车申请单已关闭');
        }).catch(()=>{});
        return;
      }
      if(btn.name==='关闭' && pageId.value==='lg-ship'){
        if(!canCloseShip.value){ ElMessage.warning('请勾选待调度状态的发货单后再关闭'); return; }
        const ids = new Set(selectedIds.value);
        ElementPlus.ElMessageBox.confirm(`确认关闭所选的 ${ids.size} 项发货单吗？关闭后将释放并回算来源派车申请单的已拆数量。`, '提示', {
          confirmButtonText:'确认', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const closed = [];
          ((MOCK['lg-ship']||{}).main||[]).forEach(r=>{
            if(ids.has(r.id)){ r['状态'] = '已关闭'; closed.push(r); }
          });
          releaseShipsFromDispatch(closed);
          selectedIds.value = [];
          bumpStore();
          ElMessage.success('发货单已关闭，已回算更新派车申请单拆分数量');
        }).catch(()=>{});
        return;
      }
      if(btn.name==='结算' && pageId.value==='lg-waybill'){
        if(!selectedIds.value.length){ ElMessage.warning('请至少勾选一条结算状态为【待结算】的运单进行结算'); return; }
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        if(rows.some(r=> r['结算状态']!=='待结算')){ ElMessage.warning('勾选列表中包含非【待结算】结算状态的运单，请重新筛选勾选'); return; }
        openSettleModal();
        return;
      }
      if(btn.name==='关闭' && pageId.value==='lg-waybill'){
        if(!canCloseWaybill.value){ ElMessage.warning('请勾选待派车或待运输的运单后再关闭'); return; }
        ElementPlus.ElMessageBox.confirm('确认关闭勾选的运单？关闭后关联的发货单将解除锁定并恢复为待下发状态。', '提示', {
          confirmButtonText:'确认关闭', cancelButtonText:'返回', type:'warning'
        }).then(()=>{
          const ids = new Set(selectedIds.value);
          ((MOCK['lg-waybill']||{}).main||[]).forEach(r=>{
            if(!ids.has(r.id)) return;
            unlockShipsOfWaybill(r);
            r['状态'] = '已关闭';
            if(STORE && r['运单号']) STORE.setDocStatus(r['运单号'], '已关闭', { source:'PC', action:'close' });
            patchPickupsByWaybill(r['运单号'], { 状态: '已关闭', 打卡备注: '运单关闭，提货取消' });
            patchSignsByWaybill(r['运单号'], { 状态: '已关闭', 打卡备注: '运单关闭，签收取消' }, true);
          });
          selectedIds.value = [];
          bumpStore();
          ElMessage.success('已成功关闭勾选的运单');
        }).catch(()=>{});
        return;
      }
      if(btn.name==='关闭' && pageId.value==='wh-insp-plan'){
        if(!canCloseInspPlan.value){ ElMessage.warning('请勾选待执行或执行中的巡检计划后再关闭'); return; }
        ElementPlus.ElMessageBox.confirm('确认关闭所选巡检计划？关闭后该任务不可继续执行。', '关闭确认', {
          confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          tableData.value.filter(r=> selectedIds.value.includes(r.id)).forEach(r=>{
            r['计划状态'] = '已关闭';
          });
          selectedIds.value = [];
          bumpStore();
          ElMessage.success('所选巡检计划已关闭');
        }).catch(()=>{});
        return;
      }
      if(btn.name==='关闭' && isWhNoticePage()){
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
        if(rows.some(r=> !['待执行','执行中'].includes(r['单据状态']))){
          const tip = isOsPoPage() ? '所选单据包含已关闭数据，无法关闭' : (pageId.value==='wh-po-ret' ? '所选单据包含已关闭数据，无法关闭' : '仅「待执行」或「执行中」的收料通知单可关闭');
          ElMessage.warning(tip); return;
        }
        const meta = isOsPoPage() ? osNoticeMeta() : null;
        const closeMsg = meta ? ('确认关闭所选' + meta.label + '？关闭后未完成明细行将同步关闭。')
          : (pageId.value==='wh-po-ret' ? '确认关闭所选采购退料通知单？关闭后未完成明细行将同步关闭。' : `确认关闭所选的 ${rows.length} 项采购收料通知单吗？`);
        ElementPlus.ElMessageBox.confirm(closeMsg, '关闭确认', {
          confirmButtonText:'确认关闭', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const ids = new Set(selectedIds.value);
          const pid = pageId.value;
          ((MOCK[pid]||{}).tab1||[]).forEach(r=>{
            if(!ids.has(r.id)) return;
            r['单据状态']='已关闭';
            if(Array.isArray(r._lines)) r._lines = r._lines.map(ln=> ({...ln, 行状态:'已关闭', 未完成数量:'0.00'}));
          });
          selectedIds.value = [];
          bumpStore();
          ElMessage.success(meta ? '关闭成功' : (pageId.value==='wh-po-ret' ? '关闭成功' : '收料通知单已关闭'));
        }).catch(()=>{});
        return;
      }
      if(btn.name==='关闭' && isProdWhPage()){
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
        if(rows.some(r=> !['待执行','执行中'].includes(r['单据状态']))){
          ElMessage.warning('所选单据包含已关闭数据，无法关闭'); return;
        }
        const meta = prodAppMeta();
        ElementPlus.ElMessageBox.confirm('确认关闭所选'+meta.label+'？关闭后未完成明细行将同步关闭。', '关闭确认', {
          confirmButtonText:'确认关闭', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const ids = new Set(selectedIds.value);
          const pid = pageId.value;
          ((MOCK[pid]||{}).tab1||[]).forEach(r=>{
            if(!ids.has(r.id)) return;
            r['单据状态']='已关闭';
            if(Array.isArray(r._lines)){
              r._lines = r._lines.map(ln=>{
                if(['已完成','已关闭'].includes(ln['行状态'])) return {...ln};
                return {...ln, 行状态:'已关闭', 未完成数量:'0.00'};
              });
            }
          });
          selectedIds.value = [];
          bumpStore();
          ElMessage.success('关闭成功');
        }).catch(()=>{});
        return;
      }
      if(btn.name==='关闭' && isRestWhNoticePage()){
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
        const sk = restWhStatusKey();
        if(rows.some(r=> !['待执行','执行中'].includes(r[sk]))){
          ElMessage.warning('所选单据包含不可关闭数据'); return;
        }
        ElementPlus.ElMessageBox.confirm('确认关闭所选单据？关闭后未完成明细行将同步关闭。', '关闭确认', {
          confirmButtonText:'确认关闭', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const ids = new Set(selectedIds.value);
          restWhDocList().forEach(r=>{
            if(!ids.has(r.id)) return;
            r[sk]='已关闭';
            if(Array.isArray(r._lines)){
              r._lines = r._lines.map(ln=>{
                if(['已完成','已关闭'].includes(ln['行状态'])) return {...ln};
                return {...ln, 行状态:'已关闭', 未完成数量:'0.00'};
              });
            }
          });
          selectedIds.value = [];
          bumpStore();
          ElMessage.success('关闭成功');
        }).catch(()=>{});
        return;
      }
      if(btn.name==='刷新'){
        bumpStore();
        ElMessage.success('已刷新');
        return;
      }
      if(btn.name==='关闭' && pageId.value==='capa-internal'){
        if(!selectedIds.value.length){ ElMessage.warning('请先勾选整改单'); return; }
        if(!canCapaClose.value){ ElMessage.warning('仅待发起状态可关闭'); return; }
        openForm('capa-close');
        formModel['关闭说明'] = '';
        return;
      }
      if(btn.name==='批量删除' && pageId.value==='capa-internal'){
        if(!selectedIds.value.length){ ElMessage.warning('请先勾选整改单'); return; }
        if(!canCapaBatchDelete.value){ ElMessage.warning('仅待发起状态可批量删除'); return; }
      }
      if(btn.name==='关闭' && pageId.value==='np-0201-01'){
        if(!selectedIds.value.length){ ElMessage.warning('请先勾选数据'); return; }
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        if(rows.some(r=> !['待审批','已驳回'].includes(r['单据状态']))){
          ElMessage.warning('仅待审批、已驳回的未检放行单可关闭'); return;
        }
      }
      if(btn.name==='关闭' && pageId.value==='np-0201-02'){
        if(!selectedIds.value.length){ ElMessage.warning('请先勾选数据'); return; }
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        if(rows.some(r=> r['单据状态']!=='未完成')){
          ElMessage.warning('仅未完成的内部委托单可关闭'); return;
        }
      }
      if(pageId.value==='insp-order' && activeTab.value==='tab-oe' && (btn.name==='关闭' || btn.name.includes('删除'))){
        if(!selectedIds.value.length){ ElMessage.warning('请先勾选数据'); return; }
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        if(btn.name==='关闭' && rows.some(r=> !['待执行','执行中'].includes(r['单据状态']))){
          ElMessage.warning('仅待执行、执行中的报检单可关闭'); return;
        }
        if(btn.name.includes('删除') && rows.some(r=> r['单据状态']!=='待执行')){
          ElMessage.warning('仅待执行的内部委托报检单可删除'); return;
        }
      }
      if(pageId.value==='np-0201-02' && (btn.name.includes('删除') || btn.name==='删除勾选')){
        const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
        if(rows.some(r=> r['单据状态']!=='未完成')){
          ElMessage.warning('仅未完成的内部委托单可删除'); return;
        }
      }
      if(pageId.value==='cl-record' && btn.name==='批量删除'){ clRecordBatchDelete(); return; }
      if(btn.name.includes('删除') || btn.name==='关闭' || btn.name==='删除勾选'){
        if(!selectedIds.value.length){
          ElMessage.warning(pageId.value==='carrier' ? '请先勾选数据进行批量删除' : '请先勾选数据');
          return;
        }
        if(pageId.value==='np-0501-01' && btn.name.includes('删除')){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['采集状态']!=='关闭')){
            ElMessage.warning('仅关闭状态可删除');
            return;
          }
        }
        if(pageId.value==='lg-dispatch'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> !(r['审核状态']==='待审核' && r['状态']==='待执行'))){
            ElMessage.warning('仅待审核且待执行的派车申请单可删除'); return;
          }
        }
        if(pageId.value==='lg-ship'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['状态']!=='待调度')){
            ElMessage.warning('仅待调度状态的发货单可删除'); return;
          }
        }
        if(pageId.value==='wwpo'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['订单状态']!=='待执行')){
            ElMessage.warning('仅待执行状态的委外加工订单可删除'); return;
          }
          if(rows.some(r=> wwpoDownstreamInUse(r['委外订单号']))){
            ElMessage.warning('已产生下游委外发料/收料单据，不可删除'); return;
          }
        }
        if(pageId.value==='wh-so-prep'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['备货状态']!=='待执行')){
            ElMessage.warning('仅待执行状态的备货通知单可删除'); return;
          }
        }
        if(pageId.value==='wh-insp-scheme'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['启用状态']==='启用')){
            ElMessage.warning('仅未启用的巡检方案可删除'); return;
          }
        }
        if(pageId.value==='lg-kpi-plan'){
          if(!canDeleteKpiPlan.value){ ElMessage.warning('仅复核状态为置空的初始考核计划可删除'); return; }
        }
        if(pageId.value==='lg-kpi-scheme'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> kpiSchemeInUse(r['方案名称']))){
            ElMessage.warning('该考核方案已关联执行计划，不可删除'); return;
          }
        }
        if(pageId.value==='mat-list'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> matCodeInUse(r['物料编码']))){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value==='mat-uom'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> matUomInUse(r))){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value==='customer'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> customerInUse(r))){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value==='supplier'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> supplierInUse(r))){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value===MAINT_TEAM_PAGE || pageId.value===MAINT_PERSON_PAGE || pageId.value===FAULT_TYPE_PAGE){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          const inUse = { [MAINT_TEAM_PAGE]: maintTeamInUse, [MAINT_PERSON_PAGE]: maintPersonInUse, [FAULT_TYPE_PAGE]: faultTypeInUse }[pageId.value];
          if(rows.some(inUse)){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value==='unit'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> unitInUse(r))){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value==='opc-point'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          const used = ((MOCK['gather-item']||{}).main||[]);
          if(rows.some(r=> used.some(x=> x['点位名称']===r['点位名称']))){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value==='gather-item'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          const schemes = ((MOCK['gather-scheme']||{}).main||[]);
          if(rows.some(r=> schemes.some(s=> (s._lines||[]).some(l=> l['采集项编码']===r['采集项编码'])))){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value==='gather-scheme'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          const inUse = rows.some(r=>{
            const code = String(r['采集方案编码']||'').trim();
            const name = String(r['采集方案名称']||'').trim();
            if(!code && !name) return false;
            return walkMockInUse(['gather-scheme'], x=>{
              if(!x || typeof x!=='object') return false;
              return [x['采集方案'], x['采集方案名称'], x['采集方案编码'], x['授权采集方案']].some(v=>{
                const s = String(v||'').trim();
                return !!s && (s===code || s===name);
              });
            });
          });
          if(inUse){
            ElMessage.warning('此数据正在使用，不可删除');
            return;
          }
        }
        if(pageId.value==='dict'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> dictItemInUse(r))){
            ElMessage.warning('此数据正在使用中，不可删除');
            return;
          }
        }
        if(pageId.value==='po'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['订单状态']!=='待执行')){
            ElMessage.warning('仅待执行状态且无下游单据关联的订单可删除'); return;
          }
          if(rows.some(r=> poDownstreamInUse(r['采购订单号']))){
            ElMessage.warning('已产生下游收料单据，不可删除'); return;
          }
        }
        if(pageId.value==='so'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['订单状态']!=='待执行')){
            ElMessage.warning('仅待执行状态且无下游单据的订单可删除'); return;
          }
          if(rows.some(r=> soDownstreamInUse(r['销售订单号']))){
            ElMessage.warning('已产生下游单据，不可删除'); return;
          }
        }
        if(pageId.value==='serial-arch'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['库存状态']!=='初始化')){
            ElMessage.warning('仅库存状态为「初始化」的流水码可删除'); return;
          }
        }
        if(pageId.value==='tank-arch'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> !tankArchIsEmpty(r))){
            ElMessage.warning('仅空罐（无物料明细）的储罐档案可删除'); return;
          }
          const inUse = rows.some(r=>{
            const no = String(r['储罐编号']||'').trim();
            if(!no) return false;
            return walkMockInUse(['tank-arch'], row=>{
              if(!row || typeof row!=='object') return false;
              return String(row['关联储罐']||'')===no || String(row['储罐']||'')===no;
            });
          });
          if(inUse){ ElMessage.warning('所选储罐已被业务引用，不可删除'); return; }
        }
        if(isWhNoticePage()){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['单据状态']!=='待执行')){
            ElMessage.warning(isOsPoPage() ? '仅待执行状态的单据可删除' : (pageId.value==='wh-po-ret' ? '仅待执行状态的单据可删除' : '仅「待执行」状态的收料通知单可删除')); return;
          }
          if(rows.some(r=> whNoticeHasDownstream(r['单号']))){
            ElMessage.warning('已产生下游执行/流水记录，不可删除'); return;
          }
        }
        if(isProdWhPage()){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> r['单据状态']!=='待执行')){
            ElMessage.warning('仅待执行状态的单据可删除'); return;
          }
          if(pageId.value==='wh-prod-issue'){
            const nos = new Set(rows.map(r=> r['单号']));
            const hasDown = ((MOCK['wh-prod-issue']||{}).tab2||[]).some(r=> nos.has(r['关联领料申请单号']));
            if(hasDown){ ElMessage.warning('已产生下游出库记录，不可删除'); return; }
          }
          if(pageId.value==='wh-prod-ret'){
            const nos = new Set(rows.map(r=> r['单号']));
            const hasDown = ((MOCK['wh-prod-ret']||{}).tab2||[]).some(r=> nos.has(r['关联退料申请单号']));
            if(hasDown){ ElMessage.warning('已产生下游入库记录，不可删除'); return; }
          }
          if(pageId.value==='wh-prod-in'){
            const nos = new Set(rows.map(r=> r['单号']));
            const hasDown = ((MOCK['wh-prod-in']||{}).tab2||[]).some(r=> nos.has(r['关联入库申请单号']));
            if(hasDown){ ElMessage.warning('已产生下游入库记录，不可删除'); return; }
          }
          if(pageId.value==='wh-direct-xfer'){
            const nos = new Set(rows.map(r=> r['单号']));
            const hasDown = ((MOCK['wh-direct-xfer']||{}).tab2||[]).some(r=> nos.has(r['关联调拨申请单号']));
            if(hasDown){ ElMessage.warning('已产生下游入库记录，不可删除'); return; }
          }
        }
        if(isRestWhNoticePage()){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          const sk = restWhStatusKey();
          if(rows.some(r=> r[sk]!=='待执行')){
            ElMessage.warning('仅待执行状态的单据可删除'); return;
          }
          if(isLoadPage() && activeTab.value==='tab1'){
            const nos = new Set(rows.map(r=> r['单号']));
            if(((MOCK['wh-load']||{}).tab2||[]).some(r=> nos.has(r['关联装卸通知单号']))){
              ElMessage.warning('已产生下游装卸单，不可删除'); return;
            }
          }
        }
        if(pageId.value==='warehouse'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> warehouseInUse(r))){ ElMessage.warning('此数据正在使用，不可删除'); return; }
        }
        if(pageId.value==='stock-warn'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> stockWarnInUse(r))){ ElMessage.warning('此数据正在使用，不可删除'); return; }
        }
        if(pageId.value==='insp-proc'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> inspProcInUse(r))){ ElMessage.warning('线路已被正常引用，不可删除'); return; }
        }
        if(pageId.value==='insp-craft'){
          const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
          if(rows.some(r=> inspCraftInUse(r))){ ElMessage.warning('数据正在使用，不可删除'); return; }
        }
        const title = btn.name.includes('关闭') ? '关闭确认' : '删除确认';
        const tip = deleteConfirmTip(btn);
        const okText = (pageId.value==='lg-dispatch' || pageId.value==='lg-carrier-evt' || pageId.value==='carrier' || pageId.value==='vehicle' || pageId.value==='freight' || pageId.value==='wwpo' || pageId.value==='po' || pageId.value==='so' || pageId.value==='mat-medium' || pageId.value==='serial-arch' || pageId.value==='tank-arch' || pageId.value==='warehouse' || pageId.value==='stock-warn' || pageId.value==='insp-proc' || pageId.value==='insp-craft' || isProdWhPage()) ? '确认删除' : '确认';
        ElementPlus.ElMessageBox.confirm(tip, title, { confirmButtonText: okText, cancelButtonText:'取消', type:'warning' })
          .then(()=>{
            if(pageId.value==='lg-carrier-evt'){
              const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
              if(!rows.length){ ElMessage.warning('请先勾选要删除的数据'); return; }
              if(rows.some(r=> r['处理状态']!=='待处理')){
                ElMessage.warning('仅允许删除待处理状态的事件记录');
                return;
              }
              const set = new Set(selectedIds.value);
              const list = (MOCK['lg-carrier-evt']||{}).main || [];
              MOCK['lg-carrier-evt'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('承运商事件已删除');
              return;
            }
            if(pageId.value==='lg-dispatch'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['lg-dispatch']||{}).main || [];
              MOCK['lg-dispatch'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('派车申请单已删除');
              return;
            }
            if(pageId.value==='lg-ship'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['lg-ship']||{}).main || [];
              const removed = list.filter(r=> set.has(r.id));
              MOCK['lg-ship'].main = list.filter(r=> !set.has(r.id));
              releaseShipsFromDispatch(removed);
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('发货单已删除，已回算更新派车申请单拆分数量');
              return;
            }
            if(pageId.value==='carrier'){
              const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
              if(rows.some(r=> carrierInUse(r['承运商名称']))){
                ElMessage.warning('此数据正在使用，不可删除');
                return;
              }
              const set = new Set(selectedIds.value);
              const list = (MOCK['carrier']||{}).main || [];
              MOCK['carrier'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('承运商已删除');
              return;
            }
            if(pageId.value==='vehicle'){
              const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
              if(rows.some(r=> vehicleInUse(r['车牌号']))){
                ElMessage.warning('该车辆/司机存在关联运单，不可删除');
                return;
              }
              const set = new Set(selectedIds.value);
              const list = (MOCK['vehicle']||{}).main || [];
              MOCK['vehicle'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('车辆及司机档案已删除');
              return;
            }
            if(pageId.value==='freight'){
              const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
              if(rows.some(r=> freightInUse(r))){
                ElMessage.warning('该运费参照正被运单引用，不可删除');
                return;
              }
              const set = new Set(selectedIds.value);
              const list = (MOCK['freight']||{}).main || [];
              MOCK['freight'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('运费参照已删除');
              return;
            }
            if(pageId.value==='lg-kpi-scheme'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['lg-kpi-scheme']||{}).main || [];
              MOCK['lg-kpi-scheme'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('评价方案已删除');
              return;
            }
            if(pageId.value==='lg-kpi-plan'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['lg-kpi-plan']||{}).main || [];
              MOCK['lg-kpi-plan'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('考核计划已删除');
              return;
            }
            if(pageId.value==='wwpo'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['wwpo']||{}).main || [];
              MOCK['wwpo'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('删除成功');
              return;
            }
            if(pageId.value==='wh-so-prep'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['wh-so-prep']||{}).main || [];
              MOCK['wh-so-prep'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('备货通知单已删除');
              return;
            }
            if(pageId.value==='wh-insp-scheme'){
              const set = new Set(selectedIds.value);
              MOCK['wh-insp-scheme'].main = ((MOCK['wh-insp-scheme']||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('删除成功');
              return;
            }
            if(pageId.value==='wh-insp-plan'){
              if((activeTab.value||'tab1')!=='tab1'){ ElMessage.warning('巡检记录不可删除'); return; }
              const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
              if(rows.some(r=> r['计划状态']!=='待执行')){
                ElMessage.warning('仅待执行状态的巡检计划可删除'); return;
              }
              const set = new Set(selectedIds.value);
              MOCK['wh-insp-plan'].tab1 = ((MOCK['wh-insp-plan']||{}).tab1||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('所选巡检计划已删除');
              return;
            }
            if(pageId.value==='mat-list'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['mat-list']||{}).main || [];
              MOCK['mat-list'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('物料已删除');
              return;
            }
            if(pageId.value==='mat-uom'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['mat-uom']||{}).main || [];
              MOCK['mat-uom'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('换算关系已删除');
              return;
            }
            if(pageId.value==='mat-medium'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['mat-medium']||{}).main || [];
              MOCK['mat-medium'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('所选对照记录已成功删除');
              return;
            }
            if(pageId.value==='serial-arch'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['serial-arch']||{}).main || [];
              MOCK['serial-arch'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('流水码档案已删除');
              return;
            }
            if(pageId.value==='tank-arch'){
              const set = new Set(selectedIds.value);
              const list = (MOCK['tank-arch']||{}).main || [];
              MOCK['tank-arch'].main = list.filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('储罐档案已删除');
              return;
            }
            if(isPoNoticePage()){
              const set = new Set(selectedIds.value);
              const pid = pageId.value;
              MOCK[pid].tab1 = ((MOCK[pid]||{}).tab1||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success(pid==='wh-po-ret' ? '采购退料通知单已删除' : '收料通知单已删除');
              return;
            }
            if(isProdWhPage()){
              const set = new Set(selectedIds.value);
              const pid = pageId.value;
              MOCK[pid].tab1 = ((MOCK[pid]||{}).tab1||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('删除成功');
              return;
            }
            if(isRestWhNoticePage()){
              const set = new Set(selectedIds.value);
              const pid = pageId.value;
              const bag = MOCK[pid] = MOCK[pid] || {};
              const key = Array.isArray(bag.tab1) ? 'tab1' : 'main';
              bag[key] = (bag[key]||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('删除成功');
              return;
            }
            if(pageId.value==='customer'){
              const set = new Set(selectedIds.value);
              MOCK.customer.main = ((MOCK.customer||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('客户已删除');
              return;
            }
            if(pageId.value==='supplier'){
              const set = new Set(selectedIds.value);
              MOCK.supplier.main = ((MOCK.supplier||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('供应商已删除');
              return;
            }
            if(pageId.value==='unit'){
              const set = new Set(selectedIds.value);
              MOCK.unit.main = ((MOCK.unit||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('单位已删除');
              return;
            }
            if(pageId.value==='dict'){
              const set = new Set(selectedIds.value);
              MOCK.dict.main = ((MOCK.dict||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('字典项已删除');
              return;
            }
            if(pageId.value==='po'){
              const set = new Set(selectedIds.value);
              MOCK.po.main = ((MOCK.po||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('采购订单已删除');
              return;
            }
            if(pageId.value==='so'){
              const set = new Set(selectedIds.value);
              MOCK.so.main = ((MOCK.so||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('销售订单已删除');
              return;
            }
            if(pageId.value==='warehouse' || pageId.value==='stock-warn'){
              const set = new Set(selectedIds.value);
              const key = activeTab.value || (tabView.value||{}).name || 'tab1';
              const bag = MOCK[pageId.value] = MOCK[pageId.value] || {};
              bag[key] = (bag[key]||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('删除成功');
              return;
            }
            if(pageId.value==='insp-proc'){
              const set = new Set(selectedIds.value);
              MOCK['insp-proc'].main = ((MOCK['insp-proc']||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('检查工序已删除');
              return;
            }
            if(pageId.value==='insp-craft'){
              const set = new Set(selectedIds.value);
              MOCK['insp-craft'].main = ((MOCK['insp-craft']||{}).main||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('检查工艺已删除');
              return;
            }
            if(isLabListPage() || isLabArchPage()){ labDeleteSelected(); return; }
            if(btn.name==='关闭' && pageId.value==='np-0201-01'){
              const set = new Set(selectedIds.value);
              const bag = MOCK[pageId.value] = MOCK[pageId.value] || {};
              const list = bag.main || [];
              list.forEach(r=>{ if(set.has(r.id)) r['单据状态'] = '已关闭'; });
              bag.main = list;
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('已关闭');
              return;
            }
            if(btn.name==='关闭' && pageId.value==='np-0201-02'){
              const set = new Set(selectedIds.value);
              const bag = MOCK[pageId.value] = MOCK[pageId.value] || {};
              const removed = (bag.main || []).filter(r=> set.has(r.id));
              bag.main = (bag.main || []).filter(r=> !set.has(r.id));
              removed.forEach(e=>{
                const hit = oeOrderList().find(r=> r['委托单号']===e['委托单号']);
                if(hit && ['待执行','执行中'].includes(hit['单据状态'])) hit['单据状态'] = '已关闭';
              });
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('已关闭');
              return;
            }
            if(pageId.value==='insp-order' && activeTab.value==='tab-oe' && btn.name==='关闭'){
              const set = new Set(selectedIds.value);
              oeOrderList().forEach(r=>{ if(set.has(r.id)) r['单据状态'] = '已关闭'; });
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('已关闭');
              return;
            }
            if(pageId.value==='insp-order' && activeTab.value==='tab-oe' && btn.name.includes('删除')){
              const rows = oeOrderList().filter(r=> selectedIds.value.includes(r.id));
              const nos = new Set(rows.map(r=> r['委托单号']));
              const bag = MOCK['insp-order'];
              bag['tab-oe'] = oeOrderList().filter(r=> !selectedIds.value.includes(r.id));
              const eb = MOCK['np-0201-02'] = MOCK['np-0201-02'] || {};
              eb.main = (eb.main || []).filter(r=> !nos.has(r['委托单号']));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('已删除');
              return;
            }
            if(pageId.value==='np-0417-03'){
              const set = new Set(selectedIds.value);
              const key = activeTab.value || (tabView.value||{}).name || 'tab-1';
              const bag = MOCK[pageId.value] = MOCK[pageId.value] || {};
              bag[key] = (bag[key]||[]).filter(r=> !set.has(r.id));
              selectedIds.value = [];
              bumpStore();
              ElMessage.success('已删除');
              return;
            }
            ElMessage.success(btn.name.includes('关闭')?'已关闭':'已删除');
          }).catch(()=>{});
        return;
      }
      if(btn.name==='导入' || btn.name==='导入数据'){ importVisible.value=true; return; }
      if(btn.name==='导出' || btn.name==='导出数据'){ exportVisible.value=true; return; }
      if(btn.name==='下推'){ ElMessage.success('已打开下推弹窗'); return; }
      /* 鼎材 QMS · 流程工具栏（演示） */
      if(btn.name==='批量结束' && pageId.value===FLOW_WAIT){ flowEndSampling((tableData.value||[]).filter(r=> selectedIds.value.includes(r.id))); return; }
      if(btn.name==='批量结束录入' && pageId.value===FLOW_ENTRY){ flowEndEntry((tableData.value||[]).filter(r=> selectedIds.value.includes(r.id))); return; }
      if(btn.name==='批量结束' || btn.name==='批量结束录入' || btn.name==='批量提交' || btn.name==='批量计算'){
        if(!selectedIds.value.length && btn.name!=='批量计算'){ ElMessage.warning('请先勾选数据'); return; }
        ElMessage.success(btn.name + '成功（演示）'); return;
      }
      if(btn.name==='批量复核'){
        if(!selectedIds.value.length){ ElMessage.warning('请先勾选报检单'); return; }
        qcOpenRecheck((tableData.value||[]).filter(r=> selectedIds.value.includes(r.id)));
        return;
      }
      if(btn.name==='数据比对' && ['recheck','ledger'].includes(pageId.value)){ qcCompare(); return; }
      if(btn.name==='回写处置单'){ openMrbWriteback(); return; }
      if(pageId.value==='mrb-review' && btn.name==='关联查询'){ openMrbLink(); return; }
      if(pageId.value==='mrb-review' && btn.name==='批量发起审核'){ mrbBatchAudit(); return; }
      if(DISPOSE_LINK_PAGES.includes(pageId.value) && btn.name==='关联查询'){ openDisposeLink(); return; }
      if(pageId.value==='capa-handle' && btn.name==='关联查询'){ openCapaLink(); return; }
      if(btn.name==='数据录入' && (isEntryByCat(pageId.value) || pageId.value==='entry-sample')){
        if(!selectedIds.value.length){ ElMessage.warning('请先勾选数据'); return; }
        const row = (tableData.value||[]).find(r=> selectedIds.value.includes(r.id)) || {};
        onRowOp({ name:'数据录入', desc:'录入' }, row);
        return;
      }
      if(btn.name==='扫码录入' || btn.name==='新增开具'){ openForm('add'); return; }
      if(btn.name==='清空'){ ElMessage.success('已清空扫码缓存（演示）'); return; }
      if(btn.name==='刷新' || btn.name==='计算'){ storeTick.value += 1; ElMessage.success(btn.name + '完成，共 ' + (tableData.value||[]).length + ' 条'); return; }
      if(btn.name==='偏差阈值设置' && pageId.value==='cl-calc'){ openClDev(); return; }
      if(btn.name==='保存计算记录' && pageId.value==='cl-calc'){ saveClCalcRecord(); return; }
      if(pageId.value==='cl-record' && btn.name==='关联查询'){ clRecordLink(); return; }
      if(btn.name==='设置' && page.value?.layout==='spc-chart'){ openChartSpcSettings(); return; }
      if(btn.name==='设置'){ qcOpenSpcRules(); return; }
      if(btn.name==='I图样本数据'){ qcOpenSpcSamples(); return; }
      if(btn.name==='SPC报告预览'){ qcOpenSpcPreview(); return; }
      if(btn.name==='批量下载' && pageId.value==='spc-report-ledger'){ qcSpcLedgerDownload((tableData.value||[]).filter(r=> selectedIds.value.includes(r.id))); return; }
      if(btn.name==='保存SPC报告'){ openForm('保存SPC报告'); return; }
      if(btn.name==='新建数据源'){ openForm('新建数据源'); return; }
      if(btn.name==='新增类型'){ openForm('新增类型'); return; }
      if(btn.name==='数据源设置'){
        if(!treeListId.value){ ElMessage.warning('请先选择左侧数据源'); return; }
        openForm('数据源设置');
        formModel['数据源'] = treeListId.value;
        const apiBase = pageId.value==='tag-data-source'
          ? '/api/tag/datasource/'
          : '/api/quality/report/';
        formModel['Api地址'] = apiBase + encodeURIComponent(treeListId.value);
        qcInitDsSetting();
        return;
      }
      if(btn.name==='下载源文件' || btn.name==='下载PDF'){
        qcQrDownload((tableData.value||[]).filter(r=> selectedIds.value.includes(r.id)), btn.name);
        return;
      }
      if(btn.name==='API解析'){ ElMessage.success('已按 Api 地址解析字段（演示）'); return; }
      if(btn.name==='SIP文件解析'){ ElMessage.info('Demo：上传 SIP 文件，解析生成检验方法'); return; }
      ElMessage.warning('Demo 未配置该操作：' + btn.name);
    }
