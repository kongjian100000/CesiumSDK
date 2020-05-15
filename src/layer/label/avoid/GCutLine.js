const GDistance = require('./GDistance');
const GisTools = require('./../../../utils/gistools/GisTools');
const AvoidUtil = require('./AvoidUtil');
class GCutLine{
    static cutLineFeature(feature,style,scale){
        let fs = [];
        let index = 0;
        if(feature.sourceData.length < 4){
            return fs;
        }

        let lineText = this.createLineTextFeatrue(feature,style,index,scale);
        index = lineText.index;
        if(lineText.feature){
            fs.push(lineText.feature);
        }

        let lineCode= this.createLineCodeFeatrue(feature,style,index);
        index = lineCode.index;
        if(lineCode.feature){
            fs.push(lineCode.feature);
        }

        let lineArrow= this.createLineArrowFeatrue(feature,style,index);
        if(lineArrow.feature){
            fs.push(lineArrow.feature);
        }
        return fs;
    }

    /**
     * 创建线文字注记
     *  Parameters :
     *  feature
     *  index - 可用的line的index位置
     *  scale 字间距缩放比例
     */
    static createLineTextFeatrue(feature,style,index,scale){
        let line = feature.sourceData;
        let d = new GDistance();
        let gaps = [];
        let textFeature =null;

        if(!scale){
            scale = 1;
        }

        if(AvoidUtil.isNotNull(feature.label)) {
            //线注记的文字内容
            feature.label = feature.label+ '';
            for (let count = 0; count < feature.label.length; count++) {
                gaps.push((style.lineHeight*1.2 +2+ style.gap)*scale);
            }

            let cloneGaps = [].concat(gaps);
            let points = d.getNodePath(line, gaps);
            let textPoints = points.pointList;

            if(textPoints.length > 1){
                index = points.index;
                //需要延长的字个数
                let delayLength = feature.label.length - textPoints.length;
                if(delayLength > 0){
                    index = line.length;
                    //摆不下的字数少于3个字延长
                    if(delayLength <style.extendedNum){
                        this.delayTextPoint(line,textPoints,feature.label,(style.chinaLabelWidth + style.gap)*scale);
                    }else{
                        return {feature:null,index:index};
                    }
                }

                let p1 = [textPoints[0][0][0], textPoints[0][0][1]];
                let p2 = textPoints[textPoints.length -1][0];

                //获取两点连线与x轴的夹角
                let angle = AvoidUtil.getAngle(p1,p2);
                textFeature =  this.cloneFeature(feature);
                textFeature.angle = angle;

                if(style.changeDirection != false){
                    //改变方向
                    //判断是否应该换方向
                    let showChanged = AvoidUtil.isChangeDirection(feature.label,p1, p2,angle);
                    if (showChanged) {
                        textPoints = textPoints.reverse();
                    }
                }

                textFeature.attributeId = feature.layerName +'__'+ feature.objectId +'_text';
                textFeature.sourceAngleData = textPoints;
                textFeature.lineType = 'text';
            }else{
                //gl 暂时不支持画一个点的线注记
                // if(style.isTransverse && !style.showRoadCode){
                //     textFeature =  this.cloneFeature(feature);
                //     textFeature.attributeId = feature.layerName +'__'+ feature.objectId +'_text';
                //     textFeature.sourceAngleData = [[[line[0],line[1]],0]];
                //     textFeature.lineType = 'text';
                //     index =2;
                // }
            }

            if(textFeature){
                //平移
                if(style.lineOffset && textFeature.sourceAngleData.length > 1){
                    textFeature.sourceAngleData = GisTools.lineOffset(textFeature.sourceAngleData,style.lineOffset);
                }
                textFeature.textPoints = textFeature.sourceAngleData;
                textFeature.primaryId = textFeature.attributeId + '_row_' + feature.xyz.y + '_col_' + feature.xyz.x + '_level_' + feature.xyz.l
                    + '_x_' + textFeature.sourceAngleData[0][0][0] + '_y_' + textFeature.sourceAngleData[0][0][1];
                textFeature.id = textFeature.attributeId + '_row_' + feature.xyz.y + '_col_' + feature.xyz.x + '_level_' + feature.xyz.l
                    + '_x_' + line[0] + '_y_' + line[1];
            }
        }
        return {feature:textFeature,index:index};
    }

    /**
     * 创建线编码注记
     *  Parameters :
     *  feature
     *  index - 可用的line的index位置
     */
    static createLineCodeFeatrue(feature,style,index){
        let line = feature.sourceData;
        let d = new GDistance();
        let gaps = [];
        let codeFeature =null;

        let roadLabel = feature.roadCodeLabel;
        //如果有道路编码
        if(style.showRoadCode && AvoidUtil.isNotNull(roadLabel) && index < line.length){
            let codeLine = line.slice(index,line.length -1);
            //默认是30个像素
            gaps.push(30);
            let cPoints = d.getNodePath(codeLine, gaps);
            let codePoints = cPoints.pointList;
            if(codePoints.length  == 1){
                index = index + cPoints.index;
                codeFeature =  this.cloneFeature(feature);
                codeFeature.attributeId = feature.layerName +'__'+ feature.objectId+'_code';
                codeFeature.sourceAngleData = codePoints;
                codeFeature.lineType = 'code';
                codeFeature.label = roadLabel+'';
            }

            if(codePoints.length ==0){
                codeFeature =  this.cloneFeature(feature);
                codeFeature.attributeId = feature.layerName +'__'+ feature.objectId+'_code';
                codeFeature.sourceAngleData = [[[line[0],line[1]],0]];
                codeFeature.lineType = 'code';
                codeFeature.label = roadLabel+'';
                index = 2;
            }

            codeFeature.textPoints = [codeFeature.sourceAngleData[0][0]];
            codeFeature.primaryId = codeFeature.attributeId + '_row_' + feature.xyz.y + '_col_' + feature.xyz.x + '_level_' + feature.xyz.l
                + '_x_' + codeFeature.sourceAngleData[0][0][0] + '_y_' + codeFeature.sourceAngleData[0][0][1];
            codeFeature.id = codeFeature.attributeId + '_row_' + feature.xyz.y + '_col_' + feature.xyz.x + '_level_' + feature.xyz.l
                + '_x_' + line[0] + '_y_' + line[1];
        }
        return {feature:codeFeature,index:index};
    }

    /**
     * 创建线箭头注记
     *  Parameters :
     *  feature
     *  index - 可用的line的index位置
     */
    static createLineArrowFeatrue(feature,style,index){
        let line = feature.sourceData;
        let d = new GDistance();
        let gaps = [];
        let arrowFeature =null;

        //如果有箭头
        if(style.showArrow && index < line.length){
            let arrowLine = line.slice(index,line.length -1);
            gaps.push(16);
            gaps.push(16);
            let aPoints = d.getNodePath(arrowLine, gaps);
            let arrowPoints = aPoints.pointList;

            if(arrowPoints.length == 2){
                arrowFeature =  this.cloneFeature(feature);
                arrowFeature.attributeId = feature.layerName +'__'+ feature.objectId+'_arrow';
                arrowFeature.sourceAngleData = arrowPoints;
                arrowFeature.textPoints = arrowPoints;
                arrowFeature.lineType = 'arrow';

                arrowFeature.primaryId = arrowFeature.attributeId + '_row_' + feature.xyz.y + '_col_' + feature.xyz.x + '_level_' + feature.xyz.l
                    + '_x_' + arrowFeature.sourceAngleData[0][0][0] + '_y_' + arrowFeature.sourceAngleData[0][0][1];
                arrowFeature.id = arrowFeature.attributeId + '_row_' + feature.xyz.y + '_col_' + feature.xyz.x + '_level_' + feature.xyz.l
                    + '_x_' + line[0] + '_y_' + line[1];
            }
        }
        return {feature:arrowFeature,index:index};
    }

    /**
     * 当线文字放不下时，获取延长线上的点
     *  Parameters :
     *  line - 原始线坐标
     *  textPoints - 切割之后的点坐标
     *  label - 线注记
     *  gap - 每个字之间的间隔
     *  showChanged
     *
     */
    static delayTextPoint(line,textPoints,label,gap){
        let fristPoint = null;
        let secondPoint = null;
        //如果只能放下一个字
        if(textPoints.length == 1){
            fristPoint = [line[0],line[1]];
        }else{
            fristPoint = textPoints[textPoints.length-2][0];
        }
        secondPoint = textPoints[textPoints.length-1][0];
        let angle = textPoints[textPoints.length-1][1];

        let len = textPoints.length;
        for(let i = 1;i<label.length - len +1;i++){
            let p = this.getPoint(fristPoint,secondPoint,gap*i);
            let textPoint = [p,angle];
            textPoints.push(textPoint);
        }
    }

    /**
     * 克隆feature
     *  Parameters :
     *  feature - 单个线注记要素
     */
    static cloneFeature(feature){
        return {type:feature.type,datas:feature.datas,centerPoint:feature.centerPoint,sourceData:feature.sourceData,label:feature.label,roadCodeLabel:feature.roadCodeLabel,
            attributes:feature.attributes,attributeId:feature.attributeId,styleId:feature.styleId,textures:feature.textures,xyz:feature.xyz,
            lineType:feature.lineType,weight:feature.weight,layerName:feature.layerName,objectId:feature.objectId};
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
     * 获取线的长度
     */
    static getLineDistance(line){
        if(line.length <4){
            return 0;
        }

        let dis = 0;
        for(let i = 0;i<line.length/2-1;i++){
            let p1 = [line[2*i],line[2*i+1]];
            let p2 = [line[2*(i+1)],line[2*(i+1)+1]];
            dis = dis + this.getDistance(p1,p2);
        }
        return dis;
    }

    /**
     * 已知两点，延长距离，获取延长线上的点坐标
     */
    static getPoint(p1,p2,d){
        let xab = p2[0] - p1[0];
        let yab = p2[1] - p1[1];
        let xd = p2[0];
        let yd = p2[1];
        if(xab == 0){
            if(yab > 0){
                yd = p2[1] + d;
            }else{
                yd = p2[1] - d;
            }
        }else{
            let xbd = Math.sqrt((d * d)/((yab/xab) * (yab/xab) + 1));
            if (xab < 0) {
                xbd = -xbd
            }

            xd = p2[0] + xbd;
            yd = p2[1] + yab / xab * xbd;
        }
        return [xd,yd];
    }
}

module.exports = GCutLine;