export const $ = (...args) => document.querySelector(...args)
export const $$ = (...args) => [...document.querySelectorAll(...args)]

export function downloadBlob (blob, fileName) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
}
