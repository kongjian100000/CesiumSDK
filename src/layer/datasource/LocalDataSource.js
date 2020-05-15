const DataSource = require('./DataSource');
const {Deferred,getJSON} = require('./../../utils/es6-promise');
/**
 * Created by kongjian on 2017/6/30.
 */
class LocalDataSource extends DataSource{
    constructor() {
       super();
        //数据源类型
        this.type = 'LocalDataSource';
        //本地要素集合
        this.features = [];
        //图标url Map：{name:1.png,value:'http://localhost:8080/mapserver/1.png'}
        this.textureUrls = {};
    }



    /**
     * 添加feature
     * Parameters :
     * feature
     */
    addFeature(feature){
        this.features.push(feature);
    };

    /**
     * 添加url图标
     * Parameters :
     * name 图标名称,如：1.png
     * url 图标的请求地址
     */
    addTextureUrl(name,url){
        this.textureUrls[name] = url;
    };

    /**
     * 移除url图标
     * Parameters :
     * name 图标名称,如：1.png
     */
    removeTextureUrl(name){
       delete this.textureUrls[name];
    };

    /**
     * 加载纹理
     */
    loadTexture(){
        let def = new Deferred();
        let totalCount = 0;
        for(let i in this.textureUrls){
            totalCount++;
        }

        if(totalCount == 0){
            def.resolve();
            return;
        }

        let count = 0;
        for(let key in this.textureUrls){
            let img = new Image();
            img.name = key;
            img.onload = function(data) {
                count++;
                let name = data.target.name;
                this.textures[name] =data.target;
                if(count == totalCount){
                    def.resolve();
                }
            }.bind(this);
            img.src = this.textureUrls[key];
        }
        return def;
    };

    /**
     * 通过featureId移除feature
     * Parameters :
     * featureId
     */
    removeFeatureById(featureId){
        for(let i = 0;i<this.features.length;i++){
            let feature = this.features[i];
            if(feature.id == featureId){
                this.features.splice(i,1);
            }
        }
    }

};

module.exports = LocalDataSource;