!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jx=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function toString(obj) {
	return Object.prototype.toString.call(obj);
}

function set(request, header, value) {
	request.setRequestHeader(header, value);
}


function noop() {};

var isRequested = false;
var isIE9 = false;
function req(url, type, json, data) {
	var methods = {
		success: noop,
		error: noop,
	};

    var request;
    if(!isRequested){
        var b_version=navigator.appVersion;
        var version=b_version.split(";");
        if(version[1]){
            var trim_Version=version[1].replace(/[ ]/g,"");
            isIE9 = trim_Version == 'MSIE9.0';
		}
        isRequested = true;
	}

    if(isIE9){
        request = new XDomainRequest();
    }else{
        request = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	}

    var hasPayload = type === 'POST' || type === 'PATCH' || type === 'DELETE';

	request.open(type, url, true);

	if(!isIE9){
        if (json) {
            set(request, 'Content-Type', 'application/json');
            set(request, 'Accept', 'application/json');
        } else {
            set(request, 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        }
	}


	if (hasPayload) {
		if (json) data = JSON.stringify(data);		
		// set(request, 'X-CSRFToken', csrf());
	}
	// set(request, 'X-Requested-With', 'XMLHttpRequest');
	
	request.onreadystatechange = function() {
		if (request.readyState === 4) {
			if (request.status >= 200 && request.status < 300) {
				methods.success.call(request, request.responseText, request);
			} else {
				methods.error.call(request, request.responseText, request);
			}
		}
	};

    request.onerror = function () {
        methods.error.call(request, request.responseText, request);
    };

    request.onload = function () {
        methods.success.call(request, request.responseText, request);
    };
	
	hasPayload ? request.send(data) : request.send();

	var returned = {
		success: function (callback) {
			methods.success = callback;
			return returned;
		},
		error: function (callback) {
			methods.error = callback;
			return returned;
		},
		request:request
	};

	return returned;
}

module.exports = {
	get: function(url) {
		return req(url, 'GET', false, null);
	},
	post: function(url, data) {
		return req(url, 'POST', false, data);
	},
	patch: function(url, data) {
		return req(url, 'PATCH', false, data);
	},
	"delete": function(url) {
		return req(url, 'DELETE', false, null);
	},
	json: {
		get: function(url) {
			return req(url, 'GET', true, null);
		},
		post: function(url, data) {
			return req(url, 'POST', true, data);
		},
		patch: function(url, data) {
			return req(url, 'PATCH', true, data);
		},
	},
};
},{}]},{},[1])(1)
});