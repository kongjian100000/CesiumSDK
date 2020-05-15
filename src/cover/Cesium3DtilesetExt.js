/**
 * Created by user on 2020/3/7.
 */
const defined = Cesium.defined;
let Cesium3Dtileset;
class Cesium3DtilesetExt{
    constructor() {
        let prototype =Cesium.Cesium3DTileset.prototype;

        Cesium.Cesium3DTileset = (function (_super) {
                return function (options){
                    _super.bind(this)(options);
                    this._lightOptions = options.lightOptions||undefined;
                    if(defined(this._lightOptions)){
                        this._vertexShader = this._lightOptions.vertexShader;
                        this._fragmentShader = this._lightOptions.fragmentShader;
                        this._pointLight = this._lightOptions.plp;
                    }else{
                        this._vertexShader = '';
                        this._fragmentShader = '';
                        this._pointLight = [];
                    }
                    this._pointLightLastIndex = this._pointLight?this._pointLight.length:0;
                    this._showVS = options.showVS||false;
                    this._showFS = options.showFS||false;
                }
            })(Cesium.Cesium3DTileset.prototype.constructor);
        Cesium.Cesium3DTileset.prototype = prototype;



        Cesium.Cesium3DTileset.prototype.getLightOptions = function(){
            return this._lightOptions;
        };

        Cesium.Cesium3DTileset.prototype.setLightOptions = function(x){
            //设置灯光位置
            var pl = plo.plp;
            if(!pl)
                pl = [];
            if(pl.length < this._pointLightLastIndex){
                var index = pl.length;
                for(var i = index;i<this._pointLightLastIndex;i++){
                    pl.push(new Cartesian3());
                }
            }else {
                this._pointLightLastIndex = pl.length;
            }
            this._pointLight = pl;
            //console.error(pl.length,pl);
            //设置顶点shader
            this._vertexShader = plo.vertexShader?plo.vertexShader:this._vertexShader;
            //设置片源shader
            this._fragmentShader = plo.fragmentShader?plo.fragmentShader:this._fragmentShader;
        };


        // Object.defineProperty(prototype, 'lightOptions', {
        //     get:function(){
        //         return this._lightOptions;
        //     },
        //     set:function(x){
        //         //设置灯光位置
        //         var pl = plo.plp;
        //         if(!pl)
        //             pl = [];
        //         if(pl.length < this._pointLightLastIndex){
        //             var index = pl.length;
        //             for(var i = index;i<this._pointLightLastIndex;i++){
        //                 pl.push(new Cartesian3());
        //             }
        //         }else {
        //             this._pointLightLastIndex = pl.length;
        //         }
        //         this._pointLight = pl;
        //         //console.error(pl.length,pl);
        //         //设置顶点shader
        //         this._vertexShader = plo.vertexShader?plo.vertexShader:this._vertexShader;
        //         //设置片源shader
        //         this._fragmentShader = plo.fragmentShader?plo.fragmentShader:this._fragmentShader;
        //     }
        // })

    }
}
new Cesium3DtilesetExt();
module.exports = Cesium3DtilesetExt;
