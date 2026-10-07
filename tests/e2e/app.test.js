/* 端到端测试：真实浏览器驱动静态页面（node --test + playwright-core） */
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { start } = require("../../scripts/static-server");
const { findChromium } = require("../helpers/browser");

const chromiumPath = findChromium();

let server;
let base;
let browser;
let context;

before(async () => {
    const started = await start(path.join(__dirname, "..", ".."));
    server = started.server;
    base = started.url;
    const { chromium } = require("playwright-core");
    try {
        const options = chromiumPath ? { executablePath: chromiumPath, headless: true } : { headless: true };
        browser = await chromium.launch(options);
        context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            acceptDownloads: true,
            permissions: ["clipboard-read", "clipboard-write"]
        });
    } catch (err) {
        browser = null;
    }
});

after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
});

async function openApp(t) {
    if (!browser) {
        t.skip("未找到可用浏览器（设置 PV_CHROMIUM 或安装 Playwright Chromium 后重试）");
        return null;
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(base + "/", { waitUntil: "load" });
    await page.waitForTimeout(1400);
    return { page, errors };
}

test("页面加载后渲染散点图且无控制台错误", async t => {
    const ctx = await openApp(t);
    if (!ctx) return;
    const { page, errors } = ctx;
    const dots = await page.locator(".vis-chart circle.dot").count();
    assert.ok(dots > 500, `散点数量应大于 500，实际 ${dots}`);
    assert.deepStrictEqual(errors, []);
    await page.close();
});

test("顶部工具栏包含 3 个操作按钮", async t => {
    const ctx = await openApp(t);
    if (!ctx) return;
    const { page } = ctx;
    assert.strictEqual(await page.locator("#nav-tools .tool-btn").count(), 3);
    assert.strictEqual(await page.locator(".nav-items .nav-item").count(), 6);
    await page.close();
});

test("五个视图均可切换并渲染内容", async t => {
    const ctx = await openApp(t);
    if (!ctx) return;
    const { page, errors } = ctx;
    for (const view of ["scatter", "typechart", "evolution", "moves", "parallel", "generation"]) {
        await page.click(`.nav-item[data-view="${view}"]`);
        await page.waitForTimeout(450);
        const children = await page.locator(".vis-chart svg *").count();
        assert.ok(children > 5, `${view} 视图渲染元素过少：${children}`);
    }
    assert.deepStrictEqual(errors, []);
    await page.close();
});

test("深链接恢复视图与筛选状态", async t => {
    if (!browser) {
        t.skip("未找到可用浏览器");
        return;
    }
    const page = await context.newPage();
    await page.goto(base + "/#view=parallel&type=WATER&name=Blastoise", { waitUntil: "load" });
    await page.waitForTimeout(1400);
    assert.strictEqual(await page.locator(".nav-item.active").getAttribute("data-view"), "parallel");
    const title = await page.locator(".chart-title").textContent();
    assert.ok(title.includes("平行坐标"), title);
    assert.strictEqual(await page.locator(".selection-chip").count(), 1);
    await page.close();
});

test("悬停散点显示提示框", async t => {
    const ctx = await openApp(t);
    if (!ctx) return;
    const { page } = ctx;
    await page.locator(".vis-chart circle.dot").first().dispatchEvent("mouseover");
    await page.waitForTimeout(250);
    const opacity = await page.locator(".vis-chart .tooltip").evaluate(el => getComputedStyle(el).opacity);
    assert.ok(parseFloat(opacity) > 0.5, `提示框透明度应可见，实际 ${opacity}`);
    await page.close();
});

test("技能视图可按所选宝可梦的真实可学招式联动", async t => {
    const ctx = await openApp(t);
    if (!ctx) return;
    const { page } = ctx;

    const learnsetRows = await page.evaluate(() => window.PV.state.learnsets.length);
    assert.ok(learnsetRows > 30000, `learnset 数据应已加载，实际 ${learnsetRows}`);

    await page.locator('.menu input[type="text"]').fill("Charizard");
    await page.locator('.menu input[type="text"]').dispatchEvent("change");
    await page.waitForTimeout(400);

    await page.click('.nav-item[data-view="moves"]');
    await page.waitForTimeout(500);

    const linkSelect = page.locator(".menu-field", {
        has: page.locator("label", { hasText: "关联所选宝可梦" })
    }).locator("select");
    await linkSelect.selectOption("learnset");
    await page.waitForTimeout(500);

    const subtitle = await page.locator(".moves-svg .chart-subtitle").textContent();
    assert.ok(subtitle.includes("Charizard"), subtitle);
    assert.ok(subtitle.includes("可学招式"), subtitle);

    const matched = await page.evaluate(() => {
        const m = /匹配 (\d+) 个技能/.exec(document.querySelector(".moves-svg .chart-subtitle").textContent);
        return m ? Number(m[1]) : -1;
    });
    assert.ok(matched > 0 && matched < 300, `可学招式数应适中，实际 ${matched}`);

    await page.close();
});

test("导出 CSV 触发下载且文件名正确", async t => {
    const ctx = await openApp(t);
    if (!ctx) return;
    const { page } = ctx;
    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#nav-tools .tool-btn", { hasText: "CSV" }).click()
    ]);
    assert.strictEqual(download.suggestedFilename(), "pokemonvis-scatter.csv");
    await page.close();
});
