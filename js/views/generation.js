/* 视图：世代趋势（各世代宝可梦种族值均值的折线图） */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.generation = (function () {
    const MARGIN = { top: 64, right: 40, bottom: 70, left: 60 };
    const STATS = [
        ["HP", "hp"], ["Attack", "attack"], ["Defense", "defense"],
        ["Sp. Atk", "spAtk"], ["Sp. Def", "spDef"], ["Speed", "speed"]
    ];
    const LINE_COLORS = ["#e06666", "#f6a623", "#7fbf3f", "#3aa0d8", "#8e6fd0", "#d96aa7"];

    let metric = "all";
    let tooltip;

    function aggregate() {
        const byGen = new Map();
        PV.state.pokemon.forEach(p => {
            if (!p.generation) return;
            if (!byGen.has(p.generation)) byGen.set(p.generation, []);
            byGen.get(p.generation).push(p);
        });
        const gens = Array.from(byGen.keys()).sort((a, b) => a - b);
        const rows = gens.map(g => {
            const list = byGen.get(g);
            const row = { generation: g, count: list.length };
            STATS.forEach(([, key]) => { row[key] = d3.mean(list, d => d[key]); });
            row.total = d3.mean(list, d => d.total);
            return row;
        });
        return rows;
    }

    /* 当前指标对应的系列：{ label, key, color } */
    function series() {
        if (metric === "all") {
            return STATS.map(([label, key], i) => ({ label, key, color: LINE_COLORS[i] }));
        }
        if (metric === "total") return [{ label: "种族值总和", key: "total", color: "#2c3e50" }];
        const found = STATS.find(([, key]) => key === metric);
        return [{ label: found ? found[0] : metric, key: metric, color: "#0a7ea4" }];
    }

    function render(container) {
        const rows = aggregate();
        const lines = series();

        PV.measure(MARGIN);
        const { innerW, innerH } = PV.state;

        const svg = d3.select(container).append("svg")
            .attr("class", "generation-svg")
            .attr("role", "img")
            .attr("aria-label", "各世代宝可梦种族值均值趋势")
            .attr("width", PV.state.width)
            .attr("height", PV.state.height);

        tooltip = PV.createTooltip(container);

        svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 30)
            .text("世代趋势（各世代种族值均值）");

        const counts = rows.map(r => `第${r.generation}世代 ${r.count}`).join("　·　");
        svg.append("text").attr("class", "chart-subtitle").attr("x", 24).attr("y", 48)
            .text(counts);

        if (!rows.length) return;

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        const xScale = d3.scalePoint()
            .domain(rows.map(r => r.generation))
            .range([0, innerW]);

        const values = [];
        rows.forEach(r => lines.forEach(s => values.push(r[s.key])));
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(values)])
            .range([innerH, 0])
            .nice();

        /* 网格与坐标轴 */
        g.append("g").attr("class", "grid")
            .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(""));
        g.append("g").attr("class", "axis axis-x")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).tickFormat(d => "第" + d + "世代"));
        g.append("g").attr("class", "axis axis-y").call(d3.axisLeft(yScale));

        const lineGen = d3.line()
            .x(r => xScale(r.generation))
            .y(r => yScale(r[lines[0].key]));

        lines.forEach(s => {
            const line = d3.line().x(r => xScale(r.generation)).y(r => yScale(r[s.key]));
            g.append("path")
                .datum(rows)
                .attr("class", "gen-line")
                .attr("d", line)
                .attr("fill", "none")
                .attr("stroke", s.color)
                .attr("stroke-width", 2);

            g.selectAll(`.gen-point-${s.key}`)
                .data(rows)
                .enter()
                .append("circle")
                .attr("class", "gen-point")
                .attr("cx", r => xScale(r.generation))
                .attr("cy", r => yScale(r[s.key]))
                .attr("r", 4)
                .attr("fill", s.color)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1)
                .style("cursor", "pointer")
                .on("mouseover", function (r) {
                    d3.select(this).attr("r", 7);
                    tooltip.show(
                        `<div class="tooltip-name">第${r.generation}世代</div>` +
                        `<div class="tooltip-total">${s.label} <b>${r[s.key].toFixed(1)}</b></div>` +
                        `<div class="tooltip-total">样本 <b>${r.count}</b></div>`
                    );
                })
                .on("mousemove", tooltip.move)
                .on("mouseout", function () {
                    d3.select(this).attr("r", 4);
                    tooltip.hide();
                });
        });

        if (lines.length > 1) drawLegend(svg);
        void lineGen;
    }

    function drawLegend(svg) {
        const legend = svg.append("g")
            .attr("class", "gen-legend")
            .attr("transform", `translate(${MARGIN.left},${PV.state.height - 26})`);

        const items = legend.selectAll("g")
            .data(series())
            .enter()
            .append("g")
            .attr("transform", (d, i) => `translate(${i * 110},0)`);

        items.append("rect").attr("width", 14).attr("height", 4).attr("y", 4).attr("rx", 2)
            .attr("fill", d => d.color);
        items.append("text").attr("x", 20).attr("y", 9).attr("class", "legend-text").text(d => d.label);
    }

    function menu(menuEl) {
        const root = d3.select(menuEl);
        root.append("div").attr("class", "menu-title").text("世代趋势");

        const field = root.append("div").attr("class", "menu-field");
        field.append("label").text("指标");
        const select = field.append("select").on("change", function () {
            metric = this.value;
            PV.renderActive();
        });
        [["all", "六维均值"], ["total", "种族值总和"]].forEach(([v, label]) =>
            select.append("option").attr("value", v).text(label));
        STATS.forEach(([label, key]) => select.append("option").attr("value", key).text(label));
        select.property("value", metric);

        root.append("div").attr("class", "menu-hint")
            .text("折线为各世代宝可梦该项数值的平均值；样本数显示在副标题中。");
    }

    function exportData() {
        return aggregate().map(r => {
            const row = { generation: r.generation, count: r.count, total: Math.round(r.total) };
            STATS.forEach(([, key]) => { row[key] = Math.round(r[key]); });
            return row;
        });
    }

    return { label: "世代趋势", render, menu, exportData };
})();
