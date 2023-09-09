import { describe, test, expect } from 'vitest'
import { effect, reactive } from '../src/reactivity/index'
describe('reactivity core', () => {
  test('reactive + effect', () => {
    const obj = reactive({ num: 0 })
    console.log(`%c------------[]-------------`,'color:orange')
    console.log(obj)
    console.log(`%c------------[]-------------`,'color:orange')
    let num = 0;
    // effect(() => {
    //   // obj.num
    //   num++
    // })
    obj['num'] = 2;
    obj.num = 3;
    expect(num).toBe(2)
  })
  test.todo('effect 重复执行 cleanup')
  test.todo('嵌套 reactive + effect')
  test.todo('effect 无限循环')
  test.todo('effect scheduler 调度器') // trigger
})

describe.todo(' computed', () => {
  test(' computed lazy 执行', () => {

  })
  test(' computed 响应性', () => {

  })
  test('computed dirty')
})

describe.todo(' watch', () => {
  test.todo('watch 字符串', () => {

  })
  test.todo('watch 对象', () => {

  })
  test.todo('watch 返回值', () => { })
  test.todo('watch immediate', () => {
  })
  test.todo('watch deep', () => {
  })
  test.todo('watch flush')
  test.todo('watch onInvalidate')
})