    function poInHasDownstream(noticeNo){
      const no = String(noticeNo||'').trim();
      if(!no) return false;
      return ((MOCK['wh-po-in']||{}).tab2||[]).some(r=> String(r['关联收料通知单号']||'')===no)
        || ((MOCK['wh-po-in']||{}).tab3||[]).some(r=> String(r['通知单号']||'')===no);
    }
    function whNoticePageIds(){
      return ['wh-po-in','wh-po-ret','wh-os-issue','wh-os-ret-mat','wh-os-recv','wh-os-ret-goods','wh-cs-recv','wh-cs-ret'];
    }
    function shipLinkedNotice(shipNo, exclude){
      const code = codeOf(shipNo);
      if(!code || code==='—') return null;
      const exId = exclude && (exclude.id || exclude._editId);
      const exNo = exclude && (exclude['单号'] || exclude.单号);
      for(const pid of whNoticePageIds()){
        const list = (MOCK[pid]||{}).tab1 || [];
        const hit = list.find(r=>{
          if(!r) return false;
          if(exId && r.id===exId) return false;
          if(exNo && String(r['单号']||'')===String(exNo)) return false;
          const sn = codeOf(r['关联发货单']);
          if(!sn || sn==='—') return false;
          return sn===code || String(r['关联发货单']||'').split(/[、,，]/).map(s=>codeOf(s)).includes(code);
        });
        if(hit){
          const titleMap = {
            'wh-po-in':'采购收料通知单', 'wh-po-ret':'采购退料通知单',
            'wh-os-issue':'委外发料通知单', 'wh-os-ret-mat':'委外退料通知单',
            'wh-os-recv':'委外收货通知单', 'wh-os-ret-goods':'委外退货通知单',
            'wh-cs-recv':'受托收料通知单',
            'wh-cs-ret':'受托退料通知单',
          };
          return { pageId: pid, notice: hit, label: titleMap[pid]||'通知单', 单号: hit['单号']||'' };
        }
      }
      return null;
    }
    /** 发货单唯一：一张发货单仅可关联一张未删除的仓储通知单；编辑本单除外 */
    function assertShipNoticeUnique(shipNo, opts){
      const code = codeOf(shipNo);
      if(!code || code==='—') return true;
      const exclude = (opts && opts.exclude) || null;
      const hit = shipLinkedNotice(code, exclude);
      if(!hit) return true;
      ElMessage.warning(`发货单 ${code} 已关联${hit.label} ${hit.单号}，不可重复绑定；请先删除原通知单后再新增`);
      return false;
    }
    function isPoNoticePage(){
      return pageId.value==='wh-po-in' || pageId.value==='wh-po-ret';
    }
    function isProdIssuePage(){
      return pageId.value==='wh-prod-issue';
    }
    function prodAppMeta(){
      const map = {
        'wh-prod-issue': { label:'生产领料申请单', prefix:'SCLSQ', idPrefix:'sclsq-', docType:'生产领料申请单' },
        'wh-prod-ret': { label:'生产退料申请单', prefix:'SCTSQ', idPrefix:'sctsq-', docType:'生产退料申请单' },
        'wh-prod-in': { label:'生产入库申请单', prefix:'SCRKSQ', idPrefix:'scrksq-', docType:'生产入库申请单' },
        'wh-direct-xfer': { label:'直接调拨申请单', prefix:'ZJDBSQ', idPrefix:'zjdb-', docType:'直接调拨申请单' }
      };
      return map[pageId.value] || null;
    }
    function isLoadPage(){ return pageId.value==='wh-load'; }
    function loadPageMeta(){
      return { label:'装卸货通知单', prefix:'ZXTT', idPrefix:'zxtt-', docType:'标准装卸' };
    }
    function loadWhBizMeta(biz){
      const b = String(biz||'').trim();
      const map = {
        '采购收料': { pageId:'wh-po-in', tab:'tab1', noKey:'单号', partyKey:'供应商名称', wayBiz:'采购入库', statusKey:'单据状态' },
        '采购退料': { pageId:'wh-po-ret', tab:'tab1', noKey:'单号', partyKey:'供应商名称', wayBiz:'采购退料', statusKey:'单据状态' },
        '生产领料': { pageId:'wh-prod-issue', tab:'tab1', noKey:'单号', partyKey:'', wayBiz:'', statusKey:'单据状态' },
        '生产退料': { pageId:'wh-prod-ret', tab:'tab1', noKey:'单号', partyKey:'', wayBiz:'', statusKey:'单据状态' },
        '生产入库': { pageId:'wh-prod-in', tab:'tab1', noKey:'单号', partyKey:'客户名称', wayBiz:'', statusKey:'单据状态' },
        '销售发货': { pageId:'wh-so-ship', tab:'tab1', noKey:'单号', partyKey:'客户名称', wayBiz:'销售发货', statusKey:'单据状态' },
        '销售预出货': { pageId:'wh-so-preout', tab:'tab1', noKey:'单号', partyKey:'客户名称', wayBiz:'销售预出货', statusKey:'单据状态' },
        '销售退货': { pageId:'wh-so-ret', tab:'tab1', noKey:'单号', partyKey:'客户名称', wayBiz:'销售退货', statusKey:'单据状态' },
        '委外发料': { pageId:'wh-os-issue', tab:'tab1', noKey:'单号', partyKey:'供应商名称', wayBiz:'委外发料', statusKey:'单据状态' },
        '委外退料': { pageId:'wh-os-ret-mat', tab:'tab1', noKey:'单号', partyKey:'供应商名称', wayBiz:'委外退料', statusKey:'单据状态' },
        '委外收货': { pageId:'wh-os-recv', tab:'tab1', noKey:'单号', partyKey:'供应商名称', wayBiz:'委外收货', statusKey:'单据状态' },
        '委外退货': { pageId:'wh-os-ret-goods', tab:'tab1', noKey:'单号', partyKey:'供应商名称', wayBiz:'委外退货', statusKey:'单据状态' },
        '受托收料': { pageId:'wh-cs-recv', tab:'tab1', noKey:'单号', partyKey:'客户名称', wayBiz:'受托收料', statusKey:'单据状态' },
        '受托退料': { pageId:'wh-cs-ret', tab:'tab1', noKey:'单号', partyKey:'客户名称', wayBiz:'受托退料', statusKey:'单据状态' },
        '其他入库': { pageId:'wh-other-in', tab:'tab1', noKey:'单号', partyKey:'', wayBiz:'其他入库', statusKey:'单据状态' },
        '其他出库': { pageId:'wh-other-out', tab:'tab1', noKey:'单号', partyKey:'', wayBiz:'其他出库', statusKey:'单据状态' },
        '库内移库': { pageId:'wh-transfer', tab:'tab1', noKey:'移库单号', partyKey:'', wayBiz:'库内转移', statusKey:'单据状态' },
        '库内转序': { pageId:'wh-seq', tab:'tab1', noKey:'转序单号', partyKey:'', wayBiz:'', statusKey:'单据状态' },
      };
      return map[b] || null;
    }
    function loadWhBizWaybillType(biz){
      const m = loadWhBizMeta(biz);
      return m && m.wayBiz ? m.wayBiz : '';
    }
    function loadNoticeHasDownstream(noticeNo){
      const no = String(noticeNo||'').trim();
      if(!no) return false;
      return ((MOCK['wh-load']||{}).tab2||[]).some(r=> String(r['关联装卸通知单号']||'')===no)
        || ((MOCK['wh-load']||{}).tab3||[]).some(r=> String(r['装卸通知单号']||'')===no);
    }
    function applyLoadSrcNotice(src, meta){
      if(!src || !meta) return;
      const no = String(src[meta.noKey]||'').trim();
      const party = meta.partyKey ? (src[meta.partyKey] || '—') : '—';
      formModel['关联单号'] = no;
      formModel['客供信息'] = party && party!=='—' ? party : '—';
      if(src['计划执行日期']) formModel['计划执行日期'] = src['计划执行日期'];
      formModel['关联运单'] = src['关联运单'] && src['关联运单']!=='—' ? String(src['关联运单']) : '';
      formModel['关联发货单'] = src['关联发货单'] && src['关联发货单']!=='—' ? String(src['关联发货单']) : '';
      formModel['承运商'] = src['承运商'] && src['承运商']!=='—' ? String(src['承运商']) : '';
      ['车牌号','车挂号','司机姓名','司机电话','司机身份证号'].forEach(k=>{
        formModel[k] = src[k] && src[k]!=='—' ? String(src[k]) : '';
      });
      if(formModel['关联运单']) fillPoInCarrierFromWaybill(findWaybillByNo(formModel['关联运单']));
      const lines = Array.isArray(src._lines) ? src._lines : [];
      formLineRows.value = lines.map((ln,i)=>({
        ...ln,
        _i: i+1,
        行状态: ln['行状态'] || '待执行',
        已完成数量: ln['已完成数量'] != null && ln['已完成数量'] !== '' ? ln['已完成数量'] : '0.000',
        未完成数量: ln['未完成数量'] != null && ln['未完成数量'] !== '' ? ln['未完成数量'] : String(ln['计划数量']||''),
      }));
    }
    function isWhLineClosePage(){
      return isPoNoticePage() || isProdWhPage() || pageId.value==='wh-other-in' || pageId.value==='wh-other-out' || isLoadPage();
    }
    function isWhNoticePage(){
      return isPoNoticePage() || isOsPoPage();
    }
    function isRestWhNoticePage(){
      return ['wh-cs-recv','wh-cs-ret','wh-so-preout','wh-so-ship','wh-so-ret','wh-other-in','wh-other-out','wh-load','wh-transfer','wh-seq','wh-stocktake'].includes(pageId.value);
    }
    function isCsRecvPage(){
      return pageId.value==='wh-cs-recv';
    }
    function isCsRetPage(){
      return pageId.value==='wh-cs-ret';
    }
    function isCsWhPage(){
      return isCsRecvPage() || isCsRetPage();
    }
    function csNoticeMeta(){
      if(isCsRecvPage()) return { prefix:'STST', label:'受托收料通知单', docType:'受托收料通知单', emptyTip:'请至少添加一行收料物料明细', biz:'受托收料' };
      if(isCsRetPage()) return { prefix:'STTL', label:'受托退料通知单', docType:'受托退料通知单', emptyTip:'请至少添加一行退料物料明细', biz:'受托退料' };
      return null;
    }
    function restWhStatusKey(){
      return pageId.value==='wh-stocktake' ? '状态' : '单据状态';
    }
    function restWhDocList(){
      const bag = MOCK[pageId.value] || {};
      if(Array.isArray(bag.tab1)) return bag.tab1;
      if(Array.isArray(bag.main)) return bag.main;
      return [];
    }
    function restWhSourceDocRows(){
      const src = [
        ['wh-po-in','tab1','单号','物料信息'],
        ['wh-so-ship','tab1','单号','物料信息'],
        ['wh-so-preout','tab1','单号','物料信息'],
        ['wh-other-in','tab1','单号','物料信息'],
        ['wh-other-out','tab1','单号','物料信息'],
        ['wh-cs-recv','tab1','单号','物料信息']
      ];
      const rows = [];
      src.forEach(([pid, tab, codeF, nameF])=>{
        ((MOCK[pid]||{})[tab]||[]).slice(0,6).forEach(r=>{
          rows.push({
            ...r,
            编码: r[codeF] || '',
            名称: r[nameF] || r['客户名称'] || '',
            来源模块: pid,
            _pickerPageId: pid,
            _pickerTab: tab,
            _pickerCodeField: codeF
          });
        });
      });
      return rows;
    }
    function isWhMatMultiPick(t){
      const title = String(t||'');
      if(!title.includes('物料') || title.includes('新物料')) return false;
      if(title==='运输服务物料信息' || title==='预警物料') return false;
      const id = pageId.value || '';
      if(id==='po' || id==='so' || id==='wwpo' || id==='mat-medium' || id==='lg-dispatch' || id==='pkg-craft') return true;
      return id.startsWith('wh-') && id!=='wh-so-prep';
    }
    function outerBindAnchor(){
      const lines = detailLineRows.value || [];
      const head = detailRow.value || {};
      const mat = lines.map(r=> codeOf(r['物料信息'])).find(Boolean)
        || codeOf(head['物料信息'])
        || '';
      // 绑定约束的库存位置以明细库位为准（头信息可能是仓库级位置文案）
      const loc = lines.map(r=> String(r['库存位置']||'').trim()).find(Boolean) || '';
      return { mat, loc };
    }
    function serialLocOf(r){
      return String((r && (r['存储位置'] || r['库存位置'] || r.存储位置 || r.库存位置)) || '').trim();
    }
    function whNoticeRefField(){
      if(isLoadPage()) return '关联单号';
      return isOsPoPage() ? '关联委外加工单' : '关联采购订单';
    }
    function whNoticeBizType(){
      if(isLoadPage()) return loadWhBizWaybillType(formModel['关联仓库业务']);
      const m = {
        'wh-po-in': '采购入库',
        'wh-po-ret': '采购退料',
        'wh-os-issue': '委外发料',
        'wh-os-ret-mat': '委外退料',
        'wh-os-recv': '委外收货',
        'wh-os-ret-goods': '委外退货',
      };
      return m[pageId.value] || '';
    }
    function osNoticeLineType(){
      if(pageId.value==='wh-os-issue' || pageId.value==='wh-os-ret-mat') return '委外原料';
      if(isOsPoPage()) return '委外成品';
      return '';
    }
    function osNoticeMeta(){
      const m = {
        'wh-os-issue': { prefix:'WWFT', label:'委外发料通知单', tab2Notice:'关联发料通知单号' },
        'wh-os-ret-mat': { prefix:'WWTT', label:'委外退料通知单', tab2Notice:'关联退料通知单号' },
        'wh-os-recv': { prefix:'WWST', label:'委外收货通知单', tab2Notice:'关联收货通知单号' },
        'wh-os-ret-goods': { prefix:'WWTH', label:'委外退货通知单', tab2Notice:'关联退货通知单号' },
      };
      return m[pageId.value] || null;
    }
    function osNoticeHasDownstream(noticeNo){
      const no = String(noticeNo||'').trim();
      const pid = pageId.value;
      if(!no || !pid || !MOCK[pid]) return false;
      const meta = osNoticeMeta();
      const nKey = meta ? meta.tab2Notice : '关联通知单号';
      return ((MOCK[pid]||{}).tab2||[]).some(r=> String(r[nKey]||'')===no)
        || ((MOCK[pid]||{}).tab3||[]).some(r=> String(r['通知单号']||'')===no);
    }
    function whNoticeHasDownstream(noticeNo){
      if(isOsPoPage()) return osNoticeHasDownstream(noticeNo);
      return poNoticeHasDownstream(noticeNo);
    }
    function buildOsNoticeFormLines(lines, vendor){
      const want = osNoticeLineType();
      const today = todayYmdLocal();
      return (lines||[]).filter(ln=>{
        if(!want) return true;
        const typ = String(ln['发料/产出类型']||'').trim();
        // 委外订单明细已取消「发料/产出类型」后：无类型字段时全部带入
        return !typ || typ===want;
      }).map((m,i)=>{
        const code = matCodeOfLine(m);
        const mr = matListRow(code);
        const mode = String((mr && mr['管理方式']) || '条码管理');
        const isCount = mode.includes('计数');
        const lot = pageId.value==='wh-os-recv' ? (todayYmdLocal().replace(/-/g,'') + String(i+1).padStart(3,'0')) : '';
        return {
          _i: i+1,
          行号: lineNoOf(m, i+1),
          _orderLineNo: lineNoOf(m, i+1),
          行状态: '待执行',
          物料信息: matInfoText(m),
          库存单位: m['采购单位'] || m['单位'] || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
          管理方式: mode,
          计划件数: isCount ? '—' : String(m['计划件数'] || '10'),
          计划数量: String(m['未出/入库数量'] != null && m['未出/入库数量'] !== '' ? m['未出/入库数量'] : (m['计划数量'] || '')),
          批号: lot || '',
          生产日期: pageId.value==='wh-os-recv' ? today : '',
          有效期: pageId.value==='wh-os-recv' ? String((mr && mr['有效期']) || '12') : '',
          生产厂家: pageId.value==='wh-os-recv' ? (vendor || '') : '',
          已完成数量: '0.00',
          未完成数量: String(m['未出/入库数量'] != null && m['未出/入库数量'] !== '' ? m['未出/入库数量'] : (m['计划数量'] || '')),
          备注: m['备注'] || '',
        };
      });
    }
    function applyWwpoToNoticeForm(wwNo, pickerRow){
      const code = codeOf(wwNo || (pickerRow && pickerRow.编码) || '');
      const ww = ((MOCK.wwpo||{}).main||[]).find(r=> r['委外订单号']===code) || {};
      const vendor = ww['供应商名称'] || ww['加工厂名称'] || (pickerRow && pickerRow.名称) || '';
      formModel['关联委外加工单'] = (ww['委外订单号'] || code) + (vendor ? (' / ' + vendor) : '');
      formModel['供应商名称'] = vendor;
      if(ww['预计交货日期']) formModel['计划执行日期'] = ww['预计交货日期'];
      if(isOsRawMatNoticePage()){
        poMatPool.value = [];
        formLineRows.value = [];
      } else {
        const lines = wwpoLinesOf(ww);
        poMatPool.value = lines.map(m=>({...m, 编码: matCodeOfLine(m), 名称: m['物料名称']||'', 供应商: vendor}));
        formLineRows.value = finalizeNoticeFormLines(buildOsNoticeFormLines(lines, vendor));
      }
      clearPoInWaybillChain();
    }
    function findShipByNo(no){
      const code = codeOf(no);
      if(!code || code==='—') return null;
      return ((MOCK['lg-ship']||{}).main||[]).find(s=> String(s['发货单号']||'')===code) || null;
    }
    /** 发货单物料行：优先 _lines，否则用表头物料信息/发货数量合成 */
    function shipMatsOf(shipOrNo){
      const ship = (shipOrNo && typeof shipOrNo==='object') ? shipOrNo : findShipByNo(shipOrNo);
      if(!ship) return [];
      const lines = Array.isArray(ship._lines) ? ship._lines : [];
      if(lines.length){
        return lines.map(ln=>({
          物料编码: ln['物料编码'] || codeOf(ln['物料信息']),
          物料信息: ln['物料信息'] || '',
          物料名称: ln['物料名称'] || '',
          物料规格: ln['物料规格'] || '',
          物料种类: ln['物料种类'] || '',
          采购单位: ln['单位'] || ln['采购单位'] || '',
          单位: ln['单位'] || '',
          计划数量: String(ln['发货数量'] != null && ln['发货数量'] !== '' ? ln['发货数量'] : (ln['计划数量'] || ln['需求数量'] || '')),
          计划件数: ln['计划件数'] || '',
          批号: ln['批号'] || '',
          行号: ln['行号'] || '',
          备注: (ln['行备注'] && ln['行备注']!=='—') ? ln['行备注'] : (ln['备注']||''),
          '发料/产出类型': ln['发料/产出类型'] || osNoticeLineType() || '',
        })).filter(m=> m.物料编码 || m.物料信息);
      }
      const info = String(ship['物料信息']||'').trim();
      if(!info || info==='—') return [];
      return [{
        物料编码: codeOf(info),
        物料信息: info,
        采购单位: ship['单位'] || 'KG',
        计划数量: String(ship['发货数量'] != null && ship['发货数量'] !== '' ? ship['发货数量'] : ''),
        批号: ship['批号'] || '',
        备注: '',
        '发料/产出类型': osNoticeLineType() || '',
      }];
    }
    /** 委外：选发货单后用发货单物料覆盖通知单明细行 */
    function applyShipMatsToOsNoticeForm(shipOrNo){
      if(!isOsPoPage()) return false;
      const ship = (shipOrNo && typeof shipOrNo==='object') ? shipOrNo : findShipByNo(shipOrNo);
      const mats = shipMatsOf(ship);
      if(!mats.length) return false;
      const vendor = formModel['供应商名称'] || '';
      // 发货单物料已是当次承运范围，不再按发料/产出类型二次过滤
      const today = todayYmdLocal();
      formLineRows.value = mats.map((m,i)=>{
        const code = matCodeOfLine(m);
        const mr = matListRow(code);
        const mode = String((mr && mr['管理方式']) || '条码管理');
        const isCount = mode.includes('计数') || mode.includes('罐区');
        const lotFromShip = String(m['批号']||'').trim();
        const lot = lotFromShip && lotFromShip!=='—'
          ? lotFromShip
          : (pageId.value==='wh-os-recv' ? (today.replace(/-/g,'') + String(i+1).padStart(3,'0')) : '');
        const qty = String(m['计划数量'] || '');
        return {
          _i: i+1,
          行号: m['行号'] || lineNoOf(m, i+1),
          _orderLineNo: m['行号'] ? orderLineNoBase({ 行号: m['行号'] }, i+1) : lineNoOf(m, i+1),
          行状态: '待执行',
          物料信息: matInfoText(m),
          库存单位: m['采购单位'] || m['单位'] || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
          管理方式: mode,
          计划件数: isCount ? '—' : String(m['计划件数'] || (qty ? Math.max(1, Math.round(Number(qty)||1)) : '10')),
          计划数量: qty,
          批号: lot || '',
          生产日期: pageId.value==='wh-os-recv' ? today : '',
          有效期: pageId.value==='wh-os-recv' ? String((mr && mr['有效期']) || '12') : '',
          生产厂家: pageId.value==='wh-os-recv' ? (vendor || '') : '',
          已完成数量: '0.00',
          未完成数量: qty,
          备注: m['备注'] || '',
        };
      });
      if(isOsFinishedNoticePage()) formLineRows.value = finalizeNoticeFormLines(formLineRows.value);
      return true;
    }
    /** 受托收料/退料：发货单有值时自动带入物料明细 */
    function applyShipMatsToCsRecvForm(shipOrNo){
      if(!isCsWhPage()) return false;
      const ship = (shipOrNo && typeof shipOrNo==='object') ? shipOrNo : findShipByNo(shipOrNo);
      const mats = shipMatsOf(ship);
      if(!mats.length) return false;
      const today = todayYmdLocal();
      const vendor = formModel['客户名称'] || '';
      formLineRows.value = mats.map((m,i)=>{
        const code = matCodeOfLine(m);
        const mr = matListRow(code);
        const mode = String((mr && mr['管理方式']) || m['管理方式'] || '条码管理');
        const isCount = /计数|罐区/.test(mode);
        const lotFromShip = String(m['批号']||'').trim();
        // 收料：无批号时按年月日3位流水；退料：无批号留空，手输或选在库批号
        let lot = '';
        if(lotFromShip && lotFromShip!=='—') lot = lotFromShip;
        else if(isCsRecvPage()) lot = today.replace(/-/g,'') + String(i+1).padStart(3,'0');
        const qty = String(m['计划数量'] || '');
        const pcsRaw = String(m['计划件数'] || '').trim();
        const line = {
          _i: i+1,
          行状态: '待执行',
          物料信息: matInfoText(m),
          库存单位: m['单位'] || m['采购单位'] || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
          管理方式: mode,
          计划件数: isCount ? '—' : (pcsRaw || String(qty ? Math.max(1, Math.round(Number(qty)||1)) : '')),
          计划数量: qty,
          批号: lot,
          已完成数量: '0.000',
          未完成数量: qty || '0.000',
          备注: m['备注'] || '',
        };
        // 仅受托收料（入库类）带出生产日期/有效期/生产厂家；受托退料按出库规范 B 不展示
        if(isCsRecvPage()){
          line['生产日期'] = today;
          line['有效期'] = String((mr && mr['有效期']) || '12');
          line['生产厂家'] = vendor || '';
        }
        return line;
      });
      return true;
    }
    /** 销售发货：选发货单后带入物料明细（批号默认留空选填） */
    function applyShipMatsToSoShipForm(shipOrNo){
      if(pageId.value!=='wh-so-ship') return false;
      const ship = (shipOrNo && typeof shipOrNo==='object') ? shipOrNo : findShipByNo(shipOrNo);
      const mats = shipMatsOf(ship);
      if(!mats.length) return false;
      formLineRows.value = mats.map((m,i)=>{
        const code = matCodeOfLine(m);
        const mr = matListRow(code);
        const mode = String((mr && mr['管理方式']) || m['管理方式'] || '条码管理');
        const isCount = /计数|罐区/.test(mode);
        const qty = String(m['计划数量'] || m['发货数量'] || '');
        const pcsRaw = String(m['计划件数'] || '').trim();
        return {
          _i: i+1,
          行状态: '待执行',
          物料信息: matInfoText(m),
          库存单位: m['单位'] || m['销售单位'] || (mr && (mr['库存单位']||mr['基本单位'])) || 'KG',
          管理方式: mode,
          计划件数: isCount ? '—' : (pcsRaw || String(qty ? Math.max(1, Math.round(Number(qty)||1)) : '10')),
          计划数量: qty || '10.000',
          批号: '',
          已完成数量: '0.000',
          未完成数量: qty || '10.000',
          备注: m['备注'] || '',
        };
      });
      return true;
    }
    /** 销售发货 · 场景一：选已完成预出货出库单(CKYC) → 按实际出库流水带入物料/批号/已完成数量 + 表头订单与运力 */
    function findPreoutNoticeByOut(outRow){
      if(!outRow) return {};
      const noticeNo = outRow['关联通知单号'] || '';
      return (((MOCK['wh-so-preout']||{}).tab1)||[]).find(r=> r['单号']===noticeNo) || {};
    }
