import React, { useCallback, Children, isValidElement, cloneElement } from 'react';

/**
 * Table row with a Sheets-style bottom-edge handle (on the first cell) to resize height.
 */
export default function ResizableTr({
  rowKey,
  height,
  onResize,
  onReset,
  children,
  style = {},
  className = '',
  ...rest
}) {
  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const startH = height;

      const onMove = (ev) => {
        onResize?.(rowKey, startH + (ev.clientY - startY));
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.classList.remove('crm-resizing-row');
      };

      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.body.classList.add('crm-resizing-row');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [height, onResize, rowKey],
  );

  const handleDoubleClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onReset?.(rowKey);
    },
    [onReset, rowKey],
  );

  const handle = (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize row"
      title="Drag to resize row · Double-click to reset"
      className="row-resize-handle"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => e.stopPropagation()}
    />
  );

  const kids = Children.toArray(children);
  const enhanced = kids.map((child, index) => {
    if (index !== 0 || !isValidElement(child)) return child;
    const prevClass = child.props.className || '';
    return cloneElement(child, {
      className: `${prevClass} crm-resizable-tr__anchor`.trim(),
      style: {
        ...(child.props.style || {}),
        position: 'relative',
      },
      children: (
        <>
          {child.props.children}
          {handle}
        </>
      ),
    });
  });

  return (
    <tr
      {...rest}
      className={`crm-resizable-tr ${className}`.trim()}
      style={{
        ...style,
        height,
      }}
    >
      {enhanced}
    </tr>
  );
}
