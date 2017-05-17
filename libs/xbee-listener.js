'use strict'

// XBee requirements
var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var SerialPort = require('serialport');
var events = require('events');





// XBee code
var C = xbee_api.constants;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1,
  raw_frames: false,
  convert_adc: true
});




var serialport = new SerialPort("/dev/cu.usbserial-A700eCux", {
  baudrate: 9600,
  parser: xbeeAPI.rawParser(),
  autoOpen: false
});

serialport.on("open", function() {

  //var frame_obj = { // AT Request to be sent to 
  //  type: C.FRAME_TYPE.AT_COMMAND,
  //  command: "ND",
  //  commandParameter: [],
 // };

  //xbee_api.serialport.write(xbeeAPI.buildFrame(frame_obj));
});



//AT_COMMAND_RESPONSE
// All frames parsed by the XBee will be emitted here
xbeeAPI.on("frame_object", function(frame) {
//	if( frame.type==C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX) {
  // console.log("Timestamp:[" + Date.now() + "] >> " );
  // 		console.log(">>", frame);
//	}
xbee_api.eventEmitter.emit('RX_IO', frame.type);
});



/*
xbee_api.init = function(aSerialPort)  {
	console.log("got to open " + aSerialPort);
	serialport = aSerialPort;

}
*/
xbee_api.nodeDiscovery = function() {
	var frame_obj = { // AT Request to be sent to 
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "ND",
    commandParameter: [],
  };

  serialport.serialport.write(xbeeAPI.buildFrame(frame_obj));
}


xbee_api.helper = function(emitter, buffer) {
    emitter.emit('data', buffer);
  },


exports = module.exports = xbee_api;


