    function filterHiddenMenu(items){
      return (items||[]).filter(it=> !it.hidden).map(it=>{
        if(!it.children || !it.children.length) return it;
        const children = filterHiddenMenu(it.children);
        return Object.assign({}, it, { children });
      }).filter(it=> !it.children || it.children.length);
    }
    const menu = filterHiddenMenu(CFG.menu || []);
    const firstId = CFG.pageList?.[0]?.id || 'mat-list';
    /** 地址栏 #page=…&tab=… 记住当前页面，刷新后回到原页面 */
    const hashState = (()=>{ const p = new URLSearchParams(location.hash.replace(/^#/, '')); return { page: p.get('page') || '', tab: p.get('tab') || '' }; })();
    const startId = CFG.pages[hashState.page] ? hashState.page : firstId;
    const activeMenu = ref(startId);
    const pageId = ref(startId);
    const page = computed(()=> CFG.pages[pageId.value]);
    const storeTick = ref(0);
    function bumpStore(){ syncAllPoReceivedQty(); storeTick.value += 1; if(STORE) STORE.saveMock(MOCK); }
    function resetDemoStore(){
      if(!STORE) return;
      ElementPlus.ElMessageBox.confirm('确认清空 PC/APP 联动缓存？两侧状态将恢复为初始 Mock。','重置联动数据',{
        confirmButtonText:'确认重置', cancelButtonText:'取消', type:'warning'
      }).then(()=>{ STORE.resetMock(); STORE.reset(); try{ localStorage.removeItem('dingcai-qms-tree-nodes'); localStorage.removeItem('dingcai-qms-mrb-writeback'); }catch(e){} location.reload(); }).catch(()=>{});
    }
    const activeTab = ref('tab1');
    const queryExpanded = ref(false);
    const query = reactive({});
    const selectedIds = ref([]);
    const pageNum = ref(1);
    const pageSize = ref(20);
    const formVisible = ref(false);
    const remarksOpen = ref(false);
    const remarksActiveTab = ref('');
    const remarksBodyRef = ref(null);
    const remarksTocActive = ref('');
    const ANNOUNCE = window.DEMO_ANNOUNCEMENTS || { notes:[], updates:[], progress:{summary:{},rows:[]}, latestVersion:'', updatedAt:'' };
    const ANNOUNCE_DISMISS_KEY = 'dingcai-qms-demo-announce-dismissed';
    const announceLatest = ANNOUNCE.latestVersion || '';
    const announceUnread = ref((()=>{
      try{ return localStorage.getItem(ANNOUNCE_DISMISS_KEY) !== announceLatest; }catch(e){ return true; }
    })());
    const announceOpen = ref(false);
    const announceTab = ref('notes');
    const announceKw = ref('');
    const announceTerminal = ref('全部');
    const announceProgressKw = ref('');
    const announceProgressSide = ref('全部');
    const announceProgressDev = ref('全部');
    const announceNotes = ANNOUNCE.notes || [];
    const announceProgressSummary = (ANNOUNCE.progress && ANNOUNCE.progress.summary) || {};
    const announceUpdateCount = (ANNOUNCE.updates || []).length;
    /** 三个页签均无内容时不显示未读红点，避免铃铛指向空弹窗 */
    const announceHasContent = computed(()=> !!((ANNOUNCE.notes || []).length || announceUpdateCount || (announceProgressSummary && announceProgressSummary.total)));
    const announceHeadline = (()=>{
      const u = (ANNOUNCE.updates || [])[0];
      if(!u) return '暂无更新记录';
      return `${u.date} · ${u.module} · ${u.summary}`;
    })();
    const filteredAnnounceUpdates = computed(()=>{
      const kw = announceKw.value.toLowerCase();
      const term = announceTerminal.value;
      return (ANNOUNCE.updates || []).filter(u=>{
        if(term === 'PC' && !String(u.terminal||'').includes('PC')) return false;
        if(term === 'APP' && !String(u.terminal||'').includes('APP')) return false;
        if(!kw) return true;
        const hay = `${u.version} ${u.date} ${u.terminal} ${u.module} ${u.type} ${u.summary}`.toLowerCase();
        return hay.includes(kw);
      });
    });
    const filteredAnnounceProgress = computed(()=>{
      const kw = announceProgressKw.value.toLowerCase();
      const side = announceProgressSide.value;
      const dev = announceProgressDev.value;
      const list = (ANNOUNCE.progress && ANNOUNCE.progress.rows) || [];
      return list.filter(r=>{
        if(side !== '全部' && r.side !== side) return false;
        if(dev !== '全部' && String(r.devStatus||'').indexOf(dev) < 0) return false;
        if(!kw) return true;
        const hay = `${r.id} ${r.side} ${r.m1} ${r.m2} ${r.m3} ${r.desc} ${r.dStatus} ${r.cStatus} ${r.devStatus} ${r.role}`.toLowerCase();
        return hay.includes(kw);
      });
    });
    function openAnnounce(){
      announceOpen.value = true;
      announceTab.value = 'notes';
    }
    function onAnnounceClosed(){
      /* keep unread until 知道了 */
    }
    function dismissAnnounce(){
      announceUnread.value = false;
      announceOpen.value = false;
      try{ localStorage.setItem(ANNOUNCE_DISMISS_KEY, announceLatest); }catch(e){}
    }
    const PAGE_PRD_NOTES = window.WMS_PAGE_PRD_NOTES || {};
    const remarksNote = computed(()=> PAGE_PRD_NOTES[pageId.value] || null);
    const remarksTitle = computed(()=> (remarksNote.value && remarksNote.value.title) || ((page.value && page.value.title) ? (page.value.title + ' · 页面说明') : '页面说明'));
    const remarksTabDefs = computed(()=>{
      const p = page.value;
      if(!p) return [];
      const tabs = (Array.isArray(p.tabs) && p.tabs.length) ? p.tabs
        : (Array.isArray(p.tabViews) ? p.tabViews : []);
      if(tabs.length <= 1) return [];
      return tabs.map(t=>({ name: t.name, label: t.label || t.name }));
    });
    function normalizeRemarksTabLabel(s){
      return String(s || '').replace(/\s+/g, '').replace(/(列表|单)$/g, '');
    }
    /** 备注=md「PRD备注」原文，全文展示、不截取不过滤；多 Tab 时备注 Tab 只做锚点跳转 */
    const remarksDisplayMarkdown = computed(()=>{
      const note = remarksNote.value;
      return note ? String(note.markdown || '').trim() : '';
    });
    function renderRemarksMd(src){
      const fn = window.renderRemarksMarkdown;
      return typeof fn === 'function' ? fn(src) : { html: '', toc: [] };
    }
    const remarksRendered = computed(()=>{
      const md = remarksDisplayMarkdown.value;
      if(md) return renderRemarksMd(md);
      const note = remarksNote.value;
      if(note && Array.isArray(note.sections) && note.sections.length){
        return {
          html: '',
          toc: note.sections.map((sec, i)=>({
            id: 'rm-sec-' + i,
            level: 2,
            text: String((sec && sec.heading) || ('章节 ' + (i + 1)))
          }))
        };
      }
      return { html: '', toc: [] };
    });
    const remarksRenderedHtml = computed(()=> remarksRendered.value.html || '');
    const remarksToc = computed(()=> remarksRendered.value.toc || []);
    function findRemarksTabAnchor(tabLabel){
      const toc = remarksToc.value || [];
      if(!toc.length || !tabLabel) return null;
      const nl = normalizeRemarksTabLabel(tabLabel);
      const score = (text)=>{
        const cleaned = String(text || '').replace(/^Tab\s*\d*\s*[：:]\s*/i, '').trim();
        const nt = normalizeRemarksTabLabel(cleaned);
        if(cleaned === tabLabel || nt === nl) return 3;
        if(cleaned.includes(tabLabel) || tabLabel.includes(cleaned)) return 2;
        if(nt && nl && (nt.includes(nl) || nl.includes(nt))) return 1;
        return 0;
      };
      let best = null, bestScore = 0;
      toc.forEach(item=>{
        const s = score(item.text);
        if(s > bestScore){ bestScore = s; best = item; }
      });
      return bestScore > 0 ? best : null;
    }
    function scrollRemarksTo(id, smooth){
      if(!id) return;
      remarksTocActive.value = id;
      nextTick(()=>{
        const root = remarksBodyRef.value;
        if(!root) return;
        const el = root.querySelector('#' + CSS.escape(id));
        if(!el) return;
        const top = Math.max(0, root.scrollTop + (el.getBoundingClientRect().top - root.getBoundingClientRect().top) - 10);
        root.scrollTo({ top, behavior: smooth === false ? 'auto' : 'smooth' });
      });
    }
    function syncRemarksTabHighlightFromToc(item){
      if(!item) return;
      const defs = remarksTabDefs.value || [];
      for(const t of defs){
        const anchor = findRemarksTabAnchor(t.label);
        if(anchor && anchor.id === item.id){
          remarksActiveTab.value = t.name;
          return;
        }
        const cleaned = String(item.text || '').replace(/^Tab\s*\d*\s*[：:]\s*/i, '').trim();
        if(cleaned && (cleaned === t.label || item.text.includes(t.label))){
          remarksActiveTab.value = t.name;
          return;
        }
      }
    }
    function onRemarksTocClick(item){
      if(!item) return;
      scrollRemarksTo(item.id);
      syncRemarksTabHighlightFromToc(item);
    }
    function jumpRemarksToActiveTab(smooth){
      const defs = remarksTabDefs.value || [];
      if(!defs.length){
        if(remarksToc.value[0]) scrollRemarksTo(remarksToc.value[0].id, smooth);
        return;
      }
      const name = remarksActiveTab.value || (defs[0] && defs[0].name) || '';
      const label = (defs.find(t => t.name === name) || {}).label || '';
      const anchor = findRemarksTabAnchor(label);
      if(anchor) scrollRemarksTo(anchor.id, smooth);
      else if(remarksBodyRef.value) remarksBodyRef.value.scrollTop = 0;
    }
    function syncRemarksActiveTabFromPage(){
      const defs = remarksTabDefs.value;
      if(!defs.length){
        remarksActiveTab.value = '';
        return;
      }
      const cur = activeTab.value;
      remarksActiveTab.value = defs.some(t => t.name === cur) ? cur : defs[0].name;
    }
    function onRemarksTabClick(name){
      if(!name) return;
      remarksActiveTab.value = name;
      // 备注 Tab ↔ 页面顶栏 Tab 双向同步
      if(activeTab.value !== name){
        activeTab.value = name;
        onTabChange();
      }
      nextTick(()=>{
        if(remarksBodyRef.value) remarksBodyRef.value.scrollTop = 0;
        jumpRemarksToActiveTab(true);
        scheduleRemarksMermaid();
      });
    }
    function syncRemarksBodyClass(){
      document.body.classList.toggle('remarks-open', !!remarksOpen.value);
    }
    function scheduleRemarksMermaid(){
      if(!remarksOpen.value) return;
      nextTick(()=>{
        const fn = window.renderRemarksMermaid;
        if(typeof fn === 'function' && remarksBodyRef.value) fn(remarksBodyRef.value);
      });
    }
    function toggleRemarks(){
      remarksOpen.value = !remarksOpen.value;
      if(remarksOpen.value){
        syncRemarksActiveTabFromPage();
        nextTick(()=>{
          if(remarksBodyRef.value) remarksBodyRef.value.scrollTop = 0;
          jumpRemarksToActiveTab(false);
          scheduleRemarksMermaid();
        });
      }
      syncRemarksBodyClass();
    }
    function closeRemarks(){
      remarksOpen.value = false;
      syncRemarksBodyClass();
    }
    watch(activeTab, ()=>{
      syncRemarksActiveTabFromPage();
      if(remarksOpen.value){
        nextTick(()=>{
          if(remarksBodyRef.value) remarksBodyRef.value.scrollTop = 0;
          jumpRemarksToActiveTab(true);
          scheduleRemarksMermaid();
        });
      }
    });
    watch(remarksActiveTab, ()=>{
      if(!remarksOpen.value) return;
      nextTick(()=> scheduleRemarksMermaid());
    });
    watch(pageId, ()=>{
      syncRemarksActiveTabFromPage();
      remarksTocActive.value = '';
      if(remarksOpen.value) nextTick(()=>{
        if(remarksBodyRef.value) remarksBodyRef.value.scrollTop = 0;
        jumpRemarksToActiveTab(false);
        scheduleRemarksMermaid();
      });
    });
    watch(remarksDisplayMarkdown, ()=>{
      if(remarksOpen.value){
        nextTick(()=> jumpRemarksToActiveTab(false));
        scheduleRemarksMermaid();
      }
    });
    const formMode = ref('add');
    const formSwitch = reactive({ '启用状态': true });
    const formModel = reactive({});
    const formFieldTipOpen = reactive({});
    function setFormFieldTip(name, open){
      if(open){
        Object.keys(formFieldTipOpen).forEach(k => { formFieldTipOpen[k] = false; });
        formFieldTipOpen[name] = true;
      } else {
        formFieldTipOpen[name] = false;
      }
    }
    function toggleFormFieldTip(name){
      setFormFieldTip(name, !formFieldTipOpen[name]);
    }
    function clearFormFieldTips(){
      Object.keys(formFieldTipOpen).forEach(k => { formFieldTipOpen[k] = false; });
    }
    // 检验方法 · 公用/样本参数列表 + 右侧选参抽屉
    const inspMethodPublicParams = ref([]);
    const inspMethodSampleParams = ref([]);
    const inspMethodPublicSelected = ref([]);
    const inspMethodSampleSelected = ref([]);
    const inspMethodInnerTab = ref('项目');
    const inspMethodMatRows = ref([]);
    const inspMethodMatSelected = ref([]);
    const inspMethodMatCatRows = ref([]);
    const inspMethodMatCatSelected = ref([]);
    const methodMatSrc = ref('reagent');
    const methodMatSuppRow = ref(null);
    const methodMatUnitRow = ref(null);
    const methodMatCatMatRow = ref(null);
    const cassMatRow = ref(null);
    const methodMatCatCatRow = ref(null);
    let methodMatCatSeq = 1;
    const METHOD_MAT_SRCS = [
      { key:'reagent', label:'试剂', page:'reagent', code:'试剂编码', name:'试剂名称', spec:'试剂规格', kind:'试剂种类', unit:'计量单位' },
      { key:'solution', label:'试液', page:'solution', code:'试液编码', name:'试液名称', spec:'试液规格', kind:'试液种类', unit:'计量单位' },
      { key:'ref-material', label:'标准物质', page:'ref-material', code:'标准物质编码', name:'标准物质名称', spec:'标准物质规格', kind:'标准物质种类', unit:'计量单位' },
      { key:'consumable', label:'耗材', page:'consumable', code:'耗材编码', name:'耗材名称', spec:'耗材规格', kind:'耗材种类', unit:'计量单位' }
    ];
    function normalizeInspMethodMat(r){
      const row = r || {};
      return {
        材料编码: row['材料编码'] || row['物料编码'] || '',
        材料名称: row['材料名称'] || row['物料名称'] || '',
        材料规格: row['材料规格'] || row['物料规格'] || '',
        材料种类: row['材料种类'] || row['物料种类'] || '',
        单位: row['单位'] || row['基本单位'] || row['计量单位'] || '',
        单位编码: row['单位编码'] || '',
        供应商编码: row['供应商编码'] || '',
        供应商名称: row['供应商名称'] || '',
        批号: row['批号'] != null ? String(row['批号']) : '',
        用量: row['用量'] != null ? String(row['用量']) : '',
        材料来源: row['材料来源'] || '',
        启用状态: row['启用状态'] || '启用'
      };
    }
    function normalizeInspMethodMatCat(r){
      const row = r || {};
      return {
        _id: row._id || ('mmc-' + (methodMatCatSeq++)),
        物料编码: row['物料编码'] || '',
        物料名称: row['物料名称'] || '',
        物料规格: row['物料规格'] || '',
        物料种类: row['物料种类'] || '',
        检验类编码: row['检验类编码'] || '',
        检验类名称: row['检验类名称'] || '',
        检验类属性: row['检验类属性'] || ''
      };
    }
    function openMethodMatSupp(row){
      if(formMode.value==='detail' || !row) return;
      methodMatSuppRow.value = row;
      openIoPick('supplier', 'methodMatSupp', '供应商名称');
    }
    function addInspMethodMatCat(){
      if(formMode.value==='detail') return;
      inspMethodMatCatRows.value = (inspMethodMatCatRows.value||[]).concat([normalizeInspMethodMatCat({})]);
    }
    function copyInspMethodMatCat(row){
      if(formMode.value==='detail' || !row) return;
      const copy = normalizeInspMethodMatCat(JSON.parse(JSON.stringify(row)));
      copy._id = 'mmc-' + (methodMatCatSeq++);
      const list = (inspMethodMatCatRows.value||[]).slice();
      const i = list.findIndex(r => r._id === row._id);
      list.splice(i < 0 ? list.length : i + 1, 0, copy);
      inspMethodMatCatRows.value = list;
    }
    function removeInspMethodMatCats(){
      const drop = new Set((inspMethodMatCatSelected.value||[]).map(r=> r._id));
      if(!drop.size){ ElMessage.warning('请先勾选要删除的行'); return; }
      inspMethodMatCatRows.value = (inspMethodMatCatRows.value||[]).filter(r=> !drop.has(r._id));
      inspMethodMatCatSelected.value = [];
    }
    function openMethodMatCatMat(row){
      if(formMode.value==='detail' || !row) return;
      methodMatCatMatRow.value = row;
      openIoPick('mat', 'methodMatCatMat', '物料编码');
    }
    function clearMethodMatCatMat(row){
      if(!row) return;
      row['物料编码'] = '';
      row['物料名称'] = '';
      row['物料规格'] = '';
      row['物料种类'] = '';
    }
    function openMethodMatCatCat(row){
      if(formMode.value==='detail' || !row) return;
      methodMatCatCatRow.value = row;
      openIoPick('inspCat', 'methodMatCatCat', '检验类编码');
    }
    function clearMethodMatCatCat(row){
      if(!row) return;
      row['检验类编码'] = '';
      row['检验类名称'] = '';
      row['检验类属性'] = '';
    }
    function methodMatSrcMeta(){
      return METHOD_MAT_SRCS.find(s=> s.key===methodMatSrc.value) || METHOD_MAT_SRCS[0];
    }
    function onMethodMatSrcTab(){
      clearMethodMatRowCache();
      clearSchemeRelDrawerSelect();
      schemeRelDrawerTick.value++;
    }
    const inspParamDrawerVisible = ref(false);
    const inspParamDrawerTarget = ref('public'); // public | sample
    const inspParamDrawerSelected = ref([]);
    const inspParamDrawerTick = ref(0);
    const inspParamDrawerQ = reactive({ 参数编码:'', 参数名称:'', 参数属性:'', 启用状态:'' });
    const isInspMethodForm = computed(()=> pageId.value==='insp-method' && activeTab.value==='tab-method');
    const isInspSchemeForm = computed(()=> pageId.value==='insp-scheme');
    const isQrConfigForm = computed(()=> pageId.value==='qr-config');
    const DRIFT_PAGE = 'np-0208-02';
    const isDriftRuleForm = computed(()=> pageId.value===DRIFT_PAGE);
    const isInspProjectCategoryForm = computed(()=> pageId.value==='insp-project' && (activeTab.value==='tab-category' || (tabView.value||{}).name==='tab-category'));
    const INSP_CAT_ATTRS = ['通用', '器件测试', '玻璃板测试'];
    const inspCatInstrumentTypeOptions = computed(()=>{
      storeTick.value;
      const names = (((MOCK['instrument']||{}).types)||[]).map(t=> t['仪器类型']).filter(Boolean);
      return names.length ? names : ['色谱','光谱','天平','滴定','通用'];
    });

    const inspItemUnitDrawerVisible = ref(false);
    const inspItemUnitDrawerCurrent = ref(null);
    const inspItemUnitDrawerSelectedKey = ref('');
    const inspItemUnitDrawerTick = ref(0);
    const inspItemUnitTableRef = ref(null);
    const inspItemUnitDrawerQ = reactive({ 单位编码:'', 单位名称:'', 启用状态:'' });
    const inspItemUnitDrawerTitle = computed(()=>{
      const tg = inspItemUnitDrawerTarget.value;
      if(pageId.value==='gather-item' || pageId.value==='gather-scheme' || tg==='gather-item' || tg==='gather-line') return '采集项单位列表';
      if(tg==='uom1' || tg==='uom2' || tg==='hm-arch' || tg==='method-mat' || tg==null || tg===undefined) return '单位列表';
      return '选择单位';
    });
    function inspItemUnitRowKey(row){
      if(!row) return '';
      return String(row.id != null ? row.id : (row['单位编码']||row['单位名称']||''));
    }
    function selectInspItemUnitRow(row){
      inspItemUnitDrawerCurrent.value = row || null;
      inspItemUnitDrawerSelectedKey.value = inspItemUnitRowKey(row);
      nextTick(()=>{
        try{ inspItemUnitTableRef.value?.setCurrentRow?.(row || null); }catch(_e){}
      });
    }
    function onInspItemUnitRowClick(row){
      selectInspItemUnitRow(row);
    }
    function onInspItemUnitCurrentChange(row){
      if(!row){
        if(!inspItemUnitDrawerSelectedKey.value){
          inspItemUnitDrawerCurrent.value = null;
        }
        return;
      }
      inspItemUnitDrawerCurrent.value = row;
      inspItemUnitDrawerSelectedKey.value = inspItemUnitRowKey(row);
    }
