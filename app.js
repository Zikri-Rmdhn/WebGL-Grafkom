const canvas = document.querySelector("#webglCanvas");
const gl = canvas.getContext("webgl");
if (!gl) {
  console.error("WebGL tidak didukung!");
}

const vertexShaderSource = `
  attribute vec3 a_position;
  attribute vec3 a_color;
  uniform mat4 u_matrix;
  varying vec3 v_color;
  void main() {
    gl_Position = u_matrix * vec4(a_position, 1.0);
    v_color = a_color;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec3 v_color;
  void main() {
    gl_FragColor = vec4(v_color, 1.0);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);
gl.useProgram(program);


const positionLocation = gl.getAttribLocation(program, "a_position");
const colorLocation = gl.getAttribLocation(program, "a_color");
const matrixLocation = gl.getUniformLocation(program, "u_matrix");

//Tabung di sini
function createCylinderVertices(radius, height, segments) {
  const vertices = [];
  const colors = [];
  const indices = [];
  const step = (2 * Math.PI) / segments;

  for (let i = 0; i <= segments; i++) {
    const angle = i * step;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    //Alas
    vertices.push(x, -height / 2, z);
    colors.push(1, 0, 0); // Merah
    //Tutup
    vertices.push(x, height / 2, z);
    colors.push(0, 0, 1); // Biru
  }

  for (let i = 0; i < segments; i++) {
    const p1 = i * 2;
    const p2 = p1 + 1;
    const p3 = (p1 + 2) % (segments * 2);
    const p4 = (p1 + 3) % (segments * 2);

    indices.push(p1, p2, p3, p2, p4, p3);
  }

  return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    indices: new Uint16Array(indices),
  };
}

const radius = 1;
const height = 3;
const segments = 32;
const cylinder = createCylinderVertices(radius, height, segments);


const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cylinder.vertices, gl.STATIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cylinder.colors, gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cylinder.indices, gl.STATIC_DRAW);


gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);


function createViewMatrix(eye, target, up) {
  const zAxis = normalize(subtractVectors(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);

  return [
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1,
  ];
}

function createProjectionMatrix(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);

  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ];
}

function multiplyMatrices(a, b) {
  const result = new Array(16).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      for (let i = 0; i < 4; i++) {
        result[row * 4 + col] += a[row * 4 + i] * b[i * 4 + col];
      }
    }
  }
  return result;
}

function subtractVectors(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v) {
  const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

//Kamera
const eye = [1, 0, 4];
const target = [0, 0, 0];
const up = [0, 1, 0];
const viewMatrix = createViewMatrix(eye, target, up);

const fov = Math.PI / 4;
const aspect = canvas.clientWidth / canvas.clientHeight;
const near = 0.1;
const far = 10.0;
const projectionMatrix = createProjectionMatrix(fov, aspect, near, far);

const modelMatrix = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

const viewProjectionMatrix = multiplyMatrices(projectionMatrix, viewMatrix);
const finalMatrix = multiplyMatrices(viewProjectionMatrix, modelMatrix);


gl.uniformMatrix4fv(matrixLocation, false, finalMatrix);


function drawScene() {
  gl.clearColor(0.2, 0.2, 0.2, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);

  gl.drawElements(gl.TRIANGLES, cylinder.indices.length, gl.UNSIGNED_SHORT, 0);
}


drawScene();