import Observer from './observer.js'
import Compile from './compile.js'

// MiniVue构造函数 参数是一个对象
function MiniVue(options) {
    // 存放观察者实例
    this._watchers = []
    // 存放文本节点 在compile上会用到
    this._textNodes = []
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
    }
}

window.MiniVue = MiniVue