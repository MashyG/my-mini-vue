import { getCurrentInstance } from '../component'

// 存值
export const provide = (key, value) => {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    let { provides, parent } = currentInstance || {}
    let { provides: parentProviders } = parent || {}

    if (provides === parentProviders) {
      // 通过原型链的方式获取值：当前没有相应 key 值时往上（prototype）找
      provides = currentInstance.provides = Object.create(parentProviders)
    }
    provides[key] = value
  }
}

// 取值
export const inject = (key, defaultValue?) => {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    const { parent } = currentInstance || {}
    let { provides: parentProviders } = parent || {}

    if (key in parentProviders) {
      return parentProviders[key]
    } else if (defaultValue) {
      if (typeof defaultValue === 'function') {
        return defaultValue()
      }
      return defaultValue
    }
  }
}
