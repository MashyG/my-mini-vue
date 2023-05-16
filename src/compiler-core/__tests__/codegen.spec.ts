import { generate } from '../src/codegen'
import { baseParse } from '../src/parse'
import { transform } from '../src/transform'
import { transformExpression } from '../src/transforms/transformExpression'

describe('codegen 实现 render', () => {
  // 利用 jest 的快照测试 -> toMatchSnapshot
  it('string 纯字符串', () => {
    const ast = baseParse('mashy')
    transform(ast)
    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })

  it('interpolation 插值类型', () => {
    const ast = baseParse('{{mashy}}')
    transform(ast, {
      nodeTransforms: [transformExpression]
    })
    const { code } = generate(ast)

    expect(code).toMatchSnapshot()
  })
})
