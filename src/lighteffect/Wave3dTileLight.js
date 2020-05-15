/**
 * Created by user on 2020/3/16.
 */
/**
 *  3dtiles 水波纹光源,不支持gltf
 */
class Wave3dTileLight{
    static createWave3dTileLight(options){
        let wave3dTileLight = new Wave3dTileLight(options);;
        return wave3dTileLight;
    }

    constructor(options){
        this.viewer = options.viewer||window.viewer;
        this.positions = options.positions;
        this.center = options.center;
        this.radius = options.radius;
        if(this.center && this.radius>0){
            this.positions = this.computeEllipsePosition_prs(this.center,this.radius,270,-90);
        }

        this.color = options.color||Cesium.Color.RED;
        this.direction = options.direction|| -1;//默认顺时针-1,逆时针1
        this.speed = options.speed||1000;//速度必须大于0
        this.repeat = options.count||3;
        //this.thickness = options.thickness||0.3;
        this.scanCenter = options.scanCenter;
        if(!Cesium.defined(options.scanCenter)){
            this.scanCenter = new Cesium.Cartesian2(0.5,0.5);
        }else{
            this.scanCenter = computeScanTextureCoordAndRate(options.scanCenter,this.positions).tc;
        }

        this.showLine = options.showLine||false;
        this.lineWidth = options.lineWidth||4;
        this.lineColor = options.lineColor||new Cesium.Color(1.,1.,0.,0.5);

        this.offset = 0.0;
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
                        //type:'Color',
                        uniforms:{
                            color:this.color,
                            repeat:this.repeat * 2.,
                            u_radius:this.radius,
                            speed:this.speed,
                            scanCenter:this.scanCenter,
                            direction:this.direction,
                        },
                        source:this.createPolygonScanShader()
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


    createPolygonScanShader(){
        return `
              uniform vec4 color;
              uniform float repeat;
              //uniform float offset;
              uniform float u_radius;
              //uniform float thickness;
              uniform float speed;
              uniform vec2 scanCenter;
               uniform float direction;
              czm_material czm_getMaterial(czm_materialInput materialInput)
              {
                  czm_material material = czm_getDefaultMaterial(materialInput);
                  vec4 color1 = vec4(color.rgb,0.);
                  vec2 st = materialInput.st - vec2(0.5,0.5);
                  float tf = sqrt(2.);
                  float radius = u_radius;
                  float rate = 1. * tf / repeat;
                  float time = fract(czm_frameNumber / speed) * direction;
                  
                  float rr =   radius * time  ;
                  float ring = rate * radius;
                  float dis = length(st) * radius * tf;
                  float f = (dis - rr /tf ) / ring;//由于dis只有0-0.5，而白膜dis为0-1，所以time必须除以2.
                  float ff = fract(f);
                  if( ff < rate ){
                    color1.a = 1. - ff / rate;
                  }
                  material.diffuse = color1.rgb;
                  material.alpha = color1.a;
                  return material;
              }
          `;
    }

    computeScanTextureCoordAndRate(scanCenter,points){
        let mm = this.computeMinMaxCoords(points);
        let sc = this.carte2carto_prs(scanCenter);
        let tc = new Cesium.Cartesian2();
        tc.x = (sc.longitude - mm[0])/(mm[2]-mm[0]);
        tc.y = (sc.latitude - mm[1])/(mm[3]-mm[1]);

        let rate = (mm[2]-mm[0])/(mm[3]-mm[1]);
        return {
            tc:tc,
            rate:rate,
        };
    }

    computeEllipsePosition_prs(center,radius,fromA,toA,inlength){
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

    computeMinMaxCoords(points){
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;

        let p = null;
        let x = null;
        let y = null;
        for(let i in points){
            p = this.carte2carto_prs(points[i]);
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

    carte2carto_prs (p){
        return Cesium.Cartographic.fromCartesian(p);
    }
}

module.exports = Wave3dTileLight;
