    function djOpenPlans(row){
      const k = djKind(), ck = k.w+'方案编码', nk = k.w+'方案名称';
      return Object.values(MOCK[k.plan]||{}).filter(Array.isArray).flat()
        .filter(p=> p && (p[ck]===row[ck] || p[nk]===row[nk]) && !['已完成','已关闭'].includes(p['计划状态']));
    }
    function saveDjSchemeForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const posInt = v=> /^[1-9]\d*$/.test(v);
      const kind = djKind(), ck = kind.w+'方案编码', nk = kind.w+'方案名称';
      const code = txt(ck), name = txt(nk);
      if(!code){ ElMessage.warning('请输入'+ck); return; }
      if(!name){ ElMessage.warning('请输入'+nk); return; }
      if(!posInt(txt('执行周期'))){ ElMessage.warning('请输入正确的执行周期（正整数）'); return; }
      if(txt('标准作业时长') && !posInt(txt('标准作业时长'))){ ElMessage.warning('标准作业时长须为正整数'); return; }
      if(!txt('计划开始时间')){ ElMessage.warning('请选择计划开始时间'); return; }
      if(!posInt(txt('提前提醒'))){ ElMessage.warning('请输入正确的提前提醒（正整数）'); return; }
      if(!txt('循环方式')){ ElMessage.warning('请选择循环方式'); return; }
      if(!txt('执行条件')){ ElMessage.warning('请选择执行条件'); return; }
      const on = formSwitch['启用状态']!==false;
      const st = djParseTime(txt('计划开始时间'));
      if(on && st && st.getTime() < Date.now() - 60000){ ElMessage.warning('启用状态下，计划开始时间不可早于当前时间'); return; }
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const list = djSchemeRows();
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r[ck]===code)){ ElMessage.warning(ck+'已存在，请重新输入'); return; }
      if(others.some(r=> r[nk]===name)){ ElMessage.warning(nk+'已存在，请修改'); return; }
      const payload = {
        [ck]: code, [nk]: name, 内容描述: txt('内容描述'),
        执行周期: txt('执行周期') + (formModel['执行周期单位']||'天'),
        标准作业时长: txt('标准作业时长') ? txt('标准作业时长') + (formModel['标准作业时长单位']||'小时') : '',
        计划开始时间: txt('计划开始时间'),
        提前提醒: txt('提前提醒') + (formModel['提前提醒单位']||'小时'),
        循环方式: txt('循环方式'), 执行条件: txt('执行条件'),
        指定维保班组: splitDun(formModel['指定维保班组']).join('，'),
        表单名称: txt('表单名称'), 备注: txt('备注'),
        启用状态: on ? '启用' : '禁用'
      };
      payload._insts = (formLineRows.value||[]).map(r=>{
        const l = { _instId: r._instId, 最新一次计划开始时间: r['最新一次计划开始时间']||'', 最新一次计划完成时间: r['最新一次计划完成时间']||'' };
        return Object.assign(l, djCalcNext(payload, l));
      });
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(isAdd) list.unshift(Object.assign({ id: kind.idPfx+Date.now() }, payload, { 创建人: CI_OPERATOR, 创建时间: nowStamp() }));
      else if(cur) Object.assign(cur, payload);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    function deleteDjSchemes(){
      const ids = new Set(selectedIds.value||[]);
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      const list = djSchemeRows(), w = djKind().w;
      const busy = list.filter(r=> ids.has(r.id) && djOpenPlans(r).length);
      if(busy.length){
        ElMessage.warning('「'+busy.map(r=> r[w+'方案名称']).join('、')+'」存在未完成的'+w+'计划，不允许删除');
        return;
      }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条'+w+'方案？删除后不可恢复。','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        MOCK[djSchemeId()].main = list.filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条'+w+'方案');
      }).catch(()=>{});
    }
    /** 仪器点检 · 点检计划：一台仪器一条计划；点检记录 = 已完成的计划 */
    const DJ_OPEN = ['待执行','执行中'];
    const DJ_PLAN_INST_KEYS = ['仪器编号','仪器名称','仪器条码','仪器类型','存放位置'];
    function djFormTail(w){
      return [
        { label:'仪器状态', type:'select', options:['正常','待维修'], required:true, writeBack:'仪器状态' },
        { label:'异常描述', type:'textarea' },
        { label: w+'人签字', type:'sign', required:true }
      ];
    }
    const DJ_FORM_SCHEMAS = {
      '色谱仪点检表': [
        { label:'基线噪声', type:'judge', required:true },
        { label:'柱压（MPa）', type:'number' },
        { label:'载气压力（MPa）', type:'number' },
        { label:'进样系统密封', type:'judge', required:true },
        { label:'检测器灯源能量', type:'judge', required:true }
      ],
      '光谱仪点检表': [
        { label:'锥口清洁', type:'judge', required:true },
        { label:'雾化器状态', type:'judge', required:true },
        { label:'紫外灯能量（%）', type:'number' },
        { label:'波长校准', type:'judge', required:true }
      ],
      '天平点检表': [
        { label:'水平泡居中', type:'judge', required:true },
        { label:'校准砝码示值（g）', type:'number' },
        { label:'示值误差', type:'judge', required:true }
      ],
      '滴定仪点检表': [
        { label:'电极状态', type:'judge', required:true },
        { label:'管路气泡检查', type:'judge', required:true },
        { label:'滴定液余量', type:'judge', required:true }
      ],
      '仪器日常点检表': [
        { label:'外观清洁', type:'judge', required:true },
        { label:'电源与接地', type:'judge', required:true },
        { label:'运行声音', type:'judge', required:true }
      ],
      '色谱仪保养表': [
        { label:'进样垫与衬管更换', type:'judge', required:true },
        { label:'离子源清洗', type:'judge', required:true },
        { label:'泵油液位检查', type:'judge', required:true },
        { label:'密封圈状态', type:'judge', required:true },
        { label:'真空度（Pa）', type:'number' }
      ],
      '光谱仪保养表': [
        { label:'锥口深度清洗', type:'judge', required:true },
        { label:'雾化器清洗', type:'judge', required:true },
        { label:'氘灯能量（%）', type:'number' },
        { label:'波长校准', type:'judge', required:true }
      ],
      '天平保养表': [
        { label:'内部清洁', type:'judge', required:true },
        { label:'线性校准', type:'judge', required:true },
        { label:'校准后示值误差（mg）', type:'number' }
      ],
      '滴定仪保养表': [
        { label:'管路更换', type:'judge', required:true },
        { label:'电极更换', type:'judge', required:true },
        { label:'滴定管体积校准', type:'judge', required:true }
      ],
      '仪器日常保养表': [
        { label:'外观及内部除尘', type:'judge', required:true },
        { label:'散热风扇清洁', type:'judge', required:true },
        { label:'电源线与接地检查', type:'judge', required:true }
      ],
      '色谱仪期间核查表': [
        { label:'保留时间重复性', type:'judge', required:true },
        { label:'峰面积重复性（RSD%）', type:'number' },
        { label:'理论塔板数', type:'number' },
        { label:'分离度', type:'judge', required:true },
        { label:'系统适用性', type:'judge', required:true }
      ],
      '光谱仪期间核查表': [
        { label:'标准溶液回收率（%）', type:'number' },
        { label:'回收率判定', type:'judge', required:true },
        { label:'吸光度准确度', type:'judge', required:true },
        { label:'波长准确度', type:'judge', required:true }
      ],
      '天平期间核查表': [
        { label:'标准砝码示值（g）', type:'number' },
        { label:'示值误差', type:'judge', required:true },
        { label:'重复性', type:'judge', required:true }
      ],
      '滴定仪期间核查表': [
        { label:'基准物滴定度核查', type:'judge', required:true },
        { label:'电极斜率', type:'judge', required:true },
        { label:'滴定管体积', type:'judge', required:true }
      ],
      '仪器日常期间核查表': [
        { label:'外观与标识', type:'judge', required:true },
        { label:'运行状态', type:'judge', required:true },
        { label:'核查用标准物质有效期', type:'judge', required:true }
      ],
      '色谱仪内校表': [
        { label:'泵流量准确度', type:'judge', required:true },
        { label:'柱温箱温度准确度', type:'judge', required:true },
        { label:'检测器波长准确度', type:'judge', required:true },
        { label:'进样精密度（RSD%）', type:'number' },
        { label:'检测器线性', type:'judge', required:true }
      ],
      '光谱仪内校表': [
        { label:'波长准确度', type:'judge', required:true },
        { label:'吸光度准确度', type:'judge', required:true },
        { label:'杂散光', type:'judge', required:true },
        { label:'质量轴校准偏差（amu）', type:'number' }
      ],
      '天平内校表': [
        { label:'标准砝码示值（g）', type:'number' },
        { label:'示值误差', type:'judge', required:true },
        { label:'偏载误差', type:'judge', required:true },
        { label:'重复性', type:'judge', required:true }
      ],
      '滴定仪内校表': [
        { label:'滴定管容量校准', type:'judge', required:true },
        { label:'电极斜率', type:'judge', required:true },
        { label:'温度补偿', type:'judge', required:true }
      ],
      '仪器日常内校表': [
        { label:'外观与标识', type:'judge', required:true },
        { label:'示值误差', type:'judge', required:true },
        { label:'内校用标准器有效期', type:'judge', required:true }
      ]
    };
    function djDefaultForm(){ return '仪器日常'+djKind().w+'表'; }
    function djFormFields(name){ return (DJ_FORM_SCHEMAS[name] || DJ_FORM_SCHEMAS[djDefaultForm()]).concat(djFormTail(djKind().w)); }
    function djPlanRows(){
      const pid = djKind().plan;
      const bag = (MOCK[pid] = MOCK[pid] || { 'tab-1': [], 'tab-2': [] });
      if(!Array.isArray(bag['tab-1'])) bag['tab-1'] = [];
      return bag['tab-1'];
    }
    function djSchemeByName(name){ return djSchemeRows().find(r=> r[djKind().w+'方案名称']===name) || null; }
    function djSchemeOf(p){
      const ck = djKind().w+'方案编码', nk = djKind().w+'方案名称';
      return djSchemeRows().find(r=> (p[ck] && r[ck]===p[ck]) || r[nk]===p[nk]) || null;
    }
    function djFmtSpan(mins){
      const d = Math.floor(mins/1440), h = Math.floor(mins%1440/60), m = mins%60;
      return [d ? d+'天' : '', h ? h+'小时' : '', (m || (!d && !h)) ? m+'分钟' : ''].filter(Boolean).join(' ');
    }
    function djPlanView(p){
      const inst = djInstruments().find(r=> r.id===p._instId) || {};
      const v = { ...p };
      DJ_PLAN_INST_KEYS.forEach(k=>{ v[k] = inst[k] || p[k] || ''; });
      const st = djParseTime(p['计划开始时间']);
      const end = st ? (Number(parseQtyUnit(p['标准作业时长'], '小时').n) > 0 ? djShift(st, p['标准作业时长'], '小时') : st) : null;
      v['计划结束时间'] = end ? djFmtTime(end) : '';
      const ref = p['计划状态']==='已完成' ? djParseTime(p['操作时间']) : (p['计划状态']==='已关闭' ? djParseTime(p['关闭时间']) : new Date());
      const diff = end && ref ? Math.floor((ref.getTime() - end.getTime()) / 60000) : 0;
      v['逾期时长'] = diff > 0 ? djFmtSpan(diff) : '/';
      v['逾期状态'] = diff > 0 ? '逾期' : '正常';
      if(p['计划状态']!=='已完成') v['检查结果'] = '/';
      return v;
    }
    function nextDjPlanSeq(){
      let max = 0;
      const re = new RegExp('^'+djKind().noPfx+'(\\d+)$');
      djPlanRows().forEach(r=>{ const m = String(r['计划单号']||'').match(re); if(m) max = Math.max(max, parseInt(m[1], 10) || 0); });
      return max + 1;
    }
    function djApplySchemeToForm(){
      const s = djSchemeByName(formModel[djKind().w+'方案名称']);
      if(!s) return;
      formModel['内容描述'] = s['内容描述'] || '';
      const q = parseQtyUnit(s['标准作业时长'], '小时');
      formModel['标准作业时长'] = q.n;
      formModel['标准作业时长单位'] = q.u || '小时';
      formModel['指定维保班组'] = splitDun(s['指定维保班组']);
      formModel['表单名称'] = s['表单名称'] || '';
      const ids = new Set((s._insts||[]).map(l=> l._instId));
      formLineRows.value = (formLineRows.value||[]).filter(r=> ids.has(r._instId));
    }
    function djSchemeWriteBack(p, kind){
      const s = djSchemeOf(p);
      const l = s && (s._insts||[]).find(x=> x._instId===p._instId);
      if(!l) return;
      if(kind==='start') l['最新一次计划开始时间'] = p['计划开始时间'];
      else l['最新一次计划完成时间'] = String(p['操作时间']||'').slice(0,16);
      Object.assign(l, djCalcNext(s, l));
    }
    function saveDjPlanForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const kind = djKind(), w = kind.w, ck = w+'方案编码', nk = w+'方案名称';
      const name = txt(nk);
      if(!name){ ElMessage.warning('请选择'+w+'方案'); return; }
      const s = djSchemeByName(name);
      if(!s){ ElMessage.warning(w+'方案不存在'); return; }
      if(!txt('计划开始时间')){ ElMessage.warning('请选择计划开始时间'); return; }
      const dur = txt('标准作业时长');
      if(dur && !/^[1-9]\d*$/.test(dur)){ ElMessage.warning('标准作业时长须为正整数'); return; }
      const affect = txt(LAB_INSP_AFFECT).replace('（默认）','') || '临时计划，不更新';
      const cycle = affect.includes('循环');
      const base = {
        [ck]: s[ck], [nk]: name, 内容描述: txt('内容描述'), 表单名称: s['表单名称'] || '',
        指定维保班组: splitDun(formModel['指定维保班组']).join('，'), 计划开始时间: txt('计划开始时间'),
        标准作业时长: dur ? dur + (formModel['标准作业时长单位'] || '小时') : '',
        [LAB_INSP_AFFECT]: affect, 备注: txt('备注')
      };
      const list = djPlanRows();
      if(formMode.value==='edit'){
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑的'+w+'计划'); return; }
        if(!DJ_OPEN.includes(cur['计划状态'])){ ElMessage.warning('仅待执行、执行中的'+w+'计划可编辑'); return; }
        Object.assign(cur, base);
        if(cycle) djSchemeWriteBack(cur, 'start');
        formVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功');
        return;
      }
      const lines = formLineRows.value || [];
      if(!lines.length){ ElMessage.warning('请添加仪器'); return; }
      const seq = nextDjPlanSeq(), ts = Date.now(), at = nowStamp();
      const made = lines.map((r, i)=>{
        const inst = djInstruments().find(x=> x.id===r._instId) || {};
        const p = { id: kind.idPfx+'p-'+ts+'-'+i, 计划状态: '待执行', 计划单号: kind.noPfx + String(seq+i).padStart(8,'0'), _instId: r._instId };
        DJ_PLAN_INST_KEYS.forEach(k=>{ p[k] = inst[k] || r[k] || ''; });
        return Object.assign(p, base, { 创建方式: '手动', 创建人: CI_OPERATOR, 创建时间: at });
      });
      list.unshift(...made);
      if(cycle) made.forEach(p=> djSchemeWriteBack(p, 'start'));
      formVisible.value = false;
      bumpStore();
      ElMessage.success('已生成 '+made.length+' 条'+w+'计划' + (cycle ? '，已更新方案内该仪器的最新一次计划时间' : ''));
    }
    function closeDjPlans(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      const w = djKind().w;
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !DJ_OPEN.includes(r['计划状态']))){ ElMessage.warning('仅待执行、执行中的'+w+'计划可关闭'); return; }
      ElementPlus.ElMessageBox.prompt('请输入关闭说明', '关闭', {
        confirmButtonText:'确定', cancelButtonText:'取消', inputType:'textarea', inputPlaceholder:'必填',
        inputValidator: v=> !!String(v||'').trim() || '请输入关闭说明'
      }).then(({ value })=>{
        const ids = new Set(rows.map(r=> r.id)), at = nowStamp();
        djPlanRows().forEach(r=>{
          if(!ids.has(r.id)) return;
          Object.assign(r, { 计划状态: '已关闭', 关闭说明: String(value).trim(), 关闭人: CI_OPERATOR, 关闭时间: at });
        });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已关闭 '+ids.size+' 条'+w+'计划');
      }).catch(()=>{});
    }
    function deleteDjPlans(){
      const ids = new Set(selectedIds.value||[]);
      const kind = djKind(), w = kind.w;
      if(!ids.size){ ElMessage.warning('请先勾选数据'); return; }
      if(djPlanRows().some(r=> ids.has(r.id) && !DJ_OPEN.includes(r['计划状态']))){ ElMessage.warning('仅待执行、执行中的'+w+'计划可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 条'+w+'计划？删除后不可恢复。','删除确认',{
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        MOCK[kind.plan]['tab-1'] = djPlanRows().filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 条'+w+'计划');
      }).catch(()=>{});
    }
    /** 我的点检 / 我的保养：按当前登录维保人员所属维保班组过滤计划 */
    const djMyUser = ref('WB001');
    function djMyUsers(){ return maintPersonRows().filter(r=> r['员工状态']!=='离职'); }
    function djMyTeams(){
      const u = djMyUsers().find(r=> r['人员编码']===djMyUser.value);
      return u ? splitDun(u['所属维保班组']) : [];
    }
    function linkDjMyRecords(){
      const rows = tableData.value.filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const nos = [...new Set(rows.map(r=> r['计划单号']).filter(Boolean))];
      const kind = djKind();
      selectedIds.value = [];
      loadPage(kind.plan);
      activeTab.value = 'tab-2';
      setTimeout(()=>{
        resetQueryModel();
        query['计划单号'] = nos.join('、');
        queryExpanded.value = true;
        pageNum.value = 1;
        ElMessage.success('已跳转'+kind.w+'记录，按所选 '+nos.length+' 个计划单号过滤');
      }, 0);
    }
    const djExecVisible = ref(false);
    const djExecReadonly = ref(false);
    const djExecRow = ref({});
    const djExecData = reactive({});
    const djExecFields = computed(()=> djFormFields(djExecRow.value['表单名称']));
    const djExecFormName = computed(()=> djExecRow.value['表单名称'] || djDefaultForm());
    const djExecHead = computed(()=> ['计划单号','计划状态',djKind().w+'方案名称','仪器编号','仪器名称','存放位置','计划开始时间','计划结束时间','逾期状态']
      .concat(djExecReadonly.value ? ['检查结果','操作人','操作时间'] : []));
    function openDjExec(row, readonly){
      const p = djPlanRows().find(r=> r.id===row.id);
      if(!p) return;
      if(!readonly && !DJ_OPEN.includes(p['计划状态'])){ ElMessage.warning('仅待执行、执行中的'+djKind().w+'计划可作业执行'); return; }
      Object.keys(djExecData).forEach(k=> delete djExecData[k]);
      Object.assign(djExecData, p._formData || {});
      if(!readonly && !djExecData['仪器状态']){
        const inst = djInstruments().find(r=> r.id===p._instId) || {};
        djExecData['仪器状态'] = inst['仪器状态']==='待维修' ? '待维修' : '正常';
      }
      djExecRow.value = djPlanView(p);
      djExecReadonly.value = !!readonly;
      djExecVisible.value = true;
    }
    function djSign(f){ if(!djExecReadonly.value) djExecData[f.label] = CI_OPERATOR; }
    function saveDjExec(submit){
      const p = djPlanRows().find(r=> r.id===djExecRow.value.id);
      if(!p || !DJ_OPEN.includes(p['计划状态'])){ ElMessage.warning('仅待执行、执行中的'+djKind().w+'计划可作业执行'); return; }
      const data = { ...djExecData };
      if(submit){
        const miss = djExecFields.value.find(f=> f.required && !String(data[f.label]||'').trim());
        if(miss){ ElMessage.warning('请填写「'+miss.label+'」'); return; }
      }
      p._formData = data;
      if(!submit){
        p['计划状态'] = '执行中';
        djExecVisible.value = false;
        bumpStore();
        ElMessage.success('已保存，计划状态为执行中');
        return;
      }
      Object.assign(p, {
        计划状态: '已完成', 操作时间: nowStamp(), 操作人: CI_OPERATOR,
        检查结果: djExecFields.value.some(f=> f.type==='judge' && data[f.label]==='不合格') ? '异常' : '正常'
      });
      if(djKind().w==='点检') ylAutoUsage(p);
      const cycle = p['创建方式']==='自动' || String(p[LAB_INSP_AFFECT]||'').includes('循环');
      if(cycle) djSchemeWriteBack(p, 'done');
      const inst = djInstruments().find(r=> r.id===p._instId);
      const back = djExecFields.value.filter(f=> f.writeBack && data[f.label]);
      if(inst) back.forEach(f=>{ inst[f.writeBack] = data[f.label]; });
      djExecVisible.value = false;
      bumpStore();
      ElMessage.success('提交成功，已生成'+djKind().w+'记录'
        + (cycle ? '；已更新方案内该仪器的最新一次计划完成时间' : '')
        + (inst && back.length ? '；已反写仪器台账「'+back.map(f=> f.writeBack).join('、')+'」' : ''));
    }
    /** 仪器外校：一张外校单含多台仪器；外校记录 = 已完成外校单按仪器展开的流水；执行弹窗填写外校结果，提交后反写仪器台账外校信息 */
    const WJ_ORDER = 'np-0306-02';
    const WJ_REQ = ['本次外校日期','外校周期','本次外校单位','本次外校结果'];
    const wjExecVisible = ref(false);
    const wjExecRow = ref({});
    const wjExecLines = ref([]);
    const wjExecSel = ref([]);
    const wjLinePickRow = ref(null);
    function wjOrderRows(){
      const bag = (MOCK[WJ_ORDER] = MOCK[WJ_ORDER] || { 'tab-1': [], 'tab-2': [] });
      if(!Array.isArray(bag['tab-1'])) bag['tab-1'] = [];
      return bag['tab-1'];
    }
        function nextAbnNo(){
      const rows = (((window.WMS_MOCK_ROWS||MOCK)['np-0417-03']||{}).main)||[];
      const seq = rows.reduce((m, r)=>{
        const hit = /^YC\d{8}(\d{3})$/.exec(String(r['异常单号']||''));
        return Math.max(m, hit ? parseInt(hit[1], 10) : 0);
      }, 0) + 1;
      const d = new Date();
      return 'YC' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + String(seq).padStart(3,'0');
    }
function nextWjNo(){
      const seq = wjOrderRows().reduce((m, r)=> Math.max(m, parseInt(String(r['外校单号']||'').replace(/\D/g, ''), 10) || 0), 0) + 1;
      return 'YQWJ' + String(seq).padStart(8, '0');
    }
    function wjNextDate(cur, cycle){
      if(!/^\d{4}-\d{2}-\d{2}/.test(cur||'') || !(Number(parseQtyUnit(cycle, '天').n) > 0)) return '';
      return djFmtTime(djShift(djParseTime(String(cur).slice(0, 10) + ' 00:00'), cycle, '天')).slice(0, 10);
    }
    function wjLineView(l){
      const inst = djInstruments().find(r=> r.id===l._instId) || {};
      const todo = wjTodoRows().find(r=> r.id==='wjt-'+l._instId);
      const v = { ...l };
      ['仪器编号','仪器名称','仪器类型','存放位置'].forEach(k=>{ v[k] = inst[k] || l[k] || ''; });
      v['外校状态'] = todo ? todo['外校状态'] : '正常';
      return v;
    }
    function wjNewLine(inst){
      return {
        _instId: inst.id, 上次外校日期: inst['上次外校日期'] || '', 本次外校日期: '',
        外校周期: njQty(inst, '外校周期', '天'), 下次外校日期: '',
        本次外校单位: wjExecRow.value['外校单位'] || '', 本次外校结果: '合格', 校验费用: '', 外校报告: '', 外校说明: ''
      };
    }
    function wjQueryRows(){
      const rec = tabView.value.name==='tab-2';
      const nos = splitDun(query['外校单号']);
      const q = Object.assign({}, query, { 外校单号: nos.length>1 ? '' : (query['外校单号']||'') });
      let l;
      if(rec){
        l = [];
        wjOrderRows().filter(o=> o['单据状态']==='已完成').forEach(o=>{
          (o._lines||[]).forEach((x, i)=>{
            l.push(Object.assign(wjLineView(x), { id: o.id+'-'+i, 外校单号: o['外校单号'], 单据类型: o['单据类型'], 操作时间: o['操作时间'], 操作人: o['操作人'] }));
          });
        });
        l = applyContainsExactQuery(l, q, ['外校单号','仪器编号','仪器名称','本次外校单位','操作人'], ['本次外校结果','单据类型']);
        ['本次外校日期','操作时间'].forEach(k=>{ l = applyDateRangeQuery(l, query, k); });
      } else {
        l = applyContainsExactQuery(wjOrderRows().slice(), q, ['外校单号','外校单位','创建人'], ['单据状态','单据类型']);
        l = applyDateRangeQuery(l, query, '创建时间');
      }
      if(nos.length>1) l = l.filter(r=> nos.includes(String(r['外校单号']||'')));
      const key = rec ? '操作时间' : '创建时间';
      return l.sort((a,b)=> String(b[key]||'').localeCompare(String(a[key]||'')));
    }
