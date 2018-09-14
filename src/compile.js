import Directive from './directive.js'
import {toArray, replace, getAttr, getBindAttr} from './utils.js'
import {defineReactive} from './observer.js'

// 指令描述符容器
const des = []
// 用来判断当前是否在解析指令
let pending = false

export function compile(vm, el) {
    // 如果当前节点不是v-for指令 则继续解析子节点
    if (!compileNode(el, vm)) {
        if (el.hasChildNodes()) {
            compileNodeList(el.childNodes, vm)
        }
    }
    
    // 当前在解析指令 如果有新的指令 则加到des数组后面 数组会按顺序执行描述符 包括新的描述符
    // 假如有5个描述符 当前执行到第2个 如果有新的 则push进数组 
    if (!pending) {
        let dir, descriptor
        pending = true
        sortDescriptors(des)
        while (des.length) {       
            descriptor = des.shift()
            dir = new Directive(descriptor, descriptor.vm)  
            dir._bind()          
            descriptor.vm._directives.push(dir)  
        }
        pending = false
        vm._callHook('compiled')
        // JS主线程执行完再进行废弃指令回收
        setTimeout(() => {
            teardown(vm)
            vm._callHook('destroyed')
        }, 0)
    }
}

function compileNode(node, vm) {
    const type = node.nodeType
    if (type == 1) {
        return compileElement(node, vm)
    } else if (type == 3) {
        return compileTextNode(node, vm)
    }
}


function compileNodeList(nodes, vm) {
    nodes.forEach(node => {
        if (!compileNode(node, vm)) {           
            if (node.hasChildNodes()) {              
                compileNodeList(node.childNodes, vm)
            }
        }
    })
}

const onRe = /^(v-on:|@)/
const dirAttrRE = /^v-([^:]+)(?:$|:(.*)$)/
const bindRe = /^(v-bind:|:)/
const tagRE = /\{\{\{((?:.|\n)+?)\}\}\}|\{\{((?:.|\n)+?)\}\}/g
const commonTagRE = /^(div|p|span|img|a|b|i|br|ul|ol|li|h1|h2|h3|h4|h5|h6|code|pre|table|th|td|tr|form|label|input|select|option|nav|article|section|header|footer|button|textarea)$/i
const reservedTagRE = /^(slot|partial|component)$/i

function compileElement(node, vm) {   
    const directives = vm.$options.directives
    const tag = node.tagName.toLowerCase() 
    if (!commonTagRE.test(tag) && !reservedTagRE.test(tag)) {    
        if (vm.$options.components[tag]) {
            des.push({
                vm,
                el: node,
                name: 'component',
                expression: tag,
                def: directives.component,
                modifiers: {
                    literal: true
                }
            })
        } 
    } else if (tag === 'slot') {
        des.push({
            vm,
            el: node,
            arg: undefined,
            name: 'slot',
            attr: undefined,
            expression: '',
            def: directives.slot
        })
    } else if (node.hasAttributes()) {       
        let matched
        let isFor = false
        const attrs = toArray(node.attributes)
        attrs.forEach((attr) => {       
            const name = attr.name.trim()
            const value = attr.value.trim()
            if (onRe.test(name)) {
                node.removeAttribute(name)
                des.push({
                    vm,
                    el: node,
                    arg: name.replace(onRe, ''),
                    name: 'on',
                    attr: name,
                    expression: value,
                    def: directives.on
                })
            } else if (bindRe.test(name)) {
                node.removeAttribute(name)
                // 针对过滤器
                const values = value.split('|')
                const temp = {
                    vm,
                    el: node,
                    arg: name.replace(bindRe, ''),
                    name: 'bind',
                    attr: name,
                    def: directives.bind
                }

                if (value.length > 1) {
                    const expression = values.shift()
                    const filters = []
                    values.forEach(value => {
                        filters.push({
                            name: value.trim()
                        })
                    })

                    temp.expression = expression
                    temp.filters = filters
                } else {
                    temp.expression = value
                }

                des.push(temp)
            } else if (matched = name.match(dirAttrRE)) {             
                if (name == 'v-text') {
                    node.removeAttribute(name)
                    const values = value.split('|')
                    const temp = {
                        vm,
                        el: node,
                        arg: name.replace(bindRe, ''),
                        name: 'text',
                        attr: name,
                        def: directives.text
                    }

                    if (value.length > 1) {
                        const expression = values.shift()
                        const filters = []
                        values.forEach(value => {
                            filters.push({
                                name: value.trim()
                            })
                        })

                        temp.expression = expression
                        temp.filters = filters
                    } else {
                        temp.expression = value
                    }

                    des.push(temp)
                } else if (name !== 'v-else') {
                    node.removeAttribute(name)
                    
                    des.push({
                        vm,
                        el: node,
                        arg: undefined,
                        name: name.replace(/^v-/, ''),
                        attr: name,
                        expression: value,
                        def: directives[matched[1]]
                    })
                }

                if (name == 'v-for') {
                    isFor = true
                }
            }
        })
        return isFor
    }
}

function compileTextNode(node, vm) {
    const tokens = parseText(node.nodeValue, vm)
    if (!tokens) {
        return
    }

    const frag = document.createDocumentFragment()
    let el
    tokens.forEach(token => {
        el = token.tag ? processTextToken(token, vm) : document.createTextNode(token.value)
        frag.appendChild(el)
        if (token.tag) {
            des.push(token.descriptor)
        }
    })
    replace(node, frag)
}
// 将文档节点解释为TOKEN
function parseText(text, vm) {
    let index = 0
    let lastIndex = 0
    let match
    const tokens = []

    while (match = tagRE.exec(text)) {
        index = match.index

        if (index > lastIndex) {
            tokens.push({
                value: text.slice(lastIndex, index),
            })
        }

        tokens.push({
            value: match[2],
            tag: true
        })
        lastIndex = index + match[0].length
    }

    if (lastIndex < text.length) {
        tokens.push({
            value: text.slice(lastIndex)
        })
    }
    return tokens
}

function processTextToken(token, vm) {
    const directives = vm.$options.directives
    const el = document.createTextNode(' ')
    if (token.descriptor) {
        return
    }
    // 针对过滤器
    const values = token.value.split('|')
    token.descriptor = {
        vm,
        el,
        name: 'text',
        def: directives.text,
    }

    if (values.length > 1) {
        const value = values.shift()
        const filters = []
        
        values.forEach(value => {
            filters.push({
                name: value.trim()
            })
        })

        token.descriptor.expression = value.trim()
        token.descriptor.filters = filters
    } else {
        token.descriptor.expression = token.value.trim()
    }

    return el
}

// 整理指令优先级 优先高的先执行 例如v-for
function sortDescriptors(des) {
    des.forEach(d => {
        if (!d.def.priority) {
            d.def.priority = 1000
        }
    })
    des.sort((a, b) => {
        return b.def.priority - a.def.priority
    })
}

// 删除已经用不上的指令 如果不是v-if、v-for 并且不在文档中的DOM元素删除并和相应绑定的指令、观察者函数删除
function teardown(vm) {
    const body = document.body
    const contains = body.contains
    const dirs = vm._directives
    let attr
    const temp = []
    let dir
    // document.body.contains判断DOM是否在文档中
    while (dirs.length) {
        dir = dirs.shift()
        attr = dir.descriptor.attr
        // 如果DOM不在文档中 并且指令不是v-for v-if则删除指令
        if (!contains.call(body, dir.el) && attr !== 'v-for' && attr !== 'v-if') {
            dir._teardown()
        } else {
            temp.push(dir)
        }
    }
    
    vm._directives = [...temp]
    temp.length = 0
}


export function compileProps(vm, el, propsOptions) {
    const directives = vm.$options.directives
    const props = []
    let prop, value, name
    const keys = Object.keys(propsOptions)
    keys.forEach(key => {
        name = propsOptions[key]
        prop = {
            name,
            path: name
        }
        if ((value = getBindAttr(el, name)) !== null) {
            // 动态绑定
            prop.dynamic = true
            prop.raw = prop.parentPath = value
        } else if ((value = getAttr(el, name)) !== null) {
            // 静态绑定
            prop.raw = value
        }
        props.push(prop)
    })

    vm._props = {}
    props.forEach(prop => {
        let {path, raw, options} = prop
        vm._props[path] = prop
        // 动态绑定则建一个指令 否则直接渲染
        if (prop.dynamic) {
            if (vm._context) {
                des.push({
                    vm,
                    name: 'prop',
                    def: directives.prop,
                    prop,
                })
            }
        } else {
            defineReactive(vm, prop.path, prop.raw)
        }
    })
}