(function bootstrapQuickCopyPageHook() {
  if (window.__QUICK_COPY_PAGE_HOOK_INSTALLED__) {
    return;
  }

  window.__QUICK_COPY_PAGE_HOOK_INSTALLED__ = true;

  var PAGE_MESSAGE_SOURCE = 'quick-copy-ext-page-hook';

  function canReadResponseBody(contentType) {
    return typeof contentType === 'string' && /json|javascript|text\/plain/i.test(contentType);
  }

  function truncateString(value, maxLength) {
    if (typeof value !== 'string' || value.length <= maxLength) {
      return value;
    }

    return value.slice(0, maxLength) + '...';
  }

  function sanitizeValue(value, depth) {
    if (depth > 3) {
      return undefined;
    }

    if (value === null || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return truncateString(value, 300);
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (Array.isArray(value)) {
      return value
        .slice(0, 10)
        .map(function mapItem(item) {
          return sanitizeValue(item, depth + 1);
        })
        .filter(function filterUndefined(item) {
          return item !== undefined;
        });
    }

    if (value && typeof value === 'object') {
      var entries = Object.entries(value).slice(0, 20);
      var result = {};

      entries.forEach(function forEachEntry(entry) {
        var sanitized = sanitizeValue(entry[1], depth + 1);
        if (sanitized !== undefined) {
          result[entry[0]] = sanitized;
        }
      });

      return result;
    }

    return undefined;
  }

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  function postPayload(payload) {
    window.postMessage(
      {
        source: PAGE_MESSAGE_SOURCE,
        type: 'quick-copy:response',
        payload: payload,
      },
      '*',
    );
  }

  function captureRequestBody(body) {
    if (body === null || body === undefined) {
      return undefined;
    }
    if (typeof body === 'string') {
      return safeJsonParse(body) || body;
    }
    if (typeof body === 'object') {
      try {
        if (body instanceof URLSearchParams) {
          var obj = {};
          body.forEach(function(value, key) {
            obj[key] = value;
          });
          return obj;
        }
        if (body instanceof Blob || body instanceof FormData ||
            body instanceof ArrayBuffer || body instanceof DataView ||
            ArrayBuffer.isView(body)) {
          return undefined;
        }
        if (typeof Request !== 'undefined' && body instanceof Request) {
          return captureRequestBody(body.body);
        }
        return sanitizeValue(body, 0);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  function normalizeFetchInput(input) {
    if (typeof input === 'string') {
      return input;
    }

    if (input && typeof input.url === 'string') {
      return input.url;
    }

    return '';
  }

  var originalFetch = window.fetch;

  window.fetch = function patchedFetch(input, init) {
    var startedAt = Date.now();
    var method =
      (init && init.method) ||
      (typeof Request !== 'undefined' && input instanceof Request ? input.method : '') ||
      'GET';
    var requestUrl = normalizeFetchInput(input);
    var requestBody = init && init.body ? captureRequestBody(init.body) : undefined;

    if (!requestBody && typeof Request !== 'undefined' && input instanceof Request) {
      requestBody = captureRequestBody(input.body);
    }

    return originalFetch.apply(this, arguments).then(function onResolved(response) {
      var completedAt = Date.now();
      var contentType = response.headers.get('content-type');

      if (!canReadResponseBody(contentType)) {
        postPayload({
          url: response.url || requestUrl,
          method: method,
          startedAt: startedAt,
          completedAt: completedAt,
          statusCode: response.status,
          requestParams: requestBody,
        });
        return response;
      }

      void response
        .clone()
        .text()
        .then(function onText(text) {
          var parsed = safeJsonParse(text);

          postPayload({
            url: response.url || requestUrl,
            method: method,
            startedAt: startedAt,
            completedAt: completedAt,
            statusCode: response.status,
            response: sanitizeValue(parsed, 0),
            requestParams: requestBody,
          });
        })
        .catch(function onReadError() {
          postPayload({
            url: response.url || requestUrl,
            method: method,
            startedAt: startedAt,
            completedAt: completedAt,
            statusCode: response.status,
            requestParams: requestBody,
          });
        });

      return response;
    });
  };

  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
    this.__quickCopyMethod__ = method;
    this.__quickCopyUrl__ = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function patchedSend(body) {
    this.__quickCopyStartedAt__ = Date.now();
    this.__quickCopyRequestBody__ = captureRequestBody(body);

    this.addEventListener(
      'loadend',
      function onLoadEnd() {
        var contentType = this.getResponseHeader('content-type');
        var responseBody;

        if (this.responseType === 'json') {
          responseBody = sanitizeValue(this.response, 0);
        } else if (!this.responseType || this.responseType === 'text') {
          responseBody = canReadResponseBody(contentType)
            ? sanitizeValue(safeJsonParse(this.responseText), 0)
            : undefined;
        }

        postPayload({
          url: this.responseURL || this.__quickCopyUrl__ || '',
          method: this.__quickCopyMethod__ || 'GET',
          startedAt: this.__quickCopyStartedAt__ || Date.now(),
          completedAt: Date.now(),
          statusCode: this.status,
          response: responseBody,
          requestParams: this.__quickCopyRequestBody__,
        });
      },
      { once: true },
    );

    return originalSend.apply(this, arguments);
  };
})();
