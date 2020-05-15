/**
 * Created by user on 2020/3/16.
 */
const Light = require('./Light.js');
/**
 *  房屋上下扫描光源,该光源不能添加地表感光对象
 */
class UpDownScanLight extends  Light{
    constructor(){
        super();
        //光源类型
        this.type = 'UpDownScanLight';
    }

    /**
     *  更新光源参数数组
     */
    updateLightArray(){
    }

    /**
     *  获取地面的光源shader
     */
    getGlobeSurfaceShader(){
        // return {
        //     vertexShaderSource:Cesium.ShaderSource.replaceMain(this.getGlobeSurfaceVS(),this.type),
        //     fragmentShaderSource:Cesium.ShaderSource.replaceMain(this.getFs(),this.type)
        // }
    }

    /**
     *  获取使用Primitive绘制的纯色面的shader
     */
    getPolygonColorPrimitiveShader(){
        return {
            vertexShaderSource:Cesium.ShaderSource.replaceMain(this.getPolygonColorPrimitiveVs(),this.type),
            fragmentShaderSource:Cesium.ShaderSource.replaceMain(this.getFs(),this.type)
        }
    }

    // /**
    //  * 获取点光源点亮地表面顶点shader
    //  * @returns {string}
    //  */
    // getGlobeSurfaceVS(){
    //     return `
    //       varying vec3 v_xh_position1;
    //       void main(){
    //         #ifdef QUANTIZATION_BITS12
    //             vec2 xy = czm_decompressTextureCoordinates(compressed0.x);
    //             vec2 zh = czm_decompressTextureCoordinates(compressed0.y);
    //             vec3 position = vec3(xy, zh.x);
    //             float height = zh.y;
    //             vec2 textureCoordinates = czm_decompressTextureCoordinates(compressed0.z);
    //
    //             height = height * (u_minMaxHeight.y - u_minMaxHeight.x) + u_minMaxHeight.x;
    //             position = (u_scaleAndBias * vec4(position, 1.0)).xyz;
    //         #else
    //             // A single float per element
    //             vec3 position = position3DAndHeight.xyz;
    //         #endif
    //             v_xh_position1 = position + u_center3D;
    //       }
    //       `;
    // }


    /**
     *  获取使用Primitive绘制的纯色面的顶点shader
     */
    getPolygonColorPrimitiveVs(){
        return 'varying vec3 v_xh_position3;\n'+
            ' void main(){\n' +
            '   vec4 p = czm_computePosition();\n' +
            '   v_xh_position3 = (czm_modelViewRelativeToEye * p).xyz;\n' +
            '}\n';
    }

    /**
     *  获取使用Primitive绘制的纯色面的片源shader
     */
    getFs(){
        let b2t = null;
        for(let i in this.lightMap){
            b2t = this.lightMap[i];
        }

        let center = b2t.position;
        let mHeight = b2t.maxHeight||10;
        let sHeight = b2t.scanHeight||50;
        let sRate = (b2t.scanWidth||2)/sHeight;//控制上下扫描宽度
        let speed = b2t.speed||600.;//扫描速度
        let scanColor = b2t.color||new Cesium.Color(0.1,0.3,0.5,1.);//扫描颜色
        let header = 'varying vec3 v_xh_position3;\n';

        let p1 = center;
        let tp = Cesium.Cartographic.fromCartesian(p1);
        let p2 = Cesium.Cartesian3.fromRadians(tp.longitude,tp.latitude,tp.height + 200000);

        let origin1High = new window.Cesium.Cartesian3(Math.floor(p1.x),Math.floor(p1.y),Math.floor(p1.z));
        let origin1Low = new  window.Cesium.Cartesian3(p1.x-Math.floor(p1.x),p1.y-Math.floor(p1.y),p1.z - Math.floor(p1.z));

        let origin2High = new  window.Cesium.Cartesian3(Math.floor(p2.x),Math.floor(p2.y),Math.floor(p2.z));
        let origin2Low = new  window.Cesium.Cartesian3(p2.x-Math.floor(p2.x),p2.y-Math.floor(p2.y),p2.z - Math.floor(p2.z));

        let computeHeightShader = "vec3 calPoint(vec3 high,vec3 low){\n" +
            "     vec4 tPoint = czm_translateRelativeToEye(high,low);\n" +
            "     return (czm_modelViewRelativeToEye *tPoint).xyz;\n" +
            "}\n" +
            "vec3 pointProjectOnPlane(vec3 planeNormal,vec3 planeOrigin,vec3 point)\n"+
            "{\n"+
            "   vec3 dd = point - planeOrigin;\n"+
            "   float d = dot(planeNormal,dd);\n"+
            "   return (point - planeNormal * d);\n"+
            "}\n"+
            "float calHeight(vec3 o,vec3 up,vec3 p)\n"+
            "{\n"+
            "   vec3 normal = up - o;\n"+
            "   normal = normalize(normal);\n"+
            "   vec3 op = p - o;\n"+
            "   return dot(normal,op);\n"+
            "}\n";
        let b2TShader = 'void b2tScan(float ch,float mh,float sh,float speed,float sRate,vec3 color){\n' +
            '   float a11 = fract(czm_frameNumber / speed) * 3.14159265 * 2.;\n' +
            '   float a12 = ch / mh + sin(a11) * 0.2 + 0.5;\n' +
            '   gl_FragColor.rgb *= a12;\n' +

            '   float a13 = fract(czm_frameNumber / speed);\n' +
            '   float ah = clamp(ch / sh, 0.0, 1.0);\n' +
            '   a13 = abs(a13 - 0.5) * 2.0;\n' +
            '   float a_diff = step(sRate, abs(ah - a13));\n' +
            '   if(a_diff < 0.5)\n' +
            '     gl_FragColor.rgb = color.rgb;\n'+
            '}\n';
        let scanShader = 'void main(){\n' ;
        scanShader +='float speed = '+this.isContainPoint(speed)+';\n';//扫描速度参数
        scanShader +='float rate = '+this.isContainPoint(sRate)+';\n';//扫描宽度
        scanShader +='float mHeight = '+this.isContainPoint(mHeight)+';\n';//扫描半径
        scanShader +='float sHeight =  '+this.isContainPoint(sHeight)+';\n';//扫描方向
        scanShader +='vec3 color =  vec3('+this.isContainPoint(scanColor.red)+','+this.isContainPoint(scanColor.green)+','+this.isContainPoint(scanColor.blue)+');\n';//扫描半径
        scanShader +='vec3 high1 =  vec3('+this.isContainPoint(origin1High.x)+','+this.isContainPoint(origin1High.y)+','+this.isContainPoint(origin1High.z)+');\n';
        scanShader +='vec3 low1 =  vec3('+this.isContainPoint(origin1Low.x)+','+this.isContainPoint(origin1Low.y)+','+this.isContainPoint(origin1Low.z)+');\n';
        scanShader +='vec3 high2 =  vec3('+this.isContainPoint(origin2High.x)+','+this.isContainPoint(origin2High.y)+','+this.isContainPoint(origin2High.z)+');\n';
        scanShader +='vec3 low2 =  vec3('+this.isContainPoint(origin2Low.x)+','+this.isContainPoint(origin2Low.y)+','+this.isContainPoint(origin2Low.z)+');\n';
        scanShader +=
            "   vec3 origin = calPoint(high1,low1);\n" +
            "   vec3 originAbove = calPoint(high2,low2);\n" +
            "   float ch = calHeight(origin, originAbove, v_xh_position3);\n"+//计算片源在局部坐标系中的高度H
            '   b2tScan(ch,mHeight,sHeight,speed,rate,color);\n' +
            '}\n';
        return header + computeHeightShader + b2TShader + scanShader;
    }

    isContainPoint(v) {
        let str = v.toString();
        let ii = str.indexOf('.');
        if (ii < 0) {
            str += '.';
        }
        return str;
    }
}

module.exports = UpDownScanLight;
