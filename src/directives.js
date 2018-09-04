export default function Directive(descriptor, vm, el) {
    this.descriptor = descriptor
    this.expression = descriptor.expression
    this.vm = vm
    this.el = el
}

Directive.prototype = {
    bind() {
        this.update = this.descriptor.def
        if (this.bind) {
            this.bind()
        }

        const dir = this
        if (this.update) {
            this._update = function (val, oldVal) {
                dir.update(val, oldVal)
            }
        }
        const watcher = this._watcher = new Watcher(this.vm, this.expression, this._update)

        if (this.update) {
            this.update(watcher.value)
        }
    }
}