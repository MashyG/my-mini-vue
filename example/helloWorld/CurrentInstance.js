import { getCurrentInstance, h } from '../../dist/mashy-mini-vue.esm.js'

export const CurrentInstance = {
  name: 'CurrentInstance',
  setup() {
    const instance = getCurrentInstance()
    console.log('当前组件实例对象 - CurrentInstance', instance)
  },
  render() {
    return h('div', {}, [h('div', {}, 'CurrentInstance - component')])
  }
}
