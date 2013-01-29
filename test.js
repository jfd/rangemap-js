
'use strict';


var deepEqual                 = require('assert').deepEqual;
var equal                     = require('assert').equal;
var ok                        = require('assert').ok;
var throws                    = require('assert').throws;

var RangeMap                  = require('./rangemap').RangeMap;
var RangeMapSegment           = require('./rangemap').RangeMapSegment;




function testAlloc () {
  var map = new RangeMap(0xffff);
  var iroot = map._root;
  var rnga;
  var rngb;
  var rngc;
  var rngd;

  throws(function () {
    map.init(0, 1);
  }, /initialized/);

  equal(map.start, 0);
  equal(map.end, 0xffff - 1);
  equal(map.length, 0xffff);
  equal(map.unallocated, 0xffff);
  equal(map.segments, 1);

  rnga = map.alloc(1000, 'a')[0];
  equal(rnga instanceof RangeMapSegment, true);
  equal(rnga.value, 'a');
  equal(rnga._next, iroot);
  equal(rnga._prev, null);
  equal(rnga.length, 1000);
  equal(rnga.end, 1000 - 1);

  equal(map.unallocated, 0xffff - 1000);
  equal(map.segments, 2);

  rngb = map.alloc(1000, 'b')[0];
  equal(rngb instanceof RangeMapSegment, true);
  equal(rngb.value, 'b');
  equal(rngb._next, iroot);
  equal(rngb._prev, rnga);
  equal(rngb.length, 1000);
  equal(rngb.end, 2000 - 1);

  equal(map.unallocated, 0xffff - 2000);
  equal(map.segments, 3);

  rngc = map.alloc(1000, 'c')[0];
  equal(rngc instanceof RangeMapSegment, true);
  equal(rngc.value, 'c');
  equal(rngc._next, iroot);
  equal(rngc._prev, rngb);
  equal(rngc.length, 1000);
  equal(rngc.end, 3000 - 1);

  equal(map.unallocated, 0xffff - 3000);
  equal(map.segments, 4);

  rngd = map.alloc(0xffff - 3000, 'd')[0];
  equal(rngd instanceof RangeMapSegment, true);
  equal(rngd.value, 'd');
  equal(rngd._next, null);
  equal(rngd._prev, rngc);
  equal(rngd.length, 0xffff - 3000);
  equal(rngd.end, 0xffff - 1);

  equal(map.unallocated, 0);
  equal(map.segments, 4);

  equal(rnga._next, rngb);
  equal(rngb._next, rngc);
  equal(rngc._next, rngd);

  throws(function () {
    var rng = map.alloc(100000, "error");
  }, /out of free ranges/);

  checkConsistency(map);

  map.destroy();

  equal(map.start, 0);
  equal(map.end, 0);
  equal(map.length, 0);
  equal(map.unallocated, 0);
  equal(map.segments, 0);
  equal(map._root, null);

  throws(function () {
    map.alloc(100000, "error");
  }, /out of free ranges/);
}


function testMidRangeAlloc () {
  var map = new RangeMap(0x1111, 0xeeee);
  var iroot = map._root;
  var rnga;
  var rngb;
  var rngc;
  var rngd;

  equal(map.start, 0x1111);
  equal(map.end, 0xeeee);
  equal(map.length, 0xdddd + 1);
  equal(map.unallocated, 0xdddd + 1);
  equal(map.segments, 1);

  rnga = map.alloc(1000, 'a')[0];
  equal(rnga instanceof RangeMapSegment, true);
  equal(rnga._next, iroot);
  equal(rnga.value, 'a');
  equal(rnga._prev, null);
  equal(rnga.length, 1000);
  equal(rnga.start, 0x1111);
  equal(rnga.end, 0x1111 + 1000 - 1);

  equal(map.unallocated, 0xdddd + 1 - 1000);
  equal(map.segments, 2);

  rngb = map.alloc(1000, 'b')[0];
  equal(rngb instanceof RangeMapSegment, true);
  equal(rngb._next, iroot);
  equal(rngb.value, 'b');
  equal(rngb._prev, rnga);
  equal(rngb.start, 0x1111 + 1000);
  equal(rngb.length, 1000);
  equal(rngb.end, 0x1111 + 2000 - 1);

  checkConsistency(map);

  map.destroy();

  equal(map.start, 0);
  equal(map.end, 0);
  equal(map.length, 0);
  equal(map.unallocated, 0);
  equal(map.segments, 0);
  equal(map._root, null);

  throws(function () {
    map.alloc(100000, "error");
  }, /out of free ranges/);
}


function testNegativeRangeAlloc () {
  var map = new RangeMap(-2000, 1999);
  var iroot = map._root;
  var rnga;
  var rngb;
  var rngc;
  var rngd;

  equal(map.start, -2000);
  equal(map.end, 1999);
  equal(map.length, 4000);
  equal(map.unallocated, 4000);
  equal(map.segments, 1);

  rnga = map.alloc(1000, 'a')[0];
  equal(rnga instanceof RangeMapSegment, true);
  equal(rnga.value, 'a');
  equal(rnga._next, iroot);
  equal(rnga._prev, null);
  equal(rnga.length, 1000);
  equal(rnga.start, -2000);
  equal(rnga.end, -1001);

  equal(map.unallocated, 3000);
  equal(map.segments, 2);

  rngb = map.alloc(1000, 'b')[0];
  equal(rngb instanceof RangeMapSegment, true);
  equal(rngb.value, 'b');
  equal(rngb._next, iroot);
  equal(rngb._prev, rnga);
  equal(rngb.length, 1000);
  equal(rngb.start, -1000);
  equal(rngb.end, -1);

  checkConsistency(map);

  map.destroy();

  equal(map.start, 0);
  equal(map.end, 0);
  equal(map.length, 0);
  equal(map.unallocated, 0);
  equal(map.segments, 0);
  equal(map._root, null);

  throws(function () {
    map.alloc(100000, "error");
  }, /out of free ranges/);

}


function testGetValue () {
  var map = new RangeMap(1000);

  map.alloc(1000 / 2, 'a');
  map.alloc(1000 / 2, 'b');

  equal(map.getValue(499), 'a');
  equal(map.getValue(500), 'b');

  throws(function () {
    map.getValue(1000);
  }, /out of/);

  map.destroy();
}


function testGetSegmentsByValue () {
  var map = new RangeMap(101);

  map.alloc(10, 'a');
  map.alloc(10, 'b');
  map.alloc(10, 'a');
  map.alloc(10, 'b');
  map.alloc(10, 'a');
  map.alloc(10, 'b');
  map.alloc(10, 'a');
  map.alloc(10, 'b');
  map.alloc(10, 'a');
  map.alloc(10, 'b');

  equal(map.getSegmentsByValue('a').length, 5);
  equal(map.getSegmentsByValue('b').length, 5);
  equal(map.getSegmentsByValue(null).length, 1);

  checkConsistency(map);

  map.destroy();
}


function testDealloc () {
  var map = new RangeMap(101);

  map.alloc(10, 'a');
  map.alloc(10, 'b');
  map.alloc(10, 'a');
  map.alloc(10, 'b');
  map.alloc(10, 'a');
  map.alloc(10, 'b');
  map.alloc(10, 'a');
  map.alloc(10, 'b');
  map.alloc(10, 'a');
  map.alloc(10, 'b');

  equal(map.dealloc('a'), 50);
  equal(map.dealloc('b'), 50);
  equal(map.segments, 11);

  equal(map.getSegmentsByValue('a').length, 0);
  equal(map.getSegmentsByValue('b').length, 0);
  equal(map.getSegmentsByValue(null).length, 11);

  checkConsistency(map);

  map.destroy();
}


function testClearNoDefrag () {
  var map = new RangeMap(0xffff);

  map.alloc(1000, 1);
  map.alloc(1000, 2);
  map.alloc(0xffff-2000, 3);

  equal(map.clear(1500, 4600, true), 4600 - 1500 + 1);
  equal(map.clear(4580, 4601, true), 1);
  equal(map.clear(8000, 8000, true), 1);

  equal(map.segments, 9);

  checkConsistency(map);

  map.destroy();

  map = new RangeMap(0xffff);

  map.alloc(0xaaaa, 'a');

  equal(map.clear(0, 0xaaaa - 1), 0xaaaa);
  equal(map.segments, 2);

  checkConsistency(map);

  map.destroy();

}

function testClearDefrag () {
  var map = new RangeMap(0xffff, { defragAfterClear: true });

  equal(map.defragAfterClear, true);

  map.alloc(1000, 'a');
  map.alloc(1000, 'b');
  map.alloc(0xffff-2000, 'c');

  equal(map.clear(1500, 4600), 4600 - 1500 + 1);
  equal(map.clear(4580, 4601), 1);
  equal(map.clear(8000, 8000), 1);

  equal(map.segments, 6);

  checkConsistency(map);

  map.destroy();
  
  map = new RangeMap(0xffff, { defragAfterClear: true });
  
  map.alloc(0xaaaa, 'a');
  
  equal(map.clear(0, 0xaaaa - 1), 0xaaaa);
  equal(map.segments, 1);
  
  checkConsistency(map);
  
  map.destroy();
}


function testValidateRange () {
  var map = new RangeMap(101);

  map.alloc(10, 'a');
  map.alloc(10, 'b');

  equal(map.validateRange('a', 0, 9), true);
  equal(map.validateRange('a', 0, 10), false);
  equal(map.validateRange('b', 10, 19), true);
  equal(map.validateRange('b', 10, 20), false);
  equal(map.validateRange(null, 10, 20), false);
  equal(map.validateRange(null, 21), true);

  map.destroy();
}


function testToJSON () {
  var map = new RangeMap(101);
  var obj;

  map.alloc(10, 'a');

  obj = map.getSegmentsByValue('a')[0];

  deepEqual(obj.toJSON(), { start: 0, end: 9, value: 'a' });
  deepEqual(JSON.parse(JSON.stringify(obj)), { start: 0, end: 9, value: 'a' }); 

  deepEqual(map.toJSON(), { start: 0, end: 100, objects: [{ start: 0, end: 9, value: 'a' }, { start: 10, end: 100, value: null }]});
  deepEqual(JSON.parse(JSON.stringify(map)), { start: 0, end: 100, objects: [{ start: 0, end: 9, value: 'a' }, { start: 10, end: 100, value: null }]});
}


function printNodes (map) {
  var n = map._root;
  do {
    console.log(n.toString());
  } while ((n = n._next));
}


function checkConsistency (map) {
  var node;
  var len;
  var pos;
  var free;

  node = map._root;
  pos = map.start;
  len = 0;
  free = 0;

  do {
    equal(node.start, pos);
    equal(node.end, node.start + node.length - 1);
    len += node.length;
    if (node.value == null) {
      free += node.length;
    }
    pos = node.end + 1;
  } while ((node = node._next));

  equal(map.length, len);
  equal(map.unallocated, free);
}


function test () {

  equal(RangeMap instanceof Function, true);
  equal(RangeMapSegment instanceof Function, true);

  testAlloc();
  testMidRangeAlloc();
  testNegativeRangeAlloc();
  testGetValue();
  testGetSegmentsByValue();
  testDealloc();
  testValidateRange();
  testClearNoDefrag();
  testClearDefrag();
  testToJSON();
}


if (process.mainModule == module) {
  test();
}