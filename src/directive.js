import {extend} from './utils.js'
import {Watcher} from './watcher.js'

export default function Directive(descriptor, vm) {
    this.vm = vm
    this.name = descriptor.name
    this.descriptor = descriptor
    this.expression = descriptor.expression
    this.el = descriptor.el
    this.filters = descriptor.filters
    this.modifiers = descriptor.modifiers
    this.literal = this.modifiers && this.modifiers.literal
}

Directive.prototype = {
    _bind() {
        const descriptor = this.descriptor
        const def = descriptor.def
        if (typeof def === 'function') {
            this.update = def
        } else {
            extend(this, def)
        }

        // 如果指令回调对象有bind函数则执行
        if (this.bind) {
            this.bind()
        }

        if (this.literal) {
            this.update && this.update(descriptor.raw)
        } else if (this.expression) {
            const dir = this
            if (this.update) {
                this._update = function (value, oldVal) {
                    dir.update(value, oldVal)
                }
            }
            const watcher = this._watcher = new Watcher(this.vm, this.expression, this._update, {
                filters: this.filters
            })

            // 第一次更新渲染
            if (this.update) {
                this.update(watcher.value)
            }
        }
    },

    set(value) {
        this._watcher.set(value)
    },

    _teardown(i) {
        if (this.unbind) {
            this.unbind()
        }

        if (this._watcher) {
            this._watcher.teardown()
        }

        this.vm = this.el = this._watcher = null
    }
}