/**
 * Created by user on 2020/3/16.
 */
const Light = require('./Light.js');
/**
 *  雷达扫描光源
 */
class RadarLight extends  Light{
    constructor(){
        super();
        //光源类型
        this.type = 'RadarLight';
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
        return {
            vertexShaderSource:Cesium.ShaderSource.replaceMain(this.getGlobeSurfaceVS(),this.type),
            fragmentShaderSource:Cesium.ShaderSource.replaceMain(this.getFS(),this.type)
        }
    }

    /**
     *  获取使用Primitive绘制的纯色面的shader
     */
    getPolygonColorPrimitiveShader(){
        return {
            vertexShaderSource:Cesium.ShaderSource.replaceMain(this.getPolygonColorPrimitiveVs(),this.type),
            fragmentShaderSource:Cesium.ShaderSource.replaceMain(this.getFS(),this.type)
        }
    }


    /**
     * 获取点光源点亮地表面顶点shader
     * @returns {string}
     */
    getGlobeSurfaceVS(){
        return `
          varying vec3 v_xh_position2;
          void main(){
            #ifdef QUANTIZATION_BITS12
                vec2 xy = czm_decompressTextureCoordinates(compressed0.x);
                vec2 zh = czm_decompressTextureCoordinates(compressed0.y);
                vec3 position = vec3(xy, zh.x);
                float height = zh.y;
                vec2 textureCoordinates = czm_decompressTextureCoordinates(compressed0.z);
            
                height = height * (u_minMaxHeight.y - u_minMaxHeight.x) + u_minMaxHeight.x;
                position = (u_scaleAndBias * vec4(position, 1.0)).xyz;
            #else
                // A single float per element
                vec3 position = position3DAndHeight.xyz;
            #endif
                v_xh_position2 = position + u_center3D;
          }
          `;
    }


    /**
     *  获取使用Primitive绘制的纯色面的顶点shader
     */
    getPolygonColorPrimitiveVs(){
       return  'varying vec3 v_xh_position2;\n'+
        'void main(){\n' +
        ' v_xh_position2 = position3DHigh + position3DLow;\n'+
        '}\n';
    }

    /**
     * 获取点光源片源shader
     * @returns {string}
     */
    getFS(){
        let header = 'varying vec3 v_xh_position2;\n';

        //圆环扫描Shader
        let scanShader = '';
        for(let i in this.lightMap) {
            let polygon = this.lightMap[i].polygon || [new Cesium.Cartesian3];//外包多边形,注意闭合
            let center = this.lightMap[i].position;//扫描中心点
            let speed = this.lightMap[i].speed || 600.;//扫描速度
            let ringCount = this.lightMap[i].count || 3;//扫描圆环宽度
            let scanDirection = this.lightMap[i].direction || -1.;//扫描方向1,-1
            let scanColor = this.lightMap[i].color || new Cesium.Color(0.3, 0.5, 0.8, 1.);//扫描颜色
            let isCircle = this.lightMap[i].isCircle || 1;//是否为圆形，1为圆形，-1为多边形
            let maxRadius = this.lightMap[i].radius || 0.;//设置扫描半径，如果是多边形会自动计算最大半径
            if (this.lightMap[i].polygon)
                isCircle = -1;

            scanShader += 'int isInPolygon'+i+'(vec2 checkPoint, vec2 polygonPoints['+polygon.length+']) {\n' +
                '    int counter = 0;\n' +
                '    float xinters;\n' +
                '    vec2 p1;\n' +
                '    vec2 p2;\n' +
                '    const int pointCount = '+polygon.length+';\n' +
                '    p1 = polygonPoints[0];\n' +
                '\t\n' +
                '    for (int i = 1; i < pointCount; i++) {\n' +
                '        p2 = polygonPoints[i ];\n' +
                '        if (checkPoint.x > min(p1.x, p2.x) && checkPoint.x <= max(p1.x, p2.x)) {\n' +
                '            if (checkPoint.y <= max(p1.y, p2.y)) {\n' +
                '                if (p1.x != p2.x) {\n' +
                '                    xinters = (checkPoint.x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x) + p1.y;\n' +
                '                    if (p1.y == p2.y || checkPoint.y <= xinters) {\n' +
                '                        counter++;\n' +
                '                    }\n' +
                '                }\n' +
                '            }\n' +
                '        }\n' +
                '        p1 = p2;\n' +
                '    }\n' +
                '    float f = float(counter) / 2.;\n' +
                '    float ff = f - floor(f);\n' +
                '    if(ff > 0.000001)\n' +
                '       return 1;\n' +
                '    else\n' +
                '       return 0;\n' +
                '}\n';
            scanShader += 'void lidarScan'+i+'(){\n';
            //ENU矩阵
            let enu_mat = Cesium.Transforms.eastNorthUpToFixedFrame(center);
            let ienu_mat = Cesium.Matrix4.inverse(enu_mat, new Cesium.Matrix4);

            let ienu_Shader = 'mat4 ienu_mat1 = mat4(' +
                ienu_mat[0].toFixed(15) + ',' +
                ienu_mat[1].toFixed(15) + ',' +
                ienu_mat[2].toFixed(15) + ',' +
                ienu_mat[3].toFixed(15) + ',' +
                ienu_mat[4].toFixed(15) + ',' +
                ienu_mat[5].toFixed(15) + ',' +
                ienu_mat[6].toFixed(15) + ',' +
                ienu_mat[7].toFixed(15) + ',' +
                ienu_mat[8].toFixed(15) + ',' +
                ienu_mat[9].toFixed(15) + ',' +
                ienu_mat[10].toFixed(15) + ',' +
                ienu_mat[11].toFixed(15) + ',' +
                ienu_mat[12].toFixed(15) + ',' +
                ienu_mat[13].toFixed(15) + ',' +
                ienu_mat[14].toFixed(15) + ',' +
                ienu_mat[15].toFixed(15) + ');\n';

            scanShader += ienu_Shader;
            //计算平面坐标、最大半径及shader
            scanShader += 'vec2 scan_polygon[' + polygon.length + '];\n';

            for (let i in polygon) {
                let p = Cesium.Matrix4.multiplyByPoint(ienu_mat, polygon[i], new Cesium.Cartesian3);
                scanShader += 'scan_polygon[' + i + '] = vec2(' + p.x.toFixed(5) + ',' + p.y.toFixed(5) + ');\n';
            }
            scanShader += 'int isCircle = ' + isCircle + ';\n';//是否为圆扫描
            scanShader += 'float speed = ' + speed.toFixed(5) + ';\n';//扫描速度参数
            scanShader += 'float rate = 1. / ' + ringCount.toFixed(5) + ';\n';//扫描半径
            scanShader += 'float radius = ' + maxRadius.toFixed(5) + ';\n';//扫描半径
            scanShader += 'float direction =  ' + scanDirection.toFixed(5) + ';\n';//扫描方向
            scanShader += 'vec3 color =  vec3(' + scanColor.red.toFixed(5) + ',' + scanColor.green.toFixed(5) + ',' + scanColor.blue.toFixed(5) + ');\n';//扫描半径
            scanShader +=
                ' vec4 tpoint = ienu_mat1 * vec4(v_xh_position2 ,1.);\n' +
                ' tpoint /= tpoint.w;\n' +
                ' vec2 txy = tpoint.xy;\n' +
                ' int f = 0;\n' +
                ' if(isCircle == 1)\n' +
                '   f = 1;\n' +
                ' else\n' +
                '   f = isInPolygon'+i+'( txy, scan_polygon );\n' +
                ' if(f == 1){\n' +
                '   vec2 st = normalize(txy / radius);\n' +
                "   float time = fract(czm_frameNumber / speed) * direction;\n" +
                "   float angle = 3.1415926535898 * 2.0 * time;\n" +
                "   vec2 normal = vec2(sin(angle),cos(angle));\n" +
                "   float ff = normal.x * st.t - normal.y * st.s;\n" +
                "   float distance = length(txy);\n" +
                "   if(ff < 0.0 && distance < radius){\n" +
                "     float fff = dot(normal,st);\n" +
                "     if(fff > 0.70710678){\n" +//四分之一圆弧旋转，0.70710678是八分之一,点乘为两个向量的cos,0.5
                "         gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, pow(fff,4.));\n" +
                "     }\n" +
                "   }\n" +
                ' }\n' +
                '}\n';
        }
        let endShader = 'void main(){\n';
        for(let i in this.lightMap){
            endShader += '  lidarScan'+i+'();\n';
        }
        endShader += '}\n';
        return header  + scanShader + endShader;
    }
}



module.exports = RadarLight;
