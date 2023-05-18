import { provide, inject, h } from '../../dist/mashy-mini-vue.esm.js'

export const Provider = {
  name: 'Provider',
  setup() {
    provide('foo', 'fooVal')
    provide('bar', 'barVal')
  },
  render() {
    return h('div', {}, [h('p', {}, 'Provider'), h(ProviderTwo)])
  }
}

const ProviderTwo = {
  name: 'ProviderTwo',
  setup() {
    provide('foo', 'fooTwoVal')
    const foo = inject('foo')

    return {
      foo
    }
  },
  render() {
    return h('div', {}, [
      h('p', {}, `ProviderTwo foo: ${this.foo}`),
      h(Customer)
    ])
  }
}

const Customer = {
  name: 'Customer',
  setup() {
    const foo = inject('foo')
    const bar = inject('bar')
    const baz = inject('baz', 'default - baz')

    return {
      foo,
      bar,
      baz
    }
  },
  render() {
    return h(
      'div',
      {},
      `Customer: --- ${this.foo} -- ${this.bar} --- ${this.baz}`
    )
  }
}
