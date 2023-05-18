import { ref } from '../../dist/mashy-mini-vue.esm.js'

export const App = {
  name: 'APP',
  template: '<div>hi~ count ===>>> {{ count }}</div>',
  setup() {
    const count = (window.count = ref(1))
    return {
      count
    }
  }
}
