import { VideoBlock } from '@/types';
import React from 'react';


export const VideoBlockComponent: React.FC<VideoBlock> = ({
    iframeUrl,
    allowFullScreen = true,
}) => {
    return (
            <div className="relative w-full  aspect-[16/9]">
                <iframe
                    src={iframeUrl}
                    width="100%"
                    height="100%"
                    loading="lazy"
                    frameBorder="0"
                    allowFullScreen={allowFullScreen ?? undefined}
                    className="w-full h-full"
                ></iframe>
            </div>
       
    );
};
