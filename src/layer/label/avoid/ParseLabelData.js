const GCutLine = require('./GCutLine');
const AvoidUtil =  require('./AvoidUtil');
const _path = './../../../../';
let TextureManager =null;
class ParseLabelData{
    /**
     * 解析瓦片内注记数据
     * @param layerDatas
     * @param styleMap
     * @param isClient
     */
    static parseLayerDatas(layerDatas,styleMap,textures,xyz,isClient){
        let pointFeatures = [];
        let lineFeatures =[];
        for(let layername in layerDatas){
            if(layername == '_layerAvoids'){
                continue;
            }
            let layerData = layerDatas[layername];
            layerData.xyz = xyz;
            let propertyGetter = ParseLabelData.getProperty(layerData.fieldsConfig);
            if(layerData.type == 1){
                let pfs = ParseLabelData.parsePointLayer(layerData,layername,propertyGetter,styleMap,textures,isClient);
                pointFeatures = pointFeatures.concat(pfs);
            }
            if(layerData.type == 2){
                let lfs = ParseLabelData.parseLineLayer(layerData,layername,propertyGetter,styleMap,isClient);
                lineFeatures = lineFeatures.concat(lfs);
            }
        }

        return {pointFeatures:pointFeatures,lineFeatures:lineFeatures};
    }

    /**
     *  解析点图层数据
     */
    static parsePointLayer(layerData,layername,propertyGetter,styleMap,textures,isClient){
        let pointFeatures = [];
        for(let i =0;i<layerData.features.length;i++){
            let feature = layerData.features[i];
            let style = styleMap[feature.styleId];
            if(!style){
                continue;
            }

            feature.centerPoint = feature[2];
            feature.attributeId = layername +'__'+ feature[1][propertyGetter.idIndex];
            feature.layerName = layername;
            feature.xyz = layerData.xyz;
            feature.propertyGetter =propertyGetter;
            feature.type =layerData.type;
            feature.weight = feature.avoidWeight;
            if(feature.avoidWeight == null || isNaN(feature.avoidWeight)){
                feature.avoidWeight = style.avoidWeight;
                feature.weight = feature.avoidWeight;
                if(feature.weight == null){
                    feature.weight = 0;
                    feature.avoidWeight = 0;
                }
            }
            if(style.isImportant){
                feature.avoidWeight = 99999999;
                feature.weight = 99999999;
            }

            feature = ParseLabelData.parsePoint(feature,style,textures,isClient);
            pointFeatures.push(feature);
        }

        return pointFeatures;
    }


    /**
     *  解析线图层数据
     */
    static parseLineLayer(layerData,layername,propertyGetter,styleMap,isClient){
        let lineFeatures = [];
        for(let i =0;i<layerData.features.length;i++){
            let feature = layerData.features[i];
            let style = styleMap[feature.styleId];
            if(!style){
                continue;
            }
            feature.layerName = layername;
            let features = ParseLabelData.parseLine(feature,style,layerData,propertyGetter,isClient);
            lineFeatures = lineFeatures.concat(features);
        }
        return lineFeatures;
    }

    /**
     *  解析点数据
     * @param feature
     * @param style
     * @param isClient
     * @returns {Array}
     */
    static parsePoint(feature,style,textures,isClient){
        if(isClient){
            feature.iconImg = textures[style.texture];
        }else{
            if(TextureManager == null){
                TextureManager = require(_path + 'src/process/texture/TextureManager');
            }
            if(style.texture){
                let texture = TextureManager.getTexture(style.texture);
                if(texture != null) {
                    feature.iconImg = texture.toPattern(ratio);
                }
            }
        }

        feature.attributes = ParseLabelData.getAttributes(feature[1],feature.propertyGetter);
        let point = feature[2];
        let sourceAngleData = [[point, 0]];
        let label = feature.attributes[style.labelfield];
        feature.primaryId = feature.attributeId + '_row_' + feature.xyz.y + '_col_' + feature.xyz.x + '_level_' + feature.xyz.l + '_x_' + sourceAngleData[0][0][0] + '_y_' + sourceAngleData[0][0][1];
        //去掉尾部的空格
        feature.label = AvoidUtil.formatLabel(label);
        feature.weight = feature.avoidWeight;

        let radius = 0;
        if(style.pointBoxDisance){
            radius = style.pointBoxDisance*0.5;
        }

        feature.filterBox =[feature.centerPoint[0]-radius,feature.centerPoint[1]-radius,
            feature.centerPoint[0]+radius,feature.centerPoint[1]+radius];
        feature.sourceData = point;
        feature.sourceAngleData = sourceAngleData;

        if(isClient){
            feature.id = Math.round(Math.random() * 256 * 256 * 256);
            // feature.datas = ParseLabelData.transformData(sourceAngleData, feature.xyz);
        }
        // else{
        //     feature.datas = sourceAngleData;
        // }

        return feature;
    }

    /**
     *  解析线数据
     * @param itemData
     * @param style
     * @param isClient
     * @returns {Array}
     */
    static parseLine(feature,style,layerData,propertyGetter,isClient){
        if (feature[2].length == 0) {
            return [];
        }

        let lines = [];
        ParseLabelData.processLineString(lines,feature[2],feature,style,layerData,propertyGetter,isClient);
        return lines;
    }

    static processLineString(lines,components,feature,style,layerData,propertyGetter,isClient) {
        if (Array.isArray(components[0])) {
            let len = components.length;
            for (let i = 0; i < len; i++) {
                let component = components[i];
                ParseLabelData.processLineString(lines,component,feature,style,layerData,propertyGetter,isClient);
            }
        } else {
            let ls = ParseLabelData.parseMultiLine(feature,components,layerData,propertyGetter,style,isClient);
            for(let i =0;i<ls.length;i++){
                lines.push(ls[i]);
            }
        }
    }

    /**
     *  解析多线数据
     * @param itemData
     * @param style
     * @param isClient
     * @returns {Array}
     */
    static parseMultiLine(feature,line, layerData,propertyGetter,style,isClient){
        let attributes = ParseLabelData.getAttributes(feature[1],propertyGetter);
        let multiLines = [];
        let label = attributes[style.labelfield];
        let roadCodeLabel = attributes[style.roadCodeLabel];
        //去掉尾部的空格
        label = AvoidUtil.formatLabel(label);
        //去掉尾部的空格
        roadCodeLabel = AvoidUtil.formatLabel(roadCodeLabel);

        let attributeId = feature.layerName +'__'+ feature[1][propertyGetter.idIndex];
        let weight = feature.avoidWeight;
        if(style.isImportant){
            weight = 99999999;
        }

        let featureItem = {
            type: layerData.type,
            sourceData: line,
            label: label,
            weight: feature.avoidWeight,
            roadCodeLabel: roadCodeLabel,
            attributes: attributes,
            attributeId:attributeId ,
            styleId: feature.styleId,
            xyz: layerData.xyz,
            layerName: feature.layerName
        };
        multiLines = multiLines.concat(ParseLabelData.cutLineFeature(featureItem,style,isClient, false));
        return multiLines;
    }


    /**
     *  切割线注记
     * @param feature
     * @param style
     * @param isClient
     * @param isLocal
     * @returns {*}
     */
    static cutLineFeature(feature, style,isClient,isLocal){
        if(isClient) {
            if (style.type == '_default__') {
                feature.sourceAngleData = ParseLabelData.lineToSourceAngleData(feature.sourceData);
                // feature.datas = ParseLabelData.transformData(feature.sourceAngleData, feature.xyz);
                return [feature];
            }
        }

        let features = GCutLine.cutLineFeature(feature,style,isClient);
        //默认外扩为10
        let radius = 5;

        for (let i = 0; i < features.length; i++) {
            let f = features[i];

            f.primaryId = f.attributeId + '_row_' + feature.xyz.y + '_col_' + feature.xyz.x + '_level_' + feature.xyz.l
                + '_x_' + f.sourceAngleData[0][0][0] + '_y_' + f.sourceAngleData[0][0][1];

            if(isClient){
                //转换为屏幕坐标
                // if (isLocal) {
                //     f.datas = feature.transformData(this.extent, this.res);
                // } else {
                //     f.datas = ParseLabelData.transformData(f.sourceAngleData, f.xyz,maxExtent,extent,res,tileSize);
                // }
                //用于拾取的id
                f.id = Math.round(Math.random() * 256 * 256 * 256);
            }
            // else{
            //     f.datas = f.sourceAngleData;
            // }

            f.layerName = feature.layerName;
            //获取注记的中心点
            if (f.lineType == 'text') {
                let centerIndex = Math.floor(f.sourceAngleData.length / 2);
                f.centerPoint = f.sourceAngleData[centerIndex][0];
                if(style.lineTextBoxDisance){
                    //杭州的外扩距离设置太大，导致大片没线注记，故注释掉了这段
                    radius = style.lineTextBoxDisance*0.5;
                }
            }

            //获取注记的中心点
            if (f.lineType == 'code') {
                f.centerPoint = f.sourceAngleData[0][0];
                if(style.lineCodeBoxDisance){
                    radius = style.lineCodeBoxDisance*0.5;
                }
            }

            //获取注记的中心点
            if (f.lineType == 'arrow') {
                f.centerPoint = f.sourceAngleData[1][0];
            }

            //第二次过滤的box
            f.filterBox = [f.centerPoint[0]-radius,f.centerPoint[1]-radius,f.centerPoint[0]+radius,f.centerPoint[1]+radius];
        }
        return features;
    }

    /**
     * 将线注记原始坐标带点和角度的格式，和切过的线的格式一致（针对默认样式的线主机）
     * Parameters:
     * line - 线注记原始数据
     * Returns:
     */
    static lineToSourceAngleData(line) {
        let sourceAngleData = [];
        for (let i = 0; i < line.length; i++) {
            let x = line[i];
            let y = line[i + 1];
            sourceAngleData.push([[x, y], 0]);
            i++;
        }
        return sourceAngleData;
    };

    /**
     * 将瓦片内坐标转换为当前屏幕坐标
     * Parameters:
     * points - 瓦片内坐标数组,item示例：[[12,20],0] [12,20]为点坐标，0为旋转的角度
     * xyz - 瓦片的层行列号
     * Returns:
     * rdata - 本地屏幕内坐标数组
     */
    static transformData(points, xyz,maxExtent,extent,res,tileSize) {
        //取出当前视口左上角的地理坐标
        let left = extent[0];
        let top = extent[3];

        //地图最大的范围
        let mLeft = maxExtent[0];
        let mTop = maxExtent[3];

        //计算坐上角的屏幕坐标
        let x = (left - mLeft) / res;
        let y = (mTop - top) / res;

        let rPoint = [];

        for (let i = 0; i < points.length; i++) {
            let point = points[i][0];
            let gx = point[0] + xyz.x * tileSize;
            let gy = point[1] + xyz.y * tileSize;
            let p = [gx - x, gy - y];
            rPoint.push([p, points[i][1]]);
        }
        return rPoint;
    };

    static toLonlat(rectangle,point,tileSize){
        var lon = CesiumMath.toDegrees(rectangle.west + rectangle.width/ tileSize* x);
        var lat = CesiumMath.toDegrees(rectangle.north - rectangle.height/ tileSize* y);
        return [lon,lat];
    }




    static getProperty(fieldsConfig){
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

    static getAttributes(feature,propertyGetter){
        let attributes = {};
        let propertyConfig = propertyGetter.propertyConfig;
        for(let name in propertyConfig){
            attributes[name] = feature[propertyConfig[name]];
        }
        return attributes;
    }
}

module.exports = ParseLabelData;