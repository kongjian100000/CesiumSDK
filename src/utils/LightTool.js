/**
 * Created by user on 2020/3/16.
 */

class LightTool{
    static composeShader(shaderArray){
        let main = 'void main(){\n';
        let body = '';
        let fs ='';
        for(let i in shaderArray){
            let item = shaderArray[i];
            body = body + item.name + '();'
            fs = fs + item.shader;
        }
        main = main + body + '}';
        return fs + main;
    }

    static composeMainShader(sourceShader,shaderArray){
        let regex = /void\s+main\s*\(\s*(?:void)?\s*\)/g;
        let array = sourceShader.split(regex);
        let sourceHead = array[0];
        let sourceTail = array[1];
        let index = sourceTail.lastIndexOf('}');
        sourceTail = sourceTail.substring(0,index);

        let main = 'void main()\n';
        let body = '';
        let fs ='';
        for(let i in shaderArray){
            let item = shaderArray[i];
            body = body + item.name + '();'
            fs = fs + item.shader;
        }
        main = sourceHead + fs + main  + sourceTail + body + '}';
        console.log(main);
        return  main;
    }
}

module.exports = LightTool;
