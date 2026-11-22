import {
  AltRoute,
  EditLocationAlt,
  FormatListBulleted,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Search,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  IconButton,
  List,
  ListDivider,
  ListItem,
  ListItemButton,
  ListItemDecorator,
  Stack,
  Typography,
} from '@mui/joy';
import { Collapse } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RouteControlsProps {
  summary: {
    minutes: number;
    distance: { length: number; unit: string };
  };
  /**
   * ETS2 Navigasyon: preformatted arrival/duration (game or real time). When
   * omitted, falls back to real time computed from `summary.minutes`.
   */
  display?: {
    /** 'game': orange dot, 'real': green dot */
    mode: 'game' | 'real';
    arrival: string;
    durationMinutes: number;
    distance: { length: number; unit: string };
  };
  onTimeModeToggle?: () => void;
  onExpandedToggle: (expanded: boolean) => void;
  onManageStopsClick?: () => void;
  onSearchAlongRouteClick: () => void;
  onRoutePreviewClick: () => void;
  onRouteDirectionsClick: () => void;
  onRouteEndClick: () => void;
}

// TODO break this up to prevent re-renders
export const RouteControls = (props: RouteControlsProps) => {
  console.log('render route controls');
  const {
    summary: { minutes },
  } = props;
  const [expanded, setExpanded] = useState(false);
  const DisclosureIcon = expanded ? KeyboardArrowDown : KeyboardArrowUp;
  const toggleDisclosure = useCallback(() => {
    setExpanded(!expanded);
    props.onExpandedToggle(!expanded);
  }, [expanded]);
  const withClose = (fn: () => void) => () => {
    fn();
    setExpanded(false);
    props.onExpandedToggle(false);
  };

  const display = props.display ?? {
    mode: 'real' as const,
    arrival: new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(Date.now() + minutes * 60_000)),
    durationMinutes: minutes,
    distance: props.summary.distance,
  };
  const totalMinutes = Math.max(0, Math.round(display.durationMinutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <Card
      sx={{
        boxShadow:
          'rgba(0, 0, 0, 0.2) 0px 3px 5px -1px, rgba(0, 0, 0, 0.14) 0px 6px 10px 0px, rgba(0, 0, 0, 0.12) 0px 1px 18px 0px',
        // TODO make this consistent across all corner-rounded components
        borderRadius: 12,
        pb: expanded ? 2 : 0,
        height: '100%',
        // ETS2 Navigasyon: black bar, white text.
        backgroundColor: '#0b0b0b',
        borderColor: '#2a2a2a',
        color: '#fff',
      }}
    >
      <Stack
        direction={'row'}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Stack
          direction={'row'}
          flexGrow={1}
          justifyContent={'space-around'}
          alignItems={'center'}
          onClick={props.onTimeModeToggle}
          sx={{
            cursor: props.onTimeModeToggle ? 'pointer' : undefined,
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {props.display && (
            <Box
              aria-label={
                display.mode === 'game' ? 'oyun saati' : 'gerçek saat'
              }
              sx={{
                position: 'absolute',
                top: -6,
                left: -6,
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor:
                  display.mode === 'game' ? '#ff9800' : '#43a047',
                boxShadow: '0 0 4px 0 #0006',
              }}
            />
          )}
          <Stack alignItems={'center'}>
            <Typography level={'h3'} fontWeight={'bold'}>
              {display.arrival}
            </Typography>
            <Typography level={'body-sm'}>varış</Typography>
          </Stack>
          <Stack alignItems={'center'}>
            <Typography level={'h3'}>
              {hours > 0 && (
                <>
                  {hours}
                  <Typography level={'body-md'}> sa </Typography>
                </>
              )}
              {mins}
              <Typography level={'body-md'}> dk</Typography>
            </Typography>
            <Typography level={'body-sm'}>kalan</Typography>
          </Stack>
          <Stack alignItems={'center'}>
            <Typography level={'h3'}>{display.distance.length}</Typography>
            <Typography level={'body-sm'}>{display.distance.unit}</Typography>
          </Stack>
        </Stack>
        <IconButton size={'lg'} variant={'soft'} onClick={toggleDisclosure}>
          <DisclosureIcon sx={{ transform: 'scale(1.25)' }} />
        </IconButton>
      </Stack>
      <Box sx={{ overflowY: 'scroll' }}>
        <ExpandedControls
          expanded={expanded}
          onManageStopsClick={
            props.onManageStopsClick
              ? withClose(props.onManageStopsClick)
              : undefined
          }
          onSearchAlongRouteClick={withClose(props.onSearchAlongRouteClick)}
          onRoutePreviewClick={withClose(props.onRoutePreviewClick)}
          onRouteDirectionsClick={withClose(props.onRouteDirectionsClick)}
          onRouteEndClick={withClose(props.onRouteEndClick)}
        />
      </Box>
    </Card>
  );
};

const ExpandedControls = ({
  expanded,
  onManageStopsClick,
  onSearchAlongRouteClick,
  onRoutePreviewClick,
  onRouteDirectionsClick,
  onRouteEndClick,
}: {
  expanded: boolean;
  onManageStopsClick?: () => void;
  onSearchAlongRouteClick: () => void;
  onRoutePreviewClick: () => void;
  onRouteDirectionsClick: () => void;
  onRouteEndClick: () => void;
}) => {
  const ref = useRef<HTMLElement>();
  useEffect(() => {
    if (expanded) {
      setTimeout(() => {
        ref.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }, 250);
    }
  }, [expanded]);

  return (
    <Collapse in={expanded}>
      <List size={'lg'}>
        {onManageStopsClick && (
          <>
            <ListDivider />
            <ListItem>
              <ListItemButton onClick={onManageStopsClick}>
                <ListItemDecorator>
                  <EditLocationAlt sx={{ transform: 'scale(1.25)' }} />
                </ListItemDecorator>
                Durakları düzenle
              </ListItemButton>
            </ListItem>
          </>
        )}
        <ListDivider />
        <ListItem>
          <ListItemButton onClick={onSearchAlongRouteClick}>
            <ListItemDecorator>
              <Search sx={{ transform: 'scale(1.25)' }} />
            </ListItemDecorator>
            Rota üzerinde ara
          </ListItemButton>
        </ListItem>
        <ListDivider />
        <ListItem>
          <ListItemButton onClick={onRoutePreviewClick}>
            <ListItemDecorator>
              <AltRoute sx={{ transform: 'scale(1.25)' }} />
            </ListItemDecorator>
            Rotanın tamamını gör
          </ListItemButton>
        </ListItem>
        <ListDivider />
        <ListItem>
          <ListItemButton onClick={onRouteDirectionsClick}>
            <ListItemDecorator>
              <FormatListBulleted sx={{ transform: 'scale(1.25)' }} />
            </ListItemDecorator>
            Yol tarifi
          </ListItemButton>
        </ListItem>

        <ListDivider />
        <Button
          sx={{ mt: 2 }}
          size={'lg'}
          color={'danger'}
          onClick={onRouteEndClick}
        >
          Rotayı bitir
        </Button>
        <Box ref={ref} />
      </List>
    </Collapse>
  );
};
