var expect = require('chai').expect;
var ext = require('../index.js');


describe('udp4', function(){

  it('exports an object', function(){
    expect(ext).to.be.a('object');
  });

  it('is an extension', function(){
    expect(ext.extend).to.be.a('function');
    expect(ext.name).to.be.equal('udp4');
  });

  it('extends a mock mesh', function(done){
    ext.extend({}, function(err, tp){
      expect(err).to.not.exist;
      expect(tp).to.be.a('object');
      expect(tp.path).to.be.a('function');
      expect(tp.paths).to.be.a('function');
      expect(tp.discovery).to.be.a('function');
      done();
    });
  });

  it('returns paths array', function(done){
    ext.extend({}, function(err, tp){
      expect(err).to.not.exist;
      expect(Array.isArray(tp.paths())).to.be.true;
      done();
    });
  });
  
  it('enables discovery', function(done){
    ext.extend({}, function(err, tp){
      expect(err).to.not.exist;
      tp.discovery({}, function(err){
        expect(err).to.not.exist;
        done();
      });
    });
  });
  
  it('skips unknown pipe', function(done){
    ext.extend({}, function(err, tp){
      expect(err).to.not.exist;
      tp.path(false, {}, function(pipe){
        expect(pipe).to.not.exist;
        done();
      });
    });
  });

  it('creates a pipe', function(done){
    ext.extend({}, function(err, tp){
      expect(err).to.not.exist;
      tp.path(false, {type:'udp4',ip:'127.0.0.1',port:42424}, function(pipe){
        expect(pipe).to.exist;
        done();
      });
    });
  });

})