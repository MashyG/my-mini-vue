import { proxyRefs } from '../reactivity'
import { shallowReadonly } from '../reactivity/reactive'
import { emit } from './componentEmit'
import { initProps } from './componentProps'
import { publicInstanceProxyHandlers } from './componentPublicInstance'
import { initSlots } from './componentSlots'

export function createComponentInstance(vnode, parent) {
  const instance = {
    vnode,
    type: vnode?.type ?? '',
    setupState: {},
    props: {},
    slots: {},
    next: null, // 需要更新的 vnode，用于更新 component 类型的组件
    update: null,
    provides: parent ? parent.provides : {},
    parent,
    isMounted: false,
    subTree: {},
    emit: () => {}
  }

  instance.emit = emit.bind(null, instance) as any

  return instance
}

export function setupComponent(instance) {
  const { vnode } = instance || {}
  const { props, children } = vnode || {}
  initProps(instance, props)

  initSlots(instance, children)

  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  console.log('setupStatefulComponent ----- instance  >>>>', instance)

  // 初始化 ctx
  instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers)

  const { type: component, props, emit } = instance || {}
  const { setup } = component || {}
  if (setup) {
    setCurrentInstance(instance)
    // setupResult => function or object
    const setupResult = setup(shallowReadonly(props), {
      emit
    })
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance, setupResult) {
  console.log('handleSetupResult ----- instance  >>>>', instance)
  // TODO function 处理
  if (typeof setupResult === 'object') {
    instance.setupState = proxyRefs(setupResult)
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

let currentInstance = null
const setCurrentInstance = (instance) => {
  currentInstance = instance
}

export const getCurrentInstance = () => {
  return currentInstance
}
