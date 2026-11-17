    function dictFirst(field, tab){
      if(window.WMS_DICT && typeof window.WMS_DICT.firstOption==='function'){
        return window.WMS_DICT.firstOption(pageId.value, field, tab || '', MOCK.dict) || '';
      }
      return '';
    }
    const soPrepDocTypeOptions = computed(()=>{
      storeTick.value;
      if(window.WMS_DICT && typeof window.WMS_DICT.optionsFor==='function'){
        const opts = window.WMS_DICT.optionsFor('wh-so-prep', '单据类型', '', MOCK.dict);
        if(opts && opts.length) return opts;
      }
      return ['正常备货','紧急备货'];
    });
    function uniqueMockFieldValues(field){
      const bag = MOCK[pageId.value] || {};
      const seen = [];
      Object.keys(bag).forEach(k=>{
        const arr = bag[k];
        if(!Array.isArray(arr)) return;
        arr.forEach(r=>{
          const v = String((r && r[field]) || '').trim();
          if(v && v!=='—' && !seen.includes(v)) seen.push(v);
        });
      });
      return seen;
    }
    function restWhDocTypeOptions(){
      const m = {
        'wh-cs-recv': ['受托收料通知单', '受托收料'],
        'wh-cs-ret': ['受托退料通知单', '受托退料'],
        'wh-so-preout': ['标准预出货','紧急预出货','样品预出货'],
        'wh-so-ship': ['标准发货','紧急发货','样品发货'],
        'wh-so-ret': ['标准退货','拒收退货','换货退货'],
        'wh-other-in': ['盘盈入库','样品入库','研发入库'],
        'wh-other-out': ['盘亏出库','样品出库','研发领用'],
        'wh-load': ['标准装卸', '紧急装卸', '厂内移库装卸'],
        'wh-transfer': ['库内转移'],
        'wh-seq': ['库内转序']
      };
      return m[pageId.value] || [];
    }
    function prodRetBatchOptions(row){
      const outNo = String(formModel['生产领料出库单']||'').trim();
      if(!outNo) return [];
      const matCode = codeOf((row && row['物料信息']) || '');
      const flowLots = new Set(
        ((MOCK['wh-prod-issue']||{}).tab3||[])
          .filter(r=> r['出库单号']===outNo && (!matCode || codeOf(r['物料信息'])===matCode))
          .map(r=> String(r['物料批号']||'').trim())
          .filter(Boolean)
      );
      if(!flowLots.size) return [];
      const lots = [];
      ((MOCK['serial-arch']||{}).main||[]).forEach(r=>{
        const lot = String(r['物料批号']||'').trim();
        if(!lot || !flowLots.has(lot)) return;
        if(r['使用状态']!=='在用') return;
        if(r['库存状态']!=='仓库') return;
        const qty = String(r['当前数量']||'').trim();
        if(!qty || qty==='—' || !(Number(qty)>0)) return;
        if(matCode && codeOf(r['物料信息'])!==matCode) return;
        if(!lots.includes(lot)) lots.push(lot);
      });
      return lots;
    }
    function soOutFlowModule(outNo){
      const no = codeOf(outNo);
      if(!no) return '';
      return no.startsWith('CKYC') ? 'wh-so-preout' : 'wh-so-ship';
    }
    function soOutFlowRows(outNo, matCode){
      const no = codeOf(outNo);
      if(!no) return [];
      const pid = soOutFlowModule(no);
      const mat = codeOf(matCode);
      return (((MOCK[pid]||{}).tab3)||[]).filter(r=>{
        if(codeOf(r['出库单号'])!==no) return false;
        if(mat && codeOf(r['物料信息'])!==mat) return false;
        const st = String(r['流水状态']||'');
        return st==='已完成' || st==='执行中';
      });
    }
    function soRetSerialArchRows(outNo, matCode){
      const flows = soOutFlowRows(outNo, matCode);
      const barcodes = new Set(flows.map(r=> String(r['条码号']||'').trim()).filter(Boolean));
      if(!barcodes.size) return [];
      const mat = codeOf(matCode);
      let rows = (((MOCK['serial-arch']||{}).main)||[]).filter(r=>{
        const bc = String(r['条码号']||'').trim();
        if(!barcodes.has(bc)) return false;
        if(r['使用状态']==='报废') return false;
        if(mat && codeOf(r['物料信息'])!==mat) return false;
        return true;
      });
      const factoryOut = rows.filter(r=> String(r['库存状态']||'')==='厂外');
      if(factoryOut.length) return factoryOut;
      const retOk = rows.filter(r=> ['厂外','初始化'].includes(String(r['库存状态']||'')));
      if(retOk.length) return retOk;
      return flows.map(f=>({
        条码号: f['条码号'],
        物料批号: f['批号'] || f['物料批号'] || '',
        物料信息: f['物料信息'] || '',
        库存单位: f['库存单位'] || 'KG',
        库存状态: '厂外',
        使用状态: '在用',
        检验状态: '合格',
        _flowOnly: true
      }));
    }
    function isDirectXferPage(){
      return pageId.value==='wh-direct-xfer';
    }
    function isProdWhPage(){
      return ['wh-prod-issue','wh-prod-ret','wh-prod-in','wh-direct-xfer'].includes(pageId.value);
    }
    function isProdFormLotField(f){
      return !!(f && f.name==='批号' && isProdWhPage());
    }
    function isCountManageRow(row){
      return String((row && row['管理方式']) || '').includes('计数');
    }
    /** 计数管理：模糊下拉库内（仓库）有数量的计数库存批号 */
    function countWhLotOptions(row){
      const matCode = codeOf((row && row['物料信息']) || '');
      if(!matCode) return [];
      const lots = [];
      ((MOCK['count-inv']||{}).main||[]).forEach(r=>{
        if(codeOf(r['物料信息'])!==matCode) return;
        if(String(r['库存状态']||'')!=='仓库') return;
        const qty = String(r['当前数量']||'').trim();
        if(!qty || qty==='—' || !(Number(qty)>0)) return;
        const lot = String(r['批号']||r['物料批号']||'').trim();
        if(!lot || lot==='—') return;
        if(!lots.includes(lot)) lots.push(lot);
      });
      return lots;
    }
    function formLineSelectOptions(f, row){
      if(pageId.value==='gather-scheme' && f && f.name==='采集项单位'){
        const names = (((MOCK.unit||{}).main)||[]).filter(r=> r['启用状态']!=='禁用').map(r=> r['单位名称']);
        (((MOCK['gather-item']||{}).main)||[]).forEach(r=>{ if(r['采集项单位']) names.push(r['采集项单位']); });
        if(row && row['采集项单位']) names.push(row['采集项单位']);
        if(row && row['采集项原单位']) names.push(row['采集项原单位']);
        return [...new Set(names.map(x=> String(x||'').trim()).filter(Boolean))];
      }
      if(pageId.value===PERSON_PAGE && f.name==='能力名称') return personAbilityOptions(row);
      if(isProdFormLotField(f) && isCountManageRow(row) && pageId.value!=='wh-prod-in') return countWhLotOptions(row);
      return formFieldOptions(f);
    }
    function onFormLineSelectChange(f, row){
      if(!(pageId.value==='gather-scheme' && f && f.name==='采集项单位' && row)) return;
      const name = String(row['采集项单位']||'').trim();
      const origin = String(row['采集项原单位']||'').trim();
      const hit = (((MOCK.unit||{}).main)||[]).find(r=> r['启用状态']!=='禁用' && r['单位名称']===name);
      row['采集项单位编码'] = hit ? (hit['单位编码']||'') : '';
      if(origin && name && name!==origin){
        ElMessage.info('采集项单位已从「'+origin+'」改为「'+name+'」，请核对限值');
      }
    }
    const gsDragFrom = ref(-1);
    function onGsDragStart(index, ev){
      gsDragFrom.value = index;
      try{ if(ev && ev.dataTransfer){ ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain', String(index)); } }catch(_e){}
    }
    function onGsDrop(index){
      const from = gsDragFrom.value;
      gsDragFrom.value = -1;
      if(from<0 || from===index) return;
      const list = (formLineRows.value||[]).slice();
      const [row] = list.splice(from, 1);
      if(!row) return;
      list.splice(index, 0, row);
      formLineRows.value = list.map((r,i)=> ({ ...r, _i:i+1 }));
    }
    function warehouseInUse(row){
      const tab = activeTab.value || (tabView.value||{}).name || 'tab1';
      if(tab==='tab1'){
        const code = String((row&&row['仓库编码'])||'').trim();
        const name = String((row&&row['仓库名称'])||'').trim();
        if(!code && !name) return false;
        if(((MOCK.warehouse||{}).tab2||[]).some(l=> splitDun(l['所属仓库']).includes(name))) return true;
        if(((MOCK['stock-warn']||{}).tab1||[]).some(w=> w['仓库编码']===code || w['仓库名称']===name)) return true;
        return walkMockInUse(['warehouse','stock-warn'], r=>{
          if(!r || typeof r!=='object') return false;
          if(code && (r['仓库编码']===code || r['仓库编号']===code)) return true;
          if(name && (r['所属仓库']===name || r['仓库名称']===name)) return true;
          return false;
        });
      }
      const code = String((row&&row['库位编码'])||'').trim();
      const name = String((row&&row['库位名称'])||'').trim();
      if(!code && !name) return false;
      return walkMockInUse(['warehouse'], r=>{
        if(!r || typeof r!=='object') return false;
        if(code && (r['库位编码']===code || r['关联库位']===code || String(r['库区/库位']||'')===code)) return true;
        if(name && r['库位名称']===name) return true;
        return false;
      });
    }
    function stockWarnInUse(row){
      const tab = activeTab.value || (tabView.value||{}).name || 'tab1';
      if(tab==='tab1'){
        const code = String((row&&row['仓库编码'])||'').trim();
        if(!code) return false;
        return walkMockInUse(['stock-warn','warehouse'], r=>{
          if(!r || typeof r!=='object') return false;
          return r['预警仓库编码']===code || (r['仓库编码']===code && r['最大库存']!=null && r.id!==row.id);
        });
      }
      const code = String((row&&row['物料编码'])||'').trim();
      if(!code) return false;
      return walkMockInUse(['stock-warn','mat-list'], r=>{
        if(!r || typeof r!=='object') return false;
        return r['预警物料编码']===code;
      });
    }
    function inspProcInUse(row){
      const name = String((row&&row['工序名称'])||'').trim();
      const code = String((row&&row['工序编码'])||'').trim();
      if(!name && !code) return false;
      return ((MOCK['insp-craft']||{}).main||[]).some(c=>{
        const nodes = (c._craft && c._craft.nodes) || [];
        return nodes.some(n=> n.name===name || n.code===code);
      });
    }
    function inspCraftInUse(row){
      const code = String((row&&row['工艺编码'])||'').trim();
      const name = String((row&&row['工艺名称'])||'').trim();
      if(!code && !name) return false;
      return walkMockInUse(['insp-craft','insp-proc'], r=>{
        if(!r || typeof r!=='object') return false;
        if(code && (r['检查工艺编码']===code || r['工艺编码']===code)) return true;
        if(name && (r['检查工艺']===name || r['工艺名称']===name)) return true;
        return false;
      });
    }
    function walkMockInUse(skipPids, hitFn){
      const skip = new Set(Array.isArray(skipPids) ? skipPids : [skipPids]);
      const walk = (node)=>{
        if(!node) return false;
        if(Array.isArray(node)) return node.some(walk);
        if(typeof node === 'object'){
          if(hitFn(node)) return true;
          return Object.values(node).some(walk);
        }
        return false;
      };
      const mock = window.WMS_MOCK_ROWS || MOCK;
      return Object.entries(mock).some(([pid, val])=> !skip.has(pid) && walk(val));
    }
    function customerInUse(row){
      const code = String((row&&row['客户编码'])||'').trim();
      const name = String((row&&row['客户名称'])||'').trim();
      if(!code && !name) return false;
      return walkMockInUse('customer', r=>{
        if(code && (r['客户编码']===code || String(r['客户编码']||'')===code)) return true;
        if(name && r['客户名称']===name) return true;
        return false;
      });
    }
    function supplierInUse(row){
      const code = String((row&&row['供应商编码'])||'').trim();
      const name = String((row&&row['供应商名称'])||'').trim();
      if(!code && !name) return false;
      return walkMockInUse('supplier', r=>{
        if(code && (r['供应商编码']===code || String(r['供应商编码']||'')===code)) return true;
        if(name && (r['供应商名称']===name || r['加工厂名称']===name)) return true;
        return false;
      });
    }
    function normUnitName(u){
      const s = String(u||'').trim();
      const map = {KG:'千克',kg:'千克',千克:'千克',T:'吨',t:'吨',吨:'吨',PCS:'个',pcs:'个',个:'个',L:'升',l:'升',升:'升',BAG:'袋',袋:'袋'};
      return map[s] || s;
    }
    function unitInUse(row){
      const name = String((row&&row['单位名称'])||'').trim();
      const code = String((row&&row['单位编码'])||'').trim();
      if(!name && !code) return false;
      const targets = new Set([normUnitName(name), name, code, code.replace(/^U-/,''), normUnitName(code.replace(/^U-/,''))].filter(Boolean));
      const unitKey = /单位/;
      return walkMockInUse('unit', r=>{
        if(!r || typeof r !== 'object') return false;
        return Object.keys(r).some(k=>{
          if(!unitKey.test(k)) return false;
          const v = String(r[k]||'').trim();
          if(!v) return false;
          return targets.has(v) || targets.has(normUnitName(v));
        });
      });
    }
    function dictItemInUse(row){
      const name = String((row&&row['名称'])||'').trim();
      if(!name) return false;
      const keys = new Set(['客户类型','供应商类型','物料种类','物料规格','名称']);
      return walkMockInUse('dict', r=>{
        if(!r || typeof r !== 'object') return false;
        return Object.keys(r).some(k=> keys.has(k) && String(r[k]||'')===name);
      });
    }
    function addrPopoverField(row, kind){
      const a = ((row&&row._addrs)||[])[0] || {};
      const keys = Object.keys(a);
      if(kind==='code') return keys.find(k=>k.includes('地址编码')) || '客户地址编码';
      if(kind==='desc') return keys.find(k=>k.includes('地址描述')) || '客户地址描述';
      if(kind==='person') return keys.find(k=>k.includes('联系人')) || '联系人';
      return keys.find(k=>k==='联系电话' || (k.includes('电话') && !k.includes('联系人'))) || '联系电话';
    }
    function serialLotOf(matInfo){
      const code = codeOf(matInfo);
      const rows = ((MOCK['serial-arch']||{}).main||[]).filter(r=> r['使用状态']!=='报废');
      const ranked = rows.slice().sort((a,b)=> (a['使用状态']==='在用'?0:1) - (b['使用状态']==='在用'?0:1));
      const hit = (code ? ranked.find(r=> codeOf(r['物料信息'])===code) : null) || ranked[0];
      return (hit && hit['物料批号']) || '';
    }
    function outboundLotOf(outNo, matInfo){
      const flows = ((MOCK['wh-prod-issue']||{}).tab3||[]).filter(r=> r['出库单号']===outNo && (!matInfo || codeOf(r['物料信息'])===codeOf(matInfo)));
      const lot = flows[0] && flows[0]['物料批号'];
      if(lot && !String(lot).includes(' / ')) return lot;
      return serialLotOf(matInfo || (flows[0] && flows[0]['物料信息']));
    }
    function matCodeOfLine(r){
      return codeOf((r&& (r['物料信息']||r['物料编码']||r.编码)) || '');
    }
    function lookupContractNo(orderType, code){
      const c = codeOf(code);
      if(orderType==='采购订单' || !orderType){
        const po = ((MOCK.po||{}).main||[]).find(r=> r['采购订单号']===c);
        if(po && po['合同号']) return po['合同号'];
      }
      if(orderType==='销售订单' || !orderType){
        const so = ((MOCK.so||{}).main||[]).find(r=> r['销售订单号']===c);
        if(so && so['合同号']) return so['合同号'];
      }
      return '';
    }
    function tradeSoNos(){
      return ((MOCK.so||{}).main||[]).filter(s=> s['销售类型']==='纯贸易').map(s=> s['销售订单号']);
    }
    function tradeDirectPos(){
      return ((MOCK.po||{}).main||[]).filter(p=> ['待执行','执行中'].includes(p['订单状态']));
    }
    function poOrderOf(code){
      const c = codeOf(code);
      return ((MOCK.po||{}).main||[]).find(r=> r['采购订单号']===c) || null;
    }
    function soOrderOf(code){
      const c = codeOf(code);
      return ((MOCK.so||{}).main||[]).find(r=> r['销售订单号']===c) || null;
    }
    function nextBizNo(prefix, listKey, noField){
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const bag = MOCK[listKey] || {};
      const list = (bag.main || bag.tab1 || []);
      const sameDay = list.filter(r=> String(r[noField]||'').startsWith(prefix+ymd));
      const seq = String(sameDay.length + 1).padStart(4,'0');
      return prefix + ymd + seq;
    }
    function nextTmNo(){
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const prefix = 'TM' + ymd;
      let max = 0;
      [((MOCK['serial-arch']||{}).main||[]), ((MOCK['tank-arch']||{}).main||[])].forEach(list=>{
        (list||[]).forEach(r=>{
          const s = String(r['条码号']||'');
          if(s.startsWith(prefix)){
            const n = parseInt(s.slice(-4), 10);
            if(Number.isFinite(n) && n>max) max = n;
          }
        });
      });
      return prefix + String(max + 1).padStart(4,'0');
    }
    function poDownstreamInUse(poCode){
      const c = codeOf(poCode);
      if(!c) return false;
      const pages = ['wh-po-in','wh-po-ret'];
      return pages.some(pid=>{
        const arr = (MOCK[pid]||{}).tab1;
        return Array.isArray(arr) && arr.some(r=> codeOf(r['关联采购订单'])===c);
      });
    }
    function soDownstreamInUse(soCode){
      const c = codeOf(soCode);
      if(!c) return false;
      const pages = [
        ['wh-so-prep', 'main'],
        ['wh-so-preout', 'tab1'],
        ['wh-so-ship', 'tab1'],
        ['wh-so-ret', 'tab1']
      ];
      return pages.some(([pid, key])=>{
        const arr = (MOCK[pid]||{})[key];
        return Array.isArray(arr) && arr.some(r=> codeOf(r['关联销售订单'])===c);
      });
    }
    function canEditPo(row){
      return (row?.['订单状态'] || '')==='待执行';
    }
    function parseErpLineNo(v){
      const m = String(v||'').match(/^(\d+)/);
      return m ? Number(m[1]) : 0;
    }
    function erpLineNo(n){ return String(Math.max(1, Number(n)||1) * 10); }
    function nextErpLineNo(lines){
      const nums = (lines||[]).map(r=> parseErpLineNo(r['行号'] || r._orderLineNo)).filter(n=> n>0);
      return String((nums.length ? Math.max(...nums) : 0) + 10);
    }
    /** 订单行号基底：取 10 / 20；若已是拆分串 10-1 则只取前缀 10 */
    function orderLineNoBase(r, fallbackIdx){
      const raw = String((r && (r._orderLineNo || r['行号'])) || '').trim();
      if(raw && raw!=='—'){
        const m = raw.match(/^(\d+)/);
        if(m) return m[1];
      }
      return fallbackIdx != null ? erpLineNo(fallbackIdx) : '';
    }
    function ensureLineNos(lines){
      return (lines||[]).map((r,i)=>{
        const ln = String((r && (r['行号'] || r._orderLineNo)) || '').trim();
        if(ln && ln!=='—'){
          return Object.assign({}, r, {
            行号: ln,
            _orderLineNo: r._orderLineNo || orderLineNoBase(r, i+1)
          });
        }
        const base = erpLineNo(i+1);
        return Object.assign({}, r, { 行号: base, _orderLineNo: base });
      });
    }
    function lineNoOf(r, fallbackIdx){
      const base = orderLineNoBase(r, fallbackIdx);
      if(base) return base;
      return fallbackIdx != null ? erpLineNo(fallbackIdx) : '10';
    }
    /** 仓储 L1 通知单明细行号：保留发货单拆分串（10-1），勿用 orderLineNoBase 截断 */
    function noticeDetailLineNo(r, fallbackIdx){
      const raw = String((r && r['行号']) || '').trim();
      if(raw && raw!=='—') return raw;
      const alt = String((r && r._rowNo) || '').trim();
      if(alt && alt!=='—') return alt;
      return lineNoOf(r, fallbackIdx);
    }
    function alignNoticeDetailLinesFromShip(noticeRow, lines){
      const src = Array.isArray(lines) ? lines : [];
      const shipNo = String((noticeRow && noticeRow['关联发货单']) || '').trim();
      if(!shipNo || shipNo==='—') return src;
      const ship = findShipByNo(shipNo);
      const shipLines = ship ? shipLinesOf(ship) : [];
      if(!shipLines.length) return src;
      if(src.length === shipLines.length){
        return src.map((ln,i)=> ({
          ...ln,
          行号: noticeDetailLineNo({ ...ln, 行号: ln['行号'] || shipLines[i]['行号'] }, i+1),
          _orderLineNo: ln._orderLineNo || shipLines[i]._orderLineNo || orderLineNoBase(shipLines[i], i+1)
        }));
      }
      const used = new Set();
      return src.map((ln, i)=>{
        const code = codeOf(ln['物料信息']);
        const hit = shipLines.find(s=>{
          const sno = String(s['行号']||'').trim();
          return codeOf(s['物料信息'])===code && sno && !used.has(sno);
        }) || shipLines[i];
        if(hit){
          const sno = String(hit['行号']||'').trim();
          if(sno) used.add(sno);
          return {
            ...ln,
            行号: noticeDetailLineNo({ ...ln, 行号: ln['行号'] || sno }, i+1),
            _orderLineNo: ln._orderLineNo || hit._orderLineNo || orderLineNoBase(hit, i+1)
          };
        }
        return ln;
      });
    }
