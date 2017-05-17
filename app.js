var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');




var log4js = require('log4js');
log4js.configure('./config/log4js.json');
var loggerJS = log4js.getLogger("app.js");

//loggerJS.setLevel('INFO');

//var SerialPort = require('serialport');

//var testme = require('./libs/xbee-listener.js')

// XBee requirements
var deviceList = require('./routes/sensors');

//var serialport = new SerialPort("/dev/cu.usbserial-A700eCux", {
 // baudrate: 9600,
  //parser: xbeeAPI.rawParser()
//});
var appSettings = require( './libs/appSettings');
var XBeeConcentrator = require('./libs/XBeeConcentrator');



var testclass = new XBeeConcentrator(appSettings.meshNetwork.SERIAL_PORT, {
  baudrate: appSettings.meshNetwork.SERIAL_SPEED,
  autoOpen: false});
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);


// XBee Requirements
app.use('/api/homesensors', deviceList);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


//testclass.on('say', function ( data) {
//	console.log('said ' + data);
//});


testclass.on('xbee_ready', function ( data) {
	loggerJS.debug('xbee_ready ' + data);
	testclass.sendDiscoverNode();
});

testclass.on('xbee_rx_IO', function ( samples) {
	//loggerJS.debug('xbee_rx_IO ' + samples);
	
});

//testclass.say('hello world');
//testclass.initme();

testclass.open();

//testclass.say('hello world');
//testclass.close();
/*
testclass.xbeeAPI.on("frame_object", function(frame) {
    console.log("Timestamp:[" + Date.now() + "] >> " );
    console.log(">>", frame);

});
*/

//testclass.sendDiscoverNode();
//testclass.close();



//testme.init(serialport);
//testme.nodeDiscovery();
loggerJS.debug("Apps Settings = " + JSON.stringify(appSettings));

module.exports = app;
