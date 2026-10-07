/* 定位可用的 Chromium 可执行文件：优先环境变量，其次 Playwright 缓存 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const RELATIVE = [
    ["chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
    ["chrome-mac", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
    ["chrome-linux", "chrome"],
    ["chrome-win", "chrome.exe"]
];

function findChromium() {
    if (process.env.PV_CHROMIUM && fs.existsSync(process.env.PV_CHROMIUM)) {
        return process.env.PV_CHROMIUM;
    }

    const caches = [
        path.join(os.homedir(), "Library/Caches/ms-playwright"),
        path.join(os.homedir(), ".cache", "ms-playwright")
    ];

    for (const cache of caches) {
        if (!fs.existsSync(cache)) continue;
        const dirs = fs.readdirSync(cache).filter(d => d.startsWith("chromium-"));
        for (const dir of dirs) {
            for (const parts of RELATIVE) {
                const candidate = path.join(cache, dir, ...parts);
                if (fs.existsSync(candidate)) return candidate;
            }
        }
    }
    return null;
}

module.exports = { findChromium };
