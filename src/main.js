import Observer from './observer.js'
import Compile from './compile.js'
import Watcher from './watcher.js'
import {toArray} from './utils.js'

// MiniVue构造函数 参数是一个对象
function MiniVue(options) {
    // 存放观察者实例
    this._watchers = []
    // 存放文本节点 在compile上会用到
    this._textNodes = []
    // 存放事件
    this._events = {}
    // 存放指令
    this._directives = {}
    this.$options = options
    this.init()
}

// 原型方法
MiniVue.prototype = {
    // 初始化数据和方法
    init() {
        this.initData()
        this.initMethods()
        // 监听数据
        new Observer(this._data)
        // 解析指令
        new Compile(this)
        this.initWatch()
    },

    initData() {
        const vm = this
        vm.$el = document.querySelector(vm.$options.el)
        let data = vm.$options.data
        data = vm._data = typeof data === 'function'? data() : data || {}
        const keys = Object.keys(data)

        // 对每一个key实现代理 即可通过vm.msg来访问vm._data.msg
        keys.forEach(e => {
            vm.proxy(vm, '_data', e)
        })
    },

    initMethods() {
        const vm = this
        const methods = vm.$options.methods? vm.$options.methods : {}
        const keys = Object.keys(methods)
        // 将methods上的方法赋值到vm实例上
        keys.forEach(e => {
            vm[e] = methods[e]
        })
    },

    initWatch() {
        if (this.$options.watch) {
            const watch = this.$options.watch
            const keys = Object.keys(watch)
            keys.forEach(key => {
                this.$watch(key, watch[key])
            })
        }
    },

    proxy(target, sourceKey, key) {
        const sharedPropertyDefinition = {
            enumerable: true,
            configurable: true
        }

        // 实际上读取和返回的是vm._data上的数据
        sharedPropertyDefinition.get = function proxyGetter () {
            return this[sourceKey][key]
        }
        sharedPropertyDefinition.set = function proxySetter (val) {
            this[sourceKey][key] = val
        }
        Object.defineProperty(target, key, sharedPropertyDefinition)
    },

    $watch(variable, callback) {
        new Watcher(this, variable, callback)
    },

    $on(event, fn) {
        (this._events[event] || (this._events[event] = [])).push(fn)
    },

    $off(event, fn) {
        const cbs = this._events[event]
        if (!fn) {
            cbs.length = 0
            return
        }
        let l = cbs.length
        while (l--) {
            let cb = cbs[l]
            if (cb === fn) {
                cbs.splice(l, 1)
            }
        }
    },

    $emit(event) {
        const cbs = this._events[event]
        const args = toArray(arguments, 1)
        if (!cbs) {
            this._events[event] = []
            return
        }
        if (args.length > 1) {
            cbs.forEach(cb => {
                cb.apply(this, args)
            })
        } else {
            cbs.forEach(cb => {
                cb.call(this, args[0])
            })
        }
    },

    $once(event, fn) {
        const vm = this
        function on() {
            vm.$off(event, on)
            fn.apply(this, arguments)
        }
        this.$on(event, on)
    }

    bindDir(descriptor, node, host, scope, frag) {
        this._directives.push(new Directive(descriptor, this, node, host, scope, frag))
    }
}

window.MiniVue = MiniVue