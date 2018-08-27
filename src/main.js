import Dep from './dep.js'

function MiniVue(options) {
    this.init(options)
}

MiniVue.prototype = {
    init(options) {
        this.initData(options)
        this.initMethods(options)
    },
    initData(options) {
        const vm = this
        const _data = options.data
        const data = typeof options.data === 'function'? _data() : _data

    }
}