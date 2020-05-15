/**
 * Created by user on 2020/3/16.
 */

function isContainPoint(v){
    let str = v.toString();
    let ii = str.indexOf('.');
    if(ii <  0){
        str += '.';
    }
    return str;
}

/**
 *  3dtiles 和模型的点光源和上下扫射光源构造工厂
 *
 */
class ModelShaderFactory{
    static createLightOptions(options){
        let vs = ModelShaderFactory.createVertexShader(options);
        let fs = ModelShaderFactory.createFragmentShader(options);
        let pp = [];
        let plo = options.pointLightOptions;
        if(plo) {
            for (let i in plo) {
                pp.push(plo[i].pointLightPosition);
            }
        }

        return {
            vertexShader:vs,
            fragmentShader:fs,
            plp:pp,
        };
    }

    static createVertexShader(options){
        let header = 'void main(){\n'+
            ' xh_vertexShader();\n';

        let b2tShader = '';
        if(options.b2tScanOptions){
            b2tShader += ModelShaderFactory.createTop2BottomVertexShader(options.b2tScanOptions);
            header += '  xh_b2tScanShader();\n';
        }

        let plShader = '';
        if(options.pointLightOptions){
            plShader += ModelShaderFactory.createPointLightVertexShader();
            header += '  xh_pointLightShader();\n';
        }

        let end = '}\n';
        return b2tShader + plShader+header +end;
    }

    static createFragmentShader(options){
        let header = 'void main(){\n'+
            ' xh_fragmentShader();\n';

        let b2tShader = '';
        if(options.b2tScanOptions){
            b2tShader += ModelShaderFactory.createTop2BottomFragmentShader(options.b2tScanOptions);
            header += '  xh_b2tScanShader();\n';
        }

        let plShader = '';
        if(options.pointLightOptions){
            plShader += ModelShaderFactory.createPointLightFragmentShader(options.pointLightOptions);
            header += '  xh_pointLightShader();\n';
        }

        let end = '}\n';
        return b2tShader + plShader+header +end;
    }

    //上下扫光顶点shader
    static createTop2BottomVertexShader(options){
        let axis = options.axisName||'z';//部分模型是y轴为高程
        let a_height = options.correctHeight||0;//部分模型的最低高度不为0，如果为负值需要给予修正
        return 'varying float v_height_b2t;\n'+
            'void xh_b2tScanShader(){\n' +
            '   v_height_b2t = a_position.'+axis+' + '+a_height.toFixed(2)+';\n' +
            '}\n';
    }

    //上下扫光片源shader
    static createTop2BottomFragmentShader(b2t){
        let mHeight = b2t.maxHeight||1000;
        let sHeight = b2t.scanHeight||2500;
        let sRate = (b2t.scanWidth||50)/sHeight;//控制上下扫描宽度
        console.log('sRate',sRate);
        let speed = b2t.speed||600.;//扫描速度
        let scanColor = b2t.color||Cesium.Color.YELLOW;//扫描颜色
        let header = 'varying float v_height_b2t;\n';

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

        let scanShader = 'void xh_b2tScanShader(){\n' ;
        scanShader +='  float speed = '+isContainPoint(speed)+';\n';//扫描速度参数
        scanShader +='  float rate = '+isContainPoint(sRate)+';\n';//扫描宽度
        scanShader +='  float mHeight = '+isContainPoint(mHeight)+';\n';//扫描半径
        scanShader +='  float sHeight =  '+isContainPoint(sHeight)+';\n';//扫描方向
        scanShader +='  vec3 color =  vec3('+isContainPoint(scanColor.red)+','+isContainPoint(scanColor.green)+','+isContainPoint(scanColor.blue)+');\n';//扫描半径
        scanShader +=
            "   float ch = v_height_b2t;\n"+//计算片源在局部坐标系中的高度H
            '   b2tScan(ch,mHeight,sHeight,speed,rate,color);\n' +
            '}\n';
        return header  + b2TShader + scanShader;
    }


    //点光源顶点shader
    static createPointLightVertexShader(){
        return 'varying vec3 xh_pointLightCoord;\n'+
            'void xh_pointLightShader(){\n' +
            '   vec4 tp = u_modelViewMatrix * vec4(a_position ,1.);\n' +
            '   xh_pointLightCoord = tp.xyz;\n' +
            '}\n';
    }

    //点光源片源shader
    static createPointLightFragmentShader(options){
        let header ='varying vec3 xh_pointLightCoord;\n';
        for(let i in options){
            header += 'uniform vec3 xh_pointLightPosition'+i+';\n';
        }
        let body = 'void xh_pointLightShader(){\n';

        let r,x,y,z,red,green,blue,alpha,st;

        for(let i in options){
            let param = options[i];

            let plp = param.pointLightPosition;
            let plc = param.pointLightColor||Cesium.Color.WHITE;
            let plr = param.pointLightRadius||100;

            st = param.pointLightStrength||1.;
            r = isContainPoint(plr);
            x = isContainPoint(plp.x);
            y = isContainPoint(plp.y);
            z = isContainPoint(plp.z);
            red = isContainPoint(plc.red);
            green = isContainPoint(plc.green);
            blue = isContainPoint(plc.blue);
            alpha = isContainPoint(plc.alpha);

            body +='float xh_pointLightRadius'+i+' = '+isContainPoint(r)+';\n'+
                'float xh_pointLightStrength'+i+' = '+isContainPoint(st)+';\n'+
                'vec3 xh_pointLightCoord'+i+' = vec3('+isContainPoint(x)+','+isContainPoint(y)+','+isContainPoint(z)+');\n'+
                'vec4 xh_pointLightColor'+i+' = vec4('+isContainPoint(red)+','+isContainPoint(green)+','+isContainPoint(blue)+','+isContainPoint(alpha)+');\n';

            body += ModelShaderFactory.pointLightShader( i , 'xh_pointLightCoord');
        }

        let end = '}\n';
        return header + body + end;
    }


   static pointLightShader(i,v_positionEC){
       return 'vec4 xh_pl'+i+' =  czm_inverseView3D * vec4(xh_pointLightPosition'+i+'.xyz ,1.);\n' +
           ' xh_pl'+i+' /=  xh_pl'+i+'.w ;\n' +
           ' float xh_dis'+i+' = length( '+v_positionEC+' - xh_pointLightPosition'+i+'.xyz);\n' +
           ' if(xh_dis'+ i +' <= xh_pointLightRadius'+i+'){\n' +
           '   float f = (1. - xh_dis'+i+'/ xh_pointLightRadius'+i+');\n'+
           '   gl_FragColor.rgb += xh_pointLightStrength'+i+'* xh_pointLightColor'+i+'.rgb * f ;\n'+
           ' }\n';
    }
}

module.exports = ModelShaderFactory;