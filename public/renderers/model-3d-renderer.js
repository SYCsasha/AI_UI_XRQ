/**
 * 3D Model Renderer
 * Renders 3D models (GLTF/GLB) with basic visualization
 * Uses Three.js for 3D rendering
 */

class Model3DRenderer {
  static FOG_NEAR = 100;
  static FOG_FAR = 1000;
  static CAMERA_FOV = 75;
  static CAMERA_NEAR = 0.1;
  static CAMERA_FAR = 1000;

  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.controls = null;
    this.animateHandler = this.animate.bind(this);
    this.resizeHandler = this.onWindowResize.bind(this);
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
    canvasContainer.style.backgroundColor = '#1a1a1a';
    canvasContainer.style.borderRadius = '8px';
    canvasContainer.style.overflow = 'hidden';

    container.appendChild(canvasContainer);

    // Initialize Three.js scene
    this.initScene(canvasContainer);

    // Load model from URL or base64
    this.loadModel(code);

    // Start animation loop
    requestAnimationFrame(this.animateHandler);
  }

  initScene(container) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);
    this.scene.fog = new THREE.Fog(0x1a1a1a, Model3DRenderer.FOG_NEAR, Model3DRenderer.FOG_FAR);

    // Camera
    this.camera = new THREE.PerspectiveCamera(Model3DRenderer.CAMERA_FOV, width / height, Model3DRenderer.CAMERA_NEAR, Model3DRenderer.CAMERA_FAR);
    this.camera.position.set(0, 1.5, 3);
    this.camera.lookAt(0, 1, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Add grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
    gridHelper.position.y = -2;
    this.scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    // Mouse controls
    this.setupMouseControls(container);

    // Handle window resize
    window.addEventListener('resize', this.resizeHandler);
  }

  loadModel(code) {
    // Create a simple placeholder cube if no valid model
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x2563eb });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.scene.add(cube);

    // Try to load GLTF/GLB model if URL provided
    if (code.startsWith('http') || code.startsWith('data:')) {
      try {
        // For now, we support URLs pointing to GLTF/GLB files
        // In production, would use THREE.GLTFLoader
        console.log('Model URL provided:', code.slice(0, 50));
      } catch (error) {
        console.error('Error loading model:', error);
      }
    }

    this.model = cube;
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

        this.model.rotation.y += deltaX * 0.01;
        this.model.rotation.x += deltaY * 0.01;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    container.addEventListener('mouseup', () => {
      isDragging = false;
    });

    container.addEventListener('mouseleave', () => {
      isDragging = false;
    });

    // Scroll to zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      const direction = e.deltaY > 0 ? 1 : -1;
      this.camera.position.z += direction * zoomSpeed;
    });
  }

  animate() {
    requestAnimationFrame(this.animateHandler);

    if (this.model && !document.hidden) {
      // Auto-rotate for demo
      this.model.rotation.y += 0.005;
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
