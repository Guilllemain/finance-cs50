import axios from 'axios'
import echarts from 'echarts'

let entries, symbol, entries_15min, entries_daily

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
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: dates
        },
        yAxis: {
            type: 'value',
            scale: true
        },
        dataZoom: [{
            type: 'slider',
            xAxisIndex: 0,
            filterMode: 'empty'
        },
            {
                type: 'inside',
                xAxisIndex: 0,
                filterMode: 'empty'
            }
        ],
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
                data: values,
                markLine: {
                    data: [
                        [{
                            symbol: 'none',
                            x: '90%',
                            yAxis: 'max'
                        }, {
                            symbol: 'circle',
                            label: {
                                normal: {
                                    position: 'start',
                                    formatter: function (params) {
                                        return params.value.toFixed(2);
                                    },
                                }
                            },
                            type: 'max',
                            lineStyle: {
                                color: 'rgba(0, 128, 0, .8)'
                            },
                        }],
                        [{
                            symbol: 'none',
                            x: '90%',
                            yAxis: 'min'
                        }, {
                                symbol: 'circle',
                                label: {
                                    normal: {
                                        position: 'start',
                                        formatter: function (params) {
                                            return params.value.toFixed(2);
                                        },
                                    }
                                },
                                type: 'min',
                                lineStyle: {
                                    color: 'rgba(255, 0, 0, .8)'
                                },
                            }]
                    ]
                }
            }
        ]
    })
}

const getHistoricalPrices = async (period = 'ytd', timeframe = '15min') => {
    symbol = document.querySelector('.chart__periods').dataset.symbol
    if (
        ((period === 'ytd' || period === '1w' || period === '1m') && !entries_15min) || 
        ((period === '3m' || period === '6m' || period === '1y' || period === '3y' || period === '5y' || period === 'forever') && !entries_daily)) {

            try {
                console.log('fetch')
                const { data } = await axios.get(`https://www.alphavantage.co/query?function=MIDPRICE&symbol=${symbol}&interval=${timeframe}&time_period=10&apikey=L1EUOH2BMKW2QDWU`)
                console.log(data)
                entries = Object.entries(data['Technical Analysis: MIDPRICE'])
            } catch(error) {
                console.error(error)
            }
        }
    getPeriodData(period)
}

getHistoricalPrices()

const getFilteredData = (daysToSubstract, data) => {
    const latest = new Date()
    const past = latest.substractDays(daysToSubstract)
    latest.setHours(0, 0, 0, 0)
    past.setHours(0, 0, 0, 0)
    return data.filter(el => new Date(el[0]) >= past)
}

const getPeriodData = period => {
        if (period === 'ytd') {
            if (!entries_15min) entries_15min = [...entries]
            entries = [...getFilteredData(1, entries_15min)]
        }
        if (period === '1w') {
            if (!entries_15min) entries_15min = [...entries]
            entries = [...getFilteredData(7, entries_15min)]
        }
        if (period === '1m') {
            if (!entries_15min) entries_15min = [...entries]
            entries = [...getFilteredData(30, entries_15min)]
        }
        if (period === '3m') {
            if (!entries_daily) entries_daily = [...entries]
            entries = [...getFilteredData(30*3, entries_daily)]
        }
        if (period === '6m') {
            if (!entries_daily) entries_daily = [...entries]
            entries = [...getFilteredData(30*6, entries_daily)]
        }
        if (period === '1y') {
            if (!entries_daily) entries_daily = [...entries]
            entries = [...getFilteredData(365, entries_daily)]
        }
        if (period === '3y') {
            if (!entries_daily) entries_daily = [...entries]
            entries = [...getFilteredData(365*3, entries_daily)]
        }
        if (period === '5y') {
            if (!entries_daily) entries_daily = [...entries]
            entries = [...getFilteredData(365 * 5, entries_daily)]
        }
        if (period === 'forever') {
            if (!entries_daily) entries_daily = [...entries]
            entries = [...entries_daily]
        }
    console.log(entries)
    
    const values = entries.map(el => el[1]).map(el => el.MIDPRICE).reverse()
    const dates = entries.map(el => el[0]).reverse()
    // const dates = Object.keys(data['Technical Analysis: MIDPRICE']).reverse()
    // const values = Object.values(data['Technical Analysis: MIDPRICE']).map(el => el.MIDPRICE).reverse()
    drawChart(symbol, dates, values, period)
}

document.querySelectorAll('.chart__periods a').forEach(el => el.addEventListener('click', function(event) {
    event.preventDefault()
    const period = this.dataset.period
    if (period === 'ytd' || period === '1w' || period === '1m') getHistoricalPrices(period)
    if (period === '3m' || period === '6m' || period === '1y' || period === '3y'|| period === '5y' || period === 'forever') getHistoricalPrices(period, 'daily')
}))


Date.prototype.substractDays = function (days) {
    const date = new Date(this.valueOf())
    date.setDate(date.getDate() - days)
    return date;
}