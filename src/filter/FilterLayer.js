/**
 * Created by kongjian on 2017/6/30.
 */
class FilterLayer{
    constructor(){
        //过滤图层的唯一标识
        this.id = null;
        //过滤条件
        this.filters = {};
        //过滤数据的唯一id标识
        this.idFilter = null;
        //过滤字符串,与制图系统中的过滤字符串一致，如果同时也有filters，服务会优先使用filterStr
        this.filterStr = null;
        //是否显示
        this.display = true;
        //高亮对象,默认为null时，使用配图的默认样式。 示例：{"color":"%23f00fff","opacity":0.9}， 其中颜色值必须用%23开头
        this.color = null;
    }

    /**
     * 添加字段过滤条件
     * Parameters :
     * key - 如： Q_fcode_S_EQ，表示fcode等于value的值
     * value - 如：2101010500
     */
    addFilterField(key,value){
        this.filters[key] = value;
    }

    /**
     * 添加字段过滤条件
     * Parameters :
     * key
     */
    removeFilterField(key){
        delete this.filters[key];
    }
}

module.exports = FilterLayer;