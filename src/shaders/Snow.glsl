uniform sampler2D colorTexture; //输入的场景渲染照片
varying vec2 v_textureCoordinates;

float snow(vec2 uv,float scale)
{
    float time = czm_frameNumber / 60.0;
    float w=smoothstep(1.,0.,-uv.y*(scale/10.));if(w<.1)return 0.;
    uv+=time/scale;uv.y+=time*2./scale;uv.x+=sin(uv.y+time*.5)/scale;
    uv*=scale;vec2 s=floor(uv),f=fract(uv),p;float k=3.,d;
    p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;d=length(p);k=min(d,k);
    k=smoothstep(0.,k,sin(f.x+f.y)*0.01);
    return k*w;
}

void main(void){
    vec2 resolution = czm_viewport.zw;
    vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);
    vec3 finalColor=vec3(0);
    //float c=smoothstep(1.,0.3,clamp(uv.y*.3+.8,0.,.75));
    float c = 0.0;
    c+=snow(uv,30.)*.0;
    c+=snow(uv,20.)*.0;
    c+=snow(uv,15.)*.0;
    c+=snow(uv,10.);
    c+=snow(uv,8.);
    c+=snow(uv,6.);
    c+=snow(uv,5.);
    finalColor=(vec3(c)); //屏幕上雪的颜色
    gl_FragColor = mix(texture2D(colorTexture, v_textureCoordinates), vec4(finalColor,1), 0.5);  //将雪和三维场景融合

}