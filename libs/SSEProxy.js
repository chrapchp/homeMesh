'use strict';

var SSE = require('express-sse');
//var sse = new SSE();

/*
let _singleton = Symbol();

class SSEProxy   {

    constructor(singletonToken) {
        if (_singleton !== singletonToken)
            throw new Error('Cannot instantiate directly.');
    }

    static  instance() {
        if(!this[_singleton])
            this[_singleton] = new SSEProxy(_singleton);

        return this[_singleton]
    }

    say ( something ) {
    	console.log(" saying " + something);
    }

}

*/


exports = module.exports =  new SSE();