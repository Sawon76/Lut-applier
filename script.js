
// --- Existing Element References ---
const imageInput = document.getElementById('imageInput');
const lutInput = document.getElementById('lutInput');
const applyLutButton = document.getElementById('applyLutButton');
const downloadLink = document.getElementById('downloadLink');
const beforeCanvas = document.getElementById('beforeCanvas');
const afterCanvas = document.getElementById('afterCanvas');
const statusElem = document.getElementById('status');
const adjustmentsContainer = document.querySelector('.adjustments');

// --- Basic Adjustment Controls ---
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValueDisplay = document.getElementById('brightnessValue');
const contrastSlider = document.getElementById('contrastSlider');
const contrastValueDisplay = document.getElementById('contrastValue');
const saturationSlider = document.getElementById('saturationSlider');
const saturationValueDisplay = document.getElementById('saturationValue');

// --- New Adjustment Controls ---
const exposureSlider = document.getElementById('exposureSlider');
const exposureValueDisplay = document.getElementById('exposureValue');
const highlightsSlider = document.getElementById('highlightsSlider');
const highlightsValueDisplay = document.getElementById('highlightsValue');
const shadowsSlider = document.getElementById('shadowsSlider');
const shadowsValueDisplay = document.getElementById('shadowsValue');
const blackPointSlider = document.getElementById('blackPointSlider');
const blackPointValueDisplay = document.getElementById('blackPointValue');
const warmthSlider = document.getElementById('warmthSlider');
const warmthValueDisplay = document.getElementById('warmthValue');
const tintSlider = document.getElementById('tintSlider');
const tintValueDisplay = document.getElementById('tintValue');
const vibrancySlider = document.getElementById('vibrancySlider');
const vibrancyValueDisplay = document.getElementById('vibrancyValue');
const sharpnessSlider = document.getElementById('sharpnessSlider');
const sharpnessValueDisplay = document.getElementById('sharpnessValue');
const noiseReductionSlider = document.getElementById('noiseReductionSlider');
const noiseReductionValueDisplay = document.getElementById('noiseReductionValue');
const vignetteSlider = document.getElementById('vignetteSlider');
const vignetteValueDisplay = document.getElementById('vignetteValue');

const resetAdjustmentsButton = document.getElementById('resetAdjustmentsButton');

// --- Contexts and State ---
const beforeCtx = beforeCanvas.getContext('2d');
const afterCtx = afterCanvas.getContext('2d');

let originalImage = null;
let originalImageFilename = 'image.png';
let lutData = null;
let lutFilename = 'lut.cube';
let lutAppliedImageData = null; // Store ImageData *after* LUT, *before* adjustments
let adjustmentTimeoutId = null; // For debouncing expensive adjustments

// --- Initial State ---
applyLutButton.disabled = true;
downloadLink.style.display = 'none';
adjustmentsContainer.style.display = 'none';
initializeAdjustmentValues();

// --- Event Listeners ---
imageInput.addEventListener('change', handleImageUpload);
lutInput.addEventListener('change', handleLutUpload);
applyLutButton.addEventListener('click', handleApplyClick);

// Adjustment Listeners (Grouped for clarity)
[
    brightnessSlider, contrastSlider, saturationSlider, exposureSlider,
    highlightsSlider, shadowsSlider, blackPointSlider, warmthSlider, tintSlider,
    vibrancySlider, vignetteSlider // Less expensive adjustments update instantly
].forEach(slider => slider.addEventListener('input', handleAdjustmentChange));

[
    sharpnessSlider, noiseReductionSlider // More expensive adjustments are debounced
].forEach(slider => slider.addEventListener('input', handleExpensiveAdjustmentChange));


resetAdjustmentsButton.addEventListener('click', handleResetAdjustments);


// --- Handlers ---

function initializeAdjustmentValues() {
    brightnessValueDisplay.textContent = brightnessSlider.value;
    exposureValueDisplay.textContent = exposureSlider.value;
    contrastValueDisplay.textContent = `${contrastSlider.value}%`;
    highlightsValueDisplay.textContent = highlightsSlider.value;
    shadowsValueDisplay.textContent = shadowsSlider.value;
    blackPointValueDisplay.textContent = blackPointSlider.value;
    warmthValueDisplay.textContent = warmthSlider.value;
    tintValueDisplay.textContent = tintSlider.value;
    saturationValueDisplay.textContent = `${saturationSlider.value}%`;
    vibrancyValueDisplay.textContent = vibrancySlider.value;
    sharpnessValueDisplay.textContent = sharpnessSlider.value;
    noiseReductionValueDisplay.textContent = noiseReductionSlider.value;
    vignetteValueDisplay.textContent = vignetteSlider.value;
}

function resetAfterCanvas() {
    // Clear "After" canvas visually
    if (afterCanvas.width > 0 && afterCanvas.height > 0) {
        afterCtx.fillStyle = '#333'; // Match background
        afterCtx.fillRect(0, 0, afterCanvas.width, afterCanvas.height);
    }
    // Hide download link
    downloadLink.style.display = 'none';
    downloadLink.removeAttribute('href'); // Clear previous data URL
    downloadLink.removeAttribute('download');
    lutAppliedImageData = null; // Clear intermediate data
    adjustmentsContainer.style.display = 'none'; // Hide adjustments
}

function checkReadyState() {
    resetAfterCanvas(); // Clear previous result when inputs change
    if (originalImage && lutData) {
        applyLutButton.disabled = false;
        statusElem.textContent = "Ready to apply LUT. Click the button.";
    } else {
        applyLutButton.disabled = true;
        if (!originalImage && !lutData) {
             statusElem.textContent = "Please upload an image and a LUT file.";
        } else if (!originalImage) {
             statusElem.textContent = "Please upload an image.";
        } else { // !lutData
             statusElem.textContent = "Please upload a .cube or .3dl LUT file.";
        }
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    originalImage = null; // Reset image data first
    lutAppliedImageData = null; // Reset intermediate data
    applyLutButton.disabled = true; // Disable button immediately
    adjustmentsContainer.style.display = 'none'; // Hide adjustments

    if (!file) {
        // Clear previous image if user cancels selection
        beforeCanvas.width = 300; // Reset to placeholder size
        beforeCanvas.height = 150;
        beforeCtx.fillStyle = '#333';
        beforeCtx.fillRect(0, 0, beforeCanvas.width, beforeCanvas.height);
        checkReadyState();
        return;
    }

    originalImageFilename = file.name; // Store filename
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img; // Assign only after successful load
            // Draw image to "Before" canvas
            beforeCanvas.width = originalImage.width;
            beforeCanvas.height = originalImage.height;
            beforeCtx.drawImage(originalImage, 0, 0);
            // Reset "After" canvas dimensions (but don't draw yet)
            afterCanvas.width = originalImage.width;
            afterCanvas.height = originalImage.height;
            statusElem.textContent = "Image loaded.";
            checkReadyState(); // Check if LUT is also ready
        };
        img.onerror = () => {
            statusElem.textContent = "Error loading image file. Please try a different image.";
            originalImage = null; // Ensure it's null on error
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
    const file = event.target.files[0];
    lutData = null; // Reset LUT data first
    lutAppliedImageData = null; // Reset intermediate data
    applyLutButton.disabled = true; // Disable button immediately
    adjustmentsContainer.style.display = 'none'; // Hide adjustments

    if (!file) {
        lutInput.value = ""; // Reset input visually
        checkReadyState();
        return;
    }

    lutFilename = file.name; // Store filename
    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.cube') && !fileNameLower.endsWith('.3dl')) {
         statusElem.textContent = "Please select a valid .cube or .3dl file.";
        lutInput.value = ""; // Reset input visually
        checkReadyState();
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsedLut = parseLut(e.target.result, file.name);
            if (parsedLut) {
                lutData = parsedLut; // Assign only after successful parse
                statusElem.textContent = `LUT loaded (Size: ${lutData.size}).`;
                checkReadyState(); // Check if image is also ready
            } else {
                 // Error should be handled within parseLut or caught below
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
    if (originalImage && lutData && beforeCanvas.width > 0) {
        statusElem.textContent = "Applying LUT... (this may take a moment)";
        applyLutButton.disabled = true;
        downloadLink.style.display = 'none';
        adjustmentsContainer.style.display = 'none'; // Hide adjustments until done

        // Use setTimeout to allow UI update before heavy processing
        setTimeout(applyLutAndAdjustments, 50);
    } else {
        statusElem.textContent = "Cannot apply. Ensure image and LUT are correctly loaded.";
        applyLutButton.disabled = true;
    }
}

// --- Adjustment Handlers ---
function handleAdjustmentChange() {
    initializeAdjustmentValues(); // Update display always
    if (lutAppliedImageData) {
         // Apply immediately for non-expensive sliders
         applyAdjustmentsOnly();
    }
}

function handleExpensiveAdjustmentChange() {
    initializeAdjustmentValues(); // Update display always
    if (lutAppliedImageData) {
        statusElem.textContent = "Applying filter..."; // Indicate processing
        // Debounce expensive operations
        clearTimeout(adjustmentTimeoutId);
        adjustmentTimeoutId = setTimeout(() => {
            applyAdjustmentsOnly(); // Apply after a short delay
        }, 250); // Adjust delay as needed (milliseconds)
    }
}


function handleResetAdjustments() {
    // Reset all sliders to default values
    brightnessSlider.value = 0;
    exposureSlider.value = 0;
    contrastSlider.value = 100;
    highlightsSlider.value = 0;
    shadowsSlider.value = 0;
    blackPointSlider.value = 0;
    warmthSlider.value = 0;
    tintSlider.value = 0;
    saturationSlider.value = 100;
    vibrancySlider.value = 0;
    sharpnessSlider.value = 0;
    noiseReductionSlider.value = 0;
    vignetteSlider.value = 0;

    initializeAdjustmentValues(); // Update display
    if (lutAppliedImageData) {
        clearTimeout(adjustmentTimeoutId); // Cancel any pending expensive update
        applyAdjustmentsOnly(); // Re-apply with default values
    }
}

// --- LUT Parsing Logic ---
function parseLut(lutString, filename = '') {
    const lines = lutString.split('\n');
    let size = null;
    const table = [];
    let readingTable = false;
    let sizeFound = false;
    let detectedFormat = null;
    let is3dlInt = false;
    let maxIntVal = 4095.0; // Default for float .cube, adjusted for int .3dl
    let domainMin = [0.0, 0.0, 0.0];
    let domainMax = [1.0, 1.0, 1.0];

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue; // Skip empty lines and comments

        const parts = line.split(/\s+/); // Split by whitespace

        // --- Find Size and Format ---
        if (!sizeFound) {
            const keyword = parts[0].toUpperCase();
            if (keyword === 'LUT_3D_SIZE') {
                if (parts.length >= 2) {
                    size = parseInt(parts[1], 10);
                    if (isNaN(size) || size <= 1) throw new Error("Invalid LUT_3D_SIZE value.");
                    detectedFormat = 'cube';
                    sizeFound = true;
                    readingTable = true; // Start reading data after this line
                    continue; // Move to next line
                } else { throw new Error("Malformed LUT_3D_SIZE line."); }
            } else if (keyword === 'MESH' && parts.length >= 2) {
                 // Basic .3dl MESH support (assuming uniform grid)
                 size = parseInt(parts[1], 10);
                 if (isNaN(size) || size <= 1) throw new Error("Invalid Mesh size value.");
                 // Check for non-uniform grid (not supported)
                 if(parts.length > 2 && (parts[1] !== parts[2] || parts[1] !== parts[3])) {
                    throw new Error("Non-uniform mesh sizes in .3dl are not supported.");
                 }
                 detectedFormat = '3dl';
                 sizeFound = true;
                 readingTable = true;
                 continue;
            } else if (keyword === 'DOMAIN_MIN' && parts.length >= 4) {
                 domainMin = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])];
                 if (domainMin.some(isNaN)) throw new Error("Invalid DOMAIN_MIN values.");
                 continue; // Keep searching for size or data
             } else if (keyword === 'DOMAIN_MAX' && parts.length >= 4) {
                 domainMax = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])];
                 if (domainMax.some(isNaN)) throw new Error("Invalid DOMAIN_MAX values.");
                 continue; // Keep searching for size or data
             }
            // Potentially add checks for other keywords if needed
        }

        // --- Read Table Data ---
        if (readingTable && size) {
            // Expect 3 float values per line
            if (parts.length === 3) {
                const r_str = parts[0], g_str = parts[1], b_str = parts[2];
                const r = parseFloat(r_str), g = parseFloat(g_str), b = parseFloat(b_str);

                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    // --- .3dl Integer Detection Heuristic ---
                    if (detectedFormat === '3dl' && table.length === 0) { // Check only first data line
                        // If values are clearly > 1.0 OR integers without decimals (except 0 or 1)
                       if (r > 1.1 || g > 1.1 || b > 1.1 || (r_str.indexOf('.') === -1 && r !== 0 && r!== 1)) {
                           is3dlInt = true;
                           // Guess common max values based on first entry's magnitude
                            const maxVal = Math.max(r,g,b);
                            if (maxVal > 60000) maxIntVal = 65535.0;       // 16-bit
                            else if (maxVal > 4000) maxIntVal = 4095.0;    // 12-bit
                            else if (maxVal > 1000) maxIntVal = 1023.0;    // 10-bit
                            else if (maxVal > 250) maxIntVal = 255.0;      // 8-bit? (Less common)
                            else maxIntVal = Math.max(r,g,b) || 4095.0;    // Fallback or if max is small
                           console.log("Detected integer .3dl format, normalizing with max:", maxIntVal);
                        }
                    }

                    // Normalize if integer format detected, otherwise assume 0-1 range
                    let normR = r, normG = g, normB = b;
                    if (is3dlInt) {
                        normR /= maxIntVal; normG /= maxIntVal; normB /= maxIntVal;
                    }
                    // Clamp normalized values to ensure they are strictly within [0, 1]
                    normR = Math.max(0.0, Math.min(1.0, normR));
                    normG = Math.max(0.0, Math.min(1.0, normG));
                    normB = Math.max(0.0, Math.min(1.0, normB));
                    table.push(new Float32Array([normR, normG, normB]));
                } else { console.warn(`Skipping invalid data line (non-numeric): ${line}`); }
            } else { console.warn(`Skipping line with incorrect number of values (${parts.length}): ${line}`); }
        }
    } // End line loop

    // --- Validation ---
    if (!size) throw new Error("Could not determine LUT size (Missing 'LUT_3D_SIZE' or 'Mesh'?).");

    const expectedSize = size * size * size;
    if (table.length !== expectedSize) {
        // Allow inference if header might be wrong but data looks like a perfect cube
        const inferredSizeFloat = Math.cbrt(table.length);
        const inferredSizeInt = Math.round(inferredSizeFloat);
        if (table.length > 0 && Math.abs(inferredSizeFloat - inferredSizeInt) < 0.001 && inferredSizeInt > 1) {
             console.warn(`Header size (${size}) mismatch. Data count (${table.length}) suggests size ${inferredSizeInt}. Using inferred size.`);
             size = inferredSizeInt; // Correct the size based on actual data
        } else {
            // If not a perfect cube, throw original error
             throw new Error(`LUT table data size mismatch. Header/Expected ${size*size*size} entries, found ${table.length}. Check file format.`);
        }
    }

    console.log(`Parsed LUT: Size=${size}, Format=${detectedFormat || 'Unknown'}, Ints=${is3dlInt}, Domain=[${domainMin}]-[${domainMax}]`);
    return { size, table, domainMin, domainMax };
}


// --- LUT Application & Adjustment Logic ---

// Step 1: Apply LUT and store the result
function applyLutAndAdjustments() {
    try {
        if (!originalImage || !lutData || beforeCanvas.width === 0) {
            throw new Error("Missing image, LUT data, or canvas not ready.");
        }

        const width = beforeCanvas.width;
        const height = beforeCanvas.height;
        if (afterCanvas.width !== width || afterCanvas.height !== height) {
            afterCanvas.width = width;
            afterCanvas.height = height;
        }

        const originalImageData = beforeCtx.getImageData(0, 0, width, height);
        const pixels = originalImageData.data; // Read original pixels

        // Create a new ImageData to store the LUT result
        lutAppliedImageData = afterCtx.createImageData(width, height);
        const lutPixels = lutAppliedImageData.data; // Buffer to write LUT result into

        const lutSize = lutData.size;
        const lutTable = lutData.table;
        const sizeM1 = lutSize - 1;
        const domainMin = lutData.domainMin || [0.0, 0.0, 0.0];
        const domainMax = lutData.domainMax || [1.0, 1.0, 1.0];
        // Precompute domain scaling factors to avoid division in the loop
        const domainScale = [
            (domainMax[0] - domainMin[0]) === 0 ? 1.0 : 1.0 / (domainMax[0] - domainMin[0]),
            (domainMax[1] - domainMin[1]) === 0 ? 1.0 : 1.0 / (domainMax[1] - domainMin[1]),
            (domainMax[2] - domainMin[2]) === 0 ? 1.0 : 1.0 / (domainMax[2] - domainMin[2])
        ];

        // --- Apply LUT Loop ---
        for (let i = 0; i < pixels.length; i += 4) {
            // Read original pixel (normalize to 0-1)
            let r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255;

            // --- Domain Mapping ---
            r = (r - domainMin[0]) * domainScale[0];
            g = (g - domainMin[1]) * domainScale[1];
            b = (b - domainMin[2]) * domainScale[2];

            // Clamp results after domain mapping to ensure they are within [0, 1] for LUT lookup
            r = Math.max(0.0, Math.min(1.0, r));
            g = Math.max(0.0, Math.min(1.0, g));
            b = Math.max(0.0, Math.min(1.0, b));

            // --- Trilinear Interpolation ---
            const r_idx = r * sizeM1, g_idx = g * sizeM1, b_idx = b * sizeM1;
            const r0 = Math.floor(r_idx), g0 = Math.floor(g_idx), b0 = Math.floor(b_idx);

            // Calculate clamped indices for the 8 surrounding corners
            // Clamp floor index (r0 -> r0_c)
            const r0_c = Math.max(0, Math.min(sizeM1, r0));
            const g0_c = Math.max(0, Math.min(sizeM1, g0));
            const b0_c = Math.max(0, Math.min(sizeM1, b0));
             // Calculate ceiling index (clamped)
            const r1_c = Math.min(r0_c + 1, sizeM1);
            const g1_c = Math.min(g0_c + 1, sizeM1);
            const b1_c = Math.min(b0_c + 1, sizeM1);

            // Calculate fractional parts for interpolation
            const rf = r_idx - r0, gf = g_idx - g0, bf = b_idx - b0;

            // Get the color values from the LUT for the 8 corners
            const c000 = getLutValue(r0_c, g0_c, b0_c, lutSize, lutTable);
            const c100 = getLutValue(r1_c, g0_c, b0_c, lutSize, lutTable);
            const c010 = getLutValue(r0_c, g1_c, b0_c, lutSize, lutTable);
            const c110 = getLutValue(r1_c, g1_c, b0_c, lutSize, lutTable);
            const c001 = getLutValue(r0_c, g0_c, b1_c, lutSize, lutTable);
            const c101 = getLutValue(r1_c, g0_c, b1_c, lutSize, lutTable);
            const c011 = getLutValue(r0_c, g1_c, b1_c, lutSize, lutTable);
            const c111 = getLutValue(r1_c, g1_c, b1_c, lutSize, lutTable);

            // Interpolate along R axis
            const c00 = lerpVector(c000, c100, rf);
            const c10 = lerpVector(c010, c110, rf);
            const c01 = lerpVector(c001, c101, rf);
            const c11 = lerpVector(c011, c111, rf);
            // Interpolate along G axis
            const c0 = lerpVector(c00, c10, gf);
            const c1 = lerpVector(c01, c11, gf);
            // Interpolate along B axis
            const finalColor = lerpVector(c0, c1, bf); // finalColor is [r, g, b] in range 0-1

            // Store LUT result (convert back to 0-255 and clamp)
            lutPixels[i]     = Math.max(0, Math.min(255, Math.round(finalColor[0] * 255)));
            lutPixels[i + 1] = Math.max(0, Math.min(255, Math.round(finalColor[1] * 255)));
            lutPixels[i + 2] = Math.max(0, Math.min(255, Math.round(finalColor[2] * 255)));
            lutPixels[i + 3] = pixels[i + 3]; // Preserve original alpha from input image
        }
        // --- End Apply LUT Loop ---

        // Now apply the *current* adjustment settings to the LUT result
        applyAdjustmentsOnly();

        // Show adjustment controls *after* successful LUT application
        adjustmentsContainer.style.display = 'flex'; // Use flex for columns

    } catch (error) {
        console.error("Error during LUT application:", error);
        statusElem.textContent = `Error applying LUT: ${error.message}`;
        applyLutButton.disabled = false; // Re-enable button on error
        downloadLink.style.display = 'none';
        adjustmentsContainer.style.display = 'none';
        lutAppliedImageData = null; // Clear intermediate data on error
    }
}


// Step 2: Apply ALL adjustments using the stored LUT result
function applyAdjustmentsOnly() {
    if (!lutAppliedImageData) {
        console.warn("Cannot apply adjustments, LUT result not available.");
        return;
    }

    const width = lutAppliedImageData.width;
    const height = lutAppliedImageData.height;

    // --- Get ALL current adjustment values ---
    const brightness = parseInt(brightnessSlider.value, 10);                // -100 to 100 (offset)
    const exposure = parseFloat(exposureSlider.value) / 100.0;              // -1 to 1 (map to multiplier, e.g., pow(2, exposure))
    const contrast = parseFloat(contrastSlider.value) / 100.0;              // 0 to 2 (multiplier)
    const highlights = parseFloat(highlightsSlider.value) / 100.0;          // -1 to 1 (selective gain/reduction)
    const shadows = parseFloat(shadowsSlider.value) / 100.0;                // -1 to 1 (selective gain/reduction)
    const blackPoint = parseFloat(blackPointSlider.value) / 255.0;          // 0 to 50/255 (offset/clip level)
    const warmth = parseFloat(warmthSlider.value) / 100.0;                  // -1 to 1 (adjust R/B)
    const tint = parseFloat(tintSlider.value) / 100.0;                      // -1 to 1 (adjust G/Mg)
    const saturation = parseFloat(saturationSlider.value) / 100.0;          // 0 to 2 (multiplier)
    const vibrancy = parseFloat(vibrancySlider.value) / 100.0;              // -1 to 1 (smart saturation)
    const sharpness = parseFloat(sharpnessSlider.value) / 100.0;            // 0 to 1 (kernel mix factor)
    const noiseReduction = parseFloat(noiseReductionSlider.value) / 100.0;  // 0 to 1 (blur mix factor)
    const vignetteAmount = parseFloat(vignetteSlider.value) / 100.0;        // -1 to 1 (darken/lighten edges)

    // --- Prepare data buffers ---
    const srcPixels = lutAppliedImageData.data; // Source data (result of LUT)
    const finalImageData = afterCtx.createImageData(width, height); // For final output canvas
    const dstPixels = finalImageData.data; // Destination array for final output

    // Intermediate buffers (using Float32Array for calculations)
    let buffer1 = new Float32Array(srcPixels); // Copy LUT result to float buffer
    let buffer2 = new Float32Array(width * height * 4); // Buffer for convolution output

    // --- Apply Non-Convolution Adjustments (Pixel by Pixel on buffer1) ---
    for (let i = 0; i < buffer1.length; i += 4) {
        let r = buffer1[i];
        let g = buffer1[i + 1];
        let b = buffer1[i + 2];
        // Alpha (a) is carried through in buffer1[i+3]

        // --- Order of operations can impact the final look ---

        // 1. Brightness (Simple offset)
        r += brightness;
        g += brightness;
        b += brightness;

        // 2. Black Point (Lift blacks)
        const blackLift = blackPoint * 255; // Scale black point to 0-255 range
        r = Math.max(blackLift, r);
        g = Math.max(blackLift, g);
        b = Math.max(blackLift, b);
        // Optional: Rescale the remaining range [blackLift, 255] to [0, 255]
        // This prevents compressing highlights when lifting blacks significantly.
        if (blackLift > 0 && blackLift < 255) {
             const scale = 255 / (255 - blackLift);
             r = (r - blackLift) * scale;
             g = (g - blackLift) * scale;
             b = (b - blackLift) * scale;
        }


        // 3. Exposure (Multiplier - using pow(2, val) gives f-stop like adjustment)
        const exposureFactor = Math.pow(2, exposure);
        r *= exposureFactor;
        g *= exposureFactor;
        b *= exposureFactor;


        // 4. Highlights / Shadows (Luminance-based selective adjustment)
        // Calculate approximate luminance (BT.709 coefficients)
        // Clamp RGB before calculating luminance to avoid issues with extreme values
        const r_lum = Math.max(0, Math.min(255, r));
        const g_lum = Math.max(0, Math.min(255, g));
        const b_lum = Math.max(0, Math.min(255, b));
        const lum = 0.2126 * r_lum + 0.7152 * g_lum + 0.0722 * b_lum;
        const lumNorm = lum / 255.0; // Normalize luminance to 0-1

        // Apply Shadows adjustment (boost/reduce darker areas)
        const shadowFactor = Math.pow(2, shadows * Math.pow(1.0 - lumNorm, 2)); // Stronger effect in shadows, exponential scale
        r *= shadowFactor;
        g *= shadowFactor;
        b *= shadowFactor;


         // Apply Highlights adjustment (boost/reduce brighter areas)
         // Use pow(2, -highlights...) for recovery effect
        const highlightFactor = Math.pow(2, -highlights * Math.pow(lumNorm, 1.5)); // Stronger effect in highlights, exponential scale
        r *= highlightFactor;
        g *= highlightFactor;
        b *= highlightFactor;


        // 5. Contrast (Adjust around mid-gray 128)
        r = (r - 128) * contrast + 128;
        g = (g - 128) * contrast + 128;
        b = (b - 128) * contrast + 128;

        // 6. Warmth (Orange/Blue shift) & Tint (Green/Magenta shift)
        // Adjust R vs B for Warmth, G vs R&B for Tint
        const warmthEffect = warmth * 25; // Scale effect
        const tintEffect = tint * 25;     // Scale effect
        r += warmthEffect;
        b -= warmthEffect;
        // Tint affects Green vs Magenta (Red+Blue)
        g += tintEffect;
        r -= tintEffect * 0.5; // Reduce R and B slightly to compensate G shift
        b -= tintEffect * 0.5;


        // 7. Saturation & Vibrancy (Requires HSL conversion)
        if (saturation !== 1.0 || vibrancy !== 0.0) {
             // Clamp input to HSL conversion to avoid errors
            const r_hsl_in = Math.max(0, Math.min(255, r)) / 255;
            const g_hsl_in = Math.max(0, Math.min(255, g)) / 255;
            const b_hsl_in = Math.max(0, Math.min(255, b)) / 255;
            const hsl = rgbToHsl(r_hsl_in, g_hsl_in, b_hsl_in);

            let currentSat = hsl[1];
            let newSat = currentSat;

            // Apply vibrancy (boosts less saturated colors more, reduces highly saturated colors if negative)
            // Use a curve that has more effect near sat=0 and less near sat=1
            const vibAmount = vibrancy * (1.0 - Math.pow(currentSat, 1.5)); // Adjust power for falloff
            newSat += vibAmount;

             // Apply base saturation multiplier *after* vibrancy adjustment
            newSat *= saturation;


            hsl[1] = Math.max(0.0, Math.min(1.0, newSat)); // Clamp final saturation

            const newRgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
            r = newRgb[0] * 255;
            g = newRgb[1] * 255;
            b = newRgb[2] * 255;
        }

        // Store result back into buffer1 (clamping just before storing)
        buffer1[i] = Math.max(0, Math.min(255, r));
        buffer1[i + 1] = Math.max(0, Math.min(255, g));
        buffer1[i + 2] = Math.max(0, Math.min(255, b));
        // buffer1[i+3] = a; // Alpha remains unchanged in this loop
    }
    // --- End Non-Convolution Adjustments ---


    // --- Apply Convolution-Based Adjustments (Sharpness, Noise Reduction) ---
    // These operate on buffer1 (previous result) and write to buffer2 or back to buffer1
    let processedBuffer = buffer1; // Start with the result of non-convolutional adjustments

    // 8. Noise Reduction (Simple Box Blur - Very basic, blurs details)
    if (noiseReduction > 0.01) {
         console.time("Noise Reduction");
         // Apply 3x3 box blur using convolution
         const blurKernel = [1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9, 1/9];
         buffer2 = applyConvolution(processedBuffer, width, height, blurKernel, 1.0); // Blur into buffer2
         // Mix blurred result (buffer2) back into processedBuffer based on slider
         for(let i=0; i<processedBuffer.length; i+=1) {
              processedBuffer[i] = lerp(processedBuffer[i], buffer2[i], noiseReduction);
         }
         // processedBuffer now holds the noise-reduced result
         console.timeEnd("Noise Reduction");
    }

    // 9. Sharpness (Simple Laplacian Kernel - can increase noise)
    if (sharpness > 0.01) {
        console.time("Sharpness");
        // Basic 3x3 Sharpen Kernel (enhances edges)
         const sharpenKernel = [-1, -1, -1, -1,  9, -1, -1, -1, -1]; // Sum = 1

         buffer2 = applyConvolution(processedBuffer, width, height, sharpenKernel, 1.0); // Sharpen into buffer2
         // Mix sharpened result (buffer2) back into processedBuffer based on slider
         for(let i=0; i<processedBuffer.length; i+=1) {
            // Only mix RGB, keep alpha from original processedBuffer
            if ((i + 1) % 4 !== 0) {
                 processedBuffer[i] = lerp(processedBuffer[i], buffer2[i], sharpness);
            } // else alpha remains untouched
         }
         // processedBuffer now holds the sharpened (and possibly noise-reduced) result
         console.timeEnd("Sharpness");
    }

    // --- Apply Final Adjustments (Vignette - Pixel by Pixel on processedBuffer) ---
     for (let i = 0; i < processedBuffer.length; i += 4) {
        let r = processedBuffer[i];
        let g = processedBuffer[i + 1];
        let b = processedBuffer[i + 2];
        const a = processedBuffer[i + 3]; // Alpha from the start of this function or after convolution

        // 10. Vignette
        if (Math.abs(vignetteAmount) > 0.01) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            // Calculate normalized coordinates relative to center (-0.5 to 0.5)
            const dx = x / width - 0.5;
            const dy = y / height - 0.5;
            // Calculate distance from center (using ellipse for aspect ratio correction)
            // const aspectRatio = width / height;
            // const distSq = (dx * dx) + (dy * dy / (aspectRatio * aspectRatio)); // Elliptical distance squared
            const distSq = dx * dx + dy * dy; // Simple circular distance squared
            const maxDistSq = 0.5; // Max squared distance (at corners, approx 0.5^2+0.5^2)

            // Normalize distance roughly to 0-1 range (sqrt is needed here)
            const distNorm = Math.sqrt(Math.min(distSq / maxDistSq, 1.0)); // Clamp ratio before sqrt

            // Vignette effect strength increases towards edges (e.g., quadratic curve)
            // Power > 1: Faster falloff near center, Power < 1: Slower falloff
            const vignetteFactor = Math.pow(distNorm, 2.0); // Adjust power (e.g., 1.5 to 2.5)

            // Calculate the adjustment multiplier (darken or lighten)
            const vignetteMul = 1.0 - vignetteAmount * vignetteFactor;

            r *= vignetteMul;
            g *= vignetteMul;
            b *= vignetteMul;
        }

        // --- Final Clamp & Write to Destination Canvas Buffer ---
        dstPixels[i]     = Math.round(Math.max(0, Math.min(255, r)));
        dstPixels[i + 1] = Math.round(Math.max(0, Math.min(255, g)));
        dstPixels[i + 2] = Math.round(Math.max(0, Math.min(255, b)));
        dstPixels[i + 3] = Math.round(Math.max(0, Math.min(255, a))); // Write final alpha
     }

    // --- Put the final adjusted data onto the canvas ---
    afterCtx.putImageData(finalImageData, 0, 0);

    updateDownloadLink(); // Update download link with the final result

    applyLutButton.disabled = false; // Re-enable if needed
    statusElem.textContent = "Adjustments applied. Slide to modify or download.";
}


function updateDownloadLink() {
     if (!originalImage || !lutData || !lutAppliedImageData) return;

     const imgBaseName = originalImageFilename.substring(0, originalImageFilename.lastIndexOf('.')) || 'image';
     const lutBaseName = lutFilename.substring(0, lutFilename.lastIndexOf('.')) || 'lut';

     // Generate suffix based on non-default slider values
     const adjustments = [
         brightnessSlider.value !== '0' && `b${brightnessSlider.value}`,
         exposureSlider.value !== '0' && `exp${exposureSlider.value}`,
         contrastSlider.value !== '100' && `c${contrastSlider.value}`,
         highlightsSlider.value !== '0' && `h${highlightsSlider.value}`,
         shadowsSlider.value !== '0' && `s${shadowsSlider.value}`,
         blackPointSlider.value !== '0' && `bp${blackPointSlider.value}`,
         warmthSlider.value !== '0' && `w${warmthSlider.value}`,
         tintSlider.value !== '0' && `t${tintSlider.value}`,
         saturationSlider.value !== '100' && `sat${saturationSlider.value}`,
         vibrancySlider.value !== '0' && `vib${vibrancySlider.value}`,
         sharpnessSlider.value !== '0' && `sh${sharpnessSlider.value}`,
         noiseReductionSlider.value !== '0' && `nr${noiseReductionSlider.value}`,
         vignetteSlider.value !== '0' && `vig${vignetteSlider.value}`
     ].filter(Boolean).join('_'); // Filter out false values (defaults) and join

     const adjSuffix = adjustments ? `_adj_${adjustments}` : '';
     const downloadFilename = `${imgBaseName}_${lutBaseName}${adjSuffix}.png`;

     downloadLink.href = afterCanvas.toDataURL('image/png'); // Get data from the *visible* canvas
     downloadLink.download = downloadFilename;
     downloadLink.style.display = 'inline-block';
}

// --- Helper Functions ---

// Gets value from LUT table using pre-calculated clamped indices
function getLutValue(r_idx, g_idx, b_idx, lutSize, lutTable) {
    const index = b_idx * lutSize * lutSize + g_idx * lutSize + r_idx;
    // Boundary check is good practice, though indices should be clamped beforehand
    if (index < 0 || index >= lutTable.length) {
        console.error(`LUT index out of bounds: [${r_idx}, ${g_idx}, ${b_idx}] -> ${index} (table size: ${lutTable.length})`);
        return new Float32Array([1.0, 0.0, 1.0]); // Return Magenta for errors
    }
    return lutTable[index]; // lutTable contains Float32Array([r,g,b])
}

// Linear interpolation between two numbers
function lerp(a, b, t) { return a * (1 - t) + b * t; }

// Linear interpolation between two vectors (Float32Arrays)
function lerpVector(v1, v2, t) {
    // Handle potential errors if LUT data is invalid
    if (!v1 || !v2) {
        // console.warn("Interpolating with invalid vector(s). Returning error color.");
        return v1 || v2 || new Float32Array([1.0, 0.0, 1.0]); // Magenta error
    }
    // Clamp t just in case it goes slightly out of bounds due to float math
    t = Math.max(0.0, Math.min(1.0, t));
    return new Float32Array([
        lerp(v1[0], v2[0], t),
        lerp(v1[1], v2[1], t),
        lerp(v1[2], v2[2], t)
    ]);
}

// --- RGB <-> HSL Conversion Helpers ---
// Source: https://stackoverflow.com/a/9493060/1319114 & https://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
function rgbToHsl(r, g, b){
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
}


/**
 * Applies a 3x3 convolution kernel to an image buffer.
 * NOTE: This is slow in JavaScript! Uses Float32Array for input/output.
 * Handles image boundaries by clamping coordinates ('extend' edge mode).
 *
 * @param {Float32Array} srcBuffer Buffer with pixel data (RGBA interleaved, float)
 * @param {number} width Image width
 * @param {number} height Image height
 * @param {number[]} kernel 3x3 kernel (9 elements, row-major)
 * @param {number} factor Factor to multiply the result by (default 1.0)
 * @returns {Float32Array} New buffer with convolved data
 */
function applyConvolution(srcBuffer, width, height, kernel, factor = 1.0) {
    // Create a destination buffer of the same size.
    // Important: Create a *new* buffer, don't modify srcBuffer in place if it's needed later.
    const dstBuffer = new Float32Array(srcBuffer.length);
    const kSize = 3; // Assuming 3x3 kernel
    const kRadius = Math.floor(kSize / 2); // Radius = 1 for 3x3

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r_sum = 0, g_sum = 0, b_sum = 0;
            const dstIdx = (y * width + x) * 4; // Index for the current pixel in destination

            // Iterate through the kernel
            for (let ky = 0; ky < kSize; ky++) {
                for (let kx = 0; kx < kSize; kx++) {
                    const kernelIdx = ky * kSize + kx; // Index within the 1D kernel array
                    const kernelVal = kernel[kernelIdx];

                    // Calculate the source pixel coordinates corresponding to the kernel position
                    // Clamp coordinates to stay within image bounds ('extend' edge mode)
                    const imgX = Math.max(0, Math.min(width - 1, x + kx - kRadius));
                    const imgY = Math.max(0, Math.min(height - 1, y + ky - kRadius));
                    const srcIdx = (imgY * width + imgX) * 4; // Index for the source pixel

                    // Accumulate weighted R, G, B values
                    r_sum += srcBuffer[srcIdx] * kernelVal;
                    g_sum += srcBuffer[srcIdx + 1] * kernelVal;
                    b_sum += srcBuffer[srcIdx + 2] * kernelVal;
                }
            }

            // Apply factor and store result in destination buffer
            dstBuffer[dstIdx] = r_sum * factor;
            dstBuffer[dstIdx + 1] = g_sum * factor;
            dstBuffer[dstIdx + 2] = b_sum * factor;
            dstBuffer[dstIdx + 3] = srcBuffer[dstIdx + 3]; // Preserve original alpha from the source buffer
        }
    }
    return dstBuffer; // Return the newly created buffer with convolved data
}

