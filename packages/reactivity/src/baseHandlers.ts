import { extend, isObject } from '@mashy-mini-vue/shared'
import { track, trigger } from './effect'
import { ReactiveFlags, reactive, readonly } from './reactive'

const createGetter = (isReadonly = false, shallow = false) => {
  return function get(target, key) {
    if (ReactiveFlags.IS_REACTIVE === key) {
      return !isReadonly
    } else if (ReactiveFlags.IS_READONLY === key) {
      return isReadonly
    }

    const res = Reflect.get(target, key)

    if (shallow) {
      return res
    }

    // 嵌套对象处理：判断 res 是否 Object
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    if (!isReadonly) {
      // 收集依赖
      track(target, key)
    }
    return res
  }
}

const createSetter = () => {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value)

    // 触发依赖
    trigger(target, key)
    return res
  }
}

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

export const mutableHandlers = {
  get,
  set
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    // 抛出错误
    console.warn(`key: ${key} set 失败，target is readonly！target: ${target}`)
    return true
  }
}

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet
})
