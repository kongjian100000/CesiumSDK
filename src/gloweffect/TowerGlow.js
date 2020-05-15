/**
 * Created by user on 2020/3/16.
 */

class TowerGlow{
    static createTower(viewer,center,radius,height,color){
        return new TowerGlow(viewer,center,radius,height,color);
    }

    constructor(viewer,center,radius,height,color) {
        this.viewer = viewer;
        this.center = center;
        this.extrudedHeight = height||100;
        this.topRadius = radius/100.;
        this.topRadius = this.topRadius > 1.?1.:this.topRadius;
        this.u_color = color||new Cesium.Color(1.,1.,0.,1.0);

        this.inner_controlPoints = this.computeEllipsePosition(center,radius*0.7,120);
        this.outer_controlPoints = this.computeEllipsePosition(center,radius,120);//计算底部外圈
        this.circular_clone_topPoints = this.computeEllipsePosition(center,this.topRadius,120);//计算顶部
        this.circlePoints_2 = this.computeEllipsePosition(center,radius * 2.,120);//计算顶部

        this.polyline = null;//外圈
        this.polyline1 = null;//内圈
        this.polyline2 = null;//底部圆
        this.polyline3 = null;//底部放大钰圆环

        this.ringCanvas = this.drawRingCanvas();
        this.gradientCircle = this.drawGradientCircle();

        let image = new Image();
        image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAEACAYAAADSoXR2AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQ1IDc5LjE2MzQ5OSwgMjAxOC8wOC8xMy0xNjo0MDoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjExQTg0NDEyMDEzQjExRUFBNDhBRjhGMUMzOUUyNTU0IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjExQTg0NDEzMDEzQjExRUFBNDhBRjhGMUMzOUUyNTU0Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MTFBODQ0MTAwMTNCMTFFQUE0OEFGOEYxQzM5RTI1NTQiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MTFBODQ0MTEwMTNCMTFFQUE0OEFGOEYxQzM5RTI1NTQiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz41vRwAAAAE90lEQVR42uydyW4UMRCG3T2dgYSAEGs4sp44cCJBcGUJbwCvALwWPAI8ABwAiUVwgLBdkEikJEiAGMhkZqhfU1aa1sy0g+yaJPyWSupOpPjz0uVyucrJer2eG2fJ3ZgLAQhAgC0PgN8XIlkqgGLE75oih0WmRVZEvop0rHog18rnRe6IzInsthyCXFt+TuSKyGmRXZZDgK5eFrkv8l7kiUhrxN/JSo3pigSvcNmI1bCh3b5LK2+NqHyvyEF9x3z5HgqRRViOAXhW5JrCoNdei/y20gMYxhmRSyIXRY6JTMT4DENLW+SdyD19x/NajDmwmYIW79Hnn+MA4GJEAAIQgABJbMJB+n5Sl9zWZvR9DABUfkJkVt8fi3zUldAEoKl24Y2S1fPZEmBdZFHkkb4vxTLRQ5djbyUf0ncYrD/UADUB8MZno2Q19yx7gIqIAAQgAAEIQIAtYZT+85LvRnjQCoPKR3rQUgN4Y3ZeK30g8qps0qeeAzDn4TWD9+ySG+BBS90DaGnVg9a2tgnR4il9/jkOACoiAhCAAASIZpAAFl6yulO0JACo/IDrn6CedP1zxOciv6wAYNnAP3RVBeWtJQCWzG8iL/X9g4vkqNzMctzUXtintt2KM/aS+bmQaY90rb8CF6tSKiICEIAABCAAAQiwbfcFIWVCbUcc9bZDLKiYAKj4uOv7Bb+ILLj+8W7PCgC7Jhzv44Qdh9yrru8V61jPgd645gD2io+15RiC5ZA5ENNPmGmDmtrta9YAVEQE2FlrQUM/J6efU8cSAD87ojodBaccS6kgiiErGiq/qe93XT+3oGU5BJnbyKrIUs6BQZoQUEcrQ7CYagiGqeKiMgnXLXsg5uJUm/RQJKy8fGS7PMw6SgVQPrJFGZr0kCfUL/7IFjIzrLGpemBQ0kPbehL6I9vMjUh6oEVEAAIQgAAEIAABdpyj0qcK71YrqGUJANNrv+sHOcAiRpDDM1cTY1BEHk7kqyP/2Ac5vLEEQEG8aDnIoTb5ObZRWg5ywG5o1dX4ClNYxT7IISgJPsXGpLut9MCWU0S5bqkmdAa3LQEwcZDAfkZ3tthQfkwNkVeeD6kiuaUabcp6DpS9YyalrAdQ8bT1EFQVUabarND9fNuyB2gREYAABCAAAQhAAAIQoM770UgBXARCIr/koDogVlzgrWuxemBKd0m4JnBed0+5ZQ9gn3BK5LK+P4y5ewoB8DFiKO91COLFfwVuTCZV1hSoYw1APZCsFIkbN1Haaa87wwiKQe6eT27AEX6esPVVd8/kOOdAz/oz9FE0p+uGIKUeqE5C8xgSKiICEIAABCAAAQhAAAIQgAAEIAABCECA6AA+sbkREyDUUYlKD6ggZwzRkr8tewBhusisv+0in5qE/hFchoZTE0TL4p8sTbtIpyahQ4Ag5fKpSVBmfdDECvQTZjoM0U9N6KgkwH9xY7PXpPiCmq5yuaLVldHIO7jgNi5XfOEhCqNh9udHV/RnC5YAUDTftdV4/ivvwEoRVS9XXPWa1FIT5ird8jpSB+BDN3rO8AaGMnGy0I0QRYTvdk6NkOsucuhGCMAgI8Q0isaHbmAevNMhiD4P6iZhstANGiQE2PEGCRo2NcgAsQDwKnxWFdlT17/duWU1BJmuHz6A5bwbEsCScgh+qAHit3Jr1oooOPExdRBLbeJjSpuwuy30AAH+CDAAPH5ltESNYl4AAAAASUVORK5CYII=';
        image.onload =function(){
            this.image = this.drawCanvas(image);
            this.draw();
        }.bind(this);
    }


    draw(){
        this.addOuter();
        this.addInner();
        this.addCircle();
        this.addRing();
    };

    destroy(){
        if(this.polyline){
            this.viewer.scene.primitives.remove(this.polyline);
        }
        if(this.polyline1){
            this.viewer.scene.primitives.remove(this.polyline1);
        }
        if(this.polyline2){
            this.viewer.scene.primitives.remove(this.polyline2);
        }
        if(this.polyline3){
            this.viewer.scene.primitives.remove(this.polyline3);
        }
        for(let i in this){
            delete  this[i];
        }
    };



    //添加绘制外圈粒子效果
    addOuter(){
        let side_instances = this.createParticles_efa_cylinder(this.outer_controlPoints,this.extrudedHeight,this.circular_clone_topPoints);
        this.polyline = new Cesium.Primitive({
            geometryInstances:side_instances,
            appearance:new Cesium.EllipsoidSurfaceAppearance({
                material:new Cesium.Material({
                    fabric:{
                        uniforms:{
                            u_color:this.u_color,
                            image:this.image,
                        },
                        source:this.getSource(),
                    }
                }),
            }),
            asynchronous:false,
        });
        this.viewer.scene.primitives.add(this.polyline);
    };

    //添加绘制内圈圆柱闪烁效果
    addInner(){
        let side_instances = this.createParticles_efa_cylinder(this.inner_controlPoints,this.extrudedHeight,this.circular_clone_topPoints,this.v_color);
        let a = new Cesium.EllipsoidSurfaceAppearance({
            material:new Cesium.Material({
                //translucent:false,
                fabric:{
                    uniforms:{
                        u_color:this.u_color,
                    },
                    source:this.cylinderGauss1_vtxf(),
                }
            }),
        });
        this.polyline1 = new Cesium.Primitive({
            geometryInstances:side_instances,
            appearance:a,
            asynchronous:false,
        });
        this.viewer.scene.primitives.add(this.polyline1);
    };

    //绘制底部圆
    addCircle(){
        let carto = Cesium.Cartographic.fromCartesian(this.center);
        if(carto.height < 1){
            let instance = this.createCircleInstance(this.circlePoints_2,false);
            this.polyline2 = new Cesium.GroundPrimitive({
                geometryInstances:instance,
                appearance:new Cesium.EllipsoidSurfaceAppearance({
                    material:new Cesium.Material({
                        fabric:{
                            uniforms:{
                                u_color:this.u_color,
                                image:this.gradientCircle,
                            },
                            source:this.particlesGradient(),
                        }
                    }),
                }),
                asynchronous:false,
            });
        }else{
            let instance = this.createCircleInstance(this.circlePoints_2,true);
            this.polyline2 = new Cesium.Primitive({
                geometryInstances:instance,
                appearance:new Cesium.EllipsoidSurfaceAppearance({
                    material:new Cesium.Material({
                        fabric:{
                            uniforms:{
                                u_color:this.u_color,
                                image:this.gradientCircle,
                            },
                            source:this.particlesGradient(),
                        }
                    }),
                }),
                asynchronous:false,
            });
        }

        this.viewer.scene.primitives.add(this.polyline2);
    };


    //添加绘制底部扩散圆环
    addRing(){
        let carto = Cesium.Cartographic.fromCartesian(this.center);
        if(carto.height < 1){
            let instance = this.createCircleInstance(this.circlePoints_2,false);
            this.polyline3 = new Cesium.GroundPrimitive({
                geometryInstances:instance,
                appearance:new Cesium.EllipsoidSurfaceAppearance({
                    material:new Cesium.Material({
                        fabric:{
                            uniforms:{
                                u_color:this.u_color,
                                image:this.ringCanvas,
                            },
                            source:this.particlesRingScan(),
                        }
                    }),
                }),
                asynchronous:false,
            });
        }else{
            let instance = this.createCircleInstance(this.circlePoints_2,true);
            this.polyline3 = new Cesium.Primitive({
                geometryInstances:instance,
                appearance:new Cesium.EllipsoidSurfaceAppearance({
                    material:new Cesium.Material({
                        fabric:{
                            uniforms:{
                                u_color:this.u_color,
                                image:this.ringCanvas,
                            },
                            source:this.particlesRingScan(),
                        }
                    }),
                }),
                asynchronous:false,
            });
        }
        this.viewer.scene.primitives.add(this.polyline3);
    };

    //画粒子图
    drawCanvas(image){
        let canvas = document.createElement('canvas');
        canvas.width = 64 ;
        canvas.height = 256;
        let ctx = canvas.getContext('2d');

        ctx.clearRect(0,0,64,256);
        ctx.drawImage(image,0,0);
        ctx.drawImage(image,33,0);
        return canvas;
    }

    //画圆环图
    drawRingCanvas(){
        let canvas = document.createElement('canvas');
        canvas.width = 512 ;
        canvas.height = 512;
        let ctx = canvas.getContext('2d');

        //ctx.clearRect(0,0,512,512);
        ctx.fillStyle = 'rgba(255,255,255,0)';
        ctx.strokeStyle = "rgba(255, 255, 255,255)";
        ctx.setLineDash([50, 50]);
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(256, 256, 150, 0, Math.PI * 2, true);
        ctx.stroke();
        ctx.restore();
        return canvas;
    }

    //画渐变圆
    drawGradientCircle(){
        let canvas = document.createElement('canvas');
        canvas.width = 512 ;
        canvas.height = 512;
        let ctx = canvas.getContext('2d');

        let gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0.1, "rgba(255, 255, 255, 1.0)");
        gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.0)");
        gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.9)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.0)");
        gradient.addColorStop(0.9, "rgba(255, 255, 255, 0.2)");
        gradient.addColorStop(1.0, "rgba(255, 255, 255, 1.0)");

        ctx.clearRect(0, 0, 512, 512);
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2, true);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        return canvas;
    }

    cylinderGauss1_vtxf(){
        return  'uniform vec4 u_color;\n'+
            "czm_material czm_getMaterial(czm_materialInput materialInput){"+
            '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '    vec2 st = materialInput.st;\n' +
            '    float powerRatio = 1./(fract(czm_frameNumber / 30.0) +  1.) ;\n' +
            '    float alpha = pow(1. - st.t,powerRatio);\n' +
            '    vec4 color = vec4(u_color.rgb, alpha*u_color.a);'+
            '    material.diffuse = color.rgb;\n' +
            '    material.alpha = color.a;\n' +
            '    return material;\n' +
            '}\n';
    }

    particlesRingScan (){
        return "czm_material czm_getMaterial(czm_materialInput materialInput){"+
            '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '    vec2 st = materialInput.st;\n' +
            '    vec2 center = st - vec2(0.5,0.5);\n' +
            '    float time = -czm_frameNumber * 3.1415926 / 180.;\n' +//扫描速度1度
            "    float sin_t = sin(time);\n"+
            "    float cos_t = cos(time);\n"+
            "    vec2 center_rotate = vec2(center.s*cos_t-center.t*sin_t+0.5,center.s*sin_t+center.t*cos_t+0.5);\n"+
            '    vec4 color = texture2D(image,center_rotate);\n' +
            '    vec3 tColor = color.rgb * u_color.rgb;\n' +
            '    tColor *= u_color.a;\n' +
            '    material.diffuse = tColor;\n' +
            '    float length = 2. - length(center)/0.5;\n' +
            '    material.alpha = color.a * pow(length, 0.5);\n' +//color.r = 0 或1
            '    return material;\n' +
            '}\n';
    }

    particlesGradient (){
        return "czm_material czm_getMaterial(czm_materialInput materialInput){"+
            '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '    vec4 tColor = u_color;\n' +
            '    vec2 st = materialInput.st;\n' +
            '    vec2 center = st - vec2(0.5,0.5);\n' +
            '    float length = length(center)/0.5;\n' +
            '    float time = 1. - abs(czm_frameNumber / 360. - 0.5);\n' +

            '    float param = 1. - step(length, 0.6);\n' +//大于0.6模糊，rate = 0.6
            '    float scale = param * length;\n' +// 0.6< length 返回0，反之返回1.
            '    float alpha = param * (1.0 - abs(scale - 0.8) / 0.2);\n' +// 0.8 < length 返回0，反之返回1.

            '    float param1 = step(length, 0.7);\n' +//小于0.5模糊
            '    float scale1 = param1 * length;\n' +// 0.6< length 返回0，反之返回1.
            '    alpha += param1 * (1.0 - abs(scale1 - 0.35) / 0.35);\n' +// 0.8 < length 返回0，反之返回1.

            '    material.diffuse = u_color.rgb * vec3(u_color.a);\n' +
            '    material.alpha = pow(alpha, 4.0);\n' +
            '    return material;\n' +
            '}\n';
    }

    getSource(){
        return 'uniform vec4 u_color;\n'+
            "czm_material czm_getMaterial(czm_materialInput materialInput){"+
            '    czm_material material = czm_getDefaultMaterial(materialInput);\n' +
            '    vec2 st = materialInput.st;\n' +
            '    float time = fract(czm_frameNumber / 90.) ;\n' +
            '    vec2 new_st = fract(st-vec2(time,time));\n'+
            '    vec4 color = texture2D(image,new_st);\n' +

            '    vec3 diffuse = color.rgb;\n'+
            '    float alpha = color.a;\n'+
            '    diffuse *= u_color.rgb;\n' +
            '    alpha *= u_color.a;\n' +
            '    alpha *= u_color.a;\n' +
            '    material.diffuse = diffuse;\n' +
            '    material.alpha = alpha * pow(1. - st.t,u_color.a);\n' +
            '    return material;\n' +
            '}\n';
    }

    //计算圆坐标
    computeEllipsePosition(center,radius,length){
        let res = [];
        let interval = 2*Math.PI / length ;

        let mm = Cesium.Transforms.eastNorthUpToFixedFrame(center);
        let startPos = 2*Math.PI * 270 / 360;
        for(let i =0;i<length;i++){
            let a = startPos - interval * i;
            let p = new Cesium.Cartesian3(Math.sin(a )*radius,Math.cos(a)*radius,0.);
            res.push(Cesium.Matrix4.multiplyByPoint(mm,p,new Cesium.Cartesian3));
        }
        res.push(res[0]);
        return res;
    }

    //创建圆
    createCircleInstance(pos,perPositionHeight){
        let polygon = new Cesium.PolygonGeometry({
            polygonHierarchy:new Cesium.PolygonHierarchy(pos),
            perPositionHeight:perPositionHeight,
        });
        return new Cesium.GeometryInstance({
            geometry:polygon,
        });
    }

    //ellipoidAppearance贴圆锥
    createParticles_efa_cylinder(pts,height,topPts,incolor){
        let color = incolor||new Cesium.Color(0.5,0.8,1.0,2.);
        let newpts = pts.slice();

        let length = pts.length;
        let len_2 = 2* length;
        let sts = [];
        let st_interval = 1.0 / (length -1);
        let define_indices = [];

        let ep = [];
        for(let i =0;i<length;i++){
            ep.push(this.addHeight(topPts[i],height));
            sts.push(i* st_interval);
            sts.push(0.);

            let i_1 = i+1;
            let i_11 = (i+1)%length;
            let len_2_i_1 = len_2 -i_1;
            define_indices.push(...[len_2_i_1 -1, len_2_i_1, i ]);//用materialAppearance贴纹理正确
            define_indices.push(...[i           , i_11     , len_2_i_1 -1]);
        }

        for(let i in ep){
            newpts.push(ep[length - i - 1]);

            sts.push(1. - i* st_interval);
            sts.push(1.);
        }

        let polygon = new Cesium.PolygonGeometry({
            polygonHierarchy:new Cesium.PolygonHierarchy(newpts),
            perPositionHeight:true,
        });
        polygon = Cesium.PolygonGeometry.createGeometry(polygon);
        polygon.indices = define_indices;
        polygon.attributes.st.values = sts;

        return new Cesium.GeometryInstance({
            geometry:polygon,
            attributes:{
                color:Cesium.ColorGeometryInstanceAttribute.fromColor(color),
            }
        });
    }

    addHeight(p,ih){
        let h = ih||0;
        let cp = Cesium.Cartographic.fromCartesian(p);
        cp.height += h;
        return Cesium.Cartographic.toCartesian(cp);
    }
}
module.exports = TowerGlow;








