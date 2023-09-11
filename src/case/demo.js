const data = { foo: 1 }

const bucket = new WeakMap()
// 收集副作用函数
let activeEffect
// 副作用函数栈
let effectStack = []

// 任务队列
const jobQueue = new Set()
// 用于将任务添加到微任务
const p = Promise.resolve()
// 是否在刷新
let isFlushing = false
function flushJob() {
  if (isFlushing) return
  isFlushing = true
  console.log(jobQueue,'jobQueue');
  
  p.then(() => {
    jobQueue.forEach(job => job())
  }).finally(() => {
    isFlushing = false
  })
}

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
// 执行依赖
function trigger (target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return true
  const effects = depsMap.get(key)
  // 新建一个set结构，避免无限循环
  const effectsToRun = new Set()
  // 如果trigger 触发的副作用函数与当前正在执行的副作用函数是同一个时，不触发执行
  effects && effects.forEach(fn => {      
    if (fn !== activeEffect) {
      effectsToRun.add(fn)
    }
  })
  effectsToRun && effectsToRun.forEach(fn => {      
    // if has scheduler, scheduler()
    if (fn.options.scheduler) {
      fn.options.scheduler(fn)
    } else {
      typeof fn === 'function' && fn()
    }
  })
}
// 
function effect(fn, options = {}) {
  // ???
  const effectFn = () => {
    // 清除当前依赖关系
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    // 触发读取操作
    fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }
  effectFn.options = options
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
  console.log('🚀 ~ fn run ~', obj.foo)
}, 
{
  scheduler (fn) {
    console.log('🚀 ~ this is a scheduler')
    jobQueue.add(fn)
    flushJob()
  }
})


// ====
obj.foo++
obj.foo++
obj.foo++
obj.foo++
obj.foo++