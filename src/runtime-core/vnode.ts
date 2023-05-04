import { ShapeFlags } from '../shared/shapeFlags'

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
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

function getShapeFlag(type) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}
