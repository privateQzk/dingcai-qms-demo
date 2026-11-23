    function onRowOp(op, row){
      if(isChromLedgerPage() && onChromLedgerRowOp(op, row)) return;
      if(pageId.value===DEV_PAGE && (op.name==='编辑' || op.name==='复制' || op.name==='详情')){
        openDevReq(op.name==='编辑' ? 'edit' : op.name==='复制' ? 'copy' : 'detail', row); return;
      }
      if(pageId.value===PLATE_PAGE && (op.name==='编辑' || op.name==='复制')){ openPlateReq(op.name==='编辑' ? 'edit' : 'copy', row); return; }
      if(pageId.value==='insp-method' && activeTab.value==='tab-method' && op.name==='版本树'){ openMethodVer(row); return; }
      if((pageId.value==='np-0405-01' || pageId.value==='np-0405-02') && op.name==='执行'){ openHcExec(row); return; }
      if(pageId.value==='cl-record' && op.name==='样本数据'){ openClSample(row); return; }
      if(pageId.value===AC_PAGE && (op.name==='复制' || op.name==='编辑' || op.name==='样本规则设置')){
        if(op.name==='样本规则设置') openAcRule(row);
        else openAc(op.name==='复制' ? 'copy' : 'edit', row);
        return;
      }
      if(pageId.value===RPT_PAGE && ['复制','编辑','SPC设置'].includes(op.name)){
        if(op.name==='SPC设置') openSrSpc(row);
        else openSr(op.name==='复制' ? 'copy' : 'edit', row);
        return;
      }
      if(pageId.value===SG_PAGE && (op.name==='详情' || op.name==='编辑')){ openSg(op.name==='详情' ? 'detail' : 'edit', row); return; }
      if(pageId.value==='np-0501-01' && (op.name==='开启' || op.name==='关闭')){
        const bag = (MOCK['np-0501-01'] = MOCK['np-0501-01'] || {});
        const list = (bag.main = bag.main || []);
        const cur = list.find(r=> r.id===row.id) || row;
        if(op.name==='开启'){
          cur['采集开始时间'] = nowStamp();
          cur['采集结束时间'] = '';
          cur['采集状态'] = '开启';
          ElMessage.success('已开启，将按采集方案的采集频率生成监测参数记录');
        } else {
          cur['采集结束时间'] = nowStamp();
          cur['采集状态'] = '关闭';
          ElMessage.success('已关闭，不再执行该监测任务');
        }
        bumpStore();
        return;
      }
      if(pageId.value===MSA_PAGE && ['详情','复制','编辑','预览'].includes(op.name)){
        if(op.name==='详情') openMsaDetail(row);
        else if(op.name==='预览') openMsaPreview(row);
        else openMsaForm(op.name==='复制' ? 'copy' : 'edit', row);
        return;
      }
      if(pageId.value===STB_PAGE && ['详情','复制','编辑','预览'].includes(op.name)){
        if(op.name==='详情') openStbDetail(row);
        else if(op.name==='预览') openStbPreview(row);
        else openStbForm(op.name==='复制' ? 'copy' : 'edit', row);
        return;
      }
      if(pageId.value===BIAS_PAGE){
        if(op.name==='数据录入'){ openBiasData(row); return; }
        if(op.name==='报告'){ openBiasReport(row); return; }
        if(op.name==='编辑'){
          openForm('edit');
          (activeFormFields.value||[]).forEach(f=>{ if(!f || !f.name) return; const v = row[f.name]; formModel[f.name] = (v===undefined||v===null||v==='—') ? '' : v; });
          formModel._editId = row.id;
          return;
        }
        if(op.name==='复制'){ copyBiasPlan(row); return; }
        if(op.name==='关闭'){ closeBiasPlan(row); return; }
        if(op.name==='删除'){
          if((row['状态']||'')!=='待执行' && (row['状态']||'')!=='已完成'){ ElMessage.warning('当前状态不可删除'); return; }
          ElementPlus.ElMessageBox.confirm('确认删除计划 '+ (row['计划编号']||'') +'？','删除',{type:'warning'}).then(()=>{
            const bag = MOCK[BIAS_PAGE] = MOCK[BIAS_PAGE] || {};
            bag.main = (bag.main||[]).filter(r=> r.id!==row.id);
            bumpStore();
            ElMessage.success('已删除');
          }).catch(()=>{});
          return;
        }
      }
      if(pageId.value==='recheck' && op.name==='复核'){ qcOpenRecheck([row]); return; }
      if(pageId.value===INST_PAGE && ['详情','编辑','复制'].includes(op.name)){ openInstForm({ 详情:'detail', 编辑:'edit', 复制:'copy' }[op.name], row); return; }
      if(pageId.value===CI_PAGE && op.name==='编辑'){ openCiForm('edit', row); return; }
      if(pageId.value===CI_PAGE && op.name==='确认发起'){ confirmCiLaunch(row); return; }
      if(isAuditPage() && op.name==='上传附件'){ openEaExec(row); return; }
      if(isAuditPage() && (op.name==='编辑' || op.name==='复制')){ openEaForm(op.name==='复制' ? 'copy' : 'edit', row); return; }
      if(pageId.value===IA_EXEC && op.name==='内审实施'){ openIaeExec(row); return; }
      if(pageId.value===IA_RECT && op.name==='整改处理'){ openIarProcess(row); return; }
      if(pageId.value===IA_RECT && (op.name==='编辑' || op.name==='复制')){ openIarForm(op.name==='复制' ? 'copy' : 'edit', row); return; }
      if(pageId.value===CIP_PAGE && op.name==='改进处理'){ openCipProcess(row); return; }
      if(pageId.value===CHG_PAGE && op.name==='编辑'){ openChgForm('edit', row); return; }
      if(pageId.value===CHG_PAGE && op.name==='变更处理'){ openChgProcess(row); return; }
      if(pageId.value===SR_PAGE){
        if(op.name==='分享链接'){ openSrShare(row); return; }
        if(op.name==='编辑'){ if(csPage().onRowOp(op, row)) return; }
      }
      if(pageId.value===HM_IMP_PAGE){
        if(op.name==='确认导入'){ openHmAp([row]); return; }
        if(op.name==='编辑'){
          if(!hmOpenRow(row)){ ElMessage.warning(hmImpTip()+'编辑'); return; }
        }
      }
      if(pageId.value===HM_VOID_PAGE){
        if(op.name==='确认作废'){ openHmVoidAp([row]); return; }
        if(op.name==='编辑'){
          if(!hmOpenRow(row)){ ElMessage.warning(hmVoidTip()+'编辑'); return; }
        }
      }
      if(pageId.value===HM_CHG_PAGE){
        if(op.name==='确认变更'){ openHmChgAp([row]); return; }
        if(op.name==='编辑'){
          if(!hmOpenRow(row)){ ElMessage.warning(hmChgTip()+'编辑'); return; }
        }
      }
      if(pageId.value===HM_LIB_PAGE && op.name==='历史树'){ openHmHist(row); return; }
      if(pageId.value===HM_ARCH_PAGE && op.name==='限值比对'){
        const cmp = hmArchCompare(row._lines||[]);
        if(!cmp.length){ ElMessage.warning('该标准没有物质限值'); return; }
        openHmCompare(cmp, 'view');
        return;
      }
      if(csPage() && csPage().onRowOp(op, row)) return;
      if(pageId.value===FLOW_WAIT && op.name==='结束取样'){ flowEndSampling([row]); return; }
      if(pageId.value===FLOW_WAIT && op.name==='取样人员'){ wsPickOpen(row); return; }
      if(pageId.value===FLOW_ENTRY && op.name==='结束录入'){ flowEndEntry([row]); return; }
      if(pageId.value===FLOW_MY_TASK && op.name==='反馈时间'){ openFbTime(row); return; }
      if(isEntryByCat(pageId.value) && op.name==='直接提交'){ flowSubmitCat(row); return; }
      if(pageId.value===SPLIT_PAGE && op.name==='拆分'){ openSampleSplit([row]); return; }
      if(pageId.value===SPLIT_PAGE && op.name==='拆分记录'){ openSampSplitRecord(row); return; }
      if(pageId.value===COST_STAT && op.name==='查看明细'){ openCostStatDetail(row); return; }
      if(pageId.value===SLOC_PAGE && op.name==='变更记录'){ openSlocLog(row); return; }
      if(pageId.value===TASK_PAGE && op.name==='分配'){ openTaskAssign([row], '分配班组 · '+row['样品编号']); return; }
      if(pageId.value===TASK_PAGE && op.name==='分配详情'){ openTaskDetail(row); return; }
      if(pageId.value===TIME_FB_PAGE && op.name==='同步'){ openTimeFbSync([row], '同步 · '+row['样品编号']); return; }
      if(pageId.value===TIME_FB_PAGE && op.name==='同步详情'){ openTimeFbDetail(row); return; }
      if(pageId.value===DEV_PAGE){
        if(op.name==='取消需求'){ openDevCancel(row); return; }
        if(op.name==='流水记录'){ openDevLog(row); return; }
      }
      if(pageId.value===PLATE_PAGE){
        if(op.name==='取消需求'){ openPlateCancel(row); return; }
        if(op.name==='流水记录'){ openPlateLog(row); return; }
      }
      if(pageId.value===OQC_PAGE && op.name==='上传附件'){ openOqcUpload([row]); return; }
      if(pageId.value==='insp-order' && op.name==='上传报告'){ openCoaUpload(row); return; }
      if(op.name==='标签配置' && pageId.value==='tag-config'){
        openForm('标签模板设计');
        formModel['标签模板名称'] = row['标签模板名称'] || '';
        return;
      }
      if(op.name==='重新打印' && pageId.value==='print-task'){
        openPrintLabel([row]);
        printFrom.value = row;
        return;
      }
      if(TPL_PAGES[pageId.value] && op.name==='详情'){ openTplDetail(row); return; }
      if(op.name==='作业详情' && isLabRgIoPage()){ openLabIoJob(row); return; }
      if((isDjPlanPage() || isDjMyPage()) && (op.name==='作业执行' || op.name==='作业详情')){ openDjExec(row, op.name==='作业详情'); return; }
      if(pageId.value===WJ_ORDER && op.name==='执行'){ openWjExec(row); return; }
      if(pageId.value===WX_PAGE && op.name==='确认发起'){ confirmWxLaunch(row); return; }
      if(pageId.value===WX_PAGE && op.name==='维修处理'){ openWxProcess(row); return; }
      if(pageId.value===WX_PAGE && op.name==='编辑'){
        if(wxStatusOf(row)==='已完成' || wxRepairState(row)!=='待发起'){ ElMessage.warning('仅待发起状态可编辑'); return; }
        openForm('edit');
        formModel._editId = row.id;
        formModel._instId = row._instId || '';
        ['维修单号','仪器编号','仪器名称','仪器类型','存放位置','问题类型','问题描述','问题附件','备注'].forEach(k=>{ formModel[k] = row[k] || ''; });
        return;
      }
      if(pageId.value===BX_PAGE && ['详情','复制','编辑'].includes(op.name)){
        if(op.name==='详情') openBxDetail(row);
        else openBxForm(op.name==='编辑' ? 'edit' : 'copy', row);
        return;
      }
      if(pageId.value===CL_PAGE && ['处理','详情'].includes(op.name)){
        if(op.name==='处理') openClDlg([row], false);
        else if(activeTab.value==='tab-2') openBxDetail(row, row);
        else openBxDetail(row);
        return;
      }
      if(pageId.value===WO_PAGE && ['维修','详情','编辑'].includes(op.name)){
        if(op.name==='维修') openWoFix(row);
        else if(op.name==='编辑') openWoForm('edit', row);
        else if(activeTab.value==='tab-2') openWoDetail(row, row);
        else openWoDetail(row);
        return;
      }
      if(pageId.value===MY_WX_PAGE && ['维修','详情'].includes(op.name)){
        if(op.name==='维修') openWoFix(row);
        else openWoDetail(row);
        return;
      }
      if(pageId.value==='mrb-review' && op.name==='发起审批'){ mrbLaunchAudit(row); return; }
      if(pageId.value==='capa-internal' && op.name==='确认发起'){ capaConfirmLaunch(row); return; }
      if(isTyPage() && op.name==='审核'){ openTyAudit(row); return; }
      if(isTyPage() && ['发起审批','复制','编辑','详情'].includes(op.name)){
        if(op.name==='发起审批') openTyAp([row], false);
        else if(op.name==='详情') openTyDetail(row);
        else openTyForm(op.name==='复制' ? 'copy' : 'edit', row);
        return;
      }
      if(pageId.value===YS_PAGE && ['验收','详情'].includes(op.name)){
        if(op.name==='验收') openYsDlg([row], false);
        else if(activeTab.value==='tab-2') openWoDetail(row, row, WO_DETAIL);
        else openWoDetail(row);
        return;
      }
      if(pageId.value===YL_PAGE && op.name==='查看详情'){ openYlSource(row); return; }
      if(pageId.value===WJ_ORDER && op.name==='编辑' && !DJ_OPEN.includes(row['单据状态'])){ ElMessage.warning('仅待执行、执行中的外校单可编辑'); return; }
      if(isDjPlanPage() && op.name==='编辑' && !DJ_OPEN.includes(row['计划状态'])){ ElMessage.warning('仅待执行、执行中的'+djKind().w+'计划可编辑'); return; }
      if(pageId.value===LAB_INSP_PLAN && (op.name==='作业执行' || op.name==='作业详情')){ openLabInspExec(row, op.name==='作业详情'); return; }
      if(pageId.value===SPI_PAGE && op.name==='详情'){ openDetail(spiEnsurePeaks(row) || row); return; }
      if((op.name==='详情' && pageId.value!=='insp-scheme' && pageId.value!=='insp-method' && pageId.value!==DRIFT_PAGE && pageId.value!==HM_IMP_PAGE) || op.name==='变更详情' || op.name==='盘点详情' || (op.name==='作业详情' && pageId.value==='wh-insp-plan')){ openDetail(row); return; }
      if(pageId.value===LAB_PREP && (op.name==='执行' || op.name==='配制详情')){ openLabPrepExec(row, op.name==='配制详情'); return; }
      if(pageId.value===LAB_PREP && op.name==='编辑' && row['单据状态']!=='待执行'){ ElMessage.warning('仅待执行状态的配液单可编辑'); return; }
      if(pageId.value===LAB_CALIB && (op.name==='执行' || op.name==='标定详情')){ openLabCalibExec(row, op.name==='标定详情'); return; }
      if(pageId.value===LAB_CALIB && op.name==='编辑' && row['单据状态']!=='待执行'){ ElMessage.warning('仅待执行状态的标定单可编辑'); return; }
      if(op.name==='编辑' && pageId.value==='lg-dispatch'){
        const audit = row['审核状态']||'';
        const st = row['状态']||'';
        if(!((audit==='待审核' || audit==='已驳回') && st==='待执行')){
          ElMessage.warning('仅待审核/已驳回且待执行的派车申请单可编辑'); return;
        }
      }
      if(op.name==='编辑' && pageId.value==='po'){
        if(!canEditPo(row)){
          ElMessage.warning('仅「待执行」状态的采购订单可编辑'); return;
        }
      }
      if(op.name==='编辑' && pageId.value==='so'){
        if(!canEditSo(row)){
          ElMessage.warning('仅「待执行」状态的销售订单可编辑'); return;
        }
      }
      if(op.name==='编辑' && pageId.value==='wwpo'){
        if(!canEditWwpo(row)){
          ElMessage.warning('仅「待执行」状态的委外加工订单可编辑'); return;
        }
      }
      if(op.name==='编辑' && isWhNoticePage()){
        if(row['单据状态']!=='待执行'){
          const meta = isOsPoPage() ? osNoticeMeta() : null;
          ElMessage.warning(meta ? ('仅「待执行」状态的' + meta.label + '可编辑') : (pageId.value==='wh-po-ret' ? '仅「待执行」状态的采购退料通知单可编辑' : '仅「待执行」状态的收料通知单可编辑')); return;
        }
      }
      if(op.name==='编辑' && isProdWhPage()){
        if(row['单据状态']!=='待执行'){
          const meta = prodAppMeta();
          ElMessage.warning('仅「待执行」状态的'+(meta?meta.label:'申请单')+'可编辑'); return;
        }
      }
      if(op.name==='编辑' && isRestWhNoticePage()){
        const sk = restWhStatusKey();
        if(row[sk]!=='待执行'){
          ElMessage.warning('仅「待执行」状态的单据可编辑'); return;
        }
      }
      if(op.name==='编辑' && pageId.value==='serial-arch'){
        if(row['使用状态']!=='在用' || row['库存状态']!=='初始化'){
          ElMessage.warning('仅使用状态=在用且库存状态=初始化时可编辑'); return;
        }
      }
      if(op.name==='编辑' && pageId.value==='tank-arch'){
        if(!canEditTankArch(row)){
          ElMessage.warning('仅使用状态=在用且行物料无值（空罐）时可编辑'); return;
        }
      }
      if(op.name==='编辑' && (pageId.value==='wh-insp-scheme' || pageId.value===LAB_INSP_SCHEME)){
        if(row['启用状态']==='启用'){ ElMessage.warning('启用中的巡检方案不可编辑'); return; }
      }
      if(op.name==='编辑' && pageId.value==='wh-insp-plan'){
        if(row['计划状态']!=='待执行'){ ElMessage.warning('仅待执行状态的巡检计划可编辑'); return; }
      }
      if(op.name==='编辑' && pageId.value===LAB_INSP_PLAN){
        if(!['待执行','执行中'].includes(row['计划状态'])){ ElMessage.warning('仅待执行或执行中的巡检计划可编辑'); return; }
      }
      if(op.name==='编辑' && isLabCountPage()){
        if(row['状态']!=='待执行'){ ElMessage.warning('仅待执行状态的盘点单可编辑'); return; }
      }
      if(op.name==='编辑' && isLabRgIoPage()){
        if(row['单据状态']!=='待执行'){ ElMessage.warning('仅待执行状态的'+labRgIoDir()+'单可编辑'); return; }
      }
      if(op.name==='编辑' && pageId.value==='np-0201-02'){
        if(row['单据状态']!=='未完成'){ ElMessage.warning('仅未完成的内部委托单可编辑'); return; }
      }
      if(op.name==='编辑' && pageId.value==='insp-order' && activeTab.value==='tab-oe'){
        if(row['单据状态']!=='待执行'){ ElMessage.warning('仅待执行的内部委托报检单可编辑'); return; }
      }
      if(op.name==='编辑' && (pageId.value==='bc-scrap-proc' || pageId.value==='bc-freeze' || pageId.value==='bc-unfreeze')){
        if(row['单据状态']!=='待执行'){
          ElMessage.warning('仅待执行状态的单据可编辑'); return;
        }
      }
      if(pageId.value===DRIFT_PAGE && (op.name==='详情' || op.name==='编辑' || op.name==='复制')){
        openDriftForm(op.name==='详情'?'detail':(op.name==='复制'?'copy':'edit'), row); return;
      }
      if(pageId.value===DRIFT_PAGE && op.name==='删除'){
        deleteDriftRows([row.id]); return;
      }
      if(pageId.value===COL_PAGE && op.name==='查看履历'){ colViewHistory(row); return; }
      if(pageId.value===COL_PAGE && op.name==='删除'){ deleteColRows([row]); return; }
      if(pageId.value===SPI_PAGE && op.name==='编辑'){ openSpiForm('edit', row); return; }
      if(pageId.value===SPI_PAGE && op.name==='重新识别'){ reRecognizeSpi(row); return; }
      if(pageId.value===SPI_PAGE && op.name==='删除'){ deleteSpiRows([row]); return; }
      if(pageId.value===COST_FLOW && op.name==='编辑'){ openCostFlowEdit(row); return; }
      if(op.name==='编辑' || op.name==='复制' || op.name==='版本查看' || (op.name==='修改数据B' && pageId.value===HM_IMP_PAGE) || (op.name==='详情' && (pageId.value==='insp-scheme' || pageId.value==='insp-method' || pageId.value===HM_IMP_PAGE))){
        if(pageId.value==='np-0501-01' && op.name==='编辑' && (row||{})['采集状态']==='开启'){
          ElMessage.warning('开启状态不可编辑'); return;
        }
        openForm((op.name==='详情' || op.name==='版本查看') ? 'detail' : (op.name==='复制' ? 'copy' : 'edit'));
        if(pageId.value===HM_IMP_PAGE) hmEditBOnly.value = (op.name==='修改数据B');
        if(pageId.value==='np-0501-01') formModel['采集方案编码'] = row['采集方案编码'] || '';
        formSwitch['启用状态'] = row['启用状态']!=='禁用';
        (activeFormFields.value||[]).forEach(f=>{
          if(!f || !f.name || f.type==='switch') return;
          if(f.type==='ratio'){
            fillMatUomRatioFromStored(row[f.name]);
            return;
          }
          const v = row[f.name];
          if(f.multiple){
            formModel[f.name] = splitDun(v);
          } else {
            formModel[f.name] = (v===undefined || v===null || v==='—') ? '' : v;
          }
          if(f.type==='number-unit'){
            const uk = f.unitName || (f.name+'单位');
            formModel[uk] = row[uk] || f.defaultUnit || '';
            if(pageId.value===HM_IMP_PAGE && f.name==='使用周期'){
              formModel[f.name] = row['使用周期值'] || String(row['使用周期']||'').replace(/\s*[天月年].*$/, '') || '';
            }
            if(pageId.value===HM_LIB_PAGE && (f.name==='使用周期' || f.name==='提前预警')){
              const parsed = hmSplitNu(row[f.name], row[f.name+'单位']);
              const blank = row['使用期限类型']==='永久使用' || row[f.name]==='—' || !row[f.name];
              formModel[f.name] = blank ? '' : parsed.n;
              formModel[f.name+'单位'] = parsed.u || '天';
            }
            if(pageId.value===HM_CHG_PAGE && /使用周期$|提前预警$/.test(f.name)){
              const raw = row[f.name+'值'];
              formModel[f.name] = (raw!==undefined && raw!==null && raw!=='') ? raw : (row[f.name]==='—' ? '' : String(row[f.name]||'').replace(/\s*[天月年].*$/, ''));
            }
            if(pageId.value===HM_IMP_PAGE && f.name==='提前预警' && (row['提前预警']==='—' || row['使用期限类型']==='永久使用')){
              formModel[f.name] = '';
            }
            if(pageId.value===HM_CHG_PAGE && /提前预警$/.test(f.name)){
              const typeKey = f.name.replace('提前预警','使用期限类型');
              if(row[f.name]==='—' || row[typeKey]==='永久使用') formModel[f.name] = '';
            }
          }
        });
        formModel._editId = row.id;
        if(pageId.value===SHIFT_PAGE && !formModel['段数']){
          formModel['段数'] = '1';
          formModel['段1开始'] = String(row['开始时间']||'').trim();
          formModel['段1结束'] = String(row['结束时间']||'').trim();
          formModel['段1类型'] = '工作';
        }
        if(pageId.value==='ledger' && op.name==='编辑'){
          loadLedgerEditItems(row);
        }
        if(pageId.value===OQC_PAGE){
          formModel['单据号'] = row['单据号'] || '';
          formModel['客户信息'] = [row['客户编码'], row['客户名称']].filter(x=> x && x!=='—').join(' / ');
          formModel['物料信息'] = [row['物料编码'], row['物料名称'], row['物料规格']].filter(x=> x && x!=='—').join(' / ');
          ['客户编码','客户名称','物料编码','物料名称','物料规格'].forEach(k=>{ formModel[k] = row[k] || ''; });
        }
        if(pageId.value==='np-0201-01'){
          ['物料编码','物料名称','物料规格','物料种类','供应商编码','供应商名称','客户编码','客户名称','报检批号','基本单位'].forEach(k=>{
            if(row[k]!==undefined && row[k]!==null) formModel[k] = row[k];
          });
          urReleaseHydrateForm(row);
          if(op.name==='复制') formModel['放行单号'] = qcNextNo(qcAllRows('np-0201-01'), '放行单号', 'WJ');
        }
        if(pageId.value==='np-0201-02'){
          const sample = oeAllSamples().find(r=> r['样品编号']===row['样品编号']);
          formModel._schemeName = row['检验方案'] || (sample && sample['检验方案']) || '';
          const lines = Array.isArray(row._lines) && row._lines.length ? row._lines : oeLinesFromText(row['委托项目']);
          formLineRows.value = lines.map(l=> ({ ...l }));
        }
        if(pageId.value==='insp-order' && activeTab.value==='tab-oe'){
          formModel['物料信息'] = [row['物料编码'], row['物料名称'], row['物料规格']].filter(x=> x && x!=='—').join(' / ');
          if(row['来源组织'] && row['来源组织']!=='—') formModel['来源组织'] = row['来源组织'];
          ['物料编码','物料名称','物料规格','物料种类'].forEach(k=>{ if(row[k] && row[k]!=='—') formModel[k] = row[k]; });
          formLineRows.value = [];
        }
        if(pageId.value==='np-0502-01'){
          formModel['过程监测编码'] = row['过程监测编码'] || '';
          formLineRows.value = [envMonLineFromLedger(row, op.name==='编辑' ? row.id : '')];
        }
        if(pageId.value==='np-0601-01'){
          formModel['产出物料'] = [row['产出物料编码'], row['产出物料名称']].filter(Boolean).join(' / ');
          ['产出物料编码','产出物料名称','产出物料规格','产出物料种类','产出批号','事件类型','来源单据名称','来源单号','备注'].forEach(k=>{ formModel[k] = row[k] || ''; });
          formLineRows.value = [{
            _i: row.id,
            来源物料: [row['来源物料编码'], row['来源物料名称']].filter(Boolean).join(' / '),
            来源批号: row['来源批号'] || '',
            来源物料编码: row['来源物料编码'] || '',
            来源物料名称: row['来源物料名称'] || '',
            来源物料规格: row['来源物料规格'] || '',
            来源物料种类: row['来源物料种类'] || ''
          }];
        }
        if(pageId.value===HM_CHG_PAGE){
          formModel._fileType = row['文件类型'] || '';
          formModel._libId = row._libId || '';
          formModel['文件编号'] = row['文件编号'] || '';
        }
        if(pageId.value===HM_ARCH_PAGE){
          hmArchLoadLines(row);
        }
        if(pageId.value===HM_IMP_PAGE){
          hmImpLoadEntry(row);
        }
        if(pageId.value===HM_LIB_PAGE){
          const code = row['客户编码'] && row['客户编码']!=='—' ? row['客户编码'] : '';
          const name = row['客户名称'] && row['客户名称']!=='—' ? row['客户名称'] : '';
          formModel['客户信息'] = row['客户信息'] && row['客户信息']!=='—' ? row['客户信息'] : [code, name].filter(Boolean).join(' / ');
          formModel['客户编码'] = code;
          formModel['客户名称'] = name;
          if(row['法规名称']==='—') formModel['法规名称'] = '';
          formModel['文件类型'] = hmFileTypeName(row['文件类型']);
        }
        if(pageId.value===BX_EXP_PAGE){
          formModel['适用仪器类型'] = splitComma(row['适用仪器类型']);
          formModel['适用故障类型'] = splitComma(row['适用故障类型']);
        }
        if(TPL_PAGES[pageId.value]){
          resetTplForm(row);
          if(op.name==='复制') [tplKind.value+'编码', tplKind.value+'名称'].forEach(k=>{ formModel[k] = ''; });
        }
        if(pageId.value===WX_PAGE){
          formModel._instId = row._instId || '';
          if(op.name==='复制'){ formModel['维修单号'] = nextWxNo(); formModel._editId = undefined; }
        }
        if(pageId.value===TRAIN_PAGE){
          formLineRows.value = op.name==='复制' ? [] : [{ 工号: row['工号'], 姓名: row['姓名'], 部门: row['部门'], 培训结果: row['培训结果']||'', 附件: row['附件']||'' }];
        }
        if(pageId.value===COL_PAGE){
          if(op.name==='复制'){ formModel['色谱柱编号'] = ''; formModel['色谱柱条码'] = ''; }
          formModel._colBcFrom = formModel['色谱柱条码']===formModel['色谱柱编号'] ? formModel['色谱柱编号'] : null;
        }
        if(pageId.value===PERSON_PAGE){
          formLineRows.value = (row._abilities||[]).map(a=> Object.assign(emptyPersonAbility(), a));
          if(op.name==='复制') ['编码','工号','入职日期','电子签名','附件', ...PERSON_USER_KEYS].forEach(k=>{ formModel[k] = ''; });
        }
        if(pageId.value==='insp-method' && (activeTab.value==='tab-method' || (tabView.value||{}).name==='tab-method')){
          formModel['是否使用公用参数'] = row['是否使用公用参数'] || (row['公用参数'] ? '是' : '否') || '是';
          formModel['公用测试次数'] = row['公用测试次数'] || '';
          formModel['是否使用样本参数'] = row['是否使用样本参数'] || (row['样本参数'] ? '是' : '否') || '是';
          formModel['样本测试次数'] = row['样本测试次数'] || undefined;
          formModel._fromVersionTree = op.name==='版本查看';
          inspMethodPublicParams.value = Array.isArray(row._publicParams)
            ? row._publicParams.map(cloneInspMethodParamRow)
            : [];
          inspMethodSampleParams.value = Array.isArray(row._sampleParams)
            ? row._sampleParams.map(cloneInspMethodParamRow)
            : [];
          inspMethodMatRows.value = Array.isArray(row._mats) ? row._mats.map(normalizeInspMethodMat) : [];
          inspMethodMatSelected.value = [];
          inspMethodMatCatRows.value = Array.isArray(row._matCats) ? row._matCats.map(normalizeInspMethodMatCat) : [];
          inspMethodMatCatSelected.value = [];
          inspMethodInnerTab.value = '项目';
          if(op.name==='复制'){
            formModel['检验方法编码'] = '';
            formModel['检验方法名称'] = '';
            delete formModel._editId;
            formModel._fromVersionTree = false;
          }
        }
        if(pageId.value===MAINT_PERSON_PAGE && op.name==='复制'){
          ['人员编码','学历', ...MAINT_USER_KEYS].forEach(k=>{ formModel[k] = ''; });
        }
        if(pageId.value===SLPOS_PAGE && op.name==='复制'){
          formModel['去向编码'] = '';
          delete formModel._editId;
        }
        if(pageId.value===COST_PAGE){
          const hour = costHourParts(row);
          formModel['标准系数'] = hour.n;
          delete formModel['标准系数单位'];
          formLineRows.value = dispatchLinesFromRow(row);
          formLineSelected.value = [];
          formCatRows.value = dispatchCatsFromRow(row, '检验类');
          formCatSelected.value = [];
          if(op.name==='复制'){ formModel['方案编码'] = ''; delete formModel._editId; }
        }
        if(pageId.value===COST_FLOW){
          const hour = costHourParts(row);
          formModel['标准系数'] = hour.n;
          delete formModel['标准系数单位'];
        }
        if(pageId.value===DISPATCH_PAGE){
          ['方案名称','派单班组'].forEach(k=> { formModel[k] = row[k] || ''; });
          formLineRows.value = dispatchLinesFromRow(row);
          formCatRows.value = dispatchCatsFromRow(row);
          formCatSelected.value = [];
          formInstRows.value = dispatchInstsFromRow(row);
          formInstSelected.value = [];
          formModel['使用仪器'] = formInstRows.value.map(r=> r['仪器名称']).filter(Boolean).join('、');
          if(op.name==='复制'){ formModel['方案编码'] = ''; delete formModel._editId; }
        }
        if(pageId.value===SHIFT_PAGE){
          if(splitDun(formModel['适用班组']).join('、')==='通用') formModel['适用班组'] = '';
          if(op.name==='复制'){ formModel['班次编码'] = ''; delete formModel._editId; }
        }
        if(pageId.value===CAL_PAGE){
          formLineRows.value = (row._dates || []).map(r=> ({ 日期: r['日期']||'', 类型: r['类型']||'休息日', 说明: r['说明']||'' }));
          formLineSelected.value = [];
          if(splitDun(formModel['适用班组']).join('、')==='通用') formModel['适用班组'] = '';
          if(op.name==='复制'){ formModel['日历编码'] = ''; delete formModel._editId; }
        }
        if(pageId.value==='insp-project' && (activeTab.value==='tab-category' || (tabView.value||{}).name==='tab-category')){
          formModel['检验类编码'] = row['检验类编码']||'';
          formModel['检验类名称'] = row['检验类名称']||'';
          formModel['检验类属性'] = row['检验类属性']||'通用';
          formModel['适用仪器类型'] = splitDun(row['适用仪器类型']);
          formModel['备注'] = row['备注']==='—'?'':(row['备注']||'');
          if(op.name==='复制'){
            formModel['检验类编码'] = '';
            formModel['检验类名称'] = '';
            delete formModel._editId;
          }
        }
        if(pageId.value==='insp-scheme'){
          formModel['检验方案编码'] = row['检验方案编码']||'';
          formModel['检验方案名称'] = row['检验方案名称']||'';
          formModel['备注'] = row['备注']==='—'?'':(row['备注']||'');
          schemeQualRows.value = Array.isArray(row._qualItems) ? row._qualItems.map(hydrateSchemeItemRow) : [];
          schemeQuantRows.value = Array.isArray(row._quantItems) ? row._quantItems.map(hydrateSchemeItemRow) : [];
          schemePointRows.value = Array.isArray(row._points) ? row._points.map(r=>({...r})) : [];
          schemeMatRows.value = Array.isArray(row._mats) ? row._mats.map(r=>({...r})) : [];
          schemeCustRows.value = Array.isArray(row._custs) ? row._custs.map(r=>({...r})) : [];
          schemeSuppRows.value = Array.isArray(row._supps) ? row._supps.map(r=>({...r})) : [];
          schemeMediaRows.value = Array.isArray(row._media) ? row._media.map(r=>({...r})) : [];
          schemeInnerTab.value = '指标集';
          if(op.name==='复制'){
            formModel['检验方案编码'] = '';
            formModel['检验方案名称'] = '';
            delete formModel._editId;
          }
        }
        if(pageId.value==='qr-config'){
          resetQrConfigFormLists();
          formModel['报告类型'] = row['报告类型']||'';
          formModel['报告模板名称'] = row['报告模板名称']||'';
          formModel['模板文件名称'] = row['模板文件名称']||'';
          formModel['开具方式'] = row['开具方式']||'一批一份';
          formModel['取值方式'] = (row['取值方式'] && row['取值方式']!=='—') ? row['取值方式'] : ((row['批次取值逻辑'] && row['批次取值逻辑']!=='—') ? row['批次取值逻辑'] : '批次平均值');
          formModel['备注'] = row['备注']==='—'?'':(row['备注']||'');
          schemeMatRows.value = Array.isArray(row._mats) ? row._mats.map(r=>({...r})) : [];
          schemeCustRows.value = Array.isArray(row._custs) ? row._custs.map(r=>({...r})) : [];
          qrFieldRows.value = Array.isArray(row._fields) ? row._fields.map(r=>({...r})) : [];
          qrConfigInnerTab.value = '物料';
          if(op.name==='复制'){
            formModel['报告模板名称'] = '';
            delete formModel._editId;
          }
        }
        if(pageId.value==='qr-issue'){
          formModel['来源单据名称'] = row['来源单据名称']||'报检单';
          formModel['来源单号'] = row['来源单号']||'';
          formModel['客户名称'] = row['客户名称']||'';
          formModel['客户编码'] = row['客户编码']||'';
          formModel['物料信息'] = [row['物料编码'], row['物料名称'], row['物料规格']].filter(Boolean).join(' / ') || row['物料信息'] || '';
          formModel['物料编码'] = row['物料编码']||'';
          formModel['物料名称'] = row['物料名称']||'';
          formModel['物料规格'] = row['物料规格']||'';
          formModel['物料种类'] = row['物料种类']||'';
          formModel['备注'] = row['备注']==='—'?'':(row['备注']||'');
          formModel['开具单号'] = op.name==='复制' ? nextQrIssueNo() : (row['开具单号']||nextQrIssueNo());
          formModel['报告模板名称'] = row['报告模板名称']||'';
          formModel['报告类型'] = row['报告类型']||'';
          formModel['开具方式'] = row['开具方式']||'';
          formModel['批次取值逻辑'] = row['批次取值逻辑']||'';
          formLineRows.value = Array.isArray(row._samples) ? row._samples.map(r=>({...r})) : (
            (row['样品编号'] && row['样品编号']!=='—') ? [{ 物料批号: row['物料批号']||'', 样品编号: String(row['样品编号']).split(/[、,，]/)[0], 样品来源: (String(row['样品来源']||'报检取样').split(/[、,，]/)[0]) }] : []
          );
          if(op.name==='复制') delete formModel._editId;
        }
        if(pageId.value==='form-setting'){
          formModel['版本号'] = row['版本号']||'V1.0';
          formModel['表单类型'] = treeListId.value || row['表单类型'] || '';
          if(op.name==='复制'){
            formModel['表单编码'] = '';
            formModel['表单名称'] = '';
            delete formModel._editId;
          }
        }
        if(pageId.value==='form-data-source' && (op.name==='编辑' || op.name==='复制')){
          formModel['关联表单数据源'] = row['资源名称'] || treeListId.value || '';
          formSwitch['是否主键'] = row['是否主键'] === '是';
          formSwitch['是否可修改'] = row['是否可修改'] !== '否';
        }
        if(pageId.value==='samp-scheme'){
          formModel['抽样方案编码'] = row['抽样方案编码']||'';
          formModel['抽样方案名称'] = row['抽样方案名称']||'';
          formModel['抽样类型'] = row['抽样类型']||'抽检';
          formModel['备注'] = row['备注']==='—'?'':(row['备注']||'');
          formModel['作业说明'] = row['作业说明']==='—'?'':(row['作业说明']||'');
          formModel['作业附件'] = row['作业附件']==='—'?'':(row['作业附件']||'');
          sampInspectTypes.value = Array.isArray(row._inspectTypes)
            ? row._inspectTypes.slice()
            : String(row['适用报检单']||'').split(/[、,，]/).map(s=>s.trim()).filter(Boolean);
          sampRuleRows.value = Array.isArray(row._rules) ? row._rules.map(r=>({...r})) : [];
          sampMatRows.value = Array.isArray(row._mats) ? row._mats.map(r=>({...r})) : [];
          sampMatSelected.value = [];
          sampRuleSelected.value = [];
          normalizeSampRuleFixed();
          sampInnerTab.value = '抽样规则';
          if(op.name==='复制'){
            formModel['抽样方案编码'] = '';
            formModel['抽样方案名称'] = '';
            delete formModel._editId;
          }
        }
        if(pageId.value==='auto-samp'){
          ['登样方案编码','登样方案名称','内容描述','计划开始时间','循环方式','执行条件','适用报检单','备注'].forEach(k=>{
            const v = row[k];
            formModel[k] = (v===undefined || v===null || v==='—') ? '' : v;
          });
          formModel['执行周期'] = row._executeCycle != null ? row._executeCycle : (String(row['执行周期']||'').replace(/[^\d]/g,'') || '');
          formModel['执行周期单位'] = row._executeCycleUnit || row['执行周期单位'] || (String(row['执行周期']||'').replace(/[\d\s]/g,'') || '时');
          if(!formModel['执行周期单位']) formModel['执行周期单位'] = '时';
          if(!formModel['适用报检单']) formModel['适用报检单'] = '生产过程检';
          autoSampDetailRows.value = Array.isArray(row._details) ? row._details.map(r=>({...r})) : [];
          autoSampDetailSelected.value = [];
          if(op.name==='复制'){
            formModel['登样方案编码'] = '';
            formModel['登样方案名称'] = '';
            delete formModel._editId;
          }
        }
        if(pageId.value==='spc-rule'){
          formModel['规则名称'] = row['规则名称']||'';
          formModel['规则依据'] = row['规则依据']||'';
          const nRaw = row.n != null && row.n !== '' ? row.n : (row['[n]']||'');
          const mRaw = row.m != null && row.m !== '' ? row.m : (row['[m]']||'');
          formModel['[n]'] = nRaw === '' || nRaw == null ? undefined : Number(nRaw);
          formModel['[m]'] = mRaw === '' || mRaw == null ? undefined : Number(mRaw);
        }
        if(pageId.value==='spc-scheme-insp'){
          formLineRows.value = Array.isArray(row._lines) ? row._lines.map((r,i)=>({...r, _i:i+1})) : [];
          if(op.name==='复制'){
            formModel['SPC查询方案编码'] = '';
            formModel['SPC查询方案名称'] = '';
            delete formModel._editId;
          }
        }
        if(isWhNoticePage()){
          let lines = Array.isArray(row._lines) ? row._lines.slice() : [];
          if(lines.length && (pageId.value==='wh-po-in' || pageId.value==='wh-po-ret' || isOsFinishedNoticePage())){
            const noticeCtx = noticeCtxFromForm(row);
            lines = assignNoticeSplitLineNos(alignNoticeDetailLinesFromShip(noticeCtx, lines), noticeCtx);
          }
          formLineRows.value = lines.length
            ? (pageId.value==='wh-po-ret'
              ? ensureLineNos(lines.map((r,i)=> normalizePoRetFormLine({ ...r }, i+1)))
              : ensureLineNos(lines.map((r,i)=>({ ...r, _i: i+1 }))))
            : [];
          const refField = whNoticeRefField();
          if(row[refField]){
            const refCode = codeOf(row[refField]);
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
        }
        if(pageId.value==='freight'){
          formModel['产品信息'] = row['产品名称'] || row['产品信息'] || '';
        }
        if(pageId.value==='serial-arch'){
          const a = parseQtyUnit(row['有效期'], '天');
          formModel['有效期'] = String(a.n||'').trim();
          formModel['有效期单位'] = String(a.u||'天').trim() || '天';
          if(!String(formModel['建档数量']||'').trim() && String(formModel['当前数量']||'').trim()){
            formModel['建档数量'] = formModel['当前数量'];
          }
          refreshSerialExpire(formModel);
        }
        if(pageId.value==='mat-list' && op.name==='复制'){
          formModel['物料编码'] = '';
          delete formModel._editId;
        }
        if(pageId.value==='mat-uom' && op.name==='复制'){
          formModel['物料编码'] = '';
          formModel['物料名称'] = '';
          formModel['物料规格'] = '';
          formModel['物料种类'] = '';
          delete formModel._editId;
        }

        if(pageId.value==='opc-point' && op.name==='复制'){
          formModel['点位名称'] = '';
          formModel['同步状态'] = '未同步';
          delete formModel._editId;
        }
        if(pageId.value==='gather-item'){
          const a = parseQtyUnit(row['采集频率'] || ((row['采集频率数值']!=null?row['采集频率数值']:'')+''+(row['采集频率单位']||'')), '秒');
          formModel['采集频率'] = a.n;
          formModel['采集频率单位'] = a.u || row['采集频率单位'] || '秒';
          if(op.name==='复制'){
            formModel['采集项编码'] = '';
            formModel['采集项名称'] = '';
            delete formModel._editId;
          }
        }
        if(pageId.value==='gather-scheme'){
          const lines = Array.isArray(row._lines) ? row._lines : (Array.isArray(row['指标集']) ? row['指标集'] : []);
          formLineRows.value = lines.map((r,i)=> hydrateGatherLine(r, i));
          if(op.name==='复制'){
            formModel['采集方案编码'] = '';
            formModel['采集方案名称'] = '';
            delete formModel._editId;
          }
        }
        if(pageId.value==='item-uom'){
          formModel['检验项单位1编码'] = row['检验项单位1编码']||'';
          formModel['检验项单位2编码'] = row['检验项单位2编码']||'';
        }
        if(pageId.value==='item-uom' && op.name==='复制'){
          formModel['检验项单位1'] = '';
          formModel['检验项单位1编码'] = '';
          formModel['检验项单位2'] = '';
          formModel['检验项单位2编码'] = '';
          delete formModel._editId;
        }
        if(pageId.value==='customer' && op.name==='复制'){
          formModel['客户编码'] = '';
          delete formModel._editId;
        }
        if(pageId.value==='supplier' && op.name==='复制'){
          formModel['供应商编码'] = '';
          delete formModel._editId;
        }
        if(pageId.value==='unit' && op.name==='复制'){
          formModel['单位编码'] = '';
          delete formModel._editId;
        }
        if(pageId.value==='dict' && op.name==='复制'){
          formModel['编码'] = '';
          delete formModel._editId;
        }
        if(pageId.value==='insp-proc' && op.name==='复制'){
          formModel['工序编码'] = '';
          formModel['工序名称'] = '';
          delete formModel._editId;
        }
        if(pageId.value==='insp-craft' && op.name==='复制'){
          formModel['工艺编码'] = '';
          formModel['工艺名称'] = '';
          delete formModel._editId;
          delete formModel._craft;
        }
        if(pageId.value==='pkg-craft'){
          formModel['适用业务单据'] = splitDun(row['适用业务单据']);
          formModel['适用单据类型'] = splitDun(row['适用单据类型']);
          formSwitch['启用状态'] = row['启用状态']!=='禁用';
          formLineRows.value = splitDun(row['适用物料']).filter(x=> x && x!=='—').map((label,i)=>{
            const parts = String(label).split(' / ');
            const code = parts[0] || codeOf(label);
            return {
              _i: i+1,
              物料编码: code,
              物料信息: matInfoText(code) || label
            };
          });
          if(op.name==='复制'){
            formModel['工艺编码'] = '';
            formModel['工艺名称'] = '';
            delete formModel._editId;
            delete formModel._craft;
          }
        }
        if(pageId.value==='wh-prod-issue' || pageId.value==='wh-prod-ret' || pageId.value==='wh-prod-in' || pageId.value==='wh-direct-xfer' || pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret' || pageId.value==='wh-other-in' || pageId.value==='wh-other-out' || pageId.value==='wh-load'){
          const src = ((isProdWhPage() || pageId.value==='wh-so-preout' || pageId.value==='wh-so-ship' || pageId.value==='wh-so-ret' || pageId.value==='wh-other-in' || pageId.value==='wh-other-out' || pageId.value==='wh-load') && Array.isArray(row._lines) && row._lines.length)
            ? row._lines
            : ((MOCK[pageId.value]||{}).detailLines||[]);
          const lines = src.map((r,i)=>({_i:i+1, ...r}));
          if(pageId.value==='wh-prod-in'){
            formLineRows.value = lines.length ? finalizeNoticeFormLines(lines, noticeCtxFromForm(row)) : [];
          } else {
            formLineRows.value = lines.length ? lines : [];
          }
          if(pageId.value==='wh-prod-issue' && !formModel['领料类型']) formModel['领料类型'] = '生产领料';
          if((pageId.value==='wh-other-in' || pageId.value==='wh-other-out') && !formModel['生产相关']) formModel['生产相关'] = '否';
        }
        if(pageId.value==='wh-insp-scheme'){
          const c = parseQtyUnit(row['执行周期'], '小时');
          formModel['执行周期'] = c.n;
          formModel['执行周期单位'] = c.u || '小时';
          const a = parseQtyUnit(row['提前提醒'], '分钟');
          formModel['提前提醒'] = a.n;
          formModel['提前提醒单位'] = a.u || '分钟';
          formSwitch['启用状态'] = row['启用状态']==='启用';
          formLineRows.value = (row._locs||[]).map((x,i)=> normInspSchemeLocRow(x, i));
        }
        if(pageId.value===LAB_INSP_SCHEME){
          const c = parseQtyUnit(row['执行周期'], '天');
          formModel['执行周期'] = c.n;
          formModel['执行周期单位'] = c.u || '天';
          const d = parseQtyUnit(row['标准作业时长'], '小时');
          formModel['标准作业时长'] = d.n;
          formModel['标准作业时长单位'] = d.u || '小时';
          const a = parseQtyUnit(row['提前提醒'], '小时');
          formModel['提前提醒'] = a.n;
          formModel['提前提醒单位'] = a.u || '小时';
          if(formModel['执行条件']==='按定时时间固定推移') formModel['执行条件'] = '按定时时间固定推移（默认）';
          formSwitch['启用状态'] = row['启用状态']==='启用';
          if(op.name==='复制'){
            formModel['巡检方案编码'] = '';
            formModel._editId = undefined;
          }
        }
        if(isDjSchemePage()){
          [['执行周期','天'],['标准作业时长','小时'],['提前提醒','小时']].forEach(([k, u])=>{
            const q = parseQtyUnit(row[k], u);
            formModel[k] = q.n;
            formModel[k+'单位'] = q.u || u;
          });
          formModel['指定维保班组'] = splitDun(row['指定维保班组']);
          formSwitch['启用状态'] = row['启用状态']!=='禁用';
          formLineRows.value = (row._insts||[]).map(l=>{
            const v = djInstLine(l);
            if(op.name==='复制') DJ_TIME_KEYS.forEach(k=>{ v[k] = ''; });
            return v;
          });
          if(op.name==='复制') formModel[djKind().w+'方案编码'] = '';
        }
        if(isDjPlanPage()){
          const q = parseQtyUnit(row['标准作业时长'], '小时');
          formModel['标准作业时长'] = q.n;
          formModel['标准作业时长单位'] = q.u || '小时';
          const aff = String(row[LAB_INSP_AFFECT]||'');
          formModel[LAB_INSP_AFFECT] = aff.includes('循环') ? '循环计划，更新' : '临时计划，不更新（默认）';
          formLineRows.value = row._instId ? [djInstLine({ _instId: row._instId })] : [];
        }
        if(pageId.value===LAB_INSP_PLAN){
          formModel['计划单号'] = row['计划单号'] || '';
          formModel['内容描述'] = row['内容描述'] || row['巡检方案描述'] || '';
          formModel['计划开始时间'] = row['计划开始时间'] || row['计划时间'] || '';
          formModel['表单名称'] = row['表单名称'] || '';
          const q = parseQtyUnit(row['标准作业时长'], '小时');
          formModel['标准作业时长'] = q.n;
          formModel['标准作业时长单位'] = q.u || '小时';
          if(!formModel[LAB_INSP_AFFECT]){
            const legacy = row['该计划是否影响后续巡检方案执行'] || '';
            formModel[LAB_INSP_AFFECT] = row[LAB_INSP_AFFECT]
              || (String(legacy).includes('循环') ? '循环计划，更新' : LAB_INSP_AFFECT_DEFAULT);
          }
        }
        if(isLabCountPage()){
          formModel['盘点单号'] = row['盘点单号'] || '';
          formModel['盘点类型'] = pageId.value===LAB_COUNT_QTY
            ? (splitDun(row['盘点类型'])[0] || '耗材')
            : splitDun(row['盘点类型']);
          formModel['盘点仓库'] = splitDun(row['盘点仓库']);
          formSwitch['启用状态'] = row['启用状态']!=='禁用';
          formLineRows.value = Array.isArray(row._lines) ? row._lines.map((r,i)=> ({...r, _i:i+1})) : [];
        }
        if(pageId.value==='wh-insp-plan'){
          formModel['计划单号'] = row['计划单号'] || '';
          formModel['内容描述'] = row['巡检方案描述'] || row['内容描述'] || '';
          formModel['巡检方案描述'] = row['巡检方案描述'] || '';
          formModel['仓库编号'] = row['仓库编号'] || '';
          formModel['仓库名称'] = row['仓库名称'] || '';
          formModel['仓库类型'] = row['仓库类型'] || '';
          formModel['负责人'] = row['负责人'] || '';
          fillPlanFromScheme(row['巡检方案名称'] || '');
          if(op.name==='复制'){
            formModel['目标仓库'] = row['仓库名称'] || '';
            fillInspPlanFromWarehouse(formModel['目标仓库']);
          }
          if(!formModel['是否影响后续']) formModel['是否影响后续'] = '临时计划，不更新';
        }
        if(pageId.value==='customer'){
          formLineRows.value = [];
        }
        if(pageId.value==='supplier'){
          formLineRows.value = [];
        }
        if(pageId.value==='po'){
          formLineRows.value = (row._lines||[]).map((r,i)=>normPoFormLine(r,i));
        }
        if(pageId.value==='so'){
          formLineRows.value = (row._lines||[]).map((r,i)=>normSoFormLine(r,i));
        }
        if(pageId.value==='wwpo'){
          formLineRows.value = (row._lines||[]).map((r,i)=>normWwpoFormLine(r,i));
        }
        if(isBcLineFormPage()){
          formLineRows.value = (row.lines||[]).map((r,i)=>({ _i: i+1, ...r }));
        }
        if(pageId.value==='qc-ledger'){
          Object.assign(formModel, {
            检验单号: row['检验单号']||'',
            检验类型: row['检验类型']||'来料检验',
            关联单号: row['关联单号']||'',
            物料信息: row['物料信息']||'',
            物料批次号: row['物料批次号']||row['批次号']||'',
            抽样数量: row['抽样数量']||'0',
            报检时间: row['报检时间']||'',
            报检人: row['报检人']||''
          });
        }
        if(false /*lg-order removed*/){
          Object.assign(formModel, {
            派车申请单号: row['派车申请单号']||'',
            关联派车申请单: row['关联派车申请单号']||row['关联派车申请单']||'',
            发货单位: row['发货单位']||'',
            收货单位: row['收货单位']||'',
            装货地点: row['装货地点']||'',
            装货联系人: row['装货联系人']||'仓库值班',
            装货联系电话: row['装货联系电话']||'0519-88880001',
            卸货地点: row['卸货地点']||'',
            卸货联系人: row['卸货联系人']||'收货员',
            卸货联系电话: row['卸货联系电话']||'0512-66660002',
            车型要求: row['车型要求']||'厢式货车',
            要求送达时间: row['要求送达时间']||'',
            特殊要求: row['特殊要求']||'—',
            承运公司: row['承运公司']||'',
            提货车辆: row['提货车辆']||row['车牌号']||'',
            司机: row['司机']||'',
            司机联系电话: row['司机联系电话']||'',
            核定载重量: row['核定载重量']||'',
            车辆资质证件: row['车辆资质证件']||'',
            实发总重量: row['实发总重量']||row['实发重量(T)']||'',
            实发总件数: row['实发总件数']||'',
            预计发车时间: row['预计发车时间']||'',
            预计到达时间: row['预计到达时间']||'',
            实际装车时间: row['实际装车时间']||'',
            实际发车时间: row['实际发车时间']||'',
            实际到达时间: row['实际到达时间']||'',
            运输备注: row['运输备注']||'',
            备注: row['备注']||''
          });
          const lines = ((MOCK['lg-dispatch']||{})||{}).detailLines || [];
          formLineRows.value = lines.map((r,i)=>({_i:i+1, ...r}));
        }
        if(pageId.value==='lg-waybill'){
          Object.assign(formModel, {
            运单号: row['运单号']||'',
            关联发货单: row['关联发货单']||'',
            关联派车申请单号: row['关联派车申请单号']||'',
            配送方式: row['配送方式']||'公路运输',
            运费: row['运费']||'',
            要求送达时间: row['要求送达时间']||'',
            计划装车时间: row['计划装车时间']||'',
            司机车牌号: row['司机车牌号']||'',
            司机姓名: row['司机姓名']||'',
            司机电话: row['司机电话']||'',
            排单时间: row['排单时间']||'',
            备注: row['备注'] && row['备注']!=='—' ? row['备注'] : ''
          });
          const lines = (MOCK['lg-waybill']||{}).detailLines || [];
          formLineRows.value = lines.map((r,i)=>({_i:i+1, ...r}));
        }
        if(pageId.value==='lg-dispatch'){
          const pre = normalizeDispatchSoShipPreDocs(row);
          const vt = row['用车类型']||'';
          const isOther = vt && !VEHICLE_OPTS.includes(vt);
          Object.assign(formModel, {
            编号: row['编号']||'',
            日期: row['日期']||'',
            申请部门: row['申请部门']||'',
            申请人: row['申请人']||'',
            用车类型: isOther ? '其他' : vt,
            用车类型其他: isOther ? vt : '',
            关联仓储业务: row['关联仓储业务'] || row['仓库业务类型'] || defaultWhBizForVehicle(isOther ? '其他' : vt),
            配送类型: row['配送类型']||'正常业务',
            订单类型: row['订单类型']||'',
            订单号: row['订单号']||'',
            关联销售备货单: pre.关联销售备货单,
            关联销售预出货单: pre.关联销售预出货单,
            前置关联单据: row['前置关联单据']||'',
            采购订单: row['采购订单']||'',
            合同号: row['合同号']||'',
            车型要求: row['车型要求']||'',
            是否带托盘: row['是否带托盘']||'否',
            特殊要求: row['特殊要求'] && row['特殊要求']!=='—' ? row['特殊要求'] : '',
            装货地点: row['装货地点']||'',
            装货联系人: row['装货联系人']||'',
            装货联系电话: row['装货联系电话']||'',
            卸货地点: row['卸货地点']||'',
            卸货联系人: row['卸货联系人']||'',
            卸货联系电话: row['卸货联系电话']||'',
            计划装车时间: row['计划装车时间']||'',
            要求送达时间: row['要求送达时间']||'',
            备注: row['备注'] && row['备注']!=='—' ? row['备注'] : ''
          });
          formLineRows.value = ensureLineNos(dispatchLinesOf(row)).map((r,i)=>({_i:i+1, ...r, 行号: lineNoOf(r, i+1)}));
        }
        if(pageId.value==='lg-ship'){
          if(row['状态']!=='待调度'){ ElMessage.warning('仅待调度状态的发货单可编辑'); return; }
          Object.assign(formModel, {
            发货单号: row['发货单号']||'',
            来源派车单号: row['来源派车单号']||'',
            状态: row['状态']||'待调度',
            关联运单: row['关联运单']||'—',
            申请部门: row['申请部门']||'',
            申请人: row['申请人']||'',
            用车类型: row['用车类型']||'',
            车型要求: row['车型要求']||'',
            是否带托盘: row['是否带托盘']||'',
            特殊要求: row['特殊要求'] && row['特殊要求']!=='—' ? row['特殊要求'] : '',
            订单号: row['订单号']||'',
            合同号: row['合同号']||'',
            采购订单: row['采购订单']||'',
            仓库业务类型: resolveWhBizType(row),
            装货点: row['装货点']||'',
            装货联系人: row['装货联系人']||'',
            装货联系电话: row['装货联系电话']||'',
            卸货点: row['卸货点']||'',
            卸货联系人: row['卸货联系人']||'',
            卸货联系电话: row['卸货联系电话']||'',
            计划装货时间: row['计划装货时间']||'',
            要求送达时间: row['要求送达时间'] && row['要求送达时间']!=='—' ? row['要求送达时间'] : '',
            备注: row['备注'] && row['备注']!=='—' ? row['备注'] : ''
          });
          formLineRows.value = shipLinesOf(row).map((r,i)=>({_i:i+1, ...r, 批号: r['批号']||''}));
        }
        if(pageId.value==='wwpo'){
          formLineRows.value = wwpoLinesOf(row);
        }
        return;
      }
      if(op.name==='检验'){
        qcInspectRow.value = row;
        const d = new Date();
        const pad = n => String(n).padStart(2,'0');
        const now = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const judged = ['合格','不合格'].includes(row['检验判定']) ? row['检验判定'] : '';
        Object.assign(qcInspectForm, {
          检验结果: judged,
          检验员: row['质检员'] || '张三',
          检验日期: now,
          检验备注: row['备注'] && row['备注']!=='—' ? row['备注'] : ''
        });
        qcInspectVisible.value = true;
        return;
      }
      if(op.name==='工艺配置'){
        if(pageId.value==='insp-craft' && row['启用状态']==='禁用'){
          ElMessage.warning('禁用状态不可进行工艺配置'); return;
        }
        craftRow.value = row;
        craftKw.value=''; craftZoom.value=1; craftLocked.value=false;
        if(pageId.value==='insp-craft' && row._craft){
          craftNodes.value = (row._craft.nodes||[]).map(n=>({...n}));
          craftEdges.value = (row._craft.edges||[]).map(e=> Array.isArray(e) ? [...e] : e);
        } else {
          const p = page.value || {};
          craftNodes.value = (p.craftNodes||[]).map(n=>({...n}));
          craftEdges.value = (p.craftEdges||[]).map(e=>[...e]);
        }
        craftVisible.value=true; return;
      }
      if(op.name==='表单设计' || op.name==='设计'){
        if(pageId.value==='form-setting' || pageId.value==='form-designer' || page.value?.designCanvas){
          designFormName.value = row['表单名称'] || row['名称'] || '未命名表单';
          designFormTitle.value = page.value?.designFormTitle || designFormName.value || '过程检查记录';
          designCanvas.value = JSON.parse(JSON.stringify(page.value?.designCanvas || []));
          designActive.value = designCanvas.value.length ? 0 : -1;
          designDirty.value = false;
          designVisible.value=true; return;
        }
      }
      if(op.name==='预览' && (pageId.value==='spc-scheme-insp')){
        detailRow.value = row;
        detailLineRows.value = Array.isArray(row._lines) ? row._lines.map(r=>({...r})) : [];
        detailVisible.value = true;
        return;
      }
      if((op.name==='预览' || op.name==='预览表单') && (pageId.value==='form-setting' || pageId.value==='form-designer')){
        designFormName.value = row['表单名称'] || row['名称'] || '未命名表单';
        designFormTitle.value = page.value?.designFormTitle || designFormName.value || '过程检查记录';
        designCanvas.value = JSON.parse(JSON.stringify(page.value?.designCanvas || []));
        formPreviewVisible.value=true; return;
      }
      if(op.name==='作业详情' && (pageId.value==='lg-pickup' || pageId.value==='lg-sign')){
        jobLogiMode.value = pageId.value==='lg-sign' ? 'sign' : 'pickup';
        jobStockMode.value = false;
        jobTitle.value = '详情';
        const keys = pageId.value==='lg-sign'
          ? ['状态','签收单号','关联运单号','关联提货单号','关联发货单号','物料信息','总数量','装货点','卸货点','承运商名称','签收人','签收人电话','签收时间','实际到达时间']
          : ['状态','提货单号','关联运单号','关联发货单号','关联派车单号','物料信息','总数量','申请部门','申请人','用车类型','车型要求','装货点','卸货点','承运商名称','司机车牌号','司机姓名','司机电话','计划装货时间'];
        const head = {};
        keys.forEach(k=>{ head[k] = row[k] ?? '—'; });
        jobHead.value = head;
        jobProcs.value = (row._procs || []).map(p=>({...p, fields:[...(p.fields||[])]}));
        jobProcIdx.value = 0;
        jobVisible.value = true;
        return;
      }
      if(op.name==='作业详情' || op.name==='盘点详情'){
        jobLogiMode.value = '';
        const jd = page.value?.jobDetail || {};
        jobTitle.value = (pageId.value==='wh-so-preout' || pageId.value==='wh-stocktake')
          ? '详情'
          : `${op.name} — ${row['盘点单号']||row['单号']||row['单据号']||row['装卸单号']||row['条码号']||row['转序单号']||row.id||''}`;
        const head = {};
        if(pageId.value==='wh-stocktake'){
          const skip = new Set(['id','_actions','_stockMatCodes','_lines']);
          (page.value?.tabViews?.[0]?.columns||[]).forEach(c=>{
            if(!c || !c.field || c.field==='_actions' || skip.has(c.field)) return;
            head[c.field] = row[c.field] ?? '—';
          });
          if(!Object.keys(head).length){
            Object.keys(row).forEach(k=>{ if(!skip.has(k)) head[k]=row[k]; });
          }
        } else {
          Object.keys(row).forEach(k=>{ if(!['id','_actions'].includes(k)) head[k]=row[k]; });
        }
        jobHead.value = head;
        jobStockMode.value = jd.mode === 'stocktake';
        if(jobStockMode.value){
          jobInvTip.value = jd.invTip || '';
          jobInvCols.value = jd.invColumns || [];
          jobBarcodeCols.value = jd.barcodeColumns || [];
          const mock = MOCK[pageId.value] || {};
          const mode = row['盘点方式'] || '';
          jobInvRows.value = (mock.stockInvLines || []).filter(r=> stocktakeInvRowVisible(r, [], mode));
          jobBarcodeRows.value = (mock.stockBarcodeLines || []).filter(r=> stocktakeBarcodeRowVisible(r, [], mode));
          jobProcs.value = [];
        } else {
          jobInvTip.value = '';
          jobInvCols.value = [];
          jobBarcodeCols.value = [];
          jobInvRows.value = [];
          jobBarcodeRows.value = [];
          jobProcs.value = (jd.procs||[]).map(p=>({...p, fields:[...(p.fields||[])]}));
        }
        jobProcIdx.value = 0;
        jobVisible.value=true; return;
      }
      if(op.name==='重打'){
        openPrintLabel([row]); return;
      }
      if(op.name==='禁用' || op.name==='启用'){
        ElMessage.success(op.name==='禁用'?'已禁用':'已启用'); return;
      }
      if(op.name==='发起审核' && pageId.value==='lg-dispatch'){
        if(!(row['审核状态']==='待审核' || row['审核状态']==='审核中') || row['状态']!=='待执行'){
          ElMessage.warning('仅待审核/审核中且待执行的派车申请单可发起审核');
          return;
        }
        dispatchAuditRow.value = row;
        dispatchAuditForm.审核结果 = '审核通过';
        dispatchAuditForm.审核意见 = '';
        dispatchAuditVisible.value = true;
        return;
      }
      if(op.name==='拆分'){
        if(row['审核状态']!=='已通过'){ ElMessage.warning('仅审核通过的派车申请单可拆分'); return; }
        if(!(row['状态']==='待执行' || row['状态']==='执行中')){ ElMessage.warning('当前执行状态不可拆分'); return; }
        splitRow.value = row;
        const pre = normalizeDispatchSoShipPreDocs(row);
        Object.assign(splitForm, {
          订单类型: row['订单类型'] || dispatchOrderTypeForBiz(row['关联仓储业务']||row['仓库业务类型']||resolveWhBizType(row)) || '',
          订单号: row['订单号']||'',
          关联销售备货单: pre.关联销售备货单,
          关联销售预出货单: pre.关联销售预出货单,
          前置关联单据: row['前置关联单据']||'',
          采购订单: row['采购订单']||'',
          合同号: row['合同号']||'',
          装货点: row['装货地点']||'',
          装货联系人: row['装货联系人']||'',
          装货联系电话: row['装货联系电话']||'',
          卸货点: row['卸货地点']||'',
          卸货联系人: row['卸货联系人']||'',
          卸货联系电话: row['卸货联系电话']||'',
          计划装货时间: row['计划装车时间']||'',
          要求送达时间: row['要求送达时间']||'',
          备注: ''
        });
        splitPickerMode.value = false;
        const baseLines = ensureLineNos(dispatchLinesOf(row)).map(r=>{
          const remain = Number(r['未拆数量'] ?? ((Number(r['需求数量'])||0) - (Number(r['已拆数量'])||0)));
          return { ...r, 批号: r['批号']||'', 未拆数量: String(remain), 本次发货数量: remain>0 ? String(remain) : '' };
        });
        splitLines.value = normalizeSplitLines(baseLines);
        splitLineSelected.value = [];
        splitVisible.value = true; return;
      }
      if(op.name==='二次派车（专线）' || op.name==='二次派车' || op.name==='专线派车'){
        if(row['状态']==='待派车'){
          ElMessage.warning('请先完成首程派车后再进行专线二次派车');
          return;
        }
        secondaryAssignRow.value = row;
        resetSecondaryAssignForm(row);
        secondaryAssignVisible.value = true;
        return;
      }
      if(op.name==='派车'){
        if(!(row['状态']==='待派车' || row['状态']==='待运输')){ ElMessage.warning('当前运单状态不可派车'); return; }
        assignRow.value = row;
        resetAssignForm(row);
        assignVisible.value = true; return;
      }
      if(op.name==='查看详情' && (pageId.value==='lg-kpi-plan' || pageId.value==='lg-kpi-record')){
        openDetail(row); return;
      }
      if(op.name==='分数项配置'){
        openKpiCfg(row); return;
      }
      if(op.name==='复核' && pageId.value==='lg-kpi-plan'){
        ElementPlus.ElMessageBox.confirm('确认通过对该考核计划的部门复核并送审吗？','复核确认',{
          confirmButtonText:'确认', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const d = new Date();
          const pad = n => String(n).padStart(2,'0');
          row['复核状态'] = '已复核';
          row['审核状态'] = '待审核';
          row['复核人'] = '李四';
          row['复核时间'] = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
          bumpStore();
          ElMessage.success('复核完成，已自动送审 (审核状态：待审核)');
        }).catch(()=>{});
        return;
      }
      if(op.name==='发起审核' && pageId.value==='lg-kpi-plan'){
        ElementPlus.ElMessageBox.confirm('确认发起该承运商考核计划的审核流程吗？','审核提交',{
          confirmButtonText:'确认', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const d = new Date();
          const pad = n => String(n).padStart(2,'0');
          row['审核状态'] = '审核中';
          const stamp = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          row._flow = [{ 步骤:'发起审核', 操作人: row['创建人']||'张三', 时间: stamp, 意见:'/', 结果:'已发起' }, { 步骤:'物流主管审核', 操作人:'李四', 时间:'—', 意见:'—', 结果:'待签' }];
          bumpStore();
          ElMessage.success('审核流程已成功发起');
        }).catch(()=>{});
        return;
      }
      if((op.name==='查看审核记录' || op.name==='查看审批记录')){
        openKpiFlow(row); return;
      }
      if(op.name==='删除' && pageId.value==='lg-kpi-scheme'){
        if(kpiSchemeInUse(row['方案名称'])){ ElMessage.warning('该考核方案已关联执行计划，不可删除'); return; }
        ElementPlus.ElMessageBox.confirm('确认删除该考核方案吗？删除后不可恢复。','提示',{
          confirmButtonText:'确认', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const list = (MOCK['lg-kpi-scheme']||{}).main || [];
          MOCK['lg-kpi-scheme'].main = list.filter(r=> r.id!==row.id);
          bumpStore();
          ElMessage.success('评价方案已删除');
        }).catch(()=>{});
        return;
      }
      if(op.name==='删除' && pageId.value==='wh-insp-scheme'){
        if(row['启用状态']==='启用'){ ElMessage.warning('启用中的巡检方案不可删除'); return; }
        ElementPlus.ElMessageBox.confirm('确认删除所选巡检方案？删除后不可恢复。','删除确认',{
          confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const list = (MOCK['wh-insp-scheme']||{}).main || [];
          MOCK['wh-insp-scheme'].main = list.filter(r=> r.id!==row.id);
          bumpStore();
          ElMessage.success('删除成功');
        }).catch(()=>{});
        return;
      }
      if(op.name==='删除' && pageId.value===LAB_INSP_SCHEME){
        if(row['启用状态']==='启用'){ ElMessage.warning('启用中的巡检方案不可删除'); return; }
        ElementPlus.ElMessageBox.confirm('确认删除所选巡检方案？删除后不可恢复。','删除确认',{
          confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          MOCK[LAB_INSP_SCHEME].main = labInspSchemeRows().filter(r=> r.id!==row.id);
          bumpStore();
          ElMessage.success('删除成功');
        }).catch(()=>{});
        return;
      }
      if(op.name==='删除' && pageId.value===LAB_INSP_PLAN){
        if(!['待执行','执行中'].includes(row['计划状态'])){ ElMessage.warning('仅待执行或执行中的巡检计划可删除'); return; }
        ElementPlus.ElMessageBox.confirm('确认删除该巡检计划？删除后不可恢复。','删除确认',{
          confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          MOCK[LAB_INSP_PLAN]['tab-1'] = labInspPlanBag('tab-1').filter(r=> r.id!==row.id);
          bumpStore();
          ElMessage.success('巡检计划已删除');
        }).catch(()=>{});
        return;
      }
      if(op.name==='取消派车'){
        if(row['状态']!=='待运输'){ ElMessage.warning('仅待运输状态可取消派车'); return; }
        ElementPlus.ElMessageBox.confirm('确认取消该运单的派车分配？取消后运单状态将重置为待派车。', '提示', {
          confirmButtonText:'确认取消', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          patchWaybill(row, {
            车牌号: '—',
            车挂号: '—',
            司机姓名: '—',
            司机电话: '—',
            驾驶证号: '—',
            从业资格证号: '—',
            押运员姓名: '—',
            押运员资格证号: '—',
            状态: '待派车'
          });
          const clearFleet = { 司机车牌号: '—', 车挂号: '—', 司机姓名: '—', 司机电话: '—' };
          patchPickupsByWaybill(row['运单号'], { ...clearFleet, 司机确认状态: '未确认' });
          patchSignsByWaybill(row['运单号'], clearFleet, true);
          if(STORE && row['运单号']) STORE.setDocStatus(row['运单号'], '待派车', { source:'PC', action:'unassign' });
          bumpStore();
          ElMessage.success('已取消派车分配，运单恢复为待派车状态');
        }).catch(()=>{});
        return;
      }
      /* 鼎材 QMS · 流程行操作（演示：打开表单或确认） */
      if(op.name==='直接提交'){
        ElementPlus.ElMessageBox.confirm('当前任务未完成，是否确认提前直接提交？','确认',{
          confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
        }).then(()=>{ ElMessage.success('直接提交成功（演示）'); }).catch(()=>{});
        return;
      }
      if(op.name==='打开计量SPC(单图)' || op.name==='打开计量SPC(多图)' || op.name==='打开计量SPC' || op.name==='查看图表' || op.name==='打开图表'){
        qcOpenSpcFromOverview(row, op.name.indexOf('单图')>=0 ? 'spc-single' : 'spc-multi');
        return;
      }
      if(op.name==='文件详情'){ openForm('文件详情'); return; }
      if(op.name==='预览' && pageId.value==='qr-issue'){ qcQrPreview(row); return; }
      if(op.name==='预览' && pageId.value==='spc-report-ledger'){ qcSpcLedgerPreview(row); return; }
      if(op.name==='预览'){ onFilePreview(row['文件名称'] || row['文件'] || row['报告名称'] || ''); return; }
      if(['取样','复核','处置','数据录入','快速录入','MRB评审','修改数据','修改数据B','评审','处理','整改处理','计算','发起变更','开具','下发处理'].includes(op.name)){
        let mode = ({ '取样':'samp', '复核':'recheck', '数据录入':'entry', '快速录入':'quick-entry', 'MRB评审':'mrb-audit', '整改处理':'capa-process', '处理':'capa-process' })[op.name] || 'edit';
        if(op.name==='处置'){
          mode = (pageId.value==='mrb-review') ? 'mrb-review-rec' : 'dispose';
        }
        if((op.name==='修改数据' || op.name==='修改数据B') && pageId.value==='ledger'){
          openLedgerModifyData(row);
          return;
        }
        openForm(mode);
        (activeFormFields.value||[]).forEach(f=>{
          if(!f || !f.name || f.type==='switch') return;
          const v = row[f.name];
          if(f.multiple){
            formModel[f.name] = splitDun(v);
          } else {
            formModel[f.name] = (v===undefined || v===null || v==='—') ? '' : v;
          }
        });
        if(op.name==='MRB评审'){
          formModel['MRB单号'] = qcNextNo(qcAllRows('mrb-review'), 'MRB单号', 'MRB-');
          formModel['来源处置类型'] = page.value?.title || '采购来料不合格';
          formModel['来源处置单号'] = row['处置单号'] || '';
          formModel['问题大类'] = formModel['问题大类'] || '含量';
          formModel['问题小类'] = formModel['问题小类'] || '纯度偏低';
          formModel['问题描述'] = formModel['问题描述'] || (row['异常描述'] || '');
        }
        if(op.name==='处置' && pageId.value!=='mrb-review'){
          formModel['问题大类'] = formModel['问题大类'] || '偏差';
          formModel['问题小类'] = formModel['问题小类'] || '趋势异常';
          formModel['问题描述'] = formModel['问题描述'] || (row['异常描述'] || '');
          formModel['处置说明'] = formModel['处置说明'] || '';
          const ways = page.value?.disposeWayOptions || [];
          if(ways.length){
            formModel['处置方式'] = formModel['处置方式'] || ways[0];
          }
          if(page.value?.disposeHasDetail) initDisposeDetailRows();
          else disposeDetailRows.value = [];
        }
        if(op.name==='处置' && pageId.value==='mrb-review'){
          const src = row['来源处置类型'] || '';
          let ways = ['让步','拒收/退货','返工','降级','特采'];
          if(src.includes('采购来料')) ways = ['让步','拒收/退货'];
          else if(src.includes('生产过程')) ways = ['让步','返工','降级'];
          else if(src.includes('生产物料')) ways = ['让步','特采','降级','返工'];
          formModel['处置方式'] = formModel['处置方式'] || ways[0];
          formModel._disposeWayOptions = ways;
        }
        if(op.name==='取样'){
          formModel['取样件数'] = row['待取样件数'] || row['应取样件数'] || '1';
          formModel['检验方案'] = row['检验方案'] || '';
          formModel['取样备注'] = row['报检备注'] || '';
          formModel._sampOrderNo = row['报检单号'] || '';
          {
            const schemeName = String(row['抽样方案名称']||'').trim();
            const schemeCode = String(row['抽样方案编码']||'').trim();
            const schemes = (((window.WMS_MOCK_ROWS || MOCK)['samp-scheme']||{}).main||[]);
            const scheme = schemes.find(s=>
              (schemeName && (s['抽样方案名称']||'')===schemeName) ||
              (schemeCode && (s['抽样方案编码']||'')===schemeCode)
            );
            const desc = scheme ? (scheme['作业说明']||'') : '';
            const file = scheme ? (scheme['作业附件']||'') : '';
            formModel['作业说明'] = (desc && desc!=='—') ? desc : '';
            formModel['作业附件'] = (file && file!=='—') ? file : '';
          }
          if(pageId.value==='wait-samp' && activeTab.value==='tab-rd'){
            const src = (((MOCK['insp-order']||{})['tab-rd'])||[]).find(r=> r['报检单号']===row['报检单号']);
            const v = (src && src['预计完成时间']) || row['预计完成时间'] || '';
            formModel['预计完成时间'] = v==='—' ? '' : v;
          }
          waitSampInnerTab.value = '样品信息';
          waitSampSampleRows.value = [];
          waitSampSampleSelected.value = [];
          waitSampItemRows.value = [
            {项目来源:'方案',检验项编码:'SCH-001',检验项名称:'HPLC纯度',检验项类型:'定量',所属检验类:'HPLC类',检验项单位:'%',指标:'≥99.90'},
            {项目来源:'方案',检验项编码:'SCH-002',检验项名称:'外观色泽',检验项类型:'定性',所属检验类:'外观类',检验项单位:'—',指标:'合格'}
          ];
          waitSampItemSelected.value = [];
          addWaitSampSample();
          if(pageId.value===FLOW_WAIT && activeTab.value==='tab-rd' && flowHas(row['样品编号']) && !flowSplitRow(row['样品编号'])){
            waitSampSampleRows.value[0]['样品编号'] = row['样品编号'];
          }
          if(row._sampDraft){
            const d = JSON.parse(JSON.stringify(row._sampDraft));
            Object.assign(formModel, d.form || {});
            if((d.samples||[]).length) waitSampSampleRows.value = d.samples;
            if((d.items||[]).length) waitSampItemRows.value = d.items;
          }
        }
        if(op.name==='复核'){
          formModel['复核结论'] = formModel['复核结论'] || '合格';
          formModel['复核说明'] = formModel['复核说明'] || '';
          recheckSampleRows.value = [{
            样品状态:'已完成', 检验结论:'合格', 偏差结论:'—',
            样品编号: row['样品编号'] || nextSampleNos(1)[0],
            样品来源:'报检取样', 检验方案: row['检验方案']||'OLED中间体来料检方案',
            方案项目: row['方案项目']||'HPLC纯度;外观色泽', 临时项目:'—',
            取样备注: row['取样备注']||'', 取样时间: row['取样时间']||row['报检时间']||'',
            取样人: row['取样人']||row['报检人']||'管理员'
          }];
        }
        if(op.name==='数据录入' || op.name==='快速录入' || op.name==='修改数据'){
          ['样品编号','样品来源','物料名称','物料规格','充装介质','采样点','报检批号','取样时间','报检单号','检验方案'].forEach(k=>{
            if(row[k]!=null && row[k]!=='—') formModel[k] = row[k];
          });
          const items = String(row['方案项目']||'HPLC纯度;外观色泽').split(/[;；,，]/).filter(Boolean);
          formLineRows.value = items.map((name, idx)=>({
            _i: idx+1, 检验项:name, 实测值: row['实测值']||'', 结论: row['结论']||'—', 偏差结论:'', 指标:'', 特殊公式:'', 备注:''
          }));
          if(op.name!=='修改数据' && (pageId.value===FLOW_ENTRY || isEntryByCat(pageId.value))) flowFillEntry(row);
        }
        formModel._editId = row.id;
        return;
      }
      if(op.name==='识别'){
        ElMessage.success('已触发谱图识别（演示）'); return;
      }
      if(op.name==='结束取样' || op.name==='结束录入'){
        ElementPlus.ElMessageBox.confirm('确认' + op.name + '？','确认',{
          confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
        }).then(()=>{ ElMessage.success(op.name + '成功（演示）'); }).catch(()=>{});
        return;
      }
      if(op.name==='检验详情'){
        if(pageId.value==='ledger'){ openLedgerInspDetail(row); return; }
        openDetail(row); return;
      }
      if(op.name==='变更记录'){
        if(pageId.value==='ledger'){ openLedgerChangeLog(row); return; }
        openDetail(row); return;
      }
      if(op.name==='下载' && pageId.value==='spc-report-ledger'){ qcSpcLedgerDownload([row]); return; }
      if(op.name==='下载'){ onFileDownload(row['文件名称'] || row['文件'] || ''); return; }
      ElMessage.info(op.name);
    }
