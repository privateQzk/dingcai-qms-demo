
const { createApp, ref, computed, reactive, watch, onMounted, onBeforeUnmount, nextTick } = Vue;
const { ElMessage } = ElementPlus;
if (typeof VXETable !== 'undefined') {
  VXETable.setConfig({ zIndex: 2500, table: { border: true, showOverflow: 'tooltip', rowConfig: { isHover: true } } });
}
const MENU_ICON_PATHS = {
  database: 'M4 6h16v3H4V6zm0 5h16v3H4v-3zm0 5h16v3H4v-3z M6 6v12 M18 6v12',
  grid: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  truck: 'M3 7h11v10H3V7zm11 3h4l3 3v4h-7V10zM6 19a2 2 0 100-4 2 2 0 000 4zm11 0a2 2 0 100-4 2 2 0 000 4z',
  qr: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 2h2v2h-2v-2zm4-2h2v6h-6v-2h4v-4z',
};
const MenuIcon = {
  name: 'MenuIcon', props: { name: { type: String, required: true } },
  template: '<svg class="menu-icon" viewBox="0 0 24 24" stroke-width="1.5" aria-hidden="true"><path :d="MENU_ICON_PATHS[name]||MENU_ICON_PATHS.grid" /></svg>',
  setup(){ return { MENU_ICON_PATHS }; }
};
/** VXE CDN 在部分环境无法挂载全局；统一用 Element Plus 表格保证列表与行操作可用 */
const DemoVxeGrid = {
  name: 'DemoVxeGrid',
  props: { data:{type:Array,default:()=>[]}, columns:{type:Array,default:()=>[]}, selectedIds:{type:Array,default:()=>[]}, emptyText:{type:String,default:'暂无数据'}, devRule:{type:Object,default:null} },
  emits: ['update:selectedIds'],
  template: `<div ref="wrapRef" class="demo-vxe-wrap">
    <el-table v-if="data.length" ref="gridRef" class="demo-vxe-grid demo-el-fallback" :data="data"
      border stripe row-key="id" style="width:100%" :height="gridHeight" :header-cell-style="headerStyle" :cell-style="cellStyle"
      :header-cell-class-name="headerCellClass" @selection-change="onSelectionChange">
      <template v-for="(col, idx) in displayColumns" :key="colKey(col, idx)">
        <el-table-column v-if="col.type==='checkbox'" type="selection" width="48" fixed="left" />
        <el-table-column v-else-if="col.type==='seq'" type="index" :label="col.title||'序号'" :width="col.width||60" fixed="left" />
        <el-table-column v-else-if="col.children" :label="col.title" align="center">
          <el-table-column v-for="ch in col.children" :key="ch.field" :prop="ch.field" :label="ch.title" :min-width="ch.minWidth||90" :align="ch.align||'center'" header-align="center" show-overflow-tooltip />
        </el-table-column>
        <el-table-column v-else :prop="col.field" :label="col.title" :width="col.width||undefined" :min-width="col.minWidth||(col.width?undefined:100)"
          :fixed="col.fixed||false" :align="col.align||'left'" :show-overflow-tooltip="!(col.noTooltip || slotName(col)==='arrow_detail')">
          <template v-if="headerSlotName(col) || col.diag || col.tip" #header>
            <slot v-if="headerSlotName(col)" :name="headerSlotName(col)" :column="slotColumn(col)"></slot>
            <template v-else-if="col.diag"><span class="demo-diag__tr">{{ col.diag[0] }}</span><span class="demo-diag__bl">{{ col.diag[1] }}</span></template>
            <span v-else class="demo-col-tip">{{ col.title }}
              <el-popover :visible="!!colTipOpen[col.field]" placement="top" :width="380" trigger="manual" :teleported="true" :persistent="true" popper-class="demo-form-tip-popper">
                <template #reference><button type="button" class="demo-form-help" aria-label="列说明" @click.stop.prevent="toggleColTip(col.field)">?</button></template>
                <div class="demo-form-tip" @click.stop>
                  <button type="button" class="demo-form-tip__close" aria-label="关闭" @click.stop="colTipOpen[col.field]=false">×</button>
                  <div class="demo-form-tip__title">说明：</div>
                  <div class="demo-form-tip__body">{{ col.tip }}</div>
                </div>
              </el-popover>
            </span>
          </template>
          <template v-if="slotName(col)" #default="scope">
            <slot :name="slotName(col)" :row="scope.row" :column="slotColumn(col)"></slot>
          </template>
        </el-table-column>
      </template>
    </el-table>
    <el-empty v-else :description="emptyText" />
  </div>`,
  setup(props,{emit}){
    const gridRef=ref(null), wrapRef=ref(null), gridHeight=ref(280);
    const colTipOpen=reactive({});
    function toggleColTip(field){
      const next=!colTipOpen[field];
      Object.keys(colTipOpen).forEach(k=>{ colTipOpen[k]=false; });
      colTipOpen[field]=next;
    }
    let ro=null;
    const headerStyle={ background:'#FAFAFA', color:'#262626', fontWeight:'500' };
    function cellStyle({ row, column }){
      const base = { padding:'4px 0' };
      const rule = props.devRule;
      if(!rule) return base;
      const spec = column.property==='UCL相对偏差'
        ? { op: rule.uclOp, limit: rule.ucl }
        : (column.property==='LCL相对偏差' ? { op: rule.lclOp, limit: rule.lcl } : null);
      if(!spec || !spec.op || spec.limit==null || spec.limit==='') return base;
      const n = parseFloat(String(row[column.property]||'').replace('%',''));
      const t = parseFloat(String(spec.limit).replace('%',''));
      const hit = !isNaN(n) && !isNaN(t) && (spec.op==='<' ? n < t : n <= t);
      if(hit) return Object.assign(base, { background:'#F8D0D0', color:'#C45656' });
      return base;
    }
    const displayColumns=computed(()=> (props.columns||[]).filter(Boolean));
    function colKey(col, idx){
      if(col.children) return 'g'+idx+':'+col.title+':'+col.children.map(ch=> ch.title).join(',');
      return col.field || col.type || ('c'+idx);
    }
    function slotName(col){ return (col && col.slots && col.slots.default) || col.slot || ''; }
    function headerSlotName(col){ return (col && col.slots && col.slots.header) || ''; }
    function slotColumn(col){ return { field: col.field, title: col.title, property: col.field }; }
    function headerCellClass({ column }){
      return (props.columns||[]).some(c=> c && c.diag && c.field===column.property) ? 'demo-diag-th' : '';
    }
    function onSelectionChange(rows){ emit('update:selectedIds', (rows||[]).map(r=>r.id)); }
    function updateH(){ if(!wrapRef.value)return; gridHeight.value=Math.max(200, wrapRef.value.clientHeight||280); }
    onMounted(()=>{ updateH(); ro=new ResizeObserver(updateH); if(wrapRef.value)ro.observe(wrapRef.value); window.addEventListener('resize',updateH); });
    onBeforeUnmount(()=>{ ro?.disconnect(); window.removeEventListener('resize',updateH); });
    return {gridRef,wrapRef,gridHeight,headerStyle,cellStyle,displayColumns,colKey,slotName,headerSlotName,slotColumn,headerCellClass,onSelectionChange,colTipOpen,toggleColTip};
  }
};

const DictTypeTreeNodes = {
  name: 'DictTypeTreeNodes',
  props: {
    nodes: { type: Array, default: () => [] },
    activeId: String,
    collapsed: { type: Object, default: () => ({}) },
    editable: { type: Boolean, default: true },
  },
  emits: ['select', 'edit', 'remove', 'toggle'],
  template: `<div>
    <div v-for="n in nodes" :key="n.id">
      <div class="dict-type-node" :class="{ 'is-active': !n.分组节点 && activeId===n.id, 'is-group': !!n.分组节点 }" @click="$emit('select', n)">
        <span class="dict-type-node__arrow" :class="{ 'is-leaf': !(n.children && n.children.length), 'is-collapsed': collapsed[n.id] }" @click.stop="$emit('toggle', n)">▸</span>
        <span class="dict-type-node__name">{{ n.名称 }}</span>
        <span v-if="editable" class="dict-type-node__ops" @click.stop>
          <el-button link type="primary" size="small" @click="$emit('edit', n)">编辑</el-button>
          <el-button link type="danger" size="small" @click="$emit('remove', n)">删除</el-button>
        </span>
      </div>
      <div v-if="n.children && n.children.length && !collapsed[n.id]" class="dict-type-children">
        <dict-type-tree-nodes :nodes="n.children" :active-id="activeId" :collapsed="collapsed" :editable="editable" @select="$emit('select', $event)" @toggle="$emit('toggle', $event)" @edit="$emit('edit', $event)" @remove="$emit('remove', $event)"></dict-type-tree-nodes>
      </div>
    </div>
  </div>`
};

const CFG = window.WMS_PAGE_CONFIGS || { menu:[], pages:{} };
const MOCK = window.WMS_MOCK_ROWS || {};
/** GC / LC 台账页（np-0208-04 / np-0208-05）与默认演示 TR 列 */
const CHROM_LEDGER_PAGES = { 'np-0208-04': 'GC', 'np-0208-05': 'LC' };
const CHROM_LEDGER_RT_LIST = ['1.142','2.142','3.142','4.142','5.156','7.652','8.186'];
/** 标定：按标定模板生成测试数据结构，并按计算公式 / 结果值参考参数计算单人结果 */
const CALIB_HELP = {
  groups(tpl){
    if(!tpl) return [];
    return [['env','环境参数','是否记录环境','_envFields'],['dev','设备信息','是否记录设备','_devFields'],['std','标定物信息','是否记录标定物','_stdFields']]
      .filter(g=> tpl[g[2]]==='是' && (tpl[g[3]]||[]).length)
      .map(g=> ({ key:g[0], label:g[1], fields:tpl[g[3]] }));
  },
  sampCols(tpl){ return tpl && tpl['是否使用样本参数']==='是' ? Math.max(1, parseInt(tpl['样本测试次数'], 10) || 1) : 0; },
  pubCols(tpl){
    if(!tpl || tpl['是否使用公用参数']!=='是') return 0;
    return tpl['公用测试次数']==='同测试次数' ? (CALIB_HELP.sampCols(tpl) || 1) : 1;
  },
  matrices(tpl){
    const out = [];
    const pc = CALIB_HELP.pubCols(tpl), sc = CALIB_HELP.sampCols(tpl);
    if(pc && (tpl._pubParams||[]).length) out.push({ key:'pub', label:'公共参数', cols:pc, params:tpl._pubParams });
    if(sc && (tpl._sampParams||[]).length) out.push({ key:'samp', label:'样本参数', cols:sc, params:tpl._sampParams });
    return out;
  },
  ensure(tpl, data){
    data = data || {};
    ['env','dev','std','pub','samp'].forEach(k=>{ if(!data[k] || typeof data[k]!=='object') data[k] = {}; });
    CALIB_HELP.groups(tpl).forEach(g=> g.fields.forEach(f=>{ if(data[g.key][f['字段名称']]==null) data[g.key][f['字段名称']] = ''; }));
    CALIB_HELP.matrices(tpl).forEach(mx=> mx.params.forEach(p=>{
      const arr = Array.isArray(data[mx.key][p['参数编码']]) ? data[mx.key][p['参数编码']] : [];
      while(arr.length < mx.cols) arr.push('');
      data[mx.key][p['参数编码']] = arr;
    }));
    if(data['备注']==null) data['备注'] = '';
    return data;
  },
  unit(p){
    const hit = (((MOCK['insp-method']||{})['tab-param'])||[]).find(x=> x['参数编码']===p['参数编码']);
    const u = hit ? (hit['参数单位']||'') : '';
    return u==='—' ? '' : u;
  },
  bySymbol(tpl, sym){
    for(const key of ['samp','pub']){
      const p = ((key==='samp' ? tpl._sampParams : tpl._pubParams)||[]).find(x=> x['参数代号']===sym);
      if(p) return { p, key };
    }
    return null;
  },
  cell(tpl, data, p, key, i, depth){
    if((depth||0) > 8) return NaN;
    if(p['计算公式']){
      const expr = String(p['计算公式']).replace(/^=/, '').replace(/\{([^}]+)\}/g, (_, sym)=>{
        const hit = CALIB_HELP.bySymbol(tpl, sym);
        const v = hit ? CALIB_HELP.cell(tpl, data, hit.p, hit.key, i, (depth||0)+1) : NaN;
        return Number.isFinite(v) ? '(' + v + ')' : 'NaN';
      });
      if(!/^[\d.+\-*/()\seNa]*$/.test(expr)) return NaN;
      try{ const v = Function('return (' + expr + ')')(); return Number.isFinite(v) ? v : NaN; }catch(e){ return NaN; }
    }
    const cols = key==='pub' ? CALIB_HELP.pubCols(tpl) : CALIB_HELP.sampCols(tpl);
    const raw = (((data||{})[key]||{})[p['参数编码']]||[])[Math.min(i, cols-1)];
    if(raw==='' || raw==null) return NaN;
    const v = Number(raw);
    return Number.isFinite(v) ? v : NaN;
  },
  refValues(tpl, data){
    if(!tpl) return [];
    for(const mx of CALIB_HELP.matrices(tpl)){
      const p = mx.params.find(x=> x['参数名称']===tpl['结果值参考参数']);
      if(p) return Array.from({ length: mx.cols }, (_, i)=> CALIB_HELP.cell(tpl, data, p, mx.key, i));
    }
    return [];
  },
  stats(vals){
    if(!vals.length || vals.some(v=> !Number.isFinite(v))) return null;
    const avg = vals.reduce((s,v)=> s+v, 0) / vals.length;
    if(!avg) return null;
    return { avg: avg.toFixed(4), rr: ((Math.max(...vals) - Math.min(...vals)) / Math.abs(avg) * 100).toFixed(2) };
  },
  pass(rr, sym, std){
    const a = parseFloat(rr), b = parseFloat(std);
    if(!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return (sym==='＜' || sym==='<') ? a < b : a <= b;
  },
  stdText(sym, std){ return (std!=='' && std!=null) ? (sym||'≤') + std + '%' : ''; },
  result(tpl, data){
    const s = tpl ? CALIB_HELP.stats(CALIB_HELP.refValues(tpl, data)) : null;
    if(!s) return { 平均值:'', 相对极差:'', 测试结论:'' };
    return { 平均值: s.avg, 相对极差: s.rr + '%', 测试结论: CALIB_HELP.pass(s.rr, tpl['单人极差符号'], tpl['单人测试相对极差合格标准']) ? '成功' : '失败' };
  },
  fmt(v){ return Number.isFinite(v) ? String(+v.toFixed(5)) : ''; },
  enumOpts(f){ return String(f['枚举内容']||'').split(',').map(s=> s.trim()).filter(Boolean); }
};
const CalibTestBody = {
  name: 'CalibTestBody',
  props: { test:{ type:Object, required:true }, tpl:{ type:Object, default:null }, method:{ type:String, default:'' }, readonly:Boolean },
  template: `<div class="calib-body">
    <div class="tpl-calc-block__title">方法依据</div>
    <el-input :model-value="method" type="textarea" :rows="2" disabled placeholder="自动代入，根据试液编码"></el-input>
    <template v-for="g in H.groups(tpl)" :key="g.key">
      <div class="tpl-calc-block__title lab-prep-sec">{{ g.label }}</div>
      <el-form label-width="130px" class="demo-form">
        <div class="demo-form-grid demo-form-grid--cols-3">
          <el-form-item v-for="f in g.fields" :key="g.key + f['字段名称']" :label="f['字段名称']" :required="f['是否必填']==='必填'">
            <el-select v-if="f['字段属性']==='枚举'" v-model="test.data[g.key][f['字段名称']]" :disabled="readonly" clearable placeholder="请选择" style="width:100%">
              <el-option v-for="o in H.enumOpts(f)" :key="o" :label="o" :value="o"></el-option>
            </el-select>
            <el-input v-else v-model="test.data[g.key][f['字段名称']]" :disabled="readonly" placeholder="请输入"></el-input>
          </el-form-item>
        </div>
      </el-form>
    </template>
    <div class="tpl-calc-block__title lab-prep-sec">标定记录</div>
    <div v-for="mx in H.matrices(tpl)" :key="mx.key" class="calib-mx">
      <div class="calib-mx__title">{{ mx.label }}</div>
      <table class="calib-mx__table">
        <thead><tr>
          <th class="calib-mx__diag"><span class="calib-mx__tr">测试次数</span><span class="calib-mx__bl">参数名称</span></th>
          <th v-for="i in mx.cols" :key="i">第{{ i }}次</th>
        </tr></thead>
        <tbody><tr v-for="p in mx.params" :key="p['参数编码']">
          <td class="calib-mx__name">{{ p['参数名称'] }}{{ H.unit(p) ? '，' + H.unit(p) : '' }}<span v-if="p['计算公式']" class="calib-mx__fx">公式</span></td>
          <td v-for="i in mx.cols" :key="i">
            <span v-if="p['计算公式']" class="calib-mx__calc">{{ H.fmt(H.cell(tpl, test.data, p, mx.key, i-1)) || '自动计算' }}</span>
            <el-input v-else v-model="test.data[mx.key][p['参数编码']][i-1]" :disabled="readonly" size="small" placeholder="输入"></el-input>
          </td>
        </tr></tbody>
      </table>
    </div>
    <div class="tpl-calc-block__title lab-prep-sec">测试结果</div>
    <el-form label-width="180px" class="demo-form">
      <div class="demo-form-grid">
        <el-form-item label="平均值" required><el-input :model-value="res.平均值" disabled placeholder="自动计算"></el-input></el-form-item>
        <el-form-item label="相对极差" required><el-input :model-value="res.相对极差" disabled placeholder="自动计算"></el-input></el-form-item>
        <el-form-item label="测试结论" required><el-input :model-value="res.测试结论" disabled placeholder="自动判断，成功或失败"></el-input></el-form-item>
        <el-form-item label="单人测试相对极差合格标准"><el-input :model-value="H.stdText(tpl && tpl['单人极差符号'], tpl && tpl['单人测试相对极差合格标准'])" disabled></el-input></el-form-item>
        <el-form-item label="备注" class="span-2"><el-input v-model="test.data['备注']" :disabled="readonly" placeholder="输入"></el-input></el-form-item>
      </div>
    </el-form>
  </div>`,
  setup(props){
    const res = Vue.computed(()=> CALIB_HELP.result(props.tpl, props.test.data));
    return { H: CALIB_HELP, res };
  }
};
const STORE = window.WMS_DEMO_STORE;
const MAT_LIST_SEED = JSON.parse(JSON.stringify((((MOCK['mat-list'] || {}).main) || [])));
const CUSTOMER_SEED = JSON.parse(JSON.stringify((((MOCK.customer || {}).main) || [])));
const SUPPLIER_SEED = JSON.parse(JSON.stringify((((MOCK.supplier || {}).main) || [])));
const UNIT_SEED = JSON.parse(JSON.stringify((((MOCK.unit || {}).main) || [])));
if(STORE) STORE.hydrateMock(MOCK);
(function ensureMatListSeed(){
  if(!MOCK['mat-list']) MOCK['mat-list'] = { main: [] };
  let live = Array.isArray(MOCK['mat-list'].main) ? MOCK['mat-list'].main : [];
  let changed = false;
  if(!live.length && MAT_LIST_SEED.length){
    live = JSON.parse(JSON.stringify(MAT_LIST_SEED));
    changed = true;
  } else {
    const have = new Set(live.map(function(r){ return String((r && r['物料编码']) || '').trim(); }).filter(Boolean));
    MAT_LIST_SEED.forEach(function(r){
      const code = String((r && r['物料编码']) || '').trim();
      if(!code || have.has(code)) return;
      live.push(JSON.parse(JSON.stringify(r)));
      have.add(code);
      changed = true;
    });
  }
  MOCK['mat-list'].main = live;
  if(changed && STORE && STORE.saveMock) STORE.saveMock(MOCK);
})();
(function ensureCustomerSeed(){
  if(!MOCK.customer) MOCK.customer = { main: [] };
  let live = Array.isArray(MOCK.customer.main) ? MOCK.customer.main : [];
  let changed = false;
  if(!live.length && CUSTOMER_SEED.length){
    live = JSON.parse(JSON.stringify(CUSTOMER_SEED));
    changed = true;
  } else {
    const have = new Set(live.map(function(r){ return String((r && r['客户编码']) || '').trim(); }).filter(Boolean));
    CUSTOMER_SEED.forEach(function(r){
      const code = String((r && r['客户编码']) || '').trim();
      if(!code || have.has(code)) return;
      live.push(JSON.parse(JSON.stringify(r)));
      have.add(code);
      changed = true;
    });
  }
  // 扁平化历史 _addrs：若有子表地址且主表客户地址为空，取首条描述
  live.forEach(function(r){
    if(!r) return;
    if(!String(r['客户地址']||'').trim() && Array.isArray(r._addrs) && r._addrs.length){
      r['客户地址'] = r._addrs[0]['客户地址描述'] || r._addrs[0]['地址描述'] || '';
      changed = true;
    }
    if(r['创建人'] !== '管理员'){ r['创建人'] = '管理员'; changed = true; }
    if(r['所属业务员'] !== '管理员'){ r['所属业务员'] = '管理员'; changed = true; }
    if('_addrs' in r){ delete r._addrs; changed = true; }
    if('_addrSeq' in r){ delete r._addrSeq; changed = true; }
  });
  MOCK.customer.main = live;
  if(changed && STORE && STORE.saveMock) STORE.saveMock(MOCK);
})();
(function ensureSupplierSeed(){
  if(!MOCK.supplier) MOCK.supplier = { main: [] };
  let live = Array.isArray(MOCK.supplier.main) ? MOCK.supplier.main : [];
  let changed = false;
  if(!live.length && SUPPLIER_SEED.length){
    live = JSON.parse(JSON.stringify(SUPPLIER_SEED));
    changed = true;
  } else {
    const have = new Set(live.map(function(r){ return String((r && r['供应商编码']) || '').trim(); }).filter(Boolean));
    SUPPLIER_SEED.forEach(function(r){
      const code = String((r && r['供应商编码']) || '').trim();
      if(!code || have.has(code)) return;
      live.push(JSON.parse(JSON.stringify(r)));
      have.add(code);
      changed = true;
    });
  }
  live.forEach(function(r){
    if(!r) return;
    if(!String(r['供应商地址']||'').trim() && Array.isArray(r._addrs) && r._addrs.length){
      r['供应商地址'] = r._addrs[0]['供应商地址描述'] || r._addrs[0]['地址描述'] || '';
      changed = true;
    }
    if(r['创建人'] !== '管理员'){ r['创建人'] = '管理员'; changed = true; }
    if(r['所属采购员'] !== '管理员'){ r['所属采购员'] = '管理员'; changed = true; }
    if('_addrs' in r){ delete r._addrs; changed = true; }
    if('_addrSeq' in r){ delete r._addrSeq; changed = true; }
  });
  MOCK.supplier.main = live;
  if(changed && STORE && STORE.saveMock) STORE.saveMock(MOCK);
})();
(function ensureUnitSeed(){
  if(!MOCK.unit) MOCK.unit = { main: [] };
  let live = Array.isArray(MOCK.unit.main) ? MOCK.unit.main : [];
  let changed = false;
  if(!live.length && UNIT_SEED.length){
    live = JSON.parse(JSON.stringify(UNIT_SEED));
    changed = true;
  } else {
    const have = new Set(live.map(function(r){ return String((r && r['单位编码']) || '').trim(); }).filter(Boolean));
    UNIT_SEED.forEach(function(r){
      const code = String((r && r['单位编码']) || '').trim();
      if(!code || have.has(code)) return;
      live.push(JSON.parse(JSON.stringify(r)));
      have.add(code);
      changed = true;
    });
  }
  live.forEach(function(r){
    if(!r) return;
    if(!r['舍入规则']){ r['舍入规则'] = '四舍五入'; changed = true; }
    if(!r['精度规则']){ r['精度规则'] = '固定小数位'; changed = true; }
    if(r['精度值'] == null || r['精度值'] === ''){ r['精度值'] = '3'; changed = true; }
    if(r['创建人'] !== '管理员'){ r['创建人'] = '管理员'; changed = true; }
    if(!r['创建时间']){ r['创建时间'] = '2026-09-08 09:00:00'; changed = true; }
  });
  MOCK.unit.main = live;
  if(changed && STORE && STORE.saveMock) STORE.saveMock(MOCK);
})();
(function normalizeMatListCreator(){
  const list = ((MOCK['mat-list'] || {}).main) || [];
  if(!list.length) return;
  let changed = false;
  list.forEach(function(r){
    if(!r) return;
    if(r['创建人'] !== '管理员'){ r['创建人'] = '管理员'; changed = true; }
  });
  if(changed && STORE && STORE.saveMock) STORE.saveMock(MOCK);
})();
(function normalizeSerialArchInspectStatus(){
  const list = ((MOCK['serial-arch'] || {}).main || []);
  if(!list.length) return;
  let changed = false;
  list.forEach(r=>{
    const v = String(r['检验状态'] == null ? '' : r['检验状态']).trim();
    if(!v || v === '—' || v === '-' || v === '待检'){
      r['检验状态'] = '待检验';
      changed = true;
    }
  });
  if(changed && STORE && STORE.saveMock) STORE.saveMock(MOCK);
})();
(function normalizeWwpoVendorFields(){
  const list = ((MOCK.wwpo || {}).main || []);
  if(!list.length) return;
  let changed = false;
  list.forEach(r=>{
    if(!r['供应商名称'] && r['加工厂名称']){ r['供应商名称'] = r['加工厂名称']; changed = true; }
    if(!r['采购员'] && r['加工负责人']){ r['采购员'] = r['加工负责人']; changed = true; }
    if('加工厂名称' in r){ delete r['加工厂名称']; changed = true; }
    if('加工负责人' in r){ delete r['加工负责人']; changed = true; }
  });
  if(changed && STORE && STORE.saveMock) STORE.saveMock(MOCK);
})();
(function normalizeTankArchRules(){
  const list = ((MOCK['tank-arch'] || {}).main || []);
  if(!list.length) return;
  let changed = false;
  list.forEach(r=>{
    const st = String(r['库存状态']||'').trim();
    if(st && st!=='库内'){ r['库存状态'] = '库内'; changed = true; }
    if('启用状态' in r){ delete r['启用状态']; changed = true; }
    const lines = Array.isArray(r._lines) ? r._lines : [];
    if(lines.length){
      const codes = [...new Set(lines.map(l=> String(l['物料编码']||'').trim()).filter(Boolean))];
      if(codes.length > 1){
        const keep = codes[0];
        r._lines = lines.filter(l=> String(l['物料编码']||'').trim()===keep);
        changed = true;
      }
    }
  });
  if(changed && STORE && STORE.saveMock) STORE.saveMock(MOCK);
})();
if(STORE && STORE.normalizeDictTypes) STORE.normalizeDictTypes(MOCK);
if(STORE && STORE.applyWhPoInToMock) STORE.applyWhPoInToMock(MOCK);
if(STORE && STORE.applyWhPoRetToMock) STORE.applyWhPoRetToMock(MOCK);
if(STORE && STORE.applyWhOsIssueToMock) STORE.applyWhOsIssueToMock(MOCK);
if(STORE && STORE.applyWhProdIssueToMock) STORE.applyWhProdIssueToMock(MOCK);
if(STORE && STORE.applyWhProdRetToMock) STORE.applyWhProdRetToMock(MOCK);
if(STORE && STORE.applyWhProdInToMock) STORE.applyWhProdInToMock(MOCK);
if(STORE && STORE.applyWhOsRetMatToMock) STORE.applyWhOsRetMatToMock(MOCK);
if(STORE && STORE.applyWhOsRecvToMock) STORE.applyWhOsRecvToMock(MOCK);
if(STORE && STORE.applyWhOsRetGoodsToMock) STORE.applyWhOsRetGoodsToMock(MOCK);
if(STORE && STORE.applyWhSoPrepToMock) STORE.applyWhSoPrepToMock(MOCK);
if(STORE && STORE.applyWhSoPreoutToMock) STORE.applyWhSoPreoutToMock(MOCK);
if(STORE && STORE.applyWhSoShipToMock) STORE.applyWhSoShipToMock(MOCK);
if(STORE && STORE.applyWhSoRetToMock) STORE.applyWhSoRetToMock(MOCK);

const app = createApp({
  components: { DemoVxeGrid, MenuIcon, DictTypeTreeNodes, CalibTestBody },
  setup(){
