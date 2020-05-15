/**
 * Created by kongjian on 2017/5/1.
 */
const LabelDrawer = require('./avoid/LabelDrawer');
const ParseLabelData = require('./avoid/ParseLabelData');
const GridFilterLabel = require('./avoid/GridFilterLabel');
const LabelCollectionExt = require('../../cover/LabelCollectionExt');

const BEGIN = 1;
const LOADED = 2;
const REMOVED = 3;
class LabelTile{
    constructor(name,xyz,tileSize,rectangle,data,styleFun,level,styleMap,
                textures,scene) {
        this.name = name;
        this.xyz = xyz;
        this.tileSize = tileSize;
        this.rectangle = rectangle;
        this.sourceData = data;
        this.styleFun = styleFun;
        this.level = level;
        this.styleMap = styleMap;
        this.textures = textures;
        this.scene = scene;

        // this.labelCollection = new Cesium.LabelCollection();
        this.labelCollection = new LabelCollectionExt({blendOption:Cesium.BlendOption.OPAQUE});
        this.billboardCollection = new Cesium.BillboardCollection({blendOption:Cesium.BlendOption.OPAQUE});
        //全局是否开启避让
        this.ableAvoid = true;
        //全局是否开启权重排序
        this.ableWeight = true;
        //过滤格网大小
        this.cellsize = 4;
        //网格内保留点的个数
        this.maxPerCell = 1;

        this.state =BEGIN;
        this.ready = false;
        this.parse();
    }

    parse(){
        console.time('执行样式文件');
        let drawer = new LabelDrawer(this.sourceData,this.styleMap,this.level);
        this.styleFun.call({}, drawer, this.level);
        console.timeEnd('执行样式文件');

        console.time('注记解析');
        //转换瓦片坐标为屏幕坐标,并构造label数据
        let features = ParseLabelData.parseLayerDatas(
            this.sourceData,this.styleMap,this.textures,this.xyz,true);
        console.timeEnd('注记解析');

        console.time('去除瓦片外的注记');
        //移除瓦片外的点注记
        features.pointFeatures = GridFilterLabel.removeTileOutPointFeatures(features.pointFeatures,this.tileSize);
        console.timeEnd('去除瓦片外的注记');
        console.time('第一次过滤');
        //第一次格网过滤
        let labelFeatures = GridFilterLabel.fristFilter(features.pointFeatures,features.lineFeatures,
            this.styleMap,this.ableWeight,true, this.tileSize,this.cellsize,this.tileSize*0.5,this.maxPerCell);
        console.timeEnd('第一次过滤');

        console.time('第二次过滤');
        //第二次格网过滤
        this.features = GridFilterLabel.scendFilter(labelFeatures.pointFeatures,labelFeatures.lineFeatures,this.styleMap,this.ableWeight,true,this.tileSize, this.cellsize, this.tileSize*0.5);
        console.timeEnd('第二次过滤');

        console.time('转换为经纬度');
        //瓦片坐标转成经纬度坐标
        this.toCartesian3(this.features);
        console.timeEnd('转换为经纬度');

        console.time('转换为绘制对象参数');
        //构造需要绘制的label和Billboard对象
        this.toLabelBillboards(this.features);
        console.timeEnd('转换为绘制对象参数');
    }


    toCartesian3(features){
        for(let i =0;i<features.length;i++){
            let feature = features[i];
            feature.anglePositions = [];
            if(feature.label){
                feature.label = feature.label.replace(/\s+/g, ' ');
            }

            for(let j = 0;j<feature.sourceAngleData.length;j++){
                let item  = feature.sourceAngleData[j];
                let x = item[0][0];
                let y = item[0][1];
                let lon = Cesium.Math.toDegrees(this.rectangle.west + this.rectangle.width/ this.tileSize* x);
                let lat = Cesium.Math.toDegrees(this.rectangle.north - this.rectangle.height/ this.tileSize* y);
                let height = 100;
                let position = Cesium.Cartesian3.fromDegrees(lon, lat,height);
                let anglePosition = [];
                anglePosition.push(position);
                anglePosition.push(item[1]);
                feature.anglePositions.push(anglePosition);
            }
        }
    }

    /**
     * 将经世界坐标转成屏幕坐标
     */
    updateScreenPt(features){
        for(let i =0;i<features.length;i++) {
            let feature = features[i];
            feature.datas = [];
            for(let j = 0;j<feature.anglePositions.length;j++){
                let anglePostion = feature.anglePositions[j];
                var pt = Cesium.SceneTransforms.wgs84ToWindowCoordinates(this.scene, anglePostion[0]);
                if(pt){
                    feature.datas.push([[pt.x,pt.y],anglePostion[1]]);
                }else{
                    //在视线外
                    feature.datas.push([[-500,-500],anglePostion[1]]);
                }
            }
        }
    }

    /**
     * 将要素转换成能绘制的label和Billboard对象
     * @param features
     */
    toLabelBillboards(features){
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            if(feature.type == 1){
                this.toPointLabelOption(feature);
            }
            // if(feature.type == 2){
            //     this.toLineLabelOption(feature);
            // }
        }
    }


    /**
     *
     * @param feature
     */
    toPointLabelOption(feature){
        feature.labelOptions = [];
        let style = this.styleMap[feature.styleId];
        let position = feature.anglePositions[0][0];

        let iconWidth = feature.iconImg? feature.iconImg.width:0;
        let dis = style.graphicDistance + iconWidth *0.5;
        let option = {
            show:false,
            disableDepthTestDistance:Number.POSITIVE_INFINITY,
            text:feature.label,
            position:position,
            font:style.pointFillFont,
            style: Cesium.LabelStyle.FILL,
            verticalOrigin:Cesium.VerticalOrigin.CENTER,
            pixelOffset: new Cesium.Cartesian2(dis, 0),
            fillColor: Cesium.Color.fromCssColorString(style.pointFillStyle).withAlpha(style.pointFillAlpha)
        };

        //有背景框
        if (style.pointHashBackground == true){
            option.showBackground = true;
            option.backgroundColor =Cesium.Color.fromCssColorString(style.pointBackgroundColor).withAlpha(style.pointBackgroundAlpha);
            option.backgroundPadding = new Cesium.Cartesian2(style.pointBackgroundGap, style.pointBackgroundGap);
        }

        //有描边
        if (style.pointHashOutline == true){
            option.style =Cesium.LabelStyle.FILL_AND_OUTLINE;
            option.outlineColor = Cesium.Color.fromCssColorString(style.pointStrokeStyle).withAlpha(style.pointStrokeAlpha),
            option.outlineWidth = style.pointLineWidth+2;
        }

        feature.labelOptions.push(option);
        //有图标
        if(feature.iconImg){
            let option = this.toBillboardOption(feature.iconImg,style,position);
            feature.billboardOption = option;
        }
    }

    toLineLabelOption(feature){
        feature.labelOptions = [];
        let style = this.styleMap[feature.styleId];
        if(style.lineHashBackground == true){
            let index = Math.floor(feature.anglePositions.length/2);
            let position = feature.anglePositions[index][0];

            let option = {
                show:false,
                disableDepthTestDistance:Number.POSITIVE_INFINITY,
                text:feature.label,
                position:position,
                font:style.lineFillFont,
                style: Cesium.LabelStyle.FILL,
                verticalOrigin:Cesium.VerticalOrigin.CENTER,
                horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
                fillColor: Cesium.Color.fromCssColorString(style.lineFillStyle).withAlpha(style.lineFillAlpha)
            };

            //有背景框
            option.showBackground = true;
            option.backgroundColor =Cesium.Color.fromCssColorString(style.backgroundColor).withAlpha(style.backgroundAlpha),
            option.backgroundPadding = style.lineBackgroundGap;

            feature.labelOptions.push(option);
        }else if(feature.anglePositions.length == 1){
            let position = feature.anglePositions[0][0];
            let option = {
                show:false,
                disableDepthTestDistance:Number.POSITIVE_INFINITY,
                text:feature.label,
                position:position,
                font:style.lineFillFont,
                style: Cesium.LabelStyle.FILL,
                verticalOrigin:Cesium.VerticalOrigin.CENTER,
                horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
                fillColor: Cesium.Color.fromCssColorString(style.lineFillStyle).withAlpha(style.lineFillAlpha)
            };

            feature.labelOptions.push(option);
        }else{
            for(let i = 0;i<feature.anglePositions.length;i++){
                let anglePosition = feature.anglePositions[i];
                let position = anglePosition[0];
                let option = {
                    show:false,
                    disableDepthTestDistance:Number.POSITIVE_INFINITY,
                    text:feature.label,
                    position:position,
                    font:style.lineFillFont,
                    style: Cesium.LabelStyle.FILL,
                    verticalOrigin:Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
                    rotation:anglePosition[1],
                    fillColor: Cesium.Color.fromCssColorString(style.lineFillStyle).withAlpha(style.lineFillAlpha)
                };

                //有描边
                if (style.lineHashOutline == true){
                    option.style =Cesium.LabelStyle.FILL_AND_OUTLINE;
                    option.outlineColor = Cesium.Color.fromCssColorString(style.lineStrokeStyle).withAlpha(style.lineStrokeAlpha),
                    option.outlineWidth = style.lineLineWidth;
                }

                feature.labelOptions.push(option);
            }
        }
    }

    /**
     *
     * @param feature
     */
    toBillboardOption(image,style,position) {
        let width = style.graphicWidth;
        let height = style.graphicHeight;

        if(!width || !height){
            width = image.width;
            height = image.height;
        }

        let billboardOption = {
            show:false,
            disableDepthTestDistance:Number.POSITIVE_INFINITY,
            image:image,
            width:width,
            height:height,
            position:position
        };
        return billboardOption;
    }



    addToMap(){
        // console.time('primitives.add');
        this.scene.primitives.add(this.labelCollection);
        this.scene.primitives.add(this.billboardCollection);
        // console.timeEnd('primitives.add');

        console.time('构建绘制对象并添加到绘制列表中');
        if(this.state == BEGIN){
            this.toDrawLabel();
            this.updateNow();
        }
        console.timeEnd('构建绘制对象并添加到绘制列表中');
        console.log('注记个数：'+this.features.length);

        this.state = LOADED;
    }

    toDrawLabel(){
        for(let i =0;i<this.features.length;i++){
            let feature  = this.features[i];
            if(feature.type != 1){
                continue;
            }
            feature.labels = [];
            for(let j = 0;j<feature.labelOptions.length;j++){
                feature.labels.push(this.labelCollection.add(feature.labelOptions[j]));
            }
            if(feature.iconImg){
                feature.billboard = this.billboardCollection.add(feature.billboardOption);
            }
        }
    }

    updateNow(){
        console.time('文字动态构建更新');
        this.labelCollection.update(this.scene._frameState);
        console.timeEnd('文字动态构建更新');

        console.time('图标更新');
        this.billboardCollection.update(this.scene._frameState);
        console.timeEnd('图标更新');
    }

    remove(){
        this.scene.primitives.remove(this.labelCollection);
        this.scene.primitives.remove(this.billboardCollection);
        this.state = REMOVED;
    }



    show(){
        if(this.state == BEGIN || this.state == REMOVED){
            this.addToMap();
        }
    }

    destroy(){
        this.remove();
        this.labelCollection.destroy();
        this.billboardCollection.destroy();
    }

}

module.exports = LabelTile;

