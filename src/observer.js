import Dep from './dep.js'
import {def, hasOwn} from './utils.js'

const isArray = Array.isArray
const arrayProto = Array.prototype
const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
]


methodsToPatch.forEach(function (method) {
    const original = arrayProto[method]
    def(arrayMethods, method, function mutator(...args) {
        const result = original.apply(this, args)
        const ob = this.__ob__
        let inserted
        switch (method) {
            case 'push':
            case 'unshift':
                inserted = args
                break
            case 'splice':
                inserted = args.slice(2)
                break
        }
        if (inserted) {
            ob.observeArray(inserted)
        }
        ob.dep.notify()
        return result
    })
})

export default function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return
    }
    let ob
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        ob = value.__ob__
    } else  {
        ob = new Observer(value)
    }

    return ob
}

// 对数据进行监听
function Observer(value) {
    this.value = value
    this.dep = new Dep()
    def(value, '__ob__', this)
    if (isArray(value)) {
        value.__proto__ = arrayMethods
        this.observeArray(value)
    } else {
        this.walk(value)
    }
}


Observer.prototype = {
    walk(obj) {
        const keys = Object.keys(obj) 
        for (let i = 0, len = keys.length; i < len; i++) {
            defineReactive(obj, keys[i], obj[keys[i]])
        }
    },

    observeArray(arry) {
        arry.forEach(item => {
            observe(item)
        })
    }
}

function defineReactive(obj, key, val) {
    const dep = new Dep()

    // 递归监听
    let childOb = observe(val)

    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get() {      
            // 收集对应的观察者对象
            if (Dep.target) {
                dep.depend()
                if (childOb) {
                    childOb.dep.depend()
                }
                if (isArray(val)) {
                    for (let e, i = 0, l = val.length; i < l; i++) {
                        e = val[i]
                        e && e.__ob__ && e.__ob__.dep.depend()
                    }
                }
            }
            return val
        },
        set(newVal) {
            if (val === newVal) {
                return
            }
            val = newVal
            // 递归监听
            childOb = observe(newVal)
            // 触发更新
            dep.notify()
        }
    })
}
