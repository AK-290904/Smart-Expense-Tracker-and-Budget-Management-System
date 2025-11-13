/**
 * Utility to clear authentication data
 * Use this when you're stuck in an auth loop
 */

export const clearAuthData = () => {
  console.log('🧹 Clearing all authentication data...');
  
  // Clear localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  // Clear sessionStorage (just in case)
  sessionStorage.clear();
  
  console.log('✅ Authentication data cleared');
  console.log('🔄 Reloading page...');
  
  // Reload the page
  window.location.href = '/login';
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.clearAuthData = clearAuthData;
}

export default clearAuthData;
