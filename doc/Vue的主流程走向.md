在项目首页上的图片相信大家都是看过的，在这里再用文字描述一下new一个实例时的具体走向
假设我这样new一个实例
```
<div id="app">
  {{name}}
</div>


const vm = new Vue({
  el: '#app',
  data: {
    name: '小明'
  },
  methods: {
    sayHi() {
      console.log('Hi')
    }
  }
})
```
显然 最终div里的{{name}}会被渲染成为小明 当你手动修改name的值时
```
vm.name = '小马'
```
div里的值也会变成小马 

接下来我们就来讲讲这一过程(看这个文章最好和v0.1的源码一起看)

### 实例化之前
在引入Vue文件时 Vue本身会有几个类函数和一个处理函数集合
* observer
* watcher
* dep
* directive
* directives (处理函数集合 v0.1源码里写的是handlers 后续的版本改成directives了)

### 实例化时
* 首先会调用initData initMethods等一系列方法 将数据挂载到Vue实例上 这样就可以通过vm.name 或者 vm.sayHi直接读取数据和调用函数
* 接下来会调用observe(data) 对数据进行监听 就是用我上一篇文章提到的Object.defineProperty()方法 对每一个key都建立一个dep实例 
  并在getter和setter作了一些设置(具体看源码) 当访问这一个key的getter 就会触发getter函数里的dep.depend方法收集依赖(watcher实例)
  当对这一个key赋值时 就会触发setter里的dep.notify方法 通知dep收集的所有watcher实例调用update方法进行更新
* 上一步完成之后就会调用compile函数开始对DOM进行解析了 例子里的div只有一个文本节点 首先会解析div 然后再解析div里的{{name}} 因为div没有指令
  所以解析完后不会生成指令 解析{{name}}时会生成一个text指令 并把{{name}}替换为一个空的文本节点 然后生成一个描述符对象 
  ```
  descriptor = {
    name: 'text',
    expression: 'name',
    el: node, // 替换{{name}}的文本节点
    def: directives[text], // 对应的处理函数
  }
  ```
  描述符对象收集了后面生成指令实例时所需要的数据 要监听的表达式'name', 对应的文本节点, 和指令对应的处理函数(这个是手动加上去的)
* 然后会将这个描述符当作参数传入directive类 生成一个指令实例 
* 指令实例执行bind方法 bind方法会将表达式 指令处理函数 以及相关的一些参数传给watcher生成一个watcher实例
* watcher首次会执行get方法 对表达式进行求值 也就是取得vm.name的值 然后将得到的值将给update方法 
* update方法将值传入处理函数对DOM进行更新 这样就完成了第一次渲染 

### 实例化完成后
以后每一次更改name的值  都会触发name这个key的setter方法 setter方法再触发dep.notify通知对应的watcher调用update方法进行更新 
update方法再把值传给对应的处理函数 再一次进行DOM渲染 如此循环往复
  
其他的指令也是按照这一流程来运行的 
