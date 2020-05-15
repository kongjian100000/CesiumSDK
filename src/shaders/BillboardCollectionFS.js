//This file is automatically rebuilt by the Cesium build process.
module.exports = "#ifdef GL_OES_standard_derivatives\n\
#extension GL_OES_standard_derivatives : enable\n\
#endif\n\
uniform sampler2D u_atlas;\n\
#ifdef VECTOR_TILE\n\
uniform vec4 u_highlightColor;\n\
#endif\n\
varying vec2 v_textureCoordinates;\n\
varying vec4 v_pickColor;\n\
varying vec4 v_color;\n\
#ifdef SDF\n\
varying vec4 v_outlineColor;\n\
varying float v_outlineWidth;\n\
#endif\n\
#ifdef FRAGMENT_DEPTH_CHECK\n\
varying vec4 v_textureCoordinateBounds;\n\
varying vec4 v_originTextureCoordinateAndTranslate;\n\
varying vec4 v_compressed;\n\
varying mat2 v_rotationMatrix;\n\
const float SHIFT_LEFT12 = 4096.0 * 2;\n\
const float SHIFT_LEFT1 = 2.0;\n\
const float SHIFT_RIGHT12 = 1.0 / 4096.0 * 2;\n\
const float SHIFT_RIGHT1 = 1.0 / 2.0;\n\
float getGlobeDepth(vec2 adjustedST, vec2 depthLookupST, bool applyTranslate, vec2 dimensions, vec2 imageSize)\n\
{\n\
vec2 lookupVector = imageSize * (depthLookupST - adjustedST);\n\
lookupVector = v_rotationMatrix * lookupVector;\n\
vec2 labelOffset = (dimensions - imageSize) * (depthLookupST - vec2(0.0, v_originTextureCoordinateAndTranslate.y));\n\
vec2 translation = v_originTextureCoordinateAndTranslate.zw;\n\
if (applyTranslate)\n\
{\n\
translation += (dimensions * v_originTextureCoordinateAndTranslate.xy * vec2(1.0, 0.0));\n\
}\n\
vec2 st = ((lookupVector - translation + labelOffset) + gl_FragCoord.xy) / czm_viewport.zw;\n\
float logDepthOrDepth = czm_unpackDepth(texture2D(czm_globeDepthTexture, st));\n\
if (logDepthOrDepth == 0.0)\n\
{\n\
return 0.0;\n\
}\n\
vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, logDepthOrDepth);\n\
return eyeCoordinate.z / eyeCoordinate.w;\n\
}\n\
#endif\n\
#ifdef SDF\n\
float getDistance(vec2 position)\n\
{\n\
return texture2D(u_atlas, position).r;\n\
}\n\
vec4 getSDFColor(vec2 position, float outlineWidth, vec4 outlineColor, float smoothing)\n\
{\n\
float distance = getDistance(position);\n\
if (outlineWidth > 0.0)\n\
{\n\
float outlineEdge = clamp(SDF_EDGE - outlineWidth, 0.0, SDF_EDGE );\n\
float outlineFactor = smoothstep(SDF_EDGE - smoothing, SDF_EDGE + smoothing, distance);\n\
vec4 sdfColor = mix(outlineColor, v_color, outlineFactor);\n\
float alpha = smoothstep(outlineEdge - smoothing, outlineEdge + smoothing, distance);\n\
return vec4(sdfColor.rgb, sdfColor.a * alpha);\n\
}\n\
else\n\
{\n\
float alpha = smoothstep(SDF_EDGE - smoothing, SDF_EDGE + smoothing, distance);\n\
return vec4(v_color.rgb, v_color.a * alpha * 1.25);\n\
}\n\
}\n\
#endif\n\
void main()\n\
{\n\
vec4 color = texture2D(u_atlas, v_textureCoordinates);\n\
#ifdef SDF\n\
float outlineWidth = v_outlineWidth;\n\
vec4 outlineColor = v_outlineColor;\n\
float distance = getDistance(v_textureCoordinates);\n\
#ifdef GL_OES_standard_derivatives\n\
float smoothing = fwidth(distance);\n\
vec2 sampleOffset = 0.3 * vec2(dFdx(v_textureCoordinates) + dFdy(v_textureCoordinates));\n\
vec4 center = getSDFColor(v_textureCoordinates, outlineWidth, outlineColor, smoothing);\n\
vec4 color1 = getSDFColor(v_textureCoordinates + vec2(sampleOffset.x, sampleOffset.y), outlineWidth, outlineColor, smoothing);\n\
vec4 color2 = getSDFColor(v_textureCoordinates + vec2(-sampleOffset.x, sampleOffset.y), outlineWidth - 0.25, outlineColor, smoothing);\n\
vec4 color3 = getSDFColor(v_textureCoordinates + vec2(-sampleOffset.x, -sampleOffset.y), outlineWidth, outlineColor, smoothing);\n\
vec4 color4 = getSDFColor(v_textureCoordinates + vec2(sampleOffset.x, -sampleOffset.y), outlineWidth - 0.25, outlineColor, smoothing);\n\
color = (center + color1 + color2 + color3 + color4)/4.5;\n\
#else\n\
float smoothing = 1.0/32.0;\n\
color = getSDFColor(v_textureCoordinates, outlineWidth, outlineColor, smoothing);\n\
#endif\n\
color = czm_gammaCorrect(color);\n\
#else\n\
color = czm_gammaCorrect(color);\n\
color *= czm_gammaCorrect(v_color);\n\
#endif\n\
#if !defined(OPAQUE) && !defined(TRANSLUCENT)\n\
if (color.a > 0.75){\n\
	color.a = color.a + 0.3;\n\
}\n\
if (color.a < 0.35)\n\
{\n\
discard;\n\
}\n\
#else\n\
#ifdef OPAQUE\n\
if (color.a < 0.995)\n\
{\n\
discard;\n\
}\n\
#else\n\
if (color.a >= 0.995)\n\
{\n\
discard;\n\
}\n\
#endif\n\
#endif\n\
#ifdef VECTOR_TILE\n\
color *= u_highlightColor;\n\
#endif\n\
gl_FragColor = color;\n\
#ifdef LOG_DEPTH\n\
czm_writeLogDepth();\n\
#endif\n\
#ifdef FRAGMENT_DEPTH_CHECK\n\
float temp = v_compressed.y;\n\
temp = temp * SHIFT_RIGHT1;\n\
float temp2 = (temp - floor(temp)) * SHIFT_LEFT1;\n\
bool enableDepthTest = temp2 != 0.0;\n\
bool applyTranslate = floor(temp) != 0.0;\n\
if (enableDepthTest) {\n\
temp = v_compressed.z;\n\
temp = temp * SHIFT_RIGHT12;\n\
vec2 dimensions;\n\
dimensions.y = (temp - floor(temp)) * SHIFT_LEFT12;\n\
dimensions.x = floor(temp);\n\
temp = v_compressed.w;\n\
temp = temp * SHIFT_RIGHT12;\n\
vec2 imageSize;\n\
imageSize.y = (temp - floor(temp)) * SHIFT_LEFT12;\n\
imageSize.x = floor(temp);\n\
vec2 adjustedST = v_textureCoordinates - v_textureCoordinateBounds.xy;\n\
adjustedST = adjustedST / vec2(v_textureCoordinateBounds.z - v_textureCoordinateBounds.x, v_textureCoordinateBounds.w - v_textureCoordinateBounds.y);\n\
float epsilonEyeDepth = v_compressed.x + czm_epsilon1;\n\
float globeDepth1 = getGlobeDepth(adjustedST, v_originTextureCoordinateAndTranslate.xy, applyTranslate, dimensions, imageSize);\n\
if (globeDepth1 != 0.0 && globeDepth1 > epsilonEyeDepth)\n\
{\n\
float globeDepth2 = getGlobeDepth(adjustedST, vec2(0.0, 1.0), applyTranslate, dimensions, imageSize);\n\
if (globeDepth2 != 0.0 && globeDepth2 > epsilonEyeDepth)\n\
{\n\
float globeDepth3 = getGlobeDepth(adjustedST, vec2(1.0, 1.0), applyTranslate, dimensions, imageSize);\n\
if (globeDepth3 != 0.0 && globeDepth3 > epsilonEyeDepth)\n\
{\n\
discard;\n\
}\n\
}\n\
}\n\
}\n\
#endif\n\
}\n\
";