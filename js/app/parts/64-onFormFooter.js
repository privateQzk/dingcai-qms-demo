    function onFormFooter(a){
      if(!a) return;
      if(a.name==='取消'){ formVisible.value=false; return; }
      if(a.name==='确认'){ onFormOk(); return; }
      onFormOk();
    }
    function onQcInspectSave(){
      if(!qcInspectForm.检验结果){ ElMessage.warning('请选择检验结果'); return; }
      if(!qcInspectForm.检验员){ ElMessage.warning('请填写检验员'); return; }
      if(!qcInspectForm.检验日期){ ElMessage.warning('请选择检验日期'); return; }
      if(qcInspectRow.value){
        qcInspectRow.value['检验判定'] = qcInspectForm.检验结果;
        qcInspectRow.value['质检员'] = qcInspectForm.检验员;
        qcInspectRow.value['检验日期'] = qcInspectForm.检验日期;
        if(qcInspectForm.检验备注) qcInspectRow.value['备注'] = qcInspectForm.检验备注;
        // 合格/不合格：按台账批号回写流水码档案检验状态
        const judge = String(qcInspectForm.检验结果 || '').trim();
        if(judge === '合格' || judge === '不合格'){
          const lot = String(qcInspectRow.value['批次号'] || qcInspectRow.value['物料批次号'] || '').trim();
          if(lot && lot !== '—'){
            const archList = ((MOCK['serial-arch'] || {}).main || []);
            let n = 0;
            archList.forEach(r=>{
              if(String(r['物料批号'] || '').trim() === lot){
                r['检验状态'] = judge;
                n++;
              }
            });
            if(n){
              bumpStore();
              ElMessage.success(`检验结果已确认，已回写 ${n} 条流水码档案检验状态为「${judge}」`);
              qcInspectVisible.value=false;
              return;
            }
          }
        }
      }
      qcInspectVisible.value=false;
      ElMessage.success('检验结果已确认');
    }
    function onFormSelectChange(f){
      if(pageId.value==='qr-issue' && f && f.name==='报告模板名称'){
        const tpl = String(formModel['报告模板名称']||'').trim();
        const cfg = ((((window.WMS_MOCK_ROWS||MOCK)['qr-config']||{}).main)||[]).find(r=> r['报告模板名称']===tpl);
        formModel['报告类型'] = cfg ? (cfg['报告类型']||'') : '';
        formModel['开具方式'] = cfg ? (cfg['开具方式']||'') : '';
        formModel['批次取值逻辑'] = cfg ? ((cfg['批次取值逻辑'] && cfg['批次取值逻辑']!=='—') ? cfg['批次取值逻辑'] : (cfg['取值方式']||'')) : '';
        clearQrIssueSpectrumUploads();
        return;
      }
      if(pageId.value==='qr-issue' && f && (f.name==='客户名称' || f.name==='来源单号')){
        const raw = formSelectOptions({ name:'报告模板名称', type:'select' }) || [];
        const opts = raw.map(o=> (o && o.value!=null) ? o.value : o);
        if(formModel['报告模板名称'] && !opts.includes(formModel['报告模板名称'])){
          formModel['报告模板名称']=''; formModel['报告类型']=''; formModel['开具方式']=''; formModel['批次取值逻辑']='';
          clearQrIssueSpectrumUploads();
        }
        return;
      }
      if(pageId.value===BIAS_PAGE && f && f.name==='仪器名称'){
        const led = ((MOCK['instrument-ledger']||{}).main||[]).find(r=> r['仪器名称']===formModel['仪器名称']) || {};
        formModel['仪器编号'] = led['仪器编号'] || formModel['仪器编号'] || '';
        formModel['规格型号'] = led['规格型号'] || formModel['规格型号'] || '';
        return;
      }
      if(pageId.value===COL_PAGE && f && f.name==='责任部门'){
        const cur = String(formModel['责任人']||'').trim();
        if(cur && !colUserOptions(formModel['责任部门']).includes(cur)) formModel['责任人'] = '';
        return;
      }
      if(LAB_ARCH_LOC_PAGES.includes(pageId.value) && f && f.name==='存储库位'){
        const loc = String(formModel['存储库位']||'').trim();
        formModel['存储仓库'] = labArchWhOfLoc(loc);
        const pos = retainLocText(formModel['存储仓库'], loc);
        formModel['库存位置'] = pos;
        if(pageId.value==='retain-sample-arch') formModel['样品位置'] = pos;
        return;
      }
      if(pageId.value==='np-0502-01' && f && f.name==='过程监测名称'){
        const name = String(formModel['过程监测名称']||'').trim();
        const hit = envMonSchemeOf(name);
        formModel['过程监测编码'] = hit && hit.mon ? (hit.mon['过程监测编码']||'') : '';
        formLineRows.value = envMonLinesFor(name, formMode.value==='edit' ? formModel._editId : '');
        return;
      }
      if(pageId.value==='gather-item' && f && f.name==='点位名称'){
        const name = String(formModel['点位名称']||'').trim();
        const hit = ((MOCK['opc-point']||{}).main||[]).find(r=> r['点位名称']===name);
        formModel['采集平台'] = hit ? (hit['采集平台']||'') : '';
        return;
      }
      if(pageId.value==='gather-item' && f && f.name==='采集项单位'){
        const uname = String(formModel['采集项单位']||'').trim();
        const uhit = (((MOCK.unit||{}).main)||[]).find(r=> r['单位名称']===uname);
        formModel['采集项单位编码'] = uhit ? (uhit['单位编码']||'') : '';
        return;
      }
      if(pageId.value===IA_RECT && f && f.name==='内审单号'){
        const plan = iaRows().find(r=> r['内审单号']===formModel['内审单号']);
        if(plan) formModel['内审年度'] = plan['内审年度'] || formModel['内审年度'];
        return;
      }
      if(pageId.value===CI_PAGE && f && f.name==='提案人'){ onCiProposerChange(); return; }
      if(pageId.value===CHG_PAGE && f && f.name==='申请人'){ onChgApplicantChange(); return; }
      if(pageId.value===SE_PAGE && f && f.name==='事件类型'){ formModel['来源单号'] = ''; return; }
      if(pageId.value===HM_IMP_PAGE && f && f.name==='物料类'){
        onHmImpMatCatChange();
        return;
      }
      if(pageId.value===HM_IMP_PAGE && f && f.name==='文件类型'){
        if(formModel['文件类型']!=='客户文件'){ formModel['客户信息']=''; formModel['客户名称']=''; formModel['客户编码']=''; }
        if(formModel['文件类型']!=='法规文件') formModel['法规名称']='';
        return;
      }
      if(pageId.value===HM_LIB_PAGE && f && f.name==='文件类型'){
        if(formModel['文件类型']!=='客户文件'){ formModel['客户信息']=''; formModel['客户名称']=''; formModel['客户编码']=''; }
        if(formModel['文件类型']!=='法规文件') formModel['法规名称']='';
        return;
      }
      if(pageId.value===HM_LIB_PAGE && f && (f.name==='使用期限类型' || f.name==='生效日期')){
        if(formModel['使用期限类型']==='永久使用'){
          ['生效日期','使用周期','提前预警','失效日期'].forEach(k=>{ formModel[k]=''; });
        } else refreshHmLibExpire();
        return;
      }
      if(pageId.value===HM_IMP_PAGE && f && (f.name==='使用期限类型' || f.name==='生效日期')){
        if(formModel['使用期限类型']==='永久使用'){
          ['生效日期','使用周期','提前预警','失效日期'].forEach(k=>{ formModel[k]=''; });
        } else refreshHmExpire();
        return;
      }
      if(pageId.value===HM_CHG_PAGE && f && (f.name==='变更后使用期限类型' || f.name==='变更后生效日期')){
        if(formModel['变更后使用期限类型']==='永久使用'){
          ['变更后生效日期','变更后使用周期','变更后提前预警','变更后失效日期'].forEach(k=>{ formModel[k]=''; });
        } else refreshHmChgExpire();
        return;
      }
      if(pageId.value===LAB_IO_FORM && f && f.name==='适用业务单据'){
        formModel['适用单据类型'] = [];
        return;
      }
      if(pageId.value==='mat-list' && f && f.name==='基本单位'){
        const u = formModel['基本单位'];
        if(u){
          ['库存单位','生产单位','采购单位','销售单位'].forEach(k=>{ formModel[k] = u; });
        }
      }
      if(pageId.value==='samp-point' && f && f.name==='所属产线'){
        const lineName = String(formModel['所属产线']||'').trim();
        if(!lineName){
          formModel['所属车间'] = '';
        } else {
          const line = ((MOCK['prod-line']||{}).main||[]).find(r=> String(r['产线名称']||'').trim()===lineName)
            || ((MOCK['prod-line']||{}).main||[]).find(r=> String(r['产线编码']||'').trim()===lineName);
          formModel['所属车间'] = line ? (line['所属车间']||'') : '';
        }
      }
      if(pageId.value===PERSON_PAGE && f && f.name==='编码'){ onPersonUserChange(); return; }
      if(pageId.value===MAINT_PERSON_PAGE && f && f.name==='人员编码'){ onMaintUserChange(); return; }
      if(pageId.value==='insp-person' && f && f.name==='人员编码'){
        const code = String(formModel['人员编码']||'').trim();
        const u = demoSysUsers().find(x=> x.人员编码===code);
        if(!u){
          formModel['人员姓名'] = '';
          formModel['所属角色'] = '';
          formModel['所属岗位'] = '';
          formModel['所属部门'] = '';
        } else {
          formModel['人员姓名'] = u.人员姓名||'';
          formModel['所属角色'] = u.所属角色||'';
          formModel['所属岗位'] = u.所属岗位||'';
          formModel['所属部门'] = u.所属部门||'';
          formModel['联系电话'] = u.联系电话||'';
          formModel['电子邮箱'] = u.电子邮箱||'';
        }
      }
      if(isDjPlanPage() && f && f.name===djKind().w+'方案名称'){ djApplySchemeToForm(); return; }
      if(pageId.value===LAB_INSP_PLAN && f && f.name==='巡检方案名称'){
        const sch = labInspSchemeRows().find(r=> r['巡检方案名称']===formModel['巡检方案名称']);
        formModel['内容描述'] = sch ? (sch['内容描述']||'') : '';
        formModel['表单名称'] = sch ? (sch['表单名称']||'') : '';
        if(sch){
          const q = parseQtyUnit(sch['标准作业时长'], '小时');
          formModel['标准作业时长'] = q.n;
          formModel['标准作业时长单位'] = q.u || '小时';
        } else {
          formModel['标准作业时长'] = '';
          formModel['标准作业时长单位'] = '小时';
        }
        if(sch && sch['备注'] && sch['备注']!=='—' && !formModel['备注']) formModel['备注'] = sch['备注'];
      }
      if(isLabCountPage() && f && (f.name==='盘点类型' || f.name==='盘点仓库')){
        refreshLabCountScanLines();
      }
      if(pageId.value==='mat-uom' && f && (f.name==='基本单位' || f.name==='换算单位')){
        if(formModel['基本单位'] && formModel['换算单位'] && formModel['基本单位']===formModel['换算单位']){
          ElMessage.warning('基本单位与换算单位不能相同');
        }
      }
      if(pageId.value==='insp-craft' && f && f.name==='适用包材类型'){
        const arr = Array.isArray(formModel['适用包材类型']) ? formModel['适用包材类型'] : splitDun(formModel['适用包材类型']);
        if(!arr.includes('流水码')) formModel['适用包装规格'] = [];
      }
      if(pageId.value==='form-data-source' && f && f.name==='资源'){
        const res = String(formModel['资源']||'').trim();
        formModel['表名'] = res ? ('t_' + res.replace(/\s+/g, '_').toLowerCase()) : '';
      }
      if(pageId.value==='pkg-craft' && f && f.name==='适用业务单据'){
        const allowed = new Set(formFieldOptions({ name:'适用单据类型', options:[] }));
        const cur = Array.isArray(formModel['适用单据类型']) ? formModel['适用单据类型'] : splitDun(formModel['适用单据类型']);
        formModel['适用单据类型'] = cur.filter(x=> allowed.has(x));
      }
      if(f && f.name==='订单类型'){
        formModel['订单号'] = '';
        if(formModel['配送类型']!=='直发业务（贸易）') formModel['合同号'] = '';
        if(pageId.value==='lg-dispatch') formLineRows.value = [];
      }
      if(f && f.name==='配送类型'){
        if(formModel['配送类型']!=='直发业务（贸易）'){
          formModel['采购订单'] = '';
        }
      }
      if(pageId.value==='lg-carrier-evt' && f && f.name==='事件大类'){
        formModel['事件小类'] = '';
      }
      if(pageId.value==='lg-dispatch' && f && f.name==='用车类型'){
        const opts = whBizTypesForVehicle(formModel['用车类型']==='其他' ? '其他' : formModel['用车类型']);
        const cur = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
        formModel['关联仓储业务'] = opts.includes(cur) ? cur : (opts[0] || '');
        formModel['关联销售备货单'] = '';
        formModel['关联销售预出货单'] = '';
        formModel['前置关联单据'] = '';
        syncDispatchOrderTypeByBiz();
      }
      if(pageId.value==='lg-dispatch' && f && (f.name==='关联仓储业务' || f.name==='仓库业务类型')){
        formModel['关联销售备货单'] = '';
        formModel['关联销售预出货单'] = '';
        formModel['前置关联单据'] = '';
        syncDispatchOrderTypeByBiz();
      }
      if(pageId.value==='lg-dispatch' && f && f.name==='配送类型' && formModel['配送类型']!=='直发业务（贸易）'){
        formModel['采购订单'] = '';
      }
      if(pageId.value==='wh-prod-in' && f && f.name==='业务类型'){
        if(formModel['业务类型']!=='受托加工完工'){
          formModel['关联销售订单'] = '';
          formModel['客户名称'] = '';
        }
      }
      if(pageId.value==='wh-prod-in' && f && f.name==='关联销售订单'){
        const so = String(formModel['关联销售订单']||'').trim();
        const map = {
          'XSDD202608020002': '委托客户甲',
          'XSDD202608010001': '委托客户乙'
        };
        formModel['客户名称'] = map[so] || (so ? '委托客户甲' : '');
      }
      if(pageId.value==='wh-prod-issue' && f && f.name==='领料类型'){
        if(formModel['领料类型']==='备品备件领料'){
          pruneProdIssueMatsByPickType();
        }
      }
      if(pageId.value==='wh-stocktake' && f && f.name==='盘点方式'){
        pruneStocktakeMatsByMode();
      }
      if(pageId.value==='wh-other-in' && f && f.name==='入库方向'){
        if(formModel['入库方向']!=='线边仓') formModel['领至线边仓'] = '';
      }
      if(pageId.value==='wh-other-out' && f && f.name==='出库方向'){
        if(formModel['出库方向']!=='线边仓') formModel['领至线边仓'] = '';
      }
      if(pageId.value==='wh-insp-plan' && f && f.name==='目标仓库'){
        fillInspPlanFromWarehouse(formModel['目标仓库']);
      }
      if(isLoadPage() && f && f.name==='关联仓库业务'){
        formModel['关联单号'] = '';
        formModel['客供信息'] = '';
        formLineRows.value = [];
        clearPoInWaybillChain();
        formModel['承运商'] = '';
      }
      if((pageId.value==='wh-other-in' || pageId.value==='wh-other-out') && f && f.name==='受益人'){
        const map = { '演示用户':'仓储部', '张三':'研发部', '李四':'生产部', '王强':'质量部' };
        const dept = map[formModel['受益人']];
        if(dept) formModel['受益部门'] = dept;
      }
    }
    function openPicker(title, lineRow, bind){
      if(pageId.value==='np-0417-03' && title==='关联单据' && !lineRow && (bind||'form')==='form'){
        openIoPick('qrIssueSample', 'abnEvent', '关联单据');
        return;
      }
      if(pageId.value===CASS_PAGE && title==='物料编码' && lineRow){
        cassMatRow.value = lineRow;
        openIoPick('mat', 'cassMat', '物料编码');
        return;
      }
      if(pageId.value==='np-0601-01' && (title==='产出物料' || title==='来源物料')){
        batchPickLine = title==='来源物料' ? lineRow : null;
        openIoPick('mat', title==='产出物料' ? 'batchOutMat' : 'batchSrcMat', title);
        return;
      }
      if(pageId.value===HM_VOID_PAGE && title==='文件编号' && !lineRow){
        openHmFilePick();
        return;
      }
      if(pageId.value===HM_ARCH_PAGE && title==='单位' && !lineRow){
        inspItemUnitDrawerTarget.value = 'hm-arch';
        openInspItemUnitDrawer();
        return;
      }
      if(pageId.value===HM_ARCH_PAGE && title==='客户信息' && lineRow){
        hmArchCustRow.value = lineRow;
        openIoPick('customer', 'hmArchCust', '客户信息');
        return;
      }
      if(pageId.value===HM_ARCH_PAGE && title==='关联文件' && !lineRow){
        openHmFilePick();
        return;
      }
      if(pageId.value===HM_ARCH_PAGE && title==='中文名称' && lineRow){
        hmArchItemRow.value = lineRow;
        openIoPick('hmItem', 'hmArchItem', '中文名称');
        return;
      }
      if(pageId.value===HM_CHG_PAGE && title==='原文件' && !lineRow){
        openHmFilePick();
        return;
      }
      if(pageId.value===WX_PAGE && title==='仪器编号' && !lineRow){
        openIoPick('inst', 'wxInst', '仪器编号');
        return;
      }
      if(pageId.value===WJ_ORDER && title==='外校单位' && !lineRow){
        openIoPick('supplier', 'respSupplier', '外校单位');
        return;
      }
      if((pageId.value===CT_PAGE || pageId.value===CR_PAGE) && title==='客户名称' && !lineRow){
        openIoPick('customer', 'form', '客户名称');
        return;
      }
      if(pageId.value===CT_PAGE && title==='关联单据' && !lineRow){
        openIoPick('oqcTask', 'ctOqc', '关联单据');
        return;
      }
      if(pageId.value===SE_PAGE && title==='来源单号' && !lineRow){
        const kind = SE_SRC_KIND[formModel['事件类型']];
        if(!kind){ ElMessage.warning('请先选择事件类型'); return; }
        openIoPick(kind, 'seSrc', '来源单号');
        return;
      }
      if(pageId.value===SR_PAGE && title==='来源单号' && !lineRow){
        openIoPick('srEvent', 'srEvent', '来源单号');
        return;
      }
      if(pageId.value==='mrb-review' && title==='来源处置单号' && !lineRow){
        if(!formModel['来源处置类型']){ ElMessage.warning('请先选择来源处置类型'); return; }
        openIoPick('mrbSrc', 'mrbSrc', '来源处置单号');
        return;
      }
      if(pageId.value==='capa-internal' && title==='来源单号' && !lineRow){
        if(!formModel['事件类型']){ ElMessage.warning('请先选择事件类型'); return; }
        if(!QC_CAPA_SRC[formModel['事件类型']]){ ElMessage.warning('事件类型为「'+formModel['事件类型']+'」时无需选择来源单号'); return; }
        openIoPick('capaSrc', 'capaSrc', '来源单号');
        return;
      }
      if(pageId.value==='qr-issue' && title==='来源单号' && !lineRow){
        openIoPick('qrIssueOrder', 'qrIssueOrder', '来源单号');
        return;
      }
      if(pageId.value==='spectrum-file' && title==='上传文件' && !lineRow){
        pickSpectrumLedgerUpload();
        return;
      }
      if((pageId.value===SE_PAGE || pageId.value===SR_PAGE) && title==='供应商名称' && !lineRow){
        openIoPick('supplier', 'form', '供应商名称');
        return;
      }
      if(pageId.value===SR_PAGE && title==='物料信息' && !lineRow){
        openIoPick('mat', 'form', '物料信息');
        return;
      }
      if(pageId.value===HM_IMP_PAGE && title==='客户信息' && !lineRow){
        openIoPick('customer', 'form', '客户信息');
        return;
      }
      if(isAuditPage() && title==='客户名称' && !lineRow){
        openIoPick('customer', 'form', '客户名称');
        return;
      }
      if(pageId.value===CR_PAGE && title==='责任供应商' && !lineRow){
        openIoPick('supplier', 'respSupplier', '责任供应商');
        return;
      }
      if(pageId.value===CHG_PAGE && title==='变更涉及产品' && !lineRow){
        openIoPick('mat', 'chgProd', '变更涉及产品', true);
        return;
      }
      if(pageId.value==='retain-sample' && title==='留样编码' && !lineRow){
        openIoPick('mat', 'retainMat', '留样编码');
        return;
      }
      if(pageId.value===LAB_PREP && title==='试液信息' && !lineRow){
        openIoPick('solution', bind || 'form', '试液信息');
        return;
      }
      if(pageId.value===LAB_CALIB && title==='条码号' && !lineRow){
        openIoPick('calibArch', bind || 'form', '条码号');
        return;
      }
      if(pageId.value===DISPATCH_PAGE && !lineRow && (bind||'form')==='form' && (title==='适用检验类' || title==='派单班组' || title==='使用仪器')){
        openIoPick(title==='适用检验类' ? 'inspCat' : title==='使用仪器' ? 'inst' : 'inspTeam', 'form', title, true);
        return;
      }
      if(IO_PICK_FIELD[title] && !lineRow && pageId.value!=='mat-medium' && (bind==='query' || ((bind||'form')==='form' && formVisible.value))){
        const fields = bind==='query' ? ((tabView.value||{}).queryFields||[]) : (activeFormFields.value||[]);
        const fc = fields.find(x=> x && x.name===title);
        openIoPick(IO_PICK_FIELD[title], bind, title, fc && fc.multiple);
        return;
      }
      if(pageId.value==='insp-order' && title==='来样单位' && !lineRow && (bind||'form')==='form'){
        const type = formModel['来样类型'];
        if(!type){ ElMessage.warning('请先选择来样类型'); return; }
        openIoPick(type==='供应商送样' ? 'sampleSupplier' : 'sampleCustomer');
        return;
      }
      if(pageId.value==='insp-order' && title==='产线名称' && !lineRow && (bind||'form')==='form'){
        openIoPick('line');
        return;
      }
      if((pageId.value==='add-sample' || pageId.value==='np-0201-01' || pageId.value==='np-0201-02') && title==='报检单号' && !lineRow && (bind||'form')==='form'){
        if(!formModel['报检单类型']){ ElMessage.warning('请先选择报检单类型'); return; }
        openIoPick('order');
        return;
      }
      if(pageId.value==='np-0201-02' && title==='样品编号' && !lineRow && (bind||'form')==='form' || (pageId.value==='insp-order' && activeTab.value==='tab-oe' && title==='样品编号' && !lineRow && (bind||'form')==='form')){
        openIoPick('oeSample', 'oeSample', '样品编号');
        return;
      }
      if(pageId.value===SPLIT_PAGE && title==='样品编号' && !lineRow && (bind||'form')==='form'){
        openSampSplitLedgerPick();
        return;
      }
      if(pageId.value==='np-0201-01' && title==='往来单位名称' && !lineRow && (bind||'form')==='form'){
        const typ = formModel['往来单位类型'];
        if(!typ){ ElMessage.warning('请先选择往来单位类型'); return; }
        openIoPick(typ==='客户' ? 'customer' : 'supplier', 'urPartner', '往来单位名称');
        return;
      }
      if(title==='检验项单位' || title==='检验项单位1' || title==='检验项单位2'){
        if(title==='检验项单位1') inspItemUnitDrawerTarget.value = 'uom1';
        else if(title==='检验项单位2') inspItemUnitDrawerTarget.value = 'uom2';
        else inspItemUnitDrawerTarget.value = null;
        openInspItemUnitDrawer();
        return;
      }
      if(title==='采集项单位'){
        if(pageId.value==='gather-scheme' && lineRow){
          inspItemUnitDrawerTarget.value = lineRow;
        } else {
          inspItemUnitDrawerTarget.value = 'gather-item';
        }
        openInspItemUnitDrawer();
        return;
      }

      if(pageId.value==='wh-so-ret' && title==='批号'){
        const outNo = String(formModel['关联销售出库单']||'').trim();
        if(outNo && outNo!=='—' && lineRow && !codeOf(lineRow['物料信息'])){
          ElMessage.warning('请先选择物料信息'); return;
        }
      }
      if(title==='订单号' && !splitPickerMode.value && (!formModel['订单类型'] || formModel['订单类型']==='无')){ ElMessage.warning('请先选择订单类型'); return; }
      if(title==='前置关联单据' && pageId.value==='lg-dispatch' && !splitPickerMode.value){
        const biz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
        if(biz!=='销售退货'){ ElMessage.warning('当前关联仓储业务无需选择前置关联单据'); return; }
      }
      if(title==='关联销售预出货单' && pageId.value==='lg-dispatch' && !splitPickerMode.value){
        const biz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
        if(biz!=='销售发货'){ ElMessage.warning('仅销售发货业务可选择预出货出库单'); return; }
      }
      if(title==='关联销售备货单' && pageId.value==='lg-dispatch' && !splitPickerMode.value){
        const biz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
        if(!['销售发货','销售预出货'].includes(biz)){ ElMessage.warning('仅销售发货/销售预出货业务可选择备货通知单'); return; }
      }
      if(pageId.value==='wh-stocktake' && (title==='物料信息' || (title||'').includes('物料')) && !formModel['盘点方式']){
        ElMessage.warning('请先选择盘点方式'); return;
      }
      if(isLoadPage()){
        if(title==='关联单号' && !(formModel['关联仓库业务'] && formModel['关联仓库业务']!=='—')){
          ElMessage.warning('请先选择关联仓库业务'); return;
        }
        if(title==='关联发货单' && !(formModel['关联运单'] && formModel['关联运单']!=='—')){
          ElMessage.warning('请先选择关联运单'); return;
        }
        if((title==='物料信息' || title.includes('物料')) && !(formModel['关联单号'] && formModel['关联单号']!=='—')){
          ElMessage.warning('请先选择关联单号'); return;
        }
      }
      if(isWhNoticePage()){
        if(title==='关联运单' && !(formModel[whNoticeRefField()] && formModel[whNoticeRefField()]!=='—')){
          ElMessage.warning(isOsPoPage() ? '请先选择关联委外加工单' : '请先选择关联采购订单'); return;
        }
        if(title==='关联发货单' && !(formModel['关联运单'] && formModel['关联运单']!=='—')){
          ElMessage.warning('请先选择关联运单'); return;
        }
        if((title==='物料信息' || title.includes('物料')) && !(formModel[whNoticeRefField()] && formModel[whNoticeRefField()]!=='—')){
          ElMessage.warning(isOsPoPage() ? '请先选择关联委外加工单' : '请先选择关联采购订单'); return;
        }
      }
      if(isCsWhPage()){
        if(title==='关联运单' && !(formModel['关联销售订单'] && formModel['关联销售订单']!=='—')){
          ElMessage.warning('请先选择关联销售订单'); return;
        }
        if(title==='关联发货单' && !(formModel['关联运单'] && formModel['关联运单']!=='—')){
          ElMessage.warning('请先选择关联运单'); return;
        }
      }
      if(pageId.value==='wh-other-in' || pageId.value==='wh-other-out'){
        if(title==='关联发货单' && !(formModel['关联运单'] && formModel['关联运单']!=='—')){
          ElMessage.warning('请先选择关联运单'); return;
        }
      }
      pickerTitle.value = title || '选单';
      pickerLineRow.value = lineRow || null;
      pickerBind.value = bind || 'form';
      pickerKw.value=''; pickerCurrent.value=null; pickerSelected.value=[];
      if((title==='物料信息' || String(title||'').includes('物料')) && ['wh-po-in','wh-po-ret','wh-os-issue','wh-os-recv','wh-os-ret-mat','wh-os-ret-goods'].includes(pageId.value)){
        ensurePoMatPoolFromRef();
      }
      if(title==='拣货流水码') resetPickerPrepQ();
      pickerVisible.value=true;
    }
