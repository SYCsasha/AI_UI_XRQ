/**
 * Audio Renderer
 * Renders audio content with playback controls
 */

class AudioRenderer {
  render(code, container) {
    container.innerHTML = '';
    
    // Check if code is a valid audio URL/data
    const isDataUrl = code.startsWith('data:audio/');
    const isUrl = /^https?:\/\//.test(code);
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(code) && code.length > 100;
    
    if (!isDataUrl && !isUrl && !isBase64) {
      container.innerHTML = `
        <div class="audio-error">
          <p>Invalid audio format. Expected URL, data URL, or base64 encoded audio.</p>
        </div>
      `;
      return;
    }
    
    let audioSrc = code;
    if (isBase64) {
      // Try to detect audio type from context - default to mp3
      audioSrc = 'data:audio/mpeg;base64,' + code;
    }
    
    const audioEl = document.createElement('audio');
    audioEl.controls = true;
    audioEl.style.width = '100%';
    audioEl.style.maxWidth = '600px';
    audioEl.style.margin = '16px auto';
    audioEl.style.display = 'block';
    
    const sourceEl = document.createElement('source');
    sourceEl.src = audioSrc;
    sourceEl.type = this.detectAudioType(code);
    
    audioEl.appendChild(sourceEl);
    audioEl.appendChild(document.createTextNode(
      'Your browser does not support the audio tag.'
    ));
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
    wrapper.style.padding = '16px';
    wrapper.appendChild(audioEl);
    
    // Add waveform visualization
    const visualization = document.createElement('div');
    visualization.style.display = 'flex';
    visualization.style.justifyContent = 'center';
    visualization.style.alignItems = 'center';
    visualization.style.gap = '2px';
    visualization.style.height = '60px';
    visualization.style.marginTop = '8px';
    
    // Create simple bars for visualization
    for (let i = 0; i < 40; i++) {
      const bar = document.createElement('div');
      bar.style.width = '2px';
      bar.style.height = Math.random() * 50 + 10 + 'px';
      bar.style.backgroundColor = '#2563eb';
      bar.style.borderRadius = '1px';
      bar.style.transition = 'height 0.1s ease';
      visualization.appendChild(bar);
    }
    
    wrapper.appendChild(visualization);
    container.appendChild(wrapper);
  }
  
  detectAudioType(code) {
    // Try to detect from URL extension
    if (code.includes('.mp3')) return 'audio/mpeg';
    if (code.includes('.wav')) return 'audio/wav';
    if (code.includes('.ogg') || code.includes('.oga')) return 'audio/ogg';
    if (code.includes('.webm')) return 'audio/webm';
    if (code.includes('.aac') || code.includes('.m4a')) return 'audio/aac';
    if (code.includes('.flac')) return 'audio/flac';
    
    // Default to mp3
    return 'audio/mpeg';
  }
}
