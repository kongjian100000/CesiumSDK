/**
 * Created by user on 2020/3/7.
 */
const LightTool = require('../utils/LightTool');

//地面原始的shader
let sourceVS = null;
let sourceFS = null;
let isUpdatedSharder = false;
//定义不同类型的点光源的shader存放在此map中
let lightMap = {};

function getShader(lightMap,sourceVS,sourceFS){
    let vsArr = [];
    let fsArr = [];
    //加上地面原始的shader
    vsArr.push({name:'sourceVS',shader:sourceVS});
    fsArr.push({name:'sourceFS',shader:sourceFS});

    // 添加光源的shader
    for(let type in lightMap){
        let light = lightMap[type];
        let shader = light.getGlobeSurfaceShader();
        let vsTtem  = {name:light.type,shader:shader.vertexShaderSource};
        let fsTtem  = {name:light.type,shader:shader.fragmentShaderSource};

        vsArr.push(vsTtem);
        fsArr.push(fsTtem);
    }

    //合并成新的地面shader
    return {vs:LightTool.composeShader(vsArr),fs:LightTool.composeShader(fsArr)};
}


class GlobeSurfaceTileProviderExt{
    constructor() {
        /**
         * 当有光源照射到地表面时，此方法修改地表面的受光shader
         * @param type  光源效果类型
         * @param shaders 光源效果在此物体上的shader
         */
        Cesium.GlobeSurfaceTileProvider.prototype.updateLightShader = function(light){
            lightMap[light.type] = light;
            isUpdatedSharder = true;
        };

        /**
         * 根据光源效果类型删除光源shader
         * @param type  光源效果类型
         */
        Cesium.GlobeSurfaceTileProvider.prototype.removeLightShader = function(type){
            delete lightMap[type];
            isUpdatedSharder = true;
        };

        Cesium.GlobeSurfaceShaderSet.prototype.getShaderProgram = (function (_super) {
            return function (options) {
                if(isUpdatedSharder){
                    let originVertexShader = this.baseVertexShaderSource.sources[1].toString();
                    let originFragmentShader = this.baseFragmentShaderSource.sources[1].toString();
                    if(!sourceVS || !sourceFS){
                        sourceVS = originVertexShader;
                        sourceFS = originFragmentShader;
                    }

                    let hasLight = false;
                    for ( let key in lightMap ) {
                        hasLight = true;
                    }
                    if(hasLight){
                        let shader = getShader(lightMap,
                            Cesium.ShaderSource.replaceMain(sourceVS,'sourceVS'),
                            Cesium.ShaderSource.replaceMain(sourceFS,'sourceFS'));
                        this.baseVertexShaderSource.sources[1] = shader.vs;
                        this.baseFragmentShaderSource.sources[1] = shader.fs;
                    }else{
                        this.baseVertexShaderSource.sources[1] = sourceVS;
                        this.baseFragmentShaderSource.sources[1] = sourceFS;
                    }

                    //重置本字段，为了让重新使用新的shader绘制
                    this._shadersByTexturesFlags = [];
                    isUpdatedSharder = false;
                }

                //重置本字段，为了让重新使用新的shader绘制
                options.surfaceTile.surfaceShader =undefined;
                return _super.bind(this)(options);
            }
        })(Cesium.GlobeSurfaceShaderSet.prototype.getShaderProgram);
    }
}
module.exports = GlobeSurfaceTileProviderExt;
new GlobeSurfaceTileProviderExt();

