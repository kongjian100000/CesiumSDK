
class GridFilter{
    /**
     *
     * @param tilesize 瓦片大小
     * @param cellsize 小正方形网格的宽
     * @param buffer  外扩多少像素
     * @param maxPerCell  小正方形中允许放多小个注记
     */
    constructor(tilesize, cellsize, buffer,maxPerCell) {
        let n = tilesize / cellsize;
        let padding = buffer / cellsize;
        this.maxPerCell = maxPerCell == null ? 1 : maxPerCell;

        this.cells = {};
        this.d = n + 2 * padding;
        this.n = n;
        this.padding = padding;
        this.scale = n / tilesize;
        let p = (padding / n) * tilesize;
        this.min = -p;
        this.max = tilesize + p;
    }

    /**
     *  是否能放下指定的点
     * @param x
     * @param y
     * @returns {boolean}
     */
    filter(x,y){
        if (x < this.min || x > this.max || y < this.min || y > this.max ) {
            return false;
        }

        let cx = this.convertToCellCoord(x);
        let cy = this.convertToCellCoord(y);
        let cellIndex = this.d * cy + cx;
        //console.log('格网号：'+cellIndex);
        if(this.cells[cellIndex] >= this.maxPerCell){
            return false;
        }else{
            let i = this.cells[cellIndex];
            if(i == null){
                this.cells[cellIndex] = 1;
            }else{
                this.cells[cellIndex] = i++;
            }
            return true;
        }
    }

    /**
     *  是否能放下指定的box
     * @param box
     * @returns {boolean}
     */
    filterByBox(box){
        let startX = this.convertToCellCoord(box[0]);
        let endX = this.convertToCellCoord(box[2]);
        let startY = this.convertToCellCoord(box[1]);
        let endY = this.convertToCellCoord(box[3]);
        for(let i =startX;i<= endX;i++){
            for(let j=startY;j<=endY;j++){
                let cellIndex = this.d * j + i;
                //如果任意一个小格网被占用，则本box不能放下
                if(this.cells[cellIndex]){
                    return false;
                }
            }
        }

        //标识小格网被占用
        for(let i =startX;i<= endX;i++){
            for(let j=startY;j<=endY;j++){
                let cellIndex = this.d * j + i;
                this.cells[cellIndex] = 1;
            }
        }
        return true;
    }


    clean(){
        this.cells = {};
        this.saveCount = 0;
    }

    convertToCellCoord(x){
        return Math.max(0, Math.min(this.d - 1, Math.floor(x * this.scale) + this.padding));
    }
}

module.exports = GridFilter;