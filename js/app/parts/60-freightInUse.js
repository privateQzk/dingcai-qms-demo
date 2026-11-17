    function freightInUse(row){
      if(!row) return false;
      const from = row['发货地'] || '';
      const to = row['收货地'] || '';
      if(!from || !to) return false;
      return ((MOCK['lg-waybill']||{}).main||[]).some(w=>{
        const load = String((w._lines||[]).map(l=> l['装货点']).join(' ') + ' ' + (w['装货点']||''));
        const unload = String((w._lines||[]).map(l=> l['卸货点']).join(' ') + ' ' + (w['卸货点']||''));
        return load.includes(from) && unload.includes(to);
      });
    }
    function vehicleInUse(plate){
      if(!plate || plate==='—') return false;
      const hit = (list, field) => ((list)||[]).some(r=> r[field]===plate);
      return hit((MOCK['lg-waybill']||{}).main, '车牌号')
        || hit((MOCK['lg-pickup']||{}).main, '司机车牌号');
    }
    function carrierInUse(name){
      if(!name || name==='—') return false;
      const hit = (list, field) => ((list)||[]).some(r=> r[field]===name);
      return hit((MOCK.vehicle||{}).main, '所属承运商')
        || hit((MOCK.driver||{}).main, '所属承运商')
        || hit((MOCK['lg-waybill']||{}).main, '承运商名称')
        || hit((MOCK['lg-dispatch']||{}).main, '承运公司');
    }
    function defaultKpiGrades(){
      return [
        { 总分下限:'90.00', 总分上限:'100.00', 对应结果:'优秀', 备注:'优先续约及派单' },
        { 总分下限:'70.00', 总分上限:'89.99', 对应结果:'合格', 备注:'正常合作' },
        { 总分下限:'0.00', 总分上限:'69.99', 对应结果:'不合格', 备注:'责令整改/暂停派单' }
      ];
    }
    function defaultKpiProjects(){
      // 默认对齐客户《物流供应商季度评价表》STR-RD-JY-019
      return [
        {
          "考评项目": "价格竞争力",
          "评价部门": "物流部",
          "负责人": "张三",
          "_indicators": [
            {
              "代号": "Q-P01",
              "考评内容": "中标率（整车）",
              "配分": "10.00",
              "评分标准": "≧目标20%，每低于1%扣2分；中标率=季度中标线路数/投标线路总数×100%",
              "备注": "权重10%"
            },
            {
              "代号": "Q-P02",
              "考评内容": "临时报价采纳率",
              "配分": "5.00",
              "评分标准": "≧目标20%，每低于1%扣1分；采纳率=季度临时报价采纳数/临时报价总数×100%",
              "备注": "权重5%"
            },
            {
              "代号": "Q-P03",
              "考评内容": "临时报价响应率",
              "配分": "5.00",
              "评分标准": "紧急≤2小时、一般≤4小时；每延迟1次紧急扣1分/一般扣0.5分",
              "备注": "权重5%"
            }
          ]
        },
        {
          "考评项目": "运作质量",
          "评价部门": "物流部",
          "负责人": "张三",
          "_indicators": [
            {
              "代号": "Q-O01",
              "考评内容": "承运商责任货损率",
              "配分": "15.00",
              "评分标准": "≦0.5%，每高于0.1%扣3分，且全额赔偿",
              "备注": "权重15%"
            },
            {
              "代号": "Q-O02",
              "考评内容": "承运商责任货差率",
              "配分": "15.00",
              "评分标准": "≦0.2%，每高于0.1%扣3分，且全额赔偿",
              "备注": "权重15%"
            },
            {
              "代号": "Q-O03",
              "考评内容": "提货及时率",
              "配分": "10.00",
              "评分标准": "≧98%，每低于1%扣1分；按时派车提货票数/总派车票数",
              "备注": "权重10%"
            },
            {
              "代号": "Q-O04",
              "考评内容": "到货准时率",
              "配分": "10.00",
              "评分标准": "≧98%，每低于1%扣1分；按承诺时效送达票数/总订单票数",
              "备注": "权重10%"
            },
            {
              "代号": "Q-O05",
              "考评内容": "单据准确完整率",
              "配分": "10.00",
              "评分标准": "≧99%，每低于1%扣1分；签收单/对账单按时准确完整返回比例",
              "备注": "权重10%"
            }
          ]
        },
        {
          "考评项目": "服务响应",
          "评价部门": "物流部",
          "负责人": "李四",
          "_indicators": [
            {
              "代号": "Q-S01",
              "考评内容": "异常反馈及时性",
              "配分": "5.00",
              "评分标准": "=100%，每低于1%扣1分；异常2小时内首次响应、24小时内出具处理方案",
              "备注": "权重5%"
            },
            {
              "代号": "Q-S02",
              "考评内容": "信息反馈及时性",
              "配分": "5.00",
              "评分标准": "≧98%，每低于1%扣1分；轨迹节点按时更新率",
              "备注": "权重5%"
            }
          ]
        },
        {
          "考评项目": "协同",
          "评价部门": "经营中心",
          "负责人": "王五",
          "_indicators": [
            {
              "代号": "Q-C01",
              "考评内容": "紧急订单配合度",
              "配分": "5.00",
              "评分标准": "≧90%，每低于1%扣1分；要求时间内成功履行的紧急/加急订单比例",
              "备注": "权重5%"
            },
            {
              "代号": "Q-C02",
              "考评内容": "可持续发展",
              "配分": "5.00",
              "评分标准": "国六及新能源车使用比例≧80%，每低于1%扣1分",
              "备注": "权重5%"
            }
          ]
        }
      ];
    }
    function kpiSchemeInUse(name){
      if(!name) return false;
      return ((MOCK['lg-kpi-plan']||{}).main||[]).some(r=> r['方案名称']===name)
        || ((MOCK['lg-kpi-record']||{}).main||[]).some(r=> r['方案名称']===name);
    }
    function kpiSchemeByName(name){
      return ((MOCK['lg-kpi-scheme']||{}).main||[]).find(r=> r['方案名称']===name) || null;
    }
    function kpiGradeOf(score, schemeOrPlan){
      let grades = schemeOrPlan && schemeOrPlan._grades;
      if(!grades || !grades.length){
        const sch = kpiSchemeByName(schemeOrPlan && schemeOrPlan['方案名称']);
        grades = (sch && sch._grades) || defaultKpiGrades();
      }
      const n = Number(score);
      for(const g of grades){
        const lo = Number(g['总分下限']), hi = Number(g['总分上限']);
        if(!Number.isNaN(n) && n>=lo && n<=hi) return g['对应结果']||'';
      }
      return '';
    }
    function cloneKpi(obj){ return JSON.parse(JSON.stringify(obj||[])); }
    function openKpiCfg(row){
      kpiCfgRow.value = row;
      kpiGrades.value = cloneKpi(row._grades && row._grades.length ? row._grades : defaultKpiGrades());
      kpiProjects.value = cloneKpi(row._projects && row._projects.length ? row._projects : defaultKpiProjects());
      kpiGradeSel.value = [];
      kpiProjSel.value = [];
      kpiCfgVisible.value = true;
    }
    function addKpiGrade(){ kpiGrades.value.push({ 总分下限:'', 总分上限:'', 对应结果:'合格', 备注:'' }); }
    function delKpiGrades(){
      const set = new Set(kpiGradeSel.value);
      kpiGrades.value = kpiGrades.value.filter(r=> !set.has(r));
      kpiGradeSel.value = [];
    }
    function addKpiProject(){ kpiProjects.value.push({ 考评项目:'', 评价部门:'物流部', 负责人:'张三', _indicators:[] }); }
    function delKpiProjects(){
      const set = new Set(kpiProjSel.value);
      kpiProjects.value = kpiProjects.value.filter(r=> !set.has(r));
      kpiProjSel.value = [];
    }
    function addKpiIndicator(proj){
      const n = (proj._indicators||[]).length + 1;
      (proj._indicators = proj._indicators || []).push({ 代号:'IND'+String(n).padStart(2,'0'), 考评内容:'', 配分:'', 评分标准:'', 备注:'' });
    }
    function delKpiIndicators(proj){
      if(!(proj._indicators||[]).length) return;
      proj._indicators.pop();
    }
    function moveKpiProject(i, dir){
      const j = i + dir;
      if(j<0 || j>=kpiProjects.value.length) return;
      const arr = kpiProjects.value.slice();
      [arr[i], arr[j]] = [arr[j], arr[i]];
      kpiProjects.value = arr;
    }
    function moveKpiIndicator(proj, i, dir){
      const arr = proj._indicators || [];
      const j = i + dir;
      if(j<0 || j>=arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    function onKpiCfgOk(){
      const grades = kpiGrades.value || [];
      if(grades.some(g=> !String(g['对应结果']||'').trim())){ ElMessage.warning('请填写对应结论结果'); return; }
      const ranges = grades.map(g=>[Number(g['总分下限']), Number(g['总分上限'])]).filter(x=> !Number.isNaN(x[0]) && !Number.isNaN(x[1]));
      ranges.sort((a,b)=> a[0]-b[0]);
      for(let i=1;i<ranges.length;i++){
        if(ranges[i][0] <= ranges[i-1][1]){ ElMessage.warning('结论配置的总分上下限区间不能交叉重叠'); return; }
      }
      if(kpiProjects.value.some(p=> !String(p['考评项目']||'').trim())){ ElMessage.warning('请输入考评项目名称'); return; }
      let sum = 0;
      for(const p of kpiProjects.value){
        for(const ind of (p._indicators||[])){
          const n = Number(ind['配分']);
          if(!(n>0)){ ElMessage.warning('考评指标配分必须为大于0的数值'); return; }
          sum += n;
        }
      }
      if(sum && Math.abs(sum-100)>0.01){
        ElMessage.warning('考评指标配分总和建议为100分，当前总计为 '+sum.toFixed(2)+' 分，请检查');
        return;
      }
      const row = kpiCfgRow.value;
      if(row){
        row._grades = cloneKpi(kpiGrades.value);
        row._projects = cloneKpi(kpiProjects.value);
      }
      kpiCfgVisible.value = false;
      bumpStore();
      ElMessage.success('分数项配置已成功保存');
    }
    function kpiProjectScore(proj){
      return (proj && proj._indicators || []).reduce((s,i)=> s + (Number(i['得分']||0)||0), 0);
    }
    function openKpiScore(vendor, readonly){
      kpiScoreReadonly.value = !!readonly;
      kpiScoreVendor.value = vendor || {};
      const sch = kpiSchemeByName(detailRow.value?.['方案名称']);
      kpiCfgRow.value = sch || detailRow.value;
      const scores = cloneKpi(vendor._scores || []);
      const projects = cloneKpi((sch && sch._projects) || defaultKpiProjects());
      const byCode = Object.fromEntries(scores.map(s=>[s['代号']||s['考评内容'], s]));
      projects.forEach(p=>{
        (p._indicators||[]).forEach(ind=>{
          const hit = byCode[ind['代号']] || byCode[ind['考评内容']] || {};
          ind['得分'] = hit['得分'] ?? '';
          ind['备注'] = hit['备注'] ?? '';
        });
      });
      kpiScoreProjects.value = projects;
      kpiScoreExplain.value = vendor['考评说明'] || (detailRow.value?.['内容描述'] || '');
      kpiScoreRemark.value = vendor['备注'] && vendor['备注']!=='—' ? vendor['备注'] : '';
      kpiScoreVisible.value = true;
    }
    function onKpiScoreOk(){
      for(const p of kpiScoreProjects.value){
        for(const ind of (p._indicators||[])){
          if(ind['得分']==='' || ind['得分']===undefined || ind['得分']===null){
            ElMessage.warning('请完整填写所有指标的考核得分'); return;
          }
          const n = Number(ind['得分']);
          const max = Number(ind['配分']);
          if(Number.isNaN(n) || n<0){ ElMessage.warning('指标得分不能为负数'); return; }
          if(n>max){ ElMessage.warning('指标得分不能超过最大配分 ('+max+'分)'); return; }
        }
      }
      const vendor = kpiScoreVendor.value;
      const scores = [];
      (kpiScoreProjects.value||[]).forEach(p=>{
        (p._indicators||[]).forEach(ind=>{
          scores.push({ 代号:ind['代号'], 考评内容:ind['考评内容'], 配分:ind['配分'], 评分标准:ind['评分标准'], 得分:Number(ind['得分']).toFixed(2), 备注:ind['备注']||'' });
          vendor[ind['考评内容']] = Number(ind['得分']).toFixed(2);
        });
      });
      vendor._scores = scores;
      vendor['总得分'] = kpiScoreTotal.value.toFixed(2);
      vendor['评定结果'] = kpiScoreGrade.value || '—';
      vendor['考评说明'] = kpiScoreExplain.value || '';
      vendor['备注'] = kpiScoreRemark.value || '—';
      const plan = ((MOCK['lg-kpi-plan']||{}).main||[]).find(r=> r.id===detailRow.value?.id) || detailRow.value;
      if(plan && (plan['复核状态']==='置空' || !plan['复核状态'])){
        plan['复核状态'] = '待复核';
        if(detailRow.value) detailRow.value['复核状态'] = '待复核';
      }
      kpiScoreVisible.value = false;
      bumpStore();
      ElMessage.success('考评分数已提交，状态变更为待复核');
    }
    function onKpiVendorDelete(){
      const set = new Set(kpiVendorSel.value);
      const plan = ((MOCK['lg-kpi-plan']||{}).main||[]).find(r=> r.id===detailRow.value?.id) || detailRow.value;
      if(!plan) return;
      plan._vendors = (plan._vendors||[]).filter(v=> !set.has(v));
      if(detailRow.value) detailRow.value._vendors = plan._vendors;
      kpiVendorSel.value = [];
      bumpStore();
      ElMessage.success('选中的供应商考评明细已删除');
    }
    function openKpiFlow(row){
      kpiFlowRow.value = row || {};
      kpiFlowNodes.value = cloneKpi(row._flow || []);
      kpiFlowVisible.value = true;
    }
    function addrNorm(s){
      const t = String(s||'').trim();
      const desc = t.includes(' / ') ? t.split(' / ').slice(1).join(' / ') : t;
      return desc.replace(/\s+/g,'').toLowerCase();
    }
    function addrMatch(a, b){
      const x = addrNorm(a), y = addrNorm(b);
      if(!x || !y) return false;
      return x===y || x.includes(y) || y.includes(x);
    }
    function lookupFreightPrice(from, to){
      const rows = ((MOCK.freight||{}).main||[]).filter(r => r['启用状态']!=='禁用');
      const hit = rows.find(r => addrMatch(r['发货地'], from) && addrMatch(r['收货地'], to));
      return hit ? String(hit['运费单价']||'') : '';
    }
    function onMergeShipOk(){
      if(!mergeForm.承运商名称){ ElMessage.warning('请选择承运商'); return; }
      if(!mergeForm.计划装货时间){ ElMessage.warning('请选择计划装货时间'); return; }
      if(!mergeForm.运输类型){ ElMessage.warning('请选择运输类型'); return; }
      const rows = mergeShipRows.value || [];
      if(!rows.length){ ElMessage.warning('请勾选待调度发货单'); return; }
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const pad = n => String(n).padStart(2,'0');
      const wb = (MOCK['lg-waybill'] = MOCK['lg-waybill'] || { main: [] });
      wb.main = wb.main || [];
      const wayNo = 'YD' + ymd + String(wb.main.length + 1).padStart(4,'0');
      const dns = rows.map(r=> r['发货单号']).filter(Boolean);
      const first = rows[0] || {};
      const qtySum = rows.reduce((s,r)=> s + (Number(String(r['发货数量']||'').replace(/[^\d.]/g,''))||0), 0);
      const planTime = mergeForm.计划装货时间;
      wb.main.unshift({
        id: String(wb.main.length+1),
        运单号: wayNo,
        状态: '待派车',
        结算状态: '/',
        关联发货单: dns.join('、'),
        关联订单类型: (()=>{
          const ord = String(first['订单号']||first['关联订单号']||'');
          if(/^SO/i.test(ord) || first['用车类型']==='发货') return '销售订单';
          if(/^PO/i.test(ord) || first['用车类型']==='提货') return '采购订单';
          if(/^WW/i.test(ord)) return '委外订单';
          return first['关联订单类型'] || '—';
        })(),
        关联订单号: (()=>{
          const ord = String(first['关联订单号']||first['订单号']||'');
          return (ord.split(/\s*\/\s*/)[0]||'').trim() || '—';
        })(),
        关联出库单号: first['关联出库单号'] || first['出/入库单号'] || '—',
        物料信息: [...new Set(rows.map(r=> r['物料信息']).filter(Boolean))].join('；'),
        总数量: String(qtySum),
        申请部门: first['申请部门']||'',
        申请人: first['申请人']||'',
        用车类型: first['用车类型']||'',
        仓库业务类型: resolveWhBizType(first),
        运输类型: mergeForm.运输类型,
        '运费单价（元）': mergeForm.运费单价===undefined || mergeForm.运费单价===null ? '' : String(mergeForm.运费单价).trim(),
        装货点: [...new Set(rows.map(r=> r['装货点']).filter(v=> v && v!=='—'))].join('、') || '—',
        装货联系人: first['装货联系人'] || rows.map(r=> r['装货联系人']).find(v=> v && v!=='—') || '',
        装货联系电话: first['装货联系电话'] || rows.map(r=> r['装货联系电话']).find(v=> v && v!=='—') || '',
        卸货点: [...new Set(rows.map(r=> r['卸货点']).filter(v=> v && v!=='—'))].join('、') || '—',
        卸货联系人: first['卸货联系人'] || rows.map(r=> r['卸货联系人']).find(v=> v && v!=='—') || '',
        卸货联系电话: first['卸货联系电话'] || rows.map(r=> r['卸货联系电话']).find(v=> v && v!=='—') || '',
        车型要求: first['车型要求']||'',
        是否带托盘: first['是否带托盘']||'',
        特殊要求: first['特殊要求']||'—',
        计划装货时间: planTime,
        实际装货时间: '—',
        要求送达时间: rows.map(r=> r['要求送达时间']).filter(Boolean).sort()[0] || '—',
        预计到货时间: '—',
        实际到货时间: '—',
        客户名称: (String(first['订单号']||'').split(/\s*\/\s*/)[1]||'').trim() || '—',
        '出/入库单号': '—',
        订单号: first['订单号']||'',
        合同号: first['合同号']||'',
        采购订单: first['采购订单']||'',
        承运商名称: mergeForm.承运商名称,
        车牌号: '—',
        车挂号: '—',
        司机姓名: '—',
        司机电话: '—',
        驾驶证号: '—',
        从业资格证号: '—',
        押运员姓名: '—',
        押运员资格证号: '—',
        创建时间: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
        _lines: rows.map(r=>{
          const thNo = buildPickupFromShip(r, wayNo, {
            创建时间: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
          });
          return {
            关联发货单号: r['发货单号']||'',
            关联仓储通知单: r['关联仓储通知单']||'—',
            装货点: r['装货点']||'',
            卸货点: r['卸货点']||'',
            物料信息: r['物料信息']||'',
            发货数量: r['发货数量']||'',
            关联提货单: thNo,
            关联签收单: '—'
          };
        })
      });
      rows.forEach((r, idx)=>{
        const whBiz = resolveWhBizType(r);
        const notice = whBiz === '无' || whBiz === '—' ? '—' : noticeNoByWhBiz(whBiz, ymd, wb.main.length + idx + 1);
        const cur = ((MOCK['lg-ship']||{}).main||[]).find(s=> s.id===r.id || s['发货单号']===r['发货单号']);
        if(cur){
          cur['状态'] = '已调度';
          cur['关联运单'] = wayNo;
          cur['关联仓储通知单'] = notice;
          if(!cur['仓库业务类型']) cur['仓库业务类型'] = whBiz;
        }
        r['状态'] = '已调度';
        r['关联运单'] = wayNo;
        r['关联仓储通知单'] = notice;
        // 通知单延至运单「确认派车」后生成，以便带入承运信息与行默认值
      });
      if(wb.main[0] && Array.isArray(wb.main[0]._lines)){
        wb.main[0]._lines.forEach(l=>{
          const ship = rows.find(s=> s['发货单号']===l['关联发货单号']);
          if(ship) l['关联仓储通知单'] = ship['关联仓储通知单'] || '—';
        });
      }
      const srcNos = [...new Set(rows.map(r=> r['来源派车单号']).filter(Boolean))];
      srcNos.forEach(no=> refreshDispatchProgress(findDispatchByNo(no)));
      selectedIds.value = [];
      mergeVisible.value = false;
      bumpStore();
      ElMessage.success(`发货单合并下发成功，已生成运单 (${wayNo})；仓储通知单将在运单确认派车后生成`);
    }
    /* ===== 质量闭环：检验完成 → 待复核 → 复核（不合格 → 不合格处置 / 异常 → 偏差处置）→ MRB评审 → 回写处置单；内部整改 → 整改处理 ===== */
    const QC_UQ = { 'tab-pi':'unqual-pi', 'tab-pp':'unqual-pp', 'tab-pm':'unqual-pm', 'tab-rd':'unqual-rd' };
    const QC_DV = { 'tab-pi':'dev-pi', 'tab-pp':'dev-pp', 'tab-pm':'dev-pm', 'tab-rd':'dev-rd' };
    const QC_SRC_TYPE = { 'unqual-pi':'采购来料不合格', 'unqual-pp':'生产过程不合格', 'unqual-pm':'生产物料不合格', 'unqual-rd':'研发不合格处置', 'dev-pi':'采购来料偏差', 'dev-pp':'生产过程偏差', 'dev-pm':'生产物料偏差', 'dev-rd':'研发偏差' };
    const QC_CAPA_SRC = { 采购来料不合格:['unqual-pi','tab-done'], 生产过程不合格:['unqual-pp','tab-done'], 生产物料不合格:['unqual-pm','tab-done'], 研发不合格处置:['unqual-rd','tab-done'], 采购来料偏差:['dev-pi','tab-done'], 生产过程偏差:['dev-pp','tab-done'], 生产物料偏差:['dev-pm','tab-done'], 研发偏差:['dev-rd','tab-done'], 客户投诉:[CT_PAGE,'tab-1'] };
    const QC_ADD_DEFAULTS = { 'np-0201-01':{ 单据状态:'待审批' }, 'np-0201-02':{ 单据状态:'未完成' }, 'capa-internal':{ 整改状态:'待发起' }, 'np-0215-05':{ 审核状态:'/', 审核单号:'—' } };
