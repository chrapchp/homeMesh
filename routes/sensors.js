var express = require('express');
var router = express.Router();
var SSEProxy = require('../libs/SSEProxy');
var appSettings = require('../libs/appSettings');
var log = require('log4js').getLogger("sensor.js");
var monk = require('monk');

/*
var     assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var fs = require('fs');

var uri = "mongodb://chrapchp:VePohJu/yTH28ci@cluster0-shard-00-00-jkuxj.mongodb.net:27017,cluster0-shard-00-01-jkuxj.mongodb.net:27017,cluster0-shard-00-02-jkuxj.mongodb.net:27017/homeSensors?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin";
MongoClient.connect(uri, function(err, db) {
      assert.equal(null, err);
db.collection('deviceList').insertOne(JSON.parse(fs.readFileSync(appSettings.dummyDeviceJSONEntry)));

//db.collection('deviceList').update( JSON.parse(fs.readFileSync(appSettings.dummyDeviceJSONEntry)), {upsert:true}, function(err, result) {
//db.collection('deviceList').update( { a:1, b:2}, {upsert:true}, function(err, result) {
//db.collection.insertOne()
 //     assert.equal(null, err);
     // assert.equal(1, result);

 //     db.close();
 //   });
    
          db.close();
});
*/
//var db = monk('localhost:27017/homeSensors');
var db = monk(appSettings.db.CONNECTION_STRING);
router.get('/', function(req, res) {
    var collection = db.get('deviceList');
    collection.find({}, function(err, deviceList) {
        if (err) throw err;
        log.debug("get with / invoked");
        res.json(deviceList);
    });
});
router.get('/messages', SSEProxy.init);
router.get('/commission', function(req, res) {
    /*
    var device = db.get('deviceList');
    device.findOne({ _id: req.params.id }, function(err, device){
        if (err) throw err;
        //log.debug(device);
        log.debug("get with commission invoked");
        device.address64 = '123';
        res.json(device);
    });*/
    log.debug("device commission route invoked");
    var device = {
        address64: (new Date()).toJSON()
    };
    /*
                 resposta.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
                 
                resposta.write('\n');
                //resposta.write("id: "+Date.now()+"\n");
                resposta.write("data: " + JSON.stringify(device)+"\n\n");
                resposta.end();


    */
    //resposta.write(device);
    //resposta.end();
    //res.sse(device);
    //SSEProxy.send("test messsage");
    //      res.json(device);
    //debug.log("respons = " + device)
    //res.write(device);
});
router.get('/:id', function(req, res) {
    var device = db.get('deviceList');
    device.findOne({
        _id: req.params.id
    }, function(err, device) {
        if (err) throw err;
        //log.debug(device);
        log.debug("get with id invoked");
        res.json(device);
    });
});
router.put('/:id', function(req, res) {
    var device = db.get('deviceList');
    device.update({
        _id: req.params.id
    }, req.body, function(err, device) {
        if (err) {
            //console.log("error updating" + device);
            throw err;
        }
        //console.log("returning from updating" + device);
        log.debug("put route");
        res.json(device);
        //sse.send(device);
    });
});
router.delete('/:id', function(req, res) {
    var device = db.get('deviceList');
    device.remove({
        _id: req.params.id
    }, function(err, device) {
        if (err) throw err;
        res.json(device);
    });
});
// invoked via commissioning of new xbee device
// if exist, update document with xbee meta data from device
// leave user supplied meta data as-is
router.post('/', function(req, res){

    log.debug("Post invoked");
    var device = db.get('deviceList');
    device.findAndModify( 
    {
        "query": {"address64":req.body.address64 },
        "update":
        {
            $set: req.body
        }
    }, 
    {
        "upsert": true,
        "new": true
    },

        function(err, insertedDevice){
        if (err) {

            res.json({"message":err});
            throw err;
        }

        res.json({"message":"Information saved."});
    });
});
/*
        function isDeviceExist(aAddress64) {
            var device = db.get('deviceList');
            device.findOne({
                address64: aAddress64
            }, function(err, device) {
                if (err) throw err;
                console.log(device);
                return device;
            });
        }
        */
        /*
        {
            "_id" : ObjectId("58b0556b8cc43c1fa4beead9"),
            "address64" : "6663a20040485779",
            "nodeIdentifier" : "outside",
            "coordinates" : {
                "latitude" : 51.075884,
                "longitude" : -114.067917
            },
            "elevation" : 1045,
            "type" : "",
            "status" : "Not Found",
            "ioConfiguration" : [ 
                {
                    "pinName" : "D0",
                    "description" : "AD0/DIO0",
                    "tagname" : "TI-100",
                    "comment" : "",
                    "status" : "",
                    "discoveredTimestamp" : ""
                }, 
                {
                    "pinName" : "D1",
                    "description" : "AD1/DIO1",
                    "tagname" : "",
                    "comment" : "",
                    "status" : "",
                    "discoveredTimestamp" : ""
                }, 
                {
                    "pinName" : "D2",
                    "description" : "AD2/DIO2",
                    "tagname" : "",
                    "comment" : "",
                    "status" : "",
                    "discoveredTimestamp" : ""
                }, 
                {
                    "pinName" : "D3",
                    "description" : "AD3/DIO3",
                    "tagname" : "",
                    "comment" : "",
                    "status" : "",
                    "discoveredTimestamp" : ""
                }, 
                {
                    "pinName" : "D4",
                    "description" : "DIO4",
                    "tagname" : "",
                    "comment" : "",
                    "status" : "",
                    "discoveredTimestamp" : ""
                }
            ]
        }
        */
        module.exports = router;