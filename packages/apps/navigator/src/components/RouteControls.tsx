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
import { toDuration } from './text';

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
    arrival: string;
    arrivalLabel: string;
    duration: string;
    durationLabel: string;
    distance: { length: number; unit: string };
    distanceLabel?: string;
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

  const realDuration = toDuration(minutes * 60);
  const display = props.display ?? {
    arrival: new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(Date.now() + minutes * 60_000)),
    arrivalLabel: 'varış',
    duration: `${realDuration.hours}:${realDuration.minutes < 10 ? `0${realDuration.minutes}` : realDuration.minutes}`,
    durationLabel: minutes < 60 ? 'dakika' : 'saat',
    distance: props.summary.distance,
  };

  return (
    <Card
      sx={{
        boxShadow:
          'rgba(0, 0, 0, 0.2) 0px 3px 5px -1px, rgba(0, 0, 0, 0.14) 0px 6px 10px 0px, rgba(0, 0, 0, 0.12) 0px 1px 18px 0px',
        // TODO make this consistent across all corner-rounded components
        borderRadius: 12,
        pb: expanded ? 2 : 0,
        height: '100%',
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
          justifyContent={'space-between'}
          onClick={props.onTimeModeToggle}
          sx={{ cursor: props.onTimeModeToggle ? 'pointer' : undefined }}
        >
          <Stack alignItems={'center'}>
            <Typography level={'h3'} fontWeight={'bold'}>
              {display.arrival}
            </Typography>
            <Typography level={'body-sm'}>{display.arrivalLabel}</Typography>
          </Stack>
          <Stack alignItems={'center'}>
            <Typography level={'h3'}>{display.duration}</Typography>
            <Typography level={'body-sm'}>{display.durationLabel}</Typography>
          </Stack>
          <Stack alignItems={'center'}>
            <Typography level={'h3'}>{display.distance.length}</Typography>
            <Typography level={'body-sm'}>
              {display.distanceLabel ?? display.distance.unit}
            </Typography>
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
