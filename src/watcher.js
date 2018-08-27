import Dep from './dep.js'

let uid = 0

export function Watcher(vm, expOrFn, callback) {
    vm._watchers.push(this) 
    this.id = uid++
    this.vm = vm   
    this.deps = []
    this.depIds = new Set()
    this.cb = callback

    this.getter = () => vm[expOrFn]
    this.setter = (val) => {
        vm[expOrFn] = val
    }

    this.value = this.get()
}

Watcher.prototype = {
    get() {
        Dep.target = this
        const value = this.getter()
        Dep.target = null
        return value
    },

    set(val) {
        this.setter(val)
    },

    update() {
        this.run()
    }

    run() {
        const value = this.get()
        const oldValue = this.value

        if (value !== oldValue) {
            this.cb.call(this.vm, value, oldValue)
        }
    },

    addDep() {
        if (!this.depIds.has(dep.id)) {
            this.deps.push(dep)
            this.depIds.add(dep.id)
            dep.addSub(this)
        }
    }
}