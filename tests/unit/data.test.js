/* 单元测试：数据清洗纯函数（node --test） */
const { test } = require("node:test");
const assert = require("node:assert");
const path = require("path");

require(path.join(__dirname, "..", "..", "js", "data.js"));
const { parsePokemonRow, parseMoveRow, consolidatePokemon } = globalThis.PV.internal;

test("parsePokemonRow 解析数值并去除编号空白", () => {
    const row = parsePokemonRow({
        "#": " 001", "Name": "Bulbasaur", "Type": "GRASS", "Total": "318",
        "HP": "45", "Attack": "49", "Defense": "49",
        "Special Attack": "65", "Special Defense": "65", "Speed": "45"
    });
    assert.strictEqual(row.id, "001");
    assert.strictEqual(row.hp, 45);
    assert.strictEqual(row.spAtk, 65);
    assert.strictEqual(row.total, 318);
});

test("parseMoveRow 空威力/命中按 0 处理", () => {
    const status = parseMoveRow({ "Name": "Swords Dance", "Type": "NORMAL", "Cat.": "Status", "Power": "", "Acc.": "", "PP": "20", "Effect": "..." });
    assert.strictEqual(status.power, 0);
    assert.strictEqual(status.accuracy, 0);
    assert.strictEqual(status.pp, 20);

    const attack = parseMoveRow({ "Name": "Absorb", "Type": "GRASS", "Cat.": "Special", "Power": "20", "Acc.": "100", "PP": "25", "Effect": "..." });
    assert.strictEqual(attack.power, 20);
    assert.strictEqual(attack.accuracy, 100);
});

test("consolidatePokemon 合并双属性并按 (# + Name) 去重", () => {
    const rows = [
        { id: "001", name: "Bulbasaur", type: "GRASS", total: 318 },
        { id: "001", name: "Bulbasaur", type: "POISON", total: 318 },
        { id: "413", name: "Wormadam- Plant Cloak", type: "BUG", total: 424 },
        { id: "413", name: "Wormadam- Trash Cloak", type: "BUG", total: 424 }
    ];
    const result = consolidatePokemon(rows);
    assert.strictEqual(result.length, 3);
    const bulba = result.find(p => p.name === "Bulbasaur");
    assert.deepStrictEqual(bulba.types, ["GRASS", "POISON"]);
    const forms = result.filter(p => p.id === "413");
    assert.strictEqual(forms.length, 2);
});
