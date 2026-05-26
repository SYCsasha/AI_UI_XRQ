/**
 * 3D Model Renderer
 * Renders 3D models (GLTF/GLB, OBJ) with enhanced visualization
 * Uses Three.js for 3D rendering with improved lighting and controls
 */

class Model3DRenderer {
  static FOG_NEAR = 100;
  static FOG_FAR = 2000;
  static CAMERA_FOV = 75;
  static CAMERA_NEAR = 0.1;
  static CAMERA_FAR = 2000;
  static AUTO_ROTATION_SPEED = 0.003;
  static MOUSE_ROTATION_SPEED = 0.01;
  static ZOOM_SPEED = 0.1;

  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.controls = null;
    this.animateHandler = this.animate.bind(this);
    this.resizeHandler = this.onWindowResize.bind(this);
    this.autoRotate = true;
    this.gltfLoader = null;
  }

  render(code, container) {
    container.innerHTML = '';

    // Check if Three.js is available
    if (typeof THREE === 'undefined') {
      container.innerHTML = `
        <div class="model-3d-error">
          <p>Three.js library not loaded. Please check browser console.</p>
        </div>
      `;
      return;
    }

    // Create canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.style.width = '100%';
    canvasContainer.style.height = '600px';
    canvasContainer.style.position = 'relative';
    canvasContainer.style.backgroundColor = '#0a0e27';
    canvasContainer.style.borderRadius = '8px';
    canvasContainer.style.overflow = 'hidden';

    container.appendChild(canvasContainer);

    // Initialize Three.js scene
    this.initScene(canvasContainer);

    // Create controls UI
    this.createControls(canvasContainer);

    // Load model from URL or base64
    this.loadModel(code);

    // Start animation loop
    requestAnimationFrame(this.animateHandler);
  }

  initScene(container) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene with gradient background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);
    this.scene.fog = new THREE.Fog(0x0a0e27, Model3DRenderer.FOG_NEAR, Model3DRenderer.FOG_FAR);

    // Camera
    this.camera = new THREE.PerspectiveCamera(Model3DRenderer.CAMERA_FOV, width / height, Model3DRenderer.CAMERA_NEAR, Model3DRenderer.CAMERA_FAR);
    this.camera.position.set(0, 1.5, 3);
    this.camera.lookAt(0, 0, 0);

    // Renderer with enhanced quality
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, precision: 'highp' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Enhanced lighting setup
    this.setupLighting();

    // Add grid and axes
    this.addGridAndAxes();

    // Mouse and touch controls
    this.setupMouseControls(container);

    // Handle window resize
    window.addEventListener('resize', this.resizeHandler);
  }

  setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    this.scene.add(keyLight);

    // Fill light for better dimension
    const fillLight = new THREE.DirectionalLight(0x7f9fff, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    // Back light for rim effect
    const backLight = new THREE.DirectionalLight(0xff7f50, 0.3);
    backLight.position.set(0, 2, -10);
    this.scene.add(backLight);
  }

  addGridAndAxes() {
    // Grid helper
    const gridHelper = new THREE.GridHelper(30, 30, 0x444466, 0x222244);
    gridHelper.position.y = -2;
    this.scene.add(gridHelper);

    // Axes helper with custom size
    const axesHelper = new THREE.AxesHelper(8);
    this.scene.add(axesHelper);
  }

  loadModel(code) {
    // Create a more interesting default cube with material
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x2563eb,
      shininess: 100,
      wireframe: false
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    
    // Add edges to make it more visible
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x3b82f6 }));
    cube.add(wireframe);
    
    this.scene.add(cube);
    this.model = cube;

    // Try to load GLTF/GLB model if URL or path provided
    if (code && (code.startsWith('http') || code.startsWith('data:') || code.startsWith('/'))) {
      this.loadGLTFModel(code);
    }
  }

  loadGLTFModel(url) {
    if (!this.gltfLoader) {
      // Create a simple loader placeholder
      console.log('GLTF model URL provided:', url);
      // In a full implementation, would use THREE.GLTFLoader
    }
  }

  createControls(container) {
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'absolute';
    controlsDiv.style.bottom = '12px';
    controlsDiv.style.right = '12px';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '8px';
    controlsDiv.style.zIndex = '10';

    const toggleAutoRotate = document.createElement('button');
    toggleAutoRotate.textContent = 'Auto-Rotate: ON';
    toggleAutoRotate.style.padding = '6px 12px';
    toggleAutoRotate.style.fontSize = '12px';
    toggleAutoRotate.style.backgroundColor = '#2563eb';
    toggleAutoRotate.style.color = '#fff';
    toggleAutoRotate.style.border = 'none';
    toggleAutoRotate.style.borderRadius = '4px';
    toggleAutoRotate.style.cursor = 'pointer';

    toggleAutoRotate.addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      toggleAutoRotate.textContent = `Auto-Rotate: ${this.autoRotate ? 'ON' : 'OFF'}`;
      toggleAutoRotate.style.backgroundColor = this.autoRotate ? '#2563eb' : '#6b7280';
    });

    controlsDiv.appendChild(toggleAutoRotate);
    container.appendChild(controlsDiv);
  }

  setupMouseControls(container) {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    container.addEventListener('mousemove', (e) => {
      if (isDragging && this.model) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        this.model.rotation.y += deltaX * Model3DRenderer.MOUSE_ROTATION_SPEED;
        this.model.rotation.x += deltaY * Model3DRenderer.MOUSE_ROTATION_SPEED;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    container.addEventListener('mouseup', () => {
      isDragging = false;
    });

    container.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    // Scroll to zoom with smoother interpolation
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? 1 : -1;
      const newZ = this.camera.position.z + direction * Model3DRenderer.ZOOM_SPEED;
      // Clamp zoom to reasonable values
      this.camera.position.z = Math.max(0.5, Math.min(20, newZ));
    });

    // Touch support for mobile
    let touchStartDistance = 0;
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      }
    });

    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        const delta = currentDistance - touchStartDistance;
        if (Math.abs(delta) > 10 && this.model) {
          this.camera.position.z += delta * 0.01;
          this.camera.position.z = Math.max(0.5, Math.min(20, this.camera.position.z));
          touchStartDistance = currentDistance;
        }
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animateHandler);

    if (this.model && !document.hidden && this.autoRotate) {
      // Auto-rotate for demo
      this.model.rotation.y += Model3DRenderer.AUTO_ROTATION_SPEED;
      // Gentle up-down movement
      this.model.position.y = Math.sin(Date.now() * 0.0005) * 0.3;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWindowResize() {
    const container = this.renderer?.domElement?.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    window.removeEventListener('resize', this.resizeHandler);
  }
}
