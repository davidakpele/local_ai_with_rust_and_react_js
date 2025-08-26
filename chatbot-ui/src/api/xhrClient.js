const xhrClient = (api_url, method, headers = {}, body = null) => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, api_url);
  
      // Set headers
      Object.keys(headers).forEach((key) => {
        xhr.setRequestHeader(key, headers[key]);
      });
  
      // Response handling
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          const contentType = xhr.getResponseHeader('Content-Type');
          const isJson = contentType && contentType.includes('application/json');
          let parsedResponse = xhr.responseText;
  
          if (isJson) {
            try {
              parsedResponse = JSON.parse(xhr.responseText);
            } catch (error) {
              parsedResponse = { message: 'Invalid JSON, Error: '+error, raw: xhr.responseText };
            }
          }
  
          resolve({
            status: xhr.status,
            statusText: xhr.statusText,
            headers: contentType,
            data: parsedResponse,
          });
        }
      };
  
      xhr.onerror = () => {
        resolve({
          status: 0,
          statusText: 'Network Error',
          data: { message: 'Network error occurred.' },
        });
      };
  
      xhr.send(body ? JSON.stringify(body) : null);
    });
  };
  
  export default xhrClient;
  