import React, { useCallback } from 'react';

export default function ResizableTh({
  columnKey,
  width,
  onResize,
  children,
  style = {},
  ...rest
}) {
  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = width;

      const onMove = (ev) => {
        onResize(columnKey, startW + (ev.clientX - startX));
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [columnKey, onResize, width],
  );

  return (
    <th
      {...rest}
      style={{
        ...style,
        width,
        minWidth: width,
        maxWidth: width,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        className="col-resize-handle"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  );
}
