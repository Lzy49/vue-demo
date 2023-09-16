let executionFn: Function | undefined;
let barrel: any = new WeakMap()
export function reactive(obj: { [key: string | symbol]: any }) {
  console.log(obj);
  return new Proxy(obj, {
    get(target, p) {
      console.log('get');
      // 执行时 executionFn
      if (!barrel.get(target)) {
        barrel.set(target, new Map())
      }
      const map = barrel.get(target);
      if (!map.get(p)) {
        map.set(p, new Set())
      }
      if (executionFn) {
        map.get(p).add(executionFn)
      }
      return target[p]
    },
    set(target, p, newValue) {
      console.log('set');
      if (target[p] !== newValue) {
        target[p] = newValue
        if (barrel.get(target) && barrel.get(target).get(p)) {
          barrel.get(target).get(p).forEach((fn: any) => fn())
        }
      }
      return target[p]
    },
  })
}
export function effect(fn: Function) {
  executionFn = fn
  fn()
  executionFn = undefined;
  return 1
}
// const obj = reactive({ num: 0 })
// let num = 0;
// effect(() => {
//   // obj.num
//   num++
// })
// obj['num'] = 2;
// obj.num = 3;
// console.log(num)