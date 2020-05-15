'use strict';

module.exports = Glyphs;

function toRGBA(glyph){
    glyph.height=glyph.height + 6;
    glyph.width = glyph.width + 6;

    let dist = new Uint8Array(glyph.bitmap.length*4);
    //由a通道恢复成rgba通道
    for(let i = 0;i<glyph.bitmap.length;i++){
        let a = glyph.bitmap[i];
        // if(a != 0){
        //     dist[i*4 + 0] = a;
        //     dist[i*4 + 1] = a;
        //     dist[i*4 + 2] = a;
        //     dist[i*4 + 3] = a;
        // }
        if(a != 0){
            dist[i*4 + 0] = a;
            dist[i*4 + 1] = a;
            dist[i*4 + 2] = a;
            dist[i*4 + 3] = a;
        }
    }
    glyph.arrayBufferView = dist;
}


// function toRGBA(glyph){
//     glyph.rw = glyph.width;
//     glyph.rh = glyph.height;
//     glyph.height = glyph.height + 6 + (glyph.width - glyph.height);
//     glyph.width = glyph.width + 6;
//
//     var gamma = 0.21;
//     var buff = (256.0 - 64.0) / 256.0;
//     var p1 = buff - gamma;
//     var p2 = buff + gamma;
//
//     let dist = new Uint8Array(glyph.bitmap.length*4);
//     for(let i = 0;i<glyph.bitmap.length;i++){
//         let a = glyph.bitmap[i];
//         var o = smoothstep(p1,p2,a/256);
//         dist[i*4 + 0] = 255;
//         dist[i*4 + 1] = 255;
//         dist[i*4 + 2] = 255;
//         dist[i*4 + 3] = o*256;
//     }
//     glyph.arrayBufferView = dist;
// }

function smoothstep (min, max, value) {
    var x = Math.max(0, Math.min(1, (value-min)/(max-min)));
    return x*x*(3 - 2*x);
};

function Glyphs(pbf, end) {
    this.stacks = pbf.readFields(readFontstacks, [], end);
    for(var i =0;i<this.stacks.length;i++){
        var glyphs = this.stacks[i].glyphs;
        for(var key in glyphs){
            var glyph =glyphs[key];
            toRGBA(glyph);
        }
    }
}

function readFontstacks(tag, stacks, pbf) {
    if (tag === 1) {
        const fontstack = pbf.readMessage(readFontstack, {glyphs: {}});
        stacks.push(fontstack);
    }
}

function readFontstack(tag, fontstack, pbf) {
    if (tag === 1) fontstack.name = pbf.readString();
    else if (tag === 2) fontstack.range = pbf.readString();
    else if (tag === 3) {
        const glyph = pbf.readMessage(readGlyph, {});
        fontstack.glyphs[glyph.id] = glyph;
    }
}

function readGlyph(tag, glyph, pbf) {
    if (tag === 1) glyph.id = pbf.readVarint();
    else if (tag === 2) glyph.bitmap = pbf.readBytes();
    else if (tag === 3) glyph.width = pbf.readVarint();
    else if (tag === 4) glyph.height = pbf.readVarint();
    else if (tag === 5) glyph.left = pbf.readSVarint();
    else if (tag === 6) glyph.top = pbf.readSVarint();
    else if (tag === 7) glyph.advance = pbf.readVarint();
}
