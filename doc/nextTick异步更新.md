我们都知道，当数据改变时，会执行watcher的update方法去重新渲染DOM
假如在一个函数里执行这些操作
```
this.age++
this.age++
this.age++
this.age++
```
如果HTML有用到age这个属性 这个函数运行期间会渲染4次DOM
如果有大量的数据像上面函数那样操作 会对页面造成很大的负担 所以为了解决这个问题推出了nextTick异步更新
原理是这样的 每次数据变更时 执行watcher.update方法 但是不会立刻执行指令的更新函数 而是把这个更新指令推入到一个数组 而这个数组是会异步更新
也就是
```
function nextTick(fn) {
  setTimeout(function(){
    // 在这里更新数组里的所有指令
    fn()
  }, 0)
}
```
JS是单线程语言 只有在同步栈里所有流程都执行完之后 才会去执行setTimeout里的方法 
再结合上面函数中的例子 如果我们使用了异步更新 即使this.age++执行了4次 也只会渲染1次DOM 因为他们是同步运行的 如果不用异步更新 则会渲染4次DOM
