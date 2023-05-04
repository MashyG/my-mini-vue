import { h } from '../../dist/mashy-mini-vue.esm.js'

export const Emit = {
  name: 'Emit',
  setup(props, { emit }) {
    const onEmit = () => {
      console.log('emitBtn')
      emit('add')
      emit('add-emit', 1, 2)
    }
    return {
      onEmit
    }
  },
  render() {
    const emitBtn = h(
      'button',
      {
        onClick: this.onEmit
      },
      'emitBtn'
    )
    const title = h('div', {}, `emit - component`)
    return h('div', {}, [title, emitBtn])
  }
}
