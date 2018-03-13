const net = require('net');
const FrameParser = require('./FrameHelpers/Parser');
const {composeFrame} = require('./FrameHelpers/compose');
const EE = require('events').EventEmitter;

const Client = function (socketFile) {
  let self = new EE();
  self._requests = [];
  let SOCKETFILE = process.env['XDG_RUNTIME_DIR'] + '/bdsd.sock';
  if (typeof socketFile === 'string') {
    SOCKETFILE = socketFile;
  }
  const socket = net.createConnection(SOCKETFILE);
  socket.on('connect', _ => {
    const frameParser = new FrameParser();
    frameParser.on('data', data => {
      try {
        const dataObject = JSON.parse(data.toString());
        const method = dataObject.method;
        switch (method) {
          case 'notify':
            switch (dataObject.payload) {
              case 'bus connected':
                self.emit('connect');
                break;
              case 'bus disconnected':
                self.emit('disconnect');
                break;
              default:
                break;
            }
            break;
          case 'cast value':
            self.emit('value', dataObject.payload);
            break;
          default:
            if (Object.prototype.hasOwnProperty.call(dataObject, 'response_id')) {
              // find resolve, reject cb by response_id
              const findByResponseId = t => t.request_id === dataObject.response_id;
              let requestIndex = self._requests.findIndex(findByResponseId);
              if (requestIndex >= 0) {
                // check success true/false then resolve/reject
                if (dataObject.success) {
                  self._requests[requestIndex].resolve(dataObject.payload);
                } else {
                  self._requests[requestIndex].reject(new Error(dataObject.error));
                }
                // delete request from list
                self._requests.splice(requestIndex, 1);
              }
            }
            break;
        }
      } catch (e) {
        console.log(e);
      }
    });
    socket.pipe(frameParser);
  });
  // now Client API
  self.getDatapoints = function () {
    return new Promise((resolve, reject) => {
      const request_id = Math.round(Math.random() * Date.now());
      const method = 'get datapoints';
      const data = {
        request_id: request_id,
        method: method,
      };
      self._sendDataFrame(JSON.stringify(data));
      self._requests.push({request_id: request_id, resolve: resolve, reject: reject});
    });
  };
  self.getDescription = function (id) {
    return new Promise((resolve, reject) => {
      if (typeof id === "undefined") {
        reject(new Error('Please specify datapoint id'));
      }
      const request_id = Math.round(Math.random() * Date.now());
      const method = 'get description';
      const payload = {id: id};
      const data = {
        request_id: request_id,
        method: method,
        payload: payload
      };
      self._sendDataFrame(JSON.stringify(data));
      self._requests.push({request_id: request_id, resolve: resolve, reject: reject});
    });
  };
  self.getValue = async function (id) {
    return new Promise((resolve, reject) => {
      if (typeof id === "undefined") {
        reject(new Error('Please specify datapoint id'));
      }
      const request_id = Math.round(Math.random() * Date.now());
      const method = 'get value';
      const payload = {id: id};
      const data = {
        request_id: request_id,
        method: method,
        payload: payload
      };
      self._sendDataFrame(JSON.stringify(data));
      self._requests.push({request_id: request_id, resolve: resolve, reject: reject});
    });
  };
  self.setValue = function (id, value) {
    return new Promise((resolve, reject) => {
      if (typeof id === "undefined") {
        reject(new Error('Please specify datapoint id'));
      }
      if (typeof value === "undefined") {
        reject(new Error('Please specify datapoint value'));
      }
      const request_id = Math.round(Math.random() * Date.now());
      const method = 'set value';
      const payload = {id: id, value: value};
      const data = {
        request_id: request_id,
        method: method,
        payload: payload
      };
      self._sendDataFrame(JSON.stringify(data));
      self._requests.push({request_id: request_id, resolve: resolve, reject: reject});
    });
  };
  self.readValue = function (id) {
    return new Promise((resolve, reject) => {
      if (typeof id === "undefined") {
        reject(new Error('Please specify datapoint id'));
      }
      const request_id = Math.round(Math.random() * Date.now());
      const method = 'read value';
      const payload = {id: id};
      const data = {
        request_id: request_id,
        method: method,
        payload: payload
      };
      self._sendDataFrame(JSON.stringify(data));
      self._requests.push({request_id: request_id, resolve: resolve, reject: reject});
    });
  };
  self.setProgrammingMode = function (value) {
    return new Promise((resolve, reject) => {
      if (typeof value === "undefined") {
        reject(new Error('Please specify mode value'));
      }
      const request_id = Math.round(Math.random() * Date.now());
      const method = 'programming mode';
      const payload = {value: value};
      const data = {
        request_id: request_id,
        method: method,
        payload: payload
      };
      self._sendDataFrame(JSON.stringify(data));
      self._requests.push({request_id: request_id, resolve: resolve, reject: reject});
    });
  };
  self._sendDataFrame = function (data) {
    const frame = composeFrame(data);
    return socket.write(frame);
  };
  return self;
};


module.exports = Client;
