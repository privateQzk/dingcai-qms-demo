/* 驾驶舱启动页 · 路线A（quality-cockpit 布局，2 个页面共用） */
(function () {
  'use strict';
  var QmsCockpitLaunch = {
    name: 'QmsCockpitLaunch',
    props: {
      title: { type: String, default: '驾驶舱' }
    },
    emits: ['open'],
    template: [
      '<section class="qcock-launch">',
      '  <div class="qcock-launch__card">',
      '    <h2>{{ title }}</h2>',
      '    <p>驾驶舱在独立窗口中打开，不嵌在当前页面里。若浏览器拦截了弹出窗口，点下面的按钮再打开一次。</p>',
      '    <el-button type="primary" @click="$emit(\'open\')">打开{{ title }}</el-button>',
      '  </div>',
      '</section>'
    ].join('\n')
  };
  window.QMS_COMPONENTS = window.QMS_COMPONENTS || {};
  window.QMS_COMPONENTS.QmsCockpitLaunch = QmsCockpitLaunch;
})();

