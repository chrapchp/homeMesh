'use strict';
var appSettings = require('../libs/appSettings');
var log = require('log4js').getLogger("XBeePersistor.js");
var monk = require('monk');
var db = monk(appSettings.db.CONNECTION_STRING);
var fs = require('fs');
var SSEProxy = require('../libs/SSEProxy');
var Promise = require('bluebird');
//const EventEmitter = require('events');
//var obj = JSON.parse(dummyEntry);
class XBeePersistor {
    constructor() {
        //super();
        this._emptyDeviceJSONEntry;
        if (!this._emptyDeviceJSONEntry) {
            try {
                this._emptyDeviceJSONEntry = JSON.parse(fs.readFileSync(appSettings.dummyDeviceJSONEntry));
                this._emptyTimeseriesEntry = JSON.parse(fs.readFileSync(appSettings.dummyTimeseriesEntry));
            } catch (e) {
                log.fatal("Could not read JSON device template : ", e);
                process.exit(1);
            }
        }
    }
    //{$and: [{address64:aAddress64},{'ioConfiguration.address': {$regex:/ADO/}}]}
    findTagForDevice(aAddress64, IOAddress) {
        return new Promise(function(resolve, reject) {
            //log.debug("findTagForDevice() -" + aAddress64 + " IOaddress=" + IOAddress);
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
            })
        });
    }
    insertTimeSeriesEntry(aAddress64, key) {
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
                        //log.debug("insertTimeSeriesEntry - insert result err-");
                        reject({
                            errMessage: "TagID:" + key + " not inserted for device at address " + aAddress64 + " err:" + err.message
                        });
                    } else {
                        //log.debug("insertTimeSeriesEntry - insert result ok-");
                        // log.debug("insertTimeSeriesEntry - update result-" + JSON.stringify(result));
                        resolve({
                            nCount: 1
                        });
                    }
                });
            });
        });
    }
    scaleIOValue(rawValue, scaleSettings) {
        var scaledValue = scaleSettings.lowEU + (scaleSettings.highEU - scaleSettings.lowEU) * (rawValue - scaleSettings.lowRaw) / (scaleSettings.highRaw - scaleSettings.lowRaw);
        return scaledValue;
    }
    createJSONTimestampEntry(aDate) {
        return "hours." + aDate.getHours() + ".minutes." + aDate.getMinutes() + ".seconds." + aDate.getSeconds();
    }
    createDayTimestamp(aDate) {
        var retDate = new Date(aDate);
        retDate.setHours(0, 0, 0, 0);
        return retDate;
    }
    //
    updateTimeSeries(aAddress64, aTagNameAddress, aValue) {
        return new Promise(function(resolve, reject) {
            let dateTime = new Date();
            // log.debug("updateTimeSeries() - address64=" + aAddress64, "tagname=" + aTagNameAddress + " value=" + aValue + " date=" + createDayTimestamp(dateTime));
            var deviceTimeseries = db.get('deviceTimeseries');
            var update = {
                $set: {},
                $inc: {},
                $max: {},
                $min: {}
            };
            //var myMethod = 
            //log.debug("JSON Date " + createJSONTimestampEntry(dateTime));
            //var scaledValue = aValue ;
            //log.debug("**** " + typeof(scaledValue));
            this.findTagForDevice(aAddress64, aTagNameAddress).then((deviceConfig) => {
                if (deviceConfig) {
                    if (deviceConfig.ioConfiguration[0].enabled == true) {
                        let scaleSettings = deviceConfig.ioConfiguration[0].config.scaling;
                        // lowEU + (highEU - lowEU)*(rawValue - lowRaw)/(highRaw-lowRaw)
                        var scaledValue = this.scaleIOValue(aValue, scaleSettings);
                        log.debug("scaleIOValue()-" + JSON.stringify(scaleSettings) + "scaledValue = " + scaledValue);
                        log.debug("scakeUIO) = " + scaledValue + typeof(scaledValue));
                        update.$set[this.createJSONTimestampEntry(dateTime)] = scaledValue;
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
                            dayTimeStamp: this.createDayTimestamp(dateTime),
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
        }.bind(this));
    }
    persistSample(aAddress64, tagID, tagValue) {
        log.debug("address64:" + aAddress64 + " tagID:" + tagID + " value=" + tagValue);
        this.updateTimeSeries(aAddress64, tagID, tagValue).then((result) => {
            log.debug("persistSample-first pass result-" + JSON.stringify(result) + " result=" + result.nCount + "@ " + aAddress64 + " tagID " + tagID);
            // document does not exist, need to create one
            if (result.nCount == 0) {
                log.debug("persistSample - update failed for key-" + tagID + ", trying to insert to document");
                return this.insertTimeSeriesEntry(aAddress64, tagID).then(function(result) {
                    log.debug("persistSample - intestedResult-" + result.nCount); //+JSON.stringify(result));
                    return this.updateTimeSeries(aAddress64, tagID, tagValue);
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
    isDeviceExists(aAddress64) {
        var device = db.get('deviceList');
        log.debug("isDeviceExists() -" + aAddress64);
        device.findOne({
            address64: aAddress64
        }, function(err, foundDevice) {
            if (err) {
                log.fatal("isDeviceExists()");
                throw err;
            }
            return (foundDevice);
        });
    }
    insertDevice(deviceConfig) {
        var device = db.get('deviceList');
        device.insert(deviceConfig, function(err, insertedDevice) {
            if (err) throw err;
            if (insertedDevice) {
                log.debug("deviceinserted");
            }
            return insertedDevice;
        });
    }
    persistDevice(deviceConfig) {
        //log.debug("persistDevice() - " + deviceConfig.address64);
        // device does not exist - add it
        if (!this.isDeviceExists(deviceConfig.address64)) {
            this.insertDevice(deviceConfig);
        }
        //this.isDeviceExists("6663a20040485779");
    }
    persistDiscoveredNode(discoveredNode) {
        this._emptyDeviceJSONEntry.address64 = discoveredNode.address64;
        this._emptyDeviceJSONEntry.nodeIdentifier = discoveredNode.nodeIdentifier;
        this._emptyDeviceJSONEntry.commissionedTimeStamp = discoveredNode.timestamp;
        this.persistDevice(this._emptyDeviceJSONEntry);
        //SSEProxy.send("hello");
        //log.debug("persist me" + discoveredNode.address64 + "->" + this.dummyEntry.address64);
        //dummyEntry
    }
    emptydummyTimeseriesEntry() {
        return this._emptyTimeseriesEntry;
    }
    emptyDeviceJSONEntry() {
        //console.log(this._emptyDeviceJSONEntry);
        return this._emptyDeviceJSONEntry;
    }
}
exports = module.exports = new XBeePersistor();