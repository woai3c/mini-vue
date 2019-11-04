(function(root) {

// MiniVue构造函数 参数是一个对象
function MiniVue(options) {
    this._init(options)
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

// 在数组原型上增加一点改动
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
    // 缓存原型自身的方法
    const original = arrayProto[method]
    def(arrayMethods, method, function mutator(...args) {
        // 先执行原型自身的方法
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
        // 触发依赖更新
        ob.dep.notify()
        return result
    })
})

function observe(value) {
    if (!value || typeof value !== 'object') {
        return
    }

    let ob
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        ob = value.__ob__
    } else if (!value._isMiniVue) {
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

// dep实例的ID
let uid$ = 0
// Dep.target为watcher实例
Dep.target = null

function Dep() {
    this.id = uid$++
    this.subs = []    
}

Dep.prototype = {
    depend() {
        if (Dep.target) {
            Dep.target.addDep(this)
        }
    },

    addSub(sub) {
        this.subs.push(sub)
    },

    removeSub(sub) {
        const index = this.subs.indexOf(sub)
        if (index > -1) {
            this.subs.splice(index, 1)
        }
    },

    notify() {
        this.subs.forEach(watcher => {
            watcher.update()
        })
    }
}

function Directive(descriptor, vm) {
    this.vm = vm
    this.name = descriptor.name
    this.descriptor = descriptor
    this.expression = descriptor.expression
    this.el = descriptor.el
    this.filters = descriptor.filters
    this.modifiers = descriptor.modifiers
    this.literal = this.modifiers && this.modifiers.literal
}

Directive.prototype = {
    _bind() {
        const descriptor = this.descriptor
        const def = descriptor.def
        if (typeof def === 'function') {
            this.update = def
        } else {
            extend(this, def)
        }

        // 如果指令回调对象有bind函数则执行
        if (this.bind) {
            this.bind()
        }

        if (this.literal) {
            this.update && this.update(descriptor.raw)
        } else if (this.expression) {
            const dir = this
            if (this.update) {
                this._update = function (value, oldVal) {
                    dir.update(value, oldVal)
                }
            }
            const watcher = this._watcher = new Watcher(this.vm, this.expression, this._update, {
                filters: this.filters
            })

            // 第一次更新渲染
            if (this.update) {
                this.update(watcher.value)
            }
        }
    },

    set(value) {
        this._watcher.set(value)
    },

    _teardown(i) {
        if (this.unbind) {
            this.unbind()
        }

        if (this._watcher) {
            this._watcher.teardown()
        }

        this.vm = this.el = this._watcher = null
    }
}

// watcher实例的ID 每个watcher实现的ID都是唯一的
let uid = 0

// expOrFn为表达式或一个变量名
function Watcher(vm, expOrFn, callback, options) {
    vm._watchers.push(this)
    if (options) {
        extend(this, options)
    }
    
    this.id = uid++
    this.vm = vm
    this.expression = expOrFn   
    
    // props需要用到
    this.sync = options? options.sync : false
    
    // 计算属性需要用到
    this.dirty = this.lazy

    // 存放dep实例
    this.deps = []

    // 存放dep的ID
    this.depIds = new Set()

    // 更新触发回调函数
    this.cb = callback

    if (typeof expOrFn === 'function') {    
        this.getter = expOrFn
        this.setter = undefined
    } else {
        const res = parseExpression(expOrFn)
        this.getter = res.get
        this.setter = (value) => {
            vm[expOrFn] = value
        }
    }
    // 在创建watcher实例时先取一次值
    if (this.lazy) {
        this.value = undefined
    } else {
        this.value = this.get()
    }
}

Watcher.prototype = {
    get() {
        const vm = this.vm
        // 在读取值时先将观察者对象赋值给Dep.target 否则Dep.target为空 不会触发收集依赖
        Dep.target = this
        let value =  this.getter.call(vm, vm)
        if (this.filters) {
            value = vm._applyFilters(value, this.filters)
        }
        // 触发依赖后置为空
        Dep.target = null
        return value
    },

    set(value) {
        this.setter.call(this.vm, value)
    },

    update() {
        // 触发更新后执行回调函数
        // 如果没有同步标记 则异步更新
        // 假设原来在一个函数里同时执行age++ 4次 则会执行回调函数4次 
        // 异步更新则会执行一次 优化性能
        if (this.lazy) {
            this.dirty = true
        } else if (!this.sync) {
            pushWatcher(this)
        } else {
            this.run()
        }
    },

    run() {
        const value = this.get()
        const oldValue = this.value
        this.value = value
        if (value !== oldValue || isObject(value)) {
            this.cb.call(this.vm, value, oldValue)
        }
    },

    addDep(dep) {
        // 触发依赖 dep添加观察者对象 同时观察者对象也会将dep实例添加到自己的deps里
        // 如果dep已经存在deps里 则不添加
        // dep中存放着对应的watcher watcher中也会存放着对应的dep
        // 一个dep可能有多个watcher 一个watcher也可能对应着多个dep
        if (!this.depIds.has(dep.id)) {
            this.deps.push(dep)
            this.depIds.add(dep.id)
            dep.addSub(this)
        }
    },

    teardown() {
        this.vm._watchers.splice(this.vm._watchers.indexOf(this), 1)
        let i = this.deps.length
        while (i--) {
          this.deps[i].removeSub(this)
        }
        this.vm = this.cb = this.value = null
    },

    evaluate() {
        const current = Dep.target
        this.value = this.get()
        this.dirty = false
        Dep.target = current
    },

    depend() {
        this.deps.forEach(dep => {
            dep.depend()
        })
    }
}

// 如果要对{{obj.a.b.msg}} 求值 则建一个函数 返回 vm.obj.a.b.msg 值
function parseExpression(exp) {
    exp = exp.trim()
    const res = {exp}
    res.get = makeGetterFn(exp)
    return res
}

const queue = []
let has = {}
let waiting = false

function pushWatcher(watcher) {
    const id = watcher.id
    // 如果已经有相同的watcher则不添加 防止重复更新
    if (has[id] == null) {
        has[id] = queue.length
        queue.push(watcher)
    }
    
    if (!waiting) {
        waiting = true
        nextTick(flushQueue)
    }
}

function flushQueue() {
    queue.forEach(q => {
        q.run()
    })
    
    // 重置
    waiting = false
    has = {}
    queue.length = 0
}

function nextTick(cb, ctx) {
    const p = Promise.resolve()
    p.then(() => {
        ctx? cb.call(ctx) : cb()
    })
}


// 指令描述符容器
const des = []
// 用来判断当前是否在解析指令
let pending = false

function compile(vm, el) {
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

                if (values.length > 1) {
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

                    if (values.length > 1) {
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

    // 异步替换节点是为了防止在compileNodeList中循环处理节点时 突然删掉其中一个节点而造成处理错误
    Promise.resolve().then(() => {
        replace(node, frag)
    }) 
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


function compileProps(vm, el, propsOptions) {
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

const ON = 700
const MODEL = 800
const BIND = 850
const COMPONENT = 1500
const IF = 2100
const FOR = 2200
const SLOT = 2300


const handlers = {
    text: {
        bind() {
            const self = this
            this.listener = function() {
                self.set(this.value)
            }
            on(this.el, 'input', this.listener)
        },

        update(value) {
            this.el.value = value
        },

        unbind() {
            off(this.el, 'input', this.listener)
        }
    },

    select: {
        bind() {
            const el  = this.el
            let multiple = this.multiple = el.hasAttribute('multiple')

            this.listener = () => {
                let value = getValue(el, multiple)
                this.set(value)
            }

            on(el, 'change', this.listener)

            // 初始化 对比值有没有相等 如果有就选中
            getValue(el, multiple, true)
        },

        update(value) {
            const el = this.el
            el.selectedIndex = -1
            const multi = this.multiple && isArray(value)
            const options = el.options
            let i = options.length
            let op, val
            while (i--) {
                op = options[i]
                val = op.value
                op.selected = multi? value.indexOf(val) > -1 : value == val
            }
        },

        unbind() {
            off(this.el, 'change', this.listener)
        }
    },

    radio: {
        bind() {
            const self = this
            const el = this.el
            this.listener = function() {
                self.set(this.value)
            }

            on(this.el, 'change', this.listener)
        },

        update(value) {
            const el = this.el
            el.checked = el.value == value
        },

        unbind() {
            off(this.el, 'change', this.listener)
        }
    },

    checkbox: {
        bind() {
            const self = this
            const el = this.el

            this.listener = function() {
                const isChecked = el.checked
                let val = self._watcher.get()
                if (isArray(val)) {
                    let index = val.indexOf(this.value)
                    if (isChecked) {
                        if (index == -1) {
                            self.set(val.concat(this.value))
                        }
                    } else {
                        self.set(val.slice(0, index).concat(val.slice(index + 1)))
                    }
                } else {
                    self.set(isChecked)
                } 
            }

            on(el, 'change', this.listener)
        },

        update(value) {
            const el = this.el
            if (isArray(value)) {
                el.checked = value.indexOf(el.value) > -1
            } else {
                el.checked = !!value
            }
        },

        unbind() {
            off(el, 'change', this.listener)
        }
    }
}

// 针对各种指令的回调函数
const directives = {
    // 文本节点 {{text}}
    text: {
        bind() {
            this.attr = this.el.nodeType === 3 ? 'data' : 'textContent'
        },

        update(value) {
            this.el[this.attr] = value
        }
    },
    // @ | v-on
    on: {
        priority: ON,

        update(handler) {
            if (this.handler) {
                off(this.el, this.descriptor.arg, this.handler)
            }
            this.handler = handler
            on(this.el, this.descriptor.arg, this.handler)
        },

        unbind() {
            if (this.handler) {
                off(this.el, this.descriptor.arg, this.handler)
            }
        }
    },
    // : | v-bind:
    bind: {
        priority: BIND,
        bind() {
            this.attr = this.descriptor.arg
        },

        update(value) {
            this.el.setAttribute(this.attr, value)
        }
    },
    // v-model
    model: {
        priority: MODEL,
        bind() {
            const el = this.el
            const tag = el.tagName
            let handler

            switch (tag) {
                case 'INPUT':
                    handler = handlers[el.type] || handlers.text
                    break
                case 'TEXTAREA':
                    handler = handlers.text
                    break
                case 'SELECT':
                    handler = handlers.select
                    break
                default:
                    return
            }

            handler.bind.call(this)
            this.update = handler.update
        }
    },
    // v-html
    html: {
        update(value) {
            this.el.innerHTML = value
        }
    },
    // v-show
    show: {
        update(value) {
            this.el.style.display = !!value? '' : 'none'
        }
    },
    // v-if
    // 将if和else的DOM都渲染完毕然后移除 但用引用保存起来 在原位置放一个文本节点占位 根据值true or false 来将对应的节点添加到占位节点的前面
    // 如果值变更 则将节点删除用新的替换 
    if: {
        priority: IF,
        bind() {
            const el = this.el
            const next = el.nextElementSibling
            if (next && getAttr(next, 'v-else') !== null) {
                remove(next)
                this.elseEl = next
            }
            // 占位节点
            this.anchor = document.createTextNode('')
            replace(el, this.anchor)
            this.isFirst = true
        },

        update(value) {
            if (value) {
                if (this.cloneElseEl) {
                    remove(this.cloneElseEl)
                }

                if (!this.isFirst) {
                    this.cloneEl = this.el.cloneNode(true)
                    insert(this.cloneEl, this.anchor)
                } else {
                    this.isFirst = false

                    setTimeout(() => {
                        this.cloneEl = this.el.cloneNode(true)
                        insert(this.cloneEl, this.anchor)
                    }, 0)
                }
                
            } else {
                if (this.cloneEl) {
                    remove(this.cloneEl)
                }

                if (!this.isFirst) {
                    this.cloneElseEl = this.elseEl.cloneNode(true)
                    insert(this.cloneElseEl, this.anchor)
                } else {
                    this.isFirst = false

                    setTimeout(() => {
                        this.cloneElseEl = this.elseEl.cloneNode(true)
                        insert(this.cloneElseEl, this.anchor)
                    }, 0)
                }
            }
        }
    },
    // v-for
    // 将v-for节点克隆 再根据值的长度克隆进去再compile渲染 如果值变更 则将之前的节点全部删除 重新渲染
    for: {
        priority: FOR,
        bind() {
            const re1 = /(.*) (?:in|of) (.*)/
            const re2 = /\((.*),(.*)\)/
            let match = this.expression.match(re1)
            
            if (match) {
                let match1 = match[1].match(/\((.*),(.*)\)/)
                if (match1) {
                    this.valueKey = match1[1].trim()
                    this.indexKey = match1[2].trim()
                } else {
                    this.valueKey = match[1].trim()
                }
            } else {
                this.valueKey = match[1].trim()
            }
            
            this.expression = match[2].trim()
            this.anchor = document.createTextNode('')
            this.frag = document.createDocumentFragment()
            replace(this.el, this.anchor)
        },

        update(value) {
            if (this.len) {
                while (this.len--) {
                    remove(this.anchor.previousElementSibling)
                }            
            } 
            let cloneNode
            let re1
            let re2 
            let html

            if (typeof value !== 'object') {
                console.error(`${this.expression}必须为对象或数组`)
                return
            }

            this.len = 0

            for (let key in value) {
                this.len++
                cloneNode = this.el.cloneNode(true)
                html = cloneNode.innerHTML
                if (this.valueKey) {
                    re1 = new RegExp(`{{\\s*${this.valueKey}\\s*}}`, 'g')
                    html = html.replace(re1, value[key])
                }
                if (this.indexKey) {
                    re2 = new RegExp(`{{\\s*${this.indexKey}\\s*}}`, 'g')
                    html = html.replace(re2, key)
                }
               
                cloneNode.innerHTML = html 
                this.frag.appendChild(cloneNode)
                
            }
            compile(this.vm, this.frag)
            insert(this.frag, this.anchor)
        }
    },
    component: {
        priority: COMPONENT,

        bind() {
            this.anchor = document.createTextNode('')
            replace(this.el, this.anchor)
            const child = this.build()
            insert(child.$el, this.anchor)
        },

        build() {
            this.Component = this.vm.$options.components[this.expression]
            if (!this.Component.options.template) {
                this.Component.options.template = '<div></div>'
            }
            const options = {
                name: this.expression,
                el: this.el.cloneNode(true),
                // 组件标识
                _asComponent: true,
                // 父级上下文对象
                _context: this.vm,
                parent: this.vm,
            }
            return new this.Component(options)
        }
    },

    prop: {
        bind() {
            const child = this.vm
            const parent = child._context
            const prop = this.descriptor.prop
            const childKey = prop.path
            const parentKey = prop.parentPath
            const parentWatcher = this.parentWatcher = new Watcher(parent, parentKey, function(val) {
                child[prop.path] = val
            }, {sync: true})
            defineReactive(child, prop.path, parentWatcher.value)
        },

        unbind() {

        }
    },
    slot: {
        priority: SLOT,

        bind() {
            let name = getAttr(this.el, 'name') 
            if (name == null) { 
                name = 'default'
            }
            const content = this.vm._slotContents && this.vm._slotContents[name]
            replace(this.el, content)
        }
    }
}

// 获取selected选中的值
function getValue(el, multi, init) {
    const res = multi? [] : null
    let op, selected
    for (let i = 0, l = el.options.length; i < l; i++) {
        op = el.options[i]
        selected = init? op.hasAttribute('selected') : op.selected
        if (selected) {
            if (multi) {
                res.push(op.value)
            } else {
                return op.value
            }
        }
    }
    return res
}

function toArray(arry, index) {
    index = index || 0
    return [...arry].slice(index)
}

function replace(oldNode, newNode) {
    const parent = oldNode.parentNode;
    if (parent) {
        parent.replaceChild(newNode, oldNode)
    }
}

function extend(to, from) {
    const keys = Object.keys(from)
    let i = keys.length
    while (i--) {
        to[keys[i]] = from[keys[i]]
    }
    return to
}

function on(el, event, cb, useCapture) {
    el.addEventListener(event, cb, useCapture)
}

function off(el, event, cb) {
    el.removeEventListener(event, cb)
}

function bind(fn, ctx) {
    return function (a) {
        let l = arguments.length
        return l ? l > 1 ? fn.apply(ctx, arguments) : fn.call(ctx, a) : fn.call(ctx)
    }
}

function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true
    })
}

function hasOwn(obj, key) {
    return hasOwnProperty.call(obj, key)
}

function isObject(obj) {
    return obj !== null && typeof obj === 'object'
}

const isArray = Array.isArray
{isArray}

function getAttr(node, _attr) {
    const val = node.getAttribute(_attr)
    if (val !== null) {
        node.removeAttribute(_attr)
    }
    return val
}

function getBindAttr(node, name) {
    let val = getAttr(node, ':' + name)
    if (val === null) {
        val = getAttr(node, 'v-bind:' + name)
    }
    return val
}

function remove(el) {
    el.parentNode.removeChild(el)
}

function insert(newNode, oldNode) {
    oldNode.parentNode.insertBefore(newNode, oldNode)
}

function addClass(el, cls) {
    el.classList.add(cls)
}

function query(el) {
    return typeof el === 'string' ? document.querySelector(el) : el;
}

function makeGetterFn(body) {
    return new Function('vm', 'return vm.' + body)
}

function firstWordtoUpper(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1)
}

// 去除空文本节点
function trimNode(node) {
    let child
    while ((child = node.firstChild, isTrimmable(child))) {
        node.removeChild(child)
    }
    while ((child = node.lastChild, isTrimmable(child))) {
        node.removeChild(child)
    }
}

// 是否为空文本节点
function isTrimmable(node) {
    return node && (node.nodeType === 3 && !node.data.trim() || node.nodeType === 8)
}

function toUpper(_, c) {
    return c ? c.toUpperCase() : ''
}

function set(obj, key, val) {
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
function mergeOptions(parent, child, vm) {
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

const defaultStrat = function defaultStrat(parentVal, childVal) {
    return childVal === undefined ? parentVal : childVal
}

const specialCharRE = /[^\w\-:\.]/

// 合并属性
function mergeAttrs(from, to) {
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

MiniVue.options = {
    directives,
    components: {},
    filters: {},
}

// 将minivue添加到window上
root.MiniVue = MiniVue

})(window)