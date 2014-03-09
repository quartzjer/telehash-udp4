var dgram = require("dgram");
var os = require("os");

exports.install = function(self, args)
{
  if(!args) args = {};
  if(args.port == 42420)
  {
    console.log("can't use reserved port 42420");
    return false;
  }

  function msgs(msg, rinfo){
    self.receive(msg.toString("binary"), {type:"ipv4", ip:rinfo.address, port:rinfo.port});
  }

  var server = dgram.createSocket("udp4", msgs4);
  server.on("error", function(err){
    console.log("error from the UDP socket",err);
    process.exit(1);
  });

  self.deliver("ipv4",function(to,msg){
    var buf = Buffer.isBuffer(msg) ? msg : new Buffer(msg, "binary");
    server.send(buf, 0, buf.length, to.port, to.ip);    
  });

  var networkIP = "";
  server.bind(args.port, "0.0.0.0", function(err){
    // regularly update w/ local ip address changes
    function interfaces()
    {
      var ifaces = os.networkInterfaces()
      var address = server.address();
      for (var dev in ifaces) {
        ifaces[dev].forEach(function(details){
          // upgrade to actual interface ip, prefer local ones
          if(details.family == "IPv4" && !details.internal && self.isLocalIP(address.address)) address.address = details.address;
        });
      }
      networkIP = address.address; // used for local broadcasting
      // allow overridden lan4 ip address
      if(args.ip) address.address = args.ip;
      self.pathSet({type:"lan4",ip:address.address,port:address.port});
      setTimeout(interfaces,10000);
    }
    interfaces();

  });

  if(args.nolan) return true;

  self.deliver("lan",function(to,msg){
    var buf = Buffer.isBuffer(msg) ? msg : new Buffer(msg, "binary");
    // blast the packet out on the lan with a temp socket
    var lan = dgram.createSocket("udp4");
    lan.bind(server.address().port, "0.0.0.0", function(err){
      lan.setBroadcast(true);
      // brute force to common subnets and all
      if(networkIP)
      {
        var parts = networkIP.split(".");
        for(var i = 3; i >= 0; i--)
        {
          parts[i] = "255";
          lan.send(buf, 0, buf.length, 42420, parts.join("."));
        }          
      }
      lan.send(buf, 0, buf.length, 42420, "239.42.42.42", function(){
        lan.close();
      });
    });    
  });    

  // start the lan * listener
  var lan = dgram.createSocket("udp4", msgs4);
  lan.bind(42420, "0.0.0.0", function(err){
    lan.setMulticastLoopback(true)
    lan.addMembership("239.42.42.42");
    lan.setBroadcast(true);
  });
}

