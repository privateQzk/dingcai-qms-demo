    const labArchSelected = ref([]);
    const labArchPage = ref(1);
    const labArchPageSize = ref(20);
    const labArchCfg = computed(()=> (page.value && page.value.labArchive) || null);
    const labArchKind = computed(()=> (labArchCfg.value || {}).kind || '');
    const labArchDateKey = computed(()=> labArchKind.value==='留样' ? '留样日期' : '生产日期');
    const labArchSrcRows = computed(()=>{
      storeTick.value;
      const cfg = labArchCfg.value;
      if(!cfg) return [];
      return ((MOCK[cfg.srcPage]||{}).main||[]).filter(r=> r['启用状态'] !== '禁用');
    });
    const labArchSupplierOpts = computed(()=>{
      storeTick.value;
      return ((MOCK.supplier||{}).main||[]).filter(r=> r['启用状态'] !== '禁用').map(r=> r['供应商名称']);
    });
    const labArchLineCols = computed(()=>{
      const k = labArchKind.value;
      const dateKey = labArchDateKey.value;
      return ['条码号', k+'编码', k+'名称', k+'规格', k+'种类', '供应商名称', '计量单位', '建档数量', '批号', dateKey, '有效期', '失效日期']
        .concat(k==='留样' ? ['是否玻璃片'] : [], ['备注', '条码来源']);
    });
    const labArchPagedLines = computed(()=> labArchLines.value.slice((labArchPage.value-1)*labArchPageSize.value, labArchPage.value*labArchPageSize.value));
    const LAB_ARCH_EDITABLE = new Set(['建档数量','批号','生产日期','备注']);
    function isLabArchEditable(c){ return LAB_ARCH_EDITABLE.has(c); }
    function labArchColWidth(c){
      const k = labArchKind.value;
      const W = { '条码号':104, [k+'编码']:84, [k+'名称']:72, [k+'规格']:72, [k+'种类']:70, '供应商名称':72,
        '计量单位':52, '建档数量':64, '批号':76, '生产日期':92, '留样日期':92, '有效期':56, '失效日期':84, '是否玻璃片':88, '样品位置':140, '库存位置':160, '备注':64, '条码来源':52 };
      return W[c] || 64;
    }
    function openLabArch(){
      Object.keys(labArchForm).forEach(k=> delete labArchForm[k]);
      const k = labArchKind.value;
      const dateKey = labArchDateKey.value;
      [k+'编码', k+'名称', k+'规格', k+'种类', '供应商名称', '计量单位', '建档数量', '批号', dateKey, '有效期', '失效日期', '备注', '生成条码数']
        .forEach(n=> { labArchForm[n] = ''; });
      labArchForm['有效期单位'] = '月';
      if(k==='留样') labArchForm['是否玻璃片'] = '否';
      labArchLines.value = [];
      labArchSelected.value = [];
      labArchPage.value = 1;
      labArchVisible.value = true;
    }
    function refreshLabArchExpire(){
      nextTick(()=>{
        const dateKey = labArchDateKey.value;
        labArchForm['失效日期'] = labAddLife(labArchForm[dateKey], labArchForm['有效期'], labArchForm['有效期单位']);
      });
    }
    function refreshLabArchLineExpire(row){
      nextTick(()=>{
        row['失效日期'] = labAddLife(row[labArchDateKey.value], row._lifeN, row._lifeU);
      });
    }
    function refreshLabArchEditExpire(){
      const row = ((MOCK['retain-sample-arch']||{}).main||[]).find(r=> r.id===formModel._editId) || {};
      formModel['失效日期'] = labAddLife(formModel['留样日期'], row._lifeN, row._lifeU);
    }
    function onLabArchCodeChange(code){
      const k = labArchKind.value;
      const src = labArchSrcRows.value.find(r=> r[k+'编码'] === code) || {};
      ['名称','规格','种类'].forEach(n=> { labArchForm[k+n] = src[k+n] || ''; });
      labArchForm['计量单位'] = src['计量单位'] || '';
      labArchForm['有效期'] = src[k==='留样' ? '留样期' : '有效期'] || '';
      labArchForm['有效期单位'] = src[k==='留样' ? '留样期单位' : '有效期单位'] || '月';
      refreshLabArchExpire();
    }
    function labArchTodayKey(){
      const d = new Date();
      const p = x => String(x).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`;
    }
    function labArchMaxSeq(head, extra){
      const codes = ((MOCK[pageId.value]||{}).main||[]).map(r=> r['条码号']).concat(extra || []);
      return codes.reduce((m, c)=>{
        if(!String(c||'').startsWith(head)) return m;
        const n = parseInt(String(c).slice(head.length), 10);
        return Number.isFinite(n) && n > m ? n : m;
      }, 0);
    }
    function labArchSortLines(){
      labArchLines.value.sort((a, b)=> String(b['条码号']).localeCompare(String(a['条码号'])));
    }
    function onLabArchGenerate(){
      const k = labArchKind.value;
      const need = [k+'编码', k+'名称', k+'规格', k+'种类', '计量单位', '批号'];
      const miss = need.find(n=> !String(labArchForm[n] ?? '').trim());
      if(miss){ ElMessage.warning(`请填写${miss}`); return; }
      const cnt = Number(String(labArchForm['生成条码数'] ?? '').trim());
      if(!Number.isInteger(cnt) || cnt <= 0){ ElMessage.warning('生成条码数须为正整数'); return; }
      const lifeN = String(labArchForm['有效期'] ?? '').trim();
      if(lifeN && !/^[1-9]\d*$/.test(lifeN)){ ElMessage.warning('有效期须为正整数'); return; }
      const draftCodes = labArchLines.value.map(r=> r['条码号']);
      let nos;
      if(k === '留样'){
        nos = nextSampleNos(cnt, draftCodes);
      } else {
        const head = labArchCfg.value.prefix + labArchTodayKey();
        let seq = labArchMaxSeq(head, draftCodes);
        if(seq + cnt > 999){ ElMessage.warning('当日流水号已超过 999，请减少生成条码数'); return; }
        nos = Array.from({ length: cnt }, (_, i)=> head + String(seq + 1 + i).padStart(3, '0'));
      }
      const lifeU = lifeN ? labArchForm['有效期单位'] : '';
      const dateKey = labArchDateKey.value;
      for(let i = 0; i < cnt; i++){
        labArchLines.value.push({
          '条码号': nos[i],
          [k+'编码']: labArchForm[k+'编码'], [k+'名称']: labArchForm[k+'名称'],
          [k+'规格']: labArchForm[k+'规格'], [k+'种类']: labArchForm[k+'种类'],
          '供应商名称': labArchForm['供应商名称'] || '', '计量单位': labArchForm['计量单位'],
          '建档数量': labArchForm['建档数量'] || '', '批号': labArchForm['批号'],
          [dateKey]: labArchForm[dateKey] || '',
          '有效期': lifeN ? `${lifeN} ${lifeU}` : '', _lifeN: lifeN, _lifeU: lifeU,
          '失效日期': labAddLife(labArchForm[dateKey], lifeN, lifeU),
          '存储库位': '', '存储仓库': '',
          ...(k==='留样'
            ? { '是否玻璃片': labArchForm['是否玻璃片'] || '否', '样品位置': '—' }
            : { '库存位置': '—' }),
          '备注': labArchForm['备注'] || '', '条码来源': '建档'
        });
      }
      labArchSortLines();
      labArchPage.value = 1;
      ElMessage.success(`已生成 ${cnt} 个条码`);
    }
    function onLabArchRefresh(){
      if(!labArchLines.value.length){ ElMessage.info('暂无条码'); return; }
      let nos;
      if(labArchKind.value === '留样'){
        nos = nextSampleNos(labArchLines.value.length);
      } else {
        const head = labArchCfg.value.prefix + labArchTodayKey();
        let seq = labArchMaxSeq(head);
        nos = Array.from({ length: labArchLines.value.length }, ()=> {
          seq += 1;
          return head + String(seq).padStart(3, '0');
        });
      }
      [...labArchLines.value].reverse().forEach((r, i)=> { r['条码号'] = nos[i]; });
      labArchSortLines();
      ElMessage.success('条码已按数据库最新流水刷新');
    }
    function onLabArchPrint(){
      openPrintLabel(labArchSelected.value, '请先勾选要打印的条码');
    }
    function onLabArchDelLines(){
      if(!labArchSelected.value.length){ ElMessage.warning('请先勾选要删除的条码'); return; }
      const set = new Set(labArchSelected.value);
      labArchLines.value = labArchLines.value.filter(r=> !set.has(r));
      labArchSelected.value = [];
      const maxPage = Math.max(1, Math.ceil(labArchLines.value.length / labArchPageSize.value));
      if(labArchPage.value > maxPage) labArchPage.value = maxPage;
    }
    function onLabArchSave(){
      const lines = labArchLines.value;
      if(!lines.length){ ElMessage.warning('请先生成条码'); return; }
      const pid = pageId.value;
      const bag = MOCK[pid] = MOCK[pid] || {};
      const list = bag.main = bag.main || [];
      const exist = new Set(list.map(r=> r['条码号']));
      const seen = new Set();
      const dup = lines.find(r=> { const c = r['条码号']; const d = exist.has(c) || seen.has(c); seen.add(c); return d; });
      if(dup){ ElMessage.warning(`条码号「${dup['条码号']}」已存在，请点击条码号列头「刷新条码」后再保存`); return; }
      const stamp = nowStamp();
      const rows = lines.map((r, i)=> ({ id: `${pid}-${Date.now()}-${i}`, ...r, ...(labArchKind.value==='标准物质' ? { '开封状态':'未开封', '开封日期':'—', '开封后失效日期':'—' } : {}), '创建人':'管理员', '创建时间': stamp }));
      bag.main = rows.concat(list).sort((a, b)=> String(b['条码号']).localeCompare(String(a['条码号'])));
      labArchVisible.value = false;
      bumpStore();
      ElMessage.success(`已保存 ${rows.length} 条${labArchKind.value}档案`);
    }

    const tabView = computed(()=>{
      const p = page.value; if(!p) return { toolbar:[], columns:[], queryFields:[], rowOps:[] };
      const views = p.tabViews || [];
      if(!views.length) return { toolbar:[], columns:[], queryFields:[], rowOps:[] };
      if(p.tabs && p.tabs.length){
        return views.find(v=>v.name===activeTab.value) || views[0];
      }
      return views[0];
    });

    const currentTabLabel = computed(()=>{
      const p=page.value; if(!p||!p.tabs?.length) return '';
      return (p.tabs.find(t=>t.name===activeTab.value)||{}).label||'';
    });

    const breadcrumb = computed(()=> msaFrameSrc.value ? ['测量系统分析', ({'np-0313-01':'GR&R分析','np-0313-02':'稳定性分析','np-0313-03':'偏倚分析'})[pageId.value] || (page.value?.title || '')] : (page.value?.breadcrumb || []));
    const QR_SPECTRUM_KEYS = ['LC','GC','TGA','DSC','TG'];
    const QR_SPECTRUM_FIELDS = QR_SPECTRUM_KEYS.map(k=> k + '谱图');
    function qrIssueTplFile(tplName){
      const tpl = String(tplName||'').trim();
      if(!tpl) return null;
      const bag = window.WMS_MOCK_ROWS || MOCK;
      const cfg = (((bag['qr-config']||{}).main)||[]).find(r=> r['报告模板名称']===tpl);
      if(!cfg) return null;
      const fileName = String(cfg['模板文件名称']||'').trim();
      if(!fileName) return null;
      return (((bag['qr-template']||{}).main)||[]).find(r=> r['文件名称']===fileName) || null;
    }
    function qrIssueSpectrumFields(tplName){
      const file = qrIssueTplFile(tplName);
      if(!file) return [];
      return QR_SPECTRUM_KEYS.filter(k=> String(file['是否'+k]||'')==='是').map(k=>({
        name: k + '谱图',
        type: 'upload',
        required: false,
        placeholder: '点击上传，限一份',
        limit: 1,
        ext: '.png',
        accept: '.png,.jpg,.jpeg'
      }));
    }
    function clearQrIssueSpectrumUploads(){
      QR_SPECTRUM_FIELDS.forEach(k=>{ formModel[k] = ''; });
    }
    const qrIssueSpectrumFormFields = computed(()=> pageId.value==='qr-issue' ? qrIssueSpectrumFields(formModel['报告模板名称']) : []);
    function isDemoImageUpload(name){
      return /\.(png|jpe?g|gif|webp)$/i.test(String(name||''));
    }
    function demoSpectrumImgSrc(name){
      const label = String(name||'谱图').replace(/[<>&'"]/g,'').slice(0,18);
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="112" height="72" viewBox="0 0 112 72">'
        + '<rect width="112" height="72" rx="4" fill="#F8FAFC"/>'
        + '<polyline fill="none" stroke="#3B82F6" stroke-width="1.6" points="8,52 22,40 34,46 48,28 62,34 76,18 90,30 104,22"/>'
        + '<text x="56" y="64" text-anchor="middle" fill="#64748B" font-size="9" font-family="sans-serif">'+label+'</text>'
        + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    const activeFormSections = computed(()=>{
      if(tabView.value?.formSections && tabView.value.formSections.length) return tabView.value.formSections;
      // Tab 自带 formFields 时不要回落到页面级分区（避免报检单五 Tab 串表）
      if(tabView.value?.formFields && tabView.value.formFields.length) return [];
      if(page.value?.formSections && page.value.formSections.length){
        const secs = page.value.formSections;
        if(pageId.value==='qr-issue'){
          return secs.map(sec=>{
            if(sec.title==='报告模板信息'){
              return { ...sec, fields: (sec.fields||[]).filter(f=> !QR_SPECTRUM_FIELDS.includes(f.name)) };
            }
            if(sec.title!=='报告特殊字段') return sec;
            const tpl = String(formModel['报告模板名称']||'').trim();
            const cfg = (((window.WMS_MOCK_ROWS||MOCK)['qr-config']||{}).main||[]).find(r=> r['报告模板名称']===tpl);
            const fields = (cfg && Array.isArray(cfg._fields) ? cfg._fields : []).map(f=>({
              name: f['字段名称'],
              type: (f['字段类型']==='日期') ? 'date' : 'input',
              required: false,
              placeholder: f['字段格式'] && f['字段格式']!=='—' ? ('格式 '+f['字段格式']) : '请输入'
            })).filter(f=> f.name);
            return { ...sec, fields };
          });
        }
        return secs;
      }
      return [];
    });
    const activeFormFields = computed(()=>{
      if(formMode.value==='dispose' && (page.value?.disposeFields||[]).length) return page.value.disposeFields;
      if(formMode.value==='mrb-audit' && (page.value?.mrbAuditFields||[]).length) return page.value.mrbAuditFields;
      if(formMode.value==='mrb-review-rec' && (page.value?.mrbReviewFields||[]).length) return page.value.mrbReviewFields;
      if(formMode.value==='capa-close' && (page.value?.closeFields||[]).length) return page.value.closeFields;
      if(formMode.value==='capa-process' && (page.value?.processFields||[]).length) return page.value.processFields;
      if((formMode.value==='数据源设置') && (page.value?.settingFields||[]).length) return page.value.settingFields;
      if((formMode.value==='新建数据源' || formMode.value==='编辑数据源') && pageId.value==='qr-datasource'){
        return [{ name:'数据源名称', type:'input', required:true, ctrl:'输入，唯一' }];
      }
      if((formMode.value==='新建数据源' || formMode.value==='编辑数据源') && pageId.value==='tag-data-source'){
        return [{ name:'数据源', type:'input', required:true, placeholder:'输入, 唯一' }];
      }
      if((formMode.value==='新增标签类型' || formMode.value==='编辑标签类型') && (page.value?.typeFormFields||[]).length){
        return page.value.typeFormFields;
      }
      if((formMode.value==='新增数据源' || formMode.value==='编辑数据源') && pageId.value==='form-data-source' && (page.value?.typeFormFields||[]).length){
        return page.value.typeFormFields;
      }
      if((formMode.value==='新增表单类型' || formMode.value==='编辑表单类型') && pageId.value==='form-setting' && (page.value?.typeFormFields||[]).length){
        return page.value.typeFormFields;
      }
      if((formMode.value==='新增类型' || formMode.value==='编辑类型') && (page.value?.typeFormFields||[]).length){
        return page.value.typeFormFields;
      }
      if((formMode.value==='新增类型' || formMode.value==='编辑类型') && page.value?.treeField){
        return [{ name: page.value.treeField, type:'input', required:true, placeholder:'输入，唯一' }];
      }
      if(tabView.value?.formFields && tabView.value.formFields.length) return tabView.value.formFields.filter(f=> !(f.hideOnAdd && (formMode.value==='add' || formMode.value==='copy')));
      if(pageId.value==='retain-sample' && (page.value?.formFields||[]).length){
        return page.value.formFields.map(f=> f.name==='留样编码'
          ? { ...f, type:'picker', placeholder:'请点击选择物料' } : f);
      }
      if(page.value?.formFields && page.value.formFields.length) return page.value.formFields.filter(f=> !(f.hideOnAdd && (formMode.value==='add' || formMode.value==='copy')));
      const secs = activeFormSections.value || [];
      if(secs.length) return secs.flatMap(s=> s.fields || []);
      return [];
    });
    const disposeDetailRows = ref([]);
    const disposeDetailSelected = ref([]);
    const mrbWritebackVisible = ref(false);
    const mrbWriteback = reactive({ 采购来料不合格:true, 生产过程不合格:true, 生产物料不合格:true, 研发不合格处置:true });
    const disposeDetailVisible = ref(false);
    const disposeDetailViewRows = ref([]);
    function initDisposeDetailRows(){
      disposeDetailRows.value = [
        {样本来源:'报检取样',检验结论:'不合格',偏差结论:'—',是否接收:'接收',新物料信息:'—'},
        {样本来源:'报检取样',检验结论:'不合格',偏差结论:'OOS',是否接收:'返工',新物料信息:'—'}
      ];
      disposeDetailSelected.value = [];
    }
    function batchDisposeReceive(kind){
      const rows = (disposeDetailSelected.value||[]).length ? disposeDetailSelected.value : disposeDetailRows.value;
      rows.forEach(r=>{ r['是否接收'] = kind; });
      ElMessage.success('已将 ' + rows.length + ' 行批量设为' + kind);
    }
    const activeFormLineFields = computed(()=>{
      if(formMode.value==='数据源设置' && (page.value?.settingLineFields||[]).length) return page.value.settingLineFields;
      if(tabView.value && Array.isArray(tabView.value.formLineFields) && tabView.value.formLineFields.length) return tabView.value.formLineFields;
      return page.value?.formLineFields || [];
    });
    const activeFormLineTitle = computed(()=>{
      if(formMode.value==='数据源设置' && page.value?.settingLineTitle) return page.value.settingLineTitle;
      if(tabView.value && tabView.value.formLineTitle) return tabView.value.formLineTitle;
      return page.value?.formLineTitle || page.value?.formLineTabLabel || '明细';
    });
    const activeFormLineActions = computed(()=>{
      if(formMode.value==='数据源设置' && (page.value?.settingLineActions||[]).length) return page.value.settingLineActions;
      if(tabView.value && Array.isArray(tabView.value.formLineActions) && tabView.value.formLineActions.length) return tabView.value.formLineActions;
      return page.value?.formLineActions || [];
    });
    const entryCategoryId = ref('');
    const entryCategoryKw = ref('');
    const filteredEntryCategories = computed(()=>{
      const cats = isEntryByCat(pageId.value) ? inspCatNames() : [];
      const list = cats.length ? cats : (page.value?.categoryTree || inspCatNames());
      const kw = String(entryCategoryKw.value||'').trim();
      if(!kw) return list;
      return list.filter(c=> String(c).includes(kw));
    });
    const spcProcessId = ref('');
    const spcProcessKw = ref('');
    const filteredSpcProcesses = computed(()=>{
      const list = page.value?.processTree || [];
      const kw = String(spcProcessKw.value||'').trim();
      if(!kw) return list;
      return list.filter(c=> String(c).includes(kw));
    });
    const activeChartTab = ref('');
    const spcChartCards = computed(()=>{
      const t = activeChartTab.value || (page.value?.chartTabs||[])[0] || 'I图';
      if(pageId.value==='spc-compare') return [t, '比对·'+t];
      if(pageId.value==='spc-multi' && (t==='I图' || t==='MR图')) return ['I图','MR图'];
      if(pageId.value==='spc-multi' && (t==='Xbar(R)图' || t==='R图')) return ['Xbar(R)图','R图'];
      if(pageId.value==='spc-multi' && (t==='Xbar(S)图' || t==='S图')) return ['Xbar(S)图','S图'];
      return [t];
    });
    const treeListId = ref('');
    const treeListKw = ref('');
    const filteredTreeListNodes = computed(()=>{
      void storeTick.value;
      const src = page.value?.treeSourcePage;
      const list = (src && CFG.pages[src] && Array.isArray(CFG.pages[src].treeNodes)
        ? CFG.pages[src].treeNodes
        : (page.value?.treeNodes || []));
      const kw = String(treeListKw.value||'').trim();
      if(!kw) return list;
      return list.filter(c=> String(c).includes(kw));
    });
    function onTreeListOp(op, node){
      if(op==='编辑' || op==='编辑数据源'){
        qcTreeEditNode = node;
        if(pageId.value==='qr-datasource'){
          openForm('编辑数据源');
          formModel['数据源名称'] = node;
          return;
        }
        if(pageId.value==='tag-data-source'){
          openForm('编辑数据源');
          formModel['数据源'] = node;
          return;
        }
        if(pageId.value==='tag-config'){
          openForm('编辑标签类型');
          formModel['标签类型名称'] = node;
          formModel['菜单名称'] = node;
          return;
        }
        if(pageId.value==='form-data-source'){
          openForm('编辑数据源');
          formModel['资源'] = node;
          formModel['表名'] = node;
          return;
        }
        if(pageId.value==='form-setting'){
          openForm('编辑表单类型');
          formModel['表单类型'] = node;
          return;
        }
        if(page.value?.treeField){
          openForm('编辑类型');
          formModel[page.value.treeField] = node;
          formModel['物料类名称'] = node;
          const descs = page.value.treeNodeDescs || {};
          formModel['说明'] = descs[node] || '';
          return;
        }
        openForm('edit');
        formModel['数据源名称'] = node;
        formModel['报告类型'] = node;
        formModel['模版类型'] = node;
        formModel['文件类型'] = node;
        return;
      }
      if(op==='删除'){
        const p = page.value;
        const pid = pageId.value;
        const used = p?.treeField ? qcAllRows(pid).filter(r=> r[p.treeField]===node).length : 0;
        if(used){ ElMessage.warning('「'+node+'」下还有 '+used+' 条数据，请先删除后再删除该节点'); return; }
        ElementPlus.ElMessageBox.confirm('确认删除「'+node+'」？','确认',{type:'warning'}).then(()=>{
          if(p && Array.isArray(p.treeNodes)) p.treeNodes = p.treeNodes.filter(n=> n!==node);
          if(p && p.treeNodeDescs && typeof p.treeNodeDescs==='object'){
            const next = Object.assign({}, p.treeNodeDescs);
            delete next[node];
            p.treeNodeDescs = next;
          }
          qcTreePersist(pid);
          if(treeListId.value===node) treeListId.value = (p?.treeNodes||[])[0] || '';
          storeTick.value += 1;
          ElMessage.success('已删除「'+node+'」');
        }).catch(()=>{});
      }
    }
    const waitSampInnerTab = ref('样品信息');
    const waitSampSampleRows = ref([]);
    const waitSampSampleSelected = ref([]);
    const waitSampItemRows = ref([]);
    const waitSampItemSelected = ref([]);
    const recheckSampleRows = ref([]);
    const waitSampSchemeItemCount = computed(()=> (waitSampItemRows.value||[]).filter(r=> r['项目来源']==='方案' || r['项目来源']==='方案项目').length);
    const waitSampTempItemCount = computed(()=> (waitSampItemRows.value||[]).filter(r=> r['项目来源']==='临时' || r['项目来源']==='临时项目').length);
    function waitSampItemSourceLabel(row){
      const s = String((row && row['项目来源']) || '');
      if(s==='方案' || s==='方案项目') return '方案项目';
      if(s==='临时' || s==='临时项目') return '临时项目';
      return s || '—';
    }
    function isWaitSampSchemeItem(row){ return row && (row['项目来源']==='方案' || row['项目来源']==='方案项目'); }
    function isWaitSampTempItem(row){ return row && (row['项目来源']==='临时' || row['项目来源']==='临时项目'); }
    function loadLedgerEditItems(row){
      const projects = ((((window.WMS_MOCK_ROWS || MOCK)['insp-project'])||{})['tab-item']) || [];
      const parse = (txt, kind)=>{
        return String(txt||'').split(/[;；、,，]/).map(s=> s.trim()).filter(s=> s && s!=='—').map((n, i)=>{
          const p = projects.find(x=> x['检验项名称']===n) || {};
          return {
            项目来源: kind,
            检验项编码: p['检验项编码'] || ((kind==='临时'?'TMP':'SCH') + '-' + String(i+1).padStart(3,'0')),
            检验项名称: n,
            检验项类型: p['检验项类型'] || (i%2 ? '定量' : '定性'),
            所属检验类: p['所属检验类'] || (i%2 ? 'HPLC类' : '外观类'),
            检验项单位: p['检验项单位'] || (i%2 ? '%' : '—'),
            指标: p['指标'] || (i%2 ? '≥99.90' : '合格')
          };
        });
      };
      waitSampItemRows.value = parse(row && row['方案项目'], '方案').concat(parse(row && row['临时项目'], '临时'));
      waitSampItemSelected.value = [];
      waitSampInnerTab.value = '检验项目';
    }
