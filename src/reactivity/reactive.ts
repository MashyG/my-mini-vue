import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers
} from './baseHandlers'

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly'
}

const createReactiveObject = (raw, baseHandlers = mutableHandlers) => {
  return new Proxy(raw, baseHandlers)
}

export function reactive(raw) {
  return createReactiveObject(raw)
}

export function readonly(raw) {
  return createReactiveObject(raw, readonlyHandlers)
}

export function shallowReadonly(raw) {
  return createReactiveObject(raw, shallowReadonlyHandlers)
}

export function isReactive(value) {
  // 触发 get
  return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}
export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}
