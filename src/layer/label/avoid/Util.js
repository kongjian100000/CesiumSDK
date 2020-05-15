class Util{
    static measureText(label,font,ctx){
        return ctx.measureText(label).width;
    }

    //要素排序.
    static sort(features,styleMap,hasImportant){
        if(features.length > 0) {
            //从大到少排序
            return  features.sort(function (a, b) {
                if(hasImportant){
                    let aStyle = styleMap[a.styleId];
                    let bStyle = styleMap[b.styleId];
                    if(aStyle.isImportant && !bStyle.isImportant){
                        return -1;
                    }
                    if(bStyle.isImportant && !aStyle.isImportant){
                        return 1;
                    }
                }

                let aAttr = a.weight;
                let bAttr = b.weight;

                // let aId = a.attributeId;
                // let bId = b.attributeId;
                let aId = a.primaryId;
                let bId = b.primaryId;

                if(!aAttr){
                    aAttr = -1;
                }
                if(!bAttr){
                    bAttr = -1;
                }
                if (aAttr < bAttr) {
                    return 1;
                } else if (aAttr == bAttr){
                    if(aId < bId){
                        return 1;
                    }
                    else{
                        return -1;
                    }
                } else {
                    return -1;
                }
            }.bind(this));
        }
    }

    //要素排序.
    static sortPrimaryId(features){
        if(features.length > 0) {
            //从大到少排序
            return  features.sort(function (a, b) {
                let aAttr = a.weight;
                let bAttr = b.weight;

                let aId = a.primaryId;
                let bId = b.primaryId;

                if(!aAttr){
                    aAttr = -1;
                }
                if(!bAttr){
                    bAttr = -1;
                }
                if (aAttr < bAttr) {
                    return 1;
                } else if (aAttr == bAttr){
                    if(aId < bId){
                        return 1;
                    }
                    else{
                        return -1;
                    }
                } else {
                    return -1;
                }
            }.bind(this));
        }
    }

    /**
     * 把注记按照显示的注记名称分组
     * @param features
     * @returns {{}}
     */
    static groupByLabel(features){
        let labelMap = {};
        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            if(feature.label == null && feature.iconImg != null){
                if(labelMap[feature.attributeId] == null){
                    labelMap[feature.attributeId] = [];
                }
                labelMap[feature.attributeId].push(feature);
            }else {
                if (!labelMap[feature.type + '_' + feature.label]) {
                    labelMap[feature.type + '_' + feature.label] = [];
                }
                labelMap[feature.type + '_' + feature.label].push(feature);
            }
        }
        return labelMap;
    }
}
module.exports = Util;



