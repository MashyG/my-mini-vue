import { computed } from '../src/computed'
import { reactive } from '../src/reactive'

describe('computed', () => {
  it('happy path', () => {
    const value = reactive({
      foo: 1
    })

    expect(value.foo).toBe(1)
    const getter = computed(() => {
      return value.foo
    })

    value.foo = 2
    expect(value.foo).toBe(2)
    expect(getter.value).toBe(2)
  })

  it('should compute lazily', () => {
    const value = reactive({
      foo: 1
    })
    const getter = jest.fn(() => {
      return value.foo
    })
    const cValue = computed(getter)

    // lazy 懒执行，没调用 cValue.value 时，getter 不会被调用
    expect(getter).not.toHaveBeenCalled()

    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)

    // 调用 cValue.value 时，getter 不会被调用，只允许调用一次
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)

    // 改变 cValue.value 时，getter 不会被调用，只允许调用一次
    value.foo = 2 // 会触发 trigger -> effect -> 触发 get 时，重新执行返回新的值
    expect(getter).toHaveBeenCalledTimes(1)

    // 返回新的值
    expect(cValue.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)

    // 调用 cValue.value 时，getter 不会被调用，只允许调用一次
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  })
})
