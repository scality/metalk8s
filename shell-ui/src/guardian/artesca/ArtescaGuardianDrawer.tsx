import { useRef } from 'react';
import { useHandedAssistantBackground } from '../GuardianContext';
import type { GuardianFrameProps } from '../GuardianDrawer';
import { DrawerResizeHandle } from './DrawerResizeHandle';
import { MIN_DRAWER_WIDTH, useDrawerWidth } from './useDrawerWidth';
import { useNavbarHeightEmitter } from './useNavbarHeightEmitter';

type ArtescaGuardianDrawerProps = {
  isOpen: boolean;
  frameProps: GuardianFrameProps;
  guardianOrigin: string;
};

/**
 * ARTESCA's drawer: resizable up to a share of the window, transparent so the console's background —
 * or the one the page on screen hands over (useAssistantBackground) — shows behind Guardian, and
 * told the console navbar's height so Guardian's bar lines up with it.
 * Guardian drops its own background and takes that height when it sees `source=artesca_ui`.
 */
export const ArtescaGuardianDrawer = ({ isOpen, frameProps, guardianOrigin }: ArtescaGuardianDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const { width, maxWidth, isDragging, onHandlePointerDown, onHandleKeyDown, resetWidth } = useDrawerWidth(drawerRef);
  useNavbarHeightEmitter(frameProps.ref, guardianOrigin);
  const assistantBackground = useHandedAssistantBackground();

  return (
    <div
      ref={drawerRef}
      style={{
        position: 'relative',
        width: isOpen ? width : 0,
        height: '100%',
        transition: isDragging ? 'none' : 'width 0.25s ease',
        flexShrink: 0,
        isolation: 'isolate',
      }}
    >
      {assistantBackground && (
        <div
          style={{ position: 'absolute', inset: 0, background: assistantBackground, backgroundAttachment: 'fixed' }}
        />
      )}
      {/* Clips the iframe while the drawer animates; the handle stays outside so it can straddle the edge. */}
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* The iframe would swallow the drag's pointer events once the pointer crosses it. */}
        <iframe
          {...frameProps}
          style={{
            width,
            height: '100%',
            border: 'none',
            background: 'transparent',
            pointerEvents: isDragging ? 'none' : undefined,
          }}
        />
      </div>
      {isOpen && (
        <DrawerResizeHandle
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the Guardian assistant"
          aria-valuenow={width}
          aria-valuemin={Math.min(MIN_DRAWER_WIDTH, maxWidth)}
          aria-valuemax={maxWidth}
          tabIndex={0}
          title="Drag to resize — double-click to reset"
          $dragging={isDragging}
          onPointerDown={onHandlePointerDown}
          onKeyDown={onHandleKeyDown}
          onDoubleClick={resetWidth}
        />
      )}
    </div>
  );
};
