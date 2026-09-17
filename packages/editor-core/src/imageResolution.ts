export type ImageResolutionStatus = 'error' | 'loading' | 'resolved';

type ImageResolutionListener = (url: string, status: ImageResolutionStatus) => void;

const statuses = new Map<string, ImageResolutionStatus>();
const listeners = new Set<ImageResolutionListener>();

const setStatus = (url: string, status: ImageResolutionStatus) => {
  statuses.set(url, status);
  listeners.forEach((listener) => {
    listener(url, status);
  });
};

export const getImageResolutionStatus = (url: string) => statuses.get(url);

export const subscribeToImageResolution = (listener: ImageResolutionListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Tracks asynchronous URL resolvers so the editor can distinguish an image
 * that is still being fetched from one whose resolution has failed.
 */
export const trackImageUrlResolver =
  (resolver: (url: string) => Promise<string> | string) =>
  (url: string): Promise<string> | string => {
    try {
      const result = resolver(url);
      if (typeof result === 'string') {
        setStatus(url, 'resolved');
        return result;
      }
      setStatus(url, 'loading');
      return result.then(
        (resolvedUrl) => {
          setStatus(url, 'resolved');
          return resolvedUrl;
        },
        (error: unknown) => {
          setStatus(url, 'error');
          throw error;
        },
      );
    } catch (error) {
      setStatus(url, 'error');
      throw error;
    }
  };
