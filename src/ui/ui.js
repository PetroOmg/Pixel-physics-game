// src/ui/ui.js

/**
 * Creates and appends UI elements to the document body.
 */
export function createUIElements() {
    // FPS Counter
    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fpsCounter';
    fpsCounter.style.position = 'absolute';
    fpsCounter.style.top = '10px';
    fpsCounter.style.right = '10px';
    fpsCounter.style.background = 'rgba(0, 0, 0, 0.5)';
    fpsCounter.style.color = 'white';
    fpsCounter.style.padding = '5px 10px';
    fpsCounter.style.borderRadius = '5px';
    fpsCounter.style.fontFamily = 'Arial, sans-serif';
    fpsCounter.style.fontSize = '14px';
    fpsCounter.style.zIndex = '1000';
    fpsCounter.textContent = 'FPS: 0';
    document.body.appendChild(fpsCounter);

    // TPS Counter
    const tpsCounter = document.createElement('div');
    tpsCounter.id = 'tpsCounter';
    tpsCounter.style.position = 'absolute';
    tpsCounter.style.top = '30px';
    tpsCounter.style.right = '10px';
    tpsCounter.style.background = 'rgba(0, 0, 0, 0.5)';
    tpsCounter.style.color = 'white';
    tpsCounter.style.padding = '5px 10px';
    tpsCounter.style.borderRadius = '5px';
    tpsCounter.style.fontFamily = 'Arial, sans-serif';
    tpsCounter.style.fontSize = '14px';
    tpsCounter.style.zIndex = '1000';
    tpsCounter.textContent = 'TPS: 0';
    document.body.appendChild(tpsCounter);

    // Year Display
    const yearDisplay = document.createElement('div');
    yearDisplay.id = 'yearDisplay';
    yearDisplay.style.position = 'absolute';
    yearDisplay.style.bottom = '40px';
    yearDisplay.style.right = '10px';
    yearDisplay.style.background = 'rgba(0, 0, 0, 0.5)';
    yearDisplay.style.color = 'white';
    yearDisplay.style.padding = '5px 10px';
    yearDisplay.style.borderRadius = '5px';
    yearDisplay.style.fontFamily = 'Arial, sans-serif';
    yearDisplay.style.fontSize = '14px';
    yearDisplay.style.zIndex = '1000';
    yearDisplay.textContent = 'Year: 0';
    document.body.appendChild(yearDisplay);

    // Average Temperature Display
    const averageTempDisplay = document.createElement('div');
    averageTempDisplay.id = 'averageTempDisplay';
    averageTempDisplay.style.position = 'absolute';
    averageTempDisplay.style.bottom = '60px';
    averageTempDisplay.style.right = '10px';
    averageTempDisplay.style.background = 'rgba(0, 0, 0, 0.5)';
    averageTempDisplay.style.color = 'white';
    averageTempDisplay.style.padding = '5px 10px';
    averageTempDisplay.style.borderRadius = '5px';
    averageTempDisplay.style.fontFamily = 'Arial, sans-serif';
    averageTempDisplay.style.fontSize = '14px';
    averageTempDisplay.style.zIndex = '1000';
    averageTempDisplay.textContent = 'Avg Temp: 0.00';
    document.body.appendChild(averageTempDisplay);
}

/**
 * Updates the UI elements with the latest values.
 * @param {number} fps - Frames per second.
 * @param {number} tps - Ticks per second.
 * @param {number} year - Current simulation year.
 * @param {number} averageTemperature - Average temperature of the world.
 */
export function updateUI(fps, tps, year, averageTemperature) {
    const fpsCounter = document.getElementById('fpsCounter');
    const tpsCounter = document.getElementById('tpsCounter');
    const yearDisplay = document.getElementById('yearDisplay');
    const averageTempDisplay = document.getElementById('averageTempDisplay');

    if (fpsCounter) fpsCounter.textContent = `FPS: ${fps}`;
    if (tpsCounter) tpsCounter.textContent = `TPS: ${tps}`;
    if (yearDisplay) yearDisplay.textContent = `Year: ${year}`;
    if (averageTempDisplay) averageTempDisplay.textContent = `Avg Temp: ${averageTemperature.toFixed(2)}`;
}
