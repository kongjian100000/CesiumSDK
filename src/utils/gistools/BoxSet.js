

const _quadrant_left = 1;
const _quadrant_left_bottom = 2;
const _quadrant_bottom = 3;
const _quadrant_right_bottom = 4;
const _quadrant_right = 5;
const _quadrant_right_top = 6;
const _quadrant_top = 7;
const _quadrant_left_top = 8;
const _inner = 9;

const _save = 1;
const _question = 2;
const _out = 3;

class BoxSet {
    constructor(left,right,bottom,top,base,bufferPercent) {
        if (bufferPercent == null) {
            bufferPercent = 5;
        }
        let buffer = base * 5 /100;
        this.left = left - buffer;
        this.right = right + buffer;
        this.bottom = bottom - buffer;
        this.top = top + buffer;
        this.previous = BoxSet.createEmptyDoubleArray();
        this.now = BoxSet.createEmptyDoubleArray();
        this.question = BoxSet.createEmptyDoubleArray();
        this.point_previous_quadrant = -1;
        this.point_now_quadrant = -1;
        this.point_question_quadrant = -1;

    }

    static createEmptyDoubleArray() {
        return [NaN,NaN];
    }

    copy(form ,to){
        to[0] = form[0];
        to[1] = form[1];
    }

    static isEmpty(array){
        if(array == null){
            return true;
        }
        if(isNaN(array[0]) || isNaN(array[1])){
            return true;
        }else{
            return false;
        }
    }

    isQuadrant(point){
        let x = point[0];
        let y = point[1];

        if(x < this.left){
            if(y > this.top){
                return _quadrant_left_top;
            }
            if( y < this.bottom){
                return _quadrant_left_bottom;
            }else{
                return _quadrant_left;
            }
        }
        if(x > this.right){
            if(y > this.top){
                return _quadrant_right_top;
            }
            if(y < this.bottom){
                return _quadrant_right_bottom;
            }else{
                return _quadrant_right;
            }
        }else{
            if(y > this.top){
                return _quadrant_top;
            }
            if(y < this.bottom){
                return _quadrant_bottom;
            }else{
                return _inner;
            }
        }
    }

    passrule(point_previous_quadrant,point_now_quadrant){
        if(point_previous_quadrant == 1){
            if(point_now_quadrant == 1 || point_now_quadrant == 2 || point_now_quadrant == 8){
                return _question;
            }else{
                return _save;
            }
        }
        if(point_previous_quadrant == 2){
            if(point_now_quadrant == 1 || point_now_quadrant == 2 || point_now_quadrant == 8 || point_now_quadrant == 3 || point_now_quadrant == 4){
                return _question;
            }else{
                return _save;
            }
        }
        if(this.point_previous_quadrant == 3){
            if(this.point_now_quadrant == 2 || this.point_now_quadrant == 3 || this.point_now_quadrant == 4){
                return _question;
            }else{
                return _save;
            }
        }
        if(point_previous_quadrant == 4){
            if(point_now_quadrant == 2 || point_now_quadrant == 3 || point_now_quadrant == 4 || point_now_quadrant == 5 || point_now_quadrant == 6){
                return _question;
            }else{
                return _save;
            }
        }
        if(point_previous_quadrant == 5){
            if(point_now_quadrant == 4 || point_now_quadrant == 5 || point_now_quadrant == 6){
                return _question;
            }else{
                return _save;
            }
        }
        if(point_previous_quadrant == 6){
            if(point_now_quadrant == 4 || point_now_quadrant == 5 || point_now_quadrant == 6|| point_now_quadrant == 7|| point_now_quadrant == 8){
                return _question;
            }else{
                return _save;
            }
        }
        if(point_previous_quadrant == 7){
            if(point_now_quadrant == 6 ||point_now_quadrant == 7 || point_now_quadrant == 8){
                return _question;
            }else{
                return _save;
            }
        }
        if(point_previous_quadrant == 8){
            if(point_now_quadrant == 6 || point_now_quadrant == 7 || point_now_quadrant == 8|| point_now_quadrant == 1|| point_now_quadrant == 2){
                return _question;
            }else{
                return _save;
            }
        }
        if(point_previous_quadrant == 9){
            return _save;
        }else{
            return _save;
        }
    }

    reset(){
        this.previous[0] = NaN;
        this.previous[1] = NaN;
        this.question[0] = NaN;
        this.question[1] = NaN;
        this.now[0] = NaN;
        this.now[1] = NaN;
        this.point_previous_quadrant = -1;
        this.point_now_quadrant = -1;
        this.point_question_quadrant = -1;
    }

    in(now){
        if(now[0] <	this.left || now[0] > this.right){
            return false;
        }
        if(now[1] < this.bottom || now[1] > this.top){
            return false;
        }
        return true;
    }


    static length( x0, y0, x1, y1){
        let dx = x1 - x0;
        let dy = y1 - y0;
        let len = Math.sqrt(dx * dx + dy * dy);
        return len;
    }


    push(x, y){

        this.now[0] = x;
        this.now[1] = y;
        if(BoxSet.isEmpty(this.previous)){
            this.copy(this.now, this.previous);
            this.point_previous_quadrant = this.isQuadrant(this.now);
            return [this.now];
        }else{
            this.point_now_quadrant = this.isQuadrant(this.now);
            let passrule = this.passrule(this.point_previous_quadrant,this.point_now_quadrant);
            if(passrule == _save){

                this.point_previous_quadrant = this.isQuadrant(this.now);
                this.copy(this.now, this.previous);
                if(!BoxSet.isEmpty(this.question)){
                    let returnPoint = [];
                    this.copy(this.question,returnPoint);

                    this.question = BoxSet.createEmptyDoubleArray();

                    return [returnPoint,this.now];
                }else{
                    return [this.now];
                }


            }
            if(passrule == _question){
                //如果存疑，则需要和存疑点比对
                if(!BoxSet.isEmpty(this.question)){
                    //point_question_quadrant = this.isQuadrant(question);
                    passrule = this.passrule(this.point_question_quadrant,this.point_now_quadrant);
                    if(passrule == _save){
                        let returnPoint = [];
                        this.copy(this.question,returnPoint);
                        this.question = BoxSet.createEmptyDoubleArray();
                        return [returnPoint,this.now];
                    }
                    if(passrule == _question){

                    }
                }
                this.copy(this.now, this.question);
                this.point_question_quadrant = this.point_now_quadrant;
                return null;
            }else{
                return null;
            }
        }
    }
}
module.exports = exports = BoxSet;
