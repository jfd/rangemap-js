
if (typeof exports === 'object' && typeof define !== 'function') {
  var define = function (factory) {
    factory(require, exports, module);
  };
} else if (typeof define !== 'function') {
  var define = function (factory) {
    factory(null, this, null);
  };
}

define(function (require, exports, module) {

'use strict';


exports.RangeMap              = RangeMap;
exports.RangeMapSegment       = RangeMapSegment;



function RangeMap (start, end, opts) {
  
  if (arguments.length == 1) {
    if (typeof start !== 'number') {
      throw new Error('Expected number for first argument');
    }
    end = start - 1;
    start = 0;
  } else if (arguments.length == 2 && typeof end !== 'number') {
    opts = end;
    end = start - 1;
    start = 0;
  }

  opts = opts || {};

  this.start = 0;
  this.end = 0;
  this.length = 0;
  this.unallocated = 0;
  this.segments = 0;
  this.useAllocPool = opts.useAllocPool || false;
  this.defragAfterClear = opts.defragAfterClear || false;
  this._root = null;

  this.init(start, end);
}


RangeMap.prototype.init = function (start, end) {

  if (this._root) {
    throw new Error('RangeMap is already initialized');
  }

  if (start >= end) {
    throw new RangeError('Invalid "start" and/or "end"');
  }

  this.start = start;
  this.end = end;
  this.length = (end - start) + 1;
  this.unallocated = this.length;
  this.segments = 1;
  this._root = RangeMapSegment.create(start, this.length, this.useAllocPool);
};


RangeMap.prototype.alloc = function (length, value) {
  var obj = this._root;
  var result = [];
  var count = length;
  var obj2;

  if (value == void(0) || value === null) {
    throw new Error('Value cannot be null');
  }

  if (length > this.unallocated) {
    throw new Error('Unable to allocate, out of free ranges');
  }

  do {

    if (obj.value !== null) {
      continue;
    }

    if (count == obj.length) {
      obj.value = value;
      result.push(obj);
      break;
    }

    if (count < obj.length) {
      obj = this._subseg(obj, count);
      obj.value = value;
      result.push(obj);
      break;
    }

    count -= obj.length;
    obj2 = obj;

    while ((obj2 = obj2._next) && obj2.value === null) {
      if (count == obj2.length) {
        obj = this._merge(obj, obj2);
        count = 0;
      } else if (count < obj2.length) {
        obj2 = this._subseg(obj2, count);
        obj = this._merge(obj, obj2);
      } else {
        count -= obj2.length;
        obj = this._merge(obj, obj2);
      }
    }

    obj.value = value;
    result.push(obj);

  } while (count > 0 && (obj = obj._next));

  this.unallocated -= length;

  return result;
};


RangeMap.prototype.dealloc = function (value) {
  var obj;
  var unallocs;

  if (value == void(0) || value === null) {
    throw new Error('Value cannot be null');
  }

  obj = this._root;
  unallocs = 0;

  do {
    if (obj.value === value) {
      unallocs += obj.length;
      obj.value = null;
    }
  } while ((obj = obj._next));

  this.unallocated += unallocs;

  return unallocs;
};


RangeMap.prototype.clear = function (start, end) {
  var unallocs;
  var obj;
  var last;

  if (typeof end == 'undefined') {
    end = this.end;
  }

  if (start < this.start || end > this.end) {
    throw new RangeError('Index out of range');
  }

  if (end - start + 1 == 0) {
    return;
  }

  if (end - start + 1 < 0) {
    throw new RangeError('Invalid range');
  }

  obj = this._root;

  unallocs = 0;

  do {

    if (obj.end < start) {
      continue;
    }

    if (obj.start > end) {
      break;
    }

    switch (true) {

      case start <= obj.start && end >= obj.end:
      break;

      case start > obj.start && end <= obj.end:
      obj = this._subsegment(obj, start, end);
      break;

      case start > obj.start && end > obj.end:
      obj = this._subsegment(obj, start);
      break;

      case start < obj.start && end < obj.end:
      obj = this._subsegment(obj, obj.start, end);
      break;

      default:
      throw new Error("Fall back to DEFAULT");
      break;
    }

    if (obj.value !== null) {
      unallocs += obj.length;
      obj.value = null;
      last = obj;
    }

  } while ((obj = obj._next));


  if (this.defragAfterClear && (obj = last)) {
    while ((obj = obj._prev) && obj.value === null) {
      obj = this._merge(obj, obj._next);
    }
    while ((obj = last._next) && obj.value === null) {
      obj = this._merge(last, obj);
    }
  }

  this.unallocated += unallocs;

  return unallocs;
};


RangeMap.prototype.validateRange = function (value, start, end) {
  var obj;

  if (typeof end == void(0)) {
    end = this.end;
  }

  if (start < this.start || end > this.end || this.start > this.end) {
    throw new RangeError('Index out of range');
  }

  obj = this._root;

  do {
    if (obj.start >= start &&
        obj.start <= end &&
        value !== obj.value) {
      return false;
    }
  } while ((obj = obj._next));

  return true;
};


RangeMap.prototype.getValue = function (pos) {
  var obj = this._root;

  if (pos < this.start || pos > this.end) {
    throw new RangeError('Index out of bounds');
  }
  
  do {
    if (pos >= obj.start && pos <= obj.end) {
      return obj.value;
    }
  } while ((obj = obj._next));

};


RangeMap.prototype.getSegmentsByValue = function (value) {
  var obj = this._root;
  var result = [];
  
  do {
    if (obj.value == value) {
      result.push(obj);
    }
  } while ((obj = obj._next));

  return result;
};


RangeMap.prototype.destroy = function () {
  var obj = this._root;
  var nxt;

  if (!obj) {
    throw new Error('RangeMap is already destroyed');
  }

  do {
    nxt = obj._next;
    RangeMapSegment.free(obj, this.useAllocPool);
  } while (nxt && (obj = nxt));

  this._root = null;

  this.start = 0;
  this.end = 0;
  this.length = 0;
  this.unallocated = 0;
  this.segments = 0;
};


RangeMap.prototype.toJSON = function () {
  var obj = this._root;
  var objects;
  var nxt;

  if (!obj) {
    throw new Error('RangeMap is already destroyed');
  }

  objects = [];

  do {
    objects.push(obj.toJSON());
  } while ((obj = obj._next));

  return { start:   this.start,
           end:     this.end,
           objects: objects };
};


RangeMap.prototype.toString = function () {
  var v = this.value === null ? 'null' : this.value.toString();
  return '<RangeMap' + ' start=' + this.start + ',' +
                       ' end=' + this.end + ',' +
                       ' length=' + this.length + ',' +
                       ' unallocated=' + this.unallocated + ',' +
                       ' segments=' + this.segments + ',' +
                       ' value=' + v + '>';
};


RangeMap.prototype._subseg = function (obja, length) {
  var objb;

  objb = RangeMapSegment.create(obja.start, length, this.useAllocPool);
  obja.start = objb.end + 1;
  obja._decrlen(length);

  objb.value = obja.value;

  if (obja._prev) {
    objb._prev = obja._prev;
    objb._prev._next = objb;
  }

  objb._next = obja;
  obja._prev = objb;

  if (obja == this._root) {
    this._root = objb;
  }

  this.segments++;

  return objb;
};


RangeMap.prototype._subsegment = function (obja, start, end) {
  var objb;
  var objc;
  var len;

  if (arguments.length == 1) {
    return obja;
  }

  if (arguments.length == 2) {
    end = obja.end;
  }

  len = end - start + 1;

  if (len <= 0) {
    throw new RangeError('Index out of bounds');
  }

  if (start == obja.start) {
    return this._subseg(obja, len);
  }

  if (end == obja.end) {
    objb = RangeMapSegment.create(start, len, this.useAllocPool);
    obja._decrlen(len);
    objb.value = obja.value;
    if (obja._next) {
      obja._next._prev = objb;
      objb._next = obja._next;
    }
    objb._prev = obja;
    obja._next = objb;
    this.segments++;
    return objb;
  }

  objb = RangeMapSegment.create(start, len, this.useAllocPool);
  objc = RangeMapSegment.create(start + len, (obja.end - objb.end), this.useAllocPool);

  objc._prev = objb;
  objc._next = obja._next;

  objb._prev = obja;
  objb._next = objc;

  obja._next = objb;
  obja._decrlen(objb.length + objc.length);

  objb.value = objc.value = obja.value;

  this.segments += 2;

  return objb;
};


RangeMap.prototype._merge = function (obja, objb) {
  obja._incrlen(objb.length);
  obja._next = objb._next;
  RangeMapSegment.free(objb, this.useAllocPool);
  this.segments--;
  return obja;
};


function RangeMapSegment () {
  this.start = 0;
  this.length = 0;
  this.end = 0;
  this.value = null;

  this._next = null;
  this._prev = null;

  this._nextfree = null;
  this._lastfree = null;
}


RangeMapSegment._poolCount = 0;
RangeMapSegment._poolNext = null;
RangeMapSegment.poolMaxObjects = 1000;


RangeMapSegment.create = function (start, length, usepool) {
  var obj;
  var nxt;

  if (typeof start == 'undefined' || start === null ||
      typeof length == 'undefined' || length == null) {
    throw new RangeError('Both "start" and "length" must be set');
  }

  if (length < 0) {
    throw new Error('Property "length" must be a positive integer');
  }

  if (!usepool || (obj = RangeMapSegment._poolNext) == null) {
    obj = new RangeMapSegment();
  } else {
    if ((nxt = obj._nextfree)) {
      nxt._lastfree = obj._lastFree;
    }

    RangeMapSegment._poolCount--;
    RangeMapSegment._poolNext = nxt;

    obj._nextfree = null;
    obj._lastfree = null;
  }

  obj.start = start;
  obj.length = length;
  obj.end = start + length - 1;
  
  return obj;
};


RangeMapSegment.free = function (obj, nocache) {
  var nxt;
  var last;

  if (!nocache && RangeMapSegment._poolCount < RangeMapSegment.poolMaxObjects) {
    obj.start = 0;
    obj.length = 0;
    obj.end = 0;
    obj.value = null;
    obj._next = null;
    obj._prev = null;

    if ((nxt = RangeMapSegment._poolNext)) {
      if ((last = nxt._lastFree)) {
        last._nextfree = obj;
      } else {
        nxt._nextfree = obj;
      }
      nxt._lastFree = obj;
    } else {
      RangeMapSegment._poolNext = obj;
    }

    RangeMapSegment._poolCount++;
  }
};


RangeMapSegment.prototype._setlen = function (len) {
  this.length = len;
  this.end = this.start + this.length - 1;
};


RangeMapSegment.prototype._incrlen = function (len) {
  this.length += len;
  this.end = this.start + this.length - 1;
};


RangeMapSegment.prototype._decrlen = function (len) {
  this.length -= len;
  this.end = this.start + this.length - 1;
};


RangeMapSegment.prototype.toJSON = function () {
  return { start: this.start,
           end:   this.end,
           value: this.value };
};


RangeMapSegment.prototype.toString = function () {
  var v = this.value === null ? 'null' : this.value.toString();
  return '<RangeMapSegment' + ' start=' + this.start + ',' +
                              ' end=' + this.end + ',' +
                              ' length=' + this.length + ',' +
                              ' value=' + v + '>';
};

});