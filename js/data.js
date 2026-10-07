/* 共享数据层：常量、状态、CSV 加载与通用工具 */
(function (root) {
    const PV = (root.PV = root.PV || {});

    /* 宝可梦官方属性配色 */
    PV.TYPE_COLORS = {
        NORMAL: "#A8A77A", FIRE: "#EE8130", WATER: "#6390F0", ELECTRIC: "#F7D02C",
        GRASS: "#7AC74C", ICE: "#96D9D6", FIGHTING: "#C22E28", POISON: "#A33EA1",
        GROUND: "#E2BF65", FLYING: "#A98FF3", PSYCHIC: "#F95587", BUG: "#A6B91A",
        ROCK: "#B6A136", GHOST: "#735797", DRAGON: "#6F35FC", DARK: "#705746",
        STEEL: "#B7B7CE", FAIRY: "#D685AD"
    };

    PV.TYPE_ORDER = Object.keys(PV.TYPE_COLORS);
    PV.FALLBACK_COLOR = "#9e9e9e";

    PV.MARGIN = { top: 50, right: 40, bottom: 80, left: 70 };
    PV.TRANSITION = 300;

    PV.state = {
        loaded: false,
        pokemon: [],
        moves: [],
        evolution: [],
        typechart: [],
        learnsets: [],
        learnsetIndex: new Map(),
        width: 0,
        height: 0,
        innerW: 0,
        innerH: 0
    };

    /* 跨视图共享的选择状态：选中宝可梦名与属性筛选 */
    PV.selection = { name: null, type: "ALL" };

    PV.setSelection = function (patch) {
        Object.assign(PV.selection, patch);
        if (typeof PV.renderActive === "function") PV.renderActive();
        if (typeof PV.renderChip === "function") PV.renderChip();
        if (typeof PV.syncHash === "function") PV.syncHash();
    };

    PV.pokemonByName = function (name) {
        return PV.state.pokemon.find(p => p.name === name);
    };

    /* ------------------------------ 工具函数 ------------------------------ */

    PV.typeLabel = function (type) {
        return type.charAt(0) + type.slice(1).toLowerCase();
    };

    PV.colorFor = function (d) {
        return PV.TYPE_COLORS[d.types[0]] || PV.FALLBACK_COLOR;
    };

    /* 依据容器尺寸计算可用绘图区（不含底部动态留白） */
    PV.measure = function (margin) {
        const m = margin || PV.MARGIN;
        const el = root.document.querySelector(".vis-chart");
        PV.state.width = el.clientWidth;
        PV.state.height = el.clientHeight;
        PV.state.innerW = Math.max(0, PV.state.width - m.left - m.right);
        PV.state.innerH = Math.max(0, PV.state.height - m.top - m.bottom);
    };

    /* ------------------------------ CSV 解析 ------------------------------ */

    function parsePokemonRow(d) {
        return {
            id: (d["#"] || "").trim(),
            name: d["Name"],
            type: d["Type"],
            total: +d["Total"],
            hp: +d["HP"],
            attack: +d["Attack"],
            defense: +d["Defense"],
            spAtk: +d["Special Attack"],
            spDef: +d["Special Defense"],
            speed: +d["Speed"]
        };
    }

    /* 双属性宝可梦拆为多行，按 (# + Name) 去重并把属性合并为数组 */
    function consolidatePokemon(rows) {
        const byKey = new Map();
        rows.forEach(row => {
            const key = row.id + "|" + row.name;
            const existing = byKey.get(key);
            if (existing) {
                if (!existing.types.includes(row.type)) existing.types.push(row.type);
            } else {
                byKey.set(key, Object.assign({}, row, { types: [row.type] }));
            }
        });
        return Array.from(byKey.values());
    }

    function parseMoveRow(d) {
        return {
            name: d["Name"],
            type: d["Type"],
            category: d["Cat."],
            power: d["Power"] ? +d["Power"] : 0,
            accuracy: d["Acc."] ? +d["Acc."] : 0,
            pp: +d["PP"],
            effect: d["Effect"]
        };
    }

    function parseLearsetRow(d) {
        return {
            pokemon: d["pokemon"],
            move: d["move"],
            method: d["method"],
            level: d["level"] ? +d["level"] : null
        };
    }

    PV.loadData = function () {
        return Promise.all([
            root.d3.csv("./data/pokemon.csv", parsePokemonRow),
            root.d3.csv("./data/moves.csv", parseMoveRow),
            root.d3.csv("./data/evolution.csv"),
            root.d3.csv("./data/typechart.csv"),
            root.d3.csv("./data/learnsets.csv", parseLearsetRow)
        ]).then(([pokemon, moves, evolution, typechart, learnsets]) => {
            PV.state.pokemon = consolidatePokemon(pokemon);
            PV.state.moves = moves;
            PV.state.evolution = evolution;
            PV.state.typechart = typechart;
            PV.state.learnsets = learnsets;

            const index = new Map();
            learnsets.forEach(row => {
                if (!index.has(row.pokemon)) index.set(row.pokemon, []);
                index.get(row.pokemon).push(row);
            });
            PV.state.learnsetIndex = index;
            PV.state.loaded = true;
        });
    };

    /* 返回某只宝可梦可学的招式列表 [{ move, method, level }] */
    PV.learnsetFor = function (name) {
        return PV.state.learnsetIndex.get(name) || [];
    };

    PV.learnsetMove = function (pokemonName, moveName) {
        const list = PV.state.learnsetIndex.get(pokemonName);
        return list ? list.find(r => r.move === moveName) || null : null;
    };

    /* 暴露内部纯函数供单元测试使用 */
    PV.internal = { parsePokemonRow, parseMoveRow, parseLearsetRow, consolidatePokemon };
})(typeof window !== "undefined" ? window : globalThis);
