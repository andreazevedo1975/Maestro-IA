// utils/youtubeUtils.js

/**
 * Extracts the YouTube video ID from various URL formats.
 * @param {string} url The YouTube URL.
 * @returns {string | null} The video ID or null if not found.
 */
function getYouTubeVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  } else {
    return null;
  }
}

/**
 * Generates a privacy-enhanced, embeddable YouTube URL.
 * @param {string} url The original YouTube URL.
 * @returns {string | null} The embeddable URL or null if the ID is invalid.
 */
export function getYouTubeEmbedUrl(url) {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    // Using youtube-nocookie.com for enhanced privacy
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  }
  return null;
}