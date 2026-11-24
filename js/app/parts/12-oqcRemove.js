    function oqcRemove(close){
      const rows = (tableData.value||[]).filter(r=> selectedIds.value.includes(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选OQC任务'); return; }
      if(close && rows.some(r=> r['单据状态']==='已关闭')){ ElMessage.warning('已关闭的任务不能重复关闭'); return; }
      const tip = close
        ? '确认关闭所选的 '+rows.length+' 条 OQC 任务？关闭后单据状态为已关闭，不再执行，仍保留在待执行列表。'
        : '确认删除所选的 '+rows.length+' 条 OQC 任务？删除后不可恢复。';
      ElementPlus.ElMessageBox.confirm(tip, close ? '关闭确认' : '删除确认', { type:'warning', confirmButtonText:'确认', cancelButtonText:'取消' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        const pending = oqcTab('tab-1');
        const hit = pending.filter(r=> ids.has(r.id));
        if(close){
          const stamp = nowStamp();
          hit.forEach(r=> Object.assign(r, { 单据状态:'已关闭', 关闭人:'管理员', 关闭时间: stamp }));
        }else{
          MOCK[OQC_PAGE]['tab-1'] = pending.filter(r=> !ids.has(r.id));
        }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success(close ? '已关闭 '+hit.length+' 条 OQC 任务' : '已删除 '+hit.length+' 条 OQC 任务');
      }).catch(()=>{});
    }
    function dispatchCatLine(r){
      return {
        检验类编码: (r && r['检验类编码']) || '',
        检验类名称: (r && r['检验类名称']) || '',
        检验类属性: (r && r['检验类属性']) || '',
        适用仪器类型: (r && r['适用仪器类型']) || ''
      };
    }
    function dispatchCatsFromRow(row, nameKey){
      if(Array.isArray(row && row._cats) && row._cats.length) return row._cats.map(dispatchCatLine);
      const names = splitDun(row && (row[nameKey] || row['适用检验类'] || row['检验类']));
      const all = ((MOCK['insp-project']||{})['tab-category']||[]);
      return names.map(name=>{
        const hit = all.find(r=> r['检验类名称']===name);
        return hit ? dispatchCatLine(hit) : { 检验类编码:'', 检验类名称:name, 检验类属性:'', 适用仪器类型:'' };
      });
    }
    function dispatchLinesFromRow(row){
      if(Array.isArray(row && row._mats) && row._mats.length) return row._mats.map(r=> ({ 物料编码: r['物料编码']||'', 物料名称: r['物料名称']||'', 物料规格: r['物料规格']||'', 物料种类: r['物料种类']||'' }));
      const codes = splitDun(row && row['物料编码']).filter(x=> x && x!=='—');
      const names = splitDun(row && row['物料名称']);
      const texts = String((row && (row['适用物料'] || row['物料信息']))||'').split('、');
      const all = ((MOCK['mat-list']||{}).main)||[];
      return codes.map((code, i)=>{
        const parts = String(texts[i]||'').split(' / ').map(s=> s.trim());
        const hit = all.find(r=> r['物料编码']===code);
        return { 物料编码: code, 物料名称: names[i] || parts[1] || (hit&&hit['物料名称']) || '', 物料规格: parts[2] || (hit&&hit['物料规格']) || '', 物料种类: (hit&&hit['物料种类']) || '' };
      });
    }
    function dispatchInstLine(r){
      return {
        _instId: (r && (r._instId || r.id)) || '',
        仪器编号: (r && r['仪器编号']) || '',
        仪器名称: (r && r['仪器名称']) || '',
        仪器类型: (r && r['仪器类型']) || '',
        规格型号: (r && r['规格型号']) || ''
      };
    }
    function dispatchInstsFromRow(row){
      if(Array.isArray(row && row._insts) && row._insts.length) return row._insts.map(dispatchInstLine);
      const raw = row && ((row['使用仪器'] && row['使用仪器']!=='—') ? row['使用仪器'] : row['适用仪器']);
      const labels = splitDun(raw).filter(x=> x && x!=='—');
      const all = ((MOCK.instrument||{}).main)||[];
      return labels.map(label=>{
        const hit = all.find(r=> r['仪器名称']===label || r['仪器编号']===label);
        return hit ? dispatchInstLine(hit) : { _instId:'', 仪器编号:'', 仪器名称:label, 仪器类型:'', 规格型号:'' };
      });
    }
    function saveDispatchForm(){
      const txt = k=> String(formModel[k]||'').trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const cats = (formCatRows.value||[]).map(r=> String(r['检验类名称']||'').trim()).filter((n,i,a)=> n && a.indexOf(n)===i);
      const teams = splitDun(formModel['派单班组']);
      const mats = (formLineRows.value||[]).map(r=> ({ code: String(r['物料编码']||'').trim(), name: String(r['物料名称']||'').trim(), spec: String(r['物料规格']||'').trim() }))
        .filter((m, i, a)=> m.code && a.findIndex(x=> x.code===m.code)===i);
      const codes = mats.map(m=> m.code);
      const insts = dispatchInstsFromRow({ 使用仪器: formModel['使用仪器'] }).filter((m, i, a)=> (m['仪器编号']||m['仪器名称']) && a.findIndex(x=> (x['仪器编号']||x['仪器名称'])===(m['仪器编号']||m['仪器名称']))===i);
      if(!codes.length){ ElMessage.warning('请选择适用物料'); return; }
      if(!cats.length){ ElMessage.warning('请选择适用检验类'); return; }
      if(!teams.length){ ElMessage.warning('请选择派单班组'); return; }
      if(!txt('开始时间')){ ElMessage.warning('请选择开始时间'); return; }
      if(!txt('结束时间')){ ElMessage.warning('请选择结束时间'); return; }
      const list = (MOCK[DISPATCH_PAGE] = MOCK[DISPATCH_PAGE] || { main: [] }).main || (MOCK[DISPATCH_PAGE].main = []);
      const enable = formSwitch['启用状态']===false ? '禁用' : '启用';
      const ns = txt('开始时间'), ne = txt('结束时间');
      if(enable==='启用'){
        for(const r of list){
          if(r['启用状态']==='禁用' || (!isAdd && r.id===formModel._editId)) continue;
          const cat = cats.find(c=> splitDun(r['适用检验类']).includes(c));
          if(!cat) continue;
          const rm = ruleMats(r);
          const mat = !codes.length ? (!rm.length ? '全部物料' : '') : codes.find(c=> rm.includes(c));
          if(mat){
            // 时间范围有交集才判重（HH:mm 字符串可直接比较）
            const os = String(r['开始时间']||''), oe = String(r['结束时间']||'');
            if(!os || !oe || (ns < oe && os < ne)){ ElMessage.warning('适用检验类「'+cat+'」+ 物料「'+mat+'」已在启用方案 '+r['方案编码']+' 中配置，请修改或停用后再保存'); return; }
          }
        }
      }
      const payload = {
        方案名称: txt('方案名称'), 适用检验类: cats.join('、'), _cats: (formCatRows.value||[]).map(dispatchCatLine),
        适用物料: mats.map(m=> [m.code, m.name, m.spec].filter(Boolean).join(' / ')).join('、'), 物料编码: codes.join('、') || '—', 物料名称: mats.map(m=> m.name).join('、') || '全部物料',
        _mats: mats.map(m=> ({ 物料编码: m.code, 物料名称: m.name, 物料规格: m.spec })),
        使用仪器: insts.map(i=> i['仪器名称']).filter(Boolean).join('、') || '—',
        _insts: insts,
        派单班组: teams.join('、'), 分配方式: teams.length > 1 ? '手动分配' : '自动分配',
        开始时间: txt('开始时间'), 结束时间: txt('结束时间'), 备注: txt('备注'), 启用状态: enable
      };
      let saved;
      if(isAdd){
        const max = list.reduce((m, r)=> Math.max(m, parseInt(String(r['方案编码']||'').replace(/\D/g, ''), 10) || 0), 0);
        saved = Object.assign({ id: 'pd-'+Date.now(), 方案编码: 'PD'+String(max + 1).padStart(3, '0') }, payload, { 创建人:'管理员', 创建时间: nowStamp() });
        list.unshift(saved);
      } else {
        saved = list.find(r=> r.id===formModel._editId);
        if(!saved){ ElMessage.warning('未找到待编辑数据'); return; }
        Object.assign(saved, payload);
        delete saved['适用仪器'];
        delete saved['匹配范围'];
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '已新增派单方案 '+saved['方案编码'] : '保存成功');
    }
    function saveInspTeamForm(){
      const txt = k=> String(formModel[k]||'').trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const code = txt('班组编码'), name = txt('班组名称');
      if(!code){ ElMessage.warning('请输入班组编码'); return; }
      if(!name){ ElMessage.warning('请输入班组名称'); return; }
      const list = (MOCK['insp-team'] = MOCK['insp-team'] || { main: [] }).main || (MOCK['insp-team'].main = []);
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r['班组编码']===code)){ ElMessage.warning('班组编码已存在'); return; }
      if(others.some(r=> r['班组名称']===name)){ ElMessage.warning('班组名称已存在'); return; }
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(cur && cur['班组名称']!==name && dispatchRules().some(r=> splitDun(r['派单班组']).includes(cur['班组名称']))){
        ElMessage.warning('班组已被自动化派单方案引用，不可修改班组名称'); return;
      }
      const payload = {
        班组编码: code, 班组名称: name, 备注: txt('备注'), 启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
      };
      if(isAdd) list.unshift(Object.assign({ id: 'tm-'+Date.now() }, payload, { 创建人:'管理员', 创建时间: nowStamp() }));
      else if(cur) Object.assign(cur, payload);
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '已新增检验班组 '+name : '保存成功');
    }
    function shiftSegMin(s, e){
      const a = s.split(':').map(Number), b = e.split(':').map(Number);
      if(a.length<2 || b.length<2 || isNaN(a[0]) || isNaN(b[0])) return null;
      let st = a[0]*60 + (a[1]||0), en = b[0]*60 + (b[1]||0);
      if(en<=st) en += 1440;
      return { st, en };
    }
    function saveShiftForm(){
      const txt = k=> String(formModel[k]||'').trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const name = txt('班次名称');
      if(!name){ ElMessage.warning('请输入班次名称'); return; }
      const n = parseInt(formModel['段数'], 10);
      if(!n || n<1 || n>6){ ElMessage.warning('段数须为 1~6'); return; }
      const segs = [];
      for(let i=1;i<=n;i++){
        const s = txt('段'+i+'开始'), e = txt('段'+i+'结束'), t = txt('段'+i+'类型');
        if(!s){ ElMessage.warning('请选择段'+i+'开始'); return; }
        if(!e){ ElMessage.warning('请选择段'+i+'结束'); return; }
        if(s===e){ ElMessage.warning('段'+i+'开始与结束不能相同'); return; }
        if(!t){ ElMessage.warning('请选择段'+i+'类型'); return; }
        const r = shiftSegMin(s, e);
        if(!r){ ElMessage.warning('段'+i+'时间格式不正确'); return; }
        segs.push({ s, e, t, st:r.st, en:r.en });
      }
      const overlap = (x,y)=> x.st<y.en && y.st<x.en;
      for(let i=0;i<segs.length;i++){
        for(let j=i+1;j<segs.length;j++){
          const a = segs[i], b = segs[j];
          const hit = overlap(a,b) || overlap(a,{st:b.st+1440,en:b.en+1440}) || overlap(a,{st:b.st-1440,en:b.en-1440});
          if(hit){ ElMessage.warning('段'+(i+1)+' 与段'+(j+1)+' 时段重叠'); return; }
        }
      }
      const list = (MOCK[SHIFT_PAGE] = MOCK[SHIFT_PAGE] || { main: [] }).main || (MOCK[SHIFT_PAGE].main = []);
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r['班次名称']===name)){ ElMessage.warning('班次名称已存在'); return; }
      const teams = splitDun(formModel['适用班组']);
      const payload = {
        班次名称: name, 开始时间: segs[0].s, 结束时间: segs[segs.length-1].e,
        段数: String(n), 检验时段: segs.map(x=> x.t + ' ' + x.s + '-' + x.e).join('；'),
        适用班组: teams.join('、') || '通用', 备注: txt('备注'),
        启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
      };
      segs.forEach((x,idx)=>{ const i=idx+1; payload['段'+i+'开始']=x.s; payload['段'+i+'结束']=x.e; payload['段'+i+'类型']=x.t; });
      for(let i=n+1;i<=6;i++){ ['开始','结束','类型'].forEach(k=> delete payload['段'+i+k]); }
      if(isAdd){
        const max = list.reduce((m, r)=> Math.max(m, parseInt(String(r['班次编码']||'').replace(/\D/g, ''), 10) || 0), 0);
        const saved = Object.assign({ id: 'bc-'+Date.now(), 班次编码: 'BC'+String(max + 1).padStart(3, '0') }, payload, { 创建人:'管理员', 创建时间: nowStamp() });
        list.unshift(saved);
        formVisible.value = false;
        bumpStore();
        ElMessage.success('已新增班次 '+name);
      } else {
        const saved = list.find(r=> r.id===formModel._editId);
        if(!saved){ ElMessage.warning('未找到待编辑数据'); return; }
        for(let i=n+1;i<=6;i++){ ['开始','结束','类型'].forEach(k=> delete saved['段'+i+k]); }
        delete saved['跨天']; delete saved['班次颜色'];
        Object.assign(saved, payload);
        formVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功');
      }
    }
    function calSpecSummary(dates){
      const rest = (dates||[]).filter(d=> d['类型']==='休息日').length;
      const work = (dates||[]).filter(d=> d['类型']==='加班日').length;
      const parts = [];
      if(rest) parts.push('休息 '+rest+' 天');
      if(work) parts.push('加班 '+work+' 天');
      return parts.join('、') || '—';
    }
    function saveCalForm(){
      const txt = k=> String(formModel[k]||'').trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const name = txt('日历名称'), start = txt('生效日期'), end = txt('结束日期');
      if(!name){ ElMessage.warning('请输入日历名称'); return; }
      if(!start){ ElMessage.warning('请选择生效日期'); return; }
      if(!end){ ElMessage.warning('请选择结束日期'); return; }
      if(end < start){ ElMessage.warning('结束日期不能早于生效日期'); return; }
      const week = splitDun(formModel['每周工作日']);
      if(!week.length){ ElMessage.warning('请选择每周工作日'); return; }
      const dates = (formLineRows.value||[]).map(r=> ({
        日期: String(r['日期']||'').trim(), 类型: String(r['类型']||'').trim() || '休息日', 说明: String(r['说明']||'').trim()
      }));
      const seen = new Set();
      for(let i=0; i<dates.length; i++){
        const d = dates[i];
        if(!d['日期']){ ElMessage.warning('特殊日期第 '+(i+1)+' 行请选择日期'); return; }
        if(d['日期'] < start || d['日期'] > end){ ElMessage.warning('特殊日期第 '+(i+1)+' 行不在生效区间内'); return; }
        if(seen.has(d['日期'])){ ElMessage.warning('特殊日期第 '+(i+1)+' 行日期重复'); return; }
        seen.add(d['日期']);
      }
      const list = (MOCK[CAL_PAGE] = MOCK[CAL_PAGE] || { main: [] }).main || (MOCK[CAL_PAGE].main = []);
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r['日历名称']===name)){ ElMessage.warning('日历名称已存在'); return; }
      const teams = splitDun(formModel['适用班组']);
      const payload = {
        日历名称: name, 生效日期: start, 结束日期: end,
        每周工作日: week.join('、'), 特殊日期: calSpecSummary(dates), _dates: dates,
        适用班组: teams.join('、') || '通用', 备注: txt('备注'),
        启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
      };
      if(isAdd){
        const max = list.reduce((m, r)=> Math.max(m, parseInt(String(r['日历编码']||'').replace(/\D/g, ''), 10) || 0), 0);
        const saved = Object.assign({ id: 'rl-'+Date.now(), 日历编码: 'RL'+String(max + 1).padStart(3, '0') }, payload, { 创建人:'管理员', 创建时间: nowStamp() });
        list.unshift(saved);
        formVisible.value = false;
        bumpStore();
        ElMessage.success('已新增检验日历 '+name);
      } else {
        const saved = list.find(r=> r.id===formModel._editId);
        if(!saved){ ElMessage.warning('未找到待编辑数据'); return; }
        Object.assign(saved, payload);
        formVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功');
      }
    }
    const MAINT_TEAM_PAGE = 'np-0109-01';
    function maintTeamInUse(row){
      const keys = new Set([row['班组编码'], row['班组名称']].filter(Boolean));
      return Object.entries(MOCK).some(([pid, bag])=> pid!==MAINT_TEAM_PAGE && bag && typeof bag==='object'
        && Object.values(bag).some(list=> Array.isArray(list) && list.some(r=> r && Object.keys(r).some(k=> k.includes('维保班组') && splitDun(r[k]).some(v=> keys.has(v))))));
    }
    function saveMaintTeamForm(){
      const txt = k=> String(formModel[k]||'').trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const code = txt('班组编码'), name = txt('班组名称');
      if(!code){ ElMessage.warning('请输入班组编码'); return; }
      if(!name){ ElMessage.warning('请输入班组名称'); return; }
      const list = (MOCK[MAINT_TEAM_PAGE] = MOCK[MAINT_TEAM_PAGE] || { main: [] }).main || (MOCK[MAINT_TEAM_PAGE].main = []);
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r['班组编码']===code)){ ElMessage.warning('班组编码已存在'); return; }
      if(others.some(r=> r['班组名称']===name)){ ElMessage.warning('班组名称已存在'); return; }
      const payload = { 班组编码: code, 班组名称: name, 备注: txt('备注'), 启用状态: formSwitch['启用状态']===false ? '禁用' : '启用' };
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(isAdd) list.unshift(Object.assign({ id: 'mt-'+Date.now() }, payload, { 创建人: CI_OPERATOR, 创建时间: nowStamp() }));
      else if(cur) Object.assign(cur, payload);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    const MAINT_PERSON_PAGE = 'np-0109-02';
    const MAINT_USER_KEYS = ['人员姓名','所属角色','所属岗位','所属部门','入职日期','联系电话','电子邮箱'];
    const MAINT_SYS_USERS = [
      { 人员编码:'WB001', 人员姓名:'周建国', 所属角色:'仪器维修', 所属岗位:'仪器管理员', 所属部门:'设备动力部', 入职日期:'2018-03-12', 联系电话:'13900003001', 电子邮箱:'zhoujianguo@dingcai.demo' },
      { 人员编码:'WB002', 人员姓名:'吴海峰', 所属角色:'仪器维修', 所属岗位:'仪器工程师', 所属部门:'设备动力部', 入职日期:'2019-07-01', 联系电话:'13900003002', 电子邮箱:'wuhaifeng@dingcai.demo' },
      { 人员编码:'WB003', 人员姓名:'郑丽', 所属角色:'仪器维修', 所属岗位:'色谱维修工程师', 所属部门:'质检中心', 入职日期:'2020-05-18', 联系电话:'13900003003', 电子邮箱:'zhengli@dingcai.demo' },
      { 人员编码:'WB004', 人员姓名:'冯涛', 所属角色:'仪器维修', 所属岗位:'光谱维修工程师', 所属部门:'质检中心', 入职日期:'2021-09-06', 联系电话:'13900003004', 电子邮箱:'fengtao@dingcai.demo' },
      { 人员编码:'WB005', 人员姓名:'何静', 所属角色:'仪器管理', 所属岗位:'仪器管理员', 所属部门:'质检中心', 入职日期:'2022-02-14', 联系电话:'13900003005', 电子邮箱:'hejing@dingcai.demo' },
      { 人员编码:'WB006', 人员姓名:'唐磊', 所属角色:'外委对接', 所属岗位:'设备采购专员', 所属部门:'采购部', 入职日期:'2023-04-03', 联系电话:'13900003006', 电子邮箱:'tanglei@dingcai.demo' },
      { 人员编码:'WB007', 人员姓名:'韩冰', 所属角色:'仪器维修', 所属岗位:'理化维修技术员', 所属部门:'质检中心', 入职日期:'2024-08-19', 联系电话:'13900003007', 电子邮箱:'hanbing@dingcai.demo' },
      { 人员编码:'WB008', 人员姓名:'曹宇', 所属角色:'仪器维修', 所属岗位:'维修技术员', 所属部门:'设备动力部', 入职日期:'2025-11-10', 联系电话:'13900003008', 电子邮箱:'caoyu@dingcai.demo' },
    ];
    function maintPersonRows(){
      const bag = (MOCK[MAINT_PERSON_PAGE] = MOCK[MAINT_PERSON_PAGE] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function maintTeamNames(){
      return (((MOCK[MAINT_TEAM_PAGE]||{}).main)||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r['班组名称']).filter(Boolean);
    }
    function maintUserOptions(){
      const used = new Set(maintPersonRows().filter(r=> formMode.value==='edit' ? r.id!==formModel._editId : true).map(r=> r['人员编码']));
      return MAINT_SYS_USERS.filter(u=> !used.has(u.人员编码)).map(u=> ({ value: u.人员编码, label: u.人员编码 + ' / ' + u.人员姓名 }));
    }
    function onMaintUserChange(){
      const u = MAINT_SYS_USERS.find(x=> x.人员编码===formModel['人员编码']);
      MAINT_USER_KEYS.forEach(k=>{ formModel[k] = u ? (u[k]||'') : ''; });
    }
    function maintPersonInUse(row){
      const keys = new Set([row['人员编码'], row['人员姓名']].filter(Boolean));
      return Object.entries(MOCK).some(([pid, bag])=> pid!==MAINT_PERSON_PAGE && bag && typeof bag==='object'
        && Object.values(bag).some(list=> Array.isArray(list) && list.some(r=> r && Object.keys(r).some(k=> k.includes('维保人员') && splitDun(r[k]).some(v=> keys.has(v))))));
    }
    function saveMaintPersonForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const code = txt('人员编码');
      if(!code){ ElMessage.warning('请选择人员编码'); return; }
      if(!txt('人员姓名')){ ElMessage.warning('请选择人员编码以带入人员姓名'); return; }
      if(!txt('员工状态')){ ElMessage.warning('请选择员工状态'); return; }
      const list = maintPersonRows();
      if(list.some(r=> r['人员编码']===code && (isAdd || r.id!==formModel._editId))){ ElMessage.warning('该人员编码已存在，请重新选择'); return; }
      const payload = { 人员编码: code };
      MAINT_USER_KEYS.concat(['员工状态','学历','附件','备注']).forEach(k=>{ payload[k] = txt(k); });
      payload['所属维保班组'] = splitDun(formModel['所属维保班组']).join('，');
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(isAdd) list.unshift(Object.assign({ id: 'mp-'+Date.now() }, payload, { 创建人: CI_OPERATOR, 创建时间: nowStamp() }));
      else if(cur) Object.assign(cur, payload);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    const FAULT_TYPE_PAGE = 'np-0109-03';
    function faultTypeInUse(row){
      const keys = new Set([row['故障类型编码'], row['故障类型名称']].filter(Boolean));
      return Object.entries(MOCK).some(([pid, bag])=> pid!==FAULT_TYPE_PAGE && bag && typeof bag==='object'
        && Object.values(bag).some(list=> Array.isArray(list) && list.some(r=> r && Object.keys(r).some(k=> k.includes('故障类型') && splitDun(r[k]).some(v=> keys.has(v))))));
    }
    function saveFaultTypeForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const code = txt('故障类型编码'), name = txt('故障类型名称');
      if(!code){ ElMessage.warning('请输入仪器故障编码'); return; }
      if(!name){ ElMessage.warning('请输入仪器故障名称'); return; }
      const list = (MOCK[FAULT_TYPE_PAGE] = MOCK[FAULT_TYPE_PAGE] || { main: [] }).main || (MOCK[FAULT_TYPE_PAGE].main = []);
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r['故障类型编码']===code)){ ElMessage.warning('仪器故障编码已存在'); return; }
      if(others.some(r=> r['故障类型名称']===name)){ ElMessage.warning('仪器故障名称已存在'); return; }
      const payload = {
        故障类型编码: code, 故障类型名称: name,
        适用仪器类型: splitDun(formModel['适用仪器类型']).join('，'),
        备注: txt('备注'), 启用状态: formSwitch['启用状态']===false ? '禁用' : '启用'
      };
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(isAdd) list.unshift(Object.assign({ id: 'ft-'+Date.now() }, payload, { 创建人: CI_OPERATOR, 创建时间: nowStamp() }));
      else if(cur) Object.assign(cur, payload);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    /** 仪器维修（简易版）：新增进维修单 Tab；维修处理确认后进已完成；仪器名称 / 类型 / 存放位置跟随仪器台账 */
    const WX_PAGE = 'np-0307-01';
    const WX_INST_KEYS = ['仪器编号','仪器名称','仪器类型','存放位置'];
    const WX_PROCESS_KEYS = ['维修时间','维修结果','维修描述','附件'];
    function wxRows(){
      const bag = (MOCK[WX_PAGE] = MOCK[WX_PAGE] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function wxStatusOf(r){
      if(String((r||{})['单据状态']||'').trim()==='已完成') return '已完成';
      return String((r||{})['维修结果'] || '').trim() ? '已完成' : '待处理';
    }
    function wxRepairState(r){
      const s = String((r||{})['维修状态']||'').trim();
      return s==='维修中' ? '维修中' : '待发起';
    }
    function nextWxNo(){
      const seq = wxRows().reduce((m, r)=> Math.max(m, parseInt(r['维修单号'], 10) || 0), 0) + 1;
      return String(seq).padStart(6, '0');
    }
    function wxDoneState(r){
      return String((r||{})['维修状态']||'').trim()==='已关闭' ? '已关闭' : '已完成';
    }
    function wxView(r){
      const inst = djInstruments().find(x=> x.id===r._instId) || {};
      const v = { ...r };
      WX_INST_KEYS.forEach(k=>{ v[k] = inst[k] || r[k] || ''; });
      v['单据状态'] = wxStatusOf(r);
      v['维修状态'] = v['单据状态']==='已完成' ? wxDoneState(r) : wxRepairState(r);
      return v;
    }
    function wxQueryRows(){
      const want = activeTab.value==='tab-2' ? '已完成' : '待处理';
      let l = applyContainsExactQuery(wxRows().map(wxView).filter(r=> r['单据状态']===want), query, ['维修单号','仪器编号','仪器名称','仪器类型','存放位置','创建人'], ['问题类型']);
      ['维修时间','创建时间'].forEach(k=>{ l = applyDateRangeQuery(l, query, k); });
      return sortByCreateTimeDesc(l);
    }
    function saveWxForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const isAdd = formMode.value!=='edit';
      if(!txt('维修单号')){ ElMessage.warning('请刷新生成维修单号'); return; }
      if(!formModel._instId){ ElMessage.warning('请选择仪器编号'); return; }
      if(!txt('问题类型')){ ElMessage.warning('请选择问题类型'); return; }
      const list = wxRows();
      const inst = djInstruments().find(x=> x.id===formModel._instId) || {};
      const payload = { _instId: formModel._instId };
      WX_INST_KEYS.forEach(k=>{ payload[k] = inst[k] || txt(k); });
      ['问题类型','问题描述','问题附件','备注'].forEach(k=>{ payload[k] = txt(k); });
      if(isAdd){
        let no = txt('维修单号');
        if(list.some(r=> r['维修单号']===no)) no = nextWxNo();
        const blank = {};
        WX_PROCESS_KEYS.forEach(k=>{ blank[k] = ''; });
        list.unshift(Object.assign({ id: 'wx-'+Date.now(), 维修单号: no, 单据状态: '待处理', 维修状态: '待发起', 完成时间: '', 关闭时间: '' }, blank, payload, { 创建人: CI_OPERATOR, 创建时间: nowStamp() }));
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑的维修单'); return; }
        if(wxStatusOf(cur)==='已完成'){ ElMessage.warning('已完成的维修单不可编辑'); return; }
        Object.assign(cur, payload);
      }
      formVisible.value = false;
      activeTab.value = 'tab-1';
      bumpStore();
      ElMessage.success('保存成功');
    }
    function confirmWxLaunch(row){
      const cur = wxRows().find(r=> r.id===row.id);
      if(!cur || wxStatusOf(cur)==='已完成'){ ElMessage.warning('已完成的维修单不可发起'); return; }
      if(wxRepairState(cur)!=='待发起'){ ElMessage.warning('仅待发起的维修单可确认发起'); return; }
      cur['维修状态'] = '维修中';
      bumpStore();
      ElMessage.success('已确认发起，维修状态变为维修中');
    }
    function openWxProcess(row){
      const src = wxRows().find(r=> r.id===row.id) || row;
      if(wxStatusOf(src)==='已完成'){ ElMessage.warning('该维修单已完成'); return; }
      if(wxRepairState(src)!=='维修中'){ ElMessage.warning('请先确认发起，维修状态变为维修中后再处理'); return; }
      const view = wxView(src);
      const fields = (page.value && page.value.processFields) || [
        { name:'维修时间', type:'date', required:true, placeholder:'下拉，年月日' },
        { name:'维修结果', type:'textarea', required:true, placeholder:'输入' },
        { name:'维修描述', type:'textarea', placeholder:'输入' },
        { name:'附件', type:'upload' },
      ];
      openProcDlg({
        title:'维修处理',
        okText:'确认',
        keys:['维修单号','仪器编号','仪器名称','存放位置','问题类型','问题描述'],
        full:['问题描述'],
        fields,
        onSubmit: submitWxProcess,
      }, view);
      fields.forEach(f=>{
        if(f.type==='upload') return;
        procForm.values[f.name] = src[f.name] || (f.type==='date' ? nowStamp().slice(0,10) : '');
      });
      const att = String(src['附件']||'').trim();
      procForm.files = att && att!=='—' ? att.split(/[、,，]/).map(n=> n.trim()).filter(Boolean).map(name=> ({ name })) : [];
    }
    function submitWxProcess(row, _desc, files, vals){
      const cur = wxRows().find(r=> r.id===row.id);
      if(!cur){ ElMessage.warning('未找到维修单'); return; }
      Object.assign(cur, {
        维修时间: vals['维修时间'] || '',
        维修结果: vals['维修结果'] || '',
        维修描述: vals['维修描述'] || '',
        附件: (files && files!=='—') ? files : '',
        单据状态: '已完成',
        维修状态: '已完成',
        完成时间: nowStamp(),
      });
      activeTab.value = 'tab-2';
      ElMessage.success('维修处理已确认，单据进入已完成');
    }
    const canCloseWx = computed(()=>{
      if(pageId.value!==WX_PAGE || !selectedIds.value.length) return false;
      const ids = new Set(selectedIds.value);
      return wxRows().filter(r=> ids.has(r.id)).every(r=> wxStatusOf(r)!=='已完成' && wxRepairState(r)==='待发起');
    });
    function closeWxRows(){
      const ids = new Set(selectedIds.value);
      const rows = wxRows().filter(r=> ids.has(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(!canCloseWx.value){ ElMessage.warning('仅维修状态为「待发起」的维修单可关闭'); return; }
      ElementPlus.ElMessageBox.confirm('确认关闭所选的 '+rows.length+' 张维修单？关闭后进入已完成。', '关闭', { type:'warning' }).then(()=>{
        const closedAt = nowStamp();
        rows.forEach(r=>{ r['单据状态'] = '已完成'; r['维修状态'] = '已关闭'; r['关闭时间'] = closedAt; });
        selectedIds.value = [];
        activeTab.value = 'tab-2';
        bumpStore();
        ElMessage.success('已关闭 '+rows.length+' 张维修单，单据进入已完成');
      }).catch(()=>{});
    }
    function deleteWxRows(){
      const ids = new Set(selectedIds.value);
      const rows = wxRows().filter(r=> ids.has(r.id));
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(!canCloseWx.value){ ElMessage.warning('仅维修状态为「待发起」的维修单可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+rows.length+' 张维修单？删除后不可恢复。', '删除确认', {
        confirmButtonText:'确认删除', cancelButtonText:'取消', type:'warning'
      }).then(()=>{
        const bag = MOCK[WX_PAGE] = MOCK[WX_PAGE] || { main: [] };
        bag.main = (bag.main || []).filter(r=> !ids.has(r.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 条数据');
      }).catch(()=>{});
    }
    /** 故障报修（复杂版）：一张报修单对应一台仪器；处理 / 维修 / 验收字段由下游单据反写最新一次数据，_flow 记录流转履历 */
    const BX_PAGE = 'np-0308-01';
    /** 经验库：适用仪器类型 / 适用故障类型多选，以「，」拼接；故障类型名称本身可能含「、」，不能用 splitDun 拆分 */
    const BX_EXP_PAGE = 'np-0308-06';
    function splitComma(v){
      if(Array.isArray(v)) return v.slice();
      return String(v==null?'':v).split(/[，,]/).map(s=>s.trim()).filter(Boolean);
    }
    function expRows(){
      const bag = (MOCK[BX_EXP_PAGE] = MOCK[BX_EXP_PAGE] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function nextExpNo(list){
      const seq = list.reduce((m, r)=> Math.max(m, parseInt(String(r['经验编码']||'').replace(/\D/g, ''), 10) || 0), 0);
      return 'YQJY'+String(seq + 1).padStart(8, '0');
    }
    function expFaultOptions(){
      storeTick.value;
      const types = new Set(splitDun(formModel['适用仪器类型']));
      return (((MOCK[FAULT_TYPE_PAGE]||{}).main)||[]).filter(r=> r['启用状态']==='启用')
        .filter(r=> !types.size || splitDun(r['适用仪器类型']).some(t=> t==='通用' || types.has(t)))
        .map(r=> r['故障类型名称']);
    }
    function saveExpForm(){
      const txt = k=> { const v = String(formModel[k]==null ? '' : formModel[k]).trim(); return v==='—' ? '' : v; };
      const its = splitComma(formModel['适用仪器类型']), fts = splitComma(formModel['适用故障类型']);
      if(!txt('故障描述')){ ElMessage.warning('请输入故障描述'); return; }
      if(!its.length){ ElMessage.warning('请选择适用仪器类型'); return; }
      if(!fts.length){ ElMessage.warning('请选择适用故障类型'); return; }
      const list = expRows();
      const payload = { 故障描述: txt('故障描述'), 维修过程说明: txt('维修过程说明'), 仪器故障分析: txt('仪器故障分析'), 附件: txt('附件'),
        适用仪器类型: its.join('，'), 适用故障类型: fts.join('，'), 备注: txt('备注'), 启用状态: formSwitch['启用状态']===false ? '禁用' : '启用' };
      if(formMode.value==='edit'){
        const cur = list.find(r=> r.id===formModel._editId);
        if(cur) Object.assign(cur, payload);
      } else {
        list.unshift(Object.assign({ id: 'jy-'+Date.now(), 经验编码: nextExpNo(list) }, payload, { 被引用次数: 0, 创建人: CI_OPERATOR, 创建时间: nowStamp() }));
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    const BX_OPEN = ['待处理','维修中','验收中'];
    const BX_INST_KEYS = ['使用状态','仪器编号','仪器名称','仪器条码','仪器类型','规格型号','存放位置','责任部门','责任人'];
    const BX_FAULT_KEYS = ['故障类型','故障描述','故障图片','故障时间','期望完成时间','紧急程度','报修地点'];
    const BX_DETAIL = [
      ['仪器信息', ['仪器编号','仪器名称','仪器条码','仪器类型','规格型号','存放位置','责任部门','责任人']],
      ['故障内容', ['单据状态','报修单号','故障类型','故障描述','故障图片','故障时间','期望完成时间','紧急程度','报修地点','报修时间','报修人']],
      ['处理内容', ['处理方式','故障类型（维修单）','紧急程度（维修单）','维保班组（维修单）','预计维修完成时间','处理时间','处理人','处理备注']],
      ['维修内容', ['维修结果','维修过程说明','仪器故障分析','维修说明','维修图片','维修完成时间','维修人']],
      ['验收内容', ['验收结果','验收说明','验收图片','验收时间','验收操作人']]
    ];
    const PART_SEC = ['备件消耗', ['备件编码','备件名称','备件规格','备件种类','计量单位','消耗数量']];
    const BX_DETAIL_FULL = BX_DETAIL.slice(0, 4).concat([PART_SEC], BX_DETAIL.slice(4));
    const BX_FILE_KEYS = ['故障图片','维修图片','验收图片'];
    const BX_TAG_KEYS = ['单据状态','紧急程度','验收结果'];
    const BX_FLOW_INFO = {
      故障报修: ['故障描述','报修单号'], 报修处理: ['维修方式','处理说明','报修单号'], 维修工单: ['维修结果','维修说明','维修单号'],
      仪器验收: ['验收结果','验收说明','维修单号'], 已关闭: ['关闭说明','报修单号'], 结单: [],
      手动新增: ['故障描述','维修单号'], 维修单关闭: ['维修单号'], 维修单删除: ['维修单号']
    };
