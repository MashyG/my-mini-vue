import { extend } from '../shared'
import { createDep } from './dep'

// 全局变量存储 ReactiveEffect 实例对象，用于调用 fn
let activeEffect
let shouldTack

export class ReactiveEffect {
  private _fn: any
  deps = [] // 所有的依赖 dep
  onStop?: () => void // stop 回调函数
  active = true
  constructor(fn, public scheduler?) {
    this._fn = fn
  }

  run() {
    if (!this.active) {
      return this._fn()
    }

    shouldTack = true
    activeEffect = this // 暂存实例，触发依赖或暂停相应时调用
    const result = this._fn()
    shouldTack = false
    return result
  }

  stop() {
    if (this.active) {
      cleanupEffect(this)

      this.onStop && this.onStop()

      this.active = false
    }
  }
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
  effect.deps.length = 0
}

// 收集依赖
// target 容器
const targetMap = new Map()
export function track(target, key) {
  if (!isTacking()) return

  // target 容器
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  // key 容器
  let dep = depsMap.get(key)
  if (!dep) {
    dep = createDep()
    depsMap.set(key, dep)
  }
  trackEffects(dep)
}

export function trackEffects(dep) {
  // 看看 dep 之前有没有添加过，若有，则不添加了
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    // activeEffect.deps 用于之后清除 dep 工作，所以暂存一下
    activeEffect.deps.push(dep)
  }
}

export function isTacking() {
  return shouldTack && activeEffect !== undefined
}

// 触发依赖
export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const dep = depsMap.get(key)

  triggerEffects(dep)
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

export function effect(fn, options?: any) {
  const { scheduler } = options || {}
  // 调用 fn
  const _effect = new ReactiveEffect(fn, scheduler)

  extend(_effect, options)

  _effect.run()

  // 内部存在 this，所以需要绑定当前实例 _effect
  const runner: any = _effect.run.bind(_effect)
  // 将实例对象暂存起来，便于后续使用 effect
  runner.effect = _effect

  return runner
}

export function stop(runner) {
  runner.effect.stop()
}
