/* 视图：宝可梦进化链（分层树 + 进化条件） */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.evolution = (function () {
    let selected = null;
    let tooltip, menuSelect;

    function buildGraph(edges) {
        const children = new Map();
        const parentOf = new Map();
        edges.forEach(e => {
            const from = e["Evolving from"];
            const to = e["Evolving to"];
            if (!from || !to) return;
            if (!children.has(from)) children.set(from, []);
            children.get(from).push({
                to,
                level: e["Level"] || "",
                condition: e["Condition"] || "",
                method: e["Evolution Type"] || ""
            });
            parentOf.set(to, from);
        });
        return { children, parentOf };
    }

    function familyOf(name, children, parentOf) {
        let root = name;
        const guard = new Set();
        while (parentOf.has(root) && !guard.has(root)) {
            guard.add(root);
            root = parentOf.get(root);
        }

        const set = new Set([root]);
        const queue = [root];
        while (queue.length) {
            const node = queue.shift();
            (children.get(node) || []).forEach(c => {
                if (!set.has(c.to)) {
                    set.add(c.to);
                    queue.push(c.to);
                }
            });
        }
        return { set, root };
    }

    function layout(roots, children) {
        const levels = [];
        const seen = new Set(roots);
        let frontier = roots.slice();
        while (frontier.length) {
            levels.push(frontier);
            const next = [];
            frontier.forEach(name => {
                (children.get(name) || []).forEach(c => {
                    if (!seen.has(c.to)) {
                        seen.add(c.to);
                        next.push(c.to);
                    }
                });
            });
            frontier = next;
        }
        return levels;
    }

    function evolutionLabel(edge) {
        const parts = [edge.method];
        if (edge.level) parts.push("Lv." + edge.level);
        if (edge.condition) parts.push(edge.condition);
        return parts.filter(Boolean).join(" · ");
    }

    function pokemonByName(name) {
        return PV.state.pokemon.find(p => p.name === name);
    }

    function nodeColor(name) {
        const p = pokemonByName(name);
        return p ? PV.colorFor(p) : PV.FALLBACK_COLOR;
    }

    function render(container) {
        const graph = buildGraph(PV.state.evolution);
        const { children, parentOf } = graph;

        if (!selected) selected = parentOf.size && children.has("Bulbasaur") ? "Bulbasaur" : Array.from(children.keys())[0];
        const { set, root } = familyOf(selected, children, parentOf);
        const levels = layout([root], children);

        const MARGIN = { top: 70, right: 50, bottom: 40, left: 50 };
        PV.measure(MARGIN);

        const svg = d3.select(container).append("svg")
            .attr("class", "evolution-svg")
            .attr("width", PV.state.width)
            .attr("height", PV.state.height);

        tooltip = d3.select(container).append("div").attr("class", "tooltip");

        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", 24).attr("y", 30)
            .text(`进化链：${root} 家族`);

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        const maxDepth = levels.length - 1;
        const colGap = maxDepth > 0 ? PV.state.innerW / maxDepth : 0;
        const pos = {};
        const nodes = [];

        levels.forEach((names, d) => {
            names.forEach((name, i) => {
                const x = maxDepth > 0 ? d * colGap : PV.state.innerW / 2;
                const y = PV.state.innerH * (i + 1) / (names.length + 1);
                pos[name] = { x, y };
                nodes.push({ name, x, y });
            });
        });

        const links = [];
        set.forEach(from => {
            (children.get(from) || []).forEach(c => {
                if (set.has(c.to) && pos[from] && pos[c.to]) {
                    links.push({ source: pos[from], target: pos[c.to], edge: c, from });
                }
            });
        });

        const linkGen = d3.linkHorizontal().x(d => d.x).y(d => d.y);

        g.selectAll(".evo-link")
            .data(links)
            .enter()
            .append("path")
            .attr("class", "evo-link")
            .attr("d", d => linkGen({ source: d.source, target: d.target }))
            .attr("fill", "none")
            .attr("stroke", "#c8d0ce")
            .attr("stroke-width", 1.5);

        g.selectAll(".evo-edge-label")
            .data(links)
            .enter()
            .append("text")
            .attr("class", "evo-edge-label")
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2 - 4)
            .attr("text-anchor", "middle")
            .text(d => evolutionLabel(d.edge));

        const node = g.selectAll(".evo-node")
            .data(nodes, d => d.name)
            .enter()
            .append("g")
            .attr("class", "evo-node")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .style("cursor", "pointer")
            .on("mouseover", function (d) {
                d3.select(this).select("circle").attr("stroke", "#2c3e50").attr("stroke-width", 3);
                showTooltip(d.name, d3.event.pageX, d3.event.pageY);
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", function () {
                d3.select(this).select("circle").attr("stroke", "#ffffff").attr("stroke-width", 2);
                hideTooltip();
            })
            .on("click", function (d) {
                selected = d.name;
                if (menuSelect) menuSelect.property("value", d.name);
                PV.renderActive();
            });

        node.append("circle")
            .attr("r", 20)
            .attr("fill", d => nodeColor(d.name))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2);

        node.append("text")
            .attr("class", "evo-node-label")
            .attr("text-anchor", "middle")
            .attr("y", 36)
            .text(d => d.name);
    }

    function cardHtml(p) {
        const badges = p.types
            .map(t => `<span class="type-badge" style="background:${PV.TYPE_COLORS[t] || PV.FALLBACK_COLOR}">${PV.typeLabel(t)}</span>`)
            .join("");
        return `<div class="tooltip-name">#${p.id} ${p.name}</div>` +
            `<div class="tooltip-types">${badges}</div>` +
            `<div class="tooltip-total">Total <b>${p.total}</b></div>`;
    }

    function showTooltip(name, pageX, pageY) {
        const p = pokemonByName(name);
        tooltip.html(p ? cardHtml(p) : `<div class="tooltip-name">${name}</div>`)
            .transition().duration(120).style("opacity", 0.95);
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
        root.append("div").attr("class", "menu-title").text("进化链");

        const names = Array.from(new Set(
            PV.state.evolution.flatMap(e => [e["Evolving from"], e["Evolving to"]]).filter(Boolean)
        )).sort();

        const field = root.append("div").attr("class", "menu-field");
        field.append("label").text("选择宝可梦（自动定位所属家族）");
        menuSelect = field.append("select")
            .on("change", function () {
                selected = this.value;
                PV.renderActive();
            });
        names.forEach(n => menuSelect.append("option").attr("value", n).text(n));
        if (selected) menuSelect.property("value", selected);

        root.append("div").attr("class", "menu-hint").text("提示：点击任意进化节点可切换家族。");
    }

    return { label: "进化链", render, menu };
})();
