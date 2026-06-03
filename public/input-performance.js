(function () {
  var nativeAddEventListener = EventTarget.prototype.addEventListener;
  var debouncedListeners = new WeakMap();
  var MIN_INPUT_DELAY_MS = 16;

  function shouldDebounce(type, listener, options) {
    if (type !== 'input' || !listener) return false;
    if (options && typeof options === 'object' && options.ntImmediate === true) return false;
    return typeof listener === 'function' || (listener && typeof listener.handleEvent === 'function');
  }

  function wrapListener(listener) {
    if (debouncedListeners.has(listener)) return debouncedListeners.get(listener);

    var timer = 0;
    var lastEvent;
    var wrapped = function (event) {
      lastEvent = event;
      window.clearTimeout(timer);
      var target = this;
      timer = window.setTimeout(function () {
        if (typeof listener === 'function') {
          listener.call(target, lastEvent);
        } else {
          listener.handleEvent(lastEvent);
        }
      }, MIN_INPUT_DELAY_MS);
    };

    debouncedListeners.set(listener, wrapped);
    return wrapped;
  }

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    var effectiveListener = shouldDebounce(type, listener, options) ? wrapListener(listener) : listener;
    return nativeAddEventListener.call(this, type, effectiveListener, options);
  };

  window.NovaToolsInputPerformance = {
    minInputDelayMs: MIN_INPUT_DELAY_MS
  };
}());
