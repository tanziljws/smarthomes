const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/:locationCode', async (req, res) => {
    const locationCode = req.params.locationCode.trim();
    if (!/^\d+$/.test(locationCode)) {
        return res.status(400).json({ 
            error: 'Invalid location code format',
            details: 'Location code must contain only numbers'
        });
    }

    console.log('Received request for location:', locationCode);

    try {
        console.log('Making request to BMKG API...');
        const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${locationCode}`;
        console.log('BMKG API URL:', url);

        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Weather Monitoring App'
            },
            timeout: 5000
        });

        if (!response.data) {
            throw new Error('Empty response from BMKG API');
        }

        console.log('BMKG API Response:', response.data);

        // Validate and transform data
        const weatherData = {
            t: response.data.t || 0,
            hu: response.data.hu || 0,
            weather_desc: response.data.weather_desc || 'Tidak tersedia',
            local_datetime: response.data.local_datetime || new Date().toISOString(),
            ws: response.data.ws || 0,
            wd: response.data.wd || 'Tidak tersedia',
            tcc: response.data.tcc || 0,
            vs_text: response.data.vs_text || '0'
        };

        console.log('Processed weather data:', weatherData);
        res.json(weatherData);

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({
                error: 'Request timeout',
                message: 'BMKG API is not responding'
            });
        }

        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status
        });

        res.status(500).json({
            error: 'Failed to fetch weather data',
            message: error.message,
            locationCode: locationCode,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
