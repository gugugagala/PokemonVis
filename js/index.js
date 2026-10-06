let dataset = '';

const dimensions = {
    margin: {
        top: 30,
        right: 30,
        bottom: 30,
        left: 30
    }
};

let chartWidth, chartHeight

window.onload = getVisSize()
$(window).resize(function () {
    chartWidth = $('.vis-chart').width()
    chartHeight = $('.vis-chart').height()

    getDimensions()

})

function getVisSize() {
    chartWidth = $('.vis-chart').width()
    chartHeight = $('.vis-chart').height()
    getDimensions()
}

function getDimensions() {
    dimensions.width = (chartWidth - dimensions.margin.left - dimensions.margin.right) * 0.95
    dimensions.boundedWidth = (chartWidth - dimensions.margin.left - dimensions.margin.right)
    dimensions.height = (chartHeight - dimensions.margin.top - dimensions.margin.bottom) * 0.95
    dimensions.boundedHeight = (chartHeight - dimensions.margin.top - dimensions.margin.bottom)
}

let visChart = d3.select('.vis-chart').append("svg")
    .attr('width', chartWidth - dimensions.margin.left)
    .attr('height', chartHeight - dimensions.margin.right)
    .style('background-color', '#e0ffa3')

Promise.all([
        d3.csv("./data/pokemon.csv", d => d),
        d3.csv("./data/moves.csv", d => d),
        d3.csv("./data/evolution.csv", d => d),
        d3.csv("./data/typechart.csv", d => d)
    ])
    .then(data => dataset = data)
    .then(() => makeVisualization())

let limits;
let zuobiao_y, zuobiao_x;
let xScale, yScale;
let xAxis, yAxis;

function makeVisualization() {
    zuobiao_x = dataset[0].map((row) => parseInt(row["HP"]))
    zuobiao_y = dataset[0].map((row) => parseInt(row["Speed"]))

    limits = findMinMax(zuobiao_x, zuobiao_y)

    xScale = d3.scaleLinear()
        .domain([limits.dataOneMin, limits.dataOneMax])
        .range([0 + dimensions.margin.left, dimensions.width])
        .nice();
    yScale = d3.scaleLinear()
        .domain([limits.dataTwoMin, limits.dataTwoMax])
        .range([dimensions.height * 0.7, 0 + dimensions.margin.bottom])
        .nice();
    drawAxis(xScale, yScale);
    addAxisText('Speed', 'HP');
    drawPlot(xScale, yScale);

}

function findMinMax(data_one, data_two) {
    return {
        dataOneMin: d3.min(data_one),
        dataOneMax: d3.max(data_one),
        dataTwoMin: d3.min(data_two),
        dataTwoMax: d3.max(data_two)
    }
}



/******** 添加坐标轴 ***** */
function drawAxis(xScale, yScale) {

    xAxis = d3.axisBottom().scale(xScale);
    yAxis = d3.axisLeft().scale(yScale);

    visChart.append('g')
        .call(xAxis)
        .attr('transform', 'translate(' + (dimensions.margin.left) + ',' + (dimensions.height * 0.7) + ')')

    visChart.append('g')
        .call(yAxis)
        .attr("transform", 'translate(' + (dimensions.margin.left * 2) + ',' + (0) + ')')
}


/* ****** 添加坐标轴名称 **** */
function addAxisText(xAxisText, yAxisText) {
    visChart.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (dimensions.margin.left - 10) + "," + (dimensions.height * 0.7 / 2) + ")rotate(-90)")
        .style("font-size", "10pt")
        .text(xAxisText);

    visChart.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (dimensions.width / 2) + "," + (dimensions.height * 0.7 + dimensions.margin.bottom + 10) + ")")
        .style("font-size", "10pt")
        .text(yAxisText);
}

const xAccessor = d => d["HP"]
const yAccessor = d => d["Speed"]
let dots;

/********* 绘制散点图 ************/
function drawPlot(xScale, yScale) {
    dots = visChart.selectAll('circle')
        .data(dataset[0])
        .enter().append('circle')
        .attr("cx", d => xScale(xAccessor(d)))
        .attr('cy', d => yScale(yAccessor(d)))
        .attr('r', 5)
        .attr('fill', "#568100")
        .style("cursor", "pointer")
    plotTooltip();
    dots.on("mouseover", d => {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9)
        tooltip.html(
            "#" + d["#"] + " " + d["Name"] + "<br/>" +
            "Total: " + d["Total"] + "<br/>" +
            "HP: " + d["HP"] + "<br/>" +
            "Attack: " + d["Attack"] + "<br/>" +
            "Defense: " + d["Defense"] + "<br/>" +
            "Sp. Atk: " + d["Special Attack"] + "<br/>" +
            "Sp. Def: " + d["Special Defense"] + "<br/>" +
            "Speed: " + d["Speed"]
        )
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY + 25) + "px")
    }).on("mouseout", d => {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0)
            .style("cursor", "default");
    })
}

let tooltip;
/* 添加 tooltip 显示当前鼠标位置宝可梦的部分信息 */
function plotTooltip() {
    tooltip = d3.select(".vis-chart").append('div')
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("background", "#e4edf8")
        .style("color", "#154360")
        .style('font-size', '10pt')
        .style("text-align", "center")
        .style("padding", "10px")
        .style('box-shadow', "0 0 5px #999999")
        .style("position", "absolute")

}