/**
 * Video Renderer
 * Renders video content with playback controls
 */

class VideoRenderer {
  render(code, container) {
    container.innerHTML = '';
    
    // Check if code is a valid video URL/data
    const isDataUrl = code.startsWith('data:video/');
    const isUrl = /^https?:\/\//.test(code);
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(code) && code.length > 100;
    
    if (!isDataUrl && !isUrl && !isBase64) {
      container.innerHTML = `
        <div class="video-error">
          <p>Invalid video format. Expected URL, data URL, or base64 encoded video.</p>
        </div>
      `;
      return;
    }
    
    let videoSrc = code;
    if (isBase64) {
      // Try to detect video type from context - default to mp4
      videoSrc = 'data:video/mp4;base64,' + code;
    }
    
    const videoEl = document.createElement('video');
    videoEl.controls = true;
    videoEl.style.maxWidth = '100%';
    videoEl.style.maxHeight = '600px';
    videoEl.style.borderRadius = '8px';
    videoEl.style.backgroundColor = '#000';
    
    const sourceEl = document.createElement('source');
    sourceEl.src = videoSrc;
    sourceEl.type = this.detectVideoType(code);
    
    videoEl.appendChild(sourceEl);
    videoEl.appendChild(document.createTextNode(
      'Your browser does not support the video tag.'
    ));
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
    wrapper.style.padding = '16px';
    wrapper.appendChild(videoEl);
    
    container.appendChild(wrapper);
  }
  
  detectVideoType(code) {
    // Try to detect from URL extension
    if (code.includes('.mp4')) return 'video/mp4';
    if (code.includes('.webm')) return 'video/webm';
    if (code.includes('.ogg') || code.includes('.ogv')) return 'video/ogg';
    if (code.includes('.mov')) return 'video/quicktime';
    if (code.includes('.flv')) return 'video/x-flv';
    if (code.includes('.avi')) return 'video/x-msvideo';
    
    // Default to mp4
    return 'video/mp4';
  }
}
