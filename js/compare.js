/* 通用组件：多选对比面板（叠加雷达图 + 数值表） */
window.PV = window.PV || {};

PV.compare = (function () {
    const STATS = [
        ["HP", "hp"], ["Attack", "attack"], ["Defense", "defense"],
        ["Sp. Atk", "spAtk"], ["Sp. Def", "spDef"], ["Speed", "speed"]
    ];
    const MAX = 6;
    const SIZE = 300;
    const R = 96;

    let panel;

    function statMax(key) {
        return d3.max(PV.state.pokemon, d => d[key]) || 1;
    }

    const angle = i => -Math.PI / 2 + i * 2 * Math.PI / STATS.length;
    const pointAt = (i, ratio) => [ratio * R * Math.cos(angle(i)), ratio * R * Math.sin(angle(i))];

    function ensurePanel() {
        if (panel) return;
        panel = d3.select("body").append("div").attr("class", "compare-panel")
            .attr("role", "dialog").attr("aria-label", "宝可梦对比")
            .style("display", "none");
        panel.append("button").attr("class", "compare-close").attr("type", "button")
            .attr("aria-label", "关闭对比面板").text("✕").on("click", close);
        panel.append("div").attr("class", "compare-title");
        panel.append("div").attr("class", "compare-body");
    }

    function colorOf(p) {
        return PV.TYPE_COLORS[p.types[0]] || PV.FALLBACK_COLOR;
    }

    function toggle(name) {
        ensurePanel();
        const arr = PV.selection.compare;
        const index = arr.indexOf(name);
        if (index >= 0) {
            arr.splice(index, 1);
        } else {
            if (arr.length >= MAX) arr.shift();
            arr.push(name);
        }
        PV.renderChip();
        render();
    }

    function clear() {
        PV.selection.compare = [];
        PV.renderChip();
        render();
    }

    function render() {
        if (!panel) return;
        const list = PV.selection.compare
            .map(name => PV.pokemonByName(name))
            .filter(Boolean);

        if (!list.length) {
            panel.style("display", "none");
            return;
        }
        panel.style("display", "block");
        panel.select(".compare-title").text(`宝可梦对比（${list.length}）`);
        const body = panel.select(".compare-body");
        body.html("");

        /* 叠加雷达图 */
        const svg = body.append("svg").attr("width", SIZE).attr("height", SIZE)
            .attr("role", "img").attr("aria-label", "对比雷达图");
        const g = svg.append("g").attr("transform", `translate(${SIZE / 2},${SIZE / 2})`);

        [0.25, 0.5, 0.75, 1].forEach(ratio => {
            g.append("polygon")
                .attr("points", STATS.map((_, i) => pointAt(i, ratio).join(",")).join(" "))
                .attr("fill", "none").attr("stroke", "#e0e6e4");
        });
        STATS.forEach(([label], i) => {
            const [x, y] = pointAt(i, 1);
            g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", x).attr("y2", y).attr("stroke", "#e0e6e4");
            const [lx, ly] = pointAt(i, 1.2);
            g.append("text").attr("class", "radar-axis-label").attr("x", lx).attr("y", ly)
                .attr("text-anchor", lx > 1 ? "start" : lx < -1 ? "end" : "middle")
                .attr("dominant-baseline", "central").text(label);
        });

        list.forEach(p => {
            const color = colorOf(p);
            const pts = STATS.map(([, key], i) => pointAt(i, p[key] / statMax(key)));
            g.append("polygon")
                .attr("points", pts.map(pt => pt.join(",")).join(" "))
                .attr("fill", color).attr("fill-opacity", 0.16)
                .attr("stroke", color).attr("stroke-width", 2);
        });

        /* 数值表 */
        const table = body.append("table").attr("class", "compare-table");
        const head = table.append("thead").append("tr");
        head.append("th").text("");
        list.forEach(p => {
            head.append("th")
                .style("color", colorOf(p))
                .html(`<span class="compare-dot" style="background:${colorOf(p)}"></span>${p.name}`);
        });
        const tbody = table.append("tbody");
        STATS.concat([["Total", "total"]]).forEach(([label, key]) => {
            const tr = tbody.append("tr");
            tr.append("th").text(label);
            const values = list.map(p => p[key]);
            const best = Math.max(...values);
            list.forEach(p => {
                tr.append("td")
                    .classed("best", p[key] === best)
                    .text(p[key]);
            });
        });

        body.append("div").attr("class", "compare-hint")
            .text("按住 Shift 点击散点/平行坐标线条/进化节点可增删对比对象；最多 6 只。");
    }

    function close() {
        clear();
    }

    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && panel) clear();
    });

    return { toggle, render, clear };
})();
