import { effect, stop } from '../effect'
import { reactive } from '../reactive'

describe('effect', () => {
  it('核心流程', () => {
    // 响应式对象
    const user = reactive({ age: 18 })

    let nextAge
    effect(() => {
      nextAge = user.age + 1
    })
    // 初始化
    expect(nextAge).toBe(19)

    // 更新
    user.age++
    expect(nextAge).toBe(20)
  })

  // ???
  it('should return runner when call effect', () => {
    // effect (fn) -> return runner 函数 -> 执行函数 runner 后 再次执行 fn 并返回值
    let num = 18
    const runner = effect(() => {
      num++
      return 'num'
    })
    expect(num).toBe(19)

    const res = runner()
    expect(num).toBe(20)
    expect(res).toBe('num')
  })

  // ???
  it('scheduler', () => {
    let dummy
    let run: any
    const scheduler = jest.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      {
        scheduler
      }
    )

    // 没有被调用过
    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)

    // 触发响应式对象 set
    obj.foo++
    // scheduler 被调用的次数：1
    expect(scheduler).toHaveBeenCalledTimes(1)
    // 但是，没有执行 fn (effect 函数)
    expect(dummy).toBe(1)
    // 执行 run
    run()
    // 执行 fn
    expect(dummy).toBe(2)
  })

  it('stop', () => {
    let dummy
    const obj = reactive({ foo: 1 })
    const runner = effect(() => {
      dummy = obj.foo
    })
    obj.foo = 2
    expect(dummy).toBe(2)
    // 暂停响应式的触发：清空所有收集的 effect
    stop(runner)
    obj.foo = 3
    // 修改obj.foo，但未触发 effect
    expect(dummy).toBe(2)
    // 重新执行 runner 后，effect 重新被收集起来
    runner()
    expect(dummy).toBe(3)
  })

  it('onStop', () => {
    const obj = reactive({ foo: 1 })
    const onStop = jest.fn()
    let dummy
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      {
        onStop // stop 的回调函数
      }
    )

    stop(runner)
    expect(onStop).toBeCalledTimes(1)
  })
})
