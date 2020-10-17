import { $, $$, downloadBlob } from './dom-utils'
import { addSlash, getFormattedDate } from './util'
import pdfBase from '../certificate.pdf'
import { generatePdf } from './pdf-util'
import SecureLS from 'secure-ls'

const secureLS = new SecureLS({ encodingType: 'aes' })
const formProfile = $('#form-profile')
const formInputs = $$('#form-profile input')
const snackbar = $('#snackbar')
const clearDataSnackbar = $('#snackbar-cleardata')
const reasonInputs = [...$$('input[name="field-reason"]')]
const reasonFieldset = $('#reason-fieldset')
const reasonAlert = reasonFieldset.querySelector('.msg-alert')
const releaseDateInput = $('#field-datesortie')
const releaseTimeInput = $('#field-heuresortie')
const storeDataInput = $('#field-storedata')

const conditions = {
  '#field-firstname': {
    length: 1,
  },
  '#field-lastname': {
    length: 1,
  },
  '#field-birthday': {
    pattern: /^([0][1-9]|[1-2][0-9]|30|31)\/([0][1-9]|10|11|12)\/(19[0-9][0-9]|20[0-1][0-9]|2020)/g,
  },
  '#field-lieunaissance': {
    length: 1,
  },
  '#field-address': {
    length: 1,
  },
  '#field-town': {
    length: 1,
  },
  '#field-zipcode': {
    pattern: /\d{5}/g,
  },
  '#field-datesortie': {
    pattern: /\d{4}-\d{2}-\d{2}/g,
  },
  '#field-heuresortie': {
    pattern: /\d{2}:\d{2}/g,
  },
}

function validateAriaFields () {
  return Object.keys(conditions)
    .map((field) => {
      const fieldData = conditions[field]
      const pattern = fieldData.pattern
      const length = fieldData.length
      const isInvalidPattern = pattern && !$(field).value.match(pattern)
      const isInvalidLength = length && !$(field).value.length

      const isInvalid = !!(isInvalidPattern || isInvalidLength)

      $(field).setAttribute('aria-invalid', isInvalid)
      if (isInvalid) {
        $(field).focus()
      }
      return isInvalid
    })
    .includes(true)
}

function updateSecureLS () {
  if (wantDataToBeStored() === true) {
    secureLS.set('profile', getProfile())
    secureLS.set('reason', getReason())
  } else {
    clearSecureLS()
  }
}

function clearSecureLS () {
  secureLS.clear()
}

function clearForm () {
  formProfile.reset()
}

function setCurrentDate () {
  const currentDate = new Date()

  releaseDateInput.value = getFormattedDate(currentDate)
  releaseTimeInput.value = currentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function showSnackbar (snackbarToShow, showDuration = 6000) {
  snackbarToShow.classList.remove('d-none')
  setTimeout(() => snackbarToShow.classList.add('show'), 100)

  setTimeout(function () {
    snackbarToShow.classList.remove('show')
    setTimeout(() => snackbarToShow.classList.add('d-none'), 500)
  }, showDuration)
}

export function setReleaseDateTime () {
  const loadedDate = new Date()
  releaseDateInput.value = getFormattedDate(loadedDate)
}

export function getProfile () {
  const fields = {}
  for (const field of formInputs) {
    if (field.id === 'field-datesortie') {
      const dateSortie = field.value.split('-')
      fields[
        field.id.substring('field-'.length)
      ] = `${dateSortie[2]}/${dateSortie[1]}/${dateSortie[0]}`
    } else {
      fields[field.id.substring('field-'.length)] = field.value
    }
  }
  return fields
}

export function getReason () {
  const checkedReasonInput = reasonInputs.find(input => input.checked)
  return checkedReasonInput?.value
}

export function wantDataToBeStored () {
  return storeDataInput.checked
}

export function prepareInputs () {
  const lsProfile = secureLS.get('profile')
  const lsReason = secureLS.get('reason')
  const currentDate = new Date()
  const formattedDate = getFormattedDate(currentDate)
  const formattedTime = currentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  formInputs.forEach((input) => {
    switch (input.name) {
      case 'datesortie' :
        input.value = formattedDate
        break
      case 'heuresortie' :
        input.value = formattedTime
        break
      case 'field-reason' :
        if (lsReason && input.value === lsReason) input.checked = true
        break
      case 'storedata' :
        if (lsReason || lsProfile) input.checked = true
        break
      default :
        if (lsProfile) input.value = lsProfile[input.name]
    }
    const exempleElt = input.parentNode.parentNode.querySelector('.exemple')
    const validitySpan = input.parentNode.parentNode.querySelector('.validity')
    if (input.placeholder && exempleElt) {
      input.addEventListener('input', (event) => {
        if (input.value) {
          exempleElt.innerHTML = 'ex.&nbsp;: ' + input.placeholder
          validitySpan.removeAttribute('hidden')
        } else {
          exempleElt.innerHTML = ''
        }
      })
    }
  })

  $('#field-birthday').addEventListener('keyup', function (event) {
    event.preventDefault()
    const input = event.target
    const key = event.keyCode || event.charCode
    if (key !== 8 && key !== 46) {
      input.value = addSlash(input.value)
    }
  })

  reasonInputs.forEach(radioInput => {
    radioInput.addEventListener('change', function (event) {
      const isInError = reasonInputs.every(input => !input.checked)
      reasonFieldset.classList.toggle('fieldset-error', isInError)
      reasonAlert.classList.toggle('hidden', !isInError)
    })
  })

  $('#formgroup-storedata').addEventListener('click', (event) => {
    (storeDataInput.checked) ? storeDataInput.checked = false : storeDataInput.checked = true
  })

  $('#cleardata').addEventListener('click', (event) => {
    clearSecureLS()
    clearForm()
    setCurrentDate()
    showSnackbar(clearDataSnackbar, 1200)
  })

  $('#generate-btn').addEventListener('click', async (event) => {
    event.preventDefault()

    const reason = getReason()
    if (!reason) {
      reasonFieldset.classList.add('fieldset-error')
      reasonAlert.classList.remove('hidden')
      reasonFieldset.scrollIntoView && reasonFieldset.scrollIntoView()
      return
    }

    const invalid = validateAriaFields()
    if (invalid) {
      return
    }

    updateSecureLS()

    const pdfBlob = await generatePdf(getProfile(), reason, pdfBase)

    const creationInstant = new Date()
    const creationDate = creationInstant.toLocaleDateString('fr-CA')
    const creationHour = creationInstant
      .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      .replace(':', '-')

    downloadBlob(pdfBlob, `attestation-${creationDate}_${creationHour}.pdf`)

    showSnackbar(snackbar)
  })
}
