(() => {
  'use strict';

  const MAX_PIXELS = 6_000_000;
  const MAX_DIMENSION = 4096;
  let downloadUrl = '';

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function colorDistance(r, g, b, ref) {
    const dr = r - ref.r;
    const dg = g - ref.g;
    const db = b - ref.b;
    return Math.sqrt((dr * dr * 0.299) + (dg * dg * 0.587) + (db * db * 0.114));
  }

  function dominantEdgeColor(data, width, height) {
    const buckets = new Map();
    const stride = Math.max(1, Math.floor((width + height) / 900));

    const addPixel = (x, y) => {
      const offset = ((y * width) + x) * 4;
      if (data[offset + 3] < 24) return;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const key = `${r >> 4}:${g >> 4}:${b >> 4}`;
      const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
    };

    for (let x = 0; x < width; x += stride) {
      addPixel(x, 0);
      if (height > 1) addPixel(x, height - 1);
    }
    for (let y = stride; y < height - 1; y += stride) {
      addPixel(0, y);
      if (width > 1) addPixel(width - 1, y);
    }

    let dominant = null;
    for (const bucket of buckets.values()) {
      if (!dominant || bucket.count > dominant.count) dominant = bucket;
    }

    if (!dominant) return { r: 255, g: 255, b: 255 };
    return {
      r: Math.round(dominant.r / dominant.count),
      g: Math.round(dominant.g / dominant.count),
      b: Math.round(dominant.b / dominant.count)
    };
  }

  async function removeConnectedBackground(imageData, width, height, sensitivity, onProgress) {
    const data = imageData.data;
    const reference = dominantEdgeColor(data, width, height);
    const threshold = 10 + (clamp(sensitivity, 5, 100) * 0.72);
    const transparentThreshold = threshold * 0.62;
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    const canRemove = (index) => {
      const offset = index * 4;
      if (data[offset + 3] === 0) return true;
      return colorDistance(data[offset], data[offset + 1], data[offset + 2], reference) <= threshold;
    };

    const enqueue = (index) => {
      if (visited[index] || !canRemove(index)) return;
      visited[index] = 1;
      queue[tail++] = index;
    };

    for (let x = 0; x < width; x += 1) {
      enqueue(x);
      if (height > 1) enqueue(((height - 1) * width) + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueue(y * width);
      if (width > 1) enqueue((y * width) + width - 1);
    }

    let processed = 0;
    const yieldEvery = 120_000;

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      const offset = index * 4;
      const originalAlpha = data[offset + 3];
      const distance = colorDistance(data[offset], data[offset + 1], data[offset + 2], reference);

      if (distance <= transparentThreshold || originalAlpha === 0) {
        data[offset + 3] = 0;
      } else {
        const feather = clamp((distance - transparentThreshold) / Math.max(1, threshold - transparentThreshold), 0, 1);
        data[offset + 3] = Math.round(originalAlpha * feather);
      }

      if (x > 0) enqueue(index - 1);
      if (x + 1 < width) enqueue(index + 1);
      if (y > 0) enqueue(index - width);
      if (y + 1 < height) enqueue(index + width);

      processed += 1;
      if (processed % yieldEvery === 0) {
        onProgress?.(45 + Math.round((head / Math.max(1, tail)) * 40));
        await nextFrame();
      }
    }

    return { imageData, reference, removedPixels: tail, threshold };
  }

  function scaledDimensions(width, height) {
    const pixelScale = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(1, width * height)));
    const dimensionScale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const scale = Math.min(pixelScale, dimensionScale);
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  function loadPreviewImage(preview) {
    return new Promise((resolve, reject) => {
      if (!preview?.src) {
        reject(new Error('Please choose an image first.'));
        return;
      }
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The selected image could not be decoded by this browser.'));
      image.src = preview.src;
    });
  }

  function setProgress(section, fill, text, value, message) {
    section?.classList.add('visible');
    if (fill) fill.style.width = `${clamp(value, 0, 100)}%`;
    if (text) text.textContent = message;
  }

  async function processImage(elements) {
    const {
      button, originalPreview, resultCanvas, toleranceSlider,
      progressSection, progressFill, progressText, resultSection, downloadLink
    } = elements;

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    resultSection?.classList.remove('visible');
    setProgress(progressSection, progressFill, progressText, 8, 'Reading image…');

    try {
      const image = await loadPreviewImage(originalPreview);
      const dimensions = scaledDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);
      await nextFrame();

      const workCanvas = document.createElement('canvas');
      workCanvas.width = dimensions.width;
      workCanvas.height = dimensions.height;
      const workContext = workCanvas.getContext('2d', { willReadFrequently: true });
      if (!workContext) throw new Error('Canvas processing is unavailable in this browser.');

      workContext.drawImage(image, 0, 0, dimensions.width, dimensions.height);
      const imageData = workContext.getImageData(0, 0, dimensions.width, dimensions.height);
      setProgress(progressSection, progressFill, progressText, 32, 'Finding the connected background…');
      await nextFrame();

      const sensitivity = Number.parseInt(toleranceSlider?.value || '30', 10);
      const result = await removeConnectedBackground(
        imageData,
        dimensions.width,
        dimensions.height,
        sensitivity,
        (value) => setProgress(progressSection, progressFill, progressText, value, 'Separating subject edges…')
      );

      workContext.putImageData(result.imageData, 0, 0);
      setProgress(progressSection, progressFill, progressText, 92, 'Preparing transparent PNG…');
      await nextFrame();

      resultCanvas.width = dimensions.width;
      resultCanvas.height = dimensions.height;
      const resultContext = resultCanvas.getContext('2d');
      resultContext.clearRect(0, 0, dimensions.width, dimensions.height);
      resultContext.drawImage(workCanvas, 0, 0);

      const blob = await new Promise((resolve) => workCanvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('The browser could not create the PNG output.');

      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(blob);
      downloadLink.href = downloadUrl;
      downloadLink.download = 'background-removed.png';
      downloadLink.dataset.engineVersion = '2';

      setProgress(progressSection, progressFill, progressText, 100, `Complete — ${result.removedPixels.toLocaleString()} connected background pixels processed.`);
      resultSection?.classList.add('visible');
      resultSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => progressSection?.classList.remove('visible'), 650);
    } catch (error) {
      setProgress(progressSection, progressFill, progressText, 0, error?.message || 'Background removal failed. Please try another image.');
      console.error('[Background Remover v2]', error);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const originalButton = document.getElementById('removeBtn');
    if (!originalButton || originalButton.dataset.engineVersion === '2') return;

    // The legacy page binds a global color-delete handler during DOMContentLoaded.
    // Replacing only this button removes that obsolete listener without disturbing
    // upload, drag/drop, background preview, localization, or accessibility wiring.
    const button = originalButton.cloneNode(true);
    button.dataset.engineVersion = '2';
    originalButton.replaceWith(button);

    const elements = {
      button,
      originalPreview: document.getElementById('originalPreview'),
      resultCanvas: document.getElementById('resultCanvas'),
      toleranceSlider: document.getElementById('toleranceSlider'),
      progressSection: document.getElementById('progressSection'),
      progressFill: document.getElementById('progressFill'),
      progressText: document.getElementById('progressText'),
      resultSection: document.getElementById('resultSection'),
      downloadLink: document.getElementById('downloadLink')
    };

    button.addEventListener('click', () => processImage(elements));

    const note = document.querySelector('.info-box p');
    if (note) {
      note.innerHTML = '🎭 <strong>Improved local engine:</strong> NovaTools now removes only background-colored regions connected to the image boundary and feathers transition pixels. This preserves similarly colored foreground areas better than the previous global color-delete method. Complex hair, fur, transparent objects, or mixed scene backgrounds can still require a dedicated AI segmentation service.';
    }
  });
})();
