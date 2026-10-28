/**
 * 鼎材 QMS Demo · 数据字典种子与字段绑定
 */
window.WMS_DICT = (function () {
  function g(id, code, name, parent, remark) {
    return { id: id, 编码: code, 名称: name, 上级字典: parent || '', 备注: remark || '', 系统开发: true, 分组节点: true };
  }
  function t(id, code, name, parent, remark) {
    return { id: id, 编码: code, 名称: name, 上级字典: parent || '', 备注: remark || '', 系统开发: true, 分组节点: false };
  }
  function i(id, typeId, code, name, remark) {
    return {
      id: id, typeId: typeId, 编码: code, 名称: name,
      启用状态: '启用', 创建人: '管理员', 创建时间: '2026-09-08 09:00:00', 备注: remark || ''
    };
  }
  function itemsOf(typeId, pairs) {
    return pairs.map(function (p, idx) {
      return i(typeId + '-' + (idx + 1), typeId, p[0], p[1], p[2] || '');
    });
  }

  const types = [
    g('g-mat', 'MOD_MAT', '物料', '', '基础资料 · 物料'),
    t('t1', 'MAT_KIND', '物料种类', 'g-mat', 'OLED / 光刻胶分类'),
    t('t2', 'MAT_SPEC', '物料规格', 'g-mat', '电子级 / 工艺节点规格（历史字典，表单已改为手输）'),
    t('t3', 'MAT_ATTR', '物料属性', 'g-mat', '原料 / 中间体 / 成品 / 辅材'),
    g('g-cus', 'MOD_CUS', '客户', '', '基础资料 · 客户'),
    t('t4', 'CUS_TYPE', '客户类型', 'g-cus', '面板厂 / 晶圆厂 / 渠道等'),
    g('g-sup', 'MOD_SUP', '供应商', '', '基础资料 · 供应商'),
    t('t5', 'SUP_TYPE', '供应商类型', 'g-sup', '原料 / 中间体 / 包材 / 溶剂 / 检测等'),
    g('g-qms', 'MOD_QMS', '质量管理', '', '检验 / 不合格'),
    t('t6', 'Q_BIG', '问题大类', 'g-qms', '不合格问题大类'),
    t('t7', 'Q_SMALL', '问题小类', 'g-qms', '不合格问题小类'),
    t('t8', 'EQ_TYPE', '仪器类型', 'g-qms', '仪器台账类型'),
    t('t14', 'CC_TYPE', '投诉类型', 'g-qms', '客户投诉 · 投诉类型'),
    t('t15', 'CC_BIG', '客诉问题大类', 'g-qms', '客户投诉 · 问题大类'),
    t('t16', 'CC_SMALL', '客诉问题小类', 'g-qms', '客户投诉 · 问题小类'),
    t('t17', 'CR_TYPE', '退货类型', 'g-qms', '客户退货 · 退货类型'),
    t('t18', 'RESP_DEPT', '责任部门', 'g-qms', '客户退货 · 责任部门'),
    t('t19', 'sbdbdblx', '调拨类型', 'g-qms', '仪器调拨 · 调拨类型'),
    t('t20', 'sbtytylx', '停用类型', 'g-qms', '仪器停用 · 停用类型'),
    t('t21', 'sbqyqylx', '启用类型', 'g-qms', '仪器启用 · 启用类型'),
    t('t22', 'sbbflx', '报废类型', 'g-qms', '仪器报废 · 报废类型'),
    t('t23', 'ysjl', '验收结论', 'g-qms', '仪器台账 · 配置字段关联'),
    t('t24', 'UR_RELEASE_CAT', '放行分类', 'g-qms', '未检放行 · 放行分类'),
    t('t25', 'EA_AUDIT_WAY', '审核方式', 'g-qms', '审核管理 · 审核方式'),
    t('t26', 'CL_DEV_TH', '偏差阈值', 'g-qms', '控限计算 · UCL/LCL偏差上限'),
    g('g-lab', 'MOD_LAB', '实验室', '', '基础数据 · 实验室资料'),
    t('t9', 'REAGENT_KIND', '试剂种类', 'g-lab', '色谱 / 溶剂 / 酸碱 / 标准品等'),
    t('t10', 'SOLUTION_KIND', '试液种类', 'g-lab', '标准滴定溶液 / 标准工作溶液 / 缓冲溶液等'),
    t('t11', 'RM_KIND', '标准物质种类', 'g-lab', '国家一级 / 国家二级 / 有证 / 工作标准品'),
    t('t12', 'RETAIN_KIND', '留样种类', 'g-lab', '原料 / 中间体 / 成品 / 稳定性留样'),
    t('t13', 'CONSUMABLE_KIND', '耗材种类', 'g-lab', '色谱柱 / 滤膜滤头 / 样品瓶 / 玻璃器皿等'),
    g('g-doc', 'MOD_DOC', '单据类型', 'g-lab', '实验室管理 · 出入库 / 开封 / 销毁'),
    t('t27', 'DOC_RG_IN', '单据类型（试剂入库）', 'g-doc', '试剂入库单'),
    t('t28', 'DOC_RG_OUT', '单据类型（试剂出库）', 'g-doc', '试剂出库单'),
    t('t29', 'DOC_SL_IN', '单据类型（试液入库）', 'g-doc', '试液入库单'),
    t('t30', 'DOC_SL_OUT', '单据类型（试液出库）', 'g-doc', '试液出库单'),
    t('t31', 'DOC_RM_IN', '单据类型（标准物质入库）', 'g-doc', '标准物质入库单'),
    t('t32', 'DOC_RM_OUT', '单据类型（标准物质出库）', 'g-doc', '标准物质出库单'),
    t('t33', 'DOC_RM_OPEN', '单据类型（标准物质开封）', 'g-doc', '标准物质开封单'),
    t('t34', 'DOC_CS_IN', '单据类型（耗材入库）', 'g-doc', '耗材入库单（计数、条码共用）'),
    t('t35', 'DOC_CS_OUT', '单据类型（耗材出库）', 'g-doc', '耗材出库单（计数、条码共用）'),
    t('t36', 'DOC_RT_IN', '单据类型（留样入库）', 'g-doc', '留样入库单'),
    t('t37', 'DOC_RT_OUT', '单据类型（留样出库）', 'g-doc', '留样出库单'),
    t('t38', 'DOC_RT_X', '单据类型（留样销毁）', 'g-doc', '留样销毁单'),
  ];

  const items = []
    .concat(itemsOf('t1', [
      ['OLED_INT', 'OLED中间体'],
      ['OLED_FG', 'OLED成品'],
      ['PR_RESIN', '光刻胶树脂'],
      ['PR_MON', '光刻胶单体'],
      ['PR_FG', '光刻胶成品'],
      ['PKG', '包辅材']
    ]))
    .concat(itemsOf('t2', [
      ['OLED_EG', 'OLED电子级'],
      ['PR_EG', '光刻胶电子级'],
      ['IG', '工业级'],
      ['HP', '高纯≥99.99%'],
      ['KRF', 'KrF'],
      ['ARF', 'ArF']
    ]))
    .concat(itemsOf('t3', [
      ['RAW', '原料'],
      ['INT', '中间体'],
      ['FG', '成品'],
      ['AUX', '辅材']
    ]))
    .concat(itemsOf('t4', [
      ['PANEL', '面板厂'],
      ['WAFER', '晶圆厂'],
      ['DIST', '经销商'],
      ['TRADE', '贸易商'],
      ['LAB', '科研院所']
    ]))
    .concat(itemsOf('t5', [
      ['RAW', '原料供应商'],
      ['INT', '中间体供应商'],
      ['PKG', '包材供应商'],
      ['SOL', '试剂溶剂商'],
      ['TEST', '检测服务商']
    ]))
    .concat(itemsOf('t6', [
      ['APP', '外观异常'],
      ['PUR', '纯度不达标'],
      ['MET', '金属离子超标'],
      ['PKG', '包装破损'],
      ['CONT', '含量'],
      ['DEV', '偏差']
    ]))
    .concat(itemsOf('t7', [
      ['COLOR', '色泽异常'],
      ['PART', '颗粒度'],
      ['FE', 'Fe超标'],
      ['LBL', '标签错误'],
      ['PURL', '纯度偏低'],
      ['TREND', '趋势异常']
    ]))
    .concat(itemsOf('t8', [
      ['HPLC', '色谱'],
      ['SPEC', '光谱'],
      ['BAL', '天平'],
      ['TIT', '滴定'],
      ['GEN', '通用']
    ]))
    .concat(itemsOf('t9', [
      ['CHROM', '色谱试剂'],
      ['SOLV', '溶剂'],
      ['ACID', '酸碱试剂'],
      ['TITR', '滴定试剂'],
      ['STD', '标准品'],
      ['PRIM', '基准试剂'],
      ['IND', '指示剂'],
      ['NMR', '波谱试剂']
    ]))
    .concat(itemsOf('t10', [
      ['TITR', '标准滴定溶液'],
      ['WORK', '标准工作溶液'],
      ['BUF', '缓冲溶液'],
      ['IND', '指示液'],
      ['GEN', '一般试液']
    ]))
    .concat(itemsOf('t11', [
      ['GBW1', '国家一级标准物质'],
      ['GBW2', '国家二级标准物质'],
      ['CRM', '有证标准物质'],
      ['WS', '工作标准品']
    ]))
    .concat(itemsOf('t12', [
      ['RAW', '原料留样'],
      ['INT', '中间体留样'],
      ['FIN', '成品留样'],
      ['STAB', '稳定性留样']
    ]))
    .concat(itemsOf('t13', [
      ['COL', '色谱柱'],
      ['FLT', '滤膜滤头'],
      ['VIAL', '样品瓶'],
      ['TIP', '移液耗材'],
      ['GLASS', '玻璃器皿'],
      ['PPE', '防护用品']
    ]))
    .concat(itemsOf('t14', [
      ['DLV', '交期'],
      ['QLT', '质量'],
      ['PKG', '包装'],
      ['LOG', '物流'],
      ['SVC', '服务'],
      ['OTH', '其他']
    ]))
    .concat(itemsOf('t15', [
      ['DLV', '时间交期'],
      ['QLT', '产品质量'],
      ['PKG', '包装标识'],
      ['SVC', '服务支持']
    ]))
    .concat(itemsOf('t16', [
      ['TIME', '时间'],
      ['QTY', '数量'],
      ['TRANS', '运输'],
      ['PUR', '纯度'],
      ['IMP', '杂质'],
      ['APP', '外观'],
      ['PERF', '性能'],
      ['DMG', '包装破损'],
      ['LBL', '标签错误'],
      ['LEAK', '渗漏'],
      ['RESP', '响应时效'],
      ['TECH', '技术支持'],
      ['DOC', '文件资料']
    ]))
    .concat(itemsOf('t17', [
      ['QLT', '质量'],
      ['DLV', '交期'],
      ['PKG', '包装'],
      ['LOG', '物流'],
      ['QTY', '数量'],
      ['OTH', '其他']
    ]))
    .concat(itemsOf('t18', [
      ['PROD', '生产部'],
      ['QM', '质量管理部'],
      ['RD', '研发中心'],
      ['WL', '仓储物流部'],
      ['PUR', '采购部'],
      ['SALE', '销售部']
    ]))
    .concat(itemsOf('t19', [
      ['BMDB', '部门调拨'],
      ['CQDB', '厂区调拨'],
      ['WJ', '外借']
    ]))
    .concat(itemsOf('t20', [
      ['GZTY', '故障停用'],
      ['JHTY', '计划停用'],
      ['XZTY', '闲置停用']
    ]))
    .concat(itemsOf('t21', [
      ['WXHQY', '维修后启用'],
      ['XZHQY', '闲置后启用'],
      ['JDHGQY', '检定合格后启用']
    ]))
    .concat(itemsOf('t22', [
      ['SHBF', '损坏报废'],
      ['CQBF', '超期报废'],
      ['JSTT', '技术淘汰']
    ]))
    .concat(itemsOf('t23', [
      ['HG', '合格'],
      ['BHG', '不合格'],
      ['RBJS', '让步接收']
    ]))
    .concat(itemsOf('t24', [
      ['JJSC', '紧急生产'],
      ['JJFH', '紧急发货'],
      ['QT', '其他']
    ]))
    .concat(itemsOf('t25', [
      ['XC', '现场审核'],
      ['XS', '线上审核']
    ]))
    .concat(itemsOf('t26', [
      ['P05', '0.5%'],
      ['P1', '1%'],
      ['P2', '2%'],
      ['P5', '5%']
    ]))
    .concat(itemsOf('t27', [
      ['CG', '采购入库'],
      ['QT', '其他入库'],
      ['PY', '盘盈入库']
    ]))
    .concat(itemsOf('t28', [
      ['CG', '采购出库'],
      ['QT', '其他出库'],
      ['PY', '盘盈出库']
    ]))
    .concat(itemsOf('t29', [
      ['CG', '采购入库'],
      ['PY', '配液入库'],
      ['QT', '其他入库']
    ]))
    .concat(itemsOf('t30', [
      ['LY', '领用出库'],
      ['QT', '其他出库']
    ]))
    .concat(itemsOf('t31', [
      ['CG', '采购入库'],
      ['QT', '其他入库']
    ]))
    .concat(itemsOf('t32', [
      ['LY', '领用出库'],
      ['QT', '其他出库']
    ]))
    .concat(itemsOf('t33', [
      ['CG', '常规开封'],
      ['QT', '其他开封']
    ]))
    .concat(itemsOf('t34', [
      ['CG', '采购入库'],
      ['QT', '其他入库']
    ]))
    .concat(itemsOf('t35', [
      ['LY', '领用出库'],
      ['QT', '其他出库']
    ]))
    .concat(itemsOf('t36', [
      ['CG', '常规留样'],
      ['QT', '其他入库']
    ]))
    .concat(itemsOf('t37', [
      ['FJ', '复检出库'],
      ['QT', '其他出库']
    ]))
    .concat(itemsOf('t38', [
      ['DQ', '到期销毁'],
      ['QT', '其他销毁']
    ]));

  const binds = {
    '物料种类': 'MAT_KIND',
    '物料属性': 'MAT_ATTR',
    '客户类型': 'CUS_TYPE',
    '供应商类型': 'SUP_TYPE',
    '问题大类': 'Q_BIG',
    '问题小类': 'Q_SMALL',
    '仪器类型': 'EQ_TYPE',
    '试剂种类': 'REAGENT_KIND',
    '试液种类': 'SOLUTION_KIND',
    '标准物质种类': 'RM_KIND',
    '留样种类': 'RETAIN_KIND',
    '耗材种类': 'CONSUMABLE_KIND',
    '放行分类': 'UR_RELEASE_CAT',
    'np-0211-02|审核方式': 'EA_AUDIT_WAY',
    'np-0212-02|投诉类型': 'CC_TYPE',
    'np-0212-02|问题大类': 'CC_BIG',
    'np-0212-02|问题小类': 'CC_SMALL',
    'np-0212-03|退货类型': 'CR_TYPE',
    'np-0212-03|责任部门': 'RESP_DEPT',
    'np-0312-01|调拨类型': 'sbdbdblx',
    'np-0309-01|停用类型': 'sbtytylx',
    'np-0310-01|启用类型': 'sbqyqylx',
    'np-0311-01|报废类型': 'sbbflx',
    'np-0401-01|单据类型': 'DOC_RG_IN',
    'np-0401-02|单据类型': 'DOC_RG_OUT',
    'np-0402-03|单据类型': 'DOC_SL_IN',
    'np-0402-04|单据类型': 'DOC_SL_OUT',
    'np-0403-01|单据类型': 'DOC_RM_OPEN',
    'np-0403-02|单据类型': 'DOC_RM_IN',
    'np-0403-03|单据类型': 'DOC_RM_OUT',
    'np-0404-01|单据类型': 'DOC_RT_IN',
    'np-0404-02|单据类型': 'DOC_RT_OUT',
    'np-0404-03|单据类型': 'DOC_RT_X',
    'np-0405-01|单据类型': 'DOC_CS_IN',
    'np-0405-02|单据类型': 'DOC_CS_OUT',
    'np-0413-02|单据类型': 'DOC_CS_IN',
    'np-0413-03|单据类型': 'DOC_CS_OUT'
  };

  function liveDict(mockDict) {
    if (mockDict && Array.isArray(mockDict.types) && mockDict.types.length) return mockDict;
    return { types: types, main: items };
  }
  function typeIdOf(code, dict) {
    const hit = (dict.types || []).find(function (x) { return x.编码 === code; });
    return hit ? hit.id : '';
  }
  function enabledNames(code, mockDict) {
    const dict = liveDict(mockDict);
    const tid = typeIdOf(code, dict);
    if (!tid) return [];
    const names = [];
    (dict.main || []).forEach(function (r) {
      if (r.typeId !== tid) return;
      if (r['启用状态'] === '禁用') return;
      const n = String(r['名称'] || '').trim();
      if (n && names.indexOf(n) < 0) names.push(n);
    });
    return names;
  }
  function resolveCode(pageId, field, tab) {
    if (!field) return '';
    const p = String(pageId || '');
    const tb = String(tab || '');
    if (p && tb && binds[p + '|' + tb + '|' + field]) return binds[p + '|' + tb + '|' + field];
    if (p && binds[p + '|' + field]) return binds[p + '|' + field];
    return binds[field] || '';
  }
  function optionsFor(pageId, field, tab, mockDict) {
    const code = resolveCode(pageId, field, tab);
    if (!code) return null;
    return enabledNames(code, mockDict);
  }
  function firstOption(pageId, field, tab, mockDict) {
    const opts = optionsFor(pageId, field, tab, mockDict) || [];
    return opts[0] || '';
  }
  function mergeInto(target) {
    if (!target) return false;
    if (!target.dict) target.dict = { types: [], main: [] };
    const dict = target.dict;
    dict.types = Array.isArray(dict.types) ? dict.types : [];
    dict.main = Array.isArray(dict.main) ? dict.main : [];
    const before = JSON.stringify({ types: dict.types, main: dict.main });
    const byId = {};
    const byCode = {};
    dict.types.forEach(function (row) {
      if (!row) return;
      if (row.id) byId[row.id] = row;
      if (row.编码) byCode[row.编码] = row;
    });
    types.forEach(function (seed) {
      const exist = byId[seed.id] || byCode[seed.编码];
      if (exist) {
        exist.id = seed.id;
        exist.编码 = seed.编码;
        exist.名称 = seed.名称;
        exist.上级字典 = seed.上级字典;
        exist.系统开发 = true;
        exist.分组节点 = !!seed.分组节点;
        if (!exist.备注) exist.备注 = seed.备注;
        byId[seed.id] = exist;
        byCode[seed.编码] = exist;
      } else {
        const row = Object.assign({}, seed);
        dict.types.push(row);
        byId[row.id] = row;
        byCode[row.编码] = row;
      }
    });
    const itemByKey = {};
    dict.main.forEach(function (row) {
      if (!row) return;
      itemByKey[row.id] = row;
      itemByKey[(row.typeId || '') + '#' + (row.编码 || '')] = row;
    });
    items.forEach(function (seed) {
      const liveType = byId[seed.typeId];
      const liveTypeId = liveType ? liveType.id : seed.typeId;
      const exist = itemByKey[seed.id] || itemByKey[liveTypeId + '#' + seed.编码];
      if (exist) {
        exist.typeId = liveTypeId;
        if (!exist.编码) exist.编码 = seed.编码;
        if (!exist.名称) exist.名称 = seed.名称;
      } else {
        const row = Object.assign({}, seed, { typeId: liveTypeId });
        dict.main.push(row);
        itemByKey[row.id] = row;
      }
    });
    return before !== JSON.stringify({ types: dict.types, main: dict.main });
  }

  return {
    types: types,
    items: items,
    binds: binds,
    enabledNames: enabledNames,
    resolveCode: resolveCode,
    optionsFor: optionsFor,
    firstOption: firstOption,
    mergeInto: mergeInto
  };
})();
