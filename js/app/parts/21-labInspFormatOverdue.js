    function labInspFormatOverdue(endTime){
      const t = new Date(String(endTime||'').replace(/-/g,'/')).getTime();
      if(!t || isNaN(t)) return { 时长:'—', 状态:'正常' };
      const diff = Date.now() - t;
      if(diff <= 0) return { 时长:'—', 状态:'正常' };
      const mins = Math.floor(diff / 60000);
      const days = Math.floor(mins / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      const m = mins % 60;
      let s = '';
      if(days) s += days + '天';
      if(hours) s += (s ? ' ' : '') + hours + '小时';
      if(m || !s) s += (s ? ' ' : '') + m + '分钟';
      return { 时长:s, 状态:'逾期' };
    }
    function labInspEnrichPlanRows(rows){
      return (rows||[]).map(r=>{
        const start = r['计划开始时间'] || r['计划时间'] || '';
        const end = r['计划结束时间'] || labInspEndTime(start, r['标准作业时长']);
        const od = labInspFormatOverdue(end);
        return { ...r, 计划开始时间: start, 计划结束时间: end || r['计划结束时间'] || '', 逾期时长: od.时长, 逾期状态: od.状态 };
      });
    }
    function nextLabInspPlanNo(){
      const all = [...labInspPlanBag('tab-1'), ...labInspPlanBag('tab-2')];
      let max = 0;
      all.forEach(r=>{
        const m = String(r['计划单号']||'').match(/LAB-XJ-P(\d+)/);
        if(m) max = Math.max(max, parseInt(m[1], 10)||0);
      });
      return 'LAB-XJ-P' + String(max+1).padStart(3,'0');
    }
    function saveLabInspPlanForm(){
      const name = String(formModel['巡检方案名称']||'').trim();
      if(!name){ ElMessage.warning('请选择巡检方案'); return; }
      if(!formModel['计划开始时间']){ ElMessage.warning('请选择计划开始时间'); return; }
      const durN = String(formModel['标准作业时长']||'').trim();
      if(durN && (!/^[1-9]\d*$/.test(durN))){ ElMessage.warning('标准作业时长须为正整数'); return; }
      if(formMode.value==='add' || formMode.value==='copy'){
        const pt = new Date(String(formModel['计划开始时间']).replace(/-/g,'/'));
        if(!Number.isNaN(pt.getTime()) && pt.getTime() < Date.now()-60000){
          ElMessage.warning('计划开始时间不能早于当前时间'); return;
        }
      }
      const list = labInspPlanBag('tab-1');
      const start = formModel['计划开始时间']||'';
      const duration = durN ? (durN + (formModel['标准作业时长单位']||'小时')) : '';
      const payload = {
        计划状态: '待执行',
        巡检方案名称: name,
        内容描述: formModel['内容描述']||'',
        表单名称: formModel['表单名称']||'',
        事业部: formModel['事业部']||'',
        车间: formModel['车间']||'',
        生产班组: formModel['生产班组']||'',
        计划开始时间: start,
        标准作业时长: duration || '—',
        计划结束时间: labInspEndTime(start, duration),
        [LAB_INSP_AFFECT]: formModel[LAB_INSP_AFFECT]||LAB_INSP_AFFECT_DEFAULT,
        备注: formModel['备注']||'—',
        创建方式: '手动',
        创建人: '张三',
        关闭说明: '—',
        关闭人: '—',
        关闭时间: '—'
      };
      if(formMode.value==='add' || formMode.value==='copy'){
        payload.id = 'labp-' + Date.now();
        payload['计划单号'] = nextLabInspPlanNo();
        payload['创建时间'] = nowStamp();
        list.unshift(payload);
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑巡检计划'); return; }
        if(!['待执行','执行中'].includes(cur['计划状态'])){ ElMessage.warning('仅待执行或执行中的计划可编辑'); return; }
        Object.assign(cur, payload, {
          id: cur.id, 计划单号: cur['计划单号'], 计划状态: cur['计划状态'],
          创建方式: cur['创建方式'], 创建人: cur['创建人'], 创建时间: cur['创建时间'],
          关闭说明: cur['关闭说明']||'—', 关闭人: cur['关闭人']||'—', 关闭时间: cur['关闭时间']||'—'
        });
      }
      formVisible.value = false;
      bumpStore();
      const cycle = String(payload[LAB_INSP_AFFECT]||'').includes('循环');
      if(cycle){
        const sch = labInspSchemeRows().find(r=> r['巡检方案名称']===name);
        if(sch){ sch['最新一次计划开始时间'] = start; sch['最新计划时间'] = start; }
      }
      if(formMode.value==='edit') ElMessage.success('巡检计划已保存');
      else ElMessage.success(cycle ? '巡检计划已新增；已按循环计划更新方案最新计划时间' : '巡检计划已新增');
    }
    function closeLabInspPlans(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !['待执行','执行中'].includes(r['计划状态']))){
        ElMessage.warning('请勾选待执行或执行中的巡检计划后再关闭'); return;
      }
      ElementPlus.ElMessageBox.confirm('确认关闭所选巡检计划？关闭后该任务不可继续执行。','关闭确认',{
        confirmButtonText:'确定', cancelButtonText:'取消', type:'warning'
      }).then(()=>{
        const set = new Set(selectedIds.value);
        const stamp = nowStamp();
        labInspPlanBag('tab-1').forEach(r=>{
          if(!set.has(r.id)) return;
          r['计划状态'] = '已关闭';
          r['关闭说明'] = r['关闭说明'] && r['关闭说明']!=='—' ? r['关闭说明'] : '手动关闭';
          r['关闭人'] = '张三';
          r['关闭时间'] = stamp;
        });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('所选巡检计划已关闭');
      }).catch(()=>{});
    }
    function deleteLabInspPlans(){
      const ids = new Set(selectedIds.value||[]);
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      const rows = labInspPlanBag('tab-1').filter(r=> ids.has(r.id));
      if(rows.some(r=> !['待执行','执行中'].includes(r['计划状态']))){
        ElMessage.warning('仅待执行或执行中的巡检计划可删除'); return;
      }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条巡检计划？删除后不可恢复。','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        MOCK[LAB_INSP_PLAN]['tab-1'] = labInspPlanBag('tab-1').filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条巡检计划');
      }).catch(()=>{});
    }
    function labInspFormFields(name){
      const map = {
        '每日巡检': [
          { label:'通道畅通', type:'judge', required:true },
          { label:'灭火器完好', type:'judge', required:true },
          { label:'紧急冲淋可用', type:'judge', required:true },
          { label:'地面整洁', type:'judge', required:true },
          { label:'异常描述', type:'textarea' },
          { label:'巡检人签字', type:'sign', required:true }
        ],
        '仪器状态巡检': [
          { label:'仪器运行状态', type:'judge', required:true },
          { label:'报警指示', type:'judge', required:true },
          { label:'排风开启', type:'judge', required:true },
          { label:'台面清洁', type:'judge', required:true },
          { label:'废液液位目视', type:'judge', required:true },
          { label:'异常描述', type:'textarea' },
          { label:'巡检人签字', type:'sign', required:true }
        ],
        '洁净区巡检': [
          { label:'更衣规范', type:'judge', required:true },
          { label:'压差正常', type:'judge', required:true },
          { label:'温湿度目视', type:'judge', required:true },
          { label:'洁净服穿戴', type:'judge', required:true },
          { label:'异常描述', type:'textarea' },
          { label:'巡检人签字', type:'sign', required:true }
        ],
        '试剂柜巡检': [
          { label:'柜锁完好', type:'judge', required:true },
          { label:'试剂标识', type:'judge', required:true },
          { label:'危化品台账', type:'judge', required:true },
          { label:'柜内整洁', type:'judge', required:true },
          { label:'异常描述', type:'textarea' },
          { label:'巡检人签字', type:'sign', required:true }
        ],
        '安全巡检': [
          { label:'通道畅通', type:'judge', required:true },
          { label:'灭火器完好', type:'judge', required:true },
          { label:'紧急冲淋可用', type:'judge', required:true },
          { label:'地面整洁', type:'judge', required:true },
          { label:'异常描述', type:'textarea' },
          { label:'巡检人签字', type:'sign', required:true }
        ]
      };
      return map[name] || map['安全巡检'];
    }
    const labInspExecVisible = ref(false);
    const labInspExecReadonly = ref(false);
    const labInspExecRow = ref({});
    const labInspExecData = reactive({});
    const labInspExecFields = computed(()=> labInspFormFields(labInspExecRow.value['表单名称']));
    const labInspExecFormName = computed(()=> labInspExecRow.value['表单名称'] || '安全巡检');
    const labInspExecHead = computed(()=> ['计划单号','计划状态','巡检方案名称','内容描述','表单名称','计划开始时间','计划结束时间','逾期状态']
      .concat(labInspExecReadonly.value ? ['检查结果','操作人','操作时间'] : []));
    function openLabInspExec(row, readonly){
      if(!row) return;
      const srcTab = (labInspPlanBag('tab-1').some(r=> r.id===row.id) || ['待执行','执行中'].includes(row['计划状态'])) ? 'tab-1' : 'tab-2';
      const p = labInspPlanBag(srcTab).find(r=> r.id===row.id)
        || labInspPlanBag('tab-1').find(r=> r.id===row.id)
        || labInspPlanBag('tab-2').find(r=> r.id===row.id)
        || row;
      if(!readonly && !['待执行','执行中'].includes(p['计划状态'])){
        ElMessage.warning('仅待执行、执行中的计划可作业执行'); return;
      }
      Object.keys(labInspExecData).forEach(k=> delete labInspExecData[k]);
      Object.assign(labInspExecData, p._formData || {});
      const view = labInspEnrichPlanRows([p])[0] || p;
      labInspExecRow.value = view;
      labInspExecReadonly.value = !!readonly;
      labInspExecVisible.value = true;
    }
    function labInspSign(f){ if(!labInspExecReadonly.value) labInspExecData[f.label] = CI_OPERATOR; }
    function saveLabInspExec(submit){
      const list = labInspPlanBag('tab-1');
      const p = list.find(r=> r.id===labInspExecRow.value.id);
      if(!p || !['待执行','执行中'].includes(p['计划状态'])){
        ElMessage.warning('仅待执行、执行中的计划可作业执行'); return;
      }
      const data = { ...labInspExecData };
      if(submit){
        const miss = labInspExecFields.value.find(f=> f.required && !String(data[f.label]||'').trim());
        if(miss){ ElMessage.warning('请填写「'+miss.label+'」'); return; }
      }
      p._formData = data;
      if(!submit){
        p['计划状态'] = '执行中';
        labInspExecVisible.value = false;
        bumpStore();
        ElMessage.success('已保存，计划状态为执行中');
        return;
      }
      const stamp = nowStamp();
      const result = labInspExecFields.value.some(f=> f.type==='judge' && data[f.label]==='不合格') ? '异常' : '正常';
      Object.assign(p, { 计划状态:'已完成', 操作时间: stamp, 操作人: CI_OPERATOR, 检查结果: result });
      const rec = Object.assign({}, p, {
        id: 'labr-' + Date.now(),
        计划状态: '已完成',
        检查结果: result,
        操作时间: stamp,
        操作人: CI_OPERATOR,
        _formData: data
      });
      labInspPlanBag('tab-2').unshift(rec);
      const cycle = p['创建方式']==='自动' || String(p[LAB_INSP_AFFECT]||'').includes('循环');
      if(cycle){
        const sch = labInspSchemeRows().find(r=> r['巡检方案名称']===p['巡检方案名称']);
        if(sch){ sch['最新一次计划完成时间'] = stamp; sch['最新计划完成时间'] = stamp; }
      }
      labInspExecVisible.value = false;
      bumpStore();
      ElMessage.success('提交成功，已生成巡检记录' + (cycle ? '；已更新方案最新一次计划完成时间' : ''));
    }
    function linkLabInspQuery(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r['计划单号']).filter(Boolean))];
      const toTab = activeTab.value==='tab-1' ? 'tab-2' : 'tab-1';
      activeTab.value = toTab;
      selectedIds.value = []; pageNum.value = 1;
      nextTick(()=>{
        resetQueryModel();
        query['计划单号'] = nos.join('、');
        queryExpanded.value = true;
        ElMessage.success('已按 '+nos.length+' 个计划单号关联查询');
      });
    }
    function saveLabInspSchemeForm(){
      const code = String(formModel['巡检方案编码']||'').trim();
      const name = String(formModel['巡检方案名称']||'').trim();
      if(!code){ ElMessage.warning('请输入巡检方案编码'); return; }
      if(!name){ ElMessage.warning('请输入巡检方案名称'); return; }
      const cycleN = String(formModel['执行周期']||'').trim();
      const cycleU = formModel['执行周期单位'] || '天';
      const warnN = String(formModel['提前提醒']||'').trim();
      const warnU = formModel['提前提醒单位'] || '小时';
      if(!cycleN || !(Number(cycleN)>0) || !Number.isInteger(Number(cycleN))){ ElMessage.warning('请输入正确的执行周期（正整数）'); return; }
      if(!formModel['计划开始时间']){ ElMessage.warning('请选择计划开始时间'); return; }
      if(!warnN || !(Number(warnN)>0) || !Number.isInteger(Number(warnN))){ ElMessage.warning('请输入正确的提前提醒（正整数）'); return; }
      if(!formModel['循环方式']){ ElMessage.warning('请选择循环方式'); return; }
      if(!formModel['执行条件']){ ElMessage.warning('请选择执行条件'); return; }
      const list = labInspSchemeRows();
      if(list.some(r=> r['巡检方案编码']===code && r.id!==formModel._editId)){ ElMessage.warning('巡检方案编码已存在，请重新输入'); return; }
      if(list.some(r=> r['巡检方案名称']===name && r.id!==formModel._editId)){ ElMessage.warning('巡检方案名称已存在，请修改'); return; }
      const durN = String(formModel['标准作业时长']||'').trim();
      const durU = formModel['标准作业时长单位'] || '小时';
      if(durN && (!(Number(durN)>0) || !Number.isInteger(Number(durN)))){ ElMessage.warning('标准作业时长须为正整数'); return; }
      const payload = {
        巡检方案编码: code,
        巡检方案名称: name,
        内容描述: formModel['内容描述']||'',
        执行周期: cycleN + cycleU,
        标准作业时长: durN ? (durN + durU) : '',
        计划开始时间: formModel['计划开始时间']||'',
        提前提醒: warnN + warnU,
        循环方式: formModel['循环方式']||'多次',
        执行条件: formModel['执行条件']||'按定时时间固定推移（默认）',
        表单名称: formModel['表单名称']||'',
        事业部: formModel['事业部']||'',
        车间: formModel['车间']||'',
        生产班组: formModel['生产班组']||'',
        备注: formModel['备注']||'—',
        启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
      };
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      if(isAdd){
        payload.id = 'labxj-' + Date.now();
        payload.创建人 = '张三';
        payload.创建时间 = nowStamp();
        list.unshift(payload);
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑巡检方案'); return; }
        Object.assign(cur, payload, { id: cur.id, 创建人: cur['创建人'], 创建时间: cur['创建时间'] });
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? (formMode.value==='copy' ? '巡检方案已复制新增' : '巡检方案创建成功') : '巡检方案修改成功');
    }
    function deleteLabInspSchemes(){
      const ids = new Set(selectedIds.value||[]);
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      const list = labInspSchemeRows();
      const rows = list.filter(r=> ids.has(r.id));
      if(rows.some(r=> r['启用状态']==='启用')){ ElMessage.warning('仅未启用的巡检方案可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条巡检方案？删除后不可恢复。','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        MOCK[LAB_INSP_SCHEME].main = list.filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条巡检方案');
      }).catch(()=>{});
    }
    /** 仪器点检 · 点检方案：方案 + 仪器明细（_insts 只存仪器台账 id 与计划时间，仪器字段跟随台账） */
    const DJ_SCHEME = 'np-0302-01', DJ_PLAN = 'np-0302-02', DJ_MY = 'np-0302-03';
    const DJ_INST_KEYS = ['使用状态','仪器编号','仪器名称','仪器条码','仪器类型','规格型号','存放位置','责任部门','责任人'];
    const DJ_TIME_KEYS = ['最新一次计划开始时间','最新一次计划完成时间','下次计划开始时间','下次计划创建时间'];
    const DJ_FORMS = ['仪器日常点检表','色谱仪点检表','光谱仪点检表','天平点检表','滴定仪点检表'];
    /** 点检 / 保养的方案、计划、我的 X 共用一套逻辑，字段名按「点检 / 保养」前缀区分 */
    const BY_SCHEME = 'np-0303-01', BY_PLAN = 'np-0303-02', BY_MY = 'np-0303-03';
    const BY_FORMS = ['仪器日常保养表','色谱仪保养表','光谱仪保养表','天平保养表','滴定仪保养表'];
    const HC_SCHEME = 'np-0304-01', HC_PLAN = 'np-0304-02', HC_MY = 'np-0304-03';
    const HC_FORMS = ['仪器日常期间核查表','色谱仪期间核查表','光谱仪期间核查表','天平期间核查表','滴定仪期间核查表'];
    const NJ_SCHEME = 'np-0305-02', NJ_PLAN = 'np-0305-03', NJ_MY = 'np-0305-04';
    const NJ_FORMS = ['仪器日常内校表','色谱仪内校表','光谱仪内校表','天平内校表','滴定仪内校表'];
    const DJ_KINDS = {
      [DJ_SCHEME]: { w:'点检', scheme: DJ_SCHEME, plan: DJ_PLAN, my: DJ_MY, forms: DJ_FORMS, idPfx:'dj-', noPfx:'YQDJ' },
      [BY_SCHEME]: { w:'保养', scheme: BY_SCHEME, plan: BY_PLAN, my: BY_MY, forms: BY_FORMS, idPfx:'by-', noPfx:'YQBY' },
      [HC_SCHEME]: { w:'期间核查', scheme: HC_SCHEME, plan: HC_PLAN, my: HC_MY, forms: HC_FORMS, idPfx:'hc-', noPfx:'YQHC' },
      [NJ_SCHEME]: { w:'内校', scheme: NJ_SCHEME, plan: NJ_PLAN, my: NJ_MY, forms: NJ_FORMS, idPfx:'nj-', noPfx:'YQNJ' }
    };
    /** 待内校清单：实时取仪器台账「在用 + 是否内校=是」的仪器，按下次内校日期与内校预警周期计算临期 / 过期 */
    const NJ_TODO = 'np-0305-01';
    function njQty(r, key, defUnit){
      const v = String(r[key]||'').trim();
      if(!v || v==='—' || v==='/') return '';
      return /^\d+(\.\d+)?$/.test(v) ? v + (r[key+'单位'] || defUnit) : v;
    }
    /** 待外校清单：同待内校清单，取「是否外校=是」；本次外校日期 / 结果 / 单位取台账「上次外校」字段，本次外校报告取最近一张已完成外校单 */
    const WJ_TODO = 'np-0306-01';
    function calTodoRows(w, view){
      const now = new Date(), nextKey = '下次'+w+'日期';
      return djInstruments()
        .filter(r=> r['使用状态']==='在用' && r['是否'+w]==='是' && /^\d{4}-\d{2}-\d{2}/.test(r[nextKey]||''))
        .map(r=>{
          const due = djParseTime(String(r[nextKey]).slice(0,10) + ' 00:00');
          const warn = njQty(r, w+'预警周期', '小时');
          const st = now > due ? '过期' : (warn && now > djShift(due, warn, '小时', -1) ? '临期' : '');
          return st ? Object.assign({
            id: (w==='内校' ? 'njt-' : 'wjt-') + r.id, [w+'状态']: st, 使用状态: r['使用状态'],
            条码号: r['仪器条码'] || r['仪器编号'], 仪器编号: r['仪器编号'], 仪器类型: r['仪器类型'],
            规格型号: r['规格型号'], 存放位置: r['存放位置']
          }, view(r, warn), { [nextKey]: r[nextKey] }) : null;
        })
        .filter(Boolean)
        .sort((a,b)=> String(a[nextKey]).localeCompare(String(b[nextKey])));
    }
    function njTodoRows(){
      return calTodoRows('内校', (r, warn)=> ({
        上次内校日期: r['上次内校日期'] || '/', 上次内校结果: r['上次内校结果'] || '/',
        内校周期: njQty(r, '内校周期', '天') || '/', 预警周期: warn || '/'
      }));
    }
    function wjTodoRows(){
      return calTodoRows('外校', (r, warn)=> ({
        责任部门: [].concat(r['责任部门'] || []).join('/'), 责任人: r['责任人'] || '',
        本次外校日期: r['上次外校日期'] || '/', 本次外校结果: r['上次外校结果'] || '/', 本次外校单位: r['上次外校单位'] || '/',
        本次外校报告: wjLastReport(r.id), 外校周期: njQty(r, '外校周期', '天') || '/', 提前提醒: warn || '/'
      }));
    }
    /** 最近一张已完成外校单中该仪器的外校报告 */
    function wjLastReport(instId){
      let at = '', file = '';
      wjOrderRows().filter(o=> o['单据状态']==='已完成').forEach(o=>{
        const l = (o._lines||[]).find(x=> x._instId===instId && x['外校报告']);
        if(l && String(o['操作时间']||'') >= at){ at = String(o['操作时间']||''); file = l['外校报告']; }
      });
      return file;
    }
    function djKindOf(id){ return Object.values(DJ_KINDS).find(k=> k.scheme===id || k.plan===id || k.my===id) || null; }
    function isDjSchemePage(){ return !!DJ_KINDS[pageId.value]; }
    function isDjPlanPage(){ return (djKindOf(pageId.value)||{}).plan===pageId.value; }
    function isDjMyPage(){ return (djKindOf(pageId.value)||{}).my===pageId.value; }
    function djKind(){ return djKindOf(pageId.value) || DJ_KINDS[DJ_SCHEME]; }
    function djSchemeId(){ return djKind().scheme; }
    function djSchemeRows(){
      const sid = djSchemeId();
      const bag = (MOCK[sid] = MOCK[sid] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function djInstruments(){ return (((MOCK['instrument']||{}).main)||[]); }
    function djInstLine(line){
      const inst = djInstruments().find(r=> r.id===line._instId) || {};
      const o = { _instId: line._instId };
      DJ_INST_KEYS.forEach(k=>{ o[k] = inst[k] || line[k] || ''; });
      DJ_TIME_KEYS.forEach(k=>{ o[k] = line[k] || ''; });
      return o;
    }
    function djParseTime(s){
      const t = new Date(String(s||'').replace(/-/g,'/'));
      return isNaN(t.getTime()) ? null : t;
    }
    function djFmtTime(d){
      const pad = n=> String(n).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    function djShift(d, text, defUnit, sign){
      const q = parseQtyUnit(text, defUnit);
      const n = (Number(q.n)||0) * (sign||1);
      const r = new Date(d.getTime());
      if(q.u==='分钟') r.setMinutes(r.getMinutes()+n);
      else if(q.u==='小时') r.setHours(r.getHours()+n);
      else if(q.u==='月') r.setMonth(r.getMonth()+n);
      else if(q.u==='年') r.setFullYear(r.getFullYear()+n);
      else r.setDate(r.getDate()+n);
      return r;
    }
    function djCalcNext(scheme, line){
      const cycle = scheme['执行周期'];
      const empty = { 下次计划开始时间:'', 下次计划创建时间:'' };
      if(!(Number(parseQtyUnit(cycle, '天').n) > 0)) return empty;
      let next = null;
      const latestStart = djParseTime(line['最新一次计划开始时间']);
      if(!latestStart){
        const start = djParseTime(scheme['计划开始时间']);
        next = start ? djShift(start, cycle, '天') : null;
        for(let i=0; next && next.getTime() < Date.now() && i < 100000; i++) next = djShift(next, cycle, '天');
      } else if(scheme['循环方式']!=='单次'){
        if(String(scheme['执行条件']||'').includes('上一次执行完成')){
          const done = djParseTime(line['最新一次计划完成时间']);
          next = done ? djShift(done, cycle, '天') : null;
        } else {
          next = djShift(latestStart, cycle, '天');
        }
      }
      if(!next) return empty;
      return { 下次计划开始时间: djFmtTime(next), 下次计划创建时间: djFmtTime(djShift(next, scheme['提前提醒'], '小时', -1)) };
    }
    function djDetailLines(row){
      const on = row['启用状态']!=='禁用';
      return (row._insts||[]).map(l=>{
        const v = djInstLine(l);
        if(!on || v['使用状态']!=='在用'){ v['下次计划开始时间'] = ''; v['下次计划创建时间'] = ''; }
        return v;
      });
    }
