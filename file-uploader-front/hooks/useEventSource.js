import { useEffect, useRef } from "react";

const useLatestRef = (value) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};


const useSseListener = (url, onMessage) => {

  const onMessageRef = useLatestRef(onMessage);

  useEffect(() => {
    if (!url || !onMessageRef.current) {
      return;
    }

    const eventSource = new EventSource(url);
    console.log('Connecting to SSE endpoint:', url);

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      // Directly call the latest version of the callback function
      if (onMessageRef.current) {
        onMessageRef.current(parsedData);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      eventSource.close();
    };

    return () => {
      console.log('Closing SSE connection.');
      eventSource.close();
    };
  }, [url]); // Only re-connect if the URL changes
};

export default useSseListener;