/* 应用外壳：视图注册、导航切换与响应式重绘 */
window.PV = window.PV || {};
PV.views = PV.views || {};

PV.current = null;
PV.currentName = null;

/* --------------------- URL 状态（可作为分享链接） --------------------- */

function encodeRanges(ranges) {
    return Object.entries(ranges)
        .map(([key, [lo, hi]]) => `${key}:${Math.round(lo)}-${Math.round(hi)}`)
        .join(",");
}

function decodeRanges(value) {
    const ranges = {};
    if (!value) return ranges;
    value.split(",").forEach(part => {
        const [key, span] = part.split(":");
        if (!key || !span) return;
        const [lo, hi] = span.split("-").map(Number);
        if (!Number.isNaN(lo) && !Number.isNaN(hi)) ranges[key] = [lo, hi];
    });
    return ranges;
}

function readHash() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    return {
        view: params.get("view"),
        type: params.get("type"),
        name: params.get("name"),
        ranges: decodeRanges(params.get("ranges"))
    };
}

PV.syncHash = function () {
    const params = new URLSearchParams();
    if (PV.currentName) params.set("view", PV.currentName);
    if (PV.selection.type && PV.selection.type !== "ALL") params.set("type", PV.selection.type);
    if (PV.selection.name) params.set("name", PV.selection.name);
    if (PV.hasRanges()) params.set("ranges", encodeRanges(PV.selection.ranges));
    const query = params.toString();
    history.replaceState(null, "", query ? "#" + query : location.pathname + location.search);
};

function restoreFromHash() {
    const { view, type, name, ranges } = readHash();
    PV.selection.type = type || "ALL";
    PV.selection.name = name || null;
    PV.selection.ranges = ranges || {};
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

    /* 选中宝可梦指示条 */
    let chip = menu.querySelector(".selection-chip");
    if (!PV.selection.name) {
        if (chip) chip.remove();
    } else {
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
    }

    /* 数值刷选指示条 */
    let range = menu.querySelector(".range-chip");
    if (!PV.hasRanges()) {
        if (range) range.remove();
    } else {
        if (!range) {
            range = document.createElement("div");
            range.className = "selection-chip range-chip";
            menu.prepend(range);
        }
        range.innerHTML = "";
        const label = document.createElement("span");
        label.textContent = "刷选筛选：" + Object.keys(PV.selection.ranges).length + " 项";
        const clear = document.createElement("button");
        clear.type = "button";
        clear.setAttribute("aria-label", "清除刷选筛选");
        clear.textContent = "✕";
        clear.addEventListener("click", () => PV.clearRanges());
        range.append(label, clear);
    }
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

function csvCell(value) {
    if (value === null || value === undefined) return "";
    const s = String(value);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function download(filename, mime, data) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

PV.exportCSV = function () {
    const view = PV.current;
    const rows = view && view.exportData ? view.exportData() : null;
    if (!rows || !rows.length) {
        PV.toast("当前视图暂无可导出的数据");
        return;
    }
    const header = Object.keys(rows[0]);
    const lines = [header.join(",")].concat(
        rows.map(row => header.map(h => csvCell(row[h])).join(","))
    );
    download("pokemonvis-" + PV.currentName + ".csv", "text/csv;charset=utf-8", "\ufeff" + lines.join("\n"));
    PV.toast("CSV 已导出");
};

const INLINE_PROPS = [
    "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity",
    "stroke-dasharray", "opacity", "font-family", "font-size", "font-weight",
    "text-anchor", "dominant-baseline", "letter-spacing", "shape-rendering", "display"
];

/* 将 CSS 计算样式内联进克隆的 SVG，避免导出后丢失样式 */
function inlineStyles(srcRoot, dstRoot) {
    const src = [srcRoot, ...srcRoot.querySelectorAll("*")];
    const dst = [dstRoot, ...dstRoot.querySelectorAll("*")];
    for (let i = 0; i < src.length; i++) {
        if (!dst[i]) continue;
        const cs = getComputedStyle(src[i]);
        let style = dst[i].getAttribute("style") || "";
        INLINE_PROPS.forEach(prop => {
            const value = cs.getPropertyValue(prop);
            if (value) style += prop + ":" + value + ";";
        });
        dst[i].setAttribute("style", style);
    }
}

/* 将当前 SVG 栅格化为 canvas（inlines 样式后经 Image 绘制），callback 收到 canvas 或 null */
function rasterizeSVG(svg, scale, callback) {
    const width = svg.width.baseVal.value || svg.clientWidth;
    const height = svg.height.baseVal.value || svg.clientHeight;

    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);
    inlineStyles(svg, clone);

    const serialized = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas);
    };
    img.onerror = () => callback(null);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialized);
}

PV.exportPNG = function () {
    const svg = document.querySelector(".vis-chart svg");
    if (!svg) {
        PV.toast("无可导出内容");
        return;
    }
    rasterizeSVG(svg, 2, canvas => {
        if (!canvas) {
            PV.toast("PNG 导出失败");
            return;
        }
        canvas.toBlob(blob => {
            download("pokemonvis-" + PV.currentName + ".png", "image/png", blob);
            PV.toast("PNG 已导出");
        });
    });
};

/* ---------------------------- 分享预览卡片 ---------------------------- */

let shareOverlay;

function buildShareOverlay() {
    shareOverlay = document.createElement("div");
    shareOverlay.className = "share-overlay";
    shareOverlay.setAttribute("role", "dialog");
    shareOverlay.setAttribute("aria-label", "分享预览");

    const card = document.createElement("div");
    card.className = "share-card";
    card.innerHTML =
        '<button type="button" class="share-close" aria-label="关闭分享预览">✕</button>' +
        '<div class="share-card-title">分享预览</div>' +
        '<img class="share-thumb" alt="当前图表缩略图" />' +
        '<div class="share-url-row">' +
        '<input class="share-url" type="text" readonly aria-label="分享链接" />' +
        '<button type="button" class="tool-btn share-copy">复制</button>' +
        '</div>';
    shareOverlay.appendChild(card);

    shareOverlay.addEventListener("click", e => {
        if (e.target === shareOverlay) hideShare();
    });
    card.querySelector(".share-close").addEventListener("click", hideShare);
    card.querySelector(".share-copy").addEventListener("click", () => {
        const url = card.querySelector(".share-url").value;
        const done = () => PV.toast("链接已复制");
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done).catch(() => legacyCopy(url, done));
        } else {
            legacyCopy(url, done);
        }
    });
    document.body.appendChild(shareOverlay);
}

function hideShare() {
    if (shareOverlay) shareOverlay.style.display = "none";
}

PV.showShare = function () {
    PV.syncHash();
    if (!shareOverlay) buildShareOverlay();
    const card = shareOverlay.querySelector(".share-card");
    shareOverlay.style.display = "flex";
    card.querySelector(".share-url").value = location.href;

    const thumb = card.querySelector(".share-thumb");
    const svg = document.querySelector(".vis-chart svg");
    if (svg) {
        const width = svg.width.baseVal.value || svg.clientWidth || 1;
        rasterizeSVG(svg, Math.min(1, 360 / width), canvas => {
            thumb.src = canvas ? canvas.toDataURL("image/png") : "";
        });
    }
    card.querySelector(".share-close").focus();
};

document.addEventListener("keydown", e => {
    if (e.key === "Escape") hideShare();
});

PV.renderToolbar = function () {
    const host = document.getElementById("nav-tools");
    if (!host || host.childElementCount) return;

    const make = (label, aria, handler) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tool-btn";
        btn.textContent = label;
        btn.setAttribute("aria-label", aria);
        btn.addEventListener("click", handler);
        return btn;
    };

    host.append(
        make("分享", "分享当前状态并复制链接", PV.showShare),
        make("CSV", "导出当前视图数据为 CSV", PV.exportCSV),
        make("PNG", "导出当前图表为 PNG", PV.exportPNG)
    );
};

PV.renderMenu = function () {
    const menu = document.querySelector(".menu");
    d3.select(menu).html("");
    if (PV.current && PV.current.menu) PV.current.menu(menu, PV.state);
    PV.renderChip();
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
    PV.renderToolbar();

    PV.loadData()
        .then(() => {
            const restored = readHash();
            if (restored.type) PV.selection.type = restored.type;
            if (restored.name) PV.selection.name = restored.name;
            PV.selection.ranges = restored.ranges || {};
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
