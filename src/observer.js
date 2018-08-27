import Dep from './dep.js'

export function Observer(obj) {
    this.walk(obj)
}


Observer.prototype = {
    walk(obj) {
        const keys = Object.keys(obj) 
        for (let i = 0, len = keys.length; i < len; i++) {
            defineReactive(obj, keys[i], obj[keys[i]])
        }
    }
}

export function defineReactive(obj, key, val) {
    const dep = new Dep()

    if (typeof val === 'object') {
        new Observer(val)
    }

    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get() {
            if (Dep.target) {
                dep.depend()
            }
            return val
        },
        set(newVal) {
            if (val === newVal) {
                return
            }
            val = newVal
            if (typeof val === 'object') {
                new Observer(val)
            }
            dep.notify()
        }
    })
}
