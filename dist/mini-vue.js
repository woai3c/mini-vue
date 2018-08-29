(function(root) {
    // MiniVue构造函数 参数是一个对象
    function MiniVue(options) {
        // 存放观察者实例
        this._watchers = []
        // 存放文本节点 在compile上会用到
        this._textNodes = []
        this.$options = options
        this.init()
    }

    // 原型方法
    MiniVue.prototype = {
        // 初始化数据和方法
        init() {
            this.initData()
            this.initMethods()

            // 监听数据
            new Observer(this._data)
            // 解析指令
            new Compile(this)
        },

        initData() {
            const vm = this
            vm.$el = document.querySelector(vm.$options.el)
            let data = vm.$options.data
            data = vm._data = typeof data === 'function'? data() : data || {}
            const keys = Object.keys(data)

            // 对每一个key实现代理 即可通过vm.msg来访问vm._data.msg
            keys.forEach(e => {
                vm.proxy(vm, '_data', e)
            })
        },

        initMethods() {
            const vm = this
            const methods = vm.$options.methods? vm.$options.methods : {}
            const keys = Object.keys(methods)
            // 将methods上的方法赋值到vm实例上
            keys.forEach(e => {
                vm[e] = methods[e]
            })
        },

        proxy(target, sourceKey, key) {
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
        }
    }

    // 对数据进行监听
    function Observer(obj) {
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

    function defineReactive(obj, key, val) {
        const dep = new Dep()
        // 如果值是一个对象 递归监听
        if (typeof val === 'object') {
            new Observer(val)
        }

        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get() {
                // 收集对应的观察者对象
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
                // 如果新值是对象 递归监听
                if (typeof val === 'object') {
                    new Observer(val)
                }
                // 触发更新
                dep.notify()
            }
        })
    }

    // watcher实例的ID 每个watcher实现的ID都是唯一的
    let uid = 0

    // expOrFn为表达式或一个变量名
    function Watcher(vm, expOrFn, callback) {
        vm._watchers.push(this) 
        this.id = uid++
        this.vm = vm   
        // 存放dep实例
        this.deps = []
        // 存放dep的ID
        this.depIds = new Set()
        // 更新触发回调函数
        this.cb = callback

        this.getter = () => vm[expOrFn]
        this.setter = (val) => {
            vm[expOrFn] = val
        }
        // 在创建watcher实例时先取一次值
        this.value = this.get()
    }

    Watcher.prototype = {
        get() {
            // 在读取值时先将观察者对象赋值给Dep.target 否则Dep.target为空 不会触发收集依赖
            Dep.target = this
            const value = this.getter()
            // 触发依赖后置为空
            Dep.target = null
            return value
        },

        set(val) {
            this.setter(val)
        },

        update() {
            this.run()
        },

        run() {
            // 触发更新后执行回调函数
            const value = this.get()
            const oldValue = this.value

            if (value !== oldValue) {
                this.cb.call(this.vm, value, oldValue)
            }
            this.value = value
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
        }
    }

    // dep实例的ID
    let did = 0
    // Dep.target为watcher实例
    Dep.target = null

    function Dep() {
        this.id = did++
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
            this.subs.forEach(e => {
                e.update()
            })
        }
    }

    // 针对各种指令的回调函数
    const handles = {
        on: {
            implement(vm, el, name, expOrFn) {
                el['on' + name] = vm[expOrFn].bind(vm)
            },
            update(vm, el, expOrFn, newVal, oldVal) {

            }
        },
        bind: {
            implement(vm, el, name, expOrFn) {
                el.setAttribute(expOrFn, vm[expOrFn])
            }, 
            update(vm, el, expOrFn, newVal, oldVal) {
                el.setAttribute(expOrFn, newVal)
            }
        },
        model: {
            implement(vm, el, name, expOrFn) {
                el.value = vm[expOrFn]
                el.oninput = function() {
                    vm[expOrFn] = this.value
                }
            },  
            update(vm, el, expOrFn, newVal, oldVal) {
                el.value = newVal
            }
        },
        textNode: {
            implement(vm, textNode, variable) {
                textNode.nodeValue = textNode.nodeValue.replace(`{{${variable}}}`, vm[variable])
            },  
            update(vm, newVal, oldVal, textNode, variable, rawValue, re1, re2) {
                textNode.nodeValue = rawValue.replace(`{{${variable}}}`, newVal)
                let str = textNode.nodeValue
                if (re1.test(str)) {
                    let arry = str.match(re1)
                    arry.forEach(e => {
                        let variable = e.replace(re2, '')
                        str = str.replace(e, vm[variable])
                    })
                    textNode.nodeValue = str
                }
            }
        }
    }

    // 指令解析器
    function Compile(vm) {
        this.el = vm.$el
        this.vm = vm
        this.onRe = /^(v-on:|@)/
        this.modelRe = /^v-model/
        this.bindRe = /^(v-bind:|:)/
        this.braceRe1 = /{{\w+}}/g
        this.braceRe2 = /[{}]/g
        this.dirs = []
        this.handles = handles
        this.init()
    }

    Compile.prototype = {
        init() {
            this.parse(this.el)
            this.render()
        },

        parse(el) {
            const attrs = el.attributes
            let name
            [...attrs].forEach(e => {
                if (this.onRe.test(e.name)) {
                    name = e.name.replace(this.onRe, '')
                    this.addDir(this.handles.on, name, e.name, e.value, el)
                } else if (this.bindRe.test(e.name)) {
                    // 类似:bind="name" 解析完后将原本的值删掉
                    el.removeAttribute(e.name.split('=')[0])
                    name = e.name.replace(this.bindRe, '')
                    this.addDir(this.handles.bind, name, e.name, e.value, el)
                } else if (this.modelRe.test(e.name)) {
                    name = e.name.replace(this.modelRe, '')
                    this.addDir(this.handles.model, name, e.name, e.value, el)
                }
            })

            const children = el.childNodes
            if (children.length > 0) {
                children.forEach(ele => {
                    switch(ele.nodeType) {
                        // 元素节点
                        case 1: 
                            this.parse(ele)
                            break
                        // 文本节点
                        case 3: 
                            if (this.braceRe1.test(ele.nodeValue)) {
                                this.vm._textNodes.push(ele)
                            }
                            break
                    }
                })
            }
        },

        addDir(handle, dirName, name, value, el) {
            this.dirs.push({
                vm: this.vm,
                dirName,
                handle,
                rawName: name,
                expOrFn: value,
                el
            })
        },

        render() {
            const vm = this.vm
            const that = this
            this.dirs.forEach(e => {
                const handle = e.handle
                if (handle.implement) {
                    handle.implement(e.vm, e.el, e.dirName, e.expOrFn)
                } 
                const update = function(newVal, oldVal) {
                    handle.update(e.vm, e.el, e.expOrFn, newVal, oldVal)
                }
                // 在这里开始创建观察者实例 将监听的值变化时 触发update回调函数
                new Watcher(this.vm, e.expOrFn, update)
            })
            const handles = this.handles.textNode

            vm._textNodes.forEach(e => {
                let arry = e.nodeValue.match(this.braceRe1)
                let rawValue = e.nodeValue
                arry.forEach(str => {
                    let variable = str.replace(this.braceRe2, '')
                    handles.implement(vm, e, variable)
                    const update = function(newVal, oldVal) {
                        handles.update(vm, newVal, oldVal, e, variable, rawValue, that.braceRe1, that.braceRe2)
                    }
                    // 监听文本节点 在这里开始创建观察者实例 将监听的值变化时 触发update回调函数
                    new Watcher(vm, variable, update)
                })
            })
        }
    }
    // 将minivue添加到window上
    root.MiniVue = MiniVue
})(window)