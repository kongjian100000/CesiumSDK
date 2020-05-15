/**
 * Created by matt on 2017/3/5.
 */
class GDistance{
    getLengthPoint(fromX, fromY, toX, toY, len,index){
        let dx = toX - fromX;
        let dy = toY - fromY;
        let x_new;
        let y_new;
        if(dx == 0){
            x_new = toX;
            if(dy > 0){
                y_new = fromY + len;
            }else{
                y_new = fromY - len;
            }
            if(index == null){
                return [x_new,y_new];
            }else{
                return [x_new,y_new,index];
            }
        }

        let tan = dy / dx;
        let sec = Math.sqrt((tan * tan) + 1);
        let dx_new = Math.abs(len / sec);
        let dy_new = Math.abs(dx_new * tan);
        if(dx > 0){
            x_new = fromX + dx_new;
        }else{
            x_new = fromX - dx_new;
        }
        if(dy > 0){
            y_new = fromY + dy_new;
        }else{
            y_new = fromY - dy_new;
        }
        if(index == null){
            return [x_new,y_new];
        }else{
            return [x_new,y_new,index];
        }
    }

    getAngle(p1,p2){
        if(p2[0]-p1[0] == 0){
            if(p2[1]>p1[0]){
                return 90;
            }else{
                return -90;
            }
        }
        let k = (p2[1]-p1[1])/(p2[0]-p1[0]);
        let angle = 360*Math.atan(k)/(2*Math.PI);
        return angle;
    }

    length(x0, y0, x1, y1){
        let dx = x1 - x0;
        let dy = y1 - y0;
        let len = Math.sqrt(dx * dx + dy * dy);
        return len;
    }

    getNodePath(coords,interval){
        let previous = [];
        let points = {};
        let pointList = [];
        let intervalLength = interval.length;

        //初始化标记长度等于单位长度
        let fun_getInterval = function(interval){
            let value = interval[0];
            interval.splice(0,1);
            return value;
        }
        let markLength = fun_getInterval(interval);
        let index = 0;
        while(true){
            if(pointList.length == intervalLength){
                points.index = index;
                points.pointList = pointList;
                return points;
            }
            if(index >= coords.length){
                points.index = index;
                points.pointList = pointList;
                return points;
            }
            let x = coords[index];
            let y = coords[index + 1];
            //判断上一个节点是否为空
            if(previous.length == 0){
                //如果为空就设置当前点到 上一个节点上
                previous[0] = x;
                previous[1] = y;
                continue;
            }else{

                //如果不为空则需要求上一个节点与当前结点的距离
                let lengthPath = this.length(previous[0], previous[1], x, y);
                //把节点长度加起来

                if(lengthPath >= markLength){
                    //如果长度大于标记长度，则需要上一点到标记成都的点
                    let savePoint = this.getLengthPoint(previous[0],previous[1], x,y, markLength,null);
                    let angle = this.getAngle(previous,[x,y]);

                    if(angle == 90){
                        angle = 0;
                    }
                    if(angle == -90){
                        angle = 0;
                    }
                    if(angle == 0){
                        angle = 0.5;
                    }

                    //保证竖方向的字是正的
                    if(angle >= 45){
                        angle = angle - 90;
                    }else{
                        if(angle <= - 45){
                            angle = angle + 90;
                        }
                    }


                    let pointAngle = [savePoint,angle];
                    pointList.push(pointAngle);
                    previous[0] = savePoint[0];
                    previous[1] = savePoint[1];
                    markLength = fun_getInterval(interval);
                }else{
                    markLength = markLength - lengthPath;

                    previous[0] = x;
                    previous[1] = y;
                    index = index + 2;
                }
            }
        }

        points.index = index;
        points.pointList = pointList;
        return points;
    }
}

module.exports = GDistance;





