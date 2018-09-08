import handlers from './handlers.js'
import Directive from './directives.js'
import {toArray, replace, getAttr} from './utils.js'

const onRe = /^(v-on:|@)/
const dirAttrRE = /^v-([^:]+)(?:$|:(.*)$)/
const bindRe = /^(v-bind:|:)/
const tagRE = /\{\{\{((?:.|\n)+?)\}\}\}|\{\{((?:.|\n)+?)\}\}/g
// 指令描述符容器
const des = []
// 用来判断当前是否在解析指令
let pending = false

export default function compile(vm, el) {
    // 如果当前节点不是v-for指令 则继续解析子节点
    if (!compileNode(el)) {
        if (el.hasChildNodes()) {
            compileNodeList(el.childNodes)
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
            dir = new Directive(descriptor, vm)          
            dir._bind()           
            vm._directives.push(dir)  
        }
        pending = false
        // JS主线程执行完再进行废弃指令回收
        setTimeout(() => {
            teardown(vm)
        }, 0)
    }
}

function compileNode(node) {
    const type = node.nodeType
    if (type == 1) {
        return compileElement(node)
    } else if (type == 3) {
        return compileTextNode(node)
    }
}


function compileNodeList(nodes) {
    nodes.forEach(node => {
        if (!compileNode(node)) {
            if (node.hasChildNodes()) {
                compileNodeList(node.childNodes)
            }
        }
    })
}

function compileElement(node) {
    if (node.hasAttributes()) {
        let matched
        let isFor = false
        const attrs = toArray(node.attributes)
        attrs.forEach((attr) => {
            const name = attr.name.trim()
            const value = attr.value.trim()

            if (onRe.test(name)) {
                node.removeAttribute(name)
                des.push({
                    el: node,
                    arg: name.replace(onRe, ''),
                    name: 'on',
                    attr: name,
                    expression: value,
                    def: handlers.on
                })

            } else if (bindRe.test(name)) {
                handlers[matched[1]]
                node.removeAttribute(name)
                des.push({
                    el: node,
                    arg: name.replace(bindRe, ''),
                    name: 'bind',
                    attr: name,
                    expression: value,
                    def: handlers.bind
                })

            } else if (matched = name.match(dirAttrRE)) {             
                if (name !== 'v-else') {
                    node.removeAttribute(name)
                    des.push({
                        el: node,
                        arg: undefined,
                        name: name.replace(/^v-/, ''),
                        attr: name,
                        expression: value,
                        def: handlers[matched[1]]
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

function compileTextNode(node) {
    const tokens = parseText(node.nodeValue)
    if (!tokens) {
        return
    }

    const frag = document.createDocumentFragment()
    let el
    tokens.forEach(token => {
        el = token.tag ? processTextToken(token, node) : document.createTextNode(token.value)
        frag.appendChild(el)
        if (token.tag) {
            des.push(token.descriptor)
        }
    })
    replace(node, frag)
}
// 将文档节点解释为TOKEN
function parseText(text) {
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

function processTextToken(token) {
    const el = document.createTextNode(' ')
    if (token.descriptor) {
        return
    }

    token.descriptor = {
        el,
        name: 'text',
        def: handlers.text,
        expression: token.value.trim()
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

// 删除已经用不上的指令 如果不是v-if v-for 并且不在文档中的DOM元素删除并和相应绑定的指令 观察者函数删除
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