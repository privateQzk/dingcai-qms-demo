// 样品检验台账·检验详情数据推导（pc.html 与 insp-cockpit.html 共用，勿各自改写）
window.WMS_LEDGER_INSP = (function(){
function ledgerInspMaster(){
      return ((((window.WMS_MOCK_ROWS||{})['insp-project']||{})['tab-item'])||[]).filter(r=> r && r['启用状态']!=='停用' && r['检验项名称']);
    }
    function ledgerInspNames(row){
      const split = t=> String(t||'').split(/[;；]/).map(s=> s.trim()).filter(s=> s && s!=='—');
      return split(row && row['方案项目']).map(n=> ({ name:n, src:'方案项目' }))
        .concat(split(row && row['临时项目']).map(n=> ({ name:n, src:'临时项目' })));
    }
    const ledgerInspCache = new WeakMap();
    function ledgerInspSig(row){
      return [row && row['样品状态'], row && row['检验结论'], row && row['方案项目'], row && row['临时项目'], row && row.id].join('|');
    }
    function ledgerSeed(row){
      const s = String((row && (row.id || row['样品编号'])) || '');
      let h = 0;
      for(let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
      return h;
    }
    function ledgerItemSpec(name, typ){
      const known = {
        'HPLC纯度': { USL:'—', LSL:'99.50', UCL:'—', LCL:'99.70', UWL:'—', LWL:'99.80', 指标:'≥99.50%', good:'99.92', oos:'97.20', ooc:'99.62', oow:'99.75' },
        '残留溶剂PGMEA': { USL:'0.50', LSL:'—', UCL:'0.30', LCL:'—', UWL:'0.20', LWL:'—', 指标:'≤0.50%', good:'0.08', oos:'0.82', ooc:'0.41', oow:'0.25' }
      };
      if(known[name]) return known[name];
      if(typ==='定性') return { USL:'—', LSL:'—', UCL:'—', LCL:'—', UWL:'—', LWL:'—', 指标:'无色至浅黄色、澄清', good:'符合', oos:'不符合', ooc:'不符合', oow:'不符合' };
      return { USL:'100', LSL:'98.0', UCL:'99.8', LCL:'98.5', UWL:'99.5', LWL:'99.0', 指标:'98.0～100', good:'99.20', oos:'96.20', ooc:'98.20', oow:'98.80' };
    }
    function ledgerDevCode(row, idx, typ){
      if(!row || row['样品状态']!=='已完成') return '';
      const jc = row['检验结论'];
      if(jc!=='不合格' && jc!=='异常') return '';
      const h = ledgerSeed(row);
      if(jc==='不合格'){
        if(idx===0) return 'OOS';
        if(typ==='定性' && (h + idx) % 2 === 0) return 'OOS';
        return ['OOS','OOC','OOW',''][(h + idx) % 4];
      }
      if(idx===0) return typ==='定性' ? 'OOW' : 'OOC';
      if(typ==='定性') return (h + idx) % 2 === 0 ? 'OOW' : '';
      return ['OOC','OOW',''][(h + idx) % 3];
    }
    function ledgerLimitText(it, code){
      if(it['检验项类型']==='定性'){
        const s = it['指标'];
        return s && s!=='—' ? s : '符合';
      }
      const map = { OOS:['USL','LSL'], OOC:['UCL','LCL'], OOW:['UWL','LWL'] };
      const pair = map[code] || ['USL','LSL'];
      const parts = [];
      if(it[pair[0]] && it[pair[0]]!=='—') parts.push('≤'+it[pair[0]]);
      if(it[pair[1]] && it[pair[1]]!=='—') parts.push('≥'+it[pair[1]]);
      return parts.join(', ') || '—';
    }
    function ledgerInspItems(row){
      if(row && Array.isArray(row._insp) && row._insp.length) return row._insp;
      const sig = ledgerInspSig(row);
      const cached = row && ledgerInspCache.get(row);
      if(cached && cached.sig===sig) return cached.items;
      const byName = {};
      ledgerInspMaster().forEach(m=> { byName[m['检验项名称']] = m; });
      const names = ledgerInspNames(row);
      const st = row && row['样品状态'];
      // 样品状态与检验项结果一致：待检验=全部未检；检验中=约六成项已出结果；已完成=全部有结果
      const runFill = st==='检验中' ? Math.floor(names.length * 0.6) : 0;
      const items = names.map((it, idx)=>{
        const m = byName[it.name] || {};
        const typ = m['检验项类型'] || (it.name==='外观色泽' ? '定性' : '定量');
        const spec = ledgerItemSpec(it.name, typ);
        const code = ledgerDevCode(row, idx, typ);
        const hasRes = st==='已完成' ? true : (st==='检验中' ? idx < runFill : false);
        const shown = !hasRes ? '' : (code ? spec[code==='OOS' ? 'oos' : code==='OOC' ? 'ooc' : 'oow'] : spec.good);
        const conclusion = !hasRes ? '—' : (code==='OOS' ? '不合格' : '合格');
        const lim = k=> (spec[k] && spec[k]!=='—') ? spec[k] : '—';
        return {
          项目来源: it.src,
          检验项编码: m['检验项编码'] || '—',
          检验项名称: it.name,
          检验项类型: typ,
          检验项单位: m['检验项单位'] || (typ==='定性' ? '—' : '%'),
          所属检验类: m['所属检验类'] || '—',
          检验结果: typ==='定性' ? shown : '',
          检验结果值: typ==='定量' ? shown : '',
          检验报出值: typ==='定量' ? shown : '',
          检验结论: conclusion,
          偏差结论: code || '—',
          指标: spec.指标 || '—',
          异常报送: '—',
          USL: lim('USL'), LSL: lim('LSL'), UCL: lim('UCL'), LCL: lim('LCL'), UWL: lim('UWL'), LWL: lim('LWL'),
          检出限: m['检出限D.L'] || '—'
        };
      });
      if(row) ledgerInspCache.set(row, { sig, items });
      return items;
    }
    const LEDGER_ABN_ORDER = ['定性OOS','定性OOC','定性OOW','OOS','OOC','OOW'];
    function ledgerAbnView(row){
      const empty = { tag:'', text:'', groups:[] };
      if(!row || row['样品状态']!=='已完成') return empty;
      const hit = ledgerInspItems(row).filter(it=> ['OOS','OOC','OOW'].includes(it['偏差结论']));
      if(!hit.length) return empty;
      const rank = { OOS:3, OOC:2, OOW:1 };
      const tag = hit.slice().sort((a,b)=> rank[b['偏差结论']] - rank[a['偏差结论']])[0]['偏差结论'];
      const buckets = {};
      hit.forEach(it=>{
        const key = (it['检验项类型']==='定性' ? '定性' : '') + it['偏差结论'];
        (buckets[key] = buckets[key] || []).push(it);
      });
      const groups = LEDGER_ABN_ORDER.filter(k=> buckets[k]).map(k=>{
        const code = k.replace(/^定性/, '');
        return {
          key: k,
          code,
          count: 1,
          sample: row['样品编号'] || '—',
          rows: buckets[k].map(it=> ({
            name: it['检验项名称'],
            value: it['检验项类型']==='定性' ? (it['检验结果'] || '—') : (it['检验报出值'] || it['检验结果值'] || '—'),
            spec: ledgerLimitText(it, code),
            bad: true
          }))
        };
      });
      return { tag, text: groups.map(g=> g.key).join(','), groups };
    }
    function ledgerDevTag(row){ return ledgerAbnView(row).tag; }
    function ledgerAbnText(row){ return ledgerAbnView(row).text; }
    function ledgerAbnGroups(row){ return ledgerAbnView(row).groups; }
    function buildLedgerInspDemo(row){
      const opUser = row?.['检验人'] && row['检验人'] !== '—' ? row['检验人'] : '管理员';
      const opTime = row?.['检验完成时间'] && row['检验完成时间'] !== '—' ? row['检验完成时间'] : (row?.['取样时间'] || '');
      const items = ledgerInspItems(row);
      const qual = items.filter(it=> it['检验项类型']==='定性');
      const quant = items.filter(it=> it['检验项类型']!=='定性');
      const groups = [];
      items.forEach(it=>{
        const cat = it['所属检验类'] || '—';
        let g = groups.find(x=> x.检验类===cat);
        if(!g){
          g = { 检验类: cat, items: [], mats: [], 内容说明: '', 附件: [] };
          groups.push(g);
        }
        g.items.push({
          检验项类型: it['检验项类型'],
          检验项名称: it['检验项名称'],
          检验结果: it['检验项类型']==='定性' ? (it['检验结果']||'—') : (it['检验报出值']||it['检验结果值']||'—'),
          检验结论: it['检验结论'] || '—',
          指标: it['指标'] || '—',
          偏差结论: it['偏差结论'] || '—',
          操作人: opUser,
          操作时间: opTime || '—',
          备注: ''
        });
      });
      return { qual, quant, raw: groups };
    }
  return { ledgerInspMaster, ledgerInspNames, ledgerInspItems, ledgerAbnView, ledgerDevTag, ledgerAbnText, ledgerAbnGroups, buildLedgerInspDemo, ledgerLimitText, ledgerDevCode, ledgerItemSpec };
})();
var ledgerInspItems = window.WMS_LEDGER_INSP.ledgerInspItems;
var ledgerAbnView = window.WMS_LEDGER_INSP.ledgerAbnView;
var ledgerDevTag = window.WMS_LEDGER_INSP.ledgerDevTag;
var ledgerAbnText = window.WMS_LEDGER_INSP.ledgerAbnText;
var ledgerAbnGroups = window.WMS_LEDGER_INSP.ledgerAbnGroups;
var buildLedgerInspDemo = window.WMS_LEDGER_INSP.buildLedgerInspDemo;
