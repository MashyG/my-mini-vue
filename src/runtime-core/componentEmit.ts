import { camelize, toHandlerKey } from '../shared/index'

export function emit(instance, event, ...args) {
  const { props } = instance || {}

  // 处理 event 事件名称（驼峰名称，事件首字母大写）
  // 然后从 props 中获取相应的 emit 方法进行调用
  const handlerName = toHandlerKey(camelize(event))
  const func = props?.[handlerName]
  func && func(...args)
}
