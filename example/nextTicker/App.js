import {
  getCurrentInstance,
  h,
  nextTick,
  ref
} from '../../dist/mashy-mini-vue.esm.js'

export const App = {
  name: 'APP',
  render() {
    return h('div', {}, [
      h('p', { style: 'color: blue;' }, '按钮效果看 Elements'),
      h('button', { onClick: this.onClick }, 'update count'),
      h('p', {}, `count ===>>>> ${this.count}`)
    ])
  },
  setup() {
    const count = ref(1)

    const instance = getCurrentInstance()

    const onClick = () => {
      for (let i = 0; i < 100; i++) {
        console.log('update count')
        count.value = i
      }
      // 当前元素获取不到视图上数据的变更，因为当前是使用 Promise 进入了微任务，输入异步操作
      console.log('onClick ==== ', instance)
      // 因此需要 nextTick， 或者 通过 await nextTick()
      nextTick(() => {
        console.log('onClick ==== after nextTick', instance)
      })
    }

    return {
      count,

      onClick
    }
  }
}
