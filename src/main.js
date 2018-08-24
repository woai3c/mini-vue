import test from './dep.js'

function Vue(options) {
    this._init(options)
}

Vue.prototype = {
    _init(options) {
        this._initData(options)
    }
}