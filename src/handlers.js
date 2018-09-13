import {on, off, bind, isArray, getAttr, remove, replace, insert} from './utils.js'
import compile from './compile.js'
import {defineReactive} from './observer.js'
import {Watcher} from './watcher.js'


const ON = 700
const MODEL = 800
const BIND = 850
const COMPONENT = 1500
const IF = 2100
const FOR = 2200
const SLOT = 2300


const handlers = {
    text: {
        bind() {
            const self = this
            this.listener = function() {
                self.set(this.value)
            }
            on(this.el, 'input', this.listener)
        },

        update(value) {
            this.el.value = value
        },

        unbind() {
            off(this.el, 'input', this.listener)
        }
    },

    select: {
        bind() {
            const el  = this.el
            let multiple = this.multiple = el.hasAttribute('multiple')

            this.listener = () => {
                let value = getValue(el, multiple)
                this.set(value)
            }

            on(el, 'change', this.listener)

            // 初始化 对比值有没有相等 如果有就选中
            getValue(el, multiple, true)
        },

        update(value) {
            const el = this.el
            el.selectedIndex = -1
            const multi = this.multiple && isArray(value)
            const options = el.options
            let i = options.length
            let op, val
            while (i--) {
                op = options[i]
                val = op.value
                op.selected = multi? value.indexOf(val) > -1 : value == val
            }
        },

        unbind() {
            off(this.el, 'change', this.listener)
        }
    },

    radio: {
        bind() {
            const self = this
            const el = this.el
            this.listener = function() {
                self.set(this.value)
            }

            on(this.el, 'change', this.listener)
        },

        update(value) {
            const el = this.el
            el.checked = el.value == value
        },

        unbind() {
            off(this.el, 'change', this.listener)
        }
    },

    checkbox: {
        bind() {
            const self = this
            const el = this.el

            this.listener = function() {
                const isChecked = el.checked
                let val = self._watcher.get()
                if (isArray(val)) {
                    let index = val.indexOf(this.value)
                    if (isChecked) {
                        if (index == -1) {
                            self.set(val.concat(this.value))
                        }
                    } else {
                        self.set(val.slice(0, index).concat(val.slice(index + 1)))
                    }
                } else {
                    self.set(isChecked)
                } 
            }

            on(el, 'change', this.listener)
        },

        update(value) {
            const el = this.el
            if (isArray(value)) {
                el.checked = value.indexOf(el.value) > -1
            } else {
                el.checked = !!value
            }
        },

        unbind() {
            off(el, 'change', this.listener)
        }
    }
}

// 针对各种指令的回调函数
export default {
    // 文本节点 {{text}}
    text: {
        bind() {
            this.attr = this.el.nodeType === 3 ? 'data' : 'textContent'
        },

        update(value) {
            
            this.el[this.attr] = value
        }
    },
    // @ | v-on
    on: {
        priority: ON,

        bind() {

        },

        update(handler) {
            if (this.handler) {
                off(this.el, this.descriptor.arg, this.handler)
            }
            this.handler = handler
            on(this.el, this.descriptor.arg, this.handler)
        },

        unbind() {
            if (this.handler) {
                off(this.el, this.descriptor.arg, this.handler)
            }
        }
    },
    // : | v-bind:
    bind: {
        priority: BIND,
        bind() {
            this.attr = this.descriptor.arg
        },

        update(value) {
            this.el.setAttribute(this.attr, value)
        }
    },
    // v-model
    model: {
        priority: MODEL,
        bind() {
            const el = this.el
            const tag = el.tagName
            let handler

            switch (tag) {
                case 'INPUT':
                    handler = handlers[el.type] || handlers.text
                    break
                case 'TEXTAREA':
                    handler = handlers.text
                    break
                case 'SELECT':
                    handler = handlers.select
                    break
                default:
                    return
            }

            handler.bind.call(this)
            this.update = handler.update
        }
    },
    // v-html
    html: {
        update(value) {
            this.el.innerHTML = value
        }
    },
    // v-show
    show: {
        update(value) {
            this.el.style.display = !!value? '' : 'none'
        }
    },
    // v-if
    // 将if和else的DOM都渲染完毕然后移除 但用引用保存起来 在原位置放一个文本节点占位 根据值true or false 来将对应的节点添加到占位节点的前面
    // 如果值变更 则将节点删除用新的替换 
    if: {
        priority: IF,
        bind() {
            const el = this.el
            const next = el.nextElementSibling
            if (next && getAttr(next, 'v-else') !== null) {
                remove(next)
                this.elseEl = next
            }
            // 占位节点
            this.anchor = document.createTextNode('')
            replace(el, this.anchor)
            this.isFirst = true
        },

        update(value) {
            if (value) {
                if (this.cloneElseEl) {
                    remove(this.cloneElseEl)
                }

                if (!this.isFirst) {
                    this.cloneEl = this.el.cloneNode(true)
                    insert(this.cloneEl, this.anchor)
                } else {
                    this.isFirst = false

                    setTimeout(() => {
                        this.cloneEl = this.el.cloneNode(true)
                        insert(this.cloneEl, this.anchor)
                    }, 0)
                }
                
            } else {
                if (this.cloneEl) {
                    remove(this.cloneEl)
                }

                if (!this.isFirst) {
                    this.cloneElseEl = this.elseEl.cloneNode(true)
                    insert(this.cloneElseEl, this.anchor)
                } else {
                    this.isFirst = false

                    setTimeout(() => {
                        this.cloneElseEl = this.elseEl.cloneNode(true)
                        insert(this.cloneElseEl, this.anchor)
                    }, 0)
                }
            }
        }
    },
    // v-for
    // 将v-for节点克隆 再根据值的长度克隆进去再compile渲染 如果值变更 则将之前的节点全部删除 重新渲染
    for: {
        priority: FOR,
        bind() {
            const re1 = /(.*) (?:in|of) (.*)/
            const re2 = /\((.*),(.*)\)/
            let match = this.expression.match(re1)
            
            if (match) {
                let match1 = match[1].match(/\((.*),(.*)\)/)
                if (match1) {
                    this.valueKey = match1[1].trim()
                    this.indexKey = match1[2].trim()
                } else {
                    this.valueKey = match[1].trim()
                }
            } else {
                this.valueKey = match[1].trim()
            }
            
            this.expression = match[2].trim()
            this.anchor = document.createTextNode('')
            this.frag = document.createDocumentFragment()
            replace(this.el, this.anchor)
        },

        update(value) {
            if (this.len) {
                while (this.len--) {
                    remove(this.anchor.previousElementSibling)
                }            
            } 
            let cloneNode
            let re1
            let re2 
            let html

            if (typeof value !== 'object') {
                console.error(`${this.expression}必须为对象或数组`)
                return
            }

            this.len = 0

            for (let key in value) {
                this.len++
                cloneNode = this.el.cloneNode(true)
                html = cloneNode.innerHTML
                if (this.valueKey) {
                    re1 = new RegExp(`{{\\s*${this.valueKey}\\s*}}`, 'g')
                    html = html.replace(re1, value[key])
                }
                if (this.indexKey) {
                    re2 = new RegExp(`{{\\s*${this.indexKey}\\s*}}`, 'g')
                    html = html.replace(re2, key)
                }
               
                cloneNode.innerHTML = html
                
                this.frag.appendChild(cloneNode)
                
            }
            compile(this.vm, this.frag)
            insert(this.frag, this.anchor)
        }
    },
    component: {
        priority: COMPONENT,

        bind() {
            this.anchor = document.createTextNode('')
            replace(this.el, this.anchor)
            const child = this.build()
            insert(child.$el, this.anchor)
        },

        build() {
            this.Component = this.vm.$options.components[this.expression]
            
            const options = {
                name: this.expression,
                el: this.el.cloneNode(true),
                // 组件标识
                _asComponent: true,
                // 父级上下文对象
                _context: this.vm,
                parent: this.vm,
            }
            
            return new this.Component(options)
        },

        update(value) {

        },

        unbind() {

        }
    },

    prop: {
        bind() {
            const child = this.vm
            const parent = child._context
            const prop = this.descriptor.prop
            const childKey = prop.path
            const parentKey = prop.parentPath
            const parentWatcher = this.parentWatcher = new Watcher(parent, parentKey, function(val) {
                child[prop.path] = val
            }, {sync: true})
            defineReactive(child, prop.path, parentWatcher.value)
        },

        unbind() {

        }
    },
    slot: {
        priority: SLOT,

        bind() {
            let name = getAttr(this.el, 'name') 
            if (name == null) { 
                name = 'default'
            }
            const content = this.vm._slotContents && this.vm._slotContents[name]
            replace(this.el, content)
        }
    }
}

// 获取selected选中的值
function getValue(el, multi, init) {
    const res = multi? [] : null
    let op, selected
    for (let i = 0, l = el.options.length; i < l; i++) {
        op = el.options[i]
        selected = init? op.hasAttribute('selected') : op.selected
        if (selected) {
            if (multi) {
                res.push(op.value)
            } else {
                return op.value
            }
        }
    }
    return res
}