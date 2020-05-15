/**
 * Class: GLabelBox
 *  计算注记避让box类
 *
 * Inherits:
 *  - <Object>
 */
const AvoidUtil =  require('./AvoidUtil');
const Util =  require('./Util');
class GLabelBox{
    constructor(ctx,formatFont,bearing) {
        this.boxDistance = 0;
        this.ctx =  ctx;
        this.formatFont = formatFont;
        this.bearing = bearing;
    }

    setBox(features,styleMap,isClient){
        features.forEach(function(f, index) {
            f.hidden = false;
            let style = styleMap[f.styleId];

            //如果要素不显示,没字就不画
            if(style.show == false){
                f.hidden =true;
                return;
            }

            if(f.type == 1){
                //构造点盒子
                if(isClient){
                    this.setPointBox(f,f.datas,this.ctx,style);
                }else{
                    this.setPointBox(f,f.sourceAngleData,this.ctx,style);
                }
            }
            if(f.type == 2){
                //如果是线文本注记
                if(f.lineType == 'text'){
                    if(isClient){
                        this.setTextLineBox(f,f.datas,this.ctx,style);
                    }else{
                        this.setTextLineBox(f,f.sourceAngleData,this.ctx,style);
                    }
                }

                //如果是线编码注记
                if(f.lineType == 'code') {
                    if(isClient){
                        this.setCodeLineBox(f,f.datas,this.ctx,style);
                    }else{
                        this.setCodeLineBox(f,f.sourceAngleData,this.ctx,style);
                    }
                }

                //如果是线箭头注记
                if(f.lineType == 'arrow') {
                    if(isClient){
                        this.setArrowLineBox(f,f.datas,style);
                    }else{
                        this.setArrowLineBox(f,f.sourceAngleData,style);
                    }
                }
            }
        }.bind(this));

        return features;
    }


    //构造点注记的boxs,上下左右四个方向
    setPointBox(feature,datas,ctx,style){
        style.isImportant = false;
        //对要显示的点注记内容按照用户的转换函数进行转换
        if(style.labelFunction){
            let labelFunction = new Function("label", style.labelFunction);
            try{
                feature.label = labelFunction.call({}, feature.attributes[style.labelfield]);
            }catch (e){
                console.warn(feature.label + ': 调用labelFunction失败!');
            }
        }

        let labelIsNotNull = AvoidUtil.isNotNull(feature.label);
        //如既没有文字，又没有图标,则不显示
        if(!labelIsNotNull && !feature.iconImg){
            feature.hidden =true;
            return;
        }

        let param =this.getFontWidthHeight(ctx,feature,style,labelIsNotNull);
        let graphicWidth = param.graphicWidth;
        let graphicHeight = param.graphicHeight;
        let fontWidth = param.fontWidth;
        let fontHeight = param.fontHeight;
        let maxFontheight = param.maxFontheight;

        let pointOffsetX = style.pointOffsetX;
        let pointOffsetY = style.pointOffsetY;
        if(!pointOffsetX){
            pointOffsetX = 0;
        }
        if(!pointOffsetY){
            pointOffsetY = 0;
        }
        let pt = [datas[0][0][0],datas[0][0][1]];
        pt[0] = pt[0]+pointOffsetX;
        pt[1] = pt[1]+pointOffsetY;

        if(pt[0] <0 || pt[1] <0 ){
            feature.hidden =true;
            return;
        }

        let pointBackgroundGap = style.pointBackgroundGap;
        if(style.pointHashBackground != true){
            pointBackgroundGap = 0;
        }

        let graphicDistance = style.graphicDistance;
        if(graphicHeight == 0 || graphicWidth ==0){
            graphicDistance = 0;
        }

        if(!style.hasOwnProperty('direction')){
            style.direction = 0;
        }

        let boxs = [];

        let offsetPostion = [];
        //如果有图标
        if(style.texture){
            //如果有文字
            if(feature.label){
                //避让的box比实际的box多加2个像素，避让很少部分的压盖
                boxs = this.getPointAvoidBox(pt,style,graphicDistance,
                    graphicWidth,graphicHeight,fontWidth+2,maxFontheight+2);

                offsetPostion = this.getPointOffsetPosition(style,graphicDistance,
                    graphicWidth,graphicHeight,fontWidth,fontHeight);
            }else{//只有图标，没有文字
                let middleBox = [ pt[0] - graphicWidth*0.5,
                    pt[1] -fontHeight*0.5,
                    pt[0] +graphicWidth*0.5,
                    pt[1] +fontHeight*0.5];
                middleBox = this.boxScale(middleBox,style.pointBoxDisance);
                boxs = [middleBox];

                offsetPostion = [new Cesium.Cartesian2(0,0)];
            }
        }else{
            let middleBox = [pt[0] - fontWidth*0.5,pt[1] -maxFontheight*0.5,
                pt[0] + fontWidth*0.5 ,pt[1] +maxFontheight*0.5  ];
            middleBox = this.boxScale(middleBox,style.pointBoxDisance);
            boxs = [middleBox];
            offsetPostion = [new Cesium.Cartesian2(-fontWidth*0.5,0)];
        }

        feature.boxs = boxs;
        feature.offsetPostion =offsetPostion;
        feature.box = boxs[0];
    }

    /**
     *  获取点注记的图标宽高，和注记的宽高和注记的最大高度
     * @param ctx
     * @param feature
     * @param style
     * @param labelIsNotNull
     * @returns {{}}
     */
    getFontWidthHeight(ctx,feature,style,labelIsNotNull){
        let currPara = {};
        let graphicWidth = style.graphicWidth;
        let graphicHeight = style.graphicHeight;

        let img = feature.iconImg;
        if(img){
            //如果没有
            if(!graphicWidth || !graphicHeight) {
                graphicWidth = img.width;
                graphicHeight = img.height;
            }
        }else{
            graphicWidth = 0;
            graphicHeight = 0;
        }

        currPara.graphicWidth = graphicWidth;
        currPara.graphicHeight = graphicHeight;
        currPara.fontWidth = graphicWidth;
        currPara.fontHeight = graphicHeight;

        if(labelIsNotNull){

            let lableObject = feature.labels[0];

            //各行的最宽宽度
            currPara.fontWidth =  lableObject.totalWidth;
            //文字的高度 * 文字的行数+  行间距
            currPara.fontHeight = lableObject.totalHeight;
            // 如果点符号高度（用点符号宽度代替）高于文字高度 则用点符号高度替换文字高度
            currPara.maxFontheight = currPara.fontHeight> graphicHeight ? currPara.fontHeight: graphicHeight;
        }

        return currPara;
    }

    /**
     *  获取点注记有图标也有文字时的避让boxs
     * @param pt
     * @param style
     * @param graphicDistance
     * @param graphicWidth
     * @param graphicHeight
     * @param fontWidth
     * @param maxFontheight
     * @returns {[*,*,*,*]}
     */
    getPointAvoidBox(pt,style,graphicDistance,graphicWidth,graphicHeight,fontWidth,maxFontheight){
        let rightBox = [ pt[0] - graphicWidth*0.5 ,
            pt[1] -maxFontheight*0.5,
            pt[0] +graphicWidth*0.5 +graphicDistance+ fontWidth ,
            pt[1] +maxFontheight*0.5];

        let leftBox = [pt[0] -graphicWidth*0.5 -graphicDistance- fontWidth,
            rightBox[1],pt[0] + graphicWidth*0.5,
            rightBox[3]];
        let bottomBox = [pt[0]-fontWidth*0.5,
            pt[1] -graphicHeight*0.5 , pt[0]+fontWidth*0.5,
            pt[1]+graphicHeight*0.5 + graphicDistance +maxFontheight] ;

        let topBox = [bottomBox[0],pt[1]  -graphicDistance  - maxFontheight-graphicHeight*0.5 ,
            bottomBox[2],pt[1]+graphicHeight*0.5];

        rightBox = this.boxScale(rightBox,style.pointBoxDisance);
        leftBox = this.boxScale(leftBox,style.pointBoxDisance);
        bottomBox = this.boxScale(bottomBox,style.pointBoxDisance);
        topBox = this.boxScale(topBox,style.pointBoxDisance);
        let boxs = [rightBox,leftBox,bottomBox,topBox];

        if(!style.isFourDirections && !style.isEightDirections){
            return [boxs[style.direction]];
        }

        if(style.isFourDirections){
            if(style.direction > 0){
                let item = boxs.splice(style.direction,1);
                boxs.unshift(item[0]);
            }
            return boxs;
        }


        let rightTopBox = [rightBox[0],topBox[1],
            rightBox[2],pt[1]+graphicHeight*0.5];
        let rightBottomBox = [rightBox[0],pt[1]-graphicHeight*0.5,
            rightBox[2],bottomBox[3]];
        let leftTopBox = [leftBox[0],topBox[1],
            leftBox[2],pt[1]+graphicHeight*0.5];
        let leftBottomBox = [leftBox[0],pt[1]-graphicHeight*0.5,
            leftBox[2],bottomBox[3]];

        boxs = [rightBox,leftBox,bottomBox,topBox,rightTopBox,rightBottomBox,leftTopBox,leftBottomBox];
        if(style.direction > 0){
            let item = boxs.splice(style.direction,1);
            boxs.unshift(item[0]);
        }
        return boxs;
    }

    /**
     *  获取点注记的偏移位置
     * @param style
     * @param graphicDistance
     * @param graphicWidth
     * @param graphicHeight
     * @param fontWidth
     * @param fontHeight
     * @returns {*}
     */
    getPointOffsetPosition(style,graphicDistance,graphicWidth,graphicHeight,fontWidth,fontHeight){
        //不包括点图标,用于文字绘制的起点坐标
        let rPoint = new Cesium.Cartesian2(graphicWidth*0.5 + graphicDistance ,
            0);
        let lPoint = new Cesium.Cartesian2( -graphicWidth*0.5 - graphicDistance  -fontWidth,
            0);
        let bPoint = new Cesium.Cartesian2(- fontWidth*0.5,
            graphicDistance  + fontHeight*0.5+graphicHeight*0.5);
        let tPoint = new Cesium.Cartesian2(bPoint.x,
            -graphicDistance - fontHeight*0.5-graphicHeight*0.5);

        let drawPositions = [rPoint ,lPoint  ,bPoint  ,tPoint ];

        if(!style.isFourDirections && !style.isEightDirections){
            return [drawPositions[style.direction]];
        }


        if(style.isFourDirections){
            if(style.direction > 0){
                let item = drawPositions.splice(style.direction,1);
                drawPositions.unshift(item[0]);
            }
            return drawPositions;
        }

        let rtPoint = new Cesium.Cartesian2(rPoint.x,tPoint.y);
        let rbPoint = new Cesium.Cartesian2(rPoint.x,bPoint.y);
        let ltPoint = new Cesium.Cartesian2(lPoint.x,tPoint.y);
        let lbPoint = new Cesium.Cartesian2(lPoint.x,bPoint.y);
        drawPositions = [rPoint ,lPoint ,bPoint ,tPoint ,rtPoint ,rbPoint ,ltPoint ,lbPoint];

        if(style.direction > 0){
            let item = drawPositions.splice(style.direction,1);
            drawPositions.unshift(item[0]);
        }
        return drawPositions;
    }

    /**
     * 设置线文字的box
     *  Parameters :
     *  feature - 单个线注记要素
     */
    setTextLineBox(feature,datas,ctx,style){
        let label = feature.label;
        let textPoints = datas;
        if(textPoints.length == 0){
            feature.hidden = true;
            return;
        }

        //将分段的点数据和角度数据保留，留给后面绘制
        feature.textPoints = textPoints;
        //线的boxs
        let lineBoxs = [];
        //如果线注记带底色
        if(style.lineHashBackground == true || textPoints.length ==1){
            let p = textPoints[0][0];
            if(textPoints.length >1){
                //获取线段的中间点
                let index = Math.floor(label.length/2);
                p = textPoints[index][0];
            }


            let w = feature.label.length * style.lineHeight;
            if(ctx){
                ctx.save();
                if(this.formatFont){
                    ctx.font = Util.formatFont(style.lineFillFont,1,true);
                }else{
                    ctx.font = style.lineFillFont;
                }

                w = Util.measureText(feature.label,ctx.font,ctx);
                ctx.restore();
            }else{
                // w = w * scale;
            }


            if(!style.lineBackgroundGap){
                style.lineBackgroundGap = 0;
            }
            let minX = p[0] - w/2 -style.lineBackgroundGap;
            let maxX =  p[0]+ w/2 +style.lineBackgroundGap;
            let minY = p[1] -style.lineHeight*0.5-style.lineBackgroundGap;
            let maxY = p[1]+style.lineHeight*0.5 +style.lineBackgroundGap;
            let box = [minX,minY,maxX,maxY];
            this.boxScale(box,style.lineTextBoxDisance);
            lineBoxs.push(box);
        }else{
            //如果文字需要旋转
            if(style.lineTextRotate || style.lineTextRotate == 0){
                for(let m = 0;m<textPoints.length;m++){
                    textPoints[m][1] = style.lineTextRotate;
                }
            }else{
                //如果文字注记旋转角度方向不一致(有的字向左，有的字向右旋转)，则调整为一致
                this.textToSameBearing(feature.angle,textPoints);

                if(!style.isImportant){
                    //判断线文字之间的最大夹角是否大于指定的阈值
                    if(this.isMessy(feature,textPoints,style,label)){
                        feature.hidden = true;
                        return;
                    }
                }
            }

            //获取每个字的box,判断每个字之前是否有压盖
            let boxs = this.getLineBoxs(label,textPoints,style,ctx);
            if(boxs){
                lineBoxs =lineBoxs.concat(boxs);
            }else{
                feature.hidden = true;
                return;
            }
        }
        feature.boxs = lineBoxs;
    }

    boxScale(box,pointBoxDisance){
        if(!pointBoxDisance && pointBoxDisance!=0){
            pointBoxDisance = this.boxDistance;
        }

        box[0] = box[0]-pointBoxDisance*0.5;
        box[1] = box[1]-pointBoxDisance*0.5;
        box[2] = box[2]+pointBoxDisance*0.5;
        box[3] = box[3]+pointBoxDisance*0.5;
        return box;
    }

    /**
     * 如果文字注记旋转角度方向不一致(有的字向左，有的字向右旋转)，则调整为一致
     * @param textPoints
     */
    textToSameBearing(angle,textPoints){
        //保证竖方向的字是正的
        if(angle >= 45){
            angle = angle - 90;
        }else{
            if(angle <= - 45){
                angle = angle + 90;
            }
        }


        for(let i = 0;i<textPoints.length;i++){
            let p = textPoints[i][1];
            let offsetAngle = angle - p;
            if(offsetAngle > 45){
                textPoints[i][1] = p +90;
            }
            if(offsetAngle < -45){
                textPoints[i][1] = p -90;
            }
        }
    }


    /**
     * 设置线编码的box
     *  Parameters :
     *  feature - 单个线注记要素
     */
    setCodeLineBox(feature,datas,ctx,style){
        let codePoints = datas;
        if(codePoints.length == 0){
            feature.hidden = true;
            return;
        }

        //如果要显示道路编号
        let p = codePoints[0][0];
        let w = feature.label.length * style.codeLineHeight;
        let scale = 1;
        if(ctx){
            ctx.save();
            if(this.formatFont){
                ctx.font = Util.formatFont(style.codeLineFillFont,1,true);
            }else{
                ctx.font = style.codeLineFillFont;
            }

            w = Util.measureText(feature.label,ctx.font,ctx);
            ctx.restore();
        }else{
            // scale = codePoints[0][3];
            // w = w*scale;
        }


        let minX = p[0] - w/2 -style.codeLineBackgroundGap;
        let maxX =  p[0]+ w/2 +style.codeLineBackgroundGap;
        let minY = p[1] -style.codeLineHeight*0.5-style.codeLineBackgroundGap;
        let maxY = p[1]+ style.codeLineHeight*0.5 +style.codeLineBackgroundGap;
        let box = [minX,minY,maxX,maxY];
        this.boxScale(box,style.lineCodeBoxDisance);
        feature.boxs = [box];
        feature.codePoint = p;
    }

    /**
     * 设置线箭头的box
     *  Parameters :
     *  feature - 单个线注记要素
     */
    setArrowLineBox(feature,datas,style){
        let arrowPoints = datas;
        if(arrowPoints.length != 3){
            feature.hiden = true;
            return;
        }

        let p = arrowPoints[0][0];
        let p1 = arrowPoints[1][0];

        let minX = p[0]<p1[0]?p[0]:p1[0];
        let maxX = p[0]>p1[0]?p[0]:p1[0];
        let minY = p[1]<p1[1]?p[1]:p1[1];
        let maxY = p[1]>p1[1]?p[1]:p1[1];
        let box = [minX,minY,maxX,maxY];
        this.boxScale(box,style.lineArrowBoxDisance);
        feature.boxs = [box];
        feature.arrowPoint = arrowPoints;
    }


    // // 获取过滤后的要素.
    // filterFeature(features){
    //     let returnFeatures = [];
    //     //剔除需避让的要素
    //     for(let i= 0 ;i<features.length;i++){
    //         if(!features[i].hidden ) {
    //             returnFeatures.push(features[i]);
    //         }
    //     }
    //     return returnFeatures;
    // }

    /**
     * 判断线文字之间的最大夹角是否大于指定的阈值
     *  Parameters :
     * textPoints - 文本注记的线段数组
     *  style -要素的样式
     */
    isMessy(feature,textPoints,style,label){
        let firstPoint = textPoints[0][0];
        let minX = firstPoint[0];
        let minY = firstPoint[1];
        let maxX = firstPoint[0];
        let maxY = firstPoint[1];

        let minAngle = textPoints[0][1];
        let maxAngle = textPoints[0][1];
        for(let i = 0;i<label.length;i++){
            let currPoint = textPoints[i][0];
            let currAngle = textPoints[i][1];
            if(currPoint[0]>maxX)   // 判断最大值
                maxX=currPoint[0];
            if(currPoint[0]<minX)   // 判断最小值
                minX=currPoint[0];

            if(currPoint[1]>maxY)   // 判断最大值
                maxY=currPoint[1];
            if(currPoint[1]<minY)   // 判断最小值
                minY=currPoint[1];

            if(currAngle>maxAngle)   // 判断最大值
                maxAngle=currAngle;
            if(currAngle<minAngle)   // 判断最小值
                minAngle=currAngle;
        }

        //如果文字之间，相差的最大角度大于配置的角度度则不画
        if(maxAngle -minAngle > style.angle){
            if(style.angleSwitch ==false  && style.angleColor){
                feature.lineFillStyle = style.angleColor;
            }else{
                return true;
            }
        }
        return false;
    }

    /**
     * 检测线文字之间是否有自压盖
     *  Parameters :
     * boxs -
     *  style -要素的样式
     */
    getLineBoxs(label,textPoints,style,ctx){
        //和其它注记避让的boxs
        let boxs = [];
        //自相交避让的boxs
        let owmCrashBoxs = [];
        for(let i = 0;i<label.length;i++){
            let pt = textPoints[i][0];
            //解决旋转后的注记和不旋转的注记样式不一致的问题
            if(textPoints[i][1] == 0){
                textPoints[i][1] = 0.5;
            }

            let scale = 1;
            if(!ctx){
                // scale = textPoints[i][3];
            }

            //考虑到线文字注记有角度偏转，box统一增加1.2倍
            let labelBox = [pt[0]-style.lineHeight*1.2*0.5*scale,pt[1]-style.lineHeight*1.2*0.5*scale,
                pt[0]+style.lineHeight*1.2*0.5*scale,pt[1]+style.lineHeight*1.2*0.5*scale];
            let owmCrashBox = [pt[0]-style.lineHeight*0.5*scale,pt[1]-style.lineHeight*1.2*0.5*scale,
                pt[0]+style.lineHeight*0.5*scale,pt[1]+style.lineHeight*0.5*scale];
            owmCrashBoxs.push(owmCrashBox);
            boxs.push(labelBox);
        }


        if(!style.isImportant){
            for(let j = 0;j<owmCrashBoxs.length-1;j++){
                let box1 = owmCrashBoxs[j];
                for(let k=j+1 ;k<owmCrashBoxs.length ;k++){
                    let box2 = owmCrashBoxs[k];
                    if(this.crashBox(box1,box2)){
                        return null;
                    }
                }
            }
        }
        return boxs;
    }

    // 两个盒子是否相交.
    crashBox(ibox,jbox){
        return ibox[0] <= jbox[2] &&
            ibox[2]  >= jbox[0] &&
            ibox[1]  <= jbox[3] &&
            ibox[3]  >= jbox[1] ;
    }


    /**
     *  更新线文字注记在gl绘制中的角度
     * @param textPoints
     */
    updateAngle(textPoints){
        let angle = AvoidUtil.getUpdateAngle(textPoints[0][1],this.bearing);

        for(let i = 0;i<textPoints.length;i++){
            textPoints[i][2] = textPoints[i][1]+angle;
        }
    }

}

module.exports = GLabelBox;