import { add } from '../index'

// 测试单测运行是否正常
it('init', () => {
  expect(true).toBe(true)

  expect(add(1, 2)).toBe(3)
})
