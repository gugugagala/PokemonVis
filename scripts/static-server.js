/* 极简静态文件服务器，供 `npm run serve` 与端到端测试复用（零依赖） */
const http = require("http");
const fs = require("fs");
const path = require("path");

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".png": "image/png"
};

function createServer(rootDir) {
    const root = path.resolve(rootDir);
    return http.createServer((req, res) => {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath === "/") urlPath = "/index.html";
        const filePath = path.join(root, urlPath.replace(/^\/+/, ""));
        if (!filePath.startsWith(root)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end("Not found");
                return;
            }
            res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
            res.end(data);
        });
    });
}

function start(rootDir, port = 0) {
    return new Promise(resolve => {
        const server = createServer(rootDir);
        server.listen(port, "127.0.0.1", () => {
            const actual = server.address().port;
            resolve({ server, port: actual, url: `http://127.0.0.1:${actual}` });
        });
    });
}

module.exports = { createServer, start };
