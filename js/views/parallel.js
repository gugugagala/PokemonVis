/* 视图：六维种族值平行坐标 */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.parallel = (function () {
    const MARGIN = { top: 64, right: 60, bottom: 40, left: 60 };
    const AXES = [
        ["HP", "hp"], ["Attack", "attack"], ["Defense", "defense"],
        ["Sp. Atk", "spAtk"], ["Sp. Def", "spDef"], ["Speed", "speed"]
    ];

    let tooltip;

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
            .classed("selected", d => PV.selection.name === d.name)
            .on("mouseover", function (d) {
                d3.select(this)
                    .raise()
                    .attr("stroke-width", 2.5)
                    .attr("opacity", 1);
                tooltip.show(PV.pokemonCard(d));
            })
            .on("mousemove", tooltip.move)
            .on("mouseout", function (d) {
                d3.select(this)
                    .attr("stroke-width", PV.selection.name === d.name ? 3 : 1.2)
                    .attr("opacity", PV.selection.name === d.name ? 1 : 0.12);
                tooltip.hide();
            })
            .on("click", d => {
                PV.setSelection({ name: d.name });
                PV.radar.show(d);
            });

        g.selectAll(".pc-line.selected").raise();
    }

    function menu(menuEl) {
        const root = d3.select(menuEl);
        root.append("div").attr("class", "menu-title").text("平行坐标");

        const field = root.append("div").attr("class", "menu-field");
        field.append("label").text("按属性筛选（与散点图联动）");
        const select = field.append("select").on("change", function () {
            PV.setSelection({ type: this.value });
        });
        select.append("option").attr("value", "ALL").text("全部");
        PV.TYPE_ORDER.forEach(t => select.append("option").attr("value", t).text(PV.typeLabel(t)));
        select.property("value", PV.selection.type);

        root.append("div").attr("class", "menu-hint")
            .text("每条线为一只宝可梦，横跨六项种族值；悬停高亮，点击查看雷达图。");
    }

    function exportData() {
        const sel = PV.selection.type;
        const rows = sel === "ALL" ? PV.state.pokemon : PV.state.pokemon.filter(p => p.types.includes(sel));
        return rows.map(p => ({
            id: p.id, name: p.name, type: p.types.join("/"),
            total: p.total, hp: p.hp, attack: p.attack, defense: p.defense,
            spAtk: p.spAtk, spDef: p.spDef, speed: p.speed
        }));
    }

    return { label: "平行坐标", render, menu, exportData };
})();
