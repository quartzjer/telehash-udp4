var expect = require('chai').expect;
var udp4 = require('../index.js');


describe('udp4', function(){

  it('export an object', function(){
    expect(udp4).to.be.a('object');
  })

})