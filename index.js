const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');


let makeGrey;

Module.onRuntimeInitialized = () => {
    console.log("My C is ready");
    makeGrey = Module.cwrap('make_grey_tile', null, ['number', 'number','number']);
};

upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !makeGrey) return; 

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const jsTime = benchJS(imageData, 200);
            const wasmTime = benchWASM(imageData, 200);

            console.log(`JS   : ${jsTime.toFixed(2)} ms`);
            console.log(`WASM : ${wasmTime.toFixed(2)} ms`);
            console.log(`Speedup : ${(jsTime / wasmTime).toFixed(2)}x`);


            const data = imageData.data;

            const bufferPtr = Module._malloc(data.length);

            Module.HEAPU8.set(data, bufferPtr);
            makeGrey(bufferPtr, 0, data.length);

            const result = new Uint8ClampedArray(data.length); // fresh buffer
            result.set(Module.HEAPU8.subarray(bufferPtr, bufferPtr + data.length)); // copy out
            Module._free(bufferPtr);

            ctx.putImageData(new ImageData(result, canvas.width, canvas.height), 0, 0);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function makeGreyJS(data) {
  for (let i = 0; i < data.length; i += 4) {
    const grey = (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114);
    data[i] = data[i+1] = data[i+2] = grey;
  }
}

function benchJS(imageData, iterations = 50) {
  const data = new Uint8ClampedArray(imageData.data); // copie

  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    makeGreyJS(data);
  }
  const t1 = performance.now();

  return t1 - t0;
}

function benchWASM(imageData, iterations = 50) {
  const data = new Uint8ClampedArray(imageData.data);

  const ptr = Module._malloc(data.length);
  Module.HEAPU8.set(data, ptr);

  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    makeGrey(ptr, 0, data.length);
  }
  const t1 = performance.now();

  Module._free(ptr);
  return t1 - t0;
}

