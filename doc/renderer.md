# 渲染器的创建
- createRenderer(option) -> 创建 一个渲染器 , option 自定义配制对象 是为了实现自定义行为. 调用平台能力 即 浏览器 操作 DOM. 
  - renderer 
    - render 
      - 当有 new vnode -> patch
      - 无 new vnode -> unmount
      - 记录上一次的 vnode
    - patch( old Vnode, new Vnode , container)
      - !old -> 首次挂载 -> mountElement
      - old -> 更新 ->  
        - newVnode.type !== oldVnode.type -> unmount(oldVnode) , oldVnode = null  
        - 判断 newVnode.type 与 old.type 是否相同
          - 不同 -> 卸载旧的  -> 存放新的
          - 相同
            - Symbol.Fragment -> 代码片断 -> 无 old patch插入  ? 有 old Diff 
            - Symbol.text -> 文本 -> 无 old 创建 ? 有 old 更新
            - Symbol.Comment -> 注释 -> 无 old 创建 ? 有 old 更新
            - string -> html 节点 -> oldVnode ? patchElement : mountElement 
            - object -> 组件 -> TODO
            - xx -> TODO
        - 判断 newVnode.children -> patchChildren
    - patchChildren
      - string -> 更新文案即可
        - array -> 
          - diff 算法
            - 取 min(old.length, new.length) -> 为了最少的jinx path 比较
            - 判断新增 (old.length < new.length) -> 挂载 new 中剩余节点
            - 判断删除 (old.length > new.length) -> 卸载 old 中剩余节点
          - key 判断 (想要复用 item 通过 type 判定有点草率 , 所以给 item 定义了 ID_Card)
            -  循环旧节点 -> 如果在新节点中找到相同 key -> 
               - 有 -> patch(该节点) -> 移动节点
                 - 循环新旧节点时 , 记录最大 index.
                 - 当前节点(旧节点)的 index < 最大 index ?  需要移动的节点 : 更新 最大 index
               - 无 -> break

    - mountElement(vnode , container) -> 用来完成挂载
      -  把 vnode 解析成真实 dom 
        - 解析 自己的 props -> dom 属性 -> patchProps 
        - 解析 自己的 children
          - string -> 直接 setText
          - Array -> 循环 - patch(null , item ,父节点)
      -  把解析好的dom 挂载到容器上
    - unmount()
      - js 移除旧节点 ( node.el.parent.remove(node.el))

- option
  - patchProps -> 
    - 处理属性
      - 判断 props 是 class or style -> 指令正常化处理 -> 使用对应高效方案处理
      - 判断 props 是否只能通过 setAttribute 设置 ( condition : 只读属性 映射表 ) 
      - 判断 props 是否在 el 上存在
        - 存在 : [typeof el.xx  === boolean && '' => true] -> 使用 el.xx = xx 来处理
        - 不存在: 使用 setAttribute 来处理
    - 处理事件
      - 以 on 开头的是事件.
      - 以 伪造事件处理函数(invoker) 执行事件
        - 记录 invoker 绑定 el 高精时间
        - 事件传入
          - 如果 invoker 存在 -> 替换
          - 如果 invoker 不存在 -> 安装
        - 无事件传入
          - 如果 invoker 存在 -> removeEventLister
        - 妙: 
          - 以中间函数调用 props 中的事件, 可以节省 addEventLister 消耗
          - 以中间函数调用 props 中的事件, 方便 模板修饰符.
          - 以数组 + 字符串形势 管理 props 中重复事件 , 以编译时节省运行时.
          - 无事件卸载 中间函数 , 有事件使用中间函数 ,冲突更改事件不会调用 addEventLister
      - 事件执行
        - 获取当前时间和绑定事件比较 如果 绑定时间 > 当前 -> return (为了处理 绑定事件发生在事件冒泡之前.)
        - 执行事件.
  - 

## 知识
1. getAttribute 对于一些属性只会取其初始值 例如 input.value 
2. HTML Attributes 可能关联多个 DOM Properties。
3. HTML Attributes 的作用是设置与之对应的 DOM Properties 的初始值。
# renderer 和 reactivity 如何联系
在响应式的副作用函数中 执行渲染器函数 . 当渲染器函数中引用了响应数据 .就可以触发响应. ?