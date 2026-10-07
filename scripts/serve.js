/* 开发用静态服务器：npm run serve（默认 http://localhost:8000） */
const path = require("path");
const { start } = require("./static-server");

const port = Number(process.env.PORT) || 8000;

start(path.join(__dirname, ".."), port).then(({ url }) => {
    console.log(`PokemonVis 已启动：${url}`);
    console.log("按 Ctrl+C 停止");
});
