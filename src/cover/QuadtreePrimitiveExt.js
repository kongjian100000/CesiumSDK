/**
 *  使用同一级瓦片贴图
 * Created by user on 2020/3/7.
 */

const Cartesian3 =Cesium.Cartesian3;
const Cartographic =Cesium.Cartographic;
const defaultValue =Cesium.defaultValue;
const defined =Cesium.defined;
const defineProperties =Cesium.defineProperties;
const DeveloperError =Cesium.DeveloperError;
const Event =Cesium.Event;
const getTimestamp =Cesium.getTimestamp;
const CesiumMath =Cesium.Math;
const Matrix4 =Cesium.Matrix4;
const OrthographicFrustum =Cesium.OrthographicFrustum;
const OrthographicOffCenterFrustum =Cesium.OrthographicOffCenterFrustum;
const Ray =Cesium.Ray;
const Rectangle =Cesium.Rectangle;
const Visibility =Cesium.Visibility;
const QuadtreeOccluders =Cesium.QuadtreeOccluders;
const QuadtreeTile =Cesium.QuadtreeTile;
const QuadtreeTileLoadState =Cesium.QuadtreeTileLoadState;
const SceneMode =Cesium.SceneMode;
const TileReplacementQueue =Cesium.TileReplacementQueue;
const TileSelectionResult =Cesium.TileSelectionResult;
const QuadtreePrimitive = Cesium.QuadtreePrimitive;

var comparisonPoint;
var centerScratch = new Cartographic();
function compareDistanceToPoint(a, b) {
    var center = Rectangle.center(a.rectangle, centerScratch);
    var alon = center.longitude - comparisonPoint.longitude;
    var alat = center.latitude - comparisonPoint.latitude;

    center = Rectangle.center(b.rectangle, centerScratch);
    var blon = center.longitude - comparisonPoint.longitude;
    var blat = center.latitude - comparisonPoint.latitude;

    return (alon * alon + alat * alat) - (blon * blon + blat * blat);
}

var cameraOriginScratch = new Cartesian3();
var rootTraversalDetails = [];

function selectTilesForRendering(primitive, frameState) {
    var debug = primitive._debug;
    if (debug.suspendLodUpdate) {
        return;
    }

    // Clear the render list.
    var tilesToRender = primitive._tilesToRender;
    tilesToRender.length = 0;

    // We can't render anything before the level zero tiles exist.
    var i;
    var tileProvider = primitive._tileProvider;
    if (!defined(primitive._levelZeroTiles)) {
        if (tileProvider.ready) {
            var tilingScheme = tileProvider.tilingScheme;
            primitive._levelZeroTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
            var numberOfRootTiles = primitive._levelZeroTiles.length;
            if (rootTraversalDetails.length < numberOfRootTiles) {
                rootTraversalDetails = new Array(numberOfRootTiles);
                for (i = 0; i < numberOfRootTiles; ++i) {
                    if (rootTraversalDetails[i] === undefined) {
                        rootTraversalDetails[i] = new TraversalDetails();
                    }
                }
            }
        } else {
            // Nothing to do until the provider is ready.
            return;
        }
    }

    primitive._occluders.ellipsoid.cameraPosition = frameState.camera.positionWC;

    var tile;
    var levelZeroTiles = primitive._levelZeroTiles;
    var occluders = levelZeroTiles.length > 1 ? primitive._occluders : undefined;

    // Sort the level zero tiles by the distance from the center to the camera.
    // The level zero tiles aren't necessarily a nice neat quad, so we can't use the
    // quadtree ordering we use elsewhere in the tree
    comparisonPoint = frameState.camera.positionCartographic;
    levelZeroTiles.sort(compareDistanceToPoint);

    var customDataAdded = primitive._addHeightCallbacks;
    var customDataRemoved = primitive._removeHeightCallbacks;
    var frameNumber = frameState.frameNumber;

    var len;
    if (customDataAdded.length > 0 || customDataRemoved.length > 0) {
        for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
            tile = levelZeroTiles[i];
            tile._updateCustomData(frameNumber, customDataAdded, customDataRemoved);
        }

        customDataAdded.length = 0;
        customDataRemoved.length = 0;
    }

    var camera = frameState.camera;

    primitive._cameraPositionCartographic = camera.positionCartographic;
    var cameraFrameOrigin = Matrix4.getTranslation(camera.transform, cameraOriginScratch);
    primitive._cameraReferenceFrameOriginCartographic = primitive.tileProvider.tilingScheme.ellipsoid.cartesianToCartographic(cameraFrameOrigin, primitive._cameraReferenceFrameOriginCartographic);

    // Traverse in depth-first, near-to-far order.
    for (i = 0, len = levelZeroTiles.length; i < len; ++i) {
        tile = levelZeroTiles[i];
        primitive._tileReplacementQueue.markTileRendered(tile);
        if (!tile.renderable) {
            queueTileLoad(primitive, primitive._tileLoadQueueHigh, tile, frameState);
            ++debug.tilesWaitingForChildren;
        } else {
            visitIfVisible(primitive, tile, tileProvider, frameState, occluders, false, rootTraversalDetails[i]);
        }
    }

    primitive._lastSelectionFrameNumber = frameNumber;
}

function queueTileLoad(primitive, queue, tile, frameState) {
    if (!tile.needsLoading) {
        return;
    }

    if (primitive.tileProvider.computeTileLoadPriority !== undefined) {
        tile._loadPriority = primitive.tileProvider.computeTileLoadPriority(tile, frameState);
    }
    queue.push(tile);
}

/**
 * Tracks details of traversing a tile while selecting tiles for rendering.
 * @alias TraversalDetails
 * @constructor
 * @private
 */
function TraversalDetails() {
    /**
     * True if all selected (i.e. not culled or refined) tiles in this tile's subtree
     * are renderable. If the subtree is renderable, we'll render it; no drama.
     */
    this.allAreRenderable = true;

    /**
     * True if any tiles in this tile's subtree were rendered last frame. If any
     * were, we must render the subtree rather than this tile, because rendering
     * this tile would cause detail to vanish that was visible last frame, and
     * that's no good.
     */
    this.anyWereRenderedLastFrame = false;

    /**
     * Counts the number of selected tiles in this tile's subtree that are
     * not yet ready to be rendered because they need more loading. Note that
     * this value will _not_ necessarily be zero when
     * {@link TraversalDetails#allAreRenderable} is true, for subtle reasons.
     * When {@link TraversalDetails#allAreRenderable} and
     * {@link TraversalDetails#anyWereRenderedLastFrame} are both false, we
     * will render this tile instead of any tiles in its subtree and
     * the `allAreRenderable` value for this tile will reflect only whether _this_
     * tile is renderable. The `notYetRenderableCount` value, however, will still
     * reflect the total number of tiles that we are waiting on, including the
     * ones that we're not rendering. `notYetRenderableCount` is only reset
     * when a subtree is removed from the render queue because the
     * `notYetRenderableCount` exceeds the
     * {@link QuadtreePrimitive#loadingDescendantLimit}.
     */
    this.notYetRenderableCount = 0;
}

function TraversalQuadDetails() {
    this.southwest = new TraversalDetails();
    this.southeast = new TraversalDetails();
    this.northwest = new TraversalDetails();
    this.northeast = new TraversalDetails();
}

TraversalQuadDetails.prototype.combine = function(result) {
    var southwest = this.southwest;
    var southeast = this.southeast;
    var northwest = this.northwest;
    var northeast = this.northeast;

    result.allAreRenderable = southwest.allAreRenderable && southeast.allAreRenderable && northwest.allAreRenderable && northeast.allAreRenderable;
    result.anyWereRenderedLastFrame = southwest.anyWereRenderedLastFrame || southeast.anyWereRenderedLastFrame || northwest.anyWereRenderedLastFrame || northeast.anyWereRenderedLastFrame;
    result.notYetRenderableCount = southwest.notYetRenderableCount + southeast.notYetRenderableCount + northwest.notYetRenderableCount + northeast.notYetRenderableCount;
};

var traversalQuadsByLevel = new Array(31); // level 30 tiles are ~2cm wide at the equator, should be good enough.
for (var i = 0; i < traversalQuadsByLevel.length; ++i) {
    traversalQuadsByLevel[i] = new TraversalQuadDetails();
}

function altitudeToZoom(altitude) {
    var A = 40487.57;
    var B = 0.00007096758;
    var C = 91610.74;
    var D = -40467.74;

    return Math.round(D+(A-D)/(1+Math.pow(altitude/C, B)));
}

/**
 * Visits a tile for possible rendering. When we call this function with a tile:
 *
 *    * the tile has been determined to be visible (possibly based on a bounding volume that is not very tight-fitting)
 *    * its parent tile does _not_ meet the SSE (unless ancestorMeetsSse=true, see comments below)
 *    * the tile may or may not be renderable
 *
 * @private
 *
 * @param {Primitive} primitive The QuadtreePrimitive.
 * @param {FrameState} frameState The frame state.
 * @param {QuadtreeTile} tile The tile to visit
 * @param {Boolean} ancestorMeetsSse True if a tile higher in the tile tree already met the SSE and we're refining further only
 *                  to maintain detail while that higher tile loads.
 * @param {TraversalDetails} traveralDetails On return, populated with details of how the traversal of this tile went.
 */
function visitTile(primitive, frameState, tile, ancestorMeetsSse, traversalDetails) {
    var debug = primitive._debug;

    ++debug.tilesVisited;

    primitive._tileReplacementQueue.markTileRendered(tile);
    tile._updateCustomData(frameState.frameNumber);

    if (tile.level > debug.maxDepthVisited) {
        debug.maxDepthVisited = tile.level;
    }

    // var meetsSse = screenSpaceError(primitive, frameState, tile) < primitive.maximumScreenSpaceError;

    if (frameState.mode === SceneMode.SCENE2D || frameState.camera.frustum instanceof OrthographicFrustum || frameState.camera.frustum instanceof OrthographicOffCenterFrustum) {
        return screenSpaceError2D(primitive, frameState, tile);
    }
    var meetsSse = screenSpaceError(primitive, frameState, tile) < primitive.maximumScreenSpaceError ;
    // var meetsSse = tile.level ==  altitudeToZoom(frameState.camera.positionCartographic.height);
    var southwestChild = tile.southwestChild;
    var southeastChild = tile.southeastChild;
    var northwestChild = tile.northwestChild;
    var northeastChild = tile.northeastChild;

    var lastFrame = primitive._lastSelectionFrameNumber;
    var lastFrameSelectionResult = tile._lastSelectionResultFrame === lastFrame ? tile._lastSelectionResult : TileSelectionResult.NONE;

    var tileProvider = primitive.tileProvider;

    if (meetsSse || ancestorMeetsSse) {
        // This tile (or an ancestor) is the one we want to render this frame, but we'll do different things depending
        // on the state of this tile and on what we did _last_ frame.

        // We can render it if _any_ of the following are true:
        // 1. We rendered it (or kicked it) last frame.
        // 2. This tile was culled last frame, or it wasn't even visited because an ancestor was culled.
        // 3. The tile is completely done loading.
        // 4. a) Terrain is ready, and
        //    b) All necessary imagery is ready. Necessary imagery is imagery that was rendered with this tile
        //       or any descendants last frame. Such imagery is required because rendering this tile without
        //       it would cause detail to disappear.
        //
        // Determining condition 4 is more expensive, so we check the others first.
        //
        // Note that even if we decide to render a tile here, it may later get "kicked" in favor of an ancestor.

        var oneRenderedLastFrame = TileSelectionResult.originalResult(lastFrameSelectionResult) === TileSelectionResult.RENDERED;
        var twoCulledOrNotVisited = TileSelectionResult.originalResult(lastFrameSelectionResult) === TileSelectionResult.CULLED || lastFrameSelectionResult === TileSelectionResult.NONE;
        var threeCompletelyLoaded = tile.state === QuadtreeTileLoadState.DONE;

        var renderable = oneRenderedLastFrame || twoCulledOrNotVisited || threeCompletelyLoaded;

        if (!renderable) {
            // Check the more expensive condition 4 above. This requires details of the thing
            // we're rendering (e.g. the globe surface), so delegate it to the tile provider.
            if (defined(tileProvider.canRenderWithoutLosingDetail)) {
                renderable = tileProvider.canRenderWithoutLosingDetail(tile);
            }
        }

        if (renderable) {
            // Only load this tile if it (not just an ancestor) meets the SSE.
            if (meetsSse) {
                    queueTileLoad(primitive, primitive._tileLoadQueueMedium, tile, frameState);
            }
            addTileToRenderList(primitive, tile);

            traversalDetails.allAreRenderable = tile.renderable;
            traversalDetails.anyWereRenderedLastFrame = lastFrameSelectionResult === TileSelectionResult.RENDERED;
            traversalDetails.notYetRenderableCount = tile.renderable ? 0 : 1;

            tile._lastSelectionResultFrame = frameState.frameNumber;
            tile._lastSelectionResult = TileSelectionResult.RENDERED;

            if (!traversalDetails.anyWereRenderedLastFrame) {
                // Tile is newly-rendered this frame, so update its heights.
                primitive._tileToUpdateHeights.push(tile);
            }

            return;
        }

        // Otherwise, we can't render this tile (or its fill) because doing so would cause detail to disappear
        // that was visible last frame. Instead, keep rendering any still-visible descendants that were rendered
        // last frame and render fills for newly-visible descendants. E.g. if we were rendering level 15 last
        // frame but this frame we want level 14 and the closest renderable level <= 14 is 0, rendering level
        // zero would be pretty jarring so instead we keep rendering level 15 even though its SSE is better
        // than required. So fall through to continue traversal...
        ancestorMeetsSse = true;

        // Load this blocker tile with high priority, but only if this tile (not just an ancestor) meets the SSE.
        if (meetsSse) {
            queueTileLoad(primitive, primitive._tileLoadQueueHigh, tile, frameState);
        }
    }

    if (tileProvider.canRefine(tile)) {
        var allAreUpsampled = southwestChild.upsampledFromParent && southeastChild.upsampledFromParent &&
            northwestChild.upsampledFromParent && northeastChild.upsampledFromParent;

        if (allAreUpsampled) {
            // No point in rendering the children because they're all upsampled.  Render this tile instead.
            addTileToRenderList(primitive, tile);

            // Rendered tile that's not waiting on children loads with medium priority.
            queueTileLoad(primitive, primitive._tileLoadQueueMedium, tile, frameState);

            // Make sure we don't unload the children and forget they're upsampled.
            primitive._tileReplacementQueue.markTileRendered(southwestChild);
            primitive._tileReplacementQueue.markTileRendered(southeastChild);
            primitive._tileReplacementQueue.markTileRendered(northwestChild);
            primitive._tileReplacementQueue.markTileRendered(northeastChild);

            traversalDetails.allAreRenderable = tile.renderable;
            traversalDetails.anyWereRenderedLastFrame = lastFrameSelectionResult === TileSelectionResult.RENDERED;
            traversalDetails.notYetRenderableCount = tile.renderable ? 0 : 1;

            tile._lastSelectionResultFrame = frameState.frameNumber;
            tile._lastSelectionResult = TileSelectionResult.RENDERED;

            if (!traversalDetails.anyWereRenderedLastFrame) {
                // Tile is newly-rendered this frame, so update its heights.
                primitive._tileToUpdateHeights.push(tile);
            }

            return;
        }

        // SSE is not good enough, so refine.
        tile._lastSelectionResultFrame = frameState.frameNumber;
        tile._lastSelectionResult = TileSelectionResult.REFINED;

        var firstRenderedDescendantIndex = primitive._tilesToRender.length;
        var loadIndexLow = primitive._tileLoadQueueLow.length;
        var loadIndexMedium = primitive._tileLoadQueueMedium.length;
        var loadIndexHigh = primitive._tileLoadQueueHigh.length;
        var tilesToUpdateHeightsIndex = primitive._tileToUpdateHeights.length;

        // No need to add the children to the load queue because they'll be added (if necessary) when they're visited.
        visitVisibleChildrenNearToFar(primitive, southwestChild, southeastChild, northwestChild, northeastChild, frameState, ancestorMeetsSse, traversalDetails);

        // If no descendant tiles were added to the render list by the function above, it means they were all
        // culled even though this tile was deemed visible. That's pretty common.

        if (firstRenderedDescendantIndex !== primitive._tilesToRender.length) {
            // At least one descendant tile was added to the render list.
            // The traversalDetails tell us what happened while visiting the children.

            var allAreRenderable = traversalDetails.allAreRenderable;
            var anyWereRenderedLastFrame = traversalDetails.anyWereRenderedLastFrame;
            var notYetRenderableCount = traversalDetails.notYetRenderableCount;
            var queuedForLoad = false;

            if (!allAreRenderable && !anyWereRenderedLastFrame) {
                // Some of our descendants aren't ready to render yet, and none were rendered last frame,
                // so kick them all out of the render list and render this tile instead. Continue to load them though!

                // Mark the rendered descendants and their ancestors - up to this tile - as kicked.
                var renderList = primitive._tilesToRender;
                for (var i = firstRenderedDescendantIndex; i < renderList.length; ++i) {
                    var workTile = renderList[i];
                    while (workTile !== undefined && workTile._lastSelectionResult !== TileSelectionResult.KICKED && workTile !== tile) {
                        workTile._lastSelectionResult = TileSelectionResult.kick(workTile._lastSelectionResult);
                        workTile = workTile.parent;
                    }
                }

                // Remove all descendants from the render list and add this tile.
                primitive._tilesToRender.length = firstRenderedDescendantIndex;
                primitive._tileToUpdateHeights.length = tilesToUpdateHeightsIndex;
                addTileToRenderList(primitive, tile);

                tile._lastSelectionResult = TileSelectionResult.RENDERED;

                // If we're waiting on heaps of descendants, the above will take too long. So in that case,
                // load this tile INSTEAD of loading any of the descendants, and tell the up-level we're only waiting
                // on this tile. Keep doing this until we actually manage to render this tile.
                var wasRenderedLastFrame = lastFrameSelectionResult === TileSelectionResult.RENDERED;
                if (!wasRenderedLastFrame && notYetRenderableCount > primitive.loadingDescendantLimit) {
                    // Remove all descendants from the load queues.
                    primitive._tileLoadQueueLow.length = loadIndexLow;
                    primitive._tileLoadQueueMedium.length = loadIndexMedium;
                    primitive._tileLoadQueueHigh.length = loadIndexHigh;
                    queueTileLoad(primitive, primitive._tileLoadQueueMedium, tile, frameState);
                    traversalDetails.notYetRenderableCount = tile.renderable ? 0 : 1;
                    queuedForLoad = true;
                }

                traversalDetails.allAreRenderable = tile.renderable;
                traversalDetails.anyWereRenderedLastFrame = wasRenderedLastFrame;

                if (!wasRenderedLastFrame) {
                    // Tile is newly-rendered this frame, so update its heights.
                    primitive._tileToUpdateHeights.push(tile);
                }

                ++debug.tilesWaitingForChildren;
            }

            if (primitive.preloadAncestors && !queuedForLoad) {
                queueTileLoad(primitive, primitive._tileLoadQueueLow, tile, frameState);
            }
        }

        return;
    }

    tile._lastSelectionResultFrame = frameState.frameNumber;
    tile._lastSelectionResult = TileSelectionResult.RENDERED;

    // We'd like to refine but can't because we have no availability data for this tile's children,
    // so we have no idea if refinining would involve a load or an upsample. We'll have to finish
    // loading this tile first in order to find that out, so load this refinement blocker with
    // high priority.
    addTileToRenderList(primitive, tile);
    queueTileLoad(primitive, primitive._tileLoadQueueHigh, tile, frameState);

    traversalDetails.allAreRenderable = tile.renderable;
    traversalDetails.anyWereRenderedLastFrame = lastFrameSelectionResult === TileSelectionResult.RENDERED;
    traversalDetails.notYetRenderableCount = tile.renderable ? 0 : 1;
}

function visitVisibleChildrenNearToFar(primitive, southwest, southeast, northwest, northeast, frameState, ancestorMeetsSse, traversalDetails) {
    var cameraPosition = frameState.camera.positionCartographic;
    var tileProvider = primitive._tileProvider;
    var occluders = primitive._occluders;

    var quadDetails = traversalQuadsByLevel[southwest.level];
    var southwestDetails = quadDetails.southwest;
    var southeastDetails = quadDetails.southeast;
    var northwestDetails = quadDetails.northwest;
    var northeastDetails = quadDetails.northeast;

    if (cameraPosition.longitude < southwest.rectangle.east) {
        if (cameraPosition.latitude < southwest.rectangle.north) {
            // Camera in southwest quadrant
            visitIfVisible(primitive, southwest, tileProvider, frameState, occluders, ancestorMeetsSse, southwestDetails);
            visitIfVisible(primitive, southeast, tileProvider, frameState, occluders, ancestorMeetsSse, southeastDetails);
            visitIfVisible(primitive, northwest, tileProvider, frameState, occluders, ancestorMeetsSse, northwestDetails);
            visitIfVisible(primitive, northeast, tileProvider, frameState, occluders, ancestorMeetsSse, northeastDetails);
        } else {
            // Camera in northwest quadrant
            visitIfVisible(primitive, northwest, tileProvider, frameState, occluders, ancestorMeetsSse, northwestDetails);
            visitIfVisible(primitive, southwest, tileProvider, frameState, occluders, ancestorMeetsSse, southwestDetails);
            visitIfVisible(primitive, northeast, tileProvider, frameState, occluders, ancestorMeetsSse, northeastDetails);
            visitIfVisible(primitive, southeast, tileProvider, frameState, occluders, ancestorMeetsSse, southeastDetails);
        }
    } else if (cameraPosition.latitude < southwest.rectangle.north) {
        // Camera southeast quadrant
        visitIfVisible(primitive, southeast, tileProvider, frameState, occluders, ancestorMeetsSse, southeastDetails);
        visitIfVisible(primitive, southwest, tileProvider, frameState, occluders, ancestorMeetsSse, southwestDetails);
        visitIfVisible(primitive, northeast, tileProvider, frameState, occluders, ancestorMeetsSse, northeastDetails);
        visitIfVisible(primitive, northwest, tileProvider, frameState, occluders, ancestorMeetsSse, northwestDetails);
    } else {
        // Camera in northeast quadrant
        visitIfVisible(primitive, northeast, tileProvider, frameState, occluders, ancestorMeetsSse, northeastDetails);
        visitIfVisible(primitive, northwest, tileProvider, frameState, occluders, ancestorMeetsSse, northwestDetails);
        visitIfVisible(primitive, southeast, tileProvider, frameState, occluders, ancestorMeetsSse, southeastDetails);
        visitIfVisible(primitive, southwest, tileProvider, frameState, occluders, ancestorMeetsSse, southwestDetails);
    }

    quadDetails.combine(traversalDetails);
}

function containsNeededPosition(primitive, tile) {
    var rectangle = tile.rectangle;
    return (defined(primitive._cameraPositionCartographic) && Rectangle.contains(rectangle, primitive._cameraPositionCartographic)) ||
        (defined(primitive._cameraReferenceFrameOriginCartographic) && Rectangle.contains(rectangle, primitive._cameraReferenceFrameOriginCartographic));
}

function visitIfVisible(primitive, tile, tileProvider, frameState, occluders, ancestorMeetsSse, traversalDetails) {
    if (tileProvider.computeTileVisibility(tile, frameState, occluders) !== Visibility.NONE) {
        return visitTile(primitive, frameState, tile, ancestorMeetsSse, traversalDetails);
    }

    ++primitive._debug.tilesCulled;
    primitive._tileReplacementQueue.markTileRendered(tile);

    traversalDetails.allAreRenderable = true;
    traversalDetails.anyWereRenderedLastFrame = false;
    traversalDetails.notYetRenderableCount = 0;

    if (containsNeededPosition(primitive, tile)) {
        // Load the tile(s) that contains the camera's position and
        // the origin of its reference frame with medium priority.
        // But we only need to load until the terrain is available, no need to load imagery.
        if (!defined(tile.data) || !defined(tile.data.vertexArray)) {
            queueTileLoad(primitive, primitive._tileLoadQueueMedium, tile, frameState);
        }

        var lastFrame = primitive._lastSelectionFrameNumber;
        var lastFrameSelectionResult = tile._lastSelectionResultFrame === lastFrame ? tile._lastSelectionResult : TileSelectionResult.NONE;
        if (lastFrameSelectionResult !== TileSelectionResult.CULLED_BUT_NEEDED && lastFrameSelectionResult !== TileSelectionResult.RENDERED) {
            primitive._tileToUpdateHeights.push(tile);
        }

        tile._lastSelectionResult = TileSelectionResult.CULLED_BUT_NEEDED;
    } else if (primitive.preloadSiblings || tile.level === 0) {
        // Load culled level zero tiles with low priority.
        // For all other levels, only load culled tiles if preloadSiblings is enabled.
        queueTileLoad(primitive, primitive._tileLoadQueueLow, tile, frameState);
        tile._lastSelectionResult = TileSelectionResult.CULLED;
    } else {
        tile._lastSelectionResult = TileSelectionResult.CULLED;
    }

    tile._lastSelectionResultFrame = frameState.frameNumber;
}

function screenSpaceError(primitive, frameState, tile) {
    if (frameState.mode === SceneMode.SCENE2D || frameState.camera.frustum instanceof OrthographicFrustum || frameState.camera.frustum instanceof OrthographicOffCenterFrustum) {
        return screenSpaceError2D(primitive, frameState, tile);
    }

    if(tile.level == altitudeToZoom(frameState.camera.positionCartographic.height)){
        return 1.0;
    }

    var maxGeometricError = primitive._tileProvider.getLevelMaximumGeometricError(tile.level);

    var distance = tile._distance;
    var v = frameState.camera.positionCartographic.height/distance;
    // distance = distance - (1 - v)*distance*0.8;


    var height = frameState.context.drawingBufferHeight/1.5;
    var sseDenominator = frameState.camera.frustum.sseDenominator;

    var error = (maxGeometricError * height) / (distance * sseDenominator);

    if (frameState.fog.enabled) {
        error -= CesiumMath.fog(distance, frameState.fog.density) * frameState.fog.sse;
    }

    error /= frameState.pixelRatio;

    return error;
}

function screenSpaceError2D(primitive, frameState, tile) {
    var camera = frameState.camera;
    var frustum = camera.frustum;
    if (defined(frustum._offCenterFrustum)) {
        frustum = frustum._offCenterFrustum;
    }

    var context = frameState.context;
    var width = context.drawingBufferWidth;
    var height = context.drawingBufferHeight;

    var maxGeometricError = primitive._tileProvider.getLevelMaximumGeometricError(tile.level);
    var pixelSize = Math.max(frustum.top - frustum.bottom, frustum.right - frustum.left) / Math.max(width, height);
    var error = maxGeometricError / pixelSize;

    if (frameState.fog.enabled && frameState.mode !== SceneMode.SCENE2D) {
        error -= CesiumMath.fog(tile._distance, frameState.fog.density) * frameState.fog.sse;
    }

    error /= frameState.pixelRatio;

    return error;
}

function addTileToRenderList(primitive, tile) {
    primitive._tilesToRender.push(tile);
}

function processTileLoadQueue(primitive, frameState) {
    var tileLoadQueueHigh = primitive._tileLoadQueueHigh;
    var tileLoadQueueMedium = primitive._tileLoadQueueMedium;
    var tileLoadQueueLow = primitive._tileLoadQueueLow;

    if (tileLoadQueueHigh.length === 0 && tileLoadQueueMedium.length === 0 && tileLoadQueueLow.length === 0) {
        return;
    }

    // Remove any tiles that were not used this frame beyond the number
    // we're allowed to keep.
    primitive._tileReplacementQueue.trimTiles(primitive.tileCacheSize);

    var endTime = getTimestamp() + primitive._loadQueueTimeSlice;
    var tileProvider = primitive._tileProvider;

    var didSomeLoading = processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueHigh, false);
    didSomeLoading = processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueMedium, didSomeLoading);
    processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, tileLoadQueueLow, didSomeLoading);
}

function sortByLoadPriority(a, b) {
    return a._loadPriority - b._loadPriority;
}

function processSinglePriorityLoadQueue(primitive, frameState, tileProvider, endTime, loadQueue, didSomeLoading) {
    if (tileProvider.computeTileLoadPriority !== undefined) {
        loadQueue.sort(sortByLoadPriority);
    }

    for (var i = 0, len = loadQueue.length; i < len && (getTimestamp() < endTime || !didSomeLoading); ++i) {
        var tile = loadQueue[i];
        primitive._tileReplacementQueue.markTileRendered(tile);
        tileProvider.loadTile(frameState, tile);
        didSomeLoading = true;
    }

    return didSomeLoading;
}

var scratchRay = new Ray();
var scratchCartographic = new Cartographic();
var scratchPosition = new Cartesian3();
var scratchArray = [];

function updateHeights(primitive, frameState) {
    if (!primitive.tileProvider.ready) {
        return;
    }

    var tryNextFrame = scratchArray;
    tryNextFrame.length = 0;
    var tilesToUpdateHeights = primitive._tileToUpdateHeights;
    var terrainProvider = primitive._tileProvider.terrainProvider;

    var startTime = getTimestamp();
    var timeSlice = primitive._updateHeightsTimeSlice;
    var endTime = startTime + timeSlice;

    var mode = frameState.mode;
    var projection = frameState.mapProjection;
    var ellipsoid = primitive.tileProvider.tilingScheme.ellipsoid;
    var i;

    while (tilesToUpdateHeights.length > 0) {
        var tile = tilesToUpdateHeights[0];
        if (!defined(tile.data) || !defined(tile.data.mesh)) {
            // Tile isn't loaded enough yet, so try again next frame if this tile is still
            // being rendered.
            var selectionResult = tile._lastSelectionResultFrame === primitive._lastSelectionFrameNumber
                ? tile._lastSelectionResult
                : TileSelectionResult.NONE;
            if (selectionResult === TileSelectionResult.RENDERED || selectionResult === TileSelectionResult.CULLED_BUT_NEEDED) {
                tryNextFrame.push(tile);
            }
            tilesToUpdateHeights.shift();
            primitive._lastTileIndex = 0;
            continue;
        }
        var customData = tile.customData;
        var customDataLength = customData.length;

        var timeSliceMax = false;
        for (i = primitive._lastTileIndex; i < customDataLength; ++i) {
            var data = customData[i];

            if (tile.level > data.level) {
                if (!defined(data.positionOnEllipsoidSurface)) {
                    // cartesian has to be on the ellipsoid surface for `ellipsoid.geodeticSurfaceNormal`
                    data.positionOnEllipsoidSurface = Cartesian3.fromRadians(data.positionCartographic.longitude, data.positionCartographic.latitude, 0.0, ellipsoid);
                }

                if (mode === SceneMode.SCENE3D) {
                    var surfaceNormal = ellipsoid.geodeticSurfaceNormal(data.positionOnEllipsoidSurface, scratchRay.direction);

                    // compute origin point

                    // Try to find the intersection point between the surface normal and z-axis.
                    // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
                    var rayOrigin = ellipsoid.getSurfaceNormalIntersectionWithZAxis(data.positionOnEllipsoidSurface, 11500.0, scratchRay.origin);

                    // Theoretically, not with Earth datums, the intersection point can be outside the ellipsoid
                    if (!defined(rayOrigin)) {
                        // intersection point is outside the ellipsoid, try other value
                        // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
                        var minimumHeight;
                        if (defined(tile.data.tileBoundingRegion)) {
                            minimumHeight = tile.data.tileBoundingRegion.minimumHeight;
                        }
                        var magnitude = Math.min(defaultValue(minimumHeight, 0.0), -11500.0);

                        // multiply by the *positive* value of the magnitude
                        var vectorToMinimumPoint = Cartesian3.multiplyByScalar(surfaceNormal, Math.abs(magnitude) + 1, scratchPosition);
                        Cartesian3.subtract(data.positionOnEllipsoidSurface, vectorToMinimumPoint, scratchRay.origin);
                    }
                } else {
                    Cartographic.clone(data.positionCartographic, scratchCartographic);

                    // minimum height for the terrain set, need to get this information from the terrain provider
                    scratchCartographic.height = -11500.0;
                    projection.project(scratchCartographic, scratchPosition);
                    Cartesian3.fromElements(scratchPosition.z, scratchPosition.x, scratchPosition.y, scratchPosition);
                    Cartesian3.clone(scratchPosition, scratchRay.origin);
                    Cartesian3.clone(Cartesian3.UNIT_X, scratchRay.direction);
                }

                var position = tile.data.pick(scratchRay, mode, projection, false, scratchPosition);
                if (defined(position)) {
                    data.callback(position);
                    data.level = tile.level;
                }
            } else if (tile.level === data.level) {
                var children = tile.children;
                var childrenLength = children.length;

                var child;
                for (var j = 0; j < childrenLength; ++j) {
                    child = children[j];
                    if (Rectangle.contains(child.rectangle, data.positionCartographic)) {
                        break;
                    }
                }

                var tileDataAvailable = terrainProvider.getTileDataAvailable(child.x, child.y, child.level);
                var parentTile = tile.parent;
                if ((defined(tileDataAvailable) && !tileDataAvailable) ||
                    (defined(parentTile) && defined(parentTile.data) && defined(parentTile.data.terrainData) &&
                    !parentTile.data.terrainData.isChildAvailable(parentTile.x, parentTile.y, child.x, child.y))) {
                    data.removeFunc();
                }
            }

            if (getTimestamp() >= endTime) {
                timeSliceMax = true;
                break;
            }
        }

        if (timeSliceMax) {
            primitive._lastTileIndex = i;
            break;
        } else {
            primitive._lastTileIndex = 0;
            tilesToUpdateHeights.shift();
        }
    }
    for (i = 0; i < tryNextFrame.length; i++) {
        tilesToUpdateHeights.push(tryNextFrame[i]);
    }
}

function createRenderCommandsForSelectedTiles(primitive, frameState) {
    var tileProvider = primitive._tileProvider;
    var tilesToRender = primitive._tilesToRender;

    for (var i = 0, len = tilesToRender.length; i < len; ++i) {
        var tile = tilesToRender[i];
        tileProvider.showTileThisFrame(tile, frameState);
    }
}


class QuadtreePrimitiveExt{
    constructor() {
        QuadtreePrimitive.prototype.render = function(frameState) {
            var passes = frameState.passes;
            var tileProvider = this._tileProvider;

            if (passes.render) {
                tileProvider.beginUpdate(frameState);

                selectTilesForRendering(this, frameState);
                createRenderCommandsForSelectedTiles(this, frameState);

                tileProvider.endUpdate(frameState);
            }

            if (passes.pick && this._tilesToRender.length > 0) {
                tileProvider.updateForPick(frameState);
            }
        };
    }
}

module.exports = QuadtreePrimitiveExt;
new QuadtreePrimitiveExt();