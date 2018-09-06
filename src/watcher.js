import Dep from './dep.js'
import {isObject} from './utils.js'

// watcher实例的ID 每个watcher实现的ID都是唯一的
let uid = 0

// expOrFn为表达式或一个变量名
export default function Watcher(vm, expOrFn, callback) {
    vm._watchers.push(this) 
    this.id = uid++
    this.vm = vm
    this.expression = expOrFn   
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
        const value = this.getter.call(this.vm, this.vm)
        // 触发依赖后置为空
        Dep.target = null
        return value
    },

    set(value) {
        this.setter.call(this.vm, value)
    },

    update() {
        this.run()
    },

    run() {
        // 触发更新后执行回调函数
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
    }
}

function parseExpression(exp) {
    exp = exp.trim()
    const res = {exp}
    res.get = new Function('vm', 'return ' + 'vm.' + exp)
    return res
}