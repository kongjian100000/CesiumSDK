'use strict';
const GAnnoAvoid =  require('./avoid/GAnnoAvoid');
let tiles = [];
let labelAvoid = null;
let finished = true;
class AvoidTile {

    static init(ts,bearing){
        finished = false;
        tiles = ts;
        labelAvoid = new GAnnoAvoid(null,null,bearing);
    }

    static avoidTile(){
        // console.log('==================');
        const startTime = new Date().getTime();
        const shouldPausePlacement = () => {
            const elapsedTime = new Date().getTime() - startTime;
            return elapsedTime > 3;
        };

        // console.time('avoidTile');
        while(tiles.length > 0){
            // console.log('+++++++++++++++++');
            let tile =tiles.shift();
            //转换为屏幕坐标
            tile.updateScreenPt(tile.features);
            //计算避让box
            labelAvoid.GLabelBox.setBox(tile.features,tile.styleMap,true);
            //开始避让
            labelAvoid.defaultAvoid(tile.features,tile.styleMap,true, true, false);
            //避让
            if(shouldPausePlacement()){
                // console.timeEnd('avoidTile');
                return;
            }
        }
        // console.timeEnd('avoidTile');
        finished = true;
    }


    static isFinished(){
        return finished;
    }
}

module.exports = AvoidTile;
