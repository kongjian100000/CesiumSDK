/**
 * Created by kongjian on 2017/5/1.
 */
class LabelDrawer{
    constructor(layerDataMap,styleMap,level) {
        this.layerDataMap = layerDataMap;
        this.level = level;
        this.styleMap = styleMap;
        this.propertyGetterMap = {};
    }

    getLayer(layername){
        this.layerDatas = {};
        let data = this.layerDataMap[layername];
        if(data == null || data.features == null){
            return this;
        }
        this.propertyGetterMap[layername] = this.getProperty(data.fieldsConfig);
        this.layerDatas[layername] = data;
        return this;
    }

    getAllLayer(){
        this.layerDatas = this.layerDataMap;
        for(let layername in this.layerDataMap){
            this.propertyGetterMap[layername] = this.getProperty(this.layerDataMap[layername].fieldsConfig);
        }
        return this;
    }


    getGroupLayer(layername,value){
        this.layerDatas = {};
        let valueArr = value.split(',');
        let length = valueArr.length;
        if(length == 0){
            return this;
        }

        let data = this.layerDataMap[layername];
        if(data == null || data.features == null){
            return this;
        }
        this.propertyGetterMap[layername] = this.getProperty(data.fieldsConfig);
        this.layerDatas[layername] = data;
        return this;
    }

    getProperty(fieldsConfig){
        let propertyConfig = {};
        let idIndex = 0;
        for(var i = 0 ;i < fieldsConfig.length; i ++){
            if(fieldsConfig[i].id == 'true' || fieldsConfig[i].id == true){
                idIndex = fieldsConfig[i].index;
            }
            propertyConfig[fieldsConfig[i].name] = parseInt(fieldsConfig[i].index);
        }
        return {propertyConfig:propertyConfig,idIndex:idIndex};
    }

    setStyle(fn){
		for(let layername in  this.layerDatas){
		    let layerData = this.layerDatas[layername];
		    let propertyGetter = this.propertyGetterMap[layername];
		    for(let i =0;i<layerData.features.length;i++){
                let feature = layerData.features[i];

                let get = function(key){
                    return feature[1][propertyGetter.propertyConfig[key]]
                };

                let style = fn.call({},this.level,get);

                if(style && style.show == true){
                    if(!this.styleMap[style._id]){
                        this.styleMap[style._id] = style;
                    }
                    feature.avoidWeight = this.getWeight(style,feature,propertyGetter);
                    feature.styleId = style._id;
                }

            }
        }
    }

    setGlobalStyle(fn){
        this.globalStyle = fn.call({});
    }

    getWeight(style,feature,propertyGetter){

        let weight = feature[1][propertyGetter.propertyConfig[style.avoidField]];
        if (weight) {
            weight = parseInt(weight);
            if (isNaN(weight)) {
                weight = 0;
            }
        }else{
            weight =  0;
        }

        if(weight ==0){
            if(style.avoidWeight){
                return style.avoidWeight;
            }
        }
        return weight;
    }

    draw(){

    }
}

module.exports = LabelDrawer;

