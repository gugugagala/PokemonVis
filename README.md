# PokemonVis

数据可视化技术课程大项目——基于 D3.js 的宝可梦数据可视化交互系统。

以 [Kaggle Pokémon Dataset](https://www.kaggle.com/datasets/abcsds/pokemon) 为基础数据，通过散点图、交互式提示框等可视化手段，探索宝可梦各项属性之间的关系。

## 功能特性

- **多数据集加载**：使用 `d3.csv` 并行加载宝可梦、技能、进化、属性克制四份数据（`Promise.all`）。
- **散点图**：以 `HP`（攻击/HP）为横轴、`Speed`（速度）为纵轴，绘制全部宝可梦的属性散点分布。
- **坐标轴**：自动计算数据极值（`d3.min` / `d3.max`），生成带 `.nice()` 取整的线性坐标轴及轴标题。
- **交互提示框（Tooltip）**：鼠标悬停散点时展示该宝可梦的编号、名称及各项种族值。
- **响应式布局**：监听 `window.onload` 与 `window.resize`，根据容器尺寸重新计算绘图区域。

> 说明：当前项目处于开发中，顶栏按钮、左侧菜单为占位元素，散点图及提示框仍在完善。

## 目录结构

```
PokemonVis/
├── index.html          # 页面入口：顶栏导航、左侧菜单、可视化容器
├── css/
│   └── index.css       # 页面布局与按钮样式（CSS 变量控制尺寸）
├── js/
│   ├── index.js        # 主逻辑：数据加载、坐标轴、散点图、Tooltip
│   ├── d3.js           # D3.js 可视化库
│   ├── d3.min.js       # D3.js 压缩版
│   └── jQuery.js       # jQuery 库（DOM 尺寸与事件）
├── data/
│   ├── pokemon.csv     # 宝可梦种族值（编号/名称/属性/六维/总和）
│   ├── moves.csv       # 技能（名称/属性/类别/威力/命中/PP/效果）
│   ├── evolution.csv   # 进化链（进化前/进化后/等级/条件/方式）
│   └── typechart.csv   # 属性克制表（攻击方/防御方/效果/倍率）
├── jsconfig.json       # 编辑器类型提示（d3 / jQuery）
└── README.md
```

## 数据说明

| 文件 | 行数 | 关键字段 |
| --- | --- | --- |
| `pokemon.csv` | 1158 | `#`, `Name`, `Type`, `Total`, `HP`, `Attack`, `Defense`, `Special Attack`, `Special Defense`, `Speed` |
| `moves.csv` | 607 | `Name`, `Type`, `Cat.`, `Power`, `Acc.`, `PP`, `Effect`, `Prob. (%)` |
| `evolution.csv` | 390 | `Evolving from`, `Evolving to`, `Level`, `Condition`, `Evolution Type` |
| `typechart.csv` | 324 | `Attack`, `Defense`, `Effectiveness`, `Multiplier` |

> 注：`pokemon.csv` 中双属性宝可梦会拆分为多行（例如 Bulbasaur 同时出现 `GRASS` 与 `POISON` 两行），使用前需按 `#` 去重。

## 快速开始

项目为纯静态页面，无需构建步骤。因需通过 `fetch` 加载本地 CSV，需以 HTTP 服务方式访问（直接双击 `index.html` 会因跨域限制而加载失败）：

```bash
# Python 3
python3 -m http.server 8000

# 或 Node.js
npx serve
```

浏览器打开 `http://localhost:8000` 即可查看可视化结果。

## 技术栈

- [D3.js](https://d3js.org/) — 数据驱动文档、比例尺、坐标轴、SVG 绘制
- [jQuery](https://jquery.com/) — 容器尺寸获取与窗口事件
- HTML5 / CSS3 — 页面布局（Flexbox + CSS 变量）

## 开发计划

- [x] 数据加载与坐标轴
- [x] HP × Speed 散点图基础绘制
- [ ] 修复 Tooltip 内容与定位
- [ ] 顶栏按钮与左侧菜单交互
- [ ] 增加属性筛选 / 技能 / 进化 / 属性克制等视图
