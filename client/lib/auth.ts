export function isLoggedIn(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem('token');
}
