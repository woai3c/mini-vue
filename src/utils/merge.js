import {hasOwn, extend, isArray, set} from './index.js'

const hyphenateRE = /([^-])([A-Z])/g

function hyphenate(str) {
    return str.replace(hyphenateRE, '$1-$2').replace(hyphenateRE, '$1-$2').toLowerCase()
}

const strats = Object.create(null)

function guardArrayAssets(assets) {
    if (isArray(assets)) {
        const res = {}
        let i = assets.length
        let asset
        while (i--) {
            asset = assets[i]
            id = typeof asset === 'function' ? asset.options && asset.options.name || asset.id : asset.name || asset.id
            if (id) {
                res[id] = asset
            }
        }
        return res
    }
  
  return assets
}

// 合并参数
export function mergeOptions(parent, child, vm) {
    guardComponents(child)
    const options = {}
    let key

    if (child['extends']) {
        parent = typeof child['extends'] === 'function' ? mergeOptions(parent, child['extends'].options, vm) : mergeOptions(parent, child['extends'], vm)
    }

    if (child.mixins) {
        for (var i = 0, l = child.mixins.length; i < l; i++) {
            const mixin = child.mixins[i]
            const mixinOptions = mixin.prototype instanceof MiniVue ? mixin.options : mixin
            parent = mergeOptions(parent, mixinOptions, vm)
          
        }
    }

    for (key in parent) {
        mergeField(key)
    }

    for (key in child) {
        if (!hasOwn(parent, key)) {
             mergeField(key)
        }
    }

    function mergeField(key) {
        const strat = strats[key] || defaultStrat
        options[key] = strat(parent[key], child[key], vm, key)
    }
    return options
}

function guardComponents(options) {
    if (options.components) {
        const components = options.components
        const keys = Object.keys(components)
        keys.forEach(key => {
            components[key] = MiniVue.component(key, components[key], true)
        })
    }
}

function mergeData(to, from) {
    let key, toVal, fromVal
    for (key in from) {
        toVal = to[key]
        fromVal = from[key]
        if (!hasOwn(to, key)) {
            set(to, key, fromVal)
        } else if (isObject(toVal) && isObject(fromVal)) {
            mergeData(toVal, fromVal)
        }
    }
    return to
}

strats.data = function (parentVal, childVal, vm) {
    if (!vm) {
        if (!childVal) {
          return parentVal
        }
        if (typeof childVal !== 'function') {
            return parentVal
        }
        if (!parentVal) {  
            return childVal
        }

        return function mergedDataFn() {
            return mergeData(childVal.call(this), parentVal.call(this))
        }
    } else if (parentVal || childVal) {
        return function mergedInstanceDataFn() {
            const instanceData = typeof childVal === 'function' ? childVal.call(vm) : childVal
            const defaultData = typeof parentVal === 'function' ? parentVal.call(vm) : undefined
            if (instanceData) {
                return mergeData(instanceData, defaultData)
            } else {
                return defaultData
            }
        }
    }
}



strats.el = function (parentVal, childVal, vm) {
    if (!vm && childVal && typeof childVal !== 'function') {
        return
    }
    const ret = childVal || parentVal
    return vm && typeof ret === 'function' ? ret.call(vm) : ret
}



strats.init = 
strats.created = 
strats.ready = 
strats.attached = 
strats.detached = 
strats.beforeCompile = 
strats.compiled = 
strats.beforeDestroy = 
strats.destroyed = 
strats.activate = function (parentVal, childVal) {
    return childVal ? parentVal ? parentVal.concat(childVal) : isArray(childVal) ? childVal : [childVal] : parentVal
}


function mergeAssets(parentVal, childVal) {
    const res = Object.create(parentVal || null)
    return childVal ? extend(res, guardArrayAssets(childVal)) : res
}

['component', 'directive', 'elementDirective', 'filter', 'transition', 'partial'].forEach(function (type) {
    strats[type + 's'] = mergeAssets
})

strats.watch = strats.events = function (parentVal, childVal) { 
    if (!childVal) return parentVal
    if (!parentVal) return childVal
    const ret = {}
    extend(ret, parentVal)
    for (var key in childVal) {
        let parent = ret[key]
        let child = childVal[key]
        if (parent && !isArray(parent)) {
            parent = [parent]
        }
        ret[key] = parent ? parent.concat(child) : [child]
    }

    return ret
}


strats.props = strats.methods = strats.computed = function (parentVal, childVal) {
    if (!childVal) return parentVal
    if (!parentVal) return childVal
    const ret = Object.create(null)
    extend(ret, parentVal)
    extend(ret, childVal)
    return ret
}

function defaultStrat(parentVal, childVal) {
    return childVal === undefined ? parentVal : childVal
}

const specialCharRE = /[^\w\-:\.]/

// 合并属性
export function mergeAttrs(from, to) {
    const attrs = from.attributes
    let i = attrs.length
    let name, value
    while (i--) {
        name = attrs[i].name
        value = attrs[i].value.trim()
        if (!to.hasAttribute(name) && !specialCharRE.test(name)) {
            to.setAttribute(name, value)
        } else if (name === 'class') {
            value.split(/\s+/).forEach(cls => {
                addClass(to, cls)
            })
        }
    }
    
}