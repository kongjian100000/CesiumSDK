/**
 * Class: GAnnoAvoid
 * 避让策略类
 *
 * Inherits:
 *  - <Object>
 */
const GGridIndex = require('./GGridIndex');
const GLabelBox = require('./GLabelBox');
const Uitl = require('./Util');
class GAnnoAvoid{
    constructor(ctx,formatFont,bearing) {
        this.ctx = ctx;
        this.grid=null;
        if(!ctx){
            this.grid = new GGridIndex(4096, 32, 0);
        }
        this.GLabelBox = new GLabelBox(ctx,formatFont,bearing);

        this.featureMap = {};
    }

    //避让
    defaultAvoid(features,styleMap,isClient,hasImportant,ableWeight){
        if(this.ctx){
            if(isClient){
                this.grid = new GGridIndex(4096, 32, 0);
            }else{
                this.grid = new GGridIndex(512, 32, 32);
            }
        }

        if(features== null || features.length<1) return [];
        // console.time('mergeFeatures');
        // features = this.mergeFeatures(features);
        // console.timeEnd('mergeFeatures');
        // console.time('排序');

        if(ableWeight){
            //权值排序
            Uitl.sort(features,styleMap,hasImportant);
        }
        // console.timeEnd('排序');

        // console.time('避让');
        //将注记添加到单元格中，进行避让
        for(let i =0;i<features.length;i++){
            let feature = features[i];
            let style = styleMap[feature.styleId];
            this.avoidFeature(feature,style);

            this.showOrHideFeature(feature);
        }
        // console.timeEnd('避让');
        // features = this.GLabelBox.filterFeature(features);
        return features;
    }

    /**
     * 给要素设置避让的box和注记的绘制坐标
     * @param f
     */
    avoidFeature(f,style){
        if(style.show == false || f.hidden == true || !f.boxs){
            f.hidden =true;
            return;
        }

        let show = true;
        if(f.boxs){
            if(f.type == 1){
                //点注记跟其它注记避让
                show =this.avoidPoint(f,style);
            }else{
                if(f.isCollision){
                    f.hidden = true;
                    return;
                }else{
                    //线注记跟其它注记进行避让
                    show =this.avoidLine(f,style);
                }
            }
        }

            f.hidden = !show;

        //如果注记显示不下
        // if(!show){
        //     let keys = this.getCollisionFeatureIds(f);
        //     let showFeature = this.isShowCurrFeature(style,f,keys);
        //
        //     if(showFeature){
        //         this.hideCollisionFeatures(f,keys);
        //         f.hidden = false;
        //         this.addBoxFeatureCells(f,style);
        //     }else{
        //         f.hidden = true;
        //     }
        // }
    }

    /**
     * 将点注记加入到计算出的多个单元格中
     * @param feature
     */
    avoidPoint(feature,style){
        feature.boxIndex = 0;

        //如果为重要的，则不避让
        if(style.isImportant == true){
            this.addBoxFeatureCells(feature,style);
            return true;
        }

        //如果前面有小图标，并且开启了四宫格避让
        if((style.isFourDirections || style.isEightDirections) && style.texture){
            return this.addFourCollisionFeatureToCells(feature,style,0);
        }else{
            //如果没有指定的方向
            if(feature.boxIndexs && !feature.boxIndexs[0]){
                return false;
            }

            let isCollision = this.isCollision(feature.box);
            if(isCollision){
                return false;
            }
            this.addBoxFeatureCells(feature,style);
            return true;
        }
    }


    /**
     * 将线注记加入到计算出的多个单元格中
     * @param feature
     */
    avoidLine(feature,style){
        //如果为重要的，则不避让
        if(style.isImportant == true){
            this.addBoxFeatureCells(feature,style);
            return true;
        }

        //线注记是否与其它注记相交
        let isCollision = false;
        for(let i = 0 ;i<feature.boxs.length;i++){
            let box = feature.boxs[i];
            if(this.isCollision(box)){
                isCollision = true;
                break;
            }
        }

        if(isCollision){
            return false;
        }else{
            this.addBoxFeatureCells(feature,style);
            return true;
        }
    }

    /**
     * 将点注记添加到单元格中
     * @param feature 点注记
     * @param index 点注记四宫格的index
     */
    addFourCollisionFeatureToCells(feature,style,index){
        let isCollision = true;
        let box = [];
        //如果有指定的方向
        if(!feature.boxIndexs || (feature.boxIndexs && feature.boxIndexs[index])){
            box = feature.boxs[index];
            isCollision = this.isCollision(box);
        }

        // 如果相交,进行四宫,八宫格避让
        if(isCollision){
            index ++;
            if(index == feature.boxs.length){
                index = index - feature.boxs.length;
            }

            //所有方向全部避让完成，仍然相交
            if(index == 0){
                return false;
            }else{
                //换个点注记方向的box，再进行递归避让检测
               return this.addFourCollisionFeatureToCells(feature,style,index);
            }
        }else{
            //换成偏移点
            // feature.textPoint =feature.fourPoints[index];
            feature.boxIndex = index;
            feature.box = box;
            this.addBoxFeatureCells(feature,style);
            return true;
        }
    }

    /**
     *  返回注记的box是否与其它注记相交
     * @param row
     * @param col
     * @param feature
     */
    isCollision(box){
        let x1 = box[0];
        let y1 = box[1];

        let x2 = box[2];
        let y2 = box[3];
        let result = this.grid.query(x1,y1,x2,y2);
        return result.length>0;
    }

    getCollisionIds(box){
        if(!box){
            debugger;
        }
        let x1 = box[0];
        let y1 = box[1];

        let x2 = box[2];
        let y2 = box[3];
        return this.grid.query(x1,y1,x2,y2);
    }

    /**
     * 获取被压盖的注记集合
     * @param feature
     * @returns {Array}
     */
    getCollisionFeatureIds(feature){
        if(feature.type ==1){
            return this.getCollisionIds(feature.boxs[feature.boxIndex]);
        }

        if(feature.type ==2){
            let ids = [];
            for(let i = 0;i<feature.boxs.length;i++){
                let keys = this.getCollisionIds(feature.boxs[i]);
                ids = ids.concat(keys);
            }
            return ids;
        }
    }

    /**
     *  判断当前注记在它避让压盖的注记中，当前注记是否要显示
     * @param style
     * @param feature
     * @param keys
     * @returns {boolean}
     */
    isShowCurrFeature(style,feature,keys){
        if(style.isImportant){
            return true;
        }

        let weight = feature.weight;
        for(let i =0;i<keys.length;i++){
            let item =this.featureMap[keys[i]];
            if(item){
                let itemStyle = item.style;
                if(itemStyle.isImportant){
                    return false;
                }

                let itemFeature = item.feature;
                if(itemFeature.weight >= weight){
                    return false;
                }
            }
        }
        return true;
    }

    /**
     *  隐藏掉压盖的注记
     * @param keys
     */
    hideCollisionFeatures(f,keys){
        for(let i =0;i<keys.length;i++){
            let item =this.featureMap[keys[i]];
            if(item){
                let itemFeature = item.feature;
                let itemStyle = item.style;

                //重要注记和不是同一个注记不隐藏
                if(itemStyle.isImportant && itemFeature.objectId != f.objectId){
                    continue;
                }

                //隐藏掉该注记, 该注记为被其它权重更高的注记顶掉了
                itemFeature.hidden = true;
                this.showOrHideFeature(itemFeature);

                //去掉注记占据的网格
                this.removeBoxFeatureCells(itemFeature);
            }
        }
    }


    /**
     *  注记box所占的单元格标识为true
     */
    addBoxToCells(feature,key,box){
        let x1 = box[0];
        let y1 = box[1];
        let x2 = box[2];
        let y2 = box[3];
        this.grid.insert(key,x1,y1,x2,y2);
    }


    // 获取过滤后的要素.
    filterFeature(features){
        let returnFeatures = [];
        //剔除需避让的要素
        for(let i= 0 ;i<features.length;i++){
            if(!features[i].hidden ) {
                features[i].drawed = true;
                returnFeatures.push(features[i]);
            }
        }
        return returnFeatures;
    }


    addBoxFeatureCells(feature,style){
        this.featureMap[feature.primaryId] = {feature,style};

        if(feature.type == 1){
            this.addBoxToCells(feature,feature.primaryId,feature.box);
        }

        if(feature.type == 2){
            for(let i = 0 ;i<feature.boxs.length;i++){
                let box = feature.boxs[i];
                this.addBoxToCells(feature,feature.primaryId,box);
            }
        }
    }

    removeBoxFeatureCells(feature){
        if(this.featureMap[feature.primaryId]){
            delete this.featureMap[feature.primaryId];
        }else{
            //注记没有加入到网格中
            return;
        }

        if(feature.type == 1){
            this.removeBoxToCells(feature.primaryId,feature.box);
        }

        if(feature.type == 2){
            for(let i = 0 ;i<feature.boxs.length;i++){
                let box = feature.boxs[i];
                this.removeBoxToCells(feature.primaryId,box);
            }
        }
    }

    /**
     *  注记box所占的单元格标识为true
     */
    removeBoxToCells(key,box){
        let x1 = box[0];
        let y1 = box[1];
        let x2 = box[2];
        let y2 = box[3];
        this.grid.remove(key,x1,y1,x2,y2);
    }




    showOrHideFeature(feature){
        let show = !feature.hidden;

        if(feature.labels){
            for(let i = 0;i<feature.labels.length;i++){
                let label = feature.labels[i];
                label.show = show
                if(feature.type == 1 && show){
                    label.pixelOffset = feature.offsetPostion[feature.boxIndex];
                }
            }
        }

        if(feature.iconImg){
            feature.billboard.show = show;
        }
    }
}
module.exports = GAnnoAvoid;