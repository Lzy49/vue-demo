# 为什么使用 Reflect 而不直接更改 target 
- 原因 : Reflect 的第三个参数 receiver 可以设置当前执行环境的 this 值. 而直接调用 target 不能.
- 应用 : 
  1. 当被代理的对象中的方法中用到了 this ,则这个 this 的指向是 对象本身 .
  2. 对象被代理后,我们期望 对象中的方法 的 this 指向的是 代理对象,而非对象本身. 否则无法触发依赖
  3. 此时 receiver 就派上了用途. 
# JavaScript 对象分类
- 常规对象 : 符合 对象内部方法定义的对象就是 常规对象 例如 obj , function 
- 异质对象 : 不符合 对象内部方法定义的对象 例如 Proxy
## 扩展
1. 对象有一些内部方法 例如 : get , set , call . 
2. 区分函数还是对象的方法是判断有没有 call , 普通对象无 call
3. 不同的对象部署的同名方法可能是不同的操作例如 proxy 的 get 和 普通对象 get 是两个方法
# 如何代理 对象
- get : 代理 xxx.xxx xxx[xxx] ;
- set : 代理 xx.xx = xx ;
- has : 代理 in 关键字 
- ownKeys : for in -> iteration -> ownKeys 获取对象自身的属性 -> 拦截 ownKeys 
- deleteProperty : 监听 delete 函数
# 如何 拦截 for in
## step 1
1. 在 for in 的时候 触发了 ownKeys , 而在此时证明要对使用该对象的key->value . 
2. 所以在 ownKeys 促发的时候 track(target , 全部key) 
3. 在被监听对象的某个 key 的值发生变化的时候我们 trigger (target , key) . 
4. 此时我们拿到了 target 在执行依赖的时候我们需要把  track(target,全部key) 记录的内容一并运行. 
## step2 
1. 在循环的过程中,我们会从中获取 值 例如 xxx[k] 这个操作会将 effect 存到 该值的 deps 中. 
2. 当值发生修改的时候 该effect 会执行. 
3. 在 step 1 中 执行 ownKeys + get 两种 effect , 导致 effect 其实是浪费的. 且 如果 在 for 中没有取过值, 则这个循环对于这个值是无意义的.
4. 所以 只有在添加值的时候才需要执行 ownKeys 的监听. 故在 set 的时候需要判定 !Object.prototype.hasOwnProperty(key) 的时候才 track(target,全部key) 
# 如果 拦截 delete
1. 使用 deleteProperty 连接 delete
2. 检查 key 是不是自身的属性 hasOwnProperty 
3. Reflect.deleteProperty 删除 该key
4. 如果 变量是自身变量,且删除成功 执行删除 trigger 
   1. 通知依赖该 target.key 的 effect
   2. 因为 target 少了key 所以要通知 target 所有key 的循环 
# 合理触发响应
## 相同值
- 当值没有发生变化的时候不执行响应, 则需要在 set 的时候进行值比较 当不同的时候, 才进行更新.
- `oldVal !== newVal && (oldVal === oldVal || newVal ===
newVal)`
## prototype 原型为代理对象
### 产生原因
- 当 通过代理对象获取其原型(Proxy(parent)) 上的值的时候会有如下操作:
  - 通过当前对象获取 -> 触发当前对象 get -> 没有继续向上查找 -> 触发parent get -> 找到.
  - 过程中一共执行了两次 get , 导致依赖被收集两次 . 
  - 在通过该对象更改其parent.xx的时候,会导致 set 执行两次 , 而他们会分别触发其 收集依赖 , 则会触发两次 get 收集.
### 解决
- 解决的重点在于 在 通过 target 改变其 parent 中的属性时候, 拦截 parent 的 trigger 
- 在现有条件中 通过 proxy 传入的 receiver 是恒定不变的,是通过 初始化 Proxy  产生的对象.
- 所以我们可以通过 receiver 来判定 target 是否是 receiver 的目标对象即可.
- 即在创建时,设置__raw__为该对象的目标.
- 在set函数中判断 receiver.__raw__ === target 才进行 trigger .
