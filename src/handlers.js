import {on, off, bind} from './utils.js'

const isArray = Array.isArray

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
        }
    }
}

// 针对各种指令的回调函数
export default {
    text: {
        bind() {
            this.attr = this.el.nodeType === 3 ? 'data' : 'textContent'
        },

        update(value) {
            this.el[this.attr] = value
        }
    },

    on: {
        bind() {
            this.appFn = null
        },

        update(handler) {
            if (this.appFn) {
                off(this.el, this.descriptor.arg, this.appFn)
            }
            this.appFn = bind(handler, this.vm)
            on(this.el, this.descriptor.arg, this.appFn)
        },

        unbind() {
            if (this.appFn) {
                off(this.el, this.descriptor.arg, this.appFn)
            }
        }
    },

    bind: {
        bind() {
            this.attr = this.descriptor.arg
        },

        update(value) {
            this.el.setAttribute(this.attr, value)
        }
    },

    model: {
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
    }
}

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