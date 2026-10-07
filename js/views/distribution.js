/* 视图：种族值分布（六维箱线图，支持属性筛选联动） */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.distribution = (function () {
    const MARGIN = { top: 64, right: 40, bottom: 44, left: 60 };
    const STATS = [
        ["HP", "hp"], ["Attack", "attack"], ["Defense", "defense"],
        ["Sp. Atk", "spAtk"], ["Sp. Def", "spDef"], ["Speed", "speed"]
    ];
    const COLORS = ["#e06666", "#f6a623", "#7fbf3f", "#3aa0d8", "#8e6fd0", "#d96aa7"];

    let tooltip;

    function stats(values) {
        const sorted = values.slice().sort(d3.ascending);
        const q1 = d3.quantile(sorted, 0.25);
        const median = d3.quantile(sorted, 0.5);
        const q3 = d3.quantile(sorted, 0.75);
        const iqr = q3 - q1;
        const lowFence = q1 - 1.5 * iqr;
        const highFence = q3 + 1.5 * iqr;
        return {
            min: d3.min(sorted),
            q1, median, q3,
            max: d3.max(sorted),
            whiskerLow: d3.min(sorted.filter(v => v >= lowFence)),
            whiskerHigh: d3.max(sorted.filter(v => v <= highFence)),
            outliers: sorted.filter(v => v < lowFence || v > highFence)
        };
    }

    function render(container) {
        const typeFilter = PV.selection.type;
        const data = typeFilter === "ALL"
            ? PV.state.pokemon
            : PV.state.pokemon.filter(p => p.types.includes(typeFilter));

        PV.measure(MARGIN);
        const { innerW, innerH } = PV.state;

        const svg = d3.select(container).append("svg")
            .attr("class", "distribution-svg")
            .attr("role", "img")
            .attr("aria-label", "六项种族值箱线分布图")
            .attr("width", PV.state.width)
            .attr("height", PV.state.height);

        tooltip = PV.createTooltip(container);

        svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 30)
            .text("种族值分布（箱线图）");

        const scope = typeFilter === "ALL" ? "全部属性" : PV.typeLabel(typeFilter) + " 属性";
        svg.append("text").attr("class", "chart-subtitle").attr("x", 24).attr("y", 48)
            .text(`${scope} · ${data.length} 只宝可梦`);

        if (!data.length) {
            svg.append("text").attr("class", "empty-state")
                .attr("x", PV.state.width / 2).attr("y", PV.state.height / 2)
                .attr("text-anchor", "middle").text("当前筛选下没有宝可梦");
            return;
        }

        const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        const xScale = d3.scaleBand()
            .domain(STATS.map(s => s[0]))
            .range([0, innerW])
            .padding(0.35);
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, p => d3.max(STATS.map(([, key]) => p[key])))])
            .range([innerH, 0])
            .nice();

        g.append("g").attr("class", "grid")
            .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(""));
        g.append("g").attr("class", "axis axis-x")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale));
        g.append("g").attr("class", "axis axis-y").call(d3.axisLeft(yScale));

        const boxW = Math.min(xScale.bandwidth(), 70);

        STATS.forEach(([label, key], i) => {
            const s = stats(data.map(p => p[key]));
            const cx = xScale(label) + xScale.bandwidth() / 2;
            const x0 = cx - boxW / 2;
            const color = COLORS[i];

            /* 须 */
            g.append("line").attr("class", "box-whisker")
                .attr("x1", cx).attr("x2", cx)
                .attr("y1", yScale(s.whiskerLow)).attr("y2", yScale(s.whiskerHigh))
                .attr("stroke", color);
            [s.whiskerLow, s.whiskerHigh].forEach(v => {
                g.append("line").attr("class", "box-whisker")
                    .attr("x1", x0 + boxW * 0.2).attr("x2", x0 + boxW * 0.8)
                    .attr("y1", yScale(v)).attr("y2", yScale(v))
                    .attr("stroke", color);
            });

            /* 箱体 */
            g.append("rect").attr("class", "box-rect")
                .attr("x", x0).attr("width", boxW)
                .attr("y", yScale(s.q3))
                .attr("height", Math.max(1, yScale(s.q1) - yScale(s.q3)))
                .attr("fill", color).attr("fill-opacity", 0.28)
                .attr("stroke", color)
                .style("cursor", "pointer")
                .on("mouseover", function () { tooltip.show(boxCard(label, s)); })
                .on("mousemove", tooltip.move)
                .on("mouseout", tooltip.hide);

            /* 中位数 */
            g.append("line").attr("class", "box-median")
                .attr("x1", x0).attr("x2", x0 + boxW)
                .attr("y1", yScale(s.median)).attr("y2", yScale(s.median))
                .attr("stroke", color).attr("stroke-width", 2.5);

            /* 离群点 */
            g.selectAll(`.box-outlier-${key}`)
                .data(s.outliers)
                .enter()
                .append("circle")
                .attr("class", "box-outlier")
                .attr("cx", cx).attr("cy", v => yScale(v)).attr("r", 2.5)
                .attr("fill", color).attr("fill-opacity", 0.6);
        });
    }

    function boxCard(label, s) {
        const row = (k, v) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`;
        return `<div class="tooltip-name">${label} 分布</div>` +
            `<div class="tooltip-stats">` +
            row("最小", s.min) + row("Q1", s.q1) + row("中位数", s.median) +
            row("Q3", s.q3) + row("最大", s.max) + row("离群点", s.outliers.length) +
            `</div>`;
    }

    function menu(menuEl) {
        const root = d3.select(menuEl);
        root.append("div").attr("class", "menu-title").text("种族值分布");

        const field = root.append("div").attr("class", "menu-field");
        field.append("label").text("按属性筛选（与其它视图联动）");
        const select = field.append("select").on("change", function () {
            PV.setSelection({ type: this.value });
        });
        select.append("option").attr("value", "ALL").text("全部");
        PV.TYPE_ORDER.forEach(t => select.append("option").attr("value", t).text(PV.typeLabel(t)));
        select.property("value", PV.selection.type);

        root.append("div").attr("class", "menu-hint")
            .text("箱体表示四分位区间，中间线为中位数，须为 1.5×IQR 范围，圆点为离群值；悬停箱体查看明细。");
    }

    function exportData() {
        const typeFilter = PV.selection.type;
        const data = typeFilter === "ALL"
            ? PV.state.pokemon
            : PV.state.pokemon.filter(p => p.types.includes(typeFilter));
        return STATS.map(([label, key]) => {
            const s = stats(data.map(p => p[key]));
            return { stat: label, min: s.min, q1: s.q1, median: s.median, q3: s.q3, max: s.max, outliers: s.outliers.length };
        });
    }

    return { label: "分布", render, menu, exportData };
})();
