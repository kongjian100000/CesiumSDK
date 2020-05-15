/**
 * Created by kongjian on 2017/6/30.
 */
class Filter{
    constructor(){
        //该值为ture时，后面的layers是全部要显示的，如果为false，后面的layers全部不显示,顶替上面的cmdAll
        this.otherDisplay = true;
        //图层集合
        this.layers = [];
        //里面存放layerName，最终渲染的图层顺序以该图层存放的顺序为准，如果为空数组，则以样式文件中的顺序为准. 注记图层，该属性会被忽略
        this.order = [];
    }


    /**
     * 添加过滤图层
     * Parameters :
     * filterLayer - 过滤图层
     */
    addFilterLayer(filterLayer){
        this.layers.push(filterLayer);
    }

    /**
     * 移除过滤图层
     * Parameters :
     * filterLayerId - 过滤图层ID
     */
    removeFilterLayerById(filterLayerId){
        for(var i = 0;i<this.layers.length;i++){
            if(this.layers[i].id == filterLayerId){
                this.layers.splice(i,1);
            }
        }
    }
}
module.exports = Filter;