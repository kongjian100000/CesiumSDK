/**
 * Created by kongjian on 2018/6/12.
 * 注记瓦片队列缓存工具类
 */
class Cache{
    constructor(limit){
        this.limit = limit || 10
        this.map = {}
        this.keys = []
    }
    set(key,value){
        let map = this.map;
        let keys = this.keys;
        let deleteItem = null;
        if (!Object.prototype.hasOwnProperty.call(map,key)) {
            if (keys.length === this.limit) {
                let name = keys.shift();//先进先出，删除队列第一个元素
                deleteItem = map[name];
                delete map[name];
            }
            keys.push(key);
        }
        map[key] = value;//无论存在与否都对map中的key赋值
        return deleteItem;
    }
    get(key){
        return this.map[key]
    }
}

module.exports = Cache;
