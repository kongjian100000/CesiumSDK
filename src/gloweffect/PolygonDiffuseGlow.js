/**
 * Created by user on 2020/3/16.
 *  圆，面扩散效果
 */

class PolygonDiffuseGlow{
    static createPolygonDiffuse(options){
        let polygonDiffuseGlow = new PolygonDiffuseGlow(options);
        options.viewer.scene.primitives.add(polygonDiffuseGlow);
        return polygonDiffuseGlow;
    }

    constructor(options) {
        this.viewer = options.viewer||window.viewer;
        if(!options.positions){
            console.log('输入控制点为空');
        }
        this.controlPoints = options.positions;
        this.radius = options.radius||1000;
        this.center = options.center||this.computeCenter(this.controlPoints);
        if(this.radius > 0&& !this.controlPoints){
            this.controlPoints = this.computeEllipsePosition_pd(this.center,this.radius,270,-90);
        }

        this.translucent = options.translucent||false;
        this.height = options.extrudedHeight||500;
        this.direction = options.direction||-1;
        this.color = options.color||new Cesium.Color(0.5,0.8,1.,1.3);

        //缩放参数
        this.startTime = 2;
        this.angle_delta = Math.PI /180;
        this.stepCount = options.speed||1;
        this.xyScale = 2.;
        this.zScale = 0.01;
        this.mScale = Cesium.Matrix4.fromUniformScale(1.0);
        this.modelMatrix = Cesium.Matrix4.fromUniformScale(1.0);
        this.polyline = null;
        this.drawPolygon();
    }


    drawPolygon(){
        this.destroyPrimitive();
        this.draw();
    };

    destroyPrimitive(){
        if(this.polyline){
            this.viewer.scene.primitives.remove(this.polyline);
        }
    };

    destroy(){
        this.destroyPrimitive();
        this.viewer.scene.primitives.remove(this);
        for(let i in this){
            delete  this[i];
        }
    };
    createGeometry(pos,n,st,indice){
        let positions = new Float64Array(pos);
        let normals = new Float32Array(n);
        let sts = new Float32Array(st);
        let indices = new Uint16Array(indice);

        return new Cesium.Geometry({
            attributes: {
                position: new Cesium.GeometryAttribute({
                    // 使用double类型的position进行计算
                    componentDatatype : Cesium.ComponentDatatype.DOUBLE,
                    //componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: positions
                }),
                normal: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 3,
                    values: normals
                }),
                st: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 2,
                    values: sts
                })
            },
            indices: indices,
            primitiveType: Cesium.PrimitiveType.TRIANGLES,
            boundingSphere: Cesium.BoundingSphere.fromVertices(positions)
        });
    }
    draw(){
        let op = this.computePositions_pd(this.controlPoints,this.height);
        this.positions  = op.pos;
        this.normals  =op.normals;
        this.sts  =op.sts;
        this.indices  =op.indices;

        let gi = new Cesium.GeometryInstance({
            geometry:this.createGeometry(this.positions,this.normals,this.sts,this.indices),
        });
        this.polyline = new Cesium.Primitive({
            geometryInstances:gi,
            appearance:new Cesium.MaterialAppearance({
                material:new Cesium.Material({
                    translucent:this.translucent,
                    fabric:{
                        uniforms:{
                            u_color:this.color,
                        },
                        source:this.getFS(this.translucent)
                    }
                }),
                vertexShaderSource:this.getVertexShaderSource1(),
                fragmentShaderSource:this.getFragmentShaderSource1(),
            }),
            asynchronous:false,
        });
        this.viewer.scene.primitives.add(this.polyline);
    };

    update(fs){
        let time = fs.frameNumber/this.stepCount;
        let tt = time - Math.floor(time);
        if(this.polyline){
            tt = tt < 0.01?0.01:tt;
            this.mScale[0] = this.mScale[5] = tt * this.xyScale;
            this.mScale[10] = 1.1 - tt;
            this.polyline.modelMatrix = this.scaleXYZ(this.center, this.mScale);
        }
    };

    addHeight_pd(point,height){
        let tPoint = Cesium.Cartographic.fromCartesian(point);
        tPoint.height += height;
        //console.log(tPoint);
        return Cesium.Cartographic.toCartesian(tPoint);
    }

    computeCenter(points){
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;

        let p = null;
        let x = null;
        let y = null;
        for(let i in points){
            p = Cesium.Cartographic.fromCartesian(points[i]);
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
        return Cesium.Cartesian3.fromRadians(minX + (maxX - minX) / 2,minY + (maxY - minY) / 2);
    }

    computeEllipsePosition_pd(center,radius,fromA,toA,inlength){
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

    computePositions_pd(cps,height){
        let count = cps.length;
        let up = [];
        for(let i in cps){
            up.push(this.addHeight_pd(cps[i],height));
        }
        //计算位置
        let pos = [];//坐标
        let sts = [];//纹理
        let indices = [];//索引
        let normal = [];//法向量
        for(let i =0;i<count;i++){
            let ni = (i+1)%count;
            pos.push(...[ cps[i].x,cps[i].y,cps[i].z ]);
            pos.push(...[ cps[ni].x,cps[ni].y,cps[ni].z ]);
            pos.push(...[ up[ni].x,up[ni].y,up[ni].z ]);
            pos.push(...[ up[i].x,up[i].y,up[i].z ]);

            normal.push(...[0,0,1]);
            normal.push(...[0,0,1]);
            normal.push(...[0,0,1]);
            normal.push(...[0,0,1]);

            sts.push(...[0,0,1,0,1,1,0,1,]);//四个点的纹理一次存入

            let ii = i*4;
            let i1 = ii+1;
            let i2 = ii+2;
            let i3 = ii+3;
            indices.push(...[ i2,i3,ii,ii,i1,i2 ]);
        }
        return {
            pos:pos,
            normals:normal,
            sts:sts,
            indices:indices,
        };
    }

    scaleXYZ(point,mScale){
        let m = Cesium.Transforms.eastNorthUpToFixedFrame(point);
        let inverse = Cesium.Matrix4.inverse(m,new Cesium.Matrix4);

        let tt = Cesium.Matrix4.multiply(mScale,inverse,new Cesium.Matrix4);
        return Cesium.Matrix4.multiply(m,tt,new Cesium.Matrix4);
    }
    getVertexShaderSource1(){
        return "attribute vec3 position3DHigh;\
       attribute vec3 position3DLow;\
       attribute vec3 normal;\
       attribute vec2 st;\
       attribute float batchId;\
       varying vec2 v_st;\
       varying vec3 v_normalEC;\
       varying vec3 v_positionEC;\
       void main()\
       {\
          vec4 p = czm_translateRelativeToEye(position3DHigh,position3DLow);\
          v_positionEC = (czm_modelViewRelativeToEye * p).xyz;\
          v_normalEC = czm_normal * normal;\
          v_st=st;\
          gl_Position = czm_modelViewProjectionRelativeToEye * p;\
       }\
       ";
    }
    getFragmentShaderSource1(){
        return `
      varying vec3 v_positionEC;
      varying vec3 v_normalEC;
      varying vec2 v_st;
      void main(){
        gl_FragColor = xh_getMaterial(v_st);
      }
      `;
    }
    //片源着色器
    getFS(t){
        let fs = '';
        fs +='uniform vec4 u_color;\n'+
            "vec4 xh_getMaterial(vec2 st){"+
            '    float alpha = pow(1. - st.t, 4.);\n';
        if(t) {
            fs +='    vec4 color = vec4(u_color.rgb * u_color.a, alpha);' ;
        }else{
            fs += '    vec4 color = vec4(u_color.rgb * u_color.a, 1.);' ;
        }
        fs+='    return color;\n' +
            '}\n';
        return fs;
    }
}
module.exports = PolygonDiffuseGlow;