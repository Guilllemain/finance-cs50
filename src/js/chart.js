import axios from 'axios'
import echarts from 'echarts'
import moment from 'moment'


let entries, symbol, entries_realtime, entries_15min, entries_daily

const drawChart = (dates, values, period) => {
    if (values.length <= 0) return document.querySelector('#chart').innerHTML = '<p class="chart__no-values">No data available yet</p>'
    const myChart = echarts.init(document.querySelector('#chart'));
    myChart.setOption({
        grid: {
            top: '2%',
            right: '10%',
            bottom: '15%'
        },
        tooltip: {
            trigger: 'axis',

        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: dates,
            axisLabel: {
                formatter: function (val) {
                    if (period === '1d') return moment(val).format("hh:mm")
                    if (period === '1y') return moment(val).format("MMM [']YY")
                    if (period === '3y' || period === '5y') return moment(val).format("MMM [']YY")
                    if (period === 'forever') return moment(val).format('YYYY')
                    return moment(val).format("MMM D")
                }
            }
        },
        yAxis: {
            type: 'value',
            scale: true,
        },
        series: [
            {
                name: 'date',
                type: 'line',
                sampling: 'average',
                itemStyle: {
                    color: 'rgb(255, 70, 131)'
                },
                lineStyle: {
                    width: 1
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                        offset: 0,
                        color: 'rgba(255, 158, 68, .8)'
                    }, {
                        offset: 1,
                        color: 'rgb(255, 70, 131, .8)'
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

const getHistoricalPrices = async (period = '1d', timeframe = 'daily') => {
    symbol = document.querySelector('.chart__periods').dataset.symbol
    if (
        ((period === '1w' || period === '1m') && !entries_15min) ||
        ((period === 'ytd' || period === '3m' || period === '6m' || period === '1y' || period === '3y' || period === '5y' || period === 'forever') && !entries_daily)) {

        try {
            const { data } = await axios.get(`https://www.alphavantage.co/query?function=MIDPRICE&symbol=${symbol}&interval=${timeframe}&time_period=10&apikey=L1EUOH2BMKW2QDWU`)
            entries = Object.entries(data['Technical Analysis: MIDPRICE'])
        } catch (error) {
            console.error(error)
        }
    }
    if (period === '1d' && !entries_realtime) {
        try {
            const { data } = await axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&outputsize=full&apikey=L1EUOH2BMKW2QDWU`)
            entries = Object.entries(data['Time Series (1min)'])
            console.log(entries)
        } catch (error) {
            console.error(error)
        }
    }

    getPeriodData(period)
}

getHistoricalPrices()

const getFilteredData = (daysToSubstract, data) => {
    let past = moment().startOf('day')
    if (daysToSubstract !== 'none') past = moment().subtract(daysToSubstract, 'days').startOf('day')
    return data.filter(el => moment(el[0]) >= past)
}

const getPeriodData = period => {
    if (period === '1d') {
        if (!entries_realtime) entries_realtime = [...entries]
        entries = [...getFilteredData('none', entries_realtime)]
    }
    if (period === 'ytd') {
        if (!entries_daily) entries_daily = [...entries]
        // get the number of days since january 1st
        const ytd = moment().dayOfYear() - 1
        entries = [...getFilteredData(ytd, entries_daily)]
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
        entries = [...getFilteredData(30 * 3, entries_daily)]
    }
    if (period === '6m') {
        if (!entries_daily) entries_daily = [...entries]
        entries = [...getFilteredData(30 * 6, entries_daily)]
    }
    if (period === '1y') {
        if (!entries_daily) entries_daily = [...entries]
        entries = [...getFilteredData(365, entries_daily)]
    }
    if (period === '3y') {
        if (!entries_daily) entries_daily = [...entries]
        entries = [...getFilteredData(365 * 3, entries_daily)]
    }
    if (period === '5y') {
        if (!entries_daily) entries_daily = [...entries]
        entries = [...getFilteredData(365 * 5, entries_daily)]
    }
    if (period === 'forever') {
        if (!entries_daily) entries_daily = [...entries]
        entries = [...entries_daily]
    }

    let values
    if (entries) {
        if (period === '1d') {
            values = entries.map(el => el[1]).map(el => (Number(el['2. high']) + Number(el['3. low'])).toFixed(2) / 2).reverse()
        } else {
            values = entries.map(el => el[1]).map(el => el.MIDPRICE).reverse()
        }
    }
    const dates = entries.map(el => el[0]).reverse()
    drawChart(dates, values, period)
}

document.querySelectorAll('.chart__periods a').forEach(el => el.addEventListener('click', function (event) {
    event.preventDefault()
    // remove the active class on each link
    document.querySelectorAll('.chart__periods a').forEach(el => el.classList.remove('btn-chart--active'))
    // add the active class on the selected link
    this.classList.add('btn-chart--active')
    const period = this.dataset.period
    if (period === '1d') getHistoricalPrices(period)
    if (period === '1w' || period === '1m') getHistoricalPrices(period, '15min')
    if (period === 'ytd' || period === '3m' || period === '6m' || period === '1y' || period === '3y' || period === '5y' || period === 'forever') getHistoricalPrices(period)
}))

// display the date of the news article as 'xxx ago'
document.querySelectorAll('.news__datetime').forEach(el => {
    const datetime = el.innerHTML
    el.innerHTML = moment(datetime, "x").fromNow()
})

Date.prototype.substractDays = function (days) {
    const date = new Date(this.valueOf())
    date.setDate(date.getDate() - days)
    return date;
}