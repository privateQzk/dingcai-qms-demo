    function selectDictType(n){
      if(n.分组节点){
        toggleDictTypeNode(n);
        return;
      }
      dictTypeId.value = dictTypeId.value===n.id ? '' : n.id;
      selectedIds.value=[]; pageNum.value=1;
      if(!isChromLedgerPage()) resetQueryModel();
    }
    function openDictTypeForm(mode, node){
      dictTypeFormMode.value = mode;
      if(mode==='edit' && node){
        Object.assign(dictTypeForm, { id:node.id, 编码:node.编码, 名称:node.名称, 上级字典:node.上级字典||'', 备注:node.备注||'', 系统开发:!!node.系统开发, 分组节点:!!node.分组节点 });
      } else {
        let parent = '';
        if(dictTypeId.value){
          const cur = dictTypes.value.find(t=> t.id===dictTypeId.value);
          if(cur) parent = cur.分组节点 ? cur.id : (cur.上级字典 || '');
        }
        Object.assign(dictTypeForm, { id:'', 编码:'', 名称:'', 上级字典:parent, 备注:'', 系统开发:false, 分组节点:false });
      }
      dictTypeFormVisible.value = true;
    }
    function onDictTypeFormOk(){
      const name = String(dictTypeForm.名称||'').trim();
      if(!name){ ElMessage.error('请填写名称'); return; }
      const types = ((MOCK.dict = MOCK.dict || {}).types = (MOCK.dict.types || []));
      if(types.some(t=> t['名称']===name && t.id!==dictTypeForm.id)){ ElMessage.error('字典类型名称已存在'); return; }
      let parentId = dictTypeForm.分组节点 ? '' : (dictTypeForm['上级字典']||'');
      if(parentId && dictTypeForm.id){
        const blocked = new Set([dictTypeForm.id]);
        const walk = (pid)=>{
          types.forEach(t=>{
            if(t.上级字典===pid && !blocked.has(t.id)){ blocked.add(t.id); walk(t.id); }
          });
        };
        walk(dictTypeForm.id);
        if(blocked.has(parentId)){ ElMessage.error('上级字典不能选择自身或下级'); return; }
      }
      if(dictTypeFormMode.value==='add'){
        const id = 't' + Date.now();
        const code = 'DICT_' + id;
        const row = { id, 编码:code, 名称:name, 上级字典:parentId, 备注:dictTypeForm['备注']||'', 系统开发:false, 分组节点:false };
        types.push(row);
      } else {
        const cur = types.find(t=> t.id===dictTypeForm.id);
        if(!cur){ ElMessage.error('未找到字典类型'); return; }
        Object.assign(cur, { 名称:name, 上级字典: cur.分组节点 ? '' : parentId, 备注:dictTypeForm['备注']||'' });
      }
      dictTypes.value = [...types];
      dictTypeFormVisible.value=false;
      bumpStore();
      ElMessage.success(dictTypeFormMode.value==='add'?'字典类型已新增':'字典类型已保存');
    }
    function removeDictType(n){
      if(n.系统开发){ ElMessage.error('系统内置数据不可删除'); return; }
      const types = ((MOCK.dict||{}).types||[]);
      if(types.some(t=> t.上级字典===n.id)){ ElMessage.error('该字典类型下存在下级类型，无法删除'); return; }
      const hasItems = ((MOCK.dict?.main)||[]).some(r=>r.typeId===n.id);
      if(hasItems){ ElMessage.error('该字典类型下存在字典项，无法删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除所选字典类型？若该类型下存在字典项，则无法删除。','删除确认',{
        confirmButtonText:'确认删除', cancelButtonText:'取消', type:'warning'
      }).then(()=>{
        MOCK.dict.types = types.filter(t=> t.id!==n.id);
        dictTypes.value = [...MOCK.dict.types];
        if(dictTypeId.value===n.id) dictTypeId.value = '';
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }
    function hasProdPickLotDetails(row){
      if(!row) return false;
      const details = row._lotDetails;
      if(Array.isArray(details) && details.length) return true;
      const tankNo = String(row['储罐编号']||'').trim();
      return !!tankNo && tankNo !== '—' && String(row['档案类型']||'') === '储罐';
    }
    function formatProdPickLotsText(row){
      if(!row) return '—';
      const unit = String(row['库存单位']||'KG').trim() || 'KG';
      const details = Array.isArray(row._lotDetails) ? row._lotDetails : [];
      if(details.length){
        return details.map(d=>{
          const lot = String(d['批号']||d.lot||'').trim() || '—';
          const qty = d['领出数量']!=null ? d['领出数量'] : (d.qty!=null ? d.qty : '—');
          const u = String(d['库存单位']||d.unit||unit).trim() || unit;
          return `${lot}（${qty} ${u}）`;
        }).join('；');
      }
      return String(row['物料批号']||'').trim() || '—';
    }
    function findTankArchLineByLot(tankNo, lot){
      const tn = String(tankNo||'').trim();
      const lt = String(lot||'').trim();
      if(!tn || !lt || lt==='—') return null;
      const rows = ((MOCK['tank-arch']||{}).main||[]);
      const arch = rows.find(r=> String(r['储罐编号']||'').trim()===tn || String(r['条码号']||'').trim()===tn);
      if(!arch) return null;
      const lines = Array.isArray(arch._lines) ? arch._lines : [];
      return lines.find(ln=> String(ln['批号']||'').trim()===lt) || null;
    }
    function openProdPickLotDetail(row){
      if(!row) return;
      const unit = String(row['库存单位']||'KG').trim() || 'KG';
      const tankNo = String(row['储罐编号']||'').trim();
      let details = Array.isArray(row._lotDetails) ? row._lotDetails.slice() : [];
      if(!details.length){
        const lot = String(row['物料批号']||'').trim();
        if(lot && lot!=='—'){
          details = [{ 批号: lot, 领出数量: row['总数量'], 库存单位: unit }];
        }
      }
      prodPickLotRows.value = details.map(d=>{
        const lot = String(d['批号']||d.lot||'').trim() || '—';
        const qty = d['领出数量']!=null ? d['领出数量'] : (d.qty!=null ? d.qty : '—');
        const u = String(d['库存单位']||d.unit||unit).trim() || unit;
        const archLn = findTankArchLineByLot(tankNo, lot) || {};
        const matParts = String(row['物料信息']||'').split('/').map(s=>s.trim());
        return {
          批号: lot,
          领出数量: qty,
          库存单位: u,
          物料编码: archLn['物料编码'] || d['物料编码'] || matParts[0] || '—',
          物料名称: archLn['物料名称'] || d['物料名称'] || matParts[1] || '—',
          物料规格: archLn['物料规格'] || d['物料规格'] || matParts[2] || '—',
          物料种类: archLn['物料种类'] || d['物料种类'] || matParts[3] || '—',
          生产厂家: archLn['生产厂家'] || d['生产厂家'] || '—',
          供应商名称: archLn['供应商名称'] || d['供应商名称'] || '—',
          生产日期: archLn['生产日期'] || d['生产日期'] || '—',
          有效期: archLn['有效期'] || d['有效期'] || '—',
          失效日期: archLn['失效日期'] || d['失效日期'] || '—',
        };
      });
      prodPickLotHead.value = {
        储罐编号: tankNo || '—',
        条码号: row['条码号'] || '—',
        出库单号: row['出库单号'] || '—',
        总数量: row['总数量'] || '—',
        库存单位: unit,
      };
      prodPickLotTitle.value = tankNo && tankNo!=='—'
        ? ((pageId.value==='wh-other-out' ? '出库批号详情' : '领出批号详情') + ` — ${tankNo}`)
        : (pageId.value==='wh-other-out' ? '出库批号详情' : '领出批号详情');
      prodPickLotVisible.value = true;
    }
    function tagClass(s){
      const v = String(s == null ? '' : s).trim();
      if(pageId.value==='np-0601-01'){
        if(v==='手动') return 'tag-b';
        if(v==='自动') return 'tag-g';
      }
      if(pageId.value==='insp-project'){
        if(v==='通用') return 'tag-gr';
        if(v==='器件测试') return 'tag-p';
        if(v==='玻璃板测试') return 'tag-b';
      }
      if(pageId.value===DEV_PAGE){
        const m = { '待发起':'tag-o','已发起':'tag-b','已关闭':'tag-gr','已完成':'tag-g','合格':'tag-g','不合格':'tag-r' };
        if(m[v]) return m[v];
      }
      if(pageId.value===PLATE_PAGE){
        const m = { '待发起':'tag-o','已发起':'tag-b','已关闭':'tag-gr','已完成':'tag-g' };
        if(m[v]) return m[v];
      }
      if(pageId.value===CASS_PAGE){
        const m = { '光刻胶生产':'tag-b','光刻胶研发':'tag-p' };
        if(m[v]) return m[v];
      }
      if(pageId.value===SPI_PAGE){
        const m = { 正常:'tag-g', 异常:'tag-r', 启用:'tag-g', 禁用:'tag-gr', 已识别:'tag-g', 已匹配:'tag-b', 待识别:'tag-o' };
        if(m[v]) return m[v];
      }
      if(isChromLedgerPage()){
        const m = { 是:'tag-r', 否:'tag-g', 正常:'tag-g', 异常:'tag-r' };
        if(m[v]) return m[v];
      }
      if(pageId.value==='capa-internal'){
        const m = { 待发起:'tag-o', 执行中:'tag-b', 已完成:'tag-g', 已关闭:'tag-gr' };
        if(m[v]) return m[v];
      }
      if(pageId.value===CI_PAGE || pageId.value===CHG_PAGE || pageId.value==='np-0211-01' || pageId.value==='np-0211-02'){
        const m = { 待发起:'tag-o', 执行中:'tag-b', 已完成:'tag-g', 已关闭:'tag-gr' };
        if(m[v]) return m[v];
      }
      if(isTyPage()){
        const m = { '/':'tag-gr', 审核中:'tag-b', 审核通过:'tag-g', 审核驳回:'tag-r', 审核撤销:'tag-o' };
        if(m[v]) return m[v];
      }
      if(String(pageId.value||'').startsWith('np-0215') || hmHist.visible){
        const m = {
          厂内标准:'tag-b', 客户标准:'tag-c', 法规要求:'tag-p',
          厂内文件:'tag-b', 客户文件:'tag-c', 法规文件:'tag-p', 新增:'tag-g',
          启用:'tag-g', 禁用:'tag-gr',
          正常:'tag-g', 临期:'tag-o', 过期:'tag-r',
          未导入:'tag-gr', 已导入:'tag-g', 未变更:'tag-gr', 已变更:'tag-g', 未作废:'tag-gr', 已作废:'tag-g',
          导入:'tag-b', 变更:'tag-o', 作废:'tag-gr',
          '/':'tag-gr', 审核中:'tag-b', 审核通过:'tag-g', 审核驳回:'tag-r', 审核撤销:'tag-o'
        };
        if(m[v]) return m[v];
      }
      if(pageId.value===BIAS_PAGE){
        const m = { 待执行:'tag-b', 已完成:'tag-g', 可接受:'tag-g', 不可接受:'tag-r' };
        if(m[v]) return m[v];
      }
      if(pageId.value===MSA_PAGE || pageId.value===STB_PAGE){
        const m = { 待执行:'tag-o', 执行中:'tag-b', 已完成:'tag-g', 已关闭:'tag-gr', 正常:'tag-g', 逾期:'tag-r', 待录入:'tag-gr', 保存:'tag-b', 提交:'tag-g' };
        if(m[v]) return m[v];
      }
      if(pageId.value===WX_PAGE){
        const m = { 待发起:'tag-o', 维修中:'tag-b', 待处理:'tag-o', 已完成:'tag-g', 已关闭:'tag-gr' };
        if(m[v]) return m[v];
      }
      if([BX_PAGE, CL_PAGE, WO_PAGE, MY_WX_PAGE, YS_PAGE].includes(pageId.value)){
        const m = { 待处理:'tag-o', 待维修:'tag-o', 维修中:'tag-b', 验收中:'tag-c', 待验收:'tag-c', 结单:'tag-g', 退修:'tag-r', 已关闭:'tag-gr', 一般:'tag-gr', 紧急:'tag-r', 通过:'tag-g', 不通过:'tag-r' };
        if(m[v]) return m[v];
      }
      if(pageId.value===SR_PAGE){
        const m = { 正常:'tag-g', 超时:'tag-r', 待处理:'tag-o', 待审核:'tag-b', 审核驳回:'tag-r', 已完成:'tag-g' };
        if(m[v]) return m[v];
      }
      if(pageId.value===MAINT_PERSON_PAGE){
        const m = { 在职:'tag-b', 试用:'tag-o', 离职:'tag-gr' };
        if(m[v]) return m[v];
      }
      if(isDjSchemePage()){
        const m = { 启用:'tag-g', 禁用:'tag-gr', 在用:'tag-g', 停用:'tag-o', 报废:'tag-gr', 多次:'tag-b', 单次:'tag-o' };
        if(m[v]) return m[v];
      }
      if(isDjPlanPage() || isDjMyPage()){
        const m = { 待执行:'tag-o', 执行中:'tag-b', 已完成:'tag-g', 已关闭:'tag-gr', 逾期:'tag-r', 正常:'tag-g', 异常:'tag-r', 自动:'tag-b', 手动:'tag-gr', 在用:'tag-g', 停用:'tag-o', 报废:'tag-gr' };
        if(m[v]) return m[v];
      }
      if(pageId.value===LAB_CALIB){
        if(v==='成功') return 'tag-g';
        if(v==='失败') return 'tag-r';
      }
      if(LAB_OPEN_PAGES.has(pageId.value)){
        if(v==='正常') return 'tag-g';
        if(v==='临期') return 'tag-o';
        if(v==='过期') return 'tag-r';
      }
      if(v==='已开封') return 'tag-o';
      if(v==='未开封') return 'tag-gr';
      if(pageId.value===YL_PAGE){
        const m = { 正常:'tag-g', 合格:'tag-g', 异常:'tag-r', 不合格:'tag-r' };
        if(m[v]) return m[v];
      }
      if(pageId.value===WJ_ORDER){
        const m = { 待执行:'tag-o', 执行中:'tag-b', 已完成:'tag-g', 已关闭:'tag-gr', 临期:'tag-o', 过期:'tag-r', 正常:'tag-g', 合格:'tag-g', 不合格:'tag-r' };
        if(m[v]) return m[v];
      }
      if(pageId.value===NJ_TODO || pageId.value===WJ_TODO){
        const m = { 临期:'tag-o', 过期:'tag-r', 在用:'tag-g', 合格:'tag-g', 不合格:'tag-r' };
        if(m[v]) return m[v];
      }
      if(EXPIRY_PAGES[pageId.value]){
        if(v==='临期') return 'tag-o';
        if(v==='过期') return 'tag-r';
      }
      if(pageId.value==='wh-so-prep'){
        if(v==='待执行') return 'tag-o';
        if(v==='执行中') return 'tag-b';
        if(v==='已完成') return 'tag-g';
      }
      if(pageId.value==='np-0501-01'){
        if(v==='开启') return 'tag-b';
        if(v==='关闭') return 'tag-p';
      }
      if(pageId.value==='np-0502-01'){
        if(v==='合格') return 'tag-g';
        if(v==='不合格') return 'tag-r';
        if(v==='OOC') return 'tag-o';
      }
      if(pageId.value===SLOC_PAGE){
        const m = { '未入位':'tag-gr','在库':'tag-g','在筐':'tag-b','领用中':'tag-o','报废':'tag-gr','留样':'tag-c',
          '样品入库':'tag-g','领用检验':'tag-o','样品处置':'tag-gr' };
        if(m[v]) return m[v];
      }
      if(pageId.value===FLOW_MY_TASK){
        const m = { '已填写':'tag-g','未填写':'tag-o','正常':'tag-g','逾期':'tag-r','锁定':'tag-g','已排程':'tag-o','待排程':'tag-gr' };
        if(m[v]) return m[v];
      }
      if(pageId.value===TASK_PAGE || pageId.value===TIME_FB_PAGE || pageId.value===DISPATCH_PAGE || pageId.value==='insp-team'){
        const m = { '未分配':'tag-o','部分分配':'tag-b','完全分配':'tag-g','待分配':'tag-o','已分配':'tag-g','无需分配':'tag-gr',
          '自动分配':'tag-b','手动分配':'tag-p','调整分配':'tag-o',
          '未反馈':'tag-o','部分反馈':'tag-b','完全反馈':'tag-g','已同步':'tag-g','未同步':'tag-o','同步':'tag-b','调整同步':'tag-o',
          'OLED':'tag-b','光刻胶':'tag-c','全部物料':'tag-gr','指定物料':'tag-b',
          '待检验':'tag-o','检验中':'tag-b','母样':'tag-c','子样':'tag-p','未拆分':'tag-gr','已拆分':'tag-g' };
        if(m[v]) return m[v];
      }
      if(pageId.value===COST_PAGE || pageId.value===COST_FLOW || pageId.value===COST_STAT){
        const m = { '指定物料':'tag-b','全部物料':'tag-gr','研发':'tag-p','生产':'tag-b',
          '精确匹配':'tag-g','已匹配':'tag-g','兜底匹配':'tag-o','未配置':'tag-r' };
        if(m[v]) return m[v];
      }
      if(pageId.value===SHIFT_PAGE){
        const m = { '是':'tag-b','否':'tag-gr','启用':'tag-g','禁用':'tag-gr' };
        if(m[v]) return m[v];
      }
      if(pageId.value===SLPOS_PAGE){
        const m = { '样品货架':'tag-b','样品筐':'tag-c','仪器分析':'tag-b','理化检测':'tag-g','外送检测':'tag-o','已打印':'tag-g','未打印':'tag-gr' };
        if(m[v]) return m[v];
      }
      if((pageId.value||'').startsWith('lg-kpi')){
        if(v==='合格') return 'tag-g';
        if(v==='优秀') return 'tag-g';
        if(v==='不合格') return 'tag-r';
      }
      return {
        '待执行':'tag-b','执行中':'tag-p','检验中':'tag-p','已完成':'tag-g','已关闭':'tag-gr',
        '未拆分':'tag-gr','已拆分':'tag-b','母样':'tag-c','子样':'tag-p',
        '待入库':'tag-b','入库中':'tag-p','待发料':'tag-b','发料中':'tag-p',
        '启用':'tag-g','禁用':'tag-gr','在用':'tag-g','冻结':'tag-p','报废':'tag-gr',
        '原料':'tag-b','中间体':'tag-c','成品':'tag-g','辅材':'tag-y',
        '面板厂':'tag-b','晶圆厂':'tag-c','经销商':'tag-p','贸易商':'tag-y','科研院所':'tag-o',
        '已绑定':'tag-g','未绑定':'tag-gr','仓库':'tag-b','线边仓':'tag-p','厂外':'tag-gr',
        '正常':'tag-g','合格':'tag-g','不合格':'tag-r','NA':'tag-gr','让步接收':'tag-o','异常':'tag-r','逾期':'tag-r','未逾期':'tag-g','待检':'tag-o','待检验':'tag-o','未完成':'tag-o','待判定':'tag-p','特采':'tag-b','留样复测':'tag-b',
        '低最小库存':'tag-o','超最大库存':'tag-r','超有效期':'tag-o',
        '即将过期':'tag-o','已过期':'tag-r','库龄超限':'tag-p',
        '待完善':'tag-b','草稿':'tag-gr','进行中':'tag-p','已暂停':'tag-o','已终止':'tag-gr',
        '待派车':'tag-b','已派车':'tag-g','待运输':'tag-y','运输中':'tag-w',
        '待放行':'tag-y','已放行':'tag-g','已作废':'tag-gr',
        '待审核':'tag-p','审核中':'tag-b','已通过':'tag-g','已拒绝':'tag-gr','已驳回':'tag-gr',
        '待调度':'tag-b','已调度':'tag-y',
        '未签收':'tag-gr','部分签收':'tag-p',
        '/':'tag-gr','待结算':'tag-c','已结算':'tag-g',
        '待发运':'tag-b','已到达':'tag-g','已签收':'tag-g','已取消':'tag-gr',
        '未确认':'tag-gr','已确认':'tag-g',
        '普货':'tag-b','危货':'tag-w',
        '正常行驶':'tag-g','服务区休息':'tag-b','即将到达':'tag-p',
        '堵车':'tag-p','车辆故障':'tag-gr','交通事故':'tag-gr','其他':'tag-gr',
        '置空':'tag-gr','待复核':'tag-p','已复核':'tag-g','复核中':'tag-p',
        '审核通过':'tag-g','审核驳回':'tag-r','审核撤销':'tag-o','已发起':'tag-b','加签通过':'tag-g','待签':'tag-y','同意':'tag-g',
        '单次':'tag-b','多次':'tag-p','自动':'tag-b','手动':'tag-p',
        '待盘':'tag-o','盘盈':'tag-b','盘亏':'tag-r',
        '待处理':'tag-gr','处理中':'tag-b','已处理':'tag-g',
        '轻微':'tag-b','一般':'tag-y','严重':'tag-p','重大':'tag-r',
        '承运商':'tag-r','我方/发货方':'tag-p','收货方':'tag-b',
        'OOS':'tag-r','OOC':'tag-o','OOW':'tag-o','OOT':'tag-o','无偏差':'tag-g','有偏差':'tag-p',
        '开立':'tag-b','已提交':'tag-p','已生效':'tag-g','已作废':'tag-gr',
        '待取样':'tag-o','已取样':'tag-b','待录入':'tag-o','已录入':'tag-b',
        '通过':'tag-g','不通过':'tag-r','免检':'tag-c',
        '高':'tag-r','中':'tag-o','低':'tag-c',
      }[v] || 'tag-gr';
    }
    function displayTagValue(row, field){
      const raw = row && field != null ? row[field] : '';
      const v = String(raw == null ? '' : raw).trim();
      if(!v || v === '-' || v === '—'){
        if(field === '检验状态') return '待检验';
        return '—';
      }
      if(field === '检验状态' && v === '待检') return '待检验';
      return v;
    }

    let unsubStore = null;
    let syncApplying = false;
    let syncToastTimer = null;
    const SYNC_TOAST_SKIP = { storage: 1, 'mock-storage': 1, 'mock-save': 1 };
    onMounted(()=> {
      syncAllPoReceivedQty();
      onSelectMenu(startId);
      cockpitMenuLive = true;
      const startTabs = (page.value?.tabs?.length ? page.value.tabs : page.value?.tabViews) || [];
      if(hashState.tab && hashState.tab !== activeTab.value && startTabs.some(t=> t.name === hashState.tab)){
        activeTab.value = hashState.tab;
        onTabChange();
      }
      watch([pageId, activeTab], ([p, t])=>{
        const hash = '#page=' + encodeURIComponent(p) + '&tab=' + encodeURIComponent(t || '');
        if(location.hash === hash) return;
        try{ history.replaceState(null, '', hash); }catch(e){ location.replace(hash); }
      }, { immediate: true });
      if(STORE){
        unsubStore = STORE.subscribe((msg)=>{
          if(syncApplying) return;
          syncApplying = true;
          try {
          if (msg && (msg.reason === 'mock-storage' || msg.reason === 'mock-save') && STORE.hydrateMock) {
            STORE.hydrateMock(MOCK);
            storeTick.value += 1;
          }
          if (STORE.applyWhPoInToMock) STORE.applyWhPoInToMock(MOCK);
          syncAllPoReceivedQty();
          if (STORE.applyWhPoRetToMock) STORE.applyWhPoRetToMock(MOCK);
          if (STORE.applyWhOsIssueToMock) STORE.applyWhOsIssueToMock(MOCK);
          if (STORE.applyWhProdIssueToMock) STORE.applyWhProdIssueToMock(MOCK);
          if (STORE.applyWhProdRetToMock) STORE.applyWhProdRetToMock(MOCK);
          if (STORE.applyWhProdInToMock) STORE.applyWhProdInToMock(MOCK);
          if (STORE.applyWhOsRetMatToMock) STORE.applyWhOsRetMatToMock(MOCK);
          if (STORE.applyWhOsRecvToMock) STORE.applyWhOsRecvToMock(MOCK);
          if (STORE.applyWhOsRetGoodsToMock) STORE.applyWhOsRetGoodsToMock(MOCK);
          if (STORE.applyWhSoPrepToMock) STORE.applyWhSoPrepToMock(MOCK);
          if (STORE.applyWhSoPreoutToMock) STORE.applyWhSoPreoutToMock(MOCK);
          if (STORE.applyWhSoShipToMock) STORE.applyWhSoShipToMock(MOCK);
          if (STORE.applyWhSoRetToMock) STORE.applyWhSoRetToMock(MOCK);
          ((MOCK['lg-waybill']||{}).main||[]).forEach(w=>{
            const over = STORE.overlayPcRow('lg-waybill', w);
            const st = over['状态'] || w['状态'];
            const settle = over['结算状态'] || w['结算状态'];
            ensureSignFromWaybill(Object.assign({}, w, { 状态: st, 结算状态: settle }));
            if(st==='已签收' || st==='已完成' || settle==='待结算' || settle==='已结算'){
              patchSignsByWaybill(w['运单号'], { 状态: '已完成', 收货确认状态: '已确认' }, true);
            }
          });
          storeTick.value += 1;
          if(STORE.saveMockSilent) STORE.saveMockSilent(MOCK);
          if(detailVisible.value && detailRow.value){
            const id = detailRow.value['运单号'] || detailRow.value['单号'] || detailRow.value['入库单号'] || detailRow.value.id;
            const refreshed = tableData.value.find(r => (r['运单号']||r['单号']||r['入库单号']||r.id) === id);
            if(refreshed) openDetail(refreshed);
            else if((page.value?.detailEnrouteFields||[]).length){
              const fromStore = STORE.getEnrouteForPc(pageId.value, detailRow.value);
              if(fromStore && fromStore.length) detailEnrouteRows.value = fromStore.map(r=>({...r}));
              detailRow.value = STORE.overlayPcRow(pageId.value, detailRow.value);
            }
          }
          const reason = msg && msg.reason;
          if(reason && !SYNC_TOAST_SKIP[reason]){
            clearTimeout(syncToastTimer);
            syncToastTimer = setTimeout(()=>{
              ElMessage.success({ message: '已同步 APP 联动更新', duration: 1600 });
            }, 120);
          }
          } finally {
            syncApplying = false;
          }
        });
      }
    });
    onBeforeUnmount(()=>{
      if(typeof unsubStore==='function') unsubStore();
      if(syncToastTimer) clearTimeout(syncToastTimer);
      document.body.classList.remove('remarks-open');
    });

    /** 报检单顺序图：采购来料检 / 生产过程检 / 生产物料检三组（含已完成），组内按报检时间倒序（最新报检在上） */
    const INSP_SEQ_DEFS = [
      { key: 'tab-pi', label: '采购来料检', party: '供应商名称' },
      { key: 'tab-pp', label: '生产过程检', party: '客户名称' },
      { key: 'tab-pm', label: '生产物料检', party: '客户名称' }
    ];
    const inspSeqGroups = computed(()=>{
      const bag = MOCK['insp-order'] || {};
      const rg = Array.isArray(query['报检时间']) ? query['报检时间'] : [];
      const qs = String(rg[0] || '').slice(0,10);
      const qe = String(rg[1] || '').slice(0,10);
      const qm = String(query['物料信息'] || '').split(' / ')[0].trim();
      const qr = String(query['报检人'] || '').trim();
      const qd = String(query['报检部门'] || '').trim();
      return INSP_SEQ_DEFS.map(d=> ({
        key: d.key, label: d.label, party: d.party,
        rows: (Array.isArray(bag[d.key]) ? bag[d.key] : []).slice()
          .filter(r=> !qs || String(r['报检时间'] || '').slice(0,10) >= qs)
          .filter(r=> !qe || String(r['报检时间'] || '').slice(0,10) <= qe)
          .filter(r=> !qm || String(r['物料编码'] || '') === qm || String(r['物料名称'] || '') === qm)
          .filter(r=> !qr || String(r['报检人'] || '').includes(qr))
          .filter(r=> !qd || String(r['报检部门'] || '').includes(qd))
          .sort((a, b)=> String(b['报检时间'] || '').localeCompare(String(a['报检时间'] || '')))
      }));
    });
    return {
      labArchVisible, labArchForm, labArchLines, labArchSelected, labArchPage, labArchPageSize, labArchCfg, labArchKind, labArchDateKey,
      labArchSrcRows, labArchSupplierOpts, RETAIN_WH_OPTS, labArchLocOpts, onLabArchLocChange, openRetainLocPick, labArchLineCols, labArchPagedLines, isLabArchEditable, labArchColWidth,
      onLabArchCodeChange, refreshLabArchExpire, refreshLabArchLineExpire, refreshLabArchEditExpire, onLabArchGenerate, onLabArchRefresh,
      onLabArchPrint, onLabArchDelLines, onLabArchSave,
      biasDataVisible, biasReportVisible, biasRow, biasDraft, biasStats, biasReportResult, openBiasData, openBiasReport, saveBiasData, biasDeviation, onBiasCellBlur, biasChartSvgOf, biasChartSvg, copyBiasPlan, closeBiasPlan, msaFrameSrc, ElMessage, menu, menuRef, activeMenu, defaultOpeneds, page, pageId, activeTab, tabView, currentTabLabel, breadcrumb,
      announceUnread, announceHasContent, announceOpen, openAnnounce, onAnnounceClosed, announceTab, announceKw, announceTerminal, announceProgressKw, announceProgressSide, announceProgressDev, announceNotes, announceProgressSummary, announceLatest, announceHeadline, announceUpdateCount, filteredAnnounceUpdates, filteredAnnounceProgress, dismissAnnounce,
      remarksOpen, remarksNote, remarksTitle, remarksTabDefs, remarksActiveTab, remarksBodyRef, remarksRenderedHtml, remarksToc, remarksTocActive, onRemarksTabClick, onRemarksTocClick, toggleRemarks, closeRemarks,
      query, queryExpanded, hasMoreQuery, visibleQueryFields, selectedIds, pageNum, pageSize, tableData, pagedData, vxeColumns, canMergeShip, canCloseShip, canCloseDispatch, canCloseWaybill, canCloseInspPlan, canCloseLabCountScan, canCloseLabRgIo, canSettleWaybill, canDeleteKpiPlan, isLabCountPage, isLabRgIoPage, LAB_INSP_PLAN, LAB_RG_IN, LAB_RG_OUT, onFormFieldRefresh,
      SPI_PAGE, SPI_YN, isSpiForm, spectrumPeaks, spectrumCalcDone, spectrumNoRule, spectrumNoteVisible, spectrumCols, spectrumRefPeak, spectrumRefOptions, setSpectrumRefPeak, spectrumTROptions, setSpectrumTypicalTR, spectrumNoteGroups, runSpectrumCalc, recalcSpectrum, resetSpectrumCalc, specFilePickVisible, specFilePickId, specFileKw, specFileStatus, specFilePreviewVisible, specFilePreviewRow, qrSpecPreviewVisible, qrSpecPreviewSampleNo, qrSpecPreviewFiles, openQrIssueSpecPreview, specPeaksOf, specPolylineOf, spectrumFileRows, spectrumFileById, spectrumFileStatusOf, spectrumFilePickRows, openSpectrumFilePick, onSpectrumFileRowPick, previewSpectrumFile, confirmSpectrumFilePick, spectrumColumnCodeOptions, spectrumDriftNameOptions, syncSpectrumDriftName, onSpectrumInspTypeChange, onSpectrumMaterialChange, onSpectrumColumnModelChange, spectrumRuleCategoryPlaceholder, syncSpectrumRuleCategory, specPreviewPeaks, specPreviewPolyline, openSpectrumMatPick, spiEnsurePeaks, isChromLedgerPage, chromLedgerKindOf, curDictTypes, CHROM_LEDGER_DIMS, CHROM_LEDGER_DIM_PAIRS, chromLedgerDim, chromLedgerCell, chromLedgerRtStructureMap, chromLedgerEditVisible, chromLedgerEditForm, saveChromLedgerEdit, chromCatAddVisible, chromCatAddForm, chromCatMatOptions, chromCatColOptions, openChromCatAdd, clearChromCatRule, openChromCatDriftPick, onChromCatMatChange, saveChromCatAdd, CI_PAGE, canCloseCi, canDeleteCi, canCloseWx, canCloseIa, canCloseIar, canCapaClose, canCapaBatchDelete, iarYearId, iarYearKw, iarYearNodes, selectIarYear, clearIarYear, iaLinkVisible, iaLinkNos, iaLinkRows, goIaLink, mrbLinkVisible, mrbLinkNos, mrbLinkRows, goMrbLink, disposeLinkVisible, disposeLinkNos, disposeLinkRows, goDisposeLink, capaLinkVisible, capaLinkNos, capaLinkRows, goCapaLink, hcExecVisible, hcExec, hcExecSum, hcExecFile, hcPickVisible, hcPickQ, hcPickRows, hcPickSelected, hcJobVisible, hcJob, hcExecAdd, hcExecDel, hcExecSave, hcExecSubmit, hcExecLineAct, hcExecProcAct, hcExecImport, hcExecOnFile, hcExecStock, hcExecSel, hcExecRowClass, hcPickQuery, hcPickReset, hcPickConfirm, confirmHcJob, CIP_PAGE, tabBadgeOf, procDlg, procForm, submitProcDlg, CHG_PAGE, CC_PAGE, fileListOf, onFilePreview, onFileDownload, COL_PAGE, colModelId, colModelKw, colModelList, colModelVisible, colModelTitle, colModelForm, colImgUrl, colImageUrl, onColModelQuery, selectColModel, openColModel, onColModelOp, saveColModel, removeColModel, colModelMetaText, labJobVisible, labJobRow, labJobCols, labJobForm, openLabIoJob,
      taskAsgVisible, taskAsgTitle, taskAsgHeadCols, taskAsgHeadRows, taskAsgRows, taskAsgForm, taskAsgCatOpts, taskAsgBatchTeams, taskAsgHasAdjust, taskAsgApply, taskAsgTeamChange, taskAsgInstChange, taskAsgJoin, openTaskInstPick, clearTaskInst, confirmTaskAssign,
      timeFbVisible, timeFbTitle, timeFbHeadCols, timeFbHeadRows, timeFbRows, timeFbForm, timeFbApply, timeFbEtaChange, confirmTimeFbSync,
      timeFbDetailVisible, timeFbDetailNo, timeFbDetailRows,
      fbTimeVisible, fbTimeForm, confirmFbTime, fbBatchVisible, fbBatchFill, fbBatchRows, applyFbBatchFill, confirmFbBatch,
      costFlowBatch, openCostFlowEdit, openCostFlowBatch, applyCostFlowBatchFill, confirmCostFlowBatch,
      taskLogVisible, taskLogNo, taskDetailRows,
      devReqVisible, devReqTitle, devReqReadonly, devReqRows, devReqItemRows, devReqForm, removeDevReqRow, confirmDevReq, openDevPick, clearDevSamples,
      devCancelVisible, devCancelRow, devCancelReason, confirmDevCancel, devLaunchVisible, devLaunchNeed, confirmLaunchDevReqs, devLogVisible, devLogNo, devLogRows,
      plateReqVisible, plateReqTitle, plateReqRows, plateReqForm, removePlateReqRow, confirmPlateReq, openPlatePick, clearPlateSamples,
      plateCancelVisible, plateCancelRow, plateCancelReason, confirmPlateCancel, plateLaunchVisible, plateLaunchNeed, confirmLaunchPlateReqs, plateLogVisible, plateLogNo, plateLogRows,
      oqcUploadVisible, oqcUploadRows, oqcUploadFiles, oqcUploadRemark, oqcUploadResult, confirmOqcUpload,
      coaUploadVisible, coaUploadRow, coaUploadFiles, openCoaUpload, confirmCoaUpload,
      matrixWeightVisible, matrixWeightForm, saveMatrixWeight, qualityLevelText, qualityIconStyle,
      ioPickVisible, ioPickMeta, ioPickQ, ioPickTick, ioPickRows, ioPickCurrent, ioPickMulti, ioPickSelected, ioPickTableRef, ioPickRowKey, onIoPickSelection, resetIoPickQ, confirmIoPick, SPLIT_TEAMS, sampSplitVisible, sampSplitForm, sampSplitRows, sampSplitSelected, sampSplitParents, canDeleteSampSplit, canDeleteEnvMon, FLOW_TABS, sampSplitPickVisible, sampSplitPickTableRef, sampSplitPickTab, sampSplitPickShowTabs, reqPickFor, reqPickSingle, sampSplitPickQ, sampSplitPickSelected, sampSplitPickRows, sampSplitPickCols, openSampSplitLedgerPick, confirmSampSplitLedgerPick, SLOC_DESTS, openIoPick, confirmPrintLabel, saveSlposForm, slocDispVisible, slocDispMode, slocDispTitle, slocDispRows, slocDispSelected, slocDispCols, slocDispForm, onSlocDispSelect, slocLocOpts, confirmSlocLoc, SLOC_SCRAP_REASONS, onSlocDispWay, onSlocDispLoc, openSlocDispSupplier, confirmSlocDisp, slocLogVisible, slocLogNo, slocLogRows, genSampSplitRows, removeSampSplitRow, confirmSampleSplit, sampSplitRecordVisible, sampSplitRecordParent, sampSplitRecordRows,
      calibExecVisible, calibExecReadonly, calibExecRow, calibTests, calibTestSel, calibFinal, calibTpl, calibMethod, calibHeadCols, calibMultiStd, calibDoneTests, addCalibTest, removeCalibTests, calcCalibFinal, saveLabCalibExec, submitLabCalibExec, downloadLabCalibPdf,
      calibEntryVisible, calibEntryReadonly, calibEntryIdx, calibEntryTest, openCalibEntry, submitCalibEntry,
      labPrepExecVisible, labPrepExecReadonly, labPrepExecRow, labPrepExec, labPrepLineSel, labPrepReagentPick, labPrepEnvFields, labPrepDevFields, labPrepMethod, labPrepHeadCols, labPrepReagentOptions, labPrepEnumOpts, addLabPrepLine, removeLabPrepLines, saveLabPrepExec, submitLabPrepExec, downloadLabPrepPdf,
      tplTabs, tplCalc, tplRefParamOptions, onTplPubTimesChange, tplKind, isTplForm, tplFormTab, tplRows, tplSel, onTplFlagChange, addTplRow, removeTplRows, onTplAttrChange,
      formVisible, formMode, formDialogTitle, formDialogWidth, formSwitch, formModel, formFieldTipOpen, setFormFieldTip, toggleFormFieldTip, isInspMethodForm, isInspSchemeForm, isQrConfigForm, isDriftRuleForm, isInspProjectCategoryForm, isSampSchemeForm, isFullscreenBizForm, isFullscreenDetail, detailHeaderTableFields, detailHeaderTableRows, isAutoSampForm, isSpcSchemeForm, isWideBizForm, isTreeTypeForm, isSchemeCylinder, sigmaConfigModel, onSigmaConfigConfirm, activeFormSections, isQmsFlowForm, entryCat, entryCats, entryCatRows, entryMethods, entryPickCat, entryStamp, entryResultText, entryFocusItem, entryCatSubmitted, entryMethodTab, entryDescOpen, entryMethodDetail, entryMethodVerOptions, entryOnVersion, entryMats, entryMatSelected, entryMatScan, entryMatScanRef, onEntryMatScan, removeEntryMats, entryExtraFiles, onEntryExtraFile, removeEntryExtraFile, entryInstruments, entryInstrumentOptions, entrySpectra, removeEntrySpectrum, openEntryInherit, entryInheritVisible, entryInheritPickVisible, entryInheritSampleNo, entryInheritPickNo, entryInheritSampleLabel, entryInheritCats, entryInheritMode, entryInheritQ, entryInheritQueryTick, entryInheritPickRows, openEntryInheritPick, confirmEntryInheritPick, clearEntryInheritSample, entryInheritApplySample, entryInheritSrcRow, entryInheritCatOpts, entryInheritPreviewRows, entryInheritAllChecked, entryInheritSomeChecked, entryInheritToggleCat, entryInheritToggleAll, confirmEntryInherit, openEntrySpecPick, entrySpecVisible, entrySpecQuery, entrySpecFiles, entrySpecChecked, entrySpecBatches, entrySpecCols, entrySpecDraft, entrySpecFillCol, entrySpecFillAll, entrySpecAutoFill, confirmEntrySpecPick, openEntryChromPick, entryChromVisible, entryChromFilters, entryChromKey, entryChromList, entryChromColumnOptions, entryChromFilterHint, entryChromRtCols, entryChromRtStructMap, entryChromPickCell, entryChromCellText, ENTRY_CHROM_STAT_FIELDS, entryChromParamNames, entryChromCols, entryChromDraft, entryChromChecked, entryChromAllChecked, entryChromIndeterminate, toggleEntryChromAll, setEntryChromChecked, entryChromAutoFill, entryChromFillByTime, entryChromClearGrid, confirmEntryChromPick, cancelEntryChromPick, entryPubParams, entryPubCols, entryPubCell, entrySetPubCell, entrySampParams, entrySampCols, entryCell, entrySetCell, entryLimitText, entryQuickExpandAll, entryQuickFilledCount, entryCategoryId, entryCategoryKw, filteredEntryCategories, spcProcessId, spcProcessKw, filteredSpcProcesses, activeChartTab, spcChartCards, envStat, costPivot, costFlowDlg, COST_DIMS, COST_MEASURES, inspRpt, inspDetailDlg, INSP_MEASURES, qr, QR_TABS, QR_TAG_FIELDS, qrDef, qrOptions, qrOpenPick, qrClearPick, qrApplyPick, qrQuery, qrReset, qrOnTab, qrCards, qrGroups, qrExport, util, utilPickerType, utilCards, utilDetail, utDefaultRange, utQuery, utReset, utOpenDetail, utExport, ylAdd, ylAddInstOptions, ylAddOpen, ylAddConfirm, SPC_P_TYPES, spcP, spcPMatName, spcPRemoveMat, spcPAddRow, spcPRemoveRow, spcPCopyRow, spcPQuery, wsPick, wsPickOpen, wsPickConfirm, spcPReset, spcPOpenSettings, spcPExport, spcPAnaCols, spcPAnaColWidth, spcPAnaRows, spcPOpenSamples, inspDimChoices, inspColChoices, openInspPick, inspClearPick, inspTypeOptions, inspKindOptions, inspItemOptions, inspResultText, inspDragStart, inspDragOver, inspDragDrop, inspDragEnd, inspRemoveDim, inspAddDim, inspRptQuery, inspRptReset, inspRptExport, inspOpenDetail, inspRptRowClass, costFlowOpts, costDragStart, costDragOver, costDragDrop, costDragEnd, costRemoveDim, costAddDim, costPivotReset, costPivotQuery, costPivotRowClass, costOpenFlow, costPivotExport, batchTrace, batchRelAddLine, batchRelCopyLine, batchRelDelLine, envStatNames, envStatItemOptions, envStatOnName, envStatQuery, envStatReset, envStatOpenSet, envStatSaveSet, envStatOpenSamples, envStatExport, treeListId, treeListKw, filteredTreeListNodes, onTreeListOp, waitSampInnerTab, waitSampSampleRows, waitSampSampleSelected, waitSampItemRows, waitSampItemSelected, waitSampSchemeItemCount, waitSampTempItemCount, waitSampItemSourceLabel, addWaitSampSample, refreshWaitSampCodes, removeWaitSampSamples, addWaitSampItem, removeWaitSampItems, recheckSampleRows, disposeDetailRows, disposeDetailSelected, initDisposeDetailRows, batchDisposeReceive, mrbWritebackVisible, saveMrbWriteback, mrbWriteback, disposeDetailVisible, disposeDetailViewRows, DRIFT_PAGE, DRIFT_TR_OPTS, DRIFT_INSP_OPTS, driftFormTab, driftImpurityRows, driftRrtRows, driftRrtSelected, driftNewUCL, driftNewLCL, driftFilterMin, driftFilterMax, driftMatRows, driftColRows, addDriftImpurity, removeDriftImpurity, addDriftRrtRule, removeDriftRrtRule, removeDriftRrtRules, addDriftMat, removeDriftMat, addDriftCol, removeDriftCol, driftMatOptions, onDriftMatPick, driftColTypeOptions, onDriftMainPeak, driftPointRows, schemeInnerTab, qrConfigInnerTab, qrFieldRows, qrFieldSelected, qrTemplateFileOptions, removeQrConfigFields, schemeQualRows, schemeQuantRows, schemeQualSelected, schemeQuantSelected, schemePointRows, schemeMatRows, schemeCustRows, schemeSuppRows, schemeMediaRows, schemeItemDrawerVisible, schemeItemDrawerKind, schemeItemDrawerQ, schemeItemDrawerTick, schemeItemDrawerRows, schemeItemDrawerSelected, openSchemeItemDrawer, confirmSchemeItemDrawer, removeSchemeRows, schemeRelDrawerVisible, schemeRelDrawerKind, schemeRelDrawerTitle, schemeRelDrawerRows, schemeRelDrawerColumns, schemeRelDrawerSelected, schemeRelDrawerTableRef, schemeRelDrawerRowKey, onSchemeRelDrawerSelect, clearSchemeRelDrawerSelect, openSchemeRelDrawer, confirmSchemeRelDrawer, resetSchemeRelDrawerQ, schemeRelDrawerQ, schemeRelDrawerTick, addSchemeMedium, schemeLimitOps, openSchemeUnitDrawer, openItemUomUnitDrawer, onSchemeFnChange, schemePointSelected, schemeMatSelected, schemeCustSelected, schemeSuppSelected, removeSchemeRelRows, schemeQualEnumDrawerVisible, schemeQualEnumDraft, schemeQualEnumSelected, schemeQualEnumEnableOther, openSchemeQualEnumDrawer, addSchemeQualEnumItem, removeSchemeQualEnumItems, confirmSchemeQualEnumDrawer, renumberSchemeQualEnum, sampInnerTab, sampInspectTypes, sampRuleRows, sampRuleSelected, sampMatRows, sampMatSelected, sampFormulaVisible, sampFormulaValue, onSampTypeChange, isSampRuleFirst, isSampRuleLast, normalizeSampRuleFixed, removeSampRuleRow, removeSampMatRows, openSampFormula, insertSampFormulaFn, confirmSampFormula, validateSampRules, addSampRuleRow, removeSampRuleRows, autoSampDetailRows, autoSampDetailSelected, autoSampPickVisible, autoSampPickKind, autoSampPickTitle, autoSampPickQ, autoSampPickTick, autoSampPickRows, autoSampPickColumns, autoSampPickMulti, autoSampPickCurrent, autoSampPickSelected, openAutoSampPick, resetAutoSampPickQ, confirmAutoSampPick, copyAutoSampDetail, validateAutoSampDetails, addAutoSampDetail, removeAutoSampDetails, inspMethodPublicParams, inspMethodSampleParams, inspMethodPublicSelected, inspMethodSampleSelected, inspMethodInnerTab, inspMethodMatRows, inspMethodMatSelected, inspMethodMatCatRows, inspMethodMatCatSelected, METHOD_MAT_SRCS, methodMatSrc, onMethodMatSrcTab, openMethodMatSupp, openMethodMatUnit, removeInspMethodMats, addInspMethodMatCat, copyInspMethodMatCat, removeInspMethodMatCats, openMethodMatCatMat, clearMethodMatCatMat, openMethodMatCatCat, clearMethodMatCatCat, methodVerVisible, methodVerTitle, methodVerRows, methodVerCount, openMethodVerDetail, onInspMethodFile, inspParamDrawerVisible, inspParamDrawerQ, inspParamDrawerTick, inspParamDrawerRows, inspParamDrawerSelected, openInspParamDrawer, resetInspParamDrawerQ, confirmInspParamDrawer, removeInspMethodParams, onInspMethodPublicToggle, onInspMethodPublicTimesChange, inspCatInstrumentTypeOptions, INSP_CAT_ATTRS, inspItemUnitDrawerVisible, inspItemUnitDrawerTitle, inspItemUnitDrawerQ, inspItemUnitDrawerTick, inspItemUnitDrawerRows, inspItemUnitDrawerCurrent, inspItemUnitDrawerSelectedKey, inspItemUnitTableRef, inspItemUnitRowKey, selectInspItemUnitRow, onInspItemUnitRowClick, onInspItemUnitCurrentChange, clearInspItemUnitDrawer, openInspItemUnitDrawer, confirmInspItemUnitDrawer, poMatPool, formLineSelected, dispatchAuditVisible, dispatchAuditRow, dispatchAuditForm, splitVisible, splitRow, splitForm, splitLines, splitLineSelected, splitNeedsOrder, splitShowPreDoc, splitShowSoShipPreDocs, splitShowSoPreoutPrepDoc, splitPreDocRequired, splitShowPo, onSplitOrderTypeChange, openSplitPicker, settleVisible, settleRows, settleForm, totalSettleQty, totalSettleFee, openSettleModal, onSettleOk, secondaryAssignVisible, secondaryAssignRow, secondaryAssignForm, resetSecondaryAssignForm, onSecondaryAssignOk, assignVisible, assignRow, assignForm, assignCarriers, assignVehicles, assignTrailers, activeFormFields, activeFormLineFields, formLineEmptyText, formLineRows, formCatRows, formCatSelected, onDispatchCatAction, moveFormCatRow, onCatDragStart, onCatDragOver, onCatDrop, onCatDragEnd, onCatDragLeave, formInstRows, formInstSelected, onDispatchInstAction, onGsDragStart, onGsDrop, onFormLineSelectChange,
      kpiCfgVisible, kpiGrades, kpiGradeSel, kpiProjects, kpiProjSel, kpiScoreVisible, kpiScoreReadonly, kpiScoreVendor, kpiScoreProjects, kpiScoreExplain, kpiScoreRemark, kpiScoreTotal, kpiScoreGrade, kpiVendorRows, kpiVendorCols, kpiVendorSel,
      kpiFlowVisible, kpiFlowRow, kpiFlowNodes, kpiFlowStamp, kpiFlowStampClass,
      qcInspectVisible, qcInspectRow, qcInspectForm,
      detailVisible, detailDialogTitle, detailRow, detailRowFiltered, activeDetailFields, detailLineFields, detailLineRows, detailLineSelected, detailEnrouteRows, detailPhotos, detailSignature,
      ledgerInspHeadFields, ledgerInspVisible, ledgerInspTab, ledgerInspRow, ledgerInspQual, ledgerInspQuant, ledgerInspRaw, ledgerInspQualSel, ledgerInspQuantSel, ledgerInspAbnText, ledgerDevTag, ledgerAbnText, ledgerAbnGroups, openLedgerInspDetail, ledgerChangeVisible, ledgerChangeRows, ledgerChangePaged, ledgerChangePage, ledgerChangePageSize, openLedgerChangeDetail,
      batchVisible, batchTitle, batchForm, batchLines, batchSelected, batchFieldSource, batchCtx, isBatchFieldLocked, batchLockedDisplay, batchSelectOptions, resetBatchCtx, onDetailLineRowAction,
      craftVisible, craftProcVisible, craftProcForm, craftTitle, craftKw, craftZoom, craftLocked, craftNodes, filteredCraftProcs, craftEdgeLines,
      openCraftProc, onCraftProcOk,
      MSA_TIPS, MSA_STD_KEYS, msaFormVisible, msaFormMode, msaTab, msaForm, msaInsts, msaInstSel, msaStds, msaStdSel, msaItems, msaItemSel, msaSpecOf, onMsaAction, msaRemoveItems, msaItemHead, saveMsaForm, msaDtVisible, msaDtKeys, msaDtPlan, msaDtGroups, msaEntryDisabled, onMsaEntryOp, msaEn, msaEnStd, msaEnItems, msaEnRows, msaEnCalc, msaImport, saveMsaEntry, msaPrec, msaFmt, msaPv, stbFormVisible, stbFormMode, stbTab, stbForm, stbInsts, stbInstSel, stbStds, stbStdSel, stbItems, stbItemSel, onStbAction, stbRemoveItems, saveStbForm, stbDtVisible, stbDtPlan, stbMeasures, stbMeasureSel, stbDtStd, stbFinishTip, stbAddMeasure, stbDelMeasures, stbFinish, stbEntryDisabled, onStbEntryOp, stbEn, stbEnStd, stbEnItems, stbImport, saveStbEntry, stbPv, biasFormVisible, biasFormMode, biasForm, biasInstOptions, biasPeople, biasTypes, onBiasInst, refreshBiasNo, saveBiasForm, biasDtVisible, biasDt, biasDtKeys, biasAn, biasAnStats, biasCell, biasFmtNum, saveBiasEntry, biasDownloadTpl, biasImport, biasFilesVisible, biasFileNo, openBiasFiles, openBiasPreview, biasPv, qcDownload, ElMessage, tagClass, srShare, saveSrShare, copySrShare, srFill, submitSrFill, srReview, openSrReview, submitSrReview, srExt, srExtLogin, srExtKeys, srExtVal, openSrFill, refreshHmExpire, hmHist, openHmHistDetail, hmCmp, hmArchLineTab, hmArchPlant, hmArchCust, hmArchLaw, hmArchPlantSel, hmArchCustSel, hmArchLawSel, hmImpEntryTab, hmImpEntryRows, hmImpEntrySel, hmEditBOnly, hmImpAddEntryRows, openHmImpStdPick, hmImpDelEntryRows, hmImpCompareEntry, hmArchAddLine, hmArchDelLines, hmCmpPassCount, hmCmpFailCount, hmCmpSkipCount, hmCmpRowClass, hmCmpValStyle, confirmHmCompare, hmFilePick, hmVoidPickRows, hmFilePickRows, confirmHmFilePick, refreshHmChgExpire, designVisible, designTitle, designBasic, designAdvanced, designCanvas, designFormName, designFormTitle, designActive, designActiveField, designDragType, formPreviewVisible, djExecVisible, djExecReadonly, djExecRow, djExecData, djExecFields, djExecHead, djExecFormName, djSign, saveDjExec, labInspExecVisible, labInspExecReadonly, labInspExecRow, labInspExecData, labInspExecFields, labInspExecFormName, labInspExecHead, openLabInspExec, labInspSign, saveLabInspExec, tyK, instDictOpts, tyDetailVisible, tyDetail, tyDetailKeys, tyDetailLines, TY_NOTICE_KEYS, TY_NOTICE_REQ, AP_TYPES, AP_LEADERS, AP_WAYS, AP_REMIND, AP_UNITS, tyTypes, tyFormVisible, tyFormMode, tyFormLines, tyFormSel, tyForm, onTyLineAction, saveTyForm, tyApVisible, tyApBatch, tyApRows, tyApSel, tyAp, tyApFlows, tyApLocked, tyApUsers, loadTyFlow, addTyNode, copyTyNode, removeTyNodes, onTyApType, onTyApField, submitTyAp, tyAuditVisible, tyAuditForm, tyAuditNode, submitTyAudit, sgVisible, sgMode, sgTab, sgForm, sgTitle, sgSchemeText, SG_ZERO, SG_ROUND, SG_TAKE, sgLineSel, openSgPick, removeSgSchemes, saveSg, sgPickVisible, sgPickCode, sgPickName, sgPickQuery, sgPickRows, sgPickSel, confirmSgPick, srVisible, srMode, srForm, srTitle, srPartyLabel, srMonthOpts, SR_DIMS, SR_WEEK, srSchemeOpts, srItemOpts, srFillItems, openSrPick, srOnDim, srOnTarget, saveSr, deleteSr, srSpcVisible, srSpcMenu, srSpcKey, srSpc, srRuleNames, srToggleAll, srToggleOne, srRestore, saveSrSpc, openChartSpcSettings, SR_FILTER_ROWS, SR_ZERO, SR_ROUND, SR_TAKE, SR_GROUP_SECS, SR_CHART_TYPES, SR_TIP_FIELDS, SR_DASH, srClearFilter, srRestoreGroup, srRestoreLimit, srRestoreView, srOnTake, srEnsureTips, srToggleLimit, srToggleTipAll, srToggleTipOne, acVisible, acRuleVisible, acRuleMenu, acRule, AC_RULE_FILTER, AC_RULE_ZERO, AC_RULE_ROUND, AC_RULE_TAKE, AC_RULE_SECS, AC_RULE_FILTER_NOTES, AC_RULE_TOP_NOTES, AC_RULE_GROUP_NOTES, openAcRule, saveAcRule, acRuleClear, acRuleRestore, acMode, acForm, acTitle, acPartyLabel, AC_METRICS, acSchemeOpts, openAcPick, acOnTarget, saveAc, deleteAc, MY_WX_PAGE, WO_LINK_PAGES, YS_SECS, woFixTab, woParts, woPartSel, removeWoParts, roundWoPart, ysDlgVisible, ysDlgBatch, ysDlgRows, ysForm, saveYsDlg, WO_PAGE, CL_REPAIR, WO_FIX_SECS, bxFormKind, bxFaultLocked, saveWoForm, bxExpTip, woFixVisible, woFixRow, woFix, openWoExp, saveWoFix, CL_WAYS, clDlgVisible, clDlgBatch, clDlgRows, clForm, clNeedRepair, clFaultTypes, saveClDraft, submitClDlg, maintTeamNames, bxDetailSecs, BX_INST_KEYS, BX_DETAIL, BX_FILE_KEYS, BX_TAG_KEYS, bxFormVisible, bxFormMode, bxFormTitle, bxFormLines, bxFormSel, bxForm, bxLineTypes, bxFaultTypes, onBxLineAction, saveBxForm, bxExpVisible, bxExpPick, bxExpRows, openBxExp, confirmBxExp, bxLinkVisible, bxLinkNos, bxLinkRows, goBxLink, bxDetailVisible, bxDetailRow, bxDetailTab, bxFlowNodes, openBxFlowNo, wjExecVisible, wjExecRow, wjExecLines, wjExecSel, onWjLineAction, onWjLineChange, openWjLineSupplier, saveWjExec, INST_PAGE, INST_BASE_FIELDS, INST_BASE_REQ, INST_CYCLE_UNITS, INST_DEPT_TREE, INST_DICTS, instTypeId, instTypeKw, instTypeList, instAllTypes, instCfgFieldList, onInstTypeQuery, selectInstType, onInstTypeOp, instTypeVisible, instTypeTitle, instTypeForm, openInstType, saveInstType, instCfgVisible, instCfgRows, instCfgSel, openInstCfg, addInstCfgRow, onInstCfgAttr, delInstCfgRows, saveInstCfg, instImageUrl, previewInstImage, instFormVisible, instFormMode, instFormTitle, instFormBase, instFormCfg, instFormOther, INST_PLAN_FIELDS, fillInstPlan, instUsers, onInstCodeInput, calcInstNext, onInstCycleInput, pickInstSupplier, saveInstForm, instLinkVisible, instLinkNos, instLinkRows, goInstLink, instIoTip, djMyUser, djMyUsers, isDjMyPage, isDjPlanPage,
      importVisible, exportVisible, hiddenOrderDlg, hiddenOrderRows, hiddenOrderCols, hiddenOrderSel, openHiddenOrders, hideInspOrders, restoreHiddenOrders, hidRowsDlg, hidRowsList, hidRowsCols, hidRowsSel, openHiddenRowsList, hideTableRows, restoreHiddenRows, opcRel, printVisible, printCodes, printTpl, printPrinter, openPrintLabel, qcView, clDevVisible, clDevForm, clDevOpts, clDevRule, confirmClDev, clSampleVisible, clSampleQuery, clSampleRows, clSampleCols, clSampleExpanded, consignPrintVisible, consignPrint,
      pickerVisible, pickerTitle, pickerDialogTitle, pickerKw, pickerPrepQ, pickerPrepFilterTick, pickerPrepSelQty, pickerPrepNeedQty, resetPickerPrepQ, pickerRows, pickerColumns, pickerDialogWidth, pickerMultiSelect, pickerCurrent, pickerSelected, pickerMode,
      mergeVisible, mergeForm, onMergeShipOk, onFormSelectChange, onFormTextInput,
      soPrepPushVisible, soPrepPushForm, soPrepDocTypeOptions, onSoPrepPushOk,
      jobVisible, jobTitle, jobHead, jobProcs, jobProcIdx,
      jobLogiMode, jobStockMode, jobInvTip, jobInvCols, jobBarcodeCols, jobInvRows, jobBarcodeRows, formBarcodeRows, formBarcodeSelected,
      prodPickLotVisible, prodPickLotTitle, prodPickLotHead, prodPickLotRows, hasProdPickLotDetails, formatProdPickLotsText, openProdPickLotDetail,
      dictTypeKw, dictTypeId, dictTypeTitle, filteredDictTypeTree, dictTypeCollapsed, dictTypeFormVisible, dictTypeFormMode, dictTypeForm,
      visibleTypeFormFields, dictTypeOptions,
      onSelectMenu, openQualityCockpit, cmp, cmpFiltered, cmpPageRows, cmpPageSelected, cmpIndex, onCmpSelect, cmpReset, cmpExport, onTabChange, onQuery, onResetQuery, onToolbar, onTreeToolbar, demoMenuTreeData, onTagMenuTreeChange, onRowOp, onFormLineAction, formLineActionList, onFormBarcodeAction, onFormOk, onFormDraft, onFormFooter, onQcInspectSave, onSplitOk, onDispatchAuditOk, onAssignOk, onAssignVehicleChange, tagClass, displayTagValue, isStatusTagField, isPresentTagValue, arrowDetailPairs, formatMatUomRatioDisplay, isDateTimeField, colMinWidth, formLineColMinWidth, fitColWidth, colMaxWidth, isFormFieldVisible, isFormFieldRequired, ratioFieldKey, isBatchFieldRequired, dispatchNeedsOrderNo, isFormFieldLocked, isFormLineFieldLocked, isFormPickerDisabled, formPickerPlaceholder, onFormPickerClear, isDetailLineRowActionVisible, visibleRowOps, rowOpDisabledReason, canEditTankArch, onTankArchDetailEdit, onBizLink, isBizLinkField, isDetailTagField, detailFieldLabel, detailDisplayValue, maskIdCard, removeFormLine, clonePoInFormLineForNewLot, refreshPoInFormLineNos, removeMatMediumPick, matInfoText, formFieldOptions, formSelectOptions, formSelectAllState, toggleFormSelectAll, formLineSelectOptions, prodRetBatchOptions, countWhLotOptions, isProdFormLotField, isCountManageRow, resolveWhBizType, isWaybillPage, usesErpLineNoCol, isPoNoticePage, isProdIssuePage, isDirectXferPage, isProdWhPage, prodAppMeta, isLoadPage, loadPageMeta, loadWhBizMeta, isWhLineClosePage, isOsPoPage, isWhNoticePage, isCsRecvPage, isBcSerialPage, isBcLineFormPage, onBcFormLineBarcodeEnter, syncSerialSplitRemain, syncSerialMergeRemain, isCsRetPage, isCsWhPage, demoCarrierName, demoCarrierDispatcher,
      selectDictType, toggleDictTypeNode, openDictTypeForm, onDictTypeFormOk, removeDictType, addrPopoverField,
      resetDemoStore, storeTick, isDemoImageUpload, demoSpectrumImgSrc, qrIssueSpectrumFormFields,
      openPicker, onPickerOk, onGenerateBatch, onBatchDeleteLines, onBatchOk, refreshSerialExpire,
      onCraftDragStart, addCraftNode, onCraftDrop, onCraftOk, openCraftProc, onCraftProcOk, removeCraftNode, addDesignField, onDesignDrop, selectDesignField, moveDesignField, copyDesignField, removeDesignField, removeDesignChild, openFormPreview, onDesignCancel, onDesignOk, onDetailLineAction, removeDetailPickLine, syncPrepPickQty, onSplitLineSelection, addSplitMaterialLine, addSplitBatchLineForMat, addSplitBatchLine, removeSplitSelectedBatchLines, removeSplitBatchLine, splitSpanMethod, isSplitMatHeadRow,
      addKpiGrade, delKpiGrades, addKpiProject, delKpiProjects, addKpiIndicator, delKpiIndicators, moveKpiProject, moveKpiIndicator, onKpiCfgOk, openKpiScore, onKpiScoreOk, kpiProjectScore, onKpiVendorDelete,
      sb, schedData, schedSplitVisible, inspSeqGroups,
    };
