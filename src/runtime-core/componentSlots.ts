import { ShapeFlags } from '../shared/shapeFlags'

const normalizeSlotValue = (value) => {
  return Array.isArray(value) ? value : [value]
}

const normalizeObjectSlots = (children, slots) => {
  for (const key in children) {
    const value = children[key]
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
}

export function initSlots(instance, children) {
  const { vnode } = instance || {}
  if (vnode.shapeFlags & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots)
  }
}
