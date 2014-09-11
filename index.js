var dgram = require('dgram');
var os = require('os');
var telehash = require('telehash');
var lob = require('lob-enc');

exports.keepalive = 30*1000;
exports.name = 'udp4';
exports.port = 0;
exports.ip = '0.0.0.0';

// add our transport to this new mesh
exports.mesh = function(mesh, cbExt)
{
  var args = mesh.args||{};

  // TODO create socket stuff
  var tp = {pipes:{}};

  // generic handler to receive udp datagrams
  function receive(msg, rinfo){
    var packet = lob.decode(msg);
    if(!packet) return telehash.log.info('dropping invalid packet from',rinfo.address,msg.toString('hex'));
    tp.pipe(false, {type:'udp4',ip:rinfo.address,port:rinfo.port}, function(pipe){
      mesh.receive(packet, pipe);
    });
  }

  // create the udp socket
  tp.server = dgram.createSocket('udp4', receive);

  tp.server.on('error', function(err){
    telehash.log.error('udp4 socket fatal error',err);
  });

  // turn a path into a pipe
  tp.pipe = function(hn, path, cbPipe){
    if(typeof path != 'object' || path.type != 'udp4') return false;
    if(typeof path.ip != 'string' || typeof path.port != 'number') return false;
    var id = [path.ip,path.port].join(':');
    var pipe = tp.pipes[id];
    if(pipe) return cbPipe(pipe);
    pipe = new telehash.Pipe('udp4',exports.keepalive);
    tp.pipes[id] = pipe;
    pipe.id = id;
    pipe.path = path;
    pipe.onSend = function(packet){
      var buf = lob.encode(packet);
      server.send(buf, 0, buf.length, to.port, to.ip);
    }
    cbPipe(pipe);
  };

  // return our current addressible paths
  tp.paths = function(){
    var ifaces = os.networkInterfaces()
    var address = tp.server.address();
    var paths = [];
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details){
        if(details.family != "IPv4") return;
        if(details.internal) return;
        var path = {type:'udp4',ip:details.address,port:address.port};
        paths.push(path);
      });
    }
    return paths;
  };

  // enable discovery mode, broadcast this packet
  tp.discovery = function(packet, cbDisco){

    // start the lan * listener
    if(!tp.lan)
    {
      tp.lan = dgram.createSocket("udp4", receive);
      tp.lan.bind(42420, "0.0.0.0", function(err){
        if(err) return telehash.log.error('udp4 discovery bind error to 42420',err);
        tp.lan.setMulticastLoopback(true)
        tp.lan.addMembership("239.42.42.42");
        tp.lan.setBroadcast(true);
        tp.discovery(packet, cbDisco);
      });
      return;
    }

    // turn off discovery
    if(!packet)
    {
      tp.lan.close();
      tp.lan = false;
      return cbDisco();
    }

    var buf = lob.encode(packet);

    // blast the packet out on the lan with a temp socket
    var clone = dgram.createSocket("udp4");
    clone.bind(tp.server.address().port, "0.0.0.0", function(err){
      clone.setBroadcast(true);
      // brute force to common subnets and all
      var ifaces = os.networkInterfaces()
      for (var dev in ifaces) {
        ifaces[dev].forEach(function(details){
          if(details.family != "IPv4") return;
          if(details.internal) return;
          var parts = details.address.split(".");
          for(var i = 3; i >= 0; i--)
          {
            parts[i] = "255";
            clone.send(buf, 0, buf.length, 42420, parts.join("."));
          }
        });
      }
      clone.send(buf, 0, buf.length, 42420, "239.42.42.42", function(){
        clone.close();
        cbDisco();
      });
    });

  };

  // use config options or bind any/all
  tp.server.bind(args.port?args.port:exports.port, args.ip||exports.ip, function(err){
    if(err) telehash.log.error('udp4 bind error',err);
    cbExt(undefined, tp);
  });

}

