let ControlSchema = {
    //是否其他图层显隐，作废
    cmdAll:Boolean,
    //替代cmdAll控制其他图层显隐，默认true
    otherDisplay:Boolean,
    //控制图层，可以控制图层的显隐和高亮，覆盖顺序 样式》图层显隐过滤》高亮
    layers:[{
        //图层ID，可以通过接口/styleInfo/:serverName/:styleId/layer.json获得，如果是旧样式，则为数据源图层ID
        id:String,
        //ID过滤器，通过逗号隔开
        idFilter:String,
        //样式组，只能是AND关系，没有括号
        filters:Object,
        //样式组，可以编写复杂样式，例如(NOT (Q_name_S_LFK=12) OR Q_fclass_S_EQ=1) AND Q_code_S_NE=10012这样类似样式,如果与filters同时存在，以此项为准
        filterStr:String,
        //是否过滤
        display:Boolean,
        //高亮，注记，拾取图层该属性无效
        color:{
            //颜色
            color:String,
            //高亮透明度
            opacity:Number
        }
    }]
}

const Json6 = require("./../../utils/Json6");
const QueryToJs = require("./../../util/QueryToJs");
const JsonError = require('./../../error/JsonError');
const UUID = require("uuid");

const _defaultOpacity = 0.8
class Control{
    constructor(){
        this.tabIndex = 0;
        this.stringLineBuffer = [];
        this.allLayerData = true;
    }
    //只有一个图层的过滤条件
    shortFilterControl(str){

    }
//传入参数 id ,get,layerId
    strToFilterControl(str){
        // let control = Json6.parse(str);
        let control = JSON.parse(str);
        if(str.length != 0 && control == ""){
            throw new JsonError("Control字符串转换失败请检查,如果有特殊例如#@等,需要将其转换成转义符")
        }
        let controlObj = control;
        if(control.otherDisplay == null || "" === control.otherDisplay){
            control.otherDisplay = !control.cmdAll;
        }
        if(control.otherDisplay == null || "" === control.otherDisplay){
            control.otherDisplay = true;
        }else {
            control.otherDisplay = Boolean(control.otherDisplay);
        }
        delete control.cmdAll;
        this._begin(control.otherDisplay);
        this.controlLayersArr = [];
        if(control.layers == null){
            return null;
        }
        for(var i = 0 ; i < control.layers.length ; i ++ ){
            let layer = control.layers[i];
            let layerId = layer.id;
            if(layerId == null){
                continue;
            }
            this.controlLayersArr.push(layerId);
            //写函数主体
            this._beginIsInLayer(layerId);
            //如果idFilter存在，首先过滤
            let idFilter = layer.idFilter;
            if(idFilter != null){
                this.allLayerData = false;
                this._beginDoIdFilter(idFilter);
                    //如果是不显示
                if(layer.display == false){
                    this._push("return false;");
                }else{
                    //然后判断color
                    if(layer.color != null){
                        this._push("color = {}");
                        this._push("color.color = \"" + layer.color.color + "\"");
                        this._push("color._id = \"" + UUID.v1() + "\"");
                        if(layer.color.opacity == null){
                            this._push("color.opacity = " + _defaultOpacity);
                        }else{
                            this._push("color.opacity = " + layer.color.opacity);
                        }
                        this._push("return color;");
                    }else{
                        this._push("return true;");
                    }
                }
                this._endDoIdFilter(idFilter);
            }
            //看filterStr是否存在
            let filterStr = layer.filterStr;
            if(filterStr == null || "" == filterStr){
                if(typeof layer.filters == "object"){
                    let filterArr = [];
                    for(let index in layer.filters){
                        filterArr.push(index + "=" + layer.filters[index]);
                    }
                    filterStr = filterArr.join(" and ");
                }
            }
            if(filterStr != null && "" != filterStr){
                this.allLayerData = false;
                this._beginFilter(filterStr);
                if(layer.display == false){
                    this._push("return false;");
                }else{
                    //然后判断color
                    if(layer.color != null){
                        this._push("color = {}");
                        this._push("color.color = \"" + layer.color.color + "\"");
                        if(layer.color.opacity == null){
                            this._push("color.opacity = " + _defaultOpacity);
                        }else{
                            this._push("color.opacity = " + layer.color.opacity);
                        }
                        this._push("return color;");
                    }else{
                        this._push("return true;");
                    }
                }
                this._endFilter();


            }

            if(this.allLayerData == true){
                if(layer.display == false){
                    this._push("return false;");
                }else{
                    if(layer.color != null){
                        this._push("color = {}");
                        this._push("color.color = \"" + layer.color.color + "\"");
                        if(layer.color.opacity == null){
                            this._push("color.opacity = " + _defaultOpacity);
                        }else{
                            this._push("color.opacity = " + layer.color.opacity);
                        }
                        this._push("return color;");
                    }else{
                        this._push("return true;");
                    }

                }
            }

            this._endIsInLayer(layerId);
        }
        this._end();
        try {
            controlObj.controlLayersArr = this.controlLayersArr;
         //   console.log(this.stringLineBuffer.join('\n'));
            let controlFn = new Function("id","get","layerId",this.stringLineBuffer.join('\n'));
            return {
                controlObj:controlObj,
                controlFn:controlFn
            }
        }catch(e){
            throw "创建过滤器失败" + e + "请检查过滤语句";
        }

    }
    _end(){
        this._push("return color;");
    }
    _begin(otherDisplay){
        if(otherDisplay){
            this._push("var color = true;")
        }else{
            this._push("var color = false;")
        }

    }
    _endFilter(){

        this.tabIndex --;
        this._push("}");


    }
    _beginFilter(filter){
        let queryObj = null;
        try {
            //过滤器处理filter
            queryObj = QueryToJs.queryToJs(filter);
        }catch(e){
            throw "filter: " +  filter + " 解析失败，错误：" + e;
        }

        let jsStr = queryObj.js;
        //取出所有需要获得的字段
        for(let field of queryObj.fields){
            //加入获得字段的函数
            this._push("var " + field + " = get(\"" + field + "\");");
        }
        if(jsStr == ""){
        }
        this._push("if(" + jsStr + "){")
        this.tabIndex ++;

    }
    _beginDoIdFilter(idFilter){

        let str = "if(\"" + idFilter + "\".split(',').indexOf(id.toString()) != -1){";
        this._push(str);
        this.tabIndex ++;
    }
    _endDoIdFilter(idFilter){

        this.tabIndex --;
        this._push("}");
    }
    _beginIsInLayer(layerId){

        let str = "if(layerId == \"" + layerId + "\"){";
        this._push(str);
        this.tabIndex ++;
    }
    _endIsInLayer(layerId){
        this._push("return false;");
        this.tabIndex --;
        let str = "}";
        this._push(str);
    }
    _push(str){
        for(var i = 0 ; i < this.tabIndex ; i ++){
            str = "    " + str;
        }
        this.stringLineBuffer.push(str);
    }
}

module.exports = exports = Control;
/*let aaa = '{ cmdAll:false, layers:[{ id:"面状水系", filters:{Q_fcode_S_EQ:2101010500}, idFilter:"818009",display:false},{ id:"面状水系", idFilter:"818009",color:{color:"#666666"}}]}'

let control = new Control();
console.log(control.strToFilterControl(aaa));*/