import { isProxy, isReactive, reactive } from '../src/reactive'

describe('reactive', () => {
  it('核心', () => {
    const original = { foo: 1 }
    const observed = reactive(original)

    expect(observed).not.toBe(original)
    expect(observed.foo).toBe(1)

    expect(isReactive(observed)).toBe(true)
    expect(isProxy(observed)).toBe(true)
  })

  it('嵌套对象 响应式', () => {
    const original = {
      nested: {
        foo: 1
      },
      arr: [{ bar: 2 }]
    }
    const observed = reactive(original)
    expect(isReactive(observed.nested)).toBe(true)
    expect(isReactive(observed.arr)).toBe(true)
    expect(isReactive(observed.arr[0])).toBe(true)
  })
})
