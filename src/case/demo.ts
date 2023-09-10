const data = {text: 'hello world'}

const bucket = new Set()

const obj = new Proxy(data, {
  get (target, key) {
    bucket.add(effect)
    return target[key]
  },
  set (target, key, newVal) {
    console.log('set~~~~');
    
    target[key] = newVal
    bucket.forEach(fn => fn())
    // return true 代表设置操作成功
    return true
  }
})

let a
function effect () {
  a = obj.text
}
// 触发读取
effect()

setTimeout(() => {
  obj.text = 'hello vue3333'
}, 500)
setTimeout(() => {
  obj.text = 'hello vue33332223'
}, 1000)