'use strict';
/**
 * Constructs a worker pool.
 * @private
 */
class VectorDrawer {
    constructor(layerDataMapArr,level,featureMap,control,highLighStr) {
        this.layerDataMapArr = layerDataMapArr;
        this.level = level;
        this.control =control;
        this.highLight = highLighStr;
        // this.features = features;
        this.featureMap = featureMap;
        this.index = 0;
    }

    getBackground(){
        this.vectorDatas = [];
        return this;
    }

    getTypeString(type){
        if(type == 1 || type == 'POINT'){
            return 'Point';
        }
        if(type == 2 || type == 'LINESTRING'){
            return 'LineString';
        }

        if(type == 3 || type == 'POLYGON'){
            return 'Polygon';
        }

        if(type == 4 || type == 'MULTIPOINT'){
            return 'MultiPoint';
        }

        if(type ==5 || type == 'MULTILINESTRING'){
            return 'MultiLineString';
        }

        if(type == 6 || type == 'MULTIPOLYGON'){
            return 'MultiPolygon';
        }

        if(type == 7 || type == 'FEATURECOLLECTION'){
            return 'FeatureCollection';
        }
    };

    getLayer(dataLayerID,styleLayerID){
        this.index++;
        this.vectorDatas = [];
        // if(dataLayerID !='面状居民地' && dataLayerID !='行政区划面'){
        //     return this;
        // }
        // if(dataLayerID !='面状居民地'){
        //     return this;
        // }
        // if(dataLayerID !='行政区划面'){
        //     return this;
        // }

        // if(dataLayerID =='行政区划面'){
        //     return this;
        // }

        // if(dataLayerID !='面状植被' && dataLayerID !='行政区划面'){
        //     return this;
        // }

        //判断其他图层是否显示Control otherDisplay,如果是其他图层不显示，则需要在这里处理
        if(this.control) {
            if (this.control.controlObj.otherDisplay == false) {
                if (this.control.controlObj.controlLayersArr.indexOf(styleLayerID) == -1) {
                    return this;
                }
            }
        }

        for(let i = 0;i<this.layerDataMapArr.length;i++){
            let data = this.layerDataMapArr[i][dataLayerID];
            if(data == null){
                continue;
            }

            if(!data.features){
                data.features = data.datas;
            }

            if(!data.features){
                continue;
            }

            for(let j=0;j<data.features.length;j++){
                let vectorData = data.features[j];
                vectorData.layerName = dataLayerID;
                vectorData.type = this.getTypeString(vectorData[0]);
                if(!vectorData.properties){
                    vectorData.properties = this.getFieldValueMap(data,vectorData);
                }

                //过滤数据
                if(this._filterByStyle(vectorData,styleLayerID)){
                    //高亮
                    let controlRes = this._highLightByStyle(vectorData,styleLayerID)
                    if(controlRes['color'] != null){
                        vectorData.customeColor = controlRes;
                    }
                    this.vectorDatas.push(vectorData);
                }
            }
        }
        return this;
    };



    getGroupLayer(dataLayerID,value,styleLayerID){
        this.index++;
        this.vectorDatas = [];

        let valueArr = value.split(',');
        let length = valueArr.length;
        if(length == 0){
            return this;
        }

        //判断其他图层是否显示Control otherDisplay,如果是其他图层不显示，则需要在这里处理
        if(this.control) {
            if (this.control.controlObj.otherDisplay == false) {
                if (this.control.controlObj.controlLayersArr.indexOf(styleLayerID) == -1) {
                    return this;
                }
            }
        }

        for(let i = 0;i<this.layerDataMapArr.length;i++){
            let data = this.layerDataMapArr[i][dataLayerID];
            if(data == null){
                continue;
            }

            if(!data.features){
                data.features = data.datas;
            }

            if(!data.features){
                continue;
            }

            for(let j = 0 ; j < length ; j ++){
                let dataArr = data.features[valueArr[j]];
                if(dataArr == null){
                    continue;
                }

                let vectorData = data.features[i];
                vectorData.layerName = dataLayerID;
                vectorData.type = data.type;
                if(!vectorData.properties){
                    vectorData.properties = this.getFieldValueMap(data,vectorData);
                }

                //过滤数据
                if(this._filterByStyle(vectorData,styleLayerID)){
                    let controlRes = this._highLightByStyle(vectorData,styleLayerID)
                    if(controlRes['color'] != null){
                        vectorData.customeColor = controlRes;
                    }
                    this.vectorDatas.push(vectorData);
                }
            }
        }
        return this;
    }

    setStyle(fn){
        for(let i=0;i<this.vectorDatas.length;i++){
            let item = this.vectorDatas[i];
            let vectorData = {};
            vectorData.id = Math.random();
            vectorData.layerName = item.layerName;
            vectorData.customeColor = item.customeColor;
            vectorData.type = item.type;
            vectorData.properties = item.properties;
            vectorData.data = item[2];
            vectorData.index = this.index;


            let get = function(key){
                return vectorData.properties[key];
            };

            let style = fn.call({},this.level,get);
            if(vectorData.type == 'MultiLineString' || vectorData.type == 'LineString'){
                if(style && style.stroke == false){
                    continue;
                }
            }

            if(style && style.display != false){
                vectorData.style = style;

                if(vectorData.customeColor){
                    vectorData.style._id = vectorData.customeColor._id;
                    if(vectorData.style.hasOwnProperty('fillColor')){
                        vectorData.style.fillColor = vectorData.customeColor['color'];
                        vectorData.style.fillOpacity = vectorData.customeColor['opacity'];
                    }else{
                        vectorData.style.strokeColor = vectorData.customeColor['color'];
                        vectorData.style.strokeOpacity = vectorData.customeColor['opacity'];
                    }
                }

                // let key = style._id;
                let key = vectorData.layerName;
                if(!this.featureMap[key]){
                    this.featureMap[key] = [];
                }
                this.featureMap[key].push(vectorData);
            }

        }
    }

    getFieldValueMap(data,vectorData){
        let  fieldValueMap=  {};
        for(let i = 0;i<data.fieldsConfig.length;i++){
            let fieldName = data.fieldsConfig[i]['name'];
            let index = data.fieldsConfig[i]['index'];
            let id = data.fieldsConfig[i]['id'];
            if(id == true){
                //图层名和数据的主键构成唯一id
                fieldValueMap['primaryId'] =vectorData.layerName+vectorData[1][index];
                fieldValueMap['id'] =vectorData[1][index];
            }
            fieldValueMap[fieldName] = vectorData[1][index];
        }
        return fieldValueMap;
    }

    getWaterMark(){
        this.vectorDatas = [];
        return this;
    }

    draw(){
    }


    _getProperty(data){
        return data[1];
    }

    _getPoints(data){
        return data[2];
    }
    _getType(data){
        return data[0];
    }

    //过滤数据
    _filterByStyle (gjson,styleLayerID) {
        let type = this._getType(gjson);
        let points = this._getPoints(gjson);
        let property = this._getProperty(gjson);
        if(points == null){
            throw "绘制失败,数据中缺少Geometry";
        }
        if(type == null){
            type = "POLYGON";
        }
        let style = null;
        let controlRes = {};

        var get = function(fieldName){
            return gjson.properties[key];
        }
        if(this.control) {
            if(typeof this.control.controlFn == "function") {
                let id = gjson.properties['id'];
                controlRes = this.control.controlFn.call({}, id, get, styleLayerID);
                if (controlRes == false || controlRes == null) {
                    return false;
                }
            }
        }

        return true;
    }

    //过滤数据
    _highLightByStyle (gjson,styleLayerID) {
        let type = this._getType(gjson);
        let points = this._getPoints(gjson);
        let property = this._getProperty(gjson);
        if(points == null){
            throw "绘制失败,数据中缺少Geometry";
        }
        if(type == null){
            type = "POLYGON";
        }
        let style = null;
        let controlRes = {};

        var get = function(fieldName){
            return gjson.properties[key];
        }
        if(this.highLight) {
            if(typeof this.highLight.controlFn == "function") {
                let id = gjson.properties['id'];
                controlRes = this.highLight.controlFn.call({}, id, get, styleLayerID);
                if (controlRes == false || controlRes == null) {
                    return false;
                }
            }
        }

        return controlRes;
    }
}
module.exports = VectorDrawer;