import handlers from './handlers.js'
import Watcher from './watcher.js'


// 指令解析器
export default function Compile(vm) {
    this.el = vm.$el
    this.vm = vm
    this.onRe = /^(v-on:|@)/
    this.modelRe = /^v-model/
    this.bindRe = /^(v-bind:|:)/
    this.braceRe1 = /{{\w+}}/g
    this.braceRe2 = /[{}]/g
    this.dirs = []
    this.handlers = handlers
    this.init()
}

Compile.prototype = {
    init() {
        this.parse(this.el)
        this.render()
    },

    parse(el) {
        const attrs = el.attributes
        let name
        [...attrs].forEach(e => {
            if (this.onRe.test(e.name)) {
                name = e.name.replace(this.onRe, '')
                this.addDir(this.handlers.on, name, e.name, e.value, el)
            } else if (this.bindRe.test(e.name)) {
                // 类似:bind="name" 解析完后将原本的值删掉
                el.removeAttribute(e.name.split('=')[0])
                name = e.name.replace(this.bindRe, '')
                this.addDir(this.handlers.bind, name, e.name, e.value, el)
            } else if (this.modelRe.test(e.name)) {
                name = e.name.replace(this.modelRe, '')
                this.addDir(this.handlers.model, name, e.name, e.value, el)
            }
        })

        const children = el.childNodes
        if (children.length > 0) {
            children.forEach(ele => {
                switch(ele.nodeType) {
                    // 元素节点
                    case 1: 
                        this.parse(ele)
                        break
                    // 文本节点
                    case 3: 
                        if (this.braceRe1.test(ele.nodeValue)) {
                            this.vm._textNodes.push(ele)
                        }
                        break
                }
            })
        }
    },

    addDir(handle, dirName, name, value, el) {
        this.dirs.push({
            vm: this.vm,
            dirName,
            handle,
            rawName: name,
            expOrFn: value,
            el
        })
    },

    render() {
        const vm = this.vm
        const that = this
        this.dirs.forEach(e => {
            const handle = e.handle
            if (handle.bind) {
                handle.bind(e.vm, e.el, e.dirName, e.expOrFn)
            } 
            const update = function(newVal, oldVal) {
                handle.update(e.vm, e.el, e.expOrFn, newVal, oldVal)
            }
            // 在这里开始创建观察者实例 将监听的值变化时 触发update回调函数
            new Watcher(this.vm, e.expOrFn, update)
        })
        const handlers = this.handlers.textNode

        vm._textNodes.forEach(e => {
            let arry = e.nodeValue.match(this.braceRe1)
            let rawValue = e.nodeValue
            arry.forEach(str => {
                let variable = str.replace(this.braceRe2, '')
                handlers.bind(vm, e, variable)
                const update = function(newVal, oldVal) {
                    handlers.update(vm, newVal, oldVal, e, variable, rawValue, that.braceRe1, that.braceRe2)
                }
                // 监听文本节点 在这里开始创建观察者实例 将监听的值变化时 触发update回调函数
                new Watcher(vm, variable, update)
            })
        })
    }
}

function compile(el, options) {
    compileNode(el, options)
    if (el.hasChildNodes()) {
        compileNodeList(el.childNodes, options)
    }
}

function compileNode(nodes, options) {

}


function compileNodeList() {
    
}

function compileElement(node, options) {

}

function compileTextNode(node, options) {

}

function parseText(text) {

}