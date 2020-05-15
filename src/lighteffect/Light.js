/**
 * Created by user on 2020/3/16.
 */
/**
 *  光源基类
 */
class Light{
    constructor(){
        //光源类型
        this.type = '';
        //光源的坐标集合
        this.positionArray = [];
        //光源的颜色集合
        this.colorArray = [];
        //光源个数
        this.lightCount = 0;
        //光源个数集合，key为光源的唯一id
        this.lightMap = {};
        //感光物体集合
        this.films = [];
    }

    /**
     *  添加感光物体，物体需要实现updateLightShader和removeLightShader接口
     * @param film
     */
    addFilm(film){
        this.films.push(film);

        if(this.positionArray.length > 0){
            //更新受光物体的光源shader
            film.updateLightShader(this);
        }
    }

    /**
     *  移除感光物体
     * @param film
     */
    removeFilm(film){
        let index = this.films.indexOf(film);
        this.films.splice(index,1);

        if(this.positionArray.length > 0){
            //更新受光物体的光源shader
            film.removeLightShader(this.type);
        }
    }

    /**
     *  添加光源,id相同的会更新光源
     * @param id
     */
    addLight(id,params){
        if(!this.lightMap[id]){
            this.lightCount ++;
        }

        this.lightMap[id] = params;
        this.updateLightArray();

        for(let index in this.films){
            let film = this.films[index];
            //更新受光物体的光源shader
            film.updateLightShader(this);
        }
    }

    /**
     *根据key删除光源
     * @param id
     */
    removeLight(id){
        if(this.lightMap[id]){
            let item = this.lightMap[id];
            this.lightCount --;
            delete this.lightMap[id];
            this.updateLightArray();

            //如果光源没有了
            if(this.positionArray.length  == 0){
                for(let index in this.films){
                    let film = this.films[index];
                    //移除受光物体的光源shader
                    film.removeLightShader(this.type);
                }
            }else{
                for(let index in this.films){
                    let film = this.films[index];
                    //更新受光物体的光源shader
                    film.updateLightShader(this);
                }
            }
        }
    }

    /**
     *  更新光源参数数组
     */
    updateLightArray(){

    }

    /**
     *  获取地面的光源shader
     */
    getGlobeSurfaceShader(){

    }

    /**
     *  获取使用Primitive绘制的纯色面的shader
     */
    getPolygonColorPrimitiveShader(){

    }


    /**
     *  获取使用Primitive绘制的纯色线的shader
     */
    getLineColorPrimitiveShader(){

    }
}

module.exports = Light;