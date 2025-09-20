import { useEffect, useRef } from 'react';
import videojs from 'video.js';


import 'video.js/dist/video-js.css';
import 'videojs-hls-quality-selector/dist/videojs-hls-quality-selector.css';
import '@videojs/http-streaming'; 
import QualityLevels from 'videojs-contrib-quality-levels';
import HlsQualitySelector from 'videojs-hls-quality-selector/src/plugin';


videojs.registerPlugin('qualityLevels', QualityLevels);
videojs.registerPlugin('hlsQualitySelector', HlsQualitySelector);


const apiUrl = import.meta.env.VITE_API_URL;

const VideoPlayer = ({ onLoaded, onClick, file }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  const manifestUrl = `${apiUrl}${file.value}`;


  useEffect(() => {
    // Ensure we only initialize once
    if (playerRef.current) {
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const options = {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      html5: { vhs: { overrideNative: true } },
      plugins: {
        hlsQualitySelector: {
          displayCurrentQuality: true,
        },
      },
    };

    const player = videojs(videoElement, options);
    playerRef.current = player;

    player.on('ready', (e) => {
      console.log('Player is ready.');
    //   if (onLoaded) onLoaded(e);
    });


    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (player && !player.isDisposed()) {
      console.log(`Setting new source: ${manifestUrl}`);
      player.src({ src: manifestUrl, type: 'application/x-mpegURL' });
    }
  }, [manifestUrl]);

  return (
    <div onClick={onClick} data-vjs-player style={{ maxWidth: '100%', maxHeight: '100%', position: 'absolute' }} >
      <video ref={videoRef} onLoadedData={onLoaded} className="video-js vjs-big-play-centered"/>
    </div>
  );
};

export default VideoPlayer;