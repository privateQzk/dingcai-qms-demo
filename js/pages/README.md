# 页面模块迁移说明（路线 A · 第 3/4 批）

本目录用于存放**逐页迁移**出来的页面模块。目标是让 AI 每次只读一个页面文件（100–400 行），
而不是 2.2MB 的 `js/app.js`。

## 目录约定

```
js/pages/
  index.js     页面注册表（QMS_PAGES / QMS_PAGE_PATHS，自动生成 195 条）
  links.js     页面归属与依赖声明（第 4 批，自动生成）
  loader.js    按需加载器（QMS_loadPage）
  <pageId>.js  单个页面模块（迁移后新增）
```

## 迁移一个页面的步骤

1. 在 `pc.html` 找到该页面对应的 `<template v-if=...>` 片段（用页面 key 搜索）
   —— 仅当页面有**专属布局分支**时才需要；走通用列表渲染的页面无需拆模板。
2. 把片段里的**专属方法/数据**从 `js/app.js` 移到 `js/pages/<pageId>.js`。
3. 页面文件按下方模板注册：

```js
/* pageId: inspect-task | 归属: 质量管理/检验管理 | 依赖: ['mat-list'] */
window.QMS_registerPage('inspect-task', {
  name: 'InspectTaskPage',
  props: ['ctx'],                 // ctx 传主应用的 page 配置与共享方法
  template: '<div class="page">...</div>',
  data: function () { return {}; },
  methods: {}
});
```

4. 主壳渲染该页时优先用 `QMS_loadPage(pageId)`：
   - 返回模块 → 用 `<component :is>` 渲染该模块
   - 返回 null → 自动回退到现有内联渲染（未迁移页面行为不变）
5. 在 `links.js` 补上真实依赖：

```js
'inspect-task': { group: '质量管理/检验管理', tab: '检验管理', tabs: 0,
                  depends: ['mat-list', 'unit-list'], emits: ['inspect-changed'] },
```

## 必须遵守的约定

- **单文件 ≤ 400 行**；超出说明还没拆干净。
- **禁止跨页面直接引用**：页面之间只通过共享 store 和 `links.js` 声明的依赖通信。
- 页面文件顶部写一行注释：`pageId | 归属 | 依赖`。
- 迁移后必须跑一次回归：该页主流程 + 关联页（depends 里的页面）。

## 验证方式

1. `node --check js/pages/<pageId>.js`
2. 浏览器打开该页，对比迁移前后的 DOM 节点数、表格行数、按钮数
3. 走一遍主流程（查询/新增/编辑/删除）
4. 检查控制台无新增错误

## 当前状态

- 注册表：195 个页面已登记路径
- 依赖声明：195 条已生成（depends/emits 待逐页补充）
- 已迁移页面：0 个（加载器已就绪，未迁移页面走原有渲染）

