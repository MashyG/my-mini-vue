import { NodeTypes } from './ast'

export function isText(node: any) {
  const { type } = node || {}
  return type === NodeTypes.TEXT || type === NodeTypes.INTERPOLATION
}
