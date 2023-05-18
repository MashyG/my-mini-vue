import { NodeTypes } from './ast'

interface ParseContext {
  source: string
}
export interface TagElementType {
  type: NodeTypes
  tag: string
  children: Array<TagElementType>
}

enum TagTypes {
  START,
  END
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString)
}

export function baseParse(content: string): any {
  const context = createParseContext(content)
  return createRoot(parseChildren(context, []))
}

// 根据有限状态机的原理，实现 Parse 流程
function parseChildren(context: ParseContext, ancestor: TagElementType[]) {
  const nodes: any = []

  while (!isEnd(context, ancestor)) {
    let node
    const s = context.source || ''
    if (startsWith(s, '{{')) {
      // 插值
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      // element
      if (s[1] === '/') {
        // 这里属于 edge case 可以不用关心
        // 处理结束标签
        if (/[a-z]/i.test(s[2])) {
          // 匹配 </div>
          // 需要改变 context.source 的值 -> 也就是需要移动光标
          parseTag(context, TagTypes.END)
          // 结束标签就以为这都已经处理完了，所以就可以跳出本次循环了
          continue
        }
      } else if (/[a-z]/.test(s[1])) {
        node = parseElement(context, ancestor)
      }
    }

    // text 作为默认解析
    if (!node) {
      node = parseText(context)
    }

    nodes.push(node)
  }

  return nodes
}

// 判断是否结束
function isEnd(context: ParseContext, ancestor: TagElementType[]) {
  const s = context.source
  // console.log('isEnd --- source', s)
  // console.log('isEnd --- ancestor', ancestor)
  // 遇到结束标签时，例如：</div>
  if (startsWith(s, '</')) {
    for (let i = ancestor.length - 1; i >= 0; --i) {
      if (startsWithEndTagOpen(s, ancestor[i].tag)) {
        return true
      }
    }
  }
  // source 没有值时
  return !s
}

// 解析插值表达式
function parseInterpolation(context: ParseContext) {
  // {{message}} -> message

  const openDelimiter = '{{'
  const openDelimiterLength = openDelimiter.length
  const closeDelimiter = '}}'
  const closeDelimiterLength = closeDelimiter.length
  const closeIndex = context.source.indexOf(closeDelimiter, openDelimiterLength)
  // console.log('closeIndex', closeIndex)

  advanceBy(context, openDelimiterLength)
  // console.log('context.source', context.source)

  const rawContentLength = closeIndex - openDelimiterLength
  const rawContent = parseTextData(context, rawContentLength)
  const content = rawContent.trim()
  // console.log('content', content)

  advanceBy(context, closeDelimiterLength)
  // console.log('context.source', context.source)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content
    }
  }
}

// 解析 Element
function parseElement(context: ParseContext, ancestor: TagElementType[]) {
  // 1. 解析 Tag
  const element: TagElementType =
    parseTag(context, TagTypes.START) || ({} as any)
  // 收集已解析到的 element 标签
  ancestor.push(element)

  element.children = parseChildren(context, ancestor)
  // 移除对应的 element 标签
  ancestor.pop()

  console.log('element ---- ', element)
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagTypes.END)
  } else {
    throw new Error(`缺少结束标签：${element.tag}`)
  }

  return element
}
function parseTag(context: ParseContext, type: TagTypes) {
  // 1. 解析 Tag
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
  console.log('match', match)
  const tag = match[1]
  console.log('tag', tag)
  // 2. 删除处理完的代码
  advanceBy(context, match[0].length)
  advanceBy(context, 1)
  console.log('context', context)

  if (type === TagTypes.END) {
    return
  }
  return {
    type: NodeTypes.ELEMENT,
    tag
  }
}

// 默认解析 Text
function parseText(context: ParseContext) {
  let endIndex = context.source.length
  const endTokens = ['<', '{{']

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i])
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const content = parseTextData(context, endIndex)

  console.log('parseText --- context.source', context.source)

  return { type: NodeTypes.TEXT, content }
}

function parseTextData(context: ParseContext, length: number) {
  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  return rawText
}

function startsWithEndTagOpen(source: string, tag: string) {
  return (
    startsWith(source, '</') &&
    source.slice(2, 2 + tag.length).toLocaleLowerCase() ===
      tag.toLocaleLowerCase()
  )
}

function advanceBy(context: ParseContext, length: number) {
  context.source = context.source.slice(length)
}

function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children
  }
}

function createParseContext(content: string): ParseContext {
  return {
    source: content
  }
}
