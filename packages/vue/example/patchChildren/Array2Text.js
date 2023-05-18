import { h, ref } from '../../dist/mashy-mini-vue.esm.js'

// 旧节点
const prevChildren = [h('div', {}, '9️⃣9️⃣9️⃣9️⃣ prev ----- Array  Children')]
// 新节点
const nextChildren = '🎆🎆🎆🎆 next ----  Text Children'

export default {
  name: 'Array2Text',
  setup() {
    const isChange = ref(false)
    window.isChange = isChange

    return {
      isChange
    }
  },
  render() {
    const self = this

    return self.isChange
      ? h('div', {}, nextChildren)
      : h('div', {}, prevChildren)
  }
}
