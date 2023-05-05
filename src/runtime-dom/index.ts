import { createRenderer } from '../runtime-core'

// createElement
function createElement(type) {
  console.log('createElement ----->>>>')
  return document.createElement(type)
}
// patchProps
function patchProps(el, key, prevVal, nextVal) {
  console.log('patchProps ----->>>>')
  const isEvent = (k: string) => /^on[A-Z]/.test(k)
  if (isEvent(key)) {
    const event = key.slice(2).toLocaleLowerCase()
    el.addEventListener(event, nextVal)
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, nextVal)
    }
  }
}
// insert
function insert(el, parent) {
  console.log('insert ----->>>>')
  parent.append(el)
}

const renderer: any = createRenderer({
  createElement,
  patchProps,
  insert
})

export function createApp(...args) {
  return renderer.createApp(...args)
}

export * from '../runtime-core'
