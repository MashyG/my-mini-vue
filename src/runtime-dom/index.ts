import { createRenderer } from '../runtime-core'

// createElement
function createElement(type) {
  console.log('createElement ----->>>> type ', type)
  return document.createElement(type)
}
// patchProps
function patchProps(el, key, prevVal, nextVal) {
  console.log('patchProps ----->>>> el, key, nextVal', el, key, nextVal)
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
function insert(child, parent, anchor) {
  console.log('insert ----->>>> child, parent', child, parent)
  // parent.append(el)
  // 将 child 添加到锚点 anchor 之前
  parent.insertBefore(child, anchor || null)
}

function remove(child) {
  console.log('remove ----->>>> child', child)
  const { parentNode } = child || {}
  if (parentNode) {
    parentNode.removeChild(child)
  }
}

function setElementText(el, text) {
  el.textContent = text
}

const renderer: any = createRenderer({
  createElement,
  patchProps,
  insert,
  remove,
  setElementText
})

export function createApp(...args) {
  return renderer.createApp(...args)
}

export * from '../runtime-core'
