import axios from 'axios'
import _ from 'lodash'

let symbols = []
const searchInput = document.querySelector('#search')
const container = document.querySelector('.search__results')

const getSymbols = async () => {
    const { data } = await axios('https://api.iextrading.com/1.0/ref-data/symbols')
    symbols = [...data]
}
getSymbols()

const showResults = () => {
    container.innerHTML = ''
    const value = searchInput.value.toLowerCase()
    if (!value || value.length <= 1) return
    let results = symbols.filter(el => el.symbol.toLowerCase().includes(value) || el.name.toLowerCase().includes(value))
    if (results.length > 5) results = results.slice(0, 5)
    results.forEach(el => {
        const list = document.createElement('li')
        const link = document.createElement('a')
        link.classList.add('link__result')
        const span = document.createElement('span')
        link.innerHTML = `<span>${el.symbol}</span> | ${el.name}`
        list.appendChild(link)
        container.appendChild(list)
    });
    selectSymbol()
}

const selectSymbol = () => {
    document.querySelectorAll('.link__result').forEach(link => link.addEventListener('click', function () {
        searchInput.value = this.querySelector('span').innerHTML
        searchInput.focus()
        container.innerHTML = ''
    }))
}

document.querySelectorAll('.dashboard__symbol').forEach(el => el.addEventListener('click', function(event) {
    event.preventDefault()
    const data = new FormData();
    data.set('symbol', 'AAPL');
    axios({
        method: 'post',
        url: '/quote',
        data
    }).then(res => console.log(res)).catch(er => console.log(er))
}))

searchInput.addEventListener('keydown', _.debounce(function() {
    showResults()
}, 400))
