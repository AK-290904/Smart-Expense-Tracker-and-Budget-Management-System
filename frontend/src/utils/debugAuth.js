/**
 * Debug utility to check authentication state
 */

export const debugAuth = () => {
  console.log('=== AUTH DEBUG ===');
  console.log('Access Token:', localStorage.getItem('access_token'));
  console.log('Refresh Token:', localStorage.getItem('refresh_token'));
  console.log('User:', localStorage.getItem('user'));
  console.log('All localStorage keys:', Object.keys(localStorage));
  console.log('==================');
};

// Make it available globally for debugging
window.debugAuth = debugAuth;
