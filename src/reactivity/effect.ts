import { extend } from '../shared'

// 全局变量存储 ReactiveEffect 实例对象，用于调用 fn
let activeEffect

class ReactiveEffect {
  private _fn: any
  deps = [] // 所有的依赖
  onStop?: () => void // stop 回调函数
  active = true
  constructor(fn, public scheduler?) {
    this._fn = fn
  }

  run() {
    activeEffect = this // 暂存实例，触发依赖或暂停相应时调用
    return this._fn()
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
}

// 收集依赖
// target 容器
const targetMap = new Map()
export function track(target, key) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  // key 容器
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  if (activeEffect) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

// 触发依赖
export function trigger(target, key) {
  const depsMap = targetMap.get(target)
  const dep = depsMap.get(key)

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

  const runner: any = _effect.run.bind(_effect)
  // 将实例对象暂存起来，便于后续使用 effect
  runner.effect = _effect

  return runner
}

export function stop(runner) {
  runner.effect.stop()
}
