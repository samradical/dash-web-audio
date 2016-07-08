var simpleWebAudioPlayer = function() {
  "use strict";

  var player = {},
    sounds = [],
    ctx,
    masterGain;

  player.load = function(c, callback) {
    var request;
    ctx = c
    var sound = { name: "t", src: "https://storage.googleapis.com/samrad-deriveur/assets/speaking/loc0/dorissound/Doriseternalsnowfall.mp3" }
    sounds[sound.name] = sound;

    // Load the sound
    request = new window.XMLHttpRequest();
    request.open("get", sound.src, true);
    request.responseType = "arraybuffer";
    request.onload = function() {
      ctx.decodeAudioData(request.response, function(buffer) {
        sounds[sound.name].buffer = buffer;
        callback(sounds[sound.name])
      });
    };
    request.send();
  };

  return player;
};

export default simpleWebAudioPlayer
