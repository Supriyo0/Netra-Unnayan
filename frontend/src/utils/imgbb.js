/**
 * Netra Unnayan - ImgBB Direct Cloud Upload Utility
 * Uploads images directly to ImgBB CDN to minimize web server storage.
 */
import api from '../api/client';

// Default / fallback ImgBB API key (can be overridden by Admin Settings)
const DEFAULT_IMGBB_KEY = '6d207e02198a847aa5ad3ac50e97ff43';

let cachedApiKey = null;

export const getImgbbApiKey = async () => {
  if (cachedApiKey) return cachedApiKey;
  try {
    const res = await api.get('/settings.php');
    if (res?.success && res.data?.imgbb_api_key) {
      cachedApiKey = res.data.imgbb_api_key.trim();
      return cachedApiKey;
    }
  } catch (err) {
    console.warn('Could not fetch custom ImgBB key from settings, using default:', err);
  }
  return DEFAULT_IMGBB_KEY;
};

/**
 * Upload an image File, Blob, or base64 data directly to ImgBB.
 * @param {File|Blob|string} imageFile - The file, blob, or base64 data URL
 * @param {string} [customKey] - Optional custom ImgBB API key
 * @returns {Promise<{success: boolean, url: string, display_url?: string, thumb_url?: string, message?: string}>}
 */
export const uploadToImgBB = async (imageFile, customKey = null) => {
  if (!imageFile) {
    throw new Error('No image provided for upload.');
  }

  const apiKey = customKey || await getImgbbApiKey();

  // 1. Try Direct Client-Side Upload to ImgBB API
  try {
    const formData = new FormData();
    if (typeof imageFile === 'string') {
      // Base64 data URL or pure base64
      const cleanBase64 = imageFile.includes(',') ? imageFile.split(',')[1] : imageFile;
      formData.append('image', cleanBase64);
    } else {
      formData.append('image', imageFile);
    }

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result && result.success && result.data?.url) {
      return {
        success: true,
        url: result.data.url,
        display_url: result.data.display_url || result.data.url,
        thumb_url: result.data.thumb?.url || result.data.url,
        delete_url: result.data.delete_url
      };
    } else if (result && result.error?.message) {
      console.warn('ImgBB direct returned error, trying server proxy:', result.error.message);
    }
  } catch (directErr) {
    console.warn('ImgBB direct client upload failed (possibly CORS or network), falling back to backend stream:', directErr);
  }

  // 2. Server Proxy Fallback: Streams to ImgBB with zero server disk usage
  try {
    const proxyFormData = new FormData();
    if (typeof imageFile === 'string') {
      proxyFormData.append('image_data', imageFile);
    } else {
      proxyFormData.append('file', imageFile);
    }
    proxyFormData.append('api_key', apiKey);

    const proxyRes = await api.post('/upload_imgbb.php', proxyFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (proxyRes?.success && proxyRes.data?.url) {
      return {
        success: true,
        url: proxyRes.data.url,
        display_url: proxyRes.data.display_url || proxyRes.data.url,
        thumb_url: proxyRes.data.thumb_url || proxyRes.data.url
      };
    } else {
      throw new Error(proxyRes?.message || 'Server proxy upload failed.');
    }
  } catch (proxyErr) {
    // 3. Emergency fallback to standard upload if ImgBB is completely unreachable
    try {
      const fallbackFormData = new FormData();
      if (typeof imageFile === 'string') {
        fallbackFormData.append('image_data', imageFile);
      } else {
        fallbackFormData.append('file', imageFile);
      }
      fallbackFormData.append('prefix', 'cloud');

      const fallbackRes = await api.post('/admin/upload.php', fallbackFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (fallbackRes?.success && fallbackRes.data?.url) {
        return {
          success: true,
          url: fallbackRes.data.url,
          display_url: fallbackRes.data.url
        };
      }
    } catch {
      // ignore
    }
    throw new Error(proxyErr.message || 'Image upload to ImgBB failed.');
  }
};
