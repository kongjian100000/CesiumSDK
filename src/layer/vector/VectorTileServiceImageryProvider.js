const combine = Cesium.combine;
const Credit  = Cesium.Credit;
const defaultValue = Cesium.defaultValue;
const defined = Cesium.defined;
const DeveloperError = Cesium.DeveloperError;
const Event = Cesium.Event;
const freezeObject = Cesium.freezeObject;
const isArray = Cesium.isArray;
const Rectangle = Cesium.Rectangle;
const Resource = Cesium.Resource;
const WebMercatorTilingScheme = Cesium.WebMercatorTilingScheme;
const when = Cesium.when;
const ImageryProvider = Cesium.ImageryProvider;
const TimeDynamicImagery = Cesium.TimeDynamicImagery;
const VectorDataSource = require('./VectorDataSource');
const Cache = require('../../utils/Cache');

    var defaultParameters = {
        service : 'WMTS',
        version : '1.0.0',
        request : 'GetTile'
    };

    /**
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see UrlTemplateImageryProvider
     */
    class VectorTileServiceImageryProvider {
        constructor(viewer,options) {
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            this.id = Math.random();
            this.viewer = viewer;
            this.needDecode = defaultValue(options.needDecode, false);

            //>>includeStart('debug', pragmas.debug);
            if (!defined(options.url)) {
                throw new DeveloperError('options.url is required.');
            }
            //>>includeEnd('debug');

            var resource = Resource.createIfNeeded(options.url);

            var style = options.style;
            var tileMatrixSetID = options.tileMatrixSetID;
            var url = resource.url;
            if (url.indexOf('{') >= 0) {
                var templateValues = {
                    style: style,
                    Style: style,
                    TileMatrixSet: tileMatrixSetID
                };

                resource.setTemplateValues(templateValues);
                this._useKvp = false;
            } else {
                resource.setQueryParameters(defaultParameters);
                this._useKvp = true;
            }

            this._resource = resource;
            this._layer = options.layer;
            this._style = style;
            this._tileMatrixSetID = tileMatrixSetID;
            this._tileMatrixLabels = options.tileMatrixLabels;
            this._format = defaultValue(options.format, 'image/jpeg');
            this._tileDiscardPolicy = options.tileDiscardPolicy;

            this._tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new WebMercatorTilingScheme({ellipsoid: options.ellipsoid});
            this._tileWidth = defaultValue(options.tileWidth, 256);
            this._tileHeight = defaultValue(options.tileHeight, 256);

            this._minimumLevel = defaultValue(options.minimumLevel, 0);
            this._maximumLevel = options.maximumLevel;

            this._rectangle = defaultValue(options.rectangle, this._tilingScheme.rectangle);
            this._dimensions = options.dimensions;

            var that = this;
            this._reload = undefined;
            if (defined(options.times)) {
                this._timeDynamicImagery = new TimeDynamicImagery({
                    clock: options.clock,
                    times: options.times,
                    requestImageFunction: function (x, y, level, request, interval) {
                        return requestImage(that, x, y, level, request, interval);
                    },
                    reloadFunction: function () {
                        if (defined(that._reload)) {
                            that._reload();
                        }
                    }
                });
            }

            this._readyPromise = when.defer();

            // Check the number of tiles at the minimum level.  If it's more than four,
            // throw an exception, because starting at the higher minimum
            // level will cause too many tiles to be downloaded and rendered.
            var swTile = this._tilingScheme.positionToTileXY(Rectangle.southwest(this._rectangle), this._minimumLevel);
            var neTile = this._tilingScheme.positionToTileXY(Rectangle.northeast(this._rectangle), this._minimumLevel);
            var tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
            //>>includeStart('debug', pragmas.debug);
            if (tileCount > 4) {
                throw new DeveloperError('The imagery provider\'s rectangle and minimumLevel indicate that there are ' + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
            }
            //>>includeEnd('debug');

            this._errorEvent = new Event();

            var credit = options.credit;
            this._credit = typeof credit === 'string' ? new Credit(credit) : credit;

            this._subdomains = options.subdomains;
            if (isArray(this._subdomains)) {
                this._subdomains = this._subdomains.slice();
            } else if (defined(this._subdomains) && this._subdomains.length > 0) {
                this._subdomains = this._subdomains.split('');
            } else {
                this._subdomains = ['a', 'b', 'c'];
            }


            this.needDecode = options.needDecode;
            this.parseUrl(options.url);
            Promise.all(this.loadStyle()).then(function(){
                this.ready = {
                    value : true
                }
                this._readyPromise.resolve(true);

                //监听帧事件
                viewer.scene.postRender.addEventListener(this.renderFrame.bind(this));
            }.bind(this));


            this.cache = new Cache(300);
            this.currDataSourceMap ={};
        }


        renderFrame(){
            let renderTileMap = this.getRenderTileMap();

            //移除不是当前屏幕要显示的瓦片
            for(let key in this.currDataSourceMap){
                if(!renderTileMap[key]){
                    this.currDataSourceMap[key].remove();
                    delete this.currDataSourceMap[key];
                }
            }

            //增加本次最新的瓦片去绘制
            for(let name in renderTileMap){
                let ds = this.cache.get(name);
                if(ds){
                    ds.show(this.styleFun);
                    this.currDataSourceMap[name] = ds;
                }
            }
        }

        /**
         * 获取当前要显示的tile
         * @returns {{}}
         */
        getRenderTileMap(){
            let renderTileMap ={};
            let renderTiles = this.viewer.scene._globe._surface._tileProvider._quadtree._tilesToRender;
            var labels = this._tileMatrixLabels;

            for(let i = 0;i<renderTiles.length;i++){
                let tileImagerys = renderTiles[i].data.imagery;
                for(let j = 0;j<tileImagerys.length;j++){
                    let imagery = tileImagerys[j].loadingImagery;
                    if(imagery && imagery.imageryLayer._imageryProvider.id == this.id){
                        let level = defined(labels) ? labels[imagery.level] : imagery.level;
                        let key = imagery.x+'_'+imagery.y+'_'+level;
                        renderTileMap[key] = level;
                    }
                }
            }
            return renderTileMap;
        }

        /**
         * 解析url
         */
        parseUrl(url){
            let urlParts = url.split('?');
            let urlPartOne = urlParts[0].split('/mapserver/');

            this.host = urlPartOne[0];
            if(this._subdomains.length > 0){
                this.host = this.host.replace('{s}',this._subdomains[0]);
            }

            this.servername = urlPartOne[1].split('/')[1];

            this.queryParam = urlParts[1];
            let params = this.queryParam.split('&');
            for(let i = 0;i<params.length;i++){
                let param = params[i];
                let keyValue = param.split('=');
                if(keyValue[0] == 'styleId'){
                    this.styleId = keyValue[1];
                    return;
                }
            }
        };

        loadStyle(){
            var styleUrl = this.host + '/mapserver/styleInfo/'+this.servername+'/'+this.styleId+'/layer/style.js?'+Math.random();
            var resource = Resource.createIfNeeded(styleUrl);
            var promise1 = resource.fetchText().then(function(result){
                this.styleFun = new Function("drawer","level", result);
            }.bind(this));

            // var def2 = when.defer();
            // var textureUrl = this.host+ '/mapserver/styleInfo/'+this.servername+'/'+this.styleId+'/label/texture.js?'+Math.random()
            // var resource = Resource.createIfNeeded(textureUrl);
            // resource.fetchJson().then(function(textures){
            //     var totalCount = 0;
            //     for(var i in textures){
            //         totalCount++;
            //     }
            //
            //     if(totalCount == 0){
            //         def2.resolve();
            //         return;
            //     }
            //
            //     var count = 0;
            //     for(var key in textures){
            //         var img = new Image();
            //         img.name = key;
            //         img.onload = function(data) {
            //             count++;
            //             var name = data.target.name;
            //             this.textures[name] =data.target;
            //             if(count == totalCount){
            //                 def2.resolve();
            //             }
            //         }.bind(this);
            //         img.src = textures[key];
            //     }
            //     def2.resolve();
            // }.bind(this));
            //
            // return [promise1,def2];
            return [promise1];
        };

        requestImageNow(imageryProvider, col, row, level, request, interval) {
            var labels = imageryProvider._tileMatrixLabels;
            var tileMatrix = defined(labels) ? labels[level] : level.toString();
            var subdomains = imageryProvider._subdomains;
            var staticDimensions = imageryProvider._dimensions;
            var dynamicIntervalData = defined(interval) ? interval.data : undefined;

            var resource;
            if (!imageryProvider._useKvp) {
                var templateValues = {
                    z: tileMatrix,
                    y: row.toString(),
                    x: col.toString(),
                    s: subdomains[(col + row + level) % subdomains.length]
                };

                resource = imageryProvider._resource.getDerivedResource({
                    request: request
                });
                resource.setTemplateValues(templateValues);

                if (defined(staticDimensions)) {
                    resource.setTemplateValues(staticDimensions);
                }

                if (defined(dynamicIntervalData)) {
                    resource.setTemplateValues(dynamicIntervalData);
                }
            } else {
                // build KVP request
                var query = {};
                query.tilematrix = tileMatrix;
                query.layer = imageryProvider._layer;
                query.style = imageryProvider._style;
                query.tilerow = row;
                query.tilecol = col;
                query.tilematrixset = imageryProvider._tileMatrixSetID;
                query.format = imageryProvider._format;

                if (defined(staticDimensions)) {
                    query = combine(query, staticDimensions);
                }

                if (defined(dynamicIntervalData)) {
                    query = combine(query, dynamicIntervalData);
                }
                resource = imageryProvider._resource.getDerivedResource({
                    queryParameters: query,
                    request: request
                });
            }
            var deferred = when.defer();
            let xyz = {x:col,y:row,z:level};
            let success = this.requestJsonData(deferred,imageryProvider, resource,xyz);
            if(!success){
                return undefined;
            }
            return deferred.promise;
        }

        requestJsonData(deferred,imageryProvider, url,xyz){
            var resource = Resource.createIfNeeded(url);
            var jsonPromise = resource.fetchJson();
            if(!jsonPromise){
                return false;
            }

            let level = url._templateValues.z;
            jsonPromise.then(function(deferred,xyz,level,data){
                deferred.reject();
                this.jsonPromiseResult(xyz,level,data);
            }.bind(this,deferred,xyz,level));
            return true;
        }

        jsonPromiseResult(xyz,level,data){
            if(data && data.layer !={}){
                let x = xyz.x;
                let y = xyz.y;
                let z = xyz.z;

                let rectangle = this._tilingScheme.tileXYToRectangle(x, y, z);
                let name = x+'_'+y+'_'+level;
                let ds = this.cache.get(name);
                if(!ds){
                    ds = new VectorDataSource(name,data.layer,level,this.viewer,rectangle,this._tileWidth,this.needDecode);
                    let item = this.cache.set(ds.name,ds);
                    if(item && item.name != name){
                        item.destroy();
                    }
                }
            }
        }

        get url() {
            return this._resource.url;
        }

        get proxy() {
            return this._resource.proxy;
        }

        get tileWidth() {
            return this._tileWidth;
        }

        get tileHeight() {
            return this._tileHeight;
        }

        get maximumLevel() {
            return this._maximumLevel;
        }

        get minimumLevel() {
            return this._minimumLevel;
        }

        get tilingScheme() {
            return this._tilingScheme;
        }

        get rectangle() {
            return this._rectangle;
        }

        get tileDiscardPolicy() {
            return this._tileDiscardPolicy;
        }

        get errorEvent() {
            return this._errorEvent;
        }

        get format() {
            return this._format;
        }

        get readyPromise() {
            return this._readyPromise;
        }

        get credit() {
            return this._credit;
        }

        get hasAlphaChannel() {
            return true;
        }

        get clock() {
            return this._timeDynamicImagery.clock;
        }

        set clock(value) {
            this._timeDynamicImagery.clock = value;
        }

        get times() {
            return this._timeDynamicImagery.times;
        }

        set times(value) {
            this._timeDynamicImagery.times = value;
        }

        get dimensions() {
            return this._dimensions;
        }

        set dimensions(value){
            if (this._dimensions !== value) {
                this._dimensions = value;
                if (defined(this._reload)) {
                    this._reload();
                }
            }
        }

        getTileCredits(x, y, level) {
            return undefined;
        };

        requestImage(x, y, level, request) {
            var result;
            var timeDynamicImagery = this._timeDynamicImagery;
            var currentInterval;

            // Try and load from cache
            if (defined(timeDynamicImagery)) {
                currentInterval = timeDynamicImagery.currentInterval;
                result = timeDynamicImagery.getFromCache(x, y, level, request);
            }

            // Couldn't load from cache
            if (!defined(result)) {
                result = this.requestImageNow(this, x, y, level, request, currentInterval);
            }

            // If we are approaching an interval, preload this tile in the next interval
            if (defined(result) && defined(timeDynamicImagery)) {
                timeDynamicImagery.checkApproachingInterval(x, y, level, request);
            }

            return result;
        };

        pickFeatures(x, y, level, longitude, latitude) {
            return undefined;
        };
    }
module.exports =VectorTileServiceImageryProvider;
