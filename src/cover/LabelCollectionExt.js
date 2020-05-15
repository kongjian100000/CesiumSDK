/**
 * Created by user on 2020/3/6.
 */
const BoundingRectangle =Cesium.BoundingRectangle;
const Cartesian2 =Cesium.Cartesian2;
const Color =Cesium.Color;
const defaultValue =Cesium.defaultValue;
const defined =Cesium.defined;
const defineProperties =Cesium.defineProperties;
const destroyObject =Cesium.destroyObject;
const DeveloperError =Cesium.DeveloperError;
const Matrix4 =Cesium.Matrix4;
const writeTextToCanvas =Cesium.writeTextToCanvas;
const BlendOption =Cesium.BlendOption;
const HeightReference =Cesium.HeightReference;
const HorizontalOrigin =Cesium.HorizontalOrigin;
const Label =Cesium.Label;
const LabelStyle =Cesium.LabelStyle;
const TextureAtlas =Cesium.TextureAtlas;
const VerticalOrigin =Cesium.VerticalOrigin;
const GraphemeSplitter =Cesium.graphemesplitter;
const LabelCollection = Cesium.LabelCollection;
const BillboardCollection = require('../ext/BillboardCollection.js');

var SDFSettings = {
    /**
     * The font size in pixels
     *
     * @type {Number}
     * @constant
     */
    FONT_SIZE: 24.0,

    /**
     * Whitespace padding around glyphs.
     *
     * @type {Number}
     * @constant
     */
    PADDING: 0.0,

    /**
     * How many pixels around the glyph shape to use for encoding distance
     *
     * @type {Number}
     * @constant
     */
    RADIUS: 8.0,

    /**
     * How much of the radius (relative) is used for the inside part the glyph.
     *
     * @type {Number}
     * @constant
     */
    CUTOFF: 0.25
};

function Glyph() {
    this.textureInfo = undefined;
    this.dimensions = undefined;
    this.billboard = undefined;
}

// GlyphTextureInfo represents a single character, drawn in a particular style,
// shared and reference counted across all labels.  It may or may not have an
// index into the label collection's texture atlas, depending on whether the character
// has both width and height, but it always has a valid dimensions object.
function GlyphTextureInfo(labelCollection, index, dimensions) {
    this.labelCollection = labelCollection;
    this.index = index;
    this.dimensions = dimensions;
}

// Traditionally, leading is %20 of the font size.
var defaultLineSpacingPercent = 1.2;

var whitePixelCanvasId = 'ID_WHITE_PIXEL';
var whitePixelSize = new Cartesian2(4, 4);
var whitePixelBoundingRegion = new BoundingRectangle(1, 1, 1, 1);

function addWhitePixelCanvas(textureAtlas, labelCollection) {
    var canvas = document.createElement('canvas');
    canvas.width = whitePixelSize.x;
    canvas.height = whitePixelSize.y;

    var context2D = canvas.getContext('2d');
    context2D.fillStyle = "#fff";
    context2D.fillRect(0, 0, canvas.width, canvas.height);
    textureAtlas.addImage(whitePixelCanvasId, canvas).then(function(index) {
        labelCollection._whitePixelIndex = index;
    });
}

function drawRoundRect(ctx, x, y, width, height, radius){
    ctx.beginPath();
    // y = y -1;
    ctx.arc((x + radius), (y + radius), radius, Math.PI, Math.PI * 3 / 2);
    ctx.lineTo((width - radius + x), y);
    ctx.arc((width - radius + x), (radius + y), radius, Math.PI * 3 / 2, Math.PI * 2);
    ctx.lineTo((width + x), (height + y - radius));
    ctx.arc((width - radius + x), (height - radius + y), radius, 0, Math.PI * 1 / 2);
    ctx.lineTo((radius + x), (height +y));
    ctx.arc((radius + x), (height - radius + y), radius, Math.PI * 1 / 2, Math.PI);
    ctx.closePath();
}



function unbindGlyph(labelCollection, glyph) {
    glyph.textureInfo = undefined;
    glyph.dimensions = undefined;

    var billboard = glyph.billboard;
    if (defined(billboard)) {
        billboard.show = false;
        billboard.image = undefined;
        if (defined(billboard._removeCallbackFunc)) {
            billboard._removeCallbackFunc();
            billboard._removeCallbackFunc = undefined;
        }
        labelCollection._spareBillboards.push(billboard);
        glyph.billboard = undefined;
    }
}

function addGlyphToTextureAtlas(textureAtlas, id, canvas, glyphTextureInfo) {
    textureAtlas.addImage(id, canvas).then(function(index) {
        glyphTextureInfo.index = index;
    });
}

var splitter = new GraphemeSplitter();


function rebindAllGlyphs(labelCollection, label,mapboxGlyphs) {
    var text = label._renderedText;
    if(text.length == 0){
        return;
    }

    var textLength = text.length;
    var glyphs = label._glyphs;
    var glyphsLength = glyphs.length;

    var glyph;
    var glyphIndex;
    var textIndex;

    // Compute a font size scale relative to the sdf font generated size.
    label._relativeSize = label._fontSize /24;

    // if we have more glyphs than needed, unbind the extras.
    if (textLength < glyphsLength) {
        for (glyphIndex = textLength; glyphIndex < glyphsLength; ++glyphIndex) {
            unbindGlyph(labelCollection, glyphs[glyphIndex]);
        }
    }

    // presize glyphs to match the new text length
    glyphs.length = textLength;

    var showBackground = label._showBackground && (text.split(' ').join('').length > 0);
    var backgroundBillboard = label._backgroundBillboard;
    var backgroundBillboardCollection = labelCollection._backgroundBillboardCollection;
    if (!showBackground) {
        if (defined(backgroundBillboard)) {
            backgroundBillboardCollection.remove(backgroundBillboard);
            label._backgroundBillboard = backgroundBillboard = undefined;
        }
    } else {
        if (!defined(backgroundBillboard)) {
            backgroundBillboard = backgroundBillboardCollection.add({
                collection : labelCollection,
                image : whitePixelCanvasId,
                imageSubRegion : whitePixelBoundingRegion
            });
            label._backgroundBillboard = backgroundBillboard;
        }

        backgroundBillboard.color = label._backgroundColor;
        backgroundBillboard.show = label._show;
        backgroundBillboard.position = label._position;
        backgroundBillboard.eyeOffset = label._eyeOffset;
        backgroundBillboard.pixelOffset = label._pixelOffset;
        backgroundBillboard.horizontalOrigin = HorizontalOrigin.LEFT;
        backgroundBillboard.verticalOrigin = label._verticalOrigin;
        backgroundBillboard.heightReference = label._heightReference;
        backgroundBillboard.scale = label.totalScale;
        backgroundBillboard.pickPrimitive = label;
        backgroundBillboard.id = label._id;
        backgroundBillboard.translucencyByDistance = label._translucencyByDistance;
        backgroundBillboard.pixelOffsetScaleByDistance = label._pixelOffsetScaleByDistance;
        backgroundBillboard.scaleByDistance = label._scaleByDistance;
        backgroundBillboard.distanceDisplayCondition = label._distanceDisplayCondition;
        backgroundBillboard.disableDepthTestDistance = label._disableDepthTestDistance;
    }

    var glyphTextureCache = labelCollection._glyphTextureCache;

    // walk the text looking for new characters (creating new glyphs for each)
    // or changed characters (rebinding existing glyphs)
    // console.time('label all');
    for (textIndex = 0; textIndex < textLength; ++textIndex) {
        // console.time('jsonid');
        var character = text[textIndex];
        var verticalOrigin = label._verticalOrigin;

    var id = JSON.stringify([
        character,
        label._fontFamily,
        label._fontStyle,
        label._fontWeight,
        +verticalOrigin
    ]);

    var glyphTextureInfo = glyphTextureCache[id];
    if (!defined(glyphTextureInfo)) {

        var chartCode = character.charCodeAt(0);
        var fontName = '微软雅黑';
        var mapboxGlyph = mapboxGlyphs[fontName][chartCode];

        if(!mapboxGlyph){
            continue;
        }

        // delete mapboxGlyph['bitmap'];
        if(!mapboxGlyph.hasOwnProperty('dimensions')){
            mapboxGlyph.dimensions = {width:mapboxGlyph.width -3,height:24,
                descent:0,
                bounds:{
                    minx:0,miny:0,maxx:0,maxy:0
                }
            };
        }


        glyphTextureInfo = new GlyphTextureInfo(labelCollection, -1, mapboxGlyph.dimensions);
        glyphTextureCache[id] = glyphTextureInfo;

        if (mapboxGlyph.width > 0 && mapboxGlyph.height > 0) {
            if (character !== ' ') {
                // console.time('addGlyphToTextureAtlas');
                addGlyphToTextureAtlas(labelCollection._textureAtlas, id, mapboxGlyph, glyphTextureInfo);
                // console.timeEnd('addGlyphToTextureAtlas');
            }
        }
    }

    glyph = glyphs[textIndex];

    if (defined(glyph)) {
        // clean up leftover information from the previous glyph
        if (glyphTextureInfo.index === -1) {
            // no texture, and therefore no billboard, for this glyph.
            // so, completely unbind glyph.
            unbindGlyph(labelCollection, glyph);
        } else if (defined(glyph.textureInfo)) {
            // we have a texture and billboard.  If we had one before, release
            // our reference to that texture info, but reuse the billboard.
            glyph.textureInfo = undefined;
        }
    } else {
        // create a glyph object
        glyph = new Glyph();
        glyphs[textIndex] = glyph;
    }

    glyph.textureInfo = glyphTextureInfo;
    glyph.dimensions = glyphTextureInfo.dimensions;
    // console.timeEnd('jsonid');
    // console.time('other');
    // if we have a texture, configure the existing billboard, or obtain one
    if (glyphTextureInfo.index !== -1) {
        var billboard = glyph.billboard;
        var spareBillboards = labelCollection._spareBillboards;
        if (!defined(billboard)) {
            if (spareBillboards.length > 0) {
                billboard = spareBillboards.pop();
            } else {
                billboard = labelCollection._billboardCollection.add({
                    collection : labelCollection
                });
                billboard._labelDimensions = new Cartesian2();
                billboard._labelTranslate = new Cartesian2();
            }
            glyph.billboard = billboard;
        }

        billboard.show = label._show;
        billboard.position = label._position;
        billboard.eyeOffset = label._eyeOffset;
        billboard.pixelOffset = label._pixelOffset;
        billboard.horizontalOrigin = HorizontalOrigin.LEFT;
        billboard.verticalOrigin = label._verticalOrigin;
        billboard.heightReference = label._heightReference;
        billboard.scale = label.totalScale;
        billboard.pickPrimitive = label;
        billboard.id = label._id;
        billboard.image = id;
        billboard.translucencyByDistance = label._translucencyByDistance;
        billboard.pixelOffsetScaleByDistance = label._pixelOffsetScaleByDistance;
        billboard.scaleByDistance = label._scaleByDistance;
        billboard.distanceDisplayCondition = label._distanceDisplayCondition;
        billboard.disableDepthTestDistance = label._disableDepthTestDistance;
        billboard._batchIndex = label._batchIndex;
        billboard.outlineColor = label.outlineColor;
        if (label.style === LabelStyle.FILL_AND_OUTLINE) {
            billboard.color = label._fillColor;
            billboard.outlineWidth = label.outlineWidth;
        }
        else if (label.style === LabelStyle.FILL) {
            billboard.color = label._fillColor;
            billboard.outlineWidth = 0.0;
        }
        else if (label.style === LabelStyle.OUTLINE) {
            billboard.color = Color.TRANSPARENT;
            billboard.outlineWidth = label.outlineWidth;
        }
    }

    // console.timeEnd('other');
    }
    // console.timeEnd('label all');

    // changing glyphs will cause the position of the
    // glyphs to change, since different characters have different widths
    label._repositionAllGlyphs = true;
}

function calculateWidthOffset(lineWidth, horizontalOrigin, backgroundPadding) {
    if (horizontalOrigin === HorizontalOrigin.CENTER) {
        return -lineWidth / 2;
    } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
        return -(lineWidth + backgroundPadding.x);
    }
    return backgroundPadding.x;
}

// reusable Cartesian2 instances
var glyphPixelOffset = new Cartesian2();
var scratchBackgroundPadding = new Cartesian2();

function repositionAllGlyphs(label) {
    var glyphs = label._glyphs;
    var text = label._renderedText;
    var glyph;
    var dimensions;
    var lastLineWidth = 0;
    var maxLineWidth = 0;
    var lineWidths = [];
    var maxGlyphDescent = Number.NEGATIVE_INFINITY;
    var maxGlyphY = 0;
    var numberOfLines = 1;
    var glyphIndex;
    var glyphLength = glyphs.length;

    var backgroundBillboard = label._backgroundBillboard;
    var backgroundPadding = Cartesian2.clone(
        (defined(backgroundBillboard) ? label._backgroundPadding : Cartesian2.ZERO),
        scratchBackgroundPadding);

    // We need to scale the background padding, which is specified in pixels by the inverse of the relative size so it is scaled properly.
    backgroundPadding.x /= label._relativeSize;
    backgroundPadding.y /= label._relativeSize;

    for (glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
        if (text.charAt(glyphIndex) === ' ') {
            lineWidths.push(lastLineWidth);
            ++numberOfLines;
            lastLineWidth = 0;
        } else {
            glyph = glyphs[glyphIndex];
            dimensions = glyph.dimensions;
            maxGlyphY = Math.max(maxGlyphY, dimensions.height - dimensions.descent);
            maxGlyphDescent = Math.max(maxGlyphDescent, dimensions.descent);

            //Computing the line width must also account for the kerning that occurs between letters.
            lastLineWidth += dimensions.width - dimensions.bounds.minx;
            if (glyphIndex < glyphLength - 1) {
                lastLineWidth += glyphs[glyphIndex + 1].dimensions.bounds.minx;
            }
            maxLineWidth = Math.max(maxLineWidth, lastLineWidth);
        }
    }
    lineWidths.push(lastLineWidth);
    var maxLineHeight = maxGlyphY + maxGlyphDescent;

    var scale = label.totalScale;
    var horizontalOrigin = label._horizontalOrigin;
    var verticalOrigin = label._verticalOrigin;
    var lineIndex = 0;
    var lineWidth = lineWidths[lineIndex];
    var widthOffset = calculateWidthOffset(lineWidth, horizontalOrigin, backgroundPadding);
    var lineSpacing = defaultLineSpacingPercent * maxLineHeight;
    var otherLinesHeight = lineSpacing * (numberOfLines - 1);
    var totalLineWidth = maxLineWidth;
    var totalLineHeight = maxLineHeight + otherLinesHeight;

    if (defined(backgroundBillboard)) {
        totalLineWidth += (backgroundPadding.x * 2);
        totalLineHeight += (backgroundPadding.y * 2);
        backgroundBillboard._labelHorizontalOrigin = horizontalOrigin;
    }

    glyphPixelOffset.x = widthOffset * scale;
    glyphPixelOffset.y = 0;

    var firstCharOfLine = true;

    var lineOffsetY = 0;
    for (glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
        if (text.charAt(glyphIndex) === ' ') {
            ++lineIndex;
            lineOffsetY += lineSpacing;
            lineWidth = lineWidths[lineIndex];
            widthOffset = calculateWidthOffset(lineWidth, horizontalOrigin, backgroundPadding);
            glyphPixelOffset.x = widthOffset * scale;
            firstCharOfLine = true;
        } else {
            glyph = glyphs[glyphIndex];
            dimensions = glyph.dimensions;
            if (verticalOrigin === VerticalOrigin.TOP) {
                glyphPixelOffset.y = dimensions.height - maxGlyphY - backgroundPadding.y;
                glyphPixelOffset.y += SDFSettings.PADDING;
            } else if (verticalOrigin === VerticalOrigin.CENTER) {
                glyphPixelOffset.y = (otherLinesHeight + dimensions.height - maxGlyphY) / 2;
            } else if (verticalOrigin === VerticalOrigin.BASELINE) {
                glyphPixelOffset.y = otherLinesHeight;
                glyphPixelOffset.y -= SDFSettings.PADDING;
            } else {
                // VerticalOrigin.BOTTOM
                glyphPixelOffset.y = otherLinesHeight + maxGlyphDescent + backgroundPadding.y;
                glyphPixelOffset.y -= SDFSettings.PADDING;
            }
            glyphPixelOffset.y = (glyphPixelOffset.y - dimensions.descent - lineOffsetY) * scale;

            // Handle any offsets for the first character of the line since the bounds might not be right on the bottom left pixel.
            if (firstCharOfLine)
            {
                glyphPixelOffset.x -= SDFSettings.PADDING * scale;
                firstCharOfLine = false;
            }

            if (defined(glyph.billboard)) {
                glyph.billboard._setTranslate(glyphPixelOffset);
                glyph.billboard._labelDimensions.x = totalLineWidth;
                glyph.billboard._labelDimensions.y = totalLineHeight;
                glyph.billboard._labelHorizontalOrigin = horizontalOrigin;
            }

            //Compute the next x offset taking into account the kerning performed
            //on both the current letter as well as the next letter to be drawn
            //as well as any applied scale.
            if (glyphIndex < glyphLength - 1) {
                var nextGlyph = glyphs[glyphIndex + 1];
                glyphPixelOffset.x += ((dimensions.width - dimensions.bounds.minx) + nextGlyph.dimensions.bounds.minx) * scale;
            }
        }
    }

    if (defined(backgroundBillboard) && (text.split(' ').join('').length > 0)) {
        if (horizontalOrigin === HorizontalOrigin.CENTER) {
            widthOffset = -maxLineWidth / 2 - backgroundPadding.x;
        } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
            widthOffset = -(maxLineWidth + backgroundPadding.x * 2);
        } else {
            widthOffset = 0;
        }
        glyphPixelOffset.x = widthOffset * scale;

        if (verticalOrigin === VerticalOrigin.TOP) {
            glyphPixelOffset.y = maxLineHeight - maxGlyphY - maxGlyphDescent;
        } else if (verticalOrigin === VerticalOrigin.CENTER) {
            glyphPixelOffset.y = (maxLineHeight - maxGlyphY) / 2 - maxGlyphDescent;
        } else if (verticalOrigin === VerticalOrigin.BASELINE) {
            glyphPixelOffset.y = -backgroundPadding.y - maxGlyphDescent;
        } else {
            // VerticalOrigin.BOTTOM
            glyphPixelOffset.y = 0;
        }
        glyphPixelOffset.y = glyphPixelOffset.y * scale;

        backgroundBillboard.width = totalLineWidth;
        backgroundBillboard.height = totalLineHeight;
        backgroundBillboard._setTranslate(glyphPixelOffset);
        backgroundBillboard._labelTranslate = Cartesian2.clone(glyphPixelOffset, backgroundBillboard._labelTranslate);
    }

    //存起来用于计算避让box
    label.totalWidth = totalLineWidth*scale;
    label.totalHeight = totalLineHeight*scale;

    if (label.heightReference === HeightReference.CLAMP_TO_GROUND) {
        for (glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
            glyph = glyphs[glyphIndex];
            var billboard = glyph.billboard;
            if (defined(billboard)) {
                billboard._labelTranslate = Cartesian2.clone(glyphPixelOffset, billboard._labelTranslate);
            }
        }
    }
}

function destroyLabel(labelCollection, label) {
    var glyphs = label._glyphs;
    for (var i = 0, len = glyphs.length; i < len; ++i) {
        unbindGlyph(labelCollection, glyphs[i]);
    }
    if (defined(label._backgroundBillboard)) {
        labelCollection._backgroundBillboardCollection.remove(label._backgroundBillboard);
        label._backgroundBillboard = undefined;
    }
    label._labelCollection = undefined;

    if (defined(label._removeCallbackFunc)) {
        label._removeCallbackFunc();
    }

    destroyObject(label);
}


class LabelCollectionExt extends LabelCollection{
    constructor(options) {
        super(options);

        this._backgroundBillboardCollection = new BillboardCollection({
            scene : this._scene
        });
        this._backgroundBillboardCollection.destroyTextureAtlas = false;

        this._billboardCollection = new BillboardCollection({
            scene : this._scene,
            batchTable : this._batchTable
        });
        this._billboardCollection.destroyTextureAtlas = false;
        this._billboardCollection._sdf = true;
    }

    setGlyphs(mapboxGlyphs){
        this.mapboxGlyphs = mapboxGlyphs;
    }

    update(frameState){
        if(!this.mapboxGlyphs){
            return;
        }

        var billboardCollection = this._billboardCollection;
        var backgroundBillboardCollection = this._backgroundBillboardCollection;

        billboardCollection.modelMatrix = this.modelMatrix;
        billboardCollection.debugShowBoundingVolume = this.debugShowBoundingVolume;
        backgroundBillboardCollection.modelMatrix = this.modelMatrix;
        backgroundBillboardCollection.debugShowBoundingVolume = this.debugShowBoundingVolume;

        var context = frameState.context;

        if (!defined(this._textureAtlas)) {
            this._textureAtlas = new TextureAtlas({
                context : context
            });
            billboardCollection.textureAtlas = this._textureAtlas;
        }

        if (!defined(this._backgroundTextureAtlas)) {
            this._backgroundTextureAtlas = new TextureAtlas({
                context : context,
                initialSize : whitePixelSize
            });
            backgroundBillboardCollection.textureAtlas = this._backgroundTextureAtlas;
            addWhitePixelCanvas(this._backgroundTextureAtlas, this);
        }

        var len = this._labelsToUpdate.length;
        for (var i = 0; i < len; ++i) {
            var label = this._labelsToUpdate[i];
            if (label.isDestroyed()) {
                continue;
            }

            var preUpdateGlyphCount = label._glyphs.length;

            if (label._rebindAllGlyphs) {
                // console.time(label.text);
                rebindAllGlyphs(this, label,this.mapboxGlyphs);
                // console.timeEnd(label.text);
                label._rebindAllGlyphs = false;
            }

            if (label._repositionAllGlyphs) {
                repositionAllGlyphs(label);
                label._repositionAllGlyphs = false;
            }

            var glyphCountDifference = label._glyphs.length - preUpdateGlyphCount;
            this._totalGlyphCount += glyphCountDifference;
        }

        var blendOption = backgroundBillboardCollection.length > 0 ? BlendOption.TRANSLUCENT : this.blendOption;
        billboardCollection.blendOption = blendOption;
        backgroundBillboardCollection.blendOption = blendOption;

        billboardCollection._highlightColor = this._highlightColor;
        backgroundBillboardCollection._highlightColor = this._highlightColor;

        this._labelsToUpdate.length = 0;
        backgroundBillboardCollection.update(frameState);
        billboardCollection.update(frameState);
    }
}

module.exports = LabelCollectionExt;

// new LabelCollectionExt();