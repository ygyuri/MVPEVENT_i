// Simple indirection to access broadcast from routes without circular requires
let broadcastUpdate;
function setBroadcast(fn) { broadcastUpdate = fn; }
module.exports = { setBroadcast, broadcastUpdate };


