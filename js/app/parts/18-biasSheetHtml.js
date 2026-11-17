    function biasSheetHtml(s){
      const td = (k, v, extra)=> '<tr><td style="border:1px solid #222;padding:3px 6px;width:92px">'+qcEsc(k)+'</td><td style="border:1px solid #222;padding:3px 6px;text-align:right;'+ (extra||'') +'">'+qcEsc(v)+'</td></tr>';
      const block = (title, rows)=> (title ? '<div style="font-weight:700;margin:8px 0 2px">'+title+'</div>' : '') + '<table style="border-collapse:collapse;width:210px">'+rows+'</table>';
      const left = block('', td('基准值', s.ref, 'background:#7fd4ee;text-align:center'))
        + block('统计量', s.stats.map(r=> td(r.k, r.v)).join(''))
        + block('直方图', s.hist.map(r=> td(r.k, r.v, r.cyan ? 'background:#7fd4ee;text-align:center' : '')).join(''))
        + block('判断', td('显著性水平', '0.05', 'background:#7fd4ee;text-align:center'))
        + block('查表', s.lookup.map(r=> td(r.k, r.v)).join(''))
        + block('计算', s.calc.map(r=> td(r.k, r.v, r.bad ? 'color:#e11d2e;font-weight:700' : (r.ok ? 'color:#15803d;font-weight:700' : ''))).join(''));
      const mid = '<table style="border-collapse:collapse"><tr><th style="border:1px solid #222;padding:3px 8px">序号</th><th style="border:1px solid #222;padding:3px 8px">测试数据</th><th style="border:1px solid #222;padding:3px 8px">偏倚</th><th style="border:1px solid #222;padding:3px 8px">分组界限</th><th style="border:1px solid #222;padding:3px 8px">频数</th></tr>'
        + s.rows.map(r=> '<tr><td style="border:1px solid #222;padding:2px 8px;text-align:center">'+r.no+'</td><td style="border:1px solid #222;padding:2px 8px;text-align:right">'+qcEsc(r.x)+'</td><td style="border:1px solid #222;padding:2px 8px;text-align:right">'+qcEsc(r.bias)+'</td><td style="border:1px solid #222;padding:2px 8px;text-align:right">'+qcEsc(r.edge)+'</td><td style="border:1px solid #222;padding:2px 8px;text-align:center">'+qcEsc(r.freq)+'</td></tr>').join('')
        + '</table>';
      const max = Math.max(1, ...s.chart.bars.map(b=> b.count));
      const bars = s.chart.bars.map(b=> '<td style="vertical-align:bottom;text-align:center;padding:0 4px"><div>'+b.count+'</div><div style="height:'+Math.max(4, Math.round(b.count / max * 140))+'px;background:#3b82c4"></div><div style="font-size:10px">'+qcEsc(b.label)+'</div></td>').join('');
      const head = s.head.map(h=> qcEsc(h.k)+'：'+(h.line ? '<u>'+qcEsc(h.v)+'</u>' : qcEsc(h.v))).join('&nbsp;&nbsp;&nbsp;&nbsp;');
      return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>偏倚分析</title></head><body style="font-family:Microsoft YaHei,sans-serif;font-size:12px;color:#111"><div style="font-size:14px;margin-bottom:12px">'+head+'</div><table><tr><td style="vertical-align:top">'+left+'</td><td style="vertical-align:top;padding-left:12px">'+mid+'</td><td style="vertical-align:top;padding-left:12px"><div style="text-align:center;font-weight:700;font-size:16px">偏倚分析直方图</div><table><tr>'+bars+'</tr></table><div style="text-align:center">测量值</div></td></tr></table></body></html>';
    }
    function openBiasFiles(){
      const p = biasPlanOf(biasAn.id);
      biasFileNo.value = p ? p['计划单号'] : '';
      biasFilesVisible.value = true;
    }
    function openBiasPreview(){
      const p = biasPlanOf(biasAn.id);
      if(!p){ ElMessage.warning('未找到计划'); return; }
      const sheet = biasBuildSheet(p);
      if(!sheet){ ElMessage.warning('测量值不完整，无法预览'); return; }
      Object.assign(biasPv, { visible: true, sheet, html: biasSheetHtml(sheet), name: '偏倚报告_'+p['计划单号']+'.doc' });
    }

    const ABILITY_PAGE = 'np-0407-01';
    const ABILITY_WEIGHTS = ['自评权重%','他评权重%','上级评权重%'];
    function saveAbilityForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const code = txt('能力编码'), name = txt('能力名称');
      if(!code){ ElMessage.warning('请输入能力编码'); return; }
      if(!name){ ElMessage.warning('请输入能力名称'); return; }
      for(const w of ABILITY_WEIGHTS){
        if(!txt(w)){ ElMessage.warning('请输入'+w.replace('%','')); return; }
        if(!/^\d+(\.\d+)?$/.test(txt(w))){ ElMessage.warning(w.replace('%','')+'须为数字'); return; }
      }
      const sum = ABILITY_WEIGHTS.reduce((s, w)=> s + Number(txt(w)), 0);
      if(Math.abs(sum - 100) > 1e-6){ ElMessage.warning('自评+他评+上级权重之和必须等于100，当前为 '+sum); return; }
      const list = (MOCK[ABILITY_PAGE] = MOCK[ABILITY_PAGE] || { main: [] }).main || (MOCK[ABILITY_PAGE].main = []);
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r['能力编码']===code)){ ElMessage.warning('能力编码已存在'); return; }
      if(others.some(r=> r['能力名称']===name)){ ElMessage.warning('能力名称已存在'); return; }
      const payload = { 能力编码: code, 能力名称: name, 备注: txt('备注'), 启用状态: formSwitch['启用状态']===false ? '禁用' : '启用' };
      ABILITY_WEIGHTS.forEach(w=>{ payload[w] = String(Number(txt(w))); });
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(isAdd) list.unshift(Object.assign({ id: 'abm-'+Date.now() }, payload, { 创建人:'管理员', 创建时间: nowStamp() }));
      else if(cur) Object.assign(cur, payload);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    const PERSON_PAGE = 'np-0407-02';
    const PERSON_USER_KEYS = ['姓名','岗位','角色','部门','邮箱','电话'];
    const PERSON_EXTRA_USERS = [
      { 编码:'YH-104', 姓名:'林可欣', 岗位:'分析实验员', 角色:'分析操作', 部门:'电子气分析班组', 邮箱:'linkexin@yujigroup.com', 电话:'13900001104' },
      { 编码:'YH-105', 姓名:'沈嘉禾', 岗位:'分析实验员', 角色:'分析操作', 部门:'电子气分析班组', 邮箱:'shenjiahe@yujigroup.com', 电话:'13900001105' },
      { 编码:'YH-106', 姓名:'田雨泽', 岗位:'分析实验员', 角色:'分析操作', 部门:'工业气分析班组', 邮箱:'tianyuze@yujigroup.com', 电话:'13900001106' },
      { 编码:'YH-107', 姓名:'白若曦', 岗位:'分析工程师', 角色:'分析工程师', 部门:'工业气分析班组', 邮箱:'bairuoxi@yujigroup.com', 电话:'13900001107' },
    ];
    function personRows(){
      const bag = (MOCK[PERSON_PAGE] = MOCK[PERSON_PAGE] || { main: [] });
      return bag.main || (bag.main = []);
    }
    let personUserCache = null;
    function personSysUsers(){
      if(!personUserCache){
        const map = new Map();
        personRows().forEach(r=>{
          const code = r['编码'] || r['工号'];
          if(code && !map.has(code)) map.set(code, Object.assign({ 编码: code }, ...PERSON_USER_KEYS.map(k=> ({ [k]: r[k]||'' }))));
        });
        PERSON_EXTRA_USERS.forEach(u=>{ if(!map.has(u.编码)) map.set(u.编码, u); });
        personUserCache = [...map.values()];
      }
      return personUserCache;
    }
    function personUserOptions(){
      const used = new Set(personRows().filter(r=> formMode.value==='edit' ? r.id!==formModel._editId : true).map(r=> r['编码']));
      return personSysUsers().filter(u=> !used.has(u.编码)).map(u=> ({ value: u.编码, label: u.编码 + ' / ' + u.姓名 }));
    }
    function onPersonUserChange(){
      const u = personSysUsers().find(x=> x.编码===formModel['编码']);
      formModel['工号'] = u ? u.编码 : '';
      PERSON_USER_KEYS.forEach(k=>{ formModel[k] = u ? (u[k]||'') : ''; });
    }
    function abilityModelRow(name){
      return (((MOCK[ABILITY_PAGE]||{}).main)||[]).find(r=> r['能力名称']===name);
    }
    function personAbilityOptions(row){
      const taken = new Set((formLineRows.value||[]).filter(r=> r!==row).map(r=> r['能力名称']).filter(Boolean));
      return (((MOCK[ABILITY_PAGE]||{}).main)||[]).filter(r=> r['启用状态']!=='禁用' && !taken.has(r['能力名称'])).map(r=> r['能力名称']);
    }
    function personAbilityValue(row){
      const m = abilityModelRow(row['能力名称']);
      const nums = ['自评','他评','上级评'].map(k=> String(row[k]==null ? '' : row[k]).trim());
      if(!m || nums.some(v=> !/^\d+(\.\d+)?$/.test(v))) return '';
      const v = nums.reduce((s, n, i)=> s + Number(n) * Number(m[ABILITY_WEIGHTS[i]]||0) / 100, 0);
      return String(Math.round(v * 100) / 100);
    }
    function emptyPersonAbility(){
      return { 能力名称:'', 自评:'', 他评:'', 上级评:'', 能力值:'', 岗位实际技能素质:'0级', 备注:'' };
    }
    function savePersonForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const code = txt('编码'), no = txt('工号');
      if(!code){ ElMessage.warning('请选择编码'); return; }
      if(!no){ ElMessage.warning('请输入工号'); return; }
      if(!txt('姓名')){ ElMessage.warning('姓名未代入，请重新选择编码'); return; }
      if(!txt('在职状态')){ ElMessage.warning('请选择在职状态'); return; }
      const list = personRows();
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r['编码']===code)){ ElMessage.warning('该人员已建档'); return; }
      if(others.some(r=> r['工号']===no)){ ElMessage.warning('工号已存在'); return; }
      const lines = formLineRows.value || [];
      for(let i=0; i<lines.length; i++){
        const r = lines[i], at = '能力详情第 '+(i+1)+' 行：';
        if(!r['能力名称']){ ElMessage.warning(at+'请选择能力名称'); return; }
        for(const k of ['自评','他评','上级评']){
          const v = String(r[k]==null ? '' : r[k]).trim();
          if(!v){ ElMessage.warning(at+'请输入'+k); return; }
          if(!/^\d+(\.\d+)?$/.test(v)){ ElMessage.warning(at+k+'须为数字'); return; }
        }
        if(!r['岗位实际技能素质']){ ElMessage.warning(at+'请选择岗位实际技能素质'); return; }
      }
      const names = lines.map(r=> r['能力名称']);
      if(new Set(names).size !== names.length){ ElMessage.warning('能力名称不可重复'); return; }
      const payload = { 编码: code, 工号: no, 入职日期: txt('入职日期'), 电子签名: txt('电子签名'), 在职状态: txt('在职状态'),
        学历: txt('学历'), 附件: txt('附件'), 备注: txt('备注'), 启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
        _abilities: lines.map(r=> ({ 能力名称: r['能力名称'], 自评: String(r['自评']).trim(), 他评: String(r['他评']).trim(), 上级评: String(r['上级评']).trim(),
          能力值: personAbilityValue(r), 岗位实际技能素质: r['岗位实际技能素质'], 备注: String(r['备注']||'').trim() })) };
      PERSON_USER_KEYS.forEach(k=>{ payload[k] = txt(k); });
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(isAdd) list.unshift(Object.assign({ id: 'psn-'+Date.now() }, payload, { 创建人:'管理员', 创建时间: nowStamp() }));
      else if(cur) Object.assign(cur, payload);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    const TRAIN_PAGE = 'np-0407-03';
    const EXPIRY_PAGES = { 'np-0401-03':'试剂', 'np-0402-05':'试液', 'np-0403-04':'标准物质', 'np-0404-04':'留样', 'np-0413-04':'耗材' };
    /** 基础数据 · 实验室资料：配液/标定模板设置（头信息 + 是否记录 Tab；标定另有计算参数 Tab） */
    const TPL_TAB_DEFS = {
      dev: { key:'dev', label:'设备信息', flag:'是否记录设备', title:'设备信息设置', store:'_devFields' },
      std: { key:'std', label:'标定物信息', flag:'是否记录标定物', title:'标定物信息设置', store:'_stdFields' },
      env: { key:'env', label:'环境参数', flag:'是否记录环境', title:'环境参数设置', store:'_envFields' },
    };
    const TPL_PAGES = {
      'prep-template': { kind:'配液模板', tabs:['dev','env'] },
      'calib-template': { kind:'标定模板', tabs:['dev','std','env'], calc:true },
    };
    const TPL_CALC_KEYS = ['是否使用公用参数','公用测试次数','是否使用样本参数','样本测试次数','结果值参考参数','单人极差符号','单人测试相对极差合格标准','多人极差符号','多人最终相对极差合格标准'];
    const tplFormTab = ref('dev');
    const tplRows = reactive({ dev: [], std: [], env: [] });
    const tplSel = reactive({ dev: [], std: [], env: [] });
    const tplKind = computed(()=> (TPL_PAGES[pageId.value]||{}).kind || '');
    const tplTabs = computed(()=> ((TPL_PAGES[pageId.value]||{}).tabs||[]).map(k=> TPL_TAB_DEFS[k]));
    const tplCalc = computed(()=> !!(TPL_PAGES[pageId.value]||{}).calc);
    const isTplForm = computed(()=> !!tplKind.value && ['add','edit','copy','detail'].includes(formMode.value));
    const tplRefParamOptions = computed(()=>{
      const rows = [];
      if(formModel['是否使用公用参数']==='是') rows.push(...(inspMethodPublicParams.value||[]));
      if(formModel['是否使用样本参数']==='是') rows.push(...(inspMethodSampleParams.value||[]));
      return [...new Set(rows.map(r=> r['参数名称']).filter(Boolean))];
    });
    function emptyTplRow(){ return { 字段名称:'', 是否必填:'必填', 字段属性:'输入', 枚举内容:'' }; }
    function resetTplForm(row){
      tplFormTab.value = 'dev';
      Object.values(TPL_TAB_DEFS).forEach(t=>{
        formModel[t.flag] = (row && row[t.flag]) || '否';
        tplRows[t.key] = ((row && row[t.store]) || []).map(r=> Object.assign(emptyTplRow(), r));
        tplSel[t.key] = [];
      });
      if(!tplCalc.value) return;
      const v = k=> (row && row[k]!=null) ? row[k] : '';
      TPL_CALC_KEYS.forEach(k=>{ formModel[k] = v(k); });
      formModel['是否使用公用参数'] = v('是否使用公用参数') || '否';
      formModel['是否使用样本参数'] = v('是否使用样本参数') || '是';
      formModel['样本测试次数'] = v('样本测试次数')==='' ? undefined : Number(v('样本测试次数'));
      formModel['单人极差符号'] = v('单人极差符号') || '≤';
      formModel['多人极差符号'] = v('多人极差符号') || '≤';
      inspMethodPublicParams.value = ((row && row._pubParams) || []).map(cloneInspMethodParamRow);
      inspMethodSampleParams.value = ((row && row._sampParams) || []).map(cloneInspMethodParamRow);
      inspMethodPublicSelected.value = [];
      inspMethodSampleSelected.value = [];
    }
    function onTplFlagChange(t){
      if(formModel[t.flag]==='是' && !tplRows[t.key].length) tplRows[t.key] = [emptyTplRow()];
    }
    function onTplPubTimesChange(v){
      if(v==='同测试次数') formModel['是否使用样本参数'] = '是';
    }
    function addTplRow(key){ tplRows[key] = tplRows[key].concat([emptyTplRow()]); }
    function removeTplRows(key){
      const set = new Set(tplSel[key]||[]);
      if(!set.size){ ElMessage.warning('请先勾选要删除的行'); return; }
      tplRows[key] = tplRows[key].filter(r=> !set.has(r));
      tplSel[key] = [];
    }
    function onTplAttrChange(row){ if(row['字段属性']!=='枚举') row['枚举内容'] = ''; }
    function openTplDetail(row){
      openForm('detail');
      formSwitch['启用状态'] = row['启用状态']!=='禁用';
      [tplKind.value+'编码', tplKind.value+'名称', '备注'].forEach(k=>{ formModel[k] = row[k]||''; });
      formModel._editId = row.id;
      resetTplForm(row);
    }
    function validateTplCalc(){
      const fail = msg=>{ tplFormTab.value = 'calc'; ElMessage.warning(msg); return null; };
      const usePub = formModel['是否使用公用参数']==='是', useSamp = formModel['是否使用样本参数']==='是';
      if(!usePub && !useSamp) return fail('是否使用公用参数、是否使用样本参数至少一个为「是」');
      if(usePub && !formModel['公用测试次数']) return fail('请选择公用参数测试次数');
      if(usePub && !(inspMethodPublicParams.value||[]).length) return fail('请添加公用参数');
      if(formModel['公用测试次数']==='同测试次数' && !useSamp) return fail('公用参数测试次数为「同测试次数」时，是否使用样本参数只能为「是」');
      if(useSamp){
        const t = Number(formModel['样本测试次数']);
        if(!(t>0) || !Number.isInteger(t)) return fail('请输入大于 0 的整数作为样本参数测试次数');
        if(!(inspMethodSampleParams.value||[]).length) return fail('请添加样本参数');
      }
      const ref = formModel['结果值参考参数'];
      if(ref && !tplRefParamOptions.value.includes(ref)) return fail('结果值参考参数须从已添加的参数中选择');
      for(const [k, label] of [['单人测试相对极差合格标准','单人测试相对极差合格标准'],['多人最终相对极差合格标准','多人最终相对极差合格标准']]){
        const s = String(formModel[k]==null ? '' : formModel[k]).trim();
        if(s && !/^\d+(\.\d+)?$/.test(s)) return fail(label+'须为数字');
      }
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      return {
        是否使用公用参数: formModel['是否使用公用参数'], 公用测试次数: usePub ? formModel['公用测试次数'] : '',
        _pubParams: usePub ? inspMethodPublicParams.value.map(cloneInspMethodParamRow) : [],
        是否使用样本参数: formModel['是否使用样本参数'], 样本测试次数: useSamp ? String(Number(formModel['样本测试次数'])) : '',
        _sampParams: useSamp ? inspMethodSampleParams.value.map(cloneInspMethodParamRow) : [],
        结果值参考参数: ref || '',
        单人极差符号: formModel['单人极差符号'], 单人测试相对极差合格标准: txt('单人测试相对极差合格标准'),
        多人极差符号: formModel['多人极差符号'], 多人最终相对极差合格标准: txt('多人最终相对极差合格标准'),
      };
    }
    function saveTplForm(){
      const K = tplKind.value;
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const code = txt(K+'编码'), name = txt(K+'名称');
      if(!code){ ElMessage.warning('请输入'+K+'编码'); return; }
      if(!name){ ElMessage.warning('请输入'+K+'名称'); return; }
      const lines = {};
      for(const t of tplTabs.value){
        if(!formModel[t.flag]){ tplFormTab.value = t.key; ElMessage.warning('请选择'+t.flag); return; }
        const rows = formModel[t.flag]==='是' ? tplRows[t.key] : [];
        if(formModel[t.flag]==='是' && !rows.length){ tplFormTab.value = t.key; ElMessage.warning(t.title+'至少添加一行'); return; }
        for(let i=0; i<rows.length; i++){
          const r = rows[i], at = t.title+'第 '+(i+1)+' 行：';
          if(!String(r['字段名称']||'').trim()){ tplFormTab.value = t.key; ElMessage.warning(at+'请输入字段名称'); return; }
          if(r['字段属性']==='枚举'){
            const en = String(r['枚举内容']||'').trim();
            if(!en){ tplFormTab.value = t.key; ElMessage.warning(at+'字段属性为枚举时，请输入枚举内容'); return; }
            if(en.includes('，')){ tplFormTab.value = t.key; ElMessage.warning(at+'枚举内容请用英文逗号拼接'); return; }
          }
        }
        const names = rows.map(r=> String(r['字段名称']).trim());
        if(new Set(names).size !== names.length){ tplFormTab.value = t.key; ElMessage.warning(t.title+'中字段名称不可重复'); return; }
        lines[t.store] = rows.map(r=> ({ 字段名称: String(r['字段名称']).trim(), 是否必填: r['是否必填'], 字段属性: r['字段属性'], 枚举内容: r['字段属性']==='枚举' ? String(r['枚举内容']).trim() : '' }));
        lines[t.flag] = formModel[t.flag];
      }
      if(tplCalc.value){
        const calc = validateTplCalc();
        if(!calc) return;
        Object.assign(lines, calc);
      }
      const list = (MOCK[pageId.value] = MOCK[pageId.value] || { main: [] }).main || (MOCK[pageId.value].main = []);
      const others = list.filter(r=> isAdd || r.id!==formModel._editId);
      if(others.some(r=> r[K+'编码']===code)){ ElMessage.warning(K+'编码已存在'); return; }
      if(others.some(r=> r[K+'名称']===name)){ ElMessage.warning(K+'名称已存在'); return; }
      const payload = Object.assign({ [K+'编码']: code, [K+'名称']: name, 备注: txt('备注'), 启用状态: formSwitch['启用状态']===false ? '禁用' : '启用' }, lines);
      const cur = isAdd ? null : list.find(r=> r.id===formModel._editId);
      if(isAdd) list.unshift(Object.assign({ id: 'tpl-'+Date.now() }, payload, { 创建人:'管理员', 创建时间: nowStamp() }));
      else if(cur) Object.assign(cur, payload);
      formVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    function saveTrainForm(){
      const txt = k=> String(formModel[k]==null ? '' : formModel[k]).trim();
      const isAdd = formMode.value==='add' || formMode.value==='copy';
      const types = Array.isArray(formModel['培训类型']) ? formModel['培训类型'].filter(Boolean) : splitDun(formModel['培训类型']);
      if(!types.length){ ElMessage.warning('请选择培训类型'); return; }
      if(!txt('培训内容')){ ElMessage.warning('请输入培训内容'); return; }
      if(!txt('培训时间')){ ElMessage.warning('请选择培训时间'); return; }
      const lines = formLineRows.value || [];
      if(!lines.length){ ElMessage.warning('请添加培训人员'); return; }
      const codes = lines.map(r=> r['工号']);
      if(new Set(codes).size !== codes.length){ ElMessage.warning('培训人员工号不可重复'); return; }
      const head = { 培训类型: types.join('、'), 培训内容: txt('培训内容'), 培训时间: txt('培训时间'), 培训地点: txt('培训地点'), 备注: txt('备注') };
      const lineData = r=> ({ 工号: r['工号'], 姓名: r['姓名'], 部门: r['部门'], 培训结果: String(r['培训结果']||'').trim(), 附件: r['附件']||'' });
      const list = (MOCK[TRAIN_PAGE] = MOCK[TRAIN_PAGE] || { main: [] }).main || (MOCK[TRAIN_PAGE].main = []);
      if(isAdd){
        const stamp = nowStamp(), seed = Date.now();
        lines.slice().reverse().forEach((r, i)=> list.unshift(Object.assign({ id: 'trn-'+seed+'-'+i }, lineData(r), head, { 创建人:'管理员', 创建时间: stamp })));
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(cur) Object.assign(cur, lineData(lines[0]), head);
      }
      formVisible.value = false;
      bumpStore();
      ElMessage.success(isAdd ? '保存成功，已生成 '+lines.length+' 条培训记录' : '保存成功');
    }
    /** 人员管理 · 测试能力矩阵：人员档案（行）× 能力模型（列）实时生成 */
    const MATRIX_PAGE = 'np-0407-04';
    const MATRIX_DIMS = ['自评','他评','上级评'];
    function matrixWeights(){
      const bag = (MOCK[MATRIX_PAGE] = MOCK[MATRIX_PAGE] || {});
      return bag.weightCfg || { 自评:0, 他评:0, 上级评:100 };
    }
    function matrixAbilities(){
      return ((((MOCK[ABILITY_PAGE]||{}).main)||[]).filter(r=> r['启用状态']!=='禁用'))
        .slice().sort((a, b)=> (Number(a['能力编码'])||0) - (Number(b['能力编码'])||0));
    }
    const matrixNum = v=> (Math.round(v * 100) / 100).toFixed(2);
    function matrixRows(){
      const abs = matrixAbilities(), w = matrixWeights();
      const persons = sortByCreateTimeDesc(personRows().filter(r=> r['启用状态']!=='禁用'));
      return persons.map(p=>{
        const own = new Map((p._abilities||[]).map(a=> [a['能力名称'], a]));
        const row = { id: 'mx-'+p.id, 工号: p['工号'], 姓名: p['姓名'], 部门: p['部门'], '姓名/能力': (p['部门']||'') + ' - ' + (p['姓名']||'') };
        const sum = { 自评:0, 他评:0, 上级评:0 };
        abs.forEach((m, i)=>{
          const a = own.get(m['能力名称']) || {};
          let val = 0;
          MATRIX_DIMS.forEach((d, j)=>{
            const n = Number(a[d]) || 0;
            sum[d] += n;
            val += n * (Number(m[ABILITY_WEIGHTS[j]]) || 0) / 100;
            row['ab'+i+'_'+d] = matrixNum(n);
          });
          row['ab'+i+'_能力值'] = matrixNum(val);
        });
        MATRIX_DIMS.forEach(d=>{ row['sum_'+d] = matrixNum(sum[d]); });
        row['累计加权均值'] = matrixNum(MATRIX_DIMS.reduce((s, d)=> s + sum[d] * (Number(w[d]) || 0) / 100, 0));
        return row;
      });
    }
    function matrixColumns(){
      const w = matrixWeights();
      const picked = Array.isArray(query['能力名称']) ? query['能力名称'] : [];
      const cols = [
        { type:'checkbox', width:48, fixed:'left' },
        { type:'seq', title:'序号', width:60, fixed:'left' },
        { field:'姓名/能力', title:'姓名/能力', minWidth:200, fixed:'left', diag:['能力名称','姓名'] },
        { field:'累计加权均值', title:'累计加权均值', minWidth:120 },
        { title:'单项累计', children: MATRIX_DIMS.map(d=> ({ field:'sum_'+d, title:d+'('+(Number(w[d])||0)+'%)', minWidth:100 })) },
      ];
      matrixAbilities().forEach((m, i)=>{
        if(picked.length && !picked.includes(m['能力名称'])) return;
        cols.push({ title: m['能力名称'], children: MATRIX_DIMS.map((d, j)=> ({ field:'ab'+i+'_'+d, title:d+'('+(Number(m[ABILITY_WEIGHTS[j]])||0)+'%)', minWidth:100 })).concat([{ field:'ab'+i+'_能力值', title:'能力值', minWidth:90 }]) });
      });
      return cols;
    }
    /** 人员管理 · 素质能力矩阵：按人员档案「岗位实际技能素质」显示等级图标 */
    const QUALITY_PAGE = 'np-0407-05';
    const QUALITY_LEVELS = ['完全不了解','了解','可在指导下工作','可独立开展工作','能指导/培训他人'];
    const QUALITY_COLORS = ['#262626','#EF535A','#DE9130','#3589FF','#58BA2D'];
    function qualityLevelText(lv){ const n = Number(lv) || 0; return n + '级：' + QUALITY_LEVELS[n]; }
    function qualityIconStyle(lv){ const n = Number(lv) || 0; return { '--p': n * 25, '--c': QUALITY_COLORS[n] }; }
    function qualityRows(){
      const abs = matrixAbilities();
      return sortByCreateTimeDesc(personRows().filter(r=> r['启用状态']!=='禁用')).map(p=>{
        const own = new Map((p._abilities||[]).map(a=> [a['能力名称'], a]));
        const row = { id: 'qm-'+p.id, 工号: p['工号'], 姓名: p['姓名'], 部门: p['部门'], '姓名/能力': (p['部门']||'') + ' - ' + (p['姓名']||'') };
        abs.forEach((m, i)=>{
          const lv = parseInt(String((own.get(m['能力名称'])||{})['岗位实际技能素质']||''), 10);
          row['q'+i] = lv >= 0 && lv < QUALITY_LEVELS.length ? lv : 0;
        });
        return row;
      });
    }
    function qualityColumns(){
      const picked = Array.isArray(query['能力名称']) ? query['能力名称'] : [];
      const cols = [
        { type:'checkbox', width:48, fixed:'left' },
        { type:'seq', title:'序号', width:60, fixed:'left' },
        { field:'姓名/能力', title:'姓名/能力', minWidth:200, fixed:'left', diag:['能力名称','姓名'] },
      ];
      matrixAbilities().forEach((m, i)=>{
        if(picked.length && !picked.includes(m['能力名称'])) return;
        cols.push({ field:'q'+i, title:m['能力名称'], minWidth:140, align:'center', noTooltip:true, slots:{ default:'harvey' } });
      });
      return cols;
    }
    const matrixWeightVisible = ref(false);
    const matrixWeightForm = reactive({ 自评:'', 他评:'', 上级评:'' });
    function openMatrixWeight(){
      const w = matrixWeights();
      MATRIX_DIMS.forEach(d=>{ matrixWeightForm[d] = String(w[d]); });
      matrixWeightVisible.value = true;
    }
    function saveMatrixWeight(){
      for(const d of MATRIX_DIMS){
        const v = String(matrixWeightForm[d]==null ? '' : matrixWeightForm[d]).trim();
        if(!v){ ElMessage.warning('请输入'+d+'权重'); return; }
        if(!/^\d+(\.\d+)?$/.test(v)){ ElMessage.warning(d+'权重须为数字'); return; }
      }
      const sum = MATRIX_DIMS.reduce((s, d)=> s + Number(matrixWeightForm[d]), 0);
      if(Math.abs(sum - 100) > 1e-9){ ElMessage.warning('自评+他评+上级评权重之和必须等于100，当前为 '+sum); return; }
      (MOCK[MATRIX_PAGE] = MOCK[MATRIX_PAGE] || {}).weightCfg = { 自评:Number(matrixWeightForm['自评']), 他评:Number(matrixWeightForm['他评']), 上级评:Number(matrixWeightForm['上级评']) };
      matrixWeightVisible.value = false;
      bumpStore();
      ElMessage.success('保存成功');
    }
    /** 实验室 · 试剂 / 试液 / 标准物质 / 留样 / 耗材 出入库及留样销毁（字段结构相同，仅物料与方向文案不同） */
    const LAB_RG_IN = 'np-0401-01';
    const LAB_RG_OUT = 'np-0401-02';
    const LAB_SL_IN = 'np-0402-03';
    const LAB_IO_PAGES = {
      'np-0401-01':{ mat:'试剂', dir:'入库', prefix:'rgin' },
      'np-0401-02':{ mat:'试剂', dir:'出库', prefix:'rgout' },
      'np-0402-03':{ mat:'试液', dir:'入库', prefix:'slin' },
      'np-0402-04':{ mat:'试液', dir:'出库', prefix:'slout' },
      'np-0403-02':{ mat:'标准物质', dir:'入库', prefix:'bzin' },
      'np-0403-03':{ mat:'标准物质', dir:'出库', prefix:'bzout' },
      'np-0404-01':{ mat:'留样', dir:'入库', prefix:'lyin' },
      'np-0404-02':{ mat:'留样', dir:'出库', prefix:'lyout' },
      'np-0404-03':{ mat:'留样', dir:'销毁', prefix:'lydes' },
      'np-0405-01':{ mat:'耗材', dir:'入库', prefix:'hcin' },
      'np-0405-02':{ mat:'耗材', dir:'出库', prefix:'hcout' },
      'np-0403-01':{ mat:'标准物质', dir:'开封', prefix:'bzopen' },
      'np-0413-02':{ mat:'耗材', dir:'入库', prefix:'hcbin' },
      'np-0413-03':{ mat:'耗材', dir:'出库', prefix:'hcbout' }
    };
    const LAB_BZ_OPEN = 'np-0403-01';
    const LAB_OPEN_PAGES = new Set(['np-0403-01']);
    function bzHalfExpire(raw, opened){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(raw||'') || !/^\d{4}-\d{2}-\d{2}$/.test(opened||'')) return '—';
      const day = 86400000, o = new Date(opened + 'T00:00:00');
      const half = Math.floor(Math.round((new Date(raw + 'T00:00:00') - o) / day) / 2);
      const d = new Date(o.getTime() + half * day), p = x=> String(x).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    }
    /** 标准物质临期预警依据：未开封取原失效日期，已开封取开封后失效日期 */
    function bzWarnExpire(r){
      return (r['开封状态']==='已开封' && /^\d{4}-/.test(r['开封后失效日期']||'')) ? r['开封后失效日期'] : r['失效日期'];
    }
    /** 开封流水：按开封后失效日期 + 标准物质列表「有效期预警」实时计算剩余有效期与效期状态 */
    function bzOpenLife(r){
      const exp = String(r['开封后失效日期']||'').trim();
      if(!exp || exp==='—') return { '剩余有效期（天）':'—', '效期状态':'—' };
      const day = 86400000;
      const t = new Date(); t.setHours(0,0,0,0);
      const left = Math.round((new Date(exp + 'T00:00:00') - t) / day);
      const kind = labRgIoMat()==='耗材' ? '耗材' : '标准物质';
      const srcPage = kind==='耗材' ? 'consumable' : 'ref-material';
      const mat = (((MOCK[srcPage]||{}).main)||[]).find(m=> m[kind+'编码']===r[kind+'编码']) || {};
      const warnN = parseInt(mat['有效期预警'], 10) || 0;
      const warn = warnN * ({ '天':1, '月':30, '年':365 }[mat['有效期预警单位']] || 1);
      const st = left <= 0 ? '过期' : (left <= warn ? '临期' : '正常');
      return { '剩余有效期（天）': String(Math.max(0, left)), '效期状态': st };
    }
