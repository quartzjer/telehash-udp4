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

  // create the udp socket
  tp.server = dgram.createSocket('udp4', function(msg, rinfo){
    // get pipe
    // mesh.receive(packet,pipe)
//    self.receive(msg.toString("binary"), {type:"ipv4", ip:rinfo.address, port:rinfo.port});
  });

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
    return [{type:'test'}];
  };

  // enable discovery mode, broadcast this packet
  tp.discovery = function(packet, cbDisco){
    // TODO
    cbDisco();
  };

  // use config options or bind any/all
  tp.server.bind(args.port?args.port:exports.port, args.ip||exports.ip, function(err){
    if(err) telehash.log.error('udp4 bind error',err);
    cbExt(undefined, tp);
  });

}



exports.install = function(self, args)
{
  var paths = [];
  if(!args) args = {};
  if(args.port == 42420)
  {
    console.log("can't use reserved port 42420");
    return false;
  }

  function msgs(msg, rinfo){
    self.receive(msg.toString("binary"), {type:"ipv4", ip:rinfo.address, port:rinfo.port});
  }

  var server = dgram.createSocket("udp4", msgs);
  server.on("error", function(err){
    console.log("error from the UDP socket",err);
    process.exit(1);
  });

  self.deliver("ipv4",function(to,msg){
    var buf = Buffer.isBuffer(msg) ? msg : new Buffer(msg, "binary");
    server.send(buf, 0, buf.length, to.port, to.ip);    
  });

  self.wait(true);
  server.bind(args.port, "0.0.0.0", function(err){
    // regularly update w/ local ip address changes
    function interfaces()
    {
      var ifaces = os.networkInterfaces()
      var address = server.address();
      var paths2 = [];
      for (var dev in ifaces) {
        ifaces[dev].forEach(function(details){
          if(details.family != "IPv4") return;
          if(details.internal) return;
          var path = {type:"ipv4",ip:details.address,port:address.port};
          if(self.pathMatch(path,paths2)) return;
          paths2.push(path);
        });
      }
      paths2.forEach(function(path){
        var path1 = self.pathMatch(path,paths);
        // add new ones
        if(!path1) self.pathSet(path);
        // look for old missing ones to remove
        paths.splice(paths.indexOf(path1),1);
      });
      // leftovers gone
      paths.forEach(function(path){
        self.pathSet(path,true);
      });
      // for next time
      paths = paths2;
      setTimeout(interfaces,10000);
    }
    interfaces();

    if(!args.nolan)
    {
      self.deliver("lan",function(to,msg){
        var buf = Buffer.isBuffer(msg) ? msg : new Buffer(msg, "binary");
        // blast the packet out on the lan with a temp socket
        var lan = dgram.createSocket("udp4");
        lan.bind(server.address().port, "0.0.0.0", function(err){
          lan.setBroadcast(true);
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
                lan.send(buf, 0, buf.length, 42420, parts.join("."));
              }
            });
          }
          lan.send(buf, 0, buf.length, 42420, "239.42.42.42", function(){
            lan.close();
          });
        });    
      });    

      // start the lan * listener
      var lan = dgram.createSocket("udp4", msgs);
      lan.bind(42420, "0.0.0.0", function(err){
        lan.setMulticastLoopback(true)
        lan.addMembership("239.42.42.42");
        lan.setBroadcast(true);
      });
    }
    
    // enables online()
    self.wait(false);
  });

}

