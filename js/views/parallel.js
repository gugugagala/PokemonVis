/* 视图：六维种族值平行坐标（支持逐轴刷选，联动其它视图过滤） */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.parallel = (function () {
    const MARGIN = { top: 64, right: 60, bottom: 40, left: 60 };
    const AXES = [
        ["HP", "hp"], ["Attack", "attack"], ["Defense", "defense"],
        ["Sp. Atk", "spAtk"], ["Sp. Def", "spDef"], ["Speed", "speed"]
    ];

    let tooltip;

    function lineOpacity(d) {
        if (!PV.matchesRanges(d)) return 0.04;
        return PV.selection.name === d.name ? 1 : 0.12;
    }

    function activeRangesText(data) {
        if (!PV.hasRanges()) return `六维平行坐标（${data.length} 只宝可梦）`;
        const hit = data.filter(PV.matchesRanges).length;
        const dims = Object.keys(PV.selection.ranges).length;
        return `六维平行坐标（刷选 ${dims} 轴，命中 ${hit} / ${data.length} 只）`;
    }

    function render(container) {
        const all = PV.state.pokemon;
        const typeFilter = PV.selection.type;
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
            .attr("role", "img")
            .attr("aria-label", "六维种族值平行坐标图")
            .attr("width", PV.state.width)
            .attr("height", PV.state.height);

        tooltip = PV.createTooltip(container);

        const title = svg.append("text")
            .attr("class", "chart-title")
            .attr("x", 24).attr("y", 30)
            .text(activeRangesText(data));

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        if (!data.length) {
            svg.append("text")
                .attr("class", "empty-state")
                .attr("x", PV.state.width / 2)
                .attr("y", PV.state.height / 2)
                .attr("text-anchor", "middle")
                .text("当前筛选下没有宝可梦");
            return;
        }

        /* 坐标轴 */
        AXES.forEach(([label], i) => {
            g.append("line")
                .attr("x1", xOf(i)).attr("y1", 0)
                .attr("x2", xOf(i)).attr("y2", innerH)
                .attr("stroke", "#d5dcda");

            g.append("text")
                .attr("class", "axis-label")
                .attr("x", xOf(i)).attr("y", -12)
                .attr("text-anchor", "middle")
                .text(label);
        });

        /* 线条 */
        const line = d3.line();
        const lines = g.selectAll(".pc-line")
            .data(data, d => d.id + "|" + d.name)
            .enter()
            .append("path")
            .attr("class", "pc-line")
            .attr("d", d => line(AXES.map(([, key], i) => [xOf(i), scales[i](d[key])])))
            .attr("fill", "none")
            .attr("stroke", d => PV.colorFor(d))
            .attr("stroke-width", d => (PV.selection.name === d.name ? 3 : 1.2))
            .attr("opacity", d => lineOpacity(d))
            .style("cursor", "pointer")
            .on("mouseover", function (d) {
                d3.select(this).raise().attr("stroke-width", 2.5).attr("opacity", 1);
                tooltip.show(PV.pokemonCard(d));
            })
            .on("mousemove", tooltip.move)
            .on("mouseout", function (d) {
                const selected = PV.selection.name === d.name;
                d3.select(this)
                    .attr("stroke-width", selected ? 3 : 1.2)
                    .attr("opacity", lineOpacity(d));
                tooltip.hide();
            })
            .on("click", d => {
                PV.setSelection({ name: d.name });
                PV.radar.show(d);
            });

        lines.filter(d => PV.selection.name === d.name).raise();

        function applyRanges() {
            lines.attr("opacity", d => lineOpacity(d));
            title.text(activeRangesText(data));
        }

        /* 逐轴刷选 */
        AXES.forEach(([label, key], i) => {
            const brush = d3.brushY()
                .extent([[-11, 0], [11, innerH]])
                .on("brush end", function () {
                    const sel = d3.event.selection;
                    if (!sel) {
                        delete PV.selection.ranges[key];
                    } else {
                        const v0 = scales[i].invert(sel[0]);
                        const v1 = scales[i].invert(sel[1]);
                        PV.selection.ranges[key] = [Math.min(v0, v1), Math.max(v0, v1)];
                    }
                    applyRanges();
                    PV.renderChip();
                });

            g.append("g")
                .attr("class", "brush")
                .attr("transform", `translate(${xOf(i)},0)`)
                .call(brush);
        });
    }

    function menu(menuEl) {
        const root = d3.select(menuEl);
        root.append("div").attr("class", "menu-title").text("平行坐标");

        const field = root.append("div").attr("class", "menu-field");
        field.append("label").text("按属性筛选（与其它视图联动）");
        const select = field.append("select").on("change", function () {
            PV.setSelection({ type: this.value });
        });
        select.append("option").attr("value", "ALL").text("全部");
        PV.TYPE_ORDER.forEach(t => select.append("option").attr("value", t).text(PV.typeLabel(t)));
        select.property("value", PV.selection.type);

        const clear = root.append("button").attr("type", "button").attr("class", "tool-btn")
            .text("清除刷选")
            .on("click", () => PV.clearRanges());

        root.append("div").attr("class", "menu-hint")
            .text("在任意属性轴上拖拽即可刷选范围，命中结果会同步到散点/分布等视图；悬停高亮，点击查看雷达图。");

        void clear;
    }

    function exportData() {
        const sel = PV.selection.type;
        const base = sel === "ALL" ? PV.state.pokemon : PV.state.pokemon.filter(p => p.types.includes(sel));
        const rows = PV.hasRanges() ? base.filter(PV.matchesRanges) : base;
        return rows.map(p => ({
            id: p.id, name: p.name, type: p.types.join("/"),
            total: p.total, hp: p.hp, attack: p.attack, defense: p.defense,
            spAtk: p.spAtk, spDef: p.spDef, speed: p.speed
        }));
    }

    return { label: "平行坐标", render, menu, exportData };
})();
