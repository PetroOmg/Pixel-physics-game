// src/workers/simulationWorker.js

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'computeAverageTemperature') {
        const { pixelData, width, height } = payload;
        let sumTemperature = 0;
        for (let i = 1; i < pixelData.length; i += 4) { // Iterate over G channel
            sumTemperature += Math.max(0.0, Math.min(1.0, pixelData[i]));
        }
        const averageTemperature = sumTemperature / (width * height);
        self.postMessage({ type: 'averageTemperature', averageTemperature });
    }
    // Handle other message types as needed
};
