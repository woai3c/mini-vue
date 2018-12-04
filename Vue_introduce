## 介绍
Vue是基于数据双向绑定的一个MVVM框架<br>
优点是视图驱动数据 数据驱动视图<br>
 在以往的DOM操作中 在数据改变的同时 还要改变相应的DOM<br>
在Vue里 就可以省去这一操作 只要数据变了 视图也会相应的改变 视图改变 对应的数据也会改变<br>

## 基本用法
```
<div id="app">
  {{ message }}
</div>

var app = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue!'
  },
  methods: {
    sayHi() {
      console.log('hi')
    }
  }
})

```
new Vue接受一个对象作为参数<br>
参数包含容器元素el, 以及相应的数据data和方法methods<br>


## 重点
Vue主要关注的是两个模块：指令以及组件

### 指令
* [v-text](https://cn.vuejs.org/v2/api/#v-text)
* [v-html](https://cn.vuejs.org/v2/api/#v-html)
* [v-show](https://cn.vuejs.org/v2/api/#v-show)
* [v-if](https://cn.vuejs.org/v2/api/#v-if)
* [v-else](https://cn.vuejs.org/v2/api/#v-else)
* [v-else-if](https://cn.vuejs.org/v2/api/#v-else-if)
* [v-for](https://cn.vuejs.org/v2/api/#v-for)
* [v-on](https://cn.vuejs.org/v2/api/#v-on)
* [v-bind](https://cn.vuejs.org/v2/api/#v-bind)
* [v-model](https://cn.vuejs.org/v2/api/#v-model)
* [v-pre](https://cn.vuejs.org/v2/api/#v-pre)
* [v-cloak](https://cn.vuejs.org/v2/api/#v-cloak)
* [v-once](https://cn.vuejs.org/v2/api/#v-once)

以上是Vue里平时需要用到的指令

示例：
```
<p v-if="true">如果v-if为真 这个段落就会显示出来 否则隐藏</p>
```

### 组件
组件其实就是Vue的实例 可以把第一个Vue实例当成一个根实例 在它下面的组件全是挂在实例里面的子实例<br>
相当于嵌套页面 一个嵌套一个嵌套<br>
每一个实例都有自己的数据、方法等属性<br>
区别就在于父子组件之间能传值<br>
[组件基础](https://cn.vuejs.org/v2/guide/components-registration.html)
