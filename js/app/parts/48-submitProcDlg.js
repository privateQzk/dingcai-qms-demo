    function submitProcDlg(){
      if(!procDlg.row || !procDlg.onSubmit) return;
      const vals = {};
      for(const f of procDlg.fields){
        if(f.type==='upload'){
          if(f.required && !(procForm.files||[]).length){ ElMessage.warning('请上传'+f.name); return; }
          continue;
        }
        vals[f.name] = String(procForm.values[f.name]||'').trim();
        if(f.required && !vals[f.name]){ ElMessage.warning('请输入'+f.name); return; }
      }
      const files = (procForm.files||[]).map(f=> f.name).filter(Boolean);
      const first = procDlg.fields.find(f=> f.type!=='upload');
      procDlg.onSubmit(procDlg.row, first ? vals[first.name] : '', files.join('、') || '—', vals);
      procDlg.visible = false;
      selectedIds.value = [];
      bumpStore();
    }
    function openCipProcess(row){
      openProcDlg({ title:'改进处理', keys:CIP_INFO_KEYS, full:CIP_INFO_FULL, descLabel:'改进说明', fileLabel:'改进附件', placeholder:'请输入改进措施及完成情况', onSubmit:submitCipProcess }, row);
    }
    function submitCipProcess(row, desc, files){
      const p = ciRows().find(x=> x['提案编号']===row['提案编号']);
      if(!p || p['改进状态']!=='执行中' || cipDoneSet().has(cipKey(row['提案编号'], row['责任部门']))){
        ElMessage.warning('该数据已处理或持续改进已关闭，请刷新后重试');
        return;
      }
      const rec = { id:'cip-'+Date.now(), 处理状态:'已完成', 责任部门: row['责任部门'] };
      CIP_KEYS.forEach(k=>{ rec[k] = p[k]; });
      Object.assign(rec, { 改进说明: desc, 改进附件: files, 改进提交时间: nowStamp(), 改进提交人: CI_OPERATOR });
      cipDoneRows().unshift(rec);
      const finished = ciSyncStatus(p) && p['改进状态']==='已完成';
      ElMessage.success(finished ? '已提交；提案 '+p['提案编号']+' 的所有责任部门均已完成，持续改进状态更新为【已完成】' : '改进处理已提交');
    }
    function cipRelQuery(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r['提案编号']))];
      loadPage(CI_PAGE);
      setTimeout(()=>{
        query['提案编号'] = nos.join('、');
        pageNum.value = 1;
        ElMessage.success('已跳转持续改进，按所选 '+nos.length+' 个提案编号过滤');
      }, 0);
    }
    function onCipToolbar(btn){
      if(btn.name==='关联查询'){ cipRelQuery(); return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      return false;
    }

    /** 变更处理：新增后进入待处理（执行中）；变更处理提交后移入已完成 */
    const CHG_PAGE = 'np-0210-01';
    const CHG_FIELDS = ['变更编号','变更类型','变更来源','变更项目名称','变更涉及产品','变更等级','变更时效','是否需要验证','变更附件','变更说明及技术依据','变更备注','申请人','申请部门','申请日期'];
    const CHG_REQUIRED = ['变更编号','变更类型','变更来源','变更项目名称','变更说明及技术依据','申请人','申请部门','申请日期'];
    const CHG_SELECTS = ['变更类型','变更来源','申请人','申请部门','申请日期'];
    const CHG_INFO_KEYS = ['变更编号','变更类型','变更来源','变更等级','变更时效','是否需要验证','申请人','申请部门','申请日期','变更项目名称','变更涉及产品','变更附件','变更说明及技术依据','变更备注'];
    const CHG_INFO_FULL = ['变更项目名称','变更涉及产品','变更附件','变更说明及技术依据','变更备注'];
    function chgTab(t){
      const bag = MOCK[CHG_PAGE] = MOCK[CHG_PAGE] || {};
      if(!Array.isArray(bag[t])) bag[t] = [];
      return bag[t];
    }
    function chgAllRows(){ return [...chgTab('tab-1'), ...chgTab('tab-2')]; }
    function nextChgNo(){
      const max = chgAllRows().reduce((m, r)=> Math.max(m, parseInt(String(r['变更编号']||'').replace(/\D/g,''), 10) || 0), 0);
      return String(max + 1).padStart(6, '0');
    }
    function chgFormOptions(f){
      if(f.name==='申请人') return CI_USERS.map(u=> ({ value:u.姓名, label:u.工号+' / '+u.姓名 }));
      if(f.name==='申请部门') return ciDeptsOf(formModel['申请人']).map(d=> ({ value:d, label:d }));
      return null;
    }
    function onChgApplicantChange(){
      const ds = ciDeptsOf(formModel['申请人']);
      formModel['申请部门'] = ds.length===1 ? ds[0] : (ds.includes(formModel['申请部门']) ? formModel['申请部门'] : '');
    }
    function openChgForm(mode, row){
      openForm(mode);
      if(mode==='edit'){
        CHG_FIELDS.forEach(k=>{ formModel[k] = row[k]==='—' ? '' : (row[k]||''); });
        formModel._editId = row.id;
        return;
      }
      Object.assign(formModel, { 变更编号: nextChgNo(), 申请人: CI_OPERATOR, 申请日期: nowStamp().slice(0,10) });
      onChgApplicantChange();
    }
    function saveChgForm(){
      const miss = CHG_REQUIRED.find(k=> !String(formModel[k]||'').trim());
      if(miss){ ElMessage.warning((CHG_SELECTS.includes(miss) ? '请选择' : '请输入') + miss); return; }
      const no = String(formModel['变更编号']).trim();
      if(chgAllRows().some(r=> r['变更编号']===no && r.id!==formModel._editId)){ ElMessage.warning('变更编号已存在，请刷新后重新生成'); return; }
      const payload = {};
      CHG_FIELDS.forEach(k=>{ payload[k] = String(formModel[k]||'').trim(); });
      if(formMode.value==='add'){
        chgTab('tab-1').unshift({ id:'chg-'+Date.now(), 变更状态:'执行中', ...payload, 创建时间: nowStamp(), 创建人: CI_OPERATOR });
        ElMessage.success('变更已新增');
      } else {
        const cur = chgTab('tab-1').find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑的数据'); return; }
        Object.assign(cur, payload);
        ElMessage.success('保存成功');
      }
      formVisible.value = false;
      bumpStore();
    }
    function openChgProcess(row){
      openProcDlg({ title:'变更处理', keys:CHG_INFO_KEYS, full:CHG_INFO_FULL, descLabel:'变更处理说明', fileLabel:'变更处理附件', placeholder:'请输入变更执行及验证情况', onSubmit:submitChgProcess }, row);
    }
    function submitChgProcess(row, desc, files){
      const pending = chgTab('tab-1');
      const cur = pending.find(r=> r.id===row.id);
      if(!cur){ ElMessage.warning('该变更已处理，请刷新后重试'); return; }
      MOCK[CHG_PAGE]['tab-1'] = pending.filter(r=> r!==cur);
      chgTab('tab-2').unshift(Object.assign({}, cur, { 变更状态:'已完成', 变更处理说明: desc, 变更处理附件: files, 变更处理提交人: CI_OPERATOR, 变更处理提交时间: nowStamp() }));
      ElMessage.success('变更 '+cur['变更编号']+' 已处理完成');
    }
    function onChgToolbar(btn){
      if(btn.name==='新增'){ openChgForm('add'); return true; }
      if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
      return false;
    }

    /** 客户质量（客户抱怨 / 客户投诉）：新增后进入待处理；处理提交后移入已处理 */
    function makeCsPage(o){
      function tab(t){
        const bag = MOCK[o.page] = MOCK[o.page] || {};
        if(!Array.isArray(bag[t])) bag[t] = [];
        return bag[t];
      }
      const LIST = o.listTab || 'tab-1';
      const ST = o.statusKey || '处理状态';
      const ST_PENDING = o.pendingStatus || '待处理';
      const ST_DONE = o.doneStatus || '已处理';
      const NEW_WHO = o.newWhoKey || '制单人';
      const NEW_WHEN = o.newWhenKey || '制单时间';
      const DONE_WHO = o.doneWhoKey || '处理人';
      const DONE_WHEN = o.doneWhenKey || '处理时间';
      const MULTI = o.multiFields || [];
      const allRows = ()=> [...tab(LIST), ...(LIST==='tab-1' ? tab('tab-2') : [])];
      function nextNo(){
        const max = allRows().reduce((m, r)=> Math.max(m, parseInt(String(r[o.noKey]||'').replace(/\D/g,''), 10) || 0), 0);
        return String(max + 1).padStart(6, '0');
      }
      function fillFrom(row){
        o.fields.forEach(k=>{
          let v = row[k]==='—' ? '' : (row[k]||'');
          if(MULTI.includes(k)) v = String(v).split(/[、,，]/).map(s=> s.trim()).filter(Boolean);
          formModel[k] = v;
        });
      }
      function openEdit(mode, row){
        openForm(mode==='copy' ? 'add' : mode);
        if(mode==='edit'){
          fillFrom(row);
          formModel._editId = row.id;
          return;
        }
        if(mode==='copy'){
          fillFrom(row);
          formModel[o.noKey] = nextNo();
          return;
        }
        Object.assign(formModel, { [o.noKey]: nextNo() }, o.dateKey ? { [o.dateKey]: nowStamp().slice(0,10) } : {}, o.addDefaults || {});
      }
      function save(){
        const miss = o.required.find(k=> !String(formModel[k]||'').trim());
        if(miss){ ElMessage.warning((o.selects.includes(miss) ? '请选择' : '请输入') + miss); return; }
        const no = String(formModel[o.noKey]).trim();
        if(allRows().some(r=> r[o.noKey]===no && r.id!==formModel._editId)){ ElMessage.warning(o.noKey+'已存在，请刷新后重新生成'); return; }
        const payload = {};
        o.fields.forEach(k=>{
          const v = formModel[k];
          payload[k] = Array.isArray(v) ? v.join('、') : String(v||'').trim();
        });
        if(o.fields.includes('客户信息') && !payload['客户名称']){
          const [code, name] = payload['客户信息'].split(' / ');
          Object.assign(payload, { 客户编码: name ? code : '', 客户名称: name || code });
        }
        if(o.normalize) o.normalize(payload);
        if(formMode.value==='add'){
          const row = { id:o.idPrefix+Date.now(), ...(o.procOp || o.statusKey ? { [ST]: ST_PENDING } : {}), ...payload, [NEW_WHEN]: nowStamp(), [NEW_WHO]: CI_OPERATOR };
          if(o.page===SR_PAGE) Object.assign(row, { 主题:'供应商在线整改', 密码: srRandPwd(), 分享人: CI_OPERATOR, 在线填写链接: srLinkOf(row) });
          tab(LIST).unshift(row);
          ElMessage.success(o.addOkTip || (o.title+'已新增'));
        } else {
          const cur = tab(LIST).find(r=> r.id===formModel._editId);
          if(!cur){ ElMessage.warning('该'+o.docName+'已处理，不可编辑'); return; }
          if(o.page===SR_PAGE && cur['单据状态']!=='待处理'){ ElMessage.warning('仅待处理的整改单可编辑'); return; }
          Object.assign(cur, payload);
          ElMessage.success('保存成功');
        }
        if(o.onSaved) o.onSaved(payload);
        formVisible.value = false;
        bumpStore();
      }
      function batchDelete(){
        const rows = tab(LIST).filter(r=> selectedIds.value.includes(r.id));
        if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
        const blocked = o.deleteBlock ? rows.filter(o.deleteBlock) : [];
        if(blocked.length){ ElMessage.warning(o.noKey+' '+blocked.map(r=> r[o.noKey]).join('、')+' '+o.deleteBlockTip); return; }
        ElementPlus.ElMessageBox.confirm('确定删除所选 '+rows.length+' 条'+o.docName+'吗？删除后不可恢复。', '提示', { type:'warning', confirmButtonText:'确定', cancelButtonText:'取消' }).then(()=>{
          const ids = new Set(rows.map(r=> r.id));
          MOCK[o.page][LIST] = tab(LIST).filter(r=> !ids.has(r.id));
          selectedIds.value = [];
          if(o.onDeleted) o.onDeleted(rows.map(r=> r[o.noKey]));
          bumpStore();
          ElMessage.success('已删除 '+rows.length+' 条数据');
        }).catch(()=>{});
      }
      function submitProcess(row, desc, files, vals){
        const pending = tab('tab-1');
        const cur = pending.find(r=> r.id===row.id);
        if(!cur){ ElMessage.warning('该'+o.docName+'已处理，请刷新后重试'); return; }
        MOCK[o.page]['tab-1'] = pending.filter(r=> r!==cur);
        const rec = Object.assign({}, cur, { [ST]: ST_DONE, [DONE_WHO]: CI_OPERATOR, [DONE_WHEN]: nowStamp() });
        o.procFields.forEach(f=>{ rec[f.key || f.name] = f.type==='upload' ? files : (vals[f.name] || ''); });
        if(o.onProcess) o.onProcess(rec, vals);
        tab('tab-2').unshift(rec);
        ElMessage.success(o.procOkTip ? o.procOkTip(cur) : (o.docName+' '+cur[o.noKey]+' 已处理'));
      }
      function openProcess(row){
        openProcDlg({ title:o.procOp, keys:o.infoKeys, full:o.infoFull, fields:o.procFields, onSubmit:submitProcess }, row);
      }
      function onToolbar(btn){
        if(btn.name==='新增'){ openEdit('add'); return true; }
        if(btn.name==='批量删除'){ batchDelete(); return true; }
        if(btn.name==='导出数据'){ exportVisible.value = true; return true; }
        return false;
      }
      function onRowOp(op, row){
        if(op.name==='编辑'){ openEdit('edit', row); return true; }
        if(op.name==='复制'){ openEdit('copy', row); return true; }
        if(o.procOp && op.name===o.procOp){ openProcess(row); return true; }
        return false;
      }
      function onRefresh(f){
        if(!f || f.name!==o.noKey) return false;
        formModel[o.noKey] = nextNo();
        ElMessage.success('已刷新'+o.noKey);
        return true;
      }
      function rows(list, done){
        if(o.decorate) list = list.map(r=> Object.assign({}, r, o.decorate(r)));
        list = applyContainsExactQuery(list, query, [...o.containsKeys, ...(done ? [DONE_WHO] : [])], o.exactKeys);
        [...o.dateKeys, ...(done ? [DONE_WHEN] : [])].forEach(k=>{ list = applyDateRangeQuery(list, query, k); });
        const sortKey = done ? DONE_WHEN : NEW_WHEN;
        return list.slice().sort((a,b)=> String(b[sortKey]||'').localeCompare(String(a[sortKey]||'')));
      }
      return { page:o.page, nextNo, save, onToolbar, onRowOp, onRefresh, rows };
    }
    /** 品质专项任务·逾期状态：当前时间≤计划完成时间为正常，否则逾期（按日期比较，当天不算逾期） */
    function qtOverdueState(r){
      const done = r['任务状态']==='已完成';
      const plan = String(r['计划完成时间']||'').slice(0,10);
      if(!plan) return r['逾期状态'] || '—';
      if(done) return r['逾期状态'] || (String(r['完成时间']||'').slice(0,10) > plan ? '逾期' : '正常');
      return nowStamp().slice(0,10) > plan ? '逾期' : '正常';
    }
    /** 客诉单保存/删除后，把客诉单号反写到发货OQC台账的「客诉单号」；同一OQC多单关联以「，」拼接 */
    function ctSyncOqcLink(ctNo, oqcNo){
      const bag = MOCK[OQC_PAGE] || {};
      const norm = v=> String(v||'').split(/[，,、]/).map(s=> s.trim()).filter(s=> s && s!=='—');
      const link = String(oqcNo||'').trim();
      ['tab-1','tab-2'].forEach(t=>{
        (bag[t]||[]).forEach(r=>{
          const list = norm(r['客诉单号']);
          const kept = list.filter(x=> x!==ctNo);
          if(link && r['单据号']===link && !kept.includes(ctNo)) kept.push(ctNo);
          if(kept.length!==list.length || kept.some((x,i)=> x!==list[i])) r['客诉单号'] = kept.join('，');
        });
      });
    }
    const CC_PAGE = 'np-0212-01';
    const CT_PAGE = 'np-0212-02';
    const CR_PAGE = 'np-0212-03';
    const QT_PAGE = 'np-0218-01';
    const SE_PAGE = 'np-0213-01';
    const SE_SRC_KIND = { 采购来料不合格:'seSrcUq', 采购来料偏差:'seSrcDv' };
    const SR_PAGE = 'np-0213-02';
    const CS_PAGES = {
      [CC_PAGE]: makeCsPage({
        page:CC_PAGE, title:'客户抱怨', docName:'抱怨单', idPrefix:'cc-', noKey:'抱怨单号', dateKey:'抱怨日期', procOp:'抱怨处理',
        fields:['抱怨单号','客户信息','客户编码','客户名称','抱怨日期','抱怨类型','抱怨描述','附件','备注'],
        required:['抱怨单号','客户信息','抱怨日期','抱怨类型','抱怨描述'],
        selects:['客户信息','抱怨日期','抱怨类型'],
        infoKeys:['抱怨单号','客户名称','抱怨日期','抱怨类型','制单人','制单时间','抱怨描述','附件','备注'],
        infoFull:['客户名称','抱怨描述','附件','备注'],
        procFields:[
          { name:'原因分析', type:'textarea', required:true, placeholder:'请输入抱怨产生的原因分析' },
          { name:'解决方法', type:'textarea', required:true, placeholder:'请输入解决方法及纠正预防措施' },
          { name:'处理附件', type:'upload' },
          { name:'处理备注', type:'input' },
        ],
        containsKeys:['抱怨单号','客户名称','抱怨描述','制单人'], exactKeys:['抱怨类型'], dateKeys:['抱怨日期','制单时间'],
      }),
      [CT_PAGE]: makeCsPage({
        page:CT_PAGE, title:'客户投诉', docName:'客诉单', idPrefix:'ct-', noKey:'客诉单号', dateKey:'投诉日期', procOp:'客诉处理',
        fields:['客诉单号','关联单据','客户信息','客户编码','客户名称','投诉日期','投诉类型','物料信息','物料编码','物料名称','物料规格','物料种类','批号','问题大类','问题小类','问题描述','计划处理完成日期','附件','备注'],
        required:['客诉单号','客户名称','投诉日期','投诉类型','物料信息','问题大类','问题小类','问题描述'],
        selects:['客户名称','投诉日期','投诉类型','物料信息','问题大类','问题小类'],
        addOkTip:'单据提交成功，单据状态为「待处理」',
        infoKeys:['客诉单号','投诉日期','投诉类型','批号','计划处理完成日期','制单人','问题大类','问题小类','客户名称','物料信息','问题描述','附件','备注'],
        infoFull:['客户名称','物料信息','问题描述','附件','备注'],
        procFields:[
          { name:'原因分析', type:'textarea', rows:2, required:true },
          { name:'解决方法', type:'textarea', rows:2, required:true },
          { name:'处理附件', type:'upload', half:true },
          { name:'备注', key:'处理备注', type:'input', half:true },
        ],
        normalize(p){
          if(p['物料编码']) p['物料信息'] = [p['物料编码'], p['物料名称'], p['物料规格'], p['物料种类']].filter(Boolean).join(' / ');
        },
        procOkTip: ()=> '单据提交成功，单据状态已更改为「已处理」',
        containsKeys:['客诉单号','客户名称','物料信息','批号','制单人'], exactKeys:['投诉类型','问题大类','问题小类'], dateKeys:['投诉日期','计划处理完成日期','制单时间'],
        onSaved: p=> ctSyncOqcLink(p['客诉单号'], p['关联单据']),
        onDeleted: nos=> nos.forEach(n=> ctSyncOqcLink(n, '')),
      }),
      [QT_PAGE]: makeCsPage({
        page:QT_PAGE, title:'品质专项任务', docName:'任务', idPrefix:'qt-', noKey:'任务单号', procOp:'任务处理',
        statusKey:'任务状态', pendingStatus:'待处理', doneStatus:'已完成',
        newWhoKey:'创建人', newWhenKey:'创建时间', doneWhoKey:'完成人', doneWhenKey:'完成时间',
        multiFields:['负责人'],
        fields:['任务单号','任务类型','任务描述','计划完成时间','任务附件','负责人'],
        required:['任务单号','任务类型','任务描述','计划完成时间','负责人'],
        selects:['任务类型','计划完成时间','负责人'],
        addDefaults:{ 负责人:[] },
        addOkTip:'单据提交成功，任务状态为「待处理」',
        infoKeys:['任务单号','任务类型','计划完成时间','负责人','创建人','创建时间','任务描述','任务附件'],
        infoFull:['任务描述','任务附件'],
        procFields:[
          { name:'任务完成描述', type:'textarea', rows:2, required:true },
          { name:'完成文件', type:'upload' },
        ],
        procOkTip: ()=> '单据提交成功，任务状态已更改为「已完成」',
        containsKeys:['任务单号','任务描述','负责人','创建人'], exactKeys:['任务类型'], dateKeys:['计划完成时间','创建时间'],
        decorate: r=> ({ 逾期状态: qtOverdueState(r) }),
        onProcess: rec=> { rec['逾期状态'] = nowStamp().slice(0,10) > String(rec['计划完成时间']||'').slice(0,10) ? '逾期' : '正常'; },
      }),
      [CR_PAGE]: makeCsPage({
        page:CR_PAGE, title:'客户退货', docName:'退货单', idPrefix:'cr-', noKey:'退货单号', dateKey:'退货日期', procOp:'退货处理',
        fields:['退货单号','客户信息','客户编码','客户名称','退货日期','退货类型','物料信息','物料编码','物料名称','物料规格','物料种类','批号','责任部门','责任供应商','责任供应商编码','附件','备注'],
        required:['退货单号','客户名称','退货日期','退货类型','物料信息','责任部门'],
        selects:['客户名称','退货日期','退货类型','物料信息','责任部门'],
        addOkTip:'单据提交成功，单据状态为「待处理」',
        infoKeys:[], infoFull:[],
        procFields:[
          { name:'原因分析', type:'textarea', rows:2, required:true },
          { name:'解决方法', type:'textarea', rows:2, required:true },
          { name:'处理附件', type:'upload', half:true },
          { name:'备注', key:'处理备注', type:'input', half:true },
        ],
        normalize(p){
          if(p['物料编码']) p['物料信息'] = [p['物料编码'], p['物料名称'], p['物料规格'], p['物料种类']].filter(Boolean).join(' / ');
          if(!p['责任供应商']) p['责任供应商编码'] = '';
        },
        procOkTip: ()=> '单据提交成功，单据状态已更改为「已处理」',
        containsKeys:['退货单号','客户名称','物料信息','批号','责任供应商','制单人'], exactKeys:['退货类型','责任部门'], dateKeys:['退货日期','制单时间'],
      }),
      [SE_PAGE]: makeCsPage({
        page:SE_PAGE, title:'供应商事件', docName:'供应商事件', idPrefix:'se-', noKey:'事件单号', dateKey:'事件日期', listTab:'main',
        fields:['事件单号','事件类型','来源单号','事件日期','事件描述','供应商编码','供应商名称','问题大类','问题小类','问题描述','物料信息','物料编码','物料名称','物料规格','物料种类','批号','附件','备注'],
        required:['事件单号','事件类型','来源单号','事件日期','事件描述','供应商名称','问题大类','问题小类'],
        selects:['事件类型','来源单号','事件日期','供应商名称','问题大类','问题小类'],
        addDefaults:{ 事件类型:'采购来料不合格' },
        addOkTip:'单据提交成功',
        normalize(p){
          if(p['物料编码']) p['物料信息'] = [p['物料编码'], p['物料名称'], p['物料规格'], p['物料种类']].filter(Boolean).join(' / ');
        },
        deleteBlock: r=> Object.values(MOCK[SR_PAGE]||{}).some(list=> (list||[]).some(x=> x['来源单号']===r['事件单号'])),
        deleteBlockTip:'已存在下游的供应商整改单据，不可删除',
        containsKeys:['事件单号','来源单号','供应商名称','问题大类','问题小类','物料信息','批号','制单人'], exactKeys:['事件类型'], dateKeys:['事件日期','制单时间'],
      }),
      [SR_PAGE]: makeCsPage({
        page:SR_PAGE, title:'供应商整改', docName:'整改单', idPrefix:'sr-', noKey:'整改单号',
        statusKey:'单据状态', pendingStatus:'待处理', doneStatus:'已完成',
        fields:['整改单号','来源单号','供应商编码','供应商名称','事件日期','问题大类','问题小类','问题描述','物料信息','物料编码','物料名称','物料规格','物料种类','批号','计划整改完成日期','整改目标','附件','备注'],
        required:['整改单号','来源单号','供应商名称','事件日期','问题大类','问题小类','计划整改完成日期'],
        selects:['来源单号','供应商名称','事件日期','问题大类','问题小类','计划整改完成日期','物料信息'],
        addOkTip:'单据提交成功，单据状态为「待处理」',
        normalize(p){
          if(p['物料编码']) p['物料信息'] = [p['物料编码'], p['物料名称'], p['物料规格'], p['物料种类']].filter(Boolean).join(' / ');
        },
        deleteBlock: r=> !['待处理','待审核','审核驳回'].includes(r['单据状态']),
        deleteBlockTip:'仅待处理、待审核、审核驳回的整改单可删除',
        decorate: srDecorate,
        containsKeys:['整改单号','来源单号','供应商名称','问题大类','问题小类','物料信息','批号','制单人','处理人'], exactKeys:['超时状态','单据状态'], dateKeys:['计划整改完成日期','事件日期','制单时间','整改提交日期'],
      }),
    };
    const csPage = ()=> CS_PAGES[pageId.value] || null;
    /** 品质综合报表 np-0417-02 · 实时聚合各前置单据 */
    const QR_PAGE = 'np-0417-02';
    const QR_TAG_FIELDS = ['逾期状态','检查结果','单据状态','样品状态','计划状态','检验结论','处置类型','MRB状态','任务状态','处理状态'];
    function qrPct(a, b){ return b > 0 ? (a / b * 100).toFixed(1) + '%' : '—'; }
    function qrHit(val, kw){ kw = String(kw || '').trim(); return !kw || String(val || '').includes(kw); }
    function qrSel(val, arr){ return !Array.isArray(arr) || !arr.length || arr.includes(val); }
    function qrInRange(v, range){
      if(!Array.isArray(range) || (!range[0] && !range[1])) return true;
      const d = String(v || '').slice(0, 10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
      if(range[0] && d < String(range[0]).slice(0,10)) return false;
      if(range[1] && d > String(range[1]).slice(0,10)) return false;
      return true;
    }
    function qrCtNos(s){
      return String(s || '').split(/[，,]/).map(x=> x.trim()).filter(x=> x && x !== '—').length;
    }
    function qrUniq(list, field){
      return [...new Set(list.map(r=> String(r[field] || '').trim()).filter(v=> v && v !== '—'))].sort();
    }
    function qrCtAll(){
      return ['tab-1','tab-2'].flatMap(t=> (((MOCK[CT_PAGE] || {})[t]) || []).map(r=> Object.assign({}, r)));
    }
    function uqSumRows(){
      return UQ_SUM_SRC.flatMap(s=> ((((MOCK[s.page] || {})['tab-done']) || [])
        .filter(r=> !hiddenRowIds.value.has(s.page+'|'+r.id))).map(r=>
        Object.assign({}, r, { 处置类型: s.type, SAP生产订单号: r['SAP生产订单号'] || r['生产订单号'] || '', _srcPage: s.page })));
    }
    function devSumRows(){
      return DEV_SUM_SRC.flatMap(s=> ((((MOCK[s.page] || {})['tab-done']) || [])
        .filter(r=> !hiddenRowIds.value.has(s.page+'|'+r.id))).map(r=>
        Object.assign({}, r, { 偏差类型: s.type, _srcPage: s.page })));
    }
    const QR_TABS = [
      {
        key:'oqc-submit', title:'交验合格率统计',
        filters:[
          { key:'mat', label:'物料信息', type:'picker', kind:'mat' },
          { key:'cust', label:'客户信息', type:'picker', kind:'customer' },
          { key:'批号', label:'批号', type:'input' },
          { key:'完成时间', label:'完成时间', type:'date' }
        ],
        load:()=> oqcTab('tab-2').map(r=> Object.assign({}, r)),
        filter:(list,q)=> list.filter(r=> qrSel(r['物料编码'], q.mat) && qrSel(r['客户编码'], q.cust) && qrHit(r['批号'], q['批号']) && qrInRange(r['完成时间'], q['完成时间'])),
        cards:(list)=>{
          const ok = list.filter(r=> r['检查结果']==='合格').length;
          return [
            { label:'已完成单据数', value:list.length, tone:'blue' },
            { label:'合格单据数', value:ok, tone:'green' },
            { label:'交验合格率', value:qrPct(ok, list.length), tone:'cyan' }
          ];
        },
        cols:[
          {prop:'单据号',label:'单据号',w:140},{prop:'DN单号',label:'DN单号',w:120},{prop:'客户名称',label:'客户名称',w:150},
          {prop:'物料名称',label:'物料名称',w:150},{prop:'批号',label:'批号',w:110},{prop:'计划发货日期',label:'计划发货日期',w:110},
          {prop:'检查结果',label:'检查结果',w:90},{prop:'客诉单号',label:'客诉单号',w:130},{prop:'完成时间',label:'完成时间',w:150}
        ]
      },
      {
        key:'ct-stat', title:'客诉统计',
        filters:[
          { key:'cust', label:'客户信息', type:'picker', kind:'customer' },
          { key:'投诉类型', label:'投诉类型', type:'select', options:()=> qrUniq(qrCtAll(), '投诉类型') },
          { key:'批号', label:'批号', type:'input' },
          { key:'投诉日期', label:'投诉日期', type:'date' }
        ],
        load:()=> qrCtAll(),
        filter:(list,q)=> list.filter(r=> qrSel(r['客户编码'], q.cust) && qrSel(r['投诉类型'], q['投诉类型']) && qrHit(r['批号'], q['批号']) && qrInRange(r['投诉日期'], q['投诉日期'])),
        cards:(list)=>{
          const done = list.filter(r=> r['处理状态']==='已处理').length;
          return [
            { label:'客诉单据数', value:list.length, tone:'blue' },
            { label:'待处理数', value:list.length - done, tone:'orange' },
            { label:'已处理数', value:done, tone:'green' },
            { label:'已处理占比', value:qrPct(done, list.length), tone:'cyan' }
          ];
        },
        groups:[ { dim:'投诉类型', title:'按投诉类型统计' } ],
        cols:[
          {prop:'客诉单号',label:'客诉单号',w:120},{prop:'投诉日期',label:'投诉日期',w:110},{prop:'客户名称',label:'客户名称',w:200},
          {prop:'投诉类型',label:'投诉类型',w:100},{prop:'物料名称',label:'物料名称',w:150},{prop:'批号',label:'批号',w:120},
          {prop:'问题大类',label:'问题大类',w:100},{prop:'问题小类',label:'问题小类',w:100},{prop:'处理状态',label:'处理状态',w:90}
        ]
      },
      {
        key:'qt-rate', title:'品质专项完成率',
        filters:[
          { key:'任务类型', label:'任务类型', type:'select', options:()=> qrUniq(qrQtPending(), '任务类型') },
          { key:'计划完成时间', label:'计划完成时间', type:'date' }
        ],
        load:()=> qrQtPending(),
        filter:(list,q)=> list.filter(r=> qrSel(r['任务类型'], q['任务类型']) && qrInRange(r['计划完成时间'], q['计划完成时间'])),
        cards:(list)=>{
          const od = list.filter(r=> r['逾期状态']==='逾期').length;
          return [
            { label:'待处理任务数', value:list.length, tone:'blue' },
            { label:'正常任务数', value:list.length - od, tone:'green' },
            { label:'逾期任务数', value:od, tone:'red' },
            { label:'逾期占比', value:qrPct(od, list.length), tone:'orange' }
          ];
        },
        cols:[
          {prop:'任务单号',label:'任务单号',w:120},{prop:'任务类型',label:'任务类型',w:130},{prop:'任务描述',label:'任务描述',w:200},
          {prop:'计划完成时间',label:'计划完成时间',w:110},{prop:'逾期状态',label:'逾期状态',w:90},{prop:'负责人',label:'负责人',w:140},
          {prop:'创建时间',label:'创建时间',w:150},{prop:'创建人',label:'创建人',w:100}
        ]
      },
      {
        key:'rework', title:'器件异常导致产品返工',
        filters:[
          { key:'处置类型', label:'处置类型', type:'select', options:()=> UQ_SUM_SRC.map(s=> s.type) },
          { key:'处置时间', label:'处置时间', type:'date' }
        ],
        load:()=> uqSumRows(),
        filter:(list,q)=> list.filter(r=> qrSel(r['处置类型'], q['处置类型']) && qrInRange(r['处置时间'], q['处置时间'])),
        cards:(list)=> [ { label:'处置单据数', value:list.length, tone:'blue' } ],
        groups:[ { dim:'问题大类', title:'按问题大类统计' }, { dim:'处置方式', title:'按处置方式统计' } ],
        cols:[
          {prop:'处置类型',label:'处置类型',w:130},{prop:'处置单号',label:'处置单号',w:130},{prop:'物料名称',label:'物料名称',w:150},
          {prop:'问题大类',label:'问题大类',w:110},{prop:'问题小类',label:'问题小类',w:110},{prop:'处置方式',label:'处置方式',w:100},
          {prop:'处置人',label:'处置人',w:90},{prop:'处置时间',label:'处置时间',w:150}
        ]
      },
      {
        key:'timely', title:'检验及时率',
        filters:[
          { key:'报检类型', label:'报检类型', type:'select', options:()=> FLOW_TABS.map(t=> t.label) },
          { key:'样品状态', label:'样品状态', type:'select', options:()=> qrUniq(qrLedgerAll(), '样品状态') },
          { key:'检验结论', label:'检验结论', type:'select', options:()=> qrUniq(qrLedgerAll(), '检验结论') },
          { key:'报检时间', label:'报检时间', type:'date' }
        ],
        load:()=> qrLedgerAll(),
        filter:(list,q)=> list.filter(r=> qrSel(r['报检类型'], q['报检类型']) && qrSel(r['样品状态'], q['样品状态']) && qrSel(r['检验结论'], q['检验结论']) && qrInRange(r['报检时间'], q['报检时间'])),
        cards:(list)=>{
          const od = list.filter(r=> r['逾期状态']==='逾期').length;
          const ok = list.length - od;
          return [
            { label:'单据数', value:list.length, tone:'blue' },
            { label:'正常单据数', value:ok, tone:'green' },
            { label:'逾期单据数', value:od, tone:'red' },
            { label:'检验及时率', value:qrPct(ok, list.length), tone:'cyan' }
          ];
        },
        cols:[
          {prop:'报检类型',label:'报检类型',w:110},{prop:'样品编号',label:'样品编号',w:120},{prop:'样品状态',label:'样品状态',w:90},
          {prop:'物料名称',label:'物料名称',w:150},{prop:'检验结论',label:'检验结论',w:90},{prop:'预计完成时间',label:'预计完成时间',w:150},
          {prop:'检验完成时间',label:'检验完成时间',w:150},{prop:'逾期状态',label:'逾期状态',w:90},{prop:'报检单号',label:'报检单号',w:130}
        ]
      },
      {
        key:'xj-close', title:'巡检问题结案率',
        filters:[
          { key:'计划单号', label:'计划单号', type:'input' },
          { key:'巡检方案名称', label:'巡检方案名称', type:'input' },
          { key:'计划状态', label:'计划状态', type:'select', options:()=> qrUniq(qrXjPlans(), '计划状态') },
          { key:'计划开始时间', label:'计划开始时间', type:'date' }
        ],
        load:()=> qrXjPlans(),
        filter:(list,q)=> list.filter(r=> qrHit(r['计划单号'], q['计划单号']) && qrHit(r['巡检方案名称'], q['巡检方案名称']) && qrSel(r['计划状态'], q['计划状态']) && qrInRange(r['计划开始时间'], q['计划开始时间'])),
        cards:(list)=>{
          const od = list.filter(r=> r['逾期状态']==='逾期').length;
          const ok = list.length - od;
          return [
            { label:'计划总数', value:list.length, tone:'blue' },
            { label:'正常计划数', value:ok, tone:'green' },
            { label:'逾期计划数', value:od, tone:'red' },
            { label:'正常占比', value:qrPct(ok, list.length), tone:'cyan' }
          ];
        },
        cols:[
          {prop:'计划单号',label:'计划单号',w:130},{prop:'计划状态',label:'计划状态',w:90},{prop:'巡检方案名称',label:'巡检方案名称',w:160},
          {prop:'内容描述',label:'内容描述',w:180},{prop:'计划开始时间',label:'计划开始时间',w:150},{prop:'计划结束时间',label:'计划结束时间',w:150},
          {prop:'逾期状态',label:'逾期状态',w:90},{prop:'创建方式',label:'创建方式',w:110},{prop:'创建人',label:'创建人',w:100}
        ]
      },
      {
        key:'capa', title:'纠正预防有效性',
        filters:[
          { key:'整改单号', label:'整改单号', type:'input' },
          { key:'事件类型', label:'事件类型', type:'select', options:()=> qrUniq(qrCapaAll(), '事件类型') },
          { key:'责任部门', label:'责任部门', type:'input' },
          { key:'创建时间', label:'创建时间', type:'date' }
        ],
        load:()=> qrCapaAll(),
        filter:(list,q)=> list.filter(r=> qrHit(r['整改单号'], q['整改单号']) && qrSel(r['事件类型'], q['事件类型']) && qrHit(r['责任部门'], q['责任部门']) && qrInRange(r['创建时间'], q['创建时间'])),
        cards:(list)=>{
          const done = list.filter(r=> r['单据状态']==='已处理').length;
          return [
            { label:'整改单总数', value:list.length, tone:'blue' },
            { label:'待处理数', value:list.length - done, tone:'orange' },
            { label:'已处理数', value:done, tone:'green' },
            { label:'已处理占比', value:qrPct(done, list.length), tone:'cyan' }
          ];
        },
        cols:[
          {prop:'整改单号',label:'整改单号',w:130},{prop:'单据状态',label:'单据状态',w:90},{prop:'事件类型',label:'事件类型',w:110},
          {prop:'来源单号',label:'来源单号',w:130},{prop:'问题大类',label:'问题大类',w:110},{prop:'问题小类',label:'问题小类',w:110},
          {prop:'责任部门',label:'责任部门',w:110},{prop:'计划整改完成日期',label:'计划整改完成日期',w:130},{prop:'整改人',label:'整改人',w:90},
          {prop:'整改完成时间',label:'整改完成时间',w:150}
        ]
      },
      {
        key:'oqc-ship', title:'出货OQC合格率',
        filters:[
          { key:'cust', label:'客户信息', type:'picker', kind:'customer' },
          { key:'批号', label:'批号', type:'input' },
          { key:'检查结果', label:'检查结果', type:'select', options:()=> ['合格','不合格'] },
          { key:'完成时间', label:'完成时间', type:'date' }
        ],
        load:()=> oqcTab('tab-2').map(r=> Object.assign({}, r)),
        filter:(list,q)=> list.filter(r=> qrSel(r['客户编码'], q.cust) && qrHit(r['批号'], q['批号']) && qrSel(r['检查结果'], q['检查结果']) && qrInRange(r['完成时间'], q['完成时间'])),
        cards:(list)=>{
          const ok = list.filter(r=> r['检查结果']==='合格').length;
          return [
            { label:'已完成单据数', value:list.length, tone:'blue' },
            { label:'合格单据数', value:ok, tone:'green' },
            { label:'不合格单据数', value:list.length - ok, tone:'red' },
            { label:'出货OQC合格率', value:qrPct(ok, list.length), tone:'cyan' }
          ];
        },
        cols:[
          {prop:'单据号',label:'单据号',w:140},{prop:'DN单号',label:'DN单号',w:120},{prop:'客户名称',label:'客户名称',w:150},
          {prop:'物料名称',label:'物料名称',w:150},{prop:'批号',label:'批号',w:110},{prop:'计划发货日期',label:'计划发货日期',w:110},
          {prop:'检查结果',label:'检查结果',w:90},{prop:'完成时间',label:'完成时间',w:150}
        ]
      }
    ];
