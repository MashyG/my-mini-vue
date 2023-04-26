// import { createDep } from './dep'
import { ReactiveEffect } from './effect'
// import { trackRefValue, triggerRefValue } from './ref'

export class ComputedRefImpl {
  private _dirty: boolean = true
  private _value: any
  private _effect: any

  constructor(getter) {
    this._effect = new ReactiveEffect(getter, () => {
      // 修改值时，会触发 trigger，执行 scheduler 方法
      if (!this._dirty) {
        this._dirty = true
      }
    })
  }

  get value() {
    if (this._dirty) {
      this._dirty = false
      // 这里执行 run 的话，就是执行用户传入的 fn
      this._value = this._effect.run()
    }

    return this._value
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter)
}
