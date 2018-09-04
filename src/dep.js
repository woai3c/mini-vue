// dep实例的ID
let uid = 0
// Dep.target为watcher实例
Dep.target = null

export default function Dep() {
    this.id = uid++
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