import { ShapeFlags } from '@mashy-mini-vue/shared'

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export { createVNode as createElementVNode }

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    component: null,
    key: props && props.key,
    el: null,
    shapeFlags: getShapeFlag(type)
  }

  // children
  if (typeof children === 'string') {
    vnode.shapeFlags |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    vnode.shapeFlags |= ShapeFlags.ARRAY_CHILDREN
  }

  // slots
  if (vnode.shapeFlags & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === 'object') {
      vnode.shapeFlags |= ShapeFlags.SLOT_CHILDREN
    }
  }

  return vnode
}

export function createTextVNode(text) {
  return createVNode(Text, {}, text)
}

function getShapeFlag(type) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}
