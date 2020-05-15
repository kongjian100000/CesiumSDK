let Font = null
const _path = './../../../../';
class AvoidUtil{
    static getRealLength(str) {
        var length = str.length;
        var realLength = 0
        for (var i = 0; i < length; i++) {
            let charCode = str.charCodeAt(i);
            if (charCode >= 0 && charCode <= 128) {
                realLength += 0.5;
            } else {
                realLength += 1;
            }
        }
        return realLength;
    }

    /**
     * 判断文本是否不为空
     *  Parameters :
     *  label - 要显示的文本
     *
     */
    static isNotNull(label){
        if(!label && label !=0){
            return false;
        }

        //如果是字符串
        if(typeof(label) == 'string'){
            label = label.toLowerCase();
            if(label == ''|| label == 'undefined' || label == 'null'){
                return false;
            }
        }
        return true;
    }

    /**
     * 统一转为微软雅黑
     */
    static formatFont(font,ratio,isChangeFont){
        var fontArr = font;
        if(isChangeFont){
            if(Font == null){
                Font = require(_path + 'src/utils/font/Font');
            }

            var farr = font.split(' ');
            if(farr.length - 1 != 0){
                if('italic' == farr[0].toLowerCase()){
                    if(farr[arr.length -1] != 'simbei'){
                        farr[farr.length -1] = Font.getDefaultFont();
                    }
                }
            }
            farr[farr.length -1] = 'SimHei';
            fontArr =farr.join(' ');
        }

        return fontArr.replace(
            /(\d+\.?\d*)(px|em|rem|pt)/g,
            function(w, m, u) {
                if(m < 12){
                    m = 12 * ratio;
                }else{
                    m = Math.round(m) * ratio;
                }
                return m + u;
            }
        );
    };

    /**
     * 对注记进行去空格等处理
     */
    static formatLabel(label){
        if(label && label.length >0){
            //去掉不可见字符
            label =  label.replace( /([\x00-\x1f\x7f])/g,'');
            label = label.replace(/(\s*$)/g,"");
            label = label.replace(/<br\/>/g, "");
        }
        return label;
    }

    //获取两点连线与y轴的夹角
    static getAngle( p1,p2){
        if(!p2 || !p1){
            debugger;
        }
        if(p2[0]-p1[0] == 0){
            if(p2[1]>p1[0]){
                return 90;
            }else{
                return -90;
            }
        }
        let k = (p2[1]-p1[1])/(p2[0]-p1[0]);
        let angle = 360*Math.atan(k)/(2*Math.PI);
        return angle;
    }

    /**
     *  更新线文字注记的角度
     * @param angle
     * @returns {*}
     */
    static getUpdateAngle(angle,bearing){
        let totalAngle = angle - bearing;
        // if( (totalAngle >= 0 && totalAngle <= 45) || (totalAngle >= -45 && totalAngle <= 0)){
        //     return 0;
        // }
        if(totalAngle > 45 && totalAngle <= 135){
            return  -90;
        }
        if(totalAngle > 135 && totalAngle <= 225){
            return  - 180;
        }

        if(totalAngle >= -225 && totalAngle < -135){
            return  180;
        }
        if(totalAngle >= -135 && totalAngle < -45){
            return  90;
        }
        return 0;
    }

    /**
     *  更新线文字注记的角度
     * @param angle
     * @returns {*}
     */
    static updateAngle(angle,bearing){
        let totalAngle = angle - bearing;
        // if( (totalAngle >= 0 && totalAngle <= 45) || (totalAngle >= -45 && totalAngle <= 0)){
        //     return angle;
        // }
        if(totalAngle > 45 && totalAngle <= 135){
            return angle -90;
        }
        if(totalAngle > 135 && totalAngle <= 225){
            return angle - 180;
        }

        if(totalAngle >= -225 && totalAngle < -135){
            return angle + 180;
        }
        if(totalAngle >= -135 && totalAngle < -45){
            return angle + 90;
        }
        return angle;
    }

    /**
     * 是否需要改变线的方向
     *  Parameters :
     *  p1 - 线段起点
     *  p2 -线段的重点
     *  angle - 两点连线与x轴的夹角
     */
    static isChangeDirection(label,p1,p2,angle){
        let showChange = false;
        //判断是否包含汉字
        if(/.*[\u4e00-\u9fa5]+.*$/.test(label)) {
            //如果是垂直线
            if(p1[0] == p2[0]){
                if(p1[1]>p2[1]){
                    showChange = true;
                    return showChange;
                }
            }

            //如果是反斜线，并且夹角与x轴的夹角大于45度
            if(angle<-45 && angle>-90 ){
                if(p1[0]< p2[0]){
                    showChange = true;
                }
            }else{
                if(p1[0]> p2[0]){
                    showChange = true;
                }
            }
        }else{
            if(p1[0] > p2[0]){
                showChange = true;
            }
        }
        return showChange;
    }


    /**
     * 如果文字注记旋转角度方向不一致(有的字向左，有的字向右旋转)，则调整为一致
     * @param textPoints
     */
    static textToSameBearing(angle,textPoints){
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
}

module.exports = AvoidUtil;



