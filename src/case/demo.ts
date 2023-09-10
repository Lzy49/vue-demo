const data = { text: 'hello world' }

const bucket = new WeakMap()
// 收集副作用函数
let activeEffect

const obj = new Proxy(data, {
  get(target, key) {
    // console.log('🚀 ~ get', key)
    if (!activeEffect) return target[key]
    
    let depsMap = bucket.get(target)
    if (!depsMap) {
      bucket.set(target, (depsMap = new Map()))
    }
    let deps = depsMap.get(key)
    if (!deps) {
      depsMap.set(key, (deps = new Set()))
    }
    deps.add(activeEffect)
    return target[key]
  },
  set(target, key, newVal) {
    // console.log('🚀 ~ set ~')
    target[key] = newVal
    const depsMap = bucket.get(target)
    if (!depsMap) return true
    const deps = depsMap.get(key)
    deps && deps.forEach(fn => {      
      typeof fn === 'function' && fn()
    })
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

// setTimeout(() => {
//   obj.text = 'hello vue3333'
// }, 500)
// setTimeout(() => {
//   obj.text1 = 'hello vue33332223'
// }, 1000)