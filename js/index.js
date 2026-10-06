/* PokemonVis —— 宝可梦属性散点图可视化主逻辑 */

const CONFIG = {
    margin: { top: 50, right: 40, left: 70 },
    pointRadius: 5,
    pointColor: "#568100",
    transition: 300
};

/* 宝可梦官方属性配色 */
const TYPE_COLORS = {
    NORMAL: "#A8A77A", FIRE: "#EE8130", WATER: "#6390F0", ELECTRIC: "#F7D02C",
    GRASS: "#7AC74C", ICE: "#96D9D6", FIGHTING: "#C22E28", POISON: "#A33EA1",
    GROUND: "#E2BF65", FLYING: "#A98FF3", PSYCHIC: "#F95587", BUG: "#A6B91A",
    ROCK: "#B6A136", GHOST: "#735797", DRAGON: "#6F35FC", DARK: "#705746",
    STEEL: "#B7B7CE", FAIRY: "#D685AD"
};

const TYPE_ORDER = Object.keys(TYPE_COLORS);
const FALLBACK_COLOR = "#9e9e9e";

const LEGEND_ITEM_W = 78;
const LEGEND_ITEM_H = 20;

const state = {
    width: 0,
    height: 0,
    innerW: 0,
    innerH: 0,
    marginBottom: 80,
    legend: { cols: 1, rows: 1 },
    svg: null,
    tooltip: null,
    pokemon: [],
    moves: [],
    evolution: [],
    typechart: []
};

/* ------------------------- 数据加载与清洗 ------------------------- */

function parsePokemonRow(d) {
    return {
        id: (d["#"] || "").trim(),
        name: d["Name"],
        type: d["Type"],
        total: +d["Total"],
        hp: +d["HP"],
        attack: +d["Attack"],
        defense: +d["Defense"],
        spAtk: +d["Special Attack"],
        spDef: +d["Special Defense"],
        speed: +d["Speed"]
    };
}

/* 双属性宝可梦在原始数据中拆为多行，按 (# + Name) 去重并把属性合并为数组 */
function consolidatePokemon(rows) {
    const byKey = new Map();
    rows.forEach(row => {
        const key = row.id + "|" + row.name;
        const existing = byKey.get(key);
        if (existing) {
            if (!existing.types.includes(row.type)) existing.types.push(row.type);
        } else {
            byKey.set(key, Object.assign({}, row, { types: [row.type] }));
        }
    });
    return Array.from(byKey.values());
}

function loadData() {
    return Promise.all([
        d3.csv("./data/pokemon.csv", parsePokemonRow),
        d3.csv("./data/moves.csv"),
        d3.csv("./data/evolution.csv"),
        d3.csv("./data/typechart.csv")
    ]).then(([pokemon, moves, evolution, typechart]) => {
        state.pokemon = consolidatePokemon(pokemon);
        state.moves = moves;
        state.evolution = evolution;
        state.typechart = typechart;
    });
}

/* ------------------------------ 布局 ------------------------------ */

function measure() {
    const el = document.querySelector(".vis-chart");
    state.width = el.clientWidth;
    state.height = el.clientHeight;
    state.innerW = Math.max(0, state.width - CONFIG.margin.left - CONFIG.margin.right);

    /* 图例按可用宽度自动换行，底部留白随之增长 */
    const legendCols = Math.max(1, Math.floor(state.innerW / LEGEND_ITEM_W));
    const legendRows = Math.ceil(TYPE_ORDER.length / legendCols);
    state.legend = { cols: legendCols, rows: legendRows };
    state.marginBottom = 56 + legendRows * LEGEND_ITEM_H;

    state.innerH = Math.max(0, state.height - CONFIG.margin.top - state.marginBottom);
}

/* ------------------------------ 绘制 ------------------------------ */

const xAccessor = d => d.hp;
const yAccessor = d => d.speed;

function draw() {
    const svg = state.svg;
    svg.selectAll("*").remove();
    svg.attr("width", state.width).attr("height", state.height);

    const data = state.pokemon;
    if (!data.length) return;

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, xAccessor))
        .range([0, state.innerW])
        .nice();
    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, yAccessor))
        .range([state.innerH, 0])
        .nice();

    const plot = svg.append("g")
        .attr("class", "plot")
        .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top})`);

    drawAxes(plot, xScale, yScale);
    drawDots(plot, xScale, yScale, data);
    drawLegend(svg);
}

function colorFor(d) {
    return TYPE_COLORS[d.types[0]] || FALLBACK_COLOR;
}

function drawLegend(svg) {
    const cols = state.legend.cols;
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top + state.innerH + 50})`);

    const items = legend.selectAll("g")
        .data(TYPE_ORDER)
        .enter()
        .append("g")
        .attr("transform", (d, i) =>
            `translate(${(i % cols) * LEGEND_ITEM_W},${Math.floor(i / cols) * LEGEND_ITEM_H})`);

    items.append("circle")
        .attr("cx", 5)
        .attr("cy", 6)
        .attr("r", 5)
        .attr("fill", d => TYPE_COLORS[d]);

    items.append("text")
        .attr("class", "legend-text")
        .attr("x", 15)
        .attr("y", 10)
        .text(d => d.charAt(0) + d.slice(1).toLowerCase());
}

function drawAxes(plot, xScale, yScale) {
    plot.append("g")
        .attr("class", "axis axis-x")
        .attr("transform", `translate(0,${state.innerH})`)
        .call(d3.axisBottom(xScale));

    plot.append("g")
        .attr("class", "axis axis-y")
        .call(d3.axisLeft(yScale));

    plot.append("text")
        .attr("class", "axis-title")
        .attr("text-anchor", "middle")
        .attr("x", -state.innerH / 2)
        .attr("y", -CONFIG.margin.left + 16)
        .attr("transform", "rotate(-90)")
        .text("Speed");

    plot.append("text")
        .attr("class", "axis-title")
        .attr("text-anchor", "middle")
        .attr("x", state.innerW / 2)
        .attr("y", state.innerH + 28)
        .text("HP");
}

function drawDots(plot, xScale, yScale, data) {
    plot.selectAll(".dot")
        .data(data, d => d.id + "|" + d.name)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(xAccessor(d)))
        .attr("cy", d => yScale(yAccessor(d)))
        .attr("r", CONFIG.pointRadius)
        .attr("fill", d => colorFor(d))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
}

/* ---------------------------- Tooltip ---------------------------- */

function tooltipHtml(d) {
    return (
        "#" + d.id + " " + d.name + "<br/>" +
        "Total: " + d.total + "<br/>" +
        "HP: " + d.hp + "<br/>" +
        "Attack: " + d.attack + "<br/>" +
        "Defense: " + d.defense + "<br/>" +
        "Sp. Atk: " + d.spAtk + "<br/>" +
        "Sp. Def: " + d.spDef + "<br/>" +
        "Speed: " + d.speed
    );
}

function showTooltip(d) {
    state.tooltip.html(tooltipHtml(d))
        .transition().duration(150)
        .style("opacity", 0.95);
    moveTooltip(d);
}

function moveTooltip(d) {
    const node = state.tooltip.node();
    const tw = node.offsetWidth;
    const th = node.offsetHeight;
    const pageW = document.documentElement.clientWidth + window.scrollX;
    const pageH = document.documentElement.clientHeight + window.scrollY;

    let x = d3.event.pageX + 16;
    let y = d3.event.pageY + 16;
    if (x + tw > pageW - 10) x = d3.event.pageX - tw - 16;
    if (y + th > pageH - 10) y = d3.event.pageY - th - 16;

    state.tooltip.style("left", x + "px").style("top", y + "px");
}

function hideTooltip() {
    state.tooltip.transition().duration(200).style("opacity", 0);
}

/* ------------------------------ 启动 ------------------------------ */

let resizeTimer;

function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        measure();
        draw();
    }, 150);
}

function init() {
    const container = d3.select(".vis-chart");
    state.svg = container.append("svg").attr("class", "scatter-svg");
    state.tooltip = container.append("div").attr("class", "tooltip");

    measure();
    draw();
    window.addEventListener("resize", onResize);

    loadData().then(draw).catch(err => console.error("数据加载失败:", err));
}

init();
