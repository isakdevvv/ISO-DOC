
import axios from 'axios';

const API_URL = 'http://localhost:4000';

async function verifySearch() {
    try {
        console.log('Testing Search Endpoint...');
        // Search for something generic
        const response = await axios.get(`${API_URL}/search?q=policy`);

        console.log('Status:', response.status);
        console.log('Data keys:', Object.keys(response.data));

        if (response.data.vectorResults && response.data.keywordResults) {
            console.log('Structure is correct: { vectorResults, keywordResults }');
            console.log('Vector Results:', response.data.vectorResults.length);
            console.log('Keyword Results:', response.data.keywordResults.length);
        } else {
            console.error('Structure is INCORRECT. Got:', response.data);
        }

    } catch (error) {
        console.error('Search verification failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

verifySearch();
