import React, { useCallback, useRef, useEffect } from 'react';

const ResizableTitle = ({ onResize, width, onHeaderCell: _ohc, children, ...restProps }) => {
  const thRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  if (!width) {
    return <th {...restProps}>{children}</th>;
  }

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = thRef.current?.offsetWidth || width;

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(50, startWidthRef.current + diff);
      if (thRef.current) {
        thRef.current.style.width = `${newWidth}px`;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (thRef.current) {
        const finalWidth = thRef.current.offsetWidth;
        if (onResize) {
          onResize(null, { size: { width: finalWidth } });
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, onResize]);

  return (
    <th {...restProps} ref={thRef} style={{ ...restProps.style, position: 'relative' }}>
      {children}
      <span
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 1,
          userSelect: 'none',
        }}
      />
    </th>
  );
};

export default ResizableTitle;
