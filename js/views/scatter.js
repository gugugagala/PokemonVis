/* 视图：HP × Speed 散点图（按属性着色，半径编码 Total） */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.scatter = (function () {
    const LEGEND_ITEM_W = 78;
    const LEGEND_ITEM_H = 20;

    const xAccessor = d => d.hp;
    const yAccessor = d => d.speed;

    let svg, tooltip;

    function layout(el) {
        const width = el.clientWidth;
        const height = el.clientHeight;
        const innerW = Math.max(0, width - PV.MARGIN.left - PV.MARGIN.right);
        const cols = Math.max(1, Math.floor(innerW / LEGEND_ITEM_W));
        const rows = Math.ceil(PV.TYPE_ORDER.length / cols);
        const bottom = 56 + rows * LEGEND_ITEM_H;
        const innerH = Math.max(0, height - PV.MARGIN.top - bottom);
        return { width, height, innerW, innerH, cols };
    }

    function render(container) {
        const data = PV.state.pokemon;
        const box = layout(container);

        svg = d3.select(container).append("svg")
            .attr("class", "scatter-svg")
            .attr("width", box.width)
            .attr("height", box.height);

        tooltip = d3.select(container).append("div").attr("class", "tooltip");

        if (!data.length) return;

        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, xAccessor))
            .range([0, box.innerW])
            .nice();
        const yScale = d3.scaleLinear()
            .domain(d3.extent(data, yAccessor))
            .range([box.innerH, 0])
            .nice();
        const rScale = d3.scaleSqrt()
            .domain(d3.extent(data, d => d.total))
            .range([3, 14]);

        const plot = svg.append("g")
            .attr("class", "plot")
            .attr("transform", `translate(${PV.MARGIN.left},${PV.MARGIN.top})`);

        drawGrid(plot, xScale, yScale, box);
        drawAxes(plot, xScale, yScale, box);
        drawDots(plot, xScale, yScale, rScale, data);
        drawLegend(svg, box);
        drawTitle(svg);
    }

    function drawTitle(svg) {
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", PV.MARGIN.left)
            .attr("y", 26)
            .text("宝可梦种族值分布（HP × Speed）");
    }

    function drawGrid(plot, xScale, yScale, box) {
        plot.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${box.innerH})`)
            .call(d3.axisBottom(xScale).tickSize(-box.innerH).tickFormat(""));

        plot.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale).tickSize(-box.innerW).tickFormat(""));
    }

    function drawAxes(plot, xScale, yScale, box) {
        plot.append("g")
            .attr("class", "axis axis-x")
            .attr("transform", `translate(0,${box.innerH})`)
            .call(d3.axisBottom(xScale));

        plot.append("g")
            .attr("class", "axis axis-y")
            .call(d3.axisLeft(yScale));

        plot.append("text")
            .attr("class", "axis-title")
            .attr("text-anchor", "middle")
            .attr("x", -box.innerH / 2)
            .attr("y", -PV.MARGIN.left + 16)
            .attr("transform", "rotate(-90)")
            .text("Speed");

        plot.append("text")
            .attr("class", "axis-title")
            .attr("text-anchor", "middle")
            .attr("x", box.innerW / 2)
            .attr("y", box.innerH + 28)
            .text("HP");
    }

    function drawDots(plot, xScale, yScale, rScale, data) {
        const radius = d => rScale(d.total);

        const dots = plot.selectAll(".dot")
            .data(data, d => d.id + "|" + d.name)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(xAccessor(d)))
            .attr("cy", d => yScale(yAccessor(d)))
            .attr("r", 0)
            .attr("fill", d => PV.colorFor(d))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mouseover", function (d) {
                d3.select(this).attr("r", radius(d) * 1.6);
                showTooltip(d);
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", function (d) {
                d3.select(this).attr("r", radius(d));
                hideTooltip();
            });

        dots.transition()
            .duration(PV.TRANSITION)
            .ease(d3.easeCubicOut)
            .attr("r", radius);
    }

    function drawLegend(svg, box) {
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${PV.MARGIN.left},${PV.MARGIN.top + box.innerH + 50})`);

        const items = legend.selectAll("g")
            .data(PV.TYPE_ORDER)
            .enter()
            .append("g")
            .attr("transform", (d, i) =>
                `translate(${(i % box.cols) * LEGEND_ITEM_W},${Math.floor(i / box.cols) * LEGEND_ITEM_H})`);

        items.append("circle")
            .attr("cx", 5).attr("cy", 6).attr("r", 5)
            .attr("fill", d => PV.TYPE_COLORS[d]);

        items.append("text")
            .attr("class", "legend-text")
            .attr("x", 15).attr("y", 10)
            .text(d => PV.typeLabel(d));
    }

    /* ---------------------------- Tooltip ---------------------------- */

    function tooltipHtml(d) {
        const badges = d.types
            .map(t => `<span class="type-badge" style="background:${PV.TYPE_COLORS[t] || PV.FALLBACK_COLOR}">${PV.typeLabel(t)}</span>`)
            .join("");

        const stats = [
            ["HP", d.hp], ["Attack", d.attack], ["Defense", d.defense],
            ["Sp. Atk", d.spAtk], ["Sp. Def", d.spDef], ["Speed", d.speed]
        ].map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join("");

        return `<div class="tooltip-name">#${d.id} ${d.name}</div>` +
            `<div class="tooltip-types">${badges}</div>` +
            `<div class="tooltip-total">Total <b>${d.total}</b></div>` +
            `<div class="tooltip-stats">${stats}</div>`;
    }

    function showTooltip(d) {
        tooltip.html(tooltipHtml(d))
            .transition().duration(150)
            .style("opacity", 0.95);
        moveTooltip(d);
    }

    function moveTooltip() {
        const node = tooltip.node();
        const tw = node.offsetWidth;
        const th = node.offsetHeight;
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

    return { label: "散点图", render };
})();
