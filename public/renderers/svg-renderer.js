/**
 * SVG Renderer
 * Renders SVG content with animation support
 */

class SvgRenderer {
  render(code, container) {
    container.innerHTML = '';

    if (!code || typeof code !== 'string') {
      container.innerHTML = '<div class="svg-error">No SVG content provided</div>';
      return;
    }

    const svgCode = code.trim();

    // Validate SVG
    if (!svgCode.startsWith('<svg') && !svgCode.startsWith('<?xml')) {
      container.innerHTML = '<div class="svg-error">Invalid SVG content</div>';
      return;
    }

    // Create a container for the SVG
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
    wrapper.style.alignItems = 'center';
    wrapper.style.padding = '16px';
    wrapper.style.backgroundColor = '#f8fafc';
    wrapper.style.borderRadius = '8px';
    wrapper.style.minHeight = '300px';

    // Use innerHTML with sanitization
    try {
      // Create a temporary container to parse SVG
      const temp = document.createElement('div');
      temp.innerHTML = svgCode;
      
      const svgElement = temp.querySelector('svg');
      if (!svgElement) {
        throw new Error('No SVG element found');
      }

      // Sanitize and prepare SVG
      this.sanitizeSvg(svgElement);

      // Set responsive sizing
      svgElement.style.maxWidth = '100%';
      svgElement.style.maxHeight = '600px';
      svgElement.style.border = '1px solid #e2e8f0';
      svgElement.style.borderRadius = '4px';

      wrapper.appendChild(svgElement);
      container.appendChild(wrapper);

      // Add animation controls if SVG has animations
      if (svgCode.includes('animation') || svgCode.includes('animate')) {
        this.addAnimationControls(container, svgElement);
      }
    } catch (error) {
      container.innerHTML = `<div class="svg-error">Error rendering SVG: ${escHtml(error.message)}</div>`;
    }
  }

  sanitizeSvg(svgElement) {
    // Remove potentially dangerous attributes and elements
    const dangerousElements = svgElement.querySelectorAll('script, iframe, object, embed');
    dangerousElements.forEach((el) => el.remove());

    // Remove event handlers
    const allElements = svgElement.querySelectorAll('*');
    allElements.forEach((el) => {
      for (let i = el.attributes.length - 1; i >= 0; i--) {
        const attr = el.attributes[i];
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      }
    });
  }

  addAnimationControls(container, svgElement) {
    const controlsDiv = document.createElement('div');
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '8px';
    controlsDiv.style.justifyContent = 'center';
    controlsDiv.style.marginTop = '12px';
    controlsDiv.style.padding = '12px';
    controlsDiv.style.backgroundColor = '#f1f5f9';
    controlsDiv.style.borderRadius = '4px';

    const playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.padding = '6px 12px';
    playBtn.style.backgroundColor = '#2563eb';
    playBtn.style.color = '#fff';
    playBtn.style.border = 'none';
    playBtn.style.borderRadius = '4px';
    playBtn.style.cursor = 'pointer';
    playBtn.style.fontSize = '12px';

    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.style.padding = '6px 12px';
    pauseBtn.style.backgroundColor = '#f59e0b';
    pauseBtn.style.color = '#fff';
    pauseBtn.style.border = 'none';
    pauseBtn.style.borderRadius = '4px';
    pauseBtn.style.cursor = 'pointer';
    pauseBtn.style.fontSize = '12px';

    const stopBtn = document.createElement('button');
    stopBtn.textContent = '⏹ Stop';
    stopBtn.style.padding = '6px 12px';
    stopBtn.style.backgroundColor = '#dc2626';
    stopBtn.style.color = '#fff';
    stopBtn.style.border = 'none';
    stopBtn.style.borderRadius = '4px';
    stopBtn.style.cursor = 'pointer';
    stopBtn.style.fontSize = '12px';

    playBtn.addEventListener('click', () => {
      this.playAnimations(svgElement);
    });

    pauseBtn.addEventListener('click', () => {
      this.pauseAnimations(svgElement);
    });

    stopBtn.addEventListener('click', () => {
      this.stopAnimations(svgElement);
    });

    controlsDiv.appendChild(playBtn);
    controlsDiv.appendChild(pauseBtn);
    controlsDiv.appendChild(stopBtn);

    container.appendChild(controlsDiv);
  }

  playAnimations(svgElement) {
    const animations = svgElement.querySelectorAll('animate, animateMotion, animateTransform');
    animations.forEach((anim) => {
      if (anim.pauseAnimations) {
        anim.unpauseAnimations();
      }
    });
  }

  pauseAnimations(svgElement) {
    const animations = svgElement.querySelectorAll('animate, animateMotion, animateTransform');
    animations.forEach((anim) => {
      if (anim.pauseAnimations) {
        anim.pauseAnimations();
      }
    });
  }

  stopAnimations(svgElement) {
    svgElement.pauseAnimations();
    // Reset to initial state
    const animations = svgElement.querySelectorAll('animate, animateMotion, animateTransform');
    animations.forEach((anim) => {
      anim.setCurrentTime(0);
    });
  }
}
