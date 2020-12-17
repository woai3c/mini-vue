# MiniVue
克隆项目之后 运行
```
npm run dev
```
可以查看一些指令的展示效果 不过没有排版 样式比较丑陋 建议对比着指令来看 也可以自己写一些代码看效果 指令用法和 Vue 一样的
## Vue1和Vue2的区别
其实 Vue1 和 Vue2 最大的区别就是 Vue2 多了一个虚拟DOM，其他的区别都是很小的。所以理解了 Vue1 的源码，就相当于理解了 Vue2，中间差了一个虚拟DOM 以及 Diff 算法

## 网友的学习笔记
* [Mr.大哥](https://www.yuque.com/mrdage/qnzf2d)

## 文档
* [Vue简介](https://github.com/woai3c/mini-vue/blob/master/doc/introduce.md)
* [数据双向绑定](https://github.com/woai3c/mini-vue/blob/master/doc/%E6%95%B0%E6%8D%AE%E5%8F%8C%E5%90%91%E7%BB%91%E5%AE%9A.md)
* [Vue主流程走向](https://github.com/woai3c/mini-vue/blob/master/doc/Vue%E7%9A%84%E4%B8%BB%E6%B5%81%E7%A8%8B%E8%B5%B0%E5%90%91.md)
* [组件](https://github.com/woai3c/mini-vue/blob/master/doc/%E7%BB%84%E4%BB%B6.md)
* [nextTick异步更新](https://github.com/woai3c/mini-vue/blob/master/doc/nextTick%E5%BC%82%E6%AD%A5%E6%9B%B4%E6%96%B0.md)

## MVVM
[先来科普一下MVVM的概念及原理](https://github.com/woai3c/mini-vue/blob/master/doc/mvvm.md)

## 配套插件
[mini-vuex](https://github.com/woai3c/mini-vuex)
## 实现一个迷你版的vue

### 实现的功能
#### 全局方法
```
// 继承MiniVue 产生一个新的子类构造函数
MiniVue.extend
// 在实例化过程完成后运行
MiniVue.nextTick
// 注册自定义指令
MiniVue.directive
// 过滤器
MiniVue.filter 
// 组件 包括slot props
MiniVue.component
// 插件
MiniVue.use
// 混入
MiniVue.mixin
```

#### mixins filters components directives 也可以局部注册 在new一个实例时提供以下选项即可

```
filters
components
mixin
directives
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
#### 指令

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
计算属性用法也和Vue一样

#### 生命周期
```
init
created
beforeCompiled
compiled
destroyed
```

### 以上实现的功能用法和Vue一模一样

### 如何阅读源码

阅读源码要带有目的去看 不能毫无目的的去看源码 以免掉进无尽的细节陷阱中而出不来

### Vue源码要怎么看呢
建议从一个Vue实例化的过程开始 一直跟踪这条主线 直到结尾为止(一定要打断点 debugger 我打了100多个断点才看懂主流程) 各种分枝暂时不要管 等把主线理解清楚了 细枝末节自然不在话下

### Vue1.0模块
在Vue主线里和数据双向绑定有关的有以下几个模块
* Vue构造函数
* 观察者observer
* 观察者watcher
* 指令系统 directive类和directives指令函数集合
* DOM解析compile 
* watcher与observer之间的联系者dep

我们来看看他们之间的关系

![vue流程图](https://github.com/woai3c/mini-vue/blob/master/imgs/vue.svg)

如果不是想自己实现一个mvvm框架 Vue的源码不用细读 只要明白主线的运行过程就行了 想要熟练使用Vue看官方文档即可<br>
想了解主线流程的 可以看看我的v0.1版本 300行代码 完整的实现了双向数据绑定的流程 还有3条指令的实现过程 其实其他的指令即使没实现 也没什么关系 主流程明白即可

[MiniVue v0.1](https://github.com/woai3c/mini-vue/tree/v0.1)

[学习Vue源码推荐看这篇文章](http://hcysun.me/vue-design/zh/essence-of-comp.html#%E7%BB%84%E4%BB%B6%E7%9A%84%E4%BA%A7%E5%87%BA%E6%98%AF%E4%BB%80%E4%B9%88)

### 如果对你有帮助，请给个Star
