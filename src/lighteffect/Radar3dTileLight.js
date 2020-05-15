/**
 * Created by user on 2020/3/16.
 */
/**
 *  3dtiles 雷达扫描光源,不支持gltf
 */
class Radar3dTileLight{
    static createRadar3dTileLigh(options){
        let radar3dTileLight = new Radar3dTileLight(options);;
        return radar3dTileLight;
    }

    constructor(options){
        this.viewer = options.viewer||window.viewer;
        this.positions = options.positions;
        this.center = options.center;
        this.radius = options.radius||0;
        if(this.center && this.radius > 0){
            this.positions = this.computeEllipsePosition_pls(this.center,this.radius,270,-90);
        }

        this.color = options.color||Cesium.Color.YELLOW;
        this.direction = options.direction|| -1;//默认顺时针-1,逆时针1
        this.speed = options.speed||600;//速度必须大于0

        this.scale = options.scale||0.5;

        this.showLine = options.showLine||false;
        this.lineWidth = options.lineWidth||4;
        this.lineColor = options.lineColor||new Cesium.Color(1.,1.,0.,0.5);
        this.scanCenter = options.scanCenter;
        if(!Cesium.defined(options.scanCenter)){
            this.scanCenter = new Cesium.Cartesian2(0.5,0.5);
        }else{
            this.scanCenter = this.computeScanTextureCoordAndRate(options.scanCenter,this.positions).tc;
        }
        this.update();
    }


    draw(){
        let ppxxx = new Cesium.PolygonGeometry({
            polygonHierarchy:new Cesium.PolygonHierarchy(this.positions),
        });
        let gi = new Cesium.GeometryInstance({
            geometry:ppxxx,
        });
        this.primitive = new Cesium.GroundPrimitive({
            geometryInstances:[gi],
            appearance:new Cesium.EllipsoidSurfaceAppearance({
                material:new Cesium.Material({
                    fabric:{
                        uniforms:{
                            speed:this.speed,
                            color:this.color,
                            direction:this.direction,
                        },
                        source:this.createPolygonScanShader1()
                    },
                })
            }),
            asynchronous:false,
        });
        this.viewer.scene.primitives.add(this.primitive);
    }

    drawLine(){
        let ppxxx = new Cesium.GroundPolylineGeometry({
            positions:this.positions,
            width:this.lineWidth,
            loop:true,
        });
        let gi = new Cesium.GeometryInstance({
            geometry:ppxxx,
        });
        this.primitive1 = new Cesium.GroundPolylinePrimitive({
            geometryInstances:[gi],
            appearance:new Cesium.EllipsoidSurfaceAppearance({
                material:new Cesium.Material({
                    fabric:{
                        type:'Color',
                        uniforms:{
                            color:this.lineColor,
                        }
                    },
                })
            }),
            asynchronous:false,
        });
        this.viewer.scene.primitives.add(this.primitive1);
    }

    update(){
        this.destroyPrimitive();
        this.draw();
        if(this.showLine)
            this.drawLine();
    }

    destroyPrimitive(){
        if(this.primitive)
            this.viewer.scene.primitives.remove(this.primitive);
        if(this.primitive1)
            this.viewer.scene.primitives.remove(this.primitive1);
    }

    destroy(){
        this.destroyPrimitive();
        for(let i in this){
            delete this[i];
        }
    }


    createPolygonScanShader1(){
        return "czm_material czm_getMaterial(czm_materialInput materialInput){"+
            '   czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '   vec2 st = normalize(materialInput.st -vec2(0.5,0.5));\n' +
            '   vec4 color1 = vec4(color.rgb,0.);\n' +
            "   float time = fract(czm_frameNumber / speed) * direction;\n" +
            "   float angle = 3.1415926535898 * 2.0 * time;\n" +
            "   vec2 normal = vec2(sin(angle),cos(angle));\n" +
            "   float ff = normal.x * st.t - normal.y * st.s;\n" +
            "   if(ff < 0.0 ){\n" +
            "     float fff = dot(normal,st);\n" +
            "     if(fff > 0.70710678){\n" +//四分之一圆弧旋转，0.70710678是八分之一,点乘为两个向量的cos,0.5
            "         color1.a =  pow(fff,4.);\n" +
            "     }\n" +
            "   }\n" +
            '    material.diffuse = color.rgb;\n' +
            '    material.alpha = color1.a ;\n' +
            '    return material;\n' +
            '}\n';
    }

    createPolygonScanShader(){
        return "czm_material czm_getMaterial(czm_materialInput materialInput){"+
            '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '    vec2 st = materialInput.st;\n' +
            //'    vec2 center = (st - vec2(0.5,0.5)))*scale;\n' +
            '    vec2 center = (st - scanCenter)*scale;\n' +
            '    float time = direction * czm_frameNumber * 3.1415926 / 180.;\n' +//扫描速度1度
            "    float sin_t = sin(time);\n"+
            "    float cos_t = cos(time);\n"+
            "    vec2 center_rotate = vec2(center.s*cos_t-center.t*sin_t+0.5,center.s*sin_t+center.t*cos_t+0.5);\n"+
            '    vec4 color = texture2D(image,center_rotate);\n' +
            //'    material.diffuse = highlightColor.rgb *(1. + 0.3);\n' +
            '    vec3 tColor = czm_gammaCorrect(color.rgb * highlightColor.rgb);\n' +
            '    tColor *= vec3(1.2,1.2,1.2);\n' +
            '    if(length(center)>0.48){\n' +
            '      tColor = highlightColor.rgb * 1.2;\n' +
            //'      color.a = 2.;\n' +
            '    }\n' +
            '    material.diffuse = tColor;\n' +
            '    material.alpha = color.a * 2.;\n' +
            '    return material;\n' +
            '}\n';
    }

    computeScanTextureCoordAndRate(scanCenter,points){
        let mm = this.computeMinMaxCoords(points);
        let sc = this.carte2carto(scanCenter);
        let tc = new Cesium.Cartesian2();
        tc.x = (sc.longitude - mm[0])/(mm[2]-mm[0]);
        tc.y = (sc.latitude - mm[1])/(mm[3]-mm[1]);

        let rate = (mm[2]-mm[0])/(mm[3]-mm[1]);
        return {
            tc:tc,
            rate:rate,
        };
    }

    computeMinMaxCoords(points){
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;

        let p = null;
        let x = null;
        let y = null;
        for(let i in points){
            p = this.carte2carto(points[i]);
            x = p.longitude;
            y = p.latitude;

            if(x < minX){
                minX = x;
            }

            if(x > maxX){
                maxX = x;
            }

            if(y < minY){
                minY = y;
            }

            if(y > maxY){
                maxY = y;
            }
        }
        return [minX,minY,maxX,maxY];
    }

    carte2carto (p){
        return Cesium.Cartographic.fromCartesian(p);
    }

    computeEllipsePosition_pls(center,radius,fromA,toA,inlength){
        let res = [];
        let length = inlength||360;
        let interval = (toA - fromA)*Math.PI/180/length;
        let startA = fromA * Math.PI /180;

        let mm = Cesium.Transforms.eastNorthUpToFixedFrame(center);

        for(let i =0;i<length;i++){
            let a = startA + interval * i;
            let p = new Cesium.Cartesian3(Math.sin(a )*radius,Math.cos(a)*radius,0.);
            res.push(Cesium.Matrix4.multiplyByPoint(mm,p,new Cesium.Cartesian3));
        }
        return res;
    }
}

module.exports = Radar3dTileLight;
