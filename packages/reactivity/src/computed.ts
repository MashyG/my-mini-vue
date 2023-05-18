import { createDep } from './dep'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

export class ComputedRefImpl {
  public dep: any
  public _effect: any

  private _dirty: boolean = true
  private _value: any

  constructor(getter) {
    this._dirty = true
    this.dep = createDep()
    this._effect = new ReactiveEffect(getter, () => {
      // 修改值时，会触发 trigger，执行 scheduler 方法
      // scheduler
      // 只要触发了这个函数说明响应式对象的值发生改变了
      // 那么就解锁，后续在调用 get 的时候就会重新执行，所以会得到最新的值
      if (!this._dirty) {
        this._dirty = true
      }
      triggerRefValue(this)
    })
  }

  get value() {
    trackRefValue(this)
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
