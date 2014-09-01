var expect = require('chai').expect;
var tp = require('../index.js');


describe('udp4', function(){

  it('exports an object', function(){
    expect(tp).to.be.a('object');
  });

  it('exports required methods', function(){
    expect(tp.path).to.be.a('function');
    expect(tp.paths).to.be.a('function');
    expect(tp.discovery).to.be.a('function');
    expect(tp.deliver).to.be.a('function');
  });

  it('returns paths array', function(){
    expect(Array.isArray(tp.paths())).to.be.true;
  });
  
  it('initializes', function(done){
    tp.deliver(function(){}, function(err){
      expect(err).to.not.exist;
      done();
    });
  });

  it('enables discovery', function(done){
    tp.discovery({}, function(err){
      expect(err).to.not.exist;
      done();
    });
  });
  
  it('skips unknown pipe', function(done){
    tp.path({}, function(pipe){
      expect(pipe).to.not.exist;
      done();
    });
  });

  it('creates a pipe', function(done){
    tp.path({type:'udp4',ip:'127.0.0.1',port:42424}, function(pipe){
      expect(pipe).to.exist;
      done();
    });
  });

})