import { NodeTypes } from './ast'

interface ParseContext {
  source: string
}

enum TagTypes {
  START,
  END
}

export function baseParse(content: string): any {
  const context = createParseContext(content)
  return createRoot(parseChildren(context))
}

function parseChildren(context: ParseContext) {
  const nodes: any = []

  const s = context.source || ''
  let node
  if (s.startsWith('{{')) {
    // 插值
    node = parseInterpolation(context)
  } else if (s[0] === '<') {
    // element
    if (/[a-z]/.test(s[1])) {
      node = parseElement(context)
    }
  }

  // text 作为默认解析
  if (!node) {
    node = parseText(context)
  }

  nodes.push(node)

  return nodes
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
function parseElement(context: ParseContext) {
  // 1. 解析 Tag
  const element = parseTag(context, TagTypes.START)

  parseTag(context, TagTypes.END)

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
  const content = parseTextData(context, context.source.length)

  console.log('context.source', context.source)

  return { type: NodeTypes.TEXT, content }
}

function parseTextData(context: ParseContext, length: number) {
  const content = context.source.slice(0, length)
  advanceBy(context, content.length)
  return content
}

function advanceBy(context: ParseContext, length: number) {
  context.source = context.source.slice(length)
}

function createRoot(children) {
  return {
    children
  }
}

function createParseContext(content: string): ParseContext {
  return {
    source: content
  }
}
