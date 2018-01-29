const events = require('events');
const {EventEmitter} = events;
const path = require('path');
const url = require('url');
const {URL} = url;
const {performance} = require('perf_hooks');
const vm = require('vm');

const parse5 = require('parse5');

const fetch = require('window-fetch');
const {XMLHttpRequest} = require('xmlhttprequest');
const {Response, Blob} = fetch;
const WebSocket = require('ws/lib/websocket');
const {LocalStorage} = require('node-localstorage');
const WindowWorker = require('window-worker');
const THREE = require('./lib/three-min.js');

const windowSymbol = Symbol();
const setWindowSymbol = Symbol();

let id = 0;
const urls = new Map();
URL.createObjectURL = blob => {
  const url = 'blob:' + id++;
  urls.set(url, blob);
  return url;
};
URL.revokeObjectURL = blob => {
  urls.delete(url);
};

class MessageEvent {
  constructor(data) {
    this.data = data;
  }
}
const ImageData = (() => {
  if (typeof nativeImageData !== 'undefined') {
    return nativeImageData;
  } else {
    return class ImageData {
      constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(0);
      }
    };
  }
})();
const ImageBitmap = (() => {
  if (typeof nativeImageBitmap !== 'undefined') {
    return nativeImageBitmap;
  } else {
    class ImageBitmap {
      constructor(image) {
        this.width = image.width;
        this.height = image.height;
      }
    }
    ImageBitmap.createImageBitmap = image => new ImageBitmap(image.width, image.height);
    return ImageBitmap;
  }
})();
const Path2D = (() => {
  if (typeof nativePath2D !== 'undefined') {
    return nativePath2D;
  } else {
    return class Path2D {
      moveTo() {}
      lineTo() {}
      quadraticCurveTo() {}
    };
  }
})();
const CanvasRenderingContext2D = (() => {
  if (typeof nativeCanvasRenderingContext2d !== 'undefined') {
    return nativeCanvasRenderingContext2D;
  } else {
    return class CanvasRenderingContext2D {
      drawImage() {}
      fillRect() {}
      clearRect() {}
      fillText() {}
      stroke() {}
      scale() {}
      measureText() {
        return {width: 0};
      }
      createImageData(w, h) {
        return new ImageData(w, h);
      }
      getImageData(sx, sy, sw, sh) {
        return new ImageData(sw, sh);
      }
      putImageData() {}
    };
  }
})();
const WebGLContext = (() => {
  if (typeof nativeGl !== 'undefined') {
    return nativeGl;
  } else {
    const VERSION = Symbol();
    return class WebGLContext {
      get VERSION() {
        return VERSION;
      }
      getExtension() {
        return null;
      }
      getParameter(param) {
        if (param === VERSION) {
          return 'WebGL 1';
        } else {
          return null;
        }
      }
      createTexture() {}
      bindTexture() {}
      texParameteri() {}
      texImage2D() {}
      createProgram() {}
      createShader() {}
      shaderSource() {}
      compileShader() {}
      getShaderParameter() {}
      getShaderInfoLog() {
        return '';
      }
      attachShader() {}
      linkProgram() {}
      getProgramInfoLog() {
        return '';
      }
      getProgramParameter() {}
      deleteShader() {}
      clearColor() {}
      clearDepth() {}
      clearStencil() {}
      enable() {}
      disable() {}
      depthFunc() {}
      frontFace() {}
      cullFace() {}
      blendEquationSeparate() {}
      blendFuncSeparate() {}
      viewport() {}
    };
  }
})();
class VRFrameData {
  constructor() {
    this.leftProjectionMatrix = new Float32Array(16);
    this.leftViewMatrix = new Float32Array(16);
    this.rightProjectionMatrix = new Float32Array(16);
    this.rightViewMatrix = new Float32Array(16);
    this.pose = new VRPose();
  }
}
class VRPose {
  constructor(position = new Float32Array(3), orientation = new Float32Array(4)) {
    this.position = position;
    this.orientation = orientation;
  }

  set(position, orientation) {
    this.position[0] = position.x;
    this.position[1] = position.y;
    this.position[2] = position.z;

    this.orientation[0] = orientation.x;
    this.orientation[1] = orientation.y;
    this.orientation[2] = orientation.z;
    this.orientation[3] = orientation.w;
  }
}
const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
class VRDisplay {
  constructor(window) {
    this[windowSymbol] = window;

    this.isPresenting = false;
    this.capabilities = {
      canPresent: true,
      hasExternalDisplay: true,
      hasPosition: true,
      maxLayers: 1,
    };
    this.depthNear = 0.1;
    this.depthFar = 1000.0;
    this.stageParameters = {
      // new THREE.Matrix4().compose(new THREE.Vector3(0, 1.6, 0), new THREE.Quaternion(), new THREE.Vector3()).toArray(new Float32Array(16))
      sittingToStandingTransform: Float32Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.6, 0, 1]),
    };

    this._width = window.innerWidth / 2;
    this._height = window.innerHeight;
    this._viewMatrix = new Float32Array(16);
    this._projectionMatrix = new Float32Array(16);

    window.on('resize', () => {
      this._width = window.innerWidth / 2;
      this._height = window.innerHeight;
    });
    window.on('alignframe', (viewMatrix, projectionMatrix) => {
      this._viewMatrix.set(viewMatrix);
      this._projectionMatrix.set(projectionMatrix);
    });
  }

  getLayers() {
    return [
      {
        leftBounds: [0, 0, 0.5, 1],
        rightBounds: [0.5, 0, 0.5, 1],
        source: null,
      }
    ];
  }

  getEyeParameters(eye) {
    return {
      renderWidth: this._width,
      renderHeight: this._height,
    };
  }

  getFrameData(frameData) {
    const hmdMatrix = localMatrix.fromArray(this._viewMatrix);

    hmdMatrix.decompose(localVector, localQuaternion, localVector2);
    frameData.pose.set(localVector, localQuaternion);

    hmdMatrix.getInverse(hmdMatrix);

    localMatrix2.compose( // head to eye transform
      localVector.set(-0.02, 0, 0),
      localQuaternion.set(0, 0, 0, 1),
      localVector2.set(0, 0, 0),
    )
      .multiply(hmdMatrix)
      .toArray(frameData.leftViewMatrix);

    frameData.leftProjectionMatrix.set(this._projectionMatrix);

    localMatrix2.compose( // head to eye transform
      localVector.set(0.02, 0, 0),
      localQuaternion.set(0, 0, 0, 1),
      localVector2.set(0, 0, 0),
    )
      .multiply(hmdMatrix)
      .toArray(frameData.rightViewMatrix);

    frameData.rightProjectionMatrix.set(this._projectionMatrix);
  }

  requestPresent(sources) {
    this.isPresenting = true;

    process.nextTick(() => {
      this[windowSymbol].emit('vrdisplaypresentchange');
    });

    return Promise.resolve();
  }

  exitPresent() {
    this.isPresenting = false;

    process.nextTick(() => {
      this[windowSymbol].emit('vrdisplaypresentchange');
    });

    return Promise.resolve();
  }

  requestAnimationFrame(fn) {
    return window.requestAnimationFrame(fn);
  }

  cancelAnimationFrame(animationFrame) {
    return window.cancelAnimationFrame(animationFrame);
  }

  submitFrame() {}
}
class AudioNode {}
class AudioParam {
  constructor() {
    this.value = 0;
    this.minValue = 0;
    this.maxValue = 0;
    this.defaultValue = 0;
  }

  setValueAtTime() {}
}
class GainNode extends AudioNode {
  connect() {}
}
class AudioListener extends AudioNode {
  constructor() {
    super();

    this.positionX = new AudioParam();
    this.positionY = new AudioParam();
    this.positionZ = new AudioParam();
    this.forwardX = new AudioParam();
    this.forwardY = new AudioParam();
    this.forwardZ = new AudioParam();
    this.upX = new AudioParam();
    this.upY = new AudioParam();
    this.upZ = new AudioParam();
  }
}
class AudioContext {
  constructor() {
    this.listener = new AudioListener();
  }

  createGain() {
    return new GainNode();
  }
}

const exokit = (s = '', options = {}) => {
  options.url = options.url || 'http://127.0.0.1';
  options.dataPath = options.dataPath || __dirname;

  const baseUrl = options.url;
  const _normalizeUrl = src => new URL(src, baseUrl).href;
  const _parseAttributes = attrs => {
    const result = {};
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      result[attr.name] = attr.value;
    }
    return result;
  };
  const _formatAttributes = attributes => {
    const result = [];
    for (const name in attributes) {
      const value = attributes[name];
      result.push({
        name,
        value,
      });
    }
    return result;
  };
  const _parseStyle = styleString => {
    const style = {};
    const split = styleString.split(/;\s*/);
    for (let i = 0; i < split.length; i++) {
      const split2 = split[i].split(/:\s*/);
      if (split2.length === 2) {
        style[split2[0]] = split2[1];
      }
    }
    return style;
  };
  const _formatStyle = style => {
    let styleString = '';
    for (const k in style) {
      styleString += (styleString.length > 0 ? ' ' : '') + k + ': ' + style[k] + ';';
    }
    return styleString;
  };
  const _hash = s => {
    let result = 0;
    for (let i = 0; i < s.length; i++) {
      result += s.codePointAt(i);
    }
    return result;
  };

  class Node extends EventEmitter {
    constructor(nodeName = null) {
      super();

      this.nodeName = nodeName;
      this.parentNode = null;

      this[windowSymbol] = null;
    }

    [setWindowSymbol](window) {
      this[windowSymbol] = window;

      this.emit('window', window);
    }
  }
  Node.fromAST = (node, window, parentNode = null) => {
    if (node.nodeName === '#text') {
      const textNode = new TextNode(node.value);
      textNode.parentNode = parentNode;
      textNode[setWindowSymbol](window);
      return textNode;
    } else if (node.nodeName === '#comment') {
      const commentNode = new CommentNode(node.value);
      commentNode.parentNode = parentNode;
      commentNode[setWindowSymbol](window);
      return commentNode;
    } else {
      const element = new HTMLElement(
        node.tagName,
        node.attrs && _parseAttributes(node.attrs),
        node.value
      );
      element.parentNode = parentNode;
      element[setWindowSymbol](window);
      if (node.childNodes) {
        element.childNodes = node.childNodes.map(childNode => Node.fromAST(childNode, window, element));
      }
      return element;
    }
  };
  class HTMLElement extends Node {
    constructor(tagName = 'div', attributes = {}, value = '') {
      super(null);

      this.tagName = tagName;
      this.attributes = attributes;
      this.value = value;
      this.childNodes = [];

      this._innerHTML = '';
    }

    get attrs() {
      return _formatAttributes(this.attributes);
    }
    set attrs(attrs) {
      this.attributes = _parseAttributes(attrs);
    }

    get children() {
      return this.childNodes;
    }
    set children(children) {
      this.childNodes = children;
    }

    getAttribute(name) {
      return this.attributes[name];
    }
    setAttribute(name, value) {
      this.attributes[name] = value;

      this.emit('attribute', name, value);
    }

    appendChild(childNode) {
      this.childNodes.push(childNode);
      childNode.parentNode = this;
    }
    removeChild(childNode) {
      const index = this.childNodes.indexOf(childNode);
      if (index !== -1) {
        this.childNodes.splice(index, 1);
        childNode.parentNode = null;
      }
    }
    insertBefore(childNode, nextSibling) {
      const index = this.childNodes.indexOf(nextSibling);
      if (index !== -1) {
        this.childNodes.splice(index, 0, childNode);
        childNode.parentNode = this;
      }
    }
    insertAfter(childNode, nextSibling) {
      const index = this.childNodes.indexOf(nextSibling);
      if (index !== -1) {
        this.childNodes.splice(index + 1, 0, childNode);
        childNode.parentNode = this;
      }
    }

    getElementById(id) {
      return this.traverse(node => {
        if (
          (node.getAttribute && node.getAttribute('id') === id) ||
          (node.attrs && node.attrs.some(attr => attr.name === 'id' && attr.value === id))
        ) {
          return node;
        }
      });
    }
    getElementByClassName(className) {
      return this.traverse(node => {
        if (
          (node.getAttribute && node.getAttribute('class') === className) ||
          (node.attrs && node.attrs.some(attr => attr.name === 'class' && attr.value === className))
        ) {
          return node;
        }
      });
    }
    getElementByTagName(tagName) {
      return this.traverse(node => {
        if (node.tagName === tagName) {
          return node;
        }
      });
    }
    querySelector(selector) {
      let match;
      if (match = selector.match(/^#(.+)$/)) {
        return this.getElementById(match[1]);
      } else if (match = selector.match(/^\.(.+)$/)) {
        return this.getElementByClassName(match[1]);
      } else {
        return this.getElementByTagName(selector);
      }
    }
    getElementsById(id) {
      const result = [];
      this.traverse(node => {
        if (
          (node.getAttribute && node.getAttribute('id') === id) ||
          (node.attrs && node.attrs.some(attr => attr.name === 'id' && attr.value === id))
        ) {
          result.push(node);
        }
      });
      return result;
    }
    getElementsByClassName(className) {
      const result = [];
      this.traverse(node => {
        if (
          (node.getAttribute && node.getAttribute('class') === className) ||
          (node.attrs && node.attrs.some(attr => attr.name === 'class' && attr.value === className))
        ) {
          result.push(node);
        }
      });
      return result;
    }
    getElementsByTagName(tagName) {
      const result = [];
      this.traverse(node => {
        if (node.tagName === tagName) {
          result.push(node);
        }
      });
      return result;
    }
    querySelectorAll(selector) {
      let match;
      if (match = selector.match(/^#(.+)$/)) {
        return this.getElementsById(match[1]);
      } else if (match = selector.match(/^\.(.+)$/)) {
        return this.getElementsByClassName(match[1]);
      } else {
        return this.getElementsByTagName(selector);
      }
    }
    traverse(fn) {
      const _recurse = node => {
        const result = fn(node);
        if (result !== undefined) {
          return result;
        } else {
          if (node.childNodes) {
            for (let i = 0; i < node.childNodes.length; i++) {
              const result = _recurse(node.childNodes[i]);
              if (result !== undefined) {
                return result;
              }
            }
          }
        }
      };
      return _recurse(this);
    }

    addEventListener() {
      this.on.apply(this, arguments);
    }
    removeEventListener() {
      this.removeListener.apply(this, arguments);
    }

    get offsetWidth() {
      const style = _parseStyle(this.attributes['style'] || '');
      const fontFamily = style['font-family'];
      if (fontFamily) {
        return _hash(fontFamily) * _hash(this.innerHTML);
      } else {
        return 0;
      }
    }
    set offsetWidth(offsetWidth) {}
    get offsetHeight() {
      return 0;
    }
    set offsetHeight(offsetHeight) {}

    get className() {
      return this.attributes['class'] || '';
    }
    set className(className) {
      this.attributes['class'] = className;
    }

    get style() {
      const style = _parseStyle(this.attributes['style'] || '');
      Object.defineProperty(style, 'cssText', {
        get: () => this.attributes['style'],
        set: cssText => {
          this.attributes['style'] = cssText;
        },
      });
      return style;
    }
    set style(style) {
      this.attributes['style'] = _formatStyle(style);
    }

    get innerHTML() {
      return parse5.serialize(this);
    }
    set innerHTML(innerHTML) {
      const childNodes = parse5.parseFragment(innerHTML).childNodes.map(childNode => Node.fromAST(childNode, this[windowSymbol], this));
      this.childNodes = childNodes;

      _promiseSerial(childNodes.map(childNode => () => _runHtml(childNode, this[windowSymbol])))
        .catch(err => {
          console.warn(err);
        });

      this.emit('innerHTML', innerHTML);
    }
  }
  class HTMLAnchorElement extends HTMLElement {
    constructor(attributes = {}, value = '') {
      super('a', attributes, value);
    }

    get href() {
      return this.getAttribute('href') || '';
    }
    set href(value) {
      this.setAttribute('href', value);
    }
  }
  class HTMLLoadableElement extends HTMLElement {
    constructor(tagName) {
      super(tagName);
    }

    get onload() {
      return this.listeners('load')[0];
    }
    set onload(onload) {
      if (typeof onload === 'function') {
        this.addEventListener('load', onload);
      } else {
        const listeners = this.listeners('load');
        for (let i = 0; i < listeners.length; i++) {
          this.removeEventListener('load', listeners[i]);
        }
      }
    }

    get onerror() {
      return this.listeners('error')[0];
    }
    set onerror(onerror) {
      if (typeof onerror === 'function') {
        this.addEventListener('error', onerror);
      } else {
        const listeners = this.listeners('error');
        for (let i = 0; i < listeners.length; i++) {
          this.removeEventListener('error', listeners[i]);
        }
      }
    }
  }
  class HTMLWindowElement extends HTMLLoadableElement {
    constructor() {
      super('window');
    }

    postMessage(data) {
      this.emit('message', new MessageEvent(data));
    }

    get onmessage() {
      return this.listeners('load')[0];
    }
    set onmessage(onmessage) {
      if (typeof onmessage === 'function') {
        this.addEventListener('message', onmessage);
      } else {
        const listeners = this.listeners('message');
        for (let i = 0; i < listeners.length; i++) {
          this.removeEventListener('message', listeners[i]);
        }
      }
    }
  }
  class HTMLScriptElement extends HTMLLoadableElement {
    constructor() {
      super('script');

      this.readyState = null;

      this.on('attribute', (name, value) => {
        if (name === 'src') {
          this.readyState = null;

          const url = _normalizeUrl(value);

          fetch(url)
            .then(res => {
              if (res.status >= 200 && res.status < 300) {
                return res.text();
              } else {
                return Promise.reject(new Error('script src got invalid status code: ' + res.status + ' : ' + url));
              }
            })
            .then(jsString => {
              this.runJavascript(jsString, url);

              this.readyState = 'complete';

              this.emit('load');
            })
            .catch(err => {
              this.readyState = 'complete';

              this.emit('error', err);
            });
        }
      });
      this.on('innerHTML', innerHTML => {
        this.runJavascript(innerHTML);

        this.readyState = 'complete';

        process.nextTick(() => {
          this.emit('load');
        });
      });
    }

    get src() {
      this.getAttribute('src');
    }
    set src(value) {
      this.setAttribute('src', value);
    }

    set innerHTML(innerHTML) {
      this.emit('innerHTML', innerHTML);
    }

    runJavascript(jsString, filename = 'script') {
      try {
        vm.runInContext(jsString, this[windowSymbol], {
          filename,
        });
      } catch (err) {
        console.warn(err);
      }
    }
  }
  class HTMLMediaElement extends HTMLLoadableElement {
    constructor(tagName) {
      super(tagName);
    }

    get src() {
      this.getAttribute('src');
    }
    set src(value) {
      this.setAttribute('src', value);
    }
  }
  const HTMLImageElement = (() => {
    if (typeof nativeImage !== 'undefined') {
      return class HTMLImageElement extends nativeImage {
        constructor() {
          super();
          EventEmitter.call(this);
          this.tagName = 'image'

          this._src = '';
        }

        emit(event, data) {
          return EventEmitter.prototype.emit.call(this, event, data);
        }
        on(event, cb) {
          return EventEmitter.prototype.on.call(this, event, cb);
        }
        removeListener(event, cb) {
          return EventEmitter.prototype.removeListener.call(this, event, cb);
        }

        addEventListener(event, cb) {
          return HTMLElement.prototype.addEventListener.call(this, event, cb);
        }
        removeEventListener(event, cb) {
          return HTMLElement.prototype.removeEventListener.call(this, event, cb);
        }

        get src() {
          return this._src;
        }
        set src(src) {
          this._src = src;

          fetch(src)
            .then(res => {
              if (res.status >= 200 && res.status < 300) {
                return res.arrayBuffer();
              } else {
                return Promise.reject(new Error('img src got invalid status code: ' + res.status + ' : ' + url));
              }
            })
            .then(arrayBuffer => {
              if (this.load(arrayBuffer)) {
                return Promise.resolve();
              } else {
                return Promise.reject(new Error('failed to decode image'));
              }
            })
            .then(() => {
              this.emit('load');
            })
            .catch(err => {
              this.emit('error', err);
            });
        }

        get onload() {
          return this.listeners('load')[0];
        }
        set onload(onload) {
          if (typeof onload === 'function') {
            this.addEventListener('load', onload);
          } else {
            const listeners = this.listeners('load');
            for (let i = 0; i < listeners.length; i++) {
              this.removeEventListener('load', listeners[i]);
            }
          }
        }

        get onerror() {
          return this.listeners('error')[0];
        }
        set onerror(onerror) {
          if (typeof onerror === 'function') {
            this.addEventListener('error', onerror);
          } else {
            const listeners = this.listeners('error');
            for (let i = 0; i < listeners.length; i++) {
              this.removeEventListener('error', listeners[i]);
            }
          }
        }
      };
    } else {
      return class HTMLImageElement extends HTMLMediaElement {
        constructor() {
          super('image');

          this.on('attribute', (name, value) => {
            if (name === 'src') {
              process.nextTick(() => { // XXX
                this.emit('load');
              });
            }
          });
        }

        get width() {
          return 0; // XXX
        }
        set width(width) {}
        get height() {
          return 0; // XXX
        }
        set height(height) {}
      };
    }
  })();
  class HTMLAudioElement extends HTMLMediaElement {
    constructor() {
      super('audio');

      this.on('attribute', (name, value) => {
        if (name === 'src') {
          process.nextTick(() => { // XXX
            this.emit('load');
            this.emit('canplay');
          });
        }
      });
    }

    get oncanplay() {
      return this.listeners('canplay')[0];
    }
    set oncanplay(oncanplay) {
      if (typeof oncanplay === 'function') {
        this.addEventListener('canplay', oncanplay);
      } else {
        const listeners = this.listeners('canplay');
        for (let i = 0; i < listeners.length; i++) {
          this.removeEventListener('canplay', listeners[i]);
        }
      }
    }

    get oncanplaythrough() {
      return this.listeners('canplaythrough')[0];
    }
    set oncanplaythrough(oncanplaythrough) {
      if (typeof oncanplaythrough === 'function') {
        this.addEventListener('canplaythrough', oncanplaythrough);
      } else {
        const listeners = this.listeners('canplaythrough');
        for (let i = 0; i < listeners.length; i++) {
          this.removeEventListener('canplaythrough', listeners[i]);
        }
      }
    }
  }
  class HTMLVideoElement extends HTMLMediaElement {
    constructor() {
      super('video');

      this.on('attribute', (name, value) => {
        if (name === 'src') {
          process.nextTick(() => { // XXX
            this.emit('load');
          });
        }
      });
    }
  }
  class HTMLIframeElement extends HTMLMediaElement {
    constructor() {
      super('iframe');

      this.contentWindow = null;
      this.contentDocument = null;

      this.on('window', window => {
        const contentWindow = _parseWindow('', this[windowSymbol], this[windowSymbol].top);
        this.contentWindow = contentWindow;

        const {document: contentDocument} = contentWindow;
        this.contentDocument = contentDocument;
      });
      this.on('attribute', (name, value) => {
        if (name === 'src') {
          const url = _normalizeUrl(value);

          fetch(url)
            .then(res => {
              if (res.status >= 200 && res.status < 300) {
                return res.text();
              } else {
                return Promise.reject(new Error('iframe src got invalid status code: ' + res.status + ' : ' + url));
              }
            })
            .then(htmlString => {
              const contentDocument = _parseDocument(htmlString, this.contentWindow);
              this.contentDocument = contentDocument;

              contentDocument.once('readystatechange', () => {
                this.emit('load');
              });
            })
            .catch(err => {
              this.emit('error', err);
            });
        }
      });
    }
  }
  class HTMLCanvasElement extends HTMLElement {
    constructor() {
      super('canvas');

      this._context = null;

      this.on('attribute', (name, value) => {
        if (name === 'width') {
          // XXX
        } else if (name === 'height') {
          // XXX
        }
      });
    }

    get width() {
      this.getAttribute('width');
    }
    set width(value) {
      this.setAttribute('width', value);
    }

    get height() {
      this.getAttribute('height');
    }
    set height(value) {
      this.setAttribute('height', value);
    }

    getContext(contextType) {
      if (this._context === null) {
        if (contextType === '2d') {
          this._context = new CanvasRenderingContext2D(this.width, this.height);
        } else if (contextType === 'webgl') {
          this._context = new WebGLContext();
        }
      }
      return this._context;
    }
  }
  class TextNode extends Node {
    constructor(value) {
      super('#text');

      this.value = value;
    }
  }
  class CommentNode extends Node {
    constructor(value) {
      super('#comment');

      this.value = value;
    }
  }
  const HTML_ELEMENTS = {
    a: HTMLAnchorElement,
    script: HTMLScriptElement,
    img: HTMLImageElement,
    audio: HTMLAudioElement,
    video: HTMLVideoElement,
    iframe: HTMLIframeElement,
    canvas: HTMLCanvasElement,
  };

  class Worker extends WindowWorker {
    constructor(src, options = {}) {
      options.baseUrl = options.baseUrl || baseUrl;

      if (src instanceof Blob) {
        super('data:application/javascript,' + src[Blob.BUFFER].toString('utf8'), options);
      } else {
        super(_normalizeUrl(src), options);
      }
    }
  }

  const rafCbs = [];

  const _makeWindow = (parent, top) => {
    const window = new HTMLWindowElement();
    window.window = window;
    window.self = window;
    window.parent = parent || window;
    window.top = top || window;
    window.innerWidth = 1280;
    window.innerHeight = 1024;
    window.console = console;
    window.setTimeout = setTimeout;
    window.clearTimeout = clearTimeout;
    window.setInterval = setInterval;
    window.clearInterval = clearInterval;
    window.Date = Date;
    window.performance = performance;
    window.location = url.parse(baseUrl);
    const vrDisplays = [new VRDisplay(window)];
    window.navigator = {
      getVRDisplays: () => vrDisplays,
    };
    window.localStorage = new LocalStorage(path.join(options.dataPath, '.localStorage'));
    window.document = null;
    window.URL = URL;
    window.Image = HTMLImageElement;
    window.HTMLScriptElement = HTMLScriptElement;
    window.HTMLImageElement = HTMLImageElement;
    window.HTMLAudioElement = HTMLAudioElement;
    window.HTMLVideoElement = HTMLVideoElement;
    window.HTMLIframeElement = HTMLIframeElement;
    window.HTMLCanvasElement = HTMLCanvasElement;
    window.ImageData = ImageData;
    window.ImageBitmap = ImageBitmap;
    window.Path2D = Path2D;
    window.CanvasRenderingContext2D = CanvasRenderingContext2D;
    window.VRFrameData = VRFrameData;
    window.btoa = s => new Buffer(s, 'binary').toString('base64');
    window.atob = s => new Buffer(s, 'base64').toString('binary');
    window.fetch = (url, options) => {
      const blob = urls.get(url);
      if (blob) {
        return Promise.resolve(new Response(blob));
      } else {
        return fetch(_normalizeUrl(url), options);
      }
    };
    window.XMLHttpRequest = XMLHttpRequest;
    window.WebSocket = WebSocket;
    window.Worker = Worker;
    window.Blob = Blob;
    window.AudioContext = AudioContext;
    window.Path2D = Path2D;
    window.createImageBitmap = image => Promise.resolve(ImageBitmap.createImageBitmap(image));
    window.requestAnimationFrame = fn => {
      rafCbs.push(fn);
    };
    window.clearAnimationFrame = fn => {
      const index = rafCbs.indexOf(fn);
      if (index !== -1) {
        rafCbs.splice(index, 1);
      }
    };
    window.tickAnimationFrame = () => {
      const localRafCbs = rafCbs.slice();
      rafCbs.length = 0;
      for (let i = 0; i < localRafCbs.length; i++) {
        localRafCbs[i]();
      }
    };
    window.alignFrame = (viewMatrix, projectionMatrix) => {
      window.emit('alignframe', viewMatrix, projectionMatrix);
    };
    vm.createContext(window);
    return window;
  };
  const _parseDocument = (s, window) => {
    const document = Node.fromAST(parse5.parse(s), window);
    const html = document.childNodes.find(element => element.tagName === 'html');
    const head = html.childNodes.find(element => element.tagName === 'head');
    const body = html.childNodes.find(element => element.tagName === 'body');

    document.documentElement = document;
    document.readyState = null;
    document.head = head;
    document.body = body;
    document.location = url.parse(baseUrl);
    document.createElement = tagName => {
      const HTMLElementTemplate = HTML_ELEMENTS[tagName];
      const el = HTMLElementTemplate ? new HTMLElementTemplate() : new HTMLElement(tagName);
      el[setWindowSymbol](window);
      return el;
    };
    document.createElementNS = (namespace, tagName) => document.createElement(tagName);
    document.createTextNode = text => new TextNode(text);
    document.write = htmlString => {
      const childNodes = parse5.parseFragment(htmlString).childNodes.map(childNode => Node.fromAST(childNode, window, this));
      for (let i = 0; i < childNodes.length; i++) {
        document.body.appendChild(childNodes[i]);
      }
    };
    window.document = document;

    process.nextTick(async () => {
      document.readyState = 'complete';

      await _runHtml(document, window);

      document.emit('readystatechange');
    });

    return document;
  };
  const _parseWindow = (s, parent, top) => {
    const window = _makeWindow(parent, top);
    const document = _parseDocument(s, window);
    window.document = document;

    return window;
  };
  const window = _parseWindow(s);
  const {document} = window;

  const _promiseSerial = async promiseFns => {
    for (let i = 0; i < promiseFns.length; i++) {
      await promiseFns[i]();
    }
  };
  const _loadPromise = el => new Promise((accept, reject) => {
    el.on('load', () => {
      accept();
    });
    el.on('error', err => {
      reject(err);
    });
  });
  const _runHtml = async (element, window) => {
    if (element instanceof HTMLElement) {
      const scripts = element.querySelectorAll('script');
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const scriptEl = new HTMLScriptElement();
        scriptEl[setWindowSymbol](window);
        if (script.attributes.src) {
          scriptEl.src = script.attributes.src;
        }
        if (script.childNodes.length > 0) {
          scriptEl.innerHTML = script.childNodes[0].value;
        }

        if (script.attributes.async) {
          _loadPromise(scriptEl)
            .catch(err => {
              console.warn(err);
            });
        } else {
          try {
            await _loadPromise(scriptEl);
          } catch(err) {
            console.warn(err);
          }
        }
      }

      const images = element.querySelectorAll('image');
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageEl = new HTMLImageElement();
        imageEl[setWindowSymbol](window);
        if (image.attributes.src) {
          imageEl.src = image.attributes.src;
        }

        await _loadPromise(imageEl);
      }

      const audios = element.querySelectorAll('audio');
      for (let i = 0; i < audios.length; i++) {
        const audio = audios[i];
        const audioEl = new HTMLAudioElement();
        audioEl[setWindowSymbol](window);
        if (audio.attributes.src) {
          audioEl.src = audio.attributes.src;
        }

        await _loadPromise(audioEl);
      }

      const videos = element.querySelectorAll('video');
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const videoEl = new HTMLVideoElement();
        videoEl[setWindowSymbol](window);
        if (video.attributes.src) {
          videoEl.src = video.attributes.src;
        }

        await _loadPromise(videoEl);
      }
    }
  };

  return window;
};
exokit.fetch = src => fetch(src)
  .then(res => {
    if (res.status >= 200 && res.status < 300) {
      return res.text();
    } else {
      return Promise.reject(new Error('fetch got invalid status code: ' + res.status + ' : ' + src));
    }
  })
  .then(htmlString => {
    const parsedUrl = url.parse(src);
    return exokit(htmlString, {
      url: (parsedUrl.protocol || 'http:') + '//' + (parsedUrl.host || '127.0.0.1'),
    });
  });
exokit.THREE = THREE;
module.exports = exokit;

if (require.main === module) {
  if (process.argv.length === 3) {
    exokit.fetch(process.argv[2]);
  }
}
