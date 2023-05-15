import { NodeTypes } from '../src/ast'
import { baseParse } from '../src/parse'

describe('parse', () => {
  describe('interpolation 插值解析', () => {
    it('simple interpolation', () => {
      const ast = baseParse('{{ message} }')

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'message'
        }
      })
    })
  })

  describe('element 解析', () => {
    it('simple element div', () => {
      const ast = baseParse('<div></div>')

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div'
      })
    })
  })

  describe('text 解析', () => {
    it('simple text', () => {
      const ast = baseParse('mashy')

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'mashy'
      })
    })
  })
})
