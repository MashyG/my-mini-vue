import { h } from '../../dist/mashy-mini-vue.esm.js'

export const Foo = {
  name: 'FOO',
  setup(props) {
    // 1. 接受一个 props
    console.log('props', props)
    // 3. props 不可修改
    props.count++
  },
  render() {
    // 2. props 可以通过 this 获取
    return h('div', {}, [
      h('div', {}, 'foo - component'),
      h('div', {}, `props - count: ${this.count}`)
    ])
  }
}
