/* 视图：双属性组合和弦图（属性之间的共现关系） */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.typechord = (function () {
    const MARGIN = { top: 64, right: 30, bottom: 30, left: 30 };

    let tooltip;

    function buildMatrix() {
        const types = PV.TYPE_ORDER;
        const index = new Map(types.map((t, i) => [t, i]));
        const n = types.length;
        const matrix = Array.from({ length: n }, () => new Array(n).fill(0));

        PV.state.pokemon.forEach(p => {
            if (p.types.length !== 2) return;
            const a = index.get(p.types[0]);
            const b = index.get(p.types[1]);
            if (a == null || b == null) return;
            matrix[a][b] += 1;
            matrix[b][a] += 1;
        });
        return matrix;
    }

    function render(container) {
        const matrix = buildMatrix();

        PV.measure(MARGIN);
        const { innerW, innerH } = PV.state;
        const radius = Math.max(40, Math.min(innerW, innerH) / 2 - 34);
        const cx = innerW / 2;
        const cy = innerH / 2;

        const svg = d3.select(container).append("svg")
            .attr("class", "chord-svg")
            .attr("role", "img")
            .attr("aria-label", "双属性组合和弦图")
            .attr("width", PV.state.width)
            .attr("height", PV.state.height);

        tooltip = PV.createTooltip(container);

        svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 30)
            .text("双属性组合（和弦图）");
        svg.append("text").attr("class", "chart-subtitle").attr("x", 24).attr("y", 48)
            .text("仅统计双属性宝可梦；弦的宽度表示该属性组合的数量");

        const g = svg.append("g").attr("transform", `translate(${MARGIN.left + cx},${MARGIN.top + cy})`);

        const chords = d3.chord().padAngle(0.045).sortSubgroups(d3.descending)(matrix);

        const arc = d3.arc().innerRadius(radius - 14).outerRadius(radius);
        const ribbon = d3.ribbon().radius(radius - 14);
        const colorOf = i => PV.TYPE_COLORS[PV.TYPE_ORDER[i]] || PV.FALLBACK_COLOR;

        /* 弦 */
        g.append("g").attr("class", "chords").selectAll("path")
            .data(chords)
            .enter()
            .append("path")
            .attr("d", ribbon)
            .attr("fill", d => colorOf(d.source.index))
            .attr("fill-opacity", 0.55)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mouseover", function (d) {
                d3.select(this).raise().attr("fill-opacity", 0.9);
                const a = PV.TYPE_ORDER[d.source.index];
                const b = PV.TYPE_ORDER[d.target.index];
                tooltip.show(
                    `<div class="tooltip-name">${PV.typeLabel(a)} ↔ ${PV.typeLabel(b)}</div>` +
                    `<div class="tooltip-total">组合 <b>${d.source.value}</b> 只</div>`
                );
            })
            .on("mousemove", tooltip.move)
            .on("mouseout", function () {
                d3.select(this).attr("fill-opacity", 0.55);
                tooltip.hide();
            });

        /* 外圈属性弧 + 标签 */
        const group = g.append("g").selectAll("g")
            .data(chords.groups)
            .enter()
            .append("g");

        group.append("path")
            .attr("d", arc)
            .attr("fill", d => colorOf(d.index))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.5);

        group.append("text")
            .each(function (d) { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", "0.35em")
            .attr("transform", d =>
                `rotate(${d.angle * 180 / Math.PI - 90}) translate(${radius + 12})` +
                (d.angle > Math.PI ? " rotate(180)" : ""))
            .attr("text-anchor", d => (d.angle > Math.PI ? "end" : "start"))
            .attr("class", "chord-label")
            .text(d => PV.typeLabel(PV.TYPE_ORDER[d.index]));
    }

    function menu(menuEl) {
        const root = d3.select(menuEl);
        root.append("div").attr("class", "menu-title").text("双属性组合");
        root.append("div").attr("class", "menu-hint")
            .text("外圈为 18 种属性，两种属性之间的弦表示「这两种属性作为组合出现过多少次」；悬停弦查看数量。");
    }

    function exportData() {
        const types = PV.TYPE_ORDER;
        const matrix = buildMatrix();
        const rows = [];
        for (let i = 0; i < types.length; i++) {
            for (let j = i + 1; j < types.length; j++) {
                if (matrix[i][j] > 0) {
                    rows.push({ typeA: PV.typeLabel(types[i]), typeB: PV.typeLabel(types[j]), count: matrix[i][j] / 2 });
                }
            }
        }
        return rows.sort((a, b) => b.count - a.count);
    }

    return { label: "属性组合", render, menu, exportData };
})();
