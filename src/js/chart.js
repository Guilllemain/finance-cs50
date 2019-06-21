import axios from 'axios'
import echarts from 'echarts'
import moment from 'moment'

let entries, symbol, entries_15min, entries_daily

const drawChart = (dates, values, period) => {
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

const getHistoricalPrices = async (period = 'ytd', timeframe = 'daily') => {
    symbol = document.querySelector('.chart__periods').dataset.symbol
    if (
        (( period === '1w' || period === '1m') && !entries_15min) || 
        (( period === 'ytd' || period === '3m' || period === '6m' || period === '1y' || period === '3y' || period === '5y' || period === 'forever') && !entries_daily)) {

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
            if (!entries_daily) entries_daily = [...entries]
            // calculate how many days since 1st of january
            const oneDay = 24 * 60 * 60 * 1000
            const today = new Date()
            const currentYear = today.getFullYear()
            today.setHours(0, 0, 0, 0)
            const firstJanuary = new Date(`01 01 ${currentYear}`)
            const ytd = Math.round(Math.abs((today - firstJanuary) / oneDay))
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
    drawChart(dates, values, period)
}

document.querySelectorAll('.chart__periods a').forEach(el => el.addEventListener('click', function(event) {
    event.preventDefault()
    // remove the active class on each link
    document.querySelectorAll('.chart__periods a').forEach(el => el.classList.remove('btn-chart--active'))
    // add the active class on the selected link
    this.classList.add('btn-chart--active')
    const period = this.dataset.period
    if ( period === '1w' || period === '1m') getHistoricalPrices(period, '15min')
    if (period === 'ytd' || period === '3m' || period === '6m' || period === '1y' || period === '3y'|| period === '5y' || period === 'forever') getHistoricalPrices(period)
}))


Date.prototype.substractDays = function (days) {
    const date = new Date(this.valueOf())
    date.setDate(date.getDate() - days)
    return date;
}