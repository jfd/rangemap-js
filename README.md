# rangemap.js

A memory efficient, garbage-collector-friendly, linked list for allocation of fixed-size, indexed ranges.


## Installation

Using `npm`:

    $ npm install rangemap


Using 'bower´:

    $ bower install rangemap


In your web project, include the file `rangemap.js`.

## Usage

In Node.js:

    var RangeMap = require('rangemap').RangeMap;
    var map = new RangeMap(0xffff);

In Webbrowser using an AMD loader:

    var RangeMap = require('rangemap').RangeMap;
    var map = new RangeMap(0xffff);

In Webbrowser without an AMD loader:

    <script src="rangemap.js"></script>
    <script>
      var map = new RangeMap(0xffff);
    </script>


## Class: RangeMap

A `RangeMap` has the following methods, members.

### new RangeMap(startOrLength, [end], [options])

* `startOrLength` The range start (if `end` is present) else
  length of the map (start is then set to 0). 
* `end` The range end.
* `options` {Object}
  * `useAllocPool` {Boolean} Use an object pool when creating new Segment object instances. Default=false
  * `defragAfterClear` {Boolean} De-frags (merges) empty (null) ranges after clear is issued.  Default=false

### rangemap.start

Represents the start position of the `RangeMap`.

### rangemap.end

Represents the end position of the `RangeMap`.

### rangemap.length

Represents the total number of indicies in the `RangeMap`.

### rangemap.unallocated

Represents the total number of unallocated indicies in the `RangeMap`.

### rangemap.ranges

Represents the total number of Range objects in the `RangeMap`.

### rangemap.useAllocPool

Indicates if the object pool is should be used when creating new `RangeMapSegment` object instances.

### rangemap.defragAfterClear

Indicates that segments should be de-fraged after the `clear` method is issued.

### rangemap.init(start, end)

* `start` {Number} The start of the range.
* `end` {Number} The end of the range.

The `RangeMap` class is automatically initialized in constructor, so no need to call `init` on a newly created RangeMap. The `init` can however after the `destroy` method is called.

### rangemap.alloc(length, value)

* `length` {Number} Number of inidices that should be allocated
* `value` {Object} A value associated with the range.
* return {[Segment]} An Array with `RangeMapSegment` instance's representing the newly allocated range.

Allocates a new range of size `length`. The `alloc` method tries to keep the allocation as little fragmented as possible, but there is now guarantee that the ranges is in one sequence.

### rangemap.dealloc(value)

* `value` {Object} A value associated with the range.
* return {Number} The number of unallocations that was made (null ranges are not included).

Deallocates all ranges of `value`.

### rangemap.clear(start, end)

* `start` {Number} The start position.
* `end` {Number} The end position.
* return {Number} The number of unallocations that was made (null ranges are not included).

Deallocates all segments between `start` and `end`, with a value.

### rangemap.validateRange(value, start, [end])

* `value` {Object} The value to validate against.
* `start` {Number} The start position.
* `end` {Number} The end position. Default=rangemap.end
* return {Boolean} `true` if defined range matches `value`, else `false`.

Validates that specified `value` is within defined range.

### rangemap.getValue(pos)

* `pos` {Number} The position in range
* return {Object} The `value` of specified `pos`.

Returns the `value` associated with specified `pos`.

### rangemap.getSegmentsByValue(value)

* `value` {Number} The `value` to find.
* return {Array} array with all matching range segments.

Finds all range segments of given `value`.

### rangemap.destroy()

Destroys the RangeMap instance and free's all range segments.


## Class: RangeMapSegment

A `RangeMapSegment`, which represents a seqment in a `RangeMap`, has the following methods, members.

### RangeMapSegment.poolMaxObjects

(static) Inidicates how many objects that should be stored in the allocation pool. Default=1000

### rangemapsegment.start

Represents the start position of the `RangeMapSegment`.

### rangemapsegment.end

Represents the end position of the `RangeMapSegment`.

### rangemapsegment.length

Represents the total number of indicies in the `RangeMapSegment`.

## Testing

There are a number of unit-tests in the package. The easiest way is to run the test suite via `npm` in the repository:

    $ npm test

## Browser compatibility

This library is compatible with all major browsers.

## Issues

Please report any issue on github: https://github.com/jfd/rangemap-js/issues

## License

RangeMap.js is licensed under the MIT license. See LICENSE in this repo for more information.


## Copyright

Copyright (c) 2013 Johan Dahlberg <http://jfd.github.com>