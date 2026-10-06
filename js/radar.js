/* 通用组件：宝可梦六维种族值雷达图（浮层面板，供各视图联动调用） */
window.PV = window.PV || {};

PV.radar = (function () {
    const STATS = [
        ["HP", "hp"], ["Attack", "attack"], ["Defense", "defense"],
        ["Sp. Atk", "spAtk"], ["Sp. Def", "spDef"], ["Speed", "speed"]
    ];
    const SIZE = 260;
    const R = 92;

    let panel;

    function statMax(key) {
        return d3.max(PV.state.pokemon, d => d[key]) || 1;
    }

    const angle = i => -Math.PI / 2 + i * 2 * Math.PI / STATS.length;

    function pointAt(cx, cy, i, ratio) {
        return [cx + ratio * R * Math.cos(angle(i)), cy + ratio * R * Math.sin(angle(i))];
    }

    function ensurePanel() {
        if (panel) return;
        panel = d3.select("body").append("div").attr("class", "radar-panel")
            .attr("role", "dialog")
            .attr("aria-label", "宝可梦种族值雷达图")
            .style("display", "none");
        panel.append("button").attr("class", "radar-close")
            .attr("type", "button")
            .attr("aria-label", "关闭雷达图")
            .text("✕")
            .on("click", hide);
        panel.append("div").attr("class", "radar-body");
    }

    function show(pokemon) {
        if (!pokemon) return;
        ensurePanel();
        panel.style("display", "block");

        const body = panel.select(".radar-body");
        body.html("");

        const badges = pokemon.types
            .map(t => `<span class="type-badge" style="background:${PV.TYPE_COLORS[t] || PV.FALLBACK_COLOR}">${PV.typeLabel(t)}</span>`)
            .join("");
        body.append("div").attr("class", "radar-title")
            .html(`#${pokemon.id} ${pokemon.name}`);
        body.append("div").attr("class", "radar-types").html(badges);

        const cx = SIZE / 2, cy = SIZE / 2;
        const svg = body.append("svg").attr("width", SIZE).attr("height", SIZE);
        const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

        /* 网格环 */
        [0.25, 0.5, 0.75, 1].forEach(ratio => {
            const pts = STATS.map((_, i) => pointAt(0, 0, i, ratio));
            g.append("polygon")
                .attr("points", pts.map(p => p.join(",")).join(" "))
                .attr("fill", "none")
                .attr("stroke", "#e0e6e4");
        });

        /* 轴线与标签 */
        STATS.forEach(([label], i) => {
            const [x, y] = pointAt(0, 0, i, 1);
            g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", x).attr("y2", y)
                .attr("stroke", "#e0e6e4");

            const [lx, ly] = pointAt(0, 0, i, 1.18);
            g.append("text")
                .attr("class", "radar-axis-label")
                .attr("x", lx).attr("y", ly)
                .attr("text-anchor", lx > 1 ? "start" : lx < -1 ? "end" : "middle")
                .attr("dominant-baseline", "central")
                .text(label);
        });

        /* 数据多边形 */
        const ratios = STATS.map(([, key]) => pokemon[key] / statMax(key));
        const dataPts = ratios.map((r, i) => pointAt(0, 0, i, r));
        const color = PV.colorFor(pokemon);

        g.append("polygon")
            .attr("points", dataPts.map(p => p.join(",")).join(" "))
            .attr("fill", color)
            .attr("fill-opacity", 0.35)
            .attr("stroke", color)
            .attr("stroke-width", 2);

        dataPts.forEach((p, i) => {
            g.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", 3)
                .attr("fill", color);
            g.append("text")
                .attr("class", "radar-value")
                .attr("x", p[0] * 1.14).attr("y", p[1] * 1.14)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .text(pokemon[STATS[i][1]]);
        });

        panel.select(".radar-close").node().focus();
    }

    function hide() {
        if (panel) panel.style("display", "none");
    }

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") hide();
    });

    return { show, hide };
})();
