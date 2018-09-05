import handlers from './handlers.js'
import {toArray, replace} from './utils.js'

const onRe = /^(v-on:|@)/
const dirAttrRE = /^v-([^:]+)(?:$|:(.*)$)/
const bindRe = /^(v-bind:|:)/
const tagRE = /\{\{\{((?:.|\n)+?)\}\}\}|\{\{((?:.|\n)+?)\}\}/g
const dirs = []

export default function compile(vm, el) {
    compileNode(vm, el)
    if (el.hasChildNodes()) {
        compileNodeList(el.childNodes)
    }
    dirs.forEach(dir => {
        vm.bindDir(dir)
    })

    vm._directives.forEach(dir => {
        dir._bind()
    })
}

function compileNode(node) {
    const type = node.nodeType
    if (type == 1) {
        compileElement(node)
    } else if (type == 3) {
        compileTextNode(node)
    }
}


function compileNodeList(nodes) {
    nodes.forEach(node => {
        compileNode(node)
        if (node.hasChildNodes()) {
            compileNodeList(node.childNodes)
        }
    })
}

function compileElement(node) {
    if (node.hasAttributes()) {
        let matched
        const attrs = toArray(node.attributes)
        attrs.forEach((attr) => {
            const name = attr.name.trim()
            const value = attr.value.trim()
            if (onRe.test(name)) {
                node.removeAttribute(name)
                dirs.push({
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
                dirs.push({
                    el: node,
                    arg: name.replace(bindRe, ''),
                    name: 'bind',
                    attr: name,
                    expression: value,
                    def: handlers.bind
                })
            } else if (matched = name.match(dirAttrRE)) {
                node.removeAttribute(name)
                dirs.push({
                    el: node,
                    arg: undefined,
                    name: name.replace(/^v-/, ''),
                    attr: name,
                    expression: value,
                    def: handlers[matched[1]]
                })
            }
        })
    }
}

function compileTextNode(node) {
    const tokens = parseText(node.wholeText)
    if (!tokens) {
        return
    }

    const frag = document.createDocumentFragment()
    let el
    tokens.forEach(token => {
        el = token.tag ? processTextToken(token, node) : document.createTextNode(token.value)
        frag.appendChild(el)

        if (token.tag) {
            dirs.push(token.descriptor)
        }
    })

    replace(node, frag)
}

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