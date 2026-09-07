import { SERVER_BASE_URL } from '@/constants';

export function getImageUrl(url: string) {
  if (url.startsWith('/')) {
    return `${SERVER_BASE_URL}/imgs${url}`;
  }
  return url;
}

export async function uploadImage(file: File) {
  if (window.localStorage.getItem('workspace-mode') === 'github') {
    throw new Error('Image uploads are not available in GitHub workspace mode yet.');
  }
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${SERVER_BASE_URL}/imgs/upload`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  return json.data as string;
}
