    function isFormFieldRequired(f){
      if(!f) return false;
      if(f.showWhen && !isFormFieldVisible(f)) return false;
      if(f.name==='配送类型'){
        const biz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
        return biz==='销售发货';
      }
      if(f.name==='采购订单'){
        const biz = formModel['关联仓储业务'] || formModel['仓库业务类型'] || '';
        return biz==='销售发货' && formModel['配送类型']==='直发业务（贸易）';
      }
      if(pageId.value==='lg-dispatch' && (f.name==='订单类型' || f.name==='订单号') && dispatchNeedsOrderNo()) return true;
      if(pageId.value==='wh-prod-issue' && f.name==='领至线边仓'){
        return true;
      }
      // 流水码档案：建档时若物料信息有值，则相关物料字段条件必填
      if(pageId.value==='serial-arch'){
        const mat = String(formModel['物料信息']||'').trim();
        if(mat && mat !== '—' && ['物料批号','建档数量','当前数量','供应商信息','生产厂家','生产日期'].includes(f.name)) return true;
      }
      return !!f.required;
    }
    function isBatchFieldRequired(f){
      if(!f) return false;
      if(f.required) return true;
      const asSerial = pageId.value==='serial-arch' || (batchCtx && batchCtx.from==='wh-po-in');
      if(asSerial){
        const mat = String(batchForm['物料信息']||'').trim();
        if(mat && mat !== '—' && ['物料批号','建档数量','当前数量','供应商信息','生产厂家','生产日期'].includes(f.name)) return true;
      }
      return false;
    }
    function codeOf(s){
      return String(s||'').split(' / ')[0].trim();
    }
    function matListRow(code){
      const c = codeOf(code);
      return ((MOCK['mat-list']||{}).main||[]).find(x=> x['物料编码']===c) || null;
    }
    function joinMatInfoSlash(src){
      if(!src || typeof src!=='object') return '';
      const parts = ['物料编码','物料名称','物料规格','物料种类']
        .map(k=> String(src[k]==null ? '' : src[k]).trim())
        .filter(x=> x && x!=='—');
      if(parts.length) return parts.join('/');
      const t = String(src['物料信息']||'').trim();
      return t && t!=='—' ? t : '';
    }
    function matInfoText(src){
      let code = '', name = '', spec = '', kind = '';
      if(src && typeof src === 'object'){
        code = String(src['物料编码'] || src.编码 || src.code || '').trim();
        if(!code && src['物料信息']) code = codeOf(src['物料信息']);
        name = src['物料名称'] || src.名称 || src.name || '';
        spec = src['物料规格'] || src.规格 || src.spec || '';
        kind = src['物料种类'] || src.种类 || src.kind || '';
      } else {
        code = codeOf(src);
      }
      const m = matListRow(code);
      if(m){
        return [m['物料编码'], m['物料名称'], m['物料规格']||'—', m['物料种类']||'—'].join(' / ');
      }
      if(src && typeof src === 'object' && src['物料信息'] && String(src['物料信息']).split(' / ').filter(Boolean).length>=4){
        return String(src['物料信息']);
      }
      if(code && name) return [code, name, spec||'—', kind||'—'].join(' / ');
      if(src && typeof src === 'object' && src['物料信息']) return String(src['物料信息']);
      return code || '';
    }
    function matUnit(src, kind){
      const m = matListRow(typeof src==='object' ? (src['物料编码']||src.编码||src.code||src['物料信息']||'') : src);
      if(!m) return 'KG';
      if(kind==='so') return m['销售单位']||m['基本单位']||'KG';
      return m['采购单位']||m['基本单位']||'KG';
    }
    function matCodeInUse(code){
      const c = codeOf(code);
      if(!c) return false;
      const hitRow = (r)=>{
        if(!r || typeof r !== 'object') return false;
        if(r['物料编码']===c) return true;
        const mi = r['物料信息'];
        return !!(mi && codeOf(mi)===c);
      };
      const walk = (node)=>{
        if(!node) return false;
        if(Array.isArray(node)) return node.some(walk);
        if(typeof node === 'object'){
          if(hitRow(node)) return true;
          return Object.values(node).some(walk);
        }
        return false;
      };
      const mock = window.WMS_MOCK_ROWS || MOCK;
      return Object.entries(mock).some(([pid, val])=> pid!=='mat-list' && walk(val));
    }
    function applyMatUomQuery(rows, q){
      return (rows||[]).filter(r=>{
        const codeKw = String(q['物料编码']||'').trim();
        const nameKw = String(q['物料名称']||'').trim();
        if(codeKw && !String(r['物料编码']||'').includes(codeKw)) return false;
        if(nameKw && !String(r['物料名称']||'').includes(nameKw)) return false;
        return true;
      });
    }
    function sortMatUomRows(rows){
      return (rows||[]).slice().sort((a,b)=>{
        const c = String(a['物料编码']||'').localeCompare(String(b['物料编码']||''));
        if(c) return c;
        return String(a['创建时间']||'').localeCompare(String(b['创建时间']||''));
      });
    }
    function matUomInUse(row){
      const code = codeOf(row && row['物料编码']);
      const conv = String((row && row['换算单位'])||'').trim();
      if(!code || !conv) return false;
      const skip = new Set(['mat-list','mat-uom','unit']);
      const unitKeys = /单位$/;
      const hit = (r)=>{
        if(!r || typeof r !== 'object') return false;
        const rCode = r['物料编码'] ? codeOf(r['物料编码']) : (r['物料信息'] ? codeOf(r['物料信息']) : '');
        if(rCode !== code) return false;
        return Object.keys(r).some(k=> unitKeys.test(k) && String(r[k]||'').trim()===conv);
      };
      const walk = (node)=>{
        if(!node) return false;
        if(Array.isArray(node)) return node.some(walk);
        if(typeof node === 'object'){
          if(hit(node)) return true;
          return Object.values(node).some(walk);
        }
        return false;
      };
      const mock = window.WMS_MOCK_ROWS || MOCK;
      return Object.entries(mock).some(([pid, val])=> !skip.has(pid) && walk(val));
    }
    function fillMatUomFromMat(m){
      if(!m) return;
      formModel['物料编码'] = m['物料编码'] || '';
      formModel['物料名称'] = m['物料名称'] || '';
      formModel['物料规格'] = m['物料规格'] || '';
      formModel['物料种类'] = m['物料种类'] || '';
      formModel['基本单位'] = m['基本单位'] || formModel['基本单位'] || 'KG';
    }
    function ratioFieldKey(f, side) {
      if (!f) return side === 'left' ? '换算比例左' : '换算比例右';
      return side === 'left' ? (f.leftName || (f.name + '左')) : (f.rightName || (f.name + '右'));
    }
    function trimRatioNum(n) {
      if (!Number.isFinite(n)) return '';
      if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
      return String(parseFloat(n.toFixed(6)));
    }
    function matUomRatioPair(ratioVal) {
      const raw = String(ratioVal == null ? '' : ratioVal).trim();
      if (!raw || raw === '—' || raw === '-') return { left: '', right: '' };
      if (raw.includes(':') || raw.includes('：')) {
        const parts = raw.replace(/：/g, ':').split(':');
        if (parts.length === 2) return { left: parts[0].trim(), right: parts[1].trim() };
      }
      const r = Number(raw);
      if (!(r > 0)) return { left: '', right: '' };
      if (r >= 1) return { left: trimRatioNum(r), right: '1' };
      return { left: '1', right: trimRatioNum(1 / r) };
    }
    function formatMatUomRatioDisplay(ratioVal) {
      const pair = matUomRatioPair(ratioVal);
      if (!pair.left || !pair.right) return '—';
      return `${pair.left}：${pair.right}`;
    }
    function fillMatUomRatioFromStored(ratioVal) {
      const pair = matUomRatioPair(ratioVal);
      formModel['换算比例左'] = pair.left === '' ? undefined : Number(pair.left);
      formModel['换算比例右'] = pair.right === '' ? undefined : Number(pair.right);
    }
    function parseMatUomRatioFromForm() {
      const leftStr = String(formModel['换算比例左'] || '').trim();
      const rightStr = String(formModel['换算比例右'] || '').trim();
      if (!leftStr || !rightStr) return { ok: false, msg: '请填写换算比例' };
      const left = Number(leftStr);
      const right = Number(rightStr);
      if (!(left > 0) || !(right > 0)) return { ok: false, msg: '换算比例必须为大于 0 的数字' };
      return { ok: true, ratio: left / right };
    }
    /** 1 换算单位 = ratio 基本单位；未配置按 1:1。基本单位作中间单位。 */
    function convertMatQty(code, qty, fromU, toU){
      const n = Number(qty);
      if(!Number.isFinite(n)) return qty;
      const from = String(fromU||'').trim();
      const to = String(toU||'').trim();
      if(!from || !to || from===to) return n;
      const list = ((MOCK['mat-uom']||{}).main||[]).filter(r=> codeOf(r['物料编码'])===codeOf(code));
      const factorToBase = (u, hub)=>{
        if(u===hub) return 1;
        const row = list.find(r=> r['基本单位']===hub && r['换算单位']===u);
        if(row && Number(row['换算比例'])>0) return Number(row['换算比例']);
        const rev = list.find(r=> r['基本单位']===u && r['换算单位']===hub);
        if(rev && Number(rev['换算比例'])>0) return 1 / Number(rev['换算比例']);
        return 1;
      };
      const mat = matListRow(code);
      const hub = (list[0] && list[0]['基本单位']) || (mat && mat['基本单位']) || from;
      const qtyBase = n * factorToBase(from, hub);
      const toFactor = factorToBase(to, hub);
      return toFactor ? (qtyBase / toFactor) : qtyBase;
    }
    function applyMatListQuery(rows, q){
      return (rows||[]).filter(r=>{
        const codeKw = String(q['物料编码']||'').trim();
        const nameKw = String(q['物料名称']||'').trim();
        if(codeKw && !String(r['物料编码']||'').includes(codeKw)) return false;
        if(nameKw && !String(r['物料名称']||'').includes(nameKw)) return false;
        const specKw = String(q['物料规格']||'').trim();
        if(specKw && !String(r['物料规格']||'').includes(specKw)) return false;
        if(q['物料种类'] && r['物料种类']!==q['物料种类']) return false;
        if(q['启用状态'] && r['启用状态']!==q['启用状态']) return false;
        return true;
      });
    }
    function nowStamp(){
      const d = new Date();
      const pad = n => String(n).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    }
    function sortByCreateTimeDesc(rows){
      return (rows||[]).slice().sort((a,b)=> String(b['创建时间']||'').localeCompare(String(a['创建时间']||'')));
    }
    function envMonParseLimit(raw, kind){
      const s = String(raw==null?'':raw).trim();
      if(!s || s==='—' || s==='/' || s==='-') return null;
      const m = s.match(/^(≤|≥|<|>|<=|>=)?\s*(-?\d+(?:\.\d+)?)$/);
      if(!m) return null;
      let op = m[1] || (String(kind||'').charAt(0)==='L' ? '≥' : '≤');
      if(op==='<=') op='≤';
      if(op==='>=') op='≥';
      const n = Number(m[2]);
      if(!Number.isFinite(n)) return null;
      return { op, n };
    }
    function envMonOutOf(value, lim){
      if(!lim) return false;
      if(lim.op==='≤') return value > lim.n;
      if(lim.op==='<') return value >= lim.n;
      if(lim.op==='≥') return value < lim.n;
      if(lim.op==='>') return value <= lim.n;
      return false;
    }
    function envMonJudgeSpec(value, usl, lsl){
      const U = envMonParseLimit(usl, 'USL');
      const L = envMonParseLimit(lsl, 'LSL');
      if(!U && !L) return '合格';
      if(envMonOutOf(value, U) || envMonOutOf(value, L)) return '不合格';
      return '合格';
    }
    function envMonJudgeDev(value, ucl, lcl){
      const U = envMonParseLimit(ucl, 'UCL');
      const L = envMonParseLimit(lcl, 'LCL');
      if(!U && !L) return '/';
      if(envMonOutOf(value, U) || envMonOutOf(value, L)) return 'OOC';
      return '/';
    }
    function envMonLimitText(kind, raw){
      const s = String(raw==null?'':raw).trim();
      if(!s) return '';
      if(/^(≤|≥|<|>)/.test(s)) return s.replace(/^(≤|≥|<|>)\s*/, function(m){ return m.trim()+' '; });
      return (String(kind||'').charAt(0)==='L' ? '≥ ' : '≤ ') + s;
    }
    function envMonJudgeLine(line){
      if(!line) return;
      const raw = String(line['结果值']??'').trim();
      let spec = '', dev = '';
      if(/^\d+(\.\d+)?$/.test(raw) && Number(raw) > 0){
        const n = Number(raw);
        spec = envMonJudgeSpec(n, line.USL, line.LSL);
        dev = envMonJudgeDev(n, line.UCL, line.LCL);
      }
      if(line['监测结论']!==spec) line['监测结论'] = spec;
      if(line['偏差结论']!==dev) line['偏差结论'] = dev;
    }
    function envMonSchemeOf(monName){
      const mon = ((MOCK['np-0501-01']||{}).main||[]).find(r=> r['过程监测名称']===monName);
      if(!mon) return null;
      const scheme = ((MOCK['gather-scheme']||{}).main||[]).find(r=> r['采集方案编码']===mon['采集方案编码'] || r['采集方案名称']===mon['采集方案']);
      return { mon, scheme };
    }
    function envMonLastTime(monName, itemName, exceptId){
      const rows = ((MOCK['np-0502-01']||{}).main||[]).filter(r=> r['过程监测名称']===monName && r['采集项名称']===itemName && r.id!==exceptId && r['采集时间']);
      rows.sort((a,b)=> String(b['采集时间']||'').localeCompare(String(a['采集时间']||'')));
      return rows[0] ? rows[0]['采集时间'] : '';
    }
    function envMonLinesFor(monName, exceptId){
      const hit = envMonSchemeOf(monName);
      const lines = (hit && hit.scheme && hit.scheme._lines) || [];
      return lines.map((ln, i)=>{
        const line = {
          _i: i+1,
          采集项编码: ln['采集项编码']||'',
          采集项名称: ln['采集项名称']||'',
          采集频率: ln['采集频率']||'',
          上次采集时间: envMonLastTime(monName, ln['采集项名称'], exceptId),
          采集项单位: ln['采集项单位']||'',
          采集位置: ln['采集位置'] || (hit.mon && hit.mon['过程监测位置']) || '',
          结果值: '',
          监测结论: '',
          偏差结论: '',
          USL: envMonLimitText('USL', ln.USL),
          LSL: envMonLimitText('LSL', ln.LSL),
          UCL: envMonLimitText('UCL', ln.UCL),
          LCL: envMonLimitText('LCL', ln.LCL)
        };
        return line;
      });
    }
    const ENV_STAT_SERIES = {
      '釜温': [['2026-10-01 08:00:00','104'],['2026-10-02 08:00:00','103'],['2026-10-03 08:00:00','105'],['2026-10-04 08:00:00','102'],['2026-10-05 08:00:00','106'],['2026-10-06 08:00:00','103'],['2026-10-07 08:00:00','104'],['2026-10-08 08:00:00','101'],['2026-10-09 08:00:00','105'],['2026-10-10 08:00:00','102'],['2026-10-11 08:00:00','104'],['2026-10-12 08:00:00','103'],['2026-10-13 08:00:00','106'],['2026-10-14 08:00:00','101'],['2026-10-15 08:00:00','105'],['2026-10-15 10:00:00','103'],['2026-10-15 12:00:00','104'],['2026-10-15 14:00:00','102'],['2026-10-15 16:00:00','108'],['2026-10-15 16:20:00','82'],['2026-10-15 16:40:00','128']],
      '储罐液位': [['2026-10-01 09:00:00','58'],['2026-10-02 09:00:00','60'],['2026-10-03 09:00:00','55'],['2026-10-04 09:00:00','62'],['2026-10-05 09:00:00','57'],['2026-10-06 09:00:00','61'],['2026-10-07 09:00:00','54'],['2026-10-08 09:00:00','63'],['2026-10-09 09:00:00','59'],['2026-10-10 09:00:00','56'],['2026-10-11 09:00:00','64'],['2026-10-12 09:00:00','58'],['2026-10-13 09:00:00','60'],['2026-10-14 09:00:00','55'],['2026-10-15 09:00:00','62'],['2026-10-15 15:00:00','57'],['2026-10-14 11:05:00','60'],['2026-10-16 09:12:00','18']],
      '釜区环境温度': [['2026-10-08 08:00:00','22'],['2026-10-10 08:00:00','24'],['2026-10-11 08:00:00','21'],['2026-10-12 08:00:00','23'],['2026-10-13 08:30:00','23']]
    };
    const envStat = reactive({
      date: ['2026-10-01','2026-10-16'],
      name: '',
      items: [],
      queried: false,
      charts: [],
      rows: [],
      samples: [],
      sampleOpen: false,
      setOpen: false,
      rules: { spec:true, ctrl:true, warn:false, mode:'计算', dropEmpty:true },
      draft: { spec:true, ctrl:true, warn:false, mode:'计算', dropEmpty:true }
    });
    const BATCH_INSP = {
      'KRF-260911': { name:'KrF光刻胶树脂', code:'PR-RESIN-KRF', spec:'KrF', types:{ '采购来料检':[{ 单号:'BJ20260929001', 采样点:'原料库来料取样口', 复核结论:'', samples:[{ 编号:'YP260929001', 检验结论:'', 偏差结论:'' }] }] } },
      'PG-260911': { name:'PGMEA电子级溶剂', code:'SOL-PGMEA', spec:'光刻胶电子级', types:{ '采购来料检':[{ 单号:'IQC-PG-260911', 采样点:'溶剂库取样口', 复核结论:'合格', samples:[] }] } },
      'KRF-260912': { name:'正性KrF光刻胶', code:'PR-POS-KRF', spec:'KrF', types:{ '生产过程检':[{ 单号:'PP-KRF-260912', 采样点:'光刻胶配制取样口', 复核结论:'合格', samples:[{ 编号:'YP260929003', 检验结论:'', 偏差结论:'' }] }], '生产物料检':[{ 单号:'PM-KRF-260912', 采样点:'成品待检库', 复核结论:'合格', samples:[] }], '库内复检':[{ 单号:'WR-KRF-260912', 采样点:'成品库', 复核结论:'', samples:[] }] } },
      'KRF-260913': { name:'正性KrF光刻胶', code:'PR-POS-KRF', spec:'KrF', types:{ '生产过程检':[{ 单号:'PP-KRF-260913', 采样点:'分装线取样口', 复核结论:'合格', samples:[] }] } },
      'KRF-260914': { name:'正性KrF光刻胶', code:'PR-POS-KRF', spec:'KrF', types:{ '生产物料检':[{ 单号:'PM-KRF-260914', 采样点:'成品待检库', 复核结论:'合格', samples:[] }] } },
      'OLED-260901': { name:'HIL空穴注入材料', code:'OLED-HIL-001', spec:'OLED电子级', types:{ '采购来料检':[{ 单号:'BJ20260922001', 采样点:'原料库来料取样口', 复核结论:'合格', samples:[{ 编号:'YP260922003', 检验结论:'合格', 偏差结论:'' }] }] } },
      'EML-260908': { name:'绿光发光层材料', code:'OLED-EML-G01', spec:'高纯≥99.99%', types:{ '生产过程检':[{ 单号:'PP-EML-260908', 采样点:'OLED蒸镀取样口', 复核结论:'合格', samples:[] }] } },
      'EML-260915': { name:'绿光发光层材料', code:'OLED-EML-G01', spec:'高纯≥99.99%', types:{ '生产物料检':[{ 单号:'PM-EML-260915', 采样点:'成品待检库', 复核结论:'合格', samples:[] }] } }
    };
    const batchTrace = reactive({
      lot: 'KRF-260912',
      dirs: ['正向追溯', '反向追溯'],
      tab: '关系总览',
      scale: 1,
      full: false,
      selected: 'KRF-260912',
      collapsed: {},
      cols: [],
      relRows: [],
      setOpen: false,
      legend: { back:true, pin:true, forward:true },
      set: { forwardMax:'', backMax:'', '采购来料检':true, '生产过程检':true, '生产物料检':true, '库内复检':false, '通用检':false },
      draft: { forwardMax:'', backMax:'', '采购来料检':true, '生产过程检':true, '生产物料检':true, '库内复检':false, '通用检':false },
      showVal(v){ const s = String(v==null?'':v).trim(); return !!s && s!=='—' && s!=='/' && s!=='-'; },
      visibleCols(){
        return this.cols.filter(c=>{
          if(c.depth<0) return this.legend.back;
          if(c.depth>0) return this.legend.forward;
          return this.legend.pin;
        });
      },
      tree(){
        const no = this.selected || '';
        const hit = BATCH_INSP[no];
        const node = this.cols.flatMap(c=> c.nodes).find(n=> n.no===no);
        const info = { no, name: (hit&&hit.name) || (node&&node.name) || '', code: (hit&&hit.code) || (node&&node.code) || '', spec: (hit&&hit.spec) || '' };
        const order = ['采购来料检','生产过程检','生产物料检','库内复检','通用检'];
        const types = order.filter(t=> this.set[t] && hit && hit.types && hit.types[t] && hit.types[t].length).map(t=> ({ name:t, bills: hit.types[t] }));
        return { info, types };
      },
      query(){
        const start = String(this.lot||'').trim();
        if(!start){ ElMessage.warning('请输入批号'); return; }
        const rows = ((MOCK['np-0601-01']||{}).main)||[];
        const maxF = String(this.set.forwardMax||'').trim() ? Number(this.set.forwardMax) : 99;
        const maxB = String(this.set.backMax||'').trim() ? Number(this.set.backMax) : 99;
        const nodes = new Map();
        const cardOf = (no)=>{
          const asOut = rows.find(r=> r['产出批号']===no);
          const asIn = rows.find(r=> r['来源批号']===no);
          const src = asOut || asIn || {};
          const side = asOut ? '产出' : '来源';
          return { name: src[side+'物料名称'] || '未建档批号', code: src[side+'物料编码'] || '', spec: src[side+'物料规格'] || '' };
        };
        const add = (no, depth, event)=>{
          if(nodes.has(no)) return;
          nodes.set(no, Object.assign({ no, depth, event: event||'' }, cardOf(no)));
        };
        add(start, 0, '');
        const walk = (dir, max)=>{
          let frontier = [start];
          const seen = new Set([start]);
          for(let step=0; step<max; step++){
            const next = [];
            frontier.forEach(from=>{
              if(this.collapsed[from]) return;
              rows.forEach(r=>{
                const src = dir==='f' ? r['来源批号'] : r['产出批号'];
                const dst = dir==='f' ? r['产出批号'] : r['来源批号'];
                if(src!==from || !dst || seen.has(dst)) return;
                seen.add(dst);
                const parent = nodes.get(from);
                add(dst, dir==='f' ? parent.depth+1 : parent.depth-1, r['事件类型']||'');
                next.push(dst);
              });
            });
            if(!next.length) break;
            frontier = next;
          }
        };
        if(this.dirs.includes('正向追溯')) walk('f', maxF);
        if(this.dirs.includes('反向追溯')) walk('b', maxB);
        nodes.forEach(n=>{
          const dir = n.depth<0 ? 'b' : 'f';
          const kids = rows.filter(r=> (dir==='f' ? r['来源批号'] : r['产出批号'])===n.no).map(r=> dir==='f' ? r['产出批号'] : r['来源批号']);
          n.kidCount = new Set(kids.filter(Boolean)).size;
        });
        const depths = [...new Set([...nodes.values()].map(n=> n.depth))].sort((a,b)=> a-b);
        this.cols = depths.map(d=> ({ depth:d, event: ([...nodes.values()].find(n=> n.depth===d)||{}).event || '', nodes: [...nodes.values()].filter(n=> n.depth===d) }));
        if(!nodes.has(this.selected)) this.selected = start;
        const nos = new Set(nodes.keys());
        this.relRows = rows.filter(r=> nos.has(r['来源批号']) || nos.has(r['产出批号']));
      },
      reset(){
        this.lot = '';
        this.dirs = ['正向追溯','反向追溯'];
        this.cols = [];
        this.relRows = [];
        this.selected = '';
        this.collapsed = {};
        this.scale = 1;
      },
      pick(n){ this.selected = n.no; },
      toggle(n){ this.collapsed[n.no] = !this.collapsed[n.no]; this.query(); },
      expandAll(){ this.collapsed = {}; this.query(); },
      relayout(){ this.scale = 1; this.collapsed = {}; this.selected = String(this.lot||'').trim(); this.query(); },
      zoom(d){ this.scale = Math.min(1.8, Math.max(0.5, Math.round((this.scale+d)*10)/10)); },
      focus(kind){
        const start = String(this.lot||'').trim();
        let no = start;
        if(kind==='上溯'){
          const left = this.cols.filter(c=> c.depth<0);
          no = left.length && left[0].nodes[0] ? left[0].nodes[0].no : start;
        } else if(kind==='下溯'){
          const right = this.cols.filter(c=> c.depth>0);
          const last = right[right.length-1];
          no = last && last.nodes[0] ? last.nodes[0].no : start;
        }
        this.selected = no;
        nextTick(()=>{
          const el = document.querySelector('.batch-card[data-no="'+no+'"]');
          if(el) el.scrollIntoView({ inline:'center', block:'nearest' });
        });
      },
      openSet(){ this.draft = JSON.parse(JSON.stringify(this.set)); this.setOpen = true; },
      saveSet(){
        const fm = String(this.draft.forwardMax||'').trim();
        const bm = String(this.draft.backMax||'').trim();
        if(fm && !/^[1-9]\d*$/.test(fm)){ ElMessage.warning('正向追溯最大级请填写正整数'); return; }
        if(bm && !/^[1-9]\d*$/.test(bm)){ ElMessage.warning('反向追溯最大级请填写正整数'); return; }
        this.set = JSON.parse(JSON.stringify(this.draft));
        this.setOpen = false;
        if(String(this.lot||'').trim()) this.query();
      },
      openSample(no){
        envMonRelPending = { page:'ledger', field:'样品编号', value: no };
        loadPage('ledger');
      }
    });
