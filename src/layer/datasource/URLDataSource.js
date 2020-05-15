/**
 * Created by kongjian on 2017/6/30.
 */
const DataSource = require('./DataSource');
const {Deferred,getJSON} = require('./../../utils/es6-promise');
const Version = require('../../ext/Version');
class URLDataSource extends DataSource{
    constructor() {
        super();
        //多个服务器url的域名，用于解决一个域名只有6条请求管线的限制
        this.urlArray=[];
        //数据源类型
        this.type = 'URLDataSource';
        //注记数据的请求url
        this.url = null;
        //样式文件的请求接口url
        this.styleUrl = null;
        //样式文件Id
        this.styleId = 'style';
        //过滤条件
        this.filter = null;
        //纹理
        this.textures = {};
        //过滤条件字符
        this.control = null;
        //过滤的id
        this.controlId = null;
        // 不带过滤条件的url
        this.sourceUrl = null;
        //域名
        this.host = '';
        //服务名
        this.servername = '';
    }



    /**
     * 加载样式文件和纹理数据
     */
    loadStyle(styleType){
        let def0 = new Deferred();
        let def1 = new Deferred();
        let def2 = new Deferred();

        //解析url，获取servername,styleId
        this.parseUrl();
        let queryParam = this.url.split('?')[1];

        if(!this.sourceUrl){
            this.sourceUrl = this.url +'&clientVersion='+Version;
            this.url = this.url +'&clientVersion='+Version;
        }

        if(this.control && this.isIE()){
            //设置过滤条件
            getJSON({type:'post',url:this.host + '/mapserver/vmap/'+this.servername+'/setControl',
                data:'control='+this.control,
                dataType:'json'})
                .then(function(result) {
                    this.controlId = result.id;
                    this.url = this.sourceUrl + '&controlId='+result.id;
                    def0.resolve();
                }.bind(this));
        }else{
            if(this.control){
                this.url = this.sourceUrl + '&control='+encodeURIComponent(this.control);
            }else{
                this.url = this.sourceUrl;
            }
            def0.resolve();
        }

        if(!styleType){
            styleType = 'label';
        }

        if(this.styleId == '_default__'){
            let styleStr = 'var layers = drawer.getAllLayer(); layers.setStyle(function(level , get){' +
                ' return {"type":"_default__","show":true,"pointFillStyle":"#ff0000","radius":5,"lineFillStyle":"#00ff00","lineWidth":3 }' +
                '})';
            this.styleFun = new Function("drawer","level", styleStr);
            return [def0];
        }

        //请求样式文件
        getJSON({url:this.host + '/mapserver/styleInfo/'+this.servername+'/'+this.styleId+'/'+styleType+'/style.js?'+Math.random()+'&'+queryParam,dataType:'text'})
            .then(function(result) {
                this.styleFun = new Function("drawer","level", result);
                def1.resolve();
        }.bind(this));

        //请求图标纹理
        getJSON({url:this.host+ '/mapserver/styleInfo/'+this.servername+'/'+this.styleId+'/label/texture.js?'+Math.random()+'&'+queryParam,dataType:'text'}).then(function(result){
            let textures = JSON.parse(result);
            let totalCount = 0;
            for(let i in textures){
                totalCount++;
            }

            if(totalCount == 0){
                def2.resolve();
                return;
            }

            let count = 0;
            for(let key in textures){
                let img = new Image();
                img.name = key;
                 img.onload = function(data) {
                    count++;
                    let name = data.target.name;
                    this.textures[name] =data.target;
                    if(count == totalCount){
                        def2.resolve();
                    }
                }.bind(this);
                img.src = textures[key];
            }
        }.bind(this));
       return [def0,def1,def2];
    }

    /**
     * 解析url
     */
    parseUrl(){
        let urlParts = this.url.split('?');
        let urlPartOne = urlParts[0].split('/mapserver/');
        this.host = urlPartOne[0];
        this.servername = urlPartOne[1].split('/')[1];
        let params = urlParts[1].split('&');
        for(let i = 0;i<params.length;i++){
            let param = params[i];
            let keyValue = param.split('=');
            if(keyValue[0] == 'styleId'){
                this.styleId = keyValue[1];
                return;
            }
        }
    };


    /**
     * 设置过滤条件
     */
    setFilter(filter){
        this.control = null;
        if(!this.url ||  !filter || (filter.layers.length == 0 && filter.order.length == 0)){
            return;
        }

        for(let i = 0;i<filter.layers.length;i++){
            let filterLayer = filter.layers[i];
            if(!filterLayer.id){
                filter.layers.splice(i,1);
            }
        }

        this.control = JSON.stringify(filter);
    }

    getTexture(key) {
        return this.textures[key];
    }
    addTexture(key,texture) {
        this.textures[key] = texture;
    }


    /**
     * 是否为ie浏览器,ie9 除外，ie9无法跨域发送post带数据的请求
     */
    isIE() {
        if (!!window.ActiveXObject || "ActiveXObject" in window){
            //ie9 除外，ie9无法跨域发送post带数据的请求
            var b_version=navigator.appVersion
            var version=b_version.split(";");
            if(version[1]){
                var trim_Version=version[1].replace(/[ ]/g,"");
                if(trim_Version == 'MSIE9.0'){
                    return false;
                }
            }
            return true;
        }
        else
            return false;
    };
};

module.exports = URLDataSource;