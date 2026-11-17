    const visibleTypeFormFields = computed(()=> (page.value?.typeFormFields||[]).filter(f=> !(f.editOnly && dictTypeFormMode.value==='add')));
    const dictTypeOptions = computed(()=>{
      const types = dictTypes.value || [];
      const selfId = dictTypeForm.id;
      if(!selfId) return types;
      const blocked = new Set([selfId]);
      const walk = (pid)=>{
        types.forEach(t=>{
          if(t.上级字典===pid && !blocked.has(t.id)){ blocked.add(t.id); walk(t.id); }
        });
      };
      walk(selfId);
      return types.filter(t=> !blocked.has(t.id));
    });
    const dictTypeTitle = computed(()=> {
      const cur = curDictTypes().find(x=>x.id===dictTypeId.value);
      if(!cur || cur.分组节点) return '';
      return cur.名称 || '';
    });
    function buildTypeTree(list, kw){
      const map = {};
      list.forEach(t=>{ map[t.id] = { ...t, children: [] }; });
      const roots = [];
      list.forEach(t=>{
        const node = map[t.id];
        if(t.上级字典 && map[t.上级字典]) map[t.上级字典].children.push(node);
        else roots.push(node);
      });
      if(!kw) return roots;
      const match = (n)=>{
        const self = (n.名称||'').includes(kw);
        const kids = (n.children||[]).map(match).filter(Boolean);
        if(self || kids.length) return { ...n, children: kids.length ? kids : (self ? (n.children||[]) : []) };
        return null;
      };
      return roots.map(match).filter(Boolean);
    }
    const filteredDictTypeTree = computed(()=> buildTypeTree(curDictTypes(), dictTypeKw.value.trim()));
    function toggleDictTypeNode(n){
      if(!(n.children||[]).length) return;
      const next = { ...dictTypeCollapsed.value };
      if(next[n.id]) delete next[n.id];
      else next[n.id] = true;
      dictTypeCollapsed.value = next;
    }
    function isDictLeafType(id){
      const t = curDictTypes().find(x=>x.id===id);
      return !!(t && !t.分组节点);
    }

    const hasMoreQuery = computed(()=> (tabView.value.queryMore||[]).length>0 || (tabView.value.queryFields||[]).length>4);

    const visibleQueryFields = computed(()=>{
      const all = tabView.value.queryFields || [];
      const defaults = tabView.value.queryDefault || [];
      const mores = tabView.value.queryMore || [];
      if(!defaults.length && !mores.length){
        return queryExpanded.value ? all : all.slice(0,4);
      }
      const defSet = new Set(defaults);
      const moreSet = new Set(mores);
      const primary = all.filter(f=>defSet.has(f.name));
      const rest = all.filter(f=>!defSet.has(f.name));
      const base = primary.length ? primary : all.slice(0,4);
      if(!queryExpanded.value) return base;
      const more = rest.filter(f=> moreSet.size? moreSet.has(f.name): true);
      const names = new Set(base.map(f=>f.name));
      return base.concat(more.filter(f=>!names.has(f.name)));
    });

    function parseYmdDate(s){
      const m = String(s||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(!m) return null;
      return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
    }
    function daysBetweenDates(a, b){
      if(!a || !b) return null;
      return Math.floor((b.getTime() - a.getTime()) / 86400000);
    }
    function ageWarnThresholdDays(matCode){
      const code = String(matCode||'').trim();
      if(!code) return null;
      const rows = ((MOCK['stock-warn']||{}).tab2||[]);
      const hit = rows.find(r => String(r['物料编码']||'')===code && r['启用状态']!=='禁用');
      if(!hit) return null;
      const n = Number(hit['库龄预警期']);
      if(!(n>0)) return null;
      const u = String(hit['库龄预警期单位']||'天');
      if(u==='月') return n * 30;
      if(u==='年') return n * 365;
      return n;
    }
    function matCodeFromInvRow(row){
      const direct = String(row['物料编码']||'').trim();
      if(direct) return direct;
      const info = String(row['物料信息']||'');
      const m = info.match(/^([^/\s]+)/);
      return m ? m[1].trim() : '';
    }
    function enrichWhInvDetailRow(row, mode){
      const next = Object.assign({}, row);
      const today = new Date();
      today.setHours(0,0,0,0);
      const lot = String(next['批号']!=null ? next['批号'] : (next['物料批号']||'')).trim();
      const hasLot = !!(lot && lot!=='—');
      const inDate = parseYmdDate(next['入库日期'] || next['生产日期']);
      const ageDays = inDate!=null ? Math.max(0, daysBetweenDates(inDate, today)) : null;

      if(mode==='count' && !hasLot){
        next['在库时长'] = '—';
        next['告警状态'] = '—';
        return next;
      }

      if(ageDays!=null) next['在库时长'] = ageDays + '天';
      else next['在库时长'] = next['在库时长'] || '—';

      if(mode==='count'){
        const th = ageWarnThresholdDays(matCodeFromInvRow(next));
        if(th!=null && ageDays!=null && ageDays > th) next['告警状态'] = '库龄超限';
        else next['告警状态'] = '正常';
        return next;
      }

      // serial / 库存明细：冻结 > 已过期 > 即将过期 > 库龄超限 > 正常
      if(String(next['使用状态']||'')==='冻结'){
        next['告警状态'] = '冻结';
        return next;
      }
      const exp = parseYmdDate(next['失效日期']);
      if(exp){
        const left = daysBetweenDates(today, exp);
        if(left!=null && left < 0){ next['告警状态'] = '已过期'; return next; }
        if(left!=null && left <= 30){ next['告警状态'] = '即将过期'; return next; }
      }
      const th = ageWarnThresholdDays(matCodeFromInvRow(next));
      if(th!=null && ageDays!=null && ageDays > th){
        next['告警状态'] = '库龄超限';
        return next;
      }
      next['告警状态'] = '正常';
      return next;
    }

    /** 漂移规则设置（对齐 OLED LIMS：单列表 + 规则分类 + 杂质/物料/色谱柱） */
    const DRIFT_TR_OPTS = ['按固定值不叠加','按批次新增自动叠加'];
    const DRIFT_INSP_OPTS = ['采购来料检','生产过程检','生产物料检','研发检'];
    const driftFormTab = ref('rrt');
    const driftImpurityRows = ref([]);
    const driftRrtRows = ref([]);
    const driftRrtSelected = ref([]);
    const driftNewUCL = ref('');
    const driftNewLCL = ref('');
    const driftFilterMin = ref('');
    const driftFilterMax = ref('');
    const driftMatRows = ref([]);
    const driftColRows = ref([]);
    const driftPointRows = ref([]); // 兼容旧抽屉入口，新口径不再维护采样点
    const newDriftImpurity = ()=> ({ 是否主峰:'否', 典型保留时间:'', 定性结构:'', 标准结果值:'', UCL:'', LCL:'' });
    const newDriftRrtRule = ()=> ({ 时间范围起:'', 时间范围止:'', 下限符号:'-', 下限数值:'', 上限符号:'+', 上限数值:'' });
    const newDriftMat = ()=> ({ 物料编码:'', 物料名称:'' });
    const newDriftCol = ()=> ({ 色谱柱型号:'' });
    const addDriftImpurity = ()=> { driftImpurityRows.value.push(newDriftImpurity()); };
    const removeDriftImpurity = (i)=> { driftImpurityRows.value.splice(i, 1); };
    const addDriftRrtRule = ()=> { driftRrtRows.value.push(newDriftRrtRule()); };
    const removeDriftRrtRule = (i)=> { driftRrtRows.value.splice(i, 1); };
    function removeDriftRrtRules(){
      if(!driftRrtSelected.value.length){ ElMessage.warning('请先勾选要删除的行'); return; }
      const set = new Set(driftRrtSelected.value);
      driftRrtRows.value = driftRrtRows.value.filter(r=> !set.has(r));
      driftRrtSelected.value = [];
    }
    const addDriftMat = ()=> { driftMatRows.value.push(newDriftMat()); };
    const removeDriftMat = (i)=> { driftMatRows.value.splice(i, 1); };
    const addDriftCol = ()=> { driftColRows.value.push(newDriftCol()); };
    const removeDriftCol = (i)=> { driftColRows.value.splice(i, 1); };
    function driftSignedOffset(sign, val){
      const n = driftNum(val);
      if(n==null) return null;
      return (sign==='-' ? -1 : 1) * Math.abs(n);
    }
    function driftFmtSigned(sign, val){
      const t = String(val==null?'':val).trim();
      if(!t) return '';
      return (sign==='-' ? '-' : '+') + t;
    }
    function driftRrtSummary(rows){
      const list = (rows||[]).map(r=>{
        const a = driftFmtSigned(r.下限符号||'-', r.下限数值);
        const b = driftFmtSigned(r.上限符号||'+', r.上限数值);
        return (a && b) ? (a+'~'+b) : '';
      }).filter(Boolean);
      return list.length ? [...new Set(list)].join('、') : '';
    }
    function driftPickRrtRule(rules, tr){
      const list = rules||[];
      if(!list.length) return null;
      if(tr==null) return list[0];
      const hit = list.find(r=>{
        const a = driftNum(r.时间范围起), b = driftNum(r.时间范围止);
        if(a==null && b==null) return true;
        if(a!=null && tr < a) return false;
        if(b!=null && tr > b) return false;
        return true;
      });
      return hit || list[0];
    }
    function driftRangeByRrt(tr, rules, fallbackLo, fallbackHi){
      const rule = driftPickRrtRule(rules, tr);
      if(rule){
        const loOff = driftSignedOffset(rule.下限符号||'-', rule.下限数值);
        const hiOff = driftSignedOffset(rule.上限符号||'+', rule.上限数值);
        if(tr!=null && loOff!=null && hiOff!=null) return { lo: tr + loOff, hi: tr + hiOff };
      }
      const lo = driftNum(fallbackLo), hi = driftNum(fallbackHi);
      if(lo!=null || hi!=null) return { lo: lo==null ? tr : lo, hi: hi==null ? tr : hi };
      return { lo: tr, hi: tr };
    }
    const driftMatOptions = ()=> ((MOCK['mat-list']||{}).main||[]).filter(r=> String(r['启用状态']||'启用')==='启用');
    function onDriftMatPick(row){
      if(!row) return;
      const m = driftMatOptions().find(x=> x['物料编码']===row.物料编码);
      row.物料名称 = m ? (m['物料名称']||'') : '';
    }
    const driftColTypeOptions = ()=>{
      // 型号主数据来自色谱柱台账左侧型号列表（types）；无型号字典时回落台账行去重
      const bag = MOCK['np-0208-01'] || {};
      const models = (bag.types || []).map(t=> String(t['名称']||t['色谱柱型号']||'').trim()).filter(Boolean);
      if(models.length) return [...new Set(models)];
      return [...new Set((bag.main || []).map(r=> String(r['色谱柱型号']||'').trim()).filter(Boolean))];
    };
    function onDriftMainPeak(row){
      if(row['是否主峰']!=='是') return;
      const mains = driftImpurityRows.value.filter(r=> r['是否主峰']==='是');
      if(mains.length <= 2) return;
      // 支持双主峰：超过 2 条时，取消本次勾选并提示
      row['是否主峰'] = '否';
      ElMessage.warning('最多支持双主峰（2 条）');
    }
    function driftBag(){
      if(!MOCK[DRIFT_PAGE]) MOCK[DRIFT_PAGE]={ main:[] };
      const b = MOCK[DRIFT_PAGE];
      if(!Array.isArray(b.main)) b.main = [];
      // 旧版 GC/LC 页签数据迁移到单列表 main
      [['tab-1','GC'],['tab-2','LC']].forEach(([t, cat])=>{
        if(!Array.isArray(b[t]) || !b[t].length) return;
        b[t].forEach(r=>{
          if(!r) return;
          if(!r['规则分类']) r['规则分类'] = cat;
          if(!(r['适用检验类型']) && r['使用检验类型']) r['适用检验类型'] = r['使用检验类型'];
          if(!(r['使用检验类型']) && r['适用检验类型']) r['使用检验类型'] = r['适用检验类型'];
          if(!b.main.some(x=> x && (x.id===r.id || x['规则编码']===r['规则编码']))) b.main.push(r);
        });
        b[t] = [];
      });
      return b;
    }
    function driftRowsOf(){ return driftBag().main; }
    function driftInspList(v){
      if(Array.isArray(v)) return v.map(x=> String(x||'').trim()).filter(Boolean);
      return String(v==null?'':v).split(/[、,，]/).map(x=> x.trim()).filter(Boolean);
    }
    function driftNum(v){
      const t = String(v==null?'':v).trim();
      if(t==='' || t==='—') return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
    function resetDriftForm(){
      driftFormTab.value = 'rrt';
      driftImpurityRows.value = [newDriftImpurity(), newDriftImpurity()];
      driftRrtRows.value = [newDriftRrtRule()];
      driftRrtSelected.value = [];
      driftNewUCL.value = ''; driftNewLCL.value = '';
      driftFilterMin.value = ''; driftFilterMax.value = '';
      driftMatRows.value = [newDriftMat()];
      driftColRows.value = [newDriftCol()];
      formModel['规则分类'] = 'GC';
      formModel['TR规则'] = '按固定值不叠加';
      formModel['适用检验类型'] = [];
      formModel['使用检验类型'] = [];
      formSwitch['启用状态'] = true;
    }
    function fillDriftForm(row, isCopy){
      resetDriftForm();
      formModel['规则编码'] = isCopy ? '' : (row['规则编码']||'');
      formModel['规则名称'] = row['规则名称']||'';
      formModel['规则分类'] = row['规则分类']||'GC';
      formModel['TR规则'] = row['TR规则']||'按固定值不叠加';
      formModel['适用检验类型'] = driftInspList(row['适用检验类型']||row['使用检验类型']);
      formModel['使用检验类型'] = formModel['适用检验类型'];
      formModel['备注'] = row['备注']==='—' ? '' : (row['备注']||'');
      formSwitch['启用状态'] = row['启用状态']!=='禁用';
      const imps = (row._impurities && row._impurities.length) ? row._impurities : (row._known||[]);
      driftImpurityRows.value = imps.length ? imps.map(r=> ({
        是否主峰: r['是否主峰']||'否',
        典型保留时间: r['典型保留时间']||'',
        定性结构: r['定性结构']||'',
        标准结果值: r['标准结果值']||'',
        UCL: (r.UCL && typeof r.UCL==='object') ? (r.UCL.val||'') : (r.UCL||''),
        LCL: (r.LCL && typeof r.LCL==='object') ? (r.LCL.val||'') : (r.LCL||'')
      })) : [newDriftImpurity()];
      const rrts = row._rrtRules || [];
      if(rrts.length){
        driftRrtRows.value = rrts.map(r=> ({
          时间范围起: r.时间范围起||'', 时间范围止: r.时间范围止||'',
          下限符号: r.下限符号||'-', 下限数值: r.下限数值||'',
          上限符号: r.上限符号||'+', 上限数值: r.上限数值||''
        }));
      } else {
        // 兼容旧数据：规则级偏差范围下限/上限 → 一条全范围 RRT 规则
        const lo = String(row['偏差范围下限']||'').trim();
        const hi = String(row['偏差范围上限']||'').trim();
        if(lo || hi){
          const parseSigned = (s)=>{
            const t = String(s||'').trim();
            if(!t) return { sign:'+', val:'' };
            if(t.startsWith('-')) return { sign:'-', val: t.slice(1) };
            if(t.startsWith('+')) return { sign:'+', val: t.slice(1) };
            return { sign:'+', val: t };
          };
          const a = parseSigned(lo), b = parseSigned(hi);
          driftRrtRows.value = [{ 时间范围起:'0', 时间范围止:'999', 下限符号:a.sign, 下限数值:a.val, 上限符号:b.sign, 上限数值:b.val }];
        } else {
          driftRrtRows.value = [newDriftRrtRule()];
        }
      }
      driftRrtSelected.value = [];
      driftFilterMin.value = (row._filter && row._filter.min) || '';
      driftFilterMax.value = (row._filter && row._filter.max) || '';
      driftNewUCL.value = row._newUCL!=null ? String(row._newUCL) : ((row._ucl && row._ucl.val) || '');
      driftNewLCL.value = row._newLCL!=null ? String(row._newLCL) : ((row._lcl && row._lcl.val) || '');
      driftMatRows.value = (row._mats||[]).map(r=> ({ 物料编码:r['物料编码']||'', 物料名称:r['物料名称']||'' }));
      if(!driftMatRows.value.length) driftMatRows.value = [newDriftMat()];
      const cols = row._columns || row._cols || [];
      driftColRows.value = cols.map(c=> ({ 色谱柱型号: (c && c['色谱柱型号']) || c || '' }));
      if(!driftColRows.value.length) driftColRows.value = [newDriftCol()];
      if(!isCopy) formModel._editId = row.id;
    }
    function openDriftForm(mode, row){
      openForm(mode==='detail'?'detail':(mode==='edit'?'edit':(mode==='copy'?'copy':'add')));
      if(mode==='add') resetDriftForm();
      else fillDriftForm(row, mode==='copy');
    }
    // 漂移规则匹配：物料编码 + 色谱柱型号 + 检验类型；仅启用规则，创建时间倒序（多条时首条即最新）
    function driftMatchRules(matCode, colType, inspType){
      const list = driftRowsOf().filter(r=> r['启用状态']!=='禁用');
      const mc = String(matCode||'').trim(), ct = String(colType||'').trim(), it = String(inspType||'').trim();
      return list.filter(r=>{
        const mats = (r._mats||[]).map(m=> m['物料编码']);
        if(mc && !mats.includes(mc)) return false;
        const cols = (r._columns||r._cols||[]).map(c=> (c && c['色谱柱型号']) || c);
        if(ct && cols.length && !cols.includes(ct)) return false;
        if(it){
          const types = driftInspList(r['使用检验类型']||r['适用检验类型']);
          if(types.length && !types.includes(it)) return false;
        }
        return true;
      }).sort((a, b)=> String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')));
    }
    function driftMatchRule(matCode, colType, inspType){
      return driftMatchRules(matCode, colType, inspType)[0] || null;
    }
    function driftRuleWindows(rule){
      if(!rule) return null;
      const rrtRules = rule._rrtRules || [];
      const imps = (rule._impurities||rule._known||[]).map(x=>{
        const tr = driftNum(x.典型保留时间);
        if(tr==null) return null;
        const range = driftRangeByRrt(tr, rrtRules, x.有效范围下限, x.有效范围上限);
        return {
          典型保留时间: tr,
          下限: range.lo==null ? tr : range.lo,
          上限: range.hi==null ? tr : range.hi,
          是否主峰: x.是否主峰==='是',
          定性结构: x.定性结构||'',
          标准结果值: String(x.标准结果值||'').trim(),
          UCL: (x.UCL && typeof x.UCL==='object') ? (x.UCL.val||'') : (x.UCL||''),
          LCL: (x.LCL && typeof x.LCL==='object') ? (x.LCL.val||'') : (x.LCL||'')
        };
      }).filter(Boolean);
      return imps.length ? imps : null;
    }
    function saveDriftForm(){
      const txt = k=> String(formModel[k]==null?'':formModel[k]).trim();
      const code = txt('规则编码'), name = txt('规则名称'), cat = txt('规则分类'), tr = txt('TR规则') || txt('典型保留时间规则');
      const inspArr = driftInspList(formModel['适用检验类型']||formModel['使用检验类型']);
      if(!code){ ElMessage.warning('请填写规则编码'); return; }
      if(!name){ ElMessage.warning('请填写规则名称'); return; }
      if(!cat){ ElMessage.warning('请选择规则分类'); return; }
      if(!tr){ ElMessage.warning('请选择 TR规则'); return; }
      if(!inspArr.length){ ElMessage.warning('请选择适用检验类型'); return; }
      const mats = driftMatRows.value.map(r=> ({ 物料编码:String(r.物料编码||'').trim(), 物料名称:String(r.物料名称||'').trim() })).filter(r=> r.物料编码);
      const cols = driftColRows.value.map(r=> ({ 色谱柱型号:String(r.色谱柱型号||'').trim() })).filter(r=> r.色谱柱型号);
      if(!mats.length){ ElMessage.warning('请至少添加一条适用物料'); return; }
      if(!cols.length){ ElMessage.warning('请至少添加一条色谱柱型号'); return; }
      if(new Set(mats.map(m=> m.物料编码)).size!==mats.length){ ElMessage.warning('适用物料不可重复'); return; }
      if(new Set(cols.map(c=> c.色谱柱型号)).size!==cols.length){ ElMessage.warning('色谱柱型号不可重复'); return; }
      const rrtRules = driftRrtRows.value.map(r=> ({
        时间范围起: String(r.时间范围起||'').trim(),
        时间范围止: String(r.时间范围止||'').trim(),
        下限符号: r.下限符号==='+' ? '+' : '-',
        下限数值: String(r.下限数值||'').trim(),
        上限符号: r.上限符号==='+' ? '+' : '-',
        上限数值: String(r.上限数值||'').trim()
      })).filter(r=> r.时间范围起 || r.时间范围止 || r.下限数值 || r.上限数值);
      for(const r of rrtRules){
        const a = driftNum(r.时间范围起), b = driftNum(r.时间范围止);
        if(a!=null && b!=null && a>b){ ElMessage.warning('时间范围起不可大于止'); return; }
        const loOff = driftSignedOffset(r.下限符号, r.下限数值);
        const hiOff = driftSignedOffset(r.上限符号, r.上限数值);
        if(loOff!=null && hiOff!=null && loOff>hiOff){ ElMessage.warning('RRT&TR差值范围下限不可大于上限'); return; }
      }
      const imps = driftImpurityRows.value.map(r=> {
        const tr = String(r.典型保留时间||'').trim();
        const trn = driftNum(tr);
        const range = driftRangeByRrt(trn, rrtRules, '', '');
        return {
          是否主峰: r.是否主峰==='是' ? '是' : '否',
          典型保留时间: tr,
          有效范围下限: (trn!=null && range.lo!=null) ? String(Number(range.lo.toFixed(4))) : '',
          有效范围上限: (trn!=null && range.hi!=null) ? String(Number(range.hi.toFixed(4))) : '',
          定性结构: String(r.定性结构||'').trim(),
          标准结果值: String(r.标准结果值||'').trim(),
          UCL: String(r.UCL||'').trim(),
          LCL: String(r.LCL||'').trim()
        };
      }).filter(r=> r.典型保留时间);
      if(imps.filter(r=> r.是否主峰==='是').length>2){ ElMessage.warning('已知杂质项目最多支持双主峰（2 条）'); return; }
      for(const r of imps){
        if(r.标准结果值 && driftNum(r.标准结果值)==null){ ElMessage.warning('标准结果值须为数字（典型保留时间 '+r.典型保留时间+'）'); return; }
      }
      const isAdd = formMode.value!=='edit';
      const list = driftRowsOf();
      for(const x of list){
        if(!isAdd && x.id===formModel._editId) continue;
        if(x['规则分类']===cat && x['规则编码']===code){ ElMessage.warning('规则编码「'+code+'」已存在'); return; }
        if(x['规则分类']===cat && x['规则名称']===name){ ElMessage.warning('规则名称「'+name+'」已存在'); return; }
        const xt = new Set(driftInspList(x['使用检验类型']||x['适用检验类型']));
        const xm = new Set((x._mats||[]).map(m=> m['物料编码']));
        const sameType = inspArr.every(t=> xt.has(t)) && [...xt].every(t=> inspArr.includes(t));
        const sameMat = mats.every(m=> xm.has(m.物料编码)) && [...xm].every(c=> mats.some(m=> m.物料编码===c));
        if(sameType && sameMat){ ElMessage.warning('适用检验类型 + 适用物料 组合与规则 '+x['规则编码']+' 重复'); return; }
      }
      const inspText = inspArr.join('、');
      const rrtText = driftRrtSummary(rrtRules) || '—';
      const firstRrt = rrtRules[0] || null;
      const payload = {
        规则编码: code, 规则名称: name, 规则分类: cat, TR规则: tr,
        使用检验类型: inspText, 适用检验类型: inspText,
        偏差范围: rrtText==='—' ? '' : rrtText, 'RRT&TR的偏差范围': rrtText,
        偏差范围下限: firstRrt ? driftFmtSigned(firstRrt.下限符号, firstRrt.下限数值) : '',
        偏差范围上限: firstRrt ? driftFmtSigned(firstRrt.上限符号, firstRrt.上限数值) : '',
        杂质个数: imps.length,
        适用物料: mats.map(m=> m.物料名称||m.物料编码).join('、') || '—',
        适用色谱柱: cols.map(c=> c.色谱柱型号).join('、') || '—',
        备注: txt('备注')||'—',
        启用状态: formSwitch['启用状态']===false ? '禁用' : '启用',
        _mats: mats, _columns: cols, _cols: cols, _impurities: imps, _rrtRules: rrtRules,
        _filter: { min: String(driftFilterMin.value||'').trim(), max: String(driftFilterMax.value||'').trim() },
        _newUCL: String(driftNewUCL.value||'').trim(), _newLCL: String(driftNewLCL.value||'').trim(),
        _known: imps.map(r=> Object.assign({}, r, { 创建方式:'手动', 创建时间: nowStamp() }))
      };
      if(isAdd){
        list.unshift(Object.assign({ id:'dr-'+Date.now() }, payload, { 创建人:'管理员', 创建时间: nowStamp() }));
      } else {
        const cur = list.find(r=> r.id===formModel._editId);
        if(!cur){ ElMessage.warning('未找到待编辑数据'); return; }
        Object.assign(cur, payload);
      }
      // 保存成功后按规则字段同步 GC / LC 台账的分类与表头列
      const _savedRule = isAdd ? list[0] : list.find(r=> r.id===formModel._editId);
      const _sync = syncChromLedgerByRule(_savedRule);
      formVisible.value = false; bumpStore();
      const _base = isAdd ? ('已新增漂移规则 '+code) : '保存成功';
      if(_sync.pageId && (_sync.added + _sync.updated + _sync.removed) > 0){
        const _pn = _sync.pageId === 'np-0208-04' ? 'GC台账' : 'LC台账';
        ElMessage.success(_base + '；已按规则更新' + _pn + '分类（派生展示，本次涉及 ' + (_sync.added + _sync.updated) + ' 项' + (_sync.removed ? '，清理 ' + _sync.removed : '') + '）');
      } else {
        ElMessage.success(_base);
      }
      if(_sync.note) ElMessage.warning('台账同步提示：' + _sync.note);
    }
