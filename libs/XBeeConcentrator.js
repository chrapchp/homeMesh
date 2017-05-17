'use strict'
// XBee requirements
var util = require('util');
var SerialPort = require('serialport');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
const EventEmitter = require('events');
//var XbeePersistor = require('./XBeePersistor');

var SSEProxy = require('../libs/SSEProxy');
var appSettings = require('../libs/appSettings');

// XBee code
var C = xbee_api.constants;
var log4js = require('log4js');
class XBeeConcentrator extends EventEmitter {
    constructor(aSerialPort, aOptions) {
        super();
        this.xbeeAPI = new xbee_api.XBeeAPI({
            api_mode: 1,
            raw_frames: false,
            convert_adc: true
        });
        this.options = aOptions;
        this.serialPortName = aSerialPort;
        this.serialPort = null;
        this.portOpen = false;
        this.options['parser'] = this.xbeeAPI.rawParser();
        //console.log( (this.options));
        this.serialPort = new SerialPort(this.serialPortName, this.options);
        this.logger = log4js.getLogger("XBeeConcentrator.js");
        this.xbeePersistor =  require('./XBeePersistor');//new XbeePersistor();
    }
    open() {
        let that = this;
        if (this.portOpen) {
            that.emit('xbee_ready', 'open')
        } else {
            //this.serialPort = new SerialPort(this.serialPortName, this.options );
            this.serialPort.open(function(err) {
                if (err) {
                    return console.log('Error opening port: ', err.message);
                }
                //{that.say('serial that now') });
            });
            this.serialPort.on('open', function() {
                this.portOpen == true;
                that.emit('xbee_ready', 'open');
            });
        }
    }
    close() {
        this.serialPort.close(function(err) {
            if (err) return console.log('ERror closing port: ', err.message);
        });
        var that = this;
        this.serialPort.on('close', function() {
            this.portOpen == false;
        });
    }
    sendDiscoverNode() {
        var frame_obj = { // AT Request to be sent to 
            type: C.FRAME_TYPE.AT_COMMAND,
            command: "ND",
            commandParameter: [],
        };
        this.serialPort.write(this.xbeeAPI.buildFrame(frame_obj));
        this.logger.debug('sent discovernode');
        var that = this;
        this.xbeeAPI.on("frame_object", function(frame) {
            that.processFrame(frame);
        });
    }
    processFrame(frame) {
        var that = this;
        var responseObject = new Object();
        responseObject.timestamp = (new Date()).toJSON(); //Date.now().toJSON();
        responseObject.type = frame.type;
        //console.log("frame type = " + frame.type);
        switch (frame.type) {
            // wake up from XBee and send I/O
            case C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX:
                //that.emit("xbee_rx_IO", frame);
                //console.log(frame);
                responseObject.address64 = frame.remote64;
                responseObject.digitalSamples = frame.digitalSamples;
                responseObject.analogSamples = frame.analogSamples;
                responseObject.analogSamples.SUPPLY = responseObject.analogSamples.SUPPLY /1000.;
                this.logger.debug("I/O sample " + JSON.stringify(responseObject));



for (var key in responseObject.analogSamples) {
 //   this.logger.debug(" key:" + key + " sample:" + responseObject.analogSamples[key]);
    this.xbeePersistor.persistSample(responseObject.address64, key, responseObject.analogSamples[key]);
}


              //  SSEProxy.send(responseObject, appSettings.meshNetwork.EVENT_IO_DATA_SAMPLE_RX);
                //this.logger.debug(responseObject);
                //that.emit("xbee_rx_IO", JSON.stringify(responseObject));

                break;
                // commissioning button pressed
            case C.FRAME_TYPE.NODE_IDENTIFICATION:
                var deviceTypes = ["Coordinator","Router","End Device"];
                this.logger.debug("NODE_IDENTIFICATION");
               // this.logger.debug("frame data" + JSON.stringify(frame));
                var pendingDevice = this.xbeePersistor.emptyDeviceJSONEntry();
               
                pendingDevice.deviceType = deviceTypes[frame.deviceType];
                //console.log("Timestamp:[" + Date.now() + "] >> " );
                //console.log(">>", frame);
                pendingDevice.address64 = frame.remote64;
                pendingDevice.nodeIdentifier = frame.nodeIdentifier;
                //this.logger.debug(frame);
				SSEProxy.send(pendingDevice, appSettings.meshNetwork.EVENT_NODE_IDENTIFICATION);
                //this.xbeePersistor.persistDiscoveredNode(responseObject);
                break;
                // so far just ND - Node descovery assumed
            case C.FRAME_TYPE.AT_COMMAND_RESPONSE:
                this.logger.debug("AT_COMMAND_RESPONSE");
                //console.log("AT Commend AT_COMMAND_RESPONSE");
                //console.log("Timestamp:[" + Date.now() + "] >> " );
                //console.log(">>", frame);
                responseObject.address64 = frame.nodeIdentification.remote64;
                responseObject.nodeIdentifier = frame.nodeIdentification.nodeIdentifier;
                //console.log(">>", responseObject);
                this.logger.debug(responseObject);
                
                break;
            default:
                console.log("uknown xbeeType:" + frame.type);
        }
    }
    say(something) {
        console.log('pre saying (' + something + ')');
        this.emit('say', something);
    }
    //serialport.on("open", function() {
    //}
}
exports = module.exports = XBeeConcentrator;