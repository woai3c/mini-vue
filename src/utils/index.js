import {mergeOptions, mergeAttrs} from './merge.js'

export {mergeOptions, mergeAttrs}

export function toArray(arry, index) {
    index = index || 0
    return [...arry].slice(index)
}

export function replace(oldNode, newNode) {
    const parent = oldNode.parentNode;
    if (parent) {
        parent.replaceChild(newNode, oldNode)
    }
}

export function extend(to, from) {
    const keys = Object.keys(from)
    let i = keys.length
    while (i--) {
        to[keys[i]] = from[keys[i]]
    }
    return to
}

export function on(el, event, cb, useCapture) {
    el.addEventListener(event, cb, useCapture)
}

export function off(el, event, cb) {
    el.removeEventListener(event, cb)
}

export function bind(fn, ctx) {
    return function (a) {
        let l = arguments.length
        return l ? l > 1 ? fn.apply(ctx, arguments) : fn.call(ctx, a) : fn.call(ctx)
    }
}

export function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true
    })
}

export function hasOwn(obj, key) {
    return hasOwnProperty.call(obj, key)
}

export function isObject(obj) {
    return obj !== null && typeof obj === 'object'
}

const isArray = Array.isArray
export {isArray}

export function getAttr(node, _attr) {
    const val = node.getAttribute(_attr)
    if (val !== null) {
        node.removeAttribute(_attr)
    }
    return val
}

export function getBindAttr(node, name) {
    let val = getAttr(node, ':' + name)
    if (val === null) {
        val = getAttr(node, 'v-bind:' + name)
    }
    return val
}

export function remove(el) {
    el.parentNode.removeChild(el)
}

export function insert(newNode, oldNode) {
    oldNode.parentNode.insertBefore(newNode, oldNode)
}

export function addClass(el, cls) {
    el.classList.add(cls)
}

export function query(el) {
    return typeof el === 'string' ? document.querySelector(el) : el;
}

export function makeGetterFn(body) {
    return new Function('vm', 'return vm.' + body)
}

export function firstWordtoUpper(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1)
}

// 去除空文本节点
export function trimNode(node) {
    let child
    while ((child = node.firstChild, isTrimmable(child))) {
        node.removeChild(child)
    }
    while ((child = node.lastChild, isTrimmable(child))) {
        node.removeChild(child)
    }
}

// 是否为空文本节点
export function isTrimmable(node) {
    return node && (node.nodeType === 3 && !node.data.trim() || node.nodeType === 8)
}

export function toUpper(_, c) {
    return c ? c.toUpperCase() : ''
}

export function set(obj, key, val) {
    if (hasOwn(obj, key)) {
        obj[key] = val
        return
    }
    if (obj._isMiniVue) {
        set(obj._data, key, val)
        return
    }
    const ob = obj.__ob__
    if (!ob) {
        obj[key] = val
        return
    }
    ob.convert(key, val)
    ob.dep.notify()
    return val
}