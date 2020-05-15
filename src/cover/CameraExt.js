/**
 * Created by user on 2020/3/7.
 */
//根据高度获取地图层级
function altitudeToZoom(altitude) {
    var A = 40487.57;
    var B = 0.00007096758;
    var C = 91610.74;
    var D = -40467.74;

    return Math.round(D+(A-D)/(1+Math.pow(altitude/C, B)));
}
class CameraExt{
    constructor() {
        Cesium.Camera.prototype.getLevel = function () {
            let height = this._positionCartographic.height;
            if(height == this.prevCameraHeight){
                return this.level;
            }
            this.level = altitudeToZoom(height);
            this.prevCameraHeight = height;
            return this.level;
        };
    }
}
module.exports = CameraExt;
new CameraExt();

