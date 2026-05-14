const GATEWAY_URL = 'http://localhost:3000/v1';

async function test() {
  console.log('--- Testing API via Gateway ---');
  
  try {
    // 1. Health Checks
    console.log('\n[1] Testing Health Checks...');
    const mediaHealthRes = await fetch(`${GATEWAY_URL}/media/health`);
    const mediaHealth = await mediaHealthRes.json();
    console.log('Media Service Health:', mediaHealth);

    // 2. Auth - Register
    console.log('\n[2] Testing Auth - Register...');
    const email = `test_${Date.now()}@example.com`;
    const authRegRes = await fetch(`${GATEWAY_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'StrongPassword123!',
        username: `test_user_${Date.now()}`,
        displayName: 'Test User'
      })
    });
    const authReg = await authRegRes.json();
    if (!authRegRes.ok) throw new Error(`Auth fail: ${JSON.stringify(authReg)}`);
    console.log('Register Success: accountId =', authReg.accountId);
    const userId = authReg.accountId;

    // 3. Identity - Fetch Profile (it should be auto-created by auth orchestration)
    console.log('\n[3] Testing Identity - Fetch Profile...');
    // Wait a bit for async orchestration
    await new Promise(r => setTimeout(r, 1000));
    
    const profileRes = await fetch(`${GATEWAY_URL}/profiles/me`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${authReg.accessToken}`
      }
    });
    const profile = await profileRes.json();
    if (!profileRes.ok) throw new Error(`Profile fetch fail: ${JSON.stringify(profile)}`);
    console.log('Profile Fetched:', profile.username);

    // 4. Media - Upload Base64 (Pixel)
    console.log('\n[4] Testing Media - Upload Base64...');
    const pixelBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const mediaUploadRes = await fetch(`${GATEWAY_URL}/media/upload-base64`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authReg.accessToken}`
      },
      body: JSON.stringify({
        base64: pixelBase64,
        originalName: 'pixel.png',
        userId
      })
    });
    const mediaUpload = await mediaUploadRes.json();
    if (!mediaUploadRes.ok) throw new Error(`Media fail: ${JSON.stringify(mediaUpload)}`);
    console.log('Media Uploaded:', mediaUpload.id);
    const mediaId = mediaUpload.id;

    // 5. Media - Get Metadata
    console.log('\n[5] Testing Media - Get Metadata...');
    const mediaMetaRes = await fetch(`${GATEWAY_URL}/media/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${authReg.accessToken}` }
    });
    const mediaMeta = await mediaMetaRes.json();
    console.log('Media Metadata:', mediaMeta);

    console.log('\n--- ALL TESTS PASSED! ---');
  } catch (error) {
    console.error('\n--- TEST FAILED! ---');
    console.error(error.message);
  }
}

test();
