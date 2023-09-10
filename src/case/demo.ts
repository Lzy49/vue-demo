const data = { ok: true, text: 'hello world' }

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
    // 收集当前effectFn的依赖关系
    activeEffect.deps.push(deps)
}
// 收集依赖
function trigger (target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return true
  const effects = depsMap.get(key)
  // 新建一个set结构，避免无限循环
  const effectsToRun = new Set(effects)
  effectsToRun && effectsToRun.forEach(fn => {      
    typeof fn === 'function' && fn()
  })
}
// 执行依赖
function effect(fn) {
  // ???
  const effectFn = () => {
    // 清除当前依赖关系
    cleanup(effectFn)
    activeEffect = effectFn
    // 触发读取操作
    fn()
  }
 
  effectFn.deps = []
  effectFn()

}

// 清除依赖函数的依赖关系
function cleanup (effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  // 最后要重置deps数组 ???
  effectFn.deps.length = 0
}

let a

effect(() => {
  console.log('🚀 ~ fn run ~')
  a = obj.ok ? obj.text : 'ooo'
})


// ====
obj.ok = false
obj.text = 'hello vue3333'