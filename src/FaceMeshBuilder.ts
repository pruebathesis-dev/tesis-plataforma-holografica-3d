// --- Triangulation Fallback Logic (from HTML integration) ---
const NUM_LANDMARKS = 468;
const OBJ_URL = 'https://raw.githubusercontent.com/google/mediapipe/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj';

// Fallback edges for triangulation (from MediaPipe FACEMESH_TESSELATION)
const FALLBACK_EDGES: [number, number][] = [
  [127,34],[34,139],[139,127],[11,0],[0,37],[37,11],[232,231],[231,120],[120,232],[72,37],[37,39],[39,72],
  [128,121],[121,47],[47,128],[232,121],[121,128],[128,232],[104,69],[69,67],[67,104],[175,171],[171,148],[148,175],
  [118,50],[50,101],[101,118],[73,39],[39,40],[40,73],[9,151],[151,108],[108,9],[48,115],[115,131],[131,48],
  [194,204],[204,211],[211,194],[74,40],[40,185],[185,74],[80,42],[42,183],[183,80],[40,92],[92,186],[186,40],
  [230,229],[229,118],[118,230],[202,212],[212,214],[214,202],[83,18],[18,17],[17,83],[76,61],[61,146],[146,76],
  [160,29],[29,30],[30,160],[56,157],[157,173],[173,56],[106,204],[204,194],[194,106],[135,214],[214,192],[192,135],
  [203,165],[165,98],[98,203],[21,71],[71,68],[68,21],[51,45],[45,4],[4,51],[144,24],[24,23],[23,144],
  [77,146],[146,91],[91,77],[205,50],[50,187],[187,205],[201,200],[200,18],[18,201],[91,106],[106,182],[182,91],
  [90,91],[91,181],[181,90],[85,84],[84,17],[17,85],[206,203],[203,36],[36,206],[148,171],[171,140],[140,148],
  [92,40],[40,39],[39,92],[193,189],[189,244],[244,193],[159,158],[158,28],[28,159],[247,246],[246,161],[161,247],
  [236,3],[3,196],[196,236],[54,68],[68,104],[104,54],[193,168],[168,8],[8,193],[117,228],[228,31],[31,117],
  [189,193],[193,55],[55,189],[98,97],[97,99],[99,98],[126,47],[47,100],[100,126],[166,79],[79,218],[218,166],
  [155,154],[154,26],[26,155],[209,49],[49,131],[131,209],[135,136],[136,150],[150,135],[47,126],[126,217],[217,47],
  [223,52],[52,53],[53,223],[45,51],[51,134],[134,45],[211,170],[170,140],[140,211],[67,69],[69,108],[108,67],
  [43,106],[106,91],[91,43],[230,119],[119,120],[120,230],[226,130],[130,247],[247,226],[63,53],[53,52],[52,63],
  [238,20],[20,242],[242,238],[46,70],[70,156],[156,46],[78,62],[62,96],[96,78],[46,53],[53,63],[63,46],
  [143,34],[34,227],[227,143],[123,117],[117,111],[111,123],[44,125],[125,19],[19,44],[236,134],[134,51],[51,236],
  [216,206],[206,205],[205,216],[154,153],[153,22],[22,154],[39,37],[37,167],[167,39],[200,201],[201,208],[208,200],
  [36,142],[142,100],[100,36],[57,212],[212,202],[202,57],[20,60],[60,99],[99,20],[28,158],[158,157],[157,28],
  [35,226],[226,113],[113,35],[160,159],[159,27],[27,160],[204,202],[202,210],[210,204],[113,225],[225,46],[46,113],
  [43,202],[202,204],[204,43],[62,76],[76,77],[77,62],[137,123],[123,116],[116,137],[41,38],[38,72],[72,41],
  [203,129],[129,142],[142,203],[64,98],[98,240],[240,64],[49,102],[102,64],[64,49],[41,73],[73,74],[74,41],
  [212,216],[216,207],[207,212],[42,74],[74,184],[184,42],[169,170],[170,211],[211,169],[170,149],[149,176],[176,170],
  [105,66],[66,69],[69,105],[122,6],[6,168],[168,122],[123,147],[147,187],[187,123],[96,77],[77,90],[90,96],
  [65,55],[55,107],[107,65],[89,90],[90,180],[180,89],[101,100],[100,120],[120,101],[63,105],[105,104],[104,63],
  [93,137],[137,227],[227,93],[15,86],[86,85],[85,15],[129,102],[102,49],[49,129],[14,87],[87,86],[86,14],
  [55,8],[8,9],[9,55],[100,47],[47,121],[121,100],[145,23],[23,22],[22,145],[88,89],[89,179],[179,88],
  [6,122],[122,196],[196,6],[88,95],[95,96],[96,88],[138,172],[172,136],[136,138],[215,58],[58,172],[172,215],
  [115,48],[48,219],[219,115],[42,80],[80,81],[81,42],[195,3],[3,51],[51,195],[43,146],[146,61],[61,43],
  [171,175],[175,199],[199,171],[81,82],[82,38],[38,81],[53,46],[46,225],[225,53],[144,163],[163,110],[110,144],
  [52,65],[65,66],[66,52],[229,228],[228,117],[117,229],[34,127],[127,234],[234,34],[107,108],[108,69],[69,107],
  [109,108],[108,151],[151,109],[48,64],[64,235],[235,48],[62,78],[78,191],[191,62],[129,209],[209,126],[126,129],
  [111,35],[35,143],[143,111],[117,123],[123,50],[50,117],[222,65],[65,52],[52,222],[19,125],[125,141],[141,19],
  [221,55],[55,65],[65,221],[3,195],[195,197],[197,3],[25,7],[7,33],[33,25],[220,237],[237,44],[44,220],
  [70,71],[71,139],[139,70],[122,193],[193,245],[245,122],[247,130],[130,33],[33,247],[71,21],[21,162],[162,71],
  [170,169],[169,150],[150,170],[188,174],[174,196],[196,188],[216,186],[186,92],[92,216],[2,97],[97,167],[167,2],
  [141,125],[125,241],[241,141],[164,167],[167,37],[37,164],[72,38],[38,12],[12,72],[38,82],[82,13],[13,38],
  [63,68],[68,71],[71,63],[226,35],[35,111],[111,226],[101,50],[50,205],[205,101],[206,92],[92,165],[165,206],
  [209,198],[198,217],[217,209],[165,167],[167,97],[97,165],[220,115],[115,218],[218,220],[133,112],[112,243],[243,133],
  [239,238],[238,241],[241,239],[214,135],[135,169],[169,214],[190,173],[173,133],[133,190],[171,208],[208,32],[32,171],
  [125,44],[44,237],[237,125],[86,87],[87,178],[178,86],[85,86],[86,179],[179,85],[84,85],[85,180],[180,84],
  [83,84],[84,181],[181,83],[201,83],[83,182],[182,201],[137,93],[93,132],[132,137],[76,62],[62,183],[183,76],
  [61,76],[76,184],[184,61],[57,61],[61,185],[185,57],[212,57],[57,186],[186,212],[214,207],[207,187],[187,214],
  [34,143],[143,156],[156,34],[79,239],[239,237],[237,79],[123,137],[137,177],[177,123],[44,1],[1,4],[4,44],
  [201,194],[194,32],[32,201],[64,102],[102,129],[129,64],[213,215],[215,138],[138,213],[59,166],[166,219],[219,59],
  [242,99],[99,97],[97,242],[2,94],[94,141],[141,2],[75,59],[59,235],[235,75],[24,110],[110,228],[228,24],
  [25,130],[130,226],[226,25],[23,24],[24,229],[229,23],[22,23],[23,230],[230,22],[26,22],[22,231],[231,26],
  [112,26],[26,232],[232,112],[189,190],[190,243],[243,189],[221,56],[56,190],[190,221],[28,56],[56,221],[221,28],
  [27,28],[28,222],[222,27],[29,27],[27,223],[223,29],[30,29],[29,224],[224,30],[247,30],[30,225],[225,247],
  [238,79],[79,20],[20,238],[166,59],[59,75],[75,166],[60,75],[75,240],[240,60],[147,177],[177,215],[215,147],
  [20,79],[79,166],[166,20],[187,147],[147,213],[213,187],[112,233],[233,244],[244,112],[233,128],[128,245],[245,233],
  [128,114],[114,188],[188,128],[114,217],[217,174],[174,114],[131,115],[115,220],[220,131],[217,198],[198,236],[236,217],
  [198,131],[131,134],[134,198],[177,132],[132,58],[58,177],[143,35],[35,124],[124,143],[110,163],[163,7],[7,110],
  [228,110],[110,25],[25,228]
];

function buildTriangulationFromEdges(edges: [number, number][]): [number, number, number][] {
  const adj: Record<number, number[]> = {};
  const edgeSet = new Set<string>();
  edges.forEach(([a, b]) => {
    edgeSet.add(a < b ? `${a},${b}` : `${b},${a}`);
    if (!adj[a]) adj[a] = [];
    if (!adj[b]) adj[b] = [];
    adj[a].push(b);
    adj[b].push(a);
  });
  const triangles = new Set<string>();
  edges.forEach(([a, b]) => {
    (adj[a] || []).forEach(c => {
      if (c === b) return;
      const key1 = b < c ? `${b},${c}` : `${c},${b}`;
      const key2 = a < c ? `${a},${c}` : `${c},${a}`;
      if (edgeSet.has(key1) && edgeSet.has(key2)) {
        const tri = [a, b, c].sort((x, y) => x - y).join(',');
        triangles.add(tri);
      }
    });
  });
  return Array.from(triangles).map(t => t.split(',').map(Number) as [number, number, number]);
}

/**
 * Loads triangulation indices from OBJ file or falls back to edge-based triangulation.
 * Returns a Promise resolving to an array of [a, b, c] triangle indices.
 */
export async function loadTriangulationIndices(): Promise<[number, number, number][]> {
  try {
    const res = await fetch(OBJ_URL);
    const text = await res.text();
    const lines = text.split('\n');
    const triangles: [number, number, number][] = [];
    for (const line of lines) {
      if (!line.startsWith('f ')) continue;
      const parts = line.trim().split(/\s+/).slice(1);
      if (parts.length < 3) continue;
      if (!parts[0] || !parts[1] || !parts[2]) continue;
      const aStr = parts[0].split('/')[0];
      const bStr = parts[1].split('/')[0];
      const cStr = parts[2].split('/')[0];
      if (!aStr || !bStr || !cStr) continue;
      const a = parseInt(aStr, 10) - 1;
      const b = parseInt(bStr, 10) - 1;
      const c = parseInt(cStr, 10) - 1;
      if (a >= 0 && a < NUM_LANDMARKS && b >= 0 && b < NUM_LANDMARKS && c >= 0 && c < NUM_LANDMARKS) {
        triangles.push([a, b, c]);
      }
    }
    if (triangles.length > 0) {
      // console.log('Triangulación OBJ cargada:', triangles.length, 'triángulos');
      return triangles;
    }
  } catch (e: any) {
    // console.warn('No se pudo cargar OBJ, usando triangulación desde aristas:', e.message);
  }
  // Fallback
  const fallback = buildTriangulationFromEdges(FALLBACK_EDGES);
  // console.log('Triangulación desde aristas:', fallback.length, 'triángulos');
  return fallback;
}
import * as THREE from 'three';
import { FACEMESH_LANDMARK_COUNT } from './FaceTracker';

/**
 * FaceMeshBuilder
 * - Defines a fixed triangle topology for the 468 MediaPipe FaceMesh landmarks.
 * - Builds a THREE.BufferGeometry with a stable index buffer.
 * - Provides an allocation-free normal recomputation for real-time updates.
 *
 * Important academic constraint:
 * - The mesh is **procedural**: vertices come directly from landmarks, and faces
 *   come from a fixed triangulation over landmark indices (no external 3D model).
 */
export class FaceMeshBuilder {
  public readonly geometry: THREE.BufferGeometry;
  public readonly position: THREE.BufferAttribute;
  public readonly normal: THREE.BufferAttribute;
  public readonly index: THREE.BufferAttribute;
  public readonly uv: THREE.BufferAttribute;

  // Scratch buffers for normal computation (allocation-free per-frame).
  private readonly normals: Float32Array;
  private readonly positions: Float32Array;

  // Precomputed unique edges for Laplacian smoothing (allocation-free per-frame).
  // Stored as pairs [a0,b0,a1,b1,...] where each pair is an undirected edge.
  private readonly edges: Uint16Array;
  private readonly neighborSum: Float32Array;
  private readonly neighborCount: Uint16Array;
  private readonly smoothScratch: Float32Array;
  private uvInitialized = false;
  private readonly uvSmoothing: number;

  public constructor(uvSmoothing = 0.0) {
    this.uvSmoothing = clamp01(uvSmoothing);
    this.positions = new Float32Array(FACEMESH_LANDMARK_COUNT * 3);
    this.normals = new Float32Array(FACEMESH_LANDMARK_COUNT * 3);

    // Precompute an undirected, de-duplicated edge list once.
    // This supports light Laplacian smoothing to suppress high-frequency landmark noise,
    // producing a more "skin-like" continuous surface without changing topology.
    this.edges = buildUniqueEdges(FACEMESH_TRIANGULATION);
    this.neighborSum = new Float32Array(FACEMESH_LANDMARK_COUNT * 3);
    this.neighborCount = new Uint16Array(FACEMESH_LANDMARK_COUNT);
    this.smoothScratch = new Float32Array(FACEMESH_LANDMARK_COUNT * 3);

    this.position = new THREE.BufferAttribute(this.positions, 3);
    this.position.setUsage(THREE.DynamicDrawUsage);

    this.normal = new THREE.BufferAttribute(this.normals, 3);
    this.normal.setUsage(THREE.DynamicDrawUsage);

    this.index = new THREE.BufferAttribute(FACEMESH_TRIANGULATION, 1);

    //  UV mapping: Procedural UVs for FaceMesh
    // Map normalized landmark coordinates to UVs
    const uvArray = new Float32Array(FACEMESH_LANDMARK_COUNT * 2);
    for (let i = 0; i < FACEMESH_LANDMARK_COUNT; i++) {
      // Default: x/y in [-1,1] → map to [0,1]
      // Updated in setUvsFromLandmarks2D each frame
      uvArray[2 * i] = 0.5; // placeholder, will update
      uvArray[2 * i + 1] = 0.5;
    }
    const uv = new THREE.BufferAttribute(uvArray, 2);
    uv.setUsage(THREE.DynamicDrawUsage);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', this.position);
    geometry.setAttribute('normal', this.normal);
    geometry.setAttribute('uv', uv);
    geometry.setIndex(this.index);
    geometry.computeBoundingSphere();
    this.geometry = geometry;
    this.uv = uv;
  }

  /**
   * Copies landmark coordinates (packed xyzxyz...) into the geometry position buffer.
   * The caller is responsible for any additional deformation (e.g. audio-driven).
   */
  /**
   * Copies 3D landmark coordinates and assigns UVs from original 2D landmarks.
   * @param positions3D Float32Array of 3D positions (length = FACEMESH_LANDMARK_COUNT * 3)
   * @param originalLandmarks2D Array of {x, y} in [0,1] from MediaPipe
   */
  public setPositionsFromLandmarks(positions3D: Float32Array): void {
    if (positions3D.length !== this.positions.length) {
      throw new Error(`Expected positions3D length ${this.positions.length}, got ${positions3D.length}.`);
    }
    for (let i = 0; i < NUM_LANDMARKS; i++) {
      const px = positions3D[3 * i];
      const py = positions3D[3 * i + 1];
      const pz = positions3D[3 * i + 2];
      this.positions[3 * i] = px !== undefined ? px : 0;
      this.positions[3 * i + 1] = py !== undefined ? py : 0;
      this.positions[3 * i + 2] = pz !== undefined ? pz : 0;
    }
    this.position.needsUpdate = true;
  }

  /**
   * UV mapping: direct 1:1 projection from landmarks to video texture.
   */
  public setUvsFromLandmarks2D(
    originalLandmarks2D: { x: number; y: number }[],
    options: { selfieMode?: boolean } = {}
  ): void {
    const selfieMode = options.selfieMode ?? false;
    if (!originalLandmarks2D || originalLandmarks2D.length !== NUM_LANDMARKS) {
      throw new Error(`Expected originalLandmarks2D length ${NUM_LANDMARKS}, got ${originalLandmarks2D?.length}.`);
    }

    const a = this.uvSmoothing;
    for (let i = 0; i < NUM_LANDMARKS; i++) {
      const lm = originalLandmarks2D[i];
      const rawX = lm && lm.x !== undefined ? lm.x : 0.5;
      const rawY = lm && lm.y !== undefined ? lm.y : 0.5;
      const targetU = clamp01(selfieMode ? 1 - rawX : rawX);
      const targetV = clamp01(1 - rawY);

      const bi = 2 * i;
      if (!this.uvInitialized || a <= 0) {
        this.uv.array[bi] = targetU;
        this.uv.array[bi + 1] = targetV;
      } else {
        this.uv.array[bi] = a * this.uv.array[bi]! + (1 - a) * targetU;
        this.uv.array[bi + 1] = a * this.uv.array[bi + 1]! + (1 - a) * targetV;
      }
    }

    this.uvInitialized = true;
    this.uv.needsUpdate = true;
  }

  /**
   * Light Laplacian smoothing to reduce high-frequency landmark noise.
   *
   * This is intentionally conservative:
   * - It preserves overall facial proportions (low alpha)
   * - It improves visual continuity (reduces "polygon noise" and micro-jitter)
   *
   * Performance:
   * - O(E + V) per iteration with E edges and V vertices
   * - Implemented with preallocated typed arrays (no per-frame allocations)
   */
  public smoothPositions(iterations: number, alpha: number): void {
    const iters = clampInt(iterations, 0, 4);
    const a = clamp01(alpha);
    if (iters === 0 || a <= 1e-6) return;

    const pos = this.positions;
    const sum = this.neighborSum;
    const cnt = this.neighborCount;
    const scratch = this.smoothScratch;
    const edges = this.edges;

    for (let iter = 0; iter < iters; iter++) {
      sum.fill(0);
      cnt.fill(0);

      // Accumulate neighbor sums from the edge list.
      for (let e = 0; e < edges.length; e += 2) {
        const i0 = edges[e]!;
        const i1 = edges[e + 1]!;

        const a0 = 3 * i0;
        const a1 = 3 * i1;

        sum[a0] = sum[a0]! + pos[a1]!;
        sum[a0 + 1] = sum[a0 + 1]! + pos[a1 + 1]!;
        sum[a0 + 2] = sum[a0 + 2]! + pos[a1 + 2]!;
        cnt[i0] = (cnt[i0] ?? 0) + 1;

        sum[a1] = sum[a1]! + pos[a0]!;
        sum[a1 + 1] = sum[a1 + 1]! + pos[a0 + 1]!;
        sum[a1 + 2] = sum[a1 + 2]! + pos[a0 + 2]!;
        cnt[i1] = (cnt[i1] ?? 0) + 1;
      }

      // Blend each vertex toward the average of its neighbors.
      for (let i = 0; i < FACEMESH_LANDMARK_COUNT; i++) {
        const bi = 3 * i;
        const c = cnt[i]!;
        if (c > 0) {
          const inv = 1.0 / c;
          const ax = sum[bi]! * inv;
          const ay = sum[bi + 1]! * inv;
          const az = sum[bi + 2]! * inv;

          scratch[bi] = (1 - a) * pos[bi]! + a * ax;
          scratch[bi + 1] = (1 - a) * pos[bi + 1]! + a * ay;
          scratch[bi + 2] = (1 - a) * pos[bi + 2]! + a * az;
        } else {
          scratch[bi] = pos[bi]!;
          scratch[bi + 1] = pos[bi + 1]!;
          scratch[bi + 2] = pos[bi + 2]!;
        }
      }

      pos.set(scratch);
    }

    this.position.needsUpdate = true;
  }

  /**
   * Recomputes vertex normals in-place without allocating.
   * Complexity is O(T) where T is number of triangles; with 468 vertices this is cheap enough
   * for real-time (and avoids the allocations inside THREE.BufferGeometry.computeVertexNormals()).
   */
  public recomputeNormals(): void {
    const pos = this.positions;
    const nor = this.normals;
    const idx = FACEMESH_TRIANGULATION;

    // Clear normals (accumulation buffer).
    nor.fill(0);

    // Accumulate face normals into vertex normals.
    // For triangle (i0,i1,i2):
    //   e1 = p1 - p0, e2 = p2 - p0
    //   n = e1 × e2
    // and we add n to each vertex normal accumulator.
    for (let t = 0; t < idx.length; t += 3) {
      const i0 = idx[t]!;
      const i1 = idx[t + 1]!;
      const i2 = idx[t + 2]!;

      const a = 3 * i0;
      const b = 3 * i1;
      const c = 3 * i2;

      const ax = pos[a]!;
      const ay = pos[a + 1]!;
      const az = pos[a + 2]!;

      const bx = pos[b]!;
      const by = pos[b + 1]!;
      const bz = pos[b + 2]!;

      const cx = pos[c]!;
      const cy = pos[c + 1]!;
      const cz = pos[c + 2]!;

      const e1x = bx - ax;
      const e1y = by - ay;
      const e1z = bz - az;

      const e2x = cx - ax;
      const e2y = cy - ay;
      const e2z = cz - az;

      // Cross product e1 × e2
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;

      nor[a] = nor[a]! + nx;
      nor[a + 1] = nor[a + 1]! + ny;
      nor[a + 2] = nor[a + 2]! + nz;

      nor[b] = nor[b]! + nx;
      nor[b + 1] = nor[b + 1]! + ny;
      nor[b + 2] = nor[b + 2]! + nz;

      nor[c] = nor[c]! + nx;
      nor[c + 1] = nor[c + 1]! + ny;
      nor[c + 2] = nor[c + 2]! + nz;
    }

    // Normalize accumulated normals.
    for (let i = 0; i < nor.length; i += 3) {
      const nx = nor[i] ?? 0;
      const ny = nor[i + 1] ?? 0;
      const nz = nor[i + 2] ?? 0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 1e-12) {
        nor[i] = nx / len;
        nor[i + 1] = ny / len;
        nor[i + 2] = nz / len;
      } else {
        // Fallback to a stable normal; avoids NaNs during tracking loss.
        nor[i] = 0;
        nor[i + 1] = 0;
        nor[i + 2] = 1;
      }
    }

    this.normal.needsUpdate = true;
  }
}

function buildUniqueEdges(triangles: Uint16Array): Uint16Array {
  // MediaPipe indices are in [0..467], so 9 bits are enough to encode a vertex id.
  // We encode an undirected edge (min,max) into a single 18-bit integer key:
  // key = (min << 9) | max
  const seen = new Set<number>();
  const pairs: number[] = [];

  for (let t = 0; t < triangles.length; t += 3) {
    const i0 = triangles[t]!;
    const i1 = triangles[t + 1]!;
    const i2 = triangles[t + 2]!;

    pushEdge(i0, i1, seen, pairs);
    pushEdge(i1, i2, seen, pairs);
    pushEdge(i2, i0, seen, pairs);
  }

  return new Uint16Array(pairs);
}

function pushEdge(a: number, b: number, seen: Set<number>, pairs: number[]): void {
  const lo = a < b ? a : b;
  const hi = a < b ? b : a;
  const key = (lo << 9) | hi;
  if (seen.has(key)) return;
  seen.add(key);
  pairs.push(lo, hi);
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function clampInt(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v | 0;
}

/**
 * MediaPipe FaceMesh triangulation (468-vertex topology).
 * Each consecutive triple defines one triangle.
 *
 * Source: "FaceMeshFaceGeometry" helper by @spite (MIT).
 * It matches the common FaceMesh landmark indexing and is widely used for
 * constructing an indexed triangle mesh from the 468 landmarks.
 */
export const FACEMESH_TRIANGULATION: Uint16Array = new Uint16Array([
  127, 34, 139, 11, 0, 37, 232, 231, 120, 72, 37, 39, 128, 121, 47, 232, 121, 128, 104, 69, 67, 175, 171,
  148, 157, 154, 155, 118, 50, 101, 73, 39, 40, 9, 151, 108, 48, 115, 131, 194, 204, 211, 74, 40, 185, 80,
  42, 183, 40, 92, 186, 230, 229, 118, 202, 212, 214, 83, 18, 17, 76, 61, 146, 160, 29, 30, 56, 157, 173,
  106, 204, 194, 135, 214, 192, 203, 165, 98, 21, 71, 68, 51, 45, 4, 144, 24, 23, 77, 146, 91, 205, 50,
  187, 201, 200, 18, 91, 106, 182, 90, 91, 181, 85, 84, 17, 206, 203, 36, 148, 171, 140, 92, 40, 39, 193,
  189, 244, 159, 158, 28, 247, 246, 161, 236, 3, 196, 54, 68, 104, 193, 168, 8, 117, 228, 31, 189, 193, 55,
  98, 97, 99, 126, 47, 100, 166, 79, 218, 155, 154, 26, 209, 49, 131, 135, 136, 150, 47, 126, 217, 223, 52,
  53, 45, 51, 134, 211, 170, 140, 67, 69, 108, 43, 106, 91, 230, 119, 120, 226, 130, 247, 63, 53, 52, 238,
  20, 242, 46, 70, 156, 78, 62, 96, 46, 53, 63, 143, 34, 227, 173, 155, 133, 123, 117, 111, 44, 125, 19,
  236, 134, 51, 216, 206, 205, 154, 153, 22, 39, 37, 167, 200, 201, 208, 36, 142, 100, 57, 212, 202, 20, 60,
  99, 28, 158, 157, 35, 226, 113, 160, 159, 27, 204, 202, 210, 113, 225, 46, 43, 202, 204, 62, 76, 77, 137,
  123, 116, 41, 38, 72, 203, 129, 142, 64, 98, 240, 49, 102, 64, 41, 73, 74, 212, 216, 207, 42, 74, 184,
  169, 170, 211, 170, 149, 176, 105, 66, 69, 122, 6, 168, 123, 147, 187, 96, 77, 90, 65, 55, 107, 89, 90,
  180, 101, 100, 120, 63, 105, 104, 93, 137, 227, 15, 86, 85, 129, 102, 49, 14, 87, 86, 55, 8, 9, 100, 47,
  121, 145, 23, 22, 88, 89, 179, 6, 122, 196, 88, 95, 96, 138, 172, 136, 215, 58, 172, 115, 48, 219, 42, 80,
  81, 195, 3, 51, 43, 146, 61, 171, 175, 199, 81, 82, 38, 53, 46, 225, 144, 163, 110, 246, 33, 7, 52, 65,
  66, 229, 228, 117, 34, 127, 234, 107, 108, 69, 109, 108, 151, 48, 64, 235, 62, 78, 191, 129, 209, 126,
  111, 35, 143, 163, 161, 246, 117, 123, 50, 222, 65, 52, 19, 125, 141, 221, 55, 65, 3, 195, 197, 25, 7, 33,
  220, 237, 44, 70, 71, 139, 122, 193, 245, 247, 130, 33, 71, 21, 162, 153, 158, 159, 170, 169, 150, 188,
  174, 196, 216, 186, 92, 144, 160, 161, 2, 97, 167, 141, 125, 241, 164, 167, 37, 72, 38, 12, 145, 159, 160,
  38, 82, 13, 63, 68, 71, 226, 35, 111, 158, 153, 154, 101, 50, 205, 206, 92, 165, 209, 198, 217, 165, 167,
  97, 220, 115, 218, 133, 112, 243, 239, 238, 241, 214, 135, 169, 190, 173, 133, 171, 208, 32, 125, 44, 237,
  86, 87, 178, 85, 86, 179, 84, 85, 180, 83, 84, 181, 201, 83, 182, 137, 93, 132, 76, 62, 183, 61, 76, 184,
  57, 61, 185, 212, 57, 186, 214, 207, 187, 34, 143, 156, 79, 239, 237, 123, 137, 177, 44, 1, 4, 201, 194,
  32, 64, 102, 129, 213, 215, 138, 59, 166, 219, 242, 99, 97, 2, 94, 141, 75, 59, 235, 24, 110, 228, 25,
  130, 226, 23, 24, 229, 22, 23, 230, 26, 22, 231, 112, 26, 232, 189, 190, 243, 221, 56, 190, 28, 56, 221,
  27, 28, 222, 29, 27, 223, 30, 29, 224, 247, 30, 225, 238, 79, 20, 166, 59, 75, 60, 75, 240, 147, 177, 215,
  20, 79, 166, 187, 147, 213, 112, 233, 244, 233, 128, 245, 128, 114, 188, 114, 217, 174, 131, 115, 220, 217,
  198, 236, 198, 131, 134, 177, 132, 58, 143, 35, 124, 110, 163, 7, 228, 110, 25, 356, 389, 368, 11, 302, 267,
  452, 350, 349, 302, 303, 269, 357, 343, 277, 452, 453, 357, 333, 332, 297, 175, 152, 377, 384, 398, 382,
  347, 348, 330, 303, 304, 270, 9, 336, 337, 278, 279, 360, 418, 262, 431, 304, 408, 409, 310, 415, 407, 270,
  409, 410, 450, 348, 347, 422, 430, 434, 313, 314, 17, 306, 307, 375, 387, 388, 260, 286, 414, 398, 335, 406,
  418, 364, 367, 416, 423, 358, 327, 251, 284, 298, 281, 5, 4, 373, 374, 253, 307, 320, 321, 425, 427, 411,
  421, 313, 18, 321, 405, 406, 320, 404, 405, 315, 16, 17, 426, 425, 266, 377, 400, 369, 322, 391, 269, 417,
  465, 464, 386, 257, 258, 466, 260, 388, 456, 399, 419, 284, 332, 333, 417, 285, 8, 346, 340, 261, 413, 441,
  285, 327, 460, 328, 355, 371, 329, 392, 439, 438, 382, 341, 256, 429, 420, 360, 364, 394, 379, 277, 343,
  437, 443, 444, 283, 275, 440, 363, 431, 262, 369, 297, 338, 337, 273, 375, 321, 450, 451, 349, 446, 342,
  467, 293, 334, 282, 458, 461, 462, 276, 353, 383, 308, 324, 325, 276, 300, 293, 372, 345, 447, 382, 398,
  362, 352, 345, 340, 274, 1, 19, 456, 248, 281, 436, 427, 425, 381, 256, 252, 269, 391, 393, 200, 199, 428,
  266, 330, 329, 287, 273, 422, 250, 462, 328, 258, 286, 384, 265, 353, 342, 387, 259, 257, 424, 431, 430,
  342, 353, 276, 273, 335, 424, 292, 325, 307, 366, 447, 345, 271, 303, 302, 423, 266, 371, 294, 455, 460,
  279, 278, 294, 271, 272, 304, 432, 434, 427, 272, 407, 408, 394, 430, 431, 395, 369, 400, 334, 333, 299,
  351, 417, 168, 352, 280, 411, 325, 319, 320, 295, 296, 336, 319, 403, 404, 330, 348, 349, 293, 298, 333,
  323, 454, 447, 15, 16, 315, 358, 429, 279, 14, 15, 316, 285, 336, 9, 329, 349, 350, 374, 380, 252, 318,
  402, 403, 6, 197, 419, 318, 319, 325, 367, 364, 365, 435, 367, 397, 344, 438, 439, 272, 271, 311, 195, 5,
  281, 273, 287, 291, 396, 428, 199, 311, 271, 268, 283, 444, 445, 373, 254, 339, 263, 466, 249, 282, 334,
  296, 449, 347, 346, 264, 447, 454, 336, 296, 299, 338, 10, 151, 278, 439, 455, 292, 407, 415, 358, 371,
  355, 340, 345, 372, 390, 249, 466, 346, 347, 280, 442, 443, 282, 19, 94, 370, 441, 442, 295, 248, 419, 197,
  263, 255, 359, 440, 275, 274, 300, 383, 368, 351, 412, 465, 263, 467, 466, 301, 368, 389, 380, 374, 386,
  395, 378, 379, 412, 351, 419, 436, 426, 322, 373, 390, 388, 2, 164, 393, 370, 462, 461, 164, 0, 267, 302,
  11, 12, 374, 373, 387, 268, 12, 13, 293, 300, 301, 446, 261, 340, 385, 384, 381, 330, 266, 425, 426, 423,
  391, 429, 355, 437, 391, 327, 326, 440, 457, 438, 341, 382, 362, 459, 457, 461, 434, 430, 394, 414, 463,
  362, 396, 369, 262, 354, 461, 457, 316, 403, 402, 315, 404, 403, 314, 405, 404, 313, 406, 405, 421, 418,
  406, 366, 401, 361, 306, 408, 407, 291, 409, 408, 287, 410, 409, 432, 436, 410, 434, 416, 411, 264, 368,
  383, 309, 438, 457, 352, 376, 401, 274, 275, 4, 421, 428, 262, 294, 327, 358, 433, 416, 367, 289, 455,
  439, 462, 370, 326, 2, 326, 370, 305, 460, 455, 254, 449, 448, 255, 261, 446, 253, 450, 449, 252, 451, 450,
  256, 452, 451, 341, 453, 452, 413, 464, 463, 441, 413, 414, 258, 442, 441, 257, 443, 442, 259, 444, 443,
  260, 445, 444, 467, 342, 445, 459, 458, 250, 289, 392, 290, 290, 328, 460, 376, 433, 435, 250, 290, 392,
  411, 416, 433, 341, 463, 464, 453, 464, 465, 357, 465, 412, 343, 412, 399, 360, 363, 440, 437, 399, 456,
  420, 456, 363, 401, 435, 288, 372, 383, 353, 339, 255, 249, 448, 261, 255, 133, 243, 190, 133, 155, 112,
  33, 246, 247, 33, 130, 25, 398, 384, 286, 362, 398, 414, 362, 463, 341, 263, 359, 467, 263, 249, 255, 466,
  467, 260, 75, 60, 166, 238, 239, 79, 162, 127, 139, 72, 11, 37, 121, 232, 120, 73, 72, 39, 114, 128, 47,
  233, 232, 128, 103, 104, 67, 152, 175, 148, 173, 157, 155, 119, 118, 101, 74, 73, 40, 107, 9, 108, 49, 48,
  131, 32, 194, 211, 184, 74, 185, 191, 80, 183, 185, 40, 186, 119, 230, 118, 210, 202, 214, 84, 83, 17, 77,
  76, 146, 161, 160, 30, 190, 56, 173, 182, 106, 194, 138, 135, 192, 129, 203, 98, 54, 21, 68, 5, 51, 4,
  145, 144, 23, 90, 77, 91, 207, 205, 187, 83, 201, 18, 181, 91, 182, 180, 90, 181, 16, 85, 17, 205, 206,
  36, 176, 148, 140, 165, 92, 39, 245, 193, 244, 27, 159, 28, 30, 247, 161, 174, 236, 196, 103, 54, 104, 55,
  193, 8, 111, 117, 31, 221, 189, 55, 240, 98, 99, 142, 126, 100, 219, 166, 218, 112, 155, 26, 198, 209, 131,
  169, 135, 150, 114, 47, 217, 224, 223, 53, 220, 45, 134, 32, 211, 140, 109, 67, 108, 146, 43, 91, 231, 230,
  120, 113, 226, 247, 105, 63, 52, 241, 238, 242, 124, 46, 156, 95, 78, 96, 70, 46, 63, 116, 143, 227, 116,
  123, 111, 1, 44, 19, 3, 236, 51, 207, 216, 205, 26, 154, 22, 165, 39, 167, 199, 200, 208, 101, 36, 100, 43,
  57, 202, 242, 20, 99, 56, 28, 157, 124, 35, 113, 29, 160, 27, 211, 204, 210, 124, 113, 46, 106, 43, 204,
  96, 62, 77, 227, 137, 116, 73, 41, 72, 36, 203, 142, 235, 64, 240, 48, 49, 64, 42, 41, 74, 214, 212, 207,
  183, 42, 184, 210, 169, 211, 140, 170, 176, 104, 105, 69, 193, 122, 168, 50, 123, 187, 89, 96, 90, 66, 65,
  107, 179, 89, 180, 119, 101, 120, 68, 63, 104, 234, 93, 227, 16, 15, 85, 209, 129, 49, 15, 14, 86, 107,
  55, 9, 120, 100, 121, 153, 145, 22, 178, 88, 179, 197, 6, 196, 89, 88, 96, 135, 138, 136, 138, 215, 172,
  218, 115, 219, 41, 42, 81, 5, 195, 51, 57, 43, 61, 208, 171, 199, 41, 81, 38, 224, 53, 225, 24, 144, 110,
  105, 52, 66, 118, 229, 117, 227, 34, 234, 66, 107, 69, 10, 109, 151, 219, 48, 235, 183, 62, 191, 142, 129,
  126, 116, 111, 143, 7, 163, 246, 118, 117, 50, 223, 222, 52, 94, 19, 141, 222, 221, 65, 196, 3, 197, 45,
  220, 44, 156, 70, 139, 188, 122, 245, 139, 71, 162, 145, 153, 159, 149, 170, 150, 122, 188, 196, 206, 216,
  92, 163, 144, 161, 164, 2, 167, 242, 141, 241, 0, 164, 37, 11, 72, 12, 144, 145, 160, 12, 38, 13, 70, 63,
  71, 31, 226, 111, 157, 158, 154, 36, 101, 205, 203, 206, 165, 126, 209, 217, 98, 165, 97, 237, 220, 218,
  237, 239, 241, 210, 214, 169, 140, 171, 32, 241, 125, 237, 179, 86, 178, 180, 85, 179, 181, 84, 180, 182,
  83, 181, 194, 201, 182, 177, 137, 132, 184, 76, 183, 185, 61, 184, 186, 57, 185, 216, 212, 186, 192, 214,
  187, 139, 34, 156, 218, 79, 237, 147, 123, 177, 45, 44, 4, 208, 201, 32, 98, 64, 129, 192, 213, 138, 235,
  59, 219, 141, 242, 97, 97, 2, 141, 240, 75, 235, 229, 24, 228, 31, 25, 226, 230, 23, 229, 231, 22, 230,
  232, 26, 231, 233, 112, 232, 244, 189, 243, 189, 221, 190, 222, 28, 221, 223, 27, 222, 224, 29, 223, 225,
  30, 224, 113, 247, 225, 99, 60, 240, 213, 147, 215, 60, 20, 166, 192, 187, 213, 243, 112, 244, 244, 233,
  245, 245, 128, 188, 188, 114, 174, 134, 131, 220, 174, 217, 236, 236, 198, 134, 215, 177, 58, 156, 143,
  124, 25, 110, 7, 31, 228, 25, 264, 356, 368, 0, 11, 267, 451, 452, 349, 267, 302, 269, 350, 357, 277, 350,
  452, 357, 299, 333, 297, 396, 175, 377, 381, 384, 382, 280, 347, 330, 269, 303, 270, 151, 9, 337, 344, 278,
  360, 424, 418, 431, 270, 304, 409, 272, 310, 407, 322, 270, 410, 449, 450, 347, 432, 422, 434, 18, 313, 17,
  291, 306, 375, 259, 387, 260, 424, 335, 418, 434, 364, 416, 391, 423, 327, 301, 251, 298, 275, 281, 4, 254,
  373, 253, 375, 307, 321, 280, 425, 411, 200, 421, 18, 335, 321, 406, 321, 320, 405, 314, 315, 17, 423, 426,
  266, 396, 377, 369, 270, 322, 269, 413, 417, 464, 385, 386, 258, 248, 456, 419, 298, 284, 333, 168, 417, 8,
  448, 346, 261, 417, 413, 285, 326, 327, 328, 277, 355, 329, 309, 392, 438, 381, 382, 256, 279, 429, 360, 365,
  364, 379, 355, 277, 437, 282, 443, 283, 281, 275, 363, 395, 431, 369, 299, 297, 337, 335, 273, 321, 348, 450,
  349, 359, 446, 467, 283, 293, 282, 250, 458, 462, 300, 276, 383, 292, 308, 325, 283, 276, 293, 264, 372, 447,
  346, 352, 340, 354, 274, 19, 363, 456, 281, 426, 436, 425, 380, 381, 252, 267, 269, 393, 421, 200, 428, 371,
  266, 329, 432, 287, 422, 290, 250, 328, 385, 258, 384, 446, 265, 342, 386, 387, 257, 422, 424, 430, 445, 342,
  276, 422, 273, 424, 306, 292, 307, 352, 366, 345, 268, 271, 302, 358, 423, 371, 327, 294, 460, 331, 279, 294,
  303, 271, 304, 436, 432, 427, 304, 272, 408, 395, 394, 431, 378, 395, 400, 296, 334, 299, 6, 351, 168, 376,
  352, 411, 307, 325, 320, 285, 295, 336, 320, 319, 404, 329, 330, 349, 334, 293, 333, 366, 323, 447, 316, 15,
  315, 331, 358, 279, 317, 14, 316, 8, 285, 9, 277, 329, 350, 253, 374, 252, 319, 318, 403, 351, 6, 419, 324,
  318, 325, 397, 367, 365, 288, 435, 397, 278, 344, 439, 310, 272, 311, 248, 195, 281, 375, 273, 291, 175, 396,
  199, 312, 311, 268, 276, 283, 445, 390, 373, 339, 295, 282, 296, 448, 449, 346, 356, 264, 454, 337, 336, 299,
  337, 338, 151, 294, 278, 455, 308, 292, 415, 429, 358, 355, 265, 340, 372, 388, 390, 466, 352, 346, 280, 295,
  442, 282, 354, 19, 370, 285, 441, 295, 195, 248, 197, 457, 440, 274, 301, 300, 368, 417, 351, 465, 251, 301,
  389, 385, 380, 386, 394, 395, 379, 399, 412, 419, 410, 436, 322, 387, 373, 388, 326, 2, 393, 354, 370, 461,
  393, 164, 267, 268, 302, 12, 386, 374, 387, 312, 268, 13, 298, 293, 301, 265, 446, 340, 380, 385, 381, 280,
  330, 425, 322, 426, 391, 420, 429, 437, 393, 391, 326, 344, 440, 438, 458, 459, 461, 364, 434, 394, 428, 396,
  262, 274, 354, 457, 317, 316, 402, 316, 315, 403, 315, 314, 404, 314, 313, 405, 313, 421, 406, 323, 366, 361,
  292, 306, 407, 306, 291, 408, 291, 287, 409, 287, 432, 410, 427, 434, 411, 372, 264, 383, 459, 309, 457, 366,
  352, 401, 1, 274, 4, 418, 421, 262, 331, 294, 358, 435, 433, 367, 392, 289, 439, 328, 462, 326, 94, 2, 370,
  289, 305, 455, 339, 254, 448, 359, 255, 446, 254, 253, 449, 253, 252, 450, 252, 256, 451, 256, 341, 452, 414,
  413, 463, 286, 441, 414, 286, 258, 441, 258, 257, 442, 257, 259, 443, 259, 260, 444, 260, 467, 445, 309, 459,
  250, 305, 289, 290, 305, 290, 460, 401, 376, 435, 309, 250, 392, 376, 411, 433, 453, 341, 464, 357, 453, 465,
  343, 357, 412, 437, 343, 399, 344, 360, 440, 420, 437, 456, 360, 420, 363, 361, 401, 288, 265, 372, 353, 390,
  339, 249, 339, 448, 255
]);

