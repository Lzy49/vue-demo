const data = { foo: 1, bar: 2 }

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
    const res = fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    return res
  }
  effectFn.options = options
  effectFn.deps = []
  if (!options.lazy) {
    effectFn()
  }
  // lazy的时候加的
  return effectFn
}

function computed (getter) {
  const effectFn = effect(getter, {lazy: true, scheduler () {
    if(!dirty) {
      dirty = true
      trigger(obj, 'value')
    } 
  }})
  let dirty = true
  let value
  const obj = {
    get value () {
      if (dirty) {
        value = effectFn()
        dirty = false
      }
      track(obj, 'value')
      return value
    }
  }
  return obj
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

function watch (source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }
  
  let oldValue, newValue
  const job =  () => {
    newValue = effectFn()
    cb(newValue, oldValue)
    oldValue = newValue
  }
  const effectFn = effect(
    () => getter(),
    {
      lazy: true, // 手动调用拿oldValue
      scheduler: job
    }
  )
  
  if (options.immediate) {
    job()
  } else {
    oldValue = effectFn()
  }
  
  
}

function traverse (value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  seen.add(value)
  for (const k in value) {
    traverse(value[k], seen)
  }
  return value
}

let a
const b = computed(() => obj.foo + obj.bar)
const anFn = effect(() => {
  console.log('🚀 ~ fn run ~')
  console.log(b.value)
}, 
{
  // lazy: true,
  scheduler (fn) {
    console.log('🚀 ~ this is a scheduler')
    jobQueue.add(fn)
    flushJob()
  }
})

// 手动执行副作用函数（lazy time
// anFn()


obj.foo++

// ====
