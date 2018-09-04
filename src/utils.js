export function toArray(arry, index) {
    index = index || 0
    return [...arry].slice(index)
}