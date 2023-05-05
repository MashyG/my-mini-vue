import { createRenderer } from '../runtime-core'

// createElement
function createElement(type) {
  console.log('createElement ----->>>>')
  return document.createElement(type)
}
// patchProps
function patchProps(el, key, val) {
  console.log('patchProps ----->>>>')
  const isEvent = (k: string) => /^on[A-Z]/.test(k)
  if (isEvent(key)) {
    const event = key.slice(2).toLocaleLowerCase()
    el.addEventListener(event, val)
  } else {
    el.setAttribute(key, val)
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
