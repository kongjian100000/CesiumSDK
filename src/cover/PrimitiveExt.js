/**
 * Created by user on 2020/3/7.
 */
const LightTool = require('../utils/LightTool');
function getShader(lightMap,sourceVS,sourceFS){
    let vsArr = [];
    let fsArr = [];
    //加上地面原始的shader
    // vsArr.push({name:'sourceVS',shader:sourceVS});
    // fsArr.push({name:'sourceFS',shader:sourceFS});

    // 添加光源的shader
    for(let type in lightMap){
        let light = lightMap[type];
        let shader = light.getPolygonColorPrimitiveShader();
        let vsTtem  = {name:light.type,shader:shader.vertexShaderSource};
        let fsTtem  = {name:light.type,shader:shader.fragmentShaderSource};

        vsArr.push(vsTtem);
        fsArr.push(fsTtem);
    }

    //合并成新的地面shader
    return {vs:LightTool.composeMainShader(sourceVS,vsArr),fs:LightTool.composeMainShader(sourceFS,fsArr)};
}

class PrimitiveExt{
    constructor() {
        Cesium.Primitive.prototype.lightMap  = {};
        Cesium.Primitive.prototype.sourceAppearance  = null;
        Cesium.Primitive.prototype.sourceVs  = null;
        Cesium.Primitive.prototype.sourceFs  = null;

        /**
         * 当有光源照射到Primitive时，此方法修改Primitive的受光shader
         *  @param type  光源效果类型
         * @param shaders 光源效果在此物体上的shader
         */
        Cesium.Primitive.prototype.updateLightShader = function(light){
            this.lightMap[light.type] = light;
            this.updateShader();
        };

        /**
         * 根据光源效果类型删除光源shader
         * @param type  光源效果类型
         */
        Cesium.Primitive.prototype.removeLightShader = function(type){
            delete this.lightMap[type];
            this.updateShader();
        };


        /**
         * 更新shader
         */
        Cesium.Primitive.prototype.updateShader = function(){
            if(this.appearance){
                if(!this.sourceAppearance){
                    this.sourceAppearance = this.appearance;
                    this.sourceVs = this.appearance.vertexShaderSource;
                    this.sourceFs = this.appearance.fragmentShaderSource;
                }

                let hasLight = false;
                for ( let key in this.lightMap ) {
                    hasLight = true;
                }

                //设置成undefined，让Primitive重绘
                this._appearance = undefined;
                if(hasLight){
                    let shader = getShader(this.lightMap, this.sourceVs, this.sourceFs);
                    this.appearance._vertexShaderSource = shader.vs;
                    this.appearance._fragmentShaderSource = shader.fs;
                }else{
                    this.appearance._vertexShaderSource = this.sourceVS;
                    this.appearance._fragmentShaderSource = this.sourceFS;
                }
            }
        };


        /**
         * 扩展支持Primitive内部的geometry属性查询
         */
        Cesium.Primitive.prototype.update = (function (_super) {
            return function (frameState) {
                if (this._state !== Cesium.PrimitiveState.COMPLETE && this._state !== Cesium.PrimitiveState.COMBINED) {
                    this.propertiesMap = {};
                    let instances = (Cesium.isArray(this.geometryInstances)) ? this.geometryInstances : [this.geometryInstances];
                    for (let i = 0; i < instances.length; i++) {
                        let instance = instances[i];
                        this.propertiesMap[instance.id] = instance.properties;
                    }
                }
                _super.bind(this)(frameState);
            };
        })(Cesium.Primitive.prototype.update);


        /**
         *  根据geometry 的id获取它的属性信息
         * @param id
         */
        Cesium.Primitive.prototype.getProperties = function (id) {
            if(!this.propertiesMap){
                return {};
            }
            return this.propertiesMap[id];
        };
    }
}
module.exports = PrimitiveExt;
new PrimitiveExt();

