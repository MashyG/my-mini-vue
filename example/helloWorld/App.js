import { h } from '../../dist/mashy-mini-vue.esm.js'

export const App = {
  render() {
    // 用于测试通过 this 获取 $el
    window.self = this
    // ui
    return h(
      'div',
      {
        id: 'hello',
        class: 'hello-class'
      },
      // string
      // `hi~ mashy-mini-vue`
      // setupStatefulComponent 通过 proxy 处理 this，调用 render 函数时绑定
      // this.$el -> get root element 返回根节点
      `hi~ ${this.msg}`
      // Array
      // [
      //   h('p', { style: 'color: red;' }, 'hi~'),
      //   h('p', { style: 'color: blue;' }, 'mashy-mini-vue')
      // ]
    )
  },
  setup() {
    return {
      msg: 'mashy-mini-vue！！！'
    }
  }
}
