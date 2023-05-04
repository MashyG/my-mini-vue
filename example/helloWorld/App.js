import { h } from '../../dist/mashy-mini-vue.esm.js'
import { Emit } from './Emit.js'
import { Foo } from './Foo.js'
import { Slots } from './Slots.js'

export const App = {
  name: 'APP',
  render() {
    // TODO 改变 this 中的值触发响应式更新
    // const changeCount = () => {
    //   console.log('App - emit before changeCount')
    //   this.count++
    // }
    // 用于测试通过 this 获取 $el
    window.self = this
    // ui
    // slot 逐步演变
    // const slotComps = [h('span', {}, 'slot -'), h('span', {}, 'test')]
    // const slotComps = h('span', {}, 'slot - test')
    // 具名插槽
    // const slotComps = {
    //   header: [h('span', {}, 'slot - header')],
    //   footer: h('span', {}, 'slot - footer')
    // }
    // 作用域插槽
    const slotComps = {
      header: ({ age }) => h('span', {}, 'slot - header - ' + age),
      footer: () => h('span', {}, 'slot - footer')
    }
    return h(
      'div',
      {
        id: 'hello',
        class: 'hello-class',
        onClick() {
          console.log('onClick')
        },
        onMousedown() {
          console.log('onmousedown')
        },
        onMouseup() {
          console.log('onmouseup')
        }
      },
      // string
      // `hi~ mashy-mini-vue`

      // setupStatefulComponent 通过 proxy 处理 this，调用 render 函数时绑定
      // this.$el -> get root element 返回根节点
      // `hi~ ${this.msg}`,

      // Array
      [
        h('p', { style: 'color: red;' }, `hi~ ${this.msg}`),
        h('p', { style: 'color: blue;' }, 'mashy-mini-vue'),
        h(Foo, { count: this.count }),
        h(Emit, {
          onAdd(...args) {
            console.log('App - emit function onAdd', args)
          },
          onAddEmit(...args) {
            console.log('App - emit function onAddEmit', args)
            // changeCount()
          }
        }),
        h(Slots, {}, slotComps)
      ]
    )
  },
  setup() {
    return {
      count: 1,
      msg: 'mashy-mini-vue！！！'
    }
  }
}
