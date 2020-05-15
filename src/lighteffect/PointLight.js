/**
 * Created by user on 2020/3/16.
 */
const Light = require('./Light.js');
/**
 *  圆形点光源
 */
class PointLight extends  Light{
    constructor(){
        super();
        //光源类型
        this.type = 'PointLight';
        //点光源半径集合
        this.radiusArray = [];
    }

    /**
     *  更新光源参数数组
     */
    updateLightArray(){
        this.positionArray = [];
        this.colorArray = [];
        this.radiusArray = [];
        for(let key in this.lightMap){
            let item = this.lightMap[key];
            this.positionArray.push(item.position);
            this.colorArray.push(item.color);
            this.radiusArray.push(item.radius);
        }
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
          varying vec3 v_xh_position;
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
                v_xh_position = position + u_center3D;
          }
          `;
    }


    /**
     *  获取使用Primitive绘制的纯色面的顶点shader
     */
    getPolygonColorPrimitiveVs(){
        return 'varying vec3 v_xh_position;\n'+
            'void main(){\n' +
            ' v_xh_position = position3DHigh + position3DLow;\n'+
            '}\n';
    }

    /**
     * 获取点光源片源shader
     * @returns {string}
     */
    getFS(){
        let header = 'varying vec3 v_xh_position;\n';
        let lightFunc = 'vec3 calPointLightColor(vec3 wp,vec3 pos,vec4 color,float radius){\n' +
            '   vec3 color1 = vec3(0.,0.,0.);\n' +
            '   float dis = length(wp - pos);\n' +
            '   if(dis < radius){\n' +
            '     color1 = color.rgb * (1. - dis / radius);\n' +
            '   }\n' +
            '   return color1;\n' +
            '}\n';

        let main = lightFunc+ 'void main(){\n';
        for(let i in this.positionArray){
            main += 'vec3 lightPos'+i+' = vec3('+this.positionArray[i].x.toFixed(5)+','+this.positionArray[i].y.toFixed(5)+','+this.positionArray[i].z.toFixed(5)+');\n'+
                'vec4 lightColor'+i+' = vec4('+this.colorArray[i].red.toFixed(5)+','+this.colorArray[i].green.toFixed(5)+','+this.colorArray[i].blue.toFixed(5)+','+this.colorArray[i].alpha.toFixed(5)+');\n'+
                'float lightRadius'+i+' = '+this.radiusArray[i].toFixed(5)+';\n'+
                'gl_FragColor.rgb += calPointLightColor( v_xh_position, lightPos'+i+', lightColor'+i+', lightRadius'+i+');\n';
        }
        main += '}\n';
        return header + main ;
    }

}

module.exports = PointLight;
