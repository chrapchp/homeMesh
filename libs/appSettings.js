'use strict';

exports = module.exports;



var db = exports.db = {}


// connection to MongoDB
db.MESH_DB_PORT =  process.env.MESH_DB_PORT || 27017;
db.IP = process.env.MESH_DB_IP || 'localhost';
db.DB_NAME = process.env.MESH_DB_NAME || 'homeSensors';
db.CONNECTION_STRING = db.IP + ":" + db.MESH_DB_PORT + "/" + db.DB_NAME;
db.DEVICE_LIST_COLLECTION_NAME = "deviceList";
db.SAMPLE_DATA_COLLECTION_NAME = "deviceTimeseries";

// meshnetwork connectivity

var meshNetwork = exports.meshNetwork = {}
meshNetwork.SERIAL_PORT = process.env.MESH_SERIAL_PORT || '/dev/cu.usbserial-A700eCux';
meshNetwork.SERIAL_SPEED = process.env.MESH_SERIAL_SPEED || 9600;
meshNetwork.EVENT_NODE_IDENTIFICATION = "NI";
meshNetwork.EVENT_IO_DATA_SAMPLE_RX = "IORX";


// relative to \libs directory
exports.dummyDeviceJSONEntry = './config/dummyNodeEntry.json';
exports.dummyTimeseriesEntry = './config/dummyTimeseriesEntry.json';


// logger
/*
var log = exports.log = {}
log.logLevel = process.env.MESH_LOG_LEVEL || 'ERROR';
*/