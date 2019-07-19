import axios from 'axios'

document.registration.username.addEventListener('keyup', async function () {
    this.classList.remove('invalid', 'valid')
    if (this.value.length < 4) {
        this.classList.add('invalid')
        isFormValid()
        return document.querySelector('#helper-username').setAttribute('data-error', 'Username must be at least 4 characters long')
    }
    const { data } = await axios.get('/check', { params: { username: this.value } })

    if (!data) {
        document.querySelector('button').setAttribute('disabled', true)
        document.querySelector('#helper-username').setAttribute('data-error', 'Username already taken')
        this.classList.add('invalid')
    } else {
        this.classList.add('valid')
    }
    isFormValid()
})
document.registration.password.addEventListener('keyup', function () {
    this.classList.remove('invalid', 'valid')
    isPasswordEqual(document.registration.password_confirmation)
    if (this.value.length < 6) {
        this.classList.add('invalid')
    } else {
        this.classList.add('valid')
    }
    isFormValid()
})
document.registration.password_confirmation.addEventListener('keyup', function () {
    if (this.value.length === 0) return this.classList.add('invalid')
    isPasswordEqual(this)
    isFormValid()
})
document.registration.addEventListener('submit', async function (event) {
    event.preventDefault()

    if (this.password.value !== this.password_confirmation.value) {
        return this.password_confirmation.classList.add('invalid')
    }
    this.submit()
})
const isFormValid = () => {
    if ([...document.registration.querySelectorAll('input')].every(el => el.classList.contains('valid'))) {
        document.querySelector('button').removeAttribute('disabled')
    } else {
        document.querySelector('button').setAttribute('disabled', true)
    }
}
const isPasswordEqual = el => {
    el.classList.remove('invalid', 'valid')
    if (el.value.length === 0) return
    if (el.value !== document.registration.password.value) {
        return el.classList.add('invalid')
    }
    el.classList.add('valid')
}