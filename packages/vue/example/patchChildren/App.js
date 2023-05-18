import { h, ref } from '../../dist/mashy-mini-vue.esm.js'

import Array2Text from './Array2Text.js'
import Text2Text from './Text2Text.js'
import Text2Array from './Text2Array.js'
import Array2Array from './Array2Array.js'

export const App = {
  name: 'APP',
  render() {
    return h(
      'div',
      {
        id: 'patchChildren - element'
      },
      [
        h('p', { style: 'color: blue;' }, 'patchChildren'),
        h('div', {}, [
          h('p', {}, 'console 中改变 isChange 的值 ==> isChange.value = true'),
          // 由老节点 Array 到 新节点 Text
          // h(Array2Text)
          // 由老节点 Text 到 新节点 Text
          // h(Text2Text),
          // 由老节点 Text 到 新节点 Array
          // h(Text2Array),
          // 由老节点 Array 到 新节点 Array
          h(Array2Array)
        ])
      ]
    )
  },
  setup() {
    const count = ref(1)
    const onAdd = () => {
      count.value++
    }

    const props = ref({
      foo: 'foo',
      bar: 'bar'
    })
    const changeProps1 = () => {
      console.log('changeProps1---------------')
      props.value.foo = 'new-foo-1'
    }
    const changeProps2 = () => {
      console.log('changeProps2---------------')
      props.value.foo = undefined
    }
    const changeProps3 = () => {
      console.log('changeProps3---------------')
      props.value = {
        foo: 'new-foo-3'
      }
    }

    return {
      count,
      props,
      onAdd,
      changeProps1,
      changeProps2,
      changeProps3
    }
  }
}
