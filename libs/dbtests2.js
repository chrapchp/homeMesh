'use strict'
var appSettings = require('../libs/appSettings');
var log = require('log4js').getLogger("dbtests.js");
var monk = require('monk');
var db = monk(appSettings.db.CONNECTION_STRING);
var fs = require('fs');
var Promise = require('bluebird');
const assert = require('assert');
const IMPOSIBLE_VALUE_NEG = -99999.99;
const IMPOSIBLE_VALUE_POS = 99999.99;
var summaryObj = {
    sum: 0,
    count: 0,
    max: IMPOSIBLE_VALUE_NEG,
    min: IMPOSIBLE_VALUE_POS
};
var pointScalingEntry = {
    type: "AI",
    scaling: {
        lowRaw: 0,
        highRaw: 3.3,
        lowEU: 0,
        highEU: 3.3,
        UOM: "C"
    }
}
var hourEntry = {
    id: IMPOSIBLE_VALUE_NEG,
    summary: summaryObj,
    minutes: new Array(60)
}
var dayEntry = {
    dayTimeStamp: new Date(),
    nodeIdentifier: "TBD",
    deviceID: "TBD",
    tagID: "TBD",
    tagName: "TBD",
    coordinates: {
        lattitude: IMPOSIBLE_VALUE_NEG,
        longitude: IMPOSIBLE_VALUE_NEG
    },
    elevation: IMPOSIBLE_VALUE_NEG,
    summary: summaryObj,
    pointScalingConfig: pointScalingEntry,
    hours: new Array(24)
};
var minutes = new Array(60);
var seconds = new Array(60);
for (var i = 0; i < seconds.length; i++) {
    seconds[i] = IMPOSIBLE_VALUE_NEG;
}

function doCreateTemplate() {
    for (var i = 0; i < minutes.length; i++) {
        minutes[i] = {
            id: i,
            summary: summaryObj,
            seconds: seconds
        };
    }
    for (var i = 0; i < dayEntry.hours.length; i++) {
        //  obj.key1=i;
        //  hours[i]=obj;
        //dayEntry.hours[i].id = i;
        //console.log(i);
        hourEntry.id = i;
        hourEntry.minutes = minutes;
        //dayEntry.hours[i] = hourEntry;
        dayEntry.hours[i] = {
            id: i,
            summary: summaryObj,
            minutes: minutes
        };
    }
    fs.writeFile('input.json', JSON.stringify(dayEntry), function(err) {
        if (err) {
            return console.error(err);
        }
        console.log("exported json template");
    });
}
//doCreateTemplate();
function createDayTimestamp(aDate) {
    var retDate = new Date(aDate);
    retDate.setHours(0, 0, 0, 0);
    return retDate;
}

function createJSONTimestampEntry(aDate) {
    return "hours." + aDate.getHours() + ".minutes." + aDate.getMinutes() + ".seconds." + aDate.getSeconds();
}

function doTestDates() {
    let createdDateTime = createDayTimestamp(new Date(2017, 3, 17, 11, 45, 30, 100));
    let expectedDateTime = new Date(2017, 3, 17);
    //log.debug(createdDateTime + " "  + expectedDateTime );
    //log.debug(createdDateTime.getTime() + " "  + expectedDateTime.getTime());
    assert(createdDateTime.getTime() == expectedDateTime.getTime(), "createDayTimestamp failed");
    log.debug(createJSONTimestampEntry(new Date()));
}

function scaleIOValue(rawValue, scaleSettings) {
    var scaledValue = scaleSettings.lowEU + (scaleSettings.highEU - scaleSettings.lowEU) * (rawValue - scaleSettings.lowRaw) / (scaleSettings.highRaw - scaleSettings.lowRaw);
    return scaledValue;
}
//
function doTestDBUpdate(aAddress64, aTagNameAddress, aValue) {
    return new Promise(function(resolve, reject) {
        let dateTime = new Date();
        log.debug("doTestDBUpdate() - address64=" + aAddress64, "tagname=" + aTagNameAddress + " value=" + aValue + " date=" + createDayTimestamp(dateTime));
        var deviceTimeseries = db.get('deviceTimeseries');
        var update = {
            $set: {},
            $inc: {},
            $max: {},
            $min: {}
        };
        log.debug("JSON Date " + createJSONTimestampEntry(dateTime));
        //var scaledValue = aValue ;
        //log.debug("**** " + typeof(scaledValue));
        findTagForDevice(aAddress64, aTagNameAddress).then((deviceConfig) => {
            if (deviceConfig) {
                if (deviceConfig.ioConfiguration[0].enabled == true) {
                    let scaleSettings = deviceConfig.ioConfiguration[0].config.scaling;
                    // lowEU + (highEU - lowEU)*(rawValue - lowRaw)/(highRaw-lowRaw)
                    var scaledValue = scaleIOValue(aValue, scaleSettings);
                    log.debug("scaleIOValue()-" + JSON.stringify(scaleSettings) + "scaledValue = " + scaledValue);
                    log.debug("scakeUIO) = " + scaledValue + typeof(scaledValue));
                    update.$set[createJSONTimestampEntry(dateTime)] = scaledValue;
                    update.$inc['summary.count'] = 1;
                    update.$inc['summary.sum'] = scaledValue;
                    update.$max['summary.max'] = scaledValue;
                    update.$min['summary.min'] = scaledValue;
                    update.$inc['hours.' + dateTime.getHours() + '.summary.count'] = 1;
                    update.$inc['hours.' + dateTime.getHours() + '.summary.sum'] = scaledValue;
                    update.$max['hours.' + dateTime.getHours() + '.summary.max'] = scaledValue;
                    update.$min['hours.' + dateTime.getHours() + '.summary.min'] = scaledValue;
                    update.$inc['hours.' + dateTime.getHours() + '.minutes.' + dateTime.getMinutes() + '.summary.count'] = 1;
                    update.$inc['hours.' + dateTime.getHours() + '.minutes.' + dateTime.getMinutes() + '.summary.sum'] = scaledValue;
                    update.$max['hours.' + dateTime.getHours() + '.minutes.' + dateTime.getMinutes() + '.summary.max'] = scaledValue;
                    update.$min['hours.' + dateTime.getHours() + '.minutes.' + dateTime.getMinutes() + '.summary.min'] = scaledValue;
                    deviceTimeseries.update({
                        dayTimeStamp: createDayTimestamp(dateTime),
                        deviceID: aAddress64,
                        tagID: new RegExp(aTagNameAddress)
                    }, update, {
                        upsert: false
                    }).then((result) => {
                        resolve({
                            nCount: result.nModified
                        });
                    });
                }
            }
        });
    });
}
/*
function isDeviceExists(aAddress64, callback) {
        var device = db.get('deviceList');
        log.debug("isDeviceExists() -" + aAddress64);
        var retVal;

        device.findOne({
            address64: aAddress64
        }, function(err, foundDevice) {
            if (err) {
                log.fatal("isDeviceExists()");
                throw err;
            }
            log.debug(foundDevice);
          //retVal= foundDevice;
            //return (foundDevice);
        });

return(retVal);
    }
*/
//{$and: [{address64:aAddress64},{'ioConfiguration.address': {$regex:/ADO/}}]}
function findTagForDevice(aAddress64, IOAddress) {
   return new Promise(function(resolve, reject) {
        log.debug("findTagForDevice() -" + aAddress64 + " IOaddress=" + IOAddress);
        let device = db.get('deviceList');
        device.findOne({
            $and: [{
                address64: aAddress64
            }, {
                'ioConfiguration.address': {
                    $regex: new RegExp(IOAddress)
                }
            }]
        }, {
            fields: {
                address64: 1,
                elevation: 1,
                coordinates: 1,
                nodeIdentifier: 1,
                'ioConfiguration.$': 1
            }
        }).then((result) => {
            resolve(result);
            //return result;
        })
    });
}

function isDeviceExists(aAddress64) {
    log.debug("isDeviceExists() -" + aAddress64);
    var device = db.get('deviceList');
    return new Promise(function(resolve, reject) {
        device.findOne({
            address64: aAddress64
        }, {
            fields: {
                address64: 1,
                elevation: 1,
                coordinates: 1,
                nodeIdentifier: 1
            }
        }, function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function insertTimeSeriesEntry(aAddress64, key) {
    return new Promise(function(resolve, reject) {
        var timeSeriesEntry = JSON.parse(JSON.stringify(_emptyTimeseriesEntry));
        findTagForDevice(aAddress64, key).then(function(deviceConfig) {
            if (deviceConfig) {
                if (deviceConfig.ioConfiguration[0].enabled == true) {
                    timeSeriesEntry.dayTimeStamp = createDayTimestamp(new Date());
                    timeSeriesEntry.nodeIdentifier = deviceConfig.nodeIdentifier;
                    timeSeriesEntry.deviceID = deviceConfig.address64;
                    timeSeriesEntry.tagName = deviceConfig.ioConfiguration[0].tagname;
                    timeSeriesEntry.tagID = deviceConfig.ioConfiguration[0].address;
                    timeSeriesEntry.coordinates = deviceConfig.coordinates;
                    timeSeriesEntry.elevation = deviceConfig.elevation;
                    timeSeriesEntry.pointScalingConfig = deviceConfig.ioConfiguration[0].config;
                    //log.debug("insertTimeSeriesEntry - findTagForDevice()-" + JSON.stringify(deviceConfig));
                } else {
                    reject({
                        errMessage: "TagID:" + key + " or device at address " + aAddress64 + " not enabled"
                    });
                    return null;
                }
            } else {
                reject({
                    errMessage: "TagID:" + key + " or device at address " + aAddress64 + " not found."
                });
                return null;
            }
            var device = db.get('deviceTimeseries');
            //delete timeSeriesEntry._id;
            device.insert(timeSeriesEntry, function(err, result) {
                if (err) {
                    log.debug("insertTimeSeriesEntry - insert result err-");
                    reject({
                        errMessage: "TagID:" + key + " not inserted for device at address " + aAddress64 + " err:" + err.message
                    });
                } else {
                    log.debug("insertTimeSeriesEntry - insert result ok-");
                    // log.debug("insertTimeSeriesEntry - update result-" + JSON.stringify(result));
                    resolve({
                        nCount: 1
                    });
                }
            });
        });
    });
}
/*
function persistSample(aSample) {
    log.debug("persistSample()");
    var device = db.get('deviceTimeseries');
    var key;
    for (key in aSample.analogSamples) {
        log.debug("key:" + key + " value=" + aSample.analogSamples[key]);
        doTestDBUpdate(aSample.address64, key, aSample.analogSamples[key]).then(function(result) {
            log.debug("persistSample-first pass result-" + JSON.stringify(result) + " result=" + result.nCount);
            // document does not exist, need to create one
            if (result.nCount == 0) {
                log.debug("persistSample - update failed for key-" + key + ", trying to insert to document");
                return (insertTimeSeriesEntry(aSample.address64, key));
                //return findTagForDevice(aSample.address64, key);
            } else {
                log.debug("persistSample - document exists, update on fist pass.");
            }
        }).then(function(result) {
            log.debug("persistSample - intestedResult-" + result.nCount); //+JSON.stringify(result));
            return doTestDBUpdate(aSample.address64, key, aSample.analogSamples[key]);
        }).then(function(result) {
            log.debug("persistSample-second pass result-" + JSON.stringify(result) + " result=" + result.nCount);
        }).catch(function(err) {
            log.fatal("persistSample() - " + err.errMessage);
            //process.exit(1);
        });
    }
}
*/
function persistSample(aAddress64, tagID, tagValue) {
    log.debug("address64:" + aAddress64 + " tagID:" + tagID + " value=" + tagValue);
    doTestDBUpdate(aAddress64, tagID, tagValue).then((result) => {
        log.debug("persistSample-first pass result-" + JSON.stringify(result) + " result=" + result.nCount + "@ " + aAddress64 + " tagID " + tagID);
        // document does not exist, need to create one
        if (result.nCount == 0) {
            log.debug("persistSample - update failed for key-" + tagID + ", trying to insert to document");
            return insertTimeSeriesEntry(aAddress64, tagID).then(function(result) {
                log.debug("persistSample - intestedResult-" + result.nCount); //+JSON.stringify(result));
                return doTestDBUpdate(aAddress64, tagID, tagValue);
            }).then(function(result) {
                log.debug("persistSample-second pass result-" + JSON.stringify(result) + " result=" + result.nCount);
            });
            //return findTagForDevice(aSample.address64, key);
        } else {
            // log.debug("persistSample - document exists, update on fist pass.");
            // return Promise.reject('DONE');
        }
    }).catch(function(err) {
        log.fatal("persistSample() - " + JSON.stringify(err));
        //process.exit(1);
    });
}
/*
function persistSample(aAddress64, tagID, tagValue) {
    log.debug("address64:" + aAddress64 + " tagID:" + tagID + " value=" + tagValue);
    doTestDBUpdate(aAddress64, tagID, tagValue).then(function(result) {
        log.debug("persistSample-first pass result-" + JSON.stringify(result) + " result=" + result.nCount + "@ " + aAddress64 + " tagID " + tagID);
        // document does not exist, need to create one
        if (result.nCount == 0) {
            log.debug("persistSample - update failed for key-" + tagID + ", trying to insert to document");
            return insertTimeSeriesEntry(aAddress64, tagID);
            //return findTagForDevice(aSample.address64, key);
        } else {
            log.debug("persistSample - document exists, update on fist pass.");
            return Promise.reject('DONE');
        }
    }).then(function(result) {
        log.debug("persistSample - intestedResult-" + result.nCount); //+JSON.stringify(result));
        return doTestDBUpdate(aAddress64, tagID, tagValue);
    }).then(function(result) {
        log.debug("persistSample-second pass result-" + JSON.stringify(result) + " result=" + result.nCount);
    }).catch(function(err) {
        log.fatal("persistSample() - " + JSON.stringify(err));
        //process.exit(1);
    });
}
*/
/*
.then(function(result) {
            log.debug("persistSample - intestedResult-" + result.nCount); //+JSON.stringify(result));
            return doTestDBUpdate(aAddress64, tagID, tagValue);
        }).then(function(result) {
            log.debug("persistSample-second pass result-" + JSON.stringify(result) + " result=" + result.nCount);
        })
        */
//db.getCollection('deviceList').find({$and: [{"address64":"0013a20040485779"},{"ioConfiguration.address":{$in: [/^SUP/]}}]},  { "address64": 1, "elevation": 1,  "coordinates": 1, "nodeIdentifier": 1,"ioConfiguration.$":1 })
//var tsEntry = JSON.parse('{"timestamp":"2017-03-18T01:30:50.783Z","type":146,"address64":"0013a20040485779","digitalSamples":{"DIO2":1},"analogSamples":{"AD1":1000,"SUPPLY":3.275}}');
var tsEntry = JSON.parse('{"timestamp":"2017-05-17T16:03:02.977Z","type":146,"address64":"0013a20040485779","digitalSamples":{"DIO2":1},"analogSamples":{"AD1":1000,"SUPPLY":3.275}}');
//var tsEntry = JSON.parse('{"timestamp":"2017-03-18T01:30:50.783Z","type":146,"address64":"0013a20040485779","digitalSamples":{"DIO2":1},"analogSamples":{"AD1":612}}');
function getAnalogs(samples) {
    for (var i in samples.analogSamples) {
        log.debug("key:" + i + " value=" + samples.analogSamples[i]);
    }
}

function doTestDBInsert(timeSeriesEntry, sample) {
    log.debug("doTestDBInsert");
    timeSeriesEntry.dayTimeStamp = createDayTimestamp(new Date());
    isDeviceExists(sample.address64).then(function(data) {
        timeSeriesEntry.nodeIdentifier = data.nodeIdentifier;
        timeSeriesEntry.deviceID = data.address64;
        timeSeriesEntry.tagName = "TI-100";
        var device = db.get('deviceTimeseries');
        device.insert(timeSeriesEntry, function(err, insertedTimeSeries) {
            if (err) throw err;
            if (insertedTimeSeries) {
                log.debug("time series inserted");
                db.close();
            }
        });
    }).catch(function(err) {
        log.fatal("device not commissioned or congi- " + err);
    });
}
//doCreateTemplate();
//return;
var _emptyTimeseriesEntry;
try {
    //this._emptyDeviceJSONEntry = JSON.parse(fs.readFileSync(appSettings.dummyTimeseriesEntry));
    _emptyTimeseriesEntry = JSON.parse(fs.readFileSync('input.json'));
    //log.debug()
    //  doTestDates();
    //   doTestDBInsert( _emptyTimeseriesEntry);
} catch (e) {
    log.fatal("Could not read JSON device template : ", e);
    process.exit(1);
}
//persistSample(tsEntry);
//var x = new(_emptyTimeseriesEntry);
for (var key in tsEntry.analogSamples) {
    persistSample(tsEntry.address64, key, tsEntry.analogSamples[key]);
}
//persistSample("0013a20040485779", "AD1", 600);
//persistSample("0013a20040485779", "AD2", 600);
//persistSample("0013a20040485779", "SUPPLY", 3.3);
/*
var sum = [10, 1, 2, 3].reduce((acc, val, i, a) => {
  console.log(acc + " " + val +" " + i + " " + a );
    return acc + val;
},0);
console.log(sum);
*/
/*
['{"one":1}', '{"two":2}', '{"four":4}', '{"eight":8}', '{"sixteen":16}'].reduce((seq, n) => {
    return seq.then(() => {
        console.log(JSON.parse(n) + " " + seq);
        return new Promise(res => setTimeout(res, 500));
    });
}, Promise.resolve()).then(
    () => console.log('done'), (e) => console.log(e));

*/
//persistSample(tsEntry);
//getAnalogs(tsEntry);
//doTestDBInsert(_emptyTimeseriesEntry,tsEntry);
/*
isDeviceExists("0013a20040485779").then(function(data) {
    log.debug(data);
    db.close();
}).catch(function(err) {
    log.fatal(error);
});
*/
/*
function *foo(x) {
  console.log(x);
    var y = 2 * (yield (x + 1));
      console.log(y);
    var z = yield (y / 3);
          console.log(z);
    return (x + y + z);
}

var it = foo( 2 );

// note: not sending anything into `next()` here
console.log( it.next() );       // { value:6, done:false }
console.log("log1");

console.log( it.next( 4 ) );   // { value:8, done:false }
console.log("log1");
console.log( it.next( 8 ) );   // { value:42, done:true }
*/
/*
let myFirstPromise = new Promise((resolve, reject) => {
    //We call resolve(...) when what we were doing async succeeded, and reject(...) when it failed.
    //In this example, we use setTimeout(...) to simulate async code. 
    //In reality, you will probably be using something like XHR or an HTML5 API.
    setTimeout(function() {
        resolve("Success!"); //Yay! Everything went well!
        console.log("should not get here.");
    }, 250);
});
myFirstPromise.then((successMessage) => {
    //successMessage is whatever we passed in the resolve(...) function above.
    //It doesn't have to be a string, but if it is only a succeed message, it probably will be.
    console.log("Yay! " + successMessage);
});

function* foo() {
    var index = 0;
    while (index <= 2) yield index++;
}
var iterator = foo();
console.log(iterator.next()); // { value: 0, done: false }
console.log(iterator.next()); // { value: 1, done: false }
console.log(iterator.next()); // { value: 2, done: false }
console.log(iterator.next()); // { value: undefined, done: true }

*/
//  doTestDBUpdate(_emptyTimeseriesEntry);
/*
setInterval(function() {
    log.debug("looping");
    doTestDBUpdate(_emptyTimeseriesEntry);
}, 5000);
*/