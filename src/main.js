import observe from './observer.js'
import {Watcher, nextTick} from './watcher.js'
import {toArray, isArray, addClass, extend, hasOwn, replace, query, bind, 
        firstWordtoUpper, toUpper, trimNode, isTrimmable, 
        mergeOptions, mergeAttrs} from './utils'
import {compile, compileProps} from './compile.js'
import directives from './directives.js'
import Dep from './dep.js'

// MiniVue构造函数 参数是一个对象
function MiniVue(options) {
    this._init(options)
}

MiniVue.options = {
    directives,
    components: {},
    filters: {},
}

// 全局方法

// 混入对象
MiniVue.mixin = function(mixin) {
    this.options = mergeOptions(this.options, mixin)
}

// 注册全局指令
MiniVue.directive = function(dirName, options) {
    this.options.directives[dirName] = options
}

// 使用插件
MiniVue.use = function (plugin) {
    if (plugin.installed) {
        return
    }
    const args = toArray(arguments, 1)
    args.unshift(this)

    if (typeof plugin.install === 'function') {
        plugin.install.apply(plugin, args)
    } else {
        plugin.apply(null, args)
    }
    plugin.installed = true
    return this
}

MiniVue.cid = 0
// 生成子组件构造函数
MiniVue.extend = function(extendOptions) {
    
    extendOptions = extendOptions || {}
    const Super = this
    let isFirstExtend = Super.cid === 0
    if (isFirstExtend && extendOptions._Ctor) {
        return extendOptions._Ctor
    }

    const name = extendOptions.name || Super.options.name
    
    const Sub = new Function('return function ' + classify(name) + ' (options) { this._init(options) }')()
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.options = mergeOptions(Super.options, extendOptions)
    Sub['super'] = Super
    Sub.extend = Super.extend
    Sub.component = Super.component

    if (name) {
        Sub.options.components[name] = Sub
    }

    if (isFirstExtend) {
        extendOptions._Ctor = Sub
    }

    return Sub
}

// 全局 生成组件
MiniVue.component = function(id, definition, isPrivate) {
    if (!definition) {
        return this.options['components'][id]
    } else {
        if (!definition.name) {
            definition.name = id
        }

        definition = MiniVue.extend(definition)

        if (!isPrivate) {
            this.options['components'][id] = definition
        }
  
        return definition
    }
}

// 注册过滤器
MiniVue.filter = function(id, fn) {
    this.options.filters[id] = fn
}

// 原型方法
MiniVue.prototype = {
    constructor: MiniVue,

    // 初始化数据和方法
    _init(options) {
        this.$el = null
        this.$parent = options.parent
        // MiniVue实例
        this._isMiniVue = true
        // 根组件
        this.$root = this.$parent? this.$parent.$root : this
        // 存放子组件
        this.$children = []

        // 存放观察者实例
        this._watchers = []

        // 存放事件
        this._events = {}

        // 存放指令
        this._directives = []

        // 父级上下文对象
        this._context = options._context || this.$parent

        if (this.$parent) {
            this.$parent.$children.push(this)
        }
        
        // 合并参数
        options = this.$options = mergeOptions(this.constructor.options, options, this)
        this._callHook('init')
        
        this._initMixins()
        this._initComponents()    
        this._initProps()      
        this._initMethods()     
        this._initData()      
        this._initWatch()
        this._initComputed()
        this._initEvents()

        this._callHook('created')
        if (options.el) {
            this._compile()
        }
    },
    // 局部mixin
    _initMixins() {
        let options = this.$options
        if (options.mixin) {
            this.$options = mergeOptions(options, options.mixin)         
        }
    },
    // 局部componet
    _initComponents() {
        const components = this.$options.components
        const keys = Object.keys(components)
        keys.forEach(key => {
            components[key] = MiniVue.component(key, components[key], true)
        })
    },

    _initProps() {
        const options = this.$options
        let el = options.el
        const props = options.props
        el = options.el = query(el)

        if (props && el.nodeType == 1) {
            compileProps(this, el, props)
        }
    },

    _initMethods() {
        const methods = this.$options.methods? this.$options.methods : {}
        const keys = Object.keys(methods)
        // 将methods上的方法赋值到vm实例上
        keys.forEach(key => {
            // 将方法this指向绑定到vm上
            this[key] = bind(methods[key], this)
        })
    },

    _initData() {
        
        let data = this.$options.data
        data = this._data = typeof data === 'function'? data() : data || {}
        const keys = Object.keys(data)
   
        // 对每一个key实现代理 即可通过vm.msg来访问vm._data.msg
        keys.forEach(key => {
            this._proxy(this, '_data', key)
        })
        // 监听数据
        observe(this._data)
    },

    _initWatch() {
        if (this.$options.watch) {
            const watch = this.$options.watch
            const keys = Object.keys(watch)
            keys.forEach(key => {
                this.$watch(key, watch[key])
            })
        }
    },

    _initComputed() {
        if (this.$options.computed) {
            const computed = this.$options.computed
            const keys = Object.keys(computed)
            keys.forEach(key => {
                Object.defineProperty(this, key, {
                    enumerable: true,
                    configurable: true,
                    get: makeComputedGetter(computed[key], this),
                    set: noop
                })
            })
        }
    },

    _initEvents() {
        const options = this.$options
        // 如果是一个子组件 则检查组件上是否绑定了事件
        if (options._asComponent) {
            registerComponentEvents(this, options.el)
        }
    },

    _proxy(target, sourceKey, key) {
        const sharedPropertyDefinition = {
            enumerable: true,
            configurable: true
        }

        // 实际上读取和返回的是vm._data上的数据
        sharedPropertyDefinition.get = function proxyGetter () {
            return this[sourceKey][key]
        }
        sharedPropertyDefinition.set = function proxySetter (val) {
            this[sourceKey][key] = val
        }
        Object.defineProperty(target, key, sharedPropertyDefinition)
    },

    // 当为对象添加属性或修改数组的值时可用这个方法 能实时更新
    $set(obj, key, val) {
        this[obj][key] = val
        vm[obj].__ob__.dep.notify()
    },
    // 当为对象删除属性或删除数组的值时可用这个方法 能实时更新
    $delete(obj, key) {
        if (isArray(this[obj])) {
            this[obj].splice(key, 1)
        } else {
            delete this[obj][key]
            vm[obj].__ob__.dep.notify()
        }
    },

    $watch(expOrFn, callback, options) {
        new Watcher(this, expOrFn, callback, options)
    },

    $on(event, fn) {
        (this._events[event] || (this._events[event] = [])).push(fn)
    },

    $off(event, fn) {
        const cbs = this._events[event]
        if (!fn) {
            cbs.length = 0
            return
        }
        let l = cbs.length
        while (l--) {
            let cb = cbs[l]
            if (cb === fn) {
                cbs.splice(l, 1)
            }
        }
    },

    $emit(event) {
        const cbs = this._events[event]
        const args = toArray(arguments, 1)
        if (!cbs) {
            this._events[event] = []
            return
        }
        if (args.length > 1) {
            cbs.forEach(cb => {
                cb.apply(this, args)
            })
        } else {
            cbs.forEach(cb => {
                cb.call(this, args[0])
            })
        }
    },

    $once(event, fn) {
        const vm = this
        function on() {
            vm.$off(event, on)
            fn.apply(this, arguments)
        }
        this.$on(event, on)
    },

    $nextTick: nextTick,

    // 过滤器
    _applyFilters(value, filters) {
        const filtersObj = this.$options.filters? this.$options.filters : {}
        let handler
        filters.forEach(filter => {
            handler = filtersObj[filter.name]
            if (handler) {
                value = handler.call(this, value)
            }
        })
        return value
    }, 

    // 生命周期钩子函数
    _callHook(hook) {
        const handlers =this.$options[hook]

        if (typeof handlers === 'function') {
            handlers.call(this)
        } else if (handlers) {
            handlers.forEach(handler => {
                handler.call(this)
            })
        }
    },

    // 解析DOM
    _compile() {
        const options = this.$options
        options.el = this.$el = query(options.el)
        const tempEl = transclude(this.$el, options)
        if (tempEl) {
            this.$el = tempEl
            options.el.innerHTML = ''
            replace(options.el, this.$el)
        }
        // 解析slot
        resolveSlots(this, options._content)
        this._callHook('beforeCompile')
        compile(this, this.$el)
    }
}

window.MiniVue = MiniVue


// 空操作
function noop() {}

// 生成计算属性getter
function makeComputedGetter(getter, vm) {
    const watcher = new Watcher(vm, getter, null, {
        lazy: true
    })
    return function computedGetter() {
        if (watcher.dirty) {
            watcher.evaluate()
        }
        if (Dep.target) {
            watcher.depend()
        }
        return watcher.value
    }
}


// 将el内容替换为模板内容
function transclude(el, options) {
    if (options.template) {
        // 提取组件里的slot
        options._content = extractContent(el)
        
        let template = options.template.trim()
        const node = document.createElement('div')
        node.innerHTML = template
        let frag = extractContent(node, true)
        frag = frag.cloneNode(true)

        const replacer = frag.firstChild
        mergeAttrs(el, replacer)
        return replacer
    }
}

const classifyRE = /(?:^|[-_\/])(\w)/g

function classify(str) {
    return str.replace(classifyRE, toUpper)
}

function registerComponentEvents(vm, el) {
    const onRe = /^(v-on:|@)/
    const attrs = toArray(el.attributes)

    let name, value, handler

    attrs.forEach(attr => {
        name = attr.name.trim()
        value = attr.value.trim()
        if (onRe.test(name)) {
            name = name.replace(onRe, '')
            value += '.apply(this, this.$arguments)'
            handler = statementHandler(vm._context, value)
            vm.$on(name, handler)
        }
    })
}

function statementHandler(parent, value) {
    const get = new Function('vm', 'return vm.' + value)
    return function() {
        parent.$arguments = toArray(arguments)
        const result = get.call(parent, parent)
        parent.$arguments = null
        return result
    }
}


// 提取元素里面的内容
function extractContent(el, asFragment) {
    let child, rawContent
    if (el.hasChildNodes()) { 
        trimNode(el)
        rawContent = asFragment ? document.createDocumentFragment() : document.createElement('div')

        while (child = el.firstChild) {
            rawContent.appendChild(child)
        }
    }
    return rawContent
}

// 解析slot
function resolveSlots(vm, content) {
    if (!content) {
        return
    }
    
    const contents = vm._slotContents = Object.create(null)
    let name
    toArray(content.children).forEach(el => {
        if (name = el.getAttribute('slot')) {
            (contents[name] || (contents[name] = [])).push(el)
        }
    })
    
    // 有名字的slot
    for (name in contents) {
        contents[name] = extractFragment(contents[name], content)
    }

    // 没名字的slot
    if (content.hasChildNodes()) {
        const nodes = content.childNodes
        // 空文本节点直接路过
        if (nodes.length === 1 && nodes[0].nodeType === 3 && !nodes[0].data.trim()) {
            return
        }
        contents['default'] = extractFragment(content.childNodes, content)
        
    }
}

function extractFragment(nodes, parent) {
    const frag = document.createDocumentFragment()
    let div, childNodes
    nodes = toArray(nodes)
    
    nodes.forEach(node => {
        // 非空文本节点
        if (!isTrimmable(node)) {
            parent.removeChild(node)
            div = document.createElement('div')
            div.innerHTML = node.innerHTML
            trimNode(div)
            
            childNodes = toArray(div.childNodes)
            childNodes.forEach(child => {
                frag.appendChild(child)
            })
        }
    })
    return frag
}

