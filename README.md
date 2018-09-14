## 实现一个迷你版的vue

### 实现的功能
#### 全局方法
```
MiniVue.extend
MiniVue.nextTick
MiniVue.directive
MiniVue.filter
MiniVue.component
MiniVue.use
MiniVue.mixin
```

#### mixin filter component也可以局部注册 在new一个实例时提供以下选项即可

```
filters
components
mixin
```

#### 实例方法

```
vm.$watch
vm.$set
vm.$delete
vm.$on
vm.$once
vm.$off
vm.$emit
vm.$nextTick
```
#### 实现指令

```
v-text
v-html
v-show
v-if
v-else
v-for
v-on
v-bind
v-model
```

#### 计算属性


### 如何阅读源码

阅读源码要带有目的去看 不能毫无目的的去看源码 以免掉进无尽的细节陷阱中而出不来

### Vue源码要怎么看呢
建议从一个Vue实例化的过程开始 一直跟踪这条主线 直到结尾为止(一定要打断点 debugger 我打了100多个断点才看懂主流程) 各种分枝暂时不要管 等把主线理解清楚了 细枝末节自然不在话下

### Vue1.0模块
在Vue主线里有几大模块（除去模板和SLOT）
Vue构造函数 观察者observer 观察者watcher 指令系统directive  DOM解析compile watcher与observer之间的联系者dep
我们来看看他们之间的关系

![vue流程图](https://github.com/woai3c/mini-vue/blob/master/imgs/vue.svg)

如果不是想自己实现一个mvvm框架 Vue的源码不用细读 只要明白主线的运行过程就行了 想要熟练使用Vue看官方文档即可<br>
想了解主线流程的 可以看看我的v0.1版本 300行代码 完整的实现了双向数据绑定的流程 还有3条指令的实现过程 其实其他的指令即使没实现 也没什么关系 主流程明白即可<br>
[MiniVue v0.1](https://github.com/woai3c/mini-vue/tree/v0.1)

[学习Vue源码推荐看这篇文章](http://hcysun.me/vue-design/art/)
