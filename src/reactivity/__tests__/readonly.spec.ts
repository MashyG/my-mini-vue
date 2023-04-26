import { isProxy, isReadonly, readonly } from '../reactive'

describe('readonly', () => {
  it('核心', () => {
    // not set
    const original = { foo: 1, bar: { baz: 2 } }
    const wrapped = readonly(original)
    expect(wrapped).not.toBe(original)
    expect(isReadonly(wrapped)).toBe(true)
    expect(isReadonly(original)).toBe(false)
    expect(isProxy(wrapped)).toBe(true)

    // get
    expect(wrapped.foo).toBe(1)
  })

  it('warn when call set', async () => {
    // 定义一个函数是否被调用
    console.warn = jest.fn()

    const user = readonly({
      age: 18
    })

    user.age = 19

    expect(console.warn).toBeCalled()
  })
})
