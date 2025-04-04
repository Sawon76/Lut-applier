// --- Element References ---
const imageInput = document.getElementById('imageInput');
const lutInput = document.getElementById('lutInput');
const applyLutButton = document.getElementById('applyLutButton');
const downloadLink = document.getElementById('downloadLink');
const beforeCanvas = document.getElementById('beforeCanvas');
const afterCanvas = document.getElementById('afterCanvas');
const statusElem = document.getElementById('status');
const adjustmentsContainer = document.querySelector('.adjustments'); // Used for event delegation

// --- Adjustment Value Display References (keep these) ---
const brightnessValueDisplay = document.getElementById('brightnessValue');
const contrastValueDisplay = document.getElementById('contrastValue');
const saturationValueDisplay = document.getElementById('saturationValue');
const exposureValueDisplay = document.getElementById('exposureValue');
const highlightsValueDisplay = document.getElementById('highlightsValue');
const shadowsValueDisplay = document.getElementById('shadowsValue');
const blackPointValueDisplay = document.getElementById('blackPointValue');
const warmthValueDisplay = document.getElementById('warmthValue');
const tintValueDisplay = document.getElementById('tintValue');
const vibrancyValueDisplay = document.getElementById('vibrancyValue');
const sharpnessValueDisplay = document.getElementById('sharpnessValue');
const noiseReductionValueDisplay = document.getElementById('noiseReductionValue');
const vignetteValueDisplay = document.getElementById('vignetteValue');
// --- Remove references to ...Input elements ---

const resetAdjustmentsButton = document.getElementById('resetAdjustmentsButton');

// --- Contexts and State ---
const beforeCtx = beforeCanvas.getContext('2d');
const afterCtx = afterCanvas.getContext('2d');

let originalImage = null;
let originalImageFilename = 'image.png';
let lutData = null;
let lutFilename = 'lut.cube';
let lutAppliedImageData = null;

// --- Initial State ---
applyLutButton.disabled = true;
downloadLink.style.display = 'none';
adjustmentsContainer.style.display = 'none';
// Initialize display values from HTML data attributes
setupAdjustmentControls(); // New initialization function

// --- Event Listeners ---
imageInput.addEventListener('change', handleImageUpload);
lutInput.addEventListener('change', handleLutUpload);
applyLutButton.addEventListener('click', handleApplyClick);

// Event Delegation for Adjustment Buttons
adjustmentsContainer.addEventListener('click', handleAdjustmentButtonClick);

resetAdjustmentsButton.addEventListener('click', handleResetAdjustments);


// --- Handlers ---

// Initialize display text and potentially store defaults from data attributes
function setupAdjustmentControls() {
    const valueDisplays = adjustmentsContainer.querySelectorAll('.value-display');
    valueDisplays.forEach(span => {
        const defaultValue = span.dataset.default;
        const isPercent = span.dataset.isPercent === 'true';
        span.textContent = isPercent ? `${defaultValue}%` : defaultValue;
    });
}

// Parses value from display span text content
function getAdjustmentValue(displaySpan) {
    if (!displaySpan) return 0;
    const text = displaySpan.textContent || '';
    return parseFloat(text.replace('%', '')) || 0; // Remove % and parse
}

function resetAfterCanvas() {
    if (afterCanvas.width > 0 && afterCanvas.height > 0) {
        afterCtx.fillStyle = '#333';
        afterCtx.fillRect(0, 0, afterCanvas.width, afterCanvas.height);
    }
    downloadLink.style.display = 'none';
    downloadLink.removeAttribute('href');
    downloadLink.removeAttribute('download');
    lutAppliedImageData = null;
    adjustmentsContainer.style.display = 'none';
}

function checkReadyState() {
    resetAfterCanvas();
    if (originalImage && lutData) {
        applyLutButton.disabled = false;
        statusElem.textContent = "Ready to apply LUT. Click the button.";
    } else {
        applyLutButton.disabled = true;
        if (!originalImage && !lutData) {
             statusElem.textContent = "Please upload an image and a LUT file.";
        } else if (!originalImage) {
             statusElem.textContent = "Please upload an image.";
        } else {
             statusElem.textContent = "Please upload a .cube or .3dl LUT file.";
        }
    }
}

function handleImageUpload(event) {
    // ... (no changes needed in this function)
    const file = event.target.files[0];
    originalImage = null;
    lutAppliedImageData = null;
    applyLutButton.disabled = true;
    adjustmentsContainer.style.display = 'none';

    if (!file) {
        beforeCanvas.width = 300;
        beforeCanvas.height = 150;
        beforeCtx.fillStyle = '#333';
        beforeCtx.fillRect(0, 0, beforeCanvas.width, beforeCanvas.height);
        checkReadyState();
        return;
    }

    originalImageFilename = file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            beforeCanvas.width = originalImage.width;
            beforeCanvas.height = originalImage.height;
            beforeCtx.drawImage(originalImage, 0, 0);
            afterCanvas.width = originalImage.width;
            afterCanvas.height = originalImage.height;
            statusElem.textContent = "Image loaded.";
            checkReadyState();
        };
        img.onerror = () => {
            statusElem.textContent = "Error loading image file. Please try a different image.";
            originalImage = null;
            checkReadyState();
        };
        img.src = e.target.result;
        statusElem.textContent = "Loading image...";
    };
    reader.onerror = () => {
        statusElem.textContent = "Error reading image file.";
        originalImage = null;
        checkReadyState();
    };
    reader.readAsDataURL(file);
}

function handleLutUpload(event) {
    // ... (no changes needed in this function)
     const file = event.target.files[0];
    lutData = null;
    lutAppliedImageData = null;
    applyLutButton.disabled = true;
    adjustmentsContainer.style.display = 'none';

    if (!file) {
        lutInput.value = "";
        checkReadyState();
        return;
    }

    lutFilename = file.name;
    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.cube') && !fileNameLower.endsWith('.3dl')) {
         statusElem.textContent = "Please select a valid .cube or .3dl file.";
        lutInput.value = "";
        checkReadyState();
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsedLut = parseLut(e.target.result, file.name);
            if (parsedLut) {
                lutData = parsedLut;
                statusElem.textContent = `LUT loaded (Size: ${lutData.size}).`;
                checkReadyState();
            } else {
                 statusElem.textContent = "Failed to parse LUT file. Check format/console.";
                 lutData = null;
                 checkReadyState();
            }
        } catch (error) {
            console.error("Error parsing LUT:", error);
            statusElem.textContent = `Error parsing LUT: ${error.message}`;
            lutData = null;
            checkReadyState();
        }
    };
    reader.onerror = () => {
        statusElem.textContent = "Error reading LUT file.";
        lutData = null;
        checkReadyState();
    };
    reader.readAsText(file);
    statusElem.textContent = "Loading LUT file...";
}

// --- Apply Button Action ---
function handleApplyClick() {
    // ... (no changes needed in this function)
    if (originalImage && lutData && beforeCanvas.width > 0) {
        statusElem.textContent = "Applying LUT... (this may take a moment)";
        applyLutButton.disabled = true;
        downloadLink.style.display = 'none';
        adjustmentsContainer.style.display = 'none';

        setTimeout(applyLutAndAdjustments, 50);
    } else {
        statusElem.textContent = "Cannot apply. Ensure image and LUT are correctly loaded.";
        applyLutButton.disabled = true;
    }
}

// --- Adjustment Button Click Handler (Event Delegation) ---
function handleAdjustmentButtonClick(event) {
    const button = event.target.closest('.adj-button'); // Find the clicked button
    if (!button) return; // Exit if click wasn't on an adjustment button

    const targetId = button.dataset.targetId;
    if (!targetId) return; // Exit if button has no target

    const valueSpan = document.getElementById(targetId);
    if (!valueSpan) return; // Exit if target span not found

    // Get parameters from the value span's data attributes
    const min = parseFloat(valueSpan.dataset.min);
    const max = parseFloat(valueSpan.dataset.max);
    const step = parseFloat(valueSpan.dataset.step);
    const isPercent = valueSpan.dataset.isPercent === 'true';

    // Get current value from the span's text
    let currentValue = getAdjustmentValue(valueSpan);

    // Determine direction
    const direction = button.classList.contains('adj-increment') ? 1 : -1;

    // Calculate new value
    let newValue = currentValue + (direction * step);

    // Clamp the value
    newValue = Math.round(Math.max(min, Math.min(max, newValue))); // Round to integer step

    // Update the display span
    valueSpan.textContent = isPercent ? `${newValue}%` : newValue;

    // Apply adjustments if LUT is already processed
    if (lutAppliedImageData) {
        statusElem.textContent = "Applying adjustments...";
        // Use setTimeout for slight delay, allowing UI feedback if needed
        setTimeout(applyAdjustmentsOnly, 10);
    }
}


function handleResetAdjustments() {
    // Reset all display spans to their default values
    const valueDisplays = adjustmentsContainer.querySelectorAll('.value-display');
    valueDisplays.forEach(span => {
        const defaultValue = span.dataset.default;
        const isPercent = span.dataset.isPercent === 'true';
        span.textContent = isPercent ? `${defaultValue}%` : defaultValue;
    });

    if (lutAppliedImageData) {
        applyAdjustmentsOnly(); // Re-apply with default values
    }
}

// --- LUT Parsing Logic --- (Keep Existing parseLut function - No changes needed)
function parseLut(lutString, filename = '') {
    // ... (no changes needed) ...
    const lines = lutString.split('\n');
    let size = null;
    const table = [];
    let readingTable = false;
    let sizeFound = false;
    let detectedFormat = null;
    let is3dlInt = false;
    let maxIntVal = 4095.0;
    let domainMin = [0.0, 0.0, 0.0];
    let domainMax = [1.0, 1.0, 1.0];

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;

        const parts = line.split(/\s+/);

        if (!sizeFound) {
            const keyword = parts[0].toUpperCase();
            if (keyword === 'LUT_3D_SIZE') {
                if (parts.length >= 2) { size = parseInt(parts[1], 10); if (isNaN(size) || size <= 1) throw new Error("Invalid LUT_3D_SIZE value."); detectedFormat = 'cube'; sizeFound = true; readingTable = true; continue; } else { throw new Error("Malformed LUT_3D_SIZE line."); }
            } else if (keyword === 'MESH' && parts.length >= 2) {
                 size = parseInt(parts[1], 10); if (isNaN(size) || size <= 1) throw new Error("Invalid Mesh size value."); if(parts.length > 2 && (parts[1] !== parts[2] || parts[1] !== parts[3])) { throw new Error("Non-uniform mesh sizes in .3dl are not supported."); } detectedFormat = '3dl'; sizeFound = true; readingTable = true; continue;
            } else if (keyword === 'DOMAIN_MIN' && parts.length >= 4) { domainMin = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]; if (domainMin.some(isNaN)) throw new Error("Invalid DOMAIN_MIN values."); continue;
             } else if (keyword === 'DOMAIN_MAX' && parts.length >= 4) { domainMax = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]; if (domainMax.some(isNaN)) throw new Error("Invalid DOMAIN_MAX values."); continue; }
        }

        if (readingTable && size) {
            if (parts.length === 3) {
                const r_str = parts[0], g_str = parts[1], b_str = parts[2]; const r = parseFloat(r_str), g = parseFloat(g_str), b = parseFloat(b_str);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    if (detectedFormat === '3dl' && table.length === 0) {
                       if (r > 1.1 || g > 1.1 || b > 1.1 || (r_str.indexOf('.') === -1 && r !== 0 && r!== 1)) {
                           is3dlInt = true; const maxVal = Math.max(r,g,b);
                            if (maxVal > 60000) maxIntVal = 65535.0; else if (maxVal > 4000) maxIntVal = 4095.0; else if (maxVal > 1000) maxIntVal = 1023.0; else if (maxVal > 250) maxIntVal = 255.0; else maxIntVal = Math.max(r,g,b) || 4095.0;
                           console.log("Detected integer .3dl format, normalizing with max:", maxIntVal);
                        }
                    }
                    let normR = r, normG = g, normB = b; if (is3dlInt) { normR /= maxIntVal; normG /= maxIntVal; normB /= maxIntVal; }
                    normR = Math.max(0.0, Math.min(1.0, normR)); normG = Math.max(0.0, Math.min(1.0, normG)); normB = Math.max(0.0, Math.min(1.0, normB));
                    table.push(new Float32Array([normR, normG, normB]));
                } else { console.warn(`Skipping invalid data line (non-numeric): ${line}`); }
            } else { console.warn(`Skipping line with incorrect number of values (${parts.length}): ${line}`); }
        }
    }

    if (!size) throw new Error("Could not determine LUT size (Missing 'LUT_3D_SIZE' or 'Mesh'?).");
    const expectedSize = size * size * size;
    if (table.length !== expectedSize) {
        const inferredSizeFloat = Math.cbrt(table.length); const inferredSizeInt = Math.round(inferredSizeFloat);
        if (table.length > 0 && Math.abs(inferredSizeFloat - inferredSizeInt) < 0.001 && inferredSizeInt > 1) { console.warn(`Header size (${size}) mismatch. Data count (${table.length}) suggests size ${inferredSizeInt}. Using inferred size.`); size = inferredSizeInt;
        } else { throw new Error(`LUT table data size mismatch. Header/Expected ${expectedSize} entries, found ${table.length}. Check file format.`); }
    }
    console.log(`Parsed LUT: Size=${size}, Format=${detectedFormat || 'Unknown'}, Ints=${is3dlInt}, Domain=[${domainMin}]-[${domainMax}]`);
    return { size, table, domainMin, domainMax };
}


// --- LUT Application & Adjustment Logic ---

// Step 1: Apply LUT (No change needed here)
function applyLutAndAdjustments() {
    // ... (no changes needed) ...
    try {
        if (!originalImage || !lutData || beforeCanvas.width === 0) { throw new Error("Missing image, LUT data, or canvas not ready."); }
        const width = beforeCanvas.width; const height = beforeCanvas.height;
        if (afterCanvas.width !== width || afterCanvas.height !== height) { afterCanvas.width = width; afterCanvas.height = height; }
        const originalImageData = beforeCtx.getImageData(0, 0, width, height); const pixels = originalImageData.data;
        lutAppliedImageData = afterCtx.createImageData(width, height); const lutPixels = lutAppliedImageData.data;
        const lutSize = lutData.size; const lutTable = lutData.table; const sizeM1 = lutSize - 1;
        const domainMin = lutData.domainMin || [0.0, 0.0, 0.0]; const domainMax = lutData.domainMax || [1.0, 1.0, 1.0];
        const domainScale = [ (domainMax[0] - domainMin[0]) === 0 ? 1.0 : 1.0 / (domainMax[0] - domainMin[0]), (domainMax[1] - domainMin[1]) === 0 ? 1.0 : 1.0 / (domainMax[1] - domainMin[1]), (domainMax[2] - domainMin[2]) === 0 ? 1.0 : 1.0 / (domainMax[2] - domainMin[2]) ];

        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255;
            r = (r - domainMin[0]) * domainScale[0]; g = (g - domainMin[1]) * domainScale[1]; b = (b - domainMin[2]) * domainScale[2];
            r = Math.max(0.0, Math.min(1.0, r)); g = Math.max(0.0, Math.min(1.0, g)); b = Math.max(0.0, Math.min(1.0, b));
            const r_idx = r * sizeM1, g_idx = g * sizeM1, b_idx = b * sizeM1; const r0 = Math.floor(r_idx), g0 = Math.floor(g_idx), b0 = Math.floor(b_idx);
            const r0_c = Math.max(0, Math.min(sizeM1, r0)); const g0_c = Math.max(0, Math.min(sizeM1, g0)); const b0_c = Math.max(0, Math.min(sizeM1, b0));
            const r1_c = Math.min(r0_c + 1, sizeM1); const g1_c = Math.min(g0_c + 1, sizeM1); const b1_c = Math.min(b0_c + 1, sizeM1); const rf = r_idx - r0, gf = g_idx - g0, bf = b_idx - b0;
            const c000 = getLutValue(r0_c, g0_c, b0_c, lutSize, lutTable); const c100 = getLutValue(r1_c, g0_c, b0_c, lutSize, lutTable); const c010 = getLutValue(r0_c, g1_c, b0_c, lutSize, lutTable); const c110 = getLutValue(r1_c, g1_c, b0_c, lutSize, lutTable); const c001 = getLutValue(r0_c, g0_c, b1_c, lutSize, lutTable); const c101 = getLutValue(r1_c, g0_c, b1_c, lutSize, lutTable); const c011 = getLutValue(r0_c, g1_c, b1_c, lutSize, lutTable); const c111 = getLutValue(r1_c, g1_c, b1_c, lutSize, lutTable);
            const c00 = lerpVector(c000, c100, rf); const c10 = lerpVector(c010, c110, rf); const c01 = lerpVector(c001, c101, rf); const c11 = lerpVector(c011, c111, rf); const c0 = lerpVector(c00, c10, gf); const c1 = lerpVector(c01, c11, gf); const finalColor = lerpVector(c0, c1, bf);
            lutPixels[i]     = Math.max(0, Math.min(255, Math.round(finalColor[0] * 255))); lutPixels[i + 1] = Math.max(0, Math.min(255, Math.round(finalColor[1] * 255))); lutPixels[i + 2] = Math.max(0, Math.min(255, Math.round(finalColor[2] * 255))); lutPixels[i + 3] = pixels[i + 3];
        }
        applyAdjustmentsOnly();
        adjustmentsContainer.style.display = 'flex';
    } catch (error) {
        console.error("Error during LUT application:", error); statusElem.textContent = `Error applying LUT: ${error.message}`; applyLutButton.disabled = false; downloadLink.style.display = 'none'; adjustmentsContainer.style.display = 'none'; lutAppliedImageData = null;
    }
}


// Step 2: Apply ALL adjustments (Read values from display spans)
function applyAdjustmentsOnly() {
    if (!lutAppliedImageData) {
        console.warn("Cannot apply adjustments, LUT result not available.");
        statusElem.textContent = "Error: LUT result missing for adjustments.";
        applyLutButton.disabled = false;
        return;
    }

    const width = lutAppliedImageData.width;
    const height = lutAppliedImageData.height;

    // --- Get ALL current adjustment values FROM DISPLAY SPANS ---
    const brightness = getAdjustmentValue(brightnessValueDisplay);
    const exposure = getAdjustmentValue(exposureValueDisplay) / 100.0;
    const contrast = getAdjustmentValue(contrastValueDisplay) / 100.0;
    const highlights = getAdjustmentValue(highlightsValueDisplay) / 100.0;
    const shadows = getAdjustmentValue(shadowsValueDisplay) / 100.0;
    const blackPoint = getAdjustmentValue(blackPointValueDisplay) / 255.0;
    const warmth = getAdjustmentValue(warmthValueDisplay) / 100.0;
    const tint = getAdjustmentValue(tintValueDisplay) / 100.0;
    const saturation = getAdjustmentValue(saturationValueDisplay) / 100.0;
    const vibrancy = getAdjustmentValue(vibrancyValueDisplay) / 100.0;
    const sharpness = getAdjustmentValue(sharpnessValueDisplay) / 100.0;
    const noiseReduction = getAdjustmentValue(noiseReductionValueDisplay) / 100.0;
    const vignetteAmount = getAdjustmentValue(vignetteValueDisplay) / 100.0;

    // --- Prepare data buffers --- (No changes needed)
    const srcPixels = lutAppliedImageData.data;
    const finalImageData = afterCtx.createImageData(width, height);
    const dstPixels = finalImageData.data;
    let buffer1 = new Float32Array(srcPixels);
    let buffer2 = new Float32Array(width * height * 4);

    // --- Apply Non-Convolution Adjustments --- (No changes needed in the logic itself)
    // ... (keep the existing adjustment logic loop) ...
    for (let i = 0; i < buffer1.length; i += 4) {
        let r = buffer1[i]; let g = buffer1[i + 1]; let b = buffer1[i + 2];
        r += brightness; g += brightness; b += brightness;
        const blackLift = blackPoint * 255; r = Math.max(blackLift, r); g = Math.max(blackLift, g); b = Math.max(blackLift, b); if (blackLift > 0 && blackLift < 255) { const scale = 255 / (255 - blackLift); r = (r - blackLift) * scale; g = (g - blackLift) * scale; b = (b - blackLift) * scale; }
        const exposureFactor = Math.pow(2, exposure); r *= exposureFactor; g *= exposureFactor; b *= exposureFactor;
        const r_lum = Math.max(0, Math.min(255, r)); const g_lum = Math.max(0, Math.min(255, g)); const b_lum = Math.max(0, Math.min(255, b)); const lum = 0.2126 * r_lum + 0.7152 * g_lum + 0.0722 * b_lum; const lumNorm = lum / 255.0; const shadowFactor = Math.pow(2, shadows * Math.pow(1.0 - lumNorm, 2)); r *= shadowFactor; g *= shadowFactor; b *= shadowFactor; const highlightFactor = Math.pow(2, -highlights * Math.pow(lumNorm, 1.5)); r *= highlightFactor; g *= highlightFactor; b *= highlightFactor;
        r = (r - 128) * contrast + 128; g = (g - 128) * contrast + 128; b = (b - 128) * contrast + 128;
        const warmthEffect = warmth * 25; const tintEffect = tint * 25; r += warmthEffect; b -= warmthEffect; g += tintEffect; r -= tintEffect * 0.5; b -= tintEffect * 0.5;
        if (saturation !== 1.0 || vibrancy !== 0.0) { const r_hsl_in = Math.max(0, Math.min(255, r)) / 255; const g_hsl_in = Math.max(0, Math.min(255, g)) / 255; const b_hsl_in = Math.max(0, Math.min(255, b)) / 255; const hsl = rgbToHsl(r_hsl_in, g_hsl_in, b_hsl_in); let currentSat = hsl[1]; let newSat = currentSat; const vibAmount = vibrancy * (1.0 - Math.pow(currentSat, 1.5)); newSat += vibAmount; newSat *= saturation; hsl[1] = Math.max(0.0, Math.min(1.0, newSat)); const newRgb = hslToRgb(hsl[0], hsl[1], hsl[2]); r = newRgb[0] * 255; g = newRgb[1] * 255; b = newRgb[2] * 255; }
        buffer1[i] = Math.max(0, Math.min(255, r)); buffer1[i + 1] = Math.max(0, Math.min(255, g)); buffer1[i + 2] = Math.max(0, Math.min(255, b));
    }


    // --- Apply Convolution-Based Adjustments --- (No changes needed in logic)
    let processedBuffer = buffer1;
    if (noiseReduction > 0.01) { console.time("Noise Reduction"); const blurKernel = [1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9]; buffer2 = applyConvolution(processedBuffer, width, height, blurKernel, 1.0); for(let i=0; i<processedBuffer.length; i+=1) { processedBuffer[i] = lerp(processedBuffer[i], buffer2[i], noiseReduction); } console.timeEnd("Noise Reduction"); }
    if (sharpness > 0.01) { console.time("Sharpness"); const sharpenKernel = [-1, -1, -1, -1,  9, -1, -1, -1, -1]; buffer2 = applyConvolution(processedBuffer, width, height, sharpenKernel, 1.0); for(let i=0; i<processedBuffer.length; i+=1) { if ((i + 1) % 4 !== 0) { processedBuffer[i] = lerp(processedBuffer[i], buffer2[i], sharpness); } } console.timeEnd("Sharpness"); }

    // --- Apply Final Adjustments (Vignette) --- (No changes needed in logic)
    for (let i = 0; i < processedBuffer.length; i += 4) {
        let r = processedBuffer[i]; let g = processedBuffer[i + 1]; let b = processedBuffer[i + 2]; const a = processedBuffer[i + 3];
        if (Math.abs(vignetteAmount) > 0.01) { const x = (i / 4) % width; const y = Math.floor((i / 4) / width); const dx = x / width - 0.5; const dy = y / height - 0.5; const distSq = dx * dx + dy * dy; const maxDistSq = 0.5; const distNorm = Math.sqrt(Math.min(distSq / maxDistSq, 1.0)); const vignetteFactor = Math.pow(distNorm, 2.0); const vignetteMul = 1.0 - vignetteAmount * vignetteFactor; r *= vignetteMul; g *= vignetteMul; b *= vignetteMul; }
        dstPixels[i]     = Math.round(Math.max(0, Math.min(255, r))); dstPixels[i + 1] = Math.round(Math.max(0, Math.min(255, g))); dstPixels[i + 2] = Math.round(Math.max(0, Math.min(255, b))); dstPixels[i + 3] = Math.round(Math.max(0, Math.min(255, a)));
     }

    // --- Put the final adjusted data onto the canvas ---
    afterCtx.putImageData(finalImageData, 0, 0);
    updateDownloadLink(); // Update download link with the final result
    applyLutButton.disabled = false;
    statusElem.textContent = "Adjustments applied.";
}


function updateDownloadLink() {
     if (!originalImage || !lutData || !lutAppliedImageData) return;

     const imgBaseName = originalImageFilename.substring(0, originalImageFilename.lastIndexOf('.')) || 'image';
     const lutBaseName = lutFilename.substring(0, lutFilename.lastIndexOf('.')) || 'lut';

     // Generate suffix based on non-default DISPLAY values
     const adjustments = [
         getAdjustmentValue(brightnessValueDisplay) !== 0 && `b${getAdjustmentValue(brightnessValueDisplay)}`,
         getAdjustmentValue(exposureValueDisplay) !== 0 && `exp${getAdjustmentValue(exposureValueDisplay)}`,
         getAdjustmentValue(contrastValueDisplay) !== 100 && `c${getAdjustmentValue(contrastValueDisplay)}`,
         getAdjustmentValue(highlightsValueDisplay) !== 0 && `h${getAdjustmentValue(highlightsValueDisplay)}`,
         getAdjustmentValue(shadowsValueDisplay) !== 0 && `s${getAdjustmentValue(shadowsValueDisplay)}`,
         getAdjustmentValue(blackPointValueDisplay) !== 0 && `bp${getAdjustmentValue(blackPointValueDisplay)}`,
         getAdjustmentValue(warmthValueDisplay) !== 0 && `w${getAdjustmentValue(warmthValueDisplay)}`,
         getAdjustmentValue(tintValueDisplay) !== 0 && `t${getAdjustmentValue(tintValueDisplay)}`,
         getAdjustmentValue(saturationValueDisplay) !== 100 && `sat${getAdjustmentValue(saturationValueDisplay)}`,
         getAdjustmentValue(vibrancyValueDisplay) !== 0 && `vib${getAdjustmentValue(vibrancyValueDisplay)}`,
         getAdjustmentValue(sharpnessValueDisplay) !== 0 && `sh${getAdjustmentValue(sharpnessValueDisplay)}`,
         getAdjustmentValue(noiseReductionValueDisplay) !== 0 && `nr${getAdjustmentValue(noiseReductionValueDisplay)}`,
         getAdjustmentValue(vignetteValueDisplay) !== 0 && `vig${getAdjustmentValue(vignetteValueDisplay)}`
     ].filter(Boolean).join('_');

     const adjSuffix = adjustments ? `_adj_${adjustments}` : '';
     const downloadFilename = `${imgBaseName}_${lutBaseName}${adjSuffix}.png`;

     downloadLink.href = afterCanvas.toDataURL('image/png');
     downloadLink.download = downloadFilename;
     downloadLink.style.display = 'inline-block';
}

// --- Helper Functions --- (Keep Existing Helpers - No changes needed)
function getLutValue(r_idx, g_idx, b_idx, lutSize, lutTable) { /* ... no changes ... */
    const index = b_idx * lutSize * lutSize + g_idx * lutSize + r_idx;
    if (index < 0 || index >= lutTable.length) { console.error(`LUT index out of bounds: [${r_idx}, ${g_idx}, ${b_idx}] -> ${index} (table size: ${lutTable.length})`); return new Float32Array([1.0, 0.0, 1.0]); }
    return lutTable[index];
}
function lerp(a, b, t) { return a * (1 - t) + b * t; }
function lerpVector(v1, v2, t) { /* ... no changes ... */
    if (!v1 || !v2) { return v1 || v2 || new Float32Array([1.0, 0.0, 1.0]); }
    t = Math.max(0.0, Math.min(1.0, t));
    return new Float32Array([ lerp(v1[0], v2[0], t), lerp(v1[1], v2[1], t), lerp(v1[2], v2[2], t) ]);
}
function rgbToHsl(r, g, b){ /* ... no changes ... */
    var max = Math.max(r, g, b), min = Math.min(r, g, b); var h, s, l = (max + min) / 2;
    if(max == min){ h = s = 0; } else { var d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); switch(max){ case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; } h /= 6; } return [h, s, l];
}
function hslToRgb(h, s, l){ /* ... no changes ... */
    var r, g, b; if(s == 0){ r = g = b = l; } else { function hue2rgb(p, q, t){ if(t < 0) t += 1; if(t > 1) t -= 1; if(t < 1/6) return p + (q - p) * 6 * t; if(t < 1/2) return q; if(t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; } var q = l < 0.5 ? l * (1 + s) : l + s - l * s; var p = 2 * l - q; r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3); } return [r, g, b];
}
function applyConvolution(srcBuffer, width, height, kernel, factor = 1.0) { /* ... no changes ... */
    const dstBuffer = new Float32Array(srcBuffer.length); const kSize = 3; const kRadius = Math.floor(kSize / 2);
    for (let y = 0; y < height; y++) { for (let x = 0; x < width; x++) { let r_sum = 0, g_sum = 0, b_sum = 0; const dstIdx = (y * width + x) * 4; for (let ky = 0; ky < kSize; ky++) { for (let kx = 0; kx < kSize; kx++) { const kernelIdx = ky * kSize + kx; const kernelVal = kernel[kernelIdx]; const imgX = Math.max(0, Math.min(width - 1, x + kx - kRadius)); const imgY = Math.max(0, Math.min(height - 1, y + ky - kRadius)); const srcIdx = (imgY * width + imgX) * 4; r_sum += srcBuffer[srcIdx] * kernelVal; g_sum += srcBuffer[srcIdx + 1] * kernelVal; b_sum += srcBuffer[srcIdx + 2] * kernelVal; } } dstBuffer[dstIdx] = r_sum * factor; dstBuffer[dstIdx + 1] = g_sum * factor; dstBuffer[dstIdx + 2] = b_sum * factor; dstBuffer[dstIdx + 3] = srcBuffer[dstIdx + 3]; } } return dstBuffer;
}
