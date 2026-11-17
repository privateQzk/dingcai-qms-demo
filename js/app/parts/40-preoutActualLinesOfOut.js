    function preoutActualLinesOfOut(outNo){
      const no = String(outNo||'').trim();
      if(!no) return [];
      const flows = (((MOCK['wh-so-preout']||{}).tab3)||[]).filter(r=> String(r['出库单号']||'')===no);
      if(!flows.length) return [];
      const map = new Map();
      flows.forEach(fl=>{
        const mat = fl['物料信息'] || '';
        const lot = String(fl['批号']||'').trim() || '—';
        const key = codeOf(mat) + '|' + lot;
        const qty = Number(fl['出库数量']||0);
        const pcs = 1;
        if(!map.has(key)){
          const mr = matListRow(codeOf(mat));
          map.set(key, {
            物料信息: mat,
            批号: lot,
            库存单位: fl['库存单位'] || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
            管理方式: (mr && mr['管理方式']) || '条码管理',
            计划件数: 0,
            计划数量: 0,
            备注: ''
          });
        }
        const cur = map.get(key);
        cur.计划数量 += qty;
        cur.计划件数 += pcs;
      });
      return [...map.values()].map(r=>({
        ...r,
        计划数量: Number(r.计划数量||0).toFixed(3),
        计划件数: String(r.计划件数 || 1)
      }));
    }
    function applyPreoutOutToSoShipForm(outRow){
      if(pageId.value!=='wh-so-ship' || !outRow) return false;
      const outNo = outRow['出库单号'] || outRow.编码 || '';
      const notice = findPreoutNoticeByOut(outRow);
      let lines = preoutActualLinesOfOut(outNo);
      if(!lines.length && Array.isArray(notice._lines) && notice._lines.length){
        const doneQty = String(outRow['已完成数量'] || '').trim();
        const donePcs = String(outRow['已完成件数'] || '').trim();
        lines = notice._lines.map(r=>{
          const lot = (r['批号'] && r['批号']!=='—') ? r['批号'] : '—';
          const qty = doneQty || String(r['已完成数量'] || r['计划数量'] || '0');
          return {
            物料信息: r['物料信息'] || outRow['物料信息'],
            批号: lot,
            库存单位: r['库存单位'] || outRow['库存单位'] || 'KG',
            管理方式: r['管理方式'] || '条码管理',
            计划件数: donePcs || String(r['计划件数'] || '1'),
            计划数量: Number(qty||0).toFixed(3),
            备注: r['备注'] || ''
          };
        });
      }
      if(!lines.length && outRow['物料信息']){
        lines = [{
          物料信息: outRow['物料信息'],
          批号: '—',
          库存单位: outRow['库存单位'] || 'KG',
          管理方式: '条码管理',
          计划件数: String(outRow['已完成件数'] || '1'),
          计划数量: Number(outRow['已完成数量']||0).toFixed(3),
          备注: ''
        }];
      }
      if(!lines.length) return false;
      formLineRows.value = lines.map((r,i)=>{
        const mr = matListRow(codeOf(r['物料信息']));
        const mode = String(r['管理方式'] || (mr && mr['管理方式']) || '条码管理');
        const isCount = /计数|罐区/.test(mode);
        const qty = String(r['计划数量'] || '0.000');
        return {
          _i: i+1,
          行状态: '待执行',
          物料信息: r['物料信息'],
          批号: (r['批号'] && r['批号']!=='') ? r['批号'] : '—',
          库存单位: r['库存单位'] || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
          管理方式: mode,
          计划件数: isCount ? '—' : String(r['计划件数'] || Math.max(1, Math.round(Number(qty)||1))),
          计划数量: qty,
          已完成数量: '0.000',
          未完成数量: qty,
          备注: r['备注'] || ''
        };
      });
      return true;
    }
    function fillSoShipHeaderFromPreout(outRow){
      if(!outRow) return;
      const notice = findPreoutNoticeByOut(outRow);
      formModel['关联销售预出货单'] = outRow['出库单号'] || outRow.编码 || '';
      formModel['关联销售订单'] = outRow['关联销售订单'] || notice['关联销售订单'] || formModel['关联销售订单'] || '';
      formModel['客户名称'] = outRow['客户名称'] || notice['客户名称'] || formModel['客户名称'] || '';
      formModel['关联运单'] = notice['关联运单'] || outRow['关联运单'] || '—';
      formModel['关联发货单'] = notice['关联发货单'] || outRow['关联发货单'] || '—';
      formModel['车牌号'] = notice['车牌号'] || '—';
      formModel['车挂号'] = notice['车挂号'] || '—';
      formModel['司机姓名'] = notice['司机姓名'] || '—';
      formModel['司机电话'] = notice['司机电话'] || '—';
      formModel['司机身份证号'] = notice['司机身份证号'] || '—';
      if(notice['关联备货通知单'] && notice['关联备货通知单']!=='—'){
        formModel['关联销售备货单'] = notice['关联备货通知单'];
      }
    }
    function confirmReplaceSoShipLines(thenFn){
      const hasLines = (formLineRows.value||[]).some(r=> r && r['物料信息']);
      if(!hasLines){ thenFn(); return; }
      ElementPlus.ElMessageBox.confirm('更换关联单据将清空当前已带入的物料明细行，是否确认更换？', '提示', {
        confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning'
      }).then(()=> thenFn()).catch(()=>{});
    }
    /** 清空发货单后：收货/退货恢复加工单成品明细；发料/退料清空原料行（加工单不带成品） */
    function restoreOsNoticeLinesFromWwpo(){
      if(!isOsPoPage()) return;
      if(isOsRawMatNoticePage()){
        poMatPool.value = [];
        formLineRows.value = [];
        return;
      }
      const wwCode = codeOf(formModel['关联委外加工单']);
      if(!wwCode) return;
      const ww = ((MOCK.wwpo||{}).main||[]).find(r=> r['委外订单号']===wwCode) || {};
      const vendor = formModel['供应商名称'] || ww['供应商名称'] || ww['加工厂名称'] || '';
      const lines = wwpoLinesOf(ww);
      poMatPool.value = lines.map(m=>({...m, 编码: matCodeOfLine(m), 名称: m['物料名称']||'', 供应商: vendor}));
      formLineRows.value = finalizeNoticeFormLines(buildOsNoticeFormLines(lines, vendor));
    }
    function poRetHasDownstream(noticeNo){
      const no = String(noticeNo||'').trim();
      if(!no) return false;
      return ((MOCK['wh-po-ret']||{}).tab2||[]).some(r=> String(r['关联退料通知单号']||'')===no)
        || ((MOCK['wh-po-ret']||{}).tab3||[]).some(r=> String(r['通知单号']||'')===no);
    }
    function poNoticeHasDownstream(noticeNo){
      return pageId.value==='wh-po-ret' ? poRetHasDownstream(noticeNo) : poInHasDownstream(noticeNo);
    }
    function isFormFieldLocked(f){
      if((pageId.value===HM_VOID_PAGE || pageId.value===HM_CHG_PAGE) && formMode.value==='edit' && f && f.name==='申请单号') return true;
      if(pageId.value==='lg-ship') return true;
      if(pageId.value==='retain-sample' && f){
        if(f.name==='留样名称' || f.name==='留样规格' || f.name==='留样种类') return true;
      }
      if(pageId.value==='opc-point' && formMode.value==='edit' && f && ['点位名称','采集平台'].includes(f.name)) return true;
      if(pageId.value==='lg-kpi-scheme' && f && f.name==='方案编码' && formMode.value!=='add') return true;
      if(pageId.value===PERSON_PAGE && f && f.name==='编码' && formMode.value==='edit') return true;
      if(pageId.value==='wh-insp-scheme' && f && f.name==='巡检方案编码' && formMode.value!=='add') return true;
      if(pageId.value==='wh-insp-plan' && formMode.value==='edit' && f && ['巡检方案名称','内容描述','仓库名称','仓库编号','仓库类型','负责人'].includes(f.name)) return true;
      if(pageId.value==='mat-medium' && f && f.name==='物料信息' && formMode.value==='edit') return true;
      if(pageId.value==='stock-warn' && formMode.value==='edit' && f && (f.name==='仓库编码' || f.name==='物料编码')) return true;
      if(pageId.value==='wh-po-ret' && f && f.name==='供应商名称') return true;
      if(isOsPoPage() && f && f.name==='供应商名称') return true;
      if(isCsWhPage() && f && f.name==='客户名称'){
        return !!(formModel['关联销售订单'] && formModel['关联销售订单']!=='—');
      }
      if((isWhNoticePage() || isCsWhPage()) && f && ['车牌号','车挂号','司机姓名','司机电话','司机身份证号'].includes(f.name)){
        return !!(formModel['关联运单'] && formModel['关联运单']!=='—');
      }
      if((isWhNoticePage() || isCsWhPage()) && f && f.name==='承运商'){
        return !!(formModel['关联运单'] && formModel['关联运单']!=='—');
      }
      if(!f || !f.lockWhenLinked) return false;
      if(false /*lg-order removed*/) return !!(formModel['关联派车申请单']);
      return false;
    }
    function isFormLineFieldLocked(f, row){
      if(false /*lg-order removed*/ && formModel['关联派车申请单']){
        if(f.name==='物料信息' && row && row[f.name]) return true;
        if(f.lockWhenLinked || f.name==='单位' || f.name==='体积(长×宽×高)') return true;
      }
      if(pageId.value==='lg-dispatch' && f.name==='单位') return true;
      if(pageId.value==='lg-ship') return f.name!=='批号' && f.name!=='发货数量';
      if(pageId.value==='lg-waybill' && f.type==='readonly') return true;
      // 生产领料/退料/入库：计数管理批号走模糊下拉或手输，不再置灰
      if(isProdWhPage() && f.name==='批号') return false;
      // 生产/采购通知：计数管理物料「计划件数」置灰，展示 —
      if((isWhNoticePage() || isProdWhPage() || isCsWhPage()) && f && f.name==='计划件数'){
        return /计数|罐区/.test(String((row && row['管理方式']) || ''));
      }
      return f.type==='readonly';
    }
    const detailLineFields = computed(()=>{
      if(pageId.value==='spc-scheme-insp'){
        return page.value?.formLineFields || [];
      }
      const fields = page.value?.detailLineFields || [];
      const tabLines = tabView.value && tabView.value.detailLineFields;
      const use = (tabLines && tabLines.length) ? tabLines : fields;
      if(usesErpLineNoCol()) return use.filter(f=> f && f.name!=='行号');
      return use;
    });
    const activeDetailFields = computed(()=>{
      const tabFields = tabView.value && tabView.value.detailFields;
      if(tabFields && tabFields.length) return tabFields;
      return (page.value && page.value.detailFields) || [];
    });
    const detailRowFiltered = computed(()=>{
      const row = detailRow.value || {};
      const skip = new Set(['id','_actions','typeId','_addrs','_addrSeq','_lines','_photos','_signature','_vendors','_grades','_projects','_flow','_scores','_locs','_items','_pickLines','_insts']);
      const out = {};
      Object.keys(row).forEach(k=>{ if(!skip.has(k)) out[k]=row[k]; });
      return out;
    });
    const batchTitle = computed(()=>{
      if(batchCtx.from==='wh-po-in' || pageId.value==='serial-arch') return '批量新增流水码';
      if(pageId.value==='outer-serial') return '批量新增外包材档案';
      return '批量新增';
    });
    const batchFieldSource = computed(()=>{
      if(batchCtx.from==='wh-po-in') return CFG.pages['serial-arch'] || {};
      return page.value || {};
    });
    function resetBatchCtx(){
      batchCtx.from = '';
      batchCtx.noticeNo = '';
      batchCtx.lineId = '';
    }
    function isBatchFieldLocked(f){
      if(!f) return false;
      if(f.type==='readonly') return true;
      if(batchCtx.from!=='wh-po-in') return false;
      // 采购入库批量建档：物料/批号/供应商/失效日等只读；包装规格、客户批号、生产信息与数量可改
      return ![
        '条码生成个数','包装规格','客户批号','建档数量','当前数量',
        '生产厂家','生产日期','有效期','备注'
      ].includes(f.name);
    }
    function batchLockedDisplay(f){
      if(!f) return '—';
      if(f.type==='number-unit'){
        const n = String(batchForm[f.name]??'').trim();
        const u = String(batchForm[f.unitName || (f.name+'单位')] || f.defaultUnit || '').trim();
        if(!n) return '—';
        return (n + (u ? (' ' + u) : '')).trim();
      }
      const v = batchForm[f.name];
      if(v===undefined || v===null || v==='') return f.type==='readonly' ? '自动带入' : '—';
      return v;
    }
    function batchSelectOptions(f){
      const opts = Array.isArray(f && f.options) ? [...f.options] : [];
      const cur = batchForm[f && f.name];
      if(cur!==undefined && cur!==null && String(cur).trim()!=='' && !opts.includes(cur)) opts.unshift(cur);
      return opts.length ? opts : [];
    }
    function openPoInBatchArch(line){
      if(!line) return;
      if(String(line['行状态']||'')==='已关闭'){ ElMessage.warning('已关闭明细不可批量建档'); return; }
      if(!String(line['管理方式']||'').includes('条码')){ ElMessage.warning('仅条码管理物料支持批量建档'); return; }
      const head = detailRow.value || {};
      const sa = CFG.pages['serial-arch'] || {};
      Object.keys(batchForm).forEach(k=> delete batchForm[k]);
      (sa.batchAddFields||[]).forEach(f=>{
        if(f.type==='number-unit'){
          batchForm[f.name] = '';
          batchForm[f.unitName || (f.name+'单位')] = f.defaultUnit || '天';
        } else batchForm[f.name] = '';
      });
      const pcs = parseInt(String(line['计划件数']||'').trim(), 10);
      const planQty = Number(String(line['计划数量']||'').replace(/,/g,''));
      let perQty = '';
      if(Number.isFinite(planQty) && planQty>0){
        if(pcs>0) perQty = String(Math.round((planQty / pcs) * 1000) / 1000);
        else perQty = String(planQty);
      }
      const vendor = (head['供应商名称'] && head['供应商名称']!=='—') ? head['供应商名称'] : '';
      const maker = (line['生产厂家'] && line['生产厂家']!=='—') ? line['生产厂家'] : vendor;
      const expRaw = String(line['有效期']||'').trim();
      const expNum = expRaw.replace(/[^\d.]/g,'');
      Object.assign(batchForm, {
        条码生成个数: (pcs>0 ? String(pcs) : ''),
        包装规格: (head['包装规格'] && head['包装规格']!=='—') ? head['包装规格'] : '',
        物料信息: line['物料信息'] || '',
        物料批号: (line['批号'] && line['批号']!=='—') ? line['批号'] : '',
        客户批号: '',
        库存单位: line['库存单位'] || '',
        建档数量: perQty,
        当前数量: perQty,
        供应商信息: vendor,
        生产厂家: maker,
        生产日期: (line['生产日期'] && line['生产日期']!=='—') ? line['生产日期'] : '',
        有效期: expNum || '',
        有效期单位: /年/.test(expRaw) ? '年' : (/天/.test(expRaw) ? '天' : '月'),
        备注: (line['备注'] && line['备注']!=='—') ? line['备注'] : ''
      });
      refreshSerialExpire(batchForm);
      batchCtx.from = 'wh-po-in';
      batchCtx.noticeNo = head['单号'] || '';
      batchCtx.lineId = line.id || '';
      batchLines.value = [];
      batchSelected.value = [];
      batchVisible.value = true;
    }
    function onDetailLineRowAction(name, row){
      if(name==='批量建档' && pageId.value==='wh-po-in'){
        openPoInBatchArch(row);
        return;
      }
      ElMessage.info(name);
    }
    const craftTitle = computed(()=>{
      const r = craftRow.value || {};
      const code = r['工艺编码'] || r['编码'] || '';
      const name = r['工艺名称'] || r['名称'] || '';
      if(code && name) return `工艺配置 — ${code} / ${name}`;
      if(code || name) return `工艺配置 — ${code || name}`;
      return '工艺配置';
    });
    const designTitle = computed(()=> '表单设计 · ' + (designFormName.value||''));
    const designBasic = computed(()=> page.value?.designBasic || ['文字','扫码文本','单行文本','数字输入','日期选择','下拉选择','单/多选框','签字','图片上传','附件上传']);
    const designAdvanced = computed(()=> page.value?.designAdvanced || ['子表（表单）','子表（表格）']);
    const designActiveField = computed(()=> designActive.value>=0 ? designCanvas.value[designActive.value] : null);
    const filteredCraftProcs = computed(()=>{
      let list = [];
      if(pageId.value==='insp-craft'){
        list = ((MOCK['insp-proc']||{}).main||[]).filter(r=> r['启用状态']==='启用').map(r=> r['工序名称']).filter(Boolean);
      } else {
        list = page.value?.craftProcs || [];
      }
      const kw = craftKw.value.trim();
      return kw ? list.filter(x=>String(x).includes(kw)) : list;
    });
    const craftEdgeLines = computed(()=>{
      const map = Object.fromEntries((craftNodes.value||[]).map(n=>[n.id,n]));
      return (craftEdges.value||[]).map(([a,b])=>{
        const n1=map[a], n2=map[b];
        if(!n1||!n2) return null;
        return { x1:n1.x+48, y1:n1.y+16, x2:n2.x+48, y2:n2.y+16 };
      }).filter(Boolean);
    });
    const PO_MAT_MAP = {
      'PO2026080001': [
        {编码:'RM-Li2CO3-BG',名称:'电池级碳酸锂',规格:'Li2CO3≥99.5%',种类:'锂盐原料',供应商:'天齐锂业股份',计划数量:'100000',计划件数:'100'},
        {编码:'RM-LiOH-BG',名称:'电池级氢氧化锂',规格:'LiOH·H2O',种类:'锂盐原料',供应商:'天齐锂业股份',计划数量:'25000',计划件数:'50'},
      ],
      'PO2026080002': [
        {编码:'RM-Li2SO4-BG',名称:'电池级硫酸锂',规格:'Li2SO4·H2O',种类:'锂盐原料',供应商:'赣锋锂业股份',计划数量:'20000',计划件数:'40'},
        {编码:'PM-TONBAG',名称:'吨袋',规格:'1T',种类:'包材',供应商:'赣锋锂业股份',计划数量:'100',计划件数:'100'},
      ],
    };
    const ADDR_PICKER_COLS = [
      { field:'地址编码', title:'地址编码', width:120 },
      { field:'地址描述', title:'地址描述', minWidth:180 },
      { field:'联系人', title:'联系人', width:100 },
      { field:'联系电话', title:'联系电话', width:120 },
      { field:'所属单位', title:'所属单位', minWidth:140 },
      { field:'单位类型', title:'单位类型', width:90 },
    ];
    const SETTLE_MAT_PICKER_COLS = [
      { field:'编码', title:'编码', width:120 },
      { field:'名称', title:'名称', minWidth:180 },
      { field:'规格', title:'规格', width:100 },
      { field:'种类', title:'采购单位', width:100 },
      { field:'采购单位', title:'计量单位', width:100 },
    ];
    const USER_PICKER_COLS = [
      { field:'用户编码', title:'用户编码', width:120 },
      { field:'用户名称', title:'用户名称', width:120 },
      { field:'所属部门', title:'所属部门', width:120 },
      { field:'岗位', title:'岗位', width:100 },
      { field:'手机号', title:'手机号', width:130 },
      { field:'启用状态', title:'启用状态', width:90 },
    ];
    const DEMO_USERS = [
      { 用户编码:'U001', 用户名称:'王调度', 所属部门:'物流调度', 岗位:'调度员', 手机号:'13800001001', 启用状态:'启用' },
      { 用户编码:'U002', 用户名称:'赵调度', 所属部门:'物流调度', 岗位:'调度员', 手机号:'13800001002', 启用状态:'启用' },
      { 用户编码:'U003', 用户名称:'张三', 所属部门:'仓储部', 岗位:'仓管员', 手机号:'13800001003', 启用状态:'启用' },
      { 用户编码:'U004', 用户名称:'李四', 所属部门:'销售部', 岗位:'业务员', 手机号:'13800001004', 启用状态:'启用' },
      { 用户编码:'U005', 用户名称:'王五', 所属部门:'采购部', 岗位:'采购员', 手机号:'13800001005', 启用状态:'启用' },
    ];
    function userPickerRows(){
      return DEMO_USERS.filter(u=> u['启用状态']==='启用').map(u=> ({
        ...u, 编码: u.用户编码, 名称: u.用户名称, _pickerCustom: true
      }));
    }
    function pageTabColumns(pid, tab='main'){
      const p = CFG.pages[pid];
      if(!p) return [];
      const tv = (p.tabViews||[]).find(v=> v.name===tab) || p.tabViews?.[0]
        || (p.tabs||[]).find(v=> v.name===tab) || p.tabs?.[0];
      const cols = tv?.columns || p.columns || [];
      return cols.filter(c => c.field && c.field !== '_actions' && c.slot !== 'row_actions');
    }
    function wrapPickerModuleRows(pid, rows, codeField, nameField, tab='main'){
      return (rows||[]).map(r => ({
        ...(typeof r==='object' ? r : {}),
        编码: r[codeField] ?? r['编码'] ?? '',
        名称: nameField ? (r[nameField] ?? r['名称'] ?? '') : (r['名称'] ?? ''),
        _pickerPageId: pid,
        _pickerTab: tab,
        _pickerCodeField: codeField
      }));
    }
    function pickerRowSearchText(row){
      if(!row || typeof row!=='object') return '';
      return Object.entries(row).filter(([k,v])=> !k.startsWith('_') && k!=='id' && v!=null && typeof v!=='object').map(([,v])=> String(v)).join(' ');
    }
    function inferPickerColumns(rows){
      const first = rows[0];
      if(!first) return [{ field:'编码', title:'编码', width:120 }, { field:'名称', title:'名称', minWidth:160 }];
      return Object.keys(first).filter(k=> !k.startsWith('_') && k!=='id').map(k=>({ field:k, title:k, minWidth:120 }));
    }
    function matPickerFilter(m){
      if(m['启用状态']!=='启用') return false;
      if(pageId.value==='po' || pageId.value==='wwpo') return /条码|计数/.test(String(m['管理方式']||''));
      if(pageId.value==='serial-arch') return /条码/.test(String(m['管理方式']||''));
      if(pageId.value==='wh-prod-issue'){
        const mode = String(m['管理方式']||'');
        if(formModel['领料类型']==='备品备件领料') return /计数/.test(mode);
        return /条码|计数/.test(mode);
      }
      if(pageId.value==='wh-prod-ret' || pageId.value==='wh-prod-in') return /条码|计数|罐区/.test(String(m['管理方式']||''));
      if(isOsRawMatNoticePage()) return /条码|计数/.test(String(m['管理方式']||''));
      if(pageId.value==='wh-stocktake'){
        const mode = String(formModel['盘点方式']||'');
        if(mode.includes('条码')) return /条码/.test(String(m['管理方式']||''));
        return /条码|计数/.test(String(m['管理方式']||''));
      }
      if(pageId.value==='wh-other-in' || pageId.value==='wh-other-out') return /条码/.test(String(m['管理方式']||''));
      return true;
    }
    function calcExpireDate(prodDate, qty, unit){
      if(!prodDate) return '';
      const n = parseInt(String(qty||'').trim(), 10);
      if(!(n>0)) return '';
      const u = String(unit||'天').trim() || '天';
      const d = new Date(String(prodDate).replace(/-/g,'/'));
      if(isNaN(d.getTime())) return '';
      if(u==='年') d.setFullYear(d.getFullYear()+n);
      else if(u==='月') d.setMonth(d.getMonth()+n);
      else d.setDate(d.getDate()+n);
      const pad = x => String(x).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }
    function refreshSerialExpire(target){
      const t = target || formModel;
      const unit = t['有效期单位'] || '天';
      t['失效日期'] = calcExpireDate(t['生产日期'], t['有效期'], unit) || '';
    }
    function syncSerialCurrentQty(target){
      const t = target || formModel;
      const archive = String(t['建档数量']||'').trim();
      if(archive!=='') t['当前数量'] = archive;
    }
    function tmBarcodeTaken(code, excludeId, extraLists){
      const c = String(code||'').trim();
      if(!c) return false;
      const lists = [
        ((MOCK['serial-arch']||{}).main||[]),
        ((MOCK['tank-arch']||{}).main||[])
      ].concat(extraLists||[]);
      return lists.some(arr=> (arr||[]).some(r=> r['条码号']===c && r.id!==excludeId));
    }
