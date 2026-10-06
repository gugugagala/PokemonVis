/* PokemonVis —— 宝可梦属性散点图可视化主逻辑 */

const CONFIG = {
    margin: { top: 50, right: 40, bottom: 80, left: 70 },
    pointRadius: 5,
    pointColor: "#568100",
    transition: 300
};

const state = {
    width: 0,
    height: 0,
    innerW: 0,
    innerH: 0,
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
    state.innerH = Math.max(0, state.height - CONFIG.margin.top - CONFIG.margin.bottom);
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
        .attr("y", state.innerH + CONFIG.margin.bottom - 30)
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
        .attr("fill", CONFIG.pointColor)
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
