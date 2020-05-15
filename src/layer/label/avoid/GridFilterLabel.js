const GridFilter = require('./../../../utils/gistools/GridFilter');
const Util = require('./Util');
const GisTools = require('../../../utils/gistools/GisTools');
class GridFilterLabel{
    /**
     *  第一次初步过滤
     * @param pointFeatures 点注记集合
     * @param lineFeatures 线注记集合
     * @param styleMap 样式map
     * @param ableWeight 全局是否权重避让
     * @param needSort 第一次过滤是否需要排序
     * @param tilesize 瓦片大小
     * @param cellsize 每个小网格宽度
     * @param buffer 外扩多大像素
     * @param maxPerCell 每个网格内最多放多少个点
     * @returns {{pointFeatures: Array, lineFeatures: Array, importantFeatures: Array}}
     */
    static fristFilter(pointFeatures,lineFeatures,styleMap,ableWeight,needSort,tilesize, cellsize, buffer,maxPerCell){
        if(ableWeight && needSort){
            Util.sort(pointFeatures);
            Util.sort(lineFeatures);
        }

        //第一次过滤
         pointFeatures = GridFilterLabel.fristFilterStart(pointFeatures,tilesize, cellsize, buffer,maxPerCell);
         lineFeatures = GridFilterLabel.fristFilterStart(lineFeatures,tilesize, cellsize, buffer,maxPerCell);
        return {pointFeatures:pointFeatures,lineFeatures:lineFeatures};
    }


    /**
     *  第二次初步过滤
     * @param pointFeatures 点注记集合
     * @param lineFeatures 线注记集合
     * @param styleMap 样式map
     * @param ableWeight 全局是否权重避让
     * @param needSort 第二次过滤是否需要排序
     * @param tilesize 全局画布最大宽
     * @param cellsize 每个小网格宽度
     * @param buffer 外扩多大像素
     * @param maxPerCell 每个网格内最多放多少个点
     * @returns {{pointFeatures: Array, lineFeatures: Array, importantFeatures: Array}}
     */
    static scendFilter(pointFeatures,lineFeatures,styleMap,ableWeight,needSort,tilesize, cellsize, buffer,maxPerCell){
        if(ableWeight && needSort){
            Util.sort(pointFeatures);
            Util.sort(lineFeatures);
        }
        //第二次过滤
         pointFeatures = GridFilterLabel.scendFilterStart(pointFeatures,tilesize, 16, buffer);
         lineFeatures = GridFilterLabel.scendFilterStart(lineFeatures,tilesize, 16, buffer);

        let returnFeatures = [];
        returnFeatures = returnFeatures.concat(pointFeatures);
        returnFeatures = returnFeatures.concat(lineFeatures);
        return returnFeatures;
    }


    /**
     *  移除瓦片外的点注记
     * @param features
     * @param tilesize
     */
    static removeTileOutPointFeatures(features,tileSize){
        let newFeatures = [];
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            let pt =feature .centerPoint;
            if(pt[0] >= 0 && pt[0] <= tileSize && pt[1] >= 0 && pt[1] <= tileSize){
                newFeatures.push(feature);
            }
        }
        return newFeatures;
    }

    /**
     *  移除瓦片外的线注记
     * @param features
     * @param tilesize
     */
    static removeTileOutLineFeatures(features,tileSize){
        let newFeatures = [];
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            for(let j = 0;j<feature.datas.length;j++){
                let pt = feature.datas[j][0];
                if(pt[0] >= 0 && pt[0] <= tileSize && pt[1] >= 0 && pt[1] <= tileSize){
                    newFeatures.push(feature);
                    break;
                }
            }
        }
        return newFeatures;
    }

    /**
     *  注记第一次初步格网过滤
     * @param features
     * @param tilesize 瓦片大小
     * @param cellsize 小正方形网格的宽
     * @param buffer  外扩多少像素
     * @param maxPerCell  小正方形中允许放多小个注记
     * @returns {Array}
     */
    static fristFilterStart(features,tilesize, cellsize, buffer,maxPerCell){
        let gridFilter = new GridFilter(tilesize, cellsize, buffer,maxPerCell);
        let returnFeatures = [];
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            let bool = gridFilter.filter(feature.centerPoint[0],feature.centerPoint[1]);
            if(bool){
                returnFeatures.push(feature);
            }
        }
        return returnFeatures;
    }

    /**
     *  注记第二次box格网过滤
     * @param features
     * @param tilesize 瓦片大小
     * @param cellsize 小正方形网格的宽
     * @param buffer  外扩多少像素
     * @param maxPerCell  小正方形中允许放多小个注记
     * @returns {Array}
     */
    static scendFilterStart(features,tilesize, cellsize, buffer){
        let gridFilter = new GridFilter(tilesize, cellsize, buffer,1);
        let returnFeatures = [];
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            let bool = gridFilter.filterByBox(feature.filterBox);
            if(bool){
                returnFeatures.push(feature);
            }
        }
        return returnFeatures;
    }



    /**
     *  第三次过滤，注记去重
     * @param features
     * @param tileSize
     * @returns {Array}
     */
    static threeFilter(features,styleMap,tileSize){
        let fs= GridFilterLabel.getImportantOtherFeatures(features,styleMap);

        let labelMap = Util.groupByLabel(fs.otherFeatures);
        let returnFeatures = [];

        let box2= [0,0,tileSize,tileSize];
        for(let label in labelMap){
            let labelArr = labelMap[label];
            if(labelArr.length == 1){
                returnFeatures.push(labelArr[0]);
            }else{
                let inBoxFeatures = [];
                for(let i = 0;i<labelArr.length;i++){
                    let feature = labelArr[i];
                    if(feature.type ==1){
                        if(GisTools.isInBox(feature.box,box2)){
                            inBoxFeatures.push(feature);
                        }else{
                            returnFeatures.push(feature);
                        }
                    }

                    if(feature.type ==2){
                        let isInBox = true;
                        for(let j =0;j<feature.boxs.length;j++){
                            let box = feature.boxs[j];
                            if(!GisTools.isInBox(box,box2)){
                                isInBox = false;
                                break;
                            }
                        }

                        if(isInBox){
                            inBoxFeatures.push(feature);
                        }else{
                            returnFeatures.push(feature);
                        }
                    }
                }

                if(inBoxFeatures.length > 0){
                    //按照权重排序
                    inBoxFeatures = Util.sortPrimaryId(inBoxFeatures);
                    //保留第一个
                    // returnFeatures.push(inBoxFeatures[0]);
                    returnFeatures = returnFeatures.concat(GridFilterLabel.distinctFeatures(inBoxFeatures,styleMap));
                }
            }
        }

        returnFeatures = returnFeatures.concat(fs.importantFeatures);
        return returnFeatures;
    }


    static distinctFeatures(features,styleMap){
        let feature = features[0];
        let field = '';
        if(feature.type == 1){
            field = 'distance';
        }
        if(feature.type == 2){
            if(feature.lineType == 'text'){
                field = 'lineTextDistance';
            }
            if(feature.lineType == 'code'){
                field = 'lineCodeDistance';
            }
        }

        let fs = [];
        fs.push(features[0]);
        for(let i = 0;i<features.length -1;i++){
            let feature = features[i];
            if(feature.hidden ==true){
                continue;
            }
            let nextFeature = features[i+1];
            //求两个点注记之间的距离
            let distance = GridFilterLabel.getDistance(feature.centerPoint,nextFeature.centerPoint);
            let style = styleMap[feature.styleId];
            let d = style[field]?style[field]:0;
            if(distance < d){
                nextFeature.hidden = true;
            }else{
                fs.push(nextFeature);
            }
        }
        return fs;
    }

    /**
     * 求两点之间的距离
     */
    static getDistance(p1,p2){
        let calX = p2[0] - p1[0];
        let calY = p2[1] - p1[1];
        return Math.pow((calX *calX + calY * calY), 0.5);
    }


    /**
     *  将注记分为重要注记和非重要注记
     * @param features
     * @param styleMap
     */
    static getImportantOtherFeatures(features,styleMap){
        let importantFeatures =[];
        let otherFeatures = [];

        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            let style = styleMap[feature.styleId];
            if(style.isImportant){
                importantFeatures.push(feature);
            }else{
                otherFeatures.push(feature);
            }
        }

        return {otherFeatures:otherFeatures,importantFeatures:importantFeatures};
    }

}

module.exports = GridFilterLabel;