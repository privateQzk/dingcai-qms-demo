    const woFixVisible = ref(false);
    const woFixRow = ref({});
    const woFix = reactive({});
    const woFixTab = ref('fix');
    const woParts = ref([]);
    const woPartSel = ref([]);
    function openWoFix(row){
      const w = woRows().find(x=> x.id===row.id);
      if(!w || !WO_OPEN.includes(w['单据状态'])){ ElMessage.warning('仅待维修、维修中、退修的维修单可维修'); return; }
      woFixRow.value = Object.assign(bxView(w), { 处理时间: w['创建时间'], 处理人: w['创建人'] });
      const d = w._draft || {};
      Object.keys(woFix).forEach(k=> delete woFix[k]);
      Object.assign(woFix, { 维修过程说明: d['维修过程说明'] || '', 仪器故障分析: d['仪器故障分析'] || '', 维修结果: d['维修结果'] || '维修完成',
        维修图片: d['维修图片'] || '', 维修说明: d['维修说明'] || '', _expId: d._expId || '' });
      woParts.value = (d._parts || []).map(p=> ({ ...p }));
      woPartSel.value = [];
      woFixTab.value = 'fix';
      woFixVisible.value = true;
    }
    /** 按「单位列表」的精度值与舍入规则保留小数位；单位未维护时按 3 位四舍五入 */
    function unitRoundQty(v, unitName){
      const u = (((MOCK.unit||{}).main)||[]).find(x=> x['单位名称']===unitName || x['单位编码']===unitName) || {};
      const d = u['精度值']==null || u['精度值']==='' ? 3 : Math.max(0, parseInt(u['精度值'], 10) || 0);
      const f = Math.pow(10, d), x = Number(v) * f, rule = u['舍入规则'] || '四舍五入';
      let n;
      if(rule==='进位') n = Math.ceil(x - 1e-9);
      else if(rule==='舍位') n = Math.floor(x + 1e-9);
      else if(rule==='四舍六入五成双'){
        const fl = Math.floor(x);
        n = Math.abs(x - fl - 0.5) < 1e-9 ? (fl % 2===0 ? fl : fl + 1) : Math.round(x);
      }
      else n = Math.round(x);
      return Number((n / f).toFixed(d));
    }
    function roundWoPart(row){
      const n = Number(row['消耗数量']);
      if(String(row['消耗数量']).trim()!=='' && n > 0) row['消耗数量'] = unitRoundQty(n, row['计量单位']);
    }
    function addWoParts(rows){
      woParts.value = woParts.value.concat(rows.map(x=> ({ _matId: x.id, 备件编码: x['物料编码'], 备件名称: x['物料名称'], 备件规格: x['物料规格'],
        备件种类: x['物料种类'], 计量单位: x['基本单位'], 消耗数量: '' })));
    }
    function removeWoParts(){
      const set = new Set(woPartSel.value);
      woParts.value = woParts.value.filter(p=> !set.has(p));
      woPartSel.value = [];
    }
    function wxActor(){
      if(pageId.value!==MY_WX_PAGE) return CI_OPERATOR;
      const u = djMyUsers().find(r=> r['人员编码']===djMyUser.value);
      return u ? u['人员姓名'] : CI_OPERATOR;
    }
    function openWoExp(){
      bxExpFor.value = 'wo';
      bxExpPick.value = null;
      bxExpVisible.value = true;
    }
    function saveWoFix(draft){
      const w = woRows().find(x=> x.id===woFixRow.value.id);
      if(!w || !WO_OPEN.includes(w['单据状态'])){ ElMessage.warning('仅待维修、维修中、退修的维修单可维修'); return; }
      const fix = Object.fromEntries(['维修过程说明','仪器故障分析','维修结果','维修图片','维修说明'].map(k=> [k, String(woFix[k]||'').trim()]));
      woParts.value.forEach(roundWoPart);
      const parts = ()=> woParts.value.map(p=> ({ ...p }));
      if(draft){
        w._draft = Object.assign(fix, { _parts: parts(), _expId: woFix._expId || '' });
        w['单据状态'] = '维修中';
        woFixVisible.value = false;
        bumpStore();
        ElMessage.success('已保存，维修单状态改为维修中');
        return;
      }
      if(!fix['维修结果']){ ElMessage.warning('请选择维修结果'); return; }
      if(woParts.value.some(p=> !(Number(p['消耗数量']) > 0))){ woFixTab.value = 'parts'; ElMessage.warning('请输入备件的消耗数量（正数）'); return; }
      const ok = fix['维修结果']==='维修完成';
      Object.assign(fix, { 维修完成时间: nowStamp(), 维修人: wxActor() });
      const view = bxView(w);
      woRecords().unshift(Object.assign({ id: 'wr-'+Date.now(), _woId: w.id, _bxId: w._bxId, _instId: w._instId, 单据状态: w['单据状态'] },
        Object.fromEntries(WO_REC_KEYS.map(k=> [k, view[k] || ''])), Object.fromEntries(WO_FIX_KEYS.map(k=> [k, fix[k] || ''])), { _parts: parts() }));
      Object.assign(w, fix, { 单据状态: ok ? '待验收' : '结单', _parts: parts() });
      delete w._draft;
      const b = woBx(w);
      if(b) Object.assign(b, Object.fromEntries(WO_FIX_KEYS.map(k=> [k, fix[k]])), { 单据状态: ok ? '验收中' : '结单', _parts: parts() });
      woFlowPush(w, { 阶段: '维修工单', 时间: fix['维修完成时间'], 操作人: fix['维修人'], 维修结果: fix['维修结果'], 维修说明: fix['维修说明'] });
      const exp = woFix._expId && expRows().find(r=> r.id===woFix._expId);
      if(exp) exp['被引用次数'] = (Number(exp['被引用次数']) || 0) + 1;
      woFixVisible.value = false;
      bumpStore();
      ElMessage.success('已提交，生成维修记录；维修单状态改为'+(ok ? '待验收' : '结单') + (b ? '，报修单状态改为'+(ok ? '验收中' : '结单') : ''));
    }

    function closeWoRows(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !WO_CLOSABLE.includes(r['单据状态']))){ ElMessage.warning('仅待维修、维修中、退修、待验收的维修单可关闭'); return; }
      const ids = new Set(rows.map(r=> r.id));
      const bx = rows.filter(r=> r._bxId).length;
      ElementPlus.ElMessageBox.confirm('确认关闭所选的 '+ids.size+' 张维修单？'+(bx ? '关闭后对应的报修单将回到「待处理」。' : ''), '关闭', {
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        woRows().forEach(w=>{
          if(!ids.has(w.id)) return;
          w['单据状态'] = '已关闭';
          delete w._draft;
          woResetBx(w, '维修单关闭');
        });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已关闭 '+ids.size+' 张维修单' + (bx ? '；'+bx+' 张报修单已改为待处理' : ''));
      }).catch(()=>{});
    }
    function deleteWoRows(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      if(rows.some(r=> !WO_OPEN.includes(r['单据状态']))){ ElMessage.warning('仅待维修、维修中、退修的维修单可删除'); return; }
      const ids = new Set(rows.map(r=> r.id));
      const bx = rows.filter(r=> r._bxId).length;
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+ids.size+' 张维修单？删除后不可恢复'+(bx ? '，对应的报修单将回到「待处理」' : '')+'。', '删除确认', {
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        woRows().filter(w=> ids.has(w.id)).forEach(w=> woResetBx(w, '维修单删除'));
        woBag()['tab-1'] = woRows().filter(w=> !ids.has(w.id));
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+ids.size+' 张维修单' + (bx ? '；'+bx+' 张报修单已改为待处理' : ''));
      }).catch(()=>{});
    }

    /** 维修工单 / 我的维修 / 仪器验收的关联查询按维修单号取数，故障报修、处理记录按其报修单号取数；不列出当前所在的 Tab */
    function woLinkRows(){
      const nos = new Set(bxLinkNos.value), all = [...nos];
      const pick = list=> list.filter(r=> nos.has(r['维修单号']));
      const wos = pick(woRows()), recs = pick(woRecords()), accs = pick(ysRecords());
      const bxNos = [...new Set(wos.concat(recs, accs).map(w=> w['报修单号']).filter(Boolean))];
      const here = pageId.value + '|' + (activeTab.value || '');
      return [
        [BX_PAGE, '', '故障报修', bxNos.length, bxNos, '报修单号'],
        [CL_PAGE, 'tab-2', '故障处理 / 处理记录', clRecords().filter(r=> bxNos.includes(r['报修单号'])).length, bxNos, '报修单号'],
        [WO_PAGE, 'tab-1', '维修工单 / 维修工单', wos.length, all, '维修单号'],
        [WO_PAGE, 'tab-2', '维修工单 / 维修记录', recs.length, all, '维修单号'],
        [YS_PAGE, 'tab-2', '仪器验收 / 验收记录', accs.length, all, '维修单号']
      ].filter(([pid, tab])=> CFG.pages[pid] && pid+'|'+tab!==here)
        .map(([pid, tab, 关联单据, 关联记录数, list, key])=> ({ pid, tab, 关联单据, 关联记录数, nos: list, key }));
    }

    function openWoDetail(row, rec, secs){
      const w = woRows().find(x=> x.id===(rec ? rec._woId : row.id));
      const src = rec ? row : (w ? bxView(w) : row);
      const b = woBx(w || rec || {});
      bxDetailRow.value = Object.assign({ ...src }, {
        故障类型: b ? b['故障类型'] : src['故障类型'], 紧急程度: b ? b['紧急程度'] : src['紧急程度'],
        '故障类型（维修单）': src['故障类型'], '紧急程度（维修单）': src['紧急程度'], '维保班组（维修单）': src['维保班组'],
        处理时间: src['创建时间'], 处理人: src['创建人']
      });
      bxDetailSecs.value = secs || (rec ? WO_DETAIL.slice(0, 5) : WO_DETAIL);
      bxDetailFlow.value = b || w || {};
      bxDetailTab.value = 'info';
      bxDetailVisible.value = true;
    }

    function addRecsToExp(){
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      ElementPlus.ElMessageBox.confirm('是否确认添加至经验库', '批量添加至经验库', {
        type:'warning', confirmButtonText:'确定', cancelButtonText:'取消'
      }).then(()=>{
        const list = expRows();
        const keyOf = r=> [r['仪器类型'], r['故障类型'], String(r['故障描述']||'').trim()].join('|');
        const exists = r=> list.some(e=> splitComma(e['适用仪器类型']).includes(r['仪器类型']) && splitComma(e['适用故障类型']).includes(r['故障类型'])
          && String(e['故障描述']||'').trim()===String(r['故障描述']||'').trim());
        const dup = [...new Map(rows.filter(exists).map(r=> [keyOf(r), r])).values()];
        if(dup.length){
          ElementPlus.ElMessageBox.alert(
            '以下条目在经验库中已存在（仪器类型 + 故障类型 + 故障描述），不允许添加：<br>' +
              dup.map((r, i)=> (i+1)+'. '+r['仪器类型']+' / '+r['故障类型']+' / '+r['故障描述']).join('<br>'),
            '提示', { type:'warning', dangerouslyUseHTMLString: true, confirmButtonText:'知道了' }).catch(()=>{});
          return;
        }
        const fresh = [...new Map(rows.map(r=> [keyOf(r), r])).values()];
        const at = nowStamp();
        fresh.forEach((r, i)=>{
          list.unshift({ id: 'jy-'+Date.now()+'-'+i, 经验编码: nextExpNo(list), 故障描述: r['故障描述'], 维修过程说明: r['维修过程说明'],
            仪器故障分析: r['仪器故障分析'], 附件: '', 适用仪器类型: r['仪器类型'], 适用故障类型: r['故障类型'], 被引用次数: 0, 备注: '',
            启用状态: '启用', 创建人: CI_OPERATOR, 创建时间: at });
        });
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已添加 '+fresh.length+' 条经验至经验库');
      }).catch(()=>{});
    }

    /** 仪器停用 / 启用 / 报废：一张单据对应一台仪器，仪器字段跟随台账；from 为可添加仪器的使用状态，审核通过后使用状态改为 to
     *  仪器调拨（multi）：一张单据含多台仪器（_lines 记录调拨前的原存放位置），审核通过后台账存放位置改为新存放位置，不写履历 */
    const TY_PAGE = 'np-0309-01';
    const QY_PAGE = 'np-0310-01';
    const BF_PAGE = 'np-0311-01';
    const DB_PAGE = 'np-0312-01';
    const TY_KINDS = {
      [TY_PAGE]: { w: '停用', pre: 'YQTY', idp: 'ty-', dict: '停用类型（sbtytylx）', from: ['在用'], to: '停用', yl: '/' },
      [QY_PAGE]: { w: '启用', pre: 'YQQY', idp: 'qy-', dict: '启用类型（sbqyqylx）', from: ['停用'], to: '在用', yl: '正常' },
      [BF_PAGE]: { w: '报废', pre: 'YQBF', idp: 'bf-', dict: '报废类型（sbbflx）', from: ['在用','停用'], to: '报废', yl: '/' },
      [DB_PAGE]: { w: '调拨', pre: 'YQDB', idp: 'db-', dict: '调拨类型（sbdbdblx）', from: ['在用'], multi: true }
    };
    const TY_OPEN = ['/', '审核撤销', '审核驳回'];
    function isTyPage(){ return !!TY_KINDS[pageId.value]; }
    const tyK = computed(()=> TY_KINDS[pageId.value] || TY_KINDS[TY_PAGE]);
    function tyOpenTip(){ return '仅审核状态为“/、审核撤销、审核驳回”的'+tyK.value.w+'单可'; }
    function tyKeys(k){ return [k.w+'时间', k.w+'类型'].concat(k.multi ? ['新存放位置'] : [], [k.w+'原因', '附件', '备注']); }
    function tyNextNo(k, list){
      const seq = list.reduce((m, r)=> Math.max(m, parseInt(String(r[k.w+'单号']||'').replace(/\D/g, ''), 10) || 0), 0);
      return k.pre + String(seq + 1).padStart(8, '0');
    }
    function tyRows(pid){
      pid = pid || (isTyPage() ? pageId.value : TY_PAGE);
      const bag = (MOCK[pid] = MOCK[pid] || { main: [] });
      return bag.main || (bag.main = []);
    }
    function tyView(r){
      if(r._lines){
        const insts = r._lines.map(l=> djInstruments().find(x=> x.id===l._instId) || {});
        const uniq = a=> [...new Set(a.filter(Boolean))];
        return Object.assign({}, r, { 关联仪器: insts.map(i=> i['仪器编号']).filter(Boolean).join('，'),
          原存放位置: uniq(r._lines.map(l=> l['原存放位置'])).join('，'), _types: uniq(insts.map(i=> i['仪器类型'])) });
      }
      const inst = djInstruments().find(x=> x.id===r._instId);
      return Object.assign({}, r, inst ? bxInstSnap(inst) : {});
    }
    function tyQueryRows(){
      const w = tyK.value.w;
      const fuzzy = tyK.value.multi ? [w+'单号','关联仪器','新存放位置','创建人'] : [w+'单号','仪器编号','仪器名称','仪器类型','创建人'];
      let l = applyContainsExactQuery(tyRows().map(tyView), query, fuzzy, ['审核状态', w+'类型']);
      [w+'时间','创建时间'].forEach(k=>{ l = applyDateRangeQuery(l, query, k); });
      return sortByCreateTimeDesc(l);
    }
    function tyTypes(){ return instDictOpts(tyK.value.dict); }

    const tyFormVisible = ref(false);
    const tyFormMode = ref('add');
    const tyFormLines = ref([]);
    const tyFormSel = ref([]);
    const tyForm = reactive({});
    const tyEditId = ref('');
    function openTyForm(mode, row){
      const k = tyK.value;
      const src = row ? tyRows().find(r=> r.id===row.id) : null;
      if(mode==='edit' && (!src || !TY_OPEN.includes(src['审核状态']))){ ElMessage.warning(tyOpenTip()+'编辑'); return; }
      tyFormMode.value = mode;
      tyFormSel.value = [];
      tyEditId.value = mode==='edit' ? src.id : '';
      Object.keys(tyForm).forEach(x=> delete tyForm[x]);
      tyKeys(k).forEach(x=>{ tyForm[x] = src ? (src[x] || '') : ''; });
      if(mode!=='edit') tyForm[k.w+'时间'] = djFmtTime(new Date());
      tyForm._no = mode==='edit' ? src[k.w+'单号'] : tyNextNo(k, tyRows())+'（自动生成）';
      const ids = src ? (src._lines ? src._lines.map(l=> l._instId) : [src._instId]) : [];
      tyFormLines.value = ids.map(id=> djInstruments().find(x=> x.id===id)).filter(Boolean).map(inst=> Object.assign({ _instId: inst.id }, bxInstSnap(inst)));
      tyFormVisible.value = true;
    }
    function onTyLineAction(name){
      if(name==='添加仪器'){ openIoPick('inst', 'tyInsts', '', true); return; }
      const set = new Set(tyFormSel.value||[]);
      if(!set.size){ ElMessage.warning('请先勾选仪器'); return; }
      tyFormLines.value = tyFormLines.value.filter(l=> !set.has(l));
      tyFormSel.value = [];
    }
    function saveTyForm(){
      const k = tyK.value, w = k.w;
      const txt = x=> String(tyForm[x]==null ? '' : tyForm[x]).trim();
      const lines = tyFormLines.value;
      if(!lines.length){ ElMessage.warning('请添加仪器'); return; }
      if(!txt(w+'时间')){ ElMessage.warning('请选择'+w+'时间'); return; }
      if(!txt(w+'类型')){ ElMessage.warning('请选择'+w+'类型'); return; }
      if(k.multi && !txt('新存放位置')){ ElMessage.warning('请输入新存放位置'); return; }
      if(!txt(w+'原因')){ ElMessage.warning('请输入'+w+'原因'); return; }
      const base = Object.fromEntries(tyKeys(k).map(x=> [x, txt(x)]));
      const list = tyRows();
      const instOf = l=> djInstruments().find(x=> x.id===l._instId) || {};
      const off = lines.filter(l=> !k.from.includes(instOf(l)['使用状态']));
      const offTip = ()=> ElMessage.warning('仪器 '+off.map(l=> l['仪器编号']).join('、')+' 不是「'+k.from.join('/')+'」状态，不可'+w);
      if(k.multi) base._lines = lines.map(l=> ({ _instId: l._instId, 原存放位置: instOf(l)['存放位置'] || '' }));
      if(tyFormMode.value==='edit'){
        const cur = list.find(r=> r.id===tyEditId.value);
        if(!cur || !TY_OPEN.includes(cur['审核状态'])){ ElMessage.warning(tyOpenTip()+'编辑'); return; }
        if(k.multi && off.length){ offTip(); return; }
        Object.assign(cur, base);
        tyFormVisible.value = false;
        bumpStore();
        ElMessage.success('保存成功');
        return;
      }
      if(off.length){ offTip(); return; }
      const commitAdd = ()=>{
      const at = nowStamp();
      if(k.multi){
        const no = tyNextNo(k, list);
        list.unshift(Object.assign({ id: k.idp+Date.now(), 审核状态: '/', [w+'单号']: no }, base, { 创建人: CI_OPERATOR, 创建时间: at }));
        tyFormVisible.value = false;
        bumpStore();
        ElMessage.success('已生成'+w+'单 '+no+'（'+lines.length+' 台仪器）');
        return;
      }
      let seq = list.reduce((m, r)=> Math.max(m, parseInt(String(r[w+'单号']||'').replace(/\D/g, ''), 10) || 0), 0);
      lines.forEach((l, i)=>{
        list.unshift(Object.assign({ id: k.idp+Date.now()+'-'+i, 审核状态: '/', [w+'单号']: k.pre+String(++seq).padStart(8, '0'), _instId: l._instId },
          bxInstSnap(djInstruments().find(x=> x.id===l._instId) || l), base, { 创建人: CI_OPERATOR, 创建时间: at }));
      });
      tyFormVisible.value = false;
      bumpStore();
      ElMessage.success('已生成 '+lines.length+' 张'+w+'单');
      };
      if(pageId.value===BF_PAGE){
        ElementPlus.ElMessageBox.confirm('确认提交报废申请？所选 '+lines.length+' 台仪器将各生成一条报废单。', '确认', { type:'warning', confirmButtonText:'确定', cancelButtonText:'取消' }).then(commitAdd).catch(()=>{});
        return;
      }
      commitAdd();
    }
    function deleteTyRows(){
      const w = tyK.value.w;
      const rows = bxPicked();
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = rows.filter(r=> !TY_OPEN.includes(r['审核状态']));
      if(bad.length){ ElMessage.warning(tyOpenTip()+'删除：'+bad.map(r=> r[w+'单号']).join('、')); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选的 '+rows.length+' 张'+w+'单？', '批量删除', { type:'warning', confirmButtonText:'确定', cancelButtonText:'取消' }).then(()=>{
        const ids = new Set(rows.map(r=> r.id));
        const list = tyRows();
        for(let i = list.length - 1; i >= 0; i--){ if(ids.has(list[i].id)) list.splice(i, 1); }
        selectedIds.value = [];
        bumpStore();
        ElMessage.success('已删除 '+rows.length+' 张'+w+'单');
      }).catch(()=>{});
    }

    const tyDetailVisible = ref(false);
    const tyDetail = ref({});
    const tyDetailKeys = computed(()=>{ const w = tyK.value.w; return ['审核状态', w+'单号', w+'时间', w+'类型', '原存放位置', '新存放位置', w+'原因', '附件', '关联仪器', '备注', '创建人', '创建时间']; });
    const tyDetailLines = computed(()=> ((tyDetail.value._lines)||[]).map(l=>{
      const inst = djInstruments().find(x=> x.id===l._instId) || {};
      return { 仪器编号: inst['仪器编号'], 仪器名称: inst['仪器名称'], 仪器条码: inst['仪器条码'] || inst['仪器编号'], 仪器类型: inst['仪器类型'],
        原存放位置: l['原存放位置'], 新存放位置: tyDetail.value['新存放位置'] };
    }));
    function openTyDetail(row){
      const src = tyRows().find(r=> r.id===row.id);
      if(!src) return;
      tyDetail.value = tyView(src);
      tyDetailVisible.value = true;
    }

    /** 发起审批：审批流按单据匹配，多选时只保留满足全部所选单据的审批流（取交集） */
    const TY_NOTICE_KEYS = ['终审通过抄送人','终审通过抄送通知方式','终审通过提醒','终审通过通知方式','审核驳回提醒','审核驳回通知方式','待审核提醒','待审核通知方式','发起异常提醒','发起异常通知方式'];
    const TY_NOTICE_REQ = ['终审通过提醒','审核驳回提醒','待审核提醒','发起异常提醒','发起异常通知方式'];
    const TY_NOTICE = { 终审通过抄送人:'张敏、李强', 终审通过抄送通知方式:'站内信', 终审通过提醒:'发起人', 终审通过通知方式:'站内信、邮件',
      审核驳回提醒:'发起人', 审核驳回通知方式:'站内信', 待审核提醒:'当前节点审核人', 待审核通知方式:'站内信、企业微信', 发起异常提醒:'发起人、系统管理员', 发起异常通知方式:'站内信' };
    const AP_TYPES = ['指定人员','主管'];
    const AP_LEADERS = ['直接主管','二级主管','部门负责人'];
    const AP_WAYS = ['或签','会签','依次审批'];
    const AP_REMIND = ['站内信','邮件','企业微信'];
    const AP_UNITS = ['小时','天'];
    const apNode = (名称, 类型, 人员, 主管, 方式, 时长, 单位)=> ({ 节点名称: 名称, 审核人类型: 类型, 指定人员审核人: 人员, 主管审核人: 主管, 审核方式: 方式,
      超期未审是否提醒: '是', 提醒方式: ['站内信'], 审核标准时长: 时长, 时长单位: 单位 });
    const TY_FLOWS = {
      [TY_PAGE]: [
        { 名称: '色谱仪器停用审批流', fit: r=> r['仪器类型']==='色谱', 允许编辑: '不可变更', 通知: Object.assign({}, TY_NOTICE, { 终审通过抄送人: '张敏、李强、吴海峰' }),
          节点: [apNode('部门主管审核','主管',[],'直接主管','或签',24,'小时'), apNode('色谱维保组审核','指定人员',['周建国','吴海峰'],'','会签',1,'天'), apNode('质量经理审批','指定人员',['李强'],'','或签',2,'天')] },
        { 名称: '故障停用快速审批流', fit: r=> r['停用类型']==='故障停用', 允许编辑: '允许变更', 通知: TY_NOTICE,
          节点: [apNode('仪器管理员审核','指定人员',['周建国'],'','或签',4,'小时')] },
        { 名称: '仪器停用通用审批流', fit: ()=> true, 允许编辑: '允许变更', 通知: TY_NOTICE,
          节点: [apNode('部门主管审核','主管',[],'直接主管','或签',24,'小时'), apNode('仪器管理员审核','指定人员',['周建国'],'','或签',1,'天')] }
      ],
      [QY_PAGE]: [
        { 名称: '色谱仪器启用审批流', fit: r=> r['仪器类型']==='色谱', 允许编辑: '不可变更', 通知: Object.assign({}, TY_NOTICE, { 终审通过抄送人: '张敏、李强、吴海峰' }),
          节点: [apNode('色谱维保组确认','指定人员',['周建国','吴海峰'],'','会签',1,'天'), apNode('质量经理审批','指定人员',['李强'],'','或签',2,'天')] },
        { 名称: '维修后启用审批流', fit: r=> r['启用类型']==='维修后启用', 允许编辑: '允许变更', 通知: TY_NOTICE,
          节点: [apNode('仪器管理员审核','指定人员',['周建国'],'','或签',4,'小时'), apNode('质量经理审批','指定人员',['李强'],'','或签',1,'天')] },
        { 名称: '仪器启用通用审批流', fit: ()=> true, 允许编辑: '允许变更', 通知: TY_NOTICE,
          节点: [apNode('部门主管审核','主管',[],'直接主管','或签',24,'小时'), apNode('仪器管理员审核','指定人员',['周建国'],'','或签',1,'天')] }
      ],
      [BF_PAGE]: [
        { 名称: '色谱仪器报废审批流', fit: r=> r['仪器类型']==='色谱', 允许编辑: '不可变更', 通知: Object.assign({}, TY_NOTICE, { 终审通过抄送人: '张敏、李强、吴海峰' }),
          节点: [apNode('部门主管审核','主管',[],'直接主管','或签',24,'小时'), apNode('色谱维保组鉴定','指定人员',['周建国','吴海峰'],'','会签',2,'天'), apNode('质量经理审批','指定人员',['李强'],'','或签',2,'天')] },
        { 名称: '损坏报废审批流', fit: r=> r['报废类型']==='损坏报废', 允许编辑: '允许变更', 通知: TY_NOTICE,
          节点: [apNode('仪器管理员鉴定','指定人员',['周建国'],'','或签',1,'天'), apNode('质量经理审批','指定人员',['李强'],'','或签',1,'天')] },
        { 名称: '仪器报废通用审批流', fit: ()=> true, 允许编辑: '允许变更', 通知: TY_NOTICE,
          节点: [apNode('部门主管审核','主管',[],'直接主管','或签',24,'小时'), apNode('仪器管理员审核','指定人员',['周建国'],'','或签',1,'天'), apNode('质量经理审批','指定人员',['李强'],'','或签',2,'天')] }
      ],
      [DB_PAGE]: [
        { 名称: '色谱仪器调拨审批流', fit: r=> (r._types||[]).includes('色谱'), 允许编辑: '不可变更', 通知: Object.assign({}, TY_NOTICE, { 终审通过抄送人: '张敏、李强、吴海峰' }),
          节点: [apNode('部门主管审核','主管',[],'直接主管','或签',24,'小时'), apNode('色谱维保组确认','指定人员',['周建国','吴海峰'],'','会签',1,'天')] },
        { 名称: '仪器外借审批流', fit: r=> r['调拨类型']==='外借', 允许编辑: '允许变更', 通知: TY_NOTICE,
          节点: [apNode('部门主管审核','主管',[],'直接主管','或签',24,'小时'), apNode('仪器管理员审核','指定人员',['周建国'],'','或签',1,'天'), apNode('质量经理审批','指定人员',['李强'],'','或签',1,'天')] },
        { 名称: '仪器调拨通用审批流', fit: ()=> true, 允许编辑: '允许变更', 通知: TY_NOTICE,
          节点: [apNode('部门主管审核','主管',[],'直接主管','或签',24,'小时'), apNode('仪器管理员审核','指定人员',['周建国'],'','或签',1,'天')] }
      ]
    };
    const cloneApNode = n=> Object.assign({}, n, { 指定人员审核人: (n.指定人员审核人||[]).slice(), 提醒方式: (n.提醒方式||[]).slice() });
    const tyApVisible = ref(false);
    const tyApBatch = ref(false);
    const tyApRows = ref([]);
    const tyApSel = ref([]);
    const tyAp = reactive({ flow: '', allow: '允许变更', notice: {}, nodes: [] });
    function tyFlowList(){ return TY_FLOWS[isTyPage() ? pageId.value : TY_PAGE]; }
    const tyApFlows = computed(()=> tyFlowList().filter(f=> tyApRows.value.every(r=> f.fit(r))));
    const tyApLocked = computed(()=> tyAp.allow==='不可变更');
    function tyApUsers(){ return [...new Set(instUsers().concat(djMyUsers().map(u=> u['人员姓名'])))]; }
    function loadTyFlow(){
      const f = tyFlowList().find(x=> x['名称']===tyAp.flow);
      tyAp.allow = f ? f['允许编辑'] : '允许变更';
      tyAp.notice = f ? Object.assign({}, f['通知']) : {};
      tyAp.nodes = f ? f['节点'].map(cloneApNode) : [];
      tyApSel.value = [];
    }
    function openTyAp(rows, batch){
      if(!rows.length){ ElMessage.warning('请先勾选数据'); return; }
      const bad = rows.filter(r=> !TY_OPEN.includes(r['审核状态']));
      if(bad.length){ ElMessage.warning(tyOpenTip()+'发起审批：'+bad.map(r=> r[tyK.value.w+'单号']).join('、')); return; }
      tyApRows.value = rows.map(r=> tyView(tyRows().find(x=> x.id===r.id) || r));
      tyApBatch.value = !!batch;
      if(!tyApFlows.value.length){ ElMessage.warning('没有满足所有所选单据的审批流'); return; }
      tyAp.flow = tyApFlows.value[0]['名称'];
      loadTyFlow();
      tyApVisible.value = true;
    }
    function addTyNode(i){
      const n = Object.assign(apNode('', '指定人员', [], '', '或签', '', '小时'), { 提醒方式: [] });
      if(i==null) tyAp.nodes.push(n); else tyAp.nodes.splice(i + 1, 0, n);
    }
    function copyTyNode(i){ tyAp.nodes.splice(i + 1, 0, cloneApNode(tyAp.nodes[i])); }
    function removeTyNodes(){
      const set = new Set(tyApSel.value);
      tyAp.nodes = tyAp.nodes.filter(n=> !set.has(n));
      tyApSel.value = [];
    }
    function onTyApType(row){
      if(row['审核人类型']==='主管'){ row['指定人员审核人'] = []; if(!row['主管审核人']) row['主管审核人'] = '直接主管'; }
      else row['主管审核人'] = '';
    }
    function onTyApField(){ ElMessage.info('字段权限：配置该节点审核人可查看 / 编辑的单据字段（演示）'); }
    function submitTyAp(){
      if(!tyAp.flow){ ElMessage.warning('请选择审批流'); return; }
      if(!tyAp.nodes.length){ ElMessage.warning('请至少保留一个审核节点'); return; }
      for(let i = 0; i < tyAp.nodes.length; i++){
        const n = tyAp.nodes[i], tip = m=> ElMessage.warning('第 '+(i + 1)+' 个审核节点：'+m);
        if(!String(n['节点名称']||'').trim()) return tip('请输入节点名称');
        if(!n['审核人类型']) return tip('请选择审核人类型');
        if(n['审核人类型']==='指定人员' && !(n['指定人员审核人']||[]).length) return tip('请选择指定人员审核人');
        if(n['审核人类型']==='主管' && !n['主管审核人']) return tip('请选择主管审核人');
        if(!n['审核方式']) return tip('请选择审核方式');
        if(!n['超期未审是否提醒']) return tip('请选择超期未审是否提醒');
        if(!(Number(n['审核标准时长']) > 0)) return tip('请输入审核标准时长（正数）');
      }
      const at = nowStamp();
      tyApRows.value.forEach(v=>{
        const r = tyRows().find(x=> x.id===v.id);
        if(!r) return;
        r['审核状态'] = '审核中';
        r._audit = { 审批流: tyAp.flow, 节点: tyAp.nodes.map(cloneApNode), 当前节点: 0, 发起人: CI_OPERATOR, 发起时间: at,
          记录: [{ 节点名称: '发起审批', 操作人: CI_OPERATOR, 结果: '已发起', 时间: at, 意见: '' }] };
      });
      selectedIds.value = [];
      tyApVisible.value = false;
      bumpStore();
      ElMessage.success('已发起审批（'+tyApRows.value.length+' 张），审核状态改为审核中');
    }
