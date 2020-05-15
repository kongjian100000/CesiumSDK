const jx = require('./jx');

var Deferred = function() {
    this.promise = new Promise((function(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
    }).bind(this));

    this.then = this.promise.then.bind(this.promise);
    this.catch = this.promise.catch.bind(this.promise);
};

var getJSON = function (param) {
    if(!param.type){
        param.type = 'GET';
    }
    if(!param.dataType){
        param.dataType = 'json';
    }
    return new Promise(function(resolve, reject){
        sendAjax(resolve, reject,param);
    });
}

var sendAjax = function(resolve, reject,param,returnParam){
    var UType = param.type.toUpperCase();
    var rq;
    if( UType== 'GET'){
        rq = jx.get(param.url);
    }
    if(UType == 'POST'){
        rq = jx.post(param.url, param.data);
    }
    var timeout = 30000;
    var time = false;//是否超时
    var timer = setTimeout(function(){
        if(rq.request.status >= 300 || rq.request.status < 200){
            time = true;
            rq.request.abort();//请求中止
            console.warn('timeout: '+ param.url);
            reject({param:param,data:'getParamJSON: ' + param.url + ' timeout '});
        }
    },timeout);

    rq.success(function(results, request) {
        if(time) {
            return;//忽略中止请求
        }

        if(param.dataType == 'json' && typeof(results) == 'string'){
            results = JSON.parse(results);
        }

        if(returnParam){
            resolve({param:param,data:results});
        }else{
            resolve(results);
        }
    });

    rq.error(function(results, request) {
        if(time){
            return; //终止请求报错
        }

        reject({param:param,data:'getParamJSON: ' + param.url + ' failed with status: ' + request.status + ''});
    });

    return rq.request;
}


var getParamJSON = function (param) {
    if(!param.type){
        param.type = 'GET';
    }
    if(!param.dataType){
        param.dataType = 'json';
    }

    var xhr;
    var promise =  new Promise(function(resolve, reject){
        xhr = sendAjax(resolve, reject,param,true);
    });

    promise.xhr = xhr;
    return promise;
}




module.exports = {
    Deferred: Deferred,
    getJSON: getJSON,
    getParamJSON:getParamJSON
};