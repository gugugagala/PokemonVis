/* 应用外壳：视图注册、导航切换与响应式重绘 */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.current = null;
PV.currentName = null;

/* --------------------- URL 状态（可作为分享链接） --------------------- */

function readHash() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    return {
        view: params.get("view"),
        type: params.get("type"),
        name: params.get("name")
    };
}

PV.syncHash = function () {
    const params = new URLSearchParams();
    if (PV.currentName) params.set("view", PV.currentName);
    if (PV.selection.type && PV.selection.type !== "ALL") params.set("type", PV.selection.type);
    if (PV.selection.name) params.set("name", PV.selection.name);
    const query = params.toString();
    history.replaceState(null, "", query ? "#" + query : location.pathname + location.search);
};

function restoreFromHash() {
    const { view, type, name } = readHash();
    PV.selection.type = type || "ALL";
    PV.selection.name = name || null;
    if (view && view !== PV.currentName && PV.views[view]) {
        PV.switchView(view);
    } else {
        PV.renderActive();
        if (typeof PV.renderChip === "function") PV.renderChip();
    }
}

PV.renderActive = function () {
    const container = document.querySelector(".vis-chart");
    d3.select(container).selectAll("*").remove();
    if (PV.current) PV.current.render(container, PV.state);
};

PV.renderChip = function () {
    const menu = document.querySelector(".menu");
    if (!menu) return;

    let chip = menu.querySelector(".selection-chip");
    if (!PV.selection.name) {
        if (chip) chip.remove();
        return;
    }
    if (!chip) {
        chip = document.createElement("div");
        chip.className = "selection-chip";
        menu.prepend(chip);
    }
    chip.innerHTML = "";
    const label = document.createElement("span");
    label.textContent = "已选：" + PV.selection.name;
    const clear = document.createElement("button");
    clear.type = "button";
    clear.setAttribute("aria-label", "清除选择");
    clear.textContent = "✕";
    clear.addEventListener("click", () => PV.setSelection({ name: null }));
    chip.append(label, clear);
};

/* ------------------------------ 轻提示 ------------------------------ */

let toastEl;

PV.toast = function (message) {
    if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "toast";
        toastEl.setAttribute("role", "status");
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 1600);
};

/* ---------------------------- 分享与导出 ---------------------------- */

function legacyCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        done();
    } catch (e) {
        window.prompt("复制链接：", text);
    }
    ta.remove();
}

PV.copyShareLink = function () {
    PV.syncHash();
    const url = location.href;
    const done = () => PV.toast("链接已复制");
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(() => legacyCopy(url, done));
    } else {
        legacyCopy(url, done);
    }
};

PV.renderTools = function (menu) {
    const tools = document.createElement("div");
    tools.className = "menu-tools";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "tool-btn";
    copy.textContent = "复制分享链接";
    copy.addEventListener("click", PV.copyShareLink);
    tools.appendChild(copy);

    menu.appendChild(tools);
};

PV.renderMenu = function () {
    const menu = document.querySelector(".menu");
    d3.select(menu).html("");
    if (PV.current && PV.current.menu) PV.current.menu(menu, PV.state);
    PV.renderChip();
    PV.renderTools(menu);
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

    document.querySelectorAll(".nav-item").forEach(item => {
        const isActive = item.getAttribute("data-view") === name;
        item.classList.toggle("active", isActive);
        if (isActive) {
            item.setAttribute("aria-current", "true");
        } else {
            item.removeAttribute("aria-current");
        }
    });

    PV.syncHash();
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
    window.addEventListener("hashchange", restoreFromHash);

    PV.loadData()
        .then(() => {
            const restored = readHash();
            if (restored.type) PV.selection.type = restored.type;
            if (restored.name) PV.selection.name = restored.name;
            const start = restored.view && PV.views[restored.view] ? restored.view : "scatter";
            PV.switchView(start);
        })
        .catch(err => {
            console.error("数据加载失败:", err);
            d3.select(".vis-chart").append("div")
                .attr("class", "error-state")
                .text("数据加载失败，请通过本地 HTTP 服务访问（如 python3 -m http.server）。");
        });
};

window.addEventListener("load", PV.init);
