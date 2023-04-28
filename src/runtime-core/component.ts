import { publicInstanceProxyHandlers } from './componentPublicInstance'

export function createComponentInstance(vnode) {
  const instance = {
    vnode,
    type: vnode?.type ?? '',
    setupState: {}
  }
  return instance
}

export function setupComponent(instance) {
  // TODO initProps， initSlots

  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  console.log('setupStatefulComponent ----- instance  >>>>', instance)

  // 初始化 ctx
  instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers)

  const { type: component } = instance || {}
  const { setup } = component || {}
  if (setup) {
    // setupResult => function or object
    const setupResult = setup()
    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance, setupResult) {
  console.log('handleSetupResult ----- instance  >>>>', instance)
  // TODO function 处理
  if (typeof setupResult === 'object') {
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  const { type: component } = instance || {}
  const { render } = component || {}
  if (render) {
    instance.render = render
  }
}
