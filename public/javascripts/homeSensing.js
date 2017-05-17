'use strict';
var app = angular.module('HomeSensorApp', ['ngResource', 'ngRoute']);
const sse = new EventSource('/api/homesensors/messages');
app.config(function($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix('');
    $routeProvider.when('/', {
        templateUrl: 'partials/home.html',
        controller: 'DeviceListCtrl'
    }).when('/delete/:id', {
        templateUrl: 'partials/device-delete.html',
        controller: 'DeleteDeviceCtrl'
    }).when('/edit/:id', {
        templateUrl: 'partials/device-edit.html',
        controller: 'EditDeviceCtrl'
    }).when('/commission', {
        templateUrl: 'partials/device-commission.html',
        controller: 'CommissionDeviceCtrl'
    }).otherwise({
        redirectTo: '/'
    })
});
/*
app.config(['$routeProvider', function($routeProvider, $locationProvider){

  //  $locationProvider.hashPrefix('');


   // $locationProvider.hashPrefix('');
    $routeProvider
        .when('/', {
            templateUrl: 'partials/home.html',
            controller: 'DeviceListCtrl'
        })

        .when('/delete/:id', {
            templateUrl: 'partials/device-delete.html',
            controller: 'DeleteDeviceCtrl'
         })

        .otherwise({
            redirectTo: '/'
        })
}]);
*/
app.controller('DeviceListCtrl', ['$scope', '$resource',
    function($scope, $resource) {
        var Devices = $resource('/api/homesensors');
        Devices.query(function(deviceList) {
            //console.log(deviceList);
            $scope.deviceList = deviceList;
        });
        $scope.orderByMe = function(x) {
            $scope.myOrderBy = x;
        }
        $scope.selDevice = function(device) {
            $scope.selected_device = device;
        }
        $scope.isSelected = function(device) {
            return $scope.selected_device === device;
        }
        $scope.save = function(device) {}
    }
]);
app.controller('EditDeviceCtrl', ['$scope', '$resource', '$location', '$routeParams',
    function($scope, $resource, $location, $routeParams) {
        var deviceToEdit = $resource('/api/homesensors/:id', {
            id: '@_id'
        }, {
            update: {
                method: 'PUT'
            }
        });
        deviceToEdit.get({
            id: $routeParams.id
        }, function(device) {
            $scope.deviceToEdit = device;
        });
        $scope.save = function() {
            deviceToEdit.update($scope.deviceToEdit, function() {
                $location.path('/');
            });
        }
    }
]);
app.controller('DeleteDeviceCtrl', ['$scope', '$resource', '$location', '$routeParams',
    function($scope, $resource, $location, $routeParams) {
        var deviceToDelete = $resource('/api/homesensors/:id');
        deviceToDelete.get({
            id: $routeParams.id
        }, function(device) {
            $scope.deviceToDelete = device;
        })
        $scope.delete = function() {
            deviceToDelete.delete({
                id: $routeParams.id
            }, function(device) {
                $location.path('/');
            });
        }
    }
]);
app.controller('CommissionDeviceCtrl', ['$scope', '$resource', '$location', '$routeParams', '$window',
    function($scope, $resource, $location, $routeParams) {
        var deviceToCommission = $resource('/api/homesensors/');
        $scope.statusMessage = "Please press the commissioning button on the XBee device.";
        $scope.statusBackgroundColor = 'red';
        $scope.statusForegroundColor = 'black';
        if (typeof(EventSource) !== "undefined") {
            //console.log("Events supported");
            //sse.onmessage = function(event, data) {
            sse.addEventListener("NI", function(event) {
                // console.log(eventName);
                $scope.statusMessage = "Device Found. Configure the device and hit save."
                $scope.statusForegroundColor = 'green';
                $scope.deviceToCommission = JSON.parse(event.data);
                $scope.$apply();
                console.log($scope.deviceToCommission);
            });
            sse.addEventListener("IORX", function(event) {
               // console.log(eventName);
                $scope.statusMessage = "Data emitted";
                var deviceIOData = JSON.parse(event.data);
                console.log(deviceIOData);
                //console.log(deviceData.address64 + " ref=" );


  
             
                if ( typeof $scope.deviceToCommission != 'undefined' && deviceIOData.address64 ==  $scope.deviceToCommission.address64) {
     
                    $scope.deviceIOData = deviceIOData ; 
                    //onsole.log("supply = " + $scope.deviceIOData.analogSamples.SUPPLY);
                    $scope.$apply();
                }
                $scope.statusForegroundColor = 'green';


             
                // $scope.deviceToCommission = JSON.parse(event.data);
                //$scope.$apply();
                //console.log($scope.deviceToCommission);
            });
        } else {
            console.log("events not supported");
        }
        $scope.save = function() {
            console.log($scope.deviceToCommission);
            $scope.deviceToCommission.status.commissionedTimestamp = new Date().toJSON();
            //$scope.deviceToCommission.status.commissionedTimestamp = new Date().toJSON();
            deviceToCommission.save($scope.deviceToCommission, function(status) {
                //$location.path('/');
                //console.log(status);
                $scope.statusMessage = status.message;
            });
        }
        //       deviceToCommission.query(function(aDeviceToCommission){
        //    $scope.deviceToCommission = aDeviceToCommission;
        //$window.alert('aDeviceToCommission');
        //});
        /*
                deviceToEdit.get({ id: $routeParams.id }, function(device){
                    $scope.deviceToEdit = device;
                    $scope.message = "init";
                });

        */
    }
]);