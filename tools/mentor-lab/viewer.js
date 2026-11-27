const $ = (id) => document.getElementById(id);
let mode = 'still', sequence = 0, engine = null, pending = null, loading = Promise.resolve();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const status = (text) => { $('status').textContent = text; };

function inspect(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw new Error('Choose a complete GLB or VRM binary file.');
  const size = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || 20 + size > buffer.byteLength) throw new Error('The model has an invalid JSON chunk.');
  const data = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, size)).trim());
  for (const item of [...(data.buffers || []), ...(data.images || [])]) {
    if (item.uri && !item.uri.startsWith('data:')) throw new Error('Use a self-contained model. External asset URLs are blocked in this local preview.');
  }
  let triangles = 0, primitives = 0, morphs = 0;
  for (const mesh of data.meshes || []) for (const primitive of mesh.primitives) {
    primitives++;
    const accessor = data.accessors?.[primitive.indices ?? primitive.attributes.POSITION];
    const count = accessor?.count || 0, type = primitive.mode ?? 4;
    if (type === 4) triangles += Math.floor(count / 3);
    if (type === 5 || type === 6) triangles += Math.max(0, count - 2);
    morphs = Math.max(morphs, primitive.targets?.length || 0);
  }
  return { data, triangles, primitives, morphs };
}

function showMetrics(items) {
  $('metrics').replaceChildren(...items.map(([label, value]) => {
    const box = document.createElement('div'); box.className = 'metric'; box.textContent = label;
    const number = document.createElement('strong'); number.textContent = value; box.append(number); return box;
  }));
}

async function createEngine() {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', '3D character preview'); canvas.setAttribute('role', 'img');
  $('stage').append(canvas);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  const modelCentre = new THREE.Vector3(), modelSize = new THREE.Vector3();
  scene.add(new THREE.HemisphereLight(0xdce6ff, 0x454250, 2.2));
  const key = new THREE.DirectionalLight(0xffeddc, 2.8); key.position.set(2, 3, 4); scene.add(key);
  let model = null, vrm = null, mixer = null, frame = 0, last = 0, near = true, lost = false, disposed = false, renderCount = 0;
  const canRun = () => model && mode === 'quiet' && !reduced.matches && !document.hidden && near && !lost && !disposed;
  const render = () => { if (model && !lost && !['minimised', 'projection'].includes(mode)) { renderer.render(scene, camera); renderCount++; canvas.dataset.renderCount = String(renderCount); } };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; canvas.dataset.running = 'false'; };
  const tick = (now) => {
    frame = 0;
    if (!canRun()) return;
    if (last && now - last < 1000 / 30) { frame = requestAnimationFrame(tick); return; }
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
    mixer?.update(delta); vrm?.update(delta);
    // A subtle blink is available without introducing body motion not authored in the asset.
    const blink = Math.max(0, 1 - Math.abs((now % 6100) - 3050) / 85);
    vrm?.expressionManager?.setValue('blink', blink);
    vrm?.expressionManager?.update(); render(); frame = requestAnimationFrame(tick); canvas.dataset.running = 'true';
  };
  const refresh = () => { stop(); if (canRun()) { frame = requestAnimationFrame(tick); canvas.dataset.running = 'true'; } else { vrm?.expressionManager?.setValue('blink', 0); vrm?.expressionManager?.update(); render(); } };
  function release(root) {
    if (root) {
      const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set(), skeletons = new Set();
      root.traverse((node) => {
        if (node.geometry) geometries.add(node.geometry);
        if (node.skeleton) skeletons.add(node.skeleton);
        for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) materials.add(material);
      });
      for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      for (const texture of textures) { if (texture.image?.close) images.add(texture.image); texture.dispose(); }
      for (const image of images) image.close();
      for (const material of materials) material.dispose();
      for (const geometry of geometries) geometry.dispose();
      for (const skeleton of skeletons) skeleton.dispose();
      scene.remove(root);
    }
  }
  function clear() {
    stop();
    if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); mixer = null; }
    release(model); model = vrm = null;
    if (!disposed) renderer.clear();
  }
  const fitCamera = () => {
    if (!model) return;
    const positionValues = [modelCentre.x, modelCentre.y, modelCentre.z, modelSize.x, modelSize.y, modelSize.z];
    if (!positionValues.every(Number.isFinite)) return;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = modelSize.z / 2 + Math.max(modelSize.y, modelSize.x / camera.aspect) * 0.58 / Math.tan(halfFov);
    camera.far = Math.max(100, distance * 4);
    camera.position.set(modelCentre.x, modelCentre.y, modelCentre.z + Math.max(distance, 0.5));
    camera.lookAt(modelCentre);
    camera.updateProjectionMatrix();
  };
  const resize = () => {
    const rect = $('stage').getBoundingClientRect();
    if (rect.width && rect.height) { renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); fitCamera(); render(); }
  };
  const observer = new ResizeObserver(resize); observer.observe($('stage'));
  const intersection = new IntersectionObserver(([entry]) => { near = entry.isIntersecting; refresh(); }); intersection.observe($('stage'));
  const onVisibility = () => refresh(); document.addEventListener('visibilitychange', onVisibility); reduced.addEventListener('change', onVisibility);
  canvas.addEventListener('webglcontextlost', (event) => { if (disposed) return; event.preventDefault(); lost = true; stop(); canvas.hidden = true; $('placeholder').hidden = false; status('The graphics context was lost. Reload this preview or open a model again.'); });
  // Restoration is explicit: reloading recreates all GPU resources.
  async function load(buffer, isVRM) {
    if (disposed) throw new DOMException('Preview closed.', 'AbortError');
    clear(); lost = false; canvas.hidden = false;
    const loader = new GLTFLoader();
    if (isVRM) { const { VRMLoaderPlugin } = await import('@pixiv/three-vrm'); loader.register((parser) => new VRMLoaderPlugin(parser)); }
    if (disposed) throw new DOMException('Preview closed.', 'AbortError');
    const gltf = await loader.parseAsync(buffer, location.origin + '/');
    if (disposed || lost) { release(gltf.scene); throw new DOMException('Preview closed or graphics context lost.', 'AbortError'); }
    model = gltf.scene; vrm = gltf.userData.vrm || null;
    // VRM 0.x faces the opposite direction to VRM 1.0.
    if (vrm?.meta?.metaVersion === '0') model.rotation.y = Math.PI;
    scene.add(model); vrm?.update(0);
    const bounds = new THREE.Box3().setFromObject(model);
    modelCentre.copy(bounds.getCenter(new THREE.Vector3()));
    modelSize.copy(bounds.getSize(new THREE.Vector3()));
    fitCamera();
    if (gltf.animations.length) { mixer = new THREE.AnimationMixer(model); mixer.clipAction(gltf.animations[0]).play(); }
    $('placeholder').hidden = true; resize(); refresh();
    return gltf.animations.length;
  }
  function expression(name) {
    let available = false;
    if (vrm?.expressionManager) {
      const target = vrm.expressionManager.getExpression(name);
      if (!target && name !== 'neutral') return false;
      for (const key of ['happy', 'surprised', 'neutral']) vrm.expressionManager.setValue(key, 0);
      if (target) vrm.expressionManager.setValue(name, 0.65);
      available = true;
      vrm.expressionManager.update();
    } else if (model) {
      const groups = { neutral: [], happy: ['happy', 'mouthSmileLeft', 'mouthSmileRight', 'mouthSmile'], surprised: ['surprised', 'browInnerUp', 'jawOpen'] };
      if (name !== 'neutral') {
        model.traverse((node) => { if (node.morphTargetDictionary && Object.keys(node.morphTargetDictionary).some((key) => groups[name].some((x) => x.toLowerCase() === key.toLowerCase()))) available = true; });
        if (!available) return false;
      }
      model.traverse((node) => {
        if (!node.morphTargetDictionary) return;
        const known = [...groups.happy, ...groups.surprised].map((x) => x.toLowerCase());
        for (const [key, index] of Object.entries(node.morphTargetDictionary)) {
          if (known.includes(key.toLowerCase())) node.morphTargetInfluences[index] = 0;
          if (groups[name].some((x) => x.toLowerCase() === key.toLowerCase())) { node.morphTargetInfluences[index] = 0.5; available = true; }
        }
      });
      if (name === 'neutral') available = true;
    }
    render(); return available;
  }
  return { load, clear, refresh, expression, stop, isLost: () => lost, stats: () => ({ renderCount, running: !!frame, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }), dispose() { if (disposed) return; disposed = true; clear(); observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', onVisibility); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); } };
}

async function open(buffer, name, ownSequence) {
  if (ownSequence !== sequence) return;
  if (buffer.byteLength > 64 * 1024 * 1024) throw new Error('This preview accepts models up to 64 MiB.');
  const info = inspect(buffer), isVRM = !!(info.data.extensions?.VRMC_vrm || info.data.extensions?.VRM);
  status('Loading the optional 3D runtime…');
  if (!engine) {
    const created = await createEngine();
    if (ownSequence !== sequence) { created.dispose(); return; }
    engine = created;
  }
  if (ownSequence !== sequence) return;
  const active = engine;
  const clips = await active.load(buffer, isVRM);
  if (ownSequence !== sequence) { active.clear(); return; }
  showMetrics([['Model file', `${(buffer.byteLength / 1e6).toFixed(2)} MB`], ['Indexed geometry estimate', `${info.triangles.toLocaleString()} triangles`], ['Materials / primitives', `${info.data.materials?.length || 0} / ${info.primitives}`], ['Animation clips / max morphs', `${clips} / ${info.morphs}`]]);
  status(`${name} loaded. ${clips ? 'Quiet motion can play the first embedded clip.' : 'No body animation clips are embedded; quiet motion adds VRM blinking only.'}`);
}

async function requestModel(source) {
  const id = ++sequence; pending?.abort(); pending = new AbortController();
  if (engine?.isLost()) { engine.dispose(); engine = null; }
  engine?.clear(); $('placeholder').hidden = false;
  status('Reading model…');
  try {
    const buffer = source instanceof File ? await source.arrayBuffer() : await fetch('/sample-model', { signal: pending.signal }).then((response) => { if (!response.ok) throw new Error('The existing sample is unavailable.'); return response.arrayBuffer(); });
    loading = loading.catch(() => {}).then(() => open(buffer, source instanceof File ? source.name : 'Seed-san · existing sample', id));
    await loading;
  } catch (error) { if (id === sequence && error.name !== 'AbortError') { status(error.message); $('placeholder').hidden = false; } }
}
$('sample').addEventListener('click', () => requestModel('sample'));
$('file').addEventListener('change', (event) => { if (event.target.files[0]) requestModel(event.target.files[0]); event.target.value = ''; });
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
  mode = button.dataset.mode;
  $('preview').classList.toggle('minimised', mode === 'minimised'); $('preview').classList.toggle('projection', mode === 'projection');
  for (const item of document.querySelectorAll('[data-mode]')) item.setAttribute('aria-pressed', String(item === button));
  engine?.refresh();
});
for (const button of document.querySelectorAll('[data-expression]')) button.addEventListener('click', () => {
  const available = engine?.expression(button.dataset.expression);
  $('expression-status').textContent = available ? `${button.textContent} expression applied.` : 'This expression is not mapped in this model. The model has not been modified.';
});
window.addEventListener('pagehide', () => { sequence++; pending?.abort(); engine?.dispose(); engine = null; });
window.addEventListener('pageshow', (event) => { if (event.persisted) { $('placeholder').hidden = false; status('Preview restored. Load a model to start a fresh renderer.'); } });
// Local QA telemetry; no personal or lesson data.
window.mentorLab = { stats: () => engine?.stats() || { renderCount: 0, running: false }, mode: () => mode };
