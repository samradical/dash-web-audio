import $ from 'jquery';
import Q from 'bluebird';
import Player from './player';

console.log(AV);
const createAudioContext = require('ios-safe-audio-context')
let audioCtx, masterGain

var SERVER_BASE = "https://rad.wtf/chewb/"
var ID = "5XLaA8t0Fkw"
  //var ID = "3TQZ-2iMUR0"

var button = document.querySelector('button');

button.addEventListener('mouseup', () => {
  init()
})
button.addEventListener('touchend', () => {
  //init()
})

function init() {
  audioCtx = createAudioContext()
  masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  /*var p = new Player()
  p.load(audioCtx,(sound)=>{
    play(sound.buffer)
  })*/
  console.log(audioCtx);
  //start()
  entire()
}


function _createBuffer(buffer) {
  let _b = new Uint8Array(buffer)
  var channels = 2
  var frameCount = audioCtx.sampleRate * 10.007800454;
  var myArrayBuffer = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate);
  for (var channel = 0; channel < channels; channel++) {
    // This gives us the actual array that contains the data
    var nowBuffering = myArrayBuffer.getChannelData(channel);
    for (var i = 0; i < frameCount; i++) {
      // Math.random() is in [0; 1.0]
      // audio needs to be in [-1.0; 1.0]
      nowBuffering[i] = _b[i] / 255 * 2 - 1;
    }
  }
  return myArrayBuffer
}

function entire() {
  _getSidx().then(d => {
    d = d[0]

    var vo = {
      url: d.url,
      byteRange: '0-651250',
      byteLength: 651251
    }

    _addSegment(vo).then(indexB => {
      decodeAudioData(indexB).then(audioBuffer => {
        console.log(audioBuffer);
        //console.log(audioBuffer.getChannelData(0));
        console.log("Decoded");
        play(audioBuffer)
      }).error(err => {
        console.log(err);
        throw new Error()
      })
    })
  })
}


function start() {
  console.log("start");
  _getSidx().then(d => {
    d = d[0]
    console.log(d);
    var ref = d.sidx.references[3]
    var vo_index = {
      url: d.url,
      byteRange: d.indexRange,
      byteLength: d.sidx.firstOffset
    }

    var vo = {
      url: d.url,
      byteRange: ref.mediaRange,
      byteLength: ref.size
    }

    _addSegment(vo_index).then(indexB => {
      console.log("Got index arrayBuffer");
      _addSegment(vo).then(arrayB => {
        console.log("Got seg");
        var buffer = _appendBuffer(indexB, arrayB)
        console.log("Appended");

        let node = {
          buf: buffer,
          sync: 0,
          retry: 0
        }

        let b = new AV.Buffer(buffer)
        let a = new AV.Asset.fromBuffer(b)
        console.log(b);
        console.log(a);
        new AV.Player(a).play();
        //decode(node)
        /*decodeAudioData(buffer).then(audioBuffer => {
          console.log(audioBuffer);
          //console.log(audioBuffer.getChannelData(0));
          console.log("Decoded");
          play(audioBuffer)
        }).error(err => {
          console.log(err);
          throw new Error()
        })*/
      })
    })
  })
}


var _appendBuffer = function(buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

function _getSidx() {
  return new Q((resolve, reject) => {
    $.get(SERVER_BASE + 'getVideoSidx', {
      id: ID,
      audioonly: true
    }).then((data) => {
      if (data.status === 500) {
        reject(new Error(id, null));
      } else {
        resolve(data);
      }
    })
  })
}

function _addSegment(currentVo) {
  return new Q((resolve, reject) => {
    let formData = new FormData();
    formData.append('url', currentVo.url);
    formData.append('byteRange', currentVo.byteRange);
    formData.append('byteLength', currentVo.byteLength);

    let xhr = new XMLHttpRequest();
    xhr.open('POST', SERVER_BASE + 'getVideo', true);
    xhr.responseType = 'arraybuffer';
    xhr.send(formData);
    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState == xhr.DONE) {
        resolve(xhr.response)
      }
    });
  });
}


function syncStream(node) { // should be done by api itself. and hopefully will.
  var buf8 = new Uint8Array(node.buf);
  buf8.indexOf = Array.prototype.indexOf;
  var i = node.sync,
    b = buf8;
  while (1) {
    node.retry++;
    i = b.indexOf(0xFF, i);
    if (i == -1 || (b[i + 1] & 0xE0 == 0xE0)) break;
    i++;
  }
  if (i != -1) {
    var tmp = node.buf.slice(i); //carefull there it returns copy
    delete(node.buf);
    node.buf = null;
    node.buf = tmp;
    node.sync = i;
    return true;
  }
  return false;
}

function decodeAudioData(buffer) {
  console.log("trying decode of buffer with length: ", buffer.byteLength);
  return new Q((resolve, reject) => {
    audioCtx.decodeAudioData(buffer)
      .then((audioBuffer) => {
        resolve(audioBuffer)
      }, (err) => {
        console.log("Error");
        //reject(new Error(err))
      });
  });
}

function decode(node) {
  return new Q((resolve, reject) => {
    try {
      audioCtx.decodeAudioData(arrayBuffer).then(function(audioBuffer) {
        // Do something with the audioBuffer...
      }, function() {
        // Cry...
      });
      audioCtx.decodeAudioData(node.buf,
        function(decoded) {
          console.log("Success");
          node.source = audioCtx.createBufferSource();
          node.source.connect(audioCtx.destination);
          node.source.buffer = decoded;
          node.source.noteOn(0);
        },
        function() { // only on error attempt to sync on frame boundary
          console.log("fail");
          if (syncStream(node)) decode(node);
        });
    } catch (e) {
      log('decode exception', e.message);
    }
  });
}

function play(audioBuffer) {
  var source = audioCtx.createBufferSource();
  // set the buffer in the AudioBufferSourceNode
  source.buffer = audioBuffer;
  // connect the AudioBufferSourceNode to the
  // destination so we can hear the sound
  source.connect(masterGain);
  // start the source playing
  source.start(0);
  //source.noteOn(0);
}
