const Cartesian3 = Cesium.Cartesian3;
const Color = Cesium.Color;
const defined = Cesium.defined;
const CallbackProperty = Cesium.CallbackProperty;
const VectorDrawer = require('./parse/VectorDrawer');
const CesiumMath = Cesium.Math;


function defaultCrsFunction(coordinates) {
    return Cartesian3.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
    // return Cartesian3.fromDegrees(coordinates[0], coordinates[1], 9000);
}

var crsNames = {
    'urn:ogc:def:crs:OGC:1.3:CRS84' : defaultCrsFunction,
    'EPSG:4326' : defaultCrsFunction,
    'urn:ogc:def:crs:EPSG::4326' : defaultCrsFunction
};

var crsLinkHrefs = {};
var crsLinkTypes = {};
var defaultMarkerSize = 48;
var defaultMarkerSymbol;
var defaultMarkerColor = Color.ROYALBLUE;
var defaultStroke = Color.YELLOW;
var defaultStrokeWidth = 2;
var defaultFill = Color.fromBytes(255, 255, 0, 100);
var defaultClampToGround = false;

var sizes = {
    small : 24,
    medium : 48,
    large : 64
};

var simpleStyleIdentifiers = ['title', 'description', //
    'marker-size', 'marker-symbol', 'marker-color', 'stroke', //
    'stroke-opacity', 'stroke-width', 'fill', 'fill-opacity'];

function defaultDescribe(properties, nameProperty) {
    var html = '';
    for ( var key in properties) {
        if (properties.hasOwnProperty(key)) {
            if (key === nameProperty || simpleStyleIdentifiers.indexOf(key) !== -1) {
                continue;
            }
            var value = properties[key];
            if (defined(value)) {
                if (typeof value === 'object') {
                    html += '<tr><th>' + key + '</th><td>' + defaultDescribe(value) + '</td></tr>';
                } else {
                    html += '<tr><th>' + key + '</th><td>' + value + '</td></tr>';
                }
            }
        }
    }

    if (html.length > 0) {
        html = '<table class="cesium-infoBox-defaultTable"><tbody>' + html + '</tbody></table>';
    }

    return html;
}

function createDescriptionCallback(describe, properties, nameProperty) {
    var description;
    return function(time, result) {
        if (!defined(description)) {
            description = describe(properties, nameProperty);
        }
        return description;
    };
}

function defaultDescribeProperty(properties, nameProperty) {
    return new CallbackProperty(createDescriptionCallback(defaultDescribe, properties, nameProperty), true);
}
const BEGIN = 1;
const LOADED = 2;
const REMOVED = 3;


class VectorDataSource{
    constructor(name,data,level,viewer,rectangle,tileSize,needDecode) {
        this.name = name;
        this.data =data;
        this.level = level;
        this.viewer = viewer;
        this.tileSize = tileSize;
        this.rectangle = rectangle;
        this.needDecode = needDecode;
        this.type = 'vector';
        this.state = BEGIN;
        this.depthRange = {near:0.1,far:0.11};

        this.geometryTypes = {
            LineString : this.processLineString.bind(this),
            MultiLineString : this.processMultiLineString.bind(this),
            MultiPolygon : this.processMultiPolygon.bind(this),
            Polygon : this.processPolygon.bind(this)
        };


        this.polygonPrimitive =  new Cesium.Primitive({
            geometryInstances:[],
            appearance : new Cesium.PerInstanceColorAppearance({
                renderState: {
                    depthRange:this.depthRange,
                },
                flat : true,
                translucent : false,
                closed:true
            })
        });

        this.outlinePrimitive =  new Cesium.Primitive({
            geometryInstances:[],
            appearance : new Cesium.PerInstanceColorAppearance({
                flat : true,
                renderState: {
                    depthRange:this.depthRange,
                },
                translucent : false,
                closed:true
            })
        });
        this.linePrimitive = new Cesium.Primitive({
            geometryInstances:[],
            appearance : new Cesium.PolylineColorAppearance({
                renderState: {
                    depthRange:this.depthRange,
                },
                flat : true,
                translucent:false
            })
        });
    }

    load(styleFun) {
        this.decodeData(this.data);
        //设置样式
        let featureMap = {};
        let drawer = new VectorDrawer([this.data], this.level, featureMap,this.controlVector,this.highLightVector);
        styleFun.call({}, drawer, this.level);

        this.formatGeometrys(featureMap);
        this.processTopology(featureMap);

        this.state = LOADED;
    }


    /**
     *  解码数据，包括点坐标偏移，正方形F的解码等
     * @param data
     */
    formatGeometrys(featureMap){
        for(let key in featureMap){
            let features = featureMap[key];
            for(let i = 0;i<features.length;i++){
                let feature = features[i];
                let geometrys = [];
                this.recursiveFormat(geometrys,feature.data);
                delete feature.data;
                feature.geometrys = geometrys;
            }
        }
    }

    recursiveFormat(geometrys,components){
        if (Array.isArray(components[0])) {
            let len = components.length;
            for (let i = 0; i < len; i++) {
                let component = components[i];
                this.recursiveFormat(geometrys,component);
            }
        } else {
            geometrys.push(components);
        }
    }

    /**
     *  解码数据，包括点坐标偏移，正方形F的解码等
     * @param data
     */
    decodeData(data){
        for(let layername in data){
            let features = data[layername].features;
            if(!features){
                features = data[layername].datas;
            }
            for(let i = 0;i<features.length;i++){
                this.recursiveDecode(features[i][2]);
            }
        }
    }

    recursiveDecode(components){
        if(components[0] == 'F'){
            components[0] = this.formatF();
            return;
        }

        if (Array.isArray(components[0])) {
            let len = components.length;
            for (let i = 0; i < len; i++) {
                let component = components[i];
                this.recursiveDecode(component);
            }
        } else {
            if(this.needDecode){
                this.recoveryData(components);
            }
        }
    }

    recoveryData(components){
        let prevPoint = [components[0],components[1]];
        for(let j =2;j<components.length;j++){
            let x = prevPoint[0]+components[j];
            let y = prevPoint[1]+components[j+1];
            components[j] = x;
            components[j+1] = y;
            prevPoint = [x,y];
            j++;
        }
    }

    formatF(){
        return [-this.tileSize*0.05,-this.tileSize*0.05,this.tileSize*1.05,-this.tileSize*0.05,
            this.tileSize*1.05,this.tileSize*1.05,-this.tileSize*0.05,this.tileSize*1.05];
    }


     processTopology(featureMap) {
        for(let key in featureMap){
            let features = featureMap[key];
            this.processFeatures(features);
        }

         this.polygonPrimitive.geometryInstances = this.polygonPrimitive.geometryInstances.reverse();
         this.outlinePrimitive.geometryInstances = this.outlinePrimitive.geometryInstances.reverse();
         this.linePrimitive.geometryInstances = this.linePrimitive.geometryInstances.reverse();
         this.addToPrimitives();
    }

    processFeatures(features){
        if(features.length > 0){
            let feature = features[0];
            let typeHandler = this.geometryTypes[feature.type];
            typeHandler(feature.style,features);
        }
    }

    processPolygon(style,features) {
        let fillColor = this.getColor(style,'fillColor','fillOpacity');
        let fillAttributes = {color : Cesium.ColorGeometryInstanceAttribute.fromColor(fillColor)};
        let strokeColor,strokeAttributes;

        if(style.stroke){
            strokeColor = this.getColor(style,'strokeColor','strokeOpacity');
            strokeAttributes = {color : Cesium.ColorGeometryInstanceAttribute.fromColor(strokeColor)};
        }

        let height = 0;
        let extrudedHeight = 0;

        for(let i = 0;i<features.length;i++){
            let feature = features[i];
            for(let j =0;j<feature.geometrys.length;j++){
                let positions = this.coordinatesArrayToCartesianArray(feature.geometrys[j], defaultCrsFunction);
                let polygonInstance = this.createPolygonGeometry(positions,height,extrudedHeight,fillAttributes);
                this.polygonPrimitive.geometryInstances.push(polygonInstance);

                if(style.stroke){
                    let outlineInstance = this.createPolygonOutlineGeometry(positions,height,extrudedHeight,strokeAttributes);
                    this.outlinePrimitive.geometryInstances.push(outlineInstance);
                }
            }

        }
    }

    processMultiPolygon(style,features) {
        this.processPolygon(style,features);
    }

    processLineString(style,features){
        let strokeColor = this.getColor(style,'strokeColor','strokeOpacity');
        let strokeAttributes = {color : Cesium.ColorGeometryInstanceAttribute.fromColor(strokeColor)};

        for(let i = 0;i<features.length ;i++){
            let feature = features[i];
            for(let j =0;j<feature.geometrys.length;j++){
                let positions = this.coordinatesArrayToCartesianArray(feature.geometrys[j], defaultCrsFunction);
                let lineInstance = this.createPolyLineGeometry(style,positions,strokeAttributes);
                this.linePrimitive.geometryInstances.push(lineInstance);
            }
        }
    }

    processMultiLineString(style,features) {
        this.processLineString(style,features);
    }

    coordinatesArrayToCartesianArray(coordinates, crsFunction) {
        var positions = [];
        for (var i = 0; i < coordinates.length; i++) {
            var pt = this.formatToDegrees(coordinates[i],coordinates[i+1]);
            var cartesian3 = crsFunction(pt);
           positions.push(cartesian3);
            i++;
        }
        return positions;
    }

    formatToDegrees(x,y){
        var lon = CesiumMath.toDegrees(this.rectangle.west + this.rectangle.width/ this.tileSize* x);
        var lat = CesiumMath.toDegrees(this.rectangle.north - this.rectangle.height/ this.tileSize* y);
        lon = Number(lon.toFixed(6));
        lat = Number(lat.toFixed(6));
        return [lon,lat];
    }

    createPolyLineGeometry(style,positions,attributes){
        let width = style['strokeWidth'];
        width = width?width:1;
       return new Cesium.GeometryInstance({
            geometry : new Cesium.PolylineGeometry({
                positions : positions,
                width : width,
                vertexFormat : Cesium.PolylineColorAppearance.VERTEX_FORMAT
            }),
            attributes : attributes
        });
    }

    getColor(style,colorField,opacityField){
        let color;
        let cf = style[colorField];
        if (defined(cf)) {
            color = Color.fromCssColorString(cf);
            if(!defined(color)){
                color = Color.fromCssColorString('#ffffff');
            }
            color.alpha = 1.0;
        }
        let opacity = style[opacityField];
        if (defined(opacity) && opacity !== 1.0) {
            color.alpha = opacity;
        }
        return color;
    }

    createPolygonGeometry(positions,height,extrudedHeight,attributes) {
        return  new Cesium.GeometryInstance({
            geometry:Cesium.PolygonGeometry.fromPositions({
                height:height,
                extrudedHeight:extrudedHeight,
                positions : positions,
                vertexFormat :Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
            }),
            attributes:attributes
        });
    }

    createPolygonOutlineGeometry(positions,height,extrudedHeight,attributes){
        return  new Cesium.GeometryInstance({
            geometry:Cesium.PolygonOutlineGeometry.fromPositions({
                height:height,
                extrudedHeight:extrudedHeight,
                positions : positions,
                vertexFormat :Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
            }),
            attributes:attributes
        });
    }

    //移除
    remove(){
        this.viewer.scene.primitives.remove(this.polygonPrimitive);
        this.viewer.scene.primitives.remove(this.outlinePrimitive);
        this.viewer.scene.primitives.remove(this.linePrimitive);

        this.state = REMOVED;
    }

    //销毁
    destroy(){
        this.remove();
        this.polygonPrimitive.destroy();
        this.outlinePrimitive.destroy();
        this.linePrimitive.destroy();
    }

    addToPrimitives(){
        //先加入的后画
        this.viewer.scene.primitives.add(this.linePrimitive);
        this.viewer.scene.primitives.add(this.polygonPrimitive);
        this.viewer.scene.primitives.add(this.outlinePrimitive);
        this.state = LOADED;
    }

    show(styleFun){
        if(this.state == BEGIN){
            this.load(styleFun);
        }
        if(this.state == REMOVED){
            this.addToPrimitives();
        }
    }
}
module.exports = VectorDataSource;