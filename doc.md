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
# 浅响应和深响应
## 深响应
- Proxy 和 拷贝变量相同, 只会对第一层起作用, 当代理对象中的值是对象时,对象的值发生修改,并不能触发 Proxy 代理对象收集的依赖.因为 target 中的对象并不是响应值.
- 解决问题的关键在于 给内部对象增加响应性 . 即在 get 返回的时候 返回一个响应值对象.这样,每次调用该对象的值时,就可以收集他自身的依赖
- 即 在 get 中 判断返回值 是 object , 则返回 reactive(object) 即可. 否则返回 target[key]
## 浅响应
- 浅响应即我们开始实现的方案. value 为 obj 的值增加响应性.
- 增加阀门 , 判断 isShallow 返回基本值即可.
# 只读和浅只读
- 只读变量的实现关键在于拦截:
  - set: 拦截变量修改 , 修改只读属性, 不可修改直接返回 true
  - get: 因为只读属性不可能被修改所以 在 get 的时候不需要将依赖收集到 deps 中
  - deleteProperty : 拦截删除,不允许删除只读对象的 任何 property. 
- 当 readonly 包裹的是 响应对象, 并不影响使用. 逻辑是:
  -  读取只读值 -> 只读值读取 target 的值 -> 读取 target 值 被 target 的 get 拦截 -> target 收集 依赖 .
  -  修改只读值依赖值 -> 依赖值执行自己的 deps 中的依赖 -> 执行到 readonly 所包裹的值.
- 浅只读值
  - 因为值读值自己不存在响应性的问题 , 所以 通过 禁止 深响应即可实现深只读 -> 深响应本质是 -> 深代理
# 代理数组
- 对象并不是一个 常规对象. 是一个 异质对象 , 所以 Proxy 并不能将所有点都代理,需要我们自行完善
## length 和 index
### index 影响 length
- `数组长度是 5, 添加下标为 7的值`: 导致问题,set 可以触发,但是数组长度变化没有被响应.
- 拦截 set 在 set 时判断 key >= length 时 set 否则 add
- 在 trigger 时, 在 add 的情况下 在处理本身以外后 需要将 length 对应的 effect 也运行一次. 
### length 影响 index

- 现象: 设置 数组 length < 原始数组  length -> 部分值被删除 -> 影响到该部分 index
- 解决: 
  - 在 trigger 中判断 修改 key === length 且 length < old length .
  - 从 deps 中拿取 > newLength 的 key 值, 
  - 进行通知
## 遍历数组

- 在处理遍历时, for in 可以和 对象一样监听对象本身 ,而 其他迭代器方法,都使用了迭代器.
- 这些遍历方法只需要在数组长度发生变化监听即可.
- 所以,只需要在调用到数组本身时,收集一条 length 的依赖即可.
- 数组值的多少发生变化 -> length 发生变化 -> 遍历执行.

## 一切对象 的 Symbol 值处理
1. 对象有很多方法都使用 Symbol 值处理, 而这些内容是不需要增加响应性的.
2. 所以在 get 的时候 判断 Symbol 值不增加响应性.
## 数组的查找方法
- 在 `indexOf`,`lastIndexOf`,`includes` 这3个函数的实现中 , 会返回 this 的值 即代理对象本身. 这会造成 当使用一个数组中的对象使用 includes 在数组代理对象中查找时 , 没有找到值
- 针对这个问题,需要重写 以上 3种方法.方案:
  - 在 自身上找一次没找到
  - 在 自身的 __RAW__ 上找,
  - 没找到 -> false
  - 找到了 -> index
## 隐式修改数组长度的原型方法
### 起因
- `push/pop/shift/unshift/splice` 中会间接调用 length 属性,导致 length 收集了使用 push 的副作用.
- 每次 length 更改 就会执行 push 对应的副作用.
- 其实 push 是给数组增加值,没有被收集的道理.
### 解决
- 在使用 push 时禁止 track 收集该 effect 即可.
- 则修改 push 内部实现, 设置 shouldTrack = false 表示 禁止追踪
- 在 track 时 判断 shouldTrack == false 时 禁止 收集.
# 代理 Set 和 Map
- Set 和 Map 和 常规对象非常不同. 所以需要设置新的判定
## size 值
- size 获取值失败问题
  - size 值是一个 get () , 在 Proxy 上咩有,所有只能通过 target 获取.
  - if(key === 'size') return Reflect.get(target,key,target)
- size 获取值 依赖追踪问题
  - size 的改变和 对象 key 数量相同 
  - key === 'size' && track(target , ITERATE_KEY)
## delete 函数
- 因为 delete 函数中有 this 值,所以 在使用这些方法时需要 将 this 指向,指会 target 
- get -> target[key].bind(target)
`
## add 函数
- 判断值是否存在 -> 不存在
- 调用 target.add
- 调用后 trigger(target,key,'ADD')
## set 函数
- 从 target.raw 中拿到原始值
- 调用 raw.has 判断值是否存在
- 不存在 ->设置新值 -> 执行 add trigger
- 存在 -> 修改值 -> 执行 set trigger
> 1. 在设值的时候, 需要判断值是否是一个响应对象,如果是的则将其 __RAW__存起来, 因为调用 的 set 是 target 本身的 set 直接存代理对象会污染 target 
> 2. 因为 Set 既关系 key 也关心 value , 所以 在 key 变化有要  trigger(target,ITERATE_KEY)
## get 函数
- 从 target.raw 中拿到原始值
- 调用 raw.has 判断值是否存在
- 执行 收集
- 如果 值存在 ,返回值 如果值为对象则返回响应值
## forEach
- 在 forEach 执行时要 执行一次 track(target,ITERATE_KEY)
- 为了实现之上而下的响应,我们需要在 循环中为 object 添加响应性.
- 这样当数据增减时会执行通知.
## 迭代器方法
- 迭代器方法是由 [Symbol.iterator] 产生的. 所以更改迭代器方法,值需要更改 [Symbol.iterator] 
- Symbol.iterator  , entries 处理
  1. 获取值的原始值
  2. 通过原始值的 Symbol.iterator 获取结果
  3. 对结果进行代理 -> key , value 都需要包裹
  4. 返回结果
- next 函数处理
  1. 通过 原始值的 next 获取值
  2. 返回 value 与 done


# 原始值响应式方案
- 因为原始值无法被拦截 -> 所以需要使用一个非原始值包裹 -> 所以使用 reactive 包裹原始值,使原始值变响应值 -> ref 方法 创建包裹的 工场函数.
- ref 的工作 
  - 创建一个 reactive 值, 并设置唯一 key 为 value 
  - 标记值为 ref 原始值.
# 响应丢失问题 

## 影响范围
1. setup 抛出的值 在 模板中不需要写 value 即可使用
2. reactive 值解构如何解构.
## toRef
- toRef 是将 reactive 值 转为 ref 类似值  
- toRef 的内部其实是做了一个 get value 和 set value 代理 目标还是 reactive 值本身. 且会标识 对象为 ref 值
## proxyRefs 
- 利用 proxy 代理一个对象 
  - get: 在 proxy 的 get 中 判定 如果是 ref 值 返回 value 否则 返回 值本身.
  - set: 在 proxy 的 set 中 判定 如果是 ref 值 修改 value 否则 修改 值本身.




# 渲染器
## 渲染器 和 响应式数据 之间是如何联系的
在响应式的副作用函数中 执行渲染器函数 . 当渲染器函数中引用了响应数据 .就可以触发响应.
## 渲染器 renderer 
渲染器的作用就是 虚拟 DOM 渲染为特定平台上的真实元素, 在浏览器平 台上，渲染器会把虚拟 DOM 渲染为真实 DOM 元素。
## 虚拟DOM
- 虚拟DOM = vdom = vnode
- 虚拟DOM 是和 真实DOM 结构相同的 树结构.
## 渲染器 
- 渲染器 是由 创建渲染器函数(createRenderer) 创建的 (原因是 根据不同 渲染方案进行渲染,依赖倒置) 
- 渲染器 做的事情:
  - render
    - 有新 vnode 进行 patch 对比
    - 无新 vnode 进行 卸载 .
    - 重置 old-vnode
  - patch
    - 有新无旧 : 挂载(mountElement)
  - mountElement ( 浏览器操作dom ) ->  vnode -> 真实 js 操作 dom 语句 -> 执行.
  - 
## 总结
- createRenderer(option) -> 创建 一个渲染器 , option 自定义配制对象 是为了实现自定义行为. 调用平台能力 即 浏览器 操作 DOM. 
- renderer 
  - render 
    - 当有 new vnode -> patch
    - 无 new vnode -> unmount
    - 记录上一次的 vnode
  - patch
    - !old -> 首次挂载 -> mountElement
    - old -> 更新 ->  ? 
  - 

