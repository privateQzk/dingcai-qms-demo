/**
 * 鼎材 QMS · APP Demo 配置（本版清空历史 WMS 菜单与单据，仅保留壳子）
 * PC 侧已开放 v1.1.0 MVP（基础数据 + 采购来料检验链 + 仪器台账）；APP 业务页待扩展。
 */
window.APP_CFG = (function () {
  const menu = [
    {
      index: 'home',
      title: '首页',
      children: [
        { index: 'app-home', title: '功能首页' },
        { index: 'app-msg', title: '消息', stub: true },
        { index: 'app-mine', title: '我的', stub: true },
      ],
    },
  ];

  const homeModules = [
    {
      group: '提示',
      items: [
        { id: 'pc-hint', name: '请用 PC 查看 QMS 原型', icon: '💻', ready: false, stub: true },
      ],
    },
  ];

  const noticesDefault = [
    {
      id: 'qms-placeholder',
      title: '暂无 APP 业务单据',
      status: '—',
      lines: [
        { id: 'l1', code: '—', name: '本版 APP 仅保留首页壳子，业务页见 PC · 鼎材 QMS v1.1.0' },
      ],
    },
  ];

  return {
    menu: menu,
    homeModules: homeModules,
    flowMeta: {},
    docsMap: {},
    notices: noticesDefault,
    scanRowsSerial: [],
    scanRowsPick: [],
    lineSideWhOptions: [],
    sclckOptions: [],
    sclckCountOptions: [],
    sclckTankOptions: [],
    moOptions: [],
    recommendBarcodes: [],
    tankRows: [],
    tankRowsOut: [],
    scanRowsTankRet: [],
    innerScanRows: [],
    pkgScanRows: [],
    outerScanRows: [],
    serialArchRows: [],
    soPreoutPrepBarcodes: [],
    soShipPrepBarcodes: [],
    craftRoutes: {},
    outerBindMap: {},
    tankerSerialRows: [],
    tankArchRows: [],
    mediumMap: {},
    locRows: [],
    poOptions: [],
    wwpoOptions: [],
    barcodeMatOptions: [],
    liquidMatOptions: [],
    countMatOptions: [],
    countInvRows: [],
    waybillOptions: [],
    waybillShipOptions: [],
    soOptions: [],
    partnerOptions: [],
    waybills: [],
    carrierWaybills: [],
    carrierVehicles: [],
    loadWhBizOptions: [],
    loadRefSamples: {},
    carrierDemo: { name: '—', dispatcher: '—' },
    appUser: {
      role: 'internal',
      name: '张三',
      dispatcher: '—',
      carrier: '—',
      driverName: '—',
    },
    tanks: [],
    operator: '张三',
  };
})();
