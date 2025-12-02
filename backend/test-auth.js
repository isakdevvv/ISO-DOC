async function testAuth() {
    const API_URL = 'http://localhost:4000';

    try {
        // 1. Try to access protected route without token (Should fail)
        console.log('1. Accessing protected route without token...');
        const res1 = await fetch(`${API_URL}/documents`);
        if (res1.status === 401) {
            console.log('PASSED: Returned 401 Unauthorized');
        } else {
            console.error('FAILED: Should have returned 401, got', res1.status);
        }

        // 2. Login to get token
        console.log('\n2. Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('PASSED: Got token');

        // 3. Access protected route with token (Should success)
        console.log('\n3. Accessing protected route with token...');
        const docsRes = await fetch(`${API_URL}/documents`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (docsRes.status === 200) {
            console.log('PASSED: Returned 200 OK');
        } else {
            console.error('FAILED: Unexpected status', docsRes.status);
        }

    } catch (e) {
        console.error('TEST FAILED:', e.message);
    }
}

testAuth();
