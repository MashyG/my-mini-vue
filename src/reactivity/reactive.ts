import { trackEffect, triggerEffect } from './effect'

export function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      const res = Reflect.get(target, key)

      // 收集依赖
      trackEffect(target, key)
      return res
    },

    set(target, key, value) {
      const res = Reflect.set(target, key, value)

      // 触发依赖
      triggerEffect(target, key)
      return res
    }
  })
}
