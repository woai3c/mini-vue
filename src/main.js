import observe from './observer.js'
import Watcher from './watcher.js'
import {toArray, isArray} from './utils.js'
import Directive from './directives.js'
import compile from './compile.js'

// MiniVue构造函数 参数是一个对象
function MiniVue(options) {
    // 存放观察者实例
    this._watchers = []
    // 存放文本节点 在compile上会用到
    this._textNodes = []
    // 存放事件
    this._events = {}
    // 存放指令
    this._directives = []
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
        observe(this._data)
        this._compile()
        this.initWatch()
    },

    initData() {
        const vm = this
        vm.$el = document.querySelector(vm.$options.el)
        let data = vm.$options.data
        data = vm._data = typeof data === 'function'? data() : data || {}
        const keys = Object.keys(data)

        // 对每一个key实现代理 即可通过vm.msg来访问vm._data.msg
        keys.forEach(key => {
            vm.proxy(vm, '_data', key)
        })
    },
    // 初始化方法选项
    initMethods() {
        const vm = this
        const methods = vm.$options.methods? vm.$options.methods : {}
        const keys = Object.keys(methods)
        // 将methods上的方法赋值到vm实例上
        keys.forEach(key => {
            vm[key] = methods[key]
        })
    },
    // 初始化watch选项
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

    // 当为对象添加属性或修改数组的值时可用这个方法 能实时更新
    $set(obj, key, val) {
        this[obj][key] = val
        vm[obj].__ob__.dep.notify()
    },
    // 当为对象删除属性或删除数组的值时可用这个方法 能实时更新
    $delete(obj, key) {
        if (isArray(this[obj])) {
            this[obj].splice(key, 1)
        } else {
            delete this[obj][key]
        }
        vm[obj].__ob__.dep.notify()
    },

    $watch(expOrFn, callback) {
        new Watcher(this, expOrFn, callback)
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
    },
    // 解析DOM
    _compile() {
        compile(this, this.$el)
    }
}

window.MiniVue = MiniVue