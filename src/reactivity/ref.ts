import { hasChanged, isObject } from '../shared'
import { isTacking, trackEffects, triggerEffects } from './effect'
import { reactive } from './reactive'

class RefImpl {
  private _value: any
  public dep
  private _rawValue: any
  public __v_isRef = true
  constructor(value) {
    this._rawValue = value
    // 如果 value 是对象，则需要进行 reactive 处理
    this._value = convert(value)
    this.dep = new Set()
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    // 值不同时才触发
    // 当对比的值时对象时，需要取原有的值对比，因为对象会转为 proxy
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = convert(newVal)
      triggerEffects(this.dep)
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  if (isTacking()) {
    trackEffects(ref.dep)
  }
}

export function ref(value) {
  return new RefImpl(value)
}

export function isRef(ref) {
  return !!ref.__v_isRef
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

const shallowUnwrapHandlers = {
  get(target, key, receiver) {
    // 如果里面是一个 ref 类型的话，那么就返回 .value
    // 如果不是的话，那么直接返回value 就可以了
    return unRef(Reflect.get(target, key, receiver))
  },
  set(target, key, value, receiver) {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      return (target[key].value = value)
    }
    return Reflect.set(target, key, value, receiver)
  }
}

export function proxyRefs(ref) {
  return new Proxy(ref, shallowUnwrapHandlers)
}
