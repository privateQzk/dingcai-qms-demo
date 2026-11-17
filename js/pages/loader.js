/* 页面模块加载器 · 路线A 第3批
 * 用法：QMS_loadPage('mat-list').then(function (def) { ... })
 * 未迁移的页面返回 null，调用方回退到现有内联渲染，因此可逐页迁移、随时回滚。
 */
(function () {
  'use strict';
  var cache = {};
  var V = '?v=1.0.0';
  window.QMS_loadPage = function (key) {
    if (!key) return Promise.resolve(null);
    if (window.QMS_PAGES && window.QMS_PAGES[key]) return Promise.resolve(window.QMS_PAGES[key]);
    if (cache[key]) return cache[key];
    var path = (window.QMS_PAGE_PATHS || {})[key];
    if (!path) return Promise.resolve(null);
    cache[key] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = path + V;
      s.async = true;
      s.onload = function () {
        var def = (window.QMS_PAGES || {})[key];
        if (def) resolve(def); else { delete cache[key]; resolve(null); }
      };
      s.onerror = function () { delete cache[key]; reject(new Error('页面模块加载失败: ' + path)); };
      document.head.appendChild(s);
    });
    return cache[key];
  };
  window.QMS_isPageMigrated = function (key) { return !!(window.QMS_PAGES && window.QMS_PAGES[key]); };
})();
