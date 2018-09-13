import Dep from './dep.js'
import {isObject, extend, makeGetterFn} from './utils.js'

// watcher实例的ID 每个watcher实现的ID都是唯一的
let uid = 0

// expOrFn为表达式或一个变量名
export function Watcher(vm, expOrFn, callback, options) {
    vm._watchers.push(this)

    if (options) {
        extend(this, options)
    }
    
    this.id = uid++
    this.vm = vm
    this.expression = expOrFn   

    // props需要用到
    this.sync = options? options.sync : false

    // 计算属性需要用到
    this.dirty = this.lazy

    // 存放dep实例
    this.deps = []

    // 存放dep的ID
    this.depIds = new Set()

    // 更新触发回调函数
    this.cb = callback

    if (typeof expOrFn === 'function') {    
        this.getter = expOrFn
        this.setter = undefined
    } else {
        const res = parseExpression(expOrFn)
        this.getter = res.get
        this.setter = (value) => {
            vm[expOrFn] = value
        }

    }
    // 在创建watcher实例时先取一次值
    this.value = this.get()
}

Watcher.prototype = {
    get() {
        // 在读取值时先将观察者对象赋值给Dep.target 否则Dep.target为空 不会触发收集依赖
        Dep.target = this
        const value =  this.getter.call(this.vm, this.vm)
        // 触发依赖后置为空
        Dep.target = null
        return value
    },

    set(value) {
        this.setter.call(this.vm, value)
    },

    update() {
        // 触发更新后执行回调函数
        // 如果没有同步标记 则异步更新
        // 假设原来在一个函数里同时执行age++ 4次 则会执行回调函数4次 
        // 异步更新则会执行一次 优化性能
        
        if (this.lazy) {
            this.dirty = true
        } else if (!this.sync) {
            pushWatcher(this)
        } else {
            this.run()
        }
    },

    run() {
        const value = this.get()
        const oldValue = this.value
        this.value = value
      
        if (value !== oldValue || isObject(value)) {
            this.cb.call(this.vm, value, oldValue)
        }

    },

    addDep(dep) {
        // 触发依赖 dep添加观察者对象 同时观察者对象也会将dep实例添加到自己的deps里
        // 如果dep已经存在deps里 则不添加
        // dep中存放着对应的watcher watcher中也会存放着对应的dep
        // 一个dep可能有多个watcher 一个watcher也可能对应着多个dep
        if (!this.depIds.has(dep.id)) {
            this.deps.push(dep)
            this.depIds.add(dep.id)
            dep.addSub(this)
        }
    },

    teardown() {
        this.vm._watchers.splice(this.vm._watchers.indexOf(this), 1)
        let i = this.deps.length
        while (i--) {
          this.deps[i].removeSub(this)
        }
        this.vm = this.cb = this.value = null
    },

    evaluate() {
        const current = Dep.target
        this.value = this.get()
        this.dirty = false
        Dep.target = current
    },

    depend() {
        this.deps.forEach(dep => {
            dep.depend()
        })
    }
}

// 如果要对{{obj.a.b.msg}} 求值 则建一个函数 返回 vm.obj.a.b.msg 值
function parseExpression(exp) {
    exp = exp.trim()
    const res = {exp}
    res.get = makeGetterFn(exp)
    return res
}

const queue = []
let has = {}
let waiting = false

function pushWatcher(watcher) {
    const id = watcher.id
    // 如果已经有相同的watcher则不添加 防止重复更新
    if (has[id] == null) {
        has[id] = queue.length
        queue.push(watcher)
    }

    if (!waiting) {
        waiting = true
        nextTick(flushQueue)
    }
}

function flushQueue() {
    queue.forEach(q => {
        q.run()
    })
    
    // 重置
    waiting = false
    has = {}
    queue.length = 0
}

export function nextTick(cb, ctx) {
    const p = Promise.resolve()
    p.then(ctx? cb.call(ctx) : cb())
}