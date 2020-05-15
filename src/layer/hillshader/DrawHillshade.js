// @flow

const Texture = require('../gl/texture');
const StencilMode = require('../gl/StencilMode');
const DepthMode = require('../gl/DepthMode');
const CullFaceMode = require('../gl/CullFaceMode');

const glmatrix = require('../matrix/gl-matrix');
const EXTENT = require('../util/Extent');
const Coordinate = require('../util/Coordinate');



module.exports = drawHillshade;


function drawHillshade(painter, sourceCache, layer, coords) {
    const context = painter.context;
    const gl = painter.gl;

    context.setDepthMode(painter.depthModeForSublayer(0, DepthMode.ReadOnly));
    context.setStencilMode(StencilMode.disabled);
    context.setColorMode(painter.colorModeForRenderPass());

    for (let i = 0; i < coords.length; i++) {
        const coord = coords[i];

        let tile = layer.getTile(coord);

        if (tile.needsHillshadePrepare) {
            prepareHillshade(painter, tile, layer, layer.maxZoom);
        }
        renderHillshade(painter, tile, layer,coord);
    }

    context.viewport.set([0, 0, painter.width, painter.height]);
}

function renderHillshade(painter, tile, layer,coord) {
    const context = painter.context;
    const gl = painter.gl;
    const fbo = tile.fbo;
    if (!fbo) return;

    const program = painter.useProgram('hillshade');

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, painter.width, painter.height);
    context.activeTexture.set(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.colorAttachment.get());

    hillshadeUniformValues(gl,program,painter, tile, layer);
    // if (tile.maskedBoundsBuffer && tile.maskedIndexBuffer && tile.segments) {
    //     program.draw(context, gl.TRIANGLES, depthMode, stencilMode, colorMode, CullFaceMode.disabled,
    //         uniformValues, layer.id, tile.maskedBoundsBuffer,
    //         tile.maskedIndexBuffer, tile.segments);
    // } else {
    //     program.draw(context, gl.TRIANGLES, depthMode, stencilMode, colorMode, CullFaceMode.disabled,
    //         uniformValues, layer.id, painter.rasterBoundsBuffer,
    //         painter.quadTriangleIndexBuffer, painter.rasterBoundsSegments);
    // }

    if (tile.maskedBoundsBuffer && tile.maskedIndexBuffer && tile.segments) {
        // program.draw(
        //     context,
        //     gl.TRIANGLES,
        //     layer.id,
        //     tile.maskedBoundsBuffer,
        //     tile.maskedIndexBuffer,
        //     tile.segments
        // );
    } else {
        const buffer = painter.rasterBoundsBuffer;
        const vao = painter.rasterBoundsVAO;
        vao.bind(gl, program, buffer);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffer.length);
    }
}

// hillshade rendering is done in two steps. the prepare step first calculates the slope of the terrain in the x and y
// directions for each pixel, and saves those values to a framebuffer texture in the r and g channels.
function prepareHillshade(painter, tile, layer, sourceMaxZoom) {
    const context = painter.context;
    const gl = painter.gl;
    // decode rgba levels by using integer overflow to convert each Uint32Array element -> 4 Uint8Array elements.
    // ex.
    // Uint32:
    // base 10 - 67308
    // base 2 - 0000 0000 0000 0001 0000 0110 1110 1100
    //
    // Uint8:
    // base 10 - 0, 1, 6, 236 (this order is reversed in the resulting array via the overflow.
    // first 8 bits represent 236, so the r component of the texture pixel will be 236 etc.)
    // base 2 - 0000 0000, 0000 0001, 0000 0110, 1110 1100
    if (tile.dem && tile.dem.data) {
        const tileSize = tile.dem.dim;
        const textureStride = tile.dem.stride;

        const pixelData = tile.dem.getPixels();
        // gl.activeTexture(gl.TEXTURE1);
        context.activeTexture.set(gl.TEXTURE1);

        // if UNPACK_PREMULTIPLY_ALPHA_WEBGL is set to true prior to drawHillshade being called
        // tiles will appear blank, because as you can see above the alpha value for these textures
        // is always 0
        context.pixelStoreUnpackPremultiplyAlpha.set(false);
        tile.demTexture = tile.demTexture || painter.getTileTexture(textureStride);
        if (tile.demTexture) {
            const demTexture = tile.demTexture;
            demTexture.update(pixelData, { premultiply: false });
            fbo = tile.fbo = context.createFramebuffer(tileSize, tileSize);
            demTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
        } else {
            tile.demTexture = new Texture(context, pixelData, gl.RGBA, { premultiply: false });
            tile.demTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
        }


        // gl.activeTexture(gl.TEXTURE0);
        context.activeTexture.set(gl.TEXTURE0);
        let fbo = tile.fbo;

        if (!fbo) {
            const renderTexture = new Texture(context, {width: tileSize, height: tileSize, data: null}, gl.RGBA);
            renderTexture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE);
            fbo = tile.fbo = context.createFramebuffer(tileSize, tileSize);
            fbo.colorAttachment.set(renderTexture.texture);
        }



        context.bindFramebuffer.set(fbo.framebuffer);
        context.viewport.set([0, 0, tileSize, tileSize]);

        const program = painter.useProgram('hillshadePrepare');
        const buffer = painter.rasterBoundsBuffer;
        const vao = painter.rasterBoundsVAO;

       hillshadeUniformPrepareValues(gl,program, tile, layer.maxZoom);
        vao.bind(gl, program, buffer);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, buffer.length);
        tile.needsHillshadePrepare = false;
    }
}

function getTileLatRange(painter, tileID,layer) {
    const coordinate0 = tileID.toCoordinate();
    const coordinate1 = new Coordinate(coordinate0.column, coordinate0.row + 1, coordinate0.zoom);
    return [painter.transform.coordinateLocation(coordinate0,{tileSize:layer.tileSize}).lat, painter.transform.coordinateLocation(coordinate1,{tileSize:layer.tileSize}).lat];
}

function hillshadeUniformValues(gl,program,painter, tile, layer){
    const shadow = layer.options["hillshade-shadow-color"];
    const highlight = layer.options["hillshade-highlight-color"];
    const accent = layer.options["hillshade-accent-color"];

    let azimuthal = layer.options['hillshade-illumination-direction'] * (Math.PI / 180);
    // modify azimuthal angle by map rotation if light is anchored at the viewport
    if (layer.options['hillshade-illumination-anchor'] === 'viewport') {
        azimuthal -= painter.transform.angle;
    }
    // const align = !painter.options.moving;
    const align = true;
    let matrix = painter.transform.calculatePosMatrix(tile.tileID, align);
    gl.uniformMatrix4fv(program.u_matrix,false, matrix);
    gl.uniform1i(program.u_image, 0);
    gl.uniform2fv(program.u_latrange, getTileLatRange(painter, tile.tileID,layer));
    gl.uniform2f(program.u_light, layer.options['hillshade-exaggeration'], azimuthal);
    gl.uniform4f(program.u_shadow, shadow[0],shadow[1],shadow[2],shadow[3]);
    gl.uniform4f(program.u_highlight, highlight[0],highlight[1],highlight[2],highlight[3]);
    gl.uniform4f(program.u_accent, accent[0],accent[1],accent[2],accent[3]);
}

function hillshadeUniformPrepareValues(gl,program,tile,maxzoom){
    const stride = tile.dem.stride;
    const matrix = mat4.create();
    // Flip rendering at y axis.
    mat4.ortho(matrix, 0, EXTENT, -EXTENT, 0, 0, 1);
    mat4.translate(matrix, matrix, [0, -EXTENT, 0]);

    // let matrix = mat4.identity(new Float32Array(16));
    // mat4.translate(matrix, matrix, [-1, -1, 0]);
    // mat4.scale(matrix, matrix, [2 / (8192* 0.25), 2 / (8192 * 0.25), 1]);

    gl.uniformMatrix4fv(program.u_matrix, false,matrix);
    gl.uniform1i(program.u_image, 1);
    gl.uniform2fv(program.u_dimension, [stride, stride]);
    gl.uniform1f(program.u_zoom, tile.tileID.overscaledZ);
    gl.uniform1f(program.u_maxzoom, 15);
}
