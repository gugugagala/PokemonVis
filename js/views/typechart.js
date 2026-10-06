/* 视图：属性克制矩阵（18×18 热力图） */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.typechart = (function () {
    const MARGIN = { top: 84, right: 24, bottom: 56, left: 96 };

    const MULT_COLORS = { 0: "#2f3640", 0.5: "#e06666", 1: "#f2f2f2", 2: "#6aa84f" };
    const MULT_LABELS = { 0: "无效", 0.5: "效果不佳", 1: "一般", 2: "效果拔群" };
    const MULT_SYMBOL = { 0: "0", 0.5: "½", 1: "", 2: "2" };

    let highlight = "ALL";
    let onlyEffective = false;
    let tooltip;

    function buildMatrix(rows) {
        const map = new Map();
        rows.forEach(r => map.set(r.Attack + "|" + r.Defense, +r.Multiplier));
        return (attack, defense) => map.get(attack + "|" + defense);
    }

    function render(container) {
        const data = PV.state.typechart;
        const types = PV.TYPE_ORDER;
        const get = buildMatrix(data);

        PV.measure(MARGIN);
        const { innerW, innerH } = PV.state;
        const cell = Math.min(innerW / types.length, innerH / types.length);
        const gridSize = cell * types.length;
        const offsetX = Math.max(0, (innerW - gridSize) / 2);
        const offsetY = Math.max(0, (innerH - gridSize) / 2);

        const svg = d3.select(container).append("svg")
            .attr("class", "heatmap-svg")
            .attr("width", PV.state.width)
            .attr("height", PV.state.height);

        tooltip = d3.select(container).append("div").attr("class", "tooltip");

        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", 24)
            .attr("y", 30)
            .text("属性克制矩阵（行：攻击方，列：防御方）");

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left + offsetX},${MARGIN.top + offsetY})`);

        const isDim = (a, d) => {
            const m = get(a, d);
            if (highlight !== "ALL" && a !== highlight) return true;
            if (onlyEffective && m === 1) return true;
            return false;
        };

        /* 单元格 */
        const cells = [];
        types.forEach(a => types.forEach(d => cells.push({ attack: a, defense: d, mult: get(a, d) })));

        g.selectAll(".cell")
            .data(cells)
            .enter()
            .append("rect")
            .attr("class", "cell")
            .attr("x", d => types.indexOf(d.defense) * cell)
            .attr("y", d => types.indexOf(d.attack) * cell)
            .attr("width", cell)
            .attr("height", cell)
            .attr("fill", d => MULT_COLORS[d.mult] || "#f2f2f2")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.5)
            .style("opacity", d => (isDim(d.attack, d.defense) ? 0.15 : 1))
            .on("mouseover", function (d) {
                d3.select(this).attr("stroke", "#2c3e50").attr("stroke-width", 1.5);
                showTooltip(d);
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", function () {
                d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 0.5);
                hideTooltip();
            });

        /* 倍率符号 */
        if (cell >= 16) {
            g.selectAll(".cell-label")
                .data(cells)
                .enter()
                .append("text")
                .attr("class", "cell-label")
                .attr("x", d => types.indexOf(d.defense) * cell + cell / 2)
                .attr("y", d => types.indexOf(d.attack) * cell + cell / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .attr("font-size", cell * 0.5)
                .attr("fill", d => (d.mult === 1 ? "#555555" : "#ffffff"))
                .style("pointer-events", "none")
                .text(d => MULT_SYMBOL[d.mult]);
        }

        /* 列标签（防御方） */
        g.selectAll(".col-label")
            .data(types)
            .enter()
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", (d, i) => `translate(${i * cell + cell / 2},-8) rotate(-45)`)
            .attr("text-anchor", "start")
            .text(d => PV.typeLabel(d));

        /* 行标签（攻击方） */
        g.selectAll(".row-label")
            .data(types)
            .enter()
            .append("text")
            .attr("class", "axis-label")
            .attr("x", -8)
            .attr("y", (d, i) => i * cell + cell / 2)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "central")
            .text(d => PV.typeLabel(d));

        drawLegend(svg);
    }

    function drawLegend(svg) {
        const legend = svg.append("g")
            .attr("class", "mult-legend")
            .attr("transform", `translate(${MARGIN.left},${PV.state.height - 26})`);

        const items = legend.selectAll("g")
            .data([0, 0.5, 1, 2])
            .enter()
            .append("g")
            .attr("transform", (d, i) => `translate(${i * 120},0)`);

        items.append("rect").attr("width", 14).attr("height", 14).attr("rx", 2)
            .attr("fill", d => MULT_COLORS[d]).attr("stroke", "#cccccc");
        items.append("text").attr("x", 20).attr("y", 12).attr("class", "legend-text")
            .text(d => `${MULT_SYMBOL[d] || "1"} × ${MULT_LABELS[d]}`);
    }

    function showTooltip(d) {
        tooltip.html(
            `<div class="tooltip-name">${PV.typeLabel(d.attack)} → ${PV.typeLabel(d.defense)}</div>` +
            `<div>${d.mult} × ${MULT_LABELS[d.mult] || "一般"}</div>`
        ).transition().duration(120).style("opacity", 0.95);
        moveTooltip();
    }

    function moveTooltip() {
        const node = tooltip.node();
        const tw = node.offsetWidth, th = node.offsetHeight;
        const pageW = document.documentElement.clientWidth + window.scrollX;
        const pageH = document.documentElement.clientHeight + window.scrollY;
        let x = d3.event.pageX + 16;
        let y = d3.event.pageY + 16;
        if (x + tw > pageW - 10) x = d3.event.pageX - tw - 16;
        if (y + th > pageH - 10) y = d3.event.pageY - th - 16;
        tooltip.style("left", x + "px").style("top", y + "px");
    }

    function hideTooltip() {
        tooltip.transition().duration(200).style("opacity", 0);
    }

    function menu(menuEl) {
        const root = d3.select(menuEl);
        root.append("div").attr("class", "menu-title").text("属性克制");

        const field = root.append("div").attr("class", "menu-field");
        field.append("label").text("高亮攻击属性");
        const select = field.append("select")
            .on("change", function () {
                highlight = this.value;
                PV.renderActive();
            });
        select.append("option").attr("value", "ALL").text("全部");
        PV.TYPE_ORDER.forEach(t => select.append("option").attr("value", t).text(PV.typeLabel(t)));

        const check = root.append("label").attr("class", "menu-checkbox");
        check.append("input").attr("type", "checkbox")
            .on("change", function () {
                onlyEffective = this.checked;
                PV.renderActive();
            });
        check.append("span").text("隐藏一般效果（1×）");
    }

    return { label: "属性克制", render, menu };
})();
