/* 通用组件：提示框、属性徽章与宝可梦信息卡片（供各视图复用） */
window.PV = window.PV || {};

PV.typeBadges = function (types) {
    return types
        .map(t => `<span class="type-badge" style="background:${PV.TYPE_COLORS[t] || PV.FALLBACK_COLOR}">${PV.typeLabel(t)}</span>`)
        .join("");
};

PV.pokemonCard = function (p) {
    return `<div class="tooltip-name">#${p.id} ${p.name}</div>` +
        `<div class="tooltip-types">${PV.typeBadges(p.types)}</div>` +
        `<div class="tooltip-total">Total <b>${p.total}</b></div>`;
};

PV.pokemonCardFull = function (p) {
    const stats = [
        ["HP", p.hp], ["Attack", p.attack], ["Defense", p.defense],
        ["Sp. Atk", p.spAtk], ["Sp. Def", p.spDef], ["Speed", p.speed]
    ].map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join("");

    return PV.pokemonCard(p) + `<div class="tooltip-stats">${stats}</div>`;
};

/* 在容器内创建一个提示框，返回 { el, show(html), move(), hide() }。
   show/move 需在 d3 事件处理器中调用（依赖 d3.event 定位）。 */
PV.createTooltip = function (container) {
    const el = d3.select(container).append("div").attr("class", "tooltip");

    function move() {
        const node = el.node();
        const tw = node.offsetWidth;
        const th = node.offsetHeight;
        const pageW = document.documentElement.clientWidth + window.scrollX;
        const pageH = document.documentElement.clientHeight + window.scrollY;

        const x0 = d3.event.pageX;
        const y0 = d3.event.pageY;
        let x = x0 + 16;
        let y = y0 + 16;
        if (x + tw > pageW - 10) x = x0 - tw - 16;
        if (y + th > pageH - 10) y = y0 - th - 16;

        el.style("left", x + "px").style("top", y + "px");
    }

    function show(html) {
        el.html(html).transition().duration(120).style("opacity", 0.95);
        move();
    }

    function hide() {
        el.transition().duration(200).style("opacity", 0);
    }

    return { el, show, move, hide };
};
