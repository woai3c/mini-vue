## 实现一个带响应数据的迷你vue
### Vue实例化过程

1. 实例化之前Vue会先给Vue挂载一系列的原型方法以及静态方法、属性
2. 实例化时会对选项参数进行规范化、合并等操作
3. 过自定义Render方法、template、el等生成Render函数
4. 数据进行绑定 通过Watcher监听数据的变化
5. 数据发生变化时，render函数会执行生成VNode对象

通过patch方法，对比新旧VNode对象，再通过DOM Diff算法添加、修改、删除真正的DOM元素

具体流程可以看lifecycle.png图片<br>
![lifecycle](https://github.com/woai3c/mini-vue/blob/master/imgs/lifecycle.png)

## 简单点来说就是监听数据 数据发生变化 重新渲染DOM
![data](https://github.com/woai3c/mini-vue/blob/master/imgs/data.png)

Vue源码11000行 对于刚接触Vue的前端人员来说 阅读有点困难<br>
目前在网上搜集了很多资料 所以我打算将Vue比较重要的功能实现一遍 代码比较少 理解起来也没有什么难度 

### 实现的功能
监听数据 数据发生变化 重新渲染DOM(不使用VNode 直接操作DOM) 
