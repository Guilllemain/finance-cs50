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
    container.style.display = 'block'
    container.innerHTML = ''
    const value = searchInput.value.toLowerCase()
    if (!value || value.length <= 1) return
    let results = symbols.filter(el => el.symbol.toLowerCase().includes(value) || el.name.toLowerCase().includes(value))
    if (results.length > 5) results = results.slice(0, 5)
    results.forEach(el => {
        const list = document.createElement('li')
        const link = document.createElement('a')
        link.classList.add('link__result')
        link.innerHTML = `<span>${el.symbol}</span> | ${el.name}`
        list.appendChild(link)
        container.appendChild(list)
    });
    selectSymbol()
}

const selectSymbol = () => {
    document.querySelectorAll('.link__result').forEach(link => link.addEventListener('click', function () {
        searchInput.value = this.querySelector('span').innerHTML
        document.searchForm.submit()
        searchInput.focus()
        container.style.display = 'none'
    }))
}

searchInput.addEventListener('keydown', _.debounce(function() {
    showResults()
}, 400))

document.addEventListener('click', event => {
    if (!event.target.matches('#search', '.search__results *')) {
        container.style.display = 'none'
    }
})

searchInput.addEventListener('focusin', () => container.style.display = 'block')

document.querySelector('#clearSearch').addEventListener('click', () => {
    searchInput.value = ''
    container.innerHTML = ''
    searchInput.focus()
})

document.querySelectorAll('.dashboard__symbol').forEach(el => el.addEventListener('click', function (event) {
    event.preventDefault()
    el.parentElement.submit()
}))