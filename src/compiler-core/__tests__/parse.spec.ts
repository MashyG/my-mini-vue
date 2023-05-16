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
        tag: 'div',
        children: []
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

  describe('联合类型', () => {
    it('联合类型 simple', () => {
      const ast = baseParse('<p>mashy~{{message}}</p>')
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'p',
        children: [
          {
            type: NodeTypes.TEXT,
            content: 'mashy~'
          },
          {
            type: NodeTypes.INTERPOLATION,
            content: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: 'message'
            }
          }
        ]
      })
    })

    it('联合类型 - 嵌套多个 Element', () => {
      const ast = baseParse('<p><div>hi~</div>mashy~{{message}}</p>')
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'p',
        children: [
          {
            type: NodeTypes.ELEMENT,
            tag: 'div',
            children: [
              {
                type: NodeTypes.TEXT,
                content: 'hi~'
              }
            ]
          },
          {
            type: NodeTypes.TEXT,
            content: 'mashy~'
          },
          {
            type: NodeTypes.INTERPOLATION,
            content: {
              type: NodeTypes.SIMPLE_EXPRESSION,
              content: 'message'
            }
          }
        ]
      })
    })

    it('联合类型 - 缺少结束标签', () => {
      expect(() => {
        baseParse('<p><div></p>')
      }).toThrow('缺少结束标签：div')
    })

    it('联合类型 - 缺少开始标签', () => {
      const ast = baseParse('some text</div>')
      const text = ast.children[0]

      expect(text).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'some text'
      })
    })
  })
})
