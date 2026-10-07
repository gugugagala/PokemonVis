/* 从 @pkmn/dex 的真实宝可梦数据生成本项目可用的 learnsets.csv
   用法：npm run data:learnsets
   产出：data/learnsets.csv（列：pokemon,move,method,level） */
const fs = require("fs");
const path = require("path");
const { Generations } = require("@pkmn/data");
const { Dex } = require("@pkmn/dex");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");

/* 归一化：小写并去除所有非字母数字字符，用于跨数据源匹配 id */
function key(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function readColumn(file, columnIndex) {
    return fs.readFileSync(path.join(DATA, file), "utf8")
        .split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map(line => line.split(",")[columnIndex].trim());
}

const METHOD_NAMES = {
    L: "升级",
    M: "招式学习器",
    T: "教学",
    E: "蛋招式",
    S: "活动",
    V: "VC传输",
    D: "梦境",
    C: "特殊"
};

/* 从 Showdown 来源码（如 "9L16"、"8M"）解析方法与等级 */
function parseCode(code) {
    const match = /^(\d+)([A-Z])(\d*)$/.exec(code);
    if (!match) return null;
    const letter = match[2];
    const level = match[3] ? Number(match[3]) : null;
    return { method: METHOD_NAMES[letter] || "其他", letter, level };
}

/* 从一组来源码中选择代表性方法：优先升级（取最低等级），其次按优先级 */
const METHOD_PRIORITY = ["L", "M", "T", "E", "S", "V", "D", "C"];

function pickBest(codes) {
    const parsed = codes.map(parseCode).filter(Boolean);
    if (!parsed.length) return null;

    const levelUps = parsed.filter(p => p.letter === "L" && p.level !== null);
    if (levelUps.length) {
        const level = Math.min(...levelUps.map(p => p.level));
        return { method: "升级", level };
    }
    parsed.sort((a, b) => METHOD_PRIORITY.indexOf(a.letter) - METHOD_PRIORITY.indexOf(b.letter));
    return { method: parsed[0].method, level: "" };
}

(async () => {
    const ourPokemon = readColumn("pokemon.csv", 1);
    const ourMoves = readColumn("moves.csv", 0);

    const pokemonIndex = new Map();
    ourPokemon.forEach(name => {
        const k = key(name);
        if (!pokemonIndex.has(k)) pokemonIndex.set(k, name);
    });
    const moveIndex = new Map();
    ourMoves.forEach(name => {
        const k = key(name);
        if (!moveIndex.has(k)) moveIndex.set(k, name);
    });

    const gens = new Generations(Dex);
    const gen = gens.get(9);

    const rows = [];
    let matchedSpecies = 0;

    for (const species of gen.species) {
        if (!species.exists) continue;
        const ourName = pokemonIndex.get(key(species.id));
        if (!ourName) continue;

        const data = await gen.learnsets.get(species.id);
        if (!data || !data.learnset) continue;
        matchedSpecies++;

        for (const [moveId, codes] of Object.entries(data.learnset)) {
            const ourMove = moveIndex.get(key(moveId));
            if (!ourMove) continue;
            const best = pickBest(codes);
            if (!best) continue;
            rows.push({ pokemon: ourName, move: ourMove, method: best.method, level: best.level });
        }
    }

    rows.sort((a, b) => a.pokemon.localeCompare(b.pokemon) || a.move.localeCompare(b.move));

    const csv = ["pokemon,move,method,level"]
        .concat(rows.map(r => `"${r.pokemon}","${r.move}","${r.method}",${r.level}`))
        .join("\n");
    fs.writeFileSync(path.join(DATA, "learnsets.csv"), csv + "\n");

    console.log(`匹配宝可梦物种：${matchedSpecies}`);
    console.log(`生成招式关联：${rows.length} 条 -> data/learnsets.csv`);
})().catch(err => {
    console.error("生成失败：", err);
    process.exit(1);
});
