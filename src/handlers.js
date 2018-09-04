import {on, off, bind} from './utils.js'

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

        },

        update() {

        }
    },

    radio: {
        bind() {

        },

        update() {

        }
    },

    checkbox: {
        bind() {

        },

        update() {

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