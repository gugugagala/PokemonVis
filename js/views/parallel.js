/* 视图：六维种族值平行坐标 */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.parallel = (function () {
    const MARGIN = { top: 64, right: 60, bottom: 40, left: 60 };
    const AXES = [
        ["HP", "hp"], ["Attack", "attack"], ["Defense", "defense"],
        ["Sp. Atk", "spAtk"], ["Sp. Def", "spDef"], ["Speed", "speed"]
    ];

    let typeFilter = "ALL";
    let tooltip;

    function render(container) {
        const all = PV.state.pokemon;
        const data = typeFilter === "ALL" ? all : all.filter(p => p.types.includes(typeFilter));

        PV.measure(MARGIN);
        const innerW = PV.state.innerW;
        const innerH = PV.state.innerH;
        const gap = AXES.length > 1 ? innerW / (AXES.length - 1) : 0;

        /* 每条属性轴使用全体数据极值，保证坐标稳定 */
        const scales = AXES.map(([, key]) => {
            const ext = d3.extent(all, d => d[key]);
            return d3.scaleLinear().domain(ext).range([innerH, 0]);
        });

        const xOf = i => i * gap;

        const svg = d3.select(container).append("svg")
            .attr("class", "parallel-svg")
            .attr("width", PV.state.width)
            .attr("height", PV.state.height);

        tooltip = d3.select(container).append("div").attr("class", "tooltip");

        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", 24).attr("y", 30)
            .text(`六维平行坐标（${data.length} 只宝可梦）`);

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        /* 坐标轴 */
        AXES.forEach(([label, key], i) => {
            g.append("line")
                .attr("x1", xOf(i)).attr("y1", 0)
                .attr("x2", xOf(i)).attr("y2", innerH)
                .attr("stroke", "#d5dcda");

            g.append("text")
                .attr("class", "axis-label")
                .attr("x", xOf(i)).attr("y", -12)
                .attr("text-anchor", "middle")
                .text(label);

            const ext = scales[i].domain();
            g.append("text").attr("class", "parallel-tick")
                .attr("x", xOf(i)).attr("y", 0)
                .attr("text-anchor", i === 0 ? "start" : "middle")
                .text(Math.round(ext[1]));
            g.append("text").attr("class", "parallel-tick")
                .attr("x", xOf(i)).attr("y", innerH)
                .attr("text-anchor", i === 0 ? "start" : "middle")
                .attr("dy", "0.9em")
                .text(Math.round(ext[0]));
        });

        /* 线条 */
        const line = d3.line();
        const point = (i, key) => [xOf(i), scales[i](key)];

        g.selectAll(".pc-line")
            .data(data, d => d.id + "|" + d.name)
            .enter()
            .append("path")
            .attr("class", "pc-line")
            .attr("d", d => line(AXES.map(([, key], i) => [xOf(i), scales[i](d[key])])))
            .attr("fill", "none")
            .attr("stroke", d => PV.colorFor(d))
            .attr("stroke-width", 1.2)
            .style("cursor", "pointer")
            .on("mouseover", function (d) {
                d3.select(this)
                    .raise()
                    .attr("stroke-width", 2.5)
                    .attr("opacity", 1);
                showTooltip(d);
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", function () {
                d3.select(this).attr("stroke-width", 1.2).attr("opacity", 0.12);
                hideTooltip();
            })
            .on("click", d => PV.radar.show(d));
    }

    function showTooltip(p) {
        const badge = p.types
            .map(t => `<span class="type-badge" style="background:${PV.TYPE_COLORS[t] || PV.FALLBACK_COLOR}">${PV.typeLabel(t)}</span>`)
            .join("");
        tooltip.html(
            `<div class="tooltip-name">#${p.id} ${p.name}</div>` +
            `<div class="tooltip-types">${badge}</div>` +
            `<div class="tooltip-total">Total <b>${p.total}</b></div>`
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
        root.append("div").attr("class", "menu-title").text("平行坐标");

        const field = root.append("div").attr("class", "menu-field");
        field.append("label").text("按属性筛选");
        const select = field.append("select").on("change", function () {
            typeFilter = this.value;
            PV.renderActive();
        });
        select.append("option").attr("value", "ALL").text("全部");
        PV.TYPE_ORDER.forEach(t => select.append("option").attr("value", t).text(PV.typeLabel(t)));
        select.property("value", typeFilter);

        root.append("div").attr("class", "menu-hint")
            .text("每条线为一只宝可梦，横跨六项种族值；悬停高亮，点击查看雷达图。");
    }

    return { label: "平行坐标", render, menu };
})();
