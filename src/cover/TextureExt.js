/**
 * Created by user on 2020/3/7.
 */
const PixelFormat = Cesium.PixelFormat;
const Check = Cesium.Check;
const defaultValue = Cesium.defaultValue;
const defined = Cesium.defined;
function flipY(bufferView, pixelFormat, pixelDatatype, width, height) {
    if (height === 1) {
        return bufferView;
    }
    var flipped = PixelFormat.createTypedArray(pixelFormat, pixelDatatype, width, height);
    var numberOfComponents = PixelFormat.componentsLength(pixelFormat);
    var textureWidth = width * numberOfComponents;
    for (var i = 0; i < height; ++i) {
        var row = i * width * numberOfComponents;
        var flippedRow = (height - i - 1) * width * numberOfComponents;
        for (var j = 0; j < textureWidth; ++j) {
            flipped[flippedRow + j] = bufferView[row + j];
        }
    }
    return flipped;
}

class TextureExt{
    constructor() {
        Cesium.Texture.prototype.copyFrom = (function (_super) {
            return function (source, xOffset, yOffset) {
                xOffset = defaultValue(xOffset, 0);
                yOffset = defaultValue(yOffset, 0);

                //>>includeStart('debug', pragmas.debug);
                Check.defined('source', source);
                if (PixelFormat.isDepthFormat(this._pixelFormat)) {
                    throw new DeveloperError('Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.');
                }
                if (PixelFormat.isCompressedFormat(this._pixelFormat)) {
                    throw new DeveloperError('Cannot call copyFrom with a compressed texture pixel format.');
                }
                Check.typeOf.number.greaterThanOrEquals('xOffset', xOffset, 0);
                Check.typeOf.number.greaterThanOrEquals('yOffset', yOffset, 0);
                Check.typeOf.number.lessThanOrEquals('xOffset + source.width', xOffset + source.width, this._width);
                Check.typeOf.number.lessThanOrEquals('yOffset + source.height', yOffset + source.height, this._height);
                //>>includeEnd('debug');

                var gl = this._context._gl;
                var target = this._textureTarget;

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(target, this._texture);

                var width = source.width;
                var height = source.height;
                var arrayBufferView = source.arrayBufferView;

                var textureWidth = this._width;
                var textureHeight = this._height;
                var pixelFormat = this._pixelFormat;
                var pixelDatatype = this._pixelDatatype;

                var preMultiplyAlpha = this._preMultiplyAlpha;
                var isflipY = this._flipY;

                var unpackAlignment = 4;
                if (defined(arrayBufferView)) {
                    unpackAlignment = PixelFormat.alignmentInBytes(pixelFormat, pixelDatatype, width);
                }

                gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);

                var uploaded = false;
                if (!this._initialized) {
                    if (xOffset === 0 && yOffset === 0 && width === textureWidth && height === textureHeight) {
                        // initialize the entire texture
                        if (defined(arrayBufferView)) {
                            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                            if (isflipY) {
                                arrayBufferView = flipY(arrayBufferView, pixelFormat, pixelDatatype, textureWidth, textureHeight);
                            }
                            gl.texImage2D(target, 0, pixelFormat, textureWidth, textureHeight, 0, pixelFormat, pixelDatatype, arrayBufferView);
                        } else {
                            // Only valid for DOM-Element uploads
                            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
                            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, isflipY);

                            gl.texImage2D(target, 0, pixelFormat, pixelFormat, pixelDatatype, source);
                        }
                        uploaded = true;
                    } else {
                        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                        // initialize the entire texture to zero
                        var bufferView = PixelFormat.createTypedArray(pixelFormat, pixelDatatype, textureWidth, textureHeight);
                        gl.texImage2D(target, 0, pixelFormat, textureWidth, textureHeight, 0, pixelFormat, pixelDatatype, bufferView);
                    }
                    this._initialized = true;
                }

                if (!uploaded) {
                    if (defined(arrayBufferView)) {
                        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

                        if (isflipY) {
                            arrayBufferView = flipY(arrayBufferView, pixelFormat, pixelDatatype, width, height);
                        }
                        gl.texSubImage2D(target, 0, xOffset, yOffset, width, height, pixelFormat, pixelDatatype, arrayBufferView);
                    } else {
                        // Only valid for DOM-Element uploads
                        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, isflipY);

                        gl.texSubImage2D(target, 0, xOffset, yOffset, pixelFormat, pixelDatatype, source);
                    }
                }

                gl.bindTexture(target, null);
            };
        })(Cesium.Texture.prototype.copyFrom);
    }
}

module.exports = TextureExt;
new TextureExt();