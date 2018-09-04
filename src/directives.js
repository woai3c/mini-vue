import {extend} from './utils.js'
import Watcher from './watcher.js'

export default function Directive(descriptor, vm) {
    this.vm = vm
    this.descriptor = descriptor
    this.expression = descriptor.expression
    this.el = descriptor.el
}

Directive.prototype = {
    _bind() {
        var def = this.descriptor.def

        if (typeof def === 'function') {
            this.update = def
        } else {
            extend(this, def)
        }

        if (this.bind) {
            this.bind()
        }

        const dir = this
        if (this.update) {
            this._update = function (value, oldVal) {
                dir.update(value, oldVal)
            }
        }
        const watcher = this._watcher = new Watcher(this.vm, this.expression, this._update)

        if (this.update) {
            this.update(watcher.value)
        }
    },

    set(value) {
        this._watcher.set(value)
    }
}