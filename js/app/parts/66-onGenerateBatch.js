    function onGenerateBatch(){
      const cnt = parseInt(batchForm['条码生成个数'],10);
      if(!cnt || cnt<1){ ElMessage.error('请填写条码生成个数'); return; }
      if(cnt>9999){ ElMessage.error('条码生成个数超出单次最大生成数量'); return; }
      const asSerial = pageId.value==='serial-arch' || batchCtx.from==='wh-po-in';
      if(asSerial && batchForm['物料信息']){
        syncSerialCurrentQty(batchForm);
        if(!String(batchForm['物料批号']||'').trim()){ ElMessage.warning('请填写物料批号'); return; }
        if(!String(batchForm['建档数量']||'').trim()){ ElMessage.warning('请填写建档数量'); return; }
        if(!(Number(batchForm['建档数量'])>0)){ ElMessage.warning('建档数量必须为正数'); return; }
        if(!String(batchForm['当前数量']||'').trim()) batchForm['当前数量'] = batchForm['建档数量'];
        if(!String(batchForm['当前数量']||'').trim()){ ElMessage.warning('请填写当前数量'); return; }
        if(!(Number(batchForm['当前数量'])>0)){ ElMessage.warning('当前数量必须为正数'); return; }
        if(!String(batchForm['供应商信息']||'').trim()){ ElMessage.warning('请选择供应商信息'); return; }
        if(!String(batchForm['生产厂家']||'').trim()){ ElMessage.warning('请选择生产厂家'); return; }
        if(!String(batchForm['生产日期']||'').trim()){ ElMessage.warning('请选择生产日期'); return; }
      }
      const cols = batchFieldSource.value?.batchAddLineColumns || page.value?.batchAddLineColumns || [];
      const useTm = asSerial || pageId.value==='outer-serial';
      const prefix = useTm ? 'TM' : 'BR';
      refreshSerialExpire(batchForm);
      const expire = batchForm['失效日期'] || '';
      const expDisp = (()=>{
        const n = String(batchForm['有效期']||'').trim();
        const u = String(batchForm['有效期单位']||'天').trim() || '天';
        return n ? `${n} ${u}` : (batchForm['有效期']||'');
      })();
      const startNo = useTm ? nextTmNo() : (()=>{
        const d = new Date();
        const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        return prefix + ymd + '0001';
      })();
      const head = startNo.slice(0, -4);
      const startSeq = parseInt(startNo.slice(-4),10) || 1;
      batchLines.value = Array.from({length: Math.min(cnt,50)}, (_,i)=>{
        const row = {};
        cols.forEach(c=>{
          if(c==='条码号') row[c] = head + String(startSeq + i).padStart(4,'0');
          else if(c==='有效期') row[c] = expDisp || batchForm[c] || '';
          else if(c==='失效日期') row[c] = expire || '';
          else if(c==='当前数量') row[c] = batchForm['当前数量'] || batchForm['建档数量'] || '';
          else if(batchForm[c]!==undefined && batchForm[c]!=='') row[c]=batchForm[c];
          else if(c.includes('物料')) row[c]= batchForm['物料信息'] || '';
          else row[c]= batchForm[c] || '';
        });
        return row;
      });
      ElMessage.success(`已生成 ${batchLines.value.length} 条条码`);
    }
    function onBatchDeleteLines(){
      if(!batchSelected.value.length){ ElMessage.warning('请先勾选明细行'); return; }
      const set = new Set(batchSelected.value);
      batchLines.value = batchLines.value.filter(r=>!set.has(r));
      batchSelected.value=[];
      ElMessage.success('已删除勾选明细');
    }
    function onBatchOk(){
      if(!batchLines.value.length){ ElMessage.warning('请先生成条码'); return; }
      const asSerial = pageId.value==='serial-arch' || batchCtx.from==='wh-po-in';
      if(asSerial){
        const list = ((MOCK['serial-arch'] = MOCK['serial-arch'] || {}).main = (MOCK['serial-arch'].main || []));
        const stamp = nowStamp();
        const srcNo = batchCtx.from==='wh-po-in' ? (batchCtx.noticeNo || '—') : '—';
        const dup = batchLines.value.find(r=> tmBarcodeTaken(r['条码号']));
        if(dup){ ElMessage.warning('存在重复条码号：'+dup['条码号']); return; }
        const seen = new Set();
        for(const r of batchLines.value){
          if(seen.has(r['条码号'])){ ElMessage.warning('生成明细中存在重复条码号：'+r['条码号']); return; }
          seen.add(r['条码号']);
        }
        const n = batchLines.value.length;
        batchLines.value.slice().reverse().forEach((r, idx)=>{
          const qty = String(r['当前数量']||'').trim();
          list.unshift({
            id: 'sa-b-' + Date.now() + '-' + idx,
            使用状态: '在用',
            库存状态: '初始化',
            检验状态: '待检验',
            存储位置: '—',
            条码号: r['条码号'],
            包装规格: r['包装规格'] || '—',
            来源单号: srcNo,
            来源条码号: '—',
            物料信息: r['物料信息'] || '—',
            物料批号: r['物料批号'] || '—',
            客户批号: r['客户批号'] || '—',
            建档数量: String(r['建档数量']||batchForm['建档数量']||'').trim() || '—',
            当前数量: qty==='' ? '—' : qty,
            库存单位: r['库存单位'] || batchForm['库存单位'] || '—',
            供应商信息: r['供应商信息'] || '—',
            生产厂家: r['生产厂家'] || '—',
            生产日期: r['生产日期'] || '—',
            有效期: r['有效期'] || '—',
            失效日期: r['失效日期'] || '—',
            绑定状态: '未绑定',
            当前绑定外包材: '—',
            当前步骤: '—',
            当前单据号: '—',
            所属阶段: '—',
            最新操作人: '张三',
            最新操作时间: stamp,
            创建时间: stamp,
            备注: batchForm['备注'] || '—'
          });
        });
        batchVisible.value=false;
        resetBatchCtx();
        bumpStore();
        ElMessage.success(`已批量新增 ${n} 条流水码档案`);
        return;
      }
      batchVisible.value=false;
      resetBatchCtx();
      ElMessage.success(`已批量新增 ${batchLines.value.length} 条档案`);
    }
    function onCraftDragStart(name){ craftDragProc.value=name; }
    function addCraftNode(name){
      if(craftLocked.value){ ElMessage.warning('画布已锁定'); return; }
      if(!name) return;
      if(craftNodes.value.some(n=> n.name===name)){ ElMessage.warning('同一工序在画布中仅可出现一次'); return; }
      const id='n'+Date.now()+Math.floor(Math.random()*100);
      craftNodes.value = craftNodes.value.concat([{id, name, x:40+craftNodes.value.length*24, y:40+craftNodes.value.length*28}]);
    }
    function onCraftDrop(e){
      if(craftLocked.value){ ElMessage.warning('画布已锁定'); return; }
      const name = craftDragProc.value; if(!name) return;
      if(craftNodes.value.some(n=> n.name===name)){ ElMessage.warning('同一工序在画布中仅可出现一次'); craftDragProc.value=''; return; }
      const rect = e.currentTarget.getBoundingClientRect();
      const id='n'+Date.now();
      craftNodes.value = craftNodes.value.concat([{id, name, x: Math.max(10,e.clientX-rect.left-40), y: Math.max(10,e.clientY-rect.top-12)}]);
      craftDragProc.value='';
    }

    function openCraftProc(n) {
      if(craftLocked.value){ ElMessage.warning('画布已锁定'); return; }
      const proc = ((MOCK['insp-proc']||{}).main||[]).find(r => r['工序名称'] === n.name) || {};
      craftProcNodeId.value = n.id;
      craftProcForm.value = {
        name: n.displayName || n.name || '',
        code: n.code || proc['工序编码'] || '',
        formName: n.formName || proc['表单名称'] || '',
        desc: n.desc || '',
        attach: n.attach || '',
        minDur: n.minDur || '',
        minDurUnit: n.minDurUnit || 'min',
        maxDur: n.maxDur || '',
        maxDurUnit: n.maxDurUnit || 'min',
        role: n.role || '',
      };
      craftProcVisible.value = true;
    }
    function onCraftProcOk() {
      const f = craftProcForm.value || {};
      if(!String(f.name||'').trim()){ ElMessage.error('请填写工序名称'); return; }
      if(!String(f.role||'').trim()){ ElMessage.error('请选择本工序执行岗位'); return; }
      const minV = String(f.minDur||'').trim();
      const maxV = String(f.maxDur||'').trim();
      if((minV && !(Number(minV)>0)) || (maxV && !(Number(maxV)>0))){ ElMessage.error('时长必须填写大于 0 的正数'); return; }
      if(minV && maxV && Number(minV) > Number(maxV)){ ElMessage.error('最短时长不能大于最长时长'); return; }
      const n = craftNodes.value.find(x => x.id === craftProcNodeId.value);
      if (n) {
        Object.assign(n, {
          displayName: f.name,
          name: n.name, // 池内匹配键保持原工序名
          code: f.code,
          formName: f.formName,
          desc: f.desc,
          attach: f.attach,
          minDur: f.minDur,
          minDurUnit: f.minDurUnit,
          maxDur: f.maxDur,
          maxDurUnit: f.maxDurUnit,
          role: f.role,
          configured: true,
        });
      }
      craftProcVisible.value = false;
      ElMessage.success('工序流程配置保存成功');
    }
    function removeCraftNode(n){
      if(!n) return;
      if(craftLocked.value){ ElMessage.warning('画布已锁定'); return; }
      ElementPlus.ElMessageBox.confirm('确认删除该工序节点？删除后相关连线一并移除。', '删除确认', {
        confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning'
      }).then(()=>{
        craftNodes.value = craftNodes.value.filter(x => x.id !== n.id);
        craftEdges.value = (craftEdges.value||[]).filter(e=>{
          const a = Array.isArray(e) ? e[0] : e.from;
          const b = Array.isArray(e) ? e[1] : e.to;
          return a !== n.id && b !== n.id;
        });
        ElMessage.success('节点已删除');
      }).catch(()=>{});
    }

    function onCraftOk(){
      if(craftNodes.value.length<1){ ElMessage.error('请至少拖拽添加一道工序节点再保存'); return; }
      if(pageId.value==='insp-craft' && craftRow.value){
        const names = craftNodes.value.map(n=> n.name);
        if(new Set(names).size !== names.length){ ElMessage.warning('同一工序在画布中仅可出现一次'); return; }
        const missingRole = craftNodes.value.some(n => !String(n.role||'').trim());
        if(missingRole){ ElMessage.error('存在工序未配置执行岗位，请完善工序流程控制信息'); return; }
        craftRow.value._craft = {
          nodes: craftNodes.value.map(n=>({...n})),
          edges: (craftEdges.value||[]).map(e=> Array.isArray(e) ? [...e] : e)
        };
        bumpStore();
      }
      craftVisible.value=false;
      ElMessage.success('工艺配置保存成功');
    }
    function uid(){ return 'f'+Date.now()+Math.floor(Math.random()*1000); }
    function makeDesignField(type){
      const base = { id:uid(), label:type, type, required:false, placeholder:'', fontSize:13, color:'#1A4099', bold:false };
      if(type==='子表（表单）' || type==='子表（表格）'){
        base.children = [
          {label:'第一次取样时间', type:'日期选择', required:true},
          {label:'中间釜编号', type:'下拉选择', required:false},
        ];
      }
      return base;
    }
    function addDesignField(type){
      designCanvas.value = designCanvas.value.concat([makeDesignField(type)]);
      designActive.value = designCanvas.value.length-1;
      designDirty.value = true;
      ElMessage.success('组件已添加至表单');
    }
    function onDesignDrop(){
      if(!designDragType.value) return;
      addDesignField(designDragType.value);
      designDragType.value='';
    }
    function selectDesignField(i){ designActive.value=i; }
    function moveDesignField(i, dir){
      const j=i+dir; if(j<0||j>=designCanvas.value.length) return;
      const arr=[...designCanvas.value];
      const t=arr[i]; arr[i]=arr[j]; arr[j]=t;
      designCanvas.value=arr; designActive.value=j; designDirty.value=true;
    }
    function copyDesignField(i){
      const src=designCanvas.value[i];
      const copy=JSON.parse(JSON.stringify(src)); copy.id=uid(); copy.label=(copy.label||'')+'(副本)';
      const arr=[...designCanvas.value]; arr.splice(i+1,0,copy);
      designCanvas.value=arr; designActive.value=i+1; designDirty.value=true;
      ElMessage.success('字段复制完成');
    }
    function removeDesignField(i){
      ElementPlus.ElMessageBox.confirm('是否确认删除该表单字段，删除后配置将清空？','删除确认',{
        confirmButtonText:'确认删除', cancelButtonText:'取消', type:'warning'
      }).then(()=>{
        designCanvas.value = designCanvas.value.filter((_,idx)=>idx!==i);
        designActive.value = designCanvas.value.length ? Math.min(i, designCanvas.value.length-1) : -1;
        designDirty.value=true;
        ElMessage.success('字段已移除');
      }).catch(()=>{});
    }
    function removeDesignChild(i, ci){
      ElementPlus.ElMessageBox.confirm('是否确认删除该表单字段，删除后配置将清空？','删除确认',{
        confirmButtonText:'确认删除', cancelButtonText:'取消', type:'warning'
      }).then(()=>{
        const f={...designCanvas.value[i], children:[...(designCanvas.value[i].children||[])]};
        f.children.splice(ci,1);
        const arr=[...designCanvas.value]; arr[i]=f; designCanvas.value=arr;
        designDirty.value=true; ElMessage.success('字段已移除');
      }).catch(()=>{});
    }
    function openFormPreview(){ formPreviewVisible.value=true; }
    function onDesignCancel(){
      if(!designDirty.value){ designVisible.value=false; ElMessage.success('已放弃本次表单修改'); return; }
      ElementPlus.ElMessageBox.confirm('当前表单存在未保存的设计变更，离开将丢失修改，是否继续？','放弃修改确认',{
        confirmButtonText:'确认离开', cancelButtonText:'继续编辑', type:'warning'
      }).then(()=>{ designVisible.value=false; ElMessage.success('已放弃本次表单修改'); }).catch(()=>{});
    }
    function onDesignOk(){
      const bad = designCanvas.value.some(f=> (f.children||[]).some(c=>c.required && !c.label));
      if(bad){ ElMessage.error('请完善表单必填配置后再保存'); return; }
      designVisible.value=false; designDirty.value=false;
      ElMessage.success('表单设计配置已保存生效');
    }
    function syncPrepPickQty(){
      if(pageId.value!=='wh-so-prep' || !detailRow.value) return;
      const sum = (detailLineRows.value||[]).reduce((s,r)=> s + (Number(r['当前数量'] ?? r['数量'])||0), 0);
      const plan = Number(detailRow.value['备货数量'])||0;
      detailRow.value['已备数量'] = sum.toFixed(3);
      if(sum<=0) detailRow.value['备货状态'] = '待执行';
      else if(sum>=plan) detailRow.value['备货状态'] = '已完成';
      else detailRow.value['备货状态'] = '执行中';
      const list = ((MOCK['wh-so-prep']||{}).main||[]);
      const cur = list.find(r=> r.id===detailRow.value.id || r['备货通知单号']===detailRow.value['备货通知单号']);
      if(cur){
        cur['已备数量'] = detailRow.value['已备数量'];
        cur['备货状态'] = detailRow.value['备货状态'];
        cur._pickLines = detailLineRows.value.map(r=>({...r}));
      }
      bumpStore();
    }
    function removeMatMediumPick(i){
      const mats = (formModel._mats || []).slice();
      mats.splice(i, 1);
      formModel._mats = mats;
      formModel['物料信息'] = mats.length ? (`已选 ${mats.length} 种物料`) : '';
    }
    function removeDetailPickLine(i){
      if(pageId.value!=='wh-so-prep') return;
      const removed = detailLineRows.value[i];
      const prepNo = (detailRow.value||{})['备货通知单号'] || '';
      detailLineRows.value = detailLineRows.value.filter((_,idx)=> idx!==i);
      detailLineSelected.value = [];
      if(removed && removed['条码号']) releasePrepSerialArch([removed['条码号']], prepNo);
      syncPrepPickQty();
      ElMessage.success('已删除备货明细行');
    }
    function persistOrderDetailLines(){
      const noField = pageId.value==='po' ? '采购订单号' : pageId.value==='so' ? '销售订单号' : pageId.value==='wwpo' ? '委外订单号' : '';
      const listKey = pageId.value;
      const list = ((MOCK[listKey]||{}).main||[]);
      const cur = list.find(r=> r.id===detailRow.value.id || r[noField]===detailRow.value[noField]);
      if(!cur) return;
      if(pageId.value==='po'){
        cur._lines = detailLineRows.value.map((r,i)=>{
          const plan = Number(r['计划数量'])||0;
          const inQty = Number(r['已入库数量'] ?? r['已入库'])||0;
          return {
            物料编码: codeOf(r['物料信息']),
            物料信息: r['物料信息'],
            采购单位: r['采购单位'],
            计划数量: String(plan),
            已入库数量: String(inQty),
            未入库数量: String(Math.max(0, plan - inQty)),
            行状态: r['行状态']||'待执行',
            备注: r['备注']||'—'
          };
        });
        syncPoStatusFromLines(cur);
        detailRow.value['订单状态'] = cur['订单状态'];
      } else if(pageId.value==='so'){
        cur._lines = detailLineRows.value.map((r,i)=>{
          const plan = Number(r['计划数量'])||0;
          const outQty = Number(r['已出库数量'])||0;
          return {
            物料编码: codeOf(r['物料信息']),
            物料信息: r['物料信息'],
            销售单位: r['销售单位'],
            计划数量: String(plan),
            已出库数量: String(outQty),
            未出库数量: String(Math.max(0, plan - outQty)),
            行状态: r['行状态']||'待执行',
            备注: r['备注']||'—'
          };
        });
        syncSoStatusFromLines(cur);
        detailRow.value['订单状态'] = cur['订单状态'];
      } else if(pageId.value==='wwpo'){
        cur._lines = detailLineRows.value.map((r,i)=>{
          const plan = Number(r['计划数量'])||0;
          const doneQty = Number(r['已出/入库数量'] ?? r['已出/收数量'])||0;
          return {
            物料编码: codeOf(r['物料信息']),
            物料信息: r['物料信息'],
            '发料/产出类型': r['发料/产出类型']||'',
            采购单位: r['单位'] || r['采购单位'] || matUnit(r['物料信息'],'po'),
            计划数量: String(plan),
            '已出/入库数量': String(doneQty),
            '未出/入库数量': String(Math.max(0, plan - doneQty)),
            行状态: r['行状态']||'待执行',
            备注: r['备注']||'—'
          };
        });
        syncWwpoStatusFromLines(cur);
        detailRow.value['订单状态'] = cur['订单状态'];
      }
      bumpStore();
    }
    function onSoPrepPushOk(){
      const qty = String(soPrepPushForm['备货数量']||'').trim();
      if(!(Number(qty)>0)){ ElMessage.warning('备货数量须大于0'); return; }
      const maxQty = Number(soPrepPushForm._maxQty||0);
      if(maxQty>0 && Number(qty)>maxQty){ ElMessage.warning('备货数量不可超过未出库数量'); return; }
      if(!soPrepPushForm['计划日期']){ ElMessage.warning('请选择计划日期'); return; }
      if(!soPrepPushForm['单据类型']){ ElMessage.warning('请选择单据类型'); return; }
      const list = ((MOCK['wh-so-prep'] = MOCK['wh-so-prep'] || {}).main = (MOCK['wh-so-prep'].main || []));
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
      const prepNo = nextBizNo('BHT','wh-so-prep','备货通知单号');
      list.unshift({
        id: 'bh-' + Date.now(),
        备货状态: '待执行',
        备货通知单号: prepNo,
        单据类型: soPrepPushForm['单据类型']||'正常备货',
        计划日期: soPrepPushForm['计划日期']||'',
        关联销售订单: soPrepPushForm['关联销售订单']||'',
        客户名称: soPrepPushForm['客户名称']||'',
        物料信息: soPrepPushForm['物料信息']||'',
        计划件数: String(soPrepPushForm['计划件数']||'').trim() || '—',
        备货数量: Number(qty).toFixed(3),
        单位: soPrepPushForm['单位']||'KG',
        已备数量: '0.000',
        订单要求: soPrepPushForm['订单要求']||'—',
        制单人: '张三',
        制单时间: stamp,
        备注: soPrepPushForm['备注']||'—',
        _pickLines: []
      });
      soPrepPushVisible.value=false;
      bumpStore();
      ElMessage.success('备货通知单已生成');
    }
    function onDetailLineAction(name){
      if(name==='下推备货通知单' && pageId.value==='so'){
        const selected = detailLineSelected.value || [];
        if(selected.length!==1){ ElMessage.warning('请单选一条未出库数量大于0的明细行'); return; }
        const line = selected[0];
        const left = Number(line['未出库数量'])||0;
        if(left<=0){ ElMessage.warning('所选明细无未出库数量，无法下推'); return; }
        if(!['待执行','执行中'].includes(line['行状态'])){ ElMessage.warning('仅待执行或执行中的明细可下推备货'); return; }
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        Object.keys(soPrepPushForm).forEach(k=> delete soPrepPushForm[k]);
        Object.assign(soPrepPushForm, {
          关联销售订单: detailRow.value['销售订单号']||'',
          客户名称: detailRow.value['客户名称']||'',
          物料信息: line['物料信息']||'',
          单位: line['销售单位']||'KG',
          计划件数: '',
          备货数量: String(left),
          计划日期: ymd,
          单据类型: (soPrepDocTypeOptions.value && soPrepDocTypeOptions.value[0]) || '正常备货',
          订单要求: detailRow.value['备注']||'',
          备注: '—',
          _maxQty: left,
          _lineRef: line
        });
        soPrepPushVisible.value=true;
        return;
      }
      if(name==='关闭' && (pageId.value==='po' || pageId.value==='so' || pageId.value==='wwpo' || isWhLineClosePage())){
        const selected = detailLineSelected.value || [];
        const noticeLike = isWhLineClosePage();
        if(!selected.length){ ElMessage.warning(noticeLike ? '请先勾选明细行' : '请先勾选要关闭的明细行'); return; }
        if(noticeLike && selected.some(r=> r['行状态']==='已关闭')){
          ElMessage.warning('所选明细包含已关闭行，无法关闭'); return;
        }
        if(selected.some(r=> !['待执行','执行中'].includes(r['行状态']))){
          ElMessage.warning(noticeLike ? '所选明细包含已关闭行，无法关闭' : '仅待执行或执行中的明细行可关闭'); return;
        }
        const closeTip = noticeLike
          ? '确认关闭所选明细行？关闭后不可恢复为待执行。'
          : pageId.value==='po'
          ? '确认关闭所选明细行？关闭后该行不可再进行采购收料与入库操作。'
          : pageId.value==='so'
            ? '确认关闭所选明细行？关闭后该行不可再进行备货与出库操作。'
            : '确认关闭所选明细行？关闭后该行不可再进行委外发料与收料操作。';
        ElementPlus.ElMessageBox.confirm(closeTip, '关闭确认',{
          confirmButtonText: noticeLike ? '确认关闭' : '确认', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const set = new Set(selected);
          detailLineRows.value = detailLineRows.value.map(r=>{
            if(!set.has(r)) return r;
            const next = {...r, 行状态:'已关闭'};
            if(pageId.value==='po'){
              next['未入库数量'] = '0';
            } else if(pageId.value==='so'){
              next['未出库数量'] = '0';
            } else if(noticeLike){
              next['未完成数量'] = '0.00';
            } else {
              next['未出/入库数量'] = '0';
            }
            return next;
          });
          detailLineSelected.value = [];
          if(noticeLike){
            const pid = pageId.value;
            const list = ((MOCK[pid]||{}).tab1||[]);
            const cur = list.find(r=> r.id===detailRow.value?.id || r['单号']===detailRow.value?.['单号']);
            if(cur){
              cur._lines = detailLineRows.value.map(r=>({...r}));
              const sts = cur._lines.map(l=> l['行状态'] || '待执行');
              if(cur['单据状态']!=='已关闭'){
                if(sts.length && sts.every(s=> s==='已完成' || s==='已关闭')) cur['单据状态'] = '已完成';
                else if(sts.some(s=> s==='执行中' || s==='已完成' || s==='已关闭')) cur['单据状态'] = '执行中';
                else cur['单据状态'] = '待执行';
              }
              if(detailRow.value) detailRow.value['单据状态'] = cur['单据状态'];
              bumpStore();
            }
            ElMessage.success('明细行已关闭');
          } else {
            persistOrderDetailLines();
            ElMessage.success('明细行已关闭');
          }
        }).catch(()=>{});
        return;
      }
      if(name==='拣货' && pageId.value==='wh-so-prep'){
        openPicker('拣货流水码');
        return;
      }
      if(name==='批量删除' && pageId.value==='wh-so-prep'){
        const selected = detailLineSelected.value || [];
        if(!selected.length){ ElMessage.warning('请先勾选要删除的备货明细'); return; }
        ElementPlus.ElMessageBox.confirm('确认删除所选备货明细？删除后将释放对应流水码。','删除确认',{
          confirmButtonText:'确认', cancelButtonText:'取消', type:'warning'
        }).then(()=>{
          const set = new Set(selected);
          const prepNo = (detailRow.value||{})['备货通知单号'] || '';
          const codes = selected.map(r=> r['条码号']).filter(Boolean);
          releasePrepSerialArch(codes, prepNo);
          detailLineRows.value = detailLineRows.value.filter(r=> !set.has(r));
          detailLineSelected.value = [];
          syncPrepPickQty();
          ElMessage.success('已删除勾选明细');
        }).catch(()=>{});
        return;
      }
      if(name==='新增'){ openPicker('包材档案'); return; }
      if(name.includes('解绑')){
        if(!detailLineRows.value.length){ ElMessage.warning('暂无绑定明细'); return; }
        detailLineRows.value = [];
        ElMessage.success('已批量解绑');
        return;
      }
      ElMessage.info(name);
    }
