
var expect = require('chai').expect;
var recursive = require('recursive-readdir');
var FolderPatch = require('../src/folderpatch');

describe('#createComparePairs', function() {
  var expected = [{a:'a', b: null}, 
                  {a:'b', b: 'b'}, 
                  {a:null,  b: 'c'},
                  {a:null,  b: 'd'}]
  it('compareRightFiles', function(done) {
     var idx = 0;
     FolderPatch.createComparePairs(['a', 'b'], ['b', 'c', 'd'], function (a, b){
        expect(a).to.be.equal(expected[idx].a);
        expect(b).to.be.equal(expected[idx].b);
        idx++;
     });
     done();
  });
 
});