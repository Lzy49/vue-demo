const data = { text: 'hello world' }

const bucket = new WeakMap()
// 收集副作用函数
let activeEffect

const obj = new Proxy(data, {
  get(target, key) {
    if (!activeEffect) return target[key]
    // 将副作用函数收集到桶中
    track(target, key)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    // 把副作用函数从桶里取出，执行
    trigger(target, key)
    return true
  }
})

// 收集依赖
function track (target, key) {
  let depsMap = bucket.get(target)
    if (!depsMap) {
      bucket.set(target, (depsMap = new Map()))
    }
    let deps = depsMap.get(key)
    if (!deps) {
      depsMap.set(key, (deps = new Set()))
    }
    deps.add(activeEffect)
}
// 收集依赖
function trigger (target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return true
  const deps = depsMap.get(key)
  deps && deps.forEach(fn => {      
    typeof fn === 'function' && fn()
  })
}
// 执行依赖
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