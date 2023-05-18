import { h, renderSlots } from '../../dist/mashy-mini-vue.esm.js'

export const Slots = {
  name: 'Slots',
  setup() {
    return {}
  },
  render() {
    const title = h('div', {}, `slots - component`)
    console.log('$slots', this.$slots)
    const age = 18
    return h('div', {}, [
      title,
      renderSlots(this.$slots, 'header', { age }),
      renderSlots(this.$slots, 'footer')
    ])
  }
}
