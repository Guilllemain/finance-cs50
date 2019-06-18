import axios from 'axios'
import echarts from 'echarts'

let entries, symbol

const drawChart = (symbol, dates, values, period) => {
    const myChart = echarts.init(document.querySelector('#chart'));
    myChart.setOption({
        tooltip: {
            trigger: 'axis',
            position: function (pt) {
                return [pt[0], '10%'];
            }
        },
        title: {
            left: 'center',
            text: symbol,
        },
        toolbox: {
            feature: {
                dataZoom: {
                    yAxisIndex: 'none'
                },
                restore: {},
                saveAsImage: {}
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: dates
        },
        yAxis: {
            type: 'value',
        },
        dataZoom: [{
            type: 'slider',
            xAxisIndex: 0,
            filterMode: 'empty'
        },
            {
                type: 'slider',
                yAxisIndex: 0,
                filterMode: 'empty',
                start: period === 'ytd' ? 99 : 0,
                end: 100
            },
            {
                type: 'inside',
                xAxisIndex: 0,
                filterMode: 'empty'
            },
            {
                type: 'inside',
                yAxisIndex: 0,
                filterMode: 'empty'
            }],
        series: [
            {
                name: 'date',
                type: 'line',
                symbol: 'none',
                sampling: 'average',
                itemStyle: {
                    color: 'rgb(255, 70, 131)'
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                        offset: 0,
                        color: 'rgb(255, 158, 68)'
                    }, {
                        offset: 1,
                        color: 'rgb(255, 70, 131)'
                    }])
                },
                data: values
            }
        ]
    })
}

const getHistoricalPrices = async (period = 'ytd', timeframe = '15min') => {
    symbol = document.querySelector('.chart__periods').dataset.symbol
    try {
        const { data } = await axios.get(`https://www.alphavantage.co/query?function=MIDPRICE&symbol=${symbol}&interval=${timeframe}&time_period=10&apikey=L1EUOH2BMKW2QDWU`)
        entries = Object.entries(data['Technical Analysis: MIDPRICE'])
        getPeriodData(period)
    } catch(error) {
        console.error(error)
    }
    console.log(entries)
}

getHistoricalPrices()

const getPeriodData = period => {
    if (period != 'forever') {
        const latest = new Date()
        let daysToSubstract = 1
        if (period === '1w') daysToSubstract = 7
        if (period === '1m') daysToSubstract = 30
        if (period === '3m') daysToSubstract = 30 * 3
        if (period === '6m') daysToSubstract = 30 * 6
        if (period === '1y') daysToSubstract = 365
        if (period === '3y') daysToSubstract = 365 * 3
        if (period === '5y') daysToSubstract = 365 * 5
        const past = latest.substractDays(daysToSubstract)
        entries = entries.filter(el => new Date(el[0]) >= past)
    } else if (period === 'forever') {
        entries = [...entries]
    }
    
    const values = entries.map(el => el[1]).map(el => el.MIDPRICE).reverse()
    const dates = entries.map(el => el[0]).reverse()
    // const dates = Object.keys(data['Technical Analysis: MIDPRICE']).reverse()
    // const values = Object.values(data['Technical Analysis: MIDPRICE']).map(el => el.MIDPRICE).reverse()
    drawChart(symbol, dates, values, period)
}

document.querySelectorAll('.chart__periods a').forEach(el => el.addEventListener('click', function(event) {
    event.preventDefault()
    const period = this.dataset.period
    if (period === 'ytd' || period === '1w') getHistoricalPrices(period)
    if (period === '1m' || period === '3m' || period === '6m') getHistoricalPrices(period, '60min')
    if (period === '6m' || period === '1y' || period === '3y') getHistoricalPrices(period, 'daily')
    if (period === '5y' || period === 'forever') getHistoricalPrices(period, 'weekly')
}))


Date.prototype.substractDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() - days);
    return date;
}