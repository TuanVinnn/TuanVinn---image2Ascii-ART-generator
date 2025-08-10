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

/* Tambahan: daftar semua model ASCII bersih */
const asciiModelsList = [
  { name: "Klasik", chars: "@%#*+=-:. " },
  { name: "Detail Tinggi", chars: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,^`'. " },
  { name: "Block Style", chars: "¦¦¦¦" },
  { name: "Binary", chars: "01" },
  { name: "Light to Dark", chars: " .:-=+*#%@" },
  { name: "Half Block", chars: "¦_¯" },
  { name: "Symbol Mix", chars: "¦¦¦¦@%#*+=-:. " },
  { name: "Emoji Style", chars: "???????" },
  { name: "CUSTOM", chars: "" }
];

// Masukkan semua model ke dropdown HTML
asciiModelsList.forEach(m => {
  const opt = document.createElement("option");
  opt.value = m.chars === "" ? "CUSTOM" : m.chars;
  opt.textContent = m.name;
  asciiModel.appendChild(opt);
});

/* safety: ensure ascii model is not empty */
function sanitizeModel(model){
  if(!model || model.length === 0) return ' .:-=+*#%@';
  return model;
}

/* core generate function */
function generateASCIIFromImage(img, scaleValPct, asciiChars){
  const scaleRatio = Math.max(0.01, Number(scaleValPct) / 100);
  const targetHeight = Math.max(1, Math.floor(img.height * scaleRatio));
  const targetWidth  = Math.max(1, Math.floor(img.width * scaleRatio * charAspectRatio));

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
      const gray = 0.21*r + 0.72*g + 0.07*b;
      const t = Math.floor((gray/255) * (charsLen - 1));
      out += asciiChars[t] ?? asciiChars[charsLen-1];
    }
    out += '\n';
  }

  asciiPre.textContent = out;
  lastGenerated = out;

  const previewScale = 2;
  const previewW = Math.min(600, canvas.width * previewScale);
  const previewH = Math.min(450, canvas.height * previewScale);
  const previewCanvas = canvas;
  previewCanvas.style.display = 'block';
  previewCanvas.width = canvas.width;
  previewCanvas.height = canvas.height;
  canvas.style.width = previewW + 'px';
  canvas.style.height = previewH + 'px';
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
upload.addEventListener('change', (ev) => {
  const file = ev.target.files && ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

scale.addEventListener('input', () => {
  scaleVal.textContent = `${scale.value}%`;
  if(uploadedImage) generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
});

asciiModel.addEventListener('change', () => {
  if(asciiModel.value === 'CUSTOM'){
    customModel.focus();
  }
  if(uploadedImage) generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
});

customModel.addEventListener('input', () => {
  asciiModel.value = 'CUSTOM';
  if(uploadedImage) generateASCIIFromImage(uploadedImage, scale.value, currentAsciiChars());
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(lastGenerated || asciiPre.textContent);
    copyBtn.textContent = '? Copied!';
    setTimeout(()=>copyBtn.textContent = '?? Copy ASCII', 1300);
  } catch(e){
    copyBtn.textContent = '? Gagal';
    setTimeout(()=>copyBtn.textContent = '?? Copy ASCII', 1300);
  }
});

fontSizeSelect.addEventListener('change', () => {
  const v = Number(fontSizeSelect.value);
  asciiPre.style.fontSize = (v || 6) + 'px';
});

scaleVal.textContent = `${scale.value}%`;
asciiPre.style.fontSize = fontSizeSelect.value + 'px';
customModel.value = '';

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
