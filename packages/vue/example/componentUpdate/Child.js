import { h } from '../../dist/mashy-mini-vue.esm.js'

export default {
  name: 'Child',
  render() {
    return h('div', {}, [
      h('div', {}, `child - props - msg ==> ${this.$props.msg}`)
    ])
  },
  setup() {}
}
