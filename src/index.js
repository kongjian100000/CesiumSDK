'use strict';
const Custom = module.exports = {};
//扩展cesium类
require('./cover/LabelCollectionExt');
require('./cover/TextureExt');
require('./cover/GlobeSurfaceTileProviderExt');
require('./cover/PrimitiveExt');
require('./cover/GeometryInstanceExt');
require('./cover/QuadtreePrimitiveExt');

require('./cover/Cesium3DtilesetExt');
require('./cover/Batched3DModel3DTileContentExt');
require('./cover/ModelExt');
require('./cover/CameraExt');
// require('./cover/ScreenSpaceCameraControllerExt');

Custom.LabelCollectionExt = require('./cover/LabelCollectionExt');
//扩展后期处理效果
Custom.PostProcessStageLibraryExt = require('./cover/PostProcessStageLibraryExt');

Custom.CesiumTerrainProvider = require('./ext/CesiumTerrainProvider');
Custom.createWorldTerrain = require('./ext/createWorldTerrain');





//发光效果
Custom.LineGlow = require('./gloweffect/LineGlow');
Custom.TowerGlow = require('./gloweffect/TowerGlow');
Custom.RidingLanternGlow = require('./gloweffect/RidingLanternGlow');
Custom.PolygonDiffuseGlow = require('./gloweffect/PolygonDiffuseGlow');


Custom.RidingLanternGlowPrimitive = require('./gloweffect/RidingLanternGlowPrimitive');


//光源效果
Custom.PointLight = require('./lighteffect/PointLight');
Custom.RadarLight = require('./lighteffect/RadarLight');
Custom.WaveLight = require('./lighteffect/WaveLight');
Custom.UpDownScanLight = require('./lighteffect/UpDownScanLight');
Custom.Wave3dTileLight = require('./lighteffect/Wave3dTileLight');
Custom.Radar3dTileLight = require('./lighteffect/Radar3dTileLight');

Custom.ModelShaderFactory = require('./lighteffect/ModelShaderFactory');





// Custom.VectorLayer = require('./layer/vector/VectorLayer');
Custom.VectorTileServiceImageryProvider = require('./layer/vector/VectorTileServiceImageryProvider');
Custom.LabelTileServiceImageryProvider = require('./layer/label/LabelTileServiceImageryProvider');
Custom.HouseTileServiceImageryProvider = require('./layer/house/HouseTileServiceImageryProvider');
Custom.WebMapTileServiceImageryProvider = require('./layer/wmts/WebMapTileServiceImageryProvider');

Custom.ImageryLayer = require('./layer/ImageryLayer');



Custom.DataSource = require('./layer/datasource/DataSource');
Custom.URLDataSource = require('./layer/datasource/URLDataSource');
Custom.LocalDataSource = require('./layer/datasource/LocalDataSource');
Custom.FilterLayer = require('./filter/FilterLayer');

Custom.GlyphSource = require('./layer/label/glyph/GlyphSource');



//气泡
Custom.Overlay = require('./overlay/Overlay');

