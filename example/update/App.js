import { h, ref } from '../../dist/mashy-mini-vue.esm.js'

export const App = {
  name: 'APP',
  render() {
    console.log('this ======== ', this)
    return h(
      'div',
      {
        id: 'update - element',
        ...this.props
      },
      [
        h('p', { style: 'color: blue;' }, `count: ${this.count}`),
        h('button', { onClick: this.onAdd }, 'add'),
        h(
          'button',
          { onClick: this.changeProps1 },
          'changeProps - 值改变了 - 修改逻辑'
        ),
        h(
          'button',
          { onClick: this.changeProps2 },
          'changeProps - 值改变了 undefined - 删除逻辑'
        ),
        h(
          'button',
          { onClick: this.changeProps3 },
          'changeProps - key 在新的里面没有了 - 删除逻辑'
        )
      ]
    )
  },
  setup() {
    const count = ref(0)
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
