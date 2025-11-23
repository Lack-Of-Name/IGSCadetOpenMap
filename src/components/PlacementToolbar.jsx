import React, { useRef } from 'react';

const DraggableBox = ({ type, colorClass, borderClass }) => {
  const dragImageRef = useRef(null);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/x-cadet-map-item', type);
    e.dataTransfer.effectAllowed = 'copy';
    
    if (dragImageRef.current) {
      e.dataTransfer.setDragImage(dragImageRef.current, 10, 20);
    }
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        className={`flex h-16 w-16 cursor-grab items-center justify-center rounded-full border-2 ${borderClass} ${colorClass} shadow-lg backdrop-blur-sm transition hover:scale-110 active:cursor-grabbing active:scale-95 touch-none`}
      >
        <div className={`h-4 w-4 rounded-full ${borderClass.replace('border', 'bg')}`} />
      </div>
      
      {/* Hidden drag image */}
      <div 
        ref={dragImageRef} 
        className={`absolute -top-[1000px] left-0 h-5 w-5 rounded-full border-2 ${borderClass} ${colorClass}`}
      />
    </>
  );
};

const PlacementToolbar = () => {
  return (
    <div className="pointer-events-auto flex gap-6 p-4">
      <DraggableBox 
        type="start" 
        colorClass="bg-green-500/20" 
        borderClass="border-green-500" 
      />
      <DraggableBox 
        type="checkpoint" 
        colorClass="bg-sky-500/20" 
        borderClass="border-sky-500" 
      />
      <DraggableBox 
        type="end" 
        colorClass="bg-red-500/20" 
        borderClass="border-red-500" 
      />
    </div>
  );
};

export default PlacementToolbar;
