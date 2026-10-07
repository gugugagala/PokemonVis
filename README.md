# PokemonVis

数据可视化技术课程大项目——基于 D3.js 的宝可梦数据可视化交互系统。

以 [Kaggle Pokémon Dataset](https://www.kaggle.com/datasets/abcsds/pokemon) 为基础数据，通过散点图、交互式提示框等可视化手段，探索宝可梦各项属性之间的关系。

## 功能特性

### 通用

- **多数据集加载与清洗**：使用 `d3.csv` 并行加载宝可梦、技能、进化、属性克制、招式学习表五份数据（`Promise.all`）；数值字段转数字，并按 `#` + `Name` 去重、合并双属性为 `types` 数组。
- **视图路由**：顶栏在多个视图间切换，左侧菜单承载各视图的筛选控件；切换与窗口缩放均自动重绘。
- **跨视图联动**：共享「属性筛选」与「选中宝可梦」状态——散点/平行坐标/进化链互相同步高亮，选中即弹雷达图；侧栏顶部显示「已选」指示条可一键清除。
- **状态可分享**：当前视图、属性筛选、选中宝可梦、刷选区间实时写入 URL `hash`，可复制分享，并支持前进/后退恢复。
- **刷选联动**：平行坐标逐轴刷选、散点矩形框选（HP×Speed）都会写入共享数值区间，跨视图高亮命中并生成可一键清除的筛选指示条。
- **多选对比**：按住 `Shift` 点击散点/平行坐标线条/进化节点即可增删对比对象（最多 6 只），弹出叠加雷达图 + 数值表（最优值高亮）。
- **分享预览**：顶部工具栏「分享」打开预览卡片，展示当前图表缩略图与状态链接，一键复制。
- **数据导出**：顶部工具栏可将当前视图数据导出为 **CSV**（含 BOM，Excel 友好），或将当前图表导出为 **PNG**（内联计算样式、2× 高清、白色背景）。
- **属性配色**：全项目使用宝可梦官方属性色板；**交互提示框**展示编号、名称、属性徽章与六维种族值，并支持视口边缘自动翻转。
- **可访问性**：语义化按钮导航（键盘 Enter/Space 切换、`aria-current`）、SVG `role="img"` + `aria-label`、雷达图 `role="dialog"` 与焦点管理、Esc 关闭、焦点可见样式。
- **响应式 / 移动端**：窄屏下导航自动换行、侧栏堆叠于图表上方、雷达图全宽，无横向溢出。

### 视图

| 视图 | 说明 |
| --- | --- |
| 散点图 | `HP × Speed` 分布，属性着色、半径编码 `Total`，悬停提示、点击查看雷达图 |
| 属性克制 | 18×18 热力图（攻击方 × 防御方），支持高亮攻击属性、隐藏 1× 效果、跟随所选宝可梦主属性、倍率图例 |
| 进化链 | 自动定位所选宝可梦所属家族，分层树布局，标注进化方式/等级/条件，点击节点切换家族 |
| 技能探索 | 搜索 + 属性/类别筛选 + 排序；可联动所选宝可梦的**属性技能**或**真实可学招式**（显示学习方式与等级），横向条形图展示威力 |
| 平行坐标 | 六维种族值平行坐标，**逐轴刷选**范围并联动过滤其它视图，按属性筛选，悬停高亮、点击联动雷达图 |
| 世代趋势 | 由图鉴编号推断世代，展示各世代六维/总和的均值折线（可切换指标），副标题显示各世代样本数 |
| 分布 | 六项种族值**箱线图**（四分位/中位数/须/离群点），与属性筛选联动，悬停查看分位明细 |
| 属性组合 | 双属性共现**和弦图**（18 属性外圈 + 组合弦），悬停查看该组合数量 |

- **六维雷达图**：浮动面板，居中展示所选宝可梦六项种族值（按各属性全库极值归一化）。
- **Coordinated brushing**：在平行坐标任意轴上拖拽筛选范围，命中结果同步高亮于散点/分布等视图，并生成可一键清除的筛选指示条。

## 目录结构

```
PokemonVis/
├── index.html          # 页面入口：顶栏导航、左侧菜单、可视化容器
├── css/
│   └── index.css       # 页面布局、导航/菜单/提示框/雷达图等样式
├── js/
│   ├── data.js         # 数据层：常量、状态、CSV 加载与清洗、通用工具
│   ├── tooltip.js      # 通用组件：提示框、属性徽章与宝可梦信息卡片
│   ├── radar.js        # 通用组件：六维种族值雷达图浮层
│   ├── compare.js      # 通用组件：多选对比面板（叠加雷达 + 数值表）
│   ├── app.js          # 应用外壳：视图注册、导航切换、分享与导出、响应式重绘
│   ├── views/
│   │   ├── scatter.js   # 视图：散点图
│   │   ├── typechart.js # 视图：属性克制热力图
│   │   ├── evolution.js # 视图：进化链
│   │   ├── moves.js     # 视图：技能探索器
│   │   ├── parallel.js  # 视图：平行坐标
│   │   ├── generation.js  # 视图：世代趋势
│   │   ├── distribution.js# 视图：种族值分布（箱线图）
│   │   └── typechord.js   # 视图：双属性组合和弦图
│   └── d3.js           # D3.js v5 可视化库
├── data/
│   ├── pokemon.csv     # 宝可梦种族值（编号/名称/属性/六维/总和）
│   ├── moves.csv       # 技能（名称/属性/类别/威力/命中/PP/效果）
│   ├── evolution.csv   # 进化链（进化前/进化后/等级/条件/方式）
│   ├── typechart.csv   # 属性克制表（攻击方/防御方/效果/倍率）
│   └── learnsets.csv   # 招式学习表（宝可梦/招式/学习方式/等级）
├── scripts/
│   ├── serve.js        # 开发静态服务器（npm run serve）
│   ├── static-server.js# 零依赖静态服务器（serve 与测试复用）
│   └── build-learnsets.js # 从 @pkmn 生成 learnsets.csv
├── tests/
│   ├── unit/           # 单元测试（node:test）
│   └── e2e/            # 端到端测试（playwright-core）
├── package.json        # 脚本与开发依赖
├── jsconfig.json       # 编辑器类型提示（d3）
└── README.md
```

## 数据说明

| 文件 | 行数 | 关键字段 |
| --- | --- | --- |
| `pokemon.csv` | 1158 | `#`, `Name`, `Type`, `Total`, `HP`, `Attack`, `Defense`, `Special Attack`, `Special Defense`, `Speed` |
| `moves.csv` | 607 | `Name`, `Type`, `Cat.`, `Power`, `Acc.`, `PP`, `Effect`, `Prob. (%)` |
| `evolution.csv` | 390 | `Evolving from`, `Evolving to`, `Level`, `Condition`, `Evolution Type` |
| `typechart.csv` | 324 | `Attack`, `Defense`, `Effectiveness`, `Multiplier` |
| `learnsets.csv` | 39234 | `pokemon`, `move`, `method`, `level`（来自 [PokeAPI](https://github.com/PokeAPI/pokeapi) / [@pkmn](https://github.com/pkmn/ps) 真实数据，覆盖 474 个物种） |

> 注：`pokemon.csv` 中双属性宝可梦会拆分为多行（例如 Bulbasaur 同时出现 `GRASS` 与 `POISON` 两行）；本项目按 `#` + `Name` 去重（保留不同形态），并将双属性合并为 `types` 数组。

## 快速开始

项目为纯静态页面，无需构建步骤。因需通过 `fetch` 加载本地 CSV，需以 HTTP 服务方式访问（直接双击 `index.html` 会因跨域限制而加载失败）：

```bash
# 方式一：项目内置零依赖静态服务器
npm run serve            # http://localhost:8000（可用 PORT 指定端口）

# 方式二：Python 3
python3 -m http.server 8000
```

浏览器打开 `http://localhost:8000` 即可查看可视化结果。

## 开发与测试

```bash
npm install              # 安装开发依赖（playwright-core / @pkmn）
npm run serve            # 启动本地服务器
npm test                 # 运行全部测试（单元 + 端到端）
npm run test:unit        # 仅单元测试（node:test，无需浏览器）
npm run test:e2e         # 仅端到端测试（需可用 Chromium）
npm run data:learnsets   # 重新从 @pkmn 生成 data/learnsets.csv
```

- 端到端测试默认自动探测 Playwright 缓存的 Chromium；也可通过环境变量 `PV_CHROMIUM` 指定浏览器路径。
- 单元测试覆盖数据清洗纯函数；端到端测试覆盖页面加载、视图切换、深链接、提示框、learnset 联动与导出。

## 技术栈

- [D3.js](https://d3js.org/) v5 — 数据驱动文档、比例尺、坐标轴、SVG 绘制
- 原生 JavaScript（ES6）— 视图路由、数据清洗、事件处理
- HTML5 / CSS3 — 页面布局（Flexbox + CSS 变量）

## 开发计划

- [x] 数据加载与坐标轴
- [x] HP × Speed 散点图绘制
- [x] 修复 Tooltip 内容、容器选择器与边缘定位
- [x] 修复 SVG 尺寸、`onload` 绑定与响应式重绘
- [x] 双属性去重与数值字段类型转换
- [x] 属性配色 + 自适应图例、半径编码、网格线与入场动画
- [x] 视图路由 + 导航/侧栏交互
- [x] 属性克制热力图、进化链、技能探索器、平行坐标多视图
- [x] 六维雷达图与跨视图联动（属性筛选 + 选中宝可梦同步）
- [x] 移动端适配与可访问性（键盘操作、ARIA、焦点管理、对比度）
- [x] 更多联动维度（技能/属性克制与所选宝可梦联动）
- [x] 状态分享（URL hash 记录视图/筛选/选中，支持前进后退）
- [x] 一键复制分享链接（含轻提示）
- [x] 数据导出（当前视图 CSV / 图表 PNG）
- [x] 分享预览卡片（内联缩略图 + 状态链接）
- [x] 分享 / 导出按钮移至顶部工具栏
- [x] 接入 npm 构建脚本与自动化测试（单元 + 端到端）
- [x] 接入真实 learnset 数据，实现「宝可梦 ↔ 招式」精确映射
- [x] 世代趋势视图（世代字段 + 均值折线）
- [x] 种族值分布箱线图视图
- [x] 平行坐标刷选与跨视图联动过滤（coordinated brushing）
- [x] 刷选区间写入 URL 分享
- [x] 散点矩形框选（HP × Speed）
- [x] 多选对比面板（Shift+点击，叠加雷达 + 数值表）
- [x] 双属性组合和弦图
