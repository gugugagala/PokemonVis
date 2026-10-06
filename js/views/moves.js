/* 视图：技能探索器（可筛选、排序的横向条形图） */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.views.moves = (function () {
    const MARGIN = { top: 64, right: 48, bottom: 24, left: 150 };
    const MAX_BARS = 45;

    const filters = { search: "", type: "ALL", category: "ALL", sort: "power" };
    const SORTERS = {
        power: (a, b) => b.power - a.power || a.name.localeCompare(b.name),
        pp: (a, b) => b.pp - a.pp || a.name.localeCompare(b.name),
        name: (a, b) => a.name.localeCompare(b.name)
    };

    let linkSelected = false;
    let tooltip;

    function selectedTypes() {
        if (!linkSelected || !PV.selection.name) return null;
        const p = PV.pokemonByName(PV.selection.name);
        return p ? p.types : null;
    }

    function filtered() {
        const q = filters.search.trim().toLowerCase();
        const selTypes = selectedTypes();
        return PV.state.moves
            .filter(m =>
                (filters.type === "ALL" || m.type === filters.type) &&
                (filters.category === "ALL" || m.category === filters.category) &&
                (!selTypes || selTypes.includes(m.type)) &&
                (!q || m.name.toLowerCase().includes(q)))
            .sort(SORTERS[filters.sort]);
    }

    function render(container) {
        const all = filtered();
        const shown = all.slice(0, MAX_BARS);

        PV.measure(MARGIN);
        const svg = d3.select(container).append("svg")
            .attr("class", "moves-svg")
            .attr("role", "img")
            .attr("aria-label", "技能威力横向条形图")
            .attr("width", PV.state.width)
            .attr("height", PV.state.height);

        tooltip = PV.createTooltip(container);

        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", 24).attr("y", 30)
            .text("技能探索器");

        const scope = selectedTypes() ? `（${PV.selection.name} 的属性）` : "";
        svg.append("text")
            .attr("class", "chart-subtitle")
            .attr("x", 24).attr("y", 48)
            .text(`匹配 ${all.length} 个技能${scope}${all.length > MAX_BARS ? `，显示前 ${MAX_BARS} 个` : ""}`);

        if (!shown.length) return;

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        const maxPower = d3.max(shown, d => d.power) || 1;
        const xScale = d3.scaleLinear().domain([0, maxPower]).range([0, PV.state.innerW - 40]);

        const rowH = PV.state.innerH / shown.length;
        const barH = Math.max(6, rowH * 0.72);

        const rows = g.selectAll(".move-row")
            .data(shown)
            .enter()
            .append("g")
            .attr("class", "move-row")
            .attr("transform", (d, i) => `translate(0,${i * rowH})`)
            .style("cursor", "pointer")
            .on("mouseover", function (d) {
                d3.select(this).select(".move-bar").attr("opacity", 1);
                tooltip.show(moveCard(d));
            })
            .on("mousemove", tooltip.move)
            .on("mouseout", function () {
                d3.select(this).select(".move-bar").attr("opacity", 0.85);
                tooltip.hide();
            });

        rows.append("rect")
            .attr("class", "move-bar")
            .attr("x", 0)
            .attr("y", (rowH - barH) / 2)
            .attr("height", barH)
            .attr("width", 0)
            .attr("rx", 2)
            .attr("fill", d => PV.TYPE_COLORS[d.type] || PV.FALLBACK_COLOR)
            .attr("opacity", 0.85)
            .transition().duration(PV.TRANSITION)
            .attr("width", d => xScale(d.power));

        rows.append("text")
            .attr("class", "move-name")
            .attr("x", -8)
            .attr("y", rowH / 2)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "central")
            .text(d => d.name);

        rows.append("text")
            .attr("class", "move-value")
            .attr("x", d => xScale(d.power) + 6)
            .attr("y", rowH / 2)
            .attr("dominant-baseline", "central")
            .text(d => d.power ? d.power : "—");
    }

    function moveCard(m) {
        return `<div class="tooltip-name">${m.name}</div>` +
            `<div class="tooltip-types">${PV.typeBadges([m.type])}<span class="move-cat">${m.category}</span></div>` +
            `<div class="tooltip-stats">` +
            `<div class="stat-row"><span>威力</span><b>${m.power || "—"}</b></div>` +
            `<div class="stat-row"><span>命中</span><b>${m.accuracy || "—"}</b></div>` +
            `<div class="stat-row"><span>PP</span><b>${m.pp}</b></div>` +
            `</div>` +
            (m.effect ? `<div class="tooltip-effect">${m.effect}</div>` : "");
    }

    function menu(menuEl) {
        const root = d3.select(menuEl);
        root.append("div").attr("class", "menu-title").text("技能探索器");

        const search = root.append("div").attr("class", "menu-field");
        search.append("label").text("搜索技能名");
        search.append("input").attr("type", "text").attr("placeholder", "如: punch")
            .property("value", filters.search)
            .on("input", function () {
                filters.search = this.value;
                PV.renderActive();
            });

        const typeField = root.append("div").attr("class", "menu-field");
        typeField.append("label").text("属性");
        const typeSel = typeField.append("select").on("change", function () {
            filters.type = this.value;
            PV.renderActive();
        });
        typeSel.append("option").attr("value", "ALL").text("全部");
        PV.TYPE_ORDER.forEach(t => typeSel.append("option").attr("value", t).text(PV.typeLabel(t)));
        typeSel.property("value", filters.type);

        const catField = root.append("div").attr("class", "menu-field");
        catField.append("label").text("类别");
        const catSel = catField.append("select").on("change", function () {
            filters.category = this.value;
            PV.renderActive();
        });
        ["ALL", "Physical", "Special", "Status"].forEach(c =>
            catSel.append("option").attr("value", c).text(c === "ALL" ? "全部" : c));
        catSel.property("value", filters.category);

        const sortField = root.append("div").attr("class", "menu-field");
        sortField.append("label").text("排序");
        const sortSel = sortField.append("select").on("change", function () {
            filters.sort = this.value;
            PV.renderActive();
        });
        [["power", "威力"], ["pp", "PP"], ["name", "名称"]].forEach(([v, label]) =>
            sortSel.append("option").attr("value", v).text(label));
        sortSel.property("value", filters.sort);

        const link = root.append("label").attr("class", "menu-checkbox");
        link.append("input").attr("type", "checkbox")
            .property("checked", linkSelected)
            .on("change", function () {
                linkSelected = this.checked;
                PV.renderActive();
            });
        link.append("span").text("仅显示所选宝可梦的属性技能");

        root.append("div").attr("class", "menu-hint")
            .text("在散点图选中宝可梦后勾选上方选项，可联动查看其属性技能。");
    }

    function exportData() {
        return filtered().map(m => ({
            name: m.name, type: m.type, category: m.category,
            power: m.power, accuracy: m.accuracy, pp: m.pp, effect: m.effect
        }));
    }

    return { label: "技能", render, menu, exportData };
})();
