## 实现一个迷你版的vue

### 如何阅读源码

阅读源码要带有目的去看 不能毫无目的的去看源码 以免掉进无尽的细节陷阱中而出不来

### Vue源码要怎么看呢
建议从一个Vue实例化的过程开始 一直跟踪这条主线 直到结尾为止 各种分枝暂时不要管 等把主线理解清楚了 细枝末节自然不在话下

### Vue1.0模块
在Vue主线里有几大模块（除去模板和SLOT）
Vue构造函数 观察者observer 观察者watcher 指令系统directive  DOM解析compile watcher与observer之间的联系者dep
我们来看看他们之间的关系




[学习Vue源码推荐看这篇文章](http://hcysun.me/vue-design/art/)
