# 鼎材 QMS 原型 demo · 项目说明（AI 协作必读）

纯静态离线原型：Vue3 + Element Plus（CDN），无构建、无后端。浏览器直接打开 `pc.html` / `app.html` 即可演示。

## 一、仓库结构（2026-11-17 重构后）

```
5原型demo/            ← 本目录是独立 git 仓库（外层 dingcai/ 不是仓库）
├── index.html        入口（PC/APP 二选一）
├── pc.html           ★ PC 端外壳：CSS 引入 + #app 全部 DOM 模板（弹窗/抽屉/列表标记都在这）+ script 标签
├── app.html          APP 端外壳（逻辑在 js/qms-app.js + js/qms-app-runtime.js）
├── insp-cockpit.html 独立大屏：检验数字驾驶舱（自包含脚本）
├── quality-cockpit.html 独立大屏：质量数字驾驶舱（自包含脚本）
├── css/app.css       ★ PC 全部样式（已从 pc.html 抽出）
├── js/app.js         ★ PC 端全部业务逻辑（~2.2MB）—— 由 parts 拼装，禁止手改！
├── js/app/parts/     ★ app.js 的 69 个分片（00-68 编号），同一 setup 闭包切片
├── js/app/build.sh   重建脚本：cat parts/*.js > app.js
├── js/page-configs.js★ 页面结构配置（菜单树 + 页面对象）4.4MB
├── js/mock-rows.js   ★ 演示数据（按 pageId → tab 分桶）3.5MB
├── js/dict-catalog.js 数据字典 + optionsFor()
├── js/demo-store.js  localStorage + BroadcastChannel 跨端联动（WMS_DEMO_STORE）
├── js/ledger-insp.js 台账检验详情推导（pc/insp-cockpit 共用，勿各自改写）
├── js/components/layouts/  特殊布局组件（dict-panel/tree-list/util-report/quality-report/
│                            insp-report/cost-stat/spc-process/env-stat/batch-trace/
│                            spc-chart-panel/cockpit-launch/sigma-config/simple-list-panel/
│                            col-model-panel）
├── js/pages/         页面模块注册表 index.js + links.js + loader.js（路线A 渐进迁移用）
├── js/app-prd-notes.js / page-prd-notes.js  PRD 备注（由 sync_prd_notes.py 生成，勿手改）
└── js/*.py           历史生成/对齐脚本（非运行时依赖）
```

## 二、改代码的铁律

1. **改 JS 逻辑只改 `js/app/parts/*.js`，然后必须跑 `bash js/app/build.sh` 重建 app.js。** 直接改 app.js 会在下次重建时丢失。
2. **改页面结构（查询字段/列/工具栏/行操作/表单字段）改 `js/page-configs.js`**——它有两份数据必须同步：
   - `pages`：**对象字典**（`"pageId": {…}`），引擎按 `CFG.pages[pageId]` 读取 —— 这是驱动渲染的源
   - `pageList`：**数组副本**（同内容按顺序重复一遍）—— 也必须同步改
   - `menu`：菜单树，`index`/`pageId` 对应 pages 键
3. **改样式改 `css/app.css`**，DOM/弹窗模板改 `pc.html`。
4. **改 mock 数据改 `js/mock-rows.js`**，注意分桶：很多页不是 `.main` 而是按页签分桶（`insp-order`/`ledger`/`insp-scheme` 用 `tab-pi/tab-pp/tab-pm/tab-sst/tab-rd/tab-ext/tab-wr/tab-oe`；`insp-project` 用 `tab-item`/`tab-category`；`instrument` 才是 `.main`）。取值前先 `Object.keys(MOCK[pid])` 看真实桶名。
5. **改了 js 文件要 bump 引用处的 `?v=` 版本号**（pc.html / app.html / insp-cockpit.html / quality-cockpit.html 各自的 script src）。
6. **配置字段增删 → 列表列同步**（见 .cursor/rules/list-field-sync）；**客户/供应商/物料/采样点选择器一律右侧抽屉**（picker-drawer）；**打印标签统一 `openPrintLabel`**；**PRD 备注只在用户明确要求时改，改后跑 `python3 5原型demo/js/sync_prd_notes.py` + bump 版本**。
7. **md 同步**：`4原型页面描述/**.md` 是对应页面的文字说明，字段/按钮/交互改动要同步改 md（但不许顺手改 PRD备注 节）。

## 三、page-configs.js 安全改法（血泪教训）

4.4MB 单文件，**正则批处理必须先精确限定范围再动手**：

- 页面对象边界：`"id": "<pageId>"` 起，到下一个 `"id": "` 前为止（两个 np-xxx 块 = pages 一份 + pageList 一份）
- 在块内先打印 `tabViews` 的 name/label 和待删字段的行号，确认落在目标 tabView 段内再删
- 删除 JSON 元素时处理首尾逗号（最后一个元素去前逗号，中间元素连后逗号删）
- **改完必须 `node --check js/page-configs.js` + 统计删除次数是否符合预期 + 残留 grep**
- 禁止用「找下一个同缩进 `"id":`」的方式估边界——不同层级缩进不同，曾因此把删除作用域扩大到文件尾
- 本目录有 git，改前可 `git stash`/`git diff` 兜底；用户也会定期提交

## 四、关键数据/页面映射

| 内容 | 位置 |
|---|---|
| 台账检验详情推导 | `ledgerInspItems(row)`（js/ledger-insp.js， WeakMap 缓存） |
| 报检单隐藏/显示 | parts/59-qrIssueLedgerSamples.js，`MOCK['insp-order-hidden'].main` 持久化，insp-order 与 ledger 联动过滤 |
| 工具栏分发 | parts/57-onRowOp.js（行操作）+ onToolbar 通用分发；按钮 type 映射含 primary/danger/warning |
| 仪器稼动率 | layout=util-report → components/layouts/util-report.js；逻辑 parts/23（utQuery/utDefaultRange） |
| 数据录入三页 | entry-* 系列函数（开始时间条件必填在 parts/09） |
| 检验方案 | insp-scheme 分桶 + 方案编辑全屏页（schemeQualRows/schemeQuantRows/_qualItems/_quantItems/_points/_mats/_custs/_supps/_media） |
| 大屏 | insp-cockpit.html（检验）、quality-cockpit.html（质量）独立文件，直接读 WMS_MOCK_ROWS |

## 五、自检清单

- `node --check` 每个被改的 .js；pc.html 改 inline script 时用 `python3` 提取 `<script>` 段再 `node --check`
- `page-configs.js` 改动后验证：pages/pageList 双份一致、目标 tabView 准确、无残留
- 浏览器刷新验证（版本号是否 bump 到位）
- md 对应章节已同步
