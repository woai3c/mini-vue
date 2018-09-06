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
        var l = arguments.length
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
    return node.getAttribute(_attr)
}

export function remove(el) {
    el.parentNode.removeChild(el)
}

export function insertNode(newNode, oldNode) {
    oldNode.parentNode.insertBefore(newNode, oldNode)
}