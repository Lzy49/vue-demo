const data = { text: 'hello world' }

const bucket = new Set()
// 收集副作用函数
let activeEffect

const obj = new Proxy(data, {
  get(target, key) {
    // console.log('🚀 ~ get', key)
    if (activeEffect) {
      bucket.add(activeEffect)
    }
    return target[key]
  },
  set(target, key, newVal) {
    // console.log('🚀 ~ set ~')
    target[key] = newVal
    bucket.forEach(fn => {      
      typeof fn === 'function' && fn()
    })
    // return true 代表设置操作成功
    return true
  }
})


function effect(fn) {
  activeEffect = fn
  // 触发读取操作
  fn()
}

let a

effect(() => {
  console.log('🚀 ~ fn run ~')
  a = obj.text
})


// ====

setTimeout(() => {
  obj.text = 'hello vue3333'
}, 500)
setTimeout(() => {
  obj.text1 = 'hello vue33332223'
}, 1000)