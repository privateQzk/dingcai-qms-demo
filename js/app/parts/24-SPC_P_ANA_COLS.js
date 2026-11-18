    const SPC_P_ANA_COLS = {
      stat: ['物料信息','检验方案','样本总数','检验项','单位','图类型','D.L','MAX','MIN','USL','LSL','UCL','LCL','CL','UWL','LWL','Average','σ','Ca','Cp','CPU','CPL','CPK','CPK等级','OOC','OOS','OOW','OOT'],
      rate: ['统计日期','物料信息','样本总数','合格样本数','合格率'],
      pareto: ['检验项名称','物料信息','样本总数','不合格数','不合格率','不合格占比','不合格累计占比']
    };
    const spcPAnaCols = computed(()=>{
      if(spcP.chartTab==='合格率统计图') return SPC_P_ANA_COLS.rate;
      if(spcP.chartTab==='不合格项分布柏拉图') return SPC_P_ANA_COLS.pareto;
      return SPC_P_ANA_COLS.stat;
    });
    function spcPAnaColWidth(c){
      const w = { 物料信息:200, 检验方案:160, 检验项:120, 检验项名称:130, 统计日期:110, CPK等级:90 };
      return w[c] || 86;
    }
    function spcPAnaRows(key){
      const g = spcP.groups.find(x=> x.key===key);
      if(!g) return [];
      if(spcP.chartTab==='不合格项分布柏拉图'){
        const rows = g.combos.slice().sort((a,b)=> (+b.ana['不合格数'])-(+a.ana['不合格数']));
        const tot = rows.reduce((s,c)=> s+(+c.ana['不合格数']),0) || 1;
        let acc = 0;
        return rows.map(c=>{ acc += +c.ana['不合格数'];
          return Object.assign({}, c.ana, { 图类型: spcP.chartTab, 不合格占比: (+c.ana['不合格数']/tot*100).toFixed(1)+'%', 不合格累计占比: (acc/tot*100).toFixed(1)+'%' }); });
      }
      return g.combos.map(c=> Object.assign({}, c.ana, { 图类型: spcP.chartTab }));
    }
    function spcPOpenSamples(){
      if(!spcP.queried){ ElMessage.warning('请先查询'); return; }
      spcP.sampleDlg = true;
    }
    const spcPCharts = {};
    function spcPLimitSeries(name, y, color, dashed){
      return { name, type:'line', data:[], markLine:{ silent:true, symbol:'none', animation:false,
        label:{ show:true, formatter:name+' '+y, position:'insideEndTop', fontSize:10, color },
        lineStyle:{ color, type:dashed?'dashed':'solid', width:1.2 }, data:[{ yAxis:y }] } };
    }
    function spcPSubgroups(pts, n){ const gs=[]; for(let i=0;i<pts.length;i+=n) gs.push(pts.slice(i,i+n)); return gs; }
    function spcPYLabel(v){
      const a = Math.abs(v), d = a===0 ? 0 : a>=100 ? 1 : a>=1 ? 2 : 3;
      return +v.toFixed(d);
    }
    function spcPBaseOpt(c, names, series, extra){
      return Object.assign({
        legend:{ top:4, textStyle:{fontSize:11}, itemWidth:16 },
        grid:{ left:52, right:58, top:40, bottom:56 },
        toolbox:{ right:10, top:0, itemSize:14, feature:{ dataZoom:{}, restore:{}, saveAsImage:{} } },
        xAxis:{ type:'category', data:names, axisLabel:{ rotate:45, fontSize:9 }, axisTick:{ alignWithLabel:true } },
        yAxis:{ type:'value', name:'值', scale:true, splitNumber:6, axisLabel:{ fontSize:10, formatter:spcPYLabel }, splitLine:{ lineStyle:{ type:'dashed' } } },
        dataZoom:[{ type:'slider', xAxisIndex:0, bottom:8, height:14 },{ type:'slider', yAxisIndex:0, right:4, width:14 },{ type:'inside' }],
        series
      }, extra||{});
    }
    function spcPChartOption(c){
      const t = spcP.chartTab, L = c.limits, pts = c.points;
      const names = pts.map(p=> p.name);
      const red = '#e74c3c', orange = '#e6a23c', gray = '#909399', blue = '#1d7bff', hlc = '#9333ea';
      const isHl = p=> !!(c.hl && String(p && p.name || '').includes(c.hl));
      const hlDatum = (v, base, hl)=> hl
        ? { value:v, itemStyle:{ color:hlc }, symbolSize:10, label:{ show:true, position:'top', fontSize:9, color:hlc } }
        : { value:v, itemStyle:{ color:base } };
      const lim = arr=> arr.map(([n,y,col,d])=> spcPLimitSeries(n,y,col,d));
      const mkLine = (data, name, color)=> ({ name, type:'line', data, showSymbol:true, symbolSize:7,
        lineStyle:{ color:color||blue, width:1.5 }, itemStyle:{ color:color||blue }, connectNulls:true });
      if(t==='MR图'){
        const mrs = pts.slice(1).map((p,i)=> +Math.abs(p.v-pts[i].v).toFixed(3));
        const mr = mrs.length ? mrs.reduce((a,b)=>a+b,0)/mrs.length : 0;
        const u = +(3.267*mr).toFixed(2);
        return spcPBaseOpt(c, names.slice(1), [
          mkLine(mrs.map((v,i)=> hlDatum(v, v>u?red:'#1f2937', isHl(pts[i+1]))), c.item),
          ...lim([['UCL',u,orange,true],['CL',+mr.toFixed(2),gray,true]])
        ]);
      }
      if(t==='Xbar(R)图' || t==='Xbar(S)图'){
        const gs = spcPSubgroups(pts,5);
        const means = gs.map(g=> +(g.reduce((a,b)=>a+b.v,0)/g.length).toFixed(3));
        const clx = means.reduce((a,b)=>a+b,0)/(means.length||1);
        const sx = L.sigma/Math.sqrt(5), ux = clx+3*sx, lx = clx-3*sx;
        return spcPBaseOpt(c, gs.map((_,i)=>'组'+(i+1)), [
          mkLine(means.map((v,i)=> hlDatum(v, (v>ux||v<lx)?red:'#1f2937', gs[i].some(isHl))),'Xbar'),
          ...lim([['USL',L.usl,red],['LSL',L.lsl,red],['UCL',+ux.toFixed(2),orange,true],['LCL',+lx.toFixed(2),orange,true],['CL',+clx.toFixed(2),gray,true]])
        ]);
      }
      if(t==='R图' || t==='S图'){
        const gs = spcPSubgroups(pts,5);
        const vals = gs.map(g=>{
          const vs = g.map(p=>p.v);
          if(t==='R图') return +(Math.max(...vs)-Math.min(...vs)).toFixed(3);
          const m = vs.reduce((a,b)=>a+b,0)/vs.length;
          return +Math.sqrt(vs.reduce((a,b)=>a+(b-m)*(b-m),0)/(vs.length-1)).toFixed(3);
        });
        const cv = vals.reduce((a,b)=>a+b,0)/(vals.length||1);
        const uv = cv*(t==='R图'?2.114:2.089);
        return spcPBaseOpt(c, gs.map((_,i)=>'组'+(i+1)), [
          mkLine(vals.map((v,i)=> hlDatum(v, v>uv?red:'#1f2937', gs[i].some(isHl))), t==='R图'?'R':'S'),
          ...lim([['UCL',+uv.toFixed(2),orange,true],['CL',+cv.toFixed(2),gray,true]])
        ]);
      }
      if(t==='CPK分析图'){
        const vs = pts.map(p=>p.v);
        const mn = Math.min(...vs), mx = Math.max(...vs), step = (mx-mn)/10 || 1;
        const counts = new Array(10).fill(0);
        vs.forEach(v=>{ counts[Math.min(9, Math.floor((v-mn)/step))]++; });
        const cats = counts.map((_,i)=> (mn+step*(i+0.5)).toFixed(2));
        const near = y=> cats.reduce((b,x)=> Math.abs(x-y)<Math.abs(b-y)?x:b, cats[0]);
        return spcPBaseOpt(c, cats, [
          { name:c.item, type:'bar', data:counts, itemStyle:{ color:'#91caff' }, barMaxWidth:44,
            markLine:{ silent:true, symbol:'none', animation:false, label:{fontSize:10},
              data:[
                { xAxis:near(L.usl), lineStyle:{color:red,type:'solid'}, label:{formatter:'USL '+L.usl,color:red} },
                { xAxis:near(L.lsl), lineStyle:{color:red,type:'solid'}, label:{formatter:'LSL '+L.lsl,color:red} },
                { xAxis:near(L.cl), lineStyle:{color:gray,type:'dashed'}, label:{formatter:'CL '+L.cl,color:gray} }
              ] } }
        ], { yAxis:{ type:'value', name:'频数' } });
      }
      if(t==='CPK趋势图'){
        const out = [], hls = [];
        for(let i=0;i<pts.length;i+=8){
          const seg = pts.slice(i,i+8);
          if(seg.length<4) continue;
          const m = seg.reduce((a,b)=>a+b.v,0)/seg.length;
          const sd = Math.sqrt(seg.reduce((a,b)=>a+(b.v-m)*(b.v-m),0)/(seg.length-1)) || L.sigma;
          out.push(+Math.min((L.usl-m)/(3*sd),(m-L.lsl)/(3*sd)).toFixed(3));
          hls.push(seg.some(isHl));
        }
        return spcPBaseOpt(c, out.map((_,i)=>'段'+(i+1)), [
          mkLine(out.map((v,i)=> hlDatum(v, v<1.33?red:'#1f2937', hls[i])),'CPK'),
          spcPLimitSeries('目标CPK', 1.33, orange, true)
        ]);
      }
      if(t==='合格率统计图'){
        const win = Math.max(1, Math.ceil(pts.length/6)), cats=[], rates=[], hls=[];
        for(let i=0;i<pts.length;i+=win){
          const seg = pts.slice(i,i+win);
          const ok = seg.filter(p=> p.v<=L.usl && p.v>=L.lsl).length;
          cats.push('段'+(cats.length+1)); rates.push(+(ok/seg.length*100).toFixed(1));
          hls.push(seg.some(isHl));
        }
        return spcPBaseOpt(c, cats, [
          { name:'合格率', type:'bar', data:rates.map((v,i)=>({ value:v, itemStyle:{ color: hls[i]?hlc : v<95?red:blue } })), barMaxWidth:36 },
          spcPLimitSeries('目标合格率', 98, orange, true)
        ], { yAxis:{ type:'value', name:'合格率%', max:100 } });
      }
      if(t==='不合格项分布柏拉图'){
        const cats = ['外观不良','尺寸偏差','纯度不足','杂质超标','包装破损','其他'];
        const h = spcPHash(c.item+c.mat);
        const vals = cats.map((_,i)=> (h>>i)%37+3).sort((a,b)=>b-a);
        let acc = 0; const tot = vals.reduce((a,b)=>a+b,0);
        const cum = vals.map(v=>{ acc+=v; return +(acc/tot*100).toFixed(1); });
        const opt = spcPBaseOpt(c, cats, [
          { name:'不合格数', type:'bar', data:vals, itemStyle:{ color:'#5470c6' }, barMaxWidth:36 },
          { name:'累计占比', type:'line', yAxisIndex:1, data:cum, symbolSize:6, lineStyle:{ color:orange, width:1.5 }, itemStyle:{ color:orange } }
        ]);
        opt.yAxis = [{ type:'value', name:'数量' },{ type:'value', name:'累计%', max:100, axisLabel:{ formatter:'{value}%' } }];
        return opt;
      }
      const ser = pts.map(p=> hlDatum(p.v, (p.v>L.ucl||p.v<L.lcl)?red:'#1f2937', isHl(p)));
      return spcPBaseOpt(c, names, [
        mkLine(ser, c.item),
        ...lim([['USL',L.usl,red],['LSL',L.lsl,red],['UCL',L.ucl,orange,true],['LCL',L.lcl,orange,true],['CL',L.cl,gray,true]])
      ]);
    }
    function spcPRenderCharts(){
      nextTick(()=> setTimeout(()=>{
        const els = document.querySelectorAll('.spc-chart-card__body--live');
        if(!window.echarts){ els.forEach(el=>{ el.textContent = '图表组件未加载（演示需联网加载 ECharts）'; }); return; }
        Object.keys(spcPCharts).forEach(k=>{ try{ spcPCharts[k].dispose(); }catch(_e){} delete spcPCharts[k]; });
        spcP.groups.forEach(g=> g.combos.forEach(c=>{
          const el = document.getElementById(c.domId);
          if(!el) return;
          const inst = echarts.init(el);
          inst.setOption(spcPChartOption(c));
          spcPCharts[c.domId] = inst;
        }));
      },0));
    }
    function spcPDisposeCharts(){
      Object.keys(spcPCharts).forEach(k=>{ try{ spcPCharts[k].dispose(); }catch(_e){} delete spcPCharts[k]; });
    }
    window.addEventListener('resize', ()=> Object.values(spcPCharts).forEach(i=>{ try{ i.resize(); }catch(_e){} }));
    function spcPVal(seed, unit){
      const h = spcPHash(seed);
      if(unit==='%') return (99.5 + (h%45)/100).toFixed(2);
      if(unit==='ppb') return ((h%80)/10 + 0.5).toFixed(1);
      if(unit==='ppm') return ((h%400)/10 + 5).toFixed(1);
      return ((h%1000)/100).toFixed(2);
    }
    function spcPSampleRows(def, tp, matched, qmap){
      const rows = [];
      tp.mats.forEach(m=>{
        const mp = { code: spcPMatCode(m), name: spcPMatName(m) };
        const items = tp.items.slice();
        if(!items.length) return;
        matched.filter(s=> String(s['物料编码']||'').trim() === mp.code).forEach(s=>{
          items.forEach(it=>{
            if(rows.length >= 300) return;
            rows.push({
              样品编号: s['样品编号'] || '—', 报检单号: s['报检单号'] || '—', 报检类型: def.typeName,
              物料信息: [s['物料编码'], s['物料名称']].filter(Boolean).join(' / ') || '—',
              检验项: it, 样本值: spcPVal(s['样品编号']+'|'+it, qmap[it]), 单位: qmap[it] || '—',
              检验结论: s['检验结论'] || '—', 采样点: s['采样点'] || '—',
              供应商名称: s['供应商名称'] || '—', 客户名称: s['客户名称'] || '—',
              检验完成时间: s['检验完成时间'] || '—'
            });
          });
        });
      });
      return rows;
    }
    function spcPRowFilled(row){ return SPC_P_REQ.some(([k])=> spcPFieldOk(row, k)) || !!String(row.point||row.supplier||row.customer||row.hl||'').trim(); }
    function spcPQuery(){
      for(const def of SPC_P_TYPES){
        const rows = spcP.types[def.key].rows || [];
        let usable = 0;
        for(let i=0;i<rows.length;i++){
          const r = rows[i];
          if(!spcPRowFilled(r)) continue;
          for(const [key, label] of SPC_P_REQ){
            if(!spcPFieldOk(r, key)){ ElMessage.warning(def.label+' 第'+(i+1)+'行：'+label+'为必填'); return; }
          }
          usable++;
        }
        if(!usable){ ElMessage.warning(def.label+'：请至少填写一行完整查询条件'); return; }
      }
      const qmap = spcPQuantMap();
      const groups = [], samples = { pm:[], pp:[], pi:[] };
      SPC_P_TYPES.forEach(def=>{
        const combos = [], seen = new Set(), srows = [];
        (spcP.types[def.key].rows||[]).forEach(r=>{
          if(!spcPRowFilled(r)) return;
          const matched = spcPMatched(r, def);
          r.mats.forEach(m=>{
            const mp = { code: spcPMatCode(m), name: spcPMatName(m) };
            r.items.forEach(it=>{
              const ck = mp.code+'|'+it;
              if(seen.has(ck)){
                const ex = combos.find(x=> x.key.endsWith('|'+ck));
                if(ex && !ex.hl && r.hl) ex.hl = String(r.hl).trim();
                return;
              }
              seen.add(ck);
              combos.push(spcPCombo(def, r, mp, it, matched, qmap));
            });
          });
          srows.push.apply(srows, spcPSampleRows(def, r, matched, qmap));
        });
        groups.push({ key:def.key, label:def.label, combos });
        samples[def.key] = srows;
      });
      spcP.groups = groups;
      spcP.samples = samples;
      spcP.queried = true;
      const first = groups.find(g=> g.combos.length);
      if(first && !groups.some(g=> g.key===spcP.sampleTab && g.combos.length)) spcP.sampleTab = first.key;
      if(!first) ElMessage.info('所选物料未命中可统计的定量检验项');
      spcPRenderCharts();
    }
    function spcPReset(){
      spcP.more = false; spcP.queried = false; spcP.chartTab = 'I图'; spcP.sampleTab = 'pi'; spcP.anaTab = 'pi'; spcP.sampleDlg = false;
      spcP.groups = []; spcP.samples = { pi:[], pp:[], pm:[] };
      spcPDisposeCharts();
      SPC_P_TYPES.forEach(t=> Object.assign(spcP.types[t.key], spcPBlock(t.key)));
    }
    function spcPOpenSettings(){
      const first = SPC_P_TYPES.map(t=> spcP.types[t.key].rows).flat().find(r=> (r.items||[]).length);
      query['检验项'] = first ? first.items[0] : '';
      openChartSpcSettings();
    }
    function spcPExport(){
      if(!spcP.queried){ ElMessage.warning('请先查询'); return; }
      const rows = [];
      spcP.groups.forEach(g=> spcPAnaRows(g.key).forEach(r=> rows.push(Object.assign({ 类型:g.label }, r))));
      if(!rows.length){ ElMessage.warning('没有可导出的数据'); return; }
      const cols = ['类型'].concat(spcPAnaCols.value);
      const esc = v=> String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const head = '<tr>'+cols.map(c=> '<th>'+esc(c)+'</th>').join('')+'</tr>';
      const body = rows.map(r=> '<tr>'+cols.map(c=> '<td>'+esc(r[c])+'</td>').join('')+'</tr>').join('');
      const html = '<html><head><meta charset="utf-8"></head><body><table border="1">'+head+body+'</table></body></html>';
      const blob = new Blob([html], { type:'application/vnd.ms-excel' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '制程SPC_'+spcP.chartTab+'.xls';
      document.body.appendChild(a); a.click(); a.remove();
      ElMessage.success('已导出当前分析表');
    }
    watch(()=> pageId.value, v=>{ if(v===SPC_P_PAGE){ spcP.chartTab = (page.value?.chartTabs||['I图'])[0] || 'I图'; } else spcPDisposeCharts(); });
    watch(()=> spcP.chartTab, ()=>{ if(spcP.queried) spcPRenderCharts(); });
    function openYlSource(row){
      const src = row._src || {};
      if(!src.page || !CFG.pages[src.page]){ ElMessage.warning('未找到来源单据页面'); return; }
      const stub = CFG.pages[src.page].stub;
      onSelectMenu(src.page);
      if(stub || !src.key){ ElMessage.info('已跳转至「'+CFG.pages[src.page].title+'」，该模块原型待完善'); return; }
      setTimeout(()=>{
        if(src.tab) activeTab.value = src.tab;
        setTimeout(()=>{
          resetQueryModel();
          query[src.key] = row['来源单号'];
          ElMessage.success('已跳转至「'+CFG.pages[src.page].title+'」并按'+src.key+'过滤');
        }, 80);
      }, 0);
    }
    /** 仪器台账：左侧仪器类型（每个类型单独配置基础字段 / 其他信息 / 配置字段显隐），右侧列表与新增表单按类型配置渲染 */
    const INST_PAGE = 'instrument';
    const INST_BASE_FIELDS = ['使用状态','仪器状态','仪器图片','仪器编号','仪器名称','仪器条码','仪器类型','规格型号','存放位置','责任部门','责任人','购置日期','仪器厂家','出厂编号','出厂日期','厂家联系人','附件','备注','创建人','创建时间'];
    const INST_BASE_REQ = ['使用状态','仪器编号','仪器名称','仪器类型'];
    const INST_PLAN_FIELDS = ['日计划时长','周计划时长','月计划时长','年计划时长'];
    const INST_LIST_COLS = ['仪器状态','仪器图片','仪器编号','仪器名称','仪器条码','仪器类型','规格型号','使用状态','存放位置','责任部门','责任人','购置日期','仪器厂家','出厂编号','出厂日期','厂家联系人','附件','备注'];
    const INST_FORM_BASE = ['仪器图片','仪器编号','仪器名称','仪器条码','仪器类型','规格型号','使用状态','存放位置','责任部门','责任人','购置日期','仪器厂家','出厂编号','出厂日期','厂家联系人','附件','备注'];
    const INST_OTHER_COLS = {
      内校: [['是否内校','是否内校'],['上次内校日期','本次内校时间'],['上次内校结果','本次内校结果'],['内校周期','内校周期'],['内校预警周期','内校预警周期'],['下次内校日期','下次内校时间']],
      外校: [['是否外校','是否外校'],['上次外校日期','本次外校日期'],['上次外校结果','本次外校结果'],['上次外校单位','本次外校单位'],['外校周期','外校周期'],['外校预警周期','外校预警周期'],['下次外校日期','下次外校日期']]
    };
    const INST_CYCLE_UNITS = { 内校: ['小时','天','月','年'], 外校: ['天','月','年'] };
    const INST_STATUS_ORDER = ['待内校','待外校','待点检','待期间核查','维修中','待保养'];
    const INST_DEPT_TREE = [
      { value:'质检中心', label:'质检中心', children:[{ value:'理化分析室', label:'理化分析室' }, { value:'仪器分析室', label:'仪器分析室' }] },
      { value:'计量校准部', label:'计量校准部' },
      { value:'生产部', label:'生产部', children:[{ value:'生产一车间', label:'生产一车间' }, { value:'生产二车间', label:'生产二车间' }] },
      { value:'研发中心', label:'研发中心' }
    ];
    /** 仪器模块可关联的数据字典，名称为「字典名称（字典编码）」，字典项取数据字典中启用的项 */
    const INST_DICTS = ['停用类型（sbtytylx）','启用类型（sbqyqylx）','调拨类型（sbdbdblx）','报废类型（sbbflx）','验收结论（ysjl）'];
    function instDictOpts(name){
      const code = (String(name||'').match(/（(\w+)）$/)||[])[1];
      return code && window.WMS_DICT ? window.WMS_DICT.enabledNames(code, MOCK.dict) : [];
    }
    const INST_LINK_MODS = [[DJ_PLAN,'tab-2'],[BY_PLAN,'tab-2'],[HC_PLAN,'tab-2'],[NJ_PLAN,'tab-2'],[WJ_ORDER,'tab-2'],
      ['np-0308-01'],['np-0308-02','tab-2'],['np-0308-03','tab-1'],['np-0308-05','tab-2'],['np-0309-01'],['np-0310-01'],['np-0311-01']];
    function instBag(){ return MOCK[INST_PAGE] = MOCK[INST_PAGE] || { main: [] }; }
    function instTypes(){ const b = instBag(); if(!Array.isArray(b.types)) b.types = []; return b.types; }
    function instCfgFields(){ const b = instBag(); if(!Array.isArray(b.fields)) b.fields = []; return b.fields; }
    function instTypeOf(name){ return instTypes().find(t=> t['仪器类型']===name) || null; }
    function instUsers(){
      const s = new Set(demoSysUsers().map(u=> u['人员姓名']));
      djInstruments().forEach(r=>{ if(r['责任人']) s.add(r['责任人']); });
      return [...s];
    }

    const instTypeId = ref('');
    const instTypeKw = ref('');
    const instTypeKwApplied = ref('');
    const instTypeList = computed(()=>{
      storeTick.value;
      if(pageId.value!==INST_PAGE) return [];
      const kw = instTypeKwApplied.value.toLowerCase();
      return instTypes().filter(t=> !kw || String(t['仪器类型']).toLowerCase().includes(kw));
    });
    const instCfgFieldList = computed(()=>{ storeTick.value; return instCfgFields().slice(); });
    const instAllTypes = computed(()=>{ storeTick.value; return instTypes().slice(); });
    function resetInstState(){ instTypeId.value = ''; instTypeKw.value = ''; instTypeKwApplied.value = ''; }
    function onInstTypeQuery(){
      instTypeKwApplied.value = instTypeKw.value.trim();
      instTypeId.value = '';
      selectedIds.value = []; pageNum.value = 1;
      if(!instTypeKwApplied.value) resetQueryModel();
    }
    function selectInstType(name){
      instTypeId.value = instTypeId.value===name ? '' : name;
      selectedIds.value = []; pageNum.value = 1;
    }

    const instTypeVisible = ref(false);
    const instTypeMode = ref('add');
    const instTypeOld = ref(null);
    const instTypeForm = reactive({ 仪器类型:'', 日计划时长:null, 周计划时长:null, 月计划时长:null, 年计划时长:null, 基础字段:[], 其他信息:[], 配置字段:[] });
    const instTypeTitle = computed(()=> ({ add:'新增', edit:'编辑', copy:'复制' }[instTypeMode.value]||'新增') + '仪器类型');
    function openInstType(mode, t){
      instTypeMode.value = mode;
      instTypeOld.value = mode==='edit' ? t : null;
      instTypeForm['仪器类型'] = t ? (mode==='copy' ? t['仪器类型']+'-副本' : t['仪器类型']) : '';
      instTypeForm['基础字段'] = t ? (t['基础字段']||[]).slice() : INST_BASE_FIELDS.slice();
      instTypeForm['其他信息'] = t ? (t['其他信息']||[]).slice() : ['内校','外校'];
      instTypeForm['配置字段'] = t ? (t['配置字段']||[]).slice() : [];
      INST_PLAN_FIELDS.forEach(k=>{ instTypeForm[k] = t && t[k]!=null ? Number(t[k]) : null; });
      instTypeVisible.value = true;
    }
    function saveInstType(){
      const name = String(instTypeForm['仪器类型']||'').trim();
      if(!name){ ElMessage.warning('请输入仪器类型'); return; }
      const old = instTypeOld.value;
      if(instTypes().some(t=> t!==old && t['仪器类型']===name)){ ElMessage.warning('仪器类型「'+name+'」已存在，不可重复'); return; }
      const base = INST_BASE_FIELDS.filter(f=> INST_BASE_REQ.includes(f) || instTypeForm['基础字段'].includes(f));
      for(const k of INST_PLAN_FIELDS){
        const v = Number(instTypeForm[k]);
        if(!(v > 0)){ ElMessage.warning('请输入'+k+'（正数，保留一位小数，单位：时）'); return; }
      }
      const ids = new Set(instCfgFields().map(f=> f.id));
      const payload = { 仪器类型: name, 基础字段: base, 其他信息: ['内校','外校'].filter(w=> instTypeForm['其他信息'].includes(w)), 配置字段: instTypeForm['配置字段'].filter(id=> ids.has(id)) };
      INST_PLAN_FIELDS.forEach(k=>{ payload[k] = Number(Number(instTypeForm[k]).toFixed(1)); });
      if(old){
        const from = old['仪器类型'];
        if(from!==name){
          djInstruments().forEach(r=>{ if(r['仪器类型']===from) r['仪器类型'] = name; });
          if(instTypeId.value===from) instTypeId.value = name;
        }
        Object.assign(old, payload);
      } else {
        instTypes().push(Object.assign({ id:'it-'+Date.now() }, payload, { 创建人:'管理员', 创建时间: nowStamp() }));
      }
      instTypeVisible.value = false;
      bumpStore();
      ElMessage.success(old ? '保存成功' : (instTypeMode.value==='copy' ? '已复制仪器类型（含字段显隐配置，不含数据列表）' : '已新增仪器类型'));
    }
    function onInstTypeOp(cmd, t){
      if(cmd==='删除'){ removeInstType(t); return; }
      openInstType(cmd==='复制' ? 'copy' : 'edit', t);
    }
    function removeInstType(t){
      const name = t['仪器类型'];
      const n = djInstruments().filter(r=> r['仪器类型']===name).length;
      if(n){ ElMessage.warning('仪器类型「'+name+'」下已有 '+n+' 台仪器，不可删除'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除仪器类型「'+name+'」？', '删除', { type:'warning' }).then(()=>{
        const list = instTypes();
        const i = list.indexOf(t);
        if(i>=0) list.splice(i, 1);
        if(instTypeId.value===name) instTypeId.value = '';
        bumpStore();
        ElMessage.success('已删除');
      }).catch(()=>{});
    }

    const instCfgVisible = ref(false);
    const instCfgRows = ref([]);
    const instCfgSel = ref([]);
    function newInstCfgId(){
      const hex = '0123456789abcdef';
      return 'f1a' + Array.from({ length: 17 }, ()=> hex[Math.floor(Math.random()*16)]).join('');
    }
    function openInstCfg(){
      instCfgRows.value = instCfgFields().map(f=> ({ ...f }));
      instCfgSel.value = [];
      instCfgVisible.value = true;
    }
    function addInstCfgRow(){ instCfgRows.value.push({ id: newInstCfgId(), 字段名称:'', 字段属性:'输入框', 关联字典表:'' }); }
    function onInstCfgAttr(row){ if(row['字段属性']!=='字典表') row['关联字典表'] = ''; }
    function delInstCfgRows(){
      const sel = instCfgSel.value || [];
      if(!sel.length){ ElMessage.warning('请先勾选要删除的字段'); return; }
      const used = sel.map(f=> ({ f, types: instTypes().filter(t=> (t['配置字段']||[]).includes(f.id)).map(t=> t['仪器类型']) })).filter(x=> x.types.length);
      if(used.length){
        ElMessage.error({ message: used.map(x=> '字段「'+(x.f['字段名称']||x.f.id)+'」已被仪器类型「'+x.types.join('、')+'」引用').join('；')+'，不可删除', duration: 5000 });
        return;
      }
      const ids = new Set(sel.map(f=> f.id));
      instCfgRows.value = instCfgRows.value.filter(f=> !ids.has(f.id));
      instCfgSel.value = [];
      ElMessage.success('已删除 '+ids.size+' 个字段，点击「确定」后生效');
    }
    function saveInstCfg(){
      const rows = instCfgRows.value;
      const seen = new Set();
      for(const r of rows){
        const n = String(r['字段名称']||'').trim();
        if(!n){ ElMessage.warning('请填写字段名称'); return; }
        if(seen.has(n)){ ElMessage.warning('字段名称「'+n+'」重复，字段名称需唯一'); return; }
        seen.add(n);
        r['字段名称'] = n;
        if(r['字段属性']==='字典表' && !r['关联字典表']){ ElMessage.warning('字段「'+n+'」的字段属性为字典表，请选择关联字典表'); return; }
      }
      const prev = new Map(instCfgFields().map(f=> [f.id, f]));
      const changed = rows.filter(r=> prev.has(r.id) && prev.get(r.id)['字段属性']!==r['字段属性']);
      const apply = ()=>{
        changed.forEach(r=> djInstruments().forEach(i=>{ if(r.id in i) i[r.id] = ''; }));
        instBag().fields = rows.map(r=> ({ ...r }));
        instCfgVisible.value = false;
        bumpStore();
        ElMessage.success('配置字段已保存' + (changed.length ? '；已清空所有仪器的「'+changed.map(r=> r['字段名称']).join('、')+'」字段值' : ''));
      };
      if(!changed.length){ apply(); return; }
      ElementPlus.ElMessageBox.confirm('字段「'+changed.map(r=> r['字段名称']).join('、')+'」的字段属性已变更，确定后将清空所有仪器类型下该字段的内容值，是否继续？', '提示', { type:'warning' })
        .then(apply).catch(()=>{});
    }

    function instStatusMap(){
      const m = new Map();
      const add = (id, st)=>{ if(!id) return; if(!m.has(id)) m.set(id, new Set()); m.get(id).add(st); };
      djInstruments().forEach(r=>{
        (r._pending||[]).forEach(st=>{ if(INST_STATUS_ORDER.includes(st)) add(r.id, st); });
      });
      njTodoRows().forEach(t=> add(t.id.slice(4), '待内校'));
      wjTodoRows().forEach(t=> add(t.id.slice(4), '待外校'));
      const now = new Date();
      [[DJ_PLAN,'待点检'],[HC_PLAN,'待期间核查'],[BY_PLAN,'待保养']].forEach(([pid, st])=>{
        ((MOCK[pid]||{})['tab-1']||[]).forEach(p=>{
          const t = djParseTime(p['计划开始时间']);
          if(DJ_OPEN.includes(p['计划状态']) && t && t <= now) add(p._instId, st);
        });
      });
      const out = new Map();
      m.forEach((s, id)=> out.set(id, INST_STATUS_ORDER.filter(x=> s.has(x)).join(',')));
      return out;
    }
