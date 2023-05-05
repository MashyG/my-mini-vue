import { h } from '../../dist/mashy-mini-vue.esm.js'

export const App = {
  name: 'APP',
  setup() {
    return {
      x: 100,
      y: 100
    }
  },
  render() {
    return h('rect', { x: this.x, y: this.y })
  }
}
