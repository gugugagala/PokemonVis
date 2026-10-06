/* 应用外壳：视图注册、导航切换与响应式重绘 */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.current = null;
PV.currentName = null;

PV.renderActive = function () {
    const container = document.querySelector(".vis-chart");
    d3.select(container).selectAll("*").remove();
    if (PV.current) PV.current.render(container, PV.state);
};

PV.renderMenu = function () {
    const menu = document.querySelector(".menu");
    d3.select(menu).html("");
    if (PV.current && PV.current.menu) PV.current.menu(menu, PV.state);
};

PV.switchView = function (name) {
    const view = PV.views[name];
    if (!view) {
        console.warn("未知视图:", name);
        return;
    }
    PV.current = view;
    PV.currentName = name;

    PV.renderActive();
    PV.renderMenu();

    d3.selectAll(".nav-item")
        .classed("active", function () {
            return d3.select(this).attr("data-view") === name;
        });
};

let resizeTimer;

function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(PV.renderActive, 150);
}

PV.init = function () {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => PV.switchView(item.getAttribute("data-view")));
    });
    window.addEventListener("resize", onResize);

    PV.loadData()
        .then(() => PV.switchView("scatter"))
        .catch(err => {
            console.error("数据加载失败:", err);
            d3.select(".vis-chart").append("div")
                .attr("class", "error-state")
                .text("数据加载失败，请通过本地 HTTP 服务访问（如 python3 -m http.server）。");
        });
};

window.addEventListener("load", PV.init);
