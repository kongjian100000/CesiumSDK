/**
 * Created by user on 2020/3/7.
 */
const defaultValue = Cesium.defaultValue;
const defined = Cesium.defined;
const DeveloperError = Cesium.DeveloperError;
const Matrix4 = Cesium.Matrix4;

class GeometryInstanceExt{
    constructor() {
        let prototype =Cesium.GeometryInstance.prototype;
        Cesium.GeometryInstance = (function (_super) {
            return function (options){
                _super.bind(this)(options);
                /**
                 * 增加自带的属性，方便查询
                 */
                this.properties = options.properties;
            }
        })(Cesium.GeometryInstance.prototype.constructor);
        Cesium.GeometryInstance.prototype = prototype;
    }
}
module.exports = GeometryInstanceExt;
new GeometryInstanceExt();

