import { useCallback, useEffect, useState } from 'react';
import { Box, Divider, IconButton } from '@mui/material';
import { AddIcon, RemoveIcon, CenterFocusStrongIcon } from '../../ui/icons';
import { useOnViewportChange, useReactFlow } from '@xyflow/react';
import { Typography } from '../../ui';
import { BORDER, RADIUS, SHADOW, SURFACE, TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';

export interface ZoomControlsProps {
  fitViewLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
}

const buttonSx = {
  width: 32,
  height: 32,
  borderRadius: RADIUS.control,
  color: TEXT_SUBTLE,
  '&:hover': { bgcolor: 'theme.secondary.200', color: TEXT_STRONG },
};

/**
 * Zoom in / out / fit, with a live zoom readout.
 *
 * The readout subscribes to React Flow's viewport events. The original polled
 * `getZoom()` behind a 50 ms `setTimeout` after each click, so the label lagged
 * and never updated on scroll or pinch zoom.
 *
 * The three buttons are one floating segment rather than four detached tiles,
 * which is what left the old canvas with a column of shadows down its edge.
 */
export const ZoomControls = ({
  fitViewLabel = 'Fit to view',
  zoomInLabel = 'Zoom in',
  zoomOutLabel = 'Zoom out',
}: ZoomControlsProps) => {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [zoom, setZoom] = useState(() => Math.round(getZoom() * 100));

  useOnViewportChange({
    onChange: useCallback((viewport: { zoom: number }) => {
      setZoom(Math.round(viewport.zoom * 100));
    }, []),
  });

  useEffect(() => {
    setZoom(Math.round(getZoom() * 100));
  }, [getZoom]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
        p: 0.5,
        bgcolor: SURFACE,
        border: '1px solid',
        borderColor: BORDER,
        borderRadius: RADIUS.card,
        boxShadow: SHADOW.raised,
      }}
    >
      <IconButton aria-label={zoomInLabel} onClick={() => zoomIn()} sx={buttonSx}>
        <AddIcon fontSize="small" />
      </IconButton>

      <Typography type="s5" weight="medium" color={TEXT_SUBTLE}>
        {`${zoom}%`}
      </Typography>

      <IconButton aria-label={zoomOutLabel} onClick={() => zoomOut()} sx={buttonSx}>
        <RemoveIcon fontSize="small" />
      </IconButton>

      <Divider flexItem sx={{ borderColor: BORDER, my: 0.25 }} />

      <IconButton
        aria-label={fitViewLabel}
        onClick={() => fitView({ padding: 0.2, duration: 200 })}
        sx={buttonSx}
      >
        <CenterFocusStrongIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};
