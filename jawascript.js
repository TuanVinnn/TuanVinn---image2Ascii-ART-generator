/* MAIN */
const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const asciiPre = document.getElementById('asciiPre');
const scale = document.getElementById('scale');
const scaleVal = document.getElementById('scaleVal');
const asciiModel = document.getElementById('asciiModel');
const customModel = document.getElementById('customModel');
const copyBtn = document.getElementById('copyBtn');
const info = document.getElementById('info');
const fontSizeSelect = document.getElementById('fontSize');

let uploadedImage = null;    // Image object
let lastGenerated = '';     // cache last ascii (optional)
let charAspectRatio = 0.55; // rasio lebar karakter terhadap tinggi (sesuaikan kalau perlu)

/* safety: ensure ascii model is not empty */
function sanitizeModel(model){
  if(!model || model.length === 0) return ' .:-=+*#%@';
  return model;
}

/* core generate function */
function generateASCIIFromImage(img, scaleValPct, asciiChars){
  // scaleValPct = 10..100
  // adjust width by aspect ratio to avoid "gepeng"
  const scaleRatio = Math.max(0.01, Number(scaleValPct) / 100);
  const targetHeight = Math.max(1, Math.floor(img.height * scaleRatio));
  const targetWidth  = Math.max(1, Math.floor(img.width * scaleRatio * charAspectRatio));

  // draw to canvas for sampling (small)
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  try {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } catch(e){
    console.error('drawImage error', e);
    return;
  }

  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let out = '';
  const charsLen = asciiChars.length;
  for(let y=0;y<canvas.height;y++){
    for(let x=0;x<canvas.width;x++){
      const idx = (y*canvas.width + x) * 4;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      // luminance (perceptual)
      const gray = 0.21*r + 0.72*g + 0.07*b;
      // map gray (0..255) to ascii index (dark->dense end)
      // reverse mapping if ascii starts with light? we assume chars arranged dark->light or vice versa; typical sets are dark->light, so use index accordingly
      const t = Math.floor((gray/255) * (charsLen - 1));
      // we want darker pixel -> character at higher density (rightmost) if asciiChars are ordered from dense->light.
      // many sets are ordered dense->light (e.g. "@%#*+=-:. ")
      // so pick asciiChars[t] but if ordering different user can custom order
      out += asciiChars[t] ?? asciiChars[charsLen-1];
    }
    out += '\n';
  }

  // set ascii text & preview canvas scaled up for visibility
  asciiPre.textContent = out;
  lastGenerated = out;

  // show a larger preview in the canvas element (scale up original small canvas)
  const previewScale = 2; // multiple for previewing the canvas
  const previewW = Math.min(600, canvas.width * previewScale);
  const previewH = Math.min(450, canvas.height * previewScale);
  // create temporary canvas to copy image (we already have small sampling in canvas)
  // To show preview more clearly we'll upscale the image smoothing = false so pixels look blocky
  const previewCanvas = canvas; // reuse canvas element
  previewCanvas.style.display = 'block';
  previewCanvas.width = canvas.width;
  previewCanvas.height = canvas.height;
  // upscale drawing for visibility in CSS we limit max width; keep actual canvas small for performance
  canvas.style.width = previewW + 'px';
  canvas.style.height = previewH + 'px';
  // update info
  info.textContent = `W: ${canvas.width}px  H: ${canvas.height}px  | model len: ${charsLen}`;
}

/* helpers to get current ascii char set */
function currentAsciiChars(){
  const sel = asciiModel.value;
  if(sel === 'CUSTOM'){
    return sanitizeModel(customModel.value);
  } else {
    return sanitizeModel(sel);
  }
}

/* events */

// upload
upload.addEventListener('change', (ev) => {
  const file = ev.target.files && ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      // initial generation
      generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// scale slider (live)
scale.addEventListener('input', () => {
  scaleVal.textContent = `${scale.value}%`;
  if(uploadedImage) generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
});

// model dropdown live
asciiModel.addEventListener('change', () => {
  // if user selected custom, copy current customModel content to input (keeps flow)
  if(asciiModel.value === 'CUSTOM'){
    customModel.focus();
  }
  if(uploadedImage) generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
});

// custom model input live
customModel.addEventListener('input', () => {
  // keep dropdown on Custom
  asciiModel.value = 'CUSTOM';
  if(uploadedImage) generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
});

// copy button
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(lastGenerated || asciiPre.textContent);
    copyBtn.textContent = '✅ Copied!';
    setTimeout(()=>copyBtn.textContent = '📋 Copy ASCII', 1300);
  } catch(e){
    copyBtn.textContent = '❌ Gagal';
    setTimeout(()=>copyBtn.textContent = '📋 Copy ASCII', 1300);
  }
});

// change font size for ASCII output
fontSizeSelect.addEventListener('change', () => {
  const v = Number(fontSizeSelect.value);
  asciiPre.style.fontSize = (v || 6) + 'px';
});

// initial defaults
scaleVal.textContent = `${scale.value}%`;
asciiPre.style.fontSize = fontSizeSelect.value + 'px';
customModel.value = ''; // empty by default, dropdown will pick preselected

// Accessibility: allow paste image via clipboard (optional)
window.addEventListener('paste', (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for(let i=0;i<items.length;i++){
    if(items[i].kind === 'file'){
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          uploadedImage = img;
          generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(blob);
      e.preventDefault();
      return;
    }
  }
});